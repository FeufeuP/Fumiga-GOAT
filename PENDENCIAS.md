# 🕓 Pendências abertas do FUMIGA — handoff

> **Antes de qualquer pedido:** ler [as regras por inteiro](REGRAS_DE_TRABALHO.md) e responder
> o [GUIA de encaminhamento](GUIA.md). As rotas e resumos não dispensam a leitura integral.

> **Estado artístico vigente — 2026-10-26: PIXEL CELESTE** (`FUMIGA-PIXEL-CELESTE-v1`). Decisão do usuário: *“quero que o novo pixel seja idêntico ao pixel de celeste”* — canvas de jogo 320×180 ampliado ×3, tiles 8×8, 16 cores de cena por bioma, sem anti-aliasing/gradiente. Plano completo em [`docs/arte/FASES_PIXEL_CELESTE.md`](docs/arte/FASES_PIXEL_CELESTE.md): **F0a concluída; F0b (frame pixel) é a próxima pendência real**; nenhum asset migrado e runtime inalterado. O texto abaixo descreve o período anterior em papel recortado e permanece como histórico:
> **Histórico — 2026-10-16:** estilo 06 papel recortado **detalhado** (`FUMIGA-PAPEL-v4-CHROMA`);
> **Grupo A dos HUDs** reestruturado em **2 peças (`*_frame.png` moldura vazada + `*_bg.png` fundo de papel)** com **ordem estrita de camadas `1º Fundo > 2º Texto (clipado no papel) > 3º Moldura`** (`beginPaperHud` / `endPaperHud` / `deferPaperFrame` / `flushPaperFrames`), vigas internas finas + folhas/vinhas/musgo grandes externos e 100% dos textos, barras e sub-botões dentro de `paperQuiet`.
> O roteamento dos **8 novos HUDs distintos por local** (`expanded`, `tutorial`, `boss`, `event`, `transition`, `nest_tip`, `tree_detail`, `header`) já está ativo no código e seus prompts/especificações para a próxima etapa de geração estão documentados em [`docs/arte/PLANO_HUDS_DISTINTOS_E_CAMADAS.md`](docs/arte/PLANO_HUDS_DISTINTOS_E_CAMADAS.md).
> Os dados técnicos de correção do **Grupo B** e as tabelas completas de migração do **Grupo C** estão documentados em [`docs/arte/PLANO_CORRECAO_HUDS_GRUPOS_B_C.md`](docs/arte/PLANO_CORRECAO_HUDS_GRUPOS_B_C.md) para execução nas próximas etapas.
> Começar pelo [guia de continuidade no MEGA](MEGA_ARQUIVO.md#continuidade-artistica).
> O status “nenhum trabalho em aberto” abaixo é histórico da integração de 2026-10-05,
> não conclusão da migração visual. Branches e caminhos abaixo também são históricos.

**Criado em:** 5 de outubro de 2026
**Branch da entrega anterior:** `arena/01a0f71c-fumiga-goat` · **branch desta integração:**
`arena/01a10bcf-fumiga-goat`
**Status histórico da integração de 2026-10-05:** **nenhum trabalho em aberto** — os 2 trabalhos sem decisão que este documento abriu foram
**resolvidos na integração desta branch** (seção 1). Permanecem as 2 limitações aceitas por decisão do
usuário (seção 3, não são tarefas). O defeito offline aberto na primeira versão deste documento foi
resolvido pelo PR #57 (seção 2, histórico). Tudo o que o jogo usa está no repositório, testado e
verificado; nada aqui é tarefa pendente nesta data.

Este documento existe porque o sandbox do agente reinicia a cada pausa e perde `node_modules`,
`art-source/` e qualquer anotação fora do Git. O histórico de por que cada coisa ficou assim está no
`MEGA_ARQUIVO.md` — registros **“Dica da cutscene por plataforma + área PULAR no toque e Noite Branca
em 4+4+4 (2026-10-05)”** (topo), **“Versão nova recarrega sozinha, formiga do painel 3 conferida e
originais de arte fora do Git (2026-10-05)”** e **“Distribuição nativa offline completa (2026-10-02,
branch arena/01a0fc42)”** (perto do fim, seção da distribuição). **Orientação de leitura atualizada:** nesta continuidade o usuário solicitou leitura integral
do MEGA. Começar pelo guia vigente e continuar pelos registros, incluindo os históricos abaixo.

## 0. Como usar (vale para qualquer item daqui — e para pendências futuras)

1. Siga o fluxo obrigatório das regras: **ler o MEGA_ARQUIVO (Regra 15) → pesquisar inspirações
   na web (Regra 2) → perguntar com opções A/B/C + impacto (Regra 1) → implementar → adaptar o mobile
   (Regra 9) → check-in (Regra 3) → jogar/inspecionar (Regra 4) → preview no fim (Regra 7) →
   documentar (Regra 12)**.
2. Ambiente no começo da sessão (~20 s): `bash tools/setup-dev.sh`; depois `npm test` e
   `npm run inspect` (PC + mobile) precisam estar verdes **antes** de qualquer “salvar no GitHub”.
3. Teste de navegador usa predicado **síncrono** lendo `MOD` (`importGameModules`, `game/test/lib/browser.mjs`);
   `game/test/browser-waits.mjs` barra a volta do predicado `async`.
4. A fonte de bitmap só desenha os glifos de `FONT_CHARS` (`game/js/font.js`): texto novo de interface
   tem que usar só esses caracteres.
5. O app offline é **um pacote completo único** (sem divisão ESSENCIAL/COMPLETO — PR #57): qualquer
   regra nova de assets entra nesse pacote.

---

## 1. Resolvido nesta integração (2026-10-05, branch `arena/01a10bcf-fumiga-goat`)

### 1.1 A dica da cutscene não fala mais de teclado no celular — **RESOLVIDO**

**O que era:** o rodapé da cutscene mostrava, nas duas plataformas,
`"ENTER / ESPAÇO / CLIQUE: <ação> • ESC: PULAR"` (`game/js/cutscenes.js`, antiga linha 397) — teclas
que quem está no celular não tem. Era polimento pré-existente sem decisão.

**Decisão (Regra 2 → Regra 1, 2026-10-05):** inspirações pesquisadas — port de **Dead Cells** para
mobile (Playdigious/GameDeveloper): nunca presumir o dispositivo do jogador e dar **botão visível** às
ações que só existiam no teclado; padrão da indústria de **prompt-swap por dispositivo** (Steam
Input/Prey 2017, InputGlyphs): trocar o texto do prompt no runtime. O usuário escolheu a **opção B**:
texto por plataforma **+ área PULAR desenhada no rodapé** (que funciona também no replay das
MEMÓRIAS, onde o HUD de botões do mobile nem aparece — antes não havia caminho nenhum para pular).

**Implementado:** em `game/js/cutscenes.js`, o rodapé detecta `isTouchUI()` (`game/js/ui.js`):

- **PC:** inalterado — `ENTER / ESPAÇO / CLIQUE: <ação> • ESC: PULAR`.
- **Toque:** `TOQUE: <ação>` (toque na tela avança texto/painel, como já funcionava) **+ área
  desenhada “PULAR ▶”** no canto direito do rodapé, que fecha a cutscene pelo mesmo caminho do `ESC`
  (o toque nela não avança o texto). Os glifos estão dentro de `FONT_CHARS`; a dica usa `maxWidth`
  para nunca vazar sob FONTE GRANDE; a área é publicada por `cutsceneSkipRect()` só no toque.
- Estado de carregamento (`CARREGANDO... ns`) segue bloqueando input nas duas plataformas.

**Prova:** `game/test/ui-navigation-browser.mjs` agora confere, no replay das MEMÓRIAS, que o PC lê
“ENTER / ESPAÇO” **sem** área PULAR e fecha com ESC, e o celular lê “TOQUE:” (sem teclas), vê a área
PULAR e fecha por toque no botão — ambos voltando à tela MEMÓRIAS. `npm test` (33/33),
`npm run inspect` (PC + mobile, sem erros/404/glifos, 60 fps nos 6 mapas) e `npm run inspect:ui`
verdes; quadro real do `drawCutscene` conferido nos dois perfis.

### 1.2 As camadas da Noite Branca em igualdade **4+4+4** — **RESOLVIDO**

**O que era:** o plano antigo da Fase 5 previa 13 camadas pendentes (5 do painel 2 + 8 do painel 3).
O painel 3 foi resolvido em 2026-10-04 com 4 camadas enxutas e o painel 2 ficou para decisão.

**Decisão (2026-10-05, opção A customizada + confirmação “igualdade estrita”):** **os três painéis
passam a ter exatamente 4 camadas.**

**Implementado:**

- **Painel 1:** `[0, 2, 4, 5]` — perdeu `1_distant.png`, `6_vfx.png` e `7_vignette.png` (apagados do
  jogo e do Git; receitas viraram `drop` em `tools/fix_noite_branca.py`).
- **Painel 2:** `[0, 1, 2, 4]` — ganhou `4_foreground.png`, **arte nova aprovada pelo usuário entre 2
  opções (Regra 6)**: moldura de ruína tomada por mato (silhueta frontal, inspiração Hollow Knight —
  “câmera escondida na relva” olhando a colônia). Original 2848×1600 em
  `art-source/cutscenes/noite_branca/panel2_conflito/` + espelho (Regra 13); recorte para alfa por
  ImageMagick (fuzz 12% → branco vira transparente, `-scale 320x180!`, PNG32), receita registrada no
  cabeçalho de `tools/fix_noite_branca.py` (kind `gen`) — **49 KB** no jogo.
- **Painel 3:** `[0, 2, 4, 5]` — inalterado.
- **Estado:** 12 camadas, **~0,65 MB** (eram 14, ~0,7 MB); pacote offline **233 arquivos, ~24,9 MB**
  (−3 camadas do painel 1, +1 do painel 2; depois as duas atlas bitmap foram substituídas pela Kiwi Soda TTF).
  `ASSET_V = 20261005-kiwisoda-font-theme`; `app/assets.json` regerado e shells nativos sincronizados.

**Prova:** `game/test/cutscene-art.mjs` (12 camadas 320×180, alfa real, sem xadrez),
`game/test/preload-browser.mjs` (12 decodificadas, 12 requisições únicas), `game/test/pwa.mjs` (233
arquivos) atualizados; `npm test` (33/33) e `npm run inspect` (PC + mobile) verdes; quadro real do
`drawCutscene` antes × depois conferido nos dois perfis (painel 2 com a moldura nova de mato).

---

## 2. Resolvido na integração anterior (histórico, não é tarefa)

**Offline depois de FECHAR o navegador — resolvido pelo PR #57 (integrado em 2026-10-05, PR #58).**
O defeito (relatado na primeira versão deste documento) era: baixar o pacote, fechar o navegador e
reabrir **sem rede** devolvia 504 — o worker perdia `CACHE`/`VERSAO` ao ser desligado e respondia com
o cache `fumiga-dev`. O `sw.js` do PR #57 persiste a versão ativa e a de cada cliente no Cache
Storage e as recupera ao subir. Verificado na árvore integrada: `npm run inspect:pwa` (“worker
reiniciado offline: versão preservada”) e o perfil persistente real (baixa → **fecha o navegador** →
reabre offline: `/game/mobile/` responde 200 até o PRETITLE). Na mesma integração, a recarga
automática de versão nova (seção 3.2) foi reaplicada sobre a arquitetura nova.

---

## 3. Limitações aceitas por decisão (não são tarefas)

1. **Originais de arte fora do Git** — decisão do usuário (opção A, 2026-10-05): `art-source/` e o
   espelho `~/art-source-backup/` (Regra 13) continuam **fora do repositório** e podem sumir quando o
   sandbox reinicia. Consequência registrada: os originais em alta do painel 3 (a Pálida) **se
   perderam** — um recorte novo a partir deles não é possível; refazer o recorte exige gerar a arte de
   novo. As camadas aprovadas estão no repositório e o jogo não depende dos originais. Os originais
   dos painéis 1 e 2 podem ser recriados a partir do commit `645dc68` (auxílio:
   `tools/fix_noite_branca.py` lê `art-source/`, o espelho ou o histórico do Git). O original da
   **nova** `4_foreground` do painel 2 foi salvo nesta sessão no workspace e no espelho.
## 4. Plano Técnico Salvo — Correção dos HUDs dos Grupos B e C (2026-10-16)

Por decisão explícita do usuário em 2026-10-16, o **Grupo A** foi corrigido nesta sessão (divisão em **2 peças: moldura vazada `*_frame.png` + fundo de papel `*_bg.png`** mantendo o Estilo 06 `FUMIGA-PAPEL-v4-CHROMA` com vigas de madeira finas e folhas/vinhas/musgo grandes nas bordas, redução de 29% a 49% na área de tela dos HUDs em `RUN`/`TREE`/`NEST`, opacidade contextual dinâmica `hudContextAlpha`, e contenção de 100% dos textos, barras e sub-botões dentro de `paperQuiet()`), enquanto as especificações completas dos **Grupos B e C** ficaram registradas para execução posterior em:

- **[`docs/arte/PLANO_CORRECAO_HUDS_GRUPOS_B_C.md`](docs/arte/PLANO_CORRECAO_HUDS_GRUPOS_B_C.md)**:
  - **Parte 1 — Grupo B (Itens B1 a B19):** tabela técnica com coordenadas atuais (`x, y, w×h`), razão de aspecto, fonte escolhida por `paperSource`, cobertura real em `paperFit` e geometria alvo exata para eliminar encolhimento de sprites (`TRANSICAO` `drawMapTransition`, faixas finas em `TITLE`/`MODE`/`OPTIONS`/`PROPHECY`/`TREE`/`SANCTUARY`, colunas da `TREE` `drawNodeTip`, modais `PAUSE`/`OPTIONS`/`HELP`/`MEMORY`/`END` e barras de câmara em `nest.js`).
  - **Parte 2 — Grupo C (Tabelas C1, C2 e C3):**
    - **Tabela C1:** 10 grupos de painéis/caixas ainda em renderização procedural escura (`MODE` cards, barras superior/inferior e pílulas do `NINHO`, janela PiP `"OLHO LÁ FORA"`, legenda de feromônios, `LOADING`, `CUTSCENES`, `PRETITLE`/`BOOT`).
    - **Tabela C2:** inventário completo dos 32 ícones (`game/assets/sprites/icons/`) organizados em lotes de até 10 imagens por rodada (Regra 16).
    - **Tabela C3:** mapeamento de substituição dos 5 atlases pixel-art legados (`game/assets/ui/lore_*.png`).

## 5. Ninho escavável — o que ficou aberto depois do protótipo e o que a rodada de arte fechou (2026-10-21)

O formigueiro deixou de ser menu de salas e virou **grade de terra escavável** (`game/js/nest.js`
reescrito + `NEST_*` em `game/js/config.js`). A rodada seguinte — **arte, HUD, mobile e balanceamento** —
foi aplicada e verificada (`npm test` 38/38, `inspect:layout` 122 estados, `inspect:hud`, 59,5 fps na
cena com a gaveta aberta). O registro completo está em `MEGA_ARQUIVO.md`, „Rodada de ARTE do ninho
escavável (2026-10-21)“.

**Fechado nesta rodada:**

- **Continuidade do chão** (item 3 da lista antiga): uma folha pintada **uma vez** no rect da grade e
  amostrada 1:1 pelo tile (`game/assets/sprites/nest/terra.png`, 1326×468) — nada de atlas de tiles que
  encaixam, e o `nestmap` reprova re-corte fora da proporção da grade.
- **Ficha do tile** com moldura própria (`paper_nest_tip_frame`/`_bg`, área quieta medida no PNG,
  `PAPER_QUIET.nest_tip`) em lugar do `panel` da superfície.
- **Faixas C1.2 / C1.3 / C1.4** saíram do `fillRect` preto e viraram a prancha da casa (barra de topo,
  duas tiras do rodapé e as faixas do `OLHO LÁ FORA`).
- **Mobile**: as 7 placas viraram **gaveta `OBRAS`** que abre sobre o campo só no toque e fecha ao
  escolher; `KeyX` passou a demolir de verdade e o rótulo diz `7 / X` (PC e toque).
- **Balanceamento**: `capBase 280`, `spoil 0,05` e `refundBuilt 0,5` (demolir obra começada devolve
  metade; plano não começado devolve tudo) — revalidado em `sim` e `endless`.

**Ainda em aberto:**

1. **Pílulas C1.5** (rodapé do ninho e do PiP) — ficaram fora da aplicação de propósito: o pedido era o
   chão e as faixas. Entram no próximo lote da Tabela C1.
2. **Tráfego de túnel no mapa largo** — `trafficGood 6` / `trafficBad 34` (túnel comprido rende 0,55x)
   ainda não foram medidos nos mapas 4 e 6 com câmaras grandes; a curva existe, o número não foi conferido.
3. **`extraChamberMult 1.6`** (segunda câmara do mesmo tipo custa +60%) — mantido como estava; a rodada só
   mexeu no reembolso da obra. Se ampliar continuar parecendo taxa, é aqui que se ajusta.
4. **Eventos de playtest** do ninho (`ptEvento`) — continuam sem existir; só entram com o formato do modo
   definido (Regra: evento em ponto discreto, nunca por frame).
5. **Aparelho físico**: tudo foi verificado em Chromium headless (PC e mobile emulado), não em celular.

**Regressão encontrada JOGANDO (não em teste), para memória:** a carregadora que largava uma obra
acordava sem trilha desenhada e ficava respirando no lugar — o estoque congelava sem erro algum na
tela. Corrigido (`nest.js:carrierTick` traça a rota até a boca quando falta trilha) e **virou
teste** em `game/test/nestdig.mjs` (seção 8b). Lição que vale para a próxima cena: inspeção visual
com cliques reais pega o que a asserção de estado não vê.
