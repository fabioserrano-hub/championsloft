import { useState, useEffect, useRef } from 'react'

const T = {
  void:'#020509', depth:'#060F1A', ocean:'#0A1A2E', steel:'#112036',
  gold:'#C8A84B', goldL:'#E5C96A', goldXL:'#F5DFA0', goldD:'#7A6020',
  white:'#F0EDE8', fog:'#8899AA', ghost:'#445566',
  teal:'#1A9E82', tealL:'#2DD4A7',
  serif:"'Fraunces','Georgia',serif", mono:"'Space Mono','Courier New',monospace", sans:"'Inter',system-ui,sans-serif",
}

const HISTORIAS = [
  { num:'01', titulo:'O regresso', icon:'🕊️', corpo:'São 6 da manhã. O céu ainda está escuro. Olhas para o horizonte e o coração acelera — há um ponto pequenino que se aproxima. 800 quilómetros. 14 horas de voo. E agora está ali, a entrar pela portinhola.', impacto:'Com o Fly2Win, registas o tempo de chegada, calculas o percentil em segundos e o resultado fica no historial permanente do pombo para sempre.' },
  { num:'02', titulo:'A ninhada certa', icon:'🧬', corpo:'Décadas de conhecimento passam de pai para filho — qual o macho a usar, que fêmea combina, que linhagens se complementam. Essa sabedoria estava só na cabeça. Ou no caderno amarelado da gaveta.', impacto:'A IA analisa 3 gerações de consanguinidade, compara percentis de prova e sugere os cruzamentos com maior probabilidade de produzir um campeão.' },
  { num:'03', titulo:'O pedigree que conta a história', icon:'🌳', corpo:'Quando vendes um pombo de topo, não vendes apenas o animal. Vendes a sua história — quem foram os pais, os avós, os bisavós. Esse documento é o passaporte do teu trabalho como criador.', impacto:'Um PDF premium com 4 gerações, foto, conquistas, linhagem e o teu nome como criador. Pronto a enviar em segundos.' },
  { num:'04', titulo:'A época que não se esquece', icon:'📊', corpo:'No final de cada época, tens na cabeça os momentos altos. Mas os números — percentis, distâncias, pombos que surpreenderam — esses perdem-se. O ano que vem começas do zero.', impacto:'Relatório completo da época em PDF: ranking do efectivo, análise por especialidade, comparativo com anos anteriores e recomendações da IA para a época seguinte.' },
]

const MODULOS = [
  { icon:'🐦', nome:'Efectivo', cor:T.tealL, desc:'Cada pombo, um processo completo. Anilha, origem, saúde, especialidade e foto.' },
  { icon:'🏆', nome:'Provas', cor:T.goldL, desc:'Resultados e percentis calculados automaticamente. Historial por época.' },
  { icon:'🥚', nome:'Reprodução', cor:'#C084FC', desc:'Cacifos, posturas, alertas de eclosão. Zero esquecimentos.' },
  { icon:'🌳', nome:'Pedigree PDF', cor:T.gold, desc:'Árvore com 4 gerações em PDF premium. O teu cartão de visita como criador.' },
  { icon:'🧬', nome:'Casais IA', cor:T.tealL, desc:'Inteligência artificial sugere cruzamentos. Só no plano Elite.' },
  { icon:'📊', nome:'Analíticas', cor:'#4C8DFF', desc:'Heatmap de distâncias, tendências e comparação com médias nacionais.' },
  { icon:'🔨', nome:'Leilões', cor:T.goldL, desc:'Leiloa pombos e descendentes. Marketplace integrado com certificado QR.' },
  { icon:'🌐', nome:'LoftSocial', cor:T.tealL, desc:'Rede social columbófila. Feed, grupos, ranking e desafios semanais.' },
]

const PLANOS = [
  { id:'base', nome:'Base', preco:9.99, anual:99.90, diaM:'0,33', diaA:'0,27', cor:T.tealL,
    desc:'Para o criador que quer organizar o pombal',
    feats:['Pombos ilimitados','Provas & percentis','Reprodução & saúde','Pedigree PDF básico','Calendário FPC','Dashboard Pombal Hoje'] },
  { id:'pro', nome:'Pro', preco:11.99, anual:119.90, diaM:'0,40', diaA:'0,33', cor:T.tealL, destaque:true,
    desc:'Para o criador que quer ir mais longe',
    feats:['Tudo do Base','LoftSocial & Comunidade','Marketplace & Leilões','Mensagens directas','Rastreio de forma','Analíticas avançadas'] },
  { id:'elite', nome:'Elite AI', preco:15.99, anual:159.90, diaM:'0,53', diaA:'0,44', cor:T.gold, gold:true,
    desc:'Para o criador que quer o melhor',
    feats:['Tudo do Pro','Seleccionador de Casais IA','Relatório de Época PDF','Gestão de Clubes','Analíticas nacionais','Suporte prioritário'] },
]

