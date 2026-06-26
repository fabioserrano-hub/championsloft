import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useIdioma } from '../hooks/useIdioma'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const ESTADOS = ['em_progresso', 'concluido', 'cancelado']
const ESTADO_LABEL = { em_progresso: 'Activo', concluido: 'Concluído', cancelado: 'Cancelado' }
const ESTADO_COR = { em_progresso: '#2DD4A7', concluido: '#4C8DFF', cancelado: '#7A8699' }
const EMPTY = { pai_id: '', mae_id: '', cacifo: '', data_acasalamento: new Date().toISOString().slice(0,10), data_postura: '', data_eclosao_prev: '', estado: 'em_progresso', ninhadas: '0', obs: '' }
const EMPTY_NASC = { nome: '', sexo: 'M', cor: '', anilha: '', data_nascimento: new Date().toISOString().slice(0,10), data_eclosao_real: '', n_ovos: '2', obs_borrachinho: '' }

const addDias = (d, n) => { if (!d) return ''; const dt = new Date(d); dt.setDate(dt.getDate()+n); return dt.toISOString().slice(0,10) }
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-PT', {day:'2-digit',month:'2-digit'}) : '—'
const diasAte = (d) => d ? Math.round((new Date(d)-new Date())/86400000) : null

export default function Reproducao({ nav, params }) {
  const toast = useToast()
  const { t } = useIdioma()
  const [acasalamentos, setAcasalamentos] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('cacifos')
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [modalNasc, setModalNasc] = useState(null)
  const [formNasc, setFormNasc] = useState(EMPTY_NASC)
  const [savingNasc, setSavingNasc] = useState(false)
  const [expandido, setExpandido] = useState(null)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))
  const sfn = (k,v) => setFormNasc(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a,p] = await Promise.all([db.getAcasalamentos(), db.getPombos()])
      setAcasalamentos(a); setPombos(p)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const machos = pombos.filter(p => p.sexo==='M' && (!p.estado_ext||p.estado_ext==='proprio'))
  const femeas = pombos.filter(p => p.sexo==='F' && (!p.estado_ext||p.estado_ext==='proprio'))

  const openNew = (cacifo='') => {
    setForm({...EMPTY, cacifo})
    setSelected(null); setModal(true)
  }
  const openEdit = (a) => {
    setSelected(a)
    setForm({ pai_id:a.pai_id||'', mae_id:a.mae_id||'', cacifo:a.cacifo||'', data_acasalamento:(a.data_acasalamento||a.inicio)?.slice(0,10)||'', data_postura:a.data_postura?.slice(0,10)||'', data_eclosao_prev:a.data_eclosao_prev?.slice(0,10)||'', estado:a.estado||'em_progresso', ninhadas:String(a.ninhadas||a.n_ninhadas||0), obs:a.obs||'' })
    setModal(true)
  }
  const close = () => { setModal(false); setSelected(null) }

  const onDataAcasalamento = (v) => {
    sf('data_acasalamento', v)
    if (!selected) { sf('data_postura', addDias(v,10)); sf('data_eclosao_prev', addDias(v,28)) }
  }

  const save = async () => {
    if (!form.pai_id || !form.mae_id) { toast('Seleccione pai e mãe','warn'); return }
    setSaving(true)
    try {
      const pai = pombos.find(p=>p.id===form.pai_id)
      const mae = pombos.find(p=>p.id===form.mae_id)
      const payload = { pai_id:form.pai_id, mae_id:form.mae_id, pai_nome:`${pai?.nome} (${pai?.anilha})`, mae_nome:`${mae?.nome} (${mae?.anilha})`, cacifo:form.cacifo, data_acasalamento:form.data_acasalamento, data_postura:form.data_postura||null, data_eclosao_prev:form.data_eclosao_prev||null, estado:form.estado, ninhadas:parseInt(form.ninhadas)||0, obs:form.obs }
      selected ? await db.updateAcasalamento(selected.id, payload) : await db.createAcasalamento(payload)
      toast(selected?'Actualizado!':'Acasalamento registado!','ok'); close(); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteAcasalamento(confirm.id); toast('Eliminado','ok'); setConfirm(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  const abrirModalNascimento = (a) => {
    const pai = pombos.find(p=>p.id===a.pai_id)
    setModalNasc(a)
    setFormNasc({...EMPTY_NASC, cor:pai?.cor||'', data_eclosao_real:a.data_eclosao_prev?.slice(0,10)||new Date().toISOString().slice(0,10)})
  }

  const registarNascimento = async () => {
    if (!formNasc.nome.trim()) { toast('Dê um nome ao borrachinho','warn'); return }
    setSavingNasc(true)
    try {
      const pai = pombos.find(p=>p.id===modalNasc.pai_id)
      const mae = pombos.find(p=>p.id===modalNasc.mae_id)
      await db.createPombo({ anilha:formNasc.anilha||'', nome:formNasc.nome.trim(), sexo:formNasc.sexo, cor:formNasc.cor, esp:pai?.esp||['velocidade'], estado:'inativo', estado_ext:'proprio', pombal:pai?.pombal||'', pai:pai?.anilha||'', mae:mae?.anilha||'', emoji:'🐣', obs:`Nascido em ${formNasc.data_nascimento}. ${formNasc.obs_borrachinho}`.trim(), provas:0, percentil:0, forma:50 })
      await db.updateAcasalamento(modalNasc.id, { ninhadas:(modalNasc.ninhadas||0)+1, n_nascidos:(modalNasc.n_nascidos||0)+1, data_eclosao_real:formNasc.data_eclosao_real||null, n_ovos:parseInt(formNasc.n_ovos)||0 })
      toast(`${formNasc.nome} criado em Pombos! 🐣`,'ok')
      setModalNasc(null); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSavingNasc(false) }
  }

  // KPIs
  const ativos = acasalamentos.filter(a=>a.estado==='em_progresso')
  const totalNascidos = acasalamentos.reduce((s,a)=>s+(a.n_nascidos||0),0)
  const eclosoesProximas = ativos.filter(a=>{ const d=diasAte(a.data_eclosao_prev); return d!==null&&d>=-2&&d<=5 }).sort((a,b)=>new Date(a.data_eclosao_prev)-new Date(b.data_eclosao_prev))

  // Grid de cacifos — numerados automaticamente
  const cacifosUsados = new Set(acasalamentos.filter(a=>a.estado==='em_progresso'&&a.cacifo).map(a=>a.cacifo))
  const numCacifos = Math.max(20, cacifosUsados.size + 8)
  const cacifosGrid = Array.from({length:numCacifos},(_,i)=>String(i+1))

  const acasalOrdenados = [...acasalamentos].sort((a,b)=>new Date(b.data_acasalamento||b.inicio||0)-new Date(a.data_acasalamento||a.inicio||0))

  // Fase do ciclo
  const getFase = (a) => {
    const hoje = new Date()
    if (a.data_eclosao_real) return { label:'🐣 Eclodido', cor:'#2DD4A7' }
    if (a.data_eclosao_prev) {
      const d = diasAte(a.data_eclosao_prev)
      if (d < 0) return { label:`🐣 Eclodiu há ${Math.abs(d)}d`, cor:'#D4AF37' }
      if (d <= 5) return { label:`🐣 Eclosão em ${d}d`, cor:'#D4AF37' }
    }
    if (a.data_postura) {
      const d = diasAte(a.data_postura)
      if (d < 0) return { label:`🥚 Ovos (há ${Math.abs(d)}d)`, cor:'#4C8DFF' }
      if (d <= 3) return { label:`🥚 Postura em ${d}d`, cor:'#94a3b8' }
    }
    return { label:'❤️ Acasalado', cor:'#f87171' }
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:60}}><Spinner lg /></div>

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Reprodução</div>
          <div className="section-sub">{ativos.length} casais activos · {totalNascidos} nascidos esta época</div>
        </div>
        <button className="btn btn-primary" onClick={()=>openNew()}>＋ Novo Casal</button>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16}}>
        {[['❤️', t('casaisActivos'),ativos.length,'#f87171'],['🥚','Em Incubação',ativos.filter(a=>a.data_postura&&!a.data_eclosao_real).length,'#4C8DFF'],['🐣','Eclosões Previstas',eclosoesProximas.length,'#D4AF37'],['🐦','Nascidos',totalNascidos,'#2DD4A7']].map(([icon,label,val,cor])=>(
          <div key={label} className="card card-p" style={{textAlign:'center',borderTop:`2px solid ${cor}`}}>
            <div style={{fontSize:18,marginBottom:2}}>{icon}</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:700,color:cor}}>{val}</div>
            <div style={{fontSize:10,color:'#7A8699'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Alertas de eclosão */}
      {eclosoesProximas.length>0 && (
        <div style={{background:'rgba(212,175,55,.08)',border:'1px solid rgba(212,175,55,.2)',borderRadius:10,padding:'12px 16px',marginBottom:14}}>
          <div style={{fontWeight:600,color:'#D4AF37',marginBottom:6,fontSize:13}}>🐣 Eclosões próximas</div>
          {eclosoesProximas.map(a=>{
            const d = diasAte(a.data_eclosao_prev)
            return <div key={a.id} style={{fontSize:12,color:'#cbd5e1',marginBottom:2}}>
              {a.cacifo?`[Cacifo ${a.cacifo}] `:''}<strong>{a.pai_nome} × {a.mae_nome}</strong> — {d<0?`prevista há ${Math.abs(d)} dia(s)`:d===0?'<strong>HOJE</strong>':`em ${d} dia(s)`} ({fmtData(a.data_eclosao_prev)})
            </div>
          })}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#101F40',borderRadius:8,padding:4,marginBottom:16}}>
        {[['cacifos','🏠 Cacifos'],['lista','📋 Lista'],['timeline','⏱️ Timeline'],['cuidados','💡 Cuidados']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'8px 8px',borderRadius:6,fontSize:11,fontWeight:500,cursor:'pointer',border:'none',fontFamily:'inherit',background:tab===t?'#1E5FD9':'none',color:tab===t?'#fff':'#94a3b8'}}>{l}</button>
        ))}
      </div>

      {/* TAB: CACIFOS */}
      {tab==='cacifos' && (
        <div>
          <div style={{fontSize:11,color:'#7A8699',marginBottom:10}}>Toque num cacifo vazio para registar casal · Verde = activo · Azul = concluído · Cinzento = vazio</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
            {cacifosGrid.map(n=>{
              const aca = acasalamentos.find(a=>a.cacifo===n&&a.estado==='em_progresso')
              const conc = !aca && acasalamentos.find(a=>a.cacifo===n&&a.estado==='concluido')
              const fase = aca ? getFase(aca) : null
              const paiNome = aca ? pombos.find(p=>p.id===aca.pai_id)?.nome||'?' : null
              const maeNome = aca ? pombos.find(p=>p.id===aca.mae_id)?.nome||'?' : null
              return (
                <div key={n} onClick={()=>aca?setExpandido(expandido===aca.id?null:aca.id):openNew(n)}
                  style={{background:aca?'rgba(45,212,167,.07)':conc?'rgba(76,141,255,.05)':'#101F40', border:`2px solid ${aca?'#2DD4A7':conc?'#1E5FD9':'#1B2D52'}`, borderRadius:12, padding:'12px 12px 10px', cursor:'pointer', transition:'all .2s', position:'relative', minHeight:aca?100:72}}>
                  {/* Número do cacifo */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:aca?6:0}}>
                    <div style={{fontSize:10,fontWeight:700,color:aca?'#2DD4A7':conc?'#4C8DFF':'#475569',letterSpacing:.5}}>CACIFO</div>
                    <div style={{fontSize:18,fontWeight:900,color:aca?'#D4AF37':conc?'#4C8DFF':'#2a3a5a',lineHeight:1}}>#{n}</div>
                  </div>
                  {aca && <>
                    <div style={{fontSize:12,color:'#fff',fontWeight:700,lineHeight:1.3,marginBottom:1}}>{paiNome}</div>
                    <div style={{fontSize:11,color:'#94a3b8',marginBottom:6}}>♀ {maeNome}</div>
                    <div style={{display:'inline-flex',alignItems:'center',gap:4,background:'rgba(0,0,0,.2)',borderRadius:6,padding:'3px 7px'}}>
                      <span style={{fontSize:11,color:fase?.cor,fontWeight:600}}>{fase?.label}</span>
                    </div>
                    {aca.n_nascidos>0 && <div style={{fontSize:11,color:'#D4AF37',marginTop:4,fontWeight:600}}>🐣 {aca.n_nascidos} nascido(s)</div>}
                    {aca.data_eclosao_prev && <div style={{fontSize:10,color:'#7A8699',marginTop:2}}>Eclosão: {fmtData(aca.data_eclosao_prev)}</div>}
                  </>}
                  {conc && <>
                    <div style={{fontSize:11,color:'#4C8DFF',fontWeight:600,marginTop:4}}>🏁 Concluído</div>
                    {conc.n_nascidos>0&&<div style={{fontSize:10,color:'#D4AF37'}}>🐣 {conc.n_nascidos} nascido(s)</div>}
                  </>}
                  {!aca && !conc && <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:40,fontSize:22,color:'#1B2D52'}}>＋</div>}
                  {aca && expandido===aca.id && (
                    <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'#0B1830',border:'1px solid #2DD4A7',borderRadius:12,padding:12,marginTop:6,boxShadow:'0 8px 32px rgba(0,0,0,.6)'}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:8}}>{aca.pai_nome} × {aca.mae_nome}</div>
                      <div style={{display:'flex',flexDirection:'column',gap:3,marginBottom:10}}>
                        {aca.data_postura&&<div style={{fontSize:11,color:'#94a3b8'}}>🥚 Postura: {fmtData(aca.data_postura)}</div>}
                        {aca.data_eclosao_prev&&<div style={{fontSize:11,color:'#D4AF37'}}>🐣 Eclosão prev.: {fmtData(aca.data_eclosao_prev)}</div>}
                        {aca.data_eclosao_real&&<div style={{fontSize:11,color:'#2DD4A7'}}>✅ Eclosão real: {fmtData(aca.data_eclosao_real)}</div>}
                        {aca.obs&&<div style={{fontSize:10,color:'#7A8699',marginTop:2}}>{aca.obs}</div>}
                      </div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();abrirModalNascimento(aca)}}>🐣 Nascimento</button>
                        <button className="btn btn-secondary btn-sm" onClick={e=>{e.stopPropagation();openEdit(aca)}}>✏️ Editar</button>
                        <button className="btn btn-secondary btn-sm" onClick={e=>{e.stopPropagation();nav?.('pedigree',{pomboId:aca.pai_id})}}>🌳 Pedigree</button>
                        <button className="btn btn-icon btn-sm" onClick={e=>{e.stopPropagation();setConfirm(aca)}}>🗑️</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB: LISTA */}
      {tab==='lista' && (
        acasalamentos.length===0
          ? <EmptyState icon="🥚" title="Sem acasalamentos" desc="Registe o primeiro casal da época" action={<button className="btn btn-primary" onClick={()=>openNew()}>＋ Novo Casal</button>} />
          : <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {acasalOrdenados.map(a=>{
                const pai = pombos.find(p=>p.id===a.pai_id)
                const mae = pombos.find(p=>p.id===a.mae_id)
                const fase = getFase(a)
                return (
                  <div key={a.id} className="card card-p" style={{borderLeft:`3px solid ${ESTADO_COR[a.estado]}`}}>
                    <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                      {/* Cacifo badge */}
                      {a.cacifo && <div style={{width:36,height:36,borderRadius:8,background:'#101F40',border:'1px solid #1B2D52',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <div style={{fontSize:8,color:'#7A8699'}}>Cac.</div>
                        <div style={{fontSize:13,fontWeight:700,color:'#D4AF37'}}>#{a.cacifo}</div>
                      </div>}
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:2}}>
                          <span style={{fontSize:13,fontWeight:600,color:'#fff'}}>{a.pai_nome} × {a.mae_nome}</span>
                          <span style={{fontSize:10,color:fase.cor,fontWeight:600}}>{fase.label}</span>
                        </div>
                        <div style={{fontSize:11,color:'#7A8699',marginBottom:6}}>
                          Acasalado {new Date(a.data_acasalamento||a.inicio).toLocaleDateString('pt-PT')}
                          {a.ninhadas>0?` · ${a.ninhadas} ninhada(s)`:''}
                          {a.n_nascidos>0?` · 🐣 ${a.n_nascidos} nascido(s)`:''}
                        </div>
                        {/* Timeline mini */}
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          {[['🥚',a.data_postura,'Postura'],[a.data_eclosao_real?'✅':'🐣',a.data_eclosao_prev,'Eclosão prev.'],['🕊️',a.data_eclosao_real,'Eclosão real']].filter(([,d])=>d).map(([icon,d,lbl])=>(
                            <div key={lbl} style={{fontSize:10,color:'#94a3b8'}}>{icon} {lbl}: {fmtData(d)}</div>
                          ))}
                        </div>
                        {a.obs&&<div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>{a.obs}</div>}
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontSize:11,color:ESTADO_COR[a.estado],fontWeight:600}}>{ESTADO_LABEL[a.estado]}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                      {a.estado==='em_progresso'&&<button className="btn btn-primary btn-sm" onClick={()=>abrirModalNascimento(a)}>🐣 Registar Nascimento</button>}
                      <button className="btn btn-secondary btn-sm" onClick={()=>nav?.('pedigree',{pomboId:a.pai_id})}>🌳 Pedigree {pai?.nome}</button>
                      <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(a)}>✏️ Editar</button>
                      <button className="btn btn-icon btn-sm" onClick={()=>setConfirm(a)}>🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
      )}

      {/* TAB: TIMELINE */}
      {tab==='timeline' && (
        <div>
          {acasalamentos.length===0
            ? <EmptyState icon="⏱️" title="Sem dados" desc="Registe acasalamentos para ver a timeline" />
            : acasalOrdenados.map(a=>{
                const fase = getFase(a)
                const steps = [
                  {label:'Acasalamento',data:a.data_acasalamento||a.inicio,done:true,icon:'❤️'},
                  {label:'Postura',data:a.data_postura,done:!!a.data_postura&&new Date(a.data_postura)<=new Date(),icon:'🥚'},
                  {label:'Eclosão',data:a.data_eclosao_prev,done:!!a.data_eclosao_real,icon:'🐣'},
                  {label:'Nascimento',data:a.data_eclosao_real,done:!!(a.n_nascidos>0),icon:'🐦'},
                ]
                return (
                  <div key={a.id} className="card card-p" style={{marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <div>
                        <span style={{fontSize:13,fontWeight:600,color:'#fff'}}>{a.pai_nome} × {a.mae_nome}</span>
                        {a.cacifo&&<span style={{fontSize:10,color:'#D4AF37',marginLeft:8}}>Cacifo #{a.cacifo}</span>}
                      </div>
                      <span style={{fontSize:11,color:fase.cor,fontWeight:600}}>{fase.label}</span>
                    </div>
                    {/* Steps */}
                    <div style={{display:'flex',alignItems:'center',gap:0}}>
                      {steps.map((s,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',flex:i<steps.length-1?1:'auto'}}>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                            <div style={{width:28,height:28,borderRadius:'50%',background:s.done?'#2DD4A7':'#101F40',border:`2px solid ${s.done?'#2DD4A7':'#1B2D52'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>{s.icon}</div>
                            <div style={{fontSize:9,color:s.done?'#2DD4A7':'#475569',marginTop:3,textAlign:'center'}}>{s.label}</div>
                            {s.data&&<div style={{fontSize:8,color:'#7A8699'}}>{fmtData(s.data)}</div>}
                          </div>
                          {i<steps.length-1&&<div style={{flex:1,height:2,background:s.done?'#2DD4A7':'#1B2D52',margin:'0 4px',marginBottom:18}}/>}
                        </div>
                      ))}
                    </div>
                    {a.n_nascidos>0&&<div style={{marginTop:8,fontSize:11,color:'#D4AF37'}}>🐣 {a.n_nascidos} borrachinho(s) nascido(s) · {a.ninhadas||0} ninhada(s)</div>}
                  </div>
                )
              })
          }
        </div>
      )}

      {/* TAB: CUIDADOS */}
      {tab==='cuidados' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>

          {/* Ciclo de referência */}
          <div className="card card-p" style={{borderLeft:'3px solid #D4AF37'}}>
            <div style={{fontWeight:700,color:'#D4AF37',marginBottom:10,fontSize:13}}>📅 Ciclo de Reprodução — Referência</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[
                ['Dia 0','❤️ Acasalamento','#f87171','Introduzir o casal no cacifo. Verificar compatibilidade nas primeiras horas.'],
                ['Dia 8-12','🥚 Postura','#4C8DFF','A fêmea bota geralmente 2 ovos com 48h de intervalo. Não perturbar.'],
                ['Dia 17-19','🔄 Viragem','#94a3b8','Os ovos devem ser virados naturalmente pelos pais. Verificar se estão férteis (luz).'],
                ['Dia 28','🐣 Eclosão','#D4AF37','Prevista 28 dias após a postura. Temperatura ideal: 37-38°C.'],
                ['Dia 28-35','🍼 Cuidados iniciais','#2DD4A7','Papo de leite dos pais. Não manipular os borrachinhos nas primeiras semanas.'],
                ['Dia 25-30','💊 Tratamento Tricomoníase','#f87171','Tratar pais e borrachinhos preventivamente (Ronidazol 5-7 dias).'],
                ['Dia 35-40','🌾 Sólidos','#94a3b8','Começam a comer sólidos. Garantir milho partido acessível.'],
                ['Dia 45-60','🏠 Desmame','#4C8DFF','Separar os jovens dos pais. Anilhar se ainda não estiver feito.'],
              ].map(([dia,evento,cor,desc])=>(
                <div key={dia} style={{display:'flex',gap:10,padding:'8px 10px',background:'#101F40',borderRadius:8,alignItems:'flex-start'}}>
                  <div style={{minWidth:52,fontSize:10,fontWeight:700,color:cor,paddingTop:1}}>{dia}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#fff',marginBottom:1}}>{evento}</div>
                    <div style={{fontSize:11,color:'#7A8699'}}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Erros comuns */}
          <div className="card card-p" style={{borderLeft:'3px solid #f87171'}}>
            <div style={{fontWeight:700,color:'#f87171',marginBottom:10,fontSize:13}}>⚠️ Erros Mais Comuns</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[
                ['Acasalar pombos doentes','Verificar sempre saúde antes de acasalar. Tricomoníase e coccidiose transmitem-se facilmente aos borrachinhos.'],
                ['Perturbar o ninho nos primeiros dias','Os primeiros 5 dias são críticos. Intervenções desnecessárias podem levar ao abandono dos ovos.'],
                ['Excesso de ninhadas seguidas','Máximo 2-3 ninhadas por época por casal. Mais do que isso compromete a condição física dos pais.'],
                ['Ovos não férteis não detectados','Verificar fertilidade ao 7º dia com luz (ovoscópio). Ovos claros devem ser removidos.'],
                ['Tricomoníase não tratada','Causa mortalidade elevada em borrachinhos. Tratar preventivamente pai e mãe antes da postura.'],
                ['Cacifo inadequado','Escuridão insuficiente, correntes de ar ou humidade comprometem a reprodução.'],
                ['Anilhar demasiado cedo ou tarde','Anilhar entre os dias 6-8 de vida. Tarde demais e o anel não passa; cedo demais e a pata está frágil.'],
                ['Separar casal antes do desmame','Os borrachinhos precisam dos pais até aos 35-40 dias. Separação precoce causa desnutrição.'],
              ].map(([titulo,desc])=>(
                <div key={titulo} style={{padding:'8px 10px',background:'rgba(248,113,113,.05)',border:'1px solid rgba(248,113,113,.15)',borderRadius:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#f87171',marginBottom:2}}>✗ {titulo}</div>
                  <div style={{fontSize:11,color:'#7A8699'}}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dicas premium */}
          <div className="card card-p" style={{borderLeft:'3px solid #2DD4A7'}}>
            <div style={{fontWeight:700,color:'#2DD4A7',marginBottom:10,fontSize:13}}>✅ Dicas de Especialistas</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[
                ['Selecção de casais por linha genética','Cruzar linhas complementares: velocidade × resistência. Evitar consanguinidade excessiva (verificar pedigree).'],
                ['Iluminação artificial','Aumentar o fotoperíodo para 16h/dia a partir de Janeiro para estimular a reprodução mais cedo.'],
                ['Alimentação específica','Aumentar proteína (ervilhas, lentilhas) e cálcio (osso de sépia) nas 2 semanas antes da postura.'],
                ['Ninho adequado','Taça de barro ou plástico 20cm, com palha ou tabaco seco. Limpar entre ninhadas.'],
                ['Registo fotográfico','Fotografar os borrachinhos ao nascer e na anilhagem. Facilita identificação futura e construção do pedigree.'],
                ['Ovoscopia ao 7º dia','Usar lanterna forte em ambiente escuro para verificar fertilidade. Ovo fértil tem veias vermelhas visíveis.'],
                ['Vitaminas pré-reprodução','Suplementar vitaminas A, D, E e complexo B 2 semanas antes do acasalamento para aumentar fertilidade.'],
              ].map(([titulo,desc])=>(
                <div key={titulo} style={{padding:'8px 10px',background:'rgba(45,212,167,.05)',border:'1px solid rgba(45,212,167,.12)',borderRadius:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#2DD4A7',marginBottom:2}}>✓ {titulo}</div>
                  <div style={{fontSize:11,color:'#7A8699'}}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Modal novo acasalamento */}
      <Modal open={modal} onClose={close} title={selected?'✏️ Editar Casal':'🥚 Novo Casal'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}{selected? t('guardar') :'Registar'}</button></>}>
        <div className="form-grid">
          <Field label="♂ Pai (Macho) *">
            <select className="input" value={form.pai_id} onChange={e=>sf('pai_id',e.target.value)}>
              <option value="">— Seleccionar —</option>
              {machos.map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}
            </select>
          </Field>
          <Field label="♀ Mãe (Fêmea) *">
            <select className="input" value={form.mae_id} onChange={e=>sf('mae_id',e.target.value)}>
              <option value="">— Seleccionar —</option>
              {femeas.map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}
            </select>
          </Field>
          <Field label="Nº do Cacifo">
            <input className="input" placeholder="Ex: 1, 2A, B3..." value={form.cacifo} onChange={e=>sf('cacifo',e.target.value)} />
          </Field>
          <Field label="Estado">
            <select className="input" value={form.estado} onChange={e=>sf('estado',e.target.value)}>
              {ESTADOS.map(e=><option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
            </select>
          </Field>
          <Field label="Data de Acasalamento">
            <input className="input" type="date" value={form.data_acasalamento} onChange={e=>onDataAcasalamento(e.target.value)} />
          </Field>
          <Field label="Prev. Postura (+10 dias)">
            <input className="input" type="date" value={form.data_postura} onChange={e=>sf('data_postura',e.target.value)} />
          </Field>
          <Field label="Prev. Eclosão (+28 dias)">
            <input className="input" type="date" value={form.data_eclosao_prev} onChange={e=>sf('data_eclosao_prev',e.target.value)} />
          </Field>
          <Field label="Ninhadas">
            <input className="input" type="number" value={form.ninhadas} onChange={e=>sf('ninhadas',e.target.value)} />
          </Field>
          <div className="col-2">
            <Field label="Observações">
              <textarea className="input" rows={2} style={{resize:'none'}} value={form.obs} onChange={e=>sf('obs',e.target.value)} />
            </Field>
          </div>
        </div>
      </Modal>

      {/* Modal nascimento */}
      <Modal open={!!modalNasc} onClose={()=>setModalNasc(null)} title="🐣 Registar Nascimento" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalNasc(null)}>Cancelar</button><button className="btn btn-primary" onClick={registarNascimento} disabled={savingNasc}>{savingNasc?<Spinner/>:null}Criar Borrachinho</button></>}>
        {modalNasc&&(
          <div>
            <div style={{background:'rgba(45,212,167,.08)',border:'1px solid rgba(45,212,167,.2)',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#94a3b8'}}>
              Casal: <strong style={{color:'#fff'}}>{modalNasc.pai_nome} × {modalNasc.mae_nome}</strong>
              {modalNasc.cacifo&&<> · Cacifo <strong style={{color:'#D4AF37'}}>#{modalNasc.cacifo}</strong></>}
            </div>
            <div className="form-grid">
              <div className="col-2">
                <Field label="Nome do Borrachinho *">
                  <input className="input" placeholder="Ex: Zeus Jr., Estrela..." value={formNasc.nome} onChange={e=>sfn('nome',e.target.value)} />
                </Field>
              </div>
              <Field label="Sexo">
                <select className="input" value={formNasc.sexo} onChange={e=>sfn('sexo',e.target.value)}>
                  <option value="M">♂ Macho</option><option value="F">♀ Fêmea</option>
                </select>
              </Field>
              <Field label="Cor">
                <input className="input" placeholder="Ex: Azul barrado" value={formNasc.cor} onChange={e=>sfn('cor',e.target.value)} />
              </Field>
              <Field label="Data de Nascimento">
                <input className="input" type="date" value={formNasc.data_nascimento} onChange={e=>sfn('data_nascimento',e.target.value)} />
              </Field>
              <Field label="Data de Eclosão Real">
                <input className="input" type="date" value={formNasc.data_eclosao_real} onChange={e=>sfn('data_eclosao_real',e.target.value)} />
              </Field>
              <Field label="Nº de Ovos">
                <input className="input" type="number" value={formNasc.n_ovos} onChange={e=>sfn('n_ovos',e.target.value)} />
              </Field>
              <Field label="Anilha (se já atribuída)">
                <input className="input" placeholder="PT-2026-00001" value={formNasc.anilha} onChange={e=>sfn('anilha',e.target.value)} />
              </Field>
              <div className="col-2">
                <Field label="Observações">
                  <textarea className="input" rows={2} style={{resize:'none'}} value={formNasc.obs_borrachinho} onChange={e=>sfn('obs_borrachinho',e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm delete */}
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar casal"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{fontSize:14,color:'#cbd5e1'}}>Eliminar o acasalamento de <strong>{confirm?.pai_nome} × {confirm?.mae_nome}</strong>? Esta acção não pode ser revertida.</p>
      </Modal>
    </div>
  )
}
