# F1 — variações do HUD por função (lote 1)

Data: 2026-10-09. Pedido: variações do HUD de madeira e vinhas ao recorrer do jogo; usuário escolheu começar pelas funções da interface.

> **Estado atual:** [publicação de brasa +3novosHUDs](HUD_PUBLICACAO.md). Fontes button/tooltip/pause substituídas pelo lote2026-10-09 e brasa integrada1/32. Registros abaixo são históricos, não prova de disponibilidade local dos originais.

## Peças geradas (candidatos — não integrados)
1. **Botão (`botao.png`):** 1410 × 752 px, RGB. O gerador retornou proporção ~1.87:1 em vez de 4:1. É uma placa alta, ainda parecida com painel. Apresentado no tamanho original e em 240 px de largura; **não foi achatado nem substituído por código**. Defeito de proporção a corrigir antes do corte final.
2. **Barra de vida (`barra-vida.png`):** 2736 × 384 px, RGB. Calha horizontal alongada em madeira clara, vinhas nas duas pontas e canal central creme para receber preenchimento dinâmico. O fundo tem xadrez pintado; alfa real precisa ser preparado.
3. **Banner de onda (`banner-onda.png`):** 2320 × 464 px, RGB. Placa indicadora 5:1 com nó de madeira, afilada à direita, vinhas nas extremidades e centro livre para o texto da onda. Fundo com xadrez pintado.

## Referência e regras
- Prompt canônico `FUMIGA-PAPEL-v3-PASTEL-ORGANICO` integral em cada chamada.
- Imagem de referência única: `art-source/f1-hud-vivo/images/painel-alpha.png` (derivado alfa do painel aprovado, SHA-256 do PNG original `f4e775e038a98cbf23bd1e12958ae77070e8da6996e94043e4872e6c245aa47e`).
- Fiel à regra de continuidade: as peças são os PNGs gerados, sem recoloração e sem redesenho simplificado.
- Galeria de revisão em `art-source/f1-funcoes/index.html` (porta 8001).

## Verificações
- Galeria testada via Playwright em PC (1280×900) e mobile (844×390): 6 imagens carregadas, sem erros JS/HTTP, sem overflow horizontal.
- Inspeção do jogo atual TITLE/RUN PC/mobile: 4/4 sem erros JS/404/glifos; o registro antigo de 60 FPS não deve ser tratado como medição desta entrega.
- Código do jogo, fontes, hitboxes, controles de toque e gameplay **intactos**.
- Próximas funções: minimapa, tooltip, cartão e pausa.

## Limitações abertas
- Botão precisa de formato mais horizontal e margem menor de madeira.
- Barra e banner vieram com xadrez pintado (exigem recorte alfa).
- Nenhuma das peças está integrada ao runtime.

## Lote 2 — quatro funções restantes (2026-10-09)

Pedido: confirmar preservação e criar mais variações para HUD completo. Backup lote1 revalidado no Drive por ID/tamanho/SHA; ZIPs lote1 e HUD fiel recuperados e hash/CRC verificados. Quatro novas gerações usando diretamente o painel alfa aprovado: minimapa, tooltip, cartão vertical e pausa/modal. Prompt v3 integral nas quatro chamadas; sem alternativas extras, sem substituir por desenhos procedurais.

Galeria conjunta das sete funções: `art-source/f1-funcoes-lote2/index.html`, preview :8001. Usa os próprios PNGs sem alterar proporções. Originais e manifesto de dimensões/modos/hashes preservados. O tooltip divergiu para borda mais reta e fibras mais contrastadas; candidato sujeito a revisão, não aceite automático. Novos originais sem alfa real. Nenhum runtime modificado.

Verificações: 14 exibições de imagem decodificadas em PC1280×900 e mobile390×844, sem JS/HTTP/overflow, expansão da amostra de escala funcionando. Inspeção jogo antigo TITLE/RUN PC/mobile 4/4 sem erros; não comprova arte integrada. Docs/handoff verdes. Sete funções têm candidatos, mas não há HUD de produção completo: faltam estados ativo/hover/pressionado/desabilitado, recortes/atlas, ícones e controles móveis restantes, fonte grande, integração e desempenho/offline. Leitura integral do MEGA continua não comprovada.

## Integração opaca — 2026-10-09

Usuário autorizou concluir restantes sem transparência e dispensou conclusão da transferência. Oito derivados RGB em `game/assets/ui/paper/`, incluindo painel original e sete funções. `tools/prepare_paper_hud.py` altera exclusivamente exterior neutro conectado à borda para creme; verifica RGB da arte preservado antes da redução uniforme. Fontes intactas; manifesto `paper-hud.json`. Nenhum recorte alfa, redesenho ou nova geração. Runtime `paper_hud.js` usa nove faixas com escala uniforme dos cantos e cache limitado160; partes centrais extensíveis, não reprodução pixel-idêntica da imagem inteira em proporções diferentes.

