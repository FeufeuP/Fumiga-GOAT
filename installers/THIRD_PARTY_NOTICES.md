# Avisos de componentes de terceiros

O jogo FUMIGA é distribuído sob a licença MIT; consulte `LICENSE` no código-fonte.

## GeckoView / mecanismo Gecko (Android)

O APK Android inclui o GeckoView `153.0.20260810162159`, da Mozilla, para que o jogo não dependa do Android System WebView nem de um navegador instalado. O GeckoView é distribuído sob a Mozilla Public License 2.0 (MPL-2.0); o texto completo está em `licenses/MPL-2.0.txt` dentro do pacote Android e do diretório de jogo do instalador. Código-fonte da revisão incorporada: <https://hg.mozilla.org/releases/mozilla-release/rev/54be19de0e08edff0b797e55fd935dd3978b0a6d>; documentação de integração: <https://firefox-source-docs.mozilla.org/mobile/android/geckoview/>.

O código do FUMIGA não altera o GeckoView. Os arquivos do jogo e o shell Android são um trabalho separado e não mudam a licença do GeckoView.

## Electron / Chromium (Windows)

O instalador Windows inclui Electron e Chromium. Os avisos e licenças dessas dependências são distribuídos junto com os arquivos oficiais do Electron incluídos pelo instalador.
