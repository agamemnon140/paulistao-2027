# Paulistão 2027: registro de decisões

Fechado em 14/11/2026, numa sessão de planejamento. Este é o registro do que foi decidido e
por quê, para que uma sessão futura não precise refazer a conversa. Quando uma decisão
mudar, edite a linha e diga o que a fez mudar.

## O que é

Simulador Monte Carlo do Campeonato Paulista 2027, Séries A1 e A2, num repositório próprio
(`paulistao-2027`, público). O modelo é o do `brasileiro-2026`; o que muda é o formato das
competições, a fonte de dados e a disciplina de avaliação.

## Decisões

| # | Tema | Decisão | Por quê |
|---|---|---|---|
| 1 | Repositório | Novo, só Paulista; A1 e A2 desde a primeira entrega | Serve de piloto da arquitetura de 2027 sem amarrar o lançamento de 10/01 ao porte do Brasileirão |
| 2 | Código | `engine/*.mjs` puro, usado por app, harness e Action; UI em JSX; o CI gera o HTML e publica no Pages, sem commitar o gerado | REPORT §15.13 do `brasileiro-2026`; evita editar `createElement` à mão e a deriva fonte↔gerado |
| 3 | Modelo | Porte fiel do motor do `brasileiro-2026` (modo ATK/DEF, `updR`, drift, Elo como está lá), com teste de paridade | É o modelo que o `eval/` de lá mediu; redesenhar agora jogaria fora essa evidência |
| 4 | Dados | Handlers JSON oficiais da FPF, para o histórico e para 2027 | Mesma lição do Brasileirão: fonte oficial e determinística, sem modelo de linguagem no meio |
| 5 | Sequência | Backtest primeiro; depois projeção pré-tabela; depois tabela oficial | Nenhum número publicado com semente não validada |
| 6 | Backtest: janela | 2022–2026, A1 e A2 (cerca de 1.150 jogos) | A avaliação jogo a jogo independe do formato; mais anos, mais poder |
| 7 | Backtest: protocolo | Escolher em 2022–2025, confirmar em 2026 | 2026 é o único ano no formato de potes; evita varrer e avaliar no mesmo conjunto |
| 8 | Backtest: critério | Calibração e consistência entre anos e divisões decidem; Brier confirma; em empate vence a semente mais simples | REPORT: com poucas centenas de jogos o Brier é dominado por ruído |
| 9 | Sementes candidatas | Divisão nacional; Brasileiro do ano anterior (divisão + posição); Paulista do ano anterior; estado final do modelo no Paulista anterior; RNC; composta (base nacional corrigida pelo Paulista anterior); "todos iguais" como piso | Só derivadas de resultado: cobrem os 32 clubes e saem de dados que a coleta já traz |
| 10 | O que o backtest ajusta | Ordem e amplitude da semente por divisão; `pesoCasa` se o viés de casa medido for significativo. Preset, drift e total de gols herdados do REPORT | Menos parâmetros, menos ajuste de ruído |
| 11 | Projeção pré-tabela | Mando sorteado a cada simulação, trocado pela tabela oficial quando a FPF publicar | Os 64 confrontos do A1 já são conhecidos; só mandos e ordem faltam |
| 12 | Saídas | Título, vice, semi, quartas, top-8, rebaixamento, matriz de posições, percentis; Chaves; Dificuldade do sorteio (só A1); Vagas 2028. Na A2, acesso no lugar de vagas | Painel do simulador de 2026 mais o que foi pedido |
| 13 | Vagas 2028 | Regra de 2027 com divisões nacionais congeladas, rotulada como premissa | O regulamento de 2027 não saiu, e quem estará em cada divisão em 2028 só se sabe no fim de 2027 |
| 14 | Interface | Edição manual com "1 Simulação", aba Evolução lida do arquivo de previsões, PWA | Herdado do `brasileiro-2026` |
| 15 | Arquivo de previsões | `predictions.jsonl` desde a primeira projeção | REPORT §15.1: é a única coisa que não dá para fazer retroativamente |
| 16 | Ingestão | **Adiada em 14/11/2026**; decidir antes de 10/01/2027. A FPF responde 403 ao runner do GitHub e também ao coletor em Node num computador comum, e o app publicado não lê a FPF direto (CORS); só um navegador lê a fonte. Restrição: a solução não pode depender de trabalho manual do dono a cada rodada. Candidatas: tarefa agendada lendo pelo navegador, navegador automatizado, outra fonte | Os três bloqueios foram medidos; o simulador não depende dessa escolha para ser construído |
| 17 | Semente (**proposta, aguardando confirmação**) | `brasileiro` nas duas divisões: colocação nacional do ano anterior na escada A→D; quem não tem série nacional fica um degrau abaixo do pior do grupo. Amplitude 1,50 no A1 e 1,25 na A2 | Ver "Leitura do backtest" abaixo |
| 18 | Mando (**proposta, aguardando confirmação**) | A1 fica como está: 0,58 na 1ª fase, 0,65 no mata-mata. A2 passa a 0,55 na 1ª fase e no mata-mata | No A1 o viés não é significativo; na A2 é, na escolha e na confirmação |
| 19 | Fora do combinado na decisão 10 (**precisa de decisão**) | Total de gols do mata-mata da A2 (2,31 herdado; 1,84 medido em 62 jogos) e a falta de empates na A2 | O backtest mediu, mas mexer aqui é mudar mais do que semente e mando |

