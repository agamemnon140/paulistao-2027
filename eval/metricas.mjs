// Métricas de previsão jogo a jogo. Cada previsão é {pH, pD, pA, oH, oD, oA}.

import { mulberry32 } from '../engine/rng.mjs';

export const brierDe = p => (p.pH - p.oH) ** 2 + (p.pD - p.oD) ** 2 + (p.pA - p.oA) ** 2;
const media = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

export function resumo(preds) {
  const n = preds.length;
  if (!n) return null;
  const pFav = preds.map(p => Math.max(p.pH, p.pD, p.pA));
  const acertouFav = preds.map(p => (p.pH >= p.pD && p.pH >= p.pA ? p.oH : p.pA >= p.pD ? p.oA : p.oD));
  const somaPH = preds.reduce((s, p) => s + p.pH, 0), somaOH = preds.reduce((s, p) => s + p.oH, 0);
  // z do viés de casa: trata as probabilidades como fixas (Var = Σ p(1−p)). Num walk-forward
  // isso subestima um pouco a variância; ler |z| perto de 2 com cautela.
  const zCasa = (somaPH - somaOH) / Math.sqrt(preds.reduce((s, p) => s + p.pH * (1 - p.pH), 0));
  return {
    n,
    brier: media(preds.map(brierDe)),
    logloss: -media(preds.map(p => Math.log(Math.max(1e-12, p.oH ? p.pH : p.oD ? p.pD : p.pA)))),
    viesCasa: (somaPH - somaOH) / n,          // previsto − observado; positivo = modelo exagera o mandante
    zCasa,
    viesEmpate: media(preds.map(p => p.pD - p.oD)),
    zEmpate: preds.reduce((s, p) => s + p.pD - p.oD, 0) / Math.sqrt(preds.reduce((s, p) => s + p.pD * (1 - p.pD), 0)),
    viesFavorito: media(pFav) - media(acertouFav),
    freq: { casa: somaOH / n, empate: media(preds.map(p => p.oD)), fora: media(preds.map(p => p.oA)) }
  };
}

// Diferença de Brier entre duas previsões dos MESMOS jogos (a − b), com IC95 por bootstrap
// pareado. Negativo = `a` é melhor.
export function difBrier(a, b, { B = 2000, seed = 12345 } = {}) {
  if (a.length !== b.length) throw new Error('previsões de conjuntos diferentes');
  const d = a.map((p, i) => brierDe(p) - brierDe(b[i])), n = d.length, rnd = mulberry32(seed), ms = [];
  for (let k = 0; k < B; k++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += d[Math.floor(rnd() * n)];
    ms.push(s / n);
  }
  ms.sort((x, y) => x - y);
  return { dif: media(d), ic95: [ms[Math.floor(0.025 * B)], ms[Math.floor(0.975 * B)]] };
}
