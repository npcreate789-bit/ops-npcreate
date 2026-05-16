import { useCallback, useEffect, useState } from 'react'

const STORAGE_PREFIX = 'npc-start-tasks-'

function read(userId: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, boolean>
  } catch {
    return {}
  }
}

function write(userId: string, state: Record<string, boolean>) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(state))
  } catch {
    /* quota / private mode */
  }
}

export function useStartChecklist(userId: string) {
  const [done, setDone] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setDone(read(userId))
  }, [userId])

  const setAndPersist = useCallback(
    (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
      setDone((prev) => {
        const next = updater(prev)
        write(userId, next)
        return next
      })
    },
    [userId],
  )

  const toggle = useCallback(
    (id: string) => {
      setAndPersist((prev) => ({ ...prev, [id]: !prev[id] }))
    },
    [setAndPersist],
  )

  const reset = useCallback(() => {
    setAndPersist(() => ({}))
  }, [setAndPersist])

  return { done, toggle, reset }
}
