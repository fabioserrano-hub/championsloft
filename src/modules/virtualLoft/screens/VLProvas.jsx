// src/modules/virtualLoft/screens/VLProvas.jsx — Premium
import { useState, useEffect, useRef } from 'react'

const T={bg:'#050A14',surface:'#0D1829',surface2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171',purple:'#A855F7'}
function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}
function GoldLine(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.7}}/>}

const PROVAS=[
  {id:'p1',nome:'Local - Santarém',   dist:80,  tipo:'velocidade',  semana:3,  nivel:'local',         premio:100},
  {id:'p2',nome:'Local - Setúbal',    dist:120, tipo:'velocidade',  semana:5,  nivel:'local',         premio:150},
  {id:'p3',nome:'Distrital - Évora',  dist:200, tipo:'velocidade',  semana:8,  nivel:'distrital',     premio:300},
  {id:'p4',nome:'Distrital - Beja',   dist:250, tipo:'meio_fundo',  semana:11, nivel:'distrital',     premio:400},
  {id:'p5',nome:'Regional - Badajoz', dist:350, tipo:'meio_fundo',  semana:15, nivel:'regional',      premio:600},
  {id:'p6',nome:'Regional - Mérida',  dist:420, tipo:'meio_fundo',  semana:18, nivel:'regional',      premio:800},
  {id:'p7',nome:'Nacional - Salamanca',dist:510,tipo:'fundo',       semana:22, nivel:'nacional',      premio:1500},
  {id:'p8',nome:'Nacional - Valladolid',dist:650,tipo:'fundo',      semana:26, nivel:'nacional',      premio:2000},
  {id:'p9',nome:'Internacional - Barcelona',dist:850,tipo:'grande_fundo',semana:30,nivel:'internacional',premio:5000},
  {id:'p10',nome:'Grande Prova - Pau',dist:1100,tipo:'grande_fundo',semana:35, nivel:'internacional', premio:10000},
]

const COR_NIVEL={local:T.muted,distrital:T.blue,regional:T.success,nacional:T.gold,internacional:T.purple}
const TIPO_LABEL={velocidade:'Velocidade',meio_fundo:'Meio-Fundo',fundo:'Fundo',grande_fundo:'Grande Fundo'}

function simularProva(pombos,prova){
  const total=20+Math.floor(Math.random()*80)
  const res=[]
  const nomesAdv=['Relâmpago','Trovão','Furacão','Astro','Cometa','Atlas','Zeus','Orion','Vega','Sirius','Falcão','Titan','Brisa','Névoa','Aurora']
  const pombaisAdv=['Pombal da Serra','Pombal Elite','Pombal Campeão','Pombal Norte','Pombal Real','Pombal Dourado']

  pombos.forEach(p=>{
    const a=p.atributos||{}
    let score
    if(prova.tipo==='velocidade') score=(a.velocidade||50)*.4+(a.instinto||50)*.3+(a.coragem||50)*.3
    else if(prova.tipo==='meio_fundo') score=(a.resistencia||50)*.4+(a.orientacao||50)*.35+(a.velocidade||50)*.25
    else score=(a.resistencia||50)*.5+(a.orientacao||50)*.35+(a.velocidade||50)*.15
    const scoreFinal=score*(0.85+Math.random()*.3)
    const velBase=prova.tipo==='velocidade'?1400:1300
    const velocidade=Math.round(velBase*(scoreFinal/100)*(0.9+Math.random()*.2))
    res.push({pombo:p,score:scoreFinal,velocidade,tempo:Math.round((prova.dist*1000)/velocidade)})
  })

  for(let i=0;i<total-pombos.length;i++){
    const n=35+Math.random()*45
    const velBase=prova.tipo==='velocidade'?1400:1300
    const velocidade=Math.round(velBase*(n/100)*(0.9+Math.random()*.2))
    res.push({pombo:null,score:n,velocidade,tempo:Math.round((prova.dist*1000)/velocidade),nome:nomesAdv[Math.floor(Math.random()*nomesAdv.length)],pombalNome:pombaisAdv[Math.floor(Math.random()*pombaisAdv.length)]})
  }

  res.sort((a,b)=>b.velocidade-a.velocidade)
  return res.map((r,i)=>({...r,posicao:i+1,total:res.length,percentil:Math.round(((res.length-i)/res.length)*100)}))
}

function EVENTOS_PROVA(){
  return ['🦅 Ataque de falcão!','⛈️ Tempestade no percurso!','💨 Vento forte contra','☀️ Condições perfeitas!','🧭 Desorientação temporária','💪 Esforço final surpreendente!','🐦 Lidera o grupo!']
}

