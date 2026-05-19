export type AdminFlowSection = 'staff' | 'client' | 'settings'

export function parseAdminFlowSection(
  raw: string | null,
  fallback: AdminFlowSection = 'staff',
): AdminFlowSection {
  if (raw === 'staff' || raw === 'client' || raw === 'settings') return raw
  return fallback
}

const TABS: { id: AdminFlowSection; label: string; hint: string }[] = [
  { id: 'staff', label: 'พนักงาน', hint: 'สร้าง · แก้ไข · ลบ' },
  { id: 'client', label: 'ลูกค้าพอร์ทัล', hint: 'บัญชีแบรนด์' },
  { id: 'settings', label: 'ตั้งค่าระบบ', hint: 'Lead · แชท' },
]

interface AdminFlowTabsProps {
  active: AdminFlowSection
  onSelect: (section: AdminFlowSection) => void
  staffCount: number
  clientCount: number
}

export function AdminFlowTabs({
  active,
  onSelect,
  staffCount,
  clientCount,
}: AdminFlowTabsProps) {
  return (
    <nav className="admin-flow-tabs" aria-label="ขั้นตอนจัดการผู้ใช้">
      {TABS.map((tab) => {
        const count =
          tab.id === 'staff' ? staffCount : tab.id === 'client' ? clientCount : null
        return (
          <button
            key={tab.id}
            type="button"
            className={`admin-flow-tabs__tab${active === tab.id ? ' admin-flow-tabs__tab--active' : ''}`}
            aria-current={active === tab.id ? 'page' : undefined}
            onClick={() => onSelect(tab.id)}
          >
            <span className="admin-flow-tabs__label">{tab.label}</span>
            <span className="admin-flow-tabs__hint">
              {tab.hint}
              {count != null && count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
