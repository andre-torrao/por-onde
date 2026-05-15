import { useState, useRef, useEffect } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import {
  ChevronLeft, Camera, Check, Globe, Calendar, Edit3,
  Eye, EyeOff, Star, Trash2, Home, User, MapPin,
  TrendingUp, Lock, Palette,
} from 'lucide-react'
import idToNameData from './data/idToName.json'
import { getSuggestionsForUser } from './storage'

const TOTAL_MUN = 307, TOTAL_PAR = 2916

const LEVELS = [
  { min:0,   label:'Curioso',         color:'#6b7694', bg:'#f0f4ff' },
  { min:5,   label:'Viajante',        color:'#4ea8de', bg:'#eef7ff' },
  { min:15,  label:'Explorador',      color:'#43c59e', bg:'#edfdf7' },
  { min:30,  label:'Aventureiro',     color:'#f9a825', bg:'#fff8e1' },
  { min:50,  label:'Grande Viajante', color:'#9b72cf', bg:'#f5f0ff' },
  { min:70,  label:'Conhecedor',      color:'#6c63ff', bg:'#f0efff' },
  { min:90,  label:'Embaixador',      color:'#ff6b6b', bg:'#fff1f1' },
  { min:100, label:'Lenda',           color:'#16141a', bg:'#f0f4ff' },
]
function getLevel(pct)    { return [...LEVELS].reverse().find(l => pct >= l.min) || LEVELS[0] }
function getNextLevel(pct){ return LEVELS.find(l => pct < l.min) || null }

const CATS = [
  { key:'visit', label:'O que visitar', color:'#ff6b6b' },
  { key:'food',  label:'Gastronomia',   color:'#4ea8de' },
  { key:'sweet', label:'Doçaria',       color:'#9b72cf' },
  { key:'fest',  label:'Festa/Evento',  color:'#43c59e' },
  { key:'other', label:'Outro',         color:'#6b7694' },
]
const MARK_COLORS = [
  { hex:'#6c63ff', label:'Violeta'  },
  { hex:'#ff6b6b', label:'Coral'    },
  { hex:'#43c59e', label:'Verde'    },
  { hex:'#f9a825', label:'Âmbar'    },
  { hex:'#4ea8de', label:'Azul'     },
  { hex:'#f06292', label:'Rosa'     },
]
const COUNTRIES = ['Portugal','Brasil','Angola','Moçambique','Cabo Verde','Guiné-Bissau','Espanha','França','Reino Unido','Alemanha','Suíça','Estados Unidos','Canadá','Outro']

// ── Segmented ring chart ─────────────────────────────────────────────
function RingChart({ pct, color, size=190 }) {
  const segments = 40
  const filled   = Math.round(pct / 100 * segments)
  const r = 68, cx = size/2, cy = size/2
  const gap = 4, segA = (360 - segments * gap) / segments

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: segments }).map((_, i) => {
        const s = (i * (segA + gap) - 90) * Math.PI / 180
        const e = (i * (segA + gap) - 90 + segA) * Math.PI / 180
        const x1=cx+r*Math.cos(s), y1=cy+r*Math.sin(s)
        const x2=cx+r*Math.cos(e), y2=cy+r*Math.sin(e)
        const isF = i < filled
        return (
          <path key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
            fill={isF ? color : '#dce4f0'}
            opacity={isF ? (0.45 + (i/Math.max(filled,1))*0.55) : 1}
            style={{ transition:'fill .4s' }}
          />
        )
      })}
      <circle cx={cx} cy={cy} r={r-20} fill="white"/>
    </svg>
  )
}

