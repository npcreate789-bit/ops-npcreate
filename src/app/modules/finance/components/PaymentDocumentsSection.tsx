import { useState } from 'react'
import type { AppRole } from '../../../../shared/types/roles'
import { canManageFinance } from '../../../../shared/auth/access'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import { issuePaymentDocument } from '../api/paymentDocuments'
import type { Payment } from '../types'
import { FinancePrintDocument, type FinanceDocumentKind } from './FinancePrintDocument'
import '../finance.css'

interface PaymentDocumentsSectionProps {
  payment: Payment
  ownerId: string
  roles: AppRole[]
  readOnly: boolean
  onPaymentUpdated: (payment: Payment) => void
}

function printFinanceDocument(kind: FinanceDocumentKind) {
  document.body.dataset.printDoc = kind
  window.print()
  window.setTimeout(() => {
    delete document.body.dataset.printDoc
  }, 0)
}

export function PaymentDocumentsSection({
  payment,
  ownerId,
  roles,
  readOnly,
  onPaymentUpdated,
}: PaymentDocumentsSectionProps) {
  const canIssue = canManageFinance(roles) || !isSupabaseConfigured
  const effectiveCanIssue = canIssue && !readOnly

  const [issuing, setIssuing] = useState<FinanceDocumentKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleIssue(kind: FinanceDocumentKind) {
    setIssuing(kind)
    setError(null)
    try {
      const updated = await issuePaymentDocument(payment.id, ownerId, kind)
      onPaymentUpdated(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ออกเอกสารไม่สำเร็จ')
    } finally {
      setIssuing(null)
    }
  }

  const hasReceipt = Boolean(payment.receipt_number)
  const hasTax = Boolean(payment.tax_invoice_number)

  return (
    <section className="card card--wide finance-docs-section">
      <h2 className="crm-section-title">เอกสารการเงิน</h2>
      <p className="muted finance-docs-intro">
        ออกเลขเอกสารแล้วพิมพ์หรือบันทึกเป็น PDF — ใช้หัวกระดาษโลโก้และข้อมูลบริษัทมาตรฐาน
      </p>

      {error && <p className="crm-error">{error}</p>}

      <div className="finance-docs-actions no-print">
        {!hasReceipt && effectiveCanIssue && (
          <button
            type="button"
            className="crm-btn crm-btn--ghost"
            disabled={issuing !== null}
            onClick={() => void handleIssue('receipt')}
          >
            {issuing === 'receipt' ? 'กำลังออกเลข…' : 'ออกเลขใบเสร็จ'}
          </button>
        )}
        {!hasTax && effectiveCanIssue && (
          <button
            type="button"
            className="crm-btn crm-btn--ghost"
            disabled={issuing !== null}
            onClick={() => void handleIssue('tax_invoice')}
          >
            {issuing === 'tax_invoice' ? 'กำลังออกเลข…' : 'ออกเลขใบกำกับภาษี'}
          </button>
        )}
        {readOnly && !hasReceipt && !hasTax && (
          <p className="muted">ยังไม่มีเอกสาร — ต้องให้ Admin ออกเลขหรือบันทึกพร้อมติ๊กออกเอกสาร</p>
        )}
      </div>

      {hasReceipt && (
        <div className="finance-doc-block qt-print-section">
          <div className="no-print qt-print-toolbar">
            <strong>ใบเสร็จรับเงิน</strong>
            <span className="muted">{payment.receipt_number}</span>
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              onClick={() => printFinanceDocument('receipt')}
            >
              พิมพ์ใบเสร็จ
            </button>
          </div>
          <FinancePrintDocument payment={payment} kind="receipt" />
        </div>
      )}

      {hasTax && (
        <div className="finance-doc-block qt-print-section">
          <div className="no-print qt-print-toolbar">
            <strong>ใบกำกับภาษี</strong>
            <span className="muted">{payment.tax_invoice_number}</span>
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              onClick={() => printFinanceDocument('tax_invoice')}
            >
              พิมพ์ใบกำกับภาษี
            </button>
          </div>
          <FinancePrintDocument payment={payment} kind="tax_invoice" />
        </div>
      )}

      {!hasReceipt && !hasTax && (
        <p className="muted">
          ติ๊ก &quot;ออกใบเสร็จ&quot; / &quot;ออกใบกำกับภาษี&quot; ในฟอร์มด้านบนแล้วบันทึก
          หรือกดปุ่มออกเลขด้านบน
        </p>
      )}
    </section>
  )
}
