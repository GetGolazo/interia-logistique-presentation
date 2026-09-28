#!/usr/bin/env python3
# Télécharge les polices du film (Google Fonts, licence SIL OFL) dans ./fonts, sous les noms attendus par style.css.
import os, re, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'fonts')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
FAMILIES = ['Barlow+Condensed:wght@500;600;700;800', 'Barlow:wght@400;500;600', 'IBM+Plex+Mono:wght@400;500;600']
os.makedirs(OUT, exist_ok=True)
for fam in FAMILIES:
    css = urllib.request.urlopen(urllib.request.Request(f'https://fonts.googleapis.com/css2?family={fam}&display=block', headers={'User-Agent': UA})).read().decode()
    for sub, block in re.findall(r'/\* ([\w-]+) \*/\s*(@font-face \{.*?\})', css, re.S):
        if sub not in ('latin', 'latin-ext'):
            continue
        name = re.search(r"font-family: '([^']+)'", block).group(1).replace(' ', '')
        weight = re.search(r'font-weight: (\d+);', block).group(1)
        src = re.search(r'url\((https://[^)]+)\)', block).group(1)
        path = os.path.join(OUT, f'{name}-{weight}-{sub}.woff2')
        urllib.request.urlretrieve(src, path)
        print(os.path.relpath(path, HERE))
