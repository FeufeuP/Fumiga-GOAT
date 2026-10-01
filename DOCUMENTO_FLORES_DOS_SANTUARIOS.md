# 🌸 Documento — Como criar as flores dos próximos Santuários

**Criado em:** 30 de setembro de 2026 · **Modelo v3 (cadência 9 + ⛔ + 9: 9 vivos regulares → pausa → 3 brotos mortos + 6 fases da Flor Suprema), aprovado pelo usuário em 01/10/2026**
**Vale para:** Santuários do Pântano, do Deserto, do Outono, do Gelo e da Pálida
(o da **Planície já está pronto** — seção 10 — e o da **Floresta também** — seção 10b, incluindo as respectivas Flores Supremas de 6 fases; ambos são modelos).
**Status:** regra obrigatória, no mesmo nível de [`REGRAS_DE_TRABALHO.md`](REGRAS_DE_TRABALHO.md).
Quem for criar flores de um santuário novo **lê este documento inteiro antes de gerar qualquer imagem**.

> 📌 **O método completo também está espelhado no `MEGA_ARQUIVO.md`** (seção "MANUAL — Fábrica de
> flores dos Santuários"), pensado para um chat novo trabalhar seguindo só aquele resumo.

---

## 1. As regras que não podem ser quebradas

> ### 1️⃣ Cada santuário tem **exatamente 3 variações regulares** de flor (espécies do bioma) + **1 Flor Suprema exclusiva** (14ª flor).
> ### 2️⃣ Cada variação regular tem **exatamente 4 sprites** (4 estágios = 12 sprites regulares) e a **Flor Suprema tem 6 sprites** (`suprema_0_morto` a `suprema_5_flor`). Total: **18 sprites por santuário**.
> ### 3️⃣ **Cadência oficial em duas levas, com ⛔ parada de confirmação entre elas:**
> - **Leva 1 (uma rodada):** os **9 sprites vivos regulares** — 3 espécies × (florescida, meio aberto, broto).
>   ⛔ **PARADA 1:** prévia lado a lado + confirmação **explícita** do usuário.
> - **Leva 2 (rodada seguinte, só após a confirmação):** os **3 brotos mortos regulares** + as **6 fases da Flor Suprema** (`suprema_0_morto`, `suprema_1_despertar`, `suprema_2_seiva`, `suprema_3_calice`, `suprema_4_abertura`, `suprema_5_flor` — **total de 9 imagens na 2ª leva**).
>   ⛔ **PARADA 2:** prévia das 12 células regulares + tira dos mortos em cinza + prévia das 6 fases da Flor Suprema + confirmação **explícita**.
> - Só depois das **duas confirmações** vem a integração (Etapa 3: `flores_<mundo>.png` 768×576 + `flor_suprema_<mundo>.png` 1152×192).

Se alguma dessas regras não puder ser cumprida, **pare e pergunte** — não improvise.

Itens que **nunca** são aceitáveis:

- ❌ Entregar 2 variações, 4 variações, ou uma variação com 3 sprites (ou 5).
- ❌ Gerar os brotos mortos na mesma leva dos 9 vivos (é a Leva 2, sempre depois da PARADA 1).
- ❌ Gerar o broto morto **a partir da flor florescida/adulta** — ele é a versão morta **do broto**
  (`1_broto`), pequena e simples (lição aprendida na Floresta: a 1ª tentativa, derivada da flor
  adulta, foi rejeitada por parecer "planta florescida").
- ❌ Integrar no jogo (código, custos, testes) **antes** das duas levas estarem aprovadas.
- ❌ Reaproveitar uma flor da Planície, da Floresta ou de outro santuário trocando só a cor.
- ❌ Gravar preços em `config.js`/`fruit_skills.js` **sem confirmação explícita** do usuário
  (os preços sempre em pacotes de opções — ver Etapa 3).
- ❌ Presumir confirmação: toda ⛔ PARADA exige resposta do usuário; silêncio não é aprovação.

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
- **Broto morto (col. 3):** **a mesma espécie do broto vivo**, mas murcha — caule torto e caído,
  botão pequeno encolhido e ressecado pendendo, folhas secas/enroladas, tratamento de "morte" do
  bioma (seco, apodrecido, congelado…). **Sem orvalho, sem brilho, sem vida.** Altura-alvo ≈ 80%
  da célula. **É uma plântula morta, não uma planta adulta morta.** Precisa se ler como "morta"
  **mesmo em tons de cinza**, porque é assim que o jogador a verá.

### Coerência dentro da variação

Os 4 sprites são **a mesma planta** em momentos diferentes: mesma paleta-base, mesmo tipo de folha, mesmo
contorno, mesma família de detalhes na base. **Como garantir na prática (método da Floresta, obrigatório):**

1. Gera-se primeiro a **florescida** de cada espécie (ela define a espécie) — sempre com **2 opções**
   para o usuário escolher (Regra 6). Cabem exatamente 3 gerações-com-opções por resposta: 1 por espécie.
2. **Meio aberto e broto derivam da florescida escolhida**, passando-a como imagem de referência —
   sem novas rodadas de opções (são derivações, não escolhas novas).
3. O **broto morto deriva do broto vivo** (`1_broto`), nunca da florescida — com 2 opções por espécie
   na Leva 2.

### Distinção entre as 3 variações

As 3 variações do mesmo santuário devem se distinguir **pela silhueta e pela cor dominante**, não só pela
cor: o jogador enxerga a flor com ~48 px, em cinza no estado morto. Evite três flores de formato redondo
parecido. Modelo aprovado (Floresta): sino vertical / cogumelo baixo e largo / espiral diagonal.

---

## 3. Fluxo obrigatório (passo a passo)

O fluxo segue as Regras 1, 2, 4, 6, 12 e 13 de `REGRAS_DE_TRABALHO.md`. Os pontos de **PARADA** são
obrigatórios.

### Etapa 0 — Pesquisa e perguntas (uma vez por santuário)

1. **Pesquisar inspirações indie** (Regra 2) para as flores daquele bioma e registrar os links na
   resposta ao usuário (jogo + o que foi aproveitado de cada um).
2. **Perguntar com opções** (Regra 1, `ask_user`) antes de desenhar qualquer coisa:
   - quais são as **3 espécies** do bioma (nome, silhueta, paleta, detalhes de base) — ver a seção 7
     para sugestões, oferecendo 2 conjuntos prontos + opção de misturar/personalizar;
   - em que **ordem** as 3 espécies ficam na folha (linha 0/1/2 — define o mapeamento `flowerVariant`
     e a ordem de geração);
   - o visual do **broto morto** daquele bioma (seco, apodrecido, congelado, queimado…);
   - confirmar que o escopo é **somente a arte** dessa etapa (a integração é a Etapa 3), incluindo a
     quantidade de sprites por rodada nesta sessão (o padrão é 9 + ⛔ + 3).
3. ⛔ **PARADA 0:** só começa a desenhar depois da resposta do usuário.

### Etapa 1 — Leva 1: os 9 sprites vivos (uma rodada)

1. **Florescida de cada espécie**, uma por espécie na ordem aprovada, cada uma com **2 opções**
   (Regra 6) — são 3 gerações-com-opções na mesma resposta (o máximo da ferramenta). A florescida
   define a espécie.
2. Com as 3 florescidas escolhidas, **derivar** de cada uma o **meio aberto** e o **broto** (2 sprites
   por espécie, usando a escolhida como imagem de referência; sem novas opções). Total da rodada:
   3 escolhas + 6 derivações = **9 sprites**.
3. Montar a **prévia lado a lado** no layout da folha (768×576: linhas = espécies, colunas = broto,
   meio, florescida + coluna do morto vazia marcada como pendente) e a **prévia em 48 px** (tamanho
   real do jogo), e **mostrar ao usuário** (`read_file` / `present_file`) (Regra 10).
4. ⛔ **PARADA 1 (confirmação dos 9):** perguntar com `ask_user`, por exemplo:
   `A) Aprovar os 9 sprites e gerar os brotos mortos · B) Refazer o estágio X da espécie Y ·
   C) Refazer a espécie inteira · D) Outro`. **Não gerar nada da Leva 2 até receber "A" (ou
   equivalente claro).**

### Etapa 2 — Leva 2: os 3 brotos mortos (rodada seguinte)

1. Para cada espécie, gerar o broto morto **derivando do `1_broto` aprovado** (mesma espécie, mesma
   silhueta-base), com a "morte" do bioma decidida na Etapa 0. São 3 gerações-com-opções na mesma
   resposta (Regra 6).
2. Reconstruir a **prévia completa** (12 células preenchidas), a **tira dos mortos em cinza** (é assim
   que o jogo os exibe) e a **prévia 48 px**; mostrar tudo (`present_file`).
3. Conferir os fundos: todos devem ser `#1d1127` **chapado e uniforme** — se algum veio com tom
   errado, normalizar **por inundação a partir das bordas** com **verificação de contornos**
   (seção 4.1). Nunca aceitar fundo errado "porque o preparo resolve".
4. ⛔ **PARADA 2 (confirmação dos 12):** mesmas opções da PARADA 1, agora sobre o santuário inteiro.

### Etapa 3 — Folha, integração e verificação (só depois das 2 confirmações)

1. **Qualidade dos originais:** normalizar fundos pendentes (seção 4.1) e sincronizar o **espelho de
   segurança** (Regra 13, seção 4.2).
2. **Montar a folha** (seção 5) e conferi-la sobre fundo escuro abrindo com `read_file`: 12 células
   preenchidas, nada cortado, contorno contínuo.
3. **Preços (Regra 1, sempre antes de gravar):** propor **2 pacotes fechados** (ex.: "espelho da
   Planície" e "premium do mundo N ~+15%") com os números exatos das 3 legadas e das globais, e pedir
   confirmação com `ask_user`. Régua: 2º nível ≈ 1,5× o 1º, 3º ≈ 2–2,25×; globais em passos tipo
   `[c0, c0+Δ, c0+2Δ]`. Precedentes: Planície `20/30/45 · 35/50/70 · 50/75/100` e globais `+30/+60`;
   Floresta `35/50/75 · 50/75/105 · 70/100/140` e globais `+35/+70`.
4. **Integrar no código** (seção 6).
5. Rodar os testes e **jogar no navegador** (Regra 4): `node game/test/tree-browser.mjs` em PC e
   mobile, abrindo as capturas do santuário com `read_file` — uma **sem compras** (só mortos em
   cinza) e uma **com compras** (estágios coloridos).
6. Atualizar a documentação, incluindo o `MEGA_ARQUIVO.md` (Regra 12) e conferir
   `node game/test/docs.mjs`.
7. Subir o **preview** (Regra 7) e fazer o **check-in** (Regra 3) com a tabela de conferência.

> **Resumo da cadência:** Etapa 0 → ⛔ → **9 vivos** → ⛔ → **3 mortos** → ⛔ → integrar.
> Cada ⛔ é uma confirmação **do usuário**, nunca presumida. Se o usuário pedir ajustes, refaz-se e
> **pergunta-se de novo** antes de avançar.

---

## 4. Especificação dos originais (arte-fonte)

| Item | Regra |
|------|-------|
| **Estilo** | Pixel art com contorno escuro grosso, paleta rica e luz de baixo contraste, **no mesmo estilo e acabamento das flores da Planície e da Floresta** (as folhas `game/assets/ui/flores_planicie.png` e `flores_floresta.png` são as referências visuais). |
| **Fundo** | Cor chapada **violeta `#1d1127`** (RGB 29, 17, 39), sem sombra, sem gradiente, sem chão, sem texto. O preparo recorta o fundo pela distância dessa cor (ver 4.1). |
| **Enquadramento** | **Uma** planta por imagem, centrada, base do caule na parte de baixo, com margem. Nada cortado nas bordas. |
| **Tamanho** | Imagem quadrada, ≥ 1024×1024 (o preparo reduz). |
| **Leitura pequena** | O jogo mostra cada flor em **48×48 px**. Conferir a silhueta em 48 px, colorida e em cinza, antes de pedir aprovação. Detalhes finos (orvalho, grãos, partículas) somem nesse tamanho — não dependa deles. |
| **Bioma** | Cores, folhas e plantas de base **do bioma** (ver seção 7). Sem figuras humanas. |
| **Proibido** | Texto, marca d'água, moldura, várias flores na mesma imagem, grade/colagem de estágios na mesma imagem. |

### 4.1. Fundos errados: normalização com verificação de contornos

A ferramenta de geração às vezes devolve o fundo em **tom vizinho** (mais claro ou mais escuro que
`#1d1127`) ou levemente irregular. Isso **quebra o recorte** do preparo (ele confia na cor-chave).
Procedimento obrigatório, sempre que detectado (amostrar os 4 cantos de cada original):

1. Apenas **inundação a partir das bordas** (BFS), nunca substituição global: começa pelos pixels da
   borda próximos da cor de fundo vigente e avança só por pixels semelhantes, trocando-os por
   `#1d1127`. O contorno escuro da planta barra a inundação e protege o interior.
2. **Verificação de contornos obrigatória:** medir as bordas de contraste antes/depois; se a perda
   passar de ~2%, **abortar e manter o original** — e, se a tolerância permitir, refazer com
   tolerância menor. (Caso real: a Espiral florescida abortou com tolerância 5 e passou com 10 +
   1,6% de AA externo — aceito.)
3. Depois de normalizar, toda a **borda** deve ficar a ≤5 de distância da chave `(29,17,39)`.
4. Se nenhuma tolerância segura existir, **regerar o sprite** — nunca entregar fundo errado.

### 4.2. Onde ficam os originais (Regra 13 — obrigatório)

Originais de alta resolução ficam em **`art-source/flores/`** (fora do Git, por decisão do projeto —
ver `.gitignore`), **sempre com espelho de segurança** em **`~/art-source-backup/flores/`**
(fora do repositório, dentro do workspace persistente do Arena): as imagens selecionadas **nunca
podem se perder**. Sincronizar o espelho **a cada sprite escolhido, refeito ou normalizado**.
Nome obrigatório:

```
art-source/flores/<mundo>_<flor>_<estagio>.png

<mundo>   = planicie | floresta | pantano | deserto | outono | gelo | palida
<flor>    = slug curto da espécie, sem acento (ex.: sino, cogumelo, espiral)
<estagio> = 1_broto | 2_meio | 3_flor | 0_morto
```

Exemplo: `pantano_<a>_1_broto.png`, `pantano_<a>_2_meio.png`, `pantano_<a>_3_flor.png`,
`pantano_<a>_0_morto.png` — e o mesmo para `<b>` e `<c>`.

> ⚠️ `art-source/` **não é versionado**: os originais da Planície se perderam quando o ambiente morreu
> (por isso a Regra 13 existe). Diga sempre ao usuário **onde** os originais e o espelho estão.

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
       "floresta": ["sino", "cogumelo", "espiral"],
       "pantano":  ["<a>", "<b>", "<c>"],   # ← exemplo
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

## 6. Integração no jogo (Etapa 3) — lista de alterações

O desenho já é genérico: `drawFlowerArt` (em `game/js/meta.js`) procura `IMG["flores_" +
fruitAssetName(fruit)]` e, se a folha existir, usa os 4 estágios; se não existir, cai no desenho
procedural antigo. Para um santuário novo:

| # | O que fazer | Onde |
|---|-------------|------|
| 1 | Registrar `flores_<mundo>: "ui/flores_<mundo>.png"` no boot | `MANIFEST` em `game/js/assets.js` |
| 2 | **Subir `ASSET_V`** (senão o celular mantém cache antigo) | `game/js/assets.js` |
| 3 | Dar **3 níveis de compra** às 13 melhorias do mundo (3 legadas + 10 globais; na Pálida, só as globais): `cost` com **3 elementos** | legadas: `FRUIT_TREES` em `game/js/config.js`; globais: acrescentar o mundo em `FLOWER_STEPS` em `game/js/fruit_skills.js` (tabela criada na entrega da Floresta — o antigo `map === 'planicie'` não existe mais) |
| 4 | Atualizar os testes | `game/test/fruit-powers.mjs` (lista de mundos com 3 níveis), `assets.mjs` (laço que valida cada folha 768×576 RGBA), `tree-browser.mjs` (**espelhar o bloco da Floresta** para o novo mundo: folha no boot, 3 variações, 13×3 níveis, mortos em cinza, compras 1/2/3) |
| 5 | Atualizar documentação | `MEGA_ARQUIVO.md` (Regra 12), `game/assets/ui/README.md`, `PROXIMOS_PASSOS_DA_ARVORE.md` (contagem de PNGs) |
| 6 | Validar docs | `node game/test/docs.mjs` (REGRAS/MEGA têm blocos espelhados com tamanho + SHA-256) |

**Regras de integração:**

- **Folha e 3 níveis andam juntos:** nunca deixe um mundo com 3 níveis de compra e sem a folha, nem a
  folha sem os 3 níveis. O mapeamento de estágios (`flowerStage`) depende de `max = 3`:
  0 → morto (cinza) · 1 → broto · 2 → meio aberto · 3 → florescida.
- **Preços:** **não copie números às cegas nem os invente sozinho** — proponha 2 pacotes fechados e
  peça confirmação (Regra 1) antes de gravar (ver Etapa 3, item 3). Preços devem ser crescentes e
  respeitar os testes de progressão (`tree-progression.mjs`).
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
| ~~Floresta de Musgo~~ ✅ | **feito em 2026-09-30** — Sino-do-Dossel (azul), Cogumelo-Flor Violeta, Espiral-de-Ouro (dourada) + Orquídea-Rainha (Suprema); morto apodrecido com mofo | ver seção 10b |
| ~~Pântano~~ ✅ | **feito em 2026-10-01** — Lótus-de-Lama (`lotus`), Jarro-Carnívoro Violeta (`carnivora`), Taboa-Tocha de Esporos (`taboa`) + Planta-Carnívora Real do Charco (Suprema); morto apodrecido na lama com limo | integrado |
| Deserto | dourado `#ffd479`, laranja `#ff9a5c` | flor de cacto, flor-de-areia, flor de brasa; base com areia, pedra e espinhos; morto **seco/queimado** |
| Outono | laranja `#ff9a5c`, dourado `#ffd479`, violeta `#c26be0` | crisântemo, flor de folha-seca, flor de bolota; base com folhas caídas |
| Gelo | branco `#e8f4ff`, azul-claro `#7fd6ff`, lilás `#c98df5` | flor de cristal, flor de geada, flor de neve; base com gelo e neve; morto **congelado/quebradiço** |
| Pálida (futura) | a definir com o usuário | depende do lore (`LORE.md`); perguntar antes de qualquer arte |

Para o **broto morto**, sugerir ao usuário uma variante coerente com o bioma (seco no Deserto,
apodrecido no Pântano, congelado/quebradiço no Gelo, etc.) — mas a forma base continua sendo
**o broto vivo murcho: caule torto + botãozinho caído + folhas secas**, para o jogador reconhecer o
"morto" em qualquer mundo.

---

## 8. Critérios de aceite (checklist da leva e do santuário)

**Leva 1 — os 9 vivos (antes de pedir a confirmação):**

- [ ] Exatamente **9 sprites**: 3 espécies × (florescida, meio aberto, broto).
- [ ] As 3 florescidas foram **escolhidas pelo usuário entre 2 opções** cada (Regra 6).
- [ ] Mesma espécie nos 3 estágios (meio e broto **derivados** da florescida escolhida).
- [ ] Silhueta crescente: broto < meio aberto < florescida.
- [ ] As 3 espécies se distinguem pela **silhueta**, não só pela cor.
- [ ] Fundo `#1d1127` uniforme, nada cortado, nomes corretos em `art-source/flores/` + espelho sincronizado.
- [ ] Prévia lado a lado + prévia 48 px mostradas ao usuário.
- [ ] ⛔ **Confirmação explícita do usuário recebida.**

**Leva 2 — os 3 mortos (antes de pedir a confirmação):**

- [ ] Exatamente **3 sprites**, **derivados dos brotos vivos** (não das florescidas).
- [ ] Morto claramente morto, **legível em cinza** (tira-cinza gerada e mostrada), sem orvalho nem brilho.
- [ ] Prévia completa de 12 células mostrada ao usuário.
- [ ] ⛔ **Confirmação explícita do usuário recebida.**

**Por santuário (antes de fechar a entrega):**

- [ ] As **duas levas** aprovadas com **2 confirmações** registradas.
- [ ] `flores_<mundo>.png` = 768×576 RGBA, ~190–260 KB, 12 células preenchidas.
- [ ] `MANIFEST` + `ASSET_V` atualizados; 13 melhorias com 3 níveis; preços confirmados em pacote.
- [ ] `npm run test:quick` e `npm test` verdes; `node game/test/tree-browser.mjs` verde (PC e mobile).
- [ ] Jogado no navegador: santuário **sem compras** (só mortos em cinza) e **com compras** (estágios coloridos), capturas lidas com `read_file`.
- [ ] `MEGA_ARQUIVO.md` e `game/assets/ui/README.md` atualizados; `docs.mjs` íntegro.
- [ ] Espelho de backup sincronizado (Regra 13); usuário informado de onde ficam os originais.
- [ ] Preview ao vivo no ar (Regra 7) e check-in (Regra 3) apresentado ao usuário.

---

## 9. Modelo de mensagem para cada ⛔ PARADA

**PARADA 1 (9 vivos)** — o relatório deve conter, nesta ordem:

1. A **prévia** lado a lado (3 espécies × 3 estágios + coluna do morto marcada como pendente) e a
   prévia em 48 px;
2. Um resumo de 2–3 linhas por espécie: nome, paleta, silhueta, detalhe da base;
3. Onde os originais e o espelho estão salvos (Regra 13);
4. **A pergunta de confirmação** (com opções, inclusive "refazer estágio X da espécie Y");
5. A frase explícita: **"Não vou criar os brotos mortos nem tocar em código antes da sua resposta."**

**PARADA 2 (santuário completo, 12 sprites):**

1. A **prévia completa** (12 células) + **tira dos mortos em cinza**;
2. Notas de transparência sobre correções feitas nos originais (ex.: normalização de fundo);
3. **A pergunta de confirmação** (aprovar e integrar = Etapa 3 / refazer estágio / refazer espécie);
4. A frase explícita: **"Não vou montar a folha nem tocar em código, testes ou documentação de jogo
   antes da sua resposta."**

Só depois da resposta o trabalho continua.

---

## 10. Modelo de referência 1 — Santuário da Planície (pronto)

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

## 10b. Modelo de referência 2 — Santuário da Floresta (pronto; primeiro a seguir este método)

Folha: `game/assets/ui/flores_floresta.png` (768×576, ~188 KB). Entrega completa: `MEGA_ARQUIVO.md`,
"Flores do Santuário da Floresta de Musgo (2026-09-30)".

| Linha | Variação | Silhueta | Paleta dominante | Base |
|:-----:|----------|----------|------------------|------|
| 0 | Sino-do-Dossel | vertical, sino pendente | azul-claro `#7fd6ff` | musgo + samambaias miúdas |
| 1 | Cogumelo-Flor Violeta | baixa e larga, chapéu com pontos luminosos | violeta `#c26be0` | travesseiro de musgo |
| 2 | Espiral-de-Ouro | espiral diagonal, flor-estrela | dourado `#ffd479` | musgo + brotos de samambaia |

Broto morto da Floresta: **apodrecido com mofo** (cinza-esverdeado), derivado do broto vivo.

**Lições registradas desta execução (valem para os próximos):**

- O morto derivado da **florescida** foi rejeitado por parecer planta adulta — derive-o **do broto**.
- Fundos com tom errado acontecem; normalize por **inundação + verificação de contornos** (seção 4.1).
- Os preços foram aceitos em **pacote fechado com 2 opções** ("espelho" × "premium +15%") — o usuário
  escolheu premium: legadas `[35,50,75]/[50,75,105]/[70,100,140]`, globais `+35/+70` (`FLOWER_STEPS`).
- O bloco da Floresta em `game/test/tree-browser.mjs` é o **padrão a espelhar** para cada novo mundo.

---

## 11. Perguntas frequentes

**Posso gerar as 3 variações de uma vez?** Sim — é o modelo oficial (Leva 1 = 9 vivos numa rodada).
O que continua proibido é pular as ⛔ paradas: os 3 mortos só na rodada seguinte, após confirmação,
e a integração só após a segunda confirmação.

**O usuário já escolheu "a melhor de 2 opções" de cada sprite. Isso conta como confirmação da leva?**
Não. Escolher entre opções é a seleção do sprite. A confirmação da leva é um passo **separado**, depois
de ver a prévia com todos os sprites juntos.

**E se o usuário aprovar e depois pedir para refazer algo?** Refaz-se o estágio/espécie pedido e
pede-se confirmação de novo, sempre com prévia atualizada. Ajuste aprovado também atualiza o espelho
de backup (Regra 13).

**De onde derivo o broto morto?** Do **broto vivo** (`1_broto`) aprovado daquela espécie. Nunca da
florescida — morto de planta adulta não é aceito (o estado "morto" é a plântula do nível 0).

**O fundo de um original veio com tom errado?** Ver seção 4.1: inundação a partir das bordas +
verificação de contornos, com aborto seguro. Se não houver tolerância segura, regere o sprite.

**Posso fazer dois santuários em sequência?** Só depois de fechar o primeiro (folha integrada, testes
verdes, navegador jogado) **e** o usuário pedir o próximo. Um santuário por entrega.

**Quero 4 ou 2 variações em algum mundo.** A regra é 3. Mudar isso exige decisão explícita do usuário e
mudança de `flowerVariant`, da folha e dos testes.
