// src/modules/virtualLoft/screens/HubPombal.jsx — Design Premium
import { useState } from 'react'
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
import VLHallOfFame from './VLHallOfFame'
import VLObjectivos from './VLObjectivos'
import VLTimeline from './VLTimeline'
import VLPatrocinios from './VLPatrocinios'

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:       '#050A14',
  surface:  '#0D1829',
  surface2: '#1A2A45',
  gold:     '#C9A84C',
  blue:     '#4FC3F7',
  text:     '#E8EDF5',
  muted:    '#6B7A99',
  success:  '#2DD4A7',
  danger:   '#F87171',
}

const MODULOS = [
  { id:'pombos',     icon:'🐦', label:{pt:'Pombos',    en:'Pigeons',    es:'Palomas'},     cor:'#4FC3F7', grad:'linear-gradient(135deg,#0D1F35,#0A1525)' },
  { id:'pombal',     icon:'🏠', label:{pt:'Pombal',    en:'Loft',       es:'Palomar'},     cor:'#2DD4A7', grad:'linear-gradient(135deg,#0D2820,#091A14)' },
  { id:'treinos',    icon:'🎯', label:{pt:'Treinos',   en:'Training',   es:'Entrenam.'},   cor:'#C9A84C', grad:'linear-gradient(135deg,#2A1E08,#1A1305)' },
  { id:'provas',     icon:'🏆', label:{pt:'Provas',    en:'Races',      es:'Carreras'},    cor:'#A855F7', grad:'linear-gradient(135deg,#1E0D35,#130825)' },
  { id:'ninhadas',   icon:'🥚', label:{pt:'Ninhadas',  en:'Breeding',   es:'Reproducción'},cor:'#818CF8', grad:'linear-gradient(135deg,#0F0D2A,#0A0B1E)' },
  { id:'mercado',    icon:'🛒', label:{pt:'Mercado',   en:'Market',     es:'Mercado'},     cor:'#FB923C', grad:'linear-gradient(135deg,#2A1508,#1A0D05)' },
  { id:'staff',      icon:'👥', label:{pt:'Staff',     en:'Staff',      es:'Staff'},       cor:'#22D3EE', grad:'linear-gradient(135deg,#062028,#04151C)' },
  { id:'financas',   icon:'💰', label:{pt:'Finanças',  en:'Finances',   es:'Finanzas'},    cor:'#4ADE80', grad:'linear-gradient(135deg,#082015,#04120D)' },
  { id:'patrocinios',icon:'🤝', label:{pt:'Patrocínios',en:'Sponsors', es:'Patrocinios'}, cor:'#34D399', grad:'linear-gradient(135deg,#082018,#041210)' },
  { id:'rankings',   icon:'📊', label:{pt:'Rankings',  en:'Rankings',   es:'Rankings'},    cor:'#F87171', grad:'linear-gradient(135deg,#2A0A0A,#1A0505)' },
  { id:'forma',      icon:'📈', label:{pt:'Forma',     en:'Form',       es:'Forma'},       cor:'#38BDF8', grad:'linear-gradient(135deg,#082028,#041520)' },
  { id:'objectivos', icon:'🎯', label:{pt:'Objectivos',en:'Goals',      es:'Objetivos'},   cor:'#2DD4A7', grad:'linear-gradient(135deg,#082820,#041A14)' },
  { id:'halloffame', icon:'🏛️', label:{pt:'Hall of Fame',en:'Hall of Fame',es:'Hall of Fame'},cor:'#C9A84C',grad:'linear-gradient(135deg,#2A1E08,#1A1305)' },
  { id:'timeline',   icon:'📜', label:{pt:'Timeline',  en:'Timeline',   es:'Historia'},    cor:'#94A3B8', grad:'linear-gradient(135deg,#0D1420,#080E18)' },
]

// ── Utils ─────────────────────────────────────────────────────────────────────
function lerLS() { try { return JSON.parse(localStorage.getItem('vl_carreira')) } catch { return null } }
function gravarLS(d) { try { localStorage.setItem('vl_carreira', JSON.stringify(d)) } catch {} }

