import type { AppRole } from '../../../shared/types/roles'

export interface AdminUserRow {
  id: string
  login_id: string
  email: string
  full_name: string | null
  is_active: boolean
  must_change_password: boolean
  temporary_password: string | null
  roles: AppRole[]
  client_customer_id: string | null
  created_at: string
}

export interface CreateEmployeeInput {
  login_id: string
  full_name: string
  roles: AppRole[]
}

export interface CreateEmployeeResult {
  id: string
  login_id: string
  email: string
  full_name: string
  roles: AppRole[]
  temporary_password: string
}
