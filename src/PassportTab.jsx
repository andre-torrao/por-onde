import { useState, useEffect } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { ROUTES } from './data/routes'
import { Check, ChevronDown, MapPin, ExternalLink } from 'lucide-react'

// ── Stamp shape SVG ───────────────────────────────────────────────────
function Stamp({ color, done, name, shortName, pct, size = 90 }) {
  const opacity = done ? 1 : 0.35
  const cx = size / 2, cy = size / 2, r = size * 0.42

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:'block' }}>
      <defs>
        <path id={`circle-${shortName}`} d={`M ${cx},${cy} m -${r},0 a ${r},${r} 0 1,1 ${r*2},0 a ${r},${r} 0 1,1 -${r*2},0`}/>
      </defs>
      {/* Outer circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="4 2" opacity={opacity}/>
      {/* Inner circle */}
      <circle cx={cx} cy={cy} r={r - 9} fill="none" stroke={color} strokeWidth={1} opacity={opacity}/>
      {/* Text on path */}
      <text fontSize={7} fontWeight={700} fill={color} opacity={opacity} letterSpacing={1.5} fontFamily="serif">
        <textPath href={`#circle-${shortName}`} startOffset="10%">
          {name.toUpperCase()} • PORTUGAL •
        </textPath>
      </text>
      {/* Center content */}
      {done ? (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={20} fill={color} fontFamily="serif" fontWeight={900} opacity={opacity}>✓</text>
          <text x={cx} y={cy + 11} textAnchor="middle" fontSize={7} fill={color} fontFamily="serif" fontWeight={700} opacity={opacity}>COMPLETO</text>
        </>
      ) : (
        <>
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={14} fill={color} fontFamily="serif" fontWeight={900} opacity={opacity}>{pct}%</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize={6} fill={color} fontFamily="serif" opacity={opacity}>EM CURSO</text>
        </>
      )}
    </svg>
  )
}

// ── Static map preview using OpenStreetMap tiles ──────────────────────
function RouteMap({ route }) {
  const [lat, lon] = route.mapCenter
  const zoom = route.mapZoom
  const w = 320, h = 140

  // Convert lat/lon to tile coordinates
  const tileX = Math.floor((lon + 180) / 360 * Math.pow(2, zoom))
  const tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))

  // Use a free static map service (no API key needed)
  const mapUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`

  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden', height: h,
      background: '#e8eef5', position: 'relative',
      border: '1px solid var(--border)',
    }}>
      <iframe
        title={`Mapa ${route.name}`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon-1.5},${lat-0.8},${lon+1.5},${lat+0.8}&layer=mapnik`}
        style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
        loading="lazy"
      />
      {/* Overlay with route color tint */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `${route.color}15`,
        pointerEvents: 'none',
      }}/>
      {/* Label */}
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        background: 'rgba(255,255,255,.9)', borderRadius: 8,
        padding: '4px 8px', fontSize: 10, fontWeight: 700,
        color: route.color, display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <MapPin size={10}/> {route.subtitle.split('·')[0].trim()}
      </div>
    </div>
  )
}

