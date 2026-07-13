import { useState, useEffect } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const PASSOS = [
  { id:'boas-vindas', icon:'🕊️', titulo:'Bem-vindo ao Fly2Win!', desc:'A plataforma premium de gestão columbófila. Vamos configurar o teu pombal em menos de 2 minutos.', acao:null },
  { id:'perfil', icon:'👤', titulo:'O teu perfil', desc:'Preenche o teu nome, federação e localização do pombal. Estes dados aparecem no Pedigree e na Comunidade.', acao:'perfil', acaoLabel:'Preencher Perfil' },
  { id:'primeiro-pombo', icon:'🐦', titulo:'Adiciona o teu primeiro pombo', desc:'Regista um pombo do teu efectivo. Podes importar vários de uma vez em CSV no módulo de Importação.', acao:'pombos', acaoLabel:'Ir a Pombos' },
  { id:'primeira-prova', icon:'🏆', titulo:'Regista uma prova', desc:'Adiciona resultados de provas para calcular percentis e acompanhar a evolução do efectivo.', acao:'provas', acaoLabel:'Ir a Provas' },
  { id:'comunidade', icon:'🌐', titulo:'Junta-te à Comunidade', desc:'Activa o perfil público para aparecer no mapa, seguires outros criadores e partilhares resultados.', acao:'comunidade', acaoLabel:'Ver Comunidade' },
  { id:'concluido', icon:'🎉', titulo:'Pronto!', desc:'O teu pombal está configurado. Explora Reprodução, Saúde, Pedigree, Casais IA e muito mais.', acao:null },
]

