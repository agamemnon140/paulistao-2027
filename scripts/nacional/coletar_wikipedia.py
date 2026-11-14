# -*- coding: utf-8 -*-
"""Classificações das Séries A, B, C e D do Campeonato Brasileiro.

    python scripts/nacional/coletar_wikipedia.py                 # 2021 a 2025 (finais)
    python scripts/nacional/coletar_wikipedia.py --anos 2026     # o ano corrente

Saída: data/nacional/classificacoes_<anos>.json, no formato {"2021A": [{"pos": 1, "n": "..."}]}.
De um ano em andamento sai a tabela como está no dia da leitura (campo `lidoEm`): é
provisória até a série acabar, e o arquivo tem de ser relido depois.

Para que serve: as sementes "divisão nacional" e "Brasileiro do ano anterior" do backtest
precisam saber em que série cada clube paulista jogou e em que posição terminou.

O método é o do brasileiro-2026 (scripts/rnc_data/parse_liga.py, de onde vêm as três
funções de leitura abaixo): wikitext da Wikipedia em português, lido pela API do MediaWiki
e interpretado sem modelo de linguagem. Lá ele foi validado reconstruindo o Ranking
Nacional publicado pela CBF para 235 clubes. A única checagem feita AQUI é estrutural:
posições únicas de 1 a N e o número esperado de clubes por série.

Roda no GitHub Actions (workflow "Classificações nacionais"), porque o ambiente de
desenvolvimento não alcança a Wikipedia.
"""
import argparse, datetime, io, json, os, re, sys, time, urllib.parse, urllib.request

API = 'https://pt.wikipedia.org/w/api.php'
UA = 'paulistao-2027/1.0 (https://github.com/agamemnon140/paulistao-2027)'
AQUI = os.path.dirname(os.path.abspath(__file__))
DESTINO = os.path.join(AQUI, '..', '..', 'data', 'nacional')
ESPERADO = {'A': 20, 'B': 20, 'C': 20, 'D': 64}
ESPERADO_ANO = {('D', 2021): 68,   # fase preliminar com 8 clubes em 2021
                ('D', 2026): 96}   # a Série D passou a 96 clubes em 2026


def wikitext(titulo):
    q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
                                'format': 'json', 'redirects': 1, 'titles': titulo})
    req = urllib.request.Request(API + '?' + q, headers={'User-Agent': UA})
    d = json.load(urllib.request.urlopen(req, timeout=40))
    for _, p in d['query']['pages'].items():
        if 'revisions' in p:
            return p['revisions'][0]['slots']['main']['*']
    return None


# ---- leitura do wikitext: copiado de brasileiro-2026/scripts/rnc_data/parse_liga.py ----
POS_INLINE = re.compile(r'^\|\s*(?:[a-z]+\s*=\s*(?:"[^"]*"|[^|\s]*)\s*\|)?\s*(\d{1,3})\s*\|\|\s*(?:align\s*=\s*"?left"?|style\s*=\s*"[^"]*text-align:\s*left[^"]*")\s*\|\s*(.+?)\s*(?:\|\||$)', re.I)
POS_ALONE = re.compile(r'^!?\s*\|?\s*(?:[a-z]+\s*=\s*(?:"[^"]*"|[^|\s]*)\s*)*\|\s*(\d{1,3})\s*$', re.I)
POS_BARE = re.compile(r'^\|\s*(\d{1,3})\s*$')
NAME_CELL = re.compile(r'^\|\s*(?:align\s*=\s*"?left"?|style\s*=\s*"[^"]*text-align:\s*left[^"]*")\s*\|\s*(.+?)\s*(?:\|\||$)', re.I)


