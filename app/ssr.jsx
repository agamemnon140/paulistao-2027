// Entrada para o teste: monta o app em texto, sem navegador, com um resultado já pronto.
import { renderToString } from 'react-dom/server';
import App from './App.jsx';
export { ENTRADAS, PREVISOES, SIGLAS } from './dados.js';
export { projetarCom, umaTemporada } from './projecao.js';
export { ABAS } from './abas.jsx';

export const renderizar = inicial => renderToString(<App inicial={inicial} />);
