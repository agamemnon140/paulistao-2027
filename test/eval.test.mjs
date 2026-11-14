// O backtest das sementes: o laço de previsão é o do motor, as sementes só usam o passado,
// as métricas fazem a conta certa, e o relatório commitado é o que o código produz hoje.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { backtestSeries } from '../engine/liga.mjs';
import { CFG_MODELO } from '../engine/config.mjs';
import { temporada, escadasEstaduais, nacional, ANOS, SIGLAS } from '../eval/dados.mjs';
import { notas, elos, ELO_MIN, ELO_MAX } from '../eval/sementes.mjs';
import { brierDe, resumo, difBrier } from '../eval/metricas.mjs';
import { preverTemporada, principal, serializar, ehMataMata, GOLS_PADRAO } from '../eval/backtest.mjs';
import { relatorio } from '../eval/relatorio.mjs';

const escadas = escadasEstaduais(), nac = nacional();
const semear = (sigla, ano, cand, opts) => {
  const t = temporada(sigla, ano), n = notas(ano, t.times, escadas, nac);
  const e = elos(n.notas[cand], t.times, opts);
  return { ...t, ...n, getElo: x => e[x] };
};
const perto = (a, b, tol = 1e-12) => Math.abs(a - b) <= tol;

test('as classificações transferidas da FPF têm o hash calculado no navegador', () => {
  // O hash do navegador cobre o texto sem a quebra de linha final do arquivo.
  const texto = fs.readFileSync(new URL('../data/fpf/_transferencia/classificacoes_1a_fase_extra.txt', import.meta.url), 'utf8').replace(/\n$/, '');
  assert.equal(crypto.createHash('sha256').update(texto, 'utf8').digest('hex'), '800063773a30bad446c2c4f92b9234c098d1a88d538e97eaef4791d427e433e5');
  for (const ano of [2021, 2022, 2023, 2024, 2025]) assert.equal(escadas[ano].A3.length, 16, `A3 ${ano}`);
  assert.equal(escadas[2021].A1.length, 16);
  assert.equal(escadas[2021].A2.length, 16);
});

test('com liga e mata-mata iguais, preverTemporada é o backtestSeries do motor', () => {
  for (const [sigla, ano] of [['A1', 2025], ['A2', 2023]]) {
    const t = semear(sigla, ano, 'brasileiro');
    const um = { total: 2.31, pesoCasa: 0.58 };
    const meu = preverTemporada({ times: t.times, jogos: t.jogos, getElo: t.getElo, razao: 1.5, gols: { liga: um, mataMata: um } });
    const motor = backtestSeries(t.times, t.getElo, t.jogos.map(j => ({ c: j.casa, f: j.fora, gc: j.gc, gf: j.gf, r: j.rodada })), { ...CFG_MODELO, targetRatio: 1.5, maxSpread: 50 }, um.total * um.pesoCasa, um.total * (1 - um.pesoCasa), 'conservador');
    assert.equal(meu.length, motor.length);
    meu.forEach((p, i) => assert.ok(perto(p.pH, motor[i].pH) && perto(p.pD, motor[i].pD) && perto(p.pA, motor[i].pA), `${sigla} ${ano} jogo ${i}`));
  }
});

test('os jogos de cada temporada estão em ordem de fase e rodada, um jogo por time por rodada', () => {
  for (const sigla of SIGLAS) for (const ano of ANOS) {
    const { jogos } = temporada(sigla, ano);
    const visto = new Set();
    jogos.forEach((j, i) => {
      if (i) assert.ok(j.numFase > jogos[i - 1].numFase || (j.numFase === jogos[i - 1].numFase && j.rodada >= jogos[i - 1].rodada), `${sigla} ${ano} jogo ${i} fora de ordem`);
      for (const time of [j.casa, j.fora]) {
        const k = `${j.numFase}.${j.rodada}.${time}`;
        assert.ok(!visto.has(k), `${sigla} ${ano}: ${time} joga duas vezes na rodada ${j.rodada}`);
        visto.add(k);
      }
    });
  }
});

test('só eliminatória usa o λ de mata-mata; fase de grupos posterior é liga', () => {
  assert.deepEqual(['PRIMEIRA FASE', 'SEGUNDA FASE', 'QUARTAS DE FINAL', 'SEMIFINAL', 'FINAL'].map(fase => ehMataMata({ fase })), [false, false, true, true, true]);
  const fases = new Set(SIGLAS.flatMap(s => ANOS.flatMap(a => temporada(s, a).jogos.map(j => j.fase))));
  assert.deepEqual([...fases].sort(), ['FINAL', 'PRIMEIRA FASE', 'QUARTAS DE FINAL', 'SEGUNDA FASE', 'SEMIFINAL']);
});

