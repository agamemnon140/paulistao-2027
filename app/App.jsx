import { useEffect, useRef, useState } from 'react';
import { ENTRADAS, SIGLAS } from './dados.js';
import { ABAS, dataBR } from './abas.jsx';
// O endereço do worker já compilado: serve para criá-lo e para guardá-lo para uso sem rede.
import urlDoWorker from './sim.worker.js?worker&url';
export { urlDoWorker };

const N_SIMS = 10000, SEMENTE_PADRAO = 2027;
const chave = (sigla, seed) => `${sigla}|${seed}`;

export default function App({ inicial = {} }) {
  const [sigla, setSigla] = useState(inicial.sigla || 'A1');
  const [aba, setAba] = useState(inicial.aba || 'projecao');
  const [seed, setSeed] = useState(SEMENTE_PADRAO);
  const [resultados, setResultados] = useState(inicial.resultado ? { [chave(inicial.sigla || 'A1', SEMENTE_PADRAO)]: inicial.resultado } : {});
  const [erro, setErro] = useState(null);
  const worker = useRef(null), pedidos = useRef(new Set());

  // Tema: o do aparelho até a pessoa escolher; a escolha fica guardada no navegador.
  const [tema, setTema] = useState('claro');
  useEffect(() => {
    const guardado = document.documentElement.dataset.tema;
    setTema(guardado || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'));
  }, []);
  useEffect(() => {
    const cor = getComputedStyle(document.documentElement).getPropertyValue('--fundo').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cor);
  }, [tema]);
  const trocarTema = () => {
    const novo = tema === 'escuro' ? 'claro' : 'escuro';
    document.documentElement.dataset.tema = novo;
    try { localStorage.setItem('paulistao-tema', novo); } catch { /* sem armazenamento, vale só nesta visita */ }
    setTema(novo);
  };

  useEffect(() => {
    const w = new Worker(urlDoWorker, { type: 'module' });
    w.onmessage = ({ data }) => {
      if (data.erro) setErro(data.erro);
      else setResultados(r => ({ ...r, [data.id]: data.resultado }));
    };
    w.onerror = e => setErro(e.message || 'a simulação não pôde ser iniciada');
    worker.current = w;
    return () => w.terminate();
  }, []);

  const id = chave(sigla, seed), resultado = resultados[id];
  useEffect(() => {
    if (resultado || !worker.current || pedidos.current.has(id)) return;
    pedidos.current.add(id);
    worker.current.postMessage({ id, sigla, nS: N_SIMS, seed });
  }, [id, resultado]);

  const e = ENTRADAS[sigla], abas = ABAS.filter(a => !a.so || a.so === sigla);
  const atual = abas.find(a => a.id === aba) || abas[0], Conteudo = atual.componente;
  const s = e.semente;

  return (
    <div className="pagina">
      <header className="topo">
        <div className="marca">
          <span className="bandeira" aria-hidden="true"><span /></span>
          <h1>Paulistão 2027</h1>
        </div>
        <div className="controles">
          <div className="divisoes" role="group" aria-label="Divisão">
            {SIGLAS.map(d => (
              <button key={d} type="button" aria-pressed={d === sigla} onClick={() => setSigla(d)}>Série {d}</button>
            ))}
          </div>
          <button type="button" className="tema" onClick={trocarTema}>{tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}</button>
        </div>
      </header>

      {s.provisoria && (
        <p className="aviso">
          <span className="selo" aria-hidden="true">!</span>
          <span><strong>Projeção provisória.</strong> A força dos clubes vem do Brasileiro de {s.anoBase}, lido em {dataBR(s.lidoEm)} com a Série A em andamento.</span>
        </p>
      )}

      <nav className="abas" aria-label="Seções">
        {abas.map(a => (
          <button key={a.id} type="button" aria-current={a.id === atual.id ? 'page' : undefined} onClick={() => setAba(a.id)}>{a.nome}</button>
        ))}
      </nav>

      <main>
        {erro && <p className="erro">A simulação falhou: {erro}. Recarregue a página para tentar de novo.</p>}
        {atual.precisaDeResultado && !resultado && !erro
          ? <p className="espera" role="status">Simulando {N_SIMS.toLocaleString('pt-BR')} temporadas da Série {sigla}…</p>
          : <Conteudo key={sigla} sigla={sigla} entradas={e} resultado={resultado} />}
        {atual.precisaDeResultado && resultado && (
          <p className="rodape-sim">
            {resultado.nSims.toLocaleString('pt-BR')} temporadas simuladas, {resultado.mandoSorteado ? 'com o mando de campo sorteado em cada uma porque a tabela ainda não saiu' : 'com a tabela oficial'}.{' '}
            <button type="button" className="texto" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>Simular de novo</button>
          </p>
        )}
      </main>
    </div>
  );
}
