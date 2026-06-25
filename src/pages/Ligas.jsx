import { useState, useEffect, useCallback } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'
import { useToast, Spinner, EmptyState } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { verificarConquistas } from '../components/Conquistas'

// ─── CONSTANTES ───────────────────────────────────────
const SISTEMAS = {
  percentil_media: { nome: 'Percentil Médio', icon: '📊', desc: 'Média dos melhores N percentis. O método mais justo para ligas nacionais — compensa posição relativa no campo, não velocidade absoluta.' },
  elo:            { nome: 'Rating ELO',        icon: '⚡', desc: 'Sistema dinâmico inspirado no xadrez. Bater um campo grande sobe mais o rating. Perde contra columbófilos mais fracos e desce. Cria drama real.' },
  pontos_f1:      { nome: 'Pontos F1',         icon: '🏎️', desc: '25/18/15/12/10/8/6/4/2/1 pontos por posição. Simples, competitivo, motiva a tentar ganhar cada prova.' },
  acumulado:      { nome: 'Acumulado Total',   icon: '∑',  desc: 'Soma de TODOS os percentis de TODAS as provas. Premia a consistência — quem participa mais tem vantagem.' },
  melhor_resultado:{ nome: 'Melhor Resultado', icon: '🎯', desc: 'Apenas a melhor prova de cada um conta. Liga de um único tiro — uma vitória épica pode chegar para ganhar tudo.' },
}

const ESPECIALIDADES_OPT = [
  { id: 'todas',        label: '🌐 Todas', desc: 'Qualquer prova conta' },
  { id: 'velocidade',   label: '⚡ Velocidade', desc: 'Até 300km' },
  { id: 'meio_fundo',   label: '🏃 Meio-Fundo', desc: '300–500km' },
  { id: 'fundo',        label: '🏔️ Fundo', desc: '500–700km' },
  { id: 'grande_fundo', label: '🌍 Grande Fundo', desc: '+700km' },
]

const ACESSOS = {
  publico:   { icon: '🌐', label: 'Pública',      desc: 'Qualquer utilizador da app pode entrar' },
  codigo:    { icon: '🔑', label: 'Por Código',   desc: 'Apenas quem tiver o código de convite' },
  aprovacao: { icon: '✅', label: 'Com Aprovação', desc: 'Pede para entrar, admin aprova' },
}

const DESEMPATES = {
  n_provas:          { label: 'Mais provas disputadas' },
  melhor_individual: { label: 'Melhor resultado individual' },
  vitorias:          { label: 'Mais vitórias (1º lugar)' },
}

const TIPO_PARA_ESP = { 'Velocidade':'velocidade','Meio-Fundo':'meio_fundo','Fundo':'fundo','Grande Fundo':'grande_fundo','Treino Federado':'velocidade' }

// ─── CÁLCULO ELO ──────────────────────────────────────
function calcularElo(ratingAtual, percentil, campoSize) {
  const K = campoSize > 200 ? 32 : campoSize > 100 ? 24 : 16
  const esperado = 0.5
  const resultado = percentil / 100
  return Math.round(K * (resultado - esperado))
}

// ─── CÁLCULO DE PONTOS ────────────────────────────────
function calcularPontos(sistema, percentil, posicao, campoSize, distancia, ponderacao) {
  let base = 0
  const F1 = [25,18,15,12,10,8,6,4,2,1]
  switch (sistema) {
    case 'percentil_media': base = percentil; break
    case 'elo':             base = 1000 + calcularElo(1000, percentil, campoSize); break
    case 'pontos_f1':       base = F1[posicao - 1] || 0; break
    case 'acumulado':       base = percentil; break
    case 'melhor_resultado':base = percentil; break
    default:                base = percentil
  }
  if (ponderacao && distancia) base = base * (1 + Math.min(distancia, 1000) / 2000)
  return Math.round(base * 10) / 10
}

// ─── FORMA VISUAL ─────────────────────────────────────
function Forma({ valores = [] }) {
  if (!valores?.length) return <span style={{ color:'#475569', fontSize:11 }}>—</span>
  // Verificar plano
  const temAcesso = temBase
  if (!temAcesso) return <BloqueioPlano plano="base" nav={nav} />

  return (
    <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:20 }}>
      {valores.slice(-5).map((v, i) => (
        <div key={i} style={{
          width:6, borderRadius:2,
          height: Math.max(3, Math.round((v / 100) * 20)),
          background: v >= 80 ? '#2DD4A7' : v >= 60 ? '#D4AF37' : v >= 40 ? '#4C8DFF' : '#f87171',
        }}/>
      ))}
    </div>
  )
}

