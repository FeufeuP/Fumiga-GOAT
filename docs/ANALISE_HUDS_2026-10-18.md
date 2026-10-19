# Análise Completa dos HUDs — FUMIGA: Colônia Eterna
**Data:** 2026-10-18 · **Branch:** `arena/73fa72b8-fumiga-goat` · **Autor:** Arena Agent  
**Leituras obrigatórias cumpridas:** `REGRAS_DE_TRABALHO.md` integral (396 linhas) · `GUIA.md` integral (227 linhas, 28 perguntas) · `MEGA_ARQUIVO.md` (índice + registros de HUD) · `AGENTS.md` · `game/README.md`  
**Rota do GUIA:** 13 — menus, HUD, ícones, botões, tipografia e controles PC/mobile (+ rotas 07/19 subsidiárias)

---

## 1. Resumo Executivo

O sistema de HUD do FUMIGA está em **transição controlada** entre o legado procedural escuro (quitina roxa `lore_*` 9-slice) e o **Estilo 06 — Papel Recortado Pastel Terroso** (`FUMIGA-PAPEL-v4-CHROMA`). O motor atual já impõe as duas regras mais recentes do projeto:

- **Regra 21 — O texto se adapta ao HUD** (sprite nunca deforma; texto quebra→encolhe→abrevia dentro da área permitida `paperQuiet()` via `fitTextBlock`).
- **Regra 22 — HUDs no formato original do sprite, nunca deformados** (render `contain + centralizado` via `paperFit`; proibido fatiar/esticar/corredores elásticos; área permitida medida e guardada em `PAPER_QUIET`).

**15 locais específicos** já estão roteados no código (`game/js/paper_hud.js:27-44`, `game/js/game.js:1951-2653`, `PLANO_HUDS_DISTINTOS_E_CAMADAS.md`). **7 têm arte própria** (panel, health, banner, minimap, tooltip, card, pause) em **arquitetura 2-peças** (`*_bg.png` + `*_frame.png` com centro vazado). **8 estão com fallback ativo** e aguardam geração dedicada sem reutilizar `panel`/`banner`.

**Grupo A (RUN)** — 100% migrado para 2-peças + bordas finas + redução de área (~27–44%).
**Grupo B (16 HUDs)** — geometria fora da proporção nativa (cobertura de 6% a 99%, ver tabela do `PLANO_CORRECAO_HUDS_GRUPOS_B_C.md`).
**Grupo C (~10 painéis + 32 ícones)** — ainda procedural escuro / pixel legado, mapeado para migração futura.

Nenhum HUD está deformado no Grupo A (guarda `paper-hud-browser.mjs` mede alfa em formatos diferentes). A arquitetura de **3 camadas estritas** `Fundo > Texto (clipado) > Moldura` já está ativa no motor.

---

## 2. Arquitetura Técnica Vigente

### 2.1. Arquivo central: `game/js/paper_hud.js` (392 linhas)
| Componente | O que faz | Linhas-chave |
|---|---|---|
| `PAPER_NATIVE_SIZE` | Dimensões nativas reais por família (ex.: panel 960×512, health 960×135, card 848×1264) — corrige o fallback quando IMG não carregou | 46-64 |
| `PAPER_QUIET` | Área permitida de papel liso medida pixel-a-pixel, frações [x0,y0,x1,y1]. Todo texto fica centralizado aqui | 27-44 |
| `PAPER_APERTURE` | Janela vazada da moldura `*_frame.png` onde o conteúdo clipado aparece | 66-84 |
| `PAPER_FALLBACK` | Mapeia 8 kinds novos para arte existente (ex.: expanded→panel, boss→banner) | 85-92 |
| `paperFit(sw,sh,w,h)` | `contain + centralizado` — escala uniforme `min(w/sw, h/sh)`, retorna `{fw,fh,ox,oy,scale}` | 133-138 |
| `paperQuiet(kind,x,y,w,h)` | Mapeia `PAPER_QUIET` sobre o `paperFit` real → retângulo de destino para `fitTextBlock` + `drawText(align:center)` | 143-157 |
| `paperAperture(...)` | Idem para a janela clipada (`clipRect` da 2ª camada) | 162-178 |
| `tileFor()` + `MAX_PIXELS=8M` | Cache de tiles com recorte 3-faixas para botões de madeira e `contain` para painéis; estouro evicta LRU | 181-265 |
| `drawPaper(kind,x,y,w,h,opt)` | Roteia botões → `wood_button_{size}_{estado}` (placas de madeira, 20 PNGs). Painéis → 2-peças. layer `both/bg/frame` | 263-300 |
| `drawPaperBg` / `drawPaperFrame` | Camada 1 (fundo creme) e Camada 3 (moldura vazada) separadas | 301-306 |
| `deferPaperFrame` + `flushPaperFrames` | Fila diferida: `panel()`/`dialogBox()` desenham `bg` imediatamente e agendam `frame` por cima dos `drawText` subsequentes; `game.js`/`meta.js` fazem `flush` no fim do quadro | 308-338 |
| `beginPaperHud` / `endPaperHud` | Pilha explícita: desenha `bg`, faz `ctx.clip()` em `paperAperture`, empilha; `end` faz `restore()` e desenha `frame` por cima | 347-369 |
| `drawPaperBar` | Barra de vida Gaster: `health_bg` → fill colorido em `paperAperture` → `health_frame` | 370-392 |

**Princípio de render sem distorção (2026-10-16):** a fonte nunca é esticada. O que sobra do retângulo pedido vira margem transparente. Chamadores DEVEM passar caixas na proporção da pintura ou usar `paperFit` para calcular.

