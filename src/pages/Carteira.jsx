import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, EmptyState } from '../pages/ui'
import { useIdioma } from '../hooks/useIdioma'

// ─── SISTEMA DE CRÉDITOS ──────────────────────────────
// 1 Crédito CL ≈ 1€ (moeda virtual interna)
// Ganhos: ligas, conquistas, afiliados, compra directa
// Gastos: inscrições ligas, features extra, marketplace destaque
// Levantamento: mínimo 20 créditos (só créditos ganhos, não comprados)

const PACOTES = [
  { id:'p10',  creditos:10,  preco:9.90,  bonus:0,   label:'Starter' },
  { id:'p25',  creditos:25,  preco:22.50, bonus:2,   label:'Popular', destaque:true },
  { id:'p50',  creditos:50,  preco:42.50, bonus:5,   label:'Pro' },
  { id:'p100', creditos:100, preco:80.00, bonus:15,  label:'Elite', gold:true },
]

const TIPO_ICON = { compra:'💳', conquista:'🏅', liga_premio:'🏆', afiliado:'🤝', levantamento:'💸', gasto_liga:'🏅', gasto_feature:'⚡', bónus:'🎁' }
const TIPO_COR  = { compra:'#4C8DFF', conquista:'#D4AF37', liga_premio:'#2DD4A7', afiliado:'#A855F7', levantamento:'#f87171', gasto_liga:'#f97316', gasto_feature:'#f97316', bónus:'#D4AF37' }

