import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasDbPrivilegedRole } from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { auditActionLabel } from '../constants'
import { listAuditLogs, type AuditLogRow } from '../api/auditLogs'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../admin.css'

export function AdminAuditPage() {
  const { profile, configured } = useAuth()
  const canView = hasDbPrivilegedRole(profile?.roles ?? []) || !configured

  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listAuditLogs())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!canView) {
    return (
      <div className="page">
        <p className="crm-error">ไม่มีสิทธิ์ดู audit log</p>
      </div>
    )
  }

  return (
    <div className="page admin-page">
      <header className="page__header admin-page__header">
        <div>
          <Link to="/app/admin" className="crm-back">
            ← จัดการผู้ใช้
          </Link>
          <h1>Audit Log</h1>
          <p className="muted">บันทึกการเปลี่ยนแปลงสำคัญในระบบ</p>
        </div>
        <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
          รีเฟรช
        </button>
      </header>

      <section className="card card--wide">
        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && (
          <div className="crm-table-wrap">
            <table className="admin-user-table admin-audit-table">
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>ผู้ทำ</th>
                  <th>การกระทำ</th>
                  <th>เป้าหมาย</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatBangkokDateTime(row.created_at)}</td>
                    <td>
                      {row.actor_name || row.actor_email || '—'}
                      {row.actor_email && row.actor_name && (
                        <>
                          <br />
                          <small className="muted">{row.actor_email}</small>
                        </>
                      )}
                    </td>
                    <td>
                      <strong>{auditActionLabel(row.action)}</strong>
                      <br />
                      <code className="admin-audit-code">{row.action}</code>
                    </td>
                    <td>
                      <span className="muted">{row.entity_type}</span>
                      {row.entity_id && (
                        <>
                          <br />
                          <small>{row.entity_id.slice(0, 8)}…</small>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="muted">ยังไม่มีบันทึก</p>}
          </div>
        )}
      </section>
    </div>
  )
}
