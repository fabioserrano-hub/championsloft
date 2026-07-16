// src/modules/virtualLoft/engine/genetics.js
// Motor de genética — gera atributos, personalidade e potencial oculto

const NOMES_PT = ['Relâmpago','Trovão','Furacão','Tempestade','Brisa','Névoa','Aurora','Eclipse','Cometa','Astro','Zeus','Atlas','Titan','Orion','Vega','Sirius','Falcon','Hawk','Ares','Apollo']
const NOMES_EN = ['Lightning','Thunder','Hurricane','Storm','Breeze','Mist','Dawn','Eclipse','Comet','Star','Zeus','Atlas','Titan','Orion','Vega','Sirius','Falcon','Hawk','Ares','Apollo']
const NOMES_ES = ['Relámpago','Trueno','Huracán','Tormenta','Brisa','Niebla','Aurora','Eclipse','Cometa','Astro','Zeus','Atlas','Titán','Orión','Vega','Sirio','Halcón','Aguila','Ares','Apolo']

export const NOMES = { pt: NOMES_PT, en: NOMES_EN, es: NOMES_ES }

export const PERSONALIDADES = {
  pt: ['Calmo','Nervoso','Agressivo','Competitivo','Preguiçoso','Inteligente','Aprende rápido','Sensível ao calor','Sensível ao vento','Determinado','Líder','Solitário'],
  en: ['Calm','Nervous','Aggressive','Competitive','Lazy','Intelligent','Fast learner','Heat sensitive','Wind sensitive','Determined','Leader','Solitary'],
  es: ['Tranquilo','Nervioso','Agresivo','Competitivo','Perezoso','Inteligente','Aprende rápido','Sensible al calor','Sensible al viento','Determinado','Líder','Solitario'],
}

export const ESPECIALIDADES = {
  pt: ['Velocidade','Meio-Fundo','Fundo','Grande Fundo'],
  en: ['Sprint','Middle Distance','Long Distance','Ultra Long'],
  es: ['Velocidad','Medio Fondo','Fondo','Gran Fondo'],
}

// Gerar número aleatório com distribuição normal (Bell curve)
function gaussianRandom(mean = 50, std = 15) {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return Math.min(99, Math.max(1, Math.round(num * std + mean)))
}

// Gerar atributos base de um pombo
export function gerarAtributos(qualidade = 'normal') {
  const base = qualidade === 'elite' ? 70 : qualidade === 'bom' ? 60 : qualidade === 'fraco' ? 35 : 50
  const std = 12

  return {
    // Atributos físicos
    velocidade:   gaussianRandom(base, std),
    resistencia:  gaussianRandom(base, std),
    recuperacao:  gaussianRandom(base, std),
    forca:        gaussianRandom(base, std),
    // Atributos mentais
    orientacao:   gaussianRandom(base, std),
    inteligencia: gaussianRandom(base, std),
    instinto:     gaussianRandom(base, std),
    coragem:      gaussianRandom(base, std),
    // Atributos de reprodução
    fertilidade:  gaussianRandom(base, std),
    sangue:       gaussianRandom(base, std),
    // Potencial OCULTO (0-100) — revelado gradualmente com treinos/provas
    potencial_oculto: gaussianRandom(50, 25),
    potencial_revelado: 0, // % de potencial já descoberto
  }
}

// Herança genética de dois pombos pais
export function cruzamento(pai, mae) {
  const herdar = (attrPai, attrMae) => {
    const base = (attrPai + attrMae) / 2
    const variacao = (Math.random() - 0.5) * 20 // ±10 pontos de variação
    const mutacao = Math.random() < 0.05 ? (Math.random() - 0.5) * 30 : 0 // 5% chance mutação
    return Math.min(99, Math.max(1, Math.round(base + variacao + mutacao)))
  }

  return {
    velocidade:   herdar(pai.atributos.velocidade, mae.atributos.velocidade),
    resistencia:  herdar(pai.atributos.resistencia, mae.atributos.resistencia),
    recuperacao:  herdar(pai.atributos.recuperacao, mae.atributos.recuperacao),
    forca:        herdar(pai.atributos.forca, mae.atributos.forca),
    orientacao:   herdar(pai.atributos.orientacao, mae.atributos.orientacao),
    inteligencia: herdar(pai.atributos.inteligencia, mae.atributos.inteligencia),
    instinto:     herdar(pai.atributos.instinto, mae.atributos.instinto),
    coragem:      herdar(pai.atributos.coragem, mae.atributos.coragem),
    fertilidade:  herdar(pai.atributos.fertilidade, mae.atributos.fertilidade),
    sangue:       herdar(pai.atributos.sangue, mae.atributos.sangue),
    // Potencial do filho é imprevisível — surpresa da genética
    potencial_oculto: gaussianRandom(
      (pai.atributos.potencial_oculto + mae.atributos.potencial_oculto) / 2, 20
    ),
    potencial_revelado: 0,
  }
}

