import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from './Icon'
import { useInstallPrompt } from './useInstallPrompt'

const DISMISS_KEY = 'polynet_install_prompt_dismissed_at'
const RESHOW_AFTER_DAYS = 7

function wasDismissedRecently() {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  const days = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
  return days < RESHOW_AFTER_DAYS
}

export default function InstallPrompt() {
  const { isStandalone, platform, canPromptInstall, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(true)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    setDismissed(wasDismissedRecently())
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }

  async function handleInstallTap() {
    setInstalling(true)
    const outcome = await promptInstall()
    setInstalling(false)
    // Whether accepted or dismissed, the native dialog already gave them
    // the choice — don't nag again this session either way.
    dismiss()
  }

  const shouldShow =
    !isStandalone &&
    !dismissed &&
    (platform === 'ios' || (platform === 'chromium' && canPromptInstall))

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          style={{
            position: 'fixed', left: '14px', right: '14px', bottom: 'calc(74px + env(safe-area-inset-bottom, 0px))',
            zIndex: 300, maxWidth: '420px', margin: '0 auto',
            background: 'var(--card-bg)', borderRadius: '18px',
            border: '1px solid var(--app-border)', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            padding: '14px 14px 14px 16px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
        >
          <div style={{
            width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
            background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="download" size={18} color="var(--app-accent)" />
          </div>

          {platform === 'chromium' ? (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-strong)' }}>Install PolyNet</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>Add it to your home screen for quick access</div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleInstallTap}
                disabled={installing}
                style={{
                  padding: '9px 16px', borderRadius: '999px', border: 'none',
                  background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '12.5px',
                  cursor: installing ? 'default' : 'pointer', opacity: installing ? 0.7 : 1, flexShrink: 0,
                }}
              >
                {installing ? '...' : 'Install'}
              </motion.button>
            </>
          ) : (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-strong)' }}>Install PolyNet</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px', lineHeight: 1.4 }}>
                Tap <Icon name="share" size={12} color="var(--text-muted)" style={{ verticalAlign: '-1px', margin: '0 2px' }} /> Share, then "Add to Home Screen"
              </div>
            </div>
          )}

          <div onClick={dismiss} style={{ cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, padding: '4px' }}>
            <Icon name="x" size={16} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
