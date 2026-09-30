# 🍎 Próximos passos da Árvore — handoff da integração de maçãs e santuários

**Criado em:** 25 de setembro de 2026
**Autor da entrega anterior:** sessão `arena/01a0d9d6-fumiga-goat` (arte gerada e aprovada)
**Status:** entregas **A e B implementadas e verificadas**; em **2026-09-29 todas as correntes e
cadeados foram excluídos da Árvore** (frutos bloqueados, fruto futuro e santuário da Pálida), com
os três PNGs apagados do repositório e do boot — detalhes em **“Correntes e cadeados removidos da
Árvore”** no `MEGA_ARQUIVO.md`. A entrega B exibe as 13 flores juntas (NOVAS + LEGADO), sem
cadeados/placas sobre elas. O jardim começa acromático; cada nível comprado daquele fruto restaura
a cor gradualmente no fundo, maçã, flores e caminhos, usando a mesma curva da Árvore original.
Arte, progresso, PC/mobile e compras foram verificados. A Pálida continua futura/selada **por
lógica** (`pending: true`), sem símbolo visual. Este arquivo mantém o contrato e o histórico da
integração.

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

**Correntes e cadeados — tema excluído em 2026-09-29 (decisão do usuário).** Os três sprites
(`correntes_cadeados.png`, `correntes_deserto.png`, `correntes_tranca.png`) existiram até essa data,
carregados no boot, e foram **apagados do repositório**: a Árvore não desenha mais cadeado sobre o
fruto bloqueado, tranca sobre a Pálida, nem corrente sobre o santuário da Pálida. O estado continua
legível pela maçã acinzentada (`fruitGray`), pelo rótulo (`FRUTO BLOQUEADO` / `FRUTO FUTURO`) e pelo
painel de pré-requisito — nenhuma arte é coberta por símbolo.

### 1.2 Arquivos (onde estão e o que o jogo carrega)

- **Originais aprovados (alta resolução):** `art-source/macas/`, `art-source/santuarios/`,
  `art-source/comuns/` + folha de revisão `art-source/_revisao/folha-aprovada.png`.
  **`art-source/` está no `.gitignore`** (61 MB → 16 MB após compactar): é a mesma decisão das
  camadas `game/assets/parallax/menu/_orig/`. **Não commitar; não apagar.**
- **Preparados que o jogo carrega** (commitados, em `game/assets/ui/`):
  - `maca_<map>.png` — **960×960 RGBA** (corpo normalizado para 475–476 px), 7 arquivos → boot;
  - `santuario_<map>.png` — **960×540 RGB**, 7 arquivos, ~5,1 MB → **carregar sob demanda**;
  - correntes/cadeados — **não existem mais** (apagados em 2026-09-29).
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
| PNGs em `game/assets/ui/` | 22 (desde 2026-09-29: −3 correntes/cadeados, +1 `flores_planicie.png`; 2026-09-30: +1 `flores_floresta.png`) |
| Peso do boot com as maçãs | +~1,2 MB (aceito); −~67 KB desde 2026-09-29 |
| Peso dos santuários | ~5,1 MB **somente sob demanda** |

---

## 2. O que FALTA (o trabalho do próximo chat)

**A** (maçã nos nós) e **B** (Santuário) estão implementadas. Após a revisão visual, não há
cadeados desenhados sobre flores: o estado e os pré-requisitos permanecem funcionais no painel;
e, desde **2026-09-29**, também os frutos bloqueados e o fruto futuro ficaram sem cadeado/tranca —
os três PNGs saíram do repositório e do boot. Resta validação contínua; PR só quando o usuário
solicitar salvar no GitHub.

> **Atualização (2026-09-27):** a entrega **A** foi implementada, verificada e mergeada em
> `main` (evidências na seção de 2026-09-27 do `MEGA_ARQUIVO.md`). Divergências em relação
> ao texto de A abaixo, por decisão do usuário: o fruto **não exibe número** (a trajetória
> 1→7 se lê pelo caminho dos galhos); o quadro da maçã é **150 px** no zoom 1; e o fundo
> violeta dos 7 PNGs que chegaram com fundo opaco/residual foi limpo por crescimento de
> região (só o alfa do fundo mudou). Naquela data, o trabalho restante era B/C; veja o status
> atual no topo e a revisão concluída na seção B abaixo.

