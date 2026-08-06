import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Icon from './Icon'

const DEPARTMENTS = [
  'Administration',
  'Applied Arts (Clothing Technology, Fashion & Textiles)',
  'Beauty Therapy & Cosmetology',
  'Business Studies',
  'Civil & Construction Engineering',
  'Communication & Information Science',
  'Computer Science / ICT',
  'Electrical Power Engineering',
  'Electronic Communication Systems',
  'Hospitality & Tourism',
  'Instrumentation & Control Systems',
  'Library & Information Science',
  'Mass Communication',
  'Mechanical Engineering',
  'Printing & Graphic Arts',
  'Quantity Surveying, Valuation & Estate Management',
  'Secretarial Studies',
]

const SUGGESTED_SKILLS = [
  'Python', 'JavaScript', 'React', 'HTML/CSS', 'Java', 'PHP',
  'Graphic Design', 'UI/UX Design', 'Figma', 'Photoshop', 'Illustrator',
  'Video Editing', 'Photography', 'Content Writing', 'Copywriting',
  'AutoCAD', 'SolidWorks', 'Welding', 'Electrical Wiring', 'Plumbing',
  'Accounting', 'Bookkeeping', 'Microsoft Excel', 'Data Analysis',
  'Public Speaking', 'Event Planning', 'Social Media Management',
  'Carpentry', 'Bricklaying', 'Painting & Decorating',
  'Hair Styling', 'Makeup Artistry', 'Fashion Design',
  'Research', 'Report Writing', 'Tutoring',
]

// TODO: replace with your real PolyNet contact/support email address.
const SUPPORT_EMAIL = 'support@polynet.app'
const VERIFIED_BLUE = '#1D9BF0'

const s = {
  page: {
    minHeight: '100vh',
    background: 'var(--page-bg)',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    padding: '56px 24px 36px',
  },
  progressRow: { display: 'flex', gap: '8px', marginBottom: '36px' },
  bar: (active) => ({
    flex: 1, height: '5px', borderRadius: '3px',
    background: active ? 'var(--app-accent)' : 'var(--app-border-soft)', transition: 'background 0.4s',
  }),
  title: { color: 'var(--text-strong)', fontSize: '26px', fontWeight: 800, margin: '0 0 6px' },
  sub: { color: 'var(--text-muted)', fontSize: '13px', marginBottom: '36px' },
  label: {
    display: 'block', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '1.2px',
    textTransform: 'uppercase', marginBottom: '8px', marginTop: '20px',
  },
  input: {
    width: '100%', padding: '14px 16px', borderRadius: '14px',
    border: '1.5px solid var(--app-border-soft)', background: 'var(--input-bg)', color: 'var(--text-strong)',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
    background: 'var(--card-bg)', border: '1.5px solid var(--app-border-soft)', borderRadius: '14px',
    maxHeight: '200px', overflowY: 'auto', zIndex: 99,
    boxShadow: 'var(--shadow-card)',
  },
  dItem: {
    padding: '13px 16px', color: 'var(--text-strong)', fontSize: '13px',
    cursor: 'pointer', borderBottom: '1px solid var(--app-border)',
  },
  yearRow: { display: 'flex', gap: '8px', marginTop: '8px' },
  yBtn: (on) => ({
    flex: 1, padding: '13px 0', borderRadius: '12px',
    border: on ? 'none' : '1.5px solid var(--app-border-soft)',
    background: on ? 'var(--app-accent)' : 'var(--input-bg)',
    color: on ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: '16px',
    cursor: 'pointer', transition: 'all 0.2s',
  }),
  nextBtn: {
    width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
    background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '16px',
    cursor: 'pointer', boxShadow: 'var(--shadow-accent)', marginTop: 'auto',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  },
  iconBackBtn: {
    width: '52px', height: '52px', borderRadius: '14px',
    border: '1.5px solid var(--app-border-soft)', background: 'var(--input-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  },
  navRow: { display: 'flex', gap: '12px', alignItems: 'center', marginTop: 'auto' },
  error: { color: 'var(--danger)', fontSize: '13px', marginTop: '12px' },
  skillPill: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--app-accent-soft)',
    border: '1px solid var(--app-border-soft)', borderRadius: '20px', padding: '6px 12px', margin: '4px',
  },
  skillChip: {
    display: 'inline-block', background: 'var(--input-bg)', border: '1.5px solid var(--app-border-soft)',
    borderRadius: '20px', padding: '7px 14px', color: 'var(--text-muted)', fontSize: '13px',
    cursor: 'pointer', margin: '4px',
  },
  customChip: {
    padding: '12px 16px', background: 'var(--input-bg)', border: '1.5px dashed var(--app-accent)',
    borderRadius: '12px', color: 'var(--app-accent)', fontSize: '13px', cursor: 'pointer',
    marginTop: '10px', marginBottom: '4px',
  },
  roleCard: {
    display: 'flex', alignItems: 'center', gap: '14px', padding: '20px',
    borderRadius: '18px', border: '1.5px solid var(--app-border-soft)',
    cursor: 'pointer', background: 'var(--input-bg)',
  },
  roleIcon: {
    width: '48px', height: '48px', borderRadius: '14px', background: 'var(--app-accent-soft)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0,
  },
}

