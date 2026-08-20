import { useState } from 'react'
import { supabase } from './supabase'

// TODO: keep in sync with Onboarding.jsx's SUPPORT_EMAIL constant if that
// one ever changes — duplicated here so this file has no dependency on
// Onboarding.jsx.
const SUPPORT_EMAIL = 'support@polynet.app'

const s = {
  page: {
    minHeight: '100vh',
    background: 'var(--page-bg)',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '56px 24px 16px',
    flexShrink: 0,
  },
  title: { color: 'var(--text-strong)', fontSize: '24px', fontWeight: 800, margin: '0 0 6px' },
  sub: { color: 'var(--text-muted)', fontSize: '13px', margin: 0, lineHeight: 1.5 },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 24px 24px',
    WebkitOverflowScrolling: 'touch',
  },
  h3: { color: 'var(--text-strong)', fontSize: '14.5px', fontWeight: 800, margin: '22px 0 8px' },
  p: { color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.65, margin: '0 0 4px' },
  li: { color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.65, margin: '0 0 6px', paddingLeft: '2px' },
  ul: { margin: '0 0 4px', paddingLeft: '18px' },
  strong: { color: 'var(--text-strong)', fontWeight: 700 },
  callout: {
    background: 'var(--app-accent-soft)',
    border: '1px solid var(--app-border-soft)',
    borderRadius: '14px',
    padding: '14px 16px',
    margin: '10px 0 4px',
  },
  footer: {
    flexShrink: 0,
    padding: '14px 24px 28px',
    borderTop: '1px solid var(--app-border)',
    background: 'var(--page-bg)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  agreeBtn: {
    width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
    background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '15px',
    cursor: 'pointer', boxShadow: 'var(--shadow-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  },
  rejectBtn: {
    width: '100%', padding: '14px', borderRadius: '16px',
    border: '1.5px solid var(--app-border-soft)', background: 'transparent',
    color: 'var(--text-muted)', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  },
  error: { color: 'var(--danger)', fontSize: '12.5px', margin: '0 0 4px', textAlign: 'center' },
}

function Dots() {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff', animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite` }} />
      ))}
      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}

// Shown once, immediately after a person finishes onboarding (student or
// admin), before the Walkthrough. Blocks entry to the app until they agree.
// onAgree() persists acceptance and lets them through; onReject() signs
// them out — there's no "use PolyNet without accepting" path.
function TermsScreen({ session, onAgree, onReject }) {
  const [loading, setLoading] = useState(false) // 'agree' | 'reject' | false
  const [error, setError] = useState('')

  async function handleAgree() {
    setLoading('agree')
    setError('')
    const { error: err } = await supabase
      .from('profiles')
      .update({ terms_accepted: true, terms_accepted_at: new Date().toISOString() })
      .eq('id', session.user.id)
    setLoading(false)
    if (err) {
      setError("Couldn't save that — check your connection and try again.")
      return
    }
    onAgree()
  }

  async function handleReject() {
    setLoading('reject')
    await supabase.auth.signOut()
    setLoading(false)
    onReject()
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>Terms & Conditions</h2>
        <p style={s.sub}>Please read this before you start using PolyNet. Tap "Agree and Continue" to confirm you accept it.</p>
      </div>

      <div style={s.body}>
        <p style={s.p}>
          PolyNet is a social and talent network built for students and staff of Harare
          Polytechnic. By creating an account and using PolyNet, you agree to the terms
          below. If you don't agree, you won't be able to use the app.
        </p>

        <h3 style={s.h3}>1. Who can use PolyNet</h3>
        <p style={s.p}>
          PolyNet is intended for current Harare Polytechnic students and staff. You agree
          to provide accurate information about yourself (name, department, year of study,
          or admin title) during onboarding, and to keep your account details up to date.
          You're responsible for everything that happens under your account, so keep your
          login secure and don't share it with anyone else.
        </p>

        <h3 style={s.h3}>2. Your conduct on PolyNet</h3>
        <p style={s.p}>When using the Feed, News, PolyMart, or Chats, you agree not to:</p>
        <ul style={s.ul}>
          <li style={s.li}>Post or send anything that harasses, threatens, bullies, or hatefully targets another person or group.</li>
          <li style={s.li}>Post nudity, sexually explicit content, or anything that sexualizes another person without consent.</li>
          <li style={s.li}>Impersonate another student, staff member, or organization.</li>
          <li style={s.li}>Post false information intended to mislead or defraud others.</li>
          <li style={s.li}>Share another person's private information without their permission.</li>
          <li style={s.li}>Use PolyNet for anything illegal under Zimbabwean law.</li>
        </ul>
        <p style={s.p}>
          We may remove content that breaks these rules, and may suspend or permanently
          close accounts that repeatedly or seriously violate them.
        </p>

        <h3 style={s.h3}>3. News Board — rules for admins</h3>
        <div style={s.callout}>
          <p style={{ ...s.p, margin: 0 }}>
            <span style={s.strong}>The News Board is for campus-related posts only.</span>{' '}
            Admins may not use it to post commercial advertisements, sponsored content, or
            promotions for other companies, businesses, or third-party products and
            services — regardless of whether payment is involved. Posts should relate to
            Harare Polytechnic: announcements, notices, events, deadlines, opportunities,
            and other official campus matters.
          </p>
        </div>
        <p style={s.p}>
          Admin accounts are individually verified before they can post. Misuse of admin
          posting privileges, including posting third-party advertising, may result in
          admin access being revoked.
        </p>

        <h3 style={s.h3}>4. PolyMart marketplace</h3>
        <p style={s.p}>
          PolyMart is a peer-to-peer space for students to buy, sell, or offer skills and
          items within the campus community. You're responsible for the accuracy of your
          own listings and for any transaction you enter into with another user. PolyNet
          isn't a party to these transactions, doesn't handle payments, and doesn't
          guarantee the condition, safety, legality, or delivery of any item or service
          listed. Listings for illegal items or services, or anything prohibited under
          Zimbabwean law, aren't allowed and will be removed.
        </p>

        <h3 style={s.h3}>5. Chats & messaging</h3>
        <p style={s.p}>
          Direct messages on PolyNet are private between the people in the conversation,
          but the same conduct rules in Section 2 still apply. If someone reports abuse
          in a chat, we may review the reported messages to act on that report.
        </p>

        <h3 style={s.h3}>6. Your content</h3>
        <p style={s.p}>
          You keep ownership of what you post — text, photos, listings, and messages. By
          posting on PolyNet, you give us permission to store and display that content
          within the app so it works as intended (e.g. showing your posts in the Feed).
          We don't sell your content to third parties.
        </p>

        <h3 style={s.h3}>7. Reporting & enforcement</h3>
        <p style={s.p}>
          You can report posts, listings, or accounts that break these terms. We review
          reports and may remove content, restrict features, or suspend accounts found to
          be in violation — at our discretion, and without prior notice for serious cases.
        </p>

        <h3 style={s.h3}>8. Privacy</h3>
        <p style={s.p}>
          Our Privacy Policy explains what information we collect and how it's used and
          stored. It's available from within the app under your Profile settings, and by
          agreeing here, you also confirm you've had the chance to review it.
        </p>

        <h3 style={s.h3}>9. No warranty</h3>
        <p style={s.p}>
          PolyNet is provided "as is," built and maintained on a best-effort basis. We
          don't guarantee it will always be available, error-free, or uninterrupted, and
          we aren't liable for losses arising from your use of the app, including
          transactions made through PolyMart or interactions with other users.
        </p>

        <h3 style={s.h3}>10. Changes to these terms</h3>
        <p style={s.p}>
          We may update these terms as PolyNet grows. If we make material changes, we'll
          ask you to review and accept the updated terms again before you can keep using
          the app.
        </p>

        <h3 style={s.h3}>11. Governing law</h3>
        <p style={s.p}>
          These terms are governed by the laws of Zimbabwe.
        </p>

        <h3 style={s.h3}>12. Contact</h3>
        <p style={{ ...s.p, marginBottom: '4px' }}>
          Questions about these terms? Reach us at{' '}
          <span style={s.strong}>{SUPPORT_EMAIL}</span>.
        </p>
      </div>

      <div style={s.footer}>
        {error && <p style={s.error}>{error}</p>}
        <button onClick={handleAgree} disabled={!!loading} style={{ ...s.agreeBtn, opacity: loading ? 0.8 : 1 }}>
          {loading === 'agree' ? <Dots /> : 'Agree and Continue'}
        </button>
        <button onClick={handleReject} disabled={!!loading} style={{ ...s.rejectBtn, opacity: loading ? 0.8 : 1 }}>
          {loading === 'reject' ? 'Signing out…' : 'Reject'}
        </button>
      </div>
    </div>
  )
}

export default TermsScreen
