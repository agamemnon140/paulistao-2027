# -*- coding: utf-8 -*-
"""Classificações FINAIS das Séries A, B, C e D do Campeonato Brasileiro, 2021 a 2025.

Saída: data/nacional/classificacoes_2021_2025.json, no formato {"2021A": [{"pos": 1, "n": "..."}]}.

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
import io, json, os, re, sys, time, urllib.parse, urllib.request

API = 'https://pt.wikipedia.org/w/api.php'
UA = 'paulistao-2027/1.0 (https://github.com/agamemnon140/paulistao-2027)'
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, '..', '..', 'data', 'nacional', 'classificacoes_2021_2025.json')
ESPERADO = {'A': 20, 'B': 20, 'C': 20, 'D': 64}
ESPERADO_ANO = {('D', 2021): 68}   # fase preliminar com 8 clubes em 2021


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
    res, via, falhas = {}, {}, []
    for ano in range(2021, 2026):
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
                falhas.append(chave); continue
            print('%s: %3d clubes via %s' % (chave, len(linhas), via[chave]))
            res[chave] = [{'pos': p, 'n': n} for p, n in linhas]
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    json.dump({'_obs': 'Classificações finais do Campeonato Brasileiro. Fonte: Wikipedia em português (wikitext, CC BY-SA), lida por scripts/nacional/coletar_wikipedia.py. Nomes como estão lá.',
               'via': via, 'falhas': falhas, 'classificacoes': res},
              io.open(SAIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('gravado: %d de 20 classificações; falhas: %s' % (len(res), falhas))
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    main()
