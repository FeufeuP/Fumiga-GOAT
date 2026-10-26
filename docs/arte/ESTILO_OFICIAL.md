# FUMIGA — estilo oficial: PIXEL CELESTE

**Decisão vigente — 2026-10-26.** O usuário pediu: *“continue a implementação do novo estilo artístico do jogo, cite todas as fases de implementação. quero que o novo pixel seja idêntico ao pixel de celeste. Leia o GUIA.”* Nas perguntas obrigatórias da Regra 1, respondeu:

| Pergunta | Escolha do usuário |
|---|---|
| Estilo oficial | **“Pixel Celeste vira o estilo oficial”** — substitui o papel recortado em todo o jogo |
| Paleta | **“Rampas Celeste com paleta FUMIGA”** — técnica do Celeste aplicada ao marrom-terra, âmbar e verde-oliva aprovados em 2026-10-08 |
| Técnica | **“Buffer 320×180 + upscale ×3 nearest”** |
| Escopo desta rodada | **“Só o documento de fases/prompt-mestre agora”** — nenhum código ou arte alterados nesta entrega |

**Prompt-mestre vigente:** `FUMIGA-PIXEL-CELESTE-v1` (bloco canônico abaixo e no `MEGA_ARQUIVO.md`).

**Estado da implementação:** direção, paleta, contratos e fases documentados e verificáveis. **Nenhum asset de produção foi substituído e nenhum runtime foi alterado nesta rodada.** O jogo continua desenhando a arte antiga até a fase F0b (frame) e as fases de arte serem executadas e aprovadas. O papel recortado deixa de ser a técnica vigente e permanece integralmente em [`historico/ESTILO_OFICIAL-v4-PAPEL.md`](historico/ESTILO_OFICIAL-v4-PAPEL.md), com os prompts v1–v4 preservados para auditoria.

**Arquivos de apoio obrigatórios desta direção**

- [`FASES_PIXEL_CELESTE.md`](FASES_PIXEL_CELESTE.md) — **todas as fases F0a–F9** com entregáveis, dependências, portas de aprovação e status.
- [`paleta-celeste.json`](paleta-celeste.json) — 16 cores de cena + 3 de fundo por bioma, regras de cor e paleta compartilhada.
- [`contratos-pixel.json`](contratos-pixel.json) — tamanho nativo de cada família, células de chefes, UI, ilustrações, flores e orçamento por quadro.
- [`direcao-vigente.json`](direcao-vigente.json) — decisão legível por máquina.

## 1. Assinatura técnica do Celeste (o que “idêntico” significa)

A referência não é “pixel art em geral”: é a assinatura técnica do *Celeste* (EXOK, 2018). Cinco propriedades, todas obrigatórias:

