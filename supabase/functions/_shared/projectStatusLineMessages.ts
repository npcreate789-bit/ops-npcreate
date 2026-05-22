/**
 * Event ที่จะส่งให้ลูกค้าทาง LINE OA เมื่อโปรเจกต์เปลี่ยนสถานะ
 *
 * เลือก subset ของ ProjectStatus ที่ "ลูกค้าควรรู้จริง ๆ" — ตัด onboarding /
 * waiting_brief / planning / renewal / closed เพราะเป็นสถานะภายในทีม
 * (ทีมยังคุยตรงผ่าน Workspace / LINE OA ในเคสนั้นได้)
 */
export type ProjectStatusLineEvent =
  | 'in_progress'
  | 'waiting_approval'
  | 'completed'

export function clientWorkspaceProjectUrl(
  customerId: string | null,
  projectId: string | null,
): string {
  const origin =
    Deno.env.get('VITE_APP_URL')?.trim() ||
    Deno.env.get('CONTACT_OAUTH_RETURN_ORIGIN')?.trim() ||
    'https://app.npcreate.co.th'
  const base = origin.replace(/\/$/, '')
  if (!customerId) return `${base}/login`
  if (!projectId) return `${base}/app/client?customer=${encodeURIComponent(customerId)}`
  return `${base}/app/client?customer=${encodeURIComponent(customerId)}&project=${encodeURIComponent(projectId)}`
}

export function buildProjectStatusLineMessage(
  event: ProjectStatusLineEvent,
  input: {
    brandName: string
    projectName: string
    workspaceUrl: string
  },
): string {
  const brand = input.brandName.trim() || 'ลูกค้า'
  const proj = input.projectName.trim() || 'โปรเจกต์'

  switch (event) {
    case 'in_progress':
      return [
        `เริ่มงานในโปรเจกต์ "${proj}" แล้วค่ะ คุณ ${brand} 🚀`,
        '',
        'ทีมงานเริ่มลงมือแล้ว — ติดตามความคืบหน้า/ส่งไฟล์เพิ่มเติมที่:',
        input.workspaceUrl,
        '',
        'มีคำถามทักกลับห้องนี้ได้เลยค่ะ',
      ].join('\n')

    case 'waiting_approval':
      return [
        `งานในโปรเจกต์ "${proj}" พร้อมให้คุณ ${brand} ตรวจแล้วค่ะ ✅`,
        '',
        'เปิดดูรายละเอียดและกดอนุมัติ/คอมเมนต์ได้ที่:',
        input.workspaceUrl,
        '',
        'ขอรบกวนตรวจและตอบกลับ เพื่อให้ทีมเดินงานต่อไปนะคะ',
      ].join('\n')

    case 'completed':
      return [
        `งานในโปรเจกต์ "${proj}" เสร็จสมบูรณ์แล้วค่ะ คุณ ${brand} 🎉`,
        '',
        'ขอบคุณที่ไว้วางใจให้ NP Create ดูแล — ดูสรุปงาน/ไฟล์ส่งงานได้ที่:',
        input.workspaceUrl,
        '',
        'หากต้องการต่อยอด/ต่อสัญญา ทักกลับห้องนี้ได้เลยนะคะ',
      ].join('\n')
  }
}
