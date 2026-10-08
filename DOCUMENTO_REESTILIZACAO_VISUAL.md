# FUMIGA — estudo de estilos, inventário e plano de reestilização

**Data:** 2026-10-08 · **Base auditada:** `53c9f572656113fbc5ddfad77877c6dec3b6c091`\
**Status atual:** estilo **06 — papel recortado detalhado** confirmado pelo usuário em 2026-10-08; prompt-mestre vigente `FUMIGA-PAPEL-v2-DETALHADO`. Acabamento rico, sem aparência vazia ou minimalista. Inventário concluído; plano de integração proposto; piloto **pendente**. Nenhum asset de produção foi substituído.

**Guia vigente:** [`docs/arte/ESTILO_OFICIAL.md`](docs/arte/ESTILO_OFICIAL.md). A seleção de estilo está concluída; dimensões finais, recortes, sombras em movimento e aprovação das peças serão validados no piloto.

### Atualização — nova rodada v2 disponível e salva

O usuário autorizou dez novas imagens, pois não conseguia baixar os PNGs originais. **10/10 novas gerações concluídas**, disponíveis na pasta [estilos Visuais no Drive](https://drive.google.com/drive/folders/1KCPo0hWZGmM_jeRsN0ec59lR8-IL4_sj), com tamanho e SHA-256 conferidos. Incluídos PDF de dez páginas, ZIP com originais e manifesto. Índice atual: `docs/arte/amostras-estilos-v2.json` e `docs/arte/pacotes-estilos-v2.json`.

A rodada v1 permanece histórica e seus arquivos não foram recuperados. Os hashes novos não substituem os anteriores. A direção 06 permanece escolhida; a nova cena 06 é candidata de referência, ainda precisa de aprovação visual antes do piloto. A recuperação da v1 deixa de ser a única via para seguir. Os inventários de produção e as fases F1–F9 permanecem inalterados; nenhum asset do jogo substituído.

## 1. Decisões desta rodada e limites da leitura

O usuário confirmou nas perguntas desta sessão:
1. Explorar estilos **também fora do pixel art**. Inicialmente autorizado só para as amostras; a escolha posterior do estilo 06 substitui a exigência de pixel art na Regra 6.
2. Comparar **cenas conceituais top-down**, não somente uma rainha isolada.
3. **Uma imagem por estilo, sem opções extras**: exatamente 10 imagens nesta rodada.

O `MEGA_ARQUIVO.md` foi percorrido integralmente, inclusive registros após o índice de integridade, e as 19 regras foram lidas. Os seis documentos incorporados foram validados byte a byte pelo teste de documentação. Também foram lidos AGENTS, o manual completo de flores e os trechos técnicos dos consumidores/pipelines relevantes.

**Não confundir varredura com revisão manual:** os 1.382 arquivos versionados foram lidos por script; 151 textos UTF-8 somam 46.360 linhas; 1.228 imagens foram decodificadas. Isso NÃO significa revisão semântica linha a linha de todos os módulos, testes e instaladores nem inspeção visual individual dos 1.228 originais. Essa parte do pedido permanece parcial. A rastreabilidade está em `docs/arte/varredura-repositorio.csv` (caminho, bytes, SHA-256, tipo e método). Dependências instaladas, `.git` e arte nova ignorada não fazem parte dessa contagem.

### Fontes normativas e precedência aplicada

- Pedido explícito atual de ler o MEGA inteiro prevalece sobre a orientação antiga de AGENTS de consultar só seções.
- Regras 8/17: corpo de inseto, acessórios moderados e câmera top-down no mundo, santuários e flores.
- Regra 19: amostras são cenas conceituais autorizadas, **não mapas-base**. Terrenos definitivos serão gerados limpos; decoração e construções em passadas separadas.
- Regra 18: escolha definitiva registrada — **06, papel recortado**. O prompt-mestre canônico vigente `FUMIGA-PAPEL-v2-DETALHADO`, com referência, técnica, paleta, luz, enquadramento e proibições, está no guia e no MEGA. Os demais estudos são alternativas históricas.
- Noite Branca vigente: **3 painéis × 4 camadas**, substitui o histórico de 8 camadas. TITLE: 4 camadas.
- Árvore sem correntes/cadeados sobre frutos; não ressuscitar assets removidos. O ícone genérico `sprites/icons/lock.png` é distinto dessas antigas artes.
- Flores: prevalece o método v3 (9 vivos + parada + 3 mortos e 6 fases da Suprema + parada). O texto antigo de AGENTS e partes do manual ainda descrevem o método anterior. O teto de **10 imagens inclui alternativas**, portanto as levas podem precisar de sub-rodadas de escolha para não somar 12 gerações na mesma rodada.
- Drive é a prioridade vigente de preservação, substituindo o antigo espelho local como destino principal.
- Seis mapas jogáveis. Arte de prévia da Pálida não autoriza implementar/desbloquear mundo 7.

## 2. As dez amostras

**Pasta original:** `art-source/estilos-2026-10-08/` (fora do Git; **ausente nesta continuação**, ver retificação de preservação na seção 6). Cada PNG foi aberto para inspeção e apresentado no viewer na rodada anterior. Naquela entrega, o PDF reunia as dez e `index.html` permitia ampliá-las sem alterar o jogo. Esses arquivos não estão disponíveis agora.

| Nº | Arquivo PNG | Direção | Principal benefício | Risco a validar em sprite pequeno |
|---|---|---|---|---|
| 01 | `01-pixel-16bit.png` | Pixel art 16-bit, massas simples | Leitura rápida, proximidade do motor atual | A simplificação pode diminuir riqueza de lore |
| 02 | `02-pixel-pictorico.png` | Pixel art pictórico detalhado | Textura e atmosfera mantendo pixels | Ruído do chão e custo de animação |
| 03 | `03-desenho-cel.png` | Desenho 2D com contorno e sombras de animação | Silhueta clara e expressiva | Definir espessura de linha e suavização |
| 04 | `04-guache-botanico.png` | Guache botânico | Mundo orgânico e materialidade | Separar pincelada de terreno e personagem |
| 05 | `05-aquarela-tinta.png` | Aquarela e tinta | Leveza e identidade de livro naturalista | Contraste da Névoa branca no fundo claro |
| 06 | `06-papel-recortado.png` | Papel recortado em camadas | Identidade artesanal forte | Sombras e recortes precisam girar coerentemente |
| 07 | `07-argila-stopmotion.png` | Argila / aparência stop-motion | Volume tátil e personagens marcantes | Silhuetas finas e consistência entre quadros |
| 08 | `08-lowpoly-ortografico.png` | Low-poly ortográfico | Planos limpos e volume geométrico | Não transformar a câmera em isométrica |
| 09 | `09-gravura-sombria.png` | Gravura / xilogravura sombria | Mito antigo, contraste e personalidade | Hachuras podem disputar atenção com unidades |
| 10 | `10-pintura-bioluminescente.png` | Pintura bioluminescente | Névoa, memória e âmbar muito presentes | Glow não pode esconder ameaças ou hitboxes |

**Brief comum usado:** Planície, clareira e trilha diagonal, ninho superior esquerdo, Rainha Silenciosa central com gaster âmbar e diadema orgânico, operárias, larva pálida à direita, cristal âmbar inferior direito, vegetação periférica, câmera de cima e luz superior esquerda. Sem UI/textos nem humanos. Violeta/âmbar/oliva mantêm uma base comparável; técnica, bordas, textura e luz diferenciam as direções.

**Limitações visuais dos conceitos:** composição, posição e número de operárias variam levemente; 07 traz duas operárias, não três. Não é teste A/B de pixels idênticos. A coroa precisa ser refinada como fungo/seda, evitando aparência de metal humano, e a névoa final precisa manter a leitura branca da lore. As artes achatadas não têm alfa de sprite, animações nem camadas separadas. Aprovar o estilo não aprova automaticamente cada detalhe dessas imagens.

### Inspiração pesquisada (não são assets copiados)

- **Hyper Light Drifter:** massas de cor e integração da direção artística com UI; referência para separar formas e reduzir ruído. [3](https://medium.com/the-space-ape-games-experience/hyper-light-drifter-ui-breakdown-c2d9cfe0a192)
- **Dead Cells:** leitura visual e animação clara em ação; referência para validar a arte durante combate, não apenas parada. [2](https://www.playnforge.com/pixel-art-games/)
- Comparativo de linguagens de pixel art (Hyper Light Drifter, Celeste, Blasphemous, Owlboy, Eastward): usado como panorama, sem presumir que todas as técnicas deste estudo vieram desses jogos. [1](https://the-pixel.art/articles/modern-indie-pixel-games/)

## 3. Inventário de arquivos — cobertura integral do acervo versionado

**Fonte detalhada, um item por linha:** [`docs/arte/inventario-imagens.csv`](docs/arte/inventario-imagens.csv).

Campos: caminho, categoria, fase proposta, dimensões reais, modo, presença de canal alfa, bytes, SHA-256, chave no MANIFEST, carregador, fonte do pipeline, derivados e ação planejada. Inclui **128 vínculos fonte → derivado** extraídos de `tools/prepare_assets.sh`, sem executar o pipeline nem sobrescrever arte. Alfa presente não comprova recorte correto; essa validação vem no lote de produção.

Reprodução: `python tools/inventory_visual_assets.py` com Pillow no ambiente de arte. O jogo não ganha dependências.

### 3.1 Imagens em `game/assets/`: 176 arquivos

| Categoria | Arquivos | Unidades lógicas / observações | Fase |
|---|---:|---|---|
| Rainha e castas | 11 | Rainha + 10 castas; Dinoponera é alias ampliado da Bala | F2 |
| Inimigos comuns | 7 | larva, saúva, louva-a-deus, besouro, vespa, caranguejo, aranha | F6 |
| Animais / chefes | 26 | cinco espécies; cinco estados cada + `boar_attack` | F4 |
| Props | 55 | 19 árvores, 15 arbustos, 3 cactos, 2 samambaias, 5 pedras, 7 cristais, 3 ninhos e 1 mound | F2/F6/F7 |
| Ícones | 32 | recursos, poderes e símbolos; não são 32 mecânicas novas | F1 |
| Manto da névoa | 1 | folha de 6 quadros 48×48, 288×48 total | F2 |
| UI | 26 | 5 atlas HUD, 1 árvore, 7 maçãs, 7 santuários, 3 folhas regulares e 3 supremas | F1/F3 |
| TITLE | 4 | céu, montanhas, principal e frente | F5 |
| Noite Branca | 12 | 3 painéis × 4 camadas 320×180 | F5 |
| Loading | 2 | somente Planície e Floresta têm PNG próprio | F5 |

**176 arquivos não equivalem a 176 sprites nem a 176 recursos realmente desenhados.** Folhas contêm vários quadros; alguns PNGs não têm consumidor localizado; outros desenhos nem são PNGs.

### 3.2 Resto do acervo: 1.052 imagens

- **1.039 fontes/bancos:** animais 81; arbustos 84; arbustos2 80; árvores 84; árvores2 80; cenários 14; cristais 84; cristais1 80; formigas 27; ícones 84; ícones2 82; ícones3 92; inimigos 7; pedras 100; pedras2 60.
- **6 ícones PWA** em `app/icons/`.
- **2 ícones nativos** (Android/Windows) em `installers/`.
- **4 referências** em `Imagens inspiração/`.
- **1 captura documental** em `playtest/aba-teste.png`.

Os bancos não são todos carregados pelo jogo. O plano cobre cada um no CSV como **preservar fonte/avaliar derivado**, não fabricar mil cópias novas sem utilidade. Se o usuário quiser reestilizar também todo o acervo histórico não utilizado, isso será um escopo separado. Capturas de documentação serão refeitas no jogo, nunca inventadas por IA.

**Total:** 1.228 imagens, 54.701.900 bytes; 1.223 PNG + 4 JPEG + 1 ICO. Duas TTF também foram registradas na varredura: fonte original e cópia runtime de Kiwi Soda. Nenhum arquivo de áudio gravado foi encontrado entre os versionados; o áudio existente é procedural e não entra no escopo visual.

### 3.3 Contratos e lacunas concretas

- `main.js:dupSprite("soldier", "giant")`: Dinoponera usa Bala. Planejar arte própria **com aprovação**, mantendo escala/performance e sem mudar stats.
- `config.js:BOSSES.matriarch.sprite = "e_matron"`: Matriarca Rival reutiliza Matrona-aranha; reservar sprite próprio de rainha-formiga para conciliar lore, sem trocar a aranha comum.
- `boar_attack.png` está no MANIFEST, mas não na tabela `BOSS_ANIMS`. Não anunciar animação de ataque em uso nem produzir folha nova sem decidir seu consumidor.
- `mound.png`, `tree_burned1.png` e `tree_burned2.png`: arquivos presentes sem carregador localizado em `assets.js`. Auditar uso antes de decidir arquivar; nada apagado nesta entrega.
- Comentário antigo de maçãs 320×320 não é contrato atual: os PNGs são 960×960. Usar medidas do CSV e consumidores, não comentários históricos.
- Flores de Planície/Floresta/Pântano: **54 células existentes** (36 regulares + 18 supremas), em 6 PNGs. Deserto/Outono/Gelo/Pálida não têm essas folhas. Produção de todos os sete jardins resultaria em 126 células / 14 folhas, mas as **72 células novas** dependem de aprovação de espécies/escopo; Pálida continua selada.
- Loadings: Pântano/Outono/Pálida usam Floresta; Deserto/Gelo usam Planície (`LOADING_IMAGE_FILES`). Quatro ilustrações novas fecham os seis biomas atuais; Pálida é lote futuro.
- Cutscenes: só a Noite Branca possui camadas PNG. As outras sete definições, com três painéis cada, usam desenho de reserva. **21 painéis sem arte dedicada**, não 21 PNGs ausentes. Número de camadas de cutscenes futuras precisa ser confirmado; a decisão 4+4+4 é da Noite Branca.
- Ninho atual é **corte transversal** (`nest.js`), em conflito com top-down para novas peças de mundo. Antes de F7, decidir redesenho top-down ou exceção explícita. Não converter o layout silenciosamente.

## 4. Inventário visual sem PNG (também faz parte da migração)

| ID | Item lógico | Onde está hoje | Ação / ordem |
|---|---|---|---|
| PROC-01 | 6 terrenos completos e trilhas | `world.js:bakeGround`, `config.js:MAPS` | F0 piloto → F6, bases limpas por bioma |
| PROC-02 | tufos, trevos, cogumelos, poças, rachaduras, neve e ornamentos de solo | `world.js:groundFlourish` / `bakeGround` | F6; separar decoração da base, aprovar camadas |
| PROC-03 | pilha de comida | `world.js:bakePileSprite`, canvas 56×40 | F2 recurso-piloto → F6 temas dos biomas |
| PROC-04 | sombras de props e terreno/minimapa assados | `world.js` / `render.js` | F6; âncora, luz e colisão coerentes |
| PROC-05 | névoa de exploração | `fog.js` | F2/F6; não confundir com névoa do inimigo |
| PROC-06 | minimapas, marcadores e visão H | `lore_hud.js`, `game.js`, `brain.js` | F1/F2; manter significado de perigo/comida |
| PROC-07 | anéis de XP, trilha de onda, pulsação da vida | `lore_hud.js` / `game.js` | F1; estados e acessibilidade |
| PROC-08 | logo, sombras, brilho, glitch PRETITLE | `render.js:drawTitleLogo/drawPreTitle` | F5; preservar texto editável e legibilidade |
| PROC-09 | fundos de reserva, ciclo dia/noite e partículas do TITLE | `render.js` | F5, em harmonia com quatro camadas |
| PROC-10 | botões, cartões, tooltips, barras, modais e sliders | `ui.js`, `game.js` | F1, estados normal/hover/pressionado/desativado/foco |
| PROC-11 | seletores, nós, conexões, cinza→cor da árvore | `meta.js`, `tree_art.js`, `color_restore.js` | F3, sem mudar custos ou hitboxes inadvertidamente |
| PROC-12 | flores de reserva e auras de supremas | `meta.js` | F3; mesmas regras de progressão e estados |
| PROC-13 | 11 auras/VFX de castas e cristais de memória | `lore_vfx.js`, `units.js` | F2, manter orçamento de partículas |
| PROC-14 | tiros, orbes, impactos, explosões e status | `combat.js`, `particles.js`, `render.js` | F2; hit-flash, cura, fogo, veneno, lentidão |
| PROC-15 | telegráficos, fase 2 e efeitos de chefes | `enemies.js`, `render.js` | F4; legíveis sobre cada terreno |
| PROC-16 | corpo/ovos/carga/seleção e animação procedural das formigas | `units.js`, `render.js` | F2; registrar estados em ficha da casta |
| PROC-17 | entrada e 6 câmaras do ninho | `nest.js`, `config.js:CHAMBERS` | F7; sete salas, oito conexões, área externa ao vivo |
| PROC-18 | seda, mel, esporos, berçário, cristais, coroa, faíscas no ninho | `nest.js:drawRoyal/drawNursery/drawPantry/drawBarracks/drawFungus/drawRefinery` | F7; peças separadas e estados de escavação/nível |
| PROC-19 | transições: bloom, swipe, zoom, dissolve, iris e fade | `render.js:drawTransition` | F5; compatibilidade com efeitos reduzidos |
| PROC-20 | painéis de lore e fallback de cutscenes | `cutscenes.js` | F5; preservar avanço, PULAR e replay |
| PROC-21 | tela de loading: barra, dicas, vinheta, erro e pronto | `loading_screen.js` | F5; imagens sem texto embutido |
| PROC-22 | derrota/vitória, draft, memórias e profecias | `game.js`, `mutations.js`, `tutorial.js` | F1/F5; símbolos consistentes, sem alterar recompensas |
| PROC-23 | controles/gestos e apresentação mobile | `game/mobile/touch.js`, `mobile.css` | Em cada fase; compartilhar arte, não duplicar lógica |
| PROC-24 | site e central de instalação | `index.html`, `app/app.css`, `app/online.html` | F9; identidade visual sem prometer release inexistente |
| PROC-25 | sinais visuais de Eras | `world.js` e histórico MEGA | F7; validar o que efetivamente é desenhado, não assumir que ler `era` implementa tudo |
| PROC-26 | tipografia e glifos | `font.js`, Kiwi Soda TTF | F1; manter fonte inicialmente; trocar só com autorização e validação de métricas |

Essa lista organiza sistemas e famílias, não promete contar cada partícula gerada em tempo de execução. A revisão manual integral de consumidores ainda deve ser concluída por lote antes de retirar arte legada.

## 5. Ordem proposta de implementação (com portas de aprovação)

Mantém a ordem histórica P12 para as grandes famílias: **HUD → VFX → Árvore → Chefes → Cutscenes → Inimigos → Formigueiro → Pálida**. Adiciona apenas um piloto técnico anterior e a distribuição posterior. Terrenos/props entram junto aos inimigos em F6, sempre **base limpa → decoração → construções** por bioma. Esta é proposta de execução, não autorização de integrar tudo.

| Ordem | Pacote e itens | Dependência | Critério para avançar |
|---|---|---|---|
| F0a | **Escolha concluída:** 06 — papel recortado; prompt-mestre registrado e Regra 6 reconciliada | decisão explícita de 2026-10-08 | validar escala, cores finais e aplicação técnica no piloto; aprovar a nova referência 06 v2 |
| F0b | Piloto: rainha, Cortadeira, larva, cristal e pequena base limpa da Planície; mock com HUD atual | F0a + referência disponível e aprovada (nova v2 ou original) | arquivos individuais com alfa, leitura em escala real, teste PC/mobile; aprovação antes do lote amplo |
| F1 | 5 atlas HUD + 32 ícones + UI procedural + tipografia/estados | piloto | 9-slices íntegros, texto normal/grande e toque; sem mudança de custos/saves |
| F2 | 11 castas + Rainha; VFX, névoa, cristais e pilha de comida | F1 | toda casta reconhecível, status legíveis e cache/rotações dentro do orçamento |
| F3a | árvore ancestral + 7 maçãs + elementos procedurais | F2 | cinza/50%/100%, restauração fiel, nós e galhos alinhados |
| F3b | santuários: Planície → Floresta → Pântano → Deserto → Outono → Gelo; prévia Pálida por último | F3a | um santuário por entrega; terreno limpo antes dos props; não cobrir hitboxes |
| F3c | flores de cada santuário junto de sua entrega, 3 espécies × 4 + Suprema × 6 | respectivo santuário e espécies aprovadas | paradas da fábrica de flores, cinza/colorido e leitura 48/64 px |
| F4 | Tamborilador → Caçadora → Sombra → Matriarca Rival → Galhada → Devastador; fases e telegráficos | F2 + contratos de animação | direção, pivot, estados e sinais de ataque verificados; combate inalterado |
| F5a | TITLE/PRETITLE (4 camadas), logo e fundos de menus | F1 | bordas cobertas em parallax, ciclo dia/noite e efeitos reduzidos |
| F5b | 6 loadings, primeiro recriar os 2 existentes, depois 4 biomas sem arte própria | F5a | só troca de mundo; erro/pronto/continuar intactos |
| F5c | Noite Branca: painel 1 → 2 → 3, quatro camadas cada | F5a | alfa real, 320×180 enquanto contrato atual valer, replay e toque |
| F5d | outros painéis de memórias, se expansão aprovada | F5c e escopo de camadas confirmado | não confundir definição/fallback com PNG concluído |
| F6 | 7 inimigos + 6 terrenos completos + árvores/arbustos/cactos/samambaias/pedras | F4/F5; base limpa aprovada por bioma | colisão/âncoras e leitura de horda; nenhuma decoração embutida indevidamente |
| F7 | 3 estados exteriores do ninho + interior, câmaras, túneis, recursos e sinais de Eras | decisão da câmera do interior | fluxo de entrada/saída, escavação e visão externa preservados |
| F8 | Pálida: rainha ancestral de névoa, castelo/ninho, arena, coração, efeitos e final | pedido próprio para conteúdo futuro | design/arte aprovados; implementação do mapa/chefe é escopo distinto |
| F9 | PWA 6 ícones, Android/Windows 2 ícones, site, documentação, pacote offline | fases integradas | versão/cache/shells consistentes, todos recursos disponíveis offline |

**Subordem dentro de qualquer lote:** ficha técnica → pesquisa específica → perguntas → conceito → confirmação → sprites/camadas → visualização no tamanho real → integração → testes → jogo PC/mobile → aprovação da fase → próxima fase. Nada de trocar os 176 PNGs numa única entrega.

### Fichas obrigatórias por item

Cada linha de produção precisa de: ID lógico, arquivo de origem/destino, consumidor, bioma, estado/animação, dimensões/célula, direções/quadros, pivot, hitbox, escala, sombra, paleta, técnica, orçamento de bytes/memória, lote e dependência, prompt/referência, aprovação e link de backup. Os campos estáticos já existentes estão no CSV; valores novos serão fechados no piloto, não inventados como contratos atuais.

### Ordem interna das castas (F2)

Rainha (`queen`) → Cortadeira (`worker`) → Bala (`soldier`) → Arpão (`trapjaw`) → Acrobata (`spitter`) → Fogo (`bomber`) → Cefalote (`tank`) → Pote-de-Mel (`gatherer`) → Prata (`scout`) → Matabele (`healer`) → Tecelã (`weaver`) → Dinoponera (`giant`, arte própria proposta). Preservar os nomes lógicos existentes; um nome técnico como `soldier` não é autorização para inventar outra espécie.

### Contratos de animação existentes (F4)

Folhas têm 4 linhas (baixo/esquerda/direita/cima), células 64×64. Quadros por estado, conforme `BOSS_ANIMS`:

| Espécie | Idle | Walk | Run / Flight | Hurt | Death |
|---|---:|---:|---:|---:|---:|
| Javali | 4 | 6 | 5 | 4 | 6 |
| Raposa | 4 | 6 | 6 | 4 | 6 |
| Lebre | 4 | 5 | 6 | 4 | 6 |
| Cervo | 4 | 6 | 6 | 4 | 7 |
| Tetraz | 4 | 6 | 6 (flight) | 4 | 6 |

São **516 células consumidas** nessas 25 folhas. A 26ª (`boar_attack`) é catalogada à parte. Os animais atuais usam vistas direcionais inclinadas; a arte nova deve respeitar top-down, conservando ordem de linhas/estados ou alterando o contrato com teste explícito. A Matriarca usa rotação de sprite estático, não esse atlas.

### Fábrica de flores sem exceder o teto

Por santuário: escolher 3 florescidas (seis candidatos em sub-rodada), derivar brotos/meios em sub-rodada seguinte (seis imagens), mostrar nove vivos aprováveis e fazer PARADA 1. Depois, brotos mortos derivados dos vivos e seis fases da Suprema em sub-rodadas de até dez imagens, contando alternativas, seguidas da PARADA 2. A macro-cadência 9 vivos / 9 restantes é preservada; não contar duas opções como uma imagem gerada. Produzir espécies diferentes, não recolorir a mesma flor. Morto deriva do broto, não da adulta. Preços existentes não mudam no rework; preços/níveis novos exigem pergunta própria.

## 6. Tecnologia, preservação e aceite

### Não trocar o motor só por escolher um estilo

Mesmo 07/08 podem entrar como **sprites 2D pré-renderizados** no Canvas atual; o plano não pressupõe engine 3D. Pixel art mantém nearest-neighbor e grade coerente. Estilos suaves exigem avaliar resolução/smoothing/rotações no piloto — não ligar filtro global às cegas, pois ele afetaria fonte, HUD e folhas existentes. Evitar alocação e processamento de pixels por quadro.

Contratos a preservar ou revisar explicitamente: canvas 960×540, mundo 3200×2400, rotações de formigas (24 ângulos + hit-flash), Dinoponera em escala 20× sem assar tamanho gigante, corpo das maçãs normalizado, folhas regulares 768×576 (4×3 de 192), supremas 1152×192 (6 células), santuários 960×540 e regiões restauradas da árvore. Dimensões de originais não são dimensões de uso.

### Integração por lote

- Arte-fonte e candidatos em `art-source/`; somente finais usados em `game/assets/`.
- RGBA real, bordas sem halo e sem xadrez pintado. Testar contra fundo claro/escuro e no bioma.
- MANIFEST/carregador, recortes, pivots e consumidores atualizados juntos; não substituir imagens mantendo recortes incompatíveis.
- Qualquer byte alterado em `game/`/`app/`: subir `ASSET_V`, rodar `node tools/make_assets_list.mjs` e `node tools/sync-native-assets.mjs`.
- Novas artes acessíveis pelo TITLE entram em `preload.js` fatiado; loading só em troca de mundo. Mesmo runtime PC/mobile, saves preservados.
- Futuros testes: `test:quick`, `npm test`, `inspect`, `inspect:layout`, `inspect:tree`, `inspect:ui`, `inspect:hud`, `inspect:preload`, `inspect:pwa` e `native-packages` conforme lote. Testar aparelhos físicos antes de prometer desempenho universal.
- Desempenho: medir bytes, memória decodificada, tempo de boot/pré-carga e FPS contra baseline; metas/budgets de cada técnica fechados no piloto, não presumidos pela aparência do conceito.
- Rollback por lote: manter histórico/fonte e voltar arte + recortes + versão de cache juntos; nunca resetar saves para corrigir aparência.
- Em cada aprovação: atualizar MEGA com planejado/implementado/verificado, resultados e limitações. PR/merge só quando solicitado, sem mudar a branch da sessão.

### Preservação desta rodada

Pasta do projeto no Drive localizada e acessível: [Fumiga Arquives / Fumiga-GOAT - Imagens do jogo](https://drive.google.com/drive/folders/1IMj_-7VQf_asmRmMoMSzKxIQ37M6DXlW).
O ZIP histórico de 2026-10-07 e seu manifesto foram encontrados por metadados; não foram baixados/revalidados byte a byte nesta rodada. Há também pastas de conceitos de outras execuções; não foram alteradas.

**Retificação de disponibilidade após a escolha:** na entrega anterior, PNGs, galeria, PDF e ZIP foram criados/exibidos no workspace. Nesta continuação, o diretório `art-source/estilos-2026-10-08/` e o ZIP não estão disponíveis. Portanto, a afirmação anterior de preservação persistente **não pode ser mantida**. Metadados e hashes sobreviveram em `docs/arte/amostras-estilos.json`; backup remoto dos novos binários continua **não confirmado**. A busca no Drive por `papel`, `recortado` e pelo nome do ZIP não retornou arquivos; isso não descarta arquivos sob outros nomes. Recuperar o PNG 06 original e conferir o hash antes do piloto. Não recriar uma imagem sob a identidade/hash do original.

O conector atual oferece upload por `file_path`; a limitação de interface descrita na entrega anterior não deve ser tomada como permanente. Os binários ausentes não foram enviados nesta continuação. Fontes recuperadas/novas devem ser preservadas no Drive com resultado de upload verificado, sem apagar a única cópia local.

## 7. Verificação da rodada de dez conceitos (histórico)

- Setup de desenvolvimento preparado com Chromium empacotado; nenhum pacote de produção adicionado.
- `npm run test:quick`: **29/29** passaram antes das mudanças documentais.
- `npm test -- -j 2`: **32/33**; `regressions` falhou em `running !== lost` (linha 129), padrão intermitente já registrado no histórico. O teste passou isolado; repetição completa `npm test -- -j 1`: **33/33** em 132,9 s, sem testes pulados. Nenhum código de jogo foi alterado para fazer o teste passar.
- Galeria no Chromium, PC 1440×1000 e mobile 390×844: dez imagens decodificadas, modal abre/fecha, sem overflow horizontal, JS ou HTTP com erro. Preview dedicado na porta 8001.
- `npm run inspect`: PC e mobile, telas e seis mapas, sem JS/404/glifos ausentes; ~59–60 FPS no ambiente headless. Capturas de RUN e Árvore abertas para inspeção. Não é campanha completa nem teste físico.
- Dez PNGs gerados, inspecionados e exibidos. Naquele momento nenhum era definitivo; a escolha posterior tornou o **06** a direção oficial, não um asset pronto para integração.
- Inventário: todas as imagens abrem; hash, dimensão e categoria por arquivo; vínculos de fonte existentes conferidos. A presença no MANIFEST prova carregamento, não necessariamente desenho.
- Preview do jogo atual ativo na porta 8000. Galeria é documento separado, fora do pacote offline.
- A revisão manual de **todos** os arquivos e a produção/integração completa **não estão concluídas**. A escolha do estilo está concluída. Próximos passos: recuperar a referência 06, concluir contratos e piloto F0 antes de iniciar F1.

## 8. Registro da escolha — 2026-10-08

- Estilo 06 escolhido explicitamente; guia, prompt-mestre, regras e metadados sincronizados.
- Direção visual aprovada não equivale a anatomia, atlas, animação ou integração aprovada.
- Nenhuma imagem gerada nem asset/código do jogo alterado nesta continuação.
- Sem pedido de salvar no GitHub; nenhum push, PR ou merge executado.
- Verificação atual: integridade das seis fontes (120.115 bytes), lista de assets vigente, JSON e prompt canônico consistentes, `git diff --check` limpo.
- Inspeção atual limitada a TITLE e Planície em PC/mobile: **4/4 cenas**, sem JS/404/glifos ausentes; 60 FPS no RUN headless. Preview do jogo antigo ativo na porta 8000; não demonstra a nova arte. Não repetida a suíte completa.

## 9. Verificações da nova rodada v2

- Exatamente dez chamadas de geração, uma por estilo, sem opções extras; dez PNGs de 1376×768, total 25.217.876 bytes.
- Dez imagens abertas para inspeção; formatos distintos reconhecíveis. A composição varia: 05/10 têm quatro operárias, 08 tem duas, 04 orienta a rainha na diagonal e 09 apresenta margem clara. Conceitos, não assets/camadas de produção; revisar anatomia/diadema e sombras no piloto.
- Os dez uploads foram confirmados pelo conector; listagem posterior encontrou os dez nomes/IDs. Tamanho e SHA-256 remoto/local coincidem para todos. PDF, ZIP e manifesto também tiveram tamanho/hash conferidos contra os retornos de upload.
- PDF com dez páginas. ZIP sem erro CRC, exatamente dez PNGs, cada hash interno igual ao original.
- Galeria no Chromium: PC 1440×1000 e mobile 390×844, dez imagens decodificadas, sem overflow horizontal, erros JS ou HTTP; abertura do PNG 06 em nova aba testada. Capturas PC/mobile inspecionadas.
- Preview da galeria na porta 8001; jogo antigo na porta 8000 com HTTP 200. Nenhum teste de integração da arte no jogo, pois não houve integração; não repetida a suíte completa.

## 10. Amostras de cenário 06/08 — 2026-10-08

Foram produzidas duas bases limpas top-down da Planície do Amanhecer, nos estilos 06 papel recortado e 08 low-poly, a pedido do usuário. Referências da rodada v2 recuperadas do Drive com hash conferido; PNGs novos, PDF e manifesto enviados e verificados. Ver [registro e links](docs/arte/cenarios-06-08.md). É estudo de terreno/comparação de técnica, não integração de mapa nem conclusão do piloto F0b. A direção oficial 06 permanece inalterada.

## 11. Confirmação do estilo 06 com riqueza de detalhe — 2026-10-08

O usuário decidiu definitivamente pelo papel recortado e exigiu que tudo seja bem detalhado, sem sensação de vazio. O guia e a Regra 6 agora usam `FUMIGA-PAPEL-v2-DETALHADO`; versão anterior preservada no histórico. O estudo 08 não é mais alternativa pendente de escolha.

As bases limpas entregues não são padrão de densidade do cenário final. F0b deve validar grandes formas + detalhes médios + finos, com uma prévia composta das camadas aprovadas: terreno texturizado → decoração → construções/VFX pertinentes, respeitando a Regra 19 e as aprovações por passada. Material rico de baixo contraste nas áreas jogáveis; maior densidade nas bordas e pontos de interesse. UI/ícones e silhuetas não podem perder leitura, especialmente no mobile. A mesma exigência de acabamento vale para todas as famílias F1–F9, sem ampliar mecânicas nem conteúdo futuro.

Nenhuma imagem nova ou integração nesta confirmação; não reclassificar os PNGs antigos como produzidos com o novo prompt. Próximo passo é validar visualmente esse refinamento no piloto, não migrar todos os assets automaticamente.
