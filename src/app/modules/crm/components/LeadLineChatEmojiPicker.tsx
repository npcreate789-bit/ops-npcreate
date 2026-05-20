import { useEffect, useRef, useState } from 'react'
import { LINE_CHAT_EMOJI_GROUPS } from '../lineChatEmojis'

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
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id ?? '')
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
      className="crm-line-chat__emoji-picker"
      role="dialog"
      aria-label="เลือกอีโมจิ"
    >
      <div className="crm-line-chat__emoji-picker-head">
        <span className="crm-line-chat__emoji-picker-title">อีโมจิ</span>
        <button
          type="button"
          className="crm-line-chat__emoji-picker-close"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>
      </div>
      <div className="crm-line-chat__emoji-picker-tabs" role="tablist">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={group.id === activeGroup.id}
            className={`crm-line-chat__emoji-picker-tab${
              group.id === activeGroup.id ? ' crm-line-chat__emoji-picker-tab--active' : ''
            }`}
            onClick={() => setActiveGroupId(group.id)}
            title={group.label}
          >
            {group.icon}
          </button>
        ))}
      </div>
      <div className="crm-line-chat__emoji-picker-grid">
        {activeGroup.emojis.map((emoji, i) => (
          <button
            key={`${activeGroup.id}-${emoji}-${i}`}
            type="button"
            className="crm-line-chat__emoji-picker-item"
            onClick={() => {
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
