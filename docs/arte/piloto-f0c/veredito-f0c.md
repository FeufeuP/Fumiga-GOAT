# Veredito F0c — piloto de arte nativa

Data: 2026-11-03 · Branch `arena/6d62fc93-fumiga-goat`
Fichas: `fichas.json` · Fontes: `art-source/f0c/` (fora do git, `.gitignore:52`) · Prancha: `prancha-f0c.png`

## A virada desta rodada

**Não há mais tamanho fixo por personagem.** Decisão do usuário em 2026-11-03:

> "não delimite um tamanho para os personagens, a única coisa que quero é que tudo fique
> na mesma grade de pixels. se for preciso regerar as artes, regere."

O único requisito é a **grade comum**: 1 px nativo = 1 px do buffer de 320×180 = 3 unidades
de mundo. O tamanho de cada peça passou a ser uma decisão de arte — escolhido pelo que faz
a silhueta ler — e não mais `round(mundo/3)`, que era o que prendia a cortadeira em 15 px.

## O pipeline ganhou dois passos

Ambos exigidos pelo contrato e ausentes na F0b-2:

- **passe de contorno** (`aplicar_contorno`): 1 px de tinta `#14100c` por fora da silhueta.
  A Regra 6 pede contorno em personagens, inimigos e perigos, e é ele — não o detalhe
  interno — que faz a peça ser lida pequena. Fonte lisa reduzida por média de área não tem
  contorno nenhum: a borda derrete no fundo.
- **rampa curta** (`reduzir_cores`): seleção gulosa de medoides que enxuga a peça para o
  orçamento de cores da ficha. A larva chegou a 17 cores próprias contra 5 de orçamento.

E um modo novo, **folha** (`processar_folha`): recorta o chroma da folha inteira, fatia em
`colunas × linhas`, reduz cada célula a 8×8, elege a rampa **uma vez para os 40 tiles**
(rampa por tile vira xadrez) e classifica cada tile para montar a tabela de autotile.

## A folha precisou de dois consertos

1. **O validador exigia transparência.** Faz sentido para sprite avulso (alfa 100 % opaco é
   sinal de recorte falhado), mas um tile de infill de terreno *tem* de ser opaco. Agora a
   folha valida com `exigir_transparente=False`.
2. **O classificador só entendia vazio recortado.** A fonte nova marcou a borda exposta
   pintando grama clara nela, não recortando o vazio — então os 40 tiles caíam no código 0.
   `lados_abertos` ganhou o modo **marcador**: conta quantos px do tom mais claro da rampa
   há em cada borda e abre o lado que tem pelo menos 2 px e não fica atrás de 60 % do lado
   mais marcado. Numa borda reta o tom claro corre a fileira inteira; num canto ele se
   concentra na quina.

## Resultado

| peça | nativo | rampa | contorno | lê? |
|---|---|---|---|---|
| larva | 24×24 | 17 → 6 | 56 px | sim — vírgula nítida, dobras visíveis |
| cortadeira | **21×21** (era 15) | 5 → 5 | 87 px | sim — folha em cima, corpo embaixo |
| cristal | **24×24** (era 16) | 11 → 6 | 50 px | sim — ponta, corpo e pedestal separam |
| rainha | 63×63 | 4 → 4 | 227 px | sim — massa sólida com pernas grossas |
| base | 8×8/tile | 9 → 5 | — | 9 dos 16 casos, tiles distintos |

**A folha, antes e depois:**

|  | antes | depois |
|---|---|---|
| pares de tiles idênticos | 19 de 780 | **0** |
| pares com ≤4 px de diferença | 90 | **0** |
| mediana de diferença por par | 13 px | **40 px** |
| casos de autotile cobertos | 1 (tudo infill) | **9 de 16** |

Os 7 casos que faltam (5, 6, 7, 10, 11, 12, 13) são combinações de três lados e de lados
opostos — raras na prática, e a folha tem 4-5 variantes para cada borda reta e 8 de infill.

## O que ainda não fecha

- **Nenhuma das cinco fontes tem grade de pixel** (confiança 65-78 %, limiar 90 %). As
  reduções continuam sendo por média de área. As peças lêem agora porque o prompt pediu
  arte chapada e o tamanho nativo subiu — não porque a fonte é pixel art.
- **O contorno externo do terreno ainda é reto.** A grama marca a borda, mas o tile continua
  um quadrado cheio. A referência da Celeste quebra esse contorno com pixels transparentes;
  isso fica para quando a folha entrar no jogo de verdade.
- **Transbordo:** cortadeira 21 px = 63 unidades de mundo contra um corpo de 45, e cristal
  24 px = 72 contra um nó de raio 26. O sprite aparece ~1,4× maior que o corpo. É normal
  (sprite maior que hitbox), mas precisa de olho no jogo.

## O que a F0c não pode declarar

- **mock com o HUD da F1** — o HUD da F1 não existe; depende da F1.
- **24 rotações da Cortadeira** — retirado do aceite por decisão do usuário (1 quadro).

## Pendente

Aprovação visual das 5 peças (`prancha-f0c.png`) antes de qualquer lote.
