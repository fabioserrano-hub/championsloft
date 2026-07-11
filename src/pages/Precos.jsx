import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useLicenca } from '../hooks/useLicenca'
import { useToast, Spinner, Badge } from '../components/ui'

// Price IDs live — 22/06/2026
const PRICE_IDS = {
  base:        { mensal: 'price_1TlGBkCuZCS32LoSbGw1sYoR', anual: 'price_1TlGBkCuZCS32LoSETHnq6Aj' },
  profissional:{ mensal: 'price_1TlGLoCuZCS32LoSLDhybK7f', anual: 'price_1TlGLoCuZCS32LoSp19L3Q3U' },
  elite:       { mensal: 'price_1TlGQFCuZCS32LoSxqT2nOqy', anual: 'price_1TlGQFCuZCS32LoSyM0xMYmG' },
  // Grupos usam o mesmo price ID — quantidade enviada ao checkout determina faixa
  pro_grupo_3_5:    { mensal: 'price_1TlGLoCuZCS32LoSLDhybK7f', anual: 'price_1TlGLoCuZCS32LoSp19L3Q3U' },
  pro_grupo_6_12:   { mensal: 'price_1TlGLoCuZCS32LoSLDhybK7f', anual: 'price_1TlGLoCuZCS32LoSp19L3Q3U' },
  pro_grupo_13:     { mensal: 'price_1TlGLoCuZCS32LoSLDhybK7f', anual: 'price_1TlGLoCuZCS32LoSp19L3Q3U' },
  elite_grupo_3_5:  { mensal: 'price_1TlGQFCuZCS32LoSxqT2nOqy', anual: 'price_1TlGQFCuZCS32LoSyM0xMYmG' },
  elite_grupo_6_12: { mensal: 'price_1TlGQFCuZCS32LoSxqT2nOqy', anual: 'price_1TlGQFCuZCS32LoSyM0xMYmG' },
  elite_grupo_13:   { mensal: 'price_1TlGQFCuZCS32LoSxqT2nOqy', anual: 'price_1TlGQFCuZCS32LoSyM0xMYmG' },
}

const PLANOS_INDIVIDUAL = [
  { id: 'trial', nome: 'Trial', icon: '🕊️', desc: '30 dias grátis — sem compromisso', precoMes: 0, precoAno: 0, diaLabel: '30 dias grátis',
    feats: ['Até 15 pombos', 'Todos os módulos visíveis', 'Backup dos dados incluído'], bloqueadas: ['Comunidade', 'IA', 'Relatórios'] },
  { id: 'base', nome: 'Base', icon: '🐦', desc: 'Para o columbófilo activo', precoMes: 7.99, precoAno: 79.90, diaLabel: '€0,22/dia',
    feats: ['Pombos ilimitados', 'Reprodução completa', 'Alimentação & tratamentos', 'Calendário & checklist', 'Comunidade'], bloqueadas: ['Relatório IA', 'Casais IA'] },
  { id: 'profissional', nome: 'Pro', icon: '⭐', desc: 'Para o columbófilo exigente', precoMes: 9.99, precoAno: 99.90, diaLabel: '€0,27/dia',
    feats: ['Tudo do Base', 'MeteoProva', 'Marketplace', 'Mensagens', 'Relatórios avançados'], bloqueadas: ['Relatório IA', 'Casais IA'], destaque: true },
  { id: 'elite', nome: 'Elite AI', icon: '🏆', desc: 'O poder da IA ao serviço do teu pombal', precoMes: 15.99, precoAno: 159.90, diaLabel: '€0,38/dia',
    feats: ['Tudo do Pro', 'Relatório IA de época', 'Seleccionador de Casais IA', 'Suporte prioritário'], bloqueadas: [], gold: true },
]

