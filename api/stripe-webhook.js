export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

  try {
    const body = await req.text()
    const event = JSON.parse(body)

    const supabaseHeaders = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.user_id
      const plano = session.metadata?.plano
      const email = session.customer_email
      if (email) {
        const fim = new Date()
        fim.setMonth(fim.getMonth() + 1)
        await fetch(`${SUPABASE_URL}/rest/v1/licencas?email=eq.${encodeURIComponent(email)}`, {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify({ plano: plano||'base', ativo: true, validade: fim.toISOString().slice(0,10), user_id: userId })
        })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const email = event.data.object.customer_email
      if (email) {
        await fetch(`${SUPABASE_URL}/rest/v1/licencas?email=eq.${encodeURIComponent(email)}`, {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify({ plano: 'gratuito', ativo: false })
        })
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const email = event.data.object.customer_email
      if (email) {
        await fetch(`${SUPABASE_URL}/rest/v1/licencas?email=eq.${encodeURIComponent(email)}`, {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify({ ativo: false })
        })
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 })
  }
}
