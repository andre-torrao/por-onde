import { useState, useMemo } from 'react'
import { Search, X, CheckCircle2, Circle, MapPin, ChevronRight } from 'lucide-react'
import { useAuth } from './auth'

const LEVELS = [
  { min:0,   label:'Curioso',         color:'#78736a' },
  { min:5,   label:'Viajante',        color:'#2563eb' },
  { min:15,  label:'Explorador',      color:'#16a34a' },
  { min:30,  label:'Aventureiro',     color:'#d97706' },
  { min:50,  label:'Grande Viajante', color:'#7c3aed' },
  { min:70,  label:'Conhecedor',      color:'#0f766e' },
  { min:90,  label:'Embaixador',      color:'#e85d3a' },
  { min:100, label:'Lenda',           color:'#1a1814' },
]
function getLevel(pct) { return [...LEVELS].reverse().find(l => pct >= l.min) || LEVELS[0] }

function hl(text, q) {
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text
  return (<>{text.slice(0,i)}<mark style={{ background:'rgba(15,118,110,.18)', color:'var(--accent)', borderRadius:2, padding:'0 1px' }}>{text.slice(i,i+q.length)}</mark>{text.slice(i+q.length)}</>)
}

// Tab pill button
function TabPill({ active, onClick, children, color }) {
  return (
    <button onClick={onClick} style={{
      padding:'7px 14px', borderRadius:20, border:'none',
      background: active ? (color || 'var(--accent)') : 'var(--surface2)',
      color: active ? '#fff' : 'var(--muted)',
      fontSize:12, fontWeight: active ? 700 : 500,
      cursor:'pointer', transition:'all .18s', whiteSpace:'nowrap', flexShrink:0,
    }}>{children}</button>
  )
}

function EntryRow({ id, displayName, concelho, isVisited, q, onView, onRemove, onToggle, onZoomTo }) {
  const showConc = q && concelho && concelho.toLowerCase().includes(q.toLowerCase()) && !displayName.toLowerCase().includes(q.toLowerCase())

  function handleClick() {
    // Always zoom to location
    onZoomTo && onZoomTo(id)
    // If visited, show info card
    if (isVisited) onView && onView(id)
  }

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'10px 10px', borderRadius:12, marginBottom:4,
      border:'1px solid',
      borderColor: isVisited ? 'rgba(15,118,110,.2)' : 'var(--border)',
      background: isVisited ? 'var(--accent-bg)' : 'var(--surface)',
      cursor:'pointer',
    }}>
      {/* Checkbox — toggles visited */}
      <button
        onClick={e => { e.stopPropagation(); onToggle && onToggle(id, displayName) }}
        style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', padding:2, flexShrink:0 }}
      >
        {isVisited
          ? <CheckCircle2 size={20} style={{ color:'var(--accent)' }}/>
          : <Circle size={20} style={{ color:'var(--border2)' }}/>
        }
      </button>

      {/* Name — zooms and shows card */}
      <div onClick={handleClick} style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, color: isVisited?'var(--accent)':'var(--text)', fontWeight: isVisited?600:500, lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {hl(displayName, q)}
        </div>
        {showConc && (
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{hl(concelho, q)}</div>
        )}
      </div>

      {/* Zoom arrow */}
      <div onClick={handleClick} style={{ color:'var(--border2)', display:'flex', flexShrink:0 }}>
        <ChevronRight size={14}/>
      </div>

      {/* Remove button for visited */}
      {isVisited && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(id, displayName) }}
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--border2)', display:'flex', padding:'2px', borderRadius:6, flexShrink:0 }}
        >
          <X size={13}/>
        </button>
      )}
    </div>
  )
}

