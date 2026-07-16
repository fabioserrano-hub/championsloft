// src/modules/virtualLoft/screens/VLPombos.jsx
import { useState } from 'react'

const ATTR_LABELS = {
  pt: { velocidade:'Velocidade', resistencia:'Resistência', recuperacao:'Recuperação', forca:'Força', orientacao:'Orientação', inteligencia:'Inteligência', instinto:'Instinto', coragem:'Coragem', fertilidade:'Fertilidade', sangue:'Sangue' },
  en: { velocidade:'Speed', resistencia:'Stamina', recuperacao:'Recovery', forca:'Strength', orientacao:'Navigation', inteligencia:'Intelligence', instinto:'Instinct', coragem:'Courage', fertilidade:'Fertility', sangue:'Bloodline' },
  es: { velocidade:'Velocidad', resistencia:'Resistencia', recuperacao:'Recuperación', forca:'Fuerza', orientacao:'Orientación', inteligencia:'Inteligencia', instinto:'Instinto', coragem:'Coraje', fertilidade:'Fertilidad', sangue:'Sangre' },
}

const ATTR_GRUPOS = [
  { key:'fisico', label:{ pt:'Físico', en:'Physical', es:'Físico' }, attrs:['velocidade','resistencia','recuperacao','forca'] },
  { key:'mental', label:{ pt:'Mental', en:'Mental', es:'Mental' }, attrs:['orientacao','inteligencia','instinto','coragem'] },
  { key:'reproducao', label:{ pt:'Reprodução', en:'Breeding', es:'Reproducción' }, attrs:['fertilidade','sangue'] },
]

function corAtributo(val) {
  if (val >= 80) return '#2DD4A7'
  if (val >= 65) return '#4C8DFF'
  if (val >= 45) return '#D4AF37'
  if (val >= 30) return '#f97316'
  return '#f87171'
}

function BarraAtributo({ label, valor, oculto = false }) {
  const cor = oculto ? '#1B2D52' : corAtributo(valor)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' }}>
      <div style={{ width:80, fontSize:10, color:'#7A8699', flexShrink:0, fontWeight:500 }}>{label}</div>
      <div style={{ flex:1, height:6, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width: oculto ? '40%' : `${valor}%`, background: oculto ? 'repeating-linear-gradient(45deg,#1B2D52,#1B2D52 4px,#0d1428 4px,#0d1428 8px)' : cor, borderRadius:3, transition:'width .5s' }}/>
      </div>
      <div style={{ width:28, fontSize:11, fontWeight:700, color: oculto ? '#1B2D52' : cor, textAlign:'right' }}>
        {oculto ? '?' : valor}
      </div>
    </div>
  )
}

function EstrelaRating({ rating, size = 10 }) {
  return (
    <div style={{ display:'flex', gap:2 }}>
      {Array.from({length:5}).map((_,i) => (
        <div key={i} style={{ fontSize:size, color: i < rating ? '#D4AF37' : 'rgba(255,255,255,.1)' }}>★</div>
      ))}
    </div>
  )
}

