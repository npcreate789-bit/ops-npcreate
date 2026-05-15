import type { QuickAccessEntry, QuickAccessState } from './types'

const STORAGE_VERSION = 'v1'
export const MAX_RECENT = 10
export const MAX_PINNED = 8

function storageKey(userId: string): string {
  return `npc-quick-access:${STORAGE_VERSION}:${userId}`
}

function emptyState(): QuickAccessState {
  return { recent: [], pinned: [] }
}

export function readQuickAccess(userId: string): QuickAccessState {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as QuickAccessState
    return {
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
    }
  } catch {
    return emptyState()
  }
}

export function writeQuickAccess(userId: string, state: QuickAccessState): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(state))
}

export function recordRecentVisit(userId: string, entry: QuickAccessEntry): QuickAccessState {
  const state = readQuickAccess(userId)
  const without = state.recent.filter((r) => r.path !== entry.path)
  const recent = [{ ...entry, visitedAt: entry.visitedAt }, ...without].slice(0, MAX_RECENT)
  const next = { ...state, recent }
  writeQuickAccess(userId, next)
  return next
}

export type TogglePinResult = {
  state: QuickAccessState
  ok: boolean
  atLimit?: boolean
}

export function togglePinnedPath(userId: string, path: string): TogglePinResult {
  const state = readQuickAccess(userId)
  const isPinned = state.pinned.includes(path)
  if (isPinned) {
    const pinned = state.pinned.filter((p) => p !== path)
    const next = { ...state, pinned }
    writeQuickAccess(userId, next)
    return { state: next, ok: true }
  }
  if (state.pinned.length >= MAX_PINNED) {
    return { state, ok: false, atLimit: true }
  }
  const pinned = [path, ...state.pinned.filter((p) => p !== path)]
  const next = { ...state, pinned }
  writeQuickAccess(userId, next)
  return { state: next, ok: true }
}

export function pinnedEntries(
  state: QuickAccessState,
  lookup: (path: string) => QuickAccessEntry | null,
): QuickAccessEntry[] {
  return state.pinned
    .map((path) => {
      const fromRecent = state.recent.find((r) => r.path === path)
      if (fromRecent) return fromRecent
      return lookup(path)
    })
    .filter((e): e is QuickAccessEntry => e !== null)
}
