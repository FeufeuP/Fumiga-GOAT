# Brasa e três novos HUDs — 2026-10-09

## Escopo e autorização
Pedido explícito: retirar anéis da brasa, deixar só a chama, criar novos HUDs, salvar no Drive, implementar no jogo e salvar no GitHub. Lote limitado a **4 imagens**, sem alternativas: brasa, botão horizontal, tooltip orgânico e pausa vertical. Não converte o jogo inteiro nem conclui os 32 ícones de F1.

O original em alta da antiga brasa e a correção gerada na tentativa anterior **não estavam mais no ambiente** (`art-source/` ausente). A nova chama é uma **recriação informada**, não recuperação ou edição pixel-idêntica do original. Ela contém apenas chama em camadas de papel terracota/âmbar, sem anéis, disco ou medalhão. Não se afirma que os outros nove candidatos de ícones antigos estejam preservados remotamente.

## Originais e integração
Cada chamada usou o prompt integral `FUMIGA-PAPEL-v3-PASTEL-ORGANICO` + ficha específica + referência binária disponível `game/assets/ui/paper/panel.png`. Fichas sobrescrevem a instrução genérica de alfa: **fundo creme opaco**. Originais intactos em `art-source/f1-publicacao/originais`, externos ao Git e preservados no Drive. Metadados de fontes e derivados: [hud-publicacao.json](hud-publicacao.json).

| Peça | Original | Produção | Consumidor |
|---|---:|---:|---|
| Brasa | 1024×1024 | 128×128 RGB | `i_ember`: mutação Brasa Interior e nó Brasa Contínua |
| Botão | 2064×512 | 960×238 RGB | botões reais de menus/pausa, estados normal/hover/pressionado/selecionado/desabilitado |
| Tooltip | 1456×720 | 960×475 RGB | `ui.tooltip`, descrição de mutação na expedição; não alias do painel |
| Pausa | 928×1152 | 928×1152 RGB | dois painéis de pausa explicitamente `paperKind:"pause"`; seleção de fonte de painéis médios |

`tools/prepare_hud_publication.py`: conversão RGB/redução uniforme Lanczos, sem redesenho ou substituição da arte. Reexecução preserva metadados de backup de fontes inalteradas. `prepare_paper_hud.py` agora se declara histórico e bloqueia sobrescrever essas novas fontes por engano.

Renderer: cantos de botão/pausa em escala uniforme limitada, apenas corredores centrais calmos extensíveis, sem repetir grupos de folhas nessas duas novas peças. Fontes antigas restantes usam grade5×5 e faixas repetíveis — ainda podem apresentar repetição visível. Caches limitados160 entradas/8Mi pixels. Tinta castanha local ao contexto/superfície/frame, sem recoloração global do mundo. Os cinco estados usam tratamentos de luz/profundidade, não cinco pinturas novas. Áreas de texto reservadas, estatísticas da pausa com margem30px e tooltip com quebra de linha real. **Kiwi Soda, gameplay, progresso, preço, seed, hitboxes, atalhos/gestos e filtros globais preservados.** Algumas molduras antigas/ornamentos continuam próximos do texto; não declarar fidelidade de todo F1 resolvida. A interface fora das superfícies claras e o cenário ainda contêm arte/paleta legadas.

