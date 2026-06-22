// api/stripe-webhook.js — Vercel Edge Function
export const config = { runtime: 'edge' }

// Mapeamento price ID → plano (para webhook)
const PRICE_PLANO = {
  'price_1TlGBkCuZCS32LoSbGw1sYoR': 'base',
  'price_1TlGBkCuZCS32LoSETHnq6Aj': 'base',
  'price_1TlGLoCuZCS32LoSLDhybK7f': 'profissional',
  'price_1TlGLoCuZCS32LoSp19L3Q3U': 'profissional',
  'price_1TlGQFCuZCS32LoSxqT2nOqy': 'elite',
  'price_1TlGQFCuZCS32LoSyM0xMYmG': 'elite',
}

// Determinar plano de grupo baseado no price + quantidade
const getPlano = (priceId, quantidade) => {
  const base = PRICE_PLANO[priceId]
  if (!base || !quantidade || quantidade <= 1) return base || 'base'
  if (base === 'profissional') {
    if (quantidade >= 13) return 'pro_grupo_13'
    if (quantidade >= 6)  return 'pro_grupo_6_12'
    if (quantidade >= 3)  return 'pro_grupo_3_5'
    return 'profissional'
  }
  if (base === 'elite') {
    if (quantidade >= 13) return 'elite_grupo_13'
    if (quantidade >= 6)  return 'elite_grupo_6_12'
    if (quantidade >= 3)  return 'elite_grupo_3_5'
    return 'elite'
  }
  return base
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const sig = req.headers.get('stripe-signature')
  const body = await req.text()

  let event
  try {
    event = await verifyStripeSignature(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch(e) {
    return new Response(`Webhook Error: ${e.message}`, { status: 400 })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const sb = async (path, method, body) => fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const s = event.data.object
        const userId = s.metadata?.user_id
        const planoMeta = s.metadata?.plano
        const qtd = parseInt(s.metadata?.quantidade) || 1
        if (!userId) break

        // Buscar price ID da subscription para determinar plano
        let plano = planoMeta || 'base'
        if (s.subscription) {
          const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${s.subscription}`, {
            headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
          })
          const sub = await subRes.json()
          const priceId = sub.items?.data?.[0]?.price?.id
          if (priceId) plano = getPlano(priceId, qtd)
        }

        await sb('licencas', 'POST', [{
          user_id: userId, plano, ativo: true,
          quantidade: qtd,
          stripe_customer_id: s.customer,
          stripe_subscription_id: s.subscription,
          trial_ativo: s.payment_status === 'no_payment_required',
          updated_at: new Date().toISOString(),
        }])
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const priceId = sub.items?.data?.[0]?.price?.id
        const qtd = sub.items?.data?.[0]?.quantity || 1
        const plano = getPlano(priceId, qtd)
        const ativo = ['active','trialing'].includes(sub.status)
        const trial = sub.status === 'trialing'
        await sb(`licencas?stripe_subscription_id=eq.${sub.id}`, 'PATCH', {
          plano, ativo, quantidade: qtd, trial_ativo: trial,
          updated_at: new Date().toISOString()
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await sb(`licencas?stripe_subscription_id=eq.${sub.id}`, 'PATCH', {
          ativo: false, plano: 'gratuito', trial_ativo: false,
          updated_at: new Date().toISOString()
        })
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object
        await sb(`licencas?stripe_subscription_id=eq.${inv.subscription}`, 'PATCH', {
          ativo: false, updated_at: new Date().toISOString()
        })
        break
      }

      case 'customer.subscription.trial_will_end': {
        // Notificar utilizador que o trial acaba em 3 dias
        // (implementar notificação por email aqui se necessário)
        console.log('Trial a acabar:', event.data.object.id)
        break
      }
    }
  } catch(e) {
    console.error('Webhook handler error:', e)
    return new Response('Handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader) throw new Error('Sem assinatura Stripe')
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [k,v] = part.split('='); acc[k.trim()] = v?.trim(); return acc
  }, {})
  const { t, v1: signature } = parts
  if (!t || !signature) throw new Error('Assinatura inválida')
  const signed = `${t}.${payload}`
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name:'HMAC', hash:'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed))
  const expected = Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('')
  if (expected !== signature) throw new Error('Assinatura não corresponde')
  if (Math.abs(Date.now()/1000 - parseInt(t)) > 300) throw new Error('Timestamp expirado')
  return JSON.parse(payload)
}
