import type { LineStaffSticker, LineStaffStickerPackage } from './lineStickers'

function range(packageId: string, from: number, to: number): LineStaffSticker[] {
  const stickers: LineStaffSticker[] = []
  for (let id = from; id <= to; id += 1) {
    stickers.push({ packageId, stickerId: String(id) })
  }
  return stickers
}

/** ชุด LINE Friends แบบ chat.line.biz (รวม Moon panic / Brown / Cony / Sally) — API package 11537 */
export const LINE_FRIENDS_PANIC_PACKAGE: LineStaffStickerPackage = {
  packageId: '11537',
  name: 'LINE Friends',
  stickers: range('11537', 52002734, 52002773),
}

/** Moon: Special Edition — package 446 */
export const MOON_SPECIAL_PACKAGE: LineStaffStickerPackage = {
  packageId: '446',
  name: 'Moon',
  stickers: range('446', 1988, 1992),
}

/** CHOCO & Friends animated — package 11538 */
export const CONY_FRIENDS_PACKAGE: LineStaffStickerPackage = {
  packageId: '11538',
  name: 'Cony & Friends',
  stickers: range('11538', 51626494, 51626523),
}

export const DEFAULT_LINE_STAFF_STICKER_PACKAGES: LineStaffStickerPackage[] = [
  LINE_FRIENDS_PANIC_PACKAGE,
  MOON_SPECIAL_PACKAGE,
  CONY_FRIENDS_PACKAGE,
]
