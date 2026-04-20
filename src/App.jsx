import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { createClient } from '@supabase/supabase-js'

// â”€â”€â”€ SUPABASE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const supabase = createClient(
  'https://tgqnbheetpgnpjsjphoj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncW5iaGVldHBnbnBqc2pwaG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTk0NDIsImV4cCI6MjA5MjAzNTQ0Mn0.32ZjOUB-bOAIgtwwpKDVRSJy1w4xlOR7IMb4bRTK3Uo',
  { auth: { persistSession: true, autoRefreshToken: true } }
)

// â”€â”€â”€ DB HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ TOAST CONTEXT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ToastCtx = createContext(null)
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((msg, type = 'ok') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])
  const icons = { ok: 'âœ…', warn: 'âš ï¸', err: 'âŒ', info: 'â„¹ï¸' }
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

// â”€â”€â”€ AUTH CONTEXT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ SHARED COMPONENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          <button className="btn btn-icon" onClick={onClose}>âœ•</button>
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

// â”€â”€â”€ LOGIN PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Login() {
  const { signIn, signUp } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', nome: '' })
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password)
      } else {
        if (!form.nome.trim()) { toast('Nome obrigatÃ³rio', 'warn'); return }
        await signUp(form.email, form.password, { nome: form.nome })
        toast('Conta criada! Verifique o seu email.', 'ok')
        setMode('login')
      }
    } catch (err) {
      const m = err.message?.includes('Invalid login') ? 'Email ou password incorrectos'
        : err.message?.includes('already registered') ? 'Email jÃ¡ registado'
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
          <div style={{ width: 56, height: 56, background: 'rgba(30,217,138,.1)', border: '1px solid rgba(30,217,138,.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>ðŸ•Šï¸</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>ChampionsLoft</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>GestÃ£o ColumbÃ³fila Profissional</div>
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
            <input className="input" type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={form.password} onChange={e => sf('password', e.target.value)} required minLength={6} />
          </Field>
          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 4 }} disabled={loading}>
            {loading ? <Spinner /> : null}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}

