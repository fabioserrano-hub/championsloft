// src/modules/virtualLoft/screens/VLMercado.jsx
import { useState, useEffect } from 'react'
import { gerarPombo } from '../engine/genetics'

const ATTR_LABELS = {
  pt: { velocidade:'Vel', resistencia:'Res', orientacao:'Ori', inteligencia:'Int', recuperacao:'Rec', coragem:'Cor' },
  en: { velocidade:'Spd', resistencia:'Stm', orientacao:'Nav', inteligencia:'Int', recuperacao:'Rec', coragem:'Cou' },
  es: { velocidade:'Vel', resistencia:'Res', orientacao:'Ori', inteligencia:'Int', recuperacao:'Rec', coragem:'Cor' },
}

function gerarMercado(idioma) {
  // Gerar 12 pombos à venda de diferentes vendedores IA
  const vendedores = ['Pombal da Serra','Pombal Elite','Pombal Campeão','Pombal do Norte','Pombal Real']
  return Array.from({length: 12}, (_, i) => {
    const qualidade = i < 2 ? 'elite' : i < 5 ? 'bom' : 'normal'
    const pombo = gerarPombo({ idioma, qualidade })
    return {
      ...pombo,
      vendedor: vendedores[Math.floor(Math.random() * vendedores.length)],
      preco: Math.round(pombo.valor * (0.8 + Math.random() * 0.6)),
      emLeilao: Math.random() < 0.3,
      licitacaoAtual: Math.random() < 0.3 ? Math.round(pombo.valor * 0.5) : 0,
      tempoRestante: Math.floor(Math.random() * 7) + 1, // dias
    }
  })
}

function corAtributo(val) {
  if (val >= 80) return '#2DD4A7'
  if (val >= 65) return '#4C8DFF'
  if (val >= 45) return '#D4AF37'
  return '#f87171'
}

