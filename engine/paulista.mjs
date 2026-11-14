// Formato do Campeonato Paulista (A1 e A2) sobre o motor de liga.
//
// Tudo aqui é REGRA DE COMPETIÇÃO, não modelo: quem enfrenta quem, quem manda, como se
// desempata, quem avança. O modelo (λ, atualização, drift) vem de core.mjs/liga.mjs e não
// é tocado. As regras seguem o regulamento do A1 de 2026 (Arts. 5 a 16), que a FPF manteve
// para 2027; o que ainda é premissa está em data/2027/*.json, campo `premissas`.
//
// Uma competição é um objeto de dados (ver data/2027/a1.json):
//   { times, confrontos: [[a,b]...] sem mando, tabela: null | [{casa,fora,rodada}],
//     formato: { classificados, rebaixados, quartas, semis, final, premio },
//     gols: { liga: {total,pesoCasa}, mataMata: {total,pesoCasa} } }

import { initLeague, calcL, poissonRandom, mlDe } from './core.mjs';
import { simLigaUma } from './liga.mjs';

// ------------------------------------------------------------------ antes da tabela

const embaralhar = (arr, rnd) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Divide os confrontos em rodadas em que cada time joga uma vez. Só serve para o drift,
// que entra uma vez por rodada futura: sem a tabela oficial, a ORDEM real é desconhecida,
// mas a quantidade de rodadas não. Devolve, para cada confronto, o número da rodada.
//
// Método: tira um emparelhamento perfeito por vez (busca com retrocesso, vizinhos em ordem
// sorteada). Uma sequência de escolhas pode deixar um resto sem emparelhamento perfeito;
// aí recomeça. A tabela oficial prova que uma divisão existe.
export function rodadasProvisorias(times, confrontos, rnd = Math.random, tentativas = 500) {
  const n = times.length, idx = Object.fromEntries(times.map((t, i) => [t, i]));
  const nRodadas = (2 * confrontos.length) / n;
  if (!Number.isInteger(nRodadas) || n % 2) throw new Error('confrontos não formam rodadas completas');
  for (let tent = 0; tent < tentativas; tent++) {
    const livre = Array.from({ length: n }, () => new Map());
    confrontos.forEach(([a, b], k) => { livre[idx[a]].set(idx[b], k); livre[idx[b]].set(idx[a], k); });
    const rodadaDe = new Array(confrontos.length).fill(0);
    let ok = true;
    for (let r = 1; r <= nRodadas && ok; r++) {
      const par = new Array(n).fill(-1);
      const casar = () => {
        let v = -1, menor = Infinity;
        for (let i = 0; i < n; i++) if (par[i] < 0) {
          let c = 0;
          for (const w of livre[i].keys()) if (par[w] < 0) c++;
          if (c < menor) { menor = c; v = i; }
        }
        if (v < 0) return true;
        if (menor === 0) return false;
        for (const w of embaralhar([...livre[v].keys()].filter(w => par[w] < 0), rnd)) {
          par[v] = w; par[w] = v;
          if (casar()) return true;
          par[v] = -1; par[w] = -1;
        }
        return false;
      };
      if (!casar()) { ok = false; break; }
      for (let i = 0; i < n; i++) if (par[i] > i) {
        const k = livre[i].get(par[i]);
        rodadaDe[k] = r;
        livre[i].delete(par[i]);
        livre[par[i]].delete(i);
      }
    }
    if (ok) return rodadaDe;
  }
  throw new Error('não encontrei divisão em rodadas; os confrontos estão corretos?');
}

