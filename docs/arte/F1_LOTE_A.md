# F1 — lote A: estudo de interface

Data: 2026-10-08. Pedido: “Parta direto para F1”. F0 fica adiado, não concluído.

- Duas gerações novas, sem alternativas extras: moldura Planície e folha tenra (1024² RGB).
- Cristal âmbar recuperado do F0b; não gerado novamente nem aprovado como ícone definitivo.
- Prompt-mestre integral FUMIGA-PAPEL-v2-DETALHADO usado nas duas chamadas, complementos técnicos no histórico da ferramenta. Referência da moldura: mock-pc F0b; referência da folha: moldura nova. Estudo de UI frontal e folha top-down, luz alta esquerda.
- `art-source/f1/`: originais, recortes, escalas, scripts, capturas, manifesto e galeria. Pesados fora do Git.
- Moldura solicitada alfa retornou xadrez pintado; recorte retangular explícito (64,68)-(960,960). Folha: flood-fill de branco exterior. Originais intactos. Recortes provisórios.
- Contrato de estudo: célula lógica 32²/nove fatias 8px; ícones 16/20/24/32/48/96 px. Orçamento final/atlas a definir após aceite.
- Captura experimental: documento debug descartável; intercepta alguns drawImage durante um render, suprime mundo e aplica base do piloto. Não muda arquivos de produção, caches globais, hitboxes, saves ou filtro PS1. Ainda há bordas e componentes legados; não afirmar HUD final.
- Leitura visual: detalhe fino reduz muito nos cantos 8px; candidato precisa adaptação técnica antes dos atlas. Botões/banner da prancha são amostras da moldura, não estados completos. Sem teste de performance da arte integrada.
- Testes: rápidos 29/29; inspect:hud seis biomas sem JS/HTTP, 90 frames ~60 FPS diagnóstico do jogo antigo; mobile.mjs boot à expedição por toque aprovado. Capturas PC/mobile sem erros/glifos ausentes. Docs e handoff aprovados.
- GUIA e regras consultados; leitura integral do MEGA ainda não comprovada, pendência mantida antes de integração. Suíte completa e testes físicos não executados.
- Referência pesquisada: Lumino City, https://apps.apple.com/us/app/lumino-city/id958604518 — material artesanal e apresentação tátil; nenhuma mudança de câmera ou mecânica derivada.

## Checklist
| Item | Estado |
|---|---|
| Iniciar F1 | Estudo produzido |
| Cinco atlas | Não produzidos; contratos auditados |
| 32 ícones | Folha candidata e cristal reaproveitado; restante pendente |
| UI procedural / controles | Amostras de escala, sem integração |
| Produção / font / gameplay | Intactos |
| Aceite | Aguardando revisão visual |

Backup confirmado no Drive: `14otsEq79FoHnAaYqA7WBFs67vtPqQ55F`, 16.843.467 bytes, SHA256 `f847e3c3331a8e23425cc2ea4b405ea3c66ddd75f33ccf217c9e1534c85f443a`.
