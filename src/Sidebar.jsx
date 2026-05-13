import { useState, useMemo } from 'react'
import { Search, X, CheckCircle2, Circle, MapPin, Trash2 } from 'lucide-react'
import { useAuth } from './auth'

const LEVELS = [
  { min:0,   label:'Curioso' },
  { min:5,   label:'Viajante' },
  { min:15,  label:'Explorador' },
  { min:30,  label:'Aventureiro' },
  { min:50,  label:'Grande Viajante' },
  { min:70,  label:'Conhecedor' },
  { min:90,  label:'Embaixador' },
  { min:100, label:'Lenda' },
]
function getLevel(pct) { return [...LEVELS].reverse().find(l => pct >= l.min) || LEVELS[0] }

function hl(text, q) {
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text
  return (<>{text.slice(0,i)}<mark style={{ background:'rgba(212,80,10,.18)', color:'var(--accent)', borderRadius:2, padding:'0 1px' }}>{text.slice(i,i+q.length)}</mark>{text.slice(i+q.length)}</>)
}

// Single entry row — behaviour differs for visited vs unvisited
function EntryRow({ id, displayName, concelho, isVisited, q, onView, onRemove, onToggle, onZoomTo }) {
  const showConc = q && concelho && concelho.toLowerCase().includes(q.toLowerCase()) && !displayName.toLowerCase().includes(q.toLowerCase())

  return (
    <div
      style={{
        display:'flex', alignItems:'center', gap:6,
        padding:'7px 8px', borderRadius:8, marginBottom:1,
        border:'1px solid',
        borderColor: isVisited ? 'rgba(212,80,10,.22)' : 'transparent',
        background: isVisited ? 'var(--accent-bg)' : 'transparent',
        transition:'all .1s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { if (!isVisited) e.currentTarget.style.background='var(--surface2)' }}
      onMouseLeave={e => { if (!isVisited) e.currentTarget.style.background='transparent' }}
    >
      {/* Checkbox icon */}
      <div
        onClick={() => {
          if (isVisited) {
            // Visited: clicking shows the card (zoom + view)
            onView(id); onZoomTo && onZoomTo(id)
          } else {
            // Unvisited: clicking marks as visited
            onToggle(id, displayName); onZoomTo && onZoomTo(id)
          }
        }}
        style={{ flexShrink:0, display:'flex', alignItems:'center', cursor:'pointer' }}
      >
        {isVisited
          ? <CheckCircle2 size={14} style={{ color:'var(--accent)' }}/>
          : <Circle size={14} style={{ color:'var(--border2)' }}/>
        }
      </div>

      {/* Name */}
      <div
        style={{ flex:1, minWidth:0, cursor:'pointer' }}
        onClick={() => { if (isVisited) { onView(id); onZoomTo && onZoomTo(id) } else { onToggle(id, displayName); onZoomTo && onZoomTo(id) } }}
      >
        <div style={{ fontSize:12, color: isVisited?'var(--accent)':'var(--text)', fontWeight: isVisited?600:400, lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {hl(displayName, q)}
        </div>
        {showConc && (
          <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>{hl(concelho, q)}</div>
        )}
      </div>

      {/* Remove button — only for visited items */}
      {isVisited && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(id, displayName) }}
          title="Remover de visitados"
          style={{
            background:'none', border:'none', cursor:'pointer',
            color:'var(--border2)', display:'flex', padding:'2px', borderRadius:5,
            flexShrink:0, transition:'color .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color='#c62828'}
          onMouseLeave={e => e.currentTarget.style.color='var(--border2)'}
        >
          <X size={12}/>
        </button>
      )}
    </div>
  )
}

export default function Sidebar({
  visited, visitedMun, visitedPar,
  onView, onRemove, onZoomTo,
  idNameMap, level, onLevelChange,
  munCount, parCount, onClose,
}) {
  const { user } = useAuth()
  const [q,    setQ]    = useState('')
  const [tab,  setTab]  = useState('all') // 'all' | 'visited'

  const handleToggle = useCallback_polyfill(onView, onRemove) // handled by parent

  const entries = useMemo(() => {
    return [...idNameMap.entries()]
      .map(([id, val]) => {
        if (typeof val === 'string') return { id, name:val, concelho:'', displayName:val }
        return { id, name:val.name||'', concelho:val.concelho||'', displayName:val.displayName||val.name||'' }
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt'))
  }, [idNameMap])

  // Visited entries list (current level)
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

  const total  = entries.length
  const vCount = visited.size
  const pct    = total > 0 ? Math.round(vCount / total * 100) : 0
  const isMun  = level === 'municipalities'
  const currentLevel = getLevel(Math.round(munCount / 307 * 100))

  // Fake hook (no real useCallback polyfill needed - just inline)
  function handleEntryToggle(id, displayName) {
    // This is for UNVISITED items - mark as visited
    // Use onView + toggle logic - parent's handleSidebarToggle handles this
    // But we don't have it here... so we call onView which sets the card
    // and the parent's handleSidebarToggle handles the toggle
    // Actually we need a separate prop for this
    // For now: unvisited click → we won't toggle from sidebar (only from map)
    // The sidebar is read-only for unvisited, click just zooms
    onZoomTo && onZoomTo(id)
  }

  return (
    <div style={{ width:264, height:'100%', background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── User header ── */}
      <div style={{ padding:'14px 14px 12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, background:'var(--accent-bg)', border:'1.5px solid rgba(212,80,10,.22)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            {user?.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:20 }}>👤</span>}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1 }}>Olá,</div>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>{user?.id}</div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', flexShrink:0 }}
            onMouseEnter={e => e.currentTarget.style.background='var(--border)'}
            onMouseLeave={e => e.currentTarget.style.background='var(--surface2)'}
          ><X size={13}/></button>
        </div>
        <div style={{ marginTop:8, display:'inline-flex', alignItems:'center', gap:5, background:'var(--accent-bg)', border:'1px solid rgba(212,80,10,.2)', borderRadius:20, padding:'3px 10px' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)' }}>{currentLevel.label}</span>
          <span style={{ fontSize:10, color:'var(--muted)' }}>· {Math.round(munCount/307*100)}%</span>
        </div>
      </div>

      {/* ── Progress ── */}
      <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:7 }}>
          <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--muted)' }}>
            {isMun ? 'Concelhos visitados' : 'Freguesias visitadas'}
          </span>
          <span style={{ fontSize:20, fontWeight:800, color:'var(--accent)', lineHeight:1 }}>{pct}%</span>
        </div>
        <div style={{ height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:3, background:'linear-gradient(90deg,var(--accent),var(--accent2))', width:`${pct}%`, transition:'width .55s cubic-bezier(.4,0,.2,1)' }}/>
        </div>
        <div style={{ display:'flex', gap:6, marginTop:9 }}>
          <div style={{ flex:1, padding:'7px 10px', borderRadius:9, background: isMun?'var(--accent-bg)':'var(--surface2)', border:`1px solid ${isMun?'rgba(212,80,10,.25)':'var(--border)'}` }}>
            <div style={{ fontSize:17, fontWeight:800, color: isMun?'var(--accent)':'var(--text)', lineHeight:1 }}>{munCount}</div>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px', marginTop:2 }}>Concelhos</div>
          </div>
          <div style={{ flex:1, padding:'7px 10px', borderRadius:9, background: !isMun?'var(--accent-bg)':'var(--surface2)', border:`1px solid ${!isMun?'rgba(212,80,10,.25)':'var(--border)'}` }}>
            <div style={{ fontSize:17, fontWeight:800, color: !isMun?'var(--accent)':'var(--text)', lineHeight:1 }}>{parCount}</div>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px', marginTop:2 }}>Freguesias</div>
          </div>
        </div>
      </div>

      {/* ── Level toggle ── */}
      <div style={{ padding:'10px 12px 0', flexShrink:0 }}>
        <div style={{ display:'flex', background:'var(--surface2)', borderRadius:10, padding:3, gap:3 }}>
          {[['municipalities','Concelhos'],['parishes','Freguesias']].map(([val,label]) => (
            <button key={val} onClick={() => { onLevelChange(val); setTab('all'); setQ('') }} style={{
              flex:1, padding:'7px 6px', borderRadius:8, border:'none',
              background: level===val ? 'var(--surface)' : 'transparent',
              color: level===val ? 'var(--text)' : 'var(--muted)',
              fontSize:11, fontWeight: level===val ? 600 : 400,
              fontFamily:'Open Sans,sans-serif', cursor:'pointer',
              boxShadow: level===val ? '0 1px 4px rgba(0,0,0,.09)' : 'none',
              transition:'all .2s',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── View tabs: All / Visited ── */}
      <div style={{ padding:'8px 12px 0', flexShrink:0 }}>
        <div style={{ display:'flex', gap:5 }}>
          {[['all','Todos'],['visited',`Visitados (${vCount})`]].map(([k,l]) => (
            <button key={k} onClick={() => { setTab(k); setQ('') }} style={{
              flex:1, padding:'5px 6px', borderRadius:8, border:'1.5px solid',
              borderColor: tab===k ? 'var(--accent)' : 'var(--border)',
              background: tab===k ? 'var(--accent-bg)' : 'transparent',
              color: tab===k ? 'var(--accent)' : 'var(--muted)',
              fontSize:11, fontWeight: tab===k ? 700 : 400,
              fontFamily:'Open Sans,sans-serif', cursor:'pointer', transition:'all .2s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ padding:'6px 12px 4px', flexShrink:0 }}>
        <div style={{ position:'relative' }}>
          <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', pointerEvents:'none' }}/>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={isMun ? 'Pesquisar…' : 'Pesquisar freguesia ou concelho…'}
            style={{ width:'100%', padding:'7px 26px 7px 26px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface2)', fontSize:12, color:'var(--text)', fontFamily:'Open Sans,sans-serif', outline:'none', transition:'border-color .2s' }}
            onFocus={e => e.target.style.borderColor='var(--accent)'}
            onBlur={e => e.target.style.borderColor='var(--border)'}
          />
          {q && <button onClick={() => setQ('')} style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', display:'flex', padding:2 }}><X size={11}/></button>}
        </div>
        {q && <div style={{ fontSize:10, color:'var(--muted)', marginTop:3, paddingLeft:2 }}>{filtered.length} resultado{filtered.length!==1?'s':''}</div>}
      </div>

      {/* ── List ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'2px 8px 12px' }}>
        {tab === 'visited' && vCount === 0 && (
          <div style={{ padding:'28px 8px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
            <MapPin size={24} style={{ margin:'0 auto 8px', display:'block', opacity:.3 }}/>
            Ainda não marcaste nenhum{isMun?' concelho':'a freguesia'}
          </div>
        )}
        {filtered.length === 0 && !(tab === 'visited' && vCount === 0) && (
          <div style={{ padding:'24px 8px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
            {q ? `Sem resultados para "${q}"` : 'Nada a mostrar'}
          </div>
        )}
        {filtered.map(({ id, displayName, concelho }) => {
          const isV = visited.has(id)
          return (
            <EntryRow
              key={id}
              id={id}
              displayName={displayName}
              concelho={concelho}
              isVisited={isV}
              q={q}
              onView={onView}
              onRemove={onRemove}
              onToggle={(id, name) => {
                // Unvisited item clicked from list → just zoom + show card
                onView && onView(id)
                onZoomTo && onZoomTo(id)
              }}
              onZoomTo={onZoomTo}
            />
          )
        })}
      </div>
    </div>
  )
}

// Simple inline callback helper (avoids import issues)
function useCallback_polyfill(fn1, fn2) { return fn1 }
