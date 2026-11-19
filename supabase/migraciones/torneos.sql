-- =====================================================================
-- Torneos: retos entre clubes, asociaciones/misiones, uniones y países
--  * El superadmin crea torneos abiertos por ámbito (opcionalmente solo de un país).
--  * Un director reta a uno o varios clubes; cada director rival acepta o rechaza.
--  * Cuenta el mejor puntaje de cada jugador en ese desafío dentro de las fechas (no en salas).
--    Puntaje del grupo = suma de sus 5 mejores (clubes) o 10 mejores (asociaciones, uniones, países).
-- =====================================================================

create table if not exists public.torneos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 3 and 60 and titulo !~ '[<>\x00-\x1f\x7f]'),
  tipo text not null check (tipo in ('abierto', 'clubes')),
  ambito text not null check (ambito in ('clubes', 'campos', 'uniones', 'paises')),
  reto text not null references public.challenges(id),
  inicia timestamptz not null,
  termina timestamptz not null,
  pais text check (pais is null or pais ~ '^[A-Z]{2}$'),
  estado text not null default 'activo' check (estado in ('pendiente', 'activo', 'cancelado')),
  club_creador uuid references public.clubs(id) on delete cascade,
  creado timestamptz not null default now(),
  check (termina > inicia and termina - inicia <= interval '31 days'),
  check (tipo = 'abierto' or ambito = 'clubes')
);
create table if not exists public.torneo_clubes (
  torneo_id uuid not null references public.torneos(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  acepto boolean,
  primary key (torneo_id, club_id)
);
create table if not exists public.torneo_cache (
  torneo_id uuid primary key references public.torneos(id) on delete cascade,
  datos jsonb not null,
  actualizado timestamptz not null default now()
);
create index if not exists torneos_vigentes on public.torneos (termina) where estado = 'activo';
create index if not exists torneo_clubes_club on public.torneo_clubes (club_id);
create index if not exists attempts_reto_fin on public.attempts (challenge_id, finished_at) where sala is null and score is not null;
alter table public.torneos enable row level security;
alter table public.torneo_clubes enable row level security;
alter table public.torneo_cache enable row level security;

/** Tabla de posiciones (se recalcula como mucho cada minuto, un proceso a la vez). */
create or replace function public._tabla_torneo(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.torneos; c public.torneo_cache; n int; d jsonb;
begin
  select * into t from public.torneos where id = p_id;
  if t.id is null then return '[]'::jsonb; end if;
  select * into c from public.torneo_cache where torneo_id = p_id;
  if c.torneo_id is not null and (c.actualizado > now() - interval '60 seconds' or c.actualizado > t.termina + interval '1 minute') then return c.datos; end if;
  if not pg_try_advisory_xact_lock(hashtext('torneo:' || p_id::text)) then return coalesce(c.datos, '[]'::jsonb); end if;
  n := case when t.ambito = 'clubes' then 5 else 10 end;
  with mejores as (
    select a.player_id, max(a.score) as pts
    from public.attempts a
    where a.challenge_id = t.reto and a.sala is null and a.score is not null
      and a.finished_at >= t.inicia and a.finished_at < t.termina
    group by a.player_id
  ), jug as (
    select m.pts,
      case t.ambito when 'clubes' then cl.id::text
                    when 'campos' then coalesce(cl.campo_id::text, 'n:' || coalesce(cl.campo, ''))
                    when 'uniones' then coalesce(ca.union_id::text, 'n:' || coalesce(cl.union_nombre, ''))
                    else coalesce(cl.pais, '') end as clave,
      case t.ambito when 'clubes' then cl.nombre
                    when 'campos' then coalesce(ca.nombre, cl.campo)
                    when 'uniones' then coalesce(un.nombre, cl.union_nombre)
                    else coalesce(pa.nombre, cl.pais) end as nombre,
      cl.pais
    from mejores m
    join public.players p on p.id = m.player_id and not p.invitado and not p.bloqueado
    join public.clubs cl on cl.id = p.club_id
    left join public.campos ca on ca.id = cl.campo_id
    left join public.uniones un on un.id = ca.union_id
    left join public.paises pa on pa.codigo = cl.pais
    where (t.pais is null or cl.pais = t.pais)
      and (t.tipo = 'abierto' or exists (select 1 from public.torneo_clubes tc where tc.torneo_id = t.id and tc.club_id = cl.id and tc.acepto))
  ), orden as (
    select clave, nombre, pais, pts, row_number() over (partition by clave order by pts desc) as k from jug where clave <> '' and clave <> 'n:'
  ), grupos as (
    select clave, max(nombre) as nombre, max(pais) as pais, sum(pts) filter (where k <= n)::bigint as puntos, count(*) as jugadores
    from orden group by clave
  )
  select coalesce(jsonb_agg(jsonb_build_object('clave', clave, 'nombre', nombre, 'pais', pais, 'puntos', puntos, 'jugadores', jugadores)
         order by puntos desc, jugadores desc, nombre), '[]'::jsonb)
    into d from (select * from grupos order by puntos desc, jugadores desc, nombre limit 100) g;
  -- En un reto entre clubes aparecen también los que aún no juegan (con 0)
  if t.tipo = 'clubes' then
    select d || coalesce(jsonb_agg(jsonb_build_object('clave', cl.id::text, 'nombre', cl.nombre, 'pais', cl.pais, 'puntos', 0, 'jugadores', 0) order by cl.nombre), '[]'::jsonb)
      into d from public.torneo_clubes tc join public.clubs cl on cl.id = tc.club_id
      where tc.torneo_id = t.id and tc.acepto and not (d @> jsonb_build_array(jsonb_build_object('clave', cl.id::text)));
  end if;
  insert into public.torneo_cache(torneo_id, datos, actualizado) values (p_id, d, now())
    on conflict (torneo_id) do update set datos = excluded.datos, actualizado = excluded.actualizado;
  return d;
end $$;
revoke all on function public._tabla_torneo(uuid) from public, anon, authenticated;

/** Clave del grupo de un club en un ámbito (la misma que usa la tabla). */
create or replace function public._clave_de_club(p_ambito text, p_club uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case p_ambito when 'clubes' then cl.id::text
                       when 'campos' then coalesce(cl.campo_id::text, 'n:' || coalesce(cl.campo, ''))
                       when 'uniones' then coalesce(ca.union_id::text, 'n:' || coalesce(cl.union_nombre, ''))
                       else coalesce(cl.pais, '') end
  from public.clubs cl left join public.campos ca on ca.id = cl.campo_id where cl.id = p_club
$$;
revoke all on function public._clave_de_club(text, uuid) from public, anon, authenticated;

/** Torneos que ve un jugador: abiertos (de su país o de todos) y los retos que aceptó su club. */
create or replace function public.torneos_vigentes(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid uuid := public._jugador(p_token); cid uuid; cpais text; r jsonb := '[]'::jsonb; t public.torneos; tabla jsonb; clave text; pos int;
begin
  select p.club_id, cl.pais into cid, cpais from public.players p join public.clubs cl on cl.id = p.club_id where p.id = pid and not p.invitado;
  if cid is null then return '[]'::jsonb; end if;
  for t in
    select * from public.torneos x
    where x.estado = 'activo' and x.termina > now() - interval '3 days' and x.inicia < now() + interval '14 days'
      and ((x.tipo = 'abierto' and (x.pais is null or x.pais = cpais))
        or (x.tipo = 'clubes' and exists (select 1 from public.torneo_clubes tc where tc.torneo_id = x.id and tc.club_id = cid and tc.acepto)))
    order by (x.termina < now()), x.termina limit 12
  loop
    tabla := case when t.inicia <= now() then public._tabla_torneo(t.id) else '[]'::jsonb end;
    clave := public._clave_de_club(t.ambito, cid);
    pos := null;
    select k.i::int into pos from jsonb_array_elements(tabla) with ordinality as k(e, i) where k.e->>'clave' = clave;
    r := r || jsonb_build_array(jsonb_build_object(
      'id', t.id, 'titulo', t.titulo, 'tipo', t.tipo, 'ambito', t.ambito, 'reto', t.reto, 'inicia', t.inicia, 'termina', t.termina, 'pais', t.pais,
      'top', coalesce((select jsonb_agg(e - 'clave' || jsonb_build_object('mio', e->>'clave' = clave)) from (select e from jsonb_array_elements(tabla) e limit 5) z), '[]'::jsonb),
      'mio', case when pos is null then null else (tabla->(pos - 1)) - 'clave' || jsonb_build_object('puesto', pos) end,
      'grupos', jsonb_array_length(tabla)));
  end loop;
  return r;
end $$;

/** Superadmin: crear, listar y cancelar torneos abiertos. */
create or replace function public.admin_crear_torneo(p_titulo text, p_ambito text, p_reto text, p_inicia timestamptz, p_termina timestamptz, p_pais text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare tid uuid;
begin
  perform public._exigir_admin();
  if p_titulo is null or char_length(trim(p_titulo)) not between 3 and 60 or p_titulo ~ '[<>\x00-\x1f\x7f]' then raise exception 'TEXTO_INVALIDO'; end if;
  if p_ambito not in ('clubes', 'campos', 'uniones', 'paises') then raise exception 'DATOS_INVALIDOS'; end if;
  if not exists (select 1 from public.challenges where id = p_reto) then raise exception 'RETO_NO_EXISTE'; end if;
  if p_inicia is null or p_termina is null or p_termina <= p_inicia or p_termina - p_inicia > interval '31 days' or p_termina < now() then raise exception 'FECHA_INVALIDA'; end if;
  if p_pais is not null and not exists (select 1 from public.paises where codigo = p_pais) then raise exception 'DATOS_INVALIDOS'; end if;
  insert into public.torneos(titulo, tipo, ambito, reto, inicia, termina, pais) values (trim(p_titulo), 'abierto', p_ambito, p_reto, p_inicia, p_termina, p_pais) returning id into tid;
  return tid;
end $$;

create or replace function public.admin_torneos() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'tipo', t.tipo, 'ambito', t.ambito, 'reto', t.reto,
      'inicia', t.inicia, 'termina', t.termina, 'pais', t.pais, 'estado', t.estado,
      'clubes', (select count(*) from public.torneo_clubes tc where tc.torneo_id = t.id and tc.acepto),
      'top', case when t.inicia <= now() and t.estado = 'activo' then (select jsonb_agg(e - 'clave') from (select e from jsonb_array_elements(public._tabla_torneo(t.id)) e limit 3) z) else '[]'::jsonb end)
    order by t.inicia desc)
    from (select * from public.torneos order by inicia desc limit 40) t), '[]'::jsonb);
end $$;

create or replace function public.admin_cancelar_torneo(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  update public.torneos set estado = 'cancelado' where id = p_id;
end $$;

/** Director: retar a uno o varios clubes (cada director rival acepta o rechaza). */
create or replace function public.director_retar(p_rivales uuid[], p_reto text, p_inicia timestamptz, p_dias int, p_titulo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare cid uuid; tid uuid; n int;
begin
  if auth.uid() is null then raise exception 'NO_AUTORIZADO'; end if;
  select id into cid from public.clubs where owner_id = auth.uid() limit 1;
  if cid is null then raise exception 'NO_AUTORIZADO'; end if;
  if p_rivales is null or cardinality(p_rivales) not between 1 and 7 or cid = any(p_rivales) then raise exception 'DATOS_INVALIDOS'; end if;
  select count(distinct r) into n from unnest(p_rivales) r join public.clubs c on c.id = r and c.owner_id is not null;
  if n <> cardinality(p_rivales) then raise exception 'CLUB_SIN_DIRECTOR'; end if;
  if not exists (select 1 from public.challenges where id = p_reto) then raise exception 'RETO_NO_EXISTE'; end if;
  if p_inicia is null or p_inicia < now() - interval '1 hour' or p_inicia > now() + interval '30 days' or p_dias not between 1 and 14 then raise exception 'FECHA_INVALIDA'; end if;
  if p_titulo is null or char_length(trim(p_titulo)) not between 3 and 60 or p_titulo ~ '[<>\x00-\x1f\x7f]' then raise exception 'TEXTO_INVALIDO'; end if;
  if (select count(*) from public.torneos where club_creador = cid and estado <> 'cancelado' and termina > now()) >= 5 then raise exception 'DEMASIADOS_RETOS'; end if;
  insert into public.torneos(titulo, tipo, ambito, reto, inicia, termina, estado, club_creador)
    values (trim(p_titulo), 'clubes', 'clubes', p_reto, p_inicia, p_inicia + make_interval(days => p_dias), 'pendiente', cid) returning id into tid;
  insert into public.torneo_clubes(torneo_id, club_id, acepto) values (tid, cid, true);
  insert into public.torneo_clubes(torneo_id, club_id, acepto) select distinct tid, r, null::boolean from unnest(p_rivales) r;
  return tid;
end $$;

create or replace function public.director_retos() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'NO_AUTORIZADO'; end if;
  select id into cid from public.clubs where owner_id = auth.uid() limit 1;
  if cid is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'reto', t.reto, 'inicia', t.inicia, 'termina', t.termina,
      'estado', t.estado, 'mio', t.club_creador = cid, 'mi_respuesta', mt.acepto,
      'retador', (select nombre from public.clubs where id = t.club_creador),
      'clubes', (select jsonb_agg(jsonb_build_object('nombre', c.nombre, 'acepto', tc.acepto) order by c.nombre) from public.torneo_clubes tc join public.clubs c on c.id = tc.club_id where tc.torneo_id = t.id))
    order by t.inicia desc)
    from public.torneos t join public.torneo_clubes mt on mt.torneo_id = t.id and mt.club_id = cid
    where t.tipo = 'clubes' and t.estado <> 'cancelado' and t.termina > now() - interval '7 days'), '[]'::jsonb);
