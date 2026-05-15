import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canCreateSalesQuotation,
  canEditSalesQuotation,
  hasDbPrivilegedRole,
} from '../../../../shared/auth/access'
import { getLead } from '../../crm/api/leads'
import {
  createQuotation,
  deleteQuotation,
  getQuotation,
  listPackages,
  updateQuotation,
} from '../api/quotations'
import type { QuotationInput, Package, Quotation } from '../types'
import { QuotationForm } from '../components/QuotationForm'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../sales.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function QuotationEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const leadIdParam = searchParams.get('leadId')
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const ownerId = profile?.id ?? DEV_OWNER
  const canDelete = hasDbPrivilegedRole(roles)
  const canCreate = canCreateSalesQuotation(roles) || !configured

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initial, setInitial] = useState<Quotation | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [leadBrandName, setLeadBrandName] = useState<string | null>(null)

  const canEdit =
    (isNew
      ? canCreate
      : canEditSalesQuotation(roles, initial?.owner_id, ownerId)) || !configured
  const readOnly = !canEdit && configured

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const pkgs = await listPackages()
        if (!cancelled) setPackages(pkgs)

        const lid = leadIdParam ?? initial?.lead_id
        if (lid) {
          const lead = await getLead(lid)
          if (!cancelled && lead) setLeadBrandName(lead.brand_name)
        }

        if (!isNew && id) {
          const qt = await getQuotation(id)
          if (!cancelled) {
            if (!qt) setError('ไม่พบใบเสนอราคา')
            else {
              setInitial(qt)
              setLeadBrandName(qt.lead_brand_name ?? null)
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, isNew, leadIdParam])

  async function handleSubmit(input: QuotationInput) {
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await createQuotation({ ...input, owner_id: ownerId })
        navigate(`/app/sales/quotations/${created.id}`, { replace: true })
      } else if (id) {
        await updateQuotation(id, { ...input, owner_id: ownerId })
        const refreshed = await getQuotation(id)
        setInitial(refreshed)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || isNew) return
    if (!confirm('ลบใบเสนอราคานี้?')) return
    try {
      await deleteQuotation(id)
      navigate('/app/sales')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="page sales-page">
      <header className="page__header">
        <Link to="/app/sales" className="crm-back">
          ← กลับ Sales
        </Link>
        <h1>
          {isNew ? 'สร้างใบเสนอราคา' : `ใบเสนอราคา ${initial?.quotation_number ?? ''}`}
        </h1>
      </header>

      {error && <p className="crm-error">{error}</p>}

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — คุณไม่มีสิทธิ์แก้ไขใบเสนอราคานี้
        </p>
      )}

      {initial?.customer_id &&
        ['sent', 'awaiting_payment', 'paid'].includes(initial.status) && (
          <p className="crm-banner">
            {initial.status === 'paid' ? 'ปิดการขายแล้ว' : 'พร้อมบันทึกการชำระเงิน'} —{' '}
            <Link
              to={`/app/finance/payments/new?customerId=${initial.customer_id}&quotationId=${initial.id}`}
              className="crm-btn crm-btn--primary"
              style={{ marginLeft: '0.5rem' }}
            >
              ไป Finance
            </Link>
          </p>
        )}

      <section className="card card--wide">
        <QuotationForm
          initial={initial}
          leadId={leadIdParam ?? initial?.lead_id ?? undefined}
          leadBrandName={leadBrandName ?? undefined}
          ownerId={ownerId}
          packages={packages}
          saving={saving}
          readOnly={readOnly}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/app/sales')}
        />
      </section>

      {!isNew && initial && (
        <section className="card card--wide">
          <button type="button" className="crm-btn crm-btn--ghost" onClick={handlePrint}>
            พิมพ์ / PDF
          </button>
          <div className="qt-print">
            <h2>ใบเสนอราคา {initial.quotation_number}</h2>
            <p>แบรนด์: {leadBrandName ?? '—'}</p>
            <p>ระยะสัญญา: {initial.contract_months ?? '—'} เดือน</p>
            <table className="crm-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th>จำนวน</th>
                  <th>ราคา</th>
                  <th>รวม</th>
                </tr>
              </thead>
              <tbody>
                {(initial.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit_price.toLocaleString('th-TH')}</td>
                    <td>{item.line_total.toLocaleString('th-TH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ textAlign: 'right', marginTop: '1rem' }}>
              <strong>รวมทั้งสิ้น: {initial.total.toLocaleString('th-TH')} บาท</strong>
            </p>
            {initial.terms && (
              <p style={{ fontSize: '0.85rem', marginTop: '1rem' }}>เงื่อนไข: {initial.terms}</p>
            )}
          </div>
        </section>
      )}

      {!isNew && canDelete && (
        <section className="crm-danger-zone">
          <button type="button" className="crm-btn crm-btn--danger" onClick={() => void handleDelete()}>
            ลบใบเสนอราคา
          </button>
        </section>
      )}
    </div>
  )
}
