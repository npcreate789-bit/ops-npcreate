import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canCreateSalesQuotation,
  canEditSalesQuotation,
  hasDbPrivilegedRole,
} from '../../../../shared/auth/access'
import { getLead } from '../../crm/api/leads'
import { pickPackageIdForQuotation } from '../../../../shared/packages/serviceInterests'
import {
  createQuotation,
  deleteQuotation,
  getQuotation,
  listPackages,
  updateQuotation,
} from '../api/quotations'
import type { QuotationInput, Package, Quotation } from '../types'
import { QuotationForm } from '../components/QuotationForm'
import { printDocument } from '../../../../shared/print/printDocument'
import { QuotationPrintDocument } from '../components/QuotationPrintDocument'
import { QuotationPublicLink } from '../components/QuotationPublicLink'
import { QuotationNextStepsPanel } from '../components/QuotationNextStepsPanel'
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
  const [leadServiceCodes, setLeadServiceCodes] = useState<string[]>([])
  const [suggestedPackage, setSuggestedPackage] = useState<Package | null>(null)

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
          if (!cancelled && lead) {
            setLeadBrandName(lead.brand_name)
            setLeadServiceCodes(lead.services_interested ?? [])
            if (isNew && pkgs.length > 0) {
              const pkgId = pickPackageIdForQuotation(lead.services_interested ?? [], pkgs)
              const pkg = pkgId ? pkgs.find((p) => p.id === pkgId) ?? null : null
              setSuggestedPackage(pkg)
            }
          }
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
    printDocument()
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
      <header className="page__header no-print">
        <Link to="/app/sales" className="crm-back">
          ← กลับ Sales
        </Link>
        <h1>
          {isNew ? 'สร้างใบเสนอราคา' : `ใบเสนอราคา ${initial?.quotation_number ?? ''}`}
        </h1>
      </header>

      {error && <p className="crm-error no-print">{error}</p>}

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner no-print">
          โหมดดูอย่างเดียว — คุณไม่มีสิทธิ์แก้ไขใบเสนอราคานี้
        </p>
      )}

      {initial?.status === 'paid' && initial.customer_id && (
        <p className="crm-banner crm-banner--ok no-print">
          ปิดการขายแล้ว — ลูกค้าเข้า Client Workspace ได้หลังได้บัญชี · Account รับบรีฟต่อ
        </p>
      )}

      {!isNew && initial && <QuotationNextStepsPanel quotation={initial} />}

      {!isNew && initial && (
        <section className="card card--wide no-print">
          <h2 className="crm-section-title">ลิงก์สำหรับลูกค้า</h2>
          <QuotationPublicLink
            quotation={initial}
            onTokenReady={() => {
              if (id) void getQuotation(id).then((qt) => qt && setInitial(qt))
            }}
          />
        </section>
      )}

      <section className="card card--wide no-print">
        <QuotationForm
          initial={initial}
          leadId={leadIdParam ?? initial?.lead_id ?? undefined}
          leadBrandName={leadBrandName ?? undefined}
          leadServiceCodes={leadServiceCodes}
          suggestedPackage={isNew ? suggestedPackage : null}
          ownerId={ownerId}
          packages={packages}
          saving={saving}
          readOnly={readOnly}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/app/sales')}
        />
      </section>

      {!isNew && initial && (
        <section className="card card--wide qt-print-section">
          <div className="no-print qt-print-toolbar">
            <button type="button" className="crm-btn crm-btn--primary" onClick={handlePrint}>
              พิมพ์ / บันทึก PDF
            </button>
            <p className="muted">
              ตัวอย่างด้านล่าง — กดพิมพ์แล้วเลือก Save as PDF — ปิด &quot;Headers and footers&quot;
              / หัวท้ายกระดาษ ในกล่องพิมพ์เพื่อไม่ให้มี URL
            </p>
          </div>
          <QuotationPrintDocument quotation={initial} brandName={leadBrandName} />
        </section>
      )}

      {!isNew && canDelete && (
        <section className="crm-danger-zone no-print">
          <button type="button" className="crm-btn crm-btn--danger" onClick={() => void handleDelete()}>
            ลบใบเสนอราคา
          </button>
        </section>
      )}
    </div>
  )
}
