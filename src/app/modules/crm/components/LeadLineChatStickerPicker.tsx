import { useEffect, useRef, useState } from 'react'
import {
  getLineStaffStickerPackages,
  type LineStaffSticker,
} from '../../../../shared/line/lineStickers'
import { LeadLineSticker } from './LeadLineSticker'

interface LeadLineChatStickerPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (sticker: LineStaffSticker) => void
}

export function LeadLineChatStickerPicker({
  open,
  onClose,
  onSelect,
}: LeadLineChatStickerPickerProps) {
  const packages = getLineStaffStickerPackages()
  const [activePackageId, setActivePackageId] = useState(packages[0]?.packageId ?? '')
  const panelRef = useRef<HTMLDivElement>(null)

  const activePackage =
    packages.find((p) => p.packageId === activePackageId) ?? packages[0]

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, onClose])

  if (!open || !activePackage) return null

  return (
    <div
      ref={panelRef}
      className="crm-line-chat__sticker-picker"
      role="dialog"
      aria-label="เลือกสติกเกอร์"
    >
      <div className="crm-line-chat__sticker-picker-head">
        <span className="crm-line-chat__sticker-picker-title">สติกเกอร์</span>
        <button
          type="button"
          className="crm-line-chat__sticker-picker-close"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>
      </div>
      <div className="crm-line-chat__sticker-picker-tabs" role="tablist">
        {packages.map((pkg) => (
          <button
            key={pkg.packageId}
            type="button"
            role="tab"
            aria-selected={pkg.packageId === activePackage.packageId}
            className={`crm-line-chat__sticker-picker-tab${
              pkg.packageId === activePackage.packageId
                ? ' crm-line-chat__sticker-picker-tab--active'
                : ''
            }`}
            onClick={() => setActivePackageId(pkg.packageId)}
          >
            {pkg.name}
          </button>
        ))}
      </div>
      <div className="crm-line-chat__sticker-picker-grid">
        {activePackage.stickers.map((sticker) => (
          <button
            key={`${sticker.packageId}-${sticker.stickerId}`}
            type="button"
            className="crm-line-chat__sticker-picker-item"
            title={sticker.label}
            onClick={() => {
              onSelect(sticker)
              onClose()
            }}
          >
            <LeadLineSticker
              stickerId={sticker.stickerId}
              className="crm-line-chat__sticker-picker-img"
              alt={sticker.label ?? 'สติกเกอร์'}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
