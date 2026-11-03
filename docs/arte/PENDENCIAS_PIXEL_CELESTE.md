# Pendências — PIXEL CELESTE

Levantado em **2026-11-03** no branch `arena/6d62fc93-fumiga-goat`, commit `96c33e4`.
Este documento é o inventário do que falta. Ele não substitui
`FASES_PIXEL_CELESTE.md` (o plano) nem `ORDEM_IMPLEMENTACAO.md` (a ordem) — ele lista
o estado real de cada item, com o ponto do código onde a pendência vive.

**Status:** `⏳ pendente` · `🔒 bloqueada` (exige decisão do usuário) · `➖ dispensada`.

---

## 1. F0c — Piloto de arte nativa (o bloqueio atual)

Situação: pipeline, fichas e peças prontas e aprovadas pela **validação automática**
(alfa binário, paleta exata, sem anti-aliasing, sem preto puro). O usuário reprovou as
cinco peças na inspeção visual em 2026-11-03 e mandou recomeçar.

### 1.1 Aceite da fase

| item do aceite | status | nota |
|---|---|---|
| silhueta legível no tamanho nativo | ⏳ | reprovado pelo usuário; fonte lisa não reduz |
| mesma paleta nas 5 peças | ✅ | Planície, métrica idêntica à do runtime |
| mock no jogo (HUD atual + HUD da F1) | 🔒 | depende da F1 existir |
| 24 rotações da Cortadeira | ➖ | retirado do aceite pelo usuário (1 quadro) |

### 1.2 Itens concretos

- **Regenerar as 5 peças com prompt de pixel art explícito.** Decisão do usuário de
  2026-11-03 após duas rodadas de *gerar → recortar → reduzir* falharem pelo mesmo
  motivo: a fonte vem sem grade de pixel (confiança 65–78 %, limiar 90 %) e a redução
  por média de área transforma ilustração em borrão.
  - Feito: cortadeira, larva e cristal regerados em `art-source/f0c/` (12:20).
  - **Pendente: rainha e base** — o usuário não escolheu opção.
- **Aplicar a regra de tamanho "proporcional ao mundo".** Decisão do usuário: o chão é
  enorme na tela, então ganha mais pixels — **tile de 16×16 em vez de 8×8**.
  - Ainda não foi para `docs/arte/piloto-f0c/fichas.json`.
  - Mexe no contrato: 8×8 está em `ESTILO_OFICIAL.md` e em `contratos-pixel.json`.
  - Mexe no consumidor: `world.js:363 bakeGround(rng)`.
- **Backupear os fontes.** `art-source/` está no `.gitignore:52`. Os 5 fontes da F0c
  (5,6 MB) estão só no workspace; os 3 regerados somem se o sandbox resetar.

### 1.3 Peças produzidas e não integradas

| peça | nativo atual | arquivo | consumidor que deveria receber |
|---|---|---|---|
| rainha | 63×63 | `docs/arte/piloto-f0c/rainha-nativo.png` | `main.js:277` (bakeRot via `ANT_NATIVE`) |
| cortadeira | 21×21 | `docs/arte/piloto-f0c/cortadeira-nativo.png` | idem |
| larva | 24×24 | `docs/arte/piloto-f0c/larva-nativo.png` | `nest.js:1455` (hoje elipse procedural) |
| cristal | 24×24 | `docs/arte/piloto-f0c/cristal-nativo.png` | `render.js:97` (hoje gradiente radial) |
| base | 8×8/tile | `docs/arte/piloto-f0c/base-nativo.png` | `world.js:363 bakeGround` |

> As três primeiras colunas valem para o estado commitado em `96c33e4`. Se o tile virar
> 16×16, a base muda junto.

---

## 2. Dívida técnica — arte antiga ainda rodando no jogo

Verificado no código em 2026-11-03. Nenhuma destas foi convertida pelas fases já
concluídas (F0a, F0b, F0b-2).

| onde | o que ainda é antigo | fase dona |
|---|---|---|
| `render.js:97` | cristal de essência = **gradiente radial**, não sprite | F2 |
| `render.js:209` | brilho de hotspot = gradiente radial | F2 |
| `render.js:385` | sombra de unidade = gradiente radial | F2 |
| `render.js:1093`, `1100` | brilho do formigueiro = dois gradientes radiais | F2 |
| `render.js:1158` | vinheta = gradiente radial | F2 |
| `nest.js:1455` | larva = **elipse procedural** | F2 |
| `world.js:363` | `bakeGround` = **chão procedural**; a folha da F0c não é consumida | F2 / F6 |
| `render.js:602 bakeBossSheets` | chefes ainda assados em **alta resolução** | F4 |
| `main.js:270` | `dupSprite("soldier", "giant")` — gigante é o soldado ampliado 5× | F4 |
| `config.js:81 ANT_NATIVE` | ainda é `round(mundo / 3)`; a decisão do usuário de que **tamanho é decisão de arte** (não consequência de `ANT_SIZES`) ainda não chegou no config | F2 |

