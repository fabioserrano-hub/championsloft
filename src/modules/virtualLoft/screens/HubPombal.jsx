// src/modules/virtualLoft/screens/HubPombal.jsx — V4 Sistema de Dias + Supabase
import { useState, useEffect, useCallback } from 'react'
// Engine inline — sem dependências externas
import VLPombos from './VLPombos'
import VLTreinos from './VLTreinos'
import VLPombal from './VLPombal'
import VLStaff from './VLStaff'
import VLProvas from './VLProvas'
import VLFinancas from './VLFinancas'
import VLMercado from './VLMercado'
import VLRankings from './VLRankings'
import VLNinhadas from './VLNinhadas'
import VLForma from './VLForma'
import VLHallOfFame from './VLHallOfFame'
import VLObjectivos from './VLObjectivos'
import VLTimeline from './VLTimeline'
import VLPatrocinios from './VLPatrocinios'
import VLPerfil from './VLPerfil'
import VLNoticias from './VLNoticias'

const T_ENGINE = {
  DIAS_SHORT: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],
  DIAS_FULL:  ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'],
}

function getDiaSemanaIdx(dia){ return (dia-1)%7 }
function getDiaSemana(dia){ return T_ENGINE.DIAS_FULL[(dia-1)%7] }
function getSemana(diaEpoca){ return Math.ceil(diaEpoca/7) }
function getEpoca(dia){ return Math.ceil(dia/280) }
function getDiaDeEpoca(dia){ return ((dia-1)%280)+1 }
function calcNivelReputacao(r){ return r>=90?'olimpico':r>=70?'internacional':r>=50?'nacional':r>=35?'regional':r>=20?'distrital':'local' }

// 24 provas intercaladas (6 por especialidade)
const SEQ_TIPOS = ['velocidade','meio_fundo','fundo','grande_fundo']
const CIDADES_CAL = {
  velocidade:   ['Santarém','Setúbal','Évora','Badajoz','Salamanca','Madrid'],
  meio_fundo:   ['Beja','Mérida','Cáceres','Toledo','Burgos','Valladolid'],
  fundo:        ['Portalegre','Plasencia','Ávila','Segóvia','Palência','León'],
  grande_fundo: ['Zaragoza','Pamplona','Toulouse','Bordeaux','Lyon','Paris'],
}
const DIST_CAL = {
  velocidade:[80,120,160,250,350,450], meio_fundo:[300,380,430,500,560,620],
  fundo:[500,580,640,700,760,820], grande_fundo:[700,800,900,1000,1050,1100],
}
const PTS_BASE  = {velocidade:10,meio_fundo:20,fundo:30,grande_fundo:50}
const PRE_BASE  = {velocidade:150,meio_fundo:400,fundo:800,grande_fundo:2000}
const TIPO_ICON_CAL = {velocidade:'⚡',meio_fundo:'🌊',fundo:'💪',grande_fundo:'🏔️'}
const NIVEL_CAL = i => i<2?'div3':i<4?'div2':i<5?'div1':'elite'
const SEMS_PROVA = [2,3,4,5,7,8,9,10,12,13,14,15,17,18,19,20,22,23,24,25,27,28,29,30]

const CALENDARIO = SEMS_PROVA.map((sem,idx)=>{
  const tipo = SEQ_TIPOS[idx%4]
  const ordem = Math.floor(idx/4)
  return {
    id:`p${idx+1}`,
    nome:`${tipo==='velocidade'?'Vel.':tipo==='meio_fundo'?'M.F.':tipo==='fundo'?'Fundo':'G.F.'} - ${CIDADES_CAL[tipo][ordem]}`,
    nomeCompleto:`${tipo==='velocidade'?'Velocidade':tipo==='meio_fundo'?'Meio-Fundo':tipo==='fundo'?'Fundo':'Grande Fundo'} — ${CIDADES_CAL[tipo][ordem]}`,
    dist:DIST_CAL[tipo][ordem], tipo, semana:sem,
    nivel:NIVEL_CAL(ordem),
    pontos:PTS_BASE[tipo]*(ordem+1),
    premio:PRE_BASE[tipo]*(ordem+1),
  }
})

