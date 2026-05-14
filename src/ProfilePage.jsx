import { useState, useRef, useEffect } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { ChevronLeft, Camera, Check, Globe, Calendar, Edit3, Eye, EyeOff, Star, Trash2, Home, User, MapPin, TrendingUp, Map, Award } from 'lucide-react'
import idToNameData from './data/idToName.json'
import { getSuggestionsForUser } from './storage'

const TOTAL_MUN = 307, TOTAL_PAR = 2916

const LEVELS = [
  { min:0,   label:'Curioso',         color:'#78736a', bg:'#f5f3f0' },
  { min:5,   label:'Viajante',        color:'#2563eb', bg:'#eff6ff' },
  { min:15,  label:'Explorador',      color:'#16a34a', bg:'#f0fdf4' },
  { min:30,  label:'Aventureiro',     color:'#d97706', bg:'#fffbeb' },
  { min:50,  label:'Grande Viajante', color:'#7c3aed', bg:'#f5f3ff' },
  { min:70,  label:'Conhecedor',      color:'#0f766e', bg:'#f0fdfa' },
  { min:90,  label:'Embaixador',      color:'#e85d3a', bg:'#fff3f0' },
  { min:100, label:'Lenda',           color:'#1a1814', bg:'#f6f4f0' },
]
function getLevel(pct) { return [...LEVELS].reverse().find(l => pct >= l.min) || LEVELS[0] }
function getNextLevel(pct) { return LEVELS.find(l => pct < l.min) || null }

const CATS = [
  { key:'visit', label:'O que visitar', color:'#e85d3a' },
  { key:'food',  label:'Gastronomia',   color:'#2563eb' },
  { key:'sweet', label:'Doçaria',       color:'#7c3aed' },
  { key:'fest',  label:'Festa/Evento',  color:'#16a34a' },
  { key:'other', label:'Outro',         color:'#78736a' },
]
const COUNTRIES = ['Portugal','Brasil','Angola','Moçambique','Cabo Verde','Guiné-Bissau','Espanha','França','Reino Unido','Alemanha','Suíça','Estados Unidos','Canadá','Outro']

// ── Donut chart ──────────────────────────────────────────────────────
function Donut({ pct, color, size=120, strokeW=11 }) {
  const r = (size - strokeW) / 2 - 2
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct / 100, 1) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)', display:'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeW} strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition:'stroke-dasharray .9s cubic-bezier(.4,0,.2,1)' }}/>
    </svg>
  )
}

