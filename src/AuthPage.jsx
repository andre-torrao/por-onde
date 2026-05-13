import { useState, useRef } from 'react'
import { useAuth } from './auth'
import { Eye, EyeOff, Camera } from 'lucide-react'

const COUNTRIES = [
  'Portugal','Brasil','Angola','Moçambique','Cabo Verde','Guiné-Bissau','Timor-Leste',
  'Alemanha','Espanha','França','Reino Unido','Itália','Países Baixos','Bélgica',
  'Suíça','Suécia','Noruega','Dinamarca','Finlândia','Estados Unidos','Canadá',
  'Austrália','Nova Zelândia','Japão','China','Índia','México','Argentina','Chile','Outro',
]

function Field({ label, type = 'text', value, onChange, placeholder, autoFocus, autoComplete }) {
  const [focus, setFocus] = useState(false)
  const [show,  setShow]  = useState(false)
  const isPass = type === 'password'
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:5 }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input type={isPass && show ? 'text' : type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoFocus={autoFocus} autoComplete={autoComplete}
          style={{
            width:'100%', padding: isPass ? '10px 38px 10px 13px' : '10px 13px',
            borderRadius:9, border:`1.5px solid ${focus ? 'var(--accent)' : '#d0cec9'}`,
            background:'#f8f7f5', fontSize:14, color:'var(--text)',
            fontFamily:'Open Sans,sans-serif', outline:'none', transition:'border-color .2s',
          }}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(v=>!v)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', display:'flex' }}>
            {show ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  const { login, register } = useAuth()
  const [tab,     setTab]    = useState('login')
  const [name,    setName]   = useState('')
  const [pw,      setPw]     = useState('')
  const [country, setCountry]= useState('Portugal')
  const [photo,   setPhoto]  = useState(null)
  const [err,     setErr]    = useState('')
  const [busy,    setBusy]   = useState(false)
  const fileRef = useRef(null)

  function handlePhoto(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    await new Promise(r => setTimeout(r, 220))
    const res = tab === 'login' ? login(name, pw) : register(name, pw, photo, country)
    setBusy(false)
    if (res?.err) setErr(res.err)
    if (res?.pending) setErr('✓ Conta criada com sucesso! Aguarda validação — assim que estiver ativa poderás começar a viajar.')
  }

  return (
    <div style={{
      height:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#eeeeee', padding:20, position:'relative', overflow:'hidden',
    }}>
      {/* Subtle grid */}
      <div style={{ position:'absolute', inset:0, opacity:.06, pointerEvents:'none',
        backgroundImage:'linear-gradient(#999 1px,transparent 1px),linear-gradient(90deg,#999 1px,transparent 1px)',
        backgroundSize:'28px 28px' }}/>

      <div style={{ width:'100%', maxWidth:380, position:'relative', animation:'popIn .35s ease' }}>

        {/* Brand — tighter spacing */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <img src="/logo.png" alt="Vou PorOnde" style={{ width:240, height:'auto', marginBottom:2 }}/>
          {tab === 'login' && (
            <p style={{
              color:'#666', fontSize:13, fontStyle:'italic',
              lineHeight:1.45, margin:'0 auto', maxWidth:260,
              animation:'fadeUp .4s ease',
            }}>
              "Não sei para onde vou,<br/>só sei que vou por aí"
            </p>
          )}
        </div>

        {/* Card */}
        <div style={{ background:'#fff', borderRadius:18, padding:'24px 26px 20px', border:'1px solid #ddd', boxShadow:'0 4px 32px rgba(0,0,0,.07)' }}>

          {/* Tabs */}
          <div style={{ display:'flex', background:'#f2f0ed', borderRadius:11, padding:3, marginBottom:22, gap:3 }}>
            {[['login','Entrar'],['register','Criar conta']].map(([k,label]) => (
              <button key={k} onClick={() => { setTab(k); setErr('') }} style={{
                flex:1, padding:'8px 0', borderRadius:9, border:'none',
                background: tab===k ? '#fff' : 'transparent',
                color: tab===k ? 'var(--text)' : 'var(--muted)',
                fontSize:13, fontWeight: tab===k ? 600 : 400,
                fontFamily:'Open Sans,sans-serif', cursor:'pointer',
                boxShadow: tab===k ? '0 1px 4px rgba(0,0,0,.09)' : 'none',
                transition:'all .2s',
              }}>{label}</button>
            ))}
          </div>

          <form onSubmit={submit}>
            {/* Photo upload — register only */}
            {tab === 'register' && (
              <div style={{ marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
                <div onClick={() => fileRef.current?.click()} style={{
                  width:56, height:56, borderRadius:13, flexShrink:0,
                  background: photo ? 'transparent' : '#f2f0ed',
                  border:`2px dashed ${photo ? 'var(--accent)' : '#ccc'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', overflow:'hidden',
                }}>
                  {photo ? <img src={photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <Camera size={20} color="#aaa"/>}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{photo ? 'Foto adicionada ✓' : 'Foto de perfil'}</div>
                  <button type="button" onClick={() => fileRef.current?.click()} style={{ background:'none', border:'1px solid #ddd', borderRadius:6, padding:'3px 9px', fontSize:12, color:'var(--muted)', cursor:'pointer', fontFamily:'Open Sans,sans-serif' }}>
                    {photo ? 'Alterar' : 'Escolher foto'}
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:'none' }}/>
              </div>
            )}

            <Field label="Nome de utilizador" value={name} onChange={setName}
              placeholder={tab==='login' ? 'O teu nome' : 'ex: joao ou email'} autoFocus autoComplete="username"/>

            <Field label="Palavra-passe" type="password" value={pw} onChange={setPw}
              placeholder="••••••••" autoComplete={tab==='login'?'current-password':'new-password'}/>

            {tab === 'register' && (
              <div style={{ marginBottom:13 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:5 }}>País de residência</label>
                <select value={country} onChange={e => setCountry(e.target.value)} style={{
                  width:'100%', padding:'10px 13px', borderRadius:9, border:'1.5px solid #d0cec9',
                  background:'#f8f7f5', fontSize:14, color:'var(--text)', fontFamily:'Open Sans,sans-serif', outline:'none', cursor:'pointer',
                }}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {err && (
              <div style={{
                background: err.startsWith('✓') ? '#e8f5ee' : '#fdecea',
                border: `1px solid ${err.startsWith('✓') ? '#a5d6a7' : '#f5c6c6'}`,
                borderRadius:8, padding:'9px 12px', fontSize:13,
                color: err.startsWith('✓') ? '#2e7d52' : '#c62828', marginBottom:13, lineHeight:1.5,
              }}>
                {err}
              </div>
            )}

            <button type="submit" disabled={busy} style={{
              width:'100%', padding:'12px', borderRadius:11, border:'none',
              background: busy ? '#ccc' : 'var(--accent)',
              color:'#fff', fontSize:14, fontFamily:'Open Sans,sans-serif', fontWeight:700,
              cursor: busy ? 'default' : 'pointer',
              boxShadow: busy ? 'none' : '0 4px 16px rgba(212,80,10,.28)',
              transition:'all .2s',
            }}>
              {busy ? '…' : tab==='login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'#999', marginTop:14 }}>
          Admin: <strong>admin</strong> / <strong>admin1234</strong>
        </p>
      </div>
    </div>
  )
}
