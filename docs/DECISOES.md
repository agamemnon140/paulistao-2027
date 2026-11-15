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
| 17 | Semente | Colocação nacional do ano anterior na escada A→D, com o posto em logaritmo; quem não jogou série nacional fica um posto abaixo do pior do grupo. Amplitude 2,0 no A1 e 1,25 na A2. Aprovada em 14/11/2026 na forma linear com amplitude 1,5 no A1; a forma logarítmica entrou no mesmo dia, depois da primeira projeção, pelo critério da decisão 8 | Ver "Leitura do backtest" abaixo |
| 18 | Mando | A1 fica como está: 0,58 na 1ª fase, 0,65 no mata-mata. A2 passa a 0,55 na 1ª fase e no mata-mata. Aprovado em 14/11/2026 | No A1 o viés não é significativo; na A2 é, na escolha e na confirmação |
| 19 | Fora do combinado na decisão 10 | Gols do mata-mata da A2: 1,85 por jogo no lugar dos 2,31 herdados. A falta de empates na A2 fica sem correção. Aprovado em 14/11/2026 | 1,84 medido em 62 jogos; corrigir empate é mudar o modelo, não um parâmetro |

Fora da primeira entrega: botão de atualizar pelo app, H2H, valor de mercado como semente.

## Leitura do backtest (14/11/2026)

Números em [`eval/RELATORIO.md`](../eval/RELATORIO.md); `test/eval.test.mjs` fixa cada
afirmação abaixo, de modo que o teste quebra se os dados mudarem a leitura.

**A amplitude importa mais do que a ordem.** Com a escada linear e a amplitude do
Brasileirão (3,0), semear é pior do que não semear, nas duas divisões. O ótimo fica entre
1,25 e 2.

**A1: a semente.** As seis sementes batem "todos iguais" nos quatro anos da escolha, todas
com IC fora do zero. A de menor Brier é a colocação nacional com o posto em logaritmo, com
amplitude 2,0: Δ −0,0289 contra o piso (IC de −0,0478 a −0,0118). Contra a mesma escada
em forma linear, ganha por −0,0094 (IC de −0,0182 a −0,0009), em cada um dos quatro anos
e de novo em 2026. Contra a raiz quadrada e contra a composta o IC cruza zero; a raiz perde
nos cinco anos e a composta usa duas fontes em vez de uma. A semente `paulista` sozinha é
a mais fraca e não bate o piso em 2026: o Paulista anterior não acrescenta nada mensurável
ao Brasileiro anterior.

**A1: de onde vem a vantagem do logaritmo.** Quase toda dos jogos do Palmeiras: neles a
diferença é de −0,0506 (64 jogos); nos outros 362 é de −0,0021, com IC de −0,0087 a
+0,0042. Com a escada linear, o Palmeiras fez 0,58 ponto por jogo acima do esperado, nas
cinco temporadas, e os clubes vindos da Série B fizeram 0,22 abaixo; com o logaritmo
nenhuma faixa da escada sai de dois erros-padrão (Palmeiras +0,12). Em termos práticos, a
forma logarítmica diz que estar no topo da Série A vale muito mais do que a escada linear
supõe, e a evidência disso é um clube em cinco temporadas. Ressalva de protocolo: as
formas raiz e log foram testadas depois de olhar resíduos que incluíam 2026, então para
elas 2026 não é confirmação limpa; o que sustenta a escolha são os quatro anos da escolha.

**A2.** A escada estadual não ajuda em amplitude nenhuma, e a forma da escada nacional é
indiferente (diferença abaixo de 0,001). A semente nacional ajuda pouco: com 1,25 o IC
exclui zero na escolha (Δ −0,0067) e nos cinco anos, três dos quatro anos batem o piso e
2026 repete o tamanho do efeito; com 1,50 o Brier é praticamente o mesmo, mas o IC já
cruza zero e só dois dos quatro anos batem o piso. Na dúvida, a amplitude menor. De 11 a
14 dos 16 clubes não têm série nacional, então a semente só separa uns poucos clubes do
resto.

**Mando.** No A1 o viés de casa com 0,58 é de +2,0 pontos (z 0,82): fica. No mata-mata do
A1, 0,65 subestima um pouco o mandante (−4,2 pontos, z −0,63) e baixar piora: fica. Na A2,
0,58 exagera o mandante em 4,8 pontos na escolha (z 2,16) e 10,3 em 2026 (z 2,29). Com
0,55 o viés cai para +1,3 (z 0,56) e o Brier é praticamente o mínimo da varredura; 0,55 é
também a fatia de gols do mandante medida nos jogos (0,556). Zerar o viés pediria 0,54,
mas à custa de exagerar o visitante, porque o que falta de fato é empate. No mata-mata da
A2, 0,65 exagera o mandante em 19,8 pontos (z 3,18).

**Promoção e rebaixamento.** Ter subido ou caído não tem efeito que a semente já não
carregue. Comparando os pontos por jogo de cada clube na 1ª fase com o que a semente
esperava, os movimentos não se distinguem de zero, com 3 a 12 casos cada. No estadual: o
promovido ao A1 rende o que a semente espera (+0,05 ponto por jogo; 1 de 10 terminou entre
os dois últimos), o promovido à A2 também (+0,06; nenhum de 10) e o rebaixado para a A2
rende um pouco mais (+0,17 ± 0,13; 8 de 10 entre os oito). No nacional o sinal é o
contrário de embalo: quem subiu de série rendeu menos do que a semente em 9 de 12 casos
(−0,19 ± 0,16) e quem caiu rendeu mais (+0,24 ± 0,13, 6 casos). Dois casos respondem pela
maior parte do primeiro número: Novorizontino em 2022 e Ponte Preta em 2026, os dois
lanternas do Paulista logo depois de subir da C para a B. Na A2, quem joga série nacional
no ano rende acima da semente (+0,18 ± 0,09; 12 de 13 entre os oito). Nada disso justifica
um termo de promoção ou rebaixamento na semente.

