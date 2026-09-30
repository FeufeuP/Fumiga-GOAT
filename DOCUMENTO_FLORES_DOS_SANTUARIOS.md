# 🌸 Documento — Como criar as flores dos próximos Santuários

**Criado em:** 30 de setembro de 2026
**Vale para:** Santuários da Floresta, do Pântano, do Deserto, do Outono, do Gelo e da Pálida
(o da **Planície já está pronto** e é o modelo — ver seção 10).
**Status:** regra obrigatória, no mesmo nível de [`REGRAS_DE_TRABALHO.md`](REGRAS_DE_TRABALHO.md).
Quem for criar flores de um santuário novo **lê este documento inteiro antes de gerar qualquer imagem**.

---

## 1. As três regras que não podem ser quebradas

> ### 1️⃣ Cada santuário tem **exatamente 3 variações** de flor.
> ### 2️⃣ Cada variação tem **exatamente 4 sprites** (4 estágios). Total: **12 sprites por santuário**.
> ### 3️⃣ As 3 variações **NÃO são feitas de uma vez.** Faz-se **uma variação**, **PARA**, e só segue
> ### para a próxima **depois da confirmação explícita do usuário.** Três variações = três confirmações.

Se alguma dessas regras não puder ser cumprida, **pare e pergunte** — não improvise.

Itens que **nunca** são aceitáveis:

- ❌ Gerar as 3 variações na mesma rodada, mesmo que "já esteja tudo combinado".
- ❌ Gerar a variação 2 porque o usuário "aprovou os sprites soltos" da variação 1 — a aprovação é da
  **variação inteira** (os 4 estágios juntos, lado a lado), dada de forma explícita.
- ❌ Entregar 2 variações, 4 variações ou uma variação com 3 sprites (ou 5).
- ❌ Integrar no jogo (código, custos, testes) **antes** das 3 variações estarem aprovadas.
- ❌ Reaproveitar uma flor da Planície ou de outro santuário trocando só a cor.

---

## 2. Os 4 sprites de cada variação

Cada variação é uma **espécie** temática do bioma e precisa dos mesmos 4 estágios. A ordem das colunas
na folha é **fixa** (é a que o código lê):

| Coluna | Sufixo do arquivo | Estágio | Quando aparece no jogo | Cor |
|:------:|-------------------|---------|------------------------|-----|
| 0 | `1_broto` | **Broto** | 1ª compra (`level === 1`) | colorido |
| 1 | `2_meio` | **Broto meio aberto** | 2ª compra (`level === 2`) | colorido |
| 2 | `3_flor` | **Flor florescida** | melhoria completa (`level >= max`, 3ª compra) | colorido |
| 3 | `0_morto` | **Broto morto** | **antes de comprar** (`level === 0`) | **cinza** (o jogo dessatura) |

> ℹ️ O sufixo `0_morto` vem de "nível 0". Na folha ele fica na **4ª coluna** (índice 3), depois da flor
> florescida. Não troque a ordem.

### Como cada estágio deve parecer

- **Broto (col. 0):** botão fechado, caule reto e saudável, poucas folhas, uma gota de orvalho. É a menor
  das silhuetas (altura-alvo ≈ 74% da célula).
- **Broto meio aberto (col. 1):** pétalas/sépalas começando a se abrir mostrando o miolo. Silhueta
  intermediária (≈ 85%).
- **Flor florescida (col. 2):** flor totalmente aberta, miolo visível, detalhes temáticos na base
  (plantas do bioma), partículas pequenas permitidas. A maior das silhuetas (≈ 95%).
- **Broto morto (col. 3):** **a mesma espécie** do broto vivo, mas murcha — caule torto, cabeça caída
  pendendo, botão encolhido e ressecado, folhas secas marrom-acinzentadas e enroladas. **Sem orvalho, sem
  brilho, sem vida.** Altura-alvo ≈ 80% da célula. Precisa se ler como "morta" **mesmo em tons de cinza**,
  porque é assim que o jogador a verá.

### Coerência dentro da variação

Os 4 sprites são **a mesma planta** em momentos diferentes: mesma paleta-base, mesmo tipo de folha, mesmo
contorno, mesma família de detalhes na base. Uma pessoa deve reconhecer a espécie em qualquer um dos 4.

