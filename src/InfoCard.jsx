import { useState, useEffect, useRef } from 'react'
import { getMunicipalityInfo, getCulture } from './data/municipalityInfo'
import { getParishInfo, getParishPop } from './data/parishInfo'
import { MapPin, Users, Building2, Music, Utensils, Cake, Star, MessageSquarePlus, X } from 'lucide-react'
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
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
        <span style={{ color, display:'flex' }}>{icon}</span>
        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)' }}>{title}</span>
      </div>
      {children || (
        <div style={{ fontSize:12, color:'var(--border2)', fontStyle:'italic', paddingLeft:10 }}>
          {empty}
        </div>
      )}
    </div>
  )
}

export default function InfoCard({ tooltip, onOpenSuggest, onClose, onToggle, level, isMobile, onMouseEnter, onMouseLeave }) {
  const { user } = useAuth()
  const [approved, setApproved] = useState([])
  const [isFav, setIsFav] = useState(false)
  const startY = useRef(null)
  const sheetRef = useRef(null)

  const { name, id: locationId, concelho, isVisited, x, y } = tooltip || {}
  const munName    = level === 'municipalities' ? name : (concelho || name)
  const info       = getMunicipalityInfo(munName)
  const culture    = getCulture(munName)
  const parishInfo = level === 'parishes' ? getParishInfo(name, concelho) : null
  const parishPop  = level === 'parishes' ? getParishPop(name, concelho) : null

  useEffect(() => {
    if (!locationId) return
    getSuggestions(locationId).then(setApproved)
  }, [locationId])

  useEffect(() => {
    if (!user?.supabaseId || !locationId) return
    supabase.from('profiles').select('favorites').eq('id', user.supabaseId).single()
      .then(({ data }) => {
        const favs = data?.favorites || []
        setIsFav(favs.some(f => f.id === locationId))
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
  }

  if (!tooltip) return null

  // Desktop positioning
  const cardW  = 290
  const left   = Math.min(x + 16, window.innerWidth - cardW - 12)
  const top    = Math.max(10, Math.min(y - 40, window.innerHeight - 560))

  const highlights = info?.highlights || parishInfo?.highlights || []
  const festivals  = culture?.festivals || parishInfo?.festivals || []
  const food       = culture?.food || []
  const sweets     = culture?.sweets || []
  const parishFests = parishInfo?.festivals?.filter(f => !festivals.find(ff => ff.name === f.name)) || []

  const suggVisit = approved.filter(s => s.category === 'visit')
  const suggFood  = approved.filter(s => s.category === 'food')
  const suggSweet = approved.filter(s => s.category === 'sweet')
  const suggFest  = approved.filter(s => s.category === 'fest')
  const suggOther = approved.filter(s => s.category === 'other')

  const festMain  = [...festivals.slice(0,1), ...suggFest.slice(0,1)]
  const festOther = [...festivals.slice(1), ...parishFests, ...suggFest.slice(1), ...suggOther]

  // Touch drag to close (mobile bottom sheet)
  function onTouchStart(e) {
    startY.current = e.touches[0].clientY
  }
  function onTouchEnd(e) {
    if (startY.current === null) return
    const dy = e.changedTouches[0].clientY - startY.current
    if (dy > 60) onClose()
    startY.current = null
  }

  const mobileStyle = {
    position:'fixed', left:0, right:0, bottom:0, top:'auto',
    width:'100%', maxWidth:'100%',
    borderRadius:'20px 20px 0 0',
    maxHeight:'52vh',
    animation:'slideUp .3s cubic-bezier(.4,0,.2,1)',
    paddingBottom:'var(--safe-bottom)',
    zIndex:9999,
  }

  const desktopStyle = {
    position:'fixed', left, top, width:cardW,
    maxHeight:'calc(100vh - 80px)',
    borderRadius:14,
    zIndex:9999,
  }

  return (
    <div
      ref={sheetRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={isMobile ? onTouchStart : undefined}
      onTouchEnd={isMobile ? onTouchEnd : undefined}
      style={{
        ...(isMobile ? mobileStyle : desktopStyle),
        overflowY:'auto',
        background:'var(--surface)', border:'1px solid var(--border)',
        boxShadow:'0 -4px 32px rgba(0,0,0,.18)',
        pointerEvents:'auto', fontFamily:'Open Sans,sans-serif',
      }}
    >
      {/* Drag handle — mobile only */}
      {isMobile && (
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', cursor:'grab' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border2)' }}/>
        </div>
      )}

      {/* Cover image */}
      {info?.img && (
        <div style={{ position:'relative', height: isMobile ? 120 : 100, overflow:'hidden', flexShrink:0 }}>
          <img src={info.img} alt={munName} style={{ width:'100%', height:'100%', objectFit:'cover' }}
            onError={e => e.target.parentElement.style.display='none'}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,.55))' }}/>
          {info.imgCredit && <div style={{ position:'absolute', bottom:4, right:6, fontSize:9, color:'rgba(255,255,255,.7)' }}>© {info.imgCredit}</div>}
          {isVisited && <div style={{ position:'absolute', top:8, right:8, background:'var(--accent)', color:'#fff', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>✓ Visitado</div>}
        </div>
      )}

      <div style={{ padding: isMobile ? '14px 16px 0' : '12px 14px 0' }}>
        {/* Name + close */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:4 }}>
          <div style={{ fontWeight:800, fontSize: isMobile ? 17 : 15, color:'var(--text)', lineHeight:1.2, flex:1 }}>{name}</div>
          <button onClick={onClose} style={{
            width:30, height:30, borderRadius:8, border:'1px solid var(--border)',
            background:'var(--surface2)', color:'var(--muted)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}><X size={13}/></button>
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:'3px 10px', marginBottom:14 }}>
          {concelho && concelho !== name && <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, color:'var(--muted)' }}><MapPin size={11}/> {concelho}</span>}
          {info?.district && <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, color:'var(--muted)' }}><Building2 size={11}/> {info.district}</span>}
          {info?.pop && level === 'municipalities' && <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, color:'var(--muted)' }}><Users size={11}/> {info.pop.toLocaleString('pt-PT')} hab.</span>}
        </div>

        <SectionBlock icon={<Star size={12}/>} color="#d4500a" title="Locais a Visitar" empty="Sem informação — podes sugerir!">
          {(highlights.length > 0 || suggVisit.length > 0) && (
            <>{highlights.map((h,i) => <InfoRow key={i} text={typeof h==='string'?h:h.name} sub={h.date}/>)}
              {suggVisit.map((s,i) => <InfoRow key={'sv'+i} text={s.text}/>)}</>
          )}
        </SectionBlock>

        <SectionBlock icon={<Utensils size={12}/>} color="#1565c0" title="Pratos Típicos" empty="Sem informação — podes sugerir!">
          {(food.length > 0 || suggFood.length > 0) && (
            <>{food.map((f,i) => <InfoRow key={i} text={f}/>)}
              {suggFood.map((s,i) => <InfoRow key={'sf'+i} text={s.text}/>)}</>
          )}
        </SectionBlock>

        <SectionBlock icon={<Cake size={12}/>} color="#6a1b9a" title="Doçaria Tradicional" empty="Sem informação — podes sugerir!">
          {(sweets.length > 0 || suggSweet.length > 0) && (
            <>{sweets.map((s,i) => <InfoRow key={i} text={s}/>)}
              {suggSweet.map((s,i) => <InfoRow key={'ss'+i} text={s.text}/>)}</>
          )}
        </SectionBlock>

        <SectionBlock icon={<Music size={12}/>} color="#2e7d52" title="Festa Principal" empty="Sem informação — podes sugerir!">
          {festMain.length > 0 && festMain.map((f,i) => (
            <InfoRow key={i} text={typeof f==='string'?f:(f.text||f.name)} sub={f.date||null}/>
          ))}
        </SectionBlock>

        <SectionBlock icon={<Music size={12}/>} color="#4a90d9" title="Outras Festividades" empty="Sem informação — podes sugerir!">
          {festOther.length > 0 && festOther.map((f,i) => (
            <InfoRow key={i} text={typeof f==='string'?f:(f.text||f.name)} sub={f.date||null}/>
          ))}
        </SectionBlock>
      </div>

      {/* Action bar */}
      <div style={{ padding: isMobile ? '10px 14px 14px' : '8px 14px 10px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6, marginTop:4, flexWrap: isMobile ? 'nowrap' : 'nowrap' }}>
        {/* Visited button */}
        <button onClick={() => onToggle && onToggle(locationId, name)} style={{
          display:'flex', alignItems:'center', gap:5,
          padding: isMobile ? '9px 14px' : '6px 12px',
          borderRadius:9, border:'1.5px solid',
          borderColor: isVisited ? 'var(--accent)' : 'var(--border)',
          background: isVisited ? 'var(--accent)' : 'var(--surface2)',
          color: isVisited ? '#fff' : 'var(--muted)',
          fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0, transition:'all .18s',
        }}>
          {isVisited ? '✓ Visitado' : '+ Marcar'}
        </button>
        {/* Favorite */}
        <button onClick={toggleFavorite} title={isFav ? 'Remover favorito' : 'Favorito'} style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:36, height:36, borderRadius:9, border:'1px solid',
          borderColor: isFav ? '#f59e0b' : 'var(--border)',
          background: isFav ? '#fef3c7' : 'var(--surface2)',
          color: isFav ? '#f59e0b' : 'var(--muted)',
          cursor:'pointer', flexShrink:0,
        }}>
          <Star size={14} fill={isFav ? '#f59e0b' : 'none'}/>
        </button>
        <div style={{ flex:1 }}/>
        {/* Suggest */}
        <button onClick={onOpenSuggest} style={{
          display:'flex', alignItems:'center', gap:5,
          padding: isMobile ? '9px 12px' : '6px 10px',
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
