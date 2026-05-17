import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canViewWorkHub } from '../../../../shared/auth/access'
import { formatBangkokDate, formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import { listAssignees } from '../../tasks/api/tasks'
import type { AssigneeOption } from '../../tasks/types'
import {
  assignOwners,
  getOnboardingDetail,
  saveOnboardingForm,
  updateChecklistItem,
} from '../api/onboarding'
import { OnboardingNextStepsPanel } from '../components/OnboardingNextStepsPanel'
import type { ChecklistValue, OnboardingDetail, OnboardingFormInput } from '../types'
import { CHECKLIST_ITEMS } from '../constants'
import { clientWorkspaceUrl, financeUrlForCustomer } from '../../customers/customerLinks'
import { customerStatusLabelTh } from '../pipeline'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../onboarding.css'

function ownerSelectOptions(assignees: AssigneeOption[], selectedId: string): AssigneeOption[] {
  if (!selectedId || assignees.some((a) => a.id === selectedId)) return assignees
  return [{ id: selectedId, label: 'ผู้ใช้ที่มอบหมายแล้ว (นอกรายชื่อปัจจุบัน)' }, ...assignees]
}

function ownerLabel(assignees: AssigneeOption[], selectedId: string): string {
  if (!selectedId) return 'ยังไม่ระบุ'
  return assignees.find((a) => a.id === selectedId)?.label ?? 'ผู้ใช้ในระบบ'
}

export function OnboardingDetailPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const { hasAnyRole, profile, configured } = useAuth()
  const showWorkLink = canViewWorkHub(profile?.roles ?? []) || !configured
  const canEditBrief =
    hasAnyRole(['ceo', 'account', 'admin', 'dev']) || !isSupabaseConfigured
  const canEditChecklist = canEditBrief
  const canAssignOwners =
    hasAnyRole(['ceo', 'operations', 'account', 'admin', 'dev']) || !isSupabaseConfigured
  const [detail, setDetail] = useState<OnboardingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingOwners, setSavingOwners] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignees, setAssignees] = useState<AssigneeOption[]>([])
  const [assigneesLoading, setAssigneesLoading] = useState(true)
  const [ownersSuccess, setOwnersSuccess] = useState(false)
  const [accountOwnerId, setAccountOwnerId] = useState('')
  const [adsOwnerId, setAdsOwnerId] = useState('')

  const accountOptions = useMemo(
    () => ownerSelectOptions(assignees, accountOwnerId),
    [assignees, accountOwnerId],
  )
  const adsOptions = useMemo(
    () => ownerSelectOptions(assignees, adsOwnerId),
    [assignees, adsOwnerId],
  )

  const [form, setForm] = useState<OnboardingFormInput>({
    tiktok_shop_url: '',
    product_links: '',
    pricing_info: '',
    promotion_info: '',
    profit_margin: '',
    commission_info: '',
    target_roi: null,
    daily_ad_budget: null,
    existing_content: '',
    ads_account_info: '',
    seller_account_info: '',
    business_center_info: '',
    notes: '',
  })

  const load = useCallback(async () => {
    if (!customerId) return
    setLoading(true)
    setError(null)
    try {
      const d = await getOnboardingDetail(customerId)
      setDetail(d)
      setAccountOwnerId(d.customer.account_owner_id ?? '')
      setAdsOwnerId(d.customer.ads_owner_id ?? '')
      if (d.form) {
        setForm({
          tiktok_shop_url: d.form.tiktok_shop_url ?? '',
          product_links: d.form.product_links ?? '',
          pricing_info: d.form.pricing_info ?? '',
          promotion_info: d.form.promotion_info ?? '',
          profit_margin: d.form.profit_margin ?? '',
          commission_info: d.form.commission_info ?? '',
          target_roi: d.form.target_roi,
          daily_ad_budget: d.form.daily_ad_budget,
          existing_content: d.form.existing_content ?? '',
          ads_account_info: d.form.ads_account_info ?? '',
          seller_account_info: d.form.seller_account_info ?? '',
          business_center_info: d.form.business_center_info ?? '',
          notes: d.form.notes ?? '',
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    setAssigneesLoading(true)
    listAssignees()
      .then((list) => {
        if (!cancelled) setAssignees(list)
      })
      .catch(() => {
        if (!cancelled) setError('โหลดรายชื่อพนักงานไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setAssigneesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSaveForm() {
    if (!customerId) return
    setSaving(true)
    try {
      await saveOnboardingForm(customerId, form)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleChecklistChange(itemKey: string, status: ChecklistValue, note?: string | null) {
    if (!customerId) return
    try {
      const row = detail?.checklist.find((c) => c.item_key === itemKey)
      await updateChecklistItem(customerId, itemKey, status, note ?? row?.note ?? null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อัปเดต checklist ไม่สำเร็จ')
    }
  }

  async function handleSaveOwners() {
    if (!customerId) return
    setSavingOwners(true)
    setError(null)
    setOwnersSuccess(false)
    try {
      await assignOwners(
        customerId,
        accountOwnerId.trim() || null,
        adsOwnerId.trim() || null,
      )
      await load()
      setOwnersSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกผู้ดูแลไม่สำเร็จ')
    } finally {
      setSavingOwners(false)
    }
  }

  if (loading || !detail) {
    return (
      <div className="page">
        <p className="muted">{loading ? 'กำลังโหลด...' : 'ไม่พบลูกค้า'}</p>
      </div>
    )
  }

  return (
    <div className="page onboarding-detail-page">
      <header className="page__header">
        <Link to="/app/onboarding" className="crm-back">
          ← กลับรายการ
        </Link>
        <h1>{detail.customer.brand_name}</h1>
        <p className="onboarding-meta">
          สัญญาถึง: {formatBangkokDate(detail.customer.contract_end)} · สถานะลูกค้า:{' '}
          {customerStatusLabelTh(detail.customer.status)}
        </p>
        <p className="onboarding-detail-links muted">
          <Link to={`/app/customers/${customerId}`}>ลูกค้า 360°</Link>
          {' · '}
          <Link to={financeUrlForCustomer(customerId!)}>การเงิน</Link>
          {' · '}
          <Link to={clientWorkspaceUrl(customerId!, 'brief')}>พื้นที่ลูกค้า · บรีฟ</Link>
          {showWorkLink && (
            <>
              {' · '}
              <Link to="/app/work">งานของฉัน</Link>
            </>
          )}
        </p>
        <p title="เปอร์เซ็นต์จาก checklist 8 ข้อของทีม Account — ไม่ใช่ความคืบหน้าฟอร์มบรีฟฝั่งลูกค้า">
          Checklist ทีม {detail.customer.progress}% —{' '}
          <span
            className={
              detail.customer.ready_for_ads
                ? 'onboarding-ready onboarding-ready--yes'
                : 'onboarding-ready onboarding-ready--no'
            }
          >
            {detail.customer.ready_for_ads ? 'พร้อมยิงแอด' : 'ยังไม่พร้อมยิงแอด'}
          </span>
        </p>
        <div className="onboarding-progress">
          <div
            className="onboarding-progress__bar"
            style={{ width: `${detail.customer.progress}%` }}
          />
        </div>
        {detail.customer.ready_for_ads && customerId && (
          <p style={{ marginTop: '0.75rem' }}>
            <Link to={`/app/ads/${customerId}`} className="crm-btn crm-btn--primary">
              ไปรายงานผลแอดรายวัน →
            </Link>
          </p>
        )}
      </header>

      <OnboardingNextStepsPanel
        detail={detail}
        clientSubmitted={detail.customer.client_submitted}
      />

      {detail.form?.client_submitted_at && (
        <p className="crm-banner">
          ลูกค้าส่งบรีฟเมื่อ {formatBangkokDateTime(detail.form.client_submitted_at)} — ตรวจ checklist
          ด้านล่างให้ครบ
        </p>
      )}

      {!detail.customer.has_form && (
        <p className="crm-banner crm-banner--warn">
          ลูกค้ายังไม่กรอกบรีฟ — แจ้งให้เปิด Client Workspace → เมนูบรีฟงาน
        </p>
      )}

      {error && <p className="crm-error">{error}</p>}

      {!canEditBrief && (
        <p className="crm-banner">ดูอย่างเดียว — แก้บรีฟ/checklist ได้เฉพาะทีม Account</p>
      )}

      <section id="checklist" className="card card--wide">
        <h2 className="crm-section-title">Checklist ก่อนเริ่มยิงแอด</h2>
        <p className="muted onboarding-section-hint">
          ทีม Account ติ๊กรายการที่ได้รับจากลูกค้าแล้ว — ครบ 8 ข้อ = พร้อมยิงแอด
        </p>
        <div className="crm-table-wrap">
          <table className="crm-table checklist-table">
            <thead>
              <tr>
                <th>รายการ</th>
                <th>สถานะ</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {CHECKLIST_ITEMS.map((def) => {
                const row = detail.checklist.find((c) => c.item_key === def.key)
                const status = row?.status ?? def.options[0].value
                const note = row?.note ?? ''
                return (
                  <tr key={def.key}>
                    <td>{def.label}</td>
                    <td>
                      <select
                        value={status}
                        disabled={!canEditChecklist}
                        onChange={(e) =>
                          void handleChecklistChange(
                            def.key,
                            e.target.value as ChecklistValue,
                            note || null,
                          )
                        }
                        className="crm-select"
                      >
                        {def.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="crm-input checklist-note-input"
                        value={note}
                        disabled={!canEditChecklist}
                        placeholder="หมายเหตุ (ถ้ามี)"
                        onChange={(e) => {
                          const next = e.target.value
                          setDetail((prev) => {
                            if (!prev) return prev
                            const checklist = prev.checklist.map((c) =>
                              c.item_key === def.key ? { ...c, note: next || null } : c,
                            )
                            return { ...prev, checklist }
                          })
                        }}
                        onBlur={(e) =>
                          void handleChecklistChange(
                            def.key,
                            status,
                            e.target.value.trim() || null,
                          )
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section id="brief" className="card card--wide">
        <h2 className="crm-section-title">ข้อมูลแบรนด์</h2>
        <p className="muted onboarding-section-hint">
          ข้อมูลจากลูกค้า (หรือ Account เติมให้) — บันทึกเมื่อแก้ไข
        </p>
        <fieldset className="qt-form__grid onboarding-form-fieldset" disabled={!canEditBrief}>
          <label className="qt-form__full">
            ลิงก์ TikTok Shop
            <input
              value={form.tiktok_shop_url ?? ''}
              onChange={(e) => setForm({ ...form, tiktok_shop_url: e.target.value })}
              className="crm-input"
            />
          </label>
          <label className="qt-form__full">
            ลิงก์สินค้า
            <textarea
              rows={2}
              value={form.product_links ?? ''}
              onChange={(e) => setForm({ ...form, product_links: e.target.value })}
              className="crm-input"
            />
          </label>
          <label>
            ราคา / โปร
            <textarea
              rows={2}
              value={form.pricing_info ?? ''}
              onChange={(e) => setForm({ ...form, pricing_info: e.target.value })}
              className="crm-input"
            />
          </label>
          <label>
            โปรโมชัน
            <textarea
              rows={2}
              value={form.promotion_info ?? ''}
              onChange={(e) => setForm({ ...form, promotion_info: e.target.value })}
              className="crm-input"
            />
          </label>
          <label>
            กำไร / Margin
            <input
              value={form.profit_margin ?? ''}
              onChange={(e) => setForm({ ...form, profit_margin: e.target.value })}
              className="crm-input"
            />
          </label>
          <label>
            คอมมิชชั่น
            <input
              value={form.commission_info ?? ''}
              onChange={(e) => setForm({ ...form, commission_info: e.target.value })}
              className="crm-input"
            />
          </label>
          <label>
            เป้า ROI
            <input
              type="number"
              value={form.target_roi ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  target_roi: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="crm-input"
            />
          </label>
          <label>
            งบแอด / วัน (บาท)
            <input
              type="number"
              value={form.daily_ad_budget ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  daily_ad_budget: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="crm-input"
            />
          </label>
          <label className="qt-form__full">
            คอนเทนต์ที่มีอยู่
            <textarea
              rows={2}
              value={form.existing_content ?? ''}
              onChange={(e) => setForm({ ...form, existing_content: e.target.value })}
              className="crm-input"
            />
          </label>
          <label>
            บัญชี Ads
            <textarea
              rows={2}
              value={form.ads_account_info ?? ''}
              onChange={(e) => setForm({ ...form, ads_account_info: e.target.value })}
              className="crm-input"
            />
          </label>
          <label>
            Seller Center
            <textarea
              rows={2}
              value={form.seller_account_info ?? ''}
              onChange={(e) => setForm({ ...form, seller_account_info: e.target.value })}
              className="crm-input"
            />
          </label>
          <label className="qt-form__full">
            Business Center
            <textarea
              rows={2}
              value={form.business_center_info ?? ''}
              onChange={(e) => setForm({ ...form, business_center_info: e.target.value })}
              className="crm-input"
            />
          </label>
          <label className="qt-form__full">
            หมายเหตุ
            <textarea
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="crm-input"
            />
          </label>
        </fieldset>
        {canEditBrief && (
          <div className="crm-form__actions">
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              disabled={saving}
              onClick={() => void handleSaveForm()}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบรีฟ'}
            </button>
          </div>
        )}
      </section>

      <section id="owners" className="card card--wide onboarding-owners-card">
        <h2 className="crm-section-title">มอบหมายผู้ดูแล</h2>
        <p className="onboarding-owners-hint muted">
          ทำหลัง checklist ครบ — Account ดูแลลูกค้า · ทีมยิงแอดเห็นแบรนด์ในเมนูงานยิงแอด
        </p>

        {ownersSuccess && (
          <p className="crm-banner onboarding-owners-success">บันทึกผู้ดูแลแล้ว</p>
        )}

        {assigneesLoading && <p className="muted">กำลังโหลดรายชื่อพนักงาน...</p>}

        {!assigneesLoading && assignees.length === 0 && canAssignOwners && (
          <p className="crm-error">ไม่พบรายชื่อพนักงาน — ตรวจสอบการเชื่อมต่อหรือสิทธิ์อ่าน profiles</p>
        )}

        {!canAssignOwners ? (
          <dl className="onboarding-owners-readonly">
            <dt>ผู้ดูแล Account</dt>
            <dd>{ownerLabel(accountOptions, accountOwnerId)}</dd>
            <dt>ทีมยิงแอด</dt>
            <dd>{ownerLabel(adsOptions, adsOwnerId)}</dd>
          </dl>
        ) : (
          <div className="onboarding-owners-row">
            <label>
              ผู้ดูแล Account
              <select
                className="crm-select"
                value={accountOwnerId}
                disabled={assigneesLoading || savingOwners}
                onChange={(e) => {
                  setAccountOwnerId(e.target.value)
                  setOwnersSuccess(false)
                }}
              >
                <option value="">— ยังไม่ระบุ —</option>
                {accountOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ทีมยิงแอด
              <select
                className="crm-select"
                value={adsOwnerId}
                disabled={assigneesLoading || savingOwners}
                onChange={(e) => {
                  setAdsOwnerId(e.target.value)
                  setOwnersSuccess(false)
                }}
              >
                <option value="">— ยังไม่ระบุ —</option>
                {adsOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="onboarding-owners-actions">
              <button
                type="button"
                className="crm-btn crm-btn--primary"
                disabled={assigneesLoading || savingOwners || assignees.length === 0}
                onClick={() => void handleSaveOwners()}
              >
                {savingOwners ? 'กำลังบันทึก...' : 'บันทึกผู้ดูแล'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
