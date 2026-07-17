import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Newspaper, Store, UserCircle } from 'lucide-react' // Added Lucide Icons
import { supabase } from './supabase'
import SplashScreen from './SplashScreen'
import SignUp from './SignUp'
import Onboarding from './Onboarding'
import Feed from './Feed'
import News from './News'
import Polymart from './Polymart'
import Profile from './Profile'

// Replaced image paths with Lucide icon components
const TABS = [
  { id: 'feed',     icon: Home,       label: 'Feed' },
  { id: 'news',     icon: Newspaper,  label: 'News' },
  { id: 'polymart', icon: Store,      label: 'Polymart' },
  { id: 'profile',  icon: UserCircle, label: 'Profile' },
]

// Slide animation physics
const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
}

function ComingSoonDots() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#7C3AED',
            animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

function App() {
  const [splash, setSplash]       = useState(true)
  const [session, setSession]     = useState(null)
  const [onboarded, setOnboarded] = useState(false)
  const [checking, setChecking]   = useState(true)
  const [page, setPage]           = useState('feed')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [message, setMessage]     = useState('')
  const [authView, setAuthView]   = useState('login')
 
  // Touch gestures & slide direction state
  const [touchStartX, setTouchStartX] = useState(0)
  const [direction, setDirection]     = useState(0)

  useEffect(() => {
    const checkUserProfile = async (userSession) => {
      if (!userSession) {
        setChecking(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, department, year_of_study')
          .eq('id', userSession.user.id)
          .single()

        if (data && data.full_name && data.department && data.year_of_study) {
          setOnboarded(true)
        } else {
          setOnboarded(false)
        }
      } catch (err) {
        console.error("Error fetching profile:", err)
      } finally {
        setChecking(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      checkUserProfile(session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        checkUserProfile(session)
      } else {
        setOnboarded(false)
        setChecking(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Touch handlers for swipe navigation
  const onTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX)
  }

  const onTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX - touchEndX
   
    if (Math.abs(diff) > 50) {
      const currentIndex = TABS.findIndex(tab => tab.id === page)
      if (diff > 0 && currentIndex < TABS.length - 1) {
        setDirection(1)
        setPage(TABS[currentIndex + 1].id)
      }
      if (diff < 0 && currentIndex > 0) {
        setDirection(-1)
        setPage(TABS[currentIndex - 1].id)
      }
    }
  }

  // Click handler to calculate slide direction
  const handleTabClick = (targetId) => {
    const currentIndex = TABS.findIndex(t => t.id === page)
    const targetIndex = TABS.findIndex(t => t.id === targetId)
    
    if (currentIndex !== targetIndex) {
      setDirection(targetIndex > currentIndex ? 1 : -1)
      setPage(targetId)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email to confirm your account!')
    }
    setLoading(false)
  }

  if (splash) return <SplashScreen onDone={() => setSplash(false)} />
  if (checking) return <ComingSoonDots />

  if (session && !onboarded) {
    return <Onboarding session={session} onComplete={() => setOnboarded(true)} />
  }

  if (!session && authView === 'signup') {
    return <SignUp onSwitchToLogin={() => setAuthView('login')} />
  }

  if (session && onboarded) {
    return (
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          background: '#ffffff',
          minHeight: '100vh',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden', // Prevents body scrollbar during page slides
        }}
      >
        <style>{`
          @keyframes dotPulse {
            0%, 100% { opacity: 0.2; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>

        {/* Sliding Page Container */}
        <div style={{ flex: 1, position: 'relative', overflowX: 'hidden', paddingBottom: '70px' }}>
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={page}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflowY: 'auto', // Allows the page content itself to scroll
              }}
            >
              {page === 'feed' && <Feed session={session} />}
              {page === 'news' && <News session={session} />}
              {page === 'polymart' && <Polymart session={session} />}
              {page === 'profile' && <Profile session={session} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: '#ffffff',
          borderTop: '1px solid #F0EEFF',
          display: 'flex',
          padding: '10px 0 18px',
          zIndex: 100,
          boxShadow: '0 -4px 20px rgba(124,58,237,0.06)',
        }}>
          {TABS.map(tab => {
            const isActive = page === tab.id
            const IconComponent = tab.icon // The lucide icon component
            
            return (
              <motion.div
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBackground"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      width: '40px',
                      height: '4px',
                      background: '#7C3AED',
                      borderRadius: '2px',
                    }}
                  />
                )}

                {/* Lucide Icon dynamically styled */}
                <IconComponent
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  color={isActive ? '#7C3AED' : '#CBD5E1'}
                  style={{
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform 0.2s, color 0.2s'
                  }}
                />
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  color: isActive ? '#7C3AED' : '#CBD5E1',
                }}>
                  {tab.label}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  // --- Auth View Layout (Untouched) ---
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        background: '#F8F7FF',
        padding: '40px 32px',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '360px',
        border: '1.5px solid #E8E4FF',
        boxShadow: '0 8px 40px rgba(124,58,237,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            color: '#1A1A2E',
            margin: '0 0 4px',
            fontSize: '28px',
            fontWeight: 900,
            letterSpacing: '-0.5px',
          }}>PolyNet</h1>
          <p style={{
            color: '#7C3AED',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '3px',
            margin: 0,
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
          }}>Link Up</p>
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Student email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%', padding: '14px', marginBottom: '12px',
              borderRadius: '14px', border: '1.5px solid #E8E4FF',
              background: '#fff', color: '#1A1A2E', fontSize: '15px',
              boxSizing: 'border-box', outline: 'none',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%', padding: '14px', marginBottom: '20px',
              borderRadius: '14px', border: '1.5px solid #E8E4FF',
              background: '#fff', color: '#1A1A2E', fontSize: '15px',
              boxSizing: 'border-box', outline: 'none',
            }}
          />
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '15px', borderRadius: '14px',
            border: 'none', background: '#7C3AED', color: '#fff',
            fontWeight: 700, fontSize: '16px', marginBottom: '12px',
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <button type="button" onClick={() => setAuthView('signup')} disabled={loading} style={{
            width: '100%', padding: '15px', borderRadius: '14px',
            border: '1.5px solid #7C3AED', background: 'transparent',
            color: '#7C3AED', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
          }}>
            Create Account
          </button>
        </form>

        {message && (
          <p style={{ color: '#7C3AED', textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

export default App
