// src/modules/virtualLoft/index.jsx
import { useState } from 'react'
import CarreiraCreate from './screens/CarreiraCreate'
import HubPombal from './screens/HubPombal'
import VLPombos from './screens/VLPombos'
import VLTreinos from './screens/VLTreinos'
import VLPombal from './screens/VLPombal'
import VLStaff from './screens/VLStaff'
import VLProvas from './screens/VLProvas'
import VLFinancas from './screens/VLFinancas'
import { gerarPlantelInicial } from './engine/genetics'

const ADMIN_UUID = '30709f29-152e-4813-ac7f-e3376c5e0646'
const STORAGE_KEY = 'vl_carreira'

function lerCarreira() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
}

function gravarCarreira(dados) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dados)) } catch {}
}

function avancarSemana(c) {
  const nova = { ...c, pombos: [...c.pombos] }
  const custoStaff = Math.round((nova.staff||[]).reduce((s,m) => s+(m.salario||0), 0) / 4)
  const custoAlim = nova.pombos.length * 5
  nova.orcamento = Math.max(0, nova.orcamento - custoStaff - custoAlim)
  nova.reputacao = Math.min(100, (nova.reputacao||5) + 0.5)
  nova.semana = (nova.semana||1) + 1
  if (nova.semana > 40) { nova.semana = 1; nova.epoca = (nova.epoca||1) + 1 }
  if (nova.reputacao>=90) nova.nivel_reputacao='olimpico'
  else if (nova.reputacao>=70) nova.nivel_reputacao='internacional'
  else if (nova.reputacao>=50) nova.nivel_reputacao='nacional'
  else if (nova.reputacao>=35) nova.nivel_reputacao='regional'
  else if (nova.reputacao>=20) nova.nivel_reputacao='distrital'
  else nova.nivel_reputacao='local'
  return nova
}

export default function VirtualLoftApp({ user, idiomaApp = 'pt' }) {
  if (user?.id !== ADMIN_UUID) return null

  // Estado da carreira directamente aqui — sem hook intermédio
  const [carreira, setCarreira] = useState(() => lerCarreira())
  const [modulo, setModulo] = useState(null)

  const idioma = carreira?.idioma || idiomaApp

  const salvarEActualizar = (dados) => {
    gravarCarreira(dados)
    setCarreira({ ...dados }) // spread para forçar novo objecto e re-render
  }

  const handleCriar = (form) => {
    const ORCAMENTOS = { jovem:2500, amador:8000, profissional:25000, lenda:100000 }
    const MULT = { facil:1.5, normal:1.0, dificil:0.7, lenda:0.5 }
    const nova = {
      id: `c_${Date.now()}`,
      nomePombal: form.nomePombal,
      nomeGestor: form.nomeGestor,
      pais: form.pais,
      idioma: form.idioma,
      dificuldade: form.dificuldade,
      tipoInicio: form.tipoInicio,
      logotipo: form.logotipo || '🕊️',
      orcamento: Math.round((ORCAMENTOS[form.tipoInicio]||8000) * (MULT[form.dificuldade]||1)),
      reputacao: form.tipoInicio==='lenda'?80:form.tipoInicio==='profissional'?40:form.tipoInicio==='amador'?20:5,
      nivel_reputacao: 'local',
      epoca: 1, semana: 1,
      pombos: gerarPlantelInicial(form.tipoInicio, form.idioma),
      staff: [], estruturas: {}, movimentos: [],
      historico_provas: [], conquistas: [],
    }
    salvarEActualizar(nova)
    setModulo(null)
  }

  const handleAvancarSemana = () => {
    if (!carreira) return
    salvarEActualizar(avancarSemana(carreira))
  }

  const handleApagar = () => {
    localStorage.removeItem(STORAGE_KEY)
    setCarreira(null)
    setModulo(null)
  }

  if (!carreira) return <CarreiraCreate onCriar={handleCriar} idiomaApp={idiomaApp} />

  if (modulo) {
    const props = { carreira, onVoltar:() => setModulo(null), onGuardar: salvarEActualizar, idioma }
    if (modulo==='pombos')   return <VLPombos   {...props} />
    if (modulo==='treinos')  return <VLTreinos  {...props} />
    if (modulo==='pombal')   return <VLPombal   {...props} />
    if (modulo==='staff')    return <VLStaff    {...props} />
    if (modulo==='provas')   return <VLProvas   {...props} />
    if (modulo==='financas') return <VLFinancas {...props} />
    return (
      <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', display:'flex', flexDirection:'column', fontFamily:'inherit' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,.05)', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => setModulo(null)} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>←</button>
          <div style={{ fontSize:16, fontWeight:800 }}>{modulo}</div>
        </div>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:48 }}>🚧</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#D4AF37' }}>Em breve</div>
        </div>
      </div>
    )
  }

  return (
    <HubPombal
      carreira={carreira}
      onNavegar={setModulo}
      onApagarCarreira={handleApagar}
      onAvancarSemana={handleAvancarSemana}
      idioma={idioma}
    />
  )
}
