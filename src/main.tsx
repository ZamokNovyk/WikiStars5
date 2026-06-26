import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Registra el Service Worker y fuerza la recarga automática cuando se actualice el contenido o cambie la versión
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nueva versión detectada. Recargando aplicación de forma invisible...');
    window.location.reload(); 
  },
  onOfflineReady() {
    console.log('Aplicación lista para trabajar sin conexión.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
