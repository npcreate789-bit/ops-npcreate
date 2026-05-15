import { useCallback, useEffect, useState } from 'react'

export function useCommandPalette(enabled: boolean) {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => {
    if (!enabled) return
    setOpen((v) => !v)
  }, [enabled])
  const openPalette = useCallback(() => {
    if (!enabled) return
    setOpen(true)
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setOpen(false)
      return
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return { open, setOpen, close, toggle, openPalette }
}
