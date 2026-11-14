// Paridade com o motor original do brasileiro-2026.
//
// Os vetores em test/dourado/ foram produzidos pelo motor ORIGINAL (scripts/gerar_dourado.mjs).
// Este teste roda o PORTE sobre as mesmas entradas e exige igualdade a 1e-12 — o mesmo
// critério do autoteste do eval/ de lá. Se algum falhar, o porte deixou de ser o modelo
// que o REPORT avaliou.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as M from '../engine/core.mjs';
import { backtestSeries, computeCurrentAD, simMCLiga } from '../engine/liga.mjs';
import { mulberry32 } from '../engine/rng.mjs';
import { CFG_MODELO } from '../engine/config.mjs';

const ler = nome => JSON.parse(fs.readFileSync(fileURLToPath(new URL('./dourado/' + nome, import.meta.url)), 'utf8'));
const N = ler('nucleo.json');
const L = ler('liga.json');
const TOL = 1e-12;

// Compara estruturas inteiras; números com tolerância relativa, o resto por igualdade.
function igual(obtido, esperado, caminho = '') {
  if (typeof esperado === 'number') {
    assert.equal(typeof obtido, 'number', `${caminho}: esperado número`);
    const d = Math.abs(obtido - esperado), esc = Math.max(1, Math.abs(esperado));
    assert.ok(d <= TOL * esc, `${caminho}: obtido ${obtido}, esperado ${esperado} (Δ ${d})`);
  } else if (Array.isArray(esperado)) {
    assert.ok(Array.isArray(obtido), `${caminho}: esperado array`);
    assert.equal(obtido.length, esperado.length, `${caminho}: tamanho`);
    esperado.forEach((e, k) => igual(obtido[k], e, `${caminho}[${k}]`));
  } else if (esperado && typeof esperado === 'object') {
    for (const k of Object.keys(esperado)) igual(obtido[k], esperado[k], `${caminho}.${k}`);
  } else {
    assert.equal(obtido, esperado, caminho);
  }
}

test('config do modelo é a do original (menos os lambdas por série)', () => {
  const { lambdas, ...resto } = N.cfg;
  assert.deepEqual(CFG_MODELO, resto);
});

test('poissonProb, suavLog, calcProbs', () => {
  for (const c of N.poissonProb) igual(M.poissonProb(c.l, c.k), c.v, `poissonProb(${c.l},${c.k})`);
  for (const c of N.suavLog) igual(M.suavLog(c.s), c.v, `suavLog(${c.s})`);
  for (const c of N.calcProbs) igual(M.calcProbs(c.lC, c.lF), c.v, `calcProbs(${c.lC},${c.lF})`);
});

test('initLeague: média, spread e atk/def iniciais em quatro conjuntos de semente', () => {
  for (const c of N.initLeague) {
    const cfg = { ...N.cfg, ...c.extra };
    const times = Object.keys(c.elos);
    const lg = M.initLeague(times, t => c.elos[t], cfg);
    const rot = `initLeague[${c.conjunto}/${c.variacao}]`;
    igual({ mean: lg.mean, spread: lg.spread, aA: lg.aA, aD: lg.aD }, { mean: c.mean, spread: c.spread, aA: c.aA, aD: c.aD }, rot);
    for (const t of times) igual(lg.initAD(c.elos[t]), c.initAD[t], `${rot}.${t}`);
  }
});

test('calcL nos dois modos, incluindo os limites de corte', () => {
  for (const c of N.calcL) igual(M.calcL(...c.args), c.v, `calcL(${JSON.stringify(c.args)})`);
});

test('updR passo a passo, três presets, dois modos', () => {
  for (const c of N.updR) {
    const times = Object.keys(c.elos);
    const lg = M.initLeague(times, t => c.elos[t], N.cfg);
    const ml = M.mlDe(N.cfg.lambdas.A);
    const el = { ...c.elos }, at = {}, df = {};
    times.forEach(t => { const x = lg.initAD(c.elos[t]); at[t] = x.atk; df[t] = x.def; });
    c.jogos.forEach(([a, b, gc, gf], k) => {
      const { lC, lF } = M.calcL(at[a], df[a], at[b], df[b], el[a], el[b], ml.mc, ml.mf, N.cfg.homeAdv, c.eo, N.cfg.c0Log);
      M.updR(el, at, df, a, b, gc, gf, lC, lF, N.cfg, c.ak, c.eo);
      igual({ lC, lF, el, at, df }, c.passos[k], `updR[${c.ak}/eo=${c.eo}] passo ${k}`);
    });
  }
});

test('sorteios: mesma semente, mesma sequência (poissonRandom, boxMuller, applyDrift)', () => {
  for (const c of N.poissonRandom) {
    const rnd = mulberry32(c.seed);
    igual(Array.from({ length: c.v.length }, () => M.poissonRandom(c.l, rnd)), c.v, `poissonRandom(${c.l})`);
  }
  const rb = mulberry32(N.boxMuller.seed);
  igual(Array.from({ length: N.boxMuller.v.length }, () => M.boxMuller(rb)), N.boxMuller.v, 'boxMuller');
  for (const c of N.applyDrift) {
    const rnd = mulberry32(c.seed);
    const el = { ...c.antes.el }, at = { ...c.antes.at }, df = { ...c.antes.df };
    for (let r = 0; r < c.vezes; r++) M.applyDrift(c.times, el, at, df, c.sigma, rnd);
    igual({ el, at, df }, c.depois, `applyDrift(σ=${c.sigma})`);
  }
});

test('walk-forward na Série A embutida: previsões jogo a jogo e estado final', () => {
  const { times, elos, res, cfg, ml } = L.entradas;
  for (const c of N.walkforward) {
    const preds = backtestSeries(times, t => elos[t], res, cfg, ml.mc, ml.mf, c.ak);
    assert.equal(preds.length, c.preds.length);
    igual(preds, c.preds, `backtestSeries[${c.ak}]`);
    igual(computeCurrentAD(times, t => elos[t], res, cfg, ml.mc, ml.mf, c.ak), c.atual, `computeCurrentAD[${c.ak}]`);
  }
});

test('Monte Carlo da liga: simulações inteiras coincidem com o simMC original', () => {
  const { times, elos, tab, res, cfg, ml } = L.entradas;
  for (const c of L.casos) {
    const out = simMCLiga({
      times, getElo: t => elos[t], tab, res: res.filter(x => x.r <= c.corte),
      cfg: { ...cfg, drift: c.drift }, mc: ml.mc, mf: ml.mf, nS: c.nS, ak: c.ak, eo: false, rnd: mulberry32(c.seed)
    });
    const rot = `simMC[seed=${c.seed}, corte=${c.corte}, ${c.ak}, drift=${c.drift}]`;
    assert.deepEqual(out.probs.map(p => p.time), c.probs.map(p => p.time), `${rot}: ordem dos times`);
    igual(out.probs, c.probs, rot);
  }
});
