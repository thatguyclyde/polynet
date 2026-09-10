import { useEffect, useRef } from 'react'

/**
 * useBackClose
 * ------------
 * Makes the device/browser back button close an open overlay (modal, sheet,
 * fullscreen view, profile drawer, chat thread, etc.) instead of navigating
 * away from PolyNet or exiting the app.
 *
 * How it works:
 * - When `isOpen` becomes true, this pushes one extra entry onto the
 *   browser's history stack (tagged with `key` so multiple overlays don't
 *   collide) and remembers where the stack was before.
 * - Pressing back fires a `popstate` event. If our tagged entry is what got
 *   popped, we call `onClose()` instead of letting the browser do anything
 *   else — so `isOpen` flips to false via your own state setter.
 * - If the overlay is closed by tapping an in-app "X" or backdrop instead
 *   of the hardware back button, we clean up the extra history entry we
 *   added, so the stack never grows unbounded across many open/close cycles.
 *
 * Usage — one hook call per independently-closable overlay:
 *
 *   useBackClose(showProfile, () => setShowProfile(false), 'profile')
 *   useBackClose(chatThreadOpen, () => setChatThreadOpen(false), 'chat-thread')
 *   useBackClose(listingDetailOpen, () => setListingDetailOpen(false), 'listing-detail')
 *
 * If several overlays can be open at once, give each a distinct `key` —
 * that's what lets this hook tell which one the back button should close
 * when more than one is stacked (it always closes the most recently opened
 * one first, matching how a stack of screens should behave).
 *
 * @param {boolean} isOpen - whether the overlay is currently open
 * @param {() => void} onClose - called to close the overlay (your setState)
 * @param {string} key - unique name for this overlay, used in the pushed
 *                        history state so popstate handlers don't cross-fire
 */
export function useBackClose(isOpen, onClose, key = 'overlay') {
  // Tracks whether *this* hook instance is the one that pushed the current
  // top-of-stack history entry, so its popstate handler only reacts to its
  // own entry being popped — not some other overlay's.
  const pushedRef = useRef(false)
  const onCloseRef = useRef(onClose)

  // Keep the latest onClose without needing it in the effect's dependency
  // array (which would otherwise re-run the push/pop logic on every render
  // if the caller passes an inline arrow function, as most will).
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    // Push a history entry the moment this overlay opens.
    window.history.pushState({ polynetOverlay: key }, '')
    pushedRef.current = true

    function handlePopState(event) {
      // Only react if the entry being left behind (i.e. the one popped)
      // belongs to this overlay. We can't inspect the popped state
      // directly, but since we just pushed it and nothing else should be
      // pushing on top of it while this overlay is open, any popstate
      // firing while `pushedRef.current` is true means "our" entry.
      if (pushedRef.current) {
        pushedRef.current = false
        onCloseRef.current()
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)

      // If the overlay is closing because of an in-app action (tapping X,
      // a backdrop, a Cancel button) rather than the back button, the
      // history entry we pushed is still sitting there unused. Pop it off
      // so the stack doesn't accumulate a phantom entry every time this
      // overlay opens and closes — but calling `history.back()` here can
      // accidentally navigate the app (e.g. during sign-out). Instead of
      // going back, replace the current history entry to remove our
      // sentinel state without moving the user's position in the stack.
      if (pushedRef.current) {
        pushedRef.current = false
        try {
          window.history.replaceState(null, '')
        } catch (e) {
          // ignore in environments that disallow history manipulation
        }
      }
    }
  }, [isOpen, key])
}

export default useBackClose