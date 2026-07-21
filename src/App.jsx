import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Newspaper, Store, UserCircle, X } from 'lucide-react'
import { supabase } from './supabase'
import SplashScreen from './SplashScreen'
import SignUp from './SignUp'
import Onboarding from './Onboarding'
import Feed from './Feed'
import News from './News'
import Polymart from './Polymart'
import Profile from './Profile'

// Only 3 tabs now — Profile moved to the global top-right icon.
// Chats will become the 4th tab once Chats.jsx is built.
const TABS = [
  { id: 'feed', icon: Home, label: 'Home' },
  { id: 'news', icon: Newspaper, label: 'News' },
  { id: 'polymart', icon: Store, label: 'Polymart' },
]

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
      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

function App() {
  const [splash, setSplash] = useState(true)
  const [session, setSession] = useState(null)
  const [onboarded, setOnboarded] = useState(false)
  const [checking, setChecking] = useState(true)
  const [page, setPage] = useState('feed')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [authView, setAuthView] = useState('login')
  const [showProfile, setShowProfile] = useState(false)
  const [myAvatar, setMyAvatar] = useState(null)

  useEffect(() => {
    const checkUserProfile = async (userSession) => {
      if (!userSession) {
        setChecking(false)
        return
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, department, year_of_study, avatar_url')
          .eq('id', userSession.user.id)
          .maybeSingle()

        if (data && data.full_name && data.department && data.year_of_study) {
          setOnboarded(true)
        } else {
          setOnboarded(false)
        }
        if (data?.avatar_url) setMyAvatar(data.avatar_url)
      } catch (err) {
        console.error('Error fetching profile:', err)
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

  function handleTabClick(targetId) {
    if (navigator.vibrate) navigator.vibrate(8)
    setPage(targetId)
  }

  // ── Sticky, finger-following drag using Framer Motion's native drag ──
  function handleDragEnd(event, info) {
    const threshold = 90 // px of real drag distance required to commit
    const currentIndex = TABS.findIndex(t => t.id === page)

    if (info.offset.x < -threshold && currentIndex < TABS.length - 1) {
      setPage(TABS[currentIndex + 1].id)
    } else if (info.offset.x > threshold && currentIndex > 0) {
      setPage(TABS[currentIndex - 1].id)
    }
    // If the drag didn't cross the threshold, Framer Motion automatically
    // springs the page back to x:0 — that's the "sticky, stops with your finger" feel.
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
      <div style={{
        background: '#ffffff',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <style>{`
          @keyframes dotPulse {
            0%, 100% { opacity: 0.2; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>

        {/* Global top-right profile icon — works from every page, like Google */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 150,
          display: 'flex', justifyContent: 'flex-end', padding: '14px 16px',
          pointerEvents: 'none',
        }}>
          <motion.div
            whileTap={{ scale: 0.85 }}
            onClick={() => setShowProfile(true)}
            style={{
              width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden',
              background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', pointerEvents: 'auto',
              border: '2px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            }}
          >
            {myAvatar ? (
              <img src={myAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UserCircle size={22} color="#7C3AED" />
            )}
          </motion.div>
        </div>

        {/* Sticky drag-following page container */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', paddingBottom: '70px' }}>
          <motion.div
            key={page}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.65}
            onDragEnd={handleDragEnd}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            style={{
              width: '100%', height: '100%', overflowY: 'auto', touchAction: 'pan-y',
            }}
          >
            {page === 'feed' && <Feed session={session} />}
            {page === 'news' && <News session={session} />}
            {page === 'polymart' && <Polymart session={session} />}
          </motion.div>
        </div>

        {/* Bottom Navigation — 3 tabs, Chats added later as 4th */}
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
            const IconComponent = tab.icon
            return (
              <motion.div
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                whileTap={{ scale: 0.85 }}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '3px', cursor: 'pointer', position: 'relative',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBackground"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    style={{
                      position: 'absolute', top: '-4px', width: '40px', height: '4px',
                      background: '#7C3AED', borderRadius: '2px',
                    }}
                  />
                )}
                <IconComponent
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  color={isActive ? '#7C3AED' : '#CBD5E1'}
                  style={{ transform: isActive ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.2s, color 0.2s' }}
                />
                <span style={{
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px',
                  color: isActive ? '#7C3AED' : '#CBD5E1',
                }}>
                  {tab.label}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Profile slide-over — global, opens from top-right icon */}
        <AnimatePresence>
          {showProfile && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowProfile(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
              />
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                style={{
                  position: 'fixed', top: 0, bottom: 0, right: 0, width: '100%',
                  background: '#ffffff', zIndex: 201, overflowY: 'auto',
                }}
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setShowProfile(false)}
                  style={{
                    position: 'absolute', top: '16px', left: '16px', zIndex: 5,
                    width: '36px', height: '36px', borderRadius: '12px',
                    background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} color="#7C3AED" />
                </motion.div>
                <Profile session={session} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // --- Auth View Layout ---
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
            color: '#1A1A2E', margin: '0 0 4px', fontSize: '28px',
            fontWeight: 900, letterSpacing: '-0.5px',
          }}>PolyNet</h1>
          <p style={{
            color: '#7C3AED', fontSize: '11px', fontWeight: 700,
            letterSpacing: '3px', margin: 0, fontStyle: 'italic', fontFamily: 'Georgia, serif',
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
          <motion.button whileTap={{ scale: 0.96 }} type="submit" disabled={loading} style={{
            width: '100%', padding: '15px', borderRadius: '14px',
            border: 'none', background: '#7C3AED', color: '#fff',
            fontWeight: 700, fontSize: '16px', marginBottom: '12px',
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => setAuthView('signup')} disabled={loading} style={{
            width: '100%', padding: '15px', borderRadius: '14px',
            border: '1.5px solid #7C3AED', background: 'transparent',
            color: '#7C3AED', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
          }}>
            Create Account
          </motion.button>
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