function calcAvancar(c) {
  const nova = { ...c, pombos:[...(c.pombos||[])] }
  const custoStaff = Math.round((nova.staff||[]).reduce((s,m)=>s+(m.salario||0),0)/4)
  const custoAlim = (nova.pombos||[]).length*5
  const recPat = (nova.patrocinios||[]).reduce((s,p)=>s+(p.valorSemanal||0),0)
  nova.orcamento = Math.max(0,(nova.orcamento||0)-custoStaff-custoAlim+recPat)
  nova.patrocinios = (nova.patrocinios||[]).map(p=>({...p,semanasRestantes:Math.max(0,(p.semanasRestantes||8)-1)})).filter(p=>(p.semanasRestantes||0)>0)
  nova.reputacao = Math.min(100,(nova.reputacao||5)+0.5)
  nova.semana = (nova.semana||1)+1
  if (nova.semana>40){nova.semana=1;nova.epoca=(nova.epoca||1)+1}
  const niv=['local','distrital','regional','nacional','internacional','olimpico']
  const r=nova.reputacao
  nova.nivel_reputacao=r>=90?'olimpico':r>=70?'internacional':r>=50?'nacional':r>=35?'regional':r>=20?'distrital':'local'
  return nova
}

// ── Componentes ───────────────────────────────────────────────────────────────
function GoldLine() {
  return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.8}}/>
}

function StatPill({ label, value, cor = T.gold }) {
  return (
    <div style={{textAlign:'center',padding:'10px 8px',background:'rgba(255,255,255,.03)',border:`1px solid ${cor}20`,borderRadius:10}}>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:900,color:cor,letterSpacing:-.5}}>{value}</div>
      <div style={{fontSize:8,color:T.muted,marginTop:2,fontWeight:600,letterSpacing:.8}}>{label.toUpperCase()}</div>
    </div>
  )
}

function ReputacaoBar({ valor, nivel }) {
  const cfg = {
    local:         {cor:'#6B7A99',pct:10},
    distrital:     {cor:'#4FC3F7',pct:25},
    regional:      {cor:'#2DD4A7',pct:45},
    nacional:      {cor:'#C9A84C',pct:65},
    internacional: {cor:'#A855F7',pct:85},
    olimpico:      {cor:'#F87171',pct:100},
  }
  const {cor,pct} = cfg[nivel||'local']
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <span style={{fontSize:9,color:T.muted,fontWeight:600,letterSpacing:.8}}>REPUTAÇÃO</span>
        <span style={{fontSize:10,color:cor,fontWeight:700}}>{nivel?.toUpperCase()}</span>
      </div>
      <div style={{height:3,background:'rgba(255,255,255,.06)',borderRadius:2,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${Math.min(100,valor||0)}%`,background:`linear-gradient(90deg,${cor}88,${cor})`,borderRadius:2,transition:'width 1s ease'}}/>
      </div>
    </div>
  )
}

function ModuloCard({ m, sub, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{background:hover?m.grad.replace('135deg','145deg'):m.grad,border:`1px solid ${m.cor}25`,borderRadius:14,padding:'16px 14px',cursor:'pointer',transition:'all .2s',transform:hover?'scale(1.02)':'scale(1)',position:'relative',overflow:'hidden'}}>
      <GoldLine/>
      <div style={{fontSize:28,marginBottom:10,filter:'drop-shadow(0 2px 4px rgba(0,0,0,.4))'}}>
        {m.icon}
      </div>
      <div style={{fontSize:13,fontWeight:800,color:m.cor,marginBottom:3,letterSpacing:-.2}}>
        {m.label.pt}
      </div>
      <div style={{fontSize:10,color:T.muted}}>{sub}</div>
    </div>
  )
}

function EventCard({ evento }) {
  if (!evento) return null
  const cores={alerta:T.danger,sucesso:T.success,info:T.blue,aviso:T.gold}
  const cor=cores[evento.tipo]||T.blue
  return (
    <div style={{padding:'12px 14px',background:`${cor}0D`,border:`1px solid ${cor}30`,borderRadius:12,display:'flex',alignItems:'center',gap:12,position:'relative',overflow:'hidden'}}>
      <GoldLine/>
      <div style={{width:36,height:36,borderRadius:10,background:`${cor}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{evento.icon}</div>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:cor}}>{evento.titulo}</div>
        <div style={{fontSize:10,color:T.muted,marginTop:1}}>{evento.desc}</div>
      </div>
    </div>
  )
}

