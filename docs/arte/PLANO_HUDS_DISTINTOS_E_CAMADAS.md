# Plano de Implementação — Camadas `Fundo > Texto > Moldura` e 8 Novos HUDs Distintos por Local

**Data:** 2026-10-16  
**Escopo aprovado pelo usuário (Regra 1):**
1. **`strict_bg_text_frame_clipped` (Implementado no motor):** Ordem estrita de camadas em todos os HUDs, do mais ao fundo ao mais à frente:
   $$\text{1º Fundo (`*_bg.png`)} \;\longrightarrow\; \text{2º Texto e Conteúdo (clipados na janela do papel)} \;\longrightarrow\; \text{3º Moldura (`*_frame.png`) por cima}$$
2. **`eight_new_huds_all_screens` (Roteamento implementado no motor; geração das 8 artes dedicadas pronta para a próxima etapa):** Cada local específico da tela de jogo tem seu próprio HUD exclusivo (sem reutilizar `panel` ou `banner` em múltiplos lugares), mantendo o **Estilo 06 (`FUMIGA-PAPEL-v4-CHROMA`)** com folhas, vinhas e musgo grandes na borda externa e viga interna fina.

---

## 1. O que já está implementado e ativo no código

### 1.1. Motor de 3 Camadas Estritas (`game/js/paper_hud.js` e `game/js/ui.js`)
- **`beginPaperHud(ctx, kind, x, y, w, h, opt)`:**
  1. Descarrega quaisquer molduras pendentes (`flushPaperFrames(ctx)`);
  2. Desenha imediatamente a **1ª Camada — Fundo (`drawPaperBg(ctx, kind, x, y, w, h, opt)`)** e registra a superfície de papel em `registerPaperSurface`;
  3. Abre `ctx.save()` e aplica `ctx.clip()` na janela interna (`paperAperture(kind, x, y, w, h)`) para que toda a **2ª Camada — Texto, barras e sub-botões** fique contida no papel;
- **`endPaperHud(ctx)`:**
  1. Restaura o `ctx.clip()` da 2ª Camada (`ctx.restore()`);
  2. Desenha a **3ª Camada — Moldura (`drawPaperFrame(ctx, kind, x, y, w, h, opt)`) POR CIMA de todos os textos e conteúdos internos**, garantindo que nenhum texto jamais fique sobre a moldura.
- **`deferPaperFrame(ctx, kind, x, y, w, h, opt)` + `flushPaperFrames(ctx)`:**
  - Usado automaticamente por `panel()` e `dialogBox()` em `game/js/ui.js` para todos os demais painéis e caixas de diálogo das telas `TITLE`, `MODE`, `OPTIONS`, `HELP`, `PAUSE`, `END`, `PROPHECY`, `MEMORY` e `TREE`: desenha `*_bg.png` primeiro e pinta `*_frame.png` por cima após os `drawText(...)` daquele painel.

### 1.2. Roteamento dos 15 Locais Específicos (`game.js`, `tutorial.js`, `nest.js`, `meta.js`, `ui.js`)
Todos os 15 locais abaixo já chamam seu próprio `kind` exclusivo no código e possuem `PAPER_NATIVE_SIZE`, `PAPER_APERTURE`, `PAPER_QUIET` e `PAPER_FALLBACK` configurados em `game/js/paper_hud.js`:

