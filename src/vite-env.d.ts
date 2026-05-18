/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** โดเมน production เช่น https://app.npcreate.co.th */
  readonly VITE_APP_URL?: string
  readonly VITE_NPCREATE_LINE_OA_URL?: string
  readonly VITE_NPCREATE_FACEBOOK_URL?: string
  /** LINE Login channel ID (public) */
  readonly VITE_LINE_CHANNEL_ID?: string
  readonly VITE_LINE_OA_ID?: string
  /** chat.line.biz OA account id — เปิดแชทตรงลูกค้าจาก staff UI */
  readonly VITE_LINE_CHAT_BIZ_ACCOUNT_ID?: string
  readonly VITE_FACEBOOK_APP_ID?: string
  readonly VITE_FACEBOOK_PAGE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