Fora da primeira entrega: botão de atualizar pelo app, H2H, valor de mercado como semente.

## Leitura do backtest (14/11/2026)

Números em [`eval/RELATORIO.md`](../eval/RELATORIO.md); `test/eval.test.mjs` fixa cada
afirmação abaixo, de modo que o teste quebra se os dados mudarem a leitura.

**A amplitude importa mais do que a ordem.** Com a amplitude do Brasileirão (3,0), semear
é pior do que não semear, nas duas divisões. O ótimo fica entre 1,25 e 1,75: com 1,50, o
melhor em casa contra o pior vence 69% das vezes; com 3,0 o modelo diria 94%.

**A1.** As quatro sementes batem "todos iguais" nos quatro anos da escolha, todas com IC
fora do zero. `composta` tem o menor Brier, mas empata com `brasileiro` (Δ +0,0014, IC
de −0,0045 a +0,0076) e perde dela em 2026; pelo critério da decisão 8, empate vai para a
mais simples. Contra `divisão`, `brasileiro` ganha em quatro dos cinco anos e empata no
outro (2022, diferença de 0,0001). A semente `paulista` sozinha é a mais fraca e não
bate o piso em 2026. Ou seja: o Paulista anterior não acrescenta nada mensurável ao
Brasileiro anterior.

**A2.** A escada estadual não ajuda em amplitude nenhuma. A semente nacional ajuda pouco:
com 1,25 o IC exclui zero na escolha (Δ −0,0069) e nos cinco anos, e 2026 repete o tamanho
do efeito; com 1,50 o Brier é praticamente o mesmo, mas o IC já cruza zero e só dois dos
quatro anos batem o piso. Na dúvida, a amplitude menor. De 11 a 14 dos 16 clubes não têm
série nacional, então a semente só separa uns poucos clubes do resto.

**Mando.** No A1 o viés de casa com 0,58 é de +1,9 ponto (z 0,79): fica. No mata-mata do
A1, 0,65 subestima um pouco o mandante (−5,8 pontos, z −0,85) e qualquer valor menor
piora: fica. Na A2, 0,58 exagera o mandante em 5,0 pontos na escolha (z 2,23) e 10,5 em
2026 (z 2,37). Com 0,55 o viés cai para +1,4 (z 0,65) e o Brier é praticamente o mínimo
da varredura; 0,55 é também a fatia de gols do mandante medida nos jogos (0,556). Zerar o
viés pediria 0,54, mas à custa de exagerar o visitante, porque o que falta de fato é
empate. No mata-mata da A2, 0,65 exagera o mandante em 19,8 pontos (z 3,20).

**O que o backtest mostrou e não foi pedido.** Na 1ª fase da A2 o modelo prevê 5,2 pontos
de empate a menos do que acontece (z −2,53); o total de gols herdado está certo (2,29
medido contra 2,31), então é a independência de Poisson, não o λ. Corrigir pede um termo
de empate, que é mudança de modelo. No mata-mata da A2 saem 1,84 gol por jogo, contra
2,31 herdado, e 42% de empates.

**O que não foi medido.** RNC: falta a série do ranking de 2022 a 2025. Estado final do
modelo no Paulista anterior: precisa dos jogos de 2021 (só há a classificação) e de uma
regra de escala entre divisões; usa a mesma informação da semente `paulista`, a mais
fraca das quatro, mas isso é expectativa, não medida. A confirmação é uma temporada: em
2026 nenhum IC exclui zero sozinho.

## Premissas rotuladas (trocar quando os regulamentos de 2027 saírem)

- Final do A1 em ida e volta. A FPF quer duas partidas, mas depende do calendário.
- Mata-mata da A2 em ida e volta com pênaltis, volta na casa da melhor campanha, e sobem os
  dois finalistas. O formato vem de uma única matéria de imprensa.
- Classificação geral do A1 por fase alcançada e depois campanha acumulada, com
  classificação nos pênaltis contando como empate. O regulamento de 2026 não define do 3º
  ao 16º; esta é a ordem que o `brasileiro-2026` validou para as vagas de 2027.
- Vagas na Série D: o Art. 69 do regulamento de 2026, lido ao pé da letra, exclui clubes da
  Série D de 2026, mas a imprensa noticiou que a Portuguesa se garantiu pelo Paulistão.
  Conferir no PDF e na fila estadual do `brasileiro-2026` antes de codificar.

## Fatos verificados

