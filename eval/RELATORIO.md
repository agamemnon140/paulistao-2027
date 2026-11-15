# Backtest das sementes: Paulista A1 e A2, 2022–2026

Gerado por `node eval/backtest.mjs` a partir de `data/`; não editar à mão
(`test/eval.test.mjs` falha se este arquivo e o código divergirem). A leitura destes
números e o que foi decidido com eles estão em `docs/DECISOES.md`.

## Método

- **Pergunta.** Com que ordem e com que amplitude semear os times antes da 1ª rodada.
- **Previsão.** Walk-forward com o motor de `engine/`: cada jogo é previsto com o estado
  treinado só nos jogos anteriores da mesma temporada, depois entra na atualização.
- **Sementes** (só informação anterior ao campeonato do ano Y):
  `divisão` = série nacional que o clube disputa em Y; `brasileiro` = colocação nacional
  em Y−1 na escada A→D (posto 1 a 20 na A, 17 a 36 na B, e assim por diante; sem série =
  um degrau abaixo do pior do grupo); `brasileiro (raiz)` e `brasileiro (log)` = o mesmo
  posto passado por raiz quadrada ou logaritmo, o que faz os degraus do topo valerem mais;
  `paulista` = colocação na 1ª fase estadual de Y−1 na escada A1→A3; `composta` = média
  de `brasileiro` e `paulista`; piso = todos iguais.
- **Amplitude** (`razão`): quantas vezes a força de ataque da melhor semente supera a da
  pior. A defesa espelha, então o gol esperado do melhor contra o pior, em campo neutro,
  vale razão² vezes o do pior contra o melhor. O motor do Brasileirão usa 3,0.
- **Protocolo.** Escolha em 2022–2025, por divisão; 2026 só confirma, com a razão já
  escolhida. A coluna "cinco anos" junta os dois conjuntos e serve só de descrição.
- **Métrica.** Brier de três desfechos (menor é melhor). Δ é a diferença pareada, jogo a
  jogo, contra o piso; IC95 por bootstrap pareado (2.000 reamostragens, semente fixa).
  ✱ marca IC que exclui zero.
- **Gols de base.** Liga 2,31 por jogo com 0,58 para o mandante; mata-mata 2,31 com 0,65.

## Limites

- Duas candidatas da decisão 9 **não foram rodadas**: RNC (falta a série histórica do
  ranking de 2022 a 2025) e o estado final do modelo no Paulista anterior (precisa de um
  parâmetro de escala entre divisões que este protocolo não ajusta).
- São 6 sementes × 11 razões por divisão; os IC não são corrigidos para comparações múltiplas.
- As formas raiz e log entraram depois: foram testadas porque os resíduos dos cinco anos
  (2026 incluído) mostraram os quatro grandes rendendo acima da escada linear. Para elas,
  2026 não é uma confirmação limpa; a evidência que vale é a dos anos de escolha.
- O bootstrap trata os jogos como independentes; o z dos vieses trata as probabilidades
  como fixas. Os dois subestimam um pouco a incerteza.
- A confirmação é uma temporada só (72 jogos no A1, 150 na A2).
- A ordem dos jogos é a da rodada, não a da data (a transferência não trouxe datas): jogo
  adiado entra na rodada nominal. O Troféu do Interior de 2022 e 2023 está nos jogos do A1.

## A1

Piso (todos iguais): Brier 0,6265 em 426 jogos na escolha; 0,6344 em 72 jogos em 2026.

### O que os jogos dizem, sem modelo

| recorte | jogos | gols/jogo | fatia de gols do mandante | mandante | empate | visitante |
|---|---|---|---|---|---|---|
| 1ª fase 2022–2025 | 384 | 2,31 | 0,564 | 43,0% | 28,6% | 28,4% |
| 1ª fase 2026 | 64 | 2,31 | 0,635 | 45,3% | 25,0% | 29,7% |
| mata-mata 2022–2026 | 50 | 2,18 | 0,716 | 64,0% | 24,0% | 12,0% |

### Sementes, cada uma na razão de menor Brier na escolha

