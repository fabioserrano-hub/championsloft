// src/modules/virtualLoft/screens/VLNinhadas.jsx — V3 Genética profunda
import { useState } from 'react'

const T={bg:'#050A14',surface:'#0D1829',s2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171',purple:'#A855F7',orange:'#FB923C'}
function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}
function GL(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.8}}/>}

export function actualizarFasesCria(carreira){
  const dia=carreira.dia||1
  const pombos=(carreira.pombos||[]).map(p=>{
    if(!p.fase||p.fase==='adulto'||p.estado==='activo')return p
    const diasDesde=dia-(p.dia_postura||0)
    if(diasDesde>=77)return{...p,estado:'activo',fase:'adulto'}
    if(diasDesde>=49)return{...p,estado:'jovem',fase:'jovem'}
    if(diasDesde>=21)return{...p,estado:'ninhego',fase:'ninhego'}
    if(diasDesde>=14)return{...p,estado:'borrachinho',fase:'nascido'}
    return p
  })
  return{...carreira,pombos}
}

const FASES=[
  {id:'ovo',      icon:'🥚', label:'Ovo',       dias:'0-14',   cor:'#94A3B8', desc:'Incubação. Os pais revezam-se a aquecer os ovos.'},
  {id:'nascido',  icon:'🐣', label:'Nascido',   dias:'14-21',  cor:'#818CF8', desc:'Acabou de eclodir. Totalmente dependente dos pais.'},
  {id:'ninhego',  icon:'🐤', label:'Ninhego',   dias:'21-49',  cor:'#4FC3F7', desc:'Crescimento rápido. Desenvolve plumagem e musculatura.'},
  {id:'jovem',    icon:'🐦', label:'Jovem',     dias:'49-77',  cor:'#2DD4A7', desc:'Primeiros voos. Personalidade a desenvolver-se.'},
  {id:'adulto',   icon:'🕊️', label:'Adulto',    dias:'77+',    cor:'#C9A84C', desc:'Pronto para treino e competição.'},
]

const NOMES_CRIA=['Relâmpago','Trovão','Brisa','Aurora','Eclipse','Cometa','Estrela','Falcão','Titan','Orion','Vega','Atlas','Zeus','Apolo','Marte','Mercúrio','Diana','Ares','Hera','Nike']
const GENES_RAROS=['Linha Campeã','Mutação Velocista','Sangue Puro','Gene Olímpico','Resistência Infinita','Orientador Nato']

function g(base,std=12){return Math.min(99,Math.max(1,Math.round(base+(Math.random()-.5)*2*std)))}

function herdarAtributos(paiA,maeA,temGeneticista){
  const herdar=(a,b)=>{
    const base=(a+b)/2
    const variacao=(Math.random()-.5)*24
    const mutacao=Math.random()<0.06?(Math.random()-.5)*30:0
    return Math.min(99,Math.max(1,Math.round(base+variacao+mutacao)))
  }
  const temGR=Math.random()<(temGeneticista?0.12:0.06)
  return{
    velocidade:herdar(paiA.velocidade||50,maeA.velocidade||50),
    resistencia:herdar(paiA.resistencia||50,maeA.resistencia||50),
    orientacao:herdar(paiA.orientacao||50,maeA.orientacao||50),
    coragem:herdar(paiA.coragem||50,maeA.coragem||50),
    recuperacao:herdar(paiA.recuperacao||50,maeA.recuperacao||50),
    inteligencia:herdar(paiA.inteligencia||50,maeA.inteligencia||50),
    instinto:herdar(paiA.instinto||50,maeA.instinto||50),
    forca:herdar(paiA.forca||50,maeA.forca||50),
    fertilidade:herdar(paiA.fertilidade||50,maeA.fertilidade||50),
    sangue:herdar(paiA.sangue||50,maeA.sangue||50),
    potencial_revelado:temGeneticista?15:0,
    potencial_maximo:g((paiA.potencial_maximo||70+maeA.potencial_maximo||70)/2,15),
    gene_raro_tipo:temGR?GENES_RAROS[Math.floor(Math.random()*GENES_RAROS.length)]:null,
  }
}

