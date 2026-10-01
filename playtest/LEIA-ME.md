# playtest/ — arquivos recebidos dos testers

Coloque aqui os JSONs exportados no jogo (**OPÇÕES → aba TESTE → EXPORTAR DADOS**) e rode:

```bash
npm run playtest                 # lê esta pasta (aceita também arquivos soltos)
npm run playtest -- arquivo.json --json=playtest/resumo.json
```

O roteiro completo (PWA em aparelho real + balanceamento) está em [`../PLAYTEST.md`](../PLAYTEST.md).

> Os `*.json` desta pasta **não entram no Git** (dados de campo, e podem ser grandes): só este
> LEIA-ME é versionado.
