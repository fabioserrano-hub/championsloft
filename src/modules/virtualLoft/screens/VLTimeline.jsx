// src/modules/virtualLoft/screens/VLTimeline.jsx
import { useState } from 'react'

const T={bg:'#050A14',surface:'#0D1829',surface2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171',purple:'#A855F7'}
function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}
function GoldLine(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.7}}/>}

const TIPOS = {
  prova:      { icon:'🏆', cor:'#A855F7' },
  vitoria:    { icon:'🥇', cor:'#D4AF37' },
  ninhada:    { icon:'🥚', cor:'#06b6d4' },
  compra:     { icon:'🛒', cor:'#f97316' },
  venda:      { icon:'💰', cor:'#22c55e' },
  upgrade:    { icon:'🏠', cor:'#2DD4A7' },
  staff:      { icon:'👥', cor:'#4C8DFF' },
  evento:     { icon:'⚡', cor:'#f87171' },
  objectivo:  { icon:'🎯', cor:'#2DD4A7' },
  halloffame: { icon:'🏛️', cor:'#D4AF37' },
  epoca:      { icon:'📅', cor:'#7A8699' },
}

function gerarTimelineAutomatica(carreira) {
  const eventos = []

  // Épocas passadas
  for (let e = 1; e < (carreira.epoca||1); e++) {
    eventos.push({ id:`ep_${e}`, tipo:'epoca', titulo:`Fim da Época ${e}`, desc:`Época ${e} concluída`, epoca:e, semana:40, ts: e*40 })
  }

  // Provas disputadas
  ;(carreira.historico_provas||[]).forEach((r, i) => {
    const tipo = r.posicao === 1 ? 'vitoria' : 'prova'
    eventos.push({
      id: `prova_${i}`,
      tipo,
      titulo: r.posicao === 1 ? `🥇 Vitória em ${r.provaNome}!` : `Prova: ${r.provaNome}`,
      desc: `${r.pomboNome} · ${r.posicao}º/${r.total} · P${r.percentil}%`,
      epoca: carreira.epoca||1,
      semana: r.semana||1,
      ts: ((carreira.epoca||1)-1)*40 + (r.semana||1)
    })
  })

  // Ninhadas
  ;(carreira.ninhadas_virtuais||[]).forEach((n, i) => {
    eventos.push({
      id: `ninhada_${i}`,
      tipo: 'ninhada',
      titulo: `Ninhada: ${n.pai_nome} × ${n.mae_nome}`,
      desc: `${n.filhos?.length||2} ovos postos`,
      epoca: n.epoca||1,
      semana: n.semana||1,
      ts: ((n.epoca||1)-1)*40 + (n.semana||1)
    })
  })

  // Hall of Fame
  ;(carreira.hall_of_fame||[]).forEach((h, i) => {
    eventos.push({
      id: `hof_${i}`,
      tipo: 'halloffame',
      titulo: `Hall of Fame: ${h.nomePombo}`,
      desc: h.titulo,
      epoca: h.epoca||1,
      semana: 1,
      ts: ((h.epoca||1)-1)*40 + 1
    })
  })

  // Objectivos concluídos
  ;(carreira.objectivos_concluidos||[]).forEach((id, i) => {
    eventos.push({
      id: `obj_${i}`,
      tipo: 'objectivo',
      titulo: `Objectivo concluído`,
      desc: id,
      epoca: carreira.epoca||1,
      semana: carreira.semana||1,
      ts: ((carreira.epoca||1)-1)*40 + (carreira.semana||1)
    })
  })

  // Ordenar por semana absoluta (mais recente primeiro)
  return eventos.sort((a,b) => b.ts - a.ts)
}

