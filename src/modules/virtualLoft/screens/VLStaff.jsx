// src/modules/virtualLoft/screens/VLStaff.jsx
import { useState } from 'react'

const TIPOS_STAFF = {
  pt: [
    { id:'veterinario',   icon:'🏥', label:'Veterinário',        desc:'Trata lesões e doenças. Reduz tempo de recuperação.',      salarioBase:800,  atributos:['medicina','diagnostico','experiencia'] },
    { id:'tratador',      icon:'🕊️', label:'Tratador',           desc:'Cuida dos pombos diariamente. Melhora bem-estar geral.',   salarioBase:400,  atributos:['cuidado','dedicacao','experiencia'] },
    { id:'nutricionista', icon:'🌾', label:'Nutricionista',       desc:'Optimiza alimentação. Melhora forma e resistência.',       salarioBase:600,  atributos:['nutricao','planeamento','experiencia'] },
    { id:'geneticista',   icon:'🔬', label:'Geneticista',         desc:'Analisa ADN dos pombos. Revela potencial oculto.',         salarioBase:1200, atributos:['genetica','analise','experiencia'] },
    { id:'preparador',    icon:'🎯', label:'Preparador Físico',   desc:'Optimiza treinos. Aumenta ganho de atributos.',            salarioBase:700,  atributos:['treino','motivacao','experiencia'] },
    { id:'orientacao',    icon:'🧭', label:'Esp. Orientação',     desc:'Melhora capacidade de orientação dos pombos.',             salarioBase:900,  atributos:['orientacao','tecnica','experiencia'] },
    { id:'olheiro',       icon:'👁️', label:'Olheiro',             desc:'Descobre pombos talentosos no mercado.',                   salarioBase:500,  atributos:['visao','negociacao','experiencia'] },
  ],
  en: [
    { id:'veterinario',   icon:'🏥', label:'Veterinarian',       desc:'Treats injuries and diseases. Reduces recovery time.',      salarioBase:800,  atributos:['medicina','diagnostico','experiencia'] },
    { id:'tratador',      icon:'🕊️', label:'Handler',             desc:'Cares for pigeons daily. Improves overall wellbeing.',     salarioBase:400,  atributos:['cuidado','dedicacao','experiencia'] },
    { id:'nutricionista', icon:'🌾', label:'Nutritionist',        desc:'Optimises feeding. Improves form and stamina.',            salarioBase:600,  atributos:['nutricao','planeamento','experiencia'] },
    { id:'geneticista',   icon:'🔬', label:'Geneticist',          desc:'Analyses pigeon DNA. Reveals hidden potential.',           salarioBase:1200, atributos:['genetica','analise','experiencia'] },
    { id:'preparador',    icon:'🎯', label:'Fitness Coach',       desc:'Optimises training. Increases attribute gains.',           salarioBase:700,  atributos:['treino','motivacao','experiencia'] },
    { id:'orientacao',    icon:'🧭', label:'Navigation Specialist',desc:'Improves pigeon navigation ability.',                     salarioBase:900,  atributos:['orientacao','tecnica','experiencia'] },
    { id:'olheiro',       icon:'👁️', label:'Scout',               desc:'Discovers talented pigeons on the market.',                salarioBase:500,  atributos:['visao','negociacao','experiencia'] },
  ],
  es: [
    { id:'veterinario',   icon:'🏥', label:'Veterinario',         desc:'Trata lesiones y enfermedades. Reduce tiempo de recuperación.', salarioBase:800,  atributos:['medicina','diagnostico','experiencia'] },
    { id:'tratador',      icon:'🕊️', label:'Cuidador',            desc:'Cuida las palomas diariamente. Mejora el bienestar general.',  salarioBase:400,  atributos:['cuidado','dedicacao','experiencia'] },
    { id:'nutricionista', icon:'🌾', label:'Nutricionista',        desc:'Optimiza alimentación. Mejora forma y resistencia.',           salarioBase:600,  atributos:['nutricao','planeamento','experiencia'] },
    { id:'geneticista',   icon:'🔬', label:'Genetista',            desc:'Analiza ADN de palomas. Revela potencial oculto.',             salarioBase:1200, atributos:['genetica','analise','experiencia'] },
    { id:'preparador',    icon:'🎯', label:'Preparador Físico',    desc:'Optimiza entrenamientos. Aumenta ganancia de atributos.',      salarioBase:700,  atributos:['treino','motivacao','experiencia'] },
    { id:'orientacao',    icon:'🧭', label:'Esp. Orientación',     desc:'Mejora capacidad de orientación de las palomas.',              salarioBase:900,  atributos:['orientacao','tecnica','experiencia'] },
    { id:'olheiro',       icon:'👁️', label:'Ojeador',              desc:'Descubre palomas talentosas en el mercado.',                   salarioBase:500,  atributos:['visao','negociacao','experiencia'] },
  ],
}

