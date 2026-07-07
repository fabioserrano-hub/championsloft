import { useState, useEffect, useCallback } from 'react'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'
import { db, supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIdioma } from '../hooks/useIdioma'
import { useToast, Spinner, Modal, EmptyState, Field } from '../components/ui'

// ── constantes ────────────────────────────────────────────────────────────────
const CATS_DESPESA = ['Alimentação','Veterinário','Medicamentos','Provas/Inscrições','Transporte','Equipamento','Manutenção Pombal','Aquisição de Pombos','Federação/Clube','Outros']
const CATS_RECEITA = ['Venda de Pombos','Prémios','Cedências','Serviço de Criação','Outros']
const CAT_ICON = { 'Alimentação':'🌾','Veterinário':'🏥','Medicamentos':'💊','Provas/Inscrições':'🏆','Transporte':'🚚','Equipamento':'🔧','Manutenção Pombal':'🏠','Aquisição de Pombos':'🐦','Federação/Clube':'🏛️','Venda de Pombos':'💰','Prémios':'🥇','Cedências':'🤝','Serviço de Criação':'🧬','Outros':'📦' }
const CAT_COR = { 'Alimentação':'#F59E0B','Veterinário':'#f87171','Medicamentos':'#EF4444','Provas/Inscrições':'#D4AF37','Transporte':'#60A5FA','Equipamento':'#8B5CF6','Manutenção Pombal':'#10B981','Aquisição de Pombos':'#EC4899','Federação/Clube':'#6366F1','Venda de Pombos':'#2DD4A7','Prémios':'#D4AF37','Cedências':'#4C8DFF','Serviço de Criação':'#A855F7','Outros':'#6B7280' }
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const EMPTY = { tipo:'despesa', cat:'Alimentação', val:'', data_reg:new Date().toISOString().slice(0,10), desc:'', pombo_id:'', fornecedor:'', anexo_url:'' }
const ORCAMENTO_DEFAULT = { 'Alimentação':300,'Veterinário':150,'Medicamentos':100,'Provas/Inscrições':200,'Transporte':100,'Equipamento':50,'Manutenção Pombal':80,'Aquisição de Pombos':0,'Federação/Clube':60,'Outros':50 }

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (v, dec=0) => v?.toFixed(dec) ?? '0'
const fmtEur = (v, dec=2) => `${v>=0?'+':''}${fmt(Math.abs(v),dec)}€`

function MiniBarChart({ data, height=48 }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => Math.max(d.rec||0, d.dep||0)), 1)
  return (
    <div style={{ display:'flex', gap:3, alignItems:'flex-end', height }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', gap:1, alignItems:'stretch', height:'100%', justifyContent:'flex-end' }}>
          <div style={{ background:'rgba(45,212,167,.5)', borderRadius:'2px 2px 0 0', height:`${((d.rec||0)/max)*100}%`, minHeight:d.rec>0?2:0 }} />
          <div style={{ background:'rgba(248,113,113,.5)', borderRadius:'2px 2px 0 0', height:`${((d.dep||0)/max)*100}%`, minHeight:d.dep>0?2:0 }} />
        </div>
      ))}
    </div>
  )
}

function PieChart({ data, size=120 }) {
  if (!data || data.length === 0) return null
  const total = data.reduce((s,d) => s+d.val, 0)
  if (total === 0) return null
  let angle = -90
  const cx = size/2, cy = size/2, r = size/2 - 4
  const slices = data.map(d => {
    const pct = d.val / total
    const a1 = angle, a2 = angle + pct * 360
    angle = a2
    const x1 = cx + r * Math.cos(a1*Math.PI/180), y1 = cy + r * Math.sin(a1*Math.PI/180)
    const x2 = cx + r * Math.cos(a2*Math.PI/180), y2 = cy + r * Math.sin(a2*Math.PI/180)
    const large = pct > 0.5 ? 1 : 0
    return { ...d, path:`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`, pct }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s,i) => <path key={i} d={s.path} fill={s.cor} opacity={.85} />)}
      <circle cx={cx} cy={cy} r={r*0.55} fill="#0B1830" />
    </svg>
  )
}

function Semaforo({ pct }) {
  const cor = pct >= 100 ? '#f87171' : pct >= 80 ? '#D4AF37' : '#2DD4A7'
  const icon = pct >= 100 ? '🔴' : pct >= 80 ? '🟡' : '🟢'
  return <span style={{ fontSize:12 }}>{icon}</span>
}

