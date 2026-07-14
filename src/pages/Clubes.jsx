import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'
import { useToast, TabBar, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'

// ── constantes ────────────────────────────────────────────────────────────────
const CARGOS = ['socio','presidente','vice-presidente','secretario','tesoureiro','vogal','suplente','sócio honorário']
const CARGO_COR = { presidente:'green', secretario:'blue', tesoureiro:'yellow', 'vice-presidente':'blue', vogal:'gray', suplente:'gray', socio:'gray', 'sócio honorário':'yellow' }
const ESTATUTOS = ['ativo','suspenso','honorário','falecido']
const TIPOS_COM = ['aviso','convocatoria','resultado','acta','outro']
const TIPO_ICON = { aviso:'📢', convocatoria:'📋', resultado:'🏆', acta:'📝', outro:'📌' }
const TIPO_COR = { aviso:'#f87171', convocatoria:'#4C8DFF', resultado:'#D4AF37', acta:'#2DD4A7', outro:'#94a3b8' }
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const EMPTY_CLUBE = { nome:'', sigla:'', morada:'', cidade:'', federacao:'', num_federacao:'', email_club:'', tel:'', site:'', descricao:'' }
const EMPTY_SOCIO = { nome:'', email:'', tel:'', num_socio:'', cargo:'socio', estatuto:'ativo', quota_mensal:'0', num_cartao_federativo:'', data_entrada:new Date().toISOString().slice(0,10), notas:'' }
const EMPTY_COM = { titulo:'', conteudo:'', tipo:'aviso', fixado:false, destinatarios:'todos' }
const EMPTY_RECEITA = { tipo:'receita', cat:'Quotas', valor:'', data_reg:new Date().toISOString().slice(0,10), desc:'' }

const CATS_REC = ['Quotas','Jóias de Admissão','Inscrições em Provas','Subsídios/Apoios','Patrocínios','Outros']
const CATS_DEP = ['Provas','Manutenção','Secretaria','Comunicações','Seguros','Outros']

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = v => typeof v === 'number' ? v.toFixed(2) : '0.00'
const anoAtual = new Date().getFullYear()
const mesAtual = new Date().getMonth()+1

export default function Clubes({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useIdioma()
  const { temElite } = useLicenca()

  const [clube, setClube] = useState(null)
  const [socios, setSocios] = useState([])
  const [quotas, setQuotas] = useState([])
  const [comunicados, setComunicados] = useState([])
  const [financas, setFinancas] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [saving, setSaving] = useState(false)

  // modais
  const [modalClube, setModalClube] = useState(false)
  const [modalSocio, setModalSocio] = useState(false)
  const [modalCom, setModalCom] = useState(false)
  const [modalFinanca, setModalFinanca] = useState(false)
  const [modalVotacao, setModalVotacao] = useState(false)
  const [modalImport, setModalImport] = useState(false)
  const [selectedSocio, setSelectedSocio] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  // forms
  const [formClube, setFormClube] = useState(EMPTY_CLUBE)
  const [formSocio, setFormSocio] = useState(EMPTY_SOCIO)
  const [formCom, setFormCom] = useState(EMPTY_COM)
  const [formFin, setFormFin] = useState(EMPTY_RECEITA)
  const [formVot, setFormVot] = useState({ titulo:'', opcoes:'Sim\nNão\nAbstenção', prazo:'' })
  const [csvImport, setCsvImport] = useState('')

  // filtros
  const [busca, setBusca] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('todos')
  const [filtroEstatuto, setFiltroEstatuto] = useState('ativo')
  const [mesQuotas, setMesQuotas] = useState(mesAtual)
  const [anoQuotas, setAnoQuotas] = useState(anoAtual)

  const sfc = (k,v) => setFormClube(f=>({...f,[k]:v}))
  const sfs = (k,v) => setFormSocio(f=>({...f,[k]:v}))
  const sfm = (k,v) => setFormCom(f=>({...f,[k]:v}))
  const sff = (k,v) => setFormFin(f=>({...f,[k]:v}))

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: cl } = await supabase.from('clubes').select('*').eq('user_id', user?.id).maybeSingle()
      setClube(cl)
      if (cl) {
        const [resS, resQ, resC, resF] = await Promise.all([
          supabase.from('clube_socios').select('*').eq('clube_id',cl.id).order('nome'),
          supabase.from('clube_quotas').select('*').eq('clube_id',cl.id).order('created_at',{ascending:false}),
          supabase.from('clube_comunicados').select('*').eq('clube_id',cl.id).order('fixado',{ascending:false}).order('data_pub',{ascending:false}),
          supabase.from('clube_financas').select('*').eq('clube_id',cl.id).order('data_reg',{ascending:false}).then(r=>r).catch(()=>({data:[]})),
        ])
        setSocios(resS.data||[]); setQuotas(resQ.data||[]); setComunicados(resC.data||[]); setFinancas(resF.data||[])
      }
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[user?.id])
  useEffect(()=>{ load() },[load])

  // ── clube ─────────────────────────────────────────────────────────────────
  const criarClube = async () => {
    if (!formClube.nome.trim()) { toast('Nome obrigatório','warn'); return }
    setSaving(true)
    try {
      const { data } = await supabase.from('clubes').insert({...formClube,user_id:user?.id}).select().single()
      setClube(data); setModalClube(false); toast('Clube criado!','ok'); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const actualizarClube = async () => {
    setSaving(true)
    try {
      await supabase.from('clubes').update(formClube).eq('id',clube.id)
      setModalClube(false); toast('Guardado!','ok'); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const abrirEditClube = () => {
    setFormClube({ nome:clube.nome||'', sigla:clube.sigla||'', morada:clube.morada||'', cidade:clube.cidade||'', federacao:clube.federacao||'', num_federacao:clube.num_federacao||'', email_club:clube.email_club||'', tel:clube.tel||'', site:clube.site||'', descricao:clube.descricao||'' })
    setModalClube(true)
  }

  // ── sócios ────────────────────────────────────────────────────────────────
  const guardarSocio = async () => {
    if (!formSocio.nome.trim()) { toast('Nome obrigatório','warn'); return }
    setSaving(true)
    try {
      if (selectedSocio) {
        await supabase.from('clube_socios').update({...formSocio,quota_mensal:parseFloat(formSocio.quota_mensal)||0}).eq('id',selectedSocio.id)
        toast('Actualizado!','ok')
      } else {
        await supabase.from('clube_socios').insert({...formSocio,clube_id:clube.id,quota_mensal:parseFloat(formSocio.quota_mensal)||0})
        toast('Sócio adicionado!','ok')
      }
      setModalSocio(false); setSelectedSocio(null); setFormSocio(EMPTY_SOCIO); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const abrirEditSocio = s => {
    setSelectedSocio(s)
    setFormSocio({ nome:s.nome||'', email:s.email||'', tel:s.tel||'', num_socio:s.num_socio||'', cargo:s.cargo||'socio', estatuto:s.estatuto||'ativo', quota_mensal:String(s.quota_mensal||0), num_cartao_federativo:s.num_cartao_federativo||'', data_entrada:s.data_entrada||'', notas:s.notas||'' })
    setModalSocio(true)
  }

  const removerSocio = async id => {
    try { await supabase.from('clube_socios').delete().eq('id',id); toast('Removido','ok'); setConfirmDel(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  // ── quotas ────────────────────────────────────────────────────────────────
  const registarPagamento = async (socioId, pago=true) => {
    const s = socios.find(x=>x.id===socioId)
    const existe = quotas.find(q=>q.socio_id===socioId&&q.ano===anoQuotas&&q.mes===mesQuotas)
    try {
      if (existe) {
        await supabase.from('clube_quotas').update({pago,data_pagamento:pago?new Date().toISOString().slice(0,10):null}).eq('id',existe.id)
      } else {
        await supabase.from('clube_quotas').insert({clube_id:clube.id,socio_id:socioId,ano:anoQuotas,mes:mesQuotas,valor:s?.quota_mensal||0,pago,data_pagamento:pago?new Date().toISOString().slice(0,10):null})
      }
      load(); toast(pago?'Pagamento registado!':'Marcado como não pago','ok')
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const registarTodosComoPagos = async () => {
    const ativos = socios.filter(s=>(s.estatuto||s.estado)==='ativo')
    for (const s of ativos) await registarPagamento(s.id, true)
    toast(`${ativos.length} pagamentos registados!`,'ok')
  }

  // ── comunicados ───────────────────────────────────────────────────────────
  const publicarComunicado = async () => {
    if (!formCom.titulo.trim()) { toast('Título obrigatório','warn'); return }
    setSaving(true)
    try {
      await supabase.from('clube_comunicados').insert({...formCom,clube_id:clube.id,user_id:user?.id})
      setModalCom(false); setFormCom(EMPTY_COM); toast('Comunicado publicado!','ok'); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const eliminarComunicado = async id => {
    await supabase.from('clube_comunicados').delete().eq('id',id); load(); toast('Eliminado','ok')
  }

  // ── finanças clube ────────────────────────────────────────────────────────
  const guardarFinanca = async () => {
    if (!formFin.valor||parseFloat(formFin.valor)<=0) { toast('Valor obrigatório','warn'); return }
    setSaving(true)
    try {
      await supabase.from('clube_financas').insert({...formFin,clube_id:clube.id,valor:parseFloat(formFin.valor)})
      setModalFinanca(false); setFormFin(EMPTY_RECEITA); toast('Registado!','ok'); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  // ── importar CSV ──────────────────────────────────────────────────────────
  const importarCSV = async () => {
    const linhas = csvImport.trim().split('\n').filter(l=>l.trim())
    if (linhas.length<2) { toast('Formato inválido','warn'); return }
    setSaving(true)
    let ok=0
    try {
      for (const linha of linhas.slice(1)) {
        const [nome,email,tel,num_socio,cargo,quota_mensal] = linha.split(/[,;]/).map(c=>c.trim())
        if (!nome) continue
        await supabase.from('clube_socios').insert({ clube_id:clube.id, nome, email:email||'', tel:tel||'', num_socio:num_socio||'', cargo:cargo||'socio', quota_mensal:parseFloat(quota_mensal)||0, estatuto:'ativo', data_entrada:new Date().toISOString().slice(0,10) })
        ok++
      }
      toast(`${ok} sócio(s) importado(s)!`,'ok'); setModalImport(false); setCsvImport(''); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  // ── exportar lista ────────────────────────────────────────────────────────
  const exportarCSV = () => {
    const header = 'Nome,Email,Tel,Nº Sócio,Cargo,Quota Mensal,Nº Cartão Federativo,Estatuto\n'
    const rows = socios.map(s=>`${s.nome},${s.email||''},${s.tel||''},${s.num_socio||''},${s.cargo||''},${s.quota_mensal||0},${s.num_cartao_federativo||''},${s.estatuto||'ativo'}`).join('\n')
    const blob = new Blob([header+rows],{type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`socios_${clube.sigla||clube.nome}_${anoAtual}.csv`; a.click()
    toast('Lista exportada!','ok')
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const ativos = socios.filter(s=>(s.estatuto||s.estado)==='ativo')
  const quotasMes = quotas.filter(q=>q.ano===anoQuotas&&q.mes===mesQuotas&&q.pago)
  const totalMes = quotasMes.reduce((s,q)=>s+(q.valor||0),0)
  const emFalta = ativos.filter(s=>!quotas.some(q=>q.socio_id===s.id&&q.ano===anoQuotas&&q.mes===mesQuotas&&q.pago))
  const totalAnual = quotas.filter(q=>q.ano===anoAtual&&q.pago).reduce((s,q)=>s+(q.valor||0),0)
  const receitasFin = financas.filter(f=>f.tipo==='receita'&&new Date(f.data_reg).getFullYear()===anoAtual).reduce((s,f)=>s+f.valor,0)
  const despesasFin = financas.filter(f=>f.tipo==='despesa'&&new Date(f.data_reg).getFullYear()===anoAtual).reduce((s,f)=>s+f.valor,0)
  const saldoFin = (totalAnual+receitasFin)-despesasFin

  const sociosFiltrados = socios.filter(s=>{
    if (filtroEstatuto!=='todos'&&(s.estatuto||s.estado)!==filtroEstatuto) return false
    if (filtroCargo!=='todos'&&s.cargo!==filtroCargo) return false
    if (busca&&!s.nome.toLowerCase().includes(busca.toLowerCase())&&!s.email?.includes(busca)&&!s.num_socio?.includes(busca)) return false
    return true
  })

  // ── setup clube ───────────────────────────────────────────────────────────
  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>

  if (!clube) return (
    <div>
      <GuiaAuto modulo="clubes_setup"/>
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.2)', borderRadius:14, padding:'20px 18px', marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }}/>
        <div style={{ fontSize:18, fontWeight:900, color:'#D4AF37', fontFamily:"'Fraunces',serif", marginBottom:6 }}>🏛️ Gestão de Coletividades</div>
        <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20, lineHeight:1.6 }}>
          Regista a tua coletividade para gerir sócios, quotas, comunicados e finanças do clube.<br/>
          Ideal para presidentes e secretários de clubes columbófilos.
        </div>
        <button className="btn btn-primary" onClick={()=>setModalClube(true)}>+ Registar Coletividade</button>
      </div>
      <Modal open={modalClube} onClose={()=>setModalClube(false)} title="🏛️ Registar Coletividade" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalClube(false)}>Cancelar</button><button className="btn btn-primary" onClick={criarClube} disabled={saving}>{saving?<Spinner/>:null}Criar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome da Coletividade *"><input className="input" value={formClube.nome} onChange={e=>sfc('nome',e.target.value)} placeholder="Ex: Grupo Columbófilo de Avis"/></Field></div>
          <Field label="Sigla"><input className="input" value={formClube.sigla} onChange={e=>sfc('sigla',e.target.value)} placeholder="GCA"/></Field>
          <Field label="Federação (ex: FCP)"><input className="input" value={formClube.federacao} onChange={e=>sfc('federacao',e.target.value)}/></Field>
          <Field label="Nº Federativo"><input className="input" value={formClube.num_federacao} onChange={e=>sfc('num_federacao',e.target.value)}/></Field>
          <Field label="Cidade"><input className="input" value={formClube.cidade} onChange={e=>sfc('cidade',e.target.value)}/></Field>
          <Field label="Email"><input className="input" type="email" value={formClube.email_club} onChange={e=>sfc('email_club',e.target.value)}/></Field>
          <Field label="Telefone"><input className="input" value={formClube.tel} onChange={e=>sfc('tel',e.target.value)}/></Field>
          <Field label="Site"><input className="input" value={formClube.site} onChange={e=>sfc('site',e.target.value)} placeholder="https://..."/></Field>
          <div className="col-2"><Field label="Morada"><input className="input" value={formClube.morada} onChange={e=>sfc('morada',e.target.value)}/></Field></div>
        </div>
      </Modal>
    </div>
  )

  if (!temElite) return <BloqueioPlano plano="elite" nav={nav}/>

  // ── RENDER PRINCIPAL ──────────────────────────────────────────────────────
  return (
    <div>
      <GuiaAuto modulo="clubes"/>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#D4AF37', fontFamily:"'Fraunces',serif" }}>🏛️ {clube.nome}</div>
            <div style={{ fontSize:11, color:'#7A8699' }}>
              {clube.sigla&&`${clube.sigla} · `}{clube.federacao&&`${clube.federacao}`}{clube.num_federacao&&` Nº${clube.num_federacao}`}{clube.cidade&&` · ${clube.cidade}`}
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <BotaoGuia modulo="clubes"/>
            <button className="btn btn-secondary btn-sm" onClick={abrirEditClube}>✏️ Editar</button>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12 }}>
          {[[ativos.length,'👥','Sócios activos','#4C8DFF'],[socios.filter(s=>s.cargo!=='socio'&&s.cargo!=='sócio honorário').length,'⭐','Direcção','#D4AF37'],[`${totalMes.toFixed(0)}€`,'💰','Quotas mês','#2DD4A7'],[emFalta.length,'⚠️','Em atraso','#f87171']].map(([v,i,l,c])=>(
            <div key={l} style={{ textAlign:'center', padding:'8px 4px', background:'rgba(255,255,255,.04)', borderRadius:8 }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:c }}>{v}</div>
              <div style={{ fontSize:9, color:'#475569' }}>{i} {l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      {emFalta.length>0&&(
        <div style={{ background:'rgba(248,113,113,.07)', border:'1px solid rgba(248,113,113,.2)', borderRadius:10, padding:'10px 14px', marginBottom:12, cursor:'pointer' }} onClick={()=>setTab('quotas')}>
          <div style={{ fontWeight:600, color:'#f87171', marginBottom:4, fontSize:12 }}>⚠️ {emFalta.length} sócio(s) com quota em atraso em {MESES_PT[mesQuotas-1]}</div>
          <div style={{ fontSize:11, color:'#94a3b8' }}>{emFalta.slice(0,3).map(s=>s.nome).join(' · ')}{emFalta.length>3?` +${emFalta.length-3} mais`:''}</div>
        </div>
      )}

      {/* Tabs */}
      <TabBar tabs={[['dashboard','📊 Dashboard'],['socios','👥 Sócios'],['quotas','💰 Quotas'],['financas','📈 Finanças'],['comunicados','📢 Comunicados'],['reunioes','🗳️ Reuniões']]} active={tab} onChange={setTab}/>

      {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
      {tab==='dashboard'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* KPIs financeiros */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[[`${totalAnual.toFixed(0)}€`,'💰','Quotas cobradas '+anoAtual,'#2DD4A7'],[`${(totalAnual+receitasFin).toFixed(0)}€`,'📥','Total receitas','#4C8DFF'],[`${saldoFin>=0?'+':''}${saldoFin.toFixed(0)}€`,'⚖️','Saldo '+anoAtual,saldoFin>=0?'#2DD4A7':'#f87171']].map(([v,i,l,c])=>(
              <div key={l} style={{ background:'#0B1830', border:`1px solid ${c}25`, borderRadius:12, padding:'12px 10px', textAlign:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:c, opacity:.5 }}/>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:c }}>{v}</div>
                <div style={{ fontSize:10, color:'#7A8699', marginTop:3 }}>{i} {l}</div>
              </div>
            ))}
          </div>

          {/* Direcção */}
          <div className="card card-p">
            <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:10 }}>⭐ Direcção</div>
            {socios.filter(s=>s.cargo!=='socio'&&s.cargo!=='sócio honorário').length===0
              ?<div style={{ fontSize:12, color:'#475569' }}>Nenhum cargo atribuído ainda.</div>
              :socios.filter(s=>s.cargo!=='socio'&&s.cargo!=='sócio honorário').map(s=>(
                <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #1B2D52' }}>
                  <div style={{ fontSize:13, color:'#fff' }}>{s.nome}</div>
                  <Badge v={CARGO_COR[s.cargo]||'gray'}>{s.cargo}</Badge>
                </div>
              ))
            }
          </div>

          {/* Estado das quotas do mês */}
          <div className="card card-p">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>💰 Quotas — {MESES_PT[mesQuotas-1]} {anoQuotas}</div>
              <button className="btn btn-secondary btn-sm" onClick={()=>setTab('quotas')}>Ver detalhes →</button>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:10 }}>
              <div style={{ flex:1, background:'rgba(45,212,167,.08)', border:'1px solid rgba(45,212,167,.2)', borderRadius:8, padding:'8px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:'#2DD4A7' }}>{quotasMes.length}</div>
                <div style={{ fontSize:10, color:'#7A8699' }}>✓ Pagos</div>
              </div>
              <div style={{ flex:1, background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)', borderRadius:8, padding:'8px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:'#f87171' }}>{emFalta.length}</div>
                <div style={{ fontSize:10, color:'#7A8699' }}>✗ Em falta</div>
              </div>
              <div style={{ flex:1, background:'rgba(212,175,55,.08)', border:'1px solid rgba(212,175,55,.2)', borderRadius:8, padding:'8px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:'#D4AF37' }}>{totalMes.toFixed(0)}€</div>
                <div style={{ fontSize:10, color:'#7A8699' }}>€ Cobrado</div>
              </div>
            </div>
            <div style={{ height:6, background:'#101F40', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${ativos.length>0?Math.round(quotasMes.length/ativos.length*100):0}%`, background:'#2DD4A7', borderRadius:3 }}/>
            </div>
            <div style={{ fontSize:10, color:'#475569', marginTop:4 }}>{ativos.length>0?Math.round(quotasMes.length/ativos.length*100):0}% dos sócios activos pagaram</div>
          </div>

          {/* Último comunicado */}
          {comunicados[0]&&(
            <div className="card card-p" style={{ borderLeft:`3px solid ${TIPO_COR[comunicados[0].tipo]||'#4C8DFF'}` }}>
              <div style={{ fontSize:10, color:TIPO_COR[comunicados[0].tipo]||'#4C8DFF', marginBottom:4 }}>{TIPO_ICON[comunicados[0].tipo]} Último comunicado</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{comunicados[0].fixado?'📌 ':''}{comunicados[0].titulo}</div>
              {comunicados[0].conteudo&&<div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>{comunicados[0].conteudo.slice(0,120)}{comunicados[0].conteudo.length>120?'...':''}</div>}
              <div style={{ fontSize:10, color:'#475569', marginTop:6 }}>{new Date(comunicados[0].data_pub||comunicados[0].created_at).toLocaleDateString('pt-PT')}</div>
            </div>
          )}

          {/* Acções rápidas */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[['➕','Novo Sócio',()=>{setSelectedSocio(null);setFormSocio(EMPTY_SOCIO);setModalSocio(true)}],['📢','Comunicado',()=>{setFormCom(EMPTY_COM);setModalCom(true)}],['💰','Mov. Financeiro',()=>{setFormFin(EMPTY_RECEITA);setModalFinanca(true)}]].map(([icon,label,fn])=>(
              <button key={label} onClick={fn} style={{ background:'#101F40', border:'1px solid #1B2D52', borderRadius:10, padding:'12px 6px', cursor:'pointer', fontFamily:'inherit', textAlign:'center' }}
                onMouseEnter={e=>e.currentTarget.style.background='#0B1830'}
                onMouseLeave={e=>e.currentTarget.style.background='#101F40'}>
                <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
                <div style={{ fontSize:10, color:'#94a3b8' }}>{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SÓCIOS ────────────────────────────────────────────────────────── */}
      {tab==='socios'&&(
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <input className="input" placeholder="🔍 Nome, email ou nº sócio..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ flex:1, minWidth:150 }}/>
            <select className="input" value={filtroCargo} onChange={e=>setFiltroCargo(e.target.value)} style={{ width:'auto', fontSize:12 }}>
              <option value="todos">Todos os cargos</option>
              {CARGOS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input" value={filtroEstatuto} onChange={e=>setFiltroEstatuto(e.target.value)} style={{ width:'auto', fontSize:12 }}>
              <option value="todos">Todos</option>
              {ESTATUTOS.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={()=>{setSelectedSocio(null);setFormSocio(EMPTY_SOCIO);setModalSocio(true)}}>+ Sócio</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>setModalImport(true)}>📥 Importar CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={exportarCSV}>📤 Exportar CSV</button>
            <span style={{ fontSize:11, color:'#7A8699', alignSelf:'center', marginLeft:'auto' }}>{sociosFiltrados.length} sócio(s)</span>
          </div>
          {sociosFiltrados.length===0
            ?<EmptyState icon="👥" title="Sem sócios" desc="Adiciona o primeiro sócio ou importa via CSV"/>
            :<div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {sociosFiltrados.map(s=>{
                  const quotaPaga=quotas.some(q=>q.socio_id===s.id&&q.ano===anoQuotas&&q.mes===mesQuotas&&q.pago)
                  return (
                    <div key={s.id} className="card card-p" style={{ borderLeft:`3px solid ${(s.estatuto||s.estado)==='ativo'?'#1B2D52':(s.estatuto||s.estado)==='suspenso'?'#f87171':'#D4AF37'}` }}>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff', flexShrink:0 }}>
                          {s.nome?.[0]?.toUpperCase()||'?'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                            <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{s.nome}</span>
                            {s.num_socio&&<span style={{ fontSize:10, color:'#7A8699' }}>#{s.num_socio}</span>}
                            <Badge v={CARGO_COR[s.cargo]||'gray'}>{s.cargo}</Badge>
                            {(s.estatuto||s.estado)!=='ativo'&&<Badge v={(s.estatuto||s.estado)==='suspenso'?'red':'yellow'}>{s.estatuto||s.estado}</Badge>}
                          </div>
                          <div style={{ fontSize:11, color:'#7A8699', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {s.email||''}{s.tel?` · ${s.tel}`:''}
                            {s.num_cartao_federativo?` · FCP: ${s.num_cartao_federativo}`:''}
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:11, color:quotaPaga?'#2DD4A7':'#f87171', fontWeight:600 }}>{quotaPaga?'✓ Pago':'Em falta'}</div>
                          <div style={{ fontSize:10, color:'#7A8699' }}>{s.quota_mensal}€/mês</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                        {!quotaPaga&&s.estatuto==='ativo'&&<button className="btn btn-primary btn-sm" onClick={()=>registarPagamento(s.id,true)}>💰 Pago</button>}
                        <button className="btn btn-secondary btn-sm" onClick={()=>abrirEditSocio(s)}>✏️</button>
                        <button className="btn btn-icon btn-sm" onClick={()=>setConfirmDel(s)}>🗑️</button>
                        {s.email&&<a href={`mailto:${s.email}`} className="btn btn-secondary btn-sm" style={{ textDecoration:'none' }}>✉️</a>}
                        {s.tel&&<a href={`https://wa.me/351${s.tel.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration:'none' }}>📲</a>}
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      )}

      {/* ── QUOTAS ────────────────────────────────────────────────────────── */}
      {tab==='quotas'&&(
        <div>
          {/* selector mês/ano */}
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
            <select className="input" value={mesQuotas} onChange={e=>setMesQuotas(Number(e.target.value))} style={{ width:'auto' }}>
              {MESES_PT.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select className="input" value={anoQuotas} onChange={e=>setAnoQuotas(Number(e.target.value))} style={{ width:90 }}>
              {[anoAtual-1,anoAtual,anoAtual+1].map(a=><option key={a}>{a}</option>)}
            </select>
            <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
              <button className="btn btn-primary btn-sm" onClick={registarTodosComoPagos}>✓ Marcar todos como pagos</button>
            </div>
          </div>

          {/* resumo */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
            {[[quotasMes.length,'✓ Pagos','#2DD4A7'],[emFalta.length,'✗ Em falta','#f87171'],[`${totalMes.toFixed(0)}€`,'Cobrado','#D4AF37']].map(([v,l,c])=>(
              <div key={l} style={{ background:'#0B1830', border:`1px solid ${c}25`, borderRadius:10, padding:'10px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:c }}>{v}</div>
                <div style={{ fontSize:10, color:'#7A8699', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {ativos.map(s=>{
              const pago=quotas.some(q=>q.socio_id===s.id&&q.ano===anoQuotas&&q.mes===mesQuotas&&q.pago)
              const registo=quotas.find(q=>q.socio_id===s.id&&q.ano===anoQuotas&&q.mes===mesQuotas)
              return (
                <div key={s.id} className="card card-p" style={{ borderLeft:`3px solid ${pago?'#2DD4A7':'#f87171'}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:'#fff', fontWeight:500 }}>{s.nome}</div>
                      <div style={{ fontSize:10, color:'#7A8699' }}>
                        {s.quota_mensal}€/mês
                        {registo?.data_pagamento?` · pago em ${new Date(registo.data_pagamento).toLocaleDateString('pt-PT')}`:pago?' · pago':''}
                      </div>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:pago?'#2DD4A7':'#f87171' }}>{pago?'✓ Pago':'Em falta'}</div>
                    {pago
                      ?<button className="btn btn-secondary btn-sm" style={{ fontSize:10 }} onClick={()=>registarPagamento(s.id,false)}>Anular</button>
                      :<button className="btn btn-primary btn-sm" onClick={()=>registarPagamento(s.id,true)}>💰 Pago</button>
                    }
                  </div>
                </div>
              )
            })}
          </div>

          {/* histórico anual */}
          <div className="card card-p" style={{ marginTop:14 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>📅 Quotas {anoAtual} — por mês</div>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {MESES_PT.map((m,i)=>{
                const mes=i+1
                const pagos=quotas.filter(q=>q.ano===anoAtual&&q.mes===mes&&q.pago).length
                const total=ativos.length
                const pct=total>0?Math.round(pagos/total*100):0
                const cor=pct>=100?'#2DD4A7':pct>=50?'#D4AF37':'#f87171'
                return (
                  <div key={mes} onClick={()=>{setMesQuotas(mes);setAnoQuotas(anoAtual)}} style={{ flex:'1 1 60px', padding:'8px 4px', background:mes===mesQuotas&&anoAtual===anoQuotas?'#0B1830':'#101F40', borderRadius:8, cursor:'pointer', textAlign:'center', border:`1px solid ${mes===mesQuotas&&anoAtual===anoQuotas?cor:'#1B2D52'}` }}>
                    <div style={{ fontSize:9, color:'#7A8699', marginBottom:3 }}>{m.slice(0,3)}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:cor }}>{pct}%</div>
                    <div style={{ fontSize:8, color:'#475569' }}>{pagos}/{total}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FINANÇAS CLUBE ────────────────────────────────────────────────── */}
      {tab==='financas'&&(
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:12, color:'#94a3b8' }}>Receitas e despesas da coletividade</div>
            <button className="btn btn-primary btn-sm" onClick={()=>{setFormFin(EMPTY_RECEITA);setModalFinanca(true)}}>+ Movimento</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
            {[[`+${(totalAnual+receitasFin).toFixed(0)}€`,'Receitas '+anoAtual,'#2DD4A7'],[`-${despesasFin.toFixed(0)}€`,'Despesas '+anoAtual,'#f87171'],[`${saldoFin>=0?'+':''}${saldoFin.toFixed(0)}€`,'Saldo',saldoFin>=0?'#2DD4A7':'#f87171']].map(([v,l,c])=>(
              <div key={l} style={{ background:'#0B1830', border:`1px solid ${c}25`, borderRadius:10, padding:'10px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:c }}>{v}</div>
                <div style={{ fontSize:10, color:'#7A8699', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
          {financas.length===0&&totalAnual===0
            ?<EmptyState icon="💰" title="Sem movimentos" desc="Regista receitas e despesas da coletividade"/>
            :<>
              {/* quotas como linha */}
              {totalAnual>0&&(
                <div style={{ background:'#0B1830', border:'1px solid rgba(45,212,167,.2)', borderRadius:10, padding:'10px 14px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>💰 Quotas {anoAtual}</div>
                    <div style={{ fontSize:10, color:'#7A8699' }}>{quotas.filter(q=>q.ano===anoAtual&&q.pago).length} pagamentos de sócios</div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#2DD4A7' }}>+{totalAnual.toFixed(0)}€</div>
                </div>
              )}
              {financas.map(f=>(
                <div key={f.id} style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:10, padding:'10px 14px', marginBottom:6, display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:f.tipo==='receita'?'rgba(45,212,167,.1)':'rgba(248,113,113,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                    {f.tipo==='receita'?'💰':'💸'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{f.cat}</div>
                    <div style={{ fontSize:10, color:'#7A8699' }}>{f.desc||'—'} · {new Date(f.data_reg).toLocaleDateString('pt-PT')}</div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:f.tipo==='receita'?'#2DD4A7':'#f87171' }}>
                    {f.tipo==='receita'?'+':'-'}{f.valor.toFixed(0)}€
                  </div>
                  <button onClick={async()=>{await supabase.from('clube_financas').delete().eq('id',f.id);load()}} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:14 }}>🗑️</button>
                </div>
              ))}
            </>
          }
        </div>
      )}

      {/* ── COMUNICADOS ───────────────────────────────────────────────────── */}
      {tab==='comunicados'&&(
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button className="btn btn-primary btn-sm" onClick={()=>{setFormCom(EMPTY_COM);setModalCom(true)}}>+ Comunicado</button>
          </div>
          {comunicados.length===0
            ?<EmptyState icon="📢" title="Sem comunicados" desc="Publica o primeiro aviso ou convocatória"/>
            :<div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {comunicados.map(c=>(
                  <div key={c.id} className="card card-p" style={{ borderLeft:`3px solid ${TIPO_COR[c.tipo]||'#94a3b8'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{c.fixado?'📌 ':''}{c.titulo}</span>
                          <span style={{ fontSize:10, color:TIPO_COR[c.tipo]||'#94a3b8', background:`${TIPO_COR[c.tipo]||'#94a3b8'}15`, padding:'1px 6px', borderRadius:8 }}>{TIPO_ICON[c.tipo]} {c.tipo}</span>
                        </div>
                        <div style={{ fontSize:10, color:'#475569' }}>{new Date(c.data_pub||c.created_at).toLocaleDateString('pt-PT')}{c.destinatarios&&c.destinatarios!=='todos'?` · Para: ${c.destinatarios}`:''}</div>
                      </div>
                      <button onClick={()=>eliminarComunicado(c.id)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:16 }}>🗑️</button>
                    </div>
                    {c.conteudo&&<div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6 }}>{c.conteudo}</div>}
                    {/* acções rápidas */}
                    {c.email_enviado&&<div style={{ fontSize:10, color:'#2DD4A7', marginTop:6 }}>✓ Email enviado aos sócios</div>}
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── REUNIÕES / VOTAÇÕES ───────────────────────────────────────────── */}
      {tab==='reunioes'&&(
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', justifyContent:'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setModalVotacao(true)}>🗳️ Nova Votação</button>
            <button className="btn btn-primary btn-sm" onClick={()=>{setFormCom({...EMPTY_COM,tipo:'convocatoria'});setModalCom(true)}}>📋 Convocar Reunião</button>
          </div>
          {/* convocatórias */}
          <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>📋 Convocatórias e Actas</div>
          {comunicados.filter(c=>['convocatoria','acta'].includes(c.tipo)).length===0
            ?<div style={{ fontSize:12, color:'#475569', marginBottom:16 }}>Sem convocatórias registadas.</div>
            :<div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
                {comunicados.filter(c=>['convocatoria','acta'].includes(c.tipo)).map(c=>(
                  <div key={c.id} className="card card-p" style={{ borderLeft:`3px solid ${TIPO_COR[c.tipo]}` }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:2 }}>{TIPO_ICON[c.tipo]} {c.titulo}</div>
                    <div style={{ fontSize:10, color:'#475569' }}>{new Date(c.data_pub||c.created_at).toLocaleDateString('pt-PT')}</div>
                    {c.conteudo&&<div style={{ fontSize:11, color:'#94a3b8', marginTop:6, lineHeight:1.6 }}>{c.conteudo}</div>}
                  </div>
                ))}
              </div>
          }
          {/* votações */}
          <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>🗳️ Votações</div>
          <div style={{ padding:'14px', background:'rgba(76,141,255,.06)', border:'1px solid rgba(76,141,255,.15)', borderRadius:10, fontSize:12, color:'#7A8699', textAlign:'center' }}>
            🚀 Sistema de votações digitais com registo de presenças — disponível em breve
          </div>
        </div>
      )}

      {/* ══ MODAIS ══════════════════════════════════════════════════════════ */}

      {/* Sócio */}
      <Modal open={modalSocio} onClose={()=>{setModalSocio(false);setSelectedSocio(null)}} title={selectedSocio?'✏️ Editar Sócio':'👤 Novo Sócio'} wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalSocio(false)}>Cancelar</button><button className="btn btn-primary" onClick={guardarSocio} disabled={saving}>{saving?<Spinner/>:null}Guardar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" value={formSocio.nome} onChange={e=>sfs('nome',e.target.value)}/></Field></div>
          <Field label="Email"><input className="input" type="email" value={formSocio.email} onChange={e=>sfs('email',e.target.value)}/></Field>
          <Field label="Telefone"><input className="input" value={formSocio.tel} onChange={e=>sfs('tel',e.target.value)}/></Field>
          <Field label="Nº Sócio"><input className="input" value={formSocio.num_socio} onChange={e=>sfs('num_socio',e.target.value)} placeholder="001"/></Field>
          <Field label="Nº Cartão Federativo (FCP)"><input className="input" value={formSocio.num_cartao_federativo} onChange={e=>sfs('num_cartao_federativo',e.target.value)}/></Field>
          <Field label="Cargo"><select className="input" value={formSocio.cargo} onChange={e=>sfs('cargo',e.target.value)}>{CARGOS.map(c=><option key={c} value={c}>{c}</option>)}</select></Field>
          <Field label="Estatuto"><select className="input" value={formSocio.estatuto} onChange={e=>sfs('estatuto',e.target.value)}>{ESTATUTOS.map(e=><option key={e} value={e}>{e}</option>)}</select></Field>
          <Field label="Quota Mensal (€)"><input className="input" type="number" value={formSocio.quota_mensal} onChange={e=>sfs('quota_mensal',e.target.value)}/></Field>
          <Field label="Data de Entrada"><input className="input" type="date" value={formSocio.data_entrada} onChange={e=>sfs('data_entrada',e.target.value)}/></Field>
          <div className="col-2"><Field label="Notas"><textarea className="input" rows={2} style={{resize:'none'}} value={formSocio.notas} onChange={e=>sfs('notas',e.target.value)}/></Field></div>
        </div>
      </Modal>

      {/* Comunicado */}
      <Modal open={modalCom} onClose={()=>setModalCom(false)} title="📢 Novo Comunicado" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalCom(false)}>Cancelar</button><button className="btn btn-primary" onClick={publicarComunicado} disabled={saving}>{saving?<Spinner/>:null}Publicar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Título *"><input className="input" value={formCom.titulo} onChange={e=>sfm('titulo',e.target.value)} placeholder="Ex: Convocatória para Assembleia Geral"/></Field></div>
          <Field label="Tipo"><select className="input" value={formCom.tipo} onChange={e=>sfm('tipo',e.target.value)}>{TIPOS_COM.map(tp=><option key={tp} value={tp}>{TIPO_ICON[tp]} {tp}</option>)}</select></Field>
          <Field label="Destinatários"><select className="input" value={formCom.destinatarios} onChange={e=>sfm('destinatarios',e.target.value)}><option value="todos">Todos os sócios</option><option value="direcao">Só Direcção</option><option value="ativos">Só Activos</option></select></Field>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 0', alignSelf:'flex-end' }}>
            <input type="checkbox" checked={formCom.fixado} onChange={e=>sfm('fixado',e.target.checked)} style={{ accentColor:'#D4AF37', width:16, height:16 }}/>
            <span style={{ fontSize:13, color:'#cbd5e1' }}>📌 Fixar no topo</span>
          </label>
          <div className="col-2"><Field label="Conteúdo"><textarea className="input" rows={5} style={{resize:'none'}} value={formCom.conteudo} onChange={e=>sfm('conteudo',e.target.value)} placeholder="Texto do comunicado..."/></Field></div>
        </div>
      </Modal>

      {/* Finanças */}
      <Modal open={modalFinanca} onClose={()=>setModalFinanca(false)} title="💰 Movimento Financeiro"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalFinanca(false)}>Cancelar</button><button className="btn btn-primary" onClick={guardarFinanca} disabled={saving}>{saving?<Spinner/>:null}Registar</button></>}>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {['receita','despesa'].map(tp=>(
            <button key={tp} type="button" onClick={()=>{sff('tipo',tp);sff('cat',tp==='receita'?'Quotas':'Provas')}} style={{ flex:1, padding:'10px', borderRadius:8, border:`1px solid ${formFin.tipo===tp?tp==='receita'?'#2DD4A7':'#f87171':'#1B2D52'}`, background:formFin.tipo===tp?tp==='receita'?'rgba(45,212,167,.08)':'rgba(248,113,113,.08)':'#101F40', color:formFin.tipo===tp?tp==='receita'?'#2DD4A7':'#f87171':'#94a3b8', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
              {tp==='receita'?'💰 Receita':'💸 Despesa'}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Field label="Categoria"><select className="input" value={formFin.cat} onChange={e=>sff('cat',e.target.value)}>{(formFin.tipo==='receita'?CATS_REC:CATS_DEP).map(c=><option key={c}>{c}</option>)}</select></Field>
          <div className="form-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
            <Field label="Valor (€) *"><input className="input" type="number" step="0.01" value={formFin.valor} onChange={e=>sff('valor',e.target.value)}/></Field>
            <Field label="Data"><input className="input" type="date" value={formFin.data_reg} onChange={e=>sff('data_reg',e.target.value)}/></Field>
          </div>
          <Field label="Descrição"><input className="input" value={formFin.desc} onChange={e=>sff('desc',e.target.value)} placeholder="Notas sobre este movimento..."/></Field>
        </div>
      </Modal>

      {/* Importar CSV */}
      <Modal open={modalImport} onClose={()=>setModalImport(false)} title="📥 Importar Sócios via CSV"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalImport(false)}>Cancelar</button><button className="btn btn-primary" onClick={importarCSV} disabled={saving}>{saving?<Spinner/>:null}Importar</button></>}>
        <div style={{ background:'rgba(76,141,255,.06)', border:'1px solid rgba(76,141,255,.15)', borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:12, color:'#94a3b8', lineHeight:1.7 }}>
          Formato CSV: <strong style={{ color:'#4C8DFF' }}>Nome;Email;Tel;Nº Sócio;Cargo;Quota Mensal</strong><br/>
          A primeira linha é o cabeçalho (ignorado). Separador ; ou ,
        </div>
        <Field label="Conteúdo CSV">
          <textarea className="input" rows={8} style={{ resize:'vertical', fontFamily:"'Space Mono',monospace", fontSize:11 }} value={csvImport} onChange={e=>setCsvImport(e.target.value)} placeholder={'Nome;Email;Tel;Nº Sócio;Cargo;Quota\nJoão Silva;joao@mail.com;912345678;001;socio;5\n...'}/>
        </Field>
      </Modal>

      {/* Votação */}
      <Modal open={modalVotacao} onClose={()=>setModalVotacao(false)} title="🗳️ Nova Votação"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalVotacao(false)}>Cancelar</button><button className="btn btn-primary" onClick={()=>{ toast('Votação criada! (em desenvolvimento)','ok'); setModalVotacao(false) }}>Criar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Field label="Questão"><input className="input" value={formVot.titulo} onChange={e=>setFormVot(f=>({...f,titulo:e.target.value}))} placeholder="Ex: Aprovação do orçamento 2026"/></Field>
          <Field label="Opções (uma por linha)"><textarea className="input" rows={4} style={{resize:'none'}} value={formVot.opcoes} onChange={e=>setFormVot(f=>({...f,opcoes:e.target.value}))}/></Field>
          <Field label="Prazo"><input className="input" type="datetime-local" value={formVot.prazo} onChange={e=>setFormVot(f=>({...f,prazo:e.target.value}))}/></Field>
        </div>
      </Modal>

      {/* Confirmar eliminar sócio */}
      <Modal open={!!confirmDel} onClose={()=>setConfirmDel(null)} title="Eliminar sócio"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirmDel(null)}>Cancelar</button><button className="btn btn-danger" onClick={()=>removerSocio(confirmDel?.id)}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar "{confirmDel?.nome}"? Esta acção remove também os registos de quotas associados.</p>
      </Modal>

      {/* Editar clube */}
      <Modal open={modalClube} onClose={()=>setModalClube(false)} title="✏️ Editar Coletividade" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalClube(false)}>Cancelar</button><button className="btn btn-primary" onClick={actualizarClube} disabled={saving}>{saving?<Spinner/>:null}Guardar</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome"><input className="input" value={formClube.nome} onChange={e=>sfc('nome',e.target.value)}/></Field></div>
          <Field label="Sigla"><input className="input" value={formClube.sigla} onChange={e=>sfc('sigla',e.target.value)}/></Field>
          <Field label="Federação"><input className="input" value={formClube.federacao} onChange={e=>sfc('federacao',e.target.value)}/></Field>
          <Field label="Nº Federativo"><input className="input" value={formClube.num_federacao} onChange={e=>sfc('num_federacao',e.target.value)}/></Field>
          <Field label="Cidade"><input className="input" value={formClube.cidade} onChange={e=>sfc('cidade',e.target.value)}/></Field>
          <Field label="Email"><input className="input" value={formClube.email_club} onChange={e=>sfc('email_club',e.target.value)}/></Field>
          <Field label="Telefone"><input className="input" value={formClube.tel} onChange={e=>sfc('tel',e.target.value)}/></Field>
          <Field label="Site"><input className="input" value={formClube.site} onChange={e=>sfc('site',e.target.value)}/></Field>
          <div className="col-2"><Field label="Morada"><input className="input" value={formClube.morada} onChange={e=>sfc('morada',e.target.value)}/></Field></div>
        </div>
      </Modal>
    </div>
  )
}
