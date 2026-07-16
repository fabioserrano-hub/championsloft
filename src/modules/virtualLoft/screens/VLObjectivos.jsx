// src/modules/virtualLoft/screens/VLObjectivos.jsx
import { useState, useEffect } from 'react'

function gerarObjectivos(carreira, idioma) {
  const epoca = carreira.epoca || 1
  const nivel = carreira.nivel_reputacao || 'local'
  const pombos = carreira.pombos || []
  const historico = carreira.historico_provas || []

  const OBJECTIVOS = {
    pt: [
      // Provas
      { id:'primeira_prova', cat:'provas', icon:'🏁', titulo:'Primeira Prova', desc:'Participa na tua primeira prova', meta: 1, progresso: historico.length, tipo:'provas_total', dificuldade:'facil', premio:{ orcamento:200 } },
      { id:'top5', cat:'provas', icon:'🥇', titulo:'Top 5%', desc:'Termina uma prova no top 5%', meta:1, progresso: historico.filter(r=>r.percentil>=95).length, tipo:'top_percentil', dificuldade:'medio', premio:{ orcamento:500, reputacao:5 } },
      { id:'vitorias3', cat:'provas', icon:'🏆', titulo:'Trio de Ouro', desc:'Ganha 3 provas', meta:3, progresso: historico.filter(r=>r.posicao===1).length, tipo:'vitorias', dificuldade:'dificil', premio:{ orcamento:1000, reputacao:10 } },
      // Pombos
      { id:'plantel10', cat:'pombos', icon:'🐦', titulo:'Plantel Sólido', desc:'Tem 10 pombos activos', meta:10, progresso: pombos.filter(p=>p.estado==='activo').length, tipo:'pombos_activos', dificuldade:'facil', premio:{ orcamento:300 } },
      { id:'estrela5', cat:'pombos', icon:'⭐', titulo:'Estrela de 5', desc:'Tem um pombo com 5 estrelas', meta:1, progresso: pombos.filter(p=>p.rating>=5).length, tipo:'rating', dificuldade:'dificil', premio:{ orcamento:800, reputacao:8 } },
      { id:'ninhada', cat:'pombos', icon:'🥚', titulo:'Primeira Ninhada', desc:'Cria a tua primeira ninhada', meta:1, progresso: (carreira.ninhadas_virtuais||[]).length, tipo:'ninhadas', dificuldade:'facil', premio:{ orcamento:200 } },
      // Pombal
      { id:'upgrade1', cat:'pombal', icon:'🏠', titulo:'Primeira Melhoria', desc:'Faz upgrade a uma estrutura', meta:1, progresso: Object.values(carreira.estruturas||{}).filter(e=>e.nivel>0).length, tipo:'upgrades', dificuldade:'facil', premio:{ orcamento:300 } },
      { id:'staff2', cat:'pombal', icon:'👥', titulo:'Equipa de Trabalho', desc:'Contrata 2 membros de staff', meta:2, progresso: (carreira.staff||[]).length, tipo:'staff', dificuldade:'medio', premio:{ orcamento:600 } },
      // Financeiro
      { id:'orcamento5k', cat:'financas', icon:'💰', titulo:'Poupança', desc:'Acumula 5.000€', meta:5000, progresso: carreira.orcamento||0, tipo:'orcamento', dificuldade:'medio', premio:{ reputacao:5 } },
      { id:'orcamento20k', cat:'financas', icon:'💎', titulo:'Investidor', desc:'Acumula 20.000€', meta:20000, progresso: carreira.orcamento||0, tipo:'orcamento', dificuldade:'dificil', premio:{ reputacao:15 } },
      // Reputação
      { id:'rep_distrital', cat:'reputacao', icon:'📍', titulo:'Distrital', desc:'Atinge reputação Distrital', meta:1, progresso: ['distrital','regional','nacional','internacional','olimpico'].includes(nivel)?1:0, tipo:'nivel_rep', dificuldade:'medio', premio:{ orcamento:500 } },
      { id:'rep_nacional', cat:'reputacao', icon:'🇵🇹', titulo:'Nacional', desc:'Atinge reputação Nacional', meta:1, progresso: ['nacional','internacional','olimpico'].includes(nivel)?1:0, tipo:'nivel_rep', dificuldade:'dificil', premio:{ orcamento:2000, reputacao:10 } },
    ],
    en: [
      { id:'primeira_prova', cat:'provas', icon:'🏁', titulo:'First Race', desc:'Participate in your first race', meta:1, progresso: historico.length, tipo:'provas_total', dificuldade:'facil', premio:{ orcamento:200 } },
      { id:'top5', cat:'provas', icon:'🥇', titulo:'Top 5%', desc:'Finish a race in the top 5%', meta:1, progresso: historico.filter(r=>r.percentil>=95).length, tipo:'top_percentil', dificuldade:'medio', premio:{ orcamento:500, reputacao:5 } },
      { id:'vitorias3', cat:'provas', icon:'🏆', titulo:'Golden Trio', desc:'Win 3 races', meta:3, progresso: historico.filter(r=>r.posicao===1).length, tipo:'vitorias', dificuldade:'dificil', premio:{ orcamento:1000, reputacao:10 } },
      { id:'plantel10', cat:'pombos', icon:'🐦', titulo:'Solid Squad', desc:'Have 10 active pigeons', meta:10, progresso: pombos.filter(p=>p.estado==='activo').length, tipo:'pombos_activos', dificuldade:'facil', premio:{ orcamento:300 } },
      { id:'estrela5', cat:'pombos', icon:'⭐', titulo:'5-Star Pigeon', desc:'Have a 5-star pigeon', meta:1, progresso: pombos.filter(p=>p.rating>=5).length, tipo:'rating', dificuldade:'dificil', premio:{ orcamento:800, reputacao:8 } },
      { id:'ninhada', cat:'pombos', icon:'🥚', titulo:'First Clutch', desc:'Create your first clutch', meta:1, progresso: (carreira.ninhadas_virtuais||[]).length, tipo:'ninhadas', dificuldade:'facil', premio:{ orcamento:200 } },
      { id:'upgrade1', cat:'pombal', icon:'🏠', titulo:'First Upgrade', desc:'Upgrade a facility', meta:1, progresso: Object.values(carreira.estruturas||{}).filter(e=>e.nivel>0).length, tipo:'upgrades', dificuldade:'facil', premio:{ orcamento:300 } },
      { id:'staff2', cat:'pombal', icon:'👥', titulo:'Work Team', desc:'Hire 2 staff members', meta:2, progresso: (carreira.staff||[]).length, tipo:'staff', dificuldade:'medio', premio:{ orcamento:600 } },
      { id:'orcamento5k', cat:'financas', icon:'💰', titulo:'Savings', desc:'Accumulate €5,000', meta:5000, progresso: carreira.orcamento||0, tipo:'orcamento', dificuldade:'medio', premio:{ reputacao:5 } },
      { id:'orcamento20k', cat:'financas', icon:'💎', titulo:'Investor', desc:'Accumulate €20,000', meta:20000, progresso: carreira.orcamento||0, tipo:'orcamento', dificuldade:'dificil', premio:{ reputacao:15 } },
      { id:'rep_distrital', cat:'reputacao', icon:'📍', titulo:'District', desc:'Reach District reputation', meta:1, progresso: ['distrital','regional','nacional','internacional','olimpico'].includes(nivel)?1:0, tipo:'nivel_rep', dificuldade:'medio', premio:{ orcamento:500 } },
      { id:'rep_nacional', cat:'reputacao', icon:'🇵🇹', titulo:'National', desc:'Reach National reputation', meta:1, progresso: ['nacional','internacional','olimpico'].includes(nivel)?1:0, tipo:'nivel_rep', dificuldade:'dificil', premio:{ orcamento:2000, reputacao:10 } },
    ],
  }

  const lista = OBJECTIVOS[idioma] || OBJECTIVOS.pt
  const concluidos = carreira.objectivos_concluidos || []
  return lista.map(o => ({
    ...o,
    concluido: concluidos.includes(o.id),
    percentagem: Math.min(100, Math.round((o.progresso / o.meta) * 100)),
  }))
}

