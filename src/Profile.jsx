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
  const { isDark, toggleTheme } = useTheme()
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
  const [whatsapp, setWhatsapp] = useState('')
  const [socialLinks, setSocialLinks] = useState([])
  const [newLinkPlatform, setNewLinkPlatform] = useState('instagram')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [showAddLink, setShowAddLink] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [notificationsOn, setNotificationsOn] = useState(true)
  const [privateMode, setPrivateMode] = useState(false)
  const [showDepartment, setShowDepartment] = useState(true)
  const [infoPage, setInfoPage] = useState(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const [{ data }, { data: skillData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, department, year_of_study, bio, avatar_url, whatsapp_number, social_links')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('skills')
        .select('id, skill_name')
        .eq('user_id', session.user.id),
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

  function addSocialLink() {
    if (!newLinkUrl.trim()) return
    setSocialLinks(prev => [...prev, { platform: newLinkPlatform, url: newLinkUrl.trim() }])
    setNewLinkUrl('')
    setShowAddLink(false)
  }

  function removeSocialLink(idx) {
    setSocialLinks(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!fullName.trim()) return setMessage('Full name is required')
    setSaving(true)
    setMessage('')

    let newAvatarUrl = avatarUrl
    if (avatarFile) {
      const fileName = `${session.user.id}/${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { contentType: 'image/jpeg' })
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
        whatsapp_number: whatsapp.trim() || null,
        social_links: socialLinks,
      })
      .eq('id', session.user.id)

    if (error) {
      setMessage(error.message)
    } else {
      setAvatarUrl(newAvatarUrl)
      setAvatarFile(null)
      setAvatarPreview(null)
      setMessage('Changes saved')
      setTimeout(() => setMessage(''), 2200)
    }
    setSaving(false)
  }

  async function removeSkill(id) {
    await supabase.from('skills').delete().eq('id', id)
    setSkills(skills.filter(s => s.id !== id))
  }

  const filteredDepts = DEPARTMENTS.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase()))
  const initials = fullName.split(' ').map(n => n[0]).slice(0, 2).join('') || 'S'
  const whatsappDigits = whatsapp.replace(/[^0-9]/g, '')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: '24px' }}>
        <div style={{ padding: '18px 20px 12px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 20 }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-strong)' }}>My Profile</h1>
          <p style={{ marginTop: '2px', fontSize: '12px', color: 'var(--text-muted)' }}>Manage your account and presence</p>
        </div>
        <ProfileSkeleton />
      </div>
    )
  }

  if (infoPage === 'about') {
    return (
      <InfoPage title="About PolyNet" onBack={() => setInfoPage(null)}>
        <p>PolyNet is a campus community app built for students at Harare Polytechnic — a single place to catch campus news, share updates with the Feed, buy and sell with PolyMart, and stay connected with fellow students.</p>
        <p style={{ marginTop: '14px' }}>PolyNet is built by students, for students, and is not an official publication of the institution unless stated otherwise on individual posts.</p>
        <p style={{ marginTop: '14px', color: 'var(--text-muted)' }}>Version 1.0.0</p>
      </InfoPage>
    )
  }

  if (infoPage === 'privacy') {
    return (
      <InfoPage title="Privacy Policy" onBack={() => setInfoPage(null)}>
        <p><strong>What we collect:</strong> your name, department, year of study, bio, avatar, skills, WhatsApp number and social links (all optional except your name), plus the posts, listings and messages you choose to create.</p>
        <p style={{ marginTop: '14px' }}><strong>How it's used:</strong> to display your profile to other students, power the Feed, News and PolyMart, and connect buyers and sellers through in-app chat.</p>
        <p style={{ marginTop: '14px' }}><strong>Storage:</strong> your data is stored securely with Supabase. We don't sell your information to third parties.</p>
        <p style={{ marginTop: '14px' }}><strong>Your control:</strong> you can edit or remove your profile details, WhatsApp number and social links at any time from this Profile page.</p>
        <p style={{ marginTop: '14px', color: 'var(--text-muted)' }}>Questions? Reach out to the PolyNet team through the app.</p>
      </InfoPage>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: '24px' }}>
      <div style={{ padding: '18px 20px 12px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-strong)' }}>My Profile</h1>
            <p style={{ marginTop: '2px', fontSize: '12px', color: 'var(--text-muted)' }}>Manage your account and presence</p>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--app-accent)' }}>
            <Icon name="settings" size={18} />
          </div>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--app-border)', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{
                width: '82px', height: '82px', borderRadius: '50%', overflow: 'hidden',
                background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {(avatarPreview || avatarUrl) ? (
                  <img src={avatarPreview || avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'var(--app-accent)', fontSize: '24px', fontWeight: 700 }}>{initials}</span>
                )}
              </div>
              <div style={{ position: 'absolute', right: '-2px', bottom: '-2px', width: '28px', height: '28px', borderRadius: '9px', background: 'var(--app-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--card-bg)' }}>
                <Icon name="camera" size={14} />
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
            </label>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-strong)' }}>{skills.length}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>Skills</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-strong)' }}>{year || '--'}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>Year</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-strong)' }}>{socialLinks.length}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>Links</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'left' }}>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-strong)' }}>{fullName || 'Your Name'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{department || 'Choose your department'}</div>
            {bio && <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.5 }}>{bio}</p>}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '6px 10px', borderRadius: '999px', background: 'var(--app-accent-soft)', color: 'var(--app-accent)', fontSize: '12px', fontWeight: 700 }}>
              <Icon name="check" size={12} />
              Verified student profile
            </div>
          </div>

          {socialLinks.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
              {socialLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '36px', height: '36px', borderRadius: '11px', background: 'var(--app-accent-soft)',
                    color: 'var(--app-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                  title={platformInfo(link.platform).label}
                >
                  <Icon name={platformInfo(link.platform).icon} size={16} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--app-border)', padding: '16px 18px', marginTop: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.2px', color: 'var(--text-muted)', marginBottom: '10px' }}>PROFILE DETAILS</div>

          <label style={labelStyle}>Full Name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />

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
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--app-border)', borderRadius: '14px', maxHeight: '200px', overflowY: 'auto', zIndex: 50, boxShadow: 'var(--shadow-card)' }}>
                {filteredDepts.map(d => (
                  <div key={d} onMouseDown={() => { setDepartment(d); setDeptSearch(''); setShowDept(false) }} style={{ padding: '12px 14px', color: 'var(--text-strong)', cursor: 'pointer', borderBottom: '1px solid var(--app-border)' }}>
                    {d}
                  </div>
                ))}
              </div>
            )}
          </div>

          <label style={labelStyle}>Year of Study</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
            {[1, 2, 3, 4, 5].map(y => (
              <button key={y} type="button" onClick={() => setYear(y)} style={{ flex: 1, padding: '11px 0', borderRadius: '12px', border: year === y ? 'none' : '1px solid var(--app-border-soft)', background: year === y ? 'var(--app-accent)' : 'var(--card-bg)', color: year === y ? '#fff' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>
                {y}
              </button>
            ))}
          </div>

          <label style={labelStyle}>Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />

          <label style={labelStyle}>WhatsApp Number</label>
          <input
            type="tel"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value.replace(/[^0-9+ ]/g, ''))}
            placeholder="e.g. +263 71 234 5678"
            style={inputStyle}
          />
          {whatsappDigits.length >= 6 && (
            <a
              href={whatsappUrlFor(whatsappDigits)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12.5px', fontWeight: 700, color: '#25D366', textDecoration: 'none' }}
            >
              <Icon name="whatsapp" size={14} color="#25D366" />
              Preview: Chat on WhatsApp
            </a>
          )}

          <label style={labelStyle}>Skills</label>
          {skills.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No skills added yet</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
              {skills.map(skill => (
                <div key={skill.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--app-accent-soft)', border: '1px solid var(--app-border-soft)', borderRadius: '999px', padding: '6px 10px' }}>
                  <span style={{ color: 'var(--app-accent)', fontSize: '13px', fontWeight: 700 }}>{skill.skill_name}</span>
                  <span onClick={() => removeSkill(skill.id)} style={{ color: 'var(--danger)', cursor: 'pointer', fontWeight: 800 }}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--app-border)', padding: '16px 18px', marginTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.2px', color: 'var(--text-muted)' }}>SOCIAL LINKS</div>
            <div onClick={() => setShowAddLink(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--app-accent)', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}>
              <Icon name={showAddLink ? 'x' : 'plus'} size={13} />
              {showAddLink ? 'Cancel' : 'Add link'}
            </div>
          </div>

          {socialLinks.length === 0 && !showAddLink && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No social links added yet</p>
          )}

          {socialLinks.map((link, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: idx < socialLinks.length - 1 ? '1px solid var(--app-border)' : 'none' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--app-accent-soft)', color: 'var(--app-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={platformInfo(link.platform).icon} size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-strong)' }}>{platformInfo(link.platform).label}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.url}</div>
              </div>
              <span onClick={() => removeSocialLink(idx)} style={{ color: 'var(--danger)', cursor: 'pointer', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>×</span>
            </div>
          ))}

          {showAddLink && (
            <div style={{ marginTop: socialLinks.length > 0 ? '12px' : '0' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {SOCIAL_PLATFORMS.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setNewLinkPlatform(p.id)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '11px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: newLinkPlatform === p.id ? 'var(--app-accent)' : 'var(--app-accent-soft)',
                      color: newLinkPlatform === p.id ? '#fff' : 'var(--app-accent)',
                    }}
                    title={p.label}
                  >
                    <Icon name={p.icon} size={16} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={newLinkUrl}
                  onChange={e => setNewLinkUrl(e.target.value)}
                  placeholder={`Your ${platformInfo(newLinkPlatform).label} URL`}
                  style={{ ...inputStyle, marginTop: 0, marginBottom: 0, flex: 1 }}
                />
                <button onClick={addSocialLink} disabled={!newLinkUrl.trim()} style={{ padding: '0 16px', borderRadius: '14px', border: 'none', background: newLinkUrl.trim() ? 'var(--app-accent)' : 'var(--app-border-soft)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--app-border)', padding: '16px 18px', marginTop: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.2px', color: 'var(--text-muted)', marginBottom: '10px' }}>PREFERENCES</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--app-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon name={isDark ? 'moon' : 'sun'} size={16} color="var(--app-accent)" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>Dark Mode</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Switch between light and dark theme</div>
              </div>
            </div>
            <button onClick={toggleTheme} style={{ width: '42px', height: '24px', borderRadius: '999px', border: 'none', background: isDark ? 'var(--app-accent)' : 'var(--app-border-soft)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: isDark ? '21px' : '3px', transition: 'left 0.2s' }} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--app-border)' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>Notifications</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Stay updated on campus activity</div>
            </div>
            <button onClick={() => setNotificationsOn(v => !v)} style={{ width: '42px', height: '24px', borderRadius: '999px', border: 'none', background: notificationsOn ? 'var(--app-accent)' : 'var(--app-border-soft)', position: 'relative', cursor: 'pointer' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: notificationsOn ? '21px' : '3px', transition: 'left 0.2s' }} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--app-border)' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>Private mode</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Limit visibility to approved contacts</div>
            </div>
            <button onClick={() => setPrivateMode(v => !v)} style={{ width: '42px', height: '24px', borderRadius: '999px', border: 'none', background: privateMode ? 'var(--app-accent)' : 'var(--app-border-soft)', position: 'relative', cursor: 'pointer' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: privateMode ? '21px' : '3px', transition: 'left 0.2s' }} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>Show department</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Display your department on your profile</div>
            </div>
            <button onClick={() => setShowDepartment(v => !v)} style={{ width: '42px', height: '24px', borderRadius: '999px', border: 'none', background: showDepartment ? 'var(--app-accent)' : 'var(--app-border-soft)', position: 'relative', cursor: 'pointer' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: showDepartment ? '21px' : '3px', transition: 'left 0.2s' }} />
            </button>
          </div>
        </div>

        {message && <p style={{ marginTop: '14px', textAlign: 'center', fontSize: '13px', color: message.startsWith('Changes') ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{message}</p>}

        <button onClick={handleSave} disabled={saving || uploading} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: 'var(--app-accent)', color: '#fff', fontWeight: 700, marginTop: '16px', cursor: 'pointer' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontWeight: 700, marginTop: '10px', cursor: 'pointer' }}>
          Log Out
        </button>

        <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--app-border)', padding: '6px 8px', marginTop: '14px' }}>
          <div onClick={() => setInfoPage('about')} style={infoRowStyle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-strong)', fontWeight: 700, fontSize: '13.5px' }}>
              <Icon name="sparkles" size={16} color="var(--app-accent)" />
              About PolyNet
            </span>
            <Icon name="chevron-right" size={16} color="var(--text-muted)" />
          </div>
          <div onClick={() => setInfoPage('privacy')} style={{ ...infoRowStyle, borderBottom: 'none' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-strong)', fontWeight: 700, fontSize: '13.5px' }}>
              <Icon name="settings" size={16} color="var(--app-accent)" />
              Privacy Policy
            </span>
            <Icon name="chevron-right" size={16} color="var(--text-muted)" />
          </div>
        </div>
      </div>
    </div>
  )
}

function whatsappUrlFor(digits) {
  return `https://wa.me/${digits}`
}

function InfoPage({ title, onBack, children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: '24px' }}>
      <div style={{ padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-strong)', display: 'flex' }}>
          <Icon name="chevron-left" size={20} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-strong)' }}>{title}</span>
      </div>
      <div style={{ padding: '20px', textAlign: 'left', fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-body)' }}>
        {children}
      </div>
    </div>
  )
}

const infoRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 10px', borderBottom: '1px solid var(--app-border)', cursor: 'pointer' }

const labelStyle = { display: 'block', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', marginTop: '14px', fontWeight: 800 }
const inputStyle = { width: '100%', padding: '13px 14px', borderRadius: '14px', border: '1px solid var(--app-border)', background: 'var(--input-bg)', color: 'var(--text-strong)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }

export default Profile
