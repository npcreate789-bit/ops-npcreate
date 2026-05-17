import { Link } from 'react-router-dom'
import type { OpsRelatedLink } from '../access'
import { withOpsContext } from '../opsNav'

interface Props {
  links: OpsRelatedLink[]
  search?: string | null
}

export function OpsRelatedToolbar({ links, search }: Props) {
  if (links.length === 0) return null

  return (
    <section className="card card--wide ops-related" aria-label="โมดูลที่เกี่ยวข้อง">
      <h2>โมดูลที่เกี่ยวข้อง</h2>
      <p className="muted ops-related__lead">เปิดจากศูนย์ Ops โดยไม่ต้องกลับหน้าหลัก</p>
      <ul className="ops-related__grid">
        {links.map((link) => (
          <li key={link.path}>
            <Link to={withOpsContext(link.path, search)} className="ops-related__link">
              <span className="ops-related__label">{link.label}</span>
              <span className="muted ops-related__hint">{link.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
