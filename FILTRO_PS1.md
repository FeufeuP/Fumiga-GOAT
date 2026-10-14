# Filtro PS1 (quadriculado estilo Resident Evil / Crow Country)

Documento único sobre o filtro de imagem PS1. Tudo que diz respeito a ele
está aqui: pedidos, decisões, níveis, arquitetura, testes, capturas e
limitações. Os registros do `MEGA_ARQUIVO.md` apontam para este documento.

**Status:** implementado, ligado por padrão, testado e no preview.
**Branch:** `arena/9e2143c2-fumiga-goat`.
**Última atualização:** 2026-10-14.

---

## 0. Estado atual (2026-10-14) — só LIGADO / DESLIGADO

Pedido do usuário (pt-BR): *"arrume o filtro de PS1, quero que tenha apenas as
opções de ligado e desligado, que quando ligado fique na intensidade máxima,
ou seja, idêntico ao filtro em jogos de PS1"*.

**O que mudou:** os três níveis (LEVE / MÉDIO / FIEL AO PS1) **saíram do menu**.
Agora existem **dois estados**, e o LIGADO é a **intensidade máxima** —
exatamente os valores do antigo nível FIEL AO PS1, ou seja, o topo da escala
que já tinha sido calibrado. Nada foi afrouxado: o LIGADO é o filtro mais
forte que este jogo já teve.

| Estado | Índice (`settings.psx`) | dither | degraus de cor | contraste | buffer | Observação |
|---|---|---|---|---|---|---|
| DESLIGADO | 0 | 0 | 255 | 1.00 | 960×540 | canvas do filtro escondido, custo zero |
| **LIGADO** (padrão) | **1** | **0.13** | **12** | **1.16** | **960×540** | xadrez bem visível, cores achatadas (≈4 bits), contraste preservado e reforçado |

- `degraus de cor` 12 = o quadro é quantizado em 12 níveis por canal, o que
  produz o xadrez grosso que dá a leitura "PS1" no olho (mais marcado que os
  32 níveis do hardware original, por escolha explícita do usuário — ver §7).
- O buffer do LIGADO nasce em **960×540**. A única coisa que reduz a resolução
  interna para 480×270 é o **rebaixamento automático de desempenho** (Regra 5):
  renderizador por software (SwiftShader/llvmpipe) ou mediana de quadro acima
  de 22 ms (~45 FPS). Nunca é escolha do jogador, e o filtro nunca se desliga
  sozinho.
- **Escolha da resolução (pergunta da Regra 1):** o usuário escolheu manter a
  nitidez em 960×540 (sem pixelão permanente), em vez de 480×270 ou 320×180.

### Escolhas fechadas com o usuário (perguntas com opções, 2026-10-14)

| Tema | Escolha |
|---|---|
| Opções do menu | **Só LIGADO e DESLIGADO** |
| Intensidade do LIGADO | **Máxima** — os valores do antigo FIEL AO PS1 (dither 0.13 / 12 degraus / contraste 1.16) |
| Resolução interna do LIGADO | **960×540** — só o rebaixamento de desempenho reduz |
| Padrão de fábrica | **LIGADO** (como já era) |
| Saves antigos (LEVE/MÉDIO/FIEL) | **Viram LIGADO** — ninguém perde o filtro ao atualizar |

### Como o jogador vê isso

OPÇÕES → aba **VÍDEO** → linha **FILTRO PS1**, no mesmo desenho dos outros
toggles do jogo: `FILTRO PS1: LIGADO` com o botão `DESLIGAR`, ou
`FILTRO PS1: DESLIGADO` com o botão `LIGAR`. Um clique/toque alterna, o save
guarda e o próximo boot abre no mesmo estado.

---

## 1. Pedidos anteriores (histórico)

1. 2026-10-08: *"quero que vc agr aplique um filtro de ps1 estilo resident evil
   com os gráficos low poly quero apenas aquele filtro quadriculado sem a
   modelagem 3d"* — **só o filtro**, sem 3D e sem geometria low poly nova.
2. 2026-10-08: *"Quero que o filtro seja mais forte, idêntico ao estilo de Crow
   Country"* — intensidade maior, referência Crow Country (aproximação).
3. 2026-10-08: *"O filtro tirou o contraste do jogo, mantenha o contraste do
   jogo. E coloque tudo sobre o filtro dentro de um novo documento."* —
   contraste do jogo preservado; documentação consolidada aqui.
4. **2026-10-14: só LIGADO/DESLIGADO, LIGADO na intensidade máxima (§0).**

### Decisões antigas (2026-10-08), ainda válidas

| Tema | Escolha |
|---|---|
| Padrão do dither | **Bayer 4x4** (dither ordenado clássico do PS1/RE) |
| Onde aplicar | **Tudo**: mundo, HUD, menus e título |
| Ativação | **Ligado por padrão** + item em OPÇÕES → VÍDEO |
| Convivência | Coexiste com o toggle SCANLINES RETRÔ já existente |
| Níveis | Na época, DESLIGADO / LEVE / MÉDIO / FIEL AO PS1 — **substituídos em 2026-10-14** pelos dois estados atuais |