const GRUPOS = [
  { label:'3–5 licenças', desc:'Pequenos clubes', pct:10,
    base:{ m:8.99, a:89.90, dM:'0,30', dA:'0,25' },
    pro:{ m:10.79, a:107.90, dM:'0,36', dA:'0,30' },
    elite:{ m:14.39, a:143.90, dM:'0,48', dA:'0,40' } },
  { label:'6–12 licenças', desc:'Clubes médios', pct:20,
    base:{ m:7.99, a:79.90, dM:'0,27', dA:'0,22' },
    pro:{ m:9.59, a:95.90, dM:'0,32', dA:'0,27' },
    elite:{ m:12.79, a:127.90, dM:'0,43', dA:'0,36' } },
  { label:'13+ licenças', desc:'Associações & Federações', pct:30,
    base:{ m:6.99, a:69.90, dM:'0,23', dA:'0,19' },
    pro:{ m:8.39, a:83.90, dM:'0,28', dA:'0,23' },
    elite:{ m:11.19, a:111.90, dM:'0,37', dA:'0,31' } },
]

const FAQ = [
  { q:'Preciso de instalar alguma coisa?', r:'Não. O Fly2Win funciona directamente no browser — computador, tablet ou telemóvel. Há também uma versão PWA que podes instalar como app.' },
  { q:'Os meus dados estão seguros?', r:'Sim. Dados armazenados em servidores europeus com encriptação. Nunca partilhamos dados com terceiros. Podes exportar ou apagar tudo a qualquer momento.' },
  { q:'Posso experimentar sem cartão de crédito?', r:'Sim. Os primeiros 30 dias são completamente gratuitos, sem cartão de crédito. Só pagas se quiseres continuar.' },
  { q:'Como funcionam as licenças de coletividade?', r:'A coletividade adquire as licenças e paga centralmente. O número total de licenças (independentemente do plano) determina o desconto. O administrador gere tudo a partir de um dashboard dedicado.' },
  { q:'O que é o plano Fundadores?', r:'Os primeiros 100 utilizadores têm acesso vitalício ao preço mais baixo — seja 13,99€/mês ou o valor de coletividade se for inferior. Preço fixo para sempre.' },
  { q:'Posso cancelar quando quiser?', r:'Sim, sem penalizações. Cancelas nas definições e a subscrição termina no fim do período pago.' },
]

function useInView() {
  const [inView, setInView] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if(e.isIntersecting){setInView(true);obs.disconnect()} },{threshold:0.15})
    if(ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  },[])
  return [ref, inView]
}

