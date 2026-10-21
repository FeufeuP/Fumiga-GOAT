# Plano de Correção dos HUDs — Grupos B e C

**Data:** 2026-10-16  
**Escopo:** Dados técnicos de correção geométrica para os HUDs do **Grupo B** (adequação às Regras 21 e 22: `paperFit` sem encolhimento e conteúdo contido em `paperQuiet`) e tabelas completas de inventário e migração futura para os HUDs do **Grupo C** (substituição de caixas procedurais escuras e ícones legados pelo Estilo 06 — papel recortado em 2 peças: fundo + moldura).

---

## Parte 1 — Dados de Correção do Grupo B (Geometria `paperFit` e `paperQuiet`)

### 1.1. Causa Técnica nos HUDs do Grupo B
Pelas **Regras 21 e 22**, todo HUD pintado é renderizado inteiro na sua proporção original (`paperFit`, modo `contain` centralizado) e todo texto/elemento interno deve ficar contido na área permitida (`PAPER_QUIET` / `paperQuiet()`).  
Nos itens abaixo, as chamadas atuais de `panel()` / `dialogBox()` usam retângulos cuja razão `w/h` diverge da pintura escolhida por `paperSource(kind, w, h)` ou posicionam textos por coordenadas brutas (`PX`, `PY`) sobre a moldura.

### 1.2. Tabela de Diagnóstico e Geometria Alvo do Grupo B

