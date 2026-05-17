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

type StaffAlertListener = (row: UserNotification) => void
type VoidListener = () => void

interface NotificationRealtimeContextValue {
  subscribeUnread: (listener: VoidListener) => () => void
  subscribeStaffAlertInsert: (listener: StaffAlertListener) => () => void
  subscribeStaffAlertUpdate: (listener: StaffAlertListener) => () => void
  /** @deprecated ใช้ subscribeStaffAlertInsert */
  subscribeLeadInsert: (listener: StaffAlertListener) => () => void
  /** @deprecated ใช้ subscribeStaffAlertUpdate */
  subscribeLeadUpdate: (listener: StaffAlertListener) => () => void
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
  const staffAlertInsertListenersRef = useRef(new Set<StaffAlertListener>())
  const staffAlertUpdateListenersRef = useRef(new Set<StaffAlertListener>())

  const notifyUnread = useCallback(() => {
    for (const fn of unreadListenersRef.current) fn()
  }, [])

  const notifyStaffAlertInsert = useCallback((row: UserNotification) => {
    for (const fn of staffAlertInsertListenersRef.current) fn(row)
  }, [])

  const notifyStaffAlertUpdate = useCallback((row: UserNotification) => {
    for (const fn of staffAlertUpdateListenersRef.current) fn(row)
  }, [])

  useAppNotificationRealtime(
    userId,
    enabled,
    notifyUnread,
    notifyStaffAlertInsert,
    notifyStaffAlertUpdate,
  )

  const value = useMemo<NotificationRealtimeContextValue>(
    () => ({
      subscribeUnread: (listener) => {
        unreadListenersRef.current.add(listener)
        return () => unreadListenersRef.current.delete(listener)
      },
      subscribeStaffAlertInsert: (listener) => {
        staffAlertInsertListenersRef.current.add(listener)
        return () => staffAlertInsertListenersRef.current.delete(listener)
      },
      subscribeStaffAlertUpdate: (listener) => {
        staffAlertUpdateListenersRef.current.add(listener)
        return () => staffAlertUpdateListenersRef.current.delete(listener)
      },
      subscribeLeadInsert: (listener) => {
        staffAlertInsertListenersRef.current.add(listener)
        return () => staffAlertInsertListenersRef.current.delete(listener)
      },
      subscribeLeadUpdate: (listener) => {
        staffAlertUpdateListenersRef.current.add(listener)
        return () => staffAlertUpdateListenersRef.current.delete(listener)
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
      subscribeStaffAlertInsert: (_listener: StaffAlertListener) => () => {},
      subscribeStaffAlertUpdate: (_listener: StaffAlertListener) => () => {},
      subscribeLeadInsert: (_listener: StaffAlertListener) => () => {},
      subscribeLeadUpdate: (_listener: StaffAlertListener) => () => {},
    }
  }
  return ctx
}
