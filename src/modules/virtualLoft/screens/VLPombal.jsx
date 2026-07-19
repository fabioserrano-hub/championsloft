// src/modules/virtualLoft/screens/VLPombal.jsx — V3 Premium
import { useState } from 'react'

const T={bg:'#050A14',surface:'#0D1829',s2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171',purple:'#A855F7'}
function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}
function GL(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.7}}/>}

const ESTRUTURAS=[
  {
    id:'viveiros',icon:'🏠',label:'Viveiros',max:5,base:2000,
    desc:'Alojamento dos pombos',
    efeitos:['Cap. +10 pombos/nível','Stress -5%/nível','Bem-estar geral +8%'],
    posX:20,posY:15,w:40,h:30,
  },
  {
    id:'reproducao',icon:'🥚',label:'Centro Reprodução',max:4,base:5000,
    desc:'Gestão avançada de casais',
    efeitos:['Ninhadas simultâneas +1/nível','Taxa de sucesso +10%','Genética revelada mais rápido'],
    posX:65,posY:15,w:30,h:25,
  },
  {
    id:'quarentena',icon:'🏥',label:'Quarentena',max:3,base:3000,
    desc:'Isolamento e prevenção de doenças',
    efeitos:['Doenças -40%/nível','Novos pombos isolados automaticamente','Recuperação +20%'],
    posX:20,posY:55,w:30,h:25,
  },
  {
    id:'clinica',icon:'💊',label:'Clínica',max:4,base:8000,
    desc:'Tratamento e recuperação',
    efeitos:['Lesões curam 2x mais rápido','Veterinário interno disponível','Cirurgias possíveis nível 3+'],
    posX:55,posY:50,w:25,h:30,
  },
  {
    id:'treinos',icon:'🎯',label:'Centro de Treinos',max:4,base:6000,
    desc:'Optimização do treino',
    efeitos:['+15% ganho de atributos','Planos individualizados nível 2+','Análise de forma em tempo real'],
    posX:83,posY:55,w:15,h:30,
  },
  {
    id:'armazem',icon:'📦',label:'Armazém',max:3,base:1500,
    desc:'Armazenamento e logística',
    efeitos:['Custo alimentação -15%/nível','Stock para 4 semanas nível 2','Nutrição premium disponível'],
    posX:5,posY:55,w:14,h:30,
  },
  {
    id:'laboratorio',icon:'🔬',label:'Laboratório',max:3,base:12000,
    desc:'Análise genética avançada',
    efeitos:['1 atributo oculto/semana revelado','ADN completo nível 2','Compatibilidade de casais nível 3'],
    posX:37,posY:55,w:16,h:30,
  },
  {
    id:'museu',icon:'🏛️',label:'Museu do Pombal',max:2,base:4000,
    desc:'Historial e conquistas',
    efeitos:['+5 reputação/época','Valor pombos +10%','Atrai patrocinadores premium'],
    posX:65,posY:55,w:16,h:30,
  },
]

function custoPorNivel(base,nivel){return Math.round(base*Math.pow(1.8,nivel))}

