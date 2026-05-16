import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { startTasksVisibleForRoles } from '../checklist'
import { useStartChecklist } from '../useStartChecklist'
import '../start.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function StartChecklistSection() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const userId = profile?.id ?? DEV_OWNER
  const tasks = startTasksVisibleForRoles(roles, configured)
  const { done, toggle, reset } = useStartChecklist(userId)

  const total = tasks.length
  const checked = tasks.filter((t) => done[t.id]).length

  return (
    <>
      <p className="start-page__progress" aria-live="polite">
        ความคืบหน้า {total > 0 ? `${checked} / ${total}` : '—'} รายการที่เห็นตามบทบาท
      </p>

      {total === 0 ? (
        <p className="muted">ยังไม่มีรายการสำหรับบทบาทนี้ — ติดต่อผู้ดูแลเพื่อมอบสิทธิ์โมดูล</p>
      ) : (
        <ul className="start-page__list">
          {tasks.map((task) => (
            <li key={task.id} className="start-page__item">
              <input
                id={`start-task-${task.id}`}
                type="checkbox"
                checked={Boolean(done[task.id])}
                onChange={() => toggle(task.id)}
                aria-describedby={`start-task-${task.id}-hint`}
              />
              <div className="start-page__item-body">
                <Link to={task.path} className="start-page__task-title">
                  {task.labelTh}
                </Link>
                <span id={`start-task-${task.id}-hint`} className="start-page__hint">
                  {task.hint}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > 0 && (
        <div className="start-page__actions">
          <button type="button" className="crm-btn crm-btn--ghost" onClick={reset}>
            รีเซ็ตเช็กลิสต์
          </button>
        </div>
      )}
    </>
  )
}
