#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/.signing"
KEYSTORE="$DIR/fumiga-release.p12"
ALIAS="fumiga-release"

if [[ -e "$KEYSTORE" || -e "$DIR/signing.env" ]]; then
  echo "Já existe uma chave em $DIR; nada foi sobrescrito." >&2
  exit 1
fi
command -v openssl >/dev/null || { echo "Instale o OpenSSL para gerar a chave." >&2; exit 2; }
mkdir -p "$DIR"
chmod 700 "$DIR"
umask 077
TMP="$(mktemp -d "$DIR/.keygen.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
PASSWORD="$(openssl rand -hex 32)"

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "$TMP/private.pem" >/dev/null 2>&1
openssl req -new -x509 -key "$TMP/private.pem" -out "$TMP/certificate.pem" \
  -sha256 -days 36500 -subj "/CN=FUMIGA Colonia Eterna APK Release/"
openssl pkcs12 -export -in "$TMP/certificate.pem" -inkey "$TMP/private.pem" \
  -out "$KEYSTORE" -name "$ALIAS" -passout "pass:$PASSWORD"
chmod 600 "$KEYSTORE"
cat > "$DIR/signing.env" <<EOF
FUMIGA_KEYSTORE="$KEYSTORE"
FUMIGA_KEYSTORE_PASSWORD="$PASSWORD"
FUMIGA_KEY_ALIAS="$ALIAS"
FUMIGA_KEY_PASSWORD="$PASSWORD"
EOF
chmod 600 "$DIR/signing.env"

echo "Chave privada de release criada fora do Git em: $KEYSTORE"
echo "Backup seguro do .p12 e de signing.env: atualizações do APK exigem esta mesma chave."
echo "O arquivo .signing/signing.env é carregado automaticamente por tools/build-android.sh."
