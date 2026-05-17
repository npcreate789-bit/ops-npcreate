import { CHAT_REACTION_EMOJIS, type ChatReactionEmoji, type ChatReactionEntry } from '../types'
import '../chat.css'

interface ChatReactionRowProps {
  messageId: string
  reactions: ChatReactionEntry[]
  userId: string
  onToggle: (emoji: ChatReactionEmoji) => void
}

function groupReactions(reactions: ChatReactionEntry[]) {
  const map = new Map<ChatReactionEmoji, ChatReactionEntry[]>()
  for (const r of reactions) {
    const list = map.get(r.emoji) ?? []
    list.push(r)
    map.set(r.emoji, list)
  }
  return map
}

export function ChatReactionRow({ messageId, reactions, userId, onToggle }: ChatReactionRowProps) {
  const grouped = groupReactions(reactions)
  const hasAny = reactions.length > 0

  return (
    <div className="chat-reactions" data-message-id={messageId}>
      {hasAny && (
        <div className="chat-reactions__chips">
          {[...grouped.entries()].map(([emoji, users]) => {
            const mine = users.some((u) => u.user_id === userId)
            return (
              <button
                key={emoji}
                type="button"
                className={`chat-reactions__chip${mine ? ' chat-reactions__chip--mine' : ''}`}
                title={users.map((u) => u.full_name).join(', ')}
                onClick={() => onToggle(emoji)}
              >
                <span>{emoji}</span>
                <span className="chat-reactions__count">{users.length}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="chat-reactions__picker">
        {CHAT_REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="chat-reactions__pick"
            title={`react ${emoji}`}
            onClick={() => onToggle(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