export default function Sidebar({
  visited, visitedMun, visitedPar,
  onView, onRemove, onZoomTo, onToggle,
  idNameMap, level, onLevelChange,
  munCount, parCount, onClose,
}) {
  const { user } = useAuth()
  const [q,   setQ]  = useState('')
  const [tab, setTab] = useState('all')

  const entries = useMemo(() => {
    return [...idNameMap.entries()]
      .map(([id, val]) => {
        if (typeof val === 'string') return { id, name:val, concelho:'', displayName:val }
        return { id, name:val.name||'', concelho:val.concelho||'', displayName:val.displayName||val.name||'' }
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt'))
  }, [idNameMap])

  const visitedEntries = useMemo(() => entries.filter(e => visited.has(e.id)), [entries, visited])

  const filtered = useMemo(() => {
    const base = tab === 'visited' ? visitedEntries : entries
    if (!q) return base
    const ql = q.toLowerCase()
    return base.filter(e =>
      e.name.toLowerCase().includes(ql) ||
      e.concelho.toLowerCase().includes(ql) ||
      e.displayName.toLowerCase().includes(ql)
    )
  }, [entries, visitedEntries, tab, q])

  const isMun  = level === 'municipalities'
  const vCount = visited.size
  const total  = entries.length
  const pct    = total > 0 ? Math.round(vCount / total * 100) : 0
  const lvl    = getLevel(Math.round(munCount / 307 * 100))

  return (
    <div style={{ width:272, height:'100%', background:'var(--bg)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── Header ── */}
      <div style={{ background: lvl.color, padding:'14px 14px 12px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:'rgba(255,255,255,.2)', border:'1.5px solid rgba(255,255,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            {user?.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:22 }}>👤</span>}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.65)', lineHeight:1, marginBottom:2 }}>Olá,</div>
            <div style={{ fontWeight:700, fontSize:15, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>{user?.displayName || user?.id}</div>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:9, border:'1px solid rgba(255,255,255,.3)', background:'rgba(255,255,255,.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}>
            <X size={14}/>
          </button>
        </div>

        {/* Mini stats */}
        <div style={{ display:'flex', gap:6, marginTop:10 }}>
          {[
            { val:munCount, label:'Concelhos', active:isMun, key:'municipalities' },
            { val:parCount, label:'Freguesias', active:!isMun, key:'parishes' },
          ].map(s => (
            <button key={s.key} onClick={() => { onLevelChange(s.key); setTab('all'); setQ('') }} style={{
              flex:1, padding:'8px 10px', borderRadius:10,
              background: s.active ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.1)',
              border: `1px solid ${s.active ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.15)'}`,
              cursor:'pointer', textAlign:'left',
            }}>
              <div style={{ fontSize:17, fontWeight:800, color:'#fff', lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2, fontWeight:500 }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <span style={{ fontSize:10, color:'rgba(255,255,255,.65)', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px' }}>{lvl.label}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{Math.round(munCount/307*100)}%</span>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,.2)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.round(munCount/307*100)}%`, background:'rgba(255,255,255,.8)', borderRadius:3, transition:'width .6s' }}/>
          </div>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ padding:'10px 12px 0', flexShrink:0, display:'flex', gap:6, overflowX:'auto' }}>
        <TabPill active={tab==='all'} onClick={() => { setTab('all'); setQ('') }} color="var(--accent)">Todos</TabPill>
        <TabPill active={tab==='visited'} onClick={() => { setTab('visited'); setQ('') }} color="var(--accent)">Visitados ({vCount})</TabPill>
      </div>

      {/* ── Search ── */}
      <div style={{ padding:'8px 12px 6px', flexShrink:0 }}>
        <div style={{ position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', pointerEvents:'none' }}/>
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Pesquisar localidade…"
            style={{ width:'100%', padding:'9px 28px 9px 30px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:13, color:'var(--text)', fontFamily:'var(--font)', outline:'none' }}
            onFocus={e => e.target.style.borderColor='var(--accent)'}
            onBlur={e => e.target.style.borderColor='var(--border)'}
          />
          {q && <button onClick={() => setQ('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', display:'flex', padding:4 }}><X size={12}/></button>}
        </div>
        {q && <div style={{ fontSize:11, color:'var(--muted)', marginTop:3, paddingLeft:2 }}>{filtered.length} resultado{filtered.length!==1?'s':''}</div>}
      </div>

      {/* ── Hint ── */}
      <div style={{ padding:'0 12px 6px', flexShrink:0 }}>
        <div style={{ fontSize:11, color:'var(--muted)', background:'var(--surface)', borderRadius:8, padding:'6px 10px', border:'1px solid var(--border)' }}>
          Toca no <CheckCircle2 size={11} style={{ verticalAlign:'middle', color:'var(--accent)' }}/> para marcar como visitado · Toca no nome para ver no mapa
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'2px 10px 16px' }}>
        {tab === 'visited' && vCount === 0 && (
          <div style={{ padding:'32px 8px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
            <MapPin size={26} style={{ margin:'0 auto 10px', display:'block', opacity:.3 }}/>
            Ainda não marcaste nenhum{isMun?' concelho':'a freguesia'}
          </div>
        )}
        {filtered.length === 0 && !(tab === 'visited' && vCount === 0) && (
          <div style={{ padding:'24px 8px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
            {q ? `Sem resultados para "${q}"` : 'Nada a mostrar'}
          </div>
        )}
        {filtered.map(({ id, displayName, concelho }) => (
          <EntryRow
            key={id} id={id}
            displayName={displayName} concelho={concelho}
            isVisited={visited.has(id)} q={q}
            onView={onView}
            onRemove={onRemove}
            onToggle={onToggle}
            onZoomTo={onZoomTo}
          />
        ))}
      </div>
    </div>
  )
}
