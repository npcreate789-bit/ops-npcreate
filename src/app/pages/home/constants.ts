/** ลำดับเมนูสำคัญบนหน้าหลัก (กรองตามสิทธิ์จริง — เฉพาะที่อยู่ในแถบเมนู) */
export const HOME_PRIORITY_PATHS = [
  '/app/work',
  '/app/crm',
  '/app/sales',
  '/app/tasks',
  '/app/onboarding',
  '/app/content',
  '/app/ads',
  '/app/finance',
  '/app/renewals',
  '/app/dashboard',
  '/app/customers',
  '/app/reports',
] as const

export const HOME_CLIENT_PRIORITY_PATHS = ['/app/client', '/app/help'] as const

/** ทางลัดหลักบนหน้าหลักลูกค้า — สอดคล้องแท็บ Client Workspace */
export const HOME_CLIENT_ACTIONS = [
  {
    path: '/app/client',
    label: 'ภาพรวม',
    icon: '◈',
    hint: 'ความคืบหน้าและ KPI ล่าสุด',
  },
  {
    path: '/app/client/chat',
    label: 'แชท',
    icon: '◎',
    hint: 'คุยกับทีม NP Create',
  },
  {
    path: '/app/client/brief',
    label: 'บรีฟงาน',
    icon: '✎',
    hint: 'กรอกข้อมูลแบรนด์และสินค้า',
  },
  {
    path: '/app/client/projects',
    label: 'โปรเจกต์',
    icon: '▣',
    hint: 'ติดตามงานแยกตามบริการ',
  },
  {
    path: '/app/client/reports',
    label: 'รายงาน',
    icon: '▦',
    hint: 'ผลโฆษณาและรายงานรายเดือน',
  },
  {
    path: '/app/client/payment',
    label: 'การชำระเงิน',
    icon: '◇',
    hint: 'สัญญาและใบเสนอราคา',
  },
] as const

/** คำอธิบายสั้นสำหรับการ์ดเมนู */
export const HOME_MODULE_HINTS: Record<string, string> = {
  '/app/work': 'งานค้าง นัด Lead สัญญา และแจ้งเตือน',
  '/app/crm': 'Lead → ขาย → บรีฟ → Client Workspace',
  '/app/sales': 'CRM → ใบเสนอราคา → Finance → Client Workspace',
  '/app/finance': 'ชำระเงินและเอกสารการเงิน',
  '/app/onboarding': 'รับบรีฟและเปิดงานลูกค้า',
  '/app/ads': 'แคมเปญและงานยิงแอด',
  '/app/tasks': 'งานภายในทีม',
  '/app/dashboard': 'KPI และภาพรวมผู้บริหาร',
  '/app/content': 'งานคอนเทนต์และ UGC',
  '/app/client': 'พื้นที่ลูกค้า — ภาพรวม แชท และรายงาน',
  '/app/creators': 'ฐานข้อมูลครีเอเตอร์',
  '/app/renewals': 'สัญญาใกล้หมดอายุ',
  '/app/reports': 'รายงานขั้นสูง',
  '/app/assistant': 'ผู้ช่วยจากข้อมูลในระบบ',
  '/app/customers': 'ข้อมูลลูกค้า 360°',
  '/app/ops': 'เช็กลิสต์ Ops และ deploy',
  '/app/admin': 'ผู้ใช้และบทบาท',
  '/app/help': 'คู่มือและคำถามที่พบบ่อย',
  '/app/settings': 'บัญชีและรหัสผ่าน',
  '/app/status': 'เวอร์ชันแอปและการเชื่อมต่อ',
}

export const HOME_WORK_PREVIEW_LIMIT = 6
export const HOME_PRIORITY_LIMIT = 6
export const HOME_MODULE_GRID_LIMIT = 12
