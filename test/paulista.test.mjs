// Formato do Paulista: sorteio de mando, rodadas provisórias, regulamento e Monte Carlo.
// As regras são conferidas contra o que ACONTECEU em 2026 (dados da FPF em data/fpf/).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rodadasProvisorias, sortearMandos, paresQuartas, paresSemis, somarCampanha, simTemporada, simMCPaulista, dificuldadeDoSorteio } from '../engine/paulista.mjs';
import { initLeague } from '../engine/core.mjs';
import { CFG_MODELO } from '../engine/config.mjs';
import { mulberry32 } from '../engine/rng.mjs';
import { classificar } from '../scripts/fpf.mjs';

const ler = rel => JSON.parse(fs.readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
const A1 = ler('../data/2027/a1.json'), A2 = ler('../data/2027/a2.json');
const chavePar = (a, b) => [a, b].sort().join('|');
const iguais = () => 1500;

test('dados de 2027: 16 times, pares únicos; no A1 cada time pega os 3 do próprio pote', () => {
  for (const comp of [A1, A2]) {
    assert.equal(comp.times.length, 16);
    assert.equal(new Set(comp.confrontos.map(([a, b]) => chavePar(a, b))).size, comp.confrontos.length);
    for (const [a, b] of comp.confrontos) assert.ok(comp.times.includes(a) && comp.times.includes(b) && a !== b);
  }
  assert.equal(A1.confrontos.length, 64);
  assert.equal(A2.confrontos.length, 120);
  const pote = Object.fromEntries(Object.entries(A1.potes).flatMap(([p, ts]) => ts.map(t => [t, p])));
  for (const t of A1.times) {
    const adv = A1.confrontos.filter(c => c.includes(t)).map(c => (c[0] === t ? c[1] : c[0]));
    assert.equal(adv.length, 8, t);
    assert.equal(adv.filter(o => pote[o] === pote[t]).length, 3, `${t}: adversários do próprio pote`);
  }
});

test('rodadas provisórias: cada time joga exatamente uma vez por rodada', () => {
  for (const [comp, nRod] of [[A1, 8], [A2, 15]]) {
    const rodadaDe = rodadasProvisorias(comp.times, comp.confrontos, mulberry32(3));
    for (let r = 1; r <= nRod; r++) {
      const emCampo = comp.confrontos.filter((_, k) => rodadaDe[k] === r).flat();
      assert.equal(emCampo.length, 16, `${comp.sigla} rodada ${r}`);
      assert.equal(new Set(emCampo).size, 16, `${comp.sigla} rodada ${r}: time repetido`);
    }
  }
});

test('mando sorteado: todo confronto uma vez, mandos equilibrados, 50/50 por confronto', () => {
  for (const [comp, permitidos] of [[A1, [4]], [A2, [7, 8]]]) {
    const rnd = mulberry32(11), vezesCasa = new Map(), N = 600;
    for (let s = 0; s < N; s++) {
      const jogos = sortearMandos(comp.times, comp.confrontos, rnd);
      assert.deepEqual(jogos.map(([a, b]) => chavePar(a, b)), comp.confrontos.map(([a, b]) => chavePar(a, b)));
      const mandos = Object.fromEntries(comp.times.map(t => [t, 0]));
      jogos.forEach(([casa], k) => {
        mandos[casa]++;
        if (casa === comp.confrontos[k][0]) vezesCasa.set(k, (vezesCasa.get(k) || 0) + 1);
      });
      for (const t of comp.times) assert.ok(permitidos.includes(mandos[t]), `${comp.sigla} ${t}: ${mandos[t]} mandos`);
    }
    // 600 sorteios: 50% ± 5 desvios-padrão (≈ 10 pontos) em cada confronto.
    for (let k = 0; k < comp.confrontos.length; k++) {
      const f = (vezesCasa.get(k) || 0) / N;
      assert.ok(f > 0.39 && f < 0.61, `${comp.sigla} ${comp.confrontos[k].join(' x ')}: mando ${f}`);
    }
  }
});

test('regulamento contra 2026: quartas, semis e mando da final como aconteceram', () => {
  const real = ler('../data/fpf/A1/2026.json').jogos;
  const fase1 = classificar(real.filter(j => j.numFase === 1));
  // Quartas reais: Novorizontino x Santos, Palmeiras x Capivariano, Bragantino x São Paulo, Portuguesa x Corinthians.
  const q = paresQuartas(fase1.slice(0, 8).map(x => x.time));
  const quartasReais = real.filter(j => j.numFase === 2);
  assert.deepEqual(q.map(p => chavePar(p.melhor, p.pior)).sort(), quartasReais.map(j => chavePar(j.casa, j.fora)).sort());
  for (const p of q) assert.ok(quartasReais.some(j => j.casa === p.melhor && j.fora === p.pior), `${p.melhor} deveria mandar`);

  // Campanha acumulada depois das quartas (pênaltis = empate) decide as semifinais.
  const camp = Object.fromEntries(fase1.map(x => [x.time, { time: x.time, P: x.P, V: x.V, GP: x.GP, GC: x.GC, SG: x.SG }]));
  quartasReais.forEach(j => somarCampanha(camp, j.casa, j.fora, j.gc, j.gf));
  assert.deepEqual(['Novorizontino', 'Palmeiras', 'São Paulo', 'Corinthians'].map(t => camp[t].P), [19, 19, 16, 15]);
  const ord = ts => ts.map(t => camp[t]).sort((a, b) => b.P - a.P || b.V - a.V || b.SG - a.SG || b.GP - a.GP).map(x => x.time);
  const semisReais = real.filter(j => j.numFase === 3);
  const s = paresSemis(ord(['Novorizontino', 'Palmeiras', 'São Paulo', 'Corinthians']));
  for (const p of s) assert.ok(semisReais.some(j => j.casa === p.melhor && j.fora === p.pior), `semi ${p.melhor} x ${p.pior} com mando de ${p.melhor}`);

  // Final: a melhor campanha (Novorizontino) manda a volta.
  semisReais.forEach(j => somarCampanha(camp, j.casa, j.fora, j.gc, j.gf));
  const [melhor, pior] = ord(['Novorizontino', 'Palmeiras']);
  const finais = real.filter(j => j.numFase === 4);
  assert.deepEqual([finais[0].casa, finais[1].casa], [pior, melhor]);
});

test('uma temporada simulada respeita o regulamento', () => {
  for (const comp of [A1, A2]) {
    const rnd = mulberry32(5);
    const lg = initLeague(comp.times, iguais, CFG_MODELO);
    const rodadaDe = rodadasProvisorias(comp.times, comp.confrontos, rnd);
    for (let s = 0; s < 40; s++) {
      const T = simTemporada({ comp, getElo: iguais, cfg: CFG_MODELO, ak: 'conservador', lg, rodadaDe, rnd });
      const ordem = T.cl.map(x => x.time);
      for (let i = 1; i < T.cl.length; i++) assert.ok(T.cl[i - 1].P >= T.cl[i].P, 'pontos em ordem');
      T.quartas.forEach((c, i) => assert.deepEqual([c.melhor, c.pior], [ordem[i], ordem[7 - i]]));
      const nJogos = tipo => (tipo === 'idaVolta' ? 2 : 1);
      for (const c of T.quartas) assert.equal(c.jogos.length, nJogos(comp.formato.quartas));
      for (const c of [...T.quartas, ...T.semis, T.final]) {
        assert.equal(c.jogos[c.jogos.length - 1].casa, c.melhor, 'o melhor manda o jogo decisivo');
        const gm = c.jogos.reduce((a, j) => a + (j.casa === c.melhor ? j.gc : j.gf), 0);
        const gp = c.jogos.reduce((a, j) => a + (j.casa === c.pior ? j.gc : j.gf), 0);
        assert.equal(c.penaltis, gm === gp);
        if (!c.penaltis) assert.equal(c.vencedor, gm > gp ? c.melhor : c.pior);
      }
      assert.deepEqual(T.semis.flatMap(c => [c.melhor, c.pior]).sort(), T.quartas.map(c => c.vencedor).sort());
      assert.deepEqual([T.final.melhor, T.final.pior].sort(), T.semis.map(c => c.vencedor).sort());
      assert.deepEqual([...T.geral].sort(), [...comp.times].sort(), 'classificação geral é uma permutação');
      assert.deepEqual(T.geral.slice(0, 2), [T.campeao, T.vice]);
      assert.deepEqual(T.geral.slice(8), ordem.slice(8), 'do 9º em diante vale a 1ª fase');
      assert.deepEqual(T.rebaixados, ordem.slice(14));
      const mandos = Object.fromEntries(comp.times.map(t => [t, 0]));
      T.tab.forEach(j => mandos[j.casa]++);
      for (const t of comp.times) assert.ok(Math.abs(mandos[t] - comp.confrontos.length / 16) <= 0.5 + 1e-9, `${t}: ${mandos[t]} mandos`);
    }
  }
});

test('Monte Carlo: somas fecham e times iguais têm chances iguais', () => {
  for (const comp of [A1, A2]) {
    const N = 4000;
    const r = simMCPaulista({ comp, getElo: iguais, cfg: CFG_MODELO, nS: N, rnd: mulberry32(2027) });
    const soma = k => r.probs.reduce((s, p) => s + p[k], 0);
    for (const [k, esperado] of [['titulo', 100], ['vice', 100], ['final', 200], ['semi', 400], ['classificado', 800], ['rebaixado', 200]]) {
      assert.ok(Math.abs(soma(k) - esperado) < 1e-6, `${comp.sigla} soma de ${k}: ${soma(k)}`);
    }
    for (const p of r.probs) {
      assert.ok(Math.abs(p.posF.reduce((a, b) => a + b, 0) - 100) < 1e-6);
      assert.ok(Math.abs(p.geral.reduce((a, b) => a + b, 0) - 100) < 1e-6);
      assert.ok(p.titulo <= p.final + 1e-9 && p.final <= p.semi + 1e-9 && p.semi <= p.classificado + 1e-9);
      // Com 4.000 simulações o erro-padrão do título (6,25%) é 0,38 ponto; 5 desvios = 1,9.
      assert.ok(Math.abs(p.titulo - 6.25) < 1.9, `${comp.sigla} ${p.time}: título ${p.titulo}`);
      assert.ok(Math.abs(p.classificado - 50) < 4, `${comp.sigla} ${p.time}: classificado ${p.classificado}`);
      assert.equal(p.acesso, comp.formato.premio === 'acesso' ? p.final : null);
    }
    assert.equal(r.geralTrace.length, N * 16);
    assert.equal(r.mandoSorteado, true);
  }
});

test('Monte Carlo: semente mais forte rende mais; mesma semente aleatória, mesmo resultado', () => {
  const forte = t => (t === 'Guarani' ? 1750 : 1450);
  const a = simMCPaulista({ comp: A1, getElo: forte, cfg: CFG_MODELO, nS: 1500, rnd: mulberry32(9) });
  const b = simMCPaulista({ comp: A1, getElo: forte, cfg: CFG_MODELO, nS: 1500, rnd: mulberry32(9) });
  assert.equal(a.probs[0].time, 'Guarani');
  assert.ok(a.probs[0].titulo > 3 * a.probs[1].titulo, 'o time forte tem de se destacar');
  assert.deepEqual(a.probs.map(p => [p.time, p.titulo, p.mediaPts]), b.probs.map(p => [p.time, p.titulo, p.mediaPts]));
});

test('com a tabela oficial e todos os resultados, a 1ª fase simulada é a real', () => {
  const real = ler('../data/fpf/A1/2026.json').jogos.filter(j => j.numFase === 1);
  const times = [...new Set(real.flatMap(j => [j.casa, j.fora]))];
  const comp = { ...A1, ano: 2026, times, confrontos: real.map(j => [j.casa, j.fora]), tabela: real.map(j => ({ casa: j.casa, fora: j.fora, rodada: j.rodada })) };
  const res = real.map(j => ({ c: j.casa, f: j.fora, gc: j.gc, gf: j.gf, r: j.rodada }));
  const r = simMCPaulista({ comp, getElo: iguais, cfg: CFG_MODELO, res, nS: 50, rnd: mulberry32(1) });
  const esperado = classificar(real).map(x => x.time);
  for (const p of r.probs) assert.equal(p.posF[esperado.indexOf(p.time)], 100, `${p.time} fora da posição real`);
  assert.equal(r.mandoSorteado, false);
  assert.deepEqual(r.probs.filter(p => p.rebaixado === 100).map(p => p.time).sort(), ['Ponte Preta', 'Velo Clube']);
});

test('dificuldade do sorteio: média da semente dos oito adversários', () => {
  const elo = t => (A1.potes.A.includes(t) ? 1700 : 1400);
  const d = dificuldadeDoSorteio(A1, elo);
  const sp = d.find(x => x.time === 'São Paulo'), noroeste = d.find(x => x.time === 'Noroeste');
  assert.equal(sp.adversarios.length, 8);
  assert.equal(sp.forcaMedia, (3 * 1700 + 5 * 1400) / 8);
  assert.equal(noroeste.forcaMedia, (1 * 1700 + 7 * 1400) / 8);
});
