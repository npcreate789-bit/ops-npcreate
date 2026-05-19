import { assertValidRoleMix } from '../userAudience'
import { staffAuthEmail } from '../../../../shared/auth/staffAuth'
import { generateTempPassword } from '../../../../shared/auth/tempPassword'
import { normalizeLoginId } from '../../../../shared/auth/loginId'
import type { AppRole } from '../../../../shared/types/roles'
import type {
  AdminUserRow,
  ClientWizardCustomer,
  CreateClientInput,
  CreateClientResult,
  CreateEmployeeInput,
  CreateEmployeeResult,
  DefaultLeadOwnerSetting,
  LeadOwnerOption,
} from '../types'

let mockDefaultLeadOwnerId: string | null = '00000000-0000-4000-8000-000000000002'

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
  {
    id: '00000000-0000-4000-8000-000000000010',
    login_id: 'branddemo',
    email: 'branddemo@client.npcreate.local',
    full_name: 'ลูกค้า Demo',
    is_active: true,
    must_change_password: true,
    temporary_password: 'Demo-Client-99',
    roles: ['client'],
    client_customer_id: 'cust-demo-1',
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
    assertValidRoleMix(roles)
    const u = MOCK_USERS.find((x) => x.id === userId)
    if (u) {
      u.roles = [...roles]
      if (!roles.includes('client')) u.client_customer_id = null
    }
  },

  async updateEmployee(input: {
    user_id: string
    full_name?: string
    login_id?: string
  }): Promise<{
    id: string
    full_name: string | null
    login_id: string
    email: string
  }> {
    const u = MOCK_USERS.find((x) => x.id === input.user_id)
    if (!u) throw new Error('ไม่พบผู้ใช้')
    if (input.full_name !== undefined) u.full_name = input.full_name.trim()
    if (input.login_id) {
      const loginId = normalizeLoginId(input.login_id)
      if (MOCK_USERS.some((x) => x.id !== u.id && x.login_id === loginId)) {
        throw new Error('รหัสผู้ใช้นี้ถูกใช้แล้ว')
      }
      u.login_id = loginId
      u.email = staffAuthEmail(loginId)
    }
    return {
      id: u.id,
      full_name: u.full_name,
      login_id: u.login_id,
      email: u.email,
    }
  },

  async deleteEmployee(userId: string): Promise<void> {
    const idx = MOCK_USERS.findIndex((x) => x.id === userId)
    if (idx === -1) throw new Error('ไม่พบผู้ใช้')
    if (MOCK_USERS[idx].roles.includes('ceo')) {
      throw new Error('ไม่สามารถลบบัญชี CEO ในโหมดพัฒนาได้')
    }
    MOCK_USERS.splice(idx, 1)
  },

  async resetEmployeePassword(userId: string): Promise<{ temporary_password: string }> {
    const u = MOCK_USERS.find((x) => x.id === userId)
    if (!u) throw new Error('ไม่พบผู้ใช้')
    const tempPassword = generateTempPassword(12)
    u.temporary_password = tempPassword
    u.must_change_password = true
    return { temporary_password: tempPassword }
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

  async listCustomersForClientWizard(): Promise<ClientWizardCustomer[]> {
    return [
      {
        id: 'cust-demo-1',
        brand_name: 'แบรนด์ Demo',
        contact_name: 'คุณลูกค้า',
        status: 'active',
        has_portal: false,
        line_user_id: null,
      },
    ]
  },

  async listSalesLeadOwnerOptions(): Promise<LeadOwnerOption[]> {
    return clone()
      .filter((u) => u.is_active && u.roles.includes('sales'))
      .map((u) => ({
        id: u.id,
        login_id: u.login_id,
        email: u.email,
        full_name: u.full_name,
      }))
  },

  async getDefaultLeadOwnerSetting(): Promise<DefaultLeadOwnerSetting> {
    if (!mockDefaultLeadOwnerId) {
      return { ownerId: null, ownerLabel: null, usesAutoFallback: true }
    }
    const user = MOCK_USERS.find((u) => u.id === mockDefaultLeadOwnerId)
    if (!user || !user.is_active || !user.roles.includes('sales')) {
      return {
        ownerId: mockDefaultLeadOwnerId,
        ownerLabel: null,
        usesAutoFallback: true,
        invalidOwnerId: true,
      }
    }
    return {
      ownerId: user.id,
      ownerLabel: user.full_name ?? user.login_id,
      usesAutoFallback: false,
    }
  },

  async setDefaultLeadOwnerSetting(
    ownerId: string | null,
  ): Promise<DefaultLeadOwnerSetting> {
    if (ownerId) {
      const user = MOCK_USERS.find((u) => u.id === ownerId)
      if (!user?.is_active || !user.roles.includes('sales')) {
        throw new Error('ผู้ใช้ที่เลือกต้องเป็น Sales ที่ active')
      }
      mockDefaultLeadOwnerId = ownerId
    } else {
      mockDefaultLeadOwnerId = null
    }
    return mockAdminApi.getDefaultLeadOwnerSetting()
  },

  async createClientPortalUser(input: CreateClientInput): Promise<CreateClientResult> {
    const result = await mockAdminApi.createEmployee({
      login_id: input.login_id,
      full_name: input.full_name,
      roles: ['client'],
    })
    const row = MOCK_USERS.find((u) => u.id === result.id)
    if (row) row.client_customer_id = input.customer_id
    const customer = (await mockAdminApi.listCustomersForClientWizard()).find(
      (c) => c.id === input.customer_id,
    )
    return {
      id: result.id,
      login_id: result.login_id,
      email: result.email,
      full_name: result.full_name,
      customer_id: input.customer_id,
      brand_name: customer?.brand_name ?? 'ลูกค้า',
      temporary_password: result.temporary_password,
    }
  },
}
