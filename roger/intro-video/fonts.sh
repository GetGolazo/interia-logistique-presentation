#!/usr/bin/env bash
# Télécharge les polices variables utilisées par le film (Google Fonts, licence SIL OFL) dans ./fonts
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
get() {
  url=$(curl -sS -A "$UA" "https://fonts.googleapis.com/css2?family=$1&display=swap" \
    | awk '/\/\* latin \*\//{f=1} f && /src: url/{match($0,/https:[^)]+/); print substr($0,RSTART,RLENGTH); exit}')
  curl -sS -o "fonts/$2" "$url"
  echo "fonts/$2"
}
get "Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800" bricolage.woff2
get "Inter:opsz,wght@14..32,100..900" inter.woff2
get "JetBrains+Mono:wght@100..800" jetbrains.woff2
