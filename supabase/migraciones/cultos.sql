-- =====================================================================
-- Cultos y programas en vivo en el escenario del Gran Campamento
--  * El superadmin arma el programa: partes (himno, oración, mensaje…), quién es responsable de cada una,
--    qué se proyecta en la pantalla (diapositivas de texto) y opcionalmente una transmisión de YouTube.
--  * Solo el equipo del programa puede hablar (mensajes de texto en el escenario), cambiar las diapositivas
--    de su parte y avanzar. El conductor maneja todo el programa. Los demás solo miran.
--  * Todo se valida aquí: ni el canal en vivo ni el navegador pueden inventar lo que se muestra.
-- =====================================================================

create table if not exists public.programas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 3 and 60 and titulo !~ '[<>\x00-\x1f\x7f]'),
  inicia timestamptz not null,
  minutos int not null check (minutos between 10 and 300),
  estado text not null default 'programado' check (estado in ('programado', 'en_vivo', 'terminado', 'cancelado')),
  youtube text check (youtube is null or youtube ~ '^[A-Za-z0-9_-]{11}$'),
  parte_actual int not null default 0,
  diapositiva int not null default 0,
  version int not null default 0,
  creado timestamptz not null default now()
);
create table if not exists public.programa_partes (
  programa_id uuid not null references public.programas(id) on delete cascade,
  orden int not null check (orden between 0 and 29),
  titulo text not null check (char_length(titulo) between 2 and 50 and titulo !~ '[<>\x00-\x1f\x7f]'),
  tipo text not null check (tipo in ('bienvenida', 'himno', 'oracion', 'lectura', 'mensaje', 'especial', 'anuncios', 'despedida')),
  responsable uuid references public.players(id) on delete set null,
  diapositivas jsonb not null default '[]'::jsonb,
  primary key (programa_id, orden)
);
create table if not exists public.programa_equipo (
  programa_id uuid not null references public.programas(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  rol text not null check (rol in ('conductor', 'participante')),
  primary key (programa_id, player_id)
);
create table if not exists public.programa_dichos (
  id bigserial primary key,
  programa_id uuid not null references public.programas(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 240),
  creado timestamptz not null default now()
);
create index if not exists programa_dichos_prog on public.programa_dichos (programa_id, id desc);
create index if not exists programas_inicia on public.programas (inicia) where estado in ('programado', 'en_vivo');
create unique index if not exists programas_un_vivo on public.programas ((true)) where estado = 'en_vivo';
alter table public.programas enable row level security;
alter table public.programa_partes enable row level security;
alter table public.programa_equipo enable row level security;
alter table public.programa_dichos enable row level security;

/** Texto seguro: sin < > ni caracteres de control (los saltos de línea solo si se permiten). */
create or replace function public._texto_ok(t text, maximo int, lineas boolean default false) returns boolean
language sql immutable set search_path = '' as $$
  select t is not null and char_length(btrim(t)) between 1 and maximo
     and t !~ (case when lineas then '[<>\x00-\x09\x0b-\x1f\x7f]' else '[<>\x00-\x1f\x7f]' end)
$$;

create or replace function public._diapositivas_ok(d jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(d) = 'array' and jsonb_array_length(d) <= 30
     and not exists (select 1 from jsonb_array_elements(d) e where jsonb_typeof(e) <> 'string' or not public._texto_ok(e #>> '{}', 400, true))
$$;

/** Superadmin: crea o actualiza un programa completo (partes y equipo) en una sola llamada. */
create or replace function public.admin_programa_guardar(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare pid uuid := nullif(p->>'id', '')::uuid; ini timestamptz; mins int; yt text; e jsonb; i int := 0; resp uuid; prog public.programas;
begin
  perform public._exigir_admin();
  if jsonb_typeof(p) <> 'object' or pg_column_size(p) > 60000 then raise exception 'DATOS_INVALIDOS'; end if;
  if not public._texto_ok(p->>'titulo', 60) or char_length(btrim(p->>'titulo')) < 3 then raise exception 'TEXTO_INVALIDO'; end if;
  begin ini := (p->>'inicia')::timestamptz; mins := (p->>'minutos')::int; exception when others then raise exception 'FECHA_INVALIDA'; end;
  if ini is null or mins is null or mins not between 10 and 300 then raise exception 'FECHA_INVALIDA'; end if;
  yt := nullif(btrim(coalesce(p->>'youtube', '')), '');
  if yt is not null and yt !~ '^[A-Za-z0-9_-]{11}$' then raise exception 'YOUTUBE_INVALIDO'; end if;
  if jsonb_typeof(p->'partes') <> 'array' or jsonb_array_length(p->'partes') not between 1 and 30 then raise exception 'DATOS_INVALIDOS'; end if;
  if jsonb_typeof(coalesce(p->'equipo', '[]')) <> 'array' or jsonb_array_length(coalesce(p->'equipo', '[]')) > 40 then raise exception 'DATOS_INVALIDOS'; end if;
  for e in select * from jsonb_array_elements(coalesce(p->'equipo', '[]')) loop
    if coalesce(e->>'rol', '') not in ('conductor', 'participante') then raise exception 'DATOS_INVALIDOS'; end if;
    if not exists (select 1 from public.players where id = (e->>'id')::uuid and not invitado and not bloqueado) then raise exception 'JUGADOR_NO_EXISTE'; end if;
  end loop;
  for e in select * from jsonb_array_elements(p->'partes') loop
    if not public._texto_ok(e->>'titulo', 50) or char_length(btrim(e->>'titulo')) < 2 then raise exception 'TEXTO_INVALIDO'; end if;
    if coalesce(e->>'tipo', '') not in ('bienvenida', 'himno', 'oracion', 'lectura', 'mensaje', 'especial', 'anuncios', 'despedida') then raise exception 'DATOS_INVALIDOS'; end if;
    if not public._diapositivas_ok(coalesce(e->'diapositivas', '[]')) then raise exception 'TEXTO_INVALIDO'; end if;
    if nullif(e->>'responsable', '') is not null and not exists (select 1 from public.players where id = (e->>'responsable')::uuid and not invitado and not bloqueado) then raise exception 'JUGADOR_NO_EXISTE'; end if;
  end loop;

  if pid is null then
    insert into public.programas(titulo, inicia, minutos, youtube) values (btrim(p->>'titulo'), ini, mins, yt) returning id into pid;
  else
    select * into prog from public.programas where id = pid for update;
    if prog.id is null then raise exception 'DATOS_INVALIDOS'; end if;
    update public.programas set titulo = btrim(p->>'titulo'), inicia = ini, minutos = mins, youtube = yt, version = version + 1,
      parte_actual = least(parte_actual, jsonb_array_length(p->'partes') - 1), diapositiva = 0 where id = pid;
    delete from public.programa_partes where programa_id = pid;
    delete from public.programa_equipo where programa_id = pid;
  end if;
  insert into public.programa_equipo(programa_id, player_id, rol)
    select distinct on ((x->>'id')::uuid) pid, (x->>'id')::uuid, x->>'rol' from jsonb_array_elements(coalesce(p->'equipo', '[]')) x
    order by (x->>'id')::uuid, (x->>'rol' = 'conductor') desc;
  for e in select * from jsonb_array_elements(p->'partes') loop
    resp := nullif(e->>'responsable', '')::uuid;
    if resp is not null then insert into public.programa_equipo(programa_id, player_id, rol) values (pid, resp, 'participante') on conflict do nothing; end if;
    insert into public.programa_partes(programa_id, orden, titulo, tipo, responsable, diapositivas)
      values (pid, i, btrim(e->>'titulo'), e->>'tipo', resp, coalesce(e->'diapositivas', '[]'));
    i := i + 1;
  end loop;
  return pid;
end $$;

create or replace function public.admin_programas() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'titulo', g.titulo, 'inicia', g.inicia, 'minutos', g.minutos, 'estado', g.estado, 'youtube', g.youtube,
      'partes', coalesce((select jsonb_agg(jsonb_build_object('titulo', x.titulo, 'tipo', x.tipo, 'responsable', x.responsable, 'diapositivas', x.diapositivas) order by x.orden)
                          from public.programa_partes x where x.programa_id = g.id), '[]'::jsonb),
      'equipo', coalesce((select jsonb_agg(jsonb_build_object('id', q.player_id, 'rol', q.rol, 'apodo', pl.apodo, 'club', c.nombre) order by q.rol, pl.apodo)
                          from public.programa_equipo q join public.players pl on pl.id = q.player_id join public.clubs c on c.id = pl.club_id where q.programa_id = g.id), '[]'::jsonb))
    order by g.inicia desc)
    from (select * from public.programas where estado <> 'cancelado' order by inicia desc limit 30) g), '[]'::jsonb);
end $$;

/** Cambia el estado (en vivo, terminado, cancelado). Solo un programa en vivo a la vez. */
create or replace function public._programa_estado(p_id uuid, p_estado text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_estado not in ('programado', 'en_vivo', 'terminado', 'cancelado') then raise exception 'DATOS_INVALIDOS'; end if;
  if p_estado = 'en_vivo' then
    update public.programas set estado = 'terminado', version = version + 1 where estado = 'en_vivo' and id <> p_id;
    update public.programas set estado = 'en_vivo', parte_actual = 0, diapositiva = 0, version = version + 1 where id = p_id and estado in ('programado', 'terminado');
  else
    update public.programas set estado = p_estado, version = version + 1 where id = p_id;
  end if;
  if not found then raise exception 'DATOS_INVALIDOS'; end if;
end $$;
revoke all on function public._programa_estado(uuid, text) from public, anon, authenticated;

create or replace function public.admin_programa_estado(p_id uuid, p_estado text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  perform public._programa_estado(p_id, p_estado);
end $$;

/** Rol del jugador en el programa (o null). */
create or replace function public._rol_programa(p_prog uuid, p_player uuid) returns text
language sql stable security definer set search_path = '' as $$
  select rol from public.programa_equipo where programa_id = p_prog and player_id = p_player
$$;
revoke all on function public._rol_programa(uuid, uuid) from public, anon, authenticated;

/** Lo que ve cualquiera: el programa en vivo (o el próximo), la parte actual, lo que se proyecta y lo que se dice. */
create or replace function public.programa_actual(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public._jugador(p_token); g public.programas; rol text; txt text;
begin
  select * into g from public.programas where estado = 'en_vivo' limit 1;
  if g.id is null then
    select * into g from public.programas where estado = 'programado' and inicia + make_interval(mins => minutos) > now() and inicia < now() + interval '7 days' order by inicia limit 1;
  end if;
  if g.id is null then return null; end if;
  rol := public._rol_programa(g.id, me);
  select x.diapositivas ->> g.diapositiva into txt from public.programa_partes x where x.programa_id = g.id and x.orden = g.parte_actual;
  return jsonb_build_object('id', g.id, 'titulo', g.titulo, 'inicia', g.inicia, 'minutos', g.minutos, 'estado', g.estado,
    'youtube', case when g.estado = 'en_vivo' then g.youtube end,
    'parte', g.parte_actual, 'diapositiva', g.diapositiva, 'version', g.version,
    'texto', case when g.estado = 'en_vivo' then txt end,
    'total_diapositivas', (select jsonb_array_length(x.diapositivas) from public.programa_partes x where x.programa_id = g.id and x.orden = g.parte_actual),
    'partes', coalesce((select jsonb_agg(jsonb_build_object('orden', x.orden, 'titulo', x.titulo, 'tipo', x.tipo, 'responsable', x.responsable,
                         'apodo', (select apodo from public.players where id = x.responsable)) order by x.orden)
                        from public.programa_partes x where x.programa_id = g.id), '[]'::jsonb),
    'equipo', coalesce((select jsonb_agg(jsonb_build_object('id', pl.id, 'apodo', pl.apodo, 'rango', pl.rango, 'avatar', pl.avatar, 'club', c.nombre, 'rol', q.rol) order by q.rol, pl.apodo)
                        from public.programa_equipo q join public.players pl on pl.id = q.player_id and not pl.bloqueado join public.clubs c on c.id = pl.club_id
                        where q.programa_id = g.id), '[]'::jsonb),
    'dichos', case when g.estado = 'en_vivo' then coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'de', d.player_id, 'apodo', pl.apodo, 'texto', d.texto) order by d.id)
                        from (select * from public.programa_dichos where programa_id = g.id order by id desc limit 8) d join public.players pl on pl.id = d.player_id), '[]'::jsonb) else '[]'::jsonb end,
    'mi_rol', rol,
    'mis_partes', case when rol is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('orden', x.orden, 'diapositivas', x.diapositivas) order by x.orden)
                        from public.programa_partes x where x.programa_id = g.id and (rol = 'conductor' or x.responsable = me)), '[]'::jsonb) end);
