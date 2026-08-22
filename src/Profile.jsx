import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'
import { useTheme } from './ThemeContext'
import { getDisplayName } from './DisplayName'
import ReportsScreen from './ReportsScreen'

const DEPARTMENTS = [
  'Accountancy',
  'Administration',
  'Applied Biological Technology',
  'Applied Chemical Technology',
  'Architectural Technology',
  'Art and Design',
  'Auto Electrics',
  'Automotive Engineering',
  'Bakery Studies',
  'Baking Technology and Management',
  'Banking and Finance',
  'Beauty Therapy',
  'Brick and Block Laying',
  'Broadcast Journalism',
  'Carpentry and Joinery',
  'Cartography',
  'Chemical Engineering',
  'Chemical Technology',
  'Civil Engineering',
  'Computer Systems',
  'Construction Technology',
  'Culinary Arts',
  'Design for Print',
  'Diesel Plant Fitting',
  'Draughting and Design Technology',
  'Electric Communication Systems',
  'Electrical Power',
  'Fabrication Engineering',
  'Fine Art',
  'Food Science',
  'Further Education',
  'Hairdressing',
  'Health Information Management',
  'Health Service Management',
  'Horticulture',
  'Human Resources Management',
  'Industrial Clothing Design and Construction',
  'Information Technology',
  'Instrumentation & Control Systems',
  'Library and Information Science',
  'Machine Shop',
  'Marketing Management',
  'Mass Communication',
  'Mechanical Engineering',
  'Metallurgical Assaying',
  'Microwave & Satellite Systems',
  'Mobile & Satellite Systems',
  'Motor Cycle',
  'Motor Mechanics',
  'Motor Vehicle Body Repairs',
  'Office Management',
  'Painting & Decoration',
  'Payroll Management',
  'Pensions and Investment Management',
  'Pharmaceutical Technology',
  'Plant Engineering',
  'Plastics & Rubber Technology',
  'Plastics Technology',
  'Plumbing & Drain Laying',
  'Precision',
  'Print Journalism',
  'Printing and Photography',
  'Production Engineering',
  'Professional Cookery',
  'Purchasing and Supply Management',
  'Quantity Surveying',
  'Records and Information Management',
  'Refrigeration and Air Conditioning',
  'Science Technology/Lab Technology',
  'Surveying and Geomatics',
  'Tourism and Hospitality',
  'Transport Management',
  'Trainer\'s Certificate',
  'Urban and Regional Planning',
  'Valuation and Estate Management',
  'Vehicle Body Building',
  'Water Engineering',
]

const VERIFIED_BLUE = '#1D9BF0'

