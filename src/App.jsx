import { useState } from 'react'
import { ToastProvider } from './components/ui'
import { AuthProvider, useAuth } from './hooks/useAuth'

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
import Calendario   from './pages/Calendario'
import Checklist    from './pages/Checklist'
import Relatorios   from './pages/Relatorios'
import FimEpoca     from './pages/FimEpoca'
import GestaoEpoca  from './pages/GestaoEpoca'
import Meteorologia from './pages/Meteorologia'
import Comunidade   from './pages/Comunidade'
import Precos       from './pages/Precos'
import Admin        from './pages/Admin'
import Perfil       from './pages/Perfil'
import Documentos   from './pages/Documentos'
import PaginaSucesso from './pages/PaginaSucesso'

// ─── NAV CONFIG ───────────────────────────────────────
const NAV = [
  { section: 'Principal', items: [
    { id: 'dashboard',   icon: '📊', label: 'Dashboard' },
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
    { id: 'financas',    icon: '💰', label: 'Finanças' },
  ]},
  { section: 'Análise', items: [
    { id: 'relatorios',  icon: '📊', label: 'Relatórios' },
    { id: 'fimepoca',    icon: '🏁', label: 'Fim de Época' },
    { id: 'meteorologia',icon: '🌦️', label: 'Meteorologia' },
  ]},
  { section: 'Social', items: [
    { id: 'comunidade',  icon: '🌐', label: 'Comunidade' },
  ]},
  { section: 'Sistema', items: [
    { id: 'epoca',       icon: '🗓️', label: 'Gestão Época' },
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
      case 'calendario':   return <Calendario nav={nav} />
      case 'checklist':    return <Checklist nav={nav} />
      case 'relatorios':   return <Relatorios nav={nav} />
      case 'epoca':        return <GestaoEpoca nav={nav} />
      case 'fimepoca':     return <FimEpoca nav={nav} />
      case 'meteorologia': return <Meteorologia nav={nav} />
      case 'precos':       return <Precos nav={nav} />
      case 'admin':        return <Admin nav={nav} />
      case 'comunidade':   return <Comunidade nav={nav} />
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
          <button className="btn btn-icon" onClick={() => setSidebarOpen(true)} style={{ display: 'none' }} id="menu-btn">☰</button>
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
            <div className="tb-date">
              {new Date().toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </header>
        <style>{`@media (max-width: 768px) { #menu-btn { display: flex !important; } }`}</style>
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