**O que o backtest mostrou e não foi pedido.** Na 1ª fase da A2 o modelo prevê 4,8 pontos
de empate a menos do que acontece (z −2,36); o total de gols herdado está certo (2,29
medido contra 2,31), então é a independência de Poisson, não o λ. Corrigir pede um termo
de empate, que é mudança de modelo. No mata-mata da A2 saem 1,84 gol por jogo, contra
2,31 herdado, e 42% de empates; o total passou a 1,85 (decisão 19).

**O que não foi medido.** RNC: falta a série do ranking de 2022 a 2025. Estado final do
modelo no Paulista anterior: precisa dos jogos de 2021 (só há a classificação) e de uma
regra de escala entre divisões; usa a mesma informação da semente `paulista`, a mais
fraca, mas isso é expectativa, não medida. A confirmação é uma temporada: em 2026 nenhum
IC exclui zero sozinho.

## Primeira projeção (14/11/2026)

`node scripts/projetar.mjs` roda 20.000 temporadas por divisão, com mando sorteado a cada
simulação enquanto a tabela oficial não sai. As duas primeiras linhas de
`predictions.jsonl` são desta data. **As sementes são provisórias**: a colocação nacional
de 2026 foi lida em 14/11, com a Série A na 34ª rodada de 38 e a Série B entre a 37ª e a
38ª; as Séries C e D já tinham acabado. As posições dos paulistas nas Séries A e B conferem com as
tabelas da CBF que o `brasileiro-2026` guarda.

No A1, o Palmeiras (2º da Série A) sai com 30,5% de título e 0,4% de rebaixamento; depois
vêm Red Bull Bragantino (12,4%), Santos (9,7%), São Paulo (8,8%) e Mirassol (8,6%). O
Corinthians, 17º da Série A na data da leitura, sai com 6,2%. Os três sem série nacional
(Juventus, Primavera e Capivariano) têm de 27% a 29% de rebaixamento. Na A2 só cinco
clubes se separam do pelotão: Ponte Preta e Inter de Limeira (perto de 23,5% de acesso
cada), Ituano (19%), XV de Piracicaba (12%) e Velo Clube (11%); os demais ficam em torno
de 10%.

Para fechar as sementes quando a Série A acabar: rodar o workflow "Classificações
nacionais" com `anos=2026`, trocar `provisoria` para `false` em `data/2027/a1.json` e
`a2.json`, e rodar `node scripts/projetar.mjs --sementes --arquivar`.

## Interface (14/11/2026)

Primeira versão em `app/`, compilada pelo Vite e publicada pelo workflow "Publicar". Tem
seis seções por divisão: Projeção (tabela de chances e matriz de posições), Mata-mata
(adversários prováveis em cada fase), Sorteio (dificuldade dos oito adversários, só no A1),
Uma temporada (uma simulação inteira, jogo a jogo), Evolução (lida de `predictions.jsonl`)
e Como funciona (modelo e premissas em linguagem comum). O Monte Carlo roda no navegador,
10.000 temporadas por divisão. É instalável e abre sem rede.

Do que a decisão 12 e a 14 pedem, ficou de fora:

- **Vagas de 2028.** Falta conferir os Arts. 69 e 70 no PDF e a fila estadual do
  `brasileiro-2026` (ver premissas abaixo) antes de codificar.
- **Edição manual de resultados.** Sem a tabela oficial não há jogo com mando para editar;
  entra junto com a tabela, em dezembro.

Publicado em 14/11/2026 em https://agamemnon140.github.io/paulistao-2027/ (o Pages do
repositório está com a fonte "GitHub Actions"). Conferido no ar no mesmo dia: as duas
divisões simulam, as seis seções abrem, e tudo o que a página carrega fica guardado para
uso sem rede já na primeira visita. Abrir de fato sem rede foi testado na cópia local, com
`scripts/qa/semrede.py`; no site publicado não há como cortar a rede pela automação.

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
- A colocação nacional final de 2026: a Série A acaba em dezembro e a semente está
  provisória até lá.
- Se RNC ou o estado final do modelo no Paulista anterior bateriam a semente escolhida.
- Se a forma logarítmica vale para além do Palmeiras: fora dos jogos dele a vantagem
  sobre a escada linear não se distingue de zero.

## Fontes

- Regulamento A1 2026: https://futebolpaulista.com.br/Repositorio/Competicao/Regulamento/1551/1551_639033989807692307.pdf
- Formato da A2 2027: https://www.dgabc.com.br/Noticia/4365620/ramalhao-aposta-em-planejamento-antecipado-para-buscar-acesso-na-serie-a-2
- Sorteio e formato do A1 2027: https://www.flashscore.com.br/noticias/futebol-paulista-paulistao-2027-seguira-com-formato-da-champions-league-veja-todos-os-duelos/x2HXKiQP/
- Calendário CBF 2027: https://gazetaesportiva.com/campeonatos/brasileiro-serie-a/calendario-futebol-brasileiro-2027-cbf-datas-mudancas/
- Resultados do A1 2026: https://rsssfbrasil.com/tablessz/sp2026.htm
- Modelo e avaliação de origem: https://github.com/agamemnon140/brasileiro-2026 (`eval/REPORT.md`)