| semente | razão | Brier | Δ contra o piso | anos que batem o piso | razão que cada ano escolheria | Δ em 2026 | Δ nos cinco anos | Brier com a razão 3,0 |
|---|---|---|---|---|---|---|---|---|
| divisão | 1,50 | 0,6105 | −0,0160 [−0,0302; −0,0028] ✱ | 4/4 | 1,50 · 1,50 · 1,75 · 1,50 | −0,0114 [−0,0487; +0,0255] | −0,0153 [−0,0276; −0,0029] ✱ | 0,6399 |
| brasileiro | 1,50 | 0,6070 | −0,0195 [−0,0343; −0,0059] ✱ | 4/4 | 1,50 · 1,50 · 1,75 · 1,75 | −0,0218 [−0,0594; +0,0163] | −0,0198 [−0,0327; −0,0068] ✱ | 0,6356 |
| brasileiro (raiz) | 1,75 | 0,6022 | −0,0243 [−0,0424; −0,0080] ✱ | 4/4 | 1,50 · 1,75 · 2,00 · 1,75 | −0,0280 [−0,0750; +0,0194] | −0,0248 [−0,0403; −0,0087] ✱ | 0,6195 |
| brasileiro (log) | 2,00 | 0,5976 | −0,0289 [−0,0478; −0,0118] ✱ | 4/4 | 1,75 · 2,00 · 2,50 · 2,00 | −0,0325 [−0,0860; +0,0202] | −0,0294 [−0,0466; −0,0123] ✱ | 0,6056 |
| paulista | 1,50 | 0,6139 | −0,0125 [−0,0240; −0,0024] ✱ | 4/4 | 1,50 · 2,00 · 1,50 · 1,50 | +0,0005 [−0,0312; +0,0286] | −0,0107 [−0,0211; −0,0001] ✱ | 0,6354 |
| composta | 1,75 | 0,6056 | −0,0209 [−0,0370; −0,0059] ✱ | 4/4 | 1,50 · 1,75 · 2,00 · 1,75 | −0,0106 [−0,0569; +0,0343] | −0,0194 [−0,0343; −0,0043] ✱ | 0,6196 |

Δ por ano, contra o piso, na razão escolhida:

| semente | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|
| divisão | −0,0115 | −0,0148 | −0,0147 | −0,0233 |
| brasileiro | −0,0114 | −0,0188 | −0,0210 | −0,0273 |
| brasileiro (raiz) | −0,0152 | −0,0219 | −0,0290 | −0,0316 |
| brasileiro (log) | −0,0217 | −0,0268 | −0,0355 | −0,0320 |
| paulista | −0,0079 | −0,0186 | −0,0098 | −0,0138 |
| composta | −0,0122 | −0,0222 | −0,0244 | −0,0251 |

### Brier por razão (escolha)

| razão | divisão | brasileiro | brasileiro (raiz) | brasileiro (log) | paulista | composta |
|---|---|---|---|---|---|---|
| 1,00 | 0,6265 | 0,6265 | 0,6265 | 0,6265 | 0,6265 | 0,6265 |
| 1,25 | 0,6137 | 0,6113 | 0,6102 | 0,6099 | 0,6168 | 0,6128 |
| 1,50 | 0,6105 | 0,6070 | 0,6035 | 0,6017 | 0,6139 | 0,6070 |
| 1,75 | 0,6122 | 0,6082 | 0,6022 | 0,5983 | 0,6148 | 0,6056 |
| 2,00 | 0,6164 | 0,6123 | 0,6038 | 0,5976 | 0,6177 | 0,6067 |
| 2,50 | 0,6279 | 0,6237 | 0,6109 | 0,6004 | 0,6261 | 0,6123 |
| 3,00 | 0,6399 | 0,6356 | 0,6195 | 0,6056 | 0,6354 | 0,6196 |
| 4,00 | 0,6610 | 0,6562 | 0,6360 | 0,6167 | 0,6527 | 0,6342 |
| 5,00 | 0,6772 | 0,6717 | 0,6493 | 0,6263 | 0,6669 | 0,6465 |
| 6,00 | 0,6883 | 0,6830 | 0,6599 | 0,6341 | 0,6783 | 0,6567 |
| 8,00 | 0,7035 | 0,6956 | 0,6743 | 0,6437 | 0,6937 | 0,6701 |

### Semente escolhida, `brasileiro (log)`, em cada razão

| razão | Δ na escolha | anos que batem o piso | Δ em 2026 | Δ nos cinco anos |
|---|---|---|---|---|
| 1,25 | −0,0166 [−0,0228; −0,0109] ✱ | 4/4 | −0,0168 [−0,0344; +0,0009] | −0,0166 [−0,0224; −0,0109] ✱ |
| 1,50 | −0,0248 [−0,0360; −0,0147] ✱ | 4/4 | −0,0259 [−0,0578; +0,0061] | −0,0249 [−0,0353; −0,0149] ✱ |
| 1,75 | −0,0282 [−0,0435; −0,0143] ✱ | 4/4 | −0,0305 [−0,0743; +0,0124] | −0,0286 [−0,0427; −0,0147] ✱ |
| 2,00 | −0,0289 [−0,0478; −0,0118] ✱ | 4/4 | −0,0325 [−0,0860; +0,0202] | −0,0294 [−0,0466; −0,0123] ✱ |
| 2,50 | −0,0260 [−0,0500; −0,0039] ✱ | 4/4 | −0,0324 [−0,1014; +0,0360] | −0,0270 [−0,0494; −0,0053] ✱ |
| 3,00 | −0,0209 [−0,0487; +0,0051] | 4/4 | −0,0300 [−0,1099; +0,0500] | −0,0222 [−0,0487; +0,0037] |

