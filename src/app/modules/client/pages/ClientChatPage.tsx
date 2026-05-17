import { useEffect, useMemo, useState } from 'react'
import { listProjectsForCustomer } from '../../projects/api/projects'
import { ChatInboxList } from '../../chat/components/ChatInboxList'
import { ProjectChatPanel } from '../../chat/components/ProjectChatPanel'
import { useChatInbox } from '../../chat/hooks/useChatInbox'
import type { ChatInboxItem } from '../../chat/types'
import type { Project } from '../../projects/types'
import { ClientPreviewBar } from '../components/ClientPreviewBar'
import { useClientWorkspace } from '../hooks/useClientWorkspace'
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
  const ws = useClientWorkspace()
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const canCreateTask = hasTasksTeamView(profile?.roles ?? []) || !configured
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

  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [loadingProjects, setLoadingProjects] = useState(false)

  const customerId = ws.customerId

  useEffect(() => {
    if (!customerId) {
      setProjects([])
      setProjectId('')
      return
    }
    setLoadingProjects(true)
    listProjectsForCustomer(customerId)
      .then((rows) => {
        setProjects(rows)
        setProjectId((prev) => prev || rows[0]?.id || '')
      })
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false))
  }, [customerId])

  const clientInboxItems = useMemo(
    () => projectsToInboxItems(projects, inboxByProject),
    [projects, inboxByProject],
  )

  const selected = projects.find((p) => p.id === projectId)
  const brandLabel = ws.data?.customer.brand_name

  return (
    <div className="page client-chat-page">
      <header className="page__header">
        <h1>แชทกับทีม</h1>
        <p className="muted">
          สนทนาต่อโปรเจกต์ — ทีมงานจะเห็นข้อความแบบเรียลไทม์
          {totalUnread > 0 ? ` · ${totalUnread} ข้อความใหม่` : ''}
        </p>
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

      {!customerId && (
        <section className="card card--wide client-placeholder">
          <p className="muted">ยังไม่พบข้อมูลลูกค้าที่เชื่อมกับบัญชีนี้</p>
        </section>
      )}

      {customerId && (
        <div className="client-chat-page__stage">
          <div className="chat-hub-shell client-chat-shell">
          <ChatInboxList
            items={clientInboxItems}
            loading={loadingProjects}
            selectedProjectId={projectId}
            onSelect={(id) => setProjectId(id)}
            emptyHint="ยังไม่มีโปรเจกต์ — ติดต่อทีม Account"
          />

          <div className="chat-hub-shell__main">
            {!projectId && !loadingProjects && (
              <section className="chat-hub-welcome">
                <h2>เลือกโปรเจกต์</h2>
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
              />
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
