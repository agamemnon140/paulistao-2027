// O Monte Carlo roda fora da thread da página, para a tela não travar enquanto simula.
import { ENTRADAS } from './dados.js';
import { projetarCom } from './projecao.js';

self.onmessage = ({ data: { id, sigla, nS, seed } }) => {
  try {
    const { geralTrace, ...r } = projetarCom(ENTRADAS[sigla], { nS, seed });
    self.postMessage({ id, sigla, resultado: { ...r, seed } });
  } catch (erro) {
    self.postMessage({ id, sigla, erro: String(erro && erro.message || erro) });
  }
};