// â”€â”€â”€ DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Dashboard({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const nome = user?.user_metadata?.nome?.split(' ')[0] || 'ColumbÃ³filo'
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{saudacao}, {nome} ðŸ‘‹</h1>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="grid-4 mb-6">
        <KpiCard icon="ðŸ¦" label="Pombos Activos" value={data.ativos} color="text-green" onClick={() => nav('pombos')} />
        <KpiCard icon="ðŸ†" label="Provas" value={data.provas.length} color="text-yellow" onClick={() => nav('provas')} />
        <KpiCard icon="ðŸ’¶" label={`Saldo ${new Date().getFullYear()}`} value={`${data.saldo >= 0 ? '+' : ''}${data.saldo.toFixed(0)}â‚¬`} color={data.saldo >= 0 ? 'text-green' : 'text-red'} onClick={() => nav('financas')} />
        <KpiCard icon="ðŸ " label="Total Pombos" value={data.pombos.length} onClick={() => nav('pombos')} />
      </div>

      <div className="grid-2">
        <div className="card card-p">
          <div className="flex items-center justify-between mb-4">
            <div style={{ fontWeight: 600, color: '#fff' }}>ðŸ… Ranking</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('pombos')}>Ver todos â†’</button>
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
            <div style={{ fontWeight: 600, color: '#fff' }}>ðŸ† Provas Recentes</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('provas')}>Ver todas â†’</button>
          </div>
          {data.provas.length === 0
            ? <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '20px 0' }}>Sem provas registadas</div>
            : data.provas.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1e3050' }}>
                <span style={{ fontSize: 18 }}>ðŸ†</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{p.dist}km Â· {p.local_solta || 'â€”'}</div>
                </div>
                {p.lugar && <div style={{ fontFamily: 'Barlow Condensed', fontSize: 18, fontWeight: 700, color: '#facc15' }}>{p.lugar}Âº</div>}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€ POMBOS PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const EMPTY = { anilha: '', nome: '', sexo: 'M', cor: '', peso: '', esp: ['velocidade'], estado: 'ativo', pombal: '', pai: '', mae: '', obs: '', emoji: 'ðŸ¦' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const [p, pb] = await Promise.all([db.getPombos(), db.getPombais()]); setPombos(p); setPombais(pb) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = pombos.filter(p =>
    !search || p.nome?.toLowerCase().includes(search.toLowerCase()) || p.anilha?.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => { setForm({ ...EMPTY, pombal: pombais[0]?.nome || '' }); setPhotoFile(null); setPhotoPreview(null); setSelected(null); setModal('form') }
  const openEdit = (p) => { setSelected(p); setForm({ anilha: p.anilha || '', nome: p.nome || '', sexo: p.sexo || 'M', cor: p.cor || '', peso: p.peso || '', esp: p.esp || ['velocidade'], estado: p.estado || 'ativo', pombal: p.pombal || '', pai: p.pai || '', mae: p.mae || '', obs: p.obs || '', emoji: p.emoji || 'ðŸ¦' }); setPhotoPreview(p.foto_url || null); setPhotoFile(null); setModal('form') }
  const openDetail = (p) => { setSelected(p); setModal('detail') }
  const close = () => { setModal(null); setSelected(null); setPhotoFile(null); setPhotoPreview(null) }

  const toggleEsp = (e) => sf('esp', form.esp.includes(e) ? form.esp.filter(x => x !== e) : [...form.esp, e])

  const save = async () => {
    if (!form.anilha.trim()) { toast('Anel obrigatÃ³rio', 'warn'); return }
    if (!form.nome.trim()) { toast('Nome obrigatÃ³rio', 'warn'); return }
    setSaving(true)
    try {
      const payload = { anilha: form.anilha.trim(), nome: form.nome.trim(), sexo: form.sexo, cor: form.cor, peso: form.peso ? parseInt(form.peso) : null, esp: form.esp, estado: form.estado, pombal: form.pombal, pai: form.pai, mae: form.mae, obs: form.obs, emoji: form.emoji, provas: 0, percentil: 0, forma: 50 }
      let saved
      if (selected) saved = await db.updatePombo(selected.id, payload)
      else saved = await db.createPombo(payload)
      if (photoFile && saved?.id && user?.id) {
        try { const url = await db.uploadFoto(user.id, saved.id, photoFile); await db.updatePombo(saved.id, { foto_url: url }) }
        catch (e) { toast('Foto nÃ£o guardada: ' + e.message, 'warn') }
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
        <button className="btn btn-primary" onClick={openNew}>ï¼‹ Novo Pombo</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="ðŸ” Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : filtered.length === 0 ? <EmptyState icon="ðŸ¦" title="Sem pombos" desc="Adicione o seu primeiro pombo" action={<button className="btn btn-primary" onClick={openNew}>ï¼‹ Novo Pombo</button>} />
          : (
            <div className="grid-auto">
              {filtered.map(p => {
                const fc = (p.forma || 50) >= 80 ? '#1ed98a' : (p.forma || 50) >= 60 ? '#facc15' : '#f87171'
                return (
                  <div key={p.id} className="pombo-card" onClick={() => openDetail(p)}>
                    <div className="pombo-photo">
                      {p.foto_url ? <img src={p.foto_url} alt={p.nome} /> : p.emoji}
                      <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', borderRadius: 6, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>
                        {p.sexo === 'M' ? 'â™‚' : 'â™€'}
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
      <Modal open={modal === 'form'} onClose={close} title={selected ? `âœï¸ Editar â€” ${selected.nome}` : 'ðŸ¦ Novo Pombo'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null} {selected ? 'Guardar' : 'Adicionar'}</button></>}>
        <div className="form-grid">
          <div className="col-2" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 14, border: '2px dashed #243860', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => document.getElementById('photo-up').click()}>
              {photoPreview ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 32 }}>{form.emoji}</span>}
            </div>
            <div>
              <input type="file" id="photo-up" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) } }} />
              <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('photo-up').click()}>ðŸ“¸ Foto</button>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>JPG, PNG. MÃ¡x 5MB</div>
            </div>
          </div>
          <Field label="Anel *"><input className="input" placeholder="PT-2026-00000" value={form.anilha} onChange={e => sf('anilha', e.target.value.toUpperCase())} /></Field>
          <Field label="Nome *"><input className="input" placeholder="Nome do pombo" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field>
          <Field label="Sexo"><select className="input" value={form.sexo} onChange={e => sf('sexo', e.target.value)}><option value="M">â™‚ Macho</option><option value="F">â™€ FÃªmea</option></select></Field>
          <Field label="Estado"><select className="input" value={form.estado} onChange={e => sf('estado', e.target.value)}>{['ativo', 'reproducao', 'lesionado', 'inativo'].map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Cor / Aspecto"><input className="input" placeholder="Azul barrado" value={form.cor} onChange={e => sf('cor', e.target.value)} /></Field>
          <Field label="Peso (g)"><input className="input" type="number" placeholder="420" value={form.peso} onChange={e => sf('peso', e.target.value)} /></Field>
          <Field label="Pombal"><select className="input" value={form.pombal} onChange={e => sf('pombal', e.target.value)}><option value="">â€” Sem pombal â€”</option>{pombais.map(pb => <option key={pb.id}>{pb.nome}</option>)}</select></Field>
          <div className="col-2">
            <Field label="Especialidades">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {ESPS.map(([v, l]) => <button key={v} type="button" className={`chip${form.esp.includes(v) ? ' active' : ''}`} onClick={() => toggleEsp(v)}>{l}</button>)}
              </div>
            </Field>
          </div>
          <Field label="Anel do Pai"><input className="input font-mono" style={{ fontSize: 11 }} placeholder="PT-0000-00000" value={form.pai} onChange={e => sf('pai', e.target.value.toUpperCase())} /></Field>
          <Field label="Anel da MÃ£e"><input className="input font-mono" style={{ fontSize: 11 }} placeholder="PT-0000-00000" value={form.mae} onChange={e => sf('mae', e.target.value.toUpperCase())} /></Field>
          <div className="col-2"><Field label="ObservaÃ§Ãµes"><textarea className="input" rows={2} style={{ resize: 'none' }} value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field></div>
        </div>
      </Modal>

      {/* Detail modal */}
      {selected && (
        <Modal open={modal === 'detail'} onClose={close} title={`${selected.emoji} ${selected.nome}`} wide
          footer={
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button className="btn btn-danger btn-sm" onClick={() => { close(); setConfirm(selected) }}>ðŸ—‘ï¸ Eliminar</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={close}>Fechar</button>
              <button className="btn btn-primary" onClick={() => openEdit(selected)}>âœï¸ Editar</button>
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
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 2 }}>{selected.sexo === 'M' ? 'â™‚ Macho' : 'â™€ FÃªmea'} Â· {selected.cor || 'â€”'}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>ðŸ  {selected.pombal || 'â€”'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
              {[['provas', 'Provas', '#facc15'], ['percentil', 'Percentil %', '#1ed98a'], ['forma', 'Forma %', '#60a5fa']].map(([k, l, c]) => (
                <div key={k}><div style={{ fontFamily: 'Barlow Condensed', fontSize: 24, fontWeight: 700, color: c }}>{selected[k] ?? 0}</div><div style={{ fontSize: 10, color: '#64748b' }}>{l}</div></div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><div className="label">Pai</div><div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#1ed98a' }}>{selected.pai || 'â€”'}</div></div>
            <div><div className="label">MÃ£e</div><div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#1ed98a' }}>{selected.mae || 'â€”'}</div></div>
          </div>
          {selected.obs && <div style={{ marginTop: 12 }}><div className="label">ObservaÃ§Ãµes</div><div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>{selected.obs}</div></div>}
        </Modal>
      )}

      {/* Confirm delete */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar pombo"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Tem a certeza que quer eliminar "{confirm?.nome}"? Esta acÃ§Ã£o nÃ£o pode ser desfeita.</p>
      </Modal>
    </div>
  )
}

// â”€â”€â”€ POMBAIS PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    if (!form.nome.trim()) { toast('Nome obrigatÃ³rio', 'warn'); return }
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
        <div><div className="section-title">Pombais</div><div className="section-sub">{pombais.length} instalaÃ§Ãµes</div></div>
        <button className="btn btn-primary" onClick={openNew}>ï¼‹ Novo Pombal</button>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : pombais.length === 0 ? <EmptyState icon="ðŸ " title="Sem pombais" desc="Registe o seu pombal" action={<button className="btn btn-primary" onClick={openNew}>ï¼‹ Novo Pombal</button>} />
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
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: pb.cor + '20', border: `1px solid ${pb.cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>ðŸ </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{pb.nome}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{pb.tipo}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-icon btn-sm" onClick={() => openEdit(pb)}>âœï¸</button>
                        <button className="btn btn-icon btn-sm" onClick={() => setConfirm(pb)}>ðŸ—‘ï¸</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: '#94a3b8' }}>OcupaÃ§Ã£o</span>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{n}/{pb.cap} ({pct}%)</span>
                    </div>
                    <div className="progress"><div className="progress-bar" style={{ width: `${Math.min(pct, 100)}%`, background: bar }} /></div>
                    {pb.loc && <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>ðŸ“ {pb.loc}</div>}
                  </div>
                )
              })}
            </div>
          )
      }

      <Modal open={modal} onClose={close} title={selected ? 'âœï¸ Editar Pombal' : 'ðŸ  Novo Pombal'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? 'Guardar' : 'Criar'}</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Pombal Principal" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field></div>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e => sf('tipo', e.target.value)}>{['Misto', 'Machos', 'FÃªmeas', 'Jovens', 'Reprodutores'].map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Capacidade"><input className="input" type="number" value={form.cap} onChange={e => sf('cap', e.target.value)} /></Field>
          <div className="col-2"><Field label="Morada"><input className="input" placeholder="EndereÃ§o" value={form.loc} onChange={e => sf('loc', e.target.value)} /></Field></div>
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

// â”€â”€â”€ PROVAS PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Provas() {
  const toast = useToast()
  const [provas, setProvas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const EMPTY = { nome: '', data: new Date().toISOString().slice(0, 10), dist: '', tipo: 'Fundo', local_solta: '', lugar: '', vel: '', n_pombos: '', obs: '' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { setProvas(await db.getProvas()) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatÃ³rio', 'warn'); return }
    setSaving(true)
    try {
      await db.createProva({ nome: form.nome.trim(), data_reg: form.data, dist: parseInt(form.dist) || null, tipo: form.tipo.toLowerCase().replace(/-| /g, '_'), local_solta: form.local_solta, lugar: form.lugar ? parseInt(form.lugar) : null, vel: form.vel || null, n: form.n_pombos ? parseInt(form.n_pombos) : null, obs: form.obs })
      toast('Prova registada!', 'ok'); setModal(false); setForm(EMPTY); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteProva(confirm.id); toast('Eliminada', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const vitorias = provas.filter(p => p.lugar === 1).length

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Provas</div><div className="section-sub">{provas.length} provas Â· {vitorias} vitÃ³rias</div></div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true) }}>ï¼‹ Nova Prova</button>
      </div>

      <div className="grid-3 mb-6">
        <KpiCard icon="ðŸ†" label="Total" value={provas.length} color="text-yellow" />
        <KpiCard icon="ðŸ¥‡" label="VitÃ³rias" value={vitorias} color="text-green" />
        <KpiCard icon="ðŸ“" label="Km Totais" value={provas.reduce((s, p) => s + (p.dist || 0), 0) + 'km'} color="text-blue" />
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : provas.length === 0 ? <EmptyState icon="ðŸ†" title="Sem provas" desc="Registe a primeira prova" action={<button className="btn btn-primary" onClick={() => setModal(true)}>ï¼‹ Nova Prova</button>} />
          : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Data</th><th>Prova</th><th>Tipo</th><th>Dist.</th><th>Local Solta</th><th>Lugar</th><th>Vel.</th><th></th></tr></thead>
                <tbody>
                  {provas.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{new Date(p.data_reg).toLocaleDateString('pt-PT')}</td>
                      <td style={{ fontWeight: 500 }}>{p.nome}</td>
                      <td><Badge v="blue">{p.tipo?.replace(/_/g, ' ')}</Badge></td>
                      <td style={{ fontFamily: 'Barlow Condensed', fontSize: 16, color: '#facc15' }}>{p.dist}km</td>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>{p.local_solta || 'â€”'}</td>
                      <td><span style={{ fontFamily: 'Barlow Condensed', fontSize: 18, fontWeight: 700, color: p.lugar === 1 ? '#facc15' : p.lugar === 2 ? '#cbd5e1' : p.lugar === 3 ? '#b45309' : '#94a3b8' }}>{p.lugar ? p.lugar + 'Âº' : 'â€”'}</span></td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#1ed98a' }}>{p.vel || 'â€”'}</td>
                      <td><button className="btn btn-icon btn-sm" onClick={() => setConfirm(p)}>ðŸ—‘ï¸</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }

      <Modal open={modal} onClose={() => setModal(false)} title="ðŸ† Nova Prova" wide
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}Registar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Grande Prova do Tejo" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field></div>
          <Field label="Data"><input className="input" type="date" value={form.data} onChange={e => sf('data', e.target.value)} /></Field>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e => sf('tipo', e.target.value)}>{['Velocidade', 'Semi-Fundo', 'Fundo', 'Grande Fundo'].map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="DistÃ¢ncia (km)"><input className="input" type="number" placeholder="180" value={form.dist} onChange={e => sf('dist', e.target.value)} /></Field>
          <Field label="NÂº Pombos"><input className="input" type="number" placeholder="30" value={form.n_pombos} onChange={e => sf('n_pombos', e.target.value)} /></Field>
          <div className="col-2"><Field label="Local de Solta"><input className="input" placeholder="SantarÃ©m, Portugal" value={form.local_solta} onChange={e => sf('local_solta', e.target.value)} /></Field></div>
          <Field label="ClassificaÃ§Ã£o (lugar)"><input className="input" type="number" placeholder="1" value={form.lugar} onChange={e => sf('lugar', e.target.value)} /></Field>
          <Field label="Velocidade (m/min)"><input className="input" placeholder="1382" value={form.vel} onChange={e => sf('vel', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar prova"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar "{confirm?.nome}"?</p>
      </Modal>
    </div>
  )
}

// â”€â”€â”€ FINANÃ‡AS PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Financas() {
  const toast = useToast()
  const [trans, setTrans] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ tipo: 'despesa', val: '', desc: '', cat: 'AlimentaÃ§Ã£o', data: new Date().toISOString().slice(0, 10) })
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
    if (!form.val || isNaN(parseFloat(form.val))) { toast('Valor invÃ¡lido', 'warn'); return }
    if (!form.desc.trim()) { toast('DescriÃ§Ã£o obrigatÃ³ria', 'warn'); return }
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
        <div><div className="section-title">FinanÃ§as</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>ï¼‹ Nova TransacÃ§Ã£o</button>
      </div>

      <div className="chips mb-4">
        {[['semana', 'Semana'], ['mes', 'MÃªs'], ['ano', 'Ano'], ['tudo', 'Tudo']].map(([v, l]) => (
          <button key={v} className={`chip${periodo === v ? ' active' : ''}`} onClick={() => setPeriodo(v)}>{l}</button>
        ))}
      </div>

      <div className="grid-3 mb-6">
        <KpiCard icon="ðŸ’š" label="Receitas" value={`${rec.toFixed(0)}â‚¬`} color="text-green" />
        <KpiCard icon="ðŸ”´" label="Despesas" value={`${dep.toFixed(0)}â‚¬`} color="text-red" />
        <KpiCard icon="âš–ï¸" label="Saldo" value={`${(rec - dep) >= 0 ? '+' : ''}${(rec - dep).toFixed(0)}â‚¬`} color={(rec - dep) >= 0 ? 'text-green' : 'text-red'} />
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : filtered.length === 0 ? <EmptyState icon="ðŸ’°" title="Sem transacÃ§Ãµes" desc="Registe a primeira transacÃ§Ã£o" />
          : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Data</th><th>DescriÃ§Ã£o</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id}>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{new Date(t.data_reg).toLocaleDateString('pt-PT')}</td>
                      <td style={{ fontWeight: 500 }}>{t.descricao}</td>
                      <td><Badge>{t.cat}</Badge></td>
                      <td><Badge v={t.tipo === 'receita' ? 'green' : 'red'}>{t.tipo}</Badge></td>
                      <td style={{ fontFamily: 'Barlow Condensed', fontSize: 16, fontWeight: 700, color: t.tipo === 'receita' ? '#1ed98a' : '#f87171' }}>{t.tipo === 'receita' ? '+' : '-'}{(t.val || 0).toFixed(2)}â‚¬</td>
                      <td><button className="btn btn-icon btn-sm" onClick={() => setConfirm(t)}>ðŸ—‘ï¸</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }

      <Modal open={modal} onClose={() => setModal(false)} title="ðŸ’° Nova TransacÃ§Ã£o"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}Guardar</button></>}>
        <div style={{ display: 'flex', gap: 4, background: '#1a2840', borderRadius: 10, padding: 4, marginBottom: 16 }}>
          {[['despesa', 'ðŸ“‰ Despesa'], ['receita', 'ðŸ“ˆ Receita']].map(([v, l]) => (
            <button key={v} onClick={() => { sf('tipo', v); sf('cat', v === 'despesa' ? 'AlimentaÃ§Ã£o' : 'PrÃ©mios') }}
              style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: form.tipo === v ? (v === 'despesa' ? '#ef4444' : '#1ed98a') : 'none', color: form.tipo === v ? (v === 'despesa' ? '#fff' : '#0a0f14') : '#94a3b8' }}>
              {l}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <Field label="Valor (â‚¬) *"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.val} onChange={e => sf('val', e.target.value)} /></Field>
          <Field label="Data"><input className="input" type="date" value={form.data} onChange={e => sf('data', e.target.value)} /></Field>
          <div className="col-2"><Field label="DescriÃ§Ã£o *"><input className="input" placeholder="Ex: RaÃ§Ã£o Premium" value={form.desc} onChange={e => sf('desc', e.target.value)} /></Field></div>
          <div className="col-2">
            <Field label="Categoria">
              <select className="input" value={form.cat} onChange={e => sf('cat', e.target.value)}>
                {(form.tipo === 'despesa' ? ['AlimentaÃ§Ã£o', 'Medicamentos', 'Provas', 'VeterinÃ¡rio', 'ManutenÃ§Ã£o', 'Equipamento', 'Outros'] : ['PrÃ©mios', 'Venda de Pombos', 'PatrocÃ­nio', 'Outros']).map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar transacÃ§Ã£o"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar "{confirm?.descricao}"?</p>
      </Modal>
    </div>
  )
}

// â”€â”€â”€ SAÃšDE PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Saude() {
  const toast = useToast()
  const [registos, setRegistos] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ pombo_id: '', apt: 'boa', fase: 'competicao', peso: '', obs: '', data: new Date().toISOString().slice(0, 10) })
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const [r, p] = await Promise.all([db.getSaude(), db.getPombos()]); setRegistos(r); setPombos(p) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.pombo_id) { toast('Seleccione um pombo', 'warn'); return }
    setSaving(true)
    try {
      await db.createSaude({ pigeon_id: form.pombo_id, aptidao: form.apt, fase: form.fase, peso: form.peso ? parseInt(form.peso) : null, obs: form.obs, data_reg: form.data })
      toast('Guardado!', 'ok'); setModal(false); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteSaude(confirm.id); toast('Eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const aptVar = { excelente: 'green', boa: 'green', media: 'yellow', fraca: 'yellow', doente: 'red', quarentena: 'red' }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">SaÃºde</div><div className="section-sub">{registos.length} registos</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>ï¼‹ Novo Registo</button>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : registos.length === 0 ? <EmptyState icon="ðŸ¥" title="Sem registos" desc="Registe o estado de saÃºde dos pombos" action={<button className="btn btn-primary" onClick={() => setModal(true)}>ï¼‹ Novo Registo</button>} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {registos.map(r => {
                const pombo = pombos.find(p => p.id === r.pigeon_id)
                return (
                  <div key={r.id} className="card card-p" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1a2840', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden', flexShrink: 0 }}>
                      {pombo?.foto_url ? <img src={pombo.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (pombo?.emoji || 'ðŸ¦')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#fff' }}>{pombo?.nome || 'â€”'}</div>
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono' }}>{pombo?.anilha || 'â€”'}</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.fase}</div>
                    {r.peso && <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.peso}g</div>}
                    <Badge v={aptVar[r.aptidao] || 'gray'}>{r.aptidao}</Badge>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(r.data_reg || r.created_at).toLocaleDateString('pt-PT')}</div>
                    <button className="btn btn-icon btn-sm" onClick={() => setConfirm(r)}>ðŸ—‘ï¸</button>
                  </div>
                )
              })}
            </div>
          )
      }

      <Modal open={modal} onClose={() => setModal(false)} title="ðŸ¥ Novo Registo de SaÃºde"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}Guardar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Pombo *"><select className="input" value={form.pombo_id} onChange={e => sf('pombo_id', e.target.value)}><option value="">â€” Seleccionar â€”</option>{pombos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field></div>
          <Field label="AptidÃ£o"><select className="input" value={form.apt} onChange={e => sf('apt', e.target.value)}>{['excelente', 'boa', 'media', 'fraca', 'doente', 'quarentena'].map(a => <option key={a}>{a}</option>)}</select></Field>
          <Field label="Fase"><select className="input" value={form.fase} onChange={e => sf('fase', e.target.value)}>{['competicao', 'reproducao', 'muda', 'repouso', 'jovem'].map(f => <option key={f}>{f}</option>)}</select></Field>
          <Field label="Peso (g)"><input className="input" type="number" placeholder="420" value={form.peso} onChange={e => sf('peso', e.target.value)} /></Field>
          <Field label="Data"><input className="input" type="date" value={form.data} onChange={e => sf('data', e.target.value)} /></Field>
          <div className="col-2"><Field label="ObservaÃ§Ãµes"><textarea className="input" rows={2} style={{ resize: 'none' }} value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field></div>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar registo"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar este registo de saÃºde?</p>
      </Modal>
    </div>
  )
}

// â”€â”€â”€ PERFIL PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Perfil() {
  const { user, signOut } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', tel: '', fed: '', org: '', pombal_nome: '', pombal_morada: '', pombal_lat: '', pombal_lon: '' })
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const p = await db.getPerfil()
        if (p) setForm({ nome: p.nome || '', tel: p.tel || '', fed: p.fed || '', org: p.org || '', pombal_nome: p.pombal_nome || '', pombal_morada: p.pombal_morada || '', pombal_lat: String(p.pombal_lat || ''), pombal_lon: String(p.pombal_lon || '') })
        else setForm(f => ({ ...f, nome: user?.user_metadata?.nome || '' }))
      } catch (e) { }
      finally { setLoading(false) }
    }
    load()
  }, [user])

  const save = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatÃ³rio', 'warn'); return }
    setSaving(true)
    try {
      await db.savePerfil({ nome: form.nome, tel: form.tel, fed: form.fed, org: form.org, pombal_nome: form.pombal_nome, pombal_morada: form.pombal_morada, pombal_lat: form.pombal_lat ? parseFloat(form.pombal_lat) : null, pombal_lon: form.pombal_lon ? parseFloat(form.pombal_lon) : null })
      toast('Perfil guardado na cloud! âœ…', 'ok')
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Perfil</div><div className="section-sub">{user?.email}</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'ðŸ’¾'} Guardar</button>
          <button className="btn btn-secondary" onClick={signOut}>Sair</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-p">
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: 16 }}>ðŸ‘¤ Dados Pessoais</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nome Completo *"><input className="input" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field>
            <Field label="Email"><input className="input" value={user?.email} disabled style={{ opacity: .6 }} /></Field>
            <Field label="Telefone"><input className="input" placeholder="+351 9XX XXX XXX" value={form.tel} onChange={e => sf('tel', e.target.value)} /></Field>
            <Field label="NÂº Federativo"><input className="input" placeholder="FCP-2026-XXXX" value={form.fed} onChange={e => sf('fed', e.target.value)} /></Field>
            <Field label="OrganizaÃ§Ã£o / Clube"><input className="input" placeholder="Sociedade ColumbÃ³fila..." value={form.org} onChange={e => sf('org', e.target.value)} /></Field>
          </div>
        </div>

        <div className="card card-p">
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: 16 }}>ðŸ  Dados do Pombal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nome do Pombal"><input className="input" placeholder="Pombal da Quinta..." value={form.pombal_nome} onChange={e => sf('pombal_nome', e.target.value)} /></Field>
            <Field label="Morada"><input className="input" placeholder="Localidade, Concelho" value={form.pombal_morada} onChange={e => sf('pombal_morada', e.target.value)} /></Field>
            <Field label="Latitude GPS"><input className="input" placeholder="38.80234" value={form.pombal_lat} onChange={e => sf('pombal_lat', e.target.value)} /></Field>
            <Field label="Longitude GPS"><input className="input" placeholder="-9.38142" value={form.pombal_lon} onChange={e => sf('pombal_lon', e.target.value)} /></Field>
            {form.pombal_lat && form.pombal_lon && (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #243860', height: 140 }}>
                <iframe width="100%" height="100%" frameBorder="0" style={{ display: 'block' }}
                  src={`https://maps.google.com/maps?q=${form.pombal_lat},${form.pombal_lon}&z=14&output=embed`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€ PLACEHOLDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    if (!form.local.trim()) { toast('Local obrigatÃ³rio','warn'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('treinos').insert({
        data: form.data, local: form.local.trim(),
        dist: form.dist ? parseInt(form.dist) : null,
        tipo: form.tipo, pombos_n: form.pombos_n ? parseInt(form.pombos_n) : null,
        retorno: form.retorno, obs: form.obs, user_id: user.id
      })
      if (error) throw error
      toast('Treino registado!','ok'); setModal(false); setForm(EMPTY); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try {
      const { error } = await supabase.from('treinos').delete().eq('id', confirm.id)
      if (error) throw error
      toast('Eliminado','ok'); setConfirm(null); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const total = treinos.length
  const distTotal = treinos.reduce((s,t)=>s+(t.dist||0),0)

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Treinos</div><div className="section-sub">{total} treinos Â· {distTotal}km</div></div>
        <button className="btn btn-primary" onClick={()=>{ setForm(EMPTY); setModal(true) }}>ï¼‹ Novo Treino</button>
      </div>
      <div className="grid-3 mb-6">
        <KpiCard icon="ðŸŽ¯" label="Total" value={total} color="text-green"/>
        <KpiCard icon="ðŸ“" label="Km Totais" value={distTotal+'km'} color="text-blue"/>
        <KpiCard icon="ðŸ“…" label={`Ano ${new Date().getFullYear()}`} value={treinos.filter(t=>new Date(t.data).getFullYear()===new Date().getFullYear()).length} color="text-yellow"/>
      </div>
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        : treinos.length===0 ? <EmptyState icon="ðŸŽ¯" title="Sem treinos" desc="Registe o primeiro treino" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>ï¼‹ Novo Treino</button>} />
        : <div className="card" style={{ overflowX:'auto' }}>
            <table>
              <thead><tr><th>Data</th><th>Local</th><th>Tipo</th><th>DistÃ¢ncia</th><th>Pombos</th><th>Retorno</th><th></th></tr></thead>
              <tbody>
                {treinos.map(t=>(
                  <tr key={t.id}>
                    <td style={{ color:'#64748b', fontSize:12 }}>{new Date(t.data).toLocaleDateString('pt-PT')}</td>
                    <td style={{ fontWeight:500 }}>{t.local}</td>
                    <td><Badge v="blue">{t.tipo}</Badge></td>
                    <td style={{ fontFamily:'Barlow Condensed', fontSize:16, color:'#facc15' }}>{t.dist?t.dist+'km':'â€”'}</td>
                    <td>{t.pombos_n||'â€”'}</td>
                    <td style={{ color: t.retorno==='100%'?'#1ed98a':'#facc15', fontWeight:600 }}>{t.retorno||'â€”'}</td>
                    <td><button className="btn btn-icon btn-sm" onClick={()=>setConfirm(t)}>ðŸ—‘ï¸</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="ðŸŽ¯ Novo Treino"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}Registar</button></>}>
        <div className="form-grid">
          <Field label="Data"><input className="input" type="date" value={form.data} onChange={e=>sf('data',e.target.value)} /></Field>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e=>sf('tipo',e.target.value)}>{['Em Linha','Basket','Voo Livre','Nocturno'].map(t=><option key={t}>{t}</option>)}</select></Field>
          <div className="col-2"><Field label="Local de Solta *"><input className="input" placeholder="Ex: SantarÃ©m" value={form.local} onChange={e=>sf('local',e.target.value)} /></Field></div>
          <Field label="DistÃ¢ncia (km)"><input className="input" type="number" placeholder="60" value={form.dist} onChange={e=>sf('dist',e.target.value)} /></Field>
          <Field label="NÂº Pombos"><input className="input" type="number" placeholder="30" value={form.pombos_n} onChange={e=>sf('pombos_n',e.target.value)} /></Field>
          <Field label="Taxa de Retorno"><input className="input" placeholder="100%" value={form.retorno} onChange={e=>sf('retorno',e.target.value)} /></Field>
          <div className="col-2"><Field label="ObservaÃ§Ãµes"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e=>sf('obs',e.target.value)} /></Field></div>
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
  const [acas, setAcas] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const EMPTY = { pai_id:'', mae_id:'', inicio:new Date().toISOString().slice(0,10), obs:'' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, p] = await Promise.all([
        supabase.from('breeding').select('*').order('created_at', { ascending: false }).then(r => r.data || []),
        supabase.from('pigeons').select('*').order('nome').then(r => r.data || [])
      ])
      setAcas(a); setPombos(p)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  const machos = pombos.filter(p=>p.sexo==='M')
  const femeas = pombos.filter(p=>p.sexo==='F')

  const save = async () => {
    if (!form.pai_id) { toast('Seleccione o macho','warn'); return }
    if (!form.mae_id) { toast('Seleccione a fÃªmea','warn'); return }
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

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">ReproduÃ§Ã£o</div><div className="section-sub">{acas.length} acasalamentos Â· {acas.filter(a=>a.estado==='em_progresso').length} activos</div></div>
        <button className="btn btn-primary" onClick={()=>{ setForm(EMPTY); setModal(true) }}>ï¼‹ Novo Acasalamento</button>
      </div>
      <div className="grid-3 mb-6">
        <KpiCard icon="ðŸ¥š" label="Acasalamentos" value={acas.length} color="text-green"/>
        <KpiCard icon="âœ…" label="Em Progresso" value={acas.filter(a=>a.estado==='em_progresso').length} color="text-yellow"/>
        <KpiCard icon="â™‚" label="Machos DisponÃ­veis" value={machos.length} color="text-blue"/>
      </div>
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        : acas.length===0 ? <EmptyState icon="ðŸ¥š" title="Sem acasalamentos" desc="Registe o primeiro par reprodutor" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>ï¼‹ Novo Acasalamento</button>} />
        : <div className="grid-2">
            {acas.map(a => {
              const pai = pombos.find(p=>p.id===a.pai_id)
              const mae = pombos.find(p=>p.id===a.mae_id)
              return (
                <div key={a.id} className="card card-p">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <Badge v={estadoVar[a.estado]||'gray'}>{a.estado?.replace('_',' ')}</Badge>
                    <button className="btn btn-icon btn-sm" onClick={()=>setConfirm(a)}>ðŸ—‘ï¸</button>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:12 }}>
                    <div style={{ flex:1, textAlign:'center' }}>
                      <div style={{ width:48, height:48, borderRadius:12, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 6px', overflow:'hidden' }}>
                        {pai?.foto_url?<img src={pai.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:(pai?.emoji||'ðŸ¦')}
                      </div>
                      <div style={{ fontSize:12, fontWeight:500, color:'#fff' }}>{a.pai_nome||pai?.nome||'â€”'}</div>
                      <div style={{ fontSize:11, color:'#60a5fa' }}>â™‚ Macho</div>
                    </div>
                    <div style={{ fontSize:20, color:'#475569' }}>Ã—</div>
                    <div style={{ flex:1, textAlign:'center' }}>
                      <div style={{ width:48, height:48, borderRadius:12, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 6px', overflow:'hidden' }}>
                        {mae?.foto_url?<img src={mae.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:(mae?.emoji||'ðŸ¦')}
                      </div>
                      <div style={{ fontSize:12, fontWeight:500, color:'#fff' }}>{a.mae_nome||mae?.nome||'â€”'}</div>
                      <div style={{ fontSize:11, color:'#f472b6' }}>â™€ FÃªmea</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#64748b', borderTop:'1px solid #1e3050', paddingTop:10 }}>
                    <span>InÃ­cio: {a.inicio?new Date(a.inicio).toLocaleDateString('pt-PT'):'â€”'}</span>
                    <span>ðŸ¥š {a.ninhadas||0} ninhadas</span>
                  </div>
                </div>
              )
            })}
          </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="ðŸ¥š Novo Acasalamento"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}Registar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="â™‚ Macho (Pai) *"><select className="input" value={form.pai_id} onChange={e=>sf('pai_id',e.target.value)}><option value="">â€” Seleccionar macho â€”</option>{machos.map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field>
          <Field label="â™€ FÃªmea (MÃ£e) *"><select className="input" value={form.mae_id} onChange={e=>sf('mae_id',e.target.value)}><option value="">â€” Seleccionar fÃªmea â€”</option>{femeas.map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field>
          <Field label="Data de InÃ­cio"><input className="input" type="date" value={form.inicio} onChange={e=>sf('inicio',e.target.value)} /></Field>
          <Field label="ObservaÃ§Ãµes"><textarea className="input" rows={2} style={{ resize:'none' }} placeholder="Notas sobre o par..." value={form.obs} onChange={e=>sf('obs',e.target.value)} /></Field>
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
  const [tab, setTab] = useState('racoes')
  const [racoes, setRacoes] = useState([
    { id:1, nome:'Mistura CompetiÃ§Ã£o', fase:'CompetiÃ§Ã£o', stock:180, min:50, comps:[{n:'Milho',p:40},{n:'Cevada',p:25},{n:'Ervilha',p:20},{n:'Girassol',p:15}] },
    { id:2, nome:'Mistura ReproduÃ§Ã£o', fase:'ReproduÃ§Ã£o', stock:90, min:30, comps:[{n:'Milho',p:30},{n:'Ervilha',p:30},{n:'Cevada',p:20},{n:'Amendoim',p:20}] },
  ])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome:'', fase:'CompetiÃ§Ã£o', stock:'', min:'50' })
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const COMERCIAIS = [
    { nome:'Versele-Laga Superstar', marca:'Versele-Laga', fase:'CompetiÃ§Ã£o', comps:[{n:'Milho',p:38},{n:'Cevada',p:22},{n:'Ervilha',p:18},{n:'Trigo',p:12},{n:'Arroz',p:10}] },
    { nome:'Versele-Laga Breedmaster', marca:'Versele-Laga', fase:'ReproduÃ§Ã£o', comps:[{n:'Milho',p:32},{n:'Ervilha',p:28},{n:'Cevada',p:20},{n:'Amendoim',p:12},{n:'CÃ¡rtamo',p:8}] },
    { nome:'Beyers Olympic', marca:'Beyers', fase:'CompetiÃ§Ã£o', comps:[{n:'Milho',p:40},{n:'Cevada',p:20},{n:'Ervilha',p:20},{n:'Girassol',p:10},{n:'Trigo',p:10}] },
    { nome:'Roehnfried Spezial', marca:'Roehnfried', fase:'CompetiÃ§Ã£o', comps:[{n:'Milho',p:42},{n:'Cevada',p:20},{n:'Ervilha',p:18},{n:'Triticale',p:12},{n:'Girassol',p:8}] },
    { nome:'DAC Widowhood', marca:'DAC', fase:'Viuvez', comps:[{n:'Milho',p:45},{n:'Cevada',p:28},{n:'Ervilha',p:15},{n:'Girassol',p:8},{n:'Trigo',p:4}] },
    { nome:'Mistura de Muda', marca:'PrÃ³pria', fase:'Muda', comps:[{n:'Milho',p:30},{n:'Cevada',p:30},{n:'Ervilha',p:20},{n:'Linho',p:12},{n:'CÃ¢nhamo',p:8}] },
  ]

  const addRacao = () => {
    if (!form.nome.trim()) { toast('Nome obrigatÃ³rio','warn'); return }
    setRacoes(r=>[...r, { id:Date.now(), nome:form.nome, fase:form.fase, stock:parseInt(form.stock)||0, min:parseInt(form.min)||50, comps:[] }])
    toast('RaÃ§Ã£o adicionada!','ok'); setModal(false)
  }

  const addComercial = (r) => {
    setRacoes(prev=>[...prev, { id:Date.now(), ...r, stock:0, min:20 }])
    toast(`${r.nome} adicionada!`,'ok')
  }

  const delRacao = (id) => { setRacoes(r=>r.filter(x=>x.id!==id)); toast('Removida','ok') }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">AlimentaÃ§Ã£o</div></div>
      </div>
      <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
        {[['racoes','ðŸŒ¾ RaÃ§Ãµes'],['comerciais','ðŸ›ï¸ Mercado']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'#1ed98a':'none', color:tab===t?'#0a0f14':'#94a3b8' }}>{l}</button>
        ))}
      </div>
      {tab==='racoes' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
            <button className="btn btn-primary" onClick={()=>setModal(true)}>ï¼‹ Nova RaÃ§Ã£o</button>
          </div>
          {racoes.length===0 ? <EmptyState icon="ðŸŒ¾" title="Sem raÃ§Ãµes" desc="Adicione uma raÃ§Ã£o" />
          : <div className="grid-2">
              {racoes.map(r => {
                const baixo = r.stock < r.min
                const pct = Math.min(r.stock/Math.max(r.min*2,1)*100, 100)
                return (
                  <div key={r.id} className="card card-p" style={{ border: baixo?'1px solid rgba(239,68,68,.3)':'1px solid #1e3050' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                      <div><div style={{ fontWeight:600, color:'#fff' }}>{r.nome}</div><div style={{ fontSize:12, color:'#64748b' }}>{r.fase}</div></div>
                      <button className="btn btn-icon btn-sm" onClick={()=>delRacao(r.id)}>ðŸ—‘ï¸</button>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                      <span style={{ color:'#94a3b8' }}>Stock</span>
                      <span style={{ fontWeight:600, color:baixo?'#f87171':'#fff' }}>{r.stock}kg {baixo&&<span style={{ fontSize:11 }}>âš ï¸ mÃ­n:{r.min}kg</span>}</span>
                    </div>
                    <div className="progress"><div className="progress-bar" style={{ width:`${pct}%`, background:baixo?'#f87171':'#1ed98a' }}/></div>
                    {r.comps?.length>0 && <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:10 }}>{r.comps.map(c=><span key={c.n} className="badge badge-gray" style={{ fontSize:10 }}>{c.n} {c.p}%</span>)}</div>}
                  </div>
                )
              })}
            </div>
          }
        </div>
      )}
      {tab==='comerciais' && (
        <div>
          <p style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>RaÃ§Ãµes comerciais disponÃ­veis no mercado. Toque em + para adicionar Ã  sua lista.</p>
          <div className="grid-2">
            {COMERCIAIS.map((r,i)=>(
              <div key={i} className="card card-p">
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <div><div style={{ fontWeight:500, color:'#fff', fontSize:13 }}>{r.nome}</div><div style={{ fontSize:11, color:'#64748b' }}>{r.marca} Â· {r.fase}</div></div>
                  <button className="btn btn-primary btn-sm" onClick={()=>addComercial(r)}>ï¼‹</button>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>{r.comps.map(c=><span key={c.n} className="badge badge-gray" style={{ fontSize:10 }}>{c.n} {c.p}%</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title="ðŸŒ¾ Nova RaÃ§Ã£o"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={addRacao}>Adicionar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Nome *"><input className="input" placeholder="Ex: Mistura CompetiÃ§Ã£o" value={form.nome} onChange={e=>sf('nome',e.target.value)} /></Field>
          <Field label="Fase"><select className="input" value={form.fase} onChange={e=>sf('fase',e.target.value)}>{['CompetiÃ§Ã£o','ReproduÃ§Ã£o','Muda','Repouso','Geral','Viuvez'].map(f=><option key={f}>{f}</option>)}</select></Field>
          <div className="form-grid">
            <Field label="Stock (kg)"><input className="input" type="number" value={form.stock} onChange={e=>sf('stock',e.target.value)} /></Field>
            <Field label="MÃ­nimo (kg)"><input className="input" type="number" value={form.min} onChange={e=>sf('min',e.target.value)} /></Field>
          </div>
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
      <div style={{ fontSize: 13, color: '#64748b' }}>Em desenvolvimento â€” disponÃ­vel em breve</div>
    </div>
  )
}

// â”€â”€â”€ NAV CONFIG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NAV = [
  { section: 'Principal', items: [{ id: 'dashboard', icon: 'ðŸ“Š', label: 'Dashboard' }, { id: 'pombos', icon: 'ðŸ¦', label: 'Pombos' }, { id: 'pombais', icon: 'ðŸ ', label: 'Pombais' }] },
  { section: 'Desporto', items: [{ id: 'provas', icon: 'ðŸ†', label: 'Provas' }, { id: 'treinos', icon: 'ðŸŽ¯', label: 'Treinos' }, { id: 'calendario', icon: 'ðŸ“…', label: 'CalendÃ¡rio' }] },
  { section: 'GestÃ£o', items: [{ id: 'saude', icon: 'ðŸ¥', label: 'SaÃºde' }, { id: 'reproducao', icon: 'ðŸ¥š', label: 'ReproduÃ§Ã£o' }, { id: 'alimentacao', icon: 'ðŸŒ¾', label: 'AlimentaÃ§Ã£o' }, { id: 'financas', icon: 'ðŸ’°', label: 'FinanÃ§as' }] },
  { section: 'AnÃ¡lise', items: [{ id: 'relatorios', icon: 'ðŸ“Š', label: 'RelatÃ³rios' }, { id: 'meteorologia', icon: 'ðŸŒ¦ï¸', label: 'Meteorologia' }, { id: 'perfil', icon: 'âš™ï¸', label: 'Perfil' }] },
]

// â”€â”€â”€ APP LAYOUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      case 'calendario':  return <EmBreve icon="ðŸ“…" title="CalendÃ¡rio" />
      case 'relatorios':  return <EmBreve icon="ðŸ“Š" title="RelatÃ³rios" />
      case 'meteorologia':return <EmBreve icon="ðŸŒ¦ï¸" title="Meteorologia" />
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
          <div className="logo-icon">ðŸ•Šï¸</div>
          <div>
            <div className="logo-text">ChampionsLoft</div>
            <div className="logo-sub">GestÃ£o ColumbÃ³fila</div>
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
          <button className="btn btn-icon" onClick={() => setSidebarOpen(true)} style={{ display: 'none' }} id="menu-btn">â˜°</button>
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

// â”€â”€â”€ ROOT APP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        <div style={{ fontSize: 40, marginBottom: 16 }}>ðŸ•Šï¸</div>
        <Spinner lg />
      </div>
    </div>
  )

  return user ? <AppLayout /> : <Login />
}