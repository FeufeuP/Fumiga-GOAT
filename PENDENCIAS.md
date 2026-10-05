# 🕓 Pendências abertas do FUMIGA — handoff

**Criado em:** 5 de outubro de 2026
**Branch da entrega:** `arena/01a0f71c-fumiga-goat`
**Status:** **2 trabalhos sem decisão** em aberto; 2 limitações aceitas por decisão do usuário (não são
tarefas). O defeito offline que este documento abriu foi **resolvido na integração com o PR #57**
(ver “Resolvido nesta integração”). Tudo o que o jogo usa está no repositório, testado e verificado; o
que está aqui é o que **ainda não foi feito**.

Este documento existe porque o sandbox do agente reinicia a cada pausa e perde `node_modules`,
`art-source/` e qualquer anotação fora do Git. O histórico de por que cada coisa ficou assim está no
`MEGA_ARQUIVO.md` — registros **“Versão nova recarrega sozinha, formiga do painel 3 conferida e
originais de arte fora do Git (2026-10-05)”** (topo) e **“Distribuição nativa offline completa
(2026-10-02, branch arena/01a0fc42)”** (perto do fim, seção da distribuição). **Não leia o MEGA
inteiro** (≈270 KB); abra só esses registros.

## 0. Como usar (vale para qualquer item daqui)

1. Siga o fluxo obrigatório das regras: **pesquisar inspirações na web (Regra 2) → perguntar com
   opções A/B/C + impacto (Regra 1) → implementar → adaptar o mobile (Regra 9) → check-in (Regra 3) →
   jogar/inspecionar (Regra 4) → preview no fim (Regra 7) → documentar (Regra 12)**.
2. Ambiente no começo da sessão (~20 s): `bash tools/setup-dev.sh`; depois `npm test` (30 testes) e
   `npm run inspect` (PC + mobile) precisam estar verdes **antes** de qualquer “salvar no GitHub”.
3. Teste de navegador usa predicado **síncrono** lendo `MOD` (`importGameModules`, `game/test/lib/browser.mjs`);
   `game/test/browser-waits.mjs` barra a volta do predicado `async` (os 12 casos herdados do PR #57
   foram convertidos na integração).
4. A fonte de bitmap só desenha os glifos de `FONT_CHARS` (`game/js/font.js`): texto novo de interface
   tem que usar só esses caracteres.
5. O app offline agora é **um pacote completo único** (a divisão ESSENCIAL/COMPLETO do início de outubro
   não existe mais — PR #57): qualquer regra nova de assets entra nesse pacote.

---

## 1. TRABALHO — a dica da cutscene no celular fala de teclado

**O que acontece hoje:** a cutscene mostra, embaixo, a mesma dica nas duas plataformas
(`game/js/cutscenes.js`, por volta da linha 397):

```js
const hint = active.isLoading
  ? "CARREGANDO... " + Math.ceil(active.autoCloseT) + "s"
  : "ENTER / ESPAÇO / CLIQUE: " + action + " • ESC: PULAR";
```

No celular (`/game/mobile/`) o jogador lê **“ENTER / ESPAÇO … ESC: PULAR”**, teclas que ele não tem.
Não há ramo de mobile nem substituição em `game/mobile/touch.js` (conferido em 2026-10-05).

**Por que ainda não foi feito:** é polimento pré-existente; o usuário ainda não decidiu entre trocar o
texto, esconder a dica no toque ou outra saída — exige **Regra 2 (pesquisa)** e **Regra 1 (pergunta
com opções)** antes de codar, como manda o fluxo.

**Onde mexer:** `game/js/cutscenes.js` (dica por plataforma), `game/mobile/touch.js` (se a decisão
envolver toque/detecção), testes que leem textos (`FUMIGA_DUMP_TEXTS` em
`game/test/ui-navigation-browser.mjs`) e `game/test/cutscene-art.mjs` se a regra de arte mudar.

**Cuidados:** a fonte é de bitmap — o texto novo só pode usar os glifos de `FONT_CHARS`
(`game/js/font.js`); os testes headless precisam de guarda para API de DOM nova; mudança de texto
exige atualizar os testes que conferem a dica.

---

## 2. TRABALHO — as 5 camadas extras do painel 2 (plano antigo da Fase 5)

**Contexto registrado:** o retrato de progresso da Fase 5 previa **13 camadas pendentes** — **5 do
painel 2** e 8 do painel 3. O painel 3 foi resolvido em 2026-10-04 com **4 camadas enxutas** (escolha
do usuário, arte da Pálida inclusa). **Sobre as 5 do painel 2 não há decisão nova** — é esta a
pendência.

**Como está hoje:** `game/assets/cutscenes/noite_branca/panel2_conflito/` tem 3 camadas 320×180
(`0_sky` opaca, `1_distant` e `2_mid` com névoa). O painel 3 mostra o que “camadas enxutas” entregam
(4 camadas, 131 KB).

**O que falta:** decidir (R1) se o painel 2 ganha profundidade extra — e, se ganhar, **arte nova passa
pela Regra 6** (2+ opções por imagem, escolhida a dedo) e pela Regra 10 (mostrar no viewer). Os
originais do painel 2 **existem no Git** (commit `645dc68`), então dá para recortar de novo; o script
`tools/fix_noite_branca.py` já tem as receitas do painel 2 (`mist`) e do painel 3 (`glow`) como
referência.

**Prova esperada:** `npm test` (inclui `cutscene-art.mjs`, 14 camadas, ~0,7 MB) + `npm run inspect` nos
dois perfis + quadro real do `drawCutscene` antes × depois, como no registro de 2026-10-04.

---

## 3. Resolvido nesta integração (histórico, não é tarefa)

**Offline depois de FECHAR o navegador — resolvido pelo PR #57 (integrado em 2026-10-05).**
O defeito (relatado aqui na primeira versão deste documento) era: baixar o pacote, fechar o navegador e
reabrir **sem rede** devolvia 504 — o worker perdia `CACHE`/`VERSAO` ao ser desligado e respondia com o
cache `fumiga-dev`. O `sw.js` do PR #57 persiste a versão ativa e a de cada cliente no Cache Storage e
as recupera ao subir. Verificado na árvore integrada:

- `npm run inspect:pwa`: “worker reiniciado offline: versão preservada 20261005-painel3-native”;
- perfil persistente de verdade (baixa → **fecha o navegador** → reabre offline): `/game/mobile/`
  responde **200** e o jogo chega ao PRETITLE, com o cache `fumiga-20261005-painel3-native` intacto.

Na mesma integração, a **recarga automática** da versão nova (decisão do usuário de 2026-10-05, opção
B) foi reaplicada sobre a arquitetura nova: o jogo pergunta `versao-atual` e o worker avisa
`versao-nova` quando o snapshot ativo troca; o passo 6 do `inspect:pwa` prova (uma recarga, sem laço,
nunca com expedição em andamento).

---

## 4. Limitações aceitas por decisão (não são tarefas)

1. **Originais de arte fora do Git** — decisão do usuário (opção A, 2026-10-05): `art-source/` e o
   espelho `~/art-source-backup/` (Regra 13) continuam **fora do repositório** e podem sumir quando o
   sandbox reinicia. Consequência registrada: os originais em alta do painel 3 (a Pálida) **se
   perderam** — um recorte novo a partir deles não é possível; refazer o recorte exige gerar a arte de
   novo. As 14 camadas aprovadas estão no repositório e o jogo não depende dos originais. Os originais
   dos painéis 1 e 2 podem ser recriados a partir do commit `645dc68`.
2. **Recarga automática de versão nova** — decisão do usuário (opção B, 2026-10-05): recarrega **uma
   vez** por versão, e só no carregamento/PRETITLE/TÍTULO; com expedição em andamento, fica pendente
   até voltar ao título (nunca no meio do jogo). É o comportamento desenhado, não uma pendência.
