import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { buildLinePushCandidateIds } from './linePushRecipient.ts'
import { recordCustomerLineFallback } from './customerLineFallbackNotify.ts'
import {
  buildProjectStatusLineMessage,
  clientWorkspaceProjectUrl,
  type ProjectStatusLineEvent,
} from './projectStatusLineMessages.ts'

const PROJECT_STATUS_EVENT_LABEL: Record<ProjectStatusLineEvent, string> = {
  in_progress: 'อัปเดตสถานะโปรเจกต์: เริ่มงาน',
  waiting_approval: 'อัปเดตสถานะโปรเจกต์: รออนุมัติ',
  completed: 'อัปเดตสถานะโปรเจกต์: เสร็จสิ้น',
}

/**
 * ส่งข้อความ "Project Status" ผ่าน LINE OA ให้ลูกค้า
 *
 * Dedupe ผูกกับ (project_id, event, transition timestamp):
 *   - บันทึก outbound message ลง lead_line_messages พร้อม
 *     metadata `{ source: 'project_status_<event>', project_id }`
 *   - ก่อนส่ง: เช็คว่ามี row เดิม `created_at >= projects.updated_at - 5min`
 *     → ถ้ามี ถือว่าส่งไปแล้วในรอบ transition นี้ (กัน double-fire)
 *   - ถ้า project ถูกเปลี่ยน status เป็นค่าเดิมอีกครั้งในอนาคต (updated_at
 *     ใหม่ขึ้น) ระบบจะส่งซ้ำได้ — เป็น transition ใหม่จริง
 */

async function linePushText(to: string, text: string): Promise<boolean> {
  const token = Deno.env.get('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN')?.trim()
  if (!token) return false

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.warn(
      'project-status LINE push failed',
      to.slice(0, 8),
      res.status,
      err.slice(0, 200),
    )
    return false
  }
  return true
}

export async function notifyProjectStatusLine(
  admin: SupabaseClient,
  projectId: string,
  event: ProjectStatusLineEvent,
): Promise<{ ok: boolean; skipped?: string; pushed?: boolean }> {
  const { data: project, error: pErr } = await admin
    .from('projects')
    .select('id, project_name, customer_id, status, updated_at')
    .eq('id', projectId)
    .maybeSingle()

  if (pErr || !project) {
    return { ok: false, skipped: 'project_not_found' }
  }

  // ป้องกัน race: ถ้า status ปัจจุบันไม่ตรงกับ event ที่ขอส่ง ถือว่า outdated
  if ((project.status as string) !== event) {
    return { ok: true, skipped: 'status_mismatch' }
  }

  const customerId = (project.customer_id as string | null) ?? null
  if (!customerId) {
    return { ok: true, skipped: 'no_customer' }
  }

  const { data: customer } = await admin
    .from('customers')
    .select('id, brand_name, lead_id')
    .eq('id', customerId)
    .maybeSingle()

  if (!customer) {
    return { ok: true, skipped: 'customer_not_found' }
  }

  const brandFromCustomer = (customer.brand_name as string | null)?.trim() || 'ลูกค้า'
  const leadId = (customer.lead_id as string | null) ?? null
  if (!leadId) {
    await recordCustomerLineFallback(admin, {
      customerId,
      brandName: brandFromCustomer,
      eventLabel: PROJECT_STATUS_EVENT_LABEL[event],
      reason: 'ไม่มี Lead ต้นทาง',
    })
    return { ok: true, skipped: 'no_lead_link' }
  }

  const { data: lead } = await admin
    .from('leads')
    .select('brand_name, line_user_id, line_oa_chat_user_id, owner_id')
    .eq('id', leadId)
    .maybeSingle()

  const brandName =
    lead?.brand_name?.trim() || brandFromCustomer || 'ลูกค้า'
  const leadOwnerId: string | null = (lead?.owner_id as string | null) ?? null
  const lineUserId = lead?.line_user_id ?? null
  const lineOaChatUserId = lead?.line_oa_chat_user_id ?? null

  // Dedupe — ตาม transition timestamp (project.updated_at - 5 นาที buffer)
  const projectUpdatedAt = (project.updated_at as string | null) ?? null
  if (projectUpdatedAt) {
    const cutoffMs = new Date(projectUpdatedAt).getTime() - 5 * 60_000
    const cutoffIso = new Date(cutoffMs).toISOString()
    const { data: prior } = await admin
      .from('lead_line_messages')
      .select('id')
      .eq('lead_id', leadId)
      .eq('direction', 'outbound')
      .gte('created_at', cutoffIso)
      .contains('metadata', {
        source: `project_status_${event}`,
        project_id: projectId,
      })
      .limit(1)

    if (prior?.length) {
      return { ok: true, skipped: 'already_sent_in_window' }
    }
  }

  const candidates = buildLinePushCandidateIds({ lineUserId, lineOaChatUserId })
  if (candidates.length === 0) {
    await recordCustomerLineFallback(admin, {
      customerId,
      leadOwnerId,
      brandName,
      eventLabel: PROJECT_STATUS_EVENT_LABEL[event],
      reason: 'ไม่มี LINE ID ของลูกค้า',
    })
    return { ok: true, skipped: 'no_line_recipient' }
  }

  const workspaceUrl = clientWorkspaceProjectUrl(customerId, projectId)
  const text = buildProjectStatusLineMessage(event, {
    brandName,
    projectName: (project.project_name as string) ?? 'โปรเจกต์',
    workspaceUrl,
  })

  for (const to of candidates) {
    const pushed = await linePushText(to, text)
    if (pushed) {
      await admin.from('lead_line_messages').insert({
        lead_id: leadId,
        line_user_id: to,
        direction: 'outbound',
        body: text,
        message_type: 'text',
        metadata: {
          source: `project_status_${event}`,
          project_id: projectId,
        },
      })
      return { ok: true, pushed: true }
    }
  }

  await recordCustomerLineFallback(admin, {
    customerId,
    leadOwnerId,
    brandName,
    eventLabel: PROJECT_STATUS_EVENT_LABEL[event],
    reason: 'LINE push ล้มเหลว',
  })
  return { ok: true, skipped: 'push_failed' }
}
