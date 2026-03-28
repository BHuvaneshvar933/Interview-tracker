import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { registerSW } from 'virtual:pwa-register'

// Register service worker only in production builds.
// In `vite dev`, a SW can easily break refresh/navigation.
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
