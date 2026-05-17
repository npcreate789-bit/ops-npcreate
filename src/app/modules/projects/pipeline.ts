import type { Project, ProjectStatus } from './types'

export type ProjectPipelineStage = 'kickoff' | 'active' | 'done' | 'closed'

export type ProjectPipelineFilter = ProjectPipelineStage | 'all'

export const PROJECT_PIPELINE_STAGES: {
  stage: ProjectPipelineStage
  label: string
  hint: string
}[] = [
  { stage: 'kickoff', label: 'เริ่มต้น', hint: 'Onboarding / รอบรีฟ' },
  { stage: 'active', label: 'ดำเนินงาน', hint: 'วางแผน · ทำงาน · รออนุมัติ' },
  { stage: 'done', label: 'เสร็จแล้ว', hint: 'ส่งมอบ / รายงาน' },
  { stage: 'closed', label: 'ปิด / ต่อสัญญา', hint: 'จบหรือต่อสัญญา' },
]

const STATUS_TO_STAGE: Record<ProjectStatus, ProjectPipelineStage> = {
  onboarding: 'kickoff',
  waiting_brief: 'kickoff',
  planning: 'active',
  in_progress: 'active',
  waiting_approval: 'active',
  completed: 'done',
  renewal: 'closed',
  closed: 'closed',
}

export interface ProjectNextStep {
  label: string
  path: string
  detail: string
  primary?: boolean
}

export function getProjectPipelineStage(status: ProjectStatus): ProjectPipelineStage {
  return STATUS_TO_STAGE[status]
}

export function buildProjectNextSteps(project: Project): ProjectNextStep[] {
  const steps: ProjectNextStep[] = []
  const cid = project.customer_id
  const pid = project.id

  switch (project.status) {
    case 'onboarding':
    case 'waiting_brief':
      steps.push({
        label: 'รับบรีฟลูกค้า',
        path: `/app/onboarding/${cid}`,
        detail: 'ตรวจ checklist ก่อนเริ่มงาน',
        primary: true,
      })
      steps.push({
        label: 'มุมลูกค้า (บรีฟ)',
        path: '/app/client/brief',
        detail: 'ลูกค้ากรอกและส่งบรีฟ',
      })
      break
    case 'planning':
      steps.push({
        label: 'งานของโปรเจกต์',
        path: `/app/tasks?project=${pid}`,
        detail: 'สร้างและมอบหมายงาน',
        primary: true,
      })
      steps.push({
        label: 'แชทลูกค้า',
        path: `/app/chat?project=${pid}&channel=client`,
        detail: 'ยืนยันแผนงาน',
      })
      break
    case 'in_progress':
      steps.push({
        label: 'งานของโปรเจกต์',
        path: `/app/tasks?project=${pid}`,
        detail: 'ติดตามความคืบหน้า',
        primary: true,
      })
      steps.push({
        label: 'แชทลูกค้า',
        path: `/app/chat?project=${pid}&channel=client`,
        detail: 'อัปเดตและรับไฟล์',
      })
      if (project.service_type === 'GMV_MAX') {
        steps.push({
          label: 'รายงานแอด',
          path: `/app/ads/${cid}`,
          detail: 'บันทึกผลรายวัน',
        })
      }
      break
    case 'waiting_approval':
      steps.push({
        label: 'แชทลูกค้า',
        path: `/app/chat?project=${pid}&channel=client`,
        detail: 'รอลูกค้าอนุมัติงาน',
        primary: true,
      })
      break
    case 'completed':
      steps.push({
        label: 'Client Workspace',
        path: '/app/client',
        detail: 'ลูกค้าดูรายงานและผลงาน',
        primary: true,
      })
      if (project.service_type === 'GMV_MAX') {
        steps.push({
          label: 'รายงานแอด',
          path: `/app/ads/${cid}`,
          detail: 'สรุปผลช่วงที่ผ่านมา',
        })
      }
      steps.push({
        label: 'ต่อสัญญา',
        path: '/app/renewals',
        detail: 'ถ้าลูกค้าต่อแพ็กเกจ',
      })
      break
    case 'renewal':
      steps.push({
        label: 'ต่อสัญญา',
        path: '/app/renewals',
        detail: 'จัดการ renewal',
        primary: true,
      })
      break
    case 'closed':
      steps.push({
        label: 'ลูกค้า 360°',
        path: `/app/customers/${cid}`,
        detail: 'ภาพรวมหลังปิดโปรเจกต์',
        primary: true,
      })
      break
  }

  steps.push({
    label: 'ลูกค้า 360°',
    path: `/app/customers/${cid}`,
    detail: 'ข้อมูลสัญญาและลิงก์อื่น',
  })

  return steps
}

/** ข้อความสั้นสำหรับลูกค้า — ไม่ใช้ศัพท์ภายใน */
export function clientProjectStatusHint(status: ProjectStatus): string {
  switch (status) {
    case 'onboarding':
      return 'ทีมเตรียมเปิดงาน — กรุณากรอกบรีฟถ้ายังไม่ส่ง'
    case 'waiting_brief':
      return 'รอข้อมูลบรีฟจากคุณ'
    case 'planning':
      return 'ทีมวางแผนงาน'
    case 'in_progress':
      return 'กำลังดำเนินงาน'
    case 'waiting_approval':
      return 'รอคุณอนุมัติงาน — แจ้งทีมในแชทได้'
    case 'completed':
      return 'งานเสร็จแล้ว — ดูรายงานใน Client Workspace'
    case 'renewal':
      return 'อยู่ระหว่างต่อสัญญา'
    case 'closed':
      return 'ปิดโปรเจกต์แล้ว'
    default:
      return status
  }
}

export function clientProjectPrimaryCta(
  project: Project,
): { label: string; to: string; state?: { projectId: string } } {
  switch (project.status) {
    case 'waiting_brief':
    case 'onboarding':
      return { label: 'กรอกบรีฟ', to: '/app/client/brief' }
    case 'waiting_approval':
    case 'in_progress':
    case 'planning':
      return { label: 'แชททีม', to: '/app/client/chat', state: { projectId: project.id } }
    case 'completed':
      return { label: 'ดูรายงาน', to: '/app/client/reports' }
    default:
      return { label: 'แชททีม', to: '/app/client/chat', state: { projectId: project.id } }
  }
}
