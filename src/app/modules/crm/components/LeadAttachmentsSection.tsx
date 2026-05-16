import { useCallback, useEffect, useId, useState } from 'react'
import {
  deleteLeadFile,
  getLeadFileUrl,
  listLeadFiles,
  uploadLeadFile,
  type LeadFile,
} from '../api/leads'
import { leadFileDisplayName, validateLeadUploadFile } from '../leadFiles'
import { LeadFilePreview } from './LeadFilePreview'

const INTRO_MANAGE =
  'รูปภาพหรือ PDF ประกอบ Lead (สูงสุด 10 MB ต่อไฟล์) — เก็บในระบบคลาวด์ ใช้ดูประวัติก่อนปิดการขายและอ้างอิงใน Customer 360'

const INTRO_VIEW =
  'ไฟล์จาก Lead ต้นทาง — ดูหรือดาวน์โหลดได้ตามสิทธิ์ (แก้ไขได้ที่หน้า Lead)'

interface LeadAttachmentsSectionProps {
  leadId: string
  ownerId: string
  canUpload: boolean
  /** ห่อด้วย card — ปิดเมื่อฝังใน card อื่นแล้ว */
  asCard?: boolean
  className?: string
}

export function LeadAttachmentsSection({
  leadId,
  ownerId,
  canUpload,
  asCard = true,
  className = '',
}: LeadAttachmentsSectionProps) {
  const [files, setFiles] = useState<LeadFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewPath, setPreviewPath] = useState<string | null>(null)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const uploadInputId = useId()
  const busy = uploading || deletingPath !== null

  function togglePreview(path: string) {
    if (busy) return
    setPreviewPath((prev) => (prev === path ? null : path))
  }

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true)
      setError(null)
      try {
        const next = await listLeadFiles(leadId, ownerId)
        setFiles(next)
        setPreviewPath((prev) => (prev && !next.some((f) => f.path === prev) ? null : prev))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'โหลดรายการไฟล์ไม่สำเร็จ')
      } finally {
        if (!options?.silent) setLoading(false)
      }
    },
    [leadId, ownerId],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const invalid = validateLeadUploadFile(file)
    if (invalid) {
      setError(invalid)
      e.target.value = ''
      return
    }
    setUploading(true)
    setError(null)
    try {
      await uploadLeadFile(leadId, ownerId, file)
      await refresh({ silent: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDownload(path: string) {
    setError(null)
    try {
      const url = await getLeadFileUrl(path, { download: true })
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      else setError('ไม่สามารถดาวน์โหลดไฟล์ได้')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ดาวน์โหลดไม่สำเร็จ')
    }
  }

  async function handleDelete(file: LeadFile) {
    const label = leadFileDisplayName(file.name)
    if (!confirm(`ลบไฟล์ "${label}" ถาวร?`)) return
    setDeletingPath(file.path)
    setError(null)
    try {
      await deleteLeadFile(file.path, leadId, ownerId)
      if (previewPath === file.path) setPreviewPath(null)
      await refresh({ silent: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบไฟล์ไม่สำเร็จ')
    } finally {
      setDeletingPath(null)
    }
  }

  const previewFile = previewPath ? files.find((f) => f.path === previewPath) : null

  const body = (
    <>
      <h2 className="crm-section-title">ไฟล์แนบ</h2>
      <p className="crm-attachments-intro muted">
        {canUpload ? INTRO_MANAGE : INTRO_VIEW}
      </p>

      {canUpload && (
        <div className="crm-attachments-upload">
          <label htmlFor={uploadInputId} className="crm-file-picker">
            <input
              id={uploadInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => void handleFileChange(e)}
              disabled={busy}
              className="crm-file-picker__input"
            />
            <span className="crm-btn crm-btn--ghost crm-file-picker__btn">
              {uploading ? 'กำลังอัปโหลด…' : 'เลือกไฟล์'}
            </span>
          </label>
          <span className="crm-file-picker__hint muted">JPEG, PNG, WebP หรือ PDF · สูงสุด 10 MB</span>
        </div>
      )}

      {error && <p className="crm-error" role="alert">{error}</p>}
      {loading && <p className="muted">กำลังโหลดรายการไฟล์…</p>}

      {!loading && files.length === 0 && (
        <p className="muted crm-attachments-empty">ยังไม่มีไฟล์แนบ</p>
      )}

      {!loading && files.length > 0 && (
        <ul className="crm-attachments-list" aria-label="รายการไฟล์แนบ">
          {files.map((f) => {
            const open = previewPath === f.path
            const displayName = leadFileDisplayName(f.name)
            return (
              <li
                key={f.path}
                className={
                  open
                    ? 'crm-attachments-list__item crm-attachments-list__item--open'
                    : 'crm-attachments-list__item'
                }
              >
                <span className="crm-attachments-list__name" title={displayName}>
                  {displayName}
                </span>
                <span className="crm-attachments-list__actions">
                  <button
                    type="button"
                    className={
                      open
                        ? 'crm-btn crm-btn--ghost crm-btn--toggle-on'
                        : 'crm-btn crm-btn--ghost'
                    }
                    onClick={() => togglePreview(f.path)}
                    aria-expanded={open}
                    disabled={busy}
                  >
                    {open ? 'ปิด' : 'ดู'}
                  </button>
                  <button
                    type="button"
                    className="crm-btn crm-btn--ghost"
                    onClick={() => void handleDownload(f.path)}
                    disabled={busy}
                  >
                    ดาวน์โหลด
                  </button>
                  {canUpload && (
                    <button
                      type="button"
                      className="crm-btn crm-btn--danger"
                      onClick={() => void handleDelete(f)}
                      disabled={busy}
                      aria-busy={deletingPath === f.path}
                    >
                      {deletingPath === f.path ? 'กำลังลบ…' : 'ลบ'}
                    </button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {previewFile && (
        <LeadFilePreview
          path={previewFile.path}
          fileName={previewFile.name}
          onClose={() => setPreviewPath(null)}
        />
      )}
    </>
  )

  if (asCard) {
    return (
      <section className={`card card--wide crm-attachments-section ${className}`.trim()}>
        {body}
      </section>
    )
  }

  return <section className={`crm-attachments-section ${className}`.trim()}>{body}</section>
}
