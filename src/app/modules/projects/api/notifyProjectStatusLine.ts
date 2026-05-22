import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { ProjectStatus } from '../types'

/**
 * Event ที่ระบบจะ notify ลูกค้าทาง LINE OA — sync กับ Edge
 * `notify-project-status-line` (มี allowlist เดียวกัน)
 */
export const PROJECT_STATUS_LINE_EVENTS: ProjectStatus[] = [
  'in_progress',
  'waiting_approval',
  'completed',
]

export function isProjectStatusLineEvent(
  status: ProjectStatus | undefined | null,
): status is 'in_progress' | 'waiting_approval' | 'completed' {
  return Boolean(status) && PROJECT_STATUS_LINE_EVENTS.includes(status as ProjectStatus)
}

export interface ProjectStatusLineResult {
  ok: boolean
  skipped?: string
  pushed?: boolean
  error?: string
}

export async function invokeNotifyProjectStatusLine(
  projectId: string,
  event: 'in_progress' | 'waiting_approval' | 'completed',
): Promise<ProjectStatusLineResult> {
  const id = projectId?.trim()
  if (!id || !isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'offline' }
  }

  const { data, error } = await supabase.functions.invoke('notify-project-status-line', {
    body: { project_id: id, event },
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const body = (data ?? {}) as {
    ok?: boolean
    skipped?: string
    pushed?: boolean
    error?: string
  }

  if (body.error) {
    return { ok: false, error: body.error }
  }

  return {
    ok: body.ok !== false,
    skipped: typeof body.skipped === 'string' ? body.skipped : undefined,
    pushed: body.pushed === true,
  }
}
