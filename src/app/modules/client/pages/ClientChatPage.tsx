import { useEffect, useMemo, useState } from 'react'
import { listProjectsForCustomer } from '../../projects/api/projects'
import { ProjectChatPanel } from '../../chat/components/ProjectChatPanel'
import { useChatInbox } from '../../chat/hooks/useChatInbox'
import type { Project } from '../../projects/types'
import { ClientPreviewBar } from '../components/ClientPreviewBar'
import { useClientWorkspace } from '../hooks/useClientWorkspace'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasTasksTeamView } from '../../../../shared/auth/access'
import '../client-workspace.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function ClientChatPage() {
  const ws = useClientWorkspace()
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const canCreateTask = hasTasksTeamView(profile?.roles ?? []) || !configured
  const { items: inboxItems, totalUnread } = useChatInbox(userId)

  const unreadByProject = useMemo(
    () => new Map(inboxItems.map((row) => [row.project_id, row.unread_count])),
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

  const selected = projects.find((p) => p.id === projectId)

  return (
    <div className="page">
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
        <>
          <section className="card card--wide" style={{ marginBottom: '1rem' }}>
            <label className="task-field">
              <span className="task-field__label">เลือกโปรเจกต์</span>
              <select
                className="task-select"
                value={projectId}
                disabled={loadingProjects || projects.length === 0}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects.length === 0 && <option value="">— ยังไม่มีโปรเจกต์ —</option>}
                {projects.map((p) => {
                  const unread = unreadByProject.get(p.id) ?? 0
                  return (
                    <option key={p.id} value={p.id}>
                      {p.project_name}
                      {unread > 0 ? ` (${unread} ใหม่)` : ''}
                    </option>
                  )
                })}
              </select>
            </label>
          </section>

          {selected && (
            <ProjectChatPanel
              projectId={selected.id}
              projectName={selected.project_name}
              customerId={selected.customer_id}
              userId={userId}
              canCreateTask={canCreateTask}
            />
          )}
        </>
      )}
    </div>
  )
}
