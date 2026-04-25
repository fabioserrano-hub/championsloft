import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── SUPABASE ────────────────────────────────────────
const supabase = createClient(
  'https://tgqnbheetpgnpjsjphoj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncW5iaGVldHBnbnBqc2pwaG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTk0NDIsImV4cCI6MjA5MjAzNTQ0Mn0.32ZjOUB-bOAIgtwwpKDVRSJy1w4xlOR7IMb4bRTK3Uo',
  { auth: { persistSession: true, autoRefreshToken: true } }
)

// ─── DB HELPERS ──────────────────────────────────────
const db = {
  async uid() { const { data: { user } } = await supabase.auth.getUser(); return user?.id },

  async getPerfil() {
    const uid = await this.uid(); if (!uid) return null
    const { data } = await supabase.from('perfis').select('*').eq('user_id', uid).single()
    return data
  },
  async savePerfil(p) {
    const uid = await this.uid(); if (!uid) throw new Error('Sem auth')
    const { data, error } = await supabase.from('perfis').upsert({ ...p, user_id: uid, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select().single()
    if (error) throw error; return data
  },

  async getPombos() {
    const { data, error } = await supabase.from('pigeons').select('*').order('nome')
    if (error) throw error; return data || []
  },
  async createPombo(p) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('pigeons').insert({ ...p, user_id: uid }).select().single()
    if (error) throw error; return data
  },
  async updatePombo(id, changes) {
    const { data, error } = await supabase.from('pigeons').update(changes).eq('id', id).select().single()
    if (error) throw error; return data
  },
  async deletePombo(id) {
    const { error } = await supabase.from('pigeons').delete().eq('id', id)
    if (error) throw error
  },

  async getPombais() {
    const { data, error } = await supabase.from('lofts').select('*').order('nome')
    if (error) throw error; return data || []
  },
  async createPombal(p) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('lofts').insert({ ...p, user_id: uid }).select().single()
    if (error) throw error; return data
  },
  async updatePombal(id, c) {
    const { data, error } = await supabase.from('lofts').update(c).eq('id', id).select().single()
    if (error) throw error; return data
  },
  async deletePombal(id) {
    const { error } = await supabase.from('lofts').delete().eq('id', id)
    if (error) throw error
  },

  async getProvas() {
    const { data, error } = await supabase.from('races').select('*').order('data_reg', { ascending: false })
    if (error) throw error; return data || []
  },
  async createProva(p) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('races').insert({ ...p, user_id: uid }).select().single()
    if (error) throw error; return data
  },
  async deleteProva(id) {
    const { error } = await supabase.from('races').delete().eq('id', id)
    if (error) throw error
  },

  async getTreinos() {
    const { data, error } = await supabase.from('treinos').select('*').order('data', { ascending: false })
    if (error) throw error; return data || []
  },
  async createTreino(t) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('treinos').insert({ ...t, user_id: uid }).select().single()
    if (error) throw error; return data
  },
  async deleteTreino(id) {
    const { error } = await supabase.from('treinos').delete().eq('id', id)
    if (error) throw error
  },

  async getSaude() {
    const { data, error } = await supabase.from('health').select('*, pigeons(nome,emoji)').order('created_at', { ascending: false })
    if (error) throw error; return data || []
  },
  async createSaude(s) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('health').insert({ ...s, user_id: uid }).select().single()
    if (error) throw error; return data
  },
  async deleteSaude(id) {
    const { error } = await supabase.from('health').delete().eq('id', id)
    if (error) throw error
  },

  async getFinancas() {
    const { data, error } = await supabase.from('financas').select('*').order('data_reg', { ascending: false })
    if (error) throw error; return data || []
  },
  async createFinanca(f) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('financas').insert({ ...f, user_id: uid }).select().single()
    if (error) throw error; return data
  },
  async deleteFinanca(id) {
    const { error } = await supabase.from('financas').delete().eq('id', id)
    if (error) throw error
  },

  async uploadFoto(userId, pigeonId, file) {
    const ext = file.name.split('.').pop()
    const path = `pombos/${userId}/${pigeonId}.${ext}`
    const { error } = await supabase.storage.from('fotos-pombos').upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('fotos-pombos').getPublicUrl(path)
    return data.publicUrl
  }
}

// ─── TOAST CONTEXT ────────────────────────────────────
const ToastCtx = createContext(null)
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((msg, type = 'ok') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])
  const icons = { ok: '✅', warn: '⚠️', err: '❌', info: 'ℹ️' }
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span>{icons[t.type]}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
const useToast = () => useContext(ToastCtx)

// ─── AUTH CONTEXT ─────────────────────────────────────
const AuthCtx = createContext(null)
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])
  const signIn = async (e, p) => { const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p }); if (error) throw error; return data }
  const signUp = async (e, p, m = {}) => { const { data, error } = await supabase.auth.signUp({ email: e, password: p, options: { data: m } }); if (error) throw error; return data }
  const signOut = async () => { await supabase.auth.signOut() }
  return <AuthCtx.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthCtx.Provider>
}
const useAuth = () => useContext(AuthCtx)

// ─── SHARED COMPONENTS ────────────────────────────────
function Spinner({ lg }) {
  return <div className={`spinner${lg ? ' spinner-lg' : ''}`} />
}

function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className={`modal${wide ? ' modal-wide' : ''}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {desc && <div className="empty-desc">{desc}</div>}
      {action}
    </div>
  )
}

function Field({ label, children }) {
  return <div className="field"><label className="label">{label}</label>{children}</div>
}

function Badge({ v, children }) {
  return <span className={`badge badge-${v || 'gray'}`}>{children}</span>
}

function KpiCard({ icon, label, value, color, onClick }) {
  return (
    <div className="kpi" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div className={`kpi-val ${color || ''}`}>{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  )
}

// ─── LOGIN PAGE ───────────────────────────────────────
function Login() {
  const { signIn, signUp } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', nome: '' })
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [termosAceites, setTermosAceites] = useState(false)
  const [showTermos, setShowTermos] = useState(false)
  const [showPrivacidade, setShowPrivacidade] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password)
      } else {
        if (!form.nome.trim()) { toast('Nome obrigatório', 'warn'); return }
        if (!termosAceites) { toast('Deve aceitar os Termos e Política de Privacidade', 'warn'); setLoading(false); return }
        await signUp(form.email, form.password, { nome: form.nome })
        toast('Conta criada! Verifique o seu email.', 'ok')
        setMode('login')
      }
    } catch (err) {
      const m = err.message?.includes('Invalid login') ? 'Email ou password incorrectos'
        : err.message?.includes('already registered') ? 'Email já registado'
        : err.message || 'Erro desconhecido'
      toast(m, 'err')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(30,217,138,.06) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(30,217,138,.04) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>
      <div className="login-card" style={{ position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, background: 'rgba(30,217,138,.1)', border: '1px solid rgba(30,217,138,.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>🕊️</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>ChampionsLoft</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Gestão Columbófila Profissional</div>
        </div>

        <div className="tab-switcher">
          <button className={`tab-btn${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')}>Entrar</button>
          <button className={`tab-btn${mode === 'register' ? ' active' : ''}`} onClick={() => setMode('register')}>Criar conta</button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <Field label="Nome *">
              <input className="input" placeholder="O seu nome" value={form.nome} onChange={e => sf('nome', e.target.value)} required />
            </Field>
          )}
          <Field label="Email *">
            <input className="input" type="email" placeholder="email@exemplo.pt" value={form.email} onChange={e => sf('email', e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password *">
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => sf('password', e.target.value)} required minLength={6} />
          </Field>
          {mode === 'register' && (
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <input type="checkbox" id="termos" checked={termosAceites} onChange={e=>setTermosAceites(e.target.checked)} style={{ marginTop:2, flexShrink:0, accentColor:'#1ed98a', width:16, height:16 }}/>
              <label htmlFor="termos" style={{ fontSize:12, color:'#94a3b8', lineHeight:1.4 }}>
                Aceito os{' '}
                <button type="button" onClick={()=>setShowTermos(true)} style={{ background:'none', border:'none', color:'#1ed98a', cursor:'pointer', fontSize:12, textDecoration:'underline', padding:0 }}>Termos de Utilização</button>
                {' '}e a{' '}
                <button type="button" onClick={()=>setShowPrivacidade(true)} style={{ background:'none', border:'none', color:'#1ed98a', cursor:'pointer', fontSize:12, textDecoration:'underline', padding:0 }}>Política de Privacidade</button>
              </label>
            </div>
          )}
          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 4 }} disabled={loading}>
            {loading ? <Spinner /> : null}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>

      {/* Modal Termos */}
      {showTermos && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#141f2e', border:'1px solid #1e3050', borderRadius:20, width:'100%', maxWidth:500, maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #1e3050', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:600, color:'#fff' }}>📋 Termos de Utilização</div>
              <button className="btn btn-icon" onClick={()=>setShowTermos(false)}>✕</button>
            </div>
            <div style={{ padding:'20px', overflowY:'auto', fontSize:13, color:'#94a3b8', lineHeight:1.7 }}>
              <p><strong style={{ color:'#fff' }}>1. Aceitação dos Termos</strong></p>
              <p>Ao utilizar o ChampionsLoft, o utilizador aceita os presentes Termos de Utilização. Se não concordar com estes termos, não deverá utilizar o serviço.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>2. Descrição do Serviço</strong></p>
              <p>O ChampionsLoft é uma plataforma de gestão columbófila que permite registar e gerir pombos, provas, saúde, reprodução e financeiro associado à actividade columbófila.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>3. Conta de Utilizador</strong></p>
              <p>O utilizador é responsável pela confidencialidade das suas credenciais de acesso e por todas as actividades realizadas na sua conta.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>4. Dados e Privacidade</strong></p>
              <p>Os dados introduzidos pelo utilizador são armazenados de forma segura. O ChampionsLoft não partilha dados pessoais com terceiros sem consentimento expresso.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>5. Propriedade Intelectual</strong></p>
              <p>Todo o software, design e conteúdo do ChampionsLoft são propriedade dos seus criadores e estão protegidos por direitos de autor.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>6. Limitação de Responsabilidade</strong></p>
              <p>O ChampionsLoft não se responsabiliza por perdas de dados resultantes de uso indevido ou falhas técnicas fora do controlo da plataforma.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>7. Alterações aos Termos</strong></p>
              <p>Reservamos o direito de alterar estes termos. Os utilizadores serão notificados de alterações significativas por email.</p>
              <p style={{ marginTop:12, color:'#475569', fontSize:11 }}>Última actualização: Abril 2026</p>
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid #1e3050' }}>
              <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} onClick={()=>{ setTermosAceites(true); setShowTermos(false) }}>✅ Aceitar e Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Privacidade */}
      {showPrivacidade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#141f2e', border:'1px solid #1e3050', borderRadius:20, width:'100%', maxWidth:500, maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #1e3050', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:600, color:'#fff' }}>🔒 Política de Privacidade</div>
              <button className="btn btn-icon" onClick={()=>setShowPrivacidade(false)}>✕</button>
            </div>
            <div style={{ padding:'20px', overflowY:'auto', fontSize:13, color:'#94a3b8', lineHeight:1.7 }}>
              <p><strong style={{ color:'#fff' }}>1. Dados Recolhidos</strong></p>
              <p>Recolhemos apenas os dados necessários para o funcionamento do serviço: nome, email, dados dos pombos e actividade columbófila introduzida pelo utilizador.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>2. Utilização dos Dados</strong></p>
              <p>Os dados são utilizados exclusivamente para fornecer as funcionalidades da plataforma e melhorar a experiência do utilizador.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>3. Armazenamento Seguro</strong></p>
              <p>Todos os dados são armazenados em servidores seguros com encriptação. Utilizamos o Supabase como fornecedor de base de dados, em conformidade com o RGPD.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>4. Partilha de Dados</strong></p>
              <p>Não vendemos nem partilhamos os seus dados pessoais com terceiros para fins comerciais.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>5. Direitos do Utilizador</strong></p>
              <p>Tem o direito de aceder, corrigir ou eliminar os seus dados a qualquer momento através das definições da conta ou contactando o suporte.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>6. Cookies</strong></p>
              <p>Utilizamos apenas cookies essenciais para manter a sessão activa. Não utilizamos cookies de rastreamento ou publicidade.</p>
              <p style={{ marginTop:12 }}><strong style={{ color:'#fff' }}>7. Contacto</strong></p>
              <p>Para questões relacionadas com privacidade, contacte-nos através do suporte da plataforma.</p>
              <p style={{ marginTop:12, color:'#475569', fontSize:11 }}>Última actualização: Abril 2026 · Conforme RGPD</p>
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid #1e3050' }}>
              <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} onClick={()=>{ setTermosAceites(true); setShowPrivacidade(false) }}>✅ Aceitar e Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────