function actualizarFasesCria(carreira){
  const dia = carreira.dia||1
  const pombos = (carreira.pombos||[]).map(p=>{
    if(!p.fase||p.fase==='adulto'||p.estado==='activo')return p
    const diasDesde = dia-(p.dia_postura||0)
    if(diasDesde>=77) return{...p,estado:'activo',fase:'adulto'}
    if(diasDesde>=49) return{...p,estado:'jovem',fase:'jovem'}
    if(diasDesde>=21) return{...p,estado:'ninhego',fase:'ninhego'}
    if(diasDesde>=14) return{...p,estado:'borrachinho',fase:'nascido'}
    return p
  })
  return{...carreira,pombos}
}

function calcAvancarDia(c, acoes={}){
  const n={...c,pombos:[...(c.pombos||[])]}
  const diaAtual=c.dia||1
  const diaIdx=getDiaSemanaIdx(diaAtual)
  n.dia=diaAtual+1
  n.semana=getSemana(getDiaDeEpoca(n.dia))
  const novaEp=getEpoca(n.dia)
  if(novaEp>(c.epoca||1)) n.epoca=novaEp

  // Custos semanais ao Domingo
  if(diaIdx===6){
    const custoStaff=Math.round((n.staff||[]).reduce((s,m)=>s+(m.salario||0),0)/4)
    const custoAlim=(n.pombos||[]).length*5
    const recPat=(n.patrocinios||[]).reduce((s,p)=>s+(p.valorSemanal||0),0)
    n.orcamento=Math.max(0,(n.orcamento||0)-custoStaff-custoAlim+recPat)
    n.patrocinios=(n.patrocinios||[]).map(p=>({...p,semanasRestantes:Math.max(0,(p.semanasRestantes||8)-1)})).filter(p=>p.semanasRestantes>0)
    n.reputacao=Math.min(100,(n.reputacao||5)+0.1)
  }

  // Efeitos diários nos pombos
  const {treino,alimentacao}=acoes
  n.pombos=(n.pombos||[]).map(p=>{
    if(p.estado!=='activo')return p
    let fad=p.fadiga||0, for_=p.forma_atual||70
    if(treino==='intenso')  {fad=Math.min(100,fad+8);  for_=Math.min(100,for_+3)}
    if(treino==='normal')   {fad=Math.min(100,fad+4);  for_=Math.min(100,for_+1.5)}
    if(treino==='leve')     {fad=Math.max(0,fad-3);    for_=Math.min(100,for_+0.5)}
    if(treino==='descanso') {fad=Math.max(0,fad-8);    for_=Math.max(40,for_-0.5)}
    if(!treino)              fad=Math.max(0,fad-1)
    if(alimentacao==='premium')   for_=Math.min(100,for_+1.5)
    if(alimentacao==='economica') for_=Math.max(30,for_-1)
    return{...p,fadiga:Math.round(fad),forma_atual:Math.round(for_)}
  })

  return n
}

const SUPA_URL='https://tgqnbheetpgnpjsjphoj.supabase.co'
const SUPA_KEY_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncW5iaGVldHBnbnBqc2pwaG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTk0NDIsImV4cCI6MjA5MjAzNTQ0Mn0.32ZjOUB-bOAIgtwwpKDVRSJy1w4xlOR7IMb4bRTK3Uo'

// Obtém o token JWT do utilizador autenticado (Supabase auth)
function getAuthToken(){
  try{
    // Supabase guarda a sessão no localStorage com esta chave
    const keys=Object.keys(localStorage).filter(k=>k.includes('supabase.auth.token')||k.includes('sb-'))
    for(const k of keys){
      const val=JSON.parse(localStorage.getItem(k)||'{}')
      const token=val?.access_token||val?.currentSession?.access_token
      if(token)return token
    }
  }catch{}
  return null
}

async function guardarCarreiraSupabase(userId, carreira){
  try{
    const token=getAuthToken()||SUPA_KEY_ANON
    const headers={
      'apikey':SUPA_KEY_ANON,
      'Authorization':`Bearer ${token}`,
      'Content-Type':'application/json',
      'Prefer':'resolution=merge-duplicates,return=minimal'
    }
    const payload={
      user_id:userId,
      dados:carreira,
      nome_pombal:carreira.nomePombal||'',
      epoca:carreira.epoca||1,
      dia:carreira.dia||1,
      updated_at:new Date().toISOString()
    }
    const r=await fetch(`${SUPA_URL}/rest/v1/vl_carreiras`,{method:'POST',headers,body:JSON.stringify(payload)})
    if(!r.ok){
      const err=await r.text()
      console.warn('Supabase save error:',r.status,err)
      return false
    }
    return true
  }catch(e){
    console.warn('guardarCarreiraSupabase error:',e)
    return false
  }
}