### A semente escolhida contra as outras

Diferença de Brier (primeira − segunda), cada uma na sua razão; negativo favorece a primeira.

| par | escolha | 2026 |
|---|---|---|
| divisão − brasileiro (log) | +0,0129 [+0,0033; +0,0227] ✱ | +0,0211 [−0,0152; +0,0533] |
| brasileiro − brasileiro (log) | +0,0094 [+0,0009; +0,0182] ✱ | +0,0107 [−0,0179; +0,0368] |
| brasileiro (raiz) − brasileiro (log) | +0,0046 [−0,0006; +0,0100] | +0,0045 [−0,0111; +0,0191] |
| brasileiro (log) − paulista | −0,0163 [−0,0308; −0,0026] ✱ | −0,0330 [−0,0757; +0,0095] |
| brasileiro (log) − composta | −0,0080 [−0,0177; +0,0017] | −0,0219 [−0,0535; +0,0093] |

Controle negativo (semente `brasileiro` invertida, razão 1,50, contra o piso): +0,0549 [+0,0409; +0,0703] ✱.

### De onde vem a vantagem do logaritmo

Diferença de Brier entre `brasileiro (log)` e `brasileiro` (linear), cada uma na sua razão,
em recortes dos mesmos jogos; negativo favorece o logaritmo.

| recorte | jogos na escolha | escolha | jogos nos cinco anos | cinco anos |
|---|---|---|---|---|
| todos os jogos | 426 | −0,0094 [−0,0182; −0,0008] ✱ | 498 | −0,0096 [−0,0179; −0,0012] ✱ |
| jogos do Palmeiras | 64 | −0,0506 [−0,0967; −0,0055] ✱ | 76 | −0,0485 [−0,0900; −0,0072] ✱ |
| jogos sem o Palmeiras | 362 | −0,0021 [−0,0087; +0,0042] | 422 | −0,0026 [−0,0089; +0,0037] |
| jogos com algum dos quatro grandes | 196 | −0,0171 [−0,0344; −0,0005] ✱ | 230 | −0,0191 [−0,0357; −0,0028] ✱ |
| jogos sem os quatro grandes | 230 | −0,0027 [−0,0098; +0,0037] | 268 | −0,0014 [−0,0083; +0,0053] |

### Mando na 1ª fase

Semente `brasileiro (log)`, razão 2,00. Viés = previsto − observado, em pontos percentuais; z entre parênteses.

| peso do mandante | viés mandante | viés empate | viés visitante | Brier | viés mandante 2026 | Brier 2026 |
|---|---|---|---|---|---|---|
| 0,50 | −6,8 (−2,91) | −1,5 (−0,68) | +8,3 | 0,6194 | −9,3 (−1,63) | 0,6327 |
| 0,52 | −4,6 (−1,97) | −1,5 (−0,68) | +6,2 | 0,6131 | −7,2 (−1,24) | 0,6269 |
| 0,54 | −2,5 (−1,04) | −1,6 (−0,72) | +4,1 | 0,6088 | −5,0 (−0,86) | 0,6228 |
| 0,55 | −1,4 (−0,57) | −1,7 (−0,75) | +3,1 | 0,6074 | −4,0 (−0,67) | 0,6215 |
| 0,56 | −0,3 (−0,11) | −1,8 (−0,79) | +2,0 | 0,6065 | −2,9 (−0,49) | 0,6206 |
| 0,57 | +0,9 (0,35) | −1,9 (−0,83) | +1,0 | 0,6061 | −1,8 (−0,30) | 0,6202 |
| 0,58 (padrão) | +2,0 (0,82) | −2,0 (−0,89) | +0,0 | 0,6062 | −0,7 (−0,11) | 0,6203 |
| 0,60 | +4,2 (1,75) | −2,3 (−1,03) | −1,9 | 0,6079 | +1,6 (0,26) | 0,6217 |
| 0,62 | +6,5 (2,70) | −2,7 (−1,20) | −3,9 | 0,6116 | +3,8 (0,64) | 0,6250 |

### Mando no mata-mata (50 jogos, 2022–2026; só informa)

| variante | gols/jogo | peso do mandante | viés mandante | viés empate | Brier |
|---|---|---|---|---|---|
| padrão | 2,31 | 0,65 | −4,2 (−0,63) | −0,4 (−0,06) | 0,5089 |
| peso de casa da liga | 2,31 | 0,58 | −11,6 (−1,72) | +1,6 (0,26) | 0,5261 |
| peso de casa 0,55 | 2,31 | 0,55 | −14,8 (−2,20) | +2,3 (0,37) | 0,5397 |
| gols medidos, peso 0,55 (dentro da amostra) | 2,18 | 0,55 | −15,7 (−2,32) | +3,4 (0,54) | 0,5417 |

### Sensibilidade e cobertura

