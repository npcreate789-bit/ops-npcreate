import {
  clearLineConnection,
  getLineOAuthDisabledReason,
  isLineOAuthConfigured,
  lineOAuthDisabledHint,
} from '../../../../shared/contact/channelConnectConfig'
import {
  isLineOAuthInProgress,
  isLineOAuthKeeperTab,
  startLineLogin,
} from '../../../../shared/contact/lineOAuth'

interface ContactLineLoginStepProps {
  lineUserId: string | null
  lineDisplayName: string | null
  onLineDisconnected: () => void
  error?: string
}

export function ContactLineLoginStep({
  lineUserId,
  lineDisplayName,
  onLineDisconnected,
  error,
}: ContactLineLoginStepProps) {
  const oauthReady = isLineOAuthConfigured()
  const oauthDisabledReason = oauthReady ? null : getLineOAuthDisabledReason()
  const connected = Boolean(lineUserId)
  const waitingOnKeeperTab = isLineOAuthKeeperTab() && isLineOAuthInProgress() && !connected

  function handleLineLogin() {
    try {
      startLineLogin()
    } catch (err) {
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
            <button type="button" className="contact-connect__primary" onClick={handleLineLogin}>
              {waitingOnKeeperTab ? 'กำลังเชื่อมต่อ LINE...' : 'เชื่อมต่อ LINE Login'}
            </button>
            {waitingOnKeeperTab && (
              <p className="contact-section__hint contact-section__hint--muted">
                ยืนยันในแอป LINE แล้วกลับมาแท็บนี้ — ไม่ต้องเปิดแท็บใหม่
              </p>
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
