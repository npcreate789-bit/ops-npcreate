import { useEffect } from 'react'
import { primeNotificationSound } from './notificationSound'

/** ปลดล็อก AudioContext หลังผู้ใช้คลิก/พิมพ์ครั้งแรก */
export function useNotificationSoundPrime() {
  useEffect(() => {
    const prime = () => {
      primeNotificationSound()
    }
    window.addEventListener('pointerdown', prime, { once: true, passive: true })
    window.addEventListener('touchstart', prime, { once: true, passive: true })
    window.addEventListener('keydown', prime, { once: true })
    return () => {
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('touchstart', prime)
      window.removeEventListener('keydown', prime)
    }
  }, [])
}