Brier na escolha por preset de atualização (semente `brasileiro (log)`): conservador 0,5976, base 0,6024, agressivo 0,6233.

Clubes sem série nacional no ano anterior: 2022: 2, 2023: 3, 2024: 2, 2025: 3, 2026: 4 (de 16). Clubes fora da escada estadual: nenhum.

## A2

Piso (todos iguais): Brier 0,6613 em 536 jogos na escolha; 0,6724 em 150 jogos em 2026.

### O que os jogos dizem, sem modelo

| recorte | jogos | gols/jogo | fatia de gols do mandante | mandante | empate | visitante |
|---|---|---|---|---|---|---|
| 1ª fase 2022–2025 | 480 | 2,29 | 0,556 | 40,2% | 32,7% | 27,1% |
| 1ª fase 2026 | 120 | 2,38 | 0,514 | 35,0% | 30,8% | 34,2% |
| mata-mata 2022–2026 | 62 | 1,84 | 0,544 | 32,3% | 41,9% | 25,8% |

### Sementes, cada uma na razão de menor Brier na escolha

| semente | razão | Brier | Δ contra o piso | anos que batem o piso | razão que cada ano escolheria | Δ em 2026 | Δ nos cinco anos | Brier com a razão 3,0 |
|---|---|---|---|---|---|---|---|---|
| divisão | 1,50 | 0,6550 | −0,0063 [−0,0154; +0,0033] | 2/4 | 1,25 · 2,00 · 1,25 · 1,25 | −0,0044 [−0,0275; +0,0204] | −0,0059 [−0,0148; +0,0031] | 0,6796 |
| brasileiro | 1,50 | 0,6538 | −0,0075 [−0,0168; +0,0020] | 2/4 | 1,75 · 2,00 · 1,25 · 1,00 | −0,0075 [−0,0285; +0,0133] | −0,0075 [−0,0165; +0,0015] | 0,6786 |
| brasileiro (raiz) | 1,50 | 0,6538 | −0,0074 [−0,0166; +0,0019] | 2/4 | 1,75 · 2,00 · 1,25 · 1,00 | −0,0081 [−0,0284; +0,0120] | −0,0076 [−0,0164; +0,0012] | 0,6784 |
| brasileiro (log) | 1,50 | 0,6539 | −0,0073 [−0,0165; +0,0018] | 2/4 | 1,75 · 2,00 · 1,25 · 1,00 | −0,0087 [−0,0282; +0,0109] | −0,0076 [−0,0164; +0,0011] | 0,6782 |
| paulista | 1,00 | 0,6613 | 0,0000 [0,0000; 0,0000] | 0/4 | 1,00 · 1,25 · 1,25 · 1,00 | 0,0000 [0,0000; 0,0000] | 0,0000 [0,0000; 0,0000] | 0,7161 |
| composta | 1,25 | 0,6571 | −0,0042 [−0,0090; +0,0007] | 3/4 | 1,50 · 1,75 · 1,25 · 1,00 | −0,0073 [−0,0183; +0,0036] | −0,0049 [−0,0091; −0,0003] ✱ | 0,6837 |

Δ por ano, contra o piso, na razão escolhida:

| semente | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|
| divisão | −0,0044 | −0,0246 | +0,0001 | +0,0038 |
| brasileiro | −0,0149 | −0,0236 | +0,0018 | +0,0067 |
| brasileiro (raiz) | −0,0144 | −0,0236 | +0,0018 | +0,0065 |
| brasileiro (log) | −0,0139 | −0,0235 | +0,0018 | +0,0062 |
| paulista | 0,0000 | 0,0000 | 0,0000 | 0,0000 |
| composta | −0,0061 | −0,0103 | −0,0040 | +0,0036 |

### Brier por razão (escolha)

| razão | divisão | brasileiro | brasileiro (raiz) | brasileiro (log) | paulista | composta |
|---|---|---|---|---|---|---|
| 1,00 | 0,6613 | 0,6613 | 0,6613 | 0,6613 | 0,6613 | 0,6613 |
| 1,25 | 0,6552 | 0,6544 | 0,6545 | 0,6546 | 0,6614 | 0,6571 |
| 1,50 | 0,6550 | 0,6538 | 0,6538 | 0,6539 | 0,6666 | 0,6575 |
| 1,75 | 0,6577 | 0,6563 | 0,6564 | 0,6564 | 0,6741 | 0,6603 |
| 2,00 | 0,6618 | 0,6604 | 0,6604 | 0,6604 | 0,6826 | 0,6643 |
| 2,50 | 0,6711 | 0,6699 | 0,6697 | 0,6697 | 0,7000 | 0,6739 |
| 3,00 | 0,6796 | 0,6786 | 0,6784 | 0,6782 | 0,7161 | 0,6837 |
| 4,00 | 0,6916 | 0,6909 | 0,6905 | 0,6901 | 0,7432 | 0,7013 |
| 5,00 | 0,6965 | 0,6950 | 0,6943 | 0,6938 | 0,7640 | 0,7155 |
| 6,00 | 0,7001 | 0,6967 | 0,6959 | 0,6953 | 0,7802 | 0,7270 |
| 8,00 | 0,7058 | 0,6996 | 0,6987 | 0,6979 | 0,8028 | 0,7414 |