function ProximaProvaCard({ prova, semanasAte, idioma }) {
  const urgente = semanasAte <= 1
  return (
    <div style={{background:'linear-gradient(135deg,#0D1030,#080A20)',border:`1px solid ${urgente?'#A855F7':'#1A2A45'}`,borderRadius:14,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#A855F7,#4FC3F7,transparent)'}}/>
      <div style={{fontSize:8,color:'#A855F7',fontWeight:700,letterSpacing:2,marginBottom:8}}>
        {idioma==='en'?'NEXT RACE':idioma==='es'?'PRÓXIMA CARRERA':'PRÓXIMA PROVA'}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:3}}>{prova.nome}</div>
          <div style={{display:'flex',gap:8}}>
            <span style={{fontSize:10,color:T.muted}}>📍 {prova.dist}km</span>
            <span style={{fontSize:10,color:'#A855F7',fontWeight:600}}>⚡ {prova.tipo}</span>
          </div>
        </div>
        <div style={{textAlign:'center',background:urgente?'rgba(168,85,247,.2)':'rgba(255,255,255,.04)',border:`1px solid ${urgente?'#A855F7':'#1A2A45'}`,borderRadius:10,padding:'10px 14px',minWidth:56}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:900,color:urgente?'#A855F7':T.muted,lineHeight:1}}>{semanasAte}</div>
          <div style={{fontSize:8,color:urgente?'#A855F7':T.muted,fontWeight:700,letterSpacing:1,marginTop:2}}>SEM.</div>
        </div>
      </div>
    </div>
  )
}

