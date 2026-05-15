import type { AppRole } from '../../../../shared/types/roles'
import type { AdminUserRow } from '../types'

const MOCK_USERS: AdminUserRow[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'ceo@npcreate.local',
    full_name: 'CEO Demo',
    is_active: true,
    roles: ['ceo'],
    client_customer_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'sales@npcreate.local',
    full_name: 'Sales Demo',
    is_active: true,
    roles: ['sales'],
    client_customer_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'ads@npcreate.local',
    full_name: 'Ads Demo',
    is_active: true,
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
}
