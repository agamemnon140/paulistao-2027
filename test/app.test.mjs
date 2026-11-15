// O app montado em texto, sem navegador: cada seção de cada divisão tem de renderizar com
// dados de verdade, sem erro e sem número quebrado. O visual é conferido no navegador.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// Dentro de node_modules para que o pacote gerado ache o React; não vai para o git.
const SAIDA = path.join(RAIZ, 'node_modules', '.paulistao-ssr');
await build({ configFile: path.join(RAIZ, 'vite.config.js'), logLevel: 'silent', build: { ssr: path.join(RAIZ, 'app', 'ssr.jsx'), outDir: SAIDA, emptyOutDir: true } });
const app = await import(pathToFileURL(path.join(SAIDA, 'ssr.js')).href);

const resultadoDe = sigla => { const { geralTrace, ...r } = app.projetarCom(app.ENTRADAS[sigla], { nS: 400, seed: 2027 }); return r; };
const texto = html => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

test('cada seção de cada divisão renderiza com dados reais', () => {
  for (const sigla of app.SIGLAS) {
    const resultado = resultadoDe(sigla);
    for (const aba of app.ABAS.filter(a => !a.so || a.so === sigla)) {
      const t = texto(app.renderizar({ sigla, aba: aba.id, resultado }));
      assert.ok(!/undefined|NaN|\[object/.test(t), `${sigla} ${aba.id}: valor quebrado em "${(t.match(/.{30}(undefined|NaN|\[object).{30}/) || [''])[0]}"`);
      assert.ok(t.includes('Paulistão 2027') && t.includes(`Série ${sigla}`), `${sigla} ${aba.id}: cabeçalho`);
      assert.ok(app.ENTRADAS[sigla].comp.times.some(c => t.includes(c)), `${sigla} ${aba.id}: nenhum clube na tela`);
    }
  }
});

test('projeção: os 16 clubes, as colunas da divisão e a matriz de posições', () => {
  const a1 = texto(app.renderizar({ sigla: 'A1', aba: 'projecao', resultado: resultadoDe('A1') }));
  for (const c of app.ENTRADAS.A1.comp.times) assert.ok(a1.includes(c), c);
  for (const col of ['Entre os 8', 'Semi', 'Final', 'Título', 'Queda']) assert.ok(a1.includes(col), col);
  assert.ok(a1.includes('A 2º') && a1.includes('sem série'), 'posição no Brasileiro ao lado do clube');
  assert.ok(a1.includes('Em que posição cada um termina') && a1.includes('Quantos pontos bastam') && a1.includes('Tema escuro'));
  const html = app.renderizar({ sigla: 'A1', aba: 'projecao', resultado: resultadoDe('A1') });
  for (const zona of ['chance bom', 'chance neutro', 'chance ruim']) assert.ok(html.includes(zona), `matriz por zona: ${zona}`);
  const a2 = texto(app.renderizar({ sigla: 'A2', aba: 'projecao', resultado: resultadoDe('A2') }));
  assert.ok(a2.includes('Acesso') && !a2.includes('Sorteio'), 'na A2 a coluna é acesso e não há aba de sorteio');
  assert.ok(a1.includes('Sorteio'));
});

test('sem resultado, a projeção avisa que está simulando; as outras seções não esperam', () => {
  assert.ok(texto(app.renderizar({ sigla: 'A1', aba: 'projecao' })).includes('Simulando 10.000 temporadas'));
  assert.ok(texto(app.renderizar({ sigla: 'A1', aba: 'temporada' })).includes('1ª fase'));
  assert.ok(texto(app.renderizar({ sigla: 'A1', aba: 'sorteio' })).includes('Força média dos adversários'));
});

test('aviso de provisório, evolução com o arquivo e premissas na tela', () => {
  const sobre = texto(app.renderizar({ sigla: 'A2', aba: 'sobre' }));
  assert.ok(sobre.includes('Projeção provisória') && sobre.includes('14/11/2026'));
  assert.ok(sobre.includes('Sobem os dois finalistas') && sobre.includes('55% do mandante'));
  const evo = texto(app.renderizar({ sigla: 'A1', aba: 'evolucao' }));
  assert.ok(app.PREVISOES.length >= 2 && evo.includes('antes da tabela') && evo.includes('14/11/2026'), 'o primeiro registro aparece com a data de São Paulo');
});

test('uma temporada: 16 clubes na classificação, quatro quartas, duas semis e uma final', () => {
  for (const sigla of app.SIGLAS) {
    const T = app.umaTemporada(app.ENTRADAS[sigla], 7);
    assert.deepEqual([T.cl.length, T.quartas.length, T.semis.length], [16, 4, 2]);
    assert.equal(T.final.jogos.length, 2);
    assert.equal(T.quartas[0].jogos.length, sigla === 'A1' ? 1 : 2);
    assert.deepEqual(app.umaTemporada(app.ENTRADAS[sigla], 7).cl, T.cl, 'mesma semente, mesma temporada');
  }
});