### Semente escolhida, `brasileiro (log)`, em cada razão

| razão | Δ na escolha | anos que batem o piso | Δ em 2026 | Δ nos cinco anos |
|---|---|---|---|---|
| 1,25 | −0,0067 [−0,0119; −0,0015] ✱ | 3/4 | −0,0076 [−0,0186; +0,0033] | −0,0069 [−0,0118; −0,0020] ✱ |
| 1,50 | −0,0073 [−0,0165; +0,0018] | 2/4 | −0,0087 [−0,0282; +0,0109] | −0,0076 [−0,0164; +0,0011] |
| 1,75 | −0,0048 [−0,0173; +0,0079] | 2/4 | −0,0063 [−0,0326; +0,0206] | −0,0052 [−0,0168; +0,0066] |
| 2,00 | −0,0009 [−0,0160; +0,0146] | 2/4 | −0,0021 [−0,0340; +0,0304] | −0,0011 [−0,0157; +0,0131] |
| 2,50 | +0,0084 [−0,0111; +0,0288] | 2/4 | +0,0084 [−0,0332; +0,0513] | +0,0084 [−0,0102; +0,0265] |
| 3,00 | +0,0170 [−0,0056; +0,0405] | 2/4 | +0,0194 [−0,0295; +0,0701] | +0,0175 [−0,0040; +0,0385] |

### A semente escolhida contra as outras

Diferença de Brier (primeira − segunda), cada uma na sua razão; negativo favorece a primeira.

| par | escolha | 2026 |
|---|---|---|
| divisão − brasileiro (log) | +0,0011 [−0,0026; +0,0048] | +0,0043 [−0,0059; +0,0151] |
| brasileiro − brasileiro (log) | −0,0002 [−0,0007; +0,0004] | +0,0012 [−0,0013; +0,0038] |
| brasileiro (raiz) − brasileiro (log) | −0,0001 [−0,0004; +0,0002] | +0,0006 [−0,0007; +0,0019] |
| brasileiro (log) − paulista | −0,0073 [−0,0165; +0,0018] | −0,0087 [−0,0282; +0,0109] |
| brasileiro (log) − composta | −0,0031 [−0,0093; +0,0032] | −0,0014 [−0,0123; +0,0101] |

Controle negativo (semente `brasileiro` invertida, razão 1,50, contra o piso): +0,0291 [+0,0193; +0,0393] ✱.

### De onde vem a vantagem do logaritmo

Diferença de Brier entre `brasileiro (log)` e `brasileiro` (linear), cada uma na sua razão,
em recortes dos mesmos jogos; negativo favorece o logaritmo.

| recorte | jogos na escolha | escolha | jogos nos cinco anos | cinco anos |
|---|---|---|---|---|
| todos os jogos | 536 | +0,0002 [−0,0004; +0,0007] | 686 | −0,0001 [−0,0009; +0,0005] |
| jogos sem o Palmeiras | 536 | +0,0002 [−0,0004; +0,0007] | 686 | −0,0001 [−0,0009; +0,0005] |
| jogos sem os quatro grandes | 536 | +0,0002 [−0,0004; +0,0007] | 686 | −0,0001 [−0,0009; +0,0005] |

### Mando na 1ª fase

Semente `brasileiro (log)`, razão 1,25. Viés = previsto − observado, em pontos percentuais; z entre parênteses.

| peso do mandante | viés mandante | viés empate | viés visitante | Brier | viés mandante 2026 | Brier 2026 |
|---|---|---|---|---|---|---|
| 0,50 | −4,5 (−2,10) | −4,1 (−2,01) | +8,7 | 0,6566 | +0,9 (0,22) | 0,6517 |
| 0,52 | −2,2 (−1,03) | −4,2 (−2,03) | +6,4 | 0,6515 | +3,2 (0,73) | 0,6526 |
| 0,54 | +0,1 (0,03) | −4,3 (−2,09) | +4,2 | 0,6486 | +5,5 (1,25) | 0,6556 |
| 0,55 | +1,3 (0,56) | −4,4 (−2,14) | +3,1 | 0,6480 | +6,7 (1,50) | 0,6580 |
| 0,56 | +2,4 (1,10) | −4,5 (−2,20) | +2,1 | 0,6479 | +7,9 (1,76) | 0,6608 |
| 0,57 | +3,6 (1,63) | −4,7 (−2,28) | +1,0 | 0,6484 | +9,1 (2,03) | 0,6643 |
| 0,58 (padrão) | +4,8 (2,16) | −4,8 (−2,36) | −0,0 | 0,6495 | +10,3 (2,29) | 0,6682 |
| 0,60 | +7,3 (3,24) | −5,2 (−2,57) | −2,1 | 0,6534 | +12,7 (2,82) | 0,6777 |
| 0,62 | +9,8 (4,34) | −5,7 (−2,83) | −4,0 | 0,6594 | +15,2 (3,37) | 0,6894 |

