# 📜 Documento de Planejamento — Telas de Carregamento Temáticas (Estilo Dead Cells)

> **Jogo**: FUMIGA — Colônia Eterna  
> **Data de Criação**: 2026-09-29  
> **Status Geral**: Fase 1 e 2 Concluídas (Planície do Amanhecer e Floresta de Musgo implementadas e validadas).  
> **Objetivo**: Mapear e detalhar todas as telas de carregamento restantes necessárias para os locais com carregamento de assets ou mecânicas pesadas de uma vez, mantendo a regra de adicionar uma por vez com validação prévia do usuário e preservação de todas as matrizes no workspace.

---

## 1. Visão Geral da Arquitetura & Diretrizes de Design

Inspirado nas transições de bioma de **Dead Cells** e **Hollow Knight**, cada tela de carregamento do FUMIGA combina:
1. **Arte Panorâmica Cinematográfica em Pixel Art 16-bit / 32-bit**:
   - Resolução base nítida e enquadrada em 16:9 (com matriz bruta original preservada no repositório).
   - Fundo limpo, sem textos, sem barras falsas de UI ou botões "Press A" embutidos na imagem.
   - Presença da **silhueta imponente do chefão do bioma ao fundo** na névoa, conferindo peso dramático e prenúncio de perigo.
   - **Regra 8 (Não-Humanóide)**: Insetos reais, criaturas quadrúpedes da fauna e chefes míticos sem feições humanas.
2. **Sistema Dinâmico de Iluminação e Efeitos**:
   - Pan sutil de câmera e respiração lenta de zoom.
   - Vinheta escura profunda nas bordas e cantoneiras místicas.
   - Emissão de esporos e partículas bioluminescentes flutuantes temáticas de cada bioma.
3. **Placa Ornamental Superior (Dead Cells Style)**:
   - Rótulo de Degrau (`DEGRAU I`, `DEGRAU II`, etc.) em acento dourado/bioma.
   - Título imponente em caixa alta com subtítulo poético evocativo.
   - Linhas de moldura com losangos brilhantes.
4. **Painel Inferior de Lore e Dicas de Sobrevivência**:
   - Citações misteriosas da memória ancestral da colônia.
   - Dicas práticas sobre mecânicas de castas de formigas e chefes.
5. **Barra de Progresso & Runa Bioluminescente**:
   - Gradiente luminoso com cabeça de luz pulsante e anel giratório concêntrico.
   - Pré-carregamento assíncrono em background (`preloadLoadingScreens`) com sincronização estrita de carregamento antes da liberação do avanço.
   - Suporte unificado para PC (teclas Espaço/Enter ou clique) e Mobile (toque na tela).

---

## 2. Status Atual de Implementação

| # | Bioma / Local | Status | Arte no Workspace | Destaque Visual & Chefão |
|---|---------------|--------|-------------------|--------------------------|
| **1** | **Degrau 1: Planície do Amanhecer** | ✅ **Concluído & Validado** | `game/assets/loading/loading_planicie.png` (806 KB)<br>`loading_planicie_raw.png` (7.2 MB) | Procissão de formigas sobre colinas orvalhadas com bolsas de âmbar e cristais sob o alvorecer. |
| **2** | **Degrau 2: Floresta de Musgo** | ✅ **Concluído & Validado** | `game/assets/loading/loading_floresta.png` (1.7 MB)<br>`loading_floresta_raw.png` (1.8 MB) | Silhueta colossal da **Caçadora Astuta (Raposa)** na névoa esmeralda, raízes com musgo vivo e formigas tecelãs. |
| **3** | **Degrau 3: Pântano Pútrido** | ⏳ **Pendente** | A criar via validação | Silhueta da **Sombra Alada (Grouse / Ave Pantanosa)** entre brumas tóxicas, águas paradas e teias de seda sobre a lama. |
| **4** | **Degrau 4: Deserto Calcinado** | ⏳ **Pendente** | A criar via validação | Silhueta da **Matriarca Rival (Rainha Formiga Corrompida)** em meio a dunas de areia, ossadas antigas e cactos. |
| **5** | **Degrau 5: Bosque Dourado** | ⏳ **Pendente** | A criar via validação | Silhueta colossal do **Galhada Real (Cervo Ancestral)** sob chuva de folhas outonais alaranjadas e luz crepuscular. |
| **6** | **Degrau 6: Pico Congelado** | ⏳ **Pendente** | A criar via validação | Silhueta do **Devastador (Javali da Neve)** com presas massivas em tempestade de neve e cristais congelados de essência. |
| **7** | **O Topo / A Pálida** | ⏳ **Pendente** | A criar via validação | Silhueta etérea da **A Pálida (Rainha Ancestral de Névoa)** com coroa de fungos e fios de bruma no ápice do mundo. |
| **8** | **Boot Inicial / Colônia Eterna** | ⏳ **Pendente** | A criar via validação | Abertura do jogo: o Formigueiro Ancestral monumental sob a lua e a névoa roxa, substituindo a tela preta com barra simples do boot. |
| **9** | **Profundezas do Ninho (Formigueiro)** | ⏳ **Pendente** | A criar via validação | Câmaras subterrâneas esculpidas: fungos bioluminescentes, berçário de larvas e o abdômen monumental da Rainha. |