### Distinção entre as 3 variações

As 3 variações do mesmo santuário devem se distinguir **pela silhueta e pela cor dominante**, não só pela
cor: o jogador enxerga a flor com ~48 px, em cinza no estado morto. Evite três flores de formato redondo
parecido.

---

## 3. Fluxo obrigatório (passo a passo)

O fluxo segue as Regras 1, 2, 4, 6 e 12 de `REGRAS_DE_TRABALHO.md`. Os pontos de **PARADA** são
obrigatórios.

### Etapa 0 — Pesquisa e perguntas (uma vez por santuário)

1. **Pesquisar inspirações indie** (Regra 2) para as flores daquele bioma e registrar os links.
2. **Perguntar com opções** (Regra 1, `ask_user`) antes de desenhar qualquer coisa:
   - quais são as **3 espécies** do bioma (nome, silhueta, paleta, detalhes de base) — ver a seção 7 para
     sugestões;
   - em que **ordem** as 3 variações serão feitas;
   - o visual do **broto morto** daquele bioma (murcho, seco, queimado, congelado…);
   - confirmar que o escopo é **somente a arte** dessa etapa (a integração é a Etapa 4).
3. ⛔ **PARADA 0:** só começa a desenhar depois da resposta do usuário.

### Etapa 1 — Variação 1 (4 sprites)

1. Gerar os **4 sprites** da variação 1, **um estágio por vez na ordem**: florescida → meio aberto →
   broto → morto (a flor aberta define a espécie; os outros derivam dela, usando-a como imagem de
   referência).
2. Cada sprite é apresentado com **2 opções** e o usuário escolhe uma (Regra 6). A ferramenta de imagem
   aceita no máximo 3 pedidos de opções por resposta, então a variação pode levar mais de uma resposta.
   Isso é normal, mas **todos os 4 sprites são da mesma variação**.
3. Com os 4 escolhidos, montar **uma prévia lado a lado** (os 4 estágios em linha, e uma versão em cinza
   do broto morto) e **mostrar ao usuário** (`read_file` / `present_file`).
4. ⛔ **PARADA 1 (confirmação da variação 1):** perguntar com `ask_user`, por exemplo:
   `A) Aprovar a variação 1 e seguir para a 2 · B) Refazer o estágio X · C) Refazer a variação inteira ·
   D) Outro`. **Não gerar nada da variação 2 até receber "A" (ou equivalente claro).**

### Etapa 2 — Variação 2 (4 sprites)

Igual à Etapa 1, usando a variação 1 aprovada como referência de **estilo** (não de espécie).
⛔ **PARADA 2 (confirmação da variação 2).**

### Etapa 3 — Variação 3 (4 sprites)

Igual à Etapa 1. ⛔ **PARADA 3 (confirmação da variação 3).**

### Etapa 4 — Folha, integração e verificação (só depois das 3 confirmações)

1. Montar a folha (seção 5).
2. Integrar no código (seção 6).
3. Rodar os testes e **jogar no navegador** (Regra 4), abrindo as capturas com `read_file`.
4. Atualizar a documentação, incluindo o `MEGA_ARQUIVO.md` (Regra 12).
5. Fazer o **check-in** (Regra 3) com a tabela de conferência.

> **Resumo da cadência:** Etapa 0 → ⛔ → Var. 1 → ⛔ → Var. 2 → ⛔ → Var. 3 → ⛔ → integrar.
> Cada ⛔ é uma confirmação **do usuário**, nunca presumida. Se o usuário pedir ajustes, refaz-se e
> **pergunta-se de novo** antes de avançar.

---

## 4. Especificação dos originais (arte-fonte)

