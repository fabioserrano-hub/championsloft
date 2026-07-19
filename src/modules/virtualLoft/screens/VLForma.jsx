// src/modules/virtualLoft/screens/VLForma.jsx — V2 Registo automático + alertas
import { useState } from 'react'

const T={bg:'#050A14',surface:'#0D1829',s2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171',purple:'#A855F7',orange:'#FB923C'}
function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}
function GL(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.8}}/>}

function corForma(v){return v>=80?'#2DD4A7':v>=65?'#4FC3F7':v>=45?'#C9A84C':'#F87171'}
function labelForma(v){return v>=80?'Excelente 🔥':v>=65?'Boa ✅':v>=45?'Regular ⚠️':'Baixa ❌'}
function corFadiga(v){return v<30?'#2DD4A7':v<60?'#C9A84C':'#F87171'}
function labelFadiga(v){return v<30?'Descansado':v<60?'Normal':'Cansado'}

function MiniGrafico({valores,cor,h=32}){
  if(!valores||valores.length<2)return null
  const max=Math.max(...valores,1),min=Math.min(...valores,0),range=max-min||1
  const w=100
  const pts=valores.map((v,i)=>`${(i/(valores.length-1))*w},${h-((v-min)/range)*(h-4)-2}`).join(' ')
  const area=`0,${h} ${pts} ${w},${h}`
  return(
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',height:h}}>
      <polygon points={area} fill={`${cor}15`}/>
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function VLForma({carreira,onVoltar,onGuardar}){
  const [cl,setCL]=useState(()=>lerLS()||carreira)
  const c=cl
  const salvar=d=>{gravarLS(d);setCL({...d});onGuardar?.(d)}

  const [tab,setTab]=useState('equipa')
  const [msg,setMsg]=useState(null)

  const pombosActivos=(c.pombos||[]).filter(p=>p.estado==='activo')
  const historico=c.historico_provas||[]

  // Verificar próxima prova (Sábado desta semana)
  const diaAtual=c.dia||1
  const diaSemanIdx=(diaAtual-1)%7
  const diasAteProva=5-diaSemanIdx // dias até Sábado
  const temProvaBreve=diasAteProva<=2&&diasAteProva>=0

  // Alertas automáticos
  const alertas=pombosActivos.filter(p=>{
    const forma=p.forma_atual||70
    const fadiga=p.fadiga||0
    return (forma<50&&temProvaBreve)||(fadiga>70)
  })

  // Médias da equipa
  const mediaForma=pombosActivos.length?Math.round(pombosActivos.reduce((s,p)=>s+(p.forma_atual||70),0)/pombosActivos.length):0
  const mediaFadiga=pombosActivos.length?Math.round(pombosActivos.reduce((s,p)=>s+(p.fadiga||0),0)/pombosActivos.length):0
  const emForma=pombosActivos.filter(p=>(p.forma_atual||70)>=65).length
  const cansados=pombosActivos.filter(p=>(p.fadiga||0)>60).length

  // Registar forma manual (snapshot)
  const registarSnapshot=()=>{
    const snapshot={
      dia:diaAtual,semana:c.semana||1,
      pombos:pombosActivos.map(p=>({id:p.id,nome:p.nome,forma:p.forma_atual||70,fadiga:p.fadiga||0}))
    }
    const novoHist=[...(c.historico_forma||[]),snapshot].slice(-20)
    salvar({...c,historico_forma:novoHist})
    setMsg('Snapshot registado!')
    setTimeout(()=>setMsg(null),3000)
  }

  return(
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:`linear-gradient(180deg,${T.surface},${T.bg})`,borderBottom:`1px solid ${T.s2}`,padding:'14px 16px',position:'relative'}}>
        <GL/>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <button onClick={onVoltar} style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:8,width:32,height:32,color:T.muted,cursor:'pointer',fontSize:16}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800}}>📈 Forma</div>
            <div style={{fontSize:9,color:T.muted}}>Média: {mediaForma}% forma · {mediaFadiga}% fadiga · Dia {diaAtual}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[['equipa','Equipa'],['individual','Individual'],['historico','Historial']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:'none',padding:'7px 11px',borderRadius:8,border:tab===id?'none':`1px solid ${T.s2}`,background:tab===id?`${T.blue}20`:'transparent',color:tab===id?T.blue:T.muted,fontSize:10,fontWeight:tab===id?700:400,cursor:'pointer',fontFamily:'inherit'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {msg&&<div style={{margin:'10px 16px 0',padding:'10px 14px',background:`${T.success}10`,border:`1px solid ${T.success}30`,borderRadius:10,fontSize:12,color:T.success,fontWeight:600}}>✅ {msg}</div>}

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:12}}>

        {/* Alertas */}
        {alertas.length>0&&(
          <div style={{padding:'10px 14px',background:`${T.danger}08`,border:`1px solid ${T.danger}25`,borderRadius:10}}>
            <div style={{fontSize:10,fontWeight:700,color:T.danger,marginBottom:4}}>⚠️ ALERTAS PRÉ-PROVA</div>
            {alertas.map(p=>(
              <div key={p.id} style={{fontSize:10,color:T.muted,padding:'2px 0'}}>
                • {p.nome}: {(p.forma_atual||70)<50?`Forma baixa (${p.forma_atual||70}%)`:''}
                {(p.fadiga||0)>70?` Fadiga alta (${p.fadiga||0}%)`:''}
              </div>
            ))}
          </div>
        )}

        {/* EQUIPA */}
        {tab==='equipa'&&(
          <>
            {/* Stats gerais */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
              <div style={{background:T.surface,border:`1px solid ${corForma(mediaForma)}20`,borderRadius:12,padding:'14px',position:'relative',overflow:'hidden'}}>
                <GL/>
                <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:6}}>FORMA MÉDIA</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:900,color:corForma(mediaForma),lineHeight:1}}>{mediaForma}%</div>
                <div style={{fontSize:9,color:corForma(mediaForma),marginTop:4}}>{labelForma(mediaForma)}</div>
                <div style={{marginTop:8,height:4,background:T.s2,borderRadius:2}}>
                  <div style={{height:'100%',width:`${mediaForma}%`,background:corForma(mediaForma),borderRadius:2,boxShadow:`0 0 6px ${corForma(mediaForma)}60`}}/>
                </div>
              </div>
              <div style={{background:T.surface,border:`1px solid ${corFadiga(mediaFadiga)}20`,borderRadius:12,padding:'14px',position:'relative',overflow:'hidden'}}>
                <GL/>
                <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:6}}>FADIGA MÉDIA</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:900,color:corFadiga(mediaFadiga),lineHeight:1}}>{mediaFadiga}%</div>
                <div style={{fontSize:9,color:corFadiga(mediaFadiga),marginTop:4}}>{labelFadiga(mediaFadiga)}</div>
                <div style={{marginTop:8,height:4,background:T.s2,borderRadius:2}}>
                  <div style={{height:'100%',width:`${mediaFadiga}%`,background:corFadiga(mediaFadiga),borderRadius:2}}/>
                </div>
              </div>
            </div>

            {/* Semáforo */}
            <div style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:10,padding:'12px 14px',position:'relative',overflow:'hidden'}}>
              <GL/>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,textAlign:'center'}}>
                <div>
                  <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,color:T.success}}>{emForma}</div>
                  <div style={{fontSize:8,color:T.muted,fontWeight:600}}>EM FORMA</div>
                </div>
                <div>
                  <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,color:T.gold}}>{pombosActivos.length-emForma-cansados}</div>
                  <div style={{fontSize:8,color:T.muted,fontWeight:600}}>REGULAR</div>
                </div>
                <div>
                  <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,color:T.danger}}>{cansados}</div>
                  <div style={{fontSize:8,color:T.muted,fontWeight:600}}>CANSADOS</div>
                </div>
              </div>
            </div>

            <button onClick={registarSnapshot}
              style={{width:'100%',padding:'11px',borderRadius:10,border:`1px solid ${T.blue}30`,background:`${T.blue}10`,color:T.blue,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              📸 Registar Snapshot Manual
            </button>
          </>
        )}

        {/* INDIVIDUAL */}
        {tab==='individual'&&pombosActivos.map(p=>{
          const forma=p.forma_atual||70
          const fadiga=p.fadiga||0
          const cor=p.sexo==='F'?'#C084FC':T.blue
          const histFormaP=(c.historico_forma||[]).map(snap=>snap.pombos?.find(x=>x.id===p.id)?.forma||null).filter(Boolean)
          const alertaForma=forma<50&&temProvaBreve
          const alertaFadiga=fadiga>70
          return(
            <div key={p.id} style={{background:alertaForma||alertaFadiga?`${T.danger}06`:T.surface,border:`1px solid ${alertaForma||alertaFadiga?T.danger+'25':T.s2}`,borderRadius:12,padding:'14px',position:'relative',overflow:'hidden'}}>
              {(alertaForma||alertaFadiga)&&<GL/>}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{width:34,height:34,borderRadius:8,background:`${cor}15`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"Georgia,serif",fontSize:10,fontWeight:900,color:cor}}>{p.anilha?.slice(-3)}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>{p.nome}</div>
                    <div style={{fontSize:9,color:T.muted}}>{p.especialidade}</div>
                  </div>
                </div>
                {(alertaForma||alertaFadiga)&&<span style={{fontSize:9,color:T.danger,background:`${T.danger}15`,padding:'2px 6px',borderRadius:4,fontWeight:700}}>⚠️ ALERTA</span>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:histFormaP.length>1?10:0}}>
                <div style={{padding:'8px',background:T.s2,borderRadius:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:9,color:T.muted}}>Forma</span>
                    <span style={{fontSize:9,color:corForma(forma),fontWeight:700}}>{labelForma(forma).split(' ')[0]}</span>
                  </div>
                  <div style={{height:4,background:'rgba(255,255,255,.08)',borderRadius:2}}>
                    <div style={{height:'100%',width:`${forma}%`,background:corForma(forma),borderRadius:2,boxShadow:`0 0 4px ${corForma(forma)}60`}}/>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:corForma(forma),marginTop:4}}>{forma}%</div>
                </div>
                <div style={{padding:'8px',background:T.s2,borderRadius:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:9,color:T.muted}}>Fadiga</span>
                    <span style={{fontSize:9,color:corFadiga(fadiga),fontWeight:700}}>{labelFadiga(fadiga)}</span>
                  </div>
                  <div style={{height:4,background:'rgba(255,255,255,.08)',borderRadius:2}}>
                    <div style={{height:'100%',width:`${fadiga}%`,background:corFadiga(fadiga),borderRadius:2}}/>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:corFadiga(fadiga),marginTop:4}}>{fadiga}%</div>
                </div>
              </div>
              {histFormaP.length>1&&(
                <div>
                  <div style={{fontSize:8,color:T.muted,marginBottom:3}}>EVOLUÇÃO DA FORMA</div>
                  <MiniGrafico valores={histFormaP} cor={corForma(forma)}/>
                </div>
              )}
              {alertaForma&&<div style={{marginTop:6,fontSize:9,color:T.danger}}>⚠️ Forma baixa — considera descanso antes da prova</div>}
              {alertaFadiga&&<div style={{marginTop:4,fontSize:9,color:T.danger}}>⚠️ Fadiga elevada — prescreve descanso esta semana</div>}
            </div>
          )
        })}

        {/* HISTORIAL */}
        {tab==='historico'&&(
          (c.historico_forma||[]).length===0?(
            <div style={{textAlign:'center',padding:'40px',color:T.muted}}>
              <div style={{fontSize:40,marginBottom:12}}>📋</div>
              <div style={{fontSize:12}}>Sem snapshots ainda</div>
              <div style={{fontSize:10,marginTop:6}}>Usa "Registar Snapshot" na tab Equipa</div>
            </div>
          ):[...(c.historico_forma||[])].reverse().map((snap,i)=>(
            <div key={i} style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:10,padding:'12px 14px',position:'relative',overflow:'hidden'}}>
              <GL/>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text}}>Dia {snap.dia} · Sem.{snap.semana}</div>
                <div style={{fontSize:10,color:T.muted}}>{snap.pombos?.length} pombos</div>
              </div>
              {snap.pombos?.slice(0,3).map((p,j)=>(
                <div key={j} style={{display:'flex',justifyContent:'space-between',fontSize:9,color:T.muted,padding:'2px 0'}}>
                  <span>{p.nome}</span>
                  <span style={{color:corForma(p.forma)}}>F:{p.forma}% <span style={{color:corFadiga(p.fadiga)}}>⚡{p.fadiga}%</span></span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
