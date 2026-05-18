import { FACEBOOK_APP_ID, persistFacebookConnection } from './channelConnectConfig'

declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string
        cookie?: boolean
        xfbml?: boolean
        version: string
      }) => void
      login: (
        callback: (response: {
          status: string
          authResponse?: { userID: string; accessToken: string }
        }) => void,
        options?: { scope?: string; return_scopes?: boolean },
      ) => void
      api: (
        path: string,
        paramsOrCallback:
          | Record<string, string>
          | ((response: { name?: string; error?: { message?: string } }) => void),
        callback?: (response: { name?: string; error?: { message?: string } }) => void,
      ) => void
      CustomerChat?: {
        showDialog: () => void
        hideDialog: () => void
      }
    }
    fbAsyncInit?: () => void
  }
}

let sdkLoadPromise: Promise<void> | null = null

function loadFacebookSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.FB) return Promise.resolve()
  if (sdkLoadPromise) return sdkLoadPromise

  sdkLoadPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      if (!FACEBOOK_APP_ID) {
        reject(new Error('Facebook App ID ไม่ได้ตั้งค่า'))
        return
      }
      window.FB?.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v21.0',
      })
      resolve()
    }

    if (document.getElementById('facebook-jssdk')) {
      const check = window.setInterval(() => {
        if (window.FB) {
          window.clearInterval(check)
          resolve()
        }
      }, 50)
      return
    }

    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.async = true
    script.defer = true
    script.src = 'https://connect.facebook.net/th_TH/sdk.js'
    script.onerror = () => reject(new Error('โหลด Facebook SDK ไม่สำเร็จ'))
    document.body.appendChild(script)
  })

  return sdkLoadPromise
}

export async function loginWithFacebook(): Promise<{ psid: string; name: string | null }> {
  await loadFacebookSdk()
  if (!window.FB) throw new Error('Facebook SDK ไม่พร้อม')

  return new Promise((resolve, reject) => {
    window.FB!.login(
      (response) => {
        if (response.status !== 'connected' || !response.authResponse?.userID) {
          reject(new Error('ยกเลิกหรือเชื่อมต่อ Facebook ไม่สำเร็จ'))
          return
        }

        const userId = response.authResponse.userID
        window.FB!.api('/me', { fields: 'name' }, (profile) => {
          if (profile.error) {
            persistFacebookConnection(userId)
            resolve({ psid: userId, name: null })
            return
          }
          const name = profile.name?.trim() || null
          persistFacebookConnection(userId, name ?? undefined)
          resolve({ psid: userId, name })
        })
      },
      { scope: 'public_profile', return_scopes: true },
    )
  })
}

export async function ensureFacebookSdk(): Promise<void> {
  if (!FACEBOOK_APP_ID) return
  await loadFacebookSdk()
}