function calcCompatibilidade(pai,mae){
  const aP=pai.atributos||{}, aM=mae.atributos||{}
  const mediaP=(aP.velocidade||50+aP.resistencia||50+aP.orientacao||50)/3
  const mediaM=(aM.velocidade||50+aM.resistencia||50+aM.orientacao||50)/3
  const mediaFilho=(mediaP+mediaM)/2
  // Compatibilidade: especialidade + diversidade genética + potencial
  const espBonus=pai.especialidade===mae.especialidade?10:5
  const potBonus=((aP.potencial_maximo||70)+(aM.potencial_maximo||70))/2-60
  const score=Math.min(99,Math.max(1,Math.round(mediaFilho+espBonus+potBonus/3)))
  return{
    score,
    label:score>=80?'Excelente':score>=65?'Boa':score>=50?'Razoável':'Baixa',
    cor:score>=80?T.success:score>=65?T.blue:score>=50?T.gold:T.danger,
    prevVelocidade:Math.round((aP.velocidade||50+aM.velocidade||50)/2),
    prevResistencia:Math.round((aP.resistencia||50+aM.resistencia||50)/2),
    prevOrientacao:Math.round((aP.orientacao||50+aM.orientacao||50)/2),
    chanceGeneRaro:pai.atributos?.gene_raro_tipo||mae.atributos?.gene_raro_tipo?'Alta (15%)':'Normal (6%)',
  }
}

