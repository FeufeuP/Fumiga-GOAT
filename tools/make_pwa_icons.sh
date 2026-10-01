#!/usr/bin/env bash
# ============================================================================
# FUMIGA — pipeline de ícones do app instalável (PWA)
#
# Reproduz todo o conjunto de ícones a partir do original aprovado:
#   art-source/pwa/icone_palida.png   (1024×1024, FORA do Git — Regra 13)
#        ->  app/icons/*.png      (o que o jogo/publicação carrega)
#
# Uso:  bash tools/make_pwa_icons.sh
#
# Por que cada variação existe:
#   icon-192 / icon-512   "any"       — ícone normal do manifest (Android, desktop)
#   icon-512-maskable                 — Android pode recortar em círculo/squircle:
#                                       a arte vai reduzida para caber na zona
#                                       segura central de 80% (nada é cortado)
#   apple-touch-icon-180              — iOS ignora o manifest para o ícone da
#                                       tela de início; precisa do <link>, sem alfa
#   favicon-32 / favicon-16           — aba do navegador e atalhos pequenos
#
# Regra 13: o original fica em art-source/ (fora do Git) e no espelho
# ~/art-source-backup/pwa/. Só o resultado otimizado entra no repositório.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO/art-source/pwa/icone_palida.png"
OUT="$REPO/app/icons"
FUNDO="#0A0812"

if [ ! -f "$SRC" ]; then
  echo "ERRO: original não encontrado em $SRC" >&2
  echo "      (art-source/ é fora do Git por decisão do projeto — Regra 13)" >&2
  exit 1
fi

mkdir -p "$OUT"

# "any": enquadramento levemente mais fechado (corta a margem morta do original)
convert "$SRC" -gravity center -crop 92%x92%+0+0 +repage -filter Lanczos \
  -resize 512x512 -strip -define png:compression-level=9 "$OUT/icon-512.png"
convert "$OUT/icon-512.png" -resize 192x192 -strip "$OUT/icon-192.png"

# maskable: arte ocupando 70% do quadrado, fundo sólido — sobrevive ao recorte
convert "$SRC" -gravity center -crop 92%x92%+0+0 +repage -filter Lanczos \
  -resize 358x358 -background "$FUNDO" -gravity center -extent 512x512 \
  -strip -define png:compression-level=9 "$OUT/icon-512-maskable.png"

# iOS: sem transparência (o fundo já é opaco) e no tamanho pedido pela Apple
convert "$SRC" -background "$FUNDO" -alpha remove -alpha off -filter Lanczos \
  -resize 180x180 -strip "$OUT/apple-touch-icon-180.png"

# favicons minúsculos: ponto = mantém o pixel art nítido, sem borrar as bordas
convert "$SRC" -gravity center -crop 92%x92%+0+0 +repage -filter point \
  -resize 32x32 -strip "$OUT/favicon-32.png"
convert "$OUT/favicon-32.png" -filter point -resize 16x16 -strip "$OUT/favicon-16.png"

echo "ícones gerados em $OUT:"
ls -l "$OUT" | awk 'NR>1 {printf "  %-28s %6d bytes\n", $9, $5}'
