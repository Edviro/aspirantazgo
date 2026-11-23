#!/usr/bin/env python3
"""
Descarga el directorio oficial de clubes de Conquistadores de la DSA (clubes.adventistas.org)
y lo guarda en un JSON: uniones → asociaciones/misiones → regiones → clubes (con ciudad).

Lo corre GitHub Actions (una vez al mes). Va despacio a propósito: el sitio responde 429
("demasiadas peticiones") si se le pide rápido; en ese caso espera lo que indica Retry-After.
Solo usa la biblioteca estándar. Uso:  python3 scripts/directorio_dsa.py salida.json
"""
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib

BASE = 'https://clubes.adventistas.org'
PAUSA = 3.0          # segundos entre peticiones
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
PAIS = {**{u: 'BR' for u in ('ucb', 'ucob', 'ulb', 'uneb', 'unob', 'unb', 'useb', 'usb')},
        'ua': 'AR', 'ub': 'BO', 'uch': 'CL', 'ue': 'EC', 'up': 'PY', 'upn': 'PE', 'ups': 'PE', 'uu': 'UY'}
inicio = time.time()
ultima = 0.0
peticiones = 0


def txt(t):
    t = html.unescape(re.sub(r'<[^>]+>', ' ', t or ''))
    return re.sub(r'\s+', ' ', t).strip()


def pedir(ruta, datos=None):
    """GET (o POST si hay datos) con pausa entre peticiones y reintentos ante 429/errores."""
    global ultima, peticiones
    url = ruta if ruta.startswith('http') else BASE + ruta
    assert url.startswith(BASE + '/'), url
    for intento in range(10):
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
                seg = int(e.headers.get('Retry-After') or 600) + 30
                print(f'  429 en {url}: espero {seg}s', flush=True)
                time.sleep(seg)
                continue
            if e.code == 404:
                return ''
            print(f'  HTTP {e.code} en {url} (intento {intento + 1})', flush=True)
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