test('as sementes do ano Y não mudam quando os dados de Y em diante mudam', () => {
  for (const sigla of SIGLAS) for (const ano of [2023, 2026]) {
    const t = temporada(sigla, ano), antes = notas(ano, t.times, escadas, nac).notas;
    // Embaralha tudo o que é de Y ou depois: posições nacionais e escadas estaduais.
    const nac2 = structuredClone(nac), esc2 = structuredClone(escadas);
    for (const a of Object.keys(nac2)) if (+a >= ano) for (const c of Object.keys(nac2[a])) nac2[a][c].pos = 99;
    for (const a of Object.keys(esc2)) if (+a >= ano) for (const d of Object.keys(esc2[a])) esc2[a][d].reverse();
    const depois = notas(ano, t.times, esc2, nac2).notas;
    assert.deepEqual(depois, antes, `${sigla} ${ano}`);
    // E `brasileiro`, `paulista` e `composta` nem olham a série de Y.
    for (const c of Object.keys(nac2[ano] || {})) nac2[ano][c].serie = 'D';
    const semY = notas(ano, t.times, esc2, nac2).notas;
    for (const cand of ['brasileiro', 'paulista', 'composta']) assert.deepEqual(semY[cand], antes[cand], `${sigla} ${ano} ${cand}`);
  }
});

test('ordem das sementes: Série A acima de quem não tem série; rebaixado do A1 acima do promovido da A3', () => {
  for (const ano of ANOS) {
    const t = temporada('A1', ano), n = notas(ano, t.times, escadas, nac).notas;
    const daA = t.times.filter(x => nac[ano - 1]?.[x]?.serie === 'A'), sem = t.times.filter(x => !nac[ano - 1]?.[x]);
    assert.ok(daA.length >= 4 && sem.length >= 1, `A1 ${ano}: ${daA.length} da Série A, ${sem.length} sem série`);
    assert.ok(Math.min(...daA.map(x => n.brasileiro[x])) > Math.max(...sem.map(x => n.brasileiro[x])), `A1 ${ano}`);
    const a2 = temporada('A2', ano), m = notas(ano, a2.times, escadas, nac).notas;
    const caiu = a2.times.filter(x => escadas[ano - 1].A1.includes(x)), subiu = a2.times.filter(x => escadas[ano - 1].A3.includes(x));
    assert.equal(caiu.length, 2, `A2 ${ano}: rebaixados do A1`);
    assert.equal(subiu.length, 2, `A2 ${ano}: promovidos da A3`);
    assert.ok(Math.min(...caiu.map(x => m.paulista[x])) > Math.max(...subiu.map(x => m.paulista[x])), `A2 ${ano}`);
  }
});

test('elos: faixa fixa, iguais no meio, razão 1 apaga a semente', () => {
  const t = semear('A1', 2026, 'brasileiro');
  const e = t.times.map(t.getElo);
  assert.equal(Math.min(...e), ELO_MIN);
  assert.equal(Math.max(...e), ELO_MAX);
  const ig = elos(t.notas.iguais, t.times);
  assert.ok(t.times.every(x => ig[x] === (ELO_MIN + ELO_MAX) / 2));
  const base = preverTemporada({ times: t.times, jogos: t.jogos, getElo: x => ig[x], razao: 1 });
  for (const cand of ['divisao', 'brasileiro', 'paulista', 'composta']) {
    const s = semear('A1', 2026, cand);
    const p = preverTemporada({ times: s.times, jogos: s.jogos, getElo: s.getElo, razao: 1 });
    p.forEach((x, i) => assert.ok(perto(x.pH, base[i].pH) && perto(x.pD, base[i].pD), cand));
  }
});

