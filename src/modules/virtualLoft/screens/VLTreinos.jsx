// src/modules/virtualLoft/screens/VLTreinos.jsx
import { useState } from 'react'

const TIPOS_TREINO = {
  pt: [
    { id:'velocidade',  icon:'⚡', label:'Velocidade',   desc:'Melhora velocidade e instinto',        attr:['velocidade','instinto'],   cor:'#f97316' },
    { id:'resistencia', icon:'💪', label:'Resistência',  desc:'Melhora resistência e força',          attr:['resistencia','forca'],     cor:'#2DD4A7' },
    { id:'orientacao',  icon:'🧭', label:'Orientação',   desc:'Melhora orientação e inteligência',    attr:['orientacao','inteligencia'],cor:'#4C8DFF' },
    { id:'recuperacao', icon:'🛌', label:'Recuperação',  desc:'Melhora recuperação e coragem',        attr:['recuperacao','coragem'],   cor:'#A855F7' },
    { id:'voo_longo',   icon:'🌍', label:'Voo Longo',   desc:'Melhora resistência e orientação',     attr:['resistencia','orientacao'],cor:'#D4AF37' },
    { id:'descanso',    icon:'😴', label:'Descanso',     desc:'Recupera forma e evita lesões',        attr:[],                          cor:'#7A8699' },
  ],
  en: [
    { id:'velocidade',  icon:'⚡', label:'Speed',        desc:'Improves speed and instinct',          attr:['velocidade','instinto'],   cor:'#f97316' },
    { id:'resistencia', icon:'💪', label:'Stamina',      desc:'Improves stamina and strength',        attr:['resistencia','forca'],     cor:'#2DD4A7' },
    { id:'orientacao',  icon:'🧭', label:'Navigation',   desc:'Improves navigation and intelligence', attr:['orientacao','inteligencia'],cor:'#4C8DFF' },
    { id:'recuperacao', icon:'🛌', label:'Recovery',     desc:'Improves recovery and courage',        attr:['recuperacao','coragem'],   cor:'#A855F7' },
    { id:'voo_longo',   icon:'🌍', label:'Long Flight',  desc:'Improves stamina and navigation',      attr:['resistencia','orientacao'],cor:'#D4AF37' },
    { id:'descanso',    icon:'😴', label:'Rest',         desc:'Recovers form and prevents injuries',  attr:[],                          cor:'#7A8699' },
  ],
  es: [
    { id:'velocidade',  icon:'⚡', label:'Velocidad',    desc:'Mejora velocidad e instinto',          attr:['velocidade','instinto'],   cor:'#f97316' },
    { id:'resistencia', icon:'💪', label:'Resistencia',  desc:'Mejora resistencia y fuerza',          attr:['resistencia','forca'],     cor:'#2DD4A7' },
    { id:'orientacao',  icon:'🧭', label:'Orientación',  desc:'Mejora orientación e inteligencia',    attr:['orientacao','inteligencia'],cor:'#4C8DFF' },
    { id:'recuperacao', icon:'🛌', label:'Recuperación', desc:'Mejora recuperación y coraje',         attr:['recuperacao','coragem'],   cor:'#A855F7' },
    { id:'voo_longo',   icon:'🌍', label:'Vuelo Largo',  desc:'Mejora resistencia y orientación',     attr:['resistencia','orientacao'],cor:'#D4AF37' },
    { id:'descanso',    icon:'😴', label:'Descanso',     desc:'Recupera forma y evita lesiones',      attr:[],                          cor:'#7A8699' },
  ],
}

const DIAS = {
  pt: ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'],
  en: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  es: ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'],
}

const PLANOS_SUGERIDOS = {
  pt: [
    { nome:'Plano Velocidade', dias:['velocidade','orientacao','velocidade','recuperacao','voo_longo','descanso','descanso'] },
    { nome:'Plano Fundo',      dias:['resistencia','voo_longo','recuperacao','resistencia','voo_longo','descanso','descanso'] },
    { nome:'Plano Equilibrado',dias:['velocidade','resistencia','orientacao','recuperacao','voo_longo','descanso','descanso'] },
  ],
  en: [
    { nome:'Speed Plan',      dias:['velocidade','orientacao','velocidade','recuperacao','voo_longo','descanso','descanso'] },
    { nome:'Endurance Plan',  dias:['resistencia','voo_longo','recuperacao','resistencia','voo_longo','descanso','descanso'] },
    { nome:'Balanced Plan',   dias:['velocidade','resistencia','orientacao','recuperacao','voo_longo','descanso','descanso'] },
  ],
  es: [
    { nome:'Plan Velocidad',  dias:['velocidade','orientacao','velocidade','recuperacao','voo_longo','descanso','descanso'] },
    { nome:'Plan Fondo',      dias:['resistencia','voo_longo','recuperacao','resistencia','voo_longo','descanso','descanso'] },
    { nome:'Plan Equilibrado',dias:['velocidade','resistencia','orientacao','recuperacao','voo_longo','descanso','descanso'] },
  ],
}

