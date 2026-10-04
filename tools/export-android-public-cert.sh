#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.signing/signing.env"
KEYSTORE="$ROOT/.signing/fumiga-release.p12"
OUT="$ROOT/installers/android/keys/fumiga-release-public.pem"

if [[ ! -f "$ENV_FILE" || ! -f "$KEYSTORE" ]]; then
  echo "Keystore não encontrada; restaure o backup privado antes de exportar o certificado." >&2
  exit 2
fi
# shellcheck disable=SC1091
source "$ENV_FILE"
mkdir -p "$(dirname "$OUT")"
openssl pkcs12 -in "$KEYSTORE" -clcerts -nokeys \
  -passin "pass:$FUMIGA_KEYSTORE_PASSWORD" -out "$OUT"
chmod 644 "$OUT"
if grep -q 'PRIVATE KEY' "$OUT"; then
  rm -f "$OUT"
  echo "Recusa exportar: o arquivo contém material privado." >&2
  exit 1
fi
openssl x509 -in "$OUT" -noout -fingerprint -sha256
echo "Certificado público exportado para $OUT"