### 2.2. Primitivos de UI: `game/js/ui.js` (535 linhas)
| Primitivo | Papel nas Regras 21/22 |
|---|---|
| `panel(ctx,x,y,w,h,opt)` | Se `opt.paper !== false` tenta `drawPaper`/`deferPaperFrame`; senão fallback vetorial com sombra+gradiente+chanfro (usado só quando `paper_*` não carregou ou é `paper:false`) |
| `button(ctx,opt)` | Se `style:"text"` → modo Dead Cells (Título só texto + losango); senão placa de madeira via `drawPaper('button',...)`. Texto sempre via `drawText(align:center, maxWidth=w)` dentro de margens de madeira; fallback vetorial se `drawPaper` retorna `false` (após exclusão de `button.png` 2026-10-14) |
| `iconButton` | Usa `paperKind:"wood_icon"` → `wood_mini_*`; hitbox expansível mas limitada por `maxPadX/maxPadY` para grades |
| `dialogBox` | Idem `panel` + linha decorativa se `opt.title`; usado por `drawPause` (2 colunas), `drawEnd`, `PROPHECY` etc. |
| `tooltip(ctx,x,y,lines,opt)` | **Geometria fixa** `w = min(VIEW_W-20, 280)` e `h = w*475/960` (proporção nativa 960×475 do `tooltip.png`). `beginPaperHud('tooltip',...)` + `paperQuiet` + `fitTextBlock` para título e corpo |
| `bar` | Tenta `drawPaperBar`; senão procedural escuro |
| `hitRect` / `touchPad` / `clampToView` | Toque: hitbox cresce até 61px canvas com `HIT_PAD=10`, mas nunca sai do canvas; evita sobreposição de alvos vizinhos |

### 2.3. HUD orgânico por bioma: `game/js/lore_hud.js` (603 linhas)
- `BIOME_HUD` — 7 temas: planicie, floresta, pantano, deserto, outono, gelo + `colonia` (menus). Cada um tem `border`, `bg`, `bg2`, `accent`, `foodLabel`, `essenceLabel`, etc.
- `drawBiomeTexture` → tenta `drawPaper('panel',...)`; fallback para `drawPaper`-less 9-slice `lore_panels/textbox` com muda de quitina (`MOLT_DUR=0.6s` dissolve + fio de luz)
- `drawGasterBar` → tenta `drawPaperBar('health',...)`; fallback desenha gaster orgânico elíptico com coroa fungo/seda + pulsação `low` + veias
- `drawWoodBanner` → tábua-seta do bioma via `lore_kit.png` (7 banners 40×24)
- `drawPheromoneOverlay` / `drawPheromoneLegend` / `drawScentMinimap` / `drawTreeRings` — overlays sensoriais (H) com cache pré-rasterizado 30Hz e mapa 50×38 a 10Hz

### 2.4. Tipografia: `game/js/font.js` (416 linhas)
- **Kiwi Soda TTF** (`game/assets/font/KiwiSoda.ttf` via `FontFace`, falha = erro). Cache de `textMetrics` e `lineCanvas` (600 entradas).
- `fontScale()` → 1.3 quando `accessibility.bigFont` ligado; **toda** medida passa por ele.
- `fitTextBlock(paras, maxW, maxH, {scale, minScale, lineStep})` — tenta escalas `scale → minScale` passo 0.05; se ainda não cabe, trunca com `"..."`. Retorna `{lines, scale, step}` garantido dentro de `maxH`.
- `paperAt(ctx,x,y)` + `registerPaperSurface` + `resolveFontColor` — tinta sépia `#493521` sobre papel, roxo claro `#efe9ff` sobre fundo escuro; `drawText` detecta automaticamente se o centro do texto está sobre papel.
- `layoutBox` / `layoutRec` — gravador de auditoria para `game/test/layout-browser.mjs` (detecta texto fora da tela, vazando, colidindo, botão cobrindo toque).

---

## 3. Inventário Completo Tela-a-Tela

