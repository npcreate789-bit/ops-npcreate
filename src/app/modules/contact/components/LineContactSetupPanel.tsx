import {
  clearLineConnection,
  clearLineOaContactStepDone,
  getLineOAuthDisabledReason,
  isLineOAuthConfigured,
  LINE_OA_ID,
  LINE_OA_STARTER_MESSAGE,
  lineAddFriendUrl,
  lineOAuthDisabledHint,
  lineOaStarterMessageUrl,
  markLineOaContactStepDone,
} from '../../../../shared/contact/channelConnectConfig'
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
  const oauthReady = isLineOAuthConfigured()
  const oauthDisabledReason = oauthReady ? null : getLineOAuthDisabledReason()
  const loginConnected = Boolean(lineUserId)
  const oaHandle = LINE_OA_ID.startsWith('@') ? LINE_OA_ID : `@${LINE_OA_ID}`

  function handleOpenStarterMessage() {
    window.open(lineOaStarterMessageUrl(), '_blank', 'noopener,noreferrer')
  }

  function handleConfirmOaStep() {
    markLineOaContactStepDone()
    onLineOaStepDone()
  }

  function handleResetOaStep() {
    clearLineOaContactStepDone()
    onLineOaStepReset()
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
        ทำตาม 2 ขั้นตอนนี้เพื่อให้ทีม NP Create เปิดแชทและติดต่อกลับได้ถูกต้อง
      </p>

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
              <h3 className="contact-line-step__title">ทัก {oaHandle} บน LINE</h3>
              <p className="contact-line-step__desc">
                กดปุ่มด้านล่างเพื่อเพิ่มเพื่อน (ถ้ายังไม่ได้เพิ่ม) และส่งข้อความ{' '}
                <strong>&quot;{LINE_OA_STARTER_MESSAGE}&quot;</strong> — ทีมจะได้รับแชทและบันทึก ID
                เพื่อติดต่อกลับ
              </p>
            </div>
          </div>

          {!lineOaStepDone ? (
            <div className="contact-line-step__actions">
              <button
                type="button"
                className="contact-connect__primary"
                onClick={handleOpenStarterMessage}
              >
                เปิด LINE และส่งข้อความ &quot;{LINE_OA_STARTER_MESSAGE}&quot;
              </button>
              <p className="contact-section__hint">
                บนมือถือจะเปิดแอป LINE โดยตรง ·{' '}
                <a href={lineAddFriendUrl()} target="_blank" rel="noopener noreferrer">
                  เพิ่มเพื่อนอย่างเดียว
                </a>
              </p>
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
                หน้าต่าง LINE จะเปิดให้ลงชื่อเข้าใช้ แล้วกลับมาที่หน้านี้อัตโนมัติ
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
