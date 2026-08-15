import { useEffect } from 'react'
import { useTheme } from './ThemeContext'

const DISPLAY_DURATION = 2100 // ms — 0.4s shorter than before

function SplashScreen({ onDone }) {
  const { isDark } = useTheme()

  useEffect(() => {
    const timer = setTimeout(() => onDone(), DISPLAY_DURATION)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--page-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Logo manifests once, then stays still — no ongoing glow/motion
          after the initial entrance. */}
      <img
        src="/logo.png"
        alt="PolyNet"
        style={{
          width: '64px',
          height: 'auto',
          display: 'block',
          animation: 'logoManifest 0.85s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      />

      <div style={{
        position: 'absolute',
        bottom: '52px',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontWeight: 800,
        fontStyle: 'italic',
        fontSize: '15px',
        letterSpacing: '1.5px',
        color: isDark ? 'rgba(255,255,255,0.55)' : '#1A1A2E',
        animation: 'splashFadeIn 0.7s ease 0.3s both',
      }}>
        By students, For students
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,700&display=swap');

        @keyframes logoManifest {
          0%   { opacity: 0; transform: scale(0.55); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashFadeIn {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default SplashScreen