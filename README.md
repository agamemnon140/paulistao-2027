# paulistao-2027

Simulador Monte Carlo do Campeonato Paulista 2027, Séries A1 e A2. O modelo é o do
[`brasileiro-2026`](https://github.com/agamemnon140/brasileiro-2026), portado para módulos.

As decisões de desenho e os fatos que as sustentam estão em [`docs/DECISOES.md`](docs/DECISOES.md).

## Estado

| Parte | Situação |
|---|---|
| Núcleo do motor (`engine/core.mjs`, `engine/liga.mjs`) | Portado; paridade com o original verificada |
| Histórico 2022–2026, A1 e A2 (`data/fpf/`) | 1.184 jogos da fonte oficial; 2026 fecha com as classificações publicadas |
| Coleta automática pela Action | Bloqueada: a FPF responde 403 ao runner do GitHub |
| Formato do Paulista (potes, mata-mata, A2) | Não feito |
| Backtest das sementes | Não feito |
| Interface, arquivo de previsões, ingestão de 2027 | Não feitos |

## Rodar

Não há dependências; basta Node 22 ou mais novo.

```bash
npm test                                   # paridade com o motor original + leitor da FPF
node scripts/coletar_fpf.mjs --comp A1,A2 --anos 2022-2026
```

## De onde vêm os dados

A fonte são os handlers JSON do site da FPF (ver `scripts/fpf.mjs`). O site aceita
navegador e recusa o runner do GitHub Actions com HTTP 403, então o workflow "Coletar
temporadas da FPF" hoje falha por desenho, e `scripts/coletar_fpf.mjs` só funciona de uma
máquina que a FPF aceite.

O histórico de 2022 a 2026 foi lido dos mesmos handlers dentro de um navegador em
14/11/2026 e trazido como texto compacto, com três hashes calculados no navegador
(`data/fpf/_transferencia/`). `node scripts/decodificar_transferencia.mjs` regenera os
arquivos de temporada a partir desse texto e recusa decodificar se algum hash não bater.

O que esses arquivos não têm: identificador do jogo, data e estádio. Para o backtest, que
usa rodada, mandante, visitante e placar, não fazem falta.

Duas coisas para saber ao ler os dados:

- A FPF devolve o nome atual do clube também nas temporadas antigas (o Oeste aparece como
  Osasco Sporting desde 2022).
- No A1 de 2022 e 2023, os jogos de mata-mata com grupo numérico (`01` a `05`) são do
  Troféu do Interior; a chave principal usa grupos com letra.

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

- Como o handler da FPF representa um jogo ainda não disputado: não havia nenhum para
  observar. `test/fixtures/fpf_listar_tabela_a1_2026_r9.json` é uma amostra reconstruída
  do formato observado, não uma captura.
- As temporadas de 2022 a 2025 fecham por dentro (16 clubes, número certo de jogos por
  clube), mas só 2026 foi reconciliada com classificação publicada por terceiros.
- Pênaltis: o handler de tabela não os traz.
