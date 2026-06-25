import { useState, useEffect } from 'react'
import { useIdioma } from '../hooks/useIdioma'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Spinner, EmptyState } from '../components/ui'

const RARIDADE_COR = {
  comum:    { bg:'rgba(148,163,184,.1)', border:'rgba(148,163,184,.25)', text:'#94a3b8', label:'Comum' },
  rara:     { bg:'rgba(76,141,255,.1)',  border:'rgba(76,141,255,.25)',  text:'#4C8DFF', label:'Rara' },
  epica:    { bg:'rgba(168,85,247,.1)',  border:'rgba(168,85,247,.25)',  text:'#A855F7', label:'Épica' },
  lendaria: { bg:'rgba(212,175,55,.1)', border:'rgba(212,175,55,.3)',   text:'#D4AF37', label:'Lendária' },
}

const CATEGORIAS = ['todas','provas','pombos','ligas','comunidade','especial']
const CAT_LABEL = { todas:'Todas', provas:'🏆 Provas', pombos:'🐦 Pombos', ligas:'🏅 Ligas', comunidade:'🌐 Comunidade', especial:'⭐ Especial' }

export function ConquistaCard({ c, obtida = true, mini = false }) {
  const r = RARIDADE_COR[c.raridade] || RARIDADE_COR.comum
  if (mini) return (
    <div title={`${c.titulo} — ${c.descricao}`} style={{
      width: 36, height: 36, borderRadius: 8,
      background: obtida ? r.bg : 'rgba(16,31,64,.4)',
      border: `1px solid ${obtida ? r.border : '#1B2D52'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18, opacity: obtida ? 1 : 0.35, cursor: 'default',
      filter: obtida ? 'none' : 'grayscale(1)',
    }}>{c.icon}</div>
  )
  return (
    <div style={{
      background: obtida ? r.bg : 'rgba(11,24,48,.4)',
      border: `1px solid ${obtida ? r.border : '#1B2D52'}`,
      borderRadius: 10, padding: '14px 14px',
      opacity: obtida ? 1 : 0.45,
      filter: obtida ? 'none' : 'grayscale(.7)',
      position: 'relative', overflow: 'hidden',
    }}>
      {obtida && c.raridade === 'lendaria' && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${r.text},transparent)` }}/>
      )}
      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>{c.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:2 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: obtida ? '#fff' : '#475569' }}>{c.titulo}</div>
            <span style={{ fontSize: 9, fontWeight: 700, color: r.text, background: r.bg, border:`1px solid ${r.border}`, borderRadius: 99, padding:'1px 6px' }}>{r.label}</span>
          </div>
          <div style={{ fontSize: 11, color: '#7A8699', lineHeight: 1.5 }}>{c.descricao}</div>
          {c.creditos_premio > 0 && obtida && (
            <div style={{ fontSize: 10, color:'#D4AF37', marginTop: 4 }}>+{c.creditos_premio} créditos</div>
          )}
          {obtida && c.created_at && (
            <div style={{ fontSize: 10, color:'#475569', marginTop: 2 }}>
              {new Date(c.created_at).toLocaleDateString('pt-PT')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function useT() { return useIdioma().t }
export default function Conquistas({ userId, mini = false }) {
  const { user } = useAuth()
  const uid = userId || user?.id
  const [obtidas, setObtidas] = useState([])
  const [todas, setTodas] = useState([])
  const [loading, setLoading] = useState(true)
  const t = useT()
  const [cat, setCat] = useState('todas')

  useEffect(() => {
    if (!uid) return
    Promise.all([
      supabase.from('conquistas').select('*').eq('user_id', uid),
      supabase.from('conquistas_def').select('*').order('raridade'),
    ]).then(([{ data: o }, { data: t }]) => {
      setObtidas(o || [])
      setTodas(t || [])
    }).finally(() => setLoading(false))
  }, [uid])

  const obtidasMap = new Set(obtidas.map(o => o.tipo))
  const filtradas = todas.filter(c => cat === 'todas' || c.categoria === cat)
  const nObtidas = obtidas.length
  const pct = todas.length ? Math.round((nObtidas / todas.length) * 100) : 0

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding: mini ? 12 : 40 }}><Spinner /></div>

  // Modo mini — só mostra as obtidas em linha
  if (mini) return (
    <div>
      <div style={{ fontSize: 11, color:'#7A8699', marginBottom: 6 }}>{nObtidas} conquista(s)</div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
        {obtidas.slice(0, 8).map(o => {
          const def = todas.find(t => t.tipo === o.tipo) || o
          return <ConquistaCard key={o.tipo} c={{...def,...o}} obtida mini/>
        })}
        {nObtidas > 8 && <div style={{ width:36, height:36, borderRadius:8, background:'#101F40', border:'1px solid #1B2D52', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#475569' }}>+{nObtidas-8}</div>}
        {nObtidas === 0 && <div style={{ fontSize:11, color:'#475569' }}>Sem conquistas ainda</div>}
      </div>
    </div>
  )

  return (
    <div>
      {/* Header stats */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#D4AF37,#A855F7,#4C8DFF)' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>🏅 Conquistas</div>
            <div style={{ fontSize:11, color:'#7A8699' }}>{nObtidas} de {todas.length} desbloqueadas</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:900, color:'#D4AF37' }}>{pct}%</div>
            <div style={{ fontSize:10, color:'#7A8699' }}>completo</div>
          </div>
        </div>
        <div style={{ height:6, background:'#101F40', borderRadius:99, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#D4AF37,#A855F7)', borderRadius:99, transition:'width .5s' }}/>
        </div>
        {/* Contagem por raridade */}
        <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap' }}>
          {Object.entries(RARIDADE_COR).map(([r, c]) => {
            const n = obtidas.filter(o => todas.find(t=>t.tipo===o.tipo)?.raridade === r).length
            return <div key={r} style={{ fontSize:10, color:c.text }}>
              {n} {c.label}
            </div>
          })}
        </div>
      </div>

      {/* Filtros por categoria */}
      <div style={{ display:'flex', gap:4, overflowX:'auto', marginBottom:12, paddingBottom:2 }}>
        {CATEGORIAS.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            padding:'6px 12px', borderRadius:99, fontSize:11, fontWeight:600,
            cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap',
            background: cat===c ? '#1E5FD9' : '#101F40',
            color: cat===c ? '#fff' : '#475569',
          }}>{CAT_LABEL[c]}</button>
        ))}
      </div>

      {/* Grid de conquistas */}
      {filtradas.length === 0
        ? <EmptyState icon="🏅" title="Sem conquistas nesta categoria" desc="Continua a usar a app para desbloquear!"/>
        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
            {/* Primeiro as obtidas, depois as bloqueadas */}
            {[...filtradas.filter(c=>obtidasMap.has(c.tipo)), ...filtradas.filter(c=>!obtidasMap.has(c.tipo))].map(c => {
              const obtida_data = obtidas.find(o=>o.tipo===c.tipo)
              return <ConquistaCard key={c.tipo} c={{...c,...(obtida_data||{})}} obtida={obtidasMap.has(c.tipo)}/>
            })}
          </div>
      }
    </div>
  )
}

// ─── FUNÇÃO PARA ATRIBUIR CONQUISTA ───────────────────
export async function atribuirConquista(userId, tipo) {
  try {
    const { data: def } = await supabase.from('conquistas_def').select('*').eq('tipo', tipo).single()
    if (!def) return false
    const { error } = await supabase.from('conquistas').insert({
      user_id: userId, tipo, titulo: def.titulo, descricao: def.descricao,
      icon: def.icon, categoria: def.categoria, raridade: def.raridade,
      creditos_premio: def.creditos_premio,
    })
    if (error && error.code === '23505') return false // já tem
    if (error) throw error
    return true
  } catch { return false }
}

// ─── VERIFICAR E ATRIBUIR AUTOMATICAMENTE ─────────────
export async function verificarConquistas(userId, dados = {}) {
  const tarefas = []
  const { nProvas=0, nPombos=0, vitorias=0, maxPercentil=0, temGrandeFundo=false, temPedigree=false, temCasaisIA=false, temLiga=false, temLigaOficial=false, temPost=false, temMarketplace=false, temLeilao=false, temAfiliado=false } = dados

  if (nProvas >= 1)   tarefas.push('primeira_prova')
  if (nProvas >= 10)  tarefas.push('prova_10')
  if (nProvas >= 50)  tarefas.push('prova_50')
  if (nProvas >= 100) tarefas.push('prova_100')
  if (vitorias >= 1)  tarefas.push('vitoria_1')
  if (vitorias >= 5)  tarefas.push('vitorias_5')
  if (vitorias >= 10) tarefas.push('vitorias_10')
  if (maxPercentil >= 90) tarefas.push('percentil_90')
  if (maxPercentil >= 95) tarefas.push('percentil_95')
  if (temGrandeFundo) tarefas.push('grande_fundo')
  if (nPombos >= 1)   tarefas.push('pombo_1')
  if (nPombos >= 10)  tarefas.push('pombo_10')
  if (nPombos >= 50)  tarefas.push('pombo_50')
  if (temPedigree)    tarefas.push('pedigree_1')
  if (temCasaisIA)    tarefas.push('casais_ia')
  if (temLiga)        tarefas.push('liga_1')
  if (temLigaOficial) tarefas.push('liga_oficial')
  if (temPost)        tarefas.push('comunidade_1')
  if (temMarketplace) tarefas.push('marketplace_1')
  if (temLeilao)      tarefas.push('leilao_1')
  if (temAfiliado)    tarefas.push('afiliado')

  const novas = []
  for (const tipo of tarefas) {
    const atribuida = await atribuirConquista(userId, tipo)
    if (atribuida) novas.push(tipo)
  }
  return novas
}
