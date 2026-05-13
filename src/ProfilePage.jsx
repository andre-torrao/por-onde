import { useState, useRef, useEffect } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { X, MapPin, Camera, Check, Globe, Calendar, Edit3, Eye, EyeOff, Star, Trash2, ChevronLeft, Lock, User, Home } from 'lucide-react'
import idToNameData from './data/idToName.json'
import { getSuggestionsForUser } from './storage'

const TOTAL_MUN = 307, TOTAL_PAR = 2916

const LEVELS = [
  { min:0,   label:'Curioso',         color:'#78736a' },
  { min:5,   label:'Viajante',        color:'#2563eb' },
  { min:15,  label:'Explorador',      color:'#16a34a' },
  { min:30,  label:'Aventureiro',     color:'#d97706' },
  { min:50,  label:'Grande Viajante', color:'#7c3aed' },
  { min:70,  label:'Conhecedor',      color:'#b91c1c' },
  { min:90,  label:'Embaixador',      color:'#d4500a' },
  { min:100, label:'Lenda',           color:'#1a1814' },
]
function getLevel(pct) { return [...LEVELS].reverse().find(l => pct >= l.min) || LEVELS[0] }
function getNextLevel(pct) { return LEVELS.find(l => pct < l.min) || null }

const CATS = [
  { key:'visit', label:'O que visitar', color:'#d4500a' },
  { key:'food',  label:'Gastronomia',   color:'#2563eb' },
  { key:'sweet', label:'Doçaria',       color:'#7c3aed' },
  { key:'fest',  label:'Festa/Evento',  color:'#16a34a' },
  { key:'other', label:'Outro',         color:'#78736a' },
]

const COUNTRIES = ['Portugal','Brasil','Angola','Moçambique','Cabo Verde','Guiné-Bissau','Espanha','França','Reino Unido','Alemanha','Suíça','Estados Unidos','Canadá','Outro']

// Donut chart component
function DonutChart({ pct, color, size = 110 }) {
  const r = 42, cx = size/2, cy = size/2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={10}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition:'stroke-dasharray .8s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  )
}

function StatDonut({ value, total, label, color, icon }) {
  const pct = total > 0 ? Math.round(value / total * 100) : 0
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ position:'relative', width:110, height:110 }}>
        <DonutChart pct={pct} color={color}/>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>{value}</div>
          <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>{pct}%</div>
        </div>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{label}</div>
        <div style={{ fontSize:10, color:'var(--muted)' }}>de {total}</div>
      </div>
    </div>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────
