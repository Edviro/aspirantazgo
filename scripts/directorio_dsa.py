#!/usr/bin/env python3
"""
Descarga el directorio oficial de clubes de Conquistadores de la DSA (clubes.adventistas.org)
y lo guarda en un JSON: uniones → asociaciones/misiones → regiones → clubes (con ciudad).

Va DESPACIO a propósito (1 página cada 5 s, nunca en paralelo, y si el sitio responde 429 espera
lo que pide Retry-After), así que una descarga completa toma varias horas. Por eso es REANUDABLE:
cada corrida trabaja hasta un tiempo límite, guarda su avance en `estado` y la siguiente sigue
desde ahí. Perú va primero. Cuando todo está listo marca `completo` y no vuelve a pedir nada
hasta el mes siguiente.

Solo usa la biblioteca estándar.
Uso:  python3 scripts/directorio_dsa.py <carpeta>   (lee/escribe <carpeta>/estado_directorio.json y directorio_dsa.json)
"""
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib

BASE = 'https://clubes.adventistas.org'
PAUSA = 5.0                      # segundos entre peticiones (como una persona navegando)
LIMITE = float(os.environ.get('LIMITE_MIN', '270')) * 60   # tiempo de trabajo por corrida
REFRESCO_DIAS = 25               # un directorio completo se vuelve a bajar pasado este tiempo
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
PAIS = {**{u: 'BR' for u in ('ucb', 'ucob', 'ulb', 'uneb', 'unob', 'unb', 'useb', 'usb')},
        'ua': 'AR', 'ub': 'BO', 'uch': 'CL', 'ue': 'EC', 'up': 'PY', 'upn': 'PE', 'ups': 'PE', 'uu': 'UY'}
PRIORIDAD = ['upn', 'ups']       # Perú primero
inicio = time.time()
ultima = 0.0
peticiones = 0
esperas_429 = 0


class SinTiempo(Exception):
    pass


def txt(t):
    t = html.unescape(re.sub(r'<[^>]+>', ' ', t or ''))
    return re.sub(r'\s+', ' ', t).strip()


def queda(seg=0):
    return time.time() - inicio + seg < LIMITE


def pedir(ruta, datos=None):
    """GET (o POST si hay datos) con pausa entre peticiones y reintentos ante 429/errores."""
    global ultima, peticiones, esperas_429
    url = ruta if ruta.startswith('http') else BASE + ruta
    assert url.startswith(BASE + '/'), url
    for intento in range(8):
        if not queda(60):
            raise SinTiempo()
        espera = PAUSA - (time.time() - ultima)
        if espera > 0:
            time.sleep(espera)
        ultima = time.time()
        peticiones += 1
        cuerpo = urllib.parse.urlencode(datos).encode() if datos else None
        req = urllib.request.Request(url, data=cuerpo, headers={
            'User-Agent': UA, 'Accept-Language': 'es-PE,es;q=0.9',
            'Accept': '*/*' if datos else 'text/html,application/xhtml+xml',
            **({'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'} if datos else {}),
        })
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                t = r.read().decode('utf-8', 'replace')
            if '<title>Application Error</title>' in t:
                raise urllib.error.URLError('Application Error')
            return t
        except urllib.error.HTTPError as e:
            if e.code == 429:
                esperas_429 += 1
                seg = int(e.headers.get('Retry-After') or 600) + 30
                print(f'  429 en {url}: espero {seg}s (van {esperas_429})', flush=True)
                if not queda(seg + 60):
                    raise SinTiempo()
                time.sleep(seg)
                continue
            if e.code == 404:
                return ''
            print(f'  HTTP {e.code} en {url} (intento {intento + 1})', flush=True)
        except SinTiempo:
            raise
        except Exception as e:  # red, tiempo de espera, página de error
            print(f'  {e} en {url} (intento {intento + 1})', flush=True)
        time.sleep(20 * (intento + 1))
    raise RuntimeError(f'No se pudo leer {url}')


def opciones(t, nombre):
    """Opciones de un <select name=...> como [(valor, texto)]."""
    i = t.find(f'name="{nombre}"')
    if i < 0:
        return []
    bloque = t[i:t.find('</select>', i)]
    return [(v, txt(n)) for v, n in re.findall(r'<option value\s*=\s*["\']?([0-9]+)["\']?[^>]*>([^<]*)<', bloque) if v != '0']


def opciones_ajax(t):
    return [(v, txt(n)) for v, n in re.findall(r"<option value\s*=\s*['\"]?([0-9]+)['\"]?>([^<]*)</option>", t) if v != '0']


def nuevo_estado():
    return {'version': 2, 'empezado': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'completo': False,
            'uniones': [], 'asociaciones': [], 'regiones': [], 'clubes': {}, 'ciudades': {},
            'hechas': {'asoc': [], 'region': [], 'estado': [], 'ciudad': [], 'club': []}, 'pend_estados': [], 'pend_clubes': []}