| Item | Regra |
|------|-------|
| **Estilo** | Pixel art com contorno escuro grosso, paleta rica e luz de baixo contraste, **no mesmo estilo e acabamento das flores da Planície** (a folha `game/assets/ui/flores_planicie.png` é a referência visual). |
| **Fundo** | Cor chapada **violeta `#1d1127`** (RGB 29, 17, 39), sem sombra, sem gradiente, sem chão, sem texto. O preparo remove esse fundo por inundação a partir das bordas. |
| **Enquadramento** | **Uma** planta por imagem, centrada, base do caule na parte de baixo, com margem. Nada cortado nas bordas. |
| **Tamanho** | Imagem quadrada, ≥ 1024×1024 (o preparo reduz pela metade acima de 1024). |
| **Leitura pequena** | O jogo mostra cada flor em **48×48 px**. Conferir a silhueta em 48 px, colorida e em cinza, antes de pedir aprovação. Detalhes finos (orvalho, grãos, partículas) somem nesse tamanho — não dependa deles. |
| **Bioma** | Cores, folhas e plantas de base **do bioma** (ver seção 7). Sem figuras humanas. |
| **Proibido** | Texto, marca d'água, moldura, várias flores na mesma imagem, grade/colagem de estágios na mesma imagem. |

### Nomes e onde ficam

Originais de alta resolução ficam em **`art-source/flores/`** (fora do Git, por decisão do projeto — ver
`.gitignore`). Nome obrigatório:

```
art-source/flores/<mundo>_<flor>_<estagio>.png

<mundo>   = planicie | floresta | pantano | deserto | outono | gelo | palida
<flor>    = slug curto da espécie, sem acento (ex.: margarida, botao, trevo)
<estagio> = 1_broto | 2_meio | 3_flor | 0_morto
```

Exemplo para um santuário novo: `floresta_<a>_1_broto.png`, `floresta_<a>_2_meio.png`,
`floresta_<a>_3_flor.png`, `floresta_<a>_0_morto.png` — e o mesmo para `<b>` e `<c>`.

> ⚠️ `art-source/` **não é versionado**: os originais da Planície ficaram só no ambiente onde foram
> gerados. **Guarde os originais do santuário novo em um lugar seguro** (e diga ao usuário onde), senão um
> ajuste futuro só será possível editando a folha final.

---

## 5. Preparo da folha (`flores_<mundo>.png`)

Uma folha por santuário, **768×576 RGBA**: **4 colunas (estágios) × 3 linhas (variações)**, células de
**192×192** com a base do caule ancorada embaixo, paleta quantizada em 256 cores.

```
            col 0        col 1          col 2        col 3
linha 0    broto  |  meio aberto  |  florescida  |  morto      ← variação 1
linha 1    broto  |  meio aberto  |  florescida  |  morto      ← variação 2
linha 2    broto  |  meio aberto  |  florescida  |  morto      ← variação 3
```

**Passos:**

1. Em `tools/prepare_fruit_art.py`, registrar as 3 espécies do mundo em `FLORES_VARIACOES`
   (a **ordem** define as linhas 0, 1 e 2):
   ```python
   FLORES_VARIACOES = {
       "planicie": ["margarida", "botao", "trevo"],
       "floresta": ["<a>", "<b>", "<c>"],   # ← exemplo
   }
   ```
2. Gerar a folha:
   ```bash
   python3 tools/prepare_fruit_art.py flores <mundo> game/assets/ui/flores_<mundo>.png
   ```
   (Pillow é só ferramenta de arte; nunca é dependência do jogo.)
3. **Conferir a folha** sobre fundo escuro (`convert ... -background '#1d1127' -alpha remove`) e abri-la
   com `read_file`: nada cortado, fundo limpo, 12 células preenchidas, contorno contínuo.
4. Metas: dimensões **768×576**, **~190–260 KB**, alfa real (PNG RGBA).

Se algum estágio precisar de ajuste isolado e o original existir em `art-source/`, refaça só ele; células
sem original são copiadas da folha atual pelo próprio script.

---

## 6. Integração no jogo (Etapa 4) — lista de alterações

O desenho já é genérico: `drawFlowerArt` (em `game/js/meta.js`) procura `IMG["flores_" +
fruitAssetName(fruit)]` e, se a folha existir, usa os 4 estágios; se não existir, cai no desenho
procedural antigo. Para um santuário novo:

