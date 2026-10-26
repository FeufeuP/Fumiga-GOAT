# FUMIGA — fases de implementação do estilo PIXEL CELESTE

**Criado em:** 2026-10-26 · **Direção:** pixel art nativa estilo Celeste (`FUMIGA-PIXEL-CELESTE-v1`)\
**Fonte normativa do estilo:** [`ESTILO_OFICIAL.md`](ESTILO_OFICIAL.md) · **Paleta:** [`paleta-celeste.json`](paleta-celeste.json) · **Contratos:** [`contratos-pixel.json`](contratos-pixel.json)\
**Escopo desta rodada (2026-10-26):** F0a foi documentação; **F0b já é código** — o frame pixel (buffer 320×180 ×3, zoom inteiro e autotile 8×8) está no runtime. Nenhum asset foi substituído, nenhum save, preço ou balanceamento mudou.

> Este documento substitui, como plano vigente, a ordem em papel recortado de [`ORDEM_IMPLEMENTACAO.md`](ORDEM_IMPLEMENTACAO.md) e a seção 5 de [`../../DOCUMENTO_REESTILIZACAO_VISUAL.md`](../../DOCUMENTO_REESTILIZACAO_VISUAL.md). Os dois continuam válidos como **histórico** da direção 06 e como inventário de consumidores — não como autorização vigente.

## Como ler esta lista

- **Status:** `✅ concluída` · `⏳ pendente` · `🔁 em revisão` · `🔒 bloqueada` (exige decisão do usuário).
- Toda fase tem **porta de aprovação**: nenhuma fase seguinte começa sem aceite visual e teste da anterior (Regras 1, 6, 10).
- Tamanhos em **px nativos de arte**. Regra de conversão: `nativo = round(unidades_de_mundo / 3)`, desenhado a `nativo × 3 × zoom_inteiro`.
- Nada aqui autoriza trocar todos os assets de uma vez: cada fase é entregue em lotes com opções lado a lado (Regra 6) e teto de 10 imagens por rodada (Regra 16).

## Resumo das fases

| Fase | Entrega | Depende de | Porta para avançar | Status |
|---|---|---|---|---|
| **F0a** | Direção, prompt-mestre, paleta, contratos e este plano | decisão de 2026-10-26 | documentos verificáveis (`node game/test/art-pixel.mjs`) | ✅ 2026-10-26 |
| **F0b** | Frame pixel 320×180 + ×3 + zoom inteiro + autotile 8×8 | F0a | 60 FPS, sem shimmer, HUD intacto, PC/mobile | ✅ 2026-10-26 |
| **F0b-2** | Pipeline de pixelização (fonte grande → nativo) | F0a | 3 provas com paleta exata e sem AA | ⏳ |
| **F0c** | Piloto: rainha, cortadeira, larva, cristal, base da Planície 8×8 | F0b, F0b-2 | leitura em 13–63 px, mock no jogo, aceite | ⏳ |
| **F1** | UI/HUD/ícones + decisão de fonte pixel | F0c | texto legível, Regras 21/22, toque | ⏳ |
| **F2** | 12 castas, rainha, névoa, cristais, comida, VFX | F1 | toda casta reconhecível; status legível | ⏳ |
| **F3a** | Árvore + 7 maçãs (cinza/cor) | F2 | restauração fiel, nós e hitboxes | ⏳ |
| **F3b** | 6 santuários 320×180 | F3a | um por entrega; Pálida selada | ⏳ |
| **F3c** | Flores de cada santuário (9+9) | F3b | cadência e leitura em 64 px | ⏳ |
| **F4** | 6 chefes, células 22×22, telegráficos | F2 | 516 células conferidas; combate inalterado | ⏳ |
| **F5a** | TITLE/PRETITLE 4 camadas + logo | F1 | parallax e ciclo dia/noite preservados | ⏳ |
| **F5b** | 6 telas de carregamento | F5a | só troca de mundo; erro/pronto intactos | ⏳ |
| **F5c** | Noite Branca 3 painéis × 4 camadas | F5a | alfa real, replay e toque | ⏳ |
| **F5d** | Outros 21 painéis de cutscene | F5c | **exige autorização** de escopo | 🔒 |
| **F6** | 7 inimigos + 6 terrenos + 55 props | F4/F5 | base limpa → decoração → construção | ⏳ |
| **F7** | Ninho: exterior, interior, câmaras, Eras | F6 | entrada/saída, escavação e visão externa | ⏳ |
| **F8** | Pálida: rainha de névoa, castelo, arena, final | pedido próprio | arte e design aprovados | 🔒 |
| **F9** | PWA, ícones nativos, site, pacote offline | fases integradas | offline completo e cache coerente | ⏳ |

