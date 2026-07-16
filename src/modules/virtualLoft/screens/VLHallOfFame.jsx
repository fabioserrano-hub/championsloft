// src/modules/virtualLoft/screens/VLHallOfFame.jsx
import { useState } from 'react'

function corRating(r) {
  return r>=5?'#D4AF37':r>=4?'#4C8DFF':r>=3?'#2DD4A7':'#7A8699'
}

function TrofeuCard({ entrada, idioma }) {
  const cor = entrada.tipo==='campeao'?'#D4AF37':entrada.tipo==='reprodutor'?'#A855F7':entrada.tipo==='recorde'?'#f97316':'#4C8DFF'
  return (
    <div style={{ padding:'14px', background:`${cor}08`, border:`1px solid ${cor}25`, borderRadius:14, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:cor }}/>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        <div style={{ width:48, height:48, borderRadius:12, background:`${cor}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
          {entrada.tipo==='campeao'?'🏆':entrada.tipo==='reprodutor'?'🧬':entrada.tipo==='recorde'?'⚡':'⭐'}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#fff', marginBottom:2 }}>{entrada.nomePombo}</div>
          <div style={{ fontSize:10, color:cor, fontWeight:700, marginBottom:4 }}>{entrada.titulo}</div>
          <div style={{ fontSize:10, color:'#7A8699' }}>{entrada.desc}</div>
          {entrada.pai_nome && (
            <div style={{ fontSize:9, color:'#475569', marginTop:4 }}>
              ♂ {entrada.pai_nome} × ♀ {entrada.mae_nome}
            </div>
          )}
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:11, color:'#475569' }}>Ép. {entrada.epoca}</div>
          <div style={{ display:'flex', gap:2, marginTop:4, justifyContent:'flex-end' }}>
            {Array.from({length:5}).map((_,i)=><div key={i} style={{ fontSize:8, color:i<(entrada.rating||3)?corRating(entrada.rating||3):'rgba(255,255,255,.1)' }}>★</div>)}
          </div>
        </div>
      </div>
      {/* Stats */}
      {entrada.stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginTop:10 }}>
          {Object.entries(entrada.stats).slice(0,3).map(([k,v])=>(
            <div key={k} style={{ textAlign:'center', padding:'6px', background:'rgba(255,255,255,.03)', borderRadius:6 }}>
              <div style={{ fontSize:12, fontWeight:700, color:cor }}>{v}</div>
              <div style={{ fontSize:8, color:'#475569' }}>{k}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VLHallOfFame({ carreira, onVoltar, onGuardar, idioma = 'pt' }) {
  const [tab, setTab] = useState('campeoes')

  const hof = carreira.hall_of_fame || []

  // Separar por tipo
  const campeoes = hof.filter(e => e.tipo === 'campeao')
  const reprodutores = hof.filter(e => e.tipo === 'reprodutor')
  const recordes = hof.filter(e => e.tipo === 'recorde')
  const especiais = hof.filter(e => e.tipo === 'especial')

  // Adicionar ao HoF manualmente (admin)
  const adicionarPombo = (pombo, tipo) => {
    const titulos = {
      campeao: { pt:'Campeão do Pombal', en:'Loft Champion', es:'Campeón del Palomar' },
      reprodutor: { pt:'Reprodutor de Elite', en:'Elite Breeder', es:'Reproductor de Elite' },
      recorde: { pt:'Detentor de Recorde', en:'Record Holder', es:'Poseedor de Récord' },
    }
    const entrada = {
      id: `hof_${Date.now()}`,
      nomePombo: pombo.nome,
      pomboId: pombo.id,
      tipo,
      titulo: titulos[tipo]?.[idioma] || titulos[tipo]?.pt,
      desc: `${pombo.provas||0} ${idioma==='en'?'races':idioma==='es'?'carreras':'provas'} · ${pombo.vitorias||0} ${idioma==='en'?'wins':idioma==='es'?'victorias':'vitórias'}`,
      rating: pombo.rating,
      epoca: carreira.epoca,
      pai_nome: pombo.pai_nome,
      mae_nome: pombo.mae_nome,
      stats: {
        [idioma==='en'?'Races':idioma==='es'?'Carreras':'Provas']: pombo.provas||0,
        [idioma==='en'?'Wins':idioma==='es'?'Victorias':'Vitórias']: pombo.vitorias||0,
        [idioma==='en'?'Percentile':idioma==='es'?'Percentil':'Percentil']: `${pombo.percentil_medio||0}%`,
      }
    }
    const novoHof = [...hof, entrada]
    onGuardar?.({ ...carreira, hall_of_fame: novoHof })
  }

  const pombosActivos = (carreira.pombos||[]).filter(p=>p.estado==='activo')
  const jaNoHof = hof.map(e=>e.pomboId)

  const TABS = [
    { id:'campeoes', label: idioma==='en'?'Champions':idioma==='es'?'Campeones':'Campeões', n: campeoes.length },
    { id:'reprodutores', label: idioma==='en'?'Breeders':idioma==='es'?'Reproductores':'Reprodutores', n: reprodutores.length },
    { id:'recordes', label: idioma==='en'?'Records':idioma==='es'?'Récords':'Recordes', n: recordes.length },
    { id:'adicionar', label: idioma==='en'?'Add':idioma==='es'?'Añadir':'Adicionar', n: 0 },
  ]

  const entradas = tab==='campeoes'?campeoes:tab==='reprodutores'?reprodutores:tab==='recordes'?recordes:especiais

  return (
    <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', fontFamily:'inherit' }}>
      <div style={{ background:'linear-gradient(180deg,#050D1A,#030812)', borderBottom:'1px solid rgba(255,255,255,.05)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={onVoltar} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>←</button>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>🏛️ Hall of Fame</div>
            <div style={{ fontSize:10, color:'#7A8699' }}>{hof.length} {idioma==='en'?'legends':idioma==='es'?'leyendas':'lendas'} · Ép. {carreira.epoca||1}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none', paddingBottom:2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:'none', padding:'7px 12px', borderRadius:8, border:tab===t.id?'none':'1px solid rgba(255,255,255,.08)', background:tab===t.id?'linear-gradient(135deg,#D4AF37,#B8960C)':'rgba(255,255,255,.04)', color:tab===t.id?'#050D1A':'#cbd5e1', fontSize:11, fontWeight:tab===t.id?700:500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              {t.label}{t.n>0?` (${t.n})`:''}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>

        {/* Estatísticas gerais */}
        {tab !== 'adicionar' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:4 }}>
            {[
              { label: idioma==='en'?'Champions':idioma==='es'?'Campeones':'Campeões', n: campeoes.length, cor:'#D4AF37' },
              { label: idioma==='en'?'Breeders':idioma==='es'?'Reproductores':'Reprodutores', n: reprodutores.length, cor:'#A855F7' },
              { label: idioma==='en'?'Records':idioma==='es'?'Récords':'Recordes', n: recordes.length, cor:'#f97316' },
            ].map((s,i)=>(
              <div key={i} style={{ padding:'10px', background:'rgba(255,255,255,.02)', border:`1px solid ${s.cor}20`, borderRadius:10, textAlign:'center' }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:s.cor }}>{s.n}</div>
                <div style={{ fontSize:9, color:'#475569', fontWeight:600 }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}

        {/* Lista de entradas */}
        {tab !== 'adicionar' && (
          entradas.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🏛️</div>
              <div style={{ fontSize:14, color:'#475569', fontWeight:600 }}>
                {idioma==='en'?'No legends yet':idioma==='es'?'Sin leyendas aún':'Sem lendas ainda'}
              </div>
              <div style={{ fontSize:11, color:'#2a3a5a', marginTop:6 }}>
                {idioma==='en'?'Win races and breed champions to fill the Hall of Fame':idioma==='es'?'Gana carreras y cría campeones':'Ganha provas e cria campeões para preencher o Hall of Fame'}
              </div>
            </div>
          ) : (
            entradas.map(e => <TrofeuCard key={e.id} entrada={e} idioma={idioma} />)
          )
        )}

        {/* Adicionar ao HoF */}
        {tab === 'adicionar' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:11, color:'#7A8699', marginBottom:4 }}>
              {idioma==='en'?'Select a pigeon and category to immortalise:':idioma==='es'?'Selecciona una paloma y categoría:':'Selecciona um pombo e categoria para imortalizar:'}
            </div>
            {pombosActivos.filter(p => !jaNoHof.includes(p.id)).map(p => (
              <div key={p.id} style={{ padding:'12px 14px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700 }}>{p.nome}</div>
                    <div style={{ fontSize:10, color:'#475569' }}>{p.especialidade} · {p.provas||0} provas · {p.vitorias||0} vitórias</div>
                  </div>
                  <div style={{ display:'flex', gap:2 }}>
                    {Array.from({length:5}).map((_,i)=><div key={i} style={{ fontSize:8, color:i<p.rating?'#D4AF37':'rgba(255,255,255,.1)' }}>★</div>)}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {[
                    ['campeao','🏆',idioma==='en'?'Champion':idioma==='es'?'Campeón':'Campeão','#D4AF37'],
                    ['reprodutor','🧬',idioma==='en'?'Breeder':idioma==='es'?'Reproductor':'Reprodutor','#A855F7'],
                    ['recorde','⚡',idioma==='en'?'Record':idioma==='es'?'Récord':'Recorde','#f97316'],
                  ].map(([tipo,icon,label,cor])=>(
                    <button key={tipo} onClick={()=>adicionarPombo(p, tipo)}
                      style={{ flex:1, padding:'6px 4px', borderRadius:8, border:`1px solid ${cor}30`, background:`${cor}10`, color:cor, fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {pombosActivos.filter(p => !jaNoHof.includes(p.id)).length === 0 && (
              <div style={{ textAlign:'center', padding:'30px', color:'#475569', fontSize:12 }}>
                {idioma==='en'?'All active pigeons are already in the Hall of Fame':idioma==='es'?'Todas las palomas ya están en el Hall of Fame':'Todos os pombos activos já estão no Hall of Fame'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
