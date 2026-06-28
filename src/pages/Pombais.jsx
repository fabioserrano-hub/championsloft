import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { classificarPombo } from './Pombos'

// ── constantes ────────────────────────────────────────────────────────────────
const CORES = ['#2DD4A7','#D94F4F','#4C8DFF','#D4AF37','#6C4FBB','#E07B39']
const TIPOS = ['Misto','Machos','Fêmeas','Jovens','Reprodutores','Treino']
const TIPO_ICON = { Misto:'🏠', Machos:'♂', Fêmeas:'♀', Jovens:'🐣', Reprodutores:'🥚', Treino:'🎯' }

const EMPTY = { nome:'', tipo:'Misto', cap:'40', n_cacifos:'20', loc:'', lat:'', lon:'', cor:'#2DD4A7' }

const fmtData = d => d ? new Date(d).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'}) : '—'
const diasAte = d => d ? Math.round((new Date(d)-new Date())/86400000) : null

// ── helpers ───────────────────────────────────────────────────────────────────
function getFase(a) {
  if (a.data_eclosao_real) return { label:'🐣 Eclodido', cor:'#2DD4A7' }
  if (a.data_eclosao_prev) {
    const d = diasAte(a.data_eclosao_prev)
    if (d < 0) return { label:`🐣 Eclodiu há ${Math.abs(d)}d`, cor:'#D4AF37' }
    if (d <= 5) return { label:`🐣 Eclosão em ${d}d`, cor:'#F59E0B' }
  }
  if (a.data_postura) {
    const d = diasAte(a.data_postura)
    if (d < 0) return { label:`🥚 Ovos (${Math.abs(d)}d)`, cor:'#4C8DFF' }
    if (d <= 3) return { label:`🥚 Postura em ${d}d`, cor:'#94a3b8' }
  }
  return { label:'❤️ Acasalado', cor:'#f87171' }
}

