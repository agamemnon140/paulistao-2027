// Leitura da fonte oficial da FPF.
//
// A página https://www.futebolpaulista.com.br/Competicoes/Tabela.aspx é alimentada por
// handlers JSON do próprio site (observado em 14/11/2026 inspecionando a rede no navegador):
//
//   Handlers/Competicoes/ListarRodadas.ashx?IdCampeonato=73&Ano=2026&IdCategoria=39
//   Handlers/Competicoes/ListarTabela.ashx?IdCampeonato=73&Ano=2026&Rodada=9&IdClube=0&IdCategoria=39
//
// Respondem {Codigo, Sucesso, Mensagem, Retorno, Total}; em ListarTabela, Retorno traz
// {listData, listRodada, listTabela} e cada item de listTabela é um jogo. Funcionam sem
// cookies. As rodadas incluem o mata-mata (A1 2026: 1-8 liga, 9 quartas, 10 semis, 11-12 final).
//
// O que este handler NÃO tem: pênaltis. Eles existem em Handlers/Placar/PlacarOnline.ashx
// (campos TemPenalti, PenaltisMandante, PenaltisVisitante), que exige um código por
// competição só visível com o campeonato em andamento. Até lá, quem avançou num empate de
// mata-mata se deduz de quem aparece na fase seguinte (ver `classificadoPorFaseSeguinte`).
//
// Medido em 14/11/2026: o site responde HTTP 403 a quem não é navegador — ao runner do
// GitHub Actions e a este coletor rodando num computador comum — e normalmente a um
// navegador. `buscarJsonPadrao` portanto não funciona hoje; as funções de normalização,
// conferência e reconciliação valem para qualquer caminho que traga o JSON.

export const FPF_BASE = 'https://www.futebolpaulista.com.br/Handlers/Competicoes/';

// IdCampeonato / IdCategoria, lidos de ListarTodosCampeonatosExercicio.ashx.
export const COMPETICOES = {
  A1: { idCampeonato: 73, idCategoria: 39, nome: 'Paulistão A1' },
  A2: { idCampeonato: 74, idCategoria: 44, nome: 'Paulistão A2' },
  A3: { idCampeonato: 76, idCategoria: 46, nome: 'Paulistão A3' },
  COPA_PAULISTA: { idCampeonato: 100, idCategoria: 70, nome: 'Copa Paulista' }
};

const comp = sigla => {
  const c = COMPETICOES[sigla];
  if (!c) throw new Error(`competição desconhecida: ${sigla}`);
  return c;
};

export const urlRodadas = (sigla, ano) =>
  `${FPF_BASE}ListarRodadas.ashx?IdCampeonato=${comp(sigla).idCampeonato}&Ano=${ano}&IdCategoria=${comp(sigla).idCategoria}`;

export const urlTabela = (sigla, ano, rodada) =>
  `${FPF_BASE}ListarTabela.ashx?IdCampeonato=${comp(sigla).idCampeonato}&Ano=${ano}&Rodada=${rodada}&IdClube=0&IdCategoria=${comp(sigla).idCategoria}`;

// "10/01/2026" + "15h00" -> "2026-01-10T15:00:00-03:00". São Paulo não tem horário de verão
// desde 2019, então o deslocamento é fixo.
export function dataIso(data, horario) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((data || '').trim());
  if (!m) return null;
  const h = /^(\d{1,2})h(\d{2})$/.exec((horario || '').trim());
  const hh = h ? h[1].padStart(2, '0') : '00', mm = h ? h[2] : '00';
  return `${m[3]}-${m[2]}-${m[1]}T${hh}:${mm}:00-03:00`;
}

// Placar válido: inteiro de 0 a 14. Qualquer outra coisa (null, "", NaN, negativo) = sem placar.
const placar = v => (Number.isInteger(v) && v >= 0 && v <= 14 ? v : null);

// Converte um item de listTabela no registro que o repo guarda. Os nomes ficam como a FPF
// escreve (casaFpf/foraFpf); a tradução para o nome canônico é um passo separado, para que
// um nome novo apareça como aviso em vez de virar um clube fantasma.
export function normalizarJogo(g) {
  if (!g || typeof g !== 'object' || !Number.isInteger(g.IdJogo)) throw new Error('jogo sem IdJogo: ' + JSON.stringify(g).slice(0, 120));
  const gc = placar(g.ResultadoMandante), gf = placar(g.ResultadoVisitante);
  return {
    id: g.IdJogo,
    numero: g.Numero ?? null,
    rodada: Number(g.Rodada),
    // A FPF alterna caixa entre temporadas ("Primeira Fase" em 2022, "PRIMEIRA FASE" depois).
    fase: (g.Fase || '').trim().toUpperCase(),
    numFase: g.NumFase ?? null,
    grupo: (g.Grupo || '').trim(),
    quando: dataIso(g.Data, g.Horario),
    casaFpf: (g.NomePopularMandante || '').trim(),
    foraFpf: (g.NomePopularVisitante || '').trim(),
    gc: gc !== null && gf !== null ? gc : null,
    gf: gc !== null && gf !== null ? gf : null,
    estadio: (g.NomePopularEstadio || g.Estadio || '').trim(),
    municipio: (g.Municipio || '').trim(),
    adiado: g.Adiado === true,
    suspensao: (g.Suspencao || '').trim(),
    temSumula: !!g.LinkSumula
  };
}

export function extrairJogos(resposta) {
  if (!resposta || resposta.Sucesso !== true) throw new Error('FPF respondeu sem sucesso: ' + JSON.stringify(resposta && resposta.Mensagem));
  const lista = resposta.Retorno && resposta.Retorno.listTabela;
  if (!Array.isArray(lista)) throw new Error('resposta da FPF sem Retorno.listTabela');
  return lista.map(normalizarJogo);
}

export function extrairRodadas(resposta) {
  if (!resposta || resposta.Sucesso !== true) throw new Error('FPF respondeu sem sucesso: ' + JSON.stringify(resposta && resposta.Mensagem));
  return (resposta.Retorno || []).map(r => Number(r.Rodada)).filter(Number.isInteger).sort((a, b) => a - b);
}

// Um jogo só conta como encerrado se tem placar E começou há pelo menos `horas` horas:
// durante a partida o handler pode mostrar placar parcial (mesma trava do brasileiro-2026).
export function encerrado(jogo, agora = new Date(), horas = 3) {
  if (jogo.gc === null || jogo.gf === null || !jogo.quando) return false;
  return agora.getTime() - new Date(jogo.quando).getTime() >= horas * 3600 * 1000;
}

const dormir = ms => new Promise(r => setTimeout(r, ms));

// Coleta uma temporada inteira (liga + mata-mata). `buscarJson(url)` é injetado para que o
// teste rode sem rede; o padrão usa fetch com os cabeçalhos que a página manda.
export async function coletarTemporada({ sigla, ano, buscarJson = buscarJsonPadrao, pausaMs = 300 }) {
  const rodadas = extrairRodadas(await buscarJson(urlRodadas(sigla, ano)));
  const jogos = [];
  for (const rodada of rodadas) {
    if (pausaMs) await dormir(pausaMs);
    for (const j of extrairJogos(await buscarJson(urlTabela(sigla, ano, rodada)))) {
      if (j.rodada !== rodada) throw new Error(`${sigla} ${ano}: jogo ${j.id} veio na rodada ${rodada} mas declara ${j.rodada}`);
      jogos.push(j);
    }
  }
  const ids = new Set(jogos.map(j => j.id));
  if (ids.size !== jogos.length) throw new Error(`${sigla} ${ano}: IdJogo repetido na coleta`);
  return { fonte: 'futebolpaulista.com.br', sigla, ano, rodadas, jogos };
}

export async function buscarJsonPadrao(url, tentativas = 3) {
  let erro;
  for (let t = 1; t <= tentativas; t++) {
    try {
      const r = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://www.futebolpaulista.com.br/Competicoes/Tabela.aspx',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
        }
      });
      const texto = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      try { return JSON.parse(texto); } catch { throw new Error('resposta não é JSON: ' + texto.slice(0, 80).replace(/\s+/g, ' ')); }
    } catch (e) {
      erro = e;
      if (t < tentativas) await dormir(1500 * t);
    }
  }
  throw new Error(`falha ao ler ${url}: ${erro.message}`);
}

// ---------------------------------------------------------------- nomes e conferências

// Traduz nomes da FPF para os canônicos. Devolve também os nomes que não estão na tabela,
// para o chamador decidir (a coleta avisa; a ingestão de 2027 recusa o jogo).
export function aplicarNomes(jogos, apelidos) {
  const desconhecidos = new Set();
  const tr = n => {
    if (apelidos[n] !== undefined) return apelidos[n];
    desconhecidos.add(n);
    return n;
  };
  return { jogos: jogos.map(j => ({ ...j, casa: tr(j.casaFpf), fora: tr(j.foraFpf) })), desconhecidos: [...desconhecidos].sort() };
}

// Classificação por pontos, vitórias, saldo, gols pró (Art. 16 do REC A1 2026, até onde dá
// para calcular sem cartões). Serve para reconciliar a coleta com a tabela publicada.
export function classificar(jogos) {
  const st = {};
  const de = t => (st[t] ||= { time: t, P: 0, J: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0 });
  for (const j of jogos) {
    if (j.gc === null || j.gf === null) continue;
    const c = de(j.casa), f = de(j.fora);
    c.J++; f.J++; c.GP += j.gc; c.GC += j.gf; f.GP += j.gf; f.GC += j.gc;
    if (j.gc > j.gf) { c.V++; c.P += 3; f.D++; } else if (j.gc === j.gf) { c.E++; f.E++; c.P++; f.P++; } else { f.V++; f.P += 3; c.D++; }
  }
  return Object.values(st).map(x => ({ ...x, SG: x.GP - x.GC }))
    .sort((a, b) => b.P - a.P || b.V - a.V || b.SG - a.SG || b.GP - a.GP || a.time.localeCompare(b.time, 'pt'));
}

// Compara a classificação calculada com uma referência publicada [{time,P,V,E,D,GP,GC}].
// Devolve a lista de divergências (vazia = fecha). "Soma que fecha ou não entra."
export function reconciliar(calculada, referencia) {
  const porTime = Object.fromEntries(calculada.map(x => [x.time, x]));
  const div = [];
  for (const r of referencia) {
    const c = porTime[r.time];
    if (!c) { div.push(`${r.time}: ausente na coleta`); continue; }
    for (const k of ['P', 'V', 'E', 'D', 'GP', 'GC']) if (c[k] !== r[k]) div.push(`${r.time}: ${k} coletado ${c[k]}, publicado ${r[k]}`);
  }
  for (const c of calculada) if (!referencia.some(r => r.time === c.time)) div.push(`${c.time}: na coleta mas fora da referência`);
  return div;
}

// Num confronto de mata-mata empatado, o classificado é quem aparece em alguma fase
// posterior. Devolve null quando não dá para saber (por exemplo, a final).
export function classificadoPorFaseSeguinte(jogos, a, b, numFase) {
  const depois = jogos.filter(j => (j.numFase ?? 0) > numFase);
  const esta = t => depois.some(j => j.casa === t || j.fora === t);
  const ea = esta(a), eb = esta(b);
  return ea === eb ? null : ea ? a : b;
}
