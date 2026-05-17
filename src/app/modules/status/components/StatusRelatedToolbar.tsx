import { Link } from 'react-router-dom'
import type { StatusRelatedLink } from '../access'
import { withStatusContext } from '../statusNav'

interface Props {
  links: StatusRelatedLink[]
  search?: string | null
}

export function StatusRelatedToolbar({ links, search }: Props) {
  if (links.length === 0) return null

  return (
    <section className="card card--wide status-related" aria-label="โมดูลที่เกี่ยวข้อง">
      <h2>โมดูลที่เกี่ยวข้อง</h2>
      <p className="muted status-related__lead">แก้ปัญหาหรือดำเนินงานต่อจากสถานะระบบ</p>
      <ul className="status-related__grid">
        {links.map((link) => (
          <li key={link.path}>
            <Link to={withStatusContext(link.path, search)} className="status-related__link">
              <span className="status-related__label">{link.label}</span>
              <span className="muted status-related__hint">{link.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
