import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './auth'
import MapView from './MapView'
import Sidebar from './Sidebar'
import ProfilePage from './ProfilePage'
import SuggestPanel from './SuggestPanel'
import AdminPage from './AdminPage'
import InfoCard from './InfoCard'

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

export default function Tracker() {
  const { user, saveVisited } = useAuth()
  const markColor = user?.markColor || '#6c63ff'
  const isMobile = useIsMobile()

  const [visitedMun,  setVisitedMun]  = useState(() => new Set(user?.visited_municipalities || []))
  const [visitedPar,  setVisitedPar]  = useState(() => new Set(user?.visited_parishes || []))
  const [idNameMap,   setIdNameMap]   = useState(new Map())
  const [tooltip,     setTooltip]     = useState(null)
  const [toast,       setToast]       = useState(null)
  const [sidebar,     setSidebar]     = useState(false) // closed by default on mobile
  const [level,       setLevel]       = useState('municipalities')
  const [profile,     setProfile]     = useState(false)
  const [admin,       setAdmin]       = useState(false)
  const [suggest,     setSuggest]     = useState(null)
  const [favorites,   setFavorites]   = useState([])

  const [pinnedCard, setPinnedCard]   = useState(false)
  const pinnedRef  = useRef(false)
  const toastRef   = useRef(null)
  const hideTimer  = useRef(null)
  const mapRef     = useRef(null)

  const visited = level === 'parishes' ? visitedPar : visitedMun

  useEffect(() => {
    setVisitedMun(new Set(user?.visited_municipalities || []))
    setVisitedPar(new Set(user?.visited_parishes || []))
    if (user?.supabaseId) {
      import('./supabase').then(({ supabase }) => {
        supabase.from('profiles').select('favorites').eq('id', user.supabaseId).single()
          .then(({ data }) => setFavorites(data?.favorites || []))
      })
    }
  }, [user?.id])

  // Called from PassportTab/FavoritesTab — shows InfoCard for a location
  const handleStampClick = useCallback((slugOrId, name) => {
    let found = null

    // 1. Try exact ID match first (favorites pass the full map ID)
    if (idNameMap.has(slugOrId)) {
      const val = idNameMap.get(slugOrId)
      const displayName = typeof val === 'string' ? val : val?.displayName || val?.name || name
      found = { id: slugOrId, name: displayName, concelho: typeof val === 'object' ? val.concelho || '' : '' }
    }

    // 2. Fall back to slug matching (passport stamps pass a slug)
    if (!found) {
      const s = slugOrId.toLowerCase().replace(/-/g, '')
      for (const [id, val] of idNameMap.entries()) {
        const raw = id.split('__')[0].toLowerCase().replace(/-/g, '')
        if (raw === s) {
          const displayName = typeof val === 'string' ? val : val?.displayName || val?.name || name
          found = { id, name: displayName, concelho: typeof val === 'object' ? val.concelho || '' : '' }
          break
        }
      }
    }

    setProfile(false)
    setTimeout(() => {
      if (found) {
        mapRef.current?.zoomToId(found.id)
        setTooltip({ ...found, isVisited: visited.has(found.id), x: window.innerWidth / 2, y: 300 })
        pinCard()
      }
    }, 100)
  }, [idNameMap, visited])

  // Reload favorites when needed (e.g. after InfoCard fav toggle)
  const refreshFavorites = useCallback(() => {
    if (!user?.supabaseId) return
    import('./supabase').then(({ supabase }) => {
      supabase.from('profiles').select('favorites').eq('id', user.supabaseId).single()
        .then(({ data }) => setFavorites(data?.favorites || []))
    })
  }, [user?.supabaseId])

  // On desktop, open sidebar by default
  useEffect(() => {
    if (!isMobile) setSidebar(true)
  }, [isMobile])

  // Sync markColor to CSS variable for map labels
  useEffect(() => {
    document.documentElement.style.setProperty('--mark-color', markColor)
  }, [markColor])

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
    pinCard()
  }, [level, saveVisited, showToast])

  const handleLevelChange = useCallback((lv) => {
    setLevel(lv); setIdNameMap(new Map()); setTooltip(null)
    pinnedRef.current = false; setPinnedCard(false)
  }, [])

  const handleHover = useCallback((info) => {
    if (isMobile) return // mobile uses handleSelect instead
    clearTimeout(hideTimer.current)
    if (info) {
      setTooltip(info)
    } else {
      hideTimer.current = setTimeout(() => {
        if (!pinnedRef.current) setTooltip(null)
      }, 400)
    }
  }, [isMobile])

  // Mobile: first tap shows card, null = deselect (close card)
  const handleSelect = useCallback((info) => {
    if (!info) {
      unpinCard()
      return
    }
    setTooltip({ ...info, isVisited: visited.has(info.id) })
    pinCard()
  }, [visited])

  const handleCardEnter = useCallback(() => { clearTimeout(hideTimer.current) }, [])
  const handleCardLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      if (!pinnedRef.current) setTooltip(null)
    }, 400)
  }, [])

  const handleCloseCard = useCallback(() => {
    pinnedRef.current = false
    setPinnedCard(false)
    setTooltip(null)
    mapRef.current?.clearSelection?.()
  }, [])

  const handleSidebarToggle = useCallback((id, displayName) => {
    const val = idNameMap.get(id)
    if (val) {
      const info = typeof val === 'string'
        ? { name: val, id, concelho: '', isVisited: visited.has(id), x: 100, y: 200 }
        : { name: val.displayName || val.name, id, concelho: val.concelho, isVisited: visited.has(id), x: 100, y: 200 }
      setTooltip(info)
      pinCard()
    }
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
    if (isMobile) setSidebar(false)
  }, [level, saveVisited, showToast, idNameMap, visited, isMobile])

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
    if (isMobile) setSidebar(false)
  }, [idNameMap, isMobile])

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
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── Header ── */}
      <header style={{
        height: isMobile ? 54 : 50,
        background:'var(--surface)', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', padding: isMobile ? '0 12px' : '0 14px', gap:8,
        flexShrink:0, zIndex:200, boxShadow:'0 1px 4px rgba(0,0,0,.05)',
        paddingTop: 'var(--safe-top)',
      }}>
        {/* Hamburger */}
        <button onClick={() => setSidebar(s => !s)} style={{
          width:38, height:38, borderRadius:10, border:'1px solid var(--border)',
          background: sidebar ? `${markColor}18` : 'var(--surface2)',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          color: sidebar ? markColor : 'var(--text)', flexShrink:0, fontSize:18,
        }}>☰</button>

        <img src="/logo.png" alt="PorOnde" style={{ height:28, width:'auto', flexShrink:0 }}/>

        <div style={{ flex:1 }}/>

        {/* Counters */}
        <div style={{ display:'flex', gap:5 }}>
          <div style={{
            padding: isMobile ? '4px 8px' : '3px 9px', borderRadius:20,
            background: level==='municipalities' ? markColor : `${markColor}18`,
            border:`1px solid ${markColor}40`, fontSize:11,
            color: level==='municipalities' ? '#fff' : markColor, fontWeight:700,
          }}>
            {munCount} {!isMobile && `concelho${munCount!==1?'s':''}`}
            {isMobile && <span style={{ fontSize:9, opacity:.8 }}> C</span>}
          </div>
          <div style={{
            padding: isMobile ? '4px 8px' : '3px 9px', borderRadius:20,
            background: level==='parishes' ? markColor : 'var(--surface2)',
            border:'1px solid var(--border)', fontSize:11,
            color: level==='parishes' ? '#fff' : 'var(--muted)', fontWeight:500,
          }}>
            {parCount} {!isMobile && `freguesia${parCount!==1?'s':''}`}
            {isMobile && <span style={{ fontSize:9, opacity:.8 }}> F</span>}
          </div>
        </div>

        {user?.isAdmin && (
          <button onClick={() => setAdmin(true)} style={{
            height:34, padding:'0 10px', borderRadius:8,
            border:'1px solid rgba(212,80,10,.3)', background:'var(--accent-bg)',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--accent)', flexShrink:0, fontSize:11, fontWeight:700, fontFamily:'Open Sans,sans-serif',
          }}>
            Admin
          </button>
        )}

        <button onClick={() => setProfile(true)} title="Perfil" style={{
          width:38, height:38, borderRadius:10,
          border:'1.5px solid rgba(212,80,10,.2)', background:'var(--accent-bg)',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0, overflow:'hidden',
        }}>
          {user?.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:20 }}>👤</span>}
        </button>
      </header>

      {/* ── Body ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>

        {/* Sidebar backdrop */}
        {sidebar && (
          <div onClick={() => setSidebar(false)} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,.35)',
            zIndex:499, display: isMobile ? 'block' : 'none',
          }}/>
        )}

        {/* Sidebar */}
        <div style={{
          width: sidebar ? 264 : 0, overflow:'hidden',
          transition:'width .3s cubic-bezier(.4,0,.2,1)', flexShrink:0,
          ...(isMobile ? {
            position:'fixed', top:0, left:0, bottom:0, zIndex:500,
            width: sidebar ? 264 : 0,
          } : {}),
        }}>
          <Sidebar
            visited={visited}
            visitedMun={visitedMun}
            visitedPar={visitedPar}
            onView={handleSidebarView}
            onRemove={handleSidebarRemove}
            onToggle={handleSidebarToggle}
            onZoomTo={id => { mapRef.current?.zoomToId(id); if (isMobile) setSidebar(false) }}
            idNameMap={idNameMap}
            level={level}
            onLevelChange={handleLevelChange}
            munCount={munCount}
            parCount={parCount}
            onClose={() => setSidebar(false)}
          />
        </div>

        {/* Map area */}
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
            onSelect={handleSelect}
            onReady={setIdNameMap}
            level={level}
            markColor={markColor}
            isMobile={isMobile}
            favorites={favorites}
          />

          {/* Legend — smaller on mobile */}
          {!tooltip && (
            <div style={{
              position:'absolute', bottom: isMobile ? 80 : 18,
              right: isMobile ? 14 : 14, zIndex:800,
              background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:10, padding: isMobile ? '7px 10px' : '9px 13px',
              boxShadow:'0 2px 12px rgba(0,0,0,.08)',
            }}>
              {[['var(--unvisited)','1px solid var(--unvisited-stroke)','Não visitado'],[markColor,'none','Visitado']].map(([bg,border,label]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:label==='Visitado'?0:4 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:bg, border }}/>
                  <span style={{ fontSize:10, color:'var(--muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* InfoCard */}
          {tooltip && (
            <InfoCard
              tooltip={tooltip}
              level={level}
              isMobile={isMobile}
              onToggle={(id, name) => { handleToggle(id, name); setTooltip(prev => prev ? { ...prev, isVisited: !visited.has(id) } : prev) }}
              onFavoriteChange={refreshFavorites}
              onOpenSuggest={() => tooltip && setSuggest({ id: tooltip.id, name: tooltip.name })}
              onClose={handleCloseCard}
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
            />
          )}

          {/* Toast */}
          {toast && (
            <div style={{
              position:'absolute',
              bottom: isMobile ? 'calc(var(--safe-bottom) + 12px)' : 22,
              left:'50%', transform:'translateX(-50%)',
              background: toast.type==='add' ? markColor : 'var(--text)',
              color:'#fff', borderRadius:16, padding:'10px 20px',
              fontSize:13, fontWeight:600, zIndex:9000,
              boxShadow:'0 4px 18px rgba(0,0,0,.2)',
              animation:'fadeUp .28s ease', whiteSpace:'nowrap',
            }}>
              {toast.msg}
            </div>
          )}
        </div>
      </div>

      {profile && <ProfilePage visitedMun={visitedMun} visitedPar={visitedPar} idNameMap={idNameMap} level={level} onClose={() => setProfile(false)} onStampClick={handleStampClick} onNavigate={handleStampClick}/>}
      {admin && user?.isAdmin && <AdminPage onClose={() => setAdmin(false)}/>}
      {suggest && <SuggestPanel locationId={suggest.id} locationName={suggest.name} onClose={() => setSuggest(null)}/>}
    </div>
  )
}
