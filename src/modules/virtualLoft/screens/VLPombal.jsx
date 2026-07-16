// src/modules/virtualLoft/screens/HubPombal.jsx
import { useState } from 'react'
import { useT } from '../data/traducoes'

const MODULOS = [
  { id:'pombos',   icon:'🐦', cor:'#4C8DFF',  corBg:'rgba(76,141,255,.1)'  },
  { id:'pombal',   icon:'🏠', cor:'#2DD4A7',  corBg:'rgba(45,212,167,.1)'  },
  { id:'treinos',  icon:'🎯', cor:'#D4AF37',  corBg:'rgba(212,175,55,.1)'  },
  { id:'provas',   icon:'🏆', cor:'#A855F7',  corBg:'rgba(168,85,247,.1)'  },
  { id:'mercado',  icon:'🛒', cor:'#f97316',  corBg:'rgba(249,115,22,.1)'  },
  { id:'staff',    icon:'👥', cor:'#06b6d4',  corBg:'rgba(6,182,212,.1)'   },
  { id:'financas', icon:'💰', cor:'#22c55e',  corBg:'rgba(34,197,94,.1)'   },
  { id:'rankings', icon:'📊', cor:'#f87171',  corBg:'rgba(248,113,113,.1)' },
]

const LABELS = {
  pombos:   { pt:'Pombos',    en:'Pigeons',  es:'Palomas'   },
  pombal:   { pt:'Pombal',    en:'Loft',     es:'Palomar'   },
  treinos:  { pt:'Treinos',   en:'Training', es:'Entrenam.' },
  provas:   { pt:'Provas',    en:'Races',    es:'Carreras'  },
  mercado:  { pt:'Mercado',   en:'Market',   es:'Mercado'   },
  staff:    { pt:'Staff',     en:'Staff',    es:'Staff'     },
  financas: { pt:'Finanças',  en:'Finances', es:'Finanzas'  },
  rankings: { pt:'Rankings',  en:'Rankings', es:'Rankings'  },
}

const EM_BREVE = ['mercado','rankings']

function BarraReputacao({ valor, nivel }) {
  const niveis = { pt:['Local','Distrital','Regional','Nacional','Internacional','Olímpico'], en:['Local','District','Regional','National','International','Olympic'], es:['Local','Distrital','Regional','Nacional','Internacional','Olímpico'] }
  const cores = ['#7A8699','#4C8DFF','#2DD4A7','#D4AF37','#A855F7','#f87171']
  const idx = ['local','distrital','regional','nacional','internacional','olimpico'].indexOf(nivel)
  const cor = cores[Math.max(0,idx)]
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:4, background:'rgba(255,255,255,.06)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${valor}%`, background:`linear-gradient(90deg,${cor},${cor}aa)`, borderRadius:2, transition:'width 1s' }}/>
      </div>
      <span style={{ fontSize:10, color:cor, fontWeight:700, whiteSpace:'nowrap', minWidth:60 }}>{nivel?.toUpperCase()}</span>
    </div>
  )
}

function EventoBanner({ evento }) {
  if (!evento) return null
  const cores = { alerta:'#f87171', info:'#4C8DFF', sucesso:'#2DD4A7', aviso:'#D4AF37' }
  const cor = cores[evento.tipo] || '#4C8DFF'
  return (
    <div style={{ padding:'10px 14px', background:`${cor}10`, border:`1px solid ${cor}30`, borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:18 }}>{evento.icon}</span>
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:cor }}>{evento.titulo}</div>
        <div style={{ fontSize:11, color:'#7A8699' }}>{evento.desc}</div>
      </div>
    </div>
  )
}

