import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canManageLineSnippets } from '../../../../shared/auth/access'
import { optionsFromPackages } from '../../../../shared/packages/serviceInterests'
import type { ServicePackageOption } from '../../../../shared/packages/serviceInterests'
import {
  createLineSnippet,
  deleteLineSnippet,
  getLineSnippet,
  updateLineSnippet,
} from '../../crm/api/lineSnippets'
import type { LineSnippetInput } from '../../crm/types/lineSnippets'
import { listAllPackages } from '../api/packages'
import { LineSnippetForm } from '../components/LineSnippetForm'
import '../../crm/crm.css'
import '../sales.css'

export function LineSnippetEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const canManage = canManageLineSnippets(roles) || !configured
  const readOnly = !canManage && configured

  const defaultPackageCode = searchParams.get('package') || null

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initial, setInitial] = useState<Awaited<ReturnType<typeof getLineSnippet>>>(null)
  const [serviceOptions, setServiceOptions] = useState<ServicePackageOption[]>([])

  useEffect(() => {
    listAllPackages()
      .then((pkgs) => setServiceOptions(optionsFromPackages(pkgs)))
      .catch(() => setServiceOptions([]))
  }, [])

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      return
    }
    let cancelled = false
    getLineSnippet(id!)
      .then((row) => {
        if (!cancelled) {
          if (!row) setError('ไม่พบข้อความ')
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

  async function handleSubmit(input: LineSnippetInput) {
    if (!canManage) return
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await createLineSnippet(input)
        navigate(`/app/sales/line-snippets/${created.id}`)
      } else {
        await updateLineSnippet(id!, input)
        const refreshed = await getLineSnippet(id!)
        setInitial(refreshed)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || isNew || !canManage) return
    if (!window.confirm('ลบข้อความนี้ถาวร?')) return
    try {
      await deleteLineSnippet(id)
      navigate('/app/sales/line-snippets')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    }
  }

  if (!isNew && !canManage && configured) {
    return (
      <div className="page sales-page">
        <p className="crm-banner crm-banner--warn">ไม่มีสิทธิ์แก้ไขชุดข้อความ</p>
        <Link to="/app/sales/line-snippets" className="crm-btn">
          กลับรายการ
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลด…</p>
      </div>
    )
  }

  return (
    <div className="page sales-page">
      <header className="page__header">
        <Link to="/app/sales/line-snippets" className="crm-back">
          ← กลับรายการ
        </Link>
        <h1>{isNew ? 'เพิ่มข้อความ LINE' : `แก้ไข: ${initial?.title ?? ''}`}</h1>
        <p className="muted">
          ใช้ในแชท CRM — กดการ์ดแล้วข้อความจะไปที่ช่องพิมพ์ LINE (ยังไม่ส่งอัตโนมัติ)
        </p>
      </header>

      {error && <p className="crm-error">{error}</p>}

      <section className="card card--wide">
        <LineSnippetForm
          serviceOptions={serviceOptions}
          initial={initial}
          defaultPackageCode={defaultPackageCode}
          readOnly={readOnly}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/app/sales/line-snippets')}
        />
      </section>

      {!isNew && canManage && (
        <section className="crm-danger-zone">
          <button type="button" className="crm-btn crm-btn--danger" onClick={() => void handleDelete()}>
            ลบข้อความ
          </button>
        </section>
      )}
    </div>
  )
}
