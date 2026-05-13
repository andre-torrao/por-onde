import { useState, useRef } from 'react'
import { useAuth } from './auth'
import { X, MapPin, Users, Calendar, TrendingUp, Camera, Check, ChevronRight, Globe } from 'lucide-react'
import idToNameData from './data/idToName.json'
import { getSuggestionsForUser } from './storage'

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

  if (submissions.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)' }}>
        <div style={{ fontSize:32, marginBottom:10 }}>💡</div>
        <div style={{ fontSize:14 }}>Ainda não fizeste nenhuma sugestão</div>
        <div style={{ fontSize:12, marginTop:6 }}>Explora o mapa e sugere informação sobre os locais que conheces!</div>
      </div>
    )
  }

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
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:4 }}>
                  {new Date(s.createdAt).toLocaleDateString('pt-PT')}
                </div>
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

export default function ProfilePage({ visitedMun, visitedPar, idNameMap, level, onClose }) {
  const { user, logout, updatePhoto } = useAuth()
  const [tab,   setTab]   = useState('profile') // profile | submissions
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)

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

  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(28,26,22,.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{ background:'var(--surface)', borderRadius:20, width:'100%', maxWidth:430, border:'1px solid var(--border)', boxShadow:'0 20px 60px rgba(0,0,0,.15)', overflow:'hidden', animation:'popIn .25s ease', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#3a3734,#1c1a16)', padding:'22px 22px 18px', flexShrink:0, position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute', top:12, right:12, background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, width:28, height:28, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ position:'relative' }}>
              <div style={{ width:64, height:64, borderRadius:16, background: user?.photo?'transparent':'rgba(255,255,255,.15)', border:'2px solid rgba(255,255,255,.3)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {user?.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:28 }}>👤</span>}
              </div>
              <button onClick={() => fileRef.current?.click()} style={{ position:'absolute', bottom:-4, right:-4, width:22, height:22, borderRadius:7, background:'var(--surface)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: saved?'var(--accent)':'var(--muted)' }}>
                {saved ? <Check size={10}/> : <Camera size={10}/>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display:'none' }}/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:19, color:'#fff', letterSpacing:'-.3px' }}>{user?.id}</div>
              {user?.country && <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', marginTop:2, display:'flex', alignItems:'center', gap:4 }}><Globe size={11}/> {user.country}</div>}
              <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', marginTop:2, display:'flex', alignItems:'center', gap:4 }}><Calendar size={10}/> Desde {joinDate}</div>
            </div>
          </div>
          {/* Level */}
          <div style={{ marginTop:14, background:'rgba(255,255,255,.1)', borderRadius:10, padding:'9px 13px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#fff', marginBottom:1 }}>{currentLevel.label}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.55)' }}>{currentLevel.desc}</div>
              {nextLevel && <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>Próximo: {nextLevel.label} a {nextLevel.min}%</div>}
            </div>
            <div style={{ fontSize:20, fontWeight:800, color:'#fff', background:'rgba(255,255,255,.15)', borderRadius:9, padding:'5px 11px' }}>{pct}%</div>
          </div>
          {/* Tabs */}
          <div style={{ display:'flex', gap:5, marginTop:12 }}>
            {[['profile','Perfil'],['submissions','Submissões']].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ padding:'5px 13px', borderRadius:20, border:'1.5px solid', borderColor: tab===k?'#fff':'rgba(255,255,255,.3)', background: tab===k?'rgba(255,255,255,.2)':'transparent', color:'#fff', fontSize:12, fontWeight:600, fontFamily:'Open Sans,sans-serif', cursor:'pointer' }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'18px 22px 22px', overflowY:'auto', flex:1 }}>
          {tab === 'profile' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                <StatCard icon={<MapPin size={14}/>} label="Concelhos" value={munCount} accent/>
                <StatCard icon={<MapPin size={14}/>} label="Freguesias" value={parCount} accent/>
                <StatCard icon={<TrendingUp size={14}/>} label={`de ${totalMun} concelhos`} value={`${pct}%`}/>
                <StatCard icon={<Users size={14}/>} label={`de ${totalPar} freguesias`} value={`${Math.round(parCount/totalPar*100)}%`}/>
              </div>
              {/* Progress */}
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
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 11px', borderRadius:9, marginBottom:4, background:'var(--surface2)', border:'1px solid var(--border)' }}>
                      <MapPin size={12} style={{ color:'var(--accent)', flexShrink:0 }}/>
                      <span style={{ fontSize:13, color:'var(--text)', fontWeight:500, flex:1 }}>{name}</span>
                      <ChevronRight size={12} style={{ color:'var(--border2)' }}/>
                    </div>
                  ))}
                </div>
              )}
              {/* Logout */}
              <button onClick={logout} style={{ width:'100%', padding:'11px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--muted)', fontSize:13, fontFamily:'Open Sans,sans-serif', cursor:'pointer', fontWeight:500, transition:'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='#fdecea'; e.currentTarget.style.color='#c62828'; e.currentTarget.style.borderColor='#f5c6c6' }}
                onMouseLeave={e => { e.currentTarget.style.background='var(--surface2)'; e.currentTarget.style.color='var(--muted)'; e.currentTarget.style.borderColor='var(--border)' }}
              >Terminar sessão</button>
            </>
          )}
          {tab === 'submissions' && <SubmissionsTab userId={user?.id}/>}
        </div>
      </div>
    </div>
  )
}
