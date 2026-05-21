import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { resolvePageMeta } from '../modules/quick-access/pathMeta'

interface PageHeadingState {
  /** ป้ายเสริม render หลัง breadcrumb เช่น ชื่อแบรนด์ / QT-1234 */
  entityLabel: string | null
  /** ใช้ override title แท็บเบราว์เซอร์ ถ้าหน้านี้ต้องการ */
  documentTitleOverride: string | null
}

interface PageHeadingContextValue extends PageHeadingState {
  setEntityLabel: (label: string | null) => void
  setDocumentTitleOverride: (title: string | null) => void
}

const PageHeadingContext = createContext<PageHeadingContextValue | null>(null)

const BRAND_SUFFIX = 'NP Create OS'

export function PageHeadingProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [entityLabel, setEntityLabelState] = useState<string | null>(null)
  const [documentTitleOverride, setDocumentTitleOverrideState] = useState<string | null>(null)

  // path เปลี่ยน — เคลียร์ entity label เพื่อไม่ให้ค้างกับหน้าก่อนหน้า
  useEffect(() => {
    setEntityLabelState(null)
    setDocumentTitleOverrideState(null)
  }, [pathname])

  // อัปเดต document.title ตาม pathname + entity/override
  useEffect(() => {
    const meta = resolvePageMeta(pathname)
    const base = documentTitleOverride ?? meta.title
    const titlePart = entityLabel ? `${base}: ${entityLabel}` : base
    document.title = pathname === '/app' || pathname === '/app/'
      ? BRAND_SUFFIX
      : `${titlePart} · ${BRAND_SUFFIX}`
  }, [pathname, entityLabel, documentTitleOverride])

  const setEntityLabel = useCallback((label: string | null) => {
    setEntityLabelState(label && label.trim() ? label.trim() : null)
  }, [])

  const setDocumentTitleOverride = useCallback((title: string | null) => {
    setDocumentTitleOverrideState(title && title.trim() ? title.trim() : null)
  }, [])

  const value = useMemo<PageHeadingContextValue>(
    () => ({
      entityLabel,
      documentTitleOverride,
      setEntityLabel,
      setDocumentTitleOverride,
    }),
    [entityLabel, documentTitleOverride, setEntityLabel, setDocumentTitleOverride],
  )

  return <PageHeadingContext.Provider value={value}>{children}</PageHeadingContext.Provider>
}

export function usePageHeading(): PageHeadingContextValue {
  const ctx = useContext(PageHeadingContext)
  if (!ctx) {
    return {
      entityLabel: null,
      documentTitleOverride: null,
      setEntityLabel: () => {},
      setDocumentTitleOverride: () => {},
    }
  }
  return ctx
}

/**
 * เรียกใน detail page เพื่อบอก breadcrumb + แท็บเบราว์เซอร์ ว่ากำลังดูอะไรอยู่
 * เช่น `usePageEntityLabel(brandName)` — null/empty = ล้างค่า
 */
export function usePageEntityLabel(label: string | null | undefined): void {
  const { setEntityLabel } = usePageHeading()
  useEffect(() => {
    setEntityLabel(label ?? null)
    return () => setEntityLabel(null)
  }, [label, setEntityLabel])
}
