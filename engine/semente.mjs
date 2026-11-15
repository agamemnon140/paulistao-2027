// A semente: de onde cada time parte antes da 1ª rodada.
//
// O backtest (eval/RELATORIO.md; docs/DECISOES.md, decisão 17) escolheu a colocação
// nacional do ano anterior, numa escada única A→D, com a amplitude tratada à parte. Este
// módulo é a única implementação: o backtest e o app usam as mesmas funções, para que o
// que vai ao ar seja exatamente o que foi medido.

// Degrau de cada série na escada: o 17º da Série A vale o mesmo que o 1º da B, e assim
// por diante (20 clubes por série, 4 que trocam de lugar).
export const DEGRAU_NAC = { A: 0, B: 16, C: 32, D: 48 };

// Faixa de Elo em que a nota é posta. Só a ORDEM e as distâncias relativas importam: a
// amplitude é dada por `comAmplitude`, não por esta faixa.
export const ELO_MIN = 1400, ELO_MAX = 1750;

const em01 = vals => {
  const mn = Math.min(...vals), mx = Math.max(...vals);
  return vals.map(v => (mx === mn ? 0.5 : (v - mn) / (mx - mn)));
};

// Posto na escada nacional. `nacional` é {clube: {serie, pos}} do ano anterior; quem não
// está lá não jogou série nacional e fica um degrau abaixo do pior do grupo.
export function postosNacionais(times, nacional) {
  const posto = times.map(t => { const r = nacional?.[t]; return r ? DEGRAU_NAC[r.serie] + r.pos : null; });
  const pior = Math.max(0, ...posto.filter(p => p !== null)) + 1;
  return { posto: Object.fromEntries(times.map((t, i) => [t, posto[i] ?? pior])), semSerie: times.filter((_, i) => posto[i] === null) };
}

// Como o posto vira nota (maior = mais forte). `linear` trata cada degrau como igual; `log`
// faz os degraus do topo valerem mais do que os de baixo: a distância entre o 2º e o 8º
// da Série A passa a ser parecida com a que separa o 8º da A do meio da Série B. Foi a
// forma que o backtest escolheu para o A1 (docs/DECISOES.md, 17).
export const FORMAS = { linear: p => -p, raiz: p => -Math.sqrt(p), log: p => -Math.log(p) };

// Nota da semente `brasileiro`.
export function notaBrasileiro(times, nacional, forma = 'linear') {
  if (!FORMAS[forma]) throw new Error(`forma de escada desconhecida: ${forma}`);
  const { posto, semSerie } = postosNacionais(times, nacional);
  return { nota: Object.fromEntries(times.map(t => [t, FORMAS[forma](posto[t])])), semSerie };
}

// Nota -> Elo de partida, na faixa fixa. `inverter` é o controle negativo do backtest.
export function elosDaNota(nota, times, { inverter = false } = {}) {
  const v = em01(times.map(t => (inverter ? -nota[t] : nota[t])));
  return Object.fromEntries(times.map((t, i) => [t, ELO_MIN + (ELO_MAX - ELO_MIN) * v[i]]));
}

// Amplitude: quantas vezes a força de ataque da melhor semente supera a da pior. Com o
// teto de expoente solto, `targetRatio` passa a ser exatamente essa razão.
export const comAmplitude = (cfg, razao) => ({ ...cfg, targetRatio: razao, maxSpread: 50 });