function CardPombo({ pombo, onClick, idioma }) {
  const isFemea = pombo.sexo === 'F'
  const cor = isFemea ? '#c084fc' : '#4C8DFF'
  const bgGrad = isFemea ? 'linear-gradient(135deg,#1a0d33,#0d0719)' : 'linear-gradient(135deg,#0d1a33,#050d1a)'

  return (
    <div onClick={() => onClick(pombo)} style={{ background:bgGrad, border:`1px solid ${cor}20`, borderRadius:12, padding:'12px', cursor:'pointer', transition:'all .15s', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:cor, opacity:.5 }}/>

      {/* Sexo badge */}
      <div style={{ position:'absolute', top:8, right:8, fontSize:10, color:cor, fontWeight:700 }}>
        {pombo.sexo === 'M' ? '♂' : '♀'}
      </div>

      {/* Foto / Placeholder */}
      <div style={{ width:48, height:48, borderRadius:10, background:`${cor}15`, border:`1.5px solid ${cor}30`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
        <span style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:cor }}>
          {pombo.anilha.slice(-3)}
        </span>
      </div>

      <div style={{ fontSize:13, fontWeight:800, color:'#fff', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pombo.nome}</div>
      <div style={{ fontSize:10, color:'#475569', marginBottom:6 }}>{pombo.anilha}</div>

      <EstrelaRating rating={pombo.rating} />

      <div style={{ marginTop:6, fontSize:10, color:cor, fontWeight:600 }}>{pombo.especialidade}</div>

      {/* Potencial oculto hint */}
      {pombo.atributos.potencial_revelado < 30 && (
        <div style={{ marginTop:4, fontSize:9, color:'#475569', fontStyle:'italic' }}>
          {idioma==='en'?'Potential unknown':idioma==='es'?'Potencial desconocido':'Potencial desconhecido'}
        </div>
      )}
    </div>
  )
}

function DetalhesPombo({ pombo, onFechar, idioma, historico }) {
  const [tabAtiva, setTabAtiva] = useState('atributos')
  const isFemea = pombo.sexo === 'F'
  const cor = isFemea ? '#c084fc' : '#4C8DFF'
  const attrLabels = ATTR_LABELS[idioma] || ATTR_LABELS.pt
  const potencialRevelado = pombo.atributos.potencial_revelado || 0

  const tabs = [
    { id:'atributos', label: idioma==='en'?'Attributes':idioma==='es'?'Atributos':'Atributos' },
    { id:'info',      label: idioma==='en'?'Info':idioma==='es'?'Info':'Info' },
    { id:'historial', label: idioma==='en'?'History':idioma==='es'?'Historial':'Historial' },
  ]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.9)', zIndex:1000, overflow:'auto' }}>
      <div style={{ background:'#050D1A', minHeight:'100vh', maxWidth:480, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${cor}20,transparent)`, padding:'20px 16px 16px', position:'relative', borderBottom:`1px solid ${cor}20` }}>
          <button onClick={onFechar} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>✕</button>

          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <div style={{ width:64, height:64, borderRadius:14, background:`${cor}15`, border:`2px solid ${cor}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:cor }}>{pombo.anilha.slice(-3)}</span>
            </div>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color:'#fff', marginBottom:2 }}>{pombo.nome}</div>
              <div style={{ fontSize:11, color:'#7A8699', marginBottom:6 }}>{pombo.sexo === 'M' ? '♂' : '♀'} · {pombo.anilha} · {pombo.ano}</div>
              <EstrelaRating rating={pombo.rating} size={14} />
            </div>
          </div>

          {/* Especialidade e personalidade */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
            <span style={{ padding:'3px 8px', background:`${cor}20`, border:`1px solid ${cor}40`, borderRadius:6, fontSize:10, color:cor, fontWeight:700 }}>{pombo.especialidade}</span>
            {(pombo.personalidade || []).map((p,i) => (
              <span key={i} style={{ padding:'3px 8px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:6, fontSize:10, color:'#cbd5e1' }}>{p}</span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setTabAtiva(tab.id)}
              style={{ flex:1, padding:'12px 8px', background:'none', border:'none', borderBottom: tabAtiva===tab.id ? `2px solid ${cor}` : '2px solid transparent', color: tabAtiva===tab.id ? cor : '#475569', fontSize:12, fontWeight: tabAtiva===tab.id ? 700 : 500, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding:'16px' }}>

          {/* ATRIBUTOS */}
          {tabAtiva === 'atributos' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Potencial oculto */}
              <div style={{ padding:'12px 14px', background:'rgba(212,175,55,.06)', border:'1px solid rgba(212,175,55,.15)', borderRadius:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#D4AF37' }}>
                    🔮 {idioma==='en'?'Hidden Potential':idioma==='es'?'Potencial Oculto':'Potencial Oculto'}
                  </div>
                  <div style={{ fontSize:11, color:'#D4AF37', fontWeight:700 }}>{potencialRevelado}% {idioma==='en'?'revealed':idioma==='es'?'revelado':'revelado'}</div>
                </div>
                <div style={{ height:6, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${potencialRevelado}%`, background:'linear-gradient(90deg,#D4AF37,#f97316)', borderRadius:3 }}/>
                </div>
                <div style={{ fontSize:10, color:'#7A8699', marginTop:6 }}>
                  {idioma==='en'?'Train and race to reveal potential':idioma==='es'?'Entrena y compite para revelar el potencial':'Treina e compete para revelar o potencial'}
                </div>
              </div>

              {/* Grupos de atributos */}
              {ATTR_GRUPOS.map(grupo => (
                <div key={grupo.key}>
                  <div style={{ fontSize:9, color:'#4C8DFF', fontWeight:700, letterSpacing:1.5, marginBottom:8 }}>
                    {(grupo.label[idioma] || grupo.label.pt).toUpperCase()}
                  </div>
                  {grupo.attrs.map(attr => (
                    <BarraAtributo
                      key={attr}
                      label={attrLabels[attr] || attr}
                      valor={pombo.atributos[attr] || 0}
                      oculto={potencialRevelado < 30 && ['instinto','sangue'].includes(attr)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* INFO */}
          {tabAtiva === 'info' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label: idioma==='en'?'Name':idioma==='es'?'Nombre':'Nome', valor: pombo.nome },
                { label: idioma==='en'?'Ring':idioma==='es'?'Anilla':'Anilha', valor: pombo.anilha },
                { label: idioma==='en'?'Sex':idioma==='es'?'Sexo':'Sexo', valor: pombo.sexo === 'M' ? (idioma==='en'?'Male':idioma==='es'?'Macho':'Macho') : (idioma==='en'?'Female':idioma==='es'?'Hembra':'Fêmea') },
                { label: idioma==='en'?'Year':idioma==='es'?'Año':'Ano', valor: pombo.ano },
                { label: idioma==='en'?'Specialty':idioma==='es'?'Especialidad':'Especialidade', valor: pombo.especialidade },
                { label: idioma==='en'?'Rating':idioma==='es'?'Rating':'Rating', valor: '★'.repeat(pombo.rating) + '☆'.repeat(5-pombo.rating) },
                { label: idioma==='en'?'Value':idioma==='es'?'Valor':'Valor', valor: `${pombo.valor?.toLocaleString() || 0}€` },
                { label: idioma==='en'?'Races':idioma==='es'?'Carreras':'Provas', valor: pombo.provas || 0 },
                { label: idioma==='en'?'Wins':idioma==='es'?'Victorias':'Vitórias', valor: pombo.vitorias || 0 },
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                  <span style={{ fontSize:12, color:'#7A8699' }}>{item.label}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{item.valor}</span>
                </div>
              ))}

              {/* Genealogia */}
              <div style={{ marginTop:8 }}>
                <div style={{ fontSize:9, color:'#4C8DFF', fontWeight:700, letterSpacing:1.5, marginBottom:10 }}>
                  {idioma==='en'?'GENEALOGY':idioma==='es'?'GENEALOGÍA':'GENEALOGIA'}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { role: idioma==='en'?'Father':idioma==='es'?'Padre':'Pai', id: pombo.pai_id },
                    { role: idioma==='en'?'Mother':idioma==='es'?'Madre':'Mãe', id: pombo.mae_id },
                  ].map((p,i) => (
                    <div key={i} style={{ padding:'10px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:8, textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'#475569', marginBottom:4 }}>{p.role}</div>
                      <div style={{ fontSize:11, color: p.id ? '#cbd5e1' : '#2a3a5a' }}>
                        {p.id ? '—' : idioma==='en'?'Unknown':idioma==='es'?'Desconocido':'Desconhecido'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* HISTORIAL */}
          {tabAtiva === 'historial' && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(!historico || historico.length === 0) ? (
                <div style={{ textAlign:'center', padding:'40px 20px' }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
                  <div style={{ fontSize:14, color:'#475569', fontWeight:600 }}>
                    {idioma==='en'?'No races yet':idioma==='es'?'Sin carreras aún':'Sem provas ainda'}
                  </div>
                </div>
              ) : [...historico].reverse().map((r,i) => (
                <div key={i} style={{ padding:'10px 14px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{r.provaNome}</div>
                    <div style={{ fontSize:13, fontWeight:800, color: r.posicao<=3?'#D4AF37':'#7A8699' }}>{r.posicao}º/{r.total}</div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div style={{ fontSize:10, color:'#475569' }}>Sem. {r.semana}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#2DD4A7' }}>P{r.percentil}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VLPombos({ carreira, onVoltar, idioma = 'pt' }) {
  const [filtro, setFiltro] = useState('todos')
  const [ordenar, setOrdenar] = useState('rating')
  const [selecionado, setSelecionado] = useState(null)
  const [pesquisa, setPesquisa] = useState('')

  const filtros = [
    { id:'todos',  label: idioma==='en'?'All':idioma==='es'?'Todos':'Todos' },
    { id:'M',      label: idioma==='en'?'Males':idioma==='es'?'Machos':'Machos' },
    { id:'F',      label: idioma==='en'?'Females':idioma==='es'?'Hembras':'Fêmeas' },
    { id:'activo', label: idioma==='en'?'Active':idioma==='es'?'Activos':'Activos' },
  ]

  const pombos = (carreira.pombos || [])
    .filter(p => {
      if (pesquisa && !p.nome.toLowerCase().includes(pesquisa.toLowerCase()) && !p.anilha.includes(pesquisa)) return false
      if (filtro === 'M' || filtro === 'F') return p.sexo === filtro
      if (filtro === 'activo') return p.estado === 'activo'
      return true
    })
    .sort((a,b) => {
      if (ordenar === 'rating') return b.rating - a.rating
      if (ordenar === 'nome') return a.nome.localeCompare(b.nome)
      if (ordenar === 'valor') return b.valor - a.valor
      return 0
    })

  const mediaRating = carreira.pombos.length
    ? (carreira.pombos.reduce((s,p) => s + p.rating, 0) / carreira.pombos.length).toFixed(1)
    : 0

  return (
    <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', fontFamily:'inherit' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(180deg,#050D1A,#030812)', borderBottom:'1px solid rgba(255,255,255,.05)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={onVoltar} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>←</button>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>🐦 {idioma==='en'?'Pigeons':idioma==='es'?'Palomas':'Pombos'}</div>
            <div style={{ fontSize:10, color:'#7A8699' }}>{carreira.pombos.length} {idioma==='en'?'pigeons':idioma==='es'?'palomas':'pombos'} · ⭐ {mediaRating} avg</div>
          </div>
        </div>

        {/* Pesquisa */}
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)}
          placeholder={idioma==='en'?'Search by name or ring...':idioma==='es'?'Buscar por nombre o anilla...':'Pesquisar por nome ou anilha...'}
          style={{ width:'100%', padding:'10px 12px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, color:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
      </div>

      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Filtros */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4 }}>
          {filtros.map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              style={{ flex:'none', padding:'7px 14px', borderRadius:8, border: filtro===f.id ? 'none' : '1px solid rgba(255,255,255,.08)', background: filtro===f.id ? 'linear-gradient(135deg,#1E5FD9,#1456C0)' : 'rgba(255,255,255,.04)', color: filtro===f.id ? '#fff' : '#cbd5e1', fontSize:12, fontWeight: filtro===f.id ? 700 : 500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', minHeight:34 }}>
              {f.label}
            </button>
          ))}
          <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
            style={{ flex:'none', padding:'7px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,.08)', background:'#0B1830', color:'#cbd5e1', fontSize:12, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
            <option value="rating">{idioma==='en'?'By Rating':idioma==='es'?'Por Rating':'Por Rating'}</option>
            <option value="nome">{idioma==='en'?'By Name':idioma==='es'?'Por Nombre':'Por Nome'}</option>
            <option value="valor">{idioma==='en'?'By Value':idioma==='es'?'Por Valor':'Por Valor'}</option>
          </select>
        </div>

        {/* Grid de pombos */}
        {pombos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#475569' }}>
            {idioma==='en'?'No pigeons found':idioma==='es'?'Sin palomas encontradas':'Sem pombos encontrados'}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            {pombos.map(p => (
              <CardPombo key={p.id} pombo={p} onClick={setSelecionado} idioma={idioma} />
            ))}
          </div>
        )}

        {/* Resumo do plantel */}
        <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:9, color:'#4C8DFF', fontWeight:700, letterSpacing:1.5, marginBottom:8 }}>
            {idioma==='en'?'SQUAD SUMMARY':idioma==='es'?'RESUMEN DEL PLANTEL':'RESUMO DO PLANTEL'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, textAlign:'center' }}>
            {[
              { label: idioma==='en'?'Males':idioma==='es'?'Machos':'Machos', valor: carreira.pombos.filter(p=>p.sexo==='M').length, cor:'#4C8DFF' },
              { label: idioma==='en'?'Females':idioma==='es'?'Hembras':'Fêmeas', valor: carreira.pombos.filter(p=>p.sexo==='F').length, cor:'#c084fc' },
              { label: idioma==='en'?'⭐ 4-5':idioma==='es'?'⭐ 4-5':'⭐ 4-5', valor: carreira.pombos.filter(p=>p.rating>=4).length, cor:'#D4AF37' },
            ].map((s,i) => (
              <div key={i}>
                <div style={{ fontSize:18, fontWeight:900, color:s.cor, fontFamily:"'Fraunces',serif" }}>{s.valor}</div>
                <div style={{ fontSize:9, color:'#475569', fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal detalhe */}
      {selecionado && (
        <DetalhesPombo pombo={selecionado} onFechar={() => setSelecionado(null)} idioma={idioma} historico={(carreira?.historico_provas||[]).filter(r=>r.pomboId===selecionado?.id)} />
      )}
    </div>
  )
}
