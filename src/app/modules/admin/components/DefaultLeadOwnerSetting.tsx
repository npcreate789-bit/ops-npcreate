import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getDefaultLeadOwnerSetting,
  listSalesLeadOwnerOptions,
  setDefaultLeadOwnerSetting,
} from '../api/platformSettings'
import type { DefaultLeadOwnerSetting, LeadOwnerOption } from '../types'

interface DefaultLeadOwnerSettingProps {
  actorId: string
  disabled?: boolean
}

export function DefaultLeadOwnerSettingCard({
  actorId,
  disabled = false,
}: DefaultLeadOwnerSettingProps) {
  const [sales, setSales] = useState<LeadOwnerOption[]>([])
  const [setting, setSetting] = useState<DefaultLeadOwnerSetting | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [options, current] = await Promise.all([
        listSalesLeadOwnerOptions(),
        getDefaultLeadOwnerSetting(),
      ])
      setSales(options)
      setSetting(current)
      setSelectedId(current.ownerId ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดการตั้งค่าไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave() {
    if (!selectedId) {
      setError('เลือก Sales ที่จะรับ Lead หรือกดใช้ระบบอัตโนมัติ')
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const next = await setDefaultLeadOwnerSetting(selectedId, actorId)
      setSetting(next)
      setMessage('บันทึกแล้ว — Lead จากฟอร์มติดต่อจะมอบให้ Sales คนนี้')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleUseAuto() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const next = await setDefaultLeadOwnerSetting(null, actorId)
      setSetting(next)
      setSelectedId('')
      setMessage('ใช้ Sales คนแรกที่ active อัตโนมัติ')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card card--wide admin-platform-card">
      <h2 className="crm-section-title">ฟอร์มติดต่อสาธารณะ (/contact)</h2>
      <p className="muted admin-platform-intro">
        กำหนด Sales ที่รับ Lead อัตโนมัติจากหน้า{' '}
        <Link to="/contact" target="_blank" rel="noreferrer">
          /contact
        </Link>
        — ถ้าไม่ตั้ง ระบบเลือก Sales active คนแรก
      </p>

      {error && <p className="crm-error">{error}</p>}
      {message && <p className="admin-platform-ok">{message}</p>}

      {loading ? (
        <p className="muted">กำลังโหลด...</p>
      ) : sales.length === 0 ? (
        <p className="crm-error">
          ยังไม่มีผู้ใช้บทบาท Sales — สร้างพนักงาน Sales ก่อน หรือมอบบทบาท sales ให้ผู้ใช้ที่มีอยู่
        </p>
      ) : (
        <>
          <p className="admin-platform-current">
            {setting?.usesAutoFallback ? (
              <>
                <strong>ปัจจุบัน:</strong> อัตโนมัติ (Sales คนแรกที่ active)
                {setting.invalidOwnerId && (
                  <span className="crm-error">
                    {' '}
                    — ค่าเดิมในฐานข้อมูลไม่ถูกต้อง กรุณาบันทึกใหม่
                  </span>
                )}
              </>
            ) : (
              <>
                <strong>ปัจจุบัน:</strong> {setting?.ownerLabel ?? '—'}
              </>
            )}
          </p>

          <label className="task-field admin-platform-field">
            <span className="task-field__label">Sales รับ Lead</span>
            <select
              className="task-select"
              value={selectedId}
              disabled={disabled || saving}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">— เลือก Sales —</option>
              {sales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.login_id} ({s.login_id})
                </option>
              ))}
            </select>
          </label>

          <div className="admin-platform-actions">
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              disabled={disabled || saving || !selectedId}
              onClick={() => void handleSave()}
            >
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </button>
            <button
              type="button"
              className="crm-btn crm-btn--ghost"
              disabled={disabled || saving}
              onClick={() => void handleUseAuto()}
            >
              ใช้ระบบอัตโนมัติ
            </button>
          </div>
        </>
      )}
    </section>
  )
}
