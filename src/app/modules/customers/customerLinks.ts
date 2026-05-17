import type { Project } from '../projects/types'

export type ClientWorkspaceTab = 'brief' | 'chat' | 'projects' | 'payment' | 'reports'

/** เปิด Client Workspace ในฐานะทีม — ลูกค้าถูกเลือกอัตโนมัติ */
export function clientWorkspaceUrl(customerId: string, tab?: ClientWorkspaceTab): string {
  const path = tab ? `/app/client/${tab}` : '/app/client'
  return `${path}?preview=${encodeURIComponent(customerId)}`
}

export function financeUrlForCustomer(customerId: string): string {
  return `/app/finance?customerId=${encodeURIComponent(customerId)}`
}

export function chatUrlForCustomer(projectId?: string | null): string {
  if (projectId) return `/app/chat?project=${encodeURIComponent(projectId)}&channel=client`
  return '/app/chat'
}

export function tasksUrlForCustomer(projectId?: string | null): string {
  if (projectId) return `/app/tasks?project=${encodeURIComponent(projectId)}`
  return '/app/tasks'
}

export function primaryProjectForCustomer(projects: Project[]): Project | null {
  if (projects.length === 0) return null
  const active = projects.find(
    (p) => !['completed', 'closed'].includes(p.status),
  )
  return active ?? projects[0]
}
