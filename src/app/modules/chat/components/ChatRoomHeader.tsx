import { Link } from 'react-router-dom'
import { ChatAvatar } from './ChatAvatar'
import '../chat.css'

interface ChatRoomHeaderProps {
  title: string
  subtitle?: string
  projectId?: string
  customerId?: string
  brandName?: string
  searchQuery: string
  onSearchChange: (value: string) => void
  onRefresh?: () => void
  refreshing?: boolean
}

export function ChatRoomHeader({
  title,
  subtitle,
  projectId,
  customerId,
  brandName,
  searchQuery,
  onSearchChange,
  onRefresh,
  refreshing,
}: ChatRoomHeaderProps) {
  return (
    <header className="chat-room-header">
      <div className="chat-room-header__identity">
        <ChatAvatar name={title} seed={projectId ?? title} size="lg" />
        <div className="chat-room-header__titles">
          <h2 className="chat-room-header__title">{title}</h2>
          {subtitle && <p className="chat-room-header__subtitle muted">{subtitle}</p>}
          {(projectId || customerId) && (
            <nav className="chat-room-header__links" aria-label="ลิงก์ที่เกี่ยวข้อง">
              {projectId && (
                <Link to={`/app/projects/${projectId}`} className="chat-room-header__link">
                  โปรเจกต์
                </Link>
              )}
              {customerId && brandName && (
                <Link to={`/app/customers/${customerId}`} className="chat-room-header__link">
                  {brandName}
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>

      <div className="chat-room-header__tools">
        <label className="chat-room-header__search">
          <span className="visually-hidden">ค้นหาในห้อง</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาข้อความ…"
            className="chat-room-header__search-input"
          />
        </label>
        {onRefresh && (
          <button
            type="button"
            className="chat-room-header__refresh"
            onClick={onRefresh}
            disabled={refreshing}
            title="รีเฟรช"
          >
            {refreshing ? '…' : '↻'}
          </button>
        )}
      </div>
    </header>
  )
}
