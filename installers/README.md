# Instaladores nativos do FUMIGA

Os instaladores são offline e completos: incluem os 231 arquivos registrados em
`app/assets.json` (cerca de 55,8 MiB antes da compactação) e o runtime do próprio shell.
Os binários gerados não são versionados no Git.

## Android — APK de sideload

O APK contém o jogo completo e incorpora o mecanismo **Mozilla GeckoView**; não depende do
Android System WebView, Chrome, Play Store, Play Services nem de navegador externo. O APK único
inclui as bibliotecas ARM64 e ARMv7 para celulares Android de 32 e 64 bits, a partir do Android 8
(API 26). A versão estável fixada é `153.0.20260810162159`: versões 154+ já puxam AndroidX que
exige compileSdk 37, ainda em preview no toolchain deste build. Os AARs da versão fixada têm
85,8 MB (ARM64), 83,2 MB (ARMv7) e 229,5 MB (todas as arquiteturas); o APK final inclui as duas
ABIs ARM e será medido no primeiro build CI.

Para que `localStorage` (save do jogador) permaneça estável entre aberturas, o app serve os assets
empacotados por um servidor HTTP somente leitura ligado exclusivamente a `127.0.0.1` numa porta
fixa. A permissão Android `INTERNET` é necessária para esse socket local; não significa que seja
preciso estar conectado, e o jogo não acessa servidores externos. A política do GeckoView bloqueia
navegações para fora do endereço local e a CSP permite recursos/conexões somente da própria origem.
O `network_security_config.xml` nega HTTP claro fora de `localhost`, além do bind explícito no
loopback e das políticas do GeckoView.
Após transferir e instalar o APK, o jogo funciona offline.

Uma chave PKCS#12 de release é criada uma única vez e mantida fora do APK e do Git público:

```bash
bash tools/create-android-signing-key.sh
npm run package:android
```

O primeiro comando cria `.signing/fumiga-release.p12` e `.signing/signing.env`. **Faça uma cópia
de segurança privada desses dois arquivos** em um password manager/cofre offline: todas as
atualizações futuras do APK têm de usar a mesma chave para instalar por cima da versão anterior.
Nunca publique nem commite a chave privada. O build requer JDK 17, Android SDK Platform 36 e
Build Tools 35.0.0; o Gradle Wrapper está incluído. O certificado público pode ser atualizado com
`bash tools/export-android-public-cert.sh`.

Ao assinar, o APK já incorpora a **assinatura criptográfica e o certificado público**; embutir a
chave privada no APK permitiria extraí-la e assinar atualizações falsas. O certificado público,
que não permite assinar, fica em `installers/android/keys/fumiga-release-public.pem`.

O workflow de Release lê a chave privada dos Actions secrets do repositório:
`FUMIGA_KEYSTORE_BASE64`, `FUMIGA_KEYSTORE_PASSWORD`, `FUMIGA_KEY_ALIAS` e
`FUMIGA_KEY_PASSWORD`. Configure-os com `bash tools/configure-github-android-secrets.sh` (requer
`gh` autenticado com escrita de Actions secrets) ou em GitHub Settings → Secrets and variables →
Actions. O arquivo `.p12` é convertido de Base64 para `$RUNNER_TEMP` durante o job e nunca é
anexado à Release. A conexão atual do Arena pode não conceder a permissão de escrita; nesse caso,
o painel GitHub ou uma conexão com a permissão apropriada é necessário.

## Windows 64-bit — instalador `.exe`

`installers/windows/` usa Electron e NSIS. O instalador leva o runtime Chromium/Electron e a
pasta de jogo inteira; não exige Chrome, rede ou instalação manual de runtime. O protocolo
`fumiga://` serve apenas arquivos empacotados e as requisições HTTP(S)/WebSocket externas são
bloqueadas.

Em uma máquina Windows x64 com Node 22:

```powershell
npm ci --prefix installers/windows
npm --prefix installers/windows run dist:win
```

O arquivo fica em `installers/windows/dist/FUMIGA-Setup-Windows-x64.exe`. Ele não tem
assinatura Authenticode comercial e pode exibir o aviso de reputação do SmartScreen.

## GitHub Release

Ao fazer push na branch Arena, o workflow `.github/workflows/pacotes-nativos.yml` compila o APK
**debug** completo e o instalador Windows x64 como artifacts temporários do Actions; o APK debug
serve apenas para validar o empacotamento e **não deve ser distribuído como versão final**. O push
não precisa expor a chave privada. O acionamento manual (`workflow_dispatch`) e o evento de Release
compilam o APK **release assinado** e, por isso, requerem os quatro Actions secrets configurados.
Os artifacts manuais continuam temporários. Só o evento de Release publicada executa o job final,
que anexa APK assinado, EXE e `SHA256SUMS.txt`; nenhuma Release recebe APK sem assinatura. Atualize
`versionCode`/`versionName` em
`installers/android/app/build.gradle.kts` e as versões Electron em
`installers/windows/package.json` antes de uma próxima distribuição.

## Assets e validação

`node tools/sync-native-assets.mjs` prepara os dois diretórios de runtime ignorados pelo Git a
partir da fonte oficial (`game/`, `app/` e a página raiz). O script confirma no build que nenhum
shell recebe um subconjunto de assets. Para o download offline pelo navegador/PWA existe somente
o pacote completo; sua cobertura e seu tamanho são conferidos por `npm test` e
`npm run inspect:pwa`.
