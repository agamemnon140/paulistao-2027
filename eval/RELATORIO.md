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
  em Y−1 na escada A→D; `paulista` = colocação na 1ª fase estadual de Y−1 na escada
  A1→A3; `composta` = média das duas últimas; piso = todos iguais.
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
- São 4 sementes × 11 razões por divisão; os IC não são corrigidos para comparações múltiplas.
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
| paulista | 1,50 | 0,6139 | −0,0125 [−0,0240; −0,0024] ✱ | 4/4 | 1,50 · 2,00 · 1,50 · 1,50 | +0,0005 [−0,0312; +0,0286] | −0,0107 [−0,0211; −0,0001] ✱ | 0,6354 |
| composta | 1,75 | 0,6056 | −0,0209 [−0,0370; −0,0059] ✱ | 4/4 | 1,50 · 1,75 · 2,00 · 1,75 | −0,0106 [−0,0569; +0,0343] | −0,0194 [−0,0343; −0,0043] ✱ | 0,6196 |

Δ por ano, contra o piso, na razão escolhida:

| semente | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|
| divisão | −0,0115 | −0,0148 | −0,0147 | −0,0233 |
| brasileiro | −0,0114 | −0,0188 | −0,0210 | −0,0273 |
| paulista | −0,0079 | −0,0186 | −0,0098 | −0,0138 |
| composta | −0,0122 | −0,0222 | −0,0244 | −0,0251 |

### Brier por razão (escolha)

| razão | divisão | brasileiro | paulista | composta |
|---|---|---|---|---|
| 1,00 | 0,6265 | 0,6265 | 0,6265 | 0,6265 |
| 1,25 | 0,6137 | 0,6113 | 0,6168 | 0,6128 |
| 1,50 | 0,6105 | 0,6070 | 0,6139 | 0,6070 |
| 1,75 | 0,6122 | 0,6082 | 0,6148 | 0,6056 |
| 2,00 | 0,6164 | 0,6123 | 0,6177 | 0,6067 |
| 2,50 | 0,6279 | 0,6237 | 0,6261 | 0,6123 |
| 3,00 | 0,6399 | 0,6356 | 0,6354 | 0,6196 |
| 4,00 | 0,6610 | 0,6562 | 0,6527 | 0,6342 |
| 5,00 | 0,6772 | 0,6717 | 0,6669 | 0,6465 |
| 6,00 | 0,6883 | 0,6830 | 0,6783 | 0,6567 |
| 8,00 | 0,7035 | 0,6956 | 0,6937 | 0,6701 |

### Semente `brasileiro` em cada razão

| razão | Δ na escolha | anos que batem o piso | Δ em 2026 | Δ nos cinco anos |
|---|---|---|---|---|
| 1,25 | −0,0151 [−0,0235; −0,0074] ✱ | 4/4 | −0,0160 [−0,0375; +0,0054] | −0,0153 [−0,0225; −0,0079] ✱ |
| 1,50 | −0,0195 [−0,0343; −0,0059] ✱ | 4/4 | −0,0218 [−0,0594; +0,0163] | −0,0198 [−0,0327; −0,0068] ✱ |
| 1,75 | −0,0183 [−0,0380; +0,0000] | 4/4 | −0,0221 [−0,0725; +0,0288] | −0,0188 [−0,0360; −0,0011] ✱ |
| 2,00 | −0,0142 [−0,0378; +0,0080] | 3/4 | −0,0194 [−0,0809; +0,0419] | −0,0149 [−0,0360; +0,0066] |
| 2,50 | −0,0028 [−0,0332; +0,0253] | 2/4 | −0,0104 [−0,0872; +0,0670] | −0,0039 [−0,0309; +0,0237] |
| 3,00 | +0,0092 [−0,0255; +0,0418] | 2/4 | −0,0003 [−0,0881; +0,0878] | +0,0078 [−0,0236; +0,0398] |

### Comparações pareadas entre sementes

Diferença de Brier (primeira − segunda), cada uma na sua razão; negativo favorece a primeira.

