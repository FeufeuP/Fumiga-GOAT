# Veredito F0c — piloto de arte nativa

Data: 2026-11-03 · Branch `arena/6d62fc93-fumiga-goat`
Fichas: `fichas.json` · Fontes: `art-source/f0c/` (fora do git, ver `.gitignore:52`) · Prancha: `prancha-f0c.png`

## O que foi feito

1. **Cinco fichas** escritas (`fichas.json`) com o padrão da F0b-2: tamanho nativo derivado
   do mundo, margem, âncora, paleta, chroma, obrigatório/proibido, consumidor no jogo.
2. **Dez fontes geradas** (5 peças × 2 opções — o teto da Regra 16), cortadas por chroma.
3. **Pipeline completado com dois passos novos**, ambos exigidos pelo contrato e ausentes
   na F0b-2:
   - **passe de contorno** (`aplicar_contorno`): 1 px de tinta `#14100c` por fora da
     silhueta. A Regra 6 pede contorno em personagens, inimigos e perigos, e é ele — não o
     detalhe interno — que faz a peça ser lida em 15 px. Uma fonte lisa reduzida por média
     de área não tem contorno nenhum: a borda derrete no fundo.
   - **rampa curta** (`reduzir_cores` / `reduzir_cores_folha`): seleção gulosa de medoides
     que enxuga a peça para o orçamento de cores da ficha. A larva chegou a 17 cores
     próprias contra 5 de orçamento; agora todas respeitam o teto.
4. **Modo folha** (`processar_folha`): recorta o chroma da folha inteira, fatia em
   `colunas × linhas`, reduz cada célula a 8×8, elege a rampa **uma vez para os 40 tiles**
   (rampa por tile vira xadrez) e classifica cada tile pelos lados que encostam no vazio —
   código de 4 bits (N=1, L=2, S=4, O=8) que é a tabela de autotile.

Todas as 5 peças passaram na validação automática: alfa binário, 0 cor fora da paleta, sem
preto puro, sem anti-aliasing.

## O veredito visual: 1 de 5

Validação automática não é leitura. O aceite da F0c é **silhueta legível no tamanho
nativo**, então cada peça foi impressa em ASCII na resolução nativa e julgada.

| peça | nativo | rampa | contorno | **lê?** | por quê |
|---|---|---|---|---|---|
| larva | 24×24 | 17 → 6 | 56 px | **SIM** | curva de vírgula nítida, dobras visíveis, cabeça separada do corpo |
| cristal | 16×16 | 13 → 6 | 32 px | fraco | metade de cima é uma face, mas a base não separa do corpo; saiu assimétrico |
| cortadeira | 15×15 | 9 → 6 | 40 px | **NÃO** | borrão contínuo de `-`/`:`/`+`; cabeça, tórax e gáster não se separam em nenhum ponto |
| rainha | 63×63 | 13 → 6 | 243 px | **NÃO** | silhueta esparsa: o gáster é um blob sólido e o resto são pernas estilhaçadas |
| base | 8×8/tile | 10 → 5 | — | **NÃO** | 19 pares de tiles idênticos, 90 pares com ≤4 px de diferença em 64 |

### A causa, que é a mesma nas cinco

As fontes voltaram **lisas** — nenhuma das cinco apresentou grade de pixel (confiança de
65 % a 78 %, contra o limiar de 90 %), exatamente o achado 4 da F0b-2. Consequências
diferentes por tamanho:

- **8–16 px:** a média de área transforma uma ilustração suave em borrão. A informação que
  faz uma formiga ser lida em 15 px — três massas separadas por constrições — simplesmente
  não sobrevive a uma média de 95×84 px por célula.
- **63 px:** o problema inverte. A fonte tem detalhe fino demais para caber: uma perna de
  3 px numa fonte de 811 px vira 0,23 px no nativo. Redução não pode inventar meio pixel —
  o resultado é fragmento, e foi o que saiu.
- **folha de tiles:** a fonte não desenhou 40 casos de autotile. Desenhou uma textura de
  terra e a repetiu. Os códigos de autotile saíram do ruído do recorte, não da forma do
  tile: 8 dos 16 casos, dos quais 13 tiles caíram no código 0 (infill) por acidente.

O contorno e a rampa curta melhoraram as peças — o contorno é visível e a larva ganhou
muito — mas **nenhum passe do pipeline pode inventar uma silhueta que a fonte não tem.**

## O que a F0c não pode declarar

O aceite pede quatro coisas. Uma está feita, três estão bloqueadas:

- ~~silhueta legível no tamanho nativo~~ — 4 de 5 reprovadas.
- **mesma paleta nas 5 peças** — feito: todas quantizadas na Planície (19 cores) com a
  métrica idêntica à do runtime.
- **mock no jogo com o HUD atual e o da F1** — o HUD da F1 não existe; depende da F1.
- **24 rotações da Cortadeira** — retirado do aceite por decisão do usuário (1 quadro).

## Próximo passo

Está em `decisoes-f0c` — depende de você.