const DIAS_SEMANA_SHORT = T_ENGINE.DIAS_SHORT

const T={bg:'#050A14',surface:'#0D1829',s2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171',purple:'#A855F7',orange:'#FB923C'}

function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}

function GL(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.8}}/>}

const MODULOS=[
  {id:'pombos',     icon:'🐦',label:'Pombos',       cor:'#4FC3F7'},
  {id:'provas',     icon:'🏆',label:'Provas',        cor:'#A855F7'},
  {id:'treinos',    icon:'🎯',label:'Treinos',       cor:'#C9A84C'},
  {id:'ninhadas',   icon:'🥚',label:'Ninhadas',      cor:'#818CF8'},
  {id:'pombal',     icon:'🏠',label:'Pombal',        cor:'#2DD4A7'},
  {id:'mercado',    icon:'🛒',label:'Mercado',       cor:'#FB923C'},
  {id:'staff',      icon:'👥',label:'Staff',         cor:'#22D3EE'},
  {id:'financas',   icon:'💰',label:'Finanças',      cor:'#4ADE80'},
  {id:'patrocinios',icon:'🤝',label:'Patrocínios',   cor:'#34D399'},
  {id:'rankings',   icon:'📊',label:'Rankings',      cor:'#F87171'},
  {id:'forma',      icon:'📈',label:'Forma',         cor:'#38BDF8'},
  {id:'objectivos', icon:'🎯',label:'Objectivos',    cor:'#2DD4A7'},
  {id:'halloffame', icon:'🏛️',label:'Hall of Fame',  cor:'#C9A84C'},
  {id:'timeline',   icon:'📜',label:'Timeline',      cor:'#94A3B8'},
  {id:'noticias',   icon:'📰',label:'Notícias',       cor:'#FB923C'},
  {id:'perfil',     icon:'👤',label:'Perfil',         cor:'#A855F7'},
]

const NIVEL_CFG={
  local:         {cor:'#6B7A99',pct:8},
  distrital:     {cor:'#4FC3F7',pct:22},
  regional:      {cor:'#2DD4A7',pct:42},
  nacional:      {cor:'#C9A84C',pct:62},
  internacional: {cor:'#A855F7',pct:82},
  olimpico:      {cor:'#F87171',pct:100},
}

const ACOES_DIA=[
  {id:'intenso',   icon:'💪',label:'Treino Intenso',   cor:'#F87171', fadiga:'+8',forma:'+3'},
  {id:'normal',    icon:'🎯',label:'Treino Normal',    cor:'#4FC3F7', fadiga:'+4',forma:'+1.5'},
  {id:'leve',      icon:'🌿',label:'Treino Leve',      cor:'#2DD4A7', fadiga:'-3',forma:'+0.5'},
  {id:'descanso',  icon:'😴',label:'Descanso',         cor:'#94A3B8', fadiga:'-8',forma:'-0.5'},
  {id:'premium',   icon:'⭐',label:'Alim. Premium',    cor:'#C9A84C', fadiga:'0', forma:'+1.5', slot:'alimentacao'},
  {id:'economica', icon:'💸',label:'Alim. Económica',  cor:'#6B7A99', fadiga:'0', forma:'-1',   slot:'alimentacao'},
]

const EVENTOS=[
  {p:.04,i:'🤒',t:'Doença no pombal',d:'Um pombo adoeceu. -200€',tipo:'alerta',f:x=>({...x,orcamento:Math.max(0,(x.orcamento||0)-200)})},
  {p:.02,i:'🦅',t:'Ataque de falcão!',d:'Stress elevado hoje.',tipo:'alerta',f:x=>x},
  {p:.03,i:'⛈️',t:'Mau tempo',d:'Treinos condicionados.',tipo:'aviso',f:x=>x},
  {p:.02,i:'🤝',t:'Patrocínio espontâneo!',d:'+300€',tipo:'sucesso',f:x=>({...x,orcamento:(x.orcamento||0)+300})},
  {p:.03,i:'💪',t:'Dia excepcional!',d:'Pombos em excelente forma.',tipo:'sucesso',f:x=>x},
  {p:.01,i:'🏆',t:'Recorde batido!',d:'+2 reputação',tipo:'sucesso',f:x=>({...x,reputacao:Math.min(100,(x.reputacao||5)+2)})},
]

