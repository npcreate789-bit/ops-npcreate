import { useEffect, useMemo, useRef, useState } from 'react'
import { LINE_FRIENDS_PANIC_PACKAGE } from '../../../../shared/line/lineStaffStickerCatalog'
import {
  getLineStaffStickerPackages,
  type LineStaffSticker,
  type LineStaffStickerPackage,
} from '../../../../shared/line/lineStickers'
import { listRecentExpressions, pushRecentSticker } from '../lineChatRecentExpressions'
import { LeadLineSticker } from './LeadLineSticker'

const RECENT_TAB = '__recent__'

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LineFriendsTabIcon({ pkg }: { pkg: LineStaffStickerPackage }) {
  const ids = pkg.featuredTabStickerIds ?? [
    pkg.tabStickerId ?? pkg.stickers[0]?.stickerId,
    pkg.stickers[1]?.stickerId,
  ].filter(Boolean) as string[]

  return (
    <span className="crm-line-sticker-panel__tab-pill" aria-hidden>
      {ids.slice(0, 2).map((stickerId) => (
        <LeadLineSticker
          key={stickerId}
          stickerId={stickerId}
          className="crm-line-sticker-panel__tab-pill-img"
          alt=""
        />
      ))}
    </span>
  )
}

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
  const friendsId = LINE_FRIENDS_PANIC_PACKAGE.packageId
  const packages = useMemo(() => {
    const all = getLineStaffStickerPackages()
    const friends = all.find((p) => p.packageId === friendsId)
    const rest = all.filter((p) => p.packageId !== friendsId)
    return friends ? [friends, ...rest] : all
  }, [friendsId])
  const defaultPackageId =
    packages.find((p) => p.packageId === friendsId)?.packageId ?? packages[0]?.packageId ?? ''

  const [activeTab, setActiveTab] = useState(defaultPackageId)
  const panelRef = useRef<HTMLDivElement>(null)

  const recentStickers = useMemo(() => {
    return listRecentExpressions()
      .filter((x): x is Extract<typeof x, { kind: 'sticker' }> => x.kind === 'sticker')
      .map((x) => ({ packageId: x.packageId, stickerId: x.stickerId }))
  }, [open])

  const activePackage =
    activeTab === RECENT_TAB
      ? null
      : (packages.find((p) => p.packageId === activeTab) ?? packages[0])

  useEffect(() => {
    if (!open) return
    setActiveTab(defaultPackageId)
  }, [open, defaultPackageId])

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

  function pick(sticker: LineStaffSticker) {
    pushRecentSticker(sticker)
    onSelect(sticker)
    onClose()
  }

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className="crm-line-sticker-panel"
      role="dialog"
      aria-label="เลือกสติกเกอร์"
    >
      <div className="crm-line-sticker-panel__tabs" role="tablist" aria-label="ชุดสติกเกอร์">
        {packages.map((pkg) => {
          const isFriends = pkg.packageId === friendsId
          const isActive = activeTab === pkg.packageId
          return (
            <button
              key={pkg.packageId}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`crm-line-sticker-panel__tab${
                isFriends ? ' crm-line-sticker-panel__tab--friends' : ''
              }${isActive ? ' crm-line-sticker-panel__tab--active' : ''}`}
              title={pkg.name}
              onClick={() => setActiveTab(pkg.packageId)}
            >
              {isFriends ? (
                <LineFriendsTabIcon pkg={pkg} />
              ) : pkg.tabIcon ? (
                <span className="crm-line-sticker-panel__tab-emoji">{pkg.tabIcon}</span>
              ) : pkg.tabStickerId ? (
                <LeadLineSticker
                  stickerId={pkg.tabStickerId}
                  className="crm-line-sticker-panel__tab-img"
                  alt=""
                />
              ) : (
                pkg.name.slice(0, 1)
              )}
            </button>
          )
        })}

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === RECENT_TAB}
          className={`crm-line-sticker-panel__tab crm-line-sticker-panel__tab--icon${
            activeTab === RECENT_TAB ? ' crm-line-sticker-panel__tab--active' : ''
          }`}
          title="ใช้ล่าสุด"
          onClick={() => setActiveTab(RECENT_TAB)}
        >
          <IconClock />
        </button>
      </div>

      <div className="crm-line-sticker-panel__body">
        {activeTab === RECENT_TAB ? (
          recentStickers.length === 0 ? (
            <p className="crm-line-sticker-panel__empty">ยังไม่มีสติกเกอร์ที่ใช้ล่าสุด</p>
          ) : (
            <div className="crm-line-sticker-panel__grid">
              {recentStickers.map((sticker, i) => (
                <button
                  key={`${sticker.packageId}-${sticker.stickerId}-${i}`}
                  type="button"
                  className="crm-line-sticker-panel__item"
                  onClick={() => pick(sticker)}
                >
                  <LeadLineSticker
                    stickerId={sticker.stickerId}
                    className="crm-line-sticker-panel__item-img"
                    alt="สติกเกอร์"
                  />
                </button>
              ))}
            </div>
          )
        ) : activePackage ? (
          <div className="crm-line-sticker-panel__grid">
            {activePackage.stickers.map((sticker) => (
              <button
                key={`${sticker.packageId}-${sticker.stickerId}`}
                type="button"
                className="crm-line-sticker-panel__item"
                title={sticker.label}
                onClick={() => pick(sticker)}
              >
                <LeadLineSticker
                  stickerId={sticker.stickerId}
                  className="crm-line-sticker-panel__item-img"
                  alt={sticker.label ?? 'สติกเกอร์'}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
