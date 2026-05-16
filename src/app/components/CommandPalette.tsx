import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import {
  canOpenSearchResult,
  canUseGlobalSearch,
  hasGlobalSearchKinds,
  isGlobalSearchScoped,
  scopedSearchKindLabels,
} from '../modules/search/access'
import { globalSearch, searchResultTypeLabel } from '../modules/search/api/search'
import { QuickAccessPanel } from '../modules/quick-access/components/QuickAccessPanel'
import { canUseQuickAccess } from '../../shared/auth/access'
import '../modules/crm/crm.css'
import './command-palette.css'

const DEBOUNCE_MS = 280
const MIN_QUERY = 2

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const allowed = canUseGlobalSearch(roles) || !configured
  const showQuickAccess = canUseQuickAccess(roles) || !configured
  const hasKinds = hasGlobalSearchKinds(roles) || !configured
  const scoped = isGlobalSearchScoped(roles) && configured

  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Awaited<ReturnType<typeof globalSearch>>['results']>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])

  const scopedLabel = useMemo(
    () => scopedSearchKindLabels(roles, searchResultTypeLabel),
    [roles],
  )

  useEffect(() => {
    if (!open) {
      setInput('')
      setQuery('')
      setResults([])
      setError(null)
      setLoading(false)
      setActiveIndex(-1)
      return
    }
    const t = window.setTimeout(() => setQuery(input), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [input, open])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open || !allowed || !hasKinds) return

    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    globalSearch(trimmed, roles)
      .then((data) => {
        if (!cancelled) setResults(data.results)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'ค้นหาไม่สำเร็จ')
          setResults([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [allowed, hasKinds, open, query, roles])

  useEffect(() => {
    if (!open) return
    setActiveIndex(results.length > 0 ? 0 : -1)
    rowRefs.current = rowRefs.current.slice(0, results.length)
  }, [open, results])

  useEffect(() => {
    if (activeIndex < 0) return
    rowRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open || !allowed) return null

  function go(href: string) {
    onClose()
    navigate(href)
  }

  const queryReady = query.trim().length >= MIN_QUERY

  function handlePaletteKeys(e: KeyboardEvent<HTMLInputElement>) {
    if (!queryReady || loading || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => {
        if (i < 0) return 0
        return (i + 1) % results.length
      })
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => {
        if (i < 0) return results.length - 1
        return (i - 1 + results.length) % results.length
      })
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const i = activeIndex < 0 ? 0 : activeIndex
      const item = results[i]
      if (!item) return
      const linkable = !configured || canOpenSearchResult(roles, item.href)
      if (linkable) go(item.href)
    }
  }

  return (
    <div className="command-palette-backdrop" role="presentation" onClick={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="command-palette__header">
          <h2 id="command-palette-title">ค้นหาด่วน</h2>
          <p className="command-palette__hint muted">
            {scoped
              ? `ค้นหาเฉพาะ: ${scopedLabel}`
              : 'Lead · ลูกค้า · งาน — ตาม RLS'}
          </p>
        </header>

        <input
          ref={inputRef}
          className="crm-input command-palette__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handlePaletteKeys}
          placeholder="พิมพ์อย่างน้อย 2 ตัวอักษร..."
          aria-describedby="command-palette-hint"
        />

        <div className="command-palette__body">
          <p id="command-palette-hint" className="command-palette__sr-only">
            พิมพ์อย่างน้อย {MIN_QUERY} ตัวอักษร
          </p>

          {!hasKinds && configured && (
            <p className="muted">ไม่มีประเภทข้อมูลที่ค้นหาได้สำหรับบทบาทนี้</p>
          )}

          {error && (
            <p className="crm-error" role="alert">
              {error}
            </p>
          )}
          {loading && (
            <p className="muted" aria-live="polite">
              กำลังค้นหา...
            </p>
          )}

          {!loading && queryReady && (
            <p className="command-palette-summary muted" aria-live="polite">
              {results.length > 0 ? `พบ ${results.length} รายการ` : 'ไม่พบผลลัพธ์'}
            </p>
          )}

          {!loading && results.length > 0 && (
            <ul className="command-palette__list">
              {results.map((item, index) => {
                const linkable = !configured || canOpenSearchResult(roles, item.href)
                if (!linkable) {
                  return (
                    <li
                      key={`${item.kind}-${item.id}`}
                      ref={(el) => {
                        rowRefs.current[index] = el
                      }}
                      className={
                        index === activeIndex
                          ? 'command-palette__row command-palette__row--active'
                          : 'command-palette__row'
                      }
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div
                        className="command-palette__item command-palette__item--static"
                        aria-disabled="true"
                      >
                        <span className="command-palette__kind">
                          {searchResultTypeLabel(item.kind)}
                        </span>
                        <strong>{item.title}</strong>
                        {item.subtitle && <span>{item.subtitle}</span>}
                        <span className="command-palette__locked">ไม่มีสิทธิ์เปิดรายละเอียด</span>
                      </div>
                    </li>
                  )
                }
                return (
                  <li
                    key={`${item.kind}-${item.id}`}
                    ref={(el) => {
                      rowRefs.current[index] = el
                    }}
                    className={
                      index === activeIndex
                        ? 'command-palette__row command-palette__row--active'
                        : 'command-palette__row'
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <Link
                      to={item.href}
                      className="command-palette__item"
                      onClick={(e) => {
                        e.preventDefault()
                        go(item.href)
                      }}
                    >
                      <span className="command-palette__kind">
                        {searchResultTypeLabel(item.kind)}
                      </span>
                      <strong>{item.title}</strong>
                      {item.subtitle && <span>{item.subtitle}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          {!loading && !queryReady && showQuickAccess && (
            <QuickAccessPanel variant="palette" onNavigate={onClose} />
          )}

          {!loading && !queryReady && hasKinds && (
            <p className="muted command-palette__search-link">
              <Link to="/app/search" onClick={() => onClose()}>
                เปิดหน้าค้นหารวม
              </Link>
            </p>
          )}
        </div>

        <footer className="command-palette__footer">
          {!loading && queryReady && results.length > 0 ? (
            <span>↑↓ เลือก · Enter เปิด</span>
          ) : null}
          <span>Esc ปิด</span>
          <span>⌘K / Ctrl+K สลับ</span>
        </footer>
      </div>
    </div>
  )
}
