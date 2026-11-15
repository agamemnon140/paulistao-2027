import { useMemo, useState } from 'react';
import { PREVISOES } from './dados.js';
import { umaTemporada } from './projecao.js';
import { dificuldadeDoSorteio } from '../engine/paulista.mjs';
import { ELO_MIN, ELO_MAX } from '../engine/semente.mjs';

// ------------------------------------------------------------------ formatação

const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const num1 = v => nf1.format(v);
export const pct = v => (v <= 0 ? '–' : v < 0.05 ? '<0,1' : v < 10 ? nf1.format(v) : String(Math.round(v)));
export const pctExato = v => `${nf1.format(v)}%`;
// Datas simples ficam como estão; instantes (com hora) viram o dia em São Paulo.
export const dataBR = iso => (!iso ? 'data desconhecida' : iso.includes('T') ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : iso.split('-').reverse().join('/'));
const ord = n => `${n}º`;
const serieDe = c => (c.serie ? `${c.serie} ${ord(c.pos)}` : 'sem série');
const serieLonga = c => (c.serie ? `${ord(c.pos)} da Série ${c.serie} em 2026` : 'não jogou série nacional em 2026');

// Célula sombreada: a cor diz o tamanho da chance dentro da coluna; o número diz o valor.
function Chance({ v, max, tom = 'bom', exato }) {
  const f = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
  return <td className={`chance ${tom}${f > 0.58 ? ' forte' : ''}`} style={{ '--f': Math.round(f * 100) }} title={exato || pctExato(v)}>{pct(v)}</td>;
}

function Clube({ nome, semente }) {
  const c = semente.clubes[nome];
  return <th scope="row" className="clube" title={serieLonga(c)}><span className="nome">{nome}</span> <span className="serie">{serieDe(c)}</span></th>;
}

// ------------------------------------------------------------------ Projeção