### Mando no mata-mata (62 jogos, 2022–2026; só informa)

| variante | gols/jogo | peso do mandante | viés mandante | viés empate | Brier |
|---|---|---|---|---|---|
| padrão | 2,31 | 0,65 | +19,8 (3,18) | −14,1 (−2,50) | 0,7078 |
| peso de casa da liga | 2,31 | 0,58 | +11,7 (1,88) | −12,6 (−2,19) | 0,6738 |
| peso de casa 0,55 | 2,31 | 0,55 | +8,3 (1,35) | −12,3 (−2,12) | 0,6676 |
| gols medidos, peso 0,55 (dentro da amostra) | 1,84 | 0,55 | +5,7 (0,94) | −8,2 (−1,37) | 0,6584 |

### Sensibilidade e cobertura

Brier na escolha por preset de atualização (semente `brasileiro (log)`): conservador 0,6546, base 0,6625, agressivo 0,6864.

Clubes sem série nacional no ano anterior: 2022: 13, 2023: 13, 2024: 14, 2025: 12, 2026: 11 (de 16). Clubes fora da escada estadual: nenhum.

## Promoção e rebaixamento

Quem mudou de divisão rende diferente do que a semente espera? Semente `brasileiro (log)`
com a amplitude e o mando decididos (A1: 2,00 e 0,58; A2: 1,25 e 0,55), forças fixas na semente,
1ª fase, 2022–2026. Resíduo = pontos por jogo reais − esperados; positivo quer dizer que o
grupo rende mais do que a semente previa. Movimento estadual: de onde o clube veio.
Movimento nacional: série do ano anterior contra a série do ano. Descritivo, com poucos
casos por grupo: |t| abaixo de 2 não distingue o resíduo de zero.

### A1

| grupo | casos | pontos/jogo | esperado pela semente | resíduo ± erro-padrão | t | abaixo do esperado | entre os 8 | entre os 2 últimos |
|---|---|---|---|---|---|---|---|---|
| promovido no estadual | 10 | 1,15 | 1,10 | +0,05 ± 0,10 | +0,54 | 5/10 | 4/10 | 1/10 |
| permaneceu na divisão estadual | 70 | 1,39 | 1,41 | −0,02 ± 0,05 | −0,33 | 34/70 | 36/70 | 9/70 |
| subiu de série nacional | 9 | 1,15 | 1,32 | −0,17 ± 0,22 | −0,80 | 6/9 | 4/9 | 2/9 |
| caiu de série nacional | 3 | 1,67 | 1,32 | +0,35 ± 0,26 | +1,36 | 1/3 | 2/3 | 0/3 |
| manteve a série nacional | 54 | 1,45 | 1,46 | −0,01 ± 0,05 | −0,21 | 24/54 | 31/54 | 6/54 |
| entrou na Série D | 5 | 1,06 | 1,04 | +0,02 ± 0,14 | +0,14 | 2/5 | 1/5 | 1/5 |
| sem série nos dois anos | 9 | 1,08 | 1,04 | +0,03 ± 0,13 | +0,27 | 6/9 | 2/9 | 1/9 |

### A2

| grupo | casos | pontos/jogo | esperado pela semente | resíduo ± erro-padrão | t | abaixo do esperado | entre os 8 | entre os 2 últimos |
|---|---|---|---|---|---|---|---|---|
| promovido no estadual | 10 | 1,37 | 1,30 | +0,06 ± 0,10 | +0,65 | 4/10 | 6/10 | 0/10 |
| rebaixado no estadual | 10 | 1,70 | 1,53 | +0,17 ± 0,13 | +1,32 | 4/10 | 8/10 | 0/10 |
| permaneceu na divisão estadual | 60 | 1,27 | 1,34 | −0,07 ± 0,05 | −1,51 | 31/60 | 26/60 | 10/60 |
| subiu de série nacional | 3 | 1,42 | 1,67 | −0,25 ± 0,14 | −1,82 | 3/3 | 2/3 | 0/3 |
| caiu de série nacional | 3 | 1,84 | 1,72 | +0,12 ± 0,09 | +1,33 | 1/3 | 3/3 | 0/3 |
| manteve a série nacional | 4 | 2,07 | 1,61 | +0,46 ± 0,12 | +3,93 | 0/4 | 4/4 | 0/4 |
| entrou na Série D | 3 | 1,62 | 1,32 | +0,31 ± 0,07 | +4,11 | 0/3 | 3/3 | 0/3 |
| saiu da Série D | 7 | 1,46 | 1,37 | +0,09 ± 0,12 | +0,75 | 1/7 | 6/7 | 0/7 |
| sem série nos dois anos | 60 | 1,23 | 1,31 | −0,08 ± 0,05 | −1,71 | 34/60 | 22/60 | 10/60 |

