import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const Ctx = createContext(null)
const STORE      = 'pt_tracker_v1_users'
const SESH       = 'pt_tracker_v1_session'
const ADMIN_USER = 'admin'
const ADMIN_PASS = 'admin1234'

const readDB  = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}') } catch { return {} } }
const writeDB = db => localStorage.setItem(STORE, JSON.stringify(db))

function ensureAdmin() {
  const db = readDB()
  if (!db[ADMIN_USER]) {
    db[ADMIN_USER] = {
      pw: ADMIN_PASS, photo: null, country: 'Portugal',
      visited_municipalities: [], visited_parishes: [],
      joinedAt: Date.now(), approved: true, isAdmin: true
    }
  } else {
    db[ADMIN_USER].approved = true
    db[ADMIN_USER].isAdmin  = true
    db[ADMIN_USER].pw       = ADMIN_PASS
  }
  Object.values(db).forEach(u => {
    if (!u.visited_municipalities) u.visited_municipalities = u.visited || []
    if (!u.visited_parishes)       u.visited_parishes = []
  })
  writeDB(db)
}

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureAdmin()
    const id = localStorage.getItem(SESH)
    if (id) {
      const db = readDB()
      if (db[id] && db[id].approved) setUser({ id, ...db[id] })
      else localStorage.removeItem(SESH)
    }
    setReady(true)
  }, [])

  const login = useCallback((id, password) => {
    ensureAdmin()
    const db  = readDB()
    const key = id.trim().toLowerCase()
    if (!db[key])                return { err: `Utilizador "${key}" não encontrado.` }
    if (db[key].pw !== password) return { err: 'Palavra-passe incorreta.' }
    if (!db[key].approved)       return { err: 'A tua conta está a aguardar aprovação.' }
    localStorage.setItem(SESH, key)
    setUser({ id: key, ...db[key] })
    return { ok: true }
  }, [])

  const register = useCallback((id, password, photo, country) => {
    const key = id.trim().toLowerCase()
    if (key.length < 2)      return { err: 'Nome demasiado curto (mín. 2 caracteres).' }
    if (password.length < 4) return { err: 'Palavra-passe demasiado curta (mín. 4 caracteres).' }
    const db = readDB()
    if (db[key]) return { err: 'Este utilizador já existe.' }
    db[key] = {
      pw: password, photo: photo || null, country: country || 'Portugal',
      visited_municipalities: [], visited_parishes: [],
      joinedAt: Date.now(), approved: false, isAdmin: false
    }
    writeDB(db)
    return { pending: true }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESH); setUser(null)
  }, [])

  const saveVisited = useCallback((list, level) => {
    const key = level === 'parishes' ? 'visited_parishes' : 'visited_municipalities'
    setUser(prev => {
      if (!prev) return prev
      const db = readDB()
      if (!db[prev.id]) return prev
      db[prev.id][key] = list; writeDB(db)
      return { ...prev, [key]: list }
    })
  }, [])

  const updatePhoto = useCallback((photo) => {
    setUser(prev => {
      if (!prev) return prev
      const db = readDB()
      if (!db[prev.id]) return prev
      db[prev.id].photo = photo; writeDB(db)
      return { ...prev, photo }
    })
  }, [])

  const getAllUsers = useCallback(() => {
    const db = readDB()
    return Promise.resolve(
      Object.entries(db)
        .filter(([id]) => id !== ADMIN_USER)
        .map(([id, d]) => ({ id, ...d }))
        .sort((a, b) => b.joinedAt - a.joinedAt)
    )
  }, [])

  const setUserApproved = useCallback((id, approved) => {
    const db = readDB()
    if (db[id]) { db[id].approved = approved; writeDB(db) }
  }, [])

  const deleteUser = useCallback((id) => {
    const db = readDB(); delete db[id]; writeDB(db)
  }, [])

  const resetPassword = useCallback((id, newPw) => {
    const db = readDB()
    if (db[id]) { db[id].pw = newPw; writeDB(db) }
  }, [])

  return (
    <Ctx.Provider value={{
      user, ready, login, register, logout,
      saveVisited, updatePhoto, getAllUsers,
      setUserApproved, deleteUser, resetPassword,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
