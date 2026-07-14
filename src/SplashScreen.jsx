import { useEffect } from 'react'

function SplashScreen({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone(), 1800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--page-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <img
        src="/logo-animation.gif"
        alt="PolyNet"
        style={{
          width: '320px',
          height: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  )
}

export default SplashScreen