---

## F0a — Direção, prompt-mestre, paleta e contratos ✅

**Entrega (2026-10-26):** `ESTILO_OFICIAL.md` reescrito; `paleta-celeste.json` com 6 biomas + Pálida selada; `contratos-pixel.json` com tamanhos nativos; `direcao-vigente.json`; Regra 6 atualizada; papel recortado preservado em `historico/ESTILO_OFICIAL-v4-PAPEL.md`; verificação automática em `game/test/art-pixel.mjs`.

**Não inclui:** código, arte gerada, integração, publicação.

**Aceite:** prompt idêntico no guia e no MEGA, paleta com 16 cores de cena e 3 de fundo por bioma, contratos com `nativo = round(mundo/3)`. Verificado pelo teste citado.

---

## F0b — Frame pixel (a base técnica) ✅ 2026-10-26

**Objetivo:** o jogo desenhar o mundo num buffer de 320×180 e ampliá-lo ×3, exatamente como o Celeste, sem tocar em gameplay, saves ou colisões.

**Entregues**

| Item | Onde | Detalhe |
|---|---|---|
| Buffer e composição | novo `game/js/pixel_celeste.js` | canvas 324×184 (320×180 + 2 px de sangria), `imageSmoothingEnabled=false`, `beginWorld()/endWorld()` |
| Ampliação | `game/js/render.js` (`drawRun`) | mundo → buffer → ×3 na tela; a UI continua por cima, no canvas cheio |
| Zoom inteiro | `game/js/camera.js` | escada 1×/2×/3×, padrão 1×; a roda anda um degrau e a pinça quantiza |
| Câmera lisa | `pixel_celeste.js` | translação do buffer arredondada em px; o resto fracionário volta na composição como deslocamento **inteiro** de tela (técnica da *bleed area* do Saint11/Celeste) |
| Terreno 8×8 | `game/js/world.js:bakeGround` | autotile com infill, 1 px de luz no topo, 1 px escuro na base, aresta quebrada e 3 variantes de miolo |
| Paleta | `pixel_celeste.js` ← `paleta-celeste.json` | lock por bioma no assado do chão; `game/test/pixel-frame.mjs` confere os dois |
| Vinheta | `pixel_celeste.js:bakeVignetteMask` | máscara de 1 px com dither Bayer 4×4, no lugar do gradiente radial borrado |
| Névoa | `game/js/fog.js` | dentro da passada de mundo, borda dura (sem suavização) |
| Mobile | `game/mobile/touch.js` | a pinça quantiza na escada inteira; nada novo de input |
| Encaixe na tela | `game/js/main.js:fit()` | o canvas cresce em degraus de **1/3** (`s = floor(s*3)/3`), porque o pixel do frame mede 3 px de canvas: só assim ele chega inteiro ao monitor |
| PS1 e scanlines | `game/js/state.js`, `game/js/psx_filter.js` | nascem **desligados** (eram o padrão) — ver decisão 3 abaixo |
| Formigas | `game/js/assets.js` + `config.js:ANT_NATIVE` | **um frame por casta**, assado no tamanho NATIVO (`round(mundo/3)`) e ampliado por um passo **inteiro** de buffer — 1 px do assado = 1 px do buffer |
| Paleta em runtime | `pixel_celeste.js` ← `game/assets/paleta-celeste.json` | lida no boot, antes de assar o chão; se o fetch falhar vale o literal de segurança (conferido igual ao JSON por teste) |
| Overlay de feromônio | `lore_hud.js` | acompanha o deslocamento do frame (`frameShift()`), senão sai até 3 px fora do mundo |
| Retângulo de seleção | `game.js` | mesma correção: é desenhado por cima do buffer, em resolução cheia |

