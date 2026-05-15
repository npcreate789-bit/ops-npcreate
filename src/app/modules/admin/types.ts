import type { AppRole } from '../../../shared/types/roles'

export interface AdminUserRow {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  roles: AppRole[]
  client_customer_id: string | null
  created_at: string
}