---

## 3. Detalhamento das Telas Restantes

### 3.1. Degrau 3 — Pântano Pútrido
* **Local de Exibição**: Avanço de mapa entre o Mundo 2 e o Mundo 3 (`advanceMap`), e reinício/carregamento no Pântano.
* **Silhueta do Chefão ao Fundo**: **A Sombra Alada** (*Grouse* / grande ave proto-pálida pantanosa com asas envoltas em névoa espectral e olhar predatório).
* **Cenário**: Águas estagnadas e lamacentas refletindo a lua pálida, raízes de mangue retorcidas, fungos fluorescentes venenosos, e pontes de seda construídas pelas formigas tecelãs para cruzar as poças d'água.
* **Paleta & Acentos**: Verde-musgo escuro, roxo pútrido (`#9b5de5`), acento turquesa pantanoso (`#48bfe3`).
* **Lore Planejado**:
  - *"O brejo é a boca da Névoa. Atravessem depressa, irmãs."*
  - *"A água não apaga os passos. Ela guarda o peso de quem afundou."*
* **Dicas de Sobrevivência**:
  - *"DICA: Pântano apaga rastros na água. Seda da Tecelã mantém o caminho firme."*
  - *"DICA: Matabele cura feridas críticas em dobro quando a aliada está abaixo de 30% de vida."*
  - *"DICA: Na Fase 2, o grito da Sombra Alada inverte os controles por 0.85s. Respire fundo."*

---

### 3.2. Degrau 4 — Deserto Calcinado
* **Local de Exibição**: Avanço de mapa entre o Mundo 3 e o Mundo 4 (`advanceMap`).
* **Silhueta do Chefão ao Fundo**: **A Matriarca** (Rainha de uma colônia rival colossal que trocou a seda pela bruma da Névoa, corpo quitinoso maciço com mandíbulas serrilhadas erguendo-se sobre a crista da duna).
* **Cenário**: Areias ardentes douradas e cinzentas sob um céu de tempestade estática, ossadas de animais gigantes do velho mundo cobertas por líquens secos, cactos pontiagudos e formigas Cefalotes montando postos de guarda.
* **Paleta & Acentos**: Âmbar ressequido (`#ffb703`), terra avermelhada e violeta calcinado (`#fb8500` / `#9d4edd`).
* **Lore Planejado**:
  - *"A areia guarda um trato antigo: filhas em troca de perdão."*
  - *"A colônia rival não é inimiga. É o espelho pálido do que podemos virar."*
* **Dicas de Sobrevivência**:
  - *"DICA: No Deserto, a comida consiste em sementes duras. Exige batedoras velozes para localizar."*
  - *"DICA: Cefalote bloqueia túneis e entradas com a cabeça quitinosa blindada."*
  - *"DICA: A Matriarca cospe projéteis ácidos em 5 direções na Fase 2. Não agrupe a colônia."*

---

### 3.3. Degrau 5 — Bosque Dourado
* **Local de Exibição**: Avanço de mapa entre o Mundo 4 e o Mundo 5 (`advanceMap`).
* **Silhueta do Chefão ao Fundo**: **O Galhada Real** (*Deer* ancestral colossal com chifres gigantescos cobertos de líquen e flores murchas de outono, silhueta solene e melancólica).
* **Cenário**: Chuva lenta de folhas caducas douradas, árvores monumentais de casca acobreada, luz oblíqua de entardecer eterno filtrando pela folhagem e formigas acrobatas saltando entre galhos.
* **Paleta & Acentos**: Ouro outonal (`#e9c46a`), bronze crepuscular (`#f4a261`) e folhas carmim.
* **Lore Planejado**:
  - *"O outono não perdoa o verde que hesita. As folhas caem; a fome não."*
  - *"Ele não quer lutar. Ele quer apenas que o bosque se lembre dele."*
