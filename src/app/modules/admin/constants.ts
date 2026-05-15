export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'user.activate': 'เปิดใช้บัญชี',
  'user.deactivate': 'ปิดบัญชี',
  'user.roles_update': 'อัปเดตบทบาท',
  'client_access.set': 'ผูกลูกค้า (client)',
  'client_access.clear': 'ยกเลิกผูกลูกค้า',
  'content_job.create': 'สร้างงานคอนเทนต์',
  'content_job.update': 'แก้ไขงานคอนเทนต์',
  'content_job.delete': 'ลบงานคอนเทนต์',
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}
