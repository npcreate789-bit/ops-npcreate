import { Link } from 'react-router-dom'
import type { SettingsRelatedLink } from '../access'
import { withSettingsContext } from '../settingsNav'

interface Props {
  links: SettingsRelatedLink[]
  search?: string | null
}

export function SettingsRelatedToolbar({ links, search }: Props) {
  if (links.length === 0) return null

  return (
    <section className="card card--wide settings-related" aria-label="โมดูลที่เกี่ยวข้อง">
      <h2>โมดูลที่เกี่ยวข้อง</h2>
      <p className="muted settings-related__lead">เปิดโมดูลอื่นโดยไม่ต้องกลับหน้าหลัก</p>
      <ul className="settings-related__grid">
        {links.map((link) => (
          <li key={link.path}>
            <Link to={withSettingsContext(link.path, search)} className="settings-related__link">
              <span className="settings-related__label">{link.label}</span>
              <span className="muted settings-related__hint">{link.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
