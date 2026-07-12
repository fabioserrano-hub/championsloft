import { useState, useEffect } from 'react'
import { ToastProvider, Spinner } from './components/ui'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { supabase, db } from './lib/supabase'
import CookieBanner from './components/CookieBanner'

// Pages
import Landing      from './pages/Landing'
import Login        from './pages/Login'
import Dashboard    from './pages/Dashboard'
import Pombos       from './pages/Pombos'
import Pombais      from './pages/Pombais'
import Provas       from './pages/Provas'
import Treinos      from './pages/Treinos'
import Saude        from './pages/Saude'
import Financas     from './pages/Financas'
import Reproducao   from './pages/Reproducao'
import Pedigree     from './pages/Pedigree'
import Alimentacao  from './pages/Alimentacao'
import Calendario   from './pages/Calendario'
import Checklist    from './pages/Checklist'
import Relatorios   from './pages/Relatorios'
import Epoca        from './pages/Epoca'
import Meteorologia from './pages/Meteorologia'
import Comunidade   from './pages/Comunidade'
import Ligas        from './pages/Ligas'
import Precos       from './pages/Precos'
import Patrocinadores from './pages/Patrocinadores'
import Partilha     from './pages/Partilha'
import Forum        from './pages/Forum'
import Dicas        from './pages/Dicas'
import Admin        from './pages/Admin'
import SeleccionadorCasais from './pages/SeleccionadorCasais'
import ImportacaoCSV from './pages/ImportacaoCSV'
import Mensagens from './pages/Mensagens'
import Marketplace from './pages/Marketplace'
import Analiticas from './pages/Analiticas'
import RastreioForma from './pages/RastreioForma'
import Clubes from './pages/Clubes'
import Leiloes from './pages/Leiloes'
import Afiliados from './pages/Afiliados'
import ClubesPersonalizados from './pages/ClubesPersonalizados'
import LigaClubes from './pages/LigaClubes'
import { useNotificacoes, PainelNotificacoes } from './components/Notificacoes'
import ConquistasPage from './components/Conquistas'
import Fundadores from './pages/Fundadores'
import Carteira from './pages/Carteira'
import Exportacao from './pages/Exportacao'
import PerfilPublico from './pages/PerfilPublico'
import Onboarding from './components/Onboarding'
import { IdiomaContext, useIdioma, IDIOMAS } from './hooks/useIdioma'
import Perfil       from './pages/Perfil'
import Documentos   from './pages/Documentos'
import PaginaSucesso from './pages/PaginaSucesso'
import Termos       from './pages/Termos'
import Privacidade  from './pages/Privacidade'

// ─── NAV CONFIG ───────────────────────────────────────
function getNav(t) {
  return [
    { section: t('principal'), items: [
      { id:'dashboard',    icon:'🕊️', label:t('pombalHoje') },
      { id:'pombos',       icon:'🐦', label:t('pombos') },
      { id:'pombais',      icon:'🏠', label:t('pombais') },
    ]},
    { section: t('desporto'), items: [
      { id:'provas',       icon:'🏆', label:t('provas') },
      { id:'treinos',      icon:'🎯', label:t('treinos') },
      { id:'calendario',   icon:'📅', label:t('calendario') },
      { id:'checklist',    icon:'✅', label:t('checklist') },
    ]},
    { section: t('gestao'), items: [
      { id:'saude',        icon:'🏥', label:t('saude') },
      { id:'reproducao',   icon:'🥚', label:t('reproducao') },
      { id:'pedigree',     icon:'🌳', label:t('pedigree') },
      { id:'casais',       icon:'🧬', label:t('casaisIA') },
      { id:'alimentacao',  icon:'🌾', label:t('alimentacao') },
      { id:'financas',     icon:'💰', label:t('financas') },
      { id:'clubes',       icon:'🏛️', label:t('clubes') },
    ]},
    { section: t('analise'), items: [
      { id:'analiticas',   icon:'📊', label:t('analiticas') },
      { id:'forma',        icon:'💪', label:t('rastreioForma') },
      { id:'epoca',        icon:'🏁', label:t('epoca') },
      { id:'meteorologia', icon:'🌦️', label:t('meteorologia') },
    ]},
    { section: t('social'), items: [
      { id:'comunidade',   icon:'🌐', label:t('comunidade') },
      { id:'mensagens',    icon:'💬', label:t('mensagens') },
      { id:'clubes_pers',  icon:'🎽', label:t('clubesEquipes') },
      { id:'forum',        icon:'💬', label:t('forum') },
      { id:'dicas',        icon:'💡', label:t('dicas') },
    ]},
    { section: t('competicao'), items: [
      { id:'ligas',        icon:'🏆', label:t('ligas') },
      { id:'liga_clubes',  icon:'⚔️', label:t('ligaClubes') },
    ]},
    { section: t('mercado'), items: [
      { id:'marketplace',  icon:'🛒', label:t('marketplace') },
      { id:'leiloes',      icon:'🔨', label:t('leiloes') },
      { id:'patrocinadores',icon:'🛍️', label:t('parceiros') },
    ]},
    { section: t('sistema'), items: [
      { id:'precos',       icon:'💳', label:t('planos') },
      { id:'admin',        icon:'👑', label:t('adminLabel') },
      { id:'carteira',     icon:'💎', label:t('carteira') },
      { id:'conquistas',   icon:'🎖️', label:t('conquistas') },
      { id:'perfil',       icon:'⚙️', label:t('perfil') },
    ]},
  ]
}

