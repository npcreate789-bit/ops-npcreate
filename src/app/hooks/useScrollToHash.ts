import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** เลื่อนไปยัง anchor เมื่อเปิดหน้าด้วย hash (เช่น /app/help#start) */
export function useScrollToHash() {
  const { hash, pathname } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = hash.replace(/^#/, '')
    if (!id) return

    const scroll = () => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const t = window.setTimeout(scroll, 0)
    return () => window.clearTimeout(t)
  }, [hash, pathname])
}
