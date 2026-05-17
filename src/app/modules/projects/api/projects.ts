import { logAudit } from '../../../../shared/audit/logAudit'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { Project, ProjectInsert, ProjectUpdate } from '../types'
import type { ProjectTaskOption } from '../../tasks/types'

const MOCK_KEY = 'npcreate_projects_dev'

function loadMock(): Project[] {
  try {
    const raw = localStorage.getItem(MOCK_KEY)
    return raw ? (JSON.parse(raw) as Project[]) : []
  } catch {
    return []
  }
}

function saveMock(rows: Project[]) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(rows))
}

export async function listProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadMock().sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*, customer:customers(brand_name)')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Project[]
}

export async function listProjectsForTaskSelect(): Promise<ProjectTaskOption[]> {
  const rows = await listProjects()
  return rows.map((p) => ({
    id: p.id,
    label: p.project_name,
    customer_id: p.customer_id,
  }))
}

export async function listProjectsForCustomer(customerId: string): Promise<Project[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadMock().filter((p) => p.customer_id === customerId)
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Project[]
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured || !supabase) {
    return loadMock().find((p) => p.id === id) ?? null
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*, customer:customers(brand_name)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Project | null
}

export async function createProject(payload: ProjectInsert): Promise<Project> {
  if (!isSupabaseConfigured || !supabase) {
    const now = new Date().toISOString()
    const row: Project = {
      id: crypto.randomUUID(),
      account_owner_id: payload.account_owner_id ?? null,
      ads_owner_id: payload.ads_owner_id ?? null,
      created_at: now,
      updated_at: now,
      ...payload,
      notes: payload.notes ?? null,
    }
    const rows = [...loadMock(), row]
    saveMock(rows)
    return row
  }

  const { data, error } = await supabase.from('projects').insert(payload).select().single()
  if (error) throw new Error(error.message)
  const project = data as Project
  await logAudit('project.create', 'project', project.id, {
    customer_id: project.customer_id,
    project_name: project.project_name,
  })
  return project
}

export async function updateProject(id: string, payload: ProjectUpdate): Promise<Project> {
  if (!isSupabaseConfigured || !supabase) {
    const rows = loadMock()
    const idx = rows.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('ไม่พบโปรเจกต์')
    rows[idx] = { ...rows[idx], ...payload, updated_at: new Date().toISOString() }
    saveMock(rows)
    return rows[idx]
  }

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  await logAudit('project.update', 'project', id, payload as Record<string, unknown>)
  return data as Project
}
