# AGENTS.md — mapa rápido para quem desenvolve o FUMIGA

Leia isto **antes** de mexer no código. É o resumo operacional; as regras obrigatórias
continuam em [`REGRAS_DE_TRABALHO.md`](REGRAS_DE_TRABALHO.md) (fluxo: pesquisar →
perguntar → implementar → mostrar arte → mobile → check-in → jogar → preview → salvar).
Lore e planejamento: [`LORE.md`](LORE.md) e [`MEGA_ARQUIVO.md`](MEGA_ARQUIVO.md). **Não leia
o MEGA_ARQUIVO inteiro** (120 KB); abra só a seção que interessa.

**Flores dos Santuários:** antes de criar flores de um santuário novo, leia
[`DOCUMENTO_FLORES_DOS_SANTUARIOS.md`](DOCUMENTO_FLORES_DOS_SANTUARIOS.md): **3 variações × 4
sprites**, feitas **uma por vez, com a confirmação do usuário entre cada variação**.

**Regra 12:** a cada implementação ou atualização, atualizar também `MEGA_ARQUIVO.md`
na mesma entrega: mudanças, decisões, testes/resultados, limitações e próximos passos.
Preservar o histórico; sincronizar blocos e hashes dos originais editados.

## 1. Começo de sessão (sempre)

```bash
bash tools/setup-dev.sh     # ~10 s: Playwright + Chromium headless (não persiste entre sessões)
npm run test:quick          # ~10 s: confirma que a base está verde
```

| Comando | Para quê | Tempo |
|---|---|---|
| `npm run test:quick` | enquanto implementa (sem uitest/endless/mobile) | ~10 s |
| `npm test` | bateria completa em paralelo (a mesma do CI) — inclui `regressions`, `pwa-worker`, `native-packages`, `playtest` e `regressions-browser` | ~55 s |
| `node game/test/run-all.mjs --only=sim,tree` | só alguns testes | — |
| `npm run inspect` | **joga no navegador**: PC + mobile, todas as telas, 6 mapas; erros JS, 404, glifos “?”, FPS | ~100 s |
| `node game/test/inspect.mjs --pc --telas=TREE,RUN-MAPA3` | inspeção focada | ~10 s |
| `npm run inspect:tree` | 548 detalhes PC/mobile + arte cinza/cor, 7 galhos, compras, saves, arrasto/pinça e Renascimento | ~3 min |
| `npm run inspect:ui` | cliques/toques reais: páginas de Memórias/Profecias, replay, ninho, pausa e invocar | ~15 s |
| `npm run inspect:hud` | HUD orgânico nos 6 biomas, tecla H, acessibilidade | ~40 s |
| `npm run inspect:layout` | **auditoria de layout**: todas as telas PC + mobile, com e sem FONTE GRANDE — texto fora da tela, colidindo, vazando da caixa, botões sobrepostos, toque cobrindo o canvas | ~4 min |
| `npm run inspect:pwa` | **app instalável**: pacote único completo (233 arquivos), **reinício do worker com a rede desligada**, update que falha de propósito (a cópia anterior tem que sobreviver), timeout e boot offline em PC + mobile; passo 6: atualização real (versão velha → nova) exige **uma** recarga automática do jogo, nunca com expedição em andamento | ~25 s |
| `npm run inspect:preload` | **pré-carregamento do TITLE** (Regra 14): boot leve, tudo pronto parado no TITLE, árvore → 7 santuários → replay → profecias sem tela de carregamento, clique cedo com CPU 4× mais lenta, sem rede, pixels idênticos | ~45 s |
| `node game/test/native-packages.mjs` | Android GeckoView embutido + loopback/CSP + Electron/NSIS x64: sem rede externa no runtime e cobertura integral dos assets | ~1 s |
| `npm run playtest` | lê os JSONs de teste de campo (pasta `playtest/` ou caminhos) e gera o relatório de balanceamento/PWA | ~1 s |
| `npm run serve` | servidor do preview **sem cache**, 0.0.0.0:8000 (use com `start_process`) | — |

