import {
  clearLineConnection,
  getLineOAuthDisabledReason,
  isLineOAuthConfigured,
  lineOAuthDisabledHint,
  lineOAuthHostMismatchHint,
} from '../../../../shared/contact/channelConnectConfig'
import { startLineLogin } from '../../../../shared/contact/lineOAuth'

interface ContactLineLoginStepProps {
  lineUserId: string | null
  lineDisplayName: string | null
  lineOAuthCompleting?: boolean
  onLineDisconnected: () => void
  onLoginError?: (message: string) => void
  error?: string
}

export function ContactLineLoginStep({
  lineUserId,
  lineDisplayName,
  lineOAuthCompleting = false,
  onLineDisconnected,
  onLoginError,
  error,
}: ContactLineLoginStepProps) {
  const oauthReady = isLineOAuthConfigured()
  const oauthDisabledReason = oauthReady ? null : getLineOAuthDisabledReason()
  const connected = Boolean(lineUserId)

  const hostMismatchHint = lineOAuthHostMismatchHint()

  function handleLineLogin() {
    try {
      startLineLogin()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'ไม่สามารถเริ่ม LINE Login ได้ — ลองใหม่อีกครั้ง'
      onLoginError?.(message)
      console.error(err)
    }
  }

  return (
    <div className="contact-line-login">
      {error && (
        <p className="contact-field-error" role="alert">
          {error}
        </p>
      )}

      <div className="contact-connect">
        {connected ? (
          <div className="contact-connect__status contact-connect__status--ok">
            <span className="contact-connect__check" aria-hidden>
              ✓
            </span>
            <div className="contact-connect__status-body">
              <strong>เชื่อมต่อ LINE แล้ว</strong>
              <p className="contact-connect__meta">
                {lineDisplayName ? `${lineDisplayName} · ` : ''}
                {lineUserId}
              </p>
              <button
                type="button"
                className="contact-connect__secondary"
                onClick={() => {
                  clearLineConnection()
                  onLineDisconnected()
                }}
              >
                เปลี่ยนบัญชี
              </button>
            </div>
          </div>
        ) : oauthReady ? (
          <>
            <button
              type="button"
              className="contact-connect__primary"
              onClick={handleLineLogin}
              disabled={lineOAuthCompleting}
            >
              {lineOAuthCompleting ? 'กำลังเชื่อมต่อ LINE...' : 'เชื่อมต่อ LINE Login'}
            </button>
            {lineOAuthCompleting && (
              <p className="contact-section__hint contact-section__hint--muted">
                กำลังยืนยันบัญชี LINE...
              </p>
            )}
            <p className="contact-section__hint contact-section__hint--muted">
              เปิดในแท็บเดิม (ไม่เปิดหน้าต่างใหม่) — หลังกด「เข้าสู่ระบบด้วยแอป LINE」จะกลับมาหน้านี้และบันทึก LINE Login
            </p>
            {hostMismatchHint && (
              <p className="contact-section__hint contact-section__hint--muted">{hostMismatchHint}</p>
            )}
          </>
        ) : (
          <p className="contact-field-error">
            {oauthDisabledReason
              ? lineOAuthDisabledHint(oauthDisabledReason)
              : 'LINE Login ยังไม่พร้อม — ติดต่อทีม NP Create'}
          </p>
        )}
      </div>
    </div>
  )
}