export default function Carteira({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useIdioma()
  const [saldo, setSaldo] = useState({ total:0, comprado:0, ganho:0 })
  const [transacoes, setTransacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('carteira')
  const [comprando, setComprando] = useState(false)
  const [levantando, setLevantando] = useState(false)
  const [valorLev, setValorLev] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: t } = await supabase.from('creditos_transacoes')
        .select('*').eq('user_id', user?.id).order('created_at', { ascending:false }).limit(50)
      const trans = t || []
      setTransacoes(trans)
      const totalGanho = trans.filter(x=>['conquista','liga_premio','afiliado','bónus'].includes(x.tipo)).reduce((s,x)=>s+x.valor,0)
      const totalComprado = trans.filter(x=>x.tipo==='compra').reduce((s,x)=>s+x.valor,0)
      const totalGasto = trans.filter(x=>x.valor<0).reduce((s,x)=>s+x.valor,0)
      setSaldo({ total: totalGanho+totalComprado+totalGasto, comprado: totalComprado, ganho: totalGanho })
    } catch(e) {}
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const comprar = async (pacote) => {
    setComprando(true)
    try {
      const res = await fetch('/api/stripe-checkout', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          tipo: 'creditos',
          pacote: pacote.id,
          creditos: pacote.creditos + pacote.bonus,
          preco: pacote.preco,
          userId: user?.id,
          email: user?.email,
          successUrl: window.location.origin + '?creditos=ok',
          cancelUrl: window.location.origin,
        }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
      else toast('Erro ao criar sessão','err')
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setComprando(false) }
  }

  const levantar = async () => {
    const val = parseInt(valorLev)
    if (!val || val < 20) { toast(t('minimoLevantar'),'warn'); return }
    if (val > saldo.ganho) { toast('Só podes levantar créditos ganhos (não comprados)','warn'); return }
    setLevantando(true)
    try {
      await supabase.from('creditos_transacoes').insert({
        user_id: user?.id, tipo:'levantamento', valor: -val,
        descricao: `Pedido de levantamento de ${val} créditos`,
        estado:'pendente',
      })
      toast(`Pedido de levantamento de ${val} créditos registado! Processado em 2-5 dias úteis.`,'ok')
      setValorLev(''); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLevantando(false) }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.25)', borderRadius:14, padding:'16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#D4AF37,#4C8DFF,#2DD4A7)' }}/>
        <div style={{ fontSize:11, color:'#D4AF37', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:6 }}>💎 Carteira CL</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:48, fontWeight:900, color:'#D4AF37', lineHeight:1 }}>
          {saldo.total}<span style={{ fontSize:16, color:'#7A8699', fontWeight:400 }}> créditos</span>
        </div>
        <div style={{ display:'flex', gap:16, marginTop:10 }}>
          <div style={{ fontSize:11, color:'#7A8699' }}>💳 Comprados: <span style={{ color:'#4C8DFF' }}>{saldo.comprado}</span></div>
          <div style={{ fontSize:11, color:'#7A8699' }}>🏅 Ganhos: <span style={{ color:'#2DD4A7' }}>{saldo.ganho}</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14 }}>
        {[['carteira','💎 Carteira'],['comprar','💳 Comprar'],['levantar','💸 Levantar'],['historico','📋 Histórico']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'7px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'linear-gradient(135deg,#D4AF37,#B8960C)':'none', color:tab===t?'#050D1A':'#475569' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner lg/></div>
      : tab === 'carteira' ? (
        <div>
          {/* Como ganhar */}
          <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:10 }}>Como ganhar créditos</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
            {[
              ['🏅', 'Conquistas', 'Cada conquista desbloqueada tem créditos de prémio', '1-100'],
              ['🏆', 'Ligas', 'Prémios por posição em ligas com entrada paga', 'Variável'],
              ['🤝', 'Afiliados', '15% de comissão em créditos por cada referido', '~2/mês'],
              ['👑', 'Ligas Oficiais', 'Prémios patrocinados no fim de época', 'Top 3'],
              ['🎁', 'Bónus', 'Promoções especiais e eventos da plataforma', 'Ocasional'],
            ].map(([i,t,d,v])=>(
              <div key={t} style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', background:'#0B1830', border:'1px solid #1B2D52', borderRadius:8 }}>
                <span style={{ fontSize:20 }}>{i}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{t}</div>
                  <div style={{ fontSize:11, color:'#7A8699' }}>{d}</div>
                </div>
                <div style={{ fontSize:12, color:'#D4AF37', fontWeight:700 }}>{v} cr.</div>
              </div>
            ))}
          </div>
          {/* Como gastar */}
          <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:10 }}>Como usar créditos</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[
              ['🏅', 'Inscrição em ligas', 'Ligas privadas com entrada paga', '5-50'],
              ['⚡', 'Análise IA extra', 'Relatório adicional fora do plano', '10'],
              ['📌', 'Destaque marketplace', 'Pombo em destaque por 7 dias', '5'],
              ['📜', 'Certificado extra', 'PDF de pedigree premium adicional', '3'],
            ].map(([i,t,d,v])=>(
              <div key={t} style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', background:'#0B1830', border:'1px solid #1B2D52', borderRadius:8 }}>
                <span style={{ fontSize:20 }}>{i}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{t}</div>
                  <div style={{ fontSize:11, color:'#7A8699' }}>{d}</div>
                </div>
                <div style={{ fontSize:12, color:'#f97316', fontWeight:700 }}>-{v} cr.</div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'comprar' ? (
        <div>
          <div style={{ fontSize:12, color:'#7A8699', marginBottom:14, lineHeight:1.6 }}>
            Compra créditos para usar em ligas, funcionalidades extra e marketplace. Pacotes maiores têm créditos bónus incluídos.
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {PACOTES.map(p => (
              <div key={p.id} style={{ background: p.gold?'linear-gradient(135deg,rgba(212,175,55,.1),rgba(184,150,12,.05))':p.destaque?'rgba(76,141,255,.08)':'#0B1830', border:`1px solid ${p.gold?'rgba(212,175,55,.3)':p.destaque?'rgba(76,141,255,.25)':'#1B2D52'}`, borderRadius:12, padding:'14px 16px', position:'relative' }}>
                {p.destaque && <div style={{ position:'absolute', top:-9, right:14, background:'#4C8DFF', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 10px', borderRadius:99 }}>POPULAR</div>}
                {p.gold && <div style={{ position:'absolute', top:-9, right:14, background:'linear-gradient(135deg,#D4AF37,#B8960C)', color:'#050D1A', fontSize:9, fontWeight:700, padding:'2px 10px', borderRadius:99 }}>MELHOR VALOR</div>}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{p.label} — {p.creditos} créditos{p.bonus>0?<span style={{ color:'#2DD4A7', fontSize:11 }}> +{p.bonus} bónus</span>:null}</div>
                    <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>~{((p.preco/(p.creditos+p.bonus))).toFixed(2)}€ por crédito</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color: p.gold?'#D4AF37':p.destaque?'#4C8DFF':'#fff' }}>{p.preco}€</div>
                    <button onClick={() => comprar(p)} disabled={comprando} style={{ marginTop:4, padding:'6px 16px', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', background: p.gold?'linear-gradient(135deg,#D4AF37,#B8960C)':p.destaque?'#4C8DFF':'#1B2D52', color: p.gold?'#050D1A':p.destaque?'#fff':'#94a3b8' }}>
                      {comprando?<Spinner/>:t('comprar2')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'levantar' ? (
        <div>
          <div style={{ background:'rgba(248,113,113,.06)', border:'1px solid rgba(248,113,113,.2)', borderRadius:8, padding:'12px 14px', marginBottom:16, fontSize:12, color:'#94a3b8', lineHeight:1.7 }}>
            ⚠️ Só podes levantar créditos <strong style={{color:'#fff'}}>ganhos</strong> (conquistas, ligas, afiliados). Créditos comprados não são levantáveis.<br/>
            Mínimo: <strong style={{color:'#fff'}}>20 créditos</strong> · Comissão: <strong style={{color:'#fff'}}>10%</strong> · Prazo: 2-5 dias úteis
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:12, color:'#7A8699', marginBottom:6 }}>Créditos ganhos disponíveis para levantamento</div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:32, fontWeight:900, color:'#2DD4A7' }}>{saldo.ganho} créditos</div>
            <div style={{ fontSize:11, color:'#7A8699' }}>≈ {(saldo.ganho * 0.9).toFixed(2)}€ após comissão de 10%</div>
          </div>
          {saldo.ganho >= 20 ? (
            <div style={{ display:'flex', gap:10 }}>
              <input className="input" type="number" value={valorLev} onChange={e=>setValorLev(e.target.value)} placeholder={`Mín. 20, máx. ${saldo.ganho}`} min={20} max={saldo.ganho} style={{ flex:1 }}/>
              <button className="btn btn-primary" onClick={levantar} disabled={levantando}>{levantando?<Spinner/>:'💸 Levantar'}</button>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:20, color:'#475569', fontSize:13 }}>
              Precisas de pelo menos 20 créditos ganhos para levantar.<br/>
              Tens actualmente <strong style={{color:'#fff'}}>{saldo.ganho}</strong> créditos ganhos.
            </div>
          )}
        </div>
      ) : (
        <div>
          {transacoes.length === 0
            ? <EmptyState icon="💎" title="Sem movimentos" desc="As tuas transacções de créditos aparecerão aqui"/>
            : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {transacoes.map(t => (
                  <div key={t.id} style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', background:'#0B1830', border:'1px solid #1B2D52', borderRadius:8 }}>
                    <span style={{ fontSize:18 }}>{TIPO_ICON[t.tipo]||'💎'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:'#fff' }}>{t.descricao||t.tipo}</div>
                      <div style={{ fontSize:10, color:'#475569' }}>{t.created_at?new Date(t.created_at).toLocaleDateString('pt-PT'):''}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color: t.valor>0?'#2DD4A7':'#f87171' }}>
                      {t.valor>0?'+':''}{t.valor} cr.
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  )
}
