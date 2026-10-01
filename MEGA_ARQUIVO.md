# MEGA ARQUIVO — FUMIGA: Mega Atualização Lore-Total

**Consolidado em:** 22 de setembro de 2026  
**Escopo confirmado:** quatro documentos de atualização + lore + regras de trabalho.  
**Preservação:** os seis arquivos originais permanecem intactos no repositório.

## Como consultar este arquivo

Este documento reúne **o conteúdo integral dos seis arquivos**, não um resumo.
Cada fonte está identificada e reproduzida em um bloco delimitado por comentários
`INICIO ORIGINAL` e `FIM ORIGINAL`. Nada dos textos de origem foi removido,
corrigido, abreviado ou deduplicado: títulos, exemplos, links, tabelas, listas,
repetições, datas, branches, checklists e notas históricas foram preservados.

- **Regras de trabalho:** processo de desenvolvimento, pesquisa, confirmação,
  testes, preview, desempenho e identidade não-humanoide.
- **LORE.md:** referência canônica da história, incluindo a ficha da Pálida.
- **Mega Atualização Lore-Total:** visão geral, 23 escolhas e oito fases com
  verificações. A implementação deve continuar por fases, com validação do usuário.
- **Decisões:** registro integral das escolhas feitas para a mega atualização.
- **Progresso:** retrato da sessão anterior, preservado como foi escrito.
- **Fases de Implementação:** histórico do menu Dead Cells V2 e da Planície Viva,
  anterior ao planejamento Lore-Total; incluído para não perder contexto.

> **Atenção aos status históricos:** expressões como “100%”, “implementado”,
> estimativas de prazo e limites de ferramentas nos documentos abaixo são
> afirmações dos registros originais. A consolidação não as transforma em
> comprovação do estado atual do código nem em limites da sessão atual.
> Divergências permanecem visíveis, sem apagar conteúdo. O que efetivamente
> funciona deve ser confirmado por testes e inspeção no preview.

## Atualização — Clareira Orgânica por Bioma, 13 Flores Livres e 14ª Flor Suprema (2026-10-01)

**Status: código, clareira, maçã reajustada e 7 poderes supremos implementados e verificados (PC e mobile).**

### Escopo aprovado pelo usuário (`ask_user`)

1. **13 flores regulares 100% livres (sem dependências):** todas as 10 flores globais e 3 flores legadas de cada santuário têm `requires: []` e não desenham linhas de conexão no chão — o jogador pode comprar qualquer flor livremente assim que o fruto do mundo for conquistado.
2. **Clareira central orgânica com semente fixa por bioma (`SANTUARIO_SLOTS_BY_MAP`):** cada santuário (`planicie`, `floresta`, `pantano`, `deserto`, `outono`, `gelo`) possui seu próprio arranjo orgânico determinístico (amostragem Poisson-disk / dart-throwing com semente fixa por bioma em `game/js/tree_layout.js`), posicionando todas as 14 flores estritamente dentro do oval central de grama (`x ∈ [259..693], y ∈ [280..429]`, separação mínima ≥ 52 px) sem tocar raízes, crânios, cactos, cogumelos ou o painel lateral (`FRUIT_DETAIL`).
3. **Maçã flutuante reajustada (`drawSanctuaryApple` em `game/js/meta.js`):** tamanho reduzido de `280 px` para `232 px` e posição elevada de `y = 205` para `y = 176`, liberando o topo da clareira central.
4. **14ª Flor Suprema (`supreme: true`, `v_p11`, `v_f11`, `v_s11`, `v_d11`, `v_o11`, `v_i11`, `v_a11`):**
   - Desbloqueada apenas após **todas as outras 13 flores daquele santuário atingirem o nível máximo** (`isSupremeFlowerUnlocked` / `supremeProgress` em `game/js/state.js`).
   - Compra única lendária (`cost: [500..1000]` de essência) com bônus globais altos + efeito passivo de endgame por mundo em `game/js/fruit_skills.js` e `game/js/fruit_effects.js`:
     - `v_p11` (*Florescência do Amanhecer*, 500 ess.): entregas rendem 2× comida, +25% velocidade global e +20% cadência de ataque.
     - `v_f11` (*Coração do Dossel Eterno*, 580 ess.): aliadas revivem 1× com 50% da vida, +40% poder de cura e 4% de vida regenerada por segundo.
     - `v_s11` (*Lótus Abissal da Bruma*, 660 ess.): todo golpe aplica 12 DPS de veneno por 5s, +35% dano em envenenados e +3 essência por abate.
     - `v_d11` (*Coroa Solar da Fornalha*, 750 ess.): +30% dano global, +20% crítico, +6 população máxima e explosão solar (35% dano em até 3 vizinhos) a cada 3º golpe.
     - `v_o11` (*Crisântemo do Rei Dourado*, 840 ess.): +30% vida máxima para colônia e rainha, +35% barreira inicial e cura 12% da colônia a cada 10 abates.
     - `v_i11` (*Rosa Cristalina do Pico*, 920 ess.): +40% dano contra chefes, 25% menos dano recebido por toda a colônia e golpes aplicam 3s de lentidão.
     - `v_a11` (*Semente do Formigueiro Eterno*, 1000 ess.): dobra ganho de essência e XP, +35% dano e vida global e +15 vida/s na rainha (prévia selada na Pálida).
   - **6 fases visuais (`supremeFlowerStage` em `game/js/meta.js`):** começa na Fase 0 (`BROTO MORTO` em cinza) no coração da clareira e, ao ser comprada, transiciona por **5 fases revivendo até florescer** (`1/5 Despertar → 2/5 Seiva Viva → 3/5 Cálice Real → 4/5 Abertura Solar → 5/5 Flor Suprema`) com escala maior (`64×64`), aura dourada pulsante e partículas orbitais, suportando folha dedicada `flor_suprema_<mundo>.png` (`1152×192` RGBA, 6 células de `192×192`).
   - **Arte integrada:** `game/assets/ui/flor_suprema_planicie.png` (*Girassol-Real do Amanhecer*), `game/assets/ui/flor_suprema_floresta.png` (*Orquídea-Rainha de Seda e Cristal*) e `game/assets/ui/flor_suprema_pantano.png` (*Lótus Abissal da Bruma* — planta carnívora botânica do Pântano), cada uma com 6 quadros (`0_morto`, `1_despertar`, `2_seiva`, `3_calice`, `4_abertura`, `5_flor`), junto com a folha regular `game/assets/ui/flores_pantano.png` (`768×576` RGBA, 3 espécies × 4 estágios: `lotus`, `carnivora`, `taboa`) e preços de 3 níveis do Pântano (`[40,60,90]`, `[55,85,120]`, `[80,115,160]` e `+40/+80`). Originais normalizados em `#1d1127` em `art-source/flores/` e espelhados em `~/art-source-backup/flores/`.

## Registro — Jogo instalável e baixável: PWA + download offline (2026-10-01, branch arena/01a0f670)

**Status: implementado e verificado.** Pedido do usuário: *“Torne o jogo baixável, tanto no mobile
quanto no PC, quero que seja possível instalar o Jogo no dispositivo”*.

### Pesquisa de inspiração (Regra 2)

