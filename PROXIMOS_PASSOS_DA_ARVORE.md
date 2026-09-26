# 🍎 Próximos passos da Árvore — handoff da integração de maçãs e santuários

**Criado em:** 25 de setembro de 2026
**Autor da entrega anterior:** sessão `arena/01a0d9d6-fumiga-goat` (arte gerada e aprovada)
**Status:** **arte pronta e aprovada; código NÃO integrado.** Este documento é o contrato de
execução para o próximo chat: leia-o inteiro antes de escrever qualquer linha de código.

---

## 0. Como usar este documento (ordem de leitura obrigatória)

1. [`AGENTS.md`](AGENTS.md) — mapa do código, comandos, armadilhas. **Não leia o `MEGA_ARQUIVO.md`
   inteiro**; abra só as seções citadas aqui.
2. [`REGRAS_DE_TRABALHO.md`](REGRAS_DE_TRABALHO.md) — as 12 regras. O fluxo obrigatório:
   pesquisar → perguntar → implementar → arte → mostrar → mobile → check-in → jogar → preview →
   documentar → salvar.
3. **Este arquivo** — o que já existe, o que falta, onde mexer, como provar que funcionou.
4. [`MEGA_ARQUIVO.md`](MEGA_ARQUIVO.md) — seção **“Entrega — Sete maçãs douradas e sete santuários
   de bioma (2026-09-25)”** (topo do arquivo) + a seção *“Árvore Ancestral ao Crepúsculo”* logo
   abaixo, que descreve a árvore já aprovada que recebe a maçã.
5. [`LORE.md`](LORE.md) — a história. O que a arte representa: frutos da Árvore = galhos; A Pálida =
   sétimo mundo futuro.

### Ambiente (uma vez por sessão, ~20 s)

```bash
bash tools/setup-dev.sh     # Playwright + Chromium headless (não persiste entre sessões)
npm run test:quick          # tem que dar 22/22 antes de começar a mexer
```

---

## 1. O que JÁ está pronto (não refazer)

### 1.1 As 17 artes, escolhidas pelo usuário (2 opções por imagem — Regra 6)

**Todas as maçãs são douradas, exceto a Pálida** (branca). Cada mundo tem sua vegetação, e todo
santuário tem: **clareira central escura e vazia** (palco das melhorias), **vegetação em volta** e
**buraco no fundo mostrando o horizonte** do bioma.

| # | Mundo (`map`) | Maçã (dourada, exceto a 7ª) | Santuário |
|---|---------------|------------------------------|-----------|
| 1 | `planicie` | trigo, capim, flores silvestres, orvalho | horizonte de trigal no amanhecer |
| 2 | `floresta` | musgo, trepadeira, flores, mini árvore de musgo enraizada no fruto | musgos, cogumelos brilhantes, cipós, luz de dossel |
| 3 | `pantano` | cogumelos marrom + turquesa, **veneno verde escorrendo**, mini árvore de pântano | poças verdes, lama borbulhando, névoa tóxica |
| 4 | `deserto` | cactos, areia, mini palmeira, trigo branqueado | areia, cactos, cristais âmbar, dunas com sol branco |
| 5 | `outono` | **xarope de bordo** escorrendo, folhas de outono, mini árvore de outono | bosque cobre/âmbar, folhas caindo |
| 6 | `gelo` (Montanha) | **maçã congelada**, neve, **mini árvore ROSA** em flor | neve, gelo, árvores rosa com neve, picos no horizonte |
| 7 | `palida` | **corpo BRANCO**, aura branca, **rachaduras roxas**, **fumaça saindo de dentro** | tudo branqueado + **CASTELO pálido** no horizonte, enterrado em bruma |

**Correntes e cadeados** (a regra “correntes, cadeados e santuários seguem as mesmas características
gerais das maçãs”):

| Arquivo | 200×— | Significado |
|---------|-------|-------------|
| `correntes_cadeados.png` | 256×256 | cadeado fechado + corrente: **nó/galho bloqueado** |
| `correntes_deserto.png` | 256×256 | variante do cadeado para o **Deserto** (sand-blasted, cristais, areia nos elos) |
| `correntes_tranca.png` | 192×192 | corrente atravessando a tela com 3 cadeados: **selo do santuário da Pálida** (não abre nesta versão) |

### 1.2 Arquivos (onde estão e o que o jogo carrega)

- **Originais aprovados (alta resolução):** `art-source/macas/`, `art-source/santuarios/`,
  `art-source/comuns/` + folha de revisão `art-source/_revisao/folha-aprovada.png`.
  **`art-source/` está no `.gitignore`** (61 MB → 16 MB após compactar): é a mesma decisão das
  camadas `game/assets/parallax/menu/_orig/`. **Não commitar; não apagar.**
