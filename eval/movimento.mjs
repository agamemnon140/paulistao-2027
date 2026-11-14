// Promoção e rebaixamento: quem mudou de divisão rende diferente do que a semente espera?
//
// Para cada clube e temporada, compara os pontos por jogo da 1ª fase com os que a semente
// sozinha esperava (forças fixas na semente, sem atualização durante o campeonato). O que
// sobra é o que a semente não viu. É descritivo: junta os cinco anos e não ajusta nada.

import { initLeague, calcL, calcProbs, mlDe } from '../engine/core.mjs';
import { CFG_MODELO } from '../engine/config.mjs';
import { elos } from './sementes.mjs';

const NIVEL = { A: 4, B: 3, C: 2, D: 1 };

// Uma linha por clube-temporada: movimento estadual, movimento nacional e resíduo.
export function residuosDaTemporada({ sigla, ano, times, jogos, nota, razao, gols, escadas, nac }) {
  const e = elos(nota, times);
  const lg = initLeague(times, t => e[t], { ...CFG_MODELO, targetRatio: razao, maxSpread: 50 });
  const ad = Object.fromEntries(times.map(t => [t, lg.initAD(e[t])])), ml = mlDe(gols);
  const acc = Object.fromEntries(times.map(t => [t, { jogos: 0, pontos: 0, esperado: 0 }]));
  for (const j of jogos.filter(j => j.numFase === 1)) {
    const { lC, lF } = calcL(ad[j.casa].atk, ad[j.casa].def, ad[j.fora].atk, ad[j.fora].def, 0, 0, ml.mc, ml.mf, CFG_MODELO.homeAdv, false);
    const p = calcProbs(lC, lF), c = acc[j.casa], f = acc[j.fora];
    c.jogos++; f.jogos++;
    c.pontos += j.gc > j.gf ? 3 : j.gc === j.gf ? 1 : 0;
    f.pontos += j.gf > j.gc ? 3 : j.gc === j.gf ? 1 : 0;
    c.esperado += (3 * p.pH + p.pD) / 100;
    f.esperado += (3 * p.pA + p.pD) / 100;
  }
  const antes = escadas[ano - 1], posicoes = escadas[ano][sigla];
  return times.map(t => {
    const a = nac[ano - 1]?.[t], b = nac[ano]?.[t], na = a ? NIVEL[a.serie] : 0, nb = b ? NIVEL[b.serie] : 0;
    const estadual = sigla === 'A1' ? (antes.A2.includes(t) ? 'promovido' : 'permaneceu') : antes.A1.includes(t) ? 'rebaixado' : antes.A3.includes(t) ? 'promovido' : 'permaneceu';
    const nacional = !na && !nb ? 'sem série' : !na ? 'entrou' : !nb ? 'saiu' : nb > na ? 'subiu' : nb < na ? 'caiu' : 'manteve';
    const x = acc[t];
    return { sigla, ano, time: t, estadual, nacional, serieAntes: a?.serie ?? null, serieNoAno: b?.serie ?? null, posicao: posicoes.indexOf(t) + 1, real: x.pontos / x.jogos, esperado: x.esperado / x.jogos, residuo: (x.pontos - x.esperado) / x.jogos };
  });
}

export function grupo(linhas) {
  const n = linhas.length, m = k => linhas.reduce((s, l) => s + l[k], 0) / n;
  const r = m('residuo'), ep = n > 1 ? Math.sqrt(linhas.reduce((s, l) => s + (l.residuo - r) ** 2, 0) / (n - 1) / n) : null;
  return { n, real: m('real'), esperado: m('esperado'), residuo: r, ep, t: ep ? r / ep : null, abaixoDoEsperado: linhas.filter(l => l.residuo < 0).length, entreOsOito: linhas.filter(l => l.posicao <= 8).length, entreOsDoisUltimos: linhas.filter(l => l.posicao >= 15).length };
}

export function movimento(linhas) {
  const por = (ls, chave) => Object.fromEntries([...new Set(ls.map(l => l[chave]))].sort().map(g => [g, grupo(ls.filter(l => l[chave] === g))]));
  const de = sigla => linhas.filter(l => l.sigla === sigla);
  return {
    A1: { estadual: por(de('A1'), 'estadual'), nacional: por(de('A1'), 'nacional') },
    A2: { estadual: por(de('A2'), 'estadual'), nacional: por(de('A2'), 'nacional') },
    conjunto: {
      'subiu de série nacional (A1 e A2)': grupo(linhas.filter(l => l.nacional === 'subiu')),
      'caiu de série nacional (A1 e A2)': grupo(linhas.filter(l => l.nacional === 'caiu')),
      'A2: joga série nacional no ano': grupo(de('A2').filter(l => l.serieNoAno)),
      'A2: sem série no ano, tinha no anterior': grupo(de('A2').filter(l => !l.serieNoAno && l.serieAntes)),
      'A2: sem série nos dois anos': grupo(de('A2').filter(l => !l.serieNoAno && !l.serieAntes))
    },
    casos: linhas.filter(l => l.estadual !== 'permaneceu' || l.nacional === 'subiu' || l.nacional === 'caiu')
  };
}