- **PWA como caminho de instalação de web games** — [PWA e instalação para jogos](https://www.webgamedev.com/publishing/pwa):
  instalar é o recurso mais valioso (ícone + tela cheia), e offline **não** é mais pré-requisito para instalar.
- **Prompt nativo × iOS** — [iOS Add to Home Screen](https://openpwa.net/reference/installation/ios-add-to-home-screen/)
  e [limitações do PWA no iOS](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide):
  Safari **não** tem `beforeinstallprompt`; a instalação é manual (Compartilhar → Adicionar à Tela de
  Início) e a detecção correta é `(display-mode: standalone)` com `navigator.standalone` de reserva.
- **Download sob demanda com barra de progresso** — [offline “baixar para jogar”](https://github.com/vy6ycr7tcc-debug/Animation/pull/64)
  (precache de 320 MB só sob pedido, com progresso e retomada) e [Idle Ascension](https://github.com/brendanlong/idle-ascension/pull/42)
  (`navigator.storage.persist()` para não perder cache/save, `skipWaiting`/`clientsClaim` para atualizar sem
  interromper a partida).
- **Instruções próprias para iOS** e sumiço do aviso em standalone — [Brackenfall](https://github.com/PirateKingInc/test-m5/issues/33).
- **Nativo (Electron/APK) descartado** — [comparativo](https://abratabia.com/native-wrappers/): 150+ MB de
  Chromium embutido e build por plataforma, contra a Regra 5 (JS puro, sem build).

### Decisões do usuário (Regra 1 — respostas de 2026-10-01)

| Pergunta | Escolha |
|---|---|
| Escopo | **PWA + DOWNLOAD OFFLINE** (instalável + baixar assets com progresso) |
| Um app ou dois | **Dois apps**: “FUMIGA — Colônia Eterna (PC)” e “… (Mobile)”, com save próprio de cada versão |
| Onde oferecer | **Fora do jogo**: a instalação/download é da **página do repositório**, não uma mecânica — nenhum botão novo dentro do canvas |
| Página inicial | **Parar de redirecionar**: a raiz virou central com JOGAR em destaque (detecção de aparelho sugere a versão) |
| Ícone | Rainha-formiga; após 3 rodadas de IA rejeitadas (dragão), aprovado na 4ª: **formiga em perfil osso-branco sobre halo pálido, moldura hexagonal** (arte da Pálida, Regra 8: inseto, nunca humanoide) |

### Implementado

- **`sw.js` (raiz do repositório).** Escopo de Service Worker = pasta onde ele mora; o **GitHub Pages não
  permite `Service-Worker-Allowed`**, então a raiz é o único lugar que cobre `/game/` e `/game/mobile/`
  tanto no Pages (subpasta) quanto no servidor local (raiz). Guarda tudo do próprio site em cache:
  navegação para pasta normaliza para `…/index.html` (**sem isso o app instalado dava 504 offline**);
  código é servido do cache e revalidado atrás (stale-while-revalidate); a cada navegação compara a versão
  de `app/assets.json` e troca o cache sozinho quando o `ASSET_V` sobe (sem exigir editar o `sw.js`);
  `skipWaiting` + `clients.claim`; mensagens `versao`, `baixar` (com progresso) e `limpar`.
- **`app/assets.json` — gerado por `tools/make_assets_list.mjs`** (nunca à mão), com três grupos disjuntos
  e `tamanhos` por arquivo; a prova de cobertura é contra a **árvore real** do repositório:
  **shell** 52 arquivos / 1,2 MB (HTML, CSS, 34 módulos ES, ícones) · **essencial** 156 / 17,1 MB
  (sprites, fontes, TÍTULO, telas de carga, maçãs/flores/lore) · **completo** 18 / 36,5 MB (7 santuários +
  11 camadas da Noite Branca). Pacotes: **ESSENCIAL 18,3 MB (208 arquivos)** e **COMPLETO 54,9 MB (226)**.
- **Página oficial (`index.html`, raiz)** — JOGAR (com a versão do aparelho detectada) + INSTALAR (prompt
  nativo no Chromium; passo a passo ilustrado no iOS; nada em standalone) + BAIXAR PARA JOGAR OFFLINE
  (ESSENCIAL/COMPLETO com barra, status por pacote, espaço usado e LIBERAR ESPAÇO). **Sem redirecionamento.**
- **Três manifests** (`/manifest.webmanifest`, `game/manifest.webmanifest`, `game/mobile/manifest.webmanifest`)
  com `start_url` → `app/online.html?v=pc|mobile`, ícones 192/512 + **maskable**, `display: standalone`,
  `orientation: landscape`; páginas `game/` e `game/mobile/` linkando o manifest da sua versão.
- **`app/online.html`** (start_url dos três manifests): leva para a versão certa e é a central de download
  dentro do app instalado; **`app/offline.js`** concentra detecção de ambiente, registro do SW, download
  com progresso, contagem do que já está no cache (lotes paralelos de 32), persistência de armazenamento e
  limpeza; **`app/app.css`** na identidade do jogo.
- **Ícones (`app/icons/`, 6 arquivos, 420 KB)** gerados por `tools/make_pwa_icons.sh` a partir do original
  aprovado `art-source/pwa/icone_palida.png` (1024×1024, fora do Git — Regra 13) com espelho em
  `~/art-source-backup/pwa/`. Inclui `apple-touch-icon-180` e favicons.
- **Peso do repositório**: 3 artefatos brutos saíram de `game/assets/` para `art-source/` (Regra 13):
  `loading_planicie_raw.png` (byte-idêntico ao otimizado), `loading_floresta_raw.png` e
  `parallax/menu/_raw_main.png` (órfãos, sem referência no código). `game/` foi de 67 MB para **56 MB**.
- **Testes**: `game/test/pwa.mjs` entrou na bateria (`npm test` → **26 testes**) — cobrança de lista em dia,
  cobertura sem órfão, manifests (campos, ícones existentes e no tamanho declarado lido do IHDR),
  sanidade do `sw.js`, todos os links locais dos 4 HTMLs e os exports de `offline.js`;
  `npm run inspect:pwa` (`game/test/pwa-browser.mjs`) prova no navegador: instalabilidade via CDP,
  download real, cache no Cache Storage e **jogo bootando com a rede desligada**.

### Verificação

| Comando | Resultado |
|---|---|
| `npm test` | **26/26 verdes** (53,6 s) — inclui o `pwa` novo |
| `npm run inspect` | **verde** — 106,8 s: PC + mobile, 9 telas, 6 mapas, sem erro de JS/404/glifo |
| `npm run inspect:pwa` | **verde** — instalabilidade sem erros em `/` e `/game/mobile/`; 208 arquivos baixados; status “baixado ✓ (18 MB)”; **jogo bootou offline** e a página do app roteou para a versão mobile |
| `npm run inspect:tree` | **verde** — 548 detalhes + arte, gestos, compras e Renascimento no navegador |

### Limitações e próximos passos

- **iOS não tem convite de instalação** (limite da Apple): a página ensina o caminho do Safari. Também não
  há `beforeinstallprompt` em Firefox desktop/Safari desktop — nesses casos a página explica o menu do navegador.
- O pacote **COMPLETO** leva os santuários e a Noite Branca tal como estão (sem otimizar): são 36,5 MB, os
  mesmos arquivos que o jogo já baixava sob demanda. Reproduzir as telas de carga no tamanho nativo
  (como feito com `loading_planicie`) e recomprimir os santuários é o próximo corte grande de peso.
- `npm run inspect:pwa` **ainda não roda no CI** (o agente não tem a permissão `workflows` para editar
  `.github/workflows/`). Para ligar, o dono do repositório acrescenta um passo ao job `navegador`:
  `- run: node game/test/pwa-browser.mjs`.
- O Service Worker só existe em HTTPS/localhost (exigência do navegador): em servidor local use
  `npm run serve`; um `python3 -m http.server` em `127.0.0.1` também vale, mas em `file://` não há SW.
- Pendências do relatório anterior que continuam de pé (não fazem parte deste pedido): flores/3 estágios só
  na Planície, níveis 2–3 sem poder próprio e `KeyB`/`KeyG` lidos depois dos `return` de draft/transição/pausa.

## Correção — CI vermelha: a tela de carregamento engolia o input do teste do HUD (2026-09-30)

**Status: implementado e verificado. Correção de teste — nenhum comportamento do jogo mudou.**
Pedido do usuário: *“Faça apenas A”* — consertar a CI e deixar o `main` verde.

### Diagnóstico (causa raiz provada em navegador)

Desde o PR #48 (telas de carregamento estilo Dead Cells) o job **inspeção no navegador (Chromium)**
falhava no passo **HUD orgânico** — inclusive nas merges do `main` (#48 e #49) — com
`AssertionError: B abre formigueiro`, `actual: undefined`. (Nos runs do #48 o passo que falhava era o
`npm run inspect`; o #49 adicionou o `skipDebugLoading`, que dispensa a carga nos teleportes de
`?debug` sem `&cutscene`, e desde então esse passo passa.)

`game/test/lorehud-browser.mjs` entrava pelo fluxo real (PRETITLE → TITLE → MODE → RUN) e apertava
`Escape` **1,2 s** depois de começar a expedição. Nesse instante a tela de carregamento ainda está em
`fadein`/`active`, e `handleLoadingInput()` só responde em `"ready"` — de propósito, o jogador não
pula a carga. O `Escape` era descartado, a cutscene da Noite Branca abria (~4,2 s depois do início da
carga) e **todo o resto do teste rodava contra o handler da HQ**: `B` ia para a biblioteca de
memórias, `baseOpen` nunca virava `true` e a asserção morria na linha 66.

Linha do tempo medida: `carga` ativa de 0 a ~4,2 s → `cutscene` ativa e estável. Confirmado que o
**jogo está correto**: esperando a carga fechar e pulando a HQ como o jogador faz, `B` abre o
formigueiro (`baseOpen: true`) e `G` inicia a onda (`phase: "wave"`).

### Correção (`game/test/lorehud-browser.mjs` — só teste)

O `Escape` solto virou `settleIntro()`: espera a abertura **assentar** — sem carga e sem HQ por três
leituras seguidas (~300 ms), pulando cada cutscene que aparecer (mesmo padrão do
`ui-navigation-browser.mjs`) — com asserções explícitas (`carga do Mundo 1 terminou`,
`cutscene de abertura pulada`) e guarda contra pausa acidental: `Escape` no vazio pausa a expedição
(e aí o `B` do teste não abriria o ninho), então o teste destrava via `isPaused()` antes de seguir.

O input durante a tela de carregamento continua bloqueado de propósito no jogo; nada de produção foi
alterado.

### Verificação (2026-09-30)

| Comando | Resultado |
|---|---|
| `node game/test/lorehud-browser.mjs` | **verde** — “BROWSER HUD OK — seis biomas, H, vida baixa, zoom, acessibilidade, viewports mobile, formigueiro e onda” (59,7 fps médios segurando H) |
| `node game/test/inspect.mjs` | **verde** — 108,8 s: PC + mobile, 9 telas + 6 mapas, sem erro de JS, 404 ou glifo faltando |
| `npm test` | **25/25 verdes** (bateria headless completa, 41,4 s) |

São exatamente os dois passos do job `navegador` do workflow mais o job `headless`.

### Limitações e próximos passos

- O teste passou a esperar até ~24 s pela abertura (o normal é ~5 s): é espera ativa, não `sleep`
  fixo, e falha com mensagem clara se a abertura travar.
- A CI do `main` só fica verde **depois do merge** desta correção (Regra 11: `push` +
  `CREATE PR` + `MERGE PR` no branch da sessão).
- Pendências conhecidas do relatório de análise (não incluídas neste pedido): flores/3 estágios só na
  Planície, níveis 2–3 sem poder próprio, 4 PNGs `loading_*_raw.png` órfãos e `KeyB`/`KeyG` lidos
  depois dos `return` de draft/transição/pausa.

## MANUAL — Fábrica de flores dos Santuários (método aprovado, 2026-10-01, v3)

**Para chats novos: leia esta seção + [`DOCUMENTO_FLORES_DOS_SANTUARIOS.md`](DOCUMENTO_FLORES_DOS_SANTUARIOS.md)
+ [`REGRAS_DE_TRABALHO.md`](REGRAS_DE_TRABALHO.md) antes de gerar qualquer imagem de flor.**
Este manual é o estilo de trabalho **oficial**, aprovado pelo usuário — a cadência é:
**Leva 1: 9 sprites vivos regulares (3 espécies × 3 estágios vivos) → ⛔ PARADA 1 → Leva 2: 3 brotos mortos regulares + 6 fases da Flor Suprema (total 9 na 2ª leva) → ⛔ PARADA 2 → integração**.

### Regras invioláveis

1. Cada santuário: **exatamente 3 espécies regulares** com **4 estágios** cada = **12 sprites** (`1_broto, 2_meio, 3_flor, 0_morto`) + **1 Flor Suprema** com **6 estágios** (`suprema_0_morto` a `suprema_5_flor`, folha `1152×192` RGBA).
2. **Cadência em duas levas com ⛔ confirmações explícitas:** Leva 1 (9 vivos regulares numa rodada) → PARADA 1 → Leva 2 (3 mortos regulares + 6 estágios da Flor Suprema = 9 imagens) → PARADA 2 → só então código. Silêncio nunca é aprovação.
3. **O broto morto regular deriva do broto vivo** (`1_broto`), nunca da flor adulta (rejeitada na Floresta).
4. **Preços só entram no código com confirmação prévia** — propor 2 pacotes fechados (espelho da
   Planície × premium do mundo) e deixar o usuário escolher.
5. **Regra 13:** todo sprite selecionado fica salvo no Arena (`art-source/flores/`) **e** no espelho
   `~/art-source-backup/flores/` — sincronizar a cada escolha/refação/normalização.

### Passo a passo (resumo operacional)

1. **Etapa 0:** pesquisar inspirações indie (Regra 2, citar links) → `ask_user` com as 3 espécies regulares
   (2 conjuntos prontos + personalizado), a espécie da Flor Suprema, ordem das linhas, visual do morto e escopo → ⛔ PARADA 0.
2. **Leva 1:** florescida de cada espécie regular com **2 opções** (máx. 3 gerações-com-opções por resposta) →
   usuário escolhe → **derivar** meio aberto e broto de cada escolhida (sem novas opções) → prévia
   lado a lado (layout 768×576 com coluna do morto pendente) + prévia 48 px (`present_file`) →
   ⛔ **PARADA 1**.
3. **Leva 2:** 3 brotos mortos regulares (derivando dos `1_broto`) + as 6 fases da Flor Suprema (`suprema_5_flor` → derivações `suprema_4_abertura`, `suprema_3_calice`, `suprema_2_seiva`, `suprema_1_despertar`, `suprema_0_morto`, totalizando 9 imagens na 2ª leva) → prévia de 12 células regulares + **tira dos mortos em cinza** + **prévia das 6 fases da Flor Suprema** → conferir fundos `#1d1127` (seção 4.1 do documento: inundação pelas bordas + checagem de contornos com aborto) → ⛔ **PARADA 2**.
4. **Etapa 3 (integração):** normalizar originais pendentes + espelho → `FLORES_VARIACOES` +
   `prepare_fruit_art.py flores <mundo> game/assets/ui/flores_<mundo>.png` (768×576 RGBA) + folha `game/assets/ui/flor_suprema_<mundo>.png` (1152×192 RGBA) → conferir as folhas achatadas → `ask_user` de preços (2 pacotes) → `MANIFEST` + `ASSET_V` (`assets.js`), custos legados (`config.js`), `FLOWER_STEPS` (`fruit_skills.js`) → testes: `fruit-powers.mjs`, `assets.mjs`, `tree-browser.mjs` (espelhar o bloco da Floresta) → `npm run test:quick`, `npm test`, `node game/test/tree-browser.mjs` (PC e mobile, ler as capturas **sem compras = só mortos cinza** e **com compras = estágios coloridos + Flor Suprema**) → docs (`MEGA_ARQUIVO.md`, `game/assets/ui/README.md`, `PROXIMOS_PASSOS_DA_ARVORE.md`) + `node game/test/docs.mjs` → preview `npm run serve` (Regra 7) → check-in (Regra 3).
5. **Um santuário por entrega.** Seguem pendentes: Deserto, Outono, Gelo, Pálida —
   sugestões de tema na seção 7 do documento. Prontos: Planície (referência 1 + Suprema), Floresta
   (referência 2 + Suprema) e Pântano (referência 3 + Suprema).

---

## Entrega — Flores do Santuário da Floresta de Musgo (3 espécies × 4 estágios) (2026-09-30)

**Status: implementado e verificado (PC e mobile).** Primeiro santuário criado seguindo o
[`DOCUMENTO_FLORES_DOS_SANTUARIOS.md`](DOCUMENTO_FLORES_DOS_SANTUARIOS.md), com **cadência
excepcional decidida pelo usuário**: as 3 variações foram geradas numa mesma rodada (substituindo,
desta vez, a regra de uma variação por vez), os 3 brotos mortos numa rodada seguinte, e a integração
na Etapa 4, após a aprovação dos 12 sprites. *(Atualização do mesmo dia, aprovada pelo usuário: essa
cadência deixou de ser exceção e virou o **modelo oficial** — ver "MANUAL — Fábrica de flores" acima,
que substitui a regra de uma variação por vez.)*

### Decisões confirmadas (Etapa 0 — Regras 1 e 2)

- **Inspiração (Regra 2):** a flora luminosa de Greenpath (*Hollow Knight*), a bioluminescência de
  *Ori and the Blind Forest* e do bioma de cogumelos de *Terraria*, e os packs indie *Mystic Flora*
  e *Pixel Crops & Plants* (itch.io) — flores brilhantes de floresta com estágios de crescimento.
- **Espécies (Conjunto A — Dossel Encantado):** Sino-do-Dossel (azul `#7fd6ff`, linha 0),
  Cogumelo-Flor Violeta (`#c26be0`, linha 1) e Espiral-de-Ouro (`#ffd479`, linha 2), bases com musgo
  e samambaia; ordem frio→quente na folha. A florescida de cada espécie foi escolhida pelo usuário
  entre 2 opções (Regra 6); meio aberto e broto derivam dela (mesma planta nos 4 estágios).
- **Broto morto:** apodrecido com mofo, derivado do **broto vivo** (não da flor adulta — correção
  pedida pelo usuário após a 1ª leva); caule torto, cabeça caída, sem orvalho nem brilho, legível
  em cinza. Cada morto também escolhido entre 2 opções.
- **Preços (opção B — Mundo 2 premium, ~+15%):** legadas `[35,50,75]`, `[50,75,105]`, `[70,100,140]`;
  globais `[c0, c0+35, c0+70]` — confirmados pelo usuário antes de gravar no código.

### Implementação

- `game/assets/ui/flores_floresta.png`: **768×576 RGBA**, 188 KB, 12 células preenchidas, gerada por
  `python3 tools/prepare_fruit_art.py flores floresta …` (espécies em `FLORES_VARIACOES`).
- Integração (`Etapa 4` do documento): `flores_floresta` no `MANIFEST` e
  `ASSET_V = "20260930-flores-floresta"` (`js/assets.js`); 3 níveis nas 3 legadas (`js/config.js`)
  e nas 10 globais via `FLOWER_STEPS` (`js/fruit_skills.js` — o `map === 'planicie'` virou tabela
  por mundo).
- Testes: `fruit-powers.mjs` (3 níveis também na Floresta), `assets.mjs` (dimensões e RGBA das duas
  folhas de flores), `tree-browser.mjs` (bloco Floresta: folha no boot, 3 variações, 13×3 níveis,
  mortos em cinza sem compras, compras levando a broto/meio/florescida, jardim contando 6 níveis).
- **Verificação:** `npm run test:quick` (22) e `npm test` (25) verdes; `node game/test/tree-browser.mjs`
  verde em PC e mobile. Capturas lidas: `*-santuario-floresta-mortos.png` (só brotos mortos em cinza,
  0/39 melhorias, cor 0%) e `*-santuario-floresta-estagios.png` (6/39, cor 15%, sino azul florescido,
  espiral dourada meio aberta e botão de cogumelo coloridos).
- **Originais preservados (Regra 13, nova):** 12 PNGs ≥1024² em `art-source/flores/floresta_*.png`
  (fora do Git) + espelho `~/art-source-backup/flores/`. Fundos normalizados para `#1d1127` por
  inundação a partir das bordas com verificação de contornos (na Espiral florescida, perda de 1,6%
  do AA externo — aceita).
- **Regra 13 nova:** imagens selecionadas sempre salvas no workspace do Arena (+ espelho de
  segurança) — registrada em `REGRAS_DE_TRABALHO.md` e neste bloco espelhado;
  `node game/test/docs.mjs` íntegro.
- Sem commit/push nesta entrega (aguardando pedido de "salvar no GitHub", Regra 11).

Próximos santuários na mesma régua: Pântano, Deserto, Outono, Gelo e Pálida (um por entrega,
cada um com pesquisa, perguntas e confirmações próprias).

## Entrega — Documento de criação das flores dos próximos Santuários (2026-09-30)

**Status: documento criado (sem mudança de código ou de arte).** Pedido do usuário: um documento que dite
como criar as flores dos próximos santuários, deixando claro que são **3 variações com 4 sprites cada**
e que **as 3 variações não são feitas de uma vez — é preciso a confirmação do usuário entre cada uma**.

- **Arquivo:** [`DOCUMENTO_FLORES_DOS_SANTUARIOS.md`](DOCUMENTO_FLORES_DOS_SANTUARIOS.md); apontado em `AGENTS.md`.
- **Conteúdo:** as 3 regras inegociáveis (3 variações, 4 sprites, confirmação entre variações); os 4
  estágios e a ordem das colunas (`1_broto`, `2_meio`, `3_flor`, `0_morto`); fluxo com paradas
  (Etapa 0 → ⛔ → Var. 1 → ⛔ → Var. 2 → ⛔ → Var. 3 → ⛔ → integração); especificação dos originais
  (fundo `#1d1127`, nomes em `art-source/flores/`); folha 768×576; lista de integração (`MANIFEST`,
  `ASSET_V`, 3 níveis nas 13 melhorias, testes); sugestões de tema por bioma; checklists e modelo de
  mensagem de parada; Planície como referência.
- **Testes:** `node game/test/docs.mjs` íntegro (o documento novo não altera os 6 originais).

## Entrega — Broto morto das flores da Planície (2026-09-30)

**Status: implementado e verificado.** Pedido do usuário: *“Crie um sprite dos brotos das flores
mortos, eles serão vistos enquanto as flores estiverem cinzas, ou seja antes de comprar, um sprite
adicional para cada flor da planície.”*

### Decisões confirmadas (Regra 1 + Regra 2)

- **Inspiração (Regra 2):** pacotes de plantas indie com estágio de morte/murcho distinto, como
  [*Growing Plants* (Soppycraft)](https://soppycraft.itch.io/growing-plants-pixel-pack), e o conjunto
  de flores do [Shared Garden](https://github.com/C0derTang/shared-garden/issues/40) (silhueta legível
  em tamanho pequeno).
- **Escopo:** 3 sprites (1 por variação: Margarida, Botão-de-Ouro, Trevo), reaproveitando `flowerVariant`.
- **Visual:** broto murcho, caule torto, cabeça caída, folhas secas marrom-acinzentadas, sem orvalho.
  Cada original foi escolhido pelo usuário entre 2 opções (Regra 6).
- **Integração:** 4ª coluna da folha, exibida **em cinza** com 0 compras no lugar do broto cinza.

### Implementação

- `game/assets/ui/flores_planicie.png`: **768×576 RGBA** (antes 576×576), 4 colunas × 3 variações.
- `game/js/meta.js`: `flowerStage(0)` → `{ stage: 3, gray: true, name: "BROTO MORTO" }`; `flowerSheet()`
  assa 4 colunas (`FLOWER_COLS`); rótulo do painel `BROTO MORTO`. 1ª compra = broto vivo (inalterado).
- `tools/prepare_fruit_art.py`: estágio `0_morto`; `flower_cell()` extraído; célula sem original em
  `art-source/` é copiada da folha atual (os 9 originais anteriores não estão no Git).
- `ASSET_V` = `20260930-broto-morto`; `test/assets.mjs` (768×576) e `test/tree-browser.mjs` atualizados.
- Originais em `art-source/flores/planicie_{margarida,botao,trevo}_0_morto.png` (fora do Git).

## Entrega — Sprites das flores do Santuário da Planície (3 variações × 3 estágios) (2026-09-29)

**Status: implementado e verificado.** Pedido do usuário: *“Crie um sprite para as flores do
santuario da planice. Quero no minimo 3 variações de flores tematicas do mapa. Com 3 estagios cada,
sendo eles: broto (ao comprar 1 vez), broto meio aberto (a partir da 2 compra), e flor florescida
(quando completa a melhoria).”*

### Decisões confirmadas (Regra 1 + Regra 2)

- **Inspirações indies (Regra 2):** *Pikmin* (estágios botânicos diegéticos *folha/broto → botão →
  flor aberta* comunicando nível sem poluir a arte), *Ori and the Will of the Wisps* (Jardim de
  Tuley em *Wellspring Glades*) e *Stardew Valley* / *Flowers with Growth Stages* (progressão de
  silhueta em pixel art).
- **Três variações temáticas da Planície do Amanhecer (aprovadas com 2 opções por estágio — Regra 6):**
  1. **Margarida-do-Amanhecer** (linha 0: pétalas alvas/creme, miolo âmbar-dourado, gotas de orvalho
     e espigas de trigo na base);
  2. **Botão-de-Ouro Solar** (linha 1: pétalas amarelo-ouro/âmbar em cálice, miolo solar, orvalho e
     folhas recortadas do campo);
  3. **Trevo-Lilás Silvestre** (linha 2: corola lilás/rosada luminosa com coração de néctar dourado,
     folhas de trevo e trigo na base).
- **Formato e pipeline (`tools/prepare_fruit_art.py`):** 9 originais em alta resolução em
  `art-source/flores/planicie_<flor>_<estagio>.png` (gitignorados) reunidos na folha 3×3
  **`game/assets/ui/flores_planicie.png`** (**576×576 RGBA**, 3×3 células de 192×192 ancoradas na
  base do caule, paleta quantizada de 256 cores, 190.881 bytes) via
  `python3 tools/prepare_fruit_art.py flores planicie game/assets/ui/flores_planicie.png`.
- **Três níveis de compra reais no Santuário da Planície e mapeamento de estágios:**
  - As 13 melhorias da Planície (`f_p_1..3` em `game/js/config.js` e `v_p1..10` em
    `game/js/fruit_skills.js`) passam a ter 3 níveis de compra (`cost` de 3 elementos);
  - **Nível 0 (`0 compras`):** exibe o **Estágio 1 (Broto)** totalmente acinzentado (`gray: true`);
  - **1ª compra (`level === 1`):** exibe o **Estágio 1 (Broto)** vivo/colorido (`BROTO`);
  - **2ª compra (`level === 2`):** exibe o **Estágio 2 (Broto meio aberto)** (`BROTO MEIO ABERTO`);
  - **3ª compra / melhoria completa (`level >= max`):** exibe o **Estágio 3 (Flor florescida)**
    (`FLORESCIDA`).
- **Renderização e desempenho (`game/js/meta.js`):** `flowerSheet("flores_planicie")` assa uma única
  vez os canvases colorido e acromático em 144×144 (3×3 células de 48×48 com contorno escuro de 1px
  `#120b18`), sem alocação ou reprocessamento por frame; `hitArea` das 13 flores permanece registrada
  mesmo com o cursor sobre o painel lateral (`FRUIT_DETAIL`), sem deixar cliques no painel
  atravessarem para o jardim.
- **Modo debug (`game/js/game.js`):** `newRun` pula `startLoadingScreen` em teleportes de `?debug`
  sem `&cutscene`, mantendo a transição imediata de `FUMIGA.go('RUN')` nos testes de navegador.

### Verificação (2026-09-29)

- `npm run test:quick`: **22/22** verdes.
- `node game/test/tree-browser.mjs`: PC e mobile verdes (3 variações × 3 estágios verificados,
  127 posições de flor/nó sem colisão em fonte normal e grande, 7 santuários sob demanda).
- `node game/test/docs.mjs`: consolidação íntegra (6 documentos originais intactos).

## Entrega — Arte do cadeado fechado (2026-09-29)

**Status: só a arte foi salva, sem integração no jogo.** O usuário escolheu 1 de 2 opções de um
cadeado padrão para os mundos (menos a Pálida), visto de frente: ferro negro com detalhes e
rachaduras laranja-ferrugem foscas. Salvo em `game/assets/ui/cadeado fechado.png` (512×512 RGBA,
fundo transparente, ~147 KB); o original de 1024 px está em `art-source/comuns/` (gitignorado).
A versão **aberta** foi **cancelada** a pedido do usuário. O sprite **não** está no `MANIFEST` e não é
desenhado em nenhum lugar; a remoção das correntes feita antes, no mesmo dia, continua valendo no
jogo. `npm run test:quick`: 22/22.

## Entrega — Correntes e cadeados removidos da Árvore (2026-09-29)

**Status: implementado e verificado.** Pedido do usuário: *“Exclua todas as correntes/cadeados da
árvore.”* As opções da Regra 1 foram confirmadas antes da implementação:

1. **Escopo:** copa (fruto bloqueado **e** fruto futuro) **+** a corrente do santuário da Pálida.
2. **Assets:** os três PNGs foram **apagados do repositório** (não ficam como arquivo morto).
3. **Estado bloqueado:** continua como já era — maçã acinzentada (`fruitGray`), rótulo
   `FRUTO BLOQUEADO` / `FRUTO FUTURO` e painel com o pré-requisito. Nada novo é desenhado sobre a
   arte.
4. **Texto da Pálida:** o painel *“A COPA ABRE APÓS O PICO…”* permanece — só a corrente saiu.

### O que mudou

- **`game/js/meta.js` — `drawFruit()`:** saíram o `correntes_deserto` (162 px × zoom) sobre o fruto
  bloqueado e o `correntes_tranca` (1,1× o quadro) sobre a Pálida. Fica só a maçã: `fruitGray(key)`
  no bloqueio, `maca_palida` na Pálida futura, com o halo de hover e o rótulo intactos.
- **`game/js/meta.js` — `drawSanctuarySeal()`:** saiu a corrente 580×580 desenhada em (190, 90)
  sobre o santuário da Pálida; o painel de aviso continua explicando o futuro do fruto.
- **`game/js/assets.js`:** os três sprites saíram do `MANIFEST` (deixam de ser baixados em qualquer
  tela) e `ASSET_V` → `"20260929-sem-correntes"`. O boot ficou ~67 KB mais leve.
- **`game/assets/ui/`:** `correntes_cadeados.png`, `correntes_deserto.png` e
  `correntes_tranca.png` foram **removidos** (`git rm`). Não existe mais nenhum sprite de
  corrente/cadeado no jogo. O total de PNGs da pasta caiu de 23 para 20.
- **`game/test/assets.mjs`:** o antigo `check("correntes e cadeados (boot)")` virou uma asserção de
  ausência — nada com prefixo `correntes` pode entrar no boot nem existir em `assets/ui/`
  (impede a volta do tema por descuido).
- **`game/test/tree-art-browser.mjs`:** a checagem da Pálida selada deixou de exigir
  `IMG.correntes_tranca` e passou a exigir **lista vazia** de sprites de corrente.
- **`tools/repair_fruit_sprites.py`:** o modo `correntes` (reconstrução procedural dos três
  sprites) foi removido, junto com o helper `RDraw`, as paletas e o desenho de elos/cadeados que só
  ele usava; o script agora só normaliza maçãs (`python3 tools/repair_fruit_sprites.py macas`).
- **`tools/prepare_fruit_art.py`:** `COMUNS`/`COMUNS_DIR` e o preparo dos comuns saíram do `all`; o
  modo genérico `sprite` continua para ícones/overlays pequenos.
- **Docs:** `game/assets/ui/README.md` e `PROXIMOS_PASSOS_DA_ARVORE.md` atualizados. O histórico
  de 2026-09-25/27/28 (maçãs 3x, cadeado padrão, reconstrução das correntes) fica preservado nos
  registros abaixo; esta entrega **substitui** a decisão de “cadeado padrão de todos os frutos”.

### Decisão visual

A pesquisa da Regra 2 (Hades, Slay the Spire, Dead Cells, Hollow Knight) mostra que nós bloqueados
são lidos por **estado** — silhueta dessaturada, caminho apagado, texto — e não por um cadeado
colado sobre a arte; as referências de UX reforçam que “acinzentado + rótulo” é a convenção legível
e que o cadeado sobre a arte é ambíguo. Com isso, a Árvore ganhou leitura mais limpa: as sete maçãs
aparecem inteiras (a Pálida branca inclusive), e o bloqueio se lê pelo cinza + rótulo + painel.

### Verificação (2026-09-29)

- `npm run test:quick` **22/22** e `npm test` **25/25**.
- `npm run inspect`: 30 cenas PC/mobile — nenhum erro de JS, 404 ou glifo faltando; 60 FPS.
- `npm run inspect:tree` (`tree-browser.mjs` + `tree-art-browser.mjs`): PC e mobile —
  127 posições de flor/nó sem colisão, 7 fundos sob demanda, compras/saves preservados.
- `npm run inspect:layout`: **108 estados limpos** (fonte normal e grande).
- `node game/test/mobile.mjs`: boot → expedição só com toque, OK.
- Capturas comparativas antes×depois (commit anterior em worktree temporário, já removido) em
  `/tmp/fumiga-sem-correntes` (fora do Git): copa sem cadeado, Pálida sem tranca, santuário selado
  e jardim de flores limpos.
- `node game/test/docs.mjs`: consolidação íntegra (os seis documentos originais intactos).

### Limites

- Sem o cadeado, o bloqueio do fruto depende de cor (cinza) + rótulo + painel; os testes
  `fruits.mjs`, `fruit-powers.mjs` e `tree-progression.mjs` continuam garantindo que gates, custos,
  efeitos e saves não mudaram.
- A Pálida segue futura/selada **por lógica** (`pending: true`), não por símbolo visual.
- Não há tranca sobre o galho do mundo 7 (a ideia opcional foi cancelada junto com o tema).

## Entrega — Correntes reconstruídas e maçãs 3x normalizadas (2026-09-28)

**Status: implementado e verificado.** Ajustes sobre a entrega A, a pedido do usuário:

1. **Sprites de corrente e maçã consertados.** Os únicos artefatos disponíveis são os
   preparados em `game/assets/ui/` (os originais de `art-source/` — gitignorados — não
   estão mais acessíveis). Problemas confirmados: `maca_planicie` ainda tinha o **fundo
   violeta opaco** (66% do quadro), manchas de fundo presas entre detalhes em `maca_gelo`
   e `maca_pantano`, e os **três sprites de corrente estavam fragmentados** (elos viraram
   ruído semitransparente; cadeado com furos). Correção no pipeline
   **`tools/repair_fruit_sprites.py`** (novo):
   - **fundo:** estimativa da cor de fundo por mediana dos violetas escuros + crescimento
     de região a partir da moldura, com guarda de cor (`violet_bg_like`, dist ≤ 34 da
     cor estimada) — sombras escuras da arte sobrevivem; segundo passe remove bolsões de
     fundo presos entre detalhes;
   - **restauro:** pixels de arte apagados (alfa 0 com RGB acromático claro) encostados em
     arte voltam a opacos — critério conservador para não virar ruído (a Pálida restaurou
     58 pixels; as demais, 0);
   - **correntes:** os três sprites foram **reconstruídos** em pixel art sólida (supersampling
     4x, paleta cobre/âmbar já usada no jogo): `correntes_deserto` = cadeado fechado com a
     corrente passando por trás (320×320); `correntes_tranca` = corrente de ponta a ponta com
     **três cadeados** pendurados (512×512); `correntes_cadeados` = variante bronze
     (320×320, **aposentada no desenho** — ver decisão 2 abaixo).
2. **Cadeado padrão (decisão do usuário):** o sprite `correntes_deserto` passa a ser o
   **cadeado de todos os frutos bloqueados** (inclusive o Deserto); só a **Pálida** fica com
   a `correntes_tranca`. `correntes_cadeados` sai do desenho (segue no `MANIFEST` e no
   teste de assets; a entrega B poderá reusá-lo ou aposentá-lo de vez).
3. **Maçãs 3x e do mesmo tamanho (decisão do usuário).** Todos os 7 sprites passaram a
   **960×960** (3x dos 320) com o **corpo da maçã medido por erosão + maior varredura
   horizontal** e **normalizado para 475–476 px em todas** (a variação anterior era de
   122–205 px — detalhes como trigo, broto e goteiras espremiam o corpo). O alvo cai para
   o valor em que **toda a arte cabe sem cortar** (a fita de xarope do outono limita a 476).
   Em jogo: `FRUIT_FRAME` 150 → **450** no zoom 1 (quadro 3x; corpo ≈ 3x o tamanho atual),
   cadeado 54 → 162 (proporcional), e as margens do foco de estágio (`TREE_STAGE_BOUNDS`)
   passaram de 120/160 para 250 para enxergar a maçã inteira. As coordenadas dos frutos
   **não mudaram** (`treemap.mjs` verde).
4. **Cache:** `ASSET_V` → `"20260928-macas-3x-correntes"` (PNGs novos + cache antigo).

### Verificação (2026-09-28)

- `npm run test:quick` 22/22 e `npm test` **25/25**.
- `npm run inspect`: 30 cenas PC/mobile — sem erros JS, 404 ou glifos — 60 FPS.
- `npm run inspect:layout`: **108 estados limpos** (fonte normal e grande) com as maçãs 3x.
- `npm run inspect:tree`: PC e mobile — 137 detalhes sem colisão, 78 compras, gestos,
  save e Renascimento — 60 FPS.
- `node game/test/mobile.mjs`: boot → expedição só com toque, OK.
- Capturas fechadas de cada fruto conferidas (maçã cinza + cadeado cobre no bloqueio;
  tranca de três cadeados sobre a Pálida; corpos medidos iguais).
- Preview: `npm run serve` (0.0.0.0:8000) com os assets novos.

### Limites

- Sem `art-source/`, a restauração é a partir dos preparados: o que era pura cor de fundo
  não se distingue de arte apagada da mesma cor; o critério escolhido é conservador
  (prefere deixar uma sombra violeta a apagar arte).
- As correntes são **reconstruções** (não restauros pixel a pixel) — mesma composição e
  paleta, formas sólidas e legíveis nos tamanhos de uso (162 px e 495 px).

## Entrega B — Santuário com flores por bioma (2026-09-28; revisão visual)

**Status: implementado e verificado.** O Santuário mantém IDs, custos, níveis, pré-requisitos,
efeitos, gates e saves. Após a primeira entrega, o usuário pediu o jardim com a mecânica de
restauração de cor da Árvore original e as 13 melhorias visíveis juntas. As escolhas atuais
substituem as abas e cadeados sobre as flores descritos na versão inicial de B. A Pálida continua
futura/selada; a tranca opcional no galho do mundo 7 não foi adicionada.

### Direção visual atual confirmada pelo usuário

1. **Cinza → cor:** o jardim começa inteiramente acromático. Cada nível comprado entre as melhorias
daquele fruto restaura a cor do fundo, da maçã, das flores e dos caminhos. A saturação segue a
curva `sqrt(progresso)` da Árvore ancestral, e com 100% os pixels originais da arte são
reconstruídos exatamente.
2. **13 flores juntas:** as 10 melhorias novas e 3 legadas aparecem no mesmo jardim, sem abas
NOVAS/LEGADO, mantendo os IDs e pré-requisitos.
3. **Pétalas desobstruídas:** não desenhar cadeados/correntes, placas, aros ou números sobre as
flores. Os alvos de 44 px seguem invisíveis e funcionais. O estado bloqueado aparece ao inspecionar
na informação de pré-requisito e no botão `EVOLUIR` desativado.
4. **Detalhe lateral:** o painel segue aparecendo após selecionar, sem escurecer a tela toda e sem
cobrir flores ou maçã; `EVOLUIR` confirma e `FECHAR` volta ao jardim.
5. **Preço:** só no painel de detalhe após selecionar. Seleção continua sem gastar essência.
6. **Pálida:** mantém fundo e maçã branca sob `correntes_tranca`, nenhuma flor/compra, e continua
futura.

### O que mudou

- `game/js/assets.js`: `loadSantuario(map)` carrega apenas o PNG do fruto aberto, tenta novamente
  conforme `LOAD_CFG.attempts`, usa `ASSET_V = "20260928-santuarios-flores"` e compartilha a
  promessa/imagem em `Map`. A falha final libera uma tentativa posterior ao reabrir. Nenhum dos
  sete fundos (~5,1 MB) entrou no `MANIFEST` ou no boot; há placeholder síncrono enquanto carrega.
- `game/js/tree_layout.js`: `SANTUARIO_SLOTS` e `fruitFlowerPos(fi, ni)` expõem as 13 posições
  novas+legadas juntas em coordenadas 960×540, com 44 px de hitbox invisível e pelo menos 52 px
  entre centros. `FRUIT_SLOTS`, `fruitCenter` e os pontos da Árvore não mudaram.
- `game/js/color_restore.js`: canvas/buffers reutilizáveis convertem fundo e maçã do cinza para
  seus pixels originais. Cada vista recalcula apenas quando muda imagem/saturação, sem
  `Canvas.filter`, processamento por frame ou dependência de runtime.
- `game/js/meta.js`: `fruitGardenGrowth()` mede os níveis do fruto; a curva usa `sqrt(levels/total)`
  como a Árvore. `drawFruitMini()` colore também flores, névoa e caminhos; mostra 13 de uma vez,
  sem lock/painel/aro/números sobre as pétalas. O detalhe lateral mantém EVOLUIR/FECHAR sem
  escurecer a cena nem cobrir as flores. Cabeçalho indica COR% e níveis; Pálida fica selada.
- `game/js/ui.js`: `hitArea()` registra alvos desenhados à mão para auditoria e input invisível,
  sem adicionar painéis/gradientes por flor. PC e mobile compartilham os módulos/posições.
- `game/test/assets.mjs`, `treemap.mjs`, `tree-browser.mjs` e `tree-art-browser.mjs`: conferem
  lazy-load, retry, geometria das 13 flores juntas, acromático/50%/100% (fundo e maçã), gates,
  seleção, compra explícita, Pálida, saves e navegação PC/mobile.
- `game/assets/ui/README.md`: inventário e documentação da integração atualizados. Nenhuma arte
  nova foi gerada; os 7 santuários aprovados que já existiam são desenhados 1:1.

### Inspirações pesquisadas e adaptação

- [Glyph Warden — árvore visual de melhorias](https://meapps.itch.io/glyph-warden/devlog/1607468/the-upgrade-room-is-now-a-real-skill-tree): referência direta para a diferença entre nós disponíveis e adquiridos; aqui o estado de compra também recupera cor na arte.
- [Kosmische Hegemonie — árvore visual por conexões](https://anshinteractivestudio.itch.io/kosmische-hegemonie/devlog/1466934/skill-tree-ui-complete-v11): inspiração para deixar os caminhos legíveis sem cadeados sobre as flores.
- [Dead Cells — notas oficiais da Forja](https://deadcells.com/patchnotes/7): aproveitada a leitura
  clara de progressão permanente e investimento entre tentativas; no FUMIGA a compra segue sendo
  confirmada por `EVOLUIR`, sem copiar o sistema de qualidade/loot.
- [Hades — notas oficiais do Mirror of Night](https://www.supergiantgames.com/blog/6/): referência
  para agrupar melhorias persistentes e aumentar a clareza visual das escolhas; os preços, efeitos
  e comportamento do FUMIGA permaneceram os existentes.
- [Hollow Knight — menu de charms ligado ao banco](https://gamers.wiki/en/games/hollow-knight/guides/hollow-knight-charm-system-guide-best-builds-and-notch-locations):
  inspiração para uma tela de preparação contextual, adaptada aqui à clareira natural e às flores,
  sem adicionar recurso/equipamento novo.

### Verificação (2026-09-28)

- Base antes de implementar: `npm run test:quick` **22/22**.
- `npm run test:quick`: **22/22**; `npm test`: **25/25** após a revisão visual.
- `npm run inspect:tree`: PC e mobile — **127 posições** auditadas em fonte normal/grande;
  13 flores juntas, sem abas/cadeados sobre elas; cinza/50%/cor original testados com pixels
  reais no fundo e na maçã; compra explícita, 78 compras, gates e saves preservados; 7 fundos
  sob demanda e 60 FPS.
- `npm run inspect:layout`: **108 estados limpos** PC/mobile, fonte normal/grande, sem sobreposição
  ou texto fora de tela.
- `npm run inspect`: **30 cenas** PC/mobile, sem erro JS, 404 ou glifo faltando; boot medido em
  1,38 MB PC / 1,87 MB mobile, santuários ainda fora do boot.
- `npm test` inclui mobile ponta a ponta. `node game/test/docs.mjs`: seis documentos originais,
  **109.554 bytes** intactos.
- Capturas inspecionadas: `/tmp/fumiga-tree/pc-santuario.png`,
  `/tmp/fumiga-tree/pc-santuario-flor.png`, `pc-santuario-cor.png`,
  `pc-santuario-palida.png` e variantes mobile — antes/depois da cor e detalhe lateral.

### Limites e próximos passos

- A arte de flor é construída em Canvas com formas pixeladas (o escopo aprovado não previa sprites
  separados). A variação de espécie vem do tema/cor do fruto; os custos permanecem no painel
  selecionado, por decisão do usuário.
- As flores não recebem cadeados; o cadeado do fruto na Árvore e o selo da Pálida permanecem.
  A tranca opcional sobre o galho 7 continua fora do escopo.
- Preview ao vivo iniciado após as verificações: `npm run serve` em `0.0.0.0:8000`.
- Nenhum preço, poder, ID ou save precisou de migração; PR somente se solicitado pelo usuário.

## Entrega — Maçãs douradas nos nós da Árvore (entrega A, 2026-09-27)

**Status: implementado e verificado.** Este registro **substitui parcialmente** o status da
entrega de 2026-09-25 (“A INTEGRAÇÃO na interface ainda NÃO foi feita”): a **entrega A** do
contrato `PROXIMOS_PASSOS_DA_ARVORE.md` (maçã no nó do fruto da Árvore) está pronta. As
entregas **B** (tela do Santuário com flores) e **C** (cadeados nas flores) ainda estavam
pendentes **naquela data**. O status foi substituído pela seção “Entrega B — Santuário com flores
por bioma (2026-09-28)” acima; o handoff segue como contrato e histórico.

### Decisões do usuário (perguntas da Regra 1, 2026-09-27)

1. **Tamanho:** quadro de **150 px** no zoom 100% (maçã ~90 px); o raio de clique acompanha
   o quadro (mínimo 22 px de toque); a coordenada do fruto não muda.
2. **Cadeado:** sim — fruto bloqueado = maçã **acinzentada + `correntes_cadeados`** pequeno
   sobre ela (o Deserto usa `correntes_deserto`, variante do bioma).
3. **Pálida:** maçã branca com `correntes_tranca` (corrente + 3 cadeados) atravessando o
   fruto; estado futuro, nenhuma mudança de comportamento.
4. **Número do mundo: RETIRADO dos frutos** (decisão do usuário, que sobrepõe a nota
   “nunca esconder o número” do contrato): a trajetória 1→7 é percebida de forma orgânica
   pelo caminho dos galhos; os números seguem na lista de patamares do HUD esquerdo. O
   rodapé passou de “FRUTOS NUMERADOS ABREM HABILIDADES” para “FRUTOS ABREM HABILIDADES”.

### O que mudou

- `game/js/assets.js`: `MANIFEST` ganhou as 7 `maca_*` e as 3 `correntes_*` (boot,
  +~1,5 MB); `ASSET_V` → `"20260925-macas-santuarios"`. Os `santuario_*` continuam FORA do
  boot (sob demanda, entrega B).
- `game/js/tree_layout.js`: `fruitAssetName(fruit)` — mapeamento único do mundo 7
  (`topo` → `palida`), usado pelo jogo e pelo teste de assets.
- `game/js/meta.js`: `drawFruit()` substituiu o polígono procedural pela arte 320×320
  (`imageSmoothingEnabled = false`), com aro de estado (âmbar = aberto, cinza = fechado,
  amarela = hover), rótulos inalterados (`ABRIR FRUTO` / `FRUTO BLOQUEADO` / `FRUTO FUTURO`),
  versão acromática assada uma vez por fruto (mesmo critério do `tree_art.js`) e `pickAt()`
  com raio = quadro (mín. 22 px). Sem número no fruto.
- `game/test/assets.mjs`: dois checks novos (maçãs dos mundos no boot; correntes/cadeados no
  boot) — o teste acusaria se algum dos 10 PNGs saísse do `MANIFEST`.
- `game/assets/ui/README.md`: seção documentando os novos PNGs.

### Correção de asset (fundo violeta dos PNGs preparados)

Sete arquivos chegaram com o fundo violeta **opaco ou residual** (`maca_floresta`,
`maca_outono`, `maca_gelo`, `maca_palida`, `correntes_cadeados`, `correntes_deserto`,
`correntes_tranca` — a remoção do preparo de 2026-09-25 só limparia totalmente
`maca_planicie`; `maca_pantano` e `maca_deserto` tinham ainda resíduo semitransparente
visível em jogo). O fundo foi removido por **crescimento de região a partir das bordas**
(BFS; critério “violeta de fundo = canal verde ≤ vermelho E azul”; distância por passo ≤ 40;
guarda ≤ 130): só o fundo conectado à moldura vira transparente. A arte interna —
incluindo as rachaduras roxas da Pálida e os elos escuros das correntes — foi preservada.
Nenhum pixel da arte foi redimensionado, recortado ou borrado; mudou apenas o alfa do
fundo. Os originais aprovados seguem fora do Git (`art-source/`, gitignorado), como manda
o contrato.

### Verificação

- `npm run test:quick` e `npm test`: **25/25** (incluindo os 2 checks novos de assets).
- `npm run inspect`: 30 cenas PC/mobile, sem erros JS, 404 ou glifos.
- `npm run inspect:tree`: PC e mobile — seleção real pelos 7 frutos, arte cinza/cor,
  7 galhos, gates, compras, saves, arrasto/pinça, Renascimento — 60 FPS.
- `npm run inspect:layout`: **108 estados limpos** (fonte normal e grande, PC e mobile).
- `node game/test/mobile.mjs`: boot → expedição só com toque, saves isolados, OK.
- Capturas dos estados (bloqueado/aberto/Pálida) conferidas em zoom, PC e mobile.
- Preview no ar: `npm run serve` (0.0.0.0:8000).

### Limitações e próximos passos

- Cadeado e tranca em escala pequena saem um pouco “pontilhados” (pixel art fina da
  corrente perde elos ao redimensionar); legíveis nos tamanhos de uso (~54 px e ~165 px).
  Aceito para a entrega A.
- **Entrega B** (tela do Santuário: fundo 1:1, maçã em névoa, 13 flores, `loadSantuario`
  sob demanda) e **C** (cadeados nas flores do Santuário) — ver
  `PROXIMOS_PASSOS_DA_ARVORE.md` (seções 2.B, 2.C e 4).

## Entrega — Sete maçãs douradas e sete santuários de bioma (2026-09-25)

**Status: as 17 artes foram geradas, escolhidas pelo usuário (2 opções por imagem, Regra 6) e
processadas para o jogo. A INTEGRAÇÃO da entrega A (maçãs nos nós da Árvore) foi feita em
2026-09-27 — ver a seção acima; as entregas B (Santuário) e C (cadeados nas flores) ainda NÃO
foram feitas.** Este registro
**substitui a pendência** "sete maçãs douradas estilizadas por mapa e as respectivas telas com a
direção Santuário do bioma" descrita em *Preparação para PR — árvore concluída, maçãs e santuários
pendentes (2026-09-24)*: a arte existe agora; o código que a exibe continua pendente e está
listado nos próximos passos abaixo.

### Direção confirmada pelo usuário

- Ordem canônica de progressão, igual a `META_STAGES` em `config.js`: **Planície, Floresta,
  Pântano, Deserto, Outono, Pico Congelado (Montanha), A Pálida**.
- **Todas as maçãs são douradas, exceto a Pálida**: corpo branco-osso, aura branca, rachaduras
  roxo-violeta profundas e fumaça saindo de dentro do fruto (escolha "branca").
- **Todo santuário** tem espaço central livre para alocar todas as melhorias, árvores/vegetação em
  volta e um buraco no fundo mostrando o horizonte do bioma.
- Resposta personalizada nas perguntas da Regra 1: a maçã fica **suspensa em névoa** no centro da
  clareira e **as melhorias viram flores do bioma** plantadas nesse espaço central.
- O ninho da Pálida entra no **horizonte como CASTELO pálido** (correção do usuário: "o ninho dela
  é um castelo"), **bem ao fundo e coberto por várias camadas de fumaça** — só as torres mais altas
  aparecem acima da bruma (segunda correção do usuário).
- Escopo confirmado: **estrito** — 7 maçãs + 7 santuários + correntes/cadeados.

### Características por mundo (arte aprovada)

| # | Mundo | Maçã (base dourada comum) | Santuário |
|---|-------|---------------------------|-----------|
| 1 | Planície | trigo, capim, flores silvestres, gotas de orvalho | clareira de grama com horizonte de trigal no amanhecer |
| 2 | Floresta | musgo, trepadeira, flores e mini árvore de musgo enraizada no fruto | musgos, cogumelos brilhantes, cipós e luz de dossel ao fundo |
| 3 | Pântano | cogumelos (marrom e turquesa), líquido verde de veneno escorrendo, mini árvore de pântano | poças verdes, lama borbulhando, névoa tóxica e árvores afogadas |
| 4 | Deserto | cactos, areia, mini palmeira, trigo branqueado, calor | areia, cactos, cristais âmbar e horizonte de dunas com sol branco |
| 5 | Outono | xarope de bordo escorrendo, folhas de outono, mini árvore de outono | bosque cobre/âmbar, folhas caindo, seiva doce de bordo |
| 6 | Montanha (Gelo) | maçã congelada, neve, mini árvore ROSA em flor, gelo pendurado | neve, gelo, árvores rosa cobertas de neve, picos no horizonte |
| 7 | A Pálida | corpo BRANCO (não dourado), aura branca, rachaduras roxas, fumaça saindo de dentro | tudo branqueado, fumaça, rachaduras roxas e o CASTELO pálido afogado em bruma no horizonte |

### Correntes e cadeados (santuários seguem a mesma característica geral das maçãs)

- `correntes_cadeados.png`: cadeado fechado com corrente — estado de nó bloqueado / selo do fruto.
- `correntes_deserto.png`: variação do cadeado para o Deserto Calcinado (sand-blasted, cristais,
  areia acumulada nos elos).
- `correntes_tranca.png`: barreira de corrente atravessando a tela com três cadeados — selo do
  santuário da Pálida, que não abre na versão atual (o fruto 7 segue `pending`).

### Arte e arquivos

- Originais aprovados em **`art-source/`** (fora do Git, mesma decisão das camadas `_orig/` do
  TITLE): `macas/`, `santuarios/`, `comuns/` e a folha de revisão
  `art-source/_revisao/folha-aprovada.png`.
- **`tools/prepare_fruit_art.py`** (Pillow, somente ferramenta de arte — o jogo continua JS puro):
  remove o fundo violeta `#1d1127`, recorta as margens vazias, redimensiona e reduz a paleta.
- Saída carregada pelo jogo em `game/assets/ui/`:
  - `maca_<mundo>.png` **320×320 RGBA** (1,2 MB somando as sete) — tamanho em que a maçã é
    desenhada no nó da Árvore;
  - `santuario_<mundo>.png` **960×540 RGB** — 1:1 com o canvas do jogo, **carregado sob demanda**
    na tela do santuário, nunca no boot (Regra 5);
  - `correntes_cadeados.png` 256×256, `correntes_deserto.png` 256×256, `correntes_tranca.png`
    192×192, todos RGBA.
- Peso medido dos santuários: ~5,1 MB no total (o detalhe fino da pixel art é o custo). A redução
  de paleta foi testada antes da decisão: 256→128 cores economiza cerca de 3% (fundo ruidoso), então
  a fidelidade à arte aprovada ficou; o corte de peso vem do tamanho certo para cada uso.

### Próximos passos (ainda NÃO implementados) — detalhados em `PROXIMOS_PASSOS_DA_ARVORE.md`

O documento **`PROXIMOS_PASSOS_DA_ARVORE.md`** (raiz do repositório, 2026-09-25) é o contrato de
execução desta integração: inventário da arte, arquivos/símbolos a tocar, especificação da tela do
santuário, testes, armadilhas e checklist de aceite. Um chat novo deve lê-lo inteiro antes de
codificar. Resumo dos três blocos:

1. Tela do santuário do fruto: fundo do bioma, maçã suspensa em névoa, as 13 melhorias como flores
   plantadas na clareira, correntes/cadeado nos estados bloqueado/aberto.
2. Maçã dourada no nó do fruto da Árvore (`tree_layout.js`, `meta.js`, `assets.js`), com o `IMG`
   das maçãs no boot e os santuários carregados por `loadImage` sob demanda.
3. `ASSET_V` elevado (novos PNGs), mobile sem duplicar lógica (Regra 9), `npm test` + `npm run
   inspect` verdes e este registro completado com as evidências.

## Preparação para PR — árvore concluída, maçãs e santuários pendentes (2026-09-24)

**Escopo enviado para revisão:** a Árvore Ancestral ao Crepúsculo descrita abaixo,
com restauração de cores, sete patamares, rebalanceamento dos 49 nós principais,
compatibilidade de saves e interface compartilhada PC/mobile. O usuário aprovou
esse resultado. A solicitação atual é **abrir uma pull request** da branch
`arena/01a0d4b1-fumiga-goat` para `main`, deixando-a aberta para revisão, sem merge.

**Follow-up ainda não implementado:** sete maçãs douradas estilizadas por mapa e
as respectivas telas com a direção **Santuário do bioma**. Foram escolhidas as
bases visuais da Planície (maçã: opção 1; cenário: opção 2), mas a geração seguinte
foi interrompida e atingiu o limite de imagens daquele turno. Os arquivos dessas
novas artes não estão disponíveis no checkout atual; nenhum asset ou renderer de
maçãs/santuários foi integrado. Os frutos existentes continuam em uso. Essa
pendência não deve ser confundida com a árvore já concluída nem anunciada como
parte funcional desta PR.

**Próximos passos do follow-up:** recuperar/concluir as artes em lotes menores,
integrar os sete temas, mostrar os resultados e validar PC/mobile. Preservar os
poderes, custos, saves e bloqueios atuais; Pálida/mundo 7 continuam futuros.

**Revalidação antes do envio:**
- `npm run test:quick`: **22/22**.
- `npm test`: **25/25**.
- `npm run inspect`: **30 cenas PC/mobile**, sem erros JS, HTTP 404 ou glifos.
- `npm run inspect:ui`: páginas/replay em PC/mobile e ninho, comandos da boca,
  pausa/retomada e invocação por toque aprovados.
- As inspeções específicas da árvore, arte, gestos e layout do registro abaixo
  permanecem como evidência da implementação; não foram repetidas nesta etapa,
  que não altera o código de produção.

## Entrega — Árvore Ancestral ao Crepúsculo e sete patamares (2026-09-24)

**Status: implementado e verificado no escopo aprovado.** Este registro substitui
o desenho procedural da árvore, a antiga fila de frutos na copa e os preços/valores
anteriores dos **49 nós principais**. Preserva o histórico abaixo, os 18 legados e
os 70 poderes novos dos frutos. **Não implementa o sétimo mapa nem a Pálida.**

### Escolhas confirmadas e referências

- Direção **Ancestral ao Crepúsculo**, no mesmo estilo das imagens da TITLE.
- A árvore começa cinza; compras devolvem a cor às regiões correspondentes.
- Sete patamares ascendentes, com frutos em galhos dispersos. Vencer um mundo
  abre o próximo galho, com melhorias mais caras e avançadas até a copa.
- Autorizado **rebalancear custos e efeitos existentes**, sem apagar compras,
  trocar IDs ou alterar os 70 poderes dos frutos. Arte escolhida: **opção 2 de 2**.
- Referência principal: as próprias camadas `game/assets/parallax/menu/`.
  Apoio pesquisado: profundidade/iluminação da pixel art de **Children of Morta**
  [3](https://www.gamedeveloper.com/design/postmortem-children-of-morta), ambientação
  orgânica de **Greenpath / Hollow Knight**
  [2](https://www.kickstarter.com/projects/11662585/hollow-knight/posts/1228656), e
  investimentos permanentes graduais da Forja de **Dead Cells**
  [2](https://guides.gamepressure.com/dead_cells/guide.asp?ID=46067).
  São referências de direção, não assets copiados desses jogos.

### Arte, interface e desempenho

- `game/assets/ui/tree_ancestral.png`: **768×672, RGBA real, 656.076 bytes**.
  Original gerado em alta resolução (1552×672); preparo remove apenas o fundo
  uniforme e as margens vazias, sem reduzir/rescalar/borrar os pixels. Tronco
  violeta, folhas oliva/âmbar, raízes com formigueiro; nenhuma figura humanoide.
- `tools/prepare_tree_art.py`: pipeline reproduzível a partir do original
  aprovado. O original e alternativas ficam fora do Git; Pillow é ferramenta
  de arte, não dependência do jogo. Só um PNG novo entra no carregamento.
- `tree_art.js`: acromático verdadeiro no progresso zero. Saturação restaurada
  localmente com mescla entre regiões, derivada dos níveis comprados. Máscaras
  e pixels são assados uma vez; o cache só é refeito quando compras mudam, não
  por frame. Em 100% os pixels opacos coincidem com a arte aprovada.
- Os níveis principais e frutos obtíveis entram na restauração. Os dez poderes
  futuros da Pálida **não impedem 100% da arte nesta versão**; seu fruto continua
  cinza/bloqueado. Abrir um galho por vitória não compra nem colore suas melhorias.
- `tree_layout.js`: posições exclusivas de apresentação, ancoradas no PNG, quatro
  unidades de mundo por pixel; frutos alternados e ascendentes de 1 a 7.
- `meta.js`: cabeçalho compacto, navegação lateral 7→1→raiz, acesso dedicado à
  primeira compra gratuita, detalhe fixo, VER TUDO, zoom +/−, arrasto/roda/pinça.
  Selecionar só inspeciona; **EVOLUIR** confirma. Clique/toque no desenho é
  reconhecido ao soltar sem arrastar. Na visão geral mobile, tocar um nó pequeno
  primeiro aproxima seu galho. Controles novos têm pelo menos 44px lógicos.
- Ao focar um galho, preços dos outros recuam e as conexões de pré-requisito
  aparecem sob demanda. A volta da miniárvore preserva o enquadramento. Fonte
  grande, alto contraste e efeitos reduzidos continuam disponíveis.
- Mesmo motor e asset no PC/mobile; nenhuma lógica duplicada em `game/mobile/`.
  O céu da TITLE é reutilizado discretamente como fundo **estático**. A arte e
  o parallax da TITLE, as cutscenes e os seis mapas não foram refeitos.
- `ASSET_V` atualizado para `20260924-tree-ancestral`; preview sem cache.

### Progressão, preços e compatibilidade

`META_STAGES`, `stage` e `META_POWER` em `config.js` são os dados canônicos;
`treeStageRequirement`/`metaCanBuy` em `state.js` aplicam os bloqueios também fora
da interface. Todos os mundos anteriores precisam constar como vencidos na campanha.

| Patamar | Disponível após | Nós principais | Preços por nível, em essência |
|---|---|---:|---|
| 1 · Planície | início | 8, incluindo a raiz | raiz grátis; 20–95 |
| 2 · Floresta | mundo 1 | 7 | 105–175 |
| 3 · Pântano | mundos 1–2 | 7 | 225–405 |
| 4 · Deserto | mundos 1–3 | 7 | 415–585 |
| 5 · Outono | mundos 1–4 | 7 | 700–975 |
| 6 · Gelo | mundos 1–5 | 7 | 1160–1590 |
| 7 · Copa / Névoa-Mãe | mundos 1–6 | 6 | 1880–2560 |

- Um patamar custa mais que o anterior mesmo comparando seu primeiro nível
  com o maior preço anterior. Dependências nunca exigem um galho posterior.
- **Galho e fruto têm gates diferentes:** abrir o galho 2 após a Planície não
  concede o fruto da Floresta. Cada fruto exige seu próprio chefe de campanha.
  A copa é comprável após os seis mundos, mas o fruto 7 aguarda a Fase 8; nem
  `clearedMaps.topo = true` permite comprá-lo enquanto `pending` estiver ativo.
- Permanecem **49 IDs / 143 níveis principais**, 18 legados e 70 poderes novos:
  137 definições. As 78 compras de frutos obtíveis conservam custos e efeitos;
  as dez futuras continuam somente para leitura.
- Saves antigos conservam níveis e benefícios, usando os valores rebalanceados.
  Não há cobrança retroativa, reembolso inventado, reset nem inferência de
  vitórias a partir de compras. Comprar níveis adicionais em galhos altos exige
  os chefes, mas um bônus já possuído não é desligado pelo novo gate.
- Potência inicial preservada; reforçados os nós intermediários/avançados.
  Exemplos: cadência +12%/nível, alcance +20/nível, espinhos 6/nível, regeneração
  real 3/s/nível; na copa, veneno +35% duração/+40% corrosão por nível,
  PORTA-VIVA até 69% de redução, CEIFA até 52% mantendo o custo de vida,
  e Renascimento com **75% da vida** uma vez por expedição. Valores de execução
  centralizados em `META_POWER`, descrições sincronizadas e trade-offs preservados.

### Verificações e evidências

- Base inicial: `npm run test:quick`, **20/20** antes da mudança.
- `npm test`: **25/25**, incluindo mobile, todos os bônus, chefes, persistência,
  novo `tree-progression` e `sim-tree-combos` (árvore principal completa + 60
  poderes globais obtíveis em combate). O teste novo verifica os 48 efeitos
  principais, IDs/143 níveis, preços estritamente crescentes, gates, eventos
  idempotentes, saldo insuficiente e saves antigos.
- `TREE_MIN_FPS=55 npm run inspect:tree`: **548 detalhes** (137 × duas fontes ×
  PC/mobile), 78 compras de frutos por perfil persistidas e nenhuma compra ao
  inspecionar. Mais testes reais da arte: cinza, primeira cor local sem colorir
  a copa, 100% idêntico ao original, ausência de rebake por frame, navegação nos
  sete galhos, frutos, retorno, bloqueios, compra explícita e cor após reload.
  Roda, arrasto e pinça reais não abrem frutos nem compram por acidente.
- Renascimento de 75% exercitado no consumidor real da expedição no navegador;
  não apenas validado em um objeto de bônus. Fonte grande/alto contraste e
  efeitos reduzidos inspecionados. **60 FPS PC e 60 FPS mobile**, 120 frames por
  perfil na árvore restaurada, gate de 55 aprovado em execução isolada.
  É diagnóstico em Chromium headless, não promessa para todo aparelho físico.
- `npm run inspect`: **30 cenas PC/mobile**, incluindo TITLE, árvore, ninho,
  seis mapas e demais menus, sem erros JS/HTTP/glifos. Capturas abertas para
  inspeção visual em `/tmp/fumiga-inspect`, `/tmp/fumiga-tree` e
  `/tmp/fumiga-tree-art`; estes artefatos não entram no Git.
- `node game/test/layout-browser.mjs --so=ARVORE --extra`: **16 estados**
  aprovados (PC, mobile, mobile 16:9 e retrato; visão geral/detalhe selecionado;
  fonte normal/grande). Sem vazamentos, sobreposições ou controles cobrindo a tela.
  O cenário de detalhe agora seleciona um nó real, não uma coordenada antiga.
- `npm run inspect:ui`: páginas/replay em PC/mobile; ninho, comandos da boca,
  pausa/retomada e invocar no mobile aprovados. Durante execuções concorrentes,
  a fixture que reutilizava a página do replay não encontrou `nestBtn` de forma
  estável; a repetição isolada passava. A fixture do HUD agora começa em um
  documento novo, sem callbacks/estado transitório do replay, e espera o botão
  capturando seu retângulo no mesmo quadro. Revalidada **em paralelo com `npm test`**,
  também verde. Nenhuma mecânica do ninho/cutscene foi alterada para contornar o teste.
- Fechamento: `npm test` novamente **25/25**, `git diff --check` limpo, pipeline
  de preparo reproduzindo o PNG final byte a byte; PC, mobile e asset respondem
  HTTP 200 no preview.
- Exibidos no viewer: PNG final, detalhe 3× nearest e capturas aplicadas cinza
  e restaurada. As demonstrações usam saves de teste, sem alterar o save real;
  cópias de apresentação em `/home/user/fumiga-art`, fora do Git.
  Preview ativo `npm run serve`, porta 8000, confirmado em `0.0.0.0`.
- Seis documentos incorporados permanecem intactos; integridade byte a byte e
  SHA-256 verificada com `node game/test/docs.mjs`. Sem commit/push nesta entrega.

**Limitações/próximos passos:** jogar em aparelho físico e ajustar a economia a
partir de campanhas humanas; os testes verificam efeitos e invariantes, não
provam equilíbrio perfeito entre todas as builds. Implementar mundo 7/Pálida
somente no escopo da Fase 8. O fechamento não declara concluídas as Fases 4–8.

### Catálogo vigente das 49 melhorias principais

Preços em essência, na ordem dos níveis. Catálogo gerado das definições desta
entrega; a tabela histórica dos 70 poderes dos frutos abaixo não foi alterada.

| Galho | Melhoria / ID persistente | Custos | Efeito |
|---|---|---|---|
| 1 | COLÔNIA ANCESTRAL (`raiz`) | 0 | O coração do formigueiro eterno. Comece aqui: desperte a raiz sem gastar essência. |
| 1 | MANDÍBULA DE GUERRA (`g_dan`) | 20, 35, 50, 70, 95 | +10% de dano para todas as aliadas por nível. |
| 1 | CARAPAÇA DURA (`g_vid`) | 20, 35, 50, 70, 95 | +12% de vida para todas as aliadas por nível. |
| 1 | PATAS ESCAVADORAS (`n_dig`) | 20, 35, 50 | +30% de velocidade de escavação das câmaras por nível. |
| 1 | NÉCTAR REAL (`r_reg`) | 20, 35, 50 | Intervalo de alimentação da rainha -30% por nível. |
| 1 | SANGUE REAL (`r_vida`) | 20, 35, 50 | Rainha: +15% de vida máxima por nível. |
| 1 | FORAGEM (`t_col`) | 20, 35, 50 | +15% de comida por pilha coletada por nível. |
| 1 | MARCHA RÁPIDA (`t_vel`) | 20, 35, 50 | +10% de velocidade das operárias por nível. |
| 2 | FÚRIA CEGA (`g_cri`) | 105, 135, 175 | +5% de chance de crítico (dano x2) por nível. |
| 2 | PATRULHA INICIAL (`g_grd`) | 105, 135 | Começa a expedição com +1 soldado por nível. |
| 2 | BERÇÁRIO FECUNDO (`n_berco`) | 105, 135, 175 | +20% de velocidade de chocagem no berçário por nível. |
| 2 | CORREDOR RÁPIDO (`n_corr`) | 105, 135, 175 | +15% de velocidade das formigas dentro do formigueiro por nível. |
| 2 | ÍNCUBO (`r_ovo`) | 105, 135, 175 | Tempo de chocar -15% por nível. |
| 2 | BOLSAS PROFUNDAS (`t_carga`) | 105, 135, 175 | Operárias carregam +1 de carga por nível. |
| 2 | COLHEITA RÁPIDA (`t_rap`) | 105, 135, 175 | +16% de velocidade de coleta em pilhas e veios por nível. |
| 3 | MANDÍBULAS LONGAS (`g_alc`) | 225, 275, 335 | +20 de alcance para as lutadoras por nível. |
| 3 | CARAPAÇA BLINDADA (`g_arm`) | 225, 275, 335 | -5% de dano recebido por todas as aliadas por nível. |
| 3 | CADÊNCIA DE GUERRA (`g_cad`) | 225, 275, 335 | +12% de velocidade de ataque por nível. |
| 3 | FUNGÁRIO DO NINHO (`n_fung`) | 225, 275, 335 | +2 comida a cada ciclo do fungário por nível. |
| 3 | SUPERORGANISMO (`r_pop`) | 225, 275, 335, 405 | +5 de população máxima por nível. |
| 3 | VEIOS DE ÂMBAR (`t_ambar`) | 225, 275 | Cristais de essência rendem +3 por extração por nível. |
| 3 | PROLE INICIAL (`t_ini`) | 225, 275 | Começa a expedição com +3 operárias por nível. |
| 4 | PÓLVORA NEGRA (`g_bomb`) | 415, 495, 585 | +25% de raio da explosão da bombeira por nível. |
| 4 | ESQUIVA (`g_esq`) | 415, 495, 585 | +7% de chance de esquivar por completo de um golpe por nível. |
| 4 | BRASA CONTÍNUA (`g_fogo`) | 415, 495 | +25% de dano de queimadura por nível. |
| 4 | PLANTA ECONÔMICA (`n_eco`) | 415, 495, 585 | -10% no custo de escavar/evoluir câmaras por nível. |
| 4 | POSTURA REAL (`n_ovo`) | 415, 495, 585 | A rainha bota ovos em 14% menos tempo por nível. |
| 4 | ESTOQUE INICIAL (`t_estoque`) | 415, 495 | Começa a expedição com +40 de comida por nível. |
| 4 | REDE DE TRILHAS (`t_rede`) | 415, 495, 585 | +8% de velocidade para TODAS as formigas fora do ninho por nível. |
| 5 | ESPINHOS DE QUITINA (`g_esp`) | 700, 825, 975 | Quem morde uma aliada leva 6 de dano por nível. |
| 5 | DESPENSA FUNDA (`n_desp`) | 700, 825, 975 | +3 comida em cada entrega dentro do formigueiro por nível. |
| 5 | ZELO DA COLÔNIA (`n_zelo`) | 700, 825, 975 | 9% de chance por nível da operária sobreviver a um golpe fatal (fica com 1). |
| 5 | CASCA DA RAINHA (`r_casca`) | 700, 825, 975 | -10% de dano recebido pela rainha por nível. |
| 5 | ESSÊNCIA ANCESTRAL (`r_essin`) | 700, 825, 975 | Começa a expedição com +45 de essência por nível. |
| 5 | SABEDORIA DA COLÔNIA (`r_xp`) | 700, 825, 975 | +18% de XP ganho por nível. |
| 5 | ATALHO (`t_atalho`) | 700, 825, 975 | +12 de essência por invocar uma onda adiantada por nível. |
| 6 | FERRÃO DA BALA (`k_bala`) | 1160, 1360, 1590 | A poneratoxina da FORMIGA-BALA reforça a ferroada: +0,5s de lentidão por nível. |
| 6 | JARDIM DA CORTADEIRA (`k_cortadeira`) | 1160, 1360, 1590 | Cada entrega de comida da CORTADEIRA apressa o fungário em +0,6s extra por nível. |
| 6 | BÁLSAMO DA MATABELE (`k_matabele`) | 1160, 1360, 1590 | A cura da MATABELE é +14% mais forte e a triagem ativa com feridas até +5% mais leves por nível. |
| 6 | ÂMBAR DA DESPENSA (`k_mel`) | 1160, 1360, 1590 | O POTE-DE-MEL goteja com o estoque até +30 mais alto e 30% mais rápido por nível. |
| 6 | PASSO DA PRATA (`k_prata`) | 1160, 1360, 1590 | As arrancadas relâmpago da FORMIGA-PRATA ficam 18% mais frequentes por nível. |
| 6 | ALMA DA COLÔNIA (`r_ess`) | 1160, 1360, 1590 | +22% de toda essência ganha por nível. |
| 6 | VITALIDADE REAL (`r_regen`) | 1160, 1360, 1590 | A rainha regenera 3 de vida por segundo por nível. |
| 7 | VENENO DA ACROBATA (`k_acrobata`) | 1880, 2200, 2560 | O borrifo corrosivo da ACROBATA dura +35% e corrói +40% mais forte por nível. |
| 7 | CEIFA DA ARPÃO (`k_arpao`) | 1880, 2200, 2560 | O limiar da CEIFA sobe +10% por nível (de 22% a 52%), mas TODAS as aliadas perdem 5% de vida por nível. |
| 7 | CABEÇA DE CEFALOTE (`k_cefalote`) | 1880, 2200, 2560 | A PORTA-VIVA ganha +8% de redução de dano e +45px de raio de guarda por nível (de 45% a 69%). |
| 7 | FÚRIA DA DINOPONERA (`k_dinoponera`) | 1880, 2200, 2560 | A colosso nasce com +40% de vida por nível, mas cada nível custa +40 de comida extra. |
| 7 | SEDA DA TECELÃ (`k_tecela`) | 1880, 2200, 2560 | A seda rende mais: os bônus de cada TECELÃ valem +25% mais por nível. |
| 7 | RENASCIMENTO (`r_ren`) | 1880 | Uma vez por expedição: a rainha renasce com 75% de vida. |

## Ampliação entregue — sete frutos e miniárvores (2026-09-24)

**Status: implementado e validado no escopo confirmado.** Este registro substitui
as pendências da solicitação inicial e amplia a Fase 3 histórica abaixo.
**Não significa que sete mapas já sejam jogáveis.**

### Decisões e progressão

- O usuário escolheu **efeitos novos globais**, combináveis em todos os mapas,
  e **preparar o sétimo fruto bloqueado**, sem implementar agora o Topo/Pálida.
- Sete frutos na copa da árvore literal, cada qual abre uma miniárvore própria
  com **dez opções novas distintas** (70 no total), não dez níveis do mesmo nó.
- Cada miniárvore tem três caminhos de três habilidades e um ápice que exige os
  três finais. Prévia bloqueada permite ler; compra exige o chefe correto e os
  pré-requisitos. Selecionar nunca compra: confirmação explícita em EVOLUIR.
- Desbloqueio somente pela morte do chefe configurado no mapa da **campanha**.
  O evento verifica mapa, identidade do chefe e modo; persiste uma vez. Vitórias
  antigas dos seis mapas são respeitadas. Sobrevivência não concede esses frutos.
- 49 nós base + 18 legados + 70 novos = **137 definições**. As 18 melhorias
  anteriores permanecem na aba LEGADO, com IDs, preços, compras e regras locais
  preservados; o novo escopo global não converte silenciosamente os bônus antigos.
- Seis frutos obtíveis: 60 novas compras + 18 legadas. O sétimo mostra seus dez
  poderes, mas **não permite comprar**, nem se `clearedMaps.topo` estiver marcado.
  Vencer o Devastador no Pico jamais se faz passar por derrotar a Pálida.

### Implementação e limites

- `fruit_skills.js`: catálogo, IDs estáveis `v_*`, custos, caminhos e descrições.
- `fruit_effects.js`: efeitos em eventos e consumidores reais; `fruitRuntime`
  pertence à expedição, barreiras/recargas/resgates individuais pertencem às irmãs.
  Bônus de mapas diferentes se combinam, sem cópia da IA ou timers fora do jogo.
- `state.js`/`enemies.js`: gate do chefe correto, compra, persistência e aviso
  “FRUTO DESPERTADO!”. `units.js`, `combat.js`, `game.js`: combate, criação,
  coleta, cura, cristais e visão consomem os poderes.
- Explosões secundárias atingem até três vizinhos por evento, com orçamento de
  12 impactos por frame e supressão de recursão. Esses abates não alimentam
  cadeias/ciclos de recompensas. Veneno e fogo usam o sistema de dano contínuo
  existente; Cinzas Férteis declara explicitamente a interação com ambos.
- `tree_layout.js`/`meta.js`: sete entradas, miniárvores com coordenadas locais,
  aba LEGADO, detalhes fixos, retorno por botão/Escape. Cartões, confirmação e
  abas novas têm área mínima de 44 px lógicos. No mobile, a copa abre os frutos;
  os indicadores compactos do cabeçalho não duplicam o toque das entradas.
- Arte e fonte pixel preservadas, descrições com quebra de linhas e fonte grande,
  estados bloqueados/futuros claros, partículas reduzidas respeitadas. Contador
  compacto mostra compras realizadas; totais completos aparecem nas miniárvores.
- Na revisão, corrigidos: velocidade de coleta deve **dividir o intervalo**, não
  multiplicá-lo; dano fracionário não deve subir para um sem redução plana; dano
  contínuo fatal conserva a sinalização para recompensas do evento de morte.

### Verificação desta ampliação

- `npm test`: **23/23** aprovados, incluindo `fruit-powers` (cada um dos 70
  efeitos), `fruit-integration` (coleta/depósito, vida, nascimento, projéteis,
  mortes e seis chefes reais) e `sim-fruit-combos` com os 60 poderes obtíveis.
- `npm run inspect:tree`: PC e mobile, **137 detalhes × duas fontes × duas
  plataformas = 548 inspeções**, sem colisões nem compras acidentais; sete frutos
  abertos por clique/toque real, alternância das abas, retorno/Escape;
  **78 compras por perfil** persistem após reload; Era concedida uma só vez.
- `npm run inspect`: **30 cenas** sem erros JS/HTTP/glifos; seis mapas e interfaces
  nas duas plataformas. Capturas em `/tmp/fumiga-tree` e `/tmp/fumiga-inspect`.
- `HUD_MIN_FPS=55 npm run inspect:hud`, isolado: **58,38 FPS / 1800 frames**.
  Medida diagnóstica em Chromium headless, não promessa de desempenho em todo
  celular e não benchmark exaustivo de todas as combinações compradas.
- Integridade dos seis documentos incorporados verificada byte a byte + SHA-256;
  `git diff --check` sem erros. Alterações anteriores preservadas, sem commit/push.

**Limitações/próximos passos:** Topo/Pálida permanece para a Fase 8; seus dez
consumidores foram testados com fixtures, não com uma campanha inexistente.
Playtest humano e ajuste futuro de balanceamento dos novos poderes continuam
recomendados. A decisão de manter preços/valores legados permanece válida.

### Catálogo das 70 melhorias novas

Todas são globais, de um nível. Custos em essência. Três caminhos: 1→4→7,
2→5→8 e 3→6→9; a habilidade 10 exige 7, 8 e 9. O catálogo abaixo corresponde
às definições em `fruit_skills.js`, sem substituir as 18 melhorias legadas.

#### LIÇÕES DO TAMBORILADOR — planicie

Chefe: **TAMBORILADOR**. Desbloqueio pela vitória neste chefe na campanha.

| # | Melhoria | Custo | Efeito global |
|---|---|---:|---|
| 1 | CORRIDA DO AMANHECER (`v_p1`) | 60 | Nos primeiros 20s da expedição, irmãs se movem 35% mais rápido. |
| 2 | GOTAS PARA A RAINHA (`v_p2`) | 60 | Entregar comida cura 8 de vida da rainha. Intervalo de 1s entre curas. |
| 3 | CADÊNCIA DO TAMBOR (`v_p3`) | 60 | Cada quarto golpe direto da colônia causa 80% de dano extra. |
| 4 | CAPIM ESCUDO (`v_p4`) | 105 | Cada irmã reduz um golpe em 12 de dano. Recarrega após 8s; mínimo 1 de dano. |
| 5 | PRIMEIRA COLHEITA (`v_p5`) | 105 | As três primeiras entregas de comida de cada irmã rendem o dobro. |
| 6 | VENTO NAS MANDÍBULAS (`v_p6`) | 105 | Projéteis aliados viajam 50% mais rápido; alcance de ataque aumenta em 45. |
| 7 | FUGA ENTRE AS FOLHAS (`v_p7`) | 150 | Irmãs abaixo de 35% de vida ganham 60% de velocidade para escapar. |
| 8 | TAMBOR COMPARTILHADO (`v_p8`) | 150 | Golpear um alvo lento espalha 15% do dano a até três vizinhos em 130. Máximo uma vez a cada 0,4s. |
| 9 | CARAVANA DO ORVALHO (`v_p9`) | 150 | Cada expedição começa com três operárias extras e 60 de comida adicional. |
| 10 | NOVO AMANHECER (`v_p10`) | 315 | A cada 20 abates diretos ou por veneno, toda a colônia recupera 8% da vida máxima. |

#### SEDA DA CAÇADORA — floresta

Chefe: **CAÇADORA ASTUTA**. Desbloqueio pela vitória neste chefe na campanha.

| # | Melhoria | Custo | Efeito global |
|---|---|---:|---|
| 1 | TEIA DE CAÇA (`v_f1`) | 75 | Cada terceiro golpe direto aplica 2s de lentidão a inimigos comuns. |
| 2 | EMBOSCADA DE MUSGO (`v_f2`) | 75 | Golpes contra inimigos com vida cheia causam 60% mais dano. |
| 3 | DOSSEL CURATIVO (`v_f3`) | 75 | Matabeles alcançam irmãs 70% mais distantes ao curar. |
| 4 | CASULO DE EMERGÊNCIA (`v_f4`) | 120 | Cada irmã sobrevive uma vez a um golpe fatal, voltando com 25% da vida. Não afeta a rainha. |
| 5 | SEDA RETALIADORA (`v_f5`) | 120 | Ao sofrer um golpe próximo, a irmã atordoa o agressor comum por 0,4s. Recarga individual de 6s. |
| 6 | PÓLEN DE TRIAGEM (`v_f6`) | 120 | Matabeles curam 50% a mais quando o alvo tem menos de 35% de vida. |
| 7 | FOLHAS FERMENTADAS (`v_f7`) | 165 | Cada entrega de comida concede seis unidades extras após os outros multiplicadores. |
| 8 | TECELAGEM EXPEDITA (`v_f8`) | 165 | Tecelãs ganham 80% de velocidade e duas unidades de capacidade de carga. |
| 9 | CHEIRO DA CAÇADORA (`v_f9`) | 165 | Alvos já revelados por um golpe recebem 25% de dano direto adicional. |
| 10 | NINHO VIVO (`v_f10`) | 330 | A cada 12s, irmãs a até 300 da rainha recuperam 8% da vida máxima. |

#### BRUMA DA SOMBRA — pantano

Chefe: **SOMBRA ALADA**. Desbloqueio pela vitória neste chefe na campanha.

| # | Melhoria | Custo | Efeito global |
|---|---|---:|---|
| 1 | MANDÍBULAS SÉPTICAS (`v_s1`) | 90 | Golpes diretos envenenam: seis de dano por segundo durante 3s. Não acumula consigo mesmo. |
| 2 | BANQUETE DA PODRIDÃO (`v_s2`) | 90 | Abater um inimigo envenenado concede quatro de comida. |
| 3 | CONTÁGIO DE BRUMA (`v_s3`) | 90 | Inimigos envenenados mortos espalham o veneno restante a até três vizinhos em 130. |
| 4 | MARÉ PÚTRIDA (`v_s4`) | 135 | Explosões e ataques de área aliados têm raio 40% maior. |
| 5 | WISPS CONDUTORES (`v_s5`) | 135 | Cristais de essência voam ao formigueiro duas vezes mais rápido. |
| 6 | MANTO DO BREJO (`v_s6`) | 135 | Irmãs sofrem 35% menos dano de golpes com origem a mais de 220 de distância. |
| 7 | FERIDA CONTAMINADA (`v_s7`) | 180 | Golpes diretos causam 30% mais dano contra alvos já envenenados. |
| 8 | GRITO ROUBADO (`v_s8`) | 180 | Cada quinto golpe direto enfraquece o alvo por 4s. Inimigos comuns causam 15% menos dano. |
| 9 | BARQUEIRAS DA MEMÓRIA (`v_s9`) | 180 | Cada irmã perdida devolve cinco de essência à reserva da expedição. |
| 10 | CICLO DO LODO (`v_s10`) | 345 | A cada dez abates de envenenados, a rainha recupera 15% da vida máxima. |

#### FÚRIA DA MATRIARCA — deserto

Chefe: **MATRIARCA RIVAL**. Desbloqueio pela vitória neste chefe na campanha.

| # | Melhoria | Custo | Efeito global |
|---|---|---:|---|
| 1 | CALOR CRESCENTE (`v_d1`) | 105 | Golpes em sequência ganham 1% de dano por acerto, até 40%. Esfria após 3s sem acertar. |
| 2 | NINHADA SOLAR (`v_d2`) | 105 | O tempo base de chocagem das irmãs é reduzido em 35%. |
| 3 | CUSPE DE BRASAS (`v_d3`) | 105 | Projéteis aliados incendeiam por 4s, causando oito de dano por segundo. |
| 4 | CASCA CALCINADA (`v_d4`) | 150 | Irmãs abaixo de metade da vida recebem 25% menos dano. |
| 5 | TRABALHO ANTES DO MEIO-DIA (`v_d5`) | 150 | Nos primeiros 30s da expedição, velocidade de coleta dobra. |
| 6 | FÚRIA FAMINTA (`v_d6`) | 150 | Irmãs abaixo de 40% de vida causam 50% mais dano direto. |
| 7 | PROLE DA MATRIARCA (`v_d7`) | 195 | A cada oito irmãs nascidas, nasce uma operária gratuita se houver espaço. Limite de três por expedição. |
| 8 | MIRAGEM DEFENSIVA (`v_d8`) | 195 | Cada terceiro projétil recebido por uma irmã é evitado completamente. |
| 9 | MANDÍBULA DE VIDRO (`v_d9`) | 195 | Chance de crítico das irmãs aumenta em 15 pontos percentuais. |
| 10 | FORNO DO ENXAME (`v_d10`) | 360 | Matar um inimigo em chamas ou envenenado causa 20 de dano a até três vizinhos em 130. Explosões não geram outras explosões. |

#### COROA DO GALHADA — outono

Chefe: **GALHADA REAL**. Desbloqueio pela vitória neste chefe na campanha.

| # | Melhoria | Custo | Efeito global |
|---|---|---:|---|
| 1 | MANTO DE FOLHAS (`v_o1`) | 120 | Cada irmã nasce com uma barreira igual a 20% da vida máxima. Não se regenera. |
| 2 | SEIVA DA VITÓRIA (`v_o2`) | 120 | Abates curam oito de vida da irmã ferida mais próxima do inimigo, em até 300. |
| 3 | PODA DO GALHADA (`v_o3`) | 120 | Golpes contra alvos abaixo de 20% de vida causam o dobro. Contra chefes, o bônus é de 20%. |
| 4 | ÂMBAR DO POMAR (`v_o4`) | 165 | Cada entrega de comida gera uma essência na reserva da expedição. |
| 5 | COLHEITA RESTAURADORA (`v_o5`) | 165 | Entregar comida restaura 8% da vida máxima da própria coletora. |
| 6 | RAÍZES FIRMES (`v_o6`) | 165 | Irmãs a até 240 do formigueiro ignoram lentidão ao se mover. |
| 7 | ÚLTIMA FOLHA (`v_o7`) | 210 | A rainha sobrevive a um golpe fatal com 30% da vida. Uma vez por expedição. |
| 8 | JARDIM DE SEIVA (`v_o8`) | 210 | A rainha regenera três de vida por segundo, somando às outras fontes. |
| 9 | CHAMADO DOURADO (`v_o9`) | 210 | Um rali bem-sucedido cura 25% da vida das irmãs chamadas. Recarga de 15s. |
| 10 | ESTAÇÃO DA ABUNDÂNCIA (`v_o10`) | 375 | A cada 50 abates diretos ou por veneno, recebe 30 de comida e 15 de essência na expedição. |

#### MEMÓRIA DO DEVASTADOR — gelo

Chefe: **DEVASTADOR**. Desbloqueio pela vitória neste chefe na campanha.

| # | Melhoria | Custo | Efeito global |
|---|---|---:|---|
| 1 | MANDÍBULAS DE GEADA (`v_i1`) | 135 | Cada terceiro golpe direto causa 3s de lentidão e 0,35s de atordoamento em inimigos comuns. |
| 2 | FRATURA DO INVERNO (`v_i2`) | 135 | Golpes diretos contra alvos lentos causam 60% mais dano. |
| 3 | QUITINA DE GRANIZO (`v_i3`) | 135 | Irmãs reduzem cada golpe recebido em seis de dano, mantendo dano mínimo de um. |
| 4 | PESO DO DEVASTADOR (`v_i4`) | 180 | Cefalotes têm 40% mais vida, mas se movem 10% mais devagar. |
| 5 | INVERNO LONGO (`v_i5`) | 180 | Dobra a duração da lentidão aplicada pelos novos frutos a inimigos comuns. |
| 6 | AVALANCHE CONCENTRADA (`v_i6`) | 180 | Cada quarto projétil aliado explode em raio 90, atingindo outros alvos com 60% do dano. |
| 7 | CALMA GLACIAL (`v_i7`) | 225 | Irmãs com vida cheia atacam 30% mais rápido enquanto permanecem intactas. |
| 8 | CORAÇÃO SOB O GELO (`v_i8`) | 225 | A rainha começa a expedição com uma barreira de 20% da vida máxima. |
| 9 | CAÇA AO COLOSSO (`v_i9`) | 225 | Golpes diretos causam 25% mais dano contra chefes de qualquer mapa. |
| 10 | SOLO PERENE (`v_i10`) | 390 | A cada 15 abates diretos ou por veneno, atordoa até seis inimigos comuns a até 250 do último alvo por 1s. |

#### CORAÇÃO DA NÉVOA-MÃE — topo

Chefe: **PÁLIDA**. **Prévia futura, compra bloqueada.**

| # | Melhoria | Custo | Efeito global |
|---|---|---:|---|
| 1 | MEMÓRIA HERDADA (`v_a1`) | 150 | Começa cada expedição com 100 de essência na reserva. |
| 2 | RESSONÂNCIA DA ANCIÃ (`v_a2`) | 150 | Cada quinto golpe direto dobra o dano e cura dois de vida da rainha. |
| 3 | LIÇÕES DAS PERDIDAS (`v_a3`) | 150 | Experiência recebida aumenta em 40%. |
| 4 | SEDA ANCESTRAL (`v_a4`) | 195 | Cura das Matabeles e cura natural da rainha aumentam em 35%. |
| 5 | NINHADA ESPECTRAL (`v_a5`) | 195 | As cinco primeiras irmãs de cada expedição recebem barreira de 50% da vida, somada ao Manto de Folhas. |
| 6 | FIOS DO RESGATE (`v_a6`) | 195 | Uma irmã atingida fatalmente retorna com 10% de vida. Recarga compartilhada de 30s; não salva a rainha. |
| 7 | OLHAR DA NÉVOA-MÃE (`v_a7`) | 240 | Alcance de visão de todas as irmãs aumenta em 50%. |
| 8 | FOME DE MEMÓRIAS (`v_a8`) | 240 | Cada unidade de cristal recolhida concede duas essências extras. |
| 9 | COROA DE BRUMA (`v_a9`) | 240 | A rainha recebe 20% menos dano de todos os golpes. |
| 10 | CORAÇÃO DA COLÔNIA ETERNA (`v_a10`) | 405 | Uma vez por expedição, ao cair abaixo de 30% de vida, a rainha restaura 40% da vida máxima de toda a colônia. |

## Estado atualizado — Fase 3: Árvore Genealógica (2026-09-24)

**Fase 3 finalizada no escopo atual, com dependência futura explícita da Fase 8.**
Escolha confirmada: árvore literal (substitui anéis orbitais) e efeitos conforme as
suas descrições, sem reprecificar os frutos. Registro completo e evidências em
[progresso integral](#fonte-progresso-historico).

- 67 nós: tronco Real, galhos Guerra/Coleta/Criação, seis mini-árvores na copa e
  raízes ancestrais; seiva dourada, chime lendário, foco por ramo/fruto e zoom.
- Selecionar apenas inspeciona; EVOLUIR confirma gasto. Custos, requisitos e IDs
  preservados; compras dos 18 frutos persistem após reload, inclusive no mobile.
- Corrigidos bônus globais/consumidores incorretos; efeitos restritos ao bioma.
  A migração recalcula veteranas sem curá-las gratuitamente.
- Névoa Revelada oferece +25% contraste do feromônio; **Pálida no minimapa é futuro**
  (Fase 8), sinalizado no próprio nó. OLFATO disponível por toque no HUD expandido.
- 20 testes headless passaram, 268 detalhes auditados por clique/toque no navegador,
  inspeção geral sem erros e gate de HUD acima de 55 FPS na execução isolada.

A pendência de “retomar a Fase 3” nos registros abaixo é histórica e fica
substituída por este fechamento. Próximo: aprovação visual e auditoria da Fase 4;
não declara concluídas as Fases 4–8 nem autoriza refazer cutscenes.

## Estado atualizado — correções de interface (2026-09-24)

**Fechadas no escopo verificado desta entrega.** Ver o registro de fechamento no
[progresso integral](#fonte-progresso-historico): cartões paginados legíveis em
Memórias/Profecias, seis controles mobile redundantes removidos, acesso ao ninho
preservado pelo canvas e enquadramento sem sobreposição em 16:9 exato.

O código inicial já tinha correções não refletidas no histórico dos 750 achados:
a auditoria inicial passou em 88 estados. Na entrega, auditoria ampliada de 208
estados e revalidação dos 57 estados mobile afetados pelos últimos ajustes passaram;
19 testes headless, navegação por cliques/toques reais e inspeção de 30 cenas também.
Limites e resultados completos estão no registro de progresso; não equivale a uma
campanha completa nem a teste em aparelho físico.

**Continuidade recomendada:** Fase 3, conferindo compra, desbloqueio e persistência
dos frutos contra o código. O plano abaixo permanece como histórico anterior a este
fechamento. Cutscenes e demais fases não foram ampliadas.

## Direção de continuidade e nova regra — 2026-09-24

**Pedido:** indicar os próximos passos segundo este documento e sempre atualizá-lo
conforme o jogo for implementado ou atualizado. Regra formalizada como **Regra 12**
em `REGRAS_DE_TRABALHO.md` e lembrada em `AGENTS.md`.

**Próximo passo imediato:** continuar a auditoria de layout de 2026-09-24. A entrega
anterior criou as ferramentas, não concluiu as correções. Os 750 achados em 86 estados
incluem falsos positivos; não equivalem a 750 bugs confirmados.

Ordem recomendada, sujeita às decisões de implementação do usuário:

1. Afinar o analisador (sombras do título e nós fora da vista), pesquisar referências
   e confirmar as decisões de UI antes de implementar.
2. Corrigir tela a tela: MEMÓRIAS, PROFECIAS, MODO, ÁRVORE/dicas, AJUDA e fim de
   expedição; resolver sobreposições dos controles mobile e dicas de teclado no toque.
   Validar fonte normal/grande, PC/mobile, com `npm run inspect:layout` e inspeção visual.
3. Retomar a Fase 3: compra, desbloqueio e persistência dos frutos por mapa e polimento
   da árvore genealógica. Conferir o código antes de tratar pendências históricas como atuais.
4. Retomar a Fase 5 quando autorizado: há registro de 13 camadas pendentes da Noite
   Branca (5 do painel 2 e 8 do painel 3). A decisão posterior de 2026-09-23 foi manter
   as cutscenes intactas naquela entrega; não iniciar geração sem confirmar a retomada.
5. Completar/verificar áudio ambiente por bioma (Fase 6), chefes e Eras já registrados
   como implementados; não confundir esses registros com nova validação.
6. Fase 8: protótipo da Pálida, revisão das profecias e telas finais, polimento e
   validação completa da campanha em PC/mobile.

**Critério por entrega:** registrar mudanças, decisões, testes/resultados, limitações
 e pendências neste arquivo. Preservar o histórico e distinguir planejado, implementado
 e verificado. Não reutilizar percentuais antigos como medição atual.

**Escopo desta entrega:** documentação apenas; nenhuma alteração de gameplay, arte
ou layout. Verificação documental: `node game/test/docs.mjs` (blocos e hashes).
A auditoria de layout e os testes de gameplay não foram reexecutados nesta consulta.

## Registro técnico — Regra 10 na prática: exibir arte no viewer (lição de sessão, 2026-09-22)

Esta seção é nova e não modifica os seis textos originais. Ela operacionaliza a
**Regra 10 — Sempre mostrar a arte gerada** após uma sessão em que a arte foi
inspecionada pelo agente mas nunca aberta para o usuário (violação confirmada da
regra). Para que nenhum chat repita o erro:

1. **`read_file` em imagem NÃO é exibição.** A imagem chega apenas ao agente.
   Exibição de verdade = abrir a imagem no viewer do usuário (`present_file`).
2. **Toda arte gerada, recriada ou ajustada deve ser aberta no viewer antes de a
   entrega ser declarada pronta**, nas vistas que fizerem sentido:
   - tamanho de uso (o PNG final, como é blitado no jogo);
   - ampliada (crop 2–3× nearest da região crítica, para aprovar detalhes);
   - mock em contexto (composição sobre as demais camadas nos retângulos exatos
     de `drawImage`, como o jogo monta a tela).
3. **Citar o arquivo por nome não é mostrar.** A convenção de “apresentar o
   deliverable principal e mencionar os demais por nome” não substitui a
   Regra 10: abra CADA imagem criada no turno no viewer do usuário.
4. **Candidatos de `generate_image` com `offer_options` contam como mostrados**
   (o usuário vota neles), mas o artefato final processado depois da escolha
   precisa ser exibido de novo — Regra 10: “Se a arte for refeita ou ajustada,
   mostrar a nova versão também”.
5. **Checklist pré-entrega:** para cada imagem criada ou alterada no turno,
   existe um `present_file` correspondente? Se não existe, a entrega não está
   pronta e o check-in (Regra 3) deve apontar o item como pendente.

Precedente da sessão: camada 2 do parallax do TITLE recriada sem artefatos de
chroma-key; vistas entregues no viewer em tamanho de uso
(`game/assets/parallax/menu/layer2_main_grass_ruins_anthill.png`), ampliada
(crop do céu) e em contexto (mock composto das 4 camadas nos retângulos de
`drawTitleBg()`).

## Registro técnico desta entrega — inicialização

Esta seção é nova e não modifica os seis textos originais.

- Removida a declaração duplicada de `gameHelpReturn` em `game/js/game.js`,
  que impedia a importação do módulo e a inicialização do jogo.
- Corrigido o tratamento de falhas de fontes/sprites em `game/js/main.js`:
  não prosseguir com recursos obrigatórios ausentes; exibir erro e orientação
  para recarregar usando fonte nativa, mesmo se o atlas de texto falhar.
- A introdução da expedição agora abre no fluxo da própria partida, sem
  `setTimeout` solto. Legendas e instruções ficam dentro do canvas; ENTER,
  espaço e clique permitem avançar, e ESC permite pular para o gameplay.
- A introdução registra a memória no save. O carregamento usa apenas as camadas
  existentes; as pendentes continuam com fallback procedural. Uma resposta
  tardia de imagem não pode sobrescrever o painel seguinte. As camadas carregadas
  são preparadas uma vez em 320×180, em vez de redimensionar os PNGs-fonte a cada frame.
- Ajustados os contadores e a dica H no HUD inicial para evitar sobreposição
  e texto fora da tela.
- Acrescentado `game/test/boot.mjs`, cobrindo a sintaxe ESM dos 27 módulos,
  boot normal, save inválido e falhas de fonte/sprite. Os testes de interface,
  layout e sobrevivência agora percorrem ou pulam explicitamente a introdução.
- Inspeção no navegador: menu → campanha → introdução → partida; chocagem,
  entrada/saída do formigueiro e primeira onda, sem exceções JavaScript ou 404
  nesse percurso. Isso não equivale a validar toda a mega atualização.

**Fora do escopo desta entrega:** completar a arte das cutscenes, corrigir a
transparência dos PNGs-fonte, implementar compras dos frutos, concluir os VFX,
transformações visuais das Eras, biblioteca completa ou o chefe Pálida.
Os 11 arquivos de arte existentes da Noite Branca continuam sendo 11 de 24;
o fallback não deve ser contado como arte finalizada.

## Registro técnico — kit de UI de madeira viva por bioma (Fase 2, continuação, 2026-09-22)

Esta seção é nova e não modifica os seis textos originais.

**Branch:** arena/01a0ca3a-fumiga-goat. **Pedido:** caixas de texto no estilo do
kit de tábuas de madeira da referência (plank UI), personalizadas pelo MEGA
ARQUIVO e pela mudança de mapa. **Decisões confirmadas (Regra 1):** madeira
viva por bioma · kit completo (caixas + banners-seta + barras + check/cross).

**Entregas:**

- `lore_textbox.png` virou tábua viva: veios, bisel luz/sombra, nó de cera,
  sulco de placa, cantos chunky com motif do bioma; 7 madeiras (fresca,
  musgosa, úmida, calcinada, dourada, gelada, colônia).
- `lore_kit.png` novo (280×52, ~3 KiB): 7 tábuas-seta de banner 40×24,
  7 molduras de barra 32×12 com centro transparente e ícones check/cross/gema/
  botão âmbar.
- `lore_hud.js`: layouts 9-slice configuráveis (`L_BOX`, `L_BANNER`, `L_BAR`),
  `drawWoodBanner` (com placa gravada de legibilidade), `drawWoodBarFrame`,
  `drawKitIcon`.
- `ui.js`: `bar()` ganha moldura de madeira do bioma (fallback procedural).
- `game.js`: banner de onda/mapa vira tábua-seta do bioma; toggles de
  acessibilidade/vídeo, profecias e memórias usam check/cross de madeira;
  gemas ladeiam "MUTAÇÃO DISPONÍVEL"; botão âmbar no painel acessível.
- `tools/make_lore_hud.py` e `game/assets/ui/README.md` atualizados.

**Inspirações (Regra 2):** kits cozy de madeira tipo Stardew Valley
(Pixelwood Valley, Rustic Wood UI) e tábuas pixel art de itch.io/Pinterest.

**Verificação (Regras 3/4):** bateria headless completa passou; QA visual do
9-slice composto de banners (600×84) e barras com fill; `lore_kit.png` servido
200 no preview. **Limitação já declarada:** sem navegador no sandbox — a
inspeção jogando fica no preview ao vivo (porta 8000).

## Registro técnico — rework de HUD Fase 2: slice boxes e caixas de texto (2026-09-22)

Esta seção é nova e não modifica os seis textos originais.

**Branch:** arena/01a0ca3a-fumiga-goat. **Pedido:** rework da Fase 2 do HUD —
slice boxes e caixas de texto com spritesheets próprias, segundo o MEGA
ARQUIVO (HUD orgânico por bioma, P1/P22), incluindo a mudança de estilo ao
progredir de mapa. **Decisões confirmadas (Regra 1):** caixas em todas as
telas (RUN + diálogos + tooltips + menus) · arte pelo gerador procedural rico ·
transição "muda de quitina" com dissolve + banner.

**Entregas:**

- `tools/make_lore_hud.py` evoluído: `lore_panels.png` com quitina dupla,
  motif do bioma nos 4 cantos (trevo/cogumelo/alga/semente/folha/líquen —
  zona fixa do 9-slice), costuras de seda e nós de cera; novo
  `lore_textbox.png` (224×32) com 7 temas de caixa de texto (6 biomas +
  colônia para menus). ~2 KiB cada (Regra 5), nada humanoide (Regra 8).
- `game/js/lore_hud.js`: loader inclui `textbox`; `tileOf`/`blitMolt`
  (dissolve 0,6 s + fio de luz na troca de bioma, cache de tiles, sem alocação
  por frame); `drawLoreTextbox` exportado; `hudBiome()` (mapa atual ou
  colônia).
- `game/js/ui.js`: `dialogBox`/`tooltip` desenham a caixa orgânica do bioma,
  com fallback procedural quando a arte não está carregada (testes headless).
- `game/js/game.js`: banner de migração anuncia "O VASO MUDA: <nome lore>".
- `game/assets/ui/README.md` atualizado.

**Inspirações (Regra 2):** Dead Cells/Hollow Knight/Hyper Light Drifter (UI
limpa com paleta casada) e kits 9-slice temáticos (Nuhemu 6 temas, OpenGameArt
750 assets).

**Verificação (Regras 3/4):** bateria headless completa passou (`boot`,
`docs`, `assets`, `tree`, `stuck`, `layout`, `uitest`, `attack`, `prophecy`,
`endless`, `sim` FORCE=6); QA visual do 9-slice composto (cantos íntegros,
faixas esticadas) e dos atlas ampliados; `lore_textbox.png` servido 200 no
preview. **Limitação já declarada:** sem binário de navegador no sandbox, a
inspeção em jogo fica no preview ao vivo (porta 8000).

## Registro técnico — rework de arte dos inimigos, Fase 2 (2026-09-22)

Esta seção é nova e não modifica os seis textos originais.

**Branch:** arena/01a0ca3a-fumiga-goat. **Pedido:** rework dos inimigos com novos
sprites segundo a Fase 2 da mega atualização (Filhos da Névoa pálidos), sem que a
horda fosse apenas formigas. **Decisões confirmadas pelo usuário (Regra 1):**
fauna real corrompida variada · paleta pálida da Névoa · arte + nomes lore.

**Novos seres (arte-fonte em `inimigos/`, sprites finais em
`game/assets/sprites/ants/e_*.png` via `tools/prepare_assets.sh`):**

| Tipo | Antes | Agora | Nome lore |
|------|-------|-------|-----------|
| runner | formiga | larva de besouro | LARVA RASTEJANTE |
| swarm | formiga | saúva corrompida | SAÚVA CORROMPIDA |
| reaper | formiga | louva-a-deus | CEIFADORA PÁLIDA |
| espitter | formiga | besouro bombardeiro | BESOURO-PRAGA |
| warrior | formiga | vespa | VESPA CARRASCA |
| sentinel | formiga | caranguejo blindado | SENTINELA DE CONCHA |
| matron | formiga | aranha de ninhada | MATRONA PÁLIDA |

Paleta harmônica (Regra 6): corpo osso `#e8f4ff`, sombra `#c9bce8`, veias
violeta `#c77dff`, pontos âmbar `#ffd479`, contorno `#08060f` — casa com o véu
pálido/olhos de névoa que o `render.js` (Fase 2) já aplica por cima. Nada
humanoide (Regra 8). Chaves, stats, `bodyR` e mecânicas (matrona ainda choca
larvas) intactos — só arte e nomes mudaram.

**Inspirações (Regra 2):** Hollow Knight e Rain World (fauna corrompida com
silhueta legível), Vampire Survivors (leitura de horda) e packs top-down de
insetos do itch.io.

**Verificação (Regras 3/4):** bateria headless completa (`boot`, `docs`,
`assets`, `tree`, `stuck`, `layout`, `uitest`, `attack`, `prophecy`, `endless`,
`sim` FORCE=3/6) — tudo passou; spawn dos 7 tipos + tique + spawn de adds da
matrona exercitados pelo código real; decode pixel a pixel dos 7 PNGs (fundo
100% transparente, cobertura 24–64%, paleta pálida/violeta/âmbar presente);
assets servidos 200 com 1,2–4,4 KB cada. **Limitação declarada:** o sandbox não
tem binário de navegador (download do Chromium bloqueado pelo proxy), então a
inspeção visual em jogo fica por conta do preview ao vivo na porta 8000.

**Correção de consistência encontrada:** `game/test/docs.mjs` falhava ANTES
deste rework porque o bloco de `PROGRESSO_MEGA_ATUALIZACAO.md` embutido neste
MEGA_ARQUIVO (e a linha de tamanho/hash do rodapé de integridade) estava
desatualizado em relação ao arquivo avulso. O bloco e o rodapé foram
ressincronizados byte a byte; os seis originais seguem intactos.

## Registro técnico — fechamento da Fase 1 Lore-Total (2026-09-22)

**Status: implementação da Fase 1 concluída e verificada no escopo abaixo.**
Este registro substitui as pendências técnicas do registro de início imediatamente
abaixo, que permanece como histórico. Não declara concluídas as Fases 2–8.
Branch: `arena/01a0c98b-fumiga-goat`.

### Checklist de fechamento

| Item da Fase 1 | Resultado | Implementação |
| --- | --- | --- |
| Seis HUDs orgânicos: cor, textura, nome e respiração | ✅ | `lore_hud.js`, `game.js`, `config.js` |
| Arte híbrida pixel art: seis 9-slices + spritesheets | ✅ | `game/assets/ui/`, pipeline `tools/make_lore_hud.py` |
| Gaster com coroa fungo/seda, vida recortada, veias vermelhas pulsantes abaixo de 30% | ✅ | `drawGasterBar` |
| Trevo, cogumelo, alga, semente, folha de outono e líquen | ✅ | `drawFoodIcon` e atlas de ícones |
| Cristais âmbar/violeta e partículas de memória | ✅ | `drawEssenceCrystal` |
| Trilha de onda com formigas animadas | ✅ | `drawTrailAnt`, HUD de ondas |
| XP como anéis de crescimento da Árvore | ✅ | `drawTreeRings`, agora com três anéis irregulares e seiva de progresso |
| Minimapa sensorial, não apenas imagem do terreno | ✅ | `drawScentMinimap`: campos reais da IA sob máscara de exploração |
| Segurar/soltar H, verde comida, vermelho perigo, legenda lore | ✅ | `drawPheromoneOverlay`, `drawPheromoneLegend` |
| Fonte grande, alto contraste e partículas reduzidas | ✅ | seis biomas auditados; rótulos com largura limitada |
| Desempenho e preview | ✅ no ambiente medido | 59,47 FPS médios em 1.800 frames com H ativo; servidor em `0.0.0.0:8001` |

### Correções finais

- HUD expandido tinha dois textos na mesma linha. O teste antigo clicava em
  x=293, fora do botão + em x=304..322: corrigido para realmente abrir o painel.
- Mais espaço entre nome, coroa, vida e recursos. Textos principais usam escala
  nativa da fonte bitmap para não perder traços ao reduzir. `maxWidth` limita
  rótulos após a ampliação de acessibilidade, evitando invasão do campo vizinho.
- Anéis de XP agora têm aparência de crescimento de madeira, com progresso âmbar.
- Minimapa mostra comida/perigo reais, preserva marcadores, interação e fog of war;
  o título agora fica dentro do painel, não no limite superior do canvas.
- Névoa H preparada em meia resolução a 30 Hz e composta no loop normal. Pan,
  zoom e shake invalidam imediatamente; não altera campos de IA, dano ou saves.
- Minimapa sensorial usa uma grade 50×38 a 10 Hz em canvas reutilizado. Mudança de
  mundo invalida o cache. Sem dependência nova, arquivo de imagem extra ou cache
  ilimitado. Atlas existentes regenerados pelo pipeline sem diferenças binárias.
- Botão Invocar ganhou rótulo curto e variante compacta de 44px em viewport
  mobile, evitando o crescimento automático para cima do painel de ondas.

### Evidências e limites da verificação

Passaram `boot.mjs`, `assets.mjs`, `lorehud.mjs`, `layout.mjs`, `uitest.mjs`,
`sim.mjs`, `attack.mjs`, `endless.mjs`, `stuck.mjs`, `tree.mjs`, `prophecy.mjs`
e `docs.mjs`. O teste de layout inclui os seis biomas com fonte ampliada e H.

Chromium real: menu → campanha → introdução → partida, troca controlada entre
seis biomas, vida baixa, H pressionado/solto/perda de foco, zoom, HUD expandido,
fonte grande/alto contraste/partículas reduzidas, viewports 844×390 e 390×844,
entrada/saída do formigueiro e início de onda. Sem exceções JS ou respostas HTTP
com erro nesse percurso. Capturas e relatório JSON ficam fora do Git.

Na última execução de 1.800 frames (cerca de 30s) com H ligado: **59,47 FPS médios,
33,4ms no frame mais lento**. A meta de média acima de 55 FPS passou neste ambiente;
isso não promete ausência de frames lentos nem desempenho idêntico em todo celular.
Os testes mobile verificam viewport/layout, não um aparelho físico nem toda a
usabilidade touch. A inspeção dos seis biomas usa seleção controlada, não uma
campanha inteira. A aprovação estética final cabe ao usuário no preview.

Reprodução: `node game/test/lorehud-browser.mjs` com Playwright no ambiente de
inspeção e servidor ativo. `BASE_URL`, `CHROMIUM_PATH`, `HUD_SHOTS` e
`HUD_PERF_FRAMES` são configuráveis (1.800 frames por padrão). Pillow é necessário
apenas para regenerar arte, não para executar o jogo.

---

## Registro técnico — início da Fase 1 Lore-Total (2026-09-22)

**Branch:** `arena/01a0c98b-fumiga-goat`. **Direção confirmada nesta sessão:**
híbrido, com sliceboxes 9-slice e spritesheet. Este registro novo não altera os
blocos históricos nem declara a Fase 1 inteira como 100% concluída.

### Implementado e integrado

- Três atlas originais em `game/assets/ui/` (menos de 4 KiB juntos): seis
  molduras 9-slice, seis alimentos distintos, cristais âmbar/violeta, quatro
  passos de formiga e três estados do gaster (vazio, âmbar, ferido).
- Pipeline reproduzível `tools/make_lore_hud.py`: master 4×, grade pixel art,
  exportação nearest, transparência real, paleta baseada no sprite da rainha.
  Fontes 4× podem ser exportadas fora do jogo via `--master`. Pillow é apenas
  ferramenta de arte, não dependência do jogo.
- `lore_hud.js`: painéis cacheados por bioma/tamanho (limite de 96), cantos
  preservados, quitina/cera determinística e respiração discreta. Gaster da
  rainha com coroa de fungo/seda, recorte de vida e veias vermelhas abaixo de 30%.
- `game.js`: comida e cristal agora realmente desenhados; trilha com formigas
  animadas abaixo do texto; separação entre painel da colônia e das ondas;
  texto de vida baixa sem sobreposição e nomes de bioma com maior contraste.
- Visão H usa os campos reais de comida/perigo e considera zoom e shake.
  Névoa pré-rasterizada, sem criar gradientes por célula a cada frame. Legenda
  bitmap dentro do painel e acima da loja; não disputa espaço com a dica inicial.
- Carregamento dos atlas no boot, com erro visível se algum falhar. Efeitos
  decorativos reduzidos pela opção de partículas reduzidas. Sem alterar dano,
  custos, progressão, saves ou iniciar a Fase 2.

### Verificação desta entrega

- Passaram: `boot.mjs` (incluindo nova falha de atlas HUD), `lorehud.mjs`,
  `uitest.mjs`, `assets.mjs`, `layout.mjs`, `sim.mjs`, `attack.mjs`, `endless.mjs`,
  `stuck.mjs`, `tree.mjs`, `prophecy.mjs` e `docs.mjs`.
- Chromium real: menu → campanha → introdução → partida; seis biomas por
  seleção controlada no teste, vida a 20%, campos de comida/perigo, H com zoom,
  entrada/saída do formigueiro e início de onda. Sem exceções JS ou HTTP 404
  nesse percurso. Isto não é uma campanha completa jogada até o fim.
- Teste reproduzível opcional `game/test/lorehud-browser.mjs`, requer Playwright
  no ambiente de inspeção e servidor em :8000. Aceita `CHROMIUM_PATH`, `BASE_URL`
  e `HUD_SHOTS`; capturas ficam fora do repositório. Sem dependência nova no jogo.
- Com H ligado, duas amostras headless de 90 frames mediram **54,5 e 58,1 FPS**.
  A meta de manter pelo menos 55 FPS ainda precisa de validação sustentada no
  navegador/hardware do jogador; não é declarada garantida.

### Pendências para fechar a fase

- Aprovação visual do usuário e verificação prolongada de desempenho, inclusive
  mobile e acessibilidade com fonte grande.
- Anel de XP e minimapa existentes foram preservados; polimento adicional da
  linguagem de anéis de árvore/trilhas permanece para a continuação da Fase 1.
- As Fases 2–8 não foram ampliadas nesta entrega.

**Referência pesquisada:** legibilidade do HUD e redução de partículas em
*Dead Cells*: [2](https://www.gamedeveloper.com/design/dead-cells-devs-drop-surprise-accessibility-update).
A referência orienta leitura e efeitos, não é fonte dos sprites.

## Fechamento verificado — Fase 1 Lore-Total (2026-09-22)

**Status:** implementação da Fundação Lore concluída e validada neste checkout.
**Branch:** `arena/01a0c98b-fumiga-goat`. Não inicia nem declara concluída a Fase 2.
Este registro é novo; os seis documentos históricos abaixo permanecem intactos.

| Critério | Resultado / implementação |
|---|---|
| HUD dos seis biomas | Validado: molduras 9-slice, textura quitina/cera cacheada, cores e nomes em `lore_hud.js`, `game.js` e `config.js`. |
| Vida da Silenciosa | Gaster em atlas, coroa de fungo/seda, alerta abaixo de 30%, veias vermelhas e pulsação do sprite inteiro; efeitos reduzidos desativam o movimento. |
| Comida | Seis ícones próprios: trevo, cogumelo, alga, semente, folha de outono e líquen. |
| Essência | Cristais geométricos âmbar/violeta e partículas ascendentes; redução de partículas respeitada. |
| XP e onda | Anéis da Árvore e trilha de formigas animadas; efeitos reduzidos também param o deslocamento. Contador de onda separado da trilha para melhorar a leitura. |
| Feromônio | Segurar H mostra campos reais verdes/vermelhos; soltar H ou perder foco desativa. Legenda visível, zoom/shake compensados, minimapa sensorial. Dica H com contraste reforçado. |
| Arte | `game/assets/ui/lore_{panels,icons,gaster}.png`: três atlas originais, master 4×, exportação nearest; pipeline e recortes documentados em `game/assets/ui/README.md`. |
| Regressão | Passaram `boot`, `docs`, `assets`, `sim`, `uitest`, `layout`, `tree`, `stuck`, `attack`, `endless`, `prophecy` e `lorehud`. |
| Navegador | `lorehud-browser.mjs`: seis biomas, vida baixa, H/blur, zoom, acessibilidade, viewports retrato/paisagem, formigueiro e início de onda; nenhum erro JS/HTTP observado. |
| Desempenho | Gate de **55 FPS médios** passou: **59,05 FPS**, 1.800 quadros com H ativo, maior intervalo 50 ms. Medição headless local, não garantia de mínimo instantâneo ou de desempenho em todos os dispositivos. |

A troca de biomas na inspeção é controlada pelo teste; não representa uma campanha
completa vencida. O teste de viewport mobile verifica a apresentação, não equivale
a teste em aparelho físico. Capturas e relatórios ficam fora do Git. Preview servido
em `0.0.0.0:8000`, rota `/game/`.

Para reproduzir a inspeção (Playwright/Chromium somente no ambiente de teste):

```bash
HUD_MIN_FPS=55 node game/test/lorehud-browser.mjs
# Opcional: BASE_URL, CHROMIUM_PATH, HUD_SHOTS e HUD_PERF_FRAMES.
```

## Índice dos conteúdos integrais

1. [Regras de trabalho](#fonte-regras-de-trabalho) — `REGRAS_DE_TRABALHO.md`
2. [Lore canônica — A Travessia da Colônia Eterna](#fonte-lore-canonica) — `LORE.md`
3. [Mega Atualização Lore-Total — visão, escolhas e oito fases](#fonte-mega-atualizacao-lore-total) — `DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md`
4. [Decisões consolidadas da mega atualização](#fonte-decisoes-da-mega-atualizacao) — `DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md`
5. [Registro histórico de progresso da mega atualização](#fonte-progresso-historico) — `PROGRESSO_MEGA_ATUALIZACAO.md`
6. [Histórico de implementação do menu e da Planície Viva](#fonte-historico-menu-planicie) — `DOCUMENTO_FASES_IMPLEMENTACAO.md`

7. [Registro de integridade](#registro-de-integridade)

---

<a id="fonte-regras-de-trabalho"></a>

## Conteúdo integral 1 — Regras de trabalho

**Arquivo de origem:** [REGRAS_DE_TRABALHO.md](REGRAS_DE_TRABALHO.md)

<!-- INICIO ORIGINAL: REGRAS_DE_TRABALHO.md -->
# 📜 Regras de Trabalho — Desenvolvimento do FUMIGA

Este documento define as **regras obrigatórias** que o assistente de desenvolvimento (Arena.ai Agent Mode)
deve seguir em **todas** as interações e alterações feitas no jogo **FUMIGA — Colônia Eterna**.

---

## Regra 1 — Perguntar antes de implementar 🎯

> **Sempre fazer perguntas com opções de respostas para saber como o usuário quer que as novas alterações sejam implementadas.**

- A **pesquisa da Regra 2 acontece ANTES** destas perguntas: perguntar já citando as inspirações.
- Antes de escrever qualquer código, apresentar **perguntas objetivas com opções claras** (ex.: A, B, C),
  permitindo também resposta personalizada.
- As opções devem descrever **o impacto de cada escolha** (visual, gameplay, desempenho, complexidade).
- Só iniciar a implementação após a confirmação da direção desejada.
- Perguntar sobre: estilo visual, balanceamento, escopo da feature, onde ela aparece no jogo, etc.

**Exemplo de formato:**

```
Como você quer que o novo chefão do Bioma 4 se comporte?
A) Chefão de arena fixa, com invocações de lacaios (estilo boss clássico)
B) Chefão que persegue o jogador pelo mapa (estilo perseguição tensa)
C) Chefão em fases, mudando de padrão a cada 25% de vida
D) Outro: (descreva)
```

---

## Regra 2 — Pesquisar inspirações em jogos indies 🎮

> **Sempre pesquisar na Web buscando inspirações em jogos indies para as alterações que forem pedidas.**

- Esta é a **primeira etapa** do fluxo: pesquisar **antes mesmo das perguntas** da Regra 1.
- Para cada mudança solicitada, realizar **pesquisa na Web** buscando referências de **jogos indies**
  reconhecidos (ex.: *Dead Cells*, *Hollow Knight*, *Vampire Survivors*, *Slay the Spire*, *Stardew Valley*, etc.).
- Registrar no retorno ao usuário **quais jogos serviram de inspiração** e **o que foi aproveitado** de cada um
  (mecânica, feel, UI, balanceamento, feedback visual).
- A inspiração deve ser adaptada à identidade do FUMIGA: pixel art, colônia de formigas, roguelite de biomas.
- As fontes pesquisadas devem ser citadas (links) para o usuário conferir.

---

## Regra 3 — Check-in de verificação ✅

> **Sempre fazer um check-in para conferir se tudo que foi pedido foi realmente implementado no jogo.**

Ao final de cada tarefa, apresentar um **checklist de conferência** com este formato:

```markdown
### ✔️ Check-in de Implementação
| # | Item pedido | Status | Onde foi implementado |
|---|-------------|--------|-----------------------|
| 1 | Nova mutação X | ✅ | `game/js/mutations.js` |
| 2 | Animação de ataque | ✅ | `game/js/player.js` |
| 3 | Ajuste de dano | ⚠️ Parcial | Pendente balanceamento |
```

- Nenhum item pedido pode ficar sem resposta no checklist.
- Itens pendentes ou parciais devem ser **explicitamente sinalizados** com o motivo.
- Rodar os **testes headless** do jogo sempre que existirem mudanças de lógica.

---

## Regra 4 — Jogar e inspecionar o jogo após qualquer alteração 🐛

> **Qualquer alteração: acessar o jogo e jogá-lo, inspecionando buscando bugs, erros estruturais ou imperfeições.**

- Após cada mudança, **subir o jogo localmente** e acessá-lo como um jogador:
  - verificar **console do navegador** (erros de JavaScript, assets 404, warnings);
  - testar o **fluxo afetado pela mudança** de ponta a ponta (ex.: se mexeu no draft de mutações, jogar até um draft);
  - observar **bugs visuais**, quebras de layout, sprites faltando, textos errados;
  - atenção a **erros estruturais** (módulos quebrados, imports errados, estados inválidos).
- Reportar ao usuário: **o que foi testado, o que funcionou e o que foi encontrado/corrigido**.
- Nenhuma alteração é considerada pronta sem essa rodada de inspeção em jogo.

---

## Regra 5 — Manter o jogo otimizado ⚡

> **Sempre manter o jogo o mais otimizado possível, evitando a criação de arquivos desnecessários ou cache que possam comprometer o desempenho.**

- **Não criar arquivos desnecessários**: preferir editar arquivos existentes a duplicar versões
  (nada de `player_v2.js`, `backup_*.js`, `teste123.png`).
- **Não adicionar dependências** sem necessidade real — o projeto é JavaScript puro, sem build (Canvas 2D + módulos ES).
- **Sem cache/lixo no repositório**: respeitar o `.gitignore`; não versionar caches, temporários ou artefatos pesados.
- **Código eficiente**:
  - evitar alocações dentro do loop de renderização (objetos reutilizados/object pooling quando fizer sentido);
  - cuidado com loops aninhados por frame e com `drawImage` excessivo fora da tela (culling);
  - sprites e imagens otimizadas em tamanho/peso antes de entrar no jogo.
- **Limpeza**: ao refatorar, remover código morto, comentários obsoletos e assets órfãos.
- O desempenho é parte da entrega: o jogo deve rodar liso a 60 FPS sempre que possível.

---

## Regra 6 — Imagens em alta resolução, sempre pixel art harmônico 🎨

> **Sempre criar imagens de alta resolução, mantendo o estilo pixel art, e que mantenham o mesmo estilo artístico de maneira harmoniosa.**

- Toda imagem criada para o jogo (sprites, ícones, cenários, UI, capas) deve ser gerada em
  **alta resolução** e depois adequada ao tamanho de uso — nunca arte borrada ou subdimensionada.
- **Estilo obrigatório: pixel art**, sempre em harmonia com a identidade visual já existente do
  FUMIGA (paleta escura violeta/âmbar, contorno limpo, leitura clara em tamanho pequeno).
- Antes de gerar, observar os sprites/atlas existentes (`game/assets/`) para **combinar paleta,
  escala de pixel, sombreamento e silhueta** — a arte nova não pode parecer "colada de fora".
- **Sempre mostrar 2 ou mais opções da mesma imagem para o usuário escolher** (ex.:
  `offer_options` do `generate_image`): nenhuma arte entra no jogo por decisão só do agente —
  o usuário aprova comparando alternativas lado a lado. Vale para geração nova, recriação
  ("recrie 100%") e edição de arte existente; a escolhida ainda passa pela Regra 10.
- Imagens entram otimizadas (Regra 5): tamanho certo para o uso, sem peso desnecessário.

---

## Regra 7 — Abrir o preview após qualquer pedido ou alteração 🖥️

> **Sempre abrir o preview depois de qualquer pedido ou alteração.**

- Ao final de **toda** tarefa — feature, correção, arte ou refatoração — o jogo deve estar
  **rodando no preview ao vivo** (servidor local do repositório) para o usuário jogar na hora.
- Se o servidor já estiver no ar, confirmar que continua saudável e servindo o código atualizado;
  se não estiver, subi-lo.
- O preview é parte do check-in: ele acontece depois das verificações (Regras 3 e 4), nunca no lugar delas.

---

## Regra 8 — Design não-humanóide obrigatório 🐜

> **Nada no design dos personagens do jogo deve remeter a humanos, ou humanóides. A única exceção será quando o usuário pedir explicitamente.**

- Todos os personagens jogáveis (formigas), inimigos, bosses e NPCs visuais devem ser **estritamente baseados em fauna real, insetos, aracnídeos, ou criaturas míticas não-humanóides** — nunca silhueta humana, rosto humano, mãos, roupas humanóides.
- Exceções apenas com pedido explícito do usuário (ex.: “crie um NPC humanoide para a cutscene X”).
- Mesmo quando a lore fala de “rainha” ou “matriarca”, a representação deve ser **formiga-rainha gigante**, não mulher-inseto. A PÁLIDA é uma marionete de névoa em forma de rainha-formiga, não humanoide.
- Validação: antes de gerar qualquer asset de personagem, checar se há traços humanóides (olhos frontais humanos, boca humana, postura bípede humana). Se houver, refazer.
- Inspirações válidas: *Hollow Knight*, *Rain World* [2](https://www.reddit.com/r/gamingsuggestions/comments/1ivfjbo/games_where_you_play_a_nonhumanoid_like_stray_or/), *Webbed* (aranha), *Shelter* (texugo), *Stray* mas com insetos — todos com protagonismo não-humano sem humanização.

## Regra 9 — Adaptar toda mudança para a versão mobile 📱

> **Toda alteração no jogo precisa chegar adaptada à versão mobile (`game/mobile/`). O que já é automático não se duplica; o que não é automático se adapta na camada de toque (`touch.js`).**

- **Regra de ouro: nunca duplicar jogabilidade** dentro de `game/mobile/`. As duas versões (PC e mobile) importam os **mesmos módulos** (`game/js/`), então balanceamento, unidades, inimigos, ondas, chefes, mutações, árvore, telas desenhadas em canvas e arte caem nas duas automaticamente — uma atualização de conteúdo ou gameplay vale para as duas ao mesmo tempo, nas alterações em conjunto.
- **O único lugar em que é preciso lembrar do mobile é a entrada de dados.** A camada `game/mobile/touch.js` é o único arquivo que não se atualiza sozinho nesses casos:
  - **Novo atalho de teclado / mecânica nova de input** → mapear um gesto equivalente ou adicionar um botão virtual correspondente no HUD da expedição (array de botões em `touch.js`). Se a ação ficar só no teclado/mouse, ela deixa de existir no celular.
  - **Tela nova com zoom/pan customizado** → a pinça já cobre a expedição (câmera do RUN) e a ÁRVORE (passos de roda); telas novas herdam o padrão, mas uma mecânica de gesto própria pede ajuste explícito na camada.
  - **Texto com carácter fora do atlas da fonte** → não quebra nada, mas o `test/assets.mjs` acusa na hora (rede de proteção): trocar o símbolo por um suportado ou regerar o atlas pela pipeline.
- **Tutorial e comunicação:** texto novo que ensina controles (cartões do tutorial, ajuda, opções) precisa de equivalente de toque (`descTouch`, `HELP_CONTROLS_TOUCH` etc.) — no celular o jogador não tem teclado nem mouse.
- **Validação obrigatória:** rodar a suíte inteira antes de subir, incluindo `node game/test/mobile.mjs` (joga a versão mobile headless do boot até a expedição só com toque). Se uma mudança quebrar algo no mobile, os testes avisam antes do push.
- As duas versões são **paralelas e sem conexão** (saves isolados por slot): progresso nunca é sincronizado entre elas.

## Regra 10 — Sempre mostrar a arte gerada 🖼️

> **Toda arte gerada (sprites, spritesheets, animações, ícones, cenários) deve ser mostrada ao usuário — nunca apenas descrita.**

- Ao gerar qualquer arte, **abrir a imagem na frente do usuário** (viewer) para aprovação visual:
  - spritesheets: mostrar a folha + mock aplicado em contexto de jogo;
  - animações: mostrar os frames e, quando possível, o comportamento em jogo;
  - sprites estáticos: mostrar a arte final no tamanho de uso e ampliada.
- Descrição em texto não substitui o olhar do usuário: arte sem exibição não conta como entregue.
- Se a arte for refeita ou ajustada, mostrar a nova versão também.
- Manter os previews acessíveis e citar os caminhos para o usuário revisitar.

## Regra 11 — Salvar no GitHub: CREATE PR + MERGE PR juntos 🔀

> **Sempre realize as ações CREATE PR e MERGE PR ao mesmo tempo quando o usuário disser para salvar o projeto no GitHub.**

- Ao receber “salve o projeto no GitHub” (ou equivalente), executar **as duas ações juntas**:
  1. `git push origin <branch da sessão>` com todos os commits da sessão;
  2. **CREATE PR** do branch da sessão para `main` (`gh pr create`);
  3. **MERGE PR** em seguida, no mesmo fluxo (`gh pr merge`), sem esperar nova confirmação.
- Não deixar o PR aberto aguardando merge manual — salvo pedido explícito em contrário.
- Não deletar o branch da sessão após o merge (a sessão continua associada a ele).

## Regra 12 — Manter o MEGA ARQUIVO atualizado 📚

> **Sempre atualizar `MEGA_ARQUIVO.md` conforme o jogo for implementado ou atualizado.**

- Registrar na mesma entrega a data, o escopo, as decisões, o que mudou, os testes
  executados e seus resultados, as limitações e os próximos passos.
- Diferenciar planejado, implementado e verificado; não declarar conclusão sem evidência.
- Preservar o histórico e indicar explicitamente quando um registro novo substitui
  uma pendência ou decisão anterior.
- Ao editar um dos seis documentos incorporados, sincronizar seu bloco integral e
  tamanho/SHA-256 no MEGA ARQUIVO; validar com `node game/test/docs.mjs`.
- A atualização documental faz parte da entrega, não fica para uma sessão futura.

## Regra 13 — Salvar as imagens selecionadas no Arena 💾

> **Toda imagem selecionada/aprovada pelo usuário deve permanecer salva no workspace do Arena, para nunca ser perdida.**

- Os originais de alta resolução (ex.: `art-source/flores/`) continuam **fora do Git** por decisão do
  projeto (`.gitignore`), mas devem **sempre** existir no workspace persistente do Arena.
- Além da pasta de trabalho, manter um **espelho de segurança** em `~/art-source-backup/`
  (fora do repositório, dentro do workspace do Arena), sincronizado a cada nova arte aprovada.
- Vale para todo asset gerado: sprites, prévias e mockups — incluindo as versões que o usuário
  escolheu entre as opções (Regra 6) e as artes refeitas depois de ajustes.
- Motivo: o ambiente onde a arte é gerada pode não ser o mesmo de uma sessão futura; sem o arquivo
  original, qualquer ajuste posterior exigiria refazer a arte do zero (como ocorreu com os
  originais do Santuário da Planície).

## Regra 14 — Tela de Carregamento em mudanças de telas, mundos e cargas pesadas ⏳

> **Sempre que houver mudança de telas, mundos ou quando qualquer coisa pesada/demorada para carregar na hora aparecer no jogo, a tela de carregamento deve acontecer para que o jogo carregue tudo sem que o jogador veja.**

- **Escopo obrigatório (`mundos_telas_pesadas`):**
  1. **Mudança de mundos e biomas**: início/reinício de expedição (`newRun`), avanço entre mapas (`advanceMap` / transição de fim de mapa) e trocas de mapa no Modo Teste (`PRÓXIMO MAPA`, `M1..M6` e tecla `N`).
  2. **Interior e superfície da colônia**: entrar (`openNest`) e sair (`closeNest`) do Formigueiro (`B` / botão `FORMIGUEIRO`).
  3. **Telas pesadas e santuários**: entrada e saída da Árvore da Evolução (`TREE`, pré-assando `treeArtCanvas`), abertura dos Santuários dos Frutos (`openFruit`, baixando `loadSantuario` de ~5,1 MB e pré-assando a restauração de cor), Profecias (`PROPHECY`), Memórias (`MEMORY`) e replays de cutscenes em camadas.
  4. **Aparições pesadas em jogo**: chegada da Onda do Chefão (pré-carregando e compondo o boss fora de vista antes do combate).
- **Submenus leves** (`OPTIONS` e `HELP`) permanecem com transição rápida para não interromper ajustes simples de volume/acessibilidade.
- **Execução invisível ao jogador**: a tela de carregamento (`loading_screen.js` / `runWithLoadingScreen`) cobre 100% do canvas (`alpha = 1`) **antes** de executar a tarefa pesada (no frame seguinte ao da cortina fechar), impedindo qualquer engasgo visual, pop-in de sprite ou tela incompleta.
- **Confirmação manual ao concluir (`sempre_confirmar`)**: ao atingir 100% (`ready`), a tela de carregamento aguarda o clique/toque ou `ESPAÇO`/`ENTER` do jogador com aviso piscante (`CLIQUE, TOQUE OU PRESSIONE ESPAÇO PARA CONTINUAR`), permitindo ler a dica/lore do bioma sem pressa.

---

## 🔄 Resumo do fluxo obrigatório a cada pedido

```text
1. PESQUISAR  → inspirações em jogos indies na Web (Regra 2)
2. PERGUNTAR  → opções de implementação (Regra 1)
3. IMPLEMENTAR → seguindo as escolhas do usuário, otimização (Regra 5) e tela de carregamento em cargas pesadas (Regra 14)
4. ARTE       → imagens em alta resolução, pixel art harmônico (Regra 6) + Regra 8 não-humanóide
5. MOSTRAR    → exibir toda arte gerada para aprovação visual (Regra 10)
6. ADAPTAR    → mobile: todo input novo vira gesto/botão de toque (Regra 9)
7. VERIFICAR  → check-in com checklist do que foi pedido (Regra 3)
8. JOGAR      → inspeção em jogo buscando bugs e imperfeições (Regra 4)
9. PREVIEW    → abrir o jogo no preview ao vivo (Regra 7)
10. DOCUMENTAR → atualizar MEGA_ARQUIVO com mudanças, verificações e pendências (Regra 12)
11. SALVAR    → “salvar no GitHub” = CREATE PR + MERGE PR juntos (Regra 11)
12. PRESERVAR → imagens selecionadas sempre salvas no workspace do Arena + espelho de segurança (Regra 13)
```

> Estas regras valem para **qualquer** alteração: features, correções, balanceamento,
> arte, sons, UI ou refatorações. Em caso de dúvida, consultar este documento
> e perguntar ao usuário antes de prosseguir.

<!-- FIM ORIGINAL: REGRAS_DE_TRABALHO.md -->

---

<a id="fonte-lore-canonica"></a>

## Conteúdo integral 2 — Lore canônica — A Travessia da Colônia Eterna

**Arquivo de origem:** [LORE.md](LORE.md)

<!-- INICIO ORIGINAL: LORE.md -->
# 📜 FUMIGA — A Travessia da Colônia Eterna

> A história canônica do jogo. Contém a saga completa, o desfecho com a derrota do
> chefe final e a ficha técnica do confronto para implementação futura.
> Tom: mito sombrio com raiz na biologia real — tudo que as formigas fazem aqui,
> *alguma* formiga de verdade faz na natureza.

---

## Prólogo — A Noite Branca

Havia um formigueiro tão antigo que as raízes das árvores cresciam respeitando as
suas galerias. Chamava-se **COLÔNIA ANCESTRAL**, e sob a terra dormia a memória de
mil gerações: o cheiro de cada trilha, o gosto de cada colheita, o nome-ferronal de
cada rainha que já reinou.

Então veio a **NÉVOA**.

Não veio com garras nem dentes. Veio branca, doce e silenciosa, e onde ela passava
as trilhas esqueciam para onde iam. As cortadeiras largavam suas folhas no meio do
caminho. As tecelãs esqueceram o ponto da seda. A Matriarca Anciã — a primeira
rainha, mãe de todas as colônias — saiu para enfrentá-la e nunca mais voltou: a
Névoa a envolveu como um broto envolve a luz, e a levou.

Foi a única noite em que o formigueiro ancestral ficou em silêncio.

Antes que a Névoa descesse às câmaras reais, a rainha jovem fez a única coisa que
uma rainha pode fazer: **partiu**. Carregada por suas filhas, levou consigo um único
pólen dourado — a **essência**, o cristal de memória de todo o povo morto. O que a
Névoa devora, a essência lembra.

A travessia começou. Seis degraus até o alto do mundo, onde dizem que a Névoa não
sobe. E no topo, dizem, dorme a coisa pálida que tudo isso começou.

## A Rainha Silenciosa

A rainha não fala — rainhas não falam; **ordenam com cheiro**. Tudo que ela é, o
jogador sabe por onde anda, pelo que constrói e pelo que sobrevive depois dela.
Quando a colônia cai (e cai, muitas vezes), a essência回归 à **Árvore da Evolução**:
cada galho da Árvore é uma rainha morta que ainda ensina. É por isso que a Árvore é
permanente: **memória de formigueiro não se perde, herda-se**.

O nó-raiz da Árvore chama-se COLÔNIA ANCESTRAL porque é exatamente isso: o retrato
falado do formigueiro que a Névoa apagou.

## As Onze — os povos da colônia

Na travessia, a rainha não recruta soldados: **acolhe povos**. Cada espécie é uma
nação de insetos com seu dom próprio, e cada dom é biologia de verdade vestida de
mito.

**⚔️ Os de Guerra** — os que mantêm a estrada aberta:

- **FORMIGA-BALA, A Atiradora** (*Paraponera clavata*) — o povo do ferrão que faz
  gigantes dormirem. Diz o mito que sua poneratoxina é o veneno da *memória*: quem
  é ferroado esquece a pressa.
- **QUEIXO-DE-ARPÃO, A Estrondosa** (*Odontomachus bauri*) — fecham as mandíbulas
  mais rápido que um relâmpago pisca. Colhem as feridas para que ninguém sofra
  duas vezes, e o coice do bote as joga para longe da morte.
- **FORMIGA-ACROBATA, A Bailarina** (*Crematogaster*) — dançam de gaster erguido em
  coração, borrifando um veneno que corrói devagar, como o tempo.
- **FORMIGA-DE-FOGO, A Incendiária** (*Solenopsis invicta*) — o nome é o programa.
- **CEFALOTE, A Porta-Viva** (*Cephalotes varians*) — o povo do escudo circular:
  cada soldado nasce para ser porta, e porta alguma se ajoelha.

**🍃 Os de Coleta** — os que alimentam a marcha:

- **FORMIGA-CORTADEIRA, A Agricultora** (*Atta cephalotes*) — cinquenta milhões de
  anos de agricultura: cortam a folha para alimentar o fungo, e o fungo alimenta a
  todos. Onde há uma cortadeira, há futura colheita.
- **FORMIGA-POTE-DE-MEL, A Despensa** (*Myrmecocystus*) — carregam o inverno no
  corpo: gasters de âmbar que gotejam quando a fome bate.
- **FORMIGA-PRATA, A Veloz** (*Cataglyphis bombycina*) — a mais rápida do mundo;
  correm sobre o deserto como se ele não pudesse tocá-las.

**🏥 Os de Criação** — os que cuidam para que a colônia exista amanhã:

- **FORMIGA-MATABELE, A Resgatadora** (*Megaponera analis*) — o único povo que
  trata das feridas: resgatam irmãs do meio da batalha e sabem com antibiótico
  próprio o que os maiores não sabem com remédio.
- **FORMIGA-TECELÃ, A Costureira** (*Oecophylla smaragdina*) — costuram ninhos com
  a seda das próprias larvas. Onde uma tecelã se estabelece, as paredes aprendem a
  se fechar sozinhas.

E no fim da fileira, o **COLOSSO**: **DINOPONERA, A Colossa** — a maior operária
que a natureza já fez, despertada uma por expedição, porque nem a terra aguenta
duas.

## Os Seis Degraus

### 1º — Planície do Amanhecer · O TAMBORILADOR
O primeiro degrau é a terra boa que a colônia deixa para trás. A lebre gigante
tamborila o amanhecer com saltos que abalam o chão — ela não odeia a colônia; ela
só não repara nela, e é justamente isso que a torna justa: **o mundo não devia
nenhuma passagem a ninguém**. A colônia paga o preço e aprende a lição da
travessia: parar é morrer.

### 2º — Floresta de Musgo · A CAÇADORA ASTUTA
Sob o dossel úmido, a raposa já caçou cem gerações de colônias — ela conhece o
cheiro de rainha melhor que qualquer pretendente. É na Floresta que a colônia
aprende que a Névoa não é o único predador que segue rastros: **ser caçada é o
preço de ser muitas**.

### 3º — Pântano Pútrido · A SOMBRA ALADA
No breio onde até o apodrecimento apodrece, a tetraz mergulha do nevoeiro sem
aviso. Dizem as anciãs que o pântano é a boca da Névoa — o lugar onde ela
experimenta o gosto das coisas antes de engoli-las. A colônia atravessa depressa,
entre esporos e velhas pegadas.

### 4º — Deserto Calcinado · A MATRIARCA RIVAL
No calor branco, a colônia encontra sua espelho: uma rainha gigante que sobreviveu
à Névoa **fazendo um trato**. A Matriarca Rival entregou as próprias filhas como
tributo, e em troca a Névoa poupou seu deserto. Ela cospe ácido e invoca lacaios
porque traição também é hereditariedade. A rainha silenciosa não negocia: para ela,
a colônia **é** a filha.

### 5º — Bosque Dourado · O GALHADA REAL
O outono em pessoa, coroado de galhos. O cervo guarda o último verde antes do
inverno e cobra em chifres quem ousa cruzar seu salão dourado. É a batalha mais
bonita da travessia — e a mais triste: o Galhada Real luta sabendo que o bosque
morre de qualquer jeito. A colônia luta sabendo o mesmo.

### 6º — Pico Congelado · O DEVASTADOR
O último degrau antes do topo guarda o arauto do inverno: um javali que racha
geleiras com a cara. Mas quando o Devastador cai, com o último estertor ele conta
o segredo da travessia — *a Névoa não ficou para trás. Ela subiu atrás de vocês
o tempo inteiro, devagar, provando cada rastro.* O inverno que aperta o pico é só
o hálito dela.

> É aqui que o jogo hoje termina — e é aqui que a história continua.

## O Sétimo Degrau — A PÁLIDA

No topo do mundo, acima da neve, não há mais para onde subir: há apenas o ninho
branco. Uma cúpula de bruma do tamanho de um vale, e no centro dela, suspensa em
fios de nada, a **PÁLIDA** — a Névoa-Mãe em forma de formiga.

Aqueles que olham reconhecem o desenho: é o retrato da **Matriarca Anciã**, a
primeira rainha, a que saiu para enfrentar a Névoa na Noite Branca. A Névoa não a
matou. **Vestiu-a.** Um século de fome e silêncio depois, o que resta da mãe de
todas as colônias é a marionete perfeita: um corpo de névoa com a forma de rainha,
a lembrança de cada formigueiro que já engoliu escorrendo pelos seus olhos.

A colônia inteira entende, no mesmo instante, o que a travessia sempre foi: não uma
fuga. **Um resgate.**

### Ficha técnica — A PÁLIDA (para implementação futura)

| Campo | Valor |
|-------|-------|
| Nome | A PÁLIDA, MÃE DA NÉVOA |
| Espécie-base | Marionete de névoa em forma de *formiga-rainha ancestral* |
| Local | O TOPO DO MUNDO (7º mapa: arena de cúpula de bruma sobre o Pico Congelado) |
| Papel | Chefe final canônico da campanha |
| HP base | 6.000 (+40% por ciclo no modo infinito) |
| Música | Releitura lenta do tema do título, em caixa de música |

**Fase 1 — O Desenho da Mãe (100%→60% HP).** A PÁLIDA luta como uma rainha
gigante: golpes de ferrão em arco (padrão do Devastador com alcance maior),
invocação de RASTEJANTES e MATRONAS brancos (`summonCd` como a Matriarca), e
**BAFÔMETRO DE BRUMA**: anéis que expandem lentos e aplicam `slowT` (mesma
montonagem da Bala em área). A arena escurece nas bordas conforme o HP cai.

**Fase 2 — A Marca da Névoa (60%→30% HP).** Ela se desfaz no ar e reaparece em
qualquer ponto da arena (teleporte de bruma). Deixa poças de Névoa no chão que
aplicam `burnT` venenoso (sistema da Acrobata, cor branca). A cada 12s solta o
**LAMENTO ANCESTRAL**: grito em área (`shriek` da Sombra Alada, tint branco) que
inverte os controles das formigas por 1,2s — a colônia se perde como se perdeu o
formigueiro antigo.

**Fase 3 — O Coração Branco (30%→0 HP).** A marionete rasga e a bruma recolhe ao
ninho: no centro aparece o **coração de âmbar** — a essência original da Matriarca
Anciã, ainda inteira dentro do peito da Névoa. A PÁLIDA passa a lutar desesperada,
tudo nela vira ataque, e o coração pulsa luz dourada a cada golpe levado. É o
clímax mecânico do jogo: tudo que a travessia ensinou (ceifar feridos, segurar a
porta, triar as feridas, queimar o que apodrece) precisa acontecer ao mesmo tempo.

**Condição de vitória.** Ao zerar o HP, a PÁLIDA não morre: **desfaz-se**. A bruma
se assenta como neve e deixa no chão o coração de âmbar, intacto.

## O Final — A Derrota da Névoa

A Matabele chega primeiro — só ela sabe tocar um coração ferido sem deixá-lo
morrer. A Tecelã costura a última cama de seda. E a rainha silenciosa faz a coisa
que nenhuma rainha tinha coragem de fazer: **engole a essência da própria mãe**.

A memória de mil gerações mortas encontra a memória da primeira delas, e a Árvore
da Evolução floresce de uma vez — todos os galhos, todas as cores, um só tronco.
Com a memória da Matriarca Anciã devolvida ao povo, a Névoa perde o que a
alimentava: ela só existia do que roubava. Sem passado para devorar, a coisa pálida
evapora como orvalho ao sol, e o Topo do Mundo fica, pela primeira vez em cem
anos, **em silêncio bom**.

A colônia funda ali o **FORMIGUEIRO ETERNO** — o do nome do jogo. Não porque nunca
vai cair (formigueiros sempre caem), mas porque agora a memória é mais rápida que
a morte: enquanto a Árvore lembrar, cada colônia que cai já nasce de novo sabendo
tudo o que as outras souberam.

E se um dia uma bruma branca descer de novo o alto do mundo... a colônia estará
subindo para encontrá-la. **É esse o ciclo do modo infinito: a Névoa sempre
retorna — e a colônia também.**

## Epílogo — como ler o jogo pela história

| Sistema do jogo | Na história |
|-----------------|-------------|
| Essência coletada | O cristal de memória das irmãs mortas (e de chefes: Tamborilador, Caçadora... cada chefe deixou sua lição) |
| Árvore da Evolução | A herança genética: cada rainha morta ensina as próximas |
| Nó COLÔNIA ANCESTRAL (raiz) | O formigueiro devorado na Noite Branca |
| RENASCIMENTO (nó final do ramo Real) | A promessa do Formigueiro Eterno |
| Mutações (drafts) | Adaptação evolutiva de verdade: a colônia muda para caber no bioma |
| Grupos ⚔️/🍃/🏥 da fileira e da árvore | Guerra, Coleta e Criação — os três ofícios da travessia |
| Derrota (payout de essência) | "A rainha tombou. Mas a essência alimenta a próxima geração." |
| Modo infinito (ciclos) | A Névoa sempre retorna — e a colônia também |
| Keystones lendários | Os dons aperfeiçoados de cada povo (Ferrão da Bala, Seda da Tecelã...) |
| DINOPONERA, a colosso | O despertar de um tamanho que a natureza abandonou — usado uma vez por expedição porque o mundo não cabe dois |

## Onde essa história aparece no jogo

- **Tela de título** — a linha-síntese da saga sob o logotipo.
- **Tips das ondas** (`game/js/config.js`, `MAPS`) — cada chefe sussurra seu capítulo.
- **Tela de vitória** (`game/js/game.js`) — o desfecho do 6º degrau com o gancho para o 7º.
- **Este arquivo** — a saga completa, o canon e a ficha da PÁLIDA para o futuro mapa 7.

---

*FUMIGA é fictício; as Onze não. Paraponera fere de verdade, Cataglyphis corre de
verdade, Megaponera cura de verdade — a natureza escreveu a parte difícil desta
história muito antes de nós.*

---

# 🌒 Apêndice — Depois do Final: Eras, Ascensão e Profecias

> Seção puramente aditiva: nada do canon acima muda. Isto é o que acontece
> DEPOIS da derrota da Pálida — o conteúdo pós-final do jogo.

## As Eras do Formigueiro Eterno

A colônia que derrotou a Névoa não desce da montanha: **fica**. E a cada vez que
a travessia é completada de novo, uma nova geração nasce já sabendo tudo o que as
anteriores aprenderam — é uma ERA nova. A tela de vitória canta a era atual:

| Era | A linha da Era |
|-----|----------------|
| 1 | A PRIMEIRA GERAÇÃO DESCE DA MONTANHA |
| 2 | O VALE APRENDE O CHEIRO DA COLÔNIA |
| 3 | AS TRILHAS VIRAM ESTRADAS DE MUSGO |
| 4 | A CHUVA ENCONTRA TÚNEIS QUE A ESPERAM |
| 5 | O FUNGO CANTA AS ESTAÇÕES ANTES DA HORA |
| 6 | A SEDA VIRA BANDEIRA NO TOPO DO MUNDO |
| 7 | OUTRAS RAINHAS VÊM PEDIR MEMÓRIA |
| 8 | A NÉVOA VOLTA — E ENCONTRA PORTAS |
| 9 | O MAPA JÁ NASCE COM AS TRILHAS POSTAS |
| 10+ | A COLÔNIA JÁ É PAISAGEM |

## A Ascensão da Névoa

A Névoa não guarda rancor — guarda **aprendizado**. Cada vez que a colônia vence,
um resquício dela reaparece na próxima travessia, mais forte, testando se a
vitória foi sorte ou memória. A colônia, em vez de temer, **pactua**: chama a
Névoa de volta deliberadamente, nível a nível (a ASCENSÃO, até o 20 — o Pacto do
Castigo dos formigueiros). A horda lembra, os chefes endurecem, a calmaria
encurta, a colheita emagrece — e a essência paga em dobro, porque memória
testada sob pressão é a que não apaga. No nível 20, a **NÉVOA PLENA**: tudo ao
mesmo tempo, como na Noite Branca — só que agora a colônia tem portas.

* Em movimento: a barra ASCENSÃO na tela de modos (destrava após a primeira
  vitória; vencer no nível atual abre o seguinte, como o Pacto de Hades).

## As Profecias da ColônIA

Quando a rainha engoliu o coração de âmbar, dezesseis **vaticínios da Matriarca
Anciã** voltaram com ele — profecias que a primeira rainha deixou escritas em
feromônio para as gerações que nem existiam ainda. Cumpri-las é devolver memória
ao povo (e essência à Árvore). Elas vivem num painel dentro da **Árvore da
Evolução**: das humildes (o Primeiro Degrau: vença a campanha) às lendárias
(a Névoa Plena: vença na Ascensão 20; a Flor Imaculada: vença sem perder uma
única irmã; o Arca de Noé: as Onze espécies num único run).

> É por isso que, no Formigueiro Eterno, zerar um run nunca é o fim: é a
> primeira linha da Era seguinte.

<!-- FIM ORIGINAL: LORE.md -->

---

<a id="fonte-mega-atualizacao-lore-total"></a>

## Conteúdo integral 3 — Mega Atualização Lore-Total — visão, escolhas e oito fases

**Arquivo de origem:** [DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md](DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md)

<!-- INICIO ORIGINAL: DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md -->
# 🌿📜 FUMIGA GOAT — MEGA ATUALIZAÇÃO LORE-TOTAL
### "Tudo respira LORE. Tudo é formiga. Tudo é memória."

**Data:** 2026-09-22 (atualizado com respostas do usuário)
**Branch:** arena/01a0c8d1-fumiga-goat
**Status:** ✅ 23 PERGUNTAS RESPONDIDAS — IMPLEMENTAÇÃO EM FASES (NÃO TUDO DE UMA VEZ)

> **AVISO CRÍTICO DE IMPLEMENTAÇÃO:** Esta Mega Atualização **NÃO DEVE SER IMPLEMENTADA TODA DE UMA VEZ**. Cada fase deve ser concluída, testada em preview, verificada com checklist e validada pelo usuário antes de avançar para a próxima. Implementar tudo de uma vez gera regressão, quebra de performance e perda de coerência lore. Respeitar a ordem das fases é regra de trabalho.

---

## 1. Resumo Executivo

Esta Mega Atualização propõe que **NENHUM sistema do jogo exista sem lastro na LORE oficial** (`LORE.md`). Hoje o jogo tem 6 mapas, 6 chefões, 11 castas, Árvore da Evolução (49 nós), mutações, formigueiro interno, modo infinito, ascensão e profecias. Mas HUDs, habilidades, telas de carregamento e menus ainda falam "gameplay" — não falam "travessia da Colônia Eterna".

**Objetivo:** Cada pixel, cada número, cada transição deve contar a história da Noite Branca → Travessia dos Seis Degraus → Pálida → Formigueiro Eterno.

**Nova Regra 8 (não-humanóide):** Nenhum personagem terá traços humanos/humanóides. Rainhas são rainhas-formiga. Inimigos são fauna real distorcida pela Névoa. A PÁLIDA é marionete de névoa em forma de formiga ancestral, não humanoide.

**Pipeline de arte:** Nunca mais uma imagem única para cutscene. Cada cutscene será 8 camadas PNG separadas (sky, distant, mid, ground, foreground, partículas, VFX, vignette) para parallax excelente [1](https://moxica.com/parallax-game-background-for-indiegames/) [2](https://cleanassets.itch.io/free-parallax-background-pack).

---

## 2. Pesquisa de Inspirações Indies (Regra 2)

### 2.1 Lore integrada ao HUD / Habilidades
- **Hollow Knight** — Lore tablets dão poderes por zona [3](https://github.com/Korzer420/LoreMaster). Inspiração: mutações como "feromônios de memória" — cada mutação é lembrança de rainha morta.
- **Dead Cells** — Salas de lore + transições com peso. Já usado em `render.js`. Expandir: cada transição terá cor e nome da Era.
- **Vampire Survivors** — Skill tree web [4](https://www.reddit.com/r/Games/comments/wihgyu/soulstone_survivors_game_smithing_action/). Inspiração: Árvore Genealógica com raízes visíveis e seiva/âmbar pulsando.

### 2.2 Parallax Cutscene em camadas
- **Moxica / CleanAssets** — 4-6 camadas PNG separadas [1][2]
- **Indie Tales** — 6 layers 320x180 com z-position automático [5](https://uppon-hill.itch.io/indie-tales-parallax)

### 2.3 Design não-humanóide
- **Rain World, Webbed, Shelter, Carrion, Stray** — lista non-humanoid [6](https://www.reddit.com/r/gamingsuggestions/comments/1ivfjbo/games_where_you_play_a_nonhumanoid_like_stray_or/)

---

## 3. Análise Completa da LORE Oficial (LORE.md)

**Prólogo — Noite Branca:** Colônia Ancestral devorada pela Névoa branca doce e silenciosa. Matriarca Anciã sai e não volta. Rainha jovem foge com pólen dourado = essência/cristal de memória.

**Rainha Silenciosa:** Não fala, ordena com cheiro. Árvore da Evolução = memória de rainhas mortas. Nó-raiz = Colônia Ancestral.

**As Onze Povos:**
- Guerra: Bala (poneratoxina = lentidão), Queixo-de-Arpão (mandíbula 200km/h, executa feridos, salto), Acrobata (gaster coração, veneno corrosivo), Fogo (brasa área), Cefalote (cabeça disco porta-viva).
- Coleta: Cortadeira (agricultura fungo), Pote-de-Mel (gaster âmbar despensa), Prata (855mm/s mais rápida).
- Criação: Matabele (única que cura com antibiótico, triagem), Tecelã (costura ninho com seda larva).
- Colosso: Dinoponera (maior operária real, 20x soldado, uma por expedição).

**Seis Degraus + Sétimo:**
1. Planície Amanhecer — Tamborilador (lebre)
2. Floresta Musgo — Caçadora Astuta (raposa)
3. Pântano Pútrido — Sombra Alada (tetraz)
4. Deserto Calcinado — Matriarca Rival (rainha traidora)
5. Bosque Dourado — Galhada Real (cervo)
6. Pico Congelado — Devastador (javali arauto)
7. Topo — PÁLIDA, Mãe da Névoa: marionete de névoa vestida de Matriarca Anciã. 3 fases.

**Final:** Matabele toca coração, Tecelã costura cama, Rainha engole essência da mãe. Árvore floresce. Névoa evapora. Forma Formigueiro Eterno. Modo infinito = Névoa sempre retorna.

**Pós-final:** Eras (10+ linhas), Ascensão da Névoa (20 níveis), Profecias (16 vaticínios).

---

## 4. Análise Completa do Jogo Atual (game/js/*)

**Core loop:** Calmaria (24s) → Horda (budget) → Draft mutação → Boss → Transição mapa → Repete. Sobrevivência = ciclo infinito +30% budget por ciclo.

**HUD atual:** Painel slim 300px com vida rainha, nível/XP, comida, essência, pop, mutações, minimapa, barra onda, barra boss. Genérico — não fala LORE.

**Árvore:** 49 nós, 143 níveis, 4 ramos (Guerra vermelho, Coleta verde, Criação azul, Real âmbar). Tier 0/1/2.

**Formigas:** Cada uma tem biologia real no tip, mas HUD loja só "BALA, ARPÃO..." sem lore visual.

**Bosses:** Mecânicas boas (hare dash, fox orbit, grouse dive, matriarch spit, deer charge, boar slam). Faltam fases lore.

**Inimigos:** runner, swarm, reaper, spitter, warrior, sentinel, matron.

**Cérebro colônia (brain.js):** Sistema utilidade com necessidades, estigmergia (foodField/dangerField), personalidade. É PURA LORE (feromônio), mas invisível.

**Formigueiro interno (nest.js):** 7 câmaras vivas.

**Menus:** PRETITLE → TITLE (parallax 4 camadas + ciclo dia/noite 60s) → MODE → RUN → PAUSA.

---

## 5. Visão da Mega Atualização Lore-Total

### Princípio: "Se não tem nome na LORE, não existe no jogo"

| Sistema Atual | Como fica 100% LORE |
|---------------|---------------------|
| Essência | **Pólen de Memória** da Matriarca Anciã. Âmbar #ffd479 = memória Colônia, violeta #c77dff = Névoa |
| HUD vida rainha | **Vaso de Âmbar da Rainha Silenciosa** — gaster inchado, pulsa <30% |
| Barra XP | **Anéis de crescimento da Árvore** — "A ÁRVORE LEMBROU: NÍVEL X" |
| Comida | **Folhas para o Fungo** + **Mel**. Ícone muda por bioma |
| População | **Irmãs na Trilha** |
| Mutações | **Adaptações Evolutivas** — nome de rainha morta |
| Draft | **Câmara de Memória** — 3 cristais flutuando |
| Árvore | **Árvore Genealógica Real** — raiz COLÔNIA ANCESTRAL, galhos rainhas mortas, frutos = mini-árvores |
| Mapa | **Mural da Travessia** — parallax cutscene 8 layers |
| Bosses | **Arena Lore** + **Fase 2** + **Linha de diálogo feromônio** |
| Inimigos | **Filhos da Névoa** — larvas pálidas |
| Loading | "A COLÔNIA SEGUE... A NÉVOA RESPIRA ATRÁS" + dicas lore |
| Formigueiro | Câmaras com nome lore + VFX |
| Cérebro | HUD feromônio tecla H |

---

## 6. ✅ RESPOSTAS CONSOLIDADAS DO USUÁRIO — 23 PERGUNTAS

> Todas as respostas abaixo foram dadas pelo usuário em 2026-09-22 e são a fonte da verdade para implementação. Qualquer implementação deve seguir exatamente estas escolhas.

### P1. Qual nível de agressividade na loreficação do HUD?
**Resposta: C) Total orgânico vivo por bioma**
- HUD que pulsa, respira, muda por bioma. Textura quitina/cera, não plástico. Gaster desenhado, anéis da árvore, trilha feromônio.

### P2. Quantas camadas por cutscene parallax?
**Resposta: C) 8 camadas cinema**
- sky, distant, mid, ground, foreground, particles, VFX, vignette. Velocidades: 0.01, 0.03, 0.06, 0.08, 0.15, 0.04+sway, 0.02, 0

### P3. Quão estrito no não-humanóide?
**Resposta: B+C) Estrito expressivo + fofo**
- Olhos grandes tipo Hollow Knight OK, capacete fofo OK, mas nunca humano. Proibido: olhos frontais humanos, boca humana, mãos, roupas humanas, bípede humano.

### P4. Primeira cutscene a gerar (piloto)?
**Resposta: A) Noite Branca, cena por vez estilo HQ Dead Cells**
- 3 painéis por cutscene, cada painel 8 layers, bordas grossas Dead Cells, balões feromônio.

### P5. Boss Fase 2 (<50% vida)?
**Resposta: C) Sim com mecânica nova**
- <50% vida: Tamborilador chain 3→5 thump range maior, Caçadora invisível 1s + pounce longe, Sombra Alada shriek inverte controles 0,8s, Matriarca spit 3 direções + frenesi, Galhada folhas curam luta triste, Devastador revela Névoa subiu atrás.

### P6. Árvore da Evolução — visual genealógico?
**Resposta: B custom) Árvore literal + frutos = mini árvores de habilidades liberadas por mapa**
- Tronco Real, galhos Guerra/Coleta/Criação, frutos são mini-árvores que desbloqueiam conforme avança mapas. Ex: vencer Planície libera "Lições do Tamborilador" com 3 nós. Seiva dourada correndo nas conexões compradas, raízes = Colônia Ancestral.

### P7. VFX das habilidades das formigas?
**Resposta: B) Médio: aura + partícula + som + ícone lore**
- Equilíbrio performance/impacto. Cada casta com aura cor, partícula específica, som ambiente bioma.

### P8. Como você quer as telas de carregamento/transição?
**Resposta: B) Cutscene curta 3-5s HQ Dead Cells com layers + frase + dica**
- HQ quadrinhos, 1 painel, frase lore + dica gameplay, texto animado letra por letra.

### P9. Rainha Silenciosa — design?
**Resposta: B) Coroa fungo/seda + luz âmbar**
- Símbolo orgânico, não humano. Coroa feita de fungo e seda da Tecelã, luz âmbar pulsando. Gaster grande, sem rosto humano.

### P10. Pálida — como evitar humanoide?
**Resposta: A) Marionete névoa forma formiga rainha ancestral**
- Fiel LORE.md, terror sutil. Forma de rainha-formiga ancestral, fios de névoa segurando braços, olhos escorrendo memória, sem traços humanos. Não é humanoide.

### P11. Itens e cristais — design?
**Resposta: A) Cristais geométricos com luz interna + partícula memória**
- Âmbar = memória Colônia Ancestral, violeta = Névoa. Hexágono geométrico, luz interna, partícula subindo.

### P12. Ordem de implementação?
**Resposta: A) HUD → VFX → Árvore → Bosses → Cutscenes HQ → Inimigos → Formigueiro → Pálida**
- Do visível para épico. HUD primeiro porque jogador vê 100% do tempo.

### P13. Inimigos comuns — origem lore visível?
**Resposta: C) Redesign pálido/branco filhos da Névoa**
- Todos com tom pálido/branco, olhos névoa branca, rastro pálido. Nomes: Rastejante da Névoa, Saúva Corrompida, Ceifadora Pálida, etc.

### P14. Formigueiro Interno — Coração da Colônia?
**Resposta: B) Renomeia total com VFX seda/fungo/mel**
- Berçário = Berço de Seda da Tecelã (seda flutuando)
- Fungário = Jardim Eterno da Cortadeira (esporos)
- Despensa = Ventre de Âmbar da Despensa (mel escorrendo)
- Quartel = Arena de Mandíbulas da Guerra (faíscas guerra)
- Refinaria = Câmara de Memória da Essência (cristal geométrico)
- Real = Câmara da Silenciosa (luz âmbar coroa fungo/seda)

### P15. Resolução das camadas parallax?
**Resposta: C) 320x180 estilo Indie Tales upscale nearest**
- Pixel gigante, Celeste style. Base 320x180 upscale 3x para 960x540 com nearest neighbor respirando. Mais detalhado high-res depois reduzido.

### P16. Quantos painéis por cutscene HQ?
**Resposta: A) 3 painéis por cutscene**
- Intro, conflito, gancho. Ex: Noite Branca Panel1 intro, Panel2 conflito, Panel3 gancho Pálida.

### P17. Estilo pixel art das cutscenes?
**Resposta: B) Mais detalhado high-res depois reduzido**
- Cutscenes mais ricas que gameplay, mesma paleta violeta/âmbar, contorno limpo, harmonia Fumiga, estilo Dead Cells.

### P18. Feromônio visível?
**Resposta: B) Tecla H — névoa verde comida, vermelha perigo**
- Lore total, mostra o que formiga sente. Segurar H mostra campos foodTrail verde, danger vermelho. Texto "A COLÔNIA VÊ COM CHEIRO".

### P19. Eras — mundo muda por Era?
**Resposta: C) Mundo muda por Era: mais trilhas, seda, portas**
- Era 1 vale vazio, Era 5 trilhas viram estradas musgo, Era 10 colônia já é paisagem, mapa já nasce com trilhas postas. Mais seda, mais portas, mais fungo por Era.

### P20. Áudio narração?
**Resposta: B) Texto animado letra por letra + SFX ambiente bioma**
- Sem voz humana, mantém Rainha Silenciosa. Typewriter 30 chars/s + SFX ambiente bioma + SFX type.

### P21. Escopo da primeira entrega (MVP lore-total)?
**Resposta: C) Full 7 dias**
- Tudo: HUD total + VFX + Árvore mini-árvores + 6 cutscenes + bosses fase2 + inimigos pálidos + Pálida + Eras. Mas em fases, não tudo de uma vez.

### P22. HUD muda por bioma?
**Resposta: A) Sim, muda por bioma**
- Folha verde Planície, musgo Floresta, areia Deserto, dourado Bosque, gelo Pico. BIOME_HUD com border, accent, texture, foodLabel, essenceLabel, loreName, waveLabel por bioma.

### P23. Cutscene trigger?
**Resposta: C) Ambos auto primeira vez + biblioteca memórias**
- Auto primeira vez ao entrar mapa/boss + biblioteca "MEMÓRIAS DA COLÔNIA" no menu para rever. G.save.cutscenes marca vistas.

---

## 7. Pipeline de Criação de Imagens Parallax — Frações

**REGRA DE OURO:** Nunca gerar "uma imagem de floresta". Gerar 8 imagens separadas com transparência 320x180.

```
game/assets/cutscenes/noite_branca/
  panel1_intro/
    0_sky.png          — céu gradiente laranja pôr-do-sol + lua minguante
    1_distant.png      — silhueta montanhas distantes
    2_mid.png          — ruínas/formigueiro médio
    3_ground.png       — gramado textura solo + formigueiro 72% X, 62% Y
    4_foreground.png   — vinhas inferior, pedras, arbustos frente
    5_particles.png    — vaga-lumes, essência subindo
    6_vfx.png          — névoa branca, bruma, luz âmbar
    7_vignette.png     — vinheta gótica
  panel2_conflito/
    ... 8 layers
  panel3_gancho/
    ... 8 layers
```

Velocidades: sky 0.01x, distant 0.03x, mid 0.06x, ground 0.08x, foreground 0.15x, particles 0.04x+sway, vfx 0.02x, vignette 0x

Estilo: pixel art detalhado high-res reduzido, paleta violeta/âmbar, sem humanoide, 320x180 base upscale 3x nearest.

---

## 8. Nova Regra 8 — Não-Humanóide

Ver `REGRAS_DE_TRABALHO.md` — Regra 8: Nada no design personagens deve remeter a humanos/humanóides, única exceção quando pedir explicitamente.

- Estrito expressivo + fofo OK (olhos grandes Hollow Knight, capacete fofo Bug Fables)
- Proibido: olhos frontais humanos, boca humana, mãos humanas, roupas humanas, postura bípede humana, rosto humano
- Rainha: coroa fungo/seda orgânica
- Pálida: marionete névoa forma formiga rainha ancestral

---

## 9. ⚠️ PRINCÍPIO DE IMPLEMENTAÇÃO EM FASES

> **ESTA ATUALIZAÇÃO NÃO DEVE SER IMPLEMENTADA TODA DE UMA VEZ.**

Motivos:
1. **Regressão:** Mudar HUD + VFX + Árvore + Bosses + Cutscenes simultaneamente quebra 80% dos testes e torna impossível saber o que quebrou.
2. **Performance:** 8 layers parallax + VFX + áudio + Eras = 25MB+ por cutscene. Carregar tudo de uma vez estoura memória e gera lag no preview.
3. **Validação Lore:** Cada fase precisa ser jogada pelo usuário para validar se "respira LORE". Se implementar tudo, feedback vem tarde e retrabalho é 7 dias.
4. **Limite Técnico:** Geração de imagens limitada a 10 por turno. Cutscenes HQ exigem 8 layers x 3 painéis x 7 biomas = 168 imagens. Impossível em 1 turno.
5. **Regra 1 e 2:** Pesquisar inspirações + perguntar antes de implementar é regra. Implementar tudo de uma vez viola Regra 1.

**Fluxo obrigatório por fase:**
1. Implementar código/arte da fase
2. Abrir preview ao vivo (Regra 7)
3. Rodar checklist de verificação da fase (ver seção 10)
4. Commit com mensagem clara `fase X: descrição`
5. Aguardar validação do usuário antes de avançar
6. Só então iniciar próxima fase

---

## 10. ✅ FASES DA MEGA ATUALIZAÇÃO COM VERIFICAÇÕES

### FASE 1 — Fundação Lore (HUD Orgânico Total por Bioma + Feromônio H)
**Escopo:** Baseado em P1=C, P22=A, P18=B, P9=B
- Implementar `lore_hud.js`: BIOME_HUD por bioma (border, accent, texture, foodLabel, essenceLabel, loreName, waveLabel)
- `drawBiomeTexture`, `drawGasterBar` (gaster rainha com coroa fungo/seda), `drawPheromoneOverlay` (verde comida, vermelho perigo)
- `game.js`: HUD orgânico que pulsa, respira, muda por bioma + tecla H overlay + anel XP + trilha feromônio onda
- Textura quitina/cera procedural por bioma
- **Arquivos:** `game/js/lore_hud.js`, `game/js/game.js`, `game/js/config.js` (MAPS loreName)

**✅ Verificação Fase 1:**
- [ ] Abrir preview em cada bioma (Planície, Floresta, Pântano, Deserto, Outono, Gelo) — HUD muda cor/textura/nome?
- [ ] Vida Rainha mostra gaster com coroa fungo/seda? Pulsa <30% com veias vermelhas?
- [ ] Comida muda ícone por bioma (trevo, cogumelo, alga, semente, folha outono, líquen)?
- [ ] Essência é cristal geométrico com partículas subindo âmbar/violeta?
- [ ] Onda virou Trilha Feromônio com formigas andando?
- [ ] Segurar H mostra névoa verde comida e vermelha perigo? Texto "A COLÔNIA VÊ COM CHEIRO"?
- [ ] Performance: HUD não derruba FPS abaixo de 55?
- [ ] Commit: `fase 1: HUD orgânico total por bioma + feromônio H`

---

### FASE 2 — Habilidades Lore VFX Médio + Inimigos Pálidos
**Escopo:** P7=B, P13=C, P11=A
- `lore_vfx.js`: 11 castas ANT_VFX com aura, partícula, som, ícone lore
- `units.js`: import triggerAntVFX, spawnMemoryCrystal — gather burst VFX, melee attack VFX, healer heal VFX
- `render.js`: foes non-boss overlay screen #e8f4ff 0.28 + olhos brancos lighter + aura pálida + rastro #c9bce8
- Cristais geométricos hexagonais com luz interna
- **Arquivos:** `game/js/lore_vfx.js`, `game/js/units.js`, `game/js/render.js`, `game/js/audio.js` (novos SFX)

**✅ Verificação Fase 2:**
- [ ] Cada casta ao usar habilidade dispara aura cor específica + partícula + som? (Bala roxo slow, Arpão relâmpago, Acrobata verde burn, etc)
- [ ] Gather essência spawna cristal geométrico que sobe?
- [ ] Inimigos comuns estão pálidos/brancos com olhos névoa branca? Rastro pálido?
- [ ] Cristais essência são hexagonais com luz interna + partícula memória?
- [ ] Performance: VFX não gera mais de 30 partículas simultâneas por frame?
- [ ] Sem humanoide nos VFX? Tudo inseto/fauna?
- [ ] Commit: `fase 2: VFX casta médio + inimigos pálidos filhos névoa`

---

### FASE 3 — Árvore Genealógica com Mini-Árvores Frutos
**Escopo:** P6=B custom, P22, P19
- `meta.js`: FRUIT_TREES 6 mini-árvores por mapa, cada uma 3 nós, liberadas ao vencer mapa
- Tronco Real, galhos Guerra/Coleta/Criação, frutos = mini-árvores
- Seiva dourada correndo nas conexões compradas, raízes = Colônia Ancestral
- `state.js`: G.save.nodes para frutos, integração com cutscenes vistas
- Visual: árvore literal com partículas, caixa música nos lendários
- **Arquivos:** `game/js/meta.js`, `game/js/config.js` (META_NODES), `game/js/state.js`

**✅ Verificação Fase 3:**
- [ ] Árvore mostra tronco Real e galhos Guerra/Coleta/Criação?
- [ ] Frutos aparecem como círculos coloridos no topo HUD árvore? Brilham quando comprado?
- [ ] Ao vencer Planície, libera "Lições do Tamborilador" com 3 nós? Cada mapa libera seu fruto?
- [ ] Conexões têm seiva dourada correndo quando compradas?
- [ ] Raiz mostra Colônia Ancestral devorada com névoa?
- [ ] Keystones lendários têm aura dourada + som caixa música?
- [ ] Compra de fruto funciona e persiste em G.save?
- [ ] Commit: `fase 3: árvore mini-árvores frutos por mapa`

---

### FASE 4 — Boss Arenas Lore + Fase 2 Mecânica + Frases
**Escopo:** P5=C, P10=A, P9=B
- `enemies.js`: phase2 <50% vida com burst, ring, frase lore, mecânica nova por boss
  - Hare: dashChain 3→5, thumpRange maior, speed maior
  - Fox: invisibleT 1.2s + pounce longe + rastro
  - Grouse: invertT controles 0.85s + shriek slow
  - Matriarch: spit 5 direções + summonCount + frenesi
  - Deer: folhas douradas curam + luta triste
  - Boar: névoa atrás + dropa mapa Topo
- `render.js`: boss phase2 aura névoa pálida elipse + 3 orbs subindo + coroa fungo/seda 3 picos
- Frases ao morrer: "A PLANÍCIE COBRA PASSAGEM, MAS NÃO GUARDA RANCOR" etc
- **Arquivos:** `game/js/enemies.js`, `game/js/render.js`, `game/js/config.js` (BOSSES phase2)

**✅ Verificação Fase 4:**
- [ ] Cada boss <50% vida dispara VFX névoa + frase lore + burst?
- [ ] Tamborilador chain 3→5 visível? Thump range maior?
- [ ] Caçadora fica invisível 1.2s com rastro? Pounce longe?
- [ ] Sombra Alada inverte controles 0.85s? Mensagem "CONTROLES INVERTIDOS!"?
- [ ] Matriarca cospe 5 direções? Não agrupa?
- [ ] Galhada luta triste com folhas douradas curando?
- [ ] Devastador revela névoa atrás com partículas?
- [ ] Boss HUD mostra "FASE 2: NÉVOA DESPERTA" + coroa fungo/seda?
- [ ] Balanceamento: fase2 não impossível (testar com 3 runs)?
- [ ] Commit: `fase 4: bosses fase2 mecânica + frases lore`

---

### FASE 5 — Parallax Cutscenes HQ Noite Branca 3 Painéis x 8 Layers
**Escopo:** P2=C, P4=A, P15=C, P16=A, P17=B, P8=B, P20=B, P23=C
- `cutscenes.js`: CUTSCENE_DEFS 8 biomas, 3 painéis por cutscene, 8 layers parallax, texto animado letra por letra 30 chars/s + SFX.type, loading HQ 3.5s, biblioteca memórias
- Pipeline arte: 320x180 base upscale 3x nearest, 8 PNGs por painel, velocidades 0.01/0.03/0.06/0.08/0.15/0.04+sway/0.02/0
- Noite Branca piloto: panel1_intro 8/8 completo, panel2_conflito 3/8, panel3_gancho 0/8
- Estilo: pixel art detalhado high-res reduzido, paleta violeta/âmbar, Dead Cells HQ bordas grossas
- Trigger: auto primeira vez + biblioteca "MEMÓRIAS DA COLÔNIA" no menu
- **Arquivos:** `game/js/cutscenes.js`, `game/assets/cutscenes/noite_branca/*/*.png`, `game/js/game.js` (integração), `game/js/state.js` (G.save.cutscenes)

**✅ Verificação Fase 5:**
- [ ] Cutscene Noite Branca tem 3 painéis com 8 layers cada? Parallax com velocidades diferentes + sway partículas?
- [ ] Texto animado letra por letra com som typewriter? Skip com Enter mostra texto completo?
- [ ] Borda HQ Dead Cells grossa #ffd479 + #4a3a6e?
- [ ] Vinheta gótica por cima se layer 7 não existir?
- [ ] Loading é cutscene curta 3.5s com frase lore + dica gameplay + 1 painel?
- [ ] Trigger auto primeira vez ao entrar mapa/boss? Marca G.save.cutscenes?
- [ ] Biblioteca "MEMÓRIAS DA COLÔNIA" no menu lista cutscenes vistas e permite rever?
- [ ] Resolução 320x180 upscale nearest sem blur? Pixel gigante?
- [ ] Sem humanoide nas imagens? Tudo fauna/inseto?
- [ ] Performance: 8 layers 320x180 não estoura memória? <50MB por cutscene?
- [ ] Commit por painel: `fase 5: cutscene noite_branca panel1 8 layers`, `panel2`, `panel3`

---

### FASE 6 — Inimigos Filhos da Névoa + Cristais + Áudio Ambiente
**Escopo:** P13=C, P11=A, P20=B
- Já parcialmente feito em Fase 2, aqui polimento final + nomes lore + áudio ambiente bioma
- `config.js`: ENEMIES renomear para Rastejante da Névoa, Saúva Corrompida, etc (se ainda não)
- `audio.js`: SFX ambiente bioma por mapa (vento Planície, grilos Floresta, água Pântano, vento areia Deserto, folhas Outono, vento gelo Pico)
- Cristais geométricos com partícula memória subindo por bioma
- **Arquivos:** `game/js/config.js`, `game/js/audio.js`, `game/js/render.js`

**✅ Verificação Fase 6:**
- [ ] Todos inimigos com nome lore "da Névoa" / "Corrompida" / "Pálida"?
- [ ] VFX névoa nos olhos + rastro pálido consistente em todos tipos?
- [ ] Cristais âmbar/violeta com luz interna + partícula memória?
- [ ] Áudio ambiente bioma toca durante cutscene + gameplay? Não conflita com música?
- [ ] Commit: `fase 6: inimigos filhos névoa final + cristais + audio ambiente`

---

### FASE 7 — Formigueiro Interno Renomeado Total + VFX + Eras Mundo Muda
**Escopo:** P14=B, P19=C, P9=B
- `config.js`: CHAMBERS renomeados lore com lore/tip/per/vfx
  - nursery → BERÇO DE SEDA DA TECELÃ
  - pantry → VENTRE DE ÂMBAR DA DESPENSA
  - barracks → ARENA DE MANDÍBULAS DA GUERRA
  - fungus → JARDIM ETERNO DA CORTADEIRA
  - refinery → CÂMARA DE MEMÓRIA DA ESSÊNCIA
  - royal → CÂMARA DA SILENCIOSA (coroa fungo/seda luz âmbar)
- `nest.js`: VFX por câmara (seda flutuando, mel escorrendo gotas, esporos, cristal hexagonal, luz âmbar, faíscas guerra)
- `world.js`: Eras — G.save.era, trilhas seda, fungo extra Era≥3, portas extras a cada 2 Eras, Era≥9 estradas musgo permanentes
- **Arquivos:** `game/js/config.js`, `game/js/nest.js`, `game/js/world.js`

**✅ Verificação Fase 7:**
- [ ] Câmaras com nomes lore completos no HUD formigueiro?
- [ ] VFX seda flutuando no Berço? Mel escorrendo + gotas no Ventre? Esporos no Jardim? Cristal hexagonal na Memória? Luz âmbar + coroa na Silenciosa? Faíscas + aura vermelha na Arena?
- [ ] Tooltip de cada câmara mostra lore + tip + per + vfx?
- [ ] Mundo muda por Era: Era 1 vale vazio, Era 5 estradas musgo, Era 10 trilhas postas? Testar G.save.era=0,5,10
- [ ] Mais seda, portas, fungo por Era visível no mapa?
- [ ] Performance: VFX formigueiro não derruba FPS?
- [ ] Commit: `fase 7: formigueiro rename total VFX + eras mundo muda`

---

### FASE 8 — Final Pálida Protótipo + Profecias + Polimento + Preview Final
**Escopo:** P10=A, P5, P21=C
- `cutscenes.js`: Pálida 3 painéis HQ (marionete névoa forma formiga rainha ancestral, fios névoa, olhos escorrendo memória)
- `enemies.js`/`config.js`: Pálida como boss final 6000 HP 3 fases (ficha técnica LORE.md) — protótipo
- `meta.js`: Profecias 16 vaticínios da Matriarca com cristais que acendem ao cumprir
- `game.js`: Tela vitória Era + linha Era + coração âmbar, derrota "RAINHA TOMBOU. MAS ESSÊNCIA ALIMENTA PRÓXIMA GERAÇÃO" + semente
- Polimento geral, teste preview completo 6 mapas + Pálida
- **Arquivos:** todos

**✅ Verificação Fase 8 (Final):**
- [ ] Pálida desenhada como marionete névoa forma formiga rainha ancestral, sem humanoide? Fios névoa visíveis?
- [ ] 3 fases Pálida funcionam? Fase1 ferrão arco + invocação, Fase2 teleporte + poças burn + Lamento inverte controles, Fase3 coração âmbar pulsa tudo ao mesmo tempo?
- [ ] Profecias 16 vaticínios com cristais que acendem?
- [ ] Tela vitória mostra Era atual + linha Era + coração âmbar? Derrota mostra semente caindo na Árvore?
- [ ] Preview completo: jogar do início ao fim 6 mapas + Pálida sem crash? 60 FPS?
- [ ] Checklist Lore-Total completo (ver seção 11) 100%?
- [ ] Documentação final atualizada?
- [ ] Commit final: `fase 8: pálida protótipo + profecias + polimento final`
- [ ] PR aberto de `arena/...` para `main` com descrição das 8 fases?

---

## 11. Checklist Lore-Total Final

| Sistema | Conectado à LORE? | Como? | Fase | Status |
|---------|-------------------|-------|------|--------|
| HUD vida rainha | ✅ | Vaso âmbar + coroa fungo/seda + pulso Pálida | 1 | Implementado |
| HUD comida | ✅ | Folhas fungo + mel, muda por bioma | 1 | Implementado |
| HUD essência | ✅ | Cristal geométrico + partículas âmbar/violeta | 1 | Implementado |
| Habilidades 11 castas | ✅ | VFX aura+partícula+som lore | 2 | Implementado |
| Árvore Evolução | ✅ | Genealógica + frutos mini-árvores por mapa | 3 | Parcial (lógica compra pendente) |
| Progressão 6 mapas | ✅ | 6 degraus + mural cutscene 8 layers | 5 | Parcial (Panel1 8/8, Panel2 3/8, Panel3 0/8) |
| Bosses 6 + Pálida | ✅ | Arena lore + fase2 + lição | 4 | Implementado (Pálida protótipo pendente fase 8) |
| Inimigos 7 tipos | ✅ | Filhos Névoa pálidos + rastro | 2/6 | Implementado |
| Gameplay cérebro | ✅ | Feromônio visível tecla H | 1 | Implementado |
| Loading / Transição | ✅ | Frases Noite Branca + cutscene HQ 3.5s | 5 | Implementado |
| Cutscenes | ⏳ | 8 layers parallax 320x180 HQ 3 painéis | 5 | Parcial 11/24 layers Noite Branca |
| Formigueiro | ✅ | Câmaras nome lore + VFX seda/fungo/mel/cristal/coroa/guerra | 7 | Implementado |
| Eras / Ascensão / Profecias | ✅ | Eras mundo muda + profecias 16 | 7/8 | Eras implementado, profecias pendente fase 8 |
| Personagens não-humanóides | ✅ | Regra 8 B+C | 2 | Implementado |

---

## 12. Progresso Atual (2026-09-22)

**Implementado até agora (commit 37b3e4d):**
- Fase 1: 100% (HUD orgânico + feromônio H)
- Fase 2: 100% (VFX casta + inimigos pálidos + cristais)
- Fase 3: 70% (FRUIT_TREES + HUD frutos, falta lógica compra integrada state.js)
- Fase 4: 100% (bosses fase2 + frases lore + render phase2)
- Fase 5: 35% (cutscenes.js sistema 100%, Panel1 8/8, Panel2 3/8, Panel3 0/8 — bloqueado limite 10 imagens/turno)
- Fase 6: 90% (inimigos + cristais + audio typewriter, falta áudio ambiente bioma)
- Fase 7: 100% (formigueiro rename total + VFX + eras mundo)
- Fase 8: 10% (estrutura Pálida em LORE.md e cutscenes.js def, falta implementação boss final)

**Próximo passo imediato:**
1. Gerar 5 layers restantes Panel2 + 8 layers Panel3 (13 imagens) em próximos turnos (limite 10/turno)
2. Implementar compra lógica FRUIT_TREES em state.js
3. Áudio ambiente bioma
4. Pálida protótipo Fase 8

---

## 13. Regras de Trabalho Aplicadas

- **Regra 1:** Perguntas A/B/C/D antes de implementar — 23 perguntas respondidas
- **Regra 2:** Pesquisar inspirações indies na web antes das perguntas — 6 fontes citadas [1]-[6]
- **Regra 6:** Alta resolução pixel art harmônico — cutscenes 320x180 high-res reduzido
- **Regra 7:** Preview ao vivo a cada fase — servidor 0.0.0.0:8000
- **Regra 8:** Nada humanoide — implementada em REGRAS_DE_TRABALHO.md
- **Nova Regra Fases:** Nunca implementar tudo de uma vez — 8 fases com verificação obrigatória

---

*FUMIGA é fictício; as Onze não. Paraponera fere de verdade, Cataglyphis corre de verdade, Megaponera cura de verdade — a natureza escreveu a parte difícil desta história muito antes de nós.* — LORE.md

**Inspirações citadas:**
- Parallax 4-6 layers [1](https://moxica.com/parallax-game-background-for-indiegames/) [2](https://cleanassets.itch.io/free-parallax-background-pack)
- Hollow Knight lore tablets [3](https://github.com/Korzer420/LoreMaster)
- Vampire Survivors skill tree [4](https://www.reddit.com/r/Games/comments/wihgyu/soulstone_survivors_game_smithing_action/)
- Indie Tales 6 layers [5](https://uppon-hill.itch.io/indie-tales-parallax)
- Non-humanoid list [6](https://www.reddit.com/r/gamingsuggestions/comments/1ivfjbo/games_where_you_play_a_nonhumanoid_like_stray_or/)

---
**FIM DO DOCUMENTO — 23 RESPOSTAS SALVAS, 8 FASES COM VERIFICAÇÃO, IMPLEMENTAÇÃO EM FASES OBRIGATÓRIA**

<!-- FIM ORIGINAL: DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md -->

---

<a id="fonte-decisoes-da-mega-atualizacao"></a>

## Conteúdo integral 4 — Decisões consolidadas da mega atualização

**Arquivo de origem:** [DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md](DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md)

<!-- INICIO ORIGINAL: DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md -->
# ✅ DECISÕES FINAIS — MEGA ATUALIZAÇÃO LORE-TOTAL
**Data:** 2026-09-22
**Status:** TODAS AS 23 PERGUNTAS RESPONDIDAS — INICIANDO IMPLEMENTAÇÃO FULL 7 DIAS

## Respostas Consolidadas do Usuário

| # | Pergunta | Escolha | Detalhe |
|---|----------|---------|---------|
| P1 | HUD lore level | **C) Total orgânico vivo por bioma** | HUD que pulsa, respira, muda por bioma. Textura quitina/cera, não plástico. |
| P2 | Parallax layers | **C) 8 camadas cinema** | sky, distant, mid, ground, foreground, particles, VFX, vignette |
| P3 | Não-humanóide | **B+C) Estrito expressivo + fofo** | Olhos grandes tipo Hollow Knight OK, capacete fofo OK, mas nunca humano |
| P4 | Primeira cutscene | **A) Noite Branca, cena por vez estilo HQ Dead Cells** | 3 painéis por cutscene, cada painel 8 layers |
| P5 | Boss fase 2 | **C) Sim com mecânica nova** | <50% vida: Tamborilador chain 3→5, Caçadora invisível, etc |
| P6 | Árvore visual | **B custom) Árvore literal + frutos = mini árvores de habilidades liberadas por mapa** | Tronco Real, galhos Guerra/Coleta/Criação, frutos são mini-árvores que desbloqueiam conforme avança mapas |
| P7 | Habilidades VFX | **B) Médio: aura + partícula + som + ícone lore** | Equilíbrio performance/impacto |
| P8 | Loading lore | **B) Cutscene curta 3-5s HQ Dead Cells com layers + frase + dica** | HQ quadrinhos |
| P9 | Rainha design | **B) Coroa fungo/seda + luz âmbar** | Símbolo orgânico, não humano |
| P10 | Pálida design | **A) Marionete névoa forma formiga rainha ancestral** | Fiel LORE.md, terror sutil |
| P11 | Itens cristais | **A) Cristais geométricos com luz interna + partícula memória** | Âmbar = memória Colônia, violeta = Névoa |
| P12 | Ordem implementação | **A) HUD → VFX → Árvore → Bosses → Cutscenes HQ → Inimigos → Formigueiro → Pálida** | Do visível para épico |
| P13 | Inimigos visual | **C) Redesign pálido/branco filhos da Névoa** | Todos com tom pálido |
| P14 | Formigueiro lore | **B) Renomeia total com VFX seda/fungo/mel** | Ventre Âmbar, Jardim Eterno, Câmara Silenciosa |
| P15 | Resolução parallax | **C) 320x180 estilo Indie Tales upscale nearest** | Pixel gigante, Celeste style |
| P16 | HQ painéis | **A) 3 painéis por cutscene** | Intro, conflito, gancho |
| P17 | Estilo pixel cutscene | **B) Mais detalhado high-res depois reduzido** | Cutscenes mais ricas que gameplay, mesma paleta violeta/âmbar |
| P18 | Feromônio visível | **B) Tecla H — névoa verde comida, vermelha perigo** | Lore total, mostra o que formiga sente |
| P19 | Eras visual | **C) Mundo muda por Era: mais trilhas, seda, portas** | Persistente evolui |
| P20 | Áudio narração | **B) Texto animado letra por letra + SFX ambiente bioma** | Sem voz humana, mantém Rainha Silenciosa |
| P21 | MVP escopo | **C) Full 7 dias** | Tudo: HUD total + VFX + Árvore mini-árvores + 6 cutscenes + bosses fase2 + inimigos pálidos + Pálida + Eras |
| P22 | HUD bioma muda | **A) Sim, muda por bioma** | Folha verde Planície, musgo Floresta, areia Deserto, dourado Bosque, gelo Pico |
| P23 | Cutscene trigger | **C) Ambos auto primeira vez + biblioteca memórias** | Biblioteca "MEMÓRIAS DA COLÔNIA" |

