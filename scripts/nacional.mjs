// Situação nacional dos clubes paulistas: em que série jogaram e em que posição ficaram.
//
// Lê data/nacional/classificacoes_*.json (Wikipedia, pelo workflow "Classificações
// nacionais") e traduz os nomes de lá para os canônicos daqui com data/nacional/
// paulistas.json. Clube que não está no mapa de apelidos não é paulista e é ignorado.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'nacional');
const ler = arq => JSON.parse(fs.readFileSync(path.join(DIR, arq), 'utf8'));

// {2021: {clube: {serie, pos}}, ...} para todos os anos coletados, e a data de leitura de
// cada ano (só existe nos arquivos lidos depois de 14/11/2026).
export function nacionalPorAno() {
  const apelidos = ler('paulistas.json').apelidos, nac = {}, lidoEm = {};
  for (const arq of fs.readdirSync(DIR).filter(a => /^classificacoes_.*\.json$/.test(a)).sort()) {
    const d = ler(arq);
    for (const [chave, linhas] of Object.entries(d.classificacoes)) {
      const ano = chave.slice(0, 4), serie = chave[4];
      if (d.lidoEm) lidoEm[ano] = d.lidoEm;
      for (const x of linhas) {
        const clube = apelidos[x.n];
        if (!clube) continue;
        if ((nac[ano] ||= {})[clube]) throw new Error(`${clube} aparece em duas séries em ${ano}`);
        nac[ano][clube] = { serie, pos: x.pos };
      }
    }
  }
  return { nac, lidoEm };
}
