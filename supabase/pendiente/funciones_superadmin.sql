
create or replace function public._exigir_admin() returns void
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.superadmins where user_id = auth.uid()) then raise exception 'NO_AUTORIZADO'; end if;
end $$;

create or replace function public.admin_resumen() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  return jsonb_build_object(
    'ninos', (select count(*) from public.players where grupo_edad = 'menor'),
    'adultos', (select count(*) from public.players where grupo_edad = 'adulto'),
    'clubes', (select count(*) from public.clubs),
    'activos_24h', (select count(*) from public.players where ultima_actividad > now() - interval '24 hours'),
    'activos_7d', (select count(*) from public.players where ultima_actividad > now() - interval '7 days'),
    'nuevos_7d', (select count(*) from public.players where created_at > now() - interval '7 days'),
    'salas_abiertas', (select count(*) from public.salas where not cerrada and expira > now() and tipo = 'sala'),
    'duelos_hoy', (select count(*) from public.salas where tipo = 'duelo' and creada > now() - interval '24 hours'),
    'solicitudes', (select count(*) from public.sesiones where estado = 'pendiente'),
    'partidas_7d', (select count(*) from public.attempts where started_at > now() - interval '7 days'),
    'salas_requieren_aprobacion', (select valor from public.config where clave = 'salas_requieren_aprobacion'),
    'max_jugadores_sala', (select valor from public.config where clave = 'max_jugadores_sala'));
end $$;

