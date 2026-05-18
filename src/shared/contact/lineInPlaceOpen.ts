import { isMobileBrowser } from '../line/lineStaffOpenUrl'

/**
 * เปิดลิงก์ LINE (line.me / แอป) โดยไม่พาเบราว์เซอร์ออกจากหน้าปัจจุบัน
 * — ใช้ iframe + การคลิกลิงก์ซ่อน (มือถือมักเปิดแอป LINE แล้วกลับมาแท็บเดิมได้)
 */
export function openLineUrlInPlace(url: string): void {
  if (typeof document === 'undefined' || !url.trim()) return

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.title = ''
  iframe.style.cssText =
    'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:0;left:-9999px'
  iframe.src = url
  document.body.appendChild(iframe)
  window.setTimeout(() => iframe.remove(), 5000)

  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export { isMobileBrowser as isLineContactMobileDevice }
