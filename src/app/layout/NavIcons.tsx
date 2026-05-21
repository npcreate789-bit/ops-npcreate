import type { ReactElement, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function BaseIcon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

const IconHome = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M3 11.5 L12 4 L21 11.5" />
    <path d="M5 10 V20 H19 V10" />
    <path d="M10 20 V14 H14 V20" />
  </BaseIcon>
)

const IconInbox = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M3 12 L6 5 H18 L21 12 V19 H3 Z" />
    <path d="M3 12 H8 L9.5 14.5 H14.5 L16 12 H21" />
  </BaseIcon>
)

const IconChat = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M4 5 H20 V16 H13 L9 20 V16 H4 Z" />
    <circle cx="9" cy="10.5" r="0.6" fill="currentColor" />
    <circle cx="12" cy="10.5" r="0.6" fill="currentColor" />
    <circle cx="15" cy="10.5" r="0.6" fill="currentColor" />
  </BaseIcon>
)

const IconBell = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M6 16 H18 L17 14 V10 A5 5 0 0 0 7 10 V14 Z" />
    <path d="M10 19 A2 2 0 0 0 14 19" />
  </BaseIcon>
)

const IconCheckSquare = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M9 12 L11 14 L15.5 9.5" />
  </BaseIcon>
)

const IconTarget = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </BaseIcon>
)

const IconFileText = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M6 3 H14 L18 7 V21 H6 Z" />
    <path d="M14 3 V7 H18" />
    <path d="M9 12 H15" />
    <path d="M9 15 H15" />
    <path d="M9 18 H13" />
  </BaseIcon>
)

const IconWallet = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="3" y="6" width="18" height="14" rx="2.5" />
    <path d="M3 10 H21" />
    <circle cx="16.5" cy="15" r="1.1" fill="currentColor" />
  </BaseIcon>
)

const IconClipboardList = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <rect x="9" y="2.5" width="6" height="3" rx="1" />
    <path d="M9 10 H15" />
    <path d="M9 13 H15" />
    <path d="M9 16 H13" />
  </BaseIcon>
)

const IconLayers = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M12 3 L21 8 L12 13 L3 8 Z" />
    <path d="M3 12 L12 17 L21 12" />
    <path d="M3 16 L12 21 L21 16" />
  </BaseIcon>
)

const IconMegaphone = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M4 9 V15 H8 L17 19 V5 L8 9 Z" />
    <path d="M17 9 A3 3 0 0 1 17 15" />
  </BaseIcon>
)

const IconFilm = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9 H7" />
    <path d="M3 15 H7" />
    <path d="M17 9 H21" />
    <path d="M17 15 H21" />
    <path d="M7 4 V20" />
    <path d="M17 4 V20" />
  </BaseIcon>
)

const IconStar = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M12 3 L14.5 9 L21 9.5 L16 14 L17.5 20.5 L12 17 L6.5 20.5 L8 14 L3 9.5 L9.5 9 Z" />
  </BaseIcon>
)

const IconUsers = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="9" cy="9" r="3.5" />
    <path d="M3 20 C3 16 5 14 9 14 C13 14 15 16 15 20" />
    <circle cx="17" cy="10" r="2.5" />
    <path d="M16 14 C19 14 21 16 21 20" />
  </BaseIcon>
)

const IconRefresh = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M4 12 A8 8 0 0 1 18 7" />
    <path d="M18 4 V8 H14" />
    <path d="M20 12 A8 8 0 0 1 6 17" />
    <path d="M6 20 V16 H10" />
  </BaseIcon>
)

const IconBriefcase = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7 V5 A1.5 1.5 0 0 1 10.5 3.5 H13.5 A1.5 1.5 0 0 1 15 5 V7" />
    <path d="M3 13 H21" />
  </BaseIcon>
)

const IconDashboard = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="3" y="3" width="8" height="10" rx="1.5" />
    <rect x="13" y="3" width="8" height="6" rx="1.5" />
    <rect x="13" y="11" width="8" height="10" rx="1.5" />
    <rect x="3" y="15" width="8" height="6" rx="1.5" />
  </BaseIcon>
)

const IconCalendar = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10 H21" />
    <path d="M8 3 V7" />
    <path d="M16 3 V7" />
    <circle cx="8" cy="14" r="0.8" fill="currentColor" />
    <circle cx="12" cy="14" r="0.8" fill="currentColor" />
    <circle cx="16" cy="14" r="0.8" fill="currentColor" />
  </BaseIcon>
)

const IconBarChart = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M4 20 V12" />
    <path d="M10 20 V4" />
    <path d="M16 20 V8" />
    <path d="M3 20 H21" />
  </BaseIcon>
)

const IconActivity = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M3 12 H7 L9.5 5 L13.5 19 L16 12 H21" />
  </BaseIcon>
)

const IconSparkles = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" />
    <path d="M18 16 L18.7 18.3 L21 19 L18.7 19.7 L18 22 L17.3 19.7 L15 19 L17.3 18.3 Z" />
  </BaseIcon>
)

const IconShield = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M12 3 L20 6 V12 C20 17 16 20 12 21 C8 20 4 17 4 12 V6 Z" />
    <path d="M9 12 L11 14 L15 10" />
  </BaseIcon>
)

const IconCpu = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
    <path d="M9 3 V6" />
    <path d="M15 3 V6" />
    <path d="M9 18 V21" />
    <path d="M15 18 V21" />
    <path d="M3 9 H6" />
    <path d="M3 15 H6" />
    <path d="M18 9 H21" />
    <path d="M18 15 H21" />
  </BaseIcon>
)

const IconSettings = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3 L13 5.5 L15.5 5 L16.5 7.5 L19 7 L19 10 L21 11 L19 13 L19 16 L16.5 15.5 L15.5 18 L13 17.5 L12 20 L11 17.5 L8.5 18 L7.5 15.5 L5 16 L5 13 L3 11 L5 10 L5 7 L7.5 7.5 L8.5 5 L11 5.5 Z" />
  </BaseIcon>
)

const IconHelp = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5 A2.5 2.5 0 1 1 12 13 V14.5" />
    <circle cx="12" cy="17.5" r="0.8" fill="currentColor" />
  </BaseIcon>
)

const IconSignal = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M4 18 V15" />
    <path d="M9 18 V11" />
    <path d="M14 18 V7" />
    <path d="M19 18 V3" />
  </BaseIcon>
)

const IconSearch = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16 L20.5 20.5" />
  </BaseIcon>
)

const NAV_ICON_MAP: Record<string, (p: IconProps) => ReactElement> = {
  home: IconHome,
  inbox: IconInbox,
  chat: IconChat,
  bell: IconBell,
  checkSquare: IconCheckSquare,
  target: IconTarget,
  fileText: IconFileText,
  wallet: IconWallet,
  clipboardList: IconClipboardList,
  layers: IconLayers,
  megaphone: IconMegaphone,
  film: IconFilm,
  star: IconStar,
  users: IconUsers,
  refresh: IconRefresh,
  briefcase: IconBriefcase,
  dashboard: IconDashboard,
  calendar: IconCalendar,
  barChart: IconBarChart,
  activity: IconActivity,
  sparkles: IconSparkles,
  shield: IconShield,
  cpu: IconCpu,
  settings: IconSettings,
  help: IconHelp,
  signal: IconSignal,
  search: IconSearch,
}

export type NavIconKey = keyof typeof NAV_ICON_MAP

export function NavIcon({ name, ...props }: { name: NavIconKey } & IconProps) {
  const Component = NAV_ICON_MAP[name]
  if (!Component) return null
  return <Component {...props} />
}
