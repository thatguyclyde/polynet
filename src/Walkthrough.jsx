import { useState } from 'react'
import Icon from './Icon'

const STEPS = [
  { icon: 'home', title: 'Your Campus Feed', desc: 'Share updates, shoutouts and events with everyone at Harare Poly.' },
  { icon: 'newspaper', title: 'Official News', desc: 'Stay on top of campus announcements as soon as they drop.' },
  { icon: 'store', title: 'PolyMart', desc: 'Buy and sell with fellow students, right from your phone.' },
  { icon: 'inbox', title: 'In-App Chat', desc: 'Message sellers directly, or jump straight to WhatsApp.' },
  { icon: 'user', title: 'Your Profile', desc: 'Showcase your skills, socials and WhatsApp number so people can reach you.' },
]

function Walkthrough({ onFinish }) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  function next() {
    if (isLast) onFinish()
    else setStep(s => s + 1)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      display: 'flex', flexDirection: 'column', padding: '56px 24px 36px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flex: 1, marginRight: '16px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: '5px', borderRadius: '3px', background: i <= step ? 'var(--app-accent)' : 'var(--app-border-soft)', transition: 'background 0.3s' }} />
          ))}
        </div>
        <span onClick={onFinish} style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>Skip</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{
          width: '96px', height: '96px', borderRadius: '28px', background: 'var(--app-accent-soft)',
          color: 'var(--app-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px',
        }}>
          <Icon name={current.icon} size={40} />
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 700, color: 'var(--text-strong)' }}>{current.title}</h2>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '300px' }}>{current.desc}</p>
      </div>

      <button
        onClick={next}
        style={{
          width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
          background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '16px',
          cursor: 'pointer', boxShadow: 'var(--shadow-accent)',
        }}
      >
        {isLast ? "Let's go" : 'Next'}
      </button>
    </div>
  )
}

export default Walkthrough
