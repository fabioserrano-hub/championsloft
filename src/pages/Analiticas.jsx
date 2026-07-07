import { useState, useEffect, useCallback } from 'react'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'
import { supabase, db } from '../lib/supabase'
import { useToast, Spinner, EmptyState } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'

// ── constantes ────────────────────────────────────────────────────────────────
const ESP_COR  = { velocidade:'#F59E0B', 'meio-fundo':'#3B82F6', fundo:'#10B981', 'grande-fundo':'#8B5CF6', meio_fundo:'#3B82F6', grande_fundo:'#8B5CF6' }
const ESP_ICON = { velocidade:'⚡', 'meio-fundo':'🎯', fundo:'🏔️', 'grande-fundo':'🌍', meio_fundo:'🎯', grande_fundo:'🌍' }
const MESES    = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ── sub-componentes ───────────────────────────────────────────────────────────
function BarraH({ label, valor, max, cor, sufixo='' }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor/max)*100)) : 0
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
        <span style={{ color:'#cbd5e1' }}>{label}</span>
        <span style={{ color:cor, fontWeight:600 }}>{valor}{sufixo}</span>
      </div>
      <div style={{ height:6, background:'#101F40', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:cor, borderRadius:3, transition:'width .5s' }} />
      </div>
    </div>
  )
}

function MiniLineChart({ dados, cor='#D4AF37' }) {
  if (!dados?.length || dados.length < 2) return null
  const vals = dados.map(d=>d.v)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const W = 300, H = 60, pad = 8
  const pts = dados.map((d,i) => {
    const x = pad + (i/(dados.length-1))*(W-pad*2)
    const y = H - pad - ((d.v-min)/range)*(H-pad*2)
    return [x,y]
  })
  const path = pts.map((p,i)=>`${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${path} L${pts[pts.length-1][0]},${H-pad} L${pts[0][0]},${H-pad} Z`
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H, display:'block' }}>
        <defs><linearGradient id={`lg${cor.replace('#','')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cor} stopOpacity=".2"/><stop offset="100%" stopColor={cor} stopOpacity="0"/></linearGradient></defs>
        <path d={area} fill={`url(#lg${cor.replace('#','')})`} />
        <path d={path} fill="none" stroke={cor} strokeWidth="2" />
        {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r={3} fill={cor} />)}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#475569', marginTop:2 }}>
        {dados.map((d,i)=><span key={i}>{d.l}</span>)}
      </div>
    </div>
  )
}

function MiniBarChart({ dados, cor='#4C8DFF' }) {
  if (!dados?.length) return null
  const max = Math.max(...dados.map(d=>Math.abs(d.v)), 1)
  const H = 52
  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:H }}>
        {dados.map((d,i)=>{
          const h = Math.max((Math.abs(d.v)/max)*H, d.v===0?0:2)
          const c = typeof cor === 'function' ? cor(d,i) : cor
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end' }}>
              <div style={{ width:'100%', height:h, borderRadius:'2px 2px 0 0', background:c, transition:'height .3s' }} />
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:8, color:'#334155', marginTop:3 }}>
        {dados.map((d,i)=><span key={i}>{d.l}</span>)}
      </div>
    </div>
  )
}

function PieChart({ data, size=100 }) {
  if (!data?.length) return null
  const total = data.reduce((s,d)=>s+d.v,0)
  if (!total) return null
  let angle = -90
  const cx=size/2, cy=size/2, r=size/2-4
  const slices = data.map(d=>{
    const pct=d.v/total, a1=angle, a2=angle+pct*360; angle=a2
    const x1=cx+r*Math.cos(a1*Math.PI/180), y1=cy+r*Math.sin(a1*Math.PI/180)
    const x2=cx+r*Math.cos(a2*Math.PI/180), y2=cy+r*Math.sin(a2*Math.PI/180)
    return { ...d, path:`M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${pct>.5?1:0} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`, pct }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s,i)=><path key={i} d={s.path} fill={s.cor} opacity={.85}/>)}
      <circle cx={cx} cy={cy} r={r*.55} fill="#0B1830"/>
    </svg>
  )
}