### 3.1. RUN — Expedição (o coração do jogo, `game/js/game.js:1945-2530`)
| # | HUD / Elemento | `kind` | Caixa no 960×540 | Proporção nativa | Arte própria | Arquivos físicos | Como funciona hoje | Estado |
|---|---|---|---|---|---|---|---|---|
| **R1** | Painel Principal da Colônia | `panel` | `270×144` em `(8,6)` | 960×512 (1.875:1) | ✅ | `panel_frame.png` 404KB + `panel_bg.png` 749KB | `beginPaperHud('panel')` → `paperQuiet` → 4-5 linhas `modeDef` + `qCol` 176×86 + botão hudMore como `wood_icon` dentro de `qCol` | ✅ Grupo A, bordas finas, -44% área |
| **R2** | Painel Expandido de Feromônio (botão `+`) | `expanded` | `270×144` em `(8,154)` | 960×512 (1.875:1) | ⏳ fallback→panel | — | Mesmo `paperQuiet('panel')`; botão `OLFATO` `qE.w-4 × 20px` dentro de `qE`; espaçamento vertical ajustado | ✅ Geometria + texto OK, arte dedicada pendente |
| **R3** | Banner de Onda/Trilha | `banner` | `320×64` em `(320,4)` | 960×192 (5:1) | ✅ | `banner_frame 238KB` + `banner_bg 223KB` | `beginPaperHud('banner')` + `paperQuiet('banner')` → título + barra progresso + `drawTrailAnt` (7 formiguinhas) | ✅ -29% área |
| **R4** | Banner do Chefão | `boss` | `340×68` em `(310,72)` | 960×192 (5:1) | ⏳ fallback→banner | — | Idem banner, usa `paperQuiet('boss')` [.200,.260,.835,.760] | ✅ Roteado, arte pendente |
| **R5** | Banner de Evento/Bioma | `event` | `400×80` em `(280,148)` | 960×192 (5:1) | ⏳ fallback→banner | — | `paperQuiet('event')` [.200,.250,.835,.765] | ✅ Roteado, -49% área |
| **R6** | Minimapa | `minimap` | `168×125` em `(786,4)` | 960×717 (1.34:1) | ✅ | `minimap_frame 655KB` + `minimap_bg 1099KB` | **3 camadas reais:** `drawPaperBg` → mapa+entidades `ctx.clip(paperAperture)` → `drawPaperFrame` por cima → rótulo bioma em `paperQuiet` | ✅ -35% área, clip exato |
| **R7** | Barra de Vida Gaster | `health` | `w×barH` (barH = `min(h*1.18, w*135/960)` ) | 960×135 (7.11:1) | ✅ | `health_frame 92KB` + `health_bg 107KB` | `drawPaperBar` → `health_bg` → fill gradiente em `paperAperture('health')` → `health_frame`; modo procedural quitina como fallback | ✅ Slim apertures [.117,.267,.899,.726] |
| **R8** | Tooltip da Loja (irmãs) | `tooltip` | `240×119` em `(10, footY-127)` | 960×475 (2.02:1) | ✅ | 459KB+698KB | `beginPaperHud('tooltip')` → `paperQuiet('tooltip')` → título + descrição via `fitTextBlock` | ✅ -27% área |
| **R9** | Barra superior/inferior RUN | — | faixa `160,416,640×18` | — | ❌ procedural | — | `fillRect rgba(10,8,16,0.65)` dicas iniciais (Grupo C, C1.7) | ⚠️ A migrar para `banner` |
| **R10** | Legenda Feromônio H | — | `256,418,448×26` | — | ❌ procedural | — | `lore_hud.js drawPheromoneLegend` `fillRect #100c1c` (C1.6) | ⚠️ Banner futuro |
| **R11** | Cartão de Tutorial (dinâmico) | `tutorial` | `285×152` em `(338,68)` | 960×512 (1.875:1) | ⏳ fallback→panel | — | `beginPaperHud('tutorial')` → `paperQuiet('tutorial')` [.195,.200,.860,.800] → título+desc `fitTextBlock` + botão PULAR (T) em placa madeira 88×18 | ✅ -41% área, roteado |
| **R12** | Cartas de Draft (mutação) | `card` | `260×387` | 848×1264 (0.67:1 retrato) | ✅ | `card_frame 979KB` + `card_bg 1763KB` | `card_frame` 3-camadas; nome+desc+requisito em `paperQuiet('card')` [.305,.165,.855,.820]; tecla 1..3 em `wood_icon` 20×20; `card.png` legado ainda existe | ✅ 55% largura útil (era 38%) |
| **R13** | Placa de Transição de Mapa | `transition` | `560×386` em `(200,84)` | 960×662 (1.45:1) | ⏳ fallback→minimap | — | `beginPaperHud('transition')` roteado mas caixa atual `1.451:1` vs nativa `0.806:1` de `pause` → desenha só `311×386` (56% cobertura) — **BUG B1 do Grupo B** | ❌ Caixa deformada, ver §5 |
| **R14** | Opacidade Contextual | — | — | — | — | — | `hudContextAlpha` em `game.js:1925` — se unidades sob painel e mouse fora, alfa 0.82-0.86 (evita cobrir formigas) | ✅ |

**HUDs do RUN: 14 elementos, 7 com arte própria, 6 roteados com fallback, 1 bug crítico de proporção (R13). Todos os textos já usam `paperQuiet` + `fitTextBlock` no Grupo A.**

### 3.2. PAUSA — `game/js/game.js:2706-2855` (`drawPause`)
- **Layout:** 2 colunas centralizadas: `leftW 355` + `rightW 355` + gap 24, `py 48` (mobile 20), `panelH 440` (mobile 560).
- **Esquerda:** `dialogBox paperKind:"pause"` 960×1200? Nativa `928×1152` (0.806:1) → caixa `355×440` = 0.807:1 → **100% cobertura** ✅. Título `PAUSA`, 6 botões (`CONTINUAR #37e6c8`, `OPÇÕES #ffb347`, `ÁRVORE #c77dff`, `COMO JOGAR #6db7ff`, `REINICIAR #ffb347`, `SAIR #ff4d5a`) — todos `button()` → placas de madeira `grande`.
- **Direita:** idem `dialogBox pause` + sub-moldura minimapa `panel paper:false` (procedural escuro, B8 duplicado). Stats expandidos (modo, mapa, onda, nível, essência, pop, FOME/GUERRA/CURA, rally cooldown). **B8** recomenda remover dupla moldura e usar `minimap` 2-peças.
- **Guarda:** `paper-hud-browser` valida 5 estados distintos por placa de madeira.

