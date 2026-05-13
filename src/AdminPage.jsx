import { useState, useCallback } from 'react'
import { X, Shield, Trash2, Check, RefreshCw, Eye, EyeOff, Copy, Mail, Image, MessageSquare, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from './auth'
import { getAllPendingSuggestions, setSuggestionStatus } from './storage'

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement('textarea')
    el.value = text; document.body.appendChild(el); el.select()
    document.execCommand('copy'); document.body.removeChild(el)
  })
}

const CATS = [
  { key:'visit', label:'O que visitar', color:'#d4500a' },
  { key:'food',  label:'Gastronomia',   color:'#1565c0' },
  { key:'sweet', label:'Doçaria',       color:'#6a1b9a' },
  { key:'fest',  label:'Festa/Evento',  color:'#2e7d52' },
  { key:'other', label:'Outro',         color:'#7a756c' },
]

// ── Users tab ─────────────────────────────────────────────────────────────
function UsersTab() {
  const { getAllUsers, setUserApproved, deleteUser, resetPassword } = useAuth()
  const [users,   setUsers]   = useState([])

  useEffect(() => { getAllUsers().then(setUsers) }, [])
  const [showPw,  setShowPw]  = useState({})
  const [newPw,   setNewPw]   = useState({})
  const [copied,  setCopied]  = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')

  function refresh() { setUsers(getAllUsers()) }

  function copy(text, key) {
    copyToClipboard(text); setCopied(key); setTimeout(() => setCopied(null), 1500)
  }

  function emailText(type, user, pw) {
    if (type === 'approve') return `Olá ${user.id},\n\nA tua conta no Vou PorOnde foi aprovada!\n\nEntra em: portugal-tracker.netlify.app\nUtilizador: ${user.id}\n\nBoas explorações! 🗺`
    return `Olá ${user.id},\n\nA tua palavra-passe foi alterada.\n\nUtilizador: ${user.id}\nNova palavra-passe: ${pw || newPw[user.id] || '(não gerada)'}\n\nEquipa Vou PorOnde`
  }

  const filtered = users.filter(u => {
    const ms = !search || u.id.toLowerCase().includes(search.toLowerCase()) || (u.country||'').toLowerCase().includes(search.toLowerCase())
    const mf = filter==='all' || (filter==='pending' && !u.approved) || (filter==='approved' && u.approved)
    return ms && mf
  })

  const pendingN  = users.filter(u => !u.approved).length
  const approvedN = users.filter(u =>  u.approved).length

  return (
    <div>
      {/* Filters */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar…"
          style={{ flex:1, padding:'7px 11px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface2)', fontSize:13, color:'var(--text)', fontFamily:'Open Sans,sans-serif', outline:'none' }}
          onFocus={e => e.target.style.borderColor='var(--accent)'}
          onBlur={e => e.target.style.borderColor='var(--border)'}
        />
        {['all','pending','approved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'5px 10px', borderRadius:20, border:'1px solid',
            borderColor: filter===f ? 'var(--accent)' : 'var(--border)',
            background: filter===f ? 'var(--accent-bg)' : 'transparent',
            color: filter===f ? 'var(--accent)' : 'var(--muted)',
            fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif', whiteSpace:'nowrap',
          }}>
            {f==='all'?`Todos (${users.length})`:f==='pending'?`Pendentes (${pendingN})`:`Aprovados (${approvedN})`}
          </button>
        ))}
      </div>

      {filtered.map(u => (
        <div key={u.id} style={{ background: u.approved ? 'var(--surface2)' : '#fff8e1', border:`1px solid ${u.approved ? 'var(--border)' : '#ffe082'}`, borderRadius:12, padding:'14px', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, overflow:'hidden', flexShrink:0, background:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {u.photo ? <img src={u.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:20 }}>👤</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{u.id}</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>
                {u.country||'Portugal'} · {(u.visited_municipalities?.length||0)} concelhos · {(u.visited_parishes?.length||0)} freguesias
              </div>
              <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>desde {new Date(u.joinedAt).toLocaleDateString('pt-PT')}</div>
            </div>
            <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, background: u.approved?'#e8f5ee':'#fff8e1', color: u.approved?'#2e7d52':'#e65100' }}>
              {u.approved ? '✓ Aprovado' : '⏳ Pendente'}
            </span>
          </div>

          {/* Password */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:5 }}>Palavra-passe</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontFamily:'monospace', fontSize:13, color:'var(--text)', flex:1, letterSpacing: showPw[u.id] ? '0' : '3px' }}>
                {showPw[u.id] ? (newPw[u.id] || u.pw) : '••••••••'}
              </span>
              <button onClick={() => setShowPw(p => ({...p,[u.id]:!p[u.id]}))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', display:'flex' }}>
                {showPw[u.id] ? <EyeOff size={13}/> : <Eye size={13}/>}
              </button>
              <button onClick={() => copy(newPw[u.id]||u.pw, `pw-${u.id}`)} style={{ background:'none', border:'none', cursor:'pointer', color: copied===`pw-${u.id}` ? 'var(--accent)' : 'var(--muted)', display:'flex' }}>
                {copied===`pw-${u.id}` ? <Check size={13}/> : <Copy size={13}/>}
              </button>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              <input value={newPw[u.id]||''} onChange={e => setNewPw(p=>({...p,[u.id]:e.target.value}))} placeholder="Nova palavra-passe…"
                style={{ flex:1, padding:'5px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface2)', fontSize:12, fontFamily:'Open Sans,sans-serif', outline:'none', color:'var(--text)' }}
              />
              <button onClick={() => {
                const pw = newPw[u.id] || generatePassword()
                setNewPw(p=>({...p,[u.id]:pw})); resetPassword(u.id, pw); refresh()
              }} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--muted)', fontSize:11, cursor:'pointer', fontFamily:'Open Sans,sans-serif', display:'flex', alignItems:'center', gap:4 }}>
                <RefreshCw size={10}/> {newPw[u.id] ? 'Guardar' : 'Gerar'}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            <button onClick={() => { setUserApproved(u.id, !u.approved); refresh() }} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid', borderColor: u.approved?'var(--border)':'rgba(46,125,82,.4)', background: u.approved?'var(--surface)':'#e8f5ee', color: u.approved?'var(--muted)':'#2e7d52', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif' }}>
              {u.approved ? 'Revogar' : '✓ Aprovar'}
            </button>
            <button onClick={() => copy(emailText('approve',u), `em-ap-${u.id}`)} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--muted)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif', display:'flex', alignItems:'center', gap:4 }}>
              {copied===`em-ap-${u.id}` ? <Check size={10}/> : <Mail size={10}/>} Email aprovação
            </button>
            <button onClick={() => copy(emailText('reset',u,newPw[u.id]), `em-pw-${u.id}`)} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--muted)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif', display:'flex', alignItems:'center', gap:4 }}>
              {copied===`em-pw-${u.id}` ? <Check size={10}/> : <Mail size={10}/>} Email password
            </button>
            {confirm===u.id
              ? <button onClick={() => { deleteUser(u.id); setConfirm(null); refresh() }} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid #f5c6c6', background:'#fdecea', color:'#c62828', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif' }}>Confirmar</button>
              : <button onClick={() => setConfirm(u.supabaseId || u.id)} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--muted)', fontSize:11, cursor:'pointer', fontFamily:'Open Sans,sans-serif', display:'flex', alignItems:'center', gap:4 }}>
                  <Trash2 size={10}/> Eliminar
                </button>
            }
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Info Requests tab ─────────────────────────────────────────────────────
function InfoTab() {
  const [pendingSugg, setPendingSugg] = useState([])
  const [pendingPhotos, setPendingPhotos] = useState([])
  const [expanded, setExpanded] = useState({})

  useEffect(() => { refresh() }, [])

  async function refresh() {
    const suggs = await getAllPendingSuggestions()
    setPendingSugg(suggs)
    setPendingPhotos([]) // photos handled separately
  }

  async function setSuggStatus(locationName, id, status) {
    await setSuggestionStatus(id, status)
    refresh()
  }

// Group pending suggestions by location
  const byLocation = {}
  pendingSugg.forEach(s => {
    if (!byLocation[s.location]) byLocation[s.location] = []
    byLocation[s.location].push(s)
  })

  const totalPending = pendingSugg.length + pendingPhotos.length

  return (
    <div>
      {totalPending === 0 && (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)' }}>
          <div style={{ fontSize:36, marginBottom:10 }}>✅</div>
          <div style={{ fontSize:14 }}>Sem pedidos pendentes</div>
        </div>
      )}

      {/* Pending suggestions */}
      {Object.entries(byLocation).map(([location, suggs]) => (
        <div key={location} style={{ marginBottom:12 }}>
          <button onClick={() => setExpanded(e => ({...e, [location]: !e[location]}))} style={{
            width:'100%', display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
            borderRadius:10, border:'1px solid var(--border)', background:'var(--surface2)',
            cursor:'pointer', fontFamily:'Open Sans,sans-serif',
          }}>
            <MessageSquare size={13} style={{ color:'var(--accent)', flexShrink:0 }}/>
            <span style={{ flex:1, fontWeight:600, fontSize:13, color:'var(--text)', textAlign:'left' }}>{suggs[0]?.displayLocation || suggs[0]?.locationName || location}</span>
            <span style={{ fontSize:11, color:'var(--muted)', background:'var(--accent-bg)', padding:'2px 8px', borderRadius:20, color:'var(--accent)', fontWeight:700 }}>
              {suggs.length} sugestão{suggs.length!==1?'ões':''}
            </span>
            {expanded[location] ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>

          {expanded[location] && (
            <div style={{ marginTop:4, paddingLeft:4 }}>
              {suggs.map(s => {
                const cat = CATS.find(c => c.key === s.category)
                return (
                  <div key={s.id} style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:9, padding:'10px 12px', marginBottom:6, borderLeft:`3px solid ${cat?.color||'var(--muted)'}` }}>
                    <div style={{ display:'flex', gap:8 }}>
                      {s.photo && <img src={s.photo} alt="" style={{ width:48, height:48, borderRadius:7, objectFit:'cover', flexShrink:0 }}/>}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:cat?.color, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:2 }}>{cat?.label} · por {s.author}</div>
                        <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.4 }}>{s.text}</div>
                        {s.date && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>📅 {s.date}</div>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:8 }}>
                      <button onClick={() => setSuggStatus(location, s.id, 'approved')} style={{ padding:'4px 12px', borderRadius:7, border:'1px solid #a5d6a7', background:'#e8f5ee', color:'#2e7d52', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif' }}>✓ Aprovar</button>
                      <button onClick={() => setSuggStatus(location, s.id, 'rejected')} style={{ padding:'4px 12px', borderRadius:7, border:'1px solid #f5c6c6', background:'#fdecea', color:'#c62828', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif' }}>✗ Rejeitar</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}


    </div>
  )
}

// ── Main AdminPage ─────────────────────────────────────────────────────────
export default function AdminPage({ onClose }) {
  const { getAllUsers } = useAuth()
  const [tab, setTab] = useState('users')

  const allUsers   = getAllUsers()
  const pendingUsers = allUsers.filter(u => !u.approved).length
  const pendingSugg  = getAllPendingSuggestions().length
  const pendingPhotos = getAllPendingPhotos().length
  const totalPending = pendingSugg + pendingPhotos

  return (
    <div style={{ position:'fixed', inset:0, zIndex:4000, background:'rgba(28,26,22,.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{ background:'var(--surface)', borderRadius:20, width:'100%', maxWidth:620, border:'1px solid var(--border)', boxShadow:'0 20px 60px rgba(0,0,0,.18)', maxHeight:'92vh', display:'flex', flexDirection:'column', animation:'popIn .25s ease' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1c1a16,#3a3734)', padding:'20px 24px 16px', borderRadius:'20px 20px 0 0', flexShrink:0, display:'flex', alignItems:'center', gap:12 }}>
          <Shield size={18} style={{ color:'var(--accent)' }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:17, color:'#fff' }}>Painel de Administração</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginTop:2 }}>
              {allUsers.length} utilizador{allUsers.length!==1?'es':''} · {pendingUsers} pendente{pendingUsers!==1?'s':''}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, width:30, height:30, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={14}/>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', padding:'12px 24px 0', borderBottom:'1px solid var(--border)', flexShrink:0, gap:4 }}>
          {[
            { key:'users',  label:'Utilizadores', icon:<Users size={13}/>,   badge: pendingUsers },
            { key:'info',   label:'Pedidos de informação', icon:<MessageSquare size={13}/>, badge: totalPending },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:'8px 8px 0 0',
              border:'none', cursor:'pointer', fontFamily:'Open Sans,sans-serif',
              background: tab===t.key ? 'var(--surface)' : 'transparent',
              color: tab===t.key ? 'var(--text)' : 'var(--muted)',
              fontSize:13, fontWeight: tab===t.key ? 600 : 400,
              borderBottom: tab===t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom:'-1px',
            }}>
              {t.icon} {t.label}
              {t.badge > 0 && (
                <span style={{ background:'var(--accent)', color:'#fff', borderRadius:20, padding:'1px 6px', fontSize:10, fontWeight:700 }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 24px 20px' }}>
          {tab === 'users' && <UsersTab/>}
          {tab === 'info'  && <InfoTab/>}
        </div>
      </div>
    </div>
  )
}
