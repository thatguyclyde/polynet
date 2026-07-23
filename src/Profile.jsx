import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Icon from './Icon'
import { useTheme } from './ThemeContext'
import { ProfileSkeleton } from './Skeleton'

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

const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: 'instagram' },
  { id: 'twitter', label: 'Twitter / X', icon: 'twitter' },
  { id: 'tiktok', label: 'TikTok', icon: 'tiktok' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { id: 'youtube', label: 'YouTube', icon: 'youtube' },
  { id: 'snapchat', label: 'Snapchat', icon: 'snapchat' },
  { id: 'github', label: 'GitHub', icon: 'github' },
  { id: 'website', label: 'Website', icon: 'globe' },
]

function platformInfo(id) {
  return SOCIAL_PLATFORMS.find(p => p.id === id) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1]
}

function whatsappUrlFor(digits) {
  return `https://wa.me/${digits}`
}

function compressImage(file, maxWidth = 500, quality = 0.75) {
  return new Promise((resolve, reject) => {
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
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        }, 'image/jpeg', quality)
      }
      img.onerror = () => reject(new Error('Image failed to load'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

function InfoPage({ title, onBack, children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '18px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-strong)' }}>
          <Icon name="arrowLeft" size={20} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-strong)' }}>{title}</span>
      </div>
      <div style={{ padding: '20px', fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-body)' }}>
        {children}
      </div>
    </div>
  )
}

