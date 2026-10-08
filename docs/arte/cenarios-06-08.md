# FUMIGA — cenários nos estilos 06 e 08

**Data:** 2026-10-08 · **Escopo:** duas amostras da base de terreno da Planície do Amanhecer, sem integração no jogo.

| Amostra | Arquivo no Drive | Tamanho | SHA-256 |
|---|---|---:|---|
| 06 — Papel recortado | [PNG original](https://drive.google.com/file/d/1m-yVSdgpEr19Uc_00JrnfK2svgDh7pS0/view) | 2.030.366 bytes | `3a76ab51e44b1cc70943a838a4bf9cc87e919a285765f9cee53fed4c6c3665f3` |
| 08 — Low-poly ortográfico | [PNG original](https://drive.google.com/file/d/1eiLixhuWRMFmUCACE7GQbKB03AViVOje/view) | 1.525.976 bytes | `d9d6f3c6da3c429ca15cfd3e97f153856f4c5641db4a12a0dee1b260e149664b` |

**Pasta:** [estilos Visuais / Cenários — estilos 06 e 08](https://drive.google.com/drive/folders/1GgVrL5J2M6mZVg9s1N9oXZPVXNB4MZm6).

**PDF de duas páginas:** [abrir](https://drive.google.com/file/d/19fuGZ-th4InxKewAxzdTidQHW5e8Lw_m/view), 4.412.460 bytes, SHA-256 `0a64463ec9c0dd4f7306b5940f36d4f57e41eaed929046db2bf72f7cca0fd704`.

**Manifesto remoto:** [JSON](https://drive.google.com/file/d/18xnMtkZhQZaMYTd2q3dm3-R1U_7fitGD/view), 2.513 bytes, SHA-256 `4193561655b8496ccc2f42eac583ea9abea6998bbb1cf63e714e0bb673ad6339`.

## Método e limites

- Referências 06/08 da rodada v2 recuperadas diretamente do Drive; tamanhos e hashes iguais aos registros. Os caminhos locais da rodada anterior não estavam disponíveis nesta continuação; o backup remoto permitiu recuperá-las sem pedir reanexo ao usuário.
- Exatamente duas gerações. 06 usa o prompt-mestre `FUMIGA-PAPEL-v1` integral + ficha de base limpa + imagem 06 v2. 08 usa a nova base 06 como guia de composição e a imagem 08 v2 para o material low-poly.
- Mesma proposta de layout: clareira central e caminhos, câmera top-down a 90 graus, paleta oliva/musgo/verde-azulada e terra bege. Sem personagens, props, vegetação individual, ninhos, construções, névoa ou UI embutidos (Regra 19).
- Não é uma comparação pixel a pixel nem uma reconstrução do mapa atual. Não foram criadas colisões, zonas de spawn, tiles ou testes de navegação para esse desenho proposto.
- Comparar 08 é pedido explícito de estudo, não mudança automática da direção oficial 06. O piloto completo de personagens/recursos e a integração continuam pendentes.
- Local nesta entrega: `art-source/cenarios-06-08/` (fora do Git). Referências em `referencias/`; PNGs, PDF, HTML e manifestos na raiz da pasta. Para retomar, usar os IDs remotos se os arquivos locais não estiverem acessíveis; não presumir persistência só por existir um caminho registrado.

## Verificação

- Duas imagens 1376×768 decodificadas e abertas para inspeção visual.
- Dois PNGs, PDF e manifesto enviados ao Drive; listagem posterior encontrou os quatro arquivos. Todos os tamanhos/SHA-256 correspondem aos locais. Permissões não alteradas.
- Galeria local no Chromium: PC 1440×950 e mobile 390×844, duas imagens decodificadas, sem overflow horizontal, JS ou HTTP com erro; capturas abertas para inspeção.
- Preview da galeria na porta 8001 e jogo atual na porta 8000.
- `npm run inspect -- --telas=TITLE,RUN-MAPA1`: quatro cenas PC/mobile aprovadas, RUN a 60 FPS no ambiente headless. É inspeção do jogo antigo, não da integração destas artes.
- Sem mudança de assets de produção, runtime, saves, ASSET_V ou dependências de produção. Sem push/PR/merge.