### 3.3. TREE / SANTUÁRIO — `game/js/meta.js:351-900`
| Elem. | Código | Caixa | Arte | Problema |
|---|---|---|---|---|
| Cabeçalho esquerdo Árvore | `panel(ctx,12,10,366×82)` | 4.463:1 | panel 1.875:1 → `154×82` (42% cobertura) | **B12** — trocar para `banner` 5:1 `380×76` |
| Painel Essência Árvore | `panel(ctx,386,10,154×82)` | 1.878:1 | panel 1.875:1 → 100% ✅ | B13 só falta centralizar em `paperQuiet` 90×33 |
| Coluna Galhos I-V | `panel(ctx,12,100,164×386)` | 0.425:1 | card 0.67:1 → 63% | **B14** — remover panel de fundo, manter só `wood_button` |
| Rodapé Zoom/Dicas | `panel(ctx,12,492,936×44)` | 21.27:1 | panel → 83×44 (9%) | **B15** — banner para dica + botões madeira separados |
| Painel Detalhe Nó / Flor | `panel(ctx,608,100,340×386)` / `738,116,210×382` | 0.88/0.55:1 | card 0.67:1 → 76%/82% | **B16** — usar `pause` 0.806:1 (`311×386` / `250×310`) + `paperQuiet('pause')` |
| Cabeçalho Fruto + Selo Pálida | `panel(ctx,12,8,936×82)` / `112,419,736×76` | 9.75/9.68:1 | panel → 19% cada | **B17** — banner dedicado `480×96` / `460×92` |
| `tree_detail` / `header` kinds | `PLANO_HUDS_DISTINTOS` já reserva esses kinds mas arte ainda não gerada | 680×924 / 960×120 nativas | — | 8 novos HUDs §6 |

**Todos os botões da Árvore já são `wood_button` individuais; falta alinhar as molduras externas.**

### 3.4. NINHO — `game/js/nest.js:762-1065` (`drawNestHud` + `nestDraw`)
- **Barras superior/inferior:** `fillRect rgba(8,6,4,0.82)` + linha roxa `#4a3a6e` — **C1.2/C1.3** → migrar para prancha terrosa `#2b1e14`/`#493521` ou `banner` em 2-peças.
- **Pílulas nome/custo câmaras:** `fillRect rgba(10,7,4,0.78)` pequenas — **C1.5** → `wood_button` informativo ou `banner` compacto.
- **Tooltip da Câmara:** `256×136` (era `340×181`, -43.4%) já roteado como `nest_tip` (fallback panel) com `beginPaperHud('nest_tip')` + `paperQuiet` — **já conforme Grupo A** (mesma arte `panel` 960×512, `quiet [.205,.200,.855,.800]`).
- **Janela PiP "OLHO LÁ FORA":** `drawOutsideEye` 300×170 + faixas `rgba(10,8,16,0.86)` — **C1.4** → 2-peças `minimap` com `clip`.
- **Barras internas das câmaras:** `bar() → drawPaperBar` com `width 120×9` etc. → razão `13:1` vs nativa `7.11:1` da `health.png` → desenha `64×9` (53% largura) — **B18** — passar `114×16` para 100%.

### 3.5. TITLE — `game/js/game.js:1200-1320` (`renderTitle`)
- **4 botões:** `style:"text"` — só texto `#cdc3e0→#ffffff`, escala `1+0.08*q`, deslize 6px, losango na cor `accent` quando `selected`/`hot`, hitbox invisível `350px` (460px com FONTE GRANDE). **Sem HUD atrás** (decisão Dead Cells 2026-10-10, revalidada 2026-10-16 após cache stale). Modo texto validado por `title-parallax.mjs` + capturas PC/mobile/hover.
- **Faixa "COLÔNIA ETERNA":** `drawTitleLogo()` — 4 faixas metal dourado, glow pulsante, varredura 4.6s + sparkle.
- **Rodapé Acessibilidade** (`footerY, 936×32/44`): `panel paperKind:"header"` → **B2** 29:1 vs nativa 1.875:1 → desenha `60×32` (6% cobertura) — miniatura solta no centro. Recomendação: `banner` `220×44` no canto ou `paper:false`.
- **Barra Ascensão (MODE):** `panel 220,462,520×44` → **B3** 11.8:1 → `83×44` (16%) — `banner 320×64`.
- **Rodapé MODE:** `936×28` → **B4** `53×28` (6%) — idem.
- **Fundo:** parallax 4 camadas 1280-wide + ciclo dia/noite 60s + vaga-lumes + essência — não é HUD, mas interage com o `panel` do rodapé.

### 3.6. MODE — `game/js/game.js:1277-1310` + `game/js/render.js:drawModeCards`
- **Cartões Campanha/Modo Teste:** `drawModeCards` — cartões `360×340` com 2-peças? **C1.1** mostra que ainda são `fillRect #1d1730/#2c2144` procedural escuro + borda roxa + topo colorido 4px. **C1.1** → migrar para `pause` 2-peças `274×340`.
- **Barra Ascensão / Rodapé:** ver B3/B4 acima.
- **Controles swipe/dots:** dots `8px` `#ffd479` vs `rgba(255,255,255,0.25)`.

### 3.7. OPTIONS / HELP / PROPHECY / MEMORY — `game/js/game.js:1321-3180`
| Tela | Caixa principal | Razão | Cobertura | Diagnóstico |
|---|---|---|---|---|
| **OPTIONS** | `24,16,912×508` panel | 1.795:1 vs 1.875:1 → 96% ✅ | `912×486` (oy 11) — quase 100%. Falta alinhar abas `optViewport()` e botões rodapé à área interna | **B5** marginal |
| **OPTIONS optNote** | `TX,y,828×40` | 20.7:1 → 75×40 (9%) | **B6** — `banner` ou sub-caixa `paper_bg` sem moldura | ❌ Miniatura |
| **HELP** | `32,20,896×484` panel | 1.851:1 vs 1.875:1 → 99% ✅ | `896×478` (oy 3) — OK, só confinar 2 colunas + botão VOLTAR em `paperQuiet` | **B7** OK |
| **PAUSE** | 355×440 pause | 0.807:1 vs 0.806:1 → 100% ✅ | Perfeito | ✅ |
| **END (Vitória/Derrota)** | `40,10,880×520` | 1.692:1 vs 1.875:1 → 90% `880×469` | **B9** — `880×469` + stats/botões em `paperQuiet` | ❌ 90% |
| **PROPHECY header** | `12,10,426×88` + `440,10,160×70` | 4.84:1 / 2.28:1 → 39%/82% | **B10** — `banner 430×86` + panel `154×82` | ❌ |
| **MEMORY externo** | `24,16,912×508` | 1.795:1 → 96% | **B11** — remover `dialogBox` externo (como PROPHECY faz) | ⚠️ Redundante |
| **PROPHECY/MEMORY cards** | `360×192` | 1.875:1 vs 1.875:1 → 100% ✅ | Cartões 100% + `paperQuiet panel` + `fitTextBlock` (já corrigido 2026-10-16) | ✅ |

