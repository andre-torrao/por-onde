import { useState, useEffect } from 'react'
import { getMunicipalityInfo, getCulture } from './data/municipalityInfo'
import { getParishInfo, getParishPop } from './data/parishInfo'
import { MapPin, Users, Building2, Music, Utensils, Cake, Star, MessageSquarePlus, X } from 'lucide-react'
import { getSuggestions } from './storage'

function InfoRow({ text, sub }) {
  return (
    <div style={{ display:'flex', gap:7, alignItems:'flex-start', marginBottom:4 }}>
      <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--accent)', flexShrink:0, marginTop:7 }}/>
      <span style={{ fontSize:12, color:'var(--text)', lineHeight:1.5, flex:1 }}>
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
      {children || (
        <div style={{ fontSize:11, color:'var(--border2)', fontStyle:'italic', paddingLeft:10 }}>
          {empty}
        </div>
      )}
    </div>
  )
}

export default function InfoCard({ tooltip, onOpenSuggest, onClose, level, onMouseEnter, onMouseLeave }) {
  const [approved, setApproved] = useState([])

  const { name, id: locationId, concelho, isVisited, x, y } = tooltip || {}
  const munName    = level === 'municipalities' ? name : (concelho || name)
  const info       = getMunicipalityInfo(munName)
  const culture    = getCulture(munName)
  const parishInfo = level === 'parishes' ? getParishInfo(name, concelho) : null
  const parishPop  = level === 'parishes' ? getParishPop(name, concelho) : null

  useEffect(() => {
    if (!locationId) return
    getSuggestions(locationId).then(suggs => {
      setApproved(suggs) // already filtered to approved by Supabase query
    })
  }, [locationId])

  if (!tooltip) return null

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const cardW  = isMobile ? Math.min(window.innerWidth - 24, 360) : 290
  const left   = isMobile ? (window.innerWidth - cardW) / 2 : Math.min(x + 16, window.innerWidth - cardW - 12)
  const top    = isMobile ? 'auto' : Math.max(10, Math.min(y - 40, window.innerHeight - 560))
  const bottom = isMobile ? 70 : 'auto'

  // Content
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

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position:'fixed', left, top, bottom, zIndex:9999, width:cardW,
        maxHeight:'calc(100vh - 80px)', overflowY:'auto',
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,.18)',
        pointerEvents:'auto', fontFamily:'Open Sans,sans-serif',
      }}
    >
      {/* Cover image */}
      {info?.img && (
        <div style={{ position:'relative', height:100, overflow:'hidden', flexShrink:0 }}>
          <img src={info.img} alt={munName} style={{ width:'100%', height:'100%', objectFit:'cover' }}
            onError={e => e.target.parentElement.style.display='none'}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,.55))' }}/>
          {info.imgCredit && <div style={{ position:'absolute', bottom:4, right:6, fontSize:9, color:'rgba(255,255,255,.7)' }}>© {info.imgCredit}</div>}
          {isVisited && <div style={{ position:'absolute', top:8, right:8, background:'var(--accent)', color:'#fff', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>✓ Visitado</div>}
        </div>
      )}

      <div style={{ padding:'12px 14px 0' }}>
        {/* Name + meta */}
        <div style={{ fontWeight:800, fontSize:15, color:'var(--text)', lineHeight:1.2, marginBottom:4 }}>{name}</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'3px 10px', marginBottom:12 }}>
          {concelho && concelho !== name && <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--muted)' }}><MapPin size={10}/> {concelho}</span>}
          {info?.district && <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--muted)' }}><Building2 size={10}/> {info.district}</span>}
          {(parishPop || info?.pop) && <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--muted)' }}><Users size={10}/> {(parishPop || info.pop).toLocaleString('pt-PT')} hab.</span>}
        </div>

        {/* Locais a Visitar */}
        <SectionBlock icon={<Star size={11}/>} color="#d4500a" title="Locais a Visitar" empty="Sem informação — podes sugerir!">
          {(highlights.length > 0 || suggVisit.length > 0) && (
            <>
              {highlights.map((h,i) => <InfoRow key={i} text={typeof h==='string'?h:h.name} sub={h.date}/>)}
              {suggVisit.map((s,i) => <InfoRow key={'sv'+i} text={s.text}/>)}
            </>
          )}
        </SectionBlock>

        {/* Pratos Típicos */}
        <SectionBlock icon={<Utensils size={11}/>} color="#1565c0" title="Pratos Típicos" empty="Sem informação — podes sugerir!">
          {(food.length > 0 || suggFood.length > 0) && (
            <>
              {food.map((f,i) => <InfoRow key={i} text={f}/>)}
              {suggFood.map((s,i) => <InfoRow key={'sf'+i} text={s.text}/>)}
            </>
          )}
        </SectionBlock>

        {/* Doçaria Tradicional */}
        <SectionBlock icon={<Cake size={11}/>} color="#6a1b9a" title="Doçaria Tradicional" empty="Sem informação — podes sugerir!">
          {(sweets.length > 0 || suggSweet.length > 0) && (
            <>
              {sweets.map((s,i) => <InfoRow key={i} text={s}/>)}
              {suggSweet.map((s,i) => <InfoRow key={'ss'+i} text={s.text}/>)}
            </>
          )}
        </SectionBlock>

        {/* Festa Principal */}
        <SectionBlock icon={<Music size={11}/>} color="#2e7d52" title="Festa Principal" empty="Sem informação — podes sugerir!">
          {festMain.length > 0 && festMain.map((f,i) => (
            <InfoRow key={i} text={typeof f==='string'?f:(f.text||f.name)} sub={f.date||null}/>
          ))}
        </SectionBlock>

        {/* Outras Festividades */}
        <SectionBlock icon={<Music size={11}/>} color="#4a90d9" title="Outras Festividades" empty="Sem informação — podes sugerir!">
          {festOther.length > 0 && festOther.map((f,i) => (
            <InfoRow key={i} text={typeof f==='string'?f:(f.text||f.name)} sub={f.date||null}/>
          ))}
        </SectionBlock>
      </div>

      {/* Action bar */}
      <div style={{ padding:'8px 14px 12px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
        <span style={{ fontSize:11, color: isVisited?'var(--accent)':'var(--muted)', flex:1 }}>
          {isVisited ? '✓ Visitado' : 'Clica no mapa'}
        </span>
        <button onClick={onOpenSuggest} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 11px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--muted)', fontSize:11, fontWeight:600, fontFamily:'Open Sans,sans-serif', cursor:'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background='#e8f5ee'; e.currentTarget.style.color='#2e7d52' }}
          onMouseLeave={e => { e.currentTarget.style.background='var(--surface2)'; e.currentTarget.style.color='var(--muted)' }}
        ><MessageSquarePlus size={11}/> Sugerir</button>
        <button onClick={onClose} title="Fechar" style={{ width:26, height:26, borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
          onMouseEnter={e => e.currentTarget.style.background='var(--border)'}
          onMouseLeave={e => e.currentTarget.style.background='var(--surface2)'}
        ><X size={11}/></button>
      </div>
    </div>
  )
}
