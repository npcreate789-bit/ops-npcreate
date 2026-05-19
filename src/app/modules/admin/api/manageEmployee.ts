import { normalizeLoginId } from '../../../../shared/auth/loginId'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { parseFunctionInvokeError } from '../../../../shared/supabase/parseFunctionInvokeError'
import { mockAdminApi } from './mockStore'

export interface UpdateEmployeeInput {
  user_id: string
  full_name?: string
  login_id?: string
}

export interface UpdateEmployeeResult {
  id: string
  full_name: string | null
  login_id: string
  email: string
}

export interface ResetEmployeePasswordResult {
  temporary_password: string
}

async function invokeManageEmployee<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase ไม่พร้อม')

  const { data, error } = await supabase.functions.invoke('manage-employee', { body })

  if (error) {
    const message = await parseFunctionInvokeError(error, data)
    if (message.includes('deploy Edge Function') || message.includes('Function not found')) {
      throw new Error(
        'ยังไม่ได้ deploy Edge Function manage-employee — รัน supabase functions deploy manage-employee',
      )
    }
    throw new Error(message)
  }

  const result = data as T | { error?: string } | null
  if (result && typeof result === 'object' && 'error' in result && result.error) {
    throw new Error(result.error)
  }

  return result as T
}

export async function updateEmployeeProfile(
  input: UpdateEmployeeInput,
): Promise<UpdateEmployeeResult> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdminApi.updateEmployee(input)
  }

  return invokeManageEmployee<UpdateEmployeeResult>({
    action: 'update',
    user_id: input.user_id,
    full_name: input.full_name,
    login_id: input.login_id ? normalizeLoginId(input.login_id) : undefined,
  })
}

export async function deleteEmployeeUser(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    await mockAdminApi.deleteEmployee(userId)
    return
  }

  await invokeManageEmployee<{ ok: boolean }>({
    action: 'delete',
    user_id: userId,
  })
}

export async function resetEmployeePassword(
  userId: string,
): Promise<ResetEmployeePasswordResult> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdminApi.resetEmployeePassword(userId)
  }

  return invokeManageEmployee<ResetEmployeePasswordResult>({
    action: 'reset_password',
    user_id: userId,
  })
}
