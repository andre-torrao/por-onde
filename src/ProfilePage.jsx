import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from './auth'
import { X, MapPin, Users, Calendar, TrendingUp, Camera, Check, ChevronRight, Globe, Star, Trash2, BookmarkPlus } from 'lucide-react'
import idToNameData from './data/idToName.json'
import { getSuggestionsForUser } from './storage'
import { supabase } from './supabase'

const LEVELS = [
  { min:0,   label:'Curioso',         desc:'A dar os primeiros passos',        color:'#7a756c' },
  { min:5,   label:'Viajante',        desc:'Já começaste a explorar',          color:'#1565c0' },
  { min:15,  label:'Explorador',      desc:'Cada vez mais longe de casa',      color:'#2e7d52' },
  { min:30,  label:'Aventureiro',     desc:'Metade do caminho percorrido',     color:'#e65100' },
  { min:50,  label:'Grande Viajante', desc:'Mais de metade de Portugal visto', color:'#6a1b9a' },
  { min:70,  label:'Conhecedor',      desc:'Quase tudo descoberto',            color:'#b71c1c' },
  { min:90,  label:'Embaixador',      desc:'Portugal é a tua casa',            color:'#d4500a' },
  { min:100, label:'Lenda',           desc:'Portugal completo. Parabéns!',     color:'#1a1814' },
]
function getLevel(pct) { return [...LEVELS].reverse().find(l => pct >= l.min) || LEVELS[0] }
function getNextLevel(pct) { return LEVELS.find(l => pct < l.min) || null }

const CATS = [
  { key:'visit', label:'O que visitar', color:'#d4500a' },
  { key:'food',  label:'Gastronomia',   color:'#1565c0' },
  { key:'sweet', label:'Doçaria',       color:'#6a1b9a' },
  { key:'fest',  label:'Festa/Evento',  color:'#2e7d52' },
  { key:'other', label:'Outro',         color:'#7a756c' },
]

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{ background: accent?'var(--accent-bg)':'var(--surface2)', border:`1px solid ${accent?'rgba(212,80,10,.2)':'var(--border)'}`, borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, background: accent?'rgba(212,80,10,.12)':'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', color: accent?'var(--accent)':'var(--muted)' }}>{icon}</div>
      <div>
        <div style={{ fontSize:19, fontWeight:800, color: accent?'var(--accent)':'var(--text)', lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:10, color:'var(--muted)', marginTop:2, textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</div>
      </div>
    </div>
  )
}

