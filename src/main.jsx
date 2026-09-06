import React, { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider } from './ThemeContext.jsx'

const App = lazy(() => import('./App.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--page-bg)' }} /> }>
        <App />
      </Suspense>
    </ThemeProvider>
  </StrictMode>
)

// Registers sw.js so the app meets Chrome/Android's installability
// requirement for a real standalone launch (its own window, no address
// bar) instead of a home-screen shortcut that just reopens a browser tab.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
