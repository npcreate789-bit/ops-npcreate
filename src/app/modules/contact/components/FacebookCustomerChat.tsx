import { useEffect } from 'react'
import {
  FACEBOOK_PAGE_ID,
  isFacebookChatConfigured,
} from '../../../../shared/contact/channelConnectConfig'
import { ensureFacebookSdk } from '../../../../shared/contact/facebookSdk'

interface FacebookCustomerChatProps {
  /** เปิดกล่องแชทอัตโนมัติเมื่อ mount */
  autoOpen?: boolean
}

export function FacebookCustomerChat({ autoOpen = false }: FacebookCustomerChatProps) {
  useEffect(() => {
    if (!isFacebookChatConfigured()) return
    void ensureFacebookSdk().then(() => {
      if (autoOpen && window.FB?.CustomerChat) {
        window.setTimeout(() => window.FB?.CustomerChat?.showDialog(), 800)
      }
    })
  }, [autoOpen])

  if (!isFacebookChatConfigured()) return null

  return (
    <>
      <div id="fb-root" />
      <div
        className="fb-customerchat"
        data-attribution="setup_tool"
        data-page_id={FACEBOOK_PAGE_ID}
        data-theme_color="#e63946"
        data-logged_in_greeting="สวัสดีครับ ทีม NP Create พร้อมตอบคำถาม"
        data-logged_out_greeting="สวัสดีครับ ทีม NP Create พร้อมตอบคำถาม"
      />
      <p className="contact-section__hint contact-fb-chat-hint">
        แชทกับเพจ NP Create ได้จากมุมล่างขวาของหน้าจอ
      </p>
    </>
  )
}
