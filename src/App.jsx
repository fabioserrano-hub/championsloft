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
        const [pombos, provas, fin] = await Promise.all([db.getPombos(), db.getProvas(), db.getFinancas()])
        const ano = new Date().getFullYear()
        const finAno = fin.filter(t => new Date(t.data_reg).getFullYear() === ano)
        const rec = finAno.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.val || 0), 0)
        const dep = finAno.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (t.val || 0), 0)
        setData({ pombos, provas, saldo: rec - dep, ativos: pombos.filter(p => p.estado === 'ativo').length, top: [...pombos].sort((a, b) => (b.percentil || 0) - (a.percentil || 0)).slice(0, 5) })
      } catch (e) { toast('Erro ao carregar: ' + e.message, 'err') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spinner lg /></div>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{saudacao}, {nome} 👋</h1>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="grid-4 mb-6">
        <KpiCard icon="🐦" label="Pombos Activos" value={data.ativos} color="text-green" onClick={() => nav('pombos')} />
        <KpiCard icon="🏆" label="Provas" value={data.provas.length} color="text-yellow" onClick={() => nav('provas')} />
        <KpiCard icon="💶" label={`Saldo ${new Date().getFullYear()}`} value={`${data.saldo >= 0 ? '+' : ''}${data.saldo.toFixed(0)}€`} color={data.saldo >= 0 ? 'text-green' : 'text-red'} onClick={() => nav('financas')} />
        <KpiCard icon="🏠" label="Total Pombos" value={data.pombos.length} onClick={() => nav('pombos')} />
      </div>

      <div className="grid-2">
        <div className="card card-p">
          <div className="flex items-center justify-between mb-4">
            <div style={{ fontWeight: 600, color: '#fff' }}>🏅 Ranking</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('pombos')}>Ver todos →</button>
          </div>
          {data.top.length === 0
            ? <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '20px 0' }}>Sem pombos ainda</div>
            : data.top.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < data.top.length - 1 ? '1px solid #1e3050' : 'none' }}>
                <span style={{ fontFamily: 'Barlow Condensed', fontSize: 18, fontWeight: 700, width: 20, color: i === 0 ? '#facc15' : i === 1 ? '#cbd5e1' : i === 2 ? '#b45309' : '#475569' }}>{i + 1}</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a2840', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden', flexShrink: 0 }}>
                  {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#64748b' }}>{p.anilha}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1ed98a' }}>{p.percentil || 0}%</div>
              </div>
            ))
          }
        </div>

        <div className="card card-p">
          <div className="flex items-center justify-between mb-4">
            <div style={{ fontWeight: 600, color: '#fff' }}>🏆 Provas Recentes</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('provas')}>Ver todas →</button>
          </div>
          {data.provas.length === 0
            ? <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '20px 0' }}>Sem provas registadas</div>
            : data.provas.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1e3050' }}>
                <span style={{ fontSize: 18 }}>🏆</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{p.dist}km · {p.local_solta || '—'}</div>
                </div>
                {p.lugar && <div style={{ fontFamily: 'Barlow Condensed', fontSize: 18, fontWeight: 700, color: '#facc15' }}>{p.lugar}º</div>}
              </div>
            ))
          }
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
  const [filtro, setFiltro] = useState('todos')
  const [anilhaPais, setAnilhaPais] = useState('PT')
  const [anilhaAno, setAnilhaAno] = useState(String(new Date().getFullYear()))
  const [anilhaNum, setAnilhaNum] = useState('')
  const FILTROS = [{id:'todos',label:'Todos'},{id:'M',label:'♂ Machos'},{id:'F',label:'♀ Fêmeas'},{id:'ativo',label:'Voadores'},{id:'reproducao',label:'Reprodução'},{id:'lesionado',label:'Lesionados'},{id:'velocidade',label:'Velocidade'},{id:'meio_fundo',label:'Meio-Fundo'},{id:'fundo',label:'Fundo'},{id:'grande_fundo',label:'G.Fundo'}]
  const EMPTY = { anilha: '', nome: '', sexo: 'M', cor: '', peso: '', esp: ['velocidade'], estado: 'ativo', pombal: '', pai: '', mae: '', obs: '', emoji: '🐦' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const [p, pb] = await Promise.all([db.getPombos(), db.getPombais()]); setPombos(p); setPombais(pb) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = pombos.filter(p => {
    const matchSearch = !search || p.nome?.toLowerCase().includes(search.toLowerCase()) || p.anilha?.toLowerCase().includes(search.toLowerCase())
    const matchFiltro = filtro==='todos' || p.sexo===filtro || p.estado===filtro || (p.esp||[]).includes(filtro)
    return matchSearch && matchFiltro
  })

  const openNew = () => {
    setAnilhaPais('PT'); setAnilhaAno(String(anoAtual)); setAnilhaNum('')
    setForm({ ...EMPTY, pombal: pombais[0]?.nome || '' })
    setPhotoFile(null); setPhotoPreview(null); setSelected(null); setModal('form')
  }
  const openEdit = (p) => { setSelected(p); setForm({ anilha: p.anilha || '', nome: p.nome || '', sexo: p.sexo || 'M', cor: p.cor || '', peso: p.peso || '', esp: p.esp || ['velocidade'], estado: p.estado || 'ativo', pombal: p.pombal || '', pai: p.pai || '', mae: p.mae || '', obs: p.obs || '', emoji: p.emoji || '🐦' }); setPhotoPreview(p.foto_url || null); setPhotoFile(null); setModal('form') }
  const openDetail = (p) => { setSelected(p); setModal('detail') }
  const close = () => { setModal(null); setSelected(null); setPhotoFile(null); setPhotoPreview(null) }

  const toggleEsp = (e) => sf('esp', form.esp.includes(e) ? form.esp.filter(x => x !== e) : [...form.esp, e])

  const save = async () => {
    if (!form.anilha.trim()) { toast('Anel obrigatório', 'warn'); return }
    if (!form.nome.trim()) { toast('Nome obrigatório', 'warn'); return }
    setSaving(true)
    try {
      const anilhaFinal = form.anilha.trim() || `${anilhaPais}-${anilhaAno}-${anilhaNum.padStart(5,'0')}`
      const paiFinal = form.pai.trim() || (form.paiBiNum ? `${form.paiBiPais}-${form.paiBiAno}-${form.paiBiNum.padStart(5,'0')}` : '')
      const maeFinal = form.mae.trim() || (form.maeBiNum ? `${form.maeBiPais}-${form.maeBiAno}-${form.maeBiNum.padStart(5,'0')}` : '')
      const payload = { anilha: anilhaFinal, nome: form.nome.trim(), sexo: form.sexo, cor: form.cor, peso: form.peso ? parseInt(form.peso) : null, esp: form.esp, estado: form.estado, pombal: form.pombal, pai: paiFinal, mae: maeFinal, obs: form.obs, emoji: form.emoji, provas: selected?.provas||0, percentil: selected?.percentil||0, forma: selected?.forma||50 }
      let saved
      if (selected) saved = await db.updatePombo(selected.id, payload)
      else saved = await db.createPombo(payload)
      if (photoFile && saved?.id && user?.id) {
        try { const url = await db.uploadFoto(user.id, saved.id, photoFile); await db.updatePombo(saved.id, { foto_url: url }) }
        catch (e) { toast('Foto não guardada: ' + e.message, 'warn') }
      }
      toast(selected ? 'Pombo actualizado!' : `${form.nome} adicionado!`, 'ok')
      close(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deletePombo(confirm.id); toast('Eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const ESPS = [['velocidade', 'Velocidade'], ['meio_fundo', 'Meio-Fundo'], ['fundo', 'Fundo'], ['grande_fundo', 'G. Fundo']]
  const statusBadge = { ativo: 'green', reproducao: 'yellow', lesionado: 'red', inativo: 'gray' }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Pombos</div><div className="section-sub">{pombos.length} registados</div></div>
        <button className="btn btn-primary" onClick={openNew}>＋ Novo Pombo</button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
        <input className="input" placeholder="🔍 Pesquisar por nome ou anel..." value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {FILTROS.map(f=><button key={f.id} onClick={()=>setFiltro(f.id)} className={`chip${filtro===f.id?' active':''}`} style={{ fontSize:11 }}>{f.label}</button>)}
        </div>
        <div style={{ fontSize:12, color:'#64748b' }}>{filtered.length} pombo(s)</div>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : filtered.length === 0 ? <EmptyState icon="🐦" title="Sem pombos" desc="Adicione o seu primeiro pombo" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Pombo</button>} />
          : (
            <div className="grid-auto">
              {filtered.map(p => {
                const fc = (p.forma || 50) >= 80 ? '#1ed98a' : (p.forma || 50) >= 60 ? '#facc15' : '#f87171'
                return (
                  <div key={p.id} className="pombo-card" onClick={() => openDetail(p)}>
                    <div className="pombo-photo" style={{ height:160 }}>
                      {p.foto_url ? <img src={p.foto_url} alt={p.nome} /> : p.emoji}
                      <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', borderRadius: 6, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>
                        {p.sexo === 'M' ? '♂' : '♀'}
                      </div>
                    </div>
                    <div className="pombo-info">
                      <div className="pombo-anel">{p.anilha}</div>
                      <div className="pombo-nome">{p.nome}</div>
                      <Badge v={statusBadge[p.estado]}>{p.estado}</Badge>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        <div className="progress" style={{ flex: 1 }}>
                          <div className="progress-bar" style={{ width: `${p.forma || 50}%`, background: fc }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: fc }}>{p.forma || 50}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
      }

      {/* Form modal */}
      <Modal open={modal === 'form'} onClose={close} title={selected ? `✏️ Editar — ${selected.nome}` : '🐦 Novo Pombo'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null} {selected ? 'Guardar' : 'Adicionar'}</button></>}>
        <div className="form-grid">
          <div className="col-2" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 14, border: '2px dashed #243860', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => document.getElementById('photo-up').click()}>
              {photoPreview ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 32 }}>{form.emoji}</span>}
            </div>
            <div>
              <input type="file" id="photo-up" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) } }} />
              <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('photo-up').click()}>📸 Foto</button>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>JPG, PNG. Máx 5MB</div>
            </div>
          </div>
          <Field label="Anel *">
            <div style={{ display:'flex', gap:4 }}>
              <select className="input" style={{ width:70 }} value={anilhaPais} onChange={e=>setAnilhaPais(e.target.value)}>
                {paises.map(p=><option key={p}>{p}</option>)}
              </select>
              <select className="input" style={{ width:90 }} value={anilhaAno} onChange={e=>setAnilhaAno(e.target.value)}>
                {anos.map(a=><option key={a}>{a}</option>)}
              </select>
              <input className="input" style={{ flex:1 }} placeholder="00000" value={anilhaNum} onChange={e=>setAnilhaNum(e.target.value.replace(/\D/,''))} maxLength={5}/>
            </div>
            <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>
              Anilha: {anilhaPais}-{anilhaAno}-{anilhaNum.padStart(5,'0')||'?????'}
            </div>
          </Field>
          <Field label="Nome *"><input className="input" placeholder="Nome do pombo" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field>
          <Field label="Sexo"><select className="input" value={form.sexo} onChange={e => sf('sexo', e.target.value)}><option value="M">♂ Macho</option><option value="F">♀ Fêmea</option></select></Field>
          <Field label="Estado"><select className="input" value={form.estado} onChange={e => sf('estado', e.target.value)}>{['ativo', 'reproducao', 'lesionado', 'inativo'].map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Cor / Aspecto">
            <select className="input" value={form.cor} onChange={e=>sf('cor',e.target.value)}>
              <option value="">— Seleccionar —</option>
              {CORES_POMBO.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Peso (g)"><input className="input" type="number" placeholder="420" value={form.peso} onChange={e => sf('peso', e.target.value)} /></Field>
          <Field label="Pombal"><select className="input" value={form.pombal} onChange={e => sf('pombal', e.target.value)}><option value="">— Sem pombal —</option>{pombais.map(pb => <option key={pb.id}>{pb.nome}</option>)}</select></Field>
          <div className="col-2">
            <Field label="Especialidades">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {ESPS.map(([v, l]) => <button key={v} type="button" className={`chip${form.esp.includes(v) ? ' active' : ''}`} onClick={() => toggleEsp(v)}>{l}</button>)}
              </div>
            </Field>
          </div>
          <Field label="Anel do Pai"><input className="input font-mono" style={{ fontSize: 11 }} placeholder="PT-0000-00000" value={form.pai} onChange={e => sf('pai', e.target.value.toUpperCase())} /></Field>
          <Field label="Anel da Mãe"><input className="input font-mono" style={{ fontSize: 11 }} placeholder="PT-0000-00000" value={form.mae} onChange={e => sf('mae', e.target.value.toUpperCase())} /></Field>
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize: 'none' }} value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field></div>
        </div>
      </Modal>

      {/* Detail modal */}
      {selected && (
        <Modal open={modal === 'detail'} onClose={close} title={`${selected.emoji} ${selected.nome}`} wide
          footer={
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button className="btn btn-danger btn-sm" onClick={() => { close(); setConfirm(selected) }}>🗑️ Eliminar</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={close}>Fechar</button>
              <button className="btn btn-primary" onClick={() => openEdit(selected)}>✏️ Editar</button>
            </div>
          }>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ width: 80, height: 80, borderRadius: 14, background: '#1a2840', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, overflow: 'hidden', flexShrink: 0, border: '1px solid #243860' }}>
              {selected.foto_url ? <img src={selected.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : selected.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#1ed98a' }}>{selected.anilha}</span>
                <Badge v={statusBadge[selected.estado]}>{selected.estado}</Badge>
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 2 }}>{selected.sexo === 'M' ? '♂ Macho' : '♀ Fêmea'} · {selected.cor || '—'}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>🏠 {selected.pombal || '—'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
              {[['provas', 'Provas', '#facc15'], ['percentil', 'Percentil %', '#1ed98a'], ['forma', 'Forma %', '#60a5fa']].map(([k, l, c]) => (
                <div key={k}><div style={{ fontFamily: 'Barlow Condensed', fontSize: 24, fontWeight: 700, color: c }}>{selected[k] ?? 0}</div><div style={{ fontSize: 10, color: '#64748b' }}>{l}</div></div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><div className="label">Pai</div><div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#1ed98a' }}>{selected.pai || '—'}</div></div>
            <div><div className="label">Mãe</div><div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#1ed98a' }}>{selected.mae || '—'}</div></div>
          </div>
          {selected.obs && <div style={{ marginTop: 12 }}><div className="label">Observações</div><div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>{selected.obs}</div></div>}
        </Modal>
      )}

      {/* Confirm delete */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar pombo"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Tem a certeza que quer eliminar "{confirm?.nome}"? Esta acção não pode ser desfeita.</p>
      </Modal>
    </div>
  )
}

// ─── POMBAIS PAGE ─────────────────────────────────────
function Pombais() {
  const toast = useToast()
  const [pombais, setPombais] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
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
        {[['lista','📋 Lista'],['resultados','🏅 Resultados'],['encestamento','📦 Encestamento'],['mapa','🗺️ Mapa']].map(([t,l])=>(
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
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [pedigreeP, setPedigreeP] = useState(null)
  const [selectedAca, setSelectedAca] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const EMPTY = { pai_id:'', mae_id:'', inicio:new Date().toISOString().slice(0,10), obs:'' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const [a, p, pr] = await Promise.all([
        supabase.from('breeding').select('*').order('created_at', { ascending: false }).then(r => r.data || []),
        supabase.from('pigeons').select('*').order('nome').then(r => r.data || []),
        supabase.from('perfis').select('*').eq('user_id', user.id).single().then(r => r.data || null),
      ])
      setAcas(a); setPombos(p); setPerfil(pr)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  const machos = pombos.filter(p=>p.sexo==='M')
  const femeas = pombos.filter(p=>p.sexo==='F')

  const save = async () => {
    if (!form.pai_id) { toast('Seleccione o macho','warn'); return }
    if (!form.mae_id) { toast('Seleccione a fêmea','warn'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const pai = pombos.find(p=>p.id===form.pai_id)
      const mae = pombos.find(p=>p.id===form.mae_id)
      const { error } = await supabase.from('breeding').insert({
        pai_id: form.pai_id, mae_id: form.mae_id,
        pai_nome: pai ? `${pai.nome} (${pai.anilha})` : '',
        mae_nome: mae ? `${mae.nome} (${mae.anilha})` : '',
        inicio: form.inicio, obs: form.obs,
        ninhadas: 0, estado: 'em_progresso', user_id: user.id
      })
      if (error) throw error
      toast('Acasalamento registado!','ok'); setModal(false); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try {
      const { error } = await supabase.from('breeding').delete().eq('id', confirm.id)
      if (error) throw error
      toast('Eliminado','ok'); setConfirm(null); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const estadoVar = { em_progresso:'yellow', concluido:'green', pausado:'gray' }

  // Pedigree component
  const PedigreeView = ({ pombo }) => {
    if (!pombo) return null
    const pai = pombos.find(p=>p.anilha===pombo.pai)
    const mae = pombos.find(p=>p.anilha===pombo.mae)
    const avoPM = pai ? pombos.find(p=>p.anilha===pai.pai) : null
    const avoMM = pai ? pombos.find(p=>p.anilha===pai.mae) : null
    const avoPF = mae ? pombos.find(p=>p.anilha===mae.pai) : null
    const avoMF = mae ? pombos.find(p=>p.anilha===mae.mae) : null

    const PomboBox = ({ p, gen }) => (
      <div style={{ background:gen===1?'#141f2e':'#0f1923', border:`1px solid ${gen===1?'#1ed98a':'#1e3050'}`, borderRadius:10, padding:'8px 12px', minWidth:160 }}>
        {p ? <>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <span style={{ fontSize:18 }}>{p.emoji||'🐦'}</span>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{p.nome}</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>{p.anilha}</div>
            </div>
          </div>
          <div style={{ fontSize:10, color:'#64748b' }}>{p.sexo==='M'?'♂':'♀'} · {p.cor||'—'}</div>
          {p.percentil>0&&<div style={{ fontSize:10, color:'#facc15', marginTop:2 }}>⭐ {p.percentil}% percentil</div>}
        </> : <div style={{ fontSize:11, color:'#475569', fontStyle:'italic' }}>Desconhecido</div>}
      </div>
    )

    return (
      <div>
        {/* Header para impressão */}
        <div style={{ background:'linear-gradient(135deg,#0f1923,#141f2e)', border:'1px solid #1e3050', borderRadius:16, padding:'20px 24px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <div style={{ width:60, height:60, borderRadius:12, background:'rgba(30,217,138,.1)', border:'1px solid rgba(30,217,138,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>
              {pombo.foto_url ? <img src={pombo.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:12 }}/> : pombo.emoji||'🐦'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'Barlow Condensed', fontSize:28, fontWeight:700, color:'#fff' }}>{pombo.nome}</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize:12, color:'#1ed98a' }}>{pombo.anilha}</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>
                {pombo.sexo==='M'?'♂ Macho':'♀ Fêmea'} · {pombo.cor||'—'} · {pombo.esp?.join(', ')||'—'}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              {perfil?.nome&&<div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>🏆 {perfil.nome}</div>}
              {perfil?.org&&<div style={{ fontSize:11, color:'#64748b' }}>{perfil.org}</div>}
              {perfil?.fed&&<div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>FCP: {perfil.fed}</div>}
            </div>
          </div>
          {pombo.percentil>0&&(
            <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #1e3050', display:'flex', gap:20 }}>
              <div style={{ textAlign:'center' }}><div style={{ fontFamily:'Barlow Condensed', fontSize:24, fontWeight:700, color:'#facc15' }}>{pombo.percentil}%</div><div style={{ fontSize:10, color:'#64748b' }}>PERCENTIL</div></div>
              <div style={{ textAlign:'center' }}><div style={{ fontFamily:'Barlow Condensed', fontSize:24, fontWeight:700, color:'#1ed98a' }}>{pombo.provas||0}</div><div style={{ fontSize:10, color:'#64748b' }}>PROVAS</div></div>
              <div style={{ textAlign:'center' }}><div style={{ fontFamily:'Barlow Condensed', fontSize:24, fontWeight:700, color:'#60a5fa' }}>{pombo.forma||50}%</div><div style={{ fontSize:10, color:'#64748b' }}>FORMA</div></div>
            </div>
          )}
        </div>

        {/* Árvore genealógica */}
        <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>🌳 Árvore Genealógica — 3 Gerações</div>
        <div style={{ overflowX:'auto' }}>
          <div style={{ display:'flex', gap:0, alignItems:'stretch', minWidth:600 }}>
            {/* Geração 1 — sujeito */}
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', marginRight:24 }}>
              <PomboBox p={pombo} gen={1}/>
            </div>
            {/* Linha conectora */}
            <div style={{ width:24, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
              <div style={{ width:2, flex:1, background:'#1e3050' }}/>
              <div style={{ width:24, height:2, background:'#1e3050' }}/>
              <div style={{ width:2, flex:1, background:'#1e3050' }}/>
            </div>
            {/* Geração 2 — pais */}
            <div style={{ display:'flex', flexDirection:'column', gap:12, justifyContent:'center', marginRight:24 }}>
              <PomboBox p={pai} gen={2}/>
              <PomboBox p={mae} gen={2}/>
            </div>
            {/* Geração 3 — avós */}
            <div style={{ display:'flex', flexDirection:'column', gap:6, justifyContent:'center' }}>
              <PomboBox p={avoPM} gen={3}/>
              <PomboBox p={avoMM} gen={3}/>
              <PomboBox p={avoPF} gen={3}/>
              <PomboBox p={avoMF} gen={3}/>
            </div>
          </div>
        </div>

        <div style={{ marginTop:16, display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={()=>window.print()}>🖨️ Imprimir Pedigree</button>
          <button className="btn btn-secondary" onClick={()=>setPedigreeP(null)}>✕ Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Reprodução</div><div className="section-sub">{acas.length} acasalamentos · {acas.filter(a=>a.estado==='em_progresso').length} activos</div></div>
        {tab==='acasalamentos'&&<button className="btn btn-primary" onClick={()=>{ setForm(EMPTY); setModal(true) }}>＋ Novo Acasalamento</button>}
        {tab==='pedigree'&&<button className="btn btn-secondary" onClick={()=>setPedigreeP(null)}>Limpar</button>}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
        {[['acasalamentos','🥚 Acasalamentos'],['ninhadas','🐣 Ninhadas'],['pedigree','🌳 Pedigree']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'#1ed98a':'none', color:tab===t?'#0a0f14':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {tab==='acasalamentos' && (
        loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
        : acas.length===0 ? <EmptyState icon="🥚" title="Sem acasalamentos" desc="Registe o primeiro par reprodutor" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>＋ Novo Acasalamento</button>} />
        : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {acas.map(a => {
              const pai = pombos.find(p=>p.id===a.pai_id)
              const mae = pombos.find(p=>p.id===a.mae_id)
              return (
                <div key={a.id} className="card card-p" style={{ cursor:'pointer', transition:'all .2s' }}
                  onClick={()=>setSelectedAca(selectedAca?.id===a.id?null:a)}
                  onMouseOver={e=>e.currentTarget.style.borderColor='#243860'}
                  onMouseOut={e=>e.currentTarget.style.borderColor='#1e3050'}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:200 }}>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, overflow:'hidden' }}>
                          {pai?.foto_url?<img src={pai.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:(pai?.emoji||'🐦')}
                        </div>
                        <div style={{ fontSize:11, color:'#60a5fa', marginTop:2 }}>♂</div>
                      </div>
                      <div style={{ fontSize:13, color:'#94a3b8' }}>×</div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, overflow:'hidden' }}>
                          {mae?.foto_url?<img src={mae.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:(mae?.emoji||'🐦')}
                        </div>
                        <div style={{ fontSize:11, color:'#f472b6', marginTop:2 }}>♀</div>
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{a.pai_nome||pai?.nome||'—'}</div>
                        <div style={{ fontSize:12, color:'#64748b' }}>× {a.mae_nome||mae?.nome||'—'}</div>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>desde {a.inicio?new Date(a.inicio).toLocaleDateString('pt-PT'):'—'} · 🥚 {a.ninhadas||0} ninhadas</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <Badge v={estadoVar[a.estado]||'gray'}>{a.estado?.replace('_',' ')}</Badge>
                      <span style={{ fontSize:12, color:'#475569' }}>{selectedAca?.id===a.id?'▲':'▼'}</span>
                      <button className="btn btn-danger btn-sm" onClick={e=>{e.stopPropagation();setConfirm(a)}}>🗑️</button>
                    </div>
                  </div>
                  {selectedAca?.id===a.id&&(
                    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #1e3050' }} onClick={e=>e.stopPropagation()}>
                      <div className="grid-2" style={{ gap:12, marginBottom:12 }}>
                        {[pai,mae].map((p,i)=>p&&(
                          <div key={i} style={{ background:'#1a2840', borderRadius:10, padding:'10px 12px' }}>
                            <div style={{ fontWeight:600, color:i===0?'#60a5fa':'#f472b6', fontSize:12, marginBottom:6 }}>{i===0?'♂ Macho (Pai)':'♀ Fêmea (Mãe)'}</div>
                            <div style={{ fontSize:13, color:'#fff', fontWeight:500 }}>{p.nome}</div>
                            <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>{p.anilha}</div>
                            <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{p.cor||'—'} · {(p.esp||[]).join(', ')||'—'}</div>
                            {p.percentil>0&&<div style={{ fontSize:11, color:'#facc15' }}>⭐ {p.percentil}% percentil</div>}
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={()=>{ setPedigreeP(pai||mae); setTab('pedigree') }}>🌳 Ver Pedigree</button>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto' }}>
                          <span style={{ fontSize:12, color:'#94a3b8' }}>Ninhadas:</span>
                          <button className="btn btn-icon btn-sm" onClick={async()=>{
                            const n=(a.ninhadas||0)-1; if(n<0) return
                            await supabase.from('breeding').update({ninhadas:n}).eq('id',a.id); load()
                          }}>−</button>
                          <span style={{ fontFamily:'Barlow Condensed', fontSize:20, fontWeight:700, color:'#fff' }}>{a.ninhadas||0}</span>
                          <button className="btn btn-icon btn-sm" onClick={async()=>{
                            const n=(a.ninhadas||0)+1
                            await supabase.from('breeding').update({ninhadas:n}).eq('id',a.id); load()
                          }}>＋</button>
                          <select style={{ background:'#1a2840', border:'1px solid #243860', borderRadius:8, color:'#fff', padding:'4px 8px', fontSize:12, fontFamily:'inherit' }}
                            value={a.estado||'em_progresso'}
                            onChange={async e=>{ await supabase.from('breeding').update({estado:e.target.value}).eq('id',a.id); load() }}>
                            <option value="em_progresso">Em Progresso</option>
                            <option value="concluido">Concluído</option>
                            <option value="pausado">Pausado</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
      )}

      {tab==='ninhadas' && (
        <EmptyState icon="🐣" title="Ninhadas" desc="Registe os pares no separador Acasalamentos para ver as ninhadas aqui" />
      )}

      {tab==='pedigree' && (
        <div>
          {!pedigreeP ? (
            <div>
              <div style={{ fontSize:13, color:'#64748b', marginBottom:12 }}>Seleccione um pombo para ver o seu pedigree completo:</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
                {pombos.map(p=>(
                  <button key={p.id} onClick={()=>setPedigreeP(p)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#141f2e', border:'1px solid #1e3050', borderRadius:12, cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .15s' }}
                    onMouseOver={e=>e.currentTarget.style.borderColor='#1ed98a'}
                    onMouseOut={e=>e.currentTarget.style.borderColor='#1e3050'}>
                    <div style={{ width:36, height:36, borderRadius:8, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, overflow:'hidden', flexShrink:0 }}>
                      {p.foto_url?<img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:p.emoji}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{p.nome}</div>
                      <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#1ed98a' }}>{p.anilha}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <PedigreeView pombo={pedigreeP}/>
          )}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="🥚 Novo Acasalamento"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}Registar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="♂ Macho (Pai) *"><select className="input" value={form.pai_id} onChange={e=>sf('pai_id',e.target.value)}><option value="">— Seleccionar macho —</option>{machos.map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field>
          <Field label="♀ Fêmea (Mãe) *"><select className="input" value={form.mae_id} onChange={e=>sf('mae_id',e.target.value)}><option value="">— Seleccionar fêmea —</option>{femeas.map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field>
          <Field label="Data de Início"><input className="input" type="date" value={form.inicio} onChange={e=>sf('inicio',e.target.value)}/></Field>
          <Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e=>sf('obs',e.target.value)}/></Field>
        </div>
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
        supabase.from('tratamentos').select('*').order('nome').then(r=>r.data||[]),
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
      const { error } = await supabase.from('tratamentos').insert({ nome:formProd.nome.trim(), tipo:formProd.tipo, indicacao:formProd.indicacao, dose:formProd.dose, stock:parseFloat(formProd.stock)||0, unidade:formProd.unidade, user_id:user.id })
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

      {/* Modais */}
      <Modal open={modalAlimento} onClose={()=>setModalAlimento(false)} title="🌾 Novo Alimento"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalAlimento(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveAlimento}>Guardar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Ex: Milho, Cevada..." value={formAlim.nome} onChange={e=>sfA('nome',e.target.value)}/></Field></div>
          <Field label="Tipo"><select className="input" value={formAlim.tipo} onChange={e=>sfA('tipo',e.target.value)}>{['Cereal','Leguminosa','Semente','Suplemento','Outro'].map(t=><option key={t}>{t}</option>)}</select></Field>
          <Field label="Preço/kg (€)"><input className="input" type="number" step="0.01" placeholder="0.45" value={formAlim.preco_kg} onChange={e=>sfA('preco_kg',e.target.value)}/></Field>
          <Field label="Stock inicial (kg)"><input className="input" type="number" placeholder="50" value={formAlim.stock} onChange={e=>sfA('stock',e.target.value)}/></Field>
          <Field label="Stock mínimo (kg)"><input className="input" type="number" placeholder="20" value={formAlim.minimo} onChange={e=>sfA('minimo',e.target.value)}/></Field>
        </div>
      </Modal>

      <Modal open={modalRacao} onClose={()=>setModalRacao(false)} title="🥣 Nova Ração" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalRacao(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveRacao}>Guardar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="form-grid">
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
  { section: 'Desporto', items: [{ id: 'provas', icon: '🏆', label: 'Provas' }, { id: 'treinos', icon: '🎯', label: 'Treinos' }, { id: 'calendario', icon: '📅', label: 'Calendário' }] },
  { section: 'Gestão', items: [{ id: 'saude', icon: '🏥', label: 'Saúde' }, { id: 'reproducao', icon: '🥚', label: 'Reprodução' }, { id: 'alimentacao', icon: '🌾', label: 'Alimentação' }, { id: 'financas', icon: '💰', label: 'Finanças' }] },
  { section: 'Análise', items: [{ id: 'relatorios', icon: '📊', label: 'Relatórios' }, { id: 'meteorologia', icon: '🌦️', label: 'Meteorologia' }, { id: 'perfil', icon: '⚙️', label: 'Perfil' }] },
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
      case 'relatorios':  return <Relatorios />
      case 'meteorologia':return <Meteorologia />
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

function AppContent() {
  const { user, loading } = useAuth()

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

