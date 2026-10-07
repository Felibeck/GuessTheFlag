/**
 * Punto de entrada de la app.
 * Vite carga este archivo desde index.html: monta <App /> dentro de <div id="root">
 * y carga los estilos globales (index.css). StrictMode solo afecta en desarrollo:
 * ejecuta los efectos dos veces para ayudar a detectar errores.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
