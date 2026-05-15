import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { AppRole } from '../types/roles'
import { isSupabaseConfigured, supabase } from '../supabase/client'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  roles: AppRole[]
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  configured: boolean
  profileLoadError: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  hasRole: (role: AppRole) => boolean
  hasAnyRole: (roles: AppRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string, email: string): Promise<UserProfile> {
  if (!supabase) {
    return { id: userId, email, full_name: null, roles: ['ceo'] }
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw profileError

  const { data: roleRows, error: rolesError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)

  if (rolesError) throw rolesError

  return {
    id: userId,
    email,
    full_name: profileRow?.full_name ?? null,
    roles: (roleRows ?? []).map((r) => r.role as AppRole),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setProfile(null)
      return
    }
    if (isSupabaseConfigured && supabase) {
      setLoading(true)
    }
    try {
      const p = await fetchProfile(s.user.id, s.user.email ?? '')
      setProfile(p)
      setProfileLoadError(null)
    } catch (e) {
      setProfileLoadError(
        e instanceof Error ? e.message : 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ',
      )
      setProfile({
        id: s.user.id,
        email: s.user.email ?? '',
        full_name: null,
        roles: [],
      })
    } finally {
      if (isSupabaseConfigured && supabase) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setProfile({
        id: '00000000-0000-4000-8000-000000000001',
        email: 'dev@npcreate.local',
        full_name: 'Dev User (โหมดพัฒนา)',
        roles: ['ceo', 'dev'],
      })
      setProfileLoadError(null)
      setLoading(false)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      void loadProfile(data.session).finally(() => {
        if (mounted) setLoading(false)
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      void loadProfile(nextSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: 'ยังไม่ได้ตั้งค่า Supabase (ดู .env.example)' }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  const hasRole = useCallback(
    (role: AppRole) => profile?.roles.includes(role) ?? false,
    [profile],
  )

  const hasAnyRole = useCallback(
    (roles: AppRole[]) => roles.some((r) => profile?.roles.includes(r)),
    [profile],
  )

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      configured: isSupabaseConfigured,
      profileLoadError,
      signIn,
      signOut,
      hasRole,
      hasAnyRole,
    }),
    [session, profile, loading, profileLoadError, signIn, signOut, hasRole, hasAnyRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
