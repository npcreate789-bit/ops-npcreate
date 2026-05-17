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
import { allowDevAuthBypass } from '../supabase/runtime'
import { normalizeLoginId, validateLoginId } from './loginId'

export interface UserProfile {
  id: string
  login_id: string
  email: string
  full_name: string | null
  must_change_password: boolean
  roles: AppRole[]
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  configured: boolean
  profileLoadError: string | null
  signIn: (
    loginId: string,
    password: string,
  ) => Promise<{ error: string | null; profile?: UserProfile }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  hasRole: (role: AppRole) => boolean
  hasAnyRole: (roles: AppRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string, email: string): Promise<UserProfile> {
  if (!supabase) {
    return {
      id: userId,
      login_id: 'dev',
      email,
      full_name: null,
      must_change_password: false,
      roles: ['ceo'],
    }
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, login_id, must_change_password')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw profileError

  const { data: roleRows, error: rolesError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)

  if (rolesError) throw rolesError

  const loginId =
    (profileRow?.login_id as string | undefined) ??
    normalizeLoginId(email.split('@')[0] ?? 'user')

  return {
    id: userId,
    login_id: loginId,
    email,
    full_name: profileRow?.full_name ?? null,
    must_change_password: Boolean(profileRow?.must_change_password),
    roles: (roleRows ?? []).map((r) => r.role as AppRole),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)

  const loadProfile = useCallback(
    async (s: Session | null, opts?: { blockUi?: boolean }) => {
      if (!s?.user) {
        setProfile(null)
        if (opts?.blockUi) setLoading(false)
        return
      }
      if (opts?.blockUi && isSupabaseConfigured && supabase) {
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
          login_id: normalizeLoginId((s.user.email ?? '').split('@')[0] || 'user'),
          email: s.user.email ?? '',
          full_name: null,
          must_change_password: false,
          roles: [],
        })
      } finally {
        if (opts?.blockUi && isSupabaseConfigured && supabase) {
          setLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (allowDevAuthBypass) {
      setProfile({
        id: '00000000-0000-4000-8000-000000000001',
        login_id: 'dev',
        email: 'dev@npcreate.local',
        full_name: 'Dev User (โหมดพัฒนา)',
        must_change_password: false,
        roles: ['ceo', 'dev'],
      })
      setProfileLoadError(null)
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      setProfile(null)
      setProfileLoadError(null)
      setLoading(false)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      void loadProfile(data.session, { blockUi: true }).finally(() => {
        if (mounted) setLoading(false)
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession?.user) {
        setProfile(null)
        setLoading(false)
        return
      }
      void loadProfile(nextSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (loginId: string, password: string) => {
    if (!supabase) {
      return { error: 'ยังไม่ได้ตั้งค่า Supabase (ดู .env.example)' }
    }

    const invalid = validateLoginId(loginId)
    if (invalid) return { error: invalid }

    if (!password) {
      return { error: 'กรุณากรอกรหัสผ่าน' }
    }

    const normalized = normalizeLoginId(loginId)
    const { data: email, error: resolveError } = await supabase.rpc('resolve_login_email', {
      p_login_id: normalized,
    })

    if (resolveError) {
      return { error: 'ไม่สามารถตรวจสอบรหัสผู้ใช้ได้ — ลองใหม่อีกครั้ง' }
    }

    if (!email || typeof email !== 'string') {
      return { error: 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const active = sessionData.session
    if (active) {
      setSession(active)
      try {
        const p = await fetchProfile(active.user.id, active.user.email ?? '')
        setProfile(p)
        setProfileLoadError(null)
        return { error: null, profile: p }
      } catch (e) {
        setProfileLoadError(
          e instanceof Error ? e.message : 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ',
        )
      }
    }

    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session) return
    await loadProfile(session)
  }, [session, loadProfile])

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
      refreshProfile,
      hasRole,
      hasAnyRole,
    }),
    [session, profile, loading, profileLoadError, signIn, signOut, refreshProfile, hasRole, hasAnyRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
