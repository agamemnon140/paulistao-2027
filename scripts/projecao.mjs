// Projeção de 2027: sementes, simulação e o registro que vai para o arquivo de previsões.
//
// Funções puras sobre data/ e engine/; a linha de comando está em scripts/projetar.mjs.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CFG_MODELO } from '../engine/config.mjs';
import { postosNacionais, notaBrasileiro, elosDaNota } from '../engine/semente.mjs';
import { montarEntradas, projetarCom } from '../app/projecao.js';
import { nacionalPorAno } from './nacional.mjs';

export const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SIGLAS = ['A1', 'A2'];
export const ARQ_SEMENTES = 'data/2027/sementes.json', ARQ_PREVISOES = 'predictions.jsonl';
export const N_SIMS = 20000, SEMENTE_RNG = 2027;

const ler = rel => JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
export const lerCompeticao = sigla => ler(`data/2027/${sigla.toLowerCase()}.json`);
export const lerSementes = () => ler(ARQ_SEMENTES);

// Sementes das duas divisões a partir da colocação nacional do ano anterior. O resultado é
// o conteúdo de data/2027/sementes.json: o app lê esse arquivo, não a Wikipedia.
export function sementes2027() {
  const { nac, lidoEm } = nacionalPorAno();
  const saida = { _obs: 'Gerado por `node scripts/projetar.mjs --sementes`; não editar. Elo de partida de cada clube, pela colocação nacional do ano anterior (engine/semente.mjs).' };
  for (const sigla of SIGLAS) {
    const comp = lerCompeticao(sigla), s = comp.semente, anoBase = comp.ano - 1;
    if (s.tipo !== 'brasileiro') throw new Error(`${sigla}: semente ${s.tipo} não implementada`);
    const { posto } = postosNacionais(comp.times, nac[anoBase]), { nota } = notaBrasileiro(comp.times, nac[anoBase], s.forma);
    const elo = elosDaNota(nota, comp.times);
    saida[sigla] = {
      tipo: s.tipo, forma: s.forma, razao: s.razao, anoBase, lidoEm: lidoEm[anoBase] ?? null, provisoria: s.provisoria,
      clubes: Object.fromEntries(comp.times.map(t => [t, { serie: nac[anoBase]?.[t]?.serie ?? null, pos: nac[anoBase]?.[t]?.pos ?? null, posto: posto[t], elo: +elo[t].toFixed(4) }]))
    };
  }
  return saida;
}
export const serializarSementes = s => JSON.stringify(s, null, 1) + '\n';

// O que entra na simulação de uma divisão, tudo num objeto só.
export function entradas(sigla, sementes = lerSementes()) {
  return montarEntradas(lerCompeticao(sigla), sementes[sigla]);
}

// Impressão digital do que determina o resultado: dados, sementes, configuração e o código
// do motor. Dois registros com a mesma impressão têm de ter as mesmas probabilidades.
export function impressao(sigla, { nS, seed, res = [] }, sementes = lerSementes()) {
  const h = crypto.createHash('sha256');
  h.update(JSON.stringify({ comp: lerCompeticao(sigla), semente: sementes[sigla], cfg: CFG_MODELO, nS, seed, res }));
  for (const arq of fs.readdirSync(path.join(RAIZ, 'engine')).filter(a => a.endsWith('.mjs')).sort()) h.update(arq + '\n' + fs.readFileSync(path.join(RAIZ, 'engine', arq), 'utf8'));
  return h.digest('hex').slice(0, 16);
}

export function projetar(sigla, { nS = N_SIMS, seed = SEMENTE_RNG, res = [], sementes = lerSementes() } = {}) {
  const e = entradas(sigla, sementes);
  return { ...projetarCom(e, { nS, seed, res }), entradas: e, seed };
}

// Uma linha do arquivo de previsões (docs/DECISOES.md, 15): o que o modelo dizia, quando,
// com que configuração. Percentuais com duas casas.
const c2 = x => +x.toFixed(2);
export function registro(sigla, r, { quando, res = [] }) {
  const { comp, semente, cfg } = r.entradas;
  return {
    v: 1, quando, competicao: sigla, ano: comp.ano,
    tipo: !comp.tabela ? 'pre-tabela' : res.length ? 'rodada' : 'tabela',
    jogosRealizados: res.length, tabelaOficial: !!comp.tabela,
    config: {
      semente: { tipo: semente.tipo, forma: semente.forma, razao: semente.razao, anoBase: semente.anoBase, lidoEm: semente.lidoEm, provisoria: semente.provisoria },
      gols: { liga: comp.gols.liga, mataMata: comp.gols.mataMata }, preset: cfg.defaultAlpha, drift: cfg.drift,
      formato: comp.formato, premissas: comp.premissas
    },
    nS: r.nSims, rng: `mulberry32(${r.seed})`, entradas: impressao(sigla, { nS: r.nSims, seed: r.seed, res }, { [sigla]: semente }),
    times: Object.fromEntries(r.probs.map(p => [p.time, {
      elo: semente.clubes[p.time].elo, mediaPts: c2(p.mediaPts), classificado: c2(p.classificado), rebaixado: c2(p.rebaixado),
      semi: c2(p.semi), final: c2(p.final), titulo: c2(p.titulo), vice: c2(p.vice), ...(p.acesso === null ? {} : { acesso: c2(p.acesso) }),
      posF: p.posF.map(c2)
    }]))
  };
}

export const lerPrevisoes = () => (fs.existsSync(path.join(RAIZ, ARQ_PREVISOES)) ? fs.readFileSync(path.join(RAIZ, ARQ_PREVISOES), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []);
