import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './client'

/**
 * สมัคร Supabase Realtime อย่างปลอดภัย (รองรับ React StrictMode)
 * — ชื่อ channel ไม่ซ้ำต่อ mount, ลงทะเบียน .on() ก่อน subscribe() ครั้งเดียว
 */
export function useRealtimeChannel(
  enabled: boolean,
  setup: (channel: RealtimeChannel) => RealtimeChannel,
  deps: readonly unknown[],
) {
  const mountIdRef = useRef(0)

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !supabase) return

    const client = supabase
    mountIdRef.current += 1
    const channelName = `rt-${mountIdRef.current}-${Date.now()}`
    const channel = setup(client.channel(channelName))
    channel.subscribe()

    return () => {
      void client.removeChannel(channel)
    }
    // setup/deps ควบคุมการสมัครใหม่
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])
}
