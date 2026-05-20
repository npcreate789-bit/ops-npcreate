import { useEffect, useMemo, useRef, useState } from 'react'
import { LINE_FRIENDS_PANIC_PACKAGE } from '../../../../shared/line/lineStaffStickerCatalog'
import {
  getLineStaffStickerPackages,
  type LineStaffSticker,
  type LineStaffStickerPackage,
} from '../../../../shared/line/lineStickers'
import { LINE_CHAT_EMOJI_GROUPS } from '../lineChatEmojis'
import {
  listRecentExpressions,
  pushRecentEmoji,
  pushRecentSticker,
  type RecentExpression,
} from '../lineChatRecentExpressions'
import { LeadLineSticker } from './LeadLineSticker'

export type ExpressionPickerTab =
  | 'recent'
  | `emoji:${string}`
  | `sticker:${string}`

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

function defaultTab(packages: LineStaffStickerPackage[]): ExpressionPickerTab {
  const friends = packages.find((p) => p.packageId === LINE_FRIENDS_PANIC_PACKAGE.packageId)
  if (friends) return `sticker:${friends.packageId}`
  const firstEmoji = LINE_CHAT_EMOJI_GROUPS[0]
  if (firstEmoji) return `emoji:${firstEmoji.id}`
  return 'recent'
}

interface LeadLineChatExpressionPickerProps {
  open: boolean
  initialTab?: ExpressionPickerTab
  onClose: () => void
  onPickEmoji: (emoji: string) => void
  onPickSticker: (sticker: LineStaffSticker) => void
}

export function LeadLineChatExpressionPicker({
  open,
  initialTab,
  onClose,
  onPickEmoji,
  onPickSticker,
}: LeadLineChatExpressionPickerProps) {
  const packages = getLineStaffStickerPackages()
  const [activeTab, setActiveTab] = useState<ExpressionPickerTab>(() => defaultTab(packages))
  const [recent, setRecent] = useState<RecentExpression[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setRecent(listRecentExpressions())
    if (initialTab) setActiveTab(initialTab)
  }, [open, initialTab])

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

  const activeEmojiGroup = useMemo(() => {
    if (!activeTab.startsWith('emoji:')) return null
    const id = activeTab.slice('emoji:'.length)
    return LINE_CHAT_EMOJI_GROUPS.find((g) => g.id === id) ?? LINE_CHAT_EMOJI_GROUPS[0]
  }, [activeTab])

  const activeStickerPackage = useMemo(() => {
    if (!activeTab.startsWith('sticker:')) return null
    const id = activeTab.slice('sticker:'.length)
    return packages.find((p) => p.packageId === id) ?? packages[0]
  }, [activeTab, packages])

  function pickEmoji(emoji: string) {
    pushRecentEmoji(emoji)
    onPickEmoji(emoji)
    onClose()
  }

  function pickSticker(sticker: LineStaffSticker) {
    pushRecentSticker(sticker)
    onPickSticker(sticker)
    onClose()
  }

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className="crm-line-expression-picker"
      role="dialog"
      aria-label="เลือกอีโมจิและสติกเกอร์"
    >
      <div className="crm-line-expression-picker__tabs" role="tablist" aria-label="หมวด">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'recent'}
          className={`crm-line-expression-picker__tab crm-line-expression-picker__tab--icon${
            activeTab === 'recent' ? ' crm-line-expression-picker__tab--active' : ''
          }`}
          title="ใช้ล่าสุด"
          onClick={() => setActiveTab('recent')}
        >
          <IconClock />
        </button>

        {LINE_CHAT_EMOJI_GROUPS.map((group) => {
          const tabId: ExpressionPickerTab = `emoji:${group.id}`
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tabId}
              className={`crm-line-expression-picker__tab crm-line-expression-picker__tab--emoji${
                activeTab === tabId ? ' crm-line-expression-picker__tab--active' : ''
              }`}
              title={group.label}
              onClick={() => setActiveTab(tabId)}
            >
              {group.icon}
            </button>
          )
        })}

        {packages.map((pkg) => {
          const tabId: ExpressionPickerTab = `sticker:${pkg.packageId}`
          const previewId = pkg.tabStickerId ?? pkg.stickers[0]?.stickerId
          return (
            <button
              key={pkg.packageId}
              type="button"
              role="tab"
              aria-selected={activeTab === tabId}
              className={`crm-line-expression-picker__tab crm-line-expression-picker__tab--sticker${
                activeTab === tabId ? ' crm-line-expression-picker__tab--active' : ''
              }`}
              title={pkg.name}
              onClick={() => setActiveTab(tabId)}
            >
              {pkg.tabIcon ? (
                <span className="crm-line-expression-picker__tab-emoji">{pkg.tabIcon}</span>
              ) : previewId ? (
                <LeadLineSticker
                  stickerId={previewId}
                  className="crm-line-expression-picker__tab-sticker"
                  alt=""
                />
              ) : (
                pkg.name.slice(0, 1)
              )}
            </button>
          )
        })}
      </div>

      <div className="crm-line-expression-picker__body">
        {activeTab === 'recent' ? (
          recent.length === 0 ? (
            <p className="crm-line-expression-picker__empty">ยังไม่มีรายการล่าสุด</p>
          ) : (
            <div className="crm-line-expression-picker__grid crm-line-expression-picker__grid--mixed">
              {recent.map((item, i) =>
                item.kind === 'emoji' ? (
                  <button
                    key={`e-${item.emoji}-${i}`}
                    type="button"
                    className="crm-line-expression-picker__emoji"
                    onClick={() => pickEmoji(item.emoji)}
                  >
                    {item.emoji}
                  </button>
                ) : (
                  <button
                    key={`s-${item.packageId}-${item.stickerId}-${i}`}
                    type="button"
                    className="crm-line-expression-picker__sticker"
                    onClick={() =>
                      pickSticker({
                        packageId: item.packageId,
                        stickerId: item.stickerId,
                      })
                    }
                  >
                    <LeadLineSticker
                      stickerId={item.stickerId}
                      className="crm-line-expression-picker__sticker-img"
                      alt="สติกเกอร์"
                    />
                  </button>
                ),
              )}
            </div>
          )
        ) : null}

        {activeEmojiGroup ? (
          <div className="crm-line-expression-picker__grid crm-line-expression-picker__grid--emoji">
            {activeEmojiGroup.emojis.map((emoji, i) => (
              <button
                key={`${activeEmojiGroup.id}-${emoji}-${i}`}
                type="button"
                className="crm-line-expression-picker__emoji"
                onClick={() => pickEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        {activeStickerPackage ? (
          <div className="crm-line-expression-picker__grid crm-line-expression-picker__grid--sticker">
            {activeStickerPackage.stickers.map((sticker) => (
              <button
                key={`${sticker.packageId}-${sticker.stickerId}`}
                type="button"
                className="crm-line-expression-picker__sticker"
                title={sticker.label}
                onClick={() => pickSticker(sticker)}
              >
                <LeadLineSticker
                  stickerId={sticker.stickerId}
                  className="crm-line-expression-picker__sticker-img"
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
