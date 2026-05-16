import type { Payment, PaymentInput } from '../types'
import { getPayment, updatePayment } from './payments'

export function paymentToInput(
  payment: Payment,
  ownerId: string,
  flags?: { issue_receipt?: boolean; issue_tax_invoice?: boolean },
): PaymentInput {
  return {
    customer_id: payment.customer_id,
    quotation_id: payment.quotation_id,
    recorded_by: payment.recorded_by || ownerId,
    service_type: payment.service_type,
    amount: payment.amount,
    vat_amount: payment.vat_amount,
    total_amount: payment.total_amount,
    status: payment.status,
    payment_date: payment.payment_date,
    due_date: payment.due_date,
    notes: payment.notes,
    issue_receipt: flags?.issue_receipt ?? Boolean(payment.receipt_number),
    issue_tax_invoice: flags?.issue_tax_invoice ?? Boolean(payment.tax_invoice_number),
  }
}

/** ออกเลขเอกสารถ้ายังไม่มี แล้วคืน payment ล่าสุด */
export async function issuePaymentDocument(
  id: string,
  ownerId: string,
  type: 'receipt' | 'tax_invoice',
): Promise<Payment> {
  const existing = await getPayment(id)
  if (!existing) throw new Error('ไม่พบรายการชำระเงิน')

  if (type === 'receipt' && existing.receipt_number) return existing
  if (type === 'tax_invoice' && existing.tax_invoice_number) return existing

  const input = paymentToInput(existing, ownerId, {
    issue_receipt: type === 'receipt' ? true : Boolean(existing.receipt_number),
    issue_tax_invoice: type === 'tax_invoice' ? true : Boolean(existing.tax_invoice_number),
  })

  return updatePayment(id, input)
}
