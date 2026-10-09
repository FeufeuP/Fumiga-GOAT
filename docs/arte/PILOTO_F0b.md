# Piloto F0b — candidatos de papel recortado

**2026-10-08 · Autorização A: cinco peças, aprovação antes de integração.**

| Peça | Produzido | Estado para produção |
|---|---|---|
| Rainha Silenciosa | Original 1024²; recorte, nominal 189 px, prova de 24 rotações/flash | Revisar anatomia, seda/diadema e aliasing |
| Cortadeira | Original 1024² com xadrez pintado; recorte, nominal 45 px, 24 rotações/flash | Revisar identidade própria, cintura/articulações e contorno |
| Larva da colônia | Original 1408×768; recorte, estudo 24 px | Halo e compatibilidade com berçário transversal pendentes; não enemy e_runner |
| Cristal de memória | Original 1024²; recorte, estudo 48 px | Halo/função final pendentes; não substituir veios brancos/verdes |
| Base da Planície | Duas gerações 1376×768, inicial rejeitada por capim; corrigida e prévia 960×540 | Bordas ainda a revisar; Y não define mapa/seed/colisão |

**Nenhuma peça aprovada ou integrada.** Técnica `FUMIGA-PAPEL-v2-DETALHADO` permanece aprovada. Todos os originais são RGB; derivados RGBA são provisionais, não arquivos finais. Não usar os mocks suaves como prova de leitura no cache nearest atual.

## Revisão

- Galeria local: `art-source/piloto-f0b/index.html`, preview :8001.
- Folha: `previews/pecas.png`; mocks com HUD real: `mock-pc.png`, `mock-mobile.png`.
- Prova real no cache em chaves temporárias: `rotacoes-pc.png`/`rotacoes-mobile.png`; 24 rotações e flashes por formiga, sem corte nas bordas.
- Mock não é gameplay: minimapa pertence à captura real; larva não está no chão; PS1 não foi aplicado ao mock bruto. Fontes, engine, filtros e produção intactos.
- Base limpa não demonstra densidade final; decoração/construções são passadas futuras com aprovação própria.

## Verificação

Baseline quick **29/29**; inspeção final **6/6** TITLE/NINHO/RUN-MAPA1 PC/mobile sem JS/404/glifos. RUN final 56/56,5 FPS, baseline 57,5/46,6; variação não é ganho causado pelo piloto. Sem suíte completa/aparelho físico. Cache RGBA estimado: Rainha 11.151.552 bytes; Cortadeira 691.200 bytes, mais overhead/originais. Nenhum FPS de expedição integrada medido.

**Leitura integral do MEGA ainda não comprovada** por lacunas/truncamentos; deve ser concluída antes da integração. Regras e GUIA consultados em blocos. Registro completo da entrega no MEGA, com decisões, problemas, resultados e próximo gate.

## Backup verificado

[ZIP no Drive](https://drive.google.com/file/d/1_S1u9YYy2aFIGGggVrCYT6Ud4n2peaVY/view), pasta existente de imagens. 31.282.672 bytes; SHA-256 `deaf41ae16fb9aa1440b2f1caa3d7bbf24f759db4fb93dd537b534273b6caba4`; MD5 `e8e03e81cec34279faa49a66ad622952`. `get_file` pós-upload conferiu pai/tamanho/checksums; CRC local íntegro. Pacote contém todas as artes/rejeitada/referências/derivados/capturas/galeria/scripts/fichas e manifesto interno. Metadados em [piloto-f0b.json](piloto-f0b.json). Original da ficha Rainha registrado resumidamente, não transcrição literal recuperada.

**Próximo gate:** revisão visual do usuário → correções técnicas/anatomia → aceite e autorização de integração limitada → testes/medição reais. Não avançar automaticamente ao HUD F1 nem publicar no GitHub.
