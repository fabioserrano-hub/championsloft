// src/modules/virtualLoft/screens/VLProvas.jsx — V4 Liga + Campeonato + Simulação Avançada
import { useState, useEffect, useRef } from 'react'
import { PROVAS_CALENDARIO } from '../data/calendario'
import { aiParaProva } from '../engine/gameEngine'

const T={bg:'#050A14',surface:'#0D1829',s2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171',purple:'#A855F7',orange:'#FB923C'}
function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}
function GL(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.8}}/>}

// ── Calendário intercalado por especialidade ──────────────────────────────────
// Calendário — fonte única partilhada com HubPombal

const DIV_CFG = {
  div3:  {label:'Divisão 3',  cor:T.muted,   bg:'rgba(107,122,153,.15)', desc:'Nível local — para começar'},
  div2:  {label:'Divisão 2',  cor:T.blue,    bg:'rgba(79,195,247,.1)',   desc:'Nível distrital e regional'},
  div1:  {label:'Divisão 1',  cor:T.gold,    bg:'rgba(201,168,76,.1)',   desc:'Nível nacional — top competidores'},
  elite: {label:'Elite',      cor:T.purple,  bg:'rgba(168,85,247,.15)',  desc:'Nível internacional — os melhores'},
}

const TIPO_CFG = {
  velocidade:   {label:'Velocidade',   icon:'⚡', cor:'#FB923C'},
  meio_fundo:   {label:'Meio-Fundo',   icon:'🌊', cor:'#4FC3F7'},
  fundo:        {label:'Fundo',        icon:'💪', cor:'#2DD4A7'},
  grande_fundo: {label:'Grande Fundo', icon:'🏔️', cor:'#A855F7'},
}

const NOMES_ADV = ['Relâmpago','Trovão','Furacão','Astro','Cometa','Atlas','Zeus','Orion','Vega','Sirius','Falcão','Titan','Brisa','Radar','Tempestade','Mercúrio','Apolo','Netuno','Marte','Saturno']
const POMBAIS_ADV = ['Pombal da Serra','Pombal Elite','Pombal Campeão','Pombal Norte','Pombal Real','Pombal Dourado','Pombal Ibérico','Pombal Ases','Pombal Lusitano','Pombal Ibéria']

// ── Motor de simulação avançado ───────────────────────────────────────────────
function gerarMeteo(dist) {
  const opts = dist < 200
    ? [{l:'☀️ Sol perfeito',p:0,w:.4},{l:'⛅ Ligeiramente nublado',p:.03,w:.3},{l:'💨 Brisa',p:.05,w:.2},{l:'🌧️ Chuva leve',p:.10,w:.1}]
    : dist < 500
    ? [{l:'☀️ Sol',p:0,w:.3},{l:'⛅ Nublado',p:.05,w:.25},{l:'💨 Vento moderado',p:.10,w:.2},{l:'🌧️ Chuva',p:.15,w:.15},{l:'⛈️ Trovoada',p:.25,w:.10}]
    : [{l:'☀️ Sol',p:0,w:.2},{l:'⛅ Nublado',p:.05,w:.2},{l:'💨 Vento forte',p:.15,w:.2},{l:'🌧️ Chuva intensa',p:.20,w:.2},{l:'⛈️ Trovoada',p:.30,w:.15},{l:'🌫️ Neblina densa',p:.35,w:.05}]
  let acc=0, r=Math.random()
  for(const o of opts){ acc+=o.w; if(r<acc) return {label:o.l, penalidade:o.p} }
  return {label:'☀️ Sol',penalidade:0}
}

function calcScore(p, prova, meteo, estrategia) {
  const a = p.atributos || {}
  const forma = p.forma_atual || 70
  const fadiga = p.fadiga || 0
  const exp = p.provas || 0

  let base
  if (prova.tipo==='velocidade')    base = (a.velocidade||50)*.40+(a.instinto||50)*.25+(a.coragem||50)*.20+(a.orientacao||50)*.15
  else if (prova.tipo==='meio_fundo') base = (a.resistencia||50)*.35+(a.orientacao||50)*.30+(a.velocidade||50)*.20+(a.recuperacao||50)*.15
  else if (prova.tipo==='fundo')    base = (a.resistencia||50)*.45+(a.orientacao||50)*.30+(a.recuperacao||50)*.15+(a.inteligencia||50)*.10
  else                              base = (a.resistencia||50)*.50+(a.orientacao||50)*.30+(a.recuperacao||50)*.15+(a.instinto||50)*.05

  const multForma  = 0.70 + (forma/100)*.60
  const multFadiga = 1 - (fadiga/100)*.30
  const multExp    = 1 + Math.min(exp,30)*.004
  const multMeteo  = 1 - meteo.penalidade

  let multPers = 1
  const pers = p.personalidade || []
  if (pers.includes('Nervoso') && meteo.penalidade>.1)  multPers *= .90
  if (pers.includes('Competitivo'))                      multPers *= 1.08
  if (pers.includes('Preguiçoso') && fadiga>30)          multPers *= .92
  if (pers.includes('Inteligente'))                      multPers *= 1.05
  if (pers.includes('Determinado'))                      multPers *= 1.06
  if (pers.includes('Líder'))                            multPers *= 1.04

  const multEst = estrategia==='agressivo' ? 1.12 : estrategia==='conservador' ? 0.93 : 1.0
  const risco   = estrategia==='agressivo' ? 0.22 : estrategia==='conservador' ? 0.07 : 0.13
  const sorte   = 1 + (Math.random()-.5)*risco*2

  return Math.max(5, Math.min(99, base*multForma*multFadiga*multExp*multMeteo*multPers*multEst*sorte))
}