def clean(raw):
    raw = raw.replace("'''", "").strip()
    m = re.search(r'\{\{\s*Futebol\s+([^|}]+)', raw)
    if m: return m.group(1).strip()
    m = re.search(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', raw)
    if m: return m.group(1).strip()
    return re.sub(r'\{\{[^}]*\}\}', '', raw).strip()


def by_sports_table(txt):
    order = re.findall(r'\|\s*team(\d{1,2})\s*=\s*([A-Za-z0-9_]+)', txt)
    names = dict(re.findall(r'\|\s*name_([A-Za-z0-9_]+)\s*=\s*(.+)', txt))
    if len(order) < 8: return None
    order = sorted(((int(i), c) for i, c in order), key=lambda x: x[0])
    return [(i, clean(names.get(c, c))) for i, c in order]


def by_rows(txt):
    out = []; pend = None
    for l in txt.split('\n'):
        s = l.rstrip()
        m = POS_INLINE.match(s)
        if m: out.append((int(m.group(1)), clean(m.group(2)))); pend = None; continue
        m = POS_ALONE.match(s) or POS_BARE.match(s)
        if m: pend = int(m.group(1)); continue
        m = NAME_CELL.match(s)
        if m and pend is not None: out.append((pend, clean(m.group(1)))); pend = None; continue
    return out or None
# ---- fim do trecho copiado ----


def secao(texto, titulo):
    linhas = texto.split('\n')
    i = next((k for k, l in enumerate(linhas) if l.strip().startswith('==') and titulo in l), -1)
    if i < 0: return None
    j = next((k for k in range(i + 1, len(linhas)) if linhas[k].strip().startswith('==') and not linhas[k].strip().startswith('===')), len(linhas))
    return '\n'.join(linhas[i:j])


def fontes(artigo, predef, serie):
    """Fontes candidatas em ordem de confiança (mesma ordem do parse_liga.py: nas Séries C e
    D a seção "Classificação geral" vem antes, porque a predefinição é a tabela da 1ª fase)."""
    sec = secao(artigo, 'lassificação geral') if artigo else None
    ordem = [predef, sec] if serie in 'AB' else [sec, predef]
    return [t for t in ordem + [artigo] if t]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--anos', default='2021-2025', help='um ano ou um intervalo, ex.: 2026 ou 2021-2025')
    arg = ap.parse_args()
    ini, fim = [int(x) for x in (arg.anos.split('-') * 2)[:2]]
    saida = os.path.join(DESTINO, 'classificacoes_%s.json' % ('%d' % ini if ini == fim else '%d_%d' % (ini, fim)))
    res, via, falhas = {}, {}, []
    for ano in range(ini, fim + 1):
        for s in 'ABCD':
            chave = '%d%s' % (ano, s)
            artigo = wikitext('Campeonato Brasileiro de Futebol de %d - Série %s' % (ano, s))
            time.sleep(0.5)
            predef = wikitext('Predefinição:Tabela do Campeonato Brasileiro da Série %s - %d' % (s, ano)) if s in 'ABC' else None
            time.sleep(0.5)
            n_esperado = ESPERADO_ANO.get((s, ano), ESPERADO[s])
            linhas = None
            for k, txt in enumerate(fontes(artigo, predef, s)):
                for fn in (by_sports_table, by_rows):
                    r = fn(txt)
                    if not r: continue
                    poss = [p for p, _ in r]
                    if len(set(poss)) == len(r) and min(poss) == 1 and max(poss) == len(r) and len(r) == n_esperado:
                        linhas = r; via[chave] = 'fonte %d, %s' % (k, fn.__name__); break
                if linhas: break
            if not linhas:
                print('::error::%s: não consegui ler %d clubes (artigo %s, predefinição %s)' % (chave, n_esperado, 'ok' if artigo else 'ausente', 'ok' if predef else 'ausente'))
                # O que cada leitor achou em cada fonte, para diagnosticar pelo log.
                for k, txt in enumerate(fontes(artigo, predef, s)):
                    for fn in (by_sports_table, by_rows):
                        r = fn(txt) or []
                        poss = [p for p, _ in r]
                        print('   fonte %d, %s: %d linhas, posições %s a %s, %d distintas' % (k, fn.__name__, len(r), min(poss) if poss else '-', max(poss) if poss else '-', len(set(poss))))
                if artigo: print('   seções: ' + ' | '.join(l.strip() for l in artigo.split('\n') if l.strip().startswith('==')))
                falhas.append(chave); continue
            print('%s: %3d clubes via %s' % (chave, len(linhas), via[chave]))
            res[chave] = [{'pos': p, 'n': n} for p, n in linhas]
    os.makedirs(DESTINO, exist_ok=True)
    json.dump({'_obs': 'Classificações do Campeonato Brasileiro. Fonte: Wikipedia em português (wikitext, CC BY-SA), lida por scripts/nacional/coletar_wikipedia.py. Nomes como estão lá. De um ano em andamento, a tabela é a do dia em lidoEm.',
               'lidoEm': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d'),
               'via': via, 'falhas': falhas, 'classificacoes': res},
              io.open(saida, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('gravado em %s: %d de %d classificações; falhas: %s' % (os.path.basename(saida), len(res), 4 * (fim - ini + 1), falhas))
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    main()
