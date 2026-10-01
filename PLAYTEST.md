# PLAYTEST — FUMIGA (roteiro de campo)

Este documento é para quem vai **testar o jogo num aparelho de verdade** (Android, iPhone ou
desktop) e para quem vai **analisar os dados depois**. Ele cobre as duas frentes:

- **Roteiro A — app instalável (PWA):** offline após fechar/reabrir, atualização com rede ruim,
  download do pacote — o que os testes headless não conseguem reproduzir de verdade.
- **Roteiro B — balanceamento:** jogar com o diário ligado para medir progressão, economia,
  adoção dos poderes (incluindo os níveis 2 e 3 novos) e onde as expedições travam.

O diário é **100% local**: nada é enviado a servidor nenhum. O arquivo só sai do aparelho quando
o tester toca em **EXPORTAR DADOS** e escolhe para onde mandar.

---

## 0. O que é gravado (e o que NÃO é)

O jogo mantém um diário pequeno em `localStorage` (`fumiga_playtest_v1`), ligado por padrão e
limitado a 4.000 eventos (~400 KB no pior caso). Cada evento tem hora + tipo + dados:

| Evento | O que entra |
|---|---|
| `sessao` | página aberta (jogo ou app), se está **online/offline**, instalado ou navegador, controlador do Service Worker, tamanho da tela, idioma, `so`/`navegador` **derivados** e a versão (`ASSET_V`) |
| `expedicao_inicio` | modo, mapa, ascensão, seed, ERA e a lista de poderes comprados |
| `mapa_limpo` | mapa vencido, tempo, onda, abates, mortes, pior vida da rainha |
| `draft` | mutação escolhida (id, raridade, nível) |
| `poder_comprado` | id do nó, nível alcançado (1/2/3), preço e saldo |
| `expedicao_fim` | vitória/derrota, mapa, ondas, abates, tempo, mortes, pior vida da rainha, mutações, castas nascidas |
| `recompensa` | essência ganha (total e parcelas) |
| `pwa_pacote` | download do pacote: ok/falha, duração, arquivos |
| `pwa_offline` | o jogo subiu com a **rede desligada** (a prova do A1) |
| `erro` / `loader_erro` | erro de JS ou falha de tarefa essencial de carregamento (mensagem curta) |

**Nunca** entram: nome, e-mail, IP, localização, histórico de navegação, UA crua, conteúdo de
outros sites, senhas ou qualquer identificador de pessoa. O `pt-xxxxxxxx` é um id **aleatório do
aparelho**, criado localmente, só para separar os arquivos de cada tester no relatório.

No jogo: **OPÇÕES → aba TESTE** mostra o resumo, permite **desligar** a gravação, **exportar** e
**apagar tudo**. Apagar é em dois toques (confirmação).

---

## 1. Antes de começar

1. Abra o jogo pelo link combinado (GitHub Pages ou preview) e confira a versão no rodapé da tela
   de opções (ex.: `20261001-playtest`).
2. Confirme em **OPÇÕES → TESTE** que o **DIÁRIO DE TESTE** está **LIGADO**.
3. Tenha em mãos: modelo do aparelho, versão do sistema, navegador.
4. Se possível, comece com o aparelho limpo de caches antigos do jogo (desinstale a versão anterior).

---

## 2. Roteiro A — app instalável no aparelho real (~30–40 min)

### Android (Chrome)

