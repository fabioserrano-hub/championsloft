// src/modules/virtualLoft/engine/progression.js

// Evolução semanal dos atributos com treino
export function aplicarTreino(pombo, planoSemanal, staffBonus = 1.0) {
  const attrs = { ...pombo.atributos }
  const plano = planoSemanal || []

  const GANHOS = {
    velocidade:  { velocidade: 0.3, instinto: 0.2 },
    resistencia: { resistencia: 0.3, forca: 0.2 },
    orientacao:  { orientacao: 0.3, inteligencia: 0.2 },
    recuperacao: { recuperacao: 0.3, coragem: 0.2 },
    voo_longo:   { resistencia: 0.2, orientacao: 0.2 },
    descanso:    {},
  }

  plano.forEach(tipo => {
    const ganhos = GANHOS[tipo] || {}
    Object.entries(ganhos).forEach(([attr, base]) => {
      const cap = 99 - attrs[attr]
      if (cap <= 0) return
      const ganho = base * staffBonus * (0.7 + Math.random() * 0.6)
      attrs[attr] = Math.min(99, attrs[attr] + ganho)
    })
  })

  // Revelar um pouco do potencial oculto
  const revelacaoBase = 2 + Math.random() * 3
  attrs.potencial_revelado = Math.min(100, (attrs.potencial_revelado || 0) + revelacaoBase)

  return { ...pombo, atributos: attrs, idade: (pombo.idade || 0) + 0.1 }
}

// Eventos aleatórios por semana
const EVENTOS_BASE = {
  pt: [
    { id:'doenca',     prob:0.05, icon:'🤒', titulo:'Doença no pombal',      desc:'Um pombo ficou doente esta semana.',       tipo:'negativo', impacto:'saude' },
    { id:'lesao',      prob:0.04, icon:'🤕', titulo:'Lesão de treino',        desc:'Um pombo sofreu uma lesão ligeira.',        tipo:'negativo', impacto:'treino' },
    { id:'predador',   prob:0.03, icon:'🦅', titulo:'Ataque de predador',     desc:'Um falcão foi avistado nas proximidades.', tipo:'negativo', impacto:'stress' },
    { id:'clima',      prob:0.08, icon:'⛈️', titulo:'Mau tempo',              desc:'A semana de treino foi afectada pelo mau tempo.', tipo:'negativo', impacto:'treino' },
    { id:'sponsor',    prob:0.04, icon:'🤝', titulo:'Interesse de patrocínio', desc:'Uma empresa local quer patrocinar o pombal!', tipo:'positivo', impacto:'financeiro', valor:500 },
    { id:'talento',    prob:0.03, icon:'⭐', titulo:'Jovem talento descoberto', desc:'Um olheiro identificou um pombo promissor.', tipo:'positivo', impacto:'mercado' },
    { id:'bom_treino', prob:0.10, icon:'💪', titulo:'Semana excelente de treino', desc:'Os pombos responderam muito bem ao treino.', tipo:'positivo', impacto:'treino', bonus:1.3 },
    { id:'recorde',    prob:0.02, icon:'🏆', titulo:'Recorde pessoal',          desc:'Um dos teus pombos bateu o seu recorde de velocidade!', tipo:'positivo', impacto:'moral' },
  ],
  en: [
    { id:'doenca',     prob:0.05, icon:'🤒', titulo:'Disease in the loft',    desc:'One pigeon became sick this week.',         tipo:'negativo', impacto:'saude' },
    { id:'lesao',      prob:0.04, icon:'🤕', titulo:'Training injury',         desc:'A pigeon suffered a minor injury.',         tipo:'negativo', impacto:'treino' },
    { id:'predador',   prob:0.03, icon:'🦅', titulo:'Predator attack',         desc:'A falcon was spotted nearby.',             tipo:'negativo', impacto:'stress' },
    { id:'clima',      prob:0.08, icon:'⛈️', titulo:'Bad weather',             desc:'Training week was affected by bad weather.',tipo:'negativo', impacto:'treino' },
    { id:'sponsor',    prob:0.04, icon:'🤝', titulo:'Sponsorship interest',    desc:'A local company wants to sponsor your loft!',tipo:'positivo', impacto:'financeiro', valor:500 },
    { id:'talento',    prob:0.03, icon:'⭐', titulo:'Young talent discovered', desc:'A scout identified a promising pigeon.',    tipo:'positivo', impacto:'mercado' },
    { id:'bom_treino', prob:0.10, icon:'💪', titulo:'Excellent training week', desc:'Pigeons responded very well to training.', tipo:'positivo', impacto:'treino', bonus:1.3 },
    { id:'recorde',    prob:0.02, icon:'🏆', titulo:'Personal best',           desc:'One of your pigeons set a speed record!',  tipo:'positivo', impacto:'moral' },
  ],
  es: [
    { id:'doenca',     prob:0.05, icon:'🤒', titulo:'Enfermedad en el palomar', desc:'Una paloma se enfermó esta semana.',       tipo:'negativo', impacto:'saude' },
    { id:'lesao',      prob:0.04, icon:'🤕', titulo:'Lesión de entrenamiento', desc:'Una paloma sufrió una lesión leve.',        tipo:'negativo', impacto:'treino' },
    { id:'predador',   prob:0.03, icon:'🦅', titulo:'Ataque de depredador',    desc:'Se avistó un halcón cerca.',               tipo:'negativo', impacto:'stress' },
    { id:'clima',      prob:0.08, icon:'⛈️', titulo:'Mal tiempo',              desc:'La semana de entrenamiento fue afectada.', tipo:'negativo', impacto:'treino' },
    { id:'sponsor',    prob:0.04, icon:'🤝', titulo:'Interés de patrocinio',   desc:'¡Una empresa local quiere patrocinar tu palomar!', tipo:'positivo', impacto:'financeiro', valor:500 },
    { id:'talento',    prob:0.03, icon:'⭐', titulo:'Joven talento descubierto', desc:'Un ojeador identificó una paloma prometedora.', tipo:'positivo', impacto:'mercado' },
    { id:'bom_treino', prob:0.10, icon:'💪', titulo:'Excelente semana de entrenamiento', desc:'Las palomas respondieron muy bien.', tipo:'positivo', impacto:'treino', bonus:1.3 },
    { id:'recorde',    prob:0.02, icon:'🏆', titulo:'Récord personal',          desc:'¡Una de tus palomas batió su récord de velocidad!', tipo:'positivo', impacto:'moral' },
  ],
}

