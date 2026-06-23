import { useState, useEffect, useCallback } from 'react'
import { db, supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Badge, Field } from '../components/ui'

const planoBadge = { gratuito:'gray', base:'blue', profissional:'yellow', elite:'green' }
const ADMIN_EMAILS = ['fabioacs23@gmail.com']

export default function Admin({ nav }) {
  const toast = useToast()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(null)
  const [tab, setTab] = useState('licencas')
  const [licencas, setLicencas] = useState([])
  const [flags, setFlags] = useState([])
  const [betas, setBetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formPlano, setFormPlano] = useState('')
  const [formAtivo, setFormAtivo] = useState(true)
  const [modalBeta, setModalBeta] = useState(false)
  const [formBeta, setFormBeta] = useState({ email:'', nome:'' })
  const [perfis, setPerfis] = useState([])
  const [buscaBadge, setBuscaBadge] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [l, f, b, p] = await Promise.all([
        db.getLicencas(),
        supabase.from('feature_flags').select('*').order('label').then(r=>r.data||[]).catch(()=>[]),
        supabase.from('beta_testers').select('*').order('created_at',{ascending:false}).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('perfis').select('user_id,nome,slug,org,verificado,tipo_verificado').order('nome').then(r=>r.data||[]).catch(()=>[]),
      ])
      setLicencas(l); setFlags(f); setBetas(b); setPerfis(p)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [])

  const checarAcesso = useCallback(async () => {
    if (!user?.email) return
    const ok = ADMIN_EMAILS.includes(user.email) || await db.isAdmin(user.email).catch(()=>false)
    setIsAdmin(ok)
    if (ok) load()
  }, [user?.email, load])

  useEffect(() => { checarAcesso() }, [checarAcesso])

  if (isAdmin === null || loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
  if (!isAdmin) return (
    <div style={{ textAlign:'center', padding:60 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:16, color:'#fff', fontWeight:600 }}>Acesso Restrito</div>
      <div style={{ fontSize:13, color:'#7A8699', marginTop:8 }}>Apenas para administradores do ChampionsLoft</div>
    </div>
  )

  const totalAtivos = licencas.filter(l=>l.ativo!==false).length
  const porPlano = licencas.reduce((a,l)=>{ a[l.plano||'gratuito']=(a[l.plano||'gratuito']||0)+1; return a },{})
  const mrrEstimado = licencas.filter(l=>l.ativo!==false).reduce((s,l)=>s+({'base':5,'profissional':12,'elite':25}[l.plano]||0),0)
  const filtradas = licencas.filter(l=>!busca||l.email?.toLowerCase().includes(busca.toLowerCase()))

  const openEdit = (l) => { setModal(l); setFormPlano(l.plano||'gratuito'); setFormAtivo(l.ativo!==false) }
  const close = () => setModal(null)
  const save = async () => {
    setSaving(true)
    try { await db.updateLicenca(modal.id,{plano:formPlano,ativo:formAtivo}); toast('Guardado!','ok'); close(); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const toggleFlag = async (flag) => {
    try {
      await supabase.from('feature_flags').update({ ativo:!flag.ativo, updated_at:new Date().toISOString() }).eq('id',flag.id)
      setFlags(fs=>fs.map(f=>f.id===flag.id?{...f,ativo:!f.ativo}:f))
      toast(`${flag.label} ${!flag.ativo?'activado':'desactivado'}`, 'ok')
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const toggleApenasAdmin = async (flag) => {
    try {
      await supabase.from('feature_flags').update({ apenas_admin:!flag.apenas_admin, updated_at:new Date().toISOString() }).eq('id',flag.id)
      setFlags(fs=>fs.map(f=>f.id===flag.id?{...f,apenas_admin:!f.apenas_admin}:f))
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const addBeta = async () => {
    if (!formBeta.email) return
    try {
      await supabase.from('beta_testers').insert({ email:formBeta.email, nome:formBeta.nome })
      toast('Beta tester adicionado!','ok'); setModalBeta(false); setFormBeta({email:'',nome:''}); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const removeBeta = async (id, email) => {
    if (!confirm(`Remover ${email}?`)) return
    try { await supabase.from('beta_testers').delete().eq('id',id); toast('Removido','ok'); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  return (
    <div>
      {/* Header premium */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }} />
        <div style={{ fontSize:18, fontWeight:900, color:'#D4AF37', fontFamily:"'Fraunces',serif" }}>👑 Painel de Administração</div>
        <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>ChampionsLoft — acesso restrito</div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
        {[['✅',totalAtivos,'Activas','#2DD4A7'],['👑',porPlano.elite||0,'Elite','#D4AF37'],['💎',porPlano.profissional||0,'Pro','#4C8DFF'],[mrrEstimado+'€',0,'MRR Est.','#f87171']].map(([val,,label,cor])=>(
          <div key={label} className="card card-p" style={{ textAlign:'center', borderTop:`2px solid ${cor}` }}>
            <div style={{ fontSize:20, fontWeight:700, color:cor }}>{val}</div>
            <div style={{ fontSize:10, color:'#7A8699' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14 }}>
        {[['licencas','👥 Licenças'],['flags','🚩 Módulos'],['beta','🧪 Beta'],['badges','✅ Badges']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'8px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'linear-gradient(135deg,#1E5FD9,#1456C0)':'none', color:tab===t?'#fff':'#475569', transition:'all .15s' }}>{l}</button>
        ))}
      </div>

      {/* TAB: LICENÇAS */}
      {tab==='licencas' && <>
        <input className="input" placeholder="🔍 Pesquisar por email..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ marginBottom:12 }} />
        {filtradas.length===0
          ? <EmptyState icon="👥" title="Sem resultados" desc="Nenhuma conta encontrada" />
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {filtradas.map(l=>(
                <div key={l.id} className="card card-p">
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:160 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>{l.email}</div>
                      <div style={{ fontSize:11, color:'#7A8699' }}>{l.created_at?new Date(l.created_at).toLocaleDateString('pt-PT'):'—'}{l.vitalicio?' · Vitalícia':''}</div>
                    </div>
                    <Badge v={planoBadge[l.plano]||'gray'}>{l.plano||'gratuito'}</Badge>
                    <Badge v={l.ativo!==false?'green':'red'}>{l.ativo!==false?'Activa':'Inactiva'}</Badge>
                    <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(l)}>✏️ Gerir</button>
                  </div>
                </div>
              ))}
            </div>
        }
      </>}

      {/* TAB: FEATURE FLAGS */}
      {tab==='flags' && (
        <div>
          <div style={{ fontSize:12, color:'#94a3b8', marginBottom:12, padding:'10px 14px', background:'rgba(212,175,55,.06)', border:'1px solid rgba(212,175,55,.15)', borderRadius:8 }}>
            💡 Liga/desliga módulos. <strong style={{color:'#D4AF37'}}>Só Admin</strong> = visível apenas para ti e beta testers. <strong style={{color:'#f87171'}}>OFF</strong> = invisível para todos.
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {flags.map(f=>(
              <div key={f.id} className="card card-p" style={{ borderLeft:`3px solid ${f.ativo?'#2DD4A7':'#475569'}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:f.ativo?'#fff':'#475569' }}>{f.label}</div>
                    <div style={{ fontSize:10, color:'#475569' }}>/{f.id}{f.descricao?` · ${f.descricao}`:''}</div>
                  </div>
                  <button onClick={()=>toggleApenasAdmin(f)}
                    style={{ fontSize:9, padding:'3px 8px', borderRadius:10, border:`1px solid ${f.apenas_admin?'rgba(212,175,55,.4)':'#1B2D52'}`, background:f.apenas_admin?'rgba(212,175,55,.1)':'none', color:f.apenas_admin?'#D4AF37':'#475569', cursor:'pointer', whiteSpace:'nowrap' }}>
                    {f.apenas_admin?'👑 Só Admin':'🌐 Público'}
                  </button>
                  <div onClick={()=>toggleFlag(f)} style={{ cursor:'pointer', width:44, height:24, borderRadius:12, background:f.ativo?'#2DD4A7':'#1B2D52', position:'relative', transition:'background .2s', flexShrink:0 }}>
                    <div style={{ position:'absolute', top:3, left:f.ativo?22:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.3)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: BETA TESTERS */}
      {tab==='beta' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:12, color:'#94a3b8' }}>Beta testers vêem todos os módulos mesmo desactivados.</div>
            <button className="btn btn-primary btn-sm" onClick={()=>setModalBeta(true)}>+ Adicionar</button>
          </div>
          {betas.length===0
            ? <EmptyState icon="🧪" title="Sem beta testers" desc="Adiciona utilizadores para acesso antecipado" />
            : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {betas.map(b=>(
                  <div key={b.id} className="card card-p" style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#D4AF37,#B8960C)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#050D1A', fontWeight:700, flexShrink:0 }}>
                      {b.nome?.[0]?.toUpperCase()||b.email?.[0]?.toUpperCase()||'?'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{b.nome||'—'}</div>
                      <div style={{ fontSize:11, color:'#7A8699' }}>{b.email}</div>
                    </div>
                    <span style={{ fontSize:10, color:'#D4AF37', background:'rgba(212,175,55,.1)', padding:'2px 8px', borderRadius:8 }}>🧪 Beta</span>
                    <button className="btn btn-icon btn-sm" onClick={()=>removeBeta(b.id,b.email)}>🗑️</button>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* Modal editar licença */}
      <Modal open={!!modal} onClose={close} title={`✏️ ${modal?.email}`}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}Guardar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Plano">
            <select className="input" value={formPlano} onChange={e=>setFormPlano(e.target.value)}>
              {['gratuito','base','profissional','elite','pro_grupo_1_5','pro_grupo_6_12','pro_grupo_13','elite_grupo_1_5','elite_grupo_6_12','elite_grupo_13'].map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
            <input type="checkbox" checked={formAtivo} onChange={e=>setFormAtivo(e.target.checked)} style={{ width:16, height:16, accentColor:'#2DD4A7' }} />
            <span style={{ fontSize:13, color:'#cbd5e1' }}>Licença activa</span>
          </label>
          {modal?.vitalicio && <div style={{ fontSize:11, color:'#D4AF37' }}>⚠️ Licença vitalícia (admin)</div>}
        </div>
      </Modal>

      {/* Modal beta tester */}
      <Modal open={modalBeta} onClose={()=>setModalBeta(false)} title="🧪 Novo Beta Tester"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalBeta(false)}>Cancelar</button><button className="btn btn-primary" onClick={addBeta}>Adicionar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Field label="Email *"><input className="input" placeholder="email@exemplo.pt" value={formBeta.email} onChange={e=>setFormBeta(f=>({...f,email:e.target.value}))} /></Field>
          <Field label="Nome"><input className="input" placeholder="Nome do utilizador" value={formBeta.nome} onChange={e=>setFormBeta(f=>({...f,nome:e.target.value}))} /></Field>
        </div>
      </Modal>

      {/* TAB: BADGES */}
      {tab==='badges' && (
        <div>
          <div style={{ marginBottom:12, padding:'10px 14px', background:'rgba(45,212,167,.06)', border:'1px solid rgba(45,212,167,.15)', borderRadius:8, fontSize:12, color:'#94a3b8' }}>
            O badge ✅ aparece no perfil público, na Comunidade e nos cards da Marketplace. Atribui com cuidado.
          </div>
          <input className="input" placeholder="🔍 Pesquisar perfil..." value={buscaBadge} onChange={e=>setBuscaBadge(e.target.value)} style={{ marginBottom:12 }} />
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {perfis.filter(p=>!buscaBadge||p.nome?.toLowerCase().includes(buscaBadge.toLowerCase())||p.org?.toLowerCase().includes(buscaBadge.toLowerCase())).map(p => (
              <div key={p.user_id} className="card card-p">
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#fff', flexShrink:0 }}>
                    {p.nome?.[0]?.toUpperCase()||'?'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>
                      {p.nome}
                      {p.verificado && <span style={{ marginLeft:6, fontSize:12, color:'#2DD4A7' }}>✅ {p.tipo_verificado}</span>}
                    </div>
                    {p.org && <div style={{ fontSize:11, color:'#7A8699' }}>{p.org}</div>}
                    {p.slug && <div style={{ fontSize:10, color:'#475569' }}>championsloft.app/p/{p.slug}</div>}
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    {!p.verificado ? (
                      <div style={{ display:'flex', gap:4 }}>
                        {['criador','clube','federacao'].map(tipo => (
                          <button key={tipo} className="btn btn-secondary btn-sm"
                            onClick={async () => {
                              await supabase.from('perfis').update({ verificado:true, tipo_verificado:tipo }).eq('user_id', p.user_id)
                              toast(`✅ Badge ${tipo} atribuído!`,'ok'); load()
                            }}>
                            {tipo}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button className="btn btn-secondary btn-sm"
                        onClick={async () => {
                          await supabase.from('perfis').update({ verificado:false, tipo_verificado:null }).eq('user_id', p.user_id)
                          toast('Badge removido','ok'); load()
                        }}>
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
