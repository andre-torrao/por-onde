import { useState, useEffect } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { ROUTES } from './data/routes'
import { ChevronLeft, ChevronDown, MapPin, ExternalLink, Lock } from 'lucide-react'

// ── Stamp item ─────────────────────────────────────────────────────────
function StampItem({ item, done, isVisitedOnMap, color, onToggle }) {
  const [pressed, setPressed] = useState(false)

  function handleClick() {
    setPressed(true)
    setTimeout(() => setPressed(false), 180)
    if (!isVisitedOnMap) onToggle?.(item.slug)
  }

  return (
    <div onClick={handleClick} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', width:'100%' }}>
      <div style={{
        position:'relative', width:'100%', aspectRatio:'1',
        borderRadius:10, overflow:'hidden',
        transform: pressed ? 'scale(0.92)' : 'scale(1)',
        transition:'transform .15s',
        border: done ? `2px solid ${color}70` : '2px solid transparent',
        boxShadow: done ? `0 3px 10px ${color}35` : 'none',
      }}>
        {item.stamp ? (
          <>
            <img src={item.stamp} alt={item.name} style={{
              width:'100%', height:'100%', objectFit:'cover',
              filter: done ? 'none' : 'grayscale(1) opacity(0.2)',
              transition:'filter .4s',
            }}/>
            {!done && (
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Lock size={16} color="rgba(0,0,0,0.18)" strokeWidth={1.5}/>
              </div>
            )}
            {isVisitedOnMap && (
              <div style={{ position:'absolute', bottom:3, left:3, background:color, color:'#fff', borderRadius:4, padding:'1px 5px', fontSize:8, fontWeight:700 }}>mapa</div>
            )}
          </>
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:done?`${color}15`:'#f0f0f0', border:`2px ${done?'solid':'dashed'} ${done?color:'#ccc'}`, borderRadius:8 }}>
            <div style={{ fontSize:14, fontWeight:800, color:done?color:'#ccc' }}>✓</div>
            <div style={{ fontSize:8, color:done?color:'#bbb', fontWeight:600, textAlign:'center', padding:'0 4px' }}>{item.name.split(' ')[0]}</div>
          </div>
        )}
      </div>
      <div style={{ fontSize:9, fontWeight:done?700:400, color:done?color:'var(--muted)', textAlign:'center', lineHeight:1.2, width:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {item.name}
      </div>
    </div>
  )
}

// ── Static map ─────────────────────────────────────────────────────────
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

