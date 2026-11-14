# paulistao-2027

Simulador Monte Carlo do Campeonato Paulista 2027, Séries A1 e A2. O modelo é o do
[`brasileiro-2026`](https://github.com/agamemnon140/brasileiro-2026), portado para módulos.

As decisões de desenho e os fatos que as sustentam estão em [`docs/DECISOES.md`](docs/DECISOES.md).

## Estado

| Parte | Situação |
|---|---|
| Núcleo do motor (`engine/core.mjs`, `engine/liga.mjs`) | Portado; paridade com o original verificada |
| Leitor da FPF (`scripts/fpf.mjs`) | Escrito e testado sem rede; nunca rodou contra o site |
| Coleta 2022–2026 | Não feita |
| Formato do Paulista (potes, mata-mata, A2) | Não feito |
| Backtest das sementes | Não feito |
| Interface, arquivo de previsões, Action de resultados | Não feitos |

## Rodar

Não há dependências; basta Node 22 ou mais novo.

```bash
npm test                                   # paridade com o motor original + leitor da FPF
node scripts/coletar_fpf.mjs --comp A1,A2 --anos 2022-2026
```

A coleta também roda pelo workflow "Coletar temporadas da FPF" (disparo manual), que
commita `data/fpf/`.

## Paridade com o motor original

`test/dourado/` guarda entradas e saídas produzidas pelo motor do `brasileiro-2026`.
`test/paridade.test.mjs` roda o porte sobre as mesmas entradas e exige igualdade a 1e-12,
inclusive em simulações Monte Carlo inteiras com a mesma semente.

Para regenerar os vetores quando o motor de lá mudar:

```bash
node scripts/gerar_dourado.mjs /caminho/para/brasileiro-2026/index.html <commit>
```

O diff de `test/dourado/` mostra o que mudou; se `npm test` falhar depois disso, o porte
precisa acompanhar.

## Regras da casa

- `engine/core.mjs` não muda de comportamento sem que os vetores dourados mudem junto.
  Melhoria de modelo entra como parâmetro, depois de medida no backtest.
- Dado que não reconcilia com a classificação publicada não entra no backtest.
- O que é premissa (regulamento ainda não publicado) aparece rotulado como premissa na
  interface e em `docs/DECISOES.md`.

## O que os testes não cobrem

- O site da FPF de verdade: se aceita o runner do GitHub, e como representa um jogo ainda
  não disputado. `test/fixtures/fpf_listar_tabela_a1_2026_r9.json` é uma amostra
  reconstruída do formato observado, não uma captura.
- `data/nomes_fpf.json` só tem os nomes vistos até agora; a primeira coleta lista os demais.
- `data/referencia/` só tem as classificações de 2026.