// Gerar pombo completo
export function gerarPombo(opts = {}) {
  const { idioma = 'pt', qualidade = 'normal', sexo, anilha, ano = 2024 } = opts
  const nomes = NOMES[idioma] || NOMES.pt
  const personalidades = PERSONALIDADES[idioma] || PERSONALIDADES.pt
  const especialidades = ESPECIALIDADES[idioma] || ESPECIALIDADES.pt

  const s = sexo || (Math.random() > 0.5 ? 'M' : 'F')
  const nomesDisponiveis = nomes.filter((_, i) => s === 'M' ? i < 12 : i >= 8)
  const nome = opts.nome || nomesDisponiveis[Math.floor(Math.random() * nomesDisponiveis.length)]

  const anilhaNum = anilha || `VL-${ano}-${String(Math.floor(Math.random() * 99999)).padStart(5,'0')}`

  // Personalidade — 1 a 2 traços
  const numTracos = Math.random() > 0.6 ? 2 : 1
  const tracos = []
  const usados = new Set()
  for (let i = 0; i < numTracos; i++) {
    let idx
    do { idx = Math.floor(Math.random() * personalidades.length) } while (usados.has(idx))
    usados.add(idx)
    tracos.push(personalidades[idx])
  }

  const atributos = gerarAtributos(qualidade)
  
  // Especialidade baseada nos atributos
  const espIdx = atributos.resistencia > 70 && atributos.forca > 65 ? 2
    : atributos.resistencia > 60 ? 1
    : atributos.velocidade > 65 ? 0 : 3
  
  // Rating visível (1-5 estrelas) baseado nos atributos mas não perfeito
  const mediaAttr = (atributos.velocidade + atributos.resistencia + atributos.orientacao + atributos.inteligencia) / 4
  const rating = mediaAttr > 80 ? 5 : mediaAttr > 65 ? 4 : mediaAttr > 50 ? 3 : mediaAttr > 35 ? 2 : 1

  return {
    id: `pombo_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    nome, anilha: anilhaNum, sexo: s, ano,
    especialidade: especialidades[espIdx],
    esp_idx: espIdx,
    personalidade: tracos,
    atributos,
    rating,
    // Estado
    estado: 'activo',
    idade: 0, // épocas
    provas: 0,
    vitorias: 0,
    percentil_medio: 0,
    valor: Math.round((rating * 500 + Math.random() * 1000) * (qualidade === 'elite' ? 5 : 1)),
    // Histórico
    historico_provas: [],
    historico_treinos: [],
    // Genealogia
    pai_id: opts.pai_id || null,
    mae_id: opts.mae_id || null,
  }
}

// Gerar plantel inicial por tipo de início
export function gerarPlantelInicial(tipo, idioma = 'pt') {
  const configs = {
    jovem:        { n: 5,  qualidades: ['normal','normal','fraco','fraco','fraco'] },
    amador:       { n: 12, qualidades: ['bom','bom','normal','normal','normal','normal','fraco','fraco','fraco','fraco','fraco','fraco'] },
    profissional: { n: 25, qualidades: Array(5).fill('bom').concat(Array(15).fill('normal')).concat(Array(5).fill('fraco')) },
    lenda:        { n: 50, qualidades: Array(5).fill('elite').concat(Array(20).fill('bom')).concat(Array(25).fill('normal')) },
  }

  const cfg = configs[tipo] || configs.amador
  return cfg.qualidades.map((q, i) => gerarPombo({
    idioma, qualidade: q,
    sexo: i % 2 === 0 ? 'M' : 'F',
    ano: 2024 - Math.floor(Math.random() * 3)
  }))
}