function ProfileTab({ user, visitedMun, visitedPar, idNameMap, onEditProfile }) {
  const munCount = visitedMun.size, parCount = visitedPar.size
  const pct = Math.round(munCount / TOTAL_MUN * 100)
  const lvl = getLevel(pct), nextLvl = getNextLevel(pct)

  const lastVisited = [...visitedMun].slice(-6).reverse().map(id => {
    const val = idNameMap.get(id)
    if (val) return typeof val === 'string' ? val : val?.displayName || val?.name || id
    return idToNameData[id] || id.replace(/__\d+$/, '').replace(/-/g,' ')
  }).filter(Boolean)

  return (
    <div style={{ padding:'20px 18px 100px' }}>
      {/* Level banner */}
      <div style={{ background:`linear-gradient(135deg, ${lvl.color}18, ${lvl.color}08)`, border:`1.5px solid ${lvl.color}30`, borderRadius:16, padding:'16px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:50, height:50, borderRadius:14, background:lvl.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
          {pct === 100 ? '🏆' : pct >= 90 ? '🌟' : pct >= 70 ? '🗺️' : pct >= 50 ? '🧭' : pct >= 30 ? '⛺' : pct >= 15 ? '🌿' : pct >= 5 ? '🚶' : '🔍'}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:16, color:lvl.color }}>{lvl.label}</div>
          {nextLvl && <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Próximo nível: {nextLvl.label} a {nextLvl.min}%</div>}
          <div style={{ marginTop:8, height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${lvl.color},${nextLvl?.color||lvl.color})`, borderRadius:3, transition:'width .8s' }}/>
          </div>
        </div>
        <div style={{ fontSize:24, fontWeight:900, color:lvl.color }}>{pct}%</div>
      </div>

      {/* Donut charts */}
      <div style={{ display:'flex', justifyContent:'space-around', marginBottom:24, padding:'16px 8px', background:'var(--surface)', borderRadius:16, border:'1px solid var(--border)' }}>
        <StatDonut value={munCount} total={TOTAL_MUN} label="Concelhos" color="var(--accent)"/>
        <div style={{ width:1, background:'var(--border)', margin:'8px 0' }}/>
        <StatDonut value={parCount} total={TOTAL_PAR} label="Freguesias" color="var(--blue)"/>
      </div>

      {/* Edit profile button */}
      <button onClick={onEditProfile} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'13px 16px', borderRadius:14, border:'1.5px solid var(--border)', background:'var(--surface)', marginBottom:16, cursor:'pointer' }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent-bg)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent)' }}><Edit3 size={16}/></div>
        <div style={{ flex:1, textAlign:'left' }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>Editar perfil</div>
          <div style={{ fontSize:12, color:'var(--muted)' }}>Nome, país, localidade, password</div>
        </div>
        <ChevronLeft size={16} style={{ color:'var(--muted)', transform:'rotate(180deg)' }}/>
      </button>

      {/* Last visited */}
      {lastVisited.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:10 }}>Últimos visitados</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {lastVisited.map((name,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:'var(--surface)', border:'1px solid var(--border)' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', flexShrink:0 }}/>
                <span style={{ fontSize:13, fontWeight:500, color:'var(--text)', flex:1 }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FavoritesTab({ user }) {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.supabaseId) return
    supabase.from('profiles').select('favorites').eq('id', user.supabaseId).single()
      .then(({ data }) => { setFavorites(data?.favorites || []); setLoading(false) })
  }, [user?.supabaseId])

  async function remove(id) {
    const next = favorites.filter(f => f.id !== id)
    setFavorites(next)
    await supabase.from('profiles').update({ favorites: next }).eq('id', user.supabaseId)
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div style={{ width:24, height:24, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/></div>

  if (favorites.length === 0) return (
    <div style={{ textAlign:'center', padding:'50px 24px', color:'var(--muted)' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>⭐</div>
      <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:6 }}>Nenhum favorito ainda</div>
      <div style={{ fontSize:13, lineHeight:1.6 }}>Toca numa localidade no mapa e guarda com ⭐ para as próximas viagens.</div>
    </div>
  )

  return (
    <div style={{ padding:'16px 18px 100px' }}>
      <div style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>{favorites.length} localidade{favorites.length!==1?'s':''} guardada{favorites.length!==1?'s':''}</div>
      {favorites.map(f => (
        <div key={f.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderRadius:14, marginBottom:8, background:'var(--surface)', border:'1px solid var(--border)', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Star size={16} fill="#f59e0b" color="#f59e0b"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
              {f.level === 'parishes' ? 'Freguesia' : 'Concelho'} · {new Date(f.addedAt).toLocaleDateString('pt-PT')}
            </div>
          </div>
          <button onClick={() => remove(f.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--border2)', padding:8, borderRadius:8, display:'flex' }}>
            <Trash2 size={15}/>
          </button>
        </div>
      ))}
    </div>
  )
}

function SubmissionsTab({ userId }) {
  const [submissions, setSubmissions] = useState([])
  useEffect(() => { if (userId) getSuggestionsForUser(userId).then(setSubmissions) }, [userId])

  if (submissions.length === 0) return (
    <div style={{ textAlign:'center', padding:'50px 24px', color:'var(--muted)' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>💡</div>
      <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:6 }}>Nenhuma sugestão ainda</div>
      <div style={{ fontSize:13, lineHeight:1.6 }}>Explora o mapa e sugere informação sobre os locais que conheces!</div>
    </div>
  )

  const statusInfo = {
    pending:  { label:'Em análise', bg:'#fff8e1', color:'#d97706', border:'#fde68a' },
    approved: { label:'Aceite',    bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0' },
    rejected: { label:'Recusada', bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
  }

  return (
    <div style={{ padding:'16px 18px 100px' }}>
      <div style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>{submissions.length} submissão{submissions.length!==1?'ões':''}</div>
      {submissions.map(s => {
        const cat = CATS.find(c => c.key === s.category) || CATS[4]
        const st  = statusInfo[s.status] || statusInfo.pending
        return (
          <div key={s.id} style={{ background:'var(--surface)', border:`1px solid var(--border)`, borderRadius:14, padding:'13px', marginBottom:10, borderLeft:`3px solid ${cat.color}` }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              {s.photo && <img src={s.photo} alt="" style={{ width:44, height:44, borderRadius:10, objectFit:'cover', flexShrink:0 }}/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:cat.color, textTransform:'uppercase', letterSpacing:'.5px' }}>{cat.label}</span>
                  <span style={{ fontSize:10, color:'var(--muted)' }}>· {s.displayLocation || s.locationName}</span>
                </div>
                <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.5 }}>{s.text}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{new Date(s.createdAt).toLocaleDateString('pt-PT')}</div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, padding:'4px 9px', borderRadius:20, background:st.bg, color:st.color, border:`1px solid ${st.border}`, flexShrink:0, whiteSpace:'nowrap' }}>{st.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EditProfilePanel({ user, onBack, onSaved }) {
  const { updatePhoto } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || user?.id || '')
  const [country, setCountry]         = useState(user?.country || 'Portugal')
  const [location, setLocation]       = useState(user?.location || '')
  const [showPw, setShowPw]           = useState(false)
  const [pw, setPw]                   = useState('')
  const [busy, setBusy]               = useState(false)
  const [saved, setSaved]             = useState(false)
  const [photoSaved, setPhotoSaved]   = useState(false)
  const fileRef = useRef(null)

  async function save() {
    setBusy(true)
    const updates = { display_name: displayName, country, location }
    await supabase.from('profiles').update(updates).eq('id', user.supabaseId)
    if (pw.length >= 4) {
      await supabase.auth.updateUser({ password: pw })
      setPw('')
    }
    setBusy(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); onSaved() }, 1500)
  }

  function handlePhoto(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { updatePhoto(ev.target.result); setPhotoSaved(true); setTimeout(() => setPhotoSaved(false), 2000) }
    reader.readAsDataURL(file)
  }

  const Field = ({ label, value, onChange, placeholder, type='text', note }) => (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:6 }}>{label}</label>
      {note && <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{note}</div>}
      <div style={{ position:'relative' }}>
        <input type={type === 'password' && showPw ? 'text' : type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width:'100%', padding: type==='password' ? '12px 42px 12px 14px' : '12px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface2)', fontSize:14, color:'var(--text)', fontFamily:'var(--font)', outline:'none' }}
          onFocus={e => e.target.style.borderColor='var(--accent)'}
          onBlur={e => e.target.style.borderColor='var(--border)'}
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShowPw(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', display:'flex' }}>
            {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ padding:'20px 18px 100px' }}>
      {/* Photo */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24, padding:'16px', borderRadius:16, background:'var(--surface)', border:'1px solid var(--border)' }}>
        <div style={{ width:64, height:64, borderRadius:18, overflow:'hidden', background:'var(--accent-bg)', border:'2px solid var(--border)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {user?.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:28 }}>👤</span>}
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Foto de perfil</div>
          <button onClick={() => fileRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:'1.5px solid var(--accent)', background:'var(--accent-bg)', color:'var(--accent)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            {photoSaved ? <><Check size={13}/> Guardado!</> : <><Camera size={13}/> Alterar foto</>}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:'none' }}/>
      </div>

      {/* Read-only info */}
      <div style={{ marginBottom:16, padding:'13px 16px', borderRadius:14, background:'var(--surface2)', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <User size={14} style={{ color:'var(--muted)', flexShrink:0 }}/>
          <div>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:1 }}>Username</div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{user?.id}</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom:16, padding:'13px 16px', borderRadius:14, background:'var(--surface2)', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ fontSize:14 }}>✉️</div>
          <div>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:1 }}>Email</div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <Field label="Nome a mostrar" value={displayName} onChange={setDisplayName} placeholder="O teu nome"/>

      <div style={{ marginBottom:16 }}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:6 }}>País de residência</label>
        <select value={country} onChange={e => setCountry(e.target.value)} style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface2)', fontSize:14, color:'var(--text)', fontFamily:'var(--font)', outline:'none', cursor:'pointer' }}>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <Field label="Localidade" value={location} onChange={setLocation} placeholder="ex: Lisboa, Porto…"/>

      <div style={{ height:1, background:'var(--border)', margin:'20px 0' }}/>

      <Field label="Nova password" value={pw} onChange={setPw} placeholder="Deixa em branco para manter" type="password" note="Mínimo 4 caracteres"/>

      <button onClick={save} disabled={busy || saved} style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background: saved ? 'var(--green)' : 'var(--accent)', color:'#fff', fontSize:15, fontWeight:700, cursor: busy ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:8 }}>
        {saved ? <><Check size={16}/> Guardado!</> : busy ? 'A guardar…' : 'Guardar alterações'}
      </button>
    </div>
  )
}

// ── Main ProfilePage ──────────────────────────────────────────────────
export default function ProfilePage({ visitedMun, visitedPar, idNameMap, level, onClose }) {
  const { user, logout } = useAuth()
  const [tab,     setTab]     = useState('profile')
  const [editing, setEditing] = useState(false)

  const TABS = [
    { key:'profile',     label:'Perfil',      icon:'👤' },
    { key:'favorites',   label:'Favoritos',   icon:'⭐' },
    { key:'submissions', label:'Sugestões',   icon:'💡' },
  ]

  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'var(--bg)', display:'flex', flexDirection:'column', animation:'slideLeft .28s cubic-bezier(.4,0,.2,1)' }}>

      {/* ── Top bar ── */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 18px', paddingTop:'var(--safe-top)', display:'flex', alignItems:'center', height:56, flexShrink:0, gap:12 }}>
        <button onClick={onClose} style={{ width:38, height:38, borderRadius:11, border:'1px solid var(--border)', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text)' }}>
          <ChevronLeft size={18}/>
        </button>
        <div style={{ fontWeight:700, fontSize:16, flex:1 }}>
          {editing ? 'Editar perfil' : 'O meu perfil'}
        </div>
        {!editing && (
          <button onClick={logout} style={{ fontSize:12, color:'#dc2626', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:'6px 10px' }}>
            Sair
          </button>
        )}
        {editing && (
          <button onClick={() => setEditing(false)} style={{ fontSize:12, color:'var(--muted)', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:'6px 10px' }}>
            Cancelar
          </button>
        )}
      </div>

      {/* ── Profile hero ── */}
      {!editing && (
        <div style={{ background:`linear-gradient(160deg, #1c1a16 0%, #3a3530 100%)`, padding:'20px 18px 24px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:60, height:60, borderRadius:18, overflow:'hidden', background:'rgba(255,255,255,.15)', border:'2px solid rgba(255,255,255,.25)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {user?.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:26 }}>👤</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:18, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.displayName || user?.id}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.55)', marginTop:2 }}>@{user?.id}</div>
              <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap' }}>
                {user?.country && <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center', gap:3 }}><Globe size={10}/> {user.country}</span>}
                {user?.location && <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center', gap:3 }}><Home size={10}/> {user.location}</span>}
                {user?.joinedAt && <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center', gap:3 }}><Calendar size={10}/> {new Date(user.joinedAt).toLocaleDateString('pt-PT',{month:'short',year:'numeric'})}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab bar ── */}
      {!editing && (
        <div style={{ display:'flex', background:'var(--surface)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:'12px 6px', border:'none', borderBottom:`2.5px solid ${tab===t.key?'var(--accent)':'transparent'}`, background:'transparent', color: tab===t.key?'var(--accent)':'var(--muted)', fontSize:12, fontWeight: tab===t.key?700:400, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, transition:'all .15s' }}>
              <span style={{ fontSize:16 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {editing ? (
          <EditProfilePanel user={user} onBack={() => setEditing(false)} onSaved={() => setEditing(false)}/>
        ) : (
          <>
            {tab === 'profile' && <ProfileTab user={user} visitedMun={visitedMun} visitedPar={visitedPar} idNameMap={idNameMap} onEditProfile={() => setEditing(true)}/>}
            {tab === 'favorites' && <FavoritesTab user={user}/>}
            {tab === 'submissions' && <SubmissionsTab userId={user?.id}/>}
          </>
        )}
      </div>
    </div>
  )
}
