import '../chat.css'

interface ChatDayDividerProps {
  label: string
}

export function ChatDayDivider({ label }: ChatDayDividerProps) {
  return (
    <div className="chat-day-divider" role="separator">
      <span>{label}</span>
    </div>
  )
}
