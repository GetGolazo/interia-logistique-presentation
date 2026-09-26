# ROGER — film d'introduction (15 s)

Film de motion design de 15 secondes présentant ROGER, avec image et son **entièrement générés par code**.
Format : 1920 × 1080, 60 images/s, flou de bouger (obturateur à 180°), son stéréo 48 kHz.

![Planche : une image toutes les 0,5 s](storyboard.jpg)

> L'identité visuelle (couleurs, typographies, logotype « R⊙GER ») et les phrases à l'écran sont des
> **propositions** : la charte de ROGER n'est pas encore validée. Les écrans d'interface sont illustratifs,
> ce ne sont pas des captures de l'application réelle.

## Déroulé (128 BPM, 8 mesures = 15,000 s)

| Temps | Séquence | Ce qu'on voit |
|---|---|---|
| 0,0 – 1,9 s | 01 · Le problème | Une goutte tombe sur sa cible ; « Une fuite. / Une serrure. / Une panne. » (morphing de l'icône) |
| 1,9 – 3,8 s | 02 · Le chaos | Avalanche de notifications (appels, e-mails, messages), « Qui valide ? / Qui intervient ? », tout est aspiré dans une seule réponse : « Bien reçu. » |
| 3,8 – 5,6 s | 03 · La réponse | Explosion bleue, logotype R⊙GER, signature ; plongée dans le « O » |
| 5,6 – 11,3 s | 04 · La méthode | Travelling sur 4 étapes : Signaler · Qualifier · Intervenir · Suivre |
| 11,3 – 13,1 s | 05 · La promesse | « Moins d'appels. Plus de suivi. » : le compteur redescend à 0, l'anneau se remplit |
| 13,1 – 15,0 s | 06 · Roger | L'anneau devient le « O » du logo final ; double bip du point (clin d'œil au « Roger beep » des radios) |

## Fichiers

- `cues.js` : la partition commune (tempo, instants clés), lue à la fois par l'image et par le son.
- `index.html`, `style.css`, `main.js` : l'animation (GSAP en pause + effets procéduraux). `window.seek(t)` rend l'image exacte à l'instant `t`.
- `audio.mjs` : la bande-son synthétisée (batterie, basse, nappes, bruitages d'interface, réverbe, limiteur) → `out/audio.wav`.
- `render.mjs` : rendu image par image dans Chromium, moyenne des sous-images (flou de bouger), encodage H.264 + AAC.
- `roger_intro.mp4` : le film rendu.

## Refaire le rendu

Prérequis : Node 18+, `ffmpeg` avec `libx264` dans le `PATH`.

```bash
npm install
npx playwright install chromium   # si Chromium n'est pas déjà installé
npm run fonts          # Bricolage Grotesque, Inter, JetBrains Mono (Google Fonts, licence OFL)
npm run render         # → out/roger_intro.mp4 (3 à 5 min sur 4 cœurs)
```

Autres commandes :

```bash
node render.mjs stills 2.5 7.4 13.6   # images fixes → out/stills/
npm run audio && npm run preview       # puis ouvrir http://localhost:8080/index.html?play (clic pour lancer)
```

Pour changer un texte, une couleur ou un timing : `main.js` (textes, couleurs en tête de fichier) et `cues.js` (instants).
L'image et le son restent synchronisés tant qu'on modifie les instants dans `cues.js`.
