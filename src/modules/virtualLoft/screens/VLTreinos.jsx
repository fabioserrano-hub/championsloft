// src/modules/virtualLoft/screens/VLTreinos.jsx — V2 Plano real com ganhos
import { useState } from 'react'

const T={bg:'#050A14',surface:'#0D1829',s2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171',purple:'#A855F7',orange:'#FB923C'}
function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}
function GL(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.8}}/>}

const TIPOS_TREINO = [
  {id:'velocidade',   icon:'⚡', label:'Velocidade',      cor:'#FB923C', desc:'Sprints curtos e rápidos', attrMelhora:'velocidade',   fadiga:+6, ganho:+2.5},
  {id:'resistencia',  icon:'💪', label:'Resistência',     cor:'#2DD4A7', desc:'Voos de longa duração',   attrMelhora:'resistencia',  fadiga:+7, ganho:+2.5},
  {id:'orientacao',   icon:'🧭', label:'Orientação',      cor:'#4FC3F7', desc:'Navegação e localização', attrMelhora:'orientacao',   fadiga:+4, ganho:+2.0},
  {id:'recuperacao',  icon:'😴', label:'Recuperação',     cor:'#94A3B8', desc:'Descanso activo',         attrMelhora:'recuperacao',  fadiga:-8, ganho:+1.0},
  {id:'inteligencia', icon:'🧠', label:'Inteligência',    cor:'#A855F7', desc:'Puzzles e estimulação',   attrMelhora:'inteligencia', fadiga:+2, ganho:+2.0},
  {id:'vento',        icon:'💨', label:'Adapt. ao Vento', cor:'#38BDF8', desc:'Treino em vento forte',   attrMelhora:'coragem',      fadiga:+5, ganho:+1.5},
  {id:'chuva',        icon:'🌧️', label:'Adapt. à Chuva',  cor:'#818CF8', desc:'Treino em condições de chuva', attrMelhora:'instinto', fadiga:+5, ganho:+1.5},
  {id:'forca',        icon:'🏋️', label:'Força',           cor:'#F87171', desc:'Treino físico intenso',   attrMelhora:'forca',       fadiga:+8, ganho:+2.0},
]

const DIAS_SEMANA = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

