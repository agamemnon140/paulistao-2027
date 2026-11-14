// PRNG semeado. É o mesmo gerador (mulberry32) que o eval/ do brasileiro-2026 usa em
// `semear`, para que uma semente produza a MESMA sequência nos dois repositórios — é isso
// que permite o teste de paridade comparar simulações inteiras, e não só funções puras.
//
// O motor nunca chama Math.random direto: toda função estocástica recebe `rnd` e usa
// Math.random apenas como padrão. Reprodutibilidade deixa de exigir trocar um global.
export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
