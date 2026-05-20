interface LeadLineChatTextProps {
  text: string
  className?: string
}

/** ข้อความแชทที่รองรับอีโมจิ Unicode (ทีมและลูกค้า) */
export function LeadLineChatText({ text, className = 'crm-line-chat__body' }: LeadLineChatTextProps) {
  return <p className={`${className} crm-line-chat__text-emoji`}>{text}</p>
}