1. **Canvas de jogo 320×180 com escala inteira.** O jogo é renderizado num buffer de 320×180 e ampliado em múltiplos inteiros — 3× dá exatamente o canvas 960×540 do FUMIGA. Nada de escala fracionária: só 100%, 200%, 300%. ([Saint11 — consistência e resolução base](https://saint11.art/blog/consistency/))
2. **Grade de 8×8 px para o terreno.** Cada tile é 8×8 no buffer (= 24 unidades de mundo no zoom 1). Tiles minúsculos e impressionistas; a leitura vem de agrupamentos de pixels, não de detalhe fino. ([Aran P. Ink — Celeste Tilesets, Step-by-Step](https://aran.ink/posts/celeste-tilesets))
3. **Borda desenhada, nunca reta.** Topo com 1 px de luz; base com 1 px escuro; interior sólido escuro (**infill**) compartilhado pelos tilesets; pixels transparentes que quebram o contorno; a linha da borda nunca é perfeitamente reta. ([Aran P. Ink](https://aran.ink/posts/celeste-tilesets))
4. **Paleta curta por área, com rampas de hue-shift.** 12–18 cores por área (usamos **16**), em rampas de 3–4 passos: sombra mais fria/menos saturada, luz mais quente/mais saturada. Sem preto puro como cor de cena. Madeline usa ~12 cores contando transparência. ([Saint11 — teoria de cor](https://saint11.art/pixel_art_articles/article6/), [Adafruit — fundamentos](https://learn.adafruit.com/makecode-arcade-pixel-art-sprites/pixel-art-fundamentals))
5. **Densidades separadas em “mundos”.** O Celeste tem três: **jogo** (pixel 320×180), **UI** (alta resolução) e **mapa** (3D). As densidades nunca se misturam. ([Saint11 — consistência](https://saint11.art/blog/consistency/))
6. **O quadro inteiro passa pelo buffer.** Rotação, partículas, névoa e efeitos são desenhados dentro do buffer baixo, por isso ficam pixelados automaticamente — a EXOK desenha tudo numa textura 320×180 e amplia de uma vez. ([Noel Berry no r/gamedev](https://www.reddit.com/r/gamedev/comments/9a0cfr/how_is_the_hair_in_celeste_made/))

**Consequência no FUMIGA:** `1 px de arte = 3 px de canvas = 3 unidades de mundo` no zoom 1. Todo tamanho nativo sai de `round(unidades_de_mundo / 3)` — a tabela fechada está em `contratos-pixel.json`.

## 2. Como o FUMIGA se adapta a essa técnica

| Item | Regra vigente |
|---|---|
| Buffer do mundo | 320×180, `imageSmoothingEnabled = false`, ampliado ×3 para 960×540 |
| Zoom de câmera | quantizado em **1×, 2× e 3×** no buffer; zoom fracionário proibido (evita pixel tremendo) |
| Terreno | autotile 8×8 com infill escuro compartilhado, 1 px de borda, 2–3 variantes por borda |
| Colisão | **não muda** nesta técnica; a grade é visual. A grade de colisão só muda com pedido próprio na F6 |
| Personagens | sprite nativo, pivô inteiro, 24 rotações assadas no tamanho nativo, flash por troca de paleta |
| Contorno | 1 px de tinta escura em aliados, inimigos, perigos e coletáveis; terreno e props usam luz de borda, sem contorno |
| Paleta | `paleta-celeste.json`: 16 cores de cena + 3 de fundo por bioma; a paleta pastel-terrosa aprovada em 2026-10-08 é a base das rampas |
| Roxo/azul-escuro | continuam **rejeitados como base**. A única exceção é o bioma Gelo, cujo azul-acinzentado é a cor local do material |
| Névoa | branco-osso em 3 passos (mantém a lore); nunca esconde silhueta de ameaça |
| UI/HUD/menus | **mundo UI**: desenhados no canvas 960×540, com arte autoral em grade de 3 px e sem suavização. Texto continua em KiwiSoda até existir fonte pixel aprovada (F1) |
| Ilustrações | carregamento, TITLE, árvore, maçãs, santuários e Noite Branca em 320×180 nativo ampliado ×3 (a Noite Branca já é 320×180 hoje) |
| Gradientes/AA | proibidos no pixel. Volume por rampa e por recorte de borda; dither só pontual |
| Sombras | 1 px de contato, dura, deslocada 1 px para baixo-direita; sem sombra borrada |
| Luz | alta à esquerda, dura, coerente com os assets antigos |
| Anatomia | Regra 8 intacta: seis patas no tórax, duas antenas, sem bipedia, rosto ou mãos humanas |
| Câmera | Regra 17 intacta: top-down no mundo; ilustrações continuam como exceção |

**Por que a UI não entra no buffer nesta versão:** o usuário escolheu estilo pixel para o jogo inteiro, mas a técnica de frame escolhida foi “buffer 320×180” (não “buffer incluindo a UI”). Isso reproduz o modelo real do Celeste — jogo em pixel, interface em densidade maior —, preserva a legibilidade das Regras 21/22 e evita quebrar a KiwiSoda. Levar a UI para dentro do buffer 320×180 vira decisão própria da F1, com fonte pixel e nova medição de área permitida.

## 3. Prompts e geração de imagem

**Realidade técnica:** geradores de imagem não produzem pixel art nativa de 320×180. A fonte é gerada em alta resolução com grade explícita, sem anti-aliasing, e passa por um passo determinístico de **pixelização** (redução para o tamanho nativo + quantização na paleta do bioma + remoção de meio-tom). O derivado nativo é o asset; a fonte grande é preservada no Drive (Regra 13). O passo de pixelização é a peça F0b-2 e ainda **não existe** — até ele existir, nenhuma arte gerada entra no jogo.

Regras que continuam valendo em toda geração:

- **Chroma obrigatório em toda fonte gerada** (decisão de 2026-10-10): fundo sólido verde `#00FF00` ou azul `#0000FF`, nunca transparência ou xadrez na imagem gerada.
- **Duas ou mais opções lado a lado** para toda arte nova (Regra 6), salvo pedido explícito em contrário; o teto de **10 imagens por rodada inclui as alternativas** (Regra 16).
- Ficha técnica preenchida antes de gerar; nada de inventar personagem, mecânica ou lore.

<!-- INICIO PROMPT FUMIGA-PIXEL-CELESTE-v1 -->
Crie uma única peça visual original para FUMIGA — Colônia Eterna em pixel art nativa no estilo técnico do Celeste, com canvas de jogo de 320×180 pixels e grade de 8×8 pixels. Desenhe pensando na resolução final pequena: cada pixel é uma decisão. Formas massudas e legíveis, silhueta reconhecível em tamanho nativo, sem detalhe que desapareça na redução. Use paleta curta de 12 a 18 cores no total, em rampas de 3 a 4 passos com hue-shift: sombras mais frias e menos saturadas, luzes mais quentes e mais saturadas. Proíba anti-aliasing, meio-tom, desfoque, gradiente suave, ruído fotográfico, textura pintada e qualquer pixel semitransparente nas bordas. Proíba também preto puro como cor de cena: use tinta escura levemente colorida. O contorno, quando existir, tem exatamente 1 pixel e é uma cor escura da própria paleta.

O terreno segue a construção do Celeste: interior sólido escuro compartilhado (infill), 1 pixel de luz na aresta superior, 1 pixel escuro na aresta inferior, quinas chanfradas e alguns pixels transparentes que quebram o contorno; a linha da borda nunca é perfeitamente reta. Trabalhe com agrupamentos de 2 a 4 pixels, não com textura uniforme. Personagens, criaturas, itens e recursos têm contorno de 1 pixel de tinta escura, sombra de contato de 1 pixel deslocada para baixo-direita, luz dura vindo do alto à esquerda e no máximo 4 a 6 cores próprias por sprite.

Mantenha a identidade do FUMIGA na paleta pastel terrosa: marrom de terra e madeira, papel creme e areia, laranja que lembre âmbar, verdes de folhas e vinhas como sálvia, oliva clara e musgo suave. Cada bioma tem a sua paleta de 16 cores derivada das rampas aprovadas — Planície oliva e âmbar, Floresta verde profundo, Pântano verde-água, Deserto areia e ocre, Outono laranja queimado, Gelo azul-acinzentado pálido. Não use roxo ou azul-escuro como base, sombra ou acento dominante; o azul técnico do chroma não pertence à paleta da peça. A Névoa é branco-osso em três passos e nunca esconde a silhueta de uma ameaça.

Respeite a anatomia animal: formigas com seis patas ligadas ao tórax, duas antenas, corpo segmentado em cabeça, tórax e gáster; ferramentas e acessórios proporcionais ao inseto. A Rainha Silenciosa tem gáster âmbar e diadema orgânico de fungo e seda, nunca coroa metálica humana. Proíba bipedia humana, rosto humano, mãos humanas e roupas humanoides. Vista ortográfica estritamente de cima, sem horizonte e sem isometria, para tudo que existe dentro do mundo jogável; somente ilustrações de menu, carregamento, árvore de habilidades e maçãs podem usar outro enquadramento, explicitado na ficha. Não altere câmera, escala relativa, âncora, hitbox ou lore para caber na composição.

Produza a arte sem texto, logotipo, marca-d'água, moldura ou interface embutida. Sprite ou camada isolada: a peça sozinha, sem cenário ao redor, sem repetição em grade e sem colagem de alternativas. Mapa-base: terreno completo e limpo, sem flores, árvores, arbustos, pedras, buracos, rachaduras ou construções — decoração e construção são peças separadas aprovadas. A ficha técnica define formato, tamanho nativo, estado, quadros e partes a entregar; não invente personagens, mecânicas ou mudanças de lore. Entregue em alta resolução apenas como fonte para redução: blocos de pixel grandes, alinhados a uma grade inteira, com arestas duras e sem suavização, para que a redução para o tamanho nativo preserve exatamente a grade.

Em TODA imagem gerada ou editada, qualquer que seja a categoria (sprite, tile, terreno, cenário, ilustração, HUD ou ícone), coloque a peça sobre um fundo técnico de chroma key uniforme, sólido e opaco: verde puro #00FF00 ou azul puro #0000FF. Se a peça tiver traços verdes, escolha fundo AZUL; se tiver traços azuis, escolha fundo VERDE. Se tiver as duas cores, escolha a que mais se distingue da silhueta e dos detalhes, verificando o recorte manualmente; não elimine cores essenciais da peça. Reserve a cor de chroma apenas para o fundo, sem gradientes, textura, cenário, xadrez, halos ou sombras projetadas sobre ele, e deixe margem de fundo visível em toda a volta da peça. Esse fundo é SOMENTE da fonte gerada: preservar o original e remover o chroma com cuidado (inclusive spill nas bordas), revisar detalhes vazados e exportar o derivado com alfa real quando o consumidor exigir transparência, ou compor sobre o fundo final apropriado quando exigir imagem opaca. Nunca publicar verde/azul técnico no jogo.
<!-- FIM PROMPT FUMIGA-PIXEL-CELESTE-v1 -->

### Ficha obrigatória por peça (pixel)

```text
ID, categoria, bioma e função:
Assunto, estado/animação e estágio de produção:
Câmera (top-down no mundo ou exceção de ilustração autorizada):
Tamanho NATIVO em px de arte (e o cálculo: mundo / 3), margem e âncora:
Grade: tile 8×8? sprite múltiplo? pivô inteiro?
Paleta usada (arquivo + quais 4–6 cores do sprite / 16 do bioma):
Contorno (tinta) e sombra de contato (1 px, baixo-direita):
Quadros, ordem de linhas e fps de animação:
Fundo da FONTE: verde #00FF00 ou azul #0000FF; fundo do DERIVADO: alfa real ou composição final:
Destino/consumidor, orçamento de bytes/memória e aprovação necessária:
Detalhes obrigatórios / elementos proibidos nesta passada:
Pixelização: fator de redução, limiar de quantização e validação do resultado no tamanho de uso:
```

## 4. Critério de aprovação

- [ ] 320×180 nativo comprovado: a peça é legível e bonita no buffer, não só ampliada.
- [ ] Escala inteira (×3) sem interpolação; nenhum pixel meio-tom nas bordas.
- [ ] Paleta dentro das 16 cores do bioma; rampas com hue-shift; sem preto puro de cena.
- [ ] Terreno com infill + borda de 1 px + contorno irregular; sem decoração embutida na base.
- [ ] Sprite com contorno de 1 px, sombra de contato e silhueta distinta em 13–63 px nativos.
- [ ] Top-down, anatomia de inseto, luz alta à esquerda, lore preservada.
- [ ] CHROMA na fonte (verde/azul conforme a peça), derivado recortado com alfa revisado.
- [ ] Peça exibida ao usuário em tamanho nativo **e** ampliada (Regra 10), com duas ou mais opções.
- [ ] Integração só depois do aceite; MANIFEST, `ASSET_V`, lista de assets e sincronização nativa juntos.

## 5. Preservação, desempenho e histórico

- **Desempenho:** o buffer custa 230.400 bytes e dois `drawImage` por quadro (redução e ampliação). Proibido pós-processar pixel a pixel em tempo de jogo; chão, sombras e detalhe estático são assados uma vez no buffer.
- **Original da fonte e derivado nativo** são preservados juntos (Drive, Regra 13); nenhuma arte antiga é apagada para “liberar espaço”.
- **Rollback por fase:** arte + recortes + `ASSET_V` + cache voltam juntos; nunca resetar saves para corrigir aparência.
- **Histórico:** papel recortado v1–v4 em [`historico/`](historico/); a rodada de dez estilos, os manifestos do Drive e os hashes permanecem como registro do que foi gerado, sem reatribuição retroativa de prompt.
- **O que esta rodada NÃO fez:** não alterou runtime, não gerou imagem, não substituiu asset, não publicou no GitHub, não fez upload no Drive.

## 6. Referências

- [Aran P. Ink — Celeste Tilesets, Step-by-Step](https://aran.ink/posts/celeste-tilesets) — 320×180, tiles 8×8, infill, borda de 1 px, arestas irregulares.
- [Saint11 (Pedro Medeiros) — Consistency](https://saint11.art/blog/consistency/) — resolução base, contagem de cores e os três mundos (game/UI/mapa).
- [Saint11 — Basic Color Theory](https://saint11.art/pixel_art_articles/article6/) — rampas com hue-shift e saturação.
- [Noel Berry — como o cabelo do Celeste é feito](https://www.reddit.com/r/gamedev/comments/9a0cfr/how_is_the_hair_in_celeste_made/) — quadro inteiro desenhado em 320×180 e ampliado de uma vez.
- [Noel Berry — Remaking Celeste's Lighting](https://medium.com/@NoelFB/remaking-celestes-lighting-3478d6f10bf) — luz como máscara no espaço de pixel.
- [Adafruit — Pixel Art Fundamentals](https://learn.adafruit.com/makecode-arcade-pixel-art-sprites/pixel-art-fundamentals) — ~12 cores no sprite da Madeline.