| # | Local Específico no Jogo | `kind` Exclusivo | Status da Arte (`game/assets/ui/paper/`) | Caixa no Jogo (`960×540`) | Dimensão Nativa (`100%` encaixe) |
|---|---|---|---|---|---|
| 1 | **Painel Principal da Colônia (`RUN`)** | `panel` | ✅ Arte própria (`panel_frame` + `panel_bg`) | `270×144` em `(8, 6)` | `960×512` (`15:8`) |
| 2 | **Painel Expandido de Feromônio (`RUN`)** | **`expanded`** | ⏳ Próxima geração (fallback ativo: `panel`) | `270×144` em `(8, 154)` | `960×512` (`15:8`) |
| 3 | **Cartão de Tutorial Dinâmico (`RUN`)** | **`tutorial`** | ⏳ Próxima geração (fallback ativo: `panel`) | `285×152` em `(338, 68)` | `960×512` (`15:8`) |
| 4 | **Banner de Onda / Trilha (`RUN`)** | `banner` | ✅ Arte própria (`banner_frame` + `banner_bg`) | `320×64` em `(320, 4)` | `960×192` (`5:1`) |
| 5 | **Banner do Chefão (`RUN`)** | **`boss`** | ⏳ Próxima geração (fallback ativo: `banner`) | `340×68` em `(310, 72)` | `960×192` (`5:1`) |
| 6 | **Banner de Evento / Bioma (`RUN`)** | **`event`** | ⏳ Próxima geração (fallback ativo: `banner`) | `400×80` em `(280, 148)` | `960×192` (`5:1`) |
| 7 | **Minimapa (`RUN`)** | `minimap` | ✅ Arte própria (`minimap_frame` + `minimap_bg`) | `168×125` em `(786, 4)` | `960×717` (`4:3`) |
| 8 | **Tooltip da Loja (`RUN`) & `ui.tooltip`** | `tooltip` | ✅ Arte própria (`tooltip_frame` + `tooltip_bg`) | `240×119` em `(10, footY-127)` | `960×475` (`2:1`) |
| 9 | **Barras de Vida / Gaster (`RUN`)** | `health` | ✅ Arte própria (`health_frame` + `health_bg`) | `drawGasterBar` | `960×135` (`7:1`) |
| 10 | **Cartas de Mutação (`DRAFT`)** | `card` | ✅ Arte própria (`card_frame` + `card_bg`) | `260×387` | `848×1264` (`2:3`) |
| 11 | **Placa de Transição de Mapa (`RUN`)** | **`transition`** | ⏳ Próxima geração (fallback ativo: `minimap`) | `560×386` em `(200, 84)` | `960×662` (`1,45:1`) |
| 12 | **Painéis de Pausa (`PAUSE`) & Modais** | `pause` | ✅ Arte própria (`pause_frame` + `pause_bg`) | `355×440` | `928×1152` (`4:5`) |
| 13 | **Tooltip de Câmara do Ninho (`NEST`)** | **`nest_tip`** | ⏳ Próxima geração (fallback ativo: `panel`) | `256×136` | `960×512` (`15:8`) |
| 14 | **Painel Lateral de Nó (`TREE` / `SANCTUARY`)** | **`tree_detail`** | ⏳ Próxima geração (fallback ativo: `card`) | `284×386` em `(664, 100)` | `680×924` (`0,736:1`) |
| 15 | **Faixa de Cabeçalho Panorâmica (`TREE` / `SANCTUARY` / `PROPHECY`)** | **`header`** | ⏳ Próxima geração (fallback ativo: `banner`) | `936×82` / `426×88` | `960×120` (`8:1`) |

---

## 2. Especificação Artística e Prompts dos 8 Novos HUDs Distintos (`FUMIGA-PAPEL-v4-CHROMA`)

Regras obrigatórias na geração (Regras 6, 13, 16, 18, 21 e 22):
- **Sempre apresentar opções lado a lado (`offer_options: true`, máx. 3 por mensagem)** para escolha do usuário;
- **Manter folhas, vinhas, musgo e ornamentos botânicos GRANDES e ricos nas bordas externas**, afinando apenas a viga interna de madeira para abrir uma janela central ampla;
- **Fundo técnico e abertura central vazada em azul chroma puro `#0000FF`**;
- **Salvar originais em `art-source/f1-distintos/originais/`, derivados RGBA em `game/assets/ui/paper/` e backup no Google Drive (`Fumiga-GOAT - Imagens do jogo`)**.