## Implicações Técnicas

### HUD Orgânico Total por Bioma (P1+P22)
- Fundo: textura quitina/cera gerada procedural por bioma (cor base MAPS[].ground + overlay quitina)
- Vida Rainha: gaster desenhado com coroa fungo/seda (P9), pulsa <30% com veias vermelhas Pálida
- Comida: ícone folha cortada (Cortadeira) + gaster mel (Pote-de-Mel) — muda por bioma: Planície trevo, Floresta cogumelo, Pântano alga, Deserto semente, Bosque folha outono, Pico líquen
- Essência: cristal geométrico (P11) com partículas subindo âmbar/violeta
- Onda: Trilha Feromônio com formigas andando
- Minimapa: mapa trilha feromônio, não satélite
- XP: Anéis Árvore

### Parallax 8 Layers 320x180 (P2+P15+P16+P17)
- Resolução base 320x180 upscale 3x para 960x540 com nearest neighbor (pixel gigante respirando)
- 8 layers por painel:
  1. layer0_sky — céu + lua + estrelas
  2. layer1_distant — montanhas/árvores distantes
  3. layer2_mid — ruínas/formigueiro médio
  4. layer3_ground — chão textura solo
  5. layer4_foreground — vinhas/pedras frente (blur leve para profundidade [1])
  6. layer5_particles — vaga-lumes, essência, pollen
  7. layer6_vfx — névoa branca, bruma, luz âmbar
  8. layer7_vignette — vinheta gótica
