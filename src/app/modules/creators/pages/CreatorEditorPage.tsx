import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canManageCreators,
  hasDbPrivilegedRole,
  isCreatorsReadOnly,
} from '../../../../shared/auth/access'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import { createCreator, deleteCreator, getCreator, updateCreator } from '../api/creators'
import type { CreatorInput } from '../types'
import { CreatorForm } from '../components/CreatorForm'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../creators.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function CreatorEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { profile } = useAuth()
  const roles = profile?.roles ?? []
  const ownerId = profile?.id ?? DEV_OWNER
  const canManage = canManageCreators(roles) || !isSupabaseConfigured
  const readOnly = isCreatorsReadOnly(roles) && isSupabaseConfigured
  const canDelete = hasDbPrivilegedRole(roles)

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initial, setInitial] = useState<Awaited<ReturnType<typeof getCreator>>>(null)

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      return
    }
    let cancelled = false
    getCreator(id!)
      .then((row) => {
        if (!cancelled) {
          if (!row) setError('ไม่พบครีเอเตอร์')
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

  async function handleSubmit(input: CreatorInput) {
    if (!canManage) return
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await createCreator(input)
        navigate(`/app/creators/${created.id}`, { replace: true })
      } else if (id) {
        const updated = await updateCreator(id, input)
        setInitial(updated)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || isNew || !canDelete) return
    if (!window.confirm('ลบครีเอเตอร์นี้?')) return
    try {
      await deleteCreator(id)
      navigate('/app/creators')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
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
        <p className="crm-error">ไม่มีสิทธิ์เพิ่มครีเอเตอร์</p>
        <Link to="/app/creators" className="crm-back">
          ← กลับรายการ
        </Link>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header">
        <Link to="/app/creators" className="crm-back">
          ← กลับรายการ
        </Link>
        <h1>{isNew ? 'เพิ่มครีเอเตอร์' : initial?.display_name ?? 'แก้ไขครีเอเตอร์'}</h1>
      </header>

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — ไม่สามารถแก้ไขข้อมูลครีเอเตอร์ได้
        </p>
      )}

      {error && <p className="crm-error">{error}</p>}

      <section className="card card--wide">
        <CreatorForm
          initial={initial}
          ownerId={ownerId}
          saving={saving}
          readOnly={readOnly}
          onSubmit={(i) => void handleSubmit(i)}
          onCancel={() => navigate('/app/creators')}
        />
      </section>

      {!isNew && canDelete && (
        <section className="crm-danger-zone">
          <button type="button" className="crm-btn crm-btn--danger" onClick={() => void handleDelete()}>
            ลบครีเอเตอร์
          </button>
        </section>
      )}
    </div>
  )
}
