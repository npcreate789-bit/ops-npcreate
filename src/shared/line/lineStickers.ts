/** สติกเกอร์ที่ทีมส่งได้ — ชุด Brown & Cony (ใช้กับ OA ส่วนใหญ่ในไทย) */

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

const DEFAULT_PACKAGES: LineStaffStickerPackage[] = [
  {
    packageId: '11537',
    name: 'Brown',
    stickers: [
      { packageId: '11537', stickerId: '52002734', label: 'สวัสดี' },
      { packageId: '11537', stickerId: '52002735', label: 'ขอบคุณ' },
      { packageId: '11537', stickerId: '52002736', label: 'โอเค' },
      { packageId: '11537', stickerId: '52002738', label: 'ยิ้ม' },
      { packageId: '11537', stickerId: '52002739', label: 'หัวเราะ' },
      { packageId: '11537', stickerId: '52002740', label: 'เศร้า' },
      { packageId: '11537', stickerId: '52114110', label: 'รัก' },
    ],
  },
  {
    packageId: '11538',
    name: 'Cony',
    stickers: [
      { packageId: '11538', stickerId: '51626494', label: 'สวัสดี' },
      { packageId: '11538', stickerId: '51626495', label: 'ขอบคุณ' },
      { packageId: '11538', stickerId: '51626496', label: 'โอเค' },
      { packageId: '11538', stickerId: '51626497', label: 'ยิ้ม' },
      { packageId: '11538', stickerId: '51626498', label: 'หัวเราะ' },
      { packageId: '11538', stickerId: '51626500', label: 'รัก' },
    ],
  },
  {
    packageId: '446',
    name: 'Moon',
    stickers: [
      { packageId: '446', stickerId: '1988', label: 'ยิ้ม' },
      { packageId: '446', stickerId: '1989', label: 'ขอบคุณ' },
      { packageId: '446', stickerId: '1990', label: 'โอเค' },
      { packageId: '446', stickerId: '1991', label: 'สวัสดี' },
    ],
  },
]

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
  return parseEnvStickerPackages() ?? DEFAULT_PACKAGES
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
