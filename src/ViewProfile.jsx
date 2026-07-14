import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Icon from './Icon'
import { ProfileSkeleton } from './Skeleton'

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

function ViewProfile({ userId, onBack }) {
  const [profile, setProfile] = useState(null)
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [userId])

  async function fetchProfile() {
    setLoading(true)
    const [{ data }, { data: skillData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, department, year_of_study, bio, avatar_url, whatsapp_number, social_links')
        .eq('id', userId)
        .single(),
      supabase
        .from('skills')
        .select('id, skill_name')
        .eq('user_id', userId),
    ])
    setProfile(data)
    setSkills(skillData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: '24px' }}>
        <div style={{ padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 20 }}>
          <div onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-strong)', display: 'flex' }}>
            <Icon name="chevron-left" size={20} />
          </div>
        </div>
        <ProfileSkeleton />
      </div>
    )
  }

  const name = profile?.full_name || 'PolyNet Student'
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('')
  const whatsappDigits = (profile?.whatsapp_number || '').replace(/[^0-9]/g, '')
  const socialLinks = profile?.social_links || []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: '24px' }}>
      <div style={{ padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-strong)', display: 'flex' }}>
          <Icon name="chevron-left" size={20} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-strong)' }}>{name}</span>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--app-border)', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{
              width: '82px', height: '82px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'var(--app-accent)', fontSize: '24px', fontWeight: 700 }}>{initials}</span>
              )}
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-strong)' }}>{skills.length}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>Skills</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-strong)' }}>{profile?.year_of_study || '--'}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>Year</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-strong)' }}>{socialLinks.length}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>Links</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'left' }}>
            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-strong)' }}>{name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{profile?.department || ''}</div>
            {profile?.bio && <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.5 }}>{profile.bio}</p>}
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
                  title={platformInfo(link.platform).label}
                  style={{
                    width: '36px', height: '36px', borderRadius: '11px', background: 'var(--app-accent-soft)',
                    color: 'var(--app-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  <Icon name={platformInfo(link.platform).icon} size={16} />
                </a>
              ))}
            </div>
          )}

          {whatsappDigits.length >= 6 && (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px',
                padding: '13px', borderRadius: '14px', border: '1.5px solid #25D366', color: '#25D366',
                fontWeight: 700, fontSize: '14px', textDecoration: 'none',
              }}
            >
              <Icon name="whatsapp" size={16} color="#25D366" />
              Chat on WhatsApp
            </a>
          )}
        </div>

        {skills.length > 0 && (
          <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--app-border)', padding: '16px 18px', marginTop: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--text-muted)', marginBottom: '10px' }}>SKILLS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {skills.map(skill => (
                <div key={skill.id} style={{ background: 'var(--app-accent-soft)', border: '1px solid var(--app-border-soft)', borderRadius: '999px', padding: '6px 12px' }}>
                  <span style={{ color: 'var(--app-accent)', fontSize: '13px', fontWeight: 700 }}>{skill.skill_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ViewProfile