As capturas do `inspect` vão para `/tmp/fumiga-inspect/*.png` (fora do Git): **abra-as com
`read_file`** para cumprir a Regra 4 de verdade. Dica: `montage` (ImageMagick) junta várias
numa folha só.

## 2. Modo debug (`?debug`)

Carregado só com `?debug` na URL (import dinâmico; o jogador normal nunca baixa `js/debug.js`).
Usa um save **separado** (`…_debug`), então pode abusar à vontade.

```
/game/?debug&tela=RUN&mapa=3&seed=42&invencivel      expedição direta no mapa 3, mapa fixo
/game/?debug&tela=TREE&essencia=5000                 árvore com essência para comprar
/game/mobile/?debug&tela=NINHO                       dentro do formigueiro, versão mobile
parâmetros: tela=TITLE|MODE|TREE|OPTIONS|HELP|PROPHECY|MEMORY|RUN|NINHO · mapa=1..6 ·
            modo=campanha|sobrevivencia|enxame|cacada · seed=N · invencivel · essencia=N ·
            velocidade=N · cutscene (não pular) · limpo (zera o save debug) · hud=0
```
Overlay (F3): FPS, pior frame, ms de CPU por frame, tela/mapa/onda, entidades, seed, glifos
faltando e o último erro. No console: `FUMIGA.ajuda()`, `FUMIGA.go('RUN', {mapa: 2, seed: 7})`,
`FUMIGA.estado()`, `FUMIGA.essencia(n)`, `FUMIGA.invencivel()`.

## 3. Arquitetura (JS puro, módulos ES, Canvas 2D 960×540, sem build)

`game/index.html` (PC) e `game/mobile/index.html` (toque) carregam **o mesmo** `game/js/main.js`.

| Módulo | Responsabilidade |
|---|---|
| `main.js` | boot (fontes → sprites → assado), loop `update/render`, tela de carregamento, liga o modo debug |
| `state.js` | `G` (singleton global: `G.screen`, `G.save`, `G.run`), save/load em localStorage, profecias |
| `config.js` | **todos os dados**: `UNITS` (11 castas), `ENEMIES`, `BOSSES`, `MUTATIONS`, `META_NODES` (árvore), `CHAMBERS`, `MAPS` (6 biomas), `PROPHECIES`, textos de ajuda. Sem imports |
| `game.js` | orquestrador: telas (PRETITLE→TITLE→MODE→RUN, TREE, OPTIONS, HELP, PROPHECY, MEMORY), `newRun`, HUD, draft, pausa, fim de run, `__debug` |
| `render.js` | desenho do mundo, formigas, chefes (sheets direcionais), menus/título |
| `units.js` | formigas aliadas, rainha, ovos, compra (`buyUnit`), IA de papéis, entrar/sair do ninho |
| `brain.js` | IA de utilidade da colônia: necessidades, cotas, feromônio (estigmergia) |
| `enemies.js` | inimigos e os 6 chefes (fase 2 abaixo de 50%) |
| `waves.js` | diretor: calmaria → ondas → chefe → próximo mapa (`director`) |
| `world.js` | geração procedural por bioma (`genWorld(seed, mapIdx)`), props, recursos, colisão |
| `nest.js` | cena de dentro do formigueiro (câmaras, túneis, “olho lá fora”) |
| `meta.js` | tela da Árvore ancestral: navegação pelos sete galhos, zoom, seleção ao soltar e confirmação de compra |
| `tree_layout.js` · `tree_art.js` | posições na arte aprovada · restauração de cor por região, assada somente quando compras mudam |
| `mutations.js` | draft 1-de-3 |
| `combat.js` · `particles.js` · `lore_vfx.js` | projéteis/orbes · partículas com pooling · VFX por casta (orçamento `vfxAllow`) |
| `lore_hud.js` | HUD orgânico por bioma, barra-gaster da rainha, visão de feromônio (H) |
| `cutscenes.js` | cutscenes em camadas (Noite Branca etc.), biblioteca MEMÓRIAS (o replay toca dentro dela) |
| `preload.js` | **pré-carregamento do TITLE** (Regra 14): árvore, maçãs, flores, 7 santuários e Noite Branca preparados em fatias de poucos ms por quadro (geradores), sem tela de carregamento |
| `tutorial.js` · `ui.js` · `font.js` | tutorial em cartões · primitivos de UI em canvas · fonte bitmap (atlas) |
| `camera.js` · `input.js` · `fog.js` · `audio.js` · `utils.js` | câmera/zoom/shake · teclado+mouse em coords 960×540 · névoa de guerra · áudio procedural WebAudio · RNG/matemática |
| `playtest.js` | **diário de campo 100% local** (sem PII): sessões, expedições, poderes, erros e PWA; exporta em OPÇÕES → aba TESTE (`tools/playtest.mjs` gera o relatório) |
| `debug.js` | modo debug (seção 2) — ferramenta, não é jogo |
| `mobile/touch.js` | **única** camada exclusiva do mobile: gestos e botões virtuais → teclas/mouse do motor |

