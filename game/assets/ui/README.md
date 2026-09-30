# Fundação Lore — atlas originais

Arte pixel art feita por código, não extraída de outros jogos. Referência de paleta:
`sprites/ants/queen.png` (quitina violeta, âmbar, contorno escuro). Sem figuras humanas.

| PNG | Dimensão | Recortes (origem no canto superior esquerdo) |
| --- | --- | --- |
| `lore_panels.png` | 192×32 | 6 células 32×32; margens 9-slice de 8px |
| `lore_textbox.png` | 224×32 | 7 células 32×32 (6 biomas + colônia); margens 9-slice de 8px |
| `lore_kit.png` | 280×52 | linha 0: 7 banners-seta 40×24 (9-slice l8/r14/t8/b8) · linha 24: 7 molduras de barra 32×12 (9-slice 4px, centro transparente) · linha 36: 4 ícones 16×16 |
| `lore_icons.png` | 192×16 | 12 células 16×16 |
| `lore_gaster.png` | 192×24 | 3 células 64×24: vazio, âmbar, ferido |

Painéis e comidas na ordem: Planície (trevo), Floresta (cogumelo), Pântano
(alga), Deserto (semente), Bosque (folha de outono), Pico (líquen).
Ícones 6/7: cristais âmbar/violeta; 8–11: quatro passos de formiga (8 fps).

## Fase 2 — rework de slice boxes, caixas de texto e kit de madeira

- `lore_panels.png`: quitina dupla com bisel claro/escuro, **motif do bioma nos
  4 cantos** (zona fixa do 9-slice, nunca estica), costuras de seda no meio das
  bordas e nós de cera âmbar nos pontos médios.
- `lore_textbox.png`: caixas de texto em **tábua viva** (kit de madeira estilo
  da referência, personalizadas por bioma): veios horizontais/verticais, bisel
  de luz/sombra, nó de madeira com cera âmbar, sulco de placa e motif do bioma
  nos cantos chunky; centro escuro de leitura. A 7ª célula é o tema neutro
  **colônia** (quitina-amadeirada violeta) usado pelos menus fora da expedição.
- `lore_kit.png`: **tábuas-seta** de banner (cap arredondado + ponta de seta com
  nó de cera), **molduras de barra** de madeira com centro transparente (o fill
  colorido vem de `bar()` em `js/ui.js`) e ícones neutros 16×16 — check, cross,
  gema e botão âmbar — usados nos toggles de opções/profecias/memórias e no
  draft.
- Madeiras por bioma: fresca (Planície), musgosa (Floresta), úmida (Pântano),
  calcinada (Deserto), dourada (Outono), gelada (Gelo) + colônia.
- Os cantos nunca esticam; a troca de bioma faz a "muda de quitina" (dissolve
  ~0,6 s + fio de luz) em `js/lore_hud.js`; `dialogBox`/`tooltip` usam a tábua
  do bioma atual via `hudBiome()`; banners usam `drawWoodBanner` e barras,
  `drawWoodBarFrame`. Renderização nearest-neighbor.

## Reproduzir

Com Python e Pillow disponíveis: `python tools/make_lore_hud.py`.
O gerador pinta um master 4× na grade e reduz com nearest, sem blur. Para exportar
as fontes de alta resolução fora do jogo: `--master /caminho/externo`.
Só os cinco PNGs otimizados são carregados pelo jogo (~9 KiB no total).
Pillow não é dependência de execução; o jogo continua JS puro, sem build.

## Árvore Ancestral ao Crepúsculo — 2026-09-24

`tree_ancestral.png`: **768×672 RGBA**, 656.076 bytes, sem texto/ícones embutidos.
Arte nova gerada em alta resolução com as camadas da TITLE como referência,
aprovada pelo usuário entre duas opções (opção 2). Não é um dos atlas procedurais acima.
O original aprovado mede 1552×672; o preparo remove o fundo uniforme e recorta apenas
as margens vazias, sem reduzir/rescalar nem borrar os pixels:

```bash
python3 tools/prepare_tree_art.py ORIGINAL_APROVADO.png game/assets/ui/tree_ancestral.png
```

O original de geração e as opções descartadas ficam fora do Git. Pillow é apenas
ferramenta de arte. O único asset novo carregado no jogo é o PNG final.

`tree_layout.js` ancora os nós/frutos nos galhos, em quatro unidades de mundo por
pixel. `tree_art.js` assa uma versão acromática e restaura saturação por região conforme
os níveis comprados (incluindo os frutos obtíveis). Mescla suave entre regiões; cache
reconstruído somente quando níveis mudam. A imagem aprovada volta integralmente em
100%; fonte grande, alto contraste e efeitos reduzidos não alteram compras/progresso.

