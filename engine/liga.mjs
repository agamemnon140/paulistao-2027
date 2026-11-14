// Fase de liga: walk-forward e Monte Carlo. Porte fiel do laço de simMC_single /
// backtestSeries / computeCurrentAD do brasileiro-2026, sem as fases finais específicas
// das Séries B/C/D (essas não existem no Paulista; o mata-mata daqui vive em outro módulo).
//
// Diferenças de forma em relação ao original, nenhuma de comportamento:
//   - mc/mf entram como argumento (lá saem de getML(cfg, série));
//   - `rnd` entra como argumento (lá é Math.random global);
//   - zonas (g4/z4) não são calculadas aqui: saem de posF em quem chama.
//
// Convenções herdadas: jogo de tabela = {casa, fora, rodada}; resultado = {c, f, gc, gf, r}.

import { initLeague, calcL, calcProbs, updR, applyDrift, poissonRandom } from './core.mjs';

const estadoInicial = (times, getElo, lg) => {
  const elos = {}, atk = {}, def = {};
  times.forEach(t => {
    elos[t] = getElo(t);
    const i = lg.initAD(elos[t]);
    atk[t] = i.atk;
    def[t] = i.def;
  });
  return { elos, atk, def };
};

// Walk-forward honesto: prevê cada jogo com o estado treinado só nos anteriores, registra
// (previsão, desfecho) e só então atualiza. Sempre em modo ATK/DEF, como no original.
export const backtestSeries = (times, getElo, res, cfg, mc, mf, ak) => {
  const lg = initLeague(times, getElo, cfg);
  const { elos, atk, def } = estadoInicial(times, getElo, lg);
  const sorted = [...res].sort((a, b) => (a.r || 0) - (b.r || 0));
  const preds = [];
  for (const r of sorted) {
    if (elos[r.c] === undefined || elos[r.f] === undefined) continue;
    const { lC, lF } = calcL(atk[r.c], def[r.c], atk[r.f], def[r.f], elos[r.c], elos[r.f], mc, mf, cfg.homeAdv, false);
    const pr = calcProbs(lC, lF);
    preds.push({
      pH: pr.pH / 100,
      pD: pr.pD / 100,
      pA: pr.pA / 100,
      oH: r.gc > r.gf ? 1 : 0,
      oD: r.gc === r.gf ? 1 : 0,
      oA: r.gc < r.gf ? 1 : 0,
      lC,
      lF,
      c: r.c,
      f: r.f,
      r: r.r
    });
    updR(elos, atk, def, r.c, r.f, r.gc, r.gf, lC, lF, cfg, ak, false);
  }
  return preds;
};

// Estado atual (Elo, atk, def) depois dos resultados reais, sem simular nada.
export const computeCurrentAD = (times, getElo, res, cfg, mc, mf, ak) => {
  const lg = initLeague(times, getElo, cfg);
  const { elos, atk, def } = estadoInicial(times, getElo, lg);
  const atkIni = { ...atk }, defIni = { ...def };
  const sorted = [...res].sort((a, b) => (a.r || 0) - (b.r || 0));
  for (const r of sorted) {
    if (elos[r.c] === undefined || elos[r.f] === undefined) continue;
    const { lC, lF } = calcL(atk[r.c], def[r.c], atk[r.f], def[r.f], elos[r.c], elos[r.f], mc, mf, cfg.homeAdv, false);
    updR(elos, atk, def, r.c, r.f, r.gc, r.gf, lC, lF, cfg, ak, false);
  }
  return { elo: elos, atk, def, atkIni, defIni };
};

