// Projeção do Paulista 2027.
//
//   node scripts/projetar.mjs               mostra a projeção das duas divisões
//   node scripts/projetar.mjs --sementes    regrava data/2027/sementes.json (depois de reler a base nacional)
//   node scripts/projetar.mjs --arquivar    acrescenta a projeção a predictions.jsonl
//
// O arquivo de previsões só cresce: cada linha é o que o modelo dizia num momento. Se a
// última linha de uma divisão tem as mesmas entradas de agora, não há o que arquivar.

import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, SIGLAS, ARQ_SEMENTES, ARQ_PREVISOES, sementes2027, serializarSementes, projetar, registro, lerPrevisoes } from './projecao.mjs';

const args = new Set(process.argv.slice(2));
if (args.has('--sementes')) {
  fs.writeFileSync(path.join(RAIZ, ARQ_SEMENTES), serializarSementes(sementes2027()));
  console.log(`gravado ${ARQ_SEMENTES}`);
}

const f = (x, n = 1) => x.toFixed(n).padStart(6);
const anteriores = lerPrevisoes(), quando = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
for (const sigla of SIGLAS) {
  const r = projetar(sigla), s = r.entradas.semente, acesso = r.entradas.comp.formato.premio === 'acesso';
  console.log(`\n${sigla} ${r.ano} — ${r.nSims} simulações, ${r.mandoSorteado ? 'mando sorteado a cada simulação' : 'tabela oficial'}; semente ${s.tipo} (${s.forma}) de ${s.anoBase} (lida em ${s.lidoEm}${s.provisoria ? ', PROVISÓRIA' : ''}), amplitude ${s.razao}`);
  console.log(`${'time'.padEnd(22)} semente     Elo   pts  entre 8   semi  final ${acesso ? 'acesso' : 'título'}  rebaix.`);
  for (const p of r.probs) {
    const c = s.clubes[p.time];
    console.log(`${p.time.padEnd(22)} ${(c.serie ? c.serie + ' ' + String(c.pos).padStart(2) + 'º' : '  —  ').padEnd(7)} ${f(c.elo, 0)} ${f(p.mediaPts)} ${f(p.classificado)} ${f(p.semi)} ${f(p.final)} ${f(acesso ? p.acesso : p.titulo)} ${f(p.rebaixado)}`);
  }
  console.log(`pontos da última vaga: ${r.pontosParaClassificar.p50} (${r.pontosParaClassificar.p10} a ${r.pontosParaClassificar.p90}); pontos do primeiro rebaixado: ${r.pontosDoPrimeiroRebaixado.p50} (${r.pontosDoPrimeiroRebaixado.p10} a ${r.pontosDoPrimeiroRebaixado.p90})`);
  if (args.has('--arquivar')) {
    const reg = registro(sigla, r, { quando }), ultimo = anteriores.filter(x => x.competicao === sigla).at(-1);
    if (ultimo && ultimo.entradas === reg.entradas) console.log(`  ${ARQ_PREVISOES}: nada mudou desde ${ultimo.quando}; não arquivado`);
    else { fs.appendFileSync(path.join(RAIZ, ARQ_PREVISOES), JSON.stringify(reg) + '\n'); console.log(`  ${ARQ_PREVISOES}: arquivado (${reg.tipo}, entradas ${reg.entradas})`); }
  }
}