---

## 2. Como o filtro funciona

É um **pós-processamento 2D do quadro**, não um modelo 3D. O que a GPU do PS1
fazia na saída de vídeo: dither ordenado 4x4 e quantização de cor — no console,
15 bits por pixel (5 bits por canal); aqui, 12 degraus por canal por escolha do
usuário (§0), o que deixa o xadrez mais visível.

Pipeline por quadro:

1. O jogo desenha normalmente no canvas `#game` (960×540). **Nenhum pixel do
   `#game` é alterado.**
2. Um canvas separado `#psx` (por cima do jogo) recebe o quadro e aplica:
   - **contraste** por canal: `c = (c − 0.5) × contrast + 0.5`
   - **dither Bayer 4x4**: soma `(bayer − 0.5) × dither` antes da quantização
   - **quantização**: `floor(c × steps + 0.5) / steps`
3. O `#psx` fica abaixo das scanlines (`z-index` 1 contra 2), com
   `pointer-events: none`, e cobre exatamente a área do jogo.

### Matriz Bayer 4x4 (valores 0–15)

```
 0  8  2 10
12  4 14  6
 3 11  1  9
15  7 13  5
```

### Duas rotas, mesmo visual

- **`webgl`** (normal): o canvas do jogo vira textura e um shader faz o
  filtro na GPU. Não há leitura de pixel de volta.
- **`cpu`** (reserva, sem WebGL): a mesma conta por **tabela (LUT)** por
  posição do xadrez 4x4, em `getImageData`/`putImageData`, em meia resolução.
  Os 16 valores da matriz são os mesmos do shader.

### Contraste (correção de 2026-10-08, preservada)

A primeira versão mais forte também **dessaturava** a imagem. Isso achatou o
contraste e o jogo perdeu cor e profundidade. A dessaturação foi **removida**.
Agora o filtro só faz contraste, dither e quantização — o contraste do jogo é
mantido e reforçado de leve (1.16 no LIGADO).

---

## 3. Arquitetura e arquivos

| Peça | Arquivo | Papel |
|---|---|---|
| Módulo do filtro | `game/js/psx_filter.js` | os dois estados em `PSX_OPTS`, `PSX_DEFAULT = 1`, shader WebGL, rota CPU/LUT, vigia de desempenho |
| Canvas do jogo | `game/index.html`, `game/mobile/index.html` | canvas `#psx` por cima do `#game` |
| Estilo | `game/css/style.css`, `game/mobile/mobile.css` | posicionamento, `pointer-events: none`, `z-index` |
| Encaixe no loop | `game/js/main.js` | `initPsxFilter` no boot (depois do save), `resizePsxFilter` no `fit()`, `drawPsxFilter` e `notaQuadroPsx` no fim do quadro |
| Menu | `game/js/game.js` | linha FILTRO PS1 em OPÇÕES → VÍDEO com **`optToggle`** (LIGADO/DESLIGADO); a antiga `optChoice` de vários níveis foi removida (código morto) |
| Save | `game/js/state.js` | `settings.psx` (0/1, validado; padrão 1) + migração dos saves 1/2/3 → 1 |
| Versão de assets | `game/js/assets.js` | `ASSET_V = "20261014-filtro-ps1-ligado"` |
| Pacote | `app/assets.json` | regenerado (242 arquivos / 31,5 MB) |
| Teste | `game/test/psx-filter-browser.mjs` | teste de navegador do filtro (PC/mobile × webgl/cpu) |

### Desempenho (Regra 5)

- Em GPU real o passe custa cerca de 0,2 ms a 960×540.
- Em rasterizador **por software** (SwiftShader/llvmpipe: emuladores e máquinas
  sem GPU) o mesmo passe custava cerca de 8,7 ms e derrubava o jogo para cerca
  de 39 FPS.
- Por isso há duas proteções:
  1. Se o renderizador for por software, o buffer começa em meia resolução.
  2. Se a **mediana** de quadros passar de 22 ms (cerca de 45 FPS) com o
     filtro ligado, o buffer cai para meia resolução **uma vez**.
- O filtro **nunca desliga sozinho** e nunca altera o motor do jogo.
- Medido no sandbox (SwiftShader): 58–60 FPS com o filtro ligado; a inspeção de
  2026-10-14 rodou as 12 expedições PC/mobile a 60 FPS, com pior quadro de
  16,8 ms.

---

## 4. Pesquisa de referência (Regra 2)

- Dither 4x4 + 15 bits do PS1 (hardware) —
  https://github.com/Gageformer/Ember/issues/52
- Receita de shader PS1 (color_depth 5, matriz 4x4, resolution_scale) —
  https://godotshaders.com/shader/ps1-post-processing/
- Pacote "hardware-faithful" de PS1 (15-bit RGB555 + Bayer 2×2/4×4/8×8) —
  https://superhivemarket.com/products/psx-cycles
- Conversão de cor fiel (YUV) + dither Bayer em pós-processo —
  https://github.com/DaveFace/UnrealRetroShaders
- Dither de PSX em pós-processo com matriz configurável —
  https://github.com/jmickle66666666/PSX-Dither-Shader
