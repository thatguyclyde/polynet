import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from './Icon'

const BRAND_PURPLE = '#7C3AED'

// Every step gets its own accent color on top of the brand purple that
// anchors every screen (main icon, the Next button always carries purple
// in its gradient). The accent is what gives each step its own
// personality — chosen to match the meaning, not just for variety:
// blue for "official/verified", green for money, amber for discovery,
// red for social warmth, cyan for conversation.
const STEPS = [
  {
    key: 'news',
    eyebrow: 'Official News',
    title: 'Straight From The Source',
    desc: 'Campus updates posted directly by school admins. No more false circulation — if it\'s on PolyNet News, it\'s real.',
    accent: '#1D9BF0',
  },
  {
    key: 'polymart',
    eyebrow: 'PolyMart',
    title: 'A Marketplace Built For Campus',
    desc: 'Buy and sell anything with fellow students — textbooks, electronics, services — right from your phone.',
    accent: '#10B981',
  },
  {
    key: 'skills',
    eyebrow: 'Skill Search',
    title: 'Find Skills, Not Just Posts',
    desc: 'Search for students by what they can do — tutoring, repairs, design — and connect with the right person instantly.',
    accent: '#F59E0B',
  },
  {
    key: 'feed',
    eyebrow: 'Your Feed',
    title: 'Every Corner Of Campus Life',
    desc: 'Share updates, shoutouts and moments with everyone at Harare Poly, all in one scroll.',
    accent: '#ED4956',
  },
  {
    key: 'chats',
    eyebrow: 'In-App Chat',
    title: 'The Network Behind It All',
    desc: 'Message sellers, tutors and classmates directly — the thread that ties PolyMart and every connection together.',
    accent: '#06B6D4',
  },
]

