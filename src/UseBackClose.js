import { useEffect } from 'react'

export function useBackClose(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined

    const handlePopState = () => {
      onClose()
    }

    const currentUrl = window.location.href
    window.history.pushState(null, '', currentUrl)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isOpen, onClose])
}
