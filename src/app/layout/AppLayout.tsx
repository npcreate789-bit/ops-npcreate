import { Outlet, useLocation } from 'react-router-dom'
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
import { LeadNotificationToasts } from '../modules/notifications/components/LeadNotificationToasts'
import { NotificationRealtimeProvider } from '../modules/notifications/NotificationRealtimeContext'
import { useChatMessageNotificationSound } from '../modules/chat/hooks/useChatMessageNotificationSound'
import { useNotificationSoundPrime } from '../modules/notifications/useNotificationSoundPrime'
import { Sidebar } from './Sidebar'
import './AppLayout.css'

import { SidebarLayoutProvider } from './SidebarLayoutContext'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function AppLayout() {
  const location = useLocation()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const clientPortalOnly =
    configured &&
    isClientOnlyAccount(roles) &&
    location.pathname.startsWith('/app/client')
  const userId = profile?.id ?? DEV_OWNER
  const paletteEnabled = canUseGlobalSearch(roles) || !configured
  const trackHistory = canUseQuickAccess(roles) || !configured
  const { open, close, openPalette } = useCommandPalette(paletteEnabled)
  useKeyboardHelp(canViewHelp(roles) && !open)
  useNotificationSoundPrime()
  useChatMessageNotificationSound(userId)

  if (clientPortalOnly) {
    return (
      <div className="client-portal-shell">
        <ClientPortalHeader />
        <main className="client-portal-shell__main">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <NotificationRealtimeProvider userId={userId} roles={roles}>
    <SidebarLayoutProvider>
      <div className="app-shell">
        {trackHistory && <PageHistoryTracker userId={userId} />}
        <Sidebar onOpenSearch={paletteEnabled ? openPalette : undefined} />
        <main className="app-main">
          <BreadcrumbNav />
          <Outlet />
        </main>
        <CommandPalette open={open} onClose={close} />
        <LeadNotificationToasts userId={userId} roles={roles} />
      </div>
    </SidebarLayoutProvider>
    </NotificationRealtimeProvider>
  )
}
