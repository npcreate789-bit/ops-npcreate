import type { ChatPinnedMessage } from '../types'
import '../chat.css'

interface ChatPinnedBarProps {
  pinned: ChatPinnedMessage[]
  onJump: (messageId: string) => void
  onUnpin: (messageId: string) => void
}

export function ChatPinnedBar({ pinned, onJump, onUnpin }: ChatPinnedBarProps) {
  if (pinned.length === 0) return null

  return (
    <div className="chat-pinned-bar">
      <span className="chat-pinned-bar__icon" aria-hidden>
        📌
      </span>
      <ul className="chat-pinned-bar__list">
        {pinned.map((pin) => (
          <li key={pin.pin_id}>
            <button
              type="button"
              className="chat-pinned-bar__item"
              onClick={() => onJump(pin.message_id)}
            >
              <span className="chat-pinned-bar__text">
                {pin.body.slice(0, 72)}
                {pin.body.length > 72 ? '…' : ''}
              </span>
            </button>
            <button
              type="button"
              className="chat-pinned-bar__unpin"
              title="เลิกปักหมุด"
              onClick={() => onUnpin(pin.message_id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
