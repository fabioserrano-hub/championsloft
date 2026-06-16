import { useState } from 'react'
import { ToastProvider } from './components/ui'
import { AuthProvider, useAuth } from './hooks/useAuth'

// Pages
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

// ─── APP LAYOUT ───────────────────────────────────────
function AppLayout() {
  const { user } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const nav = (p) => { setPage(p); setSidebarOpen(false) }

  const initials = user?.user_metadata?.nome?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    || user?.email?.[0]?.toUpperCase() || 'U'

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <Dashboard nav={nav} />
      case 'pombos':       return <Pombos />
      case 'pombais':      return <Pombais />
      case 'provas':       return <Provas />
      case 'saude':        return <Saude />
      case 'financas':     return <Financas />
      case 'perfil':       return <Perfil />
      case 'treinos':      return <Treinos />
      case 'reproducao':   return <Reproducao />
      case 'alimentacao':  return <Alimentacao />
      case 'calendario':   return <Calendario />
      case 'checklist':    return <Checklist />
      case 'relatorios':   return <Relatorios />
      case 'epoca':        return <GestaoEpoca nav={nav} />
      case 'fimepoca':     return <FimEpoca nav={nav} />
      case 'meteorologia': return <Meteorologia />
      case 'precos':       return <Precos />
      case 'admin':        return <Admin />
      case 'comunidade':   return <Comunidade />
      case 'documentos':   return <Documentos />
      default:             return <Dashboard nav={nav} />
    }
  }

  return (
    <div className="app">
      <div className={`mobile-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} style={{ overflowY: 'auto' }}>
        <div className="logo">
          <div className="logo-icon">🕊️</div>
          <div>
            <div className="logo-text">ChampionsLoft</div>
            <div className="logo-sub">Gestão Columbófila</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(({ section, items }) => (
            <div key={section} className="nav-section">
              <div className="nav-section-label">{section}</div>
              {items.map(item => (
                <div key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => nav(item.id)}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
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
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: '#475569' }}>
            {new Date().toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
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

  if (window.location.pathname === '/sucesso') return <PaginaSucesso />

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🕊️</div>
        <Spinner lg />
      </div>
    </div>
  )

  return user ? <AppLayout /> : <Login />
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
