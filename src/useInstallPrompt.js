import { useEffect, useState, useCallback } from 'react'

// There is no single API that installs the app "regardless of browser" —
// that's a real platform limitation, not something any code can route
// around. Specifically:
//
//   - Chrome/Edge (Android + desktop) fire a `beforeinstallprompt` event
//     that lets a page trigger the native install dialog on demand. This
//     is the only case where a JS-triggered prompt is possible at all.
//   - iOS Safari — and every other browser on iOS, since Apple requires
//     them all to use WebKit — never fires that event and has no
//     equivalent API. Apple deliberately doesn't expose this to web
//     pages. The only way to "install" there is the person manually
//     tapping Share → Add to Home Screen, and the most a page can do is
//     tell them that, clearly, at the right moment.
//   - Firefox and some others don't support an install prompt either,
//     on any platform, but do have their own manual "Add to Home
//     Screen" / "Install" option tucked in the browser menu.
//
// This hook detects which of those situations applies and gives the UI
// what it needs to do the closest thing to "universal" that's actually
// possible: a real one-tap install button where the platform allows it,
// and clear manual instructions everywhere else.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [platform, setPlatform] = useState('unsupported') // 'chromium' | 'ios' | 'unsupported'

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true // iOS's own flag for "already added to home screen"
    setIsStandalone(standalone)

    const ua = window.navigator.userAgent || ''
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
    if (isIOS) setPlatform('ios')

    function onBeforeInstallPrompt(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setPlatform('chromium')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    function onInstalled() {
      setIsStandalone(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return choice.outcome // 'accepted' | 'dismissed'
  }, [deferredPrompt])

  return {
    isStandalone,             // already installed — don't show anything
    platform,                 // 'chromium' | 'ios' | 'unsupported'
    canPromptInstall: !!deferredPrompt,
    promptInstall,            // call this from a button tap on Chromium
  }
}
