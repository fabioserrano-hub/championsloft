// Vercel Edge Function - Relatório IA da Época (Elite AI)
export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'Anthropic API not configured' }), { status: 500 })
  }

  try {
    const resumo = await req.json()

    const prompt = `És um treinador especialista em columbofilia portuguesa, com décadas de experiência a analisar épocas de pombos-correio.

Analisa os seguintes dados da época ${resumo.ano} e escreve um relatório profissional em português de Portugal, com tom directo e técnico:

- Efectivo: ${resumo.efectivo} pombos
- Provas disputadas: ${resumo.provas}
- Vitórias (1º lugar): ${resumo.vitorias}
- Top 5 pombos por percentil: ${JSON.stringify(resumo.topPombos)}
- Pombos candidatos a dispensa (baixo percentil): ${JSON.stringify(resumo.aDispensar)}

Escreve um relatório com:
1. Um resumo executivo da época (2-3 frases)
2. Os pontos fortes do efectivo, destacando o(s) melhor(es) pombo(s)
3. Recomendação clara sobre os pombos a dispensar, com justificação
4. Uma sugestão estratégica para a próxima época

Sê específico, usa os nomes e números fornecidos. Não inventes dados que não foram fornecidos. Máximo 300 palavras.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Erro na API Anthropic' }), { status: 400 })
    }

    const texto = data.content?.find(b => b.type === 'text')?.text || 'Não foi possível gerar o relatório.'

    return new Response(JSON.stringify({ relatorio: texto }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