export default function VLTreinos({carreira, onVoltar, onGuardar}){
  const [cl,setCL]=useState(()=>lerLS()||carreira)
  const c=cl
  const salvar=d=>{gravarLS(d);setCL({...d});onGuardar?.(d)}

  const [tab,setTab]=useState('plano')
  const [pombosSelec,setPombosSelec]=useState([])
  const [tipoSel,setTipoSel]=useState(null)
  const [diasSel,setDiasSel]=useState([])
  const [msg,setMsg]=useState(null)

  const pombosActivos=(c.pombos||[]).filter(p=>p.estado==='activo')
  const planoAtual=c.plano_treino||null
  const temTreinador=(c.staff||[]).some(s=>s.tipo==='treinador')
  const temNutricionista=(c.staff||[]).some(s=>s.tipo==='nutricionista')

  const togglePombo=p=>setPombosSelec(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])
  const toggleDia=d=>setDiasSel(prev=>prev.includes(d)?prev.filter(x=>x!==d):[...prev,d])

  const aplicarPlano=()=>{
    if(!tipoSel||!diasSel.length)return
    const tipo=TIPOS_TREINO.find(t=>t.id===tipoSel)
    const plano={tipo:tipoSel,dias:diasSel,pombos:pombosSelec.length>0?pombosSelec:'todos',criado_semana:c.semana}
    salvar({...c,plano_treino:plano})
    setMsg({tipo:'ok',texto:`Plano de ${tipo.label} aplicado!`})
    setTimeout(()=>setMsg(null),3000)
    setTab('plano')
  }

  // Simular ganho semanal do plano actual
  const calcGanhoSemanal=()=>{
    if(!planoAtual)return null
    const tipo=TIPOS_TREINO.find(t=>t.id===planoAtual.tipo)
    if(!tipo)return null
    const mult=temTreinador?1.2:1.0
    const diasTreino=planoAtual.dias?.length||3
    return{
      attr:tipo.attrMelhora,
      ganho:+(tipo.ganho*mult*diasTreino/7).toFixed(1),
      fadiga:Math.round(tipo.fadiga*diasTreino/7),
      tipo,mult,diasTreino
    }
  }
  const ganho=calcGanhoSemanal()

  return(
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:`linear-gradient(180deg,${T.surface},${T.bg})`,borderBottom:`1px solid ${T.s2}`,padding:'14px 16px',position:'relative'}}>
        <GL/>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <button onClick={onVoltar} style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:8,width:32,height:32,color:T.muted,cursor:'pointer',fontSize:16}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800}}>🎯 Treinos</div>
            <div style={{fontSize:9,color:T.muted}}>
              {temTreinador?<span style={{color:T.success}}>✓ Treinador activo (+20% ganho)</span>:'Sem treinador'}
              {temNutricionista&&<span style={{color:T.orange}}> · Nutricionista activo</span>}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[['plano','Plano Actual'],['criar','Criar Plano'],['progresso','Progresso']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:'none',padding:'7px 11px',borderRadius:8,border:tab===id?'none':`1px solid ${T.s2}`,background:tab===id?`${T.gold}20`:'transparent',color:tab===id?T.gold:T.muted,fontSize:10,fontWeight:tab===id?700:400,cursor:'pointer',fontFamily:'inherit'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {msg&&<div style={{margin:'10px 16px 0',padding:'10px 14px',background:`${T.success}10`,border:`1px solid ${T.success}30`,borderRadius:10,fontSize:12,color:T.success,fontWeight:600}}>✅ {msg.texto}</div>}

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:12}}>

        {/* PLANO ACTUAL */}
        {tab==='plano'&&(
          planoAtual?(()=>{
            const tipo=TIPOS_TREINO.find(t=>t.id===planoAtual.tipo)
            return(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {/* Card do plano */}
                <div style={{background:`${tipo?.cor||T.gold}0A`,border:`1px solid ${tipo?.cor||T.gold}25`,borderRadius:14,padding:'16px',position:'relative',overflow:'hidden'}}>
                  <GL/>
                  <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}>
                    <div style={{width:52,height:52,borderRadius:14,background:`${tipo?.cor}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>{tipo?.icon}</div>
                    <div>
                      <div style={{fontSize:15,fontWeight:800,color:tipo?.cor||T.gold}}>{tipo?.label}</div>
                      <div style={{fontSize:10,color:T.muted}}>{tipo?.desc}</div>
                    </div>
                  </div>
                  {/* Dias de treino */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:12}}>
                    {DIAS_SEMANA.map((d,i)=>{
                      const activo=(planoAtual.dias||[]).includes(i)
                      return(
                        <div key={i} style={{textAlign:'center',padding:'5px 2px',borderRadius:5,background:activo?`${tipo?.cor}20`:T.s2,border:`1px solid ${activo?tipo?.cor+'40':T.s2}`}}>
                          <div style={{fontSize:7,color:activo?tipo?.cor:T.muted,fontWeight:activo?700:400}}>{d}</div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Ganhos previstos */}
                  {ganho&&(
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                      {[
                        {l:'Atributo',v:ganho.attr.slice(0,6).toUpperCase(),c:tipo?.cor},
                        {l:'+/semana',v:`+${ganho.ganho}`,c:T.success},
                        {l:'Fadiga',v:ganho.fadiga>0?`+${ganho.fadiga}`:`${ganho.fadiga}`,c:ganho.fadiga>0?T.danger:T.success},
                      ].map((s,i)=>(
                        <div key={i} style={{padding:'8px',background:T.surface,borderRadius:8,textAlign:'center'}}>
                          <div style={{fontSize:13,fontWeight:700,color:s.c}}>{s.v}</div>
                          <div style={{fontSize:8,color:T.muted,marginTop:2}}>{s.l.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {temTreinador&&<div style={{marginTop:8,fontSize:9,color:T.success}}>⭐ Treinador activo: ganho ×1.2</div>}
                </div>

                {/* Pombos em treino */}
                <div>
                  <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>POMBOS EM TREINO</div>
                  {pombosActivos.map(p=>{
                    const emTreino=planoAtual.pombos==='todos'||planoAtual.pombos?.includes(p.id)
                    const cor=p.sexo==='F'?'#C084FC':T.blue
                    const forma=p.forma_atual||70
                    const fadiga=p.fadiga||0
                    return(
                      <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:emTreino?`${tipo?.cor}06`:T.surface,border:`1px solid ${emTreino?tipo?.cor+'25':T.s2}`,borderRadius:10,marginBottom:6}}>
                        <div style={{width:32,height:32,borderRadius:7,background:`${cor}15`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"Georgia,serif",fontSize:10,fontWeight:900,color:cor,flexShrink:0}}>{p.anilha?.slice(-3)}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:600,color:emTreino?T.text:T.muted}}>{p.nome}</div>
                          <div style={{display:'flex',gap:8,marginTop:3}}>
                            <div style={{display:'flex',alignItems:'center',gap:3}}>
                              <span style={{fontSize:8,color:T.muted}}>F</span>
                              <div style={{width:30,height:3,background:T.s2,borderRadius:2}}><div style={{height:'100%',width:`${forma}%`,background:forma>=70?T.success:T.gold}}/></div>
                              <span style={{fontSize:8,color:T.muted}}>{forma}%</span>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:3}}>
                              <span style={{fontSize:8,color:T.muted}}>⚡</span>
                              <div style={{width:30,height:3,background:T.s2,borderRadius:2}}><div style={{height:'100%',width:`${fadiga}%`,background:fadiga>60?T.danger:T.gold}}/></div>
                              <span style={{fontSize:8,color:T.muted}}>{fadiga}%</span>
                            </div>
                          </div>
                        </div>
                        {emTreino?<span style={{fontSize:9,color:tipo?.cor,fontWeight:700}}>+{ganho?.ganho}/sem</span>:<span style={{fontSize:9,color:T.muted}}>Fora do plano</span>}
                      </div>
                    )
                  })}
                </div>
                <button onClick={()=>setTab('criar')}
                  style={{width:'100%',padding:'11px',borderRadius:10,border:`1px solid ${T.s2}`,background:'transparent',color:T.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                  Alterar plano
                </button>
              </div>
            )
          })():(
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12}}>🎯</div>
              <div style={{fontSize:13,color:T.muted,marginBottom:12}}>Sem plano de treino activo</div>
              <button onClick={()=>setTab('criar')}
                style={{padding:'12px 24px',borderRadius:10,border:'none',background:`linear-gradient(135deg,${T.gold},#A07830)`,color:'#050A14',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                Criar Plano
              </button>
            </div>
          )
        )}

        {/* CRIAR PLANO */}
        {tab==='criar'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Tipo de treino */}
            <div>
              <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>TIPO DE TREINO</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
                {TIPOS_TREINO.map(t=>(
                  <div key={t.id} onClick={()=>setTipoSel(tipoSel===t.id?null:t.id)}
                    style={{padding:'12px 10px',borderRadius:10,border:`2px solid ${tipoSel===t.id?t.cor:T.s2}`,background:tipoSel===t.id?`${t.cor}10`:'transparent',cursor:'pointer',transition:'all .15s'}}>
                    <div style={{fontSize:18,marginBottom:4}}>{t.icon}</div>
                    <div style={{fontSize:11,fontWeight:700,color:tipoSel===t.id?t.cor:T.muted,marginBottom:2}}>{t.label}</div>
                    <div style={{fontSize:8,color:T.muted}}>{t.desc}</div>
                    <div style={{fontSize:8,color:t.cor,marginTop:4}}>+{t.ganho} {t.attrMelhora.slice(0,5)}/dia · Fadiga {t.fadiga>0?'+':''}{t.fadiga}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dias de treino */}
            <div>
              <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>DIAS DE TREINO</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
                {DIAS_SEMANA.map((d,i)=>{
                  const isSel=diasSel.includes(i)
                  const tipoC=tipoSel?TIPOS_TREINO.find(t=>t.id===tipoSel)?.cor:T.gold
                  return(
                    <div key={i} onClick={()=>toggleDia(i)}
                      style={{textAlign:'center',padding:'8px 2px',borderRadius:6,background:isSel?`${tipoC}20`:T.surface,border:`1px solid ${isSel?tipoC+'40':T.s2}`,cursor:'pointer',transition:'all .15s'}}>
                      <div style={{fontSize:8,color:isSel?tipoC:T.muted,fontWeight:isSel?700:400}}>{d}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{fontSize:9,color:T.muted,marginTop:6}}>{diasSel.length} dias seleccionados</div>
            </div>

            {/* Selecção de pombos */}
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1}}>POMBOS ({pombosSelec.length===0?'todos':pombosSelec.length})</div>
                <button onClick={()=>setPombosSelec([])} style={{fontSize:9,color:T.muted,background:'none',border:'none',cursor:'pointer',padding:0}}>Seleccionar todos</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:5}}>
                {pombosActivos.map(p=>{
                  const isSel=pombosSelec.includes(p.id)
                  const cor=p.sexo==='F'?'#C084FC':T.blue
                  return(
                    <div key={p.id} onClick={()=>togglePombo(p)}
                      style={{display:'flex',alignItems:'center',gap:7,padding:'8px 10px',background:isSel?`${cor}10`:T.surface,border:`1.5px solid ${isSel?cor:T.s2}`,borderRadius:8,cursor:'pointer',transition:'all .15s'}}>
                      <div style={{width:24,height:24,borderRadius:5,background:`${cor}15`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"Georgia,serif",fontSize:8,fontWeight:900,color:cor,flexShrink:0}}>{p.anilha?.slice(-3)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:600,color:isSel?cor:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</div>
                      </div>
                      {isSel&&<div style={{width:14,height:14,borderRadius:'50%',background:cor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'#fff',flexShrink:0}}>✓</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Preview do ganho */}
            {tipoSel&&diasSel.length>0&&(()=>{
              const tipo=TIPOS_TREINO.find(t=>t.id===tipoSel)
              const mult=temTreinador?1.2:1.0
              const ganhoSem=+(tipo.ganho*mult*diasSel.length/7).toFixed(1)
              const fadigaSem=Math.round(tipo.fadiga*diasSel.length/7)
              return(
                <div style={{padding:'12px 14px',background:`${tipo.cor}08`,border:`1px solid ${tipo.cor}20`,borderRadius:10,position:'relative',overflow:'hidden'}}>
                  <GL/>
                  <div style={{fontSize:9,color:tipo.cor,fontWeight:700,marginBottom:6}}>PREVISÃO SEMANAL</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,textAlign:'center'}}>
                    <div><div style={{fontSize:15,fontWeight:700,color:T.success}}>+{ganhoSem}</div><div style={{fontSize:8,color:T.muted}}>{tipo.attrMelhora.toUpperCase().slice(0,6)}</div></div>
                    <div><div style={{fontSize:15,fontWeight:700,color:fadigaSem>0?T.danger:T.success}}>{fadigaSem>0?'+':''}{fadigaSem}</div><div style={{fontSize:8,color:T.muted}}>FADIGA</div></div>
                    <div><div style={{fontSize:15,fontWeight:700,color:T.gold}}>×{mult}</div><div style={{fontSize:8,color:T.muted}}>MULT.</div></div>
                  </div>
                </div>
              )
            })()}

            <button onClick={aplicarPlano} disabled={!tipoSel||!diasSel.length}
              style={{width:'100%',padding:'14px',borderRadius:12,border:'none',background:tipoSel&&diasSel.length?`linear-gradient(135deg,${T.gold},#A07830)`:T.s2,color:tipoSel&&diasSel.length?'#050A14':T.muted,fontSize:13,fontWeight:800,cursor:tipoSel&&diasSel.length?'pointer':'default',fontFamily:'inherit',boxShadow:tipoSel&&diasSel.length?`0 4px 16px ${T.gold}30`:'none'}}>
              ✅ Aplicar Plano
            </button>
          </div>
        )}

        {/* PROGRESSO */}
        {tab==='progresso'&&(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {pombosActivos.length===0?(
              <div style={{textAlign:'center',padding:'40px',color:T.muted}}>Sem pombos activos</div>
            ):pombosActivos.map(p=>{
              const cor=p.sexo==='F'?'#C084FC':T.blue
              const attrs=p.atributos||{}
              const mainAttrs=['velocidade','resistencia','orientacao','coragem']
              return(
                <div key={p.id} style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:12,padding:'14px',position:'relative',overflow:'hidden'}}>
                  <GL/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{width:32,height:32,borderRadius:7,background:`${cor}15`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"Georgia,serif",fontSize:10,fontWeight:900,color:cor}}>{p.anilha?.slice(-3)}</div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:T.text}}>{p.nome}</div>
                        <div style={{fontSize:9,color:T.muted}}>Forma: {p.forma_atual||70}% · Fadiga: {p.fadiga||0}%</div>
                      </div>
                    </div>
                    <div style={{fontSize:11,color:T.gold,fontWeight:700}}>Pot. {attrs.potencial_revelado||0}% rev.</div>
                  </div>
                  {mainAttrs.map(k=>{
                    const LABELS={velocidade:'VEL',resistencia:'RES',orientacao:'ORI',coragem:'COR'}
                    const val=attrs[k]||0
                    const cor2=val>=80?T.success:val>=65?T.blue:val>=50?T.gold:T.danger
                    return(
                      <div key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0'}}>
                        <div style={{width:28,fontSize:8,color:T.muted,fontWeight:600}}>{LABELS[k]}</div>
                        <div style={{flex:1,height:5,background:'rgba(255,255,255,.05)',borderRadius:3,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${val}%`,background:cor2,borderRadius:3,boxShadow:`0 0 4px ${cor2}50`}}/>
                        </div>
                        <div style={{width:22,fontSize:10,fontWeight:700,color:cor2,textAlign:'right'}}>{val}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