**Decisões do usuário nesta fase**

1. **Escopo B — frame + autotile 8×8.** O chão dos seis biomas muda nesta mesma entrega.
2. **Câmera B — zoom inteiro + câmera lisa (sangria Celeste/Saint11).** Mais código, aceito explicitamente.
3. *“não é uma opção, é o estilo do jogo inteiro, não pode ser desativado ou ativado”* — o frame **não** virou chave em OPÇÕES → VÍDEO nem no save. Vale para toda partida, no PC e no mobile. **(A linha “Opção de vídeo” da especificação original está cancelada.)**
4. **Vinheta A — máscara de dither de 1 px**, no lugar do gradiente radial.
5. **Degrau de 1/3 no encaixe do canvas** (2026-10-26, decidido na inspeção): o pixel do frame tem de ser quadrado e do mesmo tamanho em qualquer janela. Custo aceito: no celular o canvas passa de 693×390 para 640×360, ~8% menor, com mais tarja.
6. **Filtro PS1 e SCANLINES desligados por padrão** (2026-10-26, decidido na inspeção): os dois são pintados POR CIMA do canvas e desfaziam o frame — a uniformidade dos blocos 3×3 caía de 100% (no canvas) para 1% (na tela). As duas opções **continuam existindo** em OPÇÕES → VÍDEO, e saves anteriores recebem o novo padrão **uma única vez** (marca `save.pixelFrame`).
7. **As formigas só precisam de um frame cada** (2026-10-26): *“as formigas por enquanto só precisam de um frame cada”*. Os 24 ângulos sumiram para as 18 castas — a 15×15 px, girar o sprite em 24 passos produz silhueta lambida, não pixel art; o Celeste não gira, tem quadros por direção, e isso é F0c/F2. Os chefes (`rotMode`) mantêm os 24: são sprites grandes e a rotação ainda lê bem neles.

**Riscos técnicos conhecidos — como ficaram**

1. **Zoom fracionário** (era 1,15 com passos de 0,867) → resolvido: quantizado para 1×/2×/3×. Efeito colateral assumido: o jogador não afasta mais além de 1× (vê 960×540 unidades de mundo) e o padrão mostra ~13% mais mundo do que antes.
2. **Rotação de sprite** já é assada em 24 ângulos; o tamanho de assado de `ANT_SIZES` já é o nativo no zoom 1 (`45 → 15 px`, `189 → 63 px`), então **nada** precisou ser reassado.
3. **PIP “OLHO LÁ FORA”** do ninho → reaproveita o mesmo buffer: recorte de 150×85 px do buffer ampliado ×2 na janela (450×255 unidades de mundo, praticamente o enquadramento antigo de 484×274).
4. **Vinheta borrada** → virou máscara de 1 px com dither. Continuam pendentes para F2 os outros gradientes de VFX (brilho de essência, pulso do ninho).

**Aceite cumprido:** 60 FPS no RUN nos seis mapas, PC e mobile; **100% dos blocos 3×3** da região de mundo uniformes nos três perfis (PC 960×540, mobile 844×390 e PC 1366×768); HUD, textos e toque intactos; `npm run test:quick` verde (33 testes); `npm run inspect` verde (33 capturas, sem erro de JS/404/glifo).

**Medições reais**

