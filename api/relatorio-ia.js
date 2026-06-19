// Vercel Edge Function — Relatório IA da Época (Elite AI)
// Requer: ANTHROPIC_API_KEY nas variáveis de ambiente do Vercel
export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada no Vercel. Vá a Settings → Environment Variables e adicione a chave.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const resumo = await req.json()

    const prompt = `És um treinador especialista em columbofilia portuguesa, com décadas de experiência a analisar épocas de pombos-correio.

Analisa os seguintes dados da época ${resumo.ano} e escreve um relatório profissional em português de Portugal, com tom directo e técnico:

**DADOS DO EFECTIVO:**
- Total de pombos: ${resumo.total}
- Pombos activos: ${resumo.ativos}
- Machos: ${resumo.machos} | Fêmeas: ${resumo.femeas}
- Especializações: ${JSON.stringify(resumo.porEspecialidade || {})}

**RESULTADOS DA ÉPOCA:**
- Provas realizadas: ${resumo.nProvas}
- Vitórias (1º lugar): ${resumo.vitorias}
- Top 3: ${resumo.top3 || 0}
- Top 10: ${resumo.top10 || 0}
- Velocidade média: ${resumo.velMedia || 'N/D'} km/h
- Melhor percentil: ${resumo.melhorPercentil || 'N/D'}%

**TOP 3 POMBOS DA ÉPOCA:**
${(resumo.topPombos || []).map((p, i) => `${i+1}. ${p.nome} (${p.anilha}) — ${p.provas} provas, percentil ${p.percentil}%`).join('\n') || 'Sem dados'}

**REPRODUÇÃO:**
- Acasalamentos: ${resumo.acasalamentos || 0}
- Ninhadas: ${resumo.ninhadas || 0}
- Borrachinhos nascidos: ${resumo.borrachinhos || 0}

**SAÚDE:**
- Registos de saúde: ${resumo.registosSaude || 0}
- Pombos com problemas: ${resumo.problemaSaude || 0}

Escreve um relatório com estas secções:
1. **Resumo Executivo** (2-3 frases sobre a época no geral)
2. **Análise de Desempenho** (o que correu bem, o que correu mal, comparação com o esperado)
3. **Pombos em Destaque** (análise dos melhores e porquê se destacaram)
4. **Pontos de Melhoria** (3-5 sugestões concretas e accionáveis para a próxima época)
5. **Decisões de Selecção** (quais pombos dispensar, quais manter, quais usar na reprodução)

Sê específico, usa os dados fornecidos, e dá recomendações concretas. Máximo 600 palavras.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: `Erro da API Anthropic: ${err}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    const texto = data.content?.[0]?.text || 'Sem resposta'

    return new Response(JSON.stringify({ relatorio: texto }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
