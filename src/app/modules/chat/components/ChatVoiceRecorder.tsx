import { useCallback, useEffect, useRef, useState } from 'react'
import {
  formatRecordDuration,
  MAX_RECORD_MS,
  pickVoiceRecorderMime,
  voiceFileExtension,
} from '../utils/voiceRecord'
import '../chat.css'

interface ChatVoiceRecorderProps {
  disabled?: boolean
  onRecorded: (file: File) => void | Promise<void>
  onError?: (message: string) => void
}

export function ChatVoiceRecorder({
  disabled = false,
  onRecorded,
  onError,
}: ChatVoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current)
      recorderRef.current?.stop()
      stopTracks()
    }
  }, [stopTracks])

  async function startRecording() {
    if (disabled || recording) return
    const mime = pickVoiceRecorderMime()
    if (!mime || typeof MediaRecorder === 'undefined') {
      onError?.('เบราว์เซอร์นี้ไม่รองรับการบันทึกเสียง — ลองแนบไฟล์เสียงแทน')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stopTracks()
        const blob = new Blob(chunksRef.current, { type: mime })
        chunksRef.current = []
        const ext = voiceFileExtension(mime)
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mime })
        void onRecorded(file)
      }

      recorder.start(250)
      startedAtRef.current = Date.now()
      setElapsedMs(0)
      setRecording(true)

      timerRef.current = window.setInterval(() => {
        const ms = Date.now() - startedAtRef.current
        setElapsedMs(ms)
        if (ms >= MAX_RECORD_MS) {
          void stopRecording()
        }
      }, 200)
    } catch (e) {
      stopTracks()
      onError?.(
        e instanceof Error
          ? e.message.includes('Permission')
            ? 'ต้องอนุญาตไมโครโฟนในเบราว์เซอร์'
            : e.message
          : 'เปิดไมค์ไม่สำเร็จ',
      )
    }
  }

  async function stopRecording() {
    if (!recording || !recorderRef.current) return
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRecording(false)
    if (recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    recorderRef.current = null
  }

  function cancelRecording() {
    if (!recording) return
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    chunksRef.current = []
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = () => stopTracks()
      recorderRef.current.stop()
    } else {
      stopTracks()
    }
    recorderRef.current = null
    setRecording(false)
    setElapsedMs(0)
  }

  if (recording) {
    return (
      <div className="chat-voice-recorder chat-voice-recorder--active">
        <span className="chat-voice-recorder__pulse" aria-hidden />
        <span className="chat-voice-recorder__time">{formatRecordDuration(elapsedMs)}</span>
        <button
          type="button"
          className="crm-btn crm-btn--ghost"
          onClick={() => void stopRecording()}
        >
          ส่งเสียง
        </button>
        <button type="button" className="crm-btn crm-btn--ghost" onClick={cancelRecording}>
          ยกเลิก
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="chat-composer__icon-btn chat-composer__icon-btn--mic"
      title="บันทึกข้อความเสียง"
      disabled={disabled}
      aria-label="บันทึกเสียง"
      onClick={() => void startRecording()}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M5 11a7 7 0 0014 0M12 18v3"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