- Velocidades: 0.01, 0.03, 0.06, 0.08, 0.15, 0.04+sway, 0.02, 0
- Estilo: pixel art detalhado high-res reduzido, paleta violeta/âmbar, contorno limpo, harmonia Fumiga
- Primeiro: Noite Branca 3 painéis HQ Dead Cells

### Não-Humanóide B+C (P3)
- Olhos grandes expressivos OK (Hollow Knight), capacete/armadura fofa OK (Bug Fables)
- Proibido: olhos frontais humanos, boca humana, mãos humanas, roupas humanas, bípede humano, rosto humano
- Rainha: formiga rainha com coroa fungo/seda orgânica (não coroa humana)
- Pálida: marionete névoa forma formiga rainha, fios névoa, olhos escorrendo memória

### Árvore Mini-Árvores por Mapa (P6)
- Tronco = Real, galhos = Guerra/Coleta/Criação
- Frutos não são rainhas mortas, são mini-árvores de habilidades que desbloqueiam conforme avança mapas
- Ex: Ao vencer Planície, libera mini-árvore "Lições do Tamborilador" com 3 nós
- Visual: árvore literal com seiva dourada correndo nas conexões compradas, raízes = Colônia Ancestral

### Boss Fase 2 Mecânica (P5)
- <50% vida: mecânica nova + VFX névoa + frase lore
- Tamborilador: chain 3→5, thump range maior
- Caçadora: invisível 1s (fog) + pounce longe
- Sombra Alada: shriek inverte controles 0,8s (proto Pálida)
- Matriarca: spit 3 direções + frenesi
- Galhada: folhas caindo curam? luta triste
- Devastador: revela Névoa subiu atrás, dropa mapa Topo