## 4. Receitas (onde mexer)

- **Novo poder global de 3 níveis (flores)** → registre os valores-base em `POWER_BASE`
  (`game/js/fruit_skills.js`): os níveis 2 e 3 multiplicam o **bônus** (1× / 1,25× / 1,5×), não os
  multiplicadores inteiros (fatores como 1,5× de velocidade, limiares e intervalos). As descrições
  por nível saem de `rankedDescription` e a UI mostra "PRÓXIMO NÍVEL n". Contagens são arredondadas;
  gatilhos, alvos e usos (quantas vezes por expedição/recarga) **não** crescem.
- **Nova casta / inimigo / chefe / mutação / nó da árvore / câmara / mapa** → dados em
  `config.js`; comportamento em `units.js` / `enemies.js` / `mutations.js`; sprite novo no
  `MANIFEST` de `assets.js` (o `test/assets.mjs` acusa se faltar).
- **Arte nova, arquivo movido ou qualquer byte mudado em `game/` ou `app/`** → subir `ASSET_V`, rodar
  `node tools/make_assets_list.mjs` e sincronizar os shells nativos com `node tools/sync-native-assets.mjs`.
  `app/assets.json` alimenta o único download offline completo (233 arquivos, ~24,8 MB); `test/pwa.mjs`
  compara a lista com a árvore real. Arquivo de arte não usado vai para `art-source/` (Regra 13).
- **Novo atalho de teclado** → trate em `game.js` **e** crie o botão/gesto em `mobile/touch.js`
  (Regra 9) + texto em `HELP_CONTROLS_TOUCH`.
- **Tela nova** → `update*`/`render*` em `game.js` (switch de `G.screen`), entrada por
  `startTransition`; acrescente em `__debug.openScreen` e na lista `SCENES` do `test/inspect.mjs`.
- **Conteúdo pesado novo acessível pelo TITLE** (arte grande, assado de pixels) → escreva o
  trabalho como gerador fatiado (`yield` a cada ~1 ms; `yield promessa` para rede/decodificação)
  e ponha na fila do `preload.js`, com o caminho síncrono de reserva (`drainSteps`) para quem
  chegar antes. Tela de carregamento é só para **troca de mundo** (Regra 14).
- **Balanceamento** → `config.js`; valide com `FORCE=3 node game/test/sim.mjs` e `npm test`.
- **Eventos de playtest (diário de campo)** → `ptEvento("tipo", {...})` nos pontos discretos
  (nunca por frame) e o consumo em `tools/playtest.mjs` (`resumir` + `alertas`). O diário vive em
  `localStorage["fumiga_playtest_v1"]`, separado dos saves; teto de 4.000 eventos e nunca derruba
  o jogo. Teste: `game/test/playtest.mjs`.

