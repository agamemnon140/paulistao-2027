// Backtest das sementes: qual ordem e qual amplitude preveem melhor os jogos do Paulista?
//
//   node eval/backtest.mjs          grava eval/out/backtest.json e eval/RELATORIO.md
//
// Protocolo (docs/DECISOES.md, decisões 6 a 10):
//   - walk-forward: cada jogo é previsto com o estado treinado só nos anteriores da temporada;
//   - ESCOLHA em 2022–2025, por divisão; CONFIRMAÇÃO em 2026, intocado até a escolha;
//   - o backtest escolhe ordem e amplitude da semente; confere o viés de casa e só propõe
//     mexer no peso do mando se ele for significativo; o resto é herdado.
//
// Este script só LÊ engine/ e data/.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initLeague, calcL, calcProbs, updR, mlDe } from '../engine/core.mjs';
import { CFG_MODELO } from '../engine/config.mjs';
import { ANOS, SIGLAS, temporada, escadasEstaduais, nacional } from './dados.mjs';
import { notas, elos } from './sementes.mjs';
import { resumo, difBrier } from './metricas.mjs';
import { relatorio } from './relatorio.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAZOES = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8];
export const CANDIDATAS = ['divisao', 'brasileiro', 'paulista', 'composta'];
export const ESCOLHA = [2022, 2023, 2024, 2025], CONFIRMACAO = [2026];
export const PESOS_CASA = [0.50, 0.52, 0.54, 0.55, 0.56, 0.57, 0.58, 0.60, 0.62];
export const GOLS_PADRAO = { liga: { total: 2.31, pesoCasa: 0.58 }, mataMata: { total: 2.31, pesoCasa: 0.65 } };

// Jogo eliminatório (λ de mata-mata). Fases de grupos depois da 1ª — a 2ª fase da A2 de
// 2026 — são pontos corridos e usam o λ de liga.
export const ehMataMata = j => /QUARTAS|SEMI|FINAL/.test(j.fase);

// Walk-forward de uma temporada. É o laço do backtestSeries do motor, com uma diferença:
// o λ de base muda entre liga e mata-mata (test/eval.test.mjs confere que, com os dois
// iguais, o resultado é idêntico ao do motor).
export function preverTemporada({ times, jogos, getElo, razao, gols = GOLS_PADRAO, ak = 'conservador' }) {
  const cfg = { ...CFG_MODELO, targetRatio: razao, maxSpread: 50 };
  const lg = initLeague(times, getElo, cfg);
  const liga = mlDe(gols.liga), mata = mlDe(gols.mataMata);
  const el = {}, at = {}, df = {};
  times.forEach(t => { el[t] = getElo(t); const i = lg.initAD(el[t]); at[t] = i.atk; df[t] = i.def; });
  return jogos.map(j => {
    const ko = ehMataMata(j), ml = ko ? mata : liga;
    const { lC, lF } = calcL(at[j.casa], df[j.casa], at[j.fora], df[j.fora], el[j.casa], el[j.fora], ml.mc, ml.mf, cfg.homeAdv, false);
    const pr = calcProbs(lC, lF);
    updR(el, at, df, j.casa, j.fora, j.gc, j.gf, lC, lF, cfg, ak, false);
    return { pH: pr.pH / 100, pD: pr.pD / 100, pA: pr.pA / 100, oH: j.gc > j.gf ? 1 : 0, oD: j.gc === j.gf ? 1 : 0, oA: j.gc < j.gf ? 1 : 0, primeira: j.numFase === 1, ko };
  });
}

// O que os jogos dizem sem modelo nenhum: gols por jogo, fatia do mandante e desfechos.
function medir(jogos) {
  const n = jogos.length, gc = jogos.reduce((s, j) => s + j.gc, 0), gf = jogos.reduce((s, j) => s + j.gf, 0);
  const casa = jogos.filter(j => j.gc > j.gf).length, empate = jogos.filter(j => j.gc === j.gf).length;
  return { n, gols: (gc + gf) / n, pesoCasa: gc / (gc + gf), casa: casa / n, empate: empate / n, fora: (n - casa - empate) / n };
}