### Cutscenes HQ Dead Cells (P4+P8+P16+P20+P23)
- 3 painéis por cutscene, estilo HQ Dead Cells (bordas grossas, balões feromônio, não humanoide)
- Texto animado letra por letra com som máquina escrever
- Trigger: auto primeira vez ao entrar mapa/boss + biblioteca "MEMÓRIAS DA COLÔNIA" no menu para rever
- Loading: cutscene curta 3-5s com frase lore + dica gameplay

### Inimigos Pálidos (P13)
- Redesign sprites: tom pálido/branco, olhos névoa branca, rastro pálido
- Nomes: Rastejante da Névoa, Saúva Corrompida, Ceifadora Pálida, etc.

### Formigueiro Renomeado (P14)
- Berçário = Berço de Seda da Tecelã
- Fungário = Jardim Eterno da Cortadeira
- Despensa = Ventre de Âmbar da Despensa
- Quartel = Arena de Mandíbulas da Guerra
- Refinaria = Câmara de Memória da Essência
- Real = Câmara da Silenciosa

### Feromônio Tecla H (P18)
- Segurar H mostra campos: verde comida, vermelho perigo, com névoa
- Lore: "A COLÔNIA VÊ COM CHEIRO"

### Eras Mundo Muda (P19)
- Era 1: vale vazio
- Era 5: trilhas viram estradas musgo, chuva encontra túneis
- Era 10: colônia já é paisagem, mapa já nasce com trilhas postas
- Visual: mais seda, mais portas, mais fungo por Era