| # | Passo | O que deve acontecer | Anote se falhar |
|---|---|---|---|
| A1 | Abra o site → menu → **Instalar aplicativo** | Ícone na tela inicial; o app abre sem barra do navegador | mensagem do Chrome |
| A2 | No app, faça o **download do pacote essencial** (indicação de progresso) | Conclui sem erro; dá para jogar | em que % parou, mensagem |
| A3 | **Ative o modo avião**, mate o app (arraste para fora dos recentes) e reabra | O app abre e o jogo funciona **offline** | tela de erro, travamento, tela branca |
| A4 | Ainda offline, entre numa expedição, jogue 1–2 minutos e saia | Sem 404/erro; sprites e sons presentes | qual recurso faltou |
| A5 | Com **rede ruim simulada** (chrome://flags ou rede 3G/Edge), force uma **atualização** do app (fechar e reabrir várias vezes) e interrompa no meio desligando os dados | A cópia que já funcionava **continua funcionando**; a atualização só troca quando termina | estado do app depois |
| A6 | Volte para rede boa, abra de novo e deixe atualizar até o fim | Versão nova no rodapé de OPÇÕES | mensagem de erro |
| A7 | (Opcional) Encha o armazenamento do aparelho ou limpe dados do site e repita A2 | Ou funciona, ou avisa com clareza — nunca apaga o que já existia | mensagem |

### iPhone (Safari)

| # | Passo | O que deve acontecer | Anote se falhar |
|---|---|---|---|
| i1 | Compartilhar → **Adicionar à Tela de Início** | Abre em tela cheia | — |
| i2 | Baixe o pacote essencial pelo app | Conclui com progresso | em que ponto parou |
| i3 | **Modo avião**, feche o app (gesto para cima) e reabra | Jogo abre offline | tela de erro |
| i4 | Rede ruim/interrompida durante o download | A cópia anterior continua íntegra | mensagem |
| i5 | Repita A4 (jogar offline) | Sem falhas visuais/sonoras | — |

> **Sempre que algo falhar:** volte ao jogo com rede, abra **OPÇÕES → TESTE**, toque em
> **EXPORTAR DADOS** e envie o arquivo junto com a descrição do problema. O evento `pwa_offline`
> e os `erro`/`loader_erro` contam a história.

---

## 3. Roteiro B — balanceamento com dados (~3–6 h, pode ser em várias sessões)

O objetivo é responder, com dados do jogo real: **onde a progressão trava, o que ninguém compra,
o que fica fácil demais e quanto tempo cada mapa cobra**.

1. Jogue pelo menos **3 expedições completas por mapa** desbloqueado, no modo **Campanha**.
   Pelo menos 1 expedição em outro modo (Sobrevivência, Enxame ou Caçada) para comparar.
2. Compre poderes normalmente — inclusive os **níveis 2 e 3** dos 20 poderes globais (os que
   aparecem com “PRÓXIMO NÍVEL 2/3” na Árvore). Se o preço parecer proibitivo, anote.
3. Jogue pelo menos **1 expedição até a vitória e 1 até a derrota** em cada mapa onde conseguir.
4. Ao final de cada sessão de jogo, **EXPORTE** o diário (OPÇÕES → TESTE → EXPORTAR DADOS) e
   guarde o arquivo. Não precisa esperar acabar tudo: pode exportar várias vezes (cada arquivo é
   um recorte do mesmo diário).
5. Responda as perguntas de feedback abaixo no recado que acompanha o arquivo.

### Perguntas de feedback (subjetivo, mas importante)

1. Qual poder novo (flores) pareceu **mais forte**? Qual pareceu **inútil**?
2. O nível 2 e o nível 3 dos poderes **valem o preço**? Em qual deles você gastou primeiro?
3. Qual mapa/onda foi o **paredão**? O que faltou (comida, essência, dano, vida, tempo)?
4. Alguma coisa pareceu **fácil demais** depois de comprar um poder específico?
5. A duração das expedições está boa? Alguma arrastou?
6. Teve algum bug visual, som faltando, travamento ou FPS ruim? (aparelho + momento)

---

## 4. Como enviar os dados

1. **OPÇÕES → TESTE → EXPORTAR DADOS**.
2. No celular, o jogo abre a **folha de compartilhamento** (WhatsApp, e-mail, Drive…). Se ela não
   aparecer, o arquivo é **baixado**; no desktop, se nada abrir, o JSON é **copiado** para a área
   de transferência (cole num arquivo `.json`).
3. O arquivo se chama `fumiga-playtest-<id>-<data>.json` — **não edite** (o relatório depende do
   formato).
4. Envie junto: modelo do aparelho, versão do sistema, navegador e o recado do roteiro B.

### Do lado de quem analisa

```bash
# arquivos recebidos (um ou vários; também aceita uma pasta inteira)
npm run playtest -- ~/Downloads/fumiga-playtest-*.json
# ou, por padrão, tudo que estiver na pasta playtest/ do repositório
npm run playtest
# gera também o resumo em JSON
npm run playtest -- playtest/ --json=playtest/resumo.json
```

O relatório mostra: sessões, expedições, taxa de vitória por modo, **onde as expedições
terminam** (mapa por mapa), adoção/efeito de cada poder (possuído no início × desfecho), essência
média, **boots offline**, falhas de download do pacote, erros de JS e uma seção de **alertas**
ex.: “MAPA 3: 12 expedições terminaram ali sem nenhuma vitória”.

> Os JSONs dos testers **não entram no Git**: a pasta `playtest/` ignora `*.json` (só o LEIA-ME é
> versionado). Guie-se pelos alertas do relatório para decidir os próximos ajustes de
> balanceamento.

---

## 5. Problemas comuns

| Sintoma | O que fazer |
|---|---|
| EXPORTAR não abriu nada | Tente de novo; se o navegador bloquear a folha de compartilhamento, o download/área de transferência assume. Confira se o JSON foi baixado/copiado |
| O resumo da aba TESTE está zerado | O diário pode ter sido desligado ou apagado; ligue e jogue pelo menos uma expedição |
| O jogo não abre offline | Reproduza com rede ligada? Não — **anote o aparelho e o navegador**, e depois exporte o diário (o `pwa_offline` sem `sessao` seguida mostra o boot que falhou) |
| Quero apagar meus dados | OPÇÕES → TESTE → **APAGAR DADOS** (dois toques) |
| Quero desligar a gravação | OPÇÕES → TESTE → **DIÁRIO DE TESTE: DESLIGAR** |

---

## 6. Check-in do playtest (preencher ao devolver)

| # | Item | Feito |
|---|---|---|
| 1 | Instalei o app no aparelho (Android/iOS) | ☐ |
| 2 | Baixei o pacote essencial pelo app | ☐ |
| 3 | Modo avião + matar/reabrir = jogo funciona offline | ☐ |
| 4 | Atualização interrompida não quebrou a cópia anterior | ☐ |
| 5 | Joguei 3+ expedições por mapa (Campanha) | ☐ |
| 6 | Comprei poderes de nível 2/3 e anotei a sensação | ☐ |
| 7 | Exportei o diário e enviei o arquivo | ☐ |
| 8 | Respondi as 6 perguntas de feedback | ☐ |

Obrigado! Cada arquivo recebido vira uma linha do relatório e um item do backlog de ajustes.