### A. Maçã dourada no nó do fruto (Árvore) — ✅ implementado em 2026-09-27

Hoje `drawFruit()` em `game/js/meta.js` (~linha 224) desenha um **polígono procedural** (âmbar
facetado + número do mundo). Trocar por `IMG["maca_" + fruit.map]`, mantendo **tudo** o que já
funciona: o número do mundo, o halo de hover, o rótulo (`ABRIR FRUTO` / `FRUTO BLOQUEADO` /
`FRUTO FUTURO`) e o *hit-test* de `pickAt()` (raio mínimo 22 px de toque — Regra 9).

- Fruto **bloqueado**: maçã **dessaturada/acinzentada** (`fruitGray`, o mesmo tratamento acromático
  do `tree_art.js`). **Atualizado em 2026-09-29:** o cadeado sobre o fruto foi **removido** — a
  versão implementada deste item é só a maçã cinza + rótulo/painel.
- Fruto da **Pálida**: permanece `pending` (intocável nesta versão) — maçã **branca**
  (`maca_palida`) com a aura e a fumaça já presentes na arte. **Atualizado em 2026-09-29:** a
  tranca `correntes_tranca` foi **removida**.
- Ancoragem: `FRUIT_SLOTS` / `fruitCenter(i)` em `game/js/tree_layout.js` — as posições dos frutos
  **não mudam** (o `treemap.mjs` valida que sobem na ordem dos mundos). Se a maçã precisar de mais
  espaço que o círculo atual, aumente **apenas o desenho e o raio de clique**, nunca a coordenada.

### B. Tela do Santuário (jardim da miniárvore) — ✅ implementada e revisada (2026-09-28)

`drawFruitMini()` em `game/js/meta.js` mantém o comportamento original de compra (`metaCanBuy`,
`metaBuy`, `metaLevel`, gates, custos e saves) e agora apresenta o jardim com a mecânica de cor
da Árvore ancestral:

1. **Cinza → cor:** cada jardim começa acromático. A proporção é calculada apenas pelos níveis
   comprados entre os nós daquele fruto; a saturação usa `sqrt(progresso)`, igual à curva da
   Árvore. Fundo do bioma, maçã, flores e caminhos recuperam a paleta original até 100%. As
   conversões são assadas em canvas reutilizável só quando o fruto/progresso muda, sem
   `Canvas.filter`, dependência nova ou processamento por frame.
2. **As 13 melhorias juntas:** as 10 novas e 3 legadas ficam visíveis ao mesmo tempo, em uma única
   clareira, com caminhos de pré-requisito. Cada posição é mantida por `treeNodePosition(id)` e
   `fruitFlowerPos(fi, ni)`; os alvos invisíveis de 44 px continuam clicáveis. Não há abas NOVAS /
   LEGADO.
3. **Flores sem bloqueios visuais:** removidos cadeados/correntes sobre as pétalas, placas
   quadradas, aros e números desenhados em cima da arte. Broto/flor continuam indicando níveis;
   seleção mostra o motivo de bloqueio e o estado de `EVOLUIR` no painel, sem compra acidental.
4. **Detalhe sem esconder o jardim:** ao selecionar, o painel permanece sobreposto conforme o
   fluxo aprovado, mas fica à direita (x=738) e sem escurecer a cena inteira; as 13 flores e a
   maçã ficam desobstruídas. `EVOLUIR` ainda confirma a compra e `FECHAR` volta ao jardim.
5. **Progresso legível:** o cabeçalho mostra os níveis comprados/possíveis e `COR %`; preço só
   aparece no detalhe selecionado. As cores e os estados de disponibilidade não mudam as regras
   de gates nem os saves.
6. **Pálida:** continua futura e selada, com `santuario_palida` e maçã branca (sem corrente desde
   2026-09-29); não expõe flores, IDs de compra ou botão para seus poderes.