function Projecao({ sigla, entradas, resultado }) {
  const acesso = entradas.comp.formato.premio === 'acesso', n = entradas.comp.times.length;
  const { classificados, rebaixados } = entradas.comp.formato;
  const colunas = [
    { id: 'mediaPts', nome: 'Pontos', dica: 'Média de pontos na 1ª fase' },
    { id: 'classificado', nome: `Entre os ${classificados}`, tom: 'bom' },
    { id: 'semi', nome: 'Semi', tom: 'bom' },
    acesso ? { id: 'final', nome: 'Acesso', tom: 'bom', dica: 'Sobem os dois finalistas' } : { id: 'final', nome: 'Final', tom: 'bom' },
    { id: 'titulo', nome: 'Título', tom: 'bom' },
    { id: 'rebaixado', nome: 'Queda', tom: 'ruim', dica: `Terminar entre os ${rebaixados} últimos da 1ª fase` }
  ];
  const [ordem, setOrdem] = useState('mediaPts');
  const linhas = useMemo(() => resultado.probs.slice().sort((a, b) => b[ordem] - a[ordem] || b.mediaPts - a.mediaPts), [resultado, ordem]);
  const max = Object.fromEntries(colunas.map(c => [c.id, Math.max(...resultado.probs.map(p => p[c.id]))]));
  const maxPos = Math.max(...resultado.probs.flatMap(p => p.posF));
  const [leitura, setLeitura] = useState(null);
  const v = resultado.pontosParaClassificar, z = resultado.pontosDoPrimeiroRebaixado;

  return (
    <>
      <h2>As chances de cada clube na Série {sigla}</h2>
      <p className="lide">Em porcentagem das temporadas simuladas. Toque no nome de uma coluna para ordenar por ela.</p>
      <div className="rolagem">
        <table className="tabela projecao">
          <thead>
            <tr>
              <th scope="col" className="clube">Clube</th>
              {colunas.map(c => (
                <th key={c.id} scope="col" aria-sort={ordem === c.id ? 'descending' : undefined}>
                  <button type="button" onClick={() => setOrdem(c.id)} title={c.dica}>{c.nome}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(p => (
              <tr key={p.time}>
                <Clube nome={p.time} semente={entradas.semente} />
                <td className="pontos" title={`Entre ${p.p10Pts} e ${p.p90Pts} pontos em 8 de cada 10 temporadas`}>{num1(p.mediaPts)}</td>
                {colunas.slice(1).map(c => <Chance key={c.id} v={p[c.id]} max={max[c.id]} tom={c.tom} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nota">Ao lado de cada clube, a posição dele no Brasileiro de 2026, que é de onde sai a força de partida.</p>

      <h2>Quantos pontos bastam</h2>
      <p className="lide">Os pontos do último que avança e do primeiro que cai mudam de uma temporada simulada para outra. A tabela mostra a faixa.</p>
      <div className="rolagem limiares">
        <table className="tabela">
          <thead><tr><th scope="col" className="esq">Em quantas temporadas</th><th scope="col">Último entre os {classificados}</th><th scope="col">Primeiro da zona de queda</th></tr></thead>
          <tbody>
            <tr><td>Nas mais fáceis (1 em cada 10)</td><td className="pontos">{v.p10} ou menos</td><td className="pontos">{z.p10} ou menos</td></tr>
            <tr><td>Na temporada típica</td><td className="pontos">{v.p50}</td><td className="pontos">{z.p50}</td></tr>
            <tr><td>Nas mais disputadas (1 em cada 10)</td><td className="pontos">{v.p90} ou mais</td><td className="pontos">{z.p90} ou mais</td></tr>
          </tbody>
        </table>
      </div>
      <p className="nota">Leitura: quem faz {v.p90} pontos iguala ou passa o último classificado em 9 de cada 10 temporadas; quem passa de {z.p90} fica acima do primeiro da zona de queda na mesma proporção.</p>

      <h2>Em que posição cada um termina a 1ª fase</h2>
      <p className="lide">Cada célula é a chance, em %, de o clube terminar naquela posição. Em verde, as {classificados} posições que avançam; em vermelho, as {rebaixados} que caem.</p>
      <div className="rolagem">
        <table className="tabela matriz" onMouseLeave={() => setLeitura(null)}>
          <thead>
            <tr>
              <th scope="col" className="clube">Clube</th>
              {Array.from({ length: n }, (_, i) => <th key={i} scope="col" className={i === classificados - 1 ? 'corte' : i === n - rebaixados - 1 ? 'queda' : undefined}>{i + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {resultado.probs.map(p => (
              <tr key={p.time}>
                <th scope="row" className="clube"><span className="nome">{p.time}</span></th>
                {p.posF.map((x, i) => {
                  const f = x / maxPos, frase = `${p.time} termina em ${ord(i + 1)} em ${pctExato(x)} das temporadas.`;
                  const zona = i < classificados ? 'bom' : i >= n - rebaixados ? 'ruim' : 'neutro';
                  return (
                    <td key={i} className={`chance ${zona}${f > 0.58 ? ' forte' : ''}${i === classificados - 1 ? ' corte' : i === n - rebaixados - 1 ? ' queda' : ''}`}
                      style={{ '--f': Math.round(f * 100) }} title={frase} onMouseEnter={() => setLeitura(frase)} onClick={() => setLeitura(frase)}>
                      {x >= 0.5 ? Math.round(x) : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="leitura" aria-live="polite">{leitura || 'Passe o cursor ou toque numa célula para ler a porcentagem exata.'}</p>
    </>
  );
}

// ------------------------------------------------------------------ Chaves

function Barras({ itens, max, vazio }) {
  if (!itens.length) return <p className="nota">{vazio}</p>;
  return (
    <ol className="barras">
      {itens.map(i => (
        <li key={i.adv} title={`${pctExato(i.pct)} das temporadas`}>
          <span className="rotulo">{i.adv}</span>
          <span className="trilho"><span className="barra" style={{ width: `${Math.max(1, (i.pct / max) * 100)}%` }} /></span>
          <span className="valor">{pct(i.pct)}%</span>
        </li>
      ))}
    </ol>
  );
}

function Chaves({ sigla, entradas, resultado }) {
  const acesso = entradas.comp.formato.premio === 'acesso';
  const porNome = Object.fromEntries(resultado.probs.map(p => [p.time, p]));
  const nomes = entradas.comp.times.slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const [clube, setClube] = useState(resultado.probs.slice().sort((a, b) => b.titulo - a.titulo)[0].time);
  const p = porNome[clube] || resultado.probs[0];
  const fases = [
    { id: 'quartas', nome: 'Nas quartas', chega: p.classificado },
    { id: 'semis', nome: 'Na semifinal', chega: p.semi },
    { id: 'final', nome: acesso ? 'Na final, já com o acesso' : 'Na final', chega: p.final }
  ];
  const max = Math.max(1, ...fases.flatMap(f => p.adversarios[f.id].map(a => a.pct)));
  return (
    <>
      <h2>Quem cada clube deve enfrentar no mata-mata</h2>
      <p className="lide">
        As quartas cruzam 1º com 8º, 2º com 7º, 3º com 6º e 4º com 5º. {entradas.comp.formato.quartas === 'unico' ? 'Quartas e semifinais em jogo único, na casa de quem fez melhor campanha.' : 'Todas as fases em ida e volta, com a volta na casa de quem fez melhor campanha.'}
      </p>
      <label className="campo">Clube
        <select value={p.time} onChange={ev => setClube(ev.target.value)}>{nomes.map(t => <option key={t}>{t}</option>)}</select>
      </label>
      <div className="fases">
        {fases.map(f => (
          <section key={f.id}>
            <h3>{f.nome}</h3>
            <p className="chega">{p.time} chega aqui em <strong>{pctExato(f.chega)}</strong> das temporadas. Adversários mais prováveis:</p>
            <Barras itens={p.adversarios[f.id].slice(0, 6)} max={max} vazio="Não chegou a esta fase em nenhuma temporada simulada." />
          </section>
        ))}
      </div>
      <p className="nota">As porcentagens ao lado de cada adversário são sobre todas as temporadas, não só sobre aquelas em que {p.time} chega à fase.</p>
    </>
  );
}

// ------------------------------------------------------------------ Sorteio

function Sorteio({ entradas }) {
  const { comp, semente, getElo } = entradas;
  const pote = Object.fromEntries(Object.entries(comp.potes).flatMap(([letra, ts]) => ts.map(t => [t, letra])));
  const nota = elo => ((elo - ELO_MIN) / (ELO_MAX - ELO_MIN)) * 100;
  const linhas = dificuldadeDoSorteio(comp, getElo).map(d => ({ ...d, nota: nota(d.forcaMedia) })).sort((a, b) => b.nota - a.nota);
  const max = Math.max(...linhas.map(l => l.nota));
  return (
    <>
      <h2>Quem pegou a tabela mais difícil</h2>
      <p className="lide">
        Cada clube joga oito vezes: três contra os do próprio pote e cinco contra os demais. A barra mostra a força média desses oito adversários, numa escala em que 0 é um clube sem série nacional e 100 é o {Object.entries(semente.clubes).sort((a, b) => b[1].elo - a[1].elo)[0][0]}.
      </p>
      <div className="rolagem">
        <table className="tabela sorteio">
          <thead><tr><th scope="col" className="clube">Clube e adversários</th><th scope="col">Pote</th><th scope="col" className="larga">Força média dos adversários</th></tr></thead>
          <tbody>
            {linhas.map(l => {
              const c = semente.clubes[l.time];
              return (
                <tr key={l.time}>
                  <th scope="row" className="clube" title={serieLonga(c)}>
                    <span className="nome">{l.time}</span> <span className="serie">{serieDe(c)}</span>
                    <span className="lista">Contra {l.adversarios.slice().sort((x, y) => getElo(y) - getElo(x)).join(', ')}</span>
                  </th>
                  <td>{pote[l.time]}</td>
                  <td className="larga"><span className="medida"><span className="trilho"><span className="barra neutra" style={{ width: `${(l.nota / max) * 100}%` }} /></span><span className="valor">{Math.round(l.nota)}</span></span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="nota">A força de cada adversário é a de partida, tirada do Brasileiro de {semente.anoBase}. Ainda não se sabe quem joga em casa: a tabela com os mandos sai em dezembro.</p>
    </>
  );
}

// ------------------------------------------------------------------ Uma temporada

function Confronto({ c }) {
  return (
    <li>
      <span className="quem"><strong>{c.vencedor}</strong> passa por {c.perdedor}{c.penaltis ? ', nos pênaltis' : ''}</span>
      <span className="placares">{c.jogos.map((j, i) => <span key={i}>{j.casa} {j.gc} x {j.gf} {j.fora}</span>)}</span>
    </li>
  );
}

function UmaTemporada({ sigla, entradas }) {
  const [seed, setSeed] = useState(1);
  const T = useMemo(() => umaTemporada(entradas, seed), [entradas, seed]);
  const { classificados, rebaixados, premio } = entradas.comp.formato, n = T.cl.length;
  return (
    <>
      <h2>Uma temporada inteira, do começo ao fim</h2>
      <p className="lide">Uma das milhares de temporadas que a projeção simula, jogo a jogo. Serve para ver como um campeonato possível se desenrola; não é a previsão.</p>
      <p><button type="button" className="acao" onClick={() => setSeed(Math.floor(Math.random() * 1e9) + 2)}>Sortear outra temporada</button></p>
      <p className="campeao">
        {premio === 'acesso' ? <>Sobem <strong>{T.campeao}</strong>, campeão, e <strong>{T.vice}</strong>.</> : <>Campeão: <strong>{T.campeao}</strong>, em final contra {T.vice}.</>} Caem {T.rebaixados.join(' e ')}.
      </p>
      <div className="duas">
        <section>
          <h3>1ª fase</h3>
          <table className="tabela classificacao">
            <thead><tr><th scope="col" /><th scope="col" className="clube">Clube</th><th scope="col">P</th><th scope="col">V</th><th scope="col">E</th><th scope="col">D</th><th scope="col">GP</th><th scope="col">GC</th><th scope="col">SG</th></tr></thead>
            <tbody>
              {T.cl.map((x, i) => (
                <tr key={x.time} className={i === classificados - 1 ? 'corte' : i === n - rebaixados - 1 ? 'queda' : undefined}>
                  <td className="pos">{i + 1}</td><th scope="row" className="clube"><span className="nome">{x.time}</span></th>
                  <td className="pontos">{x.P}</td><td>{x.V}</td><td>{x.E}</td><td>{x.D}</td><td>{x.GP}</td><td>{x.GC}</td><td>{x.SG > 0 ? `+${x.SG}` : x.SG}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h3>Quartas de final</h3><ul className="confrontos">{T.quartas.map((c, i) => <Confronto key={i} c={c} />)}</ul>
          <h3>Semifinais</h3><ul className="confrontos">{T.semis.map((c, i) => <Confronto key={i} c={c} />)}</ul>
          <h3>Final</h3><ul className="confrontos"><Confronto c={T.final} /></ul>
        </section>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ Evolução

const TIPO = { 'pre-tabela': 'antes da tabela', tabela: 'com a tabela oficial', rodada: 'com resultados' };

function Evolucao({ sigla, entradas }) {
  const registros = PREVISOES.filter(r => r.competicao === sigla);
  const acesso = entradas.comp.formato.premio === 'acesso';
  const metricas = [
    acesso ? { id: 'acesso', nome: 'chance de acesso' } : { id: 'titulo', nome: 'chance de título' },
    { id: 'classificado', nome: `chance de ficar entre os ${entradas.comp.formato.classificados}` },
    { id: 'final', nome: 'chance de chegar à final' },
    { id: 'rebaixado', nome: 'chance de queda' }
  ];
  const ultimo = registros.at(-1);
  const nomes = entradas.comp.times.slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const [clube, setClube] = useState(ultimo ? Object.entries(ultimo.times).sort((a, b) => b[1][metricas[0].id] - a[1][metricas[0].id])[0][0] : nomes[0]);
  const [metrica, setMetrica] = useState(metricas[0].id);
  const [foco, setFoco] = useState(null);
  const m = metricas.find(x => x.id === metrica) || metricas[0];
  if (!registros.length) return <><h2>Como as chances mudaram</h2><p className="nota">Ainda não há projeção arquivada para a Série {sigla}.</p></>;

  const pontos = registros.map((r, i) => ({ i, quando: r.quando, tipo: r.tipo, jogos: r.jogosRealizados, v: r.times[clube]?.[m.id] ?? 0 }));
  const L = 640, A = 240, mE = 44, mD = 16, mC = 16, mB = 34;
  const teto = Math.max(10, Math.ceil(Math.max(...pontos.map(p => p.v)) / 10) * 10);   // múltiplo de 10: a marca do meio sai redonda
  const x = i => (pontos.length === 1 ? (mE + L - mD) / 2 : mE + (i / (pontos.length - 1)) * (L - mE - mD));
  const y = v => mC + (1 - v / teto) * (A - mC - mB);
  const marcas = [0, teto / 2, teto];
  return (
    <>
      <h2>Como as chances mudaram</h2>
      <p className="lide">Cada projeção arquivada vira um ponto. O arquivo começa em {dataBR(registros[0].quando)} e ganha um registro sempre que os dados mudam.</p>
      <div className="campos">
        <label className="campo">Clube<select value={clube} onChange={ev => setClube(ev.target.value)}>{nomes.map(t => <option key={t}>{t}</option>)}</select></label>
        <label className="campo">Medida<select value={m.id} onChange={ev => setMetrica(ev.target.value)}>{metricas.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></label>
      </div>
      <figure className="grafico">
        <figcaption>{clube}: {m.nome}, em % das temporadas simuladas</figcaption>
        <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={`${clube}: ${m.nome} em cada projeção arquivada`} onMouseLeave={() => setFoco(null)}>
          {marcas.map(t => (
            <g key={t}><line className="grade" x1={mE} x2={L - mD} y1={y(t)} y2={y(t)} /><text className="eixo" x={mE - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">{Math.round(t)}%</text></g>
          ))}
          {pontos.length > 1 && <polyline className={`linha${m.id === 'rebaixado' ? ' ruim' : ''}`} points={pontos.map(p => `${x(p.i)},${y(p.v)}`).join(' ')} />}
          {pontos.map(p => (
            <g key={p.i} onMouseEnter={() => setFoco(p.i)} onClick={() => setFoco(p.i)}>
              <circle className="alvo" cx={x(p.i)} cy={y(p.v)} r="18" />
              <circle className={`ponto${m.id === 'rebaixado' ? ' ruim' : ''}${foco === p.i ? ' ativo' : ''}`} cx={x(p.i)} cy={y(p.v)} r="5" />
              {(pontos.length <= 8 || p.i === 0 || p.i === pontos.length - 1) && <text className="eixo" x={x(p.i)} y={A - 12} textAnchor="middle">{dataBR(p.quando).slice(0, 5)}</text>}
            </g>
          ))}
          {pontos.length <= 2 && pontos.map(p => <text key={p.i} className="valor" x={x(p.i)} y={y(p.v) - 12} textAnchor="middle">{pctExato(p.v)}</text>)}
        </svg>
      </figure>
      <p className="leitura" aria-live="polite">
        {foco !== null ? `${dataBR(pontos[foco].quando)}, ${TIPO[pontos[foco].tipo]}: ${pctExato(pontos[foco].v)}.` : pontos.length === 1 ? 'Só há uma projeção arquivada até agora; a linha aparece a partir da segunda.' : 'Passe o cursor ou toque num ponto para ler o valor.'}
      </p>
      <div className="rolagem">
        <table className="tabela registros">
          <thead><tr><th scope="col" className="esq">Projeção de</th><th scope="col" className="esq">Feita</th><th scope="col">Jogos disputados</th><th scope="col">{m.nome}</th></tr></thead>
          <tbody>{pontos.map(p => <tr key={p.i}><td className="esq">{dataBR(p.quando)}</td><td className="esq">{TIPO[p.tipo]}</td><td>{p.jogos}</td><td>{pctExato(p.v)}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ Sobre

const FORMA = { log: 'com peso maior para quem está no topo', linear: 'degrau a degrau', raiz: 'com peso um pouco maior para o topo' };

function Sobre({ sigla, entradas }) {
  const { comp, semente: s } = entradas, g = comp.gols;
  const semSerie = comp.times.filter(t => !s.clubes[t].serie);
  return (
    <div className="texto">
      <h2>Como estes números são feitos</h2>
      <p>O campeonato é jogado milhares de vezes no computador. Em cada jogo, os gols de cada lado são sorteados a partir da força de ataque e de defesa dos dois clubes e de quem joga em casa. A porcentagem de cada clube é a fração das temporadas em que aquilo aconteceu.</p>
      <h3>De onde vem a força de cada clube</h3>
      <p>Da colocação no Campeonato Brasileiro de {s.anoBase}, numa escada única que vai do 1º da Série A ao último da Série D, {FORMA[s.forma]}. {semSerie.length ? `Quem não jogou série nacional (${semSerie.join(', ')}) parte de um degrau abaixo do último.` : ''} Durante o campeonato, cada resultado real ajusta a força dos dois clubes.</p>
      <p>Essa escolha saiu de um teste com os jogos de 2022 a 2026 das Séries A1 e A2: foi a que melhor previu os resultados, à frente da posição no Paulista anterior e de combinações das duas. No A1, a maior parte da vantagem vem de acertar a força do Palmeiras.</p>
      <h3>O que ainda é premissa</h3>
      <ul>
        {s.provisoria && <li>A colocação no Brasileiro de {s.anoBase} foi lida em {dataBR(s.lidoEm)}, antes do fim da Série A. Muda quando ela acabar.</li>}
        {!comp.tabela && <li>A tabela com os mandos ainda não foi publicada. Até lá, quem joga em casa é sorteado a cada temporada simulada.</li>}
        {comp.premissas.map(p => <li key={p}>{p[0].toUpperCase() + p.slice(1)}.</li>)}
        <li>O regulamento de 2027 ainda não saiu; valem as regras de 2026.</li>
      </ul>
      <h3>Números do modelo na Série {sigla}</h3>
      <dl className="ficha">
        <dt>Distância entre o mais forte e o mais fraco</dt><dd>ataque {String(s.razao).replace('.', ',')} vezes mais forte</dd>
        <dt>Gols por jogo na 1ª fase</dt><dd>{String(g.liga.total).replace('.', ',')}, dos quais {Math.round(g.liga.pesoCasa * 100)}% do mandante</dd>
        <dt>Gols por jogo no mata-mata</dt><dd>{String(g.mataMata.total).replace('.', ',')}, dos quais {Math.round(g.mataMata.pesoCasa * 100)}% do mandante</dd>
        <dt>Empate no mata-mata</dt><dd>pênaltis, com chances iguais</dd>
      </dl>
      <p>O código, os dados e o relatório do teste estão em <a href="https://github.com/agamemnon140/paulistao-2027">github.com/agamemnon140/paulistao-2027</a>.</p>
    </div>
  );
}

export const ABAS = [
  { id: 'projecao', nome: 'Projeção', componente: Projecao, precisaDeResultado: true },
  { id: 'chaves', nome: 'Mata-mata', componente: Chaves, precisaDeResultado: true },
  { id: 'sorteio', nome: 'Sorteio', componente: Sorteio, so: 'A1' },
  { id: 'temporada', nome: 'Uma temporada', componente: UmaTemporada },
  { id: 'evolucao', nome: 'Evolução', componente: Evolucao },
  { id: 'sobre', nome: 'Como funciona', componente: Sobre }
];