end $$;

create or replace function public.director_responder_reto(p_id uuid, p_acepta boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'NO_AUTORIZADO'; end if;
  select id into cid from public.clubs where owner_id = auth.uid() limit 1;
  if cid is null or p_acepta is null then raise exception 'NO_AUTORIZADO'; end if;
  update public.torneo_clubes tc set acepto = p_acepta
    from public.torneos t where t.id = tc.torneo_id and tc.torneo_id = p_id and tc.club_id = cid and t.estado <> 'cancelado' and t.termina > now() and t.club_creador <> cid;
  if not found then raise exception 'NO_AUTORIZADO'; end if;
  update public.torneos t set estado = 'activo'
    where t.id = p_id and t.estado = 'pendiente' and (select count(*) from public.torneo_clubes where torneo_id = p_id and acepto) >= 2;
  update public.torneos t set estado = 'cancelado'
    where t.id = p_id and t.estado = 'pendiente' and not exists (select 1 from public.torneo_clubes where torneo_id = p_id and club_id <> t.club_creador and acepto is distinct from false);
end $$;

create or replace function public.director_cancelar_reto(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'NO_AUTORIZADO'; end if;
  update public.torneos set estado = 'cancelado'
    where id = p_id and club_creador = (select id from public.clubs where owner_id = auth.uid() limit 1) and inicia > now();
  if not found then raise exception 'NO_AUTORIZADO'; end if;
end $$;

/** Clubes con director (para elegir rivales), con filtro por nombre. */
create or replace function public.clubes_para_retar(p_buscar text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare q text := lower(coalesce(trim(p_buscar), ''));
begin
  if auth.uid() is null then raise exception 'NO_AUTORIZADO'; end if;
  if char_length(q) < 2 or char_length(q) > 40 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'ciudad', c.ciudad, 'campo', c.campo, 'pais', c.pais) order by c.nombre)
    from (select * from public.clubs c where c.owner_id is not null and c.owner_id <> auth.uid()
          and (lower(c.nombre) like '%' || replace(replace(q, '%', ''), '_', '') || '%' or lower(coalesce(c.campo, '')) like '%' || replace(replace(q, '%', ''), '_', '') || '%')
          order by c.nombre limit 20) c), '[]'::jsonb);