def orden_asoc(a):
    return (0 if a['union'] in PRIORIDAD else 1, a['union'], a['orden'])


def trabajar(e):
    h = e['hechas']
    # 1) Menú: uniones y asociaciones
    if not e['uniones']:
        menu = pedir('/es/upn/')
        for orden, bloque in enumerate(menu.split('<a href="#"><i class="fa fa-clone"></i>')[1:], 1):
            nombre = txt(bloque.split('<i', 1)[0])
            bloque = bloque.split('</ul>', 1)[0]
            m = re.search(r'href="https://clubes\.adventistas\.org/es/([a-z]+)/"', bloque)
            if not m or not nombre:
                continue
            uid = m.group(1)
            e['uniones'].append({'id': uid, 'nombre': nombre, 'pais': PAIS.get(uid, 'XX'), 'orden': orden})
            hijos = re.findall(rf'href="https://clubes\.adventistas\.org/es/{uid}/([a-z]+)/"><i class="fa fa-clone"></i>([^<]*)</a>', bloque)
            for o2, (aid, an) in enumerate(hijos, 1):
                e['asociaciones'].append({'id': aid, 'union': uid, 'nombre': txt(an), 'orden': o2, 'url': f'/es/{uid}/{aid}/'})
            if not hijos:  # Paraguaya y Uruguaya: la unión hace de asociación
                e['asociaciones'].append({'id': uid, 'union': uid, 'nombre': 'Unión ' + nombre, 'orden': 0, 'url': f'/es/{uid}/', 'sin_regiones': True})
        print(f'{len(e["uniones"])} uniones, {len(e["asociaciones"])} asociaciones/misiones', flush=True)

    # 2) Cada asociación: sus regiones de Conquistadores y sus ciudades
    for a in sorted(e['asociaciones'], key=orden_asoc):
        if a['id'] in h['asoc']:
            continue
        t = pedir(a['url'])
        m = re.search(r'<title>[^<]* - ([^<]*)</title>', t)
        if m and not a.get('sin_regiones'):
            a['nombre'] = txt(m.group(1))
        sec = t[t.find('Conquistadores por Regi'):] if 'Conquistadores por Regi' in t else ''
        sec = sec.split('Aventureros por Regi', 1)[0]
        regs = re.findall(r'<a href="(https://clubes\.adventistas\.org/es/[a-z]+/[a-z]+/region/([0-9]+)/[a-z0-9_-]+/)">([^<]*)</a></td>\s*<td>([0-9.]*)</td>\s*<td>([0-9.]*)</td>', sec)
        for url, rid, rn, nc, nm in regs:
            if not any(r['id'] == int(rid) for r in e['regiones']):
                e['regiones'].append({'id': int(rid), 'asoc': a['id'], 'nombre': txt(rn), 'clubes': int(nc.replace('.', '') or 0),
                                      'miembros': int(nm.replace('.', '') or 0), 'url': url})
        for v, n in opciones(t, 'cod_cidade'):
            e['ciudades'].setdefault(v, n)
        if not regs:
            e['pend_estados'] += [[a['id'], v] for v, _ in opciones(t, 'cod_estado')]
        h['asoc'].append(a['id'])
        print(f'{a["id"]}: {len(regs)} regiones — {a["nombre"]}', flush=True)

    # 3) Cada región: sus clubes (Perú primero)
    prio = {a['id']: orden_asoc(a) for a in e['asociaciones']}
    for r in sorted(e['regiones'], key=lambda r: prio.get(r['asoc'], (9,))):
        if r['id'] in h['region'] or not r.get('url'):
            continue
        t = pedir(r['url'])
        n = 0
        for fila in t.split('</tr>'):
            m = re.search(r'mailbox-name"><a href="https://clubes\.adventistas\.org/es/[a-z]+/([0-9]+)/[^"]*"><b>([^<]*)</b></a>\s*\(([^)]*)\)', fila)
            if not m or 'CONQUISTADOR' not in m.group(3).upper():
                continue
            mm = re.search(r'([0-9.]+) MIEMBROS', fila)
            c = e['clubes'].get(m.group(1), {})
            e['clubes'][m.group(1)] = {'id': int(m.group(1)), 'region': r['id'], 'asoc': r['asoc'], 'nombre': txt(m.group(2))[:80],
                                       'miembros': int(mm.group(1).replace('.', '')) if mm else None, 'ciudad': c.get('ciudad')}
            n += 1
        if n != r['clubes']:
            print(f'  aviso: región {r["id"]} ({r["nombre"]}) tiene {n} clubes y el sitio dice {r["clubes"]}', flush=True)
        h['region'].append(r['id'])

    # 4) Paraguaya y Uruguaya: departamento → ciudad → club → región (de la página del club)
    for asoc, est in e['pend_estados']:
        clave = f'{asoc}:{est}'
        if clave in h['estado']:
            continue
        t = pedir('/busca_cidade.php', {'cod_estado': est})
        for v, n in opciones_ajax(t):
            e['ciudades'].setdefault(v, n)
            t2 = pedir('/busca_clube.php', {'cod_cidade': v})
            for cid, tipo, nom in re.findall(r"<option value\s*=\s*['\"]?([0-9]+)['\"]?>([^|<]*)\|([^<]*)</option>", t2):
                if tipo.strip() == 'DESBRAVADORES' and cid not in e['clubes'] and not any(p[1] == cid for p in e['pend_clubes']):
                    e['pend_clubes'].append([asoc, cid, txt(re.sub(r'\s+-\s+[^-]*$', '', nom))[:80], n])
        h['estado'].append(clave)
    for asoc, cid, nom, ciu in e['pend_clubes']:
        if cid in h['club']:
            continue
        pagina = pedir(f'/es/{asoc}/{cid}/club/')
        m = re.search(r'Región</strong>\s*<p class="text-muted">([^<]*)</p>', pagina)
        rn = txt(m.group(1)) if m else 'Sin región'
        rid = -(zlib.crc32(f'{asoc}:{rn}'.encode()) & 0x7FFFFFFF) or -1
        if not any(x['id'] == rid for x in e['regiones']):
            e['regiones'].append({'id': rid, 'asoc': asoc, 'nombre': rn, 'clubes': None, 'miembros': None})
        e['clubes'][cid] = {'id': int(cid), 'region': rid, 'asoc': asoc, 'nombre': nom, 'miembros': None, 'ciudad': ciu[:60]}
        h['club'].append(cid)

    # 5) Ciudad de cada club (una consulta por ciudad)
    for v, n in e['ciudades'].items():
        if v in h['ciudad']:
            continue
        t = pedir('/busca_clube.php', {'cod_cidade': v})
        for cid, tipo, _ in re.findall(r"<option value\s*=\s*['\"]?([0-9]+)['\"]?>([^|<]*)\|([^<]*)</option>", t):
            c = e['clubes'].get(cid)
            if c and tipo.strip() == 'DESBRAVADORES':
                c['ciudad'] = n[:60]
        h['ciudad'].append(v)
        if len(h['ciudad']) % 100 == 0:
            print(f'  ciudades {len(h["ciudad"])}/{len(e["ciudades"])}', flush=True)
    e['completo'] = True


