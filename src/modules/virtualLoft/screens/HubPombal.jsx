// src/modules/virtualLoft/screens/HubPombal.jsx
import { useState, useEffect } from 'react'
import { useT } from '../data/traducoes'
import VLPombos from './VLPombos'
import VLTreinos from './VLTreinos'
import VLPombal from './VLPombal'
import VLStaff from './VLStaff'
import VLProvas from './VLProvas'
import VLFinancas from './VLFinancas'
import VLMercado from './VLMercado'
import VLRankings from './VLRankings'
import VLNinhadas, { actualizarFasesCria } from './VLNinhadas'
import VLForma from './VLForma'

const MODULOS = [
  { id:'pombos',   icon:'🐦', cor:'#4C8DFF',  corBg:'rgba(76,141,255,.1)'  },
  { id:'pombal',   icon:'🏠', cor:'#2DD4A7',  corBg:'rgba(45,212,167,.1)'  },
  { id:'treinos',  icon:'🎯', cor:'#D4AF37',  corBg:'rgba(212,175,55,.1)'  },
  { id:'provas',   icon:'🏆', cor:'#A855F7',  corBg:'rgba(168,85,247,.1)'  },
  { id:'mercado',  icon:'🛒', cor:'#f97316',  corBg:'rgba(249,115,22,.1)'  },
  { id:'staff',    icon:'👥', cor:'#06b6d4',  corBg:'rgba(6,182,212,.1)'   },
  { id:'financas', icon:'💰', cor:'#22c55e',  corBg:'rgba(34,197,94,.1)'   },
  { id:'rankings', icon:'📊', cor:'#f87171',  corBg:'rgba(248,113,113,.1)' },
  { id:'ninhadas', icon:'🥚', cor:'#A855F7',  corBg:'rgba(168,85,247,.08)' },
  { id:'forma',    icon:'📈', cor:'#06b6d4',  corBg:'rgba(6,182,212,.08)'  },
]

const LABELS = {
  pombos:   { pt:'Pombos',    en:'Pigeons',    es:'Palomas'      },
  pombal:   { pt:'Pombal',    en:'Loft',       es:'Palomar'      },
  treinos:  { pt:'Treinos',   en:'Training',   es:'Entrenam.'    },
  provas:   { pt:'Provas',    en:'Races',      es:'Carreras'     },
  mercado:  { pt:'Mercado',   en:'Market',     es:'Mercado'      },
  staff:    { pt:'Staff',     en:'Staff',      es:'Staff'        },
  financas: { pt:'Finanças',  en:'Finances',   es:'Finanzas'     },
  rankings: { pt:'Rankings',  en:'Rankings',   es:'Rankings'     },
  ninhadas: { pt:'Ninhadas',  en:'Breeding',   es:'Reproducción' },
  forma:    { pt:'Forma',     en:'Form',       es:'Forma'        },
}

const EM_BREVE = []

