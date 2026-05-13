import { useState, useEffect, useCallback } from 'react'
import { X, Plus, MapPin, Utensils, Hotel, Star, Trash2, ChevronDown, ChevronUp, ThumbsUp } from 'lucide-react'
import { useAuth } from './auth'

// Tips stored in localStorage keyed by municipality name
const TIPS_KEY = 'pt_tracker_tips_v1'

const CATEGORIES = [
  { key: 'visit',  label: 'O que visitar', icon: <MapPin size={13}/>,   color: '#2e7d52', bg: '#e8f5ee' },
  { key: 'eat',    label: 'Onde comer',    icon: <Utensils size={13}/>, color: '#1565c0', bg: '#e3f0fd' },
  { key: 'stay',   label: 'Alojamento',    icon: <Hotel size={13}/>,    color: '#6a1b9a', bg: '#f3e5f5' },
  { key: 'tip',    label: 'Dica geral',    icon: <Star size={13}/>,     color: '#e65100', bg: '#fff3e0' },
]

function readTips() {
  try { return JSON.parse(localStorage.getItem(TIPS_KEY) || '{}') } catch { return {} }
}
function writeTips(data) { localStorage.setItem(TIPS_KEY, JSON.stringify(data)) }

function TipCard({ tip, onDelete, onLike, userId }) {
  const cat = CATEGORIES.find(c => c.key === tip.category) || CATEGORIES[3]
  const isOwn = tip.author === userId
  const hasLiked = tip.likes?.includes(userId)

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 12px', marginBottom: 8,
      borderLeft: `3px solid ${cat.color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: 7,
          background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: cat.color, marginTop: 1,
        }}>{cat.icon}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {cat.label}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, wordBreak: 'break-word' }}>
            {tip.text}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
              por {tip.author} · {new Date(tip.createdAt).toLocaleDateString('pt-PT')}
            </span>
            <button onClick={() => onLike(tip.id)} style={{
              display: 'flex', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: hasLiked ? 'var(--accent)' : 'var(--muted)',
              fontSize: 11, padding: '2px 4px', borderRadius: 5,
              transition: 'color .15s',
            }}>
              <ThumbsUp size={11} /> {tip.likes?.length || 0}
            </button>
            {isOwn && (
              <button onClick={() => onDelete(tip.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', display: 'flex', padding: '2px 4px', marginLeft: 'auto',
                borderRadius: 5, transition: 'color .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = '#c62828'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              ><Trash2 size={11} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AddTipForm({ onAdd, onCancel }) {
  const [category, setCategory] = useState('visit')
  const [text, setText]         = useState('')

  function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(category, text.trim())
    setText('')
  }

  return (
    <form onSubmit={submit} style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 14px', marginBottom: 12,
    }}>
      {/* Category selector */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button key={cat.key} type="button" onClick={() => setCategory(cat.key)} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20, border: '1.5px solid',
            borderColor: category === cat.key ? cat.color : 'var(--border)',
            background: category === cat.key ? cat.bg : 'transparent',
            color: category === cat.key ? cat.color : 'var(--muted)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Open Sans, sans-serif', transition: 'all .15s',
          }}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      <textarea
        value={text} onChange={e => setText(e.target.value)}
        placeholder="Descreve a tua dica…"
        maxLength={300}
        rows={3}
        style={{
          width: '100%', borderRadius: 8, border: '1.5px solid var(--border)',
          background: 'var(--surface)', padding: '8px 10px', fontSize: 13,
          color: 'var(--text)', fontFamily: 'Open Sans, sans-serif', resize: 'none',
          outline: 'none', transition: 'border-color .2s', lineHeight: 1.5,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{text.length}/300</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={onCancel} style={{
            padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--muted)', fontSize: 12,
            fontFamily: 'Open Sans, sans-serif', cursor: 'pointer',
          }}>Cancelar</button>
          <button type="submit" disabled={!text.trim()} style={{
            padding: '6px 14px', borderRadius: 7, border: 'none',
            background: text.trim() ? 'var(--accent)' : 'var(--border2)',
            color: '#fff', fontSize: 12, fontWeight: 600,
            fontFamily: 'Open Sans, sans-serif', cursor: text.trim() ? 'pointer' : 'default',
            transition: 'background .15s',
          }}>Adicionar</button>
        </div>
      </div>
    </form>
  )
}

export default function TipsPanel({ municipalityName, onClose }) {
  const { user } = useAuth()
  const [tips,    setTips]    = useState([])
  const [adding,  setAdding]  = useState(false)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => {
    const all = readTips()
    setTips(all[municipalityName] || [])
  }, [municipalityName])

  function persist(newTips) {
    const all = readTips()
    all[municipalityName] = newTips
    writeTips(all)
    setTips(newTips)
  }

  function addTip(category, text) {
    const tip = {
      id:        Date.now().toString(),
      category,
      text,
      author:    user?.id || 'anónimo',
      createdAt: Date.now(),
      likes:     [],
    }
    persist([tip, ...tips])
    setAdding(false)
  }

  function deleteTip(id) {
    persist(tips.filter(t => t.id !== id))
  }

  function likeTip(id) {
    persist(tips.map(t => {
      if (t.id !== id) return t
      const likes = t.likes || []
      const uid = user?.id || 'anon'
      return {
        ...t,
        likes: likes.includes(uid) ? likes.filter(l => l !== uid) : [...likes, uid],
      }
    }))
  }

  const filtered = filter === 'all' ? tips : tips.filter(t => t.category === filter)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(28,26,22,.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{
        background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 460,
        border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,.15)',
        overflow: 'hidden', animation: 'popIn .25s ease',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 20px 14px', borderBottom: '1px solid var(--border)',
          flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--muted)', marginBottom: 3 }}>
              Dicas da comunidade
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', lineHeight: 1.1 }}>
              {municipalityName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              {tips.length} dica{tips.length !== 1 ? 's' : ''} partilhada{tips.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
            width: 30, height: 30, cursor: 'pointer', color: 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><X size={14} /></button>
        </div>

        {/* Category filter */}
        <div style={{ padding: '10px 20px 0', flexShrink: 0, display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button onClick={() => setFilter('all')} style={{
            padding: '4px 12px', borderRadius: 20, border: '1.5px solid',
            borderColor: filter === 'all' ? 'var(--accent)' : 'var(--border)',
            background: filter === 'all' ? 'var(--accent-bg)' : 'transparent',
            color: filter === 'all' ? 'var(--accent)' : 'var(--muted)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Open Sans, sans-serif', whiteSpace: 'nowrap', transition: 'all .15s',
          }}>Todas</button>
          {CATEGORIES.map(cat => {
            const count = tips.filter(t => t.category === cat.key).length
            return (
              <button key={cat.key} onClick={() => setFilter(cat.key)} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 20, border: '1.5px solid',
                borderColor: filter === cat.key ? cat.color : 'var(--border)',
                background: filter === cat.key ? cat.bg : 'transparent',
                color: filter === cat.key ? cat.color : 'var(--muted)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Open Sans, sans-serif', whiteSpace: 'nowrap', transition: 'all .15s',
              }}>
                {cat.icon} {cat.label} {count > 0 && <span style={{ opacity: .7 }}>({count})</span>}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>

          {/* Add tip button / form */}
          {!adding ? (
            <button onClick={() => setAdding(true)} style={{
              width: '100%', padding: '10px', borderRadius: 10,
              border: '1.5px dashed var(--border2)', background: 'transparent',
              color: 'var(--muted)', fontSize: 13, fontFamily: 'Open Sans, sans-serif',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, marginBottom: 12, transition: 'all .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)' }}
            >
              <Plus size={14} /> Adicionar dica
            </button>
          ) : (
            <AddTipForm onAdd={addTip} onCancel={() => setAdding(false)} />
          )}

          {/* Tips list */}
          {filtered.length === 0 && !adding && (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>
                {filter === 'all' ? '🗺' : CATEGORIES.find(c=>c.key===filter)?.icon}
              </div>
              <div style={{ fontSize: 13 }}>
                {filter === 'all'
                  ? 'Ainda não há dicas para este concelho. Sê o primeiro!'
                  : `Sem dicas de "${CATEGORIES.find(c=>c.key===filter)?.label}" ainda.`
                }
              </div>
            </div>
          )}

          {filtered
            .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0) || b.createdAt - a.createdAt)
            .map(tip => (
              <TipCard
                key={tip.id}
                tip={tip}
                onDelete={deleteTip}
                onLike={likeTip}
                userId={user?.id}
              />
            ))
          }
        </div>
      </div>
    </div>
  )
}
