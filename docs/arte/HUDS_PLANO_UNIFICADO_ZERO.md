# HUDs — Plano Unificado ZERO (Recomeço Total)

**Data:** 2026-10-18  
**Decisão do usuário (Regra 1 — ask_user):** recomeçar **TODOS os HUDs do zero** com estilo idêntico, porque vários fugiram visualmente entre si.  
**Estilo canônico único:** `FUMIGA-PAPEL-v4-CHROMA` + material do **Piloto F0b** (`art-source/piloto-f0b/`) — papel recortado detalhado pastel terroso, aprovado em 2026-10-08.  
**Arquivamento:** este documento **substitui** `PLANO_HUDS_DISTINTOS_E_CAMADAS.md` (2026-10-16) e `PLANO_CORRECAO_HUDS_GRUPOS_B_C.md` (2026-10-16), cujo conteúdo foi preservado integralmente em `docs/arte/historico/` com nota `SUPERSEDED 2026-10-18`.  
**Motor:** `game/js/paper_hud.js` (3 camadas estritas `Fundo > Texto clipado > Moldura`), `game/js/ui.js`, `game/js/lore_hud.js`, `game/js/font.js` (`paperQuiet` + `fitTextBlock`). Regras 21 e 22 continuam.

> **O que significa “ZERO”:** todos os 15 HUDs distintos + 19 correções do Grupo B + 10 painéis e 32 ícones do Grupo C voltam a **⏳ PENDENTE** no controle deste plano. Os PNGs atuais em `game/assets/ui/paper/` permanecem como **fallback transparente** (`PAPER_FALLBACK`) até o novo lote entrar, sem quebrar o preview. Nenhum PNG foi apagado nesta entrega documental; a geração unificada acontece nas próximas rodadas (≤10 por rodada, Regra 16).

---

## 1. Por que recomeçar

| Problema observado | Causa | Solução deste plano |
|---|---|---|
| HUDs com folhas/vigas/madeira em escalas diferentes | Gerações isoladas em datas distintas, prompts com variações livres | **Um único prompt-base idêntico** para todos + variações só de espécie botânica (ex.: casca vs samambaia), mesma sentença de material/luz/paleta |
| Bordas grossas vs finas, papel creme em tons diferentes | `panel_frame` 2026-10-16 slim vs `panel` 2026-10-09 creme puro | Re-gerar **todas as 15 molduras + 15 fundos** com a mesma paleta pastal terrosa e mesma gramatura de papel |
| Texto invadindo moldura em algumas telas | Caixas fora da proporção nativa (Grupo B: 6%–56% cobertura) | Corrigir geometria junto com a arte nova (seção 5) |
| Ícones com/sem anel, tamanhos 16/32 mistos | Lotes legados vs candidatos `f1-correcao` | Re-gerar os 32 ícones com mesma regra sem anel, 128×128 RGBA |

