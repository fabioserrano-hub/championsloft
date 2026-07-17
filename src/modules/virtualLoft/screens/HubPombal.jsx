// src/modules/virtualLoft/screens/HubPombal.jsx — V3 Premium
import { useState, useEffect } from 'react'
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

function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}

function calcAvancar(c){
  const n={...c,pombos:[...(c.pombos||[])]}
  const staff=Math.round((n.staff||[]).reduce((s,m)=>s+(m.salario||0),0)/4)
  const alim=(n.pombos||[]).length*5
  const pat=(n.patrocinios||[]).reduce((s,p)=>s+(p.valorSemanal||0),0)
  n.orcamento=Math.max(0,(n.orcamento||0)-staff-alim+pat)
  n.patrocinios=(n.patrocinios||[]).map(p=>({...p,semanasRestantes:Math.max(0,(p.semanasRestantes||8)-1)})).filter(p=>p.semanasRestantes>0)
  n.reputacao=Math.min(100,(n.reputacao||5)+0.5)
  n.semana=(n.semana||1)+1
  if(n.semana>40){n.semana=1;n.epoca=(n.epoca||1)+1}
  const r=n.reputacao
  n.nivel_reputacao=r>=90?'olimpico':r>=70?'internacional':r>=50?'nacional':r>=35?'regional':r>=20?'distrital':'local'
  return n
}

// ── Design System ─────────────────────────────────────────────────────────────
const CSS = `
  @keyframes goldPulse { 0%,100%{opacity:.7} 50%{opacity:1} }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .vl-card { transition: transform .2s ease, box-shadow .2s ease; }
  .vl-card:active { transform: scale(.97); }
  .vl-btn-avancar { position:relative; overflow:hidden; }
  .vl-btn-avancar::after { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent); animation:shimmer 2s infinite; }
`

const MODULOS = [
  { id:'pombos',     icon:'🐦', label:'Pombos',      cor:'#4FC3F7', desc:'Plantel' },
  { id:'provas',     icon:'🏆', label:'Provas',       cor:'#A855F7', desc:'Competir' },
  { id:'treinos',    icon:'🎯', label:'Treinos',      cor:'#C9A84C', desc:'Plano semanal' },
  { id:'ninhadas',   icon:'🥚', label:'Ninhadas',     cor:'#818CF8', desc:'Reprodução' },
  { id:'pombal',     icon:'🏠', label:'Pombal',       cor:'#2DD4A7', desc:'Construção' },
  { id:'mercado',    icon:'🛒', label:'Mercado',      cor:'#FB923C', desc:'Comprar & vender' },
  { id:'staff',      icon:'👥', label:'Staff',        cor:'#22D3EE', desc:'Equipa' },
  { id:'financas',   icon:'💰', label:'Finanças',     cor:'#4ADE80', desc:'Gestão' },
  { id:'patrocinios',icon:'🤝', label:'Patrocínios',  cor:'#34D399', desc:'Contratos' },
  { id:'rankings',   icon:'📊', label:'Rankings',     cor:'#F87171', desc:'Classificação' },
  { id:'forma',      icon:'📈', label:'Forma',        cor:'#38BDF8', desc:'Condição' },
  { id:'objectivos', icon:'🎯', label:'Objectivos',   cor:'#2DD4A7', desc:'Metas' },
  { id:'halloffame', icon:'🏛️', label:'Hall of Fame', cor:'#C9A84C', desc:'Lendas' },
  { id:'timeline',   icon:'📜', label:'Timeline',     cor:'#94A3B8', desc:'Historial' },
]

const NIVEL_CFG = {
  local:         {label:'LOCAL',         cor:'#6B7A99', pct:8},
  distrital:     {label:'DISTRITAL',     cor:'#4FC3F7', pct:22},
  regional:      {label:'REGIONAL',      cor:'#2DD4A7', pct:42},
  nacional:      {label:'NACIONAL',      cor:'#C9A84C', pct:62},
  internacional: {label:'INTERNACIONAL', cor:'#A855F7', pct:82},
  olimpico:      {label:'OLÍMPICO',      cor:'#F87171', pct:100},
}

