// Decodifica a transferência de 14/11/2026 (data/fpf/_transferencia/) nos arquivos de
// temporada data/fpf/<sigla>/<ano>.json, no mesmo formato que scripts/coletar_fpf.mjs grava.
//
//   node scripts/decodificar_transferencia.mjs
//
// Por que existe: o site da FPF responde 403 ao runner do GitHub, então a primeira coleta
// foi feita num navegador e trazida como texto compacto. Este script é determinístico e
// confere três hashes calculados no navegador antes de decodificar; rodar de novo produz
// exatamente os mesmos arquivos.
//
// O que a transferência NÃO traz (e os arquivos gerados marcam como ausente): IdJogo, data
// e hora, estádio. Quando o coletor rodar de uma máquina que a FPF aceite, ele sobrescreve
// estes arquivos com o registro completo, e os placares têm de coincidir.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { aplicarNomes, classificar, reconciliar } from './fpf.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(RAIZ, 'data', 'fpf', '_transferencia');
const sha = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const ler = p => JSON.parse(fs.readFileSync(p, 'utf8'));

export function decodificar(texto, tab) {
  if (sha(texto) !== tab.sha256.texto) throw new Error('hash do texto não confere');
  if (sha(JSON.stringify(tab.nomes)) !== tab.sha256.nomes) throw new Error('hash da tabela de nomes não confere');
  if (sha(JSON.stringify(tab.grupos)) !== tab.sha256.grupos) throw new Error('hash da tabela de grupos não confere');
  const temporadas = [];
  let atual = null;
  for (const linha of texto.split('\n')) {
    if (linha.startsWith('#')) {
      const m = /^#(A\d)(\d{4}) (\d+)$/.exec(linha);
      if (!m) throw new Error('cabeçalho inválido: ' + linha);
      atual = { sigla: m[1], ano: Number(m[2]), esperado: Number(m[3]), jogos: [] };
      temporadas.push(atual);
      continue;
    }
    for (const t of linha.split(' ')) {
      if (!/^[0-9a-z]{10}$/.test(t)) throw new Error('jogo inválido: ' + t);
      const n = (i, w) => parseInt(t.slice(i, i + w), 36);
      const gol = c => (c === 'z' ? null : parseInt(c, 36));
      const casaFpf = tab.nomes[n(4, 2)], foraFpf = tab.nomes[n(6, 2)], grupo = tab.grupos[n(2, 2)];
      if (casaFpf === undefined || foraFpf === undefined || grupo === undefined) throw new Error('índice fora da tabela: ' + t);
      atual.jogos.push({ rodada: n(0, 1), numFase: n(1, 1), grupo, casaFpf, foraFpf, gc: gol(t[8]), gf: gol(t[9]) });
    }
  }
  for (const t of temporadas) if (t.jogos.length !== t.esperado) throw new Error(`${t.sigla} ${t.ano}: ${t.jogos.length} jogos, cabeçalho diz ${t.esperado}`);
  return temporadas;
}

// Nome da fase por número. Só a A2 de 2026 teve 2ª fase em grupos no lugar das quartas.
export const nomeFase = (sigla, ano, numFase) =>
  ({ 1: 'PRIMEIRA FASE', 2: sigla === 'A2' && ano === 2026 ? 'SEGUNDA FASE' : 'QUARTAS DE FINAL', 3: 'SEMIFINAL', 4: 'FINAL' })[numFase];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const texto = fs.readFileSync(path.join(DIR, '2026-11-14.txt'), 'utf8').replace(/\n$/, '');
  const temporadas = decodificar(texto, ler(path.join(DIR, 'tabelas.json')));
  const apelidos = ler(path.join(RAIZ, 'data', 'nomes_fpf.json')).nomes;
  const referencia = ler(path.join(RAIZ, 'data', 'referencia', 'classificacao_1a_fase.json'));
  let falhas = 0;
  for (const t of temporadas) {
    const { jogos, desconhecidos } = aplicarNomes(t.jogos, apelidos);
    if (desconhecidos.length) { falhas++; console.error(`${t.sigla} ${t.ano}: nomes fora da tabela: ${desconhecidos.join(', ')}`); }
    const completos = jogos.map(j => ({
      id: null, rodada: j.rodada, fase: nomeFase(t.sigla, t.ano, j.numFase), numFase: j.numFase, grupo: j.grupo, quando: null,
      casaFpf: j.casaFpf, foraFpf: j.foraFpf, casa: j.casa, fora: j.fora, gc: j.gc, gf: j.gf
    }));
    const fase1 = completos.filter(j => j.numFase === 1);
    const tabela = classificar(fase1);
    const porClube = [...new Set(tabela.map(x => x.J))];
    let nota = `${tabela.length} clubes, ${fase1.length} jogos na 1ª fase (${porClube.join('/')} por clube), ${completos.length - fase1.length} no mata-mata`;
    const ref = referencia[t.ano] && referencia[t.ano][t.sigla];
    if (ref) {
      const div = reconciliar(tabela, ref.tabela);
      if (div.length) { falhas++; nota += ` — NÃO fecha: ${div.slice(0, 6).join(' | ')}`; } else nota += ' — fecha com a classificação publicada';
    }
    console.log(`${t.sigla} ${t.ano}: ${nota}`);
    const destino = path.join(RAIZ, 'data', 'fpf', t.sigla, `${t.ano}.json`);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify({
      fonte: 'futebolpaulista.com.br', via: 'navegador, 14/11/2026 (transferência com hash; sem id, data e estádio)',
      sigla: t.sigla, ano: t.ano, rodadas: [...new Set(completos.map(j => j.rodada))].sort((a, b) => a - b), jogos: completos
    }, null, 1) + '\n');
  }
  process.exit(falhas ? 1 : 0);
}
