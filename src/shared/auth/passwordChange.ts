import { supabase } from '../supabase/client'

export async function updateOwnPassword(newPassword: string): Promise<void> {
  if (!supabase) throw new Error('ต้องตั้งค่า Supabase')
  if (newPassword.length < 8) {
    throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  }

  const { error: authErr } = await supabase.auth.updateUser({ password: newPassword })
  if (authErr) throw new Error(authErr.message)

  const { error: rpcErr } = await supabase.rpc('complete_password_change')
  if (rpcErr) throw new Error(rpcErr.message)
}