export default function VLTimeline({ carreira, onVoltar, idioma = 'pt' }) {
  const [filtro, setFiltro] = useState('todos')
  const timeline = gerarTimelineAutomatica(carreira)

  const filtros = [
    { id:'todos',   label: idioma==='en'?'All':idioma==='es'?'Todos':'Todos' },
    { id:'vitoria', label: idioma==='en'?'Wins':idioma==='es'?'Victorias':'Vitórias' },
    { id:'ninhada', label: idioma==='en'?'Breeding':idioma==='es'?'Cría':'Ninhadas' },
    { id:'epoca',   label: idioma==='en'?'Seasons':idioma==='es'?'Temporadas':'Épocas' },
  ]

  const lista = filtro === 'todos' ? timeline : timeline.filter(e => e.tipo === filtro || (filtro==='vitoria' && e.tipo==='vitoria'))

  // Estatísticas
  const vitorias = timeline.filter(e => e.tipo==='vitoria').length
  const ninhadas = timeline.filter(e => e.tipo==='ninhada').length
  const epocas = carreira.epoca||1

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.text, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ background:'linear-gradient(180deg,#050D1A,#030812)', borderBottom:'1px solid rgba(255,255,255,.05)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={onVoltar} style={{ background:T.surface, border:'none', borderRadius:8, width:32, height:32, color:T.muted, cursor:'pointer', fontSize:16 }}>←</button>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>📜 {idioma==='en'?'Career Timeline':idioma==='es'?'Historia':'Timeline'}</div>
            <div style={{ fontSize:10, color:T.muted }}>{timeline.length} {idioma==='en'?'events':idioma==='es'?'eventos':'eventos'} · {epocas} {idioma==='en'?'seasons':idioma==='es'?'temporadas':'épocas'}</div>
          </div>
        </div>

        {/* Stats rápidos */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
          {[
            { label:idioma==='en'?'Wins':idioma==='es'?'Victorias':'Vitórias', n:vitorias, cor:'#D4AF37' },
            { label:idioma==='en'?'Litters':idioma==='es'?'Nidadas':'Ninhadas', n:ninhadas, cor:'#06b6d4' },
            { label:idioma==='en'?'Seasons':idioma==='es'?'Temporadas':'Épocas', n:epocas, cor:'#7A8699' },
          ].map((s,i)=>(
            <div key={i} style={{ padding:'8px', background:T.surface, border:`1px solid ${s.cor}20`, borderRadius:8, textAlign:'center' }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:s.cor }}>{s.n}</div>
              <div style={{ fontSize:9, color:T.muted }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none' }}>
          {filtros.map(f=>(
            <button key={f.id} onClick={()=>setFiltro(f.id)}
              style={{ flex:'none', padding:'7px 12px', borderRadius:8, border:filtro===f.id?'none':'1px solid rgba(255,255,255,.08)', background:filtro===f.id?'linear-gradient(135deg,#1E5FD9,#1456C0)':'rgba(255,255,255,.04)', color:filtro===f.id?'#fff':'#cbd5e1', fontSize:11, fontWeight:filtro===f.id?700:500, cursor:'pointer', fontFamily:"'Inter',system-ui,sans-serif", whiteSpace:'nowrap' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'12px 16px' }}>
        {lista.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📜</div>
            <div style={{ fontSize:14, color:T.muted, fontWeight:600 }}>
              {idioma==='en'?'No events yet. Start racing!':idioma==='es'?'Sin eventos aún. ¡Empieza a competir!':'Sem eventos ainda. Começa a competir!'}
            </div>
          </div>
        ) : (
          <div style={{ position:'relative' }}>
            {/* Linha vertical */}
            <div style={{ position:'absolute', left:19, top:0, bottom:0, width:2, background:T.surface, borderRadius:1 }}/>

            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {lista.map((ev, i) => {
                const tipo = TIPOS[ev.tipo] || TIPOS.evento
                return (
                  <div key={ev.id} style={{ display:'flex', gap:12, paddingBottom:16, position:'relative' }}>
                    {/* Dot */}
                    <div style={{ width:38, height:38, borderRadius:'50%', background:`${tipo.cor}15`, border:`2px solid ${tipo.cor}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0, zIndex:1, background:T.bg }}>
                      {tipo.icon}
                    </div>
                    {/* Conteúdo */}
                    <div style={{ flex:1, paddingTop:4 }}>
                      <div style={{ fontSize:13, fontWeight:700, color: ev.tipo==='vitoria'?'#D4AF37':'#fff', marginBottom:2 }}>{ev.titulo}</div>
                      <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>{ev.desc}</div>
                      <div style={{ fontSize:9, color:'#2a3a5a' }}>
                        {idioma==='en'?'Season':idioma==='es'?'Temporada':'Época'} {ev.epoca} · {idioma==='en'?'Week':idioma==='es'?'Semana':'Sem.'} {ev.semana}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
