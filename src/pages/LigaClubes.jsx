import { useState, useEffect, useCallback } from 'react'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'
import { useToast, Spinner, EmptyState } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { BotaoWhatsApp } from '../components/Partilha'

const FASES = {
  inscricoes: { label: 'Inscrições abertas', cor:'#2DD4A7', icon:'📋' },
  grupos:     { label: 'Fase de Grupos',     cor:'#4C8DFF', icon:'⚔️' },
  quartos:    { label: 'Quartos-de-Final',   cor:'#D4AF37', icon:'🏆' },
  meias:      { label: 'Meias-Finais',       cor:'#f97316', icon:'🔥' },
  final:      { label:'FINAL',              cor:'#D4AF37', icon:'👑' },
  encerrada:  { label:'Encerrada',          cor:'#475569', icon:'🏁' },
}

const FORMATOS = {
  media_percentil: { label:'Percentil Médio', desc:'Média dos percentis de todos os membros nas provas da jornada' },
  melhor_resultado:{ label:'Melhor Resultado', desc:'O melhor percentil individual do clube em cada prova' },
  soma_pontos:     { label:'Soma de Pontos',   desc:'Soma dos percentis de todos os membros' },
}

// ─── DETALHE LIGA ─────────────────────────────────────
function DetalheLigaClubes({ liga, user, meusClubes, onVoltar, toast }) {
  const [inscricoes, setInscricoes] = useState([])
  const [jornadas, setJornadas] = useState([])
  const [confrontos, setConfrontos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('classificacao')
  const [inscrevendo, setInscrevendo] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('liga_clubes_inscricoes').select('*, clubes_personalizados(*)').eq('liga_id', liga.id).order('pontos', { ascending:false }),
      supabase.from('liga_clubes_jornadas').select('*').eq('liga_id', liga.id).order('numero'),
      supabase.from('liga_clubes_confrontos').select('*, ca:clube_a_id(nome,emblema), cb:clube_b_id(nome,emblema)').eq('liga_id', liga.id).order('created_at'),
    ]).then(([{data:i},{data:j},{data:c}])=>{
      setInscricoes(i||[])
      setJornadas(j||[])
      setConfrontos(c||[])
    }).finally(()=>setLoading(false))
  }, [liga.id])

  const inscreverClube = async (clube) => {
    setInscrevendo(true)
    try {
      await supabase.from('liga_clubes_inscricoes').insert({ liga_id:liga.id, clube_id:clube.id })
      toast(`"${clube.nome}" inscrito!`,'ok')
      const {data:i} = await supabase.from('liga_clubes_inscricoes').select('*, clubes_personalizados(*)').eq('liga_id',liga.id).order('pontos',{ascending:false})
      setInscricoes(i||[])
    } catch(e) { toast(e.message?.includes('23505')?'Clube já inscrito':'Erro: '+e.message,'err') }
    finally { setInscrevendo(false) }
  }

  const inscritosIds = new Set(inscricoes.map(i=>i.clube_id))
  const fase = FASES[liga.estado] || FASES.inscricoes
  const isAdmin = liga.creator_id === user?.id

  // Agrupar por grupo para fase de grupos
  const grupos = {}
  inscricoes.forEach(i => {
    const g = i.grupo || 0
    if (!grupos[g]) grupos[g] = []
    grupos[g].push(i)
  })

  const confrontosPorJornada = {}
  confrontos.forEach(c => {
    if (!confrontosPorJornada[c.jornada_id]) confrontosPorJornada[c.jornada_id] = []
    confrontosPorJornada[c.jornada_id].push(c)
  })

  // Verificar plano
  const temAcesso = temElite
  if (!temAcesso) return <BloqueioPlano plano="elite" nav={nav} />

  return (
    <>
      <GuiaAuto modulo="ligas"/>
    <div>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,#050D1A,#0B1830)`, border:`1px solid ${fase.cor}30`, borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${fase.cor},#D4AF37)` }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:11, fontWeight:700, color:fase.cor, background:`${fase.cor}15`, border:`1px solid ${fase.cor}30`, borderRadius:99, padding:'2px 10px' }}>{fase.icon} {fase.label}</span>
              {liga.oficial && <span style={{ fontSize:10, color:'#D4AF37', background:'rgba(212,175,55,.1)', border:'1px solid rgba(212,175,55,.3)', borderRadius:99, padding:'2px 8px' }}>👑 OFICIAL</span>}
            </div>
            <div style={{ fontSize:16, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>{liga.nome}</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>
              {FORMATOS[liga.formato]?.label} · Época {liga.epoca} · {inscricoes.length} clubes
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onVoltar}>← Voltar</button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[[inscricoes.length, '🎽', 'Clubes'],[liga.min_membros_por_clube||3,'👥','Min. membros'],[liga.max_clubes||16,'🏆','Max. clubes']].map(([v,i,l])=>(
            <div key={l} style={{ textAlign:'center', padding:'8px', background:'rgba(255,255,255,.04)', borderRadius:8 }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:'#D4AF37' }}>{v}</div>
              <div style={{ fontSize:9, color:'#7A8699' }}>{i} {l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Inscrever clube */}
      {liga.estado === 'inscricoes' && meusClubes.filter(c=>!inscritosIds.has(c.id)).length > 0 && (
        <div style={{ background:'rgba(45,212,167,.06)', border:'1px solid rgba(45,212,167,.2)', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#2DD4A7', marginBottom:8 }}>Inscreve o teu clube</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {meusClubes.filter(c=>!inscritosIds.has(c.id)).map(c=>(
              <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'#0B1830', borderRadius:8, border:'1px solid #1B2D52' }}>
                <span style={{ fontSize:13 }}>{c.emblema} {c.nome}</span>
                <button className="btn btn-primary btn-sm" onClick={()=>inscreverClube(c)} disabled={inscrevendo}>
                  {inscrevendo?<Spinner/>:'Inscrever'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14, overflowX:'auto' }}>
        {[['classificacao','📊 Class.'],['grupos','⚔️ Grupos'],['confrontos','🔥 Confrontos'],['jornadas','📅 Jornadas']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'8px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tab===t?`linear-gradient(135deg,#D4AF37,#B8960C)`:'none', color:tab===t?'#050D1A':'#475569' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner lg/></div>
      : tab === 'classificacao' ? (
        inscricoes.length === 0
          ? <EmptyState icon="🎽" title="Sem clubes inscritos" desc="Sê o primeiro a inscrever o teu clube"/>
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 60px 50px', gap:8, padding:'4px 12px', fontSize:10, color:'#475569', fontWeight:600, textTransform:'uppercase' }}>
                <span>#</span><span>Clube</span><span style={{textAlign:'right'}}>Pontos</span><span style={{textAlign:'center'}}>P/E/D</span>
              </div>
              {inscricoes.map((insc,i)=>{
                const clube = insc.clubes_personalizados
                const euSou = meusClubes.some(c=>c.id===insc.clube_id)
                const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':null
                return (
                  <div key={insc.id} style={{ display:'grid', gridTemplateColumns:'28px 1fr 60px 50px', gap:8, alignItems:'center', padding:'12px', borderRadius:10, background:euSou?'rgba(212,175,55,.08)':'#0B1830', border:`1px solid ${euSou?'rgba(212,175,55,.3)':i<3?'rgba(212,175,55,.08)':'#1B2D52'}` }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:900, color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569', textAlign:'center' }}>{medal||i+1}</div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{clube?.emblema} {clube?.nome}</div>
                      {insc.percentil_medio > 0 && <div style={{ fontSize:10, color:'#7A8699' }}>📊 {insc.percentil_medio}% médio</div>}
                    </div>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:i===0?'#D4AF37':'#2DD4A7', textAlign:'right' }}>{insc.pontos}</div>
                    <div style={{ fontSize:10, color:'#475569', textAlign:'center' }}>{insc.vitorias}/{insc.empates}/{insc.derrotas}</div>
                  </div>
                )
              })}
            </div>
      ) : tab === 'grupos' ? (
        Object.keys(grupos).length === 0
          ? <EmptyState icon="⚔️" title="Fase de grupos não iniciada" desc="O administrador ainda não definiu os grupos"/>
          : Object.entries(grupos).map(([g, membros])=>(
              <div key={g} style={{ marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#D4AF37', marginBottom:8, fontFamily:"'Fraunces',serif" }}>
                  {g==='0'?'Grupo Único':`Grupo ${String.fromCharCode(65+parseInt(g))}`}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {membros.sort((a,b)=>b.pontos-a.pontos).map((m,i)=>(
                    <div key={m.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 12px', background:'#0B1830', border:'1px solid #1B2D52', borderRadius:8 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:i<parseInt(liga.promovidos_por_grupo||2)?'#2DD4A7':'#475569', minWidth:16 }}>{i+1}</span>
                      <span style={{ flex:1, fontSize:12, color:'#fff' }}>{m.clubes_personalizados?.emblema} {m.clubes_personalizados?.nome}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'#D4AF37' }}>{m.pontos}pts</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, color:'#2DD4A7', marginTop:4, paddingLeft:12 }}>↑ Top {liga.promovidos_por_grupo||2} avançam</div>
              </div>
            ))
      ) : tab === 'confrontos' ? (
        confrontos.length === 0
          ? <EmptyState icon="🔥" title="Sem confrontos" desc="Os confrontos aparecem quando a fase de grupos começar"/>
          : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {confrontos.map(c=>(
                <div key={c.id} style={{ background:'#0B1830', border:`1px solid ${c.estado==='encerrado'?'rgba(212,175,55,.2)':'#1B2D52'}`, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ flex:1, textAlign:'right', fontSize:13, fontWeight:700, color:c.vencedor_id===c.clube_a_id?'#D4AF37':'#fff' }}>
                      {c.ca?.emblema} {c.ca?.nome}
                    </div>
                    <div style={{ padding:'6px 12px', background:c.estado==='encerrado'?'rgba(212,175,55,.1)':'#101F40', border:`1px solid ${c.estado==='encerrado'?'rgba(212,175,55,.3)':'#1B2D52'}`, borderRadius:8, fontSize:12, fontWeight:700, color:'#fff', minWidth:60, textAlign:'center' }}>
                      {c.estado==='encerrado'?`${Math.round(c.percentil_a)} vs ${Math.round(c.percentil_b)}`:'vs'}
                    </div>
                    <div style={{ flex:1, fontSize:13, fontWeight:700, color:c.vencedor_id===c.clube_b_id?'#D4AF37':'#fff' }}>
                      {c.cb?.emblema} {c.cb?.nome}
                    </div>
                  </div>
                  {c.estado==='encerrado' && c.vencedor_id && (
                    <div style={{ textAlign:'center', fontSize:11, color:'#D4AF37', marginTop:6 }}>
                      🏆 Vencedor: {c.vencedor_id===c.clube_a_id?c.ca?.nome:c.cb?.nome}
                    </div>
                  )}
                </div>
              ))}
            </div>
      ) : (
        jornadas.length === 0
          ? <EmptyState icon="📅" title="Sem jornadas" desc="As jornadas serão criadas quando a liga começar"/>
          : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {jornadas.map(j=>(
                <div key={j.id} style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>Jornada {j.numero} — {j.nome||j.fase}</div>
                      {j.data_inicio && <div style={{ fontSize:10, color:'#7A8699' }}>{new Date(j.data_inicio).toLocaleDateString('pt-PT')} → {j.data_fim?new Date(j.data_fim).toLocaleDateString('pt-PT'):''}</div>}
                    </div>
                    <span style={{ fontSize:10, fontWeight:600, color:j.estado==='ativa'?'#2DD4A7':j.estado==='encerrada'?'#475569':'#D4AF37', background:j.estado==='ativa'?'rgba(45,212,167,.1)':j.estado==='encerrada'?'rgba(71,85,105,.1)':'rgba(212,175,55,.1)', border:`1px solid ${j.estado==='ativa'?'rgba(45,212,167,.3)':j.estado==='encerrada'?'rgba(71,85,105,.3)':'rgba(212,175,55,.3)'}`, borderRadius:99, padding:'2px 8px' }}>
                      {j.estado==='ativa'?'🔴 A decorrer':j.estado==='encerrada'?'✓ Encerrada':'⏳ Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────
export default function LigaClubes({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useIdioma()
  const { temBase, temPro, temElite } = useLicenca()
  const [ligas, setLigas] = useState([])
  const [meusClubes, setMeusClubes] = useState([])
  const [loading, setLoading] = useState(true)
  const [ligaAberta, setLigaAberta] = useState(null)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('todas')
  const [form, setForm] = useState({ nome:'', descricao:'', tipo:'campeoes', formato:'media_percentil', especialidade:'todas', epoca:2026, max_clubes:16, min_membros_por_clube:3, n_grupos:4, promovidos_por_grupo:2 })
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: l }, { data: mc }] = await Promise.all([
        supabase.from('ligas_clubes').select('*').order('created_at', { ascending:false }),
        supabase.from('clube_membros').select('*, clubes_personalizados(*)').eq('user_id', user?.id),
      ])
      setLigas(l||[])
      setMeusClubes((mc||[]).map(m=>m.clubes_personalizados).filter(Boolean))
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const criar = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório','warn'); return }
    setSaving(true)
    try {
      const invite_code = Math.random().toString(36).slice(2,8).toUpperCase()
      const { error } = await supabase.from('ligas_clubes').insert({ ...form, creator_id:user?.id, invite_code, estado:'inscricoes' })
      if (error) throw error
      toast('Liga de Clubes criada!','ok'); setModal(false); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  if (ligaAberta) return <DetalheLigaClubes liga={ligaAberta} user={user} meusClubes={meusClubes} onVoltar={()=>{setLigaAberta(null);load()}} toast={toast}/>

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.25)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#D4AF37,#f97316,#f87171)' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>⚔️ Liga de Clubes</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>Modo Liga dos Campeões · {ligas.length} competição(ões)</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={()=>temElite?setModal(true):nav('precos')}>{temElite?'+ Criar':'🔒 Elite'}</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14 }}>
        {[['todas','🌐 Todas'],['ativas','🔴 A decorrer'],['inscricoes','📋 Inscrições']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'8px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'linear-gradient(135deg,#D4AF37,#B8960C)':'none', color:tab===t?'#050D1A':'#475569' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
      : (() => {
          const filtradas = ligas.filter(l => tab==='todas'||tab==='ativas'?['grupos','quartos','meias','final'].includes(l.estado):l.estado==='inscricoes')
          const mostrar = tab==='todas'?ligas:filtradas
          return mostrar.length === 0
            ? <EmptyState icon="⚔️" title="Sem competições" desc="Cria a primeira Liga de Clubes!"
                action={<button className="btn btn-primary" onClick={()=>setModal(true)}>+ Criar Liga de Clubes</button>}/>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {mostrar.map(l => {
                  const fase = FASES[l.estado] || FASES.inscricoes
                  return (
                    <div key={l.id} className="card card-p" style={{ cursor:'pointer', borderLeft:`3px solid ${fase.cor}` }} onClick={()=>setLigaAberta(l)}>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <div style={{ fontSize:24 }}>{fase.icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{l.nome}</div>
                          <div style={{ fontSize:11, color:'#7A8699' }}>
                            <span style={{ color:fase.cor, fontWeight:600 }}>{fase.label}</span>
                            {' · '}{FORMATOS[l.formato]?.label}{' · '}Época {l.epoca}
                          </div>
                        </div>
                        <span style={{ color:'#475569' }}>→</span>
                      </div>
                    </div>
                  )
                })}
              </div>
        })()
      }

      {/* Modal criar */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:560, maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #1B2D52', flexShrink:0 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff', fontFamily:"'Fraunces',serif" }}>⚔️ Criar Liga de Clubes</div>
              <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:12 }}>
              {/* Tipo */}
              <div className="field">
                <label className="label">Formato da competição</label>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    { id:'liga',     icon:'📅', label:'Liga (época completa)', desc:'Todos os clubes jogam entre si ao longo da época. Campeão por pontos acumulados.' },
                    { id:'campeoes', icon:'🏆', label: t('modoCampeoes'), desc:'Fase de grupos + eliminatórias. O formato mais emocionante — cada jornada pode eliminar.' },
                    { id:'challenge',icon:'🎯', label:'Challenge', desc:'Confronto directo entre clubes. Simples e rápido — ideal para rivalidades locais.' },
                  ].map(t=>(
                    <div key={t.id} onClick={()=>sf('tipo',t.id)} style={{ padding:'10px 12px', borderRadius:8, cursor:'pointer', background:form.tipo===t.id?'rgba(212,175,55,.1)':'rgba(16,31,64,.6)', border:`1px solid ${form.tipo===t.id?'rgba(212,175,55,.4)':'#1B2D52'}` }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span style={{ fontSize:18 }}>{t.icon}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:form.tipo===t.id?'#D4AF37':'#fff' }}>{t.label}</span>
                      </div>
                      <div style={{ fontSize:11, color:'#7A8699', marginTop:4, paddingLeft:26 }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="col-2"><div className="field"><label className="label">Nome *</label><input className="input" placeholder="Ex: Taça Ibérica de Clubes 2026" value={form.nome} onChange={e=>sf('nome',e.target.value)}/></div></div>
                <div className="field"><label className="label">Sistema de pontuação</label>
                  <select className="input" value={form.formato} onChange={e=>sf('formato',e.target.value)}>
                    {Object.entries(FORMATOS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="field"><label className="label">Época</label><input className="input" type="number" value={form.epoca} onChange={e=>sf('epoca',parseInt(e.target.value))}/></div>
                {form.tipo==='campeoes' && <>
                  <div className="field"><label className="label">Nº de grupos</label><input className="input" type="number" min={1} max={8} value={form.n_grupos} onChange={e=>sf('n_grupos',parseInt(e.target.value)||4)}/></div>
                  <div className="field"><label className="label">Promovidos/grupo</label><input className="input" type="number" min={1} value={form.promovidos_por_grupo} onChange={e=>sf('promovidos_por_grupo',parseInt(e.target.value)||2)}/></div>
                </>}
                <div className="field"><label className="label">Máx. clubes</label><input className="input" type="number" value={form.max_clubes} onChange={e=>sf('max_clubes',parseInt(e.target.value)||16)}/></div>
                <div className="field"><label className="label">Mín. membros/clube</label><input className="input" type="number" value={form.min_membros_por_clube} onChange={e=>sf('min_membros_por_clube',parseInt(e.target.value)||3)}/></div>
                <div className="col-2"><div className="field"><label className="label">Descrição</label><textarea className="input" rows={2} style={{resize:'none'}} value={form.descricao} onChange={e=>sf('descricao',e.target.value)}/></div></div>
              </div>
            </div>
            <div style={{ padding:'14px 20px', borderTop:'1px solid #1B2D52', display:'flex', justifyContent:'flex-end', gap:10, flexShrink:0, background:'#0B1830' }}>
              <button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={criar} disabled={saving}>{saving?<Spinner/>:null}⚔️ Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
