/** ข้อความเมื่อส่งข้อความ LINE อัตโนมัติไม่สำเร็จ */
export function lineHandoffFailureMessage(reason?: string): string {
  switch (reason) {
    case 'no_messaging_token':
      return 'ระบบส่งข้อความอัตโนมัติยังไม่ได้ตั้งค่า — กดปุ่มด้านล่างเพื่อเปิดแชท LINE และกดส่งข้อความ'
    case 'not_friend':
      return 'ยังส่งข้อความอัตโนมัติไม่ได้ — กรุณากดส่งข้อความในแชท LINE ที่เปิดไว้ และเพิ่มเพื่อน @npcreate'
    case 'invalid_line_user_id':
      return 'บัญชี LINE ไม่ถูกต้อง — กรุณาเชื่อมต่อ LINE Login ใหม่แล้วส่งอีกครั้ง'
    case 'push_failed':
      return 'ส่งข้อความอัตโนมัติไม่สำเร็จ — กรุณากดส่งข้อความในแชท LINE ที่เปิดไว้ หรือกดปุ่มด้านล่าง'
    default:
      return 'ส่งข้อความอัตโนมัติไม่สำเร็จ — กดปุ่มด้านล่างเพื่อเปิดแชท LINE'
  }
}
