import { useState } from 'react'
import {
  clearFacebookConnection,
  clearLineConnection,
  isFacebookLoginConfigured,
  isLineOAuthConfigured,
  lineAddFriendUrl,
} from '../../../../shared/contact/channelConnectConfig'
import { loginWithFacebook } from '../../../../shared/contact/facebookSdk'
import { startLineLogin } from '../../../../shared/contact/lineOAuth'
import {
  NPCREATE_FACEBOOK_MESSENGER_URL,
  NPCREATE_LINE_OA_URL,
} from '../../../../shared/crm/preferredContactChannel'
import type { PreferredContactChannel } from '../../../../shared/crm/preferredContactChannel'

interface ChannelConnectPanelProps {
  channel: PreferredContactChannel
  lineUserId: string | null
  lineDisplayName: string | null
  facebookPsid: string | null
  facebookName: string | null
  onLineConnected: (userId: string, displayName: string | null) => void
  onLineDisconnected: () => void
  onFacebookConnected: (psid: string, name: string | null) => void
  onFacebookDisconnected: () => void
  error?: string
}

export function ChannelConnectPanel({
  channel,
  lineUserId,
  lineDisplayName,
  facebookPsid,
  facebookName,
  onLineDisconnected,
  onFacebookConnected,
  onFacebookDisconnected,
  error,
}: ChannelConnectPanelProps) {
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const displayError = error || localError

  async function handleFacebookConnect() {
    setLocalError(null)
    setBusy(true)
    try {
      const result = await loginWithFacebook()
      onFacebookConnected(result.psid, result.name)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'เชื่อมต่อ Facebook ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  function handleLineConnect() {
    setLocalError(null)
    try {
      startLineLogin()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'เริ่ม LINE Login ไม่ได้')
    }
  }

  if (channel === 'line') {
    const connected = Boolean(lineUserId)
    const oauthReady = isLineOAuthConfigured()

    return (
      <div className="contact-connect">
        {displayError && (
          <p className="contact-field-error" role="alert">
            {displayError}
          </p>
        )}

        {connected ? (
          <div className="contact-connect__status contact-connect__status--ok">
            <span className="contact-connect__check" aria-hidden>
              ✓
            </span>
            <div>
              <strong>เชื่อมต่อ LINE แล้ว</strong>
              <p className="contact-connect__meta">
                {lineDisplayName ? `${lineDisplayName} · ` : ''}
                ID: {lineUserId}
              </p>
            </div>
            <button
              type="button"
              className="contact-connect__secondary"
              onClick={() => {
                clearLineConnection()
                onLineDisconnected()
              }}
            >
              ยกเลิกการเชื่อมต่อ
            </button>
          </div>
        ) : oauthReady ? (
          <div className="contact-connect__actions">
            <button
              type="button"
              className="contact-connect__primary"
              disabled={busy}
              onClick={handleLineConnect}
            >
              เชื่อมต่อ LINE
            </button>
            <p className="contact-section__hint">
              ลงชื่อเข้าใช้ LINE เพื่อให้ทีม NP Create ทักกลับได้ตรงบัญชีของคุณ
            </p>
          </div>
        ) : (
          <div className="contact-connect__fallback">
            <p className="contact-section__hint">
              ระบบ LINE Login ยังไม่เปิด — ระบุ LINE ID ด้านล่าง หรือ{' '}
              <a href={NPCREATE_LINE_OA_URL} target="_blank" rel="noopener noreferrer">
                เพิ่มเพื่อน @npcreate
              </a>
            </p>
          </div>
        )}

        {connected && (
          <p className="contact-section__hint">
            แนะนำเพิ่มเพื่อน OA เพื่อรับข้อความจากทีม:{' '}
            <a href={lineAddFriendUrl()} target="_blank" rel="noopener noreferrer">
              เพิ่มเพื่อน NP Create
            </a>
          </p>
        )}
      </div>
    )
  }

  const connected = Boolean(facebookPsid)
  const fbLoginReady = isFacebookLoginConfigured()

  return (
    <div className="contact-connect">
      {displayError && (
        <p className="contact-field-error" role="alert">
          {displayError}
        </p>
      )}

      {connected ? (
        <div className="contact-connect__status contact-connect__status--ok">
          <span className="contact-connect__check" aria-hidden>
            ✓
          </span>
          <div>
            <strong>เชื่อมต่อ Facebook แล้ว</strong>
            <p className="contact-connect__meta">
              {facebookName ? `${facebookName} · ` : ''}
              ID: {facebookPsid}
            </p>
          </div>
          <button
            type="button"
            className="contact-connect__secondary"
            onClick={() => {
              clearFacebookConnection()
              onFacebookDisconnected()
            }}
          >
            ยกเลิกการเชื่อมต่อ
          </button>
        </div>
      ) : fbLoginReady ? (
        <div className="contact-connect__actions">
          <button
            type="button"
            className="contact-connect__primary"
            disabled={busy}
            onClick={() => void handleFacebookConnect()}
          >
            {busy ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ Facebook'}
          </button>
          <p className="contact-section__hint">
            ลงชื่อเข้าใช้ Facebook เพื่อให้ทีม NP Create ทักกลับทาง Messenger ได้สะดวกขึ้น
          </p>
        </div>
      ) : (
        <div className="contact-connect__fallback">
          <p className="contact-section__hint contact-fb-hint">
            ทักเพจ NP Create ได้เลย —{' '}
            <a href={NPCREATE_FACEBOOK_MESSENGER_URL} target="_blank" rel="noopener noreferrer">
              เปิด Messenger
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