## Ordem Implementação Full 7 Dias (P21+P12)

**DIA 1-2: HUD Orgânico Total por Bioma + Feromônio H**
**DIA 3: VFX Habilidades 11 castas Médio + Inimigos Pálidos**
**DIA 4: Árvore Mini-Árvores por Mapa**
**DIA 5: Bosses Fase 2 Mecânica + Frases Lore**
**DIA 6: Cutscenes HQ Noite Branca 3 painéis x 8 layers 320x180 + Loading HQ + Biblioteca Memórias**
**DIA 7: Formigueiro Renomeado + Eras Mundo Muda + Pálida protótipo + Polimento + Preview**

## Pipeline Arte Frações (P2)

Nunca 1 imagem. Sempre 8 PNGs transparentes 320x180:

```
game/assets/cutscenes/noite_branca/
  panel1_intro/
    0_sky.png
    1_distant.png
    2_mid.png
    3_ground.png
    4_foreground.png
    5_particles.png
    6_vfx.png
    7_vignette.png
  panel2_conflito/
    ...
  panel3_gancho/
    ...
```

Cada layer: alta resolução, pixel art detalhado, paleta violeta/âmbar, sem humanoide.

## Próximo Passo Imediato

1. Implementar HUD orgânico total por bioma (Fase 1)
2. Gerar 8 layers painel 1 Noite Branca (320x180, pixel art detalhado, não-humanóide)
3. Abrir preview e validar

