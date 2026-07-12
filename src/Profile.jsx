import { useState, useEffect } from 'react'
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

function compressImage(file, maxWidth = 500, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function Profile({ session }) {
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [deptSearch, setDeptSearch] = useState('')
  const [showDept, setShowDept] = useState(false)
  const [year, setYear] = useState(null)
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, department, year_of_study, bio, avatar_url')
      .eq('id', session.user.id)
      .single()

    if (data) {
      setFullName(data.full_name || '')
      setDepartment(data.department || '')
      setYear(data.year_of_study || null)
      setBio(data.bio || '')
      setAvatarUrl(data.avatar_url || null)
    }

    const { data: skillData } = await supabase
      .from('skills')
      .select('id, skill_name')
      .eq('user_id', session.user.id)

    setSkills(skillData || [])
    setLoading(false)
  }

  async function handleAvatarSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const compressed = await compressImage(file)
    setAvatarFile(compressed)
    setAvatarPreview(URL.createObjectURL(compressed))
    setUploading(false)
  }

  async function handleSave() {
    if (!fullName.trim()) return setMessage('Full name is required')
    setSaving(true)
    setMessage('')

    let newAvatarUrl = avatarUrl
    if (avatarFile) {
      const fileName = `${session.user.id}/${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { contentType: 'image/jpeg' })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
        newAvatarUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        department,
        year_of_study: year,
        bio,
        avatar_url: newAvatarUrl,
      })
      .eq('id', session.user.id)

    if (error) {
      setMessage(error.message)
    } else {
      setAvatarUrl(newAvatarUrl)
      setAvatarFile(null)
      setAvatarPreview(null)
      setMessage('✓ Changes saved')
      setTimeout(() => setMessage(''), 2500)
    }
    setSaving(false)
  }

  async function removeSkill(id) {
    await supabase.from('skills').delete().eq('id', id)
    setSkills(skills.filter(s => s.id !== id))
  }

  const filteredDepts = DEPARTMENTS.filter(d =>
    d.toLowerCase().includes(deptSearch.toLowerCase())
  )

  const initials = fullName.split(' ').map(n => n[0]).slice(0, 2).join('') || 'S'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '10px', height: '10px', borderRadius: '50%', background: '#7C3AED',
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes dotPulse {0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Header */}
      <div style={{
        padding: '18px 20px', background: '#ffffff', borderBottom: '1px solid #F1F1F5',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#7C3AED' }}>My Profile</h1>
        <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94A3B8', fontWeight: 600 }}>
          Manage your account
        </p>
      </div>

      {/* Avatar section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px' }}>
        <label style={{ position: 'relative', cursor: 'pointer' }}>
          {(avatarPreview || avatarUrl) ? (
            <img
              src={avatarPreview || avatarUrl}
              alt="avatar"
              style={{ width: '92px', height: '92px', borderRadius: '24px', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '92px', height: '92px', borderRadius: '24px', background: '#F5F3FF',
              color: '#7C3AED', fontSize: '28px', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {initials}
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: '-4px', right: '-4px',
            width: '30px', height: '30px', borderRadius: '10px', background: '#7C3AED',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', border: '3px solid #FAFAFA',
          }}>
            📷
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
        </label>
        {uploading && <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '8px' }}>Processing photo...</p>}
      </div>

      {/* Form */}
      <div style={{ padding: '0 20px 20px' }}>

        <label style={labelStyle}>Full Name</label>
        <input
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Department</label>
        <div style={{ position: 'relative' }}>
          <input
            value={department || deptSearch}
            onChange={e => { setDeptSearch(e.target.value); setDepartment(''); setShowDept(true) }}
            onFocus={() => { setShowDept(true); if (department) setDeptSearch('') }}
            onBlur={() => setTimeout(() => setShowDept(false), 150)}
            placeholder="Search department..."
            style={inputStyle}
          />
          {showDept && filteredDepts.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: '#fff', border: '1.5px solid #F1F1F5', borderRadius: '14px',
              maxHeight: '200px', overflowY: 'auto', zIndex: 50,
              boxShadow: '0 8px 32px rgba(124,58,237,0.12)',
            }}>
              {filteredDepts.map(d => (
                <div key={d}
                  onMouseDown={() => { setDepartment(d); setDeptSearch(''); setShowDept(false) }}
                  style={{ padding: '13px 16px', fontSize: '13px', color: '#1A1A2E', cursor: 'pointer', borderBottom: '1px solid #F8F8FA' }}>
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>

        <label style={labelStyle}>Year of Study</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
          {[1, 2, 3, 4, 5].map(y => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: '12px',
                border: year === y ? 'none' : '1.5px solid #F1F1F5',
                background: year === y ? '#7C3AED' : '#fff',
                color: year === y ? '#fff' : '#94A3B8',
                fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              }}
            >
              {y}
            </button>
          ))}
        </div>

        <label style={labelStyle}>Bio</label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="What are you looking for? What can others find you for?"
          rows={3}
          style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
        />

        {/* Skills */}
        <label style={labelStyle}>Skills</label>
        {skills.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#B4B4C0', marginTop: '4px' }}>No skills added yet</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '4px' }}>
            {skills.map(skill => (
              <div key={skill.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#F0EBFF', border: '1px solid #C4B5FD', borderRadius: '20px',
                padding: '6px 12px', margin: '4px 4px 0 0',
              }}>
                <span style={{ color: '#7C3AED', fontSize: '13px', fontWeight: 600 }}>{skill.skill_name}</span>
                <span onClick={() => removeSkill(skill.id)}
                  style={{ color: '#EF4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>×</span>
              </div>
            ))}
          </div>
        )}

        {message && (
          <p style={{
            fontSize: '13px', marginTop: '16px', textAlign: 'center', fontWeight: 600,
            color: message.startsWith('✓') ? '#16A34A' : '#EF4444',
          }}>
            {message}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || uploading}
          style={{
            width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
            background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: '15px',
            cursor: 'pointer', marginTop: '20px',
            boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            width: '100%', padding: '15px', borderRadius: '14px',
            border: '1.5px solid #EF4444', background: 'transparent',
            color: '#EF4444', fontWeight: 700, fontSize: '15px',
            cursor: 'pointer', marginTop: '12px',
          }}
        >
          Log Out
        </button>
      </div>

      <div style={{ height: '20px' }} />
    </div>
  )
}

const labelStyle = {
  display: 'block', color: '#64748B', fontSize: '11px', letterSpacing: '1px',
  textTransform: 'uppercase', marginBottom: '8px', marginTop: '18px', fontWeight: 700,
}

const inputStyle = {
  width: '100%', padding: '13px 14px', borderRadius: '14px',
  border: '1.5px solid #F1F1F5', background: '#fff', color: '#1A1A2E',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}

export default Profile