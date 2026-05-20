/** LINE Flex Message สำหรับส่งใบเสนอราคา (Phase 3) */

export interface QuotationFlexInput {
  brandName: string
  quotationNumber: string
  publicUrl: string
  totalLabel: string
  contractMonths?: number | null
  pdfDownloadUrl?: string | null
}

export interface QuotationFlexPayload {
  altText: string
  contents: Record<string, unknown>
}

function flexButton(label: string, uri: string, style: 'primary' | 'link' = 'primary') {
  return {
    type: 'button',
    style,
    height: 'sm',
    action: { type: 'uri', label, uri },
  }
}

/** Bubble + ปุ่มเปิดใบเสนอราคาออนไลน์ / ดาวน์โหลด PDF */
export function buildQuotationFlexMessage(input: QuotationFlexInput): QuotationFlexPayload {
  const months =
    input.contractMonths != null && input.contractMonths > 0
      ? `ระยะสัญญา ${input.contractMonths} เดือน`
      : null

  const footerButtons: Record<string, unknown>[] = [
    flexButton('ดูใบเสนอราคาออนไลน์', input.publicUrl, 'primary'),
  ]
  if (input.pdfDownloadUrl?.trim()) {
    footerButtons.push(
      flexButton('ดาวน์โหลด PDF', input.pdfDownloadUrl.trim(), 'link'),
    )
  }

  const bodyContents: Record<string, unknown>[] = [
    {
      type: 'text',
      text: input.quotationNumber,
      weight: 'bold',
      size: 'lg',
      wrap: true,
    },
    {
      type: 'text',
      text: input.brandName,
      size: 'md',
      wrap: true,
    },
  ]
  if (months) {
    bodyContents.push({
      type: 'text',
      text: months,
      size: 'sm',
      color: '#888888',
      wrap: true,
    })
  }
  bodyContents.push({
    type: 'text',
    text: `ยอดรวม ${input.totalLabel}`,
    size: 'sm',
    color: '#555555',
    wrap: true,
    margin: 'md',
  })
  bodyContents.push({
    type: 'text',
    text: 'กดปุ่มด้านล่างเพื่อเปิดดูหรือบันทึก PDF — หากมีคำถามตอบกลับแชทนี้ได้เลยครับ/ค่ะ',
    size: 'xs',
    color: '#888888',
    wrap: true,
    margin: 'lg',
  })

  const altText = `ใบเสนอราคา ${input.quotationNumber} สำหรับ ${input.brandName} — ${input.totalLabel}`

  return {
    altText: altText.slice(0, 400),
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'NP CREATE',
            color: '#ffffff',
            size: 'xs',
            weight: 'bold',
          },
          {
            type: 'text',
            text: 'ใบเสนอราคา',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'sm',
          },
        ],
        backgroundColor: '#1a1a1a',
        paddingAll: '16px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
        paddingAll: '16px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: footerButtons,
        paddingAll: '16px',
      },
    },
  }
}