export function principal({ gravar = true } = {}) {
  const escadas = escadasEstaduais(), nac = nacional();
  const T = {};
  for (const sigla of SIGLAS) for (const ano of ANOS) {
    const t = temporada(sigla, ano);
    T[sigla + ano] = { ...t, ...notas(ano, t.times, escadas, nac) };
  }
  // Previsões de cada (divisão, candidata, razão, ano). Com razão 1 toda candidata vira `iguais`.
  const prever = (sigla, cand, razao, anos, { inverter = false, ...extra } = {}) => anos.flatMap(ano => {
    const t = T[sigla + ano], e = elos(t.notas[cand], t.times, { inverter });
    return preverTemporada({ times: t.times, jogos: t.jogos, getElo: x => e[x], razao, ...extra });
  });
  const TODOS = [...ESCOLHA, ...CONFIRMACAO];
  const jogosDe = (sigla, anos, filtro) => anos.flatMap(ano => T[sigla + ano].jogos.filter(filtro));

  const saida = { geradoPor: 'eval/backtest.mjs', razoes: RAZOES, candidatas: CANDIDATAS, escolha: ESCOLHA, confirmacao: CONFIRMACAO, golsPadrao: GOLS_PADRAO, razaoHerdada: CFG_MODELO.targetRatio, divisoes: {} };
  for (const sigla of SIGLAS) {
    const D = (saida.divisoes[sigla] = { cobertura: {}, medido: {}, curvas: {}, melhor: {}, porAno: {}, razaoPorAno: {}, confirmacao: {}, conjunto: {} });
    for (const ano of ANOS) D.cobertura[ano] = { semSerieNacionalNoAnoAnterior: T[sigla + ano].semNacional.length, semEscadaEstadual: T[sigla + ano].semEscada };
    D.medido = {
      primeiraFaseEscolha: medir(jogosDe(sigla, ESCOLHA, j => j.numFase === 1)),
      primeiraFaseConfirmacao: medir(jogosDe(sigla, CONFIRMACAO, j => j.numFase === 1)),
      mataMata: medir(jogosDe(sigla, TODOS, ehMataMata))
    };
    const piso = prever(sigla, 'divisao', 1, ESCOLHA);
    const piso26 = prever(sigla, 'divisao', 1, CONFIRMACAO), pisoTodos = prever(sigla, 'divisao', 1, TODOS);
    D.piso = resumo(piso);
    const P = {};
    for (const cand of CANDIDATAS) {
      // Cada ponto da curva leva a diferença pareada contra o piso, na escolha e nos cinco anos.
      D.curvas[cand] = RAZOES.map(r => ({ razao: r, ...resumo(prever(sigla, cand, r, ESCOLHA)), contraPiso: difBrier(prever(sigla, cand, r, ESCOLHA), piso), cincoAnos: difBrier(prever(sigla, cand, r, TODOS), pisoTodos), confirmacao: difBrier(prever(sigla, cand, r, CONFIRMACAO), piso26), anosQueBatemOPiso: ESCOLHA.filter(ano => resumo(prever(sigla, cand, r, [ano])).brier < resumo(prever(sigla, 'divisao', 1, [ano])).brier).length }));
      const m = D.curvas[cand].reduce((a, b) => (b.brier < a.brier ? b : a));
      const p = (P[cand] = prever(sigla, cand, m.razao, ESCOLHA));
      D.melhor[cand] = { razao: m.razao, ...resumo(p), contraPiso: difBrier(p, piso), herdada: D.curvas[cand].find(x => x.razao === CFG_MODELO.targetRatio).brier };
      // Consistência: em quantos dos quatro anos a candidata, na razão escolhida, bate o piso;
      // e qual razão cada ano escolheria sozinho.
      D.porAno[cand] = ESCOLHA.map(ano => {
        const a = resumo(prever(sigla, cand, m.razao, [ano])), b = resumo(prever(sigla, 'divisao', 1, [ano]));
        return { ano, brier: a.brier, piso: b.brier, dif: a.brier - b.brier };
      });
      D.razaoPorAno[cand] = ESCOLHA.map(ano => RAZOES.map(r => ({ r, b: resumo(prever(sigla, cand, r, [ano])).brier })).reduce((a, b) => (b.b < a.b ? b : a)).r);
    }
    // Confirmação em 2026 com a razão escolhida em 2022–2025 (nada é reajustado aqui), e o
    // conjunto dos cinco anos, que só descreve: mistura escolha e confirmação.
    D.confirmacao.piso = resumo(piso26);
    for (const cand of CANDIDATAS) {
      const p = prever(sigla, cand, D.melhor[cand].razao, CONFIRMACAO);
      D.confirmacao[cand] = { razao: D.melhor[cand].razao, ...resumo(p), contraPiso: difBrier(p, piso26) };
      D.conjunto[cand] = difBrier(prever(sigla, cand, D.melhor[cand].razao, TODOS), pisoTodos);
    }
    // Vencedora na escolha (menor Brier) e todas as comparações pareadas, na escolha e em 2026.
    const venc = (D.vencedoraNaEscolha = CANDIDATAS.reduce((a, b) => (D.melhor[b].brier < D.melhor[a].brier ? b : a)));
    D.pares = {};
    for (let i = 0; i < CANDIDATAS.length; i++) for (let k = i + 1; k < CANDIDATAS.length; k++) {
      const a = CANDIDATAS[i], b = CANDIDATAS[k];
      D.pares[`${a} − ${b}`] = { escolha: difBrier(P[a], P[b]), confirmacao: difBrier(prever(sigla, a, D.melhor[a].razao, CONFIRMACAO), prever(sigla, b, D.melhor[b].razao, CONFIRMACAO)) };
    }
    // Controle negativo: a semente `brasileiro` invertida tem de perder do piso.
    D.controleInvertido = difBrier(prever(sigla, 'brasileiro', 1.5, ESCOLHA, { inverter: true }), piso);
    // Mando: viés de casa na 1ª fase com a semente `brasileiro` na sua razão (a mais simples
    // entre as que usam posição), e varredura do peso do mando.
    const ref = 'brasileiro', rRef = D.melhor[ref].razao;
    const so = (ps, f) => ps.filter(f);
    D.mando = {
      semente: ref, razao: rRef,
      padrao: { pesoCasa: GOLS_PADRAO.liga.pesoCasa, escolha: resumo(so(P[ref], p => p.primeira)), confirmacao: resumo(so(prever(sigla, ref, rRef, CONFIRMACAO), p => p.primeira)) },
      varredura: PESOS_CASA.map(w => {
        const gols = { ...GOLS_PADRAO, liga: { ...GOLS_PADRAO.liga, pesoCasa: w } };
        const e = resumo(so(prever(sigla, ref, rRef, ESCOLHA, { gols }), p => p.primeira)), c = resumo(so(prever(sigla, ref, rRef, CONFIRMACAO, { gols }), p => p.primeira));
        const pick = x => ({ brier: x.brier, viesCasa: x.viesCasa, zCasa: x.zCasa, viesEmpate: x.viesEmpate, zEmpate: x.zEmpate, viesFora: -(x.viesCasa + x.viesEmpate) });
        return { pesoCasa: w, escolha: pick(e), confirmacao: pick(c) };
      }),
      // Mata-mata: poucos jogos, só informa. A última linha usa os gols medidos nos próprios
      // jogos avaliados (dentro da amostra), para mostrar quanto do viés é total de gols.
      mataMata: [
        { rotulo: 'padrão', ...GOLS_PADRAO.mataMata },
        { rotulo: 'peso de casa da liga', total: GOLS_PADRAO.mataMata.total, pesoCasa: GOLS_PADRAO.liga.pesoCasa },
        { rotulo: 'peso de casa 0,55', total: GOLS_PADRAO.mataMata.total, pesoCasa: 0.55 },
        { rotulo: 'gols medidos, peso 0,55 (dentro da amostra)', total: D.medido.mataMata.gols, pesoCasa: 0.55 }
      ].map(v => {
        const r = resumo(so(prever(sigla, ref, rRef, TODOS, { gols: { ...GOLS_PADRAO, mataMata: { total: v.total, pesoCasa: v.pesoCasa } } }), p => p.ko));
        return { ...v, n: r.n, brier: r.brier, viesCasa: r.viesCasa, zCasa: r.zCasa, viesEmpate: r.viesEmpate, zEmpate: r.zEmpate };
      })
    };
    // Sensibilidade ao preset de atualização (não é ajuste: só informa).
    D.presets = Object.fromEntries(['conservador', 'base', 'agressivo'].map(ak => [ak, resumo(prever(sigla, ref, rRef, ESCOLHA, { ak })).brier]));
  }
  if (gravar) {
    fs.mkdirSync(path.join(AQUI, 'out'), { recursive: true });
    fs.writeFileSync(path.join(AQUI, 'out', 'backtest.json'), JSON.stringify(saida, null, 1) + '\n');
    fs.writeFileSync(path.join(AQUI, 'RELATORIO.md'), relatorio(saida));
  }
  return saida;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  principal();
  console.log('gravados eval/out/backtest.json e eval/RELATORIO.md');
}
