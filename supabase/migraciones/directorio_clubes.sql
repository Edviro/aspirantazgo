-- =====================================================================================
-- Directorio oficial de clubes de Conquistadores de la DSA (copiado de clubes.adventistas.org)
-- Aplicado en Supabase (migraciones: http_para_directorio_clubes, directorio_clubes_tablas,
-- directorio_clubes_post, directorio_clubes_rastreo, directorio_clubes_sembrar,
-- directorio_clubes_procesar_v2, directorio_clubes_integracion, registrar_adulto_club_oficial,
-- directorio_clubes_programacion). Esta copia es la referencia; la fuente de verdad es la base.
--
-- Cómo funciona
--   * La extensión `http` (solo la puede usar el dueño de la base; anon/authenticated sin permiso)
--     descarga las páginas del sitio. _dir_get/_dir_post solo aceptan URLs de clubes.adventistas.org.
--   * _dir_sembrar() lee el menú (uniones → asociaciones/misiones) y llena la cola dir_cola.
--   * pg_cron 'directorio-clubes' (cada minuto) llama _dir_procesar(6): 1 página cada 8 s; si el sitio
--     responde 429 (Retry-After 600) se pausa 11 minutos (dir_estado.pausa_hasta).
--       asociacion → regiones de Conquistadores (+ ciudades) | region → clubes (nombre, miembros)
--       Paraguaya/Uruguaya no tienen regiones en el sitio: departamento → ciudad → página del club.
--       ciudad → completa la ciudad de cada club.
--   * pg_cron 'directorio-sincronizar' (cada hora) → _dir_sincronizar(): crea/actualiza campos
--     (asociaciones/misiones del juego), enlaza clubes del juego por nombre y les pone la ciudad oficial.
--   * pg_cron 'directorio-refrescar' (día 3 de cada mes) → _dir_refrescar(): vuelve a recorrer todo.
--   * Para el juego: clubes_oficiales(p_campo) (anon/authenticated) y registrar_adulto(..., p_oficial).
-- =====================================================================================

create extension if not exists http with schema extensions; -- y revoke de todas sus funciones a public/anon/authenticated

create table public.dir_uniones (id text primary key check (id ~ '^[a-z]{2,8}$'), nombre text not null, pais text not null check (pais ~ '^[A-Z]{2}$'), orden int not null default 0);
create table public.dir_asociaciones (id text primary key check (id ~ '^[a-z]{2,8}$'), union_id text not null references public.dir_uniones(id) on delete cascade, nombre text not null, orden int not null default 0);
create table public.dir_regiones (id int primary key, asociacion_id text not null references public.dir_asociaciones(id) on delete cascade, nombre text not null, clubes_sitio int, miembros_sitio int);
create table public.dir_clubes (id int primary key, region_id int not null references public.dir_regiones(id) on delete cascade,
  asociacion_id text not null references public.dir_asociaciones(id) on delete cascade, nombre text not null check (length(nombre) between 1 and 80),
  miembros int, ciudad text, visto timestamptz not null default now());
create table public.dir_cola (clave text primary key, tipo text not null check (tipo in ('asociacion','region','estado','ciudad','club')),
  url text not null check (url like 'https://clubes.adventistas.org/%'), cuerpo text, ref text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','hecho','error')), intentos int not null default 0, error text, actualizado timestamptz not null default now());
create table public.dir_estado (id int primary key default 1 check (id = 1), pausa_hasta timestamptz, ultimo_429 timestamptz);
-- RLS activado en todas, sin políticas; revoke all a anon/authenticated (solo se leen por RPC).

alter table public.uniones add column dir_id text unique references public.dir_uniones(id) on delete set null;
alter table public.campos add column dir_id text unique references public.dir_asociaciones(id) on delete set null;
alter table public.clubs add column dir_club_id int unique references public.dir_clubes(id) on delete set null;

-- Clubes oficiales de una asociación/misión (y los del juego que aún no figuran)
create or replace function public.clubes_oficiales(p_campo int) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x->>'region', x->>'nombre'), '[]'::jsonb) from (
    select jsonb_build_object('oficial', d.id, 'juego', cl.id, 'nombre', coalesce(cl.nombre, public._dir_nombre(d.nombre)),
      'region', r.nombre, 'ciudad', d.ciudad, 'con_director', cl.owner_id is not null,
      'miembros', (select count(*) from public.players p where p.club_id = cl.id and not p.invitado)) x
    from public.campos ca
    join public.dir_clubes d on d.asociacion_id = ca.dir_id
    join public.dir_regiones r on r.id = d.region_id
    left join public.clubs cl on cl.dir_club_id = d.id
    where ca.id = p_campo
      and d.visto > (select max(d2.visto) - interval '120 days' from public.dir_clubes d2 where d2.asociacion_id = ca.dir_id)
    union all
    select jsonb_build_object('oficial', null, 'juego', cl.id, 'nombre', cl.nombre, 'region', 'Clubes nuevos (por verificar)', 'ciudad', cl.ciudad,
      'con_director', cl.owner_id is not null, 'miembros', (select count(*) from public.players p where p.club_id = cl.id and not p.invitado))
    from public.clubs cl where cl.campo_id = p_campo and cl.dir_club_id is null
    limit 3000
  ) s
$$;
grant execute on function public.clubes_oficiales(int) to anon, authenticated;

-- registrar_adulto(p_club, p_campo, p_nombre_club, p_ciudad, p_soy_director, p_apodo, p_rango, p_cargo, p_acepta, p_autoriza, p_oficial default null)
--   * p_club: unirse a un club que ya juega.
--   * p_oficial: club del directorio (debe ser de la asociación p_campo); si aún no juega, se crea con su nombre oficial.
--   * nombre a mano: solo clubes nuevos que aún no figuran; si el nombre coincide con uno oficial → CLUB_EN_LISTA.
--   (texto completo de las funciones _dir_*: select pg_get_functiondef(...) en la base)
