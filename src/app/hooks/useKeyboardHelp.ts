import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable
}

/** เปิดศูนย์ช่วยเหลือด้วย ? (ไม่รวมตอนพิมพ์ในช่อง input) */
export function useKeyboardHelp(enabled: boolean) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key !== '?' && !(e.shiftKey && e.key === '/')) return
      if (isEditableTarget(e.target)) return

      const normalized =
        location.pathname.length > 1 && location.pathname.endsWith('/')
          ? location.pathname.slice(0, -1)
          : location.pathname
      if (normalized === '/app/help') return

      e.preventDefault()
      navigate('/app/help')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, location.pathname, navigate])
}
