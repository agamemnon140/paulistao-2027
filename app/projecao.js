// O que o app e a linha de comando fazem com o motor, sem nada de Node nem de navegador:
// montar as entradas de uma divisão, rodar o Monte Carlo e simular uma temporada só.

import { CFG_MODELO } from '../engine/config.mjs';
import { comAmplitude } from '../engine/semente.mjs';
import { initLeague } from '../engine/core.mjs';
import { simMCPaulista, simTemporada, rodadasProvisorias } from '../engine/paulista.mjs';
import { mulberry32 } from '../engine/rng.mjs';

// `comp` é data/2027/<divisão>.json; `semente` é a entrada da divisão em sementes.json.
export const montarEntradas = (comp, semente) => ({ comp, semente, getElo: t => semente.clubes[t].elo, cfg: comAmplitude(CFG_MODELO, semente.razao) });

export function projetarCom(e, { nS, seed, res = [] }) {
  return simMCPaulista({ comp: e.comp, getElo: e.getElo, cfg: e.cfg, res, nS, rnd: mulberry32(seed) });
}

// Uma temporada inteira, do primeiro jogo à final, com a semente aleatória dada.
export function umaTemporada(e, seed, res = []) {
  const rnd = mulberry32(seed), lg = initLeague(e.comp.times, e.getElo, e.cfg);
  const rodadaDe = e.comp.tabela ? null : rodadasProvisorias(e.comp.times, e.comp.confrontos, rnd);
  return simTemporada({ comp: e.comp, getElo: e.getElo, cfg: e.cfg, ak: e.cfg.defaultAlpha, lg, res, rodadaDe, rnd });
}
