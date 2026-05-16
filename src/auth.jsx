import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null)
  const [ready, setReady] = useState(false)

  async function loadProfile(supabaseUser) {
    if (!supabaseUser) { setUser(null); return }
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single()
    if (!profile || !profile.approved) { setUser(null); return }
    setUser({
      id:                     profile.username,
      supabaseId:             supabaseUser.id,
      email:                  supabaseUser.email,
      displayName:            profile.display_name || profile.username,
      fullName:               profile.full_name || '',
      photo:                  profile.photo_url || null,
      country:                profile.country || 'Portugal',
      location:               profile.location || '',
      markColor:              profile.mark_color || '#6c63ff',
      isAdmin:                profile.is_admin || false,
      approved:               profile.approved || false,
      joinedAt:               new Date(profile.joined_at).getTime(),
      visited_municipalities: profile.visited_municipalities || [],
      visited_parishes:       profile.visited_parishes || [],
    })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session?.user ?? null).finally(() => setReady(true))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Invalid login')) return { err: 'Email ou palavra-passe incorretos.' }
      return { err: error.message }
    }
    const { data: { user: sbUser } } = await supabase.auth.getUser()
    if (sbUser) {
      const { data: profile } = await supabase.from('profiles').select('approved').eq('id', sbUser.id).single()
      if (!profile?.approved) {
        await supabase.auth.signOut()
        return { err: 'A tua conta está a aguardar aprovação.' }
      }
    }
    return { ok: true }
  }, [])

  const register = useCallback(async (username, email, password, photo, country) => {
    const key = username.trim().toLowerCase()
    if (key.length < 2)      return { err: 'Nome demasiado curto (mín. 2 caracteres).' }
    if (password.length < 4) return { err: 'Palavra-passe demasiado curta (mín. 4 caracteres).' }
    if (!email.includes('@')) return { err: 'Email inválido.' }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: key, country: country || 'Portugal' } }
    })
    if (error) {
      if (error.message.includes('already registered')) return { err: 'Este email já está registado.' }
      return { err: error.message }
    }
    await supabase.auth.signOut()
    return { pending: true }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  // Use ref so saveVisited never has a stale closure on supabaseId
  const userRef = useRef(null)
  useEffect(() => { userRef.current = user }, [user])

  const saveVisited = useCallback(async (list, level) => {
    const uid = userRef.current?.supabaseId
    if (!uid) { console.warn('saveVisited: no uid', userRef.current); return }
    const col = level === 'parishes' ? 'visited_parishes' : 'visited_municipalities'
    const { data, error } = await supabase.from('profiles').update({ [col]: list }).eq('id', uid).select('id')
    if (error) console.error('saveVisited error:', error)
    else console.log('saveVisited ok:', col, list.length, 'items')
    setUser(prev => prev ? { ...prev, [col]: list } : prev)
  }, [])

  const updatePhoto = useCallback(async (photoDataUrl) => {
    if (!user?.supabaseId) return
    await supabase.from('profiles').update({ photo_url: photoDataUrl }).eq('id', user.supabaseId)
    setUser(prev => prev ? { ...prev, photo: photoDataUrl } : prev)
  }, [user?.supabaseId])

  const getAllUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('joined_at', { ascending: false })
    if (!data) return []
    return data
      .filter(p => !p.is_admin)
      .map(p => ({
        id:                     p.username,
        supabaseId:             p.id,
        photo:                  p.photo_url || null,
        country:                p.country || 'Portugal',
        isAdmin:                p.is_admin,
        approved:               p.approved,
        joinedAt:               new Date(p.joined_at).getTime(),
        visited_municipalities: p.visited_municipalities || [],
        visited_parishes:       p.visited_parishes || [],
      }))
  }, [])

  const setUserApproved = useCallback(async (supabaseId, approved) => {
    await supabase.from('profiles').update({ approved }).eq('id', supabaseId)
  }, [])

  const deleteUser = useCallback(async (supabaseId) => {
    await supabase.from('profiles').delete().eq('id', supabaseId)
  }, [])

  const resetPassword = useCallback(async (_supabaseId, _newPw) => {
    console.warn('Reset de password requer Supabase Dashboard ou Edge Function')
  }, [])

  const updateProfile = useCallback(async (updates) => {
    const uid = userRef.current?.supabaseId
    if (!uid) {
      console.warn('updateProfile: no supabaseId found', userRef.current)
      return
    }
    // Optimistically update local state immediately
    setUser(prev => prev ? { ...prev, ...updates } : prev)
    // Map camelCase to snake_case for DB
    const dbUpdates = {}
    if ('displayName' in updates) dbUpdates.display_name = updates.displayName
    if ('fullName'    in updates) dbUpdates.full_name    = updates.fullName
    if ('country'     in updates) dbUpdates.country      = updates.country
    if ('location'    in updates) dbUpdates.location     = updates.location
    if ('markColor'   in updates) dbUpdates.mark_color   = updates.markColor
    if (Object.keys(dbUpdates).length > 0) {
      const { data, error } = await supabase.from('profiles').update(dbUpdates).eq('id', uid).select()
      if (error) console.error('updateProfile DB error:', error)
      else console.log('updateProfile saved:', dbUpdates, 'result:', data)
    }
  }, [])

  return (
    <Ctx.Provider value={{
      user, ready, login, register, logout,
      saveVisited, updatePhoto, updateProfile, getAllUsers,
      setUserApproved, deleteUser, resetPassword,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