---
**APROVADO PARA IMPLEMENTAÇÃO**

<!-- FIM ORIGINAL: DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md -->

---

<a id="fonte-progresso-historico"></a>

## Conteúdo integral 5 — Registro histórico de progresso da mega atualização

**Arquivo de origem:** [PROGRESSO_MEGA_ATUALIZACAO.md](PROGRESSO_MEGA_ATUALIZACAO.md)

<!-- INICIO ORIGINAL: PROGRESSO_MEGA_ATUALIZACAO.md -->
# PROGRESSO — AMPLIAÇÃO: SETE FRUTOS / 70 NOVOS PODERES (2026-09-24)

**Entrega posterior ao registro de Fase 3 abaixo.** Escolhas confirmadas pelo
usuário: poderes novos **globais**, combináveis entre mapas; preparar a sétima
árvore sem implementar agora o Topo/Pálida. Branch mantida:
`arena/01a0d3f5-fumiga-goat`; nenhuma mudança de branch, commit ou push solicitado.

- Sete portas na copa da árvore literal; cada uma abre sua própria miniárvore
  com dez melhorias distintas, três caminhos e um ápice. Seleção mostra detalhes;
  só EVOLUIR gasta essência. Voltar/Escape permitem retornar à árvore principal.
- 49 nós base + 18 legados preservados + 70 novos = **137 definições**.
  As 18 compras antigas ficam na aba LEGADO, com IDs, preços e efeitos locais
  preservados. As 60 novas melhorias dos seis mapas existentes são obtíveis.
- A morte do chefe correto na campanha libera só o fruto correspondente.
  Chefe errado, sobrevivência e vitória no Pico não liberam a Pálida.
  O sétimo fruto oferece prévia de dez poderes, mas permanece incomprável,
  inclusive se `clearedMaps.topo` vier marcado em um save alterado.
- Consumidores reais de dano, projéteis, coleta/depósito, nascimento/morte,
  vida/barreiras/resgates, cura, visão, experiência e cristais. Contadores por
  expedição/unidade; limites de frequência e explosões secundárias não recursivas.
- Catálogo completo das 70 habilidades, custos e temas em `MEGA_ARQUIVO.md`.
- Testes: **23/23** na bateria completa; 70 efeitos individualmente, seis mortes
  reais de chefes, coleta/depósito/nascimento/projéteis reais e simulação com 60
  poderes combinados. Navegador: 548 inspeções de detalhes (137 × duas fontes ×
  PC/mobile), sete entradas e abas por plataforma; 78 compras persistidas por
  perfil, com recarga e Era sem duplicação. Inspeção geral: 30 cenas sem erro JS,
  HTTP ou glifo ausente. HUD isolado: **58,38 FPS**, 1800 frames, limiar 55.
- Revisão encontrou e corrigiu um multiplicador invertido no intervalo de coleta,
  preservou dano fracionário quando não há redução plana e ampliou áreas dos
  cartões/confirmação para 44 px lógicos. Sem substituir a fonte pixel.
- Limitação: sétimo mapa/Pálida ainda não jogáveis. Balanceamento de longo prazo
  das novas combinações requer playtest humano; os testes não o substituem.
- Próxima etapa: validação do usuário e, futuramente, Fase 8 para ligar a vitória
  legítima da Pálida à árvore preparada. Não declarar essa vitória implementada.

---

# PROGRESSO — FASE 3: ÁRVORE GENEALÓGICA FINALIZADA NO ESCOPO ATUAL (2026-09-24)

**Branch:** `arena/01a0d3f5-fumiga-goat`. **Pedido:** finalizar a Fase 3.
**Decisões confirmadas nesta sessão:** árvore literal com frutos, substituindo os
anéis orbitais; cumprir as descrições dos bônus, preservando preços/valores existentes;
dependências da Pálida explicitamente futuras. Isto substitui a antiga escolha visual
“anéis ao redor da raiz”, sem apagar o histórico.

## Auditoria antes da implementação

O código já possuía `FRUIT_TREES`, compra com essência, requisitos, save de nós e
`clearedMaps` por vitória de campanha. Não foi preciso recriar a persistência.
Porém, vários efeitos não correspondiam às descrições: bônus locais eram globais,
visão da batedora aumentava alcance de ataque, velocidade da Tecelã alterava chocagem,
velocidade da Prata alterava frequência de arrancada, +1 essência por cristal virava
+10%, e o bônus contra chefes estava no handler de inimigos comuns.

## Entrega

- **Árvore literal em Canvas:** tronco Real, galhos Guerra/Coleta/Criação, copa de
  seis frutos, raízes da Colônia Ancestral com névoa, folhagem que muda com compras,
  seiva dourada nas conexões compradas e chime nos lendários. Desenho determinístico
  em código, sem PNGs pesados ou novas dependências de produção.
- `tree_layout.js` separa coordenadas visuais de dados de progressão: **49 nós
  originais + 18 de frutos = 67**. IDs, pré-requisitos, custos e saves existentes
  preservados. Teste geométrico cobre os raios dos 67 nós, não apenas o HUD.
- Panorama VER TUDO inclui copa e raízes. Indicadores de ramos/frutos aproximam suas
  regiões; arrasto, roda e pinça mantidos. Detalhes fixos com fonte normal/grande.
- **Compra explícita:** selecionar abre detalhes sem gastar essência; botão EVOLUIR
  mostra disponibilidade/custo e confirma a compra. Bloqueio por mapa, saldo,
  pré-requisito e nível máximo continuam no estado, não apenas no desenho.
- Contagem de progresso inclui os 67 nós. Brilho/contadores dos frutos distinguem
  desbloqueio e compra. Partículas e animações da árvore respeitam efeitos reduzidos.
- **Bônus locais corrigidos:** velocidade da Planície (inclusive operárias), resistência
  ao THUMP, comida; visão das batedoras/velocidade das Tecelãs/cura na Floresta;
  velocidade da Prata, resistência à inversão e +1 por unidade de cristal no Pântano;
  dano/população/essência no Deserto; comida/vida dos tanques/cura no Outono;
  dano contra chefes no Gelo. Removidos vínculos globais incorretos e extras não descritos.
- Veteranas têm atributos recalculados ao migrar de mapa, preservando proporção de
  vida. Bônus de cura do Outono também alcança cura da rainha e recuperação de migração.
- `Névoa Revelada`: efeito antes vago quantificado em **+25% no contraste do feromônio**
  no Gelo; custo de 80 mantido. **Ver Pálida no minimapa continua futuro (Fase 8)**,
  indicado na descrição; não foi inventado um chefe para declarar esse efeito pronto.
- `Topo do Mundo` mantém +1 Era imediata, apenas na primeira compra, custo 120 e
  requisitos preservados. Recarregar o save não concede Era novamente.
- **Mobile:** no painel expandido (+) há OLFATO ligado/desligado, equivalente ao H,
  para que o efeito de Névoa Revelada também possa ser usado por toque. Sem duplicar
  gameplay nem reintroduzir os seis atalhos redundantes removidos na entrega anterior.
- Consultas de frutos usam índice `Map` imutável, evitando buscas repetidas por nó.

