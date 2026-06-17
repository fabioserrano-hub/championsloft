import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Badge } from '../components/ui'
import { classificarPombo } from './Pombos'

function BarChart({ dados, corPositivo = '#2DD4A7', corNegativo = '#f87171', formato = (v) => v }) {
  if (!dados.length) return <div style={{ fontSize: 12, color: '#7A8699', textAlign: 'center', padding: '16px 0' }}>Sem dados</div>
  const max = Math.max(...dados.map(d => Math.abs(d.valor)), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 4px' }}>
      {dados.map((d, i) => {
        const h = Math.max((Math.abs(d.valor) / max) * 110, 2)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 9, color: '#94a3b8' }}>{formato(d.valor)}</div>
            <div style={{ width: '100%', height: h, borderRadius: '4px 4px 0 0', background: d.valor >= 0 ? corPositivo : corNegativo }} />
            <div style={{ fontSize: 9, color: '#7A8699' }}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function Relatorios({ nav }) {
  const toast = useToast()
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
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>🥇 Vitórias por Mês ({ano})</div>
                <BarChart dados={vitoriasPorMes} corPositivo="#facc15" />
              </div>

              <div className="card card-p mb-6">
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>📊 Top 8 Pombos por Percentil</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topPombos.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 18, fontSize: 11, color: '#7A8699' }}>{i + 1}</span>
                      <span style={{ flex: '0 0 100px', fontSize: 12, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</span>
                      <div className="progress" style={{ flex: 1 }}><div className="progress-bar" style={{ width: `${p.percentil || 0}%`, background: '#2DD4A7' }} /></div>
                      <span style={{ fontSize: 11, color: '#2DD4A7', fontWeight: 700, width: 36, textAlign: 'right' }}>{p.percentil || 0}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card card-p mb-6">
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>🔎 Estado do Efectivo</div>
                <div style={{ fontSize: 11, color: '#7A8699', marginBottom: 12 }}>Classificação automática calculada a partir de percentil, idade e estado de saúde de cada pombo.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(distribuicaoClassificacao).sort((a, b) => b[1].n - a[1].n).map(([tag, { n, cor }]) => (
                    <div key={tag}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: cor }} />{tag}</span>
                        <span style={{ color: '#94a3b8' }}>{n} ({Math.round((n / efectivo.length) * 100)}%)</span>
                      </div>
                      <div className="progress"><div className="progress-bar" style={{ width: `${(n / efectivo.length) * 100}%`, background: cor }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card card-p">
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>🎯 Efectivo por Especialidade</div>
                <div className="grid-4">
                  {Object.entries(porEspecialidade).map(([esp, n]) => (
                    <div key={esp} style={{ textAlign: 'center', background: '#101F40', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 700, color: '#4C8DFF' }}>{n}</div>
                      <div style={{ fontSize: 10, color: '#7A8699', textTransform: 'capitalize' }}>{esp.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'financas' && (
            <div>
              <div className="grid-3 mb-6">
                <div className="kpi"><div className="kpi-val text-green">{recTotal.toFixed(0)}€</div><div className="kpi-label">Receitas {ano}</div></div>
                <div className="kpi"><div className="kpi-val text-red">{depTotal.toFixed(0)}€</div><div className="kpi-label">Despesas {ano}</div></div>
                <div className="kpi"><div className="kpi-val text-yellow">{custoEfetivo}€</div><div className="kpi-label">Custo/Pombo</div></div>
              </div>
              <div className="card card-p">
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>💰 Saldo Mensal ({ano})</div>
                <BarChart dados={finPorMes} formato={v => v.toFixed(0) + '€'} />
              </div>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
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
