import { useState, useRef, useEffect } from 'react'
import { X, Camera, Plus, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from './auth'
import { getGallery, saveGallery, compressImage } from './storage'

function Lightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx)
  const p = photos[idx]
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}>
      <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, width:36, height:36, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <X size={16}/>
      </button>
      {idx > 0 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i-1) }} style={{ position:'absolute', left:16, background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, width:40, height:40, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ChevronLeft size={20}/>
        </button>
      )}
      {idx < photos.length-1 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i+1) }} style={{ position:'absolute', right:16, background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, width:40, height:40, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ChevronRight size={20}/>
        </button>
      )}
      <img src={p.data} alt={p.caption||''} onClick={e => e.stopPropagation()}
        style={{ maxWidth:'90vw', maxHeight:'80vh', objectFit:'contain', borderRadius:8 }}/>
      <div style={{ marginTop:12, textAlign:'center' }}>
        {p.caption && <div style={{ color:'#fff', fontSize:14, marginBottom:4 }}>{p.caption}</div>}
        <div style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>
          por {p.author} · {new Date(p.createdAt).toLocaleDateString('pt-PT')}
        </div>
      </div>
      <div style={{ marginTop:8, color:'rgba(255,255,255,.4)', fontSize:11 }}>{idx+1} / {photos.length}</div>
    </div>
  )
}