* **Dicas de Sobrevivência**:
  - *"DICA: Folhas douradas fornecem alimento abundante, mas a névoa reduz a visibilidade."*
  - *"DICA: Acrobata salta sobre linhas de frente para alcançar atiradores inimigos."*
  - *"DICA: Na Fase 2, folhas caindo regeneram o Galhada. Mantenha o dano focado."*

---

### 3.4. Degrau 6 — Pico Congelado
* **Local de Exibição**: Avanço de mapa para o último degrau da montanha (`advanceMap`).
* **Silhueta do Chefão ao Fundo**: **O Devastador** (*Boar* titânico com presas de gelo e carapaça de geada, arauto que abre caminho para a Névoa).
* **Cenário**: Penhascos íngremes de rocha escura e gelo cristalino, ventania glacial carregando partículas de neve cintilante, cristais pálidos de memória congelada e formigas Dinoponeras de guarda.
* **Paleta & Acentos**: Ciano gélido (`#48cae4`), branco azulado (`#caf0f8`) e sombras índigo profundas (`#03045e`).
* **Lore Planejado**:
  - *"O frio é apenas o hálito dela. No topo do mundo, algo pálido espera."*
  - *"Seis degraus. Seis memórias. Um único topo."*
* **Dicas de Sobrevivência**:
  - *"DICA: No Pico, a essência se cristalizou em gelo. Colete antes que a tempestade cubra."*
  - *"DICA: A Dinoponera é um colosso lento de alto custo, mas sua mordida parte carapaças pesadas."*
  - *"DICA: Na investida do Devastador, recue as operárias para fora do corredor de impacto."*

---

### 3.5. O Topo — A Pálida
* **Local de Exibição**: Entrada no confronto final / Ascensão da Névoa.
* **Silhueta ao Fundo**: **A Pálida** (marionete espectral de bruma em forma de formiga-rainha ancestral, com coroa de fungo e seda, e fios de névoa segurando suas patas).
* **Cenário**: O cume além das nuvens, onde o céu se abre para a lua laranja mística e a Névoa forma casulos suspensos.
* **Paleta & Acentos**: Branco fosforescente, lilás etéreo (`#d8bbff`) e âmbar da coroa.
* **Lore Planejado**:
  - *"Ela não é inimiga. É a memória que a colônia escolheu esquecer."*
  - *"Quando a colônia finalmente lembrar, a Pálida sorri — e vira semente."*

---

### 3.6. Tela de Boot Inicial (Colônia Eterna)
* **Local de Exibição**: Ao abrir a página do jogo (`main.js`), substituindo o fundo gradiente simples e o texto cru `"CARREGANDO ESPOROS... 0%"`.
* **Cenário**: Vista panorâmica do Formigueiro Ancestral monumental ao crepúsculo, cercado por raízes sagradas e névoa violeta, com luzes bioluminescentes emanando das galerias subterrâneas.
* **Comportamento**: A barra de progresso do `main.js` (`progress`, `LOAD.done / LOAD.total`) conecta-se à moldura e barra Dead Cells já estilizada.

---

### 3.7. Câmaras Profundas do Ninho
* **Local de Exibição**: Carregamento assíncrono ao entrar no Formigueiro (`nestEnter`) ou ao expandir novas câmaras subterrâneas (berçário, despensa, refinaria, câmara de fungos).
* **Cenário**: Túneis subterrâneos orgânicos esculpidos na terra preta, paredes cobertas por fungos bioluminescentes dourados e esmeraldas, ovos translúcidos e o gaster imponente da Rainha Silenciosa ao fundo.

---

## 4. Próximos Passos & Fluxo de Aprovação

Seguindo estritamente a instrução do usuário:
1. **Uma tela por vez**: A cada nova solicitação, criar uma tela específica, exibir as opções de arte via `offer_options`, e aguardar a validação e escolha do usuário.
2. **Preservação de Imagens no Workspace**: Toda imagem aprovada terá sua versão bruta (`_raw.png`) preservada intacta em `game/assets/loading/` e sua versão otimizada em PNG de alto desempenho linkada no motor.
3. **Pré-carregamento Automático**: Cada novo bioma adicionado será incorporado em `preloadLoadingScreens()` em `loading_screen.js`.
4. **Verificação Headless Completa**: Manter a suíte de 25 testes do `npm test` verde e testar visualmente com Chromium headless PC + Mobile antes de cada entrega.