| Onde | Antes (`81fc1f26`) | Depois (F0b) |
|---|---|---|
| Blocos 3×3 uniformes na faixa de mundo (tela, canvas 1:1) | 3,1% | **100,0%** |
| Blocos 3×3 na tela com canvas a 4/3 (janela 1280×720) | — | 86,9% (o resto é conteúdo em resolução cheia: formigas, partículas — F0b-2) |
| CPU por quadro no RUN (inspecão headless) | 6–9 ms | **2,5–3,2 ms** |
| FPS nos seis mapas, PC e mobile | 59–60 | **60** |

**Diagramas:** [`diagrama-f0b-frame-pixel-2026-10-26.png`](diagrama-f0b-frame-pixel-2026-10-26.png) (ANTES → DEPOIS) e [`diagrama-f0b-filtro-ps1-2026-10-26.png`](diagrama-f0b-filtro-ps1-2026-10-26.png) (o conflito com o filtro PS1).

**Assado das castas (F0b-2, medido no navegador):** as 18 castas assam 1 frame cada, em caixa justa (`corpo + 2 px` de margem, sem a diagonal da rotação), com ampliação inteira de 1× no buffer — a gigante, 4× (o truque de assar 1/5 e ampliar na hora, agora com fator arredondado para inteiro, o que antes dependia de um número mágico em `ANT_SIZES.giant`).

---

## F0b-2 — Pipeline de pixelização ⏳

**Objetivo:** transformar a fonte gerada (alta resolução, chroma) em **arte nativa** rigorosa.

**Entregável:** `tools/pixelize.py` (Python + Pillow, uso só de produção, fora do runtime do jogo):

1. remove o chroma (verde/azul) com tolerância e despill de borda;
2. detecta o tamanho do bloco de pixel da fonte e reduz por **nearest** para o tamanho nativo da ficha;
3. quantiza na paleta do bioma (`paleta-celeste.json`) com dither desligado;
4. valida: nenhum pixel semitransparente em borda dura, nenhuma cor fora da paleta (tolerância 0), alfa real;
5. exporta `nativo.png` + `preview-3x.png` + relatório JSON (dimensões, cores usadas, hashes).

**Aceite:** três peças de prova (uma casta, um prop, um painel) com contagem de cores conferida e revisão visual em 320×180. Sem isso, nenhuma arte gerada entra no jogo.

---

## F0c — Piloto de arte nativa ⏳

**Peças (5, uma rodada):** Rainha 63 px · Cortadeira 15 px · Larva 24 px · Cristal de memória 16 px · recorte de base da Planície com tiles 8×8.

**Aceite:** silhueta legível no tamanho nativo; mesma paleta dos 5; mock no jogo com o HUD atual e com o HUD da F1; 24 rotações da Cortadeira sem corte; aprovação visual do usuário antes de qualquer lote.

---

## F1 — UI, HUD, ícones e tipografia ⏳

**Sub-lotes**

- **F1a — HUD pintado:** 5 atlas atuais → arte em grade de 3 px (painel 90×48 nativo, cartões, placas de madeira, barras). As Regras 21/22 continuam: sprite inteiro, escala uniforme, área de papel medida em `paperQuiet()` recalculada para a arte nova.
- **F1b — 32 ícones:** 16×16 nativos (alguns 12×12), com 2–3 cores + tinta; mesma leitura no minimapa e no toque.
- **F1c — Tipografia:** KiwiSoda **mantida** por padrão. Fonte pixel própria só com autorização; se aprovada, refazer métricas de todas as telas.
- **F1d — UI procedural:** barras, tooltips, modais, sliders, seleção da árvore, painéis de lore — sem mudar custos, estados ou hitboxes.

**Aceite:** nenhum HUD deformado; texto normal e FONTE GRANDE dentro da área permitida; contraste no claro e no escuro; teste `paper-hud-browser` atualizado; toque equivalente em todas as telas.

---

