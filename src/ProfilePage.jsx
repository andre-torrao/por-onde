import { useState, useRef, useEffect } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { ChevronLeft, Camera, Check, Globe, Edit3, Eye, EyeOff, Star, Trash2, Home, MapPin, TrendingUp, Lock, Palette, X } from 'lucide-react'
import PassportTab from './PassportTab'
import idToNameData from './data/idToName.json'
import { getSuggestionsForUser } from './storage'

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
  '#85A898','#F5E2B0','#135768','#5270A1','#2D3D6E','#EDC366',
  '#11406B','#30608C','#F2D230','#DB750F','#E0639F','#FF8C8E',
  '#C44F88','#631662','#1C244F',
]

const CATS = [
  { key:'visit', label:'Visitar',    color:'#ff6b6b' },
  { key:'food',  label:'Gastronomia',color:'#4ea8de' },
  { key:'sweet', label:'Doçaria',    color:'#9b72cf' },
  { key:'fest',  label:'Evento',     color:'#43c59e' },
  { key:'other', label:'Outro',      color:'#6b7694' },
]
const COUNTRIES = ['Portugal','Brasil','Angola','Moçambique','Cabo Verde','Guiné-Bissau','Espanha','França','Reino Unido','Alemanha','Suíça','Estados Unidos','Canadá','Outro']

// ── Segmented ring ────────────────────────────────────────────────────
function RingChart({ pct, color, size=180 }) {
  const segments = 36, filled = Math.round(pct/100*segments)
  const r = 64, cx = size/2, cy = size/2
  const gap = 5, segA = (360 - segments*gap)/segments
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({length:segments}).map((_,i) => {
        const s=(i*(segA+gap)-90)*Math.PI/180, e=(i*(segA+gap)-90+segA)*Math.PI/180
        const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s),x2=cx+r*Math.cos(e),y2=cy+r*Math.sin(e)
        const f=i<filled
        return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
          fill={f?color:'#e0e8f0'} opacity={f?(0.4+(i/Math.max(filled,1))*0.6):1}/>
      })}
      <circle cx={cx} cy={cy} r={r-20} fill="white"/>
    </svg>
  )
}

