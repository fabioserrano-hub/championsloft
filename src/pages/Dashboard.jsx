import { useState, useEffect } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, KpiCard } from '../components/ui'

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
        const [pombos, provas, fin, saude, treinos, tarefas, acas] = await Promise.all([
          db.getPombos(),
          db.getProvas(),
          db.getFinancas(),
          supabase.from('health').select('*').order('created_at', { ascending: false }).limit(3).then(r => r.data || []),
          supabase.from('treinos').select('*').order('data_reg', { ascending: false }).limit(3).then(r => r.data || []),
          supabase.from('tarefas').select('*').eq('estado', 'por_iniciar').then(r => r.data || []),
          supabase.from('breeding').select('*').eq('estado', 'em_progresso').then(r => r.data || []),
        ])
        const ano = new Date().getFullYear()
        const hoje = new Date().toISOString().slice(0, 10)
        const finAno = fin.filter(t => new Date(t.data_reg).getFullYear() === ano)
        const rec = finAno.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.val || 0), 0)
        const dep = finAno.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (t.val || 0), 0)
        const tarefasAtraso = tarefas.filter(t => t.data_prevista && t.data_prevista < hoje)
        const top = [...pombos].sort((a, b) => (b.percentil || 0) - (a.percentil || 0)).slice(0, 5)
        const vitorias = provas.filter(p => p.lugar === 1).length
        const pombosAtivos = pombos.filter(p => (!p.estado_ext || p.estado_ext === 'proprio') && p.estado === 'ativo')
        setData({
          pombos, provas, saldo: rec - dep, rec, dep,
          ativos: pombosAtivos.length,
          total: pombos.filter(p => !p.estado_ext || p.estado_ext === 'proprio').length,
          top, vitorias, saude, treinos, tarefasAtraso, acas, ano
        })
      } catch (e) { toast('Erro: ' + e.message, 'err') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spinner lg /></div>

  const mediaScore = data.top.length ? Math.round(data.top.reduce((s, p) => s + (p.percentil || 0), 0) / data.top.length) : 0
  const corScore = s => s >= 80 ? '#1ed98a' : s >= 60 ? '#facc15' : s >= 40 ? '#60a5fa' : '#f87171'

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{saudacao}, {nome} 👋</h1>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        {data.tarefasAtraso.length > 0 && (
          <button onClick={() => nav('checklist')} style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#f87171', fontFamily: 'inherit' }}>
            ⚠️ {data.tarefasAtraso.length} tarefa(s) em atraso
          </button>
        )}
      </div>

      <div className="grid-4 mb-4">
        <KpiCard icon="🐦" label="Pombos Activos" value={data.ativos} color="text-green" onClick={() => nav('pombos')} />
        <KpiCard icon="🏆" label={`Provas ${data.ano}`} value={data.provas.length} color="text-yellow" onClick={() => nav('provas')} />
        <KpiCard icon="🥇" label="Vitórias" value={data.vitorias} color="text-green" onClick={() => nav('provas')} />
        <div className="kpi" onClick={() => nav('financas')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 20 }}>💶</div>
          <div className="kpi-val" style={{ color: data.saldo >= 0 ? '#1ed98a' : '#f87171', fontSize: 28 }}>{data.saldo >= 0 ? '+' : ''}{data.saldo.toFixed(0)}€</div>
          <div className="kpi-label">Saldo {data.ano}</div>
        </div>
      </div>

      <div className="grid-4 mb-6">
        <KpiCard icon="🥚" label="Acasalamentos Activos" value={data.acas.length} color="text-yellow" onClick={() => nav('reproducao')} />
        <KpiCard icon="📊" label="Score Médio" value={mediaScore + '%'} color="text-blue" onClick={() => nav('fimepoca')} />
        <KpiCard icon="🏠" label="Total Efectivo" value={data.total} onClick={() => nav('pombos')} />
        <KpiCard icon="✅" label="Tarefas Pendentes" value={data.tarefasAtraso.length} color={data.tarefasAtraso.length > 0 ? 'text-red' : 'text-green'} onClick={() => nav('checklist')} />
      </div>

      <div className="grid-2 mb-4">
        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, color: '#fff' }}>🏅 Top Pombos</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('pombos')}>Ver todos →</button>
          </div>
          {data.top.length === 0
            ? <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '20px 0' }}>Sem pombos ainda</div>
            : data.top.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < data.top.length - 1 ? '1px solid #1e3050' : 'none' }}>
                <span style={{ fontFamily: 'Barlow Condensed', fontSize: 18, fontWeight: 700, width: 20, color: i === 0 ? '#facc15' : i === 1 ? '#cbd5e1' : i === 2 ? '#b45309' : '#475569' }}>{i + 1}</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a2840', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden', flexShrink: 0 }}>
                  {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.emoji || '🐦'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#64748b' }}>{p.anilha}</div>
                </div>
                <div style={{ width: 60 }}>
                  <div className="progress"><div className="progress-bar" style={{ width: `${p.percentil || 0}%`, background: corScore(p.percentil || 0) }} /></div>
                  <div style={{ fontSize: 10, color: corScore(p.percentil || 0), textAlign: 'right', fontWeight: 700 }}>{p.percentil || 0}%</div>
                </div>
              </div>
            ))
          }
        </div>

        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, color: '#fff' }}>🏆 Provas Recentes</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('provas')}>Ver todas →</button>
          </div>
          {data.provas.length === 0
            ? <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '20px 0' }}>Sem provas registadas</div>
            : data.provas.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1e3050' }}>
                <span style={{ fontSize: 18 }}>🏆</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{p.dist}km · {p.local_solta || '—'} · {new Date(p.data_reg).toLocaleDateString('pt-PT')}</div>
                </div>
                {p.lugar && <div style={{ fontFamily: 'Barlow Condensed', fontSize: 20, fontWeight: 700, color: p.lugar === 1 ? '#facc15' : p.lugar <= 3 ? '#cbd5e1' : '#94a3b8' }}>{p.lugar}º</div>}
              </div>
            ))
          }
        </div>
      </div>

      <div className="grid-2 mb-4">
        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, color: '#fff' }}>💰 Finanças {data.ano}</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('financas')}>Ver →</button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: 28, fontWeight: 700, color: '#1ed98a' }}>{data.rec.toFixed(0)}€</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>RECEITAS</div>
            </div>
            <div style={{ width: 1, background: '#1e3050' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: 28, fontWeight: 700, color: '#f87171' }}>{data.dep.toFixed(0)}€</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>DESPESAS</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: '#1a2840', borderRadius: 8 }}>
            <span style={{ color: '#94a3b8' }}>Saldo</span>
            <span style={{ fontWeight: 700, color: data.saldo >= 0 ? '#1ed98a' : '#f87171' }}>{data.saldo >= 0 ? '+' : ''}{data.saldo.toFixed(2)}€</span>
          </div>
        </div>

        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, color: '#fff' }}>🥚 Reprodução Activa</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('reproducao')}>Ver →</button>
          </div>
          {data.acas.length === 0
            ? <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '10px 0' }}>Sem acasalamentos activos</div>
            : data.acas.slice(0, 3).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #1e3050' }}>
                <span style={{ fontSize: 18 }}>🥚</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{a.pai_nome?.split('(')[0] || '—'} × {a.mae_nome?.split('(')[0] || '—'}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{a.cacifo ? `Cacifo ${a.cacifo} · ` : ''}{a.ninhadas || 0} ninhadas</div>
                </div>
                {a.data_eclosao_prev && <div style={{ fontSize: 11, color: '#facc15' }}>🐣 {new Date(a.data_eclosao_prev).toLocaleDateString('pt-PT')}</div>}
              </div>
            ))
          }
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, color: '#fff' }}>🎯 Treinos Recentes</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('treinos')}>Ver →</button>
          </div>
          {data.treinos.length === 0
            ? <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '10px 0' }}>Sem treinos registados</div>
            : data.treinos.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #1e3050' }}>
                <span style={{ fontSize: 18 }}>🎯</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{t.local}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{t.dist ? t.dist + 'km · ' : ''}{t.pombos_n || '?'} pombos · {t.retorno}</div>
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{t.data_reg ? new Date(t.data_reg).toLocaleDateString('pt-PT') : '—'}</div>
              </div>
            ))
          }
        </div>

        <div className="card card-p">
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: 14 }}>⚡ Acesso Rápido</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['🐦', 'Novo Pombo', 'pombos'],
              ['🏆', 'Nova Prova', 'provas'],
              ['🎯', 'Novo Treino', 'treinos'],
              ['🏥', 'Registo Saúde', 'saude'],
              ['💰', 'Nova Transacção', 'financas'],
              ['✅', 'Checklist', 'checklist'],
              ['🥚', 'Reprodução', 'reproducao'],
              ['🏁', 'Fim de Época', 'fimepoca'],
            ].map(([icon, label, page]) => (
              <button key={page} onClick={() => nav(page)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#1a2840', border: '1px solid #1e3050', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .15s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#1ed98a'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#1e3050'}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

