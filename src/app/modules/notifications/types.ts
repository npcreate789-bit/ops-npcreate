export type NotificationSeverity = 'info' | 'warn' | 'danger'

export interface UserNotification {
  id: string
  user_id: string
  dedupe_key: string
  title: string
  body: string
  link: string | null
  severity: NotificationSeverity
  read_at: string | null
  created_at: string
  updated_at: string
}
