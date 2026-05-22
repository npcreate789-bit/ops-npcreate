import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { canAccessNavPath, effectiveRolesForNav } from '../config/navigation'
import {
  canOpenSearchResult,
  canUseGlobalSearch,
  hasGlobalSearchKinds,
  isGlobalSearchScoped,
  scopedSearchKindLabels,
  searchKindsForRoles,
} from '../modules/search/access'
import { globalSearch, searchResultTypeLabel } from '../modules/search/api/search'
import {
  SEARCH_KIND_ORDER,
  searchIdleHint,
  searchInputPlaceholder,
  searchNoResultsHint,
} from '../modules/search/searchLabels'
import {
  canOpenNavSearchResult,
  NAV_SEARCH_KIND_LABEL,
  searchAccessibleNav,
  type NavSearchHit,
} from '../modules/search/searchNav'
import type { SearchResult, SearchResultKind } from '../modules/search/types'
import { QuickAccessPanel } from '../modules/quick-access/components/QuickAccessPanel'
import { canUseQuickAccess } from '../../shared/auth/access'
import '../modules/crm/crm.css'
import './command-palette.css'

const DEBOUNCE_MS = 280
const MIN_QUERY = 2

type PaletteEntry = SearchResult | NavSearchHit

function entryKey(item: PaletteEntry): string {
  return `${item.kind}-${item.id}`
}

function entryLabel(item: PaletteEntry): string {
  return item.kind === 'nav' ? NAV_SEARCH_KIND_LABEL : searchResultTypeLabel(item.kind)
}