def main(carpeta):
    ruta_estado = os.path.join(carpeta, 'estado_directorio.json')
    e = None
    if os.path.exists(ruta_estado):
        with open(ruta_estado, encoding='utf-8') as f:
            e = json.load(f)
    if not e or e.get('version') != 2:
        e = nuevo_estado()
    elif e.get('completo'):
        edad = (time.time() - time.mktime(time.strptime(e['empezado'], '%Y-%m-%dT%H:%M:%SZ'))) / 86400
        if edad < REFRESCO_DIAS:
            print(f'Directorio completo de hace {edad:.0f} días: no hay nada que bajar.', flush=True)
            open(os.path.join(carpeta, 'sin_cambios'), 'w').close()
            return
        anterior = e
        e = nuevo_estado()
        e['clubes'] = anterior['clubes']  # se conservan (con su ciudad) mientras se refresca
    try:
        trabajar(e)
    except SinTiempo:
        print('Se acabó el tiempo de esta corrida: se guarda el avance y sigue en la próxima.', flush=True)

    with open(ruta_estado, 'w', encoding='utf-8') as f:
        json.dump(e, f, ensure_ascii=False, separators=(',', ':'))
    datos = {'generado': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'completo': e['completo'],
             'uniones': e['uniones'],
             'asociaciones': [{k: v for k, v in a.items() if k not in ('url', 'sin_regiones')} for a in e['asociaciones']],
             'regiones': [{k: v for k, v in r.items() if k != 'url'} for r in e['regiones']],
             'clubes': sorted(e['clubes'].values(), key=lambda c: c['id'])}
    with open(os.path.join(carpeta, 'directorio_dsa.json'), 'w', encoding='utf-8') as f:
        json.dump(datos, f, ensure_ascii=False, separators=(',', ':'))
    h = e['hechas']
    print(f'Avance: {len(h["asoc"])}/{len(e["asociaciones"])} asociaciones, {len(h["region"])}/{sum(1 for r in e["regiones"] if r.get("url"))} regiones, '
          f'{len(e["clubes"])} clubes, {len(h["ciudad"])}/{len(e["ciudades"])} ciudades · completo={e["completo"]} · '
          f'{peticiones} peticiones, {esperas_429} esperas por 429, {int(time.time() - inicio)} s', flush=True)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