| # | O que fazer | Onde |
|---|-------------|------|
| 1 | Registrar `flores_<mundo>: "ui/flores_<mundo>.png"` no boot | `MANIFEST` em `game/js/assets.js` |
| 2 | **Subir `ASSET_V`** (senão o celular mantém cache antigo) | `game/js/assets.js` |
| 3 | Dar **3 níveis de compra** às 13 melhorias do mundo (3 legadas + 10 globais; na Pálida, só as globais): `cost` com **3 elementos** | `FRUIT_TREES` em `game/js/config.js` e `NEW_FRUIT_NODES` em `game/js/fruit_skills.js` (hoje há um `map === 'planicie'` que precisa virar uma lista de mundos com flores) |
| 4 | Atualizar os testes que hoje assumem "Planície = 3 níveis, resto = 1" | `game/test/fruit-powers.mjs` (`n.cost.length`), `fruits.mjs`, `tree-browser.mjs` |
| 5 | Testar a folha nova (dimensões 768×576, RGBA) | `game/test/assets.mjs` |
| 6 | Atualizar documentação | `MEGA_ARQUIVO.md` (Regra 12), `game/assets/ui/README.md`, `PROXIMOS_PASSOS_DA_ARVORE.md` (contagem de PNGs) |

**Regras de integração:**

- **Folha e 3 níveis andam juntos:** nunca deixe um mundo com 3 níveis de compra e sem a folha, nem a
  folha sem os 3 níveis. O mapeamento de estágios (`flowerStage`) depende de `max = 3`:
  0 → morto (cinza) · 1 → broto · 2 → meio aberto · 3 → florescida.
- **Preços:** a Planície usa, nas legadas, `20/30/45`, `35/50/70` e `50/75/100` (o 2º nível custa ~1,5× o
  1º e o 3º ~2–2,25×) e, nas globais, `[c0, c0+30, c0+60]`. **Não copie esses números às cegas:** proponha os preços do novo mundo **e peça confirmação**
  (Regra 1) antes de gravar em `config.js`. Preços devem ser crescentes e respeitar os testes de
  progressão (`tree-progression.mjs`).
- **Variação por flor:** hoje `flowerVariant` escolhe a variação por `_nodeIdx % 3` ou pelo número final
  do ID. Mantenha esse mapeamento (uma folha por mundo, 3 linhas); não crie outro esquema sem perguntar.
- **Pálida:** o mapa `topo` usa os arquivos `*_palida` (`fruitAssetName`). Use sempre `palida` nos nomes.
- **Texto do painel:** o rótulo de estágio (`BROTO MORTO`, `BROTO`, `MEIO ABERTO`, `FLORESCIDA`) já é
  genérico. Só use glifos existentes em `FONT_CHARS` (`test/assets.mjs` acusa o resto).

---

## 7. Sugestões de temas por bioma (só ponto de partida — o usuário decide)

As cores abaixo vêm da paleta de flores de cada mapa em `game/js/config.js`. **São sugestões para a
pergunta da Etapa 0, não decisões.** Cada espécie final precisa de aprovação do usuário.

| Santuário | Paleta de flores do bioma | Direções possíveis (perguntar) |
|-----------|---------------------------|--------------------------------|
| Floresta de Musgo | violeta `#c26be0`, azul-claro `#7fd6ff`, dourado `#ffd479` | flores de sombra e musgo, cogumelo-flor, flor de sino; base com musgo e samambaia |
| Pântano | azul-claro `#7fd6ff`, violeta `#c26be0` | lírio-d'água, flor bioluminescente, flor carnívora; base com lama, juncos e vitória-régia |
| Deserto | dourado `#ffd479`, laranja `#ff9a5c` | flor de cacto, flor-de-areia, flor de brasa; base com areia, pedra e espinhos |
| Outono | laranja `#ff9a5c`, dourado `#ffd479`, violeta `#c26be0` | crisântemo, flor de folha-seca, flor de bolota; base com folhas caídas |
| Gelo | branco `#e8f4ff`, azul-claro `#7fd6ff`, lilás `#c98df5` | flor de cristal, flor de geada, flor de neve; base com gelo e neve |
| Pálida (futura) | a definir com o usuário | depende do lore (`LORE.md`); perguntar antes de qualquer arte |

Para o **broto morto**, sugerir ao usuário uma variante coerente com o bioma (seco no Deserto,
apodrecido no Pântano, congelado/quebradiço no Gelo, etc.) — mas a forma base continua sendo
**caule torto + cabeça caída + folhas secas**, para o jogador reconhecer o "morto" em qualquer mundo.