const PLANOS_GRUPO = [
  { id: 'pro_grupo_3_5',   nome: 'Pro Grupo', faixa: '3-5 licenças',   icon: '⭐', precoMes: 9.49,  precoAno: 94.90,  diaLabel: '€0,32/lic/dia', quantidade: 3 },
  { id: 'pro_grupo_6_12',  nome: 'Pro Grupo', faixa: '6-12 licenças',  icon: '⭐', precoMes: 8.49,  precoAno: 84.90,  diaLabel: '€0,28/lic/dia', quantidade: 6, destaque: true },
  { id: 'pro_grupo_13',    nome: 'Pro Grupo', faixa: '13+ licenças',   icon: '⭐', precoMes: 7.49,  precoAno: 74.90,  diaLabel: '€0,25/lic/dia', quantidade: 13 },
  { id: 'elite_grupo_3_5', nome: 'Elite AI Grupo', faixa: '3-5 licenças',  icon: '🏆', precoMes: 14.39, precoAno: 143.90, diaLabel: '€0,48/lic/dia', quantidade: 3, gold: true },
  { id: 'elite_grupo_6_12',nome: 'Elite AI Grupo', faixa: '6-12 licenças', icon: '🏆', precoMes: 12.79, precoAno: 127.90, diaLabel: '€0,43/lic/dia', quantidade: 6, gold: true },
  { id: 'elite_grupo_13',  nome: 'Elite AI Grupo', faixa: '13+ licenças',  icon: '🏆', precoMes: 11.19, precoAno: 111.90, diaLabel: '€0,37/lic/dia', quantidade: 13, gold: true },
]

