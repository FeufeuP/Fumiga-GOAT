# FUMIGA — estilo oficial 06: papel recortado detalhado

**Decisão vigente — 2026-10-08:** “Esqueça este estilo ambar com roxo ou azul escuro, quero tons pastéis, tons da paleta do marrom que remeta a terra, laranja que lembre ambar, verde que lembre folhas e vinhas. Também dê vida ao HUD, vinhas, folhas, madeira...”

A técnica 06 de papel recortado detalhado permanece. A paleta anterior foi rejeitada; a primeira aplicação é a revisão de F1, sem recolorir automaticamente o restante do jogo.

**Prompt-mestre:** `FUMIGA-PAPEL-v4-CHROMA`\
**Estado atual — 2026-10-09:** migração parcial de HUDs opacos e brasa integrada por pedido explícito. Três novas molduras e uma chama em [HUD_PUBLICACAO.md](HUD_PUBLICACAO.md); não equivale ao rework completo nem ao aceite visual de todas as peças.

**Para novos chats:** o [guia de continuidade no MEGA](../../MEGA_ARQUIVO.md#continuidade-artistica) reúne neste mesmo arquivo de memória as decisões, receitas de ficha, referências/recuperação, execução por camadas e checklist. O prompt v4 abaixo mantém paleta/HUD do v3 e acrescenta o chroma obrigatório nas fontes geradas (2026-10-10); o v3 está preservado em [histórico](historico/ESTILO_OFICIAL-v3.md).

## 1. Direção e precedência

**Fidelidade obrigatória (2026-10-08):** o HUD deve usar a arte mostrada ao usuário, nunca substitutos simplificados. Ver [fonte e revisão](F1_HUD_VIVO.md). Sem redesenho, recoloração ou nova geração não solicitados. Ajustar layout com aprovação quando necessário, não deformar a arte para ocultar incompatibilidades.

- **Papel recortado detalhado, não minimalista:** recortes trabalhados, camadas rasas, textura tátil, variações de material e acabamento rico, conservando silhuetas legíveis.
- Vale para **todo o conjunto visual**: personagens, fauna, vegetação, flores, recursos, cenários, construções, ícones, UI, árvore, menus, loading e cutscenes. O nível/tipo de detalhe se adapta ao tamanho e à função; um ícone pequeno não recebe a densidade de uma tela de carregamento.
- As amostras de terreno 06/08 foram estudos de base limpa. **Não representam a densidade visual final desejada.** O 08 permanece apenas como comparação histórica.
- Não mudar câmera, lore, anatomia, motor, fonte, mecânicas, colisões, saves ou requisitos de desempenho para atingir esse acabamento.
- A Regra 19 permanece: base limpa → decoração separada → construções separadas, com aprovações por passada. Uma prévia composta permite avaliar riqueza final, sem transformar o cenário em uma imagem única de produção.

## 2. Prompt-mestre canônico

Usar integralmente o bloco seguinte em toda nova geração/edição, acrescentando a ficha da peça. Passar somente referências binárias realmente disponíveis. A regra técnica de chroma foi autorizada em 2026-10-10; mudanças futuras exigem nova aprovação e histórico preservado. **A versão do prompt não é o número da rodada de imagens**: a cena 06 da rodada v2 e a base 06 foram geradas com `FUMIGA-PAPEL-v1`; os outros estilos usaram instruções específicas de comparação.

<!-- INICIO PROMPT FUMIGA-PAPEL-v4-CHROMA -->
Crie uma única peça visual original para FUMIGA — Colônia Eterna no estilo oficial 06 de papel recortado artesanal, agora com acabamento rico e altamente detalhado, conforme a decisão explícita do usuário. A direção não é minimalista nem deve transmitir vazio ou aspecto de protótipo. Construa formas com camadas rasas de papel colorido, bordas de tesoura ligeiramente irregulares, fibras sutis e superfícies predominantemente foscas. O volume vem da sobreposição e de sombras de contato curtas e suaves; não de pixels aparentes, plástico, argila, metal realista ou modelagem low-poly. Use silhuetas reconhecíveis em tamanho pequeno, com recortes internos trabalhados e detalhes próprios da peça, com separação clara de personagem, recurso, ameaça e fundo. Evite contornos pretos grossos de cartoon: a borda cortada e o contraste entre papéis definem as formas.

Distribua o detalhamento em três níveis: grandes formas que organizam a leitura, recortes médios que definem o assunto e detalhes finos de material. Mostre sobreposições elaboradas, fibras, variações sutis de pigmento e espessura, bordas artesanais e pequenos relevos coerentes, sem transformar papel em pintura lisa, plástico ou fotorrealismo. Evite áreas extensas uniformes sem tratamento, mas não preencha tudo com ruído, confetes ou peças repetidas. Em peças botânicas autorizadas, trabalhar nervuras, pétalas, filamentos e recortes delicados; em insetos, segmentos, placas, articulações e acessórios compatíveis com a anatomia; em UI, molduras trabalhadas com áreas limpas para texto e ícones. Aplicar apenas os detalhes pertinentes ao assunto solicitado, sem adicionar objetos de outras categorias a um sprite isolado.

Em uma composição final de cenário, buscar abundância orgânica e sensação de lugar vivo por agrupamentos variados, sobreposições e transições cuidadas entre zonas. Concentrar o detalhe mais denso nas bordas, pontos de interesse e áreas não transitáveis; manter caminhos, personagens, recursos, ameaças e telegráficos destacados. Áreas de combate podem ter material rico de baixo contraste, sem virar superfícies vazias nem competir com a ação. A riqueza deve resultar da montagem de terreno, decoração, construções e efeitos em camadas independentes aprovadas, nunca da fusão desses elementos numa base de terreno. Para bases limpas, detalhar exclusivamente o material, as transições de cor e o relevo suave, sem incluir vegetação individual, raízes, pedras ou construções. Base limpa não significa cenário final vazio. Não gerar camadas ou assuntos além dos autorizados na ficha.

Mantenha a identidade biológica e mítica do FUMIGA com a nova paleta pastel terrosa: marrons suaves de terra e madeira, papel creme e areia, laranja suave que lembre âmbar, verdes de folhas e vinhas como sálvia, oliva clara e musgo suave. Abandone a combinação anterior de âmbar com roxo ou azul-escuro: não usar esses tons como base artística, sombra ou acento dominante (o azul técnico do chroma não faz parte da paleta da peça). Use sombras curtas castanhas e quentes; reserve marrom mais escuro a texto, separação e pequenos contatos necessários à leitura, sem grandes painéis escuros. Pastel não significa falta de contraste. A Névoa permanece branco-osso em camadas leves de papel, sem esconder ameaças. Quando a ficha autorizar HUD, dar vida às bordas com vinhas, folhas reconhecíveis e madeira traduzida em recortes de papel: agrupamentos orgânicos variados, veios e nervuras de escala média, não apenas fios decorativos minúsculos. Preservar áreas de texto e toque; separar ornamentos não extensíveis das faixas de nove fatias. Riqueza orgânica não autoriza animações novas automaticamente. Luz suave vindo do alto à esquerda. Preserve a anatomia animal: formigas com seis patas ligadas ao tórax, duas antenas e corpo segmentado; ferramentas e acessórios são proporcionais ao inseto. A Rainha Silenciosa tem gaster âmbar e diadema orgânico de fungo e seda, nunca coroa metálica humana. Proíba bipedia humana, rosto ou mãos humanos e roupas humanoides.

Para personagens, objetos, terrenos, construções, santuários e flores, use vista ortográfica estritamente de cima, sem horizonte e sem câmera isométrica. Somente ilustrações de menus, carregamento, árvore de habilidades e maçãs podem usar outro enquadramento, explicitado na ficha da peça. Mantenha escala relativa, margem segura e âncora consistentes entre estados da mesma peça.

Produza arte em alta resolução, com bordas legíveis e sem texto, logotipo, marca-d'água ou interface embutida. Sprite ou camada isolada: nenhuma cena ao redor da peça; usar o fundo técnico de chroma descrito abaixo, nunca xadrez ou transparência como fundo da imagem gerada. Mapa-base: terreno completo e limpo, sem flores, árvores, arbustos, pedras, buracos, rachaduras ou construções; esses elementos serão peças separadas. Ilustração: composição única conforme a ficha, sem grade ou colagem de alternativas. A ficha técnica define o formato, dimensões, estado e partes a entregar; não invente novos personagens, mecânicas ou mudanças de lore.

Em TODA imagem gerada ou editada, qualquer que seja a categoria (inclusive terreno, cenário, ilustração, HUD e sprite), coloque a peça sobre um fundo técnico de chroma key uniforme, sólido e opaco: verde puro #00FF00 ou azul puro #0000FF. Se a peça tiver traços verdes, escolha fundo AZUL; se tiver traços azuis, escolha fundo VERDE. Se tiver as duas cores, escolha a que mais se distingue da silhueta e dos detalhes, verificando o recorte manualmente; não elimine cores essenciais da peça. Reserve a cor de chroma apenas para o fundo, sem gradientes, textura, cenário, xadrez, halos ou sombras projetadas sobre ele. Deixe margem de fundo visível em toda a volta da peça; em imagens que ocuparão a tela inteira, gere a composição como placa isolada com margem para permitir recorte e reconstrução da cena na preparação, sem alterar o conteúdo autorizado da arte. Esse fundo é SOMENTE da fonte gerada: preservar o original e remover o chroma com cuidado (inclusive spill nas bordas), revisar detalhes vazados e exportar o derivado com alfa real quando o consumidor exigir transparência, ou compor sobre o fundo final apropriado quando exigir imagem opaca. Nunca publicar verde/azul técnico no jogo.
<!-- FIM PROMPT FUMIGA-PAPEL-v4-CHROMA -->

### Ficha obrigatória por peça

```text
ID, categoria, bioma e função:
Assunto, estado/animação e estágio de produção:
Câmera (top-down ou exceção de ilustração autorizada):
Dimensão original/de uso, célula, âncora, escala e margem:
Grandes formas / recortes médios / detalhes finos:
Onde concentrar detalhe e onde preservar leitura:
Camadas: base / decoração / construção / contato / sombra no chão / VFX:
Fundo da FONTE: verde #00FF00 ou azul #0000FF (cor escolhida segundo traços da peça); fundo do DERIVADO: alfa ou composição final conforme consumidor:
Referências disponíveis e versão do prompt:
Destino/consumidor, orçamento de bytes/memória e aprovação necessária:
Detalhes obrigatórios / elementos proibidos nesta passada:
```

Usar contratos do inventário/consumidor atual; não inventar dimensões ou quadros. A fonte gerada deve ter chroma sólido mesmo quando o destino exige alfa ou composição opaca; preservar o original, recortar/recompor e inspecionar as bordas antes da integração. Detalhamento não autoriza gerar um conjunto inteiro quando a ficha pede uma peça.

## 3. Como evitar vazio sem prejudicar o jogo

| Categoria | Acabamento desejado | Limite de leitura/produção |
|---|---|---|
| Terreno limpo | fibras, recortes de relevo suave, pigmento e transições orgânicas de cor | sem vegetação/props embutidos; contraste baixo nos caminhos e combate |
| Decoração | agrupamentos de folhas, gramíneas, raízes, fungos e pequenos elementos coerentes com o bioma | peças separadas, variação de formas/escala; não preencher toda área com repetição uniforme |
| Árvores, pedras e construções | sobreposições, superfícies trabalhadas e detalhes próprios de cada material traduzidos em papel | câmera de cima, pivots/oclusão/áreas de passagem preservados; aprovação por passada |
| Formigas e fauna | placas, segmentos, articulações, acessórios e sinais de casta em recortes finos | anatomia animal, reconhecimento pequeno, sombra no chão separada do corpo que gira |
| Recursos e flores | camadas, nervuras, pétalas, filamentos e facetas feitas de papel | estados reconhecíveis; sprites separados e cadência de flores vigente |
| UI, ícones e árvore | molduras e relevos trabalhados, ornamentos orgânicos nos locais adequados | texto legível, 9-slice, estados e toque; sem novos cadeados/correntes na árvore |
| Menus, loading e cutscenes | planos ricos em motivos do bioma/lore e microdetalhes de papel | manter quantidades/contratos de camadas já aprovados; não redesenhar a narrativa |
| Névoa e VFX | recortes leves e variações controladas | névoa branco-osso, ameaças legíveis, partículas e efeitos reduzidos respeitados |

**Desempenho:** detalhes estáticos pertencem preferencialmente aos assets/caches, não a centenas de objetos/partículas atualizados por frame. Pré-compor detalhes estáticos dentro de sua camada ou região, preservando a separação funcional; aplicar culling e reutilizar materiais com variação controlada. Validar custo real no piloto PC/mobile, sem prometer desempenho antes de medir nem ligar smoothing global às cegas.

## 4. Critério de aprovação do piloto

- [ ] Fonte de TODA nova imagem em fundo sólido verde/azul escolhido por contraste com a peça; sem textura, gradiente ou spill; derivado com recorte/bordas revisados, alfa ou fundo final correto, antes da integração.
- [ ] Material de papel perceptível, rico, sem aparência de fundo provisório ou grandes superfícies sem tratamento.
- [ ] Hierarquia de grandes formas, detalhes médios e finos; não apenas ruído/grão adicionado sobre formas vazias.
- [ ] Prévia **composta** com as camadas aprovadas demonstra a densidade do cenário final; não aprovar a riqueza final olhando só a base limpa.
- [ ] Caminhos, inimigos, aliados, itens e telegráficos reconhecíveis em escala real, inclusive no mobile.
- [ ] Personagens, props, sombras, névoa e UI permanecem separáveis; chão sem decorativos embutidos.
- [ ] Anatomia, câmera, luz, escala e lore coerentes; custos/memória avaliados com o jogo em movimento.
- [ ] Aprovação visual antes de migrar o lote; preservar originais no Drive e conferir bytes/hash.

A próxima validação é o aceite visual do lote integrado de HUD F1 em pastel terroso, madeira, folhas e vinhas. F0 foi adiado por pedido explícito. Isso **não é autorização para converter o jogo inteiro de uma vez**. O restante do piloto de Rainha, Cortadeira, larva, cristal, alfa e escalas permanece no plano F0b.

## 5. Referências e recuperação

- [Pasta estilos Visuais no Drive](https://drive.google.com/drive/folders/1KCPo0hWZGmM_jeRsN0ec59lR8-IL4_sj).
- [Cena 06 da rodada v2](https://drive.google.com/file/d/1GdC_qq28br_xO3bKlCXeLTtyJ6wQ3QR6/view): referência histórica de técnica, não da paleta vigente; não estabelece sozinha o novo nível de detalhe. SHA-256 `1009f4dfd9ff945d5bd689dcafe40c5032d66239bbda1810341b9965d147b52e`.
- [Base limpa 06](https://drive.google.com/file/d/1m-yVSdgpEr19Uc_00JrnfK2svgDh7pS0/view): estudo de terreno, **não padrão de preenchimento final**. SHA-256 `3a76ab51e44b1cc70943a838a4bf9cc87e919a285765f9cee53fed4c6c3665f3`.
- IDs, hashes e arquivos de cada rodada em `amostras-estilos-v2.json`, `pacotes-estilos-v2.json` e `cenarios-06-08.json`. Downloads das referências 06/08 da rodada v2 já foram recuperados e conferidos na entrega de cenários; não depender de caminhos locais antigos.
- Os registros originais de confirmação não incluíam novas imagens; consultar o lote F1 pastel para a revisão atual. A implementação visual do acabamento detalhado ainda será validada; não rotular artes anteriores como se tivessem usado o novo prompt.

## 6. Histórico preservado

`FUMIGA-PAPEL-v1` e o guia anterior completo estão em [`historico/ESTILO_OFICIAL-v1.md`](historico/ESTILO_OFICIAL-v1.md), sem alteração retroativa dos hashes/prompts das imagens produzidas. O prompt atual está também em registro próprio no MEGA. O v2 acrescentou detalhe; o v3 troca a paleta e exige HUD orgânico; o v4 acrescenta chroma key obrigatório em toda fonte gerada por pedido explícito de 2026-10-10. Os guias v2 e v3 integrais foram preservados em [`historico/ESTILO_OFICIAL-v2.md`](historico/ESTILO_OFICIAL-v2.md) e [`historico/ESTILO_OFICIAL-v3.md`](historico/ESTILO_OFICIAL-v3.md).

A confirmação de técnica/detalhamento não aprova automaticamente cada asset, cada ornamento ou um upload futuro. Preservar também o limite de gerações, a preferência vigente por não apresentar opções extras, a cadência das flores e as exceções de câmera previamente aprovadas.
