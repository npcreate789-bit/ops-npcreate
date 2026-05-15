import { useState } from 'react'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canUseClientPortalAi,
  isClientPortalAiStaffPreview,
} from '../../../../shared/auth/access'
import { buildClientReply } from '../../assistant/api/buildClientReply'
import { logAssistantUsage } from '../../assistant/api/usageLog'
import { CLIENT_QUESTION_OPTIONS } from '../../assistant/constants'
import type { ClientQuestionKey } from '../../assistant/types'
import type { ClientReport } from '../types'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../../assistant/assistant.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

interface Props {
  report: ClientReport
}

export function ClientAiPanel({ report }: Props) {
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const allowed = canUseClientPortalAi(roles) || !configured
  const staffPreview = isClientPortalAiStaffPreview(roles) && configured

  const [questionKey, setQuestionKey] = useState<ClientQuestionKey>('ads_performance')
  const [answer, setAnswer] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!allowed) return null

  function handleAsk(key: ClientQuestionKey) {
    setQuestionKey(key)
    setCopied(false)
    const text = buildClientReply({ report, questionKey: key })
    setAnswer(text)
    void logAssistantUsage(userId, 'client', key, report.customer.id)
  }

  async function handleCopy() {
    if (!answer) return
    try {
      await navigator.clipboard.writeText(answer)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="card card--wide">
      <h2>ถามผู้ช่วย</h2>
      <p className="muted">
        ตอบจากข้อมูลในรายงานของ{staffPreview ? 'ลูกค้าที่เลือก' : 'คุณ'}เท่านั้น — ไม่ใช้ AI ภายนอก
      </p>

      {staffPreview && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดทีมงาน — คำตอบอ้างอิงรายงาน {report.customer.brand_name} เท่านั้น
        </p>
      )}

      <div className="client-ai-chips">
        {CLIENT_QUESTION_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`crm-btn crm-btn--ghost client-ai-chip${questionKey === o.value && answer ? ' is-active' : ''}`}
            onClick={() => handleAsk(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {answer && (
        <>
          <div className="client-ai-answer">{answer}</div>
          <div className="client-ai-actions">
            <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void handleCopy()}>
              {copied ? 'คัดลอกแล้ว' : 'คัดลอกคำตอบ'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