## Backup remoto
Pasta [imagens do Drive](https://drive.google.com/drive/folders/1IMj_-7VQf_asmRmMoMSzKxIQ37M6DXlW). Quatro uploads individuais concluídos e reconsultados por ID: tamanho, SHA-256 e parent correspondem aos originais locais. URLs:
- [Brasa](https://drive.google.com/file/d/1PyhCP8ZgR44euAZKn0vinuxcdCC1vyQT/view)
- [Botão](https://drive.google.com/file/d/1V1vt_NA1SYtXMIoAH-YfFMXWgQgMH5Hk/view)
- [Tooltip](https://drive.google.com/file/d/1ovKDKVrN0NLnAOrBS6sZzgvPFT8XEk57/view)
- [Pausa](https://drive.google.com/file/d/1LCxyCfeDGuGDt-M4kCGR3RD_tcB5wqGK/view)

Arquivo complementar do lote: originais, todos os PNGs de produção do HUD/brasa, galeria, prévias, capturas e manifestos; [ZIP verificado](https://drive.google.com/file/d/18TJQjBVRqwtEAw_nhCaGk1oj7NEn-cB6/view),59.882.132bytes, SHA256`df51212ac80fd7871655e43728301125cd938d77b2dbb02ef404d6c30522b058`; metadados em `hud-publicacao.json.archive`. Não confundir histórico antigo de upload com essa nova preservação.

## Verificações
- `npm test -- -j4`: **36/36 verde,69,6s** antes de adicionar o fluxo dedicado; **suíte final37/37verde81,1s** após adicionar o fluxo dedicado e regenerar a lista offline.
- `paper-hud-browser`: estados pixel-distintos, alfa255, fonte tooltip própria, cobertura de moldura alta, tinta local/reset/mundo.
- `hud-publication`: SHA dos quatro derivados, PNG RGB e caminhos reais do manifesto; hashes remotos registrados não são reconsultados pelo teste offline.
- `hud-publication-browser`: Brasa Interior real no run, descrição/tooltip e CONTINUAR por clique/toque PC/mobile. Capturas abertas.
- `inspect`: **30 cenas PC/mobile**, seis mapas, sem JS/404/glifos; FPS headless PC49,6–59 e mobile57,5–60, diagnóstico não hardware físico.
- Layout **118 estados PC/mobile normal/grande limpos,340s**, além de18focados55s. Gravador geométrico não certifica distância de ornamentos no PNG.
- Navegação PC/mobile, seis biomas/H/vida baixa/zoom/acessibilidade, PWA/restart offline/update com falha/reload controlado: passaram.
- Preload TITLE passou PC/mobile após corrigir **assert antigo14 →12 camadas** no replay: runtime/config e assert inicial já tinham4+4+4; nenhuma camada alterada. Comentário antigo10 corrigido12.
- Falhas intermediárias: teste novo importava MANIFEST privado (corrigido para ler caminho real); listaPWA desatualizada após última edição (regenerada); `uitest` teve flutuação na observação de saída do ninho, repetição isolada passou sem mudar runtime ou relaxar assert. Não são ocultadas.
- Docs/handoff/diff: verificar novamente antes da publicação. Novas imagens de runtime entram no offline; ASSET_V `20261009-hud-brasa-publicacao`,242arquivos30,8MB, espelhos nativos sincronizados. **Nenhum novo APK/EXE compilado.**

## Conferência
| # | Item pedido | Status | Onde foi implementado |
|---|---|---|---|
|1|Brasa sem anéis, só chama|Integrada; recriação informada|`game/assets/sprites/icons/ember.png`|
|2|Novos HUDs|3 gerados e integrados|`game/assets/ui/paper/{button,tooltip,pause}.png`|
|3|Salvar Drive|Originais verificados; arquivo complementar no manifesto|Pasta e URLs acima|
|4|Implementar imagens no jogo|Feito, motor compartilhado PC/mobile|`assets.js`, `paper_hud.js`, `ui.js`, `game.js`, CSS mobile|
|5|Salvar GitHub|✅ [PR65 criado e mesclado](https://github.com/FeufeuP/Fumiga-GOAT/pull/65), checks headless e PC/mobile verdes|`main`, merge commit `08e9ebd07d112976fbedf362b25e441b13f0d838`; branch da sessão preservada|

Aceite visual do usuário não inferido da integração. Próximos: revisão dos novos componentes/escala,31ícones antigos por rodadas≤10, fontes restantes e leitura integral do MEGA (ainda não comprovada). F0/Pálida/mapa7 continuam fora do escopo.
