import { useEffect, useMemo, useState } from 'react'
import {
  fetchCompanyPaymentSettings,
  getCachedCompanyPaymentSettings,
} from '../../../../shared/payment/companyPaymentSettings'
import type { CompanyPaymentSettings } from '../../../../shared/payment/companyPaymentSettings'
import {
  buildPaymentInstructionsMessage,
  formatThaiBaht,
} from '../../../../shared/payment/buildPaymentInstructionsMessage'
import {
  buildPromptPayPayload,
  promptPayQrImageUrl,
} from '../../../../shared/payment/promptPayQr'
import { copyTextToClipboard } from '../../../../shared/line/staffLineMessaging'

export interface PaymentInstructionsCardProps {
  brandName: string
  quotationNumber: string
  total: number
  itemsSummary?: string | null
  contractMonths?: number | null
  variant?: 'public' | 'staff'
}

export function PaymentInstructionsCard({
  brandName,
  quotationNumber,
  total,
  itemsSummary,
  contractMonths,
  variant = 'staff',
}: PaymentInstructionsCardProps) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [settings, setSettings] = useState<CompanyPaymentSettings>(() =>
    getCachedCompanyPaymentSettings(),
  )

  useEffect(() => {
    let cancelled = false
    void fetchCompanyPaymentSettings().then((s) => {
      if (!cancelled) setSettings(s)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const message = useMemo(
    () =>
      buildPaymentInstructionsMessage(
        {
          brandName,
          quotationNumber,
          total,
          itemsSummary,
          contractMonths,
        },
        settings,
      ),
    [brandName, quotationNumber, total, itemsSummary, contractMonths, settings],
  )

  const qrUrl = useMemo(() => {
    const payload = buildPromptPayPayload(total, settings)
    return promptPayQrImageUrl(payload, variant === 'public' ? 240 : 220)
  }, [total, variant, settings])

  async function copy(value: string, okMsg: string) {
    const ok = await copyTextToClipboard(value)
    setFeedback(ok ? okMsg : 'คัดลอกไม่สำเร็จ — กดค้างที่ข้อความแล้วเลือกคัดลอก')
  }

  return (
    <div
      className={`qt-payment-card${variant === 'public' ? ' qt-payment-card--public' : ''}`}
    >
      <div className="qt-payment-panel__grid">
        <section className="qt-payment-bank" aria-label="บัญชีรับโอน">
          <h3>โอนบัญชีธนาคาร</h3>
          <dl>
            <dt>ธนาคาร</dt>
            <dd>{settings.bank_name}</dd>
            <dt>เลขบัญชี</dt>
            <dd>
              <button
                type="button"
                className="qt-payment-copyable"
                onClick={() => void copy(settings.account_number, 'คัดลอกเลขบัญชีแล้ว')}
              >
                {settings.account_number}
              </button>
            </dd>
            <dt>ชื่อบัญชี</dt>
            <dd>{settings.account_name}</dd>
            <dt>ยอดโอน</dt>
            <dd className="qt-payment-bank__amount">{formatThaiBaht(total)}</dd>
            <dt>อ้างอิง</dt>
            <dd>{quotationNumber}</dd>
          </dl>
        </section>

        <section className="qt-payment-qr" aria-label="QR PromptPay">
          <h3>สแกนจ่าย (PromptPay)</h3>
          <img
            src={qrUrl}
            alt={`QR PromptPay ยอด ${formatThaiBaht(total)} อ้างอิง ${quotationNumber}`}
            width={220}
            height={220}
            className="qt-payment-qr__img"
          />
          <p className="crm-sub">ตรวจยอดก่อนยืนยัน — ระบุเลขที่ใบเสนอราคาเมื่อโอน</p>
        </section>
      </div>

      {variant === 'public' ? (
        <p className="qt-payment-card__hint">
          โอนแล้วอัปโหลดสลิปด้านล่าง — หรือส่งสลิปทางแชท LINE กับทีม NP Create ทีมจะยืนยันการชำระและเริ่มงานต่อ
        </p>
      ) : null}

      <div className="qt-payment-card__copy-actions">
        <button
          type="button"
          className="crm-btn crm-btn--ghost"
          onClick={() => void copy(message, 'คัดลอกข้อความแล้ว')}
        >
          คัดลอกข้อความทั้งหมด
        </button>
        <button
          type="button"
          className="crm-btn crm-btn--ghost"
          onClick={() =>
            void copy(
              `${formatThaiBaht(total)}\nอ้างอิง ${quotationNumber}`,
              'คัดลอกยอดและอ้างอิงแล้ว',
            )
          }
        >
          คัดลอกยอด + อ้างอิง
        </button>
      </div>

      {feedback ? (
        <p className="crm-banner crm-banner--ok qt-payment-card__feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  )
}
