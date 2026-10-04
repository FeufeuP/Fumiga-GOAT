#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$ROOT/installers/android"
MODE="${1:-release}"

if [[ "$MODE" != "release" && "$MODE" != "debug" ]]; then
  echo "Uso: bash tools/build-android.sh [release|debug]" >&2
  exit 2
fi

# Release builds must use the stable private signing key. Debug builds use
# Gradle's temporary debug key and are only for CI prevalidation artifacts.
if [[ "$MODE" == "release" ]]; then
  if [[ -z "${FUMIGA_KEYSTORE:-}" && -f "$ROOT/.signing/signing.env" ]]; then
    # shellcheck disable=SC1091
    source "$ROOT/.signing/signing.env"
  fi

  for key in FUMIGA_KEYSTORE FUMIGA_KEYSTORE_PASSWORD FUMIGA_KEY_ALIAS FUMIGA_KEY_PASSWORD; do
    if [[ -z "${!key:-}" ]]; then
      echo "Falta $key. Gere a chave uma vez com: bash tools/create-android-signing-key.sh" >&2
      exit 2
    fi
  done
  if [[ ! -f "$FUMIGA_KEYSTORE" ]]; then
    echo "Keystore não encontrado: $FUMIGA_KEYSTORE" >&2
    exit 2
  fi
fi

node "$ROOT/tools/sync-native-assets.mjs"
cd "$PROJECT"
if [[ "$MODE" == "release" ]]; then
  TASK=":app:assembleRelease"
  APK="$PROJECT/app/build/outputs/apk/release/app-release.apk"
  OUTPUT="FUMIGA-Android.apk"
else
  TASK=":app:assembleDebug"
  APK="$PROJECT/app/build/outputs/apk/debug/app-debug.apk"
  OUTPUT="FUMIGA-Android-DEBUG.apk"
fi
./gradlew --no-daemon "$TASK"
if [[ ! -f "$APK" ]]; then
  echo "Build não produziu o APK esperado: $APK" >&2
  exit 1
fi

# Fail closed if the APK falls back to the device's System WebView or drops
# either supported ARM copy of the embedded Gecko engine.
APK_ENTRIES="$(unzip -Z -1 "$APK")"
for abi in arm64-v8a armeabi-v7a; do
  if ! grep -Fqx "lib/$abi/libxul.so" <<<"$APK_ENTRIES"; then
    echo "O APK não contém o GeckoView para $abi." >&2
    exit 1
  fi
done
for abi in x86 x86_64; do
  if grep -Fqx "lib/$abi/libxul.so" <<<"$APK_ENTRIES"; then
    echo "O APK inclui a arquitetura de emulador $abi; revise os filtros de ABI." >&2
    exit 1
  fi
done
if ! grep -Fqx "assets/www/game/mobile/index.html" <<<"$APK_ENTRIES"; then
  echo "O APK não contém a versão mobile completa do jogo." >&2
  exit 1
fi

mkdir -p "$PROJECT/dist"
cp "$APK" "$PROJECT/dist/$OUTPUT"
echo "APK $MODE pronto: $PROJECT/dist/$OUTPUT ($(du -h "$PROJECT/dist/$OUTPUT" | cut -f1)); GeckoView ARM64 + ARMv7 + assets locais incluídos."
