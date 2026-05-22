import { useState, useEffect } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { ROUTES } from './data/routes'
import { Check, ChevronRight, ChevronDown, MapPin, Lock } from 'lucide-react'

// ── Mini segmented arc ────────────────────────────────────────────────
function RouteProgress({ pct, color, size = 56 }) {
  const r = 22, cx = size/2, cy = size/2
  const segments = 20, filled = Math.round(pct/100*segments)
  const gap = 6, segA = (360 - segments*gap)/segments
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({length:segments}).map((_,i) => {
        const s=(i*(segA+gap)-90)*Math.PI/180, e=(i*(segA+gap)-90+segA)*Math.PI/180
        const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s),x2=cx+r*Math.cos(e),y2=cy+r*Math.sin(e)
        return <path key={i}
          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
          fill={i<filled ? color : '#e0e8f0'}
          opacity={i<filled ? (0.5+(i/Math.max(filled,1))*0.5) : 1}/>
      })}
      <circle cx={cx} cy={cy} r={r-9} fill="white"/>
    </svg>
  )
}

// ── Single route card ─────────────────────────────────────────────────
function RouteCard({ route, checks, visitedMun, onToggle, color: accentColor }) {
  const [open, setOpen] = useState(false)

  // Match route municipalities to visited set
  // We try to match by slug — visitedMun contains IDs like "sintra__42"
  // We extract the slug part before "__" and compare
  function getVisitedInRoute() {
    return route.municipalities.filter(slug =>
      [...visitedMun].some(id => {
        const idSlug = id.split('__')[0]
        return idSlug === slug || idSlug === slug.replace(/-/g, '') ||
          idSlug.replace(/-/g,'') === slug.replace(/-/g,'')
      })
    )
  }

  function getCheckedInRoute() {
    return route.municipalities.filter(slug => checks[slug])
  }

  const visited = getVisitedInRoute()
  const checked = getCheckedInRoute()
  const total   = route.municipalities.length

  // Union of both (visited OR manually checked)
  const completed = new Set([...visited.map(s=>s), ...checked.map(s=>s)])
  const pct = Math.round(completed.size / total * 100)
  const done = completed.size === total

  const routeColor = route.color

  return (
    <div style={{
      background:'var(--surface)', borderRadius:18,
      border:`1.5px solid ${done ? routeColor : 'var(--border)'}`,
      overflow:'hidden', marginBottom:12,
      boxShadow: done ? `0 4px 20px ${routeColor}30` : '0 2px 8px rgba(0,0,0,.04)',
      transition:'all .2s',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{ padding:'16px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}
      >
        {/* Progress ring */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <RouteProgress pct={pct} color={routeColor} size={56}/>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {done
              ? <Check size={18} color={routeColor}/>
              : <span style={{ fontSize:11, fontWeight:800, color:routeColor }}>{pct}%</span>
            }
          </div>
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontSize:16 }}>{route.icon}</span>
            <span style={{ fontSize:15, fontWeight:800, color:'var(--text)' }}>{route.name}</span>
            {done && (
              <span style={{ background:routeColor, color:'#fff', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>
                Completo!
              </span>
            )}
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:5 }}>{route.subtitle}</div>
          {/* Progress bar */}
          <div style={{ height:4, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:routeColor, borderRadius:2, transition:'width .6s' }}/>
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>
            {completed.size} de {total} concelhos
          </div>
        </div>

        <ChevronDown size={16} style={{ color:'var(--muted)', transform: open?'rotate(180deg)':'none', transition:'transform .2s', flexShrink:0 }}/>
      </div>

      {/* Expanded — municipality list */}
      {open && (
        <div style={{ borderTop:'1px solid var(--border)' }}>
          {/* Description */}
          <div style={{ padding:'12px 16px', background:`${routeColor}08`, borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6, margin:0 }}>{route.description}</p>
          </div>

          {/* Legend */}
          <div style={{ padding:'10px 16px 6px', display:'flex', gap:16, fontSize:11, color:'var(--muted)' }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:10, height:10, borderRadius:3, background:routeColor }}/> Visitado no mapa
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:10, height:10, borderRadius:3, background:`${routeColor}40`, border:`1.5px solid ${routeColor}` }}/> Marcado aqui
            </span>
          </div>

          {/* Municipality checklist */}
          <div style={{ padding:'0 10px 12px' }}>
            {route.municipalities.map((slug, i) => {
              const isVisited  = visited.includes(slug)
              const isChecked  = !!checks[slug]
              const isDone     = isVisited || isChecked
              return (
                <div
                  key={slug}
                  onClick={() => !isVisited && onToggle(route.id, slug)}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'9px 8px', borderRadius:10, marginBottom:3,
                    background: isDone ? `${routeColor}10` : 'transparent',
                    cursor: isVisited ? 'default' : 'pointer',
                    transition:'background .15s',
                  }}
                >
                  {/* Number */}
                  <div style={{
                    width:24, height:24, borderRadius:7, flexShrink:0,
                    background: isDone ? routeColor : 'var(--border)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {isDone
                      ? <Check size={13} color="#fff"/>
                      : <span style={{ fontSize:10, fontWeight:700, color:'var(--muted)' }}>{i+1}</span>
                    }
                  </div>

                  {/* Name */}
                  <span style={{
                    fontSize:13, flex:1,
                    color: isDone ? routeColor : 'var(--text)',
                    fontWeight: isDone ? 600 : 400,
                    textTransform:'capitalize',
                  }}>
                    {slug.replace(/-/g, ' ')}
                  </span>

                  {/* Badges */}
                  {isVisited && (
                    <span style={{ fontSize:10, fontWeight:700, color:routeColor, background:`${routeColor}15`, padding:'2px 7px', borderRadius:5 }}>
                      no mapa
                    </span>
                  )}
                  {!isVisited && isChecked && (
                    <span style={{ fontSize:10, fontWeight:700, color:routeColor, background:`${routeColor}15`, padding:'2px 7px', borderRadius:5 }}>
                      ✓
                    </span>
                  )}
                  {!isVisited && !isChecked && (
                    <div style={{ width:18, height:18, borderRadius:5, border:'1.5px solid var(--border)', flexShrink:0 }}/>
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
  const [checks,  setChecks]  = useState({}) // { routeId_slug: true }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.supabaseId) return
    supabase.from('profiles').select('passport_checks').eq('id', user.supabaseId).single()
      .then(({ data }) => {
        setChecks(data?.passport_checks || {})
        setLoading(false)
      })
  }, [user?.supabaseId])

  async function handleToggle(routeId, slug) {
    const key = `${routeId}__${slug}`
    const next = { ...checks }
    if (next[key]) delete next[key]
    else next[key] = true
    setChecks(next)
    await supabase.from('profiles').update({ passport_checks: next }).eq('id', user.supabaseId)
  }

  // Total completed routes
  const completedRoutes = ROUTES.filter(route => {
    const visitedInRoute = route.municipalities.filter(slug =>
      [...visitedMun].some(id => id.split('__')[0].replace(/-/g,'') === slug.replace(/-/g,''))
    )
    const checkedInRoute = route.municipalities.filter(slug => checks[`${route.id}__${slug}`])
    const completed = new Set([...visitedInRoute, ...checkedInRoute])
    return completed.size === route.municipalities.length
  }).length

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
      <div style={{ width:24, height:24, border:'2px solid var(--border)', borderTopColor:color, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ padding:'16px 16px 100px' }}>

      {/* Hero stats */}
      <div style={{
        background:`linear-gradient(135deg, ${color}, ${color}bb)`,
        borderRadius:18, padding:'18px 20px', marginBottom:18,
        boxShadow:`0 6px 24px ${color}40`, position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,.1)' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', color:'rgba(255,255,255,.7)', marginBottom:6 }}>
            Passaporte de Viagem
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:36, fontWeight:900, color:'#fff', lineHeight:1 }}>{completedRoutes}</span>
            <span style={{ fontSize:16, color:'rgba(255,255,255,.7)' }}>de {ROUTES.length} rotas completas</span>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,.25)', borderRadius:3, overflow:'hidden', marginTop:10 }}>
            <div style={{ height:'100%', width:`${Math.round(completedRoutes/ROUTES.length*100)}%`, background:'rgba(255,255,255,.9)', borderRadius:3, transition:'width .8s' }}/>
          </div>
        </div>
      </div>

      {/* Route list */}
      {ROUTES.map(route => (
        <RouteCard
          key={route.id}
          route={route}
          checks={Object.fromEntries(
            Object.entries(checks)
              .filter(([k]) => k.startsWith(route.id + '__'))
              .map(([k, v]) => [k.replace(route.id + '__', ''), v])
          )}
          visitedMun={visitedMun}
          onToggle={handleToggle}
          color={color}
        />
      ))}

      <div style={{ textAlign:'center', padding:'8px 0 4px', fontSize:12, color:'var(--muted)' }}>
        Mais rotas em breve · Tens sugestões? Usa o botão Sugerir no mapa!
      </div>
    </div>
  )
}
