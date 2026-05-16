import { Link } from 'react-router-dom'
import type { AppRole } from '../../../shared/types/roles'
import { formatBangkokDate, formatBangkokDateTime } from '../../../shared/dates/bangkok'
import { canOpenWorkItemLink } from '../../modules/work-hub/access'
import { workKindLabel } from '../../modules/work-hub/constants'
import type { WorkItem } from '../../modules/work-hub/types'
import '../../modules/crm/crm.css'
import '../../modules/timeline/timeline.css'

function formatWhen(at: string): string {
  return at.length > 10 ? formatBangkokDateTime(at) : formatBangkokDate(at)
}

function WorkRow({
  item,
  linkable,
}: {
  item: WorkItem
  linkable: boolean
}) {
  const urgency = item.overdue ? 'เกินกำหนด' : item.kind === 'notification' ? 'แจ้งเตือน' : null
  const body = (
    <>
      <div className="home-work__meta">
        <span className="timeline-item__kind">{workKindLabel(item.kind)}</span>
        {urgency ? <span className="home-work__badge home-work__badge--warn">{urgency}</span> : null}
        <time className="home-work__time">{formatWhen(item.at)}</time>
      </div>
      <p className="home-work__title">{item.title}</p>
      {item.detail ? <p className="home-work__detail">{item.detail}</p> : null}
    </>
  )

  if (linkable) {
    return (
      <li className={`home-work__item${item.kind === 'notification' ? ' home-work__item--notif' : ''}`}>
        <Link to={item.link} className="home-work__link">
          {body}
        </Link>
      </li>
    )
  }

  return (
    <li className="home-work__item home-work__item--locked">
      <div className="home-work__static">{body}</div>
      <span className="work-hub__locked">ไม่มีสิทธิ์เปิดรายละเอียด</span>
    </li>
  )
}

export function HomeWorkPreview({
  items,
  roles,
  loading,
  error,
}: {
  items: WorkItem[]
  roles: AppRole[]
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return <p className="home-work__status muted">กำลังโหลดงานที่ต้องทำ…</p>
  }
  if (error) {
    return <p className="home-work__status crm-error">{error}</p>
  }
  if (items.length === 0) {
    return (
      <p className="home-work__status muted">
        ไม่มีงานเร่งด่วนในช่วง 30 วันถัดไป — ดีมาก
      </p>
    )
  }

  return (
    <ul className="home-work__list">
      {items.map((item) => (
        <WorkRow
          key={`${item.kind}-${item.id}`}
          item={item}
          linkable={canOpenWorkItemLink(roles, item.link)}
        />
      ))}
    </ul>
  )
}
