import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasClientPortalStaffPreview } from '../../../../shared/auth/access'
import { listCustomersForSelect } from '../../finance/api/payments'
import type { CustomerOption } from '../../finance/types'
import { fetchClientReport, getClientCustomerAccess } from '../api/clientReport'
import type { ClientReport } from '../types'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function useClientWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const previewFromUrl = searchParams.get('preview') ?? ''
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const isClientOnly =
    roles.includes('client') && !hasClientPortalStaffPreview(roles) && configured
  const canPreview = hasClientPortalStaffPreview(roles) || !configured

  const [data, setData] = useState<ClientReport | null>(null)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [previewId, setPreviewId] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const effectivePreview = canPreview && previewId ? previewId : undefined
      const report = await fetchClientReport(userId, effectivePreview, roles)
      setData(report)
      if (report) {
        setCustomerId(report.customer.id)
      } else if (effectivePreview) {
        setCustomerId(effectivePreview)
      } else {
        const id = await getClientCustomerAccess(userId)
        setCustomerId(id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [userId, canPreview, previewId, roles])

  useEffect(() => {
    if (!canPreview) return
    listCustomersForSelect()
      .then(setCustomers)
      .catch(() => setCustomers([]))
  }, [canPreview])

  useEffect(() => {
    if (previewFromUrl && canPreview) {
      setPreviewId(previewFromUrl)
    }
  }, [previewFromUrl, canPreview])

  useEffect(() => {
    void load()
  }, [load])

  const setPreviewIdWithUrl = useCallback(
    (id: string) => {
      setPreviewId(id)
      if (!canPreview) return
      if (id) {
        setSearchParams({ preview: id }, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
    },
    [canPreview, setSearchParams],
  )

  return {
    data,
    customers,
    previewId,
    setPreviewId: setPreviewIdWithUrl,
    customerId,
    loading,
    error,
    configured,
    canPreview,
    isClientOnly,
    reload: load,
  }
}
