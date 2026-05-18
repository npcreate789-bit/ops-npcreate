import { useEffect, useRef } from 'react'
import {
  clearLineConnection,
  getLineOAuthDisabledReason,
  isLineOAuthConfigured,
  LINE_OA_ID,
  LINE_OA_STARTER_MESSAGE,
  lineOAuthDisabledHint,
  lineOaStarterQrImageUrl,
  markLineOaContactStepDone,
  openLineOaStarterMessageFromContact,
  takeLineOaContactPendingReturn,
} from '../../../../shared/contact/channelConnectConfig'
import { isLineContactMobileDevice } from '../../../../shared/contact/lineInPlaceOpen'
import { startLineLogin } from '../../../../shared/contact/lineOAuth'

interface LineContactSetupPanelProps {
  lineUserId: string | null
  lineDisplayName: string | null
  lineOaStepDone: boolean
  onLineOaStepDone: () => void
  onLineDisconnected: () => void
  error?: string
}

export function LineContactSetupPanel({
  lineUserId,
  lineDisplayName,
  lineOaStepDone,
  onLineOaStepDone,
  onLineDisconnected,
  error,
}: LineContactSetupPanelProps) {
  const step2Ref = useRef<HTMLLIElement>(null)
  const isMobile = isLineContactMobileDevice()
  const oauthReady = isLineOAuthConfigured()
  const oauthDisabledReason = oauthReady ? null : getLineOAuthDisabledReason()
  const loginConnected = Boolean(lineUserId)
  const oaHandle = LINE_OA_ID.startsWith('@') ? LINE_OA_ID : `@${LINE_OA_ID}`

  function completeOaStep() {
    markLineOaContactStepDone()
    onLineOaStepDone()
    step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  useEffect(() => {
    function handleReturnToContact() {
      if (document.visibilityState !== 'visible') return
      if (!takeLineOaContactPendingReturn()) return
      if (lineOaStepDone) return
      completeOaStep()
    }

    handleReturnToContact()
    document.addEventListener('visibilitychange', handleReturnToContact)
    window.addEventListener('pageshow', handleReturnToContact)
    return () => {
      document.removeEventListener('visibilitychange', handleReturnToContact)
      window.removeEventListener('pageshow', handleReturnToContact)
    }
  }, [lineOaStepDone, onLineOaStepDone])

  function handleLineLogin() {
    try {
      startLineLogin()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="contact-line-flow" aria-label="เชื่อมต่อ LINE">
      {error && (
        <p className="contact-field-error" role="alert">
          {error}
        </p>
      )}

      <ol className="contact-line-steps">
        <li
          className={`contact-line-step${lineOaStepDone ? ' contact-line-step--done' : ' contact-line-step--active'}`}
        >
          <div className="contact-line-step__head">
            <span className="contact-line-step__num" aria-hidden>
              {lineOaStepDone ? '✓' : '1'}
            </span>
            <div>
              <h3 className="contact-line-step__title">ทัก {oaHandle}</h3>
              <p className="contact-line-step__desc">
                ส่งข้อความ &quot;{LINE_OA_STARTER_MESSAGE}&quot; — กดปุ่มด้านล่างแล้วกดส่งใน LINE
              </p>
            </div>
          </div>

          {!lineOaStepDone ? (
            <div className="contact-line-step__actions">
              {!isMobile && (
                <img
                  src={lineOaStarterQrImageUrl()}
                  width={160}
                  height={160}
                  alt={`QR ทัก ${oaHandle}`}
                  className="contact-line-qr__img"
                />
              )}
              <button
                type="button"
                className="contact-connect__primary"
                onClick={() => openLineOaStarterMessageFromContact()}
              >
                เปิด LINE และส่ง &quot;{LINE_OA_STARTER_MESSAGE}&quot;
              </button>
              <button type="button" className="contact-line-step__confirm" onClick={completeOaStep}>
                ส่งข้อความแล้ว
              </button>
            </div>
          ) : (
            <p className="contact-line-step__done-inline">ส่งข้อความแล้ว ✓</p>
          )}
        </li>

        <li
          ref={step2Ref}
          className={`contact-line-step${
            loginConnected
              ? ' contact-line-step--done'
              : lineOaStepDone
                ? ' contact-line-step--active'
                : ' contact-line-step--locked'
          }`}
        >
          <div className="contact-line-step__head">
            <span className="contact-line-step__num" aria-hidden>
              {loginConnected ? '✓' : '2'}
            </span>
            <div>
              <h3 className="contact-line-step__title">เชื่อมต่อ LINE Login</h3>
              <p className="contact-line-step__desc">ยืนยันตัวตนเพื่อส่งแบบฟอร์ม</p>
            </div>
          </div>

          {!lineOaStepDone ? (
            <p className="contact-line-step__locked-hint muted">ทำขั้นที่ 1 ก่อน</p>
          ) : loginConnected ? (
            <p className="contact-line-step__done-inline">
              {lineDisplayName ? `${lineDisplayName} · ` : ''}
              เชื่อมต่อแล้ว ✓{' '}
              <button type="button" className="contact-connect__secondary" onClick={() => {
                clearLineConnection()
                onLineDisconnected()
              }}>
                เปลี่ยนบัญชี
              </button>
            </p>
          ) : oauthReady ? (
            <button type="button" className="contact-connect__primary" onClick={handleLineLogin}>
              เชื่อมต่อ LINE Login
            </button>
          ) : (
            <p className="contact-field-error">
              {oauthDisabledReason
                ? lineOAuthDisabledHint(oauthDisabledReason)
                : 'LINE Login ยังไม่พร้อม — ติดต่อทีม NP Create'}
            </p>
          )}
        </li>
      </ol>
    </div>
  )
}
