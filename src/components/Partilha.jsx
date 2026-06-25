// src/components/Partilha.jsx
// Componente de partilha WhatsApp reutilizável em toda a app

export function partilharWhatsApp(texto) {
  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
  window.open(url, '_blank')
}

export function partilharNativo(titulo, texto, url = window.location.origin) {
  if (navigator.share) {
    navigator.share({ title: titulo, text: texto, url }).catch(() => {})
  } else {
    partilharWhatsApp(texto + '\n' + url)
  }
}

// Textos pré-formatados para cada contexto
export function textoPartilhaPombo(pombo, perfil) {
  const criador = perfil?.nome || 'ChampionsLoft'
  const anilha = pombo.anilha ? `🏷️ ${pombo.anilha}` : ''
  const stats = pombo.provas > 0 ? `📊 ${pombo.provas} provas · Percentil ${pombo.percentil || 0}%` : ''
  return `🕊️ *${pombo.nome}*
${anilha}
${pombo.cor ? `🎨 ${pombo.cor}` : ''} ${pombo.sexo === 'M' ? '♂' : '♀'}
${stats}

Criado por *${criador}* via ChampionsLoft
🔗 ${window.location.origin}/p/${perfil?.slug || ''}`
}

export function textoPartilhaResultado(prova, pombo, perfil) {
  const pos = prova.posicao_geral ? `🏆 ${prova.posicao_geral}º de ${prova.n_pombos} pombos` : ''
  const perc = prova.percentil ? `📊 Percentil ${prova.percentil}%` : ''
  return `🕊️ *${pombo?.nome || 'O meu pombo'}* chegou de *${prova.nome}*!

📍 ${prova.local_solta || ''} → Pombal
📏 ${prova.dist || 0} km
${pos}
${perc}

🏠 ${perfil?.pombal_nome || 'Pombal'} · ${perfil?.nome || ''}
Gestão via *ChampionsLoft* 🇵🇹
🔗 ${window.location.origin}`
}

export function textoPartilhaPedigree(pombo, perfil) {
  return `🌳 *Pedigree — ${pombo.nome}*

🏷️ ${pombo.anilha || ''}
🎨 ${pombo.cor || ''} · ${pombo.sexo === 'M' ? '♂ Macho' : '♀ Fêmea'}
📊 ${pombo.provas || 0} provas · Percentil ${pombo.percentil || 0}%

Criador: *${perfil?.nome || ''}*
📜 Pedigree verificado via ChampionsLoft
🔗 ${window.location.origin}/p/${perfil?.slug || ''}#pedigree`
}

export function textoCartaoVisita(perfil, stats) {
  return `🕊️ *${perfil?.nome || ''}*
🏠 ${perfil?.pombal_nome || 'Pombal'} · ${perfil?.org || ''}

📊 ${stats?.total || 0} pombos · ${stats?.provas || 0} provas
🏆 Percentil médio: ${stats?.mediaPercentil || 0}%

*ChampionsLoft* — Gestão Columbófila Premium
🔗 ${window.location.origin}/p/${perfil?.slug || ''}`
}

export function textoPartilhaLiga(liga, posicao, pontos) {
  return `🏆 *${liga.nome}*

Estou em *${posicao}º lugar* com ${pontos} pontos!

Junta-te à liga → Código: *${liga.invite_code}*
🔗 ${window.location.origin}

Gestão via *ChampionsLoft* 🇵🇹`
}

// Botão de partilha reutilizável
export function BotaoPartilha({ texto, titulo = 'Partilhar', size = 'sm', style = {} }) {
  const handleClick = () => {
    if (navigator.share) {
      navigator.share({ title: 'ChampionsLoft', text: texto, url: window.location.origin }).catch(() => partilharWhatsApp(texto))
    } else {
      partilharWhatsApp(texto)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`btn btn-secondary btn-${size}`}
      style={style}
    >
      📤 {titulo}
    </button>
  )
}

// Botão específico WhatsApp
export function BotaoWhatsApp({ texto, label = 'WhatsApp', size = 'sm' }) {
  return (
    <button
      onClick={() => partilharWhatsApp(texto)}
      className={`btn btn-${size}`}
      style={{ background:'rgba(37,211,102,.15)', border:'1px solid rgba(37,211,102,.3)', color:'#25D166' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D166" style={{ flexShrink:0 }}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.083.535 4.043 1.474 5.748L.057 23.428a.5.5 0 0 0 .623.599l5.765-1.505A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.073-1.379l-.361-.214-3.744.979.999-3.659-.234-.374A9.957 9.957 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
      {label}
    </button>
  )
}
