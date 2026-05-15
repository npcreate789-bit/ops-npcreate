import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canAccessStaffAssistant } from '../../../../shared/auth/access'
import { listCustomersForSelect } from '../../finance/api/payments'
import type { CustomerOption } from '../../finance/types'
import { isStaffAssistantScoped, staffPromptOptionsForRoles } from '../access'
import { buildStaffReply, fetchStaffCustomerContext } from '../api/buildStaffReply'
import { logAssistantUsage } from '../api/usageLog'
import type { StaffPromptKey } from '../types'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../assistant.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function AssistantPage() {
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const allowed = canAccessStaffAssistant(roles) || !configured
  const promptOptions = useMemo(() => staffPromptOptionsForRoles(roles), [roles])
  const scoped = isStaffAssistantScoped(roles) && configured
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [promptKey, setPromptKey] = useState<StaffPromptKey>('crm_followup')
  const [customerId, setCustomerId] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!allowed || promptOptions.some((o) => o.value === promptKey)) return
    setPromptKey(promptOptions[0]?.value ?? 'crm_followup')
  }, [allowed, promptKey, promptOptions])

  useEffect(() => {
    if (!allowed) return
    listCustomersForSelect()
      .then(setCustomers)
      .catch(() => setCustomers([]))
  }, [allowed])

  const needsCustomer =
    promptKey === 'renewal_pitch' ||
    promptKey === 'onboarding_checkin' ||
    promptKey === 'ads_summary'

  async function handleGenerate() {
    if (promptOptions.length === 0) {
      setError('บทบาทของคุณยังไม่มีสิทธิ์ใช้เทมเพลตผู้ช่วย')
      return
    }
    if (needsCustomer && !customerId) {
      setError('เทมเพลตนี้ต้องเลือกลูกค้าก่อนสร้างข้อความ')
      return
    }

    setLoading(true)
    setError(null)
    setCopied(false)
    try {
      const customer = customerId ? await fetchStaffCustomerContext(customerId) : null
      if (customerId && !customer) {
        setError('ไม่พบลูกค้าหรือไม่มีสิทธิ์ดูข้อมูลลูกค้านี้')
        return
      }
      const text = buildStaffReply({
        promptKey,
        customer,
        userDisplayName: profile?.full_name ?? undefined,
      })
      setOutput(text)
      await logAssistantUsage(userId, 'staff', promptKey, customerId || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สร้างข้อความไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
    } catch {
      setError('คัดลอกไม่สำเร็จ')
    }
  }

  if (!allowed) {
    return (
      <div className="page">
        <h1>ผู้ช่วย AI</h1>
        <p className="crm-error">บัญชีลูกค้าไม่สามารถใช้ผู้ช่วยทีมภายในได้</p>
      </div>
    )
  }

  if (configured && promptOptions.length === 0) {
    return (
      <div className="page">
        <h1>ผู้ช่วย AI</h1>
        <p className="crm-error">บทบาทของคุณยังไม่มีสิทธิ์ใช้ผู้ช่วยทีมภายใน</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>ผู้ช่วย AI</h1>
          <p className="muted">
            สร้างข้อความและบรีฟจากเทมเพลต + ข้อมูลในระบบ — ไม่ส่งข้อมูลออกนอกองค์กร (ไม่ใช้ OpenAI)
          </p>
        </div>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ใช้ข้อมูลตัวอย่างเมื่อเลือกลูกค้า</p>
      )}

      {scoped && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          แสดงเฉพาะเทมเพลตตามบทบาทของคุณ — รายชื่อลูกค้าถูกกรองตามสิทธิ์ในระบบ
        </p>
      )}

      <section className="card card--wide">
        <div className="task-filters">
          <label className="task-field">
            <span className="task-field__label">ประเภท</span>
            <select
              className="task-select"
              value={promptKey}
              onChange={(e) => setPromptKey(e.target.value as StaffPromptKey)}
            >
              {promptOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="task-field task-field--grow">
            <span className="task-field__label">
              ลูกค้า{needsCustomer ? ' (จำเป็น)' : ' (ไม่บังคับ)'}
            </span>
            <select
              className="task-select"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">— ไม่ระบุลูกค้า —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {customers.length === 0 && configured && (
          <p className="assistant-hint muted">
            ยังไม่มีลูกค้าในขอบเขตที่คุณเข้าถึงได้ — ลองเทมเพลตที่ไม่ต้องเลือกลูกค้า
          </p>
        )}

        <div className="assistant-actions">
          <button
            type="button"
            className="crm-btn crm-btn--primary"
            disabled={loading}
            onClick={() => void handleGenerate()}
          >
            {loading ? 'กำลังสร้าง...' : 'สร้างข้อความ'}
          </button>
          {output && (
            <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void handleCopy()}>
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </button>
          )}
        </div>

        {error && <p className="crm-error">{error}</p>}

        <label className="task-field task-field--full" style={{ marginTop: '0.75rem' }}>
          <span className="task-field__label">ข้อความที่สร้าง (แก้ไขก่อนส่งได้)</span>
          <textarea
            className="crm-input assistant-output"
            value={output}
            onChange={(e) => {
              setOutput(e.target.value)
              setCopied(false)
            }}
            placeholder="เลือกประเภทและกดสร้างข้อความ — ข้อความจะแสดงที่นี่"
            rows={12}
            disabled={loading}
          />
        </label>
      </section>
    </div>
  )
}
