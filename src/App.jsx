import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://tgqnbheetpgnpjsjphoj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncW5iaGVldHBnbnBqc2pwaG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTk0NDIsImV4cCI6MjA5MjAzNTQ0Mn0.32ZjOUB-bOAIgtwwpKDVRSJy1w4xlOR7IMb4bRTK3Uo',
  { auth: { persistSession: true, autoRefreshToken: true } }
)

const db = {
  async uid() { const { data: { user } } = await supabase.auth.getUser(); return user?.id },
  async getPerfil() { const uid = await this.uid(); if (!uid) return null; const { data } = await supabase.from('perfis').select('*').eq('user_id', uid).single(); return data },
  async savePerfil(p) { const uid = await this.uid(); if (!uid) throw new Error('Sem auth'); const { data, error } = await supabase.from('perfis').upsert({ ...p, user_id: uid, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select().single(); if (error) throw error; return data },
  async getPombos() { const { data, error } = await supabase.from('pigeons').select('*').order('nome'); if (error) throw error; return data || [] },
  async createPombo(p) { const uid = await this.uid(); const { data, error } = await supabase.from('pigeons').insert({ ...p, user_id: uid }).select().single(); if (error) throw error; return data },
  async updatePombo(id, changes) { const { data, error } = await supabase.from('pigeons').update(changes).eq('id', id).select().single(); if (error) throw error; return data },
  async deletePombo(id) { const { error } = await supabase.from('pigeons').delete().eq('id', id); if (error) throw error },
  async uploadFoto(userId, pigeonId, file) { const ext = file.name.split('.').pop(); const path = `pombos/${userId}/${pigeonId}.${ext}`; const { error } = await supabase.storage.from('fotos-pombos').upload(path, file, { upsert: true }); if (error) throw error; const { data } = supabase.storage.from('fotos-pombos').getPublicUrl(path); return data.publicUrl },
  async getPombais() { const { data, error } = await supabase.from('lofts').select('*').order('nome'); if (error) throw error; return data || [] },
  async createPombal(p) { const uid = await this.uid(); const { data, error } = await supabase.from('lofts').insert({ ...p, user_id: uid }).select().single(); if (error) throw error; return data },
  async updatePombal(id, c) { const { data, error } = await supabase.from('lofts').update(c).eq('id', id).select().single(); if (error) throw error; return data },
  async deletePombal(id) { const { error } = await supabase.from('lofts').delete().eq('id', id); if (error) throw error },
  async getProvas() { const { data, error } = await supabase.from('races').select('*').order('data_reg', { ascending: false }); if (error) throw error; return data || [] },
  async createProva(p) { const uid = await this.uid(); const { data, error } = await supabase.from('races').insert({ ...p, user_id: uid }).select().single(); if (error) throw error; return data },
  async deleteProva(id) { const { error } = await supabase.from('races').delete().eq('id', id); if (error) throw error },
  async getSaude() { const { data, error } = await supabase.from('health').select('*, pigeons(nome,emoji)').order('created_at', { ascending: false }); if (error) throw error; return data || [] },
  async createSaude(s) { const uid = await this.uid(); const { data, error } = await supabase.from('health').insert({ ...s, user_id: uid }).select().single(); if (error) throw error; return data },
  async deleteSaude(id) { const { error } = await supabase.from('health').delete().eq('id', id); if (error) throw error },
  async getFinancas() { const { data, error } = await supabase.from('financas').select('*').order('data_reg', { ascending: false }); if (error) throw error; return data || [] },
  async createFinanca(f) { const uid = await this.uid(); const { data, error } = await supabase.from('financas').insert({ ...f, user_id: uid }).select().single(); if (error) throw error; return data },
  async deleteFinanca(id) { const { error } = await supabase.from('financas').delete().eq('id', id); if (error) throw error },
}
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
}function Login() {
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
        if (!form.nome.trim()) { toast('Nome obrigatório', 'warn'); return }
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
      <div className="login-card">
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
            <input className="input" type="email" placeholder="email@exemplo.pt" value={form.email} onChange={e => sf('email', e.target.value)} required />
          </Field>
          <Field label="Password *">
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => sf('password', e.target.value)} required minLength={6} />
          </Field>
          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 4 }} disabled={loading}>
            {loading ? <Spinner /> : null}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}function Dashboard({ nav }) {
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
      } catch (e) { toast('Erro: ' + e.message, 'err') }
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
}function Pombos() {
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
  const EMPTY = { anilha: '', nome: '', sexo: 'M', cor: '', peso: '', esp: ['velocidade'], estado: 'ativo', pombal: '', pai: '', mae: '', obs: '', emoji: '🐦' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const ESPS = [['velocidade','Velocidade'],['meio_fundo','Meio-Fundo'],['fundo','Fundo'],['grande_fundo','G. Fundo']]
  const statusBadge = { ativo:'green', reproducao:'yellow', lesionado:'red', inativo:'gray' }

  const load = useCallback(async () => {
    setLoading(true)
    try { const [p, pb] = await Promise.all([db.getPombos(), db.getPombais()]); setPombos(p); setPombais(pb) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = pombos.filter(p => !search || p.nome?.toLowerCase().includes(search.toLowerCase()) || p.anilha?.toLowerCase().includes(search.toLowerCase()))
  const openNew = () => { setForm({ ...EMPTY, pombal: pombais[0]?.nome || '' }); setPhotoFile(null); setPhotoPreview(null); setSelected(null); setModal('form') }
  const openEdit = (p) => { setSelected(p); setForm({ anilha: p.anilha||'', nome: p.nome||'', sexo: p.sexo||'M', cor: p.cor||'', peso: p.peso||'', esp: p.esp||['velocidade'], estado: p.estado||'ativo', pombal: p.pombal||'', pai: p.pai||'', mae: p.mae||'', obs: p.obs||'', emoji: p.emoji||'🐦' }); setPhotoPreview(p.foto_url||null); setPhotoFile(null); setModal('form') }
  const openDetail = (p) => { setSelected(p); setModal('detail') }
  const close = () => { setModal(null); setSelected(null); setPhotoFile(null); setPhotoPreview(null) }
  const toggleEsp = (e) => sf('esp', form.esp.includes(e) ? form.esp.filter(x => x !== e) : [...form.esp, e])

  const save = async () => {
    if (!form.anilha.trim()) { toast('Anel obrigatório', 'warn'); return }
    if (!form.nome.trim()) { toast('Nome obrigatório', 'warn'); return }
    setSaving(true)
    try {
      const payload = { anilha: form.anilha.trim(), nome: form.nome.trim(), sexo: form.sexo, cor: form.cor, peso: form.peso ? parseInt(form.peso) : null, esp: form.esp, estado: form.estado, pombal: form.pombal, pai: form.pai, mae: form.mae, obs: form.obs, emoji: form.emoji, provas: 0, percentil: 0, forma: 50 }
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

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Pombos</div><div className="section-sub">{pombos.length} registados</div></div>
        <button className="btn btn-primary" onClick={openNew}>＋ Novo Pombo</button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <input className="input" placeholder="🔍 Pesquisar por nome ou anel..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : filtered.length === 0 ? <EmptyState icon="🐦" title="Sem pombos" desc="Adicione o seu primeiro pombo" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Pombo</button>} />
        : <div className="grid-auto">
            {filtered.map(p => {
              const fc = (p.forma||50) >= 80 ? '#1ed98a' : (p.forma||50) >= 60 ? '#facc15' : '#f87171'
              return (
                <div key={p.id} className="pombo-card" onClick={() => openDetail(p)}>
                  <div className="pombo-photo">
                    {p.foto_url ? <img src={p.foto_url} alt={p.nome} /> : p.emoji}
                    <div style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,.6)', borderRadius:6, padding:'2px 6px', fontSize:11, fontWeight:700 }}>{p.sexo==='M'?'♂':'♀'}</div>
                  </div>
                  <div className="pombo-info">
                    <div className="pombo-anel">{p.anilha}</div>
                    <div className="pombo-nome">{p.nome}</div>
                    <Badge v={statusBadge[p.estado]}>{p.estado}</Badge>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
                      <div className="progress" style={{ flex:1 }}><div className="progress-bar" style={{ width:`${p.forma||50}%`, background:fc }} /></div>
                      <span style={{ fontSize:11, fontWeight:700, color:fc }}>{p.forma||50}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
      }
      <Modal open={modal==='form'} onClose={close} title={selected?`✏️ Editar — ${selected.nome}`:'🐦 Novo Pombo'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}{selected?'Guardar':'Adicionar'}</button></>}>
        <div className="form-grid">
          <div className="col-2" style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:72, height:72, borderRadius:14, border:'2px dashed #243860', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', cursor:'pointer', flexShrink:0 }} onClick={() => document.getElementById('photo-up').click()}>
              {photoPreview ? <img src={photoPreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:32 }}>{form.emoji}</span>}
            </div>
            <div>
              <input type="file" id="photo-up" accept="image/*" style={{ display:'none' }} onChange={e => { const f=e.target.files[0]; if(f){setPhotoFile(f);setPhotoPreview(URL.createObjectURL(f))} }} />
              <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('photo-up').click()}>📸 Foto</button>
            </div>
          </div>
          <Field label="Anel *"><input className="input" placeholder="PT-2026-00000" value={form.anilha} onChange={e => sf('anilha', e.target.value.toUpperCase())} /></Field>
          <Field label="Nome *"><input className="input" placeholder="Nome do pombo" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field>
          <Field label="Sexo"><select className="input" value={form.sexo} onChange={e => sf('sexo', e.target.value)}><option value="M">♂ Macho</option><option value="F">♀ Fêmea</option></select></Field>
          <Field label="Estado"><select className="input" value={form.estado} onChange={e => sf('estado', e.target.value)}>{['ativo','reproducao','lesionado','inativo'].map(s=><option key={s}>{s}</option>)}</select></Field>
          <Field label="Cor"><input className="input" placeholder="Azul barrado" value={form.cor} onChange={e => sf('cor', e.target.value)} /></Field>
          <Field label="Peso (g)"><input className="input" type="number" placeholder="420" value={form.peso} onChange={e => sf('peso', e.target.value)} /></Field>
          <Field label="Pombal"><select className="input" value={form.pombal} onChange={e => sf('pombal', e.target.value)}><option value="">— Sem pombal —</option>{pombais.map(pb=><option key={pb.id}>{pb.nome}</option>)}</select></Field>
          <div className="col-2"><Field label="Especialidades"><div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>{ESPS.map(([v,l])=><button key={v} type="button" className={`chip${form.esp.includes(v)?' active':''}`} onClick={()=>toggleEsp(v)}>{l}</button>)}</div></Field></div>
          <Field label="Anel do Pai"><input className="input" style={{ fontSize:11 }} placeholder="PT-0000-00000" value={form.pai} onChange={e => sf('pai', e.target.value.toUpperCase())} /></Field>
          <Field label="Anel da Mãe"><input className="input" style={{ fontSize:11 }} placeholder="PT-0000-00000" value={form.mae} onChange={e => sf('mae', e.target.value.toUpperCase())} /></Field>
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field></div>
        </div>
      </Modal>
      {selected && (
        <Modal open={modal==='detail'} onClose={close} title={`${selected.emoji} ${selected.nome}`} wide
          footer={<div style={{ display:'flex', gap:8, width:'100%' }}><button className="btn btn-danger btn-sm" onClick={()=>{close();setConfirm(selected)}}>🗑️ Eliminar</button><div style={{ flex:1 }}/><button className="btn btn-secondary" onClick={close}>Fechar</button><button className="btn btn-primary" onClick={()=>openEdit(selected)}>✏️ Editar</button></div>}>
          <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
            <div style={{ width:80, height:80, borderRadius:14, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, overflow:'hidden', flexShrink:0, border:'1px solid #243860' }}>
              {selected.foto_url?<img src={selected.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:selected.emoji}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                <span style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'#1ed98a' }}>{selected.anilha}</span>
                <Badge v={statusBadge[selected.estado]}>{selected.estado}</Badge>
              </div>
              <div style={{ fontSize:13, color:'#94a3b8', marginBottom:2 }}>{selected.sexo==='M'?'♂ Macho':'♀ Fêmea'} · {selected.cor||'—'}</div>
              <div style={{ fontSize:13, color:'#94a3b8' }}>🏠 {selected.pombal||'—'}</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><div className="label">Pai</div><div style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'#1ed98a' }}>{selected.pai||'—'}</div></div>
            <div><div className="label">Mãe</div><div style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'#1ed98a' }}>{selected.mae||'—'}</div></div>
          </div>
          {selected.obs&&<div style={{ marginTop:12 }}><div className="label">Observações</div><div style={{ fontSize:13, color:'#cbd5e1', marginTop:4 }}>{selected.obs}</div></div>}
        </Modal>
      )}
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar pombo"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar "{confirm?.nome}"?</p>
      </Modal>
    </div>
  )
}function Pombais() {
  const toast = useToast()
  const [pombais, setPombais] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const EMPTY = { nome:'', tipo:'Misto', cap:'40', loc:'', lat:'', lon:'', cor:'#1ed98a' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))
  const CORES = ['#1ed98a','#D94F4F','#2E7DD4','#C9A44A','#6C4FBB','#E07B39']

  const load = useCallback(async () => {
    setLoading(true)
    try { const [pb,p] = await Promise.all([db.getPombais(),db.getPombos()]); setPombais(pb); setPombos(p) }
    catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true) }
  const openEdit = (pb) => { setSelected(pb); setForm({ nome:pb.nome||'', tipo:pb.tipo||'Misto', cap:String(pb.cap||40), loc:pb.loc||'', lat:String(pb.lat||''), lon:String(pb.lon||''), cor:pb.cor||'#1ed98a' }); setModal(true) }
  const close = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório','warn'); return }
    setSaving(true)
    try {
      const p = { nome:form.nome.trim(), tipo:form.tipo, cap:parseInt(form.cap)||40, loc:form.loc, lat:form.lat?parseFloat(form.lat):null, lon:form.lon?parseFloat(form.lon):null, cor:form.cor }
      selected ? await db.updatePombal(selected.id,p) : await db.createPombal(p)
      toast(selected?'Actualizado!':'Pombal criado!','ok'); close(); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deletePombal(confirm.id); toast('Eliminado','ok'); setConfirm(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Pombais</div><div className="section-sub">{pombais.length} instalações</div></div>
        <button className="btn btn-primary" onClick={openNew}>＋ Novo Pombal</button>
      </div>
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        : pombais.length===0 ? <EmptyState icon="🏠" title="Sem pombais" desc="Registe o seu pombal" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Pombal</button>} />
        : <div className="grid-2">
            {pombais.map(pb => {
              const n = pombos.filter(p=>p.pombal===pb.nome).length
              const pct = Math.round(n/Math.max(pb.cap,1)*100)
              const bar = pct>90?'#f87171':pct>70?'#facc15':'#1ed98a'
              return (
                <div key={pb.id} className="card card-p">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:pb.cor+'20', border:`1px solid ${pb.cor}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏠</div>
                      <div>
                        <div style={{ fontWeight:600, color:'#fff' }}>{pb.nome}</div>
                        <div style={{ fontSize:12, color:'#64748b' }}>{pb.tipo}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-icon btn-sm" onClick={()=>openEdit(pb)}>✏️</button>
                      <button className="btn btn-icon btn-sm" onClick={()=>setConfirm(pb)}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                    <span style={{ color:'#94a3b8' }}>Ocupação</span>
                    <span style={{ fontWeight:600, color:'#fff' }}>{n}/{pb.cap} ({pct}%)</span>
                  </div>
                  <div className="progress"><div className="progress-bar" style={{ width:`${Math.min(pct,100)}%`, background:bar }} /></div>
                  {pb.loc&&<div style={{ fontSize:11, color:'#64748b', marginTop:8 }}>📍 {pb.loc}</div>}
                </div>
              )
            })}
          </div>
      }
      <Modal open={modal} onClose={close} title={selected?'✏️ Editar Pombal':'🏠 Novo Pombal'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}{selected?'Guardar':'Criar'}</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Pombal Principal" value={form.nome} onChange={e=>sf('nome',e.target.value)} /></Field></div>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e=>sf('tipo',e.target.value)}>{['Misto','Machos','Fêmeas','Jovens','Reprodutores'].map(t=><option key={t}>{t}</option>)}</select></Field>
          <Field label="Capacidade"><input className="input" type="number" value={form.cap} onChange={e=>sf('cap',e.target.value)} /></Field>
          <div className="col-2"><Field label="Morada"><input className="input" placeholder="Endereço" value={form.loc} onChange={e=>sf('loc',e.target.value)} /></Field></div>
          <Field label="Latitude GPS"><input className="input" placeholder="38.80234" value={form.lat} onChange={e=>sf('lat',e.target.value)} /></Field>
          <Field label="Longitude GPS"><input className="input" placeholder="-9.38142" value={form.lon} onChange={e=>sf('lon',e.target.value)} /></Field>
          <div className="col-2">
            <label className="label" style={{ display:'block', marginBottom:6 }}>Cor</label>
            <div style={{ display:'flex', gap:8 }}>{CORES.map(c=><button key={c} type="button" onClick={()=>sf('cor',c)} style={{ width:28, height:28, borderRadius:8, background:c, border:form.cor===c?'3px solid #fff':'2px solid transparent', cursor:'pointer' }} />)}</div>
          </div>
        </div>
      </Modal>
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar pombal"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar "{confirm?.nome}"?</p>
      </Modal>
    </div>
  )
}function Provas() {
  const toast = useToast()
  const [provas, setProvas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const EMPTY = { nome:'', data:new Date().toISOString().slice(0,10), dist:'', tipo:'Fundo', local_solta:'', lugar:'', vel:'', n_pombos:'' }
  const [form, setForm] = useState(EMPTY)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try { setProvas(await db.getProvas()) }
    catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

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

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Provas</div><div className="section-sub">{provas.length} provas · {provas.filter(p=>p.lugar===1).length} vitórias</div></div>
        <button className="btn btn-primary" onClick={()=>{ setForm(EMPTY); setModal(true) }}>＋ Nova Prova</button>
      </div>
      <div className="grid-3 mb-6">
        <KpiCard icon="🏆" label="Total" value={provas.length} color="text-yellow"/>
        <KpiCard icon="🥇" label="Vitórias" value={provas.filter(p=>p.lugar===1).length} color="text-green"/>
        <KpiCard icon="📍" label="Km Totais" value={provas.reduce((s,p)=>s+(p.dist||0),0)+'km'} color="text-blue"/>
      </div>
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        : provas.length===0 ? <EmptyState icon="🏆" title="Sem provas" desc="Registe a primeira prova" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>＋ Nova Prova</button>} />
        : <div className="card" style={{ overflowX:'auto' }}>
            <table>
              <thead><tr><th>Data</th><th>Prova</th><th>Tipo</th><th>Dist.</th><th>Local Solta</th><th>Lugar</th><th>Vel.</th><th></th></tr></thead>
              <tbody>
                {provas.map(p=>(
                  <tr key={p.id}>
                    <td style={{ color:'#64748b', fontSize:12 }}>{new Date(p.data_reg).toLocaleDateString('pt-PT')}</td>
                    <td style={{ fontWeight:500 }}>{p.nome}</td>
                    <td><Badge v="blue">{p.tipo?.replace(/_/g,' ')}</Badge></td>
                    <td style={{ fontFamily:'Barlow Condensed', fontSize:16, color:'#facc15' }}>{p.dist}km</td>
                    <td style={{ color:'#94a3b8', fontSize:12 }}>{p.local_solta||'—'}</td>
                    <td><span style={{ fontFamily:'Barlow Condensed', fontSize:18, fontWeight:700, color:p.lugar===1?'#facc15':p.lugar===2?'#cbd5e1':p.lugar===3?'#b45309':'#94a3b8' }}>{p.lugar?p.lugar+'º':'—'}</span></td>
                    <td style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'#1ed98a' }}>{p.vel||'—'}</td>
                    <td><button className="btn btn-icon btn-sm" onClick={()=>setConfirm(p)}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="🏆 Nova Prova" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}Registar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Grande Prova do Tejo" value={form.nome} onChange={e=>sf('nome',e.target.value)} /></Field></div>
          <Field label="Data"><input className="input" type="date" value={form.data} onChange={e=>sf('data',e.target.value)} /></Field>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e=>sf('tipo',e.target.value)}>{['Velocidade','Semi-Fundo','Fundo','Grande Fundo'].map(t=><option key={t}>{t}</option>)}</select></Field>
          <Field label="Distância (km)"><input className="input" type="number" placeholder="180" value={form.dist} onChange={e=>sf('dist',e.target.value)} /></Field>
          <Field label="Nº Pombos"><input className="input" type="number" placeholder="30" value={form.n_pombos} onChange={e=>sf('n_pombos',e.target.value)} /></Field>
          <div className="col-2"><Field label="Local de Solta"><input className="input" placeholder="Santarém, Portugal" value={form.local_solta} onChange={e=>sf('local_solta',e.target.value)} /></Field></div>
          <Field label="Lugar"><input className="input" type="number" placeholder="1" value={form.lugar} onChange={e=>sf('lugar',e.target.value)} /></Field>
          <Field label="Velocidade (m/min)"><input className="input" placeholder="1382" value={form.vel} onChange={e=>sf('vel',e.target.value)} /></Field>
        </div>
      </Modal>
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar prova"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar "{confirm?.nome}"?</p>
      </Modal>
    </div>
  )
}function Financas() {
  const toast = useToast()
  const [trans, setTrans] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ tipo:'despesa', val:'', desc:'', cat:'Alimentação', data:new Date().toISOString().slice(0,10) })
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try { setTrans(await db.getFinancas()) }
    catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  const filtered = trans.filter(t => {
    if (periodo==='tudo') return true
    const d=new Date(t.data_reg); const now=new Date()
    if (periodo==='semana') return (now-d)/86400000<=7
    if (periodo==='mes') return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()
    if (periodo==='ano') return d.getFullYear()===now.getFullYear()
    return true
  })

  const rec = filtered.filter(t=>t.tipo==='receita').reduce((s,t)=>s+(t.val||0),0)
  const dep = filtered.filter(t=>t.tipo==='despesa').reduce((s,t)=>s+(t.val||0),0)

  const save = async () => {
    if (!form.val||isNaN(parseFloat(form.val))) { toast('Valor inválido','warn'); return }
    if (!form.desc.trim()) { toast('Descrição obrigatória','warn'); return }
    setSaving(true)
    try {
      await db.createFinanca({ tipo:form.tipo, val:parseFloat(form.val), descricao:form.desc, cat:form.cat, data_reg:form.data })
      toast('Registado!','ok'); setModal(false); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteFinanca(confirm.id); toast('Eliminado','ok'); setConfirm(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Finanças</div></div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}>＋ Nova Transacção</button>
      </div>
      <div className="chips mb-4">
        {[['semana','Semana'],['mes','Mês'],['ano','Ano'],['tudo','Tudo']].map(([v,l])=>(
          <button key={v} className={`chip${periodo===v?' active':''}`} onClick={()=>setPeriodo(v)}>{l}</button>
        ))}
      </div>
      <div className="grid-3 mb-6">
        <KpiCard icon="💚" label="Receitas" value={`${rec.toFixed(0)}€`} color="text-green"/>
        <KpiCard icon="🔴" label="Despesas" value={`${dep.toFixed(0)}€`} color="text-red"/>
        <KpiCard icon="⚖️" label="Saldo" value={`${(rec-dep)>=0?'+':''}${(rec-dep).toFixed(0)}€`} color={(rec-dep)>=0?'text-green':'text-red'}/>
      </div>
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        : filtered.length===0 ? <EmptyState icon="💰" title="Sem transacções" desc="Registe a primeira transacção" />
        : <div className="card" style={{ overflowX:'auto' }}>
            <table>
              <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th></th></tr></thead>
              <tbody>
                {filtered.map(t=>(
                  <tr key={t.id}>
                    <td style={{ color:'#64748b', fontSize:12 }}>{new Date(t.data_reg).toLocaleDateString('pt-PT')}</td>
                    <td style={{ fontWeight:500 }}>{t.descricao}</td>
                    <td><Badge>{t.cat}</Badge></td>
                    <td><Badge v={t.tipo==='receita'?'green':'red'}>{t.tipo}</Badge></td>
                    <td style={{ fontFamily:'Barlow Condensed', fontSize:16, fontWeight:700, color:t.tipo==='receita'?'#1ed98a':'#f87171' }}>{t.tipo==='receita'?'+':'-'}{(t.val||0).toFixed(2)}€</td>
                    <td><button className="btn btn-icon btn-sm" onClick={()=>setConfirm(t)}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="💰 Nova Transacção"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}Guardar</button></>}>
        <div style={{ display:'flex', gap:4, background:'#1a2840', borderRadius:10, padding:4, marginBottom:16 }}>
          {[['despesa','📉 Despesa'],['receita','📈 Receita']].map(([v,l])=>(
            <button key={v} onClick={()=>{ sf('tipo',v); sf('cat',v==='despesa'?'Alimentação':'Prémios') }}
              style={{ flex:1, padding:'8px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:form.tipo===v?(v==='despesa'?'#ef4444':'#1ed98a'):'none', color:form.tipo===v?(v==='despesa'?'#fff':'#0a0f14'):'#94a3b8' }}>
              {l}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <Field label="Valor (€) *"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.val} onChange={e=>sf('val',e.target.value)} /></Field>
          <Field label="Data"><input className="input" type="date" value={form.data} onChange={e=>sf('data',e.target.value)} /></Field>
          <div className="col-2"><Field label="Descrição *"><input className="input" placeholder="Ex: Ração Premium" value={form.desc} onChange={e=>sf('desc',e.target.value)} /></Field></div>
          <div className="col-2"><Field label="Categoria"><select className="input" value={form.cat} onChange={e=>sf('cat',e.target.value)}>{(form.tipo==='despesa'?['Alimentação','Medicamentos','Provas','Veterinário','Manutenção','Equipamento','Outros']:['Prémios','Venda de Pombos','Patrocínio','Outros']).map(c=><option key={c}>{c}</option>)}</select></Field></div>
        </div>
      </Modal>
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar transacção"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar "{confirm?.descricao}"?</p>
      </Modal>
    </div>
  )
}function Saude() {
  const toast = useToast()
  const [registos, setRegistos] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ pombo_id:'', apt:'boa', fase:'competicao', peso:'', obs:'', data:new Date().toISOString().slice(0,10) })
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try { const [r,p] = await Promise.all([db.getSaude(),db.getPombos()]); setRegistos(r); setPombos(p) }
    catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  const save = async () => {
    if (!form.pombo_id) { toast('Seleccione um pombo','warn'); return }
    setSaving(true)
    try {
      await db.createSaude({ pigeon_id:form.pombo_id, aptidao:form.apt, fase:form.fase, peso:form.peso?parseInt(form.peso):null, obs:form.obs, data_reg:form.data })
      toast('Guardado!','ok'); setModal(false); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteSaude(confirm.id); toast('Eliminado','ok'); setConfirm(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  const aptVar = { excelente:'green', boa:'green', media:'yellow', fraca:'yellow', doente:'red', quarentena:'red' }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Saúde</div><div className="section-sub">{registos.length} registos</div></div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}>＋ Novo Registo</button>
      </div>
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        : registos.length===0 ? <EmptyState icon="🏥" title="Sem registos" desc="Registe o estado de saúde dos pombos" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>＋ Novo Registo</button>} />
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
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="🏥 Novo Registo de Saúde"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}Guardar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Pombo *"><select className="input" value={form.pombo_id} onChange={e=>sf('pombo_id',e.target.value)}><option value="">— Seleccionar —</option>{pombos.map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field></div>
          <Field label="Aptidão"><select className="input" value={form.apt} onChange={e=>sf('apt',e.target.value)}>{['excelente','boa','media','fraca','doente','quarentena'].map(a=><option key={a}>{a}</option>)}</select></Field>
          <Field label="Fase"><select className="input" value={form.fase} onChange={e=>sf('fase',e.target.value)}>{['competicao','reproducao','muda','repouso','jovem'].map(f=><option key={f}>{f}</option>)}</select></Field>
          <Field label="Peso (g)"><input className="input" type="number" placeholder="420" value={form.peso} onChange={e=>sf('peso',e.target.value)} /></Field>
          <Field label="Data"><input className="input" type="date" value={form.data} onChange={e=>sf('data',e.target.value)} /></Field>
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e=>sf('obs',e.target.value)} /></Field></div>
        </div>
      </Modal>
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar registo"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar este registo?</p>
      </Modal>
    </div>
  )
}

function Perfil() {
  const { user, signOut } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome:'', tel:'', fed:'', org:'', pombal_nome:'', pombal_morada:'', pombal_lat:'', pombal_lon:'' })
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(()=>{
    async function load() {
      setLoading(true)
      try {
        const p = await db.getPerfil()
        if (p) setForm({ nome:p.nome||'', tel:p.tel||'', fed:p.fed||'', org:p.org||'', pombal_nome:p.pombal_nome||'', pombal_morada:p.pombal_morada||'', pombal_lat:String(p.pombal_lat||''), pombal_lon:String(p.pombal_lon||'') })
        else setForm(f=>({...f, nome:user?.user_metadata?.nome||''}))
      } catch(e) {}
      finally { setLoading(false) }
    }
    load()
  },[user])

  const save = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório','warn'); return }
    setSaving(true)
    try {
      await db.savePerfil({ nome:form.nome, tel:form.tel, fed:form.fed, org:form.org, pombal_nome:form.pombal_nome, pombal_morada:form.pombal_morada, pombal_lat:form.pombal_lat?parseFloat(form.pombal_lat):null, pombal_lon:form.pombal_lon?parseFloat(form.pombal_lon):null })
      toast('Perfil guardado! ✅','ok')
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Perfil</div><div className="section-sub">{user?.email}</div></div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:'💾'} Guardar</button>
          <button className="btn btn-secondary" onClick={signOut}>Sair</button>
        </div>
      </div>
      <div className="grid-2">
        <div className="card card-p">
          <div style={{ fontWeight:600, color:'#fff', marginBottom:16 }}>👤 Dados Pessoais</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label="Nome *"><input className="input" value={form.nome} onChange={e=>sf('nome',e.target.value)} /></Field>
            <Field label="Email"><input className="input" value={user?.email} disabled style={{ opacity:.6 }} /></Field>
            <Field label="Telefone"><input className="input" placeholder="+351 9XX XXX XXX" value={form.tel} onChange={e=>sf('tel',e.target.value)} /></Field>
            <Field label="Nº Federativo"><input className="input" placeholder="FCP-2026-XXXX" value={form.fed} onChange={e=>sf('fed',e.target.value)} /></Field>
            <Field label="Organização"><input className="input" placeholder="Sociedade Columbófila..." value={form.org} onChange={e=>sf('org',e.target.value)} /></Field>
          </div>
        </div>
        <div className="card card-p">
          <div style={{ fontWeight:600, color:'#fff', marginBottom:16 }}>🏠 Dados do Pombal</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label="Nome do Pombal"><input className="input" placeholder="Pombal da Quinta..." value={form.pombal_nome} onChange={e=>sf('pombal_nome',e.target.value)} /></Field>
            <Field label="Morada"><input className="input" placeholder="Localidade, Concelho" value={form.pombal_morada} onChange={e=>sf('pombal_morada',e.target.value)} /></Field>
            <Field label="Latitude GPS"><input className="input" placeholder="38.80234" value={form.pombal_lat} onChange={e=>sf('pombal_lat',e.target.value)} /></Field>
            <Field label="Longitude GPS"><input className="input" placeholder="-9.38142" value={form.pombal_lon} onChange={e=>sf('pombal_lon',e.target.value)} /></Field>
            {form.pombal_lat&&form.pombal_lon&&(
              <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid #243860', height:140 }}>
                <iframe width="100%" height="100%" frameBorder="0" style={{ display:'block' }} src={`https://maps.google.com/maps?q=${form.pombal_lat},${form.pombal_lon}&z=14&output=embed`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmBreve({ icon, title }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', textAlign:'center' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>{icon}</div>
      <div style={{ fontSize:18, fontWeight:600, color:'#fff', marginBottom:8 }}>{title}</div>
      <div style={{ fontSize:13, color:'#64748b' }}>Em desenvolvimento — disponível em breve</div>
    </div>
  )
}

const NAV = [
  { section:'Principal', items:[{ id:'dashboard', icon:'📊', label:'Dashboard' },{ id:'pombos', icon:'🐦', label:'Pombos' },{ id:'pombais', icon:'🏠', label:'Pombais' }] },
  { section:'Desporto', items:[{ id:'provas', icon:'🏆', label:'Provas' },{ id:'treinos', icon:'🎯', label:'Treinos' },{ id:'calendario', icon:'📅', label:'Calendário' }] },
  { section:'Gestão', items:[{ id:'saude', icon:'🏥', label:'Saúde' },{ id:'reproducao', icon:'🥚', label:'Reprodução' },{ id:'alimentacao', icon:'🌾', label:'Alimentação' },{ id:'financas', icon:'💰', label:'Finanças' }] },
  { section:'Análise', items:[{ id:'relatorios', icon:'📊', label:'Relatórios' },{ id:'meteorologia', icon:'🌦️', label:'Meteorologia' },{ id:'perfil', icon:'⚙️', label:'Perfil' }] },
]

function AppLayout() {
  const { user } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const nav = (p) => { setPage(p); setSidebarOpen(false) }
  const initials = user?.user_metadata?.nome?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'

  const renderPage = () => {
    switch(page) {
      case 'dashboard':    return <Dashboard nav={nav} />
      case 'pombos':       return <Pombos />
      case 'pombais':      return <Pombais />
      case 'provas':       return <Provas />
      case 'saude':        return <Saude />
      case 'financas':     return <Financas />
      case 'perfil':       return <Perfil />
      default:             return <EmBreve icon={NAV.flatMap(s=>s.items).find(i=>i.id===page)?.icon||'🔧'} title={NAV.flatMap(s=>s.items).find(i=>i.id===page)?.label||page} />
    }
  }

  return (
    <div className="app">
      <div className={`mobile-overlay${sidebarOpen?' show':''}`} onClick={()=>setSidebarOpen(false)} />
      <aside className={`sidebar${sidebarOpen?' open':''}`}>
        <div className="logo">
          <div className="logo-icon">🕊️</div>
          <div><div className="logo-text">ChampionsLoft</div><div className="logo-sub">Gestão Columbófila</div></div>
        </div>
        <nav className="nav">
          {NAV.map(({section,items})=>(
            <div key={section} className="nav-section">
              <div className="nav-section-label">{section}</div>
              {items.map(item=>(
                <div key={item.id} className={`nav-item${page===item.id?' active':''}`} onClick={()=>nav(item.id)}>
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
            <div style={{ flex:1, minWidth:0 }}>
              <div className="user-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.user_metadata?.nome||'Utilizador'}</div>
              <div className="user-email" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn btn-icon" id="menu-btn" onClick={()=>setSidebarOpen(true)} style={{ display:'none' }}>☰</button>
          <style>{`@media(max-width:768px){#menu-btn{display:flex!important}}`}</style>
          <div style={{ flex:1 }} />
          <div style={{ fontSize:12, color:'#475569' }}>{new Date().toLocaleDateString('pt-PT',{weekday:'short',day:'numeric',month:'short'})}</div>
        </header>
        <main className="page">{renderPage()}</main>
      </div>
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0a0f14', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:40, marginBottom:16 }}>🕊️</div><Spinner lg /></div>
    </div>
  )
  return user ? <AppLayout /> : <Login />
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  )
}
export default App