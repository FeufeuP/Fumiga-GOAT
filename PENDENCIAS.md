# 🕓 Pendências abertas do FUMIGA — handoff

**Criado em:** 5 de outubro de 2026
**Branch da entrega:** `arena/01a0f71c-fumiga-goat`
**Status:** **1 defeito** e **2 trabalhos sem decisão** em aberto; 2 limitações aceitas por decisão do
usuário (não são tarefas). Tudo o que o jogo usa está no repositório, testado e verificado; o que está
aqui é o que **ainda não foi feito**.

Este documento existe porque o sandbox do agente reinicia a cada pausa e perde `node_modules`,
`art-source/` e qualquer anotação fora do Git. O histórico de por que cada coisa ficou assim está no
`MEGA_ARQUIVO.md` — registro **“Versão nova recarrega sozinha, formiga do painel 3 conferida e
originais de arte fora do Git (2026-10-05)”**, no topo. **Não leia o MEGA inteiro** (≈268 KB); abra só
esse registro e o de 2026-10-04, quando precisar.

## 0. Como usar (vale para qualquer item daqui)

1. Siga o fluxo obrigatório das regras: **pesquisar inspirações na web (Regra 2) → perguntar com
   opções A/B/C + impacto (Regra 1) → implementar → adaptar o mobile (Regra 9) → check-in (Regra 3) →
   jogar/inspecionar (Regra 4) → preview no fim (Regra 7) → documentar (Regra 12)**.
2. Ambiente no começo da sessão (~20 s): `bash tools/setup-dev.sh`; depois `npm test` (28 testes) e
   `npm run inspect` (PC + mobile) precisam estar verdes **antes** de qualquer “salvar no GitHub”.
3. Teste de navegador usa predicado **síncrono** lendo `MOD` (`importGameModules`, `game/test/lib/browser.mjs`);
   `game/test/browser-waits.mjs` barra a volta do predicado `async`.
4. A fonte de bitmap só desenha os glifos de `FONT_CHARS` (`game/js/font.js`): texto novo de interface
   tem que usar só esses caracteres.

---

## 1. DEFEITO — o jogo offline não abre depois de FECHAR o navegador

**Impacto:** quem instala o app para jogar sem internet pode não conseguir abrir o jogo depois de
fechar e reabrir o navegador. Com internet, abre normal. **É anterior a esta rodada**; o
`npm run inspect:pwa` não pegava porque baixa e navega offline **sem** reiniciar o navegador.

### Como reproduzir (Chromium headless, Playwright)

Precisa de um **perfil persistente** (o `inspect:pwa` atual usa contexto descartável):

```js
const ctx = await chromium.launchPersistentContext("/tmp/perfil", { /* headless, args do projeto */ });
// sessão 1 (online): abrir "/", esperar navigator.serviceWorker.ready, recarregar,
//                    clicar BAIXAR ESSENCIAL e esperar "pronto! 227 arquivos guardados no aparelho"
await ctx.close();                                   // fecha o navegador (o worker morre junto)
// sessão 2 (offline): reabrir o MESMO perfil, await ctx.setOffline(true),
//                     page.goto("/game/mobile/")
```

### Evidência medida (2026-10-05)

- Sessão 1: download “**pronto! 227 arquivos guardados no aparelho**”; caches:
  `["fumiga-20261004-painel3"]`.
- Sessão 2, sem rede: `GET /game/mobile/` → **HTTP 504** com o corpo
  `SEM CONEXÃO E SEM CÓPIA LOCAL: …/game/mobile/`; o jogo não chega nem a montar o canvas.
- Caches que **estão** na sessão 2 (o conteúdo foi baixado, o que falta é o worker achá-lo):
  `["fumiga-20261004-painel3", "fumiga-dev"]`.

### Causa

`sw.js` guarda a versão em memória:

```js
let VERSAO = "dev";
let CACHE = PREFIXO + "dev";
```

Um Service Worker é desligado pelo navegador (ao fechar, por ociosidade — 30 s nas extensões MV3, e
vale o mesmo conceito para a web). Ao acordar, o script é **avaliado de novo** e as variáveis voltam
aos valores padrão: `CACHE = "fumiga-dev"`, um cache **vazio** que nunca recebeu o download do app.
Até `sincronizarVersao()` (que só roda em navegação e precisa de rede) trocar para o cache certo, o
`responder()` responde do cache errado — e, sem rede, cai no 504. O download continua no disco o tempo
todo (o segundo item da lista acima prova). Referências do comportamento:
https://web.dev/articles/service-worker-mindset (“Watch out for global state”) e
https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle (“global
variables are lost”).

### Proposta (esboço, NÃO implementado nem testado)

> **Decisão do usuário em 2026-10-05:** por ora **registrar** (este documento) em vez de corrigir.

Ao subir, antes de responder qualquer coisa, **adotar o cache versionado que já existe** — nunca usar
o placeholder `fumiga-dev` quando o Cache Storage tem `fumiga-<versão>`:

```js
// no topo do sw.js (a cada acordar): o que os caches já guardam é a verdade
async function adotarCacheExistente() {
  const nomes = (await caches.keys()).filter((n) => n.startsWith(PREFIXO) && n !== PREFIXO + "dev");
  if (!nomes.length) return false;
  nomes.sort();                       // ASSET_V é AAAMMDD-…: lexical = cronológico
  CACHE = nomes[nomes.length - 1];
  VERSAO = CACHE.slice(PREFIXO.length);
  return true;
}
```

- Chamar em `responder()` (ou num inicializador por evento) antes de abrir o cache; melhor ainda:
  fazer `sincronizarVersao()` cair para `adotarCacheExistente()` quando a rede falhar — assim
  `versao-atual` também responde certo offline e a **recarga automática** de versão nova continua
  funcionando.
- Efeito colateral desejado: nenhum para quem está online (o cache é o mesmo); offline, o jogo abre.
- **Provar com teste novo** (passo 7 do `inspect:pwa`, perfil persistente): baixar → **fechar** →
  reabrir offline → o jogo tem que bootar (tela ≠ BOOT). O caminho do snippet de reprodução acima é o
  esqueleto do teste.

### Onde mexer

| O quê | Onde |
|---|---|
| Adotar cache existente / queda da rede | `sw.js` (topo + `responder`/`sincronizarVersao`) |
| Teste do defeito (baixa → fecha → reabre offline) | `game/test/pwa-browser.mjs` (passo novo) |
| Docs | `game/README.md`, `AGENTS.md` (“Cache do app instalável”) e registro novo no `MEGA_ARQUIVO.md` |

---

## 2. TRABALHO — a dica da cutscene no celular fala de teclado

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

## 3. TRABALHO — as 5 camadas extras do painel 2 (plano antigo da Fase 5)

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

**Prova esperada:** `npm test` (inclui `cutscene-art.mjs`, 14 camadas, 710 KB) + `npm run inspect` nos
dois perfis + quadro real do `drawCutscene` antes × depois, como no registro de 2026-10-04.

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