### Conjuntos

| grupo | casos | pontos/jogo | esperado pela semente | resíduo ± erro-padrão | t | abaixo do esperado | entre os 8 | entre os 2 últimos |
|---|---|---|---|---|---|---|---|---|
| subiu de série nacional (A1 e A2) | 12 | 1,22 | 1,41 | −0,19 ± 0,16 | −1,18 | 9/12 | 6/12 | 2/12 |
| caiu de série nacional (A1 e A2) | 6 | 1,76 | 1,52 | +0,24 ± 0,13 | +1,79 | 2/6 | 5/6 | 0/6 |
| A2: joga série nacional no ano | 13 | 1,76 | 1,58 | +0,18 ± 0,09 | +2,02 | 4/13 | 12/13 | 0/13 |
| A2: sem série no ano, tinha no anterior | 7 | 1,46 | 1,37 | +0,09 ± 0,12 | +0,75 | 1/7 | 6/7 | 0/7 |
| A2: sem série nos dois anos | 60 | 1,23 | 1,31 | −0,08 ± 0,05 | −1,71 | 34/60 | 22/60 | 10/60 |

### Os casos

| divisão | ano | clube | estadual | série nacional | posição na 1ª fase | pontos/jogo | esperado | resíduo |
|---|---|---|---|---|---|---|---|---|
| A1 | 2022 | Ituano | permaneceu | C → B | 5 | 1,58 | 1,31 | +0,27 |
| A1 | 2022 | Novorizontino | permaneceu | C → B | 16 | 0,25 | 1,23 | −0,98 |
| A1 | 2022 | São Bernardo | promovido | – → D | 8 | 1,33 | 0,94 | +0,39 |
| A1 | 2022 | Água Santa | promovido | – → – | 14 | 0,92 | 0,98 | −0,07 |
| A1 | 2023 | Botafogo-SP | permaneceu | C → B | 9 | 1,17 | 1,32 | −0,15 |
| A1 | 2023 | Mirassol | permaneceu | C → B | 7 | 1,25 | 1,33 | −0,08 |
| A1 | 2023 | Portuguesa-SP | promovido | – → – | 14 | 0,83 | 1,06 | −0,23 |
| A1 | 2023 | São Bento | promovido | – → – | 15 | 0,83 | 1,07 | −0,23 |
| A1 | 2023 | São Bernardo | permaneceu | D → C | 2 | 2,17 | 1,21 | +0,95 |
| A1 | 2024 | Novorizontino | promovido | B → B | 4 | 1,83 | 1,40 | +0,43 |
| A1 | 2024 | Ponte Preta | promovido | B → B | 8 | 1,42 | 1,33 | +0,09 |
| A1 | 2024 | Santos | permaneceu | A → B | 2 | 2,08 | 1,41 | +0,67 |
| A1 | 2025 | Guarani | permaneceu | B → C | 10 | 1,08 | 1,24 | −0,16 |
| A1 | 2025 | Mirassol | permaneceu | B → A | 9 | 1,33 | 1,49 | −0,16 |
| A1 | 2025 | Noroeste | promovido | – → – | 14 | 0,67 | 1,01 | −0,35 |
| A1 | 2025 | Ponte Preta | permaneceu | B → C | 4 | 1,83 | 1,30 | +0,54 |
| A1 | 2025 | Santos | permaneceu | B → A | 6 | 1,50 | 1,47 | +0,03 |
| A1 | 2025 | Velo Clube | promovido | – → – | 11 | 1,08 | 1,05 | +0,03 |
| A1 | 2026 | Capivariano | promovido | – → – | 7 | 1,63 | 1,10 | +0,52 |
| A1 | 2026 | Ponte Preta | permaneceu | C → B | 16 | 0,13 | 1,40 | −1,27 |
| A1 | 2026 | Primavera-SP | promovido | – → – | 12 | 1,00 | 1,07 | −0,07 |
| A1 | 2026 | São Bernardo | permaneceu | C → B | 13 | 1,00 | 1,16 | −0,16 |
| A2 | 2022 | Linense | promovido | – → – | 7 | 1,47 | 1,31 | +0,16 |
| A2 | 2022 | Osasco Sporting | permaneceu | C → D | 2 | 2,00 | 1,74 | +0,26 |
| A2 | 2022 | Primavera-SP | promovido | – → – | 8 | 1,47 | 1,31 | +0,16 |
| A2 | 2022 | São Bento | rebaixado | D → – | 6 | 1,47 | 1,34 | +0,12 |
| A2 | 2022 | São Caetano | rebaixado | – → – | 11 | 1,13 | 1,33 | −0,20 |
| A2 | 2023 | Comercial-SP | promovido | – → – | 8 | 1,27 | 1,30 | −0,04 |
| A2 | 2023 | Noroeste | promovido | – → – | 3 | 1,73 | 1,30 | +0,43 |
| A2 | 2023 | Novorizontino | rebaixado | B → B | 2 | 1,93 | 1,68 | +0,25 |
| A2 | 2023 | Ponte Preta | rebaixado | B → B | 1 | 2,40 | 1,73 | +0,67 |
| A2 | 2024 | Capivariano | promovido | – → – | 14 | 1,07 | 1,32 | −0,26 |
| A2 | 2024 | Ferroviária | rebaixado | D → C | 3 | 1,73 | 1,75 | −0,02 |
| A2 | 2024 | São Bento | rebaixado | – → – | 1 | 2,13 | 1,35 | +0,79 |
| A2 | 2024 | São José-SP | promovido | – → D | 2 | 1,73 | 1,32 | +0,41 |
| A2 | 2025 | Ferroviária | permaneceu | C → B | 6 | 1,47 | 1,71 | −0,24 |
| A2 | 2025 | Grêmio Prudente | promovido | – → – | 9 | 1,33 | 1,30 | +0,04 |
| A2 | 2025 | Ituano | rebaixado | B → C | 3 | 1,67 | 1,72 | −0,05 |
| A2 | 2025 | Santo André | rebaixado | D → – | 8 | 1,40 | 1,39 | +0,01 |
| A2 | 2025 | Votuporanguense | promovido | – → – | 13 | 1,13 | 1,29 | −0,16 |
| A2 | 2026 | Ferroviária | permaneceu | B → C | 2 | 1,87 | 1,71 | +0,16 |
| A2 | 2026 | Inter de Limeira | rebaixado | D → C | 12 | 1,07 | 1,56 | −0,49 |
| A2 | 2026 | Monte Azul | promovido | D → – | 14 | 0,80 | 1,29 | −0,49 |
| A2 | 2026 | Sertãozinho | promovido | – → – | 5 | 1,67 | 1,28 | +0,38 |
| A2 | 2026 | Água Santa | rebaixado | D → D | 1 | 2,07 | 1,42 | +0,64 |

