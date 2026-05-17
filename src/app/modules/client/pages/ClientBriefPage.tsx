import { useCallback, useEffect, useRef, useState } from 'react'
import { getOnboardingDetail } from '../../onboarding/api/onboarding'
import type { OnboardingFormInput } from '../../onboarding/types'
import {
  deleteBriefAttachment,
  getBriefFileUrl,
  listBriefAttachments,
  uploadBriefFile,
  validateBriefFile,
  type BriefAttachment,
} from '../api/briefFiles'
import { saveClientBrief } from '../api/clientBrief'
import { saveOnboardingForm } from '../../onboarding/api/onboarding'
import { ClientPreviewBar } from '../components/ClientPreviewBar'
import { useClientWorkspace } from '../hooks/useClientWorkspace'
import '../../crm/crm.css'
import '../../onboarding/onboarding.css'
import '../client-workspace.css'

const STEPS = ['ข้อมูลร้าน', 'สินค้า & ราคา', 'เป้าหมายแอด', 'ไฟล์แนบ & หมายเหตุ'] as const

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

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ClientBriefPage() {
  const ws = useClientWorkspace()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<OnboardingFormInput>(emptyForm())
  const [attachments, setAttachments] = useState<BriefAttachment[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const loadBrief = useCallback(async (customerId: string) => {
    const [detail, files] = await Promise.all([
      getOnboardingDetail(customerId),
      listBriefAttachments(customerId),
    ])
    setAttachments(files)
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

  async function persist(submit: boolean) {
    if (!ws.customerId) return
    setSaving(true)
    setSaveMsg(null)
    try {
      if (ws.isClientOnly) {
        await saveClientBrief(ws.customerId, form, submit)
      } else {
        await saveOnboardingForm(ws.customerId, form)
      }
      setSaveMsg(
        submit
          ? 'ส่งบรีฟแล้ว — ทีม Account ได้รับแจ้งเตือนและจะตรวจความครบถ้วน'
          : 'บันทึก Draft แล้ว',
      )
      await ws.reload()
      await loadBrief(ws.customerId)
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleFilePick(file: File | null) {
    if (!file || !ws.customerId) return
    const err = validateBriefFile(file)
    if (err) {
      setFileError(err)
      return
    }
    setFileError(null)
    setUploading(true)
    try {
      const row = await uploadBriefFile(ws.customerId, file)
      setAttachments((prev) => [row, ...prev])
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleOpenFile(row: BriefAttachment) {
    try {
      const url = await getBriefFileUrl(row.storage_path)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'เปิดไฟล์ไม่สำเร็จ')
    }
  }

  async function handleDeleteFile(row: BriefAttachment) {
    if (!window.confirm(`ลบไฟล์ ${row.file_name}?`)) return
    setUploading(true)
    setFileError(null)
    try {
      await deleteBriefAttachment(row)
      setAttachments((prev) => prev.filter((a) => a.id !== row.id))
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    } finally {
      setUploading(false)
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
        <p className="muted">กรอกทีละขั้น — บันทึก Draft ได้ตลอด · กดส่งบรีฟเมื่อพร้อม</p>
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
          <button
            key={label}
            type="button"
            role="listitem"
            className={`client-brief-step${i === step ? ' client-brief-step--active' : ''}${i < step ? ' client-brief-step--done' : ''}`}
            onClick={() => setStep(i)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <section className="card card--wide crm-form client-brief-form">
        {step === 0 && (
          <>
            <label className="client-field">
              <span className="client-field__label">ลิงก์ TikTok Shop</span>
              <input
                className="client-field__input"
                type="url"
                placeholder="https://..."
                value={form.tiktok_shop_url ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, tiktok_shop_url: e.target.value }))}
              />
            </label>
            <label className="client-field">
              <span className="client-field__label">ลิงก์สินค้า (หลายบรรทัดได้)</span>
              <textarea
                className="client-field__input client-field__textarea"
                rows={4}
                placeholder="วางลิงก์สินค้าแต่ละ SKU"
                value={form.product_links ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, product_links: e.target.value }))}
              />
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <label className="client-field">
              <span className="client-field__label">ราคา / โปรโมชัน</span>
              <textarea
                className="client-field__input client-field__textarea"
                rows={2}
                value={form.pricing_info ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pricing_info: e.target.value }))}
              />
            </label>
            <label className="client-field">
              <span className="client-field__label">โปรที่ต้องการดัน</span>
              <input
                className="client-field__input"
                value={form.promotion_info ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, promotion_info: e.target.value }))}
              />
            </label>
            <label className="client-field">
              <span className="client-field__label">กำไร / ต้นทุน</span>
              <input
                className="client-field__input"
                value={form.profit_margin ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, profit_margin: e.target.value }))}
              />
            </label>
            <label className="client-field">
              <span className="client-field__label">คอมมิชชั่น</span>
              <input
                className="client-field__input"
                value={form.commission_info ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, commission_info: e.target.value }))}
              />
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <label className="client-field">
              <span className="client-field__label">งบแอดต่อวัน (บาท)</span>
              <input
                className="client-field__input"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.daily_ad_budget ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    daily_ad_budget: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </label>
            <label className="client-field">
              <span className="client-field__label">เป้าหมาย ROI</span>
              <input
                className="client-field__input"
                type="number"
                step="0.1"
                min={0}
                value={form.target_roi ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    target_roi: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </label>
            <label className="client-field">
              <span className="client-field__label">คลิป / คอนเทนต์ที่มีอยู่</span>
              <textarea
                className="client-field__input client-field__textarea"
                rows={3}
                value={form.existing_content ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, existing_content: e.target.value }))}
              />
            </label>
          </>
        )}
        {step === 3 && (
          <>
            <label className="client-field">
              <span className="client-field__label">หมายเหตุ / ปัญหาปัจจุบัน</span>
              <textarea
                className="client-field__input client-field__textarea"
                rows={4}
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>

            <div className="client-brief-files">
              <div className="client-brief-files__head">
                <span className="client-field__label">ไฟล์แนบ (รูป, PDF, Excel)</span>
                <button
                  type="button"
                  className="crm-btn crm-btn--ghost crm-btn--sm"
                  disabled={uploading || saving}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? 'กำลังอัปโหลด...' : '+ เลือกไฟล์'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="client-brief-files__input"
                  accept="image/jpeg,image/png,image/webp,application/pdf,.xlsx,.xls,text/plain"
                  onChange={(e) => void handleFilePick(e.target.files?.[0] ?? null)}
                />
              </div>
              <p className="client-field__hint muted">สูงสุด 50 MB ต่อไฟล์</p>
              {fileError && (
                <p className="client-brief-files__error" role="alert">
                  {fileError}
                </p>
              )}
              {attachments.length === 0 ? (
                <p className="muted">ยังไม่มีไฟล์แนบ</p>
              ) : (
                <ul className="client-brief-files__list">
                  {attachments.map((row) => (
                    <li key={row.id} className="client-brief-files__item">
                      <div>
                        <strong>{row.file_name}</strong>
                        <span className="muted"> · {formatFileSize(row.byte_size)}</span>
                      </div>
                      <div className="client-brief-files__actions">
                        <button
                          type="button"
                          className="crm-btn crm-btn--ghost crm-btn--sm"
                          onClick={() => void handleOpenFile(row)}
                        >
                          เปิด
                        </button>
                        {ws.isClientOnly && (
                          <button
                            type="button"
                            className="crm-btn crm-btn--ghost crm-btn--sm"
                            disabled={uploading}
                            onClick={() => void handleDeleteFile(row)}
                          >
                            ลบ
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <div
          className="crm-form__actions client-brief-form__actions"
          style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
        >
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
              disabled={saving || uploading}
              onClick={() => void persist(true)}
            >
              {saving ? 'กำลังส่ง...' : 'ส่งบรีฟ'}
            </button>
          )}
          <button
            type="button"
            className="crm-btn"
            disabled={saving || uploading}
            onClick={() => void persist(false)}
          >
            บันทึก Draft
          </button>
        </div>

        {saveMsg && (
          <p className={saveMsg.includes('ไม่สำเร็จ') ? 'crm-error' : 'client-brief-form__msg'} role="status">
            {saveMsg}
          </p>
        )}
      </section>
    </div>
  )
}
