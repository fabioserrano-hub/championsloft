// src/modules/virtualLoft/screens/VLNinhadas.jsx
import { useState } from 'react'
import { cruzamento, gerarPombo, NOMES, PERSONALIDADES } from '../engine/genetics'

function gerarAnilha(ano = 2025) {
  return `VL-${ano}-${String(Math.floor(Math.random()*99999)).padStart(5,'0')}`
}

function corAttr(v) {
  return v>=80?'#2DD4A7':v>=65?'#4C8DFF':v>=45?'#D4AF37':'#f87171'
}

function PomboMini({ pombo, selecionado, onClick, idioma }) {
  const isFemea = pombo.sexo === 'F'
  const cor = isFemea ? '#c084fc' : '#4C8DFF'
  return (
    <div onClick={onClick} style={{ padding:'10px 12px', background: selecionado?`${cor}15`:'rgba(255,255,255,.02)', border:`1.5px solid ${selecionado?cor:'rgba(255,255,255,.06)'}`, borderRadius:10, cursor:'pointer', transition:'all .15s' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:`${cor}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:cor, fontFamily:"'Fraunces',serif" }}>
          {pombo.anilha?.slice(-3)}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:700, color: selecionado?cor:'#fff' }}>{pombo.nome}</div>
          <div style={{ fontSize:10, color:'#475569' }}>{pombo.sexo==='M'?'♂':'♀'} · {pombo.especialidade}</div>
        </div>
        <div style={{ display:'flex', gap:1 }}>
          {Array.from({length:5}).map((_,i)=><div key={i} style={{ fontSize:7, color:i<pombo.rating?'#D4AF37':'rgba(255,255,255,.1)' }}>★</div>)}
        </div>
      </div>
      {/* Atributos chave */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4, marginTop:8 }}>
        {['velocidade','resistencia','orientacao'].map(a=>(
          <div key={a} style={{ textAlign:'center' }}>
            <div style={{ fontSize:11, fontWeight:700, color:corAttr(pombo.atributos[a]) }}>{pombo.atributos[a]}</div>
            <div style={{ fontSize:8, color:'#475569' }}>{a.slice(0,3).toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PrevisaoGentica({ pai, mae, idioma }) {
  if (!pai || !mae) return null

  // Calcular previsão dos filhos
  const pais = pai.atributos
  const maes = mae.atributos
  const attrs = ['velocidade','resistencia','orientacao','inteligencia','coragem']

  const previsao = attrs.map(a => ({
    attr: a,
    min: Math.max(1, Math.round(Math.min(pais[a],maes[a]) * 0.85)),
    med: Math.round((pais[a]+maes[a])/2),
    max: Math.min(99, Math.round(Math.max(pais[a],maes[a]) * 1.15)),
  }))

  const attrNames = {
    pt:{velocidade:'Velocidade',resistencia:'Resistência',orientacao:'Orientação',inteligencia:'Inteligência',coragem:'Coragem'},
    en:{velocidade:'Speed',resistencia:'Stamina',orientacao:'Navigation',inteligencia:'Intelligence',coragem:'Courage'},
    es:{velocidade:'Velocidad',resistencia:'Resistencia',orientacao:'Orientación',inteligencia:'Inteligencia',coragem:'Coraje'},
  }
  const names = attrNames[idioma] || attrNames.pt

  // Potencial estimado
  const potencialMedio = Math.round((pai.atributos.potencial_oculto + mae.atributos.potencial_oculto) / 2)
  const chanceExcepcional = potencialMedio > 70 ? 'Alta' : potencialMedio > 50 ? 'Média' : 'Baixa'

  return (
    <div style={{ padding:'14px', background:'rgba(168,85,247,.06)', border:'1px solid rgba(168,85,247,.2)', borderRadius:12 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#A855F7', marginBottom:10 }}>
        🔬 {idioma==='en'?'Genetic Preview':idioma==='es'?'Previsión Genética':'Previsão Genética'}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {previsao.map(p => (
          <div key={p.attr} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:70, fontSize:9, color:'#7A8699' }}>{names[p.attr]}</div>
            <div style={{ flex:1, height:4, background:'rgba(255,255,255,.06)', borderRadius:2, position:'relative' }}>
              <div style={{ position:'absolute', left:`${(p.min/99)*100}%`, right:`${((99-p.max)/99)*100}%`, height:'100%', background:'rgba(168,85,247,.4)', borderRadius:2 }}/>
              <div style={{ position:'absolute', left:`${(p.med/99)*100}%`, transform:'translateX(-50%)', width:6, height:6, borderRadius:'50%', background:'#A855F7', top:-1 }}/>
            </div>
            <div style={{ fontSize:9, color:'#A855F7', width:60, textAlign:'right' }}>{p.min}-{p.max}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', fontSize:10 }}>
        <span style={{ color:'#7A8699' }}>
          {idioma==='en'?'Exceptional chance':idioma==='es'?'Prob. excepcional':'Chance excepcional'}:
          <span style={{ color: chanceExcepcional==='Alta'?'#D4AF37':chanceExcepcional==='Média'?'#4C8DFF':'#7A8699', fontWeight:700, marginLeft:4 }}>{chanceExcepcional}</span>
        </span>
        <span style={{ color:'#7A8699' }}>
          {idioma==='en'?'Potential':idioma==='es'?'Potencial':'Potencial'}: <span style={{ color:'#A855F7', fontWeight:700 }}>{potencialMedio}/100</span>
        </span>
      </div>
    </div>
  )
}


// Actualiza fases dos ovos/ninhegos automaticamente
export function actualizarFasesCria(carreira) {
  const sem = c.semana
  const ep = c.epoca
  const novosPombos = (c.pombos||[]).map(p => {
    if (!p.fase || p.fase === 'adulto' || p.estado === 'activo') return p
    // Calcular semana absoluta
    const semAbs = (ep-1)*40 + sem
    const semPostura = (p.epoca_postura-1)*40 + (p.semana_postura||0)
    const semanas = semAbs - semPostura
    if (semanas >= 11) return { ...p, estado:'activo', fase:'adulto' }
    if (semanas >= 7)  return { ...p, estado:'jovem', fase:'jovem' }
    if (semanas >= 3)  return { ...p, estado:'ninhego', fase:'ninhego' }
    if (semanas >= 2)  return { ...p, estado:'borrachinho', fase:'nascido' }
    return p // ainda ovo
  })
  return { ...c, pombos: novosPombos }
}

export default function VLNinhadas({ carreira, onVoltar, onGuardar, idioma = 'pt' }) {
  // Ler sempre do localStorage para ter dados mais recentes
  const [carreiraLocal, setCarreiraLocal] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vl_carreira')) || carreira } catch { return carreira }
  })
  const c = carreiraLocal

  const salvarLocal = (dados) => {
    try { localStorage.setItem('vl_carreira', JSON.stringify(dados)) } catch {}
    setCarreiraLocal({ ...dados })
    onGuardar?.(dados)
  }

  const [tab, setTab] = useState('cruzar')
  const [paiSel, setPaiSel] = useState(null)
  const [maeSel, setMaeSel] = useState(null)
  const [ninhadas, setNinhadas] = useState(c.ninhadas_virtuais || [])
  const [msg, setMsg] = useState(null)

  const machos = (c.pombos||[]).filter(p => p.sexo==='M' && p.estado==='activo')
  const femeas = (c.pombos||[]).filter(p => p.sexo==='F' && p.estado==='activo')

  const showMsg = (texto, tipo='ok') => { setMsg({texto,tipo}); setTimeout(()=>setMsg(null),3000) }

  const cruzar = () => {
    if (!paiSel || !maeSel) return

    const nNovos = 2 // Sempre 2 ovos por casal
    const ano = 2025 + (c.epoca - 1)
    const nomes = NOMES[idioma] || NOMES.pt

    const filhos = Array.from({length: nNovos}, (_, i) => {
      const sexo = Math.random() > 0.5 ? 'M' : 'F'
      const attrsFilho = cruzamento(paiSel, maeSel)
      const nome = nomes[Math.floor(Math.random() * nomes.length)]
      return {
        id: `pombo_${Date.now()}_${i}_${Math.random().toString(36).slice(2,5)}`,
        nome, anilha: gerarAnilha(ano), sexo, ano,
        especialidade: paiSel.especialidade, esp_idx: paiSel.esp_idx,
        personalidade: [PERSONALIDADES[idioma]?.[Math.floor(Math.random()*12)] || 'Calmo'],
        atributos: attrsFilho,
        rating: Math.round((paiSel.rating + maeSel.rating) / 2),
        // Fases: ovo(2sem) → nascido(1sem) → ninhego(4sem) → jovem(4sem) → adulto
        estado: 'ovo', fase: 'ovo',
        semana_postura: c.semana,
        epoca_postura: c.epoca,
        sem_adulto: c.semana + 11, // torna-se adulto após 11 semanas
        idade: 0, provas: 0, vitorias: 0, percentil_medio: 0,
        valor: Math.round((paiSel.valor + maeSel.valor) / 3),
        pai_id: paiSel.id, mae_id: maeSel.id,
        pai_nome: paiSel.nome, mae_nome: maeSel.nome,
      }
    })

    const novaNinhada = {
      id: `ninhada_${Date.now()}`,
      pai_id: paiSel.id, pai_nome: paiSel.nome,
      mae_id: maeSel.id, mae_nome: maeSel.nome,
      filhos, semana: c.semana, epoca: c.epoca,
      estado: 'ativa',
    }

    const novasNinhadas = [...ninhadas, novaNinhada]
    setNinhadas(novasNinhadas)

    // Adicionar filhos à lista de pombos como borrachinhos
    const novaCarreira = {
      ...carreira,
      pombos: [...c.pombos, ...filhos],
      ninhadas_virtuais: novasNinhadas,
    }
    salvarLocal(novaCarreira)

    setPaiSel(null); setMaeSel(null)
    showMsg(`${nNovos} ${idioma==='en'?'chicks born!':idioma==='es'?'polluelos nacidos!':'borrachinhos nascidos!'}`)
    setTab('ninhadas')
  }

  const promoverParaAdulto = (pomboId) => {
    const novosPombos = (c.pombos||[]).map(p => {
      if (p.id !== pomboId) return p
      return { ...p, estado: 'activo', fase: 'adulto', rating: Math.min(5, p.rating + (Math.random() > 0.7 ? 1 : 0)) }
    })
    const novaCarreira = { ...c, pombos: novosPombos }
    salvarLocal(novaCarreira)
    showMsg(idioma==='en'?'Pigeon promoted to adult!':idioma==='es'?'¡Paloma promovida a adulta!':'Pombo promovido a adulto!')
  }


  const faseLabel = (p) => {
    const f = p.fase || p.estado
    if (f==='ovo') return {pt:'🥚 Ovo',en:'🥚 Egg',es:'🥚 Huevo'}[idioma]||'🥚 Ovo'
    if (f==='nascido') return {pt:'🐣 Nascido',en:'🐣 Hatched',es:'🐣 Nacido'}[idioma]||'🐣 Nascido'
    if (f==='ninhego') return {pt:'🐤 Ninhego',en:'🐤 Chick',es:'🐤 Polluelo'}[idioma]||'🐤 Ninhego'
    if (f==='jovem') return {pt:'🐦 Jovem',en:'🐦 Young',es:'🐦 Joven'}[idioma]||'🐦 Jovem'
    return {pt:'🕊️ Adulto',en:'🕊️ Adult',es:'🕊️ Adulto'}[idioma]||'🕊️ Adulto'
  }

  const borrachinhos = (c.pombos||[]).filter(p => ['ovo','borrachinho','ninhego','jovem'].includes(p.estado) || p.fase === 'nascido')

  return (
    <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', fontFamily:'inherit' }}>
      <div style={{ background:'linear-gradient(180deg,#050D1A,#030812)', borderBottom:'1px solid rgba(255,255,255,.05)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={onVoltar} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>←</button>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>🥚 {idioma==='en'?'Breeding':idioma==='es'?'Reproducción':'Ninhadas'}</div>
            <div style={{ fontSize:10, color:'#7A8699' }}>{ninhadas.length} {idioma==='en'?'litters':idioma==='es'?'nidadas':'ninhadas'} · {borrachinhos.length} {idioma==='en'?'chicks':idioma==='es'?'polluelos':'borrachinhos'}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['cruzar',idioma==='en'?'Breed':idioma==='es'?'Cruzar':'Cruzar'],
            ['ninhadas',idioma==='en'?'Litters':idioma==='es'?'Nidadas':'Ninhadas'],
            ['jovens',idioma==='en'?'Chicks':idioma==='es'?'Polluelos':'Borrachinhos']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{ flex:'none', padding:'8px 14px', borderRadius:8, border:tab===id?'none':'1px solid rgba(255,255,255,.08)', background:tab===id?'linear-gradient(135deg,#A855F7,#7C3AED)':'rgba(255,255,255,.04)', color:tab===id?'#fff':'#cbd5e1', fontSize:12, fontWeight:tab===id?700:500, cursor:'pointer', fontFamily:'inherit', minHeight:36 }}>
              {label}{id==='jovens'&&borrachinhos.length>0?` (${borrachinhos.length})`:''}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ margin:'10px 16px 0', padding:'10px 14px', background:msg.tipo==='ok'?'rgba(168,85,247,.1)':'rgba(248,113,113,.1)', border:`1px solid ${msg.tipo==='ok'?'rgba(168,85,247,.3)':'rgba(248,113,113,.3)'}`, borderRadius:10, fontSize:12, color:msg.tipo==='ok'?'#A855F7':'#f87171', fontWeight:600 }}>
          {msg.tipo==='ok'?'🥚':'❌'} {msg.texto}
        </div>
      )}

      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* CRUZAR */}
        {tab==='cruzar' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Seleccionar Pai */}
            <div>
              <div style={{ fontSize:9, color:'#4C8DFF', fontWeight:700, letterSpacing:1.5, marginBottom:8 }}>
                ♂ {idioma==='en'?'SELECT FATHER':idioma==='es'?'SELECCIONAR PADRE':'SELECCIONAR PAI'}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {machos.length===0 ? (
                  <div style={{ fontSize:11, color:'#475569', padding:'10px' }}>{idioma==='en'?'No male pigeons':idioma==='es'?'Sin palomas macho':'Sem pombos machos'}</div>
                ) : machos.map(p => (
                  <PomboMini key={p.id} pombo={p} selecionado={paiSel?.id===p.id} onClick={()=>setPaiSel(paiSel?.id===p.id?null:p)} idioma={idioma} />
                ))}
              </div>
            </div>

            {/* Seleccionar Mãe */}
            <div>
              <div style={{ fontSize:9, color:'#c084fc', fontWeight:700, letterSpacing:1.5, marginBottom:8 }}>
                ♀ {idioma==='en'?'SELECT MOTHER':idioma==='es'?'SELECCIONAR MADRE':'SELECCIONAR MÃE'}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {femeas.length===0 ? (
                  <div style={{ fontSize:11, color:'#475569', padding:'10px' }}>{idioma==='en'?'No female pigeons':idioma==='es'?'Sin palomas hembra':'Sem pombas fêmeas'}</div>
                ) : femeas.map(p => (
                  <PomboMini key={p.id} pombo={p} selecionado={maeSel?.id===p.id} onClick={()=>setMaeSel(maeSel?.id===p.id?null:p)} idioma={idioma} />
                ))}
              </div>
            </div>

            {/* Previsão genética */}
            {paiSel && maeSel && <PrevisaoGentica pai={paiSel} mae={maeSel} idioma={idioma}/>}

            {/* Botão cruzar */}
            <button onClick={cruzar} disabled={!paiSel||!maeSel}
              style={{ padding:'14px', borderRadius:12, border:'none', background: paiSel&&maeSel?'linear-gradient(135deg,#A855F7,#7C3AED)':'rgba(255,255,255,.06)', color: paiSel&&maeSel?'#fff':'#475569', fontSize:14, fontWeight:700, cursor:paiSel&&maeSel?'pointer':'default', fontFamily:'inherit' }}>
              🥚 {idioma==='en'?'Start Breeding':idioma==='es'?'Iniciar Cruce':'Iniciar Cruzamento'}
              {paiSel&&maeSel?` (${paiSel.nome} × ${maeSel.nome})`:''}
            </button>
          </div>
        )}

        {/* NINHADAS */}
        {tab==='ninhadas' && (
          ninhadas.length===0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🥚</div>
              <div style={{ fontSize:14, color:'#475569', fontWeight:600 }}>
                {idioma==='en'?'No litters yet':idioma==='es'?'Sin nidadas aún':'Sem ninhadas ainda'}
              </div>
            </div>
          ) : ninhadas.map(n => (
            <div key={n.id} style={{ padding:'14px', background:'rgba(168,85,247,.05)', border:'1px solid rgba(168,85,247,.15)', borderRadius:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>♂ {n.pai_nome} × ♀ {n.mae_nome}</div>
                  <div style={{ fontSize:10, color:'#475569' }}>Ép.{n.epoca} Sem.{n.semana}</div>
                </div>
                <div style={{ fontSize:20 }}>🐣</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                {n.filhos.map(f => (
                  <div key={f.id} style={{ padding:'8px', background:'rgba(255,255,255,.03)', borderRadius:8, textAlign:'center' }}>
                    <div style={{ fontSize:11, fontWeight:700, color: f.sexo==='M'?'#4C8DFF':'#c084fc' }}>{f.nome}</div>
                    <div style={{ fontSize:9, color:'#475569' }}>{f.sexo==='M'?'♂':'♀'}</div>
                    <div style={{ display:'flex', gap:1, justifyContent:'center', marginTop:4 }}>
                      {Array.from({length:5}).map((_,i)=><div key={i} style={{ fontSize:6, color:i<f.rating?'#D4AF37':'rgba(255,255,255,.1)' }}>★</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* BORRACHINHOS */}
        {tab==='jovens' && (
          borrachinhos.length===0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🐣</div>
              <div style={{ fontSize:14, color:'#475569', fontWeight:600 }}>
                {idioma==='en'?'No chicks yet':idioma==='es'?'Sin polluelos aún':'Sem borrachinhos ainda'}
              </div>
            </div>
          ) : borrachinhos.map(p => (
            <div key={p.id} style={{ padding:'14px', background:'rgba(212,175,55,.06)', border:'1px solid rgba(212,175,55,.2)', borderRadius:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color: p.sexo==='M'?'#4C8DFF':'#c084fc' }}>{p.nome}</div>
                  <div style={{ fontSize:10, color:'#475569' }}>{p.anilha} · {p.sexo==='M'?'♂':'♀'}</div>
                  {p.pai_nome && <div style={{ fontSize:10, color:'#475569' }}>♂{p.pai_nome} × ♀{p.mae_nome}</div>}
                </div>
                <div style={{ fontSize:9, background:'rgba(212,175,55,.15)', color:'#D4AF37', padding:'3px 8px', borderRadius:4, fontWeight:700 }}>
                  {faseLabel(p)}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:10 }}>
                {['velocidade','resistencia','orientacao'].map(a=>(
                  <div key={a} style={{ textAlign:'center', padding:'6px', background:'rgba(255,255,255,.03)', borderRadius:6 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:corAttr(p.atributos[a]) }}>{p.atributos[a]}</div>
                    <div style={{ fontSize:8, color:'#475569' }}>{a.slice(0,3).toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <button onClick={()=>promoverParaAdulto(p.id)}
                style={{ width:'100%', padding:'8px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#D4AF37,#B8960C)', color:'#050D1A', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                🐦 {idioma==='en'?'Promote to Adult':idioma==='es'?'Promover a Adulto':'Promover a Adulto'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
