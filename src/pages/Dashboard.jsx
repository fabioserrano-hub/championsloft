import { useState, useEffect } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIdioma } from '../hooks/useIdioma'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'
import { useToast, Spinner } from '../components/ui'

// ── helpers ───────────────────────────────────────────────────────────────────
function arredondarLitros(ml) {
  const l = ml / 1000
  if (l <= 0.5) return 0.5
  if (l <= 1)   return 1
  if (l <= 1.5) return 1.5
  if (l <= 2)   return 2
  if (l <= 2.5) return 2.5
  return Math.ceil(l * 2) / 2
}

function calcDoseStr(prod, nPombos, mlPorPombo) {
  if (!prod?.dosagem_valor) return null
  const litros = arredondarLitros(mlPorPombo * nPombos)
  if (prod.dosagem_base === 'pombo') return (prod.dosagem_valor * nPombos).toFixed(1) + prod.dosagem_unidade
  if (prod.dosagem_base === 'litro') return (prod.dosagem_valor * litros).toFixed(1) + prod.dosagem_unidade
  return prod.dosagem_valor + prod.dosagem_unidade + '/' + prod.dosagem_base
}

function segundaFeira(data = new Date()) {
  const d = new Date(data); d.setDate(d.getDate() - (d.getDay() + 6) % 7)
  return d.toISOString().slice(0, 10)
}

const MODO_ICON = { agua: '💧', racao: '🌾', direto: '💊', outros: '🛁' }
const ESP_COLOR = { velocidade: '#F59E0B', meio_fundo: '#3B82F6', fundo: '#10B981', geral: '#8B5CF6' }
const getEspLabel = (t) => ({ velocidade: t('velocidade'), meio_fundo: t('meioFundo'), fundo: t('fundo'), geral: t('geral') })
const getDias = (t) => [t('domingo'),t('segunda'),t('terca'),t('quarta'),t('quinta'),t('sexta'),t('sabado')]
const getMeses = (t) => [t('janeiro'),t('fevereiro'),t('marco'),t('abril'),t('maio'),t('junho'),t('julho'),t('agosto'),t('setembro'),t('outubro'),t('novembro'),t('dezembro')]

function formatData(d) {
  const dt = new Date(d)
  return dt.getDate() + ' ' + getMeses(t)[dt.getMonth()]
}

// ── sub-componentes ───────────────────────────────────────────────────────────
function CardKPI({ icon, valor, label, cor, onClick, sub }) {
  return (
    <div onClick={onClick} style={{ textAlign:'center', padding:'12px 6px', background:'#0B1830', border:`1px solid ${cor}30`, borderRadius:12, cursor:onClick?'pointer':'default', transition:'all .2s', position:'relative', overflow:'hidden' }}
      onMouseEnter={e=>{ if(onClick) e.currentTarget.style.borderColor=cor+'60' }}
      onMouseLeave={e=>{ if(onClick) e.currentTarget.style.borderColor=cor+'30' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:cor, opacity:.6 }} />
      <div style={{ fontSize:18, marginBottom:3 }}>{icon}</div>
      <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:cor, lineHeight:1 }}>{valor}</div>
      <div style={{ fontSize:9, color:'#7A8699', marginTop:3, textTransform:'uppercase', letterSpacing:.5 }}>{label}</div>
      {sub && <div style={{ fontSize:9, color:'#475569', marginTop:1 }}>{sub}</div>}
    </div>
  )
}

function SecaoTitulo({ icon, titulo, acao, onAcao }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
      <div style={{ fontFamily:"'Fraunces',serif", fontWeight:700, color:'#fff', fontSize:14 }}>{icon} {titulo}</div>
      {acao && <button className="btn btn-secondary btn-sm" onClick={onAcao}>{acao}</button>}
    </div>
  )
}