create or replace function public.admin_jugadores(p_buscar text default null, p_limite int default 100)
returns table(id uuid, apodo text, rango text, grupo_edad text, cargo text, email text, club text, campo text, pais text, puntos bigint, creado timestamptz, ultima_actividad timestamptz, bloqueado boolean, director boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  return query
  select p.id, p.apodo, p.rango, p.grupo_edad, p.cargo, u.email::text, c.nombre, c.campo, c.pais,
    coalesce((select sum(b.score) from public.best_scores b where b.player_id = p.id), 0)::bigint,
    p.created_at, p.ultima_actividad, p.bloqueado, c.owner_id is not null and c.owner_id = p.auth_user_id
  from public.players p join public.clubs c on c.id = p.club_id left join auth.users u on u.id = p.auth_user_id
  where p_buscar is null or p_buscar = '' or p.apodo ilike '%' || p_buscar || '%' or c.nombre ilike '%' || p_buscar || '%' or u.email ilike '%' || p_buscar || '%'
  order by p.ultima_actividad desc limit least(greatest(coalesce(p_limite,100),1),500);
end $$;

create or replace function public.admin_bloquear(p_id uuid, p_bloqueado boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  update public.players set bloqueado = coalesce(p_bloqueado,false) where id = p_id;
  if p_bloqueado then delete from public.sessions where player_id = p_id; end if;
end $$;

create or replace function public.admin_borrar_jugador(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin perform public._exigir_admin(); delete from public.players where id = p_id; end $$;

create or replace function public.admin_clubes(p_buscar text default null)
returns table(id uuid, nombre text, codigo text, ciudad text, campo text, union_nombre text, pais text, director text, miembros bigint, ninos bigint, creado timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  return query
  select c.id, c.nombre, c.codigo, c.ciudad, c.campo, c.union_nombre, c.pais, u.email::text,
    (select count(*) from public.players p where p.club_id = c.id), (select count(*) from public.players p where p.club_id = c.id and p.grupo_edad = 'menor'), c.created_at
  from public.clubs c left join auth.users u on u.id = c.owner_id
  where p_buscar is null or p_buscar = '' or c.nombre ilike '%' || p_buscar || '%' or c.campo ilike '%' || p_buscar || '%'
  order by c.created_at desc limit 500;
end $$;

create or replace function public.admin_borrar_club(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin perform public._exigir_admin(); delete from public.players where club_id = p_id; delete from public.clubs where id = p_id; end $$;

create or replace function public.admin_salas()
returns table(codigo text, tipo text, anfitrion text, rival text, club text, entradas int, cupo int, creada timestamptz, abierta boolean, sesion text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  return query
  select s.codigo, s.tipo, a.apodo, r.apodo, c.nombre, s.entradas, s.cupo, s.creada, not s.cerrada and s.expira > now(), se.titulo
  from public.salas s left join public.players a on a.id = s.anfitrion left join public.players r on r.id = s.rival
  left join public.clubs c on c.id = s.club_id left join public.sesiones se on se.id = s.sesion_id
  order by s.creada desc limit 200;
end $$;

create or replace function public.admin_cerrar_sala(p_codigo text) returns void
language plpgsql security definer set search_path = '' as $$
begin perform public._exigir_admin(); update public.salas set cerrada = true where codigo = upper(p_codigo); end $$;

create or replace function public.admin_sesiones(p_estado text default null)
returns table(id uuid, club text, campo text, solicitante text, email text, titulo text, inicia timestamptz, minutos int, cupo_ninos int, cupo_lideres int, nota text, estado text, respuesta text, creado timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  return query
  select s.id, c.nombre, c.campo, p.apodo, u.email::text, s.titulo, s.inicia, s.minutos, s.cupo_ninos, s.cupo_lideres, s.nota, s.estado, s.respuesta, s.creado
  from public.sesiones s join public.clubs c on c.id = s.club_id join public.players p on p.id = s.solicitante left join auth.users u on u.id = p.auth_user_id
  where p_estado is null or s.estado = p_estado
  order by (s.estado = 'pendiente') desc, s.inicia asc limit 300;
end $$;

create or replace function public.admin_resolver_sesion(p_id uuid, p_estado text, p_respuesta text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  if p_estado not in ('aprobada','rechazada') then raise exception 'ESTADO_INVALIDO'; end if;
  update public.sesiones set estado = p_estado, respuesta = nullif(left(trim(coalesce(p_respuesta,'')), 300),'') where id = p_id;
end $$;

create or replace function public.admin_config(p_clave text, p_valor jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_admin();
  if p_clave = 'salas_requieren_aprobacion' and jsonb_typeof(p_valor) = 'boolean' then null;
  elsif p_clave = 'max_jugadores_sala' and jsonb_typeof(p_valor) = 'number' and (p_valor)::text::int between 2 and 300 then null;
  else raise exception 'CONFIG_INVALIDA'; end if;
  update public.config set valor = p_valor where clave = p_clave;
end $$;

create or replace function public.admin_importar(p_datos jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; uid int; cid int; n_u int := 0; n_c int := 0; n_cl int := 0; nom text;
begin
  perform public._exigir_admin();
  if jsonb_typeof(p_datos) <> 'object' or pg_column_size(p_datos) > 900000 then raise exception 'DATOS_INVALIDOS'; end if;
  for r in select * from jsonb_array_elements(coalesce(p_datos->'paises','[]')) loop
    insert into public.paises(codigo, nombre, division) values (upper(r->>'codigo'), trim(r->>'nombre'), r->>'division')
    on conflict (codigo) do update set nombre = excluded.nombre;
  end loop;
  for r in select * from jsonb_array_elements(coalesce(p_datos->'uniones','[]')) loop
    insert into public.uniones(pais, nombre, sigla) values (upper(r->>'pais'), trim(r->>'nombre'), nullif(upper(trim(coalesce(r->>'sigla',''))),''))
    on conflict (pais, nombre) do nothing;
    n_u := n_u + 1;
  end loop;
  for r in select * from jsonb_array_elements(coalesce(p_datos->'campos','[]')) loop
    select id into uid from public.uniones where pais = upper(r->>'pais') and nombre = trim(r->>'union');
    if uid is null then raise exception 'UNION_NO_EXISTE: %', left(r->>'union', 60); end if;
    insert into public.campos(union_id, nombre, tipo, sigla) values (uid, trim(r->>'nombre'), coalesce(r->>'tipo','asociacion'), nullif(upper(trim(coalesce(r->>'sigla',''))),''))
    on conflict (union_id, nombre) do update set tipo = excluded.tipo, sigla = coalesce(excluded.sigla, public.campos.sigla);
    n_c := n_c + 1;
  end loop;
  for r in select * from jsonb_array_elements(coalesce(p_datos->'clubes','[]')) loop
    select c.id into cid from public.campos c join public.uniones u on u.id = c.union_id
      where u.pais = upper(r->>'pais') and c.nombre = trim(r->>'campo');
    if cid is null then raise exception 'CAMPO_NO_EXISTE: %', left(r->>'campo', 60); end if;
    nom := regexp_replace(trim(r->>'nombre'), '\s+', ' ', 'g');
    if not exists (select 1 from public.clubs where campo_id = cid and nombre_norm = trim(public._norm(nom))) then
      insert into public.clubs(codigo, nombre, ciudad, campo, pais, campo_id, verificado)
      values (public._nuevo_codigo(), nom, coalesce(nullif(trim(r->>'ciudad'),''), 'Sin ciudad'), '-', 'PE', cid, true);
      n_cl := n_cl + 1;
    end if;
  end loop;
  return jsonb_build_object('uniones', n_u, 'campos', n_c, 'clubes_nuevos', n_cl);
end $$;

revoke all on function public._exigir_admin(), public.admin_resumen(), public.admin_jugadores(text,int), public.admin_bloquear(uuid,boolean),
  public.admin_borrar_jugador(uuid), public.admin_clubes(text), public.admin_borrar_club(uuid), public.admin_salas(), public.admin_cerrar_sala(text),
  public.admin_sesiones(text), public.admin_resolver_sesion(uuid,text,text), public.admin_config(text,jsonb), public.admin_importar(jsonb) from public, anon;
grant execute on function public.admin_resumen(), public.admin_jugadores(text,int), public.admin_bloquear(uuid,boolean),
  public.admin_borrar_jugador(uuid), public.admin_clubes(text), public.admin_borrar_club(uuid), public.admin_salas(), public.admin_cerrar_sala(text),
  public.admin_sesiones(text), public.admin_resolver_sesion(uuid,text,text), public.admin_config(text,jsonb), public.admin_importar(jsonb) to authenticated;
