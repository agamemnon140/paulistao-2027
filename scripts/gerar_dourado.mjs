// Gera os vetores dourados do teste de paridade a partir do MOTOR ORIGINAL.
//
//   node scripts/gerar_dourado.mjs /caminho/para/brasileiro-2026/index.html [commit]
//
// Lê o index.html do brasileiro-2026, recorta a engine pelos mesmos marcadores textuais
// que o scripts/engine.cjs de lá usa, avalia em memória e grava em test/dourado/ as
// entradas e as saídas de cada função. O teste de paridade (test/paridade.test.mjs) roda
// o PORTE sobre as mesmas entradas e exige igualdade a 1e-12.
//
// Este script só LÊ o outro repositório. Rode de novo quando o motor de lá mudar e você
// quiser que o porte acompanhe; o diff de test/dourado/ mostra exatamente o que mudou.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HTML = process.argv[2];
const COMMIT = process.argv[3] || 'desconhecido';
if (!HTML) {
  console.error('uso: node scripts/gerar_dourado.mjs <index.html do brasileiro-2026> [commit]');
  process.exit(2);
}
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test', 'dourado');

const START = '// SIMULADOR UNIFICADO BRASILEIR';
const END = 'ReactDOM.createRoot';
const SHIM = 'var localStorage={getItem:function(){return null;},setItem:function(){},removeItem:function(){}};\n';
const html = fs.readFileSync(HTML, 'utf8');
const i = html.indexOf(START);
const j = html.indexOf(END, i);
if (i < 0 || j < 0) throw new Error('marcadores da engine não encontrados no HTML');
const NOMES = ['poissonProb', 'poissonRandom', 'suavLog', 'boxMuller', 'applyDrift', 'calcProbs',
  'initLeague', 'calcL', 'updR', 'getML', 'DEFAULT_CFG', 'backtestSeries', 'computeCurrentAD',
  'simMC', 'parseTab', 'SA_TAB', 'SA_NM', 'SA_DATES', 'SA_RANKING', 'SA_RES'];
const E = new Function(SHIM + html.slice(i, j) + '\n;return {' + NOMES.join(',') + '};')();

// Mesmo gerador de eval/lib/longterm.cjs (`semear`) e de engine/rng.mjs.
function semear(seed) {
  const orig = Math.random;
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => { Math.random = orig; };
}
const comSemente = (seed, fn) => { const rest = semear(seed); try { return fn(); } finally { rest(); } };
const clone = o => JSON.parse(JSON.stringify(o));
const cfgBase = clone(E.DEFAULT_CFG);

// ---------------------------------------------------------------- núcleo determinístico
const nucleo = { origem: { arquivo: path.basename(HTML), commit: COMMIT }, cfg: cfgBase };

nucleo.poissonProb = [];
for (const l of [0.15, 0.2, 0.7, 1.3, 2.5, 4.5]) for (let k = 0; k <= 9; k++) nucleo.poissonProb.push({ l, k, v: E.poissonProb(l, k) });

nucleo.suavLog = [-0.99, -0.5, -0.01, 0, 0.3, 1, 2.7, 9].map(s => ({ s, v: E.suavLog(s) }));

nucleo.calcProbs = [];
for (const lC of [0.2, 0.6, 1.2, 1.63, 2.4, 4.5]) for (const lF of [0.15, 0.5, 0.87, 1.4, 4.0]) nucleo.calcProbs.push({ lC, lF, v: E.calcProbs(lC, lF) });

const timesA = Object.keys(E.SA_RANKING);
const elosA = Object.fromEntries(timesA.map(t => [t, E.SA_RANKING[t].elo]));
const conjuntos = {
  serieA: elosA,
  plano: { a: 1340, b: 1340, c: 1340, d: 1340 },
  estreito: { a: 1296, b: 1302, c: 1310, d: 1280, e: 1305 },
  largo: { a: 1700, b: 1500, c: 1340, d: 1200, e: 1255, f: 1310 }
};
const variacoes = {
  padrao: {},
  ratioBaixo: { targetRatio: 1.5 },
  ratioAlto: { targetRatio: 8.0 },
  tetoBaixo: { maxSpread: 2.0 }
};
nucleo.initLeague = [];
for (const [nc, elos] of Object.entries(conjuntos)) for (const [nv, extra] of Object.entries(variacoes)) {
  const cfg = { ...cfgBase, ...extra };
  const times = Object.keys(elos);
  const lg = E.initLeague(times, t => elos[t], cfg);
  nucleo.initLeague.push({
    conjunto: nc, variacao: nv, elos, extra,
    mean: lg.mean, spread: lg.spread, aA: lg.aA, aD: lg.aD,
    initAD: Object.fromEntries(times.map(t => [t, lg.initAD(elos[t])]))
  });
}

const mlA = E.getML(cfgBase, 'A');
nucleo.calcL = [];
for (const aC of [0.3, 0.8, 1.0, 1.7, 3.0]) for (const dF of [0.3, 0.9, 1.4, 3.0]) for (const [aF, dC] of [[1.0, 1.0], [0.4, 2.2], [2.6, 0.35]]) {
  nucleo.calcL.push({ args: [aC, dC, aF, dF, 1500, 1500, mlA.mc, mlA.mf, 100, false, null], v: E.calcL(aC, dC, aF, dF, 1500, 1500, mlA.mc, mlA.mf, 100, false, null) });
}
for (const eC of [1200, 1340, 1500, 1700]) for (const eF of [1255, 1470, 1640]) for (const c0 of [null, cfgBase.c0Log, { ...cfgBase.c0Log, on: true }]) {
  nucleo.calcL.push({ args: [1, 1, 1, 1, eC, eF, mlA.mc, mlA.mf, 100, true, c0], v: E.calcL(1, 1, 1, 1, eC, eF, mlA.mc, mlA.mf, 100, true, c0) });
}