**Pesquisa indie (Regra 2):** HUD consistente exige **um diretor de arte com veto** (Hollow Knight: “Ari Gibson desenhou cada frame em papel, escaneado — consistência vem de um guia único, não de comitê” [6](https://sdlccorp.com/post/how-to-develop-a-game-like-hollow-knight/)) e **guia de espessura de contorno + peso de linha + paleta antes de qualquer asset** [21](https://digitalsynopsis.com/design/2d-game-art-styles/). Em *Stardew Valley*, UI reaproveita a paleta mas usa cores sólidas quando o pixel art é denso, mantendo coerência sem conflito [2](https://www.reddit.com/r/gamedev/comments/1b84cvk/pixel_art_userinterface_for_pixel_art_games/). O kit “Pixel HUD UI: Fantasy RPG Kit” entrega **82 sprites com estilo consistente e 9 variações de cor** justamente para evitar coleção de Asset Store [4](https://indigolay.itch.io/pixel-hud-ui) — mesma lógica do nosso recomeço.

---

## 2. Estilo canônico — Piloto F0b + FUMIGA-PAPEL-v4-CHROMA

**Referência binária única:** `art-source/piloto-f0b/originais/` + `game/assets/ui/paper/panel_frame.png` (slim 2026-10-16, SHA `d4e38baa...`) como prova de material.  
**Prompt-mestre:** `FUMIGA-PAPEL-v4-CHROMA` integral (ver `docs/arte/ESTILO_OFICIAL.md` §2) — papel recortado artesanal detalhado, 3 níveis (grandes formas / recortes médios / acabamento fino), paleta pastel terrosa (marrom terra, laranja âmbar, verde sálvia/musgo, papel creme), luz alto-esquerda, sem roxo/azul-escuro, sem xadrez, fundo técnico **azul #0000FF** (peça tem verde) ou **verde #00FF00** (peça tem azul).

**Regras de unidade para TODOS os HUDs desta leva:**
- Mesma **gramatura de papel creme areia** no fundo (mesmo `*_bg.png` base, recortado por `paperAperture`).
- Mesma **espessura de viga de madeira** interna (fina, 14.8% no topo / 84.8% na base em 960×512).
- Mesmas **folhas grandes reconhecíveis** (3–4 folhas por canto, nervura média, musgo discreto) — varia só a espécie por `kind`.
- Mesma **sombra de contato curta castanha** (nunca preta dura).
- Nenhuma geração adiciona texto, número, ícone ou botão pintado — centro sempre liso para `paperQuiet`.
- Fundo técnico + janela vazada em **#0000FF sólido opaco**, margem visível ao redor, sem spill.

---

## 3. Inventário unificado — 15 HUDs distintos (todos ⏳ PENDENTE ZERO)

Cada linha mantém a especificação técnica já auditada em `game/js/paper_hud.js` — agora com **status resetado** e **lote de geração** unificado (3 rodadas, ≤10 por Regra 16).

| # | `kind` exclusivo | Local no jogo | Caixa em 960×540 | Nativa (encaixe 100%) | `PAPER_APERTURE` | `PAPER_QUIET` | Fallback atual | Status ZERO | Lote |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `panel` | Painel Colônia `RUN` | `270×144` (8,6) | `960×512` (1.875:1) | [.030,.148,.925,.848] | [.215,.200,.865,.800] | — | ⏳ | 1 |
| 2 | `expanded` | Expandido Feromônio `RUN` | `270×144` (8,154) | `960×512` (1.875:1) | [.035,.148,.920,.848] | [.200,.200,.855,.800] | `panel` | ⏳ | 1 |
| 3 | `tutorial` | Cartão Tutorial `RUN` | `285×152` (338,68) | `960×512` (1.875:1) | [.035,.148,.920,.848] | [.195,.200,.860,.800] | `panel` | ⏳ | 1 |
| 4 | `banner` | Banner Onda `RUN` | `320×64` (320,4) | `960×192` (5:1) | [.029,.141,.860,.802] | [.310,.295,.840,.765] | — | ⏳ | 1 |
| 5 | `boss` | Banner Chefão `RUN` | `340×68` (310,72) | `960×192` (5:1) | [.040,.145,.900,.820] | [.200,.260,.835,.760] | `banner` | ⏳ | 1 |
| 6 | `event` | Banner Evento `RUN` | `400×80` (280,148) | `960×192` (5:1) | [.040,.145,.900,.820] | [.200,.250,.835,.765] | `banner` | ⏳ | 2 |
| 7 | `minimap` | Minimapa `RUN` | `168×125` (786,4) | `960×717` (1.34:1) | [.105,.130,.891,.880] | [.180,.240,.800,.770] | — | ⏳ | 2 |
| 8 | `tooltip` | Tooltip Loja `RUN` + `ui.tooltip` | `240×119` (10, footY-127) | `960×475` (2.02:1) | [.033,.204,.912,.821] | [.215,.240,.830,.765] | — | ⏳ | 2 |
| 9 | `health` | Barra Gaster `RUN` | `w×barH` (barH=min(h*1.18,w*135/960)) | `960×135` (7.11:1) | [.117,.267,.899,.726] | [.145,.320,.865,.680] | — | ⏳ | 2 |
| 10 | `card` | Cartas Draft `DRAFT` | `260×387` | `848×1264` (0.67:1) | [.043,.101,.879,.904] | [.305,.165,.855,.820] | — | ⏳ | 2 |
| 11 | `transition` | Placa Transição Mapa | `660×352` (150,94) *corrigida* | `960×662` (1.45:1) | [.055,.130,.915,.865] | [.185,.185,.835,.815] | `minimap` | ⏳ | 3 |
| 12 | `pause` | Painéis Pausa `PAUSE` | `355×440` | `928×1152` (0.806:1) | [.174,.167,.829,.808] | [.250,.219,.776,.757] | — | ⏳ | 3 |
| 13 | `nest_tip` | Tooltip Ninho `NEST` | `256×136` | `960×512` (1.875:1) | [.035,.148,.920,.848] | [.205,.200,.855,.800] | `panel` | ⏳ | 3 |
| 14 | `tree_detail` | Lateral Árvore/Santuário `TREE` | `311×386` (608,100) *corrigida* | `680×924` (0.736:1) | [.055,.105,.895,.900] | [.185,.160,.845,.835] | `card` | ⏳ | 3 |
| 15 | `header` | Faixa Cabeçalho `TREE/SANT/PROPHECY/TITLE` | `936×82` / `426×88` | `960×120` (8:1) | [.035,.150,.930,.840] | [.140,.220,.865,.780] | `banner` | ⏳ | 3 |

*Correções de caixa já aplicadas na tabela (B1→660×352, B16→311×386); ver seção 5.*

---

## 4. Motor de 3 camadas — inalterado, só com arte nova

```
1º Fundo (drawPaperBg: *_bg.png, recortado por paperAperture)
    ↓
2º Texto/Conteúdo (clip em paperAperture: drawText fitTextBlock + bar fill + minimapa)
    ↓
3º Moldura (drawPaperFrame: *_frame.png vazada, por cima de tudo)
```

Helpers já ativos: `beginPaperHud` / `endPaperHud` (pilha com clip) e `deferPaperFrame` / `flushPaperFrames` (para `panel()`/`dialogBox()`). `PAPER_NATIVE_SIZE`, `PAPER_APERTURE`, `PAPER_QUIET` e `paperFit` continuam em `game/js/paper_hud.js` — a geração nova só recalcula `aperture`/`quiet` via `tools/prepare_two_piece_hud.py`.

---

## 5. Correções geométricas do Grupo B — incorporadas ao ZERO

Todas as 19 correções de `PLANO_CORRECAO_HUDS_GRUPOS_B_C.md` foram copiadas para este plano e já refletem nas caixas da seção 3. Resumo:

| # | Tela → Componente | Caixa nova (corrigida) | paperKind | Cobertura antes→depois |
|---|---|---|---|---|
| B1 | RUN Transição | `660×352` (150,94) | `panel` 1.875:1 | 56%→100% |
| B2 | TITLE Rodapé | `banner 220×44` canto dir. ou `paper:false` | `banner` 5:1 | 6%→100% |
| B3 | MODE Ascensão | `banner 320×64` | `banner` | 16%→100% |
| B4 | MODE Rodapé | `banner` ou faixa translúcida | — | 6%→100% |
| B5 | OPTIONS Diálogo | `912×486` (24,27) | `panel` | 96%→100% |
| B6 | OPTIONS Aviso | `banner` compacto | `banner` | 9%→100% |
| B7 | HELP | `896×478` (32,20) | `panel` | 99%→100% |
| B8 | PAUSA Mini | `minimap` 2-peças | `minimap` | 94%→100% |
| B9 | END | `880×469` (40,35) | `panel` | 90%→100% |
| B10 | PROPHECY Header | `banner 430×86` + `panel 154×82` | `banner`/`panel` | 39%/82%→100% |
| B11 | MEMORY Externo | remover dialog externo | — | 96%→limpo |
| B12 | TREE Header esq. | `banner 410×82` | `banner` | 42%→100% |
| B13 | TREE Essência | `154×82` já 100% | `panel` | 100% (só centralizar) |
| B14 | TREE Galhos | remover panel fundo | — | 63%→limpo |
| B15 | TREE Rodapé | `banner` central | `banner` | 9%→100% |
| B16 | TREE Detail | `pause 311×386` | `pause` 0.806:1 | 76%→100% |
| B17 | SANT Header/Selo | `banner 480×96` / `460×92` | `banner` | 19%→100% |
| B18 | NEST Barras | `health 114×16` | `health` 7.11:1 | 53%→100% |
| B19 | Motor fallback | `PAPER_NATIVE_SIZE` por peça | — | já corrigido |

---

## 6. Grupo C — painéis escuros + 32 ícones (fases futuras, também ZERO)

### 6.1. Painéis procedurais a migrar (10)

| # | Tela | Elemento | Geometria | Alvo 2-peças | Prioridade pós-ZERO |
|---|---|---|---|---|---|
| C1.1 | MODE | Cards Campanha/Teste | 2×360×340 | `pause` 274×340 + botão madeira | Alta |
| C1.2 | NEST | Barra topo recursos | 960×40/64 | `banner` terroso | Alta |
| C1.3 | NEST | Barra base ações | 960×76 | `banner` | Alta |
| C1.4 | NEST | PiP Olho Lá Fora | 300×170 | `minimap` vazada | Alta |
| C1.5 | NEST | Pílulas câmaras | pílula 16px | `banner` compacto | Média |
| C1.6 | RUN | Legenda H | 448×26 | `banner 440×88` | Média |
| C1.7 | RUN | Faixa dicas 14s | 640×18 | `banner` | Baixa |
| C1.8 | LOADING | Badge+tela lore | w×54 / 904×136 | `banner` + `health` barra | Média |
| C1.9 | CUTSCENE | Header+narração | w×22 / 840×92 | `banner/tooltip` pergaminho | Média |
| C1.10 | BOOT/PRETITLE | Caixa clique+barra | tw+40×28 / 360×24 | madeira/texto | Baixa |

### 6.2. Ícones 32 (todos ⏳ ZERO)

| Lote | Ícones | Status ZERO |
|---|---|---|
| 1 | ember, food, essence, shield, bolt, hourglass, snow, heal, egg, potion | ember ✅ 2026-10-09 mas será **re-gerado** no novo padrão sem anel 128×128 |
| 2 | crown, clover, fire_sword, fist, fungo, horseshoe, lock, scale, spider, spider_gold | ⏳ |
| 3 | sun, wing_gem, sk_acid, sk_banner, sk_bomb, sk_frost, sk_fury, sk_heart, sk_rico, sk_slash | ⏳ |
| 4 | sk_time, sk_tornado | ⏳ |

Regra: `FUMIGA-PAPEL-v4-CHROMA`, fundo chroma, sem disco/anel, derivado 128×128 RGBA, `game/assets/sprites/icons/`.

---

## 7. Prompts unificados — um base, variações mínimas

**BASE (idêntico nas 15 chamadas):**

> Detailed layered paper-cut craft illustration, NOT minimalist, NOT flat vector, NOT pixel art, NOT 3D render. Hand-cut textured paper layers with visible paper fibers, deckled and precision-cut edges, subtle embossed reliefs, and soft contact shadows between stacked sheets. Warm earthy pastel palette: soil brown, bark umber, warm ochre, amber orange, moss green, sage leaf, and cream parchment highlights; avoid purple or neon blue in the artwork. Both the outer background around the frame AND the entire inner window opening must be solid flat pure chroma blue #0000FF with crisp clean edges and no text or icons inside.

**VARIAÇÃO por kind (acrescenta APÓS o base, mantendo folhas GRANDES e viga fina):**

| kind | Frase de variação |
|---|---|
| `panel` | `Create a distinct HOLLOW rectangular wooden and botanical HUD frame for the Colony Stats Panel (15:8 landscape): keep LARGE lush layered green leaves, curling vines, moss patches, and warm amber paper knots along the outer corners, while keeping the inner wooden border rim thin so the hollow center opening is wide (at least 82% of width and 72% of height).` |
| `expanded` | `...for the Expanded Pheromone Panel (15:8): intertwined bark and root wood with amber resin droplets, moss and ant-trail carvings, LARGE leaves on outer corners, thin inner rim.` |
| `tutorial` | `...for the Tutorial Guide Card (15:8): light birch/oak bark with LARGE fern fronds, moss, acorn clasps on outer corners, thin inner rails.` |
| `banner` | `...for the Wave Banner (5:1 wide): gnarled bark roots, thorny briar, LARGE autumn/forest leaves on left and right ends, thin top/bottom rails (80%×66%).` |
| `boss` | `...for the Boss Health Banner (5:1 wide): ancient dark bark, twisted roots, spines, LARGE autumn leaves on ends, thin rails.` |
| `event` | `...for the Biome Event Banner (5:1 wide): ceremonial wood tips, LARGE green/amber leaves, wildflower blossoms, vines on ends, thin rails.` |
| `minimap` | `...for the Minimap Frame (4:3): oak branches, LARGE layered leaves, moss cushions, vines on outer corners, thin inner rim.` |
| `tooltip` | `...for the Shop Tooltip (2:1): curved bark, LARGE leaves and sprouting vines on outer corners, thin inner border.` |
| `health` | `...for the Health Gaster Bar (7:1 ultra-wide): bark with LARGE leaves accent on ends, thin horizontal rails, hollow center for fill.` |
| `card` | `...for the Mutation Draft Card (portrait 2:3): vertical bark with LARGE layered leaves, blossoms and vines on outer corners, thin side rails (80%×78%).` |
| `transition` | `...for the Map Transition Modal (1.45:1): grand oak branches, LARGE green/golden leaves, moss, vines on 4 corners, thin inner frame (82%×74%).` |
| `pause` | `...for the Pause Dialog (portrait 4:5): sacred ancestral bark, LARGE leaves and blossoms, vines on outer corners and top crest, thin side rails.` |
| `nest_tip` | `...for the Nest Chamber Tooltip (15:8): subterranean roots, terracotta soil strata, amber cavern mushrooms, moss, LARGE leaves on top corners, thin rim.` |
| `tree_detail` | `...for the Evolution Tree Detail Panel (portrait 0.736:1): sacred tree bark, LARGE green/golden leaves, budding blossoms, vines, thin symmetrical side rails (80%×78%).` |
| `header` | `...for the Panoramic Header Strip (ultra-wide 8:1, 960x120): LARGE lush green leaves, vines, moss clusters on left and right ends, thin top/bottom rails (86%×68%).` |

*Todos os prompts são executados com `offer_options: true` para escolha do usuário (Regra 6).*

---

## 8. Pipeline e cronograma ZERO

### Arquivos e ferramentas
- **Originais:** `art-source/f1-unificado-zero/originais/<kind>_frame.png` (fora do Git, backup Drive Regra 13).
- **Preparação:** `tools/prepare_two_piece_hud.py` (adicionar as 15 entradas em `FAMILIES` + medir `PAPER_APERTURE`/`PAPER_QUIET`).
- **Produção:** `game/assets/ui/paper/<kind>_{frame,bg}.png` (30 PNGs RGBA).
- **Registro:** `game/js/assets.js` (+15×2 chaves `paper_<kind>_{frame,bg}`) → `ASSET_V` novo → `tools/make_assets_list.mjs` → `tools/sync-native-assets.mjs`.
- **Texto:** todos os chamadores já usam `paperQuiet()` + `fitTextBlock`; após a arte nova, `paper-hud-browser.mjs` valida proporção.

### Cronograma (≤10 imagens por rodada)
| Rodada | HUDs (frame) | `offer_options` chamadas |
|---|---|---|
| **1** | `panel`, `expanded`, `tutorial`, `banner`, `boss` (5) | 5 (pode ser 3+2) |
| **2** | `event`, `minimap`, `tooltip`, `health`, `card` (5) | 5 |
| **3** | `transition`, `pause`, `nest_tip`, `tree_detail`, `header` (5) | 5 |
| **Grupo B/C** | Correções geométricas (código) + C1.x + 32 ícones | Rodadas seguintes ≤10 |

---

## 9. Verificação (Regras 3/4/7/20)

- `npm run test:quick` 30/30 + `node game/test/paper-hud-browser.mjs` (proporção sem deformar, 5 estados madeira, fundo vazado) + `node game/test/hud-publication.mjs` (SHA RGBA).
- `npm run inspect:layout` 118 estados — todos os 15 Huds com `paperQuiet` centralizado, mesmo em `FONTE GRANDE`.
- Diagrama ANTES→DEPOIS (Regra 20) com assets reais renderizados pelo motor.

---

## 10. Arquivamento

- **Antigos canônicos:** `docs/arte/PLANO_HUDS_DISTINTOS_E_CAMADAS.md` → `docs/arte/historico/PLANO_HUDS_DISTINTOS_E_CAMADAS.md.SUPERSEDED-2026-10-18.md` + stub de redirecionamento no original. Idem `PLANO_CORRECAO_HUDS_GRUPOS_B_C.md`.
- **Manifestos atuais:** `docs/arte/hud-duas-pecas.json` + `docs/arte/paper-hud.json` congelados como `historico/hud-*.json.SUPERSEDED-2026-10-18.json`.
- **PNGs atuais:** permanecem em `game/assets/ui/paper/` como fallback até a leva 1 entrar; nenhum commit apaga.

---

## 11. Próximo passo

Aguardar **aprovação deste plano ZERO** (formato, dimensões, prompts) e iniciar **Rodada 1** (5 primeiras molduras com `offer_options`). O texto já está adaptado ao HUD (Regra 21) e o sprite nunca deforma (Regra 22) — a troca de arte é só de material visual.

---

## 12. Correção do recorte (2026-10-19) — "quadrado branco atrás de todos os HUDs"

Relato do usuário ao abrir o preview: *"o recorte dos HUDs ficou ruim, todos ficaram com um quadrado branco atrás"*.
Diagnóstico no código e nos PNGs (não é opinião: cada item foi medido):

1. **Fundo retangular.** O `*_bg.png` era um retângulo de pergaminho de ponta a ponta;
   como ele é desenhado ANTES da moldura, o resultado era uma chapa creme nas margens
   transparentes → o "quadrado branco". O papel agora é **mascarado na janela real da
   moldura** (buraco medido por `binary_fill_holes`, dilatado ~1,2% para correr por baixo
   da madeira, borda com 1px de suavização). Fora da janela: alfa 0.
2. **Halo azul do chroma.** O #0000FF vazava nas bordas anti-aliased (folhas com contorno
   azul) e os pixels 100% transparentes carregavam RGB azul — ao reduzir, o navegador
   misturava esse azul. **Despill** (corta o azul para `max(R,G)`, alfa macio proporcional)
   + **sangria** (RGB dos transparentes recebe a cor opaca vizinha mais próxima).
3. **Janela estimada ≠ janela real.** `PAPER_APERTURE` era chute manual; agora é **medido**
   em cada moldura e conferido pelo teste. `paperQuiet` também é aparado dentro da janela,
   então texto nunca cai sobre pixel transparente.
4. **HUD espremido em caixa alta.** As molduras saíram todas largas (~2,5:1). Em caixa alta
   (pausa 355×440, detalhe da árvore) a moldura virava um selo. Duas soluções, ambas sem
   deformar nada: `paperLayout` **fatiado em 3 colunas** (as pontas — madeira + folhagem —
   ficam na proporção original, só a **viga central** acompanha a largura; é o que faz a
   barra de vida 7:1 e o cabeçalho 8:1 usarem a mesma moldura do painel) e **resgate alto**
   `pause/tree_detail → card` (moldura 0,67:1 da mesma família) enquanto não existir arte
   alta própria.

### Ferramenta e registro

- `tools/prepare_huds_zero.py` — despill + sangria + fundo mascarado + medição da janela.
  `--check` só mede; `--record` regrava `docs/arte/huds-zero.json` (não toca nos PNGs).
- `docs/arte/huds-zero.json` — por HUD: `frame{size,bytes,sha256,center_opaque_ratio,blue_leak}`,
  `bg{size,bytes,sha256,border_alpha_max,corner_alpha_max,center_alpha_min}`, `aperture` medida.
- `game/test/hud-publication.mjs` — passou a validar o conjunto ZERO (15 HUDs) e as garantias:
  `bg.border_alpha_max = 0`, `bg.corner_alpha_max = 0` (nada de quadrado), `bg.center_alpha_min = 255`
  (legibilidade), `frame.blue_leak = 0`, `frame.center_opaque_ratio < 0,2` (moldura vazada) e um
  bloco de **geometria headless** que percorre as 15 telas reais exigindo texto dentro da janela.
- `game/test/paper-hud-browser.mjs` — contrato de encaixe reescrito: `contain` mantém a proporção
  da caixa pintada; `sliced` exige desenho de ponta a ponta com as **pontas na proporção da fonte**.
- Prova visual (Regra 20): `docs/arte/hud-quadrado-antes-depois.png`.

### Resultado

`npm test` **33/33 verde** (4 pulados sem Playwright neste ambiente) · `inspect:layout` 118 estados
limpos · `paper-hud-browser` **sem navegador aqui**, então a conferência final é a do usuário no preview.

*Fim do Plano Unificado ZERO.*
