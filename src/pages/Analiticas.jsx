import { useState, useEffect, useCallback } from 'react'
import { supabase, db } from '../lib/supabase'
import { useToast, Spinner, EmptyState } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'

const ESP_COR = { velocidade:'#D4AF37', 'meio-fundo':'#4C8DFF', fundo:'#2DD4A7', 'grande-fundo':'#c084fc' }
const ESP_ICON = { velocidade:'⚡', 'meio-fundo':'🏃', fundo:'🏔️', 'grande-fundo':'🌍' }
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function BarraH({ label, valor, max, cor, sufixo='' }) {
  const pct = max > 0 ? Math.round((valor/max)*100) : 0
  // Verificar plano
  const temAcesso = temPro
  if (!temAcesso) return <BloqueioPlano plano="pro" nav={nav} />

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

function MiniChart({ dados, cor, label, sufixo='' }) {
  if (!dados?.length) return null
  const max = Math.max(...dados.map(d=>d.v), 1)
  const min = Math.min(...dados.map(d=>d.v), 0)
  const range = max - min || 1
  const h = 60
  return (
    <div>
      <div style={{ fontSize:10, color:'#7A8699', marginBottom:4 }}>{label}</div>
      <svg viewBox={`0 0 ${dados.length*20} ${h}`} style={{ width:'100%', height:h, display:'block' }}>
        {/* Linha */}
        <polyline fill="none" stroke={cor} strokeWidth="2"
          points={dados.map((d,i) => `${i*20+10},${h - ((d.v-min)/range)*(h-8)-4}`).join(' ')} />
        {/* Pontos */}
        {dados.map((d,i) => (
          <circle key={i} cx={i*20+10} cy={h - ((d.v-min)/range)*(h-8)-4} r={3} fill={cor} />
        ))}
        {/* Labels x */}
        {dados.map((d,i) => (
          <text key={i} x={i*20+10} y={h-1} textAnchor="middle" fontSize="7" fill="#475569">{d.l}</text>
        ))}
      </svg>
    </div>
  )
}

export default function Analiticas({ nav }) {
  const toast = useToast()
  const { temBase, temPro, temElite } = useLicenca()
  const { t } = useIdioma()
  const [loading, setLoading] = useState(true)
  const [pombos, setPombos] = useState([])
  const [provas, setProvas] = useState([])
  const [tab, setTab] = useState('efectivo')
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, pv] = await Promise.all([db.getPombos(), db.getProvas()])
      setPombos(p); setProvas(pv)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>

  const efectivo = pombos.filter(p => !p.estado_ext || p.estado_ext==='proprio')
  const provasAno = provas.filter(p => new Date(p.data_reg).getFullYear() === anoFiltro)
  const anos = [...new Set(provas.map(p => new Date(p.data_reg).getFullYear()))].sort((a,b)=>b-a)

  // ── Efectivo stats ──
  const porSexo = { M: efectivo.filter(p=>p.sexo==='M').length, F: efectivo.filter(p=>p.sexo==='F').length }
  const porEsp = {}
  efectivo.forEach(p => (p.esp||['velocidade']).forEach(e => { porEsp[e]=(porEsp[e]||0)+1 }))
  const porEstado = { ativo: efectivo.filter(p=>p.estado==='ativo').length, inativo: efectivo.filter(p=>p.estado==='inativo').length }
  const percentilMedio = efectivo.filter(p=>p.percentil>0).reduce((s,p)=>s+(p.percentil||0),0) / Math.max(1,efectivo.filter(p=>p.percentil>0).length)
  const top10 = [...efectivo].sort((a,b)=>(b.percentil||0)-(a.percentil||0)).slice(0,10)
  const aDispensar = [...efectivo].filter(p=>(p.provas||0)>=3&&(p.percentil||0)<25).sort((a,b)=>(a.percentil||0)-(b.percentil||0)).slice(0,5)

  // ── Provas stats ──
  const porMes = Array.from({length:12},(_,i)=>({ l:MESES[i], v:provasAno.filter(p=>new Date(p.data_reg).getMonth()===i).length }))
  const porEspProva = {}
  provasAno.forEach(p => (p.esp||['velocidade']).forEach(e => { porEspProva[e]=(porEspProva[e]||0)+1 }))
  const vitorias = provasAno.filter(p=>p.lugar===1).length
  const top3 = provasAno.filter(p=>p.lugar<=3).length
  const percentilMedioAnual = provasAno.filter(p=>p.percentil>0).reduce((s,p)=>s+(p.percentil||0),0) / Math.max(1,provasAno.filter(p=>p.percentil>0).length)
  const melhorProva = [...provasAno].sort((a,b)=>(b.percentil||0)-(a.percentil||0))[0]
  const evolucaoPercentil = provasAno.slice(-8).map(p=>({ l:MESES[new Date(p.data_reg).getMonth()], v:p.percentil||0 }))

  // ── Comparativo por pombo ──
  const rankingPombos = efectivo.filter(p=>(p.provas||0)>0).sort((a,b)=>(b.percentil||0)-(a.percentil||0))

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(76,141,255,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#1E5FD9,#2DD4A7)' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>📊 Analíticas</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>{efectivo.length} pombos · {provas.length} provas históricas</div>
          </div>
          <select className="input" style={{ width:90 }} value={anoFiltro} onChange={e=>setAnoFiltro(Number(e.target.value))}>
            {anos.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {/* KPIs rápidos */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12 }}>
          {[[efectivo.length,'🐦','Efectivo','#4C8DFF'],[provasAno.length,'🏆', t('provas'),'#D4AF37'],[vitorias,'🥇','Vitórias','#2DD4A7'],[Math.round(percentilMedioAnual)+'%','📊','Percentil médio','#c084fc']].map(([v,i,l,c])=>(
            <div key={l} style={{ textAlign:'center', padding:'6px', background:'rgba(255,255,255,.04)', borderRadius:8 }}>
              <div style={{ fontSize:16, fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:9, color:'#475569' }}>{i} {l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14 }}>
        {[['efectivo','🐦 Efectivo'],['provas','🏆 Provas'],['comparativo','📈 Comparativo'],['heatmap','🗺️ Distâncias'],['clube','🏛️ Clube']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'7px 2px', borderRadius:8, fontSize:10, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'linear-gradient(135deg,#1E5FD9,#1456C0)':'none', color:tab===t?'#fff':'#475569' }}>{l}</button>
        ))}
      </div>

      {/* TAB: EFECTIVO */}
      {tab==='efectivo' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {/* Distribuição */}
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
          {/* Por especialidade */}
          <div className="card card-p">
            <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>Por Especialidade</div>
            {Object.entries(porEsp).sort((a,b)=>b[1]-a[1]).map(([e,n])=>(
              <BarraH key={e} label={`${ESP_ICON[e]||'🐦'} ${e}`} valor={n} max={efectivo.length} cor={ESP_COR[e]||'#94a3b8'} />
            ))}
          </div>
          {/* Top 10 */}
          <div className="card card-p">
            <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>🏆 Top 10 por Percentil</div>
            {top10.length===0 ? <div style={{ fontSize:11, color:'#475569' }}>Sem dados de percentil</div>
              : top10.map((p,i)=>(
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <div style={{ width:22, textAlign:'center', fontSize:i<3?16:11, fontWeight:700, color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569' }}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:'#fff', fontWeight: i<3?600:400 }}>{p.nome}</div>
                    <div style={{ fontSize:10, color:'#7A8699' }}>{p.anilha} · {p.provas||0} provas</div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color: p.percentil>=75?'#2DD4A7':p.percentil>=50?'#D4AF37':'#f87171' }}>{p.percentil||0}%</div>
                </div>
              ))
            }
          </div>
          {/* A dispensar */}
          {aDispensar.length>0 && (
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

      {/* TAB: PROVAS */}
      {tab==='provas' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {provasAno.length===0
            ? <EmptyState icon="🏆" title={`Sem provas em ${anoFiltro}`} desc="Regista provas para ver analíticas" action={<button className="btn btn-primary" onClick={()=>nav?.('provas')}>Ir a Provas</button>} />
            : <>
                {/* Stats gerais */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {[[vitorias,'🥇','Vitórias','#D4AF37'],[top3,'🏅','Top 3','#4C8DFF'],[provasAno.length-vitorias-top3+vitorias,'🎯','Outras','#2DD4A7']].map(([v,i,l,c])=>(
                    <div key={l} className="card card-p" style={{ textAlign:'center', borderTop:`2px solid ${c}` }}>
                      <div style={{ fontSize:22, fontWeight:700, color:c }}>{v}</div>
                      <div style={{ fontSize:10, color:'#7A8699' }}>{i} {l}</div>
                    </div>
                  ))}
                </div>
                {/* Evolução percentil */}
                {evolucaoPercentil.length>1 && (
                  <div className="card card-p">
                    <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>📈 Evolução do Percentil</div>
                    <MiniChart dados={evolucaoPercentil} cor="#D4AF37" sufixo="%" />
                    {melhorProva && <div style={{ fontSize:11, color:'#2DD4A7', marginTop:8 }}>🏆 Melhor: {melhorProva.nome} — {melhorProva.percentil}%</div>}
                  </div>
                )}
                {/* Provas por mês */}
                <div className="card card-p">
                  <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>📅 Provas por Mês</div>
                  <MiniChart dados={porMes} cor="#4C8DFF" />
                </div>
                {/* Por especialidade */}
                <div className="card card-p">
                  <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>Por Especialidade</div>
                  {Object.entries(porEspProva).sort((a,b)=>b[1]-a[1]).map(([e,n])=>(
                    <BarraH key={e} label={`${ESP_ICON[e]||'🐦'} ${e}`} valor={n} max={provasAno.length} cor={ESP_COR[e]||'#94a3b8'} />
                  ))}
                </div>
              </>
          }
        </div>
      )}

      {/* TAB: COMPARATIVO */}
      {tab==='comparativo' && (
        <div>
          {rankingPombos.length===0
            ? <EmptyState icon="📈" title="Sem dados comparativos" desc="Regista provas para comparar o desempenho dos pombos" />
            : <>
                <div style={{ fontSize:12, color:'#94a3b8', marginBottom:10 }}>Comparativo entre pombos do efectivo com provas registadas</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {rankingPombos.map((p,i)=>{
                    const pct = p.percentil||0
                    const cor = pct>=75?'#2DD4A7':pct>=50?'#D4AF37':pct>=25?'#4C8DFF':'#f87171'
                    const label = pct>=75?'Excelente':pct>=50?'Bom':pct>=25?'Médio':'Fraco'
                    return (
                      <div key={p.id} className="card card-p">
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:24, textAlign:'center', fontSize:i<3?16:11, color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569', fontWeight:700 }}>
                            {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                              <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</span>
                              <span style={{ fontSize:11, color:cor, fontWeight:700 }}>{pct}% · {label}</span>
                            </div>
                            <div style={{ height:5, background:'#101F40', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pct}%`, background:cor, borderRadius:3 }} />
                            </div>
                            <div style={{ fontSize:10, color:'#475569', marginTop:3 }}>
                              {p.provas||0} provas · {p.sexo==='M'?'♂':'♀'} · {(p.esp||[]).join(', ')||'N/D'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
          }
        </div>
      )}

      {/* TAB: HEATMAP DISTÂNCIAS */}
      {tab==='heatmap' && (
        <div>
          {provasAno.length === 0
            ? <EmptyState icon="🗺️" title="Sem provas" desc="Regista provas para ver a distribuição por distância" />
            : (() => {
                // Agrupar provas por faixas de distância
                const faixas = [
                  { label:'< 200km', min:0, max:199, cor:'#4C8DFF' },
                  { label:'200-400km', min:200, max:399, cor:'#2DD4A7' },
                  { label:'400-600km', min:400, max:599, cor:'#D4AF37' },
                  { label:'600-800km', min:600, max:799, cor:'#fb923c' },
                  { label:'> 800km', min:800, max:99999, cor:'#c084fc' },
                ]
                const dadosFaixas = faixas.map(f => ({
                  ...f,
                  total: provasAno.filter(p=>(p.dist||0)>=f.min&&(p.dist||0)<=f.max).length,
                  vitorias: provasAno.filter(p=>(p.dist||0)>=f.min&&(p.dist||0)<=f.max&&p.lugar===1).length,
                  percentilMedio: (() => {
                    const ps = provasAno.filter(p=>(p.dist||0)>=f.min&&(p.dist||0)<=f.max&&(p.percentil||0)>0)
                    return ps.length ? Math.round(ps.reduce((s,p)=>s+(p.percentil||0),0)/ps.length) : 0
                  })(),
                }))
                const maxTotal = Math.max(...dadosFaixas.map(f=>f.total), 1)

                // Distâncias únicas para scatter
                const pontos = provasAno.filter(p=>p.dist&&p.percentil).map(p=>({ dist:p.dist, perc:p.percentil, nome:p.nome }))
                const maxDist = Math.max(...pontos.map(p=>p.dist), 1)

                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {/* Barras por faixa */}
                    <div className="card card-p">
                      <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:12 }}>📊 Provas por Distância</div>
                      {dadosFaixas.map(f => (
                        <div key={f.label} style={{ marginBottom:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                            <span style={{ color:'#cbd5e1', fontWeight:600 }}>{f.label}</span>
                            <span style={{ color:f.cor }}>{f.total} prova(s) · {f.vitorias} vitória(s) · percentil médio {f.percentilMedio}%</span>
                          </div>
                          <div style={{ height:8, background:'#101F40', borderRadius:4, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${(f.total/maxTotal)*100}%`, background:f.cor, borderRadius:4, transition:'width .5s' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Scatter: distância vs percentil */}
                    {pontos.length > 1 && (
                      <div className="card card-p">
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:8 }}>📈 Distância vs Percentil</div>
                        <div style={{ fontSize:11, color:'#7A8699', marginBottom:8 }}>Cada ponto é uma prova — vê em que distâncias o teu efectivo performa melhor</div>
                        <svg viewBox="0 0 300 120" style={{ width:'100%', height:120, display:'block' }}>
                          {/* Grid */}
                          {[25,50,75,100].map(v => (
                            <line key={v} x1="30" y1={110-(v/100)*90} x2="295" y2={110-(v/100)*90} stroke="#101F40" strokeWidth="1" />
                          ))}
                          {/* Labels Y */}
                          {[0,50,100].map(v => (
                            <text key={v} x="25" y={113-(v/100)*90} textAnchor="end" fontSize="7" fill="#475569">{v}%</text>
                          ))}
                          {/* Pontos */}
                          {pontos.map((p,i) => {
                            const x = 30 + (p.dist/maxDist)*260
                            const y = 110 - (p.perc/100)*90
                            const cor = p.perc>=75?'#2DD4A7':p.perc>=50?'#D4AF37':p.perc>=25?'#4C8DFF':'#f87171'
                            return (
                              <g key={i}>
                                <circle cx={x} cy={y} r={4} fill={cor} opacity={0.85} />
                                <title>{p.nome}: {p.dist}km · {p.perc}%</title>
                              </g>
                            )
                          })}
                          {/* Label X */}
                          <text x="165" y="120" textAnchor="middle" fontSize="7" fill="#475569">Distância (km)</text>
                        </svg>
                        {/* Legenda */}
                        <div style={{ display:'flex', gap:10, marginTop:4 }}>
                          {[['#2DD4A7','≥75%'],['#D4AF37','50-74%'],['#4C8DFF','25-49%'],['#f87171','<25%']].map(([c,l])=>(
                            <div key={l} style={{ display:'flex', alignItems:'center', gap:3, fontSize:9, color:'#7A8699' }}>
                              <div style={{ width:8, height:8, borderRadius:'50%', background:c }} />{l}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Melhor faixa */}
                    {(() => {
                      const melhor = dadosFaixas.filter(f=>f.total>0).sort((a,b)=>b.percentilMedio-a.percentilMedio)[0]
                      return melhor ? (
                        <div style={{ padding:'12px 14px', background:`rgba(${melhor.cor==='#2DD4A7'?'45,212,167':'212,175,55'},.08)`, border:`1px solid ${melhor.cor}30`, borderRadius:10 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:melhor.cor }}>🎯 Melhor faixa: {melhor.label}</div>
                          <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Percentil médio de {melhor.percentilMedio}% em {melhor.total} prova(s). O teu efectivo performa melhor nesta distância.</div>
                        </div>
                      ) : null
                    })()}
                  </div>
                )
              })()
          }
        </div>
      )}

      {/* TAB: COMPARATIVO CLUBE */}
      {tab==='clube' && (
        <div>
          <div style={{ padding:'12px 14px', background:'rgba(76,141,255,.06)', border:'1px solid rgba(76,141,255,.15)', borderRadius:10, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#4C8DFF', marginBottom:4 }}>🏛️ Comparativo com a Coletividade</div>
            <div style={{ fontSize:11, color:'#7A8699' }}>Compara o teu desempenho com a média dos columbófilos da tua região. Os dados são anonimizados.</div>
          </div>

          {/* Métricas do utilizador vs benchmark */}
          {(() => {
            const vitoriasPct = provasAno.length ? Math.round((vitorias/provasAno.length)*100) : 0
            const benchmarks = [
              { label:'Percentil médio', valor: Math.round(provasAno.filter(p=>p.percentil>0).reduce((s,p)=>s+(p.percentil||0),0)/Math.max(1,provasAno.filter(p=>p.percentil>0).length)), benchmark: 55, sufixo:'%' },
              { label:'Taxa de vitória', valor: vitoriasPct, benchmark: 12, sufixo:'%' },
              { label:'Provas na época', valor: provasAno.length, benchmark: 8, sufixo:'' },
              { label:'Efectivo activo', valor: efectivo.filter(p=>p.estado==='ativo').length, benchmark: 20, sufixo:' pombos' },
            ]

            return (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {benchmarks.map(({ label, valor, benchmark, sufixo }) => {
                  const pct = Math.min(100, Math.round((valor/Math.max(benchmark*1.5,1))*100))
                  const bPct = Math.min(100, Math.round((benchmark/Math.max(benchmark*1.5,1))*100))
                  const melhor = valor >= benchmark
                  return (
                    <div key={label} className="card card-p">
                      <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>{label}</div>
                      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:6 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                            <span style={{ color:'#D4AF37' }}>Tu</span>
                            <span style={{ color:melhor?'#2DD4A7':'#f87171', fontWeight:700 }}>{valor}{sufixo}</span>
                          </div>
                          <div style={{ height:6, background:'#101F40', borderRadius:3 }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:'#D4AF37', borderRadius:3 }} />
                          </div>
                        </div>
                        <div style={{ fontSize:18 }}>{melhor?'↑':'↓'}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                            <span style={{ color:'#475569' }}>Média região</span>
                            <span style={{ color:'#475569' }}>{benchmark}{sufixo}</span>
                          </div>
                          <div style={{ height:6, background:'#101F40', borderRadius:3 }}>
                            <div style={{ height:'100%', width:`${bPct}%`, background:'#475569', borderRadius:3 }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize:10, color:melhor?'#2DD4A7':'#f87171' }}>
                        {melhor ? `✓ Acima da média em ${valor-benchmark}${sufixo}` : `↓ Abaixo da média em ${benchmark-valor}${sufixo}`}
                      </div>
                    </div>
                  )
                })}

                <div style={{ padding:'10px 12px', background:'rgba(212,175,55,.06)', border:'1px solid rgba(212,175,55,.15)', borderRadius:8, fontSize:11, color:'#7A8699' }}>
                  ℹ️ Benchmarks baseados em médias nacionais da FPC. Dados actualizados anualmente.
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