function MapaPombal({estruturas,getNivel,onSelect,selId}){
  return(
    <div style={{position:'relative',width:'100%',paddingTop:'60%',background:'linear-gradient(135deg,#0A1520,#061018)',border:`1px solid ${T.s2}`,borderRadius:14,overflow:'hidden',marginBottom:12}}>
      <GL/>
      {/* Grid fundo */}
      <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)',backgroundSize:'20% 20%'}}/>
      {/* Relvado */}
      <div style={{position:'absolute',inset:'8%',background:'rgba(45,212,167,.04)',border:'1px solid rgba(45,212,167,.08)',borderRadius:8}}/>

      {ESTRUTURAS.map(e=>{
        const nivel=getNivel(e.id)
        const isSel=selId===e.id
        const cor=nivel>0?T.success:T.muted
        return(
          <div key={e.id} onClick={()=>onSelect(e.id)}
            style={{position:'absolute',left:`${e.posX}%`,top:`${e.posY}%`,width:`${e.w}%`,height:`${e.h}%`,background:isSel?`${cor}20`:nivel>0?`${cor}0A`:'rgba(255,255,255,.04)',border:`${isSel?2:1}px solid ${isSel?cor:nivel>0?`${cor}40`:T.s2}`,borderRadius:6,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',transition:'all .2s',boxShadow:isSel?`0 0 12px ${cor}40`:nivel>0?`0 0 6px ${cor}20`:'none'}}>
            <div style={{fontSize:nivel>0?16:12,filter:nivel>0?`drop-shadow(0 0 4px ${cor}60)`:'grayscale(1) opacity(.4)'}}>{e.icon}</div>
            {nivel>0&&<div style={{fontSize:6,color:cor,fontWeight:700,marginTop:2,letterSpacing:.5}}>Nv.{nivel}</div>}
          </div>
        )
      })}
    </div>
  )
}

function NivelDots({nivel,max,cor}){
  return(
    <div style={{display:'flex',gap:4}}>
      {Array.from({length:max}).map((_,i)=>(
        <div key={i} style={{width:i<nivel?10:8,height:i<nivel?10:8,borderRadius:3,background:i<nivel?cor:'rgba(255,255,255,.08)',boxShadow:i<nivel?`0 0 6px ${cor}60`:'none',transition:'all .3s'}}/>
      ))}
    </div>
  )
}

export default function VLPombal({carreira,onVoltar,onGuardar}){
  const [cl,setCL]=useState(()=>lerLS()||carreira)
  const c=cl
  const salvar=(d)=>{gravarLS(d);setCL({...d});onGuardar?.(d)}

  const [selId,setSelId]=useState('viveiros')
  const [msg,setMsg]=useState(null)
  const [tab,setTab]=useState('mapa')

  const getNivel=(id)=>c.estruturas?.[id]?.nivel||0
  const estruturaSel=ESTRUTURAS.find(e=>e.id===selId)
  const nivelAtual=getNivel(selId)
  const proxCusto=estruturaSel?custoPorNivel(estruturaSel.base,nivelAtual):0
  const maxed=estruturaSel&&nivelAtual>=estruturaSel.max
  const podeComprar=!maxed&&(c.orcamento||0)>=proxCusto

  // Cálculo de efeitos activos
  const efectosActivos=[]
  ESTRUTURAS.forEach(e=>{
    const n=getNivel(e.id)
    if(n>0){
      e.efeitos.slice(0,n).forEach(ef=>efectosActivos.push({icon:e.icon,label:e.label,efeito:ef,nivel:n}))
    }
  })

  const construir=()=>{
    if(!podeComprar||!estruturaSel)return
    const novasEst={...c.estruturas,[selId]:{nivel:nivelAtual+1}}
    const nova={...c,estruturas:novasEst,orcamento:(c.orcamento||0)-proxCusto,movimentos:[...(c.movimentos||[]),{tipo:'obras',descricao:`Obras: ${estruturaSel.label} Nv.${nivelAtual+1}`,valor:-proxCusto,semana:c.semana||1}]}
    salvar(nova)
    setMsg({tipo:'ok',texto:`${estruturaSel.label} melhorado para Nível ${nivelAtual+1}!`})
    setTimeout(()=>setMsg(null),3000)
  }

  // Nível médio geral
  const nivelMedio=(ESTRUTURAS.reduce((s,e)=>s+getNivel(e.id),0)/ESTRUTURAS.length).toFixed(1)
  const totalGasto=ESTRUTURAS.reduce((s,e)=>{
    const n=getNivel(e.id)
    let custo=0
    for(let i=0;i<n;i++)custo+=custoPorNivel(e.base,i)
    return s+custo
  },0)

  return(
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:"system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(180deg,${T.surface},${T.bg})`,borderBottom:`1px solid ${T.s2}`,padding:'14px 16px',position:'relative'}}>
        <GL/>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <button onClick={onVoltar} style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:8,width:32,height:32,color:T.muted,cursor:'pointer',fontSize:16}}>←</button>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>🏠 Pombal</div>
            <div style={{fontSize:9,color:T.muted}}>Nível médio {nivelMedio} · Investido: {totalGasto.toLocaleString()}€ · Saldo: {(c.orcamento||0).toLocaleString()}€</div>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[['mapa','🗺️ Mapa'],['lista','📋 Lista'],['efeitos','✨ Efeitos']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:'none',padding:'7px 12px',borderRadius:8,border:tab===id?'none':`1px solid ${T.s2}`,background:tab===id?`linear-gradient(135deg,${T.success}33,${T.success}11)`:'transparent',color:tab===id?T.success:T.muted,fontSize:11,fontWeight:tab===id?700:400,cursor:'pointer',fontFamily:'inherit'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {msg&&(
        <div style={{margin:'10px 16px 0',padding:'10px 14px',background:msg.tipo==='ok'?'rgba(45,212,167,.1)':'rgba(248,113,113,.1)',border:`1px solid ${msg.tipo==='ok'?'rgba(45,212,167,.3)':'rgba(248,113,113,.3)'}`,borderRadius:10,fontSize:12,color:msg.tipo==='ok'?T.success:T.danger,fontWeight:600}}>
          {msg.tipo==='ok'?'✅':'❌'} {msg.texto}
        </div>
      )}

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:12}}>

        {/* TAB MAPA */}
        {tab==='mapa'&&(
          <>
            <MapaPombal estruturas={c.estruturas} getNivel={getNivel} onSelect={setSelId} selId={selId}/>

            {/* Detalhe estrutura seleccionada */}
            {estruturaSel&&(
              <div style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:14,overflow:'hidden',position:'relative'}}>
                <GL/>
                <div style={{padding:'14px 16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <div style={{width:44,height:44,borderRadius:12,background:nivelAtual>0?`${T.success}15`:'rgba(255,255,255,.05)',border:`1px solid ${nivelAtual>0?T.success+'40':T.s2}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
                        {estruturaSel.icon}
                      </div>
                      <div>
                        <div style={{fontSize:15,fontWeight:800,color:T.text}}>{estruturaSel.label}</div>
                        <div style={{fontSize:10,color:T.muted,marginTop:2}}>{estruturaSel.desc}</div>
                        <div style={{marginTop:6}}><NivelDots nivel={nivelAtual} max={estruturaSel.max} cor={T.success}/></div>
                      </div>
                    </div>
                    {maxed&&<span style={{fontSize:9,color:T.gold,fontWeight:700,background:'rgba(201,168,76,.15)',padding:'3px 8px',borderRadius:6,border:'1px solid rgba(201,168,76,.3)'}}>MAX</span>}
                  </div>

                  {/* Efeitos por nível */}
                  <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:12}}>
                    {estruturaSel.efeitos.map((ef,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:i<nivelAtual?`${T.success}08`:'rgba(255,255,255,.02)',border:`1px solid ${i<nivelAtual?T.success+'25':T.s2}`,borderRadius:8}}>
                        <div style={{width:18,height:18,borderRadius:'50%',background:i<nivelAtual?`${T.success}20`:'rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:i<nivelAtual?T.success:T.muted,fontWeight:700,flexShrink:0}}>{i+1}</div>
                        <div style={{fontSize:11,color:i<nivelAtual?T.text:T.muted}}>{ef}</div>
                        {i<nivelAtual&&<div style={{marginLeft:'auto',fontSize:9,color:T.success,fontWeight:700}}>ACTIVO</div>}
                      </div>
                    ))}
                  </div>

                  {/* Botão construir */}
                  {!maxed&&(
                    <button onClick={construir} disabled={!podeComprar}
                      style={{width:'100%',padding:'13px',borderRadius:10,border:'none',background:podeComprar?`linear-gradient(135deg,${T.success},#059669)`:'rgba(255,255,255,.06)',color:podeComprar?'#050A14':T.muted,fontSize:13,fontWeight:700,cursor:podeComprar?'pointer':'default',fontFamily:'inherit',boxShadow:podeComprar?`0 4px 16px ${T.success}30`:'none',transition:'all .2s'}}>
                      {podeComprar?`🔨 Upgrade para Nível ${nivelAtual+1} — ${proxCusto.toLocaleString()}€`:`💸 Sem fundos (faltam ${(proxCusto-(c.orcamento||0)).toLocaleString()}€)`}
                    </button>
                  )}
                  {maxed&&<div style={{textAlign:'center',fontSize:12,color:T.gold,fontWeight:700,padding:'10px 0'}}>🏆 Nível máximo atingido!</div>}
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB LISTA */}
        {tab==='lista'&&ESTRUTURAS.map(e=>{
          const n=getNivel(e.id)
          const maxed=n>=e.max
          const custo=custoPorNivel(e.base,n)
          const pode=(c.orcamento||0)>=custo&&!maxed
          return(
            <div key={e.id} onClick={()=>{setSelId(e.id);setTab('mapa')}}
              style={{background:T.surface,border:`1px solid ${n>0?T.success+'25':T.s2}`,borderRadius:12,padding:'12px 14px',cursor:'pointer',position:'relative',overflow:'hidden'}}>
              {n>0&&<GL/>}
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:40,height:40,borderRadius:10,background:n>0?`${T.success}12`:'rgba(255,255,255,.04)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{e.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <div style={{fontSize:13,fontWeight:700,color:n>0?T.text:T.muted}}>{e.label}</div>
                    {maxed?<span style={{fontSize:9,color:T.gold,fontWeight:700}}>MAX</span>:<span style={{fontSize:10,fontWeight:700,color:pode?T.success:T.danger}}>{custo.toLocaleString()}€</span>}
                  </div>
                  <NivelDots nivel={n} max={e.max} cor={T.success}/>
                  <div style={{fontSize:9,color:T.muted,marginTop:4}}>{e.desc}</div>
                </div>
              </div>
            </div>
          )
        })}

        {/* TAB EFEITOS */}
        {tab==='efeitos'&&(
          <>
            {efectosActivos.length===0?(
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:40,marginBottom:12}}>🏗️</div>
                <div style={{fontSize:13,color:T.muted}}>Nenhuma estrutura construída ainda</div>
                <div style={{fontSize:11,color:T.s2,marginTop:6}}>Vai ao Mapa para começar a construir</div>
              </div>
            ):(
              <>
                <div style={{padding:'10px 14px',background:`${T.success}08`,border:`1px solid ${T.success}20`,borderRadius:10,fontSize:11,color:T.success,fontWeight:600}}>
                  ✨ {efectosActivos.length} efeito{efectosActivos.length!==1?'s':''} activo{efectosActivos.length!==1?'s':''} no teu pombal
                </div>
                {efectosActivos.map((ef,i)=>(
                  <div key={i} style={{display:'flex',gap:10,padding:'10px 14px',background:T.surface,border:`1px solid ${T.s2}`,borderRadius:10,alignItems:'center'}}>
                    <span style={{fontSize:20}}>{ef.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:T.muted,marginBottom:2}}>{ef.label} · Nível {ef.nivel}</div>
                      <div style={{fontSize:12,color:T.success,fontWeight:600}}>{ef.efeito}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