const WHATSAPP_NUMBER = '263711881821'
const CONTACT_EMAIL = 'polynetzim@gmail.com'
const FOUNDER_EMAIL = 'polynetzim@gmail.com'

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
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(37,211,102,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="whatsapp" size={19} color="#25D366" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-strong)' }}>WhatsApp</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>071 188 1821</div>
          </div>
        </a>

        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('PolyNet Support')}`}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 12px', textDecoration: 'none', borderRadius: '12px' }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="mail" size={17} color="var(--app-accent)" />
          </div>
          <div style={{ textAlign: 'left' }}>
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
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [skills, setSkills] = useState([])
  const [skillSearch, setSkillSearch] = useState('')
  const [showSkillList, setShowSkillList] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [infoPage, setInfoPage] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [viewingAvatar, setViewingAvatar] = useState(false)
  const [contactSheetOpen, setContactSheetOpen] = useState(false)
  const [showReports, setShowReports] = useState(false)

  const [isAdmin, setIsAdmin] = useState(false)
  const [adminTitle, setAdminTitle] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const [{ data }, { data: skillData }, { data: platformSkills }] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, department, year_of_study, avatar_url, is_admin, admin_title')
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
      setAvatarUrl(data.avatar_url || null)
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

    const updatePayload = {
      department,
      avatar_url: newAvatarUrl,
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

  function cancelEdit() {
    setEditMode(false)
    setAvatarFile(null)
    setAvatarPreview(null)
    setMessage('')
    fetchProfile()
  }

  function handleAvatarTap() {
    if (!editMode) setViewingAvatar(true)
  }

  const filteredDepts = DEPARTMENTS.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase()))
  const filteredSkills = allPlatformSkills.filter(s =>
    s.toLowerCase().includes(skillSearch.toLowerCase()) &&
    !skills.find(ms => ms.skill_name.toLowerCase() === s.toLowerCase())
  )
  const displayName = getDisplayName(
    { full_name: fullName, is_admin: isAdmin, admin_title: adminTitle },
    isAdmin ? 'PolyNet Admin' : 'Your Name'
  )
  const initials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('') || 'S'
  const isFounder = session.user.email === FOUNDER_EMAIL

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ padding: '18px 20px 12px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 20 }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-strong)' }}>My Profile</h1>
        </div>
        <ProfileLoadingSkeleton />
      </div>
    )
  }

  if (showReports) {
    return <ReportsScreen onBack={() => setShowReports(false)} />
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
        <p>This Privacy Policy explains what information PolyNet collects, how it's used, and the choices you have. PolyNet is built for students at Harare Polytechnic, and it's designed to collect only what's needed to make the network useful.</p>

        <p style={{ marginTop: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>Information we collect</p>
        <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
          <li style={{ marginBottom: '6px' }}><strong>Account info</strong> — your name, department, year of study, and the email you sign up with</li>
          <li style={{ marginBottom: '6px' }}><strong>Profile content</strong> — your avatar, bio, skills, and anything else you choose to add to your profile</li>
          <li style={{ marginBottom: '6px' }}><strong>Activity you create</strong> — feed posts, comments, likes, PolyMart listings, and messages you send</li>
          <li><strong>Basic usage data</strong> — things like when you signed up and when you were last active, used to keep the app working properly</li>
        </ul>
        <p style={{ marginTop: '10px' }}>We don't ask for or store payment details, national ID numbers, or any information beyond what's needed to run your profile and the features above.</p>

        <p style={{ marginTop: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>How we use it</p>
        <p style={{ marginTop: '8px' }}>Your information is used to run the core features of PolyNet: showing your profile to other students, making you findable through Skills Search, publishing what you post to the Feed and PolyMart, and delivering your messages in Chats. We don't use your data for advertising, and we don't sell it to third parties.</p>

        <p style={{ marginTop: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>PolyMart &amp; payments</p>
        <p style={{ marginTop: '8px' }}>PolyMart is a listings board for students to advertise items and services to each other — <strong>PolyNet does not process payments or handle any part of a transaction.</strong> If you buy or sell through PolyMart, you and the other student arrange payment and exchange directly between yourselves, outside the app. PolyNet only stores the listing details (title, price, description, photos, and category) that you choose to post.</p>

        <p style={{ marginTop: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>Messaging</p>
        <p style={{ marginTop: '8px' }}>Chats messages are stored so your conversations stay available when you come back to the app, and so the person you're messaging can read them. Only the people in a conversation can see its messages.</p>

        <p style={{ marginTop: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>Who can see what</p>
        <p style={{ marginTop: '8px' }}>Your profile, skills, feed posts, and PolyMart listings are visible to other signed-in students on PolyNet, since the whole point of the app is to make your skills discoverable. Direct messages are private to the conversation they're sent in. News Board posts are published by school authorities and visible to everyone on the platform.</p>

        <p style={{ marginTop: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>Reporting &amp; moderation</p>
        <p style={{ marginTop: '8px' }}>If you report a post, listing, or user, the report (including the content reported and your account) is shared with PolyNet's moderators so it can be reviewed. You can also block another user, which stops them from messaging you.</p>

        <p style={{ marginTop: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>Where your data lives</p>
        <p style={{ marginTop: '8px' }}>PolyNet is built on Supabase for its database, authentication, and file storage, and hosted on Vercel. Reasonable technical safeguards (including access controls on the database) are in place to keep your data secure, but no online service can guarantee absolute security.</p>

        <p style={{ marginTop: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>Your control over your data</p>
        <p style={{ marginTop: '8px' }}>You can edit or remove your profile info, skills, posts, and listings at any time from within the app. You can delete individual chats, and you can reach out through Contact PolyNet in Settings to request that your account and associated data be deleted entirely.</p>

        <p style={{ marginTop: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>Changes to this policy</p>
        <p style={{ marginTop: '8px' }}>As PolyNet grows, this policy may be updated to reflect new features. If changes are significant, we'll do our best to make that clear within the app.</p>

        <p style={{ marginTop: '18px', color: 'var(--text-muted)' }}>Questions about your data? Reach out via Contact PolyNet in Settings.</p>
      </InfoPage>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: '24px' }}>

      {/* Header — Save lives here, top-right, next to Cancel while editing.
          justify-content: space-between keeps the title pinned left and
          this action group flush against the right edge. */}
      <div style={{
        padding: '16px 20px',
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
          <AnimatePresence mode="wait">
            {editMode ? (
              <motion.div
                key="edit-actions"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
              >
                <span
                  onClick={cancelEdit}
                  style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </span>
                <motion.button
                  onClick={requestSave}
                  disabled={saving || uploading}
                  whileTap={{ scale: 0.94 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 16px', borderRadius: '999px', border: 'none',
                    background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '13px',
                    cursor: saving || uploading ? 'default' : 'pointer',
                    opacity: saving || uploading ? 0.75 : 1,
                    boxShadow: 'var(--shadow-accent)',
                  }}
                >
                  {saving ? (
                    <>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#fff', animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                        ))}
                      </div>
                      Saving
                    </>
                  ) : uploading ? (
                    'Processing...'
                  ) : (
                    <>
                      <Icon name="check" size={13} />
                      Save
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              onBack && (
                <motion.button
                  key="back-button"
                  onClick={onBack}
                  aria-label="Back"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    cursor: 'pointer',
                    padding: '7px 16px',
                    borderRadius: '999px',
                    border: '1px solid var(--app-border-soft)',
                    background: 'var(--page-bg)',
                    color: 'var(--text-strong)',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  Back
                </motion.button>
              )
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Message banner — replaces the old bottom-bar toast. Slides down
          from under the header for both validation errors and success. */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{
              margin: 0, padding: '10px 20px', fontSize: '12.5px', textAlign: 'center', fontWeight: 700,
              background: message.startsWith('✓') ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
              color: message.startsWith('✓') ? '#16A34A' : '#EF4444',
            }}>
              {message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding: '16px' }}>

        <div style={{
          borderRadius: '22px', overflow: 'hidden', border: '1px solid var(--app-border)',
          boxShadow: '0 10px 32px rgba(124,58,237,0.28)',
          background: 'var(--card-bg)',
        }}>
          <div style={{ padding: '28px 18px 20px', textAlign: 'center' }}>
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
              {editMode && (
                <div style={{ position: 'absolute', right: '0', bottom: '2px', width: '26px', height: '26px', borderRadius: '9px', background: 'var(--app-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--card-bg)' }}>
                  <Icon name="camera" size={13} />
                </div>
              )}
              {editMode && <input type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />}
            </label>

            {!editMode ? (
              <>
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
              !isAdmin && (
                <div style={{ marginTop: '10px', textAlign: 'left' }}>
                  <label style={miniLabel}>Full Name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} style={compactInput} />
                </div>
              )
            )}
          </div>
        </div>

        {editMode && (
          <>
            {isAdmin && (
              <div style={cardStyle}>
                <div style={miniLabel}>Title</div>
                <input
                  value={adminTitle}
                  onChange={e => setAdminTitle(e.target.value)}
                  placeholder="e.g. HOD Electrical Engineering, Principal, SRC President"
                  style={compactInput}
                />
              </div>
            )}

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

            {!isAdmin && (
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
          </>
        )}

        {!editMode && (
          <>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '20px 4px 8px' }}>
              Preferences
            </div>
            <div style={{ background: 'var(--card-bg)', borderRadius: '18px', border: '1px solid var(--app-border)', padding: '4px 14px' }}>
              <SettingsRow icon="moon" label="Dark Mode" trailing={<Toggle checked={isDark} onChange={toggleTheme} />} />
              <SettingsRow icon="info" label="About PolyNet" onClick={() => setInfoPage('about')} />
              <SettingsRow icon="shield" label="Privacy Policy" onClick={() => setInfoPage('privacy')} />
              <SettingsRow icon="phone" label="Contact PolyNet" onClick={() => setContactSheetOpen(true)} isLast={!isFounder} />
              {isFounder && (
                <SettingsRow icon="flag" label="Reports" onClick={() => setShowReports(true)} isLast />
              )}
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
          </>
        )}
      </div>

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

      <AnimatePresence>
        {contactSheetOpen && (
          <ContactSheet onClose={() => setContactSheetOpen(false)} />
        )}
      </AnimatePresence>

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

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
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

// Shimmering skeleton for the initial profile load — mirrors the real
// layout (avatar card + preferences list) so nothing visually "jumps"
// once the real data arrives, and replaces the old plain three-dot
// spinner that used to show here.
import { SkeletonShimmerStyle, shimmerStyle as feedShimmer } from './Skeleton'

const profileShimmerBg = { ...feedShimmer }

function ProfileLoadingSkeleton() {
  return (
    <div style={{ padding: '16px' }}>
      <SkeletonShimmerStyle />

      <div style={{
        borderRadius: '22px', border: '1px solid var(--app-border)', background: 'var(--card-bg)',
        padding: '28px 18px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ width: '86px', height: '86px', borderRadius: '50%', ...profileShimmerBg }} />
        <div style={{ width: '140px', height: '16px', borderRadius: '6px', marginTop: '14px', ...profileShimmerBg }} />
        <div style={{ width: '100px', height: '12px', borderRadius: '6px', marginTop: '8px', ...profileShimmerBg }} />
        <div style={{ width: '110px', height: '32px', borderRadius: '999px', marginTop: '16px', ...profileShimmerBg }} />
      </div>

      <div style={{ width: '90px', height: '11px', borderRadius: '5px', margin: '20px 4px 8px', ...profileShimmerBg }} />
      <div style={{ background: 'var(--card-bg)', borderRadius: '18px', border: '1px solid var(--app-border)', padding: '4px 14px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: i === 3 ? 'none' : '1px solid var(--app-border)' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0, ...profileShimmerBg }} />
            <div style={{ flex: 1, height: '13px', borderRadius: '6px', ...profileShimmerBg }} />
          </div>
        ))}
      </div>
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
