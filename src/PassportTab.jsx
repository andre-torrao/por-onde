import { useState, useEffect } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { ROUTES } from './data/routes'
import { Check, ChevronDown, MapPin, ExternalLink } from 'lucide-react'

// ── Passport stamp SVG ────────────────────────────────────────────────
function PassportStamp({ route, done, pct, size = 100 }) {
  const { color, shortName, name } = route
  const cx = size / 2, cy = size / 2
  const r1 = size * 0.45, r2 = size * 0.36
  const sid = `stamp-${route.id}`

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:'block', filter: done ? 'none' : 'grayscale(0.7)', opacity: done ? 1 : 0.35 }}>
      <defs>
        <path id={sid} d={`M ${cx},${cy} m -${r1},0 a ${r1},${r1} 0 1,1 ${r1*2},0 a ${r1},${r1} 0 1,1 -${r1*2},0`}/>
      </defs>
      {/* Outer dashed ring */}
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 2.5"/>
      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={r2} fill={done ? `${color}15` : 'transparent'} stroke={color} strokeWidth={1.5}/>
      {/* Curved text */}
      <text fontSize={size*0.075} fontWeight={800} fill={color} letterSpacing={1.2} fontFamily="'Georgia', serif">
        <textPath href={`#${sid}`} startOffset="8%">{name.toUpperCase()} · PORTUGAL ·</textPath>
      </text>
      {/* Center icon or pct */}
      {done ? (
        <>
          <text x={cx} y={cy + size*0.06} textAnchor="middle" fontSize={size*0.28} fill={color} fontFamily="serif" fontWeight={900}>✓</text>
          <text x={cx} y={cy + size*0.22} textAnchor="middle" fontSize={size*0.09} fill={color} fontFamily="'Georgia',serif" fontWeight={700} letterSpacing={1}>VISITADO</text>
        </>
      ) : (
        <>
          <text x={cx} y={cy + size*0.07} textAnchor="middle" fontSize={size*0.22} fill={color} fontFamily="serif" fontWeight={900}>{pct}%</text>
          <text x={cx} y={cy + size*0.22} textAnchor="middle" fontSize={size*0.08} fill={color} fontFamily="'Georgia',serif" letterSpacing={0.8}>EM CURSO</text>
        </>
      )}
      {/* Stars bottom */}
      {[0.3, 0.5, 0.7].map((t, i) => {
        const angle = (t * Math.PI)
        const sx = cx + r2 * 0.75 * Math.cos(angle + Math.PI * 0.5)
        const sy = cy + r2 * 0.75 * Math.sin(angle + Math.PI * 0.5)
        return <text key={i} x={sx} y={sy+3} textAnchor="middle" fontSize={size*0.08} fill={color} opacity={0.6}>★</text>
      })}
    </svg>
  )
}

