#!/usr/bin/env python3
# Télécharge les polices des trois pistes (Google Fonts, licences OFL/Apache) → frames/fonts/*.woff2 + frames/fonts/fonts.css
import os, re, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'fonts')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
FAMILIES = [
    # Piste 1 — Plan d'exécution
    'Barlow+Condensed:wght@400;500;600;700;800',
    'Barlow:wght@400;500;600;700',
    'IBM+Plex+Mono:wght@400;500;600',
    # Piste 2 — Établi
    'Big+Shoulders+Display:wght@500..900',
    'Big+Shoulders+Stencil+Display:wght@700..900',
    'Permanent+Marker',
    'DM+Mono:wght@400;500',
    # Page de la feuille de route
    'Archivo:wdth,wght@62..125,400..800',
    'Public+Sans:wght@400..700',
    # Piste 3 — Maquette
    'Instrument+Sans:wdth,wght@75..100,400..700',
    'Martian+Mono:wdth,wght@75..112.5,300..700',
]
os.makedirs(OUT, exist_ok=True)
css_out = []
for fam in FAMILIES:
    url = f'https://fonts.googleapis.com/css2?family={fam}&display=block'
    try:
        css = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA})).read().decode()
    except Exception as e:
        print('ÉCHEC', fam, e); continue
    n = 0
    for sub, block in re.findall(r'/\* ([\w-]+) \*/\s*(@font-face \{.*?\})', css, re.S):
        if sub not in ('latin', 'latin-ext'): continue
        src = re.search(r'url\((https://[^)]+)\)', block).group(1)
        name = re.search(r"font-family: '([^']+)'", block).group(1)
        w = re.search(r'font-weight: ([\d ]+);', block).group(1).replace(' ', '-')
        fn = f"{name.replace(' ', '')}-{w}-{sub}.woff2"
        path = os.path.join(OUT, fn)
        if not os.path.exists(path):
            urllib.request.urlretrieve(src, path)
        css_out.append(block.replace(src, fn))
        n += 1
    print(fam.split(':')[0].replace('+', ' '), '→', n, 'fichiers')
open(os.path.join(OUT, 'fonts.css'), 'w').write('\n'.join(css_out) + '\n')
