import { useEffect, useState } from 'react'
import type { AppRole } from '../../../shared/types/roles'
import {
  canViewWorkHub,
  hasWorkHubKinds,
} from '../../modules/work-hub/access'
import { buildWorkHubSummary, fetchWorkHub } from '../../modules/work-hub/api/workHub'
import { DEFAULT_WORK_HUB_FILTERS } from '../../modules/work-hub/constants'
import type { WorkHubSummary, WorkItem } from '../../modules/work-hub/types'
import { HOME_WORK_PREVIEW_LIMIT } from './constants'

const EMPTY_SUMMARY: WorkHubSummary = {
  total: 0,
  overdue: 0,
  due_today: 0,
  unread_notifications: 0,
}

export function useHomeDashboard(
  userId: string,
  roles: AppRole[],
  configured: boolean,
) {
  const showWork = canViewWorkHub(roles) || !configured
  const hasKinds = hasWorkHubKinds(roles) || !configured
  const enabled = showWork && hasKinds

  const [items, setItems] = useState<WorkItem[]>([])
  const [summary, setSummary] = useState<WorkHubSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setItems([])
      setSummary(EMPTY_SUMMARY)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchWorkHub(userId, roles, DEFAULT_WORK_HUB_FILTERS, configured)
      .then((rows) => {
        if (cancelled) return
        setItems(rows)
        setSummary(buildWorkHubSummary(rows))
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'โหลดงานไม่สำเร็จ')
        setItems([])
        setSummary(EMPTY_SUMMARY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [configured, enabled, roles, userId])

  return {
    showWork,
    hasKinds,
    enabled,
    loading,
    error,
    summary,
    previewItems: items.slice(0, HOME_WORK_PREVIEW_LIMIT),
    totalItems: items.length,
  }
}
