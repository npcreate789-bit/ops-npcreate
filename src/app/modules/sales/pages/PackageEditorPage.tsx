import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canManageSalesPackages } from '../../../../shared/auth/access'
import {
  createPackage,
  deactivatePackage,
  getPackage,
  updatePackage,
} from '../api/packages'
import type { PackageInput } from '../types'
import { PackageForm } from '../components/PackageForm'
import '../../crm/crm.css'
import '../sales.css'

export function PackageEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const canManage = canManageSalesPackages(roles) || !configured
  const readOnly = !canManage && configured

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initial, setInitial] = useState<Awaited<ReturnType<typeof getPackage>>>(null)

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      return
    }
    let cancelled = false
    getPackage(id!)
      .then((row) => {
        if (!cancelled) {
          if (!row) setError('ไม่พบแพ็กเกจ')
          else setInitial(row)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  async function handleSubmit(input: PackageInput) {
    if (!canManage) return
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await createPackage(input)
        navigate(`/app/sales/packages/${created.id}`, { replace: true })
      } else if (id) {
        const updated = await updatePackage(id, input)
        setInitial(updated)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!id || isNew || !canManage) return
    if (!window.confirm('ปิดใช้งานแพ็กเกจนี้? จะไม่แสดงในใบเสนอราคาใหม่ (รายการเดิมยังอ้างอิงได้)')) return
    setSaving(true)
    setError(null)
    try {
      const updated = await deactivatePackage(id)
      setInitial(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ปิดใช้งานไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลด...</p>
      </div>
    )
  }

  if (isNew && !canManage) {
    return (
      <div className="page">
        <p className="crm-error">ไม่มีสิทธิ์เพิ่มแพ็กเกจ</p>
        <Link to="/app/sales/packages" className="crm-back">
          ← กลับรายการ
        </Link>
      </div>
    )
  }

  return (
    <div className="page sales-page">
      <header className="page__header crm-page__header sales-page__header">
        <div>
          <Link to="/app/sales/packages" className="crm-back">
            ← กลับรายการแพ็กเกจ
          </Link>
          <h1>{isNew ? 'เพิ่มแพ็กเกจบริการ' : initial?.name ?? 'แก้ไขแพ็กเกจ'}</h1>
          <p className="muted">รหัสและราคาฐานใช้ในใบเสนอราคา — ปิดใช้งานแทนการลบถาวร</p>
        </div>
        {canManage && !isNew && initial?.is_active && (
          <button
            type="button"
            className="crm-btn crm-btn--ghost crm-btn--danger"
            disabled={saving}
            onClick={() => void handleDeactivate()}
          >
            ปิดใช้งาน
          </button>
        )}
      </header>

      {error && <p className="crm-error">{error}</p>}

      <section className="card card--wide">
        <PackageForm
          initial={initial}
          saving={saving}
          readOnly={readOnly}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/app/sales/packages')}
        />
      </section>
    </div>
  )
}