- **Preparados que o jogo carrega** (commitados, em `game/assets/ui/`):
  - `maca_<map>.png` — **320×320 RGBA**, 7 arquivos, ~1,2 MB no total → entram no boot;
  - `santuario_<map>.png` — **960×540 RGB**, 7 arquivos, ~5,1 MB → **carregar sob demanda**;
  - `correntes_cadeados.png`, `correntes_deserto.png`, `correntes_tranca.png` — RGBA pequenos.
  - `<map>` ∈ `planicie, floresta, pantano, deserto, outono, gelo, palida` (ordem de `META_STAGES`).
- **Pipeline:** `tools/prepare_fruit_art.py` (Pillow só como ferramenta de arte; o jogo segue JS puro).

```bash
python3 tools/prepare_fruit_art.py all                    # refaz todos os preparados
python3 tools/prepare_fruit_art.py maca art-source/macas/02-floresta.png saida.png
```

  O script remove o fundo violeta `#1d1127` (chave `KEY`, mesmo critério do
  `tools/prepare_tree_art.py`), recorta margens vazias, redimensiona e reduz a paleta preservando
  o alfa. A maçã sai em 320×320 (tamanho de uso no nó da Árvore) e o santuário em 960×540 **1:1 com
  o canvas do jogo** — assim nada é escalado no render.

### 1.3 Números de referência (não regredir)

| Métrica | Valor medido em 2026-09-25 |
|---------|----------------------------|
| `npm run test:quick` | **22/22** |
| `node game/test/docs.mjs` | 6 documentos íntegros, **109.554 bytes** preservados |
| PNGs em `game/assets/ui/` | 23 (6 originais + 17 novos) |
| Peso do boot com as maçãs | +~1,2 MB (aceito) |
| Peso dos santuários | ~5,1 MB **somente sob demanda** |

---

## 2. O que FALTA (o trabalho do próximo chat)

Três entregas, na ordem: **(A)** maçã no nó do fruto da Árvore, **(B)** tela do Santuário com as
melhorias como flores, **(C)** correntes/cadeados nos estados. Depois: testes, mobile, docs, PR.

### A. Maçã dourada no nó do fruto (Árvore)

Hoje `drawFruit()` em `game/js/meta.js` (~linha 224) desenha um **polígono procedural** (âmbar
facetado + número do mundo). Trocar por `IMG["maca_" + fruit.map]`, mantendo **tudo** o que já
funciona: o número do mundo, o halo de hover, o rótulo (`ABRIR FRUTO` / `FRUTO BLOQUEADO` /
`FRUTO FUTURO`) e o *hit-test* de `pickAt()` (raio mínimo 22 px de toque — Regra 9).

- Fruto **bloqueado**: desenhar a maçã **dessaturada/acinzentada** (mesmo tratamento acromático do
  `tree_art.js`, que já assa uma versão sem cor) e, se cupo no espaço, o `correntes_cadeados`
  pequeno sobre o fruto. Nunca esconder o número do mundo.
- Fruto da **Pálida**: permanece `pending` (intocável nesta versão) — mostrar a maçã **branca**
  (`maca_palida`) com a aura e a fumaça já presentes na arte, selada por `correntes_tranca`.
- Ancoragem: `FRUIT_SLOTS` / `fruitCenter(i)` em `game/js/tree_layout.js` — as posições dos frutos
  **não mudam** (o `treemap.mjs` valida que sobem na ordem dos mundos). Se a maçã precisar de mais
  espaço que o círculo atual, aumente **apenas o desenho e o raio de clique**, nunca a coordenada.

### B. Tela do Santuário (substitui a “miniárvore” do fruto)

`drawFruitMini()` em `game/js/meta.js` (~linha 350) hoje desenha 10 retângulos-botão em grade, com
abas NOVAS/LEGADO e painel de detalhe. A nova tela mantém **todo o comportamento** (selecionar só
inspeciona; **EVOLUIR** confirma a compra; `metaCanBuy`, `metaBuy`, `metaLevel`, `isFruitUnlocked`
e os 13 IDs/custos/saves intactos) e troca a apresentação:

1. **Fundo:** `santuario_<map>` desenhado em `ctx.drawImage(img, 0, 0, 960, 540)` **sem escala**
   (`imageSmoothingEnabled = false`), cobrindo a tela inteira; a arte já tem a clareira escura no
   centro — é ali que tudo acontece.
