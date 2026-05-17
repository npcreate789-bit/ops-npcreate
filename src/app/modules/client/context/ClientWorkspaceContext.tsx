import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { listProjectsForCustomer } from '../../projects/api/projects'
import type { Project } from '../../projects/types'
import { useClientWorkspace } from '../hooks/useClientWorkspace'

type WorkspaceState = ReturnType<typeof useClientWorkspace>

export type ClientWorkspaceContextValue = WorkspaceState & {
  projects: Project[]
  projectsLoading: boolean
}

const ClientWorkspaceContext = createContext<ClientWorkspaceContextValue | null>(null)

export function ClientWorkspaceProvider({ children }: { children: ReactNode }) {
  const ws = useClientWorkspace()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  useEffect(() => {
    if (!ws.customerId) {
      setProjects([])
      return
    }
    let cancelled = false
    setProjectsLoading(true)
    listProjectsForCustomer(ws.customerId)
      .then((rows) => {
        if (!cancelled) setProjects(rows)
      })
      .catch(() => {
        if (!cancelled) setProjects([])
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ws.customerId])

  const value: ClientWorkspaceContextValue = {
    ...ws,
    projects,
    projectsLoading,
  }

  return (
    <ClientWorkspaceContext.Provider value={value}>{children}</ClientWorkspaceContext.Provider>
  )
}

export function useClientWorkspaceContext(): ClientWorkspaceContextValue {
  const ctx = useContext(ClientWorkspaceContext)
  if (!ctx) {
    throw new Error('useClientWorkspaceContext must be used within ClientWorkspaceProvider')
  }
  return ctx
}
