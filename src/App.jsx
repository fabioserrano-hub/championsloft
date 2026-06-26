import { useState, useEffect } from 'react'
import { ToastProvider, Spinner } from './components/ui'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { supabase, db } from './lib/supabase'
import { useFeatureFlags } from './hooks/useFeatureFlags'
import { useNotificacoes } from './components/Notificacoes'
import ConquistasPage from './components/Conquistas'
import Onboarding, { useOnboarding } from './components/Onboarding'
import { IdiomaContext, useIdiomaState, useIdioma, IDIOMAS } from './hooks/useIdioma'
import { usePushNotificacoes } from './hooks/useNotificacoes'
import { useLicenca } from './hooks/useLicenca'
import Dashboard    from './pages/Dashboard'
import Pombos       from './pages/Pombos'
import Patrocinadores from './pages/Patrocinadores'
import Forum        from './pages/Forum'
import Dicas        from './pages/Dicas'
import Documentos   from './pages/Documentos'
import PaginaSucesso from './pages/PaginaSucesso'

function Conteudo() {
  const { user } = useAuth()
  const { t } = useIdioma()
  return (
    <div style={{ color:'#fff', fontSize:18, textAlign:'center' }}>
      ✅ Teste 6 OK — Patrocinadores, Forum, Dicas, Documentos carregados
    </div>
  )
}

export default function App() {
  const { idioma } = useIdiomaState()
  return (
    <IdiomaContext.Provider value={idioma}>
      <ToastProvider>
        <AuthProvider>
          <div style={{ minHeight:'100vh', background:'#050D1A', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <Conteudo />
          </div>
        </AuthProvider>
      </ToastProvider>
    </IdiomaContext.Provider>
  )
}
