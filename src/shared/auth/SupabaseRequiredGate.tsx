import './auth.css'

/** บล็อกแอปเมื่อ production build ไม่มี VITE_SUPABASE_* */
export function SupabaseRequiredGate() {
  return (
    <div className="auth-loading auth-loading--blocked" role="alert">
      <h2>ยังไม่ได้ตั้งค่าระบบ</h2>
      <p className="muted">
        แอป production ต้องมี <code>VITE_SUPABASE_URL</code> และ{' '}
        <code>VITE_SUPABASE_ANON_KEY</code> ใน environment (เช่น Vercel หรือ{' '}
        <code>.env.local</code> สำหรับ build)
      </p>
      <p className="muted">ดูตัวอย่างใน <code>.env.example</code> แล้ว deploy ใหม่</p>
    </div>
  )
}
