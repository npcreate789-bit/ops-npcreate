/** พิมพ์เอกสาร — ลดหัว/ท้ายกระดาษจากเบราว์เซอร์ (ชื่อแท็บ, URL) */
export function printDocument(): void {
  const previousTitle = document.title
  document.title = ' '

  const restore = () => {
    document.title = previousTitle
    window.removeEventListener('afterprint', restore)
  }

  window.addEventListener('afterprint', restore)
  window.print()
}
