import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from './Icon'

const BRAND_PURPLE = '#7C3AED'
const VERIFIED_BLUE = '#1D9BF0'
const HEART_RED = '#ED4956'

const STEPS = [
  {
    key: 'news',
    eyebrow: 'Official News',
    title: 'Straight From The Source',
    desc: 'Campus updates posted directly by school admins. No more false circulation — if it\'s on PolyNet News, it\'s real.',
  },
  {
    key: 'polymart',
    eyebrow: 'PolyMart',
    title: 'A Marketplace Built For Campus',
    desc: 'Buy and sell anything with fellow students — textbooks, electronics, services — right from your phone.',
  },
  {
    key: 'skills',
    eyebrow: 'Skill Search',
    title: 'Find Skills, Not Just Posts',
    desc: 'Search for students by what they can do — tutoring, repairs, design — and connect with the right person instantly.',
  },
  {
    key: 'feed',
    eyebrow: 'Your Feed',
    title: 'Every Corner Of Campus Life',
    desc: 'Share updates, shoutouts and moments with everyone at Harare Poly, all in one scroll.',
  },
  {
    key: 'chats',
    eyebrow: 'In-App Chat',
    title: 'The Network Behind It All',
    desc: 'Message sellers, tutors and classmates directly — the thread that ties PolyMart and every connection together.',
  },
]

// Each step gets its own hand-built visual composition — layered icon
// badges rather than a single boxed icon — so every page reads as its own
// small scene instead of a repeated template.
function StepVisual({ stepKey }) {
  const ringStyle = {
    width: '148px', height: '148px', borderRadius: '50%',
    background: 'var(--app-accent-soft)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  }

  const badgeBase = {
    position: 'absolute', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '4px solid var(--page-bg)', boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
  }

  if (stepKey === 'news') {
    return (
      <div style={ringStyle}>
        <Icon name="megaphone" size={54} color={BRAND_PURPLE} />
        {/* Verified badge, overlapping bottom-right — "official" cue */}
        <div style={{ ...badgeBase, width: '46px', height: '46px', right: '-4px', bottom: '2px', background: VERIFIED_BLUE }}>
          <Icon name="check" size={20} color="#fff" strokeWidth={3.5} />
        </div>
        {/* Small announcement bursts, top corners */}
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '6px', left: '-6px', width: '14px', height: '3px', borderRadius: '2px', background: BRAND_PURPLE, transform: 'rotate(-35deg)' }}
        />
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          style={{ position: 'absolute', top: '2px', right: '4px', width: '10px', height: '3px', borderRadius: '2px', background: BRAND_PURPLE, transform: 'rotate(35deg)' }}
        />
      </div>
    )
  }

  if (stepKey === 'polymart') {
    return (
      <div style={ringStyle}>
        <Icon name="store" size={54} color={BRAND_PURPLE} />
        {/* Exchange badge — the transaction cue */}
        <div style={{ ...badgeBase, width: '46px', height: '46px', right: '-6px', bottom: '4px', background: BRAND_PURPLE }}>
          <Icon name="exchange" size={20} color="#fff" strokeWidth={2.5} />
        </div>
        {/* Floating price tag, top-left */}
        <div style={{
          ...badgeBase, width: '38px', height: '38px', left: '-8px', top: '4px',
          background: 'var(--card-bg)', border: `2px solid ${BRAND_PURPLE}`, boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
        }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: BRAND_PURPLE }}>$</span>
        </div>
      </div>
    )
  }

  if (stepKey === 'skills') {
    return (
      <div style={ringStyle}>
        <Icon name="handshake" size={52} color={BRAND_PURPLE} />
        {/* Two small "people" nodes connected by a dashed line — the
            searchable-network idea */}
        <div style={{
          position: 'absolute', top: '10px', left: '-10px',
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'var(--card-bg)', border: '3px solid var(--page-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
        }}>
          <Icon name="user" size={14} color={BRAND_PURPLE} />
        </div>
        <div style={{
          position: 'absolute', bottom: '6px', right: '-10px',
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'var(--card-bg)', border: '3px solid var(--page-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
        }}>
          <Icon name="search" size={13} color={BRAND_PURPLE} />
        </div>
      </div>
    )
  }

  if (stepKey === 'feed') {
    return (
      <div style={ringStyle}>
        <Icon name="home" size={54} color={BRAND_PURPLE} />
        {/* Heart badge */}
        <div style={{ ...badgeBase, width: '38px', height: '38px', left: '-6px', bottom: '2px', background: HEART_RED }}>
          <Icon name="heart" size={16} color="#fff" fill="#fff" />
        </div>
        {/* Comment badge */}
        <div style={{ ...badgeBase, width: '38px', height: '38px', right: '-6px', top: '2px', background: BRAND_PURPLE }}>
          <Icon name="comment" size={16} color="#fff" fill="none" />
        </div>
      </div>
    )
  }

  // chats
  return (
    <div style={ringStyle}>
      <Icon name="message-circle" size={54} color={BRAND_PURPLE} fill="none" />
      {/* Small connected nodes below, forming a tiny network — visualizing
          "the network behind it all" */}
      <svg width="70" height="34" viewBox="0 0 70 34" style={{ position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)' }}>
        <line x1="10" y1="8" x2="35" y2="24" stroke={BRAND_PURPLE} strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
        <line x1="60" y1="8" x2="35" y2="24" stroke={BRAND_PURPLE} strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
        <circle cx="10" cy="8" r="6" fill="var(--card-bg)" stroke={BRAND_PURPLE} strokeWidth="2" />
        <circle cx="60" cy="8" r="6" fill="var(--card-bg)" stroke={BRAND_PURPLE} strokeWidth="2" />
        <circle cx="35" cy="24" r="7" fill={BRAND_PURPLE} />
      </svg>
    </div>
  )
}

