import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useLicenca } from '../hooks/useLicenca'
import { useToast, Spinner, Badge } from '../components/ui'

// ⚠️ SUBSTITUIR pelos Price IDs reais do Stripe (formato price_xxxxxxxxxxxxx)
// Cada plano tem um ID para mensal e outro para anual.
const PRICE_IDS = {
  base:                 { mensal: 'price_REPLACE_base_mensal',                 anual: 'price_REPLACE_base_anual' },
  profissional:         { mensal: 'price_REPLACE_profissional_mensal',         anual: 'price_REPLACE_profissional_anual' },
  elite:                { mensal: 'price_REPLACE_elite_mensal',                anual: 'price_REPLACE_elite_anual' },
  pro_grupo_1_5:        { mensal: 'price_REPLACE_pro_grupo_1_5_mensal',        anual: 'price_REPLACE_pro_grupo_1_5_anual' },
  pro_grupo_6_12:       { mensal: 'price_REPLACE_pro_grupo_6_12_mensal',       anual: 'price_REPLACE_pro_grupo_6_12_anual' },
  pro_grupo_13:         { mensal: 'price_REPLACE_pro_grupo_13_mensal',         anual: 'price_REPLACE_pro_grupo_13_anual' },
  elite_grupo_1_5:      { mensal: 'price_REPLACE_elite_grupo_1_5_mensal',      anual: 'price_REPLACE_elite_grupo_1_5_anual' },
  elite_grupo_6_12:     { mensal: 'price_REPLACE_elite_grupo_6_12_mensal',     anual: 'price_REPLACE_elite_grupo_6_12_anual' },
  elite_grupo_13:       { mensal: 'price_REPLACE_elite_grupo_13_mensal',       anual: 'price_REPLACE_elite_grupo_13_anual' },
}

const PLANOS_INDIVIDUAL = [
  { id: 'gratuito', nome: 'Gratuito', icon: '🕊️', desc: 'Para experimentar', precoMes: 0, precoAno: 0, feats: ['Até 15 pombos', 'Provas e treinos', 'Saúde básica'], bloqueadas: ['Comunidade', 'Relatório IA'] },
  { id: 'base', nome: 'Base', icon: '🐦', desc: 'Para o columbófilo activo', precoMes: 7.99, precoAno: 79.90, feats: ['Pombos ilimitados', 'Reprodução completa', 'Alimentação & tratamentos', 'Calendário & checklist'], bloqueadas: ['Relatório IA'] },
  { id: 'profissional', nome: 'Profissional', icon: '⭐', desc: 'Para o columbófilo exigente', precoMes: 11.99, precoAno: 119.90, feats: ['Tudo do Base', 'Comunidade & rankings', 'MeteoProva', 'Fim de época'], bloqueadas: ['Relatório IA'], destaque: true },
  { id: 'elite', nome: 'Elite AI', icon: '🏆', desc: 'O poder da IA', precoMes: 16.99, precoAno: 169.90, feats: ['Tudo do Profissional', 'Relatório IA de época', 'Sugestões de casais por IA', 'Suporte prioritário'], bloqueadas: [], gold: true },
]

const PLANOS_GRUPO = [
  { id: 'pro_grupo_1_5', nome: 'Profissional Grupo', faixa: '1-5 utilizadores', icon: '⭐', precoMes: 11.99, precoAno: 119.90 },
  { id: 'pro_grupo_6_12', nome: 'Profissional Grupo', faixa: '6-12 utilizadores', icon: '⭐', precoMes: 9.99, precoAno: 99.90 },
  { id: 'pro_grupo_13', nome: 'Profissional Grupo', faixa: '13+ utilizadores', icon: '⭐', precoMes: 7.99, precoAno: 79.90 },
  { id: 'elite_grupo_1_5', nome: 'Elite AI Grupo', faixa: '1-5 utilizadores', icon: '🏆', precoMes: 16.99, precoAno: 169.90, gold: true },
  { id: 'elite_grupo_6_12', nome: 'Elite AI Grupo', faixa: '6-12 utilizadores', icon: '🏆', precoMes: 13.99, precoAno: 139.90, gold: true },
  { id: 'elite_grupo_13', nome: 'Elite AI Grupo', faixa: '13+ utilizadores', icon: '🏆', precoMes: 5.99, precoAno: 59.90, gold: true },
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
                  {preco === 0 ? <div style={{ fontFamily: 'Barlow Condensed', fontSize: 28, fontWeight: 700, color: '#fff' }}>Grátis</div>
                    : <><span style={{ fontFamily: 'Barlow Condensed', fontSize: 28, fontWeight: 700, color: '#fff' }}>{preco}€</span><span style={{ fontSize: 11, color: '#64748b' }}>/{periodo === 'mensal' ? 'mês' : 'ano'}</span></>}
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
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>Para coletividades e clubes — preço por utilizador/mês, escalonado pelo número de membros.</div>
          <div className="grid-3">
            {PLANOS_GRUPO.map(p => {
              const preco = periodo === 'mensal' ? p.precoMes : p.precoAno
              const isAtual = planoAtual === p.id
              return (
                <div key={p.id} className="card card-p" style={{ borderColor: p.gold ? 'rgba(250,204,21,.3)' : undefined }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{p.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.gold ? '#facc15' : '#fff' }}>{p.nome}</div>
                  <Badge v="gray">{p.faixa}</Badge>
                  <div style={{ marginTop: 10, marginBottom: 14 }}>
                    <span style={{ fontFamily: 'Barlow Condensed', fontSize: 22, fontWeight: 700, color: '#fff' }}>{preco}€</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>/utilizador/{periodo === 'mensal' ? 'mês' : 'ano'}</span>
                  </div>
                  <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={isAtual || loadingPlano === p.id} onClick={() => checkout(p.id)}>
                    {loadingPlano === p.id ? <Spinner /> : isAtual ? 'Plano Actual' : 'Subscrever'}
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