export default function Onboarding({ nav, onConcluir }) {
  const [passo, setPasso] = useState(0)
  const [fade, setFade] = useState(true)

  const ir = (delta) => {
    setFade(false)
    setTimeout(() => { setPasso(p => Math.max(0, Math.min(PASSOS.length-1, p+delta))); setFade(true) }, 180)
  }

  const concluir = () => {
    localStorage.setItem('cl_onboarding_done','1')
    db.savePerfil({ onboarding_done:true }).catch(()=>{})
    onConcluir?.()
  }

  const step = PASSOS[passo]
  const pct = Math.round(passo/(PASSOS.length-1)*100)
  const ultimo = passo === PASSOS.length-1

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(5,13,26,.96)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.25)', borderRadius:20, padding:'32px 28px', maxWidth:400, width:'100%', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }} />
        <button onClick={concluir} style={{ position:'absolute', top:14, right:14, background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:12 }}>Saltar</button>
        <div style={{ height:4, background:'#101F40', borderRadius:2, marginBottom:28, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#1E5FD9,#D4AF37)', borderRadius:2, transition:'width .4s' }} />
        </div>
        <div style={{ textAlign:'center', opacity:fade?1:0, transition:'opacity .18s' }}>
          <div style={{ fontSize:54, marginBottom:14 }}>{step.icon}</div>
          <div style={{ fontSize:19, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif", marginBottom:10, lineHeight:1.3 }}>{step.titulo}</div>
          <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.7, marginBottom:24 }}>{step.desc}</div>
          <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:22 }}>
            {PASSOS.map((_,i)=>(
              <div key={i} style={{ width:i===passo?18:6, height:6, borderRadius:3, background:i===passo?'#D4AF37':i<passo?'#2DD4A7':'#1B2D52', transition:'all .3s', cursor:'pointer' }} onClick={()=>{setFade(false);setTimeout(()=>{setPasso(i);setFade(true)},180)}} />
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {step.acao && (
              <button className="btn btn-secondary" onClick={()=>{ nav?.(step.acao); ir(1) }}>{step.acaoLabel} →</button>
            )}
            <button className="btn btn-primary" onClick={()=>ultimo?concluir():ir(1)} style={{ fontSize:14, padding:'12px' }}>
              {ultimo ? '🚀 Começar a usar!' : step.acao ? 'Depois →' : 'Continuar →'}
            </button>
          </div>
          {passo>0 && <button onClick={()=>ir(-1)} style={{ marginTop:10, background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:12 }}>← Voltar</button>}
        </div>
      </div>
    </div>
  )
}

export function useOnboarding() {
  const { user } = useAuth()
  const [mostrar, setMostrar] = useState(false)
  useEffect(() => {
    if (!user || localStorage.getItem('cl_onboarding_done')) return
    setTimeout(() => setMostrar(true), 1000)
  }, [user])
  return { mostrar, concluir: () => setMostrar(false) }
}

// ─── Barra de progresso persistente ──────────────────────────
const TAREFAS = [
  { id:'perfil',      label:'Preencher perfil',           desc:'Nome, federação e localização',  icone:'👤', acao:'perfil',     check: async (uid) => { const { data } = await import('../lib/supabase').then(m=>m.supabase).then(s=>s.from('perfis').select('nome,localidade').eq('user_id',uid).maybeSingle()); return !!(data?.nome && data?.localidade) } },
  { id:'foto_perfil', label:'Adicionar foto de perfil',   desc:'Foto ou logo do pombal',         icone:'📸', acao:'perfil',     check: async (uid) => { const { data } = await import('../lib/supabase').then(m=>m.supabase).then(s=>s.from('perfis').select('foto_perfil_url').eq('user_id',uid).maybeSingle()); return !!data?.foto_perfil_url } },
  { id:'pombo',       label:'Adicionar primeiro pombo',   desc:'Regista um pombo no efectivo',   icone:'🐦', acao:'pombos',    check: async (uid) => { const { data } = await import('../lib/supabase').then(m=>m.supabase).then(s=>s.from('pigeons').select('id').eq('user_id',uid).limit(1)); return !!(data?.length) } },
  { id:'prova',       label:'Registar primeira prova',    desc:'Adiciona resultados de uma prova', icone:'🏆', acao:'provas',   check: async (uid) => { const { data } = await import('../lib/supabase').then(m=>m.supabase).then(s=>s.from('races').select('id').eq('user_id',uid).limit(1)); return !!(data?.length) } },
  { id:'pombal',      label:'Criar pombal',               desc:'Define o nome do pombal',        icone:'🏠', acao:'pombais',   check: async (uid) => { const { data } = await import('../lib/supabase').then(m=>m.supabase).then(s=>s.from('pombais').select('id').eq('user_id',uid).limit(1)); return !!(data?.length) } },
  { id:'publico',     label:'Activar perfil público',     desc:'Aparece na comunidade',          icone:'🌐', acao:'perfil',    check: async (uid) => { const { data } = await import('../lib/supabase').then(m=>m.supabase).then(s=>s.from('perfis').select('perfil_publico').eq('user_id',uid).maybeSingle()); return !!data?.perfil_publico } },
]

export function BarraProgresso({ nav, uid }) {
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState(false)
  const [oculto, setOculto] = useState(() => !!localStorage.getItem('cl_barra_oculta'))

  useEffect(() => {
    if (!uid || oculto) return
    Promise.all(TAREFAS.map(async t => ({ ...t, feito: await t.check(uid).catch(()=>false) })))
      .then(r => { setTarefas(r); setLoading(false) })
  }, [uid, oculto])

  if (oculto) return null
  if (loading) return null

  const feitas = tarefas.filter(t => t.feito).length
  const pct = Math.round(feitas / tarefas.length * 100)
  if (pct === 100) return null // ocultar quando completo

  return (
    <div style={{ background:'linear-gradient(135deg,#0B1830,#050D1A)', border:'1px solid rgba(212,175,55,.2)', borderRadius:14, padding:'14px 16px', marginBottom:12, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, height:3, width:`${pct}%`, background:'linear-gradient(90deg,#1E5FD9,#D4AF37)', transition:'width .5s', borderRadius:2 }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: expandido ? 12 : 0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>🚀</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>Pombal {pct}% configurado</div>
            <div style={{ fontSize:11, color:'#7A8699' }}>{feitas} de {tarefas.length} tarefas concluídas</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button onClick={() => setExpandido(e => !e)}
            style={{ background:'rgba(76,141,255,.1)', border:'1px solid rgba(76,141,255,.2)', borderRadius:8, padding:'4px 10px', fontSize:11, color:'#4C8DFF', cursor:'pointer', fontFamily:'inherit' }}>
            {expandido ? 'Recolher ▲' : 'Ver tarefas ▼'}
          </button>
          <button onClick={() => { setOculto(true); localStorage.setItem('cl_barra_oculta','1') }}
            style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:16, padding:'2px 4px' }}>✕</button>
        </div>
      </div>

      {expandido && (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
          {tarefas.map(t => (
            <div key={t.id} onClick={() => !t.feito && nav?.(t.acao)}
              style={{ display:'flex', gap:10, alignItems:'center', padding:'9px 12px', background: t.feito ? 'rgba(45,212,167,.06)' : 'rgba(255,255,255,.03)', borderRadius:9, border:`1px solid ${t.feito ? 'rgba(45,212,167,.2)' : 'rgba(255,255,255,.06)'}`, cursor: t.feito ? 'default' : 'pointer' }}>
              <span style={{ fontSize:18, width:24, textAlign:'center' }}>{t.feito ? '✅' : t.icone}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, color: t.feito ? '#2DD4A7' : '#fff', textDecoration: t.feito ? 'line-through' : 'none' }}>{t.label}</div>
                <div style={{ fontSize:10, color:'#475569' }}>{t.desc}</div>
              </div>
              {!t.feito && <span style={{ fontSize:11, color:'#4C8DFF' }}>→</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
