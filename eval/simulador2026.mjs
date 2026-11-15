// O simulador do Paulistão de 2026 (simulador_paulista_v9.jsx, guardado no Projeto) semeava
// o A1 com o ranking do Chance de Gol de janeiro de 2026. Aqui ele vira mais uma semente,
// para medir nos jogos de 2026 o que mudou de lá para cá. Nomes já nos canônicos daqui.
export const CHANCE_DE_GOL_2026 = {
  'Palmeiras': 1.9369, 'Mirassol': 1.6841, 'Corinthians': 1.3038, 'Santos': 1.2227, 'São Paulo': 0.9920,
  'Red Bull Bragantino': 0.7673, 'Ponte Preta': 0.7051, 'Novorizontino': 0.5703, 'São Bernardo': 0.3948,
  'Velo Clube': 0.3328, 'Guarani': 0.3276, 'Portuguesa-SP': 0.2616, 'Noroeste': 0.1569,
  'Botafogo-SP': -0.1391, 'Primavera-SP': -0.1280,
  'Capivariano': -0.1391 - 0.3   // sem nota no ranking: lá entrava como o menor valor menos 0,3
};

// Amplitude que o v9 produzia: Elo = 1500 + 200 × nota, ataque = 10^(0,30 × ΔElo / 400).
const notas = Object.values(CHANCE_DE_GOL_2026);
export const AMPLITUDE_V9 = +Math.pow(10, 0.30 * 200 * (Math.max(...notas) - Math.min(...notas)) / 400).toFixed(2);

// Correlação de postos entre duas notas sobre os mesmos times.
export function spearman(a, b, times) {
  const posto = o => { const s = times.slice().sort((x, y) => o[y] - o[x]); return Object.fromEntries(s.map((x, i) => [x, i + 1])); };
  const ra = posto(a), rb = posto(b), n = times.length;
  return 1 - (6 * times.reduce((s, x) => s + (ra[x] - rb[x]) ** 2, 0)) / (n * (n * n - 1));
}
