import { useCallback, useEffect, useState } from 'react'
import { getOnboardingDetail, saveOnboardingForm } from '../../onboarding/api/onboarding'
import type { OnboardingFormInput } from '../../onboarding/types'
import { ClientPreviewBar } from '../components/ClientPreviewBar'
import { useClientWorkspace } from '../hooks/useClientWorkspace'
import '../../crm/crm.css'
import '../../onboarding/onboarding.css'
import '../client-workspace.css'

const STEPS = ['ข้อมูลร้าน', 'สินค้า & ราคา', 'เป้าหมายแอด', 'หมายเหตุ'] as const

const emptyForm = (): OnboardingFormInput => ({
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

export function ClientBriefPage() {
  const ws = useClientWorkspace()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<OnboardingFormInput>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const loadBrief = useCallback(async (customerId: string) => {
    const detail = await getOnboardingDetail(customerId)
    if (detail?.form) {
      setForm({
        tiktok_shop_url: detail.form.tiktok_shop_url ?? '',
        product_links: detail.form.product_links ?? '',
        pricing_info: detail.form.pricing_info ?? '',
        promotion_info: detail.form.promotion_info ?? '',
        profit_margin: detail.form.profit_margin ?? '',
        commission_info: detail.form.commission_info ?? '',
        target_roi: detail.form.target_roi,
        daily_ad_budget: detail.form.daily_ad_budget,
        existing_content: detail.form.existing_content ?? '',
        ads_account_info: detail.form.ads_account_info ?? '',
        seller_account_info: detail.form.seller_account_info ?? '',
        business_center_info: detail.form.business_center_info ?? '',
        notes: detail.form.notes ?? '',
      })
    } else {
      setForm(emptyForm())
    }
  }, [])

  useEffect(() => {
    if (ws.customerId) void loadBrief(ws.customerId)
  }, [ws.customerId, loadBrief])

  async function handleSave() {
    if (!ws.customerId) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await saveOnboardingForm(ws.customerId, form)
      setSaveMsg('บันทึกบรีฟแล้ว — ทีม Account จะตรวจความครบถ้วน')
      await ws.reload()
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (ws.loading) {
    return <p className="muted">กำลังโหลดบรีฟ...</p>
  }

  if (!ws.customerId) {
    return (
      <div className="page">
        <h1>บรีฟงาน</h1>
        <ClientPreviewBar
          configured={ws.configured}
          canPreview={ws.canPreview}
          customers={ws.customers}
          previewId={ws.previewId}
          onPreviewChange={ws.setPreviewId}
          data={null}
          error={ws.error}
          isClientOnly={ws.isClientOnly}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>บรีฟงาน</h1>
        <p className="muted">กรอกทีละขั้น — บันทึกได้ตลอด (Draft)</p>
      </header>

      <ClientPreviewBar
        configured={ws.configured}
        canPreview={ws.canPreview}
        customers={ws.customers}
        previewId={ws.previewId}
        onPreviewChange={ws.setPreviewId}
        data={ws.data}
        error={ws.error}
        isClientOnly={ws.isClientOnly}
      />

      <div className="client-brief-steps" role="list">
        {STEPS.map((label, i) => (
          <span
            key={label}
            role="listitem"
            className={`client-brief-step${i <= step ? ' client-brief-step--done' : ''}`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      <section className="card card--wide crm-form">
        {step === 0 && (
          <>
            <label className="task-field">
              <span className="task-field__label">ลิงก์ TikTok Shop</span>
              <input
                className="task-input"
                value={form.tiktok_shop_url ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, tiktok_shop_url: e.target.value }))}
              />
            </label>
            <label className="task-field">
              <span className="task-field__label">ลิงก์สินค้า (หลายบรรทัดได้)</span>
              <textarea
                className="task-textarea"
                rows={4}
                value={form.product_links ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, product_links: e.target.value }))}
              />
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <label className="task-field">
              <span className="task-field__label">ราคา / โปรโมชัน</span>
              <textarea
                className="task-textarea"
                rows={2}
                value={form.pricing_info ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pricing_info: e.target.value }))}
              />
            </label>
            <label className="task-field">
              <span className="task-field__label">โปรที่ต้องการดัน</span>
              <input
                className="task-input"
                value={form.promotion_info ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, promotion_info: e.target.value }))}
              />
            </label>
            <label className="task-field">
              <span className="task-field__label">กำไร / ต้นทุน / คอมมิชชั่น</span>
              <input
                className="task-input"
                value={form.profit_margin ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, profit_margin: e.target.value }))}
              />
              <input
                className="task-input"
                style={{ marginTop: '0.5rem' }}
                value={form.commission_info ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, commission_info: e.target.value }))}
              />
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <label className="task-field">
              <span className="task-field__label">งบแอดต่อวัน (บาท)</span>
              <input
                className="task-input"
                type="number"
                value={form.daily_ad_budget ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    daily_ad_budget: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </label>
            <label className="task-field">
              <span className="task-field__label">เป้าหมาย ROI</span>
              <input
                className="task-input"
                type="number"
                step="0.1"
                value={form.target_roi ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    target_roi: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </label>
            <label className="task-field">
              <span className="task-field__label">คลิปที่มีอยู่</span>
              <textarea
                className="task-textarea"
                rows={3}
                value={form.existing_content ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, existing_content: e.target.value }))}
              />
            </label>
          </>
        )}
        {step === 3 && (
          <label className="task-field">
            <span className="task-field__label">หมายเหตุ / ปัญหาปัจจุบัน</span>
            <textarea
              className="task-textarea"
              rows={4}
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
        )}

        <div className="crm-form__actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {step > 0 && (
            <button type="button" className="crm-btn" onClick={() => setStep((s) => s - 1)}>
              ย้อนกลับ
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="crm-btn crm-btn--primary" onClick={() => setStep((s) => s + 1)}>
              ถัดไป
            </button>
          ) : (
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? 'กำลังบันทึก...' : 'ส่งบรีฟ'}
            </button>
          )}
          <button type="button" className="crm-btn" disabled={saving} onClick={() => void handleSave()}>
            บันทึก Draft
          </button>
        </div>
        {saveMsg && <p className="muted">{saveMsg}</p>}
      </section>
    </div>
  )
}
