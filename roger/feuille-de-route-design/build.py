#!/usr/bin/env python3
# Assemble la feuille de route en un seul fichier HTML autonome (polices et images intégrées).
#   python3 build.py  →  feuille-de-route-design.html
import base64, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, 'frames', 'fonts')
KEEP = {  # famille → graisses intégrées (sous-ensemble latin, suffisant pour le français)
    'Archivo': None, 'Public Sans': None, 'IBM Plex Mono': {'400', '500', '600'},
    'Barlow Condensed': {'700'}, 'Barlow': {'500'}, 'Big Shoulders Display': None,
    'Big Shoulders Stencil Display': None, 'DM Mono': {'500'}, 'Permanent Marker': None,
    'Instrument Sans': None, 'Martian Mono': None,
}

def b64(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode()

css = open(os.path.join(FONTS, 'fonts.css')).read()
faces = []
for block in re.findall(r'@font-face \{.*?\}', css, re.S):
    fam = re.search(r"font-family: '([^']+)'", block).group(1)
    weight = re.search(r'font-weight: ([\d ]+);', block).group(1)
    src = re.search(r'url\(([^)]+)\)', block).group(1)
    if fam not in KEEP or not src.endswith('-latin.woff2'):
        continue
    if KEEP[fam] is not None and weight not in KEEP[fam]:
        continue
    block = re.sub(r'\s*unicode-range:[^;]+;', '', block)
    block = block.replace('font-display: block', 'font-display: swap')
    faces.append(block.replace(f'url({src})', f"url(data:font/woff2;base64,{b64(os.path.join(FONTS, src))})"))

page = open(os.path.join(HERE, 'page.html')).read()
page = page.replace('<!--FONTS-->', '<style>\n' + '\n'.join(faces) + '\n</style>')
page = re.sub(r'src="images/([\w-]+\.jpg)"', lambda m: f'src="data:image/jpeg;base64,{b64(os.path.join(HERE, "images", m.group(1)))}"', page)

head, body = page.split('<main', 1)
doc = ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
       + head + '</head>\n<body>\n<main' + body + '</body>\n</html>\n')
out = os.path.join(HERE, 'feuille-de-route-design.html')
open(out, 'w').write(doc)
print(out, f'{os.path.getsize(out) / 1e6:.2f} Mo', f'{len(faces)} polices')
