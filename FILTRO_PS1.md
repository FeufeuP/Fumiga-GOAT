# Filtro PS1 (quadriculado estilo Resident Evil / Crow Country)

Documento único sobre o filtro de imagem PS1. Tudo que diz respeito a ele
está aqui: pedido, decisões, níveis, arquitetura, testes, capturas e
limitações. Os registros do `MEGA_ARQUIVO.md` apontam para este documento.

**Status:** implementado, ligado por padrão (nível MÉDIO), testado e no preview.
**Branch:** `arena/76cd99cb-fumiga-goat`.
**Última atualização:** 2026-10-08.

---

## 1. Pedido do usuário

Em 2026-10-08 (pt-BR):

1. *"quero que vc agr aplique um filtro de ps1 estilo resident evil com os
   gráficos low poly quero apenas aquele filtro quadriculado sem a
   modelagem 3d"* — **só o filtro**, sem 3D e sem geometria low poly nova.
2. *"Quero que o filtro seja mais forte, idêntico ao estilo de Crow Country"* —
   intensidade maior, referência Crow Country (aproximação, não cópia exata).
3. *"O filtro tirou o contraste do jogo, mantenha o contraste do jogo. E
   coloque tudo sobre o filtro dentro de um novo documento."* — contraste do
   jogo preservado; documentação consolidada aqui.

### Decisões fechadas com o usuário (perguntas com opções)

| Tema | Escolha |
|---|---|
| Intensidade | Implementar os **três níveis** (LEVE / MÉDIO / FIEL) e mostrar capturas; o usuário escolhe o padrão |
| Padrão do dither | **Bayer 4x4** (dither ordenado clássico do PS1/RE) |
| Onde aplicar | **Tudo**: mundo, HUD, menus e título |
| Ativação | **Ligado por padrão** + item em OPÇÕES → VÍDEO com DESLIGADO / LEVE / MÉDIO / FIEL AO PS1 |
| Convivência | Coexiste com o toggle SCANLINES RETRÔ já existente |

**Padrão atual: MÉDIO** — provisório até o usuário escolher o padrão final
após as capturas.

---

## 2. Como o filtro funciona

É um **pós-processamento 2D do quadro**, não um modelo 3D. O que a GPU do PS1
fazia na saída de vídeo: dither ordenado 4x4 e quantização para 15 bits por
pixel (5 bits por canal).

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

### Contraste (correção da versão anterior)

A primeira versão mais forte também **dessaturava** a imagem. Isso achatou o
contraste e o jogo perdeu cor e profundidade. A dessaturação foi **removida
dos quatro níveis**. Agora o filtro só faz contraste, dither e quantização —
o contraste do jogo é mantido e reforçado de leve.

---

## 3. Níveis

Valores em `game/js/psx_filter.js`, em `PSX_OPTS` (o índice é o valor salvo em
`settings.psx`).

| Índice | Nível | dither | degraus de cor | contraste | escala | Observação |
|---|---|---|---|---|---|---|
| 0 | DESLIGADO | 0 | 255 | 1.00 | 1 | filtro oculto |
| 1 | LEVE | 0.06 | 24 | 1.06 | 1 | quadriculado sutil |
| **2** | **MÉDIO** (padrão) | 0.10 | 15 | 1.12 | 1 | xadrez claro, cor preservada |
| 3 | FIEL AO PS1 | 0.13 | 12 | 1.16 | 0.5 | buffer 480×270 esticado (pixels gordos) |

- `degraus de cor` = 15 bits por pixel corresponde a 31 degraus; o MÉDIO usa
  15 degraus para ficar mais visível.
- O nível FIEL usa buffer de 480×270; o `#game` continua 960×540.

### Padrão de fábrica

`PSX_DEFAULT = 2` (MÉDIO). O filtro vem **ligado** para quem abre o jogo sem
save. Quem preferir pode desligar em OPÇÕES → VÍDEO.

---

## 4. Arquitetura e arquivos

| Peça | Arquivo | Papel |
|---|---|---|
| Módulo do filtro | `game/js/psx_filter.js` | níveis, shader WebGL, rota CPU/LUT, vigia de desempenho |
| Canvas do jogo | `game/index.html`, `game/mobile/index.html` | canvas `#psx` por cima do `#game` |
| Estilo | `game/css/style.css`, `game/mobile/mobile.css` | posicionamento, `pointer-events: none`, `z-index` |
| Encaixe no loop | `game/js/main.js` | `initPsxFilter` no boot (depois do save), `resizePsxFilter` no `fit()`, `drawPsxFilter` e `notaQuadroPsx` no fim do quadro |
| Menu | `game/js/game.js` | `optChoice` + linha FILTRO PS1 em OPÇÕES → VÍDEO |
| Save | `game/js/state.js` | `settings.psx` (inteiro 0–3, validado; padrão 2) |
| Versão de assets | `game/js/assets.js` | `ASSET_V = "20261008-filtro-contraste"` |
| Pacote | `app/assets.json` | 233 arquivos / 24,9 MB (era 232: entrou `psx_filter.js`) |
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
- Medido no sandbox (SwiftShader): 58–60 FPS com o filtro ligado.

