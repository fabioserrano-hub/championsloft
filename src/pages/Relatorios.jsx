import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Badge } from '../components/ui'
import { classificarPombo } from './Pombos'

const CORES = ['#4C8DFF','#2DD4A7','#D4AF37','#f87171','#a78bfa','#fb923c','#34d399','#e879f9']

function BarH({ dados, formato = v => v, cor = '#2DD4A7' }) {
  if (!dados.length) return <div style={{ fontSize:12, color:'#7A8699', textAlign:'center', padding:'12px 0' }}>Sem dados</div>
  const max = Math.max(...dados.map(d => Math.abs(d.valor)), 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {dados.map((d,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:90, fontSize:11, color:'#cbd5e1', textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.label}</div>
          <div style={{ flex:1, background:'#101F40', borderRadius:4, height:20, overflow:'hidden' }}>
            <div style={{ width:`${(Math.abs(d.valor)/max)*100}%`, height:'100%', background: d.valor<0?'#f87171':cor, borderRadius:4, minWidth:2, transition:'width .5s' }} />
          </div>
          <div style={{ width:50, fontSize:11, color:d.valor<0?'#f87171':cor, fontWeight:700, textAlign:'right', flexShrink:0 }}>{formato(d.valor)}</div>
        </div>
      ))}
    </div>
  )
}

function BarV({ dados, formato = v => v, cor = '#2DD4A7' }) {
  if (!dados.length) return <div style={{ fontSize:12, color:'#7A8699', textAlign:'center', padding:'12px 0' }}>Sem dados</div>
  const max = Math.max(...dados.map(d => Math.abs(d.valor)), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:120, padding:'0 4px' }}>
      {dados.map((d,i) => {
        const h = Math.max((Math.abs(d.valor)/max)*96, d.valor===0?0:4)
        const c = d.valor < 0 ? '#f87171' : (typeof cor === 'function' ? cor(d, i) : cor)
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            {d.valor!==0 && <div style={{ fontSize:8, color:'#94a3b8' }}>{formato(d.valor)}</div>}
            <div style={{ width:'100%', flex:1, display:'flex', alignItems:'flex-end' }}>
              <div style={{ width:'100%', height:h, borderRadius:'3px 3px 0 0', background:c }} />
            </div>
            <div style={{ fontSize:9, color:'#7A8699' }}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

function LineG({ dados, cor = '#D4AF37', formato = v => v }) {
  if (dados.length < 2) return <div style={{ fontSize:12, color:'#7A8699', textAlign:'center', padding:'12px 0' }}>Sem dados suficientes</div>
  const vals = dados.map(d => d.valor)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const W = 300, H = 100
  const pts = dados.map((d, i) => {
    const x = (i / (dados.length - 1)) * (W - 20) + 10
    const y = H - ((d.valor - min) / range) * (H - 20) - 10
    return `${x},${y}`
  })
  const path = 'M ' + pts.join(' L ')
  const fill = 'M ' + pts[0] + ' L ' + pts.join(' L ') + ` L ${pts[pts.length-1].split(',')[0]},${H} L 10,${H} Z`
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:100 }}>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity=".25" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#lg)" />
        <path d={path} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" />
        {dados.map((d,i) => {
          const [x,y] = pts[i].split(',').map(Number)
          return <circle key={i} cx={x} cy={y} r={3} fill={cor} />
        })}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#7A8699', marginTop:2 }}>
        {dados.map((d,i) => <span key={i}>{d.label}</span>)}
      </div>
    </div>
  )
}