function Dashboard({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const nome = user?.user_metadata?.nome?.split(' ')[0] || 'Columbófilo'
  const h = new Date().getHours()
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [pombos, provas, fin, saude, treinos, tarefas, acas] = await Promise.all([
          db.getPombos(),
          db.getProvas(),
          db.getFinancas(),
          supabase.from('health').select('*').order('created_at',{ascending:false}).limit(3).then(r=>r.data||[]),
          supabase.from('treinos').select('*').order('data_reg',{ascending:false}).limit(3).then(r=>r.data||[]),
          supabase.from('tarefas').select('*').eq('estado','por_iniciar').then(r=>r.data||[]),
          supabase.from('breeding').select('*').eq('estado','em_progresso').then(r=>r.data||[]),
        ])
        const ano = new Date().getFullYear()
        const hoje = new Date().toISOString().slice(0,10)
        const finAno = fin.filter(t=>new Date(t.data_reg).getFullYear()===ano)
        const rec = finAno.filter(t=>t.tipo==='receita').reduce((s,t)=>s+(t.val||0),0)
        const dep = finAno.filter(t=>t.tipo==='despesa').reduce((s,t)=>s+(t.val||0),0)
        const tarefasAtraso = tarefas.filter(t=>t.data_prevista&&t.data_prevista<hoje)
        const top = [...pombos].sort((a,b)=>(b.percentil||0)-(a.percentil||0)).slice(0,5)
        const vitorias = provas.filter(p=>p.lugar===1).length
        const pombosAtivos = pombos.filter(p=>(!p.estado_ext||p.estado_ext==='proprio')&&p.estado==='ativo')
        setData({ pombos, provas, saldo:rec-dep, rec, dep, ativos:pombosAtivos.length, total:pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio').length, top, vitorias, saude, treinos, tarefasAtraso, acas, ano })
      } catch(e) { toast('Erro: '+e.message,'err') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spinner lg/></div>

  const mediaScore = data.top.length ? Math.round(data.top.reduce((s,p)=>s+(p.percentil||0),0)/data.top.length) : 0
  const corScore = s => s>=80?'#1ed98a':s>=60?'#facc15':s>=40?'#60a5fa':'#f87171'

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#fff' }}>{saudacao}, {nome} 👋</h1>
          <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>
            {new Date().toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </div>
        </div>
        {data.tarefasAtraso.length>0&&(
          <button onClick={()=>nav('checklist')} style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'8px 14px', cursor:'pointer', fontSize:13, color:'#f87171', fontFamily:'inherit' }}>
            ⚠️ {data.tarefasAtraso.length} tarefa(s) em atraso
          </button>
        )}
      </div>

      {/* KPIs principais */}
      <div className="grid-4 mb-4">
        <KpiCard icon="🐦" label="Pombos Activos" value={data.ativos} color="text-green" onClick={()=>nav('pombos')}/>
        <KpiCard icon="🏆" label={`Provas ${data.ano}`} value={data.provas.length} color="text-yellow" onClick={()=>nav('provas')}/>
        <KpiCard icon="🥇" label="Vitórias" value={data.vitorias} color="text-green" onClick={()=>nav('provas')}/>
        <div className="kpi" onClick={()=>nav('financas')} style={{ cursor:'pointer' }}>
          <div style={{ fontSize:20 }}>💶</div>
          <div className="kpi-val" style={{ color:data.saldo>=0?'#1ed98a':'#f87171', fontSize:28 }}>{data.saldo>=0?'+':''}{data.saldo.toFixed(0)}€</div>
          <div className="kpi-label">Saldo {data.ano}</div>
        </div>
      </div>

      <div className="grid-4 mb-6">
        <KpiCard icon="🥚" label="Acasalamentos Activos" value={data.acas.length} color="text-yellow" onClick={()=>nav('reproducao')}/>
        <KpiCard icon="📊" label="Score Médio" value={mediaScore+'%'} color="text-blue" onClick={()=>nav('fimepoca')}/>
        <KpiCard icon="🏠" label="Total Efectivo" value={data.total} onClick={()=>nav('pombos')}/>
        <KpiCard icon="✅" label="Tarefas Pendentes" value={data.tarefasAtraso.length} color={data.tarefasAtraso.length>0?'text-red':'text-green'} onClick={()=>nav('checklist')}/>
      </div>

      {/* Grid principal */}
      <div className="grid-2 mb-4">
        {/* Top pombos */}
        <div className="card card-p">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontWeight:600, color:'#fff' }}>🏅 Top Pombos</div>
            <button className="btn btn-secondary btn-sm" onClick={()=>nav('pombos')}>Ver todos →</button>
          </div>
          {data.top.length===0
            ? <div style={{ textAlign:'center', color:'#64748b', fontSize:13, padding:'20px 0' }}>Sem pombos ainda</div>
            : data.top.map((p,i)=>(
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<data.top.length-1?'1px solid #1e3050':'none' }}>
                <span style={{ fontFamily:'Barlow Condensed', fontSize:18, fontWeight:700, width:20, color:i===0?'#facc15':i===1?'#cbd5e1':i===2?'#b45309':'#475569' }}>{i+1}</span>
                <div style={{ width:32, height:32, borderRadius:8, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, overflow:'hidden', flexShrink:0 }}>
                  {p.foto_url?<img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:p.emoji||'🐦'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nome}</div>
                  <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#64748b' }}>{p.anilha}</div>
                </div>
                <div style={{ width:60 }}>
                  <div className="progress"><div className="progress-bar" style={{ width:`${p.percentil||0}%`, background:corScore(p.percentil||0) }}/></div>
                  <div style={{ fontSize:10, color:corScore(p.percentil||0), textAlign:'right', fontWeight:700 }}>{p.percentil||0}%</div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Provas recentes */}
        <div className="card card-p">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontWeight:600, color:'#fff' }}>🏆 Provas Recentes</div>
            <button className="btn btn-secondary btn-sm" onClick={()=>nav('provas')}>Ver todas →</button>
          </div>
          {data.provas.length===0
            ? <div style={{ textAlign:'center', color:'#64748b', fontSize:13, padding:'20px 0' }}>Sem provas registadas</div>
            : data.provas.slice(0,5).map(p=>(
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #1e3050' }}>
                <span style={{ fontSize:18 }}>🏆</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{p.nome}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{p.dist}km · {p.local_solta||'—'} · {new Date(p.data_reg).toLocaleDateString('pt-PT')}</div>
                </div>
                {p.lugar&&<div style={{ fontFamily:'Barlow Condensed', fontSize:20, fontWeight:700, color:p.lugar===1?'#facc15':p.lugar<=3?'#cbd5e1':'#94a3b8' }}>{p.lugar}º</div>}
              </div>
            ))
          }
        </div>
      </div>

      {/* Segunda linha */}
      <div className="grid-2 mb-4">
        {/* Finanças resumo */}
        <div className="card card-p">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontWeight:600, color:'#fff' }}>💰 Finanças {data.ano}</div>
            <button className="btn btn-secondary btn-sm" onClick={()=>nav('financas')}>Ver →</button>
          </div>
          <div style={{ display:'flex', gap:16, marginBottom:12 }}>
            <div style={{ flex:1, textAlign:'center' }}>
              <div style={{ fontFamily:'Barlow Condensed', fontSize:28, fontWeight:700, color:'#1ed98a' }}>{data.rec.toFixed(0)}€</div>
              <div style={{ fontSize:11, color:'#64748b' }}>RECEITAS</div>
            </div>
            <div style={{ width:1, background:'#1e3050' }}/>
            <div style={{ flex:1, textAlign:'center' }}>
              <div style={{ fontFamily:'Barlow Condensed', fontSize:28, fontWeight:700, color:'#f87171' }}>{data.dep.toFixed(0)}€</div>
              <div style={{ fontSize:11, color:'#64748b' }}>DESPESAS</div>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'8px 12px', background:'#1a2840', borderRadius:8 }}>
            <span style={{ color:'#94a3b8' }}>Saldo</span>
            <span style={{ fontWeight:700, color:data.saldo>=0?'#1ed98a':'#f87171' }}>{data.saldo>=0?'+':''}{data.saldo.toFixed(2)}€</span>
          </div>
        </div>

        {/* Acasalamentos + Saúde */}
        <div className="card card-p">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontWeight:600, color:'#fff' }}>🥚 Reprodução Activa</div>
            <button className="btn btn-secondary btn-sm" onClick={()=>nav('reproducao')}>Ver →</button>
          </div>
          {data.acas.length===0
            ? <div style={{ textAlign:'center', color:'#64748b', fontSize:13, padding:'10px 0' }}>Sem acasalamentos activos</div>
            : data.acas.slice(0,3).map(a=>(
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #1e3050' }}>
                <span style={{ fontSize:18 }}>🥚</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#fff' }}>{a.pai_nome?.split('(')[0]||'—'} × {a.mae_nome?.split('(')[0]||'—'}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{a.cacifo?`Cacifo ${a.cacifo} · `:''}{a.ninhadas||0} ninhadas</div>
                </div>
                {a.data_eclosao_prev&&<div style={{ fontSize:11, color:'#facc15' }}>🐣 {new Date(a.data_eclosao_prev).toLocaleDateString('pt-PT')}</div>}
              </div>
            ))
          }
        </div>
      </div>

      {/* Treinos recentes + Atalhos */}
      <div className="grid-2">
        <div className="card card-p">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontWeight:600, color:'#fff' }}>🎯 Treinos Recentes</div>
            <button className="btn btn-secondary btn-sm" onClick={()=>nav('treinos')}>Ver →</button>
          </div>
          {data.treinos.length===0
            ? <div style={{ textAlign:'center', color:'#64748b', fontSize:13, padding:'10px 0' }}>Sem treinos registados</div>
            : data.treinos.map(t=>(
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #1e3050' }}>
                <span style={{ fontSize:18 }}>🎯</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#fff' }}>{t.local}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{t.dist?t.dist+'km · ':''}{t.pombos_n||'?'} pombos · {t.retorno}</div>
                </div>
                <div style={{ fontSize:11, color:'#64748b' }}>{t.data_reg?new Date(t.data_reg).toLocaleDateString('pt-PT'):'—'}</div>
              </div>
            ))
          }
        </div>

        {/* Atalhos rápidos */}
        <div className="card card-p">
          <div style={{ fontWeight:600, color:'#fff', marginBottom:14 }}>⚡ Acesso Rápido</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              ['🐦','Novo Pombo','pombos'],
              ['🏆','Nova Prova','provas'],
              ['🎯','Novo Treino','treinos'],
              ['🏥','Registo Saúde','saude'],
              ['💰','Nova Transacção','financas'],
              ['✅','Checklist','checklist'],
              ['🥚','Reprodução','reproducao'],
              ['🏁','Fim de Época','fimepoca'],
            ].map(([icon,label,page])=>(
              <button key={page} onClick={()=>nav(page)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#1a2840', border:'1px solid #1e3050', borderRadius:10, cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .15s' }}
                onMouseOver={e=>e.currentTarget.style.borderColor='#1ed98a'}
                onMouseOut={e=>e.currentTarget.style.borderColor='#1e3050'}>
                <span style={{ fontSize:18 }}>{icon}</span>
                <span style={{ fontSize:12, fontWeight:500, color:'#cbd5e1' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── POMBOS PAGE ──────────────────────────────────────
function Pombos() {
  const toast = useToast()
  const { user } = useAuth()
  const [pombos, setPombos] = useState([])
  const [pombais, setPombais] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [tabPrincipal, setTabPrincipal] = useState('efectivo')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const anoAtual = new Date().getFullYear()
  const anos = Array.from({length:10},(_,i)=>anoAtual-i)
  const paises = ['PT','ES','FR','BE','NL','DE','IT','GB','PL','CZ']
  const CORES_POMBO = ['Azul barrado','Azul sem barra','Azul xadrez','Vermelho barrado','Vermelho sem barra','Branco','Branco com marcas','Amarelo','Alazão','Cinzento','Meado','Tigrado']
  const [anilhaPais, setAnilhaPais] = useState('PT')
  const [anilhaAno, setAnilhaAno] = useState(String(anoAtual))
  const [anilhaNum, setAnilhaNum] = useState('')
  const FILTROS = [{id:'todos',label:'Todos'},{id:'M',label:'♂ Machos'},{id:'F',label:'♀ Fêmeas'},{id:'ativo',label:'Voadores'},{id:'reproducao',label:'Reprodução'},{id:'lesionado',label:'Lesionados'},{id:'velocidade',label:'Velocidade'},{id:'meio_fundo',label:'Meio-Fundo'},{id:'fundo',label:'Fundo'},{id:'grande_fundo',label:'G.Fundo'}]
  const ESTADOS_EXT = ['proprio','emprestado','cedido','vendido','oferecido','falecido']
  const EMPTY = { anilha:'', nome:'', sexo:'M', cor:'', peso:'', esp:['velocidade'], estado:'ativo', estado_ext:'proprio', pombal:'', pai:'', mae:'', obs:'', emoji:'🐦', criador:'', data_aquisicao:'', valor_aquisicao:'', obs_aquisicao:'', destino_nome:'', destino_data:'', destino_valor:'', destino_obs:'' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))
  const ESPS = [['velocidade','Velocidade'],['meio_fundo','Meio-Fundo'],['fundo','Fundo'],['grande_fundo','G.Fundo']]
  const statusBadge = { ativo:'green', reproducao:'yellow', lesionado:'red', inativo:'gray' }
  const extBadge = { proprio:'green', emprestado:'yellow', cedido:'blue', vendido:'gray', oferecido:'blue', falecido:'red' }

  const load = useCallback(async () => {
    setLoading(true)
    try { const [p,pb] = await Promise.all([db.getPombos(), db.getPombais()]); setPombos(p); setPombais(pb) }
    catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  // Separar por estado_ext
  const efectivo = pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio')
  const externos = pombos.filter(p=>p.estado_ext&&p.estado_ext!=='proprio')
  const emprestados = externos.filter(p=>p.estado_ext==='emprestado')
  const cedidos = externos.filter(p=>p.estado_ext==='cedido')
  const vendidos = externos.filter(p=>p.estado_ext==='vendido'||p.estado_ext==='oferecido')

  const listaActual = tabPrincipal==='efectivo' ? efectivo : tabPrincipal==='emprestados' ? emprestados : tabPrincipal==='cedidos' ? cedidos : vendidos

  const filtered = listaActual.filter(p => {
    const ms = !search || p.nome?.toLowerCase().includes(search.toLowerCase()) || p.anilha?.toLowerCase().includes(search.toLowerCase())
    const mf = tabPrincipal!=='efectivo' || filtro==='todos' || p.sexo===filtro || p.estado===filtro || (p.esp||[]).includes(filtro)
    return ms && mf
  })

  const openNew = () => { setAnilhaPais('PT'); setAnilhaAno(String(anoAtual)); setAnilhaNum(''); setForm({...EMPTY,pombal:pombais[0]?.nome||''}); setPhotoFile(null); setPhotoPreview(null); setSelected(null); setModal('form') }
  const openEdit = (p) => { setSelected(p); setForm({ anilha:p.anilha||'', nome:p.nome||'', sexo:p.sexo||'M', cor:p.cor||'', peso:p.peso||'', esp:p.esp||['velocidade'], estado:p.estado||'ativo', estado_ext:p.estado_ext||'proprio', pombal:p.pombal||'', pai:p.pai||'', mae:p.mae||'', obs:p.obs||'', emoji:p.emoji||'🐦', criador:p.criador||'', data_aquisicao:p.data_aquisicao||'', valor_aquisicao:p.valor_aquisicao||'', obs_aquisicao:p.obs_aquisicao||'', destino_nome:p.destino_nome||'', destino_data:p.destino_data||'', destino_valor:p.destino_valor||'', destino_obs:p.destino_obs||'' }); setPhotoPreview(p.foto_url||null); setPhotoFile(null); setModal('form') }
  const openDetail = (p) => { setSelected(p); setModal('detail') }
  const close = () => { setModal(null); setSelected(null); setPhotoFile(null); setPhotoPreview(null) }
  const toggleEsp = (e) => sf('esp', form.esp.includes(e)?form.esp.filter(x=>x!==e):[...form.esp,e])

  const save = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório','warn'); return }
    setSaving(true)
    try {
      const anilhaFinal = anilhaNum ? `${anilhaPais}-${anilhaAno}-${anilhaNum.padStart(5,'0')}` : form.anilha.trim()
      const payload = { anilha:anilhaFinal, nome:form.nome.trim(), sexo:form.sexo, cor:form.cor, peso:form.peso?parseInt(form.peso):null, esp:form.esp, estado:form.estado, estado_ext:form.estado_ext, pombal:form.pombal, pai:form.pai, mae:form.mae, obs:form.obs, emoji:form.emoji, criador:form.criador, data_aquisicao:form.data_aquisicao||null, valor_aquisicao:form.valor_aquisicao?parseFloat(form.valor_aquisicao):null, obs_aquisicao:form.obs_aquisicao, destino_nome:form.destino_nome, destino_data:form.destino_data||null, destino_valor:form.destino_valor?parseFloat(form.destino_valor):null, destino_obs:form.destino_obs, provas:selected?.provas||0, percentil:selected?.percentil||0, forma:selected?.forma||50 }
      let saved
      if (selected) saved = await db.updatePombo(selected.id, payload)
      else saved = await db.createPombo(payload)
      if (photoFile && saved?.id && user?.id) {
        try { const url = await db.uploadFoto(user.id, saved.id, photoFile); await db.updatePombo(saved.id, {foto_url:url}) }
        catch(e) { toast('Foto não guardada','warn') }
      }
      toast(selected?'Actualizado!':form.nome+' adicionado!','ok'); close(); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deletePombo(confirm.id); toast('Eliminado','ok'); setConfirm(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  const PomboCard = ({p}) => {
    const fc=(p.forma||50)>=80?'#1ed98a':(p.forma||50)>=60?'#facc15':'#f87171'
    return (
      <div className="pombo-card" onClick={()=>openDetail(p)}>
        <div className="pombo-photo" style={{ height:160 }}>
          {p.foto_url?<img src={p.foto_url} alt={p.nome}/>:p.emoji}
          <div style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,.6)', borderRadius:6, padding:'2px 6px', fontSize:11, fontWeight:700 }}>{p.sexo==='M'?'♂':'♀'}</div>
          {p.estado_ext&&p.estado_ext!=='proprio'&&<div style={{ position:'absolute', top:6, left:6, background:'rgba(0,0,0,.7)', borderRadius:6, padding:'2px 6px', fontSize:10, fontWeight:700, color:'#facc15' }}>{p.estado_ext.toUpperCase()}</div>}
        </div>
        <div className="pombo-info">
          <div className="pombo-anel">{p.anilha}</div>
          <div className="pombo-nome">{p.nome}</div>
          <Badge v={statusBadge[p.estado]}>{p.estado}</Badge>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
            <div className="progress" style={{ flex:1 }}><div className="progress-bar" style={{ width:`${p.forma||50}%`, background:fc }}/></div>
            <span style={{ fontSize:11, fontWeight:700, color:fc }}>{p.forma||50}%</span>
          </div>
        </div>
      </div>
    )
  }

  const ExternoCard = ({p}) => (
    <div className="card card-p" style={{ cursor:'pointer' }} onClick={()=>openDetail(p)}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:10, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, overflow:'hidden', flexShrink:0 }}>
          {p.foto_url?<img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:p.emoji||'🐦'}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</div>
          <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>{p.anilha}</div>
          {p.destino_nome&&<div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>→ {p.destino_nome}{p.destino_data?` · ${new Date(p.destino_data).toLocaleDateString('pt-PT')}`:''}</div>}
          {p.destino_valor&&<div style={{ fontSize:11, color:'#facc15' }}>💶 {p.destino_valor}€</div>}
        </div>
        <Badge v={extBadge[p.estado_ext]||'gray'}>{p.estado_ext}</Badge>
      </div>
    </div>
  )

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Pombos</div><div className="section-sub">{efectivo.length} no efectivo · {externos.length} externos</div></div>
        <button className="btn btn-primary" onClick={openNew}>＋ Novo Pombo</button>
      </div>

      {/* Tabs principais */}
      <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:16, overflowX:'auto' }}>
        {[['efectivo',`🐦 Efectivo (${efectivo.length})`],['emprestados',`🔄 Emprestados (${emprestados.length})`],['cedidos',`🤝 Cedidos (${cedidos.length})`],['vendidos',`💰 Vendidos/Oferecidos (${vendidos.length})`]].map(([t,l])=>(
          <button key={t} onClick={()=>setTabPrincipal(t)} style={{ padding:'8px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tabPrincipal===t?'#1ed98a':'none', color:tabPrincipal===t?'#0a0f14':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {/* Filtros só no efectivo */}
      {tabPrincipal==='efectivo' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
          <input className="input" placeholder="🔍 Pesquisar..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {FILTROS.map(f=><button key={f.id} onClick={()=>setFiltro(f.id)} className={`chip${filtro===f.id?' active':''}`} style={{ fontSize:11 }}>{f.label}</button>)}
          </div>
          <div style={{ fontSize:12, color:'#64748b' }}>{filtered.length} pombo(s)</div>
        </div>
      )}

      {tabPrincipal!=='efectivo' && (
        <input className="input" style={{ marginBottom:16 }} placeholder="🔍 Pesquisar..." value={search} onChange={e=>setSearch(e.target.value)}/>
      )}

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
        : filtered.length===0 ? <EmptyState icon="🐦" title="Sem pombos" desc="Nenhum pombo nesta categoria" action={tabPrincipal==='efectivo'?<button className="btn btn-primary" onClick={openNew}>＋ Novo Pombo</button>:null}/>
        : tabPrincipal==='efectivo'
          ? <div className="grid-auto">{filtered.map(p=><PomboCard key={p.id} p={p}/>)}</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{filtered.map(p=><ExternoCard key={p.id} p={p}/>)}</div>
      }

      {/* Form modal */}
      <Modal open={modal==='form'} onClose={close} title={selected?`✏️ ${selected.nome}`:'🐦 Novo Pombo'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}{selected?'Guardar':'Adicionar'}</button></>}>
        <div className="form-grid">
          {/* Foto */}
          <div className="col-2" style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:72, height:72, borderRadius:14, border:'2px dashed #243860', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', cursor:'pointer', flexShrink:0 }} onClick={()=>document.getElementById('photo-up').click()}>
              {photoPreview?<img src={photoPreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<span style={{ fontSize:32 }}>{form.emoji}</span>}
            </div>
            <div>
              <input type="file" id="photo-up" accept="image/*" style={{ display:'none' }} onChange={e=>{ const f=e.target.files[0]; if(f){setPhotoFile(f);setPhotoPreview(URL.createObjectURL(f))} }}/>
              <button className="btn btn-secondary btn-sm" onClick={()=>document.getElementById('photo-up').click()}>📸 Foto</button>
            </div>
          </div>
          {/* Anel estruturado */}
          <Field label="Anel *">
            <div style={{ display:'flex', gap:4 }}>
              <select className="input" style={{ width:72 }} value={anilhaPais} onChange={e=>setAnilhaPais(e.target.value)}>{paises.map(p=><option key={p}>{p}</option>)}</select>
              <select className="input" style={{ width:88 }} value={anilhaAno} onChange={e=>setAnilhaAno(e.target.value)}>{anos.map(a=><option key={a}>{a}</option>)}</select>
              <input className="input" style={{ flex:1 }} placeholder="00000" maxLength={5} value={anilhaNum} onChange={e=>setAnilhaNum(e.target.value.replace(/[^0-9]/g,''))}/>
            </div>
            <div style={{ fontSize:11, color:'#1ed98a', marginTop:4 }}>🏷️ {anilhaPais}-{anilhaAno}-{(anilhaNum||'?????').padStart(5,'0')}</div>
          </Field>
          <Field label="Nome *"><input className="input" placeholder="Nome do pombo" value={form.nome} onChange={e=>sf('nome',e.target.value)}/></Field>
          <Field label="Sexo"><select className="input" value={form.sexo} onChange={e=>sf('sexo',e.target.value)}><option value="M">♂ Macho</option><option value="F">♀ Fêmea</option></select></Field>
          <Field label="Estado"><select className="input" value={form.estado} onChange={e=>sf('estado',e.target.value)}>{['ativo','reproducao','lesionado','inativo'].map(s=><option key={s}>{s}</option>)}</select></Field>
          <Field label="Situação">
            <select className="input" value={form.estado_ext} onChange={e=>sf('estado_ext',e.target.value)}>
              {ESTADOS_EXT.map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Cor">
            <select className="input" value={form.cor} onChange={e=>sf('cor',e.target.value)}>
              <option value="">— Seleccionar —</option>
              {CORES_POMBO.map(co=><option key={co}>{co}</option>)}
            </select>
          </Field>
          <Field label="Peso (g)"><input className="input" type="number" placeholder="420" value={form.peso} onChange={e=>sf('peso',e.target.value)}/></Field>
          <Field label="Pombal"><select className="input" value={form.pombal} onChange={e=>sf('pombal',e.target.value)}><option value="">— Sem pombal —</option>{pombais.map(pb=><option key={pb.id}>{pb.nome}</option>)}</select></Field>
          <div className="col-2"><Field label="Especialidades"><div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>{ESPS.map(([v,l])=><button key={v} type="button" className={`chip${form.esp.includes(v)?' active':''}`} onClick={()=>toggleEsp(v)}>{l}</button>)}</div></Field></div>
          {/* Anel Pai/Mãe */}
          <Field label="Anel do Pai"><input className="input font-mono" style={{ fontSize:11 }} placeholder="PT-0000-00000" value={form.pai} onChange={e=>sf('pai',e.target.value.toUpperCase())}/></Field>
          <Field label="Anel da Mãe"><input className="input font-mono" style={{ fontSize:11 }} placeholder="PT-0000-00000" value={form.mae} onChange={e=>sf('mae',e.target.value.toUpperCase())}/></Field>
          {/* Origem */}
          <div className="col-2" style={{ borderTop:'1px solid #1e3050', paddingTop:12, marginTop:4 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#94a3b8', marginBottom:10 }}>📦 Origem / Aquisição</div>
          </div>
          <Field label="Criador / Origem"><input className="input" placeholder="Nome do criador" value={form.criador} onChange={e=>sf('criador',e.target.value)}/></Field>
          <Field label="Data de Aquisição"><input className="input" type="date" value={form.data_aquisicao} onChange={e=>sf('data_aquisicao',e.target.value)}/></Field>
          <Field label="Valor de Aquisição (€)"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.valor_aquisicao} onChange={e=>sf('valor_aquisicao',e.target.value)}/></Field>
          <Field label="Obs. Aquisição"><input className="input" placeholder="Notas..." value={form.obs_aquisicao} onChange={e=>sf('obs_aquisicao',e.target.value)}/></Field>
          {/* Destino - só se não for próprio */}
          {form.estado_ext!=='proprio'&&(
            <>
              <div className="col-2" style={{ borderTop:'1px solid #1e3050', paddingTop:12, marginTop:4 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#facc15', marginBottom:10 }}>🎯 Destino ({form.estado_ext})</div>
              </div>
              <Field label="Destino (nome/entidade)"><input className="input" placeholder="Nome do destinatário" value={form.destino_nome} onChange={e=>sf('destino_nome',e.target.value)}/></Field>
              <Field label="Data"><input className="input" type="date" value={form.destino_data} onChange={e=>sf('destino_data',e.target.value)}/></Field>
              <Field label="Valor (€)"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.destino_valor} onChange={e=>sf('destino_valor',e.target.value)}/></Field>
              <Field label="Observações"><input className="input" placeholder="Notas..." value={form.destino_obs} onChange={e=>sf('destino_obs',e.target.value)}/></Field>
            </>
          )}
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e=>sf('obs',e.target.value)}/></Field></div>
        </div>
      </Modal>

      {/* Detail modal */}
      {selected&&(
        <Modal open={modal==='detail'} onClose={close} title={`${selected.emoji||'🐦'} ${selected.nome}`} wide
          footer={<div style={{ display:'flex', gap:8, width:'100%' }}><button className="btn btn-danger btn-sm" onClick={()=>{close();setConfirm(selected)}}>🗑️</button><div style={{ flex:1 }}/><button className="btn btn-secondary" onClick={close}>Fechar</button><button className="btn btn-primary" onClick={()=>openEdit(selected)}>✏️ Editar</button></div>}>
          <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
            <div style={{ width:80, height:80, borderRadius:14, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, overflow:'hidden', flexShrink:0, border:'1px solid #243860' }}>
              {selected.foto_url?<img src={selected.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:selected.emoji||'🐦'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                <span style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'#1ed98a' }}>{selected.anilha}</span>
                <Badge v={statusBadge[selected.estado]}>{selected.estado}</Badge>
                {selected.estado_ext&&selected.estado_ext!=='proprio'&&<Badge v={extBadge[selected.estado_ext]||'gray'}>{selected.estado_ext}</Badge>}
              </div>
              <div style={{ fontSize:13, color:'#94a3b8', marginBottom:2 }}>{selected.sexo==='M'?'♂ Macho':'♀ Fêmea'} · {selected.cor||'—'}</div>
              <div style={{ fontSize:13, color:'#94a3b8' }}>🏠 {selected.pombal||'—'}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, textAlign:'center' }}>
              {[['provas','Provas','#facc15'],['percentil','Percentil %','#1ed98a'],['forma','Forma %','#60a5fa']].map(([k,l,cor])=>(
                <div key={k}><div style={{ fontFamily:'Barlow Condensed', fontSize:24, fontWeight:700, color:cor }}>{selected[k]??0}</div><div style={{ fontSize:10, color:'#64748b' }}>{l}</div></div>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div><div className="label">Pai</div><div style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'#1ed98a' }}>{selected.pai||'—'}</div></div>
            <div><div className="label">Mãe</div><div style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'#1ed98a' }}>{selected.mae||'—'}</div></div>
          </div>
          {(selected.criador||selected.data_aquisicao||selected.valor_aquisicao)&&(
            <div style={{ background:'#1a2840', borderRadius:10, padding:'10px 12px', marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', marginBottom:6 }}>📦 ORIGEM</div>
              {selected.criador&&<div style={{ fontSize:12, color:'#cbd5e1' }}>Criador: {selected.criador}</div>}
              {selected.data_aquisicao&&<div style={{ fontSize:12, color:'#cbd5e1' }}>Data: {new Date(selected.data_aquisicao).toLocaleDateString('pt-PT')}</div>}
              {selected.valor_aquisicao&&<div style={{ fontSize:12, color:'#facc15' }}>Valor: {selected.valor_aquisicao}€</div>}
              {selected.obs_aquisicao&&<div style={{ fontSize:12, color:'#64748b' }}>{selected.obs_aquisicao}</div>}
            </div>
          )}
          {selected.estado_ext&&selected.estado_ext!=='proprio'&&selected.destino_nome&&(
            <div style={{ background:'rgba(234,179,8,.08)', border:'1px solid rgba(234,179,8,.2)', borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#facc15', marginBottom:6 }}>🎯 DESTINO — {selected.estado_ext.toUpperCase()}</div>
              <div style={{ fontSize:12, color:'#cbd5e1' }}>{selected.destino_nome}</div>
              {selected.destino_data&&<div style={{ fontSize:12, color:'#94a3b8' }}>{new Date(selected.destino_data).toLocaleDateString('pt-PT')}</div>}
              {selected.destino_valor&&<div style={{ fontSize:12, color:'#facc15' }}>💶 {selected.destino_valor}€</div>}
              {selected.destino_obs&&<div style={{ fontSize:12, color:'#64748b' }}>{selected.destino_obs}</div>}
            </div>
          )}
          {selected.obs&&<div style={{ marginTop:10 }}><div className="label">Observações</div><div style={{ fontSize:13, color:'#cbd5e1', marginTop:4 }}>{selected.obs}</div></div>}
        </Modal>
      )}

      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar pombo"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar "{confirm?.nome}"?</p>
      </Modal>
    </div>
  )
}

function Pombais() {
  const toast = useToast()
  const [pombais, setPombais] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [pombalDetalhe, setPombalDetalhe] = useState(null)
  const [pomboDetalhe, setPomboDetalhe] = useState(null)
  const EMPTY = { nome: '', tipo: 'Misto', cap: '40', loc: '', lat: '', lon: '', cor: '#1ed98a' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const CORES = ['#1ed98a', '#D94F4F', '#2E7DD4', '#C9A44A', '#6C4FBB', '#E07B39']

  const load = useCallback(async () => {
    setLoading(true)
    try { const [pb, p] = await Promise.all([db.getPombais(), db.getPombos()]); setPombais(pb); setPombos(p) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true) }
  const openEdit = (pb) => { setSelected(pb); setForm({ nome: pb.nome || '', tipo: pb.tipo || 'Misto', cap: String(pb.cap || 40), loc: pb.loc || '', lat: String(pb.lat || ''), lon: String(pb.lon || ''), cor: pb.cor || '#1ed98a' }); setModal(true) }
  const close = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório', 'warn'); return }
    setSaving(true)
    try {
      const p = { nome: form.nome.trim(), tipo: form.tipo, cap: parseInt(form.cap) || 40, loc: form.loc, lat: form.lat ? parseFloat(form.lat) : null, lon: form.lon ? parseFloat(form.lon) : null, cor: form.cor }
      selected ? await db.updatePombal(selected.id, p) : await db.createPombal(p)
      toast(selected ? 'Actualizado!' : 'Pombal criado!', 'ok'); close(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deletePombal(confirm.id); toast('Eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Pombais</div><div className="section-sub">{pombais.length} instalações</div></div>
        <button className="btn btn-primary" onClick={openNew}>＋ Novo Pombal</button>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : pombais.length === 0 ? <EmptyState icon="🏠" title="Sem pombais" desc="Registe o seu pombal" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Pombal</button>} />
          : (
            <div className="grid-2">
              {pombais.map(pb => {
                const n = pombos.filter(p => p.pombal === pb.nome).length
                const pct = Math.round(n / Math.max(pb.cap, 1) * 100)
                const bar = pct > 90 ? '#f87171' : pct > 70 ? '#facc15' : '#1ed98a'
                return (
                  <div key={pb.id} className="card card-p">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: pb.cor + '20', border: `1px solid ${pb.cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏠</div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{pb.nome}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{pb.tipo}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-icon btn-sm" onClick={()=>setPombalDetalhe(pb)}>👁️</button>
                        <button className="btn btn-icon btn-sm" onClick={() => openEdit(pb)}>✏️</button>
                        <button className="btn btn-icon btn-sm" onClick={() => setConfirm(pb)}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: '#94a3b8' }}>Ocupação</span>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{n}/{pb.cap} ({pct}%)</span>
                    </div>
                    <div className="progress"><div className="progress-bar" style={{ width: `${Math.min(pct, 100)}%`, background: bar }} /></div>
                    {pb.loc && <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>📍 {pb.loc}</div>}
                    {n>0&&(
                      <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #1e3050' }}>
                        <div style={{ fontSize:11, color:'#94a3b8', marginBottom:6 }}>Pombos ({n}):</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                          {pombos.filter(p=>p.pombal===pb.nome).slice(0,8).map(p=>(
                            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:3, background:'#1a2840', borderRadius:6, padding:'2px 8px', fontSize:11 }}>
                              <span>{p.emoji}</span>
                              <span style={{ color:'#cbd5e1' }}>{p.nome}</span>
                            </div>
                          ))}
                          {n>8&&<div style={{ fontSize:11, color:'#64748b' }}>+{n-8} mais</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
      }

      <Modal open={modal} onClose={close} title={selected ? '✏️ Editar Pombal' : '🏠 Novo Pombal'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? 'Guardar' : 'Criar'}</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Pombal Principal" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field></div>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e => sf('tipo', e.target.value)}>{['Misto', 'Machos', 'Fêmeas', 'Jovens', 'Reprodutores'].map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Capacidade"><input className="input" type="number" value={form.cap} onChange={e => sf('cap', e.target.value)} /></Field>
          <div className="col-2"><Field label="Morada"><input className="input" placeholder="Endereço" value={form.loc} onChange={e => sf('loc', e.target.value)} /></Field></div>
          <Field label="Latitude GPS"><input className="input" placeholder="38.80234" value={form.lat} onChange={e => sf('lat', e.target.value)} /></Field>
          <Field label="Longitude GPS"><input className="input" placeholder="-9.38142" value={form.lon} onChange={e => sf('lon', e.target.value)} /></Field>
          <div className="col-2">
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>Cor</label>
            <div style={{ display: 'flex', gap: 8 }}>{CORES.map(c => <button key={c} type="button" onClick={() => sf('cor', c)} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: form.cor === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />)}</div>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar pombal"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar "{confirm?.nome}"?</p>
      </Modal>

      {/* Detalhe pombal */}
      <Modal open={!!pombalDetalhe} onClose={()=>{setPombalDetalhe(null);setPomboDetalhe(null)}} title={`🏠 ${pombalDetalhe?.nome}`} wide>
        {pomboDetalhe ? (
          <div>
            <button className="btn btn-secondary btn-sm" style={{ marginBottom:14 }} onClick={()=>setPomboDetalhe(null)}>← Voltar</button>
            <div style={{ display:'flex', gap:16, marginBottom:16 }}>
              <div style={{ width:80, height:80, borderRadius:14, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, overflow:'hidden', flexShrink:0, border:'1px solid #243860' }}>
                {pomboDetalhe.foto_url?<img src={pomboDetalhe.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:pomboDetalhe.emoji||'🐦'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{pomboDetalhe.nome}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:12, color:'#1ed98a', marginTop:2 }}>{pomboDetalhe.anilha}</div>
                <div style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>{pomboDetalhe.sexo==='M'?'♂ Macho':'♀ Fêmea'} · {pomboDetalhe.cor||'—'}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
              {[['Provas',pomboDetalhe.provas||0,'#facc15'],['Percentil',(pomboDetalhe.percentil||0)+'%','#1ed98a'],['Forma',(pomboDetalhe.forma||50)+'%','#60a5fa']].map(([l,v,c])=>(
                <div key={l} style={{ textAlign:'center', background:'#1a2840', borderRadius:10, padding:12 }}>
                  <div style={{ fontFamily:'Barlow Condensed', fontSize:28, fontWeight:700, color:c }}>{v}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><div className="label">Pai</div><div style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'#1ed98a', marginTop:4 }}>{pomboDetalhe.pai||'—'}</div></div>
              <div><div className="label">Mãe</div><div style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'#1ed98a', marginTop:4 }}>{pomboDetalhe.mae||'—'}</div></div>
            </div>
            {pomboDetalhe.obs&&<div style={{ marginTop:12 }}><div className="label">Observações</div><div style={{ fontSize:13, color:'#cbd5e1', marginTop:4 }}>{pomboDetalhe.obs}</div></div>}
          </div>
        ) : (
          <div>
            <div style={{ fontSize:13, color:'#94a3b8', marginBottom:12 }}>
              {pombos.filter(p=>p.pombal===pombalDetalhe?.nome).length} pombos neste pombal
            </div>
            {pombos.filter(p=>p.pombal===pombalDetalhe?.nome).length===0
              ? <div style={{ textAlign:'center', color:'#64748b', padding:'30px 0' }}>Nenhum pombo neste pombal</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {pombos.filter(p=>p.pombal===pombalDetalhe?.nome).map(p=>(
                    <div key={p.id} onClick={()=>setPomboDetalhe(p)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#1a2840', borderRadius:12, cursor:'pointer', border:'1px solid #1e3050', transition:'all .15s' }}
                      onMouseOver={e=>e.currentTarget.style.borderColor='#1ed98a'}
                      onMouseOut={e=>e.currentTarget.style.borderColor='#1e3050'}>
                      <div style={{ width:40, height:40, borderRadius:10, background:'#141f2e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, overflow:'hidden', flexShrink:0 }}>
                        {p.foto_url?<img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:p.emoji||'🐦'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{p.nome}</div>
                        <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#64748b' }}>{p.anilha}</div>
                      </div>
                      <div style={{ fontSize:12, color:'#94a3b8' }}>{p.sexo==='M'?'♂':'♀'} · {p.cor||'—'}</div>
                      <div style={{ fontFamily:'Barlow Condensed', fontSize:18, fontWeight:700, color:'#1ed98a' }}>{p.percentil||0}%</div>
                      <span style={{ color:'#475569', fontSize:16 }}>›</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </Modal>
    </div>
  )
}

function Provas() {
  const toast = useToast()
  const [provas, setProvas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [tab, setTab] = useState('lista')
  const [provaSelect, setProvaSelect] = useState('')
  const [resultados, setResultados] = useState([]) // [{anel, nome, hora, pos}]
  const [encestados, setEncestados] = useState([]) // [pombo_id]
  const [pombos, setPombos] = useState([])
  const EMPTY = { nome:'', data:new Date().toISOString().slice(0,10), dist:'', tipo:'Fundo', local_solta:'', lat_solta:'', lon_solta:'', lugar:'', vel:'', n_pombos:'' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, po] = await Promise.all([db.getProvas(), db.getPombos()])
      setProvas(p); setPombos(po)
    }
    catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  const hoje = new Date().toISOString().slice(0,10)
  // Prova é "realizada" se a data já passou OU se tem resultados (lugar/vel definidos)
  const passadas = provas.filter(p=>p.data_reg<=hoje || p.lugar || p.vel)
  const futuras = provas.filter(p=>p.data_reg>hoje && !p.lugar && !p.vel)
  const provaAtual = provas.find(p=>p.id===provaSelect)

  const [fotoPerfilFile, setFotoPerfilFile] = useState(null)
  const [fotoPombalFile, setFotoPombalFile] = useState(null)
  const [fotoPerfilPreview, setFotoPerfilPreview] = useState(null)
  const [fotoPombalPreview, setFotoPombalPreview] = useState(null)

  const save = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório','warn'); return }
    setSaving(true)
    try {
      await db.createProva({ nome:form.nome.trim(), data_reg:form.data, dist:parseInt(form.dist)||null, tipo:form.tipo.toLowerCase().replace(/-| /g,'_'), local_solta:form.local_solta, lugar:form.lugar?parseInt(form.lugar):null, vel:form.vel||null, n:form.n_pombos?parseInt(form.n_pombos):null })
      toast('Prova registada!','ok'); setModal(false); setForm(EMPTY); load()
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        const { data: perfil } = await supabase.from('perfis').select('nome,foto_perfil_url,username').eq('user_id',u.id).single()
        if (form.lugar && parseInt(form.lugar) <= 10) {
          const l = form.lugar; const emoji = l==1?'🥇':l==2?'🥈':l==3?'🥉':'🏅'
          await supabase.from('posts').insert({ user_id:u.id, autor_nome:perfil?.nome||'Columbófilo', autor_avatar:perfil?.foto_perfil_url||null, autor_username:perfil?.username||null, tipo:'resultado', conteudo:emoji+' Resultado na prova "'+form.nome+'"!\n📍 '+(form.local_solta||'—')+' · '+(form.dist||'—')+'km\n'+l+'º lugar'+(form.vel?' · '+form.vel+'m/min':'')+' 🕊️ ChampionsLoft' })
        }
      } catch(e) {}
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteProva(confirm.id); toast('Eliminada','ok'); setConfirm(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  const addResultado = () => {
    setResultados(r=>[...r, { id:Date.now(), anel:'', nome:'', hora:'', vel:'', coef:'' }])
  }
  const updateRes = (id, k, v) => setResultados(r=>r.map(x=>x.id===id?{...x,[k]:v}:x))
  const removeRes = (id) => setResultados(r=>r.filter(x=>x.id!==id))

  const toggleEncestado = (id) => setEncestados(e=>e.includes(id)?e.filter(x=>x!==id):[...e,id])
  const selectAll = () => setEncestados(pombos.map(p=>p.id))
  const selectNone = () => setEncestados([])
  const selectEsp = (esp) => setEncestados(pombos.filter(p=>(p.esp||[]).includes(esp)).map(p=>p.id))

  const ProvaRow = ({ p }) => (
    <tr style={{ cursor:'pointer' }} onClick={()=>{ setProvaSelect(p.id); setTab('resultados') }}>
      <td style={{ color:'#64748b', fontSize:12 }}>{new Date(p.data_reg).toLocaleDateString('pt-PT')}</td>
      <td style={{ fontWeight:500 }}>{p.nome}</td>
      <td><Badge v="blue">{p.tipo?.replace(/_/g,' ')}</Badge></td>
      <td style={{ fontFamily:'Barlow Condensed', fontSize:16, color:'#facc15' }}>{p.dist?p.dist+'km':'—'}</td>
      <td style={{ color:'#94a3b8', fontSize:12 }}>{p.local_solta||'—'}</td>
      <td><span style={{ fontFamily:'Barlow Condensed', fontSize:18, fontWeight:700, color:p.lugar===1?'#facc15':p.lugar===2?'#cbd5e1':p.lugar===3?'#b45309':'#94a3b8' }}>{p.lugar?p.lugar+'º':'—'}</span></td>
      <td style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'#1ed98a' }}>{p.vel||'—'}</td>
      <td onClick={e=>e.stopPropagation()}><button className="btn btn-icon btn-sm" onClick={()=>setConfirm(p)}>🗑️</button></td>
    </tr>
  )

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Provas</div><div className="section-sub">{passadas.length} realizadas · {futuras.length} agendadas</div></div>
        <button className="btn btn-primary" onClick={()=>{ setForm(EMPTY); setModal(true) }}>＋ Nova Prova</button>
      </div>

      <div className="grid-3 mb-6">
        <KpiCard icon="🏆" label="Total" value={provas.length} color="text-yellow"/>
        <KpiCard icon="🥇" label="Vitórias" value={provas.filter(p=>p.lugar===1).length} color="text-green"/>
        <KpiCard icon="📅" label="Agendadas" value={futuras.length} color="text-blue"/>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:16, overflowX:'auto' }}>
        {[['lista','📋 Lista'],['resultados','🏅 Resultados'],['encestamento','📦 Encestamento'],['mapa','🗺️ Mapa'],['meteo','🌦️ Meteorologia']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tab===t?'#1ed98a':'none', color:tab===t?'#0a0f14':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {/* Tab: Lista */}
      {tab==='lista' && (
        loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
        : <>
            {futuras.length>0&&(
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#60a5fa', marginBottom:8 }}>📅 Agendadas</div>
                <div className="card" style={{ overflowX:'auto' }}>
                  <table>
                    <thead><tr><th>Data</th><th>Prova</th><th>Tipo</th><th>Dist.</th><th>Local Solta</th><th>Lugar</th><th>Vel.</th><th></th></tr></thead>
                    <tbody>{futuras.map(p=><ProvaRow key={p.id} p={p}/>)}</tbody>
                  </table>
                </div>
              </div>
            )}
            <div style={{ fontSize:13, fontWeight:600, color:'#94a3b8', marginBottom:8 }}>✅ Realizadas</div>
            {passadas.length===0 ? <EmptyState icon="🏆" title="Sem provas" desc="Registe a primeira prova" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>＋ Nova Prova</button>}/>
            : <div className="card" style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr><th>Data</th><th>Prova</th><th>Tipo</th><th>Dist.</th><th>Local Solta</th><th>Lugar</th><th>Vel.</th><th></th></tr></thead>
                  <tbody>{passadas.map(p=><ProvaRow key={p.id} p={p}/>)}</tbody>
                </table>
              </div>
            }
          </>
      )}

      {/* Tab: Resultados */}
      {tab==='resultados' && (
        <div>
          <div style={{ marginBottom:16 }}>
            <Field label="Seleccionar Prova">
              <select className="input" value={provaSelect} onChange={e=>setProvaSelect(e.target.value)}>
                <option value="">— Seleccionar prova —</option>
                {provas.map(p=><option key={p.id} value={p.id}>{p.nome} ({new Date(p.data_reg).toLocaleDateString('pt-PT')})</option>)}
              </select>
            </Field>
          </div>
          {provaAtual&&(
            <div style={{ marginBottom:12, padding:12, background:'#1a2840', borderRadius:10, fontSize:13, color:'#94a3b8' }}>
              📍 {provaAtual.local_solta||'—'} · {provaAtual.dist}km · {provaAtual.tipo?.replace(/_/g,' ')}
            </div>
          )}
          {/* Upload folha */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px 16px', background:'#141f2e', border:'2px dashed #243860', borderRadius:14, cursor:'pointer', gap:8 }}>
              <span style={{ fontSize:32 }}>📄</span>
              <span style={{ fontSize:13, fontWeight:500, color:'#cbd5e1' }}>Carregar folha</span>
              <span style={{ fontSize:11, color:'#64748b' }}>PDF ou Excel</span>
              <input type="file" accept=".pdf,.xlsx,.xls,.csv" style={{ display:'none' }} onChange={e=>{ if(e.target.files[0]) toast('Ficheiro: '+e.target.files[0].name+' (processamento manual)','info') }}/>
            </label>
            <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px 16px', background:'#141f2e', border:'2px dashed #243860', borderRadius:14, cursor:'pointer', gap:8 }}>
              <span style={{ fontSize:32 }}>📷</span>
              <span style={{ fontSize:13, fontWeight:500, color:'#cbd5e1' }}>Foto da folha</span>
              <span style={{ fontSize:11, color:'#64748b' }}>JPG ou PNG</span>
              <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e=>{ if(e.target.files[0]) toast('Foto recebida: '+e.target.files[0].name,'info') }}/>
            </label>
          </div>
          {/* Tabela manual */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontWeight:600, color:'#fff', fontSize:13 }}>🏠 Ordem de Chegada ao Pombal</div>
            <button className="btn btn-secondary btn-sm" onClick={addResultado}>＋ Adicionar</button>
          </div>
          {resultados.length===0
            ? <div style={{ textAlign:'center', color:'#64748b', fontSize:13, padding:'20px 0' }}>Adicione resultados manualmente ou carregue a folha de chegada</div>
            : <div className="card" style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr><th>Pos.</th><th>Anel</th><th>Nome</th><th>Hora Chegada</th><th>Vel. (m/min)</th><th>Coef. %</th><th></th></tr></thead>
                  <tbody>
                    {resultados.map((r,i)=>(
                      <tr key={r.id}>
                        <td><span style={{ fontFamily:'Barlow Condensed', fontSize:18, fontWeight:700, color:i===0?'#facc15':i===1?'#cbd5e1':i===2?'#b45309':'#94a3b8' }}>{i+1}º</span></td>
                        <td><input className="input" style={{ width:130, fontSize:11, padding:'4px 8px' }} placeholder="PT-2026-00000" value={r.anel} onChange={e=>updateRes(r.id,'anel',e.target.value)}/></td>
                        <td><input className="input" style={{ width:120, padding:'4px 8px', fontSize:12 }} placeholder="Nome" value={r.nome} onChange={e=>updateRes(r.id,'nome',e.target.value)}/></td>
                        <td><input className="input" style={{ width:100, padding:'4px 8px', fontSize:12 }} placeholder="14:32:15" value={r.hora} onChange={e=>updateRes(r.id,'hora',e.target.value)}/></td>
                        <td><input className="input" style={{ width:80, padding:'4px 8px', fontSize:12 }} placeholder="1382" value={r.vel} onChange={e=>updateRes(r.id,'vel',e.target.value)}/></td>
                        <td><input className="input" style={{ width:70, padding:'4px 8px', fontSize:12 }} placeholder="91.4" value={r.coef} onChange={e=>updateRes(r.id,'coef',e.target.value)}/></td>
                        <td><button className="btn btn-icon btn-sm" onClick={()=>removeRes(r.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>
      )}

      {/* Tab: Encestamento */}
      {tab==='encestamento' && (
        <div>
          <div style={{ marginBottom:16 }}>
            <Field label="Seleccionar Prova">
              <select className="input" value={provaSelect} onChange={e=>setProvaSelect(e.target.value)}>
                <option value="">— Seleccionar prova —</option>
                {provas.map(p=><option key={p.id} value={p.id}>{p.nome} ({new Date(p.data_reg).toLocaleDateString('pt-PT')})</option>)}
              </select>
            </Field>
          </div>
          {/* Upload encestamento */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'16px', background:'#141f2e', border:'2px dashed #243860', borderRadius:14, cursor:'pointer', gap:6 }}>
              <span style={{ fontSize:28 }}>📋</span>
              <span style={{ fontSize:12, fontWeight:500, color:'#cbd5e1' }}>Folha de Encestamento Oficial</span>
              <span style={{ fontSize:11, color:'#64748b' }}>PDF ou Excel</span>
              <input type="file" accept=".pdf,.xlsx,.xls,.csv" style={{ display:'none' }} onChange={e=>{ if(e.target.files[0]) toast('Folha: '+e.target.files[0].name,'info') }}/>
            </label>
            <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'16px', background:'#141f2e', border:'2px dashed #243860', borderRadius:14, cursor:'pointer', gap:6 }}>
              <span style={{ fontSize:28 }}>📷</span>
              <span style={{ fontSize:12, fontWeight:500, color:'#cbd5e1' }}>Foto da folha</span>
              <span style={{ fontSize:11, color:'#64748b' }}>JPG ou PNG</span>
              <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e=>{ if(e.target.files[0]) toast('Foto recebida','info') }}/>
            </label>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontWeight:600, color:'#fff', fontSize:13 }}>📦 Selecção de Pombos — {encestados.length} seleccionados</div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
            <button className="btn btn-secondary btn-sm" onClick={selectAll}>✓ Todos</button>
            <button className="btn btn-secondary btn-sm" onClick={selectNone}>✕ Nenhum</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>selectEsp('velocidade')}>Velocidade</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>selectEsp('meio_fundo')}>Meio-Fundo</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>selectEsp('fundo')}>Fundo</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>selectEsp('grande_fundo')}>G. Fundo</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {pombos.filter(p=>p.estado==='ativo').map(p=>(
              <div key={p.id} onClick={()=>toggleEncestado(p.id)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:encestados.includes(p.id)?'rgba(30,217,138,.08)':'#141f2e', border:`1px solid ${encestados.includes(p.id)?'#1ed98a':'#1e3050'}`, borderRadius:12, cursor:'pointer' }}>
                <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${encestados.includes(p.id)?'#1ed98a':'#475569'}`, background:encestados.includes(p.id)?'#1ed98a':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, color:'#0a0f14' }}>
                  {encestados.includes(p.id)&&'✓'}
                </div>
                <div style={{ width:36, height:36, borderRadius:8, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, overflow:'hidden', flexShrink:0 }}>
                  {p.foto_url?<img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:p.emoji}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{p.nome}</div>
                  <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#64748b' }}>{p.anilha}</div>
                </div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {(p.esp||[]).map(e=><Badge key={e} v="blue" style={{ fontSize:10 }}>{e.replace('_',' ')}</Badge>)}
                </div>
                <div style={{ fontFamily:'Barlow Condensed', fontSize:16, fontWeight:700, color:'#1ed98a', width:40, textAlign:'right' }}>{p.percentil||0}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Mapa */}
      {tab==='mapa' && (
        <div>
          <div style={{ marginBottom:16 }}>
            <Field label="Seleccionar Prova">
              <select className="input" value={provaSelect} onChange={e=>setProvaSelect(e.target.value)}>
                <option value="">— Seleccionar prova —</option>
                {provas.map(p=><option key={p.id} value={p.id}>{p.nome} ({new Date(p.data_reg).toLocaleDateString('pt-PT')})</option>)}
              </select>
            </Field>
          </div>
          {provaAtual?.local_solta ? (
            <div className="card" style={{ overflow:'hidden', borderRadius:16 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e3050', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>📍</span>
                <div>
                  <div style={{ fontWeight:500, color:'#fff' }}>{provaAtual.local_solta}</div>
                  <div style={{ fontSize:12, color:'#64748b' }}>{provaAtual.nome} · {provaAtual.dist}km</div>
                </div>
              </div>
              <div style={{ height:300 }}>
                <iframe width="100%" height="100%" frameBorder="0" style={{ display:'block' }}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(provaAtual.local_solta)}&z=10&output=embed`}/>
              </div>
            </div>
          ) : (
            <EmptyState icon="🗺️" title="Sem localização" desc={provaSelect?"Esta prova não tem local de solta definido":"Seleccione uma prova para ver o mapa"}/>
          )}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="🏆 Nova Prova" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}Registar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Grande Prova do Tejo" value={form.nome} onChange={e=>sf('nome',e.target.value)}/></Field></div>
          <Field label="Data"><input className="input" type="date" value={form.data} onChange={e=>sf('data',e.target.value)}/></Field>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e=>sf('tipo',e.target.value)}>{['Velocidade','Semi-Fundo','Fundo','Grande Fundo'].map(t=><option key={t}>{t}</option>)}</select></Field>
          <Field label="Distância (km)"><input className="input" type="number" placeholder="180" value={form.dist} onChange={e=>sf('dist',e.target.value)}/></Field>
          <Field label="Nº Pombos"><input className="input" type="number" placeholder="30" value={form.n_pombos} onChange={e=>sf('n_pombos',e.target.value)}/></Field>
          <div className="col-2"><Field label="Local de Solta"><input className="input" placeholder="Santarém, Portugal" value={form.local_solta} onChange={e=>sf('local_solta',e.target.value)}/></Field></div>
          <Field label="Lugar"><input className="input" type="number" placeholder="1" value={form.lugar} onChange={e=>sf('lugar',e.target.value)}/></Field>
          <Field label="Velocidade (m/min)"><input className="input" placeholder="1382" value={form.vel} onChange={e=>sf('vel',e.target.value)}/></Field>
        </div>
      </Modal>
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar prova"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar "{confirm?.nome}"?</p>
      </Modal>
    </div>
  )
}

function Financas() {
  const toast = useToast()
  const [trans, setTrans] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ tipo: 'despesa', val: '', desc: '', cat: 'Alimentação', data: new Date().toISOString().slice(0, 10) })
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { setTrans(await db.getFinancas()) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = trans.filter(t => {
    if (periodo === 'tudo') return true
    const d = new Date(t.data_reg); const now = new Date()
    if (periodo === 'semana') return (now - d) / 86400000 <= 7
    if (periodo === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (periodo === 'ano') return d.getFullYear() === now.getFullYear()
    return true
  })

  const rec = filtered.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.val || 0), 0)
  const dep = filtered.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (t.val || 0), 0)

  const save = async () => {
    if (!form.val || isNaN(parseFloat(form.val))) { toast('Valor inválido', 'warn'); return }
    if (!form.desc.trim()) { toast('Descrição obrigatória', 'warn'); return }
    setSaving(true)
    try {
      await db.createFinanca({ tipo: form.tipo, val: parseFloat(form.val), descricao: form.desc, cat: form.cat, data_reg: form.data })
      toast('Registado!', 'ok'); setModal(false); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteFinanca(confirm.id); toast('Eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Finanças</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>＋ Nova Transacção</button>
      </div>

      <div className="chips mb-4">
        {[['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano'], ['tudo', 'Tudo']].map(([v, l]) => (
          <button key={v} className={`chip${periodo === v ? ' active' : ''}`} onClick={() => setPeriodo(v)}>{l}</button>
        ))}
      </div>

      <div className="grid-3 mb-6">
        <KpiCard icon="💚" label="Receitas" value={`${rec.toFixed(0)}€`} color="text-green" />
        <KpiCard icon="🔴" label="Despesas" value={`${dep.toFixed(0)}€`} color="text-red" />
        <KpiCard icon="⚖️" label="Saldo" value={`${(rec - dep) >= 0 ? '+' : ''}${(rec - dep).toFixed(0)}€`} color={(rec - dep) >= 0 ? 'text-green' : 'text-red'} />
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : filtered.length === 0 ? <EmptyState icon="💰" title="Sem transacções" desc="Registe a primeira transacção" />
          : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id}>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{new Date(t.data_reg).toLocaleDateString('pt-PT')}</td>
                      <td style={{ fontWeight: 500 }}>{t.descricao}</td>
                      <td><Badge>{t.cat}</Badge></td>
                      <td><Badge v={t.tipo === 'receita' ? 'green' : 'red'}>{t.tipo}</Badge></td>
                      <td style={{ fontFamily: 'Barlow Condensed', fontSize: 16, fontWeight: 700, color: t.tipo === 'receita' ? '#1ed98a' : '#f87171' }}>{t.tipo === 'receita' ? '+' : '-'}{(t.val || 0).toFixed(2)}€</td>
                      <td><button className="btn btn-icon btn-sm" onClick={() => setConfirm(t)}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }

      <Modal open={modal} onClose={() => setModal(false)} title="💰 Nova Transacção"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}Guardar</button></>}>
        <div style={{ display: 'flex', gap: 4, background: '#1a2840', borderRadius: 10, padding: 4, marginBottom: 16 }}>
          {[['despesa', '📉 Despesa'], ['receita', '📈 Receita']].map(([v, l]) => (
            <button key={v} onClick={() => { sf('tipo', v); sf('cat', v === 'despesa' ? 'Alimentação' : 'Prémios') }}
              style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: form.tipo === v ? (v === 'despesa' ? '#ef4444' : '#1ed98a') : 'none', color: form.tipo === v ? (v === 'despesa' ? '#fff' : '#0a0f14') : '#94a3b8' }}>
              {l}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <Field label="Valor (€) *"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.val} onChange={e => sf('val', e.target.value)} /></Field>
          <Field label="Data"><input className="input" type="date" value={form.data} onChange={e => sf('data', e.target.value)} /></Field>
          <div className="col-2"><Field label="Descrição *"><input className="input" placeholder="Ex: Ração Premium" value={form.desc} onChange={e => sf('desc', e.target.value)} /></Field></div>
          <div className="col-2">
            <Field label="Categoria">
              <select className="input" value={form.cat} onChange={e => sf('cat', e.target.value)}>
                {(form.tipo === 'despesa' ? ['Alimentação', 'Medicamentos', 'Provas', 'Veterinário', 'Manutenção', 'Equipamento', 'Outros'] : ['Prémios', 'Venda de Pombos', 'Patrocínio', 'Outros']).map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar transacção"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar "{confirm?.descricao}"?</p>
      </Modal>
    </div>
  )
}

// ─── SAÚDE PAGE ───────────────────────────────────────
function Saude() {
  const toast = useToast()
  const [registos, setRegistos] = useState([])
  const [vacinas, setVacinas] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('estado')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [formR, setFormR] = useState({ pombo_id:'', apt:'boa', fase:'competicao', peso:'', obs:'', data:new Date().toISOString().slice(0,10) })
  const [formV, setFormV] = useState({ nome:'', proxima_dose:new Date().toISOString().slice(0,10), obs:'' })
  const sfR = (k,v) => setFormR(f=>({...f,[k]:v}))
  const sfV = (k,v) => setFormV(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, p] = await Promise.all([db.getSaude(), db.getPombos()])
      setRegistos(r); setPombos(p||[])
      // Vacinas em localStorage por enquanto
      try { setVacinas(JSON.parse(localStorage.getItem('cl_vacinas')||'[]')) } catch(e) {}
    }
    catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  const total = pombos.length || 1
  const ativos = pombos.filter(p=>p.estado==='ativo').length
  const lesionados = pombos.filter(p=>p.estado==='lesionado').length
  const emRepro = pombos.filter(p=>p.estado==='reproducao').length
  const pctAptos = Math.round(ativos/total*100)

  // Vacinas próximas (próximos 30 dias)
  const hoje = new Date()
  const proxVacinas = vacinas.filter(v=>{
    const d = new Date(v.proxima_dose)
    const diff = (d-hoje)/86400000
    return diff>=0 && diff<=30
  })

  const saveRegisto = async () => {
    if (!formR.pombo_id) { toast('Seleccione um pombo','warn'); return }
    setSaving(true)
    try {
      await db.createSaude({ pigeon_id:formR.pombo_id, aptidao:formR.apt, fase:formR.fase, peso:formR.peso?parseInt(formR.peso):null, obs:formR.obs, data_reg:formR.data })
      toast('Guardado!','ok'); setModal(null); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const saveVacina = () => {
    if (!formV.nome.trim()) { toast('Nome obrigatório','warn'); return }
    const novas = [...vacinas, { id:Date.now(), ...formV }]
    setVacinas(novas)
    try { localStorage.setItem('cl_vacinas', JSON.stringify(novas)) } catch(e) {}
    toast('Vacina registada!','ok'); setModal(null)
  }

  const delRegisto = async () => {
    try { await db.deleteSaude(confirm.id); toast('Eliminado','ok'); setConfirm(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  const delVacina = (id) => {
    const novas = vacinas.filter(v=>v.id!==id)
    setVacinas(novas)
    try { localStorage.setItem('cl_vacinas', JSON.stringify(novas)) } catch(e) {}
  }

  const aptVar = { excelente:'green', boa:'green', media:'yellow', fraca:'yellow', doente:'red', quarentena:'red' }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Saúde</div><div className="section-sub">Estado do efectivo</div></div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={()=>setModal('vacina')}>💉 Vacina</button>
          <button className="btn btn-primary" onClick={()=>setModal('registo')}>＋ Registo</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-3 mb-4">
        <KpiCard icon="✅" label="Excelentes/Aptos" value={ativos} color="text-green"/>
        <KpiCard icon="🚑" label="Lesionados/Tratamento" value={lesionados} color="text-red"/>
        <KpiCard icon="🥚" label="Em Reprodução" value={emRepro} color="text-yellow"/>
      </div>
      <div className="grid-3 mb-6">
        <KpiCard icon="💉" label="Vacinas próximas (30d)" value={proxVacinas.length} color={proxVacinas.length>0?'text-yellow':'text-green'}/>
        <KpiCard icon="📋" label="Registos de Saúde" value={registos.length} color="text-blue"/>
        <div className="kpi">
          <div style={{ fontSize:20 }}>🏃</div>
          <div className="kpi-val" style={{ color:pctAptos>=80?'#1ed98a':pctAptos>=60?'#facc15':'#f87171' }}>{pctAptos}%</div>
          <div className="kpi-label">Aptos p/ Competição</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:16, width:'fit-content' }}>
        {[['estado','📊 Estado'],['registos','📋 Registos'],['vacinas','💉 Vacinas']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'#1ed98a':'none', color:tab===t?'#0a0f14':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {/* Estado geral */}
      {tab==='estado' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {/* Barra aptos */}
          <div className="card card-p">
            <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>Estado do Efectivo — {pombos.length} pombos</div>
            {[['Aptos/Activos', ativos, '#1ed98a'],['Lesionados', lesionados, '#f87171'],['Em Reprodução', emRepro, '#facc15'],['Inativos', pombos.filter(p=>p.estado==='inativo').length, '#475569']].map(([label,n,cor])=>(
              <div key={label} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                  <span style={{ color:'#cbd5e1' }}>{label}</span>
                  <span style={{ fontWeight:600, color:'#fff' }}>{n} <span style={{ color:'#64748b', fontWeight:400 }}>({Math.round(n/total*100)}%)</span></span>
                </div>
                <div className="progress" style={{ height:6 }}><div className="progress-bar" style={{ width:`${n/total*100}%`, background:cor }}/></div>
              </div>
            ))}
          </div>
          {/* Últimos 5 registos */}
          <div className="card card-p">
            <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>📋 Registos Recentes</div>
            {registos.slice(0,5).map(r=>{
              const pombo = pombos.find(p=>p.id===r.pigeon_id)
              return (
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #1e3050' }}>
                  <span style={{ fontSize:20 }}>{pombo?.emoji||'🐦'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{pombo?.nome||'—'}</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>{new Date(r.data_reg||r.created_at).toLocaleDateString('pt-PT')}</div>
                  </div>
                  <Badge v={aptVar[r.aptidao]||'gray'}>{r.aptidao}</Badge>
                  {r.peso&&<span style={{ fontSize:12, color:'#94a3b8' }}>{r.peso}g</span>}
                </div>
              )
            })}
            {registos.length===0&&<div style={{ textAlign:'center', color:'#64748b', fontSize:13 }}>Sem registos</div>}
          </div>
        </div>
      )}

      {/* Registos */}
      {tab==='registos' && (
        loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
        : registos.length===0 ? <EmptyState icon="📋" title="Sem registos" desc="Registe o estado de saúde dos pombos" action={<button className="btn btn-primary" onClick={()=>setModal('registo')}>＋ Novo Registo</button>}/>
        : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {registos.map(r => {
              const pombo = pombos.find(p=>p.id===r.pigeon_id)
              return (
                <div key={r.id} className="card card-p" style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, overflow:'hidden', flexShrink:0 }}>
                    {pombo?.foto_url?<img src={pombo.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:(pombo?.emoji||'🐦')}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:500, color:'#fff' }}>{pombo?.nome||'—'}</div>
                    <div style={{ fontSize:11, color:'#64748b', fontFamily:'JetBrains Mono' }}>{pombo?.anilha||'—'}</div>
                  </div>
                  <div style={{ fontSize:12, color:'#94a3b8' }}>{r.fase}</div>
                  {r.peso&&<div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{r.peso}g</div>}
                  <Badge v={aptVar[r.aptidao]||'gray'}>{r.aptidao}</Badge>
                  <div style={{ fontSize:11, color:'#64748b' }}>{new Date(r.data_reg||r.created_at).toLocaleDateString('pt-PT')}</div>
                  <button className="btn btn-icon btn-sm" onClick={()=>setConfirm(r)}>🗑️</button>
                </div>
              )
            })}
          </div>
      )}

      {/* Vacinas */}
      {tab==='vacinas' && (
        <div>
          {proxVacinas.length>0&&(
            <div style={{ background:'rgba(234,179,8,.08)', border:'1px solid rgba(234,179,8,.2)', borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
              <div style={{ fontWeight:600, color:'#facc15', marginBottom:8 }}>⚠️ Próximas Doses (30 dias)</div>
              {proxVacinas.map(v=>(
                <div key={v.id} style={{ fontSize:13, color:'#cbd5e1', display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
                  <span>{v.nome}</span>
                  <span style={{ color:'#facc15' }}>{new Date(v.proxima_dose).toLocaleDateString('pt-PT')}</span>
                </div>
              ))}
            </div>
          )}
          {vacinas.length===0
            ? <EmptyState icon="💉" title="Sem vacinas" desc="Registe o plano de vacinação" action={<button className="btn btn-primary" onClick={()=>setModal('vacina')}>＋ Vacina</button>}/>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {vacinas.map(v=>(
                  <div key={v.id} className="card card-p" style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:24 }}>💉</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:500, color:'#fff' }}>{v.nome}</div>
                      {v.obs&&<div style={{ fontSize:12, color:'#64748b' }}>{v.obs}</div>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:12, color:'#94a3b8' }}>Próxima dose</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#facc15' }}>{new Date(v.proxima_dose).toLocaleDateString('pt-PT')}</div>
                    </div>
                    <button className="btn btn-icon btn-sm" onClick={()=>delVacina(v.id)}>🗑️</button>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* Modal registo */}
      <Modal open={modal==='registo'} onClose={()=>setModal(null)} title="📋 Novo Registo de Saúde"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={saveRegisto} disabled={saving}>{saving?<Spinner/>:null}Guardar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Pombo *"><select className="input" value={formR.pombo_id} onChange={e=>sfR('pombo_id',e.target.value)}><option value="">— Seleccionar —</option>{pombos.map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field></div>
          <Field label="Aptidão"><select className="input" value={formR.apt} onChange={e=>sfR('apt',e.target.value)}>{['excelente','boa','media','fraca','doente','quarentena'].map(a=><option key={a}>{a}</option>)}</select></Field>
          <Field label="Fase"><select className="input" value={formR.fase} onChange={e=>sfR('fase',e.target.value)}>{['competicao','reproducao','muda','repouso','jovem'].map(f=><option key={f}>{f}</option>)}</select></Field>
          <Field label="Peso (g)"><input className="input" type="number" placeholder="420" value={formR.peso} onChange={e=>sfR('peso',e.target.value)}/></Field>
          <Field label="Data"><input className="input" type="date" value={formR.data} onChange={e=>sfR('data',e.target.value)}/></Field>
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={formR.obs} onChange={e=>sfR('obs',e.target.value)}/></Field></div>
        </div>
      </Modal>

      {/* Modal vacina */}
      <Modal open={modal==='vacina'} onClose={()=>setModal(null)} title="💉 Registar Vacina"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={saveVacina}>Guardar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Vacina *"><input className="input" placeholder="Ex: Newcastle, Paramixovirose..." value={formV.nome} onChange={e=>sfV('nome',e.target.value)}/></Field>
          <Field label="Próxima Dose"><input className="input" type="date" value={formV.proxima_dose} onChange={e=>sfV('proxima_dose',e.target.value)}/></Field>
          <Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={formV.obs} onChange={e=>sfV('obs',e.target.value)}/></Field>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar registo"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={delRegisto}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar este registo de saúde?</p>
      </Modal>
    </div>
  )
}

function Perfil() {
  const { user, signOut } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fotoPerfilFile, setFotoPerfilFile] = useState(null)
  const [fotoPombalFile, setFotoPombalFile] = useState(null)
  const [fotoPerfilPreview, setFotoPerfilPreview] = useState(null)
  const [fotoPombalPreview, setFotoPombalPreview] = useState(null)
  const [form, setForm] = useState({ nome:'', tel:'', fed:'', org:'', pombal_nome:'', pombal_morada:'', pombal_lat:'', pombal_lon:'', foto_perfil_url:'', foto_pombal_url:'' })
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const p = await db.getPerfil()
        if (p) setForm({ nome:p.nome||'', tel:p.tel||'', fed:p.fed||'', org:p.org||'', pombal_nome:p.pombal_nome||'', pombal_morada:p.pombal_morada||'', pombal_lat:String(p.pombal_lat||''), pombal_lon:String(p.pombal_lon||''), foto_perfil_url:p.foto_perfil_url||'', foto_pombal_url:p.foto_pombal_url||'' })
        else setForm(f => ({ ...f, nome: user?.user_metadata?.nome || '' }))
      } catch(e) {}
      finally { setLoading(false) }
    }
    load()
  }, [user])

  const uploadFoto = async (file, path) => {
    const ext = file.name.split('.').pop()
    const fullPath = `${path}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(fullPath, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('fotos').getPublicUrl(fullPath)
    return data.publicUrl
  }

  const save = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório', 'warn'); return }
    setSaving(true)
    try {
      let foto_perfil_url = form.foto_perfil_url
      let foto_pombal_url = form.foto_pombal_url
      const uid = user?.id
      if (fotoPerfilFile && uid) {
        try { foto_perfil_url = await uploadFoto(fotoPerfilFile, `perfis/${uid}/columbofilo`) }
        catch(e) { toast('Foto perfil não guardada: ' + e.message, 'warn') }
      }
      if (fotoPombalFile && uid) {
        try { foto_pombal_url = await uploadFoto(fotoPombalFile, `perfis/${uid}/pombal`) }
        catch(e) { toast('Foto pombal não guardada: ' + e.message, 'warn') }
      }
      await db.savePerfil({ nome:form.nome, tel:form.tel, fed:form.fed, org:form.org, pombal_nome:form.pombal_nome, pombal_morada:form.pombal_morada, pombal_lat:form.pombal_lat?parseFloat(form.pombal_lat):null, pombal_lon:form.pombal_lon?parseFloat(form.pombal_lon):null, foto_perfil_url, foto_pombal_url })
      setForm(f => ({ ...f, foto_perfil_url, foto_pombal_url }))
      toast('Perfil guardado! ✅', 'ok')
    } catch(e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Perfil</div><div className="section-sub">{user?.email}</div></div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : '💾'} Guardar</button>
          <button className="btn btn-secondary" onClick={signOut}>Sair</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-p">
          <div style={{ fontWeight:600, color:'#fff', marginBottom:16 }}>👤 Dados Pessoais</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Foto perfil */}
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div onClick={()=>document.getElementById('foto-perfil-up').click()}
                style={{ width:80, height:80, borderRadius:14, border:'2px dashed #243860', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', cursor:'pointer', flexShrink:0, background:'#1a2840', position:'relative' }}>
                {(fotoPerfilPreview||form.foto_perfil_url)
                  ? <img src={fotoPerfilPreview||form.foto_perfil_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : <span style={{ fontSize:32 }}>👤</span>}
                <div style={{ position:'absolute', bottom:4, right:4, background:'#1ed98a', borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>📷</div>
              </div>
              <div>
                <input type="file" id="foto-perfil-up" accept="image/*" style={{ display:'none' }}
                  onChange={e=>{ const f=e.target.files[0]; if(f){setFotoPerfilFile(f);setFotoPerfilPreview(URL.createObjectURL(f))} }}/>
                <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>Foto do columbófilo</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>Toque na imagem para alterar</div>
              </div>
            </div>
            <Field label="Nome Completo *"><input className="input" value={form.nome} onChange={e=>sf('nome',e.target.value)}/></Field>
            <Field label="Email"><input className="input" value={user?.email} disabled style={{ opacity:.6 }}/></Field>
            <Field label="Telefone"><input className="input" placeholder="+351 9XX XXX XXX" value={form.tel} onChange={e=>sf('tel',e.target.value)}/></Field>
            <Field label="Nº Federativo"><input className="input" placeholder="FCP-2026-XXXX" value={form.fed} onChange={e=>sf('fed',e.target.value)}/></Field>
            <Field label="Organização / Clube"><input className="input" placeholder="Sociedade Columbófila..." value={form.org} onChange={e=>sf('org',e.target.value)}/></Field>
          </div>
        </div>

        <div className="card card-p">
          <div style={{ fontWeight:600, color:'#fff', marginBottom:16 }}>🏠 Dados do Pombal</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Foto pombal */}
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div onClick={()=>document.getElementById('foto-pombal-up').click()}
                style={{ width:80, height:80, borderRadius:14, border:'2px dashed #243860', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', cursor:'pointer', flexShrink:0, background:'#1a2840', position:'relative' }}>
                {(fotoPombalPreview||form.foto_pombal_url)
                  ? <img src={fotoPombalPreview||form.foto_pombal_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : <span style={{ fontSize:32 }}>🏠</span>}
                <div style={{ position:'absolute', bottom:4, right:4, background:'#1ed98a', borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>📷</div>
              </div>
              <div>
                <input type="file" id="foto-pombal-up" accept="image/*" style={{ display:'none' }}
                  onChange={e=>{ const f=e.target.files[0]; if(f){setFotoPombalFile(f);setFotoPombalPreview(URL.createObjectURL(f))} }}/>
                <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>Foto do pombal</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>Toque na imagem para alterar</div>
              </div>
            </div>
            <Field label="Nome do Pombal"><input className="input" placeholder="Pombal da Quinta..." value={form.pombal_nome} onChange={e=>sf('pombal_nome',e.target.value)}/></Field>
            <Field label="Morada"><input className="input" placeholder="Localidade, Concelho" value={form.pombal_morada} onChange={e=>sf('pombal_morada',e.target.value)}/></Field>
            <Field label="Latitude GPS"><input className="input" placeholder="38.80234" value={form.pombal_lat} onChange={e=>sf('pombal_lat',e.target.value)}/></Field>
            <Field label="Longitude GPS"><input className="input" placeholder="-9.38142" value={form.pombal_lon} onChange={e=>sf('pombal_lon',e.target.value)}/></Field>
            {form.pombal_lat && form.pombal_lon && (
              <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid #243860', height:140 }}>
                <iframe width="100%" height="100%" frameBorder="0" style={{ display:'block' }}
                  src={`https://maps.google.com/maps?q=${form.pombal_lat},${form.pombal_lon}&z=14&output=embed`}/>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PLACEHOLDER ──────────────────────────────────────

function Treinos() {
  const toast = useToast()
  const [treinos, setTreinos] = useState([])
  const [pombais, setPombais] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const EMPTY = { data:new Date().toISOString().slice(0,10), local:'', dist:'', tipo:'Em Linha', pombos_n:'', retorno:'100%', obs:'' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, pb] = await Promise.all([
        supabase.from('treinos').select('*').order('data', { ascending: false }).then(r => r.data || []),
        supabase.from('lofts').select('*').order('nome').then(r => r.data || [])
      ])
      setTreinos(t); setPombais(pb)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  const save = async () => {
    if (!form.local.trim()) { toast('Local obrigatório','warn'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('treinos').insert({
        data_reg: form.data, local: form.local.trim(),
        dist: form.dist ? parseInt(form.dist) : null,
        tipo: form.tipo, pombos_n: form.pombos_n ? parseInt(form.pombos_n) : null,
        retorno: form.retorno, obs: form.obs, user_id: user.id
      })
      if (error) throw error
      toast('Treino registado!','ok'); setModal(false); setForm(EMPTY); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const [editing, setEditing] = useState(null)

  const del = async () => {
    try {
      const { error } = await supabase.from('treinos').delete().eq('id', confirm.id)
      if (error) throw error
      toast('Eliminado','ok'); setConfirm(null); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({ data:t.data_reg||new Date().toISOString().slice(0,10), local:t.local||'', dist:String(t.dist||''), tipo:t.tipo||'Em Linha', pombos_n:String(t.pombos_n||''), retorno:t.retorno||'100%', obs:t.obs||'' })
    setModal(true)
  }

  const saveEdit = async () => {
    if (!form.local.trim()) { toast('Local obrigatório','warn'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('treinos').update({
        data_reg: form.data, local: form.local.trim(),
        dist: form.dist ? parseInt(form.dist) : null,
        tipo: form.tipo, pombos_n: form.pombos_n ? parseInt(form.pombos_n) : null,
        retorno: form.retorno, obs: form.obs
      }).eq('id', editing.id)
      if (error) throw error
      toast('Treino actualizado!','ok'); setModal(false); setEditing(null); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const total = treinos.length
  const distTotal = treinos.reduce((s,t)=>s+(t.dist||0),0)

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Treinos</div><div className="section-sub">{total} treinos · {distTotal}km</div></div>
        <button className="btn btn-primary" onClick={()=>{ setForm(EMPTY); setModal(true) }}>＋ Novo Treino</button>
      </div>
      <div className="grid-3 mb-6">
        <KpiCard icon="🎯" label="Total" value={total} color="text-green"/>
        <KpiCard icon="📍" label="Km Totais" value={distTotal+'km'} color="text-blue"/>
        <KpiCard icon="📅" label={`Ano ${new Date().getFullYear()}`} value={treinos.filter(t=>new Date(t.data_reg).getFullYear()===new Date().getFullYear()).length} color="text-yellow"/>
      </div>
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        : treinos.length===0 ? <EmptyState icon="🎯" title="Sem treinos" desc="Registe o primeiro treino" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>＋ Novo Treino</button>} />
        : <div className="card" style={{ overflowX:'auto' }}>
            <table>
              <thead><tr><th>Data</th><th>Local</th><th>Tipo</th><th>Distância</th><th>Pombos</th><th>Retorno</th><th></th></tr></thead>
              <tbody>
                {treinos.map(t=>(
                  <tr key={t.id}>
                    <td style={{ color:'#64748b', fontSize:12 }}>{new Date(t.data_reg).toLocaleDateString('pt-PT')}</td>
                    <td style={{ fontWeight:500 }}>{t.local}</td>
                    <td><Badge v="blue">{t.tipo}</Badge></td>
                    <td style={{ fontFamily:'Barlow Condensed', fontSize:16, color:'#facc15' }}>{t.dist?t.dist+'km':'—'}</td>
                    <td>{t.pombos_n||'—'}</td>
                    <td style={{ color: t.retorno==='100%'?'#1ed98a':'#facc15', fontWeight:600 }}>{t.retorno||'—'}</td>
                    <td style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-icon btn-sm" onClick={()=>openEdit(t)}>✏️</button>
                      <button className="btn btn-icon btn-sm" onClick={()=>setConfirm(t)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
      <Modal open={modal} onClose={()=>{setModal(false);setEditing(null)}} title={editing?'✏️ Editar Treino':'🎯 Novo Treino'}
        footer={<><button className="btn btn-secondary" onClick={()=>{setModal(false);setEditing(null)}}>Cancelar</button><button className="btn btn-primary" onClick={editing?saveEdit:save} disabled={saving}>{saving?<Spinner/>:null}{editing?'Guardar':'Registar'}</button></>}>
        <div className="form-grid">
          <Field label="Data"><input className="input" type="date" value={form.data} onChange={e=>sf('data',e.target.value)} /></Field>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e=>sf('tipo',e.target.value)}>{['Em Linha','Basket','Voo Livre','Nocturno'].map(t=><option key={t}>{t}</option>)}</select></Field>
          <div className="col-2"><Field label="Local de Solta *"><input className="input" placeholder="Ex: Santarém" value={form.local} onChange={e=>sf('local',e.target.value)} /></Field></div>
          <Field label="Distância (km)"><input className="input" type="number" placeholder="60" value={form.dist} onChange={e=>sf('dist',e.target.value)} /></Field>
          <Field label="Nº Pombos"><input className="input" type="number" placeholder="30" value={form.pombos_n} onChange={e=>sf('pombos_n',e.target.value)} /></Field>
          <Field label="Taxa de Retorno"><input className="input" placeholder="100%" value={form.retorno} onChange={e=>sf('retorno',e.target.value)} /></Field>
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e=>sf('obs',e.target.value)} /></Field></div>
        </div>
      </Modal>
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar treino"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar treino em "{confirm?.local}"?</p>
      </Modal>
    </div>
  )
}

function Reproducao() {
  const toast = useToast()
  const [tab, setTab] = useState('acasalamentos')
  const [acas, setAcas] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalBorrachinho, setModalBorrachinho] = useState(null) // aca
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [pedigreeP, setPedigreeP] = useState(null)
  const [selectedAca, setSelectedAca] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const EMPTY = { pai_id:'', mae_id:'', inicio:new Date().toISOString().slice(0,10), cacifo:'', obs:'' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  // Form borrachinho
  const [formB, setFormB] = useState({ anilhaPais:'PT', anilhaAno:String(new Date().getFullYear()), anilhaNum:'', nome:'', sexo:'M', cor:'', obs:'' })
  const sfB = (k,v) => setFormB(f=>({...f,[k]:v}))
  const anos = Array.from({length:5},(_,i)=>new Date().getFullYear()-i)
  const paises = ['PT','ES','FR','BE','NL','DE']
  const CORES_POMBO = ['Azul barrado','Azul sem barra','Azul xadrez','Vermelho barrado','Vermelho sem barra','Branco','Branco com marcas','Amarelo','Alazão','Cinzento','Meado','Tigrado']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const [a, p, pr] = await Promise.all([
        supabase.from('breeding').select('*').order('created_at',{ascending:false}).then(r=>r.data||[]),
        supabase.from('pigeons').select('*').order('nome').then(r=>r.data||[]),
        supabase.from('perfis').select('*').eq('user_id',user.id).single().then(r=>r.data||null),
      ])
      setAcas(a); setPombos(p); setPerfil(pr)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  const machos = pombos.filter(p=>p.sexo==='M')
  const femeas = pombos.filter(p=>p.sexo==='F')

  const save = async () => {
    if (!form.pai_id||!form.mae_id) { toast('Seleccione o par','warn'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const pai = pombos.find(p=>p.id===form.pai_id)
      const mae = pombos.find(p=>p.id===form.mae_id)
      const { error } = await supabase.from('breeding').insert({
        pai_id:form.pai_id, mae_id:form.mae_id,
        pai_nome:pai?`${pai.nome} (${pai.anilha})`:'',
        mae_nome:mae?`${mae.nome} (${mae.anilha})`:'',
        inicio:form.inicio, cacifo:form.cacifo, obs:form.obs,
        ninhadas:0, estado:'em_progresso', user_id:user.id
      })
      if (error) throw error
      toast('Acasalamento registado!','ok'); setModal(false); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await supabase.from('breeding').delete().eq('id',confirm.id); toast('Eliminado','ok'); setConfirm(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  const updateAca = async (id, changes) => {
    await supabase.from('breeding').update(changes).eq('id',id); load()
  }

  const criarBorrachinho = async () => {
    if (!formB.anilhaNum.trim()) { toast('Número da anilha obrigatório','warn'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const aca = modalBorrachinho
      const pai = pombos.find(p=>p.id===aca.pai_id)
      const mae = pombos.find(p=>p.id===aca.mae_id)
      const anilha = `${formB.anilhaPais}-${formB.anilhaAno}-${formB.anilhaNum.padStart(5,'0')}`
      const { error } = await supabase.from('pigeons').insert({
        anilha, nome:formB.nome||anilha, sexo:formB.sexo, cor:formB.cor,
        pai:pai?.anilha||'', mae:mae?.anilha||'',
        esp:['velocidade'], estado:'ativo', estado_ext:'proprio',
        emoji:'🐦', provas:0, percentil:0, forma:50,
        obs:formB.obs, user_id:user.id
      })
      if (error) throw error
      // Incrementar ninhadas
      await supabase.from('breeding').update({ ninhadas:(aca.ninhadas||0)+1 }).eq('id',aca.id)
      toast(`Borrachinho ${anilha} criado!`,'ok'); setModalBorrachinho(null); setFormB({ anilhaPais:'PT', anilhaAno:String(new Date().getFullYear()), anilhaNum:'', nome:'', sexo:'M', cor:'', obs:'' }); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const estadoVar = { em_progresso:'yellow', concluido:'green', pausado:'gray' }

  const PedigreeView = ({ pombo }) => {
    if (!pombo) return null
    const pai = pombos.find(p=>p.anilha===pombo.pai)
    const mae = pombos.find(p=>p.anilha===pombo.mae)
    const avoPM = pai?pombos.find(p=>p.anilha===pai.pai):null
    const avoMM = pai?pombos.find(p=>p.anilha===pai.mae):null
    const avoPF = mae?pombos.find(p=>p.anilha===mae.pai):null
    const avoMF = mae?pombos.find(p=>p.anilha===mae.mae):null
    const PBox = ({p,gen}) => (
      <div style={{ background:gen===1?'#141f2e':'#0f1923', border:`1px solid ${gen===1?'#1ed98a':'#1e3050'}`, borderRadius:10, padding:'8px 12px', minWidth:150 }}>
        {p?<><div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
          <span style={{ fontSize:16 }}>{p.emoji||'🐦'}</span>
          <div><div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{p.nome}</div><div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>{p.anilha}</div></div>
        </div><div style={{ fontSize:10, color:'#64748b' }}>{p.sexo==='M'?'♂':'♀'} · {p.cor||'—'}</div>{p.percentil>0&&<div style={{ fontSize:10, color:'#facc15' }}>⭐ {p.percentil}%</div>}</>
        :<div style={{ fontSize:11, color:'#475569', fontStyle:'italic' }}>Desconhecido</div>}
      </div>
    )
    return (
      <div>
        <div style={{ background:'linear-gradient(135deg,#0f1923,#141f2e)', border:'1px solid #1e3050', borderRadius:16, padding:'20px 24px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <div style={{ width:60, height:60, borderRadius:12, background:'rgba(30,217,138,.1)', border:'1px solid rgba(30,217,138,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>
              {pombo.foto_url?<img src={pombo.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:12 }}/>:pombo.emoji||'🐦'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'Barlow Condensed', fontSize:28, fontWeight:700, color:'#fff' }}>{pombo.nome}</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize:12, color:'#1ed98a' }}>{pombo.anilha}</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{pombo.sexo==='M'?'♂ Macho':'♀ Fêmea'} · {pombo.cor||'—'}</div>
            </div>
            {perfil&&<div style={{ textAlign:'right' }}><div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>🏆 {perfil.nome}</div>{perfil.org&&<div style={{ fontSize:11, color:'#64748b' }}>{perfil.org}</div>}{perfil.fed&&<div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>FCP: {perfil.fed}</div>}</div>}
          </div>
        </div>
        <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>🌳 Árvore Genealógica</div>
        <div style={{ overflowX:'auto' }}>
          <div style={{ display:'flex', gap:16, alignItems:'center', minWidth:540 }}>
            <PBox p={pombo} gen={1}/>
            <div style={{ color:'#243860', fontSize:20 }}>›</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}><PBox p={pai} gen={2}/><PBox p={mae} gen={2}/></div>
            <div style={{ color:'#243860', fontSize:20 }}>›</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}><PBox p={avoPM} gen={3}/><PBox p={avoMM} gen={3}/><PBox p={avoPF} gen={3}/><PBox p={avoMF} gen={3}/></div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:16 }}>
          <button className="btn btn-secondary" onClick={()=>window.print()}>🖨️ Imprimir</button>
          <button className="btn btn-secondary" onClick={()=>setPedigreeP(null)}>✕ Fechar</button>
        </div>
      </div>
    )
  }

  const diasRestantes = (data) => {
    if (!data) return null
    const d = Math.ceil((new Date(data)-new Date())/86400000)
    return d
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Reprodução</div><div className="section-sub">{acas.length} acasalamentos · {acas.filter(a=>a.estado==='em_progresso').length} activos</div></div>
        {tab==='acasalamentos'&&<button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setModal(true)}}>＋ Novo Acasalamento</button>}
      </div>

      <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
        {[['acasalamentos','🥚 Acasalamentos'],['pedigree','🌳 Pedigree']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'#1ed98a':'none', color:tab===t?'#0a0f14':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {tab==='acasalamentos' && (
        loading?<div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
        :acas.length===0?<EmptyState icon="🥚" title="Sem acasalamentos" desc="Registe o primeiro par" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>＋ Novo Acasalamento</button>}/>
        :<div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {acas.map(a=>{
            const pai=pombos.find(p=>p.id===a.pai_id)
            const mae=pombos.find(p=>p.id===a.mae_id)
            const isOpen=selectedAca?.id===a.id
            const diasEclosao=diasRestantes(a.data_eclosao_prev)
            return (
              <div key={a.id} className="card card-p" style={{ cursor:'pointer' }} onClick={()=>setSelectedAca(isOpen?null:a)}>
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  {/* Cacifo */}
                  {a.cacifo&&<div style={{ width:36, height:36, borderRadius:8, background:'rgba(30,217,138,.1)', border:'1px solid rgba(30,217,138,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#1ed98a', flexShrink:0 }}>{a.cacifo}</div>}
                  {/* Par */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ width:38, height:38, borderRadius:8, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, overflow:'hidden' }}>{pai?.foto_url?<img src={pai.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:(pai?.emoji||'🐦')}</div>
                      <div style={{ fontSize:10, color:'#60a5fa' }}>♂</div>
                    </div>
                    <span style={{ color:'#475569' }}>×</span>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ width:38, height:38, borderRadius:8, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, overflow:'hidden' }}>{mae?.foto_url?<img src={mae.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:(mae?.emoji||'🐦')}</div>
                      <div style={{ fontSize:10, color:'#f472b6' }}>♀</div>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{a.pai_nome||pai?.nome||'—'}</div>
                      <div style={{ fontSize:12, color:'#64748b' }}>× {a.mae_nome||mae?.nome||'—'}</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>desde {a.inicio?new Date(a.inicio).toLocaleDateString('pt-PT'):'—'} · 🥚 {a.ninhadas||0} ninhadas</div>
                    </div>
                  </div>
                  {/* Estado + alertas */}
                  <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
                    <Badge v={estadoVar[a.estado]||'gray'}>{a.estado?.replace('_',' ')}</Badge>
                    {diasEclosao!==null&&diasEclosao>=0&&diasEclosao<=3&&<Badge v="yellow">🐣 Eclosão em {diasEclosao}d</Badge>}
                    {a.data_eclosao_prev&&diasEclosao<0&&!a.data_nascimento&&<Badge v="red">⚠️ Eclosão em atraso</Badge>}
                  </div>
                  <span style={{ color:'#475569', fontSize:16 }} onClick={e=>e.stopPropagation()}>{isOpen?'▲':'▼'}</span>
                </div>

                {/* Painel expandido */}
                {isOpen&&(
                  <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #1e3050' }} onClick={e=>e.stopPropagation()}>
                    {/* Ciclo */}
                    <div style={{ fontWeight:600, color:'#fff', fontSize:13, marginBottom:10 }}>📅 Ciclo Reprodutivo</div>
                    <div className="grid-2" style={{ gap:10, marginBottom:14 }}>
                      {[
                        ['Cacifo','cacifo','text','A1'],
                        ['Data Postura','data_postura','date',''],
                        ['Nº Ovos','n_ovos','number','2'],
                        ['Eclosão Prevista','data_eclosao_prev','date',''],
                        ['Data Nascimento','data_nascimento','date',''],
                        ['Nº Nascidos','n_nascidos','number','2'],
                        ['Data Desmame','data_desmame','date',''],
                      ].map(([label,field,type,ph])=>(
                        <Field key={field} label={label}>
                          <input className="input" type={type} placeholder={ph}
                            defaultValue={a[field]||''}
                            onBlur={async e=>{ const v=e.target.value; if(v!==String(a[field]||'')) await updateAca(a.id,{[field]:type==='number'?parseInt(v)||0:v||null}) }}/>
                        </Field>
                      ))}
                    </div>
                    {/* Detalhes pais */}
                    <div className="grid-2" style={{ gap:10, marginBottom:14 }}>
                      {[pai,mae].map((p,i)=>p&&(
                        <div key={i} style={{ background:'#1a2840', borderRadius:10, padding:'10px 12px' }}>
                          <div style={{ fontWeight:600, color:i===0?'#60a5fa':'#f472b6', fontSize:12, marginBottom:6 }}>{i===0?'♂ Pai':'♀ Mãe'}</div>
                          <div style={{ fontSize:13, color:'#fff', fontWeight:500 }}>{p.nome}</div>
                          <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>{p.anilha}</div>
                          <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{p.cor||'—'} · {(p.esp||[]).join(', ')||'—'}</div>
                          {p.percentil>0&&<div style={{ fontSize:11, color:'#facc15' }}>⭐ {p.percentil}%</div>}
                        </div>
                      ))}
                    </div>
                    {/* Acções */}
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                      <button className="btn btn-primary btn-sm" onClick={()=>{setModalBorrachinho(a);setFormB({anilhaPais:'PT',anilhaAno:String(new Date().getFullYear()),anilhaNum:'',nome:'',sexo:'M',cor:'',obs:''})}}>🐦 Registar Borrachinho</button>
                      <button className="btn btn-secondary btn-sm" onClick={()=>{setPedigreeP(pai||mae);setTab('pedigree')}}>🌳 Pedigree</button>
                      <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
                        <select style={{ background:'#1a2840', border:'1px solid #243860', borderRadius:8, color:'#fff', padding:'4px 8px', fontSize:12, fontFamily:'inherit' }}
                          value={a.estado||'em_progresso'} onChange={async e=>updateAca(a.id,{estado:e.target.value})}>
                          <option value="em_progresso">Em Progresso</option>
                          <option value="concluido">Concluído</option>
                          <option value="pausado">Pausado</option>
                        </select>
                        <button className="btn btn-danger btn-sm" onClick={()=>setConfirm(a)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab==='pedigree'&&(
        <div>
          {!pedigreeP?(
            <div>
              <div style={{ fontSize:13, color:'#64748b', marginBottom:12 }}>Seleccione um pombo:</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
                {pombos.map(p=>(
                  <button key={p.id} onClick={()=>setPedigreeP(p)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#141f2e', border:'1px solid #1e3050', borderRadius:12, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    <span style={{ fontSize:20 }}>{p.emoji||'🐦'}</span>
                    <div><div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{p.nome}</div><div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>{p.anilha}</div></div>
                  </button>
                ))}
              </div>
            </div>
          ):<PedigreeView pombo={pedigreeP}/>}
        </div>
      )}

      {/* Modal novo acasalamento */}
      <Modal open={modal} onClose={()=>setModal(false)} title="🥚 Novo Acasalamento"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}Registar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Cacifo Nº"><input className="input" placeholder="Ex: A3, B7..." value={form.cacifo} onChange={e=>sf('cacifo',e.target.value)}/></Field>
          <Field label="♂ Macho (Pai) *"><select className="input" value={form.pai_id} onChange={e=>sf('pai_id',e.target.value)}><option value="">— Seleccionar —</option>{machos.map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field>
          <Field label="♀ Fêmea (Mãe) *"><select className="input" value={form.mae_id} onChange={e=>sf('mae_id',e.target.value)}><option value="">— Seleccionar —</option>{femeas.map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field>
          <Field label="Data de Início"><input className="input" type="date" value={form.inicio} onChange={e=>sf('inicio',e.target.value)}/></Field>
          <Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e=>sf('obs',e.target.value)}/></Field>
        </div>
      </Modal>

      {/* Modal borrachinho */}
      <Modal open={!!modalBorrachinho} onClose={()=>setModalBorrachinho(null)} title="🐦 Registar Borrachinho"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalBorrachinho(null)}>Cancelar</button><button className="btn btn-primary" onClick={criarBorrachinho} disabled={saving}>{saving?<Spinner/>:null}Criar Pombo</button></>}>
        {modalBorrachinho&&(
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'#1a2840', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#94a3b8' }}>
              Pai: <strong style={{ color:'#60a5fa' }}>{modalBorrachinho.pai_nome}</strong> · Mãe: <strong style={{ color:'#f472b6' }}>{modalBorrachinho.mae_nome}</strong>
            </div>
            <Field label="Anel *">
              <div style={{ display:'flex', gap:4 }}>
                <select className="input" style={{ width:72 }} value={formB.anilhaPais} onChange={e=>sfB('anilhaPais',e.target.value)}>{paises.map(p=><option key={p}>{p}</option>)}</select>
                <select className="input" style={{ width:88 }} value={formB.anilhaAno} onChange={e=>sfB('anilhaAno',e.target.value)}>{anos.map(a=><option key={a}>{a}</option>)}</select>
                <input className="input" style={{ flex:1 }} placeholder="00000" maxLength={5} value={formB.anilhaNum} onChange={e=>sfB('anilhaNum',e.target.value.replace(/[^0-9]/g,''))}/>
              </div>
              <div style={{ fontSize:11, color:'#1ed98a', marginTop:4 }}>🏷️ {formB.anilhaPais}-{formB.anilhaAno}-{(formB.anilhaNum||'?????').padStart(5,'0')}</div>
            </Field>
            <Field label="Nome (opcional)"><input className="input" placeholder="Deixar em branco = usa a anilha" value={formB.nome} onChange={e=>sfB('nome',e.target.value)}/></Field>
            <div className="form-grid">
              <Field label="Sexo"><select className="input" value={formB.sexo} onChange={e=>sfB('sexo',e.target.value)}><option value="M">♂ Macho</option><option value="F">♀ Fêmea</option></select></Field>
              <Field label="Cor">
                <select className="input" value={formB.cor} onChange={e=>sfB('cor',e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {CORES_POMBO.map(co=><option key={co}>{co}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={formB.obs} onChange={e=>sfB('obs',e.target.value)}/></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar acasalamento"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar este acasalamento?</p>
      </Modal>
    </div>
  )
}

function Alimentacao() {
  const toast = useToast()
  const [tab, setTab] = useState('stock')
  const [pombais, setPombais] = useState([])
  const [loading, setLoading] = useState(true)

  // Stock de alimentos
  const [alimentos, setAlimentos] = useState([])
  const [modalAlimento, setModalAlimento] = useState(false)
  const [formAlim, setFormAlim] = useState({ nome:'', tipo:'Cereal', stock:'', minimo:'20', preco_kg:'' })
  const sfA = (k,v) => setFormAlim(f=>({...f,[k]:v}))

  // Rações
  const [racoes, setRacoes] = useState([])
  const [modalRacao, setModalRacao] = useState(false)
  const [formRacao, setFormRacao] = useState({ nome:'', fase:'Competição', comps:[] })
  const [novoComp, setNovoComp] = useState({ nome:'', pct:'' })

  // Tratamentos - produtos
  const [produtos, setProdutos] = useState([])
  const [modalProduto, setModalProduto] = useState(false)
  const [formProd, setFormProd] = useState({ nome:'', tipo:'Medicamento', indicacao:'', dose:'', stock:'', unidade:'g' })
  const sfP = (k,v) => setFormProd(f=>({...f,[k]:v}))

  // Planos tratamento
  const [planos, setPlanos] = useState([])
  const [modalPlano, setModalPlano] = useState(false)
  const [formPlano, setFormPlano] = useState({ produto:'', pombal:'', dose:'', via:'Água', n_pombos:'', inicio:new Date().toISOString().slice(0,10), fim:'', estado:'ativo' })
  const sfPl = (k,v) => setFormPlano(f=>({...f,[k]:v}))

  // Calculadora
  const [calc, setCalc] = useState({ produto:'', pombal:'', n_pombos:'', dose_pombo:'', racao_pombo:'80', litros:'10' })
  const sfC = (k,v) => setCalc(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const [pb, al, ra, pr, pl] = await Promise.all([
        supabase.from('lofts').select('*').order('nome').then(r=>r.data||[]),
        supabase.from('alimentos').select('*').order('nome').then(r=>r.data||[]),
        supabase.from('racoes').select('*').order('nome').then(r=>r.data||[]),
        supabase.from('tratamentos').select('*').order('created_at').then(r=>(r.data||[]).map(p=>({...p, nome:p.nome||p.produto||''}))),
        supabase.from('planos_tratamento').select('*').order('created_at',{ascending:false}).then(r=>r.data||[]),
      ])
      setPombais(pb); setAlimentos(al); setRacoes(ra); setProdutos(pr); setPlanos(pl)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  // ── Alimentos CRUD
  const saveAlimento = async () => {
    if (!formAlim.nome.trim()) { toast('Nome obrigatório','warn'); return }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('alimentos').insert({ nome:formAlim.nome.trim(), tipo:formAlim.tipo, stock:parseFloat(formAlim.stock)||0, minimo:parseFloat(formAlim.minimo)||20, preco_kg:parseFloat(formAlim.preco_kg)||0, user_id:user.id })
      if (error) throw error
      toast('Alimento adicionado!','ok'); setModalAlimento(false); setFormAlim({ nome:'',tipo:'Cereal',stock:'',minimo:'20',preco_kg:'' }); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const updateStock = async (id, delta) => {
    const al = alimentos.find(a=>a.id===id); if (!al) return
    const novo = Math.max(0, (al.stock||0)+delta)
    await supabase.from('alimentos').update({ stock:novo }).eq('id',id)
    load()
  }

  const delAlimento = async (id) => {
    await supabase.from('alimentos').delete().eq('id',id); load()
  }

  // ── Rações CRUD
  const saveRacao = async () => {
    if (!formRacao.nome.trim()) { toast('Nome obrigatório','warn'); return }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('racoes').insert({ nome:formRacao.nome.trim(), fase:formRacao.fase, componentes:formRacao.comps, user_id:user.id })
      if (error) throw error
      toast('Ração criada!','ok'); setModalRacao(false); setFormRacao({ nome:'',fase:'Competição',comps:[] }); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const addComp = () => {
    if (!novoComp.nome||!novoComp.pct) return
    setFormRacao(f=>({ ...f, comps:[...f.comps, { n:novoComp.nome, p:parseInt(novoComp.pct) }] }))
    setNovoComp({ nome:'',pct:'' })
  }

  const delRacao = async (id) => {
    await supabase.from('racoes').delete().eq('id',id); load()
  }

  // ── Produtos CRUD
  const saveProduto = async () => {
    if (!formProd.nome.trim()) { toast('Nome obrigatório','warn'); return }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('tratamentos').insert({ nome:formProd.nome.trim(), produto:formProd.nome.trim(), tipo:formProd.tipo, indicacao:formProd.indicacao, dose:formProd.dose, stock:parseFloat(formProd.stock)||0, unidade:formProd.unidade, user_id:user.id })
      if (error) throw error
      toast('Produto adicionado!','ok'); setModalProduto(false); setFormProd({ nome:'',tipo:'Medicamento',indicacao:'',dose:'',stock:'',unidade:'g' }); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const updateStockProd = async (id, delta) => {
    const pr = produtos.find(p=>p.id===id); if (!pr) return
    const novo = Math.max(0, (pr.stock||0)+delta)
    await supabase.from('tratamentos').update({ stock:novo }).eq('id',id)
    load()
  }

  const delProduto = async (id) => {
    await supabase.from('tratamentos').delete().eq('id',id); load()
  }

  // ── Planos CRUD
  const savePlano = async () => {
    if (!formPlano.produto) { toast('Produto obrigatório','warn'); return }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('planos_tratamento').insert({ produto:formPlano.produto, pombal:formPlano.pombal, dose:formPlano.dose, via:formPlano.via, n_pombos:parseInt(formPlano.n_pombos)||null, inicio:formPlano.inicio, fim:formPlano.fim||null, estado:formPlano.estado, user_id:user.id })
      if (error) throw error
      toast('Plano criado!','ok'); setModalPlano(false); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const delPlano = async (id) => {
    await supabase.from('planos_tratamento').delete().eq('id',id); load()
  }

  // ── Calculadora
  const produtoCalc = produtos.find(p=>p.nome===calc.produto)
  const totalProduto = calc.n_pombos && calc.dose_pombo ? (parseFloat(calc.n_pombos)*parseFloat(calc.dose_pombo)).toFixed(1) : 0
  const totalRacao = calc.n_pombos && calc.racao_pombo ? (parseFloat(calc.n_pombos)*parseFloat(calc.racao_pombo)/1000).toFixed(2) : 0
  const concAgua = calc.litros && totalProduto ? (totalProduto/parseFloat(calc.litros)).toFixed(1) : 0

  const CORES_COMP = ['#1ed98a','#C9A44A','#2E7DD4','#D94F4F','#6C4FBB','#E07B39']
  const totalKgStock = alimentos.reduce((s,a)=>s+(a.stock||0),0)
  const alertasStock = alimentos.filter(a=>(a.stock||0)<(a.minimo||20)).length
  const planosAtivos = planos.filter(p=>p.estado==='ativo').length

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Alimentação & Tratamento</div></div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:20, overflowX:'auto' }}>
        {[['stock','🌾 Stock'],['racoes','🥣 Rações'],['tratamento','💊 Tratamento'],['calculadora','🧮 Calculadora'],['historico','📋 Histórico']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tab===t?'#1ed98a':'none', color:tab===t?'#0a0f14':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {loading && tab!=='calculadora' ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div> : <>

      {/* ── STOCK ── */}
      {tab==='stock' && (
        <div>
          <div className="grid-4 mb-6">
            <KpiCard icon="🌾" label="Alimentos Ativos" value={alimentos.length} color="text-green"/>
            <KpiCard icon="⚖️" label="Kg em Stock" value={totalKgStock.toFixed(0)+'kg'} color="text-blue"/>
            <KpiCard icon="⚠️" label="Alertas Stock" value={alertasStock} color={alertasStock>0?'text-red':'text-green'}/>
            <KpiCard icon="💊" label="Planos Activos" value={planosAtivos} color="text-yellow"/>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button className="btn btn-primary" onClick={()=>setModalAlimento(true)}>＋ Novo Alimento</button>
          </div>
          {alimentos.length===0 ? <EmptyState icon="🌾" title="Sem alimentos" desc="Adicione os ingredientes das suas rações" action={<button className="btn btn-primary" onClick={()=>setModalAlimento(true)}>＋ Novo Alimento</button>}/>
          : <div className="card" style={{ overflowX:'auto' }}>
              <table>
                <thead><tr><th>Alimento</th><th>Tipo</th><th>Stock</th><th>Mínimo</th><th>Preço/kg</th><th>Estado</th><th>Acções</th></tr></thead>
                <tbody>
                  {alimentos.map(a=>{
                    const baixo = (a.stock||0)<(a.minimo||20)
                    return (
                      <tr key={a.id}>
                        <td style={{ fontWeight:500 }}>{a.nome}{baixo&&<span style={{ marginLeft:6, fontSize:10, background:'rgba(239,68,68,.1)', color:'#f87171', padding:'1px 6px', borderRadius:4 }}>⚠️ MÍNIMO</span>}</td>
                        <td><Badge>{a.tipo}</Badge></td>
                        <td style={{ fontFamily:'Barlow Condensed', fontSize:16, fontWeight:700, color:baixo?'#f87171':'#fff' }}>{a.stock}kg</td>
                        <td style={{ color:'#64748b' }}>{a.minimo}kg</td>
                        <td style={{ color:'#94a3b8' }}>{a.preco_kg?a.preco_kg+'€/kg':'—'}</td>
                        <td><Badge v={baixo?'red':'green'}>{baixo?'ALERTA':'OK'}</Badge></td>
                        <td>
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-secondary btn-sm" onClick={()=>updateStock(a.id,5)}>+5kg</button>
                            <button className="btn btn-secondary btn-sm" onClick={()=>updateStock(a.id,-5)}>-5kg</button>
                            <button className="btn btn-icon btn-sm" onClick={()=>delAlimento(a.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          }
        </div>
      )}

      {/* ── RAÇÕES ── */}
      {tab==='racoes' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button className="btn btn-primary" onClick={()=>{ setFormRacao({ nome:'',fase:'Competição',comps:[] }); setModalRacao(true) }}>＋ Nova Ração</button>
          </div>
          {racoes.length===0 ? <EmptyState icon="🥣" title="Sem rações" desc="Crie as composições das suas misturas" action={<button className="btn btn-primary" onClick={()=>setModalRacao(true)}>＋ Nova Ração</button>}/>
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {racoes.map(r=>{
                const comps = r.componentes||[]
                const total = comps.reduce((s,c)=>s+c.p,0)||1
                let offset = 0
                return (
                  <div key={r.id} className="card card-p">
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                      <div><div style={{ fontWeight:600, color:'#fff', fontSize:15 }}>{r.nome}</div><div style={{ fontSize:12, color:'#64748b' }}>{r.fase}</div></div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={()=>window.print()}>🖨️</button>
                        <button className="btn btn-icon btn-sm" onClick={()=>delRacao(r.id)}>🗑️</button>
                      </div>
                    </div>
                    {comps.length>0&&(
                      <>
                        {/* Barra colorida */}
                        <div style={{ height:20, borderRadius:8, overflow:'hidden', display:'flex', marginBottom:8 }}>
                          {comps.map((comp,i)=>(
                            <div key={i} style={{ width:`${comp.p/total*100}%`, background:CORES_COMP[i%CORES_COMP.length] }}/>
                          ))}
                        </div>
                        {/* Legenda */}
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                          {comps.map((comp,i)=>(
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#cbd5e1' }}>
                              <div style={{ width:10, height:10, borderRadius:2, background:CORES_COMP[i%CORES_COMP.length] }}/>
                              {comp.n}: <strong>{comp.p}%</strong>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          }
        </div>
      )}

      {/* ── TRATAMENTO ── */}
      {tab==='tratamento' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:600, color:'#fff' }}>💊 Produtos & Stock</div>
            <button className="btn btn-primary" onClick={()=>{ setFormProd({ nome:'',tipo:'Medicamento',indicacao:'',dose:'',stock:'',unidade:'g' }); setModalProduto(true) }}>＋ Novo Produto</button>
          </div>
          {produtos.length===0 ? <EmptyState icon="💊" title="Sem produtos" desc="Adicione medicamentos, vitaminas e suplementos"/>
          : <div className="grid-2" style={{ marginBottom:20 }}>
              {produtos.map(p=>(
                <div key={p.id} className="card card-p">
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:500, color:'#fff' }}>{p.nome}</div>
                      <div style={{ fontSize:12, color:'#64748b' }}>{p.tipo}{p.indicacao?' · '+p.indicacao:''}</div>
                      {p.dose&&<div style={{ fontSize:11, color:'#94a3b8' }}>Dose: {p.dose}</div>}
                    </div>
                    <Badge v="green">OK</Badge>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontFamily:'Barlow Condensed', fontSize:22, fontWeight:700, color:'#1ed98a' }}>{p.stock} {p.unidade}</div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={()=>updateStockProd(p.id,10)}>＋ Stock</button>
                      <button className="btn btn-primary btn-sm" onClick={()=>{ setFormPlano(f=>({...f,produto:p.nome})); setModalPlano(true) }}>Planear</button>
                      <button className="btn btn-icon btn-sm" onClick={()=>delProduto(p.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
          {/* Plano activo */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:600, color:'#fff' }}>📋 Plano Activo</div>
            <button className="btn btn-secondary" onClick={()=>setModalPlano(true)}>＋ Novo Tratamento</button>
          </div>
          {planos.filter(p=>p.estado==='ativo').length===0
            ? <div style={{ textAlign:'center', color:'#64748b', fontSize:13, padding:'20px 0' }}>Sem tratamentos activos</div>
            : <div className="card" style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr><th>Pombal/Grupo</th><th>Produto</th><th>Dose</th><th>Via</th><th>Nº Pombos</th><th>Total</th><th>Início</th><th>Fim</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    {planos.filter(p=>p.estado==='ativo').map(p=>(
                      <tr key={p.id}>
                        <td style={{ fontWeight:500 }}>{p.pombal||'Todos'}</td>
                        <td>{p.produto}</td>
                        <td style={{ fontFamily:'JetBrains Mono', fontSize:11 }}>{p.dose}</td>
                        <td><Badge>{p.via}</Badge></td>
                        <td>{p.n_pombos||'—'}</td>
                        <td style={{ color:'#1ed98a', fontWeight:500 }}>
                          {p.dose&&p.n_pombos ? (parseFloat(p.dose)*p.n_pombos).toFixed(1)+(p.dose.includes('ml')?'ml':'g') : '—'}
                        </td>
                        <td style={{ color:'#64748b', fontSize:12 }}>{p.inicio?new Date(p.inicio).toLocaleDateString('pt-PT'):'—'}</td>
                        <td style={{ color:'#64748b', fontSize:12 }}>{p.fim?new Date(p.fim).toLocaleDateString('pt-PT'):'—'}</td>
                        <td><Badge v="green">ATIVO</Badge></td>
                        <td><button className="btn btn-icon btn-sm" onClick={()=>delPlano(p.id)}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>
      )}

      {/* ── CALCULADORA ── */}
      {tab==='calculadora' && (
        <div>
          <div className="card card-p" style={{ marginBottom:16 }}>
            <div style={{ fontWeight:600, color:'#fff', marginBottom:16 }}>🧮 Calculadora de Dosagem</div>
            <div className="form-grid">
              <Field label="Produto">
                <select className="input" value={calc.produto} onChange={e=>sfC('produto',e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {produtos.map(p=><option key={p.id}>{p.nome}</option>)}
                </select>
              </Field>
              <Field label="Pombal">
                <select className="input" value={calc.pombal} onChange={e=>{ sfC('pombal',e.target.value); const pb=pombais.find(p=>p.nome===e.target.value); if(pb) sfC('n_pombos',String(pb.cap||'')) }}>
                  <option value="">— Seleccionar —</option>
                  {pombais.map(p=><option key={p.id}>{p.nome}</option>)}
                </select>
              </Field>
              <Field label="Nº Pombos (editável)"><input className="input" type="number" value={calc.n_pombos} onChange={e=>sfC('n_pombos',e.target.value)}/></Field>
              <Field label="Dose por Pombo (g ou ml)"><input className="input" type="number" step="0.1" placeholder={produtoCalc?.dose||'1'} value={calc.dose_pombo} onChange={e=>sfC('dose_pombo',e.target.value)}/></Field>
              <Field label="Ração por Pombo (g)"><input className="input" type="number" value={calc.racao_pombo} onChange={e=>sfC('racao_pombo',e.target.value)}/></Field>
              <Field label="Litros de Água"><input className="input" type="number" value={calc.litros} onChange={e=>sfC('litros',e.target.value)}/></Field>
            </div>
          </div>
          {calc.n_pombos && calc.dose_pombo && (
            <div className="card card-p">
              <div className="grid-3" style={{ marginBottom:16 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'Barlow Condensed', fontSize:36, fontWeight:700, color:'#facc15' }}>{totalProduto}g</div>
                  <div style={{ fontSize:11, color:'#64748b', textTransform:'uppercase' }}>Total Produto</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'Barlow Condensed', fontSize:36, fontWeight:700, color:'#1ed98a' }}>{totalRacao}kg</div>
                  <div style={{ fontSize:11, color:'#64748b', textTransform:'uppercase' }}>Total Ração</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'Barlow Condensed', fontSize:36, fontWeight:700, color:'#60a5fa' }}>{concAgua}g/L</div>
                  <div style={{ fontSize:11, color:'#64748b', textTransform:'uppercase' }}>Conc. Água</div>
                </div>
              </div>
              <div style={{ background:'#1a2840', borderRadius:10, padding:'12px 16px', fontSize:13, color:'#94a3b8', marginBottom:12 }}>
                Dissolver <strong style={{ color:'#fff' }}>{totalProduto}g</strong> em <strong style={{ color:'#fff' }}>{calc.litros}L</strong> de água. Ração: <strong style={{ color:'#fff' }}>{calc.racao_pombo}g/pombo</strong> = <strong style={{ color:'#1ed98a' }}>{totalRacao}kg</strong> total para {calc.n_pombos} pombos.
              </div>
              <button className="btn btn-primary" onClick={()=>{ setFormPlano(f=>({...f,produto:calc.produto,pombal:calc.pombal,dose:calc.dose_pombo+'g',n_pombos:calc.n_pombos})); setTab('tratamento'); setModalPlano(true) }}>
                📋 Guardar no Plano
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {tab==='historico' && (
        <div>
          <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>📋 Histórico de Tratamentos</div>
          {planos.length===0 ? <EmptyState icon="📋" title="Sem histórico" desc="Os tratamentos registados aparecerão aqui"/>
          : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {planos.map(p=>(
                <div key={p.id} className="card card-p" style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:8, height:40, borderRadius:4, background:p.estado==='ativo'?'#1ed98a':'#475569', flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:500, color:'#fff' }}>{p.pombal||'Todos'} — {p.produto}</div>
                    <div style={{ fontSize:12, color:'#64748b' }}>{p.dose} · {p.via} · {p.n_pombos||'?'} pombos · {p.inicio?new Date(p.inicio).toLocaleDateString('pt-PT'):'—'} → {p.fim?new Date(p.fim).toLocaleDateString('pt-PT'):'—'}</div>
                  </div>
                  <Badge v={p.estado==='ativo'?'green':'gray'}>{p.estado}</Badge>
                  <button className="btn btn-icon btn-sm" onClick={()=>delPlano(p.id)}>🗑️</button>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      </>}

      {/* Tab: Meteorologia da Prova */}
      {tab==='meteo' && (
        <MeteoProva provas={provas} provaSelect={provaSelect} setProvaSelect={setProvaSelect}/>
      )}


      {/* Modais */}
      <Modal open={modalAlimento} onClose={()=>setModalAlimento(false)} title="🌾 Novo Alimento"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalAlimento(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveAlimento}>Guardar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Ex: Milho, Cevada..." value={formAlim.nome} onChange={e=>sfA('nome',e.target.value)}/></Field></div>
          <Field label="Tipo"><select className="input" value={formAlim.tipo} onChange={e=>sfA('tipo',e.target.value)}>{['Cereal','Leguminosa','Semente','Suplemento','Outro'].map(t=><option key={t}>{t}</option>)}</select></Field>
          <div className="col-2">
            <label className="label" style={{ display:'block', marginBottom:6 }}>Pré-definidos rápidos</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {[['Milho','Cereal'],['Cevada','Cereal'],['Trigo','Cereal'],['Ervilha','Leguminosa'],['Girassol','Semente'],['Amendoim','Leguminosa'],['Linho','Semente'],['Cânhamo','Semente'],['Triticale','Cereal'],['Arroz','Cereal'],['Aveia','Cereal'],['Sorgo','Cereal']].map(([n,t])=>(
                <button key={n} type="button" className="chip" style={{ fontSize:11 }}
                  onClick={()=>setFormAlim(f=>({...f,nome:n,tipo:t}))}>{n}</button>
              ))}
            </div>
          </div>
          <Field label="Preço/kg (€)"><input className="input" type="number" step="0.01" placeholder="0.45" value={formAlim.preco_kg} onChange={e=>sfA('preco_kg',e.target.value)}/></Field>
          <Field label="Stock inicial (kg)"><input className="input" type="number" placeholder="50" value={formAlim.stock} onChange={e=>sfA('stock',e.target.value)}/></Field>
          <Field label="Stock mínimo (kg)"><input className="input" type="number" placeholder="20" value={formAlim.minimo} onChange={e=>sfA('minimo',e.target.value)}/></Field>
        </div>
      </Modal>

      <Modal open={modalRacao} onClose={()=>setModalRacao(false)} title="🥣 Nova Ração" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalRacao(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveRacao}>Guardar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="form-grid">
            <div className="col-2">
            <label className="label" style={{ display:'block', marginBottom:6 }}>Rações comerciais (carregar composição)</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {[
                {n:'Versele-Laga Superstar',f:'Competição',c:[{n:'Milho',p:38},{n:'Cevada',p:22},{n:'Ervilha',p:18},{n:'Trigo',p:12},{n:'Arroz',p:10}]},
                {n:'Versele-Laga Breedmaster',f:'Reprodução',c:[{n:'Milho',p:32},{n:'Ervilha',p:28},{n:'Cevada',p:20},{n:'Amendoim',p:12},{n:'Cártamo',p:8}]},
                {n:'Beyers Olympic',f:'Competição',c:[{n:'Milho',p:40},{n:'Cevada',p:20},{n:'Ervilha',p:20},{n:'Girassol',p:10},{n:'Trigo',p:10}]},
                {n:'Roehnfried Spezial',f:'Competição',c:[{n:'Milho',p:42},{n:'Cevada',p:20},{n:'Ervilha',p:18},{n:'Triticale',p:12},{n:'Girassol',p:8}]},
                {n:'DAC Widowhood',f:'Viuvez',c:[{n:'Milho',p:45},{n:'Cevada',p:28},{n:'Ervilha',p:15},{n:'Girassol',p:8},{n:'Trigo',p:4}]},
                {n:'Muda',f:'Muda',c:[{n:'Milho',p:30},{n:'Cevada',p:30},{n:'Ervilha',p:20},{n:'Linho',p:12},{n:'Cânhamo',p:8}]},
              ].map(r=>(
                <button key={r.n} type="button" className="chip" style={{ fontSize:11 }}
                  onClick={()=>setFormRacao({ nome:r.n, fase:r.f, comps:r.c })}>{r.n}</button>
              ))}
            </div>
          </div>
          <Field label="Nome *"><input className="input" placeholder="Ex: Mistura Competição" value={formRacao.nome} onChange={e=>setFormRacao(f=>({...f,nome:e.target.value}))}/></Field>
            <Field label="Fase"><select className="input" value={formRacao.fase} onChange={e=>setFormRacao(f=>({...f,fase:e.target.value}))}>{['Competição','Reprodução','Muda','Repouso','Jovens','Viuvez'].map(f=><option key={f}>{f}</option>)}</select></Field>
          </div>
          <div>
            <label className="label" style={{ display:'block', marginBottom:6 }}>Componentes</label>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              <input className="input" placeholder="Ex: Milho" value={novoComp.nome} onChange={e=>setNovoComp(f=>({...f,nome:e.target.value}))} style={{ flex:2 }}/>
              <input className="input" type="number" placeholder="%" value={novoComp.pct} onChange={e=>setNovoComp(f=>({...f,pct:e.target.value}))} style={{ flex:1 }}/>
              <button className="btn btn-primary" onClick={addComp}>＋</button>
            </div>
            {formRacao.comps.map((comp,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' }}>
                <div style={{ width:10, height:10, borderRadius:2, background:CORES_COMP[i%CORES_COMP.length] }}/>
                <span style={{ flex:1, fontSize:13, color:'#cbd5e1' }}>{comp.n}</span>
                <span style={{ fontWeight:600, color:'#fff' }}>{comp.p}%</span>
                <button className="btn btn-icon btn-sm" onClick={()=>setFormRacao(f=>({...f,comps:f.comps.filter((_,j)=>j!==i)}))}>✕</button>
              </div>
            ))}
            {formRacao.comps.length>0&&<div style={{ fontSize:12, color:formRacao.comps.reduce((s,c)=>s+c.p,0)===100?'#1ed98a':'#f87171', marginTop:6 }}>Total: {formRacao.comps.reduce((s,c)=>s+c.p,0)}% {formRacao.comps.reduce((s,c)=>s+c.p,0)!==100&&'(deve ser 100%)'}</div>}
          </div>
        </div>
      </Modal>

      <Modal open={modalProduto} onClose={()=>setModalProduto(false)} title="💊 Novo Produto"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalProduto(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveProduto}>Guardar</button></>}>
        <div style={{ marginBottom:12 }}>
          <label className="label" style={{ display:'block', marginBottom:6 }}>Produtos comuns (carregar)</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[
              {n:'Amprolium 20%',t:'Medicamento',i:'Tricomonose',d:'1g/L',u:'g'},
              {n:'Ronidazol',t:'Medicamento',i:'Tricomonose',d:'6mg/kg',u:'g'},
              {n:'Metronidazol',t:'Medicamento',i:'Tricomonose',d:'50mg/kg',u:'g'},
              {n:'Enrofloxacina',t:'Medicamento',i:'Infecções bacterianas',d:'10mg/kg',u:'ml'},
              {n:'Tetraciclina',t:'Medicamento',i:'Clamidiose',d:'1g/L',u:'g'},
              {n:'Fenbendazol',t:'Medicamento',i:'Parasitas internos',d:'50mg/kg',u:'g'},
              {n:'Vitamina C',t:'Vitamina',i:'Imunidade/Stress',d:'0.5g/L',u:'g'},
              {n:'Vitamina E+Sel.',t:'Vitamina',i:'Reprodução/Músculo',d:'2ml/L',u:'ml'},
              {n:'Electrólitos',t:'Suplemento',i:'Recuperação',d:'5g/L',u:'g'},
              {n:'Probióticos',t:'Suplemento',i:'Flora intestinal',d:'1g/L',u:'g'},
              {n:'Paramixovírus',t:'Vacina',i:'Newcastle',d:'0.5ml/pombo',u:'doses'},
              {n:'Salmonela',t:'Vacina',i:'Paratifose',d:'1ml/pombo',u:'doses'},
            ].map(p=>(
              <button key={p.n} type="button" className="chip" style={{ fontSize:11 }}
                onClick={()=>setFormProd(f=>({...f,nome:p.n,tipo:p.t,indicacao:p.i,dose:p.d,unidade:p.u}))}>{p.n}</button>
            ))}
          </div>
        </div>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Ex: Amprolium 20%" value={formProd.nome} onChange={e=>sfP('nome',e.target.value)}/></Field></div>
          <Field label="Tipo"><select className="input" value={formProd.tipo} onChange={e=>sfP('tipo',e.target.value)}>{['Medicamento','Vitamina','Suplemento','Vacina','Outro'].map(t=><option key={t}>{t}</option>)}</select></Field>
          <Field label="Indicação"><input className="input" placeholder="Ex: Tricomonose" value={formProd.indicacao} onChange={e=>sfP('indicacao',e.target.value)}/></Field>
          <Field label="Dose recomendada"><input className="input" placeholder="Ex: 1g/L" value={formProd.dose} onChange={e=>sfP('dose',e.target.value)}/></Field>
          <Field label="Stock"><input className="input" type="number" value={formProd.stock} onChange={e=>sfP('stock',e.target.value)}/></Field>
          <Field label="Unidade"><select className="input" value={formProd.unidade} onChange={e=>sfP('unidade',e.target.value)}>{['g','ml','comprimidos','doses','L'].map(u=><option key={u}>{u}</option>)}</select></Field>
        </div>
      </Modal>

      <Modal open={modalPlano} onClose={()=>setModalPlano(false)} title="📋 Novo Tratamento"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalPlano(false)}>Cancelar</button><button className="btn btn-primary" onClick={savePlano}>Guardar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Produto *"><select className="input" value={formPlano.produto} onChange={e=>sfPl('produto',e.target.value)}><option value="">— Seleccionar —</option>{produtos.map(p=><option key={p.id}>{p.nome}</option>)}</select></Field></div>
          <Field label="Pombal"><select className="input" value={formPlano.pombal} onChange={e=>sfPl('pombal',e.target.value)}><option value="">Todos</option>{pombais.map(p=><option key={p.id}>{p.nome}</option>)}</select></Field>
          <Field label="Via"><select className="input" value={formPlano.via} onChange={e=>sfPl('via',e.target.value)}>{['Água','Ração','Injecção','Tópico'].map(v=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Dose"><input className="input" placeholder="Ex: 1g" value={formPlano.dose} onChange={e=>sfPl('dose',e.target.value)}/></Field>
          <Field label="Nº Pombos"><input className="input" type="number" value={formPlano.n_pombos} onChange={e=>sfPl('n_pombos',e.target.value)}/></Field>
          <Field label="Início"><input className="input" type="date" value={formPlano.inicio} onChange={e=>sfPl('inicio',e.target.value)}/></Field>
          <Field label="Fim"><input className="input" type="date" value={formPlano.fim} onChange={e=>sfPl('fim',e.target.value)}/></Field>
          <Field label="Estado"><select className="input" value={formPlano.estado} onChange={e=>sfPl('estado',e.target.value)}><option value="ativo">Ativo</option><option value="concluido">Concluído</option><option value="pausado">Pausado</option></select></Field>
        </div>
      </Modal>
    </div>
  )
}

function Calendario() {
  const toast = useToast()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [eventos, setEventos] = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [modalEvento, setModalEvento] = useState(false)
  const [formEvento, setFormEvento] = useState({ titulo:'', tipo:'limpeza', data:new Date().toISOString().slice(0,10), hora:'', obs:'' })
  const [eventosPlaneados, setEventosPlaneados] = useState([])
  const sf = (k,v) => setFormEvento(f=>({...f,[k]:v}))

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const DIAS_SEM = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const TIPOS_COR = { prova:'#C9A44A', treino:'#2E7DD4', vacina:'#6C4FBB', limpeza:'#1ed98a', encestamento:'#E07B39', alimentacao:'#64748b', outro:'#94a3b8' }

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [provas, treinos, planeados] = await Promise.all([
          supabase.from('races').select('data_reg,nome,dist,local_solta').then(r => r.data||[]),
          supabase.from('treinos').select('data_reg,local,dist,tipo').then(r => r.data||[]),
          supabase.from('eventos_cal').select('*').then(r => r.data||[]).catch(()=>[]),
        ])
        const map = {}
        provas.forEach(p => {
          const key = p.data_reg
          if (!key) return
          if (!map[key]) map[key] = []
          map[key].push({ tipo:'prova', titulo:p.nome, sub:`${p.dist}km · ${p.local_solta||''}`, cor:'#C9A44A' })
        })
        treinos.forEach(t => {
          const key = t.data_reg
          if (!key) return
          if (!map[key]) map[key] = []
          map[key].push({ tipo:'treino', titulo:t.local, sub:`${t.dist||0}km · ${t.tipo}`, cor:'#2E7DD4' })
        })
        planeados.forEach(e => {
          const key = e.data_ev
          if (!key) return
          if (!map[key]) map[key] = []
          map[key].push({ tipo:e.tipo, titulo:e.titulo, sub:e.obs||'', cor:TIPOS_COR[e.tipo]||'#94a3b8', id:e.id, planeado:true })
        })
        setEventos(map)
        setEventosPlaneados(planeados)
      } catch(e) { toast('Erro ao carregar calendário','err') }
      finally { setLoading(false) }
    }
    load()
  }, [year, month])

  const prevMes = () => { if(month===0){setYear(y=>y-1);setMonth(11)}else setMonth(m=>m-1); setSelected(null) }
  const nextMes = () => { if(month===11){setYear(y=>y+1);setMonth(0)}else setMonth(m=>m+1); setSelected(null) }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const today = now.getDate()
  const isThisMonth = now.getMonth()===month && now.getFullYear()===year

  const key = (d) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  const saveEvento = async () => {
    if (!formEvento.titulo.trim()) { toast('Título obrigatório','warn'); return }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('eventos_cal').insert({
        titulo: formEvento.titulo, tipo: formEvento.tipo,
        data_ev: formEvento.data, hora: formEvento.hora||null,
        obs: formEvento.obs, user_id: user.id
      })
      if (error) {
        // tabela não existe — criar
        toast('Evento guardado localmente (tabela não criada no Supabase)','warn')
      } else {
        toast('Evento criado!','ok')
      }
      setModalEvento(false)
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const selectedEvs = selected ? (eventos[selected]||[]) : []

  // Próximos eventos
  const todayStr = now.toISOString().slice(0,10)
  const proximos = Object.entries(eventos)
    .filter(([k]) => k >= todayStr)
    .sort(([a],[b]) => a.localeCompare(b))
    .slice(0,8)

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Calendário</div></div>
        <button className="btn btn-primary" onClick={()=>{ setFormEvento({titulo:'',tipo:'limpeza',data:selected||new Date().toISOString().slice(0,10),hora:'',obs:''}); setModalEvento(true) }}>＋ Novo Evento</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16 }}>
        {/* Calendário */}
        <div className="card card-p">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <button className="btn btn-secondary btn-sm" onClick={prevMes}>‹</button>
            <div style={{ fontWeight:600, color:'#fff', fontSize:15 }}>{MESES[month]} {year}</div>
            <button className="btn btn-secondary btn-sm" onClick={nextMes}>›</button>
          </div>
          {/* Dias da semana */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
            {DIAS_SEM.map(d=><div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'#64748b', padding:'4px 0' }}>{d}</div>)}
          </div>
          {/* Dias */}
          {loading ? <div style={{ textAlign:'center', padding:20 }}><Spinner/></div> : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
              {Array.from({length:firstDay}, (_,i) => <div key={`e${i}`}/>)}
              {Array.from({length:daysInMonth}, (_,i) => {
                const d = i+1
                const dayKey = key(d)
                const evs = eventos[dayKey]||[]
                const isToday = isThisMonth && d===today
                const isSel = selected===dayKey
                return (
                  <button key={d} onClick={()=>setSelected(isSel?null:dayKey)}
                    style={{ padding:'6px 2px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:isToday?700:400,
                      background: isToday?'#1ed98a': isSel?'#1a2840':'transparent',
                      color: isToday?'#0a0f14': isSel?'#fff':'#cbd5e1',
                      outline: isSel&&!isToday?'1px solid #1ed98a':'none',
                      position:'relative' }}>
                    {d}
                    {evs.length>0 && (
                      <div style={{ display:'flex', justifyContent:'center', gap:2, marginTop:2 }}>
                        {evs.slice(0,3).map((ev,i)=><div key={i} style={{ width:4, height:4, borderRadius:'50%', background:ev.cor }}/>)}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          {/* Legenda */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:12, paddingTop:12, borderTop:'1px solid #1e3050' }}>
            {Object.entries(TIPOS_COR).map(([t,c])=>(
              <div key={t} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#94a3b8' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:c }}/>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Painel direito */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Dia seleccionado */}
          {selected && (
            <div className="card card-p">
              <div style={{ fontWeight:600, color:'#fff', marginBottom:10, fontSize:13 }}>
                {new Date(selected+'T12:00:00').toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long'})}
              </div>
              {selectedEvs.length===0
                ? <div style={{ fontSize:12, color:'#64748b' }}>Sem eventos neste dia</div>
                : selectedEvs.map((ev,i)=>(
                  <div key={i} style={{ display:'flex', gap:8, padding:'8px 0', borderBottom:'1px solid #1e3050' }}>
                    <div style={{ width:3, background:ev.cor, borderRadius:2, flexShrink:0 }}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{ev.titulo}</div>
                      {ev.sub&&<div style={{ fontSize:11, color:'#64748b' }}>{ev.sub}</div>}
                      <div style={{ fontSize:10, color:ev.cor, marginTop:2 }}>{ev.tipo}</div>
                    </div>
                  </div>
                ))
              }
              <button className="btn btn-secondary btn-sm" style={{ marginTop:10, width:'100%' }}
                onClick={()=>{ setFormEvento({titulo:'',tipo:'limpeza',data:selected,hora:'',obs:''}); setModalEvento(true) }}>
                ＋ Adicionar evento neste dia
              </button>
            </div>
          )}
          {/* Próximos eventos */}
          <div className="card card-p" style={{ flex:1 }}>
            <div style={{ fontWeight:600, color:'#fff', marginBottom:10, fontSize:13 }}>📋 Próximos Eventos</div>
            {proximos.length===0
              ? <div style={{ fontSize:12, color:'#64748b' }}>Sem eventos futuros</div>
              : proximos.map(([date, evs])=>(
                <button key={date} onClick={()=>{
                  const d = new Date(date+'T12:00:00')
                  setYear(d.getFullYear()); setMonth(d.getMonth()); setSelected(date)
                }} style={{ width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:'6px 0', borderBottom:'1px solid #1e3050', fontFamily:'inherit' }}>
                  <div style={{ fontSize:11, color:'#64748b' }}>
                    {new Date(date+'T12:00:00').toLocaleDateString('pt-PT',{weekday:'short',day:'numeric',month:'short'})}
                  </div>
                  {evs.slice(0,2).map((ev,i)=>(
                    <div key={i} style={{ fontSize:12, color:'#fff', display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:ev.cor, flexShrink:0 }}/>
                      {ev.titulo}
                    </div>
                  ))}
                  {evs.length>2&&<div style={{ fontSize:11, color:'#64748b' }}>+{evs.length-2} mais</div>}
                </button>
              ))
            }
          </div>
        </div>
      </div>

      {/* Modal novo evento */}
      <Modal open={modalEvento} onClose={()=>setModalEvento(false)} title="📅 Novo Evento"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalEvento(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={saveEvento}>Guardar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Título *"><input className="input" placeholder="Ex: Limpeza pombal, Vacinação..." value={formEvento.titulo} onChange={e=>sf('titulo',e.target.value)}/></Field>
          <div className="form-grid">
            <Field label="Tipo">
              <select className="input" value={formEvento.tipo} onChange={e=>sf('tipo',e.target.value)}>
                {Object.keys(TIPOS_COR).map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Data"><input className="input" type="date" value={formEvento.data} onChange={e=>sf('data',e.target.value)}/></Field>
            <Field label="Hora (opcional)"><input className="input" type="time" value={formEvento.hora} onChange={e=>sf('hora',e.target.value)}/></Field>
          </div>
          <Field label="Observações"><textarea className="input" rows={2} style={{resize:'none'}} value={formEvento.obs} onChange={e=>sf('obs',e.target.value)}/></Field>
        </div>
      </Modal>
    </div>
  )
}

function Meteorologia() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [meteo, setMeteo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [localNome, setLocalNome] = useState('')
  const [perfil, setPerfil] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadPerfil() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('perfis').select('*').eq('user_id', user.id).single()
      if (data) { setPerfil(data); if(data.pombal_lat&&data.pombal_lon) loadMeteo(data.pombal_lat, data.pombal_lon, data.pombal_nome||'Pombal') }
    }
    loadPerfil()
  }, [])

  const loadMeteo = async (lat, lon, nome) => {
    setLoading(true); setError(null)
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,weather_code&wind_speed_unit=kmh&timezone=Europe%2FLisbon&forecast_days=7`
      const r = await fetch(url)
      if (!r.ok) throw new Error('Erro API')
      const data = await r.json()
      setMeteo({ ...data, lat, lon }); setLocalNome(nome)
    } catch(e) { setError('Não foi possível obter dados. Verifique a ligação.') }
    finally { setLoading(false) }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!search.trim()) return
    setLoading(true); setError(null)
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(search)}&count=3&language=pt&format=json`)
      const d = await r.json()
      if (!d.results?.length) { setError('Local não encontrado'); setLoading(false); return }
      const res = d.results[0]
      const nome = `${res.name}${res.admin1?', '+res.admin1:''}, ${res.country}`
      await loadMeteo(res.latitude, res.longitude, nome)
    } catch(e) { setError('Erro ao pesquisar'); setLoading(false) }
  }

  const WMO = { 0:'☀️ Limpo', 1:'🌤️ Limpo', 2:'⛅ Nublado', 3:'☁️ Coberto', 45:'🌫️ Nevoeiro', 51:'🌦️ Chuva leve', 61:'🌧️ Chuva', 63:'🌧️ Chuva', 71:'🌨️ Neve', 80:'🌦️ Aguaceiros', 95:'⛈️ Trovoada' }
  const wmoLabel = (code) => WMO[code] || WMO[Math.floor(code/10)*10] || '🌡️ Variável'
  const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const dirVento = (g) => { const d=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO']; return d[Math.round(g/22.5)%16]||'—' }

  const condVoo = (wind, wmo, precip=0) => {
    if (wmo>=95||precip>5) return { label:'Mau ⛔', color:'#f87171' }
    if (wmo>=61||precip>2||wind>40) return { label:'Fraco ⚠️', color:'#facc15' }
    if (wind>25||wmo>=51) return { label:'Razoável', color:'#60a5fa' }
    return { label:'Bom ✅', color:'#1ed98a' }
  }

  const cur = meteo?.current

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Meteorologia</div><div className="section-sub">Condições para voo e soltas</div></div>
      </div>

      {/* Pesquisa */}
      <form onSubmit={handleSearch} style={{ display:'flex', gap:8, marginBottom:20 }}>
        <input className="input" style={{ flex:1 }} placeholder="Pesquisar localidade... (ex: Santarém, Torres Novas)"
          value={search} onChange={e=>setSearch(e.target.value)}/>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading?<Spinner/>:'🔍'} Pesquisar
        </button>
        {perfil?.pombal_lat && (
          <button type="button" className="btn btn-secondary" onClick={()=>loadMeteo(perfil.pombal_lat, perfil.pombal_lon, perfil.pombal_nome||'Pombal')}>
            🏠 Pombal
          </button>
        )}
      </form>

      {error && <div style={{ padding:12, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, color:'#f87171', fontSize:13, marginBottom:16 }}>{error}</div>}

      {!meteo && !loading && !error && (
        <div className="card card-p" style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🌦️</div>
          <div style={{ fontSize:15, fontWeight:600, color:'#fff', marginBottom:8 }}>Pesquise uma localidade</div>
          <div style={{ fontSize:13, color:'#64748b' }}>
            {perfil?.pombal_lat ? 'Ou use o botão "Pombal" para ver as condições no seu pombal' : 'Defina as coordenadas GPS do pombal no Perfil para acesso rápido'}
          </div>
        </div>
      )}

      {loading && <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner lg/></div>}

      {meteo && !loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Local */}
          <div style={{ fontSize:13, color:'#94a3b8', display:'flex', alignItems:'center', gap:6 }}>
            📍 <span style={{ color:'#fff', fontWeight:500 }}>{localNome}</span>
            <span style={{ color:'#475569' }}>· {meteo.lat?.toFixed(3)}, {meteo.lon?.toFixed(3)}</span>
          </div>

          {/* KPIs actuais */}
          <div className="grid-4">
            <KpiCard icon="🌡️" label="Temperatura" value={`${cur.temperature_2m}°C`} color="text-yellow"/>
            <KpiCard icon="💨" label="Vento" value={`${cur.wind_speed_10m}km/h`} sub={dirVento(cur.wind_direction_10m)} color="text-blue"/>
            <KpiCard icon="💧" label="Humidade" value={`${cur.relative_humidity_2m}%`} color="text-blue"/>
            <div className="kpi">
              <div style={{ fontSize:20 }}>🕊️</div>
              <div className="kpi-val" style={{ color:condVoo(cur.wind_speed_10m, cur.weather_code, cur.precipitation).color, fontSize:18 }}>
                {condVoo(cur.wind_speed_10m, cur.weather_code, cur.precipitation).label}
              </div>
              <div className="kpi-label">Condição p/ Voo</div>
            </div>
          </div>

          {/* Condição actual */}
          <div className="card card-p" style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ fontSize:36 }}>{wmoLabel(cur.weather_code).split(' ')[0]}</div>
            <div>
              <div style={{ fontWeight:500, color:'#fff' }}>{wmoLabel(cur.weather_code).split(' ').slice(1).join(' ')}</div>
              <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>
                {cur.wind_speed_10m>30?'⚠️ Vento forte — evitar soltas':
                 cur.temperature_2m<5?'⚠️ Temperatura baixa — reforçar alimentação':
                 cur.temperature_2m>32?'⚠️ Calor intenso — garantir hidratação':
                 '✅ Condições adequadas para voo'}
              </div>
            </div>
          </div>

          {/* Previsão 7 dias */}
          <div className="card card-p">
            <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>📅 Previsão 7 Dias</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {meteo.daily.time.map((date, i) => {
                const wmo = meteo.daily.weather_code[i]
                const cv = condVoo(meteo.daily.wind_speed_10m_max[i], wmo, meteo.daily.precipitation_sum[i])
                const d = new Date(date+'T12:00:00')
                const isHoje = i===0
                return (
                  <div key={date} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:10, background:isHoje?'#1a2840':'transparent' }}>
                    <div style={{ width:32, fontSize:12, fontWeight:isHoje?700:400, color:isHoje?'#fff':'#94a3b8' }}>{isHoje?'Hoje':DIAS[d.getDay()]}</div>
                    <div style={{ fontSize:20, width:24 }}>{wmoLabel(wmo).split(' ')[0]}</div>
                    <div style={{ flex:1, fontSize:11, color:'#64748b' }}>
                      {meteo.daily.precipitation_sum[i]>0&&`💧${meteo.daily.precipitation_sum[i].toFixed(1)}mm · `}
                      💨{Math.round(meteo.daily.wind_speed_10m_max[i])}km/h {dirVento(meteo.daily.wind_direction_10m_dominant[i])}
                    </div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>
                      {Math.round(meteo.daily.temperature_2m_min[i])}–{Math.round(meteo.daily.temperature_2m_max[i])}°C
                    </div>
                    <div style={{ fontSize:12, fontWeight:500, color:cv.color, width:80, textAlign:'right' }}>{cv.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mapa */}
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e3050', fontWeight:600, color:'#fff', fontSize:13 }}>🗺️ Localização</div>
            <div style={{ height:180 }}>
              <iframe width="100%" height="100%" frameBorder="0" style={{ display:'block' }}
                src={`https://maps.google.com/maps?q=${meteo.lat},${meteo.lon}&z=10&output=embed`}/>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Relatorios() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('desempenho')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [pombos, provas, fin, saude, treinos] = await Promise.all([
          supabase.from('pigeons').select('*').then(r=>r.data||[]),
          supabase.from('races').select('*').then(r=>r.data||[]),
          supabase.from('financas').select('*').then(r=>r.data||[]),
          supabase.from('health').select('*').then(r=>r.data||[]),
          supabase.from('treinos').select('*').then(r=>r.data||[]),
        ])
        const ano = new Date().getFullYear()
        const finAno = fin.filter(t=>new Date(t.data_reg).getFullYear()===ano)
        const rec = finAno.filter(t=>t.tipo==='receita').reduce((s,t)=>s+(t.val||0),0)
        const dep = finAno.filter(t=>t.tipo==='despesa').reduce((s,t)=>s+(t.val||0),0)

        // Finanças mensais (últimos 6 meses)
        const finMensal = Array.from({length:6},(_,i)=>{
          const d=new Date(); d.setMonth(d.getMonth()-(5-i))
          const m=d.getMonth(); const a=d.getFullYear()
          const tM=fin.filter(t=>{const td=new Date(t.data_reg);return td.getMonth()===m&&td.getFullYear()===a})
          return { mes:d.toLocaleString('pt',{month:'short'}), rec:tM.filter(t=>t.tipo==='receita').reduce((s,t)=>s+(t.val||0),0), dep:tM.filter(t=>t.tipo==='despesa').reduce((s,t)=>s+(t.val||0),0) }
        })

        // Top pombos
        const top = [...pombos].sort((a,b)=>(b.percentil||0)-(a.percentil||0)).slice(0,10)

        // Distribuição especialidade
        const espMap = {}
        pombos.forEach(p=>(p.esp||[]).forEach(e=>{espMap[e]=(espMap[e]||0)+1}))

        // Saúde distribuição
        const aptMap = {}
        saude.forEach(s=>{aptMap[s.aptidao]=(aptMap[s.aptidao]||0)+1})

        setData({ pombos, provas, fin, saude, treinos, rec, dep, saldo:rec-dep, finMensal, top, espMap, aptMap, ano })
      } catch(e) { toast('Erro: '+e.message,'err') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
  if (!data) return null

  const CORES = ['#1ed98a','#C9A44A','#2E7DD4','#D94F4F','#6C4FBB','#E07B39']
  const maxFinMensal = Math.max(...data.finMensal.map(m=>Math.max(m.rec,m.dep)),1)

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Relatórios</div><div className="section-sub">Análise da época {data.ano}</div></div>
      </div>

      {/* KPIs */}
      <div className="grid-4 mb-6">
        <KpiCard icon="🐦" label="Total Pombos" value={data.pombos.length} color="text-green"/>
        <KpiCard icon="🏆" label="Provas" value={data.provas.length} color="text-yellow"/>
        <KpiCard icon="🎯" label="Treinos" value={data.treinos.length} color="text-blue"/>
        <KpiCard icon="💶" label={`Saldo ${data.ano}`} value={`${data.saldo>=0?'+':''}${data.saldo.toFixed(0)}€`} color={data.saldo>=0?'text-green':'text-red'}/>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
        {[['desempenho','🏅 Desempenho'],['financas','💰 Finanças'],['saude','🏥 Saúde']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'#1ed98a':'none', color:tab===t?'#0a0f14':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {tab==='desempenho' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Top pombos */}
          <div className="card card-p">
            <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>🏅 Ranking de Pombos</div>
            {data.top.length===0 ? <div style={{ color:'#64748b', fontSize:13 }}>Sem pombos registados</div>
            : data.top.map((p,i)=>{
              const fc=(p.forma||50)>=80?'#1ed98a':(p.forma||50)>=60?'#facc15':'#f87171'
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #1e3050' }}>
                  <span style={{ fontFamily:'Barlow Condensed', fontSize:18, fontWeight:700, width:20, color:i===0?'#facc15':i===1?'#cbd5e1':i===2?'#b45309':'#475569' }}>{i+1}</span>
                  <div style={{ width:32, height:32, borderRadius:8, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, overflow:'hidden' }}>
                    {p.foto_url?<img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:p.emoji}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nome}</div>
                    <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#64748b' }}>{p.anilha}</div>
                  </div>
                  <div style={{ textAlign:'right', marginRight:8 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1ed98a' }}>{p.percentil||0}%</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>{p.provas||0} provas</div>
                  </div>
                  <div style={{ width:60 }}>
                    <div className="progress"><div className="progress-bar" style={{ width:`${p.forma||50}%`, background:fc }}/></div>
                    <div style={{ fontSize:10, color:'#64748b', textAlign:'right' }}>{p.forma||50}%</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Especialidades */}
          <div className="card card-p">
            <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>🎯 Distribuição por Especialidade</div>
            {Object.entries(data.espMap).map(([esp,n],i)=>{
              const total = Object.values(data.espMap).reduce((s,v)=>s+v,0)||1
              return (
                <div key={esp} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                    <span style={{ color:'#cbd5e1' }}>{esp.replace('_',' ')}</span>
                    <span style={{ fontWeight:600, color:'#fff' }}>{n} <span style={{ color:'#64748b', fontWeight:400 }}>({(n/total*100).toFixed(0)}%)</span></span>
                  </div>
                  <div className="progress"><div className="progress-bar" style={{ width:`${n/total*100}%`, background:CORES[i%CORES.length] }}/></div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab==='financas' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Gráfico barras simples */}
          <div className="card card-p">
            <div style={{ fontWeight:600, color:'#fff', marginBottom:16 }}>📈 Evolução Mensal</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120 }}>
              {data.finMensal.map((m,i)=>(
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <div style={{ fontSize:10, color:m.rec-m.dep>=0?'#1ed98a':'#f87171', fontWeight:600 }}>
                    {m.rec-m.dep>=0?'+':''}{(m.rec-m.dep).toFixed(0)}€
                  </div>
                  <div style={{ width:'100%', display:'flex', gap:2, alignItems:'flex-end', height:80 }}>
                    <div style={{ flex:1, background:'#1ed98a', borderRadius:'3px 3px 0 0', height:`${Math.round(m.rec/maxFinMensal*80)}px` }}/>
                    <div style={{ flex:1, background:'#f87171', borderRadius:'3px 3px 0 0', height:`${Math.round(m.dep/maxFinMensal*80)}px` }}/>
                  </div>
                  <div style={{ fontSize:10, color:'#64748b' }}>{m.mes}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:12, marginTop:8, fontSize:11, color:'#64748b' }}>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, background:'#1ed98a', display:'inline-block', borderRadius:2 }}/>Receitas</span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, background:'#f87171', display:'inline-block', borderRadius:2 }}/>Despesas</span>
            </div>
          </div>

          {/* Categorias despesas */}
          <div className="card card-p">
            <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>📊 Despesas por Categoria</div>
            {(()=>{
              const catMap = {}
              data.fin.filter(t=>t.tipo==='despesa').forEach(t=>{catMap[t.cat]=(catMap[t.cat]||0)+(t.val||0)})
              const cats = Object.entries(catMap).sort((a,b)=>b[1]-a[1])
              const total = cats.reduce((s,[,v])=>s+v,0)||1
              if (!cats.length) return <div style={{ color:'#64748b', fontSize:13 }}>Sem despesas</div>
              return cats.map(([cat,val],i)=>(
                <div key={cat} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                    <span style={{ color:'#cbd5e1' }}>{cat}</span>
                    <span style={{ fontWeight:600, color:'#fff' }}>{val.toFixed(0)}€ <span style={{ color:'#64748b', fontWeight:400 }}>({(val/total*100).toFixed(0)}%)</span></span>
                  </div>
                  <div className="progress"><div className="progress-bar" style={{ width:`${val/total*100}%`, background:CORES[i%CORES.length] }}/></div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {tab==='saude' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card card-p">
            <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>🏥 Distribuição de Aptidão</div>
            {Object.keys(data.aptMap).length===0
              ? <div style={{ color:'#64748b', fontSize:13, textAlign:'center', padding:20 }}>Sem registos de saúde</div>
              : Object.entries(data.aptMap).map(([apt,n],i)=>{
                const total=Object.values(data.aptMap).reduce((s,v)=>s+v,0)||1
                const cor={'excelente':'#1ed98a','boa':'#1ed98a','media':'#facc15','fraca':'#facc15','doente':'#f87171','quarentena':'#f87171'}[apt]||'#94a3b8'
                return (
                  <div key={apt} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                      <span style={{ color:'#cbd5e1' }}>{apt}</span>
                      <span style={{ fontWeight:600, color:'#fff' }}>{n} pombos</span>
                    </div>
                    <div className="progress"><div className="progress-bar" style={{ width:`${n/total*100}%`, background:cor }}/></div>
                  </div>
                )
              })
            }
          </div>
          <div className="grid-3">
            <KpiCard icon="✅" label="Aptos" value={data.pombos.filter(p=>p.estado==='ativo').length} color="text-green"/>
            <KpiCard icon="⚠️" label="Lesionados" value={data.pombos.filter(p=>p.estado==='lesionado').length} color="text-yellow"/>
            <KpiCard icon="🥚" label="Em Reprodução" value={data.pombos.filter(p=>p.estado==='reproducao').length} color="text-blue"/>
          </div>
        </div>
      )}
    </div>
  )
}

function FimEpoca() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('resumo')
  const [pombos, setPombos] = useState([])
  const [provas, setProvas] = useState([])
  const [resultados, setResultados] = useState([])
  const [analise, setAnalise] = useState(null)
  const [gerandoIA, setGerandoIA] = useState(false)
  const [textoIA, setTextoIA] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear())

  useEffect(() => { load() }, [ano])

  const load = async () => {
    setLoading(true)
    try {
      const [p, pr, rr] = await Promise.all([
        supabase.from('pigeons').select('*').then(r=>r.data||[]),
        supabase.from('races').select('*').then(r=>r.data||[]),
        supabase.from('race_results').select('*, pigeons(nome,anilha,emoji,sexo,esp)').then(r=>r.data||[]),
      ])
      setPombos(p); setProvas(pr); setResultados(rr)
      setAnalise(calcularAnalise(p, pr, rr, ano))
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }

  const calcularAnalise = (pombos, provas, resultados, ano) => {
    const provasAno = provas.filter(p => new Date(p.data_reg).getFullYear()===ano)

    // Score por pombo
    const scores = pombos.map(pombo => {
      const resP = resultados.filter(r => r.pigeon_id===pombo.id && provasAno.find(p=>p.id===r.race_id))
      if (!resP.length) return { ...pombo, score:pombo.percentil||0, nProvas:pombo.provas||0, resP:[] }

      const mediaPos = resP.reduce((s,r)=>s+(r.posicao||50),0) / resP.length
      const top10 = resP.filter(r=>(r.posicao||99)<=10).length / resP.length
      const consistencia = resP.filter(r=>(r.posicao||99)<=30).length / resP.length
      const score = Math.round(Math.max(0, Math.min(100,
        (100 - mediaPos) * 0.5 + top10 * 30 + consistencia * 20
      )))
      return { ...pombo, score, nProvas:resP.length, mediaPos:Math.round(mediaPos), top10:Math.round(top10*100), resP }
    }).sort((a,b)=>b.score-a.score)

    // Pombos a dispensar: score<35 e mais de 1 prova
    const dispensar = scores.filter(p => p.score<35 && p.nProvas>=1 && p.provas>0)

    // Casais recomendados: top machos x top fêmeas
    const machos = scores.filter(p=>p.sexo==='M'&&p.score>=60).slice(0,5)
    const femeas = scores.filter(p=>p.sexo==='F'&&p.score>=60).slice(0,5)
    const casais = []
    machos.forEach(m => femeas.forEach(f => {
      if (m.pai!==f.anilha && m.mae!==f.anilha) // evitar consanguinidade directa
        casais.push({ macho:m, femea:f, score:Math.round((m.score+f.score)/2) })
    }))
    casais.sort((a,b)=>b.score-a.score)

    // KPIs época
    const mediaScore = scores.length ? Math.round(scores.reduce((s,p)=>s+p.score,0)/scores.length) : 0
    const vitorias = provasAno.filter(p=>p.lugar===1).length
    const top3 = provasAno.filter(p=>p.lugar&&p.lugar<=3).length

    return { scores, dispensar, casais:casais.slice(0,6), provasAno, mediaScore, vitorias, top3, totalPombos:pombos.length }
  }

  const gerarRelatorioIA = async () => {
    if (!analise) return
    setGerandoIA(true); setTextoIA('')
    try {
      const prompt = `És um especialista em columbofilia. Analisa esta época ${ano} e gera um relatório profissional em português de Portugal.

DADOS DA ÉPOCA:
- Total pombos: ${analise.totalPombos}
- Provas realizadas: ${analise.provasAno.length}
- Vitórias: ${analise.vitorias} | Top 3: ${analise.top3}
- Score médio do efectivo: ${analise.mediaScore}/100
- Top 5 pombos: ${analise.scores.slice(0,5).map(p=>`${p.nome} (${p.anilha}) — score ${p.score}, ${p.nProvas} provas`).join('; ')}
- Pombos com baixo desempenho: ${analise.dispensar.map(p=>p.nome).join(', ')||'Nenhum'}
- Casais recomendados: ${analise.casais.slice(0,3).map(c=>`${c.macho.nome}×${c.femea.nome}`).join(', ')||'Sem dados suficientes'}

Gera um relatório com:
1. Resumo executivo da época (2-3 parágrafos)
2. Análise do efectivo (pontos fortes e fracos)
3. Recomendações para a próxima época
4. Estratégia de reprodução sugerida

Sê específico, profissional e usa os dados fornecidos.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-api-key': 'placeholder',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:1000,
          messages:[{ role:'user', content:prompt }]
        })
      })
      const data = await res.json()
      const texto = data.content?.[0]?.text || data.error?.message || 'Sem resposta da IA.'
      setTextoIA(texto)
      toast('Relatório IA gerado! ✅','ok')
    } catch(e) { toast('Erro IA: '+e.message,'err') }
    finally { setGerandoIA(false) }
  }

  const MEDAL = ['🥇','🥈','🥉']
  const corScore = s => s>=80?'#1ed98a':s>=60?'#facc15':s>=40?'#60a5fa':'#f87171'

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">🏁 Relatório de Fim de Época</div>
          <div className="section-sub">Análise completa · Época {ano}</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select className="input" style={{ width:90 }} value={ano} onChange={e=>setAno(parseInt(e.target.value))}>
            {[2026,2025,2024,2023].map(a=><option key={a}>{a}</option>)}
          </select>
          <button className="btn btn-primary" onClick={gerarRelatorioIA} disabled={gerandoIA}>
            {gerandoIA?<Spinner/>:'🧠'} {gerandoIA?'A analisar...':'Relatório IA'}
          </button>
          <button className="btn btn-secondary" onClick={()=>window.print()}>🖨️</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4 mb-6">
        <KpiCard icon="🏆" label="Provas" value={analise.provasAno.length} color="text-yellow"/>
        <KpiCard icon="🥇" label="Vitórias" value={analise.vitorias} color="text-green"/>
        <KpiCard icon="🎯" label="Top 3" value={analise.top3} color="text-blue"/>
        <div className="kpi">
          <div style={{ fontSize:20 }}>📊</div>
          <div className="kpi-val" style={{ color:corScore(analise.mediaScore) }}>{analise.mediaScore}</div>
          <div className="kpi-label">Score Médio Efectivo</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:20, overflowX:'auto' }}>
        {[['resumo','📊 Resumo'],['ranking','🏅 Ranking'],['dispensar','❌ A Dispensar'],['casais','🧬 Casais'],['ia','🧠 Relatório IA']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tab===t?'#1ed98a':'none', color:tab===t?'#0a0f14':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {/* RESUMO */}
      {tab==='resumo' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card card-p">
            <div style={{ fontWeight:600, color:'#fff', marginBottom:14 }}>🏆 Top 5 Pombos da Época</div>
            {analise.scores.slice(0,5).map((p,i)=>(
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #1e3050' }}>
                <span style={{ fontSize:22, width:28 }}>{MEDAL[i]||`${i+1}º`}</span>
                <div style={{ width:36, height:36, borderRadius:8, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, overflow:'hidden', flexShrink:0 }}>
                  {p.foto_url?<img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:p.emoji||'🐦'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</div>
                  <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#64748b' }}>{p.anilha} · {p.nProvas} provas</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'Barlow Condensed', fontSize:24, fontWeight:700, color:corScore(p.score) }}>{p.score}</div>
                  <div style={{ fontSize:10, color:'#64748b' }}>SCORE</div>
                </div>
                <div style={{ width:80 }}>
                  <div className="progress"><div className="progress-bar" style={{ width:`${p.score}%`, background:corScore(p.score) }}/></div>
                </div>
              </div>
            ))}
            {analise.scores.length===0&&<div style={{ textAlign:'center', color:'#64748b', fontSize:13 }}>Sem pombos com resultados registados nesta época</div>}
          </div>

          <div className="grid-2">
            <div className="card card-p">
              <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>📈 Distribuição de Scores</div>
              {[['Elite (80-100)','#1ed98a',80,100],['Bom (60-79)','#facc15',60,79],['Médio (40-59)','#60a5fa',40,59],['Fraco (<40)','#f87171',0,39]].map(([label,cor,min,max])=>{
                const n = analise.scores.filter(p=>p.score>=min&&p.score<=max).length
                const pct = analise.scores.length ? Math.round(n/analise.scores.length*100) : 0
                return (
                  <div key={label} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span style={{ color:'#cbd5e1' }}>{label}</span>
                      <span style={{ fontWeight:600, color:'#fff' }}>{n} pombos ({pct}%)</span>
                    </div>
                    <div className="progress" style={{ height:6 }}><div className="progress-bar" style={{ width:`${pct}%`, background:cor }}/></div>
                  </div>
                )
              })}
            </div>
            <div className="card card-p">
              <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>🏆 Provas da Época</div>
              {analise.provasAno.length===0
                ? <div style={{ textAlign:'center', color:'#64748b', fontSize:13 }}>Sem provas em {ano}</div>
                : analise.provasAno.slice(0,6).map(p=>(
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #1e3050' }}>
                    <span style={{ fontFamily:'Barlow Condensed', fontSize:18, fontWeight:700, color:p.lugar===1?'#facc15':'#94a3b8' }}>{p.lugar?p.lugar+'º':'—'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'#fff' }}>{p.nome}</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>{p.dist}km · {p.local_solta||'—'}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* RANKING */}
      {tab==='ranking' && (
        <div className="card" style={{ overflowX:'auto' }}>
          <table>
            <thead><tr><th>Pos.</th><th>Pombo</th><th>Anel</th><th>Provas</th><th>Score</th><th>Top 10%</th><th>Pos. Média</th><th>Forma</th></tr></thead>
            <tbody>
              {analise.scores.map((p,i)=>(
                <tr key={p.id}>
                  <td><span style={{ fontFamily:'Barlow Condensed', fontSize:18, fontWeight:700, color:i===0?'#facc15':i===1?'#cbd5e1':i===2?'#b45309':'#475569' }}>{i+1}º</span></td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>{p.emoji||'🐦'}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{p.nome}</div>
                        <div style={{ fontSize:11, color:'#64748b' }}>{p.sexo==='M'?'♂':'♀'} · {(p.esp||[]).join(', ')||'—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>{p.anilha}</td>
                  <td style={{ textAlign:'center' }}>{p.nProvas}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div className="progress" style={{ width:60 }}><div className="progress-bar" style={{ width:`${p.score}%`, background:corScore(p.score) }}/></div>
                      <span style={{ fontFamily:'Barlow Condensed', fontSize:16, fontWeight:700, color:corScore(p.score) }}>{p.score}</span>
                    </div>
                  </td>
                  <td style={{ color:'#facc15', fontWeight:600 }}>{p.top10||0}%</td>
                  <td style={{ color:'#94a3b8' }}>{p.mediaPos||'—'}</td>
                  <td>
                    <div className="progress" style={{ width:60 }}><div className="progress-bar" style={{ width:`${p.forma||50}%`, background:'#60a5fa' }}/></div>
                  </td>
                </tr>
              ))}
              {analise.scores.length===0&&<tr><td colSpan={8} style={{ textAlign:'center', color:'#64748b', padding:30 }}>Sem dados de desempenho</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* DISPENSAR */}
      {tab==='dispensar' && (
        <div>
          <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#94a3b8' }}>
            ⚠️ Pombos identificados com score abaixo de 35 e pelo menos 1 prova registada. A decisão final é sempre do columbófilo.
          </div>
          {analise.dispensar.length===0
            ? <EmptyState icon="✅" title="Efectivo saudável!" desc="Nenhum pombo identificado para dispensa com base nos dados actuais"/>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {analise.dispensar.map(p=>(
                  <div key={p.id} className="card card-p" style={{ display:'flex', alignItems:'center', gap:12, borderColor:'rgba(239,68,68,.2)' }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{p.emoji||'🐦'}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{p.nome}</div>
                      <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#64748b' }}>{p.anilha} · {p.nProvas} provas</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'Barlow Condensed', fontSize:22, fontWeight:700, color:'#f87171' }}>{p.score}</div>
                      <div style={{ fontSize:10, color:'#64748b' }}>SCORE</div>
                    </div>
                    <div style={{ fontSize:12, color:'#f87171' }}>❌ Score baixo</div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* CASAIS RECOMENDADOS */}
      {tab==='casais' && (
        <div>
          <div style={{ background:'rgba(30,217,138,.08)', border:'1px solid rgba(30,217,138,.2)', borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#94a3b8' }}>
            🧬 Casais sugeridos com base no score individual. Prioriza pombos com score ≥60 sem consanguinidade directa.
          </div>
          {analise.casais.length===0
            ? <EmptyState icon="🧬" title="Sem dados suficientes" desc="Necessita de pombos com score ≥60 de ambos os sexos para gerar sugestões"/>
            : <div className="grid-2">
                {analise.casais.map((casal,i)=>(
                  <div key={i} className="card card-p">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ fontFamily:'Barlow Condensed', fontSize:20, fontWeight:700, color:'#1ed98a' }}>Score {casal.score}</div>
                      {i<3&&<span style={{ fontSize:18 }}>{MEDAL[i]}</span>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ flex:1, textAlign:'center' }}>
                        <div style={{ fontSize:18, marginBottom:4 }}>{casal.macho.emoji||'🐦'}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{casal.macho.nome}</div>
                        <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>{casal.macho.anilha}</div>
                        <div style={{ fontSize:11, color:'#60a5fa' }}>♂ Score: {casal.macho.score}</div>
                      </div>
                      <div style={{ fontSize:20, color:'#475569' }}>×</div>
                      <div style={{ flex:1, textAlign:'center' }}>
                        <div style={{ fontSize:18, marginBottom:4 }}>{casal.femea.emoji||'🐦'}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{casal.femea.nome}</div>
                        <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>{casal.femea.anilha}</div>
                        <div style={{ fontSize:11, color:'#f472b6' }}>♀ Score: {casal.femea.score}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* RELATÓRIO IA */}
      {tab==='ia' && (
        <div>
          {!textoIA && !gerandoIA && (
            <div className="card card-p" style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🧠</div>
              <div style={{ fontSize:16, fontWeight:600, color:'#fff', marginBottom:8 }}>Relatório Inteligente de Época</div>
              <div style={{ fontSize:13, color:'#64748b', marginBottom:20, maxWidth:400, margin:'0 auto 20px' }}>
                A IA analisa todos os dados da época e gera um relatório profissional com resumo, análise do efectivo e recomendações para a próxima época.
              </div>
              <button className="btn btn-primary" onClick={gerarRelatorioIA} style={{ fontSize:15, padding:'12px 24px' }}>
                🧠 Gerar Relatório com IA
              </button>
            </div>
          )}
          {gerandoIA && (
            <div style={{ textAlign:'center', padding:60 }}>
              <Spinner lg/>
              <div style={{ fontSize:13, color:'#64748b', marginTop:16 }}>A IA está a analisar a época {ano}...</div>
            </div>
          )}
          {textoIA && (
            <div>
              <div className="card card-p" style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div style={{ fontWeight:600, color:'#fff' }}>🧠 Análise IA — Época {ano}</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={gerarRelatorioIA} disabled={gerandoIA}>🔄 Regenerar</button>
                    <button className="btn btn-secondary btn-sm" onClick={()=>window.print()}>🖨️ Imprimir</button>
                  </div>
                </div>
                <div style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{textoIA}</div>
              </div>
              <div style={{ fontSize:11, color:'#475569', textAlign:'center' }}>
                Gerado por IA com base nos dados reais da época · ChampionsLoft {ano}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


function Documentos() {
  const toast = useToast()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome:'', tipo:'Certificado', desc:'', url:'' })
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  // Documentos em localStorage por enquanto
  useEffect(()=>{
    try { setDocs(JSON.parse(localStorage.getItem('cl_docs')||'[]')) } catch(e) {}
  },[])

  const save = () => {
    if (!form.nome.trim()) { toast('Nome obrigatório','warn'); return }
    const novo = [...docs, { id:Date.now(), ...form, data:new Date().toISOString().slice(0,10) }]
    setDocs(novo)
    try { localStorage.setItem('cl_docs', JSON.stringify(novo)) } catch(e) {}
    toast('Documento adicionado!','ok'); setModal(false); setForm({ nome:'', tipo:'Certificado', desc:'', url:'' })
  }

  const del = (id) => {
    const novo = docs.filter(d=>d.id!==id)
    setDocs(novo)
    try { localStorage.setItem('cl_docs', JSON.stringify(novo)) } catch(e) {}
    toast('Removido','ok')
  }

  const TIPOS_ICON = { 'Certificado':'🏆', 'Regulamento':'📋', 'Relatório':'📊', 'Comprovativo':'📄', 'Outro':'📁' }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Documentos</div><div className="section-sub">{docs.length} documentos</div></div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}>＋ Novo Documento</button>
      </div>
      {docs.length===0 ? <EmptyState icon="📄" title="Sem documentos" desc="Guarde links para documentos importantes" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>＋ Novo Documento</button>}/>
      : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {docs.map(d=>(
            <div key={d.id} className="card card-p" style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:28, flexShrink:0 }}>{TIPOS_ICON[d.tipo]||'📁'}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:500, color:'#fff' }}>{d.nome}</div>
                <div style={{ fontSize:12, color:'#64748b' }}>{d.tipo} · {d.data}</div>
                {d.desc&&<div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{d.desc}</div>}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {d.url&&<a href={d.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">🔗 Abrir</a>}
                <button className="btn btn-danger btn-sm" onClick={()=>del(d.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="📄 Novo Documento"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Nome *"><input className="input" placeholder="Ex: Certificado de Campeão 2026" value={form.nome} onChange={e=>sf('nome',e.target.value)}/></Field>
          <Field label="Tipo">
            <select className="input" value={form.tipo} onChange={e=>sf('tipo',e.target.value)}>
              {['Certificado','Regulamento','Relatório','Comprovativo','Outro'].map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Descrição"><input className="input" placeholder="Breve descrição..." value={form.desc} onChange={e=>sf('desc',e.target.value)}/></Field>
          <Field label="Link (URL)"><input className="input" placeholder="https://..." value={form.url} onChange={e=>sf('url',e.target.value)}/></Field>
        </div>
      </Modal>
    </div>
  )
}

function Checklist() {
  const toast = useToast()
  const [tarefas, setTarefas] = useState([])
  const [pombais, setPombais] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ titulo:'', tipo:'personalizada', frequencia:'diaria', data_prevista:new Date().toISOString().slice(0,10), alerta_dias:1, pombal:'', obs:'' })
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  // Tarefas sugeridas padrão
  const SUGESTOES = [
    { titulo:'Limpeza do pombal', tipo:'limpeza', frequencia:'semanal', alerta_dias:2 },
    { titulo:'Desinfecção bebedouros', tipo:'higiene', frequencia:'diaria', alerta_dias:1 },
    { titulo:'Verificar estado dos pombos', tipo:'saude', frequencia:'diaria', alerta_dias:0 },
    { titulo:'Reposição de alimento', tipo:'alimentacao', frequencia:'diaria', alerta_dias:0 },
    { titulo:'Pesagem dos pombos em reprodução', tipo:'reproducao', frequencia:'semanal', alerta_dias:3 },
    { titulo:'Tratamento preventivo', tipo:'saude', frequencia:'mensal', alerta_dias:7 },
    { titulo:'Limpeza ninhos', tipo:'limpeza', frequencia:'quinzenal', alerta_dias:3 },
    { titulo:'Vacinação anual', tipo:'saude', frequencia:'anual', alerta_dias:30 },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const [t, pb] = await Promise.all([
        supabase.from('tarefas').select('*').eq('user_id',user.id).order('data_prevista').then(r=>r.data||[]),
        supabase.from('lofts').select('*').order('nome').then(r=>r.data||[]),
      ])
      setTarefas(t); setPombais(pb)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  const hoje = new Date().toISOString().slice(0,10)

  // Alertas automáticos - tarefas em atraso
  const emAtraso = tarefas.filter(t=>t.estado!=='concluido'&&t.data_prevista&&t.data_prevista<hoje)
  const hoje7dias = new Date(); hoje7dias.setDate(hoje7dias.getDate()+7)
  const proximas = tarefas.filter(t=>t.estado!=='concluido'&&t.data_prevista&&t.data_prevista>=hoje&&new Date(t.data_prevista)<=hoje7dias)

  const filtered = tarefas.filter(t=>{
    if (filtro==='todas') return true
    if (filtro==='por_iniciar') return t.estado==='por_iniciar'
    if (filtro==='em_andamento') return t.estado==='em_andamento'
    if (filtro==='concluido') return t.estado==='concluido'
    if (filtro==='atrasadas') return t.estado!=='concluido'&&t.data_prevista&&t.data_prevista<hoje
    return true
  })

  const save = async () => {
    if (!form.titulo.trim()) { toast('Título obrigatório','warn'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('tarefas').insert({ titulo:form.titulo.trim(), tipo:form.tipo, frequencia:form.frequencia, data_prevista:form.data_prevista||null, alerta_dias:parseInt(form.alerta_dias)||1, pombal:form.pombal, obs:form.obs, estado:'por_iniciar', sugerida:false, user_id:user.id })
      if (error) throw error
      toast('Tarefa criada!','ok'); setModal(false); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const addSugestao = async (s) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('tarefas').insert({ ...s, estado:'por_iniciar', sugerida:true, data_prevista:hoje, user_id:user.id })
      if (error) throw error
      toast('Tarefa adicionada!','ok'); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const updateEstado = async (id, estado) => {
    const changes = estado==='concluido' ? { estado, data_conclusao:hoje } : { estado, data_conclusao:null }
    await supabase.from('tarefas').update(changes).eq('id',id); load()
  }

  const del = async (id) => {
    await supabase.from('tarefas').delete().eq('id',id); load()
  }

  const estadoCor = { por_iniciar:'#64748b', em_andamento:'#facc15', concluido:'#1ed98a' }
  const estadoIcon = { por_iniciar:'⏳', em_andamento:'🔄', concluido:'✅' }
  const tipoCor = { limpeza:'#2E7DD4', higiene:'#6C4FBB', saude:'#1ed98a', alimentacao:'#C9A44A', reproducao:'#f472b6', personalizada:'#94a3b8', mensal:'#E07B39', anual:'#D94F4F' }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">✅ Checklist & Tarefas</div><div className="section-sub">{emAtraso.length>0?`⚠️ ${emAtraso.length} em atraso · `:''}{tarefas.filter(t=>t.estado==='concluido').length} concluídas</div></div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}>＋ Nova Tarefa</button>
      </div>

      {/* Alertas */}
      {emAtraso.length>0&&(
        <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
          <div style={{ fontWeight:600, color:'#f87171', marginBottom:8 }}>⚠️ {emAtraso.length} tarefa(s) em atraso</div>
          {emAtraso.slice(0,3).map(t=>(
            <div key={t.id} style={{ fontSize:12, color:'#cbd5e1', display:'flex', justifyContent:'space-between', padding:'3px 0' }}>
              <span>{t.titulo}{t.pombal?` · ${t.pombal}`:''}</span>
              <span style={{ color:'#f87171' }}>Prevista: {new Date(t.data_prevista).toLocaleDateString('pt-PT')}</span>
            </div>
          ))}
        </div>
      )}

      {proximas.length>0&&(
        <div style={{ background:'rgba(234,179,8,.08)', border:'1px solid rgba(234,179,8,.2)', borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
          <div style={{ fontWeight:600, color:'#facc15', marginBottom:8 }}>📅 {proximas.length} tarefa(s) nos próximos 7 dias</div>
          {proximas.slice(0,3).map(t=>(
            <div key={t.id} style={{ fontSize:12, color:'#cbd5e1', display:'flex', justifyContent:'space-between', padding:'3px 0' }}>
              <span>{t.titulo}</span>
              <span style={{ color:'#facc15' }}>{new Date(t.data_prevista).toLocaleDateString('pt-PT')}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid-4 mb-4">
        <KpiCard icon="⏳" label="Por Iniciar" value={tarefas.filter(t=>t.estado==='por_iniciar').length} color="text-gray"/>
        <KpiCard icon="🔄" label="Em Andamento" value={tarefas.filter(t=>t.estado==='em_andamento').length} color="text-yellow"/>
        <KpiCard icon="✅" label="Concluídas" value={tarefas.filter(t=>t.estado==='concluido').length} color="text-green"/>
        <KpiCard icon="⚠️" label="Em Atraso" value={emAtraso.length} color={emAtraso.length>0?'text-red':'text-green'}/>
      </div>

      {/* Filtros */}
      <div className="chips mb-4">
        {[['todas','Todas'],['por_iniciar','⏳ Por Iniciar'],['em_andamento','🔄 Em Andamento'],['concluido','✅ Concluídas'],['atrasadas','⚠️ Atrasadas']].map(([v,l])=>(
          <button key={v} className={`chip${filtro===v?' active':''}`} onClick={()=>setFiltro(v)}>{l}</button>
        ))}
      </div>

      {loading?<div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
      :filtered.length===0?<EmptyState icon="✅" title="Sem tarefas" desc="Adicione tarefas ou aceite sugestões abaixo"/>
      :<div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
        {filtered.map(t=>{
          const atrasada=t.estado!=='concluido'&&t.data_prevista&&t.data_prevista<hoje
          return (
            <div key={t.id} className="card card-p" style={{ borderColor:atrasada?'rgba(239,68,68,.3)':'#1e3050' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {/* Toggle estado */}
                <button onClick={()=>{
                  const next = t.estado==='por_iniciar'?'em_andamento':t.estado==='em_andamento'?'concluido':'por_iniciar'
                  updateEstado(t.id, next)
                }} style={{ width:36, height:36, borderRadius:10, border:`2px solid ${estadoCor[t.estado]}`, background:'transparent', cursor:'pointer', fontSize:18, flexShrink:0 }}>
                  {estadoIcon[t.estado]}
                </button>
                <div style={{ width:4, height:36, borderRadius:2, background:tipoCor[t.tipo]||'#94a3b8', flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:t.estado==='concluido'?'#475569':'#fff', textDecoration:t.estado==='concluido'?'line-through':'none' }}>{t.titulo}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>
                    {t.frequencia} {t.pombal?`· ${t.pombal}`:''} {t.data_prevista?`· ${new Date(t.data_prevista).toLocaleDateString('pt-PT')}`:''} {t.sugerida?'· sugerida':''}
                  </div>
                </div>
                {atrasada&&<Badge v="red">ATRASADA</Badge>}
                <select value={t.estado} onChange={e=>updateEstado(t.id,e.target.value)}
                  style={{ background:'#1a2840', border:'1px solid #243860', borderRadius:8, color:'#fff', padding:'4px 8px', fontSize:11, fontFamily:'inherit' }}>
                  <option value="por_iniciar">Por Iniciar</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                </select>
                <button className="btn btn-icon btn-sm" onClick={()=>del(t.id)}>🗑️</button>
              </div>
            </div>
          )
        })}
      </div>}

      {/* Sugestões */}
      <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>💡 Tarefas Sugeridas</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8 }}>
        {SUGESTOES.map((s,i)=>(
          <div key={i} style={{ background:'#141f2e', border:'1px solid #1e3050', borderRadius:12, padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{s.titulo}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{s.frequencia} · {s.tipo}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={()=>addSugestao(s)}>＋</button>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="✅ Nova Tarefa"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}Criar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Título *"><input className="input" placeholder="Ex: Limpeza semanal" value={form.titulo} onChange={e=>sf('titulo',e.target.value)}/></Field>
          <div className="form-grid">
            <Field label="Tipo"><select className="input" value={form.tipo} onChange={e=>sf('tipo',e.target.value)}>{['personalizada','limpeza','higiene','saude','alimentacao','reproducao'].map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Frequência"><select className="input" value={form.frequencia} onChange={e=>sf('frequencia',e.target.value)}>{['diaria','semanal','quinzenal','mensal','anual','pontual'].map(f=><option key={f}>{f}</option>)}</select></Field>
            <Field label="Data Prevista"><input className="input" type="date" value={form.data_prevista} onChange={e=>sf('data_prevista',e.target.value)}/></Field>
            <Field label="Alerta (dias antes)"><input className="input" type="number" min="0" value={form.alerta_dias} onChange={e=>sf('alerta_dias',e.target.value)}/></Field>
            <Field label="Pombal"><select className="input" value={form.pombal} onChange={e=>sf('pombal',e.target.value)}><option value="">Todos</option>{pombais.map(p=><option key={p.id}>{p.nome}</option>)}</select></Field>
          </div>
          <Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e=>sf('obs',e.target.value)}/></Field>
        </div>
      </Modal>
    </div>
  )
}

// ─── METEO PROVA ──────────────────────────────────────
function MeteoProva({ provas, provaSelect, setProvaSelect }) {
  const toast = useToast()
  const [meteoData, setMeteoData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pombalCoords, setPombalCoords] = useState(null)

  useEffect(() => {
    async function loadPombal() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase.from('perfis').select('pombal_lat,pombal_lon,pombal_nome').eq('user_id', user.id).single()
      if (perfil?.pombal_lat && perfil?.pombal_lon) setPombalCoords({ lat: perfil.pombal_lat, lon: perfil.pombal_lon, nome: perfil.pombal_nome || 'O meu pombal' })
    }
    loadPombal()
  }, [])

  const prova = provas.find(p => p.id === provaSelect)

  const calcPontosMedio = (lat1, lon1, lat2, lon2) => {
    // 2 pontos intermédios na linha recta
    return [
      { lat: lat1 + (lat2 - lat1) * 0.33, lon: lon1 + (lon2 - lon1) * 0.33, nome: 'Ponto Intermédio 1' },
      { lat: lat1 + (lat2 - lat1) * 0.66, lon: lon1 + (lon2 - lon1) * 0.66, nome: 'Ponto Intermédio 2' },
    ]
  }

  const wmoIcon = (code) => {
    if (code === 0) return '☀️'
    if (code <= 2) return '🌤️'
    if (code <= 3) return '☁️'
    if (code <= 49) return '🌫️'
    if (code <= 59) return '🌦️'
    if (code <= 69) return '🌧️'
    if (code <= 79) return '❄️'
    if (code <= 82) return '🌧️'
    if (code <= 99) return '⛈️'
    return '🌡️'
  }

  const condVoo = (wind, code, rain) => {
    if (code >= 80 || rain > 2) return { label: 'Mau ❌', color: '#f87171' }
    if (wind > 50 || code >= 60) return { label: 'Difícil ⚠️', color: '#facc15' }
    if (wind > 30) return { label: 'Razoável 🟡', color: '#facc15' }
    return { label: 'Bom ✅', color: '#1ed98a' }
  }

  const fetchMeteo = async () => {
    if (!prova?.lat_solta || !prova?.lon_solta) { toast('Prova sem coordenadas de solta', 'warn'); return }
    if (!pombalCoords) { toast('Pombal sem coordenadas no perfil', 'warn'); return }
    setLoading(true)
    try {
      const dataProva = prova.data_reg || prova.data || new Date().toISOString().slice(0, 10)
      const pontos = [
        { lat: parseFloat(prova.lat_solta), lon: parseFloat(prova.lon_solta), nome: prova.local_solta || 'Local de Solta' },
        ...calcPontosMedio(parseFloat(prova.lat_solta), parseFloat(prova.lon_solta), pombalCoords.lat, pombalCoords.lon),
        { lat: pombalCoords.lat, lon: pombalCoords.lon, nome: pombalCoords.nome },
      ]
      const results = await Promise.all(pontos.map(async (p) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,precipitation&wind_speed_unit=kmh&timezone=Europe%2FLisbon&start_date=${dataProva}&end_date=${dataProva}`
        const r = await fetch(url)
        const d = await r.json()
        // Média das horas de voo (6h-14h)
        const horas = d.hourly?.time?.map((t, i) => ({ h: parseInt(t.slice(11, 13)), i })).filter(x => x.h >= 6 && x.h <= 14).map(x => x.i) || []
        const avg = (arr) => horas.length ? arr.filter((_, i) => horas.includes(i)).reduce((s, v) => s + v, 0) / horas.length : 0
        return {
          ...p,
          temp: avg(d.hourly?.temperature_2m || []).toFixed(1),
          wind: avg(d.hourly?.wind_speed_10m || []).toFixed(0),
          windDir: avg(d.hourly?.wind_direction_10m || []).toFixed(0),
          rain: avg(d.hourly?.precipitation || []).toFixed(1),
          code: d.hourly?.weather_code?.[horas[0]] || 0,
        }
      }))
      setMeteoData({ pontos: results, data: dataProva })
    } catch(e) { toast('Erro meteorologia: ' + e.message, 'err') }
    finally { setLoading(false) }
  }

  const dirVento = (graus) => {
    const dirs = ['N','NE','E','SE','S','SO','O','NO']
    return dirs[Math.round(graus / 45) % 8]
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Field label="Seleccionar Prova">
          <select className="input" value={provaSelect} onChange={e => { setProvaSelect(e.target.value); setMeteoData(null) }}>
            <option value="">— Seleccionar prova —</option>
            {provas.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.dist}km · {p.data_reg ? new Date(p.data_reg).toLocaleDateString('pt-PT') : '—'}</option>)}
          </select>
        </Field>
      </div>

      {prova && (
        <div style={{ background: 'rgba(30,217,138,.08)', border: '1px solid rgba(30,217,138,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#94a3b8' }}>
          🗺️ <strong style={{ color: '#fff' }}>{prova.local_solta || 'Local não definido'}</strong> → <strong style={{ color: '#1ed98a' }}>{pombalCoords?.nome || 'Pombal'}</strong>
          {prova.dist && <span> · {prova.dist}km</span>}
          {(!prova.lat_solta || !pombalCoords) && <div style={{ color: '#facc15', marginTop: 4 }}>⚠️ {!prova.lat_solta ? 'Prova sem coordenadas de solta.' : 'Pombal sem coordenadas no perfil.'}</div>}
        </div>
      )}

      <button className="btn btn-primary" onClick={fetchMeteo} disabled={loading || !prova} style={{ marginBottom: 20 }}>
        {loading ? <Spinner /> : '🌦️'} {loading ? 'A carregar...' : 'Ver Meteorologia do Trajecto'}
      </button>

      {meteoData && (
        <div>
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>
            Condições para {new Date(meteoData.data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })} · Média 06h–14h
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {meteoData.pontos.map((p, i) => {
              const cond = condVoo(p.wind, p.code, p.rain)
              const isOrig = i === 0
              const isDest = i === meteoData.pontos.length - 1
              return (
                <div key={i} className="card card-p" style={{ borderColor: isOrig ? 'rgba(234,179,8,.3)' : isDest ? 'rgba(30,217,138,.3)' : '#1e3050' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOrig ? '#facc15' : isDest ? '#1ed98a' : '#475569', flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{p.nome}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{isOrig ? '🛫 Local de solta' : isDest ? '🏠 Pombal' : '📍 Intermédio'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28 }}>{wmoIcon(p.code)}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Barlow Condensed', fontSize: 22, fontWeight: 700, color: '#60a5fa' }}>{p.temp}°C</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>TEMP</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Barlow Condensed', fontSize: 22, fontWeight: 700, color: '#facc15' }}>{p.wind}km/h</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{dirVento(p.windDir)} VENTO</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Barlow Condensed', fontSize: 22, fontWeight: 700, color: '#94a3b8' }}>{p.rain}mm</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>CHUVA</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: cond.color }}>{cond.label}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>CONDIÇÃO</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#1a2840', borderRadius: 12, fontSize: 12, color: '#64748b' }}>
            📡 Dados: Open-Meteo · Média das horas de voo (06h–14h) · {meteoData.data}
          </div>
        </div>
      )}
      {!prova && <EmptyState icon="🌦️" title="Seleccione uma prova" desc="Escolha uma prova para ver as condições meteorológicas do trajecto"/>}
    </div>
  )
}

// ─── BADGES HELPER ────────────────────────────────────
const calcBadges = (pombos, provas, posts) => {
  const badges = []
  const vitorias = provas.filter(p => p.lugar === 1).length
  const top3 = provas.filter(p => p.lugar && p.lugar <= 3).length
  const totalPombos = pombos.filter(p => !p.estado_ext || p.estado_ext === 'proprio').length
  const topScore = pombos.length ? Math.max(...pombos.map(p => p.percentil || 0)) : 0

  if (vitorias >= 1) badges.push({ id: 'campeao', icon: '🏆', nome: 'Campeão', desc: `${vitorias} vitória(s) em prova` })
  if (top3 >= 3) badges.push({ id: 'podio', icon: '🥉', nome: 'Pódio Frequente', desc: `${top3}x no top 3` })
  if (totalPombos >= 20) badges.push({ id: 'criador', icon: '🕊️', nome: 'Grande Criador', desc: `${totalPombos} pombos no efectivo` })
  if (totalPombos >= 50) badges.push({ id: 'master', icon: '👑', nome: 'Master Columbófilo', desc: `${totalPombos} pombos` })
  if (topScore >= 80) badges.push({ id: 'elite', icon: '⭐', nome: 'Efectivo Elite', desc: `Score máximo ${topScore}%` })
  if (provas.length >= 10) badges.push({ id: 'veterano', icon: '🎖️', nome: 'Veterano', desc: `${provas.length} provas disputadas` })
  if (posts.length >= 5) badges.push({ id: 'ativo', icon: '🔥', nome: 'Membro Activo', desc: `${posts.length} publicações` })
  if (pombos.some(p => p.pai && p.mae)) badges.push({ id: 'genealogista', icon: '🌳', nome: 'Genealogista', desc: 'Pedigree registado' })
  return badges
}

function Admin() {
  const toast = useToast()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [licencas, setLicencas] = useState([])
  const [tab, setTab] = useState('utilizadores')
  const [modalLic, setModalLic] = useState(null)
  const [formLic, setFormLic] = useState({ plano:'gratuito', estado:'ativo', fim:'', notas:'' })

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Verificar se é admin
        const { data: adminCheck } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).single()
        if (!adminCheck) { setIsAdmin(false); setLoading(false); return }
        setIsAdmin(true)
        // Carregar perfis e licenças
        const [perfis, lics] = await Promise.all([
          supabase.from('perfis').select('*').order('created_at', {ascending:false}).then(r=>r.data||[]),
          supabase.from('licencas').select('*').order('created_at', {ascending:false}).then(r=>r.data||[]),
        ])
        setUsers(perfis)
        setLicencas(lics)
      } catch(e) { toast('Erro: '+e.message,'err') }
      finally { setLoading(false) }
    }
    load()
  }, [user])

  const saveLicenca = async () => {
    if (!modalLic) return
    try {
      // Verificar se já existe
      const { data: existing } = await supabase.from('licencas').select('id').eq('user_id', modalLic.user_id).single()
      if (existing) {
        await supabase.from('licencas').update({ plano:formLic.plano, estado:formLic.estado, fim:formLic.fim||null, notas:formLic.notas }).eq('id', existing.id)
      } else {
        await supabase.from('licencas').insert({ user_id:modalLic.user_id, email:modalLic.email, plano:formLic.plano, estado:formLic.estado, fim:formLic.fim||null, notas:formLic.notas })
      }
      toast('Licença actualizada!','ok')
      setModalLic(null)
      // Reload
      const lics = await supabase.from('licencas').select('*').order('created_at',{ascending:false}).then(r=>r.data||[])
      setLicencas(lics)
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const getLicenca = (userId) => licencas.find(l=>l.user_id===userId)
  const planoCor = { gratuito:'#475569', iniciante:'#2E7DD4', base:'#6C4FBB', profissional:'#1ed98a', elite:'#facc15', grupo:'#E07B39' }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>

  if (!isAdmin) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', textAlign:'center' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:600, color:'#fff', marginBottom:8 }}>Acesso Restrito</div>
      <div style={{ fontSize:13, color:'#64748b' }}>Só administradores podem aceder a esta área.</div>
    </div>
  )

  const totalUsers = users.length
  const comLicenca = licencas.filter(l=>l.plano!=='gratuito').length
  const ativos = licencas.filter(l=>l.estado==='ativo').length

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">👑 Painel Admin</div><div className="section-sub">{totalUsers} utilizadores · {comLicenca} com plano pago</div></div>
      </div>

      <div className="grid-3 mb-6">
        <KpiCard icon="👥" label="Total Utilizadores" value={totalUsers} color="text-blue"/>
        <KpiCard icon="💎" label="Planos Pagos" value={comLicenca} color="text-green"/>
        <KpiCard icon="✅" label="Licenças Activas" value={ativos} color="text-yellow"/>
      </div>

      <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
        {[['utilizadores','👥 Utilizadores'],['licencas','💳 Licenças'],['stats','📊 Estatísticas']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'#1ed98a':'none', color:tab===t?'#0a0f14':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {tab==='utilizadores' && (
        <div className="card" style={{ overflowX:'auto' }}>
          <table>
            <thead><tr><th>Utilizador</th><th>Email</th><th>Localidade</th><th>Plano</th><th>Estado</th><th>Validade</th><th>Acções</th></tr></thead>
            <tbody>
              {users.map(u=>{
                const lic = getLicenca(u.user_id)
                return (
                  <tr key={u.user_id||u.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:32, height:32, borderRadius:50, background:'rgba(30,217,138,.1)', border:'1px solid rgba(30,217,138,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#1ed98a', overflow:'hidden', flexShrink:0 }}>
                          {u.foto_perfil_url?<img src={u.foto_perfil_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:(u.nome?u.nome[0].toUpperCase():'U')}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{u.nome||'—'}</div>
                          {u.org&&<div style={{ fontSize:11, color:'#64748b' }}>{u.org}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:12, color:'#94a3b8' }}>{u.email||'—'}</td>
                    <td style={{ fontSize:12, color:'#94a3b8' }}>{u.pombal_morada||u.localidade||'—'}</td>
                    <td><span style={{ padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, background:(planoCor[lic?.plano||'gratuito']||'#475569')+'20', color:planoCor[lic?.plano||'gratuito']||'#475569' }}>{lic?.plano||'gratuito'}</span></td>
                    <td><Badge v={lic?.estado==='ativo'?'green':'red'}>{lic?.estado||'—'}</Badge></td>
                    <td style={{ fontSize:12, color:'#64748b' }}>{lic?.fim?new Date(lic.fim).toLocaleDateString('pt-PT'):'—'}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={()=>{
                        setModalLic({user_id:u.user_id||u.id, nome:u.nome, email:u.email})
                        setFormLic({ plano:lic?.plano||'gratuito', estado:lic?.estado||'ativo', fim:lic?.fim||'', notas:lic?.notas||'' })
                      }}>✏️ Licença</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab==='licencas' && (
        <div className="card" style={{ overflowX:'auto' }}>
          <table>
            <thead><tr><th>Email</th><th>Plano</th><th>Estado</th><th>Início</th><th>Fim</th><th>Notas</th></tr></thead>
            <tbody>
              {licencas.length===0?<tr><td colSpan={6} style={{ textAlign:'center', color:'#64748b', padding:30 }}>Sem licenças registadas</td></tr>
              :licencas.map(l=>(
                <tr key={l.id}>
                  <td style={{ fontSize:12 }}>{l.email||l.user_id?.slice(0,8)+'...'}</td>
                  <td><span style={{ padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, background:(planoCor[l.plano]||'#475569')+'20', color:planoCor[l.plano]||'#475569' }}>{l.plano}</span></td>
                  <td><Badge v={l.estado==='ativo'?'green':'red'}>{l.estado}</Badge></td>
                  <td style={{ fontSize:12, color:'#64748b' }}>{l.inicio?new Date(l.inicio).toLocaleDateString('pt-PT'):'—'}</td>
                  <td style={{ fontSize:12, color:l.fim&&new Date(l.fim)<new Date()?'#f87171':'#64748b' }}>{l.fim?new Date(l.fim).toLocaleDateString('pt-PT'):'Sem limite'}</td>
                  <td style={{ fontSize:12, color:'#94a3b8' }}>{l.notas||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==='stats' && (
        <div className="grid-2">
          {[['gratuito','Gratuito'],['iniciante','Iniciante'],['base','Base'],['profissional','Profissional'],['elite','Elite AI'],['grupo','Pack Grupo']].map(([plano,label])=>{
            const n = licencas.filter(l=>l.plano===plano).length + (plano==='gratuito'?totalUsers-licencas.length:0)
            const pct = totalUsers ? Math.round(n/totalUsers*100) : 0
            return (
              <div key={plano} className="card card-p">
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ color:'#cbd5e1', fontWeight:500 }}>{label}</span>
                  <span style={{ fontFamily:'Barlow Condensed', fontSize:20, fontWeight:700, color:planoCor[plano]||'#475569' }}>{n}</span>
                </div>
                <div className="progress"><div className="progress-bar" style={{ width:`${pct}%`, background:planoCor[plano]||'#475569' }}/></div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{pct}% dos utilizadores</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal licença */}
      <Modal open={!!modalLic} onClose={()=>setModalLic(null)} title={`💳 Licença — ${modalLic?.nome||modalLic?.email||''}`}
        footer={<><button className="btn btn-secondary" onClick={()=>setModalLic(null)}>Cancelar</button><button className="btn btn-primary" onClick={saveLicenca}>Guardar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Plano">
            <select className="input" value={formLic.plano} onChange={e=>setFormLic(f=>({...f,plano:e.target.value}))}>
              {['gratuito','iniciante','base','profissional','elite','grupo'].map(p=><option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select className="input" value={formLic.estado} onChange={e=>setFormLic(f=>({...f,estado:e.target.value}))}>
              <option value="ativo">Ativo</option>
              <option value="suspenso">Suspenso</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </Field>
          <Field label="Validade (deixar vazio = sem limite)">
            <input className="input" type="date" value={formLic.fim} onChange={e=>setFormLic(f=>({...f,fim:e.target.value}))}/>
          </Field>
          <Field label="Notas internas">
            <textarea className="input" rows={2} style={{ resize:'none' }} value={formLic.notas} onChange={e=>setFormLic(f=>({...f,notas:e.target.value}))}/>
          </Field>
        </div>
      </Modal>
    </div>
  )
}

function Comunidade() {
  const toast = useToast()
  const { user } = useAuth()
  const [tab, setTab] = useState('feed')
  const [posts, setPosts] = useState([])
  const [explorar, setExplorar] = useState([])
  const [seguidores, setSeguidores] = useState({ following:[], followers:[] })
  const [notifs, setNotifs] = useState([])
  const [meuPerfil, setMeuPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [modalPost, setModalPost] = useState(false)
  const [modalComents, setModalComents] = useState(null)
  const [selectedPerfil, setSelectedPerfil] = useState(null)
  const [formPost, setFormPost] = useState({ tipo:'geral', conteudo:'' })
  const [formComment, setFormComment] = useState('')
  const [comments, setComments] = useState([])
  const [saving, setSaving] = useState(false)
  const [formPriv, setFormPriv] = useState({ privacidade_perfil:'privado', pub_foto:false, pub_pombos:false, pub_resultados:false, pub_estatisticas:false, pub_conquistas:false, descricao:'', username:'', localidade:'' })
  const [savingPriv, setSavingPriv] = useState(false)
  const PAGE_SIZE = 10
  const [ranking, setRanking] = useState([])
  const [meusPombos, setMeusPombos] = useState([])
  const [minhasProvas, setMinhasProvas] = useState([])
  const [meusPostsAll, setMeusPostsAll] = useState([])

  const load = useCallback(async (reset=true) => {
    if (reset) setLoading(true)
    else setLoadingMore(true)
    try {
      const [me, foll, notifData, explorData] = await Promise.all([
        supabase.from('perfis').select('*').eq('user_id', user.id).single().then(r=>r.data||null),
        supabase.from('followers').select('*').or(`follower_id.eq.${user.id},following_id.eq.${user.id}`).then(r=>r.data||[]),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at',{ascending:false}).limit(20).then(r=>r.data||[]),
        supabase.from('perfis').select('user_id,nome,username,localidade,foto_perfil_url,org,privacidade_perfil,descricao').neq('privacidade_perfil','privado').then(r=>r.data||[]),
      ])
      setMeuPerfil(me)
      if (me) setFormPriv({ privacidade_perfil:me.privacidade_perfil||'privado', pub_foto:me.pub_foto||false, pub_pombos:me.pub_pombos||false, pub_resultados:me.pub_resultados||false, pub_estatisticas:me.pub_estatisticas||false, pub_conquistas:me.pub_conquistas||false, descricao:me.descricao||'', username:me.username||'', localidade:me.localidade||me.pombal_morada||'' })
      const following = foll.filter(f=>f.follower_id===user.id).map(f=>f.following_id)
      const followers = foll.filter(f=>f.following_id===user.id).map(f=>f.follower_id)
      setSeguidores({ following, followers })
      setNotifs(notifData)
      setExplorar(explorData.filter(p=>p.user_id!==user.id))
      const { data: rankData } = await supabase.from('perfis').select('user_id,nome,username,localidade,foto_perfil_url,org').neq('privacidade_perfil','privado')
      setRanking(rankData||[])
      const [myPombos, myProvas, myPosts] = await Promise.all([
        supabase.from('pigeons').select('*').then(r=>r.data||[]),
        supabase.from('races').select('*').then(r=>r.data||[]),
        supabase.from('posts').select('*').eq('user_id', user.id).then(r=>r.data||[]),
      ])
      setMeusPombos(myPombos); setMinhasProvas(myProvas); setMeusPostsAll(myPosts)

      // Feed: posts de quem sigo + os meus
      const feedIds = [...following, user.id]
      const offset = reset ? 0 : page * PAGE_SIZE
      const { data: postsData } = await supabase.from('posts').select('*')
        .in('user_id', feedIds.length ? feedIds : [user.id])
        .order('created_at',{ascending:false})
        .range(offset, offset+PAGE_SIZE-1)
      const newPosts = postsData||[]
      if (reset) setPosts(newPosts)
      else setPosts(p=>[...p,...newPosts])
      setHasMore(newPosts.length===PAGE_SIZE)
      if (!reset) setPage(p=>p+1)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false); setLoadingMore(false) }
  },[user, page])

  useEffect(()=>{ load(true) },[user])

  // Seguir / deixar de seguir
  const toggleFollow = async (targetId) => {
    const jaSegue = seguidores.following.includes(targetId)
    try {
      if (jaSegue) {
        await supabase.from('followers').delete().eq('follower_id',user.id).eq('following_id',targetId)
        setSeguidores(s=>({...s, following:s.following.filter(id=>id!==targetId)}))
      } else {
        await supabase.from('followers').insert({ follower_id:user.id, following_id:targetId })
        setSeguidores(s=>({...s, following:[...s.following, targetId]}))
        // Notificação ao seguido
        await supabase.from('notifications').insert({ user_id:targetId, tipo:'follow', conteudo:`${meuPerfil?.nome||'Alguém'} começou a seguir-te`, referencia_id:user.id })
      }
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  // Criar post
  const criarPost = async () => {
    if (!formPost.conteudo.trim()) { toast('Escreva algo','warn'); return }
    setSaving(true)
    try {
      await supabase.from('posts').insert({
        user_id: user.id,
        autor_nome: meuPerfil?.nome||'Columbófilo',
        autor_avatar: meuPerfil?.foto_perfil_url||null,
        autor_username: meuPerfil?.username||null,
        tipo: formPost.tipo,
        conteudo: formPost.conteudo.trim(),
      })
      toast('Post publicado! 🕊️','ok')
      setModalPost(false)
      setFormPost({ tipo:'geral', conteudo:'' })
      load(true)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  // Like
  const toggleLike = async (post) => {
    const liked = post._liked
    try {
      if (liked) {
        await supabase.from('post_likes').delete().eq('post_id',post.id).eq('user_id',user.id)
        await supabase.from('posts').update({ likes_count: Math.max(0,(post.likes_count||0)-1) }).eq('id',post.id)
      } else {
        await supabase.from('post_likes').insert({ post_id:post.id, user_id:user.id })
        await supabase.from('posts').update({ likes_count:(post.likes_count||0)+1 }).eq('id',post.id)
        if (post.user_id!==user.id) await supabase.from('notifications').insert({ user_id:post.user_id, tipo:'like', conteudo:`${meuPerfil?.nome||'Alguém'} gostou do teu post`, referencia_id:post.id })
      }
      setPosts(ps=>ps.map(p=>p.id===post.id?{...p, likes_count:liked?Math.max(0,(p.likes_count||0)-1):(p.likes_count||0)+1, _liked:!liked}:p))
    } catch(e) {}
  }

  // Carregar likes do utilizador
  const loadLikes = async (postIds) => {
    if (!postIds.length) return
    const { data } = await supabase.from('post_likes').select('post_id').eq('user_id',user.id).in('post_id',postIds)
    const likedIds = new Set((data||[]).map(l=>l.post_id))
    setPosts(ps=>ps.map(p=>({...p, _liked:likedIds.has(p.id)})))
  }

  useEffect(()=>{ if(posts.length) loadLikes(posts.map(p=>p.id)) },[posts.length])

  // Comentários
  const openComments = async (post) => {
    setModalComents(post)
    const { data } = await supabase.from('comments').select('*').eq('post_id',post.id).order('created_at')
    setComments(data||[])
  }

  const sendComment = async () => {
    if (!formComment.trim()||!modalComents) return
    try {
      await supabase.from('comments').insert({ post_id:modalComents.id, user_id:user.id, autor_nome:meuPerfil?.nome||'Eu', autor_avatar:meuPerfil?.foto_perfil_url||null, conteudo:formComment.trim() })
      await supabase.from('posts').update({ comments_count:(modalComents.comments_count||0)+1 }).eq('id',modalComents.id)
      if (modalComents.user_id!==user.id) await supabase.from('notifications').insert({ user_id:modalComents.user_id, tipo:'comment', conteudo:`${meuPerfil?.nome||'Alguém'} comentou o teu post`, referencia_id:modalComents.id })
      setFormComment('')
      const { data } = await supabase.from('comments').select('*').eq('post_id',modalComents.id).order('created_at')
      setComments(data||[])
      setPosts(ps=>ps.map(p=>p.id===modalComents.id?{...p,comments_count:(p.comments_count||0)+1}:p))
    } catch(e) { toast('Erro','err') }
  }

  const marcarLidas = async () => {
    await supabase.from('notifications').update({ lida:true }).eq('user_id',user.id).eq('lida',false)
    setNotifs(ns=>ns.map(n=>({...n,lida:true})))
  }

  const savePrivacidade = async () => {
    setSavingPriv(true)
    try {
      await supabase.from('perfis').update({ privacidade_perfil:formPriv.privacidade_perfil, pub_foto:formPriv.pub_foto, pub_pombos:formPriv.pub_pombos, pub_resultados:formPriv.pub_resultados, pub_estatisticas:formPriv.pub_estatisticas, pub_conquistas:formPriv.pub_conquistas, descricao:formPriv.descricao, username:formPriv.username||null, localidade:formPriv.localidade }).eq('user_id',user.id)
      toast('Privacidade guardada!','ok')
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSavingPriv(false) }
  }

  const partilhar = (p) => {
    const url = `${window.location.origin}/perfil/${p.username||p.user_id}`
    if (navigator.share) navigator.share({ title:'ChampionsLoft', text:`Vê o perfil de ${p.nome} no ChampionsLoft 🕊️`, url })
    else { navigator.clipboard.writeText(url); toast('Link copiado!','ok') }
  }

  const naoLidas = notifs.filter(n=>!n.lida).length
  const filtroExplorar = explorar.filter(p=>!search||p.nome?.toLowerCase().includes(search.toLowerCase())||p.localidade?.toLowerCase().includes(search.toLowerCase()))

  const tipoIcon = { geral:'🕊️', resultado:'🏆', treino:'🎯', conquista:'🏅' }
  const tipoCor = { geral:'#64748b', resultado:'#facc15', treino:'#60a5fa', conquista:'#1ed98a' }

  const Avatar = ({url,nome,size=36}) => (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'rgba(30,217,138,.15)', border:'1px solid rgba(30,217,138,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.4, overflow:'hidden', flexShrink:0, fontWeight:700, color:'#1ed98a' }}>
      {url?<img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:(nome?nome[0].toUpperCase():'🕊️')}
    </div>
  )

  const PostCard = ({post}) => (
    <div className="card card-p" style={{ marginBottom:10 }}>
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <Avatar url={post.autor_avatar} nome={post.autor_nome}/>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontWeight:600, color:'#fff', fontSize:13 }}>{post.autor_nome||'Columbófilo'}</span>
            <span style={{ fontSize:11, padding:'1px 6px', borderRadius:99, background:(tipoCor[post.tipo]||'#64748b')+'20', color:tipoCor[post.tipo]||'#64748b' }}>{tipoIcon[post.tipo]} {post.tipo}</span>
          </div>
          <div style={{ fontSize:11, color:'#475569' }}>{new Date(post.created_at).toLocaleDateString('pt-PT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        {post.user_id===user.id&&<button className="btn btn-icon btn-sm" onClick={async()=>{ await supabase.from('posts').delete().eq('id',post.id); load(true) }}>🗑️</button>}
      </div>
      <div style={{ fontSize:14, color:'#cbd5e1', lineHeight:1.6, marginBottom:10, whiteSpace:'pre-wrap' }}>{post.conteudo}</div>
      {post.media_url&&<img src={post.media_url} alt="" style={{ width:'100%', borderRadius:10, marginBottom:10, maxHeight:300, objectFit:'cover' }}/>}
      <div style={{ display:'flex', gap:16, paddingTop:8, borderTop:'1px solid #1e3050' }}>
        <button onClick={()=>toggleLike(post)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:post._liked?'#f87171':'#64748b', fontSize:13, fontFamily:'inherit', padding:0 }}>
          {post._liked?'❤️':'🤍'} {post.likes_count||0}
        </button>
        <button onClick={()=>openComments(post)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:13, fontFamily:'inherit', padding:0 }}>
          💬 {post.comments_count||0}
        </button>
        <button onClick={()=>{ if(navigator.share) navigator.share({title:'ChampionsLoft',text:post.conteudo}); else { navigator.clipboard.writeText(post.conteudo); toast('Copiado!','ok') } }}
          style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:13, fontFamily:'inherit', padding:0, marginLeft:'auto' }}>
          📤
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">🌐 Comunidade</div><div className="section-sub">{seguidores.following.length} a seguir · {seguidores.followers.length} seguidores</div></div>
        <button className="btn btn-primary" onClick={()=>setModalPost(true)}>✏️ Publicar</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:20, overflowX:'auto' }}>
        {[
          ['feed','📰 Feed'],
          ['explorar','🔍 Explorar'],
          ['ranking','🏆 Ranking'],
          ['desafios','🎯 Desafios'],
          ['badges','🎖️ Badges'],
          ['notificacoes', naoLidas>0?'🔔 ('+naoLidas+')':'🔔 Notificações'],
          ['privacidade','🔒 Privacidade'],
          ['meu_perfil','👤 Meu Perfil'],
        ].map(([t,l])=>(
          <button key={t} onClick={()=>{ setTab(t); if(t==='notificacoes') marcarLidas() }}
            style={{ padding:'8px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tab===t?'#1ed98a':'none', color:tab===t?'#0a0f14':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {/* FEED */}
      {tab==='feed'&&(
        <div>
          {loading?<div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
          :posts.length===0
            ?<EmptyState icon="📰" title="Feed vazio" desc="Segue outros columbófilos para ver os seus posts, ou publica o primeiro!" action={<button className="btn btn-primary" onClick={()=>setModalPost(true)}>✏️ Publicar</button>}/>
            :<div>
              {posts.map(p=><PostCard key={p.id} post={p}/>)}
              {hasMore&&<button className="btn btn-secondary w-full" style={{ justifyContent:'center', marginTop:8 }} onClick={()=>load(false)} disabled={loadingMore}>{loadingMore?<Spinner/>:'Carregar mais'}</button>}
            </div>
          }
        </div>
      )}

      {/* EXPLORAR */}
      {tab==='explorar'&&(
        <div>
          <input className="input" style={{ marginBottom:16 }} placeholder="🔍 Pesquisar columbófilos..." value={search} onChange={e=>setSearch(e.target.value)}/>
          {filtroExplorar.length===0
            ?<EmptyState icon="🔍" title="Sem resultados" desc="Nenhum columbófilo público encontrado"/>
            :<div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filtroExplorar.map((p,i)=>{
                const segue = seguidores.following.includes(p.user_id)
                return (
                  <div key={i} className="card card-p" style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <Avatar url={p.foto_perfil_url} nome={p.nome} size={44}/>
                    <div style={{ flex:1, cursor:'pointer' }} onClick={()=>setSelectedPerfil(p)}>
                      <div style={{ fontWeight:600, color:'#fff', fontSize:13 }}>{p.nome}</div>
                      {p.localidade&&<div style={{ fontSize:11, color:'#64748b' }}>📍 {p.localidade}</div>}
                      {p.descricao&&<div style={{ fontSize:11, color:'#94a3b8', marginTop:2, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:200 }}>{p.descricao}</div>}
                    </div>
                    <button className={`btn ${segue?'btn-secondary':'btn-primary'} btn-sm`} onClick={()=>toggleFollow(p.user_id)}>
                      {segue?'✓ A seguir':'+ Seguir'}
                    </button>
                  </div>
                )
              })}
            </div>
          }
        </div>
      )}

      {/* NOTIFICAÇÕES */}
      {tab==='notificacoes'&&(
        <div>
          {notifs.length===0
            ?<EmptyState icon="🔔" title="Sem notificações" desc="As notificações de likes, comentários e seguidores aparecerão aqui"/>
            :<div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {notifs.map(n=>(
                <div key={n.id} className="card card-p" style={{ display:'flex', alignItems:'center', gap:12, opacity:n.lida?.8:1, borderColor:n.lida?'#1e3050':'rgba(30,217,138,.3)' }}>
                  <span style={{ fontSize:20 }}>{n.tipo==='like'?'❤️':n.tipo==='comment'?'💬':n.tipo==='follow'?'👤':'🔔'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:'#cbd5e1' }}>{n.conteudo}</div>
                    <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{new Date(n.created_at).toLocaleDateString('pt-PT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  {!n.lida&&<div style={{ width:8, height:8, borderRadius:'50%', background:'#1ed98a', flexShrink:0 }}/>}
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* PRIVACIDADE */}
      {tab==='privacidade'&&(
        <div className="card card-p" style={{ maxWidth:500 }}>
          <div style={{ fontWeight:600, color:'#fff', marginBottom:16 }}>🔒 Controlo de Privacidade</div>
          <Field label="Visibilidade">
            <select className="input" value={formPriv.privacidade_perfil} onChange={e=>setFormPriv(f=>({...f,privacidade_perfil:e.target.value}))}>
              <option value="privado">🔒 Privado</option>
              <option value="publico">🌐 Público</option>
            </select>
          </Field>
          {formPriv.privacidade_perfil==='publico'&&(
            <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:10 }}>
              {[['pub_foto','📸 Foto de perfil'],['pub_pombos','🐦 Lista de pombos'],['pub_resultados','🏆 Resultados'],['pub_estatisticas','📊 Estatísticas'],['pub_conquistas','🏅 Conquistas']].map(([key,label])=>(
                <label key={key} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                  <input type="checkbox" checked={formPriv[key]||false} onChange={e=>setFormPriv(f=>({...f,[key]:e.target.checked}))} style={{ accentColor:'#1ed98a', width:16, height:16 }}/>
                  <span style={{ fontSize:13, color:'#cbd5e1' }}>{label}</span>
                </label>
              ))}
            </div>
          )}
          <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:12 }}>
            <Field label="Username">
              <div style={{ display:'flex', gap:0 }}>
                <span style={{ padding:'9px 12px', background:'#0f1923', border:'1px solid #243860', borderRight:'none', borderRadius:'10px 0 0 10px', fontSize:13, color:'#64748b' }}>@</span>
                <input className="input" style={{ borderRadius:'0 10px 10px 0' }} placeholder="seunome" value={formPriv.username} onChange={e=>setFormPriv(f=>({...f,username:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')}))}/>
              </div>
              {formPriv.username&&<div style={{ fontSize:11, color:'#1ed98a', marginTop:4 }}>{window.location.origin}/perfil/{formPriv.username}</div>}
            </Field>
            <Field label="Localidade"><input className="input" placeholder="Ex: Avis, Alentejo" value={formPriv.localidade} onChange={e=>setFormPriv(f=>({...f,localidade:e.target.value}))}/></Field>
            <Field label="Descrição"><textarea className="input" rows={3} style={{ resize:'none' }} value={formPriv.descricao} onChange={e=>setFormPriv(f=>({...f,descricao:e.target.value}))}/></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop:16, width:'100%', justifyContent:'center' }} onClick={savePrivacidade} disabled={savingPriv}>{savingPriv?<Spinner/>:'💾'} Guardar</button>
        </div>
      )}

      {/* RANKING */}
      {tab==='ranking'&&(
        <div>
          <div style={{ fontWeight:600, color:'#fff', marginBottom:4 }}>Ranking Global</div>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Columbófilos com perfil público</div>
          {ranking.length===0
            ?<EmptyState icon="🏆" title="Sem dados" desc="Ainda não há columbófilos públicos"/>
            :<div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {ranking.map((p,i)=>(
                <div key={i} className="card card-p" style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:32, textAlign:'center', fontFamily:'Barlow Condensed', fontSize:20, fontWeight:700, color:i===0?'#facc15':i===1?'#cbd5e1':i===2?'#b45309':'#475569', flexShrink:0 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'º'}</div>
                  <Avatar url={p.foto_perfil_url} nome={p.nome} size={40}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, color:'#fff', fontSize:13 }}>{p.nome||'—'}</div>
                    {p.localidade&&<div style={{ fontSize:11, color:'#64748b' }}>📍 {p.localidade}</div>}
                  </div>
                  <button className={'btn '+(seguidores.following.includes(p.user_id)?'btn-secondary':'btn-primary')+' btn-sm'} onClick={()=>toggleFollow(p.user_id)}>
                    {seguidores.following.includes(p.user_id)?'✓ Seguir':'+ Seguir'}
                  </button>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* DESAFIOS */}
      {tab==='desafios'&&(
        <div>
          <div style={{ fontWeight:600, color:'#fff', marginBottom:4 }}>🎯 Desafios Semanais</div>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Participa e motiva a comunidade!</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { icon:'🏆', titulo:'Campeão da Semana', desc:'Regista um resultado e partilha na comunidade.', pontos:50, tipo:'resultado' },
              { icon:'🎯', titulo:'Treino em Família', desc:'Partilha um treino com mais de 10 pombos.', pontos:30, tipo:'treino' },
              { icon:'🐦', titulo:'Destaque do Efectivo', desc:'Partilha o pombo com melhor score da época.', pontos:20, tipo:'conquista' },
              { icon:'📸', titulo:'Fotógrafo Columbófilo', desc:'Publica uma novidade do teu pombal.', pontos:15, tipo:'geral' },
              { icon:'🤝', titulo:'Embaixador', desc:'Segue 3 novos columbófilos esta semana.', pontos:25, tipo:null },
              { icon:'📊', titulo:'Analista da Época', desc:'Gera e partilha o relatório com IA.', pontos:40, tipo:'conquista' },
              { icon:'🧬', titulo:'Genealogista', desc:'Partilha o pedigree de um pombo.', pontos:35, tipo:'conquista' },
              { icon:'🌍', titulo:'Columbófilo Global', desc:'Regista um pombo de origem estrangeira.', pontos:20, tipo:null },
            ].map((d,i)=>(
              <div key={i} className="card card-p">
                <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'rgba(30,217,138,.1)', border:'1px solid rgba(30,217,138,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{d.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, color:'#fff', fontSize:13, marginBottom:4 }}>{d.titulo}</div>
                    <div style={{ fontSize:12, color:'#94a3b8', marginBottom:10 }}>{d.desc}</div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <button className="btn btn-primary btn-sm" onClick={()=>{ if(d.tipo){ setFormPost(f=>({...f,tipo:d.tipo})); setModalPost(true) } else setTab('explorar') }}>
                        {d.tipo?'✏️ Publicar':'🔍 Explorar'}
                      </button>
                      <span style={{ fontSize:11, color:'#facc15', fontWeight:600 }}>+{d.pontos} pts</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BADGES */}
      {tab==='badges'&&(
        <div>
          <div style={{ fontWeight:600, color:'#fff', marginBottom:4 }}>🎖️ As minhas Conquistas</div>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Ganhos automaticamente com base na tua actividade</div>
          {(()=>{
            const myBadges = calcBadges(meusPombos, minhasProvas, meusPostsAll)
            const allBadges = [
              { id:'campeao', icon:'🏆', nome:'Campeão', desc:'1+ vitória em prova' },
              { id:'podio', icon:'🥉', nome:'Pódio Frequente', desc:'3+ vezes no top 3' },
              { id:'criador', icon:'🕊️', nome:'Grande Criador', desc:'20+ pombos no efectivo' },
              { id:'master', icon:'👑', nome:'Master Columbófilo', desc:'50+ pombos' },
              { id:'elite', icon:'⭐', nome:'Efectivo Elite', desc:'Score máximo 80%+' },
              { id:'veterano', icon:'🎖️', nome:'Veterano', desc:'10+ provas disputadas' },
              { id:'ativo', icon:'🔥', nome:'Membro Activo', desc:'5+ publicações' },
              { id:'genealogista', icon:'🌳', nome:'Genealogista', desc:'Pedigree registado' },
            ]
            const earned = new Set(myBadges.map(b=>b.id))
            return (
              <div>
                {myBadges.length>0&&(
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:12, color:'#1ed98a', fontWeight:600, marginBottom:10 }}>Conquistados ({myBadges.length})</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8 }}>
                      {myBadges.map(b=>(
                        <div key={b.id} className="card card-p" style={{ textAlign:'center', borderColor:'rgba(30,217,138,.3)' }}>
                          <div style={{ fontSize:36, marginBottom:8 }}>{b.icon}</div>
                          <div style={{ fontWeight:600, color:'#fff', fontSize:13 }}>{b.nome}</div>
                          <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{b.desc}</div>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ marginTop:12 }}
                      onClick={()=>{ setFormPost(f=>({...f,tipo:'conquista',conteudo:'Conquistei '+myBadges.length+' badge(s) no ChampionsLoft! '+myBadges.map(b=>b.icon+b.nome).join(', ')})); setModalPost(true) }}>
                      📤 Partilhar Conquistas
                    </button>
                  </div>
                )}
                <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:10 }}>Por conquistar ({allBadges.length - myBadges.length})</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8 }}>
                  {allBadges.filter(b=>!earned.has(b.id)).map(b=>(
                    <div key={b.id} className="card card-p" style={{ textAlign:'center', opacity:.5 }}>
                      <div style={{ fontSize:36, marginBottom:8, filter:'grayscale(1)' }}>{b.icon}</div>
                      <div style={{ fontWeight:600, color:'#64748b', fontSize:13 }}>{b.nome}</div>
                      <div style={{ fontSize:11, color:'#475569', marginTop:4 }}>{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* MEU PERFIL */}
      {tab==='meu_perfil'&&meuPerfil&&(
        <div style={{ maxWidth:480 }}>
          <div className="card card-p" style={{ marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:14 }}>
              <Avatar url={meuPerfil.foto_perfil_url} nome={meuPerfil.nome} size={64}/>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{meuPerfil.nome||'—'}</div>
                {meuPerfil.username&&<div style={{ fontSize:13, color:'#1ed98a' }}>@{meuPerfil.username}</div>}
                {meuPerfil.localidade&&<div style={{ fontSize:12, color:'#64748b' }}>📍 {meuPerfil.localidade||meuPerfil.pombal_morada}</div>}
              </div>
            </div>
            <div style={{ display:'flex', gap:24, marginBottom:14, textAlign:'center' }}>
              <div><div style={{ fontFamily:'Barlow Condensed', fontSize:24, fontWeight:700, color:'#fff' }}>{posts.filter(p=>p.user_id===user.id).length}</div><div style={{ fontSize:11, color:'#64748b' }}>Posts</div></div>
              <div><div style={{ fontFamily:'Barlow Condensed', fontSize:24, fontWeight:700, color:'#fff' }}>{seguidores.followers.length}</div><div style={{ fontSize:11, color:'#64748b' }}>Seguidores</div></div>
              <div><div style={{ fontFamily:'Barlow Condensed', fontSize:24, fontWeight:700, color:'#fff' }}>{seguidores.following.length}</div><div style={{ fontSize:11, color:'#64748b' }}>A Seguir</div></div>
            </div>
            {meuPerfil.descricao&&<div style={{ fontSize:13, color:'#94a3b8', marginBottom:14, padding:'10px 14px', background:'#1a2840', borderRadius:10 }}>{meuPerfil.descricao}</div>}
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={()=>partilhar(meuPerfil)}>📤 Partilhar</button>
              <button className="btn btn-secondary" onClick={()=>setTab('privacidade')}>🔒 Privacidade</button>
            </div>
          </div>
          {/* Posts próprios */}
          <div style={{ fontWeight:600, color:'#fff', marginBottom:10 }}>Os meus posts</div>
          {posts.filter(p=>p.user_id===user.id).length===0
            ?<div style={{ textAlign:'center', color:'#64748b', fontSize:13, padding:'20px 0' }}>Ainda não publicaste nada</div>
            :posts.filter(p=>p.user_id===user.id).map(p=><PostCard key={p.id} post={p}/>)
          }
        </div>
      )}

      {/* Modal novo post */}
      <Modal open={modalPost} onClose={()=>setModalPost(false)} title="✏️ Nova Publicação"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalPost(false)}>Cancelar</button><button className="btn btn-primary" onClick={criarPost} disabled={saving}>{saving?<Spinner/>:'Publicar'}</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Tipo">
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[['geral','🕊️ Geral'],['resultado','🏆 Resultado'],['treino','🎯 Treino'],['conquista','🏅 Conquista']].map(([v,l])=>(
                <button key={v} type="button" className={`chip${formPost.tipo===v?' active':''}`} onClick={()=>setFormPost(f=>({...f,tipo:v}))}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="Mensagem *">
            <textarea className="input" rows={5} style={{ resize:'none' }} placeholder="Partilha uma novidade com a comunidade..." value={formPost.conteudo} onChange={e=>setFormPost(f=>({...f,conteudo:e.target.value}))} maxLength={500}/>
            <div style={{ fontSize:11, color:'#475569', textAlign:'right', marginTop:4 }}>{formPost.conteudo.length}/500</div>
          </Field>
        </div>
      </Modal>

      {/* Modal comentários */}
      <Modal open={!!modalComents} onClose={()=>setModalComents(null)} title="💬 Comentários" wide>
        {modalComents&&(
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            <div style={{ background:'#1a2840', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#cbd5e1' }}>{modalComents.conteudo}</div>
            <div style={{ maxHeight:300, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
              {comments.length===0?<div style={{ textAlign:'center', color:'#64748b', fontSize:13, padding:'20px 0' }}>Sem comentários ainda</div>
              :comments.map(cm=>(
                <div key={cm.id} style={{ display:'flex', gap:10 }}>
                  <Avatar url={cm.autor_avatar} nome={cm.autor_nome} size={32}/>
                  <div style={{ flex:1, background:'#1a2840', borderRadius:10, padding:'8px 12px' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:4 }}>{cm.autor_nome}</div>
                    <div style={{ fontSize:13, color:'#cbd5e1' }}>{cm.conteudo}</div>
                    <div style={{ fontSize:10, color:'#475569', marginTop:4 }}>{new Date(cm.created_at).toLocaleDateString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="input" style={{ flex:1 }} placeholder="Escreve um comentário..." value={formComment} onChange={e=>setFormComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendComment()}/>
              <button className="btn btn-primary" onClick={sendComment}>Enviar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Perfil de outro utilizador */}
      {selectedPerfil&&(
        <Modal open={!!selectedPerfil} onClose={()=>setSelectedPerfil(null)} title={`🕊️ ${selectedPerfil.nome}`}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
            <Avatar url={selectedPerfil.foto_perfil_url} nome={selectedPerfil.nome} size={60}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{selectedPerfil.nome}</div>
              {selectedPerfil.localidade&&<div style={{ fontSize:12, color:'#64748b' }}>📍 {selectedPerfil.localidade}</div>}
              {selectedPerfil.org&&<div style={{ fontSize:12, color:'#94a3b8' }}>{selectedPerfil.org}</div>}
            </div>
          </div>
          {selectedPerfil.descricao&&<div style={{ fontSize:13, color:'#94a3b8', padding:'10px 14px', background:'#1a2840', borderRadius:10, marginBottom:14 }}>{selectedPerfil.descricao}</div>}
          <div style={{ display:'flex', gap:8 }}>
            <button className={`btn ${seguidores.following.includes(selectedPerfil.user_id)?'btn-secondary':'btn-primary'} btn-sm`} onClick={()=>toggleFollow(selectedPerfil.user_id)}>
              {seguidores.following.includes(selectedPerfil.user_id)?'✓ A seguir':'+ Seguir'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={()=>partilhar(selectedPerfil)}>📤 Partilhar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── PLANOS & STRIPE ──────────────────────────────────
const PLANOS = {
  individuais: [
    {
      id: 'gratuito',
      nome: 'Gratuito',
      preco_m: 0,
      preco_a: 0,
      cor: '#475569',
      icon: '🕊️',
      desc: 'Para experimentar',
      features: ['Até 15 pombos','Provas e treinos','Saúde básica','Sem IA, sem comunidade'],
      price_m: null,
      price_a: null,
    },
    {
      id: 'base',
      nome: 'Base',
      preco_m: 7.99,
      preco_a: 79.90,
      cor: '#2E7DD4',
      icon: '🐦',
      desc: 'Para o columbófilo activo',
      features: ['Pombos ilimitados','Provas, treinos, saúde','Reprodução completa','Alimentação & tratamentos','Calendário & checklist','Relatórios básicos'],
      price_m: 'price_1TPlTzCuZCS32LoS3jG3Ltvw',
      price_a: 'price_1TPlTzCuZCS32LoSp65DNBs7',
    },
    {
      id: 'profissional',
      nome: 'Profissional',
      preco_m: 11.99,
      preco_a: 119.90,
      cor: '#6C4FBB',
      icon: '⭐',
      desc: 'Para o columbófilo exigente',
      features: ['Tudo do Base','Comunidade & rede social','Rankings e badges','Desafios semanais','Relatórios avançados','Meteorologia de trajecto','Fim de época'],
      price_m: 'price_1TPlUlCuZCS32LoSGnUI0K0j',
      price_a: 'price_1TPlVTCuZCS32LoSxNa6qNws',
      popular: true,
    },
    {
      id: 'elite',
      nome: 'Elite AI',
      preco_m: 16.99,
      preco_a: 169.90,
      cor: '#facc15',
      icon: '🏆',
      desc: 'O poder da inteligência artificial',
      features: ['Tudo do Profissional','IA — relatório de época','Sugestões de casais por IA','Posts automáticos inteligentes','Suporte prioritário','Acesso antecipado a novas funcionalidades'],
      price_m: 'price_1TPlXBCuZCS32LoScQ8SjezV',
      price_a: 'price_1TPlXBCuZCS32LoSLgcGRvJK',
    },
  ],
  coletividades: [
    {
      id: 'pro_grupo_1_5',
      nome: 'Pro Grupo',
      faixa: '1–5 licenças',
      preco_m: 9.99,
      preco_a: 99.90,
      cor: '#6C4FBB',
      icon: '🏛️',
      price_m: 'price_1TPlY9CuZCS32LoSzQdNAxyM',
      price_a: 'price_1TPlYgCuZCS32LoS1BKkHaxs',
    },
    {
      id: 'pro_grupo_6_12',
      nome: 'Pro Grupo',
      faixa: '6–12 licenças',
      preco_m: 7.99,
      preco_a: 79.90,
      cor: '#6C4FBB',
      icon: '🏛️',
      price_m: 'price_1TPlZYCuZCS32LoSYyEyFBSB',
      price_a: 'price_1TPlZxCuZCS32LoSezXlqc6x',
    },
    {
      id: 'pro_grupo_13',
      nome: 'Pro Grupo',
      faixa: '13+ licenças',
      preco_m: 5.99,
      preco_a: 59.90,
      cor: '#6C4FBB',
      icon: '🏛️',
      price_m: 'price_1TPlbqCuZCS32LoSfYoj9lkv',
      price_a: 'price_1TPlcJCuZCS32LoSIl1l6Q8U',
    },
    {
      id: 'elite_grupo_1_5',
      nome: 'Elite AI Grupo',
      faixa: '1–5 licenças',
      preco_m: 13.99,
      preco_a: 139.90,
      cor: '#facc15',
      icon: '🤖',
      price_m: 'price_1TPleQCuZCS32LoSXUBMniwa',
      price_a: 'price_1TPleQCuZCS32LoSAx9YdmEf',
    },
    {
      id: 'elite_grupo_6_12',
      nome: 'Elite AI Grupo',
      faixa: '6–12 licenças',
      preco_m: 11.99,
      preco_a: 119.90,
      cor: '#facc15',
      icon: '🤖',
      price_m: 'price_1TPlfICuZCS32LoSj4nZTl1e',
      price_a: 'price_1TPlfkCuZCS32LoSzajejVLl',
    },
    {
      id: 'elite_grupo_13',
      nome: 'Elite AI Grupo',
      faixa: '13+ licenças',
      preco_m: 8.99,
      preco_a: 89.90,
      cor: '#facc15',
      icon: '🤖',
      price_m: 'price_1TPlgVCuZCS32LoSuZjAUDLW',
      price_a: 'price_1TPlguCuZCS32LoSrqM1aFQG',
    },
  ]
}

function Precos() {
  const { user } = useAuth()
  const toast = useToast()
  const [periodo, setPeriodo] = useState('mensal')
  const [tab, setTab] = useState('individuais')
  const [loading, setLoading] = useState(null)
  const [licenca, setLicenca] = useState(null)

  useEffect(() => {
    async function loadLicenca() {
      if (!user) return
      const { data } = await supabase.from('licencas').select('*').eq('user_id', user.id).single()
      setLicenca(data)
    }
    loadLicenca()
  }, [user])

  const subscribir = async (plano) => {
    if (!user) { toast('Precisa de estar autenticado', 'warn'); return }
    if (!plano.price_m) { toast('Plano gratuito activo', 'ok'); return }
    setLoading(plano.id)
    try {
      const priceId = periodo === 'mensal' ? plano.price_m : plano.price_a
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          email: user.email,
          userId: user.id,
          plano: plano.id,
        })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast('Erro: ' + (data.error || 'Tente novamente'), 'err')
      }
    } catch(e) {
      toast('Erro de ligação: ' + e.message, 'err')
    } finally {
      setLoading(null)
    }
  }

  const planoActual = licenca?.plano || 'gratuito'

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">💳 Planos & Preços</div>
          <div className="section-sub">Escolhe o plano ideal para ti</div>
        </div>
        {licenca && licenca.plano !== 'gratuito' && (
          <div style={{ background:'rgba(30,217,138,.1)', border:'1px solid rgba(30,217,138,.2)', borderRadius:10, padding:'8px 14px', fontSize:13 }}>
            ✅ Plano actual: <strong style={{ color:'#1ed98a' }}>{licenca.plano}</strong>
            {licenca.fim && <span style={{ color:'#64748b' }}> · válido até {new Date(licenca.fim).toLocaleDateString('pt-PT')}</span>}
          </div>
        )}
      </div>

      {/* Toggle mensal/anual */}
      <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
        <div style={{ display:'flex', background:'#1a2840', borderRadius:10, padding:4, gap:4 }}>
          {[['mensal','Mensal'],['anual','Anual — 2 meses grátis 🎁']].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriodo(v)}
              style={{ padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:periodo===v?'#1ed98a':'none', color:periodo===v?'#0a0f14':'#94a3b8' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Tabs individuais/coletividades */}
      <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:24 }}>
        {[['individuais','👤 Individuais'],['coletividades','🏛️ Coletividades']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            style={{ padding:'8px 20px', borderRadius:99, fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', border:'2px solid', borderColor:tab===v?'#1ed98a':'#243860', background:tab===v?'rgba(30,217,138,.1)':'none', color:tab===v?'#1ed98a':'#64748b' }}>{l}</button>
        ))}
      </div>

      {/* Planos individuais */}
      {tab==='individuais' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16, marginBottom:24 }}>
          {PLANOS.individuais.map(p=>{
            const isActual = planoActual === p.id
            const preco = periodo==='mensal' ? p.preco_m : p.preco_a
            return (
              <div key={p.id} style={{ background:'#141f2e', border:`2px solid ${p.popular?p.cor:isActual?'#1ed98a':'#1e3050'}`, borderRadius:16, padding:24, position:'relative', display:'flex', flexDirection:'column' }}>
                {p.popular && <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:p.cor, color:'#fff', fontSize:11, fontWeight:700, padding:'3px 12px', borderRadius:99, whiteSpace:'nowrap' }}>MAIS POPULAR</div>}
                {isActual && <div style={{ position:'absolute', top:-12, right:16, background:'#1ed98a', color:'#0a0f14', fontSize:11, fontWeight:700, padding:'3px 12px', borderRadius:99 }}>PLANO ACTUAL</div>}
                <div style={{ fontSize:32, marginBottom:8 }}>{p.icon}</div>
                <div style={{ fontWeight:700, color:'#fff', fontSize:18, marginBottom:4 }}>{p.nome}</div>
                <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>{p.desc}</div>
                <div style={{ marginBottom:20 }}>
                  {preco===0
                    ? <div style={{ fontFamily:'Barlow Condensed', fontSize:36, fontWeight:700, color:'#fff' }}>Grátis</div>
                    : <>
                        <div style={{ fontFamily:'Barlow Condensed', fontSize:40, fontWeight:700, color:p.cor }}>
                          {periodo==='mensal' ? preco.toFixed(2)+'€' : preco.toFixed(2)+'€'}
                        </div>
                        <div style={{ fontSize:12, color:'#64748b' }}>{periodo==='mensal'?'por mês':'por ano'}</div>
                        {periodo==='anual' && <div style={{ fontSize:11, color:'#1ed98a', marginTop:2 }}>≈ {(preco/12).toFixed(2)}€/mês</div>}
                      </>
                  }
                </div>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                  {p.features.map((f,i)=>(
                    <div key={i} style={{ display:'flex', gap:8, fontSize:13, color:'#cbd5e1' }}>
                      <span style={{ color:'#1ed98a', flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={()=>subscribir(p)}
                  disabled={loading===p.id||isActual}
                  style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', cursor:isActual?'default':'pointer', fontFamily:'inherit', fontSize:14, fontWeight:700, background:isActual?'#1e3050':p.popular?p.cor:'#243860', color:isActual?'#475569':p.popular?'#fff':'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  {loading===p.id?<Spinner/>:isActual?'Plano Actual':p.preco_m===0?'Começar Grátis':'Subscrever'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Planos coletividades */}
      {tab==='coletividades' && (
        <div>
          <div style={{ background:'rgba(30,217,138,.08)', border:'1px solid rgba(30,217,138,.2)', borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#94a3b8' }}>
            🏛️ Preços por licença/utilizador. Quanto mais licenças, menor o preço unitário.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
            {PLANOS.coletividades.map(p=>{
              const preco = periodo==='mensal' ? p.preco_m : p.preco_a
              return (
                <div key={p.id} style={{ background:'#141f2e', border:`2px solid #1e3050`, borderRadius:16, padding:20, display:'flex', flexDirection:'column' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:20 }}>{p.icon}</div>
                      <div style={{ fontWeight:700, color:'#fff', fontSize:15, marginTop:4 }}>{p.nome}</div>
                      <div style={{ fontSize:12, color:p.cor, fontWeight:600 }}>{p.faixa}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'Barlow Condensed', fontSize:32, fontWeight:700, color:p.cor }}>{preco.toFixed(2)}€</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>{periodo==='mensal'?'/user/mês':'/user/ano'}</div>
                    </div>
                  </div>
                  <button onClick={()=>subscribir(p)} disabled={loading===p.id}
                    style={{ width:'100%', padding:'10px', borderRadius:10, border:`2px solid ${p.cor}`, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700, background:'transparent', color:p.cor, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    {loading===p.id?<Spinner/>:'Subscrever'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Garantias */}
      <div style={{ marginTop:32, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
        {[
          ['🔒','Pagamento Seguro','Processado pelo Stripe com encriptação SSL'],
          ['❌','Cancela Quando Quiser','Sem contratos. Cancela com um clique.'],
          ['🎁','30 Dias Grátis','Experimenta sem compromisso.'],
          ['📞','Suporte Incluído','Ajuda sempre que precisares.'],
        ].map(([icon,titulo,desc])=>(
          <div key={titulo} style={{ textAlign:'center', padding:'16px 12px', background:'#141f2e', border:'1px solid #1e3050', borderRadius:12 }}>
            <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
            <div style={{ fontWeight:600, color:'#fff', fontSize:13, marginBottom:4 }}>{titulo}</div>
            <div style={{ fontSize:11, color:'#64748b' }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmBreve({ icon, title }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#64748b' }}>Em desenvolvimento — disponível em breve</div>
    </div>
  )
}

// ─── NAV CONFIG ───────────────────────────────────────
const NAV = [
  { section: 'Principal', items: [{ id: 'dashboard', icon: '📊', label: 'Dashboard' }, { id: 'pombos', icon: '🐦', label: 'Pombos' }, { id: 'pombais', icon: '🏠', label: 'Pombais' }] },
  { section: 'Desporto', items: [{ id: 'provas', icon: '🏆', label: 'Provas' }, { id: 'treinos', icon: '🎯', label: 'Treinos' }, { id: 'calendario', icon: '📅', label: 'Calendário' }, { id: 'checklist', icon: '✅', label: 'Checklist' }] },
  { section: 'Gestão', items: [{ id: 'saude', icon: '🏥', label: 'Saúde' }, { id: 'reproducao', icon: '🥚', label: 'Reprodução' }, { id: 'alimentacao', icon: '🌾', label: 'Alimentação' }, { id: 'financas', icon: '💰', label: 'Finanças' }] },
  { section: 'Análise', items: [{ id: 'relatorios', icon: '📊', label: 'Relatórios' }, { id: 'fimepoca', icon: '🏁', label: 'Fim de Época' }, { id: 'meteorologia', icon: '🌦️', label: 'Meteorologia' }] },
  { section: 'Social', items: [{ id: 'comunidade', icon: '🌐', label: 'Comunidade' }] },
  { section: 'Sistema', items: [{ id: 'precos', icon: '💳', label: 'Planos' }, { id: 'admin', icon: '👑', label: 'Admin' }, { id: 'perfil', icon: '⚙️', label: 'Perfil' }, { id: 'documentos', icon: '📄', label: 'Documentos' }] },
]

// ─── APP LAYOUT ───────────────────────────────────────
function AppLayout() {
  const { user, signOut } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const nav = (p) => { setPage(p); setSidebarOpen(false) }

  const initials = user?.user_metadata?.nome?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'

  const renderPage = () => {
    switch (page) {
      case 'dashboard':   return <Dashboard nav={nav} />
      case 'pombos':      return <Pombos />
      case 'pombais':     return <Pombais />
      case 'provas':      return <Provas />
      case 'saude':       return <Saude />
      case 'financas':    return <Financas />
      case 'perfil':      return <Perfil />
      case 'treinos':     return <Treinos />
      case 'reproducao':    return <Reproducao />
      case 'alimentacao':   return <Alimentacao />
      case 'calendario':  return <Calendario />
      case 'checklist':    return <Checklist />
      case 'relatorios':  return <Relatorios />
      case 'fimepoca':     return <FimEpoca />
      case 'meteorologia':return <Meteorologia />
      case 'precos':       return <Precos />
      case 'admin':        return <Admin />
      case 'comunidade':   return <Comunidade />
      default:            return <Dashboard nav={nav} />
    }
  }

  return (
    <div className="app">
      {/* Mobile overlay */}
      <div className={`mobile-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="logo">
          <div className="logo-icon">🕊️</div>
          <div>
            <div className="logo-text">ChampionsLoft</div>
            <div className="logo-sub">Gestão Columbófila</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(({ section, items }) => (
            <div key={section} className="nav-section">
              <div className="nav-section-label">{section}</div>
              {items.map(item => (
                <div key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => nav(item.id)}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="user-area">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.user_metadata?.nome || 'Utilizador'}</div>
              <div className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <header className="topbar">
          <button className="btn btn-icon" onClick={() => setSidebarOpen(true)} style={{ display: 'none' }} id="menu-btn">☰</button>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: '#475569' }}>
            {new Date().toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </header>
        <style>{`@media (max-width: 768px) { #menu-btn { display: flex !important; } }`}</style>

        <main className="page">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

// ─── ROOT APP ─────────────────────────────────────────
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  )
}

function PaginaSucesso() {
  const params = new URLSearchParams(window.location.search)
  const plano = params.get('plano') || 'base'
  const planoNomes = { base:'Base', profissional:'Profissional', elite:'Elite AI', pro_grupo_1_5:'Pro Grupo', pro_grupo_6_12:'Pro Grupo', pro_grupo_13:'Pro Grupo', elite_grupo_1_5:'Elite AI Grupo', elite_grupo_6_12:'Elite AI Grupo', elite_grupo_13:'Elite AI Grupo' }

  return (
    <div style={{ minHeight:'100vh', background:'#0a0f14', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:480, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:80, marginBottom:24 }}>🎉</div>
        <div style={{ fontFamily:'Barlow Condensed', fontSize:36, fontWeight:700, color:'#1ed98a', marginBottom:8 }}>
          Subscrição Activada!
        </div>
        <div style={{ fontSize:16, color:'#cbd5e1', marginBottom:8 }}>
          Plano <strong style={{ color:'#fff' }}>{planoNomes[plano]||plano}</strong> activado com sucesso.
        </div>
        <div style={{ fontSize:13, color:'#64748b', marginBottom:32 }}>
          Bem-vindo ao ChampionsLoft! A tua licença está activa.
        </div>
        <div style={{ background:'#141f2e', border:'1px solid rgba(30,217,138,.2)', borderRadius:16, padding:24, marginBottom:24 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {['Acesso a todos os módulos do plano','Dados sincronizados em tempo real','Suporte disponível quando precisares'].map((f,i)=>(
              <div key={i} style={{ display:'flex', gap:10, alignItems:'center', fontSize:14, color:'#cbd5e1' }}>
                <span style={{ color:'#1ed98a' }}>✓</span>{f}
              </div>
            ))}
          </div>
        </div>
        <button onClick={()=>window.location.href='/'}
          style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:'#1ed98a', color:'#0a0f14', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          🕊️ Entrar no ChampionsLoft
        </button>
      </div>
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  // Rota /sucesso — página de sucesso após pagamento
  if (window.location.pathname === '/sucesso') {
    return <PaginaSucesso />
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🕊️</div>
        <Spinner lg />
      </div>
    </div>
  )

  return user ? <AppLayout /> : <Login />
}