### 3.8. LOADING / BOOT / PRETITLE / CUTSCENE
| Tela | Arquivo | HUD atual | Arquitetura |
|---|---|---|---|
| **BOOT** `drawLoading` | `main.js` | `360×24` `fillRect #1d1730` barra | C1.10 → paleta terrosa futura |
| **PRETITLE** `drawPreTitle` | `render.js` | `cx-tw/2-20,y,tw+40×28 rgba(0,0,0,0.4)` | C1.10 → placa madeira ou texto TITLE |
| **LOADING** `drawLoadingScreen` | `loading_screen.js:474` | Badge topo `28,22,w×54 rgba(10,8,18,0.72)` + painel base `28,382,904×136` | **C1.8** → `banner` topo + `health` barra 12 blocos |
| **CUTSCENE** `drawCutscene` | `cutscenes.js` | Topo `14,6,w×22` + Narração `60,384,840×92 rgba(10,8,18,0.68)` | **C1.9** → pergaminho `banner/tooltip` + botão `PULAR` `pequeno` madeira |

---

## 4. Estado dos Sprites de HUD (físico no disco)

`game/assets/ui/paper/` — 14 PNGs ativos + pasta `wood/` (20 placas):
```
panel.png         804 KB  960×512  RGBA  (legado, ainda carregado como fallback)
panel_frame.png   404 KB  960×512  RGBA  centro vazado  α0
panel_bg.png      749 KB  960×512  RGBA  centro opaco α255
banner.png        304 KB  960×192
banner_frame.png  238 KB  960×192  α0
banner_bg.png     223 KB  960×192  α255
minimap.png      1058 KB  960×717
minimap_frame.png 655 KB  960×717  α0
minimap_bg.png   1099 KB  960×717  α255
tooltip.png       701 KB  960×475
tooltip_frame.png 459 KB  960×475  α0
tooltip_bg.png    698 KB  960×475  α255
card.png         1788 KB  848×1264
card_frame.png    979 KB  848×1264
card_bg.png      1763 KB  848×1264
health.png        203 KB  960×135
health_frame.png   92 KB  960×135
health_bg.png     107 KB  960×135
pause.png        1680 KB  928×1152
pause_frame.png  1698 KB  928×1152
pause_bg.png     1768 KB  928×1152
wood/button_{largo,grande,pequeno,mini}_{normal,hover,pressionado,selecionado,desabilitado}.png  20 arquivos  ~1.18 MB
```
Total papel ≈ 17 MB crus. `ASSET_V` atual: `20261014-botao-duas-pontas` (261 arquivos / 32.6 MB com `make_assets_list`).

Excluído em 2026-10-14: `button.png` 960×238 400KB (`paper_button`) — botões agora são **exclusivamente** placas de madeira `wood_button_*`. Guardas `paper-hud-browser.mjs:botaoRemovido` + `hud-publication.mjs` reprovam retorno.

Atlas legado ainda carregados como **fallback**:
- `lore_panels.png 192×32`, `lore_textbox.png 224×32`, `lore_kit.png 280×52`, `lore_icons.png 192×16`, `lore_gaster.png 192×24` → substituídos progressivamente por `*_bg/frame` (Tabela C3). Mantidos para teste headless sem `IMG.paper_*`.

---

## 5. Diagnóstico Consolidado: Grupos B e C

### 5.1. Grupo B — 19 HUDs com geometria fora da proporção (2026-10-16)
*Fonte: `docs/arte/PLANO_CORRECAO_HUDS_GRUPOS_B_C.md` + auditoria geométrica própria*