### Rodada 1 (3 chamadas `offer_options: true`)
1. **`expanded_frame.png` (`960×512`, `15:8`) — Painel Expandido de Feromônio (`RUN`)**
   - **Identidade visual:** Moldura de casca de árvore e raízes com gotas translúcidas de resina âmbar/feromônio, folhas grandes em camadas nos cantos externos, musgo verde-sálvia e entalhes de trilhas de formiga; viga interna fina (`aperture: [.035, .148, .920, .848]`, `quiet: [.200, .200, .855, .800]`).
   - **Prompt:**
     > `Detailed layered paper-cut craft illustration, NOT minimalist, NOT flat vector, NOT pixel art, NOT 3D render. Hand-cut textured paper layers with visible paper fibers, deckled and precision-cut edges, subtle embossed reliefs, and soft contact shadows between stacked sheets. Warm earthy pastel palette: soil brown, bark umber, warm ochre, amber orange, moss green, sage leaf, and cream parchment highlights; avoid purple or neon blue in the artwork. Create a distinct HOLLOW wooden and botanical HUD frame for the Expanded Pheromone & Colony Stats Panel (aspect ratio 15:8 landscape): keep LARGE lush layered green leaves, curling vines, moss patches, and warm glowing amber-resin pheromone droplets along the outer corners and edges, while keeping the inner wooden border rim thin so the hollow center opening is wide (at least 82% of width and 72% of height). Both the outer background around the frame AND the entire inner window opening must be solid flat pure chroma blue #0000FF with crisp clean edges and no text or icons inside.`

2. **`tutorial_frame.png` (`960×512`, `15:8`) — Cartão de Tutorial Dinâmico (`RUN`)**
   - **Identidade visual:** Moldura de guia de campo da Matriarca em madeira clara e casca de bétula/carvalho com frondes grandes de samambaia, folhas sobrepostas, musgo e brotos dourados nos cantos externos; viga interna fina (`aperture: [.035, .148, .920, .848]`, `quiet: [.195, .200, .860, .800]`).
   - **Prompt:**
     > `Detailed layered paper-cut craft illustration, NOT minimalist, NOT flat vector, NOT pixel art, NOT 3D render. Hand-cut textured paper layers with visible paper fibers, deckled and precision-cut edges, subtle embossed reliefs, and soft contact shadows between stacked sheets. Warm earthy pastel palette: soil brown, bark umber, warm ochre, amber orange, moss green, sage leaf, and cream parchment highlights; avoid purple or neon blue in the artwork. Create a distinct HOLLOW wooden and botanical HUD frame for the Tutorial Guide Card (aspect ratio 15:8 landscape): keep LARGE lush layered green leaves, fern fronds, curling vines, moss, and carved wooden scroll clasps with acorns on the outer corners, while keeping the inner wooden border rails thin so the hollow center window is wide and open (at least 82% of width and 72% of height). Both the outer background around the frame AND the entire inner window opening must be solid flat pure chroma blue #0000FF with crisp clean edges and no text or icons inside.`

3. **`boss_frame.png` (`960×192`, `5:1`) — Banner do Chefão / Filho da Névoa (`RUN`)**
   - **Identidade visual:** Tábua horizontal imponente de madeira ancestral escura com raízes retorcidas, espinhos de roseira brava e folhas grandes de outono/floresta nas pontas externas, sem o caracol largo na esquerda para liberar `63,5%` da largura útil (`aperture: [.040, .145, .900, .820]`, `quiet: [.200, .260, .835, .760]`).
   - **Prompt:**
     > `Detailed layered paper-cut craft illustration, NOT minimalist, NOT flat vector, NOT pixel art, NOT 3D render. Hand-cut textured paper layers with visible paper fibers, deckled and precision-cut edges, subtle embossed reliefs, and soft contact shadows between stacked sheets. Warm earthy pastel palette: soil brown, bark umber, warm ochre, amber orange, moss green, sage leaf, and cream parchment highlights; avoid purple or neon blue in the artwork. Create a distinct HOLLOW wide horizontal wooden HUD banner frame for the Boss Health & Name Banner (wide 5:1 banner proportion): feature gnarled ancient dark-bark roots, thorny briar vines, LARGE layered autumn-amber and forest-green leaves on the left and right outer ends, while keeping the top and bottom inner wooden rails thin so the hollow center opening is wide (at least 80% of width and 66% of height). Both the outer background around the banner AND the entire inner window opening must be solid flat pure chroma blue #0000FF with crisp clean edges and no text inside.`

