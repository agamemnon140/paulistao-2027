import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import './estilo.css';
import App from './App.jsx';

createRoot(document.getElementById('app')).render(<App />);

// Instalável e utilizável sem rede depois da primeira visita.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