function gerarMembro(tipo, idioma) {
  const nomes = ['Carlos Silva','João Ferreira','Ana Santos','Pedro Costa','Maria Oliveira','Rui Martins','Sofia Rodrigues','Miguel Pereira']
  const nome = nomes[Math.floor(Math.random() * nomes.length)]
  const nivel = Math.floor(Math.random() * 4) + 1
  const atrs = {}
  tipo.atributos.forEach(a => { atrs[a] = Math.floor(Math.random() * 40) + 40 + (nivel * 8) })
  return {
    id: `staff_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    nome, tipo: tipo.id, nivel,
    salario: Math.round(tipo.salarioBase * (0.8 + nivel * 0.15)),
    atributos: atrs,
    contratado: false,
  }
}

function corNivel(n) {
  return n >= 4 ? '#D4AF37' : n >= 3 ? '#2DD4A7' : n >= 2 ? '#4C8DFF' : '#7A8699'
}

export default function VLStaff({ carreira, onVoltar, onGuardar, idioma = 'pt' }) {
  // Ler sempre do localStorage para ter dados mais recentes
  const [carreiraLocal, setCarreiraLocal] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vl_carreira')) || carreira } catch { return carreira }
  })
  const c = carreiraLocal

  const salvarLocal = (dados) => {
    try { localStorage.setItem('vl_carreira', JSON.stringify(dados)) } catch {}
    setCarreiraLocal({ ...dados })
    onGuardar?.(dados)
  }

  const tipos = TIPOS_STAFF[idioma] || TIPOS_STAFF.pt
  const [tipoSel, setTipoSel] = useState(null)
  const [candidatos, setCandidatos] = useState({})
  const [msg, setMsg] = useState(null)

  const staffAtual = c.staff || []
  const salarioTotal = staffAtual.reduce((s, m) => s + (m.salario || 0), 0)

  const pesquisarCandidatos = (tipo) => {
    if (candidatos[tipo.id]) { setTipoSel(tipo); return }
    // Gerar 3 candidatos
    const lista = Array.from({length:3}, () => gerarMembro(tipo, idioma))
    setCandidatos(c => ({ ...c, [tipo.id]: lista }))
    setTipoSel(tipo)
  }

  const contratar = (membro) => {
    if (c.orcamento < membro.salario * 12) {
      setMsg({ tipo:'erro', texto: idioma==='en'?'Not enough budget for annual salary!':idioma==='es'?'¡Presupuesto insuficiente para salario anual!':'Orçamento insuficiente para salário anual!' })
      setTimeout(() => setMsg(null), 2500)
      return
    }
    // Verificar se já tem alguém deste tipo
    const jatem = staffAtual.find(s => s.tipo === membro.tipo)
    let novoStaff = [...staffAtual]
    if (jatem) {
      novoStaff = novoStaff.filter(s => s.tipo !== membro.tipo)
    }
    novoStaff.push({ ...membro, contratado: true })
    const novaCarreira = {
      ...carreira,
      staff: novoStaff,
      orcamento: c.orcamento - membro.salario * 3, // paga 3 meses adiantado
    }
    salvarLocal(novaCarreira)
    setMsg({ tipo:'ok', texto: `${membro.nome} ${idioma==='en'?'hired!':idioma==='es'?'contratado!':'contratado!'}` })
    setTimeout(() => setMsg(null), 2500)
    setTipoSel(null)
  }

  const despedir = (membro) => {
    const novoStaff = staffAtual.filter(s => s.id !== membro.id)
    onGuardar?.({ ...c, staff: novoStaff })
    setMsg({ tipo:'info', texto: `${membro.nome} ${idioma==='en'?'dismissed':idioma==='es'?'despedido':'despedido'}` })
    setTimeout(() => setMsg(null), 2000)
  }

  const attrLabel = { medicina:{pt:'Medicina',en:'Medicine',es:'Medicina'}, diagnostico:{pt:'Diagnóstico',en:'Diagnosis',es:'Diagnóstico'}, cuidado:{pt:'Cuidado',en:'Care',es:'Cuidado'}, dedicacao:{pt:'Dedicação',en:'Dedication',es:'Dedicación'}, nutricao:{pt:'Nutrição',en:'Nutrition',es:'Nutrición'}, planeamento:{pt:'Planeamento',en:'Planning',es:'Planificación'}, genetica:{pt:'Genética',en:'Genetics',es:'Genética'}, analise:{pt:'Análise',en:'Analysis',es:'Análisis'}, treino:{pt:'Treino',en:'Training',es:'Entrenamiento'}, motivacao:{pt:'Motivação',en:'Motivation',es:'Motivación'}, orientacao:{pt:'Orientação',en:'Navigation',es:'Orientación'}, tecnica:{pt:'Técnica',en:'Technique',es:'Técnica'}, visao:{pt:'Visão',en:'Vision',es:'Visión'}, negociacao:{pt:'Negociação',en:'Negotiation',es:'Negociación'}, experiencia:{pt:'Experiência',en:'Experience',es:'Experiencia'} }

  return (
    <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', fontFamily:'inherit' }}>
      <div style={{ background:'linear-gradient(180deg,#050D1A,#030812)', borderBottom:'1px solid rgba(255,255,255,.05)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={onVoltar} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>←</button>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>👥 Staff</div>
            <div style={{ fontSize:10, color:'#7A8699' }}>{staffAtual.length} {idioma==='en'?'hired':idioma==='es'?'contratados':'contratados'} · {salarioTotal.toLocaleString()}€/{idioma==='en'?'mo':idioma==='es'?'mes':'mês'} · {c.orcamento.toLocaleString()}€</div>
          </div>
        </div>
      </div>

      {msg && (
        <div style={{ margin:'12px 16px 0', padding:'10px 14px', background: msg.tipo==='ok'?'rgba(45,212,167,.1)':msg.tipo==='erro'?'rgba(248,113,113,.1)':'rgba(76,141,255,.1)', border:`1px solid ${msg.tipo==='ok'?'rgba(45,212,167,.3)':msg.tipo==='erro'?'rgba(248,113,113,.3)':'rgba(76,141,255,.3)'}`, borderRadius:10, fontSize:12, color:msg.tipo==='ok'?'#2DD4A7':msg.tipo==='erro'?'#f87171':'#4C8DFF', fontWeight:600 }}>
          {msg.tipo==='ok'?'✅':msg.tipo==='erro'?'❌':'ℹ️'} {msg.texto}
        </div>
      )}

      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Staff actual */}
        {staffAtual.length > 0 && (
          <div>
            <div style={{ fontSize:9, color:'#2DD4A7', fontWeight:700, letterSpacing:1.5, marginBottom:8 }}>
              {idioma==='en'?'CURRENT STAFF':idioma==='es'?'STAFF ACTUAL':'STAFF ACTUAL'}
            </div>
            {staffAtual.map(m => {
              const tipo = tipos.find(t => t.id === m.tipo)
              return (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(45,212,167,.05)', border:'1px solid rgba(45,212,167,.15)', borderRadius:10, marginBottom:6 }}>
                  <span style={{ fontSize:20 }}>{tipo?.icon || '👤'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{m.nome}</div>
                    <div style={{ fontSize:10, color:'#7A8699' }}>{tipo?.label} · {m.salario.toLocaleString()}€/{idioma==='en'?'mo':idioma==='es'?'mes':'mês'}</div>
                  </div>
                  <div style={{ display:'flex', gap:3 }}>
                    {Array.from({length:5}).map((_,i)=><div key={i} style={{ width:6,height:6,borderRadius:1,background:i<m.nivel?corNivel(m.nivel):'rgba(255,255,255,.08)' }}/>)}
                  </div>
                  <button onClick={() => despedir(m)} style={{ background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.2)', borderRadius:6, padding:'4px 8px', color:'#f87171', fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>
                    {idioma==='en'?'Fire':idioma==='es'?'Despedir':'Despedir'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Contratar */}
        <div>
          <div style={{ fontSize:9, color:'#4C8DFF', fontWeight:700, letterSpacing:1.5, marginBottom:8 }}>
            {idioma==='en'?'HIRE STAFF':idioma==='es'?'CONTRATAR STAFF':'CONTRATAR STAFF'}
          </div>
          {tipos.map(tipo => {
            const jatem = staffAtual.find(s => s.tipo === tipo.id)
            const isOpen = tipoSel?.id === tipo.id
            return (
              <div key={tipo.id} style={{ marginBottom:8 }}>
                <div onClick={() => pesquisarCandidatos(tipo)}
                  style={{ display:'flex', gap:12, padding:'12px 14px', background: isOpen?'rgba(76,141,255,.08)':'rgba(255,255,255,.02)', border:`1px solid ${isOpen?'rgba(76,141,255,.3)':'rgba(255,255,255,.05)'}`, borderRadius:10, cursor:'pointer', transition:'all .15s' }}>
                  <span style={{ fontSize:22, width:28, textAlign:'center' }}>{tipo.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>{tipo.label}</div>
                      {jatem && <span style={{ fontSize:9, background:'rgba(45,212,167,.15)', color:'#2DD4A7', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>✓ CONTRATADO</span>}
                    </div>
                    <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>{tipo.desc}</div>
                    <div style={{ fontSize:10, color:'#D4AF37', marginTop:4 }}>~{tipo.salarioBase.toLocaleString()}€/{idioma==='en'?'mo':idioma==='es'?'mes':'mês'}</div>
                  </div>
                  <div style={{ fontSize:12, color:'#475569', alignSelf:'center' }}>{isOpen?'▲':'▼'}</div>
                </div>

                {/* Candidatos */}
                {isOpen && candidatos[tipo.id] && (
                  <div style={{ padding:'10px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderTop:'none', borderBottomLeftRadius:10, borderBottomRightRadius:10 }}>
                    <div style={{ fontSize:9, color:'#7A8699', fontWeight:700, letterSpacing:1, marginBottom:8 }}>
                      {idioma==='en'?'AVAILABLE CANDIDATES':idioma==='es'?'CANDIDATOS DISPONIBLES':'CANDIDATOS DISPONÍVEIS'}
                    </div>
                    {candidatos[tipo.id].map(c => (
                      <div key={c.id} style={{ padding:'10px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:8, marginBottom:6 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700 }}>{c.nome}</div>
                            <div style={{ display:'flex', gap:3, marginTop:3 }}>
                              {Array.from({length:5}).map((_,i)=><div key={i} style={{ width:8,height:8,borderRadius:2,background:i<c.nivel?corNivel(c.nivel):'rgba(255,255,255,.08)' }}/>)}
                            </div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontSize:12, fontWeight:700, color:'#D4AF37' }}>{c.salario.toLocaleString()}€/{idioma==='en'?'mo':idioma==='es'?'mes':'mês'}</div>
                            <div style={{ fontSize:9, color:'#475569' }}>{(c.salario*3).toLocaleString()}€ {idioma==='en'?'upfront':idioma==='es'?'adelanto':'adiantado'}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                          {tipo.atributos.map(a => (
                            <div key={a} style={{ fontSize:9, color:'#7A8699' }}>
                              {attrLabel[a]?.[idioma]||a}: <span style={{ color:corNivel(Math.ceil(c.atributos[a]/20)), fontWeight:700 }}>{c.atributos[a]}</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => contratar(c)}
                          style={{ width:'100%', padding:'8px', borderRadius:6, border:'none', background:'linear-gradient(135deg,#1E5FD9,#1456C0)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                          {idioma==='en'?'Hire':idioma==='es'?'Contratar':'Contratar'} ({(c.salario*3).toLocaleString()}€)
                        </button>
                      </div>
                    ))}
                    <button onClick={() => { const lista = Array.from({length:3},()=>gerarMembro(tipo,idioma)); setCandidatos(c=>({...c,[tipo.id]:lista})) }}
                      style={{ width:'100%', padding:'8px', borderRadius:6, border:'1px solid rgba(255,255,255,.08)', background:'transparent', color:'#7A8699', fontSize:11, cursor:'pointer', fontFamily:'inherit', marginTop:4 }}>
                      🔄 {idioma==='en'?'New candidates':idioma==='es'?'Nuevos candidatos':'Novos candidatos'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
