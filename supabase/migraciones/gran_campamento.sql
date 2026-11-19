-- Gran Campamento: banderas de club, campeones, ConquisCoins, tienda, candado del avatar.
-- Aplicado en Supabase (jlvmwirdohfkllmkihwc). Todo por RPC SECURITY DEFINER con search_path vacío; RLS sin políticas.

-- ===== gran_campamento_servidor =====
-- =====================================================================
-- Gran Campamento: bandera del club, campeones, ConquisCoins + tienda, candado del avatar
-- =====================================================================

-- ---------- 1) Bandera del club (pixel art 24x16, paleta de hasta 16 colores) ----------
-- Se guarda como texto validado (nunca una imagen): "p:rrggbb,rrggbb,...;d:<384 dígitos hex>"
alter table public.clubs add column if not exists bandera text;
alter table public.clubs drop constraint if exists clubs_bandera_formato;
alter table public.clubs add constraint clubs_bandera_formato
  check (bandera is null or bandera ~ '^p:([0-9a-f]{6},){0,15}[0-9a-f]{6};d:[0-9a-f]{384}$');

create or replace function public.guardar_bandera_club(p_bandera text)
returns void language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'NO_AUTORIZADO'; end if;
  select id into cid from public.clubs where owner_id = auth.uid() limit 1;
  if cid is null then raise exception 'NO_AUTORIZADO'; end if;
  if p_bandera is not null and p_bandera !~ '^p:([0-9a-f]{6},){0,15}[0-9a-f]{6};d:[0-9a-f]{384}$' then raise exception 'BANDERA_INVALIDA'; end if;
  update public.clubs set bandera = p_bandera where id = cid;
end $$;
revoke all on function public.guardar_bandera_club(text) from public, anon;
grant execute on function public.guardar_bandera_club(text) to authenticated;

-- El perfil propio incluye la bandera del club
create or replace function public._perfil(pid uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'apodo', p.apodo, 'rango', p.rango, 'grupo_edad', p.grupo_edad, 'cargo', p.cargo,
    'avatar', p.avatar, 'invitado', p.invitado,
    'superadmin', p.auth_user_id is not null and exists (select 1 from public.superadmins s where s.user_id = p.auth_user_id),
    'club', jsonb_build_object('id', c.id, 'nombre', coalesce(p.club_invitado, c.nombre),
      'codigo', case when not p.invitado and (c.owner_id = p.auth_user_id or p.grupo_edad = 'adulto') then c.codigo else null end,
      'ciudad', c.ciudad, 'campo', c.campo, 'union', c.union_nombre, 'pais', c.pais, 'bandera', c.bandera,
      'soy_director', c.owner_id is not null and c.owner_id = p.auth_user_id))
  from public.players p join public.clubs c on c.id = p.club_id where p.id = pid
$$;

-- ---------- 2) Campeones (mejor de su club, asociación/misión, unión, país y del mundo) ----------
-- Se recalcula como mucho cada 10 minutos (un solo proceso a la vez), así no se recorre todo en cada consulta.
create table if not exists public.campeones (
  ambito text not null check (ambito in ('club','campo','union','pais','mundo')),
  clave text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  puntos bigint not null,
  primary key (ambito, clave)
);
create table if not exists public.campeones_estado (id int primary key default 1 check (id = 1), actualizado timestamptz not null default 'epoch');
insert into public.campeones_estado(id) values (1) on conflict do nothing;
alter table public.campeones enable row level security;
alter table public.campeones_estado enable row level security;

create or replace function public._refrescar_campeones() returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select actualizado from public.campeones_estado where id = 1) > now() - interval '10 minutes' then return; end if;
  if not pg_try_advisory_xact_lock(772201) then return; end if;
  delete from public.campeones;
  with tot as (
    select p.id, c.id::text as club, coalesce(c.campo_id::text, c.campo, '') as campo, coalesce(c.union_nombre, '') as un, coalesce(c.pais, '') as pais,
           sum(b.score)::bigint as pts
    from public.players p join public.clubs c on c.id = p.club_id join public.best_scores b on b.player_id = p.id
    where not p.bloqueado and not p.invitado group by p.id, c.id
    having sum(b.score) > 0)
  insert into public.campeones(ambito, clave, player_id, puntos)
  select distinct on (ambito, clave) ambito, clave, id, pts from (
    select 'club' ambito, club clave, id, pts from tot
    union all select 'campo', campo, id, pts from tot where campo <> ''
    union all select 'union', un, id, pts from tot where un <> ''
    union all select 'pais', pais, id, pts from tot where pais <> ''
    union all select 'mundo', 'mundo', id, pts from tot) x
  order by ambito, clave, pts desc, id;
  update public.campeones_estado set actualizado = now() where id = 1;
