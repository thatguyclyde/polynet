import React, { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider } from './ThemeContext.jsx'

const App = lazy(() => import('./App.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <Suspense fallback={<div style={{ minHeight: '100vh' }} /> }>
        <App />
      </Suspense>
    </ThemeProvider>
  </StrictMode>
)