| par | escolha | 2026 |
|---|---|---|
| divisão − brasileiro | +0,0035 [−0,0002; +0,0074] | +0,0104 [−0,0001; +0,0203] |
| divisão − paulista | −0,0035 [−0,0142; +0,0072] | −0,0119 [−0,0341; +0,0104] |
| divisão − composta | +0,0049 [−0,0017; +0,0116] | −0,0008 [−0,0171; +0,0152] |
| brasileiro − paulista | −0,0070 [−0,0180; +0,0047] | −0,0223 [−0,0485; +0,0022] |
| brasileiro − composta | +0,0014 [−0,0045; +0,0076] | −0,0112 [−0,0266; +0,0040] |
| paulista − composta | +0,0083 [+0,0001; +0,0168] ✱ | +0,0111 [−0,0117; +0,0332] |

Controle negativo (semente `brasileiro` invertida, razão 1,50, contra o piso): +0,0549 [+0,0409; +0,0703] ✱.

### Mando na 1ª fase

Semente `brasileiro`, razão 1,50. Viés = previsto − observado, em pontos percentuais; z entre parênteses.

| peso do mandante | viés mandante | viés empate | viés visitante | Brier | viés mandante 2026 | Brier 2026 |
|---|---|---|---|---|---|---|
| 0,50 | −7,1 (−3,01) | −0,9 (−0,41) | +8,1 | 0,6283 | −9,8 (−1,68) | 0,6388 |
| 0,52 | −4,9 (−2,05) | −0,9 (−0,41) | +5,9 | 0,6219 | −7,6 (−1,29) | 0,6322 |
| 0,54 | −2,7 (−1,10) | −1,0 (−0,45) | +3,7 | 0,6177 | −5,3 (−0,90) | 0,6274 |
| 0,55 | −1,5 (−0,63) | −1,1 (−0,49) | +2,6 | 0,6163 | −4,2 (−0,71) | 0,6258 |
| 0,56 | −0,4 (−0,15) | −1,2 (−0,53) | +1,6 | 0,6155 | −3,1 (−0,51) | 0,6246 |
| 0,57 | +0,8 (0,32) | −1,3 (−0,58) | +0,5 | 0,6152 | −1,9 (−0,32) | 0,6239 |
| 0,58 (padrão) | +1,9 (0,79) | −1,5 (−0,64) | −0,5 | 0,6154 | −0,8 (−0,13) | 0,6237 |
| 0,60 | +4,3 (1,74) | −1,8 (−0,79) | −2,5 | 0,6174 | +1,5 (0,25) | 0,6247 |
| 0,62 | +6,7 (2,71) | −2,2 (−0,98) | −4,5 | 0,6216 | +3,9 (0,64) | 0,6277 |

### Mando no mata-mata (50 jogos, 2022–2026; só informa)

| variante | gols/jogo | peso do mandante | viés mandante | viés empate | Brier |
|---|---|---|---|---|---|
| padrão | 2,31 | 0,65 | −5,8 (−0,85) | +0,9 (0,15) | 0,5290 |
| peso de casa da liga | 2,31 | 0,58 | −13,6 (−1,97) | +2,9 (0,46) | 0,5520 |
| peso de casa 0,55 | 2,31 | 0,55 | −17,0 (−2,46) | +3,6 (0,56) | 0,5683 |
| gols medidos, peso 0,55 (dentro da amostra) | 2,18 | 0,55 | −17,8 (−2,58) | +4,6 (0,72) | 0,5708 |

### Sensibilidade e cobertura

Brier na escolha por preset de atualização (semente `brasileiro`): conservador 0,6070, base 0,6091, agressivo 0,6273.

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
| paulista | 1,00 | 0,6613 | 0,0000 [0,0000; 0,0000] | 0/4 | 1,00 · 1,25 · 1,25 · 1,00 | 0,0000 [0,0000; 0,0000] | 0,0000 [0,0000; 0,0000] | 0,7161 |
| composta | 1,25 | 0,6571 | −0,0042 [−0,0090; +0,0007] | 3/4 | 1,50 · 1,75 · 1,25 · 1,00 | −0,0073 [−0,0183; +0,0036] | −0,0049 [−0,0091; −0,0003] ✱ | 0,6837 |

Δ por ano, contra o piso, na razão escolhida:

| semente | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|
| divisão | −0,0044 | −0,0246 | +0,0001 | +0,0038 |
| brasileiro | −0,0149 | −0,0236 | +0,0018 | +0,0067 |
| paulista | 0,0000 | 0,0000 | 0,0000 | 0,0000 |
| composta | −0,0061 | −0,0103 | −0,0040 | +0,0036 |

