import { Outlet } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { isClientOnlyAccount } from '../../shared/auth/postLoginPath'
import { ClientPortalHeader } from '../modules/client/layout/ClientPortalHeader'
import '../modules/client/layout/client-portal-shell.css'
import { canUseGlobalSearch, canUseQuickAccess, canViewHelp } from '../../shared/auth/access'
import { BreadcrumbNav } from '../components/BreadcrumbNav'
import { CommandPalette } from '../components/CommandPalette'
import { useCommandPalette } from '../hooks/useCommandPalette'
import { useKeyboardHelp } from '../hooks/useKeyboardHelp'
import { PageHistoryTracker } from '../modules/quick-access/components/PageHistoryTracker'
import { StaffAlertToasts } from '../modules/notifications/components/StaffAlertToasts'
import { NotificationRealtimeProvider } from '../modules/notifications/NotificationRealtimeContext'
import { useChatMessageNotificationSound } from '../modules/chat/hooks/useChatMessageNotificationSound'
import { useNotificationSoundPrime } from '../modules/notifications/useNotificationSoundPrime'
import { Sidebar } from './Sidebar'
import './AppLayout.css'

import { SidebarLayoutProvider } from './SidebarLayoutContext'
import { PageHeadingProvider } from './PageHeadingContext'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function AppLayout() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const clientPortalOnly = configured && isClientOnlyAccount(roles)
  const userId = profile?.id ?? DEV_OWNER
  const paletteEnabled = canUseGlobalSearch(roles) || !configured
  const trackHistory = canUseQuickAccess(roles) || !configured
  const { open, close, openPalette } = useCommandPalette(paletteEnabled)
  useKeyboardHelp(canViewHelp(roles) && !open)
  useNotificationSoundPrime()
  useChatMessageNotificationSound(userId)

  if (clientPortalOnly) {
    return (
      <PageHeadingProvider>
        <div className="client-portal-shell">
          <ClientPortalHeader />
          <main className="client-portal-shell__main">
            <Outlet />
          </main>
        </div>
      </PageHeadingProvider>
    )
  }

  return (
    <NotificationRealtimeProvider userId={userId} roles={roles}>
    <SidebarLayoutProvider>
      <PageHeadingProvider>
        <div className="app-shell">
          {trackHistory && <PageHistoryTracker userId={userId} />}
          <Sidebar onOpenSearch={paletteEnabled ? openPalette : undefined} />
          <main className="app-main">
            <BreadcrumbNav />
            <Outlet />
          </main>
          <CommandPalette open={open} onClose={close} />
          <StaffAlertToasts userId={userId} roles={roles} />
        </div>
      </PageHeadingProvider>
    </SidebarLayoutProvider>
    </NotificationRealtimeProvider>
  )
}