**Já convertido:** as 18 castas são assadas no tamanho nativo com 1 frame cada
(`main.js:277`, `bakeRot(k, s, ANT_ANGLES)` + `setRotScale(k, 1)`), mais a POTE-DE-MEL
em `main.js:283`.

---

## 3. Fases do plano — F1 em diante

Nenhuma começada.

| fase | conteúdo | depende | status |
|---|---|---|---|
| **F1** | UI, HUD, ícones e tipografia a 320×180 | F0c | ⏳ |
| **F2** | 12 castas, rainha, névoa, cristais, comida, VFX | F1 | ⏳ |
| **F3a** | Árvore + 7 maçãs (cinza/cor) | F2 | ⏳ |
| **F3b** | 6 santuários 320×180 | F3a | ⏳ |
| **F3c** | Flores de cada santuário (9+9) | F3b | ⏳ |
| **F4** | 6 chefes, células 22×22, telegráficos | F2 | ⏳ |
| **F5a** | TITLE/PRETITLE, 4 camadas + logo | F1 | ⏳ |
| **F5b** | 6 telas de carregamento | F5a | ⏳ |
| **F5c** | Noite Branca, 3 painéis × 4 camadas | F5a | ⏳ |
| **F5d** | Outros painéis de memória | F5a | 🔒 bloqueada pelo usuário |
| **F6** | 7 inimigos, 6 terrenos, 55 props | F4 / F5 | ⏳ |
| **F7** | Ninho escavável: exterior, interior, câmaras, Eras | F6 | ⏳ |
| **F8** | Pálida | — | 🔒 bloqueada pelo usuário |
| **F9** | PWA, ícones nativos, site, pacote offline | tudo integrado | ⏳ |

---

## 4. Pendências de processo (Regras 12 e 13)

- **MEGA_ARQUIVO.md** — precisa registrar o veredito da F0c e a mudança da regra de
  tamanho (Regra 12: MEGA na mesma entrega).
- **Drive** — só a F0b-2 foi backupeada
  (pasta `2026-10-26-f0b2-pipeline-pixelizacao`, id `15_lnTX6x2ENpH9eEOPEFFU3M-corEgoc`).
  Falta a F0c inteira: 5 fontes, 5 nativos, `prancha-f0c.png`, `cartela-f0c.png`.
- **`npm run inspect` novo** — os números anteriores (sobra de arte em resolução cheia
  na faixa do mundo, uniformidade, pior frame) são de antes da F0c e não valem mais.
- **`game/test/docs.mjs`** — as fichas e o veredito novos precisam passar por ele antes
  de fechar a fase.

---

## 5. Decisões do usuário que mudam o plano

Registradas para não se perderem:

- **2026-11-03 — tamanho não é fixo.** *"não delimite um tamanho para os personagens, a
  única coisa que quero é que tudo fique na mesma grade de pixels."* O requisito é a
  grade comum (1 px nativo = 1 px do buffer de 320×180 = 3 unidades de mundo), não o
  número de pixels de cada peça.
- **2026-11-03 — tamanho proporcional ao mundo.** Coisas grandes na tela (o chão) podem
  ter mais pixels; as formigas, pequenas no mundo, ficam com menos. Tile passa a 16×16.
- **2026-10-26 — um quadro por formiga.** Rotações ficam para F2.
- **2026-10-26 — PIXEL CELESTE não é opção.** *"não é uma opção, é o estilo do jogo
  inteiro."* A linha "Opção de vídeo" da F0b está morta.
- **2026-10-26 — PS1 e scanlines desligados por padrão**, disponíveis em OPÇÕES → VÍDEO.
- **2026-10-26 — manter o passo de canvas-fit 1/3** no mobile (640×360) para o pixel
  ficar quadrado.

---

## 6. Próximo passo sugerido

Fechar a F0c: regenerar rainha e base com o prompt de pixel art explícito, aplicar o
tile 16×16 na ficha e em `bakeGround`, rodar o pipeline e levar as 5 peças para
aprovação visual. Depois F1 (a F0c depende dela para o item de mock com HUD).
