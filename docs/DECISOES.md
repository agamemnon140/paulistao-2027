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
| 16 | Ingestão | Action no desenho do `brasileiro-2026`: cron e disparo manual, `results.json`, lista fechada de nomes, limite de volume | Já provado lá |

Fora da primeira entrega: botão de atualizar pelo app, H2H, valor de mercado como semente.

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

## O que ainda não se sabe

- Se o runner do GitHub Actions é aceito pelo site da FPF. Só foi testado pelo navegador.
- Como o handler representa um jogo ainda não disputado (não havia nenhum para observar).
- A escada nacional de 2026, que só fecha em dezembro.
- Se cerca de 1.150 jogos separam as ordenações de semente. O REPORT sugere que não; a
  amplitude por divisão deve sair bem medida.

## Fontes

- Regulamento A1 2026: https://futebolpaulista.com.br/Repositorio/Competicao/Regulamento/1551/1551_639033989807692307.pdf
- Formato da A2 2027: https://www.dgabc.com.br/Noticia/4365620/ramalhao-aposta-em-planejamento-antecipado-para-buscar-acesso-na-serie-a-2
- Sorteio e formato do A1 2027: https://www.flashscore.com.br/noticias/futebol-paulista-paulistao-2027-seguira-com-formato-da-champions-league-veja-todos-os-duelos/x2HXKiQP/
- Calendário CBF 2027: https://gazetaesportiva.com/campeonatos/brasileiro-serie-a/calendario-futebol-brasileiro-2027-cbf-datas-mudancas/
- Resultados do A1 2026: https://rsssfbrasil.com/tablessz/sp2026.htm
- Modelo e avaliação de origem: https://github.com/agamemnon140/brasileiro-2026 (`eval/REPORT.md`)
