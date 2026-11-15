// A semente que vai ao ar, as sementes de 2027 e a projeção arquivada.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initLeague } from '../engine/core.mjs';
import { CFG_MODELO } from '../engine/config.mjs';
import { postosNacionais, notaBrasileiro, elosDaNota, comAmplitude, FORMAS, ELO_MIN, ELO_MAX } from '../engine/semente.mjs';
import { nacionalPorAno } from '../scripts/nacional.mjs';
import { SIGLAS, sementes2027, serializarSementes, lerSementes, lerCompeticao, projetar, registro, impressao, lerPrevisoes, N_SIMS, SEMENTE_RNG } from '../scripts/projecao.mjs';

const ler = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));

test('escada nacional: degrau de 16 por série; sem série fica um posto abaixo do pior', () => {
  const nac = { a: { serie: 'A', pos: 2 }, b: { serie: 'A', pos: 17 }, c: { serie: 'B', pos: 1 }, d: { serie: 'D', pos: 30 } };
  const { posto, semSerie } = postosNacionais(['a', 'b', 'c', 'd', 'e', 'f'], nac);
  assert.deepEqual(posto, { a: 2, b: 17, c: 17, d: 78, e: 79, f: 79 });
  assert.deepEqual(semSerie, ['e', 'f']);
});

test('formas da escada: todas preservam a ordem; o log abre o topo e fecha o fundo', () => {
  const times = ['a', 'b', 'c', 'd'], nac = { a: { serie: 'A', pos: 2 }, b: { serie: 'A', pos: 10 }, c: { serie: 'C', pos: 10 }, d: { serie: 'D', pos: 40 } };
  const elo = forma => elosDaNota(notaBrasileiro(times, nac, forma).nota, times);
  for (const forma of Object.keys(FORMAS)) {
    const e = elo(forma);
    assert.ok(e.a > e.b && e.b > e.c && e.c > e.d, forma);
    assert.equal(e.a, ELO_MAX);
    assert.equal(e.d, ELO_MIN);
  }
  assert.ok(elo('log').b < elo('raiz').b && elo('raiz').b < elo('linear').b, 'no log, o 10º da A fica mais longe do 2º');
  assert.throws(() => notaBrasileiro(times, nac, 'cubica'));
});

test('amplitude: a razão de ataque entre a melhor e a pior semente é a pedida', () => {
  const times = ['a', 'b', 'c'], elos = { a: 1750, b: 1600, c: 1400 };
  for (const razao of [1.25, 2, 3.5]) {
    const lg = initLeague(times, t => elos[t], comAmplitude(CFG_MODELO, razao));
    assert.ok(Math.abs(lg.initAD(1750).atk / lg.initAD(1400).atk - razao) < 1e-12);
    assert.ok(Math.abs(lg.initAD(1400).def / lg.initAD(1750).def - razao) < 1e-12);
  }
});

test('situação nacional de 2026: mesmas séries do brasileiro-2026, todos no A1 ou na A2 de 2027', () => {
  const { nac, lidoEm } = nacionalPorAno(), P = ler('data/nacional/paulistas.json');
  assert.match(lidoEm[2026], /^\d{4}-\d{2}-\d{2}$/);
  for (const [serie, clubes] of Object.entries(P.divisao2026)) assert.deepEqual(Object.keys(nac[2026]).filter(c => nac[2026][c].serie === serie).sort(), [...clubes].sort(), `Série ${serie}`);
  const de2027 = new Set(SIGLAS.flatMap(s => lerCompeticao(s).times));
  for (const clube of Object.keys(nac[2026])) assert.ok(de2027.has(clube), clube);
});