| ID | Tela → Componente | Caixa `w×h` | Razão | Nativa esperada | Desenho real | Cobertura | Severidade | Correção |
|---|---|---|---|---|---|---|---|---|
| B1 | RUN → Transição Mapa | 560×386 | 1.45 → pause 0.806 | `660×352` panel | 311×386 | 56% | 🔴 Alta | `panel 660×352` + `paperQuiet` |
| B2 | TITLE → Rodapé Acess. | 936×32 | 29.25 → panel 1.875 | `banner 220×44` | 60×32 | 6% | 🔴 Alta | `banner` canto ou `paper:false` |
| B3 | MODE → Barra Ascensão | 520×44 | 11.8 → panel | `banner 320×64` | 83×44 | 16% | 🔴 Alta | `banner` + `paperQuiet` |
| B4 | MODE → Rodapé Dica | 936×28 | 33.4 | `banner` ou `false` | 53×28 | 6% | 🟡 Média | faixa translúcida |
| B5 | OPTIONS → Diálogo principal | 912×508 | 1.795 vs 1.875 | `912×486` panel | 912×486 | 96% | 🟢 Baixa | só ajustar `oy 11` |
| B6 | OPTIONS → Aviso | 828×40 | 20.7 | `banner` compacto | 75×40 | 9% | 🔴 Alta | sub-caixa `paper_bg` |
| B7 | HELP → Diálogo | 896×484 | 1.85 vs 1.875 | `896×478` | 896×478 | 99% | 🟢 Baixa | confinar colunas |
| B8 | PAUSA → Mini-moldura | 308×164 | 1.99 vs panel | `minimap` 2-peças | 308×164 | 94% | 🟡 Média | `minimap_frame` vazada |
| B9 | END → Vitória/Derrota | 880×520 | 1.69 | `880×469` panel | 880×469 | 90% | 🟡 Média | `880×469` + `paperQuiet` |
| B10 | PROPHECY → Header+Essência | 426×88/160×70 | 4.84/2.28 | `banner 430×86`/`panel 154×82` | 165×88/131×70 | 39%/82% | 🔴 Alta | dois kinds separados |
| B11 | MEMORY → Externo | 912×508 | 1.795 | remover dialog | — | 96% | 🟡 Média | grade direta |
| B12 | TREE → Header esq. | 366×82 | 4.46 | `banner 410×82` | 154×82 | 42% | 🔴 Alta | `banner` |
| B13 | TREE → Essência | 154×82 | 1.878 | 1.875 | 154×82 | 100% ✅ | 🟢 OK | só centralizar 90×33 |
| B14 | TREE → Galhos I-V | 164×386 | 0.42 vs card 0.67 | sem panel | 164×244 | 63% | 🟡 Média | remover fundo |
| B15 | TREE → Rodapé | 936×44 | 21.27 | `banner` | 83×44 | 9% | 🔴 Alta | `banner` + `wood_button` |
| B16 | TREE/SANT → Detalhe Nó | 340×386/210×382 | 0.88/0.55 vs 0.67 | `pause 311×386`/`250×310` | 259×386/210×313 | 76%/82% | 🔴 Alta | `pause` + `paperQuiet` |
| B17 | SANT → Header/Selo | 936×96/736×76 | 9.75/9.68 | `banner 480×96`/`460×92` | 180×96/143×76 | 19% | 🔴 Alta | `banner` panorâmico |
| B18 | NEST → Barras câmaras | 120×9 | 13.3 vs 7.11 | `health 114×16` | 64×9 | 53% | 🟡 Média | `114×16` |
| B19 | Motor → Fallback `paperQuiet` | ih=512 genérico | — | mapa `PAPER_NATIVE_SIZE` | — | — | ✅ Corrigido | já usa nativa real |

**Causa raiz:** todos os B chamam `panel(ctx, ..., {paperKind default panel})` com `w/h` que não corresponde à pintura escolhida por `paperSource`. Como o render é `contain`, a pintura fica miniaturizada centralizada e o texto extrapolava para margens transparentes. A correção é trocar `paperKind` e ajustar `w/h` para a razão nativa listada acima + envolver textos em `paperQuiet()`.

### 5.2. Grupo C — Painéis procedurais escuros e ícones pixel (migração futura)
| Bloco | Quantidade | Estilo atual | Alvo Estilo 06 2-peças | Prioridade |
|---|---|---|---|---|
| Painéis (MODE cards, NEST barras, PiP, Loading, Cutscene, Boot/Pretitle, RUN faixas) | 10 tabelados (C1.1–C1.10) | `fillRect #1d1730/#0a0812/rgba(10,8,16,0.82)` borda roxa `#4a3a6e` | `panel/pause/card/minimap/banner/health` + barra `health_bg/frame` | Alta: C1.1–C1.4, Média: C1.2–C1.9 |
| Ícones `game/assets/sprites/icons/` | 32 (1 integrado) | `ember.png` 128×128 RGBA sem anéis ✅; 9 candidatos `art-source/f1-correcao/` 🟡; 22 legados 16-32px pixel 🔴 | papel recortado 128×128 sem anel, fundo chroma, 4 lotes ≤10 | Alta: lote1 (food/essence/shield/bolt/hourglass/snow/heal/egg/potion), Média: lotes 2-4 |
| Atlas `lore_*` | 5 | Procedural 9-slice quitina/madeira kit | Substituídos por `*_bg/frame` pares + ícones de papel | Baixa (fallback útil) |

---

## 6. Plano dos 8 Novos HUDs Distintos (pronta para execução)

*Fonte: `docs/arte/PLANO_HUDS_DISTINTOS_E_CAMADAS.md` — decisão `eight_new_huds_all_screens` (2026-10-16)*

Todos já roteados no código com `PAPER_FALLBACK` ativo. A próxima sessão precisa **apenas gerar** as 8 artes:

| # | `kind` exclusivo | Local | Nativa | Fallback | Identidade visual (folhas grandes) | Rodada `offer_options` |
|---|---|---|---|---|---|---|
| 1 | `expanded` | Painel ExpandidoFeromônio RUN | 960×512 (15:8) | panel | Casca+raízes+resina âmbar, musgo sálvia, entalhes trilha | R1-1 |
| 2 | `tutorial` | Cartão Tutorial RUN | 960×512 (15:8) | panel | Bétula/carvalho + samambaia+broto dourado | R1-2 |
| 3 | `boss` | Banner Chefão RUN | 960×192 (5:1) | banner | Madeira ancestral escura+raízes retorcidas+folhas outono | R1-3 |
| 4 | `event` | Banner Evento RUN | 960×192 (5:1) | banner | Tábua cerimonial+flores silvestres+vinhas | R2-1 |
| 5 | `transition` | Placa Transição Mapa | 960×662 (1.45:1) | minimap | Marco travessia+carvalho+folhas+sementes aladas | R2-2 |
| 6 | `nest_tip` | Tooltip Formigueiro NEST | 960×512 (15:8) | panel | Raízes subterrâneas+cogumelo âmbar+musgo caverna | R2-3 |
| 7 | `tree_detail` | Painel Árvore/Santuário | 680×924 (0.736:1) | card | Ramos floridos+folhas+botões florais, trilhos laterais finos ↔ sem faixa grossa esq. de `card` | R3-1 |
| 8 | `header` | Faixa Cabeçalho TREE/SANT/PROPHECY | 960×120 (8:1) ultra-wide | banner | Folhas grandes+vinhas nas pontas, trilhos finos topo/baixo | R3-2 |

**Contrato de geração:** `FUMIGA-PAPEL-v4-CHROMA` integral + ficha + `aperture/quiet` acima; fundo **azul chroma #0000FF** na volta + janela vazada; `offer_options:true` (máx. 3 por mensagem) → `tools/prepare_two_piece_hud.py` → 16 PNGs RGBA → `game/js/assets.js` + `make_assets_list` → verificação `paper-hud-browser` + Drive backup.

**O que muda visualmente:** cada local terá moldura com **ornamento botânico grande e distinto** (casca vs bétula vs raízes retorcidas vs cogumelo), mas paleta e viga fina internas coerentes — elimina o problema de "um HUD reutilizado em vários lugares".

---

## 7. Botões: Placas de Madeira

*Fonte: `docs/arte/botoes-madeira.json`, `game/js/paper_hud.js:81-91`, `game/mobile/mobile.css`*

- **Inventário:** 4 tamanhos × 5 estados = 20 PNGs: `largo 640×104`, `grande 480×110`, `pequeno 340×84`, `mini 144×144`. Classificação automática `woodButtonSize(w,h)` (mini se w≤76 e w/h≤1.9; pequeno se h≤30 ou w<175; largo se w≥250 ou w/h≥5.8; senão grande).
- **Render:** 3 faixas horizontais (cap 18–30% cada ponta com prego+folha preservados, centro estica). Estados são **artes separadas** (normal/hover/pressionado `#493521→#f6ecd4`/selecionado com selo ✓/desabilitado esmaecido), nunca tingimento por código.
- **Mobile:** `game/mobile/mobile.css` usa `wood/button_mini_normal.png` e `:active` → `button_mini_pressionado.png` com `drop-shadow`.
- **Título:** isento de placa (só texto + losango); demais telas 100% madeira, inclusive abas de OPTIONS, M1-M6 do Modo Teste, PAUSA e NEST.
- **Cobertura:** `paper-hud-browser` exige 5 hashes pixel-distintos + fundo recortado + selo opaco.

---

## 8. Tipografia, Acessibilidade e Texto

- **Máxima de HUD:** `PAPER_QUIET` (largura útil 55–65.5% de `card`, 39–60% de `panel`; altura útil 65.5–68%) evita que texto encoste em vinhas/nós. Todo `drawText` de HUD usa `align:center` em `tCx = q.x+q.w/2` + `maxWidth=q.w` + `fitTextBlock`.
- **Fluxo Regra 21:** `wrapText` (quebra por palavras usando `textWidth` real da TTF) → `fitTextBlock` (tenta escalas até `minScale 0.5-0.62`) → `"..."` se ainda não cabe. Nunca sai da área `paperQuiet`.
- **FONTE GRANDE:** `fontScale()=1.3` amplia toda medida; caixas NÃO mudam (o texto dobra mais linhas e encolhe escala). Verificado em `npm run inspect:layout` 118 estados (PC 1280×720, mobile 844×390, normal+grande).
- **Contraste:** `resolveFontColor` mapeia `#efe9ff→#493521` sobre papel creme; `#ffd479→#8b4e18` para títulos; `#776348` para dim; garante legibilidade WCAG sobre papel claro.
- **Auditoria:** `layoutRec` grava tinta real (ink box via `measureText actualBoundingBox*` + `getTransform`); `debug.js:FUMIGA.auditarLayout()` classifica colisões/vazamentos/cobertura por toque.

---

## 9. Mobile e Input

- **Runtime compartilhado:** `game/mobile/index.html` importa os mesmos `game/js/*.js`; não duplica balanceamento/mutações/árvore/HUDs.
- **Única camada móvel:** `game/mobile/touch.js` → `touchMode.on=true`, gestos → `mouse.*`/`WASD`, botões virtuais (`CENTRO`/`RALI`/`PAUSA`/nível `HUD virtual`).
- **Hitbox vs desenho:** `hitRect` cresce até 61px canvas + `HIT_PAD=10` sem mudar `panel()`; `iconButton` limita `maxPadX/Y` em grades (draft `360×192` com `SHOP_PITCH 42`).
- **Tutorial mobile:** `stepDesc` troca `desc` → `descTouch` automaticamente quando `touchMode.on`.
- **Teste:** `npm run inspect:ui` e `node game/test/mobile.mjs` (HEADLESS touch traduz tap/arraste/pinça → PC states).

---

## 10. Validação e Testes Automatizados

