/** แทรกข้อความที่ตำแหน่งเคอร์เซอร์ใน textarea */
export function insertTextAtComposerCursor(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  insert: string,
): string {
  const start = textarea.selectionStart ?? currentValue.length
  const end = textarea.selectionEnd ?? currentValue.length
  const next = currentValue.slice(0, start) + insert + currentValue.slice(end)
  const caret = start + insert.length
  requestAnimationFrame(() => {
    textarea.setSelectionRange(caret, caret)
    textarea.focus({ preventScroll: true })
  })
  return next
}