// ── Route detail page ──────────────────────────────────────────────────
function RouteDetail({ route, checks, visitedMun, onToggle, onBack, color }) {
  function extractMapName(id) {
    const parts = id.split('__')
    const name = parts[0] === 'ref' ? parts[1] : parts[0]
    return name.toLowerCase().replace(/-/g,'').replace(/\s/g,'')
  }
  function isVisitedInMap(slug) {
    const s = slug.toLowerCase().replace(/-/g,'').replace(/\s/g,'')
    return [...visitedMun].some(id => extractMapName(id) === s)
  }

  const items = route.municipalities
  const completedCount = items.filter(item => isVisitedInMap(item.slug)||!!checks[item.slug]).length
  const total = items.length
  const pct = Math.round(completedCount/total*100)
  const done = completedCount === total

  return (
    <div style={{ position:'fixed', inset:0, zIndex:3500, background:'var(--bg)', display:'flex', flexDirection:'column', animation:'slideLeft .25s cubic-bezier(.4,0,.2,1)' }}>
      {/* Top bar */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 16px', paddingTop:'var(--safe-top)', display:'flex', alignItems:'center', height:54, flexShrink:0, gap:10 }}>
        <button onClick={onBack} style={{ width:36,height:36,borderRadius:10,border:'1px solid var(--border)',background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text)',flexShrink:0 }}>
          <ChevronLeft size={17}/>
        </button>
        <div style={{ fontWeight:700, fontSize:15, flex:1, color:'var(--text)' }}>{route.name}</div>
        <div style={{ background:done?route.color:`${route.color}20`, color:done?'#fff':route.color, borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>
          {done ? 'Completo!' : `${pct}%`}
        </div>
      </div>

      {/* Hero — cover or gradient */}
      {route.cover ? (
        <div style={{ position:'relative', height:180, flexShrink:0, overflow:'hidden' }}>
          <img src={route.cover} alt={route.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.7))' }}/>
          <div style={{ position:'absolute', bottom:14, left:16, right:16 }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:600, textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:3 }}>{route.subtitle}</div>
            <div style={{ height:4, background:'rgba(255,255,255,.25)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'rgba(255,255,255,.85)', borderRadius:2, transition:'width .8s' }}/>
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.65)', marginTop:4 }}>{completedCount} de {total} visitados</div>
          </div>
        </div>
      ) : (
        <div style={{ background:`linear-gradient(135deg,${route.color},${route.color}99)`, padding:'16px', flexShrink:0 }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.75)', marginBottom:8 }}>{route.subtitle}</div>
          <div style={{ height:5, background:'rgba(255,255,255,.2)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'rgba(255,255,255,.85)', borderRadius:3 }}/>
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', marginTop:4 }}>{completedCount} de {total} visitados</div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px 80px' }}>
        <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.65, marginBottom:14, padding:'10px 12px', background:`${route.color}08`, borderRadius:10, borderLeft:`3px solid ${route.color}` }}>
          {route.description}
        </div>

        <RouteMap route={route}/>

        {/* Stamp grid */}
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:10 }}>
          {items.some(i=>i.stamp) ? 'Carimbos — toca para marcar' : 'Municípios da rota'}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {items.map((item,i) => {
            const visitedOnMap = isVisitedInMap(item.slug)
            const isDone = visitedOnMap || !!checks[item.slug]
            return (
              <StampItem key={item.slug+i} item={item} done={isDone} isVisitedOnMap={visitedOnMap}
                color={route.color} onToggle={slug => onToggle(route.id, slug)}/>
            )
          })}
        </div>

        {item => item.note && (
          <div style={{ marginTop:6, fontSize:10, color:'var(--muted)', textAlign:'center' }}>Toca num carimbo a cinzento para marcar como visitado</div>
        )}
      </div>
    </div>
  )
}

// ── Cover grid (main passport view) ───────────────────────────────────
function PassportCover({ routes, getRoutePct, onSelectRoute }) {
  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--muted)', marginBottom:14 }}>
        Seleciona uma rota para explorar
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {routes.map(route => {
          const pct = getRoutePct(route)
          const done = pct === 100
          return (
            <button key={route.id} onClick={() => onSelectRoute(route)} style={{
              position:'relative', borderRadius:16, overflow:'hidden',
              border:`2px solid ${done?route.color:'var(--border)'}`,
              background:'var(--surface)',
              cursor:'pointer', padding:0, textAlign:'left',
              boxShadow: done ? `0 4px 20px ${route.color}40` : '0 2px 8px rgba(0,0,0,.06)',
              transition:'all .2s',
              aspectRatio: '3/4',
            }}>
              {/* Cover image */}
              {route.cover ? (
                <img src={route.cover} alt={route.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
              ) : (
                <div style={{ width:'100%', height:'100%', background:`linear-gradient(145deg,${route.color},${route.color}88)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:32, fontWeight:900, color:'rgba(255,255,255,.3)' }}>{route.shortName}</span>
                </div>
              )}
              {/* Gradient overlay */}
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,.75))' }}/>
              {/* Text */}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'10px 12px' }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:3 }}>{route.name}</div>
                {/* Progress bar */}
                <div style={{ height:3, background:'rgba(255,255,255,.25)', borderRadius:2, overflow:'hidden', marginBottom:4 }}>
                  <div style={{ height:'100%', width:`${pct}%`, background: done ? '#fff' : route.color, borderRadius:2, transition:'width .6s' }}/>
                </div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', fontWeight:600 }}>
                  {done ? '✓ Completo' : `${pct}% concluído`}
                </div>
              </div>
              {/* Done badge */}
              {done && (
                <div style={{ position:'absolute', top:8, right:8, background:route.color, color:'#fff', borderRadius:20, padding:'3px 8px', fontSize:9, fontWeight:800 }}>COMPLETO</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────
export default function PassportTab({ visitedMun, color }) {
  const { user } = useAuth()
  const [checks, setChecks]       = useState({})
  const [loading, setLoading]     = useState(true)
  const [activeRoute, setActive]  = useState(null)

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

  function extractMapName(id) {
    const parts = id.split('__')
    const name = parts[0] === 'ref' ? parts[1] : parts[0]
    return name.toLowerCase().replace(/-/g,'').replace(/\s/g,'')
  }

  function getRoutePct(route) {
    const done = route.municipalities.filter(item => {
      const s = item.slug.toLowerCase().replace(/-/g,'')
      const vis = [...visitedMun].some(id => extractMapName(id) === s)
      return vis || !!checks[`${route.id}__${item.slug}`]
    }).length
    return Math.round(done/route.municipalities.length*100)
  }

  const completedRoutes = ROUTES.filter(r=>getRoutePct(r)===100).length

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
      <div style={{ width:24, height:24, border:`2px solid var(--border)`, borderTopColor:color, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
    </div>
  )

  // Show route detail page
  if (activeRoute) {
    return (
      <RouteDetail
        route={activeRoute}
        checks={getRouteChecks(activeRoute)}
        visitedMun={visitedMun}
        onToggle={handleToggle}
        onBack={() => setActive(null)}
        color={color}
      />
    )
  }

  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      {/* Passport header */}
      <div style={{ background:'linear-gradient(145deg,#1C244F,#2D3D6E)', padding:'18px 16px 16px', marginBottom:0, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.05)' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'2.5px', color:'rgba(255,255,255,.45)', marginBottom:3 }}>Passaporte de Viagem · Portugal</div>
          <div style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,.85)', marginBottom:12 }}>{user?.displayName||user?.id}</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontSize:26, fontWeight:900, color:'#fff', lineHeight:1 }}>{completedRoutes}</span>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.5)' }}>de {ROUTES.length} rotas completas</span>
          </div>
          <div style={{ height:3, background:'rgba(255,255,255,.15)', borderRadius:2, overflow:'hidden', marginTop:8 }}>
            <div style={{ height:'100%', width:`${Math.round(completedRoutes/ROUTES.length*100)}%`, background:'rgba(255,255,255,.8)', borderRadius:2, transition:'width .8s' }}/>
          </div>
        </div>
      </div>

      <PassportCover routes={ROUTES} getRoutePct={getRoutePct} onSelectRoute={setActive}/>
    </div>
  )
}
