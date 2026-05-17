import { ClientPreviewBar } from '../components/ClientPreviewBar'
import { useClientWorkspace } from '../hooks/useClientWorkspace'
import '../client-workspace.css'

export function ClientChatPage() {
  const ws = useClientWorkspace()

  return (
    <div className="page">
      <header className="page__header">
        <h1>แชทกับทีม</h1>
        <p className="muted">Group Chat ต่อโปรเจกต์ — กำลังพัฒนา (MVP Phase ถัดไป)</p>
      </header>

      <ClientPreviewBar
        configured={ws.configured}
        canPreview={ws.canPreview}
        customers={ws.customers}
        previewId={ws.previewId}
        onPreviewChange={ws.setPreviewId}
        data={ws.data}
        error={ws.error}
        isClientOnly={ws.isClientOnly}
      />

      <section className="card card--wide client-placeholder">
        <p>
          ระบบแชทกลุ่มจะเชื่อมกับโปรเจกต์ของคุณ — ส่งข้อความ รูป ไฟล์ และสร้าง Task จากแชทได้
        </p>
        <p className="muted">ระหว่างนี้ติดต่อ Account Manager ผ่าน LINE ตามช่องทางเดิม</p>
      </section>
    </div>
  )
}