Integrados painel, botão, barra dinâmica, banner, minimapa, tooltip, cartão por proporção e modal/pausa em módulos compartilhados. Estados usam indicadores de borda, não transparência ou recoloração da arte. Fonte Kiwi Soda preservada; tinta contextual escura sobre papel. O minimapa mantém terreno opaco e dados reais. Fundos exteriores creme são intencionais. Ícones antigos mantidos: recriação artística dos32 ícones NÃO concluída. Atlases antigos mantidos para ícones e fallback; não anunciar F1 artístico100%.

Testes: primeira suíte33/34 (contagem PWA antiga); contagem atual242 corrigida. Segunda33/34 com flutuação em retry de carregamento no mobile; regressions-browser repetido isolado passou PC/mobile. HUD navegador seis biomas passou; navegação PC/mobile passou. Layout RUN PC19 e mobile19 estados limpos com fonte normal/grande. Auditoria geral de layout excedeu tempo disponível; não contar completa. Inspeção8/8 sem JS/404/glifos. Desempenho concorrente35–40fps; isolado PC59,5/mobile60fps, não prova hardware físico. Pacote242 arquivos30,8MB, ASSET_V20261009-hud-papel-opaco, espelhos nativos sincronizados; instaladores não compilados. Sem GitHub/upload novo conforme escopo; runtime persistente no repositório. Backup remoto anterior sete funções permanece o previamente verificado; derivados novos só locais. Leitura integral MEGA ainda não comprovada.

## Correção ativa — estados, proporções e dez ícones (2026-10-09)

**Este registro supera os status técnicos anteriores, não declara F1 concluída.** O usuário rejeitou a entrega parcial: faltaram formatos, estados, ícones e integração completa; o tooltip reto/fibroso também não atende à referência. HUD deve continuar opaco e usar as artes apresentadas, sem substituto simplificado. A integração foi autorizada, mas artes novas/revisadas ainda precisam de aceite visual.

### Implementação atual

- `game/js/paper_hud.js`: recortes específicos por peça (5 colunas × 3 linhas), duas faixas horizontais extensíveis, cache limitado a 160 entradas / 8 Mi pixels. Quando a caixa é mais alta que a proporção da imagem, contém a imagem inteira em escala uniforme sobre creme opaco. **Isso evita alongar folhas, mas deixa base lisa exposta e não entrega uma composição alta final.**
- Cinco estados opacos implementados no corpo: normal, hover, pressionado, selecionado e desabilitado. Seleção também recebe marca. Precedência: desabilitado > pressionado > selecionado > hover > normal. Distinção por pixels não comprova contraste perceptível em todos os tamanhos.
- `ui.js` propaga os estados aos botões e iconButtons. `font.js` mantém Kiwi Soda e limita tinta de papel à superfície/contexto/frame, excluindo mundo; não usa cor global para todo o jogo.
- Tooltip atual usa **o mesmo PNG do painel orgânico aprovado**, e não o tooltip reto/fibroso nem a candidata revisada. Ainda sem ponteiro e sem aceite de todos os formatos.
- `ASSET_V`: `20261009-hud-proporcoes`; pacote offline 242 arquivos / 30,8 MB; cada shell nativo recebeu 247 arquivos runtime e 26 páginas. **Não foram compilados novos APK/EXE.**

### Ícones: lote apresentado, não integrado

Dez candidatos: alimento, essência, defesa, energia, tempo, frio, cura, prole, brasa e poção. Alimento já existia; as nove peças seguintes usaram o prompt v3 integral e a folha como referência binária. Fundo creme opaco na ficha, sem alternativas extras. São símbolos da interface, não substitutos dos objetos do mundo.

Originais: `art-source/f1-correcao/originais/i_*.png`. Nove têm 1024×1024; poção retornou 1408×768 e recebeu **apenas corte das margens laterais vazias** `(320,0,1088,768)`, preservando o frasco. Originais não sobrescritos. `tools/prepare_paper_icons.py` prepara RGB128 e folha de revisão 16/24/32/48 px; total dos dez derivados: **222.933 bytes**. Não copia nada para `game/assets/`. Hashes, dimensões e estado por peça: [paper-icons-review.json](paper-icons-review.json), além do manifesto local `icones/manifest.json`.

Galeria `art-source/f1-correcao/index.html`: estados, botões reais de teste com ícones candidatos, formatos/tooltip, dez símbolos e duas candidatas anteriores de botão/tooltip. Usa módulos do jogo em contexto isolado, sem gravar progresso. **0/32 ícones migrados; 22 ainda sem candidato.** Mostrar a galeria não autoriza a migração.

### Verificação desta continuação