function VerifiedBadge({ size = 54 }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="badgeCheck" size={size} color={VERIFIED_BLUE} fill={VERIFIED_BLUE} style={{ position: 'absolute', top: 0, left: 0 }} />
      <Icon name="check" size={size * 0.46} color="#fff" strokeWidth={3.5} style={{ position: 'relative' }} />
    </span>
  )
}

function StepRoleSelect({ onSelectStudent, onSelectAdmin }) {
  return (
    <div style={s.page}>
      <h2 style={s.title}>How will you use PolyNet?</h2>
      <p style={s.sub}>Choose the option that fits you</p>

      <div onClick={onSelectStudent} style={{ ...s.roleCard, marginBottom: '14px' }}>
        <div style={s.roleIcon}>🎓</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-strong)' }}>I'm a Student</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Build your profile, find skills, join the marketplace</div>
        </div>
      </div>

      <div onClick={onSelectAdmin} style={s.roleCard}>
        <div style={s.roleIcon}>🏛️</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-strong)' }}>I'm Staff / Admin</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Post official news and announcements</div>
        </div>
      </div>
    </div>
  )
}

// Checks the current user's ID against the `admins` table (which keys off
// user_id, not email). Auto-advances on success after a short beat so the
// verified badge is actually seen; on failure, waits for the person to
// choose Back or Contact PolyNet.
function StepAdminVerify({ session, onVerified, onBack }) {
  const [status, setStatus] = useState('checking') // 'checking' | 'verified' | 'denied'

  useEffect(() => {
    let cancelled = false

    async function verify() {
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Error verifying admin status:', error.message)
        setStatus('denied')
        return
      }

      if (data) {
        setStatus('verified')
        setTimeout(() => { if (!cancelled) onVerified() }, 1200)
      } else {
        setStatus('denied')
      }
    }

    verify()
    return () => { cancelled = true }
  }, [])

  if (status === 'checking') {
    return (
      <div style={s.page}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--app-accent)', animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '14px' }}>Verifying...</p>
        </div>
        <style>{`@keyframes dotPulse { 0%,100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>
      </div>
    )
  }

  if (status === 'verified') {
    return (
      <div style={s.page}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <VerifiedBadge size={56} />
          <p style={{ color: 'var(--text-strong)', fontWeight: 800, fontSize: '17px', margin: 0 }}>Verified!</p>
        </div>
      </div>
    )
  }

  // denied — compact icon-only Back button, and a proper Contact PolyNet
  // button with a phone icon, instead of two stretched text buttons.
  const contactHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Admin access request — PolyNet')}&body=${encodeURIComponent(`Hi, I'd like to request admin access for PolyNet.\n\nMy account email: ${session.user.email}`)}`

  return (
    <div style={s.page}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '10px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
          <Icon name="shield" size={28} color="var(--app-accent)" />
        </div>
        <h2 style={{ color: 'var(--text-strong)', fontSize: '19px', fontWeight: 800, margin: 0 }}>Not an Admin</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', maxWidth: '260px', lineHeight: 1.5 }}>
          We couldn't find {session.user.email} on our admin list. If this is a mistake, reach out and we'll sort it out.
        </p>
      </div>
      <div style={s.navRow}>
        <button onClick={onBack} aria-label="Back" style={s.iconBackBtn}>
          <Icon name="arrowLeft" size={20} color="var(--text-strong)" />
        </button>
        <a
          href={contactHref}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '15px', borderRadius: '14px', border: 'none',
            background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '14.5px',
            cursor: 'pointer', boxShadow: 'var(--shadow-accent)', textDecoration: 'none',
          }}
        >
          <Icon name="phone" size={16} color="#fff" />
          Contact PolyNet
        </a>
      </div>
    </div>
  )
}

