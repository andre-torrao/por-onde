import { useState, useRef, useEffect } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { ChevronLeft, ChevronDown, Camera, Check, Globe, Edit3, Eye, EyeOff, Star, Trash2, Home, User, MapPin, TrendingUp, Lock, Palette, Map, BookOpen } from 'lucide-react'
import idToNameData from './data/idToName.json'
import { getSuggestionsForUser } from './storage'
import PassportTab from './PassportTab'

const TOTAL_MUN = 307, TOTAL_PAR = 2916

const LEVELS = [
  { min:0,   label:'Curioso',         color:'#6b7694' },
  { min:5,   label:'Viajante',        color:'#4ea8de' },
  { min:15,  label:'Explorador',      color:'#43c59e' },
  { min:30,  label:'Aventureiro',     color:'#f9a825' },
  { min:50,  label:'Grande Viajante', color:'#9b72cf' },
  { min:70,  label:'Conhecedor',      color:'#6c63ff' },
  { min:90,  label:'Embaixador',      color:'#ff6b6b' },
  { min:100, label:'Lenda',           color:'#1a1814' },
]
function getLevel(pct)     { return [...LEVELS].reverse().find(l => pct >= l.min) || LEVELS[0] }
function getNextLevel(pct) { return LEVELS.find(l => pct < l.min) || null }

const MARK_COLORS = [
  '#6c63ff','#ff6b6b','#43c59e','#f9a825','#4ea8de','#f06292',
  '#85A898','#135768','#5270A1','#EDC366','#DB750F','#C44F88',
  '#631662','#1C244F','#30608C',
]

const COUNTRIES = ['Portugal','Brasil','Angola','Moçambique','Cabo Verde','Guiné-Bissau','Espanha','França','Reino Unido','Alemanha','Suíça','Estados Unidos','Canadá','Outro']
const CATS = [
  { key:'visit', label:'Visitar',     color:'#ff6b6b' },
  { key:'food',  label:'Gastronomia', color:'#4ea8de' },
  { key:'sweet', label:'Doçaria',     color:'#9b72cf' },
  { key:'fest',  label:'Evento',      color:'#43c59e' },
  { key:'other', label:'Outro',       color:'#6b7694' },
]

// ── Hexagon button ────────────────────────────────────────────────────
function HexButton({ icon, label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>
      <div style={{ position:'relative', width:54, height:62 }}>
        <svg viewBox="0 0 54 62" width="54" height="62" style={{ position:'absolute', inset:0 }}>
          <polygon points="27,2 52,15 52,47 27,60 2,47 2,15"
            fill={active ? color : 'rgba(255,255,255,0.12)'}
            stroke={active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)'}
            strokeWidth="1.5"
          />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color: active ? '#fff' : 'rgba(255,255,255,0.6)' }}>
          {icon}
        </div>
      </div>
      <span style={{ fontSize:10, fontWeight: active ? 700 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
        {label}
      </span>
    </button>
  )
}

// ── Segmented ring ────────────────────────────────────────────────────
function RingChart({ pct, color, size=160 }) {
  const segments = 32, filled = Math.round(pct/100*segments)
  const cx = size/2, cy = size/2
  const r = size * 0.38          // scales with size: ~57 at 150, ~61 at 160
  const inner = r - size * 0.15  // inner hole also scales
  const gap = 4, segA = (360 - segments*gap)/segments
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({length:segments}).map((_,i) => {
        const s=(i*(segA+gap)-90)*Math.PI/180, e=(i*(segA+gap)-90+segA)*Math.PI/180
        const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s),x2=cx+r*Math.cos(e),y2=cy+r*Math.sin(e)
        return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
          fill={i<filled ? color : `${color}20`}
          opacity={i<filled ? (0.5+(i/Math.max(filled,1))*0.5) : 1}/>
      })}
      <circle cx={cx} cy={cy} r={inner} fill="var(--surface)"/>
    </svg>
  )
}

