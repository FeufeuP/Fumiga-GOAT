# Ordem de implementação — papel recortado detalhado

**2026-10-08.** Usuário: “Certo curti o estilo visual, agora me apresente a lista e ordem de implementação de todos os aseets do jogo”. Aceite do visual do piloto registrado; não é autorização para integrar tudo nem dispensa correções técnicas. Nenhum runtime alterado nesta entrega.

Ordem: finalizar piloto F0 → HUD F1 → castas/recursos/VFX F2 → árvore/maçãs/santuários/flores F3 → chefes F4 → menus/loading/cutscenes F5 → inimigos/terrenos/props F6 → formigueiro F7 → Pálida futura F8 → distribuição F9.

Inventário arquivo a arquivo: [inventario-imagens.csv](inventario-imagens.csv), snapshot histórico de 1.228 imagens; não confundir com pacote atual nem número de sprites. Acervo não utilizado é preservado, não refeito automaticamente. As contagens abaixo vêm desse snapshot, não de nova auditoria integral.

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


## Regras transversais

Máximo dez gerações por rodada, sem opções extras não solicitadas; aprovação antes de integração. Base limpa → decoração → construções, por bioma. Flores: nove vivos → aprovação → três mortos + seis fases da Suprema → aprovação. Preservar anatomia/top-down, fonte Kiwi Soda, saves, preços, seeds e hitboxes. Câmera do ninho precisa de decisão própria. Pálida não está autorizada.

Cada lote: ficha e consumidor → arte → recorte/escala/rotações → revisão → integração autorizada → testes e inspeção PC/mobile → backup verificado e documentação. Cache/offline/sincronização nativa são revistos a cada integração, não adiados até F9.

Piloto ainda tem halos, perda de seda, identidade da Cortadeira e aliasing a corrigir. Leitura integral do MEGA ainda não comprovada; concluir antes de integração. Esta lista apresenta o plano existente e suas pendências, não declara migração concluída.