function ConfirmModal({ title, body, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg)', width: '100%', maxWidth: '420px',
          borderRadius: '24px 24px 0 0', padding: '24px 20px 28px',
          animation: 'slideUp 0.25s ease',
        }}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--app-border-soft)', margin: '0 auto 18px' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: 'var(--text-strong)', textAlign: 'center' }}>{title}</h3>
        <p style={{ margin: '0 0 22px', fontSize: '13.5px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>{body}</p>
        <button
          onClick={onConfirm}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
            background: danger ? '#EF4444' : 'var(--app-accent)', color: '#fff',
            fontWeight: 700, fontSize: '14.5px', cursor: 'pointer', marginBottom: '10px',
          }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onCancel}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px',
            border: '1px solid var(--app-border-soft)', background: 'transparent',
            color: 'var(--text-strong)', fontWeight: 700, fontSize: '14.5px', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function Profile({ session, onBack }) {
  const { isDark, toggleTheme } = useTheme()
  const [editMode, setEditMode] = useState(false)
  const [allPlatformSkills, setAllPlatformSkills] = useState([])
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
  const [skillSearch, setSkillSearch] = useState('')
  const [showSkillList, setShowSkillList] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [socialLinks, setSocialLinks] = useState([])
  const [newLinkPlatform, setNewLinkPlatform] = useState('instagram')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [showAddLink, setShowAddLink] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [infoPage, setInfoPage] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const [{ data }, { data: skillData }, { data: platformSkills }] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, department, year_of_study, bio, avatar_url, whatsapp_number, social_links')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase
        .from('skills')
        .select('id, skill_name')
        .eq('user_id', session.user.id),
      supabase
        .from('skills')
        .select('skill_name'),
    ])

    if (data) {
      setFullName(data.full_name || '')
      setDepartment(data.department || '')
      setYear(data.year_of_study || null)
      setBio(data.bio || '')
      setAvatarUrl(data.avatar_url || null)
      setWhatsapp(data.whatsapp_number || '')
      setSocialLinks(data.social_links || [])
    }

    setSkills(skillData || [])

    if (platformSkills) {
      const unique = [...new Set(platformSkills.map(s => s.skill_name))].sort()
      setAllPlatformSkills(unique)
    }

    setLoading(false)
  }

  async function handleAvatarSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setMessage('')
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      setAvatarFile(compressed)
      setAvatarPreview(URL.createObjectURL(compressed))
    } catch (err) {
      setMessage('Could not process that image. Try a different one.')
    }
    setUploading(false)
  }

  async function addSkill(name) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (skills.find(s => s.skill_name.toLowerCase() === trimmed.toLowerCase())) {
      setSkillSearch('')
      return
    }
    const { data, error } = await supabase
      .from('skills')
      .insert({ user_id: session.user.id, skill_name: trimmed })
      .select()
      .single()

    if (!error && data) setSkills(prev => [...prev, data])
    setSkillSearch('')
    setShowSkillList(false)
  }

  async function removeSkill(id) {
    await supabase.from('skills').delete().eq('id', id)
    setSkills(skills.filter(s => s.id !== id))
  }

  function addSocialLink() {
    if (!newLinkUrl.trim()) return
    setSocialLinks(prev => [...prev, { platform: newLinkPlatform, url: newLinkUrl.trim() }])
    setNewLinkUrl('')
    setShowAddLink(false)
  }

  function removeSocialLink(idx) {
    setSocialLinks(prev => prev.filter((_, i) => i !== idx))
  }

  async function performSave() {
    setSaving(true)
    setMessage('')
    setConfirmModal(null)

    let newAvatarUrl = avatarUrl

    if (avatarFile) {
      const fileName = `${session.user.id}/${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { contentType: 'image/jpeg' })

      if (uploadErr) {
        setMessage(`Avatar upload failed: ${uploadErr.message}`)
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      newAvatarUrl = urlData.publicUrl
    }

    const { data: updateData, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        department,
        year_of_study: year,
        bio,
        avatar_url: newAvatarUrl,
        whatsapp_number: whatsapp.trim() || null,
        social_links: socialLinks,
      })
      .eq('id', session.user.id)
      .select()

    if (error) {
      setMessage(`Save failed: ${error.message}`)
    } else if (!updateData || updateData.length === 0) {
      setMessage('Save failed: no matching profile row found')
    } else {
      setAvatarUrl(newAvatarUrl)
      setAvatarFile(null)
      setAvatarPreview(null)
      setMessage('✓ Profile updated')
      setEditMode(false)
      setTimeout(() => setMessage(''), 2500)
    }
    setSaving(false)
  }

  function requestSave() {
    if (!fullName.trim()) return setMessage('Full name is required')
    setConfirmModal('save')
  }

  const filteredDepts = DEPARTMENTS.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase()))
  const filteredSkills = allPlatformSkills.filter(s =>
    s.toLowerCase().includes(skillSearch.toLowerCase()) &&
    !skills.find(ms => ms.skill_name.toLowerCase() === s.toLowerCase())
  )
  const initials = fullName.split(' ').map(n => n[0]).slice(0, 2).join('') || 'S'
  const whatsappDigits = whatsapp.replace(/[^0-9]/g, '')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ padding: '18px 20px 12px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 20 }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-strong)' }}>My Profile</h1>
        </div>
        <ProfileSkeleton />
      </div>
    )
  }

  if (infoPage === 'about') {
    return (
      <InfoPage title="About PolyNet" onBack={() => setInfoPage(null)}>
        <p>PolyNet is a campus community app built for students at Harare Polytechnic.</p>
        <p style={{ marginTop: '14px', color: 'var(--text-muted)' }}>Version 1.0.0</p>
      </InfoPage>
    )
  }

  if (infoPage === 'privacy') {
    return (
      <InfoPage title="Privacy Policy" onBack={() => setInfoPage(null)}>
        <p><strong>What we collect:</strong> your name, department, year, bio, avatar, skills, WhatsApp number and social links, plus posts and listings you create.</p>
        <p style={{ marginTop: '14px' }}><strong>Your control:</strong> edit or remove any of it here, anytime.</p>
      </InfoPage>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: editMode ? '110px' : '24px' }}>
      
      {/* ═══ STICKY HEADER WITH TOP-RIGHT BACK BUTTON ═══ */}
      <div style={{
        padding: '16px 20px 12px',
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--app-border)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-strong)' }}>
          {editMode ? 'Edit Profile' : 'My Profile'}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {editMode && (
            <span
              onClick={() => {
                setEditMode(false)
                setAvatarFile(null)
                setAvatarPreview(null)
                fetchProfile()
              }}
              style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginRight: '4px' }}
            >
              Cancel
            </span>
          )}

          {/* Back button — pinned to the right edge of the header */}
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Close Profile"
              style={{
                cursor: 'pointer',
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--app-accent-soft)',
                color: 'var(--app-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="arrowLeft" size={20} color="var(--app-accent)" />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* ═══ HERO — Cover + Avatar + Name ═══ */}
        <div style={{ borderRadius: '22px', overflow: 'hidden', border: '1px solid var(--app-border)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{
            height: '84px',
            background: 'linear-gradient(135deg, var(--app-accent) 0%, var(--app-accent-dark, var(--app-accent)) 100%)',
            position: 'relative',
          }} />
          <div style={{ background: 'var(--card-bg)', padding: '0 18px 20px', textAlign: 'center', marginTop: '-42px' }}>
            <label style={{ position: 'relative', cursor: editMode ? 'pointer' : 'default', display: 'inline-block' }}>
              <div style={{
                width: '86px', height: '86px', borderRadius: '50%', overflow: 'hidden',
                background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '4px solid var(--card-bg)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              }}>
                {(avatarPreview || avatarUrl) ? (
                  <img src={avatarPreview || avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none' }} />
                ) : (
                  <span style={{ color: 'var(--app-accent)', fontSize: '26px', fontWeight: 700 }}>{initials}</span>
                )}
              </div>
              {editMode && (
                <div style={{ position: 'absolute', right: '0', bottom: '2px', width: '26px', height: '26px', borderRadius: '9px', background: 'var(--app-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--card-bg)' }}>
                  <Icon name="camera" size={13} />
                </div>
              )}
              {editMode && <input type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />}
            </label>

            {!editMode ? (
              <>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-strong)', marginTop: '10px' }}>
                  {fullName || 'Your Name'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {department || 'No department set'}{year ? ` · Year ${year}` : ''}
                </div>
                {bio && (
                  <p style={{ margin: '10px 0 0', fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.55 }}>{bio}</p>
                )}

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', padding: '6px 11px', borderRadius: '999px', background: 'var(--app-accent-soft)', color: 'var(--app-accent)', fontSize: '11.5px', fontWeight: 700 }}>
                  <Icon name="check" size={11} />
                  Verified student
                </div>

                {skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '14px' }}>
                    {skills.map(skill => (
                      <div key={skill.id} style={{ background: 'var(--page-bg)', border: '1px solid var(--app-border-soft)', borderRadius: '999px', padding: '5px 11px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-strong)' }}>
                        {skill.skill_name}
                      </div>
                    ))}
                  </div>
                )}

                {socialLinks.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '14px' }}>
                    {socialLinks.map((link, idx) => (
                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer"
                        style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--app-accent-soft)', color: 'var(--app-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <Icon name={platformInfo(link.platform).icon} size={15} />
                      </a>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    width: '65%', margin: '18px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    padding: '12px', borderRadius: '14px', border: 'none',
                    background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer',
                    boxShadow: 'var(--shadow-accent)',
                  }}
                >
                  <Icon name="edit" size={14} />
                  Edit Profile
                </button>
              </>
            ) : (
              <div style={{ marginTop: '10px', textAlign: 'left' }}>
                <label style={miniLabel}>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} style={compactInput} />
              </div>
            )}
          </div>
        </div>

        {/* ═══ EDIT FORM FIELDS ═══ */}
        {editMode && (
          <>
            <div style={cardStyle}>
              <div style={miniLabel}>Department</div>
              <div style={{ position: 'relative' }}>
                <input
                  value={department || deptSearch}
                  onChange={e => { setDeptSearch(e.target.value); setDepartment(''); setShowDept(true) }}
                  onFocus={() => { setShowDept(true); if (department) setDeptSearch('') }}
                  onBlur={() => setTimeout(() => setShowDept(false), 150)}
                  placeholder="Search department..."
                  style={compactInput}
                />
                {showDept && filteredDepts.length > 0 && (
                  <div style={dropdownStyle}>
                    {filteredDepts.map(d => (
                      <div key={d} onMouseDown={() => { setDepartment(d); setDeptSearch(''); setShowDept(false) }} style={dropdownItem}>
                        {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={miniLabel}>Year of Study</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(y => (
                  <button key={y} type="button" onClick={() => setYear(y)} style={{ flex: 1, padding: '9px 0', borderRadius: '10px', border: year === y ? 'none' : '1px solid var(--app-border-soft)', background: year === y ? 'var(--app-accent)' : 'var(--page-bg)', color: year === y ? '#fff' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                    {y}
                  </button>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={miniLabel}>Bio</div>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder="What are you looking for?" style={{ ...compactInput, resize: 'none', fontFamily: 'inherit' }} />
            </div>

            <div style={cardStyle}>
              <div style={miniLabel}>Skills</div>
              {skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {skills.map(skill => (
                    <div key={skill.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--app-accent-soft)', border: '1px solid var(--app-border-soft)', borderRadius: '999px', padding: '5px 9px' }}>
                      <span style={{ color: 'var(--app-accent)', fontSize: '12px', fontWeight: 700 }}>{skill.skill_name}</span>
                      <span onClick={() => removeSkill(skill.id)} style={{ color: 'var(--danger)', cursor: 'pointer', fontWeight: 800, fontSize: '13px' }}>×</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <input
                  value={skillSearch}
                  onChange={e => { setSkillSearch(e.target.value); setShowSkillList(true) }}
                  onFocus={() => setShowSkillList(true)}
                  onBlur={() => setTimeout(() => setShowSkillList(false), 150)}
                  onKeyDown={e => { if (e.key === 'Enter' && skillSearch.trim()) addSkill(skillSearch) }}
                  placeholder="Type to search or add a skill..."
                  style={compactInput}
                />
                {showSkillList && skillSearch.length > 0 && (
                  <div style={dropdownStyle}>
                    {!allPlatformSkills.find(s => s.toLowerCase() === skillSearch.toLowerCase()) && (
                      <div onMouseDown={() => addSkill(skillSearch)} style={{ ...dropdownItem, color: 'var(--app-accent)', fontWeight: 700 }}>
                        + Add "{skillSearch}" as a new skill
                      </div>
                    )}
                    {filteredSkills.length === 0 && skillSearch.length > 0 && (
                      <div style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        No matches yet — be the first to add this skill!
                      </div>
                    )}
                    {filteredSkills.slice(0, 8).map(s => (
                      <div key={s} onMouseDown={() => addSkill(s)} style={dropdownItem}>{s}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={miniLabel}>WhatsApp Number</div>
              <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value.replace(/[^0-9+ ]/g, ''))} placeholder="e.g. +263 71 234 5678" style={compactInput} />
              {whatsappDigits.length >= 6 && (
                <a href={whatsappUrlFor(whatsappDigits)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '11.5px', fontWeight: 700, color: '#25D366', textDecoration: 'none' }}>
                  <Icon name="whatsapp" size={12} color="#25D366" />
                  Preview chat link
                </a>
              )}
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: socialLinks.length || showAddLink ? '8px' : 0 }}>
                <div style={miniLabel}>Social Links</div>
                <div onClick={() => setShowAddLink(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--app-accent)', fontWeight: 700, fontSize: '11.5px', cursor: 'pointer' }}>
                  <Icon name={showAddLink ? 'x' : 'plus'} size={11} />
                  {showAddLink ? 'Cancel' : 'Add'}
                </div>
              </div>
              {showAddLink && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <select value={newLinkPlatform} onChange={e => setNewLinkPlatform(e.target.value)} style={{ ...compactInput, width: 'auto' }}>
                    {SOCIAL_PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="URL" style={{ ...compactInput, flex: 1 }} />
                  <button onClick={addSocialLink} style={{ padding: '0 14px', borderRadius: '10px', border: 'none', background: 'var(--app-accent)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Add</button>
                </div>
              )}
              {socialLinks.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {socialLinks.map((link, idx) => (
                    <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--app-accent-soft)', borderRadius: '999px', padding: '5px 9px' }}>
                      <Icon name={platformInfo(link.platform).icon} size={12} color="var(--app-accent)" />
                      <span onClick={() => removeSocialLink(idx)} style={{ color: 'var(--danger)', cursor: 'pointer', fontWeight: 800, fontSize: '13px' }}>×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ PREFERENCES ═══ */}
        <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '20px 4px 8px' }}>
          Preferences
        </div>
        <div style={{ background: 'var(--card-bg)', borderRadius: '18px', border: '1px solid var(--app-border)', padding: '4px 14px' }}>
          <SettingsRow icon="moon" label="Dark Mode" trailing={<Toggle checked={isDark} onChange={toggleTheme} />} />
          <SettingsRow icon="info" label="About PolyNet" onClick={() => setInfoPage('about')} />
          <SettingsRow icon="shield" label="Privacy Policy" onClick={() => setInfoPage('privacy')} isLast />
        </div>

        <button
          onClick={() => setConfirmModal('logout')}
          style={{
            width: '100%', padding: '13px', borderRadius: '14px',
            border: '1px solid var(--danger)', background: 'transparent',
            color: 'var(--danger)', fontWeight: 700, fontSize: '13.5px',
            cursor: 'pointer', marginTop: '14px',
          }}
        >
          Log Out
        </button>
      </div>

      {/* ═══ BOTTOM SAVE FLOATING ACTION BAR ═══ */}
      {editMode && (
        <div style={{
          position: 'fixed', bottom: '70px', left: 0, right: 0,
          padding: '10px 16px', background: 'var(--card-bg)',
          borderTop: '1px solid var(--app-border)', zIndex: 30,
        }}>
          {message && (
            <p style={{ fontSize: '12.5px', textAlign: 'center', fontWeight: 700, margin: '0 0 8px', color: message.startsWith('✓') ? '#16A34A' : '#EF4444' }}>
              {message}
            </p>
          )}
          <button
            onClick={requestSave}
            disabled={saving || uploading}
            style={{
              width: '100%', padding: '13px', borderRadius: '14px', border: 'none',
              background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '14px',
              cursor: 'pointer', boxShadow: 'var(--shadow-accent)',
            }}
          >
            {saving ? 'Saving...' : uploading ? 'Processing photo...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* ═══ CONFIRMATION MODALS ═══ */}
      {confirmModal === 'save' && (
        <ConfirmModal
          title="Save changes?"
          body="This will update your profile information for everyone on PolyNet to see."
          confirmLabel="Yes, Save"
          onConfirm={performSave}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {confirmModal === 'logout' && (
        <ConfirmModal
          title="Log out of PolyNet?"
          body="You'll need to sign in again to access your profile, feed and messages."
          confirmLabel="Log Out"
          danger
          onConfirm={() => supabase.auth.signOut()}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}

function SettingsRow({ icon, label, onClick, trailing, isLast }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: isLast ? 'none' : '1px solid var(--app-border)', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'var(--app-accent-soft)', color: 'var(--app-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={14} />
      </div>
      <div style={{ flex: 1, fontSize: '13.5px', fontWeight: 600, color: 'var(--text-strong)' }}>{label}</div>
      {trailing || <Icon name="chevronRight" size={15} color="var(--text-muted)" />}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{ width: '42px', height: '24px', borderRadius: '12px', background: checked ? 'var(--app-accent)' : 'var(--app-border-soft)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: checked ? '21px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

const cardStyle = { background: 'var(--card-bg)', borderRadius: '18px', border: '1px solid var(--app-border)', padding: '14px', marginTop: '10px' }

const miniLabel = {
  fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase',
  color: 'var(--text-muted)', marginBottom: '7px',
}

const compactInput = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: '1px solid var(--app-border-soft)', background: 'var(--page-bg)', color: 'var(--text-strong)',
  outline: 'none', boxSizing: 'border-box', fontSize: '13.5px',
}

const dropdownStyle = {
  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
  background: 'var(--card-bg)', border: '1px solid var(--app-border)', borderRadius: '12px',
  maxHeight: '180px', overflowY: 'auto', zIndex: 50, boxShadow: 'var(--shadow-card)',
}

const dropdownItem = {
  padding: '10px 12px', fontSize: '12.5px', color: 'var(--text-strong)',
  cursor: 'pointer', borderBottom: '1px solid var(--app-border)',
}

export default Profile