// Sorteia o mando de todos os confrontos com equilíbrio: cada time manda metade dos seus
// jogos (4 de 8 no A1; 7 ou 8 de 15 na A2). Devolve [[casa, fora]...] na ordem de `confrontos`.
//
// Método: percurso de Euler. Num grafo em que todo vértice tem grau par, orientar cada
// aresta no sentido em que um circuito de Euler a percorre dá a todo vértice tantas saídas
// quanto entradas. Vértices de grau ímpar (A2) ganham uma aresta para um vértice fictício.
// No fim, inverte tudo com probabilidade 1/2, o que mantém o equilíbrio e torna o mando de
// cada confronto exatamente 50/50.
export function sortearMandos(times, confrontos, rnd = Math.random) {
  const n = times.length, idx = Object.fromEntries(times.map((t, i) => [t, i]));
  const adj = Array.from({ length: n + 1 }, () => []);
  const arestas = confrontos.map(([a, b]) => [idx[a], idx[b]]);
  arestas.forEach(([a, b], k) => { adj[a].push(k); adj[b].push(k); });
  for (let v = 0; v < n; v++) if (adj[v].length % 2) {
    const k = arestas.length;
    arestas.push([n, v]);
    adj[n].push(k);
    adj[v].push(k);
  }
  for (let v = 0; v <= n; v++) adj[v] = embaralhar(adj[v], rnd);
  const usada = new Array(arestas.length).fill(false), origem = new Array(arestas.length).fill(-1);
  const pos = new Array(n + 1).fill(0);
  for (const inicio of embaralhar([...Array(n + 1).keys()], rnd)) {
    const pilha = [inicio];
    while (pilha.length) {
      const v = pilha[pilha.length - 1];
      while (pos[v] < adj[v].length && usada[adj[v][pos[v]]]) pos[v]++;
      if (pos[v] === adj[v].length) { pilha.pop(); continue; }
      const k = adj[v][pos[v]];
      usada[k] = true;
      origem[k] = v;
      pilha.push(arestas[k][0] === v ? arestas[k][1] : arestas[k][0]);
    }
  }
  const inverter = rnd() < 0.5;
  return confrontos.map(([a, b], k) => ((origem[k] === idx[a]) !== inverter ? [a, b] : [b, a]));
}

// ------------------------------------------------------------------------ regulamento

// Desempate da 1ª fase (Art. 16): pontos, vitórias, saldo, gols pró, cartões, sorteio.
// Cartões não são simulados, então depois dos quatro primeiros critérios é sorteio — uma
// chave aleatória por time, sorteada uma vez por temporada simulada e reaproveitada na
// campanha acumulada, para que o mesmo "sorteio" valha nas duas contas.
const porCampanha = chave => (a, b) => b.P - a.P || b.V - a.V || b.SG - a.SG || b.GP - a.GP || chave[a.time] - chave[b.time];

// Quartas: 1º×8º, 2º×7º, 3º×6º, 4º×5º; o melhor colocado da 1ª fase é o `melhor`.
export const paresQuartas = cl8 => [0, 1, 2, 3].map(i => ({ melhor: cl8[i], pior: cl8[7 - i] }));

// Semifinais: entre os quatro classificados, 1ª×4ª e 2ª×3ª campanhas ACUMULADAS.
export const paresSemis = quatroPorCampanha => [
  { melhor: quatroPorCampanha[0], pior: quatroPorCampanha[3] },
  { melhor: quatroPorCampanha[1], pior: quatroPorCampanha[2] }
];

// Soma um jogo à campanha acumulada. Classificação nos pênaltis conta como empate.
export function somarCampanha(camp, casa, fora, gc, gf) {
  const c = camp[casa], f = camp[fora];
  c.GP += gc; c.GC += gf; f.GP += gf; f.GC += gc;
  c.SG = c.GP - c.GC; f.SG = f.GP - f.GC;
  if (gc > gf) { c.V++; c.P += 3; } else if (gc < gf) { f.V++; f.P += 3; } else { c.P++; f.P++; }
}

// ------------------------------------------------------------------- uma temporada