2. **Maçã suspensa em névoa** no centro-alto da clareira (~x 480, y ~250, 120–160 px): leve
   bob vertical (`sin`) + névoa animada em código; com `reducedFX`/`particles === false`
   (`reduced()` em `meta.js`) fica **estática**. Branca e com fumaça no mundo `palida`.
3. **As 13 melhorias viram FLORES do bioma**, plantadas na clareira (decisão do usuário):
   - posições novas em `game/js/tree_layout.js` (ex.: `SANTUARIO_SLOTS`, grade **3 colunas × 5
     linhas** dentro da clareira, de baixo para cima), em coordenadas **de tela** (960×540), já que
     o santuário é 1:1 com o canvas;
   - **linhas de pré-requisito** ligando as flores (`n.requires`), como no desenho atual;
   - as **3 legadas** (`fruit.legacyNodes`) e as **10 novas** (`fruit.newNodes`) continuam
     separadas pelas abas NOVAS/LEGADO — a aba só troca quais flores aparecem;
   - **estados da flor** (leitura à primeira vista):
     | Estado | Desenho |
     |--------|---------|
     | bloqueada por pré-requisito | botão/fechada, cinza-esverdeada, com `correntes_cadeados` (ou `correntes_deserto` no Deserto) em escala pequena |
     | disponível (compra ok) | botão/broto colorido com o **custo** embaixo (`n.cost[lvl]`), cor `fruit.color` |
     | comprada (nível ≥ 1) | **flor aberta** + contorno âmbar (`#ffd479`), `lvl/max` visível |
     | nível máximo | flor cheia + aura dourada pulsante |
   - **alvos de toque ≥ 44 px lógicos** por flor (`isTouchUI()`), separação mínima de ~8 px para
     não errar o toque; o rótulo do nome pode aparecer só na flor **selecionada/hover** para não
     poluir a clareira.
4. **Cabeçalho e rodapé:** manter os textos de hoje (nome do fruto, `FRUTO CONQUISTADO` /
   `PRÉVIA BLOQUEADA • DERROTE <CHEFE>`, contagem `n/10 NOVAS`, essência) — **apenas reposicionados**
   para não cobrir a clareira. Manter `VOLTAR À ÁRVORE`, abas NOVAS/LEGADO e o painel de detalhe
   (`drawNodeTip`) com **EVOLUIR/FECHAR**, e a linha
   `SELECIONAR NÃO GASTA ESSÊNCIA • EVOLUIR CONFIRMA A COMPRA`.
5. **Santuário da Pálida:** `fruit.pending === true` → tela **selada**: fundo
   `santuario_palida`, maçã branca, `correntes_tranca` atravessando a clareira e o texto que já
   existe (“A copa abre após o Pico, mas este fruto aguarda o sétimo mundo…”). **Nenhuma flor
   comprável**: o fruto 7 continua futuro e `fruit-powers.mjs` protege isso.
6. **Diagnóstico:** `treeNodePosition(id)` em `meta.js` é usado pelos testes/inspeção para clicar no
   lugar certo. A nova tela **precisa continuar respondendo** com a posição de cada flor (agora
   coords do santuário) — atualize junto ou o `inspect:tree` clica no vazio.

### C. Correntes e cadeados nos estados

- Árvore (galho/fruto bloqueado): `correntes_cadeados` no nó do fruto (item A).
- Santuário: cadeado sobre a flor bloqueada; **Deserto** usa `correntes_deserto`.
- Pálida: `correntes_tranca` (item B.5).
- Opcional (só se sobrar orçamento de arte e o usuário pedir): tranca na **Árvore** quando o galho
  do mundo 7 estiver fechado.

---

## 3. Onde mexer, símbolo por símbolo