| # | Tela | Componente / Função | Arquivo e Linha | Caixa Atual (`x, y, w×h`) | Razão Atual | Fonte Atual (`paperSource`) | Desenho Real (`paperFit`) | Cobertura Atual | Correção Recomendada (Geometria + `paperQuiet`) |
| :-: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **B1** | `RUN` (Modal) | **Transição de Mapa (`drawMapTransition`)** | `game/js/game.js:2482` | `200, 84, 560×386` | `1,451` | `pause` (`928×1152`, razão `0,806`) pois `386 > 560×0,68` (`380,8`) | `311×386` (`ox=125, oy=0`) | **56%** (vaza `125px` por lado) | Mudar caixa para proporção nativa de `panel` (`960:512 = 1,875:1`), ex.: **`660×352`** em `(150, 94)` (ou passar `paperKind: "panel"`), e posicionar título, textos (`fitTextBlock`) e botão `"AVANÇAR A EXPEDIÇÃO"` dentro de `paperQuiet("panel", 150, 94, 660, 352)`. |
| **B2** | `TITLE` | **Rodapé de Acessibilidade** | `game/js/game.js:1264` | `12, footerY, 936×32` (PC) / `936×44` (Mobile) | `29,25` / `21,27` | `panel` (`960×512`, razão `1,875`) | `60×32` (`ox=438`) | **6%** | Usar `paperKind: "banner"` na proporção `5:1` (ex.: **`220×44`** no canto inferior direito `x=728`) **ou** `paper: false` para faixa informativa discreta, centralizando o texto em `paperQuiet("banner")`. |
| **B3** | `MODE` | **Barra de Ascensão da Névoa** | `game/js/game.js:1277` | `220, 462, 520×44` | `11,818` | `panel` (`960×512`, razão `1,875`) | `83×44` (`ox=219`) | **16%** | Passar `paperKind: "banner"` com caixa na razão `5:1` (**`320×64`** ou **`260×52`**) e centralizar `<`, título, bônus de essência e `>` dentro de `paperQuiet("banner")`. |
| **B4** | `MODE` | **Rodapé de Dica de Controle** | `game/js/game.js:1306` | `12, 508, 936×28` | `33,429` | `panel` (`960×512`, razão `1,875`) | `53×28` (`ox=442`) | **6%** | Usar `paperKind: "banner"` em caixa `5:1` ou `paper: false` (faixa translúcida de rodapé sem miniatura de papel solta no centro). |
| **B5** | `OPTIONS` | **Diálogo Principal de Opções** | `game/js/game.js:1321` | `24, 16, 912×508` | `1,795` | `panel` (`960×512`, razão `1,875`) | `912×486` (`oy=11`) | **96%** | Caixa externa na razão `1,875:1` (**`912×486`** em `24, 27`); na arquitetura de 2 peças (fundo + moldura), ampliar a área útil do miolo ou alinhar cabeçalho, abas, `optViewport()` e botões de rodapé à área interna da moldura. |
| **B6** | `OPTIONS` | **Caixas de Aviso (`optNote`)** | `game/js/game.js:1405` | `TX, y, 828×40` | `20,700` | `panel` (`960×512`, razão `1,875`) | `75×40` (`ox=377`) | **9%** | Usar `paperKind: "banner"` (em proporção `5:1`) ou sub-caixa de papel interna (`paper_bg`) sem moldura completa encolhida no centro. |
| **B7** | `HELP` | **Diálogo Principal (`COMO JOGAR`)** | `game/js/game.js:1580` | `32, 20, 896×484` | `1,851` | `panel` (`960×512`, razão `1,875`) | `896×478` (`oy=3`) | **99%** | Ajustar caixa para **`896×478`** (`1,875:1`) e confinar título `"COMO JOGAR"`, as 2 colunas (`OBJETIVO + DICAS` e `CONTROLES`) e o botão `"VOLTAR"` dentro da área útil da moldura (sem sobrepor as vinhas laterais). |
| **B8** | `PAUSA` | **Painéis Esquerdo e Direito + Sub-moldura do Minimapa** | `game/js/game.js:2529, 2576, 2581` | Esq/Dir: `355×440` (`pause`); Mini: `327×164` (`panel`) | `0,807` (`pause`) / `1,994` (`panel`) | `pause` (`928×1152`) e `panel` (`960×512`) | `354×440` (**100%**) / `308×164` (**94%**) | **100%** / **94%** | Posicionar títulos (`"PAUSA"`, `"MAPA E STATUS"`), 6 botões, minimapa (`paperQuiet("minimap")` ou moldura de 2 peças), lista de estatísticas (`fitTextBlock`) e rodapé dentro de `paperQuiet("pause")`; remover a dupla moldura `panel()` sob o minimapa da pausa ou usar a moldura `minimap`. |
| **B9** | `END` | **Diálogo de Vitória / Derrota (`drawEnd`)** | `game/js/game.js:2727` | `40, 10, 880×520` | `1,692` | `panel` (`960×512`, razão `1,875`) | `880×469` (`oy=26`) | **90%** | Ajustar caixa para razão `1,875:1` (**`880×469`** em `40, 35`) e posicionar título, subtítulo, 3 colunas de estatísticas, ícones de mutações, total de essência e 3 botões dentro da área útil interna. |
| **B10** | `PROPHECY` | **Cabeçalho de Título e Painel de Essência** | `game/js/game.js:2681, 2688` | Título: `12, 10, 426×88`; Essência: `440, 10, 160×70` | `4,841` / `2,286` | `panel` (`960×512`, razão `1,875`) | `165×88` (`ox=131`) / `131×70` (`ox=15`) | **39%** / **82%** | No cabeçalho (`426×88`), usar `paperKind: "banner"` na razão `5:1` (**`430×86`**) + `paperQuiet("banner")`; no painel de Essência, usar razão `1,875:1` (**`154×82`**) + `paperQuiet("panel")`. |
| **B11** | `MEMORY` | **Diálogo Externo da Biblioteca de Memórias** | `game/js/game.js:2855` | `24, 16, 912×508` | `1,795` | `panel` (`960×512`, razão `1,875`) | `912×486` (`oy=11`) | **96%** | Remover o `dialogBox` externo redundante (como em `PROPHECY`, onde os 4 cartões `360×192` + cabeçalho `banner` ficam direto sobre o fundo) **ou** alinhar cabeçalho, grade `2×2` e paginação à área interna. |
| **B12** | `TREE` | **Cabeçalho Esquerdo da Árvore (`drawTreeHUD`)** | `game/js/meta.js:658` | `12, 10, 366×82` | `4,463` | `panel` (`960×512`, razão `1,875`) | `154×82` (`ox=106`) | **42%** | Trocar para `paperKind: "banner"` na razão `5:1` (**`380×76`** ou **`410×82`**) e centralizar título/progresso em `paperQuiet("banner")`. |
| **B13** | `TREE` | **Painel de Essência da Árvore** | `game/js/meta.js:664` | `386, 10, 154×82` | `1,878` | `panel` (`960×512`, razão `1,875`) | `154×82` (`ox=0, oy=0`) | **100%** | Caixa já está em `100%` da razão nativa; falta apenas centralizar o ícone + valor de Essência dentro de `paperQuiet("panel", 386, 10, 154, 82)` (`90×33px`). |
| **B14** | `TREE` | **Coluna Esquerda de Patamares (`GALHO I..V`)** | `game/js/meta.js:673` | `12, 100, 164×386` | `0,425` | `card` (`848×1264`, razão `0,671`) | `164×244` (`oy=71`) | **63%** | Como os 6 itens já são botões de madeira individuais (`GALHO I..V` + `VER TUDO`), remover o `panel()` de fundo deformado **ou** usar caixa `pause`/`card` na proporção nativa contendo os botões dentro de `paperQuiet`. |
| **B15** | `TREE` | **Barra Rodapé de Zoom e Dicas** | `game/js/meta.js:686` | `12, 492, 936×44` | `21,273` | `panel` (`960×512`, razão `1,875`) | `83×44` (`ox=427`) | **9%** | Usar faixa `banner` (`5:1`) para a dica centralizada e manter os botões `-`, `+`, `CENTRO`, `PROFECIAS`, `MEMÓRIAS` em suas placas de madeira próprias. |
| **B16** | `TREE` / `SANTUÁRIO` | **Painel Lateral de Detalhe do Nó / Flor (`drawNodeTip`)** | `game/js/meta.js:718` | Árvore: `608, 100, 340×386`; Santuário: `738, 116, 210×382` | `0,881` / `0,550` | `card` (`848×1264`, razão `0,671`) | `259×386` (`ox=41`) / `210×313` (`oy=35`) | **76%** / **82%** | Usar `paperKind: "pause"` na proporção nativa `928:1152` (`0,806`, ex.: **`311×386`** na Árvore e **`250×310`** no Santuário) e posicionar todo o texto (`fitTextBlock`), barra de nível e botões `EVOLUIR`/`FECHAR` dentro de `paperQuiet("pause")`. |
| **B17** | `SANTUÁRIO` | **Cabeçalho do Fruto (`drawFruitMini`) e Selo Pálida (`drawSanctuarySeal`)** | `game/js/meta.js:879, 900` | Header: `12, 10, 936×96`; Selo: `112, 419, 736×76` | `9,750` / `9,684` | `panel` (`960×512`, razão `1,875`) | `180×96` (`ox=378`) / `143×76` (`ox=297`) | **19%** / **19%** | Usar `paperKind: "banner"` na proporção `5:1` (**`480×96`** no cabeçalho ao lado do botão `VOLTAR À ÁRVORE`, e **`460×92`** no Selo Pálido) com texto centralizado em `paperQuiet("banner")`. |
| **B18** | `NINHO` | **Barras Internas das Câmaras (`bar()` $\rightarrow$ `drawPaperBar`)** | `game/js/nest.js:685, 725, 845` | `120×9`, `(r.w-36)×8`, `(r.w-52)×7` | `13,33` a `22,0` | `health` (`960×135`, razão `7,111`) | `64×9` (`ox=28`) | **53%** | Passar altura na proporção `7,111:1` da pintura `health.png` (ex.: **`114×16`** ou **`92×13`**) para que a barra pintada preencha 100% da largura pedida. |
| **B19** | Motor | **Fallback de Dimensões em `paperQuiet()`** | `game/js/paper_hud.js:68` | `ih = 512` fixo quando `IMG` não está carregada | — | Todas as 7 peças | — | — | Usar mapa de dimensões nativas reais por peça (`panel: [960,512]`, `health: [960,135]`, `banner: [960,192]`, `minimap: [960,717]`, `card: [848,1264]`, `pause: [928,1152]`, `tooltip: [960,475]`) como fallback em vez de `[960, 512]` genérico. |