// ── componente principal ──────────────────────────────────────────────────────
export default function Financas({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()
  const { user } = useAuth()

  const [lista, setLista]       = useState([])
  const [pombos, setPombos]     = useState([])
  const [provas, setProvas]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('dashboard')
  const [modal, setModal]       = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [confirm, setConfirm]   = useState(null)
  const [periodo, setPeriodo]   = useState('ano')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroCat, setFiltroCat]   = useState('todas')
  const [orcamentos, setOrcamentos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cl_orcamentos') || 'null') || ORCAMENTO_DEFAULT }
    catch { return ORCAMENTO_DEFAULT }
  })
  const [modalOrc, setModalOrc] = useState(false)
  const [orcForm, setOrcForm]   = useState(orcamentos)
  const [form, setForm]         = useState(EMPTY)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [f,p,pv] = await Promise.all([db.getFinancas(), db.getPombos(), db.getProvas().catch(()=>[])])
      setLista(f); setPombos(p); setProvas(pv)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])
  useEffect(()=>{ load() },[load])

  // ── filtros ───────────────────────────────────────────────────────────────
  const agora = new Date()
  const anoAtual = agora.getFullYear()
  const mesAtual = agora.getMonth()

  const filtrarPeriodo = item => {
    const d = new Date(item.data_reg)
    if (periodo==='mes') return d.getMonth()===mesAtual && d.getFullYear()===anoAtual
    if (periodo==='ano') return d.getFullYear()===anoAtual
    return true
  }

  const filtered = lista.filter(item =>
    filtrarPeriodo(item) &&
    (filtroTipo==='todos' || item.tipo===filtroTipo) &&
    (filtroCat==='todas' || item.cat===filtroCat)
  ).sort((a,b)=>new Date(b.data_reg)-new Date(a.data_reg))

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const rec = filtered.filter(x=>x.tipo==='receita').reduce((s,x)=>s+x.val,0)
  const dep = filtered.filter(x=>x.tipo==='despesa').reduce((s,x)=>s+x.val,0)
  const saldo = rec - dep

  // mês anterior para tendência
  const mesAnt = lista.filter(x=>{
    const d=new Date(x.data_reg)
    const ma = mesAtual===0?11:mesAtual-1
    const aa = mesAtual===0?anoAtual-1:anoAtual
    return d.getMonth()===ma&&d.getFullYear()===aa
  })
  const recAnt = mesAnt.filter(x=>x.tipo==='receita').reduce((s,x)=>s+x.val,0)
  const depAnt = mesAnt.filter(x=>x.tipo==='despesa').reduce((s,x)=>s+x.val,0)
  const saldoAnt = recAnt-depAnt

  // ── mensal para gráfico ───────────────────────────────────────────────────
  const dadosMensais = MESES.map((_,m)=>{
    const items = lista.filter(x=>new Date(x.data_reg).getFullYear()===anoAtual&&new Date(x.data_reg).getMonth()===m)
    return { rec:items.filter(x=>x.tipo==='receita').reduce((s,x)=>s+x.val,0), dep:items.filter(x=>x.tipo==='despesa').reduce((s,x)=>s+x.val,0) }
  })

  // ── por categoria ─────────────────────────────────────────────────────────
  const porCat = {}
  filtered.filter(x=>x.tipo==='despesa').forEach(x=>{ porCat[x.cat]=(porCat[x.cat]||0)+x.val })
  const topCats = Object.entries(porCat).sort((a,b)=>b[1]-a[1])
  const maxCat = topCats[0]?.[1]||1
  const pieDep = topCats.slice(0,6).map(([cat,val])=>({ cat, val, cor:CAT_COR[cat]||'#6B7280' }))

  // ── orçamento ─────────────────────────────────────────────────────────────
  const depMes = {}
  lista.filter(x=>x.tipo==='despesa'&&new Date(x.data_reg).getMonth()===mesAtual&&new Date(x.data_reg).getFullYear()===anoAtual)
    .forEach(x=>{ depMes[x.cat]=(depMes[x.cat]||0)+x.val })
  const alertasOrc = Object.entries(orcamentos).filter(([cat,orc])=>orc>0&&(depMes[cat]||0)/orc>=0.8)

  // ── custo por pombo ───────────────────────────────────────────────────────
  const custoPombo = {}
  filtered.filter(x=>x.tipo==='despesa'&&x.pombo_id).forEach(x=>{
    custoPombo[x.pombo_id]=(custoPombo[x.pombo_id]||0)+x.val
  })
  // também por menção na descrição
  filtered.filter(x=>x.tipo==='despesa'&&x.desc&&!x.pombo_id).forEach(x=>{
    pombos.forEach(p=>{ if(p.nome&&x.desc.toLowerCase().includes(p.nome.toLowerCase())) custoPombo[p.id]=(custoPombo[p.id]||0)+x.val })
  })
  const topCustoPombo = Object.entries(custoPombo).map(([id,val])=>({ pombo:pombos.find(p=>p.id===id), val })).filter(x=>x.pombo).sort((a,b)=>b.val-a.val).slice(0,5)

  // ── receita por pombo (vendas) ────────────────────────────────────────────
  const receitaPombo = {}
  filtered.filter(x=>x.tipo==='receita'&&x.pombo_id).forEach(x=>{ receitaPombo[x.pombo_id]=(receitaPombo[x.pombo_id]||0)+x.val })

  // ROI por pombo
  const roiPombos = Object.keys({...custoPombo,...receitaPombo}).map(id=>({
    pombo: pombos.find(p=>p.id===id),
    custo: custoPombo[id]||0,
    receita: receitaPombo[id]||0,
    roi: (receitaPombo[id]||0)-(custoPombo[id]||0)
  })).filter(x=>x.pombo).sort((a,b)=>b.roi-a.roi)

  // ── custo por km ─────────────────────────────────────────────────────────
  const kmTotal = lista.filter(x=>x.tipo==='receita'||x.tipo==='despesa').length > 0
    ? provas.filter(p=>new Date(p.data_reg).getFullYear()===anoAtual).reduce((s,p)=>s+(p.dist||0),0)
    : 0
  const custoPorKm = kmTotal>0 ? dep/kmTotal : null

  // ── projecção anual ───────────────────────────────────────────────────────
  const mesesPassados = mesAtual+1
  const projecaoDep = mesesPassados>0 ? (dep/mesesPassados)*12 : 0
  const projecaoRec = mesesPassados>0 ? (rec/mesesPassados)*12 : 0

  // ── ano anterior ──────────────────────────────────────────────────────────
  const anoAnt = lista.filter(x=>new Date(x.data_reg).getFullYear()===anoAtual-1)
  const depAnoAnt = anoAnt.filter(x=>x.tipo==='despesa').reduce((s,x)=>s+x.val,0)
  const recAnoAnt = anoAnt.filter(x=>x.tipo==='receita').reduce((s,x)=>s+x.val,0)

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true) }
  const openEdit = item => { setSelected(item); setForm({ tipo:item.tipo, cat:item.cat||'', val:String(item.val||''), data_reg:item.data_reg?.slice(0,10)||'', desc:item.desc||'', pombo_id:item.pombo_id||'', fornecedor:item.fornecedor||'', anexo_url:item.anexo_url||'' }); setModal(true) }
  const close = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if (!form.val||parseFloat(form.val)<=0){toast('Valor obrigatório','warn');return}
    setSaving(true)
    try {
      const payload = { tipo:form.tipo, cat:form.cat, val:parseFloat(form.val), data_reg:form.data_reg, desc:form.desc, pombo_id:form.pombo_id||null, fornecedor:form.fornecedor||null }
      selected ? await db.updateFinanca(selected.id,payload) : await db.createFinanca(payload)
      toast(selected?'Actualizado!':'Registado!','ok'); close(); load()
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setSaving(false)}
  }

  const del = async () => {
    try{await db.deleteFinanca(confirm.id);toast('Eliminado','ok');setConfirm(null);load()}
    catch(e){toast('Erro: '+e.message,'err')}
  }

  const guardarOrcamentos = () => {
    localStorage.setItem('cl_orcamentos',JSON.stringify(orcForm))
    setOrcamentos(orcForm); setModalOrc(false); toast('Orçamentos guardados!','ok')
  }

  // ── render ────────────────────────────────────────────────────────────────
  const TABS = [['dashboard','📊 Dashboard'],['movimentos','📋 Movimentos'],['analise','🔬 Análise'],['orcamento','🎯 Orçamento']]

  return (
    <div>
      <GuiaAuto modulo="financas"/>
      <div className="section-header">
        <div><div className="section-title">Finanças</div><div className="section-sub">{lista.length} movimentos · {anoAtual}</div></div>
        <BotaoGuia modulo="financas"/> <button className="btn btn-primary" onClick={openNew}>＋ Novo</button>
      </div>

      {/* tabs */}
      <div style={{ display:'flex', gap:4, background:'#101F40', borderRadius:8, padding:4, marginBottom:16, overflowX:'auto' }}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:'8px 10px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tab===k?'#1E5FD9':'none', color:tab===k?'#fff':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {/* filtros de período (global) */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:4, background:'#101F40', borderRadius:8, padding:3 }}>
          {[['mes','Mês'],['ano','Ano'],['todos','Tudo']].map(([p,l])=>(
            <button key={p} onClick={()=>setPeriodo(p)} style={{ padding:'5px 12px', borderRadius:5, fontSize:11, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:periodo===p?'#1E5FD9':'none', color:periodo===p?'#fff':'#94a3b8' }}>{l}</button>
          ))}
        </div>
        <div style={{ fontSize:11, color:'#475569', alignSelf:'center' }}>
          {periodo==='mes'?MESES_FULL[mesAtual]+' '+anoAtual:periodo==='ano'?String(anoAtual):'Histórico completo'}
        </div>
      </div>

      {/* alertas de orçamento */}
      {alertasOrc.length>0&&(
        <div style={{ background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)', borderRadius:12, padding:'10px 14px', marginBottom:14 }}>
          <div style={{ fontWeight:600, color:'#f87171', marginBottom:6, fontSize:12 }}>⚠️ {alertasOrc.length} categoria(s) a atingir o orçamento este mês</div>
          {alertasOrc.map(([cat,orc])=>{
            const gasto=depMes[cat]||0; const pct=Math.round(gasto/orc*100)
            return <div key={cat} style={{ fontSize:11, color:'#cbd5e1', marginBottom:2 }}><Semaforo pct={pct}/> {CAT_ICON[cat]} {cat} — {fmt(gasto)}€ / {orc}€ ({pct}%)</div>
          })}
        </div>
      )}

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div> : (

      <>
      {/* ══ DASHBOARD ═══════════════════════════════════════════════════════ */}
      {tab==='dashboard'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* KPIs hero */}
          <div style={{ background:'linear-gradient(135deg,#0B1830,#0D1F3C)', border:'1px solid #1B2D52', borderRadius:14, padding:'16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
              {[
                { label:'Receitas', val:rec, cor:'#2DD4A7', icon:'💰', tendencia:periodo==='mes'?(rec-recAnt):null },
                { label:'Despesas', val:dep, cor:'#f87171', icon:'💸', tendencia:periodo==='mes'?(dep-depAnt):null },
                { label:'Saldo', val:saldo, cor:saldo>=0?'#2DD4A7':'#f87171', icon:saldo>=0?'📈':'📉', tendencia:periodo==='mes'?(saldo-saldoAnt):null },
              ].map(({label,val,cor,icon,tendencia})=>(
                <div key={label} style={{ textAlign:'center', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:40, height:2, background:cor, borderRadius:1 }} />
                  <div style={{ fontSize:18, marginBottom:4, paddingTop:8 }}>{icon}</div>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:cor, lineHeight:1 }}>{fmt(Math.abs(val))}€</div>
                  <div style={{ fontSize:9, color:'#7A8699', textTransform:'uppercase', letterSpacing:.5, marginTop:3 }}>{label}</div>
                  {tendencia!==null&&tendencia!==undefined&&<div style={{ fontSize:9, color:tendencia>0?cor==='#f87171'?'#f87171':'#2DD4A7':'#7A8699', marginTop:2 }}>{tendencia>0?'↑':'↓'}{fmt(Math.abs(tendencia))}€ vs mês ant.</div>}
                </div>
              ))}
            </div>

            {/* gráfico barras mensais */}
            <div>
              <div style={{ fontSize:10, color:'#475569', marginBottom:6, display:'flex', justifyContent:'space-between' }}>
                <span>Evolução {anoAtual}</span>
                <div style={{ display:'flex', gap:8 }}>
                  <span style={{ color:'rgba(45,212,167,.6)' }}>■ Receitas</span>
                  <span style={{ color:'rgba(248,113,113,.6)' }}>■ Despesas</span>
                </div>
              </div>
              <MiniBarChart data={dadosMensais} height={52} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:8, color:'#334155', marginTop:4 }}>
                {MESES.map(m=><span key={m}>{m}</span>)}
              </div>
            </div>
          </div>

          {/* métricas únicas */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {/* custo por km */}
            <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:10, color:'#7A8699', marginBottom:4 }}>📍 Custo por km voado</div>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:900, color:'#A855F7' }}>{custoPorKm?fmt(custoPorKm,2)+'€':'—'}</div>
              <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>{kmTotal>0?kmTotal+'km provas '+anoAtual:'Sem provas com km'}</div>
            </div>
            {/* projecção */}
            <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:10, color:'#7A8699', marginBottom:4 }}>🔮 Projecção anual</div>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:'#D4AF37' }}>{fmt(projecaoDep)}€</div>
              <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>despesas · baseado em {mesesPassados} mes(es)</div>
            </div>
            {/* comparação ano anterior */}
            {depAnoAnt>0&&(
              <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:12, padding:'12px 14px' }}>
                <div style={{ fontSize:10, color:'#7A8699', marginBottom:4 }}>📅 vs {anoAtual-1}</div>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:dep<depAnoAnt?'#2DD4A7':'#f87171' }}>{dep<depAnoAnt?'↓':'↑'}{fmt(Math.abs(dep-depAnoAnt))}€</div>
                <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>despesas ({fmt(depAnoAnt)}€ em {anoAtual-1})</div>
              </div>
            )}
            {/* break-even */}
            <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:10, color:'#7A8699', marginBottom:4 }}>⚖️ Break-even</div>
              {dep>0&&pombos.length>0 ? (
                <>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:'#4C8DFF' }}>{fmt(dep/pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio').length)}€</div>
                  <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>custo médio por pombo no efectivo</div>
                </>
              ) : <div style={{ fontSize:12, color:'#475569' }}>—</div>}
            </div>
          </div>

          {/* top categorias com pizza */}
          {pieDep.length>0&&(
            <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ fontWeight:700, color:'#fff', marginBottom:12, fontSize:13 }}>💸 Despesas por Categoria</div>
              <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
                <PieChart data={pieDep} size={110} />
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                  {topCats.slice(0,5).map(([cat,val])=>{
                    const pct=Math.round(val/dep*100); const cor=CAT_COR[cat]||'#6B7280'
                    return (
                      <div key={cat}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
                          <span style={{ color:'#cbd5e1' }}>{CAT_ICON[cat]} {cat}</span>
                          <div style={{ display:'flex', gap:6 }}>
                            <span style={{ color:'#7A8699' }}>{pct}%</span>
                            <span style={{ color:cor, fontWeight:700 }}>{fmt(val)}€</span>
                          </div>
                        </div>
                        <div style={{ height:3, background:'#1B2D52', borderRadius:2 }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:cor, borderRadius:2 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* custo por pombo */}
          {topCustoPombo.length>0&&(
            <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ fontWeight:700, color:'#fff', marginBottom:12, fontSize:13 }}>🐦 Custo por Pombo</div>
              {topCustoPombo.map(({pombo,val})=>(
                <div key={pombo.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #1B2D52' }}>
                  <span style={{ fontSize:16 }}>{pombo.emoji||'🐦'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:'#fff', fontWeight:500 }}>{pombo.nome}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#7A8699' }}>{pombo.anilha}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:13, color:'#f87171', fontWeight:700 }}>{fmt(val)}€</div>
                    {receitaPombo[pombo.id]>0&&<div style={{ fontSize:10, color:'#2DD4A7' }}>+{fmt(receitaPombo[pombo.id])}€ receita</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ══ MOVIMENTOS ══════════════════════════════════════════════════════ */}
      {tab==='movimentos'&&(
        <div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
            {['todos','receita','despesa'].map(tp=>(
              <button key={tp} onClick={()=>setFiltroTipo(tp)} className={`chip${filtroTipo===tp?' active':''}`} style={{ fontSize:11 }}>
                {tp==='todos'?'Todos':tp==='receita'?'💰 Receitas':'💸 Despesas'}
              </button>
            ))}
            <select value={filtroCat} onChange={e=>setFiltroCat(e.target.value)} className="input" style={{ fontSize:11, padding:'4px 8px', borderRadius:20, maxWidth:180 }}>
              <option value="todas">Todas as categorias</option>
              {[...CATS_DESPESA,...CATS_RECEITA].map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {filtered.length===0
            ?<EmptyState icon="💰" title="Sem movimentos" desc="Registe receitas e despesas" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Movimento</button>} />
            :<div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {filtered.map(item=>{
                  const cor = item.tipo==='receita'?'#2DD4A7':'#f87171'
                  const pombo = item.pombo_id ? pombos.find(p=>p.id===item.pombo_id) : null
                  return (
                    <div key={item.id} style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:8, background:`${cor}15`, border:`1px solid ${cor}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                        {CAT_ICON[item.cat]||'📦'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{item.cat}</div>
                        <div style={{ fontSize:11, color:'#7A8699', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {item.desc||'—'}{pombo?` · 🐦 ${pombo.nome}`:''}
                          {item.fornecedor?` · ${item.fornecedor}`:''}
                        </div>
                        <div style={{ fontSize:10, color:'#475569' }}>{new Date(item.data_reg).toLocaleDateString('pt-PT')}</div>
                      </div>
                      <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:700, color:cor, flexShrink:0 }}>
                        {item.tipo==='receita'?'+':'-'}{fmt(item.val,2)}€
                      </div>
                      <button className="btn btn-icon btn-sm" onClick={()=>openEdit(item)}>✏️</button>
                      <button className="btn btn-icon btn-sm" onClick={()=>setConfirm(item)}>🗑️</button>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      )}

      {/* ══ ANÁLISE ════════════════════════════════════════════════════════ */}
      {tab==='analise'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* ROI por pombo */}
          {roiPombos.length>0&&(
            <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ fontWeight:700, color:'#fff', marginBottom:4, fontSize:13 }}>📈 ROI por Pombo</div>
              <div style={{ fontSize:11, color:'#7A8699', marginBottom:12 }}>Receitas - Custos associados a cada pombo</div>
              {roiPombos.map(({pombo,custo,receita,roi})=>(
                <div key={pombo.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #1B2D52' }}>
                  <span style={{ fontSize:16 }}>{pombo.emoji||'🐦'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:'#fff', fontWeight:600 }}>{pombo.nome}</div>
                    <div style={{ fontSize:10, color:'#7A8699' }}>Custo: {fmt(custo)}€{receita>0?` · Receita: ${fmt(receita)}€`:''}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:roi>=0?'#2DD4A7':'#f87171' }}>{roi>=0?'+':''}{fmt(roi)}€</div>
                    <div style={{ fontSize:9, color:'#475569' }}>ROI</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* evolução mensal detalhada */}
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
            <div style={{ fontWeight:700, color:'#fff', marginBottom:12, fontSize:13 }}>📅 Evolução Mensal {anoAtual}</div>
            {dadosMensais.map((d,m)=>{
              if(d.rec===0&&d.dep===0) return null
              const saldoM = d.rec-d.dep
              return (
                <div key={m} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #1B2D52', fontSize:12 }}>
                  <div style={{ width:28, color:'#7A8699', fontSize:11 }}>{MESES[m]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8 }}>
                      {d.rec>0&&<span style={{ color:'#2DD4A7' }}>+{fmt(d.rec)}€</span>}
                      {d.dep>0&&<span style={{ color:'#f87171' }}>-{fmt(d.dep)}€</span>}
                    </div>
                  </div>
                  <div style={{ fontWeight:700, color:saldoM>=0?'#2DD4A7':'#f87171' }}>{saldoM>=0?'+':''}{fmt(saldoM)}€</div>
                </div>
              )
            }).filter(Boolean)}
            {dadosMensais.every(d=>d.rec===0&&d.dep===0)&&<div style={{ textAlign:'center', color:'#475569', padding:'16px 0', fontSize:13 }}>Sem dados para {anoAtual}</div>}
          </div>

          {/* métricas avançadas */}
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
            <div style={{ fontWeight:700, color:'#fff', marginBottom:12, fontSize:13 }}>🔬 Métricas Avançadas</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { label:'Custo por km voado', val:custoPorKm?fmt(custoPorKm,2)+'€/km':'—', cor:'#A855F7', desc:'Despesas totais ÷ km de provas' },
                { label:'Custo médio/pombo', val:pombos.length>0?fmt(dep/pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio').length)+'€':'—', cor:'#4C8DFF', desc:'Despesas ÷ efectivo activo' },
                { label:'Projecção anual despesas', val:fmt(projecaoDep)+'€', cor:'#D4AF37', desc:`Baseado em ${mesesPassados} mes(es) de dados` },
                { label:'Projecção anual receitas', val:fmt(projecaoRec)+'€', cor:'#2DD4A7', desc:`Baseado em ${mesesPassados} mes(es) de dados` },
                { label:'Taxa de cobertura', val:dep>0?fmt((rec/dep)*100,0)+'%':'—', cor:rec>=dep?'#2DD4A7':'#f87171', desc:'Receitas / Despesas × 100' },
              ].map(({label,val,cor,desc})=>(
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #162040' }}>
                  <div>
                    <div style={{ fontSize:12, color:'#cbd5e1', fontWeight:500 }}>{label}</div>
                    <div style={{ fontSize:10, color:'#475569' }}>{desc}</div>
                  </div>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:cor }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* top categorias detalhado */}
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
            <div style={{ fontWeight:700, color:'#fff', marginBottom:12, fontSize:13 }}>📊 Categorias Detalhadas</div>
            {topCats.length===0?<div style={{ textAlign:'center', color:'#475569', padding:'12px 0', fontSize:13 }}>Sem despesas no período</div>
            :topCats.map(([cat,val])=>{
              const pct=Math.round(val/dep*100); const cor=CAT_COR[cat]||'#6B7280'
              const orcCat=orcamentos[cat]
              return (
                <div key={cat} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                    <span style={{ color:'#cbd5e1' }}>{CAT_ICON[cat]} {cat}</span>
                    <div style={{ display:'flex', gap:8 }}>
                      <span style={{ color:'#7A8699' }}>{pct}%</span>
                      <span style={{ color:cor, fontWeight:700 }}>{fmt(val)}€</span>
                      {orcCat>0&&<span style={{ color:'#475569' }}>/ {orcCat}€</span>}
                    </div>
                  </div>
                  <div style={{ height:4, background:'#1B2D52', borderRadius:2 }}>
                    <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:cor, borderRadius:2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ ORÇAMENTO ══════════════════════════════════════════════════════ */}
      {tab==='orcamento'&&(
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontSize:12, color:'#7A8699' }}>Limites mensais por categoria de despesa</div>
            <button className="btn btn-secondary btn-sm" onClick={()=>{setOrcForm(orcamentos);setModalOrc(true)}}>✏️ Editar</button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Object.entries(orcamentos).filter(([,v])=>v>0).map(([cat,orc])=>{
              const gasto=depMes[cat]||0; const pct=Math.round(gasto/orc*100)
              const cor=pct>=100?'#f87171':pct>=80?'#D4AF37':'#2DD4A7'
              return (
                <div key={cat} style={{ background:'#0B1830', border:`1px solid ${pct>=100?'rgba(248,113,113,.3)':pct>=80?'rgba(212,175,55,.2)':'#1B2D52'}`, borderRadius:12, padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <Semaforo pct={pct} />
                      <span style={{ fontSize:13, color:'#fff', fontWeight:500 }}>{CAT_ICON[cat]} {cat}</span>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:cor }}>{fmt(gasto)}€ <span style={{ color:'#475569', fontWeight:400, fontSize:11 }}>/ {orc}€</span></div>
                      <div style={{ fontSize:10, color:'#475569' }}>{pct}% do orçamento</div>
                    </div>
                  </div>
                  <div style={{ height:6, background:'#1B2D52', borderRadius:3 }}>
                    <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:cor, borderRadius:3, transition:'width .3s' }} />
                  </div>
                  {pct>=100&&<div style={{ fontSize:10, color:'#f87171', marginTop:4 }}>⚠️ Orçamento excedido em {fmt(gasto-orc)}€</div>}
                  {pct>=80&&pct<100&&<div style={{ fontSize:10, color:'#D4AF37', marginTop:4 }}>Faltam {fmt(orc-gasto)}€ para atingir o limite</div>}
                </div>
              )
            })}
          </div>

          {/* resumo mensal */}
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:12, padding:'12px 14px', marginTop:14 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>Resumo — {MESES_FULL[mesAtual]}</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
              <span style={{ color:'#7A8699' }}>Total orçamentado</span>
              <span style={{ color:'#fff', fontWeight:600 }}>{Object.values(orcamentos).reduce((s,v)=>s+v,0)}€</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginTop:4 }}>
              <span style={{ color:'#7A8699' }}>Total gasto</span>
              <span style={{ color:'#f87171', fontWeight:600 }}>{fmt(Object.values(depMes).reduce((s,v)=>s+v,0))}€</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginTop:4 }}>
              <span style={{ color:'#7A8699' }}>Disponível</span>
              <span style={{ color:'#2DD4A7', fontWeight:600 }}>{fmt(Object.entries(orcamentos).reduce((s,[cat,orc])=>s+orc-(depMes[cat]||0),0))}€</span>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* ══ MODAL NOVO MOVIMENTO ════════════════════════════════════════════ */}
      <Modal open={modal} onClose={close} title={selected?'✏️ Editar Movimento':'💰 Novo Movimento'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}{selected?t('guardar'):'Registar'}</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* tipo */}
          <div style={{ display:'flex', gap:8 }}>
            {['despesa','receita'].map(tp=>(
              <button key={tp} type="button" onClick={()=>sf('tipo',tp)}
                style={{ flex:1, padding:'10px', borderRadius:8, border:form.tipo===tp?`1px solid ${tp==='receita'?'#2DD4A7':'#f87171'}`:'1px solid #1B2D52', background:form.tipo===tp?(tp==='receita'?'rgba(45,212,167,.08)':'rgba(239,68,68,.08)'):'#101F40', color:form.tipo===tp?(tp==='receita'?'#2DD4A7':'#f87171'):'#94a3b8', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                {tp==='receita'?'💰 Receita':'💸 Despesa'}
              </button>
            ))}
          </div>

          {/* categoria */}
          <Field label="Categoria">
            <select className="input" value={form.cat} onChange={e=>sf('cat',e.target.value)}>
              {(form.tipo==='despesa'?CATS_DESPESA:CATS_RECEITA).map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>

          {/* valor e data */}
          <div className="form-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
            <Field label="Valor (€) *"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.val} onChange={e=>sf('val',e.target.value)} /></Field>
            <Field label="Data"><input className="input" type="date" value={form.data_reg} onChange={e=>sf('data_reg',e.target.value)} /></Field>
          </div>

          {/* descrição */}
          <Field label="Descrição"><input className="input" placeholder="Notas sobre este movimento..." value={form.desc} onChange={e=>sf('desc',e.target.value)} /></Field>

          {/* associar pombo */}
          <Field label="🐦 Associar a Pombo (opcional)">
            <select className="input" value={form.pombo_id} onChange={e=>sf('pombo_id',e.target.value)}>
              <option value="">— Nenhum —</option>
              {pombos.map(p=><option key={p.id} value={p.id}>{p.emoji||'🐦'} {p.nome} ({p.anilha})</option>)}
            </select>
            <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>Permite calcular custo/ROI por pombo automaticamente</div>
          </Field>

          {/* fornecedor */}
          <Field label="Fornecedor (opcional)"><input className="input" placeholder="Ex: Loja Colombofilia Lisboa" value={form.fornecedor} onChange={e=>sf('fornecedor',e.target.value)} /></Field>
        </div>
      </Modal>

      {/* ══ MODAL ORÇAMENTOS ════════════════════════════════════════════════ */}
      <Modal open={modalOrc} onClose={()=>setModalOrc(false)} title="🎯 Definir Orçamentos Mensais" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalOrc(false)}>Cancelar</button><button className="btn btn-primary" onClick={guardarOrcamentos}>Guardar</button></>}>
        <div style={{ fontSize:11, color:'#7A8699', marginBottom:12 }}>Define o limite mensal de despesas por categoria. Receberás alerta quando atingires 80%.</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {CATS_DESPESA.map(cat=>(
            <div key={cat} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ width:24, textAlign:'center' }}>{CAT_ICON[cat]}</span>
              <span style={{ flex:1, fontSize:12, color:'#cbd5e1' }}>{cat}</span>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <input type="number" className="input" style={{ width:80, textAlign:'right' }} value={orcForm[cat]||0} onChange={e=>setOrcForm(f=>({...f,[cat]:parseFloat(e.target.value)||0}))} />
                <span style={{ fontSize:11, color:'#7A8699' }}>€/mês</span>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* ══ CONFIRM ═════════════════════════════════════════════════════════ */}
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar movimento"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar este movimento de {confirm?.val?.toFixed(2)}€?</p>
      </Modal>
    </div>
  )
}
