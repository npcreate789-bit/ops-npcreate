/** สติกเกอร์ที่ทีมส่งได้ — ชุด LINE Friends (11537) รวม panic / Brown / Cony / Sally */

import { DEFAULT_LINE_STAFF_STICKER_PACKAGES } from './lineStaffStickerCatalog'

export interface LineStaffSticker {
  packageId: string
  stickerId: string
  label?: string
}

export interface LineStaffStickerPackage {
  packageId: string
  name: string
  stickers: LineStaffSticker[]
}

function parseEnvStickerPackages(): LineStaffStickerPackage[] | null {
  const raw = import.meta.env.VITE_LINE_STAFF_STICKERS?.trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as LineStaffStickerPackage[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

export function getLineStaffStickerPackages(): LineStaffStickerPackage[] {
  return parseEnvStickerPackages() ?? DEFAULT_LINE_STAFF_STICKER_PACKAGES
}

export function findLineStaffSticker(
  packageId: string,
  stickerId: string,
): LineStaffSticker | null {
  for (const pkg of getLineStaffStickerPackages()) {
    if (pkg.packageId !== packageId) continue
    const hit = pkg.stickers.find((s) => s.stickerId === stickerId)
    if (hit) return hit
  }
  return { packageId, stickerId }
}