function corDificuldade(d) {
  return d==='dificil'?'#f87171':d==='medio'?'#D4AF37':'#2DD4A7'
}

export default function VLObjectivos({ carreira, onVoltar, onGuardar, idioma = 'pt' }) {
  const [filtro, setFiltro] = useState('todos')
  const [msg, setMsg] = useState(null)

  const objectivos = gerarObjectivos(carreira, idioma)
  const concluidos = objectivos.filter(o => o.concluido)
  const disponiveis = objectivos.filter(o => !o.concluido && o.percentagem < 100)
  const prontos = objectivos.filter(o => !o.concluido && o.percentagem >= 100)

  const reclamar = (obj) => {
    const concluidos = [...(carreira.objectivos_concluidos||[]), obj.id]
    let novaCarreira = { ...carreira, objectivos_concluidos: concluidos }
    if (obj.premio.orcamento) novaCarreira.orcamento = (novaCarreira.orcamento||0) + obj.premio.orcamento
    if (obj.premio.reputacao) novaCarreira.reputacao = Math.min(100, (novaCarreira.reputacao||5) + obj.premio.reputacao)
    onGuardar?.(novaCarreira)
    setMsg({ titulo: obj.titulo, premio: obj.premio })
    setTimeout(() => setMsg(null), 4000)
  }

  const FILTROS = [
    { id:'todos', label: idioma==='en'?'All':idioma==='es'?'Todos':'Todos' },
    { id:'prontos', label: `🎁 ${idioma==='en'?'Claim':idioma==='es'?'Reclamar':'Reclamar'} (${prontos.length})` },
    { id:'disponiveis', label: idioma==='en'?'Active':idioma==='es'?'Activos':'Activos' },
    { id:'concluidos', label: idioma==='en'?'Done':idioma==='es'?'Hechos':'Feitos' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', fontFamily:'inherit' }}>
      <div style={{ background:'linear-gradient(180deg,#050D1A,#030812)', borderBottom:'1px solid rgba(255,255,255,.05)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={onVoltar} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>←</button>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>🎯 {idioma==='en'?'Objectives':idioma==='es'?'Objetivos':'Objectivos'}</div>
            <div style={{ fontSize:10, color:'#7A8699' }}>{concluidos.length}/{objectivos.length} {idioma==='en'?'completed':idioma==='es'?'completados':'concluídos'}{prontos.length>0?` · ${prontos.length} ${idioma==='en'?'to claim':idioma==='es'?'para reclamar':'para reclamar'}`:''}</div>
          </div>
        </div>

        {/* Barra de progresso geral */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#475569', marginBottom:4 }}>
            <span>{idioma==='en'?'Overall progress':idioma==='es'?'Progreso general':'Progresso geral'}</span>
            <span>{Math.round((concluidos.length/objectivos.length)*100)}%</span>
          </div>
          <div style={{ height:4, background:'rgba(255,255,255,.06)', borderRadius:2 }}>
            <div style={{ height:'100%', width:`${(concluidos.length/objectivos.length)*100}%`, background:'linear-gradient(90deg,#D4AF37,#2DD4A7)', borderRadius:2, transition:'width .5s' }}/>
          </div>
        </div>

        <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none' }}>
          {FILTROS.map(f => (
            <button key={f.id} onClick={()=>setFiltro(f.id)}
              style={{ flex:'none', padding:'7px 12px', borderRadius:8, border:filtro===f.id?'none':'1px solid rgba(255,255,255,.08)', background:filtro===f.id?'linear-gradient(135deg,#1E5FD9,#1456C0)':'rgba(255,255,255,.04)', color:filtro===f.id?'#fff':'#cbd5e1', fontSize:11, fontWeight:filtro===f.id?700:500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notificação de prémio */}
      {msg && (
        <div style={{ margin:'12px 16px 0', padding:'14px 16px', background:'linear-gradient(135deg,rgba(212,175,55,.15),rgba(45,212,167,.1))', border:'1px solid rgba(212,175,55,.3)', borderRadius:12 }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#D4AF37', marginBottom:4 }}>🎉 {msg.titulo} {idioma==='en'?'completed!':idioma==='es'?'¡completado!':'concluído!'}</div>
          <div style={{ fontSize:11, color:'#7A8699' }}>
            {msg.premio.orcamento && `+${msg.premio.orcamento.toLocaleString()}€`}
            {msg.premio.orcamento && msg.premio.reputacao && ' · '}
            {msg.premio.reputacao && `+${msg.premio.reputacao} ${idioma==='en'?'reputation':idioma==='es'?'reputación':'reputação'}`}
          </div>
        </div>
      )}

      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
        {(filtro==='prontos'?prontos:filtro==='concluidos'?concluidos:filtro==='disponiveis'?disponiveis:objectivos).map(obj => {
          const cor = corDificuldade(obj.dificuldade)
          const pct = obj.percentagem
          return (
            <div key={obj.id} style={{ padding:'14px', background: obj.concluido?'rgba(255,255,255,.02)':pct>=100?'rgba(212,175,55,.06)':'rgba(255,255,255,.02)', border:`1px solid ${obj.concluido?'rgba(255,255,255,.04)':pct>=100?'rgba(212,175,55,.25)':'rgba(255,255,255,.06)'}`, borderRadius:12, opacity:obj.concluido?.6:1 }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:`${cor}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {obj.concluido ? '✅' : obj.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                    <div style={{ fontSize:13, fontWeight:700, color: obj.concluido?'#475569':'#fff' }}>{obj.titulo}</div>
                    <span style={{ fontSize:9, color:cor, fontWeight:700, background:`${cor}15`, padding:'2px 6px', borderRadius:4 }}>
                      {obj.dificuldade==='facil'?'EASY':obj.dificuldade==='medio'?'MED':'HARD'}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:'#7A8699', marginBottom:8 }}>{obj.desc}</div>

                  {/* Barra de progresso */}
                  {!obj.concluido && (
                    <div style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#475569', marginBottom:3 }}>
                        <span>{obj.progresso} / {obj.meta}</span>
                        <span style={{ color: pct>=100?'#D4AF37':'#475569', fontWeight:pct>=100?700:400 }}>{pct}%</span>
                      </div>
                      <div style={{ height:4, background:'rgba(255,255,255,.06)', borderRadius:2 }}>
                        <div style={{ height:'100%', width:`${pct}%`, background: pct>=100?'linear-gradient(90deg,#D4AF37,#f97316)':cor, borderRadius:2, transition:'width .5s' }}/>
                      </div>
                    </div>
                  )}

                  {/* Prémio e botão */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:10, color:'#D4AF37' }}>
                      🎁 {obj.premio.orcamento?`+${obj.premio.orcamento.toLocaleString()}€`:''}
                      {obj.premio.orcamento&&obj.premio.reputacao?' · ':''}
                      {obj.premio.reputacao?`+${obj.premio.reputacao} rep`:''}
                    </div>
                    {pct >= 100 && !obj.concluido && (
                      <button onClick={()=>reclamar(obj)}
                        style={{ padding:'6px 12px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#D4AF37,#B8960C)', color:'#050D1A', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        🎁 {idioma==='en'?'Claim':idioma==='es'?'Reclamar':'Reclamar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
