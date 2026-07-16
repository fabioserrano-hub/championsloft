// src/modules/virtualLoft/engine/ai.js
// Motor de IA — gera e faz evoluir os pombais adversários

import { gerarPombo } from './genetics'

const NOMES_POMBAIS = {
  pt: ['Pombal da Serra','Pombal do Vale','Pombal do Norte','Pombal Real','Pombal Campeão','Pombal da Montanha','Pombal do Sul','Pombal Elite','Pombal Dourado','Pombal Veloz','Pombal Luso','Pombal Ibérico'],
  en: ['Valley Loft','Highland Loft','Northern Loft','Royal Loft','Champion Loft','Mountain Loft','Southern Loft','Elite Loft','Golden Loft','Speed Loft','Eagle Loft','Star Loft'],
  es: ['Palomar del Valle','Palomar Real','Palomar Norte','Palomar Campeón','Palomar de la Montaña','Palomar Elite','Palomar Dorado','Palomar Veloz','Palomar Ibérico','Palomar del Sur','Palomar Águila','Palomar Estrella'],
}

const GESTORES = ['João Silva','Carlos Mendes','António Costa','Pedro Ferreira','Rui Santos','Miguel Sousa','José Oliveira','Luís Rodrigues','Paulo Martins','Marco Alves']

const EMOJIS = ['🦅','🏆','⚡','🌟','🔥','💎','🎯','🌊','🏅','👑']

// Gerar um pombal IA
export function gerarPombalIA(nivel = 'normal', idioma = 'pt') {
  const nomes = NOMES_POMBAIS[idioma] || NOMES_POMBAIS.pt
  const qualidades = nivel === 'elite' ? ['elite','bom','bom'] : nivel === 'bom' ? ['bom','normal','normal'] : ['normal','fraco','normal']
  const n = nivel === 'elite' ? 20 : nivel === 'bom' ? 15 : 10

  return {
    id: `ia_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    nome: nomes[Math.floor(Math.random() * nomes.length)],
    gestor: GESTORES[Math.floor(Math.random() * GESTORES.length)],
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    nivel,
    pombos: Array.from({length: n}, (_, i) => gerarPombo({ idioma, qualidade: qualidades[i % qualidades.length] })),
    reputacao: nivel === 'elite' ? 60 + Math.random()*30 : nivel === 'bom' ? 30 + Math.random()*30 : 5 + Math.random()*25,
    vitorias: nivel === 'elite' ? Math.floor(Math.random()*20) : Math.floor(Math.random()*8),
    pais: 'pt',
  }
}

// Simular resultado de um pombal IA numa prova
export function simularResultadoIA(pombalIA, prova) {
  const melhorPombo = pombalIA.pombos.reduce((best, p) => {
    const score = (p.atributos.velocidade + p.atributos.resistencia + p.atributos.orientacao) / 3
    const bestScore = (best.atributos.velocidade + best.atributos.resistencia + best.atributos.orientacao) / 3
    return score > bestScore ? p : best
  }, pombalIA.pombos[0])

  if (!melhorPombo) return null

  const attrs = melhorPombo.atributos
  let scoreBase
  if (prova.tipo === 'velocidade') scoreBase = (attrs.velocidade * 0.5 + attrs.orientacao * 0.3 + attrs.resistencia * 0.2)
  else if (prova.tipo === 'meio_fundo') scoreBase = (attrs.resistencia * 0.4 + attrs.orientacao * 0.35 + attrs.velocidade * 0.25)
  else scoreBase = (attrs.resistencia * 0.5 + attrs.orientacao * 0.35 + attrs.velocidade * 0.15)

  const forma = 0.85 + Math.random() * 0.3
  const scoreFinal = scoreBase * forma

  const velBase = prova.tipo === 'velocidade' ? 1400 : 1300
  const velocidade = Math.round(velBase * (scoreFinal / 100) * (0.9 + Math.random() * 0.2))

  return {
    pombalId: pombalIA.id,
    pombalNome: pombalIA.nome,
    pomboNome: melhorPombo.nome,
    velocidade,
    score: scoreFinal,
  }
}

// Fazer evoluir os pombais IA ao avançar semana
export function evoluirIAs(ias, idioma = 'pt') {
  return ias.map(ia => {
    // Pequena evolução aleatória
    const novosPombos = ia.pombos.map(p => {
      const attrs = { ...p.atributos }
      // Ganho pequeno aleatório
      const attrKeys = ['velocidade', 'resistencia', 'orientacao']
      attrKeys.forEach(k => {
        attrs[k] = Math.min(99, attrs[k] + Math.random() * 0.3)
      })
      return { ...p, atributos: attrs }
    })

    // Possibilidade de comprar novo pombo
    const novosPombosLista = Math.random() < 0.1
      ? [...novosPombos, gerarPombo({ idioma, qualidade: ia.nivel === 'elite' ? 'bom' : 'normal' })]
      : novosPombos

    return { ...ia, pombos: novosPombosLista }
  })
}
