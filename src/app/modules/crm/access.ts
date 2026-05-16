export {
  canCreateCrmLead,
  canEditCrmLead,
  hasCrmTeamView,
  isCrmReadOnly,
} from '../../../shared/auth/access'

import { hasDbPrivilegedRole } from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'

/** ดู/ดาวน์โหลดไฟล์ใน bucket leads — สอดคล้อง leads_storage_select */
export function canViewLeadAttachments(
  roles: AppRole[],
  ownerId: string | undefined,
  userId: string,
): boolean {
  if (hasDbPrivilegedRole(roles)) return true
  if (roles.includes('admin')) return true
  return Boolean(ownerId && ownerId === userId)
}