export default function VLTreinos({ carreira, onVoltar, onGuardar, idioma = 'pt' }) {
  const tipos = TIPOS_TREINO[idioma] || TIPOS_TREINO.pt
  const dias = DIAS[idioma] || DIAS.pt
  const planosSugeridos = PLANOS_SUGERIDOS[idioma] || PLANOS_SUGERIDOS.pt

  const planoInicial = carreira.plano_treino || Array(7).fill('descanso')
  const [plano, setPlano] = useState(planoInicial)
  const [diaEditando, setDiaEditando] = useState(null)
  const [guardado, setGuardado] = useState(false)

  const aplicarPlano = (p) => setPlano([...p.dias])

  const guardar = () => {
    onGuardar?.({ ...carreira, plano_treino: plano })
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  // Calcular benefícios semanais
  const beneficios = {}
  plano.forEach(tid => {
    const tipo = tipos.find(t => t.id === tid)
    tipo?.attr?.forEach(a => { beneficios[a] = (beneficios[a] || 0) + 1 })
  })

  return (
    <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', fontFamily:'inherit' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(180deg,#050D1A,#030812)', borderBottom:'1px solid rgba(255,255,255,.05)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <button onClick={onVoltar} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>←</button>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>🎯 {idioma==='en'?'Training Plan':idioma==='es'?'Plan de Entrenamiento':'Plano de Treino'}</div>
            <div style={{ fontSize:10, color:'#7A8699' }}>{idioma==='en'?'Weekly schedule':idioma==='es'?'Horario semanal':'Programa semanal'}</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Planos sugeridos */}
        <div>
          <div style={{ fontSize:9, color:'#D4AF37', fontWeight:700, letterSpacing:1.5, marginBottom:8 }}>
            {idioma==='en'?'SUGGESTED PLANS':idioma==='es'?'PLANES SUGERIDOS':'PLANOS SUGERIDOS'}
          </div>
          <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4 }}>
            {planosSugeridos.map((p, i) => (
              <button key={i} onClick={() => aplicarPlano(p)}
                style={{ flex:'none', padding:'8px 14px', borderRadius:10, border:'1px solid rgba(212,175,55,.2)', background:'rgba(212,175,55,.06)', color:'#D4AF37', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                {p.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Plano semanal */}
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ fontSize:9, color:'#4C8DFF', fontWeight:700, letterSpacing:1.5, marginBottom:4 }}>
            {idioma==='en'?'WEEKLY PLAN':idioma==='es'?'PLAN SEMANAL':'PLANO SEMANAL'}
          </div>
          {dias.map((dia, i) => {
            const tipoAtual = tipos.find(t => t.id === plano[i]) || tipos[5]
            const isEditando = diaEditando === i
            return (
              <div key={i}>
                <div onClick={() => setDiaEditando(isEditando ? null : i)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background: isEditando ? `${tipoAtual.cor}15` : 'rgba(255,255,255,.03)', border:`1px solid ${isEditando ? tipoAtual.cor+'40' : 'rgba(255,255,255,.06)'}`, borderRadius:10, cursor:'pointer', transition:'all .15s' }}>
                  <div style={{ width:28, fontSize:9, color:'#7A8699', fontWeight:700, flexShrink:0 }}>{dia.slice(0,3).toUpperCase()}</div>
                  <div style={{ width:28, height:28, borderRadius:8, background:`${tipoAtual.cor}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{tipoAtual.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color: isEditando ? tipoAtual.cor : '#fff' }}>{tipoAtual.label}</div>
                    <div style={{ fontSize:10, color:'#475569' }}>{tipoAtual.desc}</div>
                  </div>
                  <div style={{ fontSize:12, color:'#475569' }}>{isEditando ? '▲' : '▼'}</div>
                </div>

                {/* Selector de treino */}
                {isEditando && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginTop:6, marginBottom:6 }}>
                    {tipos.map(t => (
                      <div key={t.id} onClick={() => { const np=[...plano]; np[i]=t.id; setPlano(np); setDiaEditando(null) }}
                        style={{ padding:'10px 8px', borderRadius:8, border:`1.5px solid ${plano[i]===t.id ? t.cor : 'rgba(255,255,255,.06)'}`, background: plano[i]===t.id ? `${t.cor}15` : 'rgba(255,255,255,.03)', cursor:'pointer', textAlign:'center' }}>
                        <div style={{ fontSize:20, marginBottom:4 }}>{t.icon}</div>
                        <div style={{ fontSize:10, fontWeight:700, color: plano[i]===t.id ? t.cor : '#cbd5e1' }}>{t.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Benefícios semanais */}
        <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:12, padding:'14px' }}>
          <div style={{ fontSize:9, color:'#2DD4A7', fontWeight:700, letterSpacing:1.5, marginBottom:10 }}>
            {idioma==='en'?'WEEKLY BENEFITS':idioma==='es'?'BENEFICIOS SEMANALES':'BENEFÍCIOS SEMANAIS'}
          </div>
          {Object.entries(beneficios).length === 0 ? (
            <div style={{ fontSize:11, color:'#475569' }}>{idioma==='en'?'Only rest days':idioma==='es'?'Solo días de descanso':'Apenas dias de descanso'}</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {Object.entries(beneficios).sort((a,b)=>b[1]-a[1]).map(([attr, n]) => {
                const attrNames = { velocidade:{pt:'Velocidade',en:'Speed',es:'Velocidad'}, resistencia:{pt:'Resistência',en:'Stamina',es:'Resistencia'}, recuperacao:{pt:'Recuperação',en:'Recovery',es:'Recuperación'}, forca:{pt:'Força',en:'Strength',es:'Fuerza'}, orientacao:{pt:'Orientação',en:'Navigation',es:'Orientación'}, inteligencia:{pt:'Inteligência',en:'Intelligence',es:'Inteligencia'}, instinto:{pt:'Instinto',en:'Instinct',es:'Instinto'}, coragem:{pt:'Coragem',en:'Courage',es:'Coraje'} }
                return (
                  <div key={attr} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:80, fontSize:10, color:'#7A8699' }}>{attrNames[attr]?.[idioma] || attr}</div>
                    <div style={{ flex:1, height:4, background:'rgba(255,255,255,.06)', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${(n/5)*100}%`, background:'#2DD4A7', borderRadius:2 }}/>
                    </div>
                    <div style={{ fontSize:10, color:'#2DD4A7', fontWeight:700, width:20, textAlign:'right' }}>+{n}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pombos e impacto do treino */}
        <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:12, padding:'14px' }}>
          <div style={{ fontSize:9, color:'#4C8DFF', fontWeight:700, letterSpacing:1.5, marginBottom:10 }}>
            {idioma==='en'?'SQUAD IMPACT':idioma==='es'?'IMPACTO EN PLANTEL':'IMPACTO NO PLANTEL'}
          </div>
          {(carreira.pombos||[]).filter(p=>p.estado==='activo').slice(0,5).map(p => {
            const mediaAttr = Math.round(Object.values(p.atributos).filter((_,i)=>i<8).reduce((s,v)=>s+v,0)/8)
            const forma = Math.min(100, Math.round(mediaAttr * (0.8 + Math.random()*0.4)))
            const corForma = forma>=75?'#2DD4A7':forma>=50?'#D4AF37':'#f87171'
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                <div style={{ width:28, height:28, borderRadius:6, background: p.sexo==='F'?'rgba(192,132,252,.15)':'rgba(76,141,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:p.sexo==='F'?'#c084fc':'#4C8DFF', fontFamily:"'Fraunces',serif" }}>{p.anilha?.slice(-3)}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#fff' }}>{p.nome}</div>
                  <div style={{ height:3, background:'rgba(255,255,255,.06)', borderRadius:2, marginTop:3 }}>
                    <div style={{ height:'100%', width:`${forma}%`, background:corForma, borderRadius:2 }}/>
                  </div>
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:corForma }}>{forma}%</div>
              </div>
            )
          })}
        </div>

        {/* Guardar */}
        <button onClick={guardar}
          style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background: guardado ? 'linear-gradient(135deg,#2DD4A7,#059669)' : 'linear-gradient(135deg,#1E5FD9,#1456C0)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .3s' }}>
          {guardado ? '✅ ' + (idioma==='en'?'Saved!':idioma==='es'?'¡Guardado!':'Guardado!') : (idioma==='en'?'💾 Save Plan':idioma==='es'?'💾 Guardar Plan':'💾 Guardar Plano')}
        </button>
      </div>
    </div>
  )
}