function StepAdminDetails({ session, onFinish }) {
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [deptSearch, setDeptSearch] = useState('')
  const [showDept, setShowDept] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filtered = DEPARTMENTS.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase()))

  async function handleFinish() {
    if (!title.trim()) return setError('Please enter your title')
    if (!department) return setError('Please select the department you represent')
    setLoading(true)
    setError('')
    const { error: err } = await supabase
      .from('profiles')
      .update({
        department,
        admin_title: title.trim(),
        is_admin: true,
      })
      .eq('id', session.user.id)
    if (err) { setError(err.message); setLoading(false) }
    else onFinish()
  }

  return (
    <div style={s.page}>
      <h2 style={s.title}>Admin details</h2>
      <p style={s.sub}>Let students know who you are</p>

      <label style={s.label}>Title</label>
      <div style={{ position: 'relative' }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. HOD Electrical Engineering, Principal, SRC President"
          style={{ ...s.input, paddingRight: title.trim() ? '48px' : '16px' }}
        />
        {title.trim().length > 0 && (
          <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            <VerifiedBadge size={20} />
          </div>
        )}
      </div>

      <label style={s.label}>Department</label>
      <div style={{ position: 'relative' }}>
        <input
          value={department || deptSearch}
          onChange={e => { setDeptSearch(e.target.value); setDepartment(''); setShowDept(true) }}
          onFocus={() => { setShowDept(true); if (department) setDeptSearch('') }}
          onBlur={() => setTimeout(() => setShowDept(false), 150)}
          placeholder="Search department you represent..."
          style={s.input}
        />
        {showDept && filtered.length > 0 && (
          <div style={s.dropdown}>
            {filtered.map(d => (
              <div key={d} style={s.dItem}
                onMouseDown={() => { setDepartment(d); setDeptSearch(''); setShowDept(false) }}>
                {d}
              </div>
            ))}
          </div>
        )}
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '6px' }}>Shown on your public profile card</p>

      {error && <p style={s.error}>{error}</p>}
      <div style={{ flex: 1, minHeight: '24px' }} />
      <button
        onClick={handleFinish}
        disabled={loading}
        style={{
          alignSelf: 'center', padding: '14px 44px', borderRadius: '14px', border: 'none',
          background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '15px',
          cursor: 'pointer', boxShadow: 'var(--shadow-accent)', marginTop: 'auto',
        }}
      >
        {loading ? 'Saving...' : 'Done'}
      </button>
    </div>
  )
}

function StepProfile({ session, onNext }) {
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [deptSearch, setDeptSearch] = useState('')
  const [showDept, setShowDept] = useState(false)
  const [year, setYear] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filtered = DEPARTMENTS.filter(d =>
    d.toLowerCase().includes(deptSearch.toLowerCase())
  )

  async function handleNext() {
    if (!fullName.trim()) return setError('Please enter your full name')
    if (!department) return setError('Please select your department')
    if (!year) return setError('Please select your year of study')
    setLoading(true)
    setError('')
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: fullName, department, year_of_study: year })
      .eq('id', session.user.id)
    if (err) { setError(err.message); setLoading(false) }
    else onNext()
  }

  return (
    <div style={s.page}>
      <div style={s.progressRow}>
        <div style={s.bar(true)} />
        <div style={s.bar(false)} />
      </div>
      <h2 style={s.title}>Tell us about yourself</h2>
      <p style={s.sub}>Step 1 of 2 — Your details</p>

      <label style={s.label}>Full Name</label>
      <input value={fullName} onChange={e => setFullName(e.target.value)}
        placeholder="e.g. Clyde Chiruka" style={s.input} />

      <label style={s.label}>Department</label>
      <div style={{ position: 'relative' }}>
        <input
          value={department || deptSearch}
          onChange={e => { setDeptSearch(e.target.value); setDepartment(''); setShowDept(true) }}
          onFocus={() => { setShowDept(true); if (department) setDeptSearch('') }}
          onBlur={() => setTimeout(() => setShowDept(false), 150)}
          placeholder="Search your department..."
          style={s.input}
        />
        {showDept && filtered.length > 0 && (
          <div style={s.dropdown}>
            {filtered.map(d => (
              <div key={d} style={s.dItem}
                onMouseDown={() => { setDepartment(d); setDeptSearch(''); setShowDept(false) }}>
                {d}
              </div>
            ))}
          </div>
        )}
      </div>

      <label style={s.label}>Year of Study</label>
      <div style={s.yearRow}>
        {[1, 2, 3, 4, 5].map(y => (
          <button key={y} type="button" onClick={() => setYear(y)} style={s.yBtn(year === y)}>
            {y}
          </button>
        ))}
      </div>

      {error && <p style={s.error}>{error}</p>}
      <div style={{ flex: 1, minHeight: '24px' }} />
      <button onClick={handleNext} disabled={loading} style={s.nextBtn}>
        {loading ? 'Saving...' : (
          <>
            Next
            <Icon name="arrowRight" size={17} color="#fff" />
          </>
        )}
      </button>
    </div>
  )
}

