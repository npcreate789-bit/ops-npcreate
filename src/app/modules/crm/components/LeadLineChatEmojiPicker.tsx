import { useEffect, useRef, useState } from 'react'
import { LINE_CHAT_EMOJI_GROUPS } from '../lineChatEmojis'
import { pushRecentEmoji } from '../lineChatRecentExpressions'

interface LeadLineChatEmojiPickerProps {
  open: boolean
  onClose: () => void
  onPick: (emoji: string) => void
}

export function LeadLineChatEmojiPicker({
  open,
  onClose,
  onPick,
}: LeadLineChatEmojiPickerProps) {
  const groups = LINE_CHAT_EMOJI_GROUPS
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id ?? 'smileys')
  const panelRef = useRef<HTMLDivElement>(null)

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0]

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, onClose])

  if (!open || !activeGroup) return null

  return (
    <div
      ref={panelRef}
      className="crm-line-emoji-panel"
      role="dialog"
      aria-label="เลือกอีโมจิ"
    >
      <div className="crm-line-emoji-panel__tabs" role="tablist" aria-label="หมวดอีโมจิ">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={group.id === activeGroup.id}
            className={`crm-line-emoji-panel__tab${
              group.id === activeGroup.id ? ' crm-line-emoji-panel__tab--active' : ''
            }`}
            title={group.label}
            onClick={() => setActiveGroupId(group.id)}
          >
            {group.icon}
          </button>
        ))}
      </div>
      <div className="crm-line-emoji-panel__grid">
        {activeGroup.emojis.map((emoji, i) => (
          <button
            key={`${activeGroup.id}-${emoji}-${i}`}
            type="button"
            className="crm-line-emoji-panel__item"
            onClick={() => {
              pushRecentEmoji(emoji)
              onPick(emoji)
              onClose()
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
