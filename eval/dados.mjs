// Carrega o que o backtest precisa: os jogos de cada temporada, as escadas estaduais e a
// situação nacional de cada clube paulista. Só lê data/; não calcula nada de modelo.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classificar } from '../scripts/fpf.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = rel => JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));

export const ANOS = [2022, 2023, 2024, 2025, 2026];
export const SIGLAS = ['A1', 'A2'];

export function temporada(sigla, ano) {
  const t = ler(`data/fpf/${sigla}/${ano}.json`);
  // Ordem por código de caractere, não por localidade: a ordem dos times define a ordem das
  // somas no motor, e a do ICU muda entre versões do Node.
  const times = [...new Set(t.jogos.flatMap(j => [j.casa, j.fora]))].sort();
  return { sigla, ano, times, jogos: t.jogos };
}

// Posição na 1ª fase de cada divisão estadual, por ano: {2021: {A1: [time...], A2: [...], A3: [...]}}.
// 2022 em diante sai dos jogos (A1 e A2); 2021 e a A3 vêm das classificações transferidas.
export function escadasEstaduais() {
  const apelidos = ler('data/nomes_fpf.json').nomes;
  const esc = {};
  let atual = null;
  for (const linha of fs.readFileSync(path.join(RAIZ, 'data/fpf/_transferencia/classificacoes_1a_fase_extra.txt'), 'utf8').trim().split('\n')) {
    const m = /^#(A\d)(\d{4}) \d+$/.exec(linha);
    if (m) { atual = ((esc[m[2]] ||= {})[m[1]] = []); continue; }
    const nome = linha.slice(linha.indexOf('|') + 1);
    atual.push(apelidos[nome] ?? nome);
  }
  for (const ano of ANOS) for (const sigla of SIGLAS) {
    (esc[ano] ||= {})[sigla] = classificar(temporada(sigla, ano).jogos.filter(j => j.numFase === 1)).map(x => x.time);
  }
  return esc;
}

// Situação nacional: {2021: {clube: {serie, pos}}} para 2021–2025, e só a série para 2026.
export function nacional() {
  const C = ler('data/nacional/classificacoes_2021_2025.json').classificacoes;
  const P = ler('data/nacional/paulistas.json');
  const nac = {};
  for (const [chave, linhas] of Object.entries(C)) {
    const ano = chave.slice(0, 4), serie = chave[4];
    for (const x of linhas) if (P.apelidos[x.n]) (nac[ano] ||= {})[P.apelidos[x.n]] = { serie, pos: x.pos };
  }
  nac[2026] = {};
  for (const [serie, clubes] of Object.entries(P.divisao2026)) for (const c of clubes) nac[2026][c] = { serie, pos: null };
  return nac;
}