function Walkthrough({ onFinish }) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  function next() {
    if (isLast) {
      onFinish()
      return
    }
    setDirection(1)
    setStep(s => s + 1)
  }

  function goBack() {
    if (step === 0) return
    setDirection(-1)
    setStep(s => s - 1)
  }

  const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 36 : -36 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -36 : 36 }),
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Skip — top-left */}
      <span
        onClick={onFinish}
        style={{
          position: 'fixed', top: '20px', left: '20px', zIndex: 20,
          color: 'var(--text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
        }}
      >
        Skip
      </span>

      {/* Next — top-right, as requested. Becomes "Let's go" with a check on the final step. */}
      <motion.div
        whileTap={{ scale: 0.94 }}
        onClick={next}
        style={{
          position: 'fixed', top: '16px', right: '20px', zIndex: 20,
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '9px 16px', borderRadius: '999px',
          background: BRAND_PURPLE, color: '#fff', fontWeight: 700, fontSize: '13.5px',
          cursor: 'pointer', boxShadow: '0 6px 18px rgba(124,58,237,0.35)',
        }}
      >
        {isLast ? "Let's go" : 'Next'}
        <Icon name={isLast ? 'check' : 'chevronRight'} size={15} color="#fff" strokeWidth={2.5} />
      </motion.div>

      <div style={{ padding: '64px 24px 0' }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => { setDirection(i > step ? 1 : -1); setStep(i) }}
              style={{
                flex: 1, height: '5px', borderRadius: '3px', cursor: 'pointer',
                background: i <= step ? BRAND_PURPLE : 'var(--app-border-soft)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 24px' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}
          >
            <div style={{ marginBottom: '32px' }}>
              <StepVisual stepKey={current.key} />
            </div>

            <div style={{
              display: 'inline-block', marginBottom: '12px', padding: '5px 13px',
              borderRadius: '999px', background: 'var(--app-accent-soft)',
              color: BRAND_PURPLE, fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
              {current.eyebrow}
            </div>

            <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 800, color: 'var(--text-strong)', maxWidth: '300px', lineHeight: 1.25 }}>
              {current.title}
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '300px' }}>
              {current.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Subtle back control, bottom-left — secondary, doesn't compete with Next */}
      <div style={{ padding: '0 24px 32px', display: 'flex', justifyContent: 'flex-start' }}>
        {step > 0 ? (
          <div
            onClick={goBack}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 700,
            }}
          >
            <Icon name="chevronLeft" size={14} color="var(--text-muted)" />
            Back
          </div>
        ) : (
          <div style={{ height: '18px' }} />
        )}
      </div>
    </div>
  )
}

export default Walkthrough