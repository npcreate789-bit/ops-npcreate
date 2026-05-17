import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canAccessNotifications } from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  syncNotifications,
} from '../api/notifications'
import { isLeadNotification } from '../leadNotification'
import type { UserNotification } from '../types'
import {
  isNotificationSoundEnabled,
  playLeadNotificationSound,
  playNotificationSound,
  setNotificationSoundEnabled,
} from '../notificationSound'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../notifications.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function NotificationsPage() {
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const allowed = canAccessNotifications(roles) || !configured

  const [rows, setRows] = useState<UserNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [soundEnabled, setSoundEnabled] = useState(() => isNotificationSoundEnabled())

  const load = useCallback(async () => {
    if (!allowed) return
    setLoading(true)
    setError(null)
    try {
      await syncNotifications(userId, roles)
      setRows(await listNotifications(userId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [userId, roles, allowed])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRefresh() {
    setSyncing(true)
    setError(null)
    const beforeLeadKeys = new Set(
      rows.filter((n) => !n.read_at && isLeadNotification(n.dedupe_key)).map((n) => n.dedupe_key),
    )
    try {
      await syncNotifications(userId, roles)
      const next = await listNotifications(userId)
      const newLeadAlerts = next.filter(
        (n) => !n.read_at && isLeadNotification(n.dedupe_key) && !beforeLeadKeys.has(n.dedupe_key),
      )
      if (soundEnabled && newLeadAlerts.length > 0) {
        playLeadNotificationSound()
      }
      setRows(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ซิงก์ไม่สำเร็จ')
    } finally {
      setSyncing(false)
    }
  }

  function handleSoundToggle(e: ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked
    setSoundEnabled(checked)
    setNotificationSoundEnabled(checked)
    if (checked) playNotificationSound()
  }

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(userId, id)
      setRows((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead(userId)
      setRows((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at ?? new Date().toISOString(),
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    }
  }

  const visible = filter === 'unread' ? rows.filter((n) => !n.read_at) : rows
  const unreadCount = rows.filter((n) => !n.read_at).length

  if (!allowed) {
    return (
      <div className="page">
        <header className="page__header">
          <h1>แจ้งเตือน</h1>
        </header>
        <p className="crm-error">บัญชีลูกค้าไม่สามารถเข้าถึงแจ้งเตือนภายในได้</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>แจ้งเตือน</h1>
          <p className="muted">
            สรุปงานค้างและเหตุการณ์สำคัญ — อัปเดตอัตโนมัติจากข้อมูลในระบบ
          </p>
        </div>
        <div className="notif-header-actions">
          <button
            type="button"
            className="crm-btn crm-btn--ghost"
            disabled={syncing}
            onClick={() => void handleRefresh()}
          >
            {syncing ? 'กำลังซิงก์...' : 'ซิงก์ใหม่'}
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              onClick={() => void handleMarkAllRead()}
            >
              อ่านทั้งหมด
            </button>
          )}
        </div>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — แจ้งเตือนเก็บในเครื่อง
        </p>
      )}

      <section className="card card--wide">
        <div className="task-filters">
          <label className="task-field">
            <span className="task-field__label">แสดง</span>
            <select
              className="task-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
            >
              <option value="all">ทั้งหมด ({rows.length})</option>
              <option value="unread">ยังไม่อ่าน ({unreadCount})</option>
            </select>
          </label>
          <label className="notif-sound-toggle">
            <input type="checkbox" checked={soundEnabled} onChange={handleSoundToggle} />
            <span>เสียงแจ้งเตือน (Lead ใหม่วนจนกว่ากดรับทราบ)</span>
          </label>
          <button
            type="button"
            className="crm-btn crm-btn--ghost notif-sound-test"
            disabled={!soundEnabled}
            onClick={() => playNotificationSound()}
          >
            ทดสอบเสียง
          </button>
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && visible.length === 0 && (
          <p className="muted">ไม่มีแจ้งเตือน — ระบบจะสร้างใหม่เมื่อมีงานค้าง</p>
        )}

        {!loading && visible.length > 0 && (
          <ul className="notif-list">
            {visible.map((n) => (
              <li
                key={n.id}
                className={`notif-item notif-item--${n.severity}${n.read_at ? ' notif-item--read' : ''}`}
              >
                <div className="notif-item__main">
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  <small className="muted">
                    {formatBangkokDateTime(n.created_at)}
                    {n.read_at ? ' · อ่านแล้ว' : ''}
                  </small>
                </div>
                <div className="notif-item__actions">
                  {n.link && (
                    <Link
                      to={n.link}
                      className="crm-btn crm-btn--ghost"
                      onClick={() => {
                        if (!n.read_at) void handleMarkRead(n.id)
                      }}
                    >
                      ไปจัดการ
                    </Link>
                  )}
                  {!n.read_at && (
                    <button
                      type="button"
                      className="crm-btn crm-btn--ghost"
                      onClick={() => void handleMarkRead(n.id)}
                    >
                      {isLeadNotification(n.dedupe_key) ? 'รับทราบ' : 'ทำเครื่องหมายอ่านแล้ว'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
