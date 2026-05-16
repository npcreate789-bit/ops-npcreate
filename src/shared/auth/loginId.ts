/** รูปแบบรหัสผู้ใช้: ตัวอักษร ตัวเลข . _ - ความยาว 3–32 */
const LOGIN_ID_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/

export function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateLoginId(raw: string): string | null {
  const id = normalizeLoginId(raw)
  if (!id) return 'กรุณากรอกรหัสผู้ใช้'
  if (!LOGIN_ID_PATTERN.test(id)) {
    return 'รหัสผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, . _ - (3–32 ตัวอักษร)'
  }
  return null
}
