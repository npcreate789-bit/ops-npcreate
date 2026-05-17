const COOLDOWN_KEY = 'npc-contact-cooldown-until'
export const CONTACT_MIN_FORM_MS = 3_000
export const CONTACT_CLIENT_COOLDOWN_MS = 60_000

export function getContactCooldownRemainingMs(): number {
  try {
    const until = Number(window.sessionStorage.getItem(COOLDOWN_KEY))
    if (!until || Number.isNaN(until)) return 0
    return Math.max(0, until - Date.now())
  } catch {
    return 0
  }
}

export function markContactCooldown(): void {
  try {
    window.sessionStorage.setItem(
      COOLDOWN_KEY,
      String(Date.now() + CONTACT_CLIENT_COOLDOWN_MS),
    )
  } catch {
    /* private mode */
  }
}

export function contactCooldownMessage(remainingMs: number): string {
  const sec = Math.max(1, Math.ceil(remainingMs / 1000))
  return `กรุณารอ ${sec} วินาทีก่อนส่งอีกครั้ง`
}

export function contactFormTooFastMessage(): string {
  return 'กรุณากรอกแบบฟอร์มให้ครบก่อนกดส่ง'
}
