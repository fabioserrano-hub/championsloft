// src/modules/virtualLoft/screens/VLPombos.jsx — Design Premium
import { useState } from 'react'

const T={bg:'#050A14',surface:'#0D1829',surface2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171'}

const ATTR_GRUPOS=[
  {key:'fisico',   label:'Físico',     cor:'#4FC3F7', attrs:['velocidade','resistencia','recuperacao','forca']},
  {key:'mental',   label:'Mental',     cor:'#A855F7', attrs:['orientacao','inteligencia','instinto','coragem']},
  {key:'genetico', label:'Genético',   cor:'#C9A84C', attrs:['fertilidade','sangue']},
]
const ATTR_NAMES={velocidade:'Velocidade',resistencia:'Resistência',recuperacao:'Recuperação',forca:'Força',orientacao:'Orientação',inteligencia:'Inteligência',instinto:'Instinto',coragem:'Coragem',fertilidade:'Fertilidade',sangue:'Sangue'}

function corAttr(v){return v>=80?T.success:v>=65?T.blue:v>=45?T.gold:v>=30?'#FB923C':T.danger}
function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}

function GoldLine(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.7}}/>}

function BarraAttr({label,valor,oculto=false,cor}){
  const c=oculto?T.surface2:cor||corAttr(valor)
  return(
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0'}}>
      <div style={{width:76,fontSize:9,color:T.muted,fontWeight:500,letterSpacing:.3}}>{label.toUpperCase()}</div>
      <div style={{flex:1,height:5,background:'rgba(255,255,255,.05)',borderRadius:3,overflow:'hidden'}}>
        <div style={{height:'100%',width:oculto?'35%':`${valor}%`,background:oculto?`repeating-linear-gradient(45deg,${T.surface2},${T.surface2} 3px,${T.bg} 3px,${T.bg} 6px)`:c,borderRadius:3,transition:'width .6s ease'}}/>
      </div>
      <div style={{width:24,fontSize:11,fontWeight:700,color:oculto?T.surface2:c,textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{oculto?'?':valor}</div>
    </div>
  )
}

function FaseBadge({pombo}){
  const fases={ovo:{label:'🥚 Ovo',cor:'#94A3B8'},borrachinho:{label:'🐣 Nascido',cor:'#818CF8'},ninhego:{label:'🐤 Ninhego',cor:'#4FC3F7'},jovem:{label:'🐦 Jovem',cor:'#2DD4A7'},activo:{label:'🕊️ Adulto',cor:'#C9A84C'}}
  const f=fases[pombo.fase]||fases[pombo.estado]||fases.activo
  return <span style={{fontSize:9,color:f.cor,background:`${f.cor}15`,padding:'2px 6px',borderRadius:4,fontWeight:700}}>{f.label}</span>
}

function CardPombo({pombo,sel,onClick}){
  const isFemea=pombo.sexo==='F'
  const cor=isFemea?'#C084FC':T.blue
  const isActivo=pombo.estado==='activo'
  return(
    <div onClick={onClick} style={{background:sel?`${cor}10`:T.surface,border:`1px solid ${sel?cor:T.surface2}`,borderRadius:12,padding:'12px',cursor:'pointer',transition:'all .2s',transform:sel?'scale(1.02)':'scale(1)',position:'relative',overflow:'hidden'}}>
      {sel&&<GoldLine/>}
      <div style={{position:'absolute',top:8,right:8}}>
        <span style={{fontSize:11,color:cor,fontWeight:700}}>{pombo.sexo==='M'?'♂':'♀'}</span>
      </div>
      <div style={{width:44,height:44,borderRadius:10,background:`${cor}15`,border:`1.5px solid ${cor}30`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
        <span style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:900,color:cor}}>{pombo.anilha?.slice(-3)}</span>
      </div>
      <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pombo.nome}</div>
      <div style={{fontSize:9,color:T.muted,marginBottom:6}}>{pombo.anilha}</div>
      <div style={{display:'flex',gap:1,marginBottom:6}}>
        {Array.from({length:5}).map((_,i)=><div key={i} style={{fontSize:9,color:i<pombo.rating?T.gold:'rgba(255,255,255,.08)'}}>{i<pombo.rating?'★':'☆'}</div>)}
      </div>
      <div style={{fontSize:9,color:cor,fontWeight:600,marginBottom:4}}>{pombo.especialidade}</div>
      <FaseBadge pombo={pombo}/>
      {!isActivo&&<div style={{marginTop:6,fontSize:8,color:T.muted,fontStyle:'italic'}}>Em desenvolvimento</div>}
    </div>
  )
}

function DetalheModal({pombo,onFechar,historico,idioma}){
  const [tab,setTab]=useState('atributos')
  const isFemea=pombo.sexo==='F'
  const cor=isFemea?'#C084FC':T.blue
  const potRev=pombo.atributos?.potencial_revelado||0

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(5,10,20,.95)',zIndex:1000,overflow:'auto'}}>
      <div style={{background:T.bg,minHeight:'100vh',maxWidth:480,margin:'0 auto'}}>
        {/* Header modal */}
        <div style={{background:`linear-gradient(135deg,${cor}15,transparent)`,padding:'20px 16px 16px',borderBottom:`1px solid ${T.surface2}`,position:'relative'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${cor},transparent)`}}/>
          <button onClick={onFechar} style={{position:'absolute',top:14,right:14,background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:8,width:32,height:32,color:T.muted,cursor:'pointer',fontSize:14}}>✕</button>
          <div style={{display:'flex',gap:14,alignItems:'center'}}>
            <div style={{width:60,height:60,borderRadius:14,background:`${cor}15`,border:`2px solid ${cor}40`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,color:cor}}>{pombo.anilha?.slice(-3)}</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:19,fontWeight:900,color:T.text,letterSpacing:-.3}}>{pombo.nome}</div>
              <div style={{display:'flex',gap:6,alignItems:'center',marginTop:3}}>
                <span style={{fontSize:10,color:T.muted}}>{pombo.sexo==='M'?'♂':'♀'} · {pombo.anilha} · {pombo.ano}</span>
              </div>
              <div style={{display:'flex',gap:1,marginTop:4}}>
                {Array.from({length:5}).map((_,i)=><div key={i} style={{fontSize:12,color:i<pombo.rating?T.gold:'rgba(255,255,255,.08)'}}>{i<pombo.rating?'★':'☆'}</div>)}
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10}}>
            <span style={{padding:'3px 8px',background:`${cor}15`,border:`1px solid ${cor}30`,borderRadius:5,fontSize:9,color:cor,fontWeight:700}}>{pombo.especialidade}</span>
            {(pombo.personalidade||[]).map((p,i)=><span key={i} style={{padding:'3px 8px',background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:5,fontSize:9,color:T.muted}}>{p}</span>)}
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:`1px solid ${T.surface2}`}}>
          {[['atributos','Atributos'],['info','Info'],['historial','Historial']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:'12px 8px',background:'none',border:'none',borderBottom:tab===id?`2px solid ${cor}`:'2px solid transparent',color:tab===id?cor:T.muted,fontSize:11,fontWeight:tab===id?700:400,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
              {label}
            </button>
          ))}
        </div>

        <div style={{padding:'16px'}}>
          {/* ATRIBUTOS */}
          {tab==='atributos'&&(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {/* Potencial oculto */}
              <div style={{padding:'12px 14px',background:`rgba(201,168,76,.06)`,border:'1px solid rgba(201,168,76,.15)',borderRadius:10,position:'relative',overflow:'hidden'}}>
                <GoldLine/>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.gold}}>🔮 Potencial Oculto</div>
                  <div style={{fontSize:10,color:T.gold,fontWeight:700}}>{potRev}% revelado</div>
                </div>
                <div style={{height:5,background:'rgba(255,255,255,.06)',borderRadius:3}}>
                  <div style={{height:'100%',width:`${potRev}%`,background:'linear-gradient(90deg,#C9A84C,#FB923C)',borderRadius:3}}/>
                </div>
                <div style={{fontSize:9,color:T.muted,marginTop:6}}>Treina e compete para revelar o potencial</div>
              </div>

              {ATTR_GRUPOS.map(g=>(
                <div key={g.key}>
                  <div style={{fontSize:8,color:g.cor,fontWeight:700,letterSpacing:1.5,marginBottom:8}}>{g.label.toUpperCase()}</div>
                  {g.attrs.map(a=>(
                    <BarraAttr key={a} label={ATTR_NAMES[a]||a} valor={pombo.atributos?.[a]||0} oculto={potRev<30&&['instinto','sangue'].includes(a)} cor={g.cor}/>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* INFO */}
          {tab==='info'&&(
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {[
                ['Nome',pombo.nome],['Anilha',pombo.anilha],['Sexo',pombo.sexo==='M'?'Macho':'Fêmea'],
                ['Ano',pombo.ano],['Especialidade',pombo.especialidade],
                ['Rating','★'.repeat(pombo.rating)+'☆'.repeat(5-pombo.rating)],
                ['Valor',`${(pombo.valor||0).toLocaleString()}€`],
                ['Provas',pombo.provas||0],['Vitórias',pombo.vitorias||0],
                ['Percentil médio',`${pombo.percentil_medio||0}%`],
              ].map(([l,v],i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${T.surface2}`}}>
                  <span style={{fontSize:11,color:T.muted}}>{l}</span>
                  <span style={{fontSize:11,fontWeight:600,color:T.text}}>{v}</span>
                </div>
              ))}
              {/* Genealogia */}
              <div style={{marginTop:12}}>
                <div style={{fontSize:8,color:T.blue,fontWeight:700,letterSpacing:1.5,marginBottom:10}}>GENEALOGIA</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[['Pai','♂',pombo.pai_nome],['Mãe','♀',pombo.mae_nome]].map(([role,sex,nome],i)=>(
                    <div key={i} style={{padding:'10px',background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:8,textAlign:'center'}}>
                      <div style={{fontSize:9,color:T.muted,marginBottom:4}}>{sex} {role}</div>
                      <div style={{fontSize:11,color:nome?T.text:T.surface2,fontWeight:600}}>{nome||'Desconhecido'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* HISTORIAL */}
          {tab==='historial'&&(
            historico?.length>0?(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[...historico].reverse().map((r,i)=>(
                  <div key={i} style={{padding:'10px 14px',background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <div style={{fontSize:12,fontWeight:700,color:T.text}}>{r.provaNome}</div>
                      <div style={{fontSize:13,fontWeight:800,color:r.posicao<=3?T.gold:T.muted}}>{r.posicao}º/{r.total}</div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <div style={{fontSize:9,color:T.muted}}>Sem. {r.semana}</div>
                      <div style={{fontSize:10,color:T.success,fontWeight:700}}>P{r.percentil}%</div>
                    </div>
                  </div>
                ))}
              </div>
            ):(
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:32,marginBottom:12}}>📋</div>
                <div style={{fontSize:13,color:T.muted}}>Sem provas ainda</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default function VLPombos({carreira,onVoltar,onGuardar,idioma='pt'}){
  const [carreiraLocal,setCarreiraLocal]=useState(()=>lerLS()||carreira)
  const c=carreiraLocal
  const salvarLocal=(d)=>{gravarLS(d);setCarreiraLocal({...d});onGuardar?.(d)}

  const [filtro,setFiltro]=useState('activos')
  const [ordenar,setOrdenar]=useState('rating')
  const [sel,setSel]=useState(null)
  const [pesquisa,setPesquisa]=useState('')
  const [comparar,setComparar]=useState([])

  const todosOsPombos=c.pombos||[]
  const pombos=todosOsPombos
    .filter(p=>{
      if(pesquisa&&!p.nome?.toLowerCase().includes(pesquisa.toLowerCase())&&!p.anilha?.includes(pesquisa))return false
      if(filtro==='activos')return p.estado==='activo'
      if(filtro==='M')return p.sexo==='M'&&p.estado==='activo'
      if(filtro==='F')return p.sexo==='F'&&p.estado==='activo'
      if(filtro==='jovens')return p.estado!=='activo'
      return true
    })
    .sort((a,b)=>ordenar==='rating'?(b.rating||0)-(a.rating||0):ordenar==='nome'?a.nome?.localeCompare(b.nome||'')||0:(b.valor||0)-(a.valor||0))

  const pomboSel=sel?todosOsPombos.find(p=>p.id===sel):null
  const historicoPombo=pomboSel?(c.historico_provas||[]).filter(r=>r.pomboId===pomboSel.id):[]

  const activos=todosOsPombos.filter(p=>p.estado==='activo').length
  const jovens=todosOsPombos.filter(p=>p.estado!=='activo').length

  return(
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:"'Inter',system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(180deg,${T.surface},${T.bg})`,borderBottom:`1px solid ${T.surface2}`,padding:'14px 16px',position:'relative'}}>
        <GoldLine/>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <button onClick={onVoltar} style={{background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:8,width:32,height:32,color:T.muted,cursor:'pointer',fontSize:16}}>←</button>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:T.text}}>🐦 Pombos</div>
            <div style={{fontSize:9,color:T.muted}}>{activos} activos · {jovens} em desenvolvimento</div>
          </div>
        </div>
        {/* Pesquisa */}
        <input value={pesquisa} onChange={e=>setPesquisa(e.target.value)}
          placeholder="Pesquisar nome ou anilha..."
          style={{width:'100%',padding:'9px 12px',background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:8,color:T.text,fontSize:12,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
      </div>

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:12}}>
        {/* Filtros */}
        <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none',paddingBottom:2}}>
          {[['activos','Activos'],['M','♂ Machos'],['F','♀ Fêmeas'],['jovens','Jovens'],['todos','Todos']].map(([id,label])=>(
            <button key={id} onClick={()=>setFiltro(id)}
              style={{flex:'none',padding:'7px 12px',borderRadius:8,border:filtro===id?'none':`1px solid ${T.surface2}`,background:filtro===id?`linear-gradient(135deg,${T.blue}33,${T.blue}11)`:'transparent',color:filtro===id?T.blue:T.muted,fontSize:11,fontWeight:filtro===id?700:400,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {label}
            </button>
          ))}
          <select value={ordenar} onChange={e=>setOrdenar(e.target.value)}
            style={{flex:'none',padding:'7px 10px',borderRadius:8,border:`1px solid ${T.surface2}`,background:T.surface,color:T.muted,fontSize:11,fontFamily:'inherit',cursor:'pointer',outline:'none'}}>
            <option value="rating">Por Rating</option>
            <option value="nome">Por Nome</option>
            <option value="valor">Por Valor</option>
          </select>
        </div>

        {/* Grid */}
        {pombos.length===0?(
          <div style={{textAlign:'center',padding:'40px 20px'}}>
            <div style={{fontSize:40,marginBottom:12}}>🐦</div>
            <div style={{fontSize:13,color:T.muted}}>Nenhum pombo encontrado</div>
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
            {pombos.map(p=>(
              <CardPombo key={p.id} pombo={p} sel={sel===p.id} onClick={()=>setSel(sel===p.id?null:p.id)}/>
            ))}
          </div>
        )}

        {/* Resumo */}
        <div style={{background:T.surface,border:`1px solid ${T.surface2}`,borderRadius:10,padding:'12px 14px',position:'relative',overflow:'hidden'}}>
          <GoldLine/>
          <div style={{fontSize:8,color:T.blue,fontWeight:700,letterSpacing:1.5,marginBottom:8}}>RESUMO DO PLANTEL</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,textAlign:'center'}}>
            {[
              {label:'Machos',n:todosOsPombos.filter(p=>p.sexo==='M'&&p.estado==='activo').length,cor:T.blue},
              {label:'Fêmeas',n:todosOsPombos.filter(p=>p.sexo==='F'&&p.estado==='activo').length,cor:'#C084FC'},
              {label:'★★★★+',n:todosOsPombos.filter(p=>p.rating>=4).length,cor:T.gold},
            ].map((s,i)=>(
              <div key={i}>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:900,color:s.cor}}>{s.n}</div>
                <div style={{fontSize:8,color:T.muted,fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal detalhe */}
      {pomboSel&&<DetalheModal pombo={pomboSel} onFechar={()=>setSel(null)} historico={historicoPombo} idioma={idioma}/>}
    </div>
  )
}