- Matriz Bayer 4x4 e fórmulas de dither ordenado para canvas/web —
  https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/
- Jogos PSX-style modernos (Signalis, Crow Country, Dusk, Lunacid, Ultrakill) —
  https://www.reddit.com/r/gamedev/comments/1dvpyl2/are_people_tired_of_ps1like_retro_styled_games/
  e https://www.reddit.com/r/IndieGaming/comments/1jew4hl/modern_games_with_that_ps1_low_poly_style/
- Crow Country (homenagem a Resident Evil/Silent Hill; referência de "sujeira"
  visual) — https://www.resetera.com/threads/crow-country-this-new-resident-hill-game-slaps.1052154/

---

## 5. Testes e verificação (rodada de 2026-10-14)

| Verificação | Resultado |
|---|---|
| `node game/test/psx-filter-browser.mjs` | **OK** nas 4 combinações (PC/mobile × webgl/cpu): canvas separado, `#game` 960×540, alinhamento, **padrão LIGADO**, intensidade máxima conferida por parâmetro (`dither 0.13 / steps 12 / contrast 1.16`), valor fora da faixa cai no padrão, **migração dos saves 1/2/3 → LIGADO**, persistência após recarregar e sem erros de console |
| Diferença média do quadro com o filtro | ~13 (era ~10 no antigo MÉDIO) — o LIGADO é mais forte que o padrão anterior |
| `npm run test:quick` | 30/30 |
| `npm test` (37 testes) | 37/37 (a primeira rodada teve uma falha instável do `regressions-browser` no teste de tela de carregamento — race de transição, sem relação com o filtro; passou na repetição) |
| `npm run inspect` (PC + mobile, todas as telas, 6 mapas) | **✓ nenhum erro de JS, 404 ou glifo faltando**; 60 FPS e pior quadro 16,8 ms nas 12 expedições |
| Clique real no menu (`vid_psx`) | OPÇÕES → VÍDEO → "FILTRO PS1: LIGADO" + botão DESLIGAR → depois do clique, "FILTRO PS1: DESLIGADO" + botão LIGAR; nenhum problema de layout em OPÇÕES (`FUMIGA.auditarLayout()` vazio) |
| `node tools/make_assets_list.mjs` + `sync-native-assets.mjs` | pacote regenerado (242 arquivos / 31,5 MB) e shells nativos sincronizados (247 arquivos) |

### Capturas (fora do Git, em `/home/user/capturas-ps1/`)

- `comparacao-ligado.png` — DESLIGADO vs LIGADO no mesmo cenário (mapa 3, seed 7).
- `zoom-xadrez.png` — recorte ampliado 300%: o quadriculado de 15 bits nas
  sombras, no terreno e nas bordas.
- `menu-ligado-desligado.png` — a linha FILTRO PS1 nas duas posições.
- `run-ligado.png`, `run-desligado.png`, `opcoes-video-*.png` — brutas.

---

## 6. Limitações e próximos passos

- **Crow Country:** o pedido de 2026-10-08 era "idêntico ao estilo de Crow
  Country". O filtro faz o dither e a cor achatada, mas **não tem** vinheta
  escura, granulado (grain) e bordas sujas. Esses itens seguem como próximo
  passo se o usuário quiser mais proximidade.
- **Mais forte que o hardware:** o LIGADO (12 degraus) é mais agressivo que os
  32 níveis por canal do PS1 real — foi a escolha explícita do usuário em
  2026-10-14 ("intensidade máxima"). Se quiser o hardware puro, é trocar
  `steps` para 31 e `dither` para ≈0.033.
- **Hardware real:** o sandbox só tem rasterizador por software. Não houve
  teste em GPU dedicada nem em Android físico.
- **Rota CPU:** não aplica efeitos por posição (vinheta). Quando forem
  adicionados, a rota CPU precisa de equivalente.
- **Saves antigos:** `settings.psx` já existia; a leitura migra 1/2/3 → 1
  (LIGADO) e qualquer outro valor cai no padrão de fábrica.
- **Entrega no GitHub:** commit e push na branch da sessão. O PR para `main` só
  é aberto e mesclado quando o usuário pedir "salve no GitHub" (Regra 11).

---

## 7. Histórico de versões do filtro

| Data | Versão (`ASSET_V`) | Mudança |
|---|---|---|
| 2026-10-08 | `20261008-filtro-ps1` | Primeira entrega: três níveis, dither Bayer 4x4, 15 bits, padrão MÉDIO |
| 2026-10-08 | `20261008-filtro-crow` | Intensidade maior (dither 0.10, 15 degraus) e dessaturação de 32% |
| 2026-10-08 | `20261008-filtro-contraste` | **Remove a dessaturação** (que tirou o contraste do jogo) e adiciona ganho de contraste 1.06 / 1.12 / 1.16 |
| 2026-10-14 | `20261014-filtro-ps1-ligado` | **Só LIGADO / DESLIGADO**: os três níveis saem do menu, LIGADO = intensidade máxima (dither 0.13 / 12 degraus / contraste 1.16) em 960×540; saves antigos viram LIGADO |
