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
  tabStickerId: '52002734',
  stickers: range('11537', 52002734, 52002773),
}

/** Moon: Special Edition — package 446 */
export const MOON_SPECIAL_PACKAGE: LineStaffStickerPackage = {
  packageId: '446',
  name: 'Moon',
  tabIcon: '🌙',
  tabStickerId: '1988',
  stickers: range('446', 1988, 1992),
}

/** CHOCO & Friends animated — package 11538 */
export const CONY_FRIENDS_PACKAGE: LineStaffStickerPackage = {
  packageId: '11538',
  name: 'Cony',
  tabIcon: '🐰',
  tabStickerId: '51626494',
  stickers: range('11538', 51626494, 51626523),
}

/** Sally: Special Edition — package 789 */
export const SALLY_SPECIAL_PACKAGE: LineStaffStickerPackage = {
  packageId: '789',
  name: 'Sally',
  tabIcon: '🐤',
  tabStickerId: '10855',
  stickers: range('789', 10855, 10894),
}

export const DEFAULT_LINE_STAFF_STICKER_PACKAGES: LineStaffStickerPackage[] = [
  LINE_FRIENDS_PANIC_PACKAGE,
  MOON_SPECIAL_PACKAGE,
  CONY_FRIENDS_PACKAGE,
  SALLY_SPECIAL_PACKAGE,
]
