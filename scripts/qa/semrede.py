"""Confere, num Chrome sem interface, que o app publicado abre SEM REDE depois de uma visita.

    python3 scripts/qa/semrede.py [endereço]      # padrão: http://localhost:4173/ (npm run build && npm run preview)

Precisa de Playwright para Python e de um Chrome em /usr/bin/google-chrome. Não faz parte de
`npm test`: o CI não tem navegador. Visita uma vez, corta a rede, recarrega e exige a tabela
da projeção, a Série A2 simulada e a aba Evolução, tudo servido pelo service worker.
"""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page(); erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)))
    pg.goto(URL); pg.wait_for_selector('table.projecao', timeout=90000)
    pg.wait_for_function("navigator.serviceWorker.controller !== null || navigator.serviceWorker.ready.then(() => true)", timeout=30000)
    pg.wait_for_timeout(2500)
    info = pg.evaluate("""async () => { const ks = await caches.keys(); const c = await caches.open(ks[0]); const urls = (await c.keys()).map(r => new URL(r.url).pathname.split('/').pop() || '(raiz)');
      const man = await (await fetch(document.querySelector('link[rel=manifest]').href)).json();
      return { caches: ks, guardados: urls.sort(), manifesto: [man.short_name, man.display, man.icons.length], sw: (await navigator.serviceWorker.getRegistration()).active.state }; }""")
    print('primeira visita:', info)
    ctx.set_offline(True)
    pg.reload(); pg.wait_for_selector('table.projecao', timeout=90000)
    print('SEM REDE, depois de UMA visita: título =', pg.title(), '| linhas da tabela =', pg.locator('table.projecao tbody tr').count(), '| fonte carregada =', pg.evaluate("document.fonts.ready.then(() => new Promise(r => setTimeout(() => r(document.fonts.check('16px \"Archivo Variable\"')), 800)))"))
    pg.get_by_role('button', name='Série A2', exact=True).click(); pg.wait_for_selector('table.projecao', timeout=90000)
    print('SEM REDE, Série A2: primeira linha =', pg.locator('table.projecao tbody tr').first.inner_text().replace('\n', ' ').replace('\t', ' ')[:60])
    pg.get_by_role('button', name='Evolução', exact=True).click(); print('SEM REDE, Evolução:', pg.locator('.leitura').inner_text()[:70])
    print('erros de página:', erros or 'nenhum'); b.close()