const SECCOES_DEFAULT = ['Principal','Desporto','Gestão','Análise']
const TODAS_SECCOES   = ['Principal','Desporto','Gestão','Análise','Social','Competição','Mercado','Sistema']

function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('cl_sidebar_collapsed')
      if (saved) return JSON.parse(saved)
    } catch {}
    return TODAS_SECCOES.filter(s => !SECCOES_DEFAULT.includes(s))
  })
  const toggle = (section) => {
    setCollapsed(prev => {
      const next = prev.includes(section) ? prev.filter(s=>s!==section) : [...prev,section]
      try { localStorage.setItem('cl_sidebar_collapsed', JSON.stringify(next)) } catch {}
      return next
    })
  }
  return { collapsed, toggle }
}

// ─── APP LAYOUT ───────────────────────────────────────
function AppLayout({ onError }) {
  const [renderErro, setRenderErro] = useState(null)
  if (renderErro) return (
    <div style={{position:'fixed',inset:0,background:'#050D1A',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:20,fontFamily:'sans-serif'}}>
      <div style={{fontSize:32}}>⚠️</div>
      <div style={{color:'#f87171',fontSize:12,background:'#101F40',padding:8,borderRadius:6,maxWidth:320,wordBreak:'break-all'}}>{renderErro}</div>
      <button onClick={()=>{localStorage.clear();location.reload()}} style={{background:'#1E5FD9',color:'#fff',border:'none',padding:'10px 20px',borderRadius:6,cursor:'pointer'}}>Limpar e recarregar</button>
    </div>
  )

  const { user } = useAuth()
  const { idioma, t } = useIdioma()
  const NAV = getNav(t)
  const { collapsed, toggle } = useSidebarCollapse()
  const isAdmin = true; const betaTester = false; const flags = {}
  const notifs = []; const naoLidas = 0; const marcarLida = ()=>{}; const marcarTodasLidas = ()=>{}
  const [painelNotif, setPainelNotif] = useState(false)
  const [page, setPage] = useState('dashboard')
  const [navParams, setNavParams] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false)
  const [fotoPerfil, setFotoPerfil] = useState(null)
  const [logoPerfil, setLogoPerfil] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    supabase.from('perfis').select('foto_perfil_url,logo_url').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.foto_perfil_url) setFotoPerfil(data.foto_perfil_url)
        if (data?.logo_url) setLogoPerfil(data.logo_url)
      })
  }, [user?.id])
useEffect(()=>{
  if(user && !localStorage.getItem('cl_onboarding_done')) setMostrarOnboarding(true)
},[user])
const concluirOnboarding = () => { localStorage.setItem('cl_onboarding_done','1'); setMostrarOnboarding(false) }
  const nav = (p, params={}) => { setPage(p); setNavParams(params); setSidebarOpen(false) }

  useEffect(() => {
    const main = document.querySelector('.page')
    if (!main) return
    let lastY = 0
    const onScroll = () => {
      const y = main.scrollTop
      if (y > lastY + 10 && sidebarOpen) setSidebarOpen(false)
      lastY = y
    }
    main.addEventListener('scroll', onScroll, { passive:true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [sidebarOpen])

  const initials = user?.user_metadata?.nome?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
    || user?.email?.[0]?.toUpperCase() || 'U'

  const [installPrompt, setInstallPrompt] = useState(null)
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    const handler = e => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstallPrompt(null))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  const instalarApp = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }

  const [tema, setTema] = useState(() => localStorage.getItem('cl_tema') || 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    localStorage.setItem('cl_tema', tema)
  }, [tema])

  const currentItem   = NAV.flatMap(s=>s.items).find(i=>i.id===page)
  const currentSection = NAV.find(s=>s.items.some(i=>i.id===page))?.section || ''

  const renderPage = () => {
    try {
      switch (page) {
        case 'dashboard':     return <Dashboard nav={nav} />
        case 'pombos':        return <Pombos nav={nav} params={navParams} />
        case 'pombais':       return <Pombais nav={nav} />
        case 'provas':        return <Provas nav={nav} params={navParams} />
        case 'saude':         return <Saude nav={nav} params={navParams} />
        case 'financas':      return <Financas nav={nav} />
        case 'perfil':        return <Perfil nav={nav} />
        case 'treinos':       return <Treinos nav={nav} />
        case 'reproducao':    return <Reproducao nav={nav} params={navParams} />
        case 'pedigree':      return <Pedigree nav={nav} params={navParams} />
        case 'alimentacao':   return <Alimentacao nav={nav} />
        case 'calendario':    return <Calendario nav={nav} />
        case 'checklist':     return <Checklist nav={nav} />
        case 'relatorios':    return <Relatorios nav={nav} />
        case 'epoca':         return <Epoca nav={nav} />
        case 'meteorologia':  return <Meteorologia nav={nav} params={navParams} />
        case 'precos':        return <Precos nav={nav} />
        case 'admin':         return <Admin nav={nav} />
        case 'casais':        return <SeleccionadorCasais nav={nav} />
        case 'importacao':    return <ImportacaoCSV nav={nav} />
        case 'mensagens':     return <Mensagens nav={nav} />
        case 'marketplace':   return <Marketplace nav={nav} />
        case 'analiticas':    return <Analiticas nav={nav} />
        case 'forma':         return <RastreioForma nav={nav} />
        case 'clubes':        return <Clubes nav={nav} />
        case 'leiloes':       return <Leiloes nav={nav} />
        case 'afiliados':     return <Afiliados nav={nav} />
        case 'clubes_pers':   return <ClubesPersonalizados nav={nav} />
        case 'liga_clubes':   return <LigaClubes nav={nav} />
        case 'conquistas':    return <ConquistasPage />
        case 'fundadores':    return <Fundadores nav={nav} />
        case 'carteira':      return <Carteira nav={nav} />
        case 'exportacao':    return <Exportacao nav={nav} />
        case 'perfil-publico': return <PerfilPublico nav={nav} params={navParams} />
        case 'comunidade':    return <Comunidade nav={nav} params={navParams} />
        case 'ligas':         return <Ligas nav={nav} />
        case 'patrocinadores': return <Patrocinadores nav={nav} />
        case 'partilha':      return <Partilha nav={nav} />
        case 'forum':         return <Forum nav={nav} />
        case 'dicas':         return <Dicas nav={nav} />
        case 'documentos':    return <Documentos nav={nav} />
        case 'termos':        return <Termos nav={nav} />
        case 'privacidade':   return <Privacidade nav={nav} />
        default:              return <Dashboard nav={nav} />
      }
    } catch(e) { setRenderErro(e.message); return null }
  }

  return (
    <div className="app">
      <div className={`mobile-overlay${sidebarOpen?' show':''}`} onClick={()=>setSidebarOpen(false)} />

      <aside className={`sidebar${sidebarOpen?' open':''}`} style={{ overflowY:'auto' }}>

        {/* ── LOGO Fly2Win ── */}
        <div style={{ cursor:'pointer', padding:'16px 12px 8px', textAlign:'center' }} onClick={()=>nav('dashboard')}>
          <img src="/logo.png" alt="Fly2Win"
            style={{ width:160, height:'auto', objectFit:'contain', display:'block', margin:'0 auto' }}
            onError={e=>{ e.target.style.display='none'; e.target.insertAdjacentHTML('afterend','<div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#1E5FD9,#D4AF37);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;margin:0 auto">F2W</div>') }} />
        </div>

        <nav className="nav">
          {NAV.map(({ section, items }) => (
            <div key={section} className={`nav-group${collapsed.includes(section)?' collapsed':''}`}>
              <div className="nav-group-head" onClick={()=>toggle(section)}>
                <span className="nav-group-label">{section}</span>
                <span className="nav-group-chevron">⌄</span>
              </div>
              <div className="nav-group-items">
                {items.filter(item => {
                  if (isAdmin||betaTester) return true
                  if (Object.keys(flags).length===0) return true
                  return flags[item.id] !== false
                }).map(item => (
                  <div key={item.id} className={`nav-item${page===item.id?' active':''}`} onClick={()=>nav(item.id)}>
                    <span className="nav-icon">{item.icon}</span>
                    <span style={{ flex:1 }}>{item.label}</span>
                    {(isAdmin||betaTester) && flags[item.id]===false && (
                      <span style={{ fontSize:8,background:'rgba(248,113,113,.2)',color:'#f87171',padding:'1px 5px',borderRadius:6,flexShrink:0 }}>OFF</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="user-area">
          <div className="user-card" onClick={() => nav('perfil')} style={{ cursor: 'pointer' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div className="user-avatar" style={{ overflow: 'hidden' }}>
                {fotoPerfil
                  ? <img src={fotoPerfil} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initials
                }
              </div>
              {logoPerfil && (
                <div style={{ position: 'absolute', bottom: -4, right: -4, width: 16, height: 16, borderRadius: 4, background: '#050D1A', border: '1.5px solid rgba(212,175,55,.4)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={logoPerfil} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
                </div>
              )}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="user-name" style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                {user?.user_metadata?.nome||'Utilizador'}
              </div>
              <div className="user-email" style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn btn-icon" id="menu-btn" onClick={()=>setSidebarOpen(s=>!s)} style={{ display:'none',fontSize:18 }}>☰</button>
          <div className="tb-crumb">
            <span className="tb-crumb-section">{currentSection}</span>
            <span className="tb-crumb-sep">/</span>
            <span className="tb-crumb-current">{currentItem?.label||'Dashboard'}</span>
          </div>
          <div className="tb-search" onClick={()=>nav('pombos')} title="Pesquisa rápida">
            <span className="tb-search-icon">⌕</span>
            <span className="tb-search-placeholder">Procurar pombo, anilha, prova…</span>
            <span className="tb-search-kbd">⌘K</span>
          </div>
          <div className="tb-right">
            {true && (
              <select value={idioma} onChange={e=>{localStorage.setItem('cl_idioma',e.target.value);window.location.reload()}}
                style={{ background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 8px',cursor:'pointer',fontSize:11,fontWeight:700,color:'var(--text3)',fontFamily:'inherit',outline:'none' }}>
                {IDIOMAS.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            )}
            <div style={{ position:'relative' }}>
              <button onClick={()=>setPainelNotif(p=>!p)}
                style={{ background:'none',border:'1px solid var(--border)',borderRadius:8,padding:'5px 8px',cursor:'pointer',fontSize:16,color:naoLidas>0?'#D4AF37':'var(--text4)',position:'relative' }}>
                🔔
                {naoLidas>0&&(
                  <span style={{ position:'absolute',top:-4,right:-4,width:16,height:16,borderRadius:'50%',background:'#f87171',fontSize:9,fontWeight:700,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid var(--bg)' }}>
                    {naoLidas>9?'9+':naoLidas}
                  </span>
                )}
              </button>
              {painelNotif&&<PainelNotificacoes onFechar={()=>setPainelNotif(false)} notifs={notifs} naoLidas={naoLidas} marcarLida={marcarLida} marcarTodasLidas={marcarTodasLidas}/>}
            </div>
            {installPrompt&&(
              <button onClick={instalarApp} style={{ display:'flex',alignItems:'center',gap:5,background:'linear-gradient(135deg,#D4AF37,#B8960C)',border:'none',borderRadius:8,padding:'6px 12px',cursor:'pointer',fontSize:12,fontWeight:700,color:'#050D1A' }}>
                📲 Instalar
              </button>
            )}
            <button className="btn btn-icon" onClick={()=>setTema(t=>t==='dark'?'light':'dark')} style={{ fontSize:16 }}>
              {tema==='dark'?'☀️':'🌙'}
            </button>
            <button className="btn btn-icon" onClick={()=>window.print()} style={{ fontSize:16 }}>🖨️</button>
            <div className="tb-date" style={{ display:'flex',alignItems:'center',gap:10 }}>
              <button onClick={()=>nav('perfil')} style={{ display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',padding:'4px 8px',borderRadius:8 }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(76,141,255,.1)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <div style={{ width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0,overflow:'hidden',border:'2px solid rgba(76,141,255,.4)' }}>
                  {fotoPerfil ? <img src={fotoPerfil} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/> : initials}
                </div>
                <span style={{ fontSize:13,fontWeight:600,color:'#fff',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user?.user_metadata?.nome?.split(' ')[0]||user?.email?.split('@')[0]||'Perfil'}</span>
              </button>
              <button onClick={()=>supabase.auth.signOut()} style={{ background:'none',border:'1px solid #1B2D52',cursor:'pointer',borderRadius:8,padding:'6px 10px',fontSize:12,color:'#7A8699',fontFamily:'inherit' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='#f87171'; e.currentTarget.style.color='#f87171' }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='#1B2D52'; e.currentTarget.style.color='#7A8699' }}>
                Sair
              </button>
            </div>
          </div>
        </header>
        <main className="page">
          {mostrarOnboarding&&<Onboarding nav={nav} onConcluir={concluirOnboarding}/>}
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

// ─── APP CONTENT ──────────────────────────────────────
function AppContent() {
  const { user, loading } = useAuth()
  const [mostrarLanding, setMostrarLanding] = useState(true)
  const [erroApp, setErroApp] = useState(null)

  const slugMatch = window.location.pathname.match(/^\/p\/([a-z0-9-]+)$/i)
  if (slugMatch) return <PerfilPublico nav={()=>{ window.location.href='/' }} params={{ slug:slugMatch[1] }} />
  if (window.location.pathname==='/sucesso') return <PaginaSucesso />

  if (loading) return (
    <div style={{ minHeight:'100vh',background:'#050D1A',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16 }}>
      <img src="/logo.png" alt="Fly2Win" style={{ width:120, height:'auto', objectFit:'contain' }} onError={e=>e.target.style.display='none'}/>
      <Spinner lg />
      <div style={{ fontSize:12,color:'#475569' }}>A carregar...</div>
    </div>
  )

  if (erroApp) return (
    <div style={{ minHeight:'100vh',background:'#050D1A',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,padding:20,textAlign:'center' }}>
      <div style={{ fontSize:48 }}>⚠️</div>
      <div style={{ fontSize:16,color:'#fff',fontWeight:600 }}>Algo correu mal</div>
      <div style={{ fontSize:12,color:'#7A8699',maxWidth:300 }}>{erroApp}</div>
      <button className="btn btn-primary" onClick={()=>{ setErroApp(null); window.location.reload() }}>🔄 Recarregar</button>
      <button className="btn btn-secondary" onClick={async()=>{ const{supabase}=await import('./lib/supabase'); await supabase.auth.signOut(); window.location.reload() }}>Fazer logout e tentar novamente</button>
    </div>
  )

  if (user) return <AppLayout onError={setErroApp} />
  if (mostrarLanding) return <Landing onEntrar={()=>setMostrarLanding(false)} />
  return <Login />
}

// ─── ROOT ─────────────────────────────────────────────
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <CookieBanner/>
    </ToastProvider>
  )
}
