// Guarda do histórico 2022–2026: os arquivos em data/fpf/ têm de ser exatamente o que a
// transferência com hash decodifica, e têm de fechar por dentro e contra o que foi publicado.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decodificar, nomeFase } from '../scripts/decodificar_transferencia.mjs';
import { aplicarNomes, classificar, reconciliar } from '../scripts/fpf.mjs';

const caminho = rel => fileURLToPath(new URL(rel, import.meta.url));
const ler = rel => JSON.parse(fs.readFileSync(caminho(rel), 'utf8'));
const texto = fs.readFileSync(caminho('../data/fpf/_transferencia/2026-11-14.txt'), 'utf8').replace(/\n$/, '');
const tab = ler('../data/fpf/_transferencia/tabelas.json');
const apelidos = ler('../data/nomes_fpf.json').nomes;
const referencia = ler('../data/referencia/classificacao_1a_fase.json');
const temporadas = decodificar(texto, tab);

test('a transferência confere com os hashes calculados no navegador', () => {
  assert.equal(temporadas.length, 10);
  assert.equal(temporadas.reduce((s, t) => s + t.jogos.length, 0), 1184);
  assert.throws(() => decodificar(texto.replace('110p020r00', '110p020r01'), tab), /hash do texto/);
  assert.throws(() => decodificar(texto, { ...tab, nomes: [...tab.nomes].reverse() }), /nomes/);
});

test('todo nome da FPF tem canônico, e dois nomes só se fundem dentro do mesmo clube', () => {
  for (const n of tab.nomes) assert.ok(apelidos[n], `sem canônico: ${n}`);
  for (const t of temporadas) {
    const { jogos, desconhecidos } = aplicarNomes(t.jogos, apelidos);
    assert.deepEqual(desconhecidos, []);
    // Numa temporada, cada canônico vem de um único nome da FPF (senão fundimos dois clubes).
    const origem = {};
    for (const j of jogos) for (const [fpf, can] of [[j.casaFpf, j.casa], [j.foraFpf, j.fora]]) {
      origem[can] ??= fpf;
      assert.equal(origem[can], fpf, `${t.sigla} ${t.ano}: ${can} aparece como "${origem[can]}" e "${fpf}"`);
    }
  }
});

test('cada temporada fecha por dentro: 16 clubes e o número certo de jogos por clube', () => {
  for (const t of temporadas) {
    const { jogos } = aplicarNomes(t.jogos, apelidos);
    const fase1 = classificar(jogos.filter(j => j.numFase === 1));
    const esperado = t.sigla === 'A2' ? 15 : t.ano === 2026 ? 8 : 12;
    assert.equal(fase1.length, 16, `${t.sigla} ${t.ano}: clubes`);
    for (const x of fase1) assert.equal(x.J, esperado, `${t.sigla} ${t.ano} ${x.time}: jogos na 1ª fase`);
    assert.ok(jogos.every(j => j.gc !== null && j.gf !== null), `${t.sigla} ${t.ano}: jogo sem placar`);
  }
});

test('2026 fecha com as classificações publicadas, nas duas divisões', () => {
  for (const sigla of ['A1', 'A2']) {
    const t = temporadas.find(x => x.sigla === sigla && x.ano === 2026);
    const { jogos } = aplicarNomes(t.jogos, apelidos);
    assert.deepEqual(reconciliar(classificar(jogos.filter(j => j.numFase === 1)), referencia['2026'][sigla].tabela), [], sigla);
  }
});

test('os arquivos de data/fpf/ são exatamente o que a transferência decodifica', () => {
  for (const t of temporadas) {
    const arq = ler(`../data/fpf/${t.sigla}/${t.ano}.json`);
    const { jogos } = aplicarNomes(t.jogos, apelidos);
    assert.equal(arq.jogos.length, jogos.length);
    jogos.forEach((j, k) => {
      const a = arq.jogos[k];
      assert.deepEqual(
        [a.rodada, a.numFase, a.fase, a.grupo, a.casaFpf, a.foraFpf, a.casa, a.fora, a.gc, a.gf],
        [j.rodada, j.numFase, nomeFase(t.sigla, t.ano, j.numFase), j.grupo, j.casaFpf, j.foraFpf, j.casa, j.fora, j.gc, j.gf],
        `${t.sigla} ${t.ano} jogo ${k}`
      );
    });
  }
});

test('finais conhecidas conferem (sanidade contra troca de índice)', () => {
  const final = (sigla, ano) => ler(`../data/fpf/${sigla}/${ano}.json`).jogos.filter(j => j.numFase === 4 && !/^\d+$/.test(j.grupo)).map(j => `${j.casa} ${j.gc}x${j.gf} ${j.fora}`);
  assert.deepEqual(final('A1', 2026), ['Palmeiras 1x0 Novorizontino', 'Novorizontino 1x2 Palmeiras']);
  assert.deepEqual(final('A1', 2022), ['São Paulo 3x1 Palmeiras', 'Palmeiras 4x0 São Paulo']);
});
