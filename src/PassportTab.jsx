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
    <div onClick={handleClick} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer', width:'100%' }}>
      <div style={{
        position:'relative', width:'100%', aspectRatio:'1',
        borderRadius:10, overflow:'hidden',
        transform: pressed ? 'scale(0.91)' : 'scale(1)',
        transition:'transform .15s',
        boxShadow: done
          ? `0 3px 12px ${color}50, 0 0 0 2px ${color}`
          : '0 1px 4px rgba(0,0,0,0.10)',
        background: done ? 'transparent' : '#e8e8e8',
      }}>
        {item.stamp ? (
          <>
            <img src={item.stamp} alt={item.name} style={{
              position:'absolute', inset:0,
              width:'100%', height:'100%',
              objectFit:'cover', objectPosition:'center',
              display:'block',
              filter: done ? 'none' : 'grayscale(1) brightness(0.55)',
              transition:'filter .4s',
            }}/>
            {!done && (
              <div style={{
                position:'absolute', inset:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(0,0,0,0.05)',
              }}>
                <Lock size={14} color="rgba(255,255,255,0.5)" strokeWidth={2}/>
              </div>
            )}
            {isVisitedOnMap && (
              <div style={{
                position:'absolute', bottom:4, right:4,
                background:color, color:'#fff',
                borderRadius:4, padding:'1px 5px',
                fontSize:7, fontWeight:800, letterSpacing:'0.3px',
                textTransform:'uppercase',
              }}>mapa</div>
            )}
          </>
        ) : (
          <div style={{
            width:'100%', height:'100%',
            display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            background: done ? `${color}20` : '#f0f0f0',
            border:`2px ${done?'solid':'dashed'} ${done?color:'#ccc'}`,
          }}>
            <div style={{ fontSize:16, fontWeight:800, color:done?color:'#ccc' }}>✓</div>
            <div style={{ fontSize:7, color:done?color:'#bbb', fontWeight:600, textAlign:'center', padding:'0 4px', marginTop:2 }}>
              {item.name.split(' ')[0]}
            </div>
          </div>
        )}
      </div>
      {/* Name below stamp */}
      <div style={{
        fontSize:9, fontWeight: done ? 700 : 500,
        color: done ? 'var(--text)' : 'var(--muted)',
        textAlign:'center', lineHeight:1.25, width:'100%',
        overflow:'hidden', display:'-webkit-box',
        WebkitLineClamp:2, WebkitBoxOrient:'vertical',
      }}>
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

      {/* Hero banner — colored strip with route name */}
      <div style={{ background:`linear-gradient(135deg, ${route.color}, ${route.color}cc)`, padding:'16px 18px 18px', flexShrink:0, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,.08)' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.65)', fontWeight:600, textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:4 }}>{route.subtitle}</div>
          <div style={{ height:5, background:'rgba(255,255,255,.2)', borderRadius:3, overflow:'hidden', marginBottom:5 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'rgba(255,255,255,.85)', borderRadius:3, transition:'width .8s' }}/>
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', display:'flex', justifyContent:'space-between' }}>
            <span>{completedCount} de {total} visitados</span>
            <span style={{ fontWeight:700 }}>{pct}%</span>
          </div>
        </div>
      </div>

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
    <div style={{ padding:'14px 14px 100px' }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--muted)', marginBottom:12 }}>
        Seleciona uma rota para explorar
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {routes.map(route => {
          const pct = getRoutePct(route)
          const done = pct === 100
          const total = route.municipalities.length
          return (
            <button key={route.id} onClick={() => onSelectRoute(route)} style={{
              position:'relative',
              borderRadius:14,
              overflow:'hidden',
              border: done ? `2px solid ${route.color}` : '2px solid transparent',
              background: route.color,
              cursor:'pointer',
              padding:0,
              textAlign:'left',
              boxShadow: done ? `0 6px 24px ${route.color}55` : '0 2px 10px rgba(0,0,0,.12)',
              transition:'transform .15s, box-shadow .15s',
              display:'block',
              width:'100%',
              // paddingTop trick: reliable aspect ratio on all iOS/Android
              paddingTop:'150%',
              height:0,
            }}>
              {/* Cover image — fills entire card, no gaps */}
              {route.cover ? (
                <img
                  src={route.cover}
                  alt={route.name}
                  style={{
                    position:'absolute', inset:0,
                    width:'100%', height:'100%',
                    objectFit:'cover', objectPosition:'center top',
                    display:'block',
                  }}
                />
              ) : (
                <div style={{
                  position:'absolute', inset:0,
                  background:`linear-gradient(145deg, ${route.color}, ${route.color}88)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <span style={{ fontSize:36, fontWeight:900, color:'rgba(255,255,255,.25)' }}>{route.shortName}</span>
                </div>
              )}

              {/* Strong gradient at bottom for text legibility */}
              <div style={{
                position:'absolute', inset:0,
                background:'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.88) 100%)',
                pointerEvents:'none',
              }}/>

              {/* Subtle top vignette */}
              <div style={{
                position:'absolute', inset:0,
                background:'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, transparent 30%)',
                pointerEvents:'none',
              }}/>

              {/* Route name + progress at bottom */}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0 10px 10px' }}>
                <div style={{
                  fontSize:12, fontWeight:800, color:'#fff',
                  lineHeight:1.25, marginBottom:5,
                  textShadow:'0 1px 4px rgba(0,0,0,.5)',
                  letterSpacing:'0.1px',
                }}>
                  {route.name}
                </div>
                <div style={{ height:3, background:'rgba(255,255,255,.22)', borderRadius:2, overflow:'hidden', marginBottom:4 }}>
                  <div style={{
                    height:'100%', width:`${pct}%`,
                    background: done ? '#fff' : 'rgba(255,255,255,0.85)',
                    borderRadius:2, transition:'width .6s',
                  }}/>
                </div>
                <div style={{ fontSize:9, color:'rgba(255,255,255,.75)', fontWeight:700, letterSpacing:'0.3px' }}>
                  {done ? '✓ Rota completa' : pct === 0 ? `${total} paragens` : `${pct}% · ${Math.round(total*pct/100)}/${total}`}
                </div>
              </div>

              {/* COMPLETO badge */}
              {done && (
                <div style={{
                  position:'absolute', top:8, left:8,
                  background:'rgba(255,255,255,0.95)', color:route.color,
                  borderRadius:6, padding:'2px 7px',
                  fontSize:8, fontWeight:900, letterSpacing:'0.5px',
                  textTransform:'uppercase',
                }}>✓ Completo</div>
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