const EVENTOS=[
  {p:.06,i:'🤒',t:'Doença no pombal',d:'Um pombo adoeceu. -200€',tipo:'alerta',f:x=>({...x,orcamento:Math.max(0,(x.orcamento||0)-200)})},
  {p:.04,i:'🦅',t:'Ataque de falcão!',d:'Stress elevado no pombal.',tipo:'alerta',f:x=>x},
  {p:.08,i:'⛈️',t:'Mau tempo',d:'Treinos condicionados esta semana.',tipo:'aviso',f:x=>x},
  {p:.05,i:'🤝',t:'Patrocínio espontâneo!',d:'Empresa local oferece +500€',tipo:'sucesso',f:x=>({...x,orcamento:(x.orcamento||0)+500})},
  {p:.10,i:'💪',t:'Semana excepcional!',d:'Pombos em excelente forma.',tipo:'sucesso',f:x=>x},
  {p:.03,i:'🏆',t:'Recorde pessoal!',d:'Um pombo atingiu a sua máxima velocidade. +Rep',tipo:'sucesso',f:x=>({...x,reputacao:Math.min(100,(x.reputacao||5)+3)})},
  {p:.02,i:'💎',t:'Pombo raro descoberto!',d:'Um jovem revela potencial excepcional.',tipo:'sucesso',f:x=>x},
]