## 5. Armadilhas conhecidas

- **Fonte bitmap**: só existem os glifos de `FONT_CHARS` (`font.js`). Qualquer outro caractere
  vira “?”. `test/assets.mjs` checa os literais e o modo debug/`inspect` checa em tempo real.
  Para símbolos (setas, ícones), desenhe com `fillRect` ou use um sprite.
- **Cache de assets**: as imagens são pedidas com `?v=ASSET_V` (`assets.js`). Trocou um PNG
  que já existia? Suba `ASSET_V`, senão celulares continuam com o antigo.
- **Preview velho**: `python3 -m http.server` deixa o navegador guardar módulos ES em cache. Use
  `npm run serve` (sem cache).
- **Árvore por mundos**: `META_STAGES`/`stage`/`META_POWER` em `config.js`; `treeStageRequirement` em `state.js`. Abrir galho exige os mapas anteriores; o fruto exige o próprio chefe. Compras antigas ficam ativas; Pálida segue futura. `tree-progression.mjs` protege gates, preços e valores.
- **Save**: PC `fumiga_goat_save_v1`, mobile `fumiga_goat_mobile_save_v1`, debug `…_debug`.
- **Cache do app instalável (`sw.js`)**: a versão ativa e a de cada cliente ficam **persistidas no
  Cache Storage**; atualização só migra recursos quando a cópia anterior tinha todos os assets. Há um
  único botão de download completo na PWA. Os shells Android/Electron, por sua vez, trazem os arquivos
  dentro do APK/instalador e não pedem rede. Testes: `pwa-worker.mjs`, `pwa-browser.mjs` e
  `native-packages.mjs`.
- **Tela de carregamento**: a tarefa pesada é **essencial**. Se ela falhar (ou o `onFinish`), a tela
  entra em `error` com **TENTAR NOVAMENTE / VOLTAR AO MENU** — nunca mostra 100% e nunca libera o
  jogo num mundo pela metade. Arte panorâmica ausente continua sendo fallback silencioso. Regressão em
  `game/test/regressions.mjs` + `regressions-browser.mjs`.
- **Fim de partida**: `checkRunOutcome()` roda **antes** de curas e **depois** de cada `worldTick`,
  no formigueiro e na superfície; por isso a Rainha morta encerra a partida mesmo com a cena de dentro
  aberta (mutação morta por escudo/resgate continua sendo curada depois, no mesmo quadro).
- **Recarga automática de versão nova**: o worker serve o snapshot do cliente, então a 1ª abertura
  depois de uma atualização ainda roda o motor anterior. O jogo pergunta `versao-atual` ao abrir e o
  `sw.js` avisa `versao-nova` quando o snapshot ativo troca; se a versão não é o `ASSET_V` que está
  rodando, `game/js/main.js` recarrega **uma vez** — só no carregamento/PRETITLE/TÍTULO, nunca em
  expedição (fica pendente até voltar ao título; `sessionStorage` impede laço). Teste: passo 6 do
  `inspect:pwa`.
- **Testes headless** simulam DOM/canvas com Proxy: código novo que usa uma API de DOM
  diferente pode precisar de guarda (`typeof document !== "undefined"`). Em especial, módulo
  importado em teste de Node pode não ter `window` (ver a guarda da sessão do playtest em
  `app/offline.js`).
- **Diário de playtest**: chave própria (`fumiga_playtest_v1`), não misturar com os saves; a
  confirmação de APAGAR é em dois toques — dois cliques no MESMO quadro viram um só (o teste usa
  `__ptArmed()` para sincronizar; não troque por `waitForTimeout`).
