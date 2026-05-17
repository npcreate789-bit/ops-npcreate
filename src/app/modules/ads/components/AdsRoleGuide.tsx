import { Link } from 'react-router-dom'

export function AdsRoleGuide() {
  return (
    <section className="card card--wide ads-role-guide" aria-label="เส้นทางงานยิงแอด">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <ol className="ads-role-guide__flow">
        <li>
          <strong>ทีม Ads</strong> — บันทึกผลรายวันที่นี่ (SKU · Spend · GMV) หลังลูกค้า{' '}
          <Link to="/app/onboarding">พร้อมยิงแอด</Link>
        </li>
        <li>
          <strong>Account / Ops</strong> — ตรวจงบบรีฟและ checklist ในรับบรีฟ · เปิด{' '}
          <Link to="/app/customers">ลูกค้า 360°</Link> ดูภาพรวม
        </li>
        <li>
          <strong>ลูกค้า</strong> — ดูสรุป 7 วันและรายงานรายเดือนใน{' '}
          <Link to="/app/client/reports">พื้นที่ลูกค้า → รายงาน</Link> (ไม่กรอกฟอร์มที่นี่)
        </li>
        <li>
          คลิกแบรนด์ → บันทึกรายงานวันนี้ — เลือกวันที่ย้อนหลังได้ถ้าลืมส่ง
        </li>
      </ol>
    </section>
  )
}