function SubmissionsTab({ userId }) {
  const [submissions, setSubmissions] = useState([])
  useEffect(() => {
    if (userId) getSuggestionsForUser(userId).then(setSubmissions)
  }, [userId])

  if (submissions.length === 0) return (
    <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)' }}>
      <div style={{ fontSize:32, marginBottom:10 }}>💡</div>
      <div style={{ fontSize:14 }}>Ainda não fizeste nenhuma sugestão</div>
      <div style={{ fontSize:12, marginTop:6 }}>Explora o mapa e sugere informação sobre os locais que conheces!</div>
    </div>
  )

  const statusInfo = {
    pending:  { label:'Em análise', bg:'#fff8e1', color:'#e65100', border:'#ffe082' },
    approved: { label:'Aceite',    bg:'#e8f5ee', color:'#2e7d52', border:'#a5d6a7' },
    rejected: { label:'Recusada', bg:'#fdecea', color:'#c62828', border:'#f5c6c6' },
  }

  return (
    <div>
      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:12 }}>
        {submissions.length} submissão{submissions.length!==1?'ões':''} no total
      </div>
      {submissions.map(s => {
        const cat = CATS.find(c => c.key === s.category) || CATS[4]
        const st  = statusInfo[s.status] || statusInfo.pending
        return (
          <div key={s.id} style={{ background:'var(--surface2)', border:`1px solid var(--border)`, borderRadius:10, padding:'11px 13px', marginBottom:8, borderLeft:`3px solid ${cat.color}` }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
              {s.photo && <img src={s.photo} alt="" style={{ width:40, height:40, borderRadius:7, objectFit:'cover', flexShrink:0 }}/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:cat.color, textTransform:'uppercase', letterSpacing:'.5px' }}>{cat.label}</span>
                  <span style={{ fontSize:10, color:'var(--muted)' }}>·</span>
                  <span style={{ fontSize:11, color:'var(--muted)', fontWeight:500 }}>{s.displayLocation || s.locationName || s.location}</span>
                </div>
                <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.4 }}>{s.text}</div>
                {s.date && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>📅 {s.date}</div>}
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:4 }}>{new Date(s.createdAt).toLocaleDateString('pt-PT')}</div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, background:st.bg, color:st.color, border:`1px solid ${st.border}`, flexShrink:0, whiteSpace:'nowrap' }}>
                {st.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FavoritesTab({ user, idNameMap }) {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.supabaseId) return
    supabase.from('profiles').select('favorites').eq('id', user.supabaseId).single()
      .then(({ data }) => {
        setFavorites(data?.favorites || [])
        setLoading(false)
      })
  }, [user?.supabaseId])

  async function remove(id) {
    const next = favorites.filter(f => f.id !== id)
    setFavorites(next)
    await supabase.from('profiles').update({ favorites: next }).eq('id', user.supabaseId)
  }

  if (loading) return (
    <div style={{ textAlign:'center', padding:'40px 0', color:'var(--muted)' }}>
      <div style={{ width:24, height:24, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 10px' }}/>
    </div>
  )

  if (favorites.length === 0) return (
    <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)' }}>
      <Star size={32} style={{ margin:'0 auto 10px', display:'block', opacity:.3 }}/>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Nenhum favorito ainda</div>
      <div style={{ fontSize:12, lineHeight:1.5 }}>
        Toca num concelho ou freguesia no mapa e guarda como favorito para as tuas próximas viagens.
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:12 }}>
        {favorites.length} localidade{favorites.length!==1?'s':''} guardada{favorites.length!==1?'s':''}
      </div>
      {favorites.map(f => (
        <div key={f.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', borderRadius:10, marginBottom:6, background:'var(--surface2)', border:'1px solid var(--border)' }}>
          <Star size={14} style={{ color:'#f59e0b', flexShrink:0 }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
            {f.concelho && f.concelho !== f.name && (
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{f.concelho}</div>
            )}
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>
              {f.level === 'parishes' ? 'Freguesia' : 'Concelho'} · Adicionado {new Date(f.addedAt).toLocaleDateString('pt-PT')}
            </div>
          </div>
          <button onClick={() => remove(f.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--border2)', padding:6, borderRadius:7, display:'flex', alignItems:'center' }}>
            <Trash2 size={14}/>
          </button>
        </div>
      ))}
    </div>
  )
}

export default function ProfilePage({ visitedMun, visitedPar, idNameMap, level, onClose }) {
  const { user, logout, updatePhoto } = useAuth()
  const [tab,   setTab]   = useState('profile')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)
  const startY  = useRef(null)
  const isMobile = window.innerWidth < 768

  const totalMun = 307, totalPar = 2916
  const munCount = visitedMun.size, parCount = visitedPar.size
  const pct = Math.round(munCount / totalMun * 100)
  const currentLevel = getLevel(pct)
  const nextLevel    = getNextLevel(pct)

  const joinDate = user?.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString('pt-PT', { month:'long', year:'numeric' })
    : 'Hoje'

  const lastVisited = [...visitedMun].slice(-4).reverse()
    .concat([...visitedPar].slice(-2).reverse())
    .map(id => {
      const val = idNameMap.get(id)
      if (val) return typeof val === 'string' ? val : val?.displayName || val?.name || id
      if (idToNameData[id]) return idToNameData[id]
      return id.replace(/^ref__\d+$/, '').replace(/__\d+$/, '').replace(/-/g,' ')
    }).filter(Boolean).slice(0, 6)

  function handlePhotoChange(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { updatePhoto(ev.target.result); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    reader.readAsDataURL(file)
  }

  function onTouchStart(e) { startY.current = e.touches[0].clientY }
  function onTouchEnd(e) {
    if (startY.current === null) return
    if (e.changedTouches[0].clientY - startY.current > 70) onClose()
    startY.current = null
  }

  const TABS = [
    ['profile', 'Perfil'],
    ['favorites', '⭐ Favoritos'],
    ['submissions', 'Submissões'],
  ]

  const sheetStyle = isMobile ? {
    position:'fixed', left:0, right:0, bottom:0, top:'auto',
    borderRadius:'20px 20px 0 0',
    maxHeight:'92vh',
    animation:'slideUp .3s cubic-bezier(.4,0,.2,1)',
    paddingBottom:'var(--safe-bottom)',
  } : {
    borderRadius:20,
    width:'100%', maxWidth:430,
    maxHeight:'90vh',
    animation:'popIn .25s ease',
  }

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(28,26,22,.45)', backdropFilter:'blur(4px)', display:'flex', alignItems: isMobile?'flex-end':'center', justifyContent:'center', padding: isMobile?0:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        onTouchStart={isMobile ? onTouchStart : undefined}
        onTouchEnd={isMobile ? onTouchEnd : undefined}
        style={{ ...sheetStyle, background:'var(--surface)', border:'1px solid var(--border)', boxShadow:'0 -4px 40px rgba(0,0,0,.18)', overflow:'hidden', display:'flex', flexDirection:'column' }}
      >
        {/* Drag handle */}
        {isMobile && (
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', flexShrink:0, cursor:'grab' }}>
            <div style={{ width:36, height:4, borderRadius:2, background:'var(--border2)' }}/>
          </div>
        )}

        {/* Dark header */}
        <div style={{ background:'linear-gradient(135deg,#3a3734,#1c1a16)', padding: isMobile?'14px 18px 12px':'22px 22px 18px', flexShrink:0, position:'relative' }}>
          {!isMobile && (
            <button onClick={onClose} style={{ position:'absolute', top:12, right:12, background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, width:28, height:28, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ position:'relative' }}>
              <div style={{ width: isMobile?52:64, height: isMobile?52:64, borderRadius:14, background: user?.photo?'transparent':'rgba(255,255,255,.15)', border:'2px solid rgba(255,255,255,.3)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {user?.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize: isMobile?24:28 }}>👤</span>}
              </div>
              <button onClick={() => fileRef.current?.click()} style={{ position:'absolute', bottom:-4, right:-4, width:22, height:22, borderRadius:7, background:'var(--surface)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: saved?'var(--accent)':'var(--muted)' }}>
                {saved ? <Check size={10}/> : <Camera size={10}/>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display:'none' }}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize: isMobile?17:19, color:'#fff', letterSpacing:'-.3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.id}</div>
              {user?.country && <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', marginTop:2, display:'flex', alignItems:'center', gap:4 }}><Globe size={11}/> {user.country}</div>}
              <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', marginTop:2, display:'flex', alignItems:'center', gap:4 }}><Calendar size={10}/> Desde {joinDate}</div>
            </div>
            {isMobile && (
              <button onClick={onClose} style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><X size={14}/></button>
            )}
          </div>

          {/* Level */}
          <div style={{ marginTop:12, background:'rgba(255,255,255,.1)', borderRadius:10, padding:'9px 13px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#fff', marginBottom:1 }}>{currentLevel.label}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.55)' }}>{currentLevel.desc}</div>
              {nextLevel && <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>Próximo: {nextLevel.label} a {nextLevel.min}%</div>}
            </div>
            <div style={{ fontSize:20, fontWeight:800, color:'#fff', background:'rgba(255,255,255,.15)', borderRadius:9, padding:'5px 11px' }}>{pct}%</div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:5, marginTop:12, overflowX:'auto', paddingBottom:2 }}>
            {TABS.map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ padding:'6px 13px', borderRadius:20, border:'1.5px solid', borderColor: tab===k?'#fff':'rgba(255,255,255,.3)', background: tab===k?'rgba(255,255,255,.2)':'transparent', color:'#fff', fontSize:12, fontWeight:600, fontFamily:'Open Sans,sans-serif', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'16px 18px 20px', overflowY:'auto', flex:1 }}>
          {tab === 'profile' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                <StatCard icon={<MapPin size={14}/>} label="Concelhos" value={munCount} accent/>
                <StatCard icon={<MapPin size={14}/>} label="Freguesias" value={parCount} accent/>
                <StatCard icon={<TrendingUp size={14}/>} label={`de ${totalMun} concelhos`} value={`${pct}%`}/>
                <StatCard icon={<Users size={14}/>} label={`de ${totalPar} freguesias`} value={`${Math.round(parCount/totalPar*100)}%`}/>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom:18 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted)', marginBottom:4 }}><span>Concelhos</span><span>{munCount}/{totalMun}</span></div>
                <div style={{ position:'relative', height:7, background:'var(--border)', borderRadius:4 }}>
                  <div style={{ height:'100%', borderRadius:4, background:`linear-gradient(90deg,${currentLevel.color},${nextLevel?.color||currentLevel.color})`, width:`${pct}%`, transition:'width .6s' }}/>
                  {LEVELS.filter(l=>l.min>0&&l.min<100).map(l => (
                    <div key={l.min} style={{ position:'absolute', top:-2, left:`${l.min}%`, width:2, height:11, background:'var(--border2)', transform:'translateX(-50%)', borderRadius:1 }}/>
                  ))}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:9, color:'var(--muted)' }}>
                  {LEVELS.filter(l=>l.min%10===0).map(l=><span key={l.min}>{l.min}%</span>)}
                </div>
              </div>

              {/* Last visited */}
              {lastVisited.length > 0 && (
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:8 }}>Últimos Sítios Visitados</div>
                  {lastVisited.map((name,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 11px', borderRadius:10, marginBottom:4, background:'var(--surface2)', border:'1px solid var(--border)' }}>
                      <MapPin size={12} style={{ color:'var(--accent)', flexShrink:0 }}/>
                      <span style={{ fontSize:13, color:'var(--text)', fontWeight:500, flex:1 }}>{name}</span>
                      <ChevronRight size={12} style={{ color:'var(--border2)' }}/>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={logout} style={{ width:'100%', padding:'13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--muted)', fontSize:13, fontFamily:'Open Sans,sans-serif', cursor:'pointer', fontWeight:500 }}>
                Terminar sessão
              </button>
            </>
          )}

          {tab === 'favorites' && <FavoritesTab user={user} idNameMap={idNameMap}/>}
          {tab === 'submissions' && <SubmissionsTab userId={user?.id}/>}
        </div>
      </div>
    </div>
  )
}
