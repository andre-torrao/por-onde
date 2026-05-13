import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './auth'
import MapView from './MapView'
import Sidebar from './Sidebar'
import ProfilePage from './ProfilePage'
import SuggestPanel from './SuggestPanel'
import AdminPage from './AdminPage'
import InfoCard from './InfoCard'

export default function Tracker() {
  const { user, saveVisited } = useAuth()

  const [visitedMun,  setVisitedMun]  = useState(() => new Set(user?.visited_municipalities || []))
  const [visitedPar,  setVisitedPar]  = useState(() => new Set(user?.visited_parishes || []))
  const [idNameMap,   setIdNameMap]   = useState(new Map())
  const [tooltip,     setTooltip]     = useState(null)
  const [toast,       setToast]       = useState(null)
  const [sidebar,     setSidebar]     = useState(true)
  const [level,       setLevel]       = useState('municipalities')
  const [profile,     setProfile]     = useState(false)
  const [admin,       setAdmin]       = useState(false)
  const [suggest,     setSuggest]     = useState(null)

  // Use BOTH state (for re-render) and ref (for sync checks in timeouts)
  const [pinnedCard, setPinnedCard]   = useState(false)
  const pinnedRef  = useRef(false)
  const toastRef   = useRef(null)
  const hideTimer  = useRef(null)
  const mapRef     = useRef(null)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const visited = level === 'parishes' ? visitedPar : visitedMun

  useEffect(() => {
    setVisitedMun(new Set(user?.visited_municipalities || []))
    setVisitedPar(new Set(user?.visited_parishes || []))
  }, [user?.id])

  const showToast = useCallback((msg, type) => {
    clearTimeout(toastRef.current)
    setToast({ msg, type })
    toastRef.current = setTimeout(() => setToast(null), 2000)
  }, [])

  function pinCard() {
    clearTimeout(hideTimer.current)
    pinnedRef.current = true
    setPinnedCard(true)
  }

  function unpinCard() {
    pinnedRef.current = false
    setPinnedCard(false)
    setTooltip(null)
  }

  // handleToggle: clicking a feature on the MAP marks/unmarks it
  // Does NOT pin the card (card is pinned separately via sidebar click or card click)
  const handleToggle = useCallback((id, name) => {
    const setter = level === 'parishes' ? setVisitedPar : setVisitedMun
    const lvl    = level
    setter(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); showToast(`Removido: ${name}`, 'del') }
      else              { next.add(id);    showToast(`✓ ${name}`, 'add') }
      saveVisited([...next], lvl)
      return next
    })
    // Pin card when clicking on map feature
    pinCard()
  }, [level, saveVisited, showToast])

  const handleLevelChange = useCallback((lv) => {
    setLevel(lv); setIdNameMap(new Map()); setTooltip(null)
    pinnedRef.current = false; setPinnedCard(false)
  }, [])

  const handleHover = useCallback((info) => {
    clearTimeout(hideTimer.current)
    if (info) {
      setTooltip(info)
    } else {
      // Delay hide — check pinnedRef (always current, unlike state in closure)
      hideTimer.current = setTimeout(() => {
        if (!pinnedRef.current) setTooltip(null)
      }, 400)
    }
  }, [])

  // When mouse enters the card, keep it open
  const handleCardEnter = useCallback(() => {
    clearTimeout(hideTimer.current)
  }, [])

  // When mouse leaves the card, hide after delay (unless pinned)
  const handleCardLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      if (!pinnedRef.current) setTooltip(null)
    }, 400)
  }, [])

  // Close card explicitly (X button in card, or clicking map background)
  const handleCloseCard = useCallback(() => {
    pinnedRef.current = false
    setPinnedCard(false)
    setTooltip(null)
  }, [])

  // Sidebar item click: zoom to location, mark/unmark, pin card
  const handleSidebarToggle = useCallback((id, displayName) => {
    // Find the feature info for tooltip
    const val = idNameMap.get(id)
    if (val) {
      const info = typeof val === 'string'
        ? { name: val, id, concelho: '', isVisited: visited.has(id), x: 100, y: 200 }
        : { name: val.displayName || val.name, id, concelho: val.concelho, isVisited: visited.has(id), x: 100, y: 200 }
      setTooltip(info)
      pinCard()
    }
    // Toggle visited
    const setter = level === 'parishes' ? setVisitedPar : setVisitedMun
    const lvl    = level
    setter(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); showToast(`Removido: ${displayName}`, 'del') }
      else              { next.add(id);    showToast(`✓ ${displayName}`, 'add') }
      saveVisited([...next], lvl)
      return next
    })
    mapRef.current?.zoomToId(id)
  }, [level, saveVisited, showToast, idNameMap, visited])

  // Sidebar: clicking a VISITED item only shows its card (no toggle)
  const handleSidebarView = useCallback((id) => {
    const val = idNameMap.get(id)
    if (val) {
      const v = typeof val === 'string'
        ? { name: val, id, concelho: '', isVisited: true, x: 100, y: 200 }
        : { name: val.displayName || val.name, id, concelho: val.concelho, isVisited: true, x: 100, y: 200 }
      setTooltip(v)
      pinCard()
    }
    mapRef.current?.zoomToId(id)
  }, [idNameMap])

  // Sidebar: remove from visited (X button)
  const handleSidebarRemove = useCallback((id, displayName) => {
    const setter = level === 'parishes' ? setVisitedPar : setVisitedMun
    const lvl    = level
    setter(prev => {
      const next = new Set(prev)
      next.delete(id)
      showToast(`Removido: ${displayName}`, 'del')
      saveVisited([...next], lvl)
      return next
    })
    setTooltip(null)
  }, [level, saveVisited, showToast])

  const munCount = visitedMun.size
  const parCount = visitedPar.size

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── Header ── */}
      <header style={{
        height:50, background:'var(--surface)', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', padding:'0 14px', gap:10,
        flexShrink:0, zIndex:200, boxShadow:'0 1px 4px rgba(0,0,0,.05)',
      }}>
        <img src="/logo.png" alt="Vou PorOnde" style={{ height:30, width:'auto', flexShrink:0 }}/>
        <div style={{ flex:1 }}/>
        <div style={{ display:'flex', gap:5 }}>
          <div style={{ padding:'3px 9px', borderRadius:20, background: level==='municipalities'?'var(--accent)':'var(--accent-bg)', border:'1px solid rgba(212,80,10,.2)', fontSize:11, color: level==='municipalities'?'#fff':'var(--accent)', fontWeight:600 }}>
            {munCount} concelho{munCount!==1?'s':''}
          </div>
          <div style={{ padding:'3px 9px', borderRadius:20, background: level==='parishes'?'var(--accent)':'var(--surface2)', border:'1px solid var(--border)', fontSize:11, color: level==='parishes'?'#fff':'var(--muted)', fontWeight:500 }}>
            {parCount} freguesia{parCount!==1?'s':''}
          </div>
        </div>
        {user?.isAdmin && (
          <button onClick={() => setAdmin(true)} style={{ height:32, padding:'0 10px', borderRadius:8, border:'1px solid rgba(212,80,10,.3)', background:'var(--accent-bg)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent)', flexShrink:0, fontSize:11, fontWeight:700, fontFamily:'Open Sans,sans-serif' }}>
            Admin
          </button>
        )}
        <button onClick={() => setProfile(true)} title="Perfil" style={{ width:34, height:34, borderRadius:10, border:'1.5px solid rgba(212,80,10,.2)', background:'var(--accent-bg)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
          {user?.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:18 }}>👤</span>}
        </button>
      </header>

      {/* ── Body ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>

        {/* Sidebar overlay backdrop on mobile */}
        {isMobile && sidebar && (
          <div onClick={() => setSidebar(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.3)', zIndex:499 }}/>
        )}

        <div style={{
          width: sidebar ? 264 : 0, overflow:'hidden',
          transition:'width .3s cubic-bezier(.4,0,.2,1)', flexShrink:0,
          ...(isMobile && sidebar ? { position:'fixed', top:0, left:0, bottom:0, zIndex:500, width:264 } : {}),
        }}>
          <Sidebar
            visited={visited}
            visitedMun={visitedMun}
            visitedPar={visitedPar}
            onView={handleSidebarView}
            onRemove={handleSidebarRemove}
            onZoomTo={id => mapRef.current?.zoomToId(id)}
            idNameMap={idNameMap}
            level={level}
            onLevelChange={handleLevelChange}
            munCount={munCount}
            parCount={parCount}
            onClose={() => setSidebar(false)}
          />
        </div>

        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>

          {idNameMap.size === 0 && (
            <div style={{ position:'absolute', inset:0, background:'rgba(245,243,238,.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:900, gap:14, pointerEvents:'none' }}>
              <div style={{ width:30, height:30, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
              <span style={{ fontSize:13, color:'var(--muted)' }}>A carregar {level==='parishes'?'freguesias':'concelhos'}…</span>
            </div>
          )}

          <MapView
            ref={mapRef}
            visited={visited}
            onToggle={handleToggle}
            onHover={handleHover}
            onReady={setIdNameMap}
            level={level}
          />

          {/* Open sidebar floating button */}
          {!sidebar && (
            <button onClick={() => setSidebar(true)} style={{ position:'absolute', top:12, left:12, zIndex:800, width:40, height:40, borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', boxShadow:'0 2px 12px rgba(0,0,0,.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text)', fontSize:20 }}>☰</button>
          )}

          {/* Legend */}
          <div style={{ position:'absolute', bottom:18, right:14, zIndex:800, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'9px 13px', boxShadow:'0 2px 12px rgba(0,0,0,.08)' }}>
            {[['var(--unvisited)','1px solid var(--unvisited-stroke)','Não visitado'],['var(--visited)','none','Visitado']].map(([bg,border,label]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:label==='Visitado'?0:5 }}>
                <div style={{ width:12, height:12, borderRadius:3, background:bg, border }}/>
                <span style={{ fontSize:11, color:'var(--muted)' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* InfoCard */}
          {tooltip && (
            <InfoCard
              tooltip={tooltip}
              level={level}
              onOpenSuggest={() => tooltip && setSuggest({ id: tooltip.id, name: tooltip.name })}
              onClose={handleCloseCard}
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
            />
          )}

          {/* Toast */}
          {toast && (
            <div style={{ position:'absolute', bottom:22, left:'50%', transform:'translateX(-50%)', background: toast.type==='add'?'var(--accent)':'var(--text)', color:'#fff', borderRadius:10, padding:'10px 20px', fontSize:13, fontWeight:600, zIndex:9000, boxShadow:'0 4px 18px rgba(0,0,0,.2)', animation:'fadeUp .28s ease', whiteSpace:'nowrap' }}>
              {toast.msg}
            </div>
          )}
        </div>
      </div>

      {profile && <ProfilePage visitedMun={visitedMun} visitedPar={visitedPar} idNameMap={idNameMap} level={level} onClose={() => setProfile(false)}/>}
      {admin && user?.isAdmin && <AdminPage onClose={() => setAdmin(false)}/>}
      {suggest && <SuggestPanel locationId={suggest.id} locationName={suggest.name} onClose={() => setSuggest(null)}/>}
    </div>
  )
}
