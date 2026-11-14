// Configuração padrão do MODELO, copiada do DEFAULT_CFG do brasileiro-2026 (v4.89), menos
// o bloco `lambdas`, que lá é por série nacional. Aqui gols esperados e peso do mando são
// propriedade de cada competição (ver engine/competicoes.mjs quando existir) e só mudam
// com evidência do backtest.
export const CFG_MODELO = {
  targetRatio: 3.0,
  homeAdv: 100,
  drift: 15,
  defaultAlpha: 'conservador',
  alphas: {
    conservador: { atk: 0.05, def: 0.08, kElo: 16, label: 'Conservador' },
    base: { atk: 0.10, def: 0.16, kElo: 32, label: 'Base' },
    agressivo: { atk: 0.20, def: 0.32, kElo: 48, label: 'Agressivo' }
  },
  mnMM: 1.35,
  maxSpread: 5.0,
  c0Log: { on: false, cMax: 0.50, cMin: 0.10, mid: 190, steep: 70 }
};