end $$;
revoke all on function public._refrescar_campeones() from public, anon, authenticated;

-- ---------- 3) ConquisCoins y tienda ----------
create table if not exists public.monedas (
  player_id uuid primary key references public.players(id) on delete cascade,
  saldo int not null default 0 check (saldo >= 0),
  ganadas_hoy int not null default 0,
  dia date
);
create table if not exists public.tienda (
  id text primary key check (id ~ '^[a-z0-9-]{3,30}$'),
  tipo text not null check (tipo in ('pin','parche')),
  nombre text not null,
  precio int not null check (precio between 1 and 5000),
  orden int not null default 0,
  activo boolean not null default true
);
create table if not exists public.inventario (
  player_id uuid not null references public.players(id) on delete cascade,
  item_id text not null references public.tienda(id),
  comprado timestamptz not null default now(),
  primary key (player_id, item_id)
);
alter table public.monedas enable row level security;
alter table public.tienda enable row level security;
alter table public.inventario enable row level security;

insert into public.tienda(id, tipo, nombre, precio, orden) values
  ('pin-c1', 'pin', 'Pin C1 Conquistadores', 40, 1),
  ('pin-biblia', 'pin', 'Pin Biblia', 50, 2),
  ('pin-brujula', 'pin', 'Pin Brújula', 60, 3),
  ('pin-carpa', 'pin', 'Pin Carpa', 60, 4),
  ('pin-fogata', 'pin', 'Pin Fogata', 80, 5),
  ('pin-estrella', 'pin', 'Pin Estrella de oro', 150, 6),
  ('parche-amistad', 'parche', 'Parche Amistad', 70, 10),
  ('parche-naturaleza', 'parche', 'Parche Naturaleza', 90, 11),
  ('parche-servicio', 'parche', 'Parche Servicio', 110, 12),
  ('parche-campori', 'parche', 'Parche Campori', 200, 13)
on conflict (id) do update set nombre = excluded.nombre, precio = excluded.precio, tipo = excluded.tipo, orden = excluded.orden;

/** Tope diario de monedas ganadas jugando. */
create or replace function public._tope_monedas() returns int language sql immutable as $$ select 120 $$;

create or replace function public.mi_bolsa(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare pid uuid := public._jugador(p_token); m public.monedas;
begin
  select * into m from public.monedas where player_id = pid;
  return jsonb_build_object('saldo', coalesce(m.saldo, 0),
    'ganadas_hoy', case when m.dia = public._hoy() then m.ganadas_hoy else 0 end, 'tope', public._tope_monedas(),
    'items', coalesce((select jsonb_agg(item_id order by comprado) from public.inventario where player_id = pid), '[]'::jsonb));
end $$;

create or replace function public.tienda_catalogo() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'tipo', tipo, 'nombre', nombre, 'precio', precio) order by orden), '[]'::jsonb)
  from public.tienda where activo
$$;

