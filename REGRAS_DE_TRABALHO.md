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

## Regra 8 — Humanização moderada: acessórios e ofícios sim, corpo humano não 🐜

> **Pode existir humanização, porém não exagerada: formigas e demais seres podem utilizar ferramentas, acessórios, skins e itens, mas nunca ter a aparência humanizada — como se tornar bípedes.** (decisão do usuário, 2026-10-06 — substitui a redação anterior, que proibia qualquer traço humanóide)

- **Permitido:** ferramentas (lanças, pás, martelos, arcos), acessórios (mochilas, cintos, amuletos, elmos), skins e itens equipáveis — sempre dimensionados ao corpo do animal, sem alterar sua anatomia.
- **Permitido:** ofícios e trabalhos de inspiração humana — ferraria, artesanato, alquimia, magia etc. — desde que **sem fugir do estilo natural do animal em questão**: uma formiga ferreira continua sendo uma formiga (seis patas, exoesqueleto, antenas, silhueta de inseto).
- **Proibido:** aparência humanizada — postura bípede humana, rosto humano, mãos humanas, roupas humanóides. A silhueta continua sendo a do animal real (ou criatura mítica não-humanóide) de origem.
- Exceções além disso só com pedido explícito do usuário (ex.: “crie um NPC humanoide para a cutscene X”).
- Mesmo com acessórios e ofícios, a lore continua valendo: a “rainha” é uma **formiga-rainha gigante**, não mulher-inseto; a PÁLIDA é uma marionete de névoa em forma de rainha-formiga, não humanoide.
- Validação: antes de gerar qualquer asset de personagem, checar se há traços de aparência humana (olhos frontais humanos, boca humana, bipedia). Se houver, refazer.
- Inspirações válidas: *Hollow Knight*, *Rain World* [2](https://www.reddit.com/r/gamingsuggestions/comments/1ivfjbo/games_where_you_play_a_nonhumanoid_like_stray_or/), *Webbed* (aranha), *Shelter* (texugo) — protagonismo não-humano com ferramentas e ofícios, sem humanizar o corpo.

## Regra 9 — Adaptar toda mudança para a versão mobile 📱

> **Toda alteração no jogo precisa chegar adaptada à versão mobile (`game/mobile/`). O que já é automático não se duplica; o que não é automático se adapta na camada de toque (`touch.js`).**

- **Regra de ouro: nunca duplicar jogabilidade** dentro de `game/mobile/`. As duas versões (PC e mobile) importam os **mesmos módulos** (`game/js/`), então balanceamento, unidades, inimigos, ondas, chefes, mutações, árvore, telas desenhadas em canvas e arte caem nas duas automaticamente — uma atualização de conteúdo ou gameplay vale para as duas ao mesmo tempo, nas alterações em conjunto.
- **O único lugar em que é preciso lembrar do mobile é a entrada de dados.** A camada `game/mobile/touch.js` é o único arquivo que não se atualiza sozinho nesses casos:
  - **Novo atalho de teclado / mecânica nova de input** → mapear um gesto equivalente ou adicionar um botão virtual correspondente no HUD da expedição (array de botões em `touch.js`). Se a ação ficar só no teclado/mouse, ela deixa de existir no celular.
  - **Tela nova com zoom/pan customizado** → a pinça já cobre a expedição (câmera do RUN) e a ÁRVORE (passos de roda); telas novas herdam o padrão, mas uma mecânica de gesto própria pede ajuste explícito na camada.
  - **Texto com caractere fora da Kiwi Soda/fallback** → `test/assets.mjs` acusa na hora: usar caractere coberto pela TTF, incluir um fallback de símbolo explícito e testado, ou reformular o texto.
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

## Regra 14 — Tela de Carregamento só na troca de mundo; o que sai do TITLE é pré-carregado ⏳

> **A tela de carregamento aparece somente na troca de mundo. Tudo o que os botões da tela TITLE abrem é pré-carregado enquanto o jogador está no TITLE, para que nenhum deles precise de tela de carregamento — nem na ida, nem na volta.** (decisão do usuário, 2026-10-01)

- **Com tela de carregamento — troca de mundo (`mundos`):** início/reinício de expedição (`newRun`, por JOGAR → CAMPANHA/MODO TESTE), avanço entre mapas (`advanceMap` / transição de fim de mapa) e trocas de mapa no Modo Teste (`PRÓXIMO MAPA`, `M1..M6` e tecla `N`), sempre com a lore do bioma.
- **Sem tela de carregamento — pré-carregado no TITLE (`preload.js`):** ÁRVORE DA EVOLUÇÃO (arte e maçãs), os 7 Santuários dos Frutos (download de ~5,7 MB + cor restaurada), PROFECIAS, MEMÓRIAS e os replays das memórias (camadas da Noite Branca, 12 PNGs 320×180, ~0,65 MB — 4 por painel desde 2026-10-05), OPÇÕES, COMO JOGAR e o menu de modos. Entrar e voltar é transição rápida; o replay toca dentro de MEMÓRIAS e volta para ela.
- **Instantâneos em jogo:** entrar e sair do Formigueiro (`B` / botão `FORMIGUEIRO`) e a chegada do Chefão (anunciado pelo banner `CHEFÃO DE MAPA`), sem tela de carregamento no meio do combate.
- **Como pré-carregar:** começa ao chegar no TITLE; downloads em paralelo e trabalho de CPU em fatias de poucos ms por quadro (geradores), para o TITLE seguir a 60 FPS; PNGs decodificados fora da thread principal. Ordem: árvore → maçãs → flores → santuários → Noite Branca. Sem rede, prepara só o que já está na memória.
- **Clique antes do fim (`abre_na_hora`):** a tela abre na hora, sem tela de carregamento; o trabalho de CPU que faltar termina ali mesmo (engasgo curto, no clique) e imagens ainda a caminho entram com fade quando chegam.
- **Conteúdo pesado novo** acessível pelo TITLE entra na fila do `preload.js` — não ganha tela de carregamento.
- **Execução invisível ao jogador (troca de mundo)**: a tela de carregamento (`loading_screen.js` / `runWithLoadingScreen`) cobre 100% do canvas (`alpha = 1`) **antes** de executar a tarefa pesada (no frame seguinte ao da cortina fechar), impedindo qualquer engasgo visual, pop-in de sprite ou tela incompleta.
- **Confirmação manual ao concluir (`sempre_confirmar`)**: ao atingir 100% (`ready`), a tela de carregamento aguarda o clique/toque ou `ESPAÇO`/`ENTER` do jogador com aviso piscante (`CLIQUE, TOQUE OU PRESSIONE ESPAÇO PARA CONTINUAR`), permitindo ler a dica/lore do bioma sem pressa.

## Regra 15 — Sempre ler o MEGA ARQUIVO 📚

> **Sempre ler o `MEGA_ARQUIVO.md` em qualquer coisa que o usuário pedir.** (decisão do usuário, 2026-10-06)

- No início de **toda** tarefa, abrir o `MEGA_ARQUIVO.md` pelo índice (“Como consultar”) e ler os
  **registros mais recentes** + as **seções pertinentes ao pedido** (decisões, entregas e pendências
  da área afetada) — nunca trabalhar sem esse contexto.
- O MEGA é a memória do projeto: antes de propor, perguntar ou implementar, conferir o que já foi
  decidido, aprovado, rejeitado ou deixado pendente sobre o assunto.
- Se o pedido tocar um tema sem registro, isso também se anota: a ausência de histórico vira
  observação no check-in/documentação da entrega (Regra 12).

## Regra 16 — Imagens em grupos de no máximo 10 🖼️

> **Sempre gerar imagens em grupos de no máximo 10 por rodada — nunca mais que isso.** (decisão do usuário, 2026-10-06)

- Cada rodada de geração tem teto de **10 imagens** (incluindo as opções apresentadas lado a lado
  pela Regra 6).
- Demandas maiores são **fatiadas em rodadas de até 10**, com apresentação/confirmação entre elas —
  nunca uma avalanche de uma vez.
- A cadência das flores (9 + 9) já cabe nesse teto; qualquer pipeline futuro de arte deve ser
  desenhado respeitando-o.

## Regra 17 — Estilo top-down para o mundo do jogo 🗺️

> **Mapas, personagens, itens, elementos dos mapas, ferramentas etc. são sempre gerados em estilo top-down. A única exceção são ilustrações: telas de carregamento, telas de menus, árvore de habilidades e maçãs. Santuários e flores também são top-down.** (decisão do usuário, 2026-10-06)

- **Top-down (vista de cima)** vale para tudo que existe *dentro* do mundo jogável: terreno dos
  biomas, personagens, inimigos, chefes, itens, ferramentas, construções, santuários e flores.
- **Ilustrações** (fora do mundo jogável) são a exceção: telas de carregamento, telas de menus/TITLE,
  árvore de habilidades e maçãs seguem livres no enquadramento que servir melhor à peça.
- Toda arte top-down nova mantém **o mesmo ângulo de câmera, escala relativa e direção de sombra/luz**
  da arte top-down já aprovada, além da harmonia de paleta da Regra 6.
- Na dúvida sobre a categoria de uma peça (“é mundo ou ilustração?”), perguntar ao usuário
  (Regra 1) antes de gerar.

## Regra 18 — Prompt-mestre do estilo artístico 🎨

> **Assim que um estilo artístico for escolhido permanentemente, salvá-lo e criar um prompt padrão, usado em toda nova imagem, para que o estilo seja sempre mantido em todo o jogo.** (decisão do usuário, 2026-10-06)

- Quando o usuário aprovar um estilo como definitivo, registrar imediatamente o **prompt-mestre**:
  descrição canônica do estilo (técnica, paleta, contorno, sombreamento, enquadramento, fundo,
  o que evitar) — ele passa a abrir **toda** geração/edição de imagem, somando-se apenas os
  detalhes específicos do assunto da peça.
- O prompt-mestre fica salvo em registro próprio no `MEGA_ARQUIVO.md` (Regra 12) e referenciado a
  cada entrega de arte, para auditoria (“esta imagem usou o prompt-mestre + <detalhes>”).
- O prompt-mestre só muda com aprovação explícita do usuário, em rodada de opções (Regra 6);
  a mudança é registrada com data, motivo e o texto anterior preservado no histórico.

## Regra 19 — Mapas gerados limpos, sem decorativos 🏗️

> **Ao gerar mapas para os mundos, criar o mapa inteiro, porém sem elementos decorativos — como flores, árvores, pedras, buracos, rachaduras, arbustos etc. Vale também para vilas e cidades quanto às construções.** (decisão do usuário, 2026-10-06)

- A primeira passada do mapa entrega o **terreno/layout completo e limpo** (forma, relevo, caminhos,
  zonas) — legível para o gameplay antes de qualquer enfeite.
- Decorativos (vegetação, pedras, rachaduras, props) e construções (vilas, cidades, edifícios)
  entram em **passadas separadas**, cada uma aprovada à parte — nunca embutidos no mapa-base
  sem confirmação.
- Isso mantém as camadas combináveis (base × decoração × construções) e evita refazer o mapa
  inteiro quando só o decorativo muda.

---

## 🔄 Resumo do fluxo obrigatório a cada pedido

```text
0. LER MEGA    → abrir o MEGA_ARQUIVO (índice + registros recentes + seções do tema) em todo pedido (Regra 15)
1. PESQUISAR  → inspirações em jogos indies na Web (Regra 2)
2. PERGUNTAR  → opções de implementação (Regra 1)
3. IMPLEMENTAR → seguindo as escolhas do usuário, otimização (Regra 5) e Regra 14 (tela de carregamento só na troca de mundo; o que sai do TITLE é pré-carregado)
4. ARTE       → imagens em alta resolução, pixel art harmônico (Regra 6) + humanização moderada (Regra 8) + top-down no mundo do jogo (Regra 17) + mapas-base limpos (Regra 19), em rodadas de no máx. 10 imagens (Regra 16), sempre partindo do prompt-mestre de estilo (Regra 18)
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