### Rodada 2 (3 chamadas `offer_options: true`)
4. **`event_frame.png` (`960×192`, `5:1`) — Banner de Evento / Aviso de Bioma (`RUN`)**
   - **Identidade visual:** Tábua cerimonial de anúncio de onda/bioma com grandes folhas abertas nas extremidades, flores silvestres em papel recortado, musgo e vinhas entrelaçadas; trilhos horizontais finos (`aperture: [.040, .145, .900, .820]`, `quiet: [.200, .250, .835, .765]`).
   - **Prompt:**
     > `Detailed layered paper-cut craft illustration, NOT minimalist, NOT flat vector, NOT pixel art, NOT 3D render. Hand-cut textured paper layers with visible paper fibers, deckled and precision-cut edges, subtle embossed reliefs, and soft contact shadows between stacked sheets. Warm earthy pastel palette: soil brown, bark umber, warm ochre, amber orange, moss green, sage leaf, and cream parchment highlights; avoid purple or neon blue in the artwork. Create a distinct HOLLOW wide horizontal wooden HUD banner frame for the Biome & Wave Event Announcement Banner (wide 5:1 banner proportion): feature ceremonial carved wood tips, LARGE layered green and amber leaves, small wildflower blossoms, and trailing vines on the outer ends, while keeping the top and bottom inner wooden rails thin so the hollow center opening is wide (at least 80% of width and 66% of height). Both the outer background around the banner AND the entire inner window opening must be solid flat pure chroma blue #0000FF with crisp clean edges and no text inside.`

5. **`transition_frame.png` (`960×662`, `1,45:1` = `560×386`) — Placa de Transição de Mapa (`drawMapTransition`)**
   - **Identidade visual:** Grande moldura de marco de travessia de bioma (`960×662`, proporção exata da caixa `560×386` sem sobra) com galhos de carvalho, grandes folhas em camadas nos 4 cantos, musgo e sementes aladas; borda interna fina (`aperture: [.055, .130, .915, .865]`, `quiet: [.185, .185, .835, .815]`).
   - **Prompt:**
     > `Detailed layered paper-cut craft illustration, NOT minimalist, NOT flat vector, NOT pixel art, NOT 3D render. Hand-cut textured paper layers with visible paper fibers, deckled and precision-cut edges, subtle embossed reliefs, and soft contact shadows between stacked sheets. Warm earthy pastel palette: soil brown, bark umber, warm ochre, amber orange, moss green, sage leaf, and cream parchment highlights; avoid purple or neon blue in the artwork. Create a distinct HOLLOW rectangular wooden and botanical HUD modal frame for the Map Victory & Biome Transition Screen (aspect ratio 1.45:1 landscape, 960x662): feature grand overarching oak branches, LARGE lush layered green and golden-ochre leaves, moss cushions, and curling vines along the outer corners, while keeping the inner wooden frame rails thin so the hollow center opening is wide (at least 82% of width and 74% of height). Both the outer background around the frame AND the entire inner window opening must be solid flat pure chroma blue #0000FF with crisp clean edges and no text inside.`

6. **`nest_tip_frame.png` (`960×512`, `15:8`) — Tooltip de Câmara Subterrânea do Formigueiro (`NEST`)**
   - **Identidade visual:** Moldura subterrânea de raízes entrelaçadas, terra compactada em camadas de papel recortado, cogumelos/micélio âmbar, musgo de caverna e folhas grandes nas pontas superiores; viga interna fina (`aperture: [.035, .148, .920, .848]`, `quiet: [.205, .200, .855, .800]`).
   - **Prompt:**
     > `Detailed layered paper-cut craft illustration, NOT minimalist, NOT flat vector, NOT pixel art, NOT 3D render. Hand-cut textured paper layers with visible paper fibers, deckled and precision-cut edges, subtle embossed reliefs, and soft contact shadows between stacked sheets. Warm earthy pastel palette: soil brown, bark umber, warm ochre, amber orange, moss green, sage leaf, and cream parchment highlights; avoid purple or neon blue in the artwork. Create a distinct HOLLOW subterranean root-and-earth HUD frame for the Ant Nest Chamber Tooltip (aspect ratio 15:8 landscape): feature intertwined underground tree roots, layered terracotta soil strata, warm amber cavern mushrooms, moss patches, and LARGE lush leaves sprouting at the top outer corners, while keeping the inner wooden border rim thin so the hollow center opening is wide (at least 82% of width and 72% of height). Both the outer background around the frame AND the entire inner window opening must be solid flat pure chroma blue #0000FF with crisp clean edges and no text inside.`

