import { Link } from 'react-router-dom'
import { canAccessNotifications } from '../../../../shared/auth/access'
import type { AppRole } from '../../../../shared/types/roles'
import { isInquiryNotification } from '../inquiryNotification'
import { isNotificationSoundEnabled } from '../notificationSound'
import { useStaffAlertNotificationToasts } from '../useStaffAlertNotificationToasts'
import '../notifications.css'

interface StaffAlertToastsProps {
  userId: string | undefined
  roles: AppRole[]
}

export function StaffAlertToasts({ userId, roles }: StaffAlertToastsProps) {
  const enabled = canAccessNotifications(roles)
  const { toasts, dismiss } = useStaffAlertNotificationToasts(userId, enabled)
  const soundLooping = toasts.length > 0 && isNotificationSoundEnabled()

  if (!enabled || toasts.length === 0) return null

  return (
    <div className="lead-toast-stack" role="region" aria-live="polite">
      {toasts.map((n) => {
        const isInquiry = isInquiryNotification(n.dedupe_key)
        const regionLabel = isInquiry ? 'แจ้งเตือนคำขอติดต่อใหม่' : 'แจ้งเตือน Lead ใหม่'
        const openLabel = isInquiry ? 'เปิดคำขอติดต่อ' : 'เปิด Lead'
        return (
          <article
            key={n.id}
            className={`lead-toast lead-toast--${n.severity}${isInquiry ? ' lead-toast--inquiry' : ''}${soundLooping ? ' lead-toast--ringing' : ''}`}
            aria-label={regionLabel}
          >
            <div className="lead-toast__pulse" aria-hidden />
            <div className="lead-toast__body">
              <strong>{n.title}</strong>
              <p>{n.body}</p>
              {isInquiry ? (
                <p className="lead-toast__hint">ลูกค้าส่งฟอร์มติดต่อทีมงานจากเว็บไซต์</p>
              ) : null}
            </div>
            <div className="lead-toast__actions">
              {n.link ? (
                <Link
                  to={n.link}
                  className="crm-btn crm-btn--primary lead-toast__btn"
                  onClick={() => void dismiss(n.id)}
                >
                  {openLabel}
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
        )
      })}
    </div>
  )
}