// Uma temporada simulada da fase de liga. Devolve a classificação e o estado final.
//
// Três propriedades do original que valem ser ditas, porque não são óbvias:
//   1. o drift entra UMA vez por rodada futura, antes dos jogos dela, e só em rodadas
//      posteriores à última rodada com resultado real;
//   2. só jogo REAL atualiza atk/def/Elo; jogo simulado não ensina nada ao modelo dentro
//      da simulação (a incerteza de longo prazo vem do drift);
//   3. o desempate é P, V, SG, GP e depois a ordem de `times` (sort estável). O desempate
//      do regulamento da FPF (cartões, sorteio) é aplicado por quem chama, via `desempate`.
export const simLigaUma = ({ times, getElo, tab, res, cfg, mc, mf, ak, eo = false, lg, rnd = Math.random, initialAD, desempate }) => {
  const st = {}, el = {}, at = {}, df = {};
  times.forEach(t => {
    st[t] = { P: 0, J: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0 };
    if (initialAD) {
      el[t] = initialAD.el[t];
      at[t] = initialAD.at[t];
      df[t] = initialAD.df[t];
    } else {
      el[t] = getElo(t);
      const i = lg.initAD(el[t]);
      at[t] = i.atk;
      df[t] = i.def;
    }
  });
  let lastDR = 0;
  const maxRR = Math.max(0, ...res.map(r => r.r));
  for (const j of tab) {
    const { casa: c, fora: f, rodada: rd } = j;
    if (!st[c] || !st[f]) continue;
    if (rd > lastDR && rd > maxRR && cfg.drift > 0) {
      lastDR = rd;
      applyDrift(times, el, at, df, cfg.drift, rnd);
    }
    const real = res.find(r => r.c === c && r.f === f && (r.r === rd || r.r === 0));
    let gc, gf;
    if (real) {
      gc = real.gc;
      gf = real.gf;
    } else {
      const { lC, lF } = calcL(at[c], df[c], at[f], df[f], el[c], el[f], mc, mf, cfg.homeAdv, eo, cfg.c0Log);
      gc = poissonRandom(lC, rnd);
      gf = poissonRandom(lF, rnd);
    }
    st[c].J++;
    st[f].J++;
    st[c].GP += gc;
    st[c].GC += gf;
    st[f].GP += gf;
    st[f].GC += gc;
    if (gc > gf) {
      st[c].V++;
      st[c].P += 3;
      st[f].D++;
    } else if (gc === gf) {
      st[c].E++;
      st[f].E++;
      st[c].P++;
      st[f].P++;
    } else {
      st[f].V++;
      st[f].P += 3;
      st[c].D++;
    }
    if (real) {
      const { lC, lF } = calcL(at[c], df[c], at[f], df[f], el[c], el[f], mc, mf, cfg.homeAdv, eo, cfg.c0Log);
      updR(el, at, df, c, f, gc, gf, lC, lF, cfg, ak, eo);
    }
  }
  const linhas = times.map(t => ({ time: t, ...st[t], SG: st[t].GP - st[t].GC }));
  const cmp = (a, b) => b.P - a.P || b.V - a.V || b.SG - a.SG || b.GP - a.GP;
  const cl = desempate ? desempate(linhas, cmp, rnd) : linhas.sort(cmp);
  return { cl, el, at, df };
};

const pctl = (arr, q) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length * q)] || 0;
};
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

// Monte Carlo da fase de liga. Mesma saída por time que o simMC_finalize do original,
// menos os campos de zona.
export const simMCLiga = ({ times, getElo, tab, res, cfg, mc, mf, nS, ak, eo = false, rnd = Math.random, desempate }) => {
  const lg = initLeague(times, getElo, cfg);
  const titulo = {}, pts = {}, posF = {}, elFinal = {}, atFinal = {}, dfFinal = {}, initAD = {};
  const ptsAtPos = Array.from({ length: times.length }, () => []);
  times.forEach(t => {
    initAD[t] = lg.initAD(getElo(t));
    titulo[t] = 0;
    pts[t] = [];
    posF[t] = new Array(times.length).fill(0);
    elFinal[t] = [];
    atFinal[t] = [];
    dfFinal[t] = [];
  });
  for (let sim = 0; sim < nS; sim++) {
    const { cl, el, at, df } = simLigaUma({ times, getElo, tab, res, cfg, mc, mf, ak, eo, lg, rnd, desempate });
    cl.forEach((c, i) => {
      pts[c.time].push(c.P);
      posF[c.time][i]++;
      ptsAtPos[i].push(c.P);
      if (i === 0) titulo[c.time]++;
    });
    times.forEach(t => {
      elFinal[t].push(el[t]);
      atFinal[t].push(at[t]);
      dfFinal[t].push(df[t]);
    });
  }
  return {
    probs: times.map(t => ({
      time: t,
      titulo: titulo[t] / nS * 100,
      mediaPts: pts[t].reduce((s, p) => s + p, 0) / nS,
      medianPts: pctl(pts[t], 0.5),
      p10Pts: pctl(pts[t], 0.1),
      p90Pts: pctl(pts[t], 0.9),
      posF: posF[t].map(v => v / nS * 100),
      ptsSamples: pts[t],
      eloFinal: Math.round(avg(elFinal[t])),
      atk: initAD[t].atk,
      def: initAD[t].def,
      atkFinal: avg(atFinal[t]),
      defFinal: avg(dfFinal[t])
    })).sort((a, b) => b.mediaPts - a.mediaPts),
    ptsNaPosicao: ptsAtPos.map(a => ({ p10: pctl(a, 0.1), p50: pctl(a, 0.5), p90: pctl(a, 0.9) })),
    nSims: nS
  };
};
