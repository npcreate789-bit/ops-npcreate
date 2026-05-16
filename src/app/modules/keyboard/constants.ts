/** รายการสำหรับหน้าศูนย์คีย์ลัด — Phase 15 */
export interface KeyboardShortcutRow {
  category: string
  keys: string
  label: string
  detail: string
}

export const KEYBOARD_SHORTCUT_TABLE: KeyboardShortcutRow[] = [
  {
    category: 'ทั่วไป',
    keys: '?',
    label: 'ช่วยเหลือ',
    detail: 'เปิดศูนย์ช่วยเหลือ (ไม่ตอนพิมพ์ในช่องข้อความ)',
  },
  {
    category: 'ทั่วไป',
    keys: '⇧ /',
    label: 'ช่วยเหลือ (คีย์บอร์ด US)',
    detail: 'ทางเลือกเดียวกับ ?',
  },
  {
    category: 'ค้นหา',
    keys: '⌘K · Ctrl+K',
    label: 'ค้นหาด่วน',
    detail: 'เปิด/ปิด Command palette (ทีมภายใน)',
  },
  {
    category: 'ค้นหา',
    keys: '↑ ↓',
    label: 'เลือกผลลัพธ์',
    detail: 'เมื่อมีผลค้นหาใน Command palette',
  },
  {
    category: 'ค้นหา',
    keys: 'Enter',
    label: 'เปิดรายการที่เลือก',
    detail: 'เมื่อมีผลค้นหาและมีสิทธิ์เปิด',
  },
  {
    category: 'ค้นหา',
    keys: 'Esc',
    label: 'ปิด',
    detail: 'ปิด Command palette',
  },
  {
    category: 'หน้าหลัก / เข้าถึงด่วน',
    keys: '☆',
    label: 'ปักหมุด',
    detail: 'ในหน้าหลักหรือใน Command palette เมื่อแสดงเข้าถึงด่วน',
  },
  {
    category: 'การจัดวาง',
    keys: '‹ ›',
    label: 'พับ/ขยายแถบเมนู',
    detail: 'ปุ่มมุมแถบเมนู (เก็บค่าเครื่อง) · หรือตั้งที่หน้าการจัดวาง',
  },
  {
    category: 'เริ่มต้น',
    keys: '—',
    label: 'เช็กลิสต์เริ่มใช้งาน',
    detail: 'หน้าเริ่มใช้งาน — รายการตามโมดูลที่เข้าถึงได้',
  },
  {
    category: 'ระบบ',
    keys: '—',
    label: 'เกี่ยวกับ',
    detail: 'เวอร์ชันแอป โหมด build และสถานะ Supabase',
  },
  {
    category: 'ระบบ',
    keys: '—',
    label: 'สถานะระบบ',
    detail: 'ตรวจการเชื่อมต่อฐานข้อมูลและเซสชัน',
  },
]