end $$;

/** Equipo del programa: decir algo en el escenario (solo en vivo, máx. 1 cada 2 segundos). */
create or replace function public.programa_decir(p_token text, p_programa uuid, p_texto text) returns int
language plpgsql security definer set search_path = '' as $$
declare me uuid := public._jugador(p_token); v int;
begin
  if public._rol_programa(p_programa, me) is null then raise exception 'NO_AUTORIZADO'; end if;
  if not public._texto_ok(p_texto, 240) then raise exception 'TEXTO_INVALIDO'; end if;
  if not exists (select 1 from public.programas where id = p_programa and estado = 'en_vivo') then raise exception 'NO_EN_VIVO'; end if;
  if exists (select 1 from public.programa_dichos where programa_id = p_programa and player_id = me and creado > now() - interval '2 seconds') then raise exception 'MUY_RAPIDO'; end if;
  insert into public.programa_dichos(programa_id, player_id, texto) values (p_programa, me, btrim(p_texto));
  delete from public.programa_dichos where programa_id = p_programa and id < (select min(id) from (select id from public.programa_dichos where programa_id = p_programa order by id desc limit 200) z);
  update public.programas set version = version + 1 where id = p_programa returning version into v;
  return v;
end $$;

/** Equipo: mover la parte y la diapositiva. El conductor va a cualquier parte; el responsable maneja la suya y pasa a la siguiente. */
create or replace function public.programa_control(p_token text, p_programa uuid, p_parte int, p_diapositiva int) returns int
language plpgsql security definer set search_path = '' as $$
declare me uuid := public._jugador(p_token); rol text := public._rol_programa(p_programa, me); g public.programas; total int; resp uuid; v int;
begin
  if rol is null then raise exception 'NO_AUTORIZADO'; end if;
  select * into g from public.programas where id = p_programa and estado = 'en_vivo' for update;
  if g.id is null then raise exception 'NO_EN_VIVO'; end if;
  select jsonb_array_length(diapositivas) into total from public.programa_partes where programa_id = p_programa and orden = p_parte;
  if total is null or p_diapositiva < 0 or p_diapositiva > greatest(total - 1, 0) then raise exception 'DATOS_INVALIDOS'; end if;
  if rol <> 'conductor' then
    select responsable into resp from public.programa_partes where programa_id = p_programa and orden = g.parte_actual;
    if resp is distinct from me or p_parte not in (g.parte_actual, g.parte_actual + 1) then raise exception 'NO_AUTORIZADO'; end if;
  end if;
  update public.programas set parte_actual = p_parte, diapositiva = p_diapositiva, version = version + 1 where id = p_programa returning version into v;
  return v;
