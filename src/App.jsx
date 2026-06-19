import { useState, useEffect } from 'react'
import { ToastProvider } from './components/ui'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'

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
import Alimentacao  from './pages/Alimentacao'
import Tratamentos  from './pages/Tratamentos'
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
import Dicas        from './pages/Dicas'
import Admin        from './pages/Admin'
import Perfil       from './pages/Perfil'
import Documentos   from './pages/Documentos'
import PaginaSucesso from './pages/PaginaSucesso'

// ─── NAV CONFIG ───────────────────────────────────────
const NAV = [
  { section: 'Principal', items: [
    { id: 'dashboard',   icon: '🕊️', label: 'Pombal Hoje' },
    { id: 'pombos',      icon: '🐦', label: 'Pombos' },
    { id: 'pombais',     icon: '🏠', label: 'Pombais' },
  ]},
  { section: 'Desporto', items: [
    { id: 'provas',      icon: '🏆', label: 'Provas' },
    { id: 'treinos',     icon: '🎯', label: 'Treinos' },
    { id: 'calendario',  icon: '📅', label: 'Calendário' },
    { id: 'checklist',   icon: '✅', label: 'Checklist' },
  ]},
  { section: 'Gestão', items: [
    { id: 'saude',       icon: '🏥', label: 'Saúde' },
    { id: 'reproducao',  icon: '🥚', label: 'Reprodução' },
    { id: 'alimentacao', icon: '🌾', label: 'Alimentação' },
    { id: 'tratamentos', icon: '🧪', label: 'Tratamentos' },
    { id: 'financas',    icon: '💰', label: 'Finanças' },
  ]},
  { section: 'Análise', items: [
    { id: 'relatorios',  icon: '📊', label: 'Relatórios' },
    { id: 'epoca',       icon: '🏁', label: 'Época' },
    { id: 'meteorologia',icon: '🌦️', label: 'Meteorologia' },
  ]},
  { section: 'Social', items: [
    { id: 'comunidade',  icon: '🌐', label: 'Comunidade' },
    { id: 'ligas',       icon: '🏆', label: 'Ligas' },
    { id: 'patrocinadores', icon: '🛍️', label: 'Parceiros' },
    { id: 'partilha',       icon: '📤', label: 'Partilhar' },
    { id: 'dicas',          icon: '💡', label: 'Dicas' },
  ]},
  { section: 'Sistema', items: [
    { id: 'precos',      icon: '💳', label: 'Planos' },
    { id: 'admin',       icon: '👑', label: 'Admin' },
    { id: 'perfil',      icon: '⚙️', label: 'Perfil' },
    { id: 'documentos',  icon: '📄', label: 'Documentos' },
  ]},
]

// Secções abertas por padrão; "Social" e "Sistema" começam fechadas (uso menos frequente)
const SECCOES_ABERTAS_DEFAULT = ['Principal', 'Desporto', 'Gestão', 'Análise']

function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('cl_sidebar_collapsed')
      if (saved) return JSON.parse(saved)
    } catch {}
    return NAV.filter(s => !SECCOES_ABERTAS_DEFAULT.includes(s.section)).map(s => s.section)
  })

  const toggle = (section) => {
    setCollapsed(prev => {
      const next = prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
      try { localStorage.setItem('cl_sidebar_collapsed', JSON.stringify(next)) } catch {}
      return next
    })
  }

  return { collapsed, toggle }
}

