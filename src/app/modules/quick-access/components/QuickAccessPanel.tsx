import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canUseQuickAccess } from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { useQuickAccess } from '../../../hooks/useQuickAccess'
import { MAX_PINNED } from '../storage'
import { canOpenQuickAccessPath, canPinQuickAccessPath } from '../access'
import '../../crm/crm.css'
import '../quick-access.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

interface QuickAccessPanelProps {
  variant?: 'home' | 'palette'
  onNavigate?: () => void
}

export function QuickAccessPanel({ variant = 'home', onNavigate }: QuickAccessPanelProps) {
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const allowed = canUseQuickAccess(roles) || !configured
  const { pinned, recent, togglePin, isPinned, pinNotice } = useQuickAccess(
    userId,
    roles,
    configured,
  )
  if (!allowed) return null

  const compact = variant === 'palette'
  const recentOnly = recent.filter((r) => !isPinned(r.path))

  function go(path: string) {
    if (configured && roles.length > 0 && !canOpenQuickAccessPath(roles, path)) return
    onNavigate?.()
    navigate(path)
  }

  function renderRow(entry: {
    path: string
    title: string
    subtitle?: string
    visitedAt?: string
  }) {
    const linkable = !configured || canOpenQuickAccessPath(roles, entry.path)
    const canPin = linkable && (!configured || canPinQuickAccessPath(roles, entry.path))
    const pinnedNow = isPinned(entry.path)

    const body = (
      <>
        <strong>{entry.title}</strong>
        {entry.subtitle && <span>{entry.subtitle}</span>}
        {!compact && entry.visitedAt && (
          <em className="quick-access__time">{formatBangkokDateTime(entry.visitedAt)}</em>
        )}
      </>
    )

    return (
      <li key={entry.path} className="quick-access__row">
        {linkable ? (
          compact ? (
            <button
              type="button"
              className="quick-access__link quick-access__link--btn"
              onClick={() => go(entry.path)}
            >
              {body}
            </button>
          ) : (
            <Link to={entry.path} className="quick-access__link" onClick={() => onNavigate?.()}>
              {body}
            </Link>
          )
        ) : (
          <div className="quick-access__link quick-access__link--static" aria-disabled="true">
            {body}
            <span className="quick-access__locked">ไม่มีสิทธิ์เปิดหน้านี้</span>
          </div>
        )}
        {canPin && (
          <button
            type="button"
            className={`quick-access__pin${pinnedNow ? ' quick-access__pin--active' : ''}`}
            title={pinnedNow ? 'เลิกปักหมุด' : 'ปักหมุด'}
            aria-label={pinnedNow ? 'เลิกปักหมุด' : 'ปักหมุด'}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              togglePin(entry.path)
            }}
          >
            {pinnedNow ? '★' : '☆'}
          </button>
        )}
      </li>
    )
  }

  if (pinned.length === 0 && recentOnly.length === 0) {
    return (
      <p className="muted quick-access__empty">
        {compact
          ? 'ยังไม่มีหน้าล่าสุด — เดินทางในระบบแล้วกลับมาเปิด ⌘K'
          : 'ยังไม่มีประวัติ — เปิดหน้าต่างๆ ในระบบเพื่อบันทึกล่าสุดอัตโนมัติ'}
      </p>
    )
  }

  return (
    <div className={`quick-access quick-access--${variant}`}>
      <p className="quick-access-summary muted" aria-live="polite">
        {pinned.length > 0 && `ปักหมุด ${pinned.length}`}
        {pinned.length > 0 && recentOnly.length > 0 && ' · '}
        {recentOnly.length > 0 && `ล่าสุด ${recentOnly.length}`}
        {!configured && ' · เก็บในเบราว์เซอร์'}
      </p>

      {pinNotice && (
        <p className="crm-banner crm-banner--warn quick-access__notice" role="status">
          {pinNotice}
        </p>
      )}

      {pinned.length > 0 && (
        <section className="quick-access__section">
          {!compact && <h3>ปักหมุด</h3>}
          {compact && (
            <p className="quick-access__label muted">
              ปักหมุด ({pinned.length}/{MAX_PINNED})
            </p>
          )}
          <ul className="quick-access__list">{pinned.map((entry) => renderRow(entry))}</ul>
        </section>
      )}

      {recentOnly.length > 0 && (
        <section className="quick-access__section">
          {!compact && <h3>ล่าสุด</h3>}
          {compact && <p className="quick-access__label muted">ล่าสุด</p>}
          <ul className="quick-access__list">{recentOnly.map((entry) => renderRow(entry))}</ul>
        </section>
      )}
    </div>
  )
}