export default function VLNinhadas({carreira,onVoltar,onGuardar}){
  const [cl,setCL]=useState(()=>lerLS()||carreira)
  const c=cl
  const salvar=d=>{gravarLS(d);setCL({...d});onGuardar?.(d)}

  const [tab,setTab]=useState('criar')
  const [paiSel,setPaiSel]=useState(null)
  const [maeSel,setMaeSel]=useState(null)
  const [msg,setMsg]=useState(null)

  const diaAtual=c.dia||1
  const temGeneticista=(c.staff||[]).some(s=>s.tipo==='geneticista')
  const temVet=(c.staff||[]).some(s=>s.tipo==='veterinario')
  const pombosActivos=(c.pombos||[]).filter(p=>p.estado==='activo')
  const machos=pombosActivos.filter(p=>p.sexo==='M')
  const femeas=pombosActivos.filter(p=>p.sexo==='F')
  const emDesenvolvimento=(c.pombos||[]).filter(p=>p.fase&&p.estado!=='activo')

  const showMsg=(texto,tipo='ok')=>{setMsg({texto,tipo});setTimeout(()=>setMsg(null),4000)}

  const criarNinhada=()=>{
    if(!paiSel||!maeSel)return
    const pai=pombosActivos.find(p=>p.id===paiSel)
    const mae=pombosActivos.find(p=>p.id===maeSel)
    if(!pai||!mae)return

    const filhos=Array.from({length:2},(_,i)=>{
      const attrs=herdarAtributos(pai.atributos||{},mae.atributos||{},temGeneticista)
      const sexo=Math.random()>.5?'M':'F'
      const espIdx=Math.random()<0.7?pai.esp_idx??0:Math.floor(Math.random()*4)
      const ESPS=['Velocidade','Meio-Fundo','Fundo','Grande Fundo']
      const rating=Math.round(((pai.rating||3)+(mae.rating||3))/2+(Math.random()>.7?1:-1)*Math.floor(Math.random()*2))
      const nome=NOMES_CRIA[Math.floor(Math.random()*NOMES_CRIA.length)]
      const ano=(new Date().getFullYear()+Math.floor((diaAtual-1)/280))
      return{
        id:`p_${Date.now()}_${i}`,
        nome,
        anilha:`PT-${ano}-${Math.floor(Math.random()*900000+100000)}`,
        sexo,ano,
        especialidade:ESPS[espIdx],esp_idx:espIdx,
        personalidade:['Calmo'],
        personalidade_tipo:['guerreiro','calmo','competitivo','inteligente','resistente','lider','determinado'][Math.floor(Math.random()*7)],
        temperamento:['Dócil','Activo','Curioso','Reservado','Sociável','Independente'][Math.floor(Math.random()*6)],
        motivacao:['Competição','Liberdade','Território','Social','Conquista','Exploração'][Math.floor(Math.random()*6)],
        atributos:attrs,
        rating:Math.min(5,Math.max(1,rating)),
        estado:'ovo',fase:'ovo',
        dia_postura:diaAtual,
        forma_atual:50,fadiga:0,
        provas:0,vitorias:0,percentil_medio:0,
        valor:Math.round((rating*400+Math.random()*800)),
        pai_id:pai.id,mae_id:mae.id,pai_nome:pai.nome,mae_nome:mae.nome,
        historico_provas:[],historico_treinos:[],
      }
    })

    const ninhada={
      id:`n_${Date.now()}`,
      pai_id:pai.id,mae_id:mae.id,pai_nome:pai.nome,mae_nome:mae.nome,
      dia_inicio:diaAtual,filhos_ids:filhos.map(f=>f.id),
      num_filhos:filhos.length,
    }

    const novaCarreira={
      ...c,
      pombos:[...(c.pombos||[]),...filhos],
      ninhadas_virtuais:[...(c.ninhadas_virtuais||[]),ninhada],
    }
    salvar(novaCarreira)
    setPaiSel(null);setMaeSel(null)
    showMsg(`Ninhada criada! 2 ovos postos por ${pai.nome} × ${mae.nome}`)
    setTab('acompanhar')
  }

  const compat=paiSel&&maeSel?calcCompatibilidade(
    pombosActivos.find(p=>p.id===paiSel)||{},
    pombosActivos.find(p=>p.id===maeSel)||{}
  ):null

  const sugestaoGeneticista=temGeneticista&&machos.length&&femeas.length?(()=>{
    let melhorScore=0,melhorPar=null
    machos.slice(0,5).forEach(m=>femeas.slice(0,5).forEach(f=>{
      const s=calcCompatibilidade(m,f).score
      if(s>melhorScore){melhorScore=s;melhorPar={pai:m,mae:f,score:s}}
    }))
    return melhorPar
  })():null

  return(
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:`linear-gradient(180deg,${T.surface},${T.bg})`,borderBottom:`1px solid ${T.s2}`,padding:'14px 16px',position:'relative'}}>
        <GL/>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <button onClick={onVoltar} style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:8,width:32,height:32,color:T.muted,cursor:'pointer',fontSize:16}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800}}>🥚 Ninhadas</div>
            <div style={{fontSize:9,color:T.muted}}>
              {emDesenvolvimento.length} em desenvolvimento
              {temGeneticista&&<span style={{color:T.purple}}> · 🧬 Geneticista activo</span>}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[['criar','Cruzar'],['acompanhar','Acompanhar'],['historico','Historial']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:'none',padding:'7px 11px',borderRadius:8,border:tab===id?'none':`1px solid ${T.s2}`,background:tab===id?`${T.purple}20`:'transparent',color:tab===id?T.purple:T.muted,fontSize:10,fontWeight:tab===id?700:400,cursor:'pointer',fontFamily:'inherit'}}>
              {label}{id==='acompanhar'&&emDesenvolvimento.length>0?` (${emDesenvolvimento.length})`:''}
            </button>
          ))}
        </div>
      </div>

      {msg&&<div style={{margin:'10px 16px 0',padding:'10px 14px',background:msg.tipo==='ok'?`${T.success}10`:`${T.danger}10`,border:`1px solid ${msg.tipo==='ok'?T.success:T.danger}30`,borderRadius:10,fontSize:12,color:msg.tipo==='ok'?T.success:T.danger,fontWeight:600}}>✅ {msg.texto}</div>}

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:12}}>

        {/* CRIAR NINHADA */}
        {tab==='criar'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Sugestão geneticista */}
            {sugestaoGeneticista&&(
              <div style={{padding:'12px 14px',background:`${T.purple}08`,border:`1px solid ${T.purple}25`,borderRadius:12,position:'relative',overflow:'hidden'}}>
                <GL/>
                <div style={{fontSize:10,fontWeight:700,color:T.purple,marginBottom:6}}>🧬 Sugestão do Geneticista</div>
                <div style={{fontSize:12,color:T.text,marginBottom:4}}>{sugestaoGeneticista.pai.nome} × {sugestaoGeneticista.mae.nome}</div>
                <div style={{fontSize:10,color:T.muted,marginBottom:8}}>Compatibilidade: <span style={{color:T.success,fontWeight:700}}>{sugestaoGeneticista.score}%</span> — par ideal detectado!</div>
                <button onClick={()=>{setPaiSel(sugestaoGeneticista.pai.id);setMaeSel(sugestaoGeneticista.mae.id)}}
                  style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${T.purple}30`,background:`${T.purple}15`,color:T.purple,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  Usar este par ✓
                </button>
              </div>
            )}

            {/* Selecção de pai */}
            <div>
              <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>SELECCIONAR PAI ♂</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:5}}>
                {machos.map(p=>{
                  const isSel=paiSel===p.id
                  return(
                    <div key={p.id} onClick={()=>setPaiSel(isSel?null:p.id)}
                      style={{padding:'10px',background:isSel?`${T.blue}10`:T.surface,border:`${isSel?2:1}px solid ${isSel?T.blue:T.s2}`,borderRadius:10,cursor:'pointer',transition:'all .15s',position:'relative',overflow:'hidden'}}>
                      {isSel&&<GL/>}
                      <div style={{fontSize:12,fontWeight:700,color:isSel?T.blue:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</div>
                      <div style={{fontSize:9,color:T.muted}}>{p.especialidade}</div>
                      <div style={{display:'flex',gap:1,marginTop:3}}>
                        {Array.from({length:5}).map((_,i)=><span key={i} style={{fontSize:8,color:i<p.rating?T.gold:'rgba(255,255,255,.1)'}}>{i<p.rating?'★':'☆'}</span>)}
                      </div>
                      {p.atributos?.gene_raro_tipo&&<div style={{fontSize:8,color:T.gold,marginTop:2}}>💎 Gene Raro</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Selecção de mãe */}
            <div>
              <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>SELECCIONAR MÃE ♀</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:5}}>
                {femeas.map(p=>{
                  const isSel=maeSel===p.id
                  return(
                    <div key={p.id} onClick={()=>setMaeSel(isSel?null:p.id)}
                      style={{padding:'10px',background:isSel?`${'#C084FC'}10`:T.surface,border:`${isSel?2:1}px solid ${isSel?'#C084FC':T.s2}`,borderRadius:10,cursor:'pointer',transition:'all .15s',position:'relative',overflow:'hidden'}}>
                      {isSel&&<GL/>}
                      <div style={{fontSize:12,fontWeight:700,color:isSel?'#C084FC':T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</div>
                      <div style={{fontSize:9,color:T.muted}}>{p.especialidade}</div>
                      <div style={{display:'flex',gap:1,marginTop:3}}>
                        {Array.from({length:5}).map((_,i)=><span key={i} style={{fontSize:8,color:i<p.rating?T.gold:'rgba(255,255,255,.1)'}}>{i<p.rating?'★':'☆'}</span>)}
                      </div>
                      {p.atributos?.gene_raro_tipo&&<div style={{fontSize:8,color:T.gold,marginTop:2}}>💎 Gene Raro</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Análise de compatibilidade */}
            {compat&&(
              <div style={{padding:'14px',background:`${compat.cor}08`,border:`1px solid ${compat.cor}25`,borderRadius:12,position:'relative',overflow:'hidden'}}>
                <GL/>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.text}}>
                    {pombosActivos.find(p=>p.id===paiSel)?.nome} × {pombosActivos.find(p=>p.id===maeSel)?.nome}
                  </div>
                  <div style={{textAlign:'center',background:`${compat.cor}15`,border:`1px solid ${compat.cor}30`,borderRadius:8,padding:'6px 12px'}}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,color:compat.cor}}>{compat.score}%</div>
                    <div style={{fontSize:8,color:compat.cor,fontWeight:700}}>{compat.label.toUpperCase()}</div>
                  </div>
                </div>
                <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:6}}>PREVISÃO GENÉTICA DOS FILHOS</div>
                {[
                  {l:'Velocidade',v:compat.prevVelocidade},
                  {l:'Resistência',v:compat.prevResistencia},
                  {l:'Orientação',v:compat.prevOrientacao},
                ].map((s,i)=>{
                  const cor=s.v>=70?T.success:s.v>=55?T.blue:T.gold
                  return(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0'}}>
                      <div style={{width:70,fontSize:9,color:T.muted}}>{s.l}</div>
                      <div style={{flex:1,height:5,background:'rgba(255,255,255,.05)',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${s.v}%`,background:cor,borderRadius:3}}/></div>
                      <div style={{width:22,fontSize:10,fontWeight:700,color:cor}}>{s.v}</div>
                    </div>
                  )
                })}
                <div style={{marginTop:8,fontSize:10,color:T.gold}}>
                  💎 Chance gene raro: {compat.chanceGeneRaro}
                  {temGeneticista&&' (geneticista activo: +2×)'}
                </div>
              </div>
            )}

            <button onClick={criarNinhada} disabled={!paiSel||!maeSel}
              style={{width:'100%',padding:'14px',borderRadius:12,border:'none',background:paiSel&&maeSel?`linear-gradient(135deg,${T.purple},#7C3AED)`:T.s2,color:paiSel&&maeSel?'#fff':T.muted,fontSize:13,fontWeight:800,cursor:paiSel&&maeSel?'pointer':'default',fontFamily:'inherit',boxShadow:paiSel&&maeSel?`0 4px 16px ${T.purple}30`:'none'}}>
              🥚 Criar Ninhada (2 ovos)
            </button>
          </div>
        )}

        {/* ACOMPANHAR */}
        {tab==='acompanhar'&&(
          emDesenvolvimento.length===0?(
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12}}>🥚</div>
              <div style={{fontSize:13,color:T.muted}}>Sem ninhadas em desenvolvimento</div>
            </div>
          ):emDesenvolvimento.map(p=>{
            const diasDesde=diaAtual-(p.dia_postura||0)
            const fase=FASES.find(f=>f.id===(p.fase||'ovo'))||FASES[0]
            const proxFase=FASES[FASES.indexOf(fase)+1]
            const diasProxFase=proxFase?[0,14,21,49,77][FASES.indexOf(fase)+1]-diasDesde:0
            const pct=Math.min(100,Math.round((diasDesde/77)*100))
            const temGeneRaro=p.atributos?.gene_raro_tipo
            return(
              <div key={p.id} style={{background:T.surface,border:`1px solid ${fase.cor}25`,borderRadius:14,padding:'14px',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:fase.cor}}/>
                {/* Header */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                      <span style={{fontSize:24}}>{fase.icon}</span>
                      <div>
                        <div style={{fontSize:14,fontWeight:800,color:T.text}}>{p.nome}</div>
                        <div style={{fontSize:9,color:fase.cor,fontWeight:700}}>{fase.label.toUpperCase()} · Dia {diasDesde}</div>
                      </div>
                    </div>
                    <div style={{fontSize:9,color:T.muted}}>♂ {p.pai_nome||'?'} × ♀ {p.mae_nome||'?'}</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:900,color:fase.cor}}>{pct}%</div>
                    <div style={{fontSize:7,color:T.muted,fontWeight:700}}>PARA ADULTO</div>
                  </div>
                </div>
                {/* Barra de crescimento */}
                <div style={{marginBottom:10}}>
                  <div style={{height:8,background:'rgba(255,255,255,.05)',borderRadius:4,overflow:'hidden',position:'relative'}}>
                    {/* Markers das fases */}
                    {[14,21,49,77].map((d,i)=>(
                      <div key={i} style={{position:'absolute',left:`${(d/77)*100}%`,top:0,bottom:0,width:1,background:'rgba(255,255,255,.15)'}}/>
                    ))}
                    <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${T.purple},${fase.cor})`,borderRadius:4,transition:'width .5s'}}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                    {FASES.slice(0,4).map((f,i)=>(
                      <span key={i} style={{fontSize:7,color:f.id===fase.id?f.cor:T.s2,fontWeight:f.id===fase.id?700:400}}>{f.icon}</span>
                    ))}
                    <span style={{fontSize:7,color:T.gold}}>🕊️</span>
                  </div>
                </div>
                {/* Descrição da fase */}
                <div style={{fontSize:10,color:T.muted,fontStyle:'italic',marginBottom:8}}>{fase.desc}</div>
                {/* Próxima fase */}
                {proxFase&&diasProxFase>0&&(
                  <div style={{padding:'6px 10px',background:`${proxFase.cor}08`,border:`1px solid ${proxFase.cor}20`,borderRadius:6,fontSize:9,color:proxFase.cor}}>
                    {proxFase.icon} {proxFase.label} em {diasProxFase} dia{diasProxFase>1?'s':''}
                  </div>
                )}
                {/* Gene raro */}
                {temGeneRaro&&(
                  <div style={{marginTop:8,padding:'6px 10px',background:`${T.gold}08`,border:`1px solid ${T.gold}25`,borderRadius:6,fontSize:9,color:T.gold,fontWeight:700}}>
                    💎 Gene Raro detectado: {p.atributos.gene_raro_tipo}
                  </div>
                )}
                {/* Atributos previstos */}
                <div style={{marginTop:8,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4}}>
                  {['velocidade','resistencia','orientacao'].map(k=>{
                    const val=p.atributos?.[k]||50
                    const NOMES={velocidade:'VEL',resistencia:'RES',orientacao:'ORI'}
                    const cor=val>=70?T.success:val>=55?T.blue:T.gold
                    return(
                      <div key={k} style={{padding:'6px',background:T.s2,borderRadius:6,textAlign:'center'}}>
                        <div style={{fontSize:12,fontWeight:700,color:cor}}>{val}</div>
                        <div style={{fontSize:7,color:T.muted}}>{NOMES[k]}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        {/* HISTORIAL */}
        {tab==='historico'&&(
          (c.ninhadas_virtuais||[]).length===0?(
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12}}>📋</div>
              <div style={{fontSize:13,color:T.muted}}>Sem historial de ninhadas</div>
            </div>
          ):[...(c.ninhadas_virtuais||[])].reverse().map((n,i)=>(
            <div key={i} style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:10,padding:'12px 14px',position:'relative',overflow:'hidden'}}>
              <GL/>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <div style={{fontSize:12,fontWeight:700,color:T.text}}>🥚 {n.pai_nome} × {n.mae_nome}</div>
                <div style={{fontSize:9,color:T.muted}}>Dia {n.dia_inicio}</div>
              </div>
              <div style={{fontSize:10,color:T.muted}}>{n.num_filhos||2} filhos · IDs: {(n.filhos_ids||[]).length} registados</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