function StepSkills({ session, onNext, onBack }) {
  const [mySkills, setMySkills] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const filtered = SUGGESTED_SKILLS.filter(sk =>
    sk.toLowerCase().includes(search.toLowerCase()) &&
    !mySkills.includes(sk)
  )

  function addSkill(name) {
    if (!mySkills.includes(name)) {
      setMySkills(prev => [...prev, name])
      setSearch('')
    }
  }

  async function handleNext() {
    setLoading(true)
    if (mySkills.length > 0) {
      await supabase.from('skills').insert(
        mySkills.map(skill => ({ user_id: session.user.id, skill_name: skill }))
      )
    }
    onNext()
  }

  return (
    <div style={s.page}>
      <div style={s.progressRow}>
        <div style={s.bar(true)} />
        <div style={s.bar(true)} />
      </div>
      <h2 style={s.title}>What are your skills?</h2>
      <p style={s.sub}>Step 2 of 2 — Help others find you</p>

      {mySkills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '12px' }}>
          {mySkills.map(skill => (
            <div key={skill} style={s.skillPill}>
              <span style={{ color: 'var(--app-accent)', fontSize: '13px', fontWeight: 600 }}>{skill}</span>
              <span onClick={() => setMySkills(mySkills.filter(x => x !== skill))}
                style={{ color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', lineHeight: 1 }}>×</span>
            </div>
          ))}
        </div>
      )}

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search skills..." style={s.input} />

      {search.length > 1 && !SUGGESTED_SKILLS.find(sk => sk.toLowerCase() === search.toLowerCase()) && (
        <div style={s.customChip} onClick={() => addSkill(search)}>
          + Add "{search}" as a custom skill
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '12px', overflowY: 'auto', maxHeight: '200px' }}>
        {filtered.slice(0, 24).map(skill => (
          <div key={skill} style={s.skillChip} onClick={() => addSkill(skill)}>
            + {skill}
          </div>
        ))}
      </div>

      <div style={s.navRow}>
        <button onClick={onBack} aria-label="Back" style={s.iconBackBtn}>
          <Icon name="arrowLeft" size={20} color="var(--text-strong)" />
        </button>
        <button onClick={handleNext} disabled={loading}
          style={{ ...s.nextBtn, marginTop: 0, flex: 1 }}>
          {loading ? 'Finishing...' : (
            <>
              Finish
              <Icon name="arrowRight" size={17} color="#fff" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function Onboarding({ session, onComplete }) {
  const [flow, setFlow] = useState('roleSelect') // roleSelect | studentStep1 | studentStep2 | adminVerify | adminDetails

  if (flow === 'roleSelect') {
    return (
      <StepRoleSelect
        onSelectStudent={() => setFlow('studentStep1')}
        onSelectAdmin={() => setFlow('adminVerify')}
      />
    )
  }

  if (flow === 'studentStep1') {
    return <StepProfile session={session} onNext={() => setFlow('studentStep2')} />
  }

  if (flow === 'studentStep2') {
    return <StepSkills session={session} onNext={() => onComplete()} onBack={() => setFlow('studentStep1')} />
  }

  if (flow === 'adminVerify') {
    return (
      <StepAdminVerify
        session={session}
        onVerified={() => setFlow('adminDetails')}
        onBack={() => setFlow('roleSelect')}
      />
    )
  }

  if (flow === 'adminDetails') {
    return <StepAdminDetails session={session} onFinish={() => onComplete()} />
  }

  return null
}

export default Onboarding