export default function Gallery({ locationId, locationName, onClose }) {
  const { user } = useAuth()
  const [photos,   setPhotos]   = useState([])
  const [adding,   setAdding]   = useState(false)
  const [caption,  setCaption]  = useState('')
  const [preview,  setPreview]  = useState(null)
  const [busy,     setBusy]     = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [confirm,  setConfirm]  = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { setPhotos(getGallery(locationId)) }, [locationId])

  function persist(list) { saveGallery(locationId, list); setPhotos(list) }

  async function handleFile(e) {
    const file = e.target.files[0]; if (!file) return
    setBusy(true)
    try {
      const data = await compressImage(file, 800)
      setPreview(data)
    } catch(err) { console.error(err) }
    setBusy(false)
  }

  function submit() {
    if (!preview) return
    const p = {
      id: Date.now().toString(),
      data: preview, caption: caption.trim(),
      author: user?.id || 'anónimo',
      createdAt: Date.now(),
      approved: user?.isAdmin ? true : false,
    }
    persist([...photos, p])
    setPreview(null); setCaption(''); setAdding(false)
  }

  function deletePhoto(id) { persist(photos.filter(p => p.id !== id)); setConfirm(null) }
  function approvePhoto(id) { persist(photos.map(p => p.id === id ? {...p, approved:true} : p)) }

  const approved = photos.filter(p => p.approved)
  const pending  = photos.filter(p => !p.approved)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(28,26,22,.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {lightbox !== null && (
        <Lightbox photos={approved} startIdx={lightbox} onClose={() => setLightbox(null)}/>
      )}

      <div style={{ background:'var(--surface)', borderRadius:20, width:'100%', maxWidth:520, border:'1px solid var(--border)', boxShadow:'0 20px 60px rgba(0,0,0,.15)', overflow:'hidden', animation:'popIn .25s ease', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)', flexShrink:0, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.2px', color:'var(--muted)', marginBottom:3 }}>Galeria de fotografias</div>
            <div style={{ fontWeight:800, fontSize:18, color:'var(--text)' }}>{locationName}</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{approved.length} foto{approved.length!==1?'s':''} aprovada{approved.length!==1?'s':''}</div>
          </div>
          <button onClick={() => setAdding(v => !v)} style={{
            display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:10,
            border:'none', background:'var(--accent)', color:'#fff',
            fontSize:12, fontWeight:600, fontFamily:'Open Sans,sans-serif', cursor:'pointer',
          }}><Plus size={13}/> Adicionar</button>
          <button onClick={onClose} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, width:30, height:30, cursor:'pointer', color:'var(--muted)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <X size={14}/>
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px 20px' }}>

          {/* Add photo form */}
          {adding && (
            <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px', marginBottom:16 }}>
              <div style={{ display:'flex', gap:12, marginBottom:12 }}>
                {/* Preview */}
                <div onClick={() => fileRef.current?.click()} style={{
                  width:90, height:90, borderRadius:10, flexShrink:0,
                  background: preview ? 'transparent' : 'var(--surface)',
                  border:`2px dashed ${preview ? 'var(--accent)' : 'var(--border2)'}`,
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', overflow:'hidden', gap:4,
                }}>
                  {busy ? <div style={{ width:20, height:20, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> :
                    preview ? <img src={preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> :
                    <>
                      <Camera size={22} color="var(--muted)"/>
                      <span style={{ fontSize:10, color:'var(--muted)' }}>Escolher</span>
                    </>
                  }
                </div>
                <div style={{ flex:1 }}>
                  <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Legenda (opcional)…" maxLength={120}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:13, color:'var(--text)', fontFamily:'Open Sans,sans-serif', outline:'none', marginBottom:8 }}
                    onFocus={e => e.target.style.borderColor='var(--accent)'}
                    onBlur={e => e.target.style.borderColor='var(--border)'}
                  />
                  <div style={{ fontSize:11, color:'var(--muted)' }}>
                    {user?.isAdmin ? '✓ A tua foto será publicada imediatamente.' : 'A tua foto aguarda aprovação do admin.'}
                  </div>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }}/>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button onClick={() => { setAdding(false); setPreview(null); setCaption('') }} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--muted)', fontSize:12, cursor:'pointer', fontFamily:'Open Sans,sans-serif' }}>Cancelar</button>
                <button onClick={submit} disabled={!preview} style={{ padding:'6px 14px', borderRadius:7, border:'none', background: preview ? 'var(--accent)' : 'var(--border2)', color:'#fff', fontSize:12, fontWeight:600, cursor: preview ? 'pointer' : 'default', fontFamily:'Open Sans,sans-serif', display:'flex', alignItems:'center', gap:5 }}>
                  <Check size={12}/> Publicar foto
                </button>
              </div>
            </div>
          )}

          {/* Approved grid */}
          {approved.length > 0 && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:16 }}>
                {approved.map((p, i) => (
                  <div key={p.id} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', cursor:'pointer', border:'1px solid var(--border)' }}
                    onClick={() => setLightbox(i)}>
                    <img src={p.data} alt={p.caption||''} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 60%,rgba(0,0,0,.5))' }}/>
                    {(p.author === user?.id || user?.isAdmin) && (
                      <button onClick={e => { e.stopPropagation(); confirm === p.id ? deletePhoto(p.id) : setConfirm(p.id) }} style={{ position:'absolute', top:5, right:5, background: confirm===p.id ? '#c62828' : 'rgba(0,0,0,.45)', border:'none', borderRadius:6, width:22, height:22, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Trash2 size={10}/>
                      </button>
                    )}
                    {p.caption && (
                      <div style={{ position:'absolute', bottom:4, left:4, right:4, fontSize:10, color:'rgba(255,255,255,.85)', lineHeight:1.3 }}>{p.caption}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {approved.length === 0 && !adding && (
            <div style={{ textAlign:'center', padding:'32px 20px', color:'var(--muted)' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📷</div>
              <div style={{ fontSize:14, marginBottom:4 }}>Ainda não há fotografias</div>
              <div style={{ fontSize:12 }}>Sê o primeiro a partilhar uma foto!</div>
            </div>
          )}

          {/* Pending approval (admin only) */}
          {user?.isAdmin && pending.length > 0 && (
            <div style={{ marginTop:4 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--accent)', marginBottom:8 }}>
                ⏳ Aguardam aprovação ({pending.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {pending.map(p => (
                  <div key={p.id} style={{ display:'flex', gap:10, background:'#fff8e1', border:'1px solid #ffe082', borderRadius:10, padding:'10px 12px' }}>
                    <img src={p.data} alt="" style={{ width:56, height:56, borderRadius:7, objectFit:'cover', flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      {p.caption && <div style={{ fontSize:13, color:'var(--text)', marginBottom:4 }}>{p.caption}</div>}
                      <div style={{ fontSize:11, color:'var(--muted)' }}>por {p.author} · {new Date(p.createdAt).toLocaleDateString('pt-PT')}</div>
                      <div style={{ display:'flex', gap:6, marginTop:6 }}>
                        <button onClick={() => approvePhoto(p.id)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #a5d6a7', background:'#e8f5ee', color:'#2e7d52', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif' }}>✓ Aprovar</button>
                        <button onClick={() => deletePhoto(p.id)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #f5c6c6', background:'#fdecea', color:'#c62828', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Open Sans,sans-serif' }}>✗ Rejeitar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