export default function Relatorios({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()
  const [loading, setLoading] = useState(true)
  const [pombos, setPombos] = useState([])
  const [provas, setProvas] = useState([])
  const [financas, setFinancas] = useState([])
  const [saude, setSaude] = useState([])
  const [tab, setTab] = useState('desempenho')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, pv, f, s] = await Promise.all([db.getPombos(), db.getProvas(), db.getFinancas(), db.getSaude()])
      setPombos(p); setProvas(pv); setFinancas(f); setSaude(s)
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const ano = new Date().getFullYear()
  const efectivo = pombos.filter(p => !p.estado_ext || p.estado_ext === 'proprio')

  // Desempenho
  const topPombos = [...efectivo].sort((a, b) => (b.percentil || 0) - (a.percentil || 0)).slice(0, 8)
  const porEspecialidade = {}
  efectivo.forEach(p => (p.esp || []).forEach(e => { porEspecialidade[e] = (porEspecialidade[e] || 0) + 1 }))
  const vitoriasPorMes = Array.from({ length: 12 }, (_, i) => ({
    label: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i],
    valor: provas.filter(p => p.lugar === 1 && new Date(p.data_reg).getMonth() === i && new Date(p.data_reg).getFullYear() === ano).length,
  }))

  // Finanças
  const finPorMes = Array.from({ length: 12 }, (_, i) => {
    const doMes = financas.filter(f => new Date(f.data_reg).getMonth() === i && new Date(f.data_reg).getFullYear() === ano)
    const rec = doMes.filter(f => f.tipo === 'receita').reduce((s, f) => s + f.val, 0)
    const dep = doMes.filter(f => f.tipo === 'despesa').reduce((s, f) => s + f.val, 0)
    return { label: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i], valor: rec - dep }
  })
  const recTotal = financas.filter(f => f.tipo === 'receita' && new Date(f.data_reg).getFullYear() === ano).reduce((s, f) => s + f.val, 0)
  const depTotal = financas.filter(f => f.tipo === 'despesa' && new Date(f.data_reg).getFullYear() === ano).reduce((s, f) => s + f.val, 0)

  // Saúde
  const aptosCount = saude.filter(s => (s.apt || s.aptidao) === 'Apto').length
  const obsCount = saude.filter(s => (s.apt || s.aptidao) === 'Em Observação').length
  const lesCount = saude.filter(s => ['Lesionado', 'Doente'].includes(s.apt || s.aptidao)).length
  const pesoMedio = (() => {
    const comPeso = saude.filter(s => s.peso)
    if (!comPeso.length) return null
    return Math.round(comPeso.reduce((s, r) => s + r.peso, 0) / comPeso.length)
  })()

  const custoEfetivo = depTotal && efectivo.length ? (depTotal / efectivo.length).toFixed(2) : '0.00'

  // Distribuição agregada por classificação automática (mesma lógica usada em Pombos)
  const distribuicaoClassificacao = {}
  efectivo.forEach(p => {
    const c = classificarPombo(p)
    distribuicaoClassificacao[c.tag] = (distribuicaoClassificacao[c.tag] || { n: 0, cor: c.cor })
    distribuicaoClassificacao[c.tag].n++
  })

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Relatórios</div><div className="section-sub">Indicadores da época {ano}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#101F40', borderRadius: 10, padding: 4, marginBottom: 16, overflowX: 'auto' }}>
        {[['desempenho', '🏆 Desempenho'], ['financas', '💰 Finanças'], ['saude', '🏥 Saúde']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap', background: tab === t ? '#1E5FD9' : 'none', color: tab === t ? '#fff' : '#94a3b8' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div> : (
        <>
          {tab === 'desempenho' && (
            <div>
              <div className="grid-3 mb-6">
                <div className="kpi"><div className="kpi-val text-green">{efectivo.length}</div><div className="kpi-label">Efectivo</div></div>
                <div className="kpi"><div className="kpi-val text-yellow">{provas.filter(p => p.lugar === 1).length}</div><div className="kpi-label">Vitórias</div></div>
                <div className="kpi"><div className="kpi-val text-blue">{provas.length}</div><div className="kpi-label">Provas Disputadas</div></div>
              </div>

              <div className="card card-p mb-6">
                <div style={{ fontWeight:600, color:'#fff', marginBottom:16 }}>🥇 Vitórias por Mês ({ano})</div>
                <BarV dados={vitoriasPorMes} cor="#D4AF37" />
              </div>

              <div className="card card-p mb-6">
                <div style={{ fontWeight:600, color:'#fff', marginBottom:16 }}>📊 Top 8 Pombos por Percentil</div>
                <BarH dados={topPombos.map(p => ({ label: p.nome, valor: p.percentil || 0 }))} formato={v => v+'%'} cor="#2DD4A7" />
              </div>

              <div className="card card-p mb-6">
                <div style={{ fontWeight:600, color:'#fff', marginBottom:4 }}>🔎 Estado do Efectivo</div>
                <div style={{ fontSize:11, color:'#7A8699', marginBottom:12 }}>Classificação automática calculada a partir de percentil, idade e estado de saúde.</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {Object.entries(distribuicaoClassificacao).sort((a,b) => b[1].n - a[1].n).map(([tag,{n,cor}]) => (
                    <div key={tag}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                        <span style={{ color:'#cbd5e1', display:'flex', alignItems:'center', gap:6 }}><span style={{ width:6, height:6, borderRadius:'50%', background:cor }} />{tag}</span>
                        <span style={{ color:'#94a3b8' }}>{n} ({Math.round((n/Math.max(efectivo.length,1))*100)}%)</span>
                      </div>
                      <div className="progress"><div className="progress-bar" style={{ width:`${(n/Math.max(efectivo.length,1))*100}%`, background:cor }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card card-p">
                <div style={{ fontWeight:600, color:'#fff', marginBottom:16 }}>🎯 Efectivo por Especialidade</div>
                <BarV dados={Object.entries(porEspecialidade).map(([esp,n]) => ({ label: esp.replace('_',' '), valor: n }))} cor={(d,i) => CORES[i % CORES.length]} />
              </div>
            </div>
          )}

          {tab === 'financas' && (
            <div>
              <div className="grid-3 mb-6">
                <div className="kpi"><div className="kpi-val text-green">{recTotal.toFixed(0)}€</div><div className="kpi-label">Receitas {ano}</div></div>
                <div className="kpi"><div className="kpi-val text-red">{depTotal.toFixed(0)}€</div><div className="kpi-label">Despesas {ano}</div></div>
                <div className="kpi"><div className="kpi-val" style={{ color: recTotal-depTotal>=0?'#2DD4A7':'#f87171' }}>{(recTotal-depTotal).toFixed(0)}€</div><div className="kpi-label">Saldo {ano}</div></div>
              </div>
              <div className="card card-p mb-6">
                <div style={{ fontWeight:600, color:'#fff', marginBottom:16 }}>💰 Saldo Mensal ({ano})</div>
                <BarV dados={finPorMes} formato={v => v.toFixed(0)+'€'} cor={(d) => d.valor >= 0 ? '#2DD4A7' : '#f87171'} />
              </div>
              <div className="card card-p mb-6">
                <div style={{ fontWeight:600, color:'#fff', marginBottom:12 }}>📈 Saldo Acumulado ({ano})</div>
                <LineG dados={(() => {
                  let acum = 0
                  return finPorMes.map(m => { acum += m.valor; return { label: m.label, valor: Math.round(acum) } })
                })()} cor="#D4AF37" formato={v => v+'€'} />
              </div>
              <div style={{ textAlign:'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => nav?.('financas')}>Ver detalhe em Finanças →</button>
              </div>
            </div>
          )}

          {tab === 'saude' && (
            <div>
              <div className="grid-3 mb-6">
                <div className="kpi"><div className="kpi-val text-green">{aptosCount}</div><div className="kpi-label">Registos Aptos</div></div>
                <div className="kpi"><div className="kpi-val text-yellow">{obsCount}</div><div className="kpi-label">Em Observação</div></div>
                <div className="kpi"><div className="kpi-val text-red">{lesCount}</div><div className="kpi-label">Lesionados/Doentes</div></div>
              </div>
              {pesoMedio && (
                <div className="card card-p mb-6">
                  <div style={{ fontWeight: 600, color: '#fff', marginBottom: 8 }}>⚖️ Peso Médio do Efectivo</div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: 32, fontWeight: 700, color: '#4C8DFF' }}>{pesoMedio}g</div>
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => nav?.('saude')}>Ver detalhe em Saúde →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