// Simula uma temporada inteira: 1ª fase, quartas, semis e final.
//   contexto: { comp, getElo, cfg, ak, lg, res, rodadaDe, rnd }
// `rodadaDe` (de rodadasProvisorias) só é usado quando a competição ainda não tem tabela.
export function simTemporada({ comp, getElo, cfg, ak, lg, res = [], rodadaDe, rnd = Math.random, eo = false }) {
  const { times, formato } = comp;
  const liga = mlDe(comp.gols.liga), mata = mlDe(comp.gols.mataMata);

  let tab = comp.tabela;
  if (!tab) {
    tab = sortearMandos(times, comp.confrontos, rnd)
      .map(([casa, fora], k) => ({ casa, fora, rodada: rodadaDe[k] }))
      .sort((a, b) => a.rodada - b.rodada);
  }

  const chave = {};
  times.forEach(t => { chave[t] = rnd(); });
  const cmp = porCampanha(chave);
  const { cl, el, at, df } = simLigaUma({
    times, getElo, tab, res, cfg, mc: liga.mc, mf: liga.mf, ak, eo, lg, rnd,
    desempate: linhas => linhas.sort(cmp)
  });

  const camp = {};
  cl.forEach(x => { camp[x.time] = { time: x.time, P: x.P, V: x.V, GP: x.GP, GC: x.GC, SG: x.SG }; });
  const jogo = (casa, fora) => {
    const { lC, lF } = calcL(at[casa], df[casa], at[fora], df[fora], el[casa], el[fora], mata.mc, mata.mf, cfg.homeAdv, eo, cfg.c0Log);
    const gc = poissonRandom(lC, rnd), gf = poissonRandom(lF, rnd);
    somarCampanha(camp, casa, fora, gc, gf);
    return { casa, fora, gc, gf };
  };
  // Confronto de mata-mata. Jogo único: manda o `melhor`. Ida e volta: o `melhor` manda a
  // volta e decide o agregado. Igualdade vai direto aos pênaltis (50/50, como no original).
  const confronto = (melhor, pior, tipo) => {
    const jogos = tipo === 'idaVolta' ? [jogo(pior, melhor), jogo(melhor, pior)] : [jogo(melhor, pior)];
    const gm = jogos.reduce((s, j) => s + (j.casa === melhor ? j.gc : j.gf), 0);
    const gp = jogos.reduce((s, j) => s + (j.casa === pior ? j.gc : j.gf), 0);
    const penaltis = gm === gp;
    const vencedor = penaltis ? (rnd() < 0.5 ? melhor : pior) : gm > gp ? melhor : pior;
    return { melhor, pior, jogos, penaltis, vencedor, perdedor: vencedor === melhor ? pior : melhor };
  };
  const ordenar = ts => ts.map(t => camp[t]).sort(cmp).map(x => x.time);

  const top = cl.slice(0, formato.classificados).map(x => x.time);
  const quartas = paresQuartas(top).map(p => confronto(p.melhor, p.pior, formato.quartas));
  const semis = paresSemis(ordenar(quartas.map(q => q.vencedor))).map(p => confronto(p.melhor, p.pior, formato.semis));
  const [fa, fb] = ordenar(semis.map(s => s.vencedor));
  const final = confronto(fa, fb, formato.final);

  // Classificação geral: campeão, vice, eliminados nas semis e nas quartas por campanha
  // acumulada, e do 9º em diante a ordem da 1ª fase.
  const geral = [final.vencedor, final.perdedor, ...ordenar(semis.map(s => s.perdedor)), ...ordenar(quartas.map(q => q.perdedor)),
    ...cl.slice(formato.classificados).map(x => x.time)];
  return {
    cl, tab, quartas, semis, final, geral,
    campeao: final.vencedor, vice: final.perdedor,
    rebaixados: cl.slice(cl.length - formato.rebaixados).map(x => x.time)
  };
}

// ---------------------------------------------------------------------- Monte Carlo

const pctl = (arr, q) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length * q)] || 0;
};

