import { Outlet } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { canUseGlobalSearch } from '../../shared/auth/access'
import { CommandPalette } from '../components/CommandPalette'
import { useCommandPalette } from '../hooks/useCommandPalette'
import { Sidebar } from './Sidebar'
import './AppLayout.css'

export function AppLayout() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const paletteEnabled = canUseGlobalSearch(roles) || !configured
  const { open, close, openPalette } = useCommandPalette(paletteEnabled)

  return (
    <div className="app-shell">
      <Sidebar onOpenSearch={paletteEnabled ? openPalette : undefined} />
      <main className="app-main">
        <Outlet />
      </main>
      <CommandPalette open={open} onClose={close} />
    </div>
  )
}
