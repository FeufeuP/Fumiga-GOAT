// Sanidade estrutural dos dois shells nativos e verificação de que ambos recebem
// todos os arquivos registrados para o jogo completo.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildList } from "../../tools/make_assets_list.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const list = buildList();
const expected = list.grupos.flatMap(group => group.files);

assert.deepEqual(list.grupos.map(group => group.id), ["shell", "assets"], "a fonte web tem um pacote único completo");
const sync = spawnSync(process.execPath, ["tools/sync-native-assets.mjs"], { cwd: ROOT, encoding: "utf8" });
assert.equal(sync.status, 0, "sincronizador nativo roda: " + sync.stderr);

for (const destination of [
  "installers/android/app/src/main/assets/www",
  "installers/windows/web",
]) {
  const missing = expected.filter(rel => !fs.existsSync(path.join(ROOT, destination, rel)));
  assert.deepEqual(missing, [], destination + " inclui todos os " + expected.length + " arquivos do pacote");
  assert.ok(fs.existsSync(path.join(ROOT, destination, "THIRD_PARTY_NOTICES.md")), destination + " inclui avisos de terceiros");
  assert.ok(fs.existsSync(path.join(ROOT, destination, "licenses/MIT-FUMIGA.txt")), destination + " inclui a licença do jogo");
  assert.ok(fs.existsSync(path.join(ROOT, destination, "licenses/MPL-2.0.txt")), destination + " inclui a licença GeckoView");
}

const manifest = read("installers/android/app/src/main/AndroidManifest.xml");
assert.match(manifest, /uses-permission android:name="android.permission.INTERNET"/, "o shell pode abrir o socket local necessário ao GeckoView");
assert.match(manifest, /networkSecurityConfig="@xml\/network_security_config"/);
assert.match(manifest, /screenOrientation="landscape"/, "APK inicia em orientação horizontal");
const networkPolicy = read("installers/android/app/src/main/res/xml/network_security_config.xml");
assert.match(networkPolicy, /base-config cleartextTrafficPermitted="false"/);
assert.match(networkPolicy, /<domain[^>]*>localhost<\/domain>/, "HTTP claro só é permitido para localhost em Android 8+");
const android = read("installers/android/app/src/main/java/com/feufeup/fumigagoat/MainActivity.java");
assert.match(android, /GeckoView/, "APK incorpora o motor Gecko, sem depender do System WebView");
assert.match(android, /ASSET_PREFIX = "\/assets\/www\/"/);
assert.match(android, /game\/mobile\/index\.html/, "APK abre a versão mobile empacotada");
assert.match(android, /LOCAL_PORT = 43177/, "origem local estável preserva localStorage entre aberturas");
assert.match(android, /InetAddress\.getByName\("127\.0\.0\.1"\)/, "servidor de assets escuta só no loopback");
assert.match(android, /connect-src 'self'/, "CSP bloqueia conexões do jogo a outros hosts");
assert.match(android, /AllowOrDeny\.DENY/, "navegações para fora do app local são bloqueadas");
assert.doesNotMatch(android, /android\.webkit|WebViewAssetLoader/, "o shell não usa Android System WebView");
const androidBuild = read("installers/android/app/build.gradle.kts");
assert.match(androidBuild, /minSdk = 26/, "GeckoView atual exige Android 8+");
assert.match(androidBuild, /compileSdk = 36/);
assert.match(androidBuild, /geckoview:153\.0\.20260810162159/);
assert.match(androidBuild, /exclude\(group = "com\.google\.android\.gms", module = "play-services-fido"\)/, "APK não inclui Play Services apenas para WebAuthn não usado pelo jogo");
assert.match(androidBuild, /arm64-v8a/);
assert.match(androidBuild, /armeabi-v7a/);
assert.match(androidBuild, /storeType = "PKCS12"/);
const buildScript = read("tools/build-android.sh");
assert.match(buildScript, /assembleRelease/);
assert.match(buildScript, /assembleDebug/);
assert.match(buildScript, /FUMIGA-Android-DEBUG\.apk/, "APK de pré-validação tem nome distinto do binário release");
assert.ok(fs.existsSync(path.join(ROOT, "installers/android/app/src/main/assets/licenses/MPL-2.0.txt")), "APK inclui a licença MPL-2.0 do GeckoView");
const publicCert = read("installers/android/keys/fumiga-release-public.pem");
assert.match(publicCert, /BEGIN CERTIFICATE/);
assert.doesNotMatch(publicCert, /PRIVATE KEY/, "o arquivo versionado da chave contém só o certificado público");
assert.ok(!fs.existsSync(path.join(ROOT, "installers/android/keys/fumiga-release.p12")), "keystore privado não deve ir para a pasta pública");

const desktop = read("installers/windows/main.cjs");
assert.match(desktop, /registerSchemesAsPrivileged/);
assert.match(desktop, /const SCHEME = 'fumiga'[\s\S]*const HOST = 'app'[\s\S]*const START_URL = `\$\{SCHEME\}:\/\/\$\{HOST\}\/game\/index\.html`;/);
assert.match(desktop, /onBeforeRequest[\s\S]*cancel: true/, "Electron bloqueia a rede externa");
assert.match(desktop, /contextIsolation: true[\s\S]*nodeIntegration: false[\s\S]*sandbox: true/);
const windows = JSON.parse(read("installers/windows/package.json"));
assert.ok(windows.devDependencies.electron, "Electron runtime é dependência do instalador");
assert.ok(windows.devDependencies["electron-builder"], "builder está fixado no lockfile");
assert.equal(windows.build.win.target[0].target, "nsis");
assert.deepEqual(windows.build.win.target[0].arch, ["x64"]);
assert.equal(windows.build.win.artifactName, "FUMIGA-Setup-Windows-x64.${ext}");
assert.ok(fs.existsSync(path.join(ROOT, "installers/windows/package-lock.json")), "lockfile da build Windows existe");

const workflow = read(".github/workflows/pacotes-nativos.yml");
for (const marker of ["release:", "published", "workflow_dispatch:", "arena/01a0fc42-fumiga-goat", "if: github.event_name == 'release'", "FUMIGA_KEYSTORE_BASE64", "FUMIGA-Android.apk", "FUMIGA-Setup-Windows-x64.exe", "SHA256SUMS.txt"]) {
  assert.ok(workflow.includes(marker), "workflow de Release inclui " + marker);
}
assert.match(workflow, /android:\n\s+if: github\.event_name != 'push'/, "APK release não depende de segredo no build de push");
assert.equal((workflow.match(/android-actions\/setup-android@v4\.0\.4/g) || []).length, 2, "ambos os jobs Android usam setup-android corrigido");
assert.match(workflow, /android-prevalidacao:\n\s+if: github\.event_name == 'push'[\s\S]*bash tools\/build-android\.sh debug[\s\S]*apk-android-prevalidacao-debug/, "push gera apenas artefato Android debug temporário");
console.log("NATIVE PACKAGES OK — APK com GeckoView ARM64/ARMv7 e instalador Windows x64 recebem o jogo completo; rede externa não é necessária.");