## Faixas da escada no A1

O mesmo resíduo, por faixa da escada nacional, com a escada linear (razão 1,50) e com a
escolhida (razão 2,00). É o que mostra onde a escada linear erra: espera pouco do topo e
demais da Série B.

| faixa | casos | pontos/jogo | esperado, linear | resíduo, linear | esperado, brasileiro (log) | resíduo, brasileiro (log) |
|---|---|---|---|---|---|---|
| Palmeiras | 5 | 2,22 | 1,64 | +0,58 ± 0,11 | 2,10 | +0,12 ± 0,11 |
| outros três grandes | 15 | 1,68 | 1,58 | +0,10 ± 0,09 | 1,63 | +0,05 ± 0,09 |
| demais clubes da Série A | 6 | 1,58 | 1,61 | −0,03 ± 0,15 | 1,70 | −0,12 ± 0,17 |
| Série B no ano anterior | 18 | 1,24 | 1,47 | −0,22 ± 0,09 | 1,37 | −0,12 ± 0,10 |
| Série C no ano anterior | 11 | 1,22 | 1,40 | −0,17 ± 0,18 | 1,26 | −0,04 ± 0,18 |
| Série D no ano anterior | 12 | 1,14 | 1,10 | +0,05 ± 0,13 | 1,07 | +0,07 ± 0,14 |
| sem série no ano anterior | 14 | 1,07 | 1,02 | +0,05 ± 0,09 | 1,04 | +0,03 ± 0,10 |

## O simulador de 2026

O simulador do ano passado (`simulador_paulista_v9.jsx`, no Projeto) semeava o A1 com o
ranking do Chance de Gol e produzia uma amplitude de 2,27. Aqui essa semente é
avaliada com o motor de hoje nos 72 jogos do A1 de 2026, contra a semente decidida
(Brier 0,6019; piso 0,6344). A correlação de postos entre as duas é 0,82. É uma
temporada só, e a forma da nossa escada foi escolhida depois de olhar resíduos que
incluíam 2026: a comparação favorece a nossa.

| semente | razão | Brier | Δ contra a decidida |
|---|---|---|---|
| Chance de Gol | 1,50 | 0,6238 | +0,0219 [−0,0082; +0,0516] |
| Chance de Gol | 2,00 | 0,6257 | +0,0238 [+0,0021; +0,0463] ✱ |
| Chance de Gol (amplitude do v9) | 2,27 | 0,6285 | +0,0266 [+0,0044; +0,0513] ✱ |
| Chance de Gol | 3,00 | 0,6375 | +0,0355 [+0,0030; +0,0693] ✱ |