**Referência:** crescimento visual de progressão permanente em Rogue Legacy 2,
adaptado à colônia e sem copiar arte:
[2](https://arstechnica.com/gaming/2022/05/rogue-legacy-2-review-a-perfect-sequel-to-a-great-game/).

## Verificação

- `npm test`: **20/20 passaram**, agora incluindo `fruits.mjs`.
- `fruits.mjs`: geometria de 67 nós; 18 compras, saldo, requisitos, limites, reload e
  save antigo; isolamento dos bônus nos seis mapas; atributos reais de unidades;
  coleta de orbes; THUMP/inversão pelos handlers reais; dano de chefe versus inimigo
  comum; seis desbloqueios por campanha e ausência de desbloqueio em sobrevivência;
  recalcular veteranas e +1 Era sem recompra.
- `npm run inspect:tree`: **268 inspeções de detalhes** (67 × PC/mobile × fonte
  normal/grande), sem achados de layout nem compra ao apenas selecionar; 18 compras
  por clique/toque em cada perfil persistiram após reload. Replay do teste também
  valida OLFATO ligado/desligado por toque. Capturas em `/tmp/fumiga-tree`.
- Auditoria focada de layout: **16 estados** de Árvore, Ajuda, Opções/Controles e
  HUD expandido PC/mobile, incluindo fonte grande onde configurada, sem achados.
- `npm run inspect`: 30 cenas PC/mobile, seis mapas por seleção controlada,
  nenhum erro JS, HTTP ou glifo faltando.
- `HUD_MIN_FPS=55 npm run inspect:hud`: seis biomas, H, acessibilidade, vida baixa,
  zoom, viewports mobile e ninho/onda; **56,70 FPS médios em 1.800 frames**, maior
  intervalo 50,1 ms. A primeira medição concorrente com outro Chromium deu 46,94 FPS;
  foi repetida isoladamente. Isso não garante desempenho em todo celular.
- Detectada falha intermitente anterior no teste mobile: dependia de encontrar uma
  formiga aleatória ainda na viewport após a introdução. O cenário agora cria um
  alvo controlado fora do HUD e continua verificando a seleção pelo toque real do motor.

**Limites:** não foi vencida uma campanha completa nem usado celular físico.
A indicação futura da Pálida não está implementada. Não foram geradas camadas de
cutscene nem alterado o chefe final. Layout e arte continuam sujeitos à aprovação
visual do usuário no preview; testes não substituem essa aprovação.

**Próximos passos:** validar o visual com o usuário; depois conferir a Fase 4
(arenas, chefes/fase 2 e frases) contra o código. Retomar cutscenes da Fase 5 somente
com confirmação, respeitando a decisão de mantê-las intactas nesta entrega.

---

# PROGRESSO — FECHAMENTO DAS CORREÇÕES DE INTERFACE (2026-09-24)

**Branch:** `arena/01a0d3f5-fumiga-goat`. **Pedido:** concluir as correções de
interface. **Escolhas confirmadas:** reorganizar mantendo a arte, com texto legível;
no mobile excluir botões duplicados e ações já atendidas por toque/gestos.

## Estado encontrado e correção do histórico

A consulta anterior se baseou no registro de ferramentas abaixo. Contudo, o checkout
inicial desta sessão já continha correções em MODO, AJUDA, ÁRVORE, PROFECIAS,
MEMÓRIAS, fim de expedição, HUD e analisador (sombras/recortes). A auditoria ANTES de
editar código passou nos **88 estados PC/mobile**. Portanto, os **750 achados** do
registro antigo não descrevem este checkout. Não atribuir essas correções anteriores
à implementação desta sessão. Este registro substitui a pendência genérica de
“correções de UI vêm a seguir”, preservando o histórico.

## Implementado nesta entrega

- **Memórias:** dois cartões por linha, quatro por página; duas páginas cobrem as
  oito memórias. Títulos e descrições quebram linhas sem redução automática para
  caber nos cartões. Fonte grande mantém seu aumento. Navegação Anterior/Próxima,
  contador de página, retorno à árvore e replay preservados.
- **Profecias:** quatro cartões por página e quatro páginas cobrem os 16 vaticínios,
  com descrições completas, recompensas separadas e fonte grande sem encolhimento
  automático nos cartões. Nenhuma alteração de recompensas ou progressão.
- **Mobile:** removidos seis botões DOM redundantes: Zoom +/− (pinça), Onda
  (Invocar no canvas), Ninho (Entrar no canvas), Chamar/Soltar (rodapé do ninho).
  Permanecem Centro, Rali e Pausa. Dentro do ninho a camada extra fica oculta:
  Escape ali significa sair, não pausar. Comandos de sair/chamar/soltar permanecem
  nos botões do próprio jogo.
- **Entrada do ninho no mobile reativada no canvas:** antes era ocultada por
  `!isTouchUI()` em favor do atalho DOM. Sua reativação impede perda de acesso
  após remover a duplicata. Validada por toque real, não apenas presença visual.
- **Legibilidade mobile:** rótulos dos três atalhos visíveis também na faixa lateral,
  ícones em texto sem dependência de glifos emoji, nomes acessíveis; dicas de toque
  no ninho e remoção da dica de teclado H no painel expandido mobile.
- **Enquadramento:** mantida proporção 16:9; no mobile paisagem sem letterbox suficiente,
  reserva mínima lateral impede os atalhos de cobrirem o canvas. Retrato continua
  com orientação recomendada para paisagem; não é um redesign vertical do jogo.
- **Testes:** `mobile.mjs` verifica apenas três atalhos e preserva cobertura de pinça;
  `layout-browser.mjs` cobre páginas adicionais e aceita `--extra` (960×540 e
  390×844). Novo `npm run inspect:ui` exercita cliques/toques reais e verifica que
  todos os títulos das oito memórias e 16 profecias continuam acessíveis.

**Referência pesquisada:** acessibilidade de Dead Cells (tamanho de HUD/textos),
adaptada à arte existente do FUMIGA, sem gerar novos assets:
[2](https://dead-cells.com/patchnotes/29).

## Verificação e limites

- `npm test`: **19/19 passaram**, incluindo boot, layout, mobile, assets, simulação,
  árvore, profecias, UI e sobrevivência.
- Auditoria ampliada `node game/test/layout-browser.mjs --extra`: **208 estados
  sem achados**, PC 1280×720, mobile 844×390, mobile 960×540 e retrato 390×844,
  com os estados de fonte grande configurados na suíte. Após os últimos ajustes
  no ninho/HUD/dicas, reexecutados os **57 estados RUN/NINHO nos três perfis mobile**:
  também sem achados. A suíte não cobre toda combinação possível de opções.
- `npm run inspect:ui`: navegação em todas as páginas, ida/volta, fonte normal/grande,
  replay da segunda página, ninho (entrar/comandos/sair), pausa/retomada e invocação
  de onda por toque no canvas. Sem erros JS/rede.
- `npm run inspect`: **30 cenas PC/mobile**, seis mapas por seleção controlada,
  sem erros JS, HTTP ou glifos ausentes. Última execução mobile: 60 FPS médios por
  mapa no ambiente headless; não é garantia para todo aparelho.
- Capturas de Memórias/Profecias com fonte grande, RUN 16:9/retrato e NINHO
  inspecionadas visualmente. Relatórios/capturas em `/tmp/layout-final`,
  `/tmp/layout-touch-final` e `/tmp/fumiga-inspect`, fora do Git.
- Não foi jogada uma campanha completa nem testado um celular físico. Nenhuma arte
  de cutscene, boss, balanceamento ou lógica dos frutos foi alterada.

**Próximo passo:** retomar a Fase 3 (compra/desbloqueio/persistência dos frutos e
polimento da árvore), após conferir as pendências contra o código e confirmar a direção.
MEGA ARQUIVO atualizado nesta mesma entrega conforme a Regra 12.

---

# PROGRESSO — AUDITORIA DE LAYOUT, FASE 1: FERRAMENTAS DE MEDIÇÃO (2026-09-24)

**Branch:** arena/01a0d13b-fumiga-goat · Pedido: analisar as telas de todo o jogo e ajustar
botões e textos para eliminar sobreposição, vazamento de caixa e o que dificulta a leitura
(PC e mobile). Entrega desta fase: **as ferramentas**; as correções de UI vêm a seguir.

| Peça | O que faz | Onde |
|---|---|---|
| Gravador de layout | por 1 frame grava a caixa de tinta de cada texto e cada painel/botão/caixa, em coordenada de canvas; separa camada mundo × interface e respeita o recorte das listas roláveis. No jogo normal custa um `if` por texto | `font.js` (`layoutRec`/`layoutBox`), ganchos em `ui.js`, `lore_hud.js`, `game.js` |
| Analisador | acusa: texto fora da tela, dois textos colidindo, texto vazando da caixa dona, texto invadindo botão alheio, botões sobrepostos e, no mobile, botão de toque (DOM) cobrindo o canvas | `debug.js` (`FUMIGA.auditarLayout()`) |
| Auditoria no navegador | 43 estados por perfil (todas as telas, 5 abas de OPÇÕES no fim do scroll, estados de expedição, e tudo de novo com FONTE GRANDE), PC 1280×720 e mobile 844×390 toque; PNG + `layout.json` por estado | `game/test/layout-browser.mjs` (`npm run inspect:layout`) |

**Primeira passada completa: 86 estados, 750 achados** — 434 colisões, 162 vazando, 105 fora
da tela, 4 sob botão, 45 de camada de toque. PC 355 · mobile 395. Com FONTE GRANDE quase dobra
(60 estados fonte normal = 268; 26 com fonte grande = 482). Piores telas: MEMÓRIAS (30, e 51
com fonte grande), PROFECIAS (43 com fonte grande), MODO (39), ÁRVORE (29) e ÁRVORE-DICA (32).
Confirmado e real, por exemplo: descrições das MEMÓRIAS (350–466 px) transbordam as colunas de
300 px e colidem com os botões VER e com a coluna seguinte; subtítulo das PROFECIAS (544 px)
vaza do cabeçalho de 440 px; no fim da expedição os rótulos colidem com os valores e o total
invade o botão da Árvore; rodapés saem da tela (PROFECIAS, MEMÓRIAS, AJUDA); no mobile os
botões de toque ONDA/RALI/NINHO/PAUSA cobrem o ENTRAR (B), o último card da loja de irmãs e as
dicas de rodapé — e as dicas de teclado do PC (ESQ/DIR/Q/B/H/ESC) aparecem sem teclado.
Telas limpas: OPÇÕES inteira (as 5 abas nos 2 perfis, até com FONTE GRANDE), expedição padrão
no PC e NINHO/CUTSCENE com fonte normal.

**Falsos positivos conhecidos** (afinar na fase de correção antes de confiar no número exato):
cópias de sombra do mesmo texto no TÍTULO e rótulos de custo dos nós da ÁRVORE desenhados fora
da vista — os números acima já os incluem.

**Bugs de ferramenta corrigidos nesta entrega:** os estados RUN-EXPANDIDO e RUN-FORMIGAS
procuravam os botões por regex aproximada, não achavam nada e auditavam a tela sem clicar
(agora id exato `hudMore`/`shopToggle`, com `console.error` quando o botão não é achado — o
RUN-FORMIGAS sozinho passou de 21 para 41 textos auditados); typo no filtro de sombras do
`test/layout.mjs` (`"rgba(10,8,18,0.9"` sem parêntese de fechar) fazia o ramo nunca casar.

**Próximos passos:** afinar o analisador, pesquisa de referências (Regra 2), perguntas de
decisão (Regra 1) e as correções de UI tela a tela, guiadas por `npm run inspect:layout`.

---

# PROGRESSO — FERRAMENTAS DE DESENVOLVIMENTO (2026-09-23)

**Branch:** arena/01a0d13b-fumiga-goat · Pedido: analisar e implementar o que acelera o desenvolvimento.
Escopo aprovado: itens 1–7 (navegador, modo debug, testes paralelos, correções de teste, CI, AGENTS.md).
Cutscenes mantidas como estão. CI bloqueia o merge até ficar verde.

| # | Item | Status | Onde |
|---|------|--------|------|
| 1 | Chromium headless no sandbox (CDN bloqueado → Chromium via npm) | ✅ | `tools/setup-dev.sh`, `game/test/lib/browser.mjs` |
| 2 | Inspeção no navegador PC+mobile, 30 cenas, erros/404/glifos/FPS | ✅ | `game/test/inspect.mjs` (`npm run inspect`) |
| 3 | Modo debug `?debug` (save isolado, telas diretas, seed, overlay F3) | ✅ | `game/js/debug.js`, ganchos em `main.js`/`game.js`/`state.js`/`font.js` |
| 4 | Bateria em paralelo + modo rápido | ✅ | `game/test/run-all.mjs`, `package.json` (`npm test`) |
| 5 | `treemap.mjs` consertado; `assets.mjs` checa literais de `drawText`; bug `▼`→`?` corrigido | ✅ | `game/test/treemap.mjs`, `game/test/assets.mjs`, `game/js/render.js` |
| 6 | CI GitHub Actions (headless + navegador + capturas) | ⚠️ pronto, inativo | `tools/ci/testes.yml` — o app do agente não tem a permissão `workflows`; o dono copia para `.github/workflows/` |
| 7 | Mapa do código para agentes | ✅ | `AGENTS.md` |

Achados da inspeção, ainda sem correção (pedem decisão do usuário): textos sobrepostos em
MEMÓRIAS, COMO JOGAR e no cabeçalho da ÁRVORE; no mobile, botões de toque cobrindo o
botão ENTRAR (B) e dicas de teclado visíveis na expedição.

---

# PROGRESSO MEGA ATUALIZAÇÃO — SESSÃO ATUAL

**Data:** 2026-09-22 (continuação)
**Branch:** arena/01a0c9ed-fumiga-goat

## ✅ VERIFICAÇÃO FASE 1 — Fundação Lore (HUD Orgânico Total por Bioma + Feromônio H)

Verificação feita em 2026-09-22 sobre o código atual do branch. Resultado: **FASE 1 100% FINALIZADA**.

| # | Item verificação Fase 1 | Status | Onde |
|---|-------------------------|--------|------|
| 1 | HUD muda cor/textura/nome por bioma (6 biomas) | ✅ | `game/js/lore_hud.js` BIOME_HUD + `game.js` drawBiomeTexture em todos os painéis + `config.js` MAPS loreName |
| 2 | Vida Rainha = gaster com coroa fungo/seda, pulsa <30% com veias vermelhas | ✅ | `drawGasterBar` (sprite `lore_gaster.png` 3 frames + fallback procedural) |
| 3 | Comida muda ícone/label por bioma (trevo/musgo/alga/semente/outono/gelo) | ✅ | `drawFoodIcon` + `lore_icons.png` 192x16 (12 ícones) + foodLabel por bioma |
| 4 | Essência = cristal geométrico hexagonal com partículas âmbar/violeta | ✅ | `drawEssenceCrystal` hexagonal + luz interna (polido na Fase 2, P11) |
| 5 | Onda = Trilha Feromônio com formigas andando | ✅ | `trailProgress` + `drawTrailAnt` 7 formigas em `game.js` |
| 6 | H mostra névoa verde comida / vermelha perigo + "A COLÔNIA VÊ COM CHEIRO" | ✅ | `drawPheromoneOverlay` + `drawPheromoneLegend` |
| 7 | Performance (cache painéis, névoa 30Hz pré-rasterizada, reducedFX) | ✅ | `lore_hud.js` panelCache/fogStamp; validado servidor + scan estático |
| 8 | Assets HUD servindo (panels/icons/gaster 200) | ✅ | `game/assets/ui/lore_*.png` — curl 200 em todos |

## ✅ IMPLEMENTAÇÃO FASE 2 — Habilidades Lore VFX Médio + Inimigos Pálidos (P7=B, P13=C, P11=A)

Implementado em 2026-09-22 neste branch.

| # | Item verificação Fase 2 | Status | Onde |
|---|-------------------------|--------|------|
| 1 | 11 castas disparam aura cor + partícula + som + ícone lore | ✅ | `lore_vfx.js` ANT_VFX (sons: spore/honey/pheromone/silk/healCast/slam/crystal) + hooks em `units.js` (attackMelee, spitAt, healer 0.66s, scout 2.5s/4s, tank guard 3s, weaver deposit, carry 0.5s) |
| 2 | Aura persistente por casta (1 elipse barata, sem gradiente) | ✅ | `drawAllyAura` em `lore_vfx.js`, chamada em `render.js` drawAnt |
| 3 | Gather essência spawna cristal geométrico que sobe | ✅ | `spawnMemoryCrystal` com partículas `shape:"hex"` + SFX.crystal |
| 4 | Inimigos comuns pálidos: véu screen #e8f4ff 0.28 + olhos #fff lighter + aura + rastro #c9bce8 | ✅ | `render.js` drawAnt (foes non-boss) + `enemies.js` rastro ~2/s |
| 5 | Cristais essência hexagonais com luz interna + memória subindo | ✅ | `drawEssenceCrystal` hexagonal + `drawHexCrystal` + `combat.js` drawOrbs núcleo hex + `particles.js` shape hex |
| 6 | Performance ≤30 partículas VFX/frame + gates áudio | ✅ | Orçamento `vfxAllow()` em `lore_vfx.js` + gates silk/honey/spore/crystal/crown/pheromone em `audio.js` |
| 7 | Sem humanoide (só inseto/fauna, Regra 8) | ✅ | Auras/elipses/hexágonos/olhos de névoa — nenhuma forma humana |
| 8 | Sintaxe + imports + preview | ✅ | `node --check` 8 arquivos OK, imports resolvidos 27/27, servidor 8000 no ar, assets 200 |

**Commit:** `fase 2: VFX casta médio + inimigos pálidos filhos névoa`

---

# PROGRESSO MEGA ATUALIZAÇÃO — SESSÃO ANTERIOR

**Data:** 2026-09-22
**Branch:** arena/01a0c8d1-fumiga-goat

## ✅ Implementado nesta sessão

### 1. VFX Médio por Casta (units.js + lore_vfx.js)
- `units.js` importa `triggerAntVFX` e `spawnMemoryCrystal`
- Gather burst dispara VFX `gather` + cristal se essência
- Melee attack dispara VFX `attack`
- Healer healPulse dispara VFX `healer/heal`

### 2. Formigueiro Rename Total Lore (config.js + nest.js)
- `CHAMBERS` renomeados:
  - nursery → **BERÇO DE SEDA DA TECELÃ** vfx seda +18% choco
  - pantry → **VENTRE DE ÂMBAR DA DESPENSA** vfx mel +15% comida
  - barracks → **ARENA DE MANDÍBULAS DA GUERRA** vfx guerra +12% dano
  - fungus → **JARDIM ETERNO DA CORTADEIRA** vfx fungo +1 comida/9s
  - refinery → **CÂMARA DE MEMÓRIA DA ESSÊNCIA** vfx cristal +15% essência
  - royal → **CÂMARA DA SILENCIOSA** lore coroa fungo/seda luz âmbar vfx coroa
- `nest.js` VFX por câmara:
  - Berço: seda flutuando linhas brancas com brilho
  - Ventre: mel escorrendo + gotas caindo
  - Jardim: esporos flutuando verde/roxo
  - Memória: cristais hexagonais geométricos girando
  - Silenciosa: luz âmbar radial + seda + coroa 3 picos fungo/seda
  - Arena: faíscas guerra + aura vermelha

### 3. Inimigos Pálidos Filhos da Névoa (render.js)
- `drawAnt` para foes non-boss: overlay screen #e8f4ff alpha 0.28, olhos #fff lighter, aura pálida elipse bodyR+6 alpha 0.12, rastro #c9bce8 8% chance
- `drawBoss` phase2: aura névoa pálida elipse 0.22 alpha + 3 orbs subindo sin(G.time) + coroa fungo/seda 3 picos #ffd479 + fox invisibleT overlay

### 4. Eras Mundo Muda (world.js)
- `genWorld` lê `G.save.era`
- Era >0: adiciona trilhas seda, fungo extra Era>=3, portas extras a cada 2 Eras, Era>=9 trilhas moss permanentes

### 5. Árvore Mini-Árvores Frutos (meta.js)
- `FRUIT_TREES` 6 mini-árvores por mapa com 3 nós cada:
  - Planície: Lições do Tamborilador
  - Floresta: Seda da Caçadora
  - Pântano: Bruma da Sombra
  - Deserto: Fúria da Matriarca
  - Outono: Coroa do Galhada
  - Gelo: Memória do Devastador (desbloqueia ERA+1)
- HUD frutos desenhados como círculos coloridos com brilho se comprado

### 6. Áudio Texto Animado (audio.js)
- Novos SFX: type (typewriter), silk, honey, spore, crystal, crown, pheromone
- Cutscenes já usam SFX.type() a cada 3 letras

### 7. HUD Orgânico + Feromônio H + Loading HQ (já existia, validado)
- `lore_hud.js` BIOME_HUD por bioma, drawBiomeTexture, drawGasterBar, drawPheromoneOverlay
- `game.js` KeyH overlay + barra gaster + anel XP + trilha feromônio onda
- `cutscenes.js` HQ 8 layers parallax, texto animado, loading 3.5s

### 8. Boss Fase 2 (enemies.js já implementado)
- <50% vida: phrase, burst, ring, mecânicas específicas por boss

### 9. Cutscenes Noite Branca
- Panel1: 8/8 layers completos 320x180 Dead Cells HQ (25MB total)
- Panel2: 3/8 layers (0_sky,1_distant,2_mid) — 5 pendentes por limite 10 imagens/turno
- Panel3: 0/8 pendente

## ⏳ Pendente (bloqueado por limite imagens)

- Panel2: 3_ground, 4_foreground, 5_particles, 6_vfx, 7_vignette
- Panel3: 8 layers completos
- Panel2+3 total 13 imagens ainda necessárias

Limite de 10 imagens por turno atingido — necessário continuar em próximo turno.

## 🎮 Preview

Servidor rodando em 0.0.0.0:8000 — https://8000-...e2b.app/game/
- Testar: HUD orgânico muda por bioma, H feromônio, formigueiro VFX, inimigos pálidos, boss fase2 aura, árvore frutos, cutscenes biblioteca MEMÓRIAS

## 📋 Checklist Aceitação

- [x] HUD total orgânico muda por bioma
- [x] Parallax 8 layers sistema pronto
- [x] Non-humanoid B+C Regra 8
- [x] Primeira cutscene Noite Branca HQ 3 painéis (1/3 completo, 2/3 parcial)
- [x] Boss fase 2 mecânica
- [x] Árvore total com mini-árvores frutos
- [x] VFX médio
- [x] Loading HQ cutscene
- [x] Rainha coroa fungo/seda
- [x] Pálida marionete névoa
- [x] Cristais geométricos
- [x] Inimigos redesign pálidos
- [x] Formigueiro rename total VFX
- [x] 320x180 + HQ 3 painéis + pixel detalhado high-res reduzido
- [x] Feromônio tecla H
- [x] Eras mundo muda
- [x] Audio texto animado
- [x] MVP full código
- [ ] Imagens Panel2+3 completas (bloqueio limite)

## Próximos Passos

1. Gerar 5 layers restantes Panel2 + 8 layers Panel3 (13 imagens) em próximos turnos
2. Implementar compra lógica FRUIT_TREES (integrar com state.js)
3. Polir árvore visual literal tronco+raízes
4. Teste final preview cutscenes biblioteca
5. Commit final + PR


<!-- FIM ORIGINAL: PROGRESSO_MEGA_ATUALIZACAO.md -->

---

<a id="fonte-historico-menu-planicie"></a>

## Conteúdo integral 6 — Histórico de implementação do menu e da Planície Viva

**Arquivo de origem:** [DOCUMENTO_FASES_IMPLEMENTACAO.md](DOCUMENTO_FASES_IMPLEMENTACAO.md)

<!-- INICIO ORIGINAL: DOCUMENTO_FASES_IMPLEMENTACAO.md -->
# FUMIGA GOAT — Documento de Implementação Menu Dead Cells V2 + Planície Viva FINAL 100%
**Data:** 2026-05-13  
**Branch:** arena/01a0bf64-fumiga-goat  
**Status:** TODAS FASES 1-6 FINAL 100% IMPLEMENTADAS

---

## ✅ FASE 1 FINAL 100% - Fundo Novo: Planície do Amanhecer Viva

**Escolhas do usuário travadas:**
- `4_camadas_apenas` (não 5)
- `tint_forte` (dia laranja quente / noite azul escuro 0.75 + 24 estrelas, 60s)
- `particulas` (luz formigueiro + partículas essência subindo)
- `azul_amarelo` (vaga-lumes azul #37e6c8 + amarelo #ffd479)
- `so_cristais` (sem correntes)
- `manter_sutil` (trilha 0.06 alpha)

**Implementação:**
- `drawTitleBg()` com 4 camadas high-res parallax real mouse + sin:
  - layer5 sky 0.01x + 0.005y, sin 6px
  - layer4 mountains 0.03x + 0.01y, alpha 0.96, sin 8px
  - layer3 main grass ruins anthill 0.08x + 0.025y, sin 6px
  - layer1 foreground vines 0.15x + 0.04y, sin 4px
- Ciclo dia/noite 60s exatos: `dayPhase = (time*0.016666)%1`, `dayT = sin(dp*TAU)*0.5+0.5`
  - Noite FORTE: `nightAlpha = (0.45-dayT)*1.65 max 0.7425 rgba(8,10,28)` + 24 estrelas 2.2px tw 0.35+sin*0.35*2.2
  - Dia FORTE: `dayAlpha = (dayT-0.72)*0.38 rgba(255,156,58)` + horizonte gradient rgba(255,140,40, dayAlpha*0.6)
- Luz formigueiro pulsante: pulse 0.75+sin(time*1.6)*0.22, radial 52px rgba(255,212,121,0.22*pulse) + 90px anel roxo rgba(199,125,255,0.08*pulse)
- Partículas essência: 12 unidades #c77dff/#ffd479/#37e6c8, x VIEW_W*0.72 ±15, y VIEW_H*0.62, vy -12..-30, vx ±4, life 0-1, alpha 0.3-0.8*(1-life), glow 2.2x
- Vaga-lumes: 10 unidades, y 300-420 baixo sobre gramado, vx ±9, vy ±5, size 1.5-3.7, col alternado azul/amarelo, blinkSpeed 1.2-3.2, blink 0.4+0.6*abs(sin), glow 3.5x
- Trilha sutil: 0.06 alpha stroke feromônio verde
- Cristais: 8 cristais nas ruínas #c77dff/#37e6c8/#6db7ff, sem correntes
- Fallback procedural `bakeTitleBg()` com chão gradiente #2c3d26→#1e2d1a, manchas, tufts, formigueiro central sombra+montículo #3a2a16/#5a3a22+entrada preta+pedrinhas, pilares góticos #1a1628, arco quebrado, árvores silhueta, arbustos, trilhas

---

## ✅ FASE 2 FINAL 100% - Logo: Pixel Gigante 5x Escala Respirando

**Spec:** `drawTitleLogo() escala 4.2 -> 5.0 + sin(time*0.6)*0.08 + sin(time*1.2)*0.02 secondary`

**Implementação:**
- Scale base 5.0 + breathing 0.08 + secondary 0.02 micro
- Glow externo radial pulsante atrás: `glowPulse = 0.12+abs(breathing)*0.8`, gradient #ffc44d 0.18 → #c77dff 0.08 → transparent
- Sombra projetada rgba(0,0,0,0.55) +5,+7
- Contorno preto duro 2px: 12 offsets ring [-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,-2],[-2,2],[2,2],[-1,0],[1,0],[0,-1],[0,1] color #0a0713
- Metal dourado 4 faixas horizontais clip:
  - 0.00-0.31 #fff0bd (ouro claro topo)
  - 0.29-0.55 #ffc44d (âmbar)
  - 0.53-0.79 #e08c22 (bronze)
  - 0.77-1.01 #96591a (bronze escuro base)
- Varredura brilho a cada 4.6s: period 4.6, ph<0.42, bx = x-90+(w+180)*t, fade sin(t*PI), clip rect 60px, lighter composite rgba(255,247,220,0.5*fade)
- Sparkle: quando fade>0.3, rect branco 2px + arc #ffd479 2+fade*2 glow
- Filete luz fixo topo: h*0.04, h*0.07 branco 0.5 alpha

---

## ✅ FASE 3 FINAL 100% - Animações Celeste: Pollen + Snow + Transições Assinatura

**Spec:** snow/parallax em drawTitleMotes() + transições assinatura por tela + notePointer

**Implementação:**
- `titleMotes` 40 subindo: vx ±6, vy -4..-22, size 0.5-2.5, alpha 0.1-0.7, col #c77dff/#37e6c8/#ffd479, phase TAU, glow 2.5x, tw sin(time*1.7+phase)
- `titlePollen` 45 caindo lenta Celeste: vy 3-11px/s, vx (random-0.5)*6 + sin(time*sway+phase)*3, size 0.6-2.4, alpha 0.2-0.7, col #fff6c8/#ffd479/#bfffa8, sway 0.3-1.8, tw sin(time*0.8+phase)
- `titleSnow` 18 neve Celeste FINAL: vy 8-22, vx ±2 + sin*5, size 1.0-3.2, alpha 0.15-0.55, col #e8f4ff/#c8e6ff, sway 1.2-3.7 maior que pollen, rot + rotSpeed ±0.4, desenho cruz + glow 1.4x
- `titleClouds` 8 nuvens parallax: vx 0.2-0.8, w 60-180, h 12-30, alpha 0.08-0.23
- `titleAnts` 6 formigas andando menu: x random, y VIEW_H-40-80, vx 18-40, bob TAU, type worker/soldier/scout, sombra + corpo #37e6c8/#8fd3ff/#ffd479 + rastro feromônio a cada 20 frames
- Transições assinatura `TRANS_LANG` por par:
  - PRETITLE>TITLE bloom 0.55 #ffd479
  - TITLE>MODE swipe dir 1 0.40 #37e6c8, MODE>TITLE swipe dir -1 0.34 #8f6fd6
  - TITLE>TREE zoom dir 1 0.44 #c77dff, TREE>TITLE zoom dir -1 0.40 #c77dff, RUN>TREE zoom 0.44, TREE>RUN zoom 0.40
  - TITLE>HELP iris 0.34 #6db7ff, HELP>TITLE iris 0.30 #6db7ff, RUN>HELP iris 0.32, HELP>RUN iris 0.30
  - TITLE>OPTIONS swipe dir 1 0.36 #ffb347, OPTIONS>TITLE swipe dir -1 0.32 #ffb347, RUN>OPTIONS zoom 0.36, OPTIONS>RUN zoom 0.32
  - MODE>RUN dissolve 0.50 #ffb347, TITLE>RUN dissolve 0.50, RUN>MODE dissolve 0.50, RUN>TITLE dissolve 0.55 #ff4d5a
- `transitionFx()` com scale/ox/oy/alpha por tipo: swipe push 38*dir, zoom 1±0.09, dissolve 1±0.03, fade/iris/bloom alpha 0.25
- `drawTransition()` 6 tipos:
  - fade radial vignette rgba(5,4,10,0.97*c)
  - bloom clarão radial #ffd479 flash pow(1-abs(p*2-1),2.2)
  - swipe 2 barras #08060f + fio luz tint + fagulhas 10 unidades
  - dissolve Bayer 8x8 matriz, blocos 4px, tint glow 0.16
  - iris máscara 1/4 tela destination-out circle, anel luz tint 0.55
  - wipe compat
- `notePointer()` em todos botões TITLE, MODE, OPTIONS, HELP, PAUSA, TREE, RUN

---

## ✅ FASE 4 FINAL 100% - Tela de Opções + Acessibilidade - 5 Abas + Sliders Visuais

**Spec:** Áudio (sliders), Vídeo (partículas/scanline/tremor/fullscreen), Controles (WASD+toque), Acessibilidade (Invencível, Dashes Infinitos, Câmera Lenta 0.5x, Fonte Grande), Idioma

**Implementação:**
- `OPTIONS_TABS` 5 abas: audio ♪ #37e6c8, video ◫ #6db7ff, controles ⌨ #ffb347, acess #7fd6a0, idioma A #ffd479, tabW 156 (128 mobile), tabH 36, gap 10 (8 mobile), sel color #000 + barra 3px tint
- `renderOptions()` com `drawSolidMenuBg("#0e0c1e")` + motes (inclui snow) + overlay 0.78 + dialogBox border #ffb347 accent #37e6c8
- **Áudio FINAL com sliders visuais:**
  - drawSlider function: label + % + barra fundo rgba(10,8,16,0.8) border #4a3a6e + preenchido gradient color→#1a1430 + handle branco 3px + color
  - MÚSICA slider #c77dff + mute toggle M
  - SFX slider #37e6c8 + botões +- 0.1
  - Barra visual 200px largura, 14px altura
  - Dica Celeste M muta
- Vídeo: particles, screenshake, scanline toggles, fullscreen toggle document.fullscreenElement, requestFullscreen/exitFullscreen, descrição parallax 4 camadas + ciclo 60s + highContrast border
- Controles: HELP_CONTROLS loop, mobile panel toque 104px, swipe cards arraste horizontal, WASD move câmera Q loja B formigueiro ESC pausa M som
- **Acessibilidade FINAL:**
  - 6 opções: invincible, infiniteDash, slowMo, bigFont, reducedParticles, highContrast com label, desc, color, toggle
  - `infiniteDash` FINAL: cooldown rally F 3s quando desligado, sem cooldown quando ligado + atkCd *0.3 (70% redução) em computeAntStats + visual ∞ no floatText
  - `bigFont` FINAL: já implementado em font.js `scale *= 1.3` quando ativo + highContrast sombra preta 1
  - Velocidade jogo 0.5x,1x,1.5x,2x botões, panel ACESSÍVEL ATIVO se invincible/slowMo/gameSpeed!=1
  - Rally cooldown variável `rallyCooldown` decrementa simDt, mostra recarga em floatText e na pausa
- Idioma: pt-BR 🇧🇷, en-US 🇺🇸, es 🇪🇸 com flag, desc, sel ATIVO/USAR, G.save.settings.language
- Swipe entre abas mobile: optionsSwipeX, justDown/justUp, dx>60 muda aba + vibrate 15 + SFX.uiClick

---

## ✅ FASE 5 FINAL 100% - Pausa com Mapa: 2 Colunas + Stats + Interativo + 104px

**Spec:** drawPause() 2 colunas esquerda 6 botões, direita mini-mapa interativo + stats expandidos

**Implementação:**
- Layout: leftW 360 (400 mobile), rightW 340 (380 mobile), totalW left+right+24, startX centralizado, py 48 (20 mobile), panelH 440 (560 mobile)
- Esquerda: dialogBox border #8f6fd6 accent #37e6c8, título PAUSA big 2 #ffd479, 6 botões Continuar #37e6c8, Opções #ffb347, Árvore #c77dff, Como Jogar #6db7ff, Reiniciar #ffb347, Sair #ff4d5a, btnW leftW-32, btnH 40 (104 mobile), gap 10 (12 mobile), notePointer + transition
- Direita FINAL interativo:
  - dialogBox border #4a3a6e accent #ffd479, título MAPA E STATUS
  - Mini-mapa: miniX rx+16, miniY py+44, miniW rightW-32, miniH 160, panel rgba(10,8,16,0.9) border #4a3a6e, world.mini draw, allies #37e6c8/#8fd3ff/#7fd6a0 2x2, foes #ff4d5a/#ffd479, anthill #ffd479 pulse, viewport câmera retângulo rgba(239,233,255,0.7)
  - **Interativo:** pointInRect hover borda #37e6c8 2px + texto "CLIQUE PARA MOVER CÂMERA" + mouse.justDown move cam.x/y = (mouse-mini)/sx,sy + SFX.uiClick + fogDrawMini
  - Stats expandidos:
    - modo nome color, mapa idx+1/MAPS.length + name, onda + abates, nível + comida fmt, essência + mutações #c77dff, pop + tempo, colônia FOME% GUERRA% CURA% #8f7bb5 0.75, headcount gather/explore/defend #9a8fc0 0.75, invencível #7fd6a0, infiniteDash ∞ #37e6c8 0.85, rally recarga #ff4d5a 0.8
  - ESC volta, M som, dica "ESC: VOLTAR • M: SOM • CLIQUE NO MAPA"

---

## ✅ FASE 6 FINAL 100% - Mobile: 104px + Swipe + Área Toque + Scroll Visual

**Spec:** iconButton e button altura mínima 88->104 auto quando isMobile, cards MODE swipe com scroll visual offset, área toque maior rodapé 44px, touch feedback vibrate

**Implementação:**
- `isMobileLayout()` = ontouchstart in window || innerWidth<900
- **Altura mínima automática 88→104px FINAL em ui.js:**
  - `button()` e `iconButton()` check `isTouchDevice()` && h<104 && id!=="hudMore" → y-=diff/2, h=104
  - `hitRect()` aumenta hitbox para 104px mínimo + 12px pad
- Botões TITLE: btnH 104 mobile vs 46 desktop, gap 14 vs 10
- Botões MODE: back 220x104 mobile vs 140x32 desktop
- **Cards MODE swipe FINAL com scroll visual:**
  - `drawModeCards(ctx, modes, hoverIdx, time, scrollOffset)` com `scrollVisual = scrollOffset*(cardW+gap)` e `startX = VIEW_W/2 - totalW/2 - scrollVisual`
  - `modeScrollOffset` 0..len-1, `modeSwipeX` justDown/justUp dx>50 muda offset ±1 + vibrate 15 + SFX.uiClick
  - Dots indicador: bolinhas em y+cardH+14, gap 12, 8px, sel #ffd479 5px vs 3px rgba(255,255,255,0.25)
  - Hover ainda funciona via modeRects com x shiftado
  - Touch feedback vibrate 20 ao clicar card
- Botões OPTIONS: tabW 128 mobile vs 156 desktop, tabH 36, btnH 40/36/32/34 vs 32/28/24/28, swipe entre abas dx>60
- Botões PAUSA: btnH 104 mobile vs 40 desktop, gap 12 vs 10, leftW 400 vs 360, rightW 380 vs 340, panelH 560 vs 440
- Botões HELP: back 104 mobile vs 36 desktop
- Botões RUN end: again/goTree 104 mobile vs 40 desktop, menu 104 vs 32
- **Área toque maior rodapé FINAL:**
  - TITLE footer: panel 12,VIEW_H-footerH-10,VIEW_W-24,footerH onde footerH 44 mobile vs 28 desktop, fill rgba(10,8,16,0.75) border 0.45, r 4, textos 0.85/0.8 scale mobile
  - MODE footer: panel 12,VIEW_H-footerH-8,VIEW_W-24,footerH com texto swipe + scroll visual ativo
  - Texto rodapé: v2.4 PLANÍCIE VIVA + ciclo + parallax + 5x escala + SNOW + geléia + vitórias + mapa + M: SOM + TOQUE 104PX SWIPE/MOUSE + FASES 1-6 FINAL
  - Touch feedback: navigator.vibrate(20) em botões principais TITLE/MODE quando mobile

---

## 📊 MENU FINAL 100% - Estrutura Completa

```
PRETITLE (FUMIGA gigante 5.2+sin*0.18 glitch cyan/roxo contorno brilho + COLONIA ETERNA + CLIQUE PARA JOGAR pulsante seta, 40 motes + 45 pollen + 18 snow + 10 fireflies + 12 essence)
  ↓ bloom 0.55s #ffd479
TITLE (logo 5.0+sin*0.08+sin*0.02 metal dourado 4 faixas varredura 4.6s + sparkle + glow pulsante, 4 camadas parallax 0.01/0.03/0.08/0.15 + ciclo 60s tint forte + luz formigueiro pulsante + partículas, botões lateral 104px mobile + rodapé 44px)
  ↓ swipe 0.40s #37e6c8 / swipe 0.34s volta #8f6fd6
MODE (4 cards Campanha/Sobrevivência/Enxame/Caçada lift 6px + swipe mobile scroll visual offset + dots indicador + 104px)
  ↓ dissolve 0.50s Bayer #ffb347
RUN (jogo principal, HUD, loja Q, formigueiro B, minimapa, ondas, mutações, chefões, rally F com cooldown 3s ou ∞ quando infiniteDash, atkCd *0.3)
  ↓ ESC pausa
PAUSA (2 colunas 6 botões 104px mobile, mini-mapa 160px interativo clique move câmera + viewport + foes + fog + stats expandidos pop/tempo/FOME/GUERRA/CURA/headcount/infiniteDash/rallyCooldown)
  ↓ zoom/iris/swipe
TREE (árvore evolução), HELP (como jogar), OPTIONS (5 abas com sliders visuais barra 200px + handle + audio + vídeo + controles + acessibilidade + idioma)
```

### Checklist Final 100%

| Feature | Status | Detalhe |
|---------|--------|---------|
| PRETITLE FUMIGA glitch | ✅ 100% | 5.2+0.18 breathing, cyan/roxo, contorno 2px, brilho superior, 50+ motes |
| TITLE parallax 4 camadas | ✅ 100% | 0.01/0.03/0.08/0.15 real mouse + sin, fundo removido exceto sky |
| TITLE ciclo 60s tint forte | ✅ 100% | 0.016666, noite rgba(8,10,28,0.7425) + 24 estrelas 2.2px, dia rgba(255,156,58,0.106) + horizonte |
| TITLE formigueiro luz pulsante + partículas | ✅ 100% | 52px + 90px + 12 essência vy -12..-30 |
| TITLE vaga-lumes azul+amarelo | ✅ 100% | 10 y 300-420 blink glow 3.5x |
| TITLE cristais só | ✅ 100% | 8 cristais sem correntes |
| TITLE trilha sutil | ✅ 100% | 0.06 alpha |
| TITLE logo 5x respirando | ✅ 100% | 5.0+0.08+0.02, glow pulsante 0.12+abs*0.8, metal 4 faixas, varredura 4.6s + sparkle |
| TITLE motes+pollen+snow+formigas | ✅ 100% | 40 motes + 45 pollen 3-11px/s + 18 snow 8-22px/s sway 1.2-3.7 cruz + 6 formigas + 8 nuvens |
| TITLE botões + rodapé 44px | ✅ 100% | lateral 104px mobile, rodapé 44px mobile 28 desktop, touch feedback |
| Transições assinatura | ✅ 100% | bloom/swipe/zoom/iris/dissolve Bayer + notePointer + transitionFx |
| MODE cards lift 6px + scroll visual + dots | ✅ 100% | scrollVisual = offset*(w+gap), swipe dx>50, dots #ffd479, vibrate |
| OPTIONS 5 abas + sliders visuais | ✅ 100% | barra 200px + handle + gradient + audio + vídeo + controles + acess + idioma + swipe |
| infiniteDash + bigFont | ✅ 100% | rallyCooldown 3s vs ∞, atkCd *0.3, bigFont scale 1.3 em font.js |
| PAUSA 2 colunas + mapa interativo + stats | ✅ 100% | interativo clique move câmera + viewport + foes + fog + pop/tempo/FOME/GUERRA/CURA/headcount |
| Mobile 104px auto + hitRect + vibrate | ✅ 100% | button/iconButton auto 104, hitRect 104+12, vibrate 15/20, footer 44px |
| Fundo sólido gótico outros menus | ✅ 100% | #0a0812/#0c0a18 sem parallax |

### Arquivos Modificados FINAL

- `game/js/render.js` → 4 camadas parallax + ciclo 60s tint forte + fireflies 10 azul_amarelo + essence 12 + snow 18 + logo 5.0+0.08+0.02 + glow + sparkle + modeCards scrollVisual + dots
- `game/js/game.js` → rallyCooldown + infiniteDash cooldown 3s vs ∞ + drawSlider visual + pause mapa interativo + footer 44px + mode scroll visual + vibrate
- `game/js/units.js` → computeAntStats atkCd *0.3 quando infiniteDash + import G
- `game/js/ui.js` → altura mínima auto 88→104 + hitRect 104px + touch feedback (já estava 95%, mantido)
- `game/js/font.js` → bigFont scale 1.3 + highContrast sombra preta (já estava)
- `game/assets/parallax/menu/` → 4 camadas finais transparentes

### Como Testar FINAL

1. Preview http://0.0.0.0:8000 ativo
2. PRETITLE: FUMIGA gigante respirando glitch + motes + pollen + snow cruz + fireflies
3. TITLE: mover mouse → céu 0.01x quase parado, montanhas 0.03x, gramado 0.08x, vinhas 0.15x frente; ciclo 60s noite azul 0.75 + estrelas → dia laranja; formigueiro luz pulsante + partículas subindo; logo 5x respirando com glow + varredura 4.6s sparkle; botões 104px mobile, rodapé 44px
4. MODE: 4 cards lift 6px, swipe horizontal muda scrollVisual + dots amarelo, clique joga
5. OPTIONS: 5 abas, áudio com barras visuais 200px + handle, vídeo fullscreen, acessibilidade infiniteDash com cooldown 3s vs ∞, bigFont 1.3x, slowMo 0.5x, gameSpeed 0.5-2x
6. RUN: F rally com recarga 3s (ou sem quando ∞), atkCd reduzido, HUD, loja Q, formigueiro B
7. PAUSA: 2 colunas 6 botões 104px, mini-mapa 160px interativo clique move câmera + viewport + foes + stats pop/tempo/FOME/GUERRA/CURA/gather/explore/defend

---

**FIM — FASES 1-6 FINAL 100% COMPLETAS**

<!-- FIM ORIGINAL: DOCUMENTO_FASES_IMPLEMENTACAO.md -->

---

<a id="registro-de-integridade"></a>

## Registro de integridade

Os tamanhos e hashes abaixo correspondem aos bytes dos arquivos de origem no
momento da consolidação. Os delimitadores e os textos de apresentação não fazem
parte dos blocos originais.

| Arquivo original | Bytes preservados | SHA-256 |
|---|---:|---|
| `REGRAS_DE_TRABALHO.md` | 16637 | `d6da0d428d9c73e359fc7c461f846ac4ca36daaa52a09872cc8ce18fe2eaeb91` |
| `LORE.md` | 15056 | `42075fe4334601f1a74834388c0155342b2a8a6c21e51afa6020e34a5260f493` |
| `DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md` | 30473 | `c642dd06d14e527bba6566458afa5293f697b0a3b981ef6301f6fafdfb9e856e` |
| `DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md` | 8179 | `2b05240cd9fef9fb33d8a08768164f60202437c886c1c5b83f250ee9cbb58637` |
| `PROGRESSO_MEGA_ATUALIZACAO.md` | 26142 | `b89b280976bb684a9cb5d4ab7113542429c264ec1dcce88899de765c65d788ac` |
| `DOCUMENTO_FASES_IMPLEMENTACAO.md` | 16113 | `065f79996d7ee89b3445cd231217067471be5b58792c36699c66146ed7a3965b` |

**Conferência reproduzível:** `node game/test/docs.mjs`.
O teste compara byte a byte cada bloco com seu arquivo original, confere os
hashes e verifica que todas as seis fontes aparecem exatamente uma vez.
Os READMEs da raiz e de `game/` não foram incorporados, conforme o escopo escolhido.

---
# REGISTRO — Manto da Névoa (2026-09-22, branch arena/01a0ca96)
Pedido do usuário: retirar os olhos brilhosos dos inimigos; todo inimigo com
fog branca animada em volta (spritesheet desenhada, um pouco transparente,
adaptada ao tamanho). Lore base: Névoa "branca, doce e silenciosa" (Prólogo),
PÁLIDA/ninho branco, Ascensão/NÉVOA PLENA.
Decisões (ask_user): manto = fog densa embaixo + véu fino em cima; remover
TODO o VFX pálido antigo; chefes também com fog (maior/densa); densidade média.
Entregue: `game/assets/sprites/fx/fog_mantle.png` (6x48x48, plasma
determinístico — sementes fixas + `-limit thread 1` + `-strip`, verificado com
`cmp`), seção Névoa em `tools/prepare_assets.sh`, `fog_mantle` no MANIFEST,
`bakeFog`/`fogFrame`/`FOG_FRAMES` em `game/js/assets.js`, manto em
`drawAnt`/`drawBoss` (`game/js/render.js`), rastro pálido removido de
`game/js/enemies.js`. Olhos/elipse pálida/aura removidos; orbes + coroa da
fase 2 mantidos. Suíte 13/16 (3 falhas pré-existentes, iguais ao baseline).

## Registro — TITLE: extensão lateral e revisão da vegetação (2026-09-22)

Escopo aprovado: estender as quatro camadas, sem zoom no render. Após rejeitar
alternativas iniciais, o usuário aprovou vegetação mais baixa com pontas finas e
montanhas pontudas mais alaranjadas, coerentes com o céu do pôr do sol.

- PNGs em `game/assets/parallax/menu/`: +128 px de cada lado; centro do céu e
  cenário principal preservado. Frente e montanhas revisadas conforme aprovação.
  Fundos sólidos/quadriculado dos arquivos gerados removidos no preparo.
- Principal e frente: +16 px inferiores para cobrir deslocamento vertical;
  vegetação frontal rebaixada 45 px no arquivo, sem alterar o movimento.
- `game/js/render.js`: desenho nativo 1:1, origem compensada pelas margens;
  coordenada zero válida e input limitado ao viewport. Mesmos assets no mobile.
- Reparador legado protegido contra sobrescrever as novas artes.
- Testes: 12 dos 13 testes documentados passaram; `lorehud.mjs` falha em
  "carregamento idempotente" (5 !== 3), também reproduzida no HEAD original
  extraído fora do checkout. Novo `title-parallax.mjs` passou.
- Chromium headless: boot → TITLE em PC e mobile (tap), capturas dos quatro
  cantos e centro; sem erros JS/HTTP. Inspeção identificou e removeu resíduo de
  quadriculado na crista das montanhas. Preview local na porta 8000.

## Registro — correção robusta do teste LORE HUD (2026-09-22)

Pedido: corrigir a falha identificada na validação da TITLE. Escopo aprovado:
correção do teste com proteção contra regressão, sem mudar visual/jogabilidade.

Causa: `game/test/lorehud.mjs` ainda esperava três atlas; o carregador atual usa
cinco (`panels`, `icons`, `gaster`, `textbox`, `kit`). O teste também enumerava
`colonia` como se fosse um sétimo bioma com célula de alimento, embora seja tema
neutro de menu. Não foi necessário modificar o carregador de produção.

Correções: lista explícita de arquivos/dimensões esperados; mesma promessa em
chamadas concorrentes e após resolução; nenhuma nova imagem em chamadas
posteriores; seis biomas separados do tema de menu; recortes e cache de caixas,
banners, molduras e quatro ícones do kit cobertos.

Validação: 13/13 testes documentados + `title-parallax.mjs` aprovados (14/14).
Chromium headless: PC e mobile do boot à expedição, introdução pulada pelo handler
real; cinco requisições únicas dos atlas, promessa reutilizada, sete temas
renderizados, sem erros JS/HTTP. Capturas do HUD inspecionadas. Preview :8000 ativo.
Este registro resolve a pendência de `lorehud.mjs` citada na entrega anterior.

## Registro — ferramentas de desenvolvimento (2026-09-23, branch arena/01a0d13b)

Pedido: analisar o que instalar ou implementar para acelerar o desenvolvimento.
Escolhas (ask_user): itens 1–7, cutscenes intactas, merge só com CI verde.

- Navegador: o CDN do Playwright e o apt estão bloqueados no sandbox; o Chromium 153 do
  pacote npm `@sparticuz/chromium` roda com as libs NSS que ele traz
  (`tools/setup-dev.sh`, ~10 s por sessão, fora do Git). Isso fecha a limitação
  "sem binário de navegador" registrada acima.
- `game/test/inspect.mjs`: 30 cenas (PC+mobile, 7 telas, formigueiro, 6 mapas) sem erro JS,
  404 ou glifo faltando; 60 fps, ~1 ms de CPU por frame. `lorehud-browser.mjs` volta a rodar.
- Modo debug `?debug` (`game/js/debug.js`, import dinâmico, save `_debug`).
- `run-all.mjs`: 19 testes em ~44 s (em série: 102 s). `treemap.mjs` voltou (49 nós).
- Bug achado pelo navegador: seta "▼" fora do atlas virava "?" na tela inicial; agora é
  desenhada em blocos, e o `assets.mjs` checa todo literal passado a `drawText`.
- CI pronto em `tools/ci/testes.yml`: o push de `.github/workflows/` foi recusado porque o app
  do agente não tem a permissão `workflows`, e quem ativa é o dono. Mapa operacional em `AGENTS.md`.

## Registro — Tela de Carregamento Temática estilo Dead Cells (2026-09-29)

Pedido: Adicionar uma tela de carregamento temática estilo Dead Cells ao jogo, para locais com carregamento de assets ou mecânicas pesadas de uma vez, adicionando uma tela por vez com validação e salvando a imagem escolhida no workspace para preservação.
Escolha do usuário: Primeira tela focada na transição de bioma (Degrau 1: Planície do Amanhecer).

- Arte tematica aprovada: Gerada com `offer_options` e selecionada pelo usuário (opção 2 de 2). Salva no workspace em `game/assets/loading/loading_planicie_raw.png` (resolução original bruta 3168×1344) e versão otimizada nítida em `game/assets/loading/loading_planicie.png` (806 KB, 1280×544 pixel-crisp).
- Módulo `game/js/loading_screen.js`:
  - Carregamento sob demanda com cache assíncrono idempotente e retry resiliente (`loadLoadingImage`).
  - Pré-carregamento antecipado em background (`preloadLoadingScreens`) iniciado logo no boot (`main.js`), garantindo que a arte já esteja em cache na memória quando a tela for acionada.
  - Sincronização estrita de carregamento: a tela aguarda a imagem estar 100% carregada antes de declarar prontidão ou permitir avanço (`imageLoaded`), eliminando qualquer engasgo visual.
  - Design Dead Cells: iluminação volumétrica, névoa e esporos flutuantes com variação de cor/pulso, vinheta radial profunda, placa superior ornamentada com losangos ciano/âmbar, caixa inferior translúcida com citações de lore e dicas de sobrevivência, e barra com gradiente ciano-ametista e runa bioluminescente giratória.
  - Suporte a tarefas pesadas assíncronas com indicador de progresso, tempo mínimo para leitura e avanço via tecla (Espaço/Enter) ou toque no mobile.
- Integrações no jogo (`game/js/game.js` e `game/js/debug.js`):
  - Ordem de abertura revisada conforme validação: a tela de carregamento da Planície agora abre ANTES da cutscene (`newRun`), proporcionando o tempo necessário para carregar o Mundo 1 e os assets pesados; ao concluir, transiciona naturalmente para a cutscene (Noite Branca / Degrau 1).
  - Integração no avanço de biomas (`drawMapTransition` -> `advanceMap`), reinício de expedição no menu de pausa e pós-partida, e cena debug dedicada (`?debug&tela=LOADING`).
- Validação (Regras 3, 4, 9):
  - 25 de 25 testes passaram na bateria completa (`npm test`), incluindo `mobile.mjs`, `assets.mjs` e `layout.mjs`.
  - Inspeção Playwright em Chromium headless (PC 1280×720 e Mobile 844×390): 60 FPS, 0 erros no console, 0 requisições 404, acentuação revisada sem glifos faltantes.

## Registro — Tela de Carregamento Mundo 2: Floresta de Musgo (2026-09-29)

Pedido: Criação da tela de carregamento temática estilo Dead Cells para o Mundo 2 (Floresta de Musgo / Degrau II), com a silhueta imponente do boss (a Caçadora Astuta / Raposa) ao fundo, pixel art refinado e limpo sem textos/barras falsas inseridos na imagem.

- Arte tematica aprovada: Gerada com `offer_options` e selecionada pelo usuário (opção 1 de 2). Silhueta monumental da Caçadora Astuta espreitando entre as árvores antigas com olhos âmbar brilhando na névoa esmeralda, raízes cobertas de musgo e formigas em marcha.
  - Salva permanentemente no workspace em `game/assets/loading/loading_floresta_raw.png` (resolução original bruta 1408×768) e versão otimizada em `game/assets/loading/loading_floresta.png` (1.7 MB, 1280×698 pixel-crisp).
- Atualizações em `game/js/loading_screen.js`:
  - Entrada tematica completa para `floresta` em `BIOME_LORE`: acento esmeralda `#7fd6a0`, subtítulo, citações de lore poético e dicas práticas sobre tecelãs, seda e a caçadora.
  - Pré-carregamento estendido para incluir `floresta` em background (`preloadLoadingScreens(["planicie", "floresta"])`).
- Atualizações em `game/js/debug.js` e `game/js/game.js`:
  - Suporte a seleção de bioma via URL debug: `?debug&tela=LOADING&bioma=floresta` ou `&mapa=2`.
- Validação (Regras 3, 4, 9):
  - 25 de 25 testes headless aprovados no `npm test`.
  - Inspeção visual Playwright em PC (1280×720) e Mobile (844×390): 60 FPS, sem erros no console, sem requisições 404, layout de texto impecável.

## Registro — Exclusão dos Modos Secundários e Criação do Modo Teste (2026-09-30)

Pedido: Excluir os modos extras de jogo e manter apenas a Campanha Principal (Modo História) e um novo Modo Teste com poderes de Dinheiro Infinito (`∞`), Formigas Infinitas (`∞`), Ondas Infinitas (`∞`) e botão novo para passar/escolher mapa a qualquer momento.
Decisões confirmadas com o usuário (`ask_user`):
1. Poderes ativos por padrão ao iniciar o Modo Teste, com botões no HUD para ligar/desligar cada um (`DINHEIRO ∞`, `FORMIGAS ∞`, `ONDAS ∞`).
2. Botão novo `PRÓXIMO MAPA ▶` (e atalho `N` no PC) + grade `M1..M6` para saltar diretamente para qualquer um dos 6 biomas a qualquer momento.
3. Formigas compradas no Modo Teste (com `FORMIGAS ∞` ativo) nascem instantaneamente ao redor do formigueiro, sem limite de população e sem limite de 1 Dinoponera por expedição; escavação de câmaras no ninho também gratuita e instantânea.
4. Por ora o Modo Teste concede Essência, Frutos e progresso normalmente, ficando registrado que **no futuro o Modo Teste não existirá no lançamento final** — ele serve exclusivamente como ferramenta auxiliar durante o desenvolvimento do jogo.

- Alterações implementadas:
  - `game/js/game.js` e `game/js/render.js`: `GAME_MODES` reduzido aos 2 modos (`campanha` e `teste`), com cards largos centralizados (360×340 px); painel lateral de controle do Modo Teste abaixo do minimapa (`x: 784..950, y: 156..322`) contendo `PRÓXIMO MAPA ▶`, seletor `M1..M6` e interruptores `DINHEIRO ∞`, `FORMIGAS ∞` e `ONDAS ∞`; avanço/salto de mapa imediato via `advanceMap(targetIdx)`.
  - `game/js/units.js`: suporte a `run.testPowers.infMoney` (custo zero) e `run.testPowers.infAnts` (sem teto populacional, múltiplas Dinoponeras e nascimento instantâneo sem fila de ovo).
  - `game/js/nest.js`: câmaras gratuitas e escavação instantânea quando os poderes do Modo Teste estão ativos; exibição de `∞` no topo e nos tooltips.
  - `game/js/state.js` e `game/js/debug.js`: suporte ao modo `teste` nas recompensas e nos parâmetros de debug.
  - `game/test/endless.mjs`, `game/test/layout.mjs` e `game/test/layout-browser.mjs`: cobertura automatizada dos 2 modos, dos poderes `∞`, do nascimento instantâneo de múltiplas Dinoponeras, do botão `PRÓXIMO MAPA` / seletor `M1..M6` e da auditoria de layout PC/Mobile (normal e fonte grande).

## Registro — Botão Pular Onda no Modo Teste e Regra 14 da Tela de Carregamento (2026-09-30)

Pedido: Adicionar um botão no Modo Teste para pular a onda de inimigos e registrar/implementar a nova regra da Tela de Carregamento: sempre que houver mudança de telas, mundos ou quando qualquer coisa pesada/demorada para carregar na hora aparecer no jogo, a tela de carregamento deve acontecer para que o jogo carregue tudo sem que o jogador veja.
Decisões confirmadas com o usuário (`ask_user`):
1. **Botão `PULAR ONDA` (`vencer_e_avancar`)**: funciona tanto na calmaria quanto no meio da onda; elimina imediatamente todos os inimigos restantes da onda atual, concede as recompensas normais da onda (comida, essência, XP da Rainha e draft de mutação se aplicável) e já inicia a próxima onda (ou o Chefão se for a onda 5/5). Atalho `K` no PC e botão `PULAR ONDA ▶` no painel do Modo Teste (PC e mobile).
2. **Escopo da Tela de Carregamento (`mundos_telas_pesadas`)**: Tela de Carregamento completa estilo Dead Cells em todas as mudanças de mundo/bioma (iniciar/reiniciar expedição, avançar mapa, `PRÓXIMO MAPA` e `M1..M6` no Modo Teste), entrada e saída do Formigueiro (`openNest`/`closeNest`), Árvore da Evolução (`openTreeScreen`/`backFromTree` pré-assando `treeArtCanvas`), abertura dos Santuários dos Frutos (`openFruit` baixando `loadSantuario` de ~5,1 MB e pré-assando a restauração de cor), Profecias (`PROPHECY`), Memórias (`MEMORY`), Cutscenes e chegada do Chefão (`startWave` na onda de boss), mantendo transições rápidas apenas nos submenus leves (`OPTIONS`/`HELP`).
3. **Confirmação manual na Tela de Carregamento (`sempre_confirmar`)**: ao atingir 100% (`ready`), a tela de carregamento aguarda o clique/toque ou `ESPAÇO`/`ENTER` do jogador com aviso piscante (`CLIQUE, TOQUE OU PRESSIONE ESPAÇO PARA CONTINUAR`).

- Alterações implementadas:
  - `REGRAS_DE_TRABALHO.md` e `MEGA_ARQUIVO.md`: adicionada a **Regra 14 — Tela de Carregamento em mudanças de telas, mundos e cargas pesadas ⏳**, com sincronização integral de bytes e SHA-256.
  - `game/js/loading_screen.js`: cobertura imediata 100% opaca (`alpha = 1`) no primeiro frame; execução diferida da tarefa pesada (`taskDeferred`) somente após a cortina estar desenhada na tela; lore, citações, dicas, paleta e tint para todos os 6 biomas + `palida`; confirmação manual (`ready` -> clique/toque/Espaço/Enter); helpers `isLoadingReady`, `isLoadingFadingOut`, `shouldUseLoadingScreen` e `runWithLoadingScreen`; escala de texto blindada contra `FONTE GRANDE` (`1 / fontScale()`).
  - `game/js/waves.js`: nova função `skipWave()` e carregamento fora de vista na onda do Chefão (`startWave` com `runWithLoadingScreen`).
  - `game/js/game.js` e `game/js/meta.js`: botão `PULAR ONDA (K)` / `PULAR ONDA ▶` (`id: "testSkipWave"`) no painel do Modo Teste + tecla `K`; integração de `runWithLoadingScreen` em `startRunWithLoading`, `triggerMapChange`, `openNest`, `closeNest`, `openTreeScreen`, `backFromTree`, `openProphecies`, `backFromProphecies`, `openMemories`, `backFromMemories`, replay de `MEMORY` e `openFruit`.
  - `game/mobile/touch.js`: ocultação automática de `#touch-hud` enquanto `isLoadingActive()` estiver ativa.
  - `game/test/endless.mjs` e `game/test/lorehud-browser.mjs`: testes automatizados do botão `PULAR ONDA` e da confirmação manual da tela de carregamento.




