import { canUseGlobalSearch, canUseQuickAccess } from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import { KEYBOARD_SHORTCUT_TABLE, type KeyboardShortcutRow } from './constants'

type ShortcutAudience = 'all' | 'search' | 'quickAccess'

function audienceForRow(row: KeyboardShortcutRow): ShortcutAudience {
  if (row.category === 'ค้นหา') return 'search'
  if (row.category === 'หน้าหลัก / เข้าถึงด่วน') return 'quickAccess'
  return 'all'
}

export function keyboardShortcutsForRoles(
  roles: AppRole[],
  configured: boolean,
): KeyboardShortcutRow[] {
  const devMode = !configured && roles.length === 0

  return KEYBOARD_SHORTCUT_TABLE.filter((row) => {
    const audience = audienceForRow(row)
    if (audience === 'all') return true
    if (audience === 'search') return canUseGlobalSearch(roles) || devMode
    if (audience === 'quickAccess') return canUseQuickAccess(roles) || devMode
    return true
  })
}