function Reveal({ children, delay=0, style={} }) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} style={{ opacity:inView?1:0, transform:inView?'none':'translateY(20px)', transition:`opacity .7s ease ${delay}ms, transform .7s ease ${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

function Anilha({ codigo, delay=0, rotate=0 }) {
  const [v, setV] = useState(false)
  useEffect(()=>{ const t=setTimeout(()=>setV(true),delay); return()=>clearTimeout(t) },[delay])
  return (
    <div style={{ fontFamily:T.mono, fontSize:10, fontWeight:700, color:T.gold, background:T.steel, border:`1px solid ${T.goldD}80`, borderRadius:3, padding:'3px 9px', letterSpacing:'.12em', transform:`rotate(${rotate}deg) ${v?'':'translateY(8px)'}`, opacity:v?1:0, transition:`all .7s ease ${delay}ms`, display:'inline-block' }}>{codigo}</div>
  )
}

export default function Landing({ onEntrar }) {
  const [scrollY, setScrollY] = useState(0)
  const [heroIn, setHeroIn] = useState(false)
  const [periodo, setPeriodo] = useState('mensal')
  const [historiaAtiva, setHistoriaAtiva] = useState(0)
  const [faqAberta, setFaqAberta] = useState(null)
  const [tabGrupo, setTabGrupo] = useState(0)
  const [fundadoresRestam] = useState(73)

  useEffect(()=>{
    const t=setTimeout(()=>setHeroIn(true),80)
    const h=()=>setScrollY(window.scrollY)
    window.addEventListener('scroll',h,{passive:true})
    return()=>{ clearTimeout(t); window.removeEventListener('scroll',h) }
  },[])

  const navSolid = scrollY > 50

  return (
    <div style={{ fontFamily:T.sans, background:T.void, color:T.white, overflowX:'hidden' }}>

      {/* NAVBAR */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:300, height:58, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 clamp(16px,5vw,56px)', background:navSolid?'rgba(2,5,9,.96)':'transparent', backdropFilter:navSolid?'blur(20px)':'none', borderBottom:navSolid?`1px solid ${T.ghost}30`:'none', transition:'all .4s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <img src="/logo.png" alt="Fly2Win" style={{ height:56, width:'auto', objectFit:'contain' }} />
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button onClick={onEntrar} style={{ background:'none', border:'none', color:T.fog, fontSize:13, cursor:'pointer', fontFamily:'inherit', padding:'7px 12px' }}>Entrar</button>
          <button onClick={onEntrar} style={{ background:`linear-gradient(135deg,${T.gold},${T.goldD})`, border:'none', color:T.void, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', padding:'9px 18px', borderRadius:6 }}>Começar grátis</button>
        </div>
      </nav>

      {/* BANNER FUNDADORES */}
      <div style={{ background:`linear-gradient(90deg,${T.goldD}40,${T.ocean},${T.goldD}40)`, borderBottom:`1px solid ${T.goldD}40`, padding:'9px clamp(16px,5vw,56px)', display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:58, flexWrap:'wrap' }}>
        <span style={{ fontSize:14 }}>👑</span>
        <span style={{ fontSize:12, color:T.white, fontWeight:600 }}>Campanha Fundadores — apenas <strong style={{ color:T.gold }}>{fundadoresRestam} lugares</strong> restantes</span>
        <span style={{ fontSize:12, color:T.fog }}>Preço mais baixo garantido para sempre</span>
        <button onClick={onEntrar} style={{ background:T.gold, color:T.void, border:'none', borderRadius:99, padding:'4px 14px', fontSize:11, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>Garantir lugar →</button>
      </div>

      {/* HERO */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px clamp(16px,5vw,56px) 60px', position:'relative', overflow:'hidden', textAlign:'center', background:`radial-gradient(ellipse 80% 60% at 50% 40%,${T.ocean}80,${T.void})` }}>
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
          <defs>
            <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke={T.ghost} strokeWidth=".3" opacity=".4"/></pattern>
            <radialGradient id="gm" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={T.void} stopOpacity="0"/><stop offset="100%" stopColor={T.void} stopOpacity="1"/></radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
          <rect width="100%" height="100%" fill="url(#gm)"/>
        </svg>
        <div style={{ position:'absolute', top:'20%', left:'4%' }}><Anilha codigo="PT·2026·00447" delay={900} rotate={-7}/></div>
        <div style={{ position:'absolute', top:'32%', right:'3%' }}><Anilha codigo="BE·2025·6071582" delay={1200} rotate={5}/></div>
        <div style={{ position:'absolute', bottom:'30%', left:'5%' }}><Anilha codigo="NL·2024·1840033" delay={1500} rotate={4}/></div>
        <div style={{ position:'absolute', bottom:'24%', right:'5%' }}><Anilha codigo="ES·2026·00912" delay={1800} rotate={-4}/></div>

        {/* Logo hero */}
        <div style={{ opacity:heroIn?1:0, transform:heroIn?'none':'scale(.9)', transition:'all 1s ease', marginBottom:32 }}>
          <img src="/logo.png" alt="Fly2Win" style={{ height:300, width:'auto', objectFit:'contain', filter:'drop-shadow(0 0 48px rgba(200,168,75,.5))' }} />
        </div>

        <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:`${T.goldD}25`, border:`1px solid ${T.goldD}60`, borderRadius:99, padding:'5px 14px', marginBottom:28, opacity:heroIn?1:0, transform:heroIn?'none':'translateY(-10px)', transition:'all .8s ease .1s' }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:T.gold, flexShrink:0 }}/>
          <span style={{ fontFamily:T.mono, fontSize:10, color:T.gold, letterSpacing:'.14em' }}>GESTÃO COLUMBÓFILA PREMIUM</span>
        </div>

        <h1 style={{ fontFamily:T.serif, fontSize:'clamp(34px,6.5vw,76px)', fontWeight:900, lineHeight:1.04, letterSpacing:'-.025em', margin:'0 0 16px', maxWidth:760, opacity:heroIn?1:0, transform:heroIn?'none':'translateY(20px)', transition:'all .9s ease .15s' }}>
          Décadas de paixão.<br/>
          <span style={{ background:`linear-gradient(125deg,${T.goldXL},${T.gold},${T.goldD})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Finalmente uma ferramenta</span><br/>à altura.
        </h1>

        {/* Tagline */}
        <div style={{ fontFamily:T.mono, fontSize:12, color:T.gold, letterSpacing:'.2em', textTransform:'uppercase', marginBottom:24, opacity:heroIn?1:0, transition:'all .9s ease .25s' }}>
          Fly to Win · Conquer the Skies
        </div>

        <p style={{ fontSize:'clamp(15px,2vw,18px)', color:T.fog, maxWidth:500, margin:'0 auto 44px', lineHeight:1.8, opacity:heroIn?1:0, transition:'all .9s ease .3s' }}>
          Do pedigree ao Seleccionador de Casais por IA — o Fly2Win trata de tudo para que te possas concentrar no que importa: criar pombos de topo.
        </p>

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', marginBottom:64, opacity:heroIn?1:0, transition:'all .9s ease .4s' }}>
          <button onClick={onEntrar} style={{ background:`linear-gradient(135deg,${T.gold},${T.goldD})`, border:'none', color:T.void, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', padding:'16px 40px', borderRadius:8, boxShadow:`0 0 40px ${T.goldD}50` }}>🕊️ Experimentar 30 dias grátis</button>
          <button onClick={onEntrar} style={{ background:'none', border:`1px solid ${T.ghost}`, color:T.fog, fontSize:14, cursor:'pointer', fontFamily:'inherit', padding:'16px 28px', borderRadius:8 }}>Ver a app →</button>
        </div>

        <div style={{ display:'flex', gap:'clamp(24px,4vw,56px)', flexWrap:'wrap', justifyContent:'center', opacity:heroIn?1:0, transition:'all .9s ease .5s' }}>
          {[{val:'800',suf:'km',label:'A distância que um pombo percorre num dia'},{val:'40',suf:'+',label:'Anos de tradição que a app preserva digitalmente'},{val:'3',suf:'ger.',label:'Gerações analisadas pelo Seleccionador IA'},{val:'30',suf:'dias',label:'Para experimentares tudo, sem compromisso'}].map(({val,suf,label})=>(
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:T.serif, fontSize:'clamp(28px,4vw,40px)', fontWeight:900, color:T.gold, lineHeight:1 }}>{val}<span style={{ fontSize:'.5em', color:T.goldD }}>{suf}</span></div>
              <div style={{ fontSize:11, color:T.fog, marginTop:6, maxWidth:120, lineHeight:1.4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HISTÓRIAS */}
      <section style={{ padding:'clamp(72px,9vw,112px) clamp(16px,5vw,56px)', background:T.depth }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <Reveal>
            <div style={{ fontFamily:T.mono, fontSize:10, color:T.ghost, letterSpacing:'.16em', textTransform:'uppercase', marginBottom:14 }}>Por que isto importa</div>
            <h2 style={{ fontFamily:T.serif, fontSize:'clamp(28px,4vw,46px)', fontWeight:900, lineHeight:1.1, marginBottom:56, maxWidth:540 }}>Cada pombo tem uma história. Está na altura de a registar.</h2>
          </Reveal>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {HISTORIAS.map((h,i)=>(
              <Reveal key={h.num} delay={i*80}>
                <div onClick={()=>setHistoriaAtiva(historiaAtiva===i?-1:i)} style={{ padding:'clamp(24px,3vw,36px)', borderTop:`1px solid ${T.ghost}25`, cursor:'pointer', background:historiaAtiva===i?`${T.ocean}60`:'transparent', transition:'background .3s' }}>
                  <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
                    <div style={{ fontFamily:T.mono, fontSize:11, color:T.ghost, letterSpacing:'.08em', flexShrink:0, marginTop:3, minWidth:24 }}>{h.num}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:historiaAtiva===i?16:0 }}>
                        <h3 style={{ fontFamily:T.serif, fontSize:'clamp(20px,2.5vw,28px)', fontWeight:900, color:historiaAtiva===i?T.white:T.fog, transition:'color .3s' }}>{h.icon} {h.titulo}</h3>
                        <span style={{ color:T.ghost, fontSize:20, transform:historiaAtiva===i?'rotate(45deg)':'none', transition:'transform .3s' }}>+</span>
                      </div>
                      {historiaAtiva===i&&(
                        <div>
                          <p style={{ color:T.fog, lineHeight:1.85, fontSize:15, marginBottom:20, fontStyle:'italic', maxWidth:620 }}>"{h.corpo}"</p>
                          <div style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'14px 18px', background:`${T.goldD}18`, border:`1px solid ${T.goldD}40`, borderRadius:8, maxWidth:620 }}>
                            <span style={{ color:T.gold, fontSize:18, flexShrink:0 }}>✦</span>
                            <p style={{ fontSize:13, color:T.goldXL, lineHeight:1.7, margin:0 }}>{h.impacto}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
            <div style={{ borderTop:`1px solid ${T.ghost}25` }}/>
          </div>
        </div>
      </section>

      {/* MÓDULOS */}
      <section style={{ padding:'clamp(72px,9vw,112px) clamp(16px,5vw,56px)', background:T.void }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <Reveal>
            <div style={{ fontFamily:T.mono, fontSize:10, color:T.ghost, letterSpacing:'.16em', textTransform:'uppercase', marginBottom:14 }}>Plataforma</div>
            <h2 style={{ fontFamily:T.serif, fontSize:'clamp(28px,4vw,46px)', fontWeight:900, lineHeight:1.1, marginBottom:48, maxWidth:420 }}>Tudo o que o teu pombal precisa, num só lugar.</h2>
          </Reveal>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:2 }}>
            {MODULOS.map((m,i)=>(
              <Reveal key={m.nome} delay={i*50}>
                <div style={{ padding:'22px 20px', background:T.depth, border:`1px solid ${T.ghost}20`, position:'relative', overflow:'hidden', transition:'background .25s' }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.ocean}
                  onMouseLeave={e=>e.currentTarget.style.background=T.depth}>
                  <div style={{ fontSize:26, marginBottom:10 }}>{m.icon}</div>
                  <div style={{ fontFamily:T.serif, fontSize:14, fontWeight:700, color:T.white, marginBottom:6 }}>{m.nome}</div>
                  <div style={{ fontSize:12, color:T.fog, lineHeight:1.65 }}>{m.desc}</div>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:m.cor, opacity:.5 }}/>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SELECCIONADOR IA */}
      <section style={{ padding:'clamp(72px,9vw,112px) clamp(16px,5vw,56px)', background:T.depth, borderTop:`1px solid ${T.ghost}15` }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'clamp(36px,5vw,72px)', alignItems:'center' }}>
          <Reveal>
            <div style={{ fontFamily:T.mono, fontSize:10, color:T.gold, letterSpacing:'.16em', textTransform:'uppercase', marginBottom:14 }}>Elite AI</div>
            <h2 style={{ fontFamily:T.serif, fontSize:'clamp(26px,3.5vw,42px)', fontWeight:900, lineHeight:1.1, marginBottom:20 }}>O teu pai sabia qual o melhor casal. Agora a IA também sabe.</h2>
            <p style={{ color:T.fog, lineHeight:1.85, marginBottom:28, fontSize:15 }}>Décadas de conhecimento intuitivo sobre pedigrees, linhagens e consanguinidade — o Seleccionador de Casais faz esses cálculos em segundos, com objectividade total.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:32 }}>
              {[['Analisa todas as combinações do teu efectivo',T.tealL],['Calcula consanguinidade até à 3ª geração',T.tealL],['Score 0–100 por par com justificação da IA',T.gold],['Powered by Claude Sonnet (Anthropic)',T.gold]].map(([f,cor])=>(
                <div key={f} style={{ display:'flex', gap:10, fontSize:13, color:T.white }}>
                  <span style={{ color:cor, flexShrink:0, fontWeight:700, marginTop:1 }}>✦</span>{f}
                </div>
              ))}
            </div>
            <button onClick={onEntrar} style={{ background:`linear-gradient(135deg,${T.gold},${T.goldD})`, border:'none', color:T.void, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', padding:'12px 28px', borderRadius:7 }}>Experimentar Elite AI →</button>
          </Reveal>
          <Reveal delay={150}>
            <div style={{ background:`linear-gradient(160deg,${T.ocean},${T.depth})`, border:`1px solid ${T.goldD}50`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.ghost}20`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontFamily:T.serif, fontSize:13, fontWeight:700, color:T.gold }}>🧬 Seleccionador de Casais</div>
                <div style={{ fontFamily:T.mono, fontSize:9, color:T.ghost }}>Época 2026</div>
              </div>
              <div style={{ padding:'16px 18px' }}>
                {[{medal:'🥇',par:'Zeus × Atena',score:95,label:'Excelente',cor:T.tealL,consang:'3%'},{medal:'🥈',par:'Ares × Hera',score:82,label:'Bom',cor:T.gold,consang:'8%'},{medal:'🥉',par:'Apolo × Artemis',score:71,label:'Bom',cor:'#A78BFA',consang:'5%'}].map(({medal,par,score,label,cor,consang})=>(
                  <div key={par} style={{ marginBottom:10, padding:'12px 14px', background:`${T.void}60`, borderRadius:8, border:`1px solid ${cor}20` }}>
                    <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                      <span style={{ fontSize:16 }}>{medal}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:T.white }}>{par}</div>
                        <div style={{ fontFamily:T.mono, fontSize:9, color:T.ghost }}>Consang. {consang}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:T.serif, fontSize:22, fontWeight:900, color:cor }}>{score}</div>
                        <div style={{ fontSize:9, color:T.ghost }}>{label}</div>
                      </div>
                    </div>
                    <div style={{ height:3, background:`${T.ghost}30`, borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${score}%`, background:cor, borderRadius:2 }}/>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:12, padding:'12px 14px', background:`${T.goldD}15`, border:`1px solid ${T.goldD}35`, borderRadius:8 }}>
                  <div style={{ fontSize:10, color:T.gold, fontWeight:700, marginBottom:6 }}>🤖 Análise IA — Claude Sonnet</div>
                  <p style={{ fontSize:11, color:T.fog, lineHeight:1.7, margin:0, fontStyle:'italic' }}>"Zeus × Atena apresenta consanguinidade de apenas 3% e linhagens complementares. Cruzamento altamente recomendado para a época 2026."</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PREÇOS INDIVIDUAIS */}
      <section style={{ padding:'clamp(72px,9vw,112px) clamp(16px,5vw,56px)', background:T.depth }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <Reveal style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ fontFamily:T.mono, fontSize:10, color:T.ghost, letterSpacing:'.16em', textTransform:'uppercase', marginBottom:14 }}>Preços Individuais</div>
            <h2 style={{ fontFamily:T.serif, fontSize:'clamp(28px,4vw,44px)', fontWeight:900, marginBottom:12 }}>Menos de um café. Toda a época.</h2>
            <p style={{ color:T.fog, marginBottom:24 }}>30 dias grátis — sem cartão de crédito, sem compromisso.</p>
            <div style={{ display:'inline-flex', background:T.ocean, border:`1px solid ${T.ghost}30`, borderRadius:99, padding:3 }}>
              {[['mensal','Mensal'],['anual','Anual (2 meses grátis)']].map(([p,l])=>(
                <button key={p} onClick={()=>setPeriodo(p)} style={{ padding:'7px 18px', borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:periodo===p?`linear-gradient(135deg,${T.gold},${T.goldD})`:'none', color:periodo===p?T.void:T.fog, transition:'all .2s' }}>{l}</button>
              ))}
            </div>
          </Reveal>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16, alignItems:'start' }}>
            {PLANOS.map((p,i)=>{
              const preco = periodo==='anual' ? (p.anual/12).toFixed(2) : p.preco.toFixed(2)
              const dia = periodo==='anual' ? p.diaA : p.diaM
              return (
                <Reveal key={p.id} delay={i*80}>
                  <div style={{ padding:28, borderRadius:10, position:'relative', background:p.gold?`linear-gradient(160deg,${T.ocean},${T.depth})`:T.void, border:`1px solid ${p.gold?T.goldD+'60':p.destaque?T.teal+'40':T.ghost+'25'}`, boxShadow:p.gold?`0 0 48px ${T.goldD}20`:'none', transform:p.destaque?'scale(1.03)':'none' }}>
                    {p.destaque&&<div style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)', background:T.teal, color:T.void, fontSize:10, fontWeight:800, padding:'3px 14px', borderRadius:99, whiteSpace:'nowrap' }}>MAIS ESCOLHIDO</div>}
                    {p.gold&&<div style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)', background:`linear-gradient(135deg,${T.gold},${T.goldD})`, color:T.void, fontSize:10, fontWeight:800, padding:'3px 14px', borderRadius:99, whiteSpace:'nowrap' }}>👑 COM INTELIGÊNCIA ARTIFICIAL</div>}
                    <div style={{ fontFamily:T.mono, fontSize:10, fontWeight:700, color:p.cor, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:6 }}>{p.nome}</div>
                    <div style={{ fontSize:12, color:T.ghost, marginBottom:20 }}>{p.desc}</div>
                    <div style={{ marginBottom:4 }}>
                      {periodo==='anual' ? (
                        <>
                          <span style={{ fontFamily:T.serif, fontSize:40, fontWeight:900, color:T.white, lineHeight:1 }}>{p.anual.toFixed(2)}€</span>
                          <span style={{ fontSize:12, color:T.ghost }}>/ano</span>
                          <div style={{ fontSize:11, color:'#2DD4A7', marginTop:3, fontWeight:600 }}>✓ 2 meses grátis incluídos · equivale a {preco}€/mês</div>
                        </>
                      ) : (
                        <>
                          <span style={{ fontFamily:T.serif, fontSize:40, fontWeight:900, color:T.white, lineHeight:1 }}>{preco}€</span>
                          <span style={{ fontSize:12, color:T.ghost }}>/mês</span>
                        </>
                      )}
                    </div>
                    <div style={{ fontFamily:T.mono, fontSize:10, color:p.cor, marginBottom:24 }}>☕ {dia}€ por dia</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
                      {p.feats.map(f=>(
                        <div key={f} style={{ display:'flex', gap:8, fontSize:12, color:'#d1d9e0', alignItems:'flex-start' }}>
                          <span style={{ color:p.cor, flexShrink:0 }}>✦</span>{f}
                        </div>
                      ))}
                    </div>
                    <button onClick={onEntrar} style={{ width:'100%', padding:'12px', borderRadius:7, fontSize:13, fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', background:p.gold?`linear-gradient(135deg,${T.gold},${T.goldD})`:p.destaque?T.teal:T.steel, color:p.gold||p.destaque?T.void:T.white }}>Começar grátis →</button>
                  </div>
                </Reveal>
              )
            })}
          </div>

          {/* Fundadores */}
          <Reveal delay={200}>
            <div style={{ marginTop:24, padding:'20px 24px', background:`linear-gradient(135deg,${T.goldD}20,${T.ocean})`, border:`1px solid ${T.goldD}40`, borderRadius:12, display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:28 }}>👑</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:T.serif, fontSize:16, fontWeight:900, color:T.gold, marginBottom:3 }}>Plano Fundadores — preço mais baixo garantido para sempre</div>
                <div style={{ fontSize:13, color:T.fog, lineHeight:1.6 }}>Os primeiros 100 utilizadores ficam com o preço mais baixo disponível — seja 13,99€/mês individual ou o valor de coletividade se for inferior. <strong style={{ color:T.white }}>Preço fixo para sempre</strong>, independentemente de quaisquer ajustes futuros. Apenas <strong style={{ color:T.white }}>{fundadoresRestam} lugares</strong> restantes.</div>
              </div>
              <button onClick={onEntrar} style={{ background:`linear-gradient(135deg,${T.gold},${T.goldD})`, border:'none', color:T.void, borderRadius:8, padding:'10px 20px', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>Garantir lugar</button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PREÇOS COLETIVIDADES */}
      <section style={{ padding:'clamp(72px,9vw,112px) clamp(16px,5vw,56px)', background:T.void }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <Reveal style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ fontFamily:T.mono, fontSize:10, color:T.ghost, letterSpacing:'.16em', textTransform:'uppercase', marginBottom:14 }}>Licenças Institucionais</div>
            <h2 style={{ fontFamily:T.serif, fontSize:'clamp(26px,4vw,40px)', fontWeight:900, marginBottom:12 }}>Para coletividades e clubes columbófilos</h2>
            <p style={{ color:T.fog, maxWidth:560, margin:'0 auto 32px', lineHeight:1.7 }}>A coletividade adquire licenças para os seus sócios e paga centralmente. O número total de licenças determina o desconto, independentemente do plano escolhido. Gestão centralizada pelo presidente ou secretário.</p>

            <div style={{ display:'inline-flex', background:T.ocean, border:`1px solid ${T.ghost}30`, borderRadius:99, padding:3, marginBottom:24 }}>
              {GRUPOS.map((g,i)=>(
                <button key={i} onClick={()=>setTabGrupo(i)} style={{ padding:'7px 16px', borderRadius:99, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:tabGrupo===i?`linear-gradient(135deg,${T.gold},${T.goldD})`:'none', color:tabGrupo===i?T.void:T.fog, transition:'all .2s', whiteSpace:'nowrap' }}>
                  {GRUPOS[i].label} (−{GRUPOS[i].pct}%)
                </button>
              ))}
            </div>

            <div style={{ fontSize:12, color:T.fog, marginBottom:32 }}>{GRUPOS[tabGrupo].desc} · desconto de <strong style={{ color:T.gold }}>{GRUPOS[tabGrupo].pct}%</strong> sobre o preço de tabela</div>
          </Reveal>

          <div style={{ display:'flex', justifyContent:'center', marginBottom:32 }}>
            <div style={{ display:'inline-flex', background:T.ocean, border:`1px solid ${T.ghost}30`, borderRadius:99, padding:3 }}>
              {[['mensal','Mensal'],['anual','Anual (2 meses grátis)']].map(([p,l])=>(
                <button key={p} onClick={()=>setPeriodo(p)} style={{ padding:'7px 18px', borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:periodo===p?`linear-gradient(135deg,${T.gold},${T.goldD})`:'none', color:periodo===p?T.void:T.fog, transition:'all .2s' }}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16 }}>
            {PLANOS.filter(p=>p.id!=='base').map((p,i)=>{
              const g = GRUPOS[tabGrupo]
              const gp = g[p.id]
              const preco = periodo==='anual' ? (gp.a/12).toFixed(2) : gp.m.toFixed(2)
              const dia = periodo==='anual' ? gp.dA : gp.dM
              // Range de licenças: "3–5" → [3,5], "6–12" → [6,12], "13+" → [13,20]
              const labelParts = g.label.split(' ')[0] // "3–5", "6–12", "13+"
              const [minLic, maxLic] = labelParts.includes('–')
                ? labelParts.split('–').map(Number)
                : [parseInt(labelParts), parseInt(labelParts)+7]
              const totalMin = (parseFloat(preco)*minLic).toFixed(0)
              const totalMax = (parseFloat(preco)*maxLic).toFixed(0)
              const totalLabel = periodo==='anual'
                ? `${(gp.a*minLic).toFixed(0)}–${(gp.a*maxLic).toFixed(0)}€/ano total`
                : `${totalMin}–${totalMax}€/mês total`
              return (
                <Reveal key={p.id} delay={i*80}>
                  <div style={{ padding:24, borderRadius:10, background:p.gold?`linear-gradient(160deg,${T.ocean},${T.depth})`:T.depth, border:`1px solid ${p.gold?T.goldD+'40':T.ghost+'25'}`, position:'relative' }}>
                    <div style={{ position:'absolute', top:-10, right:16, background:`${T.gold}`, color:T.void, fontSize:10, fontWeight:800, padding:'2px 10px', borderRadius:99 }}>−{g.pct}%</div>
                    <div style={{ fontFamily:T.mono, fontSize:10, fontWeight:700, color:p.cor, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:8 }}>{p.nome}</div>
                    <div style={{ marginBottom:4 }}>
                      {periodo==='anual' ? (
                        <>
                          <span style={{ fontFamily:T.serif, fontSize:36, fontWeight:900, color:T.white }}>{gp.a.toFixed(2)}€</span>
                          <span style={{ fontSize:12, color:T.ghost }}>/licença/ano</span>
                          <div style={{ fontSize:11, color:'#2DD4A7', marginTop:3, fontWeight:600 }}>✓ 2 meses grátis incluídos · equiv. {preco}€/mês</div>
                        </>
                      ) : (
                        <>
                          <span style={{ fontFamily:T.serif, fontSize:36, fontWeight:900, color:T.white }}>{preco}€</span>
                          <span style={{ fontSize:12, color:T.ghost }}>/licença/mês</span>
                        </>
                      )}
                    </div>
                    <div style={{ fontFamily:T.mono, fontSize:10, color:p.cor, marginBottom:16 }}>☕ {dia}€ por licença/dia</div>
                    <div style={{ padding:'10px 12px', background:`${T.gold}10`, border:`1px solid ${T.goldD}30`, borderRadius:8, marginBottom:16 }}>
                      <div style={{ fontSize:10, color:T.ghost, marginBottom:2 }}>Para {g.label.split(' ')[0]} licenças ({periodo})</div>
                      <div style={{ fontFamily:T.serif, fontSize:18, fontWeight:900, color:T.gold }}>
                        {totalLabel}
                      </div>
                    </div>
                    <button onClick={onEntrar} style={{ width:'100%', padding:'10px', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', background:p.gold?`linear-gradient(135deg,${T.gold},${T.goldD})`:T.steel, color:p.gold?T.void:T.white }}>Contactar →</button>
                  </div>
                </Reveal>
              )
            })}
          </div>

          <Reveal style={{ marginTop:24, textAlign:'center' }}>
            <div style={{ padding:'16px 20px', background:`${T.goldD}12`, border:`1px solid ${T.goldD}30`, borderRadius:10, display:'inline-block', maxWidth:600 }}>
              <div style={{ fontSize:13, color:T.white, fontWeight:600, marginBottom:6 }}>🏛️ Como aderir como coletividade</div>
              <div style={{ fontSize:12, color:T.fog, lineHeight:1.7 }}>Envia email para <strong style={{ color:T.gold }}>suporte@fly2win.pt</strong> com o nome do clube, NIF, número de sócios e plano pretendido. A equipa Fly2Win configura tudo.</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding:'clamp(72px,9vw,112px) clamp(16px,5vw,56px)', background:T.depth }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <Reveal style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ fontFamily:T.mono, fontSize:10, color:T.ghost, letterSpacing:'.16em', textTransform:'uppercase', marginBottom:14 }}>FAQ</div>
            <h2 style={{ fontFamily:T.serif, fontSize:'clamp(26px,4vw,40px)', fontWeight:900 }}>Perguntas frequentes</h2>
          </Reveal>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {FAQ.map((f,i)=>(
              <Reveal key={i} delay={i*40}>
                <div onClick={()=>setFaqAberta(faqAberta===i?null:i)} style={{ padding:'20px 0', borderTop:`1px solid ${T.ghost}20`, cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:faqAberta===i?T.white:T.fog, transition:'color .2s' }}>{f.q}</div>
                    <span style={{ color:T.ghost, fontSize:18, flexShrink:0, transform:faqAberta===i?'rotate(45deg)':'none', transition:'transform .25s' }}>+</span>
                  </div>
                  {faqAberta===i&&<div style={{ fontSize:13, color:T.fog, lineHeight:1.8, marginTop:12 }}>{f.r}</div>}
                </div>
              </Reveal>
            ))}
            <div style={{ borderTop:`1px solid ${T.ghost}20` }}/>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding:'clamp(88px,11vw,130px) clamp(16px,5vw,56px)', background:T.void, textAlign:'center', borderTop:`1px solid ${T.ghost}15`, position:'relative', overflow:'hidden' }}>
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
          <defs><radialGradient id="cta" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={T.goldD} stopOpacity=".12"/><stop offset="100%" stopColor={T.void} stopOpacity="0"/></radialGradient></defs>
          <rect width="100%" height="100%" fill="url(#cta)"/>
        </svg>
        <Reveal style={{ position:'relative', maxWidth:580, margin:'0 auto' }}>
          <img src="/logo.png" alt="Fly2Win" style={{ height:120, width:'auto', objectFit:'contain', marginBottom:24, filter:'drop-shadow(0 0 36px rgba(200,168,75,.45))' }} />
          <h2 style={{ fontFamily:T.serif, fontSize:'clamp(32px,5vw,56px)', fontWeight:900, lineHeight:1.05, marginBottom:12 }}>
            O próximo campeão<br/>
            <span style={{ background:`linear-gradient(125deg,${T.goldXL},${T.gold})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>já está no teu pombal.</span>
          </h2>
          <div style={{ fontFamily:T.mono, fontSize:11, color:T.gold, letterSpacing:'.18em', textTransform:'uppercase', marginBottom:28 }}>Fly to Win · Conquer the Skies</div>
          <p style={{ color:T.fog, fontSize:16, lineHeight:1.8, marginBottom:44, maxWidth:420, margin:'0 auto 44px' }}>Falta apenas a ferramenta certa para o identificar, criar e registar para a posteridade.</p>
          <button onClick={onEntrar} style={{ background:`linear-gradient(135deg,${T.gold},${T.goldD})`, border:'none', color:T.void, fontSize:16, fontWeight:900, cursor:'pointer', fontFamily:'inherit', padding:'18px 52px', borderRadius:9, boxShadow:`0 16px 48px ${T.goldD}40`, display:'block', margin:'0 auto 20px' }}>Começar grátis agora</button>
          <div style={{ fontSize:12, color:T.ghost }}>Já tens conta? <span style={{ color:T.gold, cursor:'pointer' }} onClick={onEntrar}>Entrar →</span></div>
          <div style={{ marginTop:32, display:'flex', gap:28, justifyContent:'center', flexWrap:'wrap' }}>
            {['30 dias grátis','Sem cartão de crédito','Cancela quando quiseres'].map(l=>(
              <div key={l} style={{ fontSize:12, color:T.ghost, display:'flex', alignItems:'center', gap:6 }}><span style={{ color:T.tealL }}>✓</span>{l}</div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* RODAPÉ */}
      <footer style={{ borderTop:`1px solid ${T.ghost}20`, padding:'24px clamp(16px,5vw,56px)', background:T.void }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <img src="/logo.png" alt="Fly2Win" style={{ height:28, width:'auto', objectFit:'contain' }} />
            <span style={{ fontFamily:T.mono, fontSize:10, color:T.ghost }}>© 2026</span>
          </div>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
            {['Termos','Privacidade','Suporte'].map(l=>(
              <span key={l} style={{ fontSize:12, color:T.ghost, cursor:'pointer' }} onClick={onEntrar}>{l}</span>
            ))}
          </div>
          <div style={{ fontFamily:T.mono, fontSize:10, color:T.ghost }}>For pigeon fanciers worldwide 🌍</div>
        </div>
        <div style={{ borderTop:`1px solid ${T.ghost}15`, paddingTop:16, display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center' }}>
          {['🇵🇹 Portugal','🇧🇷 Brasil','🇪🇸 España','🇳🇱 Nederland','🇧🇪 Belgique'].map(l=>(
            <span key={l} style={{ fontSize:11, color:T.ghost }}>{l}</span>
          ))}
        </div>
      </footer>

      <style>{`@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}`}</style>
    </div>
  )
}
