import { useEffect, useMemo, useRef, useState } from 'react'
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
  const hasKinds = hasGlobalSearchKinds(roles) || !configured
  const scoped = isGlobalSearchScoped(roles) && configured

  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Awaited<ReturnType<typeof globalSearch>>['results']>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  if (!open || !allowed) return null

  function go(href: string) {
    onClose()
    navigate(href)
  }

  const queryReady = query.trim().length >= MIN_QUERY

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
              {results.map((item) => {
                const linkable = !configured || canOpenSearchResult(roles, item.href)
                if (!linkable) {
                  return (
                    <li key={`${item.kind}-${item.id}`}>
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
                  <li key={`${item.kind}-${item.id}`}>
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

          {!loading && !queryReady && hasKinds && (
            <p className="muted">
              <Link to="/app/search" onClick={() => onClose()}>
                เปิดหน้าค้นหารวม
              </Link>
            </p>
          )}
        </div>

        <footer className="command-palette__footer">
          <span>Esc ปิด</span>
          <span>⌘K / Ctrl+K สลับ</span>
        </footer>
      </div>
    </div>
  )
}
