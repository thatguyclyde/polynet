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
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        // Inverted from a "light logo card" look — dark circle in light
        // mode, white circle in dark mode.
        background: isDark ? '#FFFFFF' : '#1A1A22',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isDark
          ? '0 6px 20px rgba(124,58,237,0.22)'
          : '0 6px 20px rgba(124,58,237,0.30)',
        animation: 'splashPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <img
          src="/logo.png"
          alt="PolyNet"
          style={{
            width: '44px',
            height: 'auto',
            display: 'block',
          }}
        />
      </div>

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

        @keyframes splashPop {
          0%   { opacity: 0; transform: scale(0.7); }
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