## F2 — Castas, rainha, névoa, recursos e VFX ⏳

**Ordem interna:** Rainha (63) → Cortadeira (15) → Bala (21) → Arpão (13) → Acrobata (19) → Fogo (20) → Cefalote (24) → Pote-de-Mel (15) → Prata (16) → Matabele (18) → Tecelã (15) → Dinoponera (109, arte própria; hoje usa a Bala).

**Também nesta fase:** manto da névoa 16×16 × 6 quadros (hoje 48×48) · cristais de memória · pilha de comida 18×13 nativo · auras de casta e VFX (impacto, cura, fogo, veneno, lentidão) em 1–3 px · sombra no chão separada do corpo que gira · flash por troca de paleta.

**Aceite:** toda casta reconhecível em tamanho nativo; status legíveis sobre os 6 terrenos; orçamento de partículas respeitado; 24 rotações sem corte; Dinoponera com escala 20× preservada.

---

## F3a — Árvore e maçãs ⏳

Árvore 320×180 nativo + 7 maçãs 320×320 nativo + estados cinza/50%/100% + nós, conexões e restauração de cor (`meta.js`, `tree_art.js`, `color_restore.js`). Sem cadeados/correntes; sem mudar custos, hitboxes ou save.

**Aceite:** restauração fiel, alinhamento de nós e galhos, leitura no toque.

## F3b — Santuários ⏳

Um por entrega: Planície → Floresta → Pântano → Deserto → Outono → Gelo; prévia da Pálida só na F8. 320×180 nativo cada, terreno limpo antes dos props.

**Aceite:** não cobre hitboxes; pré-carregado pelo TITLE (Regra 14), sem tela de carregamento.

## F3c — Flores ⏳

Folhas regulares com célula nativa de 64 px (4 estados) e supremas (6 estados). Cadência intacta: **9 vivos → PARADA 1 → 3 mortos + 6 fases da Suprema → PARADA 2**. Morto deriva do broto vivo. Preços não mudam.

**Aceite:** 3 espécies distintas por santuário (não recolor), leitura em 48/64 px, cinza/colorido corretos.

---

## F4 — Chefes ⏳

6 chefes (Tamborilador/lebre, Caçadora/raposa, Sombra/tetraz, Matriarca Rival, Galhada/cervo, Devastador/javali) em células nativas de **22×22**, 4 linhas de direção, 5 estados, **516 células** a preservar (contagem e ordem de `BOSS_ANIMS`). Matriarca hoje reutiliza a aranha (`e_matron`): sprite próprio de rainha-formiga exige aprovação. `boar_attack` continua sem consumidor — não produzir.

**Aceite:** direção, pivô e estados verificados; telegráficos legíveis sobre cada terreno; combate e balanceamento inalterados.

---

## F5a — TITLE e PRETITLE ⏳

4 camadas em 320×180 nativo (com margem de parallax), logo, PRETITLE e fundos de menu. Ciclo dia/noite de 60 s, partículas, vaga-lumes e transições preservados; efeitos reduzidos respeitados.

## F5b — Telas de carregamento ⏳

6 ilustrações 320×180 (hoje só Planície e Floresta têm PNG próprio). Só na troca de mundo; barra, dicas, erro e “pronto” intactos.

## F5c — Noite Branca ⏳

3 painéis × 4 camadas, **já em 320×180 real** — só reestilização, sem mudar contrato, alfa, replay, PULAR ou toque.

## F5d — Outros painéis de memória 🔒

21 painéis sem arte dedicada. Só com autorização explícita de escopo; a definição/fallback atual não é PNG concluído.

---

## F6 — Inimigos, terrenos e props ⏳

- **7 inimigos:** larva, saúva, louva-a-deus, besouro, vespa, caranguejo, aranha (13–21 px nativos).
- **6 terrenos:** base limpa por bioma (chão no buffer), depois decoração, depois construções — Regra 19 intacta. Tiles 8×8 com paleta própria.
- **55 props:** 19 árvores, 15 arbustos, 3 cactos, 2 samambaias, 5 pedras, 7 cristais, 3 ninhos, 1 monte.

