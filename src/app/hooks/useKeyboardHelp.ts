import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable
}

export function useKeyboardHelp(enabled: boolean) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key !== '?') return
      if (isEditableTarget(e.target)) return

      e.preventDefault()
      if (location.pathname !== '/app/help') {
        navigate('/app/help')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, location.pathname, navigate])
}
