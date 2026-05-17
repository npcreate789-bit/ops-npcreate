import { Link } from 'react-router-dom'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { useClientWorkspaceContext } from '../context/ClientWorkspaceContext'
import '../../crm/crm.css'
import '../client-workspace.css'

export function ClientPaymentPage() {
  const ws = useClientWorkspaceContext()

  if (ws.loading) {
    return null
  }

  return (
    <div className="page client-page">
      <header className="page__header">
        <h2>การชำระเงิน</h2>
        <p className="muted">สถานะสัญญาและเอกสารที่เกี่ยวข้อง</p>
      </header>

      {ws.data ? (
        <section className="card card--wide">
          <h3>สัญญาปัจจุบัน</h3>
          <p>
            แบรนด์ <strong>{ws.data.customer.brand_name}</strong>
          </p>
          <p className="muted">
            สถานะ: {ws.data.customer.status} · สิ้นสุด{' '}
            {formatBangkokDate(ws.data.customer.contract_end)}
          </p>
          <p className="muted" style={{ marginTop: '1rem' }}>
            ใบเสนอราคาและสลิปชำระเงินจัดการโดยทีม Finance — หากต้องการสำเนาเอกสารหรือยืนยันการชำระ
            กรุณาแจ้งผ่านแชท
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            <Link to="/app/client/chat" className="crm-btn crm-btn--ghost">
              แจ้งทีมผ่านแชท
            </Link>
            {' · '}
            <Link to="/app/help">ดูคู่มือช่วยเหลือ</Link>
          </p>
        </section>
      ) : (
        <p className="muted">ยังไม่มีข้อมูลลูกค้าที่ผูกกับบัญชีนี้</p>
      )}
    </div>
  )
}
