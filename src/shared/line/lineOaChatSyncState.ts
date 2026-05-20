import { isLegacyDocLineChatUserExampleId } from './lineDocumentedExampleIds'
import { isUsableLinePushUserId, leadHasLinePushCapability } from './linePushEligibility'
import {
  type LeadLineIds,
  lineLoginAndOaIdsMismatch,
  resolveLineMessagingRecipientId,
} from './lineUserIdResolution'
import { isLineMessagingUserId } from './lineStaffOpenUrl'

export type LinePushRecipientSource = 'inbound' | 'saved_oa' | 'login' | null

export interface LineOaChatSyncState {
  loginId: string
  savedOaId: string
  inboundId: string
  effectivePushId: string | null
  pushSource: LinePushRecipientSource
  idsMismatch: boolean
  sameId: boolean
  savedOaIsLegacyExample: boolean
  savedOaDiffersFromInbound: boolean
  shouldOfferInboundSync: boolean
  canPush: boolean
  showTopMismatchNote: boolean
  showOaReadyMessage: boolean
}

function truncateId(id: string, head = 10, tail = 8): string {
  const t = id.trim()
  if (t.length <= head + tail + 1) return t
  return `${t.slice(0, head)}…${t.slice(-tail)}`
}

/** สถานะ ID แชท OA / Login / inbound — ใช้ร่วมกันทั้งฟอร์มบันทึกและแผงแชท */
export function computeLineOaChatSyncState(
  lineIds: LeadLineIds,
  latestInboundLineUserId?: string | null,
): LineOaChatSyncState {
  const loginId = lineIds.line_user_id?.trim() ?? ''
  const savedOaId = lineIds.line_oa_chat_user_id?.trim() ?? ''
  const inboundId = isUsableLinePushUserId(latestInboundLineUserId)
    ? latestInboundLineUserId!.trim()
    : ''

  const idsMismatch = lineLoginAndOaIdsMismatch(lineIds)
  const sameId = Boolean(loginId && savedOaId) && loginId.toLowerCase() === savedOaId.toLowerCase()
  const savedOaIsLegacyExample = isLegacyDocLineChatUserExampleId(savedOaId)
  const savedOaDiffersFromInbound = Boolean(
    inboundId && savedOaId && inboundId.toLowerCase() !== savedOaId.toLowerCase(),
  )

  let effectivePushId: string | null = null
  let pushSource: LinePushRecipientSource = null

  if (inboundId) {
    effectivePushId = inboundId
    pushSource = 'inbound'
  } else {
    const fromForm = resolveLineMessagingRecipientId(lineIds)
    if (fromForm && isUsableLinePushUserId(fromForm)) {
      effectivePushId = fromForm
      pushSource = 'saved_oa'
    } else if (!idsMismatch && loginId && isLineMessagingUserId(loginId)) {
      effectivePushId = loginId
      pushSource = 'login'
    }
  }

  const shouldOfferInboundSync = savedOaDiffersFromInbound
  const canPush = leadHasLinePushCapability(lineIds, latestInboundLineUserId)

  return {
    loginId,
    savedOaId,
    inboundId,
    effectivePushId,
    pushSource,
    idsMismatch,
    sameId,
    savedOaIsLegacyExample,
    savedOaDiffersFromInbound,
    shouldOfferInboundSync,
    canPush,
    showTopMismatchNote: idsMismatch && !sameId && !shouldOfferInboundSync,
    showOaReadyMessage: canPush,
  }
}

/** ข้อความหลังบันทึก ID แชท OA */
export function lineOaChatIdPostSaveNotice(
  state: LineOaChatSyncState,
  savedUserId: string,
): string | null {
  if (state.shouldOfferInboundSync && state.inboundId) {
    const parts = [
      `บันทึกแล้ว — การส่งข้อความใช้ ID จากข้อความลูกค้า (${truncateId(state.inboundId)})`,
    ]
    if (state.savedOaIsLegacyExample) {
      parts.push('ค่าที่บันทึกตรงตัวอย่างในคู่มือเก่า')
    } else if (state.savedOaDiffersFromInbound) {
      parts.push(`ไม่ตรงกับที่บันทึก (${truncateId(savedUserId)})`)
    }
    parts.push('กด「ใช้ ID จากข้อความลูกค้า」ในแผงแชทเพื่อให้ตรงกัน')
    return parts.join(' — ')
  }
  if (state.savedOaIsLegacyExample && !state.inboundId) {
    return (
      'บันทึกแล้ว — URL/ID ตรงตัวอย่างในคู่มือเก่า ถ้าคัดลอกจากเอกสาร ' +
      'ให้เปิดแชทลูกค้าจริงบน chat.line.biz แล้วคัดลอก URL จากแถบที่อยู่'
    )
  }
  return null
}

/** ข้อความแบนเนอร์เดียวในแผงแชท */
export function lineOaChatInboundSyncBannerText(state: LineOaChatSyncState): string {
  if (state.savedOaIsLegacyExample) {
    return (
      `ID ที่บันทึก (${truncateId(state.savedOaId)}) เป็นตัวอย่างในคู่มือ — ` +
      `ลูกค้าที่ทักเข้ามาใช้ ID ${truncateId(state.inboundId)} กดปุ่มด้านล่างเพื่ออัปเดต`
    )
  }
  return (
    `ID ที่บันทึก (${truncateId(state.savedOaId)}) ไม่ตรงข้อความลูกค้า (${truncateId(state.inboundId)}) — ` +
    'กดปุ่มด้านล่างเพื่อใช้ ID จากแชทจริง'
  )
}
