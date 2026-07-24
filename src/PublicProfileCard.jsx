import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'

const SOCIAL_ICON_MAP = {
  instagram: 'instagram',
  twitter: 'twitter',
  tiktok: 'tiktok',
  facebook: 'facebook',
  linkedin: 'linkedin',
  youtube: 'youtube',
  snapchat: 'snapchat',
  github: 'github',
  website: 'globe',
}

const BRAND_PURPLE = '#7C3AED'

function iconForPlatform(id) {
  return SOCIAL_ICON_MAP[id] || 'globe'
}

function whatsappUrlFor(digits) {
  return `https://wa.me/${digits}`
}

function PublicProfileCard({ userId, session, onClose, onMessage, hideMessageButton }) {
  const [profile, setProfile] = useState(null)
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: profileData, error: profileErr }, { data: skillData, error: skillErr }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, department, year_of_study, bio, avatar_url, whatsapp_number, social_links')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('skills')
          .select('id, skill_name')
          .eq('user_id', userId),
      ])
      if (cancelled) return
      if (profileErr) console.error('Error loading profile:', profileErr.message)
      if (skillErr) console.error('Error loading skills:', skillErr.message)
      setProfile(profileData)
      setSkills(skillData || [])
      setLoading(false)
    }
    if (userId) load()
    return () => { cancelled = true }
  }, [userId])

  if (!userId) return null

  const isOwnProfile = userId === session.user.id
  const displayName = profile?.full_name || 'PolyNet Student'
  const initials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('')
  const whatsappDigits = (profile?.whatsapp_number || '').replace(/[^0-9]/g, '')
  const socialLinks = profile?.social_links || []

  // Fires immediately on tap regardless of load state or event bubbling —
  // no dependency on `profile` being resolved.
  function handleMessage(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!onMessage) {
      console.warn('PublicProfileCard: no onMessage handler was passed in')
      return
    }
    onMessage({ id: userId, name: displayName, avatar: profile?.avatar_url || null })
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        key="profile-card-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(10,10,14,0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '30px 24px',
        }}
      >
        <motion.div
          key="profile-card-panel"
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.7, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 30 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          style={{
            position: 'relative',
            width: '100%', maxWidth: '340px', maxHeight: '82vh', overflowY: 'auto',
            background: 'var(--card-bg)', borderRadius: '28px',
            boxShadow: '0 24px 70px rgba(0,0,0,0.4)',
          }}
        >
          <div
            onClick={onClose}
            style={{
              position: 'absolute', top: '14px', right: '14px', zIndex: 5,
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(124,58,237,0.12)', color: BRAND_PURPLE,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <Icon name="x" size={16} />
          </div>

          {loading ? (
            <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: BRAND_PURPLE, animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <style>{`@keyframes dotPulse {0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
            </div>
          ) : (
            <div style={{ padding: '36px 24px 26px', textAlign: 'center' }}>
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.05 }}
                style={{
                  width: '104px', height: '104px', borderRadius: '50%', overflow: 'hidden',
                  background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto', boxShadow: '0 8px 24px rgba(124,58,237,0.25)',
                  border: '4px solid var(--card-bg)',
                }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: BRAND_PURPLE, fontSize: '32px', fontWeight: 700 }}>{initials}</span>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
              >
                <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-strong)', marginTop: '14px' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {profile?.department || 'No department set'}{profile?.year_of_study ? ` · Year ${profile.year_of_study}` : ''}
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '5px 11px', borderRadius: '999px', background: 'rgba(124,58,237,0.12)', color: BRAND_PURPLE, fontSize: '11px', fontWeight: 700 }}>
                  <Icon name="check" size={10} />
                  Verified student
                </div>

                {profile?.bio && (
                  <p style={{ margin: '14px 0 0', fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.6 }}>{profile.bio}</p>
                )}

                {skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '16px' }}>
                    {skills.map(skill => (
                      <div key={skill.id} style={{ background: 'var(--page-bg)', border: '1px solid var(--app-border-soft)', borderRadius: '999px', padding: '5px 11px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-strong)' }}>
                        {skill.skill_name}
                      </div>
                    ))}
                  </div>
                )}

                {socialLinks.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
                    {socialLinks.map((link, idx) => (
                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer"
                        style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(124,58,237,0.12)', color: BRAND_PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <Icon name={iconForPlatform(link.platform)} size={15} />
                      </a>
                    ))}
                  </div>
                )}

                {whatsappDigits.length >= 6 && (
                  <a href={whatsappUrlFor(whatsappDigits)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '14px', fontSize: '12px', fontWeight: 700, color: '#25D366', textDecoration: 'none' }}>
                    <Icon name="whatsapp" size={13} color="#25D366" />
                    WhatsApp
                  </a>
                )}

                {!isOwnProfile && !hideMessageButton && (
                  <button
                    type="button"
                    onClick={handleMessage}
                    style={{
                      width: '100%', marginTop: '22px', padding: '13px', borderRadius: '14px',
                      border: 'none', background: BRAND_PURPLE, color: '#fff',
                      fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(124,58,237,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                      outline: 'none',
                    }}
                  >
                    <Icon name="send" size={14} />
                    Message
                  </button>
                )}
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default PublicProfileCard