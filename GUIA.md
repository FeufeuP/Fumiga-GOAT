# GUIA

## Perguntas para localizar o contexto correto antes de atender qualquer pedido

**Criado em:** 2026-10-08 · **Projeto:** FUMIGA — Colônia Eterna\
**Função:** transformar o pedido do usuário em uma rota de leitura, decisão, execução e verificação. Este arquivo é um roteiro de consulta, não um substituto das regras, do MEGA, da lore ou do código.

> ## OBRIGATÓRIO EM TODO PEDIDO
> **Ler `REGRAS_DE_TRABALHO.md` POR INTEIRO, do começo ao fim, independentemente do pedido.**
>
> Isso também vale para perguntas simples, arte, planejamento, documentação, correções, testes, backup e publicação. Ler somente títulos, trechos, um resumo, este GUIA ou a versão lembrada de outro chat **não cumpre a exigência**. Se a saída for truncada, continuar a leitura em blocos até cobrir o arquivo inteiro. Não marcar a leitura como concluída sem tê-la feito.
>
> **Não avançar para a execução com essa leitura pendente.** As rotas temáticas abaixo são leituras adicionais; nenhuma delas dispensa as regras integrais ou a leitura do MEGA exigida para esta continuidade.

**Quem responde?** O próprio chat, com respostas objetivas baseadas no pedido e nos arquivos. Não enviar este questionário inteiro ao usuário. Perguntar a ele somente sobre lacunas reais que dependam de sua decisão, respeitando a pesquisa e a confirmação exigidas pelas regras. Não repetir perguntas já respondidas por decisões vigentes.

**Como responder?** Registrar: **resposta curta → arquivo/seção consultados → ação ou pendência**. Nas perguntas temáticas, usar **sim**, **não se aplica** ou **a confirmar**, com justificativa breve. Não declarar que um arquivo foi lido só porque seu nome apareceu em uma busca. Em pedidos com vários assuntos, seguir todas as rotas pertinentes.