---

## 5. Pesquisa de referência (Regra 2)

- Dither 4x4 + 15 bits do PS1 (hardware) —
  https://github.com/Gageformer/Ember/issues/52
- Receita de shader PS1 (color_depth 5, matriz 4x4, resolution_scale) —
  https://godotshaders.com/shader/ps1-post-processing/
- Matriz Bayer 4x4 e fórmulas de dither ordenado para canvas/web —
  https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/
- Jogos PSX-style modernos (Signalis, Crow Country, Dusk, Lunacid, Ultrakill) —
  https://www.reddit.com/r/gamedev/comments/1dvpyl2/are_people_tired_of_ps1like_retro_styled_games/
  e https://www.reddit.com/r/IndieGaming/comments/1jew4hl/modern_games_with_that_ps1_low_poly_style/
- Crow Country (homenagem a Resident Evil/Silent Hill; referência de "sujeira"
  visual) — https://www.resetera.com/threads/crow-country-this-new-resident-hill-game-slaps.1052154/

---

## 6. Testes e verificação

| Verificação | Resultado |
|---|---|
| `node game/test/psx-filter-browser.mjs` (após o ajuste de contraste) | **OK** — PC e mobile, rotas webgl e cpu; canvas separado, `#game` 960×540, alinhamento, MÉDIO padrão, três níveis, persistência, sem erros de console |
| Diferença média do quadro com o filtro | ~10 (era ~3,5 antes do ajuste de força); ruído de 1 quadro ~0,02–0,03 |
| `npm run test:quick` | 29/29 (última rodada antes do ajuste de contraste — **repetir antes do push**) |
| `npm test` completo (34 testes) | passou na rodada de 2026-10-08 com a versão anterior do filtro; **repetir** após esta mudança |
| `npm run inspect` (PC + mobile, 6 mapas) | sem erros de JS, 404 ou glifo na rodada anterior |
| `npm run inspect:layout` (118 estados) | layout limpo na rodada anterior, inclusive com fonte grande |

### Capturas (fora do Git, em `/home/user/capturas-ps1/`)

- `comparacao-contraste.png` — **versão atual**: DESLIGADO, LEVE, MÉDIO, FIEL
  no mesmo cenário (mapa 3, seed 7). Cores e contraste do jogo preservados.
- `comparacao-crow.png` e `zoom-crow.png` — versão anterior (mais forte, com
  dessaturação). Mantidas só como referência do que foi corrigido.
- `zoom-off.png`, `zoom-medio.png`, `zoom-fiel.png` — recortes ampliados.

---

## 7. Limitações e próximos passos

- **Crow Country:** o pedido era "idêntico ao estilo de Crow Country". O filtro
  faz o dither e a cor achatada, mas **não tem** vinheta escura, granulado
  (grain) e bordas sujas. Esses itens são o próximo passo se o usuário quiser
  mais proximidade.
- **Padrão final:** o usuário ainda vai escolher o padrão definitivo entre
  LEVE, MÉDIO e FIEL. Hoje o padrão é MÉDIO.
- **Hardware real:** o sandbox só tem rasterizador por software. Não houve
  teste em GPU dedicada nem em Android físico.
- **Rota CPU:** não aplica a dessaturação (já removida dos níveis) nem efeitos
  por posição (vinheta). Quando forem adicionados, a rota CPU precisa de
  equivalente.
- **Saves antigos:** `settings.psx` é chave nova. Saves sem a chave começam no
  MÉDIO.
- **Entrega no GitHub:** commit e push na branch da sessão. O PR para `main` só
  é aberto e mesclado quando o usuário pedir "salve no GitHub" (Regra 11).

---

## 8. Histórico de versões do filtro

| Data | Versão (`ASSET_V`) | Mudança |
|---|---|---|
| 2026-10-08 | `20261008-filtro-ps1` | Primeira entrega: três níveis, dither Bayer 4x4, 15 bits, padrão MÉDIO |
| 2026-10-08 | `20261008-filtro-crow` | Intensidade maior (dither 0.10, 15 degraus) e dessaturação de 32% |
| 2026-10-08 | `20261008-filtro-contraste` | **Remove a dessaturação** (que tirou o contraste do jogo) e adiciona ganho de contraste 1.06 / 1.12 / 1.16 |