function PomboRow({ pombo, pos, onClick }) {
  const cor = pombo.sexo==='F'?'#C084FC':'#4FC3F7'
  const medals=['🥇','🥈','🥉']
  return (
    <div onClick={onClick} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:pos<2?`1px solid ${T.surface2}`:'none',cursor:'pointer'}}>
      <div style={{fontSize:18,width:24,textAlign:'center',flexShrink:0}}>{medals[pos]||pos+1}</div>
      <div style={{width:32,height:32,borderRadius:8,background:`${cor}15`,border:`1px solid ${cor}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:cor,fontFamily:"'Fraunces',serif",flexShrink:0}}>
        {pombo.anilha?.slice(-3)}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pombo.nome}</div>
        <div style={{fontSize:9,color:T.muted}}>{pombo.especialidade}</div>
      </div>
      <div style={{display:'flex',gap:2}}>
        {Array.from({length:5}).map((_,j)=><div key={j} style={{width:7,height:7,borderRadius:'50%',background:j<pombo.rating?T.gold:'rgba(255,255,255,.08)'}}/>)}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function HubPombal(props) {
  const {onApagarCarreira,idioma='pt'} = props
  const [c, setC] = useState(()=>lerLS()||props.carreira)
  const [modulo, setModulo] = useState(null)
  const [evento, setEvento] = useState(null)

  const EVENTOS=[
    {prob:.06,icon:'🤒',titulo:'Doença no pombal',desc:'Um pombo adoeceu. -200€',tipo:'alerta',fn:x=>({...x,orcamento:Math.max(0,(x.orcamento||0)-200)})},
    {prob:.04,icon:'🦅',titulo:'Ataque de falcão',desc:'Stress elevado no pombal.',tipo:'alerta',fn:x=>x},
    {prob:.08,icon:'⛈️',titulo:'Mau tempo',desc:'Treinos condicionados.',tipo:'aviso',fn:x=>x},
    {prob:.05,icon:'🤝',titulo:'Patrocínio espontâneo',desc:'+500€ de empresa local',tipo:'sucesso',fn:x=>({...x,orcamento:(x.orcamento||0)+500})},
    {prob:.10,icon:'💪',titulo:'Semana excepcional',desc:'Pombos em excelente forma.',tipo:'sucesso',fn:x=>x},
    {prob:.03,icon:'🏆',titulo:'Recorde batido!',desc:'Pombo atingiu velocidade máxima.',tipo:'sucesso',fn:x=>({...x,reputacao:Math.min(100,(x.reputacao||5)+2)})},
  ]

  const salvar=(dados)=>{gravarLS(dados);setC({...dados});if(typeof props.onGuardar==='function')props.onGuardar(dados)}

  const avancarSemana=()=>{
    if(!c)return
    let nova=calcAvancar(c)
    nova=actualizarFasesCria(nova)
    const ev=EVENTOS.find(e=>Math.random()<e.prob)
    if(ev){nova=ev.fn(nova);setEvento(ev);setTimeout(()=>setEvento(null),5000)}
    salvar(nova)
  }

  if(!c)return null

  // Render módulo
  if(modulo){
    const mp={carreira:c,onVoltar:()=>setModulo(null),onGuardar:salvar,idioma}
    if(modulo==='pombos')    return <VLPombos    {...mp}/>
    if(modulo==='treinos')   return <VLTreinos   {...mp}/>
    if(modulo==='pombal')    return <VLPombal    {...mp}/>
    if(modulo==='staff')     return <VLStaff     {...mp}/>
    if(modulo==='provas')    return <VLProvas    {...mp}/>
    if(modulo==='financas')  return <VLFinancas  {...mp}/>
    if(modulo==='mercado')   return <VLMercado   {...mp}/>
    if(modulo==='rankings')  return <VLRankings  {...mp}/>
    if(modulo==='ninhadas')  return <VLNinhadas  {...mp}/>
    if(modulo==='forma')     return <VLForma     {...mp}/>
    if(modulo==='halloffame')return <VLHallOfFame {...mp}/>
    if(modulo==='objectivos')return <VLObjectivos {...mp}/>
    if(modulo==='timeline')  return <VLTimeline  {...mp}/>
    if(modulo==='patrocinios')return <VLPatrocinios {...mp}/>
    return null
  }

  // Calcular dados
  const pombosActivos=(c.pombos||[]).filter(p=>p.estado==='activo')
  const melhores=[...pombosActivos].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,3)
  const mediaRating=pombosActivos.length?(pombosActivos.reduce((s,p)=>s+(p.rating||0),0)/pombosActivos.length).toFixed(1):0
  const proximaProva={nome:'Prova Local - Santarém',dist:80,tipo:'Velocidade',semana:3}
  const semanasAte=Math.max(0,proximaProva.semana-(c.semana||1))
  const objectivosProntos=(c.objectivos_concluidos||[])
  const patReceitaSem=(c.patrocinios||[]).reduce((s,p)=>s+(p.valorSemanal||0),0)
  const borrachinhos=(c.pombos||[]).filter(p=>p.fase&&p.estado!=='activo').length

  // Sub-labels dos módulos
  const sub={
    pombos:`${pombosActivos.length} activos`,
    pombal:'Nível 1',
    treinos:c.plano_treino?'Plano activo':'Sem plano',
    provas:`Época ${c.epoca||1}`,
    ninhadas:borrachinhos>0?`${borrachinhos} em crescimento`:'Sem ninhadas',
    mercado:'Comprar & vender',
    staff:`${(c.staff||[]).length} contratados`,
    financas:`${(c.orcamento||0).toLocaleString()}€`,
    patrocinios:patReceitaSem>0?`+${patReceitaSem}€/sem`:'Sem contratos',
    rankings:'Ver ranking',
    forma:'Condição física',
    objectivos:`${(c.objectivos_concluidos||[]).length} concluídos`,
    halloffame:`${(c.hall_of_fame||[]).length} lendas`,
    timeline:`${((c.historico_provas||[]).length+(c.ninhadas_virtuais||[]).length)} eventos`,
  }

  return (
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:"'Inter',system-ui,sans-serif"}}>

      {/* ── HEADER PREMIUM ── */}
      <div style={{background:`linear-gradient(180deg,${T.surface} 0%,${T.bg} 100%)`,borderBottom:`1px solid ${T.surface2}`,padding:'16px 16px 14px',position:'relative',overflow:'hidden'}}>
        {/* Linha dourada topo */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C60,#C9A84C,#C9A84C60,transparent)'}}/>
        {/* Glow fundo */}
        <div style={{position:'absolute',top:-40,left:'50%',transform:'translateX(-50%)',width:300,height:80,background:'radial-gradient(ellipse,rgba(201,168,76,.12),transparent)',pointerEvents:'none'}}/>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'relative'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
              <span style={{fontSize:24}}>{c.logotipo||'🕊️'}</span>
              <div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:19,fontWeight:900,color:T.text,letterSpacing:-.5,lineHeight:1}}>{c.nomePombal}</div>
                <div style={{fontSize:10,color:T.muted,marginTop:1}}>{c.nomeGestor}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:6}}>
              <span style={{fontSize:10,color:T.muted}}>Época <span style={{color:T.text,fontWeight:700}}>{c.epoca||1}</span></span>
              <span style={{color:T.surface2}}>·</span>
              <span style={{fontSize:10,color:T.muted}}>Semana <span style={{color:T.text,fontWeight:700}}>{c.semana||1}</span></span>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,color:T.gold,letterSpacing:-.5}}>{(c.orcamento||0).toLocaleString()}€</div>
            {patReceitaSem>0&&<div style={{fontSize:9,color:T.success,fontWeight:600}}>+{patReceitaSem}€/sem</div>}
            <div style={{fontSize:9,color:T.muted,marginTop:2}}>{pombosActivos.length} pombos activos</div>
          </div>
        </div>

        <div style={{marginTop:12,position:'relative'}}>
          <ReputacaoBar valor={c.reputacao||5} nivel={c.nivel_reputacao||'local'}/>
        </div>
      </div>

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:12}}>

        {/* Evento */}
        {evento&&<EventCard evento={evento}/>}
        {!evento&&(c.semana||1)===1&&<EventCard evento={{tipo:'info',icon:'🕊️',titulo:'Bem-vindo à tua carreira!',desc:`${pombosActivos.length} pombos · ${(c.orcamento||0).toLocaleString()}€ de orçamento`}}/>}

        {/* Alertas */}
        {(c.patrocinios||[]).some(p=>p.semanasRestantes<=3)&&(
          <div style={{padding:'10px 14px',background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.2)',borderRadius:10,fontSize:11,color:T.danger,fontWeight:600}}>
            ⚠️ Contrato de patrocínio a expirar em breve
          </div>
        )}

        {/* Próxima prova */}
        <ProximaProvaCard prova={proximaProva} semanasAte={semanasAte} idioma={idioma}/>

        {/* Top pombos */}
        {melhores.length>0&&(
          <div style={{background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:14,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
            <GoldLine/>
            <div style={{fontSize:8,color:T.gold,fontWeight:700,letterSpacing:2,marginBottom:10}}>⭐ MELHORES POMBOS</div>
            {melhores.map((p,i)=><PomboRow key={p.id} pombo={p} pos={i} onClick={()=>setModulo('pombos')}/>)}
          </div>
        )}

        {/* Grid módulos */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
          {MODULOS.map(m=>(
            <ModuloCard key={m.id} m={m} sub={sub[m.id]||''} onClick={()=>setModulo(m.id)}/>
          ))}
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          <StatPill label="Rating" value={`${mediaRating}★`} cor={T.gold}/>
          <StatPill label="Orçamento" value={`${Math.round((c.orcamento||0)/1000)}k€`} cor={T.success}/>
          <StatPill label="Reputação" value={`${Math.round(c.reputacao||5)}%`} cor='#A855F7'/>
        </div>

        {/* Avançar semana */}
        <button onClick={avancarSemana} style={{width:'100%',padding:'15px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#C9A84C,#A07830)',color:'#050A14',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',letterSpacing:.3,boxShadow:'0 4px 20px rgba(201,168,76,.25)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:'-100%',right:0,height:'100%',background:'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)',animation:'none'}}/>
          ⏭️ Avançar Semana →
        </button>

        {/* Apagar */}
        <button onClick={onApagarCarreira} style={{width:'100%',padding:'10px',background:'transparent',border:`1px solid rgba(248,113,113,.15)`,borderRadius:10,color:'rgba(248,113,113,.5)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
          🗑️ Apagar carreira
        </button>
      </div>
    </div>
  )
}
