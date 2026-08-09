import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'
import { useTheme } from './ThemeContext'
import { ProfileSkeleton } from './Skeleton'
import { getDisplayName } from './displayName'

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

const VERIFIED_BLUE = '#1D9BF0'
const HEADER_GRADIENT = 'linear-gradient(120deg, #7C3AED 0%, #A855F7 45%, #C084FC 100%)'

// International-format WhatsApp number (0787525495 → 263 787525495, no
// leading 0) — used with the whatsapp:// scheme so this opens the actual
// installed app rather than the wa.me website.
const WHATSAPP_NUMBER = '263787525495'
const CONTACT_EMAIL = 'clydechiruka4@gmail.com'

function platformInfo(id) {
  return SOCIAL_PLATFORMS.find(p => p.id === id) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1]
}

function whatsappUrlFor(digits) {
  return `https://wa.me/${digits}`
}

function whatsappAppUrl(text) {
  return `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(text)}`
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

function VerifiedBadge({ size = 14 }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name="badgeCheck" size={size} color={VERIFIED_BLUE} fill={VERIFIED_BLUE} style={{ position: 'absolute', top: 0, left: 0 }} />
      <Icon name="check" size={size * 0.46} color="#fff" strokeWidth={3.5} style={{ position: 'relative' }} />
    </span>
  )
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

// Bottom sheet offering both contact routes — WhatsApp opens the real app
// via the whatsapp:// scheme (not the web version), Email opens the
// person's mail app. Two separate options rather than an automatic
// fallback, since not everyone has WhatsApp installed.
function ContactSheet({ onClose }) {
  const message = 'Hi, I have a question about PolyNet.'
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--card-bg)', borderRadius: '24px 24px 0 0',
          padding: '10px 12px 28px',
        }}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--app-border-soft)', margin: '6px auto 14px' }} />
        <h3 style={{ margin: '10px 12px 14px', fontSize: '14.5px', fontWeight: 800, color: 'var(--text-strong)' }}>Contact PolyNet</h3>

        <a
          href={whatsappAppUrl(message)}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 12px', textDecoration: 'none', borderRadius: '12px' }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(37,211,102,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="whatsapp" size={19} color="#25D366" />
          </div>
          <div>
            <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-strong)' }}>WhatsApp</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>071 188 1821
            </div>
          </div>
        </a>

        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('PolyNet Support')}`}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 12px', textDecoration: 'none', borderRadius: '12px' }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="send" size={17} color="var(--app-accent)" />
          </div>
          <div>
            <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-strong)' }}>Email</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>{CONTACT_EMAIL}</div>
          </div>
        </a>
      </motion.div>
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
  const [viewingAvatar, setViewingAvatar] = useState(false)
  const [contactSheetOpen, setContactSheetOpen] = useState(false)

  // Admin-specific fields — profiles shared between students and admins,
  // so which fields apply depends on isAdmin.
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminTitle, setAdminTitle] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const [{ data }, { data: skillData }, { data: platformSkills }] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, department, year_of_study, bio, avatar_url, whatsapp_number, social_links, is_admin, admin_title')
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
      setIsAdmin(!!data.is_admin)
      setAdminTitle(data.admin_title || '')
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

    // Admins and students save different identity/secondary fields —
    // admins never touch full_name (their title stands in as their name
    // everywhere), students never touch admin_title.
    const updatePayload = {
      department,
      bio,
      avatar_url: newAvatarUrl,
      whatsapp_number: whatsapp.trim() || null,
      social_links: socialLinks,
    }
    if (isAdmin) {
      updatePayload.admin_title = adminTitle.trim()
    } else {
      updatePayload.full_name = fullName.trim()
      updatePayload.year_of_study = year
    }

    const { data: updateData, error } = await supabase
      .from('profiles')
      .update(updatePayload)
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
    if (!isAdmin && !fullName.trim()) return setMessage('Full name is required')
    if (isAdmin && !adminTitle.trim()) return setMessage('Title is required')
    setConfirmModal('save')
  }

  function handleAvatarTap() {
    if (!editMode) setViewingAvatar(true)
  }

  const filteredDepts = DEPARTMENTS.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase()))
  const filteredSkills = allPlatformSkills.filter(s =>
    s.toLowerCase().includes(skillSearch.toLowerCase()) &&
    !skills.find(ms => ms.skill_name.toLowerCase() === s.toLowerCase())
  )
  // The name shown everywhere on this screen — an admin's title stands in
  // for their name, since they never set a full_name during onboarding.
  const displayName = getDisplayName(
    { full_name: fullName, is_admin: isAdmin, admin_title: adminTitle },
    isAdmin ? 'PolyNet Admin' : 'Your Name'
  )
  const initials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('') || 'S'
  const whatsappDigits = whatsapp.replace(/[^0-9]/g, '')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ padding: '18px 20px 12px', background: HEADER_GRADIENT, position: 'sticky', top: 0, zIndex: 20 }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>My Profile</h1>
        </div>
        <ProfileSkeleton />
      </div>
    )
  }

  if (infoPage === 'about') {
    return (
      <InfoPage title="About PolyNet" onBack={() => setInfoPage(null)}>
        <p><strong>PolyNet</strong> connects every student's talent to the people who need it — starting at Harare Polytechnic.</p>

        <p style={{ marginTop: '14px' }}>Talented students are often invisible to each other. Someone who can code, design, weld, or tutor has no easy way to be found by classmates who need exactly that skill — so collaborations, friendships, and small businesses that should happen, simply don't.</p>

        <p style={{ marginTop: '14px' }}>PolyNet gives every student a profile built around their real skills and projects. From there, students can search for talent, post ideas to team up on, trade services in a peer marketplace, and stay in the loop through a shared campus feed.</p>

        <p style={{ marginTop: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>What you can do here</p>
        <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
          <li style={{ marginBottom: '6px' }}><strong>News Board</strong> — official updates from school authorities</li>
          <li style={{ marginBottom: '6px' }}><strong>Student Profiles</strong> — your campus identity, built on real skills</li>
          <li style={{ marginBottom: '6px' }}><strong>Skills Search</strong> — find any classmate by what they can do</li>
          <li style={{ marginBottom: '6px' }}><strong>PolyMart</strong> — a campus marketplace to trade skills and services</li>
          <li><strong>Community Feed</strong> — shoutouts, events, and opportunities in one place</li>
        </ul>

        <p style={{ marginTop: '18px' }}>PolyNet is, and always will be, free for students to join and use. The goal is to make every student visible, connectable, and valuable — first to each other, and eventually to employers and institutions across Zimbabwe.</p>

        <p style={{ marginTop: '18px', color: 'var(--text-muted)' }}>Founded by Clyde Takunda Chiruka.</p>

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

      {/* ═══ STICKY HEADER — purple gradient now runs all the way through
          the header itself, so the "My Profile" label sits inside the
          gradient rather than on a plain bar above it. Back is now a real
          labeled pill button instead of a bare chevron icon. ═══ */}
      <div style={{
        padding: '16px 20px 14px',
        background: HEADER_GRADIENT,
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>
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
              style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginRight: '4px' }}
            >
              Cancel
            </span>
          )}

          {!editMode && onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              style={{
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '8px 16px',
                borderRadius: '999px',
                border: 'none',
                background: 'rgba(255,255,255,0.18)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              <Icon name="arrowLeft" size={14} color="#fff" />
              Back
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* ═══ HERO — gradient smoothly fades from accent color into the
            card background, no hard color division. ═══ */}
        <div style={{ borderRadius: '22px', overflow: 'hidden', border: '1px solid var(--app-border)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{
            height: '96px',
            background: 'linear-gradient(180deg, var(--app-accent) 0%, var(--card-bg) 100%)',
          }} />
          <div style={{ background: 'var(--card-bg)', padding: '0 18px 20px', textAlign: 'center', marginTop: '-48px' }}>
            <label style={{ position: 'relative', cursor: 'pointer', display: 'inline-block' }}>
              <motion.div
                onClick={handleAvatarTap}
                whileTap={{ scale: 0.96 }}
                style={{
                  width: '86px', height: '86px', borderRadius: '50%', overflow: 'hidden',
                  background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '4px solid var(--card-bg)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                }}
              >
                {(avatarPreview || avatarUrl) ? (
                  <motion.img
                    layoutId="profile-avatar-image"
                    src={avatarPreview || avatarUrl}
                    alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <span style={{ color: 'var(--app-accent)', fontSize: '26px', fontWeight: 700 }}>{initials}</span>
                )}
              </motion.div>
              {/* Camera badge only appears while actively editing */}
              {editMode && (
                <div style={{ position: 'absolute', right: '0', bottom: '2px', width: '26px', height: '26px', borderRadius: '9px', background: 'var(--app-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--card-bg)' }}>
                  <Icon name="camera" size={13} />
                </div>
              )}
              {editMode && <input type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />}
            </label>

            {!editMode ? (
              <>
                {/* Minimal read-only display: name (an admin's title stands
                    in as their name here), then department. */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>
                    {displayName}
                  </div>
                  {isAdmin && <VerifiedBadge size={15} />}
                </div>

                {department && (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {department}
                  </div>
                )}

                {bio && (
                  <p style={{ margin: '10px 0 0', fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.55 }}>{bio}</p>
                )}

                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    margin: '18px auto 0', padding: '9px 18px', borderRadius: '999px', border: 'none',
                    background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    boxShadow: 'var(--shadow-accent)',
                  }}
                >
                  <Icon name="edit" size={13} />
                  Edit Profile
                </button>
              </>
            ) : (
              // Students edit their full name here; admins skip this
              // entirely since their Title field (below) is their name.
              !isAdmin && (
                <div style={{ marginTop: '10px', textAlign: 'left' }}>
                  <label style={miniLabel}>Full Name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} style={compactInput} />
                </div>
              )
            )}
          </div>
        </div>

        {/* ═══ EDIT FORM FIELDS — unchanged, still available while editing ═══ */}
        {editMode && (
          <>
            <div style={cardStyle}>
              <div style={miniLabel}>Department{isAdmin ? ' you represent' : ''}</div>
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

            {isAdmin ? (
              <div style={cardStyle}>
                <div style={miniLabel}>Title</div>
                <input
                  value={adminTitle}
                  onChange={e => setAdminTitle(e.target.value)}
                  placeholder="e.g. HOD Electrical Engineering, Principal, SRC President"
                  style={compactInput}
                />
              </div>
            ) : (
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
            )}

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
          <SettingsRow icon="shield" label="Privacy Policy" onClick={() => setInfoPage('privacy')} />
          <SettingsRow icon="phone" label="Contact PolyNet" onClick={() => setContactSheetOpen(true)} isLast />
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

      {/* ═══ FULLSCREEN AVATAR VIEWER — tap the profile picture to maximize ═══ */}
      <AnimatePresence>
        {viewingAvatar && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setViewingAvatar(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(10,10,14,0.97)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {avatarUrl ? (
              <motion.img
                layoutId="profile-avatar-image"
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                src={avatarUrl}
                alt={displayName}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '88%', maxHeight: '78vh', borderRadius: '24px', objectFit: 'contain' }}
              />
            ) : (
              <div style={{
                width: '180px', height: '180px', borderRadius: '50%',
                background: 'var(--app-accent-soft)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '56px', fontWeight: 700, color: 'var(--app-accent)' }}>{initials}</span>
              </div>
            )}

            <div
              onClick={() => setViewingAvatar(false)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                width: '38px', height: '38px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer',
              }}
            >
              <Icon name="x" size={19} color="#fff" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CONTACT SHEET ═══ */}
      <AnimatePresence>
        {contactSheetOpen && (
          <ContactSheet onClose={() => setContactSheetOpen(false)} />
        )}
      </AnimatePresence>

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
