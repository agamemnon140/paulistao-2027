// Coleta temporadas da fonte oficial da FPF e grava em data/fpf/<sigla>/<ano>.json.
//
//   node scripts/coletar_fpf.mjs --comp A1,A2 --anos 2022-2026
//
// Para cada temporada: baixa todas as rodadas (liga e mata-mata), traduz os nomes pela
// tabela data/nomes_fpf.json, confere a integridade e, quando existe classificação
// publicada em data/referencia/, reconcilia a 1ª fase contra ela. Sai com código 1 se
// alguma temporada não fechar — dado que não fecha não entra no backtest.
//
// Não usa modelo de linguagem em nenhum passo: é leitura de JSON e aritmética.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coletarTemporada, aplicarNomes, classificar, reconciliar, COMPETICOES } from './fpf.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (nome, padrao) => {
  const i = process.argv.indexOf('--' + nome);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};
const siglas = arg('comp', 'A1,A2').split(',').map(s => s.trim()).filter(Boolean);
const [a0, a1] = arg('anos', '2022-2026').split('-').map(Number);
const anos = [];
for (let a = a0; a <= (a1 || a0); a++) anos.push(a);
const SAIDA = path.resolve(RAIZ, arg('saida', 'data/fpf'));

const lerJson = (p, padrao) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : padrao);
const apelidos = lerJson(path.join(RAIZ, 'data', 'nomes_fpf.json'), { nomes: {} }).nomes;
const referencia = lerJson(path.join(RAIZ, 'data', 'referencia', 'classificacao_1a_fase.json'), {});

let falhas = 0;
const todosDesconhecidos = new Set();
for (const sigla of siglas) {
  if (!COMPETICOES[sigla]) { console.error(`::error::competição desconhecida: ${sigla}`); process.exit(2); }
  for (const ano of anos) {
    let t;
    try {
      t = await coletarTemporada({ sigla, ano });
    } catch (e) {
      console.error(`::error::${sigla} ${ano}: ${e.message}`);
      falhas++;
      continue;
    }
    if (!t.jogos.length) { console.log(`${sigla} ${ano}: sem jogos publicados.`); continue; }
    const { jogos, desconhecidos } = aplicarNomes(t.jogos, apelidos);
    desconhecidos.forEach(n => todosDesconhecidos.add(n));
    const comPlacar = jogos.filter(j => j.gc !== null).length;
    const fases = [...new Set(jogos.map(j => `${j.numFase}:${j.fase}`))].join(', ');
    console.log(`${sigla} ${ano}: ${jogos.length} jogos (${comPlacar} com placar) em ${t.rodadas.length} rodadas. Fases: ${fases}`);

    const ref = referencia[ano] && referencia[ano][sigla];
    if (ref) {
      const div = reconciliar(classificar(jogos.filter(j => j.numFase === 1)), ref.tabela);
      if (div.length) {
        falhas++;
        console.error(`::error::${sigla} ${ano}: 1ª fase NÃO fecha com a classificação publicada (${ref.fonte}):`);
        div.slice(0, 20).forEach(d => console.error('  ' + d));
      } else {
        console.log(`${sigla} ${ano}: 1ª fase fecha com a classificação publicada (${ref.tabela.length} clubes).`);
      }
    } else {
      console.log(`${sigla} ${ano}: sem classificação de referência — coleta gravada sem reconciliação.`);
    }

    const destino = path.join(SAIDA, sigla, `${ano}.json`);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify({ fonte: t.fonte, sigla, ano, rodadas: t.rodadas, jogos }, null, 1) + '\n');
  }
}
if (todosDesconhecidos.size) {
  console.log(`::warning::Nomes da FPF fora de data/nomes_fpf.json (gravados como vieram): ${[...todosDesconhecidos].sort().join(' | ')}`);
}
process.exit(falhas ? 1 : 0);