**Percurso:** [leitura e entendimento](#guia-inicio) → [rotas por assunto](#guia-rotas) → [execução e aceite](#guia-execucao) → [registro das respostas](#guia-respostas).

<a id="guia-inicio"></a>
## A. Perguntas obrigatórias de entrada

### 01. Li as regras por inteiro neste pedido?

- **Ler:** [REGRAS_DE_TRABALHO.md](REGRAS_DE_TRABALHO.md), integralmente, incluindo o resumo final do fluxo.
- **Responder:** leitura concluída ou pendente; identificar qualquer trecho truncado ainda não lido. Se o arquivo não estiver acessível, informar o bloqueio e localizar a cópia integral no MEGA, conferindo sua integridade quando possível; não inventar regras nem executar como se a leitura estivesse feita.
- **Condição:** vale para todos os pedidos. Nunca responder “não se aplica”. Uma cópia integral idêntica pode fornecer o conteúdo; um resumo não pode.

### 02. O que o usuário pediu exatamente e qual resultado espera receber?

- Separar explicar, pesquisar, planejar, criar, editar, corrigir, integrar, testar, documentar, fazer backup e publicar.
- **Responder:** entrega esperada, partes do pedido, o que foi explicitamente autorizado e o que está fora do escopo. “Escolher o estilo” não significa “migrar o jogo inteiro”; “criar uma imagem” não significa “integrá-la”; “documentar” não significa “salvar no GitHub”.
- **Ler se necessário:** [README.md](README.md), seções “Onde está o quê” e “O jogo”; [game/README.md](game/README.md), apresentação e funcionamento atual. Esses arquivos orientam, mas o estado deve ser conferido no código e nos registros recentes.

### 03. Consultei a memória do projeto e as decisões vigentes?

- **Ler:** [MEGA_ARQUIVO.md](MEGA_ARQUIVO.md), começando por “Como consultar” e [continuidade artística](MEGA_ARQUIVO.md#continuidade-artistica), depois os registros pertinentes. **A leitura integral do MEGA já foi solicitada nesta continuidade e não é dispensada por este roteiro.** Há registros depois da tabela de integridade.
- **Ler também:** [AGENTS.md](AGENTS.md), como mapa operacional; [PENDENCIAS.md](PENDENCIAS.md), distinguindo estado atual de histórico.
- **Responder:** o que está aprovado, rejeitado, implementado, apenas planejado ou ainda pendente no tema do pedido.

### 04. Estou usando uma decisão atual ou repetindo uma orientação histórica superada?

- **Ler:** [MEGA — decisão vigente e precedência](MEGA_ARQUIVO.md#arte-estado-vigente), registros recentes do assunto e a fonte normativa correspondente.
- **Responder:** qual decisão fundamenta a ação e sua data/contexto. Se houver conflito não resolvido, apontá-lo antes de agir; não escolher silenciosamente a instrução mais conveniente.
- **Atenção:** pixel art obrigatório, prompt antigo, cadência antiga de flores, backups só locais e “nenhum trabalho em aberto” de 2026-10-05 não substituem as decisões atuais. Branches, resultados de testes, previews e caminhos citados no histórico não comprovam o estado desta sessão.

### 05. Falta alguma informação que realmente impeça a execução?

- **Ler:** regras 1 e 2, já dentro da leitura integral; decisões do assunto no MEGA.
- **Responder:** quais dados já estão definidos e quais exigem confirmação. Pesquisar antes das perguntas de implementação, conforme as regras, e apresentar opções somente para decisões ainda abertas.
- Não rediscutir o estilo oficial 06 — papel recortado detalhado — sem pedido de mudança. Não preencher preços, espécies, dimensões, câmera, quantidade de peças ou contratos novos por suposição. Distinguir sugestão do chat de escolha do usuário.

### 06. Quais assuntos o pedido toca, inclusive indiretamente?

- Avaliar todas as perguntas 07–22. Um pedido pode exigir várias rotas: uma flor nova envolve arte, flores, árvore/santuários, assets, backup e testes; um bug de controle envolve lógica, UI/mobile e reprodução.
- **Responder:** números das rotas aplicáveis e ordem de leitura. Se nenhuma servir, usar a pergunta 22 em vez de adivinhar o arquivo.

<a id="guia-rotas"></a>
## B. Perguntas de encaminhamento por assunto

### 07. O pedido envolve criar, editar, comparar ou integrar imagens?

**Se sim, ler:** [MEGA — continuidade artística](MEGA_ARQUIVO.md#continuidade-artistica), [prompt-mestre integral](MEGA_ARQUIVO.md#prompt-mestre-vigente), [fichas e exemplos](MEGA_ARQUIVO.md#arte-fichas-exemplos), [guia de estilo](docs/arte/ESTILO_OFICIAL.md) e [direção vigente](docs/arte/direcao-vigente.json).

**Responder:** categoria da peça, técnica vigente, versão do prompt, referências disponíveis, quantidade autorizada, dimensão/estado, forma de apresentação e aceite. Para integração, consultar também o [plano de reestilização](DOCUMENTO_REESTILIZACAO_VISUAL.md), seções 5–6, o [inventário de imagens](docs/arte/inventario-imagens.csv) e o consumidor real em [assets.js](game/js/assets.js) / [render.js](game/js/render.js) ou no módulo específico. Não tratar conceito como sprite pronto nem manifesto como prova de que algo é desenhado.

### 08. A imagem é um cenário, terreno, prop, construção ou composição de camadas?

**Se sim, ler:** [MEGA — aparência e detalhe](MEGA_ARQUIVO.md#arte-acabamento), [camadas e contratos](MEGA_ARQUIVO.md#arte-camadas), [checklist de aceite](MEGA_ARQUIVO.md#arte-aceite), Regra 19 e [registro dos cenários 06/08](docs/arte/cenarios-06-08.md). Para integração: [world.js](game/js/world.js), [render.js](game/js/render.js), [camera.js](game/js/camera.js) e os dados de mapas em [config.js](game/js/config.js).

**Responder:** qual bioma e passada estão autorizados; o que pertence ao terreno e o que precisa ficar separado; câmera, escala, colisões e layout a preservar. **Base limpa não é cenário final vazio.** A riqueza final deve ser avaliada numa composição das camadas aprovadas, sem embutir decoração na base nem confundir a trilha de um estudo com o mapa de produção.

### 09. A peça é uma formiga, criatura, chefe, ferramenta ou acessório?

**Se sim, ler:** [LORE.md](LORE.md), seções “A Rainha Silenciosa”, “As Onze”, “Os Seis Degraus” ou ficha da Pálida, conforme o assunto; [MEGA — anatomia e câmera](MEGA_ARQUIVO.md#arte-camadas); regras 8 e 17. Para implementação: [config.js](game/js/config.js), [units.js](game/js/units.js), [enemies.js](game/js/enemies.js), [combat.js](game/js/combat.js) e [render.js](game/js/render.js).

**Responder:** espécie/papel na lore, anatomia, estado, direções/quadros, pivot e tamanho de uso. Acessórios não autorizam corpo humano. Confirmar o consumidor antes de substituir um alias ou folha existente; o nome do arquivo não basta para determinar a criatura correta.

### 10. O pedido envolve flores de um santuário?

**Se sim, ler:** [DOCUMENTO_FLORES_DOS_SANTUARIOS.md](DOCUMENTO_FLORES_DOS_SANTUARIOS.md), sobretudo regras, estágios, especificações, integração e aceite; [manual v3 no MEGA](MEGA_ARQUIVO.md#flores-v3) e sua [precedência atual](MEGA_ARQUIVO.md#arte-estado-vigente).

**Responder:** santuário, três espécies regulares, Suprema, estados pedidos e leva atual. Método vigente: **9 vivos → PARADA 1 → 3 brotos mortos + 6 fases da Suprema → PARADA 2**. Contar alternativas no teto de dez gerações; um santuário por entrega. Morto regular deriva do broto vivo. Não alterar preços sem confirmação.

**Para preparar/integrar:** [prepare_fruit_art.py](tools/prepare_fruit_art.py), [fruit_skills.js](game/js/fruit_skills.js), [fruit_effects.js](game/js/fruit_effects.js) e [assets.js](game/js/assets.js); conferir folhas, recortes e testes de poderes/integração.

### 11. O pedido envolve árvore de habilidades, maçãs, santuários, compras ou progressão?

**Se sim, ler:** [PROXIMOS_PASSOS_DA_ARVORE.md](PROXIMOS_PASSOS_DA_ARVORE.md), seções “O que JÁ está pronto”, “Onde mexer, símbolo por símbolo” e “Restrições inegociáveis”; [game/assets/ui/README.md](game/assets/ui/README.md); decisões atuais no MEGA; [meta.js](game/js/meta.js), [tree_layout.js](game/js/tree_layout.js), [tree_art.js](game/js/tree_art.js), [color_restore.js](game/js/color_restore.js) e módulos de frutos.

**Responder:** nó/fruto/estado afetado, custo autorizado, restauração cinza/cor, ligações/hitboxes e efeito no save. Não ressuscitar correntes/cadeados removidos. Para flores, seguir também 10; para conteúdo Pálida, seguir 12.

### 12. O pedido altera lore, textos narrativos, cutscenes, Eras, Profecias ou conteúdo futuro?

**Se sim, ler:** [LORE.md](LORE.md), a seção correspondente ao ser/bioma e o apêndice de Eras/Ascensão/Profecias; [DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md](DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md); registros mais recentes do tema no [MEGA](MEGA_ARQUIVO.md). Para cutscenes/textos: [cutscenes.js](game/js/cutscenes.js), [config.js](game/js/config.js), [font.js](game/js/font.js), [tutorial.js](game/js/tutorial.js).

**Responder:** texto/acontecimento canônico, alteração autorizada e se é ilustração, apresentação ou mecânica nova. Noite Branca tem três painéis × quatro camadas; não seguir contagens antigas. Arte de prévia da Pálida não autoriza liberar mapa 7, chefe ou final novo. Preservar PULAR/replay e equivalentes de toque quando aplicáveis.

### 13. O pedido envolve menus, HUD, ícones, botões, tipografia ou controles PC/mobile?

**Se sim, ler:** [AGENTS.md](AGENTS.md), “Arquitetura” e “Modo debug”; [game/README.md](game/README.md), “Controles”, “HUD da expedição” e “Tutorial dinâmico”; [ui.js](game/js/ui.js), [lore_hud.js](game/js/lore_hud.js), [font.js](game/js/font.js), [input.js](game/js/input.js), [game.js](game/js/game.js), [touch.js](game/mobile/touch.js) e [mobile.css](game/mobile/mobile.css).

**Responder:** telas, estados, áreas de toque, atalhos, gestos, textos e tamanhos de fonte afetados. O runtime é compartilhado; não duplicar jogabilidade no mobile. Mudanças de input precisam de equivalente de toque. Validar legibilidade/contraste, métricas, layout e navegação; para assets, seguir também 07.

### 14. O pedido envolve loading, boot, pré-carga, transições ou travamentos ao abrir telas?

**Se sim, ler:** Regra 14 inteira dentro da leitura obrigatória; [DOCUMENTO_TELAS_DE_CARREGAMENTO.md](DOCUMENTO_TELAS_DE_CARREGAMENTO.md), arquitetura/status e avisos de precedência; registros recentes de pré-carga no [MEGA](MEGA_ARQUIVO.md); [preload.js](game/js/preload.js), [loading_screen.js](game/js/loading_screen.js), [main.js](game/js/main.js), [game.js](game/js/game.js) e [assets.js](game/js/assets.js).

**Responder:** é troca de mundo, conteúdo acessível pelo TITLE ou ação instantânea em combate? Não adicionar loading ao que deve ser pré-carregado no TITLE. Identificar download, decodificação, trabalho de CPU, falha de rede e confirmação de pronto antes de propor a correção. Títulos históricos “Dead Cells” não mudam o estilo oficial.

### 15. O pedido altera gameplay, balanceamento, IA, combate, ondas, mapas ou formigueiro?

**Se sim, ler:** [AGENTS — Arquitetura](AGENTS.md), [DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md](DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md), decisões recentes do assunto no [MEGA](MEGA_ARQUIVO.md) e [config.js](game/js/config.js). Localizar os módulos pela função:

- Unidades/IA: [units.js](game/js/units.js), [brain.js](game/js/brain.js).
- Combate/inimigos/ondas: [combat.js](game/js/combat.js), [enemies.js](game/js/enemies.js), [waves.js](game/js/waves.js).
- Mutações/progresso/save: [mutations.js](game/js/mutations.js), [meta.js](game/js/meta.js), [state.js](game/js/state.js).
- Mundo/ninho/névoa: [world.js](game/js/world.js), [nest.js](game/js/nest.js), [fog.js](game/js/fog.js).

**Responder:** comportamento atual, resultado esperado, contrato/estado afetado e efeitos indiretos em save, colisão, economia e mobile. Ler chamadas e consumidores, não apenas o arquivo com nome parecido. Não aplicar um plano antigo como se tudo nele já estivesse autorizado/implementado.

### 16. O pedido envolve som, música ou efeitos de áudio?

**Se sim, ler:** [audio.js](game/js/audio.js) e seus chamadores; opções/volume em [game.js](game/js/game.js) e [state.js](game/js/state.js); registros correspondentes no [MEGA](MEGA_ARQUIVO.md).

**Responder:** evento, mixagem, volume, início após interação, comportamento no mobile e suporte real das ferramentas. Não prometer música cantada ou um asset que não foi produzido. Se faltar definição de direção sonora, perguntar antes de implementar; não inventar um cânone de áudio a partir do estilo visual.

### 17. O pedido relata um bug, regressão, lentidão ou resultado de playtest?

**Se sim, ler:** registros recentes do tema no [MEGA](MEGA_ARQUIVO.md), [PENDENCIAS.md](PENDENCIAS.md), [PLAYTEST.md](PLAYTEST.md) e o mapa de testes em [AGENTS.md](AGENTS.md). Usar [debug.js](game/js/debug.js), [game/test/](game/test/) e [tools/playtest.mjs](tools/playtest.mjs) conforme a investigação.

**Responder:** passos para reproduzir, esperado × observado, plataforma, seed/estado quando pertinente, evidência e testes necessários. Não confundir hipótese com causa comprovada, flutuação de teste com correção implementada ou histórico de FPS com medição atual. Medir o trecho afetado; não otimizar por suposição nem mascarar um teste que falha.

### 18. O pedido afeta PWA, offline, instalação, cache, Android/Windows ou distribuição?

**Se sim, ler:** [README.md](README.md), “Instaladores offline”; [game/README.md](game/README.md), “Instalar e jogar sem internet”; [installers/README.md](installers/README.md); registros recentes de distribuição no [MEGA](MEGA_ARQUIVO.md); [app/](app/), [sw.js](sw.js), [assets.js](game/js/assets.js), [make_assets_list.mjs](tools/make_assets_list.mjs), [sync-native-assets.mjs](tools/sync-native-assets.mjs) e o instalador afetado em [installers/](installers/).

**Responder:** pacote/canal, versão, recursos offline, invalidação de cache, sincronização e testes necessários. Confirmar caminhos no checkout antes de agir. Não declarar instalador/release pronto só porque o site abre; não prometer acesso offline sem testá-lo. Chaves de assinatura/credenciais nunca entram em chat ou Git.

### 19. O pedido exige recuperar, preservar ou enviar imagens/arquivos ao Drive?

**Se sim, ler:** Regra 13; [MEGA — acervo e recuperação](MEGA_ARQUIVO.md#arte-acervo-drive); manifestos em [amostras-estilos-v2.json](docs/arte/amostras-estilos-v2.json), [pacotes-estilos-v2.json](docs/arte/pacotes-estilos-v2.json) e [cenarios-06-08.json](docs/arte/cenarios-06-08.json), conforme a peça.

**Responder:** arquivo/versão corretos, pasta, ID obtido pela integração, tamanho/checksum e disponibilidade atual. Carregar o conector e conferir seu estado/esquema. Não confundir imagem no chat, caminho local e backup remoto; não reconstruir a imagem e chamá-la de original. Só confirmar envio depois da verificação remota; não apagar a única cópia.

### 20. O usuário pediu explicitamente para salvar/publicar no GitHub?

**Se sim, ler:** Regra 11; [AGENTS.md](AGENTS.md), comandos de validação; estado atual com `git status`, diff, branch e checks. Consultar a configuração pertinente em [.github/](.github/) e os registros do fluxo no [MEGA](MEGA_ARQUIVO.md).

**Responder:** branch da sessão, alterações incluídas, testes/checks e escopo do pedido. “Salvar no GitHub” segue push + PR + merge no mesmo fluxo, com verificações verdes e sem trocar/apagar a branch da sessão. Usar `git`/`gh`; não pedir tokens/senhas. Se o pedido disser apenas “crie um arquivo”, não presumir autorização de publicar.

### 21. O pedido é de documentação, memória do projeto, guia, decisão ou planejamento?

**Se sim, ler:** [MEGA](MEGA_ARQUIVO.md), “Como consultar”, registros recentes e seção temática; [AGENTS.md](AGENTS.md); [PENDENCIAS.md](PENDENCIAS.md); o documento que será alterado por inteiro quando necessário à consistência da mudança. Para direção visual: [guia de estilo](docs/arte/ESTILO_OFICIAL.md), [direção vigente](docs/arte/direcao-vigente.json) e [plano de reestilização](DOCUMENTO_REESTILIZACAO_VISUAL.md).

**Responder:** qual informação falta/está incorreta, sua fonte, onde deve ficar a versão vigente e o que precisa ser preservado como histórico. Se editar um dos seis documentos incorporados, sincronizar bloco integral, tamanho e SHA no MEGA; conferir o [registro de integridade](MEGA_ARQUIVO.md#registro-de-integridade). Não transformar planejamento em implementação concluída nem copiar orientação superada para outro guia.

### 22. O tema não está listado, a fonte não existe ou várias rotas entram em conflito?

- **Consultar:** [README — mapa do projeto](README.md), [AGENTS — arquitetura](AGENTS.md), índices do [MEGA](MEGA_ARQUIVO.md) e árvore real de arquivos.
- Buscar pelo nome da tela/entidade/símbolo, localizar definição e chamadores, ler os trechos completos pertinentes. Uma busca por palavras-chave localiza a fonte, **não substitui sua leitura**.
- **Responder:** o que foi encontrado, o que continua desconhecido e qual confirmação falta. Não inventar caminho, seção, ID ou funcionalidade. Se a fonte prevista foi movida, encontrar a substituta e atualizar a rota; se o conflito não tiver resolução explícita, perguntar antes de alterar.

<a id="guia-execucao"></a>
## C. Perguntas antes de executar e antes de concluir

### 23. Já li as fontes de todas as rotas aplicáveis e tenho autorização suficiente?

**Responder:** lista dos arquivos/seções realmente consultados, restrições encontradas e decisões pendentes. Respeitar pesquisa → perguntas → confirmação conforme as regras. Não usar o GUIA para pular essa etapa nem repetir decisões já tomadas. Se houver bloqueio, informar exatamente qual parte não pode prosseguir.

### 24. Qual é o menor lote que atende ao pedido sem alterar assuntos não autorizados?

**Responder:** arquivos/peças a criar ou editar, estados/consumidores afetados, dependências e o que permanecerá intacto. Em arte, respeitar camadas, pausas de aprovação e teto de imagens. Em código, preservar lógica compartilhada PC/mobile. Em documentação, não alterar gameplay só para “aproveitar a tarefa”.

### 25. Como vou comprovar que cada parte do pedido foi atendida?

**Ler:** regras 3, 4, 7, 9, 10 e 12 dentro da leitura integral; [AGENTS — comandos](AGENTS.md); testes do assunto localizados nas rotas acima.

**Responder:** critérios de aceite, comandos/testes, inspeção de navegador/capturas e apresentação dos entregáveis. Separar verificação documental, visual e funcional. Para documentação, executar `node game/test/docs.mjs`; quando afetar continuidade artística, `node tools/check_art_handoff.mjs`. Conferir links e caminhos deste GUIA se forem modificados. Executar testes de lógica quando houver mudança de lógica; o preview e a inspeção exigidos pelas regras não substituem os testes pertinentes.

### 26. O resultado está realmente pronto ou só planejado, gerado ou parcialmente verificado?

**Responder:** o que foi produzido, aprovado, integrado e testado, distinguindo esses estados. Se uma ferramenta falhar ou um teste não puder ser executado, informar a limitação sem marcar sucesso. Não chamar estudo de asset final, upload iniciado de backup concluído, nem inspeção headless de teste físico/campanha completa.

### 27. Atualizei a memória, preservei os arquivos e deixei os pontos de entrada coerentes?

**Ler:** Regra 12 e [MEGA — integridade](MEGA_ARQUIVO.md#registro-de-integridade); para arte, [formato de encerramento](MEGA_ARQUIVO.md#arte-proximo-passo).

**Responder:** registro no MEGA com data, decisão, alterações, verificações, limitações e próximo passo; backup e IDs/hashes quando aplicáveis. Preservar versões/decisões históricas, atualizar referências de GUIA/AGENTS/documentos afetados e validar os seis blocos se necessário. Registrar a próxima pendência sem afirmar disponibilidade futura de caminhos locais temporários.

### 28. Entreguei o que o usuário pediu e deixei claro o que falta?

**Responder:** checklist final por item do pedido; abrir o entregável principal, mostrar as artes quando houver, indicar arquivos/links relevantes, confirmar preview conforme as regras e listar pendências reais. Não esconder falhas nem encerrar apenas com promessa de execução futura. Não fazer perguntas adicionais se tudo já estiver definido e entregue.

<a id="guia-respostas"></a>
## D. Modelo de respostas e exemplos de encaminhamento

Usar uma anotação objetiva para organizar a tarefa; comunicar ao usuário as decisões, bloqueios e o checklist necessários, não todo o questionário por padrão.

```text
Pedido e resultado esperado:
01 — Regras lidas integralmente neste pedido: sim / pendente (motivo):
03 — MEGA e decisões vigentes consultados:
Rotas aplicáveis (07–22) e justificativa curta:
Arquivos/seções efetivamente lidos:
O que já está aprovado / o que ainda precisa de confirmação:
Escopo autorizado e menor lote:
Verificações e critérios de aceite:
Resultado: produzido / aprovado / integrado / verificado / pendente:
MEGA atualizado e preservação confirmada:
Entrega apresentada, preview e próximo passo:
```

| Exemplo de pedido | Rotas temáticas principais, além de todas as perguntas de entrada/encerramento |
|---|---|
| “Crie uma amostra detalhada da Planície” | 07 → 08 → 19; definir a passada, usar o prompt vigente e não confundir base com composição final. |
| “Faça as flores do Pântano” | 07 → 10 → 11 → 19; conferir lore pela 12 e respeitar as duas pausas. |
| “O botão não funciona no celular” | 17 → 13; seguir também 15 se houver lógica compartilhada envolvida. |
| “Melhore o chefe do Deserto” | 09 → 12 → 15; distinguir melhoria visual de alteração de combate antes de executar. |
| “Corrija o jogo offline no Android” | 17 → 18; identificar se é PWA ou instalador nativo, não tratar os dois como equivalentes. |
| “Atualize o MEGA / crie um guia” | 21; rotas adicionais apenas pelos assuntos documentados. Sem gerar arte ou publicar por suposição. |
| “Salve as imagens no Drive” | 19; localizar originais corretos e verificar os arquivos remotos. |
| “Salve o projeto no GitHub” | 20; seguir as rotas das alterações incluídas para definir testes e pendências. |

**Manutenção:** quando surgir uma nova área ou uma fonte mudar de lugar, atualizar suas perguntas/rotas, conferir os links e registrar a mudança no MEGA. Não duplicar aqui o conteúdo inteiro das regras ou o prompt-mestre: as fontes canônicas continuam sendo lidas, não substituídas por este roteiro.
