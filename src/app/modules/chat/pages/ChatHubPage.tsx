import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canViewChatHub,
  hasTasksTeamView,
} from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { ProjectChatPanel } from '../components/ProjectChatPanel'
import { useChatInbox } from '../hooks/useChatInbox'
import '../../crm/crm.css'
import '../chat.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function ChatHubPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const userId = profile?.id ?? DEV_OWNER
  const canAccess = canViewChatHub(roles) || !configured
  const canCreateTask = hasTasksTeamView(roles) || !configured
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedProjectId = searchParams.get('project') ?? ''

  const { items, loading, error, totalUnread, reload } = useChatInbox(userId)

  const selected = useMemo(
    () => items.find((row) => row.project_id === selectedProjectId) ?? null,
    [items, selectedProjectId],
  )

  if (!canAccess) {
    return (
      <div className="page">
        <p className="crm-error">ไม่มีสิทธิ์เข้าถึงกล่องแชท</p>
      </div>
    )
  }

  return (
    <div className="page chat-hub-page">
      <header className="page__header chat-hub-page__header">
        <div>
          <h1>แชท</h1>
          <p className="muted">
            กล่องข้อความต่อโปรเจกต์ — {totalUnread > 0 ? `${totalUnread} ยังไม่อ่าน` : 'ทันกับลูกค้า'}
          </p>
        </div>
        <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void reload()}>
          รีเฟรช
        </button>
      </header>

      {error && <p className="crm-error">{error}</p>}

      <div className="chat-hub-layout">
        <aside className="card chat-hub-inbox">
          <h2 className="crm-section-title">ห้องสนทนา</h2>
          {loading && <p className="muted">กำลังโหลด...</p>}
          {!loading && items.length === 0 && (
            <p className="muted">ยังไม่มีแชท — เปิดแชทจากหน้าโปรเจกต์</p>
          )}
          <ul className="chat-hub-inbox__list">
            {items.map((row) => {
              const active = row.project_id === selectedProjectId
              return (
                <li key={row.room_id}>
                  <button
                    type="button"
                    className={`chat-hub-inbox__item${active ? ' chat-hub-inbox__item--active' : ''}`}
                    onClick={() => navigate(`/app/chat?project=${row.project_id}`)}
                  >
                    <span className="chat-hub-inbox__title">
                      {row.project_name}
                      {row.unread_count > 0 && (
                        <span className="chat-hub-inbox__badge">{row.unread_count}</span>
                      )}
                    </span>
                    <span className="chat-hub-inbox__brand muted">{row.brand_name}</span>
                    {row.last_message_body && (
                      <span className="chat-hub-inbox__preview">{row.last_message_body}</span>
                    )}
                    {row.last_message_at && (
                      <time className="chat-hub-inbox__time" dateTime={row.last_message_at}>
                        {formatBangkokDateTime(row.last_message_at)}
                      </time>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <div className="chat-hub-main">
          {!selectedProjectId && (
            <section className="card card--wide chat-hub-placeholder">
              <p className="muted">เลือกห้องแชทจากรายการ หรือไปที่</p>
              <Link to="/app/projects" className="crm-btn">
                รายการโปรเจกต์
              </Link>
            </section>
          )}

          {selected && (
            <>
              <p className="muted chat-hub-main__meta">
                <Link to={`/app/projects/${selected.project_id}`}>เปิดโปรเจกต์</Link>
                {' · '}
                <Link to={`/app/customers/${selected.customer_id}`}>{selected.brand_name}</Link>
              </p>
              <ProjectChatPanel
                projectId={selected.project_id}
                projectName={selected.project_name}
                customerId={selected.customer_id}
                userId={userId}
                canCreateTask={canCreateTask}
              />
            </>
          )}

          {selectedProjectId && !selected && !loading && (
            <section className="card card--wide">
              <p className="muted">ไม่พบห้องแชทของโปรเจกต์นี้</p>
              <Link to={`/app/projects/${selectedProjectId}`} className="crm-btn">
                ไปหน้าโปรเจกต์
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
