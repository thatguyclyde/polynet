import { useState } from 'react'
import { supabase } from './supabase'

const DEPARTMENTS = [
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
  },
  backBtn: {
    width: '52px', height: '52px', borderRadius: '14px',
    border: '1.5px solid var(--app-border-soft)', background: 'var(--input-bg)', color: 'var(--app-accent)',
    fontWeight: 700, fontSize: '20px', cursor: 'pointer', flexShrink: 0,
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
        {loading ? 'Saving...' : 'Next →'}
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
        <button onClick={onBack} style={s.backBtn}>←</button>
        <button onClick={handleNext} disabled={loading}
          style={{ ...s.nextBtn, marginTop: 0, flex: 1 }}>
          {loading ? 'Finishing...' : 'Finish →'}
        </button>
      </div>
    </div>
  )
}

function Onboarding({ session, onComplete }) {
  const [step, setStep] = useState(1)
  return (
    <>
      {step === 1 && <StepProfile session={session} onNext={() => setStep(2)} />}
      {step === 2 && <StepSkills session={session} onNext={() => onComplete()} onBack={() => setStep(1)} />}
    </>
  )
}

export default Onboarding