export function gerarEventosSemana(idioma = 'pt', dificuldade = 'normal') {
  const mult = dificuldade === 'facil' ? 0.5 : dificuldade === 'dificil' ? 1.5 : dificuldade === 'lenda' ? 2.0 : 1.0
  const eventos = EVENTOS_BASE[idioma] || EVENTOS_BASE.pt
  return eventos.filter(e => Math.random() < (e.prob * mult))
}

// Avançar uma semana completa
export function avancarSemana(carreira, idioma = 'pt') {
  let nova = { ...carreira }

  // 1. Aplicar treinos a todos os pombos
  const staffBonus = nova.staff?.find(s => s.tipo === 'preparador')
    ? 1 + (nova.staff.find(s => s.tipo === 'preparador').nivel * 0.05)
    : 1.0

  nova.pombos = nova.pombos.map(p =>
    p.estado === 'activo' ? aplicarTreino(p, nova.plano_treino, staffBonus) : p
  )

  // 2. Pagar salários semanais do staff (salário mensal / 4)
  const custoSemanal = Math.round((nova.staff || []).reduce((s,m) => s + (m.salario || 0), 0) / 4)
  nova.orcamento = Math.max(0, nova.orcamento - custoSemanal)

  // 3. Custo de alimentação (5€ por pombo por semana)
  const custoAlim = nova.pombos.length * 5
  nova.orcamento = Math.max(0, nova.orcamento - custoAlim)

  // 4. Eventos aleatórios
  const eventosAtivos = gerarEventosSemana(idioma, nova.dificuldade)
  eventosAtivos.forEach(evento => {
    if (evento.impacto === 'financeiro' && evento.valor) {
      nova.orcamento += evento.valor
    }
  })

  // 5. Ganho gradual de reputação
  const ganhoRep = 0.5 + (nova.pombos.filter(p => (p.percentil_medio || 0) > 70).length * 0.3)
  nova.reputacao = Math.min(100, nova.reputacao + ganhoRep)

  // Actualizar nível de reputação
  if (nova.reputacao >= 90) nova.nivel_reputacao = 'olimpico'
  else if (nova.reputacao >= 70) nova.nivel_reputacao = 'internacional'
  else if (nova.reputacao >= 50) nova.nivel_reputacao = 'nacional'
  else if (nova.reputacao >= 35) nova.nivel_reputacao = 'regional'
  else if (nova.reputacao >= 20) nova.nivel_reputacao = 'distrital'
  else nova.nivel_reputacao = 'local'

  // 6. Avançar semana/época
  nova.semana = nova.semana + 1
  if (nova.semana > 40) {
    nova.semana = 1
    nova.epoca = nova.epoca + 1
    // Envelhecer pombos
    nova.pombos = nova.pombos.map(p => ({ ...p, idade: (p.idade || 0) + 1 }))
  }

  // Guardar eventos da semana para mostrar no hub
  nova.eventos_semana = eventosAtivos
  nova.ultimo_custo_semanal = custoSemanal + custoAlim

  return nova
}