// ── componente principal ──────────────────────────────────────────────────────
export default function Dashboard({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useIdioma()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandirTratamento, setExpandirTratamento] = useState(false)
  const [mlPorPombo] = useState(60)

  const nome = user?.user_metadata?.nome?.split(' ')[0] || 'Columbófilo'
  const agora = new Date()
  const h = agora.getHours()
  const saudacao = h < 12 ? t('bomDia') : h < 18 ? t('boaTarde') : t('boaNoite')
  const diaSemana = getDias(t)[agora.getDay()]
  const dataHoje = agora.getDate() + ' ' + t('de') + ' ' + getMeses(t)[agora.getMonth()] + ' ' + t('de') + ' ' + agora.getFullYear()
  const hojeKey = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][agora.getDay()]

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const semanaAtual = segundaFeira()
        const hojeStr = agora.toISOString().slice(0, 10)

        const [pombos, provas, fin, saude, tarefas, planos, aplicacoes, produtos, stockRaw, checklist] = await Promise.all([
          db.getPombos().catch(() => []),
          db.getProvas().catch(() => []),
          db.getFinancas().catch(() => []),
          supabase.from('health').select('*').order('created_at', { ascending: false }).limit(20).then(r => r.data || []),
          db.getTarefas().catch(() => []),
          db.getTreatmentPlans().catch(() => []),
          db.getTreatmentApplications().catch(() => []),
          db.getTreatmentProducts().catch(() => []),
          db.getStock().catch(() => []),
          supabase.from('checklist').select('*').eq('concluida', false).then(r => r.data || []).catch(() => []),
        ])

        // pombos
        const pombosAtivos = pombos.filter(p => (!p.estado_ext || p.estado_ext === 'proprio') && p.estado === 'ativo')
        const pombosDoentes = saude.filter(s => s.apt === false || s.aptidao === 'inapto').map(s => s.pigeon_id || s.pombo_id).filter(Boolean)
        const pombosComProblema = [...new Set(pombosDoentes)]
        const top5 = [...pombosAtivos].sort((a, b) => (b.percentil || 0) - (a.percentil || 0)).slice(0, 5)

        // provas
        const hojeISO = hojeStr
        const provasFuturas = provas.filter(p => p.data_reg >= hojeISO).sort((a, b) => a.data_reg.localeCompare(b.data_reg))
        const proximaProva = provasFuturas[0] || null
        const diasParaProva = proximaProva ? Math.ceil((new Date(proximaProva.data_reg) - agora) / 86400000) : null
        const provasRecentes = [...provas].sort((a, b) => new Date(b.data_reg) - new Date(a.data_reg)).slice(0, 4)
          const amanha = new Date(agora.getTime()+86400000).toISOString().slice(0,10)
          const provasEmCurso = provas.filter(p => p.estado_encestamento === 'encestado' && p.data_reg >= hojeISO)
          const provaHoje = provas.find(p => p.data_reg === hojeISO) || null
          const provaEncestamentoHoje = provas.find(p => p.data_reg === amanha && p.estado_encestamento !== 'encestado') || null
        const vitorias = provas.filter(p => p.posicao_geral === 1).length

        // finanças
        const rec = fin.filter(f => f.tipo === 'receita').reduce((s, f) => s + (f.valor || 0), 0)
        const dep = fin.filter(f => f.tipo === 'despesa').reduce((s, f) => s + (f.valor || 0), 0)

        // tarefas atrasadas
        const tarefasAtraso = tarefas.filter(t => t.estado !== 'concluida' && t.data_prevista && t.data_prevista < hojeISO)

        // plano de tratamento ativo
        const aplicacaoAtiva = aplicacoes.find(a => a.semana_inicio === semanaAtual)
        const planoAtivo = aplicacaoAtiva ? planos.find(p => p.id === aplicacaoAtiva.plan_id) : null
        const nPombosPlano = aplicacaoAtiva?.pombos_ids?.length || aplicacaoAtiva?.n_pombos || 0

        // merge armazém
        const produtosArmazem = produtos.map(p => {
          const stk = stockRaw.find(s => s.nome.toLowerCase() === p.nome.toLowerCase())
          return { ...p, qtd: stk?.qtd ?? 0, unidade: stk?.unidade ?? p.dosagem_unidade ?? 'ml', _stock_id: stk?.id ?? null }
        })

        // itens de hoje do plano
        const itensManha = (planoAtivo?.itens || []).filter(i => i.dia_semana === hojeKey && i.periodo !== 'tarde')
        const itensTarde = (planoAtivo?.itens || []).filter(i => i.dia_semana === hojeKey && i.periodo === 'tarde')

        // alertas de stock
        const alertasStockHoje = produtosArmazem.filter(p => {
          if (!p.qtd_minima) return false
          return p.qtd <= parseFloat(p.qtd_minima)
        })

        // percentil médio top5
        const mediaPercentil = top5.length ? Math.round(top5.reduce((s, p) => s + (p.percentil || 0), 0) / top5.length) : 0

        // checklist pendente hoje
        const checklistHoje = checklist.filter(c => !c.data_prevista || c.data_prevista <= hojeISO).slice(0, 5)

        setData({
          pombosAtivos, pombosComProblema, top5, mediaPercentil,
          proximaProva, diasParaProva, provasRecentes, vitorias, provasEmCurso, provaHoje, provaEncestamentoHoje,
          rec, dep, tarefasAtraso,
          planoAtivo, aplicacaoAtiva, nPombosPlano, itensManha, itensTarde,
          produtosArmazem, alertasStockHoje,
          checklistHoje, checklist,
          totalPombos: pombosAtivos.length,
        })
      } catch (e) {
        toast('Erro ao carregar: ' + e.message, 'err')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spinner lg /></div>
  if (!data) return null

  const getProd = id => data.produtosArmazem.find(p => p.id === id)

  // render item de tratamento (compacto)
  const renderItemTrat = (item, i) => {
    const prod = getProd(item.product_id)
    if (!prod) return null
    const dose = calcDoseStr(prod, data.nPombosPlano, mlPorPombo)
    const feito = !!data.aplicacaoAtiva?.estado_dias?.[`${item.dia_semana}_${item.periodo === 'tarde' ? 'tarde' : 'manha'}`]
    return (
      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
        <div style={{ width:16, height:16, borderRadius:4, background:feito?'#2DD4A7':'transparent', border:feito?'none':'1px solid #1B2D52', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>
          {feito && '✓'}
        </div>
        <span style={{ fontSize:12, color:feito?'#475569':'#e2e8f0', textDecoration:feito?'line-through':'none', flex:1 }}>
          {MODO_ICON[prod.modo]} {prod.nome}
        </span>
        {dose && <span style={{ fontSize:11, color:feito?'#334155':'#2DD4A7', fontWeight:600, flexShrink:0 }}>{dose}</span>}
      </div>
    )
  }

  const temTratamentoHoje = data.itensManha.length > 0 || data.itensTarde.length > 0
  const totalAlertas = data.tarefasAtraso.length + data.alertasStockHoje.length + data.pombosComProblema.length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* ── HERO: saudação + data ──────────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg,#050D1A 0%,#0B1830 60%,#0D1F3C 100%)', border:'1px solid rgba(212,175,55,.2)', borderRadius:16, padding:'18px 18px 14px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#D4AF37,#4C8DFF,#2DD4A7)' }} />
        <div style={{ position:'absolute', top:-40, right:-40, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle,rgba(212,175,55,.06),transparent)', pointerEvents:'none' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:11, color:'#7A8699' }}>{saudacao},</div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:900, color:'#fff', lineHeight:1.1 }}>{nome} 🕊️</div>
            <div style={{ fontSize:11, color:'#475569', marginTop:4 }}>{diaSemana}, {dataHoje}</div>
          </div>
          {totalAlertas > 0 && (
            <div style={{ background:'rgba(248,113,113,.12)', border:'1px solid rgba(248,113,113,.25)', borderRadius:10, padding:'6px 10px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:'#f87171' }}>{totalAlertas}</div>
              <div style={{ fontSize:9, color:'#f87171', textTransform:'uppercase', letterSpacing:.5 }}>Alertas</div>
            </div>
          )}
        </div>
        {/* stats rápidos */}
        <div style={{ display:'flex', gap:16, marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,.05)' }}>
          <div style={{ fontSize:11, color:'#7A8699' }}>🐦 <span style={{ color:'#fff', fontWeight:600 }}>{data.totalPombos}</span> activos</div>
          <div style={{ fontSize:11, color:'#7A8699' }}>🏆 <span style={{ color:'#fff', fontWeight:600 }}>{data.provasRecentes.length}</span> provas</div>
          <div style={{ fontSize:11, color:'#7A8699' }}>🥇 <span style={{ color:'#fff', fontWeight:600 }}>{data.vitorias}</span> vitórias</div>
          {data.mediaPercentil > 0 && <div style={{ fontSize:11, color:'#7A8699' }}>📊 <span style={{ color:'#2DD4A7', fontWeight:600 }}>{data.mediaPercentil}%</span> percentil</div>}
        </div>
      </div>

      {/* ── ALERTAS (se existirem) ────────────────────────────────────────── */}
      {totalAlertas > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {data.tarefasAtraso.length > 0 && (
            <div onClick={() => nav('checklist')} style={{ background:'rgba(248,113,113,.07)', border:'1px solid rgba(248,113,113,.2)', borderRadius:10, padding:'10px 14px', cursor:'pointer', display:'flex', gap:10, alignItems:'center' }}>
              <span style={{ fontSize:18 }}>⏰</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#f87171' }}>{data.tarefasAtraso.length} tarefa(s) em atraso</div>
                <div style={{ fontSize:11, color:'#7A8699' }}>{data.tarefasAtraso.slice(0,2).map(t=>t.titulo).join(' · ')}</div>
              </div>
              <span style={{ color:'#475569', fontSize:12 }}>→</span>
            </div>
          )}
          {data.alertasStockHoje.length > 0 && (
            <div onClick={() => nav('alimentacao')} style={{ background:'rgba(234,179,8,.07)', border:'1px solid rgba(234,179,8,.2)', borderRadius:10, padding:'10px 14px', cursor:'pointer', display:'flex', gap:10, alignItems:'center' }}>
              <span style={{ fontSize:18 }}>📦</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#D4AF37' }}>{data.alertasStockHoje.length} produto(s) com stock baixo</div>
                <div style={{ fontSize:11, color:'#7A8699' }}>{data.alertasStockHoje.slice(0,2).map(p=>p.nome).join(' · ')}</div>
              </div>
              <span style={{ color:'#475569', fontSize:12 }}>→</span>
            </div>
          )}
          {data.pombosComProblema.length > 0 && (
            <div onClick={() => nav('saude')} style={{ background:'rgba(168,85,247,.07)', border:'1px solid rgba(168,85,247,.2)', borderRadius:10, padding:'10px 14px', cursor:'pointer', display:'flex', gap:10, alignItems:'center' }}>
              <span style={{ fontSize:18 }}>🏥</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#A855F7' }}>{data.pombosComProblema.length} pombo(s) com registo de saúde</div>
              </div>
              <span style={{ color:'#475569', fontSize:12 }}>→</span>
            </div>
          )}
        </div>
      )}

      {/* ── BANNER POMBOS EM PROVA ─────────────────────────────────────────── */}
      {data.provasEmCurso && data.provasEmCurso.length > 0 && (
        <div style={{ background:'linear-gradient(135deg,rgba(45,212,167,.12),rgba(11,24,48,.9))', border:'1px solid rgba(45,212,167,.3)', borderRadius:14, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:'#2DD4A7' }} />
          <div style={{ paddingLeft:8 }}>
            <div style={{ fontSize:10, color:'#2DD4A7', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>🏁 Pombos em Prova</div>
            {data.provasEmCurso.map(p => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6, flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{p.nome}</div>
                  <div style={{ fontSize:11, color:'#7A8699' }}>
                    {(p.pombos_encestados||[]).length} pombos · {p.dist}km
                    {p.cesto ? ' · 🧺 '+p.cesto : ''}
                    {p.hora_encestamento ? ' · 🕐 '+p.hora_encestamento : ''}
                  </div>
                </div>
                <button onClick={() => nav('provas')} style={{ background:'rgba(45,212,167,.15)', border:'1px solid rgba(45,212,167,.3)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, color:'#2DD4A7', fontFamily:'inherit', fontWeight:600 }}>
                  Registar Chegadas →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BANNER ENCESTAMENTO AMANHÃ ───────────────────────────────────── */}
      {data.provaEncestamentoHoje && !(data.provasEmCurso && data.provasEmCurso.length > 0) && (
        <div onClick={() => nav('provas')} style={{ background:'linear-gradient(135deg,rgba(212,175,55,.1),rgba(11,24,48,.9))', border:'1px solid rgba(212,175,55,.3)', borderRadius:14, padding:'14px 16px', cursor:'pointer', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:'#D4AF37' }} />
          <div style={{ paddingLeft:8 }}>
            <div style={{ fontSize:10, color:'#D4AF37', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>📦 Dia de Encestamento — Prova Amanhã</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{data.provaEncestamentoHoje.nome}</div>
                <div style={{ fontSize:11, color:'#7A8699' }}>{data.provaEncestamentoHoje.tipo} · {data.provaEncestamentoHoje.dist}km · solta amanhã</div>
              </div>
              <div style={{ background:'rgba(212,175,55,.15)', border:'1px solid rgba(212,175,55,.3)', borderRadius:8, padding:'8px 14px', textAlign:'center', flexShrink:0 }}>
                <div style={{ fontSize:11, color:'#D4AF37', fontWeight:700 }}>📦 Encestar agora</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BANNER PROVA HOJE ────────────────────────────────────────────── */}
      {data.provaHoje && !(data.provasEmCurso || []).some(p => p.id === data.provaHoje.id) && (
        <div onClick={() => nav('provas')} style={{ background:'linear-gradient(135deg,rgba(248,113,113,.1),rgba(11,24,48,.9))', border:'1px solid rgba(248,113,113,.3)', borderRadius:14, padding:'14px 16px', cursor:'pointer', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:'#f87171' }} />
          <div style={{ paddingLeft:8 }}>
            <div style={{ fontSize:10, color:'#f87171', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>🚨 Prova Hoje</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{data.provaHoje.nome}</div>
                <div style={{ fontSize:11, color:'#7A8699' }}>{data.provaHoje.tipo} · {data.provaHoje.dist}km</div>
              </div>
              <button onClick={e => { e.stopPropagation(); nav('provas') }} style={{ background:'rgba(248,113,113,.15)', border:'1px solid rgba(248,113,113,.3)', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontFamily:'inherit', textAlign:'center', flexShrink:0 }}>
                <div style={{ fontSize:11, color:'#f87171', fontWeight:700 }}>🏆 Registar Chegadas</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PLANO DE HOJE (hero do dia) ────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg,#0B1830,#0D1F3C)', border:'1px solid rgba(76,141,255,.2)', borderRadius:14, overflow:'hidden' }}>
        {/* header */}
        <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:10, color:'#4C8DFF', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>☀️ Hoje no Pombal</div>
              {data.planoAtivo ? (
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{data.planoAtivo.nome}</div>
                  <div style={{ display:'inline-block', padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700, background:`${ESP_COLOR[data.planoAtivo.especialidade] || '#8B5CF6'}22`, color:ESP_COLOR[data.planoAtivo.especialidade] || '#8B5CF6', border:`1px solid ${ESP_COLOR[data.planoAtivo.especialidade] || '#8B5CF6'}44` }}>
                    {getEspLabel(t)[data.planoAtivo.especialidade]}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize:13, color:'#475569' }}>Sem plano de tratamento activo</div>
              )}
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              {data.planoAtivo && <div style={{ fontSize:11, color:'#7A8699' }}>👥 {data.nPombosPlano}</div>}
              <button onClick={() => nav('alimentacao')} style={{ background:'rgba(76,141,255,.1)', border:'1px solid rgba(76,141,255,.2)', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:11, color:'#4C8DFF', fontFamily:'inherit' }}>
                {data.planoAtivo ? t('verTudo')+' →' : t('configurar')+' →'}
              </button>
            </div>
          </div>
        </div>

        {/* conteúdo */}
        {data.planoAtivo && (
          <div style={{ padding:'12px 16px' }}>
            {!temTratamentoHoje ? (
              <div style={{ textAlign:'center', padding:'12px 0', fontSize:13, color:'#475569' }}>✅ Dia de descanso — sem tratamentos hoje</div>
            ) : (
              <>
                {/* manhã */}
                {data.itensManha.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#F59E0B', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>🌅 Manhã</div>
                    {(expandirTratamento ? data.itensManha : data.itensManha.slice(0,3)).map(renderItemTrat)}
                    {!expandirTratamento && data.itensManha.length > 3 && (
                      <div style={{ fontSize:11, color:'#475569', paddingTop:4 }}>+{data.itensManha.length - 3} mais…</div>
                    )}
                  </div>
                )}
                {/* tarde */}
                {data.itensTarde.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#60A5FA', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>🌆 Tarde</div>
                    {(expandirTratamento ? data.itensTarde : data.itensTarde.slice(0,3)).map(renderItemTrat)}
                    {!expandirTratamento && data.itensTarde.length > 3 && (
                      <div style={{ fontSize:11, color:'#475569', paddingTop:4 }}>+{data.itensTarde.length - 3} mais…</div>
                    )}
                  </div>
                )}
                {(data.itensManha.length > 3 || data.itensTarde.length > 3) && (
                  <button onClick={() => setExpandirTratamento(v => !v)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'#4C8DFF', padding:'6px 0 0', fontFamily:'inherit' }}>
                    {expandirTratamento ? '▲ Mostrar menos' : '▼ Mostrar tudo'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Banner eclosões próximas ─────────────────────────────────────── */}
      {(()=>{
        const ecls = data.acasalamentos?.filter(a=>{
          const d=a.data_eclosao_prev?Math.round((new Date(a.data_eclosao_prev)-new Date())/86400000):null
          return d!==null&&d>=-1&&d<=4
        })||[]
        if(!ecls.length) return null
        return (
          <div style={{background:'rgba(45,212,167,.07)',border:'1px solid rgba(45,212,167,.2)',borderRadius:12,padding:'10px 14px',marginBottom:8,cursor:'pointer'}} onClick={()=>nav('reproducao')}>
            <div style={{fontWeight:700,color:'#2DD4A7',marginBottom:4,fontSize:13}}>🐣 {ecls.length} eclosão(ões) prevista(s) esta semana</div>
            {ecls.slice(0,2).map(a=>{
              const d=Math.round((new Date(a.data_eclosao_prev)-new Date())/86400000)
              return <div key={a.id} style={{fontSize:11,color:'#94a3b8'}}>{a.pai_nome} × {a.mae_nome} — {d<=0?t('hojeOntem'):`${t('em')} ${d} ${t('dias')}`}</div>
            })}
          </div>
        )
      })()}

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        <CardKPI icon="🐦" valor={data.totalPombos} label={t('pombos')} cor="#4C8DFF" onClick={() => nav('pombos')} sub={data.pombosComProblema.length > 0 ? `${data.pombosComProblema.length} ${t('comAlerta')}` : t('activos')} />
        <CardKPI icon="🏆" valor={data.provasRecentes.length} label={t('provas')} cor="#D4AF37" onClick={() => nav('provas')} />
        <CardKPI icon="📊" valor={data.mediaPercentil + '%'} label={t('percentil')} cor="#2DD4A7" sub={t('top5')} />
        <CardKPI icon="🥇" valor={data.vitorias} label={t('vitorias')} cor="#A855F7" onClick={() => nav('provas')} />
      <GuiaAuto modulo="dashboard"/>
        <CardKPI icon="🏥" valor={data.pombosComProblema.length} label={t('alertasSaude')} cor={data.pombosComProblema.length>0?'#f87171':'#2DD4A7'} onClick={() => nav('saude')} sub={data.pombosComProblema.length>0?t('comProblema'):t('todosAptos')} />
        <CardKPI icon="💰" valor={(data.rec-data.dep).toFixed(0)+'€'} label={t('saldoMes')} cor={(data.rec-data.dep)>=0?'#2DD4A7':'#f87171'} onClick={() => nav('financas')} sub={`${data.rec.toFixed(0)}€ ${t('receita_abrev')}`} />
      </div>

      {/* ── PRÓXIMA PROVA ────────────────────────────────────────────────────── */}
      {data.proximaProva && (
        <div onClick={() => nav('provas')} style={{ background:'linear-gradient(135deg,rgba(212,175,55,.08),rgba(11,24,48,.9))', border:'1px solid rgba(212,175,55,.25)', borderRadius:14, padding:'14px 16px', cursor:'pointer', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:'linear-gradient(180deg,#D4AF37,#F59E0B)' }} />
          <div style={{ paddingLeft:8 }}>
            <div style={{ fontSize:10, color:'#D4AF37', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>📅 Próxima Prova</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{data.proximaProva.nome}</div>
                <div style={{ fontSize:11, color:'#7A8699', marginTop:3 }}>
                  {data.proximaProva.tipo || 'Prova'} · {data.proximaProva.dist || '—'}km · {formatData(data.proximaProva.data_reg)}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:28, fontWeight:900, color: data.diasParaProva <= 3 ? '#f87171' : data.diasParaProva <= 7 ? '#D4AF37' : '#fff', lineHeight:1 }}>{data.diasParaProva}</div>
                <div style={{ fontSize:9, color:'#7A8699', textTransform:'uppercase', letterSpacing:.5 }}>{data.diasParaProva === 1 ? t('amanha') : t('dias')}</div>
              </div>
            </div>
            {data.diasParaProva <= 7 && (
              <div style={{ marginTop:8, padding:'5px 10px', background:'rgba(212,175,55,.1)', borderRadius:6, fontSize:11, color:'#D4AF37', display:'inline-block' }}>
                {data.diasParaProva <= 1 ? t('provaAmanha') : data.diasParaProva <= 3 ? t('semanaProva') : t('preparacaoEmCurso')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ACÇÕES RÁPIDAS ───────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        {[
          { icon:'🏆', label:'Registar\nChegada', page:'provas', cor:'#D4AF37' },
          { icon:'🏥', label:t('regSaude'), page:'saude', cor:'#A855F7' },
          { icon:'🌾', label:t('alimentTratam'), page:'alimentacao', cor:'#2DD4A7' },
          { icon:'✅', label:t('checklist'), page:'checklist', cor:'#4C8DFF' },
        ].map(({ icon, label, page, cor }) => (
          <button key={page} onClick={() => nav(page)} style={{ background:'#0B1830', border:`1px solid ${cor}25`, borderRadius:12, padding:'12px 6px', cursor:'pointer', textAlign:'center', fontFamily:'inherit', transition:'all .2s', position:'relative', overflow:'hidden' }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=cor+'55'; e.currentTarget.style.background=`${cor}08` }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=cor+'25'; e.currentTarget.style.background='#0B1830' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:cor, opacity:.4 }} />
            <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
            <div style={{ fontSize:9, color:'#7A8699', lineHeight:1.4, whiteSpace:'pre-line' }}>{label}</div>
          </button>
        ))}
      </div>

      {/* ── CHECKLIST DO DIA ─────────────────────────────────────────────────── */}
      {data.checklistHoje.length > 0 && (
        <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
          <SecaoTitulo icon="✅" titulo={t('checklistDia')} acao={t('verTudo')+' →'} onAcao={() => nav('checklist')} />
          {data.checklistHoje.map((c, i) => (
            <div key={c.id || i} style={{ display:'flex', gap:10, alignItems:'center', padding:'7px 0', borderBottom: i < data.checklistHoje.length - 1 ? '1px solid #1B2D52' : 'none' }}>
              <div style={{ width:16, height:16, borderRadius:4, border:'1px solid #1B2D52', flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:'#e2e8f0' }}>{c.titulo || c.descricao}</div>
                {c.data_prevista && <div style={{ fontSize:10, color: c.data_prevista < agora.toISOString().slice(0,10) ? '#f87171' : '#475569' }}>📅 {formatData(c.data_prevista)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TOP POMBOS + ÚLTIMAS PROVAS (lado a lado em ecrãs largos) ───────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }}>
        {/* top pombos */}
        {data.top5.length > 0 && (
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
            <SecaoTitulo icon="⭐" titulo={t('topPombos')} acao={t('verTodos')+' →'} onAcao={() => nav('pombos')} />
            {data.top5.map((p, i) => {
              const medalha = i === 0 ? '#D4AF37' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#334155'
              const pct = p.percentil || 0
              return (
                <div key={p.id} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 0', borderBottom: i < data.top5.length - 1 ? '1px solid #1B2D52' : 'none' }}>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:14, fontWeight:900, color:medalha, width:20, textAlign:'center' }}>{i + 1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#475569' }}>{p.anilha}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color: pct >= 80 ? '#2DD4A7' : pct >= 60 ? '#D4AF37' : '#94a3b8' }}>{pct}%</div>
                    <div style={{ fontSize:9, color:'#475569' }}>{p.n_provas || 0} provas</div>
                  </div>
                  {/* mini barra */}
                  <div style={{ width:40, height:4, background:'#1B2D52', borderRadius:2, overflow:'hidden', flexShrink:0 }}>
                    <div style={{ height:'100%', width:`${pct}%`, background: pct >= 80 ? '#2DD4A7' : pct >= 60 ? '#D4AF37' : '#94a3b8', borderRadius:2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* últimas provas */}
        {data.provasRecentes.length > 0 && (
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:14, padding:'14px 16px' }}>
            <SecaoTitulo icon="🏆" titulo={t('ultimasProvas')} acao={t('verTodas')+' →'} onAcao={() => nav('provas')} />
            {data.provasRecentes.map((p, i) => {
              const top = p.posicao_geral && p.n_pombos ? Math.round((p.posicao_geral / p.n_pombos) * 100) : null
              return (
                <div key={p.id} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 0', borderBottom: i < data.provasRecentes.length - 1 ? '1px solid #1B2D52' : 'none' }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{p.posicao_geral === 1 ? '🥇' : p.posicao_geral <= 3 ? '🏅' : '🕊️'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{p.nome}</div>
                    <div style={{ fontSize:10, color:'#7A8699' }}>{p.dist || 0}km · {formatData(p.data_reg)}{p.tipo?' · '+p.tipo:''}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    {p.posicao_geral && p.n_pombos ? (
                      <>
                        <div style={{ fontSize:13, fontWeight:900, fontFamily:"'Fraunces',serif", color: p.posicao_geral === 1 ? '#D4AF37' : p.posicao_geral <= 3 ? '#F59E0B' : '#94a3b8' }}>{p.posicao_geral}º</div>
                        <div style={{ fontSize:10, fontWeight:700, color: top<=10?'#2DD4A7':top<=25?'#D4AF37':'#7A8699' }}>top {top}%</div>
                      </>
                    ) : <div style={{ fontSize:10, color:'#475569' }}>—</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── FINANÇAS ─────────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }} onClick={() => nav('financas')}>
        <div style={{ background:'#0B1830', border:'1px solid rgba(45,212,167,.15)', borderRadius:12, padding:'12px 14px', cursor:'pointer', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'#2DD4A7', opacity:.5 }} />
          <div style={{ fontSize:11, color:'#7A8699', marginBottom:4 }}>💰 Receitas</div>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:'#2DD4A7' }}>{data.rec.toFixed(0)}€</div>
        </div>
        <div style={{ background:'#0B1830', border:'1px solid rgba(248,113,113,.15)', borderRadius:12, padding:'12px 14px', cursor:'pointer', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'#f87171', opacity:.5 }} />
          <div style={{ fontSize:11, color:'#7A8699', marginBottom:4 }}>💸 Despesas</div>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:'#f87171' }}>{data.dep.toFixed(0)}€</div>
        </div>
      </div>

      {/* ── ACESSO RÁPIDO AO RESTO ───────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[
          { icon:'🧬', label:t('reproducao'), page:'reproducao' },
          { icon:'📈', label:t('analiticas'), page:'analiticas' },
          { icon:'🌦️', label:t('meteorologia'), page:'meteorologia' },
          { icon:'🏁', label:t('epoca'), page:'epoca' },
          { icon:'🤝', label:t('comunidade'), page:'comunidade' },
          { icon:'🛒', label:t('marketplace'), page:'marketplace' },
        ].map(({ icon, label, page }) => (
          <button key={page} onClick={() => nav(page)} style={{ background:'#070F20', border:'1px solid #162040', borderRadius:10, padding:'10px 6px', cursor:'pointer', textAlign:'center', fontFamily:'inherit', transition:'background .2s' }}
            onMouseEnter={e=>e.currentTarget.style.background='#0B1830'}
            onMouseLeave={e=>e.currentTarget.style.background='#070F20'}>
            <div style={{ fontSize:18, marginBottom:3 }}>{icon}</div>
            <div style={{ fontSize:9, color:'#475569' }}>{label}</div>
          </button>
        ))}
      </div>

    </div>
  )
}