| Arquivo | O que fazer | Cuidados |
|---------|-------------|----------|
| `game/js/assets.js` | 1) `MANIFEST`: adicionar `maca_planicie … maca_palida` (**boot**). 2) **NÃO** colocar os santuários no `MANIFEST` (5,1 MB): criar `loadSantuario(map)` que usa `loadImage(assetUrl("assets/ui/santuario_"+map+".png") + (a ? "&r="+a : ""))` com `LOAD_CFG.attempts` — **copie o padrão do `loadLoreHUD()` em `lore_hud.js`** — e cacheia em um `Map`, disparando **uma vez** por mundo. 3) `ASSET_V` → `"20260925-macas-santuarios"` (BUMP OBRIGATÓRIO: novos PNGs + cache antigo do navegador). | `loadImage` nunca pendura (prazo + retry). O render é síncrono: desenhe um **placeholder** (painel escuro `#17121f` + nome do mundo) enquanto a promessa não resolve — **nunca** trave o frame. |
| `game/js/meta.js` | `drawFruit()` → maçã; `drawFruitMini()` → santuário; manter `updateTree`, `treeClick`, `drawNodeTip`, `treeNodePosition`, abas, EVOLUIR/FECHAR e acessibilidade (`reduced()`). | O painel de detalhe calcula altura com `fontScale()`; com FONTE GRANDE a clareira tem menos espaço — valide com `npm run inspect:layout`. |
| `game/js/tree_layout.js` | Novo `SANTUARIO_SLOTS` (13 posições de flor em 960×540, grade 3×5) + `fruitFlowerPos(fi, ni)`. **Não** alterar `FRUIT_SLOTS`, `fruitCenter`, `TREE_FRUITS` nem os IDs. | O `treemap.mjs` valida a arte da árvore: se mexer em `fruitCenter`, ele quebra. |
| `game/js/config.js` | Nada de custos/IDs/nós. Se quiser metadado visual, adicionar campo **novo** (ex.: `META_STAGES[i].santuario = "santuario_planicie"`). | `tree-progression.mjs` e `fruit-powers.mjs` protegem preços, gates e os 70 poderes — qualquer mudança de valor derruba os dois. |
| `game/js/state.js` | Nada. `isFruitUnlocked(map)`, `metaLevel`, `metaCanBuy`, `metaBuy` já cobrem o fluxo. | Saves antigos têm de continuar válidos (PC `fumiga_goat_save_v1`, mobile `…_mobile_save_v1`). |
| `game/mobile/touch.js` | **Só se** houver input novo. Arrasto/pinça já servem à câmera da Árvore. Botão novo ⇒ array de botões + `descTouch`/`HELP_CONTROLS_TOUCH` (Regra 9). | Nunca duplicar jogabilidade em `game/mobile/`. |
| `game/js/font.js` | Textos novos **só com glifos do `FONT_CHARS`** (maiúsculas PT + `• — ✓ ▶ [ ]`). Nada de setas/emoji/símbolos novos. | `test/assets.mjs` varre TODO literal de `js/**` e acusa caractere sem glifo (`?` em jogo). Prefira palavras já usadas (`FLOR`, `SELADA`, `BROTO`). |
| `game/test/*.mjs` | 1) `assets.mjs`: `check("maçãs dos mundos", FRUIT_TREES.map(f => "maca_" + f.map))` e o mesmo para `correntes_*`. 2) `treemap.mjs`/`fruits.mjs`: se criar slots novos, validar que as 13 flores cabem na clareira (assert simples de limites). | O `boot.mjs` confere `LOAD.done === LOAD.total` — chave nova no `MANIFEST` entra na fila automaticamente, sem ajuste. |

### Testes que precisam continuar verdes (a bateria que o CI/CI-local exige)

```bash
npm run test:quick        # 22 testes, ~10 s — use enquanto implementa
npm test                  # bateria completa, ~45 s
npm run inspect           # joga no navegador: 30 cenas PC/mobile, erros JS, 404, glifos, FPS
npm run inspect:tree      # 548 detalhes PC/mobile + compras + saves + arrasto/pinça
npm run inspect:layout    # auditoria de layout: FONTE GRANDE, sobreposição, texto fora da caixa
node game/test/mobile.mjs # Regra 9: mobile headless do boot à expedição
```

Capturas ficam em `/tmp/fumiga-inspect/*.png` — **abra com `read_file`** (Regra 4 de verdade).

---

## 4. Sequência de execução sugerida (siga na ordem)