def main(salida):
    uniones, asociaciones, regiones, clubes = [], [], [], {}
    ciudades = {}  # cod_cidade -> nombre

    menu = pedir('/es/upn/')
    for orden, bloque in enumerate(menu.split('<a href="#"><i class="fa fa-clone"></i>')[1:], 1):
        nombre = txt(bloque.split('<i', 1)[0])
        bloque = bloque.split('</ul>', 1)[0]
        m = re.search(r'href="https://clubes\.adventistas\.org/es/([a-z]+)/"', bloque)
        if not m or not nombre:
            continue
        uid = m.group(1)
        uniones.append({'id': uid, 'nombre': nombre, 'pais': PAIS.get(uid, 'XX'), 'orden': orden})
        hijos = re.findall(rf'href="https://clubes\.adventistas\.org/es/{uid}/([a-z]+)/"><i class="fa fa-clone"></i>([^<]*)</a>', bloque)
        for o2, (aid, an) in enumerate(hijos, 1):
            asociaciones.append({'id': aid, 'union': uid, 'nombre': txt(an), 'orden': o2, 'url': f'/es/{uid}/{aid}/'})
        if not hijos:  # Paraguaya y Uruguaya: la unión hace de asociación
            asociaciones.append({'id': uid, 'union': uid, 'nombre': 'Unión ' + nombre, 'orden': 0, 'url': f'/es/{uid}/', 'sin_regiones': True})
    print(f'{len(uniones)} uniones, {len(asociaciones)} asociaciones/misiones', flush=True)

    sin_regiones = []
    for a in asociaciones:
        t = pedir(a['url'])
        m = re.search(r'<title>[^<]* - ([^<]*)</title>', t)
        if m and not a.get('sin_regiones'):
            a['nombre'] = txt(m.group(1))
        sec = t[t.find('Conquistadores por Regi'):] if 'Conquistadores por Regi' in t else ''
        sec = sec.split('Aventureros por Regi', 1)[0]
        regs = re.findall(r'<a href="(https://clubes\.adventistas\.org/es/[a-z]+/[a-z]+/region/([0-9]+)/[a-z0-9_-]+/)">([^<]*)</a></td>\s*<td>([0-9.]*)</td>\s*<td>([0-9.]*)</td>', sec)
        for url, rid, rn, nc, nm in regs:
            regiones.append({'id': int(rid), 'asoc': a['id'], 'nombre': txt(rn), 'clubes': int(nc.replace('.', '') or 0),
                             'miembros': int(nm.replace('.', '') or 0), 'url': url})
        for v, n in opciones(t, 'cod_cidade'):
            ciudades[v] = n
        if not regs:
            sin_regiones.append((a, opciones(t, 'cod_estado')))
        print(f'{a["id"]}: {len(regs)} regiones — {a["nombre"]}', flush=True)

    for r in regiones:
        t = pedir(r['url'])
        n = 0
        for fila in t.split('</tr>'):
            m = re.search(r'mailbox-name"><a href="https://clubes\.adventistas\.org/es/[a-z]+/([0-9]+)/[^"]*"><b>([^<]*)</b></a>\s*\(([^)]*)\)', fila)
            if not m or 'CONQUISTADOR' not in m.group(3).upper():
                continue
            mm = re.search(r'([0-9.]+) MIEMBROS', fila)
            clubes[int(m.group(1))] = {'id': int(m.group(1)), 'region': r['id'], 'asoc': r['asoc'], 'nombre': txt(m.group(2))[:80],
                                       'miembros': int(mm.group(1).replace('.', '')) if mm else None, 'ciudad': None}
            n += 1
        if n != r['clubes']:
            print(f'  aviso: región {r["id"]} ({r["nombre"]}) tiene {n} clubes y el sitio dice {r["clubes"]}', flush=True)
        del r['url']

    # Paraguaya y Uruguaya: departamento → ciudad → club → región (de la página del club)
    for a, estados in sin_regiones:
        for est, _ in estados:
            t = pedir('/busca_cidade.php', {'cod_estado': est})
            for v, n in re.findall(r"<option value\s*=\s*['\"]?([0-9]+)['\"]?>([^<]*)</option>", t):
                if v == '0':
                    continue
                ciudades[v] = txt(n)
                t2 = pedir('/busca_clube.php', {'cod_cidade': v})
                for cid, tipo, nom in re.findall(r"<option value\s*=\s*['\"]?([0-9]+)['\"]?>([^|<]*)\|([^<]*)</option>", t2):
                    if tipo.strip() != 'DESBRAVADORES' or int(cid) in clubes:
                        continue
                    pagina = pedir(f'/es/{a["id"]}/{cid}/club/')
                    m = re.search(r'Región</strong>\s*<p class="text-muted">([^<]*)</p>', pagina)
                    rn = txt(m.group(1)) if m else 'Sin región'
                    rid = -(zlib.crc32(f'{a["id"]}:{rn}'.encode()) & 0x7FFFFFFF) or -1
                    if not any(x['id'] == rid for x in regiones):
                        regiones.append({'id': rid, 'asoc': a['id'], 'nombre': rn, 'clubes': None, 'miembros': None})
                    clubes[int(cid)] = {'id': int(cid), 'region': rid, 'asoc': a['id'], 'nombre': txt(re.sub(r'\s+-\s+[^-]*$', '', nom))[:80],
                                        'miembros': None, 'ciudad': txt(n)}

    # Ciudad de cada club (una consulta por ciudad)
    hechas = 0
    for v, n in ciudades.items():
        if time.time() - inicio > 5 * 3600:  # margen ante el límite de 6 h de Actions
            print('  tiempo agotado: quedan ciudades sin completar', flush=True)
            break
        t = pedir('/busca_clube.php', {'cod_cidade': v})
        for cid, tipo, _ in re.findall(r"<option value\s*=\s*['\"]?([0-9]+)['\"]?>([^|<]*)\|([^<]*)</option>", t):
            c = clubes.get(int(cid))
            if c and tipo.strip() == 'DESBRAVADORES':
                c['ciudad'] = n[:60]
        hechas += 1
        if hechas % 100 == 0:
            print(f'  ciudades {hechas}/{len(ciudades)}', flush=True)

    for a in asociaciones:
        a.pop('url', None); a.pop('sin_regiones', None)
    datos = {'generado': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'peticiones': peticiones,
             'uniones': uniones, 'asociaciones': asociaciones, 'regiones': regiones,
             'clubes': sorted(clubes.values(), key=lambda c: c['id'])}
    with open(salida, 'w', encoding='utf-8') as f:
        json.dump(datos, f, ensure_ascii=False, separators=(',', ':'))
    con_ciudad = sum(1 for c in clubes.values() if c['ciudad'])
    print(f'Listo: {len(asociaciones)} asociaciones, {len(regiones)} regiones, {len(clubes)} clubes ({con_ciudad} con ciudad), '
          f'{peticiones} peticiones en {int(time.time() - inicio)} s', flush=True)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'directorio_dsa.json')
