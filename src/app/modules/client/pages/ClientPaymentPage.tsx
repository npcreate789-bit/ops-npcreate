import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { listPaymentsForCustomer } from '../../finance/api/payments'
import { PaymentStatusBadge } from '../../finance/components/PaymentStatusBadge'
import { isPaymentOverdue } from '../../finance/pipeline'
import type { Payment } from '../../finance/types'
import { useClientWorkspaceContext } from '../context/ClientWorkspaceContext'
import '../../crm/crm.css'
import '../../finance/finance.css'
import '../client-workspace.css'

export function ClientPaymentPage() {
  const ws = useClientWorkspaceContext()
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)

  useEffect(() => {
    if (!ws.customerId) {
      setPayments([])
      return
    }
    let cancelled = false
    setPaymentsLoading(true)
    setPaymentsError(null)
    listPaymentsForCustomer(ws.customerId)
      .then((rows) => {
        if (!cancelled) setPayments(rows)
      })
      .catch((e) => {
        if (!cancelled) {
          setPaymentsError(e instanceof Error ? e.message : 'โหลดรายการชำระไม่สำเร็จ')
          setPayments([])
        }
      })
      .finally(() => {
        if (!cancelled) setPaymentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ws.customerId])

  if (ws.loading) {
    return null
  }

  const pending = payments.filter((p) => p.status === 'pending' || p.status === 'overdue')
  const paid = payments.filter((p) => p.status === 'paid')

  return (
    <div className="page client-page">
      <header className="page__header">
        <h2>การชำระเงิน</h2>
        <p className="muted">สถานะสัญญา รายการชำระ และเอกสารที่ทีม Finance ออกให้</p>
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
        </section>
      ) : (
        <p className="muted">ยังไม่มีข้อมูลลูกค้าที่ผูกกับบัญชีนี้</p>
      )}

      <section className="card card--wide client-payment-list">
        <h3>รายการชำระเงิน</h3>
        {paymentsLoading && <p className="muted">กำลังโหลดรายการ…</p>}
        {paymentsError && <p className="crm-error">{paymentsError}</p>}
        {!paymentsLoading && !paymentsError && payments.length === 0 && (
          <p className="muted">
            ยังไม่มีรายการในระบบ — เมื่อมีใบเสนอราคาและกำหนดชำระ ทีมจะแสดงสถานะที่นี่
          </p>
        )}
        {!paymentsLoading && payments.length > 0 && (
          <ul className="client-payment-list__items">
            {payments.map((p) => {
              const overdue = isPaymentOverdue(p)
              return (
                <li key={p.id} className="client-payment-list__item">
                  <div className="client-payment-list__row">
                    <strong>{p.total_amount.toLocaleString('th-TH')} บาท</strong>
                    {overdue && p.status === 'pending' ? (
                      <span className="pay-badge pay-badge--red">เกินกำหนด</span>
                    ) : (
                      <PaymentStatusBadge status={p.status} />
                    )}
                  </div>
                  <p className="muted">
                    ครบกำหนด {formatBangkokDate(p.due_date)}
                    {p.payment_date && ` · ชำระเมื่อ ${formatBangkokDate(p.payment_date)}`}
                  </p>
                  {(p.receipt_number || p.tax_invoice_number) && (
                    <p className="muted client-payment-list__docs">
                      {p.receipt_number && `ใบเสร็จ ${p.receipt_number}`}
                      {p.receipt_number && p.tax_invoice_number && ' · '}
                      {p.tax_invoice_number && `ใบกำกับ ${p.tax_invoice_number}`}
                    </p>
                  )}
                  {(p.status === 'pending' || p.status === 'overdue' || overdue) && (
                    <p className="client-payment-list__hint">
                      ชำระแล้วแจ้งสลิปผ่านแชท — ทีม Finance จะยืนยันและออกเอกสาร
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {pending.length > 0 && (
        <p className="crm-banner crm-banner--warn">
          มี {pending.length} รายการรอชำระ — กรุณาชำระตามกำหนดและแจ้งสลิปผ่านแชท
        </p>
      )}

      {paid.length > 0 && paid.every((p) => p.receipt_number || p.tax_invoice_number) && (
        <p className="crm-banner">
          เอกสารใบเสร็จ/ใบกำกับแสดงในรายการด้านบน — ต้องการสำเนาเพิ่มเติมแจ้งทีมได้
        </p>
      )}

      <p style={{ marginTop: '0.75rem' }}>
        <Link to="/app/client/chat" className="crm-btn crm-btn--ghost">
          แจ้งทีมผ่านแชท
        </Link>
        {' · '}
        <Link to="/app/help">ดูคู่มือช่วยเหลือ</Link>
      </p>
    </div>
  )
}