- Suíte completa antes da inclusão do novo teste no runner: **34/34**, 74,4 s.
- `paper-hud-browser.mjs`: cinco estados pixel-distintos, alpha255, tinta local/reset/exclusão do mundo, imagem alta pixel-idêntica a contain uniforme e tooltip pixel-idêntico ao painel. Agora incluído na suíte quando Playwright está instalado.
- Galeria PC1280×900 e mobile390×844: dez ícones carregados, clique/toque em botão real funcionando, sem JS/HTTP/overflow. O canvas reduzido no retrato **não comprova legibilidade/alvos de toque finais**.
- Inspeção TITLE/OPTIONS/RUN-MAPA1: **6/6** PC/mobile sem JS/404/glifos. PC58,5 FPS, pior intervalo33,4 ms, CPU10,16 ms; mobile60 FPS, pior16,8 ms, CPU10,91 ms. Medição headless, não aparelho físico.
- Navegação PC/mobile: páginas/replay, ninho, pausa/retomada e invocar por clique/toque passaram.
- Layout focado OPTIONS-ABA0, RUN-FAIXA/EXPANDIDO/DRAFT/PAUSA: **20 estados** PC/mobile com fonte normal/grande limpos no gravador geométrico. Auditoria geral excedeu 360 s, sem relatório final; **não está concluída**.

### Problemas confirmados pela inspeção visual

Capturas de expedição, opções, painel expandido e pausa abertas: texto ainda invade madeira/folhas, painel contido deixa grandes áreas creme lisas, estados pequenos são sutis, barras de opções/colônia e controles DOM mobile mantêm cores antigas roxas/azuladas. O minimapa real cobre parte da moldura; acabamento do conjunto continua parcial. O gravador de layout não detecta colisão entre texto e ornamentos assados no PNG. Não usar os testes verdes para encerrar estas pendências.

### Continuidade e preservação

Originais, revisões e capturas preservados no workspace em `art-source/f1-correcao/`, fora do Git conforme convenção. Sem upload remoto novo; o usuário dispensou concluir a transferência. Não afirmar que este lote está no Drive. Backups remotos anteriores permanecem os anteriormente comprovados. Sem GitHub/PR/merge nesta tarefa.

Regras lidas integralmente em blocos; GUIA e registros/prompt atuais consultados. **Leitura integral do MEGA ainda não comprovada**, e continua pendente. Próximo: aceite/revisão do lote de dez; completar os 22 restantes em rodadas de até dez; finalizar formatos, margens de texto, estados e camada mobile antes de declarar integração completa. F0 segue adiado.

**Fechamento dos testes desta continuação:** após incluir `paper-hud-browser` no runner, primeira execução ficou34/35: `regressions-browser` observou progresso0,975 e ready=true. Causa no teste: `await import()` entre leitura de progresso e de ready permitia um frame no meio; o comentário “leitura atômica” não correspondia ao código. Corrigido apenas o teste para ler os campos sincronamente de `MOD.loading`, mantendo a exigência≥0,98 e sem alterar `loading_screen.js`. Nova suíte completa **35/35 verde,71,7s**, incluindo a regressão e o novo teste de papel. Docs/handoff/lista/diff verdes. Falha inicial preservada neste registro; nenhum defeito visual citado acima foi resolvido pelo ajuste de teste.

## Correção de enquadre no runtime — 2026-10-09

Pedido continua aberto, não concluído. Implementado: seleção por proporção (card848×1264 retrato, pause960×798), grade5×5 com ornamentos em escala limitada e repetição de faixas de borda em vez de contain sobre base lisa; estados de corpo mais contrastantes; tooltip explicitamente no painel original, quebra de linhas e margens próprias; colônia com respiro, barras terrosas, draft propaga hover/pressão. CSS mobile agora usa fundo opaco e paleta terrosa. Fontes, saves, controles e hitboxes preservados. Nenhuma nova arte gerada ou ícone aprovado/migrado:10candidatos,22faltantes,0/32migrados.

Inspeção visual de pausa/colônia/draft mostrou melhora do enquadre, mas repetição das folhas é visível e estatísticas da pausa ainda encostam na borda esquerda. Não considerar fidelidade final resolvida. Tooltip usa adaptação do painel, não arte própria revisada. Suíte35/35verde65,5s; layout focado18estadosPC/mobile/fontegrande limpos56s (antes da alteração CSS). Renderizador testado quanto à cobertura vertical e alpha255; teste anterior de contain substituído por esse contrato. ASSET_V20261009-hud-enquadre; pacote242/30,8MB e shells sincronizados, sem builds/GitHub. Capturas persistentes art-source/f1-correcao/tecnico/layout-corrigido. Sem novo upload remoto. Leitura integralMEGA ainda pendente. Não declarar F1 concluída.


Inspeção final após CSS: TITLE/RUN PC/mobile4/4 sem JS/404/glifos; PC52,1FPS/mobile53,6FPS headless. Preview8000 PC/mobileHTTP200.
