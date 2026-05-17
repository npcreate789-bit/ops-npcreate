import { Link } from 'react-router-dom'
import type { CustomerOption } from '../../finance/types'
import { PROJECT_SERVICE_OPTIONS } from '../constants'
import type { ProjectServiceType } from '../types'

export interface ProjectCreateFormProps {
  customers: CustomerOption[]
  customerId: string
  onCustomerIdChange: (id: string) => void
  presetCustomer?: CustomerOption
  presetCustomerId: string | null
  projectName: string
  onProjectNameChange: (name: string) => void
  serviceType: ProjectServiceType
  onServiceTypeChange: (type: ProjectServiceType) => void
  startDate: string
  onStartDateChange: (date: string) => void
  endDate: string
  onEndDateChange: (date: string) => void
  notes: string
  onNotesChange: (notes: string) => void
  saving: boolean
}

export function ProjectCreateForm({
  customers,
  customerId,
  onCustomerIdChange,
  presetCustomer,
  presetCustomerId,
  projectName,
  onProjectNameChange,
  serviceType,
  onServiceTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  notes,
  onNotesChange,
  saving,
}: ProjectCreateFormProps) {
  const lockedCustomer = Boolean(presetCustomerId)
  const canSubmit = Boolean(customerId && projectName.trim())

  return (
    <>
      <fieldset className="project-form__panel">
        <legend className="project-form__legend">
          <span className="project-form__step">1</span>
          ลูกค้า
        </legend>
        {lockedCustomer ? (
          <div className="project-form__customer-card">
            <div className="project-form__customer-card-body">
              <span className="project-form__customer-label">ลูกค้าที่เลือก</span>
              <strong>
                {presetCustomer?.brand_name ?? 'กำลังโหลดชื่อลูกค้า…'}
              </strong>
              <span className="muted project-form__customer-meta">จากลิงก์ Customer 360°</span>
            </div>
            <Link
              to={`/app/customers/${presetCustomerId}`}
              className="crm-btn crm-btn--ghost project-form__customer-link"
            >
              เปิด 360°
            </Link>
          </div>
        ) : (
          <label className="project-form__field">
            เลือกลูกค้า <span className="req">*</span>
            <select
              className="crm-select project-form__select"
              value={customerId}
              onChange={(e) => onCustomerIdChange(e.target.value)}
              required
            >
              <option value="">— เลือกลูกค้า —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand_name}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>

      <fieldset className="project-form__panel">
        <legend className="project-form__legend">
          <span className="project-form__step">2</span>
          รายละเอียดโปรเจกต์
        </legend>
        <div className="project-form__stack">
          <label className="project-form__field">
            ชื่อโปรเจกต์ <span className="req">*</span>
            <input
              className="crm-input project-form__input-lg"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              placeholder="เช่น GMV Max — ร้าน ABC"
              required
              autoFocus={Boolean(customerId)}
            />
          </label>

          <label className="project-form__field">
            ประเภทบริการ <span className="req">*</span>
            <div
              className="project-form__service-grid"
              role="radiogroup"
              aria-label="ประเภทบริการ"
            >
              {PROJECT_SERVICE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`project-form__service-chip${
                    serviceType === o.value ? ' project-form__service-chip--on' : ''
                  }`}
                  aria-pressed={serviceType === o.value}
                  onClick={() => onServiceTypeChange(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </label>
        </div>
      </fieldset>

      <details className="project-form__optional">
        <summary className="project-form__optional-summary">ตั้งค่าเพิ่มเติม (ไม่บังคับ)</summary>
        <div className="project-form__optional-body">
          <div className="crm-form__grid">
            <label className="project-form__field">
              วันเริ่ม
              <input
                className="crm-input"
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
            </label>
            <label className="project-form__field">
              วันสิ้นสุด
              <input
                className="crm-input"
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </label>
            <label className="crm-form__full project-form__field">
              หมายเหตุภายในทีม
              <textarea
                className="crm-input project-form__textarea"
                rows={3}
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="เป้าหมาย ข้อตกลง หรือสิ่งที่ต้องติดตาม..."
              />
            </label>
          </div>
        </div>
      </details>

      <div className="crm-form__actions project-form__actions--create">
        <Link to="/app/projects" className="crm-btn crm-btn--ghost">
          ยกเลิก
        </Link>
        <button
          type="submit"
          className="crm-btn crm-btn--primary"
          disabled={saving || !canSubmit}
        >
          {saving ? 'กำลังสร้าง...' : 'สร้างโปรเจกต์'}
        </button>
      </div>
    </>
  )
}
