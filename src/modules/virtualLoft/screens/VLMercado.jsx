// src/modules/virtualLoft/screens/VLMercado.jsx — V2 Mercado vivo + IA
import { useState, useEffect } from 'react'
import { clubesParaMercado } from '../engine/gameEngine'

const T={bg:'#050A14',surface:'#0D1829',s2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171',purple:'#A855F7',orange:'#FB923C'}
function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}
function GL(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.8}}/>}

const NOMES_MERCADO=['Trovão','Furacão','Astro','Cometa','Atlas','Orion','Vega','Sirius','Apolo','Marte','Brisa','Aurora','Eclipse','Radar','Titan','Mercúrio','Plutão','Saturno','Netuno','Estrela']
const POMBAIS_IA=['Pombal da Serra','Pombal Elite','Pombal Norte','Pombal Real','Pombal Campeão','Pombal Ibérico','Pombal Dourado','Pombal Lusitano']
const TIPOS_ESP=['Velocidade','Meio-Fundo','Fundo','Grande Fundo']
const PERS_TIPOS=['guerreiro','calmo','competitivo','inteligente','resistente','lider','determinado']

function gerarPomboMercado(qualidade='normal', semana=1){
  const q=qualidade==='elite'?75:qualidade==='bom'?60:45
  const g=(base,std=12)=>Math.min(99,Math.max(1,Math.round(base+(Math.random()-.5)*2*std)))
  const rating=qualidade==='elite'?4+Math.floor(Math.random()*2):qualidade==='bom'?3+Math.floor(Math.random()*2):1+Math.floor(Math.random()*3)
  const nome=NOMES_MERCADO[Math.floor(Math.random()*NOMES_MERCADO.length)]
  const esp=TIPOS_ESP[Math.floor(Math.random()*4)]
  const sexo=Math.random()>.5?'M':'F'
  const valor=Math.round((rating*800+Math.random()*2000)*(qualidade==='elite'?4:qualidade==='bom'?2:1))
  const temGeneRaro=Math.random()<0.06
  return{
    id:`m_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    nome,
    anilha:`PT-${2020+Math.floor(Math.random()*5)}-${Math.floor(Math.random()*900000+100000)}`,
    sexo,
    ano:2020+Math.floor(Math.random()*5),
    especialidade:esp,
    personalidade_tipo:PERS_TIPOS[Math.floor(Math.random()*PERS_TIPOS.length)],
    rating,
    valor,
    precoInicial:valor,
    atributos:{
      velocidade:g(q),resistencia:g(q),orientacao:g(q),coragem:g(q),
      recuperacao:g(q),inteligencia:g(q),instinto:g(q),forca:g(q),
      potencial_revelado:Math.floor(Math.random()*60),
      potencial_maximo:g(q+5),
      gene_raro_tipo:temGeneRaro?['Linha Campeã','Mutação Velocista','Sangue Puro','Gene Olímpico'][Math.floor(Math.random()*4)]:null,
    },
    pombalVendedor:POMBAIS_IA[Math.floor(Math.random()*POMBAIS_IA.length)],
    forma_atual:60+Math.floor(Math.random()*30),
    fadiga:Math.floor(Math.random()*20),
    provas:Math.floor(Math.random()*15),
    vitorias:Math.floor(Math.random()*3),
    percentil_medio:Math.floor(Math.random()*80),
    estado:'activo',
    emLeilao:Math.random()<0.3,
    leilaoTermina:Math.floor(Math.random()*5)+1,
    licitacaoAtual:Math.round(valor*0.7),
    recomendadoOlheiro:Math.random()<0.2,
    qualidade,
    disponivelAte:semana+3,
  }
}

function gerarMercadoInicial(semana){
  return[
    ...Array.from({length:3},()=>gerarPomboMercado('elite',semana)),
    ...Array.from({length:5},()=>gerarPomboMercado('bom',semana)),
    ...Array.from({length:6},()=>gerarPomboMercado('normal',semana)),
  ]
}

const PERS_LABELS={guerreiro:'⚔️ Guerreiro',calmo:'🧘 Calmo',competitivo:'🔥 Competitivo',inteligente:'🧠 Inteligente',resistente:'💪 Resistente',lider:'👑 Líder',determinado:'🎯 Determinado'}
const COR_QUAL={elite:T.gold,bom:T.blue,normal:T.muted}
const LABEL_QUAL={elite:'ELITE',bom:'BOM',normal:'NORMAL'}

export default function VLMercado({carreira,onVoltar,onGuardar}){
  const [cl,setCL]=useState(()=>lerLS()||carreira)
  const c=cl
  const salvar=d=>{gravarLS(d);setCL({...d});onGuardar?.(d)}

  const [tab,setTab]=useState('comprar')
  const [filtroEsp,setFiltroEsp]=useState('todos')
  const [filtroSexo,setFiltroSexo]=useState('todos')
  const [filtroOrd,setFiltroOrd]=useState('recomendado')
  const [pomboSel,setPomboSel]=useState(null)
  const [msg,setMsg]=useState(null)
  const [licitando,setLicitando]=useState(null)

  const semana=c.semana||1
  const temOlheiro=(c.staff||[]).some(s=>s.tipo==='olheiro')
  const descontoOlheiro=temOlheiro?0.85:1.0

  // Gerar/carregar mercado
  const [mercado,setMercado]=useState(()=>{
    const salvo=c.mercado_disponivel
    const base=salvo&&salvo.semana===semana?salvo.pombos:gerarMercadoInicial(semana)
    const iaPombos=clubesParaMercado(c).map(a=>({
      id:a.id,nome:a.pomboNome,sexo:a.pomboSexo||'M',
      especialidade:a.especialidade,anilha:a.anilha||'',vitorias:0,provas:0,
      atributos:a.atributos,valor:a.preco,
      origem:`${a.clubeNome} · ${a.clubeNivel==='elite'?'Elite':a.clubeNivel==='bom'?'Experiente':'Amateur'}`,
      iaAnuncioId:a.id,
    }))
    return[...iaPombos,...base]
  })

  const showMsg=(texto,tipo='ok')=>{setMsg({texto,tipo});setTimeout(()=>setMsg(null),4000)}

  const comprar=(pombo)=>{
    const preco=Math.round(pombo.valor*descontoOlheiro)
    if((c.orcamento||0)<preco){showMsg(`Saldo insuficiente. Precisas de ${preco.toLocaleString()}€`,'erro');return}
    const novosPombos=[...(c.pombos||[]),{...pombo,id:`p_${Date.now()}`,estado:'activo',provas:pombo.provas||0,vitorias:pombo.vitorias||0,historico_provas:[],historico_treinos:[],pai_id:null,mae_id:null}]
    const novosMovimentos=[...(c.movimentos||[]),{tipo:'compra',descricao:`Compra: ${pombo.nome}`,valor:-preco,semana}]
    const novoMercado=mercado.filter(p=>p.id!==pombo.id)
    setMercado(novoMercado)
    salvar({...c,pombos:novosPombos,orcamento:(c.orcamento||0)-preco,movimentos:novosMovimentos})
    setPomboSel(null)
    showMsg(`${pombo.nome} adquirido por ${preco.toLocaleString()}€!`)
  }

  const vender=(pomboId)=>{
    const pombo=(c.pombos||[]).find(p=>p.id===pomboId)
    if(!pombo)return
    const valorVenda=Math.round((pombo.valor||1000)*(1+(pombo.vitorias||0)*0.1))
    const novosPombos=(c.pombos||[]).filter(p=>p.id!==pomboId)
    const novosMovimentos=[...(c.movimentos||[]),{tipo:'venda',descricao:`Venda: ${pombo.nome}`,valor:valorVenda,semana}]
    salvar({...c,pombos:novosPombos,orcamento:(c.orcamento||0)+valorVenda,movimentos:novosMovimentos})
    showMsg(`${pombo.nome} vendido por ${valorVenda.toLocaleString()}€!`)
  }

  const licitar=(pombo)=>{
    const novaLicitacao=pombo.licitacaoAtual+Math.round(pombo.precoInicial*0.1)
    if((c.orcamento||0)<novaLicitacao){showMsg('Saldo insuficiente para licitar','erro');return}
    const novoMercado=mercado.map(p=>p.id===pombo.id?{...p,licitacaoAtual:novaLicitacao,lidaBtua:true}:p)
    setMercado(novoMercado)
    setLicitando(null)
    showMsg(`Licitação de ${novaLicitacao.toLocaleString()}€ registada!`)
  }

  // Filtrar e ordenar
  const pombosVisiveis=mercado
    .filter(p=>{
      if(filtroEsp!=='todos'&&p.especialidade!==filtroEsp)return false
      if(filtroSexo!=='todos'&&p.sexo!==filtroSexo)return false
      return true
    })
    .sort((a,b)=>
      filtroOrd==='recomendado'?(b.recomendadoOlheiro?1:0)-(a.recomendadoOlheiro?1:0)||b.rating-a.rating:
      filtroOrd==='preco_asc'?a.valor-b.valor:
      filtroOrd==='preco_desc'?b.valor-a.valor:
      b.rating-a.rating
    )

  const pombosParaVender=(c.pombos||[]).filter(p=>p.estado==='activo')

  return(
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:"system-ui,sans-serif"}}>
      {/* Detalhe pombo */}
      {pomboSel&&(()=>{
        const p=pomboSel
        const cor=p.sexo==='F'?'#C084FC':T.blue
        const preco=Math.round(p.valor*descontoOlheiro)
        const podeComprar=(c.orcamento||0)>=preco
        const corQ=COR_QUAL[p.qualidade]||T.muted
        const temGene=p.atributos?.gene_raro_tipo
        return(
          <div style={{position:'fixed',inset:0,background:'rgba(3,6,16,.97)',zIndex:1000,overflowY:'auto',fontFamily:"system-ui,sans-serif"}}>
            <div style={{background:T.bg,minHeight:'100vh',maxWidth:480,margin:'0 auto'}}>
              <div style={{background:`linear-gradient(135deg,${cor}18,${T.surface})`,padding:'18px 16px',borderBottom:`1px solid ${T.s2}`,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${cor},transparent)`}}/>
                <button onClick={()=>setPomboSel(null)} style={{position:'absolute',top:14,right:14,background:T.s2,border:'none',borderRadius:8,width:32,height:32,color:T.muted,cursor:'pointer',fontSize:14}}>✕</button>
                <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                  <div style={{width:68,height:68,borderRadius:16,background:`${cor}15`,border:`2px solid ${cor}40`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,color:cor}}>{p.anilha?.slice(-3)}</span>
                    <span style={{fontSize:9,color:`${cor}80`}}>{p.sexo==='M'?'♂':'♀'}</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:19,fontWeight:900,color:T.text,marginBottom:2}}>{p.nome}</div>
                    <div style={{fontSize:10,color:T.muted,marginBottom:6}}>{p.anilha} · {p.ano} · {p.especialidade}</div>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      <span style={{fontSize:9,color:corQ,background:`${corQ}15`,padding:'2px 6px',borderRadius:4,fontWeight:700}}>{LABEL_QUAL[p.qualidade]}</span>
                      {p.recomendadoOlheiro&&<span style={{fontSize:9,color:T.success,background:`${T.success}15`,padding:'2px 6px',borderRadius:4,fontWeight:700}}>🔭 OLHEIRO</span>}
                      {temGene&&<span style={{fontSize:9,color:T.gold,background:`${T.gold}15`,padding:'2px 6px',borderRadius:4,fontWeight:700}}>💎 GENE RARO</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
                {/* Atributos principais */}
                {['velocidade','resistencia','orientacao','coragem'].map(k=>{
                  const val=p.atributos?.[k]||0
                  const c2=val>=80?T.success:val>=65?T.blue:val>=50?T.gold:T.danger
                  const NOMES={velocidade:'Velocidade',resistencia:'Resistência',orientacao:'Orientação',coragem:'Coragem'}
                  return(
                    <div key={k} style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:80,fontSize:9,color:T.muted}}>{NOMES[k]}</div>
                      <div style={{flex:1,height:6,background:'rgba(255,255,255,.05)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${val}%`,background:c2,borderRadius:3,boxShadow:`0 0 4px ${c2}50`}}/>
                      </div>
                      <div style={{width:22,fontSize:11,fontWeight:700,color:c2,textAlign:'right'}}>{val}</div>
                    </div>
                  )
                })}
                {/* Stats */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[
                    {l:'Provas',v:p.provas||0,c:T.blue},
                    {l:'Vitórias',v:p.vitorias||0,c:T.gold},
                    {l:'% Médio',v:`${p.percentil_medio||0}%`,c:T.success},
                  ].map((s,i)=>(
                    <div key={i} style={{background:T.s2,borderRadius:8,padding:'8px',textAlign:'center'}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:900,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:8,color:T.muted,fontWeight:700}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {/* Gene raro */}
                {temGene&&(
                  <div style={{padding:'10px 14px',background:`${T.gold}08`,border:`1px solid ${T.gold}25`,borderRadius:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.gold}}>💎 Gene Raro: {p.atributos.gene_raro_tipo}</div>
                    <div style={{fontSize:9,color:T.muted,marginTop:3}}>Característica excepcionalmente rara. Muito valorizado em reprodução.</div>
                  </div>
                )}
                {/* Preço */}
                <div style={{background:`${T.gold}08`,border:`1px solid ${T.gold}25`,borderRadius:12,padding:'14px',textAlign:'center',position:'relative',overflow:'hidden'}}>
                  <GL/>
                  {temOlheiro&&p.valor!==preco&&<div style={{fontSize:9,color:T.muted,textDecoration:'line-through',marginBottom:2}}>{p.valor.toLocaleString()}€</div>}
                  <div style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:900,color:T.gold}}>{preco.toLocaleString()}€</div>
                  {temOlheiro&&<div style={{fontSize:9,color:T.success,marginTop:2}}>🔭 -15% desconto do olheiro</div>}
                  <div style={{fontSize:9,color:T.muted,marginTop:2}}>Saldo actual: {(c.orcamento||0).toLocaleString()}€</div>
                </div>
                <button onClick={()=>comprar(p)} disabled={!podeComprar}
                  style={{width:'100%',padding:'14px',borderRadius:12,border:'none',background:podeComprar?`linear-gradient(135deg,${T.success},#059669)`:T.s2,color:podeComprar?'#050A14':T.muted,fontSize:13,fontWeight:800,cursor:podeComprar?'pointer':'default',fontFamily:'inherit',boxShadow:podeComprar?`0 4px 16px ${T.success}30`:'none'}}>
                  {podeComprar?`✅ Comprar — ${preco.toLocaleString()}€`:`💸 Saldo insuficiente (faltam ${(preco-(c.orcamento||0)).toLocaleString()}€)`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <div style={{background:`linear-gradient(180deg,${T.surface},${T.bg})`,borderBottom:`1px solid ${T.s2}`,padding:'14px 16px',position:'relative'}}>
        <GL/>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <button onClick={onVoltar} style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:8,width:32,height:32,color:T.muted,cursor:'pointer',fontSize:16}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800}}>🛒 Mercado</div>
            <div style={{fontSize:9,color:T.muted}}>
              {mercado.length} disponíveis · Sem.{semana}
              {temOlheiro&&<span style={{color:T.success}}> · 🔭 Olheiro activo (-15%)</span>}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[['comprar','🛒 Comprar'],['leiloes','🔨 Leilões'],['vender','💰 Vender']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:'none',padding:'7px 11px',borderRadius:8,border:tab===id?'none':`1px solid ${T.s2}`,background:tab===id?`${T.orange}20`:'transparent',color:tab===id?T.orange:T.muted,fontSize:10,fontWeight:tab===id?700:400,cursor:'pointer',fontFamily:'inherit'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>

        {msg&&<div style={{padding:'10px 14px',background:msg.tipo==='ok'?`${T.success}10`:`${T.danger}10`,border:`1px solid ${msg.tipo==='ok'?T.success:T.danger}30`,borderRadius:10,fontSize:12,color:msg.tipo==='ok'?T.success:T.danger,fontWeight:600}}>{msg.tipo==='ok'?'✅':'❌'} {msg.texto}</div>}

        {/* COMPRAR */}
        {tab==='comprar'&&(
          <>
            {/* Filtros */}
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              <select value={filtroEsp} onChange={e=>setFiltroEsp(e.target.value)}
                style={{padding:'6px 8px',borderRadius:7,border:`1px solid ${T.s2}`,background:T.surface,color:T.muted,fontSize:10,fontFamily:'inherit',cursor:'pointer',outline:'none'}}>
                <option value="todos">Todas esp.</option>
                {TIPOS_ESP.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
              <select value={filtroSexo} onChange={e=>setFiltroSexo(e.target.value)}
                style={{padding:'6px 8px',borderRadius:7,border:`1px solid ${T.s2}`,background:T.surface,color:T.muted,fontSize:10,fontFamily:'inherit',cursor:'pointer',outline:'none'}}>
                <option value="todos">♂♀</option>
                <option value="M">♂ Macho</option>
                <option value="F">♀ Fêmea</option>
              </select>
              <select value={filtroOrd} onChange={e=>setFiltroOrd(e.target.value)}
                style={{padding:'6px 8px',borderRadius:7,border:`1px solid ${T.s2}`,background:T.surface,color:T.muted,fontSize:10,fontFamily:'inherit',cursor:'pointer',outline:'none'}}>
                <option value="recomendado">Recomendado</option>
                <option value="rating">Rating</option>
                <option value="preco_asc">Preço ↑</option>
                <option value="preco_desc">Preço ↓</option>
              </select>
            </div>

            {pombosVisiveis.filter(p=>!p.emLeilao).map(p=>{
              const cor=p.sexo==='F'?'#C084FC':T.blue
              const corQ=COR_QUAL[p.qualidade]||T.muted
              const preco=Math.round(p.valor*descontoOlheiro)
              const podeComp=(c.orcamento||0)>=preco
              const temGene=p.atributos?.gene_raro_tipo
              return(
                <div key={p.id} onClick={()=>setPomboSel(p)}
                  style={{background:p.recomendadoOlheiro?`${T.success}06`:T.surface,border:`1px solid ${p.recomendadoOlheiro?T.success+'30':T.s2}`,borderRadius:12,padding:'12px 14px',cursor:'pointer',position:'relative',overflow:'hidden',transition:'all .15s'}}>
                  {p.recomendadoOlheiro&&<GL/>}
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <div style={{width:40,height:40,borderRadius:10,background:`${cor}15`,border:`1px solid ${cor}30`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontFamily:"Georgia,serif",fontSize:12,fontWeight:900,color:cor}}>{p.anilha?.slice(-3)}</span>
                      <span style={{fontSize:7,color:`${cor}80`}}>{p.sexo==='M'?'♂':'♀'}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                        <div style={{fontSize:13,fontWeight:700,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</div>
                        <span style={{fontSize:8,color:corQ,background:`${corQ}15`,padding:'1px 4px',borderRadius:3,fontWeight:700,flexShrink:0}}>{LABEL_QUAL[p.qualidade]}</span>
                        {temGene&&<span style={{fontSize:10,flexShrink:0}}>💎</span>}
                        {p.recomendadoOlheiro&&<span style={{fontSize:8,color:T.success,flexShrink:0}}>🔭</span>}
                      </div>
                      <div style={{fontSize:9,color:T.muted,marginBottom:4}}>{p.especialidade} · {p.ano} · {p.pombalVendedor}</div>
                      <div style={{display:'flex',gap:1}}>
                        {Array.from({length:5}).map((_,i)=><span key={i} style={{fontSize:9,color:i<p.rating?T.gold:'rgba(255,255,255,.1)'}}>{i<p.rating?'★':'☆'}</span>)}
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:900,color:podeComp?T.gold:T.danger}}>{preco.toLocaleString()}€</div>
                      {!podeComp&&<div style={{fontSize:8,color:T.danger}}>Sem saldo</div>}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* LEILÕES */}
        {tab==='leiloes'&&(
          <>
            <div style={{padding:'10px 14px',background:`${T.purple}08`,border:`1px solid ${T.purple}20`,borderRadius:10,fontSize:10,color:T.muted}}>
              🔨 Os leilões terminam automaticamente ao fim das semanas indicadas. A tua licitação mais alta ganha.
            </div>
            {mercado.filter(p=>p.emLeilao).length===0?(
              <div style={{textAlign:'center',padding:'40px',color:T.muted,fontSize:12}}>Sem leilões activos esta semana</div>
            ):mercado.filter(p=>p.emLeilao).map(p=>{
              const cor=p.sexo==='F'?'#C084FC':T.blue
              const temGene=p.atributos?.gene_raro_tipo
              const isLicitando=licitando===p.id
              const novaLic=p.licitacaoAtual+Math.round(p.precoInicial*0.1)
              const podeLic=(c.orcamento||0)>=novaLic
              return(
                <div key={p.id} style={{background:`${T.purple}06`,border:`1px solid ${T.purple}25`,borderRadius:14,padding:'14px',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${T.purple},transparent)`}}/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div>
                      <div style={{display:'flex',gap:5,alignItems:'center',marginBottom:3}}>
                        <span style={{fontFamily:"Georgia,serif",fontSize:14,fontWeight:700,color:T.text}}>{p.nome}</span>
                        {temGene&&<span style={{fontSize:10}}>💎</span>}
                      </div>
                      <div style={{fontSize:9,color:T.muted}}>{p.especialidade} · {p.pombalVendedor}</div>
                      <div style={{display:'flex',gap:1,marginTop:4}}>
                        {Array.from({length:5}).map((_,i)=><span key={i} style={{fontSize:9,color:i<p.rating?T.gold:'rgba(255,255,255,.1)'}}>{i<p.rating?'★':'☆'}</span>)}
                      </div>
                    </div>
                    <div style={{textAlign:'center',background:`${T.purple}15`,border:`1px solid ${T.purple}30`,borderRadius:8,padding:'6px 10px'}}>
                      <div style={{fontSize:7,color:T.purple,fontWeight:700}}>TERMINA</div>
                      <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:900,color:T.purple}}>{p.leilaoTermina}</div>
                      <div style={{fontSize:7,color:T.purple}}>SEM.</div>
                    </div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px',background:'rgba(255,255,255,.03)',borderRadius:8,marginBottom:10}}>
                    <div>
                      <div style={{fontSize:9,color:T.muted}}>Licitação actual</div>
                      <div style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:900,color:p.lidaBtua?T.success:T.gold}}>{p.licitacaoAtual.toLocaleString()}€{p.lidaBtua?' ← TU':''}</div>
                    </div>
                    <div>
                      <div style={{fontSize:9,color:T.muted}}>Próximo mínimo</div>
                      <div style={{fontSize:13,fontWeight:700,color:T.orange}}>{novaLic.toLocaleString()}€</div>
                    </div>
                  </div>
                  <button onClick={()=>podeLic&&licitar(p)} disabled={!podeLic||p.lidaBtua}
                    style={{width:'100%',padding:'10px',borderRadius:8,border:'none',background:p.lidaBtua?`${T.success}20`:podeLic?`linear-gradient(135deg,${T.purple},#7C3AED)`:T.s2,color:p.lidaBtua?T.success:podeLic?'#fff':T.muted,fontSize:11,fontWeight:700,cursor:podeLic&&!p.lidaBtua?'pointer':'default',fontFamily:'inherit'}}>
                    {p.lidaBtua?'✅ Licitação mais alta':'🔨 Licitar '+novaLic.toLocaleString()+'€'}
                  </button>
                </div>
              )
            })}
          </>
        )}

        {/* VENDER */}
        {tab==='vender'&&(
          pombosParaVender.length===0?(
            <div style={{textAlign:'center',padding:'40px',color:T.muted,fontSize:12}}>Sem pombos para vender</div>
          ):pombosParaVender.map(p=>{
            const cor=p.sexo==='F'?'#C084FC':T.blue
            const valorVenda=Math.round((p.valor||1000)*(1+(p.vitorias||0)*0.1))
            return(
              <div key={p.id} style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:12,padding:'12px 14px',position:'relative',overflow:'hidden'}}>
                <GL/>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:36,height:36,borderRadius:8,background:`${cor}15`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"Georgia,serif",fontSize:11,fontWeight:900,color:cor,flexShrink:0}}>{p.anilha?.slice(-3)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>{p.nome}</div>
                    <div style={{fontSize:9,color:T.muted}}>{p.especialidade} · {p.provas||0} provas · {p.vitorias||0} vitórias</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.success}}>{valorVenda.toLocaleString()}€</div>
                    <button onClick={()=>vender(p.id)}
                      style={{marginTop:4,padding:'4px 10px',borderRadius:6,border:`1px solid ${T.success}30`,background:`${T.success}10`,color:T.success,fontSize:9,cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>
                      Vender
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
