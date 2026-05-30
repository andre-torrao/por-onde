import { useState, useEffect, useRef } from 'react'
import { getMunicipalityInfo, getCulture } from './data/municipalityInfo'
import { getParishInfo } from './data/parishInfo'
import { MapPin, Building2, Music, Utensils, Cake, Star, MessageSquarePlus, X, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { getSuggestions } from './storage'
import { useAuth } from './auth'
import { supabase } from './supabase'

function InfoRow({ text, sub }) {
  return (
    <div style={{ display:'flex', gap:7, alignItems:'flex-start', marginBottom:4 }}>
      <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--accent)', flexShrink:0, marginTop:7 }}/>
      <span style={{ fontSize:13, color:'var(--text)', lineHeight:1.5, flex:1 }}>
        {text}{sub && <span style={{ color:'var(--muted)', fontSize:11 }}> · {sub}</span>}
      </span>
    </div>
  )
}

function SectionBlock({ icon, color, title, children, empty }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
        <span style={{ color, display:'flex' }}>{icon}</span>
        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)' }}>{title}</span>
      </div>
      {children || <div style={{ fontSize:12, color:'var(--border2)', fontStyle:'italic', paddingLeft:10 }}>{empty}</div>}
    </div>
  )
}

export default function InfoCard({ tooltip, onOpenSuggest, onClose, onToggle, onFavoriteChange, level, isMobile, onMouseEnter, onMouseLeave }) {
  const { user } = useAuth()
  const [approved, setApproved] = useState([])
  const [isFav, setIsFav]       = useState(false)
  const [expanded, setExpanded] = useState(false) // mobile only — expand to full info
  const startY  = useRef(null)
  const sheetRef = useRef(null)

  const { name, id: locationId, concelho, isVisited, x, y } = tooltip || {}
  const color   = user?.markColor || '#6c63ff'
  const munName = level === 'municipalities' ? name : (concelho || name)
  const info    = getMunicipalityInfo(munName)
  const culture = getCulture(munName)
  const parishInfo = level === 'parishes' ? getParishInfo(name, concelho) : null

  useEffect(() => {
    if (!locationId) return
    getSuggestions(locationId).then(setApproved)
  }, [locationId])

  useEffect(() => {
    if (!user?.supabaseId || !locationId) return
    setExpanded(false) // reset on new location
    supabase.from('profiles').select('favorites').eq('id', user.supabaseId).single()
      .then(({ data }) => {
        setIsFav((data?.favorites || []).some(f => f.id === locationId))
      })
  }, [locationId, user?.supabaseId])

  async function toggleFavorite() {
    if (!user?.supabaseId) return
    const { data } = await supabase.from('profiles').select('favorites').eq('id', user.supabaseId).single()
    const favs = data?.favorites || []
    let next
    if (isFav) {
      next = favs.filter(f => f.id !== locationId)
    } else {
      next = [...favs, { id: locationId, name, concelho: concelho||'', level, addedAt: Date.now() }]
    }
    await supabase.from('profiles').update({ favorites: next }).eq('id', user.supabaseId)
    setIsFav(!isFav)
    // Notify Tracker to refresh favorites in MapView
    onFavoriteChange?.()
  }

  if (!tooltip) return null

  // Desktop positioning
  const cardW = 288
  const left  = Math.min(x + 16, window.innerWidth - cardW - 12)
  const top   = Math.max(10, Math.min(y - 40, window.innerHeight - 520))

  const highlights = info?.highlights || parishInfo?.highlights || []
  const festivals  = culture?.festivals || parishInfo?.festivals || []
  const food       = culture?.food || []
  const sweets     = culture?.sweets || []
  const suggVisit  = approved.filter(s => s.category === 'visit')
  const suggFood   = approved.filter(s => s.category === 'food')
  const suggSweet  = approved.filter(s => s.category === 'sweet')
  const suggFest   = approved.filter(s => s.category === 'fest')
  const suggOther  = approved.filter(s => s.category === 'other')
  const festMain   = [...festivals.slice(0,1), ...suggFest.slice(0,1)]
  const festOther  = [...festivals.slice(1), ...suggFest.slice(1), ...suggOther]

  // Touch drag to close
  function onTouchStart(e) { startY.current = e.touches[0].clientY }
  function onTouchEnd(e) {
    if (startY.current === null) return
    const dy = e.changedTouches[0].clientY - startY.current
    if (dy > 50) onClose()
    startY.current = null
  }

  // ── MOBILE: compact bottom bar ──────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        position:'fixed', left:0, right:0, bottom:0, zIndex:9999,
        fontFamily:'var(--font)',
      }}>
        {/* Backdrop — tap to close */}
        <div
          onClick={onClose}
          style={{ position:'fixed', inset:0, zIndex:-1, background:'rgba(0,0,0,.15)' }}
        />

        {/* Compact card */}
        <div
          ref={sheetRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            background:'#ffffff',
            borderRadius:'28px 28px 0 0',
            boxShadow:`0 -4px 32px ${color}30, 0 -1px 0 ${color}20`,
            border:`1px solid ${color}20`,
            borderBottom:'none',
            paddingBottom:'calc(var(--safe-bottom) + 8px)',
            animation:'slideUp .25s cubic-bezier(.4,0,.2,1)',
          }}
        >
          {/* Drag handle */}
          <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:4 }}>
            <div style={{ width:36, height:4, borderRadius:2, background:`${color}50` }}/>
          </div>

          {/* Header row — white bg, name in markColor */}
          <div style={{ padding:'8px 16px 0', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:17, color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {name}
              </div>
              {concelho && concelho !== name && (
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:1, display:'flex', alignItems:'center', gap:3 }}>
                  <MapPin size={10}/> {concelho}
                </div>
              )}
            </div>
            {/* Visited badge */}
            {isVisited && (
              <div style={{ background:`${color}18`, color, border:`1px solid ${color}40`, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, flexShrink:0 }}>✓ Visitado</div>
            )}
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <X size={13} color="var(--muted)"/>
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ padding:'10px 16px 12px', display:'flex', gap:8 }}>
            {/* Mark visited */}
            <button onClick={() => onToggle && onToggle(locationId, name)} style={{
              flex:1, padding:'11px 12px', borderRadius:12, border:'2px solid',
              borderColor: isVisited ? color : 'var(--border)',
              background: isVisited ? color : 'var(--surface2)',
              color: isVisited ? '#fff' : 'var(--muted)',
              fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .18s',
            }}>
              {isVisited ? '✓ Visitado' : '+ Marcar visitado'}
            </button>

            {/* Favorite */}
            <button onClick={toggleFavorite} style={{
              width:46, height:46, borderRadius:12, border:'2px solid',
              borderColor: isFav ? '#f59e0b' : 'var(--border)',
              background: isFav ? '#fef3c7' : 'var(--surface2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', flexShrink:0, transition:'all .18s',
              boxShadow: isFav ? '0 0 0 3px #fef3c7, 0 0 0 5px #f59e0b' : 'none',
            }}>
              <Star size={18} fill={isFav ? '#f59e0b' : 'none'} color={isFav ? '#f59e0b' : 'var(--muted)'}/>
            </button>

            {/* Suggest */}
            <button onClick={() => { onClose(); setTimeout(() => onOpenSuggest?.(), 50) }} style={{
              width:46, height:46, borderRadius:12, border:'1px solid var(--border)',
              background:'var(--surface2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', flexShrink:0,
            }}>
              <MessageSquarePlus size={17} color="var(--muted)"/>
            </button>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ width:'100%', padding:'7px', background:`${color}08`, border:'none', borderTop:`1px solid ${color}18`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, color, fontSize:12, fontWeight:600 }}
          >
            {expanded ? <><ChevronDown size={14}/> Menos info</> : <><ChevronUp size={14}/> Ver informação</>}
          </button>

          {/* Expanded content */}
          {expanded && (
            <div style={{ padding:'12px 16px 8px', maxHeight:'40vh', overflowY:'auto', borderTop:'1px solid var(--border)' }}>
              {info?.pop && level === 'municipalities' && (
                <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:10, fontSize:12, color:'var(--muted)' }}>
                  <Users size={12}/> {info.pop.toLocaleString('pt-PT')} hab.
                  {info?.district && <><span>·</span><Building2 size={12}/> {info.district}</>}
                </div>
              )}
              <SectionBlock icon={<MapPin size={12}/>} color="#ff6b6b" title="Locais a Visitar" empty="Podes sugerir!">
                {(highlights.length > 0 || suggVisit.length > 0) && <>{highlights.map((h,i) => <InfoRow key={i} text={typeof h==='string'?h:h.name} sub={h.date}/>)}{suggVisit.map((s,i) => <InfoRow key={'sv'+i} text={s.text}/>)}</>}
              </SectionBlock>
              <SectionBlock icon={<Utensils size={12}/>} color="#4ea8de" title="Pratos Típicos" empty="Podes sugerir!">
                {(food.length > 0 || suggFood.length > 0) && <>{food.map((f,i) => <InfoRow key={i} text={f}/>)}{suggFood.map((s,i) => <InfoRow key={'sf'+i} text={s.text}/>)}</>}
              </SectionBlock>
              <SectionBlock icon={<Cake size={12}/>} color="#9b72cf" title="Doçaria" empty="Podes sugerir!">
                {(sweets.length > 0 || suggSweet.length > 0) && <>{sweets.map((s,i) => <InfoRow key={i} text={s}/>)}{suggSweet.map((s,i) => <InfoRow key={'ss'+i} text={s.text}/>)}</>}
              </SectionBlock>
              <SectionBlock icon={<Music size={12}/>} color="#43c59e" title="Festividades" empty="Podes sugerir!">
                {[...festMain, ...festOther].length > 0 && [...festMain, ...festOther].map((f,i) => <InfoRow key={i} text={typeof f==='string'?f:(f.text||f.name)} sub={f.date||null}/>)}
              </SectionBlock>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── DESKTOP: floating card ──────────────────────────────────────────
  return (
    <div
      ref={sheetRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position:'fixed', left, top, width:cardW,
        maxHeight:'calc(100vh - 80px)',
        borderRadius:20,
        zIndex:9999,
        overflowY:'auto',
        background:'var(--surface)', border:'1px solid var(--border)',
        boxShadow:'0 8px 32px rgba(0,0,0,.15)',
        fontFamily:'var(--font)',
      }}
    >
      {info?.img && (
        <div style={{ position:'relative', height:90, overflow:'hidden', flexShrink:0 }}>
          <img src={info.img} alt={munName} style={{ width:'100%', height:'100%', objectFit:'cover' }}
            onError={e => e.target.parentElement.style.display='none'}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,.5))' }}/>
          {isVisited && <div style={{ position:'absolute', top:8, right:8, background:color, color:'#fff', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>✓ Visitado</div>}
        </div>
      )}

      <div style={{ padding:'12px 14px 0' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:4 }}>
          <div style={{ fontWeight:800, fontSize:15, color:'var(--text)', lineHeight:1.2, flex:1 }}>{name}</div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <X size={12}/>
          </button>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'3px 10px', marginBottom:12 }}>
          {concelho && concelho !== name && <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--muted)' }}><MapPin size={10}/> {concelho}</span>}
          {info?.district && <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--muted)' }}><Building2 size={10}/> {info.district}</span>}
          {info?.pop && level === 'municipalities' && <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--muted)' }}><Users size={10}/> {info.pop.toLocaleString('pt-PT')} hab.</span>}
        </div>

        <SectionBlock icon={<MapPin size={12}/>} color="#ff6b6b" title="Locais a Visitar" empty="Sem informação — podes sugerir!">
          {(highlights.length > 0 || suggVisit.length > 0) && <>{highlights.map((h,i) => <InfoRow key={i} text={typeof h==='string'?h:h.name} sub={h.date}/>)}{suggVisit.map((s,i) => <InfoRow key={'sv'+i} text={s.text}/>)}</>}
        </SectionBlock>
        <SectionBlock icon={<Utensils size={12}/>} color="#4ea8de" title="Pratos Típicos" empty="Sem informação — podes sugerir!">
          {(food.length > 0 || suggFood.length > 0) && <>{food.map((f,i) => <InfoRow key={i} text={f}/>)}{suggFood.map((s,i) => <InfoRow key={'sf'+i} text={s.text}/>)}</>}
        </SectionBlock>
        <SectionBlock icon={<Cake size={12}/>} color="#9b72cf" title="Doçaria" empty="Sem informação — podes sugerir!">
          {(sweets.length > 0 || suggSweet.length > 0) && <>{sweets.map((s,i) => <InfoRow key={i} text={s}/>)}{suggSweet.map((s,i) => <InfoRow key={'ss'+i} text={s.text}/>)}</>}
        </SectionBlock>
        <SectionBlock icon={<Music size={12}/>} color="#43c59e" title="Festividades" empty="Sem informação — podes sugerir!">
          {[...festMain,...festOther].length>0 && [...festMain,...festOther].map((f,i) => <InfoRow key={i} text={typeof f==='string'?f:(f.text||f.name)} sub={f.date||null}/>)}
        </SectionBlock>
      </div>

      <div style={{ padding:'8px 14px 12px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
        <button onClick={() => onToggle && onToggle(locationId, name)} style={{
          flex:1, padding:'7px 10px', borderRadius:9, border:'2px solid',
          borderColor: isVisited ? color : 'var(--border)',
          background: isVisited ? color : 'var(--surface2)',
          color: isVisited ? '#fff' : 'var(--muted)',
          fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .18s',
        }}>
          {isVisited ? '✓ Visitado' : '+ Marcar'}
        </button>
        <button onClick={toggleFavorite} style={{
          width:34, height:34, borderRadius:9, border:'2px solid',
          borderColor: isFav ? '#f59e0b' : 'var(--border)',
          background: isFav ? '#fef3c7' : 'var(--surface2)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', flexShrink:0, transition:'all .18s',
          boxShadow: isFav ? '0 0 0 2px #fef3c7, 0 0 0 4px #f59e0b' : 'none',
        }}>
          <Star size={14} fill={isFav?'#f59e0b':'none'} color={isFav?'#f59e0b':'var(--muted)'}/>
        </button>
        <button onClick={onOpenSuggest} style={{
          display:'flex', alignItems:'center', gap:5, padding:'6px 10px',
          borderRadius:9, border:'1px solid var(--border)',
          background:'var(--surface2)', color:'var(--muted)',
          fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0,
        }}>
          <MessageSquarePlus size={13}/> Sugerir
        </button>
      </div>
    </div>
  )
}