// ── Color picker ─────────────────────────────────────────────────────
function ColorPicker() {
  const { user, updateProfile } = useAuth()
  const current = user?.markColor || '#6c63ff'
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'14px 16px', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:'var(--accent-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Palette size={15} color="var(--accent)"/>
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Cor das localidades visitadas</span>
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'space-between' }}>
        {MARK_COLORS.map(({ hex, label }) => (
          <button key={hex} onClick={() => updateProfile({ markColor: hex })} title={label} style={{
            width:42, height:42, borderRadius:12, background:hex, border:'none',
            cursor:'pointer', position:'relative', flexShrink:0,
            transform: current===hex ? 'scale(1.18)' : 'scale(1)',
            boxShadow: current===hex ? `0 0 0 3px white, 0 0 0 5px ${hex}` : `0 2px 8px ${hex}50`,
            transition:'all .18s',
          }}>
            {current===hex && <Check size={15} color="#fff" style={{ position:'absolute', inset:0, margin:'auto' }}/>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Explorer tab ─────────────────────────────────────────────────────
function ExplorerTab({ visitedMun, visitedPar, idNameMap }) {
  const [sub, setSub] = useState('municipalities')
  const munCount = visitedMun.size, parCount = visitedPar.size
  const munPct = Math.round(munCount / TOTAL_MUN * 100)
  const parPct = Math.round(parCount / TOTAL_PAR * 100)

  const isMun   = sub === 'municipalities'
  const count   = isMun ? munCount : parCount
  const total   = isMun ? TOTAL_MUN : TOTAL_PAR
  const pct     = isMun ? munPct : parPct
  const color   = isMun ? '#6c63ff' : '#4ea8de'
  const bgColor = isMun ? '#f0efff' : '#eef7ff'
  const lvl     = getLevel(munPct)
  const nextLvl = getNextLevel(munPct)

  const lastIds    = [...(isMun ? visitedMun : visitedPar)].slice(-8).reverse()
  const lastVisited = lastIds.map(id => {
    const val = idNameMap.get(id)
    if (val) return { name: typeof val === 'string' ? val : val?.displayName || val?.name, id }
    return { name: idToNameData[id] || id.replace(/__\d+$/, '').replace(/-/g,' '), id }
  }).filter(x => x.name)

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      {/* Sub-tab buttons — card style */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        {[
          { key:'municipalities', label:'Concelhos',  count:munCount, total:TOTAL_MUN, pct:munPct, color:'#6c63ff', bg:'#f0efff' },
          { key:'parishes',       label:'Freguesias', count:parCount, total:TOTAL_PAR, pct:parPct, color:'#4ea8de', bg:'#eef7ff' },
        ].map(t => (
          <button key={t.key} onClick={() => setSub(t.key)} style={{
            padding:'14px 12px', borderRadius:16, border:'2px solid',
            borderColor: sub===t.key ? t.color : 'var(--border)',
            background: sub===t.key ? t.bg : 'var(--surface)',
            cursor:'pointer', transition:'all .18s', textAlign:'left',
            boxShadow: sub===t.key ? `0 4px 16px ${t.color}25` : 'none',
          }}>
            <div style={{ fontSize:26, fontWeight:900, color: sub===t.key ? t.color : 'var(--muted)', lineHeight:1 }}>{t.count}</div>
            <div style={{ fontSize:12, fontWeight:700, color: sub===t.key ? t.color : 'var(--muted)', marginTop:3 }}>{t.label}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>de {t.total} · {t.pct}%</div>
          </button>
        ))}
      </div>

      {/* Ring chart */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:'20px 16px 16px', marginBottom:14, display:'flex', flexDirection:'column', alignItems:'center', boxShadow:'0 4px 20px rgba(108,99,255,.08)' }}>
        <div style={{ position:'relative', width:190, height:190 }}>
          <RingChart pct={pct} color={color} size={190}/>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontSize:40, fontWeight:900, color, lineHeight:1 }}>{pct}%</div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginTop:3 }}>{isMun ? 'concelhos' : 'freguesias'}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{count} de {total}</div>
          </div>
        </div>
        {/* Level badge */}
        <div style={{ marginTop:8, display:'inline-flex', alignItems:'center', gap:8, padding:'7px 16px', borderRadius:20, background:lvl.bg, border:`1.5px solid ${lvl.color}30` }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:lvl.color, flexShrink:0 }}/>
          <span style={{ fontSize:13, fontWeight:700, color:lvl.color }}>{lvl.label}</span>
          {nextLvl && <span style={{ fontSize:11, color:'var(--muted)' }}>→ {nextLvl.label} ({nextLvl.min}%)</span>}
        </div>
        {/* Progress bar */}
        <div style={{ width:'100%', marginTop:12, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${color},${nextLvl?.color||color})`, borderRadius:3, transition:'width .8s' }}/>
        </div>
      </div>

      {/* Last visited */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'14px', boxShadow:'0 2px 12px rgba(108,99,255,.06)' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.2px', color:'var(--muted)', marginBottom:12 }}>
          Últim{isMun ? 'os concelhos' : 'as freguesias'} visitad{isMun ? 'os' : 'as'}
        </div>
        {lastVisited.length === 0 ? (
          <div style={{ fontSize:13, color:'var(--muted)', fontStyle:'italic' }}>
            Ainda nenhum{isMun ? '' : 'a'} visitad{isMun ? 'o' : 'a'}. Abre o mapa e começa a explorar!
          </div>
        ) : (
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {lastVisited.map(({ name, id }) => (
              <div key={id} style={{ padding:'6px 12px', borderRadius:20, background:bgColor, border:`1px solid ${color}30`, fontSize:12, fontWeight:600, color }}>
                {name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Profile info tab ─────────────────────────────────────────────────
function ProfileInfoTab({ user, onEditProfile }) {
  const infoCards = [
    { label:'Username',      value:user?.id,            color:'#6c63ff', bg:'#f0efff' },
    { label:'Nome',          value:user?.displayName||'—', color:'#9b72cf', bg:'#f5f0ff' },
    { label:'Email',         value:user?.email,         color:'#4ea8de', bg:'#eef7ff' },
    { label:'País',          value:user?.country||'—',  color:'#f9a825', bg:'#fff8e1' },
    { label:'Localidade',    value:user?.location||'—', color:'#ff6b6b', bg:'#fff1f1' },
    { label:'Membro desde',  value:user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('pt-PT',{day:'numeric',month:'long',year:'numeric'}) : '—', color:'#43c59e', bg:'#edfdf7' },
  ]

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      {/* Info cards — 2 col grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        {infoCards.map(f => (
          <div key={f.label} style={{ background:'var(--surface)', border:`1px solid ${f.color}25`, borderRadius:16, padding:'13px 14px', borderTop:`3px solid ${f.color}`, boxShadow:`0 2px 12px ${f.color}12` }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:f.color, marginBottom:5 }}>{f.label}</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.value}</div>
          </div>
        ))}
      </div>

      {/* Color picker */}
      <ColorPicker/>

      {/* Edit button */}
      <button onClick={onEditProfile} style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderRadius:14, border:'none', background:'var(--accent)', cursor:'pointer', width:'100%', boxShadow:'0 4px 16px rgba(108,99,255,.35)' }}>
        <Edit3 size={15} color="#fff"/>
        <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>Editar perfil</span>
        <ChevronLeft size={14} color="rgba(255,255,255,.7)" style={{ transform:'rotate(180deg)', marginLeft:'auto' }}/>
      </button>
    </div>
  )
}

// ── Favorites tab ────────────────────────────────────────────────────
function FavoritesTab({ user }) {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user?.supabaseId) return
    supabase.from('profiles').select('favorites').eq('id', user.supabaseId).single()
      .then(({ data }) => { setFavorites(data?.favorites||[]); setLoading(false) })
  }, [user?.supabaseId])

  async function remove(id) {
    const next = favorites.filter(f => f.id !== id)
    setFavorites(next)
    await supabase.from('profiles').update({ favorites: next }).eq('id', user.supabaseId)
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
      <div style={{ width:24, height:24, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
    </div>
  )

  if (favorites.length === 0) return (
    <div style={{ textAlign:'center', padding:'60px 28px' }}>
      <div style={{ width:64, height:64, borderRadius:18, background:'#fff8e1', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', border:'1px solid rgba(249,168,37,.25)', boxShadow:'0 4px 16px rgba(249,168,37,.15)' }}>
        <Star size={28} color="#f9a825"/>
      </div>
      <div style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Nenhum favorito ainda</div>
      <div style={{ fontSize:13, lineHeight:1.7, color:'var(--muted)' }}>Toca na estrela numa localidade para guardar para as próximas viagens.</div>
    </div>
  )

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ fontSize:12, color:'var(--muted)', marginBottom:12 }}>{favorites.length} localidade{favorites.length!==1?'s':''} guardada{favorites.length!==1?'s':''}</div>
      {favorites.map(f => {
        const isMun = f.level !== 'parishes'
        return (
          <div key={f.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderRadius:16, marginBottom:8, background:'var(--surface)', border:'1px solid var(--border)', boxShadow:'0 2px 8px rgba(108,99,255,.05)' }}>
            <div style={{ width:42, height:42, borderRadius:12, background:'#fff8e1', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Star size={18} fill="#f9a825" color="#f9a825"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:3, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ background:isMun?'#f0efff':'#eef7ff', color:isMun?'#6c63ff':'#4ea8de', padding:'2px 8px', borderRadius:6, fontWeight:700, fontSize:10 }}>
                  {isMun?'Concelho':'Freguesia'}
                </span>
                {new Date(f.addedAt).toLocaleDateString('pt-PT')}
              </div>
            </div>
            <button onClick={() => remove(f.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--border2)', padding:8, borderRadius:8, display:'flex' }}>
              <Trash2 size={15}/>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Submissions tab ──────────────────────────────────────────────────
function SubmissionsTab({ userId }) {
  const [submissions, setSubmissions] = useState([])
  useEffect(() => { if (userId) getSuggestionsForUser(userId).then(setSubmissions) }, [userId])

  if (submissions.length === 0) return (
    <div style={{ textAlign:'center', padding:'60px 28px' }}>
      <div style={{ width:64, height:64, borderRadius:18, background:'#f5f0ff', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', border:'1px solid rgba(155,114,207,.25)', boxShadow:'0 4px 16px rgba(155,114,207,.12)' }}>
        <TrendingUp size={28} color="#9b72cf"/>
      </div>
      <div style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Nenhuma sugestão ainda</div>
      <div style={{ fontSize:13, lineHeight:1.7, color:'var(--muted)' }}>Explora o mapa e sugere informação sobre os locais que conheces.</div>
    </div>
  )

  const statusInfo = {
    pending:  { label:'Em análise', bg:'#fff8e1', color:'#f9a825', border:'rgba(249,168,37,.25)' },
    approved: { label:'Aceite',    bg:'#edfdf7', color:'#43c59e', border:'rgba(67,197,158,.25)' },
    rejected: { label:'Recusada', bg:'#fff1f1', color:'#ff6b6b', border:'rgba(255,107,107,.25)' },
  }

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ fontSize:12, color:'var(--muted)', marginBottom:12 }}>{submissions.length} submissão{submissions.length!==1?'ões':''}</div>
      {submissions.map(s => {
        const cat = CATS.find(c => c.key === s.category) || CATS[4]
        const st  = statusInfo[s.status] || statusInfo.pending
        return (
          <div key={s.id} style={{ background:'var(--surface)', border:`1px solid var(--border)`, borderRadius:16, padding:'13px 14px', marginBottom:10, borderLeft:`3px solid ${cat.color}`, boxShadow:'0 2px 8px rgba(108,99,255,.05)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              {s.photo && <img src={s.photo} alt="" style={{ width:44, height:44, borderRadius:10, objectFit:'cover', flexShrink:0 }}/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:cat.color, textTransform:'uppercase', letterSpacing:'.5px', background:`${cat.color}15`, padding:'2px 7px', borderRadius:5 }}>{cat.label}</span>
                  <span style={{ fontSize:11, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:130 }}>{s.displayLocation||s.locationName}</span>
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

// ── Edit profile panel ───────────────────────────────────────────────
function EditProfilePanel({ user, onSaved }) {
  const { updatePhoto, updateProfile } = useAuth()
  const [fields, setFields] = useState({
    displayName: user?.displayName || user?.id || '',
    fullName:    user?.fullName || '',
    country:     user?.country || 'Portugal',
    location:    user?.location || '',
    pw:          '',
  })
  const [showPw, setShowPw]         = useState(false)
  const [busy, setBusy]             = useState(false)
  const [saved, setSaved]           = useState(false)
  const [photoSaved, setPhotoSaved] = useState(false)
  const fileRef = useRef(null)

  function set(key) { return val => setFields(prev => ({ ...prev, [key]: val })) }

  async function save() {
    setBusy(true)
    await updateProfile({ displayName:fields.displayName, fullName:fields.fullName, country:fields.country, location:fields.location })
    if (fields.pw.length >= 4) await supabase.auth.updateUser({ password: fields.pw })
    setBusy(false); setSaved(true)
    setTimeout(() => { setSaved(false); onSaved() }, 800)
  }

  function handlePhoto(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { updatePhoto(ev.target.result); setPhotoSaved(true); setTimeout(() => setPhotoSaved(false), 2000) }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      {/* Photo */}
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:16, background:'var(--surface)', border:'1px solid var(--border)', marginBottom:16, boxShadow:'0 2px 8px rgba(108,99,255,.06)' }}>
        <div style={{ width:60, height:60, borderRadius:16, overflow:'hidden', background:'var(--surface2)', border:'2px solid var(--border)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {user?.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:26 }}>👤</span>}
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:6 }}>Foto de perfil</div>
          <button onClick={() => fileRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:9, border:'1.5px solid var(--accent-border)', background:'var(--accent-bg)', color:'var(--accent)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            {photoSaved ? <><Check size={12}/> Guardado!</> : <><Camera size={12}/> Alterar foto</>}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:'none' }}/>
      </div>

      {/* Read-only */}
      <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:16 }}>
        {[{ label:'Username', value:user?.id },{ label:'Email', value:user?.email }].map((f,i) => (
          <div key={f.label} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderBottom:i===0?'1px solid var(--border)':'none' }}>
            <Lock size={13} style={{ color:'var(--border2)', flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px' }}>{f.label}</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{f.value}</div>
            </div>
            <span style={{ fontSize:10, color:'var(--border2)', fontStyle:'italic' }}>não editável</span>
          </div>
        ))}
      </div>

      {/* Editable — use defaultValue+onBlur to avoid cursor jump */}
      {[
        { key:'displayName', label:'Nome a mostrar', placeholder:'O teu nome de utilizador' },
        { key:'fullName',    label:'Nome completo',  placeholder:'ex: João Pedro Silva' },
        { key:'location',    label:'Localidade',     placeholder:'ex: Lisboa, Braga…' },
      ].map(f => (
        <div key={f.key} style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:5 }}>{f.label}</label>
          <input defaultValue={fields[f.key]} onBlur={e => set(f.key)(e.target.value)} placeholder={f.placeholder}
            style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:14, color:'var(--text)', fontFamily:'var(--font)', outline:'none' }}
            onFocus={e => e.target.style.borderColor='var(--accent)'}
            onBlur={e => { e.target.style.borderColor='var(--border)'; set(f.key)(e.target.value) }}
          />
        </div>
      ))}

      <div style={{ marginBottom:12 }}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:5 }}>País</label>
        <select defaultValue={fields.country} onBlur={e => set('country')(e.target.value)}
          style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:14, color:'var(--text)', fontFamily:'var(--font)', outline:'none', cursor:'pointer' }}>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ height:1, background:'var(--border)', margin:'16px 0' }}/>

      <div style={{ marginBottom:6 }}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:5 }}>Nova password</label>
        <div style={{ position:'relative' }}>
          <input type={showPw?'text':'password'} defaultValue={fields.pw} onBlur={e => set('pw')(e.target.value)}
            placeholder="Deixa em branco para não alterar"
            style={{ width:'100%', padding:'12px 44px 12px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:14, color:'var(--text)', fontFamily:'var(--font)', outline:'none' }}
            onFocus={e => e.target.style.borderColor='var(--accent)'}
          />
          <button type="button" onClick={() => setShowPw(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', display:'flex', padding:4 }}>
            {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        </div>
        <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Mínimo 4 caracteres.</div>
      </div>

      <button onClick={save} disabled={busy||saved} style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', background:saved?'#43c59e':'var(--accent)', color:'#fff', fontSize:14, fontWeight:700, cursor:busy||saved?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:20, boxShadow:saved?'none':'0 4px 20px rgba(108,99,255,.35)' }}>
        {saved ? <><Check size={15}/> Guardado!</> : busy ? 'A guardar…' : 'Guardar alterações'}
      </button>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────
export default function ProfilePage({ visitedMun, visitedPar, idNameMap, level, onClose }) {
  const { user, logout } = useAuth()
  const [tab,     setTab]     = useState('explorer')
  const [editing, setEditing] = useState(false)

  const munPct = Math.round((visitedMun?.size||0) / TOTAL_MUN * 100)
  const lvl    = getLevel(munPct)

  const TABS = [
    { key:'explorer',    label:'Explorador'    },
    { key:'favorites',   label:'Favoritos'     },
    { key:'suggestions', label:'Sugestões'     },
    { key:'info',        label:'O Meu Perfil'  },
  ]

  if (!user) return null

  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'var(--bg)', display:'flex', flexDirection:'column', animation:'slideLeft .28s cubic-bezier(.4,0,.2,1)' }}>

      {/* Top bar */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 16px', paddingTop:'var(--safe-top)', display:'flex', alignItems:'center', height:54, flexShrink:0, gap:10, boxShadow:'0 1px 8px rgba(108,99,255,.08)' }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:10, border:'1px solid var(--border)', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text)', flexShrink:0 }}>
          <ChevronLeft size={17}/>
        </button>
        <div style={{ fontWeight:700, fontSize:15, flex:1 }}>{editing ? 'Editar perfil' : 'O meu perfil'}</div>
        {!editing
          ? <button onClick={logout} style={{ fontSize:12, color:'#ff6b6b', fontWeight:700, background:'#fff1f1', border:'1px solid rgba(255,107,107,.25)', borderRadius:9, cursor:'pointer', padding:'6px 12px' }}>Sair</button>
          : <button onClick={() => setEditing(false)} style={{ fontSize:12, color:'var(--muted)', fontWeight:600, background:'none', border:'1px solid var(--border)', borderRadius:9, cursor:'pointer', padding:'6px 12px' }}>Cancelar</button>
        }
      </div>

      {/* Hero */}
      {!editing && (
        <div style={{ background:`linear-gradient(140deg, ${lvl.color} 0%, ${lvl.color}bb 100%)`, padding:'18px 16px 20px', flexShrink:0, position:'relative', overflow:'hidden', boxShadow:`0 4px 20px ${lvl.color}40` }}>
          <div style={{ position:'absolute', right:-30, top:-30, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,.1)' }}/>
          <div style={{ position:'absolute', right:20, bottom:-20, width:65, height:65, borderRadius:'50%', background:'rgba(255,255,255,.07)' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative' }}>
            <div style={{ width:56, height:56, borderRadius:16, overflow:'hidden', background:'rgba(255,255,255,.2)', border:'2px solid rgba(255,255,255,.35)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,0,0,.15)' }}>
              {user.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:24 }}>👤</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:18, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.displayName || user.id}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:1 }}>@{user.id}</div>
              <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap' }}>
                {user.country  && <span style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'flex', alignItems:'center', gap:3 }}><Globe size={10}/> {user.country}</span>}
                {user.location && <span style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'flex', alignItems:'center', gap:3 }}><Home size={10}/> {user.location}</span>}
              </div>
            </div>
            <div style={{ textAlign:'center', flexShrink:0, background:'rgba(255,255,255,.15)', borderRadius:12, padding:'8px 12px' }}>
              <div style={{ fontSize:22, fontWeight:900, color:'#fff', lineHeight:1 }}>{munPct}%</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', fontWeight:600, marginTop:2 }}>{lvl.label}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      {!editing && (
        <div style={{ display:'flex', background:'var(--surface)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex:1, padding:'10px 2px 9px', border:'none',
              borderBottom:`2.5px solid ${tab===t.key?lvl.color:'transparent'}`,
              background:'transparent',
              color: tab===t.key ? lvl.color : 'var(--muted)',
              fontSize:11, fontWeight: tab===t.key?700:500,
              cursor:'pointer', whiteSpace:'nowrap', minWidth:70,
              transition:'all .15s',
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {editing
          ? <EditProfilePanel user={user} onSaved={() => setEditing(false)}/>
          : <>
              {tab==='explorer'    && <ExplorerTab visitedMun={visitedMun} visitedPar={visitedPar} idNameMap={idNameMap}/>}
              {tab==='favorites'   && <FavoritesTab user={user}/>}
              {tab==='suggestions' && <SubmissionsTab userId={user.id}/>}
              {tab==='info'        && <ProfileInfoTab user={user} onEditProfile={() => setEditing(true)}/>}
            </>
        }
      </div>
    </div>
  )
}