// ── Route card ────────────────────────────────────────────────────────
function RouteCard({ route, checks, visitedMun, onToggle, accentColor }) {
  const [open, setOpen] = useState(false)

  const items = route.landmarks || route.municipalities.map((m, i) => ({
    name: m.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    municipality: m,
    _index: i,
  }))

  // Deduplicate municipalities
  const uniqueMunicipalities = [...new Set(route.municipalities)]

  function isVisitedInMap(slug) {
    return [...visitedMun].some(id => {
      const idSlug = id.split('__')[0].toLowerCase().replace(/\s/g, '-')
      const s = slug.toLowerCase().replace(/\s/g, '-')
      return idSlug === s || idSlug.replace(/-/g,'') === s.replace(/-/g,'')
    })
  }

  function isChecked(slug) {
    return !!checks[slug]
  }

  const completedCount = uniqueMunicipalities.filter(slug =>
    isVisitedInMap(slug) || isChecked(slug)
  ).length
  const total = uniqueMunicipalities.length
  const pct = total > 0 ? Math.round(completedCount / total * 100) : 0
  const done = completedCount === total

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 20, marginBottom: 16,
      border: `1.5px solid ${done ? route.color : 'var(--border)'}`,
      overflow: 'hidden',
      boxShadow: done ? `0 4px 24px ${route.color}30` : '0 2px 8px rgba(0,0,0,.05)',
      transition: 'all .2s',
    }}>
      {/* Passport-style header */}
      <div style={{
        background: `linear-gradient(135deg, ${route.color}18, ${route.color}08)`,
        padding: '16px',
        borderBottom: open ? '1px solid var(--border)' : 'none',
        cursor: 'pointer',
        display: 'flex', gap: 14, alignItems: 'center',
      }} onClick={() => setOpen(v => !v)}>
        {/* Stamp */}
        <div style={{ flexShrink: 0 }}>
          <Stamp
            color={route.color} done={done}
            name={route.shortName} shortName={route.id}
            pct={pct} size={80}
          />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 16 }}>{route.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {route.name}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{route.subtitle}</div>

          {/* Progress bar */}
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: route.color, borderRadius: 3, transition: 'width .6s' }}/>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: done ? route.color : 'inherit', fontWeight: done ? 700 : 400 }}>
              {done ? '🎉 Rota completa!' : `${completedCount} de ${total}`}
            </span>
            <span>{pct}%</span>
          </div>
        </div>

        <ChevronDown size={16} style={{ color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}/>
      </div>

      {/* Expanded */}
      {open && (
        <div>
          {/* Description */}
          <div style={{ padding: '12px 16px', background: `${route.color}06`, borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>{route.description}</p>
          </div>

          {/* Map preview */}
          <div style={{ padding: '12px 16px 8px' }}>
            <RouteMap route={route}/>
            <a
              href={`https://www.openstreetmap.org/#map=${route.mapZoom}/${route.mapCenter[0]}/${route.mapCenter[1]}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: route.color, marginTop: 6, textDecoration: 'none', fontWeight: 600 }}
            >
              <ExternalLink size={11}/> Ver mapa completo
            </a>
          </div>

          {/* Checklist */}
          <div style={{ padding: '8px 12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', marginBottom: 8, padding: '0 4px' }}>
              {route.landmarks ? 'Aldeias âncora' : 'Municípios da rota'}
            </div>
            {(route.landmarks || uniqueMunicipalities.map(m => ({ name: m.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), municipality: m }))).map((item, i) => {
              const slug = item.municipality || item
              const visitedOnMap = isVisitedInMap(slug)
              const checkedHere  = isChecked(slug)
              const isDone = visitedOnMap || checkedHere

              return (
                <div
                  key={`${slug}-${i}`}
                  onClick={() => !visitedOnMap && onToggle(route.id, slug)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 8px', borderRadius: 10, marginBottom: 2,
                    background: isDone ? `${route.color}10` : 'transparent',
                    cursor: visitedOnMap ? 'default' : 'pointer',
                    transition: 'background .15s',
                  }}
                >
                  {/* Check indicator */}
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: isDone ? route.color : 'var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${isDone ? route.color : 'var(--border2)'}`,
                    transition: 'all .18s',
                  }}>
                    {isDone
                      ? <Check size={14} color="#fff" strokeWidth={3}/>
                      : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>{i+1}</span>
                    }
                  </div>

                  <span style={{
                    fontSize: 13, flex: 1,
                    color: isDone ? route.color : 'var(--text)',
                    fontWeight: isDone ? 700 : 400,
                  }}>
                    {item.name}
                  </span>

                  {visitedOnMap && (
                    <span style={{ fontSize: 10, background: `${route.color}18`, color: route.color, padding: '2px 7px', borderRadius: 5, fontWeight: 700, flexShrink: 0 }}>
                      no mapa
                    </span>
                  )}
                  {!visitedOnMap && checkedHere && (
                    <span style={{ fontSize: 10, background: `${route.color}18`, color: route.color, padding: '2px 7px', borderRadius: 5, fontWeight: 700, flexShrink: 0 }}>
                      ✓
                    </span>
                  )}
                  {!isDone && (
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid var(--border)`, flexShrink: 0 }}/>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main PassportTab ──────────────────────────────────────────────────
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
    if (next[key]) delete next[key]
    else next[key] = true
    setChecks(next)
    await supabase.from('profiles').update({ passport_checks: next }).eq('id', user.supabaseId)
  }

  function getRouteChecks(route) {
    return Object.fromEntries(
      Object.entries(checks)
        .filter(([k]) => k.startsWith(route.id + '__'))
        .map(([k, v]) => [k.replace(route.id + '__', ''), v])
    )
  }

  function getRoutePct(route) {
    const unique = [...new Set(route.municipalities)]
    const done = unique.filter(slug => {
      const vis = [...visitedMun].some(id => {
        const idSlug = id.split('__')[0].toLowerCase().replace(/\s/g,'-')
        return idSlug === slug || idSlug.replace(/-/g,'') === slug.replace(/-/g,'')
      })
      return vis || !!checks[`${route.id}__${slug}`]
    }).length
    return Math.round(done / unique.length * 100)
  }

  const completedRoutes = ROUTES.filter(r => getRoutePct(r) === 100).length
  const totalStamps     = ROUTES.length

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
      <div style={{ width:24, height:24, border:`2px solid var(--border)`, borderTopColor:color, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ padding:'16px 16px 100px' }}>

      {/* Passport cover hero */}
      <div style={{
        background: `linear-gradient(145deg, #1C244F, #2D3D6E)`,
        borderRadius: 20, padding: '20px', marginBottom: 20,
        boxShadow: '0 8px 32px rgba(28,36,79,.35)', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.05)' }}/>
        <div style={{ position:'absolute', left:-20, bottom:-20, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.04)' }}/>

        <div style={{ position:'relative' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'rgba(255,255,255,.5)', marginBottom:6 }}>
            Passaporte de Viagem
          </div>
          <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.8)', marginBottom:16 }}>
            {user?.displayName || user?.id}
          </div>

          {/* Stamp grid preview */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            {ROUTES.map(route => {
              const pct = getRoutePct(route)
              const done = pct === 100
              return (
                <div key={route.id} style={{ opacity: done ? 1 : 0.4, transition:'opacity .3s' }}>
                  <Stamp color={done ? route.color : 'rgba(255,255,255,.6)'} done={done} name={route.shortName} shortName={route.id} pct={pct} size={60}/>
                </div>
              )
            })}
          </div>

          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontSize:32, fontWeight:900, color:'#fff', lineHeight:1 }}>{completedRoutes}</span>
            <span style={{ fontSize:14, color:'rgba(255,255,255,.6)' }}>de {totalStamps} rotas carimbadas</span>
          </div>
          <div style={{ height:4, background:'rgba(255,255,255,.15)', borderRadius:2, overflow:'hidden', marginTop:10 }}>
            <div style={{ height:'100%', width:`${Math.round(completedRoutes/totalStamps*100)}%`, background:'rgba(255,255,255,.8)', borderRadius:2, transition:'width .8s' }}/>
          </div>
        </div>
      </div>

      {/* Route cards */}
      {ROUTES.map(route => (
        <RouteCard
          key={route.id}
          route={route}
          checks={getRouteChecks(route)}
          visitedMun={visitedMun}
          onToggle={handleToggle}
          accentColor={color}
        />
      ))}

      <div style={{ textAlign:'center', padding:'4px 0 8px', fontSize:12, color:'var(--muted)' }}>
        Mais rotas em breve · Tens sugestões? Partilha connosco!
      </div>
    </div>
  )
}
