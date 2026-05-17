import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { canAccessNotifications } from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import type { UserNotification } from './types'
import { useAppNotificationRealtime } from './useAppNotificationRealtime'

type LeadListener = (row: UserNotification) => void
type VoidListener = () => void

interface NotificationRealtimeContextValue {
  subscribeUnread: (listener: VoidListener) => () => void
  subscribeLeadInsert: (listener: LeadListener) => () => void
  subscribeLeadUpdate: (listener: LeadListener) => () => void
}

const NotificationRealtimeContext = createContext<NotificationRealtimeContextValue | null>(
  null,
)

export function NotificationRealtimeProvider({
  userId,
  roles,
  children,
}: {
  userId: string | undefined
  roles: AppRole[]
  children: ReactNode
}) {
  const enabled = canAccessNotifications(roles)
  const unreadListenersRef = useRef(new Set<VoidListener>())
  const leadInsertListenersRef = useRef(new Set<LeadListener>())
  const leadUpdateListenersRef = useRef(new Set<LeadListener>())

  const notifyUnread = useCallback(() => {
    for (const fn of unreadListenersRef.current) fn()
  }, [])

  const notifyLeadInsert = useCallback((row: UserNotification) => {
    for (const fn of leadInsertListenersRef.current) fn(row)
  }, [])

  const notifyLeadUpdate = useCallback((row: UserNotification) => {
    for (const fn of leadUpdateListenersRef.current) fn(row)
  }, [])

  useAppNotificationRealtime(userId, enabled, notifyUnread, notifyLeadInsert, notifyLeadUpdate)

  const value = useMemo<NotificationRealtimeContextValue>(
    () => ({
      subscribeUnread: (listener) => {
        unreadListenersRef.current.add(listener)
        return () => unreadListenersRef.current.delete(listener)
      },
      subscribeLeadInsert: (listener) => {
        leadInsertListenersRef.current.add(listener)
        return () => leadInsertListenersRef.current.delete(listener)
      },
      subscribeLeadUpdate: (listener) => {
        leadUpdateListenersRef.current.add(listener)
        return () => leadUpdateListenersRef.current.delete(listener)
      },
    }),
    [],
  )

  return (
    <NotificationRealtimeContext.Provider value={value}>
      {children}
    </NotificationRealtimeContext.Provider>
  )
}

export function useNotificationRealtime() {
  const ctx = useContext(NotificationRealtimeContext)
  if (!ctx) {
    return {
      subscribeUnread: (_listener: VoidListener) => () => {},
      subscribeLeadInsert: (_listener: LeadListener) => () => {},
      subscribeLeadUpdate: (_listener: LeadListener) => () => {},
    }
  }
  return ctx
}