// ── componente principal ──────────────────────────────────────────────────────
export default function Analiticas({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()
  const [loading, setLoading]       = useState(true)
  const [pombos, setPombos]         = useState([])
  const [provas, setProvas]         = useState([])
  const [financas, setFinancas]     = useState([])
  const [saude, setSaude]           = useState([])
  const [tab, setTab]               = useState('resumo')
  const [anoFiltro, setAnoFiltro]   = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, pv, f, s] = await Promise.all([
        db.getPombos(),
        db.getProvas(),
        db.getFinancas().catch(()=>[]),
        db.getSaude?.().catch(()=>[]) || Promise.resolve([]),
      ])
      setPombos(p); setProvas(pv); setFinancas(f); setSaude(s||[])
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [])
  useEffect(()=>{ load() },[load])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>

  // ── computed ────────────────────────────────────────────────────────────────
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth()
  const efectivo    = pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio')
  const provasAno   = provas.filter(p=>new Date(p.data_reg).getFullYear()===anoFiltro)
  const anos        = [...new Set(provas.map(p=>new Date(p.data_reg).getFullYear()))].sort((a,b)=>b-a)
  if (!anos.includes(anoAtual)) anos.unshift(anoAtual)

  // efectivo
  const porSexo    = { M:efectivo.filter(p=>p.sexo==='M').length, F:efectivo.filter(p=>p.sexo==='F').length }
  const porEsp     = {}; efectivo.forEach(p=>(p.esp||['velocidade']).forEach(e=>{ porEsp[e]=(porEsp[e]||0)+1 }))
  const porEstado  = { ativo:efectivo.filter(p=>p.estado==='ativo').length, inativo:efectivo.filter(p=>p.estado==='inativo').length }
  const top10      = [...efectivo].sort((a,b)=>(b.percentil||0)-(a.percentil||0)).slice(0,10)
  const aDispensar = efectivo.filter(p=>(p.provas||0)>=3&&(p.percentil||0)<25).sort((a,b)=>(a.percentil||0)-(b.percentil||0)).slice(0,5)
  const percentilMedioEf = efectivo.filter(p=>p.percentil>0).length > 0
    ? Math.round(efectivo.filter(p=>p.percentil>0).reduce((s,p)=>s+(p.percentil||0),0)/efectivo.filter(p=>p.percentil>0).length) : 0

  // provas
  const vitorias   = provasAno.filter(p=>p.posicao_geral===1).length
  const podios     = provasAno.filter(p=>p.posicao_geral&&p.posicao_geral<=3).length
  const kmTotal    = provasAno.reduce((s,p)=>s+(p.dist||0),0)
  const percentilMedioAnual = provasAno.filter(p=>p.percentil>0).length > 0
    ? Math.round(provasAno.filter(p=>p.percentil>0).reduce((s,p)=>s+(p.percentil||0),0)/provasAno.filter(p=>p.percentil>0).length) : 0
  const melhorProva = [...provasAno].filter(p=>p.posicao_geral).sort((a,b)=>a.posicao_geral-b.posicao_geral)[0]
  const porMes     = MESES.map((l,i)=>({ l, v:provasAno.filter(p=>new Date(p.data_reg).getMonth()===i).length }))
  const evolPercentil = provasAno.filter(p=>p.percentil>0).slice(-8).map(p=>({ l:MESES[new Date(p.data_reg).getMonth()], v:p.percentil||0 }))
  const rankingPombos = efectivo.filter(p=>(p.provas||0)>0).sort((a,b)=>(b.percentil||0)-(a.percentil||0))

  // finanças
  const finAno    = financas.filter(f=>new Date(f.data_reg).getFullYear()===anoFiltro)
  const recTotal  = finAno.filter(f=>f.tipo==='receita').reduce((s,f)=>s+f.val,0)
  const depTotal  = finAno.filter(f=>f.tipo==='despesa').reduce((s,f)=>s+f.val,0)
  const saldoTotal = recTotal - depTotal
  const finPorMes = MESES.map((l,i)=>{
    const items=finAno.filter(f=>new Date(f.data_reg).getMonth()===i)
    const rec=items.filter(f=>f.tipo==='receita').reduce((s,f)=>s+f.val,0)
    const dep=items.filter(f=>f.tipo==='despesa').reduce((s,f)=>s+f.val,0)
    return { l, v:rec-dep, rec, dep }
  })
  const saldoAcumulado = finPorMes.reduce((acc,m,i)=>{
    const prev = i>0?acc[i-1].v:0
    acc.push({ l:m.l, v:prev+m.v })
    return acc
  },[])
  const porCatDep = {}
  finAno.filter(f=>f.tipo==='despesa').forEach(f=>{ porCatDep[f.cat]=(porCatDep[f.cat]||0)+f.val })
  const pieDep = Object.entries(porCatDep).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([cat,v],i)=>({
    cat, v, cor:['#F59E0B','#f87171','#4C8DFF','#2DD4A7','#8B5CF6'][i]
  }))

  // saúde
  const aptosCount = saude.filter(s=>s.apt===true||s.aptidao==='apto').length
  const inaptoCount = saude.filter(s=>s.apt===false||s.aptidao==='inapto').length

  // faixas distância
  const faixas = [
    { label:'< 200km', min:0, max:199, cor:'#4C8DFF' },
    { label:'200-400km', min:200, max:399, cor:'#2DD4A7' },
    { label:'400-600km', min:400, max:599, cor:'#D4AF37' },
    { label:'600-800km', min:600, max:799, cor:'#fb923c' },
    { label:'> 800km', min:800, max:99999, cor:'#c084fc' },
  ]
  const dadosFaixas = faixas.map(f=>({
    ...f,
    total: provasAno.filter(p=>(p.dist||0)>=f.min&&(p.dist||0)<=f.max).length,
    vitorias: provasAno.filter(p=>(p.dist||0)>=f.min&&(p.dist||0)<=f.max&&p.posicao_geral===1).length,
    pctMedio: (()=>{ const ps=provasAno.filter(p=>(p.dist||0)>=f.min&&(p.dist||0)<=f.max&&p.percentil>0); return ps.length?Math.round(ps.reduce((s,p)=>s+p.percentil,0)/ps.length):0 })()
  }))
  const maxFaixa = Math.max(...dadosFaixas.map(f=>f.total),1)
  const melhorFaixa = dadosFaixas.filter(f=>f.total>0).sort((a,b)=>b.pctMedio-a.pctMedio)[0]
  const pontosScatter = provasAno.filter(p=>p.dist&&p.percentil).map(p=>({ dist:p.dist, perc:p.percentil, nome:p.nome }))
  const maxDist = Math.max(...pontosScatter.map(p=>p.dist),1)

  // benchmarks clube
  const vitoriasPct = provasAno.length ? Math.round((vitorias/provasAno.length)*100) : 0

  // ── render ──────────────────────────────────────────────────────────────────
  const TABS = [
    ['resumo','📋 Resumo'],
    ['efectivo','🐦 Efectivo'],
    ['provas','🏆 Provas'],
    ['comparativo','📈 Comparativo'],
    ['distancias','🗺️ Distâncias'],
    ['clube','🏛️ Clube'],
  ]

  return (
    <>
      <GuiaAuto modulo="analiticas"/>
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(76,141,255,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#1E5FD9,#2DD4A7)' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>📊 Analíticas</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>{efectivo.length} pombos · {provas.length} provas históricas</div>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}><BotaoGuia modulo="analiticas"/><select className="input" style={{ width:90 }} value={anoFiltro} onChange={e=>setAnoFiltro(Number(e.target.value))}>
            {anos.map(a=><option key={a} value={a}>{a}</option>)}
          </select></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12 }}>
          {[
            [efectivo.length,'🐦','Efectivo','#4C8DFF'],
            [provasAno.length,'🏆','Provas','#D4AF37'],
            [vitorias,'🥇','Vitórias','#2DD4A7'],
            [percentilMedioAnual+'%','📊','Percentil','#c084fc'],
          ].map(([v,i,l,c])=>(
            <div key={l} style={{ textAlign:'center', padding:'6px', background:'rgba(255,255,255,.04)', borderRadius:8 }}>
              <div style={{ fontSize:16, fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:9, color:'#475569' }}>{i} {l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14, overflowX:'auto' }}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:'7px 4px', borderRadius:8, fontSize:10, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tab===k?'linear-gradient(135deg,#1E5FD9,#1456C0)':'none', color:tab===k?'#fff':'#475569' }}>{l}</button>
        ))}
      </div>

      {/* ══ RESUMO ══════════════════════════════════════════════════════════ */}
      {tab==='resumo'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* época em números */}
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
            <div style={{ fontWeight:700, color:'#fff', fontSize:13, marginBottom:12 }}>🏁 Época {anoFiltro} em Números</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {[
                { icon:'🏆', v:provasAno.length, l:'Provas disputadas', cor:'#D4AF37' },
                { icon:'🥇', v:vitorias, l:'Vitórias', cor:'#2DD4A7' },
                { icon:'🏅', v:podios, l:'Pódios (top 3)', cor:'#b45309' },
                { icon:'📍', v:kmTotal+'km', l:'km percorridos', cor:'#A855F7' },
                { icon:'🐦', v:efectivo.length, l:'Pombos no efectivo', cor:'#4C8DFF' },
                { icon:'📊', v:percentilMedioEf+'%', l:'Percentil médio', cor:'#c084fc' },
              ].map(({icon,v,l,cor})=>(
                <div key={l} style={{ background:'#101F40', borderRadius:10, padding:'10px 12px', display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:20 }}>{icon}</span>
                  <div>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:cor }}>{v}</div>
                    <div style={{ fontSize:10, color:'#7A8699' }}>{l}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* evolução provas */}
          {evolPercentil.length>1&&(
            <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ fontWeight:700, color:'#fff', fontSize:13, marginBottom:10 }}>📈 Evolução do Percentil</div>
              <MiniLineChart dados={evolPercentil} cor="#D4AF37" />
              {melhorProva&&<div style={{ fontSize:11, color:'#2DD4A7', marginTop:8 }}>🏆 Melhor resultado: {melhorProva.nome} — {melhorProva.posicao_geral}º lugar</div>}
            </div>
          )}

          {/* finanças resumo */}
          {(recTotal>0||depTotal>0)&&(
            <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontWeight:700, color:'#fff', fontSize:13 }}>💰 Finanças {anoFiltro}</div>
                <button className="btn btn-secondary btn-sm" onClick={()=>nav?.('financas')}>Ver detalhe →</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
                {[
                  { v:'+'+recTotal.toFixed(0)+'€', l:'Receitas', cor:'#2DD4A7' },
                  { v:'-'+depTotal.toFixed(0)+'€', l:'Despesas', cor:'#f87171' },
                  { v:(saldoTotal>=0?'+':'')+saldoTotal.toFixed(0)+'€', l:'Saldo', cor:saldoTotal>=0?'#2DD4A7':'#f87171' },
                ].map(({v,l,cor})=>(
                  <div key={l} style={{ textAlign:'center', background:'#101F40', borderRadius:10, padding:'8px 4px' }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:cor }}>{v}</div>
                    <div style={{ fontSize:9, color:'#7A8699' }}>{l}</div>
                  </div>
                ))}
              </div>
              {/* saldo acumulado */}
              <MiniLineChart dados={saldoAcumulado.filter(m=>m.v!==0||saldoAcumulado.indexOf(m)>0)} cor={saldoTotal>=0?'#2DD4A7':'#f87171'} />
              {/* pizza categorias */}
              {pieDep.length>0&&(
                <div style={{ display:'flex', gap:12, alignItems:'center', marginTop:12, flexWrap:'wrap' }}>
                  <PieChart data={pieDep} size={90} />
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                    {pieDep.map(d=>(
                      <div key={d.cat} style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                        <span style={{ color:'#cbd5e1', display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:d.cor, flexShrink:0 }} />{d.cat}
                        </span>
                        <span style={{ color:d.cor, fontWeight:600 }}>{d.v.toFixed(0)}€</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* top 5 pombos */}
          {top10.slice(0,5).length>0&&(
            <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontWeight:700, color:'#fff', fontSize:13 }}>⭐ Top 5 Pombos</div>
                <button className="btn btn-secondary btn-sm" onClick={()=>setTab('efectivo')}>Ver todos →</button>
              </div>
              {top10.slice(0,5).map((p,i)=>{
                const cor = (p.percentil||0)>=75?'#2DD4A7':(p.percentil||0)>=50?'#D4AF37':'#94a3b8'
                return (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #1B2D52' }}>
                    <span style={{ fontSize:i<3?16:12, color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569', fontWeight:700, width:22, textAlign:'center' }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                    </span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:'#fff', fontWeight:600 }}>{p.nome}</div>
                      <div style={{ fontSize:10, color:'#7A8699' }}>{p.anilha} · {p.provas||0} provas</div>
                    </div>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:cor }}>{p.percentil||0}%</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* saúde resumo */}
          {saude.length>0&&(
            <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontWeight:700, color:'#fff', fontSize:13 }}>🏥 Saúde do Efectivo</div>
                <button className="btn btn-secondary btn-sm" onClick={()=>nav?.('saude')}>Ver →</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[
                  { v:aptosCount, l:'Aptos', cor:'#2DD4A7' },
                  { v:inaptoCount, l:'Inaptos', cor:'#f87171' },
                  { v:saude.length, l:'Total registos', cor:'#4C8DFF' },
                ].map(({v,l,cor})=>(
                  <div key={l} style={{ textAlign:'center', background:'#101F40', borderRadius:10, padding:'10px 6px' }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:cor }}>{v}</div>
                    <div style={{ fontSize:9, color:'#7A8699' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ EFECTIVO ════════════════════════════════════════════════════════ */}
      {tab==='efectivo'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="card card-p">
              <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>Por Sexo</div>
              <BarraH label="♂ Machos" valor={porSexo.M} max={efectivo.length} cor="#4C8DFF" />
              <BarraH label="♀ Fêmeas" valor={porSexo.F} max={efectivo.length} cor="#f87171" />
            </div>
            <div className="card card-p">
              <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>Por Estado</div>
              <BarraH label="✅ Activos" valor={porEstado.ativo} max={efectivo.length} cor="#2DD4A7" />
              <BarraH label="💤 Inactivos" valor={porEstado.inativo} max={efectivo.length} cor="#475569" />
            </div>
          </div>
          <div className="card card-p">
            <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>Por Especialidade</div>
            {Object.entries(porEsp).sort((a,b)=>b[1]-a[1]).map(([e,n])=>(
              <BarraH key={e} label={`${ESP_ICON[e]||'🐦'} ${e}`} valor={n} max={efectivo.length} cor={ESP_COR[e]||'#94a3b8'} />
            ))}
          </div>
          <div className="card card-p">
            <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>🏆 Top 10 por Percentil</div>
            {top10.length===0?<div style={{ fontSize:11, color:'#475569' }}>Sem dados de percentil</div>
              :top10.map((p,i)=>(
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <div style={{ width:22, textAlign:'center', fontSize:i<3?16:11, fontWeight:700, color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569' }}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:'#fff', fontWeight:i<3?600:400 }}>{p.nome}</div>
                    <div style={{ fontSize:10, color:'#7A8699' }}>{p.anilha} · {p.provas||0} provas</div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:(p.percentil||0)>=75?'#2DD4A7':(p.percentil||0)>=50?'#D4AF37':'#f87171' }}>{p.percentil||0}%</div>
                </div>
              ))
            }
          </div>
          {aDispensar.length>0&&(
            <div className="card card-p" style={{ borderLeft:'3px solid #f87171' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#f87171', marginBottom:10 }}>⚠️ Candidatos a dispensa (percentil &lt;25%)</div>
              {aDispensar.map(p=>(
                <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <div>
                    <div style={{ fontSize:12, color:'#fff' }}>{p.nome}</div>
                    <div style={{ fontSize:10, color:'#7A8699' }}>{p.provas||0} provas</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#f87171' }}>{p.percentil||0}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ PROVAS ══════════════════════════════════════════════════════════ */}
      {tab==='provas'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {provasAno.length===0
            ?<EmptyState icon="🏆" title={`Sem provas em ${anoFiltro}`} desc="Regista provas para ver analíticas" action={<button className="btn btn-primary" onClick={()=>nav?.('provas')}>Ir a Provas</button>} />
            :<>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[[vitorias,'🥇','Vitórias','#D4AF37'],[podios,'🏅','Pódios','#4C8DFF'],[kmTotal+'km','📍','km Total','#A855F7']].map(([v,i,l,c])=>(
                  <div key={l} className="card card-p" style={{ textAlign:'center', borderTop:`2px solid ${c}` }}>
                    <div style={{ fontSize:20, fontWeight:700, color:c }}>{v}</div>
                    <div style={{ fontSize:10, color:'#7A8699' }}>{i} {l}</div>
                  </div>
                ))}
              </div>
              {evolPercentil.length>1&&(
                <div className="card card-p">
                  <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>📈 Evolução do Percentil</div>
                  <MiniLineChart dados={evolPercentil} cor="#D4AF37" />
                  {melhorProva&&<div style={{ fontSize:11, color:'#2DD4A7', marginTop:8 }}>🏆 Melhor: {melhorProva.nome} — {melhorProva.posicao_geral}º lugar</div>}
                </div>
              )}
              <div className="card card-p">
                <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>📅 Provas por Mês</div>
                <MiniBarChart dados={porMes} cor="#4C8DFF" />
              </div>
              <div className="card card-p">
                <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>Por Especialidade</div>
                {Object.entries((() => { const r={}; provasAno.forEach(p=>(p.tipo?[p.tipo]:(p.esp||['velocidade'])).forEach(e=>{r[e]=(r[e]||0)+1})); return r })()).sort((a,b)=>b[1]-a[1]).map(([e,n])=>(
                  <BarraH key={e} label={`${ESP_ICON[e]||'🏆'} ${e}`} valor={n} max={provasAno.length} cor={ESP_COR[e]||'#94a3b8'} />
                ))}
              </div>
            </>
          }
        </div>
      )}

      {/* ══ COMPARATIVO ═════════════════════════════════════════════════════ */}
      {tab==='comparativo'&&(
        <div>
          {rankingPombos.length===0
            ?<EmptyState icon="📈" title="Sem dados comparativos" desc="Regista provas para comparar pombos" />
            :<>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:10 }}>Pombos do efectivo com provas registadas</div>
              {rankingPombos.map((p,i)=>{
                const pct=p.percentil||0
                const cor=pct>=75?'#2DD4A7':pct>=50?'#D4AF37':pct>=25?'#4C8DFF':'#f87171'
                return (
                  <div key={p.id} className="card card-p" style={{ marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:24, textAlign:'center', fontSize:i<3?16:11, color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569', fontWeight:700 }}>
                        {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</span>
                          <span style={{ fontSize:11, color:cor, fontWeight:700 }}>{pct}%</span>
                        </div>
                        <div style={{ height:5, background:'#101F40', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:cor, borderRadius:3 }} />
                        </div>
                        <div style={{ fontSize:10, color:'#475569', marginTop:3 }}>{p.provas||0} provas · {p.sexo==='M'?'♂':'♀'} · {(p.esp||[]).join(', ')||'N/D'}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          }
        </div>
      )}

      {/* ══ DISTÂNCIAS ══════════════════════════════════════════════════════ */}
      {tab==='distancias'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {provasAno.length===0
            ?<EmptyState icon="🗺️" title="Sem provas" desc="Regista provas para ver distribuição por distância" />
            :<>
              <div className="card card-p">
                <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:12 }}>📊 Provas por Distância</div>
                {dadosFaixas.map(f=>(
                  <div key={f.label} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                      <span style={{ color:'#cbd5e1', fontWeight:600 }}>{f.label}</span>
                      <span style={{ color:f.cor }}>{f.total} prova(s) · {f.vitorias} vitória(s) · {f.pctMedio}% médio</span>
                    </div>
                    <div style={{ height:8, background:'#101F40', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(f.total/maxFaixa)*100}%`, background:f.cor, borderRadius:4 }} />
                    </div>
                  </div>
                ))}
              </div>
              {pontosScatter.length>1&&(
                <div className="card card-p">
                  <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:8 }}>📈 Distância vs Percentil</div>
                  <div style={{ fontSize:11, color:'#7A8699', marginBottom:8 }}>Cada ponto é uma prova — onde performa melhor?</div>
                  <svg viewBox="0 0 300 120" style={{ width:'100%', height:120, display:'block' }}>
                    {[25,50,75,100].map(v=><line key={v} x1="30" y1={110-(v/100)*90} x2="295" y2={110-(v/100)*90} stroke="#101F40" strokeWidth="1"/>)}
                    {[0,50,100].map(v=><text key={v} x="25" y={113-(v/100)*90} textAnchor="end" fontSize="7" fill="#475569">{v}%</text>)}
                    {pontosScatter.map((p,i)=>{
                      const x=30+(p.dist/maxDist)*260, y=110-(p.perc/100)*90
                      const c=p.perc>=75?'#2DD4A7':p.perc>=50?'#D4AF37':p.perc>=25?'#4C8DFF':'#f87171'
                      return <circle key={i} cx={x} cy={y} r={4} fill={c} opacity={.85}><title>{p.nome}: {p.dist}km · {p.perc}%</title></circle>
                    })}
                    <text x="165" y="120" textAnchor="middle" fontSize="7" fill="#475569">Distância (km)</text>
                  </svg>
                  <div style={{ display:'flex', gap:10, marginTop:4 }}>
                    {[['#2DD4A7','≥75%'],['#D4AF37','50-74%'],['#4C8DFF','25-49%'],['#f87171','<25%']].map(([c,l])=>(
                      <div key={l} style={{ display:'flex', alignItems:'center', gap:3, fontSize:9, color:'#7A8699' }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:c }}/>{l}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {melhorFaixa&&(
                <div style={{ padding:'12px 14px', background:`rgba(45,212,167,.08)`, border:'1px solid rgba(45,212,167,.2)', borderRadius:10 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#2DD4A7' }}>🎯 Melhor faixa: {melhorFaixa.label}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Percentil médio de {melhorFaixa.pctMedio}% em {melhorFaixa.total} prova(s).</div>
                </div>
              )}
            </>
          }
        </div>
      )}

      {/* ══ CLUBE ═══════════════════════════════════════════════════════════ */}
      {tab==='clube'&&(
        <div>
          <div style={{ padding:'12px 14px', background:'rgba(76,141,255,.06)', border:'1px solid rgba(76,141,255,.15)', borderRadius:10, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#4C8DFF', marginBottom:4 }}>🏛️ Comparativo com a Coletividade</div>
            <div style={{ fontSize:11, color:'#7A8699' }}>Compara o teu desempenho com a média nacional. Dados anonimizados.</div>
          </div>
          {[
            { label:'Percentil médio', valor:percentilMedioAnual, benchmark:55, sufixo:'%' },
            { label:'Taxa de vitória', valor:vitoriasPct, benchmark:12, sufixo:'%' },
            { label:'Provas na época', valor:provasAno.length, benchmark:8, sufixo:'' },
            { label:'Efectivo activo', valor:efectivo.filter(p=>p.estado==='ativo').length, benchmark:20, sufixo:' pombos' },
          ].map(({ label, valor, benchmark, sufixo }) => {
            const pct=Math.min(100,Math.round((valor/Math.max(benchmark*1.5,1))*100))
            const bPct=Math.min(100,Math.round((benchmark/Math.max(benchmark*1.5,1))*100))
            const melhor=valor>=benchmark
            return (
              <div key={label} className="card card-p" style={{ marginBottom:8 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>{label}</div>
                <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:6 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                      <span style={{ color:'#D4AF37' }}>Tu</span>
                      <span style={{ color:melhor?'#2DD4A7':'#f87171', fontWeight:700 }}>{valor}{sufixo}</span>
                    </div>
                    <div style={{ height:6, background:'#101F40', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:'#D4AF37', borderRadius:3 }}/>
                    </div>
                  </div>
                  <div style={{ fontSize:18 }}>{melhor?'↑':'↓'}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                      <span style={{ color:'#475569' }}>Média nacional</span>
                      <span style={{ color:'#475569' }}>{benchmark}{sufixo}</span>
                    </div>
                    <div style={{ height:6, background:'#101F40', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${bPct}%`, background:'#475569', borderRadius:3 }}/>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize:10, color:melhor?'#2DD4A7':'#f87171' }}>
                  {melhor?`✓ Acima da média em ${valor-benchmark}${sufixo}`:`↓ Abaixo da média em ${benchmark-valor}${sufixo}`}
                </div>
              </div>
            )
          })}
          <div style={{ padding:'10px 12px', background:'rgba(212,175,55,.06)', border:'1px solid rgba(212,175,55,.15)', borderRadius:8, fontSize:11, color:'#7A8699' }}>
            ℹ️ Benchmarks baseados em médias nacionais da FPC. Actualizados anualmente.
          </div>
        </div>
      )}
    </div>
    </>
  )
}