### Brier por razão (escolha)

| razão | divisão | brasileiro | paulista | composta |
|---|---|---|---|---|
| 1,00 | 0,6613 | 0,6613 | 0,6613 | 0,6613 |
| 1,25 | 0,6552 | 0,6544 | 0,6614 | 0,6571 |
| 1,50 | 0,6550 | 0,6538 | 0,6666 | 0,6575 |
| 1,75 | 0,6577 | 0,6563 | 0,6741 | 0,6603 |
| 2,00 | 0,6618 | 0,6604 | 0,6826 | 0,6643 |
| 2,50 | 0,6711 | 0,6699 | 0,7000 | 0,6739 |
| 3,00 | 0,6796 | 0,6786 | 0,7161 | 0,6837 |
| 4,00 | 0,6916 | 0,6909 | 0,7432 | 0,7013 |
| 5,00 | 0,6965 | 0,6950 | 0,7640 | 0,7155 |
| 6,00 | 0,7001 | 0,6967 | 0,7802 | 0,7270 |
| 8,00 | 0,7058 | 0,6996 | 0,8028 | 0,7414 |

### Semente `brasileiro` em cada razão

| razão | Δ na escolha | anos que batem o piso | Δ em 2026 | Δ nos cinco anos |
|---|---|---|---|---|
| 1,25 | −0,0069 [−0,0120; −0,0016] ✱ | 3/4 | −0,0074 [−0,0193; +0,0045] | −0,0070 [−0,0121; −0,0020] ✱ |
| 1,50 | −0,0075 [−0,0168; +0,0020] | 2/4 | −0,0075 [−0,0285; +0,0133] | −0,0075 [−0,0165; +0,0015] |
| 1,75 | −0,0050 [−0,0174; +0,0079] | 2/4 | −0,0039 [−0,0320; +0,0249] | −0,0047 [−0,0170; +0,0074] |
| 2,00 | −0,0009 [−0,0161; +0,0150] | 2/4 | +0,0017 [−0,0325; +0,0366] | −0,0003 [−0,0155; +0,0143] |
| 2,50 | +0,0086 [−0,0113; +0,0294] | 2/4 | +0,0150 [−0,0291; +0,0603] | +0,0100 [−0,0093; +0,0287] |
| 3,00 | +0,0173 [−0,0059; +0,0414] | 2/4 | +0,0281 [−0,0243; +0,0812] | +0,0197 [−0,0029; +0,0415] |

### Comparações pareadas entre sementes

Diferença de Brier (primeira − segunda), cada uma na sua razão; negativo favorece a primeira.

| par | escolha | 2026 |
|---|---|---|
| divisão − brasileiro | +0,0012 [−0,0027; +0,0053] | +0,0031 [−0,0063; +0,0128] |
| divisão − paulista | −0,0063 [−0,0154; +0,0033] | −0,0044 [−0,0275; +0,0204] |
| divisão − composta | −0,0021 [−0,0090; +0,0049] | +0,0029 [−0,0117; +0,0177] |
| brasileiro − paulista | −0,0075 [−0,0168; +0,0020] | −0,0075 [−0,0285; +0,0133] |
| brasileiro − composta | −0,0033 [−0,0098; +0,0031] | −0,0002 [−0,0120; +0,0120] |
| paulista − composta | +0,0042 [−0,0007; +0,0090] | +0,0073 [−0,0036; +0,0183] |

Controle negativo (semente `brasileiro` invertida, razão 1,50, contra o piso): +0,0291 [+0,0193; +0,0393] ✱.

### Mando na 1ª fase

Semente `brasileiro`, razão 1,50. Viés = previsto − observado, em pontos percentuais; z entre parênteses.

