import { normalizeLoginId } from '../../../../shared/auth/loginId'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { parseFunctionInvokeError } from '../../../../shared/supabase/parseFunctionInvokeError'
import type { CreateEmployeeInput, CreateEmployeeResult } from '../types'
import { mockAdminApi } from './mockStore'

export async function checkLoginIdAvailable(loginId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    const id = normalizeLoginId(loginId)
    const users = await mockAdminApi.listUsers()
    return !users.some((u) => u.login_id === id)
  }

  const { data, error } = await supabase.rpc('check_login_id_available', {
    p_login_id: normalizeLoginId(loginId),
  })

  if (error) throw new Error(error.message)
  return Boolean(data)
}

export async function createEmployeeUser(
  input: CreateEmployeeInput,
): Promise<CreateEmployeeResult> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdminApi.createEmployee(input)
  }

  const { data, error } = await supabase.functions.invoke('create-employee', {
    body: {
      login_id: normalizeLoginId(input.login_id),
      full_name: input.full_name.trim(),
      roles: input.roles,
    },
  })

  if (error) {
    const message = await parseFunctionInvokeError(error, data)
    if (message.includes('deploy Edge Function') || message.includes('Failed to send')) {
      throw new Error(
        'ยังไม่ได้ deploy Edge Function create-employee — ติดต่อทีม IT (supabase functions deploy create-employee)',
      )
    }
    throw new Error(message)
  }

  const result = data as CreateEmployeeResult | { error?: string } | null
  if (result && typeof result === 'object' && 'error' in result && result.error) {
    throw new Error(result.error)
  }

  if (!result || typeof result !== 'object' || !('login_id' in result)) {
    throw new Error('สร้างบัญชีไม่สำเร็จ — ไม่ได้รับข้อมูลจากเซิร์ฟเวอร์')
  }

  return result as CreateEmployeeResult
}
