import { Link } from 'react-router-dom'
import type { HelpRelatedLink } from '../access'
import { withHelpContext } from '../helpNav'

interface Props {
  links: HelpRelatedLink[]
  search?: string | null
}

export function HelpRelatedToolbar({ links, search }: Props) {
  if (links.length === 0) return null

  return (
    <section className="card card--wide help-related" aria-label="โมดูลที่เกี่ยวข้อง">
      <h2>ทางลัดไปโมดูลอื่น</h2>
      <p className="muted help-related__lead">เฉพาะโมดูลที่บัญชีนี้เข้าได้</p>
      <ul className="help-related__grid">
        {links.map((link) => (
          <li key={link.path}>
            <Link to={withHelpContext(link.path, search)} className="help-related__link">
              <span className="help-related__label">{link.label}</span>
              <span className="muted help-related__hint">{link.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
