// Os dados que o app carrega: as duas divisões, as sementes e o arquivo de previsões.
import a1 from '../data/2027/a1.json';
import a2 from '../data/2027/a2.json';
import sementes from '../data/2027/sementes.json';
import previsoesBrutas from '../predictions.jsonl?raw';
import { montarEntradas } from './projecao.js';

export const SIGLAS = ['A1', 'A2'];
export const ENTRADAS = { A1: montarEntradas(a1, sementes.A1), A2: montarEntradas(a2, sementes.A2) };
export const PREVISOES = previsoesBrutas.split('\n').filter(Boolean).map(l => JSON.parse(l));