// ─── APP LAYOUT ───────────────────────────────────────
function AppLayout() {
  const { user } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [navParams, setNavParams] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { collapsed, toggle } = useSidebarCollapse()

  const nav = (p, params = {}) => { setPage(p); setNavParams(params); setSidebarOpen(false) }

  // Auto-esconder sidebar ao fazer scroll no conteúdo (mobile)
  useEffect(() => {
    const main = document.querySelector('.page')
    if (!main) return
    let lastY = 0
    const onScroll = () => {
      const y = main.scrollTop
      if (y > lastY + 10 && sidebarOpen) setSidebarOpen(false)
      lastY = y
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [sidebarOpen])

  const initials = user?.user_metadata?.nome?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    || user?.email?.[0]?.toUpperCase() || 'U'

  const currentItem = NAV.flatMap(s => s.items).find(i => i.id === page)
  const currentSection = NAV.find(s => s.items.some(i => i.id === page))?.section || ''

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <Dashboard nav={nav} />
      case 'pombos':       return <Pombos nav={nav} params={navParams} />
      case 'pombais':      return <Pombais nav={nav} />
      case 'provas':       return <Provas nav={nav} params={navParams} />
      case 'saude':        return <Saude nav={nav} params={navParams} />
      case 'financas':     return <Financas nav={nav} />
      case 'perfil':       return <Perfil nav={nav} />
      case 'treinos':      return <Treinos nav={nav} />
      case 'reproducao':   return <Reproducao nav={nav} params={navParams} />
      case 'alimentacao':  return <Alimentacao nav={nav} />
      case 'tratamentos':  return <Tratamentos nav={nav} />
      case 'calendario':   return <Calendario nav={nav} />
      case 'checklist':    return <Checklist nav={nav} />
      case 'relatorios':   return <Relatorios nav={nav} />
      case 'epoca':        return <Epoca nav={nav} />
      case 'meteorologia': return <Meteorologia nav={nav} />
      case 'precos':       return <Precos nav={nav} />
      case 'admin':        return <Admin nav={nav} />
      case 'comunidade':   return <Comunidade nav={nav} />
      case 'ligas':        return <Ligas nav={nav} />
      case 'patrocinadores': return <Patrocinadores nav={nav} />
      case 'partilha':        return <Partilha nav={nav} />
      case 'dicas':           return <Dicas nav={nav} />
      case 'documentos':   return <Documentos nav={nav} />
      default:             return <Dashboard nav={nav} />
    }
  }

  return (
    <div className="app">
      <div className={`mobile-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} style={{ overflowY: 'auto' }}>
        <div className="logo">
          {/* Quando o logótipo final estiver tratado (PNG/SVG sem fundo), trocar por:
              <img src="/logo.png" alt="ChampionsLoft" className="logo-img" /> */}
          <div className="logo-icon">CL</div>
          <div>
            <div className="logo-text">ChampionsLoft</div>
            <div className="logo-sub">Gestão Columbófila</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(({ section, items }) => (
            <div key={section} className={`nav-group${collapsed.includes(section) ? ' collapsed' : ''}`}>
              <div className="nav-group-head" onClick={() => toggle(section)}>
                <span className="nav-group-label">{section}</span>
                <span className="nav-group-chevron">⌄</span>
              </div>
              <div className="nav-group-items">
                {items.map(item => (
                  <div key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => nav(item.id)}>
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="user-area">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.user_metadata?.nome || 'Utilizador'}
              </div>
              <div className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn btn-icon" onClick={() => setSidebarOpen(s => !s)} style={{ display: 'none' }} id="menu-btn">☰</button>
          <div className="tb-crumb">
            <span className="tb-crumb-section">{currentSection}</span>
            <span className="tb-crumb-sep">/</span>
            <span className="tb-crumb-current">{currentItem?.label || 'Dashboard'}</span>
          </div>
          <div className="tb-search" onClick={() => nav('pombos')} title="Pesquisa rápida (em breve)">
            <span className="tb-search-icon">⌕</span>
            <span className="tb-search-placeholder">Procurar pombo, anilha, prova…</span>
            <span className="tb-search-kbd">⌘K</span>
          </div>
          <div className="tb-right">
            <button className="btn btn-icon" onClick={() => window.print()} title="Imprimir página" style={{ fontSize: 16 }}>🖨️</button>
            <div className="tb-date" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => nav('perfil')} title="O meu perfil" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8, transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(76,141,255,.1)'}
                onMouseLeave={e => e.currentTarget.style.background='none'}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.user_metadata?.nome?.split(' ')[0] || user?.email?.split('@')[0] || 'Perfil'}</span>
              </button>
              <button onClick={() => supabase.auth.signOut()} title="Sair da aplicação" style={{ background: 'none', border: '1px solid #1B2D52', cursor: 'pointer', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#7A8699', fontFamily: 'inherit', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#f87171'; e.currentTarget.style.color='#f87171' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#1B2D52'; e.currentTarget.style.color='#7A8699' }}>
                Sair
              </button>
            </div>
          </div>
        </header>
        <style>{`
          @media (max-width: 768px) {
            #menu-btn { display: flex !important; }
            .tb-search { display: none !important; }
            .tb-crumb-section { display: none; }
            .tb-crumb-sep { display: none; }
            .tb-crumb-current { font-size: 16px !important; font-weight: 700 !important; }
            .tb-date { display: none; }
          }
        `}</style>
        <main className="page">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

// ─── APP CONTENT ──────────────────────────────────────
import { Spinner } from './components/ui'

function AppContent() {
  const { user, loading } = useAuth()
  const [mostrarLanding, setMostrarLanding] = useState(true)

  if (window.location.pathname === '/sucesso') return <PaginaSucesso />

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🕊️</div>
        <Spinner lg />
      </div>
    </div>
  )

  if (user) return <AppLayout />
  if (mostrarLanding) return <Landing onEntrar={() => setMostrarLanding(false)} />
  return <Login />
}

// ─── ROOT ─────────────────────────────────────────────
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  )
}