function simularProva(pombos, prova, meteo, estrategia) {
  const total = Math.max(40, 30 + Math.floor(prova.dist/10))
  const res = []

  pombos.forEach(p => {
    const score = calcScore(p, prova, meteo, estrategia)
    const velBase = prova.tipo==='velocidade' ? 1500 : prova.tipo==='meio_fundo' ? 1380 : prova.tipo==='fundo' ? 1280 : 1200
    const velocidade = Math.round(velBase * (score/100) * (0.92+Math.random()*.16))
    res.push({pombo:p, score, velocidade, tempo:Math.round((prova.dist*1000)/velocidade), isMeu:true,
      progressoCurva: Array.from({length:10}, (_,i) => score*(0.7+Math.random()*.6)*(i/10)*(1+Math.random()*.4))})
  })

  for (let i=0; i<total-pombos.length; i++) {
    const nivelAdv = prova.nivel==='elite' ? 55+Math.random()*35
      : prova.nivel==='div1' ? 45+Math.random()*35
      : prova.nivel==='div2' ? 35+Math.random()*35
      : 25+Math.random()*35
    const velBase = prova.tipo==='velocidade' ? 1500 : 1380
    const velocidade = Math.round(velBase*(nivelAdv/100)*(0.88+Math.random()*.24))
    res.push({pombo:null, score:nivelAdv, velocidade, tempo:Math.round((prova.dist*1000)/velocidade),
      nome:NOMES_ADV[Math.floor(Math.random()*NOMES_ADV.length)],
      pombalNome:POMBAIS_ADV[Math.floor(Math.random()*POMBAIS_ADV.length)], isMeu:false})
  }

  res.sort((a,b) => b.velocidade - a.velocidade)
  return res.map((r,i) => ({...r, posicao:i+1, total:res.length, percentil:Math.round(((res.length-i)/res.length)*100)}))
}

// ── Simulação visual avançada ──────────────────────────────────────────────────
const COMENTARIOS_POOL = [
  [10, p => `🚀 Solta efectuada! ${p} junta-se ao pelotão principal.`],
  [20, p => `🧭 ${p} orienta-se rapidamente — excelente instinto!`],
  [30, () => `⚡ O pelotão está a dividir-se em 3 grupos distintos.`],
  [45, p => `💨 Rajada de vento pelo sector norte — ${p} resiste bem!`],
  [55, p => `🐦 ${p} separa-se do segundo grupo e acelera!`],
  [65, () => `📡 Os pombos mais fortes já se destacam claramente.`],
  [75, p => `🏃 ${p} está a dar tudo — reta final!`],
  [85, p => `👁️ ${p} avista o pombal! Máxima velocidade agora.`],
  [92, p => `🔥 ${p} entra na fase final com tudo!`],
  [98, p => `🏁 Linha de chegada!`],
]

