import { ToastProvider } from './components/ui'
import { IdiomaContext, useIdiomaState } from './hooks/useIdioma'
import { AuthProvider, useAuth } from './hooks/useAuth'

function Conteudo() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ color:'#fff', fontSize:20 }}>A carregar auth...</div>
  return <div style={{ color:'#fff', fontSize:20 }}>✅ Teste 2 OK — Auth: {user ? user.email : 'sem sessão'}</div>
}

export default function App() {
  const { idioma } = useIdiomaState()
  return (
    <IdiomaContext.Provider value={idioma}>
      <ToastProvider>
        <AuthProvider>
          <div style={{ minHeight:'100vh', background:'#050D1A', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Conteudo />
          </div>
        </AuthProvider>
      </ToastProvider>
    </IdiomaContext.Provider>
  )
}
