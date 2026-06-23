import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const CARGOS = ['socio','presidente','secretario','tesoureiro','vice-presidente','vogal']
const CARGO_COR = { presidente:'green', secretario:'blue', tesoureiro:'yellow', 'vice-presidente':'blue', vogal:'gray', socio:'gray' }
const TIPOS_COM = ['aviso','convocatoria','resultado','outro']
const TIPO_ICON = { aviso:'📢', convocatoria:'📋', resultado:'🏆', outro:'📌' }

const EMPTY_CLUBE = { nome:'', sigla:'', morada:'', cidade:'', federacao:'', email_club:'', tel:'', descricao:'' }
const EMPTY_SOCIO = { nome:'', email:'', tel:'', num_socio:'', cargo:'socio', quota_mensal:'0', notas:'', data_entrada: new Date().toISOString().slice(0,10) }
const EMPTY_COM = { titulo:'', conteudo:'', tipo:'aviso', fixado:false }

export default function Clubes({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const [clube, setClube] = useState(null)
  const [socios, setSocios] = useState([])
  const [quotas, setQuotas] = useState([])
  const [comunicados, setComunicados] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [modalClube, setModalClube] = useState(false)
  const [modalSocio, setModalSocio] = useState(false)
  const [modalCom, setModalCom] = useState(false)
  const [modalQuota, setModalQuota] = useState(null)
  const [selectedSocio, setSelectedSocio] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formClube, setFormClube] = useState(EMPTY_CLUBE)
  const [formSocio, setFormSocio] = useState(EMPTY_SOCIO)
  const [formCom, setFormCom] = useState(EMPTY_COM)
  const [busca, setBusca] = useState('')
  const sfc = (k,v) => setFormClube(f=>({...f,[k]:v}))
  const sfs = (k,v) => setFormSocio(f=>({...f,[k]:v}))
  const sfm = (k,v) => setFormCom(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: cl } = await supabase.from('clubes').select('*').eq('user_id', user?.id).maybeSingle()
      setClube(cl)
      if (cl) {
        const [{ data: s }, { data: q }, { data: c }] = await Promise.all([
          supabase.from('clube_socios').select('*').eq('clube_id', cl.id).order('nome'),
          supabase.from('clube_quotas').select('*').eq('clube_id', cl.id).order('created_at', { ascending: false }),
          supabase.from('clube_comunicados').select('*').eq('clube_id', cl.id).order('fixado', { ascending: false }).order('data_pub', { ascending: false }),
        ])
        setSocios(s||[]); setQuotas(q||[]); setComunicados(c||[])
      }
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const criarClube = async () => {
    if (!formClube.nome.trim()) { toast('Nome obrigatório','warn'); return }
    setSaving(true)
    try {
      const { data } = await supabase.from('clubes').insert({ ...formClube, user_id: user?.id }).select().single()
      setClube(data); setModalClube(false); load()
      toast('Clube criado!','ok')
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const actualizarClube = async () => {
    setSaving(true)
    try {
      await supabase.from('clubes').update(formClube).eq('id', clube.id)
      setModalClube(false); load(); toast('Guardado!','ok')
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const abrirEditClube = () => { setFormClube({ nome:clube.nome||'', sigla:clube.sigla||'', morada:clube.morada||'', cidade:clube.cidade||'', federacao:clube.federacao||'', email_club:clube.email_club||'', tel:clube.tel||'', descricao:clube.descricao||'' }); setModalClube(true) }

  const adicionarSocio = async () => {
    if (!formSocio.nome.trim()) { toast('Nome obrigatório','warn'); return }
    setSaving(true)
    try {
      if (selectedSocio) {
        await supabase.from('clube_socios').update(formSocio).eq('id', selectedSocio.id)
        toast('Actualizado!','ok')
      } else {
        await supabase.from('clube_socios').insert({ ...formSocio, clube_id: clube.id, quota_mensal: parseFloat(formSocio.quota_mensal)||0 })
        toast('Sócio adicionado!','ok')
      }
      setModalSocio(false); setSelectedSocio(null); setFormSocio(EMPTY_SOCIO); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const abrirEditSocio = (s) => { setSelectedSocio(s); setFormSocio({ nome:s.nome||'', email:s.email||'', tel:s.tel||'', num_socio:s.num_socio||'', cargo:s.cargo||'socio', quota_mensal:String(s.quota_mensal||0), notas:s.notas||'', data_entrada:s.data_entrada||'' }); setModalSocio(true) }

  const removerSocio = async (id) => {
    if (!confirm('Remover sócio?')) return
    await supabase.from('clube_socios').delete().eq('id', id); load(); toast('Removido','ok')
  }

  const publicarComunicado = async () => {
    if (!formCom.titulo.trim()) { toast('Título obrigatório','warn'); return }
    setSaving(true)
    try {
      await supabase.from('clube_comunicados').insert({ ...formCom, clube_id: clube.id, user_id: user?.id })
      setModalCom(false); setFormCom(EMPTY_COM); load(); toast('Comunicado publicado!','ok')
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const registarPagamento = async (socioId, ano, mes) => {
    await supabase.from('clube_quotas').insert({ clube_id: clube.id, socio_id: socioId, ano, mes, valor: socios.find(s=>s.id===socioId)?.quota_mensal||0, pago: true, data_pagamento: new Date().toISOString().slice(0,10) })
    load(); toast('Pagamento registado!','ok')
  }

  // KPIs
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth() + 1
  const ativos = socios.filter(s=>s.estado==='ativo')
  const quotasMes = quotas.filter(q=>q.ano===anoAtual&&q.mes===mesAtual&&q.pago)
  const totalMes = quotasMes.reduce((s,q)=>s+(q.valor||0),0)
  const emFalta = ativos.filter(s => !quotas.some(q=>q.socio_id===s.id&&q.ano===anoAtual&&q.mes===mesAtual&&q.pago))
  const sociosFiltrados = ativos.filter(s => !busca || s.nome.toLowerCase().includes(busca.toLowerCase()) || s.email?.includes(busca) || s.num_socio?.includes(busca))

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>

  if (!clube) return (
    <div>
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.2)', borderRadius:14, padding:'20px 18px', marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }} />
        <div style={{ fontSize:18, fontWeight:900, color:'#D4AF37', fontFamily:"'Fraunces',serif", marginBottom:6 }}>🏛️ Gestão de Clubes</div>
        <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20, lineHeight:1.6 }}>
          Regista a tua coletividade para gerir sócios, quotas e comunicados.<br/>
          Ideal para presidentes e secretários de clubes columbófilos.
        </div>
        <button className="btn btn-primary" onClick={() => setModalClube(true)}>+ Registar Clube</button>
      </div>
      <Modal open={modalClube} onClose={() => setModalClube(false)} title="🏛️ Registar Clube" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalClube(false)}>Cancelar</button><button className="btn btn-primary" onClick={criarClube} disabled={saving}>{saving?<Spinner/>:null}Criar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome do Clube *"><input className="input" value={formClube.nome} onChange={e=>sfc('nome',e.target.value)} placeholder="Ex: Grupo Columbófilo de Avis" /></Field></div>
          <Field label="Sigla"><input className="input" value={formClube.sigla} onChange={e=>sfc('sigla',e.target.value)} placeholder="GCA" /></Field>
          <Field label="Federação"><input className="input" value={formClube.federacao} onChange={e=>sfc('federacao',e.target.value)} placeholder="FCP" /></Field>
          <Field label="Cidade"><input className="input" value={formClube.cidade} onChange={e=>sfc('cidade',e.target.value)} /></Field>
          <Field label="Email"><input className="input" type="email" value={formClube.email_club} onChange={e=>sfc('email_club',e.target.value)} /></Field>
          <Field label="Telefone"><input className="input" value={formClube.tel} onChange={e=>sfc('tel',e.target.value)} /></Field>
          <div className="col-2"><Field label="Morada"><input className="input" value={formClube.morada} onChange={e=>sfc('morada',e.target.value)} /></Field></div>
        </div>
      </Modal>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#D4AF37', fontFamily:"'Fraunces',serif" }}>🏛️ {clube.nome}</div>
            {clube.sigla && <div style={{ fontSize:11, color:'#7A8699' }}>{clube.sigla}{clube.federacao?` · ${clube.federacao}`:''}{clube.cidade?` · ${clube.cidade}`:''}</div>}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={abrirEditClube}>✏️</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12 }}>
          {[[ativos.length,'👥','Sócios'],[(socios.filter(s=>s.cargo!=='socio').length),'⭐','Direcção'],[`${totalMes.toFixed(0)}€`,'💰','Quotas mês'],[emFalta.length,'⚠️','Em atraso']].map(([v,i,l])=>(
            <div key={l} style={{ textAlign:'center', padding:'6px', background:'rgba(255,255,255,.04)', borderRadius:8 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{v}</div>
              <div style={{ fontSize:9, color:'#7A8699' }}>{i} {l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14 }}>
        {[['dashboard','📊 Dashboard'],['socios','👥 Sócios'],['quotas','💰 Quotas'],['comunicados','📢 Comunicados']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'8px 4px', borderRadius:8, fontSize:10, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'linear-gradient(135deg,#1E5FD9,#1456C0)':'none', color:tab===t?'#fff':'#475569' }}>{l}</button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab==='dashboard' && (
        <div>
          {emFalta.length > 0 && (
            <div style={{ background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)', borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ fontWeight:600, color:'#f87171', marginBottom:6, fontSize:13 }}>⚠️ {emFalta.length} sócio(s) com quota em atraso</div>
              {emFalta.slice(0,3).map(s=><div key={s.id} style={{ fontSize:12, color:'#cbd5e1' }}>{s.nome} — {s.quota_mensal}€/mês</div>)}
              {emFalta.length>3 && <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>+{emFalta.length-3} mais</div>}
            </div>
          )}
          {/* Direcção */}
          <div className="card card-p" style={{ marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:10 }}>⭐ Direcção</div>
            {socios.filter(s=>s.cargo!=='socio').length===0
              ? <div style={{ fontSize:12, color:'#475569' }}>Nenhum cargo atribuído ainda.</div>
              : socios.filter(s=>s.cargo!=='socio').map(s=>(
                  <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ fontSize:13, color:'#fff' }}>{s.nome}</div>
                    <Badge v={CARGO_COR[s.cargo]||'gray'}>{s.cargo}</Badge>
                  </div>
                ))
            }
          </div>
          {/* Último comunicado */}
          {comunicados[0] && (
            <div className="card card-p" style={{ borderLeft:'3px solid #4C8DFF' }}>
              <div style={{ fontSize:11, color:'#4C8DFF', marginBottom:4 }}>{TIPO_ICON[comunicados[0].tipo]} Último comunicado</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{comunicados[0].titulo}</div>
              {comunicados[0].conteudo && <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{comunicados[0].conteudo.slice(0,120)}{comunicados[0].conteudo.length>120?'...':''}</div>}
              <div style={{ fontSize:10, color:'#475569', marginTop:6 }}>{new Date(comunicados[0].data_pub).toLocaleDateString('pt-PT')}</div>
            </div>
          )}
        </div>
      )}

      {/* SÓCIOS */}
      {tab==='socios' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <input className="input" placeholder="🔍 Pesquisar sócio..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ flex:1 }} />
            <button className="btn btn-primary btn-sm" onClick={()=>{setSelectedSocio(null);setFormSocio(EMPTY_SOCIO);setModalSocio(true)}}>+ Sócio</button>
          </div>
          {sociosFiltrados.length===0
            ? <EmptyState icon="👥" title="Sem sócios" desc="Adiciona o primeiro sócio do clube" />
            : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {sociosFiltrados.map(s => {
                  const quotaPaga = quotas.some(q=>q.socio_id===s.id&&q.ano===anoAtual&&q.mes===mesAtual&&q.pago)
                  return (
                    <div key={s.id} className="card card-p">
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#fff', flexShrink:0 }}>
                          {s.nome?.[0]?.toUpperCase()||'?'}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{s.nome}</span>
                            {s.num_socio && <span style={{ fontSize:10, color:'#7A8699' }}>#{s.num_socio}</span>}
                            <Badge v={CARGO_COR[s.cargo]||'gray'}>{s.cargo}</Badge>
                          </div>
                          <div style={{ fontSize:11, color:'#7A8699' }}>{s.email||''}{s.tel?` · ${s.tel}`:''}</div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:11, color:quotaPaga?'#2DD4A7':'#f87171', fontWeight:600 }}>{quotaPaga?'✓ Pago':'Em falta'}</div>
                          <div style={{ fontSize:10, color:'#7A8699' }}>{s.quota_mensal}€/mês</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, marginTop:8 }}>
                        {!quotaPaga && <button className="btn btn-primary btn-sm" onClick={()=>registarPagamento(s.id,anoAtual,mesAtual)}>💰 Registar pagamento</button>}
                        <button className="btn btn-secondary btn-sm" onClick={()=>abrirEditSocio(s)}>✏️</button>
                        <button className="btn btn-icon btn-sm" onClick={()=>removerSocio(s.id)}>🗑️</button>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      )}

      {/* QUOTAS */}
      {tab==='quotas' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            <div className="card card-p" style={{ borderTop:'2px solid #2DD4A7', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, color:'#2DD4A7' }}>{totalMes.toFixed(0)}€</div>
              <div style={{ fontSize:10, color:'#7A8699' }}>Cobrado este mês</div>
            </div>
            <div className="card card-p" style={{ borderTop:'2px solid #f87171', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, color:'#f87171' }}>{(emFalta.reduce((s,x)=>s+(x.quota_mensal||0),0)).toFixed(0)}€</div>
              <div style={{ fontSize:10, color:'#7A8699' }}>Em falta este mês</div>
            </div>
          </div>
          <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>Estado das quotas — {new Date().toLocaleString('pt-PT',{month:'long',year:'numeric'})}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {ativos.map(s => {
              const pago = quotas.some(q=>q.socio_id===s.id&&q.ano===anoAtual&&q.mes===mesAtual&&q.pago)
              return (
                <div key={s.id} className="card card-p" style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ flex:1, fontSize:13, color:'#fff' }}>{s.nome}</div>
                  <div style={{ fontSize:12, color:'#7A8699' }}>{s.quota_mensal}€</div>
                  <div style={{ fontSize:11, fontWeight:600, color:pago?'#2DD4A7':'#f87171' }}>{pago?'✓ Pago':'Em falta'}</div>
                  {!pago && <button className="btn btn-primary btn-sm" onClick={()=>registarPagamento(s.id,anoAtual,mesAtual)}>Pago</button>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* COMUNICADOS */}
      {tab==='comunicados' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button className="btn btn-primary btn-sm" onClick={()=>{setFormCom(EMPTY_COM);setModalCom(true)}}>+ Comunicado</button>
          </div>
          {comunicados.length===0
            ? <EmptyState icon="📢" title="Sem comunicados" desc="Publica o primeiro aviso ou convocatória" />
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {comunicados.map(c=>(
                  <div key={c.id} className="card card-p" style={{ borderLeft:`3px solid ${c.tipo==='aviso'?'#f87171':c.tipo==='convocatoria'?'#4C8DFF':c.tipo==='resultado'?'#D4AF37':'#94a3b8'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{c.fixado?'📌 ':''}{c.titulo}</div>
                        <div style={{ fontSize:10, color:'#7A8699', marginTop:2 }}>{TIPO_ICON[c.tipo]} {c.tipo} · {new Date(c.data_pub).toLocaleDateString('pt-PT')}</div>
                      </div>
                      <button onClick={async()=>{await supabase.from('clube_comunicados').delete().eq('id',c.id);load()}} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:16 }}>🗑️</button>
                    </div>
                    {c.conteudo && <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6 }}>{c.conteudo}</div>}
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* Modal sócio */}
      <Modal open={modalSocio} onClose={()=>{setModalSocio(false);setSelectedSocio(null)}} title={selectedSocio?'✏️ Editar Sócio':'👤 Novo Sócio'} wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalSocio(false)}>Cancelar</button><button className="btn btn-primary" onClick={adicionarSocio} disabled={saving}>{saving?<Spinner/>:null}Guardar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" value={formSocio.nome} onChange={e=>sfs('nome',e.target.value)} /></Field></div>
          <Field label="Email"><input className="input" type="email" value={formSocio.email} onChange={e=>sfs('email',e.target.value)} /></Field>
          <Field label="Telefone"><input className="input" value={formSocio.tel} onChange={e=>sfs('tel',e.target.value)} /></Field>
          <Field label="Nº Sócio"><input className="input" value={formSocio.num_socio} onChange={e=>sfs('num_socio',e.target.value)} placeholder="001" /></Field>
          <Field label="Cargo"><select className="input" value={formSocio.cargo} onChange={e=>sfs('cargo',e.target.value)}>{CARGOS.map(c=><option key={c} value={c}>{c}</option>)}</select></Field>
          <Field label="Quota Mensal (€)"><input className="input" type="number" value={formSocio.quota_mensal} onChange={e=>sfs('quota_mensal',e.target.value)} /></Field>
          <Field label="Data Entrada"><input className="input" type="date" value={formSocio.data_entrada} onChange={e=>sfs('data_entrada',e.target.value)} /></Field>
          <div className="col-2"><Field label="Notas"><textarea className="input" rows={2} style={{resize:'none'}} value={formSocio.notas} onChange={e=>sfs('notas',e.target.value)} /></Field></div>
        </div>
      </Modal>

      {/* Modal comunicado */}
      <Modal open={modalCom} onClose={()=>setModalCom(false)} title="📢 Novo Comunicado" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalCom(false)}>Cancelar</button><button className="btn btn-primary" onClick={publicarComunicado} disabled={saving}>{saving?<Spinner/>:null}Publicar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Título *"><input className="input" value={formCom.titulo} onChange={e=>sfm('titulo',e.target.value)} placeholder="Ex: Convocatória para Assembleia Geral" /></Field></div>
          <Field label="Tipo"><select className="input" value={formCom.tipo} onChange={e=>sfm('tipo',e.target.value)}>{TIPOS_COM.map(t=><option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}</select></Field>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 0' }}>
            <input type="checkbox" checked={formCom.fixado} onChange={e=>sfm('fixado',e.target.checked)} style={{ accentColor:'#D4AF37', width:16, height:16 }} />
            <span style={{ fontSize:13, color:'#cbd5e1' }}>📌 Fixar no topo</span>
          </label>
          <div className="col-2"><Field label="Conteúdo"><textarea className="input" rows={4} style={{resize:'none'}} value={formCom.conteudo} onChange={e=>sfm('conteudo',e.target.value)} placeholder="Texto do comunicado..." /></Field></div>
        </div>
      </Modal>

      {/* Modal editar clube */}
      <Modal open={modalClube} onClose={()=>setModalClube(false)} title="✏️ Editar Clube" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalClube(false)}>Cancelar</button><button className="btn btn-primary" onClick={actualizarClube} disabled={saving}>{saving?<Spinner/>:null}Guardar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome"><input className="input" value={formClube.nome} onChange={e=>sfc('nome',e.target.value)} /></Field></div>
          <Field label="Sigla"><input className="input" value={formClube.sigla} onChange={e=>sfc('sigla',e.target.value)} /></Field>
          <Field label="Federação"><input className="input" value={formClube.federacao} onChange={e=>sfc('federacao',e.target.value)} /></Field>
          <Field label="Cidade"><input className="input" value={formClube.cidade} onChange={e=>sfc('cidade',e.target.value)} /></Field>
          <Field label="Email"><input className="input" value={formClube.email_club} onChange={e=>sfc('email_club',e.target.value)} /></Field>
          <Field label="Telefone"><input className="input" value={formClube.tel} onChange={e=>sfc('tel',e.target.value)} /></Field>
          <div className="col-2"><Field label="Morada"><input className="input" value={formClube.morada} onChange={e=>sfc('morada',e.target.value)} /></Field></div>
        </div>
      </Modal>
    </div>
  )
}