function canOpenEntry(
  roles: ReturnType<typeof effectiveRolesForNav>,
  configured: boolean,
  item: PaletteEntry,
): boolean {
  if (!configured) return true
  if (item.kind === 'nav') return canOpenNavSearchResult(roles, item.href, configured)
  return canOpenSearchResult(roles, item.href)
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { profile, configured } = useAuth()
  const rawRoles = profile?.roles ?? []
  const roles = effectiveRolesForNav(rawRoles, configured)
  const allowed = canUseGlobalSearch(rawRoles) || !configured
  const showQuickAccess = canUseQuickAccess(rawRoles) || !configured
  const hasKinds = hasGlobalSearchKinds(roles) || !configured
  const scoped = isGlobalSearchScoped(roles) && configured
  const kinds = useMemo(() => searchKindsForRoles(roles), [roles])

  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [dataResults, setDataResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])

  const scopedLabel = useMemo(
    () => scopedSearchKindLabels(roles, searchResultTypeLabel),
    [roles],
  )

  const navResults = useMemo(
    () =>
      open && query.trim().length >= MIN_QUERY
        ? searchAccessibleNav(roles, query, configured)
        : [],
    [configured, open, query, roles],
  )

  const groupedData = useMemo(() => {
    const map = new Map<SearchResultKind, SearchResult[]>()
    for (const r of dataResults) {
      const list = map.get(r.kind) ?? []
      list.push(r)
      map.set(r.kind, list)
    }
    return map
  }, [dataResults])

  const flatResults = useMemo<PaletteEntry[]>(() => {
    const dataOrdered = SEARCH_KIND_ORDER.flatMap((kind) => groupedData.get(kind) ?? [])
    return [...navResults, ...dataOrdered]
  }, [groupedData, navResults])

  useEffect(() => {
    if (!open) {
      setInput('')
      setQuery('')
      setDataResults([])
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
      setDataResults([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    globalSearch(trimmed, roles)
      .then((data) => {
        if (!cancelled) setDataResults(data.results)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'ค้นหาไม่สำเร็จ')
          setDataResults([])
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
    setActiveIndex(flatResults.length > 0 ? 0 : -1)
    rowRefs.current = rowRefs.current.slice(0, flatResults.length)
  }, [flatResults.length, open])

  useEffect(() => {
    if (activeIndex < 0) return
    rowRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open || !allowed) return null

  const canOpenFullSearch = !configured || canAccessNavPath(roles, '/app/search')
  const placeholder = searchInputPlaceholder(kinds)
  const idleHint = searchIdleHint(kinds, true)

  function go(href: string) {
    onClose()
    navigate(href)
  }

  const queryReady = query.trim().length >= MIN_QUERY
  const totalCount = flatResults.length

  function handlePaletteKeys(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (!queryReady || loading || flatResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => {
        if (i < 0) return 0
        return (i + 1) % flatResults.length
      })
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => {
        if (i < 0) return flatResults.length - 1
        return (i - 1 + flatResults.length) % flatResults.length
      })
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const i = activeIndex < 0 ? 0 : activeIndex
      const item = flatResults[i]
      if (!item || !canOpenEntry(roles, configured, item)) return
      go(item.href)
    }
  }

  /*
   * คำนวณ index ของแต่ละแถวจาก flat list ที่สร้างไว้ก่อน render
   * (เลี่ยง mutation ของ closure variable ระหว่าง render — React Compiler ห้าม)
   */
  const rowIndexMap = new Map<PaletteEntry, number>()
  {
    let i = 0
    for (const item of navResults) rowIndexMap.set(item, i++)
    for (const kind of SEARCH_KIND_ORDER) {
      const items = groupedData.get(kind)
      if (!items?.length) continue
      for (const item of items) rowIndexMap.set(item, i++)
    }
  }

  function renderRow(item: PaletteEntry) {
    const index = rowIndexMap.get(item) ?? 0
    const linkable = canOpenEntry(roles, configured, item)
    const active = index === activeIndex

    const rowClass = active
      ? 'command-palette__row command-palette__row--active'
      : 'command-palette__row'

    const inner = (
      <>
        <span className="command-palette__kind">{entryLabel(item)}</span>
        <strong>{item.title}</strong>
        {item.subtitle && <span>{item.subtitle}</span>}
      </>
    )

    return (
      <li
        key={entryKey(item)}
        ref={(el) => {
          rowRefs.current[index] = el
        }}
        className={rowClass}
        role="option"
        aria-selected={active}
        onMouseEnter={() => setActiveIndex(index)}
      >
        {linkable ? (
          <Link
            to={item.href}
            className="command-palette__item"
            onClick={(e) => {
              e.preventDefault()
              go(item.href)
            }}
          >
            {inner}
          </Link>
        ) : (
          <div className="command-palette__item command-palette__item--static" aria-disabled="true">
            {inner}
            <span className="command-palette__locked">ไม่มีสิทธิ์เปิดหน้านี้</span>
          </div>
        )}
      </li>
    )
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
            {scoped ? `ค้นหาเฉพาะ: ${scopedLabel} · เมนู` : idleHint}
          </p>
        </header>

        {!configured && (
          <p className="command-palette__dev crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่าง</p>
        )}

        <input
          ref={inputRef}
          className="crm-input command-palette__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handlePaletteKeys}
          placeholder={placeholder}
          aria-describedby="command-palette-hint"
          aria-controls="command-palette-results"
          aria-expanded={queryReady && totalCount > 0}
          aria-autocomplete="list"
          role="combobox"
        />

        <div className="command-palette__body" id="command-palette-results">
          <p id="command-palette-hint" className="command-palette__sr-only">
            {idleHint}
          </p>

          {!hasKinds && configured && (
            <p className="muted">ไม่มีประเภทข้อมูลที่ค้นหาได้สำหรับบทบาทนี้ — ยังค้นหาเมนูได้</p>
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
              {totalCount > 0
                ? `พบ ${totalCount} รายการ${navResults.length > 0 ? ` (เมนู ${navResults.length})` : ''}`
                : searchNoResultsHint(kinds)}
            </p>
          )}

          {!loading && totalCount > 0 && (
            <ul className="command-palette__list" role="listbox">
              {navResults.length > 0 && (
                <li className="command-palette__group">
                  <p className="command-palette__group-title">{NAV_SEARCH_KIND_LABEL}</p>
                  <ul className="command-palette__group-list">
                    {navResults.map((item) => renderRow(item))}
                  </ul>
                </li>
              )}
              {SEARCH_KIND_ORDER.map((kind) => {
                const items = groupedData.get(kind)
                if (!items?.length) return null
                return (
                  <li key={kind} className="command-palette__group">
                    <p className="command-palette__group-title">{searchResultTypeLabel(kind)}</p>
                    <ul className="command-palette__group-list">
                      {items.map((item) => renderRow(item))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          )}

          {!loading && !queryReady && showQuickAccess && (
            <QuickAccessPanel variant="palette" onNavigate={onClose} />
          )}

          {!loading && !queryReady && canOpenFullSearch && (
            <p className="muted command-palette__search-link">
              <Link to="/app/search" onClick={() => onClose()}>
                เปิดหน้าค้นหารวม
              </Link>
            </p>
          )}
        </div>

        <footer className="command-palette__footer">
          {!loading && queryReady && totalCount > 0 ? (
            <span>↑↓ เลือก · Enter เปิด</span>
          ) : null}
          <span>Esc ปิด</span>
          <span>⌘K / Ctrl+K สลับ</span>
        </footer>
      </div>
    </div>
  )
}
