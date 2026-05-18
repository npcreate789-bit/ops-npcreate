import { useEffect, useRef, useState } from 'react'
import {
  clearLineConnection,
  clearLineOaContactStepDone,
  copyLineOaStarterMessage,
  getLineOAuthDisabledReason,
  isLineOAuthConfigured,
  LINE_OA_ID,
  LINE_OA_STARTER_MESSAGE,
  lineOAuthDisabledHint,
  lineOaStarterQrImageUrl,
  markLineOaContactStepDone,
  openLineAddFriendFromContact,
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
  onLineOaStepReset: () => void
  onLineDisconnected: () => void
  error?: string
}

export function LineContactSetupPanel({
  lineUserId,
  lineDisplayName,
  lineOaStepDone,
  onLineOaStepDone,
  onLineOaStepReset,
  onLineDisconnected,
  error,
}: LineContactSetupPanelProps) {
  const step2Ref = useRef<HTMLLIElement>(null)
  const [returnedFromLine, setReturnedFromLine] = useState(false)
  const [lineLaunched, setLineLaunched] = useState(false)
  const [copyOk, setCopyOk] = useState(false)
  const isMobile = isLineContactMobileDevice()

  const oauthReady = isLineOAuthConfigured()
  const oauthDisabledReason = oauthReady ? null : getLineOAuthDisabledReason()
  const loginConnected = Boolean(lineUserId)
  const oaHandle = LINE_OA_ID.startsWith('@') ? LINE_OA_ID : `@${LINE_OA_ID}`
  const qrSrc = lineOaStarterQrImageUrl()

  function completeOaStepFromReturn() {
    markLineOaContactStepDone()
    onLineOaStepDone()
    setReturnedFromLine(true)
    setLineLaunched(false)
    window.requestAnimationFrame(() => {
      step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  useEffect(() => {
    function handleReturnToContact() {
      if (document.visibilityState !== 'visible') return
      if (!takeLineOaContactPendingReturn()) return
      if (lineOaStepDone) return
      completeOaStepFromReturn()
    }

    handleReturnToContact()
    document.addEventListener('visibilitychange', handleReturnToContact)
    window.addEventListener('pageshow', handleReturnToContact)
    return () => {
      document.removeEventListener('visibilitychange', handleReturnToContact)
      window.removeEventListener('pageshow', handleReturnToContact)
    }
  }, [lineOaStepDone, onLineOaStepDone])

  function handleOpenStarterMessage() {
    openLineOaStarterMessageFromContact()
    setLineLaunched(true)
  }

  async function handleCopyMessage() {
    const ok = await copyLineOaStarterMessage()
    setCopyOk(ok)
    if (ok) window.setTimeout(() => setCopyOk(false), 2500)
  }

  function handleConfirmOaStep() {
    markLineOaContactStepDone()
    onLineOaStepDone()
    setReturnedFromLine(false)
    setLineLaunched(false)
    step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleResetOaStep() {
    clearLineOaContactStepDone()
    onLineOaStepReset()
    setReturnedFromLine(false)
    setLineLaunched(false)
  }

  function handleLineLogin() {
    try {
      startLineLogin()
    } catch (err) {
      console.error(err)
    }
  }

  function handleDisconnectLogin() {
    clearLineConnection()
    onLineDisconnected()
  }

  return (
    <div className="contact-line-flow" aria-label="ขั้นตอนเชื่อมต่อ LINE">
      <p className="contact-line-flow__intro">
        ทำครบ 2 ขั้นบนหน้านี้ — ขั้นที่ 1 เปิดแอป LINE โดยไม่ออกจากฟอร์ม (สแกน QR บนคอม หรือกดปุ่มบนมือถือ)
      </p>

      {error && (
        <p className="contact-field-error" role="alert">
          {error}
        </p>
      )}

      {returnedFromLine && lineOaStepDone && !loginConnected && (
        <p className="contact-line-flow__return-banner" role="status">
          กลับมาที่แบบฟอร์มแล้ว — ทำขั้นที่ 2 เชื่อมต่อ LINE Login ด้านล่าง{' '}
          <button type="button" className="contact-connect__secondary" onClick={handleResetOaStep}>
            ยังไม่ได้ทัก LINE
          </button>
        </p>
      )}

      {lineLaunched && !lineOaStepDone && (
        <p className="contact-line-flow__wait-banner" role="status">
          ยังอยู่หน้านี้ — ใน LINE ให้เพิ่มเพื่อน (ถ้ายังไม่มี) แล้วกดส่งข้อความ &quot;
          {LINE_OA_STARTER_MESSAGE}&quot; ที่ระบบเติมให้ จากนั้นกลับมาที่หน้านี้
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
              <h3 className="contact-line-step__title">ทัก {oaHandle} บน LINE</h3>
              <p className="contact-line-step__desc">
                {isMobile
                  ? 'กดปุ่มด้านล่าง — เปิดแอป LINE โดยไม่ออกจากหน้านี้ ข้อความจะถูกเติมให้ กดส่งหนึ่งครั้ง'
                  : 'สแกน QR ด้วยมือถือ หรือเปิด LINE บนคอม — ข้อความจะถูกเติมให้ กดส่งหนึ่งครั้ง'}
              </p>
            </div>
          </div>

          {!lineOaStepDone ? (
            <div className="contact-line-step__actions">
              {!isMobile && (
                <div className="contact-line-qr">
                  <img
                    src={qrSrc}
                    width={200}
                    height={200}
                    alt={`QR ทัก ${oaHandle} ด้วยข้อความ ${LINE_OA_STARTER_MESSAGE}`}
                    className="contact-line-qr__img"
                  />
                  <p className="contact-section__hint contact-line-qr__hint">
                    สแกนด้วยแอป LINE บนมือถือ — เพิ่มเพื่อนและเปิดแชทพร้อมข้อความ
                  </p>
                </div>
              )}

              {isMobile ? (
                <button
                  type="button"
                  className="contact-connect__primary"
                  onClick={handleOpenStarterMessage}
                >
                  เปิดแอป LINE (ข้อความ &quot;{LINE_OA_STARTER_MESSAGE}&quot; พร้อมส่ง)
                </button>
              ) : (
                <button
                  type="button"
                  className="contact-connect__primary"
                  onClick={handleOpenStarterMessage}
                >
                  เปิด LINE บนคอมน์เตอร์ (ถ้ามีติดตั้ง)
                </button>
              )}

              <div className="contact-line-step__secondary-row">
                <button
                  type="button"
                  className="contact-line-step__copy"
                  onClick={() => void handleCopyMessage()}
                >
                  {copyOk ? 'คัดลอกแล้ว' : `คัดลอกข้อความ "${LINE_OA_STARTER_MESSAGE}"`}
                </button>
                <button
                  type="button"
                  className="contact-line-flow__inline-link"
                  onClick={() => openLineAddFriendFromContact()}
                >
                  เพิ่มเพื่อนอย่างเดียว
                </button>
              </div>

              <button
                type="button"
                className="contact-line-step__confirm"
                onClick={handleConfirmOaStep}
              >
                ฉันส่งข้อความแล้ว — ไปขั้นถัดไป
              </button>
            </div>
          ) : (
            <div className="contact-line-step__done">
              <p>ส่งข้อความ &quot;{LINE_OA_STARTER_MESSAGE}&quot; แล้ว</p>
              <button type="button" className="contact-connect__secondary" onClick={handleResetOaStep}>
                ยังไม่ได้ทัก — ทำขั้นนี้ใหม่
              </button>
            </div>
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
              <h3 className="contact-line-step__title">ยืนยันตัวตนด้วย LINE Login</h3>
              <p className="contact-line-step__desc">
                ลงชื่อเข้าใช้ LINE เพื่อผูกบัญชีกับแบบฟอร์ม — จำเป็นต้องทำก่อนส่งข้อมูล
              </p>
            </div>
          </div>

          {!lineOaStepDone ? (
            <p className="contact-line-step__locked-hint muted">
              ทำขั้นที่ 1 ก่อน — ทักข้อความ &quot;{LINE_OA_STARTER_MESSAGE}&quot; ที่ {oaHandle}
            </p>
          ) : loginConnected ? (
            <div className="contact-connect__status contact-connect__status--ok">
              <span className="contact-connect__check" aria-hidden>
                ✓
              </span>
              <div>
                <strong>ยืนยัน LINE Login แล้ว</strong>
                <p className="contact-connect__meta">
                  {lineDisplayName ? `${lineDisplayName} · ` : ''}
                  {lineUserId}
                </p>
              </div>
              <button
                type="button"
                className="contact-connect__secondary"
                onClick={handleDisconnectLogin}
              >
                เปลี่ยนบัญชี LINE
              </button>
            </div>
          ) : oauthReady ? (
            <div className="contact-line-step__actions">
              <button type="button" className="contact-connect__primary" onClick={handleLineLogin}>
                เชื่อมต่อ LINE Login
              </button>
              <p className="contact-section__hint">
                จะออกจากหน้านี้ชั่วคราวเพื่อล็อกอิน แล้วกลับมาที่แบบฟอร์มอัตโนมัติ
              </p>
            </div>
          ) : (
            <p className="contact-section__hint">
              {oauthDisabledReason
                ? lineOAuthDisabledHint(oauthDisabledReason)
                : 'LINE Login ยังไม่พร้อม — ระบุ LINE ID ด้านล่างแทน'}
            </p>
          )}
        </li>
      </ol>
    </div>
  )
}