// ── Color picker ──────────────────────────────────────────────────────
function ColorPicker({ color: currentColor }) {
  const { user, updateProfile } = useAuth()
  const cur = currentColor || user?.markColor || '#6c63ff'
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'16px', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <div style={{ width:32,height:32,borderRadius:9,background:`${cur}20`,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Palette size={15} color={cur}/>
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Escolha a sua cor</span>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {MARK_COLORS.map(hex => {
          const selected = cur === hex
          return (
            <button key={hex} onClick={async () => {
              console.log('ColorPicker: selecting', hex)
              await updateProfile({ markColor: hex })
              console.log('ColorPicker: done')
            }} style={{
              width:36, height:36, borderRadius:10, background:hex, border:'none',
              cursor:'pointer', position:'relative', flexShrink:0, transition:'transform .15s, box-shadow .15s',
              transform: selected ? 'scale(1.2)' : 'scale(1)',
              boxShadow: selected ? `0 0 0 3px white, 0 0 0 5px ${hex}` : `0 2px 6px ${hex}60`,
            }}>
              {selected && <Check size={14} color="#fff" style={{position:'absolute',inset:0,margin:'auto'}}/>}
            </button>
          )
        })}
      </div>
    </div>
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

  const lastVisited = [...(isMun?visitedMun:visitedPar)].slice(-10).reverse().map(id => {
    const val=idNameMap.get(id)
    if(val) return {name:typeof val==='string'?val:val?.displayName||val?.name,id}
    return {name:idToNameData[id]||id.replace(/__\d+$/,'').replace(/-/g,' '),id}
  }).filter(x=>x.name)

  return (
    <div style={{padding:'16px 16px 100px'}}>
      {/* Sub-tabs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[
          {key:'municipalities',label:'Concelhos',count:munCount,pct:munPct,total:TOTAL_MUN},
          {key:'parishes',label:'Freguesias',count:parCount,pct:parPct,total:TOTAL_PAR},
        ].map(t => (
          <button key={t.key} onClick={()=>setSub(t.key)} style={{
            padding:'14px 12px',borderRadius:16,border:'2px solid',
            borderColor:sub===t.key?color:'var(--border)',
            background:sub===t.key?`${color}12`:'var(--surface)',
            cursor:'pointer',transition:'all .18s',textAlign:'left',
            boxShadow:sub===t.key?`0 4px 16px ${color}25`:'none',
          }}>
            <div style={{fontSize:28,fontWeight:900,color:sub===t.key?color:'var(--muted)',lineHeight:1}}>{t.count}</div>
            <div style={{fontSize:12,fontWeight:700,color:sub===t.key?color:'var(--muted)',marginTop:3}}>{t.label}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>de {t.total} · {t.pct}%</div>
          </button>
        ))}
      </div>

      {/* Ring + level */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:'20px 16px 16px',marginBottom:14,boxShadow:`0 4px 20px ${color}10`}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{position:'relative',width:130,height:130,flexShrink:0}}>
            <RingChart pct={pct} color={color} size={130}/>
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <div style={{fontSize:28,fontWeight:900,color,lineHeight:1}}>{pct}%</div>
              <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>de {total}</div>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:4}}>Nível atual</div>
            <div style={{fontSize:20,fontWeight:800,color,marginBottom:4}}>{lvl.label}</div>
            {nextLvl && <div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>Próximo: <strong style={{color}}>{nextLvl.label}</strong> aos {nextLvl.min}%</div>}
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

      {/* Stats cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
        <div style={{background:'var(--surface)',border:`1px solid ${color}25`,borderRadius:14,padding:'13px 14px',borderLeft:`3px solid ${color}`}}>
          <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px',marginBottom:4}}>Visitados</div>
          <div style={{fontSize:22,fontWeight:800,color}}>{count}</div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{pct}% do total</div>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'13px 14px',borderLeft:'3px solid var(--border2)'}}>
          <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px',marginBottom:4}}>Por visitar</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--muted)'}}>{total-count}</div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{100-pct}% do total</div>
        </div>
      </div>

      {/* Last visited list */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden',boxShadow:`0 2px 12px ${color}08`}}>
        <div style={{padding:'12px 16px 8px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:color}}/>
          <span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)'}}>
            Últim{isMun?'os concelhos':'as freguesias'} visitad{isMun?'os':'as'}
          </span>
        </div>
        {lastVisited.length===0 ? (
          <div style={{padding:'20px 16px',fontSize:13,color:'var(--muted)',fontStyle:'italic'}}>
            Ainda nenhum{isMun?'':'a'} visitad{isMun?'o':'a'}. Abre o mapa!
          </div>
        ) : (
          <div>
            {lastVisited.map(({name,id},i) => (
              <div key={id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:i<lastVisited.length-1?'1px solid var(--border)':'none'}}>
                <div style={{width:24,height:24,borderRadius:7,background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontSize:10,fontWeight:800,color}}>{i+1}</span>
                </div>
                <span style={{fontSize:13,fontWeight:500,color:'var(--text)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span>
                <MapPin size={11} style={{color,flexShrink:0}}/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Profile info tab ──────────────────────────────────────────────────
function ProfileInfoTab({ user, onEditProfile, color }) {
  const fields = [
    {label:'Username', value:user?.id},
    {label:'Nome',     value:user?.displayName||'—'},
    {label:'Email',    value:user?.email},
    {label:'País',     value:user?.country||'—'},
    {label:'Localidade', value:user?.location||'—'},
  ]
  return (
    <div style={{padding:'16px 16px 100px'}}>
      {/* Profile card — inspired by cycling app */}
      <div style={{background:`linear-gradient(145deg,${color},${color}bb)`,borderRadius:20,padding:'20px',marginBottom:16,position:'relative',overflow:'hidden',boxShadow:`0 8px 32px ${color}40`}}>
        <div style={{position:'absolute',right:-20,top:-20,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,.1)'}}/>
        <div style={{position:'absolute',right:10,bottom:-15,width:60,height:60,borderRadius:'50%',background:'rgba(255,255,255,.07)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:14,position:'relative'}}>
          <div style={{width:64,height:64,borderRadius:18,overflow:'hidden',background:'rgba(255,255,255,.2)',border:'2px solid rgba(255,255,255,.4)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(0,0,0,.2)'}}>
            {user?.photo?<img src={user.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:28}}>👤</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:20,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.displayName||user?.id}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.65)',marginTop:2}}>@{user?.id}</div>
            <div style={{display:'flex',gap:10,marginTop:5,flexWrap:'wrap'}}>
              {user?.country  && <span style={{fontSize:11,color:'rgba(255,255,255,.7)',display:'flex',alignItems:'center',gap:3}}><Globe size={10}/> {user.country}</span>}
              {user?.location && <span style={{fontSize:11,color:'rgba(255,255,255,.7)',display:'flex',alignItems:'center',gap:3}}><Home size={10}/> {user.location}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Info list */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden',marginBottom:14,boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
        {fields.map((f,i) => (
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
      <ColorPicker color={color}/>

      {/* Edit button */}
      <button onClick={onEditProfile} style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderRadius:14,border:'none',background:color,cursor:'pointer',width:'100%',boxShadow:`0 4px 16px ${color}50`}}>
        <Edit3 size={15} color="#fff"/>
        <span style={{fontSize:14,fontWeight:700,color:'#fff'}}>Editar perfil</span>
        <ChevronLeft size={14} color="rgba(255,255,255,.7)" style={{transform:'rotate(180deg)',marginLeft:'auto'}}/>
      </button>
    </div>
  )
}

// ── Favorites tab ─────────────────────────────────────────────────────
function FavoritesTab({ user, color }) {
  const [favorites,setFavorites]=useState([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    if(!user?.supabaseId) return
    supabase.from('profiles').select('favorites').eq('id',user.supabaseId).single()
      .then(({data})=>{setFavorites(data?.favorites||[]);setLoading(false)})
  },[user?.supabaseId])
  async function remove(id){
    const next=favorites.filter(f=>f.id!==id); setFavorites(next)
    await supabase.from('profiles').update({favorites:next}).eq('id',user.supabaseId)
  }
  if(loading) return <div style={{display:'flex',justifyContent:'center',padding:48}}><div style={{width:24,height:24,border:'2px solid var(--border)',borderTopColor:color,borderRadius:'50%',animation:'spin .7s linear infinite'}}/></div>
  if(favorites.length===0) return (
    <div style={{textAlign:'center',padding:'60px 28px'}}>
      <div style={{width:64,height:64,borderRadius:18,background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',border:`1px solid ${color}25`}}>
        <Star size={28} color={color}/>
      </div>
      <div style={{fontSize:17,fontWeight:700,color:'var(--text)',marginBottom:8}}>Nenhum favorito ainda</div>
      <div style={{fontSize:13,lineHeight:1.7,color:'var(--muted)'}}>Toca na estrela numa localidade para guardar para as próximas viagens.</div>
    </div>
  )
  return (
    <div style={{padding:'16px 16px 100px'}}>
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>{favorites.length} localidade{favorites.length!==1?'s':''} guardada{favorites.length!==1?'s':''}</div>
      {favorites.map(f=>{
        const isMun=f.level!=='parishes'
        return (
          <div key={f.id} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 14px',borderRadius:16,marginBottom:8,background:'var(--surface)',border:'1px solid var(--border)',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
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
            <button onClick={()=>remove(f.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--border2)',padding:8,borderRadius:8,display:'flex'}}><Trash2 size={15}/></button>
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
      <div style={{width:64,height:64,borderRadius:18,background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',border:`1px solid ${color}25`}}>
        <TrendingUp size={28} color={color}/>
      </div>
      <div style={{fontSize:17,fontWeight:700,color:'var(--text)',marginBottom:8}}>Nenhuma sugestão ainda</div>
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
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>{submissions.length} submissão{submissions.length!==1?'ões':''}</div>
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

// ── Edit profile panel ────────────────────────────────────────────────
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
      {/* Photo */}
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
      {/* Read-only */}
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
        <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Mínimo 4 caracteres.</div>
      </div>
      <button onClick={save} disabled={busy||saved} style={{width:'100%',padding:'14px',borderRadius:14,border:'none',background:saved?'#43c59e':color,color:'#fff',fontSize:14,fontWeight:700,cursor:busy||saved?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:20,boxShadow:saved?'none':`0 4px 20px ${color}50`}}>
        {saved?<><Check size={15}/> Guardado!</>:busy?'A guardar…':'Guardar alterações'}
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────
export default function ProfilePage({ visitedMun, visitedPar, idNameMap, level, onClose }) {
  const {user,logout}=useAuth()
  const [tab,setTab]=useState('explorer')
  const [editing,setEditing]=useState(false)
  const munPct=Math.round((visitedMun?.size||0)/TOTAL_MUN*100)
  const color=user?.markColor||'#6c63ff'
  const lvl=getLevel(munPct)
  const TABS=[
    {key:'explorer',   label:'Explorador'},
    {key:'passport',   label:'Passaporte'},
    {key:'favorites',  label:'Favoritos'},
    {key:'suggestions',label:'Sugestões'},
    {key:'info',       label:'O Meu Perfil'},
  ]
  if(!user) return null
  return (
    <div style={{position:'fixed',inset:0,zIndex:2000,background:'var(--bg)',display:'flex',flexDirection:'column',animation:'slideLeft .28s cubic-bezier(.4,0,.2,1)'}}>
      {/* Top bar */}
      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'0 16px',paddingTop:'var(--safe-top)',display:'flex',alignItems:'center',height:54,flexShrink:0,gap:10}}>
        <button onClick={onClose} style={{width:36,height:36,borderRadius:10,border:'1px solid var(--border)',background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text)',flexShrink:0}}>
          <ChevronLeft size={17}/>
        </button>
        <div style={{fontWeight:700,fontSize:15,flex:1}}>{editing?'Editar perfil':'O meu perfil'}</div>
        {!editing
          ?<button onClick={logout} style={{fontSize:12,color:'#ff6b6b',fontWeight:700,background:'#fff1f1',border:'1px solid rgba(255,107,107,.25)',borderRadius:9,cursor:'pointer',padding:'6px 12px'}}>Sair</button>
          :<button onClick={()=>setEditing(false)} style={{fontSize:12,color:'var(--muted)',fontWeight:600,background:'none',border:'1px solid var(--border)',borderRadius:9,cursor:'pointer',padding:'6px 12px'}}>Cancelar</button>
        }
      </div>
      {/* Tab bar */}
      {!editing&&(
        <div style={{display:'flex',background:'var(--surface)',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{
              flex:1,padding:'10px 2px 9px',border:'none',
              borderBottom:`2.5px solid ${tab===t.key?color:'transparent'}`,
              background:'transparent',color:tab===t.key?color:'var(--muted)',
              fontSize:11,fontWeight:tab===t.key?700:500,cursor:'pointer',whiteSpace:'nowrap',minWidth:70,transition:'all .15s',
            }}>{t.label}</button>
          ))}
        </div>
      )}
      {/* Content */}
      <div style={{flex:1,overflowY:'auto'}}>
        {editing
          ?<EditProfilePanel user={user} onSaved={()=>setEditing(false)} color={color}/>
          :<>
            {tab==='explorer'    &&<ExplorerTab visitedMun={visitedMun} visitedPar={visitedPar} idNameMap={idNameMap} color={color}/>}
            {tab==='passport'    &&<PassportTab visitedMun={visitedMun} color={color}/>}
            {tab==='favorites'   &&<FavoritesTab user={user} color={color}/>}
            {tab==='suggestions' &&<SubmissionsTab userId={user.id} color={color}/>}
            {tab==='info'        &&<ProfileInfoTab user={user} onEditProfile={()=>setEditing(true)} color={color}/>}
          </>
        }
      </div>
    </div>
  )
}
