import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canViewChatHub, hasTasksTeamView } from '../../../../shared/auth/access'
import { parseChatChannel } from '../constants/channels'
import { ChatInboxList } from '../components/ChatInboxList'
import { ProjectChatPanel } from '../components/ProjectChatPanel'
import { useChatInbox } from '../hooks/useChatInbox'
import type { ChatChannelKey } from '../types'
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
  const selectedChannel = parseChatChannel(searchParams.get('channel'))

  const { items, loading, error, totalUnread, reload } = useChatInbox(userId)

  const projectMeta = useMemo(
    () => items.find((row) => row.project_id === selectedProjectId) ?? null,
    [items, selectedProjectId],
  )

  function openRoom(projectId: string, channel: ChatChannelKey = 'client') {
    navigate(`/app/chat?project=${projectId}&channel=${channel}`)
  }

  if (!canAccess) {
    return (
      <div className="page">
        <p className="crm-error">ไม่มีสิทธิ์เข้าถึงกล่องแชท</p>
      </div>
    )
  }

  return (
    <div className="page chat-hub-page">
      <header className="chat-hub-page__top">
        <div>
          <h1>แชท</h1>
          <p className="muted">
            แชทแยกห้องต่อโปรเจกต์ — ลูกค้า · Account · Ads · Sales
            {totalUnread > 0 ? ` · ${totalUnread} ยังไม่อ่าน` : ''}
          </p>
        </div>
        <div className="chat-hub-page__top-actions">
          <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void reload()}>
            รีเฟรช
          </button>
          <Link to="/app/projects" className="crm-btn crm-btn--ghost">
            โปรเจกต์
          </Link>
        </div>
      </header>

      {error && <p className="crm-error">{error}</p>}

      <div className="chat-hub-shell">
        <ChatInboxList
          items={items}
          loading={loading}
          selectedProjectId={selectedProjectId}
          selectedChannel={selectedChannel}
          onSelect={openRoom}
        />

        <div className="chat-hub-shell__main">
          {!selectedProjectId && (
            <section className="chat-hub-welcome">
              <div className="chat-hub-welcome__icon" aria-hidden>
                ✦
              </div>
              <h2>เลือกห้องสนทนา</h2>
              <p className="muted">
                แชทแยกตามโปรเจกต์ — ค้นหาห้องได้จากแถบซ้าย หรือเปิดจากหน้าโปรเจกต์
              </p>
              <Link to="/app/projects" className="crm-btn crm-btn--primary">
                ไปรายการโปรเจกต์
              </Link>
            </section>
          )}

          {selectedProjectId && projectMeta && (
            <ProjectChatPanel
              projectId={projectMeta.project_id}
              projectName={projectMeta.project_name}
              customerId={projectMeta.customer_id}
              brandName={projectMeta.brand_name}
              userId={userId}
              canCreateTask={canCreateTask}
              channel={selectedChannel}
              onChannelChange={(ch) => openRoom(projectMeta.project_id, ch)}
            />
          )}

          {selectedProjectId && !projectMeta && !loading && (
            <section className="chat-hub-welcome">
              <h2>ไม่พบห้องแชท</h2>
              <p className="muted">โปรเจกต์นี้อาจยังไม่มีห้องแชท</p>
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