### Rodada 3 (2 chamadas `offer_options: true`)
7. **`tree_detail_frame.png` (`680×924`, `0,736:1` = `284×386`) — Painel Lateral da Árvore e Santuários (`TREE` / `SANCTUARY`)**
   - **Identidade visual:** Moldura vertical ancestral (`680×924`, proporção exata da caixa `284×386` em `meta.js` sem sobra) com ramos floridos da Árvore Ancestral, folhas grandes e musgo na borda externa, sem a faixa grossa esquerda de `card` para liberar `66%` da largura útil (`aperture: [.055, .105, .895, .900]`, `quiet: [.185, .160, .845, .835]`).
   - **Prompt:**
     > `Detailed layered paper-cut craft illustration, NOT minimalist, NOT flat vector, NOT pixel art, NOT 3D render. Hand-cut textured paper layers with visible paper fibers, deckled and precision-cut edges, subtle embossed reliefs, and soft contact shadows between stacked sheets. Warm earthy pastel palette: soil brown, bark umber, warm ochre, amber orange, moss green, sage leaf, and cream parchment highlights; avoid purple or neon blue in the artwork. Create a distinct HOLLOW portrait wooden and botanical HUD frame for the Evolution Tree Node Detail Panel (aspect ratio 3:4 portrait, 680x924): feature sacred ancestral tree bark, LARGE layered green and golden leaves, small budding blossoms, and curling vines along the outer corners and top crest, while keeping both left and right inner wooden side rails thin and symmetrical so the hollow center opening is wide (at least 80% of width and 78% of height). Both the outer background around the frame AND the entire inner window opening must be solid flat pure chroma blue #0000FF with crisp clean edges and no text inside.`

8. **`header_frame.png` (`960×120`, `8:1`) — Faixa de Cabeçalho Panorâmica (`TREE` / `SANCTUARY` / `PROPHECY` / `TITLE`)**
   - **Identidade visual:** Viga panorâmica ultra-larga (`960×120`, `8:1`) com grandes folhas, vinhas e musgo nas extremidades esquerda e direita e trilhos horizontais finos em cima e embaixo (`aperture: [.035, .150, .930, .840]`, `quiet: [.140, .220, .865, .780]`).
   - **Prompt:**
     > `Detailed layered paper-cut craft illustration, NOT minimalist, NOT flat vector, NOT pixel art, NOT 3D render. Hand-cut textured paper layers with visible paper fibers, deckled and precision-cut edges, subtle embossed reliefs, and soft contact shadows between stacked sheets. Warm earthy pastel palette: soil brown, bark umber, warm ochre, amber orange, moss green, sage leaf, and cream parchment highlights; avoid purple or neon blue in the artwork. Create a distinct HOLLOW ultra-wide horizontal wooden HUD header strip frame (wide 8:1 aspect ratio, 960x120): feature LARGE lush layered green leaves, curling vines, and moss clusters on the left and right outer ends, with thin carved wooden rails along the top and bottom so the hollow center opening spans at least 86% of the width and 68% of the height. Both the outer background around the frame AND the entire inner window opening must be solid flat pure chroma blue #0000FF with crisp clean edges and no text inside.`

---

## 3. Passo a Passo para Concluir a Integração das 8 Artes na Próxima Sessão

1. Gerar as 8 molduras em 3 rodadas com `offer_options: true` (usando caminhos absolutos `/home/user/Fumiga-GOAT/...`).
2. Rodar `python3 tools/prepare_two_piece_hud.py` (adicionando as 8 chaves na tabela `FAMILIES` do script) para extrair os 16 PNGs RGBA (`<kind>_frame.png` e `<kind>_bg.png`) em `game/assets/ui/paper/` e atualizar automaticamente `PAPER_APERTURE` / `PAPER_QUIET` em `docs/arte/hud-duas-pecas.json`.
3. Registrar as 16 novas chaves (`paper_<kind>_frame` e `paper_<kind>_bg`) em `game/js/assets.js` e rodar `node tools/make_assets_list.mjs`.
4. Fazer upload dos originais e derivados para o Google Drive (Regra 13) e rodar `npm run test:quick` + `node game/test/hud-publication.mjs`.