test('data/2027/sementes.json é o que o código gera hoje, com a semente decidida', () => {
  assert.equal(fs.readFileSync(new URL('../data/2027/sementes.json', import.meta.url), 'utf8'), serializarSementes(sementes2027()));
  const S = lerSementes(), decisao = ler('eval/out/backtest.json').decisao;
  assert.equal(decisao.semente, 'brasileiroLog');
  for (const sigla of SIGLAS) {
    const comp = lerCompeticao(sigla), s = S[sigla];
    assert.deepEqual([s.tipo, s.forma, s.razao], ['brasileiro', 'log', decisao[sigla].razao], sigla);
    assert.deepEqual({ liga: comp.gols.liga, mataMata: comp.gols.mataMata }, decisao[sigla].gols, `${sigla}: gols decididos`);
    assert.deepEqual(Object.keys(s.clubes), comp.times);
    const elos = comp.times.map(t => s.clubes[t].elo);
    assert.equal(Math.max(...elos), ELO_MAX);
    assert.equal(Math.min(...elos), ELO_MIN);
    // Quem não tem série nacional parte do piso; quem tem, de mais alto.
    for (const t of comp.times) assert.ok(s.clubes[t].serie ? s.clubes[t].elo > ELO_MIN : s.clubes[t].elo === ELO_MIN, t);
  }
  assert.equal(S.A1.clubes.Palmeiras.elo, ELO_MAX);
});

test('projeção: as probabilidades fecham com o formato e a simulação é reprodutível', () => {
  for (const sigla of SIGLAS) {
    const r = projetar(sigla, { nS: 1500 }), f = r.entradas.comp.formato, soma = k => r.probs.reduce((s, p) => s + p[k], 0);
    assert.ok(Math.abs(soma('titulo') - 100) < 1e-9 && Math.abs(soma('vice') - 100) < 1e-9);
    assert.ok(Math.abs(soma('final') - 200) < 1e-9 && Math.abs(soma('semi') - 400) < 1e-9);
    assert.ok(Math.abs(soma('classificado') - 100 * f.classificados) < 1e-9 && Math.abs(soma('rebaixado') - 100 * f.rebaixados) < 1e-9);
    if (f.premio === 'acesso') assert.ok(Math.abs(soma('acesso') - 200) < 1e-9);
    assert.equal(r.mandoSorteado, true);
    const outra = projetar(sigla, { nS: 1500 });
    assert.deepEqual(outra.probs.map(p => [p.time, p.titulo, p.rebaixado]), r.probs.map(p => [p.time, p.titulo, p.rebaixado]));
    // A ordem da projeção acompanha a semente nos extremos.
    const melhor = Object.entries(r.entradas.semente.clubes).sort((a, b) => b[1].elo - a[1].elo)[0][0];
    assert.equal(r.probs.slice().sort((a, b) => b.final - a.final)[0].time === melhor || sigla === 'A2', true);
    const semSerie = r.probs.filter(p => !r.entradas.semente.clubes[p.time].serie), comSerieA = r.probs.filter(p => r.entradas.semente.clubes[p.time].serie === 'A');
    if (comSerieA.length) assert.ok(Math.min(...comSerieA.map(p => p.classificado)) > Math.max(...semSerie.map(p => p.classificado)));
  }
});

test('predictions.jsonl: registros completos, e o último de cada divisão é o que o código produz', () => {
  const linhas = lerPrevisoes();
  assert.ok(linhas.length >= 2);
  for (const l of linhas) {
    assert.equal(l.v, 1);
    assert.match(l.quando, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.ok(SIGLAS.includes(l.competicao) && ['pre-tabela', 'tabela', 'rodada'].includes(l.tipo));
    assert.equal(Object.keys(l.times).length, 16);
    assert.ok(Math.abs(Object.values(l.times).reduce((s, t) => s + t.titulo, 0) - 100) < 0.2);
  }
  for (const sigla of SIGLAS) {
    const ultimo = linhas.filter(l => l.competicao === sigla).at(-1);
    assert.ok(ultimo, sigla);
    // Só dá para reproduzir um registro enquanto as entradas dele são as de hoje.
    if (ultimo.entradas !== impressao(sigla, { nS: N_SIMS, seed: SEMENTE_RNG })) continue;
    const agora = registro(sigla, projetar(sigla), { quando: ultimo.quando });
    for (const [time, p] of Object.entries(ultimo.times)) for (const k of ['classificado', 'rebaixado', 'semi', 'final', 'titulo'])
      assert.ok(Math.abs(p[k] - agora.times[time][k]) <= 0.02, `${sigla} ${time} ${k}`);
  }
});