create or replace function public.comprar(p_token text, p_item text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare pid uuid := public._jugador(p_token); it public.tienda; s int;
begin
  perform public._no_invitado(pid);
  select * into it from public.tienda where id = p_item and activo;
  if it.id is null then raise exception 'ITEM_INVALIDO'; end if;
  if exists (select 1 from public.inventario where player_id = pid and item_id = it.id) then raise exception 'YA_LO_TIENES'; end if;
  insert into public.monedas(player_id) values (pid) on conflict do nothing;
  select saldo into s from public.monedas where player_id = pid for update;
  if s < it.precio then raise exception 'SIN_MONEDAS'; end if;
  update public.monedas set saldo = saldo - it.precio where player_id = pid;
  insert into public.inventario(player_id, item_id) values (pid, it.id);
  return public.mi_bolsa(p_token);
end $$;

-- Ganar monedas al superar un reto (no en salas ni duelos): 1 por cada 100 puntos, +10 por el reto del día, tope diario
do $$
declare d text; o oid;
begin
  select p.oid into o from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'terminar_reto';
  d := pg_get_functiondef(o);
  if position('ConquisCoins' in d) > 0 then return; end if;
  d := replace(d, 'recupero boolean := false;', 'recupero boolean := false; gana int := 0;');
  d := replace(d, '  return jsonb_build_object(''puntaje'', pts,', '  -- ConquisCoins
  if a.sala is null and pts >= 400 and not (select invitado from public.players where id = pid) then
    insert into public.monedas(player_id) values (pid) on conflict do nothing;
    update public.monedas set ganadas_hoy = case when dia = public._hoy() then ganadas_hoy else 0 end, dia = public._hoy() where player_id = pid;
    select least(floor(pts / 100.0)::int + case when recargo then 10 else 0 end, greatest(0, public._tope_monedas() - ganadas_hoy)) into gana
      from public.monedas where player_id = pid;
    update public.monedas set saldo = saldo + gana, ganadas_hoy = ganadas_hoy + gana where player_id = pid;
  end if;

  return jsonb_build_object(''monedas'', gana, ''puntaje'', pts,');
  if position('ConquisCoins' in d) = 0 or position('gana int := 0' in d) = 0 then raise exception 'no se pudo parchar terminar_reto'; end if;
  execute d;
end $$;

-- ---------- 4) Perfiles públicos con país, asociación, unión, bandera, aprobados, pines y campeón ----------
create or replace function public.perfiles_publicos(p_token text, p_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pid uuid := public._jugador(p_token);
begin
  if p_ids is null or cardinality(p_ids) = 0 then return '[]'::jsonb; end if;
  if cardinality(p_ids) > 60 then raise exception 'DEMASIADOS'; end if;
  perform public._refrescar_campeones();
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'clubId', p.club_id, 'apodo', p.apodo, 'club', c.nombre,
      'rango', p.rango, 'avatar', p.avatar, 'pais', c.pais, 'campo', c.campo, 'union', c.union_nombre, 'bandera', c.bandera,
      'aprobados', (select count(*) from public.best_scores b where b.player_id = p.id and b.score >= 400),
      'pines', coalesce((select jsonb_agg(i.item_id order by i.comprado) from public.inventario i where i.player_id = p.id), '[]'::jsonb),
      'campeon', coalesce((select jsonb_agg(k.ambito order by array_position(array['mundo','pais','union','campo','club'], k.ambito))
                           from public.campeones k where k.player_id = p.id), '[]'::jsonb)))
    from public.players p join public.clubs c on c.id = p.club_id
    where p.id = any(p_ids) and p.id <> pid and not p.bloqueado and not p.invitado), '[]'::jsonb);
end $$;

-- ---------- 5) Candado del avatar: el niño lo arma una vez; después solo el director lo cambia ----------
create or replace function public._validar_avatar(p_avatar jsonb) returns void language plpgsql immutable set search_path = '' as $$
declare v text; k text; an jsonb;
begin
  if jsonb_typeof(p_avatar) <> 'object' or pg_column_size(p_avatar) > 1900 then raise exception 'AVATAR_INVALIDO'; end if;
  for k in select jsonb_object_keys(p_avatar) loop
    if k not in ('genero','piel','pelo','colorPelo','panoleta','nombreTira','unidad','uniforme') then raise exception 'AVATAR_INVALIDO'; end if;
  end loop;
  foreach v in array array[p_avatar->>'nombreTira', p_avatar->>'unidad'] loop
    if v is not null and v !~ '^[A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü ]{0,16}$' then raise exception 'TEXTO_INVALIDO'; end if;
  end loop;
  if p_avatar ? 'genero' and (p_avatar->>'genero') not in ('m','f') then raise exception 'AVATAR_INVALIDO'; end if;
  if p_avatar ? 'uniforme' and jsonb_typeof(p_avatar->'uniforme') <> 'object' then raise exception 'AVATAR_INVALIDO'; end if;
  if (p_avatar->'uniforme'->>'cargo') is not null and (p_avatar->'uniforme'->>'cargo') !~ '^[A-ZÁÉÍÓÚÑ. ]{3,20}$' then raise exception 'TEXTO_INVALIDO'; end if;
  an := p_avatar->'uniforme'->'anios';
  if an is not null and (jsonb_typeof(an) <> 'number' or (an::text)::numeric < 2 or (an::text)::numeric > 60) then raise exception 'AVATAR_INVALIDO'; end if;
end $$;
revoke all on function public._validar_avatar(jsonb) from public, anon, authenticated;

