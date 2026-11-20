-- =====================================================================
-- Objetos para la carpa (se compran con ConquisCoins) y micrófono en vivo del culto
-- =====================================================================

-- 1) Objetos de la carpa: guitarra, brújula, linterna, cantimplora y hamaca (la Biblia la tiene todo conquistador)
alter table public.tienda drop constraint if exists tienda_tipo_check;
alter table public.tienda add constraint tienda_tipo_check check (tipo in ('pin', 'parche', 'objeto'));
insert into public.tienda(id, tipo, nombre, precio, orden) values
  ('obj-guitarra', 'objeto', 'Guitarra de campamento', 250, 20),
  ('obj-brujula', 'objeto', 'Brújula de orientación', 120, 21),
  ('obj-linterna', 'objeto', 'Linterna', 80, 22),
  ('obj-cantimplora', 'objeto', 'Cantimplora', 60, 23),
  ('obj-hamaca', 'objeto', 'Hamaca', 150, 24)
on conflict (id) do update set nombre = excluded.nombre, precio = excluded.precio, tipo = excluded.tipo, orden = excluded.orden;

-- 2) Micrófono: quien tiene el turno registra la huella (DTLS) de su conexión; los oyentes solo aceptan audio
--    de esa huella, así nadie puede hacerse pasar por quien habla.
alter table public.programas add column if not exists microfono_de uuid references public.players(id) on delete set null;
alter table public.programas add column if not exists microfono_huella text;
alter table public.programas drop constraint if exists programas_huella_formato;
alter table public.programas add constraint programas_huella_formato
  check (microfono_huella is null or microfono_huella ~ '^sha-256 ([0-9A-F]{2}:){31}[0-9A-F]{2}$');

/** Puede hablar: el conductor o el responsable de la parte actual (solo en vivo). */
create or replace function public._puede_hablar(p_programa uuid, p_player uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.programas g
    where g.id = p_programa and g.estado = 'en_vivo'
      and (public._rol_programa(g.id, p_player) = 'conductor'
        or exists (select 1 from public.programa_partes x where x.programa_id = g.id and x.orden = g.parte_actual and x.responsable = p_player)))
$$;
revoke all on function public._puede_hablar(uuid, uuid) from public, anon, authenticated;

/** Abrir (con la huella) o cerrar (null) el micrófono. */
create or replace function public.programa_microfono(p_token text, p_programa uuid, p_huella text) returns int
language plpgsql security definer set search_path = '' as $$
declare me uuid := public._jugador(p_token); g public.programas; v int;
begin
  select * into g from public.programas where id = p_programa for update;
  if g.id is null then raise exception 'NO_AUTORIZADO'; end if;
  if p_huella is null then
    if g.microfono_de is distinct from me and public._rol_programa(p_programa, me) is distinct from 'conductor' then raise exception 'NO_AUTORIZADO'; end if;
    update public.programas set microfono_de = null, microfono_huella = null, version = version + 1 where id = p_programa returning version into v;
    return v;
  end if;
  if not public._puede_hablar(p_programa, me) then raise exception 'NO_AUTORIZADO'; end if;
  if p_huella !~ '^sha-256 ([0-9A-F]{2}:){31}[0-9A-F]{2}$' then raise exception 'DATOS_INVALIDOS'; end if;
  update public.programas set microfono_de = me, microfono_huella = p_huella, version = version + 1 where id = p_programa returning version into v;
  return v;
end $$;
revoke all on function public.programa_microfono(text, uuid, text) from public;
grant execute on function public.programa_microfono(text, uuid, text) to anon, authenticated;

-- Al cambiar de parte, el micrófono pasa: se apaga si quien lo tenía ya no puede hablar
create or replace function public._micro_al_cambiar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.microfono_de is not null and (new.estado <> 'en_vivo' or new.parte_actual is distinct from old.parte_actual)
     and not (new.estado = 'en_vivo' and (public._rol_programa(new.id, new.microfono_de) = 'conductor'
       or exists (select 1 from public.programa_partes x where x.programa_id = new.id and x.orden = new.parte_actual and x.responsable = new.microfono_de))) then
    new.microfono_de := null; new.microfono_huella := null;
  end if;
  return new;
end $$;
drop trigger if exists programas_micro on public.programas;
create trigger programas_micro before update of parte_actual, estado on public.programas for each row execute function public._micro_al_cambiar();

-- programa_actual: también dice quién tiene el micrófono y su huella
do $$
declare d text; o oid;
begin
  select p.oid into o from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'programa_actual';
  d := pg_get_functiondef(o);
  if position('''microfono''' in d) > 0 then return; end if;
  d := replace(d, '''mi_rol'', rol,', '''microfono'', case when g.estado = ''en_vivo'' and g.microfono_de is not null then jsonb_build_object(''de'', g.microfono_de, ''apodo'', (select apodo from public.players where id = g.microfono_de), ''huella'', g.microfono_huella) end,
    ''puedo_hablar'', public._puede_hablar(g.id, me),
    ''mi_rol'', rol,');
  if position('''microfono''' in d) = 0 then raise exception 'no se pudo parchar programa_actual'; end if;
  execute d;
end $$;
