import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner } from '../components/ui'

const VAGAS_TOTAL = 100
const PRECO = 13.99

export default function Fundadores({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const [ocupadas, setOcupadas] = useState(0)
  const [jeFundador, setJaFundador] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aderindo, setAderindo] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('licencas').select('fundador', { count:'exact' }).eq('fundador', true),
      user?.id ? supabase.from('licencas').select('fundador').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]).then(([{ count }, { data: minha }]) => {
      setOcupadas(count || 0)
      setJaFundador(minha?.fundador || false)
    }).finally(() => setLoading(false))
  }, [user?.id])

  const restantes = VAGAS_TOTAL - ocupadas
  const pct = Math.round((ocupadas / VAGAS_TOTAL) * 100)
  const urgente = restantes <= 20

  const aderir = async () => {
    setAderindo(true)
    try {
      // Redirigir para Stripe com price ID Elite + metadata fundador
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: 'price_1TlGQFCuZCS32LoSxqT2nOqy', // Elite mensal
          userId: user?.id,
          email: user?.email,
          fundador: true,
          successUrl: window.location.origin + '/sucesso?fundador=1',
          cancelUrl: window.location.origin,
        }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
      else toast('Erro ao criar sessão de pagamento', 'err')
    } catch(e) { toast('Erro: '+e.message, 'err') }
    finally { setAderindo(false) }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>

  return (
    <div>
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.3)', borderRadius:16, padding:'24px 20px', marginBottom:16, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#D4AF37,#F0CC6A,#D4AF37)' }}/>
        <div style={{ position:'absolute', top:'-30%', right:'-10%', width:200, height:200, background:'radial-gradient(circle,rgba(212,175,55,.08),transparent)', borderRadius:'50%' }}/>

        <div style={{ fontSize:11, fontWeight:700, color:'#D4AF37', letterSpacing:'.15em', textTransform:'uppercase', marginBottom:8 }}>Oferta Limitada</div>
        <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(26px,5vw,40px)', fontWeight:900, lineHeight:1.1, marginBottom:12, color:'#fff' }}>
          🏅 Utilizador Fundador<br/>
          <span style={{ background:'linear-gradient(135deg,#D4AF37,#B8960C)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>ChampionsLoft</span>
        </h1>
        <p style={{ fontSize:14, color:'#94a3b8', lineHeight:1.7, marginBottom:20 }}>
          Faz parte dos primeiros {VAGAS_TOTAL} columbófilos que acreditam nesta plataforma. Garante o plano Elite AI pelo preço de hoje — para sempre.
        </p>

        {/* Progresso */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
            <span style={{ color: urgente ? '#f87171' : '#94a3b8' }}>
              {urgente ? `⚠️ Apenas ${restantes} vagas restantes!` : `${restantes} vagas disponíveis`}
            </span>
            <span style={{ color:'#D4AF37', fontWeight:700 }}>{ocupadas}/{VAGAS_TOTAL}</span>
          </div>
          <div style={{ height:8, background:'#101F40', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background: urgente ? 'linear-gradient(90deg,#f97316,#f87171)' : 'linear-gradient(90deg,#D4AF37,#B8960C)', borderRadius:99, transition:'width .5s' }}/>
          </div>
        </div>

        {jeFundador ? (
          <div style={{ background:'rgba(45,212,167,.1)', border:'1px solid rgba(45,212,167,.3)', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:24, marginBottom:6 }}>🏅</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#2DD4A7' }}>Já és Utilizador Fundador!</div>
            <div style={{ fontSize:12, color:'#7A8699', marginTop:4 }}>O teu estatuto está garantido para sempre.</div>
          </div>
        ) : restantes <= 0 ? (
          <div style={{ textAlign:'center', padding:'14px', background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)', borderRadius:10 }}>
            <div style={{ fontSize:13, color:'#f87171' }}>😢 Todas as vagas foram preenchidas</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:4 }}>Subscreve o plano Elite ao preço normal</div>
            <button className="btn btn-secondary" style={{ marginTop:10 }} onClick={() => nav('precos')}>Ver Planos</button>
          </div>
        ) : (
          <button onClick={aderir} disabled={aderindo || !user} style={{
            width:'100%', padding:'16px', borderRadius:10, fontSize:15, fontWeight:800,
            cursor:'pointer', border:'none', fontFamily:'inherit',
            background:'linear-gradient(135deg,#D4AF37,#B8960C)', color:'#050D1A',
            boxShadow:'0 8px 32px rgba(212,175,55,.3)',
          }}>
            {aderindo ? <Spinner/> : `🏅 Garantir vaga por ${PRECO}€/mês`}
          </button>
        )}
      </div>

      {/* O que inclui */}
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:4 }}>O que incluis como Fundador:</div>
        {[
          ['👑', 'Plano Elite AI completo', 'Todas as funcionalidades actuais e futuras incluídas'],
          ['💰', `${PRECO}€/mês para sempre`, 'Preço garantido. Reajuste máximo de +5% ao ano'],
          ['🏅', 'Badge Fundador permanente', 'Destaque especial no perfil, leilões e comunidade'],
          ['📜', 'Certificado de Fundador', 'PDF oficial numerado com o teu número de fundador'],
          ['🎯', 'Acesso antecipado', 'Primeiros a testar novas funcionalidades antes de toda a gente'],
          ['💬', 'Canal exclusivo', 'Grupo privado de Fundadores com acesso directo à equipa'],
          ['🏆', 'Conquista Lendária', '+50 créditos e badge "Utilizador Fundador" desbloqueado'],
        ].map(([icon, titulo, desc]) => (
          <div key={titulo} style={{ display:'flex', gap:12, padding:'12px 14px', background:'#0B1830', border:'1px solid rgba(212,175,55,.12)', borderRadius:10 }}>
            <div style={{ fontSize:20, flexShrink:0 }}>{icon}</div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{titulo}</div>
              <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparativo */}
      <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:10, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#fff', marginBottom:10 }}>Fundador vs Preço Normal</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { label:'Preço actual', preco:`${PRECO}€`, sub:'/mês', cor:'#D4AF37', dest:true },
            { label:'Preço futuro', preco:'~19,99€', sub:'/mês estimado', cor:'#475569', dest:false },
          ].map(({ label, preco, sub, cor, dest }) => (
            <div key={label} style={{ textAlign:'center', padding:'14px 10px', background: dest?'rgba(212,175,55,.08)':'rgba(16,31,64,.5)', border:`1px solid ${dest?'rgba(212,175,55,.3)':'#1B2D52'}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color:'#7A8699', marginBottom:4 }}>{label}</div>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:900, color:cor }}>{preco}</div>
              <div style={{ fontSize:10, color:'#475569' }}>{sub}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:10, fontSize:11, color:'#2DD4A7' }}>
          Poupança estimada: ~72€/ano · garantida para sempre
        </div>
      </div>

      {/* FAQ */}
      <div style={{ fontSize:12, color:'#7A8699', lineHeight:1.8 }}>
        <div style={{ fontWeight:700, color:'#94a3b8', marginBottom:6 }}>Perguntas frequentes</div>
        {[
          ['Posso cancelar?', 'Sim, a qualquer momento. Se cancelares perdes o estatuto de Fundador e o preço garantido.'],
          ['O preço sobe automaticamente?', 'Não. Qualquer aumento é comunicado com 30 dias de antecedência e nunca ultrapassa 5% ao ano.'],
          ['E se a app fechar?', 'Reembolso total dos últimos 12 meses de subscrição.'],
        ].map(([p, r]) => (
          <div key={p} style={{ marginBottom:10 }}>
            <div style={{ color:'#fff', fontWeight:600 }}>❓ {p}</div>
            <div style={{ paddingLeft:20 }}>{r}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
