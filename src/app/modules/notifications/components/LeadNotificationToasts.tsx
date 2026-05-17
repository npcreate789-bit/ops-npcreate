import { Link } from 'react-router-dom'
import { canAccessNotifications } from '../../../../shared/auth/access'
import type { AppRole } from '../../../../shared/types/roles'
import { useLeadNotificationToasts } from '../useLeadNotificationToasts'
import '../notifications.css'

interface LeadNotificationToastsProps {
  userId: string | undefined
  roles: AppRole[]
}

export function LeadNotificationToasts({ userId, roles }: LeadNotificationToastsProps) {
  const enabled = canAccessNotifications(roles)
  const { toasts, dismiss } = useLeadNotificationToasts(userId, enabled)

  if (!enabled || toasts.length === 0) return null

  return (
    <div className="lead-toast-stack" role="region" aria-label="แจ้งเตือน Lead ใหม่" aria-live="polite">
      {toasts.map((n) => (
        <article key={n.id} className={`lead-toast lead-toast--${n.severity}`}>
          <div className="lead-toast__pulse" aria-hidden />
          <div className="lead-toast__body">
            <strong>{n.title}</strong>
            <p>{n.body}</p>
          </div>
          <div className="lead-toast__actions">
            {n.link ? (
              <Link
                to={n.link}
                className="crm-btn crm-btn--primary lead-toast__btn"
                onClick={() => void dismiss(n.id)}
              >
                เปิด Lead
              </Link>
            ) : null}
            <button
              type="button"
              className="crm-btn crm-btn--ghost lead-toast__btn"
              onClick={() => void dismiss(n.id)}
            >
              รับทราบ
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
