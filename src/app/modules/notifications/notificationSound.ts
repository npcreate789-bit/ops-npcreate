const STORAGE_KEY = 'npc-notification-sound-enabled'

let audioContext: AudioContext | null = null
let primed = false

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
  const Ctx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
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

function playTone(ctx: AudioContext, frequency: number, start: number, duration: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequency
  osc.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(0.12, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

/** เสียงแจ้งเตือนสั้น (สองโน้ต) */
export function playNotificationSound() {
  if (!isNotificationSoundEnabled()) return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return

  const ctx = getAudioContext()
  if (!ctx) return

  const run = () => {
    const t = ctx.currentTime
    playTone(ctx, 880, t, 0.12)
    playTone(ctx, 1174.66, t + 0.14, 0.18)
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().then(run).catch(() => {})
    return
  }
  run()
}