| peso do mandante | viés mandante | viés empate | viés visitante | Brier | viés mandante 2026 | Brier 2026 |
|---|---|---|---|---|---|---|
| 0,50 | −4,2 (−1,99) | −4,5 (−2,19) | +8,7 | 0,6555 | +1,4 (0,32) | 0,6519 |
| 0,52 | −2,0 (−0,93) | −4,5 (−2,21) | +6,5 | 0,6506 | +3,6 (0,83) | 0,6525 |
| 0,54 | +0,3 (0,12) | −4,6 (−2,27) | +4,4 | 0,6478 | +5,8 (1,34) | 0,6550 |
| 0,55 | +1,4 (0,65) | −4,7 (−2,32) | +3,3 | 0,6472 | +7,0 (1,59) | 0,6571 |
| 0,56 | +2,6 (1,18) | −4,9 (−2,38) | +2,3 | 0,6471 | +8,1 (1,85) | 0,6597 |
| 0,57 | +3,8 (1,70) | −5,0 (−2,45) | +1,2 | 0,6476 | +9,3 (2,11) | 0,6628 |
| 0,58 (padrão) | +5,0 (2,23) | −5,2 (−2,53) | +0,2 | 0,6487 | +10,5 (2,37) | 0,6664 |
| 0,60 | +7,3 (3,30) | −5,5 (−2,73) | −1,8 | 0,6524 | +12,8 (2,89) | 0,6752 |
| 0,62 | +9,8 (4,39) | −6,0 (−2,98) | −3,8 | 0,6583 | +15,2 (3,43) | 0,6860 |

### Mando no mata-mata (62 jogos, 2022–2026; só informa)

| variante | gols/jogo | peso do mandante | viés mandante | viés empate | Brier |
|---|---|---|---|---|---|
| padrão | 2,31 | 0,65 | +19,8 (3,20) | −14,4 (−2,56) | 0,7083 |
| peso de casa da liga | 2,31 | 0,58 | +11,7 (1,90) | −13,0 (−2,26) | 0,6753 |
| peso de casa 0,55 | 2,31 | 0,55 | +8,3 (1,37) | −12,6 (−2,19) | 0,6695 |
| gols medidos, peso 0,55 (dentro da amostra) | 1,84 | 0,55 | +5,8 (0,96) | −8,5 (−1,43) | 0,6592 |

### Sensibilidade e cobertura

Brier na escolha por preset de atualização (semente `brasileiro`): conservador 0,6538, base 0,6620, agressivo 0,6858.

Clubes sem série nacional no ano anterior: 2022: 13, 2023: 13, 2024: 14, 2025: 12, 2026: 11 (de 16). Clubes fora da escada estadual: nenhum.

## Promoção e rebaixamento

Quem mudou de divisão rende diferente do que a semente espera? Semente `brasileiro` com
a amplitude e o mando propostos (A1: 1,50 e 0,58; A2: 1,25 e 0,55), forças fixas na semente, 1ª fase,
2022–2026. Resíduo = pontos por jogo reais − esperados; positivo quer dizer que o
grupo rende mais do que a semente previa. Movimento estadual: de onde o clube veio.
Movimento nacional: série do ano anterior contra a série do ano. Descritivo, com poucos
casos por grupo: |t| abaixo de 2 não distingue o resíduo de zero.

### A1

| grupo | casos | pontos/jogo | esperado pela semente | resíduo ± erro-padrão | t | abaixo do esperado | entre os 8 | entre os 2 últimos |
|---|---|---|---|---|---|---|---|---|
| promovido no estadual | 10 | 1,15 | 1,11 | +0,04 ± 0,09 | +0,47 | 5/10 | 4/10 | 1/10 |
| permaneceu na divisão estadual | 70 | 1,39 | 1,40 | −0,01 ± 0,06 | −0,22 | 34/70 | 36/70 | 9/70 |
| subiu de série nacional | 9 | 1,15 | 1,44 | −0,29 ± 0,22 | −1,33 | 7/9 | 4/9 | 2/9 |
| caiu de série nacional | 3 | 1,67 | 1,41 | +0,26 ± 0,28 | +0,92 | 1/3 | 2/3 | 0/3 |
| manteve a série nacional | 54 | 1,45 | 1,44 | +0,01 ± 0,06 | +0,23 | 23/54 | 31/54 | 6/54 |
| entrou na Série D | 5 | 1,06 | 1,02 | +0,04 ± 0,14 | +0,30 | 2/5 | 1/5 | 1/5 |
| sem série nos dois anos | 9 | 1,08 | 1,02 | +0,05 ± 0,13 | +0,42 | 6/9 | 2/9 | 1/9 |

### A2