export default function HubPombal(props) {
  const { onApagarCarreira, userId } = props
  const [c, setC] = useState(()=>lerLS()||props.carreira)
  const [modulo, setModulo] = useState(null)
  const [evento, setEvento] = useState(null)
  const [avancando, setAvancando] = useState(false)
  const [acaoDia, setAcaoDia] = useState('normal')
  const [acaoAlim, setAcaoAlim] = useState('normal')
  const [salvandoNuvem, setSalvandoNuvem] = useState(false)
  const [savedNuvem, setSavedNuvem] = useState(false)
  const [mostrarAcoes, setMostrarAcoes] = useState(false)

  const salvar = useCallback((dados) => {
    gravarLS(dados)
    setC({...dados})
    if (typeof props.onGuardar === 'function') props.onGuardar(dados)
  }, [])

  // Auto-save Supabase a cada mudança
  useEffect(() => {
    if (!c || !userId) return
    const timer = setTimeout(async () => {
      setSalvandoNuvem(true)
      await guardarCarreiraSupabase(userId, c)
      setSalvandoNuvem(false)
      setSavedNuvem(true)
      setTimeout(() => setSavedNuvem(false), 2000)
    }, 2000)
    return () => clearTimeout(timer)
  }, [c, userId])

  const avancarDia = () => {
    if (!c || avancando) return

    // Verificar se há prova hoje (Sábado)
    const diaAtual = c.dia || 1
    const diaSemanIdx = getDiaSemanaIdx(diaAtual) // 5 = Sábado
    const semanaAtual = getSemana(getDiaDeEpoca(diaAtual))
    const provaHoje = CALENDARIO.find(p => p.semana === semanaAtual && !( c.historico_provas||[]).some(h=>h.provaId===p.id))

    if (provaHoje && diaSemanIdx === 5) {
      // Bloquear — há prova hoje (Sábado)
      return
    }

    setAvancando(true)
    setTimeout(() => {
      const acoes = { treino: acaoDia, alimentacao: acaoAlim }
      let nova = calcAvancarDia(c, acoes)
      const ev = EVENTOS.find(e => Math.random() < e.p)
      if (ev) { nova = ev.f(nova); setEvento({...ev, id:Date.now()}); setTimeout(()=>setEvento(null), 5000) }
      nova.nivel_reputacao = calcNivelReputacao(nova.reputacao || 5)
      salvar(nova)
      setAvancando(false)
    }, 300)
  }

  if (!c) return null

  // Módulo activo
  if (modulo) {
    const mp = { carreira:c, onVoltar:()=>setModulo(null), onGuardar:salvar, userId }
    if (modulo==='pombos')     return <VLPombos     {...mp}/>
    if (modulo==='treinos')    return <VLTreinos    {...mp}/>
    if (modulo==='pombal')     return <VLPombal     {...mp}/>
    if (modulo==='staff')      return <VLStaff      {...mp}/>
    if (modulo==='provas')     return <VLProvas     {...mp}/>
    if (modulo==='financas')   return <VLFinancas   {...mp}/>
    if (modulo==='mercado')    return <VLMercado    {...mp}/>
    if (modulo==='rankings')   return <VLRankings   {...mp}/>
    if (modulo==='ninhadas')   return <VLNinhadas   {...mp}/>
    if (modulo==='forma')      return <VLForma      {...mp}/>
    if (modulo==='halloffame') return <VLHallOfFame {...mp}/>
    if (modulo==='objectivos') return <VLObjectivos {...mp}/>
    if (modulo==='timeline')   return <VLTimeline   {...mp}/>
    if (modulo==='patrocinios')return <VLPatrocinios {...mp}/>
    if (modulo==='perfil')    return <VLPerfil {...mp} onApagar={props.onApagarCarreira} userId={props.userId}/>
    if (modulo==='noticias')  return <VLNoticias {...mp}/>
    return null
  }

  // Calcular dados do dia
  const diaAtual = c.dia || 1
  const diaSemanIdx = getDiaSemanaIdx(diaAtual)
  const nomeDia = getDiaSemana(diaAtual)
  const semanaAtual = getSemana(getDiaDeEpoca(diaAtual))
  const epochaAtual = getEpoca(diaAtual)
  const diaEpoca = getDiaDeEpoca(diaAtual)

  const provaHoje = CALENDARIO.find(p => p.semana === semanaAtual && !(c.historico_provas||[]).some(h=>h.provaId===p.id))
  const provaBloqueada = provaHoje && diaSemanIdx === 5 // Sábado com prova
  const proximaProva = CALENDARIO.find(p => p.semana > semanaAtual || (p.semana === semanaAtual && !(c.historico_provas||[]).some(h=>h.provaId===p.id)))
  const diasAteProva = proximaProva ? (proximaProva.semana - semanaAtual) * 7 + (5 - diaSemanIdx) : null

  const activos = (c.pombos||[]).filter(p=>p.estado==='activo')
  const melhores = [...activos].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,3)
  const mediaRating = activos.length ? (activos.reduce((s,p)=>s+(p.rating||0),0)/activos.length).toFixed(1) : 0
  const niv = NIVEL_CFG[c.nivel_reputacao||'local']
  const patSem = (c.patrocinios||[]).reduce((s,p)=>s+(p.valorSemanal||0),0)

  const TIPO_ICON = {velocidade:'⚡',meio_fundo:'🌊',fundo:'💪',grande_fundo:'🏔️'}

  return (
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:"system-ui,sans-serif",overflowX:'hidden'}}>

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div style={{background:`linear-gradient(180deg,${T.surface},${T.bg})`,padding:'16px 16px 14px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C80,#C9A84C,#C9A84C80,transparent)'}}/>
        <div style={{position:'absolute',top:-50,left:'50%',transform:'translateX(-50%)',width:300,height:100,background:'radial-gradient(ellipse,rgba(201,168,76,.1),transparent)',pointerEvents:'none'}}/>

        {/* Linha: logótipo + orçamento */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <div style={{width:46,height:46,borderRadius:12,background:'linear-gradient(135deg,rgba(201,168,76,.2),rgba(201,168,76,.05))',border:'1px solid rgba(201,168,76,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>
              {c.logotipo||'🕊️'}
            </div>
            <div>
              <div style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:900,color:T.text,letterSpacing:-.4,lineHeight:1.1}}>{c.nomePombal}</div>
              <div style={{fontSize:9,color:T.muted,marginTop:2}}>{c.nomeGestor}</div>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:900,color:T.gold,letterSpacing:-.5,lineHeight:1}}>{(c.orcamento||0).toLocaleString()}€</div>
            {patSem>0&&<div style={{fontSize:9,color:T.success,fontWeight:600,marginTop:1}}>+{patSem}€/sem</div>}
            <div style={{fontSize:8,color:T.muted,marginTop:2,display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end'}}>
              {salvandoNuvem?<span style={{color:T.blue}}>☁️ A guardar...</span>:savedNuvem?<span style={{color:T.success}}>✅ Guardado</span>:<span>☁️ Cloud</span>}
            </div>
          </div>
        </div>

        {/* Calendário semanal com dia actual destacado */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:10}}>
          {DIAS_SEMANA_SHORT.map((d,i)=>{
            const isHoje = i === diaSemanIdx
            const isProva = i === 5 && provaHoje // Sábado com prova
            return(
              <div key={i} style={{textAlign:'center',padding:'4px 2px',borderRadius:6,background:isHoje?isProva?`${T.purple}30`:`${T.gold}20`:isProva?`${T.purple}10`:'rgba(255,255,255,.03)',border:`1px solid ${isHoje?isProva?T.purple:T.gold:isProva?T.purple+'40':T.s2}`}}>
                <div style={{fontSize:7,color:isHoje?isProva?T.purple:T.gold:isProva?T.purple:T.muted,fontWeight:isHoje?700:400,letterSpacing:.3}}>{d}</div>
                {isProva&&<div style={{fontSize:7,marginTop:1}}>🏆</div>}
                {isHoje&&!isProva&&<div style={{width:4,height:4,borderRadius:'50%',background:T.gold,margin:'2px auto 0'}}/>}
              </div>
            )
          })}
        </div>

        {/* Época / Semana / Dia */}
        <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:10}}>
          <div style={{padding:'4px 10px',background:T.s2,borderRadius:6}}>
            <span style={{fontSize:9,color:T.muted}}>Ép. </span>
            <span style={{fontSize:10,fontWeight:700,color:T.text}}>{epochaAtual}</span>
          </div>
          <div style={{padding:'4px 10px',background:T.s2,borderRadius:6}}>
            <span style={{fontSize:9,color:T.muted}}>Sem. </span>
            <span style={{fontSize:10,fontWeight:700,color:T.text}}>{semanaAtual}</span>
          </div>
          <div style={{padding:'4px 10px',background:`${T.gold}15`,border:`1px solid ${T.gold}30`,borderRadius:6}}>
            <span style={{fontSize:9,color:T.gold,fontWeight:700}}>{nomeDia}</span>
            <span style={{fontSize:9,color:T.muted}}> · Dia {diaEpoca}</span>
          </div>
        </div>

        {/* Reputação */}
        <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:8,padding:'8px 12px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
            <span style={{fontSize:8,color:T.muted,fontWeight:700,letterSpacing:1}}>REPUTAÇÃO</span>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:niv.cor,boxShadow:`0 0 5px ${niv.cor}`}}/>
              <span style={{fontSize:9,color:niv.cor,fontWeight:700}}>{(c.nivel_reputacao||'local').toUpperCase()}</span>
            </div>
          </div>
          <div style={{height:3,background:'rgba(255,255,255,.06)',borderRadius:2}}>
            <div style={{height:'100%',width:`${Math.min(100,c.reputacao||0)}%`,background:`linear-gradient(90deg,${niv.cor}80,${niv.cor})`,borderRadius:2,transition:'width 1s ease',boxShadow:`0 0 6px ${niv.cor}50`}}/>
          </div>
        </div>
      </div>

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:12}}>

        {/* ── BOTÃO AVANÇAR DIA — TOPO ─────────────────────────────────────── */}
        <div style={{display:'flex',gap:8}}>
          <button onClick={provaBloqueada?null:avancarDia} disabled={avancando}
            style={{flex:1,padding:'14px',borderRadius:12,border:provaBloqueada?`1px solid ${T.danger}30`:'1px solid rgba(201,168,76,.4)',background:provaBloqueada?`${T.danger}08`:'linear-gradient(135deg,#C9A84C,#A07830)',color:provaBloqueada?T.danger:'#050A14',fontSize:13,fontWeight:800,cursor:provaBloqueada?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:provaBloqueada?'none':'0 4px 20px rgba(201,168,76,.25)',transition:'all .2s',opacity:avancando?.7:1}}>
            {avancando?'⏳':'⏭️'} {provaBloqueada?'⚠️ Realiza a prova primeiro!':avancando?'A processar...`':`Avançar Dia → ${nomeDia}`}
          </button>
          {provaBloqueada&&(
            <button onClick={()=>setModulo('provas')}
              style={{padding:'14px',borderRadius:12,border:`1px solid ${T.purple}40`,background:`${T.purple}15`,color:T.purple,fontSize:16,cursor:'pointer',flexShrink:0}}>
              🏆
            </button>
          )}
        </div>

        {/* ── ACÇÕES DO DIA ────────────────────────────────────────────────── */}
        <div style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:12,overflow:'hidden',position:'relative'}}>
          <GL/>
          <button onClick={()=>setMostrarAcoes(!mostrarAcoes)} style={{width:'100%',padding:'10px 14px',background:'transparent',border:'none',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:'inherit'}}>
            <div>
              <span style={{fontSize:11,fontWeight:700,color:T.text}}>Acções de hoje</span>
              <span style={{fontSize:9,color:T.muted,marginLeft:8}}>Treino: <span style={{color:T.blue}}>{ACOES_DIA.find(a=>a.id===acaoDia)?.label}</span></span>
            </div>
            <span style={{color:T.muted,fontSize:12}}>{mostrarAcoes?'▲':'▼'}</span>
          </button>

          {mostrarAcoes&&(
            <div style={{padding:'0 14px 14px',display:'flex',flexDirection:'column',gap:10}}>
              {/* Treino */}
              <div>
                <div style={{fontSize:8,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:6}}>TREINO</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:5}}>
                  {ACOES_DIA.filter(a=>!a.slot).map(a=>(
                    <button key={a.id} onClick={()=>setAcaoDia(a.id)}
                      style={{padding:'10px 8px',borderRadius:8,border:`2px solid ${acaoDia===a.id?a.cor:T.s2}`,background:acaoDia===a.id?`${a.cor}15`:'transparent',cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all .15s'}}>
                      <div style={{fontSize:14,marginBottom:3}}>{a.icon}</div>
                      <div style={{fontSize:10,fontWeight:700,color:acaoDia===a.id?a.cor:T.muted}}>{a.label}</div>
                      <div style={{fontSize:8,color:T.muted,marginTop:2}}>Fadiga {a.fadiga} · Forma {a.forma}</div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Alimentação */}
              <div>
                <div style={{fontSize:8,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:6}}>ALIMENTAÇÃO</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
                  {[
                    {id:'premium',icon:'⭐',label:'Premium',cor:T.gold,desc:'Forma +1.5'},
                    {id:'normal',icon:'🌾',label:'Normal',cor:T.blue,desc:'Equilibrado'},
                    {id:'economica',icon:'💸',label:'Económica',cor:T.muted,desc:'Forma -1'},
                  ].map(a=>(
                    <button key={a.id} onClick={()=>setAcaoAlim(a.id)}
                      style={{padding:'8px 6px',borderRadius:8,border:`2px solid ${acaoAlim===a.id?a.cor:T.s2}`,background:acaoAlim===a.id?`${a.cor}15`:'transparent',cursor:'pointer',textAlign:'center',fontFamily:'inherit',transition:'all .15s'}}>
                      <div style={{fontSize:14,marginBottom:2}}>{a.icon}</div>
                      <div style={{fontSize:9,fontWeight:700,color:acaoAlim===a.id?a.cor:T.muted}}>{a.label}</div>
                      <div style={{fontSize:7,color:T.muted}}>{a.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── EVENTO ───────────────────────────────────────────────────────── */}
        {evento&&(
          <div style={{padding:'12px 14px',background:evento.tipo==='sucesso'?`${T.success}0D`:evento.tipo==='aviso'?`${T.gold}0D`:`${T.danger}0D`,border:`1px solid ${evento.tipo==='sucesso'?T.success:evento.tipo==='aviso'?T.gold:T.danger}30`,borderRadius:12,display:'flex',gap:10,alignItems:'center'}}>
            <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{evento.i}</div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:T.text}}>{evento.t}</div>
              <div style={{fontSize:10,color:T.muted,marginTop:1}}>{evento.d}</div>
            </div>
          </div>
        )}

        {/* ── PRÓXIMA PROVA ────────────────────────────────────────────────── */}
        {proximaProva&&(
          <div onClick={()=>setModulo('provas')} style={{background:'linear-gradient(135deg,#0A0820,#050A14)',border:`1px solid ${TIPO_ICON[proximaProva.tipo]?T.purple:T.s2}30`,borderRadius:14,padding:'14px',cursor:'pointer',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#A855F7,#4FC3F7,transparent)'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:8,color:T.purple,fontWeight:700,letterSpacing:1.5,marginBottom:5}}>
                  {provaBloqueada?'🚨 PROVA HOJE — OBRIGATÓRIO':'📅 PRÓXIMA PROVA'}
                </div>
                <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:3}}>{TIPO_ICON[proximaProva.tipo]} {proximaProva.nomeCompleto}</div>
                <div style={{display:'flex',gap:8}}>
                  <span style={{fontSize:9,color:T.muted}}>{proximaProva.dist}km</span>
                  <span style={{fontSize:9,color:T.gold,fontWeight:600}}>🏅{proximaProva.premio.toLocaleString()}€</span>
                  <span style={{fontSize:9,color:T.purple,fontWeight:600}}>🏆{proximaProva.pontos}pts</span>
                </div>
              </div>
              <div style={{textAlign:'center',background:provaBloqueada?`${T.danger}20`:diasAteProva<=7?`${T.purple}15`:T.s2,border:`1px solid ${provaBloqueada?T.danger:diasAteProva<=7?T.purple:T.s2}`,borderRadius:10,padding:'10px 12px',minWidth:52,flexShrink:0}}>
                <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:900,color:provaBloqueada?T.danger:diasAteProva<=7?T.purple:T.muted,lineHeight:1}}>{provaBloqueada?'JÁ':diasAteProva}</div>
                {!provaBloqueada&&<div style={{fontSize:7,color:T.muted,marginTop:1}}>DIAS</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── TOP POMBOS ───────────────────────────────────────────────────── */}
        {melhores.length>0&&(
          <div style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:14,overflow:'hidden',position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(201,168,76,.5),transparent)'}}/>
            <div style={{padding:'10px 14px 6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:9,color:T.gold,fontWeight:700,letterSpacing:1.5}}>⭐ MELHORES POMBOS</span>
              <span style={{fontSize:9,color:T.muted}}>{mediaRating}★ média</span>
            </div>
            {melhores.map((p,i)=>{
              const cor=p.sexo==='F'?'#C084FC':T.blue
              return(
                <div key={p.id} onClick={()=>setModulo('pombos')} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderTop:'1px solid #1A2A45',cursor:'pointer',background:i===0?'rgba(201,168,76,.03)':'transparent'}}>
                  <span style={{fontSize:16,flexShrink:0}}>{['🥇','🥈','🥉'][i]}</span>
                  <div style={{width:30,height:30,borderRadius:7,background:`${cor}15`,border:`1px solid ${cor}30`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"Georgia,serif",fontSize:10,fontWeight:900,color:cor,flexShrink:0}}>
                    {p.anilha?.slice(-3)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</div>
                    <div style={{fontSize:8,color:T.muted}}>{p.especialidade} · F:{p.forma_atual||70}% · Fadiga:{p.fadiga||0}%</div>
                  </div>
                  <div style={{display:'flex',gap:2}}>
                    {Array.from({length:5}).map((_,j)=><div key={j} style={{width:7,height:7,borderRadius:'50%',background:j<p.rating?T.gold:'rgba(255,255,255,.08)',boxShadow:j<p.rating?`0 0 3px ${T.gold}60`:'none'}}/>)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── GRID MÓDULOS ─────────────────────────────────────────────────── */}
        <div style={{fontSize:8,color:T.muted,fontWeight:700,letterSpacing:1.5,marginBottom:-4}}>GESTÃO DO POMBAL</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
          {MODULOS.map(m=>(
            <div key={m.id} onClick={()=>setModulo(m.id)} style={{background:T.surface,border:`1px solid ${m.cor}18`,borderRadius:12,padding:'14px',cursor:'pointer',position:'relative',overflow:'hidden',transition:'all .2s'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${m.cor}00,${m.cor},${m.cor}00)`}}/>
              <div style={{position:'absolute',top:-20,right:-20,width:60,height:60,background:`radial-gradient(circle,${m.cor}12,transparent)`,pointerEvents:'none'}}/>
              <div style={{fontSize:26,marginBottom:8,filter:`drop-shadow(0 2px 4px ${m.cor}40)`}}>{m.icon}</div>
              <div style={{fontSize:12,fontWeight:800,color:m.cor,marginBottom:2,letterSpacing:-.1}}>{m.label}</div>
              <div style={{fontSize:9,color:T.muted}}>{
                m.id==='pombos'?`${activos.length} activos`:
                m.id==='financas'?`${(c.orcamento||0).toLocaleString()}€`:
                m.id==='provas'?`Ép.${epochaAtual} · Sem.${semanaAtual}`:
                m.id==='ninhadas'?`${(c.pombos||[]).filter(p=>p.fase&&p.estado!=='activo').length} em cresc.`:
                m.id==='patrocinios'?`+${patSem}€/sem`:
                m.id==='halloffame'?`${(c.hall_of_fame||[]).length} lendas`:
                m.id==='objectivos'?`${(c.objectivos_concluidos||[]).length} concluídos`:
                m.id==='staff'?`${(c.staff||[]).length} contratados`:'→'
              }</div>
            </div>
          ))}
        </div>

        {/* ── STATS ─────────────────────────────────────────────────────────── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
          {[
            {l:'RATING',  v:`${mediaRating}★`, c:T.gold},
            {l:'SALDO',   v:`${Math.round((c.orcamento||0)/1000)}k€`, c:T.success},
            {l:'DIA',     v:diaEpoca, c:T.purple},
          ].map((s,i)=>(
            <div key={i} style={{background:T.surface,border:`1px solid ${s.c}18`,borderRadius:8,padding:'10px',textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${s.c}50,transparent)`}}/>
              <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:900,color:s.c}}>{s.v}</div>
              <div style={{fontSize:7,color:T.muted,marginTop:2,fontWeight:700,letterSpacing:1}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Apagar */}
        <button onClick={onApagarCarreira} style={{width:'100%',padding:'9px',background:'transparent',border:`1px solid rgba(248,113,113,.12)`,borderRadius:10,color:'rgba(248,113,113,.4)',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>
          🗑️ Apagar carreira
        </button>
        <div style={{height:12}}/>
      </div>
    </div>
  )
}
