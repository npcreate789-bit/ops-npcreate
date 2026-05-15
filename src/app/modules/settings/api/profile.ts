import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export async function updateProfileFullName(
  userId: string,
  fullName: string,
): Promise<void> {
  const trimmed = fullName.trim()
  if (!trimmed) {
    throw new Error('กรุณาระบุชื่อที่แสดง')
  }

  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: trimmed })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}
