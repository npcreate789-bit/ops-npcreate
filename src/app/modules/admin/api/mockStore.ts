import { staffAuthEmail } from '../../../../shared/auth/staffAuth'
import { generateTempPassword } from '../../../../shared/auth/tempPassword'
import { normalizeLoginId } from '../../../../shared/auth/loginId'
import type { AppRole } from '../../../../shared/types/roles'
import type { AdminUserRow, CreateEmployeeInput, CreateEmployeeResult } from '../types'

const MOCK_USERS: AdminUserRow[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    login_id: 'ceo',
    email: 'ceo@npcreate.local',
    full_name: 'CEO Demo',
    is_active: true,
    must_change_password: false,
    temporary_password: null,
    roles: ['ceo'],
    client_customer_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    login_id: 'sales',
    email: 'sales@npcreate.local',
    full_name: 'Sales Demo',
    is_active: true,
    must_change_password: false,
    temporary_password: null,
    roles: ['sales'],
    client_customer_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    login_id: 'ads',
    email: 'ads@npcreate.local',
    full_name: 'Ads Demo',
    is_active: true,
    must_change_password: false,
    temporary_password: null,
    roles: ['ads', 'senior_ads'],
    client_customer_id: null,
    created_at: new Date().toISOString(),
  },
]

function clone(): AdminUserRow[] {
  return MOCK_USERS.map((u) => ({
    ...u,
    roles: [...u.roles],
    client_customer_id: u.client_customer_id,
  }))
}

export const mockAdminApi = {
  async listUsers(): Promise<AdminUserRow[]> {
    return clone()
  },

  async setUserActive(userId: string, isActive: boolean): Promise<void> {
    const u = MOCK_USERS.find((x) => x.id === userId)
    if (u) u.is_active = isActive
  },

  async setUserRoles(userId: string, roles: AppRole[]): Promise<void> {
    const u = MOCK_USERS.find((x) => x.id === userId)
    if (u) {
      u.roles = [...roles]
      if (!roles.includes('client')) u.client_customer_id = null
    }
  },

  async createEmployee(input: CreateEmployeeInput): Promise<CreateEmployeeResult> {
    const loginId = normalizeLoginId(input.login_id)
    if (MOCK_USERS.some((u) => u.login_id === loginId)) {
      throw new Error('รหัสผู้ใช้นี้ถูกใช้แล้ว')
    }
    const tempPassword = generateTempPassword(12)
    const id = crypto.randomUUID()
    const row: AdminUserRow = {
      id,
      login_id: loginId,
      email: staffAuthEmail(loginId),
      full_name: input.full_name.trim(),
      is_active: true,
      must_change_password: true,
      temporary_password: tempPassword,
      roles: [...input.roles],
      client_customer_id: null,
      created_at: new Date().toISOString(),
    }
    MOCK_USERS.push(row)
    return {
      id: row.id,
      login_id: row.login_id,
      email: row.email,
      full_name: row.full_name ?? '',
      roles: row.roles,
      temporary_password: tempPassword,
    }
  },
}