---

## Parte 2 — Tabelas do Grupo C (HUDs Procedurais Escuros e Assets Legados para Migração Futura)

### Tabela C1 — Painéis e Caixas de Interface ainda em Renderização Procedural (`fillRect` / Paleta Escura)

| # | Tela / Contexto | Elemento de HUD | Arquivo e Função | Geometria Atual (`x, y, w×h`) | Estilo Atual (Legado) | Peça / Arquitetura Alvo (Estilo 06 — 2 Peças: Fundo + Moldura) | Prioridade |
| :-: | :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **C1.1** | `MODE` | **Cartões de Modo (`CAMPANHA` e `MODO TESTE`)** | `game/js/render.js` (`drawModeCards`) | 2 cartões de `360×340` (`x=100, 500`, `y=116`) + botão interno `340×26` | `fillRect("#1d1730")` / `#2c2144`, borda `#3a3054`, topo colorido `4px` | Cartão em 2 peças (`pause_bg` + `pause_frame` na razão `0,806`, ex.: `274×340`) + botão de madeira `largo`/`grande` para `"JOGAR"` + textos via `paperQuiet` e `fitTextBlock`. | Alta |
| **C1.2** | `NINHO` | **Barra Superior de Recursos do Formigueiro** | `game/js/nest.js` (`drawNestHud`) | `0, 0, 960×40` (PC) / `960×64` (Fonte Grande) | `fillRect("rgba(8,6,4,0.82)")` + linha roxa `#4a3a6e` | Faixa superior de madeira/papel terroso (`banner_bg` + borda de madeira) ou placas `banner` agrupadas para Recursos (esquerda) e Status do Ninho (direita). | Alta |
| **C1.3** | `NINHO` | **Barra Inferior de Ações do Formigueiro** | `game/js/nest.js` (`drawNestHud`) | `0, 464, 960×76` | `fillRect("rgba(8,6,4,0.82)")` + linha roxa `#4a3a6e` | Manter os 3 botões de madeira (`VOLTAR À COLÔNIA`, `SAIR PELA BOCA`, `CHAMAR P/ DENTRO`) e substituir a faixa preta/roxa por prancha de madeira/papel terroso (`#2b1e14` / `#493521`). | Alta |
| **C1.4** | `NINHO` | **Janela PiP `"OLHO LÁ FORA"`** | `game/js/render.js` (`drawOutsideEye`) | `644, 52, 300×170` + faixas `15px`/`14px` | `strokeRect` + faixas `rgba(10,8,16,0.86)` | Aplicar o sistema de **2 peças (`minimap_bg` + `minimap_frame` ou `panel_frame` vazado)** por cima do recorte `ctx.clip()` da câmera externa, com os rótulos nas placas da moldura. | Alta |
| **C1.5** | `NINHO` | **Pílulas de Nome e Custo das 6 Câmaras** | `game/js/nest.js` (`nestDraw`) | Pílulas `w×16` no topo e rodapé de cada câmara | `fillRect("rgba(10,7,4,0.78)")` + `strokeRect` | Mini-tábuas de madeira/papel (`banner` compacto ou `wood_button` estado informativo) com tinta sépia sobre papel. | Média |
| **C1.6** | `RUN` | **Legenda da Visão de Feromônio (`[H]`)** | `game/js/lore_hud.js` (`drawPheromoneLegend`) | `256, 418, 448×26` | `fillRect("#100c1c")` + `strokeRect("#7fd6a0")` | Tábua `banner` em 2 peças (`banner_bg` + `banner_frame`) na proporção `5:1` (`440×88` ou `360×72`) com os 3 indicadores (`COLETA`, `PERIGO`, `RAINHA`) centralizados em `paperQuiet("banner")`. | Média |
| **C1.7** | `RUN` | **Faixa Inicial de Dicas de Controle (`elapsed < 14s`)** | `game/js/game.js:2338` | `160, 416, 640×18` | `fillRect("rgba(10,8,16,0.65)")` | Tábua `banner` ou faixa de papel recortado terroso com fade suave. | Baixa |
| **C1.8** | `LOADING` | **Badge de Bioma (Topo) e Painel de Lore/Dica/Progresso (Base)** | `game/js/loading_screen.js` (`drawLoadingScreen`) | Topo: `28, 22, w×54`; Base: `28, 382, 904×136` + barra 12 blocos | Caixas `rgba(10,8,18,0.72..0.84)` + bordas roxas `#4a3a6e` | Badge superior em `banner` (2 peças); painel inferior em papel recortado/madeira + barra de progresso usando `health` (2 peças: `health_bg` + preenchimento + `health_frame`). | Média |
| **C1.9** | `CUTSCENES` | **Cabeçalho do Ato e Caixa de Narração** | `game/js/cutscenes.js` (`drawCutscene`) | Topo: `14, 6, w×22`; Narração: `60, 384, 840×92` | `rgba(10,8,18,0.68)` + borda `#4a3a6e` + cantos `#ffd479` | Caixa de narração em pergaminho/papel recortado (`banner`/`tooltip` largo em 2 peças) com tinta sépia `#493521` e botão `PULAR` em placa de madeira `pequeno`. | Média |
| **C1.10** | `PRETITLE` / `BOOT` | **Caixa `"CLIQUE PARA JOGAR"` e Barra de Boot** | `game/js/render.js` (`drawPreTitle`), `game/js/main.js` (`drawLoading`) | `cx-tw/2-20, y, tw+40×28`; Boot: `360×24` | `rgba(0,0,0,0.4)` / `#1d1730` com borda `#4a3a6e` | No `PRETITLE`, placa de madeira ou texto estilo `TITLE`; no `BOOT`, paleta terrosa (`#2b1e14` / âmbar `#ffd479` / verde `#7fd6a0`) antes do carregamento de imagens. | Baixa |

