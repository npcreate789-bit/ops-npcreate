export type ContractRenewalStatus =
  | 'open'
  | 'contacted'
  | 'quoted'
  | 'renewed'
  | 'declined'

export interface ContractRenewal {
  id: string
  customer_id: string
  status: ContractRenewalStatus
  contract_end: string
  extension_months: number | null
  owner_id: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface RenewalRow {
  customer_id: string
  brand_name: string
  contract_end: string | null
  customer_status: string
  days_until_end: number | null
  renewal_id: string | null
  renewal_status: ContractRenewalStatus | null
  owner_id: string | null
  notes: string | null
}

export type RenewalStatusFilter = ContractRenewalStatus | 'no_case' | ''

export interface RenewalFilters {
  within_days?: number
  /** no_case = ยังไม่เปิดเคสในระบบ (ต่างจาก status open) */
  renewal_status?: RenewalStatusFilter
  include_expired?: boolean
  search?: string
  customer_id?: string
}

export interface RenewalInput {
  customer_id: string
  contract_end: string
  status: ContractRenewalStatus
  owner_id: string
  notes: string | null
  created_by: string
}