end $$;

revoke all on function public.torneos_vigentes(text) from public;
grant execute on function public.torneos_vigentes(text) to anon, authenticated;
revoke all on function public.admin_crear_torneo(text, text, text, timestamptz, timestamptz, text) from public, anon;
revoke all on function public.admin_torneos() from public, anon;
revoke all on function public.admin_cancelar_torneo(uuid) from public, anon;
revoke all on function public.director_retar(uuid[], text, timestamptz, int, text) from public, anon;
revoke all on function public.director_retos() from public, anon;
revoke all on function public.director_responder_reto(uuid, boolean) from public, anon;
revoke all on function public.director_cancelar_reto(uuid) from public, anon;
revoke all on function public.clubes_para_retar(text) from public, anon;
grant execute on function public.admin_crear_torneo(text, text, text, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.admin_torneos() to authenticated;
grant execute on function public.admin_cancelar_torneo(uuid) to authenticated;
grant execute on function public.director_retar(uuid[], text, timestamptz, int, text) to authenticated;
grant execute on function public.director_retos() to authenticated;
grant execute on function public.director_responder_reto(uuid, boolean) to authenticated;
grant execute on function public.director_cancelar_reto(uuid) to authenticated;
grant execute on function public.clubes_para_retar(text) to authenticated;