create or replace function public.guardar_avatar(p_token text, p_avatar jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare pid uuid := public._jugador(p_token); pl public.players;
begin
  perform public._validar_avatar(p_avatar);
  select * into pl from public.players where id = pid;
  if pl.grupo_edad = 'menor' and not pl.invitado and pl.avatar ? 'genero' then raise exception 'AVATAR_BLOQUEADO'; end if;
  update public.players set avatar = p_avatar, ultima_actividad = now() where id = pid;
end $$;

create or replace function public.director_miembros()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'NO_AUTORIZADO'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'apodo', p.apodo, 'rango', p.rango, 'grupo_edad', p.grupo_edad, 'avatar', p.avatar) order by p.apodo)
    from public.players p join public.clubs c on c.id = p.club_id
    where c.owner_id = auth.uid() and not p.invitado), '[]'::jsonb);
end $$;

create or replace function public.director_guardar_avatar(p_id uuid, p_avatar jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'NO_AUTORIZADO'; end if;
  perform public._validar_avatar(p_avatar);
  if not exists (select 1 from public.players p join public.clubs c on c.id = p.club_id where p.id = p_id and c.owner_id = auth.uid() and not p.invitado) then
    raise exception 'NO_AUTORIZADO';
  end if;
  update public.players set avatar = p_avatar where id = p_id;
end $$;

-- ---------- Permisos ----------
revoke all on function public.mi_bolsa(text) from public;
revoke all on function public.comprar(text, text) from public;
revoke all on function public.tienda_catalogo() from public;
revoke all on function public.perfiles_publicos(text, uuid[]) from public;
revoke all on function public.guardar_avatar(text, jsonb) from public;
revoke all on function public.director_miembros() from public, anon;
revoke all on function public.director_guardar_avatar(uuid, jsonb) from public, anon;
grant execute on function public.mi_bolsa(text) to anon, authenticated;
grant execute on function public.comprar(text, text) to anon, authenticated;
grant execute on function public.tienda_catalogo() to anon, authenticated;
grant execute on function public.perfiles_publicos(text, uuid[]) to anon, authenticated;
grant execute on function public.guardar_avatar(text, jsonb) to anon, authenticated;
grant execute on function public.director_miembros() to authenticated;
grant execute on function public.director_guardar_avatar(uuid, jsonb) to authenticated;
revoke all on function public._tope_monedas() from public, anon, authenticated;

-- ===== bandera_regex_fix =====
alter table public.clubs drop constraint if exists clubs_bandera_formato;
alter table public.clubs add constraint clubs_bandera_formato
  check (bandera is null or bandera ~ '^p:([0-9a-f]{6},){0,15}[0-9a-f]{6};d:([0-9a-f]{192}){2}$');
create or replace function public.guardar_bandera_club(p_bandera text)
returns void language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'NO_AUTORIZADO'; end if;
  select id into cid from public.clubs where owner_id = auth.uid() limit 1;
  if cid is null then raise exception 'NO_AUTORIZADO'; end if;
  if p_bandera is not null and (length(p_bandera) > 600 or p_bandera !~ '^p:([0-9a-f]{6},){0,15}[0-9a-f]{6};d:([0-9a-f]{192}){2}$') then raise exception 'BANDERA_INVALIDA'; end if;
  update public.clubs set bandera = p_bandera where id = cid;
end $$;
revoke all on function public.guardar_bandera_club(text) from public, anon;
grant execute on function public.guardar_bandera_club(text) to authenticated;

-- ===== avatar_bloqueado_permite_panoleta =====
CREATE OR REPLACE FUNCTION public.guardar_avatar(p_token text, p_avatar jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare pid uuid := public._jugador(p_token); pl public.players;
begin
  perform public._validar_avatar(p_avatar);
  select * into pl from public.players where id = pid;
  if pl.grupo_edad = 'menor' and not pl.invitado and pl.avatar ? 'genero' then
    -- Ya configurado: solo su director lo cambia. Única excepción: recibir la pañoleta en la ceremonia.
    if p_avatar is distinct from (pl.avatar || '{"panoleta": true}'::jsonb) then raise exception 'AVATAR_BLOQUEADO'; end if;
  end if;
  update public.players set avatar = p_avatar, ultima_actividad = now() where id = pid;
end $function$;

-- ===== tope_monedas_search_path =====
alter function public._tope_monedas() set search_path = '';
