/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA ServiceWorker registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.log('Falha ao registrar PWA ServiceWorker:', error);
      });
  });
} else if ('serviceWorker' in navigator) {
  // Also enable in dev/preview environment if desired for debugging
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA ServiceWorker registrado em ambiente dev:', registration.scope);
      })
      .catch((error) => {
        console.log('Erro de registro em dev:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
