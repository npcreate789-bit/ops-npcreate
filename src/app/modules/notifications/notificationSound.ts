import { isActiveChatNotificationLink } from '../chat/activeChatFocus'
import { isChatNotification } from './chatNotification'
import { isLeadLineMessageNotification } from './leadLineMessageNotification'
import { isStaffAlertNotification } from './staffAlertNotification'
import type { UserNotification } from './types'

const STORAGE_KEY = 'npc-notification-sound-enabled'
const DEBOUNCE_MS = 900
/** ช่วงห่างระหว่างรอบเสียง Lead (วนจนกว่ารับทราบครบ) */
const LEAD_ALERT_LOOP_MS = 3_200

const LEAD_CHIME_PATTERN = [
  { freq: 784, at: 0, dur: 0.1, gain: 0.14 },
  { freq: 988, at: 0.11, dur: 0.1, gain: 0.16 },
  { freq: 1318.5, at: 0.22, dur: 0.22, gain: 0.18 },
] as const

const DEFAULT_CHIME_PATTERN = [
  { freq: 880, at: 0, dur: 0.12 },
  { freq: 1174.66, at: 0.14, dur: 0.18 },
] as const

/** เสียงข้อความใหม่แบบ LINE — pop สองโน้ตสั้น */
const LINE_MESSAGE_SOUND_PATTERN = [
  { freq: 659.25, at: 0, dur: 0.055, gain: 0.2 },
  { freq: 987.77, at: 0.065, dur: 0.09, gain: 0.18 },
] as const

/** เสียงแชทโปรเจกต์ (เดิม) */
const CHAT_CHIME_PATTERN = LINE_MESSAGE_SOUND_PATTERN

let audioContext: AudioContext | null = null
let primed = false
let lastPlayedAt = 0
let leadLoopTimer: ReturnType<typeof setInterval> | null = null
let leadLoopRunning = false

export function isNotificationSoundEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

export function setNotificationSoundEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    /* private mode */
  }
  if (!enabled) stopLeadAlertLoop()
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audioContext) audioContext = new Ctx()
  return audioContext
}

/** เรียกครั้งแรกหลังผู้ใช้โต้ตอบ — ผ่านนโยบาย autoplay ของเบราว์เซอร์ */
export function primeNotificationSound() {
  if (primed) return
  const ctx = getAudioContext()
  if (!ctx) return
  primed = true
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {
      primed = false
    })
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  peakGain = 0.12,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequency
  osc.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

function runChime(
  ctx: AudioContext,
  pattern: readonly { freq: number; at: number; dur: number; gain?: number }[],
) {
  const t = ctx.currentTime
  for (const note of pattern) {
    playTone(ctx, note.freq, t + note.at, note.dur, note.gain ?? 0.12)
  }
}

function shouldDebounce(): boolean {
  const now = Date.now()
  if (now - lastPlayedAt < DEBOUNCE_MS) return true
  lastPlayedAt = now
  return false
}

function playPattern(
  pattern: readonly { freq: number; at: number; dur: number; gain?: number }[],
  opts?: { debounce?: boolean },
) {
  if (!isNotificationSoundEnabled()) return
  if (opts?.debounce !== false && shouldDebounce()) return

  const ctx = getAudioContext()
  if (!ctx) return

  const run = () => runChime(ctx, pattern)

  if (ctx.state === 'suspended') {
    void ctx.resume().then(run).catch(() => {})
    return
  }
  run()
}

/** เสียงแจ้งเตือนทั่วไป (สองโน้ต) — ครั้งเดียว */
export function playNotificationSound() {
  playPattern(DEFAULT_CHIME_PATTERN)
}

/** เสียง Lead ครั้งเดียว (ทดสอบ / แจ้งเตือนอื่น) */
export function playLeadNotificationSound() {
  playPattern(LEAD_CHIME_PATTERN)
}

/** เสียงข้อความแชทใหม่ */
export function playChatNotificationSound() {
  playPattern(CHAT_CHIME_PATTERN)
}

/** เสียงข้อความ LINE เข้าใหม่ (ใช้เมื่อเปิดแชทอยู่หรือแจ้งเตือน LINE) */
export function playLineMessageNotificationSound() {
  playPattern(LINE_MESSAGE_SOUND_PATTERN)
}

/** เลือกเสียงตามประเภทแจ้งเตือน — ครั้งเดียว */
export function playNotificationAlert(dedupeKey?: string) {
  if (dedupeKey && isStaffAlertNotification(dedupeKey)) {
    playLeadNotificationSound()
    return
  }
  if (dedupeKey && isChatNotification(dedupeKey)) {
    playChatNotificationSound()
    return
  }
  playNotificationSound()
}

/** เล่นเสียงเมื่อมีแจ้งเตือนเข้า (Realtime) */
export function tryPlayIncomingNotificationSound(row: UserNotification) {
  if (!isNotificationSoundEnabled() || row.read_at) return

  if (isLeadLineMessageNotification(row.dedupe_key)) {
    playLineMessageNotificationSound()
    return
  }

  if (isStaffAlertNotification(row.dedupe_key)) return
  if (isChatNotification(row.dedupe_key) && isActiveChatNotificationLink(row.link)) return
  playNotificationAlert(row.dedupe_key)
}

function playLeadChimeOnce() {
  playPattern(LEAD_CHIME_PATTERN, { debounce: false })
}

/** หยุดวนเสียง Lead */
export function stopLeadAlertLoop() {
  leadLoopRunning = false
  if (leadLoopTimer !== null) {
    window.clearInterval(leadLoopTimer)
    leadLoopTimer = null
  }
}

/** วนเสียง Lead จนกว่าจะมี unread = false (รับทราบครบ) */
export function syncLeadAlertLoop(shouldLoop: boolean) {
  if (!shouldLoop || !isNotificationSoundEnabled()) {
    stopLeadAlertLoop()
    return
  }

  if (leadLoopRunning) return

  leadLoopRunning = true
  primeNotificationSound()
  playLeadChimeOnce()

  leadLoopTimer = window.setInterval(() => {
    if (!leadLoopRunning || !isNotificationSoundEnabled()) {
      stopLeadAlertLoop()
      return
    }
    playLeadChimeOnce()
  }, LEAD_ALERT_LOOP_MS)
}

export function isLeadAlertLoopActive(): boolean {
  return leadLoopRunning
}