**Formato do A1 2027.** Mantido de 2026: 16 clubes, tabela única, oito jogos cada (três
contra o próprio pote, cinco contra os demais), top-8 nas quartas, dois rebaixados. Quartas
e semis em jogo único com mando da melhor campanha. Início em 10/01/2027, fim em
07/03/2027. Tabela com mandos prevista para meados de dezembro de 2026.

**Potes.** A: Palmeiras, Corinthians, São Paulo, Santos. B: Novorizontino, Red Bull
Bragantino, Portuguesa, Capivariano. C: Guarani, Botafogo-SP, Mirassol, Primavera.
D: São Bernardo, Noroeste, Juventus, Ferroviária.

**A2 2027.** Água Santa, Inter de Limeira, Ituano, Linense, Marília, Monte Azul, Osasco
Sporting, Ponte Preta, Portuguesa Santista, Santo André, São José, Sertãozinho, Taubaté,
Velo Clube, Votuporanguense, XV de Piracicaba. Turno único de 15 rodadas, top-8 no
mata-mata, dois rebaixados, de 17/01 a 12/05/2027.

**Regulamento do A1 2026** (referência até sair o de 2027). Desempate na 1ª fase: vitórias,
saldo, gols pró, menos vermelhos, menos amarelos, sorteio; sem confronto direto. Empate no
mata-mata vai direto aos pênaltis. Mando nas semis e na final pela campanha acumulada.
Art. 69: três indicados à Série D. Art. 70: cinco indicados à Copa do Brasil, excluídos os
clubes da Série A.

**Fonte da FPF** (observada inspecionando a rede no navegador em 14/11/2026):

- `Handlers/Competicoes/ListarRodadas.ashx?IdCampeonato=73&Ano=2026&IdCategoria=39`
- `Handlers/Competicoes/ListarTabela.ashx?IdCampeonato=73&Ano=2026&Rodada=9&IdClube=0&IdCategoria=39`
- Códigos: A1 73/39, A2 74/44, A3 76/46, Copa Paulista 100/70.
- Responde sem cookies. Tem A1 e A2 de 2022 a 2026 com o mata-mata; 2027 ainda vazio.
- Sem pênaltis neste handler; existem em `Handlers/Placar/PlacarOnline.ashx`, que exige um
  código por competição só visível com o campeonato em andamento.
- **Recusa clientes que não são navegador com HTTP 403**: o runner do GitHub Actions e o
  coletor em Node num computador comum (os dois medidos em 14/11/2026). Pelo navegador
  responde normalmente, inclusive abrindo o endereço do handler numa aba. Uma página de
  outro domínio não consegue ler a resposta (CORS).
- Devolve o nome atual do clube também nas temporadas antigas.

**Histórico coletado.** 1.184 jogos (A1 e A2, 2022 a 2026), lidos dos handlers num
navegador e transferidos com hash. Todas as temporadas têm 16 clubes e o número certo de
jogos por clube; as duas divisões de 2026 fecham com as classificações publicadas pelo
RSSSF. No conjunto: mandante vence 41,7%, empate 30,5%, visitante 27,8%; 2,28 gols por jogo.

**Dados das sementes.** Classificações nacionais de 2021 a 2025, Séries A a D, lidas da
Wikipédia por Action (20 de 20; 2025 confere com o `brasileiro-2026`). Classificações da
1ª fase do A1 e A2 de 2021 e da A3 de 2021 a 2025, da FPF, com hash. Na 1ª fase de 2022 a
2025: A1 com 2,31 gols por jogo e 56,4% deles do mandante; A2 com 2,29 e 55,6%.

## O que ainda não se sabe

- Como os resultados de 2027 vão entrar sem trabalho manual (decisão 16).
- Como o handler representa um jogo ainda não disputado (não havia nenhum para observar).
- A escada nacional de 2026, que só fecha em dezembro.
- Se RNC ou o estado final do modelo no Paulista anterior bateriam a semente `brasileiro`.

## Fontes

- Regulamento A1 2026: https://futebolpaulista.com.br/Repositorio/Competicao/Regulamento/1551/1551_639033989807692307.pdf
- Formato da A2 2027: https://www.dgabc.com.br/Noticia/4365620/ramalhao-aposta-em-planejamento-antecipado-para-buscar-acesso-na-serie-a-2
- Sorteio e formato do A1 2027: https://www.flashscore.com.br/noticias/futebol-paulista-paulistao-2027-seguira-com-formato-da-champions-league-veja-todos-os-duelos/x2HXKiQP/
- Calendário CBF 2027: https://gazetaesportiva.com/campeonatos/brasileiro-serie-a/calendario-futebol-brasileiro-2027-cbf-datas-mudancas/
- Resultados do A1 2026: https://rsssfbrasil.com/tablessz/sp2026.htm
- Modelo e avaliação de origem: https://github.com/agamemnon140/brasileiro-2026 (`eval/REPORT.md`)
