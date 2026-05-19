import { useEffect, useState } from 'react'
import type { AppRole } from '../../../shared/types/roles'
import { listRecentContactInquiries } from '../../modules/crm/api/contactInquiries'
import type { Lead } from '../../modules/crm/types'
import { canViewHomeContactInquiries } from './access'
import { HOME_CONTACT_INQUIRIES_LIMIT } from './constants'

export function useHomeContactInquiries(roles: AppRole[], configured: boolean) {
  const enabled = canViewHomeContactInquiries(roles, configured)

  const [items, setItems] = useState<Lead[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setItems([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void listRecentContactInquiries(HOME_CONTACT_INQUIRIES_LIMIT)
      .then((rows) => {
        if (cancelled) return
        setItems(rows)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'โหลดรายการติดต่อไม่สำเร็จ')
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return {
    enabled,
    items,
    loading,
    error,
    total: items.length,
  }
}
