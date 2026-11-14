// Monta eval/RELATORIO.md a partir do resultado do backtest. Só tabelas e o método: a
// leitura (o que foi decidido com estes números) fica em docs/DECISOES.md, datada.

const f = (x, n = 4) => x.toFixed(n).replace('.', ',');
const pp = x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(100 * x).toFixed(1).replace('.', ',');
const s4 = x => (x > 0 ? '+' : x < 0 ? '−' : '') + f(Math.abs(x));
const z = x => (x < 0 ? '−' : '') + Math.abs(x).toFixed(2).replace('.', ',');
const ic = d => `${s4(d.dif)} [${s4(d.ic95[0])}; ${s4(d.ic95[1])}]`;
const marca = d => (d.ic95[1] < 0 || d.ic95[0] > 0 ? ' ✱' : '');
const tabela = (cab, linhas) => [`| ${cab.join(' | ')} |`, `|${cab.map(() => '---').join('|')}|`, ...linhas.map(l => `| ${l.join(' | ')} |`)].join('\n');
const NOME = { divisao: 'divisão', brasileiro: 'brasileiro', paulista: 'paulista', composta: 'composta' };

export function relatorio(S) {
  const o = [];
  o.push(`# Backtest das sementes: Paulista A1 e A2, ${S.escolha[0]}–${S.confirmacao.at(-1)}

Gerado por \`node eval/backtest.mjs\` a partir de \`data/\`; não editar à mão
(\`test/eval.test.mjs\` falha se este arquivo e o código divergirem). A leitura destes
números e o que foi decidido com eles estão em \`docs/DECISOES.md\`.

## Método

- **Pergunta.** Com que ordem e com que amplitude semear os times antes da 1ª rodada.
- **Previsão.** Walk-forward com o motor de \`engine/\`: cada jogo é previsto com o estado
  treinado só nos jogos anteriores da mesma temporada, depois entra na atualização.
- **Sementes** (só informação anterior ao campeonato do ano Y):
  \`divisão\` = série nacional que o clube disputa em Y; \`brasileiro\` = colocação nacional
  em Y−1 na escada A→D; \`paulista\` = colocação na 1ª fase estadual de Y−1 na escada
  A1→A3; \`composta\` = média das duas últimas; piso = todos iguais.
- **Amplitude** (\`razão\`): quantas vezes a força de ataque da melhor semente supera a da
  pior. A defesa espelha, então o gol esperado do melhor contra o pior, em campo neutro,
  vale razão² vezes o do pior contra o melhor. O motor do Brasileirão usa ${f(S.razaoHerdada, 1)}.
- **Protocolo.** Escolha em ${S.escolha[0]}–${S.escolha.at(-1)}, por divisão; ${S.confirmacao[0]} só confirma, com a razão já
  escolhida. A coluna "cinco anos" junta os dois conjuntos e serve só de descrição.
- **Métrica.** Brier de três desfechos (menor é melhor). Δ é a diferença pareada, jogo a
  jogo, contra o piso; IC95 por bootstrap pareado (2.000 reamostragens, semente fixa).
  ✱ marca IC que exclui zero.
- **Gols de base.** Liga ${f(S.golsPadrao.liga.total, 2)} por jogo com ${f(S.golsPadrao.liga.pesoCasa, 2)} para o mandante; mata-mata ${f(S.golsPadrao.mataMata.total, 2)} com ${f(S.golsPadrao.mataMata.pesoCasa, 2)}.

## Limites

- Duas candidatas da decisão 9 **não foram rodadas**: RNC (falta a série histórica do
  ranking de 2022 a 2025) e o estado final do modelo no Paulista anterior (precisa de um
  parâmetro de escala entre divisões que este protocolo não ajusta).
- São 4 sementes × ${S.razoes.length} razões por divisão; os IC não são corrigidos para comparações múltiplas.
- O bootstrap trata os jogos como independentes; o z dos vieses trata as probabilidades
  como fixas. Os dois subestimam um pouco a incerteza.
- A confirmação é uma temporada só (${S.divisoes.A1.confirmacao.piso.n} jogos no A1, ${S.divisoes.A2.confirmacao.piso.n} na A2).
- A ordem dos jogos é a da rodada, não a da data (a transferência não trouxe datas): jogo
  adiado entra na rodada nominal. O Troféu do Interior de 2022 e 2023 está nos jogos do A1.
`);

  for (const [sigla, D] of Object.entries(S.divisoes)) {
    const m = D.medido;
    o.push(`## ${sigla}

Piso (todos iguais): Brier ${f(D.piso.brier)} em ${D.piso.n} jogos na escolha; ${f(D.confirmacao.piso.brier)} em ${D.confirmacao.piso.n} jogos em ${S.confirmacao[0]}.

### O que os jogos dizem, sem modelo

${tabela(['recorte', 'jogos', 'gols/jogo', 'fatia de gols do mandante', 'mandante', 'empate', 'visitante'], [
      [`1ª fase ${S.escolha[0]}–${S.escolha.at(-1)}`, m.primeiraFaseEscolha],
      [`1ª fase ${S.confirmacao[0]}`, m.primeiraFaseConfirmacao],
      [`mata-mata ${S.escolha[0]}–${S.confirmacao[0]}`, m.mataMata]
    ].map(([r, x]) => [r, x.n, f(x.gols, 2), f(x.pesoCasa, 3), pp(x.casa).slice(1) + '%', pp(x.empate).slice(1) + '%', pp(x.fora).slice(1) + '%']))}

### Sementes, cada uma na razão de menor Brier na escolha

${tabela(['semente', 'razão', 'Brier', 'Δ contra o piso', 'anos que batem o piso', 'razão que cada ano escolheria', `Δ em ${S.confirmacao[0]}`, 'Δ nos cinco anos', `Brier com a razão ${f(S.razaoHerdada, 1)}`],
      S.candidatas.map(c => {
        const x = D.melhor[c], k = D.confirmacao[c];
        return [NOME[c], f(x.razao, 2), f(x.brier), ic(x.contraPiso) + marca(x.contraPiso), `${D.porAno[c].filter(a => a.dif < 0).length}/${S.escolha.length}`, D.razaoPorAno[c].map(r => f(r, 2)).join(' · '), ic(k.contraPiso) + marca(k.contraPiso), ic(D.conjunto[c]) + marca(D.conjunto[c]), f(x.herdada)];
      }))}

Δ por ano, contra o piso, na razão escolhida:

${tabela(['semente', ...S.escolha], S.candidatas.map(c => [NOME[c], ...D.porAno[c].map(a => s4(a.dif))]))}

### Brier por razão (escolha)

${tabela(['razão', ...S.candidatas.map(c => NOME[c])], S.razoes.map((r, i) => [f(r, 2), ...S.candidatas.map(c => f(D.curvas[c][i].brier))]))}

### Semente \`brasileiro\` em cada razão

${tabela(['razão', 'Δ na escolha', 'anos que batem o piso', `Δ em ${S.confirmacao[0]}`, 'Δ nos cinco anos'],
      D.curvas.brasileiro.filter(p => p.razao > 1 && p.razao <= 3).map(p => [f(p.razao, 2), ic(p.contraPiso) + marca(p.contraPiso), `${p.anosQueBatemOPiso}/${S.escolha.length}`, ic(p.confirmacao) + marca(p.confirmacao), ic(p.cincoAnos) + marca(p.cincoAnos)]))}

### Comparações pareadas entre sementes

Diferença de Brier (primeira − segunda), cada uma na sua razão; negativo favorece a primeira.

${tabela(['par', 'escolha', `${S.confirmacao[0]}`], Object.entries(D.pares).map(([k, v]) => [k.split(' − ').map(c => NOME[c]).join(' − '), ic(v.escolha) + marca(v.escolha), ic(v.confirmacao) + marca(v.confirmacao)]))}

Controle negativo (semente \`brasileiro\` invertida, razão 1,50, contra o piso): ${ic(D.controleInvertido)}${marca(D.controleInvertido)}.

### Mando na 1ª fase

Semente \`${D.mando.semente}\`, razão ${f(D.mando.razao, 2)}. Viés = previsto − observado, em pontos percentuais; z entre parênteses.

${tabela(['peso do mandante', 'viés mandante', 'viés empate', 'viés visitante', 'Brier', `viés mandante ${S.confirmacao[0]}`, `Brier ${S.confirmacao[0]}`],
      D.mando.varredura.map(v => [f(v.pesoCasa, 2) + (v.pesoCasa === D.mando.padrao.pesoCasa ? ' (padrão)' : ''), `${pp(v.escolha.viesCasa)} (${z(v.escolha.zCasa)})`, `${pp(v.escolha.viesEmpate)} (${z(v.escolha.zEmpate)})`, pp(v.escolha.viesFora), f(v.escolha.brier), `${pp(v.confirmacao.viesCasa)} (${z(v.confirmacao.zCasa)})`, f(v.confirmacao.brier)]))}

### Mando no mata-mata (${D.mando.mataMata[0].n} jogos, ${S.escolha[0]}–${S.confirmacao[0]}; só informa)

${tabela(['variante', 'gols/jogo', 'peso do mandante', 'viés mandante', 'viés empate', 'Brier'],
      D.mando.mataMata.map(v => [v.rotulo, f(v.total, 2), f(v.pesoCasa, 2), `${pp(v.viesCasa)} (${z(v.zCasa)})`, `${pp(v.viesEmpate)} (${z(v.zEmpate)})`, f(v.brier)]))}

### Sensibilidade e cobertura

Brier na escolha por preset de atualização (semente \`${D.mando.semente}\`): ${Object.entries(D.presets).map(([k, v]) => `${k} ${f(v)}`).join(', ')}.

Clubes sem série nacional no ano anterior: ${Object.entries(D.cobertura).map(([a, c]) => `${a}: ${c.semSerieNacionalNoAnoAnterior}`).join(', ')} (de 16). Clubes fora da escada estadual: ${Object.values(D.cobertura).every(c => !c.semEscadaEstadual.length) ? 'nenhum' : Object.entries(D.cobertura).filter(([, c]) => c.semEscadaEstadual.length).map(([a, c]) => `${a}: ${c.semEscadaEstadual.join(', ')}`).join('; ')}.
`);
  }
  return o.join('\n');
}
