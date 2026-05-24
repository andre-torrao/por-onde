import { useState, useEffect } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { ROUTES } from './data/routes'
import { ChevronDown, MapPin, ExternalLink, Lock, Info } from 'lucide-react'

// ── Stamp item ────────────────────────────────────────────────────────
function StampItem({ item, done, isVisitedOnMap, color, onStampClick, routeId }) {
  const hasStamp = !!item.stamp
  const [pressed, setPressed] = useState(false)

  function handleClick() {
    setPressed(true)
    setTimeout(() => setPressed(false), 200)
    onStampClick?.(item.slug, item.name, routeId)
  }

  return (
    <div onClick={handleClick} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', width:'100%' }}>
      <div style={{
        position:'relative', width:'100%', aspectRatio:'1',
        borderRadius:12, overflow:'hidden',
        transform: pressed ? 'scale(0.93)' : 'scale(1)',
        transition:'transform .15s, box-shadow .15s',
        boxShadow: done ? `0 3px 12px ${color}40` : 'none',
        border: done ? `2px solid ${color}60` : '2px solid transparent',
      }}>
        {hasStamp ? (
          <>
            <img src={item.stamp} alt={item.name} style={{
              width:'100%', height:'100%', objectFit:'cover',
              filter: done ? 'none' : 'grayscale(1) opacity(0.22)',
              transition:'filter .4s ease',
            }}/>
            {/* Info icon overlay — always visible */}
            <div style={{
              position:'absolute', top:4, right:4,
              width:18, height:18, borderRadius:5,
              background:'rgba(255,255,255,.85)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <Info size={11} color={color}/>
            </div>
            {/* Lock when not done */}
            {!done && (
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.05)' }}>
                <Lock size={18} color="rgba(0,0,0,0.18)" strokeWidth={1.5}/>
              </div>
            )}
            {/* Visited badge */}
            {isVisitedOnMap && (
              <div style={{ position:'absolute', bottom:4, left:4, background:color, color:'#fff', borderRadius:5, padding:'1px 5px', fontSize:8, fontWeight:700 }}>✓ mapa</div>
            )}
          </>
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:done?`${color}15`:'#f0f0f0', border:`2px ${done?'solid':'dashed'} ${done?color:'#ccc'}`, borderRadius:10 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:800, color:done?color:'#ccc' }}>✓</div>
              <div style={{ fontSize:8, color:done?color:'#bbb', fontWeight:600 }}>{item.name.split(' ')[0]}</div>
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize:9, fontWeight:done?700:400, color:done?color:'var(--muted)', textAlign:'center', lineHeight:1.2, width:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {item.name}
      </div>
    </div>
  )
}

// ── Static map ────────────────────────────────────────────────────────
function RouteMap({ route }) {
  const [lat, lon] = route.mapCenter
  const z = route.mapZoom
  const x = Math.floor((lon+180)/360*Math.pow(2,z))
  const y = Math.floor((1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*Math.pow(2,z))
  const tileSize = 256
  const tiles = []
  for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) tiles.push({x:x+dx,y:y+dy,dx,dy})

  return (
    <div style={{ borderRadius:12, overflow:'hidden', height:130, background:'#e8eaf0', position:'relative', border:`1px solid ${route.color}30`, marginBottom:12 }}>
      <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', width:tileSize*3, height:tileSize*3, pointerEvents:'none' }}>
        {tiles.map(t=>(
          <img key={`${t.dx}-${t.dy}`} src={`https://tile.openstreetmap.org/${z}/${Math.max(0,t.x)}/${Math.max(0,t.y)}.png`} alt=""
            style={{ position:'absolute', left:(t.dx+1)*tileSize, top:(t.dy+1)*tileSize, width:tileSize, height:tileSize, filter:'saturate(0.45) brightness(1.06)' }}/>
        ))}
      </div>
      <div style={{ position:'absolute', inset:0, background:`${route.color}18`, pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(255,255,255,.9)', borderRadius:7, padding:'3px 8px', fontSize:10, fontWeight:700, color:route.color, display:'flex', alignItems:'center', gap:3 }}>
        <MapPin size={10}/> {route.subtitle.split('·')[0].trim()}
      </div>
      <a href={`https://www.openstreetmap.org/#map=${z}/${lat}/${lon}`} target="_blank" rel="noopener noreferrer"
        style={{ position:'absolute', top:8, right:8, background:'rgba(255,255,255,.9)', borderRadius:7, padding:'3px 8px', fontSize:10, color:route.color, textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
        <ExternalLink size={10}/> Mapa
      </a>
    </div>
  )
}

// ── Route card ────────────────────────────────────────────────────────
function RouteCard({ route, checks, visitedMun, onToggle, onStampClick }) {
  const [open, setOpen] = useState(false)

  function isVisitedInMap(slug) {
    const s = slug.toLowerCase().replace(/-/g,'').replace(/\s/g,'')
    return [...visitedMun].some(id => {
      // IDs are like "ref__sintra", "sintra__42", "sao-pedro-do-sul__88"
      const raw = id.split('__')[0].toLowerCase()
        .replace(/^ref__/, '')
        .replace(/-/g,'').replace(/\s/g,'')
        // handle accents loosely
      return raw === s ||
        raw.normalize('NFD').replace(/[̀-ͯ]/g,'') === s.normalize('NFD').replace(/[̀-ͯ]/g,'')
    })
  }

  const items = route.municipalities
  const completedCount = items.filter(item => isVisitedInMap(item.slug)||!!checks[item.slug]).length
  const total = items.length
  const pct = total>0 ? Math.round(completedCount/total*100) : 0
  const done = completedCount===total
  const hasImages = items.some(i=>i.stamp)

  return (
    <div style={{ background:'var(--surface)', borderRadius:20, marginBottom:14, border:`1.5px solid ${done?route.color:'var(--border)'}`, overflow:'hidden', boxShadow:done?`0 4px 24px ${route.color}30`:'0 2px 8px rgba(0,0,0,.04)', transition:'all .2s' }}>
      {/* Header */}
      <div onClick={()=>setOpen(v=>!v)} style={{ padding:'16px', cursor:'pointer', display:'flex', gap:14, alignItems:'center', background:`linear-gradient(135deg,${route.color}12,${route.color}05)` }}>
        {/* Progress ring */}
        <div style={{ position:'relative', flexShrink:0, width:64, height:64 }}>
          <svg width={64} height={64} viewBox="0 0 64 64">
            <circle cx={32} cy={32} r={28} fill="none" stroke="var(--border)" strokeWidth={5}/>
            <circle cx={32} cy={32} r={28} fill={done?`${route.color}15`:'none'} stroke={route.color} strokeWidth={5}
              strokeDasharray={`${pct/100*176} 176`} strokeLinecap="round" transform="rotate(-90 32 32)" style={{ transition:'stroke-dasharray .6s' }}/>
            {done
              ? <text x={32} y={37} textAnchor="middle" fontSize={22} fill={route.color} fontFamily="serif" fontWeight={900}>✓</text>
              : <text x={32} y={37} textAnchor="middle" fontSize={13} fill={route.color} fontFamily="serif" fontWeight={800}>{pct}%</text>
            }
          </svg>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--text)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{route.name}</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>{route.subtitle}</div>
          <div style={{ height:4, background:'var(--border)', borderRadius:2, overflow:'hidden', marginBottom:3 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:route.color, borderRadius:2, transition:'width .6s' }}/>
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:done?route.color:'inherit', fontWeight:done?700:400 }}>{done?'Rota completa!':`${completedCount} de ${total}`}</span>
            <span>{pct}%</span>
          </div>
        </div>
        <ChevronDown size={16} style={{ color:'var(--muted)', transform:open?'rotate(180deg)':'none', transition:'transform .2s', flexShrink:0 }}/>
      </div>

      {open && (
        <div>
          <div style={{ padding:'12px 16px', background:`${route.color}06`, borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.65, margin:0 }}>{route.description}</p>
          </div>
          <div style={{ padding:'12px 16px 0' }}>
            <RouteMap route={route}/>
          </div>

          {/* Stamps grid */}
          <div style={{ padding:'0 14px 16px' }}>
            {hasImages && (
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:10, padding:'6px 8px', background:`${route.color}08`, borderRadius:8, lineHeight:1.5 }}>
                Toca num carimbo para ver informação sobre o local — depois marca como visitado no card.
                Se já marcaste no mapa, aparece automaticamente como visitado aqui.
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }}>
              {items.map((item,i) => {
                const visitedOnMap = isVisitedInMap(item.slug)
                const checkedHere  = !!checks[item.slug]
                const isDone = visitedOnMap||checkedHere
                return (
                  <StampItem
                    key={item.slug+i}
                    item={item}
                    done={isDone}
                    isVisitedOnMap={visitedOnMap}
                    color={route.color}
                    routeId={route.id}
                    onStampClick={onStampClick}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────
export default function PassportTab({ visitedMun, color, onStampClick }) {
  const { user } = useAuth()
  const [checks, setChecks]   = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.supabaseId) return
    supabase.from('profiles').select('passport_checks').eq('id', user.supabaseId).single()
      .then(({ data }) => { setChecks(data?.passport_checks||{}); setLoading(false) })
  }, [user?.supabaseId])

  async function handleToggle(routeId, slug) {
    const key = `${routeId}__${slug}`
    const next = { ...checks }
    if (next[key]) delete next[key]; else next[key] = true
    setChecks(next)
    await supabase.from('profiles').update({ passport_checks: next }).eq('id', user.supabaseId)
  }

  function getRouteChecks(route) {
    return Object.fromEntries(
      Object.entries(checks).filter(([k])=>k.startsWith(route.id+'__'))
        .map(([k,v])=>[k.replace(route.id+'__',''),v])
    )
  }

  function getRoutePct(route) {
    const done = route.municipalities.filter(item => {
      const s = item.slug.toLowerCase().replace(/-/g,'')
      const vis = [...visitedMun].some(id => {
        const parts = id.split('__')
        const name = (parts[0] === 'ref' ? parts[1] : parts[0]).toLowerCase().replace(/-/g,'')
        return name === s
      })
      return vis||!!checks[`${route.id}__${item.slug}`]
    }).length
    return Math.round(done/route.municipalities.length*100)
  }

  const completedRoutes = ROUTES.filter(r=>getRoutePct(r)===100).length

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
      <div style={{ width:24, height:24, border:`2px solid var(--border)`, borderTopColor:color, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      {/* Passport cover */}
      <div style={{ background:'linear-gradient(145deg,#1C244F,#2D3D6E)', borderRadius:20, padding:'20px', marginBottom:20, boxShadow:'0 8px 32px rgba(28,36,79,.35)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-30, top:-30, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,.05)' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'2.5px', color:'rgba(255,255,255,.45)', marginBottom:4 }}>Passaporte de Viagem · Portugal</div>
          <div style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,.8)', marginBottom:16 }}>{user?.displayName||user?.id}</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
            {ROUTES.map(route => {
              const pct = getRoutePct(route)
              const rdone = pct===100
              const firstStamp = route.municipalities.find(m=>m.stamp)?.stamp
              return (
                <div key={route.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <div style={{ width:44, height:44, borderRadius:10, overflow:'hidden', border:`2px solid ${rdone?route.color:'rgba(255,255,255,.15)'}`, opacity:rdone?1:0.3, transition:'all .3s', background:rdone?'rgba(255,255,255,.1)':'rgba(255,255,255,.05)' }}>
                    {firstStamp
                      ? <img src={firstStamp} alt={route.shortName} style={{ width:'100%', height:'100%', objectFit:'cover', filter:rdone?'none':'grayscale(1)' }}/>
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:11, fontWeight:800, color:rdone?route.color:'rgba(255,255,255,.4)' }}>{route.shortName}</span></div>
                    }
                  </div>
                  <div style={{ fontSize:8, fontWeight:700, color:rdone?'rgba(255,255,255,.7)':'rgba(255,255,255,.2)', textTransform:'uppercase', letterSpacing:'.3px' }}>{route.shortName}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontSize:28, fontWeight:900, color:'#fff', lineHeight:1 }}>{completedRoutes}</span>
            <span style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>de {ROUTES.length} rotas carimbadas</span>
          </div>
          <div style={{ height:4, background:'rgba(255,255,255,.15)', borderRadius:2, overflow:'hidden', marginTop:8 }}>
            <div style={{ height:'100%', width:`${Math.round(completedRoutes/ROUTES.length*100)}%`, background:'rgba(255,255,255,.8)', borderRadius:2, transition:'width .8s' }}/>
          </div>
        </div>
      </div>

      {ROUTES.map(route=>(
        <RouteCard key={route.id} route={route} checks={getRouteChecks(route)} visitedMun={visitedMun} onToggle={handleToggle} onStampClick={onStampClick}/>
      ))}
    </div>
  )
}