// ── componente principal ──────────────────────────────────────────────────────
export default function Pombais({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()

  const [pombais, setPombais]         = useState([])
  const [pombos, setPombos]           = useState([])
  const [acasalamentos, setAcasalamentos] = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [selected, setSelected]       = useState(null)
  const [saving, setSaving]           = useState(false)
  const [confirm, setConfirm]         = useState(null)
  const [pombalDetalhe, setPombalDetalhe] = useState(null)
  const [pomboDetalhe, setPomboDetalhe]   = useState(null)
  const [expandidoCacifo, setExpandidoCacifo] = useState(null)
  const [form, setForm]               = useState(EMPTY)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pb,p,ac] = await Promise.all([db.getPombais(), db.getPombos(), db.getAcasalamentos().catch(()=>[])])
      setPombais(pb); setPombos(p); setAcasalamentos(ac)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])
  useEffect(()=>{ load() },[load])

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openNew  = () => { setForm(EMPTY); setSelected(null); setModal(true) }
  const openEdit = pb => { setSelected(pb); setForm({ nome:pb.nome||'', tipo:pb.tipo||'Misto', cap:String(pb.cap||40), n_cacifos:String(pb.n_cacifos||20), loc:pb.loc||'', lat:String(pb.lat||''), lon:String(pb.lon||''), cor:pb.cor||'#2DD4A7' }); setModal(true) }
  const close    = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if(!form.nome.trim()){toast('Nome obrigatório','warn');return}
    setSaving(true)
    try {
      const payload = { nome:form.nome.trim(), tipo:form.tipo, cap:parseInt(form.cap)||40, n_cacifos:parseInt(form.n_cacifos)||20, loc:form.loc, lat:form.lat?parseFloat(form.lat):null, lon:form.lon?parseFloat(form.lon):null, cor:form.cor }
      selected ? await db.updatePombal(selected.id,payload) : await db.createPombal(payload)
      toast(selected?'Actualizado!':'Pombal criado!','ok'); close(); load()
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setSaving(false)}
  }

  const del = async () => {
    try{await db.deletePombal(confirm.id);toast('Eliminado','ok');setConfirm(null);load()}
    catch(e){toast('Erro: '+e.message,'err')}
  }

  // ── computed ──────────────────────────────────────────────────────────────
  const totalOcupacao = pombais.reduce((s,pb)=>s+pombos.filter(p=>p.pombal===pb.nome).length,0)
  const sobreOcupados = pombais.filter(pb=>pombos.filter(p=>p.pombal===pb.nome).length>pb.cap)

  const pombosDoPombal = pb => pb ? pombos.filter(p=>p.pombal===pb.nome) : []
  const acasalDoPombal = pb => pb ? acasalamentos.filter(a=>a.estado==='em_progresso') : []
  // acasalamentos por cacifo de um pombal (tipo Reprodutores)
  const acasalAtivos = acasalamentos.filter(a=>a.estado==='em_progresso')
  const eclosoesProximas = acasalAtivos.filter(a=>{
    const d=diasAte(a.data_eclosao_prev)
    return d!==null&&d>=-2&&d<=7
  }).sort((a,b)=>new Date(a.data_eclosao_prev)-new Date(b.data_eclosao_prev))

  // ── grelha de cacifos (para pombais tipo Reprodutores) ───────────────────
  const renderGrelha = (pb, compact=false) => {
    const nCacifos = pb.n_cacifos || 20
    const cacifos = Array.from({length:nCacifos},(_,i)=>String(i+1))
    const cols = compact ? 4 : 4

    return (
      <div>
        {!compact && (
          <div style={{ fontSize:11, color:'#7A8699', marginBottom:10 }}>
            Toque num cacifo vazio para registar casal · <span style={{ color:'#2DD4A7' }}>Verde = activo</span> · <span style={{ color:'#4C8DFF' }}>Azul = concluído</span>
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:compact?6:8 }}>
          {cacifos.map(n=>{
            const aca = acasalamentos.find(a=>a.cacifo===n&&a.estado==='em_progresso')
            const conc = !aca && acasalamentos.find(a=>a.cacifo===n&&a.estado==='concluido')
            const fase = aca ? getFase(aca) : null
            const isExpanded = expandidoCacifo===`${pb.id}_${n}`

            if (compact) {
              // versão compacta para o card do pombal
              return (
                <div key={n} onClick={()=>{
                  if(aca) setExpandidoCacifo(isExpanded?null:`${pb.id}_${n}`)
                  else nav?.('reproducao')
                }} style={{ background:aca?'rgba(45,212,167,.08)':conc?'rgba(76,141,255,.06)':'#101F40', border:`1px solid ${aca?'#2DD4A7':conc?'#1E5FD9':'#1B2D52'}`, borderRadius:8, padding:'6px 8px', cursor:'pointer', minHeight:52, position:'relative' }}>
                  <div style={{ fontSize:9, color:aca?'#2DD4A7':conc?'#4C8DFF':'#334155', fontWeight:700 }}>#{n}</div>
                  {aca ? (
                    <>
                      <div style={{ fontSize:10, color:'#fff', fontWeight:600, lineHeight:1.2, marginTop:2 }}>{aca.pai_nome?.split(' ')?.[0]||'?'}</div>
                      <div style={{ fontSize:9, color:'#94a3b8' }}>♀ {aca.mae_nome?.split(' ')?.[0]||'?'}</div>
                      <div style={{ fontSize:9, color:fase?.cor, fontWeight:600, marginTop:2 }}>{fase?.label}</div>
                    </>
                  ) : conc ? (
                    <div style={{ fontSize:9, color:'#4C8DFF', marginTop:4 }}>🏁 Concluído</div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:28, fontSize:16, color:'#1B2D52' }}>＋</div>
                  )}
                </div>
              )
            }

            // versão completa
            return (
              <div key={n} style={{ position:'relative' }}>
                <div onClick={()=>{
                  if(aca) setExpandidoCacifo(isExpanded?null:`${pb.id}_${n}`)
                  else nav?.('reproducao')
                }} style={{ background:aca?'rgba(45,212,167,.07)':conc?'rgba(76,141,255,.05)':'#101F40', border:`2px solid ${aca?'#2DD4A7':conc?'#1E5FD9':'#1B2D52'}`, borderRadius:12, padding:'12px 12px 10px', cursor:'pointer', transition:'all .2s', minHeight:aca?100:72 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:aca?6:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:aca?'#2DD4A7':conc?'#4C8DFF':'#475569', letterSpacing:.5 }}>CACIFO</div>
                    <div style={{ fontSize:18, fontWeight:900, color:aca?'#D4AF37':conc?'#4C8DFF':'#2a3a5a', lineHeight:1 }}>#{n}</div>
                  </div>
                  {aca && <>
                    <div style={{ fontSize:12, color:'#fff', fontWeight:700, lineHeight:1.3, marginBottom:1 }}>{aca.pai_nome?.split('(')?.[0]?.trim()||'?'}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginBottom:6 }}>♀ {aca.mae_nome?.split('(')?.[0]?.trim()||'?'}</div>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(0,0,0,.2)', borderRadius:6, padding:'3px 7px' }}>
                      <span style={{ fontSize:11, color:fase?.cor, fontWeight:600 }}>{fase?.label}</span>
                    </div>
                    {aca.n_nascidos>0&&<div style={{ fontSize:11, color:'#D4AF37', marginTop:4, fontWeight:600 }}>🐣 {aca.n_nascidos} nascido(s)</div>}
                    {aca.data_eclosao_prev&&<div style={{ fontSize:10, color:'#7A8699', marginTop:2 }}>Eclosão: {fmtData(aca.data_eclosao_prev)}</div>}
                  </>}
                  {conc&&<><div style={{ fontSize:11, color:'#4C8DFF', fontWeight:600, marginTop:4 }}>🏁 Concluído</div>{(conc.n_nascidos||0)>0&&<div style={{ fontSize:10, color:'#D4AF37' }}>🐣 {conc.n_nascidos}</div>}</>}
                  {!aca&&!conc&&<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:40, fontSize:22, color:'#1B2D52' }}>＋</div>}
                </div>
                {/* popup expandido */}
                {aca&&isExpanded&&(
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:'#0B1830', border:'1px solid #2DD4A7', borderRadius:12, padding:12, marginTop:6, boxShadow:'0 8px 32px rgba(0,0,0,.7)' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#fff', marginBottom:8 }}>{aca.pai_nome} × {aca.mae_nome}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:10 }}>
                      {aca.data_postura&&<div style={{ fontSize:11, color:'#94a3b8' }}>🥚 Postura: {fmtData(aca.data_postura)}</div>}
                      {aca.data_eclosao_prev&&<div style={{ fontSize:11, color:'#D4AF37' }}>🐣 Eclosão prev.: {fmtData(aca.data_eclosao_prev)}</div>}
                      {aca.data_eclosao_real&&<div style={{ fontSize:11, color:'#2DD4A7' }}>✅ Eclosão real: {fmtData(aca.data_eclosao_real)}</div>}
                      {aca.obs&&<div style={{ fontSize:10, color:'#7A8699', marginTop:2 }}>{aca.obs}</div>}
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();nav?.('reproducao')}}>🐣 Reprodução</button>
                      <button className="btn btn-secondary btn-sm" onClick={e=>{e.stopPropagation();setExpandidoCacifo(null)}}>Fechar</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── render card de pombal ─────────────────────────────────────────────────
  const renderCard = (pb) => {
    if (!pb || !pb.nome) return null
    const moradores = pombosDoPombal(pb)
    const n = moradores.length
    const pct = Math.round(n/Math.max(pb.cap,1)*100)
    const barCor = pct>90?'#f87171':pct>70?'#D4AF37':'#2DD4A7'
    const comAtencao = moradores.filter(p=>classificarPombo(p).prioridade<=1)
    const isReprodutor = pb.tipo==='Reprodutores'
    const cor = pb.cor || '#2DD4A7'
    const icon = TIPO_ICON[pb.tipo] || '🏠'

    // stats específicos para reprodutores
    const acasalPombal = isReprodutor ? acasalAtivos : []
    const eclosoesCard = isReprodutor ? acasalPombal.filter(a=>{
      const d=diasAte(a.data_eclosao_prev)
      return d!==null&&d>=-2&&d<=7
    }) : []
    const cacifosOcupados = isReprodutor ? acasalPombal.length : 0
    const nCacifos = pb.n_cacifos || 20

    return (
      <div key={pb.id} onClick={()=>{setPombalDetalhe(pb);setPomboDetalhe(null)}} style={{ background:'#0B1830', border:`1px solid ${cor}30`, borderRadius:14, overflow:'hidden', position:'relative', cursor:'pointer', transition:'border-color .2s' }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=cor+'70'}
        onMouseLeave={e=>e.currentTarget.style.borderColor=cor+'30'}>
        {/* barra top colorida */}
        <div style={{ height:3, background:`linear-gradient(90deg,${cor},${cor}88)` }} />

        <div style={{ padding:'14px 16px' }}>
          {/* header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${cor}15`, border:`1px solid ${cor}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                {icon}
              </div>
              <div>
                <div style={{ fontWeight:700, color:'#fff', fontSize:14 }}>{pb.nome}</div>
                <div style={{ fontSize:11, color:'#7A8699' }}>{pb.tipo}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:4 }}>
              <button className="btn btn-icon btn-sm" onClick={e=>{e.stopPropagation();openEdit(pb)}}>✏️</button>
              <button className="btn btn-icon btn-sm" onClick={e=>{e.stopPropagation();setConfirm(pb)}}>🗑️</button>
            </div>
          </div>

          {/* ocupação */}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
            <span style={{ color:'#94a3b8' }}>Ocupação</span>
            <span style={{ fontWeight:700, color:pct>100?'#f87171':'#fff' }}>{n}/{pb.cap} ({pct}%)</span>
          </div>
          <div className="progress" style={{ marginBottom:10 }}>
            <div className="progress-bar" style={{ width:`${Math.min(pct,100)}%`, background:barCor }} />
          </div>

          {/* localização */}
          {pb.loc&&<div style={{ fontSize:11, color:'#7A8699', marginBottom:8 }}>📍 {pb.loc}</div>}

          {/* alertas saúde */}
          {comAtencao.length>0&&(
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, fontSize:11, color:'#f87171' }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#f87171', flexShrink:0 }} />
              {comAtencao.length} pombo(s) a precisar de atenção
            </div>
          )}

          {/* ── REPRODUTORES: stats de cacifos ── */}
          {isReprodutor && (
            <div style={{ background:'rgba(45,212,167,.06)', border:'1px solid rgba(45,212,167,.15)', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#2DD4A7' }}>🥚 Cacifos de Reprodução</div>
                <div style={{ fontSize:11, color:'#7A8699' }}>{cacifosOcupados}/{nCacifos} ocupados</div>
              </div>
              {/* mini barra cacifos */}
              <div style={{ height:4, background:'#1B2D52', borderRadius:2, overflow:'hidden', marginBottom:8 }}>
                <div style={{ height:'100%', width:`${Math.min((cacifosOcupados/nCacifos)*100,100)}%`, background:'#2DD4A7', borderRadius:2 }} />
              </div>
              {/* eclosões próximas */}
              {eclosoesCard.length>0&&(
                <div style={{ marginBottom:8 }}>
                  {eclosoesCard.slice(0,2).map((a,i)=>{
                    const d=diasAte(a.data_eclosao_prev)
                    return (
                      <div key={i} style={{ fontSize:11, color:'#D4AF37', marginBottom:3 }}>
                        🐣 {a.pai_nome?.split('(')[0].trim()} × {a.mae_nome?.split('(')[0].trim()} — {d<=0?'HOJE':d===1?'amanhã':`em ${d}d`}
                      </div>
                    )
                  })}
                  {eclosoesCard.length>2&&<div style={{ fontSize:10, color:'#475569' }}>+{eclosoesCard.length-2} mais eclosões</div>}
                </div>
              )}
              <button className="btn btn-secondary btn-sm" style={{ width:'100%', fontSize:11 }} onClick={e=>{e.stopPropagation();nav?.('reproducao')}}>
                🥚 Ver Cacifos na Reprodução →
              </button>
            </div>
          )}

          {/* ── LISTA DE POMBOS (não reprodutores) ── */}
          {!isReprodutor && n>0&&(
            <div style={{ marginTop:4, paddingTop:10, borderTop:'1px solid #1B2D52' }}>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:6 }}>Pombos ({n}):</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {moradores.slice(0,8).map(p=>(
                  <div key={p.id} onClick={e=>{e.stopPropagation();nav?.('pombos')}} title={`Ver ${p.nome}`}
                    style={{ display:'flex', alignItems:'center', gap:3, background:'#101F40', borderRadius:6, padding:'2px 8px', fontSize:11, cursor:'pointer', border:`1px solid ${classificarPombo(p).prioridade<=1?'rgba(248,113,113,.3)':'#1B2D52'}` }}>
                    <span>{p.emoji}</span>
                    <span style={{ color:'#cbd5e1' }}>{p.nome}</span>
                    {p.cacifo&&<span style={{ color:'#475569', fontSize:9 }}>#{p.cacifo}</span>}
                    {classificarPombo(p).prioridade<=1&&<span style={{ color:'#f87171' }}>⚠️</span>}
                  </div>
                ))}
                {n>8&&<div style={{ fontSize:11, color:'#7A8699', alignSelf:'center' }}>+{n-8} mais</div>}
              </div>
            </div>
          )}

          {/* stats extras */}
          {n>0&&(()=>{
            const aptos = moradores.filter(p=>classificarPombo(p).prioridade>=3).length
            const emProva = moradores.filter(p=>p.estado_ext==='em_prova').length
            const percentilMedio = moradores.filter(p=>p.percentil>0).length>0
              ? Math.round(moradores.filter(p=>p.percentil>0).reduce((s,p)=>s+(p.percentil||0),0)/Math.max(moradores.filter(p=>p.percentil>0).length,1))
              : null
            return (
              <div style={{ display:'flex', gap:12, marginTop:10, paddingTop:10, borderTop:'1px solid #1B2D52', flexWrap:'wrap' }}>
                <div style={{ fontSize:11, color:'#7A8699' }}>✅ <span style={{ color:'#2DD4A7', fontWeight:600 }}>{aptos}</span> aptos</div>
                {emProva>0&&<div style={{ fontSize:11, color:'#7A8699' }}>🏁 <span style={{ color:'#D4AF37', fontWeight:600 }}>{emProva}</span> em prova</div>}
                {percentilMedio&&<div style={{ fontSize:11, color:'#7A8699' }}>📊 <span style={{ color:'#4C8DFF', fontWeight:600 }}>{percentilMedio}%</span> médio</div>}
              </div>
            )
          })()}

          {/* botão novo pombo */}
          <button className="btn btn-secondary btn-sm" style={{ marginTop:12, width:'100%', justifyContent:'center' }}
            onClick={e=>{e.stopPropagation();nav?.('pombos',{prefillPombal:pb.nome})}}>
            ＋ Novo Pombo aqui
          </button>
        </div>
      </div>
    )
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Pombais</div>
          <div className="section-sub">{pombais.length} instalações · {totalOcupacao} pombos alojados</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>＋ Novo Pombal</button>
      </div>

      {/* alertas sobre-ocupação */}
      {sobreOcupados.length>0&&(
        <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
          <div style={{ fontWeight:600, color:'#f87171', marginBottom:6 }}>⚠️ {sobreOcupados.length} pombal(is) sobre-ocupado(s)</div>
          {sobreOcupados.map(pb=>(
            <div key={pb.id} style={{ fontSize:12, color:'#cbd5e1' }}>{pb.nome} — {pombos.filter(p=>p.pombal===pb.nome).length}/{pb.cap}</div>
          ))}
        </div>
      )}

      {/* eclosões próximas globais */}
      {eclosoesProximas.length>0&&(
        <div style={{ background:'rgba(212,175,55,.07)', border:'1px solid rgba(212,175,55,.2)', borderRadius:12, padding:'12px 16px', marginBottom:16, cursor:'pointer' }} onClick={e=>{e.stopPropagation();nav?.('reproducao')}}>
          <div style={{ fontWeight:600, color:'#D4AF37', marginBottom:6, fontSize:13 }}>🐣 Eclosões próximas</div>
          {eclosoesProximas.slice(0,3).map((a,i)=>{
            const d=diasAte(a.data_eclosao_prev)
            return (
              <div key={i} style={{ fontSize:12, color:'#cbd5e1', marginBottom:2 }}>
                {a.cacifo?`[#${a.cacifo}] `:''}<strong>{a.pai_nome?.split('(')[0].trim()} × {a.mae_nome?.split('(')[0].trim()}</strong> — {d<=0?'HOJE':d===1?'amanhã':`em ${d} dia(s)`} ({fmtData(a.data_eclosao_prev)})
              </div>
            )
          })}
          {eclosoesProximas.length>3&&<div style={{ fontSize:11, color:'#7A8699', marginTop:4 }}>+{eclosoesProximas.length-3} mais → ver Reprodução</div>}
        </div>
      )}

      {/* lista de pombais */}
      {loading
        ?<div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        :pombais.length===0
          ?<EmptyState icon="🏠" title="Sem pombais" desc="Registe o seu pombal" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Pombal</button>} />
          :<div className="grid-2">{pombais.map(renderCard)}</div>
      }

      {/* ══ MODAL FORM ════════════════════════════════════════════════════════ */}
      <Modal open={modal} onClose={close} title={selected?'✏️ Editar Pombal':'🏠 Novo Pombal'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}{selected?t('guardar'):'Criar'}</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Ex: Pombal Principal" value={form.nome} onChange={e=>sf('nome',e.target.value)} /></Field></div>
          <Field label="Tipo">
            <select className="input" value={form.tipo} onChange={e=>sf('tipo',e.target.value)}>
              {TIPOS.map(tp=><option key={tp}>{tp}</option>)}
            </select>
          </Field>
          <Field label="Capacidade (pombos)"><input className="input" type="number" value={form.cap} onChange={e=>sf('cap',e.target.value)} /></Field>
          {form.tipo==='Reprodutores'&&(
            <Field label="Nº de Cacifos">
              <input className="input" type="number" value={form.n_cacifos} onChange={e=>sf('n_cacifos',e.target.value)} />
              <div style={{ fontSize:10, color:'#7A8699', marginTop:2 }}>Default: 20 cacifos</div>
            </Field>
          )}
          <div className="col-2"><Field label="Morada"><input className="input" placeholder="Endereço" value={form.loc} onChange={e=>sf('loc',e.target.value)} /></Field></div>
          <Field label="Latitude GPS"><input className="input" placeholder="38.80234" value={form.lat} onChange={e=>sf('lat',e.target.value)} /></Field>
          <Field label="Longitude GPS"><input className="input" placeholder="-9.38142" value={form.lon} onChange={e=>sf('lon',e.target.value)} /></Field>
          <div className="col-2">
            <label className="label" style={{ display:'block', marginBottom:6 }}>Cor de identificação</label>
            <div style={{ display:'flex', gap:8 }}>
              {CORES.map(c=><button key={c} type="button" onClick={()=>sf('cor',c)} style={{ width:28, height:28, borderRadius:8, background:c, border:form.cor===c?'3px solid #fff':'2px solid transparent', cursor:'pointer' }} />)}
            </div>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL DETALHE POMBAL ══════════════════════════════════════════════ */}
      <Modal open={!!pombalDetalhe} onClose={()=>{setPombalDetalhe(null);setPomboDetalhe(null);setExpandidoCacifo(null)}} title={`${TIPO_ICON[pombalDetalhe?.tipo]||'🏠'} ${pombalDetalhe?.nome||'Pombal'}`} wide>
        {pomboDetalhe ? (
          // detalhe de um pombo específico
          <div>
            <button className="btn btn-secondary btn-sm" style={{ marginBottom:14 }} onClick={()=>setPomboDetalhe(null)}>← Voltar</button>
            <div style={{ display:'flex', gap:16, marginBottom:16 }}>
              <div style={{ width:80, height:80, borderRadius:14, background:'#1a2840', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, overflow:'hidden', flexShrink:0, border:'1px solid #1B2D52' }}>
                {pomboDetalhe?.foto_url?<img src={pomboDetalhe.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />:pomboDetalhe?.emoji||'🐦'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{pomboDetalhe?.nome||"—"}</div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, color:'#2DD4A7', marginTop:2 }}>{pomboDetalhe?.anilha||"—"}</div>
                <div style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>{pomboDetalhe?.sexo==='M'?'♂ Macho':'♀ Fêmea'} · {pomboDetalhe?.cor||'—'}</div>
                {pomboDetalhe?.cacifo&&<div style={{ fontSize:11, color:'#D4AF37', marginTop:3 }}>Cacifo #{pomboDetalhe.cacifo}</div>}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
              {[['Provas',pomboDetalhe?.provas||0,'#D4AF37'],['Percentil',(pomboDetalhe?.percentil||0)+'%','#2DD4A7'],['Forma',(pomboDetalhe?.forma||50)+'%','#4C8DFF']].map(([l,v,c])=>(
                <div key={l} style={{ textAlign:'center', background:'#101F40', borderRadius:10, padding:10 }}>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:c }}>{v}</div>
                  <div style={{ fontSize:10, color:'#7A8699' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><div style={{ fontSize:10, color:'#7A8699', marginBottom:3 }}>Pai</div><div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'#2DD4A7' }}>{pomboDetalhe?.pai||'—'}</div></div>
              <div><div style={{ fontSize:10, color:'#7A8699', marginBottom:3 }}>Mãe</div><div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'#2DD4A7' }}>{pomboDetalhe?.mae||'—'}</div></div>
            </div>
            {pomboDetalhe.obs&&<div style={{ marginTop:12 }}><div style={{ fontSize:10, color:'#7A8699', marginBottom:3 }}>Observações</div><div style={{ fontSize:13, color:'#cbd5e1' }}>{pomboDetalhe?.obs}</div></div>}
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button className="btn btn-secondary btn-sm" onClick={()=>nav?.('pombos')}>Ver em Pombos →</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>nav?.('pedigree',{pomboId:pomboDetalhe?.id})}>🌳 Pedigree</button>
            </div>
          </div>
        ) : pombalDetalhe?.tipo==='Reprodutores' ? (
          // vista cacifos completa para reprodutores
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
              {[
                {v:acasalAtivos.length,l:'Casais Activos',cor:'#f87171'},
                {v:acasalAtivos.filter(a=>a.data_postura&&!a.data_eclosao_real).length,l:'Em Incubação',cor:'#4C8DFF'},
                {v:eclosoesProximas.length,l:'Eclosões próximas',cor:'#D4AF37'},
              ].map(({v,l,cor})=>(
                <div key={l} style={{ textAlign:'center', background:'#101F40', borderRadius:10, padding:'10px 6px' }}>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:cor }}>{v}</div>
                  <div style={{ fontSize:10, color:'#7A8699' }}>{l}</div>
                </div>
              ))}
            </div>
            {renderGrelha(pombalDetalhe, false)}
            <div style={{ marginTop:14, textAlign:'center' }}>
              <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();nav?.('reproducao')}}>Gerir Reprodução →</button>
            </div>
          </div>
        ) : (
          // lista de pombos para outros tipos
          <div>
            <div style={{ fontSize:13, color:'#94a3b8', marginBottom:12 }}>
              {pombosDoPombal(pombalDetalhe).length} pombos neste pombal
            </div>
            {pombosDoPombal(pombalDetalhe).length===0
              ?<div style={{ textAlign:'center', color:'#475569', padding:'30px 0' }}>Nenhum pombo neste pombal</div>
              :<div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {pombosDoPombal(pombalDetalhe).map(p=>(
                    <div key={p.id} onClick={()=>setPomboDetalhe(p)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#101F40', borderRadius:12, cursor:'pointer', border:'1px solid #1B2D52', transition:'border-color .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='#2DD4A7'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='#1B2D52'}>
                      <div style={{ width:40, height:40, borderRadius:10, background:'#0B1830', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, overflow:'hidden', flexShrink:0 }}>
                        {p.foto_url?<img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />:p.emoji||'🐦'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</div>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#7A8699' }}>{p.anilha}</div>
                      </div>
                      {p.cacifo&&<div style={{ fontSize:11, color:'#D4AF37' }}>#{p.cacifo}</div>}
                      <div style={{ fontSize:12, color:'#94a3b8' }}>{p.sexo==='M'?'♂':'♀'}</div>
                      <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:'#2DD4A7' }}>{p.percentil||0}%</div>
                      <span style={{ color:'#475569', fontSize:16 }}>›</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </Modal>

      {/* ══ CONFIRM ═══════════════════════════════════════════════════════════ */}
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar pombal"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar "{confirm?.nome}"? Os pombos não serão apagados mas ficarão sem pombal atribuído.</p>
      </Modal>
    </div>
  )
}
