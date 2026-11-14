// Leitor da FPF: tudo aqui roda sem rede. O que depende do site de verdade (o runner ser
// aceito, a forma de um jogo ainda não disputado) NÃO está coberto e está listado no README.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as F from '../scripts/fpf.mjs';

const ler = rel => JSON.parse(fs.readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
const amostra = ler('./fixtures/fpf_listar_tabela_a1_2026_r9.json');
const apelidos = ler('../data/nomes_fpf.json').nomes;
const referencia = ler('../data/referencia/classificacao_1a_fase.json');

test('URLs são as que a página da FPF chama', () => {
  assert.equal(F.urlRodadas('A1', 2026), 'https://www.futebolpaulista.com.br/Handlers/Competicoes/ListarRodadas.ashx?IdCampeonato=73&Ano=2026&IdCategoria=39');
  assert.equal(F.urlTabela('A2', 2022, 1), 'https://www.futebolpaulista.com.br/Handlers/Competicoes/ListarTabela.ashx?IdCampeonato=74&Ano=2022&Rodada=1&IdClube=0&IdCategoria=44');
  assert.throws(() => F.urlTabela('A9', 2026, 1), /desconhecida/);
});

test('normaliza os jogos da amostra', () => {
  const jogos = F.extrairJogos(amostra);
  assert.equal(jogos.length, 4);
  const pc = jogos.find(j => j.id === 82341);
  assert.deepEqual(
    { casaFpf: pc.casaFpf, foraFpf: pc.foraFpf, gc: pc.gc, gf: pc.gf, rodada: pc.rodada, fase: pc.fase, grupo: pc.grupo, quando: pc.quando, adiado: pc.adiado },
    { casaFpf: 'Portuguesa SAF', foraFpf: 'Corinthians', gc: 1, gf: 1, rodada: 9, fase: 'QUARTAS DE FINAL', grupo: 'D', quando: '2026-02-22T20:30:00-03:00', adiado: false }
  );
});

test('placar ausente ou inválido vira null nos dois lados', () => {
  const base = amostra.Retorno.listTabela[0];
  for (const ruim of [null, undefined, '', '2', -1, 15, 1.5]) {
    const j = F.normalizarJogo({ ...base, ResultadoMandante: ruim });
    assert.deepEqual([j.gc, j.gf], [null, null], `ResultadoMandante=${JSON.stringify(ruim)}`);
  }
  assert.throws(() => F.normalizarJogo({ ...base, IdJogo: undefined }), /IdJogo/);
  assert.equal(F.normalizarJogo({ ...base, Fase: ' Primeira Fase ' }).fase, 'PRIMEIRA FASE');
});

test('data e hora viram ISO com fuso de São Paulo', () => {
  assert.equal(F.dataIso('10/01/2026', '15h00'), '2026-01-10T15:00:00-03:00');
  assert.equal(F.dataIso('08/03/2026', '9h30'), '2026-03-08T09:30:00-03:00');
  assert.equal(F.dataIso('08/03/2026', ''), '2026-03-08T00:00:00-03:00');
  assert.equal(F.dataIso('2026-03-08', '16h00'), null);
});

test('jogo só conta como encerrado três horas depois do início', () => {
  const j = F.extrairJogos(amostra).find(x => x.id === 82341);
  assert.equal(F.encerrado(j, new Date('2026-02-22T22:00:00-03:00')), false);
  assert.equal(F.encerrado(j, new Date('2026-02-22T23:30:00-03:00')), true);
  assert.equal(F.encerrado({ ...j, gc: null, gf: null }, new Date('2026-03-01T00:00:00-03:00')), false);
});

test('respostas fora do formato falham com barulho', () => {
  assert.throws(() => F.extrairJogos({ Sucesso: false, Mensagem: 'erro' }), /sem sucesso/);
  assert.throws(() => F.extrairJogos({ Sucesso: true, Retorno: {} }), /listTabela/);
  assert.throws(() => F.extrairRodadas(null), /sem sucesso/);
});

test('coletarTemporada junta as rodadas e recusa incoerências', async () => {
  const r9 = amostra;
  const r10 = { Sucesso: true, Retorno: { listTabela: [{ ...amostra.Retorno.listTabela[0], IdJogo: 90001, Rodada: 10, Fase: 'SEMIFINAL', NumFase: 3 }] } };
  const servidor = respostas => async url => {
    if (url.includes('ListarRodadas')) return { Sucesso: true, Retorno: [{ Rodada: 10 }, { Rodada: 9 }] };
    return respostas[/Rodada=(\d+)/.exec(url)[1]];
  };
  const t = await F.coletarTemporada({ sigla: 'A1', ano: 2026, buscarJson: servidor({ 9: r9, 10: r10 }), pausaMs: 0 });
  assert.deepEqual(t.rodadas, [9, 10]);
  assert.equal(t.jogos.length, 5);
  await assert.rejects(F.coletarTemporada({ sigla: 'A1', ano: 2026, buscarJson: servidor({ 9: r9, 10: r9 }), pausaMs: 0 }), /declara 9/);
  const repetido = { Sucesso: true, Retorno: { listTabela: [{ ...amostra.Retorno.listTabela[0], Rodada: 10 }] } };
  await assert.rejects(F.coletarTemporada({ sigla: 'A1', ano: 2026, buscarJson: servidor({ 9: r9, 10: repetido }), pausaMs: 0 }), /repetido/);
});

test('nomes: traduz os conhecidos e devolve os desconhecidos', () => {
  const { jogos, desconhecidos } = F.aplicarNomes(F.extrairJogos(amostra), apelidos);
  assert.deepEqual(jogos.map(j => j.casa), ['Red Bull Bragantino', 'Palmeiras', 'Novorizontino', 'Portuguesa-SP']);
  assert.deepEqual(desconhecidos, []);
  const r = F.aplicarNomes([{ casaFpf: 'Clube Novo', foraFpf: 'Santos' }], apelidos);
  assert.deepEqual(r.desconhecidos, ['Clube Novo']);
  assert.equal(r.jogos[0].casa, 'Clube Novo');
});

test('as classificações de referência são internamente coerentes', () => {
  for (const [ano, porComp] of Object.entries(referencia)) {
    if (ano.startsWith('_')) continue;
    for (const [sigla, { tabela }] of Object.entries(porComp)) {
      const rot = `${sigla} ${ano}`;
      const soma = k => tabela.reduce((s, x) => s + x[k], 0);
      const jogosPorClube = sigla === 'A1' ? 8 : 15;
      assert.equal(tabela.length, 16, rot);
      for (const x of tabela) {
        assert.equal(x.P, 3 * x.V + x.E, `${rot} ${x.time}: pontos`);
        assert.equal(x.V + x.E + x.D, jogosPorClube, `${rot} ${x.time}: jogos`);
      }
      assert.equal(soma('GP'), soma('GC'), `${rot}: gols pró = gols contra`);
      assert.equal(soma('V'), soma('D'), `${rot}: vitórias = derrotas`);
      assert.equal(soma('E') % 2, 0, `${rot}: empates em par`);
    }
  }
});

test('A1 2026: os 64 jogos reais fecham com a classificação publicada', () => {
  const { jogos } = ler('./fixtures/a1_2026_fase1.json');
  assert.equal(jogos.length, 64);
  const ref = referencia['2026'].A1.tabela;
  const tabela = F.classificar(jogos);
  assert.deepEqual(F.reconciliar(tabela, ref), []);
  assert.deepEqual(tabela.slice(0, 4).map(x => x.time), ['Novorizontino', 'Palmeiras', 'Red Bull Bragantino', 'Portuguesa-SP']);
  // O placar errado que o v9 carregava (3x0 em vez de 4x0) tem de aparecer como divergência.
  const errado = jogos.map(j => (j.casa === 'São Bernardo' && j.fora === 'Capivariano' ? { ...j, gc: 3 } : j));
  assert.deepEqual(F.reconciliar(F.classificar(errado), ref), ['Capivariano: GC coletado 9, publicado 10', 'São Bernardo: GP coletado 7, publicado 8']);
});

test('empate no mata-mata: classificado é quem aparece na fase seguinte', () => {
  const jogos = [
    { casa: 'Portuguesa-SP', fora: 'Corinthians', numFase: 2 },
    { casa: 'Novorizontino', fora: 'Corinthians', numFase: 3 },
    { casa: 'Palmeiras', fora: 'Novorizontino', numFase: 4 }
  ];
  assert.equal(F.classificadoPorFaseSeguinte(jogos, 'Portuguesa-SP', 'Corinthians', 2), 'Corinthians');
  assert.equal(F.classificadoPorFaseSeguinte(jogos, 'Palmeiras', 'Novorizontino', 4), null);
});