export default function HubPombal(props){
  const {onApagarCarreira,idioma='pt'}=props
  const [c,setC]=useState(()=>lerLS()||props.carreira)
  const [modulo,setModulo]=useState(null)
  const [evento,setEvento]=useState(null)
  const [avancando,setAvancando]=useState(false)
  const [semanaAnterior,setSemanaAnterior]=useState(null)

  const salvar=(d)=>{gravarLS(d);setC({...d});if(typeof props.onGuardar==='function')props.onGuardar(d)}

  const avancar=()=>{
    if(!c||avancando)return
    setAvancando(true)
    setSemanaAnterior(c.semana)
    setTimeout(()=>{
      let n=calcAvancar(c)
      n=actualizarFasesCria(n)
      const ev=EVENTOS.find(e=>Math.random()<e.p)
      if(ev){n=ev.f(n);setEvento({...ev,id:Date.now()});setTimeout(()=>setEvento(null),5000)}
      salvar(n)
      setAvancando(false)
    },400)
  }

  if(!c)return null

  // Módulo activo
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

  // Dados
  const activos=(c.pombos||[]).filter(p=>p.estado==='activo')
  const melhores=[...activos].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,3)
  const mediaRating=activos.length?(activos.reduce((s,p)=>s+(p.rating||0),0)/activos.length).toFixed(1):0
  const niv=NIVEL_CFG[c.nivel_reputacao||'local']
  const borrachinhos=(c.pombos||[]).filter(p=>p.fase&&p.estado!=='activo').length
  const patSem=(c.patrocinios||[]).reduce((s,p)=>s+(p.valorSemanal||0),0)
  const objProntos=(c.objectivos_concluidos||[]).length
  const proxProva={nome:'Prova Local - Santarém',dist:80,tipo:'Velocidade',semana:3}
  const semanasAte=Math.max(0,proxProva.semana-(c.semana||1))

  const subLabel=(id)=>{
    if(id==='pombos')    return `${activos.length} activos${borrachinhos>0?` · ${borrachinhos} jovens`:''}`
    if(id==='financas')  return `${(c.orcamento||0).toLocaleString()}€`
    if(id==='staff')     return `${(c.staff||[]).length} contratados`
    if(id==='pombal')    return 'Construção e upgrades'
    if(id==='treinos')   return c.plano_treino?'Plano activo':'Definir plano'
    if(id==='provas')    return `Época ${c.epoca||1} · Sem. ${c.semana||1}`
    if(id==='ninhadas')  return borrachinhos>0?`${borrachinhos} em crescimento`:'Cruzar pombos'
    if(id==='mercado')   return 'Comprar e vender'
    if(id==='rankings')  return 'Classificação geral'
    if(id==='forma')     return 'Condição dos pombos'
    if(id==='patrocinios') return patSem>0?`+${patSem}€/semana`:'Sem contratos'
    if(id==='objectivos') return `${objProntos} concluídos`
    if(id==='halloffame') return `${(c.hall_of_fame||[]).length} lendas`
    if(id==='timeline')  return `${((c.historico_provas||[]).length+(c.ninhadas_virtuais||[]).length)} eventos`
    return ''
  }

  return (
    <div style={{minHeight:'100vh',background:'#050A14',color:'#E8EDF5',fontFamily:"system-ui,-apple-system,sans-serif",overflowX:'hidden'}}>
      <style>{CSS}</style>

      {/* ══ HERO HEADER ══════════════════════════════════════════════════════ */}
      <div style={{background:'linear-gradient(180deg,#0D1829 0%,#050A14 100%)',padding:'0 0 0',position:'relative',overflow:'hidden'}}>
        {/* Fundo animado */}
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(ellipse 60% 40% at 50% -10%,rgba(201,168,76,.12),transparent)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent 0%,rgba(201,168,76,.6) 30%,#C9A84C 50%,rgba(201,168,76,.6) 70%,transparent 100%)',animation:'goldPulse 3s ease-in-out infinite'}}/>

        {/* Conteúdo do hero */}
        <div style={{padding:'20px 16px 16px',position:'relative'}}>
          {/* Linha superior: logótipo + orçamento */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,rgba(201,168,76,.2),rgba(201,168,76,.05))',border:'1px solid rgba(201,168,76,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>
                {c.logotipo||'🕊️'}
              </div>
              <div>
                <div style={{fontFamily:"Georgia,'Times New Roman',serif",fontSize:20,fontWeight:900,color:'#E8EDF5',letterSpacing:-.5,lineHeight:1.1}}>{c.nomePombal}</div>
                <div style={{fontSize:10,color:'#6B7A99',marginTop:2,letterSpacing:.3}}>{c.nomeGestor} · Ép.{c.epoca||1} Sem.{c.semana||1}</div>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:"Georgia,'Times New Roman',serif",fontSize:24,fontWeight:900,color:'#C9A84C',lineHeight:1,letterSpacing:-.5}}>{(c.orcamento||0).toLocaleString()}€</div>
              {patSem>0&&<div style={{fontSize:9,color:'#2DD4A7',fontWeight:600,marginTop:2}}>+{patSem}€/sem</div>}
              <div style={{fontSize:9,color:'#6B7A99',marginTop:1}}>{activos.length} pombos activos</div>
            </div>
          </div>

          {/* Barra de reputação premium */}
          <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'10px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:8,color:'#6B7A99',fontWeight:700,letterSpacing:1.2}}>REPUTAÇÃO</span>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:niv.cor,boxShadow:`0 0 6px ${niv.cor}`}}/>
                <span style={{fontSize:10,color:niv.cor,fontWeight:700,letterSpacing:.5}}>{niv.label}</span>
              </div>
            </div>
            <div style={{height:4,background:'rgba(255,255,255,.06)',borderRadius:2,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.min(100,c.reputacao||0)}%`,background:`linear-gradient(90deg,${niv.cor}88,${niv.cor})`,borderRadius:2,transition:'width 1.2s cubic-bezier(.4,0,.2,1)',boxShadow:`0 0 8px ${niv.cor}60`}}/>
            </div>
            {/* Milestones */}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
              {['LOCAL','DIST.','REG.','NAC.','INT.','OLÍ.'].map((l,i)=>(
                <span key={i} style={{fontSize:7,color:(c.reputacao||0)>=[0,20,35,50,70,90][i]?niv.cor:'#2a3a5a',fontWeight:700,letterSpacing:.5}}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:14}}>

        {/* ══ EVENTO ═══════════════════════════════════════════════════════════ */}
        {evento&&(
          <div key={evento.id} style={{padding:'14px 16px',background:evento.tipo==='sucesso'?'linear-gradient(135deg,rgba(45,212,167,.12),rgba(45,212,167,.04))':evento.tipo==='aviso'?'linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04))':'linear-gradient(135deg,rgba(248,113,113,.12),rgba(248,113,113,.04))',border:`1px solid ${evento.tipo==='sucesso'?'rgba(45,212,167,.3)':evento.tipo==='aviso'?'rgba(201,168,76,.3)':'rgba(248,113,113,.3)'}`,borderRadius:14,display:'flex',gap:12,alignItems:'center',animation:'slideUp .3s ease'}}>
            <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{evento.i}</div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#E8EDF5',marginBottom:2}}>{evento.t}</div>
              <div style={{fontSize:11,color:'#6B7A99'}}>{evento.d}</div>
            </div>
          </div>
        )}

        {/* ══ BANNER BOAS-VINDAS (só semana 1) ═══════════════════════════════ */}
        {!evento&&(c.semana||1)===1&&(
          <div style={{padding:'14px 16px',background:'linear-gradient(135deg,rgba(201,168,76,.1),rgba(79,195,247,.06))',border:'1px solid rgba(201,168,76,.2)',borderRadius:14,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)'}}/>
            <div style={{fontSize:13,fontWeight:700,color:'#C9A84C',marginBottom:2}}>🕊️ Bem-vindo, {c.nomeGestor}!</div>
            <div style={{fontSize:11,color:'#6B7A99'}}>{activos.length} pombos · {(c.orcamento||0).toLocaleString()}€ · Boa sorte na tua carreira!</div>
          </div>
        )}

        {/* Alertas automáticos */}
        {(c.patrocinios||[]).some(p=>(p.semanasRestantes||0)<=3)&&(
          <div style={{padding:'10px 14px',background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.2)',borderRadius:10,fontSize:11,color:'#F87171',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
            <span>⚠️</span> Contrato de patrocínio a expirar em breve — renovar em Patrocínios
          </div>
        )}

        {/* ══ CARD PRÓXIMA PROVA ═══════════════════════════════════════════════ */}
        <div onClick={()=>setModulo('provas')} className="vl-card"
          style={{background:'linear-gradient(135deg,#0D1030 0%,#0A0820 100%)',border:'1px solid rgba(168,85,247,.25)',borderRadius:16,padding:'16px',cursor:'pointer',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#A855F7,#4FC3F7,transparent)'}}/>
          <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,background:'radial-gradient(circle,rgba(168,85,247,.08),transparent)',pointerEvents:'none'}}/>
          <div style={{fontSize:9,color:'#A855F7',fontWeight:700,letterSpacing:2,marginBottom:10}}>📅 PRÓXIMA PROVA</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:'#E8EDF5',marginBottom:4,letterSpacing:-.3}}>{proxProva.nome}</div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <span style={{fontSize:10,color:'#6B7A99'}}>📍 {proxProva.dist}km</span>
                <span style={{fontSize:10,color:'#A855F7',fontWeight:600,background:'rgba(168,85,247,.1)',padding:'2px 8px',borderRadius:4}}>⚡ {proxProva.tipo}</span>
              </div>
            </div>
            <div style={{textAlign:'center',background:semanasAte<=1?'rgba(168,85,247,.2)':'rgba(255,255,255,.04)',border:`1px solid ${semanasAte<=1?'rgba(168,85,247,.4)':'rgba(255,255,255,.08)'}`,borderRadius:12,padding:'10px 14px',minWidth:60}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:900,color:semanasAte<=1?'#A855F7':'#6B7A99',lineHeight:1}}>{semanasAte}</div>
              <div style={{fontSize:8,color:semanasAte<=1?'#A855F7':'#6B7A99',fontWeight:700,letterSpacing:1,marginTop:2}}>SEM.</div>
            </div>
          </div>
        </div>

        {/* ══ TOP POMBOS ═══════════════════════════════════════════════════════ */}
        {melhores.length>0&&(
          <div style={{background:'#0D1829',border:'1px solid #1A2A45',borderRadius:16,overflow:'hidden',position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(201,168,76,.5),transparent)',animation:'goldPulse 3s infinite'}}/>
            <div style={{padding:'12px 16px 8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:9,color:'#C9A84C',fontWeight:700,letterSpacing:1.5}}>⭐ MELHORES POMBOS</div>
              <div style={{fontSize:9,color:'#6B7A99'}}>Rating médio: {mediaRating}★</div>
            </div>
            {melhores.map((p,i)=>{
              const cor=p.sexo==='F'?'#C084FC':'#4FC3F7'
              const medals=['🥇','🥈','🥉']
              return(
                <div key={p.id} onClick={()=>setModulo('pombos')}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderTop:'1px solid #1A2A45',cursor:'pointer',transition:'background .15s',background:i===0?'rgba(201,168,76,.04)':'transparent'}}>
                  <span style={{fontSize:20,flexShrink:0}}>{medals[i]}</span>
                  <div style={{width:34,height:34,borderRadius:8,background:`${cor}15`,border:`1px solid ${cor}30`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"Georgia,serif",fontSize:11,fontWeight:900,color:cor,flexShrink:0}}>
                    {p.anilha?.slice(-3)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#E8EDF5',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</div>
                    <div style={{fontSize:9,color:'#6B7A99'}}>{p.especialidade} · {p.provas||0} provas</div>
                  </div>
                  <div style={{display:'flex',gap:2}}>
                    {Array.from({length:5}).map((_,j)=>(
                      <div key={j} style={{width:8,height:8,borderRadius:'50%',background:j<p.rating?'#C9A84C':'rgba(255,255,255,.08)',boxShadow:j<p.rating?'0 0 4px rgba(201,168,76,.4)':'none'}}/>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══ GRID MÓDULOS ═════════════════════════════════════════════════════ */}
        <div>
          <div style={{fontSize:9,color:'#6B7A99',fontWeight:700,letterSpacing:1.5,marginBottom:10}}>MÓDULOS DE GESTÃO</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
            {MODULOS.map(m=>(
              <div key={m.id} onClick={()=>setModulo(m.id)} className="vl-card"
                style={{background:'#0D1829',border:`1px solid ${m.cor}20`,borderRadius:14,padding:'16px 14px',cursor:'pointer',position:'relative',overflow:'hidden'}}>
                {/* Linha de cor topo */}
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${m.cor}00,${m.cor},${m.cor}00)`}}/>
                {/* Glow canto */}
                <div style={{position:'absolute',top:-20,right:-20,width:60,height:60,background:`radial-gradient(circle,${m.cor}15,transparent)`,pointerEvents:'none'}}/>
                <div style={{fontSize:28,marginBottom:10,filter:`drop-shadow(0 2px 4px ${m.cor}40)`}}>{m.icon}</div>
                <div style={{fontSize:13,fontWeight:800,color:m.cor,marginBottom:3,letterSpacing:-.2}}>{m.label}</div>
                <div style={{fontSize:10,color:'#6B7A99'}}>{subLabel(m.id)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ STATS BAR ════════════════════════════════════════════════════════ */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          {[
            {label:'RATING',  value:`${mediaRating}★`, cor:'#C9A84C'},
            {label:'SALDO',   value:`${Math.round((c.orcamento||0)/1000)}k€`, cor:'#2DD4A7'},
            {label:'REPUTA.', value:`${Math.round(c.reputacao||5)}%`, cor:'#A855F7'},
          ].map((s,i)=>(
            <div key={i} style={{background:'#0D1829',border:`1px solid ${s.cor}20`,borderRadius:10,padding:'12px 8px',textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${s.cor}60,transparent)`}}/>
              <div style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:900,color:s.cor,letterSpacing:-.5}}>{s.value}</div>
              <div style={{fontSize:8,color:'#6B7A99',marginTop:3,fontWeight:700,letterSpacing:1}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ══ BOTÃO AVANÇAR SEMANA ═════════════════════════════════════════════ */}
        <button onClick={avancar} disabled={avancando} className="vl-btn-avancar"
          style={{width:'100%',padding:'16px',borderRadius:14,border:'1px solid rgba(201,168,76,.4)',background:'linear-gradient(135deg,#C9A84C 0%,#A07830 50%,#C9A84C 100%)',backgroundSize:'200% 100%',color:'#050A14',fontSize:15,fontWeight:900,cursor:avancando?'wait':'pointer',fontFamily:'inherit',letterSpacing:.5,boxShadow:'0 4px 24px rgba(201,168,76,.3), inset 0 1px 0 rgba(255,255,255,.2)',transition:'all .2s',opacity:avancando?.7:1}}>
          {avancando?'⏳ A processar...':'⏭️  Avançar Semana →'}
        </button>

        {/* ══ APAGAR ═══════════════════════════════════════════════════════════ */}
        <button onClick={onApagarCarreira}
          style={{width:'100%',padding:'10px',background:'transparent',border:'1px solid rgba(248,113,113,.12)',borderRadius:10,color:'rgba(248,113,113,.4)',fontSize:11,cursor:'pointer',fontFamily:'inherit',letterSpacing:.3}}>
          🗑️ Apagar carreira e recomeçar
        </button>

        <div style={{height:16}}/>
      </div>
    </div>
  )
}