## Maçãs dos mundos (2026-09-25; integração 2026-09-27; ajustes 2026-09-28; sem correntes 2026-09-29)

- `maca_<mundo>.png` — **960×960 RGBA**, 7 arquivos: as maçãs douradas dos seis
  mundos e a Pálida branca (`maca_palida`; o mundo 7 é `topo` em config.js e `palida`
  nas artes — mapeamento único em `fruitAssetName()`, `js/tree_layout.js`). Carregadas no
  boot (`MANIFEST` de `js/assets.js`) e desenhadas nos nós da copa por `drawFruit()` em
  `js/meta.js`: **bloqueado = acinzentada (`fruitGray`), Pálida = branca**, cada uma com o
  seu rótulo; nenhuma arte recebe cadeado, corrente ou aro.
  Desde 2026-09-28 os sprites têm **3x a resolução** (320→960) e o **corpo da maçã
  normalizado para o mesmo tamanho** em todos os mundos (475–476 px de corpo); o quadro em
  jogo é 450 px no zoom 1.
- `santuario_<mundo>.png` — **960×540 RGB**, 7 arquivos (~5,1 MB): fundos da tela do
  Santuário, fora do boot de propósito. `loadSantuario()` em `js/assets.js` busca apenas o
  bioma aberto, com timeout/retry e promessa cacheada por mapa; `drawFruitMini()` exibe um
  placeholder enquanto carrega e renderiza o fundo 1:1 quando disponível.
- **Integração B e revisão visual (2026-09-28):** `tree_layout.js` define 13 slots em
  coordenadas 960×540; `meta.js` mostra flores novas e legadas juntas, liga pré-requisitos e
  restaura progressivamente a cor do fundo/maçã/jardim a partir do cinza conforme níveis comprados.
  Sem cadeados ou placas sobre as pétalas; hitboxes invisíveis e detalhe lateral preservam
  seleção/EVOLUIR sem cobrir as flores. A Pálida usa a arte branca, sem compra.
- **Correntes/cadeados removidos (2026-09-29, decisão do usuário):** os sprites
  `correntes_deserto.png` (320×320, cadeado padrão dos frutos bloqueados), `correntes_tranca.png`
  (512×512, selo da Pálida) e `correntes_cadeados.png` (320×320, bronze aposentado) foram
  **apagados do repositório** e saíram do `MANIFEST`/boot — o santuário da Pálida ficou só com o
  painel de aviso em `drawSanctuarySeal()`. A pasta passou de 23 para 20 PNGs.
- **Fundo/restauro (2026-09-28):** `tools/repair_fruit_sprites.py` limpa o fundo violeta
  residual (incluindo `maca_planicie`, que ainda tinha 66% de fundo opaco, e bolsões entre
  detalhes) e restaura fragmentos de arte apagados. O critério de fundo é a cor estimada por
  mediana + guarda de cor (`violet_bg_like`, dist ≤ 34): sombras de arte sobrevivem.
  Desde 2026-09-29 o script só tem o modo de maçãs (`... macas`); a parte de correntes saiu.
- Originais de alta resolução: `art-source/macas/`, `art-source/santuarios/`, `art-source/flores/`
  (fora do Git, como `_orig/` da TITLE). Pipeline do preparo original:
  `python3 tools/prepare_fruit_art.py all` (maçãs + santuários + flores); reparo/normalização atual:
  `python3 tools/repair_fruit_sprites.py macas`.
- **Flores do Santuário da Planície (`flores_planicie.png`, 2026-09-29):** folha 3×3 (**576×576 RGBA**,
  células de 192×192 ancoradas na base, ~191 KB) com 3 variações temáticas do mapa (*Margarida-do-Amanhecer*,
  *Botão-de-Ouro Solar* e *Trevo-Lilás Silvestre*) e 3 estágios de evolução cada:
  1. **Broto** (coluna 0): exibido acinzentado antes da 1ª compra (`level === 0`) e colorido ao comprar 1 vez (`level === 1`);
  2. **Broto meio aberto** (coluna 1): exibido a partir da 2ª compra (`level === 2`);
  3. **Flor florescida** (coluna 2): exibido quando completa a melhoria (`level >= max`, 3ª compra).
  Preparado por `python3 tools/prepare_fruit_art.py flores planicie game/assets/ui/flores_planicie.png`
  e assado uma única vez em `flowerSheet()` (`js/meta.js`) em células 48×48 com contorno escuro de 1px.