| grupo | casos | pontos/jogo | esperado pela semente | resíduo ± erro-padrão | t | abaixo do esperado | entre os 8 | entre os 2 últimos |
|---|---|---|---|---|---|---|---|---|
| promovido no estadual | 10 | 1,37 | 1,30 | +0,07 ± 0,10 | +0,68 | 4/10 | 6/10 | 0/10 |
| rebaixado no estadual | 10 | 1,70 | 1,54 | +0,16 ± 0,13 | +1,22 | 5/10 | 8/10 | 0/10 |
| permaneceu na divisão estadual | 60 | 1,27 | 1,34 | −0,07 ± 0,05 | −1,48 | 31/60 | 26/60 | 10/60 |
| subiu de série nacional | 3 | 1,42 | 1,69 | −0,26 ± 0,15 | −1,77 | 3/3 | 2/3 | 0/3 |
| caiu de série nacional | 3 | 1,84 | 1,72 | +0,13 ± 0,09 | +1,38 | 1/3 | 3/3 | 0/3 |
| manteve a série nacional | 4 | 2,07 | 1,63 | +0,44 ± 0,12 | +3,70 | 0/4 | 4/4 | 0/4 |
| entrou na Série D | 3 | 1,62 | 1,31 | +0,31 ± 0,07 | +4,30 | 0/3 | 3/3 | 0/3 |
| saiu da Série D | 7 | 1,46 | 1,38 | +0,08 ± 0,12 | +0,69 | 2/7 | 6/7 | 0/7 |
| sem série nos dois anos | 60 | 1,23 | 1,31 | −0,08 ± 0,05 | −1,65 | 34/60 | 22/60 | 10/60 |

### Conjuntos

| grupo | casos | pontos/jogo | esperado pela semente | resíduo ± erro-padrão | t | abaixo do esperado | entre os 8 | entre os 2 últimos |
|---|---|---|---|---|---|---|---|---|
| subiu de série nacional (A1 e A2) | 12 | 1,22 | 1,50 | −0,28 ± 0,16 | −1,73 | 10/12 | 6/12 | 2/12 |
| caiu de série nacional (A1 e A2) | 6 | 1,76 | 1,56 | +0,19 ± 0,13 | +1,44 | 2/6 | 5/6 | 0/6 |
| A2: joga série nacional no ano | 13 | 1,76 | 1,59 | +0,17 ± 0,09 | +1,92 | 4/13 | 12/13 | 0/13 |
| A2: sem série no ano, tinha no anterior | 7 | 1,46 | 1,38 | +0,08 ± 0,12 | +0,69 | 2/7 | 6/7 | 0/7 |
| A2: sem série nos dois anos | 60 | 1,23 | 1,31 | −0,08 ± 0,05 | −1,65 | 34/60 | 22/60 | 10/60 |

### Os casos

