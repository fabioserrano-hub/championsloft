// Vercel Edge Function - Stripe Checkout
export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY
  if (!STRIPE_SECRET) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500 })
  }

  try {
    const { priceId, email, userId, plano } = await req.json()

    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': `${process.env.APP_URL || 'https://championsloft-reuo.vercel.app'}/sucesso?session_id={CHECKOUT_SESSION_ID}&plano=${plano}&user=${userId}`,
      'cancel_url': `${process.env.APP_URL || 'https://championsloft-reuo.vercel.app'}/precos`,
      'customer_email': email,
      'metadata[user_id]': userId,
      'metadata[plano]': plano,
    })

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: session.error?.message }), { status: 400 })
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