1. `bash tools/setup-dev.sh && npm run test:quick` — base verde.
2. **Pesquisar (Regra 2)** as telas de santuário/hub de melhorias em indies (referências já usadas
   nesta entrega: Forja de *Dead Cells*, Espelho da Noite de *Hades*, altares de *Blasphemous*,
   clareiras de *Hollow Knight*/*Ori*) e **perguntar (Regra 1)** 3–4 opções objetivas ao usuário
   sobre: (a) posição/tamanho da maçã suspensa; (b) desenho das flores (broto → botão → flor);
   (c) cadeado só na flor bloqueada ou também no fruto da Árvore; (d) legibilidade do custo.
3. **A** (maçã no nó da Árvore) + `ASSET_V` + `MANIFEST` → rode `npm run test:quick` e
   `node game/test/inspect.mjs --pc --telas=TREE` e **mostre a captura** (Regra 10).
4. **B** (tela do santuário + `SANTUARIO_SLOTS` + flores + carregamento sob demanda).
5. **C** (cadeados/correntes nos estados).
6. Testes completos: `npm test`, `npm run inspect`, `npm run inspect:tree`, `npm run inspect:layout`,
   `node game/test/mobile.mjs`.
7. **Preview** (Regra 7): `npm run serve` via `start_process` (0.0.0.0:8000, sem cache) e jogue:
   Árvore → abrir cada um dos 7 frutos → comprar 1 melhoria de cada estado.
8. **Check-in (Regra 3)** com tabela item/status/onde, citando capturas.
9. **Documentar (Regra 12)**: atualizar a seção de 2026-09-25 no `MEGA_ARQUIVO.md` (marcar o que
   passou de “não implementado” para implementado, com números) **e** a seção de status no topo
   deste arquivo. Rodar `node game/test/docs.mjs` (os 6 documentos originais precisam seguir
   byte a byte; se editar um deles, sincronize o bloco e o SHA-256).
10. **Salvar (Regra 11)**: `git push origin <branch-da-sessão>` → `gh pr create --base main --fill`
    → `gh pr merge --merge` **no mesmo fluxo** (o merge só vale com `npm test` e `npm run inspect`
    verdes; o CI em GitHub Actions ainda não está ligado — o app do agente não pode criar arquivos
    em `.github/workflows/`). **Nunca** deletar o branch da sessão, nunca trocar de branch.

---

## 5. Restrições inegociáveis (o que NÃO fazer)

- **Não** mudar IDs, custos, níveis, gates ou efeitos das melhorias (18 legadas + 70 poderes
  protegidos por testes).
- **Não** destravar a Pálida: `fruit_topo` continua `pending: true`, sem mapa 7 jogável.
- **Não** quebrar saves antigos: nada de renomear chaves de save ou de nó.
- **Não** duplicar jogabilidade em `game/mobile/`; apenas a camada de toque quando houver input novo.
- **Não** commitar `art-source/` (gitignorado, 16 MB) nem reduzir/borrar a arte aprovada.
- **Não** adicionar dependência de runtime: o jogo é JS puro (Canvas 2D + módulos ES, sem build).
- **Não** criar `.github/workflows/*` (trava todo push; falta a permissão `workflows` no app).
- **Não** gerar arquivos “v2”, backups ou cópias de teste (Regra 5).

---

## 6. Definição de pronto (checklist de aceite)

- [ ] Maçã dourada (e a Pálida branca) desenhada nos 7 nós de fruto da Árvore, com estados
      bloqueado/aberto/futuro legíveis e clique/toque funcionando.
- [ ] Santuário abre pelo fruto: fundo do bioma 1:1, maçã suspensa em névoa, **13 flores** na
      clareira (3 legadas + 10 novas), pré-requisitos ligados, custos legíveis.
- [ ] Comprar/Evoluir idêntico ao de hoje (mesmos custos, mesmos efeitos, saves antigos ok).
- [ ] Correntes/cadeados nos estados bloqueados; `correntes_tranca` selando a Pálida.
- [ ] `santuario_*` carregado **sob demanda** (nenhum byte extra no boot) e `ASSET_V` elevado.
- [ ] `npm test` verde, `npm run inspect` sem erros/404/glifos, `inspect:tree` e `inspect:layout`
      aprovados, `node game/test/mobile.mjs` verde.
- [ ] Capturas mostradas ao usuário (Regra 10) e preview no ar (Regra 7).
- [ ] `MEGA_ARQUIVO.md` + este arquivo atualizados; `node game/test/docs.mjs` íntegro.
- [ ] PR aberto **e** mergeado na `main` (Regra 11).

---

## 7. Anexo — decisões do usuário registradas nesta entrega (para não serem re-perguntadas)

1. Ordem/nomeação dos mundos: **ordem do jogo** (`META_STAGES`), com “Montanha” = `gelo`
   (Pico Congelado) e “A Pálida” = `palida` (futuro).
2. Ritmo de aprovação: **2 opções por imagem**, mantendo a coerência com as já aprovadas.
3. Escopo: **arte + integração completa** (este documento); artes extras limitadas a
   maçãs + santuários + correntes/cadeados (sem sprites de flor separados).
4. Formato: **maçã 320×320 para uso** (origem 768 px), **santuário 960×540 1:1**.
5. Centro do santuário: **maçã suspensa em névoa**; melhorias **transformadas em flores** do bioma.
6. Ninho da Pálida: é um **CASTELO**, no **horizonte/fundo**, coberto por **muita fumaça**
   (só as torres mais altas aparecem acima da bruma).