// ── Explorer tab ─────────────────────────────────────────────────────
function ExplorerTab({ user, visitedMun, visitedPar, idNameMap }) {
  const munCount = visitedMun.size, parCount = visitedPar.size
  const munPct = Math.round(munCount / TOTAL_MUN * 100)
  const parPct = Math.round(parCount / TOTAL_PAR * 100)
  const lvl = getLevel(munPct), nextLvl = getNextLevel(munPct)

  const lastMun = [...visitedMun].slice(-5).reverse().map(id => {
    const val = idNameMap.get(id)
    if (val) return { name: typeof val === 'string' ? val : val?.displayName || val?.name, id }
    return { name: idToNameData[id] || id.replace(/__\d+$/, '').replace(/-/g,' '), id }
  }).filter(x => x.name)

  const lastPar = [...visitedPar].slice(-4).reverse().map(id => {
    const val = idNameMap.get(id)
    if (val) return { name: typeof val === 'string' ? val : val?.displayName || val?.name, id }
    return { name: idToNameData[id] || id.replace(/__\d+$/, '').replace(/-/g,' '), id }
  }).filter(x => x.name)

  return (
    <div style={{ padding:'20px 18px 100px', display:'flex', flexDirection:'column', gap:16 }}>

      {/* Level card */}
      <div style={{ borderRadius:18, overflow:'hidden', background:`linear-gradient(135deg, ${lvl.color}, ${nextLvl?.color || lvl.color})`, padding:'20px', boxShadow:`0 4px 24px ${lvl.color}40` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'1.5px', color:'rgba(255,255,255,.65)', marginBottom:4 }}>Nível atual</div>
            <div style={{ fontSize:24, fontWeight:900, color:'#fff' }}>{lvl.label}</div>
            {nextLvl && <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:2 }}>Próximo: {nextLvl.label} aos {nextLvl.min}%</div>}
          </div>
          <div style={{ position:'relative', width:72, height:72 }}>
            <Donut pct={munPct} color="rgba(255,255,255,.9)" size={72} strokeW={7}/>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:18, fontWeight:900, color:'#fff' }}>{munPct}%</span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height:6, background:'rgba(255,255,255,.25)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${munPct}%`, background:'rgba(255,255,255,.85)', borderRadius:3, transition:'width .8s' }}/>
        </div>
        {nextLvl && (
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
            <span style={{ fontSize:10, color:'rgba(255,255,255,.5)' }}>{munPct}%</span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,.5)' }}>{nextLvl.min}%</span>
          </div>
        )}
      </div>

      {/* Two donuts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {/* Municipalities */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
          <div style={{ position:'relative', width:100, height:100 }}>
            <Donut pct={munPct} color="var(--accent)" size={100} strokeW={9}/>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:20, fontWeight:800, color:'var(--accent)' }}>{munCount}</span>
              <span style={{ fontSize:10, color:'var(--muted)' }}>{munPct}%</span>
            </div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Concelhos</div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>de {TOTAL_MUN}</div>
          </div>
        </div>
        {/* Parishes */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
          <div style={{ position:'relative', width:100, height:100 }}>
            <Donut pct={parPct} color="var(--blue)" size={100} strokeW={9}/>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:20, fontWeight:800, color:'var(--blue)' }}>{parCount}</span>
              <span style={{ fontSize:10, color:'var(--muted)' }}>{parPct}%</span>
            </div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Freguesias</div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>de {TOTAL_PAR}</div>
          </div>
        </div>
      </div>

      {/* All levels roadmap */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'16px' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:12 }}>Caminho do explorador</div>
        {LEVELS.map((l, i) => {
          const reached = munPct >= l.min
          const current = lvl.min === l.min
          return (
            <div key={l.min} style={{ display:'flex', alignItems:'center', gap:10, marginBottom: i < LEVELS.length-1 ? 8 : 0 }}>
              <div style={{ width:28, height:28, borderRadius:8, background: reached ? l.color : 'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background .3s' }}>
                {reached && <Check size={13} color="#fff"/>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight: current ? 700 : 500, color: current ? l.color : reached ? 'var(--text)' : 'var(--muted)' }}>{l.label}</div>
              </div>
              <div style={{ fontSize:11, fontWeight:600, color: reached ? l.color : 'var(--border2)' }}>{l.min}%</div>
            </div>
          )
        })}
      </div>

      {/* Last visited municipalities */}
      {lastMun.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'16px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:10 }}>Últimos concelhos visitados</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {lastMun.map(({ name, id }, i) => (
              <div key={id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:'var(--accent-bg)', border:'1px solid var(--accent-border)' }}>
                <div style={{ width:22, height:22, borderRadius:6, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <MapPin size={11} color="#fff"/>
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:'var(--text)', flex:1 }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last visited parishes */}
      {lastPar.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'16px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:10 }}>Últimas freguesias visitadas</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {lastPar.map(({ name, id }) => (
              <div key={id} style={{ padding:'5px 10px', borderRadius:20, background:'var(--blue-bg)', border:'1px solid rgba(37,99,235,.2)', fontSize:12, fontWeight:500, color:'var(--blue)' }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Profile info tab ─────────────────────────────────────────────────
function ProfileInfoTab({ user, onEditProfile }) {
  const fields = [
    { icon: <User size={15}/>, label:'Username', value: user?.id, color:'var(--accent)' },
    { icon: <div style={{ fontSize:14 }}>✉️</div>, label:'Email', value: user?.email, color:'var(--blue)' },
    { icon: <Globe size={15}/>, label:'País', value: user?.country || '—', color:'var(--purple)' },
    { icon: <Home size={15}/>, label:'Localidade', value: user?.location || '—', color:'var(--amber)' },
    { icon: <Calendar size={15}/>, label:'Membro desde', value: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('pt-PT', { day:'numeric', month:'long', year:'numeric' }) : '—', color:'var(--green)' },
  ]

  return (
    <div style={{ padding:'20px 18px 100px', display:'flex', flexDirection:'column', gap:12 }}>

      {/* Info cards */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        {fields.map((f, i) => (
          <div key={f.label} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderBottom: i < fields.length-1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`${f.color}15`, display:'flex', alignItems:'center', justifyContent:'center', color:f.color, flexShrink:0 }}>
              {f.icon}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:2 }}>{f.label}</div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit button */}
      <button onClick={onEditProfile} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:14, border:'1.5px solid var(--accent-border)', background:'var(--accent-bg)', cursor:'pointer', width:'100%' }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Edit3 size={16} color="#fff"/>
        </div>
        <div style={{ flex:1, textAlign:'left' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--accent)' }}>Editar perfil</div>
          <div style={{ fontSize:12, color:'var(--muted)' }}>Nome, país, localidade, password</div>
        </div>
        <ChevronLeft size={16} style={{ color:'var(--accent)', transform:'rotate(180deg)' }}/>
      </button>
    </div>
  )
}

// ── Favorites tab ────────────────────────────────────────────────────
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

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:48 }}><div style={{ width:24, height:24, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/></div>

  if (favorites.length === 0) return (
    <div style={{ textAlign:'center', padding:'60px 28px', color:'var(--muted)' }}>
      <div style={{ width:56, height:56, borderRadius:16, background:'var(--amber-bg)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
        <Star size={26} color="var(--amber)"/>
      </div>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:6 }}>Nenhum favorito ainda</div>
      <div style={{ fontSize:13, lineHeight:1.7, color:'var(--muted)' }}>Toca numa localidade no mapa e guarda com a estrela para as tuas próximas viagens.</div>
    </div>
  )

  return (
    <div style={{ padding:'16px 18px 100px', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>{favorites.length} localidade{favorites.length!==1?'s':''} guardada{favorites.length!==1?'s':''}</div>
      {favorites.map(f => (
        <div key={f.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderRadius:14, background:'var(--surface)', border:'1px solid var(--border)', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ width:40, height:40, borderRadius:11, background:'var(--amber-bg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'1px solid rgba(217,119,6,.15)' }}>
            <Star size={17} fill="var(--amber)" color="var(--amber)"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
              <span style={{ background: f.level==='parishes'?'var(--blue-bg)':'var(--accent-bg)', color: f.level==='parishes'?'var(--blue)':'var(--accent)', padding:'1px 6px', borderRadius:4, fontWeight:600, marginRight:6 }}>{f.level==='parishes'?'Freguesia':'Concelho'}</span>
              {new Date(f.addedAt).toLocaleDateString('pt-PT')}
            </div>
          </div>
          <button onClick={() => remove(f.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--border2)', padding:8, borderRadius:8, display:'flex', alignItems:'center' }}>
            <Trash2 size={15}/>
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Submissions tab ──────────────────────────────────────────────────
function SubmissionsTab({ userId }) {
  const [submissions, setSubmissions] = useState([])
  useEffect(() => { if (userId) getSuggestionsForUser(userId).then(setSubmissions) }, [userId])

  if (submissions.length === 0) return (
    <div style={{ textAlign:'center', padding:'60px 28px' }}>
      <div style={{ width:56, height:56, borderRadius:16, background:'var(--purple-bg)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
        <TrendingUp size={26} color="var(--purple)"/>
      </div>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:6 }}>Nenhuma sugestão ainda</div>
      <div style={{ fontSize:13, lineHeight:1.7, color:'var(--muted)' }}>Explora o mapa e sugere informação sobre os locais que conheces!</div>
    </div>
  )

  const statusInfo = {
    pending:  { label:'Em análise', bg:'var(--amber-bg)',  color:'var(--amber)',  border:'rgba(217,119,6,.2)' },
    approved: { label:'Aceite',    bg:'var(--green-bg)', color:'var(--green)',  border:'rgba(22,163,74,.2)' },
    rejected: { label:'Recusada', bg:'#fef2f2',          color:'#dc2626',       border:'rgba(220,38,38,.2)' },
  }

  return (
    <div style={{ padding:'16px 18px 100px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>{submissions.length} submissão{submissions.length!==1?'ões':''}</div>
      {submissions.map(s => {
        const cat = CATS.find(c => c.key === s.category) || CATS[4]
        const st  = statusInfo[s.status] || statusInfo.pending
        return (
          <div key={s.id} style={{ background:'var(--surface)', border:`1px solid var(--border)`, borderRadius:14, padding:'13px 14px', borderLeft:`3px solid ${cat.color}` }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              {s.photo && <img src={s.photo} alt="" style={{ width:44, height:44, borderRadius:10, objectFit:'cover', flexShrink:0 }}/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:cat.color, textTransform:'uppercase', letterSpacing:'.5px', background:`${cat.color}15`, padding:'2px 6px', borderRadius:4 }}>{cat.label}</span>
                  <span style={{ fontSize:11, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{s.displayLocation || s.locationName}</span>
                </div>
                <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.5 }}>{s.text}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:5 }}>{new Date(s.createdAt).toLocaleDateString('pt-PT')}</div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, padding:'4px 8px', borderRadius:20, background:st.bg, color:st.color, border:`1px solid ${st.border}`, flexShrink:0, whiteSpace:'nowrap' }}>{st.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Edit profile panel ───────────────────────────────────────────────
function EditProfilePanel({ user, onSaved }) {
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
    await supabase.from('profiles').update({ display_name: displayName, country, location }).eq('id', user.supabaseId)
    if (pw.length >= 4) { await supabase.auth.updateUser({ password: pw }); setPw('') }
    setBusy(false); setSaved(true)
    setTimeout(() => { setSaved(false); onSaved() }, 1500)
  }

  function handlePhoto(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { updatePhoto(ev.target.result); setPhotoSaved(true); setTimeout(() => setPhotoSaved(false), 2000) }
    reader.readAsDataURL(file)
  }

  const InputField = ({ label, value, onChange, placeholder, type='text' }) => {
    const [focus, setFocus] = useState(false)
    return (
      <div style={{ marginBottom:14 }}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:6 }}>{label}</label>
        <div style={{ position:'relative' }}>
          <input
            type={type === 'password' && showPw ? 'text' : type}
            value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            style={{ width:'100%', padding: type==='password'?'13px 44px 13px 14px':'13px 14px', borderRadius:12, border:`1.5px solid ${focus?'var(--accent)':'var(--border)'}`, background:'var(--surface2)', fontSize:14, color:'var(--text)', fontFamily:'var(--font)', outline:'none', transition:'border-color .15s' }}
          />
          {type === 'password' && (
            <button type="button" onClick={() => setShowPw(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', display:'flex', padding:4 }}>
              {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:'20px 18px 100px', display:'flex', flexDirection:'column', gap:0 }}>
      {/* Photo */}
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px', borderRadius:16, background:'var(--surface)', border:'1px solid var(--border)', marginBottom:20 }}>
        <div style={{ width:64, height:64, borderRadius:18, overflow:'hidden', background:'var(--surface2)', border:'2px solid var(--border)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {user?.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:28 }}>👤</span>}
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:6 }}>Foto de perfil</div>
          <button onClick={() => fileRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'1.5px solid var(--accent-border)', background:'var(--accent-bg)', color:'var(--accent)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {photoSaved ? <><Check size={13}/> Guardado!</> : <><Camera size={13}/> Alterar foto</>}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:'none' }}/>
      </div>

      {/* Read-only fields */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
        {[
          { icon:<User size={14}/>, label:'Username', value:user?.id, color:'var(--accent)' },
          { icon:<div style={{fontSize:13}}>✉️</div>, label:'Email', value:user?.email, color:'var(--blue)' },
        ].map((f, i) => (
          <div key={f.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: i===0?'1px solid var(--border)':'none' }}>
            <div style={{ width:32, height:32, borderRadius:9, background:`${f.color}15`, display:'flex', alignItems:'center', justifyContent:'center', color:f.color, flexShrink:0 }}>{f.icon}</div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:1 }}>{f.label}</div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{f.value}</div>
            </div>
            <div style={{ marginLeft:'auto', fontSize:10, color:'var(--border2)', fontStyle:'italic' }}>não editável</div>
          </div>
        ))}
      </div>

      <InputField label="Nome a mostrar" value={displayName} onChange={setDisplayName} placeholder="O teu nome"/>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:6 }}>País de residência</label>
        <select value={country} onChange={e => setCountry(e.target.value)} style={{ width:'100%', padding:'13px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface2)', fontSize:14, color:'var(--text)', fontFamily:'var(--font)', outline:'none', cursor:'pointer' }}>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <InputField label="Localidade" value={location} onChange={setLocation} placeholder="ex: Lisboa, Braga…"/>

      <div style={{ height:1, background:'var(--border)', margin:'8px 0 20px' }}/>

      <InputField label="Nova password" value={pw} onChange={setPw} placeholder="Deixa em branco para manter" type="password"/>
      <div style={{ fontSize:11, color:'var(--muted)', marginTop:-10, marginBottom:20 }}>Mínimo 4 caracteres. Deixa em branco para não alterar.</div>

      <button onClick={save} disabled={busy || saved} style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background: saved?'var(--green)':'var(--accent)', color:'#fff', fontSize:15, fontWeight:700, cursor: busy||saved?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow: saved?'none':'0 4px 20px rgba(15,118,110,.35)', transition:'all .2s' }}>
        {saved ? <><Check size={16}/> Guardado!</> : busy ? 'A guardar…' : 'Guardar alterações'}
      </button>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────
export default function ProfilePage({ visitedMun, visitedPar, idNameMap, level, onClose }) {
  const { user, logout } = useAuth()
  const [tab,     setTab]     = useState('info')
  const [editing, setEditing] = useState(false)

  const TABS = [
    { key:'info',        label:'Perfil',    icon: <User size={15}/> },
    { key:'explorer',    label:'Explorador',icon: <Map size={15}/> },
    { key:'favorites',   label:'Favoritos', icon: <Star size={15}/> },
    { key:'suggestions', label:'Sugestões', icon: <TrendingUp size={15}/> },
  ]

  const munPct = Math.round(visitedMun.size / TOTAL_MUN * 100)
  const lvl = getLevel(munPct)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'var(--bg)', display:'flex', flexDirection:'column', animation:'slideLeft .28s cubic-bezier(.4,0,.2,1)' }}>

      {/* Top bar */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 18px', paddingTop:'var(--safe-top)', display:'flex', alignItems:'center', height:56, flexShrink:0, gap:12 }}>
        <button onClick={onClose} style={{ width:38, height:38, borderRadius:11, border:'1px solid var(--border)', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text)', flexShrink:0 }}>
          <ChevronLeft size={18}/>
        </button>
        <div style={{ fontWeight:700, fontSize:16, flex:1, color:'var(--text)' }}>
          {editing ? 'Editar perfil' : 'O meu perfil'}
        </div>
        {!editing && (
          <button onClick={logout} style={{ fontSize:13, color:'#dc2626', fontWeight:600, background:'none', border:'1px solid rgba(220,38,38,.25)', borderRadius:9, cursor:'pointer', padding:'6px 12px' }}>
            Sair
          </button>
        )}
        {editing && (
          <button onClick={() => setEditing(false)} style={{ fontSize:13, color:'var(--muted)', fontWeight:600, background:'none', border:'1px solid var(--border)', borderRadius:9, cursor:'pointer', padding:'6px 12px' }}>
            Cancelar
          </button>
        )}
      </div>

      {/* Hero */}
      {!editing && (
        <div style={{ background:`linear-gradient(145deg, ${lvl.color} 0%, ${lvl.color}cc 100%)`, padding:'18px 18px 20px', flexShrink:0, position:'relative', overflow:'hidden' }}>
          {/* decorative circle */}
          <div style={{ position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.08)' }}/>
          <div style={{ position:'absolute', right:20, bottom:-20, width:70, height:70, borderRadius:'50%', background:'rgba(255,255,255,.06)' }}/>

          <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative' }}>
            <div style={{ width:58, height:58, borderRadius:17, overflow:'hidden', background:'rgba(255,255,255,.2)', border:'2px solid rgba(255,255,255,.3)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,.2)' }}>
              {user?.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:26 }}>👤</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:19, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'-.3px' }}>
                {user?.displayName || user?.id}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', marginTop:2 }}>@{user?.id}</div>
              <div style={{ display:'flex', gap:12, marginTop:5, flexWrap:'wrap' }}>
                {user?.country && <span style={{ fontSize:11, color:'rgba(255,255,255,.55)', display:'flex', alignItems:'center', gap:3 }}><Globe size={10}/> {user.country}</span>}
                {user?.location && <span style={{ fontSize:11, color:'rgba(255,255,255,.55)', display:'flex', alignItems:'center', gap:3 }}><Home size={10}/> {user.location}</span>}
              </div>
            </div>
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ fontSize:22, fontWeight:900, color:'#fff' }}>{munPct}%</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', fontWeight:600 }}>{lvl.label}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      {!editing && (
        <div style={{ display:'flex', background:'var(--surface)', borderBottom:'1px solid var(--border)', flexShrink:0, overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:'11px 4px 10px', border:'none', borderBottom:`2.5px solid ${tab===t.key?lvl.color:'transparent'}`, background:'transparent', color: tab===t.key?lvl.color:'var(--muted)', fontSize:11, fontWeight: tab===t.key?700:500, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, transition:'all .15s', whiteSpace:'nowrap', minWidth:72 }}>
              <span style={{ opacity: tab===t.key?1:.6 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {editing ? (
          <EditProfilePanel user={user} onSaved={() => setEditing(false)}/>
        ) : (
          <>
            {tab === 'info' && <ProfileInfoTab user={user} onEditProfile={() => setEditing(true)}/>}
            {tab === 'explorer' && <ExplorerTab user={user} visitedMun={visitedMun} visitedPar={visitedPar} idNameMap={idNameMap}/>}
            {tab === 'favorites' && <FavoritesTab user={user}/>}
            {tab === 'suggestions' && <SubmissionsTab userId={user?.id}/>}
          </>
        )}
      </div>
    </div>
  )
}