---

## 8. Critérios de aceite (checklist da variação e do santuário)

**Por variação (antes de pedir a confirmação):**

- [ ] Exatamente **4 sprites**: broto, meio aberto, florescida, morto.
- [ ] Mesma espécie nos 4 (paleta, folhas, contorno, base).
- [ ] Silhueta crescente: broto < meio aberto < florescida.
- [ ] Morto claramente morto, **legível em cinza**, sem orvalho nem brilho.
- [ ] Fundo `#1d1127` uniforme, nada cortado, nome de arquivo correto em `art-source/flores/`.
- [ ] Prévia lado a lado mostrada ao usuário.
- [ ] ⛔ **Confirmação explícita do usuário recebida.**

**Por santuário (antes de fechar a entrega):**

- [ ] **3 variações** feitas **em sequência**, com **3 confirmações** registradas.
- [ ] As 3 se distinguem pela silhueta, não só pela cor.
- [ ] `flores_<mundo>.png` = 768×576 RGBA, ~190–260 KB, 12 células preenchidas.
- [ ] `MANIFEST` + `ASSET_V` atualizados; 13 melhorias com 3 níveis; preços confirmados.
- [ ] `npm run test:quick` e `npm test` verdes; `node game/test/tree-browser.mjs` verde (PC e mobile).
- [ ] Jogado no navegador: santuário sem compras (só mortos em cinza) e com compras (todos os estágios).
- [ ] `MEGA_ARQUIVO.md` e `game/assets/ui/README.md` atualizados; `docs.mjs` íntegro.
- [ ] Check-in (Regra 3) apresentado ao usuário.

---

## 9. Modelo de mensagem para cada ⛔ PARADA

Ao terminar uma variação, o relatório ao usuário deve conter, nesta ordem:

1. A **prévia** dos 4 estágios (imagem lado a lado) e a versão cinza do morto;
2. Um resumo de 2–3 linhas: nome da espécie, paleta, detalhe da base;
3. **A pergunta de confirmação** (com opções, inclusive "refazer estágio X");
4. A frase explícita: **"Não vou começar a variação N+1 antes da sua confirmação."**

Só depois da resposta o trabalho continua.

---

## 10. Modelo de referência — Santuário da Planície (pronto)

Folha: `game/assets/ui/flores_planicie.png` (768×576). Código: `game/js/meta.js` (`flowerStage`,
`flowerVariant`, `flowerSheet`, `drawFlowerArt`). Histórico: `MEGA_ARQUIVO.md`, entregas de 2026-09-29 e
2026-09-30.

| Linha | Variação | Espécie | Paleta |
|:-----:|----------|---------|--------|
| 0 | Margarida-do-Amanhecer | flor de pétalas compridas | branco-creme, miolo âmbar, trigo na base |
| 1 | Botão-de-Ouro Solar | flor em cálice | amarelo-ouro/âmbar, folhas recortadas |
| 2 | Trevo-Lilás Silvestre | trevo em capítulo | lilás/rosa, folhas de trevo e trigo |

Broto morto da Planície: margarida cinza-carvão, botão âmbar seco, trevo rosa desbotado com folhas secas.

---

## 11. Perguntas frequentes

**Posso gerar as 3 variações de uma vez para ganhar tempo?** Não. É proibido (seção 1). A cada variação
o usuário confirma.

**O usuário já escolheu "a melhor de 2 opções" de cada sprite. Isso conta como confirmação?** Não.
Escolher entre opções é a seleção do sprite. A confirmação da variação é um passo **separado**, depois de
ver os 4 estágios juntos.

**E se o usuário aprovar as variações 1 e 2 e pedir para refazer a 1 depois?** Refaz-se a variação 1 e
pede-se confirmação de novo; a 3ª só começa depois de a 1 ser reaprovada, se ela ainda estiver em aberto.

**Posso fazer dois santuários em sequência?** Só depois de fechar o primeiro (folha integrada, testes
verdes) **e** o usuário pedir o próximo. Um santuário por entrega.

**Quero 4 ou 2 variações em algum mundo.** A regra é 3. Mudar isso exige decisão explícita do usuário e
mudança de `flowerVariant`, da folha e dos testes.