export default function HubPombal({ carreira, onNavegar, onApagarCarreira, onAvancarSemana, idioma = 'pt' }) {
  const t = useT(idioma)
  const [menuAberto, setMenuAberto] = useState(false)

  const epochaLabel = idioma === 'en' ? 'Season' : idioma === 'es' ? 'Temporada' : 'Época'
  const semanaLabel = idioma === 'en' ? 'Week' : idioma === 'es' ? 'Semana' : 'Semana'

  // Próxima prova (simulado por agora)
  const proximaProva = { nome: 'Prova Local - Santarém', dist: 80, tipo: 'Velocidade', semana: 3 }
  const semanasAte = Math.max(0, proximaProva.semana - carreira.semana)

  // Eventos aleatórios (placeholder)
  const evento = carreira.semana === 1 ? {
    tipo: 'info', icon: '📋',
    titulo: idioma === 'en' ? 'Welcome to your career!' : idioma === 'es' ? '¡Bienvenido a tu carrera!' : 'Bem-vindo à tua carreira!',
    desc: idioma === 'en' ? `You have ${carreira.pombos.length} pigeons and €${carreira.orcamento.toLocaleString()} budget.`
      : idioma === 'es' ? `Tienes ${carreira.pombos.length} palomas y ${carreira.orcamento.toLocaleString()}€ de presupuesto.`
      : `Tens ${carreira.pombos.length} pombos e ${carreira.orcamento.toLocaleString()}€ de orçamento.`
  } : null

  // Stats rápidos do plantel
  const mediaRating = carreira.pombos.length
    ? Math.round(carreira.pombos.reduce((s,p) => s + p.rating, 0) / carreira.pombos.length * 10) / 10
    : 0
  const melhores = [...(carreira.pombos || [])].sort((a,b) => b.rating - a.rating).slice(0,3)

  return (
    <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', fontFamily:'inherit' }}>

      {/* ── HEADER ── */}
      <div style={{ background:'linear-gradient(180deg,#050D1A,#030812)', borderBottom:'1px solid rgba(255,255,255,.05)', padding:'14px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
              <span style={{ fontSize:22 }}>{carreira.logotipo}</span>
              <span style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, letterSpacing:-0.5 }}>{carreira.nomePombal}</span>
            </div>
            <div style={{ fontSize:11, color:'#7A8699' }}>
              {carreira.nomeGestor} · {epochaLabel} {carreira.epoca} · {semanaLabel} {carreira.semana}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:'#2DD4A7' }}>
              {carreira.orcamento.toLocaleString()}€
            </div>
            <div style={{ fontSize:10, color:'#475569' }}>
              {carreira.pombos.length} {idioma==='en'?'pigeons':idioma==='es'?'palomas':'pombos'}
            </div>
          </div>
        </div>

        {/* Barra de reputação */}
        <div style={{ marginTop:10 }}>
          <BarraReputacao valor={carreira.reputacao} nivel={carreira.nivel_reputacao} />
        </div>
      </div>

      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* ── EVENTOS DA SEMANA ── */}
        {(carreira.eventos_semana || []).map((ev, i) => (
          <EventoBanner key={i} evento={{ tipo: ev.tipo === 'positivo' ? 'sucesso' : 'alerta', icon: ev.icon, titulo: ev.titulo, desc: ev.desc }} />
        ))}

        {/* ── EVENTO/ALERTA ── */}
        {evento && !carreira.eventos_semana?.length && <EventoBanner evento={evento} />}

        {/* ── PRÓXIMA PROVA ── */}
        <div style={{ background:'linear-gradient(135deg,#0D1428,#111827)', border:'1px solid rgba(168,85,247,.2)', borderRadius:14, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,#A855F7,#4C8DFF)' }}/>
          <div style={{ fontSize:9, color:'#A855F7', fontWeight:700, letterSpacing:1.5, marginBottom:6 }}>
            {idioma==='en'?'NEXT RACE':idioma==='es'?'PRÓXIMA CARRERA':'PRÓXIMA PROVA'}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#fff', marginBottom:2 }}>{proximaProva.nome}</div>
              <div style={{ fontSize:11, color:'#7A8699' }}>{proximaProva.tipo} · {proximaProva.dist}km</div>
            </div>
            <div style={{ textAlign:'center', background:'rgba(168,85,247,.15)', border:'1px solid rgba(168,85,247,.3)', borderRadius:10, padding:'8px 12px', minWidth:52 }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:'#A855F7', lineHeight:1 }}>{semanasAte}</div>
              <div style={{ fontSize:8, color:'#A855F7', fontWeight:700, letterSpacing:1 }}>{idioma==='en'?'WEEKS':idioma==='es'?'SEMANAS':'SEMANAS'}</div>
            </div>
          </div>
        </div>

        {/* ── TOP 3 POMBOS ── */}
        {melhores.length > 0 && (
          <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:14, padding:'14px 16px' }}>
            <div style={{ fontSize:9, color:'#D4AF37', fontWeight:700, letterSpacing:1.5, marginBottom:10 }}>
              ⭐ {idioma==='en'?'SQUAD HIGHLIGHTS':idioma==='es'?'MEJORES PALOMAS':'MELHORES POMBOS'}
            </div>
            {melhores.map((p, i) => (
              <div key={p.id} onClick={() => onNavegar?.('pombos')}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i < melhores.length-1 ? '1px solid rgba(255,255,255,.04)' : 'none', cursor:'pointer' }}>
                <div style={{ width:24, height:24, borderRadius:6, background:['#D4AF37','rgba(148,163,184,.3)','rgba(180,83,9,.3)'][i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:['#050D1A','#94a3b8','#b45309'][i], flexShrink:0 }}>
                  {i+1}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nome}</div>
                  <div style={{ fontSize:10, color:'#475569' }}>{p.especialidade}</div>
                </div>
                <div style={{ display:'flex', gap:2 }}>
                  {Array.from({length:5}).map((_,j) => (
                    <div key={j} style={{ width:8, height:8, borderRadius:'50%', background: j < p.rating ? '#D4AF37' : 'rgba(255,255,255,.1)' }}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── GRID DE MÓDULOS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
          {MODULOS.map(m => {
            const emBreve = EM_BREVE.includes(m.id)
            const label = LABELS[m.id]?.[idioma] || LABELS[m.id]?.pt || m.id
            const sub = m.id === 'pombos' ? `${carreira.pombos.length} ${idioma==='en'?'pigeons':idioma==='es'?'palomas':'pombos'}`
              : m.id === 'financas' ? `${carreira.orcamento.toLocaleString()}€`
              : m.id === 'staff' ? `0 ${idioma==='en'?'hired':idioma==='es'?'contratados':'contratados'}`
              : m.id === 'pombal' ? `${idioma==='en'?'Level':idioma==='es'?'Nivel':'Nível'} 1`
              : m.id === 'treinos' ? (idioma==='en'?'No plan':idioma==='es'?'Sin plan':'Sem plano')
              : m.id === 'provas' ? `${idioma==='en'?'Season':idioma==='es'?'Temporada':'Época'} ${carreira.epoca}`
              : idioma==='en'?'Coming soon':idioma==='es'?'Próximamente':'Em breve'

            return (
              <div key={m.id}
                onClick={() => !emBreve && onNavegar?.(m.id)}
                style={{ background: emBreve ? 'rgba(255,255,255,.02)' : m.corBg, border:`1px solid ${emBreve ? 'rgba(255,255,255,.05)' : m.cor+'30'}`, borderRadius:14, padding:'16px 14px', cursor: emBreve ? 'default' : 'pointer', transition:'all .15s', opacity: emBreve ? .5 : 1, position:'relative', overflow:'hidden' }}>
                {!emBreve && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:m.cor, opacity:.6 }}/>}
                <div style={{ fontSize:26, marginBottom:8 }}>{m.icon}</div>
                <div style={{ fontSize:14, fontWeight:800, color: emBreve ? '#475569' : m.cor, marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:11, color:'#475569' }}>{sub}</div>
                {emBreve && <div style={{ position:'absolute', top:8, right:8, fontSize:8, background:'rgba(255,255,255,.06)', borderRadius:4, padding:'2px 5px', color:'#475569', fontWeight:700, letterSpacing:.5 }}>SOON</div>}
              </div>
            )
          })}
        </div>

        {/* ── STATS RÁPIDOS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { label: idioma==='en'?'Avg Rating':idioma==='es'?'Rating Medio':'Rating Médio', valor: `${mediaRating}⭐`, cor:'#D4AF37' },
            { label: idioma==='en'?'Budget':idioma==='es'?'Presupuesto':'Orçamento', valor: `${carreira.orcamento.toLocaleString()}€`, cor:'#2DD4A7' },
            { label: idioma==='en'?'Reputation':idioma==='es'?'Reputación':'Reputação', valor: `${carreira.reputacao}%`, cor:'#A855F7' },
          ].map((s,i) => (
            <div key={i} style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:s.cor }}>{s.valor}</div>
              <div style={{ fontSize:9, color:'#475569', marginTop:2, fontWeight:600, letterSpacing:.3 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* ── AVANÇAR SEMANA ── */}
        <button onClick={() => onAvancarSemana?.()}
          style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#D4AF37,#B8960C)', color:'#050D1A', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit', letterSpacing:.3 }}>
          ⏭️ {idioma==='en'?'Advance Week':idioma==='es'?'Avanzar Semana':'Avançar Semana'} →
        </button>

        {/* ── APAGAR ── */}
        <button onClick={onApagarCarreira}
          style={{ width:'100%', padding:'10px', background:'rgba(248,113,113,.06)', border:'1px solid rgba(248,113,113,.15)', borderRadius:10, color:'rgba(248,113,113,.6)', fontSize:11, cursor:'pointer', fontFamily:'inherit', marginTop:4 }}>
          🗑️ {idioma==='en'?'Delete career & restart':idioma==='es'?'Borrar carrera y reiniciar':'Apagar carreira e recomeçar'}
        </button>
      </div>
    </div>
  )
}