// Each step gets its own hand-built visual composition — layered icon
// badges rather than a single boxed icon — so every page reads as its own
// small scene instead of a repeated template. The central icon always
// stays brand purple (this is PolyNet's own walkthrough); the accent
// color carries the badges, rings and small details around it.
function StepVisual({ stepKey, accent }) {
  const ringStyle = {
    width: '148px', height: '148px', borderRadius: '50%',
    background: `linear-gradient(135deg, ${accent}29, var(--app-accent-soft))`,
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
        <div style={{ ...badgeBase, width: '46px', height: '46px', right: '-4px', bottom: '2px', background: accent }}>
          <Icon name="check" size={20} color="#fff" strokeWidth={3.5} />
        </div>
        {/* Small announcement bursts, top corners */}
        <motion.div
          animate={{ opacity: [0.3, 0.85, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '6px', left: '-6px', width: '14px', height: '3px', borderRadius: '2px', background: accent, transform: 'rotate(-35deg)' }}
        />
        <motion.div
          animate={{ opacity: [0.3, 0.85, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          style={{ position: 'absolute', top: '2px', right: '4px', width: '10px', height: '3px', borderRadius: '2px', background: accent, transform: 'rotate(35deg)' }}
        />
      </div>
    )
  }

  if (stepKey === 'polymart') {
    return (
      <div style={ringStyle}>
        <Icon name="store" size={54} color={BRAND_PURPLE} />
        {/* Exchange badge — the transaction cue, in the marketplace's green */}
        <div style={{ ...badgeBase, width: '46px', height: '46px', right: '-6px', bottom: '4px', background: accent }}>
          <Icon name="exchange" size={20} color="#fff" strokeWidth={2.5} />
        </div>
        {/* Floating price tag, top-left */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            ...badgeBase, width: '38px', height: '38px', left: '-8px', top: '4px',
            background: 'var(--card-bg)', border: `2px solid ${accent}`, boxShadow: `0 4px 10px ${accent}33`,
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: 800, color: accent }}>$</span>
        </motion.div>
      </div>
    )
  }

  if (stepKey === 'skills') {
    return (
      <div style={ringStyle}>
        <Icon name="handshake" size={52} color={BRAND_PURPLE} />
        {/* Two small "people" nodes connected by a dashed line — the
            searchable-network idea, rendered in the discovery accent */}
        <div style={{
          position: 'absolute', top: '10px', left: '-10px',
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'var(--card-bg)', border: `3px solid ${accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 10px ${accent}33`,
        }}>
          <Icon name="user" size={14} color={accent} />
        </div>
        <div style={{
          position: 'absolute', bottom: '6px', right: '-10px',
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'var(--card-bg)', border: `3px solid ${accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 10px ${accent}33`,
        }}>
          <Icon name="search" size={13} color={accent} />
        </div>
      </div>
    )
  }

  if (stepKey === 'feed') {
    return (
      <div style={ringStyle}>
        <Icon name="home" size={54} color={BRAND_PURPLE} />
        {/* Heart badge, in the feed's warm accent */}
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ ...badgeBase, width: '38px', height: '38px', left: '-6px', bottom: '2px', background: accent }}
        >
          <Icon name="heart" size={16} color="#fff" fill="#fff" />
        </motion.div>
        {/* Comment badge, staying on brand purple for contrast */}
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
          "the network behind it all", in the chat accent */}
      <svg width="70" height="34" viewBox="0 0 70 34" style={{ position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)' }}>
        <line x1="10" y1="8" x2="35" y2="24" stroke={accent} strokeWidth="2" strokeDasharray="3 3" opacity="0.55" />
        <line x1="60" y1="8" x2="35" y2="24" stroke={accent} strokeWidth="2" strokeDasharray="3 3" opacity="0.55" />
        <circle cx="10" cy="8" r="6" fill="var(--card-bg)" stroke={accent} strokeWidth="2" />
        <circle cx="60" cy="8" r="6" fill="var(--card-bg)" stroke={accent} strokeWidth="2" />
        <circle cx="35" cy="24" r="7" fill={accent} />
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
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 36 : -36, scale: 0.97 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -36 : 36, scale: 0.97 }),
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
    }}>
      {/* Soft color wash behind everything, crossfading to match the
          current step's accent — ties the whole screen together with
          color, not just the icon composition */}
      <AnimatePresence>
        <motion.div
          key={current.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
            background: `radial-gradient(circle at 50% 25%, ${current.accent}1F, transparent 65%)`,
          }}
        />
      </AnimatePresence>

      {/* Skip — top-right, small and out of the way. Now that Next lives
          in the thumb zone at the bottom, Skip can stay a quiet secondary
          action instead of competing for the same corner. */}
      <span
        onClick={onFinish}
        style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 20,
          color: 'var(--text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
        }}
      >
        Skip
      </span>

      <div style={{ padding: '56px 24px 0', position: 'relative', zIndex: 1 }}>
        {/* Progress dots — current step glows in its own accent, so the
            nav bar already hints at the color story before you even land
            on the page */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              onClick={() => { setDirection(i > step ? 1 : -1); setStep(i) }}
              style={{
                flex: 1, height: '5px', borderRadius: '3px', cursor: 'pointer',
                background: i === step ? s.accent : i < step ? BRAND_PURPLE : 'var(--app-border-soft)',
                boxShadow: i === step ? `0 0 8px ${s.accent}88` : 'none',
                transition: 'background 0.3s, box-shadow 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 24px', position: 'relative', zIndex: 1 }}>
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
              <StepVisual stepKey={current.key} accent={current.accent} />
            </div>

            <div style={{
              display: 'inline-block', marginBottom: '12px', padding: '5px 13px',
              borderRadius: '999px', background: `${current.accent}1A`,
              color: current.accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
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

      {/* Bottom nav — Back and Next sit together in the thumb zone, the
          most reachable part of the screen on any phone size. Next stays
          bottom-right specifically since that's where a right-handed (or
          two-handed) grip naturally rests, and it's the action people take
          on every single screen. */}
      <div style={{
        padding: '0 24px calc(28px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 1,
      }}>
        {step > 0 ? (
          <motion.div
            whileTap={{ scale: 0.92 }}
            onClick={goBack}
            style={{
              width: '46px', height: '46px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--card-bg)', border: '1px solid var(--app-border)',
              cursor: 'pointer',
            }}
          >
            <Icon name="chevronLeft" size={19} color="var(--text-strong)" />
          </motion.div>
        ) : (
          <div style={{ width: '46px', height: '46px' }} />
        )}

        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={next}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '15px 26px', borderRadius: '999px',
            background: `linear-gradient(135deg, ${BRAND_PURPLE}, ${current.accent})`,
            color: '#fff', fontWeight: 800, fontSize: '15px',
            cursor: 'pointer', boxShadow: `0 10px 26px ${current.accent}4D`,
          }}
        >
          {isLast ? "Let's go" : 'Next'}
          <Icon name={isLast ? 'check' : 'chevronRight'} size={16} color="#fff" strokeWidth={3} />
        </motion.div>
      </div>
    </div>
  )
}

export default Walkthrough