// N temporadas. Saída por time, em percentual: distribuição de posição na 1ª fase (posF),
// classificado, rebaixado, semifinalista, finalista, campeão, vice e distribuição na
// classificação geral; adversários por fase (para as Chaves); e os pontos que bastaram para
// a última vaga e para escapar do rebaixamento. `geralTrace` guarda a classificação geral
// de cada simulação (índices em `times`), para contas conjuntas como as vagas nacionais.
export function simMCPaulista({ comp, getElo, cfg, ak = cfg.defaultAlpha, res = [], nS, rnd = Math.random, eo = false }) {
  const { times, formato } = comp, n = times.length, idx = Object.fromEntries(times.map((t, i) => [t, i]));
  const lg = initLeague(times, getElo, cfg);
  const rodadaDe = comp.tabela ? null : rodadasProvisorias(times, comp.confrontos, rnd);
  const z = () => new Array(n).fill(0);
  const acc = {};
  times.forEach(t => {
    acc[t] = { posF: z(), geral: z(), pts: [], classificado: 0, rebaixado: 0, semi: 0, final: 0, titulo: 0, vice: 0,
      adversarios: { quartas: {}, semis: {}, final: {} } };
  });
  const ptsNaPosicao = Array.from({ length: n }, () => []);
  const geralTrace = new Uint8Array(nS * n);
  for (let s = 0; s < nS; s++) {
    const T = simTemporada({ comp, getElo, cfg, ak, lg, res, rodadaDe, rnd, eo });
    T.cl.forEach((x, i) => {
      const a = acc[x.time];
      a.posF[i]++;
      a.pts.push(x.P);
      ptsNaPosicao[i].push(x.P);
      if (i < formato.classificados) a.classificado++;
      if (i >= n - formato.rebaixados) a.rebaixado++;
    });
    for (const [fase, lista] of [['quartas', T.quartas], ['semis', T.semis], ['final', [T.final]]]) for (const c of lista) {
      acc[c.melhor].adversarios[fase][c.pior] = (acc[c.melhor].adversarios[fase][c.pior] || 0) + 1;
      acc[c.pior].adversarios[fase][c.melhor] = (acc[c.pior].adversarios[fase][c.melhor] || 0) + 1;
    }
    T.semis.forEach(c => { acc[c.melhor].semi++; acc[c.pior].semi++; });
    acc[T.final.melhor].final++;
    acc[T.final.pior].final++;
    acc[T.campeao].titulo++;
    acc[T.vice].vice++;
    T.geral.forEach((t, i) => { acc[t].geral[i]++; geralTrace[s * n + i] = idx[t]; });
  }
  const pc = v => v / nS * 100;
  const norm = m => Object.entries(m).map(([adv, c]) => ({ adv, pct: c / nS * 100 })).sort((a, b) => b.pct - a.pct);
  const ultimaVaga = formato.classificados - 1, primeiroRebaixado = n - formato.rebaixados;
  return {
    sigla: comp.sigla, ano: comp.ano, nSims: nS, times, mandoSorteado: !comp.tabela,
    probs: times.map(t => {
      const a = acc[t];
      return {
        time: t, mediaPts: a.pts.reduce((x, y) => x + y, 0) / nS, p10Pts: pctl(a.pts, 0.1), p90Pts: pctl(a.pts, 0.9),
        posF: a.posF.map(pc), geral: a.geral.map(pc),
        classificado: pc(a.classificado), rebaixado: pc(a.rebaixado), semi: pc(a.semi), final: pc(a.final),
        titulo: pc(a.titulo), vice: pc(a.vice),
        // Na A2 o prêmio é o acesso, que vai para os dois finalistas.
        acesso: formato.premio === 'acesso' ? pc(a.final) : null,
        adversarios: { quartas: norm(a.adversarios.quartas), semis: norm(a.adversarios.semis), final: norm(a.adversarios.final) }
      };
    }).sort((a, b) => b.mediaPts - a.mediaPts),
    pontosParaClassificar: { p10: pctl(ptsNaPosicao[ultimaVaga], 0.1), p50: pctl(ptsNaPosicao[ultimaVaga], 0.5), p90: pctl(ptsNaPosicao[ultimaVaga], 0.9) },
    pontosDoPrimeiroRebaixado: { p10: pctl(ptsNaPosicao[primeiroRebaixado], 0.1), p50: pctl(ptsNaPosicao[primeiroRebaixado], 0.5), p90: pctl(ptsNaPosicao[primeiroRebaixado], 0.9) },
    geralTrace
  };
}

// Dificuldade do sorteio: força média dos adversários de cada time, pela semente. Só faz
// sentido onde os adversários diferem (A1); em turno único todos enfrentam todos.
export function dificuldadeDoSorteio(comp, getElo) {
  const adv = Object.fromEntries(comp.times.map(t => [t, []]));
  comp.confrontos.forEach(([a, b]) => { adv[a].push(b); adv[b].push(a); });
  return comp.times.map(t => ({
    time: t,
    adversarios: adv[t],
    forcaMedia: adv[t].reduce((s, o) => s + getElo(o), 0) / adv[t].length
  })).sort((a, b) => b.forcaMedia - a.forcaMedia);
}
