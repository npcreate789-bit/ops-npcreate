import type { CSSProperties } from 'react'
import { avatarHue, chatInitials } from '../utils/chatDisplay'
import '../chat.css'

interface ChatAvatarProps {
  name: string | null | undefined
  seed?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ChatAvatar({ name, seed, size = 'md', className = '' }: ChatAvatarProps) {
  const hue = avatarHue(seed ?? name ?? '?')
  const initials = chatInitials(name)

  return (
    <span
      className={`chat-avatar chat-avatar--${size}${className ? ` ${className}` : ''}`}
      style={{ '--chat-avatar-hue': String(hue) } as CSSProperties}
      aria-hidden
    >
      {initials}
    </span>
  )
}
