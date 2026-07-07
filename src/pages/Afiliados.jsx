import { useState, useEffect, useCallback } from 'react'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'
import { useToast, Spinner, EmptyState } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { BotaoQR } from '../components/QRCode'

export default function Afiliados({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useIdioma()
  const { temBase, temPro, temElite } = useLicenca()
  const [afiliado, setAfiliado] = useState(null)
  const [referidos, setReferidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [aderindo, setAderindo] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: a } = await supabase.from('afiliados').select('*').eq('user_id', user?.id).maybeSingle()
      setAfiliado(a)
      if (a) {
        const { data: r } = await supabase.from('afiliado_referidos').select('*').eq('afiliado_id', a.id).order('created_at', { ascending:false })
        setReferidos(r||[])
      }
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const aderir = async () => {
    setAderindo(true)
    try {
      const nome = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'afiliado'
      const codigo = nome.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') + '-' + Math.random().toString(36).slice(2,6)
      const { data } = await supabase.from('afiliados').insert({
        user_id: user?.id, codigo, nome, email: user?.email, comissao_pct: 15
      }).select().single()
      setAfiliado(data); toast('Bem-vindo ao programa de afiliados!','ok')
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setAderindo(false) }
  }

  const linkAfiliado = afiliado ? `${window.location.origin}/?ref=${afiliado.codigo}` : ''
  const totalGanho = referidos.reduce((s,r)=>s+(r.comissao||0),0)
  const pagos = referidos.filter(r=>r.pago).reduce((s,r)=>s+(r.comissao||0),0)
  const pendente = totalGanho - pagos

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>

  if (!afiliado) return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.25)', borderRadius:14, padding:'20px 18px', marginBottom:16, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }} />
        <div style={{ fontSize:18, fontWeight:900, color:'#D4AF37', fontFamily:"'Fraunces',serif", marginBottom:6 }}>🤝 Programa de Afiliados</div>
        <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.7, marginBottom:16 }}>
          Recomenda o ChampionsLoft a outros columbófilos e ganha <strong style={{ color:'#D4AF37' }}>15% de comissão</strong> em cada subscrição que originares.
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20 }}>
          {[['15%','💰','Comissão por referido'],['30 dias','⏳','Cookie de rastreio'],['Mensal','📅','Pagamento']].map(([v,i,l])=>(
            <div key={l} style={{ textAlign:'center', padding:'10px 6px', background:'rgba(212,175,55,.06)', border:'1px solid rgba(212,175,55,.15)', borderRadius:10 }}>
              <div style={{ fontSize:20, fontWeight:700, color:'#D4AF37' }}>{v}</div>
              <div style={{ fontSize:9, color:'#7A8699', marginTop:2 }}>{i} {l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom:14, fontSize:12, color:'#94a3b8' }}>
          <div style={{ marginBottom:4 }}>✅ Sem investimento mínimo</div>
          <div style={{ marginBottom:4 }}>✅ Link personalizado com rastreio automático</div>
          <div style={{ marginBottom:4 }}>✅ Dashboard de estatísticas em tempo real</div>
          <div>✅ Pagamento via transferência ou Stripe</div>
        </div>
        <button className="btn btn-primary" onClick={aderir} disabled={aderindo} style={{ fontSize:14, padding:'12px 24px' }}>
          {aderindo?<Spinner/>:null} 🤝 Aderir ao Programa
        </button>
      </div>
    </div>
  )

  // Verificar plano
  const temAcesso = temPro
  if (!temAcesso) return <BloqueioPlano plano="pro" nav={nav} />

  return (
    <div>
      {/* Header com stats */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.25)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }} />
        <div style={{ fontSize:16, fontWeight:900, color:'#D4AF37', fontFamily:"'Fraunces',serif", marginBottom:12 }}>🤝 Os teus resultados</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[[referidos.length,'👥', t('referidos')],[`${totalGanho.toFixed(0)}€`,'💰', t('totalGanho')],[`${pendente.toFixed(0)}€`,'⏳', t('pendente3')]].map(([v,i,l])=>(
            <div key={l} style={{ textAlign:'center', padding:'8px', background:'rgba(255,255,255,.04)', borderRadius:8 }}>
              <div style={{ fontSize:18, fontWeight:700, color:'#D4AF37' }}>{v}</div>
              <div style={{ fontSize:9, color:'#7A8699' }}>{i} {l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Link afiliado */}
      <div className="card card-p" style={{ marginBottom:12, borderLeft:'3px solid #D4AF37' }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#D4AF37', marginBottom:8 }}>🔗 O teu link de afiliado</div>
        <div style={{ background:'#070F1D', borderRadius:8, padding:'10px 12px', fontFamily:"'Space Mono',monospace", fontSize:11, color:'#2DD4A7', marginBottom:10, wordBreak:'break-all' }}>
          {linkAfiliado}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard?.writeText(linkAfiliado); toast('Link copiado!','ok') }}>
            📋 Copiar link
          </button>
          {navigator.share && (
            <button className="btn btn-secondary btn-sm" onClick={() => navigator.share({ title:'ChampionsLoft', url:linkAfiliado, text:'Experimenta o ChampionsLoft — gestão columbófila premium!' })}>
              🔗 Partilhar
            </button>
          )}
          <BotaoQR titulo="ChampionsLoft — Afiliado" conteudo={linkAfiliado} subtitulo={`Código: ${afiliado.codigo}`} />
        </div>
        <div style={{ marginTop:10, fontSize:11, color:'#475569' }}>Código: <strong style={{ color:'#94a3b8' }}>{afiliado.codigo}</strong> · Comissão: <strong style={{ color:'#D4AF37' }}>{afiliado.comissao_pct}%</strong></div>
      </div>

      {/* Materiais de marketing */}
      <div className="card card-p" style={{ marginBottom:12 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>📣 Mensagens prontas para partilhar</div>
        {[
          { label:'WhatsApp', msg:`🕊️ Descobri o ChampionsLoft — gestão columbófila como nunca viste! Pedigree, provas, IA, comunidade. Experimenta grátis 30 dias: ${linkAfiliado}` },
          { label:'Facebook', msg:`🏆 Estou a usar o ChampionsLoft para gerir o meu pombal e é incrível! Pedigree PDF, análises IA, comunidade de columbófilos. Experimenta: ${linkAfiliado}` },
          { label:'Email', msg:`Olá,\n\nRecomendo o ChampionsLoft para gestão columbófila. Tem tudo: pedigree, provas, reprodução, saúde, IA e muito mais.\n\nExperimenta grátis durante 30 dias: ${linkAfiliado}\n\nCumprimentos` },
        ].map(({ label, msg }) => (
          <div key={label} style={{ marginBottom:8, padding:'8px 10px', background:'#070F1D', borderRadius:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:11, fontWeight:600, color:'#4C8DFF' }}>{label}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard?.writeText(msg); toast('Copiado!','ok') }}>Copiar</button>
            </div>
            <div style={{ fontSize:11, color:'#7A8699', lineHeight:1.5 }}>{msg.slice(0,80)}...</div>
          </div>
        ))}
      </div>

      {/* Histórico de referidos */}
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:10 }}>📊 Histórico de referidos</div>
        {referidos.length===0
          ? <EmptyState icon="👥" title="Sem referidos ainda" desc={`Partilha o teu link para começar a ganhar comissões`} />
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {referidos.map(r => (
                <div key={r.id} className="card card-p" style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:'#fff' }}>{r.plano||'N/D'}</div>
                    <div style={{ fontSize:11, color:'#7A8699' }}>{new Date(r.created_at).toLocaleDateString('pt-PT')}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#D4AF37' }}>{(r.comissao||0).toFixed(2)}€</div>
                    <div style={{ fontSize:10, color:r.pago?'#2DD4A7':'#f87171' }}>{r.pago?'✓ Pago':t('pendente3')}</div>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}