function SimulacaoVisual({prova,resultados,pombosParticipantes,onFechar}){
  const [fase,setFase]=useState('inicio')
  const [prog,setProg]=useState(0)
  const [eventoAtual,setEventoAtual]=useState(null)
  const [chegadas,setChegadas]=useState([])
  const ref=useRef(null)
  const meusPombos=resultados.filter(r=>r.pombo)

  useEffect(()=>{
    setTimeout(()=>setFase('voo'),1200)
    let p=0,evIdx=0
    const evs=EVENTOS_PROVA()
    ref.current=setInterval(()=>{
      p+=2;setProg(p)
      if([20,50,75].includes(p)&&evs[evIdx]){setEventoAtual(evs[evIdx]);setTimeout(()=>setEventoAtual(null),2500);evIdx++}
      if(p>=100){
        clearInterval(ref.current);setFase('chegada')
        const sorted=[...resultados].sort((a,b)=>a.posicao-b.posicao)
        sorted.slice(0,15).forEach((r,i)=>setTimeout(()=>setChegadas(prev=>[...prev,r]),i*250))
        setTimeout(()=>setFase('resultado'),sorted.length*250+1000)
      }
    },70)
    return()=>clearInterval(ref.current)
  },[])

  return(
    <div style={{position:'fixed',inset:0,background:T.bg,zIndex:2000,display:'flex',flexDirection:'column',fontFamily:"'Inter',system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{padding:'14px 16px',borderBottom:`1px solid ${T.surface2}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:T.surface,position:'relative'}}>
        <GoldLine/>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:T.text}}>{prova.nome}</div>
          <div style={{fontSize:10,color:T.muted}}>{TIPO_LABEL[prova.tipo]} · {prova.dist}km · {resultados.length} pombos</div>
        </div>
        {fase==='resultado'&&<button onClick={onFechar} style={{background:T.surface2,border:'none',borderRadius:8,padding:'6px 12px',color:T.text,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Fechar ✕</button>}
      </div>

      <div style={{flex:1,overflow:'auto',padding:'16px'}}>
        {/* INÍCIO */}
        {fase==='inicio'&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:300,gap:16}}>
            <div style={{fontSize:56,filter:'drop-shadow(0 0 20px rgba(201,168,76,.5))'}}>🚀</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,color:T.gold,textAlign:'center'}}>Prova a Começar!</div>
            <div style={{fontSize:12,color:T.muted}}>{pombosParticipantes.length} pombos prontos</div>
          </div>
        )}

        {/* VOO */}
        {(fase==='voo'||fase==='chegada')&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {/* Track de progresso */}
            <div style={{background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:14,padding:'16px',position:'relative',overflow:'hidden'}}>
              <GoldLine/>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:9,color:T.muted,fontWeight:600,letterSpacing:1}}>SOLTA</span>
                <span style={{fontSize:9,color:T.gold,fontWeight:700,letterSpacing:1}}>CHEGADA 🏁</span>
              </div>
              <div style={{height:8,background:'rgba(255,255,255,.05)',borderRadius:4,overflow:'hidden',marginBottom:10,position:'relative'}}>
                <div style={{height:'100%',width:`${prog}%`,background:`linear-gradient(90deg,${T.purple},${T.gold})`,borderRadius:4,transition:'width .1s',position:'relative'}}>
                  <div style={{position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',fontSize:14}}>🐦</div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                  {pombosParticipantes.map(p=><span key={p.id} style={{fontSize:13}} title={p.nome}>🐦</span>)}
                </div>
                <span style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:900,color:T.gold}}>{prog}%</span>
              </div>
            </div>

            {/* Evento */}
            {eventoAtual&&(
              <div style={{padding:'12px 16px',background:'rgba(201,168,76,.1)',border:'1px solid rgba(201,168,76,.3)',borderRadius:10,fontSize:13,fontWeight:700,color:T.gold,textAlign:'center',position:'relative',overflow:'hidden'}}>
                <GoldLine/>
                {eventoAtual}
              </div>
            )}

            {/* Chegadas */}
            {chegadas.length>0&&(
              <div style={{background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:12,overflow:'hidden',position:'relative'}}>
                <GoldLine/>
                <div style={{padding:'10px 14px',borderBottom:`1px solid ${T.surface2}`}}>
                  <span style={{fontSize:8,color:T.success,fontWeight:700,letterSpacing:1.5}}>🏁 CHEGADAS</span>
                </div>
                {chegadas.slice(0,8).map((r,i)=>{
                  const isMeu=!!r.pombo
                  return(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',background:isMeu?'rgba(201,168,76,.06)':'transparent',borderBottom:`1px solid ${T.surface2}`}}>
                      <div style={{width:28,height:28,borderRadius:6,background:r.posicao<=3?`${[T.gold,'rgba(148,163,184,.2)','rgba(180,83,9,.2)'][r.posicao-1]}`:`${T.surface2}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:r.posicao<=3?[T.gold,'#94a3b8','#b45309'][r.posicao-1]:T.muted}}>
                        {r.posicao}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,fontWeight:isMeu?700:400,color:isMeu?T.gold:T.text}}>
                          {isMeu?`🐦 ${r.pombo.nome}`:`${r.nome||'Adversário'}`}
                        </div>
                        {!isMeu&&r.pombalNome&&<div style={{fontSize:9,color:T.muted}}>{r.pombalNome}</div>}
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:10,color:T.muted,fontVariantNumeric:'tabular-nums'}}>{r.velocidade} m/min</div>
                        {isMeu&&<div style={{fontSize:9,color:T.success,fontWeight:700}}>P{r.percentil}%</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* RESULTADO */}
        {fase==='resultado'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:48,marginBottom:8,filter:'drop-shadow(0 0 20px rgba(201,168,76,.6))'}}>🏆</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,color:T.gold}}>Prova Concluída!</div>
            </div>
            {meusPombos.map(r=>(
              <div key={r.pombo.id} style={{background:T.surface,border:`2px solid ${r.posicao<=3?T.gold:T.surface2}`,borderRadius:14,padding:'16px',position:'relative',overflow:'hidden'}}>
                {r.posicao<=3&&<GoldLine/>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:T.text}}>{r.pombo.nome}</div>
                    <div style={{fontSize:10,color:T.muted}}>{r.pombo.especialidade}</div>
                  </div>
                  <div style={{textAlign:'center',background:r.posicao<=3?'rgba(201,168,76,.15)':T.surface2,borderRadius:10,padding:'8px 14px'}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:900,color:r.posicao<=3?T.gold:T.text,lineHeight:1}}>{r.posicao}º</div>
                    <div style={{fontSize:9,color:T.muted}}>/{r.total}</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,textAlign:'center'}}>
                  {[
                    {label:'Velocidade',valor:`${r.velocidade} m/min`,cor:T.blue},
                    {label:'Percentil',valor:`${r.percentil}%`,cor:T.success},
                    {label:'Tempo',valor:`${Math.floor(r.tempo/60)}h${r.tempo%60}m`,cor:T.gold},
                  ].map((s,i)=>(
                    <div key={i} style={{padding:'8px',background:T.surface2,borderRadius:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:s.cor,fontVariantNumeric:'tabular-nums'}}>{s.valor}</div>
                      <div style={{fontSize:8,color:T.muted,marginTop:2}}>{s.label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                {r.posicao===1&&<div style={{marginTop:10,padding:'8px',background:'rgba(201,168,76,.1)',border:'1px solid rgba(201,168,76,.2)',borderRadius:8,textAlign:'center',fontSize:11,color:T.gold,fontWeight:700}}>🥇 VITÓRIA! +{prova.premio.toLocaleString()}€</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function VLProvas({carreira,onVoltar,onGuardar}){
  const [carreiraLocal,setCarreiraLocal]=useState(()=>lerLS()||carreira)
  const c=carreiraLocal
  const salvarLocal=(d)=>{gravarLS(d);setCarreiraLocal({...d});onGuardar?.(d)}
  const idioma='pt'

  const [tab,setTab]=useState('calendario')
  const [provaAtiva,setProvaAtiva]=useState(null)
  const [pombosSelec,setPombosSelec]=useState([])
  const [simulando,setSimulando]=useState(false)
  const [resultados,setResultados]=useState(null)
  const [historico,setHistorico]=useState(c.historico_provas||[])

  const togglePombo=(p)=>setPombosSelec(prev=>prev.find(x=>x.id===p.id)?prev.filter(x=>x.id!==p.id):prev.length<10?[...prev,p]:prev)

  const iniciarProva=()=>{
    if(!pombosSelec.length||!provaAtiva)return
    const res=simularProva(pombosSelec,provaAtiva)
    setResultados(res);setSimulando(true)
  }

  const fecharSimulacao=()=>{
    const novosRes=pombosSelec.map(p=>{
      const r=resultados.find(r=>r.pombo?.id===p.id)
      return{provaId:provaAtiva.id,provaNome:provaAtiva.nome,pomboId:p.id,pomboNome:p.nome,posicao:r?.posicao,total:r?.total,percentil:r?.percentil,velocidade:r?.velocidade,semana:c.semana}
    })
    const novoHist=[...historico,...novosRes]
    setHistorico(novoHist)
    const novosPombos=(c.pombos||[]).map(p=>{
      const r=resultados.find(r=>r.pombo?.id===p.id)
      if(!r)return p
      return{...p,provas:(p.provas||0)+1,vitorias:(p.vitorias||0)+(r.posicao===1?1:0),percentil_medio:Math.round(((p.percentil_medio||0)*(p.provas||0)+r.percentil)/((p.provas||0)+1))}
    })
    const premio=pombosSelec.some(p=>resultados.find(r=>r.pombo?.id===p.id&&r.posicao<=3))?provaAtiva.premio:0
    salvarLocal({...c,pombos:novosPombos,historico_provas:novoHist,orcamento:(c.orcamento||0)+premio})
    setSimulando(false);setResultados(null);setProvaAtiva(null);setPombosSelec([]);setTab('historico')
  }

  return(
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:"'Inter',system-ui,sans-serif"}}>
      {simulando&&resultados&&<SimulacaoVisual prova={provaAtiva} resultados={resultados} pombosParticipantes={pombosSelec} onFechar={fecharSimulacao}/>}

      <div style={{background:`linear-gradient(180deg,${T.surface},${T.bg})`,borderBottom:`1px solid ${T.surface2}`,padding:'14px 16px',position:'relative'}}>
        <GoldLine/>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <button onClick={onVoltar} style={{background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:8,width:32,height:32,color:T.muted,cursor:'pointer',fontSize:16}}>←</button>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>🏆 Provas</div>
            <div style={{fontSize:9,color:T.muted}}>Época {c.epoca||1} · Semana {c.semana||1}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[['calendario','Calendário'],['inscrever','Inscrever'],['historico','Historial']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:'none',padding:'8px 14px',borderRadius:8,border:tab===id?'none':`1px solid ${T.surface2}`,background:tab===id?`linear-gradient(135deg,${T.purple}44,${T.purple}22)`:'transparent',color:tab===id?T.purple:T.muted,fontSize:11,fontWeight:tab===id?700:400,cursor:'pointer',fontFamily:'inherit',minHeight:34}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:8}}>

        {/* CALENDÁRIO */}
        {tab==='calendario'&&PROVAS.map(p=>{
          const passada=p.semana<(c.semana||1)
          const proxima=p.semana===(c.semana||1)
          const cor=COR_NIVEL[p.nivel]||T.muted
          return(
            <div key={p.id} style={{padding:'12px 14px',background:proxima?`${T.purple}0A`:T.surface,border:`1px solid ${proxima?T.purple:T.surface2}`,borderRadius:10,opacity:passada?.5:1,position:'relative',overflow:'hidden'}}>
              {proxima&&<GoldLine/>}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style={{fontSize:9,fontWeight:700,color:cor,background:`${cor}15`,padding:'2px 6px',borderRadius:4,letterSpacing:.5}}>{p.nivel.toUpperCase()}</span>
                    {proxima&&<span style={{fontSize:9,fontWeight:700,color:T.gold,background:'rgba(201,168,76,.15)',padding:'2px 6px',borderRadius:4}}>ESTA SEMANA</span>}
                    {passada&&<span style={{fontSize:9,color:T.success}}>✓</span>}
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:passada?T.muted:T.text,marginBottom:2}}>{p.nome}</div>
                  <div style={{fontSize:10,color:T.muted}}>{TIPO_LABEL[p.tipo]} · {p.dist}km · 🏅 {p.premio.toLocaleString()}€</div>
                </div>
                <div style={{textAlign:'center',minWidth:44}}>
                  <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:900,color:proxima?T.purple:passada?T.surface2:T.muted}}>{p.semana}</div>
                  <div style={{fontSize:8,color:T.muted}}>SEM.</div>
                </div>
              </div>
              {proxima&&(
                <button onClick={()=>{setProvaAtiva(p);setTab('inscrever')}}
                  style={{marginTop:8,width:'100%',padding:'8px',borderRadius:8,border:'none',background:`linear-gradient(135deg,${T.purple},#7C3AED)`,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  🏆 Inscrever agora
                </button>
              )}
            </div>
          )
        })}

        {/* INSCREVER */}
        {tab==='inscrever'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {!provaAtiva?(
              <div>
                <div style={{fontSize:10,color:T.muted,marginBottom:8}}>Selecciona uma prova:</div>
                {PROVAS.filter(p=>p.semana>=(c.semana||1)).slice(0,3).map(p=>(
                  <div key={p.id} onClick={()=>setProvaAtiva(p)}
                    style={{padding:'12px 14px',background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:10,marginBottom:6,cursor:'pointer',position:'relative',overflow:'hidden'}}>
                    <GoldLine/>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>{p.nome}</div>
                    <div style={{fontSize:10,color:T.muted}}>{TIPO_LABEL[p.tipo]} · {p.dist}km · Sem. {p.semana}</div>
                  </div>
                ))}
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{padding:'12px 14px',background:`${T.purple}0A`,border:`1px solid ${T.purple}40`,borderRadius:10,position:'relative',overflow:'hidden'}}>
                  <GoldLine/>
                  <div style={{fontSize:14,fontWeight:800,color:T.purple}}>{provaAtiva.nome}</div>
                  <div style={{fontSize:10,color:T.muted,marginTop:2}}>{TIPO_LABEL[provaAtiva.tipo]} · {provaAtiva.dist}km · 🏅 {provaAtiva.premio.toLocaleString()}€</div>
                </div>
                <div style={{fontSize:10,color:T.muted}}>Selecciona pombos ({pombosSelec.length}/10):</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {(c.pombos||[]).filter(p=>p.estado==='activo').map(p=>{
                    const sel=pombosSelec.find(x=>x.id===p.id)
                    const cor=p.sexo==='F'?'#C084FC':T.blue
                    return(
                      <div key={p.id} onClick={()=>togglePombo(p)}
                        style={{padding:'10px 12px',background:sel?`${cor}10`:T.surface,border:`1.5px solid ${sel?cor:T.surface2}`,borderRadius:10,cursor:'pointer',transition:'all .15s',position:'relative',overflow:'hidden'}}>
                        {sel&&<GoldLine/>}
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div style={{fontSize:12,fontWeight:700,color:sel?cor:T.text}}>{p.nome}</div>
                          {sel&&<div style={{width:16,height:16,borderRadius:'50%',background:cor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'#fff',fontWeight:700}}>✓</div>}
                        </div>
                        <div style={{fontSize:9,color:T.muted,marginTop:2}}>{p.especialidade}</div>
                        <div style={{display:'flex',gap:1,marginTop:4}}>
                          {Array.from({length:5}).map((_,i)=><div key={i} style={{fontSize:7,color:i<p.rating?T.gold:'rgba(255,255,255,.08)'}}>{i<p.rating?'★':'☆'}</div>)}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{setProvaAtiva(null);setPombosSelec([])}}
                    style={{flex:1,padding:'11px',borderRadius:10,border:`1px solid ${T.surface2}`,background:'transparent',color:T.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
                  <button onClick={iniciarProva} disabled={!pombosSelec.length}
                    style={{flex:2,padding:'11px',borderRadius:10,border:'none',background:pombosSelec.length?`linear-gradient(135deg,${T.purple},#7C3AED)`:`${T.surface2}`,color:pombosSelec.length?'#fff':T.muted,fontSize:12,fontWeight:700,cursor:pombosSelec.length?'pointer':'default',fontFamily:'inherit'}}>
                    🚀 Iniciar Prova!
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORIAL */}
        {tab==='historico'&&(
          historico.length===0?(
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12}}>📋</div>
              <div style={{fontSize:13,color:T.muted}}>Sem provas ainda</div>
            </div>
          ):[...historico].reverse().map((r,i)=>(
            <div key={i} style={{padding:'10px 14px',background:T.surface,border:`1px solid ${r.posicao<=3?T.gold:T.surface2}`,borderRadius:10,position:'relative',overflow:'hidden'}}>
              {r.posicao<=3&&<GoldLine/>}
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <div style={{fontSize:12,fontWeight:700,color:T.text}}>{r.provaNome}</div>
                <div style={{fontSize:13,fontWeight:800,color:r.posicao<=3?T.gold:T.muted}}>{r.posicao}º/{r.total}</div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <div style={{fontSize:10,color:T.muted}}>🐦 {r.pomboNome} · Sem.{r.semana}</div>
                <div style={{fontSize:10,color:T.success,fontWeight:700}}>P{r.percentil}%</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