### C. Correntes e cadeados nos estados — ✅ tema excluído (2026-09-29)

- **Decisão do usuário (2026-09-29): “exclua todas as correntes/cadeados da Árvore.”** Escopo
  confirmado: copa (fruto bloqueado e fruto futuro) **e** santuário da Pálida; assets **apagados**
  do repositório; bloqueio comunicado como já era (maçã cinza + rótulo + painel); o aviso textual
  da Pálida permanece.
- Árvore: nenhum cadeado sobre fruto bloqueado (`drawFruit()` desenha só a maçã de `fruitGray`) e
  nenhuma tranca sobre a Pálida.
- Santuário da Pálida: `drawSanctuarySeal()` ficou só com o painel de aviso; a corrente 580×580
  saiu. Jardim de flores: continua sem qualquer bloqueio sobre as pétalas (revisão de 2026-09-28).
- `game/assets/ui/correntes_*.png` **removidos**; `MANIFEST` sem correntes; `ASSET_V` →
  `"20260929-sem-correntes"`; `tools/repair_fruit_sprites.py` perdeu o modo `correntes`.
- Opcional: tranca sobre o galho do mundo 7 na Árvore — **cancelada** junto com o tema.

---

## 3. Onde mexer, símbolo por símbolo

| Arquivo | O que fazer | Cuidados |
|---------|-------------|----------|
| `game/js/assets.js` | `MANIFEST` mantém **apenas as maçãs** no boot (sem correntes desde 2026-09-29); os santuários continuam FORA do `MANIFEST` (~5,1 MB), carregados por `loadSantuario(map)` com `LOAD_CFG.attempts`, promessa cacheada por mapa e retry; `ASSET_V = "20260929-sem-correntes"`. | `loadImage` nunca pendura. O render desenha placeholder enquanto a promessa resolve — nunca trava o frame. |
| `game/js/meta.js` | `drawFruit()` → maçã (cinza no bloqueio, branca na Pálida) **sem nenhum cadeado**; `drawSanctuarySeal()` → só o painel de aviso da Pálida; `drawFruitMini()` → jardim cinza→cor com as 13 flores visíveis juntas; manter `updateTree`, `treeClick`, `drawNodeTip`, `treeNodePosition`, EVOLUIR/FECHAR e acessibilidade (`reduced()`). | `fruitGardenGrowth()` mede níveis comprados por fruto; detalhe lateral sem escurecer/cobrir as flores. Validar fonte grande. |
| `game/js/color_restore.js` | Canvas reutilizável que transforma acromático→cor original quando muda a saturação; pixel data preservado a 100%. | Sem `Canvas.filter`, alocação por frame ou dependência de runtime. |
| `game/js/tree_layout.js` | `SANTUARIO_SLOTS` (13 posições em 960×540) + `fruitFlowerPos(fi, ni)`, novas e legadas juntas. **Não** alterar `FRUIT_SLOTS`, `fruitCenter`, `TREE_FRUITS` nem os IDs. | `treemap.mjs` verifica separação mínima dos 13 alvos. |
| `game/js/config.js` | Nada de custos/IDs/nós. Se quiser metadado visual, adicionar campo **novo** (ex.: `META_STAGES[i].santuario = "santuario_planicie"`). | `tree-progression.mjs` e `fruit-powers.mjs` protegem preços, gates e os 70 poderes — qualquer mudança de valor derruba os dois. |
| `game/js/state.js` | Nada. `isFruitUnlocked(map)`, `metaLevel`, `metaCanBuy`, `metaBuy` já cobrem o fluxo. | Saves antigos têm de continuar válidos (PC `fumiga_goat_save_v1`, mobile `…_mobile_save_v1`). |
| `game/mobile/touch.js` | **Só se** houver input novo. Arrasto/pinça já servem à câmera da Árvore. Botão novo ⇒ array de botões + `descTouch`/`HELP_CONTROLS_TOUCH` (Regra 9). | Nunca duplicar jogabilidade em `game/mobile/`. |
| `game/js/font.js` | Textos novos **só com glifos do `FONT_CHARS`** (maiúsculas PT + `• — ✓ ▶ [ ]`). Nada de setas/emoji/símbolos novos. | `test/assets.mjs` varre TODO literal de `js/**` e acusa caractere sem glifo (`?` em jogo). Prefira palavras já usadas (`FLOR`, `SELADA`, `BROTO`). |
| `game/test/*.mjs` | `assets.mjs` confere lazy-load/cache/retry; `treemap.mjs` valida os 13 slots juntos; `tree-browser.mjs` testa cinza/50%/100%, 13 alvos, compra, Pálida e saves em PC/mobile. | `boot.mjs` mantém `LOAD.done === LOAD.total`; santuários fora da fila do boot. |

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
2. **Pesquisar (Regra 2) e perguntar (Regra 1): concluídos em 2026-09-28.** A revisão visual
   confirmou restauração cinza→cor pelo progresso comprado, as 13 flores juntas, sem bloqueios
   sobre elas; preço e confirmação explícita continuam no painel lateral.