export default function Precos({ nav }) {
  const toast = useToast()
  const { user } = useAuth()
  const { plano: planoAtual } = useLicenca()
  const [periodo, setPeriodo] = useState('mensal')
  const [tipo, setTipo] = useState('individual')
  const [loadingPlano, setLoadingPlano] = useState(null)

  const checkout = async (planoId) => {
    if (planoId === 'gratuito') { toast('Já está no plano Gratuito', 'ok'); return }
    if (!user) { toast('Inicie sessão primeiro', 'warn'); return }
    const priceId = PRICE_IDS[planoId]?.[periodo]
    if (!priceId || priceId.startsWith('price_REPLACE')) { toast('Plano ainda não configurado no Stripe', 'warn'); return }
    setLoadingPlano(planoId)
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, email: user.email, userId: user.id, plano: planoId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao iniciar checkout')
      if (data.url) window.location.href = data.url
      else throw new Error('Sem URL de checkout na resposta')
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoadingPlano(null) }
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Planos &amp; Preços</div><div className="section-sub">Plano actual: {planoAtual}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: '#1a2840', borderRadius: 10, padding: 4 }}>
          {[['individual', '👤 Individual'], ['grupo', '🏛️ Coletividades']].map(([t, l]) => (
            <button key={t} onClick={() => setTipo(t)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: tipo === t ? '#1ed98a' : 'none', color: tipo === t ? '#0a0f14' : '#94a3b8' }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#1a2840', borderRadius: 10, padding: 4 }}>
          {[['mensal', 'Mensal'], ['anual', 'Anual — 2 meses grátis 🎁']].map(([p, l]) => (
            <button key={p} onClick={() => setPeriodo(p)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: periodo === p ? '#1ed98a' : 'none', color: periodo === p ? '#0a0f14' : '#94a3b8' }}>{l}</button>
          ))}
        </div>
      </div>

      {tipo === 'individual' && (
        <div className="grid-4">
          {PLANOS_INDIVIDUAL.map(p => {
            const preco = periodo === 'mensal' ? p.precoMes : p.precoAno
            const isAtual = planoAtual === p.id
            return (
              <div key={p.id} className="card card-p" style={{ borderColor: p.destaque ? '#1ed98a' : p.gold ? 'rgba(250,204,21,.3)' : undefined, background: p.gold ? 'rgba(250,204,21,.03)' : undefined, position: 'relative' }}>
                {p.destaque && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#1ed98a', color: '#0a0f14', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>MAIS POPULAR</div>}
                <div style={{ fontSize: 26, marginBottom: 8 }}>{p.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: p.gold ? '#facc15' : '#fff' }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>{p.desc}</div>
                <div style={{ marginBottom: 14 }}>
                  {preco === 0
                    ? <div style={{ fontFamily:'Barlow Condensed', fontSize:28, fontWeight:700, color:'#fff' }}>Grátis</div>
                    : <>
                        <span style={{ fontFamily:'Barlow Condensed', fontSize:28, fontWeight:700, color:'#fff' }}>{preco}€</span>
                        <span style={{ fontSize:11, color:'#64748b' }}>/{periodo==='mensal'?'mês':'ano'}</span>
                        {p.diaLabel && <div style={{ fontSize:10, color: p.gold?'#D4AF37':'#2DD4A7', fontWeight:600, marginTop:2 }}>{p.diaLabel} ☕</div>}
                      </>
                  }
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, minHeight: 100 }}>
                  {p.feats.map((f, i) => <div key={i} style={{ fontSize: 11, color: '#cbd5e1', display: 'flex', gap: 6 }}><span style={{ color: '#1ed98a' }}>✓</span>{f}</div>)}
                  {p.bloqueadas.map((f, i) => <div key={i} style={{ fontSize: 11, color: '#475569', display: 'flex', gap: 6 }}><span>✕</span>{f}</div>)}
                </div>
                <button className={`btn ${isAtual ? 'btn-secondary' : 'btn-primary'} w-full`} style={{ justifyContent: 'center', ...(p.gold && !isAtual ? { background: '#facc15', color: '#0a0f14' } : {}) }}
                  disabled={isAtual || loadingPlano === p.id} onClick={() => checkout(p.id)}>
                  {loadingPlano === p.id ? <Spinner /> : isAtual ? 'Plano Actual' : p.id === 'gratuito' ? 'Começar Grátis' : 'Subscrever'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {tipo === 'grupo' && (
        <div>
          {/* Banner argumento coletividade */}
          <div style={{ background:'rgba(45,212,167,.08)', border:'1px solid rgba(45,212,167,.2)', borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:28 }}>☕</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#2DD4A7' }}>Por menos de 19 cêntimos por dia, organize toda a sua coletividade</div>
              <div style={{ fontSize:11, color:'#7A8699' }}>Pro Grupo 13+ · €5,99/utilizador/mês · Cancela quando quiser</div>
            </div>
          </div>
          <div style={{ fontSize:13, color:'#94a3b8', marginBottom:12 }}>Preço por utilizador/mês — quanto maior o grupo, maior o desconto.</div>
          <div className="grid-3">
            {PLANOS_GRUPO.map(p => {
              const preco = periodo === 'mensal' ? p.precoMes : p.precoAno
              const isAtual = planoAtual === p.id
              return (
                <div key={p.id} className="card card-p" style={{ borderColor: p.destaque?'#2DD4A7':p.gold?'rgba(250,204,21,.3)':undefined, position:'relative' }}>
                  {p.destaque && <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:'#2DD4A7', color:'#0a0f14', fontSize:9, fontWeight:700, padding:'3px 10px', borderRadius:99, whiteSpace:'nowrap' }}>MELHOR VALOR</div>}
                  <div style={{ fontSize:22, marginBottom:6 }}>{p.icon}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:p.gold?'#facc15':'#fff' }}>{p.nome}</div>
                  <Badge v="gray">{p.faixa}</Badge>
                  <div style={{ marginTop:10, marginBottom:4 }}>
                    <span style={{ fontFamily:'Barlow Condensed', fontSize:22, fontWeight:700, color:'#fff' }}>{preco}€</span>
                    <span style={{ fontSize:11, color:'#64748b' }}>/utilizador/{periodo==='mensal'?'mês':'ano'}</span>
                  </div>
                  {p.diaLabel && <div style={{ fontSize:10, color:p.gold?'#D4AF37':'#2DD4A7', fontWeight:600, marginBottom:10 }}>{p.diaLabel} ☕</div>}
                  <button className="btn btn-primary w-full" style={{ justifyContent:'center', ...(p.gold&&!isAtual?{background:'#facc15',color:'#0a0f14'}:{}) }}
                    disabled={isAtual||loadingPlano===p.id} onClick={()=>checkout(p.id)}>
                    {loadingPlano===p.id?<Spinner />:isAtual?'Plano Actual':'Subscrever'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, maxWidth: 800, marginInline: 'auto' }}>
        {[['🔒', 'Pagamento Seguro', 'Stripe · SSL'], ['❌', 'Sem Contratos', 'Cancela quando quiser'], ['🎁', 'Garantia', 'Suporte incluído'], ['📞', 'Suporte', 'Sempre disponível']].map(([icon, t, d], i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{t}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{d}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
