import { isLeadNotification } from './leadNotification'

const STORAGE_KEY = 'npc-notification-sound-enabled'
const DEBOUNCE_MS = 900

let audioContext: AudioContext | null = null
let primed = false
let lastPlayedAt = 0

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

function runChime(ctx: AudioContext, pattern: { freq: number; at: number; dur: number; gain?: number }[]) {
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

function playChime(pattern: { freq: number; at: number; dur: number; gain?: number }[]) {
  if (!isNotificationSoundEnabled()) return
  if (shouldDebounce()) return

  const ctx = getAudioContext()
  if (!ctx) return

  const run = () => runChime(ctx, pattern)

  if (ctx.state === 'suspended') {
    void ctx.resume().then(run).catch(() => {})
    return
  }
  run()
}

/** เสียงแจ้งเตือนทั่วไป (สองโน้ต) */
export function playNotificationSound() {
  playChime([
    { freq: 880, at: 0, dur: 0.12 },
    { freq: 1174.66, at: 0.14, dur: 0.18 },
  ])
}

/** เสียง Lead ใหม่ — โทนสูงขึ้น 3 จังหวะ ดึงดูดความสนใจ */
export function playLeadNotificationSound() {
  playChime([
    { freq: 784, at: 0, dur: 0.1, gain: 0.14 },
    { freq: 988, at: 0.11, dur: 0.1, gain: 0.16 },
    { freq: 1318.5, at: 0.22, dur: 0.22, gain: 0.18 },
  ])
}

/** เลือกเสียงตามประเภทแจ้งเตือน */
export function playNotificationAlert(dedupeKey?: string) {
  if (dedupeKey && isLeadNotification(dedupeKey)) {
    playLeadNotificationSound()
    return
  }
  playNotificationSound()
}