function SimulacaoAvancada({ prova, resultados, pombosParticipantes, meteo, estrategia, onFechar, pontosGanhos }) {
  const [fase, setFase] = useState('countdown')
  const [count, setCount] = useState(3)
  const [prog, setProg] = useState(0)
  const [comentario, setComentario] = useState(null)
  const [eventos, setEventos] = useState([])
  const [chegadas, setChegadas] = useState([])
  const [posicaoAoVivo, setPosicaoAoVivo] = useState({})
  const ref = useRef(null)
  const meusPombos = resultados.filter(r=>r.isMeu)
  const nomeP = pombosParticipantes[0]?.nome || 'O pombo'

  useEffect(() => {
    // Countdown 3-2-1
    const ct = setInterval(() => {
      setCount(c => {
        if (c <= 1) { clearInterval(ct); setFase('voo'); return 0 }
        return c - 1
      })
    }, 800)
    return () => clearInterval(ct)
  }, [])

  useEffect(() => {
    if (fase !== 'voo') return
    let p = 0
    let evIdx = 0

    ref.current = setInterval(() => {
      p = Math.min(100, p + 0.8)
      setProg(p)

      // Posição ao vivo dos meus pombos
      const pos = {}
      meusPombos.forEach(r => {
        const progresso = p/100
        const pontosCurva = r.pombo?.progressoCurva || []
        const idxCurva = Math.floor(progresso*(pontosCurva.length-1))
        const posAtual = Math.max(1, Math.round(r.posicao + (1-progresso)*(r.total-r.posicao)*(1-Math.random()*.3)))
        pos[r.pombo.id] = Math.max(1, posAtual)
      })
      setPosicaoAoVivo(pos)

      // Comentários ao longo da prova
      const cm = COMENTARIOS_POOL.find(c => Math.abs(c[0]-p) < 1.2)
      if (cm && evIdx < COMENTARIOS_POOL.length) {
        setComentario(cm[1](nomeP))
        evIdx++
      }

      // Eventos aleatórios
      if (Math.random() < 0.008) {
        const evs = ['🦅 Falcão avistado!', '💨 Rajada de vento!', '☁️ Nuvens de tempestade', '🌡️ Temperatura sobe', '🔭 Pombo perde orientação momentaneamente']
        setEventos(prev => [...prev.slice(-2), {msg: evs[Math.floor(Math.random()*evs.length)], id: Date.now()}])
      }

      if (p >= 100) {
        clearInterval(ref.current)
        setFase('chegada')
        const sorted = [...resultados].sort((a,b)=>a.posicao-b.posicao)
        sorted.slice(0,15).forEach((r,i) => setTimeout(()=>setChegadas(prev=>[...prev,r]), i*180))
        setTimeout(()=>setFase('resultado'), sorted.length*180+1500)
      }
    }, 50)
    return () => clearInterval(ref.current)
  }, [fase])

  const tipoCfg = TIPO_CFG[prova.tipo] || TIPO_CFG.velocidade
  const divCfg = DIV_CFG[prova.nivel] || DIV_CFG.div3

  return (
    <div style={{position:'fixed',inset:0,background:'#030810',zIndex:2000,display:'flex',flexDirection:'column',fontFamily:"system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{background:'linear-gradient(180deg,#0D1829,#030810)',borderBottom:`1px solid ${T.s2}`,padding:'12px 16px',flexShrink:0,position:'relative'}}>
        <GL/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
              <span style={{fontSize:14}}>{tipoCfg.icon}</span>
              <span style={{fontSize:14,fontWeight:800,color:T.text}}>{prova.nome}</span>
              <span style={{fontSize:9,color:divCfg.cor,background:divCfg.bg,padding:'2px 6px',borderRadius:4,fontWeight:700}}>{divCfg.label}</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <span style={{fontSize:9,color:tipoCfg.cor,fontWeight:600}}>{tipoCfg.label}</span>
              <span style={{fontSize:9,color:T.muted}}>📍 {prova.dist}km</span>
              <span style={{fontSize:9,color:meteo.penalidade>.2?T.danger:meteo.penalidade>.05?T.gold:T.success}}>{meteo.label}</span>
              <span style={{fontSize:9,color:T.gold}}>🏆 {prova.pontos}pts · 🏅{prova.premio.toLocaleString()}€</span>
            </div>
          </div>
          {fase==='resultado'&&<button onClick={onFechar} style={{background:T.s2,border:'none',borderRadius:8,padding:'7px 12px',color:T.text,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>✕ Fechar</button>}
        </div>
      </div>

      <div style={{flex:1,overflow:'auto',padding:'14px 16px',display:'flex',flexDirection:'column',gap:12}}>

        {/* COUNTDOWN */}
        {fase==='countdown'&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,minHeight:300,gap:20}}>
            <div style={{fontSize:80,fontFamily:"Georgia,serif",fontWeight:900,color:T.gold,textShadow:`0 0 40px ${T.gold}60`,lineHeight:1}}>{count}</div>
            <div style={{fontSize:14,color:T.text,fontWeight:700}}>{count===3?'Preparar...':count===2?'Prontos...':'Solta!'}</div>
            <div style={{padding:'10px 20px',background:`${tipoCfg.cor}15`,border:`1px solid ${tipoCfg.cor}30`,borderRadius:10,fontSize:11,color:tipoCfg.cor}}>
              {pombosParticipantes.length} pombo{pombosParticipantes.length>1?'s':''} · {resultados.length} participantes
            </div>
          </div>
        )}

        {/* VOO */}
        {(fase==='voo'||fase==='chegada')&&(
          <>
            {/* Posição ao vivo */}
            {meusPombos.map(r=>(
              <div key={r.pombo.id} style={{background:T.surface,border:`2px solid ${T.gold}40`,borderRadius:12,padding:'10px 14px',position:'relative',overflow:'hidden'}}>
                <GL/>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:800,color:T.gold}}>🐦 {r.pombo.nome}</div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{fontSize:10,color:T.muted}}>Posição ao vivo:</div>
                    <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,color:posicaoAoVivo[r.pombo.id]<=3?T.gold:posicaoAoVivo[r.pombo.id]<=10?T.success:T.text}}>
                      {posicaoAoVivo[r.pombo.id]||'?'}º
                    </div>
                  </div>
                </div>
                {/* Barra de percurso */}
                <div style={{height:8,background:'rgba(255,255,255,.05)',borderRadius:4,overflow:'hidden',position:'relative'}}>
                  <div style={{height:'100%',width:`${prog}%`,background:`linear-gradient(90deg,${T.purple},${T.gold})`,borderRadius:4,transition:'width .08s'}}>
                    <div style={{position:'absolute',right:-2,top:-4,fontSize:18}}>🐦</div>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                  <span style={{fontSize:9,color:T.muted}}>0km</span>
                  <span style={{fontFamily:"Georgia,serif",fontSize:12,fontWeight:700,color:T.gold}}>{Math.round(prog*prova.dist/100)}km / {prova.dist}km</span>
                </div>
              </div>
            ))}

            {/* Comentário ao vivo */}
            {comentario&&(
              <div style={{padding:'10px 14px',background:`${T.purple}10`,border:`1px solid ${T.purple}25`,borderRadius:10,display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:14}}>🎙️</span>
                <span style={{fontSize:12,color:T.text,fontStyle:'italic'}}>{comentario}</span>
              </div>
            )}

            {/* Eventos em tempo real */}
            {eventos.length>0&&(
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {eventos.map((ev,i)=>(
                  <div key={ev.id} style={{padding:'7px 12px',background:`${T.orange}0A`,border:`1px solid ${T.orange}25`,borderRadius:8,fontSize:11,color:T.orange,opacity:i===eventos.length-1?1:.5}}>
                    {ev.msg}
                  </div>
                ))}
              </div>
            )}

            {/* Chegadas */}
            {chegadas.length>0&&(
              <div style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:12,overflow:'hidden',position:'relative'}}>
                <GL/>
                <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.s2}`}}>
                  <span style={{fontSize:9,color:T.success,fontWeight:700,letterSpacing:1.5}}>🏁 CHEGADAS EM TEMPO REAL</span>
                </div>
                {chegadas.map((r,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',background:r.isMeu?`${T.gold}06`:'transparent',borderBottom:`1px solid ${T.s2}`}}>
                    <div style={{width:28,height:28,borderRadius:6,background:r.posicao<=3?[`${T.gold}25`,'rgba(148,163,184,.15)','rgba(180,83,9,.15)'][r.posicao-1]:T.s2,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"Georgia,serif",fontSize:11,fontWeight:900,color:r.posicao<=3?[T.gold,'#94a3b8','#b45309'][r.posicao-1]:T.muted}}>
                      {r.posicao}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:r.isMeu?700:400,color:r.isMeu?T.gold:T.text}}>
                        {r.isMeu?`🐦 ${r.pombo.nome}`:r.nome}
                      </div>
                      {!r.isMeu&&<div style={{fontSize:9,color:T.muted}}>{r.pombalNome}</div>}
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:10,color:T.muted,fontVariantNumeric:'tabular-nums'}}>{r.velocidade}m/min</div>
                      {r.isMeu&&<div style={{fontSize:9,color:T.success,fontWeight:700}}>P{r.percentil}%</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* RESULTADO FINAL */}
        {fase==='resultado'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{textAlign:'center',padding:'12px 0'}}>
              <div style={{fontSize:48,marginBottom:6}}>
                {meusPombos[0]?.posicao===1?'🏆':meusPombos[0]?.posicao<=3?'🥈':'🏁'}
              </div>
              <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,color:T.gold}}>Prova Concluída!</div>
              {pontosGanhos>0&&<div style={{fontSize:12,color:T.success,marginTop:4,fontWeight:700}}>+{pontosGanhos} pontos no campeonato!</div>}
            </div>

            {meusPombos.map(r=>(
              <div key={r.pombo.id} style={{background:T.surface,border:`2px solid ${r.posicao<=3?T.gold:T.s2}`,borderRadius:14,padding:'16px',position:'relative',overflow:'hidden'}}>
                {r.posicao<=3&&<GL/>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:T.text}}>{r.pombo.nome}</div>
                    <div style={{fontSize:10,color:T.muted}}>{r.pombo.especialidade}</div>
                  </div>
                  <div style={{textAlign:'center',background:r.posicao<=3?`${T.gold}15`:T.s2,borderRadius:10,padding:'10px 14px',border:`1px solid ${r.posicao<=3?T.gold:T.s2}`}}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:900,color:r.posicao<=3?T.gold:T.text,lineHeight:1}}>{r.posicao}º</div>
                    <div style={{fontSize:8,color:T.muted}}>/{r.total}</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                  {[
                    {l:'Velocidade',v:`${r.velocidade}m/min`,c:T.blue},
                    {l:'Percentil',v:`${r.percentil}%`,c:T.success},
                    {l:'Pontos',v:`+${r.posicao<=3?prova.pontos:r.percentil>=80?Math.round(prova.pontos*.5):r.percentil>=50?Math.round(prova.pontos*.2):0}`,c:T.gold},
                  ].map((s,i)=>(
                    <div key={i} style={{padding:'8px',background:T.s2,borderRadius:8,textAlign:'center'}}>
                      <div style={{fontSize:13,fontWeight:700,color:s.c,fontVariantNumeric:'tabular-nums'}}>{s.v}</div>
                      <div style={{fontSize:8,color:T.muted,marginTop:2}}>{s.l.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                {/* Análise pós-prova */}
                <div style={{padding:'10px',background:`${T.blue}08`,border:`1px solid ${T.blue}20`,borderRadius:8}}>
                  <div style={{fontSize:9,color:T.blue,fontWeight:700,marginBottom:4}}>📊 ANÁLISE</div>
                  <div style={{fontSize:10,color:T.muted}}>
                    {r.percentil>=90?'Prestação excepcional — o pombo está no seu melhor!':
                     r.percentil>=70?'Boa prestação — continua a melhorar.':
                     r.percentil>=50?'Prestação média — mais treino pode ajudar.':
                     'Prestação abaixo do esperado — verifica a forma e fadiga.'}
                  </div>
                  {(r.pombo.fadiga||0)>60&&<div style={{fontSize:10,color:T.danger,marginTop:4}}>⚠️ Fadiga elevada ({r.pombo.fadiga}%) — descanso recomendado antes da próxima prova!</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Campeonato ─────────────────────────────────────────────────────────────────
function PainelCampeonato({ carreira, provasRealizadas }) {
  const [tabC, setTabC] = useState('geral')
  const historico = carreira.historico_provas || []

  // Calcular pontos por pombo (2 melhores de cada prova)
  const calcPontos = (tipo = null) => {
    const pontosPorPombo = {}
    const provasFiltradas = tipo ? PROVAS_CALENDARIO.filter(p=>p.tipo===tipo) : PROVAS_CALENDARIO

    provasFiltradas.forEach(prova => {
      const resProva = historico.filter(r => r.provaId === prova.id)
      // Top 2 pombos desta prova
      const top2 = [...resProva].sort((a,b) => (b.percentil||0)-(a.percentil||0)).slice(0,2)
      top2.forEach(r => {
        const pts = r.posicao<=1 ? prova.pontos : r.posicao<=3 ? Math.round(prova.pontos*.7) : r.percentil>=80 ? Math.round(prova.pontos*.4) : r.percentil>=50 ? Math.round(prova.pontos*.2) : 0
        pontosPorPombo[r.pomboNome] = (pontosPorPombo[r.pomboNome]||0) + pts
      })
    })

    return Object.entries(pontosPorPombo).sort((a,b)=>b[1]-a[1])
  }

  // Ranking geral pombais (fictício + real)
  const pontosReais = calcPontos(tabC === 'geral' ? null : tabC)
  const totalPontosJogador = pontosReais.reduce((s,[,p])=>s+p, 0)

  // Clubes IA persistentes — todos começam a 0 e pontuam prova a prova
  const ia = carreira.campeonato_ia || {clubes:POMBAIS_ADV.slice(0,7).map(n=>({nome:n})),pontos:{}}
  const chaveTab = tabC==='geral'?'geral':tabC
  const adversariosIA = ia.clubes.map(cl=>({nome:cl.nome,pontos:(ia.pontos?.[cl.nome]?.[chaveTab])||0}))

  const rankingGeral = [...adversariosIA, {nome:`${carreira.nomePombal} ← TU`, pontos: totalPontosJogador, isMeu:true}]
    .sort((a,b)=>b.pontos-a.pontos)

  const posJogador = rankingGeral.findIndex(r=>r.isMeu) + 1

  const tabs = [
    {id:'geral',       label:'🏆 Geral'},
    {id:'velocidade',  label:'⚡ Vel.'},
    {id:'meio_fundo',  label:'🌊 M.F.'},
    {id:'fundo',       label:'💪 Fundo'},
    {id:'grande_fundo',label:'🏔️ G.F.'},
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {/* Posição actual */}
      <div style={{background:'linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04))',border:`1px solid ${T.gold}30`,borderRadius:14,padding:'14px 16px',position:'relative',overflow:'hidden',textAlign:'center'}}>
        <GL/>
        <div style={{fontSize:9,color:T.gold,fontWeight:700,letterSpacing:1.5,marginBottom:6}}>A TUA POSIÇÃO NO CAMPEONATO</div>
        <div style={{fontFamily:"Georgia,serif",fontSize:40,fontWeight:900,color:T.gold,lineHeight:1}}>{posJogador}º</div>
        <div style={{fontSize:11,color:T.muted,marginTop:4}}>{totalPontosJogador} pontos · {historico.length} provas disputadas</div>
      </div>

      {/* Tabs especialidade */}
      <div style={{display:'flex',gap:4,overflowX:'auto',scrollbarWidth:'none'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTabC(t.id)}
            style={{flex:'none',padding:'6px 10px',borderRadius:7,border:tabC===t.id?'none':`1px solid ${T.s2}`,background:tabC===t.id?`${T.gold}20`:'transparent',color:tabC===t.id?T.gold:T.muted,fontSize:10,fontWeight:tabC===t.id?700:400,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Ranking */}
      <div style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:12,overflow:'hidden',position:'relative'}}>
        <GL/>
        {rankingGeral.map((r,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:r.isMeu?`${T.gold}08`:'transparent',borderBottom:`1px solid ${T.s2}`}}>
            <div style={{width:28,height:28,borderRadius:6,background:i<3?[`${T.gold}20`,'rgba(148,163,184,.15)','rgba(180,83,9,.15)'][i]:T.s2,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"Georgia,serif",fontSize:12,fontWeight:900,color:i<3?[T.gold,'#94a3b8','#b45309'][i]:T.muted,flexShrink:0}}>
              {i+1}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:r.isMeu?800:500,color:r.isMeu?T.gold:T.text}}>{r.nome}</div>
            </div>
            <div style={{fontFamily:"Georgia,serif",fontSize:14,fontWeight:700,color:r.isMeu?T.gold:T.muted}}>{r.pontos} pts</div>
          </div>
        ))}
      </div>

      {/* Melhores pombos */}
      {pontosReais.length>0&&(
        <div>
          <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>MELHORES POMBOS {tabC==='geral'?'GERAIS':tabC.toUpperCase()}</div>
          {pontosReais.slice(0,5).map(([nome,pts],i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:T.surface,border:`1px solid ${T.s2}`,borderRadius:8,marginBottom:4}}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:12}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':'🔹'}</span>
                <span style={{fontSize:11,color:T.text,fontWeight:500}}>{nome}</span>
              </div>
              <span style={{fontSize:11,fontWeight:700,color:T.gold}}>{pts} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function VLProvas({ carreira, onVoltar, onGuardar }) {
  const [cl, setCL] = useState(()=>lerLS()||carreira)
  const c = cl
  const salvar = d => { gravarLS(d); setCL({...d}); onGuardar?.(d) }

  const [tab, setTab] = useState('proxima')
  const [provaAtiva, setProvaAtiva] = useState(null)
  const [pombosSelec, setPombosSelec] = useState([])
  const [estrategia, setEstrategia] = useState('normal')
  const [meteo, setMeteo] = useState(null)
  const [simulando, setSimulando] = useState(false)
  const [resultados, setResultados] = useState(null)
  const [pontosGanhos, setPontosGanhos] = useState(0)

  const historico = c.historico_provas || []
  const semanaAtual = c.semana || 1

  // Próxima prova disponível
  const proximaProva = PROVAS_CALENDARIO.find(p => p.semana >= semanaAtual && !historico.some(h=>h.provaId===p.id&&h.semana===semanaAtual))
  const provaEstaSemana = PROVAS_CALENDARIO.find(p => p.semana === semanaAtual)
  const provaRealizadaEstaSemana = provaEstaSemana && historico.some(h=>h.provaId===provaEstaSemana.id)

  const togglePombo = p => setPombosSelec(prev=>prev.find(x=>x.id===p.id)?prev.filter(x=>x.id!==p.id):prev.length<10?[...prev,p]:prev)

  const prepararProva = p => {
    setProvaAtiva(p)
    setMeteo(gerarMeteo(p.dist))
    setPombosSelec([])
    setTab('inscrever')
  }

  const iniciarProva = () => {
    if (!pombosSelec.length || !provaAtiva || !meteo) return
    const resJogador = simularProva(pombosSelec, provaAtiva, meteo, estrategia)
    // Adicionar adversários reais dos clubes IA
    const resIA = aiParaProva(c, provaAtiva)
    const todosSorted=[...resJogador,...resIA].sort((a,b)=>b.velocidade-a.velocidade)
    const nTotal=todosSorted.length
    const todos=todosSorted.map((r,i)=>({...r,posicao:i+1,total:nTotal,percentil:Math.round(((nTotal-i)/nTotal)*100)}))
    setResultados(todos)
    setSimulando(true)
  }

  const fecharSimulacao = () => {
    // Calcular pontos ganhos
    let pts = 0
    const meusPombos = pombosSelec
    const top2 = [...meusPombos].sort((a,b)=>{
      const ra=resultados.find(r=>r.pombo?.id===a.id)
      const rb=resultados.find(r=>r.pombo?.id===b.id)
      return (rb?.percentil||0)-(ra?.percentil||0)
    }).slice(0,2)

    top2.forEach(p=>{
      const r=resultados.find(r=>r.pombo?.id===p.id)
      if(!r)return
      if(r.posicao===1) pts+=provaAtiva.pontos
      else if(r.posicao<=3) pts+=Math.round(provaAtiva.pontos*.7)
      else if(r.percentil>=80) pts+=Math.round(provaAtiva.pontos*.4)
      else if(r.percentil>=50) pts+=Math.round(provaAtiva.pontos*.2)
    })
    setPontosGanhos(pts)

    // Guardar
    const novosRes = pombosSelec.map(p=>{
      const r=resultados.find(r=>r.pombo?.id===p.id)
      return{provaId:provaAtiva.id,provaNome:provaAtiva.nome,pomboId:p.id,pomboNome:p.nome,posicao:r?.posicao,total:r?.total,percentil:r?.percentil,velocidade:r?.velocidade,semana:semanaAtual,tipo:provaAtiva.tipo,nivel:provaAtiva.nivel}
    })
    const novosPombos=(c.pombos||[]).map(p=>{
      const r=resultados.find(r=>r.pombo?.id===p.id)
      if(!r)return p
      return{...p,provas:(p.provas||0)+1,vitorias:(p.vitorias||0)+(r.posicao===1?1:0),percentil_medio:Math.round(((p.percentil_medio||0)*(p.provas||0)+r.percentil)/((p.provas||0)+1)),fadiga:Math.min(100,(p.fadiga||0)+20),atributos:{...p.atributos,potencial_revelado:Math.min(100,(p.atributos?.potencial_revelado||0)+5)}}
    })
    const premio=top2.some(p=>resultados.find(r=>r.pombo?.id===p.id&&r.posicao<=3))?provaAtiva.premio:0
    const movsProva=premio>0?[...(c.movimentos||[]),{tipo:'premio',descricao:`Prémio: ${provaAtiva.nome}`,valor:premio,semana:semanaAtual}]:(c.movimentos||[])
    // Campeonato persistente: clubes IA pontuam apenas nas provas disputadas
    const ia={...(c.campeonato_ia||{clubes:POMBAIS_ADV.slice(0,7).map((n,i)=>({nome:n,forca:0.85-i*0.08})),pontos:{}})}
    ia.pontos={...ia.pontos}
    ia.clubes.forEach(cl=>{
      const ganho=Math.random()<cl.forca?Math.round(provaAtiva.pontos*(0.2+Math.random()*0.8)):0
      if(ganho){const e={...(ia.pontos[cl.nome]||{})};e.geral=(e.geral||0)+ganho;e[provaAtiva.tipo]=(e[provaAtiva.tipo]||0)+ganho;ia.pontos[cl.nome]=e}
    })
    salvar({...c,pombos:novosPombos,historico_provas:[...historico,...novosRes],orcamento:(c.orcamento||0)+premio,movimentos:movsProva,campeonato_ia:ia})
    setSimulando(false);setResultados(null);setProvaAtiva(null);setPombosSelec([]);setMeteo(null)
    setTab('campeonato')
  }

  // Stats
  const totalProvas=historico.length
  const vitorias=historico.filter(r=>r.posicao===1).length
  const melhorPct=historico.length?Math.max(...historico.map(r=>r.percentil||0)):0

  const tipoCfg = provaEstaSemana ? TIPO_CFG[provaEstaSemana.tipo] : null
  const divCfg = provaEstaSemana ? DIV_CFG[provaEstaSemana.nivel] : null

  return (
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:"system-ui,sans-serif"}}>
      {simulando&&resultados&&<SimulacaoAvancada prova={provaAtiva} resultados={resultados} pombosParticipantes={pombosSelec} meteo={meteo} estrategia={estrategia} onFechar={fecharSimulacao} pontosGanhos={pontosGanhos}/>}

      {/* Header */}
      <div style={{background:`linear-gradient(180deg,${T.surface},${T.bg})`,borderBottom:`1px solid ${T.s2}`,padding:'14px 16px',position:'relative'}}>
        <GL/>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <button onClick={onVoltar} style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:8,width:32,height:32,color:T.muted,cursor:'pointer',fontSize:16}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800}}>🏆 Provas & Campeonato</div>
            <div style={{display:'flex',gap:8}}>
              <span style={{fontSize:9,color:T.muted}}>{totalProvas} disputadas</span>
              <span style={{fontSize:9,color:T.gold}}>{vitorias} vitórias</span>
              <span style={{fontSize:9,color:T.success}}>Melhor P{melhorPct}%</span>
            </div>
          </div>
        </div>

        {/* Alerta prova disponível */}
        {provaEstaSemana && !provaRealizadaEstaSemana && (
          <div style={{padding:'10px 14px',background:`${tipoCfg?.cor||T.gold}10`,border:`1px solid ${tipoCfg?.cor||T.gold}30`,borderRadius:10,marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:tipoCfg?.cor||T.gold}}>⚠️ Prova disponível esta semana!</div>
              <div style={{fontSize:10,color:T.muted,marginTop:1}}>{tipoCfg?.icon} {provaEstaSemana.nome} · {provaEstaSemana.dist}km</div>
            </div>
            <button onClick={()=>prepararProva(provaEstaSemana)}
              style={{padding:'6px 12px',borderRadius:8,border:'none',background:tipoCfg?.cor||T.gold,color:'#050A14',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
              Inscrever
            </button>
          </div>
        )}

        <div style={{display:'flex',gap:5,overflowX:'auto',scrollbarWidth:'none'}}>
          {[['proxima','📅 Próxima'],['calendario','🗓️ Calendário'],['inscrever','🏁 Inscrever'],['campeonato','🏆 Campeonato'],['historico','📋 Historial']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:'none',padding:'7px 10px',borderRadius:7,border:tab===id?'none':`1px solid ${T.s2}`,background:tab===id?`${T.purple}30`:'transparent',color:tab===id?T.purple:T.muted,fontSize:10,fontWeight:tab===id?700:400,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>

        {/* PRÓXIMA */}
        {tab==='proxima'&&(
          proximaProva ? (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {/* Card principal da próxima prova */}
              {(()=>{
                const tc=TIPO_CFG[proximaProva.tipo]||TIPO_CFG.velocidade
                const dc=DIV_CFG[proximaProva.nivel]||DIV_CFG.div3
                const semanasAte=proximaProva.semana-semanaAtual
                return(
                  <div style={{background:`linear-gradient(135deg,${tc.cor}10,${T.surface})`,border:`1px solid ${tc.cor}30`,borderRadius:16,padding:'18px',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${tc.cor},transparent)`}}/>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                      <div>
                        <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:6}}>
                          <span style={{fontSize:11,color:dc.cor,background:dc.bg,padding:'3px 8px',borderRadius:5,fontWeight:700}}>{dc.label}</span>
                          <span style={{fontSize:11,color:tc.cor,fontWeight:600}}>{tc.icon} {tc.label}</span>
                        </div>
                        <div style={{fontSize:18,fontWeight:900,color:T.text,marginBottom:4}}>{proximaProva.nome}</div>
                        <div style={{display:'flex',gap:12}}>
                          <span style={{fontSize:11,color:T.muted}}>📍 {proximaProva.dist}km</span>
                          <span style={{fontSize:11,color:T.gold,fontWeight:600}}>🏅 {proximaProva.premio.toLocaleString()}€</span>
                          <span style={{fontSize:11,color:T.purple,fontWeight:600}}>🏆 {proximaProva.pontos}pts</span>
                        </div>
                      </div>
                      <div style={{textAlign:'center',background:semanasAte===0?`${T.gold}20`:T.s2,border:`1px solid ${semanasAte===0?T.gold:T.s2}`,borderRadius:10,padding:'10px 14px',minWidth:56}}>
                        <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:900,color:semanasAte===0?T.gold:T.muted,lineHeight:1}}>{semanasAte===0?'JÁ!':semanasAte}</div>
                        {semanasAte>0&&<div style={{fontSize:8,color:T.muted,fontWeight:700,marginTop:2}}>SEM.</div>}
                      </div>
                    </div>
                    {semanasAte===0&&(
                      <button onClick={()=>prepararProva(proximaProva)}
                        style={{width:'100%',padding:'13px',borderRadius:10,border:'none',background:`linear-gradient(135deg,${tc.cor},${tc.cor}cc)`,color:'#050A14',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 4px 20px ${tc.cor}40`}}>
                        🏁 Inscrever e Competir Agora
                      </button>
                    )}
                  </div>
                )
              })()}

              {/* Próximas 3 provas */}
              <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1}}>A SEGUIR</div>
              {PROVAS_CALENDARIO.filter(p=>p.semana>proximaProva.semana).slice(0,3).map(p=>{
                const tc=TIPO_CFG[p.tipo]
                const dc=DIV_CFG[p.nivel]
                return(
                  <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:T.surface,border:`1px solid ${T.s2}`,borderRadius:10}}>
                    <span style={{fontSize:16}}>{tc?.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:T.text}}>{p.nome}</div>
                      <div style={{fontSize:9,color:T.muted}}>{tc?.label} · {p.dist}km · Sem.{p.semana}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:10,color:dc?.cor,fontWeight:700}}>{dc?.label}</div>
                      <div style={{fontSize:9,color:T.gold}}>{p.pontos}pts</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ):(
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12}}>🏁</div>
              <div style={{fontSize:14,color:T.muted}}>Todas as provas desta época concluídas!</div>
            </div>
          )
        )}

        {/* CALENDÁRIO COMPLETO */}
        {tab==='calendario'&&PROVAS_CALENDARIO.map(p=>{
          const tc=TIPO_CFG[p.tipo]||TIPO_CFG.velocidade
          const dc=DIV_CFG[p.nivel]||DIV_CFG.div3
          const passada=historico.some(h=>h.provaId===p.id)
          const estaSemana=p.semana===semanaAtual
          const melhorRes=historico.filter(h=>h.provaId===p.id).sort((a,b)=>(b.percentil||0)-(a.percentil||0))[0]
          return(
            <div key={p.id} style={{background:estaSemana?`${tc.cor}0A`:T.surface,border:`1px solid ${estaSemana?tc.cor+'40':T.s2}`,borderRadius:10,padding:'10px 14px',opacity:passada&&!estaSemana?.6:1,position:'relative',overflow:'hidden'}}>
              {estaSemana&&<div style={{position:'absolute',top:0,left:0,right:0,height:2,background:tc.cor}}/>}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:5,alignItems:'center',marginBottom:4,flexWrap:'wrap'}}>
                    <span style={{fontSize:8,color:dc.cor,background:dc.bg,padding:'1px 5px',borderRadius:3,fontWeight:700}}>{dc.label.toUpperCase()}</span>
                    <span style={{fontSize:9,color:tc.cor,fontWeight:600}}>{tc.icon} {tc.label}</span>
                    {estaSemana&&<span style={{fontSize:8,color:T.gold,background:`${T.gold}15`,padding:'1px 5px',borderRadius:3,fontWeight:700}}>ESTA SEMANA</span>}
                    {passada&&melhorRes&&<span style={{fontSize:8,color:T.success,background:`${T.success}10`,padding:'1px 5px',borderRadius:3}}>✓ P{melhorRes.percentil}%</span>}
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:passada&&!estaSemana?T.muted:T.text}}>{p.nome}</div>
                  <div style={{fontSize:9,color:T.muted,marginTop:1}}>{p.dist}km · 🏅{p.premio.toLocaleString()}€ · 🏆{p.pontos}pts</div>
                </div>
                <div style={{minWidth:36,textAlign:'center'}}>
                  {passada?<div style={{fontSize:11,color:T.success}}>✓</div>:<div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:900,color:estaSemana?tc.cor:T.muted}}>{p.semana}</div>}
                  {!passada&&<div style={{fontSize:7,color:T.muted}}>SEM.</div>}
                </div>
              </div>
              {estaSemana&&!passada&&(
                <button onClick={()=>prepararProva(p)}
                  style={{marginTop:8,width:'100%',padding:'8px',borderRadius:7,border:'none',background:tc.cor,color:'#050A14',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  🏁 Inscrever
                </button>
              )}
            </div>
          )
        })}

        {/* INSCREVER */}
        {tab==='inscrever'&&(
          !provaAtiva?(
            <div>
              <div style={{fontSize:10,color:T.muted,marginBottom:10}}>Selecciona uma prova:</div>
              {PROVAS_CALENDARIO.filter(p=>p.semana>=semanaAtual&&!historico.some(h=>h.provaId===p.id)).slice(0,3).map(p=>{
                const tc=TIPO_CFG[p.tipo]
                return(
                  <div key={p.id} onClick={()=>prepararProva(p)}
                    style={{padding:'12px 14px',background:T.surface,border:`1px solid ${T.s2}`,borderRadius:10,marginBottom:6,cursor:'pointer',position:'relative',overflow:'hidden'}}>
                    <GL/>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>{tc?.icon} {p.nome}</div>
                    <div style={{fontSize:10,color:T.muted}}>{tc?.label} · {p.dist}km · Sem.{p.semana} · 🏆{p.pontos}pts</div>
                  </div>
                )
              })}
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {/* Info */}
              {(()=>{
                const tc=TIPO_CFG[provaAtiva.tipo]
                return(
                  <div style={{padding:'14px',background:`${tc?.cor||T.purple}0A`,border:`1px solid ${tc?.cor||T.purple}30`,borderRadius:12,position:'relative',overflow:'hidden'}}>
                    <GL/>
                    <div style={{fontSize:14,fontWeight:800,color:tc?.cor||T.purple,marginBottom:2}}>{tc?.icon} {provaAtiva.nome}</div>
                    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      <span style={{fontSize:10,color:T.muted}}>{tc?.label} · {provaAtiva.dist}km</span>
                      <span style={{fontSize:10,color:T.gold}}>🏅{provaAtiva.premio.toLocaleString()}€</span>
                      <span style={{fontSize:10,color:T.purple}}>🏆{provaAtiva.pontos}pts</span>
                      {meteo&&<span style={{fontSize:10,color:meteo.penalidade>.2?T.danger:meteo.penalidade>.05?T.gold:T.success}}>{meteo.label}</span>}
                    </div>
                  </div>
                )
              })()}

              {/* Meteo */}
              {meteo&&(
                <div style={{padding:'10px 14px',background:meteo.penalidade>.2?`${T.danger}08`:meteo.penalidade>.05?`${T.gold}08`:`${T.success}08`,border:`1px solid ${meteo.penalidade>.2?T.danger:meteo.penalidade>.05?T.gold:T.success}25`,borderRadius:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:meteo.penalidade>.2?T.danger:meteo.penalidade>.05?T.gold:T.success,marginBottom:2}}>🌤️ Previsão Meteorológica</div>
                  <div style={{fontSize:12,color:T.text,fontWeight:600}}>{meteo.label}</div>
                  <div style={{fontSize:10,color:T.muted,marginTop:2}}>{meteo.penalidade===0?'Excelentes condições — aproveita!':meteo.penalidade<.1?'Condições ligeiramente adversas':meteo.penalidade<.2?'Condições difíceis — estratégia importa':meteo.penalidade<.3?'Muito difícil — considera a estratégia conservadora':'⚠️ Extremamente difícil!'}</div>
                </div>
              )}

              {/* Estratégia */}
              <div>
                <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>ESTRATÉGIA</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                  {[
                    {id:'conservador',icon:'🛡️',label:'Conservador',c:T.success},
                    {id:'normal',icon:'⚖️',label:'Normal',c:T.blue},
                    {id:'agressivo',icon:'⚡',label:'Agressivo',c:T.danger},
                  ].map(s=>(
                    <div key={s.id} onClick={()=>setEstrategia(s.id)}
                      style={{padding:'10px 6px',borderRadius:8,border:`2px solid ${estrategia===s.id?s.c:T.s2}`,background:estrategia===s.id?`${s.c}10`:'transparent',cursor:'pointer',textAlign:'center',transition:'all .15s'}}>
                      <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                      <div style={{fontSize:10,fontWeight:700,color:estrategia===s.id?s.c:T.muted}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pombos com análise */}
              <div>
                <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>POMBOS ({pombosSelec.length}/10) — top 2 contam para o campeonato</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {(c.pombos||[]).filter(p=>p.estado==='activo').map(p=>{
                    const sel=pombosSelec.find(x=>x.id===p.id)
                    const cor=p.sexo==='F'?'#C084FC':T.blue
                    const forma=p.forma_atual||70
                    const fadiga=p.fadiga||0
                    const rec=forma>=65&&fadiga<50
                    return(
                      <div key={p.id} onClick={()=>togglePombo(p)}
                        style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:sel?`${cor}10`:T.surface,border:`1.5px solid ${sel?cor:T.s2}`,borderRadius:10,cursor:'pointer',transition:'all .15s',position:'relative',overflow:'hidden'}}>
                        {sel&&<GL/>}
                        <div style={{width:34,height:34,borderRadius:8,background:`${cor}15`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"Georgia,serif",fontSize:10,fontWeight:900,color:cor,flexShrink:0}}>{p.anilha?.slice(-3)}</div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',justifyContent:'space-between'}}>
                            <span style={{fontSize:12,fontWeight:700,color:sel?cor:T.text}}>{p.nome}</span>
                            {rec?<span style={{fontSize:8,color:T.success,background:`${T.success}15`,padding:'1px 5px',borderRadius:3,fontWeight:700}}>✅ REC.</span>:fadiga>60?<span style={{fontSize:8,color:T.danger}}>⚠️ Cansado</span>:null}
                          </div>
                          <div style={{display:'flex',gap:8,marginTop:4}}>
                            <div style={{display:'flex',alignItems:'center',gap:3}}>
                              <span style={{fontSize:8,color:T.muted}}>Forma</span>
                              <div style={{width:28,height:3,background:T.s2,borderRadius:2}}><div style={{height:'100%',width:`${forma}%`,background:forma>=65?T.success:forma>=40?T.gold:T.danger,borderRadius:2}}/></div>
                              <span style={{fontSize:8,fontWeight:700,color:forma>=65?T.success:forma>=40?T.gold:T.danger}}>{forma}%</span>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:3}}>
                              <span style={{fontSize:8,color:T.muted}}>Fadiga</span>
                              <div style={{width:28,height:3,background:T.s2,borderRadius:2}}><div style={{height:'100%',width:`${fadiga}%`,background:fadiga<30?T.success:fadiga<60?T.gold:T.danger,borderRadius:2}}/></div>
                              <span style={{fontSize:8,fontWeight:700,color:fadiga<30?T.success:fadiga<60?T.gold:T.danger}}>{fadiga}%</span>
                            </div>
                          </div>
                          <div style={{display:'flex',gap:6,marginTop:3,fontSize:8,color:T.muted}}>
                            <span>⚡<b style={{color:T.gold}}>{p.atributos?.velocidade??'-'}</b></span>
                            <span>🛡️<b style={{color:T.success}}>{p.atributos?.resistencia??'-'}</b></span>
                            <span>🧭<b style={{color:T.blue}}>{p.atributos?.orientacao??'-'}</b></span>
                            <span style={{marginLeft:'auto',color:T.purple,fontWeight:700}}>{p.especialidade||''}</span>
                          </div>
                        </div>
                        {sel&&<div style={{width:18,height:18,borderRadius:'50%',background:cor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:700,flexShrink:0}}>✓</div>}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{setProvaAtiva(null);setPombosSelec([])}}
                  style={{flex:1,padding:'12px',borderRadius:10,border:`1px solid ${T.s2}`,background:'transparent',color:T.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
                  Cancelar
                </button>
                <button onClick={iniciarProva} disabled={!pombosSelec.length}
                  style={{flex:2,padding:'12px',borderRadius:10,border:'none',background:pombosSelec.length?`linear-gradient(135deg,${T.purple},#7C3AED)`:T.s2,color:pombosSelec.length?'#fff':T.muted,fontSize:12,fontWeight:700,cursor:pombosSelec.length?'pointer':'default',fontFamily:'inherit',boxShadow:pombosSelec.length?`0 4px 16px ${T.purple}30`:'none'}}>
                  🚀 Iniciar Prova!
                </button>
              </div>
            </div>
          )
        )}

        {/* CAMPEONATO */}
        {tab==='campeonato'&&<PainelCampeonato carreira={c} provasRealizadas={historico}/>}

        {/* HISTORIAL */}
        {tab==='historico'&&(
          historico.length===0?(
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12}}>📋</div>
              <div style={{fontSize:13,color:T.muted}}>Sem provas ainda</div>
            </div>
          ):[...historico].reverse().map((r,i)=>{
            const tc=TIPO_CFG[r.tipo]||TIPO_CFG.velocidade
            return(
              <div key={i} style={{padding:'10px 14px',background:T.surface,border:`1px solid ${r.posicao===1?T.gold:r.posicao<=3?T.success:T.s2}`,borderRadius:10,position:'relative',overflow:'hidden'}}>
                {r.posicao===1&&<GL/>}
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:T.text}}>{tc.icon} {r.provaNome}</div>
                    <div style={{fontSize:9,color:T.muted}}>🐦 {r.pomboNome} · Sem.{r.semana}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:14,fontWeight:900,color:r.posicao===1?T.gold:r.posicao<=3?T.success:T.muted}}>{r.posicao}º/{r.total}</div>
                    <div style={{fontSize:9,color:T.success,fontWeight:700}}>P{r.percentil}%</div>
                  </div>
                </div>
                {r.velocidade&&<div style={{fontSize:9,color:T.muted}}>⚡ {r.velocidade} m/min</div>}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