test('métricas: Brier, viés e diferença pareada', () => {
  assert.ok(perto(brierDe({ pH: 0.5, pD: 0.3, pA: 0.2, oH: 1, oD: 0, oA: 0 }), 0.38));
  const p = (oH, oD, oA) => ({ pH: 0.6, pD: 0.25, pA: 0.15, oH, oD, oA });
  const r = resumo([p(1, 0, 0), p(0, 1, 0), p(1, 0, 0), p(0, 0, 1)]);
  assert.ok(perto(r.viesCasa, 0.1) && perto(r.viesEmpate, 0) && perto(r.freq.casa, 0.5));
  assert.ok(perto(r.viesFavorito, 0.1));
  const ps = [p(1, 0, 0), p(0, 1, 0), p(0, 0, 1)];
  assert.deepEqual(difBrier(ps, ps), { dif: 0, ic95: [0, 0] });
  const pior = ps.map(x => ({ ...x, pH: 0.2, pD: 0.2, pA: 0.6 }));
  assert.ok(difBrier(pior, ps).dif > 0 === (resumo(pior).brier > resumo(ps).brier));
  assert.throws(() => difBrier(ps, ps.slice(1)));
});

// Daqui para baixo: o resultado commitado e as afirmações que docs/DECISOES.md faz sobre ele.
const S = principal({ gravar: false });

test('eval/out/backtest.json e eval/RELATORIO.md são o que o código produz hoje', () => {
  // Comparação no texto arredondado (10 algarismos): o último bit muda entre versões do Node.
  const texto = serializar(S);
  assert.equal(fs.readFileSync(new URL('../eval/out/backtest.json', import.meta.url), 'utf8'), texto);
  assert.equal(fs.readFileSync(new URL('../eval/RELATORIO.md', import.meta.url), 'utf8'), relatorio(JSON.parse(texto)));
});

test('controle negativo: a semente invertida perde do piso nas duas divisões', () => {
  for (const sigla of SIGLAS) assert.ok(S.divisoes[sigla].controleInvertido.ic95[0] > 0, sigla);
});

test('leitura registrada em DECISOES: A1', () => {
  const D = S.divisoes.A1;
  for (const c of S.candidatas) {
    assert.equal(D.porAno[c].filter(a => a.dif < 0).length, 4, `${c} bate o piso nos quatro anos`);
    assert.ok(D.melhor[c].contraPiso.ic95[1] < 0, `${c}: IC exclui zero`);
  }
  assert.equal(D.melhor.brasileiro.razao, 1.5);
  // brasileiro e composta empatam; brasileiro não perde da divisão em nenhum dos dois conjuntos.
  const bc = D.pares['brasileiro − composta'].escolha, db = D.pares['divisao − brasileiro'];
  assert.ok(bc.ic95[0] < 0 && bc.ic95[1] > 0);
  assert.ok(db.escolha.dif > 0 && db.confirmacao.dif > 0);
  // A amplitude do Brasileirão (3,0) é pior do que não semear.
  for (const c of ['divisao', 'brasileiro', 'paulista']) assert.ok(D.melhor[c].herdada > D.piso.brier, c);
  // Mando: viés não significativo com o peso padrão; mata-mata com 0,65 também não.
  assert.ok(Math.abs(D.mando.padrao.escolha.zCasa) < 2 && Math.abs(D.mando.padrao.confirmacao.zCasa) < 2);
  assert.ok(Math.abs(D.mando.mataMata[0].zCasa) < 2);
});

test('leitura registrada em DECISOES: A2', () => {
  const D = S.divisoes.A2, br = r => D.curvas.brasileiro.find(p => p.razao === r);
  // A escada estadual não ajuda em razão nenhuma.
  assert.equal(D.melhor.paulista.razao, 1);
  // A semente nacional ajuda pouco: com 1,25 o IC exclui zero, com 1,50 já não.
  assert.ok(br(1.25).contraPiso.ic95[1] < 0 && br(1.25).cincoAnos.ic95[1] < 0 && br(1.25).confirmacao.dif < 0);
  assert.ok(br(1.5).contraPiso.ic95[1] > 0);
  assert.ok(br(3).brier > D.piso.brier);
  // Mando: com 0,58 o modelo exagera o mandante nos dois conjuntos; com 0,55 não.
  assert.ok(D.mando.padrao.escolha.zCasa > 2 && D.mando.padrao.confirmacao.zCasa > 2);
  const w55 = D.mando.varredura.find(v => v.pesoCasa === 0.55);
  assert.ok(Math.abs(w55.escolha.zCasa) < 2 && w55.escolha.brier < D.mando.varredura.find(v => v.pesoCasa === GOLS_PADRAO.liga.pesoCasa).escolha.brier);
  // Empates subestimados na 1ª fase; mata-mata com 0,65 exagera o mandante.
  assert.ok(D.mando.padrao.escolha.zEmpate < -2);
  assert.ok(D.mando.mataMata[0].zCasa > 2);
});