---

> **Situação da Tabela C1 (2026-10-21, rodada de arte do ninho escavável).** **C1.2**, **C1.3** e
> **C1.4** foram aplicadas — mas com uma substituição na receita: a faixa usa a **prancha de madeira
> (`wood_*` em 3 partes)** em vez de `banner_*`. `tileFor` faz `paperFit` (contain) fora da família
> madeira, e uma moldura `960×717` numa tira de `960×40` sairia **encolhida** (o que o Grupo B existe
> para matar). Somaram-se duas linhas que não estavam previstas aqui e também foram aplicadas: a
> **folha contínua do chão escavável** (`game/assets/sprites/nest/terra.png`, amostrada 1:1 pela grade)
> e a **moldura própria da ficha do tile** (`paper_nest_tip_frame`/`_bg`, com área quieta medida no PNG).
> **C1.5** (pílulas das 6 câmaras), **C1.1** e **C1.6 – C1.10** seguem em aberto.

### Tabela C2 — Inventário dos 32 Ícones de Jogo (`game/assets/sprites/icons/`) para Migração ao Estilo 06

- **Status atual:** **1/32** integrado em produção (`ember.png`, `128×128` RGBA sem anéis); **9/32** com candidatos gerados em revisão (`art-source/f1-correcao/`, listados em `docs/arte/paper-icons-review.json`); **22/32** ainda sem candidato em papel recortado.
- **Regra de geração (Regras 6, 16, 17 e 18):** Gerar em lotes de no máximo **10 imagens por rodada**, sempre com `FUMIGA-PAPEL-v4-CHROMA`, fundo de chroma sólido (`#0000FF` ou `#00FF00`), sem moedas/anéis circulares de fundo (ícone recortado na silhueta do objeto), derivado final `128×128` RGBA.