// updR: uma sequência de jogos sobre um estado pequeno, em cada preset e nos dois modos.
const elosU = conjuntos.largo;
const timesU = Object.keys(elosU);
const jogosU = [['a', 'b', 2, 0], ['c', 'd', 1, 1], ['e', 'f', 0, 3], ['b', 'c', 5, 0], ['d', 'a', 0, 0], ['f', 'a', 1, 4],
  ['a', 'e', 0, 1], ['b', 'd', 2, 2], ['c', 'f', 7, 1], ['e', 'b', 1, 0], ['d', 'f', 3, 2], ['a', 'c', 0, 0]];
nucleo.updR = [];
for (const ak of Object.keys(cfgBase.alphas)) for (const eo of [false, true]) {
  const lg = E.initLeague(timesU, t => elosU[t], cfgBase);
  const el = { ...elosU }, at = {}, df = {};
  timesU.forEach(t => { const x = lg.initAD(elosU[t]); at[t] = x.atk; df[t] = x.def; });
  const passos = [];
  for (const [c, f, gc, gf] of jogosU) {
    const { lC, lF } = E.calcL(at[c], df[c], at[f], df[f], el[c], el[f], mlA.mc, mlA.mf, cfgBase.homeAdv, eo, cfgBase.c0Log);
    E.updR(el, at, df, c, f, gc, gf, lC, lF, cfgBase, ak, eo);
    passos.push({ lC, lF, el: { ...el }, at: { ...at }, df: { ...df } });
  }
  nucleo.updR.push({ ak, eo, elos: elosU, jogos: jogosU, passos });
}

// ------------------------------------------------------------------ núcleo estocástico
nucleo.poissonRandom = [0.2, 1.1, 2.5, 4.5, 0, -1].map((l, k) => ({
  l, seed: 700 + k, v: comSemente(700 + k, () => Array.from({ length: 60 }, () => E.poissonRandom(l)))
}));
nucleo.boxMuller = { seed: 9, v: comSemente(9, () => Array.from({ length: 40 }, () => E.boxMuller())) };
nucleo.applyDrift = [15, 40, 400].map((sigma, k) => comSemente(50 + k, () => {
  const el = { ...elosU }, at = {}, df = {};
  timesU.forEach((t, n) => { at[t] = 0.5 + 0.4 * n; df[t] = 2.6 - 0.4 * n; });
  const antes = { el: { ...el }, at: { ...at }, df: { ...df } };
  for (let r = 0; r < 5; r++) E.applyDrift(timesU, el, at, df, sigma);
  return { sigma, seed: 50 + k, vezes: 5, times: timesU, antes, depois: { el, at, df } };
}));

// --------------------------------------------------------------- liga (Série A embutida)
const tab = E.parseTab(E.SA_TAB, E.SA_NM, E.SA_DATES).map(g => ({ casa: g.casa, fora: g.fora, rodada: g.rodada }));
const res = E.SA_RES.map(r => ({ c: r.c, f: r.f, gc: r.gc, gf: r.gf, r: r.r }));
const maxR = Math.max(0, ...res.map(r => r.r));

nucleo.walkforward = Object.keys(cfgBase.alphas).map(ak => ({
  ak,
  preds: E.backtestSeries(timesA, t => elosA[t], res, cfgBase, 'A', ak),
  atual: (() => { const x = E.computeCurrentAD(timesA, t => elosA[t], res, cfgBase, 'A', ak, false); return { elo: x.elo, atk: x.atk, def: x.def }; })()
}));

const liga = {
  origem: nucleo.origem,
  entradas: { times: timesA, elos: elosA, tab, res, cfg: cfgBase, ml: mlA, rodadasComResultado: maxR },
  casos: []
};
const casos = [
  { seed: 11, corte: 0, nS: 120, ak: 'conservador', drift: 15 },
  { seed: 23, corte: Math.min(12, maxR), nS: 120, ak: 'conservador', drift: 15 },
  { seed: 37, corte: maxR, nS: 120, ak: 'base', drift: 15 },
  { seed: 41, corte: Math.min(6, maxR), nS: 120, ak: 'agressivo', drift: 0 },
  { seed: 53, corte: Math.min(20, maxR), nS: 80, ak: 'conservador', drift: 40 }
];
for (const c of casos) {
  const cfg = { ...cfgBase, drift: c.drift };
  const conhecidos = res.filter(x => x.r <= c.corte);
  const ranking = Object.fromEntries(timesA.map(t => [t, { elo: elosA[t] }]));
  const out = comSemente(c.seed, () => E.simMC(timesA, ranking, tab, conhecidos, cfg, 'A', c.nS, c.ak, false));
  liga.casos.push({
    ...c,
    probs: out.probs.map(p => ({
      time: p.time, titulo: p.titulo, mediaPts: p.mediaPts, medianPts: p.medianPts, p10Pts: p.p10Pts,
      p90Pts: p.p90Pts, posF: p.posF, eloFinal: p.eloFinal, atk: p.atk, def: p.def,
      atkFinal: p.atkFinal, defFinal: p.defFinal
    }))
  });
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'nucleo.json'), JSON.stringify(nucleo));
fs.writeFileSync(path.join(OUT, 'liga.json'), JSON.stringify(liga));
console.log(`dourado gravado em ${OUT}: núcleo ${nucleo.walkforward[0].preds.length} jogos no walk-forward, ` +
  `liga ${liga.casos.length} casos, ${tab.length} jogos de tabela, ${res.length} resultados (até a rodada ${maxR}).`);