// ── Explorer tab ──────────────────────────────────────────────────────
function ExplorerTab({ visitedMun, visitedPar, idNameMap, color }) {
  const [sub, setSub] = useState('municipalities')
  const munCount=visitedMun.size, parCount=visitedPar.size
  const munPct=Math.round(munCount/TOTAL_MUN*100), parPct=Math.round(parCount/TOTAL_PAR*100)
  const isMun=sub==='municipalities'
  const count=isMun?munCount:parCount, total=isMun?TOTAL_MUN:TOTAL_PAR, pct=isMun?munPct:parPct
  const lvl=getLevel(munPct), nextLvl=getNextLevel(munPct)
  const bgColor=`${color}18`

  const lastVisited = [...(isMun?visitedMun:visitedPar)].slice(-10).reverse().map(id => {
    const val=idNameMap.get(id)
    if(val) return {name:typeof val==='string'?val:val?.displayName||val?.name,id}
    return {name:idToNameData[id]||id.replace(/__\d+$/,'').replace(/-/g,' '),id}
  }).filter(x=>x.name)

  return (
    <div style={{padding:'16px 16px 100px'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[
          {key:'municipalities',label:'Concelhos',count:munCount,pct:munPct,total:TOTAL_MUN,c:'#6c63ff'},
          {key:'parishes',label:'Freguesias',count:parCount,pct:parPct,total:TOTAL_PAR,c:'#4ea8de'},
        ].map(t=>(
          <button key={t.key} onClick={()=>setSub(t.key)} style={{
            padding:'14px 12px',borderRadius:16,border:'2px solid',
            borderColor:sub===t.key?t.c:'var(--border)',
            background:sub===t.key?`${t.c}12`:'var(--surface)',
            cursor:'pointer',transition:'all .18s',textAlign:'left',
            boxShadow:sub===t.key?`0 4px 16px ${t.c}25`:'none',
          }}>
            <div style={{fontSize:28,fontWeight:900,color:sub===t.key?t.c:'var(--muted)',lineHeight:1}}>{t.count}</div>
            <div style={{fontSize:12,fontWeight:700,color:sub===t.key?t.c:'var(--muted)',marginTop:3}}>{t.label}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>de {t.total} · {t.pct}%</div>
          </button>
        ))}
      </div>

      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:'20px 16px 16px',marginBottom:14,boxShadow:`0 4px 20px ${color}10`}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{position:'relative',width:150,height:150,flexShrink:0}}>
            <RingChart pct={pct} color={isMun?'#6c63ff':'#4ea8de'} size={150}/>
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <div style={{fontSize:32,fontWeight:900,color:isMun?'#6c63ff':'#4ea8de',lineHeight:1}}>{pct}%</div>
              <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>de {total}</div>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:4}}>Nível atual</div>
            <div style={{fontSize:20,fontWeight:800,color,marginBottom:4}}>{lvl.label}</div>
            {nextLvl&&<div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>Próximo: <strong style={{color}}>{nextLvl.label}</strong> ({nextLvl.min}%)</div>}
            <div style={{height:6,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:3,transition:'width .8s'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
              <span style={{fontSize:10,color:'var(--muted)'}}>{count} visitados</span>
              <span style={{fontSize:10,color:'var(--muted)'}}>{total-count} por visitar</span>
            </div>
          </div>
        </div>
      </div>

      {lastVisited.length>0&&(
        <div style={{background:'var(--surface)',border:`1px solid ${color}25`,borderRadius:16,overflow:'hidden',boxShadow:`0 2px 12px ${color}10`}}>
          <div style={{padding:'12px 16px 8px',borderBottom:`1px solid ${color}20`,background:`${color}06`}}>
            <span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color}}>
              Últim{isMun?'os concelhos':'as freguesias'} visitad{isMun?'os':'as'}
            </span>
          </div>
          {lastVisited.map(({name,id},i)=>(
            <div key={id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:i<lastVisited.length-1?`1px solid ${color}15`:'none',background:i%2===0?`${color}04`:'transparent'}}>
              <div style={{width:26,height:26,borderRadius:8,background:color,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 2px 6px ${color}40`}}>
                <span style={{fontSize:10,fontWeight:800,color:'#fff'}}>{i+1}</span>
              </div>
              <span style={{fontSize:13,fontWeight:600,color,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span>
              <MapPin size={12} style={{color,flexShrink:0}}/>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Profile info tab ──────────────────────────────────────────────────
function ProfileInfoTab({ user, onEditProfile, color }) {
  const fields = [
    {label:'Username',    value:user?.id},
    {label:'Nome',        value:user?.displayName||'—'},
    {label:'Email',       value:user?.email},
    {label:'País',        value:user?.country||'—'},
    {label:'Localidade',  value:user?.location||'—'},
  ]
  return (
    <div style={{padding:'16px 16px 100px'}}>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden',marginBottom:14}}>
        {fields.map((f,i)=>(
          <div key={f.label} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 16px',borderBottom:i<fields.length-1?'1px solid var(--border)':'none'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:1}}>{f.label}</div>
              <div style={{fontSize:14,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Color picker */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'14px 16px',marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:10}}>Cor do mapa</div>
        <ColorPicker color={color}/>
      </div>

      <button onClick={onEditProfile} style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderRadius:14,border:'none',background:color,cursor:'pointer',width:'100%',boxShadow:`0 4px 16px ${color}50`}}>
        <Edit3 size={15} color="#fff"/>
        <span style={{fontSize:14,fontWeight:700,color:'#fff'}}>Editar perfil</span>
        <ChevronLeft size={14} color="rgba(255,255,255,.7)" style={{transform:'rotate(180deg)',marginLeft:'auto'}}/>
      </button>
    </div>
  )
}

function ColorPicker({ color: currentColor }) {
  const { user, updateProfile } = useAuth()
  const cur = currentColor || user?.markColor || '#6c63ff'
  const [open, setOpen] = useState(false)

  function pick(hex) {
    document.documentElement.style.setProperty('--mark-color', hex)
    updateProfile({ markColor: hex })
    setOpen(false)
  }

  return (
    <div>
      {/* Active color row */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'12px 14px', borderRadius:12, cursor:'pointer',
          background:`${cur}12`, border:`1.5px solid ${cur}40`,
          transition:'all .2s',
        }}
      >
        {/* Big color swatch */}
        <div style={{
          width:40, height:40, borderRadius:10,
          background:cur, flexShrink:0,
          boxShadow:`0 3px 10px ${cur}55`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Check size={16} color="#fff" strokeWidth={3}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:2 }}>Cor do mapa</div>
          <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'monospace', letterSpacing:'0.5px' }}>{cur.toUpperCase()}</div>
        </div>
        {/* Chevron */}
        <div style={{
          width:28, height:28, borderRadius:8,
          background:`${cur}20`, display:'flex',
          alignItems:'center', justifyContent:'center',
          transition:'transform .2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          <ChevronDown size={15} color={cur}/>
        </div>
      </div>

      {/* Expanded palette */}
      {open && (
        <div style={{
          marginTop:10, padding:'12px', borderRadius:12,
          background:'var(--surface2)', border:'1px solid var(--border)',
          display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10,
        }}>
          {MARK_COLORS.map(hex => {
            const selected = cur === hex
            return (
              <button
                key={hex}
                onClick={() => pick(hex)}
                style={{
                  width:'100%', aspectRatio:'1',
                  borderRadius:10, background:hex, border:'none',
                  cursor:'pointer', position:'relative',
                  transition:'transform .15s, box-shadow .15s',
                  transform: selected ? 'scale(1.08)' : 'scale(1)',
                  boxShadow: selected
                    ? `0 0 0 3px var(--bg), 0 0 0 5px ${hex}, 0 4px 12px ${hex}60`
                    : `0 2px 6px ${hex}50`,
                  outline:'none',
                }}
              >
                {selected && (
                  <Check
                    size={14} color="#fff" strokeWidth={3}
                    style={{ position:'absolute', inset:0, margin:'auto' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Favorites tab ─────────────────────────────────────────────────────
function FavoritesTab({ user, color, onNavigate }) {
  const [favorites,setFavorites]=useState([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    if(!user?.supabaseId) return
    supabase.from('profiles').select('favorites').eq('id',user.supabaseId).single()
      .then(({data})=>{setFavorites(data?.favorites||[]);setLoading(false)})
  },[user?.supabaseId])
  async function remove(id){
    const next=favorites.filter(f=>f.id!==id);setFavorites(next)
    await supabase.from('profiles').update({favorites:next}).eq('id',user.supabaseId)
  }
  if(loading) return <div style={{display:'flex',justifyContent:'center',padding:48}}><div style={{width:24,height:24,border:`2px solid var(--border)`,borderTopColor:color,borderRadius:'50%',animation:'spin .7s linear infinite'}}/></div>
  if(favorites.length===0) return (
    <div style={{textAlign:'center',padding:'60px 28px'}}>
      <div style={{width:56,height:56,borderRadius:16,background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',border:`1px solid ${color}25`}}>
        <Star size={26} color={color}/>
      </div>
      <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:8}}>Nenhum favorito ainda</div>
      <div style={{fontSize:13,lineHeight:1.7,color:'var(--muted)'}}>Toca na estrela numa localidade para guardar para as próximas viagens.</div>
    </div>
  )
  return (
    <div style={{padding:'16px 16px 100px'}}>
      {favorites.map(f=>{
        const isMun=f.level!=='parishes'
        // Build slug from id for navigation
        const slug = f.id.split('__')[0]
        return (
          <div key={f.id} style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'13px 14px', borderRadius:16, marginBottom:8,
            background:'var(--surface)', border:`1px solid var(--border)`,
            cursor: onNavigate ? 'pointer' : 'default',
            transition:'background .15s, border-color .15s',
          }}
            onClick={() => onNavigate?.(slug, f.name)}
          >
            <div style={{width:42,height:42,borderRadius:12,background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Star size={18} fill={color} color={color}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:3,display:'flex',alignItems:'center',gap:6}}>
                <span style={{background:`${color}15`,color,padding:'2px 8px',borderRadius:6,fontWeight:700,fontSize:10}}>{isMun?'Concelho':'Freguesia'}</span>
                {new Date(f.addedAt).toLocaleDateString('pt-PT')}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              {onNavigate && (
                <div style={{color,opacity:0.5,display:'flex',alignItems:'center'}}>
                  <MapPin size={14}/>
                </div>
              )}
              <button onClick={e=>{e.stopPropagation();remove(f.id)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--border2)',padding:'6px',borderRadius:8,display:'flex'}}>
                <Trash2 size={15}/>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Submissions tab ───────────────────────────────────────────────────
function SubmissionsTab({ userId, color }) {
  const [submissions,setSubmissions]=useState([])
  useEffect(()=>{if(userId) getSuggestionsForUser(userId).then(setSubmissions)},[userId])
  if(submissions.length===0) return (
    <div style={{textAlign:'center',padding:'60px 28px'}}>
      <div style={{width:56,height:56,borderRadius:16,background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><TrendingUp size={26} color={color}/></div>
      <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:8}}>Nenhuma sugestão ainda</div>
      <div style={{fontSize:13,lineHeight:1.7,color:'var(--muted)'}}>Explora o mapa e sugere informação sobre os locais que conheces.</div>
    </div>
  )
  const statusInfo={
    pending: {label:'Em análise',bg:'#fffbeb',c:'#f9a825',border:'rgba(249,168,37,.25)'},
    approved:{label:'Aceite',    bg:'#edfdf7',c:'#43c59e',border:'rgba(67,197,158,.25)'},
    rejected:{label:'Recusada', bg:'#fff1f1',c:'#ff6b6b',border:'rgba(255,107,107,.25)'},
  }
  return (
    <div style={{padding:'16px 16px 100px'}}>
      {submissions.map(s=>{
        const cat=CATS.find(c=>c.key===s.category)||CATS[4]
        const st=statusInfo[s.status]||statusInfo.pending
        return (
          <div key={s.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'13px 14px',marginBottom:10,borderLeft:`3px solid ${cat.color}`}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
              {s.photo&&<img src={s.photo} alt="" style={{width:44,height:44,borderRadius:10,objectFit:'cover',flexShrink:0}}/>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'}}>
                  <span style={{fontSize:10,fontWeight:700,color:cat.color,textTransform:'uppercase',background:`${cat.color}15`,padding:'2px 7px',borderRadius:5}}>{cat.label}</span>
                  <span style={{fontSize:11,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130}}>{s.displayLocation||s.locationName}</span>
                </div>
                <div style={{fontSize:13,color:'var(--text)',lineHeight:1.5}}>{s.text}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{new Date(s.createdAt).toLocaleDateString('pt-PT')}</div>
              </div>
              <span style={{fontSize:10,fontWeight:700,padding:'4px 9px',borderRadius:20,background:st.bg,color:st.c,border:`1px solid ${st.border}`,flexShrink:0,whiteSpace:'nowrap'}}>{st.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Edit profile ──────────────────────────────────────────────────────
function EditProfilePanel({ user, onSaved, color }) {
  const {updatePhoto,updateProfile}=useAuth()
  const [fields,setFields]=useState({displayName:user?.displayName||user?.id||'',fullName:user?.fullName||'',country:user?.country||'Portugal',location:user?.location||'',pw:''})
  const [showPw,setShowPw]=useState(false),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[photoSaved,setPhotoSaved]=useState(false)
  const fileRef=useRef(null)
  function set(k){return v=>setFields(p=>({...p,[k]:v}))}
  async function save(){
    setBusy(true)
    await updateProfile({displayName:fields.displayName,fullName:fields.fullName,country:fields.country,location:fields.location})
    if(fields.pw.length>=4) await supabase.auth.updateUser({password:fields.pw})
    setBusy(false);setSaved(true);setTimeout(()=>{setSaved(false);onSaved()},800)
  }
  function handlePhoto(e){
    const file=e.target.files[0];if(!file) return
    const r=new FileReader();r.onload=ev=>{updatePhoto(ev.target.result);setPhotoSaved(true);setTimeout(()=>setPhotoSaved(false),2000)};r.readAsDataURL(file)
  }
  return (
    <div style={{padding:'16px 16px 100px'}}>
      <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:16,background:'var(--surface)',border:'1px solid var(--border)',marginBottom:16}}>
        <div style={{width:60,height:60,borderRadius:16,overflow:'hidden',background:'var(--surface2)',border:'2px solid var(--border)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {user?.photo?<img src={user.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:26}}>👤</span>}
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:6}}>Foto de perfil</div>
          <button onClick={()=>fileRef.current?.click()} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:9,border:`1.5px solid ${color}40`,background:`${color}10`,color,fontSize:12,fontWeight:600,cursor:'pointer'}}>
            {photoSaved?<><Check size={12}/> Guardado!</>:<><Camera size={12}/> Alterar foto</>}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
      </div>
      <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden',marginBottom:16}}>
        {[{label:'Username',value:user?.id},{label:'Email',value:user?.email}].map((f,i)=>(
          <div key={f.label} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderBottom:i===0?'1px solid var(--border)':'none'}}>
            <Lock size={13} style={{color:'var(--border2)',flexShrink:0}}/>
            <div style={{flex:1}}><div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>{f.label}</div><div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{f.value}</div></div>
            <span style={{fontSize:10,color:'var(--border2)',fontStyle:'italic'}}>não editável</span>
          </div>
        ))}
      </div>
      {[
        {key:'displayName',label:'Nome a mostrar',placeholder:'O teu nome'},
        {key:'fullName',label:'Nome completo',placeholder:'ex: João Pedro Silva'},
        {key:'location',label:'Localidade',placeholder:'ex: Lisboa, Braga…'},
      ].map(f=>(
        <div key={f.key} style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:5}}>{f.label}</label>
          <input defaultValue={fields[f.key]} onBlur={e=>set(f.key)(e.target.value)} placeholder={f.placeholder}
            style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid var(--border)',background:'var(--surface)',fontSize:14,color:'var(--text)',fontFamily:'var(--font)',outline:'none'}}
            onFocus={e=>e.target.style.borderColor=color} onBlur={e=>{e.target.style.borderColor='var(--border)';set(f.key)(e.target.value)}}/>
        </div>
      ))}
      <div style={{marginBottom:12}}>
        <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:5}}>País</label>
        <select defaultValue={fields.country} onBlur={e=>set('country')(e.target.value)} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid var(--border)',background:'var(--surface)',fontSize:14,color:'var(--text)',fontFamily:'var(--font)',outline:'none',cursor:'pointer'}}>
          {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{height:1,background:'var(--border)',margin:'16px 0'}}/>
      <div style={{marginBottom:6}}>
        <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:5}}>Nova password</label>
        <div style={{position:'relative'}}>
          <input type={showPw?'text':'password'} defaultValue={fields.pw} onBlur={e=>set('pw')(e.target.value)} placeholder="Deixa em branco para não alterar"
            style={{width:'100%',padding:'12px 44px 12px 14px',borderRadius:12,border:'1.5px solid var(--border)',background:'var(--surface)',fontSize:14,color:'var(--text)',fontFamily:'var(--font)',outline:'none'}}
            onFocus={e=>e.target.style.borderColor=color}/>
          <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--muted)',display:'flex',padding:4}}>
            {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
          </button>
        </div>
      </div>
      <button onClick={save} disabled={busy||saved} style={{width:'100%',padding:'14px',borderRadius:14,border:'none',background:saved?'#43c59e':color,color:'#fff',fontSize:14,fontWeight:700,cursor:busy||saved?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:20,boxShadow:saved?'none':`0 4px 20px ${color}50`}}>
        {saved?<><Check size={15}/> Guardado!</>:busy?'A guardar…':'Guardar alterações'}
      </button>
    </div>
  )
}

// ── TABS config ───────────────────────────────────────────────────────
const TABS = [
  { key:'explorer',    label:'Explorar', icon: <Map size={22}/> },
  { key:'passport',    label:'Passaporte', icon: <BookOpen size={22}/> },
  { key:'favorites',   label:'Favoritos',  icon: <Star size={22}/> },
  { key:'suggestions', label:'Sugestões',  icon: <TrendingUp size={22}/> },
  { key:'info',        label:'Perfil',     icon: <User size={22}/> },
]

// ── Main ──────────────────────────────────────────────────────────────
export default function ProfilePage({ visitedMun, visitedPar, idNameMap, level, onClose, onStampClick, onNavigate }) {
  const {user,logout}=useAuth()
  const [tab,setTab]=useState('explorer')
  const [editing,setEditing]=useState(false)

  const munPct=Math.round((visitedMun?.size||0)/TOTAL_MUN*100)
  const color=user?.markColor||'#6c63ff'
  const lvl=getLevel(munPct)
  const nextLvl=getNextLevel(munPct)

  if(!user) return null

  return (
    <div style={{position:'fixed',inset:0,zIndex:2000,background:'var(--bg)',display:'flex',flexDirection:'column',animation:'slideLeft .28s cubic-bezier(.4,0,.2,1)'}}>

      {/* ── Hero with colour mantle ── */}
      {!editing && (
        <div style={{background:`linear-gradient(160deg, ${color} 0%, ${color}dd 100%)`,paddingTop:'var(--safe-top)',flexShrink:0,position:'relative',overflow:'hidden'}}>
          {/* Decorative blobs */}
          <div style={{position:'absolute',right:-40,top:-40,width:150,height:150,borderRadius:'50%',background:'rgba(255,255,255,.08)'}}/>
          <div style={{position:'absolute',left:-20,bottom:-30,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,.06)'}}/>

          {/* Top bar */}
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px 0',position:'relative'}}>
            <button onClick={onClose} style={{width:36,height:36,borderRadius:10,border:'1px solid rgba(255,255,255,.3)',background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#fff',flexShrink:0}}>
              <ChevronLeft size={17}/>
            </button>
            <div style={{flex:1}}/>
            <button onClick={logout} style={{fontSize:12,color:'#fff',fontWeight:700,background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.3)',borderRadius:9,cursor:'pointer',padding:'6px 12px'}}>Sair</button>
          </div>

          {/* Avatar centered */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'14px 16px 0',position:'relative'}}>
            <div style={{width:88,height:88,borderRadius:'50%',overflow:'hidden',background:'rgba(255,255,255,.2)',border:'3px solid rgba(255,255,255,.5)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(0,0,0,.25)',marginBottom:12}}>
              {user.photo?<img src={user.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:34}}>👤</span>}
            </div>
            <div style={{fontWeight:800,fontSize:20,color:'#fff',textAlign:'center'}}>{user.displayName||user.id}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.65)',marginTop:2}}>@{user.id}</div>
            {(user.country||user.location)&&(
              <div style={{display:'flex',gap:12,marginTop:6,flexWrap:'wrap',justifyContent:'center'}}>
                {user.country&&<span style={{fontSize:11,color:'rgba(255,255,255,.7)',display:'flex',alignItems:'center',gap:3}}><Globe size={10}/>{user.country}</span>}
                {user.location&&<span style={{fontSize:11,color:'rgba(255,255,255,.7)',display:'flex',alignItems:'center',gap:3}}><Home size={10}/>{user.location}</span>}
              </div>
            )}
            {/* Stats row */}
            <div style={{display:'flex',gap:0,marginTop:14,marginBottom:14,background:'rgba(255,255,255,.15)',borderRadius:16,overflow:'hidden',border:'1px solid rgba(255,255,255,.2)'}}>
              <div style={{padding:'10px 20px',textAlign:'center',borderRight:'1px solid rgba(255,255,255,.2)'}}>
                <div style={{fontSize:18,fontWeight:800,color:'#fff',lineHeight:1}}>{visitedMun.size}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,.65)',marginTop:3,textTransform:'uppercase',letterSpacing:'1px'}}>Concelhos</div>
              </div>
              <div style={{padding:'10px 20px',textAlign:'center',borderRight:'1px solid rgba(255,255,255,.2)'}}>
                <div style={{fontSize:18,fontWeight:800,color:'#fff',lineHeight:1}}>{visitedPar?.size||0}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,.65)',marginTop:3,textTransform:'uppercase',letterSpacing:'1px'}}>Freguesias</div>
              </div>
              <div style={{padding:'10px 20px',textAlign:'center'}}>
                <div style={{fontSize:18,fontWeight:800,color:'#fff',lineHeight:1}}>{munPct}%</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,.65)',marginTop:3,textTransform:'uppercase',letterSpacing:'1px'}}>{lvl.label}</div>
              </div>
            </div>
          </div>

          {/* Hexagon navigation tabs */}
          <div style={{display:'flex',justifyContent:'space-around',padding:'4px 8px 20px',position:'relative'}}>
            {TABS.map(t=>(
              <HexButton key={t.key} icon={t.icon} label={t.label} active={tab===t.key} color="rgba(255,255,255,.35)" onClick={()=>setTab(t.key)}/>
            ))}
          </div>
        </div>
      )}

      {/* Edit top bar */}
      {editing && (
        <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'0 16px',paddingTop:'var(--safe-top)',display:'flex',alignItems:'center',height:54,flexShrink:0,gap:10}}>
          <button onClick={()=>setEditing(false)} style={{width:36,height:36,borderRadius:10,border:'1px solid var(--border)',background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text)',flexShrink:0}}>
            <ChevronLeft size={17}/>
          </button>
          <div style={{fontWeight:700,fontSize:15,flex:1}}>Editar perfil</div>
          <button onClick={()=>setEditing(false)} style={{fontSize:12,color:'var(--muted)',fontWeight:600,background:'none',border:'1px solid var(--border)',borderRadius:9,cursor:'pointer',padding:'5px 10px'}}>Cancelar</button>
        </div>
      )}

      {/* Content */}
      <div style={{flex:1,overflowY:'auto'}}>
        {editing
          ?<EditProfilePanel user={user} onSaved={()=>setEditing(false)} color={color}/>
          :<>
            {tab==='explorer'    &&<ExplorerTab visitedMun={visitedMun} visitedPar={visitedPar} idNameMap={idNameMap} color={color}/>}
            {tab==='passport'    &&<PassportTab visitedMun={visitedMun} color={color} onStampClick={onStampClick}/>}
            {tab==='favorites'   &&<FavoritesTab user={user} color={color} onNavigate={onNavigate}/>}
            {tab==='suggestions' &&<SubmissionsTab userId={user.id} color={color}/>}
            {tab==='info'        &&<ProfileInfoTab user={user} onEditProfile={()=>setEditing(true)} color={color}/>}
          </>
        }
      </div>
    </div>
  )
}
