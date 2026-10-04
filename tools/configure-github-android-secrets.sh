#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.signing/signing.env"
KEYSTORE="$ROOT/.signing/fumiga-release.p12"
REPO="FeufeuP/Fumiga-GOAT"

if [[ ! -f "$ENV_FILE" || ! -f "$KEYSTORE" ]]; then
  echo "Keystore local não encontrada. Restaure .signing/fumiga-release.p12 e signing.env do backup privado." >&2
  exit 2
fi
command -v gh >/dev/null || { echo "Instale e autentique gh com permissão de Actions secrets." >&2; exit 2; }
# shellcheck disable=SC1091
source "$ENV_FILE"
KEYSTORE_B64="$(base64 -w0 "$KEYSTORE")"
printf '%s' "$KEYSTORE_B64" | gh secret set FUMIGA_KEYSTORE_BASE64 --repo "$REPO"
printf '%s' "$FUMIGA_KEYSTORE_PASSWORD" | gh secret set FUMIGA_KEYSTORE_PASSWORD --repo "$REPO"
printf '%s' "$FUMIGA_KEY_ALIAS" | gh secret set FUMIGA_KEY_ALIAS --repo "$REPO"
printf '%s' "$FUMIGA_KEY_PASSWORD" | gh secret set FUMIGA_KEY_PASSWORD --repo "$REPO"
echo "Actions secrets configurados para $REPO (valores não exibidos)."