function CardMercado({ item, onComprar, onLicitar, orcamento, idioma }) {
  const isFemea = item.sexo === 'F'
  const cor = isFemea ? '#c084fc' : '#4C8DFF'
  const podeComprar = !item.emLeilao && orcamento >= item.preco
  const podeLicitar = item.emLeilao && orcamento >= (item.licitacaoAtual + 100)
  const attrL = ATTR_LABELS[idioma] || ATTR_LABELS.pt

  return (
    <div style={{ background:'linear-gradient(145deg,#0d1428,#070c18)', border:`1px solid ${cor}20`, borderRadius:14, padding:'14px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:cor, opacity:.4 }}/>

      {item.emLeilao && (
        <div style={{ position:'absolute', top:8, right:8, fontSize:9, background:'rgba(212,175,55,.2)', color:'#D4AF37', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>
          🔨 {idioma==='en'?'AUCTION':idioma==='es'?'SUBASTA':'LEILÃO'}
        </div>
      )}

      {/* Placeholder foto */}
      <div style={{ width:48, height:48, borderRadius:10, background:`${cor}15`, border:`1.5px solid ${cor}30`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
        <span style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:cor }}>{item.anilha?.slice(-3)}</span>
      </div>

      <div style={{ fontSize:14, fontWeight:800, color:'#fff', marginBottom:1 }}>{item.nome}</div>
      <div style={{ fontSize:10, color:'#475569', marginBottom:6 }}>{item.sexo==='M'?'♂':'♀'} · {item.especialidade}</div>

      {/* Estrelas */}
      <div style={{ display:'flex', gap:2, marginBottom:8 }}>
        {Array.from({length:5}).map((_,i) => <div key={i} style={{ fontSize:9, color: i<item.rating?'#D4AF37':'rgba(255,255,255,.1)' }}>★</div>)}
      </div>

      {/* Atributos principais */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4, marginBottom:10 }}>
        {['velocidade','resistencia','orientacao'].map(a => (
          <div key={a} style={{ textAlign:'center', padding:'4px', background:'rgba(255,255,255,.03)', borderRadius:6 }}>
            <div style={{ fontSize:12, fontWeight:700, color:corAtributo(item.atributos[a]) }}>{item.atributos[a]}</div>
            <div style={{ fontSize:8, color:'#475569' }}>{attrL[a]}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize:10, color:'#7A8699', marginBottom:8 }}>
        📍 {item.vendedor}
      </div>

      {/* Preço e botão */}
      {item.emLeilao ? (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <div style={{ fontSize:11, color:'#7A8699' }}>{idioma==='en'?'Current bid':idioma==='es'?'Puja actual':'Licitação actual'}</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#D4AF37' }}>{item.licitacaoAtual > 0 ? item.licitacaoAtual.toLocaleString()+'€' : (idioma==='en'?'No bids':idioma==='es'?'Sin pujas':'Sem licitações')}</div>
          </div>
          <div style={{ fontSize:10, color:'#475569', marginBottom:8 }}>⏱ {item.tempoRestante}d {idioma==='en'?'remaining':idioma==='es'?'restantes':'restantes'}</div>
          <button onClick={() => onLicitar(item)} disabled={!podeLicitar}
            style={{ width:'100%', padding:'8px', borderRadius:8, border:'none', background: podeLicitar ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'rgba(255,255,255,.06)', color: podeLicitar ? '#050D1A' : '#475569', fontSize:11, fontWeight:700, cursor: podeLicitar?'pointer':'default', fontFamily:'inherit' }}>
            🔨 {idioma==='en'?'Bid':idioma==='es'?'Pujar':'Licitar'} {podeLicitar ? `(${(item.licitacaoAtual+100).toLocaleString()}€)` : ''}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize:16, fontWeight:800, color: podeComprar?'#2DD4A7':'#f87171', marginBottom:8 }}>{item.preco.toLocaleString()}€</div>
          <button onClick={() => onComprar(item)} disabled={!podeComprar}
            style={{ width:'100%', padding:'8px', borderRadius:8, border:'none', background: podeComprar ? 'linear-gradient(135deg,#2DD4A7,#059669)' : 'rgba(255,255,255,.06)', color: podeComprar ? '#050D1A' : '#475569', fontSize:11, fontWeight:700, cursor: podeComprar?'pointer':'default', fontFamily:'inherit' }}>
            {podeComprar ? (idioma==='en'?'Buy':idioma==='es'?'Comprar':'Comprar') : (idioma==='en'?'No funds':idioma==='es'?'Sin fondos':'Sem fundos')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function VLMercado({ carreira, onVoltar, onGuardar, idioma = 'pt' }) {
  const [tab, setTab] = useState('comprar')
  const [mercado, setMercado] = useState(() => gerarMercado(idioma))
  const [filtro, setFiltro] = useState('todos')
  const [msg, setMsg] = useState(null)
  const [venderSel, setVenderSel] = useState(null)
  const [precoVenda, setPrecoVenda] = useState('')

  const showMsg = (texto, tipo = 'ok') => {
    setMsg({ texto, tipo })
    setTimeout(() => setMsg(null), 3000)
  }

  const comprar = (item) => {
    if (carreira.orcamento < item.preco) return
    const novoPombo = { ...item, vendedor: undefined, preco: undefined, emLeilao: undefined }
    const novaCarreira = {
      ...carreira,
      pombos: [...carreira.pombos, novoPombo],
      orcamento: carreira.orcamento - item.preco,
    }
    onGuardar?.(novaCarreira)
    setMercado(m => m.filter(x => x.id !== item.id))
    showMsg(`${item.nome} ${idioma==='en'?'purchased!':idioma==='es'?'comprado!':'comprado!'}`)
  }

  const licitar = (item) => {
    const novaLicitacao = item.licitacaoAtual + 100
    if (carreira.orcamento < novaLicitacao) return
    setMercado(m => m.map(x => x.id === item.id ? { ...x, licitacaoAtual: novaLicitacao } : x))
    showMsg(`${idioma==='en'?'Bid placed:':idioma==='es'?'Puja realizada:':'Licitação feita:'} ${novaLicitacao.toLocaleString()}€`)
  }

  const vender = () => {
    if (!venderSel || !precoVenda || isNaN(precoVenda)) return
    const valor = Number(precoVenda)
    const novoMercado = [...mercado, {
      ...venderSel,
      vendedor: carreira.nomePombal,
      preco: valor,
      emLeilao: false,
      meuAnuncio: true,
    }]
    const novaCarreira = {
      ...carreira,
      pombos: carreira.pombos.filter(p => p.id !== venderSel.id),
      orcamento: carreira.orcamento + valor,
    }
    onGuardar?.(novaCarreira)
    setMercado(novoMercado)
    setVenderSel(null)
    setPrecoVenda('')
    showMsg(`${venderSel.nome} ${idioma==='en'?'listed for sale!':idioma==='es'?'puesto a la venta!':'posto à venda!'}`)
    setTab('comprar')
  }

  const mercadoFiltrado = mercado.filter(item => {
    if (filtro === 'leilao') return item.emLeilao
    if (filtro === 'venda') return !item.emLeilao
    if (filtro === 'elite') return item.rating >= 4
    return true
  })

  const tabs = [
    ['comprar', idioma==='en'?'Buy':idioma==='es'?'Comprar':'Comprar'],
    ['vender',  idioma==='en'?'Sell':idioma==='es'?'Vender':'Vender'],
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', fontFamily:'inherit' }}>
      <div style={{ background:'linear-gradient(180deg,#050D1A,#030812)', borderBottom:'1px solid rgba(255,255,255,.05)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={onVoltar} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>←</button>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>🛒 {idioma==='en'?'Market':idioma==='es'?'Mercado':'Mercado'}</div>
            <div style={{ fontSize:10, color:'#7A8699' }}>{carreira.orcamento.toLocaleString()}€ · {carreira.pombos.length} {idioma==='en'?'pigeons':idioma==='es'?'palomas':'pombos'}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {tabs.map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:'none', padding:'8px 16px', borderRadius:8, border:tab===id?'none':'1px solid rgba(255,255,255,.08)', background:tab===id?'linear-gradient(135deg,#f97316,#ea580c)':'rgba(255,255,255,.04)', color:tab===id?'#fff':'#cbd5e1', fontSize:12, fontWeight:tab===id?700:500, cursor:'pointer', fontFamily:'inherit', minHeight:36 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ margin:'10px 16px 0', padding:'10px 14px', background:msg.tipo==='ok'?'rgba(45,212,167,.1)':'rgba(248,113,113,.1)', border:`1px solid ${msg.tipo==='ok'?'rgba(45,212,167,.3)':'rgba(248,113,113,.3)'}`, borderRadius:10, fontSize:12, color:msg.tipo==='ok'?'#2DD4A7':'#f87171', fontWeight:600 }}>
          {msg.tipo==='ok'?'✅':'❌'} {msg.texto}
        </div>
      )}

      <div style={{ padding:'12px 16px' }}>

        {/* COMPRAR */}
        {tab === 'comprar' && (
          <>
            {/* Filtros */}
            <div style={{ display:'flex', gap:6, marginBottom:12, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4 }}>
              {[['todos',idioma==='en'?'All':idioma==='es'?'Todos':'Todos'],['leilao',idioma==='en'?'Auction':idioma==='es'?'Subasta':'Leilão'],['venda',idioma==='en'?'Buy now':idioma==='es'?'Compra ya':'Compra já'],['elite','⭐ Elite']].map(([id,label]) => (
                <button key={id} onClick={() => setFiltro(id)}
                  style={{ flex:'none', padding:'6px 12px', borderRadius:8, border:filtro===id?'none':'1px solid rgba(255,255,255,.08)', background:filtro===id?'linear-gradient(135deg,#1E5FD9,#1456C0)':'rgba(255,255,255,.04)', color:filtro===id?'#fff':'#cbd5e1', fontSize:11, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  {label}
                </button>
              ))}
              <button onClick={() => setMercado(gerarMercado(idioma))}
                style={{ flex:'none', padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.04)', color:'#7A8699', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
                🔄 {idioma==='en'?'Refresh':idioma==='es'?'Actualizar':'Actualizar'}
              </button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {mercadoFiltrado.map(item => (
                <CardMercado key={item.id} item={item} onComprar={comprar} onLicitar={licitar} orcamento={carreira.orcamento} idioma={idioma} />
              ))}
            </div>
          </>
        )}

        {/* VENDER */}
        {tab === 'vender' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:11, color:'#7A8699', marginBottom:4 }}>
              {idioma==='en'?'Select a pigeon to sell:':idioma==='es'?'Selecciona una paloma para vender:':'Selecciona um pombo para vender:'}
            </div>
            {carreira.pombos.map(p => {
              const sel = venderSel?.id === p.id
              const cor = p.sexo==='F'?'#c084fc':'#4C8DFF'
              return (
                <div key={p.id} onClick={() => setVenderSel(sel?null:p)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:sel?`${cor}10`:'rgba(255,255,255,.02)', border:`1.5px solid ${sel?cor:'rgba(255,255,255,.06)'}`, borderRadius:10, cursor:'pointer', transition:'all .15s' }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:`${cor}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:cor, fontFamily:"'Fraunces',serif" }}>
                    {p.anilha?.slice(-3)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:sel?cor:'#fff' }}>{p.nome}</div>
                    <div style={{ fontSize:10, color:'#475569' }}>{p.especialidade}</div>
                  </div>
                  <div style={{ display:'flex', gap:2 }}>
                    {Array.from({length:5}).map((_,i)=><div key={i} style={{ fontSize:8, color:i<p.rating?'#D4AF37':'rgba(255,255,255,.1)' }}>★</div>)}
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#D4AF37' }}>{(p.valor||1000).toLocaleString()}€</div>
                </div>
              )
            })}

            {venderSel && (
              <div style={{ padding:'14px', background:'rgba(249,115,22,.06)', border:'1px solid rgba(249,115,22,.2)', borderRadius:12, marginTop:4 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>
                  {idioma==='en'?'Set sale price for':idioma==='es'?'Precio de venta para':' Preço de venda para'} {venderSel.nome}
                </div>
                <div style={{ fontSize:11, color:'#7A8699', marginBottom:8 }}>
                  {idioma==='en'?'Market value':idioma==='es'?'Valor de mercado':'Valor de mercado'}: <span style={{ color:'#D4AF37', fontWeight:700 }}>{(venderSel.valor||1000).toLocaleString()}€</span>
                </div>
                <input type="number" value={precoVenda} onChange={e => setPrecoVenda(e.target.value)}
                  placeholder={idioma==='en'?'Sale price...':idioma==='es'?'Precio de venta...':'Preço de venda...'}
                  style={{ width:'100%', padding:'10px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, color:'#fff', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', marginBottom:10 }}/>
                <button onClick={vender} disabled={!precoVenda || isNaN(precoVenda)}
                  style={{ width:'100%', padding:'10px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  💰 {idioma==='en'?'List for sale':idioma==='es'?'Poner a la venta':'Colocar à venda'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