| # | Chave (`IMG`) | Arquivo em `game/assets/sprites/icons/` | Tamanho Atual | Categoria / Onde Aparece | Status Estilo 06 | Lote Sugerido (≤ 10 por rodada) |
| :-: | :--- | :--- | :---: | :--- | :--- | :---: |
| 1 | `i_ember` | `ember.png` | `128×128` | Mutação Brasa Interior / Contínua | **✅ Integrado em produção** | Concluído |
| 2 | `i_food` | `food.png` | `32×32` | HUD Colônia, Ninho, Loja, Eventos | 🟡 Candidato em `art-source/f1-correcao/` | Lote 1 (Revisão/Ajuste sem anel) |
| 3 | `i_essence` | `essence.png` | `32×32` | HUD Colônia, Ninho, Árvore, Profecias | 🟡 Candidato em `art-source/f1-correcao/` | Lote 1 (Revisão/Ajuste sem anel) |
| 4 | `i_shield` | `shield.png` | `32×32` | Mutações de Defesa / Carapaça | 🟡 Candidato em `art-source/f1-correcao/` | Lote 1 (Revisão/Ajuste sem anel) |
| 5 | `i_bolt` | `bolt.png` | `16×16` | Mutações de Velocidade / Reflexo | 🟡 Candidato em `art-source/f1-correcao/` | Lote 1 (Revisão/Ajuste sem anel) |
| 6 | `i_hourglass` | `hourglass.png` | `16×16` | Mutações de Tempo / Recarga | 🟡 Candidato em `art-source/f1-correcao/` | Lote 1 (Revisão/Ajuste sem anel) |
| 7 | `i_snow` | `snow.png` | `32×32` | Mutações de Gelo / Bioma 6 | 🟡 Candidato em `art-source/f1-correcao/` | Lote 1 (Revisão/Ajuste sem anel) |
| 8 | `i_heal` | `heal.png` | `32×32` | Mutações de Cura / Nutriz | 🟡 Candidato em `art-source/f1-correcao/` | Lote 1 (Revisão/Ajuste sem anel) |
| 9 | `i_egg` | `egg.png` | `16×16` | Mutações de Ninhada / Berçário | 🟡 Candidato em `art-source/f1-correcao/` | Lote 1 (Revisão/Ajuste sem anel) |
| 10 | `i_potion` | `potion.png` | `32×32` | Mutações de Alquimia / Seiva | 🟡 Candidato em `art-source/f1-correcao/` | Lote 1 (Revisão/Ajuste sem anel) |
| 11 | `i_crown` | `crown.png` | `16×16` | Mutações da Rainha / Comando Real | 🔴 Pixel art legado (`16×16`) | Lote 2 (Novos candidatos) |
| 12 | `i_clover` | `clover.png` | `16×16` | Mutações de Sorte / Crítico | 🔴 Pixel art legado (`16×16`) | Lote 2 (Novos candidatos) |
| 13 | `i_fire_sword` | `fire_sword.png` | `16×16` | Mutações de Ataque Ardente | 🔴 Pixel art legado (`16×16`) | Lote 2 (Novos candidatos) |
| 14 | `i_fist` | `fist.png` | `16×16` | Mutações de Força / Mandíbula | 🔴 Pixel art legado (`16×16`) | Lote 2 (Novos candidatos) |
| 15 | `i_fungo` | `fungo.png` | `32×32` | Mutações de Fungo / Esporos | 🔴 Pixel art legado (`32×32`) | Lote 2 (Novos candidatos) |
| 16 | `i_horseshoe` | `horseshoe.png` | `16×16` | Mutações de Passo / Fortuna | 🔴 Pixel art legado (`16×16`) | Lote 2 (Novos candidatos) |
| 17 | `i_lock` | `lock.png` | `32×32` | Elementos Bloqueados / Selos | 🔴 Pixel art legado (`32×32`) | Lote 2 (Novos candidatos) |
| 18 | `i_scale` | `scale.png` | `16×16` | Mutações de Equilíbrio / Economia | 🔴 Pixel art legado (`16×16`) | Lote 2 (Novos candidatos) |
| 19 | `i_spider` | `spider.png` | `16×16` | Mutações de Teia / Caçadora | 🔴 Pixel art legado (`16×16`) | Lote 2 (Novos candidatos) |
| 20 | `i_spider_gold` | `spider_gold.png` | `32×32` | Mutações Lendárias de Seda | 🔴 Pixel art legado (`32×32`) | Lote 2 (Novos candidatos) |
| 21 | `i_sun` | `sun.png` | `32×32` | Mutações Solares / Planície | 🔴 Pixel art legado (`32×32`) | Lote 3 (Novos candidatos) |
| 22 | `i_wing_gem` | `wing_gem.png` | `16×16` | Mutações de Agilidade / Asa | 🔴 Pixel art legado (`16×16`) | Lote 3 (Novos candidatos) |
| 23 | `i_sk_acid` | `sk_acid.png` | `16×16` | Habilidade / Mutação Ácido | 🔴 Pixel art legado (`16×16`) | Lote 3 (Novos candidatos) |
| 24 | `i_sk_banner` | `sk_banner.png` | `16×16` | Habilidade / Mutação Estandarte | 🔴 Pixel art legado (`16×16`) | Lote 3 (Novos candidatos) |
| 25 | `i_sk_bomb` | `sk_bomb.png` | `16×16` | Habilidade / Mutação Explosiva | 🔴 Pixel art legado (`16×16`) | Lote 3 (Novos candidatos) |
| 26 | `i_sk_frost` | `sk_frost.png` | `16×16` | Habilidade / Mutação Geada | 🔴 Pixel art legado (`16×16`) | Lote 3 (Novos candidatos) |
| 27 | `i_sk_fury` | `sk_fury.png` | `16×16` | Habilidade / Mutação Fúria | 🔴 Pixel art legado (`16×16`) | Lote 3 (Novos candidatos) |
| 28 | `i_sk_heart` | `sk_heart.png` | `16×16` | Habilidade / Mutação Vitalidade | 🔴 Pixel art legado (`16×16`) | Lote 3 (Novos candidatos) |
| 29 | `i_sk_rico` | `sk_rico.png` | `16×16` | Habilidade / Mutação Ricochete | 🔴 Pixel art legado (`16×16`) | Lote 3 (Novos candidatos) |
| 30 | `i_sk_slash` | `sk_slash.png` | `16×16` | Habilidade / Mutação Golpe Cortante | 🔴 Pixel art legado (`16×16`) | Lote 3 (Novos candidatos) |
| 31 | `i_sk_time` | `sk_time.png` | `16×16` | Habilidade / Mutação Temporal | 🔴 Pixel art legado (`16×16`) | Lote 4 (Novos candidatos) |
| 32 | `i_sk_tornado` | `sk_tornado.png` | `16×16` | Habilidade / Mutação Vendaval | 🔴 Pixel art legado (`16×16`) | Lote 4 (Novos candidatos) |

