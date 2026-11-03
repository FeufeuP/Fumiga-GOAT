#!/usr/bin/env bash
# ============================================================================
# FUMIGA — prepara o ambiente do PIPELINE DE PIXELIZAÇÃO (F0b-2)
#
# O tools/pixelize.py roda fora do runtime do jogo (Regra 5: nada de
# pós-processar pixel a pixel em tempo de jogo) e precisa do Pillow. O Python
# do sistema costuma ser gerenciado pelo SO (PEP 668), então o Pillow entra
# numa venv própria em ~/.cache/fumiga-pixel — a mesma ideia do
# tools/setup-dev.sh, que põe o Chromium fora do snapshot.
#
#   bash tools/setup-pixel.sh        (ou: npm run setup:pixel)
#
# Nada disso é salvo entre sessões do sandbox (~/.cache fica fora do
# snapshot): rode de novo no começo de cada sessão em que for pixelizar (~5 s).
# ============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/fumiga-pixel"
VENV="$CACHE/venv"
cd "$ROOT"

echo "▸ python3 $(python3 -V 2>&1 | cut -d' ' -f2)"

if [ ! -x "$VENV/bin/python" ]; then
  echo "▸ criando venv em $VENV…"
  python3 -m venv "$VENV"
fi

echo "▸ instalando Pillow…"
"$VENV/bin/pip" install --quiet --disable-pip-version-check Pillow

echo "▸ conferindo…"
"$VENV/bin/python" -c "import PIL; print('  Pillow', PIL.__version__)"

# Um atalho estável para o agente e para o usuário não precisarem lembrar o
# caminho da venv. É um SCRIPT, não um link simbólico: o Python resolve o
# sys.prefix pelo caminho real do executável, então um link para dentro da
# venv apontaria para o interpretador do sistema e o Pillow desapareceria.
cat > "$ROOT/tools/python-pixel" <<'FIM'
#!/usr/bin/env bash
# GERADO por tools/setup-pixel.sh — não editar, não versionar.
# Interpretador com Pillow para o pipeline de pixelização (F0b-2).
VENV="${XDG_CACHE_HOME:-$HOME/.cache}/fumiga-pixel/venv"
if [ ! -x "$VENV/bin/python" ]; then
  echo "ambiente do pipeline não preparado: rode bash tools/setup-pixel.sh" >&2
  exit 1
fi
exec "$VENV/bin/python" "$@"
FIM
chmod +x "$ROOT/tools/python-pixel"

echo "✓ pipeline pronto:"
echo "    npm run pixelize        (ou: tools/python-pixel tools/pixelize.py --tudo)"
