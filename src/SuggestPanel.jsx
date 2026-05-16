import { useState, useEffect, useRef } from 'react'
import { X, Plus, Check, Trash2, Camera } from 'lucide-react'
import { useAuth } from './auth'
import { getSuggestions, addSuggestion, deleteSuggestion, setSuggestionStatus, compressImage } from './storage'

const CATS = [
  { key:'visit',  label:'O que visitar', color:'#d4500a' },
  { key:'food',   label:'Gastronomia',   color:'#1565c0' },
  { key:'sweet',  label:'Doçaria',       color:'#6a1b9a' },
  { key:'fest',   label:'Festa/Evento',  color:'#2e7d52' },
  { key:'other',  label:'Outro',         color:'#7a756c' },
]

export default function SuggestPanel({ locationId, locationName, onClose }) {
  const { user } = useAuth()
  const [allSuggs, setAllSuggs] = useState([])
  const [cat,  setCat]  = useState('visit')
  const [text, setText] = useState('')
  const [date, setDate] = useState('')
  const [photo, setPhoto] = useState(null)
  const [sent,  setSent]  = useState(false)
  const [busy,  setBusy]  = useState(false)
  const fileRef = useRef(null)
  const startY  = useRef(null)

  const isMobile = window.innerWidth < 768

  async function loadAll() {
    const data = await getSuggestions(locationId)
    setAllSuggs(data)
  }

  useEffect(() => { loadAll() }, [locationId])

  async function handlePhoto(e) {
    const file = e.target.files[0]; if (!file) return
    setBusy(true)
    try { setPhoto(await compressImage(file, 600)) } catch(err) { console.error(err) }
    setBusy(false)
  }

  async function submit(e) {
    e.preventDefault()
    if (!text.trim() || !user) return
    setBusy(true)
    const ok = await addSuggestion({
      locationId, locationName, category: cat,
      text: text.trim(), date: date.trim(),
      photo, authorId: user.supabaseId, authorUsername: user.id,
    })
    setBusy(false)
    if (ok) { setText(''); setDate(''); setPhoto(null); setSent(true); setTimeout(() => setSent(false), 3000); loadAll() }
  }

  async function doSetStatus(id, status) { await setSuggestionStatus(id, status); loadAll() }
  async function doDelete(id) { await deleteSuggestion(id); loadAll() }

  const mine    = allSuggs.filter(s => s.author_id === user?.supabaseId || s.author === user?.id)
  const pending = allSuggs.filter(s => s.status === 'pending' && s.author_id !== user?.supabaseId)

  // Drag to close on mobile
  function onTouchStart(e) { startY.current = e.touches[0].clientY }
  function onTouchEnd(e) {
    if (startY.current === null) return
    if (e.changedTouches[0].clientY - startY.current > 60) onClose()
    startY.current = null
  }

  const sheetStyle = isMobile ? {
    position:'fixed', left:0, right:0, bottom:0, top:'auto',
    borderRadius:'20px 20px 0 0',
    maxHeight:'88vh',
    animation:'slideUp .3s cubic-bezier(.4,0,.2,1)',
    paddingBottom:'var(--safe-bottom)',
  } : {
    borderRadius:20,
    width:'100%', maxWidth:460,
    maxHeight:'88vh',
    animation:'popIn .25s ease',
  }

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:19999, background:'rgba(28,26,22,.45)', backdropFilter:'blur(4px)', display:'flex', alignItems: isMobile?'flex-end':'center', justifyContent:'center', padding: isMobile?0:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        onTouchStart={isMobile ? onTouchStart : undefined}
        onTouchEnd={isMobile ? onTouchEnd : undefined}
        style={{ ...sheetStyle, background:'var(--surface)', border:'1px solid var(--border)', boxShadow:'0 -4px 40px rgba(0,0,0,.18)', overflow:'hidden', display:'flex', flexDirection:'column' }}
      >
        {/* Drag handle */}
        {isMobile && (
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', cursor:'grab', flexShrink:0 }}>
            <div style={{ width:36, height:4, borderRadius:2, background:'var(--border2)' }}/>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: isMobile ? '8px 18px 12px' : '18px 20px 14px', borderBottom:'1px solid var(--border)', flexShrink:0, display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.2px', color:'var(--muted)', marginBottom:3 }}>Sugerir informação</div>
            <div style={{ fontWeight:800, fontSize: isMobile?16:18, color:'var(--text)' }}>{locationName}</div>
          </div>
          <button onClick={onClose} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, width:34, height:34, cursor:'pointer', color:'var(--muted)', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '14px 18px 20px' : '16px 20px 20px' }}>
          <form onSubmit={submit}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:8 }}>Nova sugestão</div>

            {/* Category pills */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
              {CATS.map(c => (
                <button key={c.key} type="button" onClick={() => setCat(c.key)} style={{
                  padding: isMobile ? '6px 12px' : '4px 10px',
                  borderRadius:20, border:'1.5px solid',
                  borderColor: cat===c.key ? c.color : 'var(--border)',
                  background: cat===c.key ? c.color+'18' : 'transparent',
                  color: cat===c.key ? c.color : 'var(--muted)',
                  fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif',
                }}>{c.label}</button>
              ))}
            </div>

            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Descreve a tua sugestão…" maxLength={300} rows={3}
              style={{ width:'100%', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface2)', padding:'11px 13px', fontSize:14, color:'var(--text)', fontFamily:'Open Sans,sans-serif', resize:'none', outline:'none', lineHeight:1.5 }}
              onFocus={e => e.target.style.borderColor='var(--accent)'}
              onBlur={e => e.target.style.borderColor='var(--border)'}
            />

            {cat === 'fest' && (
              <input value={date} onChange={e => setDate(e.target.value)}
                placeholder="Data (ex: Agosto, 24 Junho)…"
                style={{ width:'100%', marginTop:8, borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface2)', padding:'11px 13px', fontSize:14, color:'var(--text)', fontFamily:'Open Sans,sans-serif', outline:'none' }}
                onFocus={e => e.target.style.borderColor='var(--accent)'}
                onBlur={e => e.target.style.borderColor='var(--border)'}
              />
            )}

            <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:10 }}>
              <div onClick={() => fileRef.current?.click()} style={{ width:52, height:52, borderRadius:10, flexShrink:0, background: photo?'transparent':'var(--surface2)', border:`1.5px dashed ${photo?'var(--accent)':'var(--border2)'}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden' }}>
                {busy ? <div style={{ width:16, height:16, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> :
                  photo ? <img src={photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <Camera size={18} color="var(--muted)"/>}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{photo?'Foto adicionada ✓':'Foto (opcional)'}</div>
                {photo && <button type="button" onClick={() => setPhoto(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#c62828', padding:0, fontFamily:'Open Sans,sans-serif' }}>Remover</button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:'none' }}/>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14 }}>
              <span style={{ fontSize:11, color:'var(--muted)' }}>{text.length}/300</span>
              <button type="submit" disabled={!text.trim() || busy} style={{
                padding: isMobile ? '10px 20px' : '7px 16px',
                borderRadius:10, border:'none',
                background: text.trim() ? 'var(--accent)' : 'var(--border2)',
                color:'#fff', fontSize:13, fontWeight:600,
                fontFamily:'Open Sans,sans-serif',
                cursor: text.trim() ? 'pointer' : 'default',
                display:'flex', alignItems:'center', gap:5,
              }}>
                <Plus size={13}/> {busy ? 'A enviar…' : 'Enviar'}
              </button>
            </div>
          </form>

          {sent && (
            <div style={{ background:'#e8f5ee', border:'1px solid #a5d6a7', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#2e7d52', marginTop:12, display:'flex', alignItems:'center', gap:6 }}>
              <Check size={14}/> Enviada! Aguarda aprovação.
            </div>
          )}

          {mine.length > 0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:'var(--muted)', marginBottom:8 }}>As tuas sugestões</div>
              {mine.map(s => {
                const c = CATS.find(c => c.key === s.category)
                return (
                  <div key={s.id} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px', marginBottom:8, borderLeft:`3px solid ${c?.color||'var(--muted)'}` }}>
                    <div style={{ display:'flex', gap:8 }}>
                      {(s.photo || s.photo_url) && <img src={s.photo || s.photo_url} alt="" style={{ width:44, height:44, borderRadius:7, objectFit:'cover', flexShrink:0 }}/>}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:c?.color, textTransform:'uppercase', marginBottom:2 }}>{c?.label}</div>
                        <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.4 }}>{s.text}</div>
                        {s.date_info && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>📅 {s.date_info}</div>}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, background: s.status==='approved'?'#e8f5ee':s.status==='rejected'?'#fdecea':'#fff8e1', color: s.status==='approved'?'#2e7d52':s.status==='rejected'?'#c62828':'#e65100', whiteSpace:'nowrap' }}>
                          {s.status==='approved'?'✓ Aprovada':s.status==='rejected'?'✗ Rejeitada':'⏳ Pendente'}
                        </span>
                        <button onClick={() => doDelete(s.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', display:'flex', padding:4 }}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {user?.isAdmin && pending.length > 0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:'var(--accent)', marginBottom:8 }}>⚡ Pendentes ({pending.length})</div>
              {pending.map(s => {
                const c = CATS.find(c => c.key === s.category)
                return (
                  <div key={s.id} style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:10, padding:'12px', marginBottom:8, borderLeft:`3px solid ${c?.color||'var(--muted)'}` }}>
                    <div style={{ display:'flex', gap:8 }}>
                      {(s.photo || s.photo_url) && <img src={s.photo || s.photo_url} alt="" style={{ width:44, height:44, borderRadius:7, objectFit:'cover', flexShrink:0 }}/>}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:c?.color, marginBottom:2 }}>{c?.label} · por {s.author_username}</div>
                        <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.4 }}>{s.text}</div>
                        {s.date_info && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>📅 {s.date_info}</div>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:10 }}>
                      <button onClick={() => doSetStatus(s.id,'approved')} style={{ flex:1, padding:'8px', borderRadius:8, border:'1px solid #a5d6a7', background:'#e8f5ee', color:'#2e7d52', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif' }}>✓ Aprovar</button>
                      <button onClick={() => doSetStatus(s.id,'rejected')} style={{ flex:1, padding:'8px', borderRadius:8, border:'1px solid #f5c6c6', background:'#fdecea', color:'#c62828', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif' }}>✗ Rejeitar</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