| divisão | ano | clube | estadual | série nacional | posição na 1ª fase | pontos/jogo | esperado | resíduo |
|---|---|---|---|---|---|---|---|---|
| A1 | 2022 | Ituano | permaneceu | C → B | 5 | 1,58 | 1,44 | +0,14 |
| A1 | 2022 | Novorizontino | permaneceu | C → B | 16 | 0,25 | 1,38 | −1,13 |
| A1 | 2022 | São Bernardo | promovido | – → D | 8 | 1,33 | 0,98 | +0,35 |
| A1 | 2022 | Água Santa | promovido | – → – | 14 | 0,92 | 0,99 | −0,07 |
| A1 | 2023 | Botafogo-SP | permaneceu | C → B | 9 | 1,17 | 1,49 | −0,32 |
| A1 | 2023 | Mirassol | permaneceu | C → B | 7 | 1,25 | 1,49 | −0,24 |
| A1 | 2023 | Portuguesa-SP | promovido | – → – | 14 | 0,83 | 1,02 | −0,18 |
| A1 | 2023 | São Bento | promovido | – → – | 15 | 0,83 | 1,03 | −0,19 |
| A1 | 2023 | São Bernardo | permaneceu | D → C | 2 | 2,17 | 1,31 | +0,85 |
| A1 | 2024 | Novorizontino | promovido | B → B | 4 | 1,83 | 1,51 | +0,32 |
| A1 | 2024 | Ponte Preta | promovido | B → B | 8 | 1,42 | 1,41 | +0,01 |
| A1 | 2024 | Santos | permaneceu | A → B | 2 | 2,08 | 1,46 | +0,62 |
| A1 | 2025 | Guarani | permaneceu | B → C | 10 | 1,08 | 1,37 | −0,29 |
| A1 | 2025 | Mirassol | permaneceu | B → A | 9 | 1,33 | 1,55 | −0,22 |
| A1 | 2025 | Noroeste | promovido | – → – | 14 | 0,67 | 1,00 | −0,33 |
| A1 | 2025 | Ponte Preta | permaneceu | B → C | 4 | 1,83 | 1,39 | +0,44 |
| A1 | 2025 | Santos | permaneceu | B → A | 6 | 1,50 | 1,54 | −0,04 |
| A1 | 2025 | Velo Clube | promovido | – → – | 11 | 1,08 | 1,03 | +0,06 |
| A1 | 2026 | Capivariano | promovido | – → – | 7 | 1,63 | 1,09 | +0,53 |
| A1 | 2026 | Ponte Preta | permaneceu | C → B | 16 | 0,13 | 1,50 | −1,37 |
| A1 | 2026 | Primavera-SP | promovido | – → – | 12 | 1,00 | 1,08 | −0,08 |
| A1 | 2026 | São Bernardo | permaneceu | C → B | 13 | 1,00 | 1,29 | −0,29 |
| A2 | 2022 | Linense | promovido | – → – | 7 | 1,47 | 1,31 | +0,16 |
| A2 | 2022 | Osasco Sporting | permaneceu | C → D | 2 | 2,00 | 1,73 | +0,27 |
| A2 | 2022 | Primavera-SP | promovido | – → – | 8 | 1,47 | 1,31 | +0,16 |
| A2 | 2022 | São Bento | rebaixado | D → – | 6 | 1,47 | 1,34 | +0,12 |
| A2 | 2022 | São Caetano | rebaixado | – → – | 11 | 1,13 | 1,33 | −0,20 |
| A2 | 2023 | Comercial-SP | promovido | – → – | 8 | 1,27 | 1,30 | −0,03 |
| A2 | 2023 | Noroeste | promovido | – → – | 3 | 1,73 | 1,30 | +0,43 |
| A2 | 2023 | Novorizontino | rebaixado | B → B | 2 | 1,93 | 1,70 | +0,24 |
| A2 | 2023 | Ponte Preta | rebaixado | B → B | 1 | 2,40 | 1,72 | +0,68 |
| A2 | 2024 | Capivariano | promovido | – → – | 14 | 1,07 | 1,32 | −0,26 |
| A2 | 2024 | Ferroviária | rebaixado | D → C | 3 | 1,73 | 1,75 | −0,02 |
| A2 | 2024 | São Bento | rebaixado | – → – | 1 | 2,13 | 1,35 | +0,79 |
| A2 | 2024 | São José-SP | promovido | – → D | 2 | 1,73 | 1,32 | +0,41 |
| A2 | 2025 | Ferroviária | permaneceu | C → B | 6 | 1,47 | 1,71 | −0,24 |
| A2 | 2025 | Grêmio Prudente | promovido | – → – | 9 | 1,33 | 1,29 | +0,04 |
| A2 | 2025 | Ituano | rebaixado | B → C | 3 | 1,67 | 1,72 | −0,05 |
| A2 | 2025 | Santo André | rebaixado | D → – | 8 | 1,40 | 1,43 | −0,03 |
| A2 | 2025 | Votuporanguense | promovido | – → – | 13 | 1,13 | 1,29 | −0,16 |
| A2 | 2026 | Ferroviária | permaneceu | B → C | 2 | 1,87 | 1,70 | +0,17 |
| A2 | 2026 | Inter de Limeira | rebaixado | D → C | 12 | 1,07 | 1,60 | −0,53 |
| A2 | 2026 | Monte Azul | promovido | D → – | 14 | 0,80 | 1,28 | −0,48 |
| A2 | 2026 | Sertãozinho | promovido | – → – | 5 | 1,67 | 1,28 | +0,39 |
| A2 | 2026 | Água Santa | rebaixado | D → D | 1 | 2,07 | 1,46 | +0,61 |
