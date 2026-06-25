import { useState, useEffect } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner } from '../components/ui'
import { BotaoWhatsApp, textoCartaoVisita } from '../components/Partilha'
import { ConquistaCard } from '../components/Conquistas'

export default function Dashboard({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clima, setClima] = useState(null)
  const nome = user?.user_metadata?.nome?.split(' ')[0] || 'Columbófilo'
  const h = new Date().getHours()
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [pombos, provas, fin, saude, treinos, tarefas, acas, stock, eventos, treatmentPlans, treatmentApps, treatmentProducts, perfil, conquistasRecentes] = await Promise.all([
          db.getPombos(),
          db.getProvas(),
          db.getFinancas(),
          supabase.from('health').select('*').order('created_at', { ascending: false }).limit(10).then(r => r.data || []),
          supabase.from('treinos').select('*').order('data_reg', { ascending: false }).limit(3).then(r => r.data || []),
          db.getTarefas(),
          supabase.from('breeding').select('*').eq('estado', 'em_progresso').then(r => r.data || []),
          db.getStock().catch(() => []),
          db.getEventosCal().catch(() => []),
          db.getTreatmentPlans().catch(() => []),
          db.getTreatmentApplications().catch(() => []),
          db.getTreatmentProducts().catch(() => []),
          db.getPerfil().catch(() => null),
          supabase.from('conquistas').select('*').eq('user_id', (await supabase.auth.getUser()).data.user?.id).order('created_at', { ascending:false }).limit(3).then(r => r.data || []),
        ])

        // Clima do pombal via Open-Meteo
        if (perfil?.pombal_lat && perfil?.pombal_lon) {
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${perfil.pombal_lat}&longitude=${perfil.pombal_lon}&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m&wind_speed_unit=ms&timezone=auto`)
            .then(r => r.json())
            .then(d => {
              const wc = d.current?.weathercode
              const icon = wc <= 1 ? '☀️' : wc <= 3 ? '⛅' : wc <= 48 ? '🌫️' : wc <= 67 ? '🌧️' : wc <= 77 ? '❄️' : '⛈️'
              setClima({ temp: Math.round(d.current?.temperature_2m), wind: Math.round(d.current?.windspeed_10m * 3.6), humidity: d.current?.relative_humidity_2m, icon })
            }).catch(() => {})
        }

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
        const provasHoje = provas.filter(p => p.data_reg === hoje)
        const tarefasHojeOuAtraso = tarefas.filter(t => t.estado !== 'concluida' && t.data_prevista && t.data_prevista <= hoje)
        const tarefasProximas = tarefas.filter(t => t.estado !== 'concluida' && t.data_prevista && t.data_prevista > hoje && t.data_prevista <= em7dias)
        const eventosHoje = eventos.filter(e => e.data_evento === hoje)

        // Eclosões próximas (nos próximos 5 dias)
        const eclosoesProximas = acas.filter(a => {
          if (!a.data_eclosao_prev) return false
          const d = Math.round((new Date(a.data_eclosao_prev) - new Date()) / 86400000)
          return d >= -1 && d <= 5
        }).sort((a, b) => new Date(a.data_eclosao_prev) - new Date(b.data_eclosao_prev))

        const segundaDesta = (() => {
          const d = new Date(); const diff = (d.getDay() + 6) % 7
          d.setDate(d.getDate() - diff); return d.toISOString().slice(0, 10)
        })()
        const DIA_KEYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
        const hojeKey = DIA_KEYS[new Date().getDay()]
        const aplicacaoHoje = treatmentApps.find(a => a.semana_inicio === segundaDesta)
        const planoHoje = aplicacaoHoje ? treatmentPlans.find(p => p.id === aplicacaoHoje.plan_id) : null
        const itemTratamentoHoje = planoHoje?.itens?.find(it => it.dia_semana === hojeKey) || null
        const produtoTratamentoHoje = itemTratamentoHoje ? treatmentProducts.find(p => p.id === itemTratamentoHoje.product_id) : null

        const alertas = []
        const tarefasAtraso = tarefas.filter(t => t.estado !== 'concluida' && t.data_prevista && t.data_prevista < hoje)
        if (tarefasAtraso.length > 0) alertas.push({ tipo:'tarefa', icon:'⏰', texto:`${tarefasAtraso.length} tarefa(s) em atraso`, cor:'#f87171', page:'checklist' })
        const stockBaixo = stock.filter(s => s.qtd_minima && s.qtd <= s.qtd_minima)
        stockBaixo.forEach(s => alertas.push({ tipo:'stock', icon:'🌾', texto:`${s.nome} a acabar (${s.qtd}${s.unidade||''})`, cor:'#D4AF37', page:'alimentacao' }))
        const mediaEfectivo = top.length ? top.reduce((s, p) => s + (p.percentil || 0), 0) / top.length : 0
        pombosAtivos.filter(p => (p.percentil||0) > 0 && (p.percentil||0) < mediaEfectivo - 25 && (p.provas||0) >= 3).slice(0,3)
          .forEach(p => alertas.push({ tipo:'desempenho', icon:'📉', texto:`${p.nome} em queda (${p.percentil}%)`, cor:'#f87171', page:'pombos' }))
        const diasSemSaude = saude[0]?.created_at ? Math.floor((Date.now()-new Date(saude[0].created_at))/86400000) : null
        if (diasSemSaude !== null && diasSemSaude > 60) alertas.push({ tipo:'saude', icon:'🏥', texto:`Sem registo de saúde há ${diasSemSaude} dias`, cor:'#D4AF37', page:'saude' })
        if (eclosoesProximas.length > 0) alertas.push({ tipo:'eclosao', icon:'🐣', texto:`${eclosoesProximas.length} eclosão(ões) prevista(s) nos próximos 5 dias`, cor:'#c084fc', page:'reproducao' })
        if (provasHoje.length > 0) alertas.push({ tipo:'prova', icon:'🏆', texto:`${provasHoje.length} prova(s) hoje — verifica resultados`, cor:'#2DD4A7', page:'provas' })

        setData({
          pombos, provas, saldo: rec - dep, rec, dep,
          ativos: pombosAtivos.length,
          total: pombos.filter(p => !p.estado_ext || p.estado_ext === 'proprio').length,
          top, vitorias, treinos, acas, ano, perfil,
          provasProximas, provasHoje, tarefasHojeOuAtraso, tarefasProximas,
          eventosHoje, alertas, eclosoesProximas,
          itemTratamentoHoje, aplicacaoHoje, hojeKey, produtoTratamentoHoje,
          conquistasRecentes,
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

  const totalHoje = data.tarefasHojeOuAtraso.length + data.eventosHoje.length + data.provasProximas.filter(p => p.data_reg === hojeStr).length + (data.itemTratamentoHoje ? 1 : 0)

  const toggleTratamentoHoje = async () => {
    if (!data.aplicacaoHoje) return
    try {
      const novoEstado = { ...data.aplicacaoHoje.estado_dias, [data.hojeKey]: !data.aplicacaoHoje.estado_dias[data.hojeKey] }
      await db.updateTreatmentApplication(data.aplicacaoHoje.id, { estado_dias: novoEstado })
      setData(d => ({ ...d, aplicacaoHoje: { ...d.aplicacaoHoje, estado_dias: novoEstado } }))
    } catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  return (
    <div>
      {/* Header premium com clima */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.15)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#1E5FD9,#D4AF37)' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:11, color:'#475569', marginBottom:2 }}>{new Date().toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long'})}</div>
            <div style={{ fontSize:20, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>{saudacao}, {nome} 🕊️</div>
            {data.perfil?.pombal_nome && <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>🏠 {data.perfil.pombal_nome}</div>}
          </div>
          {/* Clima */}
          {clima && (
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:28 }}>{clima.icon}</div>
              <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{clima.temp}°C</div>
              <div style={{ fontSize:10, color:'#7A8699' }}>💨 {clima.wind}km/h · 💧{clima.humidity}%</div>
            </div>
          )}
        </div>
        {/* Resumo rápido */}
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          {[
            [data.alertas.filter(a=>a.tipo==='prova').length > 0 ? '🏆' : '🕊️', `${data.ativos} activos`, '#2DD4A7'],
            data.eclosoesProximas?.length > 0 ? ['🐣',`${data.eclosoesProximas.length} eclosão(ões)`,'#c084fc'] : ['🥚',`${data.acas.length} casais`,'#94a3b8'],
            data.alertas.length > 0 ? ['⚠️',`${data.alertas.length} alerta(s)`,'#f87171'] : ['✅','Sem alertas','#2DD4A7'],
          ].map(([icon,txt,cor])=>(
            <div key={txt} style={{ flex:1, padding:'6px 8px', background:'rgba(255,255,255,.04)', borderRadius:8, textAlign:'center' }}>
              <div style={{ fontSize:14 }}>{icon}</div>
              <div style={{ fontSize:10, color:cor, fontWeight:600 }}>{txt}</div>
            </div>
          ))}
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
              {data.itemTratamentoHoje && (() => {
                const feito = !!data.aplicacaoHoje.estado_dias[data.hojeKey]
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#101F40', borderRadius: 8 }}>
                    <button onClick={toggleTratamentoHoje} style={{ width: 18, height: 18, borderRadius: 5, border: feito ? 'none' : '2px solid #1B2D52', background: feito ? '#2DD4A7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 11, padding: 0 }}>
                      {feito && '✓'}
                    </button>
                    <div style={{ flex: 1, fontSize: 13, color: feito ? '#7A8699' : '#fff', textDecoration: feito ? 'line-through' : 'none' }}>🧪 {data.produtoTratamentoHoje?.nome || 'Tratamento'}{data.produtoTratamentoHoje?.dosagem_valor ? ` — ${data.produtoTratamentoHoje.dosagem_valor}${data.produtoTratamentoHoje.dosagem_unidade || ''}` : ''}</div>
                    <span style={{ fontSize: 11, color: '#D4AF37' }} onClick={() => nav('tratamentos')}>Hoje</span>
                  </div>
                )
              })()}
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

      {/* Conquistas recentes + Cartão de visita */}
      <div className="grid-2" style={{ marginBottom:14 }}>
        {data.conquistasRecentes?.length > 0 && (
          <div className="card card-p">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontWeight:700, color:'#fff', fontSize:14 }}>🏅 Conquistas recentes</div>
              <button className="btn btn-secondary btn-sm" onClick={() => nav('conquistas')}>Ver todas →</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {data.conquistasRecentes.map(c => <ConquistaCard key={c.tipo} c={c} obtida/>)}
            </div>
          </div>
        )}
        <div className="card card-p">
          <div style={{ fontFamily:"'Fraunces',serif", fontWeight:700, color:'#fff', fontSize:14, marginBottom:12 }}>📤 Cartão de Visita</div>
          <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.2)', borderRadius:10, padding:'14px', marginBottom:12, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,#D4AF37,#4C8DFF)' }}/>
            <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:4 }}>{data.perfil?.nome || nome}</div>
            <div style={{ fontSize:11, color:'#7A8699', marginBottom:6 }}>🏠 {data.perfil?.pombal_nome || 'Pombal'}</div>
            <div style={{ display:'flex', gap:12, fontSize:11 }}>
              <span style={{ color:'#4C8DFF' }}>🐦 {data.ativos}</span>
              <span style={{ color:'#D4AF37' }}>📊 {mediaScore}%</span>
              <span style={{ color:'#2DD4A7' }}>🏆 {data.vitorias}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <BotaoWhatsApp texto={textoCartaoVisita(data.perfil, { total:data.ativos, provas:data.provas.length, mediaPercentil:mediaScore })} label="Partilhar"/>
            {data.perfil?.slug && <button className="btn btn-secondary btn-sm" onClick={()=>{navigator.clipboard?.writeText(`${window.location.origin}/p/${data.perfil.slug}`)}}>🔗 Link</button>}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, color: '#fff', fontSize: 14 }}>💰 Finanças {data.ano}</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('financas')}>Ver →</button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 900, color: '#2DD4A7' }}>{data.rec.toFixed(0)}€</div>
              <div style={{ fontSize: 10.5, color: '#7A8699' }}>RECEITAS</div>
            </div>
            <div style={{ width: 1, background: '#1B2D52' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 900, color: '#f87171' }}>{data.dep.toFixed(0)}€</div>
              <div style={{ fontSize: 10.5, color: '#7A8699' }}>DESPESAS</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: '#101F40', borderRadius: 8 }}>
            <span style={{ color: '#94a3b8' }}>Saldo</span>
            <span style={{ fontWeight: 700, color: data.saldo >= 0 ? '#2DD4A7' : '#f87171' }}>{data.saldo >= 0 ? '+' : ''}{data.saldo.toFixed(2)}€</span>
          </div>
        </div>

        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, color: '#fff', fontSize: 14 }}>🎯 Treinos Recentes</div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('treinos')}>Ver →</button>
          </div>
          {data.treinos.length === 0
            ? <div style={{ textAlign: 'center', color: '#7A8699', fontSize: 13, padding: '10px 0' }}>Sem treinos registados</div>
            : data.treinos.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #1B2D52' }}>
                <span style={{ fontSize: 16 }}>🎯</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.local}</div>
                  <div style={{ fontSize: 10.5, color: '#7A8699' }}>{t.dist ? t.dist + 'km · ' : ''}{t.pombos_n || '?'} pombos · {t.retorno}</div>
                </div>
                <div style={{ fontSize: 10.5, color: '#7A8699' }}>{t.data_reg ? new Date(t.data_reg).toLocaleDateString('pt-PT') : '—'}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
