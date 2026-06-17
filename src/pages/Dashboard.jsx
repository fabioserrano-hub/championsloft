import { useState, useEffect } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner } from '../components/ui'

export default function Dashboard({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const nome = user?.user_metadata?.nome?.split(' ')[0] || 'Columbófilo'
  const h = new Date().getHours()
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [pombos, provas, fin, saude, treinos, tarefas, acas, stock, eventos] = await Promise.all([
          db.getPombos(),
          db.getProvas(),
          db.getFinancas(),
          supabase.from('health').select('*').order('created_at', { ascending: false }).limit(10).then(r => r.data || []),
          supabase.from('treinos').select('*').order('data_reg', { ascending: false }).limit(3).then(r => r.data || []),
          db.getTarefas(),
          supabase.from('breeding').select('*').eq('estado', 'em_progresso').then(r => r.data || []),
          db.getStock().catch(() => []),
          db.getEventosCal().catch(() => []),
        ])

        const ano = new Date().getFullYear()
        const hoje = new Date().toISOString().slice(0, 10)
        const em7dias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

        const finAno = fin.filter(t => new Date(t.data_reg).getFullYear() === ano)
        const rec = finAno.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.val || 0), 0)
        const dep = finAno.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (t.val || 0), 0)

        const top = [...pombos].sort((a, b) => (b.percentil || 0) - (a.percentil || 0)).slice(0, 5)
        const vitorias = provas.filter(p => p.lugar === 1).length
        const pombosAtivos = pombos.filter(p => (!p.estado_ext || p.estado_ext === 'proprio') && p.estado === 'ativo')

        const provasProximas = provas.filter(p => p.data_reg >= hoje && p.data_reg <= em7dias).sort((a, b) => a.data_reg.localeCompare(b.data_reg))
        const tarefasHojeOuAtraso = tarefas.filter(t => t.estado !== 'concluida' && t.data_prevista && t.data_prevista <= hoje)
        const tarefasProximas = tarefas.filter(t => t.estado !== 'concluida' && t.data_prevista && t.data_prevista > hoje && t.data_prevista <= em7dias)
        const eventosHoje = eventos.filter(e => e.data_evento === hoje)

        const alertas = []

        const tarefasAtraso = tarefas.filter(t => t.estado !== 'concluida' && t.data_prevista && t.data_prevista < hoje)
        if (tarefasAtraso.length > 0) {
          alertas.push({ tipo: 'tarefa', icon: '⏰', texto: `${tarefasAtraso.length} tarefa${tarefasAtraso.length > 1 ? 's' : ''} em atraso no checklist`, cor: '#f87171', page: 'checklist' })
        }

        const stockBaixo = stock.filter(s => s.qtd_minima && s.qtd <= s.qtd_minima)
        stockBaixo.forEach(s => {
          alertas.push({ tipo: 'stock', icon: '🌾', texto: `${s.nome} a acabar (${s.qtd}${s.unidade || ''} restantes)`, cor: '#D4AF37', page: 'alimentacao' })
        })

        const mediaEfectivo = top.length ? top.reduce((s, p) => s + (p.percentil || 0), 0) / top.length : 0
        const quedaRendimento = pombosAtivos.filter(p => (p.percentil || 0) > 0 && (p.percentil || 0) < mediaEfectivo - 25 && (p.provas || 0) >= 3)
        quedaRendimento.slice(0, 3).forEach(p => {
          alertas.push({ tipo: 'desempenho', icon: '📉', texto: `${p.nome} em queda de rendimento (${p.percentil}%)`, cor: '#f87171', page: 'pombos' })
        })

        const ultimoRegistoSaude = saude[0]?.created_at
        const diasSemRegistoSaude = ultimoRegistoSaude ? Math.floor((Date.now() - new Date(ultimoRegistoSaude)) / 86400000) : null
        if (diasSemRegistoSaude !== null && diasSemRegistoSaude > 60) {
          alertas.push({ tipo: 'saude', icon: '🏥', texto: `Sem registo de saúde há ${diasSemRegistoSaude} dias`, cor: '#D4AF37', page: 'saude' })
        }

        setData({
          pombos, provas, saldo: rec - dep, rec, dep,
          ativos: pombosAtivos.length,
          total: pombos.filter(p => !p.estado_ext || p.estado_ext === 'proprio').length,
          top, vitorias, treinos, acas, ano,
          provasProximas, tarefasHojeOuAtraso, tarefasProximas, eventosHoje, alertas,
        })
      } catch (e) { toast('Erro: ' + e.message, 'err') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spinner lg /></div>

  const mediaScore = data.top.length ? Math.round(data.top.reduce((s, p) => s + (p.percentil || 0), 0) / data.top.length) : 0
  const champion = data.top[0]
  const hojeStr = new Date().toISOString().slice(0, 10)

  const ACOES_RAPIDAS = [
    ['🏆', 'Registar Chegada', 'provas'],
    ['🏥', 'Registo Saúde', 'saude'],
    ['🎯', 'Novo Treino', 'treinos'],
    ['✅', 'Checklist', 'checklist'],
  ]

  const totalHoje = data.tarefasHojeOuAtraso.length + data.eventosHoje.length + data.provasProximas.filter(p => p.data_reg === hojeStr).length

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Pombal Hoje</div>
          <div className="section-sub">{saudacao}, {nome} · {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      </div>

      <div className="card card-p mb-6" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 80% 0%, rgba(76,141,255,.06), transparent 70%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: '#4C8DFF', textTransform: 'uppercase' }}>Hoje</span>
            {totalHoje > 0 && <span className="badge badge-blue">{totalHoje}</span>}
          </div>

          {totalHoje === 0 && data.tarefasProximas.length === 0 && data.provasProximas.length === 0 ? (
            <div style={{ fontSize: 13, color: '#7A8699', padding: '8px 0' }}>Sem nada agendado para hoje. Bom dia tranquilo no pombal. 🕊️</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.tarefasHojeOuAtraso.map(t => (
                <div key={'t' + t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#101F40', borderRadius: 8, cursor: 'pointer' }} onClick={() => nav('checklist')}>
                  <span style={{ fontSize: 16 }}>✅</span>
                  <div style={{ flex: 1, fontSize: 13, color: '#fff' }}>{t.titulo}</div>
                  <span style={{ fontSize: 11, color: t.data_prevista < hojeStr ? '#f87171' : '#7A8699' }}>
                    {t.data_prevista < hojeStr ? 'Em atraso' : 'Hoje'}
                  </span>
                </div>
              ))}
              {data.eventosHoje.map(e => (
                <div key={'e' + e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#101F40', borderRadius: 8, cursor: 'pointer' }} onClick={() => nav('calendario')}>
                  <span style={{ fontSize: 16 }}>📅</span>
                  <div style={{ flex: 1, fontSize: 13, color: '#fff' }}>{e.titulo}</div>
                  <span style={{ fontSize: 11, color: '#7A8699' }}>Hoje</span>
                </div>
              ))}
              {data.provasProximas.slice(0, 3).map(p => (
                <div key={'p' + p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#101F40', borderRadius: 8, cursor: 'pointer' }} onClick={() => nav('provas')}>
                  <span style={{ fontSize: 16 }}>🏆</span>
                  <div style={{ flex: 1, fontSize: 13, color: '#fff' }}>{p.nome} <span style={{ color: '#7A8699' }}>· {p.dist}km</span></div>
                  <span style={{ fontSize: 11, color: '#D4AF37' }}>{new Date(p.data_reg).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
            {ACOES_RAPIDAS.map(([icon, label, page]) => (
              <button key={page} onClick={() => nav(page)} className="btn btn-secondary btn-sm" style={{ flexDirection: 'column', gap: 4, padding: '10px 6px', height: 'auto' }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 10.5 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {data.alertas.length > 0 && (
        <div className="mb-6">
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: '#D4AF37', textTransform: 'uppercase', marginBottom: 10 }}>⚠️ Atenção</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.alertas.map((a, i) => (
              <div key={i} onClick={() => nav(a.page)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#0B1830', border: `1px solid ${a.cor}22`, borderRadius: 8, cursor: 'pointer' }}>
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                <span style={{ flex: 1, fontSize: 13, color: '#cbd5e1' }}>{a.texto}</span>
                <span style={{ color: a.cor, fontSize: 12 }}>→</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: champion ? '1.3fr 1fr' : '1fr', gap: 14, marginBottom: 14 }}>
        {champion && (
          <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: 0, cursor: 'pointer' }} onClick={() => nav('pombos')}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 75% 20%, rgba(212,175,55,.1), transparent 70%)' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18, padding: 22 }}>
              <div style={{ width: 72, height: 72, borderRadius: 10, background: 'linear-gradient(135deg,#101F40,#1B2D52)', border: '1px solid #2a4070', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, flexShrink: 0, overflow: 'hidden' }}>
                {champion.foto_url ? <img src={champion.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (champion.emoji || '🕊️')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: '#D4AF37', textTransform: 'uppercase', marginBottom: 4 }}>Destaque da época</div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{champion.nome}</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10.5, color: '#7A8699' }}>{champion.anilha} · {champion.provas || 0} provas · {data.vitorias} vitórias</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 32, fontWeight: 900, color: '#D4AF37', lineHeight: 1 }}>{champion.percentil || 0}%</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#7A8699' }}>PERCENTIL</div>
              </div>
            </div>
          </div>
        )}
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: '#4C8DFF', textTransform: 'uppercase', marginBottom: 8 }}>🥚 Reprodução activa</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: "'Fraunces',serif", fontSize: 30, fontWeight: 900, color: '#fff' }}>{data.acas.length}</span>
            <span style={{ fontSize: 12, color: '#7A8699' }}>acasalamento{data.acas.length !== 1 ? 's' : ''} em curso</span>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, alignSelf: 'flex-start' }} onClick={() => nav('reproducao')}>Ver →</button>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '14px 18px', borderRight: '1px solid #1B2D52' }}>
          <div className="kpi-label" style={{ marginBottom: 4 }}>Efectivo</div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: '#4C8DFF' }}>{data.ativos}</div>
        </div>
        <div style={{ flex: 1, padding: '14px 18px', borderRight: '1px solid #1B2D52' }}>
          <div className="kpi-label" style={{ marginBottom: 4 }}>Provas {data.ano}</div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: '#fff' }}>{data.provas.length}</div>
        </div>
        <div style={{ flex: 1, padding: '14px 18px', borderRight: '1px solid #1B2D52' }}>
          <div className="kpi-label" style={{ marginBottom: 4 }}>Score Médio</div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: '#D4AF37' }}>{mediaScore}%</div>
        </div>
        <div style={{ flex: 1, padding: '14px 18px', cursor: 'pointer' }} onClick={() => nav('financas')}>
          <div className="kpi-label" style={{ marginBottom: 4 }}>Saldo</div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: data.saldo >= 0 ? '#2DD4A7' : '#f87171' }}>{data.saldo >= 0 ? '+' : ''}{data.saldo.toFixed(0)}€</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, color: '#fff', fontSize: 14 }}>Últimas Provas</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('provas')}>Ver todas →</button>
          </div>
          {data.provas.length === 0
            ? <div style={{ textAlign: 'center', color: '#7A8699', fontSize: 13, padding: '20px 0' }}>Sem provas registadas</div>
            : data.provas.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1B2D52' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.lugar === 1 ? '#D4AF37' : p.lugar && p.lugar <= 3 ? '#4C8DFF' : '#2DD4A7', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                  <div style={{ fontSize: 10.5, color: '#7A8699' }}>{p.local_solta || '—'} · {new Date(p.data_reg).toLocaleDateString('pt-PT')}</div>
                </div>
                {p.lugar && <span className={`badge ${p.lugar === 1 ? 'badge-yellow' : p.lugar <= 3 ? 'badge-blue' : 'badge-gray'}`}>{p.lugar}º</span>}
              </div>
            ))
          }
        </div>

        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, color: '#fff', fontSize: 14 }}>Top Pombos</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('pombos')}>Ver todos →</button>
          </div>
          {data.top.length === 0
            ? <div style={{ textAlign: 'center', color: '#7A8699', fontSize: 13, padding: '20px 0' }}>Sem pombos ainda</div>
            : data.top.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < data.top.length - 1 ? '1px solid #1B2D52' : 'none' }}>
                <span style={{ fontFamily: "'Fraunces',serif", fontSize: 16, fontWeight: 900, width: 18, color: i === 0 ? '#D4AF37' : i === 1 ? '#cbd5e1' : i === 2 ? '#b45309' : '#475569' }}>{i + 1}</span>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#101F40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, overflow: 'hidden', flexShrink: 0 }}>
                  {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.emoji || '🐦')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                </div>
                <div style={{ width: 50 }}>
                  <div className="progress"><div className="progress-bar" style={{ width: `${p.percentil || 0}%`, background: (p.percentil || 0) >= 60 ? '#2DD4A7' : (p.percentil || 0) >= 35 ? '#D4AF37' : '#f87171' }} /></div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 32, textAlign: 'right' }}>{p.percentil || 0}%</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