// ── Decorative "carimbo" sticker shown when route section is open ──────
function CarimboSticker({ route, done, pct }) {
  const { color, shortName, icon } = route
  const size = 110
  const cx = size/2, cy = size/2
  const r = size * 0.43
  const sid = `carimbo-${route.id}`

  // Rotation for authenticity
  const rotation = (route.id.charCodeAt(0) % 30) - 15

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ transform:`rotate(${rotation}deg)`, filter: done ? 'none' : 'grayscale(.6)', opacity: done ? 1 : 0.4, transition:'all .3s' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <path id={sid} d={`M ${cx},${cy} m -${r},0 a ${r},${r} 0 1,1 ${r*2},0 a ${r},${r} 0 1,1 -${r*2},0`}/>
          </defs>
          {/* Background tint if done */}
          {done && <circle cx={cx} cy={cy} r={r} fill={`${color}12`}/>}
          {/* Outer border — thick stamp style */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={3}/>
          <circle cx={cx} cy={cy} r={r - 6} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 2"/>
          {/* Curved name text */}
          <text fontSize={8} fontWeight={800} fill={color} letterSpacing={1.5} fontFamily="'Georgia',serif">
            <textPath href={`#${sid}`} startOffset="5%">{route.name.toUpperCase()} ·</textPath>
          </text>
          {/* Center: icon large */}
          <text x={cx} y={cy+10} textAnchor="middle" fontSize={30} fill={color} style={{ filter:`drop-shadow(0 1px 2px ${color}40)` }}>
            {done ? '✅' : icon}
          </text>
          {/* PORTUGAL text */}
          <text x={cx} y={cy + 30} textAnchor="middle" fontSize={8} fill={color} fontFamily="'Georgia',serif" fontWeight={700} letterSpacing={1.5}>PORTUGAL</text>
          {/* Date if done */}
          {done && (
            <text x={cx} y={cy + 40} textAnchor="middle" fontSize={7} fill={color} fontFamily="'Georgia',serif" opacity={0.8}>
              {new Date().toLocaleDateString('pt-PT', {day:'2-digit',month:'short',year:'numeric'}).toUpperCase()}
            </text>
          )}
        </svg>
      </div>
      <div style={{ fontSize:10, fontWeight:700, color: done?color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px' }}>
        {done ? 'Carimbo obtido!' : `${pct}% concluído`}
      </div>
    </div>
  )
}

// ── Static map preview ────────────────────────────────────────────────
function RouteMap({ route }) {
  const [lat, lon] = route.mapCenter
  const zoom = route.mapZoom
  // Use a static image tile from OpenStreetMap (no WebGL needed)
  // Calculate tile coordinates
  const z = zoom
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, z))
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z))

  // Use multiple tiles for a wider view
  const tiles = []
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      tiles.push({ x: x+dx, y: y+dy, dx, dy })
    }
  }

  const tileSize = 256
  const mapW = 320, mapH = 140

  return (
    <div style={{ borderRadius:12, overflow:'hidden', height:mapH, background:'#e8eaf0', position:'relative', border:`1px solid ${route.color}30` }}>
      {/* Tile grid */}
      <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', width:tileSize*3, height:tileSize*3, pointerEvents:'none' }}>
        {tiles.map(t => (
          <img
            key={`${t.dx}-${t.dy}`}
            src={`https://tile.openstreetmap.org/${z}/${Math.max(0,t.x)}/${Math.max(0,t.y)}.png`}
            alt=""
            style={{
              position:'absolute',
              left: (t.dx+1)*tileSize, top: (t.dy+1)*tileSize,
              width:tileSize, height:tileSize,
              filter:'saturate(0.5) brightness(1.05)',
            }}
          />
        ))}
      </div>
      {/* Color overlay */}
      <div style={{ position:'absolute', inset:0, background:`${route.color}20`, pointerEvents:'none' }}/>
      {/* Route label */}
      <div style={{ position:'absolute', bottom:8, right:8, background:'rgba(255,255,255,.92)', borderRadius:8, padding:'4px 9px', fontSize:10, fontWeight:700, color:route.color, display:'flex', alignItems:'center', gap:4 }}>
        <MapPin size={10}/> {route.subtitle.split('·')[0].trim()}
      </div>
      <a href={`https://www.openstreetmap.org/#map=${z}/${lat}/${lon}`} target="_blank" rel="noopener noreferrer"
        style={{ position:'absolute', top:8, right:8, background:'rgba(255,255,255,.9)', borderRadius:7, padding:'3px 8px', fontSize:10, color:route.color, textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
        <ExternalLink size={10}/> Ver mapa
      </a>
    </div>
  )
}

// ── Route card ────────────────────────────────────────────────────────
function RouteCard({ route, checks, visitedMun, onToggle }) {
  const [open, setOpen] = useState(false)

  const unique = [...new Set(route.municipalities)]

  function isVisitedInMap(slug) {
    return [...visitedMun].some(id => {
      const idSlug = id.split('__')[0].toLowerCase()
      const s = slug.toLowerCase()
      return idSlug === s || idSlug.replace(/-/g,'') === s.replace(/-/g,'')
    })
  }

  const completedCount = unique.filter(slug => isVisitedInMap(slug) || !!checks[slug]).length
  const total = unique.length
  const pct = total > 0 ? Math.round(completedCount / total * 100) : 0
  const done = completedCount === total

  const displayItems = route.landmarks ||
    unique.map(m => ({ name: m.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), municipality:m }))

  return (
    <div style={{
      background:'var(--surface)', borderRadius:20, marginBottom:14,
      border:`1.5px solid ${done?route.color:'var(--border)'}`,
      overflow:'hidden',
      boxShadow: done ? `0 4px 24px ${route.color}30` : '0 2px 8px rgba(0,0,0,.04)',
      transition:'all .2s',
    }}>
      {/* Header */}
      <div style={{ padding:'16px', cursor:'pointer', display:'flex', gap:14, alignItems:'center', background:`linear-gradient(135deg,${route.color}12,${route.color}04)` }}
        onClick={() => setOpen(v=>!v)}>
        <div style={{ flexShrink:0 }}>
          <PassportStamp route={route} done={done} pct={pct} size={76}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--text)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {route.name}
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>{route.subtitle}</div>
          <div style={{ height:5, background:'var(--border)', borderRadius:3, overflow:'hidden', marginBottom:4 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:route.color, borderRadius:3, transition:'width .6s' }}/>
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:done?route.color:'inherit', fontWeight:done?700:400 }}>
              {done ? 'Rota completa!' : `${completedCount} de ${total}`}
            </span>
            <span>{pct}%</span>
          </div>
        </div>
        <ChevronDown size={16} style={{ color:'var(--muted)', transform:open?'rotate(180deg)':'none', transition:'transform .2s', flexShrink:0 }}/>
      </div>

      {open && (
        <div>
          {/* Description */}
          <div style={{ padding:'12px 16px', background:`${route.color}06`, borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.65, margin:0 }}>{route.description}</p>
          </div>

          {/* Map */}
          <div style={{ padding:'12px 16px 8px' }}>
            <RouteMap route={route}/>
          </div>

          {/* Carimbo sticker + checklist side by side on desktop, stacked on mobile */}
          <div style={{ padding:'8px 16px 4px', display:'flex', gap:16, alignItems:'flex-start' }}>
            {/* Sticker */}
            <div style={{ flexShrink:0 }}>
              <CarimboSticker route={route} done={done} pct={pct}/>
            </div>
            {/* Checklist */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:8 }}>
                {route.landmarks ? 'Aldeias âncora' : 'Municípios'}
              </div>
              {displayItems.map((item, i) => {
                const slug = item.municipality || item
                const visitedOnMap = isVisitedInMap(slug)
                const checkedHere  = !!checks[slug]
                const isDone = visitedOnMap || checkedHere

                return (
                  <div key={`${slug}-${i}`}
                    onClick={() => !visitedOnMap && onToggle(route.id, slug)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 6px', borderRadius:9, marginBottom:2, background:isDone?`${route.color}10`:'transparent', cursor:visitedOnMap?'default':'pointer', transition:'background .15s' }}>
                    <div style={{ width:22, height:22, borderRadius:7, flexShrink:0, background:isDone?route.color:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${isDone?route.color:'var(--border2)'}`, transition:'all .18s' }}>
                      {isDone ? <Check size={12} color="#fff" strokeWidth={3}/> : <span style={{ fontSize:9, fontWeight:700, color:'var(--muted)' }}>{i+1}</span>}
                    </div>
                    <span style={{ fontSize:12, flex:1, color:isDone?route.color:'var(--text)', fontWeight:isDone?700:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {item.name}
                    </span>
                    {visitedOnMap && <span style={{ fontSize:9, background:`${route.color}18`, color:route.color, padding:'2px 6px', borderRadius:4, fontWeight:700, flexShrink:0 }}>mapa</span>}
                    {!visitedOnMap && checkedHere && <span style={{ fontSize:9, background:`${route.color}18`, color:route.color, padding:'2px 6px', borderRadius:4, fontWeight:700, flexShrink:0 }}>✓</span>}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ height:12 }}/>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────
export default function PassportTab({ visitedMun, color }) {
  const { user } = useAuth()
  const [checks, setChecks]   = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.supabaseId) return
    supabase.from('profiles').select('passport_checks').eq('id', user.supabaseId).single()
      .then(({ data }) => { setChecks(data?.passport_checks || {}); setLoading(false) })
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
      Object.entries(checks)
        .filter(([k]) => k.startsWith(route.id+'__'))
        .map(([k,v]) => [k.replace(route.id+'__',''), v])
    )
  }

  function getRoutePct(route) {
    const unique = [...new Set(route.municipalities)]
    const done = unique.filter(slug => {
      const vis = [...visitedMun].some(id => {
        const idSlug = id.split('__')[0].toLowerCase()
        return idSlug === slug || idSlug.replace(/-/g,'') === slug.replace(/-/g,'')
      })
      return vis || !!checks[`${route.id}__${slug}`]
    }).length
    return Math.round(done/unique.length*100)
  }

  const completedRoutes = ROUTES.filter(r => getRoutePct(r) === 100).length

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
      <div style={{ width:24, height:24, border:`2px solid var(--border)`, borderTopColor:color, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      {/* Passport cover */}
      <div style={{ background:'linear-gradient(145deg,#1C244F,#2D3D6E)', borderRadius:20, padding:'20px', marginBottom:20, boxShadow:'0 8px 32px rgba(28,36,79,.35)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.05)' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'rgba(255,255,255,.5)', marginBottom:4 }}>Passaporte de Viagem</div>
          <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,.8)', marginBottom:16 }}>{user?.displayName||user?.id}</div>
          {/* Mini stamps grid */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
            {ROUTES.map(route => {
              const pct = getRoutePct(route)
              return (
                <div key={route.id} style={{ opacity:pct===100?1:0.3, transition:'opacity .3s' }}>
                  <PassportStamp route={route} done={pct===100} pct={pct} size={52}/>
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontSize:30, fontWeight:900, color:'#fff', lineHeight:1 }}>{completedRoutes}</span>
            <span style={{ fontSize:13, color:'rgba(255,255,255,.55)' }}>de {ROUTES.length} rotas carimbadas</span>
          </div>
          <div style={{ height:4, background:'rgba(255,255,255,.15)', borderRadius:2, overflow:'hidden', marginTop:8 }}>
            <div style={{ height:'100%', width:`${Math.round(completedRoutes/ROUTES.length*100)}%`, background:'rgba(255,255,255,.8)', borderRadius:2, transition:'width .8s' }}/>
          </div>
        </div>
      </div>

      {ROUTES.map(route => (
        <RouteCard key={route.id} route={route} checks={getRouteChecks(route)} visitedMun={visitedMun} onToggle={handleToggle}/>
      ))}

      <div style={{ textAlign:'center', padding:'4px 0 8px', fontSize:12, color:'var(--muted)' }}>
        Mais rotas em breve
      </div>
    </div>
  )
}
