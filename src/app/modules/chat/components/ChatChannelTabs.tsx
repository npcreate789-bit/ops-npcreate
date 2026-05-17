import type { ChatChannelKey } from '../types'
import { CHAT_CHANNEL_HINTS } from '../constants/channels'
import '../chat.css'

interface ChatChannelTabItem {
  channel: ChatChannelKey
  label: string
}

interface ChatChannelTabsProps {
  channels: ChatChannelTabItem[]
  active: ChatChannelKey
  onChange: (channel: ChatChannelKey) => void
  disabled?: boolean
  embedded?: boolean
}

export function ChatChannelTabs({
  channels,
  active,
  onChange,
  disabled = false,
  embedded = false,
}: ChatChannelTabsProps) {
  if (!embedded && channels.length <= 1) return null

  return (
    <nav
      className={`chat-channel-tabs${embedded ? ' chat-channel-tabs--embedded' : ''}`}
      aria-label="ห้องทีม"
    >
      {channels.map((tab) => {
        const isActive = tab.channel === active
        return (
          <button
            key={tab.channel}
            type="button"
            className={`chat-channel-tabs__tab${isActive ? ' chat-channel-tabs__tab--active' : ''}`}
            disabled={disabled}
            title={CHAT_CHANNEL_HINTS[tab.channel]}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(tab.channel)}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
