// Núcleo do motor: porte FIEL das funções puras do brasileiro-2026 (index.html v4.89).
//
// Regra deste arquivo: nenhuma mudança de comportamento em relação ao original. Os nomes
// são os mesmos de lá (calcL, updR, initLeague...) para que a auditoria seja lado a lado, e
// test/paridade.test.mjs compara cada função com vetores gerados pelo motor original
// (scripts/gerar_dourado.mjs). Melhorias de modelo NÃO entram aqui: entram como parâmetro
// de quem chama, depois de medidas no backtest.
//
// Única diferença de forma: as funções estocásticas recebem `rnd` em vez de ler
// Math.random. A ordem e a quantidade de sorteios são idênticas às do original.

export const poissonProb = (l, k) => {
  let p = Math.exp(-l);
  for (let i = 1; i <= k; i++) p *= l / i;
  return p;
};

export const poissonRandom = (l, rnd = Math.random) => {
  if (l <= 0) return 0;
  const L = Math.exp(-l);
  let k = 0,
    p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L);
  return k - 1;
};

export const suavLog = s => Math.sign(s) * Math.log1p(Math.abs(s));

// Dois sorteios por chamada, na ordem do original: o primeiro vai para o log, o segundo
// para o cosseno.
export const boxMuller = (rnd = Math.random) =>
  Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());

// Drift estocástico em Elo + atk/def (σ_ad = σ_elo × 0.008), por time, na ordem de `times`.
export const applyDrift = (times, el, at, df, sigmaElo, rnd = Math.random) => {
  const sAD = sigmaElo * 0.008;
  times.forEach(t => {
    el[t] += sigmaElo * boxMuller(rnd);
    at[t] = Math.max(0.3, Math.min(3, at[t] + sAD * boxMuller(rnd)));
    df[t] = Math.max(0.3, Math.min(3, df[t] + sAD * boxMuller(rnd)));
  });
};

// Probabilidades V/E/D em PERCENTUAL, grade de Poisson 0..7 renormalizada.
export const calcProbs = (lC, lF) => {
  let pH = 0,
    pD = 0,
    pA = 0;
  for (let gc = 0; gc < 8; gc++) for (let gf = 0; gf < 8; gf++) {
    const p = poissonProb(lC, gc) * poissonProb(lF, gf);
    if (gc > gf) pH += p; else if (gc === gf) pD += p; else pA += p;
  }
  const t = pH + pD + pA;
  return {
    pH: pH / t * 100,
    pD: pD / t * 100,
    pA: pA / t * 100
  };
};

// Semente → atk/def. O que a semente transmite é a AMPLITUDE (via targetRatio, limitada
// por maxSpread) e as distâncias relativas; ver REPORT §3 do brasileiro-2026.
export const initLeague = (times, getElo, cfg) => {
  const elos = times.map(t => getElo(t));
  const mean = elos.reduce((s, e) => s + e, 0) / elos.length;
  const mx = Math.max(...elos),
    mn = Math.min(...elos);
  const rawSpread = mx === mn ? 1 : Math.log(cfg.targetRatio) / Math.log(mx / mn);
  const spread = Math.min(rawSpread, cfg.maxSpread || 5.0);
  const rA = times.map(t => Math.pow(getElo(t) / mean, spread)),
    rD = times.map(t => Math.pow(mean / getElo(t), spread));
  const aA = rA.reduce((s, v) => s + v, 0) / rA.length,
    aD = rD.reduce((s, v) => s + v, 0) / rD.length;
  return {
    mean,
    spread,
    aA,
    aD,
    initAD: elo => ({
      atk: Math.pow(elo / mean, spread) / aA,
      def: Math.pow(mean / elo, spread) / aD
    })
  };
};

// λ de cada lado. eo=false é o modo ATK/DEF (o que o app roda e o que o eval mediu);
// eo=true é o modo Elo puro, mantido só por fidelidade.
export const calcL = (aC, dC, aF, dF, eC, eF, mc, mf, ha, eo, c0p) => {
  if (eo) {
    const d = eC + ha - eF;
    const e = 1 / (1 + Math.pow(10, -d / 400));
    let c0 = 0.5;
    if (c0p && c0p.on) {
      c0 = c0p.cMax - (c0p.cMax - c0p.cMin) / (1 + Math.exp(-(Math.abs(d) - c0p.mid) / c0p.steep));
    }
    const c1 = 2 * (1 - c0);
    return {
      lC: mc * (c0 + c1 * e),
      lF: mf * (c0 + c1 * (1 - e))
    };
  }
  return {
    lC: Math.max(0.2, Math.min(4.5, mc * aC * dF)),
    lF: Math.max(0.15, Math.min(4.0, mf * aF * dC))
  };
};

// Atualiza Elo e atk/def depois de um jogo. No modo ATK/DEF o Elo corrente evolui em
// trilho próprio e não volta para λ (REPORT §1) — está aqui porque o original o mantém.
export const updR = (elos, atk, def_, c, f, gc, gf, lC, lF, cfg, ak, eo) => {
  const ap = cfg.alphas[ak];
  const d = elos[c] + cfg.homeAdv - elos[f];
  const ex = 1 / (1 + Math.pow(10, -d / 400));
  const r = gc > gf ? 1 : gc === gf ? 0.5 : 0;
  const mg = Math.log(Math.abs(gc - gf) + 1);
  const dt = ap.kElo * (1 + mg * 0.5) * (r - ex);
  elos[c] += dt;
  elos[f] -= dt;
  if (!eo) {
    const sAC = lC > 0.01 ? (gc - lC) / lC : 0,
      sDC = lF > 0.01 ? (gf - lF) / lF : 0;
    atk[c] = Math.max(0.3, Math.min(3, atk[c] * (1 + ap.atk * suavLog(sAC))));
    def_[c] = Math.max(0.3, Math.min(3, def_[c] * (1 + ap.def * suavLog(sDC))));
    const sAF = lF > 0.01 ? (gf - lF) / lF : 0,
      sDF = lC > 0.01 ? (gc - lC) / lC : 0;
    atk[f] = Math.max(0.3, Math.min(3, atk[f] * (1 + ap.atk * suavLog(sAF))));
    def_[f] = Math.max(0.3, Math.min(3, def_[f] * (1 + ap.def * suavLog(sDF))));
  }
};

// Gols esperados por lado a partir de {total, pesoCasa}.
export const mlDe = l => ({
  mc: l.total * l.pesoCasa,
  mf: l.total * (1 - l.pesoCasa)
});