// ─── TOOLTIP ──────────────────────────────────────────
function Tip({ texto, children }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
      <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={() => setShow(s => !s)}>
        {children}
      </span>
      {show && (
        <div style={{ position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)', background:'#101F40', border:'1px solid #1B2D52', borderRadius:8, padding:'8px 12px', fontSize:11, color:'#cbd5e1', lineHeight:1.6, whiteSpace:'normal', width:220, zIndex:100, boxShadow:'0 8px 24px rgba(0,0,0,.5)' }}>
          {texto}
          <div style={{ position:'absolute', bottom:-5, left:'50%', transform:'translateX(-50%)', width:8, height:8, background:'#101F40', border:'1px solid #1B2D52', borderBottom:'none', borderRight:'none', rotate:'45deg' }}/>
        </div>
      )}
    </span>
  )
}

// ─── CAMPO OPÇÃO COM INFO ─────────────────────────────
function OpcaoCard({ ativo, onClick, icon, label, desc }) {
  return (
    <div onClick={onClick} style={{
      padding:'10px 12px', borderRadius:8, cursor:'pointer',
      background: ativo ? 'rgba(76,141,255,.12)' : 'rgba(16,31,64,.6)',
      border: `1px solid ${ativo ? '#4C8DFF' : '#1B2D52'}`,
      transition:'all .2s',
    }}>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:3 }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        <span style={{ fontSize:12, fontWeight:700, color: ativo ? '#4C8DFF' : '#fff' }}>{label}</span>
      </div>
      <div style={{ fontSize:11, color:'#7A8699', lineHeight:1.5 }}>{desc}</div>
    </div>
  )
}

// ─── WIZARD DE CRIAÇÃO ────────────────────────────────
const FORM_INICIAL = {
  nome:'', descricao:'',
  tipo:'campeonato',
  especialidades:['todas'],
  dist_min:0, dist_max:9999,
  epoca: new Date().getFullYear(),
  sistema_pontuacao:'percentil_media',
  n_melhores_provas:5,
  ponderacao_distancia:false,
  desempate:'n_provas',
  acesso:'codigo',
  max_membros:'',
  tem_divisoes:false,
  n_divisoes:3,
  promovidos_por_divisao:2,
  descidos_por_divisao:2,
}