3. **A:** já implementada na sessão anterior. **B:** Santuário com carregamento sob demanda,
   13 flores juntas, restauração progressiva da cor e Pálida selada; revisão sem cadeados sobre as
   flores concluída em 2026-09-28.
4. Testes completos concluídos: `npm test`, `npm run inspect`, `npm run inspect:tree`,
   `npm run inspect:layout` e `node game/test/mobile.mjs` — resultados na nova seção do MEGA.
5. **Preview** (Regra 7): manter `npm run serve` via `start_process` (0.0.0.0:8000, sem cache) e
   validar a árvore/santuários PC + mobile; capturas em `/tmp/fumiga-tree/`.
6. **Check-in (Regra 3)** e documentação atualizados neste arquivo e em `MEGA_ARQUIVO.md`;
   validar novamente com `node game/test/docs.mjs`.
7. **Salvar no GitHub (Regra 11): somente se o usuário solicitar.** Nesse caso, push do branch da
   sessão, CREATE PR e MERGE PR juntos, após testes verdes. Nunca trocar/deletar o branch da sessão.

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

- [x] Maçã dourada (e a Pálida branca) nos 7 nós da Árvore, estados legíveis e clique/toque.
- [x] Santuário com fundo 1:1, maçã suspensa em névoa, 13 flores juntas, pré-requisitos e custos no painel.
- [x] Jardim cinza a 0%, recupera a cor do fruto conforme os níveis comprados (PC + mobile).
- [x] Flores sem cadeados, placas ou aros; painel lateral não escurece nem cobre as pétalas.
- [x] Comprar/Evoluir preserva custos, efeitos e saves antigos.
- [x] Sem correntes/cadeados em tela nenhuma (fruto bloqueado, fruto futuro e santuário da Pálida);
      os 3 PNGs foram apagados do repositório e do boot (2026-09-29).
- [x] `santuario_*` carregado sob demanda, fora do boot; `ASSET_V` atualizado.
- [x] `npm test`, `npm run inspect`, `inspect:tree`, `inspect:layout` e `node game/test/mobile.mjs` verdes.
- [x] Capturas mostradas ao usuário e preview no ar.
- [x] `MEGA_ARQUIVO.md` e este arquivo atualizados; `node game/test/docs.mjs` íntegro.
- [ ] PR aberto e mergeado na `main` — não solicitado nesta tarefa.

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
7. Revisão visual do jardim (2026-09-28): começa totalmente cinza e recupera a cor gradualmente
   pela quantidade de níveis comprados daquele fruto, com a curva da Árvore original.
8. Remover tudo que cubra as pétalas: sem cadeado/corrente, placa, aro ou número sobre a flor;
   hitbox continua invisível e funcional.
9. As 10 flores novas e 3 legadas ficam juntas, sem abas. O detalhe selecionado fica à direita,
   sem escurecer o jardim ou cobrir as flores.
10. **Excluir todas as correntes/cadeados da Árvore (2026-09-29):** copa + santuário da Pálida,
    assets **apagados** (não é arquivo morto), bloqueio comunicado como já era (maçã acinzentada +
    rótulo + painel de pré-requisito) e o aviso textual da Pálida preservado.