---

### Tabela C3 — Atlases Pixel Art Legados em `game/assets/ui/lore_*.png`

| # | Arquivo | Dimensões | Uso Residual Atual no Código | Destino na Migração Completa |
| :-: | :--- | :---: | :--- | :--- |
| 1 | `lore_panels.png` | `192×32` | Fallback de `drawBiomeTexture` quando `IMG.paper_panel` não carregou | Substituído pelo par `panel_bg.png` + `panel_frame.png` |
| 2 | `lore_textbox.png` | `224×32` | Fallback de `drawLoreTextbox` quando `IMG.paper_tooltip` não carregou | Substituído pelo par `tooltip_bg.png` + `tooltip_frame.png` |
| 3 | `lore_kit.png` | `280×52` | `drawKitIcon` (check `0`, cross `1`, gema `2` em Opções/Profecias/Memórias/Draft) e `drawWoodBarFrame` | Migrar ícones check/cross/gema para recortes de papel Estilo 06 |
| 4 | `lore_icons.png` | `192×16` | `drawFoodIcon` (ícone de comida por bioma no painel da colônia) e `drawTrailAnt` (formiguinhas caminhando) | Migrar para mini-sprites em papel recortado Estilo 06 |
| 5 | `lore_gaster.png` | `192×24` | Fallback de `drawGasterBar` quando `IMG.paper_health` não carregou | Substituído pelo par `health_bg.png` + `health_frame.png` |