function WizardCriacaoLiga({ onCriar, onFechar, saving }) {
  const [passo, setPasso] = useState(1)
  const [form, setForm] = useState(FORM_INICIAL)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const PASSOS = 4

  const toggleEsp = (esp) => {
    if (esp === 'todas') { sf('especialidades', ['todas']); return }
    const atual = form.especialidades.filter(e => e !== 'todas')
    sf('especialidades', atual.includes(esp) ? atual.filter(e => e !== esp) || ['todas'] : [...atual, esp])
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onFechar()}>
      <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:580, maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #1B2D52', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', fontFamily:"'Fraunces',serif" }}>🏆 Criar Liga</div>
            <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>Passo {passo} de {PASSOS}</div>
          </div>
          <button onClick={onFechar} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>

        {/* Barra de progresso */}
        <div style={{ height:3, background:'#101F40', flexShrink:0 }}>
          <div style={{ height:'100%', width:`${(passo/PASSOS)*100}%`, background:'linear-gradient(90deg,#4C8DFF,#2DD4A7)', transition:'width .3s' }}/>
        </div>

        {/* Conteúdo */}
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>

          {/* PASSO 1 — Identidade */}
          {passo === 1 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#D4AF37', marginBottom:4 }}>Identidade da Liga</div>
              <div className="field">
                <label className="label">Nome da Liga *</label>
                <input className="input" placeholder="Ex: Liga Amigos Alentejo 2026" value={form.nome} onChange={e => sf('nome', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Descrição (opcional)</label>
                <textarea className="input" rows={2} style={{ resize:'none' }} placeholder="Contexto, regras especiais, quem pode participar..." value={form.descricao} onChange={e => sf('descricao', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Época</label>
                <input className="input" type="number" value={form.epoca} onChange={e => sf('epoca', parseInt(e.target.value))} />
              </div>
              <div className="field">
                <label className="label">Tipo de Competição</label>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    { id:'campeonato', icon:'📅', label:'Campeonato', desc:'Toda a época, acumulação de pontos. O mais usado e justo para ligas longas.' },
                    { id:'challenge',  icon:'🎯', label:'Challenge',  desc:'Uma ou poucas provas específicas. Rápido e directo — decide-se numa tarde.' },
                    { id:'misto',      icon:'🔀', label:'Misto',      desc:'Fases de grupo + eliminatórias. Mais complexo mas gera muito drama e emoção.' },
                  ].map(t => <OpcaoCard key={t.id} ativo={form.tipo===t.id} onClick={()=>sf('tipo',t.id)} {...t}/>)}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2 — Especialidades e distâncias */}
          {passo === 2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#D4AF37', marginBottom:4 }}>Provas que Contam</div>
              <div className="field">
                <label className="label">Especialidades aceites</label>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {ESPECIALIDADES_OPT.map(e => (
                    <OpcaoCard key={e.id} ativo={form.especialidades.includes(e.id)} onClick={()=>toggleEsp(e.id)} icon={e.label.split(' ')[0]} label={e.label.split(' ').slice(1).join(' ')} desc={e.desc}/>
                  ))}
                </div>
              </div>
              {!form.especialidades.includes('todas') && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div className="field">
                    <label className="label">Distância mínima (km) <Tip texto="Provas com menos km que este valor não contam para a liga.">ℹ️</Tip></label>
                    <input className="input" type="number" value={form.dist_min} onChange={e=>sf('dist_min',parseInt(e.target.value)||0)} placeholder="0" />
                  </div>
                  <div className="field">
                    <label className="label">Distância máxima (km)</label>
                    <input className="input" type="number" value={form.dist_max===9999?'':form.dist_max} onChange={e=>sf('dist_max',parseInt(e.target.value)||9999)} placeholder="Sem limite" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 3 — Sistema de pontuação */}
          {passo === 3 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#D4AF37', marginBottom:4 }}>Sistema de Pontuação</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {Object.entries(SISTEMAS).map(([id, s]) => (
                  <OpcaoCard key={id} ativo={form.sistema_pontuacao===id} onClick={()=>sf('sistema_pontuacao',id)} icon={s.icon} label={s.nome} desc={s.desc}/>
                ))}
              </div>

              {form.sistema_pontuacao === 'percentil_media' && (
                <div className="field">
                  <label className="label">Nº de melhores provas a contar <Tip texto="Ex: se definir 5, apenas as 5 melhores provas de cada participante contam para a média final. Reduz o impacto de uma má prova.">ℹ️</Tip></label>
                  <input className="input" type="number" min={1} max={20} value={form.n_melhores_provas} onChange={e=>sf('n_melhores_provas',parseInt(e.target.value)||5)}/>
                </div>
              )}

              <label style={{ display:'flex', gap:10, alignItems:'center', cursor:'pointer', padding:'10px 12px', background:'rgba(212,175,55,.06)', border:'1px solid rgba(212,175,55,.15)', borderRadius:8 }}>
                <input type="checkbox" checked={form.ponderacao_distancia} onChange={e=>sf('ponderacao_distancia',e.target.checked)} style={{ accentColor:'#D4AF37', width:16, height:16 }}/>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#D4AF37' }}>Ponderar por distância</div>
                  <div style={{ fontSize:11, color:'#7A8699' }}>Provas mais longas valem mais pontos. Uma prova de 800km tem bónus vs 200km.</div>
                </div>
              </label>

              <div className="field">
                <label className="label">Critério de desempate</label>
                <select className="input" value={form.desempate} onChange={e=>sf('desempate',e.target.value)}>
                  {Object.entries(DESEMPATES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* PASSO 4 — Acesso e divisões */}
          {passo === 4 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#D4AF37', marginBottom:4 }}>Acesso e Estrutura</div>

              <div className="field">
                <label className="label">Quem pode entrar</label>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {Object.entries(ACESSOS).map(([id,a])=>(
                    <OpcaoCard key={id} ativo={form.acesso===id} onClick={()=>sf('acesso',id)} icon={a.icon} label={a.label} desc={a.desc}/>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label">Máximo de participantes <Tip texto="Deixe em branco para ilimitado. Com divisões, este número é dividido pelo nº de divisões.">ℹ️</Tip></label>
                <input className="input" type="number" value={form.max_membros} onChange={e=>sf('max_membros',e.target.value)} placeholder="Ilimitado" />
              </div>

              <label style={{ display:'flex', gap:10, alignItems:'center', cursor:'pointer', padding:'10px 12px', background:'rgba(45,212,167,.06)', border:'1px solid rgba(45,212,167,.15)', borderRadius:8 }}>
                <input type="checkbox" checked={form.tem_divisoes} onChange={e=>sf('tem_divisoes',e.target.checked)} style={{ accentColor:'#2DD4A7', width:16, height:16 }}/>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#2DD4A7' }}>Sistema de Divisões com promoção/descida</div>
                  <div style={{ fontSize:11, color:'#7A8699' }}>No fim da época, os melhores sobem de divisão, os piores descem. Cria competição em vários níveis.</div>
                </div>
              </label>

              {form.tem_divisoes && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, padding:'10px 12px', background:'#070F1D', borderRadius:8 }}>
                  <div className="field"><label className="label">Divisões</label><input className="input" type="number" min={2} max={5} value={form.n_divisoes} onChange={e=>sf('n_divisoes',parseInt(e.target.value)||3)}/></div>
                  <div className="field"><label className="label">Promovidos</label><input className="input" type="number" min={1} value={form.promovidos_por_divisao} onChange={e=>sf('promovidos_por_divisao',parseInt(e.target.value)||2)}/></div>
                  <div className="field"><label className="label">Descidos</label><input className="input" type="number" min={1} value={form.descidos_por_divisao} onChange={e=>sf('descidos_por_divisao',parseInt(e.target.value)||2)}/></div>
                </div>
              )}

              {/* Resumo */}
              <div style={{ background:'rgba(76,141,255,.06)', border:'1px solid rgba(76,141,255,.15)', borderRadius:8, padding:'12px 14px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#4C8DFF', marginBottom:8 }}>📋 Resumo da Liga</div>
                <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.8 }}>
                  <div>🏆 <strong style={{color:'#fff'}}>{form.nome || '—'}</strong> · Época {form.epoca}</div>
                  <div>📊 {SISTEMAS[form.sistema_pontuacao]?.nome} {form.ponderacao_distancia?'· Ponderado por distância':''}</div>
                  <div>🌐 {form.especialidades.includes('todas')?'Todas as especialidades':form.especialidades.join(', ')}</div>
                  <div>{ACESSOS[form.acesso]?.icon} {ACESSOS[form.acesso]?.label} {form.max_membros?`· máx. ${form.max_membros} participantes`:''}</div>
                  {form.tem_divisoes && <div>📈 {form.n_divisoes} divisões · {form.promovidos_por_divisao} sobem / {form.descidos_por_divisao} descem</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid #1B2D52', display:'flex', justifyContent:'space-between', gap:10, flexShrink:0, background:'#0B1830' }}>
          <button className="btn btn-secondary" onClick={() => passo > 1 ? setPasso(p=>p-1) : onFechar()}>
            {passo > 1 ? '← Anterior' : t('cancelar')}
          </button>
          {passo < PASSOS
            ? <button className="btn btn-primary" onClick={() => { if(passo===1&&!form.nome.trim()){return} setPasso(p=>p+1) }}>Seguinte →</button>
            : <button className="btn btn-primary" onClick={() => onCriar(form)} disabled={saving}>{saving?<Spinner/>:null}🏆 Criar Liga</button>
          }
        </div>
      </div>
    </div>
  )
}

// ─── DETALHE DA LIGA ──────────────────────────────────
function DetalheLiga({ liga, user, onVoltar, provas, toast }) {
  const [membros, setMembros] = useState([])
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [confirmSair, setConfirmSair] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('league_members').select('*').eq('league_id', liga.id),
      supabase.from('league_results').select('*').eq('league_id', liga.id)
    ]).then(([{data:m},{data:r}]) => {
      setMembros(m||[]); setResultados(r||[])
    }).finally(() => setLoading(false))
  }, [liga.id])

  const classificacao = membros.map(m => {
    const res = resultados.filter(r => r.user_id === m.user_id)
    const s = liga.sistema_pontuacao || 'percentil_media'

    let pontos = 0
    let melhores = []
    if (s === 'percentil_media' || s === 'acumulado') {
      melhores = [...res].sort((a,b)=>b.percentil-a.percentil).slice(0, liga.n_melhores_provas||5)
      pontos = melhores.length ? melhores.reduce((s,r)=>s+r.percentil,0)/(s==='percentil_media'?melhores.length:1) : 0
    } else if (s === 'elo') {
      pontos = res.reduce((s,r)=>s+(r.delta_elo||0), 1000)
    } else if (s === 'pontos_f1') {
      pontos = res.reduce((s,r)=>s+(r.pontos||0), 0)
    } else if (s === 'melhor_resultado') {
      pontos = res.length ? Math.max(...res.map(r=>r.percentil||0)) : 0
    }

    const forma = [...res].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).slice(-5).map(r=>Math.round(r.percentil||0))
    return { ...m, pontos:Math.round(pontos*10)/10, n_provas:res.length, forma, vitorias:res.filter(r=>r.posicao_geral===1).length }
  }).sort((a,b)=>b.pontos-a.pontos)

  const sincronizar = async () => {
    setSyncing(true)
    try {
      const esp = liga.especialidades || ['todas']
      const elegíveis = provas.filter(p => {
        if (!p.posicao_geral || !p.n_pombos) return false
        if (esp.includes('todas')) return true
        return esp.includes(TIPO_PARA_ESP[p.tipo])
      })
      for (const p of elegíveis) {
        const percentil = Math.round((1-(p.posicao_geral-1)/p.n_pombos)*1000)/10
        const pontos = calcularPontos(liga.sistema_pontuacao||'percentil_media', percentil, p.posicao_geral, p.n_pombos, p.distancia, liga.ponderacao_distancia)
        const delta_elo = calcularElo(1000, percentil, p.n_pombos)
        await supabase.from('league_results').upsert({
          league_id:liga.id, user_id:user.id, race_id:p.id,
          nome_prova:p.nome, data_prova:p.data_reg, especialidade:TIPO_PARA_ESP[p.tipo]||'', distancia:p.distancia||0,
          posicao_geral:p.posicao_geral, n_concorrentes:p.n_pombos, percentil, pontos, delta_elo
        }, { onConflict:'league_id,user_id,race_id' })
      }
      toast(`${elegíveis.length} prova(s) sincronizada(s)!`, 'ok')
      const {data:r} = await supabase.from('league_results').select('*').eq('league_id', liga.id)
      setResultados(r||[])
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSyncing(false) }
  }

  const isAdmin = liga.creator_id === user?.id
  const euMembro = membros.find(m=>m.user_id===user?.id)
  const minhaPos = classificacao.findIndex(m=>m.user_id===user?.id)+1
  const LABEL_SISTEMA = SISTEMAS[liga.sistema_pontuacao]
  const UNIDADE = { percentil_media:'%', elo:'ELO', pontos_f1:'pts', acumulado:'%', melhor_resultado:'%' }[liga.sistema_pontuacao||'percentil_media'] || 'pts'

  return (
    <div>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,#050D1A,#0B1830)`, border:'1px solid rgba(212,175,55,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background: liga.oficial ? 'linear-gradient(90deg,#D4AF37,#2DD4A7,#4C8DFF)' : 'linear-gradient(90deg,#4C8DFF,#2DD4A7)' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
              {liga.oficial && <span style={{ fontSize:10, fontWeight:700, color:'#D4AF37', background:'rgba(212,175,55,.1)', border:'1px solid rgba(212,175,55,.3)', borderRadius:99, padding:'2px 8px' }}>👑 OFICIAL</span>}
              <span style={{ fontSize:10, color:'#475569' }}>Época {liga.epoca}</span>
            </div>
            <div style={{ fontSize:16, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif", marginBottom:2 }}>{liga.nome}</div>
            <div style={{ fontSize:11, color:'#7A8699' }}>
              {LABEL_SISTEMA?.icon} {LABEL_SISTEMA?.nome} · {membros.length} participante(s)
              {liga.invite_code && <span> · Código: <strong style={{color:'#D4AF37',fontFamily:"'Space Mono',monospace"}}>{liga.invite_code}</strong></span>}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onVoltar}>← Voltar</button>
        </div>
      </div>

      {/* A minha posição */}
      {euMembro && minhaPos > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
          {[
            [`${minhaPos}º`, 'A minha posição', '#D4AF37'],
            [`${classificacao.find(m=>m.user_id===user?.id)?.pontos||0}${UNIDADE}`, 'Pontuação', '#2DD4A7'],
            [`${classificacao.find(m=>m.user_id===user?.id)?.n_provas||0}`, 'Provas', '#4C8DFF'],
          ].map(([v,l,c])=>(
            <div key={l} style={{ textAlign:'center', padding:'10px 6px', background:'#0B1830', border:`1px solid ${c}25`, borderRadius:8 }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:c }}>{v}</div>
              <div style={{ fontSize:9, color:'#7A8699', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Acções */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={sincronizar} disabled={syncing}>
          {syncing?<Spinner/>:'🔄'} Sincronizar provas
        </button>
        {liga.invite_code && (
          <button className="btn btn-secondary btn-sm" onClick={() => {
            navigator.clipboard?.writeText(`Entra na minha liga no ChampionsLoft! Código: ${liga.invite_code}`)
            toast('Link copiado!','ok')
          }}>📋 Copiar convite</button>
        )}
        {liga.invite_code && navigator.share && (
          <button className="btn btn-secondary btn-sm" onClick={() => navigator.share({ title:liga.nome, text:`Entra na minha liga "${liga.nome}"! Código: ${liga.invite_code}`, url:window.location.origin })}>
            🔗 Partilhar
          </button>
        )}
      </div>

      {/* Classificação */}
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner lg/></div>
        : classificacao.length === 0
          ? <EmptyState icon="🏆" title="Sem resultados ainda" desc='Clique "Sincronizar provas" para entrar na classificação'/>
          : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ display:'grid', gridTemplateColumns:'28px 1fr auto 60px 40px', gap:8, padding:'4px 12px', fontSize:10, color:'#475569', fontWeight:600, letterSpacing:'.05em', textTransform:'uppercase' }}>
                <span>#</span><span>Participante</span><span>Forma</span><span style={{textAlign:'right'}}>Pontos</span><span style={{textAlign:'center'}}>Provas</span>
              </div>
              {classificacao.map((m, i) => {
                const euSou = m.user_id === user?.id
                const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':null
                return (
                  <div key={m.id} style={{
                    display:'grid', gridTemplateColumns:'28px 1fr auto 60px 40px', gap:8,
                    alignItems:'center', padding:'12px', borderRadius:10,
                    background: euSou ? 'rgba(76,141,255,.08)' : '#0B1830',
                    border: `1px solid ${euSou?'rgba(76,141,255,.35)':i<3?'rgba(212,175,55,.1)':'#1B2D52'}`,
                  }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:900, color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569', textAlign:'center' }}>
                      {medal || i+1}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:euSou?'#7CB9FF':'#fff' }}>
                        {m.nome}{euSou?' (você)':''}{m.vitorias>0?` · 🏆${m.vitorias}`:''}
                      </div>
                      <div style={{ fontSize:10, color:'#475569' }}>{m.pais||''}</div>
                    </div>
                    <Forma valores={m.forma}/>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:14, fontWeight:900, color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#2DD4A7', textAlign:'right' }}>
                      {m.pontos}{UNIDADE}
                    </div>
                    <div style={{ fontSize:11, color:'#475569', textAlign:'center' }}>{m.n_provas}</div>
                  </div>
                )
              })}
            </div>
          )
      }

      {/* Sair da liga */}
      {!isAdmin && euMembro && (
        <div style={{ textAlign:'center', marginTop:20 }}>
          {!confirmSair
            ? <button className="btn btn-secondary btn-sm" onClick={()=>setConfirmSair(true)}>Sair desta liga</button>
            : <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={()=>setConfirmSair(false)}>Cancelar</button>
                <button className="btn btn-danger btn-sm" onClick={async()=>{
                  await supabase.from('league_members').delete().eq('league_id',liga.id).eq('user_id',user.id)
                  toast('Saiu da liga','ok'); onVoltar()
                }}>Confirmar saída</button>
              </div>
          }
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────
export default function Ligas({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()
  const { temBase, temPro, temElite } = useLicenca()
  const { user } = useAuth()
  const [ligas, setLigas] = useState([])
  const [provas, setProvas] = useState([])
  const [loading, setLoading] = useState(true)
  const [wizard, setWizard] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ligaAberta, setLigaAberta] = useState(null)
  const [codigoEntrar, setCodigoEntrar] = useState('')
  const [nomeEntrar, setNomeEntrar] = useState('')
  const [modalEntrar, setModalEntrar] = useState(false)
  const [tab, setTab] = useState('minhas') // minhas | oficiais

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const uid = user?.id
      const [{ data: memberships }, { data: oficiais }, provasData] = await Promise.all([
        supabase.from('league_members').select('*, leagues(*)').eq('user_id', uid),
        supabase.from('leagues').select('*').eq('oficial', true).then(r => { console.log('oficiais:', r); return r }),
        db.getProvas(),
      ])
      const minhas = (memberships||[]).map(m=>({...m.leagues, meu_role:m.role})).filter(Boolean)
      setLigas({ minhas, oficiais: oficiais||[] })
      setProvas(provasData||[])
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const criarLiga = async (form) => {
    setSaving(true)
    try {
      const invite_code = Math.random().toString(36).slice(2,8).toUpperCase()
      const { data, error } = await supabase.from('leagues').insert({
        nome:form.nome.trim(), descricao:form.descricao, tipo:form.tipo,
        especialidades:form.especialidades, dist_min:form.dist_min, dist_max:form.dist_max,
        epoca:form.epoca, sistema_pontuacao:form.sistema_pontuacao, n_melhores_provas:form.n_melhores_provas,
        ponderacao_distancia:form.ponderacao_distancia, desempate:form.desempate,
        acesso:form.acesso, max_membros:form.max_membros||null,
        tem_divisoes:form.tem_divisoes, n_divisoes:form.n_divisoes,
        promovidos_por_divisao:form.promovidos_por_divisao, descidos_por_divisao:form.descidos_por_divisao,
        creator_id:user.id, invite_code, oficial:false, estado:'ativa',
      }).select().single()
      if (error) throw error
      await supabase.from('league_members').insert({ league_id:data.id, user_id:user.id, nome:user?.user_metadata?.nome||'Eu', role:'admin' })
      toast('Liga criada! Código: '+data.invite_code,'ok')
      setWizard(false); load()
      verificarConquistas(user.id, { temLiga:true }).catch(()=>{})
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const entrarPorCodigo = async () => {
    if (!codigoEntrar.trim() || !nomeEntrar.trim()) { toast('Preencha código e nome','warn'); return }
    setSaving(true)
    try {
      const { data:liga } = await supabase.from('leagues').select('*').eq('invite_code',codigoEntrar.toUpperCase()).maybeSingle()
      if (!liga) { toast('Código inválido','err'); return }
      await supabase.from('league_members').insert({ league_id:liga.id, user_id:user.id, nome:nomeEntrar.trim(), role:'member' })
      toast('Entrou na liga!','ok'); setModalEntrar(false); load()
      verificarConquistas(user.id, { temLiga:true }).catch(()=>{})
    } catch(e) { toast(e.message?.includes('23505')?'Já é membro desta liga':'Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const entrarNaOficial = async (liga) => {
    try {
      await supabase.from('league_members').insert({ league_id:liga.id, user_id:user.id, nome:user?.user_metadata?.nome||'Eu', role:'member' })
      toast('Inscrito na liga oficial!','ok'); load()
      verificarConquistas(user.id, { temLiga:true, temLigaOficial:true }).catch(()=>{})
    } catch(e) { toast(e.message?.includes('23505')?'Já está inscrito nesta liga':'Erro: '+e.message,'err') }
  }

  if (ligaAberta) return <DetalheLiga liga={ligaAberta} user={user} onVoltar={() => {setLigaAberta(null); load()}} provas={provas} toast={toast}/>

  const minhasLigas = ligas.minhas || []
  const oficiaisLigas = ligas.oficiais || []
  const minhasIds = new Set(minhasLigas.map(l=>l.id))

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(76,141,255,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#4C8DFF,#2DD4A7,#D4AF37)' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>🏆 Ligas</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>{minhasLigas.length} liga(s) activa(s) · classificação em tempo real</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setModalEntrar(true)}>🔑 Entrar</button>
            <button className="btn btn-primary btn-sm" onClick={() => temElite ? setWizard(true) : nav('precos')}>{temElite ? '+ '+t('criarLiga') : '🔒 Elite'}</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14 }}>
        {[['minhas','🏅 As minhas'],['oficiais','👑 Ligas Oficiais CL']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'linear-gradient(135deg,#4C8DFF,#2563EB)':'none', color:tab===t?'#fff':'#475569' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
        : tab === 'minhas' ? (
          minhasLigas.length === 0
            ? <EmptyState icon="🏆" title="Sem ligas" desc="Cria uma liga privada ou entra por código de convite"
                action={<div style={{display:'flex',gap:8,justifyContent:'center'}}><button className="btn btn-secondary" onClick={()=>setModalEntrar(true)}>🔑 Entrar por Código</button><button className="btn btn-primary" onClick={()=>setWizard(true)}>+ Criar Liga</button></div>}/>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {minhasLigas.map(l => (
                  <div key={l.id} className="card card-p" style={{ cursor:'pointer', borderLeft:`3px solid ${l.meu_role==='admin'?'#D4AF37':'#4C8DFF'}` }} onClick={()=>setLigaAberta(l)}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{l.nome} {l.meu_role==='admin'?'👑':''}</div>
                        <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>
                          {SISTEMAS[l.sistema_pontuacao]?.icon} {SISTEMAS[l.sistema_pontuacao]?.nome} · Época {l.epoca}
                          {l.invite_code && <span style={{ fontFamily:"'Space Mono',monospace", color:'#475569' }}> · {l.invite_code}</span>}
                        </div>
                      </div>
                      <span style={{ color:'#475569' }}>→</span>
                    </div>
                  </div>
                ))}
              </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ padding:'10px 14px', background:'rgba(212,175,55,.06)', border:'1px solid rgba(212,175,55,.15)', borderRadius:8, fontSize:12, color:'#94a3b8' }}>
              👑 As Ligas Oficiais ChampionsLoft são geridas pela plataforma. A tua classificação actualiza automaticamente quando registas provas com posição e nº de pombos preenchidos.
            </div>
            {oficiaisLigas.length === 0
              ? <EmptyState icon="👑" title="Em breve" desc="As Ligas Oficiais serão lançadas com a nova época"/>
              : oficiaisLigas.map(l => {
                  const jaMembro = minhasIds.has(l.id)
                  return (
                    <div key={l.id} className="card card-p" style={{ borderLeft:'3px solid #D4AF37' }}>
                      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                        <div style={{ flex:1, cursor:'pointer' }} onClick={()=>setLigaAberta(l)}>
                          <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
                            <span style={{ fontSize:10, fontWeight:700, color:'#D4AF37', background:'rgba(212,175,55,.1)', borderRadius:99, padding:'1px 7px' }}>👑 OFICIAL</span>
                          </div>
                          <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{l.nome}</div>
                          <div style={{ fontSize:11, color:'#7A8699' }}>{SISTEMAS[l.sistema_pontuacao]?.icon} {SISTEMAS[l.sistema_pontuacao]?.nome} · {l.pais}</div>
                        </div>
                        {jaMembro
                          ? <button className="btn btn-secondary btn-sm" onClick={()=>setLigaAberta(l)}>Ver →</button>
                          : <button className="btn btn-primary btn-sm" onClick={()=>entrarNaOficial(l)}>Inscrever</button>
                        }
                      </div>
                    </div>
                  )
                })
            }
          </div>
        )
      }

      {/* Wizard */}
      {wizard && <WizardCriacaoLiga onCriar={criarLiga} onFechar={()=>setWizard(false)} saving={saving}/>}

      {/* Modal entrar por código */}
      {modalEntrar && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setModalEntrar(false)}>
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:480, padding:24 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:16, fontFamily:"'Fraunces',serif" }}>🔑 Entrar por Código</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="field"><label className="label">Código de convite</label><input className="input" placeholder="Ex: A1B2C3" value={codigoEntrar} onChange={e=>setCodigoEntrar(e.target.value.toUpperCase())} style={{fontFamily:"'Space Mono',monospace",letterSpacing:'.1em'}}/></div>
              <div className="field"><label className="label">O seu nome na liga</label><input className="input" placeholder="Como quer aparecer na classificação" value={nomeEntrar} onChange={e=>setNomeEntrar(e.target.value)} /></div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16 }}>
              <button className="btn btn-secondary" onClick={()=>setModalEntrar(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={entrarPorCodigo} disabled={saving}>{saving?<Spinner/>:null}Entrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