| Suite | O que cobre de HUD | Status |
|---|---|---|
| `npm test` (37 testes, ~80s) | `paper-hud-browser` (13 combinações: proporção, alfa, estados), `hud-publication` (SHA RGBA), `hud-publication-browser` (Brasa real + tooltip + CONTINUAR), `layout` (118 estados sem sobreposição), `title-parallax` (TITLE `style:text` sem placa), `psx-filter-browser` | 37/37 verde (com Playwright) |
| `layout-browser.mjs` | Fotografa todas as telas PC/mobile × normal/grande; mede `PAPER_QUIET` vs texto | 118 estados limpos (4 prévios corrigidos em TITLE) |
| `paper-hud-browser.mjs` | Pintura inteira `contain` (sem deformar), área permitida dentro da caixa, 5 estados distintos, fundo transparente exterior / miolo opaco interior, botões duas-pontas opacas | Guarda Regra 22 |
| `uitest` / `browser-waits` | `waitForFunction(async` proibido; `importGameModules` + `MOD.ui` sincrônico | Evita race |

---

## 11. Recomendações por Prioridade

### P0 — Bloqueadores visuais hoje
1. **B1 (Transição Mapa)** — trocar `pause` por `panel` `660×352` em `(150,94)` e envolver título/textos/botão em `paperQuiet('panel',150,94,660,352)`. Hoje vaza 125px/lado.
2. **B2, B10, B12, B17 (faixas ultra-wide)** — todas as faixas `936×32`/`426×88` são desenhadas como `panel` e viram miniaturas de 6–19% no centro. Trocar para `header`/`banner` 5:1 ou `paper:false` + texto centralizado resolve imediatamente sem nova arte (usam `PAPER_FALLBACK`→`banner` já).

### P1 — Arte dedicada (próxima geração)
3. **8 novos HUDs distintos** — executar as 3 rodadas `offer_options` do `PLANO_HUDS_DISTINTOS` (prioridade: `boss`, `event`, `header` que são B2/B3/B10/B12/B17). Cada moldura mantém folhas grandes externas + viga fina interna.

### P2 — Grupo C (migração visual)
4. **MODE cards** `360×340` procedural → `pause` 2-peças `274×340` + `paperQuiet` — maior painel escuro remanescente.
5. **NEST barras/PiP** — trocar `rgba(8,6,4,0.82)` por `banner` terroso + PiP com `minimap_frame` vazada.

### P3 — Polimento
6. **Ícones** — lote 1 (9 candidatos `f1-correcao` com anel) precisa re-geração sem anel (`128×128` RGBA recortado na silhueta).

---

## 12. Check-in de Leitura (GUIA §01-05)

| Pergunta GUIA | Resposta |
|---|---|
| 01 Leitura integral das Regras | ✅ `REGRAS_DE_TRABALHO.md` 31966 bytes lido integralmente nesta sessão |
| 02 Pedido e resultado | Análise completa de HUDs de todas as telas; entrega = este documento + inventário |
| 03 MEGA e decisões vigentes | ✅ `MEGA_ARQUIVO.md` índice + registros HUD (2026-10-16 `strict_bg_text_frame_clipped`, `slim+contextual`, `2-peças Grupo A`, Regra 20/21/22) consultados |
| 04 Decisão atual vs histórica | Decisão vigente: papel recortado pastel + 2-peças + 3-camadas `Fundo>Texto>Moldura`; pixel art/`lore_*` roxo são legado fallback, não cânone |
| 05 Lacunas que impedem execução | Nenhuma para análise; para implementação P0/P1 faltaria apenas confirmação de prioridade (não assumida) |
| 06 Rotas aplicáveis | **13** (HUD/menus/tipografia/controles) principal; **07/09** subsidiárias (arte/top-down) |
| 23-28 Menor lote e aceite | Lote = análise documental (nenhum código alterado); aceite = 118 estados de `layout-browser` + 7 artes 2-peças em `paper_hud.js` + 15 kinds roteados |

**Arquivos efetivamente lidos (18):** `REGRAS_DE_TRABALHO.md`, `GUIA.md`, `MEGA_ARQUIVO.md`, `AGENTS.md`, `game/README.md`, `game/js/ui.js`, `game/js/paper_hud.js`, `game/js/lore_hud.js`, `game/js/font.js`, `game/js/tutorial.js`, `game/js/game.js` (HUD recortes), `game/js/nest.js`, `game/js/meta.js`, `game/assets/ui/README.md`, `docs/arte/HUD_PUBLICACAO.md`, `docs/arte/F1_HUD_VIVO.md`, `docs/arte/PLANO_HUDS_DISTINTOS_E_CAMADAS.md`, `docs/arte/PLANO_CORRECAO_HUDS_GRUPOS_B_C.md`, `docs/arte/hud-publicacao.json`, `docs/arte/hud-duas-pecas.json`, `docs/arte/paper-hud.json`.

---

## 13. Fontes

- Código: `game/js/paper_hud.js`, `game/js/ui.js:panel/button/iconButton/tooltip`, `game/js/lore_hud.js:BIOME_HUD/drawGasterBar`, `game/js/tutorial.js:tutorialCardRect`, `game/js/font.js:paperQuiet/fitTextBlock`, `game/js/game.js:drawHUD/drawBanner/drawDraft/drawPause/drawEnd`.
- Arte: `game/assets/ui/paper/*_{frame,bg}.png` (14), `wood/button_*.png` (20), `docs/arte/hud-duas-pecas.json` (2-peças slim), `docs/arte/PLANO_*`.
- Testes: `game/test/paper-hud-browser.mjs`, `hud-publication*.mjs`, `layout-browser.mjs` (118 estados).

---

*Fim da análise — nenhum código foi alterado; o preview não foi aberto por ser pedido exclusivamente documental. Próximo passo sugerido: validar o inventário Grupo B com o usuário e priorizar os 8 novos HUDs distintos.*
