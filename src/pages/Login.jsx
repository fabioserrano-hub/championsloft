import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner } from '../components/ui'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email:'', password:'', nome:'' })
  const [termosAceites, setTermosAceites] = useState(false)
  const [showTermos, setShowTermos] = useState(false)
  const [showPrivacidade, setShowPrivacidade] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode==='login') {
        await signIn(form.email, form.password)
      } else {
        if (!form.nome.trim()) { toast('Nome obrigatório','warn'); setLoading(false); return }
        if (!termosAceites) { toast('Deve aceitar os Termos e Política de Privacidade','warn'); setLoading(false); return }
        await signUp(form.email, form.password, { nome: form.nome })
        try {
          await signIn(form.email, form.password)
        } catch {
          toast('Conta criada! Verifique o seu email para activar.','ok')
          setMode('login')
        }
      }
    } catch (err) {
      const m = err.message?.includes('Invalid login') ? 'Email ou password incorrectos'
        : err.message?.includes('already registered') ? 'Email já registado'
        : err.message?.includes('Email not confirmed') ? 'Email não confirmado — verifique a caixa de entrada'
        : err.message || 'Erro desconhecido'
      toast(m,'err')
    } finally { setLoading(false) }
  }

  // Modal legal
  const ModalLegal = ({ open, onClose, title, children }) => !open ? null : (
    <div style={{ position:'fixed', inset:0, background:'rgba(2,5,9,.9)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#060F1A', border:'1px solid #1B2D52', borderRadius:16, width:'100%', maxWidth:480, maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #1B2D52', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:700, color:'#fff' }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        <div style={{ padding:20, overflowY:'auto', fontSize:13, color:'#94a3b8', lineHeight:1.7 }}>{children}</div>
        <div style={{ padding:'12px 20px', borderTop:'1px solid #1B2D52' }}>
          <button onClick={()=>{ setTermosAceites(true); onClose() }}
            style={{ width:'100%', padding:'12px', borderRadius:8, background:'linear-gradient(135deg,#C8A84B,#7A6020)', border:'none', color:'#020509', fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:14 }}>
            ✓ Aceitar e Fechar
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#020509', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'Inter',system-ui,sans-serif", position:'relative', overflow:'hidden' }}>

      {/* Fundo */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {/* Grelha subtil */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:.4 }}>
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#445566" strokeWidth=".3"/>
            </pattern>
            <radialGradient id="fade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#020509" stopOpacity="0"/>
              <stop offset="100%" stopColor="#020509" stopOpacity="1"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
          <rect width="100%" height="100%" fill="url(#fade)"/>
        </svg>
        {/* Glow dourado */}
        <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:600, height:400, background:'radial-gradient(ellipse, rgba(200,168,75,.06) 0%, transparent 70%)', borderRadius:'50%' }}/>
        {/* Glow teal */}
        <div style={{ position:'absolute', bottom:'10%', right:'10%', width:300, height:300, background:'radial-gradient(circle, rgba(45,212,167,.04) 0%, transparent 70%)', borderRadius:'50%' }}/>
      </div>

      {/* Logo + tagline */}
      <div style={{ textAlign:'center', marginBottom:32, position:'relative' }}>
        <div style={{ width:64, height:64, borderRadius:16, margin:'0 auto 16px', overflow:'hidden', boxShadow:'0 0 32px rgba(200,168,75,.15)' }}>
        <img src="/logo.png" alt="ChampionsLoft" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{ e.target.style.display='none'; e.target.parentNode.innerHTML='🕊️'; e.target.parentNode.style.cssText+='display:flex;alignItems:center;justifyContent:center;fontSize:30;background:linear-gradient(140deg,#0A1A2E,#112036);border:1px solid rgba(200,168,75,.3)' }}/>
      </div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:28, fontWeight:900, color:'#F0EDE8', letterSpacing:'-.02em', marginBottom:6, background:'linear-gradient(120deg,#F0EDE8 40%,#C8A84B)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>ChampionsLoft</div>
        <div style={{ fontSize:12, color:'#445566', letterSpacing:'.12em', textTransform:'uppercase', fontFamily:"'Space Mono',monospace" }}>Gestão Columbófila Premium</div>
      </div>

      {/* Card */}
      <div style={{ width:'100%', maxWidth:400, background:'linear-gradient(160deg,#060F1A,#0A1628)', border:'1px solid #1B2D52', borderRadius:20, overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,.6)', position:'relative' }}>
        {/* Linha dourada no topo */}
        <div style={{ height:2, background:'linear-gradient(90deg,transparent,#C8A84B,transparent)' }}/>

        <div style={{ padding:'28px 28px 32px' }}>

          {/* Toggle login/registo */}
          <div style={{ display:'flex', background:'#050D1A', borderRadius:12, padding:4, marginBottom:28, border:'1px solid #162040' }}>
            {[['login','Entrar'],['register','Criar conta']].map(([m,l])=>(
              <button key={m} onClick={()=>setMode(m)} style={{ flex:1, padding:'10px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:mode===m?'linear-gradient(135deg,#C8A84B,#7A6020)':'transparent', color:mode===m?'#020509':'#445566', transition:'all .2s' }}>{l}</button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Nome (só registo) */}
            {mode==='register'&&(
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'#8899AA', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:6 }}>Nome</label>
                <input value={form.nome} onChange={e=>sf('nome',e.target.value)} placeholder="O seu nome completo" required
                  style={{ width:'100%', padding:'12px 14px', background:'#0A1628', border:'1px solid #1B2D52', borderRadius:10, color:'#F0EDE8', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .2s' }}
                  onFocus={e=>e.target.style.borderColor='rgba(200,168,75,.5)'}
                  onBlur={e=>e.target.style.borderColor='#1B2D52'}/>
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#8899AA', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:6 }}>Email</label>
              <input type="email" value={form.email} onChange={e=>sf('email',e.target.value)} placeholder="email@exemplo.pt" required autoComplete="email"
                style={{ width:'100%', padding:'12px 14px', background:'#0A1628', border:'1px solid #1B2D52', borderRadius:10, color:'#F0EDE8', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .2s' }}
                onFocus={e=>e.target.style.borderColor='rgba(200,168,75,.5)'}
                onBlur={e=>e.target.style.borderColor='#1B2D52'}/>
            </div>

            {/* Password */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <label style={{ fontSize:11, fontWeight:600, color:'#8899AA', letterSpacing:'.06em', textTransform:'uppercase' }}>Password</label>
                {mode==='login'&&<button type="button" style={{ background:'none', border:'none', color:'#C8A84B', fontSize:11, cursor:'pointer', fontFamily:'inherit', padding:0 }}>Esqueci a password</button>}
              </div>
              <div style={{ position:'relative' }}>
                <input type={showPass?'text':'password'} value={form.password} onChange={e=>sf('password',e.target.value)} placeholder="••••••••" required minLength={6} autoComplete={mode==='login'?'current-password':'new-password'}
                  style={{ width:'100%', padding:'12px 42px 12px 14px', background:'#0A1628', border:'1px solid #1B2D52', borderRadius:10, color:'#F0EDE8', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .2s' }}
                  onFocus={e=>e.target.style.borderColor='rgba(200,168,75,.5)'}
                  onBlur={e=>e.target.style.borderColor='#1B2D52'}/>
                <button type="button" onClick={()=>setShowPass(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#445566', cursor:'pointer', fontSize:16, padding:0, lineHeight:1 }}>
                  {showPass?'🙈':'👁️'}
                </button>
              </div>
            </div>

            {/* Termos (só registo) */}
            {mode==='register'&&(
              <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', background:'rgba(200,168,75,.04)', border:'1px solid rgba(200,168,75,.12)', borderRadius:10 }}>
                <div onClick={()=>setTermosAceites(v=>!v)} style={{ width:18, height:18, borderRadius:5, border:`2px solid ${termosAceites?'#C8A84B':'#334155'}`, background:termosAceites?'#C8A84B':'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, marginTop:1 }}>
                  {termosAceites&&<span style={{ fontSize:10, color:'#020509', fontWeight:900 }}>✓</span>}
                </div>
                <label style={{ fontSize:12, color:'#8899AA', lineHeight:1.5, cursor:'pointer' }} onClick={()=>setTermosAceites(v=>!v)}>
                  Aceito os{' '}
                  <button type="button" onClick={e=>{e.stopPropagation();setShowTermos(true)}} style={{ background:'none', border:'none', color:'#C8A84B', cursor:'pointer', fontSize:12, textDecoration:'underline', padding:0, fontFamily:'inherit' }}>Termos de Utilização</button>
                  {' '}e a{' '}
                  <button type="button" onClick={e=>{e.stopPropagation();setShowPrivacidade(true)}} style={{ background:'none', border:'none', color:'#C8A84B', cursor:'pointer', fontSize:12, textDecoration:'underline', padding:0, fontFamily:'inherit' }}>Política de Privacidade</button>
                </label>
              </div>
            )}

            {/* Botão submit */}
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'14px', borderRadius:10, background:loading?'#1B2D52':'linear-gradient(135deg,#C8A84B,#7A6020)', border:'none', color:'#020509', fontSize:14, fontWeight:800, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:4, transition:'opacity .2s', opacity:loading?.7:1, letterSpacing:'.01em' }}>
              {loading&&<Spinner/>}
              {mode==='login'?'Entrar na minha conta':'Criar conta gratuita'}
            </button>
          </form>

          {/* Divider + link inverso */}
          <div style={{ marginTop:24, textAlign:'center' }}>
            <div style={{ fontSize:12, color:'#334155' }}>
              {mode==='login'?'Ainda não tens conta?':'Já tens conta?'}{' '}
              <button onClick={()=>setMode(mode==='login'?'register':'login')} style={{ background:'none', border:'none', color:'#C8A84B', cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:600, padding:0 }}>
                {mode==='login'?'Criar gratuitamente →':'Entrar →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ marginTop:32, textAlign:'center', position:'relative' }}>
        <div style={{ fontSize:11, color:'#445566', fontFamily:"'Space Mono',monospace", marginBottom:8 }}>🔒 Ligação segura · Dados encriptados · RGPD</div>
        <div style={{ display:'flex', gap:16, justifyContent:'center' }}>
          {['Termos','Privacidade','Suporte'].map(l=>(
            <button key={l} onClick={()=>l==='Termos'?setShowTermos(true):l==='Privacidade'?setShowPrivacidade(true):null}
              style={{ background:'none', border:'none', color:'#334155', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Modais legais */}
      <ModalLegal open={showTermos} onClose={()=>setShowTermos(false)} title="📋 Termos de Utilização">
        <p><strong style={{ color:'#fff' }}>1. Aceitação dos Termos</strong></p>
        <p>Ao utilizar o ChampionsLoft, o utilizador aceita os presentes Termos de Utilização na sua totalidade.</p>
        <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>2. Descrição do Serviço</strong></p>
        <p>O ChampionsLoft é uma plataforma de gestão columbófila que permite registar e gerir pombos, provas, saúde, reprodução e financeiro.</p>
        <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>3. Conta de Utilizador</strong></p>
        <p>O utilizador é responsável pela confidencialidade das suas credenciais e por todas as actividades realizadas na sua conta.</p>
        <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>4. Dados e Privacidade</strong></p>
        <p>Os dados introduzidos são armazenados de forma segura. O ChampionsLoft não partilha dados pessoais com terceiros sem consentimento expresso.</p>
        <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>5. Propriedade Intelectual</strong></p>
        <p>Todo o software, design e conteúdo do ChampionsLoft são propriedade dos seus criadores e estão protegidos por direitos de autor.</p>
        <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>6. Limitação de Responsabilidade</strong></p>
        <p>O ChampionsLoft não se responsabiliza por perdas de dados resultantes de uso indevido ou falhas técnicas fora do controlo da plataforma.</p>
        <p style={{ marginTop:12, color:'#475569', fontSize:11 }}>Última actualização: Junho 2026</p>
      </ModalLegal>

      <ModalLegal open={showPrivacidade} onClose={()=>setShowPrivacidade(false)} title="🔒 Política de Privacidade">
        <p><strong style={{ color:'#fff' }}>1. Dados Recolhidos</strong></p>
        <p>Recolhemos apenas os dados necessários: nome, email, dados dos pombos e actividade columbófila introduzida pelo utilizador.</p>
        <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>2. Utilização dos Dados</strong></p>
        <p>Os dados são utilizados exclusivamente para fornecer as funcionalidades da plataforma e melhorar a experiência do utilizador.</p>
        <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>3. Armazenamento Seguro</strong></p>
        <p>Todos os dados são armazenados em servidores europeus com encriptação, utilizando o Supabase em conformidade com o RGPD.</p>
        <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>4. Partilha de Dados</strong></p>
        <p>Não vendemos nem partilhamos os seus dados pessoais com terceiros para fins comerciais.</p>
        <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>5. Direitos do Utilizador</strong></p>
        <p>Tem o direito de aceder, corrigir ou eliminar os seus dados a qualquer momento através das definições da conta.</p>
        <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>6. Cookies</strong></p>
        <p>Utilizamos apenas cookies essenciais para manter a sessão activa. Sem cookies de rastreamento ou publicidade.</p>
        <p style={{ marginTop:12, color:'#475569', fontSize:11 }}>Última actualização: Junho 2026 · Conforme RGPD</p>
      </ModalLegal>
    </div>
  )
}
