import { Link } from 'react-router-dom'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { ClientPreviewBar } from '../components/ClientPreviewBar'
import { useClientWorkspace } from '../hooks/useClientWorkspace'
import '../client-workspace.css'

export function ClientPaymentPage() {
  const ws = useClientWorkspace()

  return (
    <div className="page">
      <header className="page__header">
        <h1>การชำระเงิน</h1>
        <p className="muted">สถานะสัญญาและใบเสนอราคา</p>
      </header>

      <ClientPreviewBar
        configured={ws.configured}
        canPreview={ws.canPreview}
        customers={ws.customers}
        previewId={ws.previewId}
        onPreviewChange={ws.setPreviewId}
        data={ws.data}
        error={ws.error}
        isClientOnly={ws.isClientOnly}
      />

      {ws.data ? (
        <section className="card card--wide">
          <h2>สัญญาปัจจุบัน</h2>
          <p>
            แบรนด์ <strong>{ws.data.customer.brand_name}</strong>
          </p>
          <p className="muted">
            สถานะ: {ws.data.customer.status} · สิ้นสุด{' '}
            {formatBangkokDate(ws.data.customer.contract_end)}
          </p>
          <p className="muted" style={{ marginTop: '1rem' }}>
            ใบเสนอราคาและสลิปชำระเงิน — ทีม Finance จัดการในระบบภายใน
          </p>
          <p className="muted">
            ต่อสัญญา: <Link to="/app/renewals">แจ้งทีม Account</Link>
          </p>
        </section>
      ) : (
        <p className="muted">ยังไม่มีข้อมูลลูกค้าที่ผูกกับบัญชีนี้</p>
      )}
    </div>
  )
}
