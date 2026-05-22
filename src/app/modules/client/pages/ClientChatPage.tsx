import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChatInboxList } from '../../chat/components/ChatInboxList'
import { ProjectChatPanel } from '../../chat/components/ProjectChatPanel'
import { useChatInbox } from '../../chat/hooks/useChatInbox'
import type { ChatInboxItem } from '../../chat/types'
import type { Project } from '../../projects/types'
import {
  clientPortalChatGateMessage,
  isClientPortalChatEnabled,
} from '../../../../shared/crm/preferredContactChannel'
import { useClientWorkspaceContext } from '../context/ClientWorkspaceContext'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasTasksTeamView } from '../../../../shared/auth/access'
import '../../chat/chat.css'
import '../client-workspace.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function projectsToInboxItems(
  projects: Project[],
  inboxByProject: Map<string, ChatInboxItem>,
): ChatInboxItem[] {
  return projects.map((p) => {
    const row = inboxByProject.get(p.id)
    if (row) return row
    return {
      room_id: `pending-${p.id}`,
      project_id: p.id,
      project_name: p.project_name,
      customer_id: p.customer_id,
      brand_name: p.project_name,
      channel: 'client' as const,
      channel_label: 'ลูกค้า',
      last_message_body: null,
      last_message_at: null,
      last_sender_id: null,
      unread_count: 0,
    }
  })
}

export function ClientChatPage() {
  const ws = useClientWorkspaceContext()
  const location = useLocation()
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const isStaffPreview = ws.canPreview && !ws.isClientOnly
  const canCreateTask = hasTasksTeamView(profile?.roles ?? []) || !configured
  const chatEnabled = isClientPortalChatEnabled({
    customerStatus: ws.data?.customer.status,
    projects: ws.projects,
    isStaffPreview,
  })
  const { items: inboxItems, totalUnread } = useChatInbox(userId)

  const inboxByProject = useMemo(
    () =>
      new Map(
        inboxItems
          .filter((row) => row.channel === 'client')
          .map((row) => [row.project_id, row]),
      ),
    [inboxItems],
  )

  const initialProjectId = (location.state as { projectId?: string } | null)?.projectId
  const [projectId, setProjectId] = useState('')

  const { projects, projectsLoading, customerId } = ws

  useEffect(() => {
    if (projects.length === 0) {
      setProjectId('')
      return
    }
    if (initialProjectId && projects.some((p) => p.id === initialProjectId)) {
      setProjectId(initialProjectId)
      return
    }
    setProjectId((prev) => prev || projects[0]?.id || '')
  }, [projects, initialProjectId])

  const clientInboxItems = useMemo(
    () => projectsToInboxItems(projects, inboxByProject),
    [projects, inboxByProject],
  )

  const selected = projects.find((p) => p.id === projectId)
  const brandLabel = ws.data?.customer.brand_name

  if (ws.loading) {
    return null
  }

  return (
    <div className="page client-page client-chat-page">
      <header className="page__header">
        <h2>แชทกับทีม</h2>
        <p className="muted">
          สนทนาต่อโปรเจกต์ — ทีม NP Create จะเห็นข้อความในแชทและศูนย์งานของฉัน
          {totalUnread > 0 ? ` · ${totalUnread} ข้อความใหม่` : ''}
        </p>
      </header>

      {!customerId && (
        <section className="card card--wide client-placeholder">
          <p className="muted">ยังไม่พบข้อมูลลูกค้าที่เชื่อมกับบัญชีนี้</p>
        </section>
      )}

      {customerId && !chatEnabled && (
        <section className="card card--wide client-placeholder">
          <h3>แชทในระบบยังไม่เปิด</h3>
          <p className="muted">{clientPortalChatGateMessage(ws.data?.customer.status ?? null)}</p>
          {!isStaffPreview && (
            <p className="muted">
              หลังชำระเงินและทีมเริ่มโปรเจกต์ คุณจะแชทกับ Account ได้ที่นี่ — ระหว่างนี้ติดต่อทีมทาง
              LINE หรือ Facebook ตามที่ตกลงไว้
            </p>
          )}
        </section>
      )}

      {customerId && chatEnabled && (
        <div className="client-chat-page__stage">
          <div
            className={`chat-hub-shell client-chat-shell${
              projectId ? ' chat-hub-shell--room-active' : ''
            }`}
            data-active-pane={projectId ? 'room' : 'inbox'}
          >
            <ChatInboxList
              items={clientInboxItems}
              loading={projectsLoading}
              selectedProjectId={projectId}
              onSelect={(id) => setProjectId(id)}
              emptyHint="ยังไม่มีโปรเจกต์ — ติดต่อทีม Account"
            />

            <div className="chat-hub-shell__main">
              {!projectId && !projectsLoading && (
                <section className="chat-hub-welcome">
                  <h3>เลือกโปรเจกต์</h3>
                  <p className="muted">เลือกโปรเจกต์จากรายการเพื่อเริ่มแชทกับทีม</p>
                </section>
              )}

              {selected && (
                <ProjectChatPanel
                  projectId={selected.id}
                  projectName={selected.project_name}
                  customerId={selected.customer_id}
                  brandName={brandLabel ?? undefined}
                  userId={userId}
                  canCreateTask={canCreateTask}
                  lockedChannel="client"
                  onBack={() => setProjectId('')}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
