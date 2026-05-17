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

export interface ClientWizardCustomer {
  id: string
  brand_name: string
  contact_name: string | null
  status: string
  has_portal: boolean
}

export interface CreateClientInput {
  login_id: string
  full_name: string
  customer_id: string
}

export interface CreateClientResult {
  id: string
  login_id: string
  email: string
  full_name: string
  customer_id: string
  brand_name: string
  temporary_password: string
}

export interface LeadOwnerOption {
  id: string
  login_id: string
  email: string
  full_name: string | null
}

export interface DefaultLeadOwnerSetting {
  ownerId: string | null
  ownerLabel: string | null
  usesAutoFallback: boolean
  invalidOwnerId?: boolean
}