- **Capturas no sandbox**: não há fonte de emoji, então os ícones emoji dos botões de toque
  (🏠 🎯 ⏸) saem vazios nas capturas. No celular aparecem normalmente.
- `docs.mjs` exige que os 6 documentos originais estejam **byte a byte** dentro do
  `MEGA_ARQUIVO.md`: editou um deles, atualize o bloco e o hash no registro de integridade.
- Cutscene Noite Branca: as camadas já vêm do disco em 320×180 RGBA (o tamanho desenhado,
  ampliado 3× sem suavização; **12 camadas, ~0,65 MB no total**), geradas por `tools/fix_noite_branca.py` a
  partir dos originais (painéis 1–2: 1672×941, histórico do git em `645dc68`; painel 3: arte nova de
  2026-10-04 sobre preto liso, recortada pelo brilho; cópias em `art-source/` e no espelho). Os
  originais tinham um xadrez de "transparência" PINTADO no lugar do alfa — `game/test/cutscene-art.mjs`
  barra camada sem alfa, fora de 320×180 ou com xadrez. Decisão do usuário de 2026-10-02 (substitui a
  de 2026-09-23, que mantinha os PNGs grandes reduzidos no carregamento). Cada painel lista as camadas
  que tem em `layers` — **igualdade 4+4+4 (decisão 2026-10-05):** painel 1 `[0, 2, 4, 5]` (perdeu
  1_distant, 6_vfx e 7_vignette, apagadas do jogo e do Git), painel 2 `[0, 1, 2, 4]` (ganhou
  4_foreground: arte nova da moldura de ruína com mato, aprovada entre 2 opções, receita ImageMagick
  no cabeçalho de `fix_noite_branca.py`) e painel 3 `[0, 2, 4, 5]`. Desde
  2026-10-01 são pré-carregadas no TITLE (Blob → `createImageBitmap`, decodificação fora da thread
  principal); desde 2026-10-04 entram no pacote offline — que o PR #57 unificou num **pacote completo
  único** (a divisão ESSENCIAL/COMPLETO não existe mais) — tocam sozinhas na 1ª expedição, e a caixa de
  texto da cutscene usa opacidade 0,7.
- **Testes de navegador**: `page.waitForFunction` precisa de predicado **síncrono** — um `async`
  devolve uma Promise (sempre "verdadeira") e o Playwright não espera nada. Importe os módulos
  antes com `importGameModules(page, { ui: "ui.js" })` (de `game/test/lib/browser.mjs`, guarda em
  `window.MOD`) e use `() => MOD.ui...`. A guarda `game/test/browser-waits.mjs` (no `npm test`/CI)
  reprova qualquer `waitForFunction(async …` em `game/test/` e `tools/`.

## 6. Salvar no GitHub (Regra 11 + CI)

**O merge só acontece com os testes verdes** (decisão do usuário, 2026-09-23).

- `.github/workflows/testes.yml` executa a bateria e inspeção do navegador.
- `.github/workflows/pacotes-nativos.yml` compila APK debug temporário + instalador Windows x64
  no push da branch Arena; o APK debug não é para distribuição. O acionamento manual e a Release
  compilam APK assinado e exigem os quatro Actions secrets descritos em `installers/README.md`.
  Só a Release publicada recebe APK assinado, EXE e checksums; nunca publicar APK release sem assinatura.
- Se `gh secret set` responder `403 Resource not accessible by integration`, login GitHub pode
  estar ativo sem permissão de escrita para Actions secrets. Não exponha a chave nem publique uma
  Release vazia; peça para o usuário habilitar essa permissão na conexão do Arena ou configurar os
  secrets em GitHub Settings → Secrets and variables → Actions. Nunca peça token/senha no chat.

Enquanto o CI de pacotes estiver bloqueado, não anunciar downloads funcionais no site; só criar a
Release depois que os dois builds tiverem passado e os três anexos (APK, EXE e checksums) estiverem
confirmados.