function BarraReputacao({ valor, nivel }) {
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

function calcAvancarSemana(c) {
  const nova = { ...c, pombos: [...(c.pombos||[])] }
  const custoStaff = Math.round((nova.staff||[]).reduce((s,m) => s+(m.salario||0), 0) / 4)
  const custoAlim = (nova.pombos||[]).length * 5
  nova.orcamento = Math.max(0, (nova.orcamento||0) - custoStaff - custoAlim)
  nova.reputacao = Math.min(100, (nova.reputacao||5) + 0.5)
  nova.semana = (nova.semana||1) + 1
  if (nova.semana > 40) { nova.semana = 1; nova.epoca = (nova.epoca||1) + 1 }
  if (nova.reputacao>=90) nova.nivel_reputacao='olimpico'
  else if (nova.reputacao>=70) nova.nivel_reputacao='internacional'
  else if (nova.reputacao>=50) nova.nivel_reputacao='nacional'
  else if (nova.reputacao>=35) nova.nivel_reputacao='regional'
  else if (nova.reputacao>=20) nova.nivel_reputacao='distrital'
  else nova.nivel_reputacao='local'
  return nova
}

export default function HubPombal(props) {
  const { onApagarCarreira, idioma = 'pt' } = props

  // SEMPRE ler do localStorage - fonte de verdade única
  const [c, setC] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vl_carreira')) || props.carreira } catch { return props.carreira }
  })
  const [moduloAtivo, setModuloAtivo] = useState(null)
  const [eventoSemana, setEventoSemana] = useState(null)

  const EVENTOS = [
    { prob:.06, icon:'🤒', titulo:'Doença no pombal', desc:'Um pombo ficou doente. -200€', tipo:'alerta', fn: x => ({ ...x, orcamento: Math.max(0,(x.orcamento||0)-200) }) },
    { prob:.04, icon:'🦅', titulo:'Ataque de falcão!', desc:'Stress no pombal esta semana.', tipo:'alerta', fn: x => x },
    { prob:.08, icon:'⛈️', titulo:'Mau tempo', desc:'Treinos afectados pelo clima.', tipo:'aviso', fn: x => x },
    { prob:.05, icon:'🤝', titulo:'Patrocínio! +500€', desc:'Uma empresa quer patrocinar o pombal!', tipo:'sucesso', fn: x => ({ ...x, orcamento:(x.orcamento||0)+500 }) },
    { prob:.10, icon:'💪', titulo:'Semana excelente!', desc:'Os pombos responderam muito bem.', tipo:'sucesso', fn: x => x },
    { prob:.03, icon:'🏆', titulo:'Recorde!', desc:'Um pombo bateu o seu recorde. +Rep', tipo:'sucesso', fn: x => ({ ...x, reputacao: Math.min(100,(x.reputacao||5)+2) }) },
  ]

  const salvar = (dados) => {
    try { localStorage.setItem('vl_carreira', JSON.stringify(dados)) } catch {}
    setC({ ...dados })
    if (typeof props.onGuardar === 'function') props.onGuardar(dados)
  }

  const handleAvancarSemana = () => {
    if (!c) return
    let nova = calcAvancarSemana(c)
    nova = actualizarFasesCria(nova)
    const evento = EVENTOS.find(e => Math.random() < e.prob)
    if (evento) { nova = evento.fn(nova); setEventoSemana(evento); setTimeout(()=>setEventoSemana(null),5000) }
    salvar(nova)
  }

  const epochaLabel = idioma === 'en' ? 'Season' : idioma === 'es' ? 'Temporada' : 'Época'
  const semanaLabel = idioma === 'en' ? 'Week' : idioma === 'es' ? 'Semana' : 'Semana'
  const proximaProva = { nome: 'Prova Local - Santarém', dist: 80, tipo: 'Velocidade', semana: 3 }
  const semanasAte = Math.max(0, proximaProva.semana - (c?.semana||1))
  const evento = (c?.semana||1) === 1 ? { tipo: 'info', icon: '📋', titulo: 'Bem-vindo à tua carreira!', desc: `Tens ${c?.pombos?.length||0} pombos e ${(c?.orcamento||0).toLocaleString()}€ de orçamento.` } : null
  const mediaRating = c?.pombos?.length ? Math.round(c.pombos.reduce((s,p) => s + (p.rating||0), 0) / c.pombos.length * 10) / 10 : 0
  const melhores = [...(c?.pombos||[])].filter(p=>p.estado==='activo').sort((a,b) => (b.rating||0) - (a.rating||0)).slice(0,3)

  // Render módulos
  if (moduloAtivo) {
    const modProps = { carreira: c, onVoltar: () => setModuloAtivo(null), onGuardar: salvar, idioma }
    if (moduloAtivo === 'pombos')   return <VLPombos   {...modProps} />
    if (moduloAtivo === 'treinos')  return <VLTreinos  {...modProps} />
    if (moduloAtivo === 'pombal')   return <VLPombal   {...modProps} />
    if (moduloAtivo === 'staff')    return <VLStaff    {...modProps} />
    if (moduloAtivo === 'provas')   return <VLProvas   {...modProps} />
    if (moduloAtivo === 'financas') return <VLFinancas {...modProps} />
    if (moduloAtivo === 'mercado')  return <VLMercado  {...modProps} />
    if (moduloAtivo === 'rankings') return <VLRankings {...modProps} />
    if (moduloAtivo === 'ninhadas') return <VLNinhadas {...modProps} />
    if (moduloAtivo === 'forma')    return <VLForma    {...modProps} />
    return (
      <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', display:'flex', flexDirection:'column', fontFamily:'inherit' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,.05)', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => setModuloAtivo(null)} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>←</button>
          <div style={{ fontSize:16, fontWeight:800 }}>{moduloAtivo}</div>
        </div>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:48 }}>🚧</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#D4AF37' }}>Em breve</div>
        </div>
      </div>
    )
  }

  if (!c) return null

  return (
    <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', fontFamily:'inherit' }}>

      <div style={{ background:'linear-gradient(180deg,#050D1A,#030812)', borderBottom:'1px solid rgba(255,255,255,.05)', padding:'14px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
              <span style={{ fontSize:22 }}>{c.logotipo}</span>
              <span style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, letterSpacing:-0.5 }}>{c.nomePombal}</span>
            </div>
            <div style={{ fontSize:11, color:'#7A8699' }}>{c.nomeGestor} · {epochaLabel} {c.epoca} · {semanaLabel} {c.semana}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:'#2DD4A7' }}>{(c.orcamento||0).toLocaleString()}€</div>
            <div style={{ fontSize:10, color:'#475569' }}>{(c.pombos||[]).filter(p=>p.estado==='activo').length} pombos</div>
          </div>
        </div>
        <div style={{ marginTop:10 }}><BarraReputacao valor={c.reputacao||5} nivel={c.nivel_reputacao||'local'} /></div>
      </div>

      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {eventoSemana && <EventoBanner evento={eventoSemana} />}
        {!eventoSemana && evento && <EventoBanner evento={evento} />}

        <div style={{ background:'linear-gradient(135deg,#0D1428,#111827)', border:'1px solid rgba(168,85,247,.2)', borderRadius:14, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,#A855F7,#4C8DFF)' }}/>
          <div style={{ fontSize:9, color:'#A855F7', fontWeight:700, letterSpacing:1.5, marginBottom:6 }}>PRÓXIMA PROVA</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#fff', marginBottom:2 }}>{proximaProva.nome}</div>
              <div style={{ fontSize:11, color:'#7A8699' }}>{proximaProva.tipo} · {proximaProva.dist}km</div>
            </div>
            <div style={{ textAlign:'center', background:'rgba(168,85,247,.15)', border:'1px solid rgba(168,85,247,.3)', borderRadius:10, padding:'8px 12px', minWidth:52 }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:'#A855F7', lineHeight:1 }}>{semanasAte}</div>
              <div style={{ fontSize:8, color:'#A855F7', fontWeight:700, letterSpacing:1 }}>SEM.</div>
            </div>
          </div>
        </div>

        {melhores.length > 0 && (
          <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:14, padding:'14px 16px' }}>
            <div style={{ fontSize:9, color:'#D4AF37', fontWeight:700, letterSpacing:1.5, marginBottom:10 }}>⭐ MELHORES POMBOS</div>
            {melhores.map((p, i) => (
              <div key={p.id} onClick={() => setModuloAtivo('pombos')}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i < melhores.length-1 ? '1px solid rgba(255,255,255,.04)' : 'none', cursor:'pointer' }}>
                <div style={{ width:24, height:24, borderRadius:6, background:['rgba(212,175,55,.3)','rgba(148,163,184,.3)','rgba(180,83,9,.3)'][i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:['#D4AF37','#94a3b8','#b45309'][i], flexShrink:0 }}>{i+1}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nome}</div>
                  <div style={{ fontSize:10, color:'#475569' }}>{p.especialidade}</div>
                </div>
                <div style={{ display:'flex', gap:2 }}>
                  {Array.from({length:5}).map((_,j) => <div key={j} style={{ width:8, height:8, borderRadius:'50%', background: j < p.rating ? '#D4AF37' : 'rgba(255,255,255,.1)' }}/>)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
          {MODULOS.map(m => {
            const emBreve = EM_BREVE.includes(m.id)
            const label = LABELS[m.id]?.[idioma] || m.id
            const pombosActivos = (c.pombos||[]).filter(p=>p.estado==='activo').length
            const sub = m.id==='pombos'?`${pombosActivos} pombos`
              :m.id==='financas'?`${(c.orcamento||0).toLocaleString()}€`
              :m.id==='staff'?`${(c.staff||[]).length} contratados`
              :m.id==='pombal'?'Nível 1'
              :m.id==='treinos'?'Plano semanal'
              :m.id==='provas'?`Época ${c.epoca||1}`
              :m.id==='ninhadas'?`${(c.pombos||[]).filter(p=>p.fase&&p.estado!=='activo').length} activas`
              :m.id==='forma'?'Condição':m.id==='rankings'?'Ver ranking':''
            return (
              <div key={m.id} onClick={() => !emBreve && setModuloAtivo(m.id)}
                style={{ background:emBreve?'rgba(255,255,255,.02)':m.corBg, border:`1px solid ${emBreve?'rgba(255,255,255,.05)':m.cor+'30'}`, borderRadius:14, padding:'16px 14px', cursor:emBreve?'default':'pointer', transition:'all .15s', opacity:emBreve?.5:1, position:'relative', overflow:'hidden' }}>
                {!emBreve && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:m.cor, opacity:.6 }}/>}
                <div style={{ fontSize:26, marginBottom:8 }}>{m.icon}</div>
                <div style={{ fontSize:14, fontWeight:800, color:emBreve?'#475569':m.cor, marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:11, color:'#475569' }}>{sub}</div>
              </div>
            )
          })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { label:'Rating', valor:`${mediaRating}⭐`, cor:'#D4AF37' },
            { label:'Orçamento', valor:`${(c.orcamento||0).toLocaleString()}€`, cor:'#2DD4A7' },
            { label:'Reputação', valor:`${Math.round(c.reputacao||5)}%`, cor:'#A855F7' },
          ].map((s,i) => (
            <div key={i} style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:s.cor }}>{s.valor}</div>
              <div style={{ fontSize:9, color:'#475569', marginTop:2, fontWeight:600 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <button onClick={handleAvancarSemana}
          style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#D4AF37,#B8960C)', color:'#050D1A', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit', letterSpacing:.3 }}>
          ⏭️ Avançar Semana →
        </button>

        <button onClick={onApagarCarreira}
          style={{ width:'100%', padding:'10px', background:'rgba(248,113,113,.06)', border:'1px solid rgba(248,113,113,.15)', borderRadius:10, color:'rgba(248,113,113,.6)', fontSize:11, cursor:'pointer', fontFamily:'inherit', marginTop:4 }}>
          🗑️ Apagar carreira e recomeçar
        </button>
      </div>
    </div>
  )
}
