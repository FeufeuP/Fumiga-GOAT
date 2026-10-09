# F1 — fidelidade à arte mostrada

## Correção de fidelidade — 2026-10-08

Usuário: “A revisão que você me mostrou não mostra as imagens que você meostrou, quero que o HUD seja o que você me mostrou, nunca outro”. Rejeitada a interpretação simplificada. Usar a imagem mostrada como arte, não somente referência. Proibido substituir por desenho procedural, recolorir ou gerar alternativa silenciosamente. Fonte vinculada: `art-source/f1-pastel/originais/painel-vinhas.png`; SHA256 `f4e775e038a98cbf23bd1e12958ae77070e8da6996e94043e4872e6c245aa47e`.

Prévia :8001 corrigida no mesmo endereço: original intacto, HUD com texto Kiwi Soda sobre o mesmo PNG e prova de escala. Cópia byte-idêntica em images/painel-original.png; derivado alfa remove apenas fundo neutro exterior, RGB de todos os pixels preservado. Nenhuma geração/recoloração/novo ornamento. O original local foi reaberto e medido em 1717×916 (difere da dimensão 1568×837 registrada anteriormente; não presumir equivalência binária com arquivo remoto antigo). Proporção preservada: 320×170,72, incompatível com caixa atual 320×118 sem adaptar layout. Não achatar nem substituir para caber; texto pequeno ainda não é layout final. Recorte/halos precisam revisão antes de produção.

A revisão simplificada saiu da interface ativa e foi preservada em historico-rejeitado/ e no ZIP remoto anterior. Três cenas × três perfis verificadas, original pixel-idêntico ao drawImage direto, proporção preservada, controles por clique/toque, sem overflow/JS/HTTP. Inspeção do jogo antigo TITLE/RUN PC/mobile 4/4, sem erros. Sem integração, novos atlas, suíte completa ou publicação GitHub. Leitura integral do MEGA ainda não comprovada. Pesquisa Lumino City/National Videogame Museum apenas pela fidelidade de material, não autorização de novo design. Próximo: adaptar layout à arte escolhida, nunca trocar a arte por conveniência técnica.

## Histórico — revisão abaixo rejeitada

# F1 — redesign do conjunto de HUDs

2026-10-08. Pedido: alterar todo o tom e design, não só a moldura; tons claros/pastéis de terra, âmbar laranja, verde vivo; galhos, árvores, folhas e vinhas estruturam o HUD.

## Entrega desta revisão
Prévia interativa isolada em `art-source/f1-hud-vivo/`, servidor de revisão :8001. Seis cenas: expedição, colônia expandida, irmãs/tooltip, pausa, opções e cartões. Painéis creme, castanho mel, botões verdes/laranja, barras sobre galhos, suporte arbóreo do minimapa, vinhas. Kiwi Soda carregada do jogo. Canvas 960×540 e referência às caixas de HUD atuais; valores e desenho de mundo/minimapa ilustrativos. Sem acesso a save. Os controles do protótipo NÃO implementam as ações de gameplay.

Nenhuma geração IA nova: materiais reaproveitados do painel pastel e folha F1, com recortes/clareamento via Pillow, ornamentação Canvas e composição. Não impor aparência de atlas final: madeira/galhos ainda simplificados; os 32 ícones, cinco atlas e todos os biomas/estados não foram produzidos. O acabamento rico precisa de aprovação e refinamento. Sem produção, filtro global, hitboxes reais ou fonte alterados. Aprovação visual antes de integração continua obrigatória.

## Verificação
- Navegação das seis cenas × PC / mobile paisagem / retrato: 18 verificações, sem erros JS/HTTP ou overflow horizontal; retângulos dos controles dentro do Canvas.
- Clique/toque real de pausa e continuar aprovado nos três perfis. Slider e seleção são demonstrativos; não medidos contra targets físicos de acessibilidade. Retrato reduz o Canvas; não alegar legibilidade final de jogo nessa orientação.
- Teste inicial falhou por coordenada de página após scroll; corrigido o teste para clique relativo ao Canvas, não mascarado o fluxo.
- Textura de madeira repetida gerou emendas brancas; retirada das bordas antes da entrega, mantendo papel derivado e folha.
- Inspeção do jogo atual TITLE/RUN PC/mobile: 4/4 sem JS/HTTP/glifos. Não é teste de arte integrada. Suíte completa não repetida.
- Docs/handoff aprovados; leitura integral do MEGA continua não comprovada, sem alegação de conclusão.

Pesquisa: Garden Story (https://digitalchumps.com/garden-story-preview/) pela vegetação com personalidade; não copiar pixel art nem mudar a técnica oficial. Prompt v3 permanece vigente, sem chamada de geração nesta rodada.

## Pendente
Aceite do conjunto, arte final por camada, contraste por estado/bioma, testes de texto grande/toque real, integração no runtime e performance/offline. Preview não equivale a todos os HUDs migrados.
