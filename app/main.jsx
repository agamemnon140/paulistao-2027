import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import './estilo.css';
import App, { urlDoWorker } from './App.jsx';

createRoot(document.getElementById('app')).render(<App />);

// Instalável e utilizável sem rede depois da primeira visita.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
      const reg = await navigator.serviceWorker.ready;
      // O worker da simulação não aparece na lista de recursos da página: entra à mão.
      const fixos = ['./', './manifest.webmanifest', './icone.svg', './icone-192.png', './icone-512.png', urlDoWorker].map(u => new URL(u, location.href).href);
      const guardar = () => {
        const daqui = performance.getEntriesByType('resource').map(e => e.name).filter(u => u.startsWith(location.origin));
        reg.active.postMessage({ tipo: 'guardar', urls: [...new Set([location.href, ...fixos, ...daqui])] });
      };
      // A fonte só é pedida quando o texto é desenhado, às vezes depois do `load`: espera
      // por ela, e repassa a lista mais uma vez para pegar o que chegar atrasado.
      await document.fonts.ready;
      guardar();
      setTimeout(guardar, 4000);
    } catch { /* sem service worker o app funciona igual, só não abre sem rede */ }
  });
}
