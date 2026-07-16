// src/modules/virtualLoft/index.jsx
import { useState } from 'react'
import CarreiraCreate from './screens/CarreiraCreate'
import HubPombal from './screens/HubPombal'
import VLPombos from './screens/VLPombos'
import VLTreinos from './screens/VLTreinos'
import VLPombal from './screens/VLPombal'
import VLStaff from './screens/VLStaff'
import VLProvas from './screens/VLProvas'
import { useCarreira } from './hooks/useCarreira'

const ADMIN_UUID = '30709f29-152e-4813-ac7f-e3376c5e0646'

export default function VirtualLoftApp({ user, idiomaApp = 'pt' }) {
  if (user?.id !== ADMIN_UUID) return null

  const { carreira, criarCarreira, guardarCarreira } = useCarreira()
  const [modulo, setModulo] = useState(null)
  const idioma = carreira?.idioma || idiomaApp

  const screen = modulo ? 'modulo' : carreira ? 'hub' : 'criar'

  const handleCriar = async (form) => { await criarCarreira(form); setModulo(null) }
  const handleVoltar = () => setModulo(null)
  const handleGuardar = (dados) => guardarCarreira(dados)
  const handleApagar = () => { localStorage.removeItem('vl_carreira'); window.location.reload() }

  if (screen === 'criar') return <CarreiraCreate onCriar={handleCriar} idiomaApp={idiomaApp} />

  if (screen === 'modulo' && carreira) {
    const props = { carreira, onVoltar: handleVoltar, onGuardar: handleGuardar, idioma }
    if (modulo === 'pombos')  return <VLPombos  {...props} />
    if (modulo === 'treinos') return <VLTreinos {...props} />
    if (modulo === 'pombal')  return <VLPombal  {...props} />
    if (modulo === 'staff')   return <VLStaff   {...props} />
    if (modulo === 'provas')  return <VLProvas  {...props} />
    if (modulo === 'financas') return (
      <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', fontFamily:'inherit', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,.05)', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={handleVoltar} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>←</button>
          <div style={{ fontSize:16, fontWeight:800 }}>💰 {idioma==='en'?'Finances':idioma==='es'?'Finanzas':'Finanças'}</div>
        </div>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:48 }}>🚧</div>
          <div style={{ fontSize:16, fontWeight:700, color:'#D4AF37' }}>{idioma==='en'?'Coming soon':idioma==='es'?'Próximamente':'Em breve'}</div>
        </div>
      </div>
    )
    return null
  }

  if (screen === 'hub' && carreira) return (
    <HubPombal carreira={carreira} onNavegar={setModulo} onApagarCarreira={handleApagar} idioma={idioma} />
  )

  return null
}
