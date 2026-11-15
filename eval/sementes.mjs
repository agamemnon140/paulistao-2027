// Sementes candidatas. Cada uma devolve, para os times de uma temporada, uma NOTA em que
// maior = mais forte. A nota só carrega ORDEM e distâncias relativas: a amplitude (quanto
// o melhor é mais forte que o pior) é um parâmetro separado, aplicado em `elos`.
//
// Todas usam apenas informação disponível ANTES do campeonato do ano Y:
//   - iguais       todos com a mesma nota (o piso de comparação)
//   - divisao      série nacional que o clube disputa no ano Y (A=4 ... D=1, nenhuma=0)
//   - brasileiro   colocação nacional no ano Y−1, na escada global do brasileiro-2026
//                  (A começa em 1, B em 17, C em 33, D em 49); sem série nacional = um
//                  degrau abaixo do pior do grupo
//   - brasileiroRaiz, brasileiroLog   a mesma colocação nacional, com o posto passado por
//                  raiz quadrada ou logaritmo: os degraus do topo valem mais
//   - paulista     colocação estadual na 1ª fase do ano Y−1 (A1 começa em 1, A2 em 15, A3
//                  em 29: o degrau de 14 faz os 2 que sobem valerem os 2 que caem)
//   - composta     média das notas `brasileiro` e `paulista`, cada uma posta em 0..1

import { postosNacionais, elosDaNota, FORMAS, ELO_MIN, ELO_MAX } from '../engine/semente.mjs';

const NIVEL = { A: 4, B: 3, C: 2, D: 1 };
const DEGRAU_EST = { A1: 0, A2: 14, A3: 28 };

const em01 = (vals) => {
  const mn = Math.min(...vals), mx = Math.max(...vals);
  return vals.map(v => (mx === mn ? 0.5 : (v - mn) / (mx - mn)));
};

export function notas(ano, times, escadas, nac) {
  const antes = ano - 1;
  const divisao = times.map(t => NIVEL[nac[ano]?.[t]?.serie] ?? 0);

  // `brasileiro` é a semente escolhida: a conta mora em engine/semente.mjs, a mesma do app.
  const { posto, semSerie: semNacional } = postosNacionais(times, nac[antes]);
  const brasileiro = times.map(t => -posto[t]);

  const postoEst = times.map(t => {
    for (const d of ['A1', 'A2', 'A3']) {
      const i = (escadas[antes]?.[d] || []).indexOf(t);
      if (i >= 0) return DEGRAU_EST[d] + i + 1;
    }
    return null;
  });
  const semEscada = times.filter((_, i) => postoEst[i] === null);
  const piorEst = Math.max(0, ...postoEst.filter(p => p !== null)) + 1;
  const paulista = postoEst.map(p => -(p ?? piorEst));

  const b = em01(brasileiro), p = em01(paulista);
  const tab = v => Object.fromEntries(times.map((t, i) => [t, v[i]]));
  return {
    notas: {
      iguais: tab(times.map(() => 0)), divisao: tab(divisao), brasileiro: tab(brasileiro),
      brasileiroRaiz: tab(times.map(t => FORMAS.raiz(posto[t]))), brasileiroLog: tab(times.map(t => FORMAS.log(posto[t]))),
      paulista: tab(paulista), composta: tab(b.map((x, i) => (x + p[i]) / 2))
    },
    semNacional,
    semEscada
  };
}

// Nota -> Elo de partida (engine/semente.mjs). Com maxSpread solto, quem manda na amplitude
// é só `razao`: a razão de força de ataque entre a melhor e a pior semente.
export { ELO_MIN, ELO_MAX };
export const elos = elosDaNota;