end $$;

/** Equipo: subir lo que se proyecta en su parte (el conductor, en cualquiera). */
create or replace function public.programa_diapositivas(p_token text, p_programa uuid, p_orden int, p_diapositivas jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare me uuid := public._jugador(p_token); rol text := public._rol_programa(p_programa, me); v int;
begin
  if rol is null then raise exception 'NO_AUTORIZADO'; end if;
  if not public._diapositivas_ok(p_diapositivas) then raise exception 'TEXTO_INVALIDO'; end if;
  if not exists (select 1 from public.programas where id = p_programa and estado in ('programado', 'en_vivo')) then raise exception 'NO_AUTORIZADO'; end if;
  update public.programa_partes set diapositivas = p_diapositivas
    where programa_id = p_programa and orden = p_orden and (rol = 'conductor' or responsable = me);
  if not found then raise exception 'NO_AUTORIZADO'; end if;
  update public.programas set version = version + 1,
    diapositiva = case when parte_actual = p_orden then least(diapositiva, greatest(jsonb_array_length(p_diapositivas) - 1, 0)) else diapositiva end
    where id = p_programa returning version into v;
  return v;
end $$;

/** Conductor: empezar o terminar la transmisión (desde 1 hora antes hasta el final programado). */
create or replace function public.programa_estado(p_token text, p_programa uuid, p_estado text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := public._jugador(p_token);
begin
  if public._rol_programa(p_programa, me) is distinct from 'conductor' or p_estado not in ('en_vivo', 'terminado') then raise exception 'NO_AUTORIZADO'; end if;
  if p_estado = 'en_vivo' and not exists (select 1 from public.programas where id = p_programa
      and now() between inicia - interval '1 hour' and inicia + make_interval(mins => minutos)) then raise exception 'FUERA_DE_HORARIO'; end if;
  perform public._programa_estado(p_programa, p_estado);
end $$;

/** Conductor: quitar algo que se dijo. */
create or replace function public.programa_borrar_dicho(p_token text, p_programa uuid, p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := public._jugador(p_token);
begin
  if public._rol_programa(p_programa, me) is distinct from 'conductor' then raise exception 'NO_AUTORIZADO'; end if;
  delete from public.programa_dichos where id = p_id and programa_id = p_programa;
  update public.programas set version = version + 1 where id = p_programa;
end $$;

revoke all on function public._texto_ok(text, int, boolean) from public, anon, authenticated;
revoke all on function public._diapositivas_ok(jsonb) from public, anon, authenticated;
revoke all on function public.admin_programa_guardar(jsonb) from public, anon;
revoke all on function public.admin_programas() from public, anon;
revoke all on function public.admin_programa_estado(uuid, text) from public, anon;
grant execute on function public.admin_programa_guardar(jsonb) to authenticated;
grant execute on function public.admin_programas() to authenticated;
grant execute on function public.admin_programa_estado(uuid, text) to authenticated;
revoke all on function public.programa_actual(text) from public;
revoke all on function public.programa_decir(text, uuid, text) from public;
revoke all on function public.programa_control(text, uuid, int, int) from public;
revoke all on function public.programa_diapositivas(text, uuid, int, jsonb) from public;
revoke all on function public.programa_estado(text, uuid, text) from public;
revoke all on function public.programa_borrar_dicho(text, uuid, bigint) from public;
grant execute on function public.programa_actual(text) to anon, authenticated;
grant execute on function public.programa_decir(text, uuid, text) to anon, authenticated;
grant execute on function public.programa_control(text, uuid, int, int) to anon, authenticated;
grant execute on function public.programa_diapositivas(text, uuid, int, jsonb) to anon, authenticated;
grant execute on function public.programa_estado(text, uuid, text) to anon, authenticated;
grant execute on function public.programa_borrar_dicho(text, uuid, bigint) to anon, authenticated;
