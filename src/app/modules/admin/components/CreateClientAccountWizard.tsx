import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { appUrl } from '../../../../shared/config/appUrl'
import { loginPathForAudience } from '../../../../shared/auth/postLoginPath'
import { normalizeLoginId, validateLoginId } from '../../../../shared/auth/loginId'
import { checkLoginIdAvailable } from '../api/createEmployee'
import { createClientPortalUser, listCustomersForClientWizard } from '../api/clientWizard'
import { canCreateEmployeeUser } from '../access'
import type { AppRole } from '../../../../shared/types/roles'
import type { ClientWizardCustomer, CreateClientResult } from '../types'
import '../admin.css'

interface CreateClientAccountWizardProps {
  creatorRoles: AppRole[]
  configured: boolean
  onCreated: () => void
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text)
}

export function CreateClientAccountWizard({
  creatorRoles,
  configured,
  onCreated,
}: CreateClientAccountWizardProps) {
  const canCreate = canCreateEmployeeUser(creatorRoles) || !configured

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [customers, setCustomers] = useState<ClientWizardCustomer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [customerId, setCustomerId] = useState('')
  const [loginId, setLoginId] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<CreateClientResult | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    listCustomersForClientWizard()
      .then((rows) => {
        if (!cancelled) setCustomers(rows)
      })
      .catch(() => {
        if (!cancelled) setCustomers([])
      })
      .finally(() => {
        if (!cancelled) setLoadingCustomers(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  )

  const availableCustomers = useMemo(
    () => customers.filter((c) => !c.has_portal),
    [customers],
  )

  if (!canCreate) return null

  function resetWizard() {
    setStep(1)
    setCustomerId('')
    setLoginId('')
    setFullName('')
    setError(null)
    setSuccess(null)
    setCopied(false)
  }

  function goStep2() {
    setError(null)
    if (!customerId) {
      setError('กรุณาเลือกลูกค้า')
      return
    }
    if (selectedCustomer?.has_portal) {
      setError('ลูกค้ารายนี้มีบัญชีพอร์ทัลแล้ว')
      return
    }
    if (!fullName.trim() && selectedCustomer?.contact_name) {
      setFullName(selectedCustomer.contact_name)
    }
    setStep(2)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const idError = validateLoginId(loginId)
    if (idError) {
      setError(idError)
      return
    }

    const name = fullName.trim()
    if (!name) {
      setError('กรุณากรอกชื่อผู้ใช้งาน')
      return
    }

    if (!customerId) {
      setError('กรุณาเลือกลูกค้า')
      return
    }

    setSubmitting(true)
    try {
      const normalized = normalizeLoginId(loginId)
      const available = await checkLoginIdAvailable(normalized)
      if (!available) {
        setError('รหัสผู้ใช้นี้ถูกใช้แล้ว')
        return
      }

      const result = await createClientPortalUser({
        login_id: normalized,
        full_name: name,
        customer_id: customerId,
      })

      setSuccess(result)
      setStep(3)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างบัญชีไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  function buildClientMessage(result: CreateClientResult): string {
    const loginUrl = appUrl(loginPathForAudience('client'))
    return [
      `บัญชีพื้นที่ลูกค้า — ${result.brand_name}`,
      `เข้าสู่ระบบ: ${loginUrl}`,
      `รหัสผู้ใช้: ${result.login_id}`,
      `รหัสผ่านชั่วคราว: ${result.temporary_password}`,
      '',
      'กรุณาเปลี่ยนรหัสผ่านหลัง login ครั้งแรก',
    ].join('\n')
  }

  return (
    <section className="admin-client-wizard">
      <h2 className="crm-section-title">สร้างบัญชีลูกค้า (พอร์ทัล)</h2>
      <p className="muted admin-client-wizard__intro">
        Wizard 3 ขั้น — เลือกแบรนด์ กำหนดรหัสผู้ใช้ แล้วส่งข้อมูลเข้าใช้ให้ลูกค้า
      </p>

      <ol className="admin-client-wizard__steps" aria-label="ขั้นตอน">
        <li className={step >= 1 ? 'is-active' : ''}>เลือกลูกค้า</li>
        <li className={step >= 2 ? 'is-active' : ''}>บัญชีเข้าใช้</li>
        <li className={step >= 3 ? 'is-active' : ''}>ส่งมอบ</li>
      </ol>

      {error && (
        <p className="crm-error" role="alert">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="admin-client-wizard__panel">
          {loadingCustomers ? (
            <p className="muted">กำลังโหลดรายชื่อลูกค้า...</p>
          ) : availableCustomers.length === 0 ? (
            <p className="muted">
              ไม่มีลูกค้าที่ยังไม่มีบัญชีพอร์ทัล — สร้างลูกค้าใน CRM/Sales ก่อน หรือจัดการในตารางด้านล่าง
            </p>
          ) : (
            <label className="task-field">
              <span className="task-field__label">ลูกค้า / แบรนด์ *</span>
              <select
                className="task-select"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value)
                  const picked = availableCustomers.find((c) => c.id === e.target.value)
                  if (picked?.contact_name) setFullName(picked.contact_name)
                }}
              >
                <option value="">— เลือกลูกค้า —</option>
                {availableCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.brand_name}
                    {c.contact_name ? ` (${c.contact_name})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedCustomer && (
            <dl className="admin-client-wizard__summary">
              <div>
                <dt>สถานะสัญญา</dt>
                <dd>{selectedCustomer.status}</dd>
              </div>
            </dl>
          )}

          <div className="admin-client-wizard__actions">
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              disabled={!customerId || loadingCustomers}
              onClick={goStep2}
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form className="admin-client-wizard__panel" onSubmit={(e) => void handleSubmit(e)}>
          {selectedCustomer && (
            <p className="admin-client-wizard__picked">
              แบรนด์: <strong>{selectedCustomer.brand_name}</strong>
              <button
                type="button"
                className="crm-btn crm-btn--ghost crm-btn--sm"
                onClick={() => setStep(1)}
              >
                เปลี่ยน
              </button>
            </p>
          )}

          <div className="crm-form__grid admin-create-employee__grid">
            <label className="task-field">
              <span className="task-field__label">รหัสผู้ใช้ลูกค้า *</span>
              <input
                className="crm-input"
                value={loginId}
                onChange={(e) => setLoginId(normalizeLoginId(e.target.value))}
                placeholder="เช่น brandabc"
                minLength={3}
                maxLength={32}
                required
                autoComplete="off"
              />
              <span className="muted admin-client-wizard__hint">
                ใช้ตัวพิมพ์เล็ก a-z, ตัวเลข, . _ - — ลูกค้า login ที่หน้า &quot;พื้นที่ลูกค้า&quot;
              </span>
            </label>

            <label className="task-field">
              <span className="task-field__label">ชื่อที่แสดง *</span>
              <input
                className="crm-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ชื่อผู้ติดต่อ / แบรนด์"
                maxLength={120}
                required
              />
            </label>
          </div>

          <div className="admin-client-wizard__actions">
            <button type="button" className="crm-btn" onClick={() => setStep(1)}>
              ย้อนกลับ
            </button>
            <button type="submit" className="crm-btn crm-btn--primary" disabled={submitting}>
              {submitting ? 'กำลังสร้าง…' : 'สร้างบัญชีลูกค้า'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && success && (
        <div className="admin-client-wizard__panel admin-temp-password-box crm-banner crm-banner--ok">
          <h3>พร้อมส่งมอบให้ลูกค้า</h3>
          <p>
            บัญชี <strong>{success.brand_name}</strong> — รหัสผู้ใช้{' '}
            <code>{success.login_id}</code>
          </p>
          <dl className="admin-temp-password-box__credentials">
            <dt>ลิงก์เข้าใช้ (ลูกค้า)</dt>
            <dd>
              <a
                href={appUrl(loginPathForAudience('client'))}
                target="_blank"
                rel="noreferrer"
              >
                {appUrl(loginPathForAudience('client'))}
              </a>
            </dd>
            <dt>รหัสผ่านชั่วคราว</dt>
            <dd>
              <code className="admin-temp-password-box__secret">{success.temporary_password}</code>
            </dd>
          </dl>
          <div className="admin-client-wizard__actions">
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              onClick={() => {
                copyText(buildClientMessage(success))
                setCopied(true)
              }}
            >
              {copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความส่งลูกค้า'}
            </button>
            <button type="button" className="crm-btn" onClick={resetWizard}>
              สร้างบัญชีถัดไป
            </button>
          </div>
          <p className="muted admin-temp-password-box__note">
            ลูกค้าต้องเปลี่ยนรหัสผ่านหลัง login ครั้งแรก — CEO ดูรหัสชั่วคราวได้ในตารางผู้ใช้
          </p>
        </div>
      )}
    </section>
  )
}