**Aceite:** colisão e âncoras preservadas; leitura de horda; nenhuma decoração embutida na base; nenhum prop órfão sem consumidor.

---

## F7 — Ninho escavável ⏳

3 estados exteriores + interior (7 salas, 8 conexões), câmaras, túneis, seda/mel/esporos/berçário/cristais/coroa/faíscas e sinais de Eras. O ninho continua top-down escavável; a decisão de câmera do interior precisa ser registrada antes da arte.

**Aceite:** entrada/saída instantânea (Regra 14), escavação e “OLHO LÁ FORA” preservados, ficha por tile.

---

## F8 — Pálida 🔒

Rainha ancestral de névoa, castelo/ninho, arena, coração, efeitos e final. **Não autorizado** por esta direção; exige pedido próprio de conteúdo (mapa, chefe, final) e não é só arte.

---

## F9 — Distribuição ⏳

6 ícones PWA (`app/icons/`), 2 ícones nativos (`installers/`), site (`index.html`, `app/`), pacote offline completo. `ASSET_V`, `make_assets_list.mjs` e `sync-native-assets.mjs` a cada lote integrado.

**Aceite:** cache/shell coerentes, offline real, ícones legíveis em 16–512 px sem interpolação suja.

---

## Regras transversais (valem em toda fase)

1. **Uma fase por vez**, com aceite antes da seguinte; nunca trocar os 176 PNGs de `game/assets/` numa entrega.
2. **Ficha preenchida** → pesquisa específica → perguntas → 2+ opções → aceite → integração → testes → inspeção PC/mobile.
3. **Chroma obrigatório** na fonte gerada; derivado nativo com alfa real revisado.
4. **Teto de 10 imagens por rodada**, contando alternativas.
5. **Top-down** no mundo; ilustrações nas exceções aprovadas; anatomia de inseto; sem bipedia.
6. **Nada de gameplay**: dano, custos, preços, waves, saves, seeds, colisões e hitboxes só mudam com pedido próprio.
7. **Desempenho é requisito**: nenhum pós-processamento por pixel em tempo de jogo; detalhe estático assado.
8. **Legibilidade primeiro**: silhueta, contraste e leitura no mobile acima de riqueza decorativa.
9. **Regra 14**: o que abre pelo TITLE é pré-carregado; carregamento só na troca de mundo.
10. **Registro no MEGA** ao fim de cada fase: gerado, aprovado, integrado, testado, limites e próximo passo.

## Caminho crítico recomendado

```
F0a (feito) → F0b (frame, feito) → F0b-2 (pixelização) → F0c (piloto) → F1 (UI)
   → F2 (castas/VFX) → F3a/F3b/F3c (árvore, santuários, flores)
   → F4 (chefes) → F5a/F5b/F5c (menus, loading, Noite Branca)
   → F6 (inimigos/terrenos/props) → F7 (ninho) → F8 (só se autorizado) → F9 (distribuição)
```

**Próxima ação real:** F0b-2. O frame já está no jogo; falta o pipeline que transforma a fonte gerada (alta resolução, chroma) em arte nativa rigorosa — sem ele, nenhuma arte gerada entra no jogo.

## Verificação desta rodada

```bash
node game/test/art-pixel.mjs      # direção, paleta, contratos e fases
node game/test/pixel-frame.mjs    # frame: buffer, zoom inteiro, paleta e chão 8x8
node tools/check_art_handoff.mjs  # prompt canônico no guia + MEGA e histórico preservado
node game/test/docs.mjs           # integridade dos seis documentos incorporados
npm run test:quick                # bateria rápida do jogo (sem navegador)
npm run inspect                   # PC + mobile no navegador (inclui pixel-frame-browser)
```
