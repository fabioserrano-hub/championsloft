import { useState, useEffect, useCallback } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { verificarConquistas } from '../components/Conquistas'

// ── constantes ────────────────────────────────────────────────────────────────
const anoAtual = new Date().getFullYear()
const anos = Array.from({ length: 10 }, (_, i) => anoAtual - i)
const paises = ['PT', 'ES', 'FR', 'BE', 'NL', 'DE', 'IT', 'GB', 'PL', 'CZ']
const CORES_POMBO = ['Azul barrado','Azul xadrezado','Azul sem barras','Vermelho barrado','Vermelho xadrezado','Vermelho sem barras','Amarelo','Branco','Branco com marcas','Preto','Cinzento','Castanho','Alazão','Meado','Tigrado','Pied azul','Pied vermelho','Pied branco','Recessivo vermelho','Recessivo amarelo']
const FILTROS = [{ id:'todos', label:'Todos' },{ id:'M', label:'♂ Machos' },{ id:'F', label:'♀ Fêmeas' }]
const ESTADOS_EXT = ['proprio','emprestado','cedido','vendido','oferecido','falecido']
const ESPS = [['velocidade','Velocidade'],['meio_fundo','Meio-Fundo'],['fundo','Fundo'],['grande_fundo','G.Fundo']]
const ESP_ICON = { velocidade:'⚡', meio_fundo:'🎯', fundo:'🏔️', grande_fundo:'🌍' }
const ESP_COR  = { velocidade:'#F59E0B', meio_fundo:'#3B82F6', fundo:'#10B981', grande_fundo:'#8B5CF6' }
const statusBadge = { ativo:'green', reproducao:'yellow', lesionado:'red', inativo:'gray' }
const extBadge = { proprio:'green', emprestado:'yellow', cedido:'blue', vendido:'gray', oferecido:'blue', falecido:'red' }
const ORDENACOES = [['percentil','📊 Percentil'],['forma','💪 Forma'],['nome','🔤 Nome'],['anilha','🏷️ Anilha'],['km','📍 km Total'],['idade','📅 Idade']]

const EMPTY = { anilha:'', nome:'', sexo:'M', cor:'', peso:'', esp:['velocidade'], estado:'ativo', estado_ext:'proprio', pombal:'', pai:'', mae:'', obs:'', emoji:'🐦', criador:'', data_aquisicao:'', valor_aquisicao:'', obs_aquisicao:'', destino_nome:'', destino_data:'', destino_valor:'', destino_obs:'' }

// ── helpers ───────────────────────────────────────────────────────────────────
function idadeDoPombo(anilha) {
  const m = anilha?.match(/-(\d{2})-/)
  if (!m) return null
  const ano2d = parseInt(m[1])
  const anoNasc = ano2d > 50 ? 1900 + ano2d : 2000 + ano2d
  return anoAtual - anoNasc
}

function anoNascimento(anilha) {
  const m = anilha?.match(/-(\d{2})-/)
  if (!m) return null
  const ano2d = parseInt(m[1])
  return ano2d > 50 ? 1900 + ano2d : 2000 + ano2d
}

export function classificarPombo(p) {
  if (p.estado === 'lesionado') return { tag:'Lesionado', cor:'#f87171', prioridade:0 }
  const idade = idadeDoPombo(p.anilha)
  const percentil = p.percentil || 0
  const provas = p.provas || 0
  if (provas >= 3 && percentil > 0 && percentil < 35) return { tag:'Em queda', cor:'#f87171', prioridade:1 }
  if (idade !== null && idade >= 1 && percentil >= 65 && provas >= 3) return { tag:'Pronto a reproduzir', cor:'#D4AF37', prioridade:3 }
  if (p.estado === 'ativo' && (p.forma || 50) >= 60) return { tag:'Pronto a competir', cor:'#2DD4A7', prioridade:3 }
  if (p.estado === 'reproducao') return { tag:'Em reprodução', cor:'#c084fc', prioridade:3 }
  return { tag:'Em repouso', cor:'#7A8699', prioridade:4 }
}

// ── gráfico de peso ───────────────────────────────────────────────────────────
function PesoChart({ registos }) {
  const pontos = registos.filter(r => r.peso).slice(0, 10).reverse()
  if (pontos.length < 2) return <div style={{ fontSize:12, color:'#7A8699', textAlign:'center', padding:'16px 0' }}>Sem dados suficientes de peso (mínimo 2 registos)</div>
  const pesos = pontos.map(p => p.peso)
  const min = Math.min(...pesos) - 10, max = Math.max(...pesos) + 10
  const w = 280, h = 70, pad = 8
  const xStep = (w - pad * 2) / (pontos.length - 1)
  const coords = pesos.map((p, i) => [pad + i * xStep, h - pad - ((p - min) / (max - min)) * (h - pad * 2)])
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0]},${c[1]}`).join(' ')
  const areaPath = `${path} L${coords[coords.length - 1][0]},${h - pad} L${coords[0][0]},${h - pad} Z`
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display:'block' }}>
        <defs><linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25"/><stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/></linearGradient></defs>
        <path d={areaPath} fill="url(#pesoGrad)" />
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth="2" />
        {coords.map((c, i) => <circle key={i} cx={c[0]} cy={c[1]} r="2.5" fill="#60a5fa" />)}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#7A8699', marginTop:4 }}>
        <span>{pesos[0]}g</span><span style={{ color:'#94a3b8' }}>{pontos.length} registos</span><span>{pesos[pesos.length-1]}g</span>
      </div>
    </div>
  )
}

// ── componente principal ──────────────────────────────────────────────────────
export default function Pombos({ nav, params }) {
  const toast = useToast()
  const { t } = useIdioma()
  const { user } = useAuth()

  const [pombos, setPombos]   = useState([])
  const [pombais, setPombais] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtro, setFiltro]   = useState('todos')
  const [filtroPombal, setFiltroPombal] = useState('todos')
  const [filtroEsp, setFiltroEsp]       = useState('todos')
  const [ordenacao, setOrdenacao]       = useState('percentil')
  const [vistaLista, setVistaLista]     = useState(false)
  const [tabPrincipal, setTabPrincipal] = useState('efectivo')
  const [modal, setModal]     = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [historicoProvas, setHistoricoProvas]   = useState([])
  const [historicoSaude, setHistoricoSaude]     = useState([])
  const [historicoTreinos, setHistoricoTreinos] = useState([])
  const [irmãos, setIrmaos]     = useState([])
  const [descendentes, setDescendentes] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [pedigreeInfo, setPedigreeInfo]   = useState(null)
  const [tabDetail, setTabDetail] = useState('info')
  const [modalPartilha, setModalPartilha] = useState(false)
  const [pomboPartilha, setPomboPartilha] = useState(null)

  const [anilhaPais, setAnilhaPais] = useState('PT')
  const [anilhaAno, setAnilhaAno]   = useState(String(anoAtual))
  const [anilhaNum, setAnilhaNum]   = useState('')
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleEsp = e => sf('esp', form.esp.includes(e) ? form.esp.filter(x => x !== e) : [...form.esp, e])

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try { const [p, pb] = await Promise.all([db.getPombos(), db.getPombais()]); setPombos(p); setPombais(pb) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  // abrir por params
  useEffect(() => {
    if (params?.prefillPombal && pombais.length) setFiltroPombal(params.prefillPombal)
  }, [params, pombais])

  // ── computed ──────────────────────────────────────────────────────────────
  const efectivo = pombos.filter(p => !p.estado_ext || p.estado_ext === 'proprio')
  const externos = pombos.filter(p => p.estado_ext && !['proprio','vendido','oferecido','falecido'].includes(p.estado_ext))
  const vendidos = pombos.filter(p => ['vendido','oferecido'].includes(p.estado_ext))
  const listaAtual = tabPrincipal === 'efectivo' ? efectivo : tabPrincipal === 'externos' ? externos : vendidos

  // km total por pombo (calculado a partir dos resultados — aqui estimado pelos dados já no pombo)
  const kmTotal = p => (p.provas || 0) * 320 // estimativa; idealmente vem da BD

  const filtered = listaAtual.filter(p => {
    if (search && !p.nome?.toLowerCase().includes(search.toLowerCase()) && !p.anilha?.toLowerCase().includes(search.toLowerCase())) return false
    if (tabPrincipal === 'efectivo') {
      if (filtro !== 'todos' && p.sexo !== filtro) return false
      if (filtroPombal !== 'todos' && p.pombal !== filtroPombal) return false
      if (filtroEsp !== 'todos' && !(p.esp || []).includes(filtroEsp)) return false
    }
    return true
  }).sort((a, b) => {
    if (ordenacao === 'percentil') return (b.percentil || 0) - (a.percentil || 0)
    if (ordenacao === 'forma')     return (b.forma || 50) - (a.forma || 50)
    if (ordenacao === 'nome')      return (a.nome || '').localeCompare(b.nome || '')
    if (ordenacao === 'anilha')    return (a.anilha || '').localeCompare(b.anilha || '')
    if (ordenacao === 'km')        return kmTotal(b) - kmTotal(a)
    if (ordenacao === 'idade')     return (anoNascimento(a.anilha) || 0) - (anoNascimento(b.anilha) || 0)
    return 0
  })

  // ── open detail ───────────────────────────────────────────────────────────
  const openDetail = async p => {
    setSelected(p); setModal('detail'); setLoadingDetail(true); setPedigreeInfo(null); setTabDetail('info')
    setHistoricoProvas([]); setHistoricoSaude([]); setHistoricoTreinos([]); setIrmaos([]); setDescendentes([])
    try {
      const [provasRes, saudeRes, treinosRes, pedRes] = await Promise.all([
        supabase.from('race_results').select('*, races(nome,data_reg,dist,local_solta,tipo)').eq('pigeon_id', p.id).order('created_at', { ascending:false }).limit(20),
        supabase.from('health').select('*').eq('pigeon_id', p.id).order('created_at', { ascending:false }).limit(10),
        supabase.from('treinos').select('*').contains('pombos_ids', [p.id]).order('data_reg', { ascending:false }),
        db.getPedigree(p.id).catch(() => null),
      ])
      setHistoricoProvas(provasRes.data || [])
      setHistoricoSaude(saudeRes.data || [])
      setHistoricoTreinos(treinosRes.data || [])

      // pedigree
      if (pedRes?.pai?.nome || pedRes?.mae?.nome) {
        setPedigreeInfo({ pai: pedRes.pai || null, mae: pedRes.mae || null })
      } else if (p.pai || p.mae) {
        const pai = pombos.find(x => x.anilha === p.pai || x.nome === p.pai)
        const mae = pombos.find(x => x.anilha === p.mae || x.nome === p.mae)
        if (pai || mae) setPedigreeInfo({ pai: pai ? { anilha:pai.anilha, nome:pai.nome, cor:pai.cor, percentil:pai.percentil } : null, mae: mae ? { anilha:mae.anilha, nome:mae.nome, cor:mae.cor, percentil:mae.percentil } : null })
      }

      // irmãos (mesmo pai e mãe)
      if (p.pai || p.mae) {
        const irm = pombos.filter(x => x.id !== p.id && ((p.pai && x.pai === p.pai) || (p.mae && x.mae === p.mae)))
        setIrmaos(irm.slice(0, 6))
      }

      // descendentes (este pombo é pai ou mãe)
      const desc = pombos.filter(x => x.pai === p.anilha || x.mae === p.anilha || x.pai === p.nome || x.mae === p.nome)
      setDescendentes(desc.slice(0, 8))

    } catch (e) { }
    finally { setLoadingDetail(false) }
  }

  // ── open form ─────────────────────────────────────────────────────────────
  const openNew = () => {
    setAnilhaPais('PT'); setAnilhaAno(String(anoAtual)); setAnilhaNum('')
    setForm({ ...EMPTY, pombal: pombais[0]?.nome || '' })
    setPhotoFile(null); setPhotoPreview(null); setSelected(null); setModal('form')
  }
  const openEdit = async p => {
    setSelected(p)
    let paiA = p.pai || '', maeA = p.mae || ''
    try { const ped = await db.getPedigree(p.id); if (ped?.pai?.anilha) paiA = ped.pai.anilha; if (ped?.mae?.anilha) maeA = ped.mae.anilha } catch(e) {}
    setForm({ anilha:p.anilha||'', nome:p.nome||'', sexo:p.sexo||'M', cor:p.cor||'', peso:p.peso||'', esp:p.esp||['velocidade'], estado:p.estado||'ativo', estado_ext:p.estado_ext||'proprio', pombal:p.pombal||'', pai:paiA, mae:maeA, obs:p.obs||'', emoji:p.emoji||'🐦', criador:p.criador||'', data_aquisicao:p.data_aquisicao||'', valor_aquisicao:p.valor_aquisicao||'', obs_aquisicao:p.obs_aquisicao||'', destino_nome:p.destino_nome||'', destino_data:p.destino_data||'', destino_valor:p.destino_valor||'', destino_obs:p.destino_obs||'' })
    setPhotoPreview(p.foto_url || null); setPhotoFile(null); setModal('form')
  }
  const close = () => { setModal(null); setSelected(null); setPhotoFile(null); setPhotoPreview(null); setHistoricoProvas([]); setHistoricoSaude([]); setHistoricoTreinos([]); setPedigreeInfo(null); setIrmaos([]); setDescendentes([]) }

  const save = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório', 'warn'); return }
    setSaving(true)
    try {
      const anilhaFinal = anilhaNum ? `${anilhaPais}-${anilhaAno}-${anilhaNum.padStart(5,'0')}` : form.anilha.trim()
      const payload = { anilha:anilhaFinal, nome:form.nome.trim(), sexo:form.sexo, cor:form.cor, peso:form.peso?parseInt(form.peso):null, esp:form.esp, estado:form.estado, estado_ext:form.estado_ext, pombal:form.pombal, pai:form.pai, mae:form.mae, obs:form.obs, emoji:form.emoji, criador:form.criador, data_aquisicao:form.data_aquisicao||null, valor_aquisicao:form.valor_aquisicao?parseFloat(form.valor_aquisicao):null, obs_aquisicao:form.obs_aquisicao, destino_nome:form.destino_nome, destino_data:form.destino_data||null, destino_valor:form.destino_valor?parseFloat(form.destino_valor):null, destino_obs:form.destino_obs, provas:selected?.provas||0, percentil:selected?.percentil||0, forma:selected?.forma||50 }
      let saved
      if (selected) saved = await db.updatePombo(selected.id, payload)
      else saved = await db.createPombo(payload)
      if (photoFile && saved?.id && user?.id) {
        try { const url = await db.uploadFoto(user.id, saved.id, photoFile); await db.updatePombo(saved.id, { foto_url:url }) }
        catch (e) { toast('Foto não guardada', 'warn') }
      }
      toast(selected ? 'Actualizado!' : form.nome + ' adicionado!', 'ok'); close(); load()
      if (!selected && user?.id) {
        const { data: tp } = await supabase.from('pigeons').select('id').eq('user_id', user.id)
        const novas = await verificarConquistas(user.id, { nPombos: tp?.length || 0 })
        if (novas.length > 0) toast('🏅 Nova conquista!', 'ok')
      }
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deletePombo(confirm.id); toast('Eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  // ── computed detail ───────────────────────────────────────────────────────
  const kmTotalDetail = historicoProvas.reduce((s, r) => s + (r.races?.dist || 0), 0)
  const melhorPos = historicoProvas.filter(r => r.posicao).sort((a, b) => a.posicao - b.posicao)[0]
  const velMedia = historicoProvas.filter(r => r.velocidade).length > 0
    ? Math.round(historicoProvas.filter(r => r.velocidade).reduce((s, r) => s + r.velocidade, 0) / historicoProvas.filter(r => r.velocidade).length * 10) / 10
    : null

  // ── cards ─────────────────────────────────────────────────────────────────
  const PomboCard = ({ p }) => {
    const fc = (p.forma || 50) >= 80 ? '#2DD4A7' : (p.forma || 50) >= 60 ? '#D4AF37' : '#f87171'
    const pc = (p.percentil || 0) >= 70 ? '#2DD4A7' : (p.percentil || 0) >= 40 ? '#D4AF37' : '#94a3b8'
    const c = classificarPombo(p)
    const idade = idadeDoPombo(p.anilha)
    const espPrincipal = (p.esp || [])[0]
    return (
      <div className="pombo-card" onClick={() => openDetail(p)} style={c.prioridade <= 1 ? { borderColor: c.cor + '44' } : undefined}>
        <div className="pombo-photo" style={{ height:160, position:'relative' }}>
          {p.foto_url ? <img src={p.foto_url} alt={p.nome} /> : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:40 }}>{p.emoji}</div>}
          <div style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,.6)', borderRadius:6, padding:'2px 6px', fontSize:11, fontWeight:700, color:'#fff' }}>{p.sexo === 'M' ? '♂' : '♀'}</div>
          {espPrincipal && <div style={{ position:'absolute', top:6, left:6, background:`${ESP_COR[espPrincipal]}22`, border:`1px solid ${ESP_COR[espPrincipal]}66`, borderRadius:6, padding:'2px 6px', fontSize:10, fontWeight:700, color:ESP_COR[espPrincipal] }}>{ESP_ICON[espPrincipal]}</div>}
          {p.estado_ext && p.estado_ext !== 'proprio' && <div style={{ position:'absolute', bottom:6, left:6, background:'rgba(0,0,0,.7)', borderRadius:6, padding:'2px 6px', fontSize:10, fontWeight:700, color:'#D4AF37' }}>{p.estado_ext.toUpperCase()}</div>}
        </div>
        <div className="pombo-info">
          <div className="pombo-anel">{p.anilha}</div>
          <div className="pombo-nome">{p.nome}</div>
          {idade !== null && <div style={{ fontSize:10, color:'#475569', marginBottom:3 }}>{idade} {idade === 1 ? 'ano' : 'anos'} · {p.pombal || '—'}</div>}
          <div style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color:c.cor, marginBottom:6 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:c.cor, flexShrink:0 }} />{c.tag}
          </div>
          {/* percentil + forma */}
          <div style={{ display:'flex', gap:8, marginBottom:4 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:'#475569', marginBottom:2 }}>PERCENTIL</div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div className="progress" style={{ flex:1 }}><div className="progress-bar" style={{ width:`${p.percentil||0}%`, background:pc }} /></div>
                <span style={{ fontSize:10, fontWeight:700, color:pc, flexShrink:0 }}>{p.percentil||0}%</span>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:9, color:'#475569', flexShrink:0 }}>FORMA</div>
            <div className="progress" style={{ flex:1 }}><div className="progress-bar" style={{ width:`${p.forma||50}%`, background:fc }} /></div>
            <span style={{ fontSize:10, fontWeight:700, color:fc, flexShrink:0 }}>{p.forma||50}%</span>
          </div>
        </div>
      </div>
    )
  }

  const PomboLinha = ({ p }) => {
    const c = classificarPombo(p)
    const idade = idadeDoPombo(p.anilha)
    return (
      <div onClick={() => openDetail(p)} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#0B1830', borderRadius:10, cursor:'pointer', border:`1px solid ${c.prioridade<=1?c.cor+'33':'#1B2D52'}`, marginBottom:4, transition:'border-color .15s' }}
        onMouseEnter={e=>e.currentTarget.style.borderColor='#4C8DFF44'}
        onMouseLeave={e=>e.currentTarget.style.borderColor=c.prioridade<=1?c.cor+'33':'#1B2D52'}>
        <div style={{ width:36, height:36, borderRadius:8, background:'#101F40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, overflow:'hidden', flexShrink:0 }}>
          {p.foto_url ? <img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : p.emoji||'🐦'}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</span>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#D4AF37' }}>{p.anilha}</span>
            {idade !== null && <span style={{ fontSize:10, color:'#475569' }}>{idade}a</span>}
          </div>
          <div style={{ display:'flex', gap:6, marginTop:2, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, color:c.cor, fontWeight:600 }}>{c.tag}</span>
            {p.pombal && <span style={{ fontSize:10, color:'#475569' }}>🏠 {p.pombal}</span>}
            {(p.esp||[]).slice(0,2).map(e=><span key={e} style={{ fontSize:10, color:ESP_COR[e] }}>{ESP_ICON[e]}</span>)}
          </div>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexShrink:0 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:(p.percentil||0)>=70?'#2DD4A7':'#94a3b8' }}>{p.percentil||0}%</div>
            <div style={{ fontSize:9, color:'#475569' }}>percentil</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:(p.forma||50)>=60?'#D4AF37':'#f87171' }}>{p.forma||50}%</div>
            <div style={{ fontSize:9, color:'#475569' }}>forma</div>
          </div>
          <span style={{ color:'#475569', fontSize:14 }}>›</span>
        </div>
      </div>
    )
  }

  const ExternoCard = ({ p }) => (
    <div className="card card-p" style={{ cursor:'pointer' }} onClick={() => openDetail(p)}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:10, background:'#101F40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, overflow:'hidden', flexShrink:0 }}>
          {p.foto_url ? <img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : p.emoji||'🐦'}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#2DD4A7' }}>{p.anilha}</div>
          {p.destino_nome && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>→ {p.destino_nome}{p.destino_data?` · ${new Date(p.destino_data).toLocaleDateString('pt-PT')}`:''}</div>}
          {p.destino_valor && <div style={{ fontSize:11, color:'#D4AF37' }}>💶 {p.destino_valor}€</div>}
        </div>
        <Badge v={extBadge[p.estado_ext]||'gray'}>{p.estado_ext}</Badge>
      </div>
    </div>
  )

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Pombos</div><div className="section-sub">{efectivo.length} no efectivo · {externos.length} externos</div></div>
        <button className="btn btn-primary" onClick={openNew}>＋ Novo Pombo</button>
      </div>

      {/* tabs principais */}
      <div style={{ display:'flex', gap:4, background:'#101F40', borderRadius:10, padding:4, marginBottom:16, overflowX:'auto' }}>
        {[['efectivo',`🐦 Efectivo (${efectivo.length})`],['externos',`🔄 Externos (${externos.length})`],['vendidos',`💰 Vendidos (${vendidos.length})`]].map(([tab,label])=>(
          <button key={tab} onClick={()=>setTabPrincipal(tab)} style={{ padding:'8px 14px', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tabPrincipal===tab?'#1E5FD9':'none', color:tabPrincipal===tab?'#fff':'#94a3b8' }}>{label}</button>
        ))}
      </div>

      {/* filtros efectivo */}
      {tabPrincipal === 'efectivo' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
          <input className="input" placeholder="🔍 Pesquisar por nome ou anilha..." value={search} onChange={e=>setSearch(e.target.value)} />
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {FILTROS.map(f=><button key={f.id} onClick={()=>setFiltro(f.id)} className={`chip${filtro===f.id?' active':''}`} style={{ fontSize:11 }}>{f.label}</button>)}
            {pombais.length > 0 && <>
              <button onClick={()=>setFiltroPombal('todos')} className={`chip${filtroPombal==='todos'?' active':''}`} style={{ fontSize:11 }}>🏠 Todos</button>
              {pombais.map(pb=><button key={pb.id} onClick={()=>setFiltroPombal(pb.nome)} className={`chip${filtroPombal===pb.nome?' active':''}`} style={{ fontSize:11 }}>🏠 {pb.nome}</button>)}
            </>}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            {ESPS.map(([v,l])=><button key={v} onClick={()=>setFiltroEsp(filtroEsp===v?'todos':v)} className={`chip${filtroEsp===v?' active':''}`} style={{ fontSize:11, color:filtroEsp===v?'#fff':ESP_COR[v] }}>{ESP_ICON[v]} {l}</button>)}
            <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
              <select value={ordenacao} onChange={e=>setOrdenacao(e.target.value)} className="input" style={{ fontSize:11, padding:'4px 8px', borderRadius:8, width:'auto' }}>
                {ORDENACOES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={()=>setVistaLista(v=>!v)} className="btn btn-secondary btn-sm">{vistaLista?'⊞ Cards':'☰ Lista'}</button>
            </div>
          </div>
          <div style={{ fontSize:12, color:'#7A8699' }}>{filtered.length} pombo(s)</div>
        </div>
      )}

      {tabPrincipal !== 'efectivo' && <input className="input" style={{ marginBottom:16 }} placeholder="🔍 Pesquisar..." value={search} onChange={e=>setSearch(e.target.value)} />}

      {/* lista */}
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        : filtered.length === 0 ? <EmptyState icon="🐦" title="Sem pombos" desc="Nenhum pombo nesta categoria" action={tabPrincipal==='efectivo'?<button className="btn btn-primary" onClick={openNew}>＋ Novo Pombo</button>:null} />
        : tabPrincipal === 'efectivo' ? (() => {
            const comP = filtered.map(p => ({ p, c:classificarPombo(p) }))
            const grupos = [
              { label:'🚨 Precisam de atenção', items:comP.filter(x=>x.c.prioridade<=1) },
              { label:'🕊️ Efectivo', items:comP.filter(x=>x.c.prioridade>1) },
            ].filter(g=>g.items.length>0)
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
                {grupos.map(g=>(
                  <div key={g.label}>
                    {grupos.length>1 && <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:'.1em', color:'#7A8699', textTransform:'uppercase', marginBottom:10 }}>{g.label} ({g.items.length})</div>}
                    {vistaLista
                      ? g.items.map(({p})=><PomboLinha key={p.id} p={p} />)
                      : <div className="grid-auto">{g.items.map(({p})=><PomboCard key={p.id} p={p} />)}</div>
                    }
                  </div>
                ))}
              </div>
            )
          })()
        : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{filtered.map(p=><ExternoCard key={p.id} p={p} />)}</div>
      }

      {/* ══ MODAL PARTILHA ══════════════════════════════════════════════════════ */}
      {pomboPartilha && (
        <Modal open={modalPartilha} onClose={()=>setModalPartilha(false)} title="🌐 Partilhar na Comunidade"
          footer={
            <div style={{ display:'flex', gap:8, width:'100%' }}>
              <button className="btn btn-secondary" onClick={()=>setModalPartilha(false)}>Cancelar</button>
              <div style={{ flex:1 }}/>
              <button className="btn btn-secondary btn-sm" onClick={()=>{
                const txt = `${pomboPartilha.nome} (${pomboPartilha.anilha})\n🏆 ${pomboPartilha.provas||0} provas · 📊 ${pomboPartilha.percentil||0}% percentil · 💪 ${pomboPartilha.forma||50}% forma\n#columbofilia #pomboscorreio`
                navigator.clipboard?.writeText(txt).then(()=>toast('Copiado!','ok'))
              }}>📋 Copiar</button>
              <button className="btn btn-primary" onClick={()=>{
                setModalPartilha(false)
                const esp = (pomboPartilha.esp||[]).map(e=>ESP_ICON[e]+' '+e).join(' ')
                const conteudo = `${pomboPartilha.emoji||'🐦'} ${pomboPartilha.nome} — ${pomboPartilha.anilha}\n\n📊 Percentil: ${pomboPartilha.percentil||0}%\n💪 Forma: ${pomboPartilha.forma||50}%\n🏆 Provas: ${pomboPartilha.provas||0}\n${esp?`\n${esp}`:''}\n${pomboPartilha.obs?`\n"${pomboPartilha.obs}"`:''}`
                nav?.('comunidade', { prefillPost: { tipo:'Geral', conteudo, pomboId: pomboPartilha.id } })
              }}>🌐 Publicar na LoftSocial →</button>
            </div>
          }>
          {/* Card visual do pombo */}
          <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.25)', borderRadius:16, overflow:'hidden', marginBottom:12 }}>
            <div style={{ height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }}/>
            <div style={{ display:'flex', minHeight:180 }}>
              {/* Foto — lado esquerdo */}
              <div style={{ width:'45%', position:'relative', background:'#101F40', flexShrink:0 }}>
                {pomboPartilha.foto_url
                  ? <img src={pomboPartilha.foto_url} alt={pomboPartilha.nome} style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}/>
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:64 }}>{pomboPartilha.emoji||'🐦'}</div>
                }
                {/* especialidade */}
                {(pomboPartilha.esp||[])[0]&&(
                  <div style={{ position:'absolute', bottom:8, left:8, background:`${ESP_COR[(pomboPartilha.esp||[])[0]]}22`, border:`1px solid ${ESP_COR[(pomboPartilha.esp||[])[0]]}60`, borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700, color:ESP_COR[(pomboPartilha.esp||[])[0]] }}>
                    {ESP_ICON[(pomboPartilha.esp||[])[0]]} {(pomboPartilha.esp||[])[0]}
                  </div>
                )}
              </div>
              {/* Stats — lado direito */}
              <div style={{ flex:1, padding:'16px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:'#fff', lineHeight:1.1, marginBottom:4 }}>{pomboPartilha.nome}</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#D4AF37', marginBottom:10 }}>{pomboPartilha.anilha}</div>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
                    <span style={{ fontSize:10, color:'#94a3b8' }}>{pomboPartilha.sexo==='M'?'♂':'♀'}</span>
                    {pomboPartilha.cor&&<span style={{ fontSize:10, color:'#94a3b8' }}>· {pomboPartilha.cor}</span>}
                    {idadeDoPombo(pomboPartilha.anilha)!==null&&<span style={{ fontSize:10, color:'#94a3b8' }}>· {idadeDoPombo(pomboPartilha.anilha)}a</span>}
                  </div>
                </div>
                {/* KPIs */}
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { label:'Percentil', value:(pomboPartilha.percentil||0)+'%', cor:(pomboPartilha.percentil||0)>=70?'#2DD4A7':'#D4AF37' },
                    { label:'Forma', value:(pomboPartilha.forma||50)+'%', cor:(pomboPartilha.forma||50)>=60?'#4C8DFF':'#94a3b8' },
                    { label:'Provas', value:String(pomboPartilha.provas||0), cor:'#D4AF37' },
                  ].map(({label,value,cor})=>(
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:10, color:'#475569', textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</span>
                      <span style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:cor }}>{value}</span>
                    </div>
                  ))}
                </div>
                {/* Pombal */}
                {pomboPartilha.pombal&&(
                  <div style={{ fontSize:10, color:'#7A8699', marginTop:8, borderTop:'1px solid #1B2D52', paddingTop:8 }}>
                    🏠 {pomboPartilha.pombal}
                  </div>
                )}
                {/* Marca d'água */}
                <div style={{ fontSize:9, color:'#334155', marginTop:6, fontFamily:"'Space Mono',monospace" }}>championsloft.pt</div>
              </div>
            </div>
            {/* Observações se existirem */}
            {pomboPartilha.obs&&(
              <div style={{ padding:'8px 14px', borderTop:'1px solid #1B2D52', fontSize:11, color:'#7A8699', fontStyle:'italic' }}>
                "{pomboPartilha.obs}"
              </div>
            )}
          </div>
          <div style={{ fontSize:11, color:'#475569', textAlign:'center' }}>Clica em "Publicar na LoftSocial" para partilhar com a comunidade</div>
        </Modal>
      )}

      {/* ══ MODAL FORM ════════════════════════════════════════════════════════ */}}
      <Modal open={modal==='form'} onClose={close} title={selected?`✏️ ${selected.nome}`:'🐦 Novo Pombo'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}{selected?t('guardar'):'Adicionar'}</button></>}>
        <div className="form-grid">
          <div className="col-2" style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:72, height:72, borderRadius:14, border:'2px dashed #243860', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', cursor:'pointer', flexShrink:0 }} onClick={()=>document.getElementById('photo-up').click()}>
              {photoPreview?<img src={photoPreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />:<span style={{ fontSize:32 }}>{form.emoji}</span>}
            </div>
            <div>
              <input type="file" id="photo-up" accept="image/*" style={{ display:'none' }} onChange={e=>{ const f=e.target.files[0]; if(f){setPhotoFile(f);setPhotoPreview(URL.createObjectURL(f))} }} />
              <button className="btn btn-secondary btn-sm" onClick={()=>document.getElementById('photo-up').click()}>📸 Foto</button>
            </div>
          </div>
          <Field label="Anel *">
            <div style={{ display:'flex', gap:4 }}>
              <select className="input" style={{ width:72 }} value={anilhaPais} onChange={e=>setAnilhaPais(e.target.value)}>{paises.map(p=><option key={p}>{p}</option>)}</select>
              <select className="input" style={{ width:88 }} value={anilhaAno} onChange={e=>setAnilhaAno(e.target.value)}>{anos.map(a=><option key={a}>{a}</option>)}</select>
              <input className="input" style={{ flex:1 }} placeholder="00000" maxLength={5} value={anilhaNum} onChange={e=>setAnilhaNum(e.target.value.replace(/[^0-9]/g,''))} />
            </div>
            <div style={{ fontSize:11, color:'#2DD4A7', marginTop:4 }}>🏷️ {anilhaPais}-{anilhaAno}-{(anilhaNum||'?????').padStart(5,'0')}</div>
          </Field>
          <Field label="Nome *"><input className="input" placeholder="Nome do pombo" value={form.nome} onChange={e=>sf('nome',e.target.value)} /></Field>
          <Field label="Sexo"><select className="input" value={form.sexo} onChange={e=>sf('sexo',e.target.value)}><option value="M">♂ Macho</option><option value="F">♀ Fêmea</option></select></Field>
          <Field label="Estado"><select className="input" value={form.estado} onChange={e=>sf('estado',e.target.value)}>{['ativo','reproducao','lesionado','inativo'].map(s=><option key={s}>{s}</option>)}</select></Field>
          <Field label="Situação"><select className="input" value={form.estado_ext} onChange={e=>sf('estado_ext',e.target.value)}>{ESTADOS_EXT.map(s=><option key={s}>{s}</option>)}</select></Field>
          <Field label="Cor">
            <input className="input" list="cores-pombo-list" placeholder="Ex: Azul barrado" value={form.cor} onChange={e=>sf('cor',e.target.value)} />
            <datalist id="cores-pombo-list">{CORES_POMBO.map(c=><option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Peso (g)"><input className="input" type="number" placeholder="420" value={form.peso} onChange={e=>sf('peso',e.target.value)} /></Field>
          <Field label="Pombal"><select className="input" value={form.pombal} onChange={e=>sf('pombal',e.target.value)}><option value="">— Sem pombal —</option>{pombais.map(pb=><option key={pb.id}>{pb.nome}</option>)}</select></Field>
          <div className="col-2"><Field label="Especialidades"><div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>{ESPS.map(([v,l])=><button key={v} type="button" className={`chip${form.esp.includes(v)?' active':''}`} onClick={()=>toggleEsp(v)} style={{ color:form.esp.includes(v)?'#fff':ESP_COR[v] }}>{ESP_ICON[v]} {l}</button>)}</div></Field></div>
          <Field label="Pai">
            <select className="input" style={{ marginBottom:4 }} value="" onChange={e=>{ if(e.target.value) sf('pai',e.target.value) }}>
              <option value="">— Seleccionar do efectivo —</option>
              {pombos.filter(p=>p.sexo==='M'&&p.id!==selected?.id).map(p=><option key={p.id} value={p.anilha}>{p.nome} ({p.anilha})</option>)}
            </select>
            <input className="input" style={{ fontSize:11 }} placeholder="PT-0000-00000" value={form.pai} onChange={e=>sf('pai',e.target.value.toUpperCase())} />
          </Field>
          <Field label="Mãe">
            <select className="input" style={{ marginBottom:4 }} value="" onChange={e=>{ if(e.target.value) sf('mae',e.target.value) }}>
              <option value="">— Seleccionar do efectivo —</option>
              {pombos.filter(p=>p.sexo==='F'&&p.id!==selected?.id).map(p=><option key={p.id} value={p.anilha}>{p.nome} ({p.anilha})</option>)}
            </select>
            <input className="input" style={{ fontSize:11 }} placeholder="PT-0000-00000" value={form.mae} onChange={e=>sf('mae',e.target.value.toUpperCase())} />
          </Field>
          <div className="col-2" style={{ borderTop:'1px solid #1e3050', paddingTop:12, marginTop:4 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#94a3b8', marginBottom:10 }}>📦 Origem / Aquisição</div>
          </div>
          <Field label="Criador / Origem"><input className="input" placeholder="Nome do criador" value={form.criador} onChange={e=>sf('criador',e.target.value)} /></Field>
          <Field label="Data de Aquisição"><input className="input" type="date" value={form.data_aquisicao} onChange={e=>sf('data_aquisicao',e.target.value)} /></Field>
          <Field label="Valor de Aquisição (€)"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.valor_aquisicao} onChange={e=>sf('valor_aquisicao',e.target.value)} /></Field>
          <Field label="Obs. Aquisição"><input className="input" placeholder="Notas..." value={form.obs_aquisicao} onChange={e=>sf('obs_aquisicao',e.target.value)} /></Field>
          {form.estado_ext !== 'proprio' && (
            <>
              <div className="col-2" style={{ borderTop:'1px solid #1e3050', paddingTop:12, marginTop:4 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#D4AF37', marginBottom:10 }}>🎯 Destino ({form.estado_ext})</div>
              </div>
              <Field label="Destino"><input className="input" placeholder="Nome do destinatário" value={form.destino_nome} onChange={e=>sf('destino_nome',e.target.value)} /></Field>
              <Field label="Data"><input className="input" type="date" value={form.destino_data} onChange={e=>sf('destino_data',e.target.value)} /></Field>
              <Field label="Valor (€)"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.destino_valor} onChange={e=>sf('destino_valor',e.target.value)} /></Field>
              <Field label="Observações"><input className="input" placeholder="Notas..." value={form.destino_obs} onChange={e=>sf('destino_obs',e.target.value)} /></Field>
            </>
          )}
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e=>sf('obs',e.target.value)} /></Field></div>
        </div>
      </Modal>

      {/* ══ MODAL DETAIL ══════════════════════════════════════════════════════ */}
      {selected && (
        <Modal open={modal==='detail'} onClose={close} title={`${selected.emoji||'🐦'} ${selected.nome}`} wide
          footer={
            <div style={{ display:'flex', gap:8, width:'100%', flexWrap:'wrap' }}>
              <button className="btn btn-danger btn-sm" onClick={()=>{ close(); setConfirm(selected) }}>🗑️</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>{ close(); nav?.('saude',{prefillPomboId:selected.id}) }}>🏥 Saúde</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>{ close(); nav?.('pedigree',{pomboId:selected.id}) }}>🌳 Pedigree</button>
              <div style={{ flex:1 }} />
              <button className="btn btn-secondary" onClick={close}>Fechar</button>
              <button className="btn btn-primary" onClick={()=>openEdit(selected)}>✏️ Editar</button>
            </div>
          }>

          {/* ── HERO CARD ── */}
          {(()=>{
            const c = classificarPombo(selected)
            const espPrincipal = (selected.esp||[])[0]
            const corEsp = espPrincipal ? ESP_COR[espPrincipal] : '#4C8DFF'
            const idade = idadeDoPombo(selected.anilha)
            return (
              <div style={{ borderRadius:16, overflow:'hidden', marginBottom:16, position:'relative', background:'#060F1A' }}>
                {/* Foto hero */}
                <div style={{ height:200, position:'relative', background:`linear-gradient(160deg,#0A1A2E,#112036)` }}>
                  {selected.foto_url
                    ? <img src={selected.foto_url} alt={selected.nome} style={{ width:'100%', height:'100%', objectFit:'cover', opacity:.9 }}/>
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:80 }}>{selected.emoji||'🐦'}</div>
                  }
                  {/* gradiente por baixo */}
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:100, background:'linear-gradient(to top, #060F1A, transparent)' }}/>
                  {/* badges topo */}
                  <div style={{ position:'absolute', top:12, left:12, display:'flex', gap:6 }}>
                    <Badge v={statusBadge[selected.estado]}>{selected.estado}</Badge>
                    {selected.estado_ext&&selected.estado_ext!=='proprio'&&<Badge v={extBadge[selected.estado_ext]||'gray'}>{selected.estado_ext}</Badge>}
                  </div>
                  {/* sexo */}
                  <div style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,.6)', borderRadius:8, padding:'4px 10px', fontSize:13, fontWeight:700, color:'#fff' }}>
                    {selected.sexo==='M'?'♂ Macho':'♀ Fêmea'}
                  </div>
                  {/* nome + anilha sobre foto */}
                  <div style={{ position:'absolute', bottom:12, left:16, right:16 }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:900, color:'#fff', lineHeight:1.1, textShadow:'0 2px 8px rgba(0,0,0,.8)' }}>{selected.nome}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, color:'#D4AF37', marginTop:2 }}>{selected.anilha}</div>
                  </div>
                </div>
                {/* Info rápida */}
                <div style={{ padding:'12px 16px', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', borderBottom:'1px solid #1B2D52' }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:c.cor }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:c.cor }}/>
                    {c.tag}
                  </div>
                  {idade!==null&&<span style={{ fontSize:11, color:'#7A8699' }}>· {idade} {idade===1?'ano':'anos'}</span>}
                  {selected.cor&&<span style={{ fontSize:11, color:'#7A8699' }}>· {selected.cor}</span>}
                  {selected.pombal&&<span style={{ fontSize:11, color:'#7A8699' }}>· 🏠 {selected.pombal}</span>}
                  <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
                    {(selected.esp||[]).map(e=><span key={e} style={{ fontSize:11, fontWeight:700, color:ESP_COR[e], background:`${ESP_COR[e]}18`, border:`1px solid ${ESP_COR[e]}40`, padding:'2px 8px', borderRadius:20 }}>{ESP_ICON[e]} {e}</span>)}
                  </div>
                </div>
                {/* Botão partilhar */}
                <div style={{ padding:'8px 16px', display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button onClick={()=>{ setPomboPartilha(selected); setModalPartilha(true) }} style={{ background:'rgba(45,212,167,.08)', border:'1px solid rgba(45,212,167,.2)', borderRadius:8, padding:'6px 14px', fontSize:11, fontWeight:600, color:'#2DD4A7', cursor:'pointer', fontFamily:'inherit' }}>
                    🌐 Partilhar na Comunidade
                  </button>
                  <button onClick={()=>{ nav?.('pedigree',{pomboId:selected.id}) }} style={{ background:'rgba(212,175,55,.08)', border:'1px solid rgba(212,175,55,.2)', borderRadius:8, padding:'6px 14px', fontSize:11, fontWeight:600, color:'#D4AF37', cursor:'pointer', fontFamily:'inherit' }}>
                    🌳 Pedigree
                  </button>
                </div>
              </div>
            )
          })()}

          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:14 }}>
            {[
              {v:selected.provas??0, l:'Provas', cor:'#D4AF37'},
              {v:(selected.percentil??0)+'%', l:'Percentil', cor:'#2DD4A7'},
              {v:(selected.forma??50)+'%', l:'Forma', cor:'#4C8DFF'},
              {v:loadingDetail?'…':kmTotalDetail>0?kmTotalDetail+'km':'—', l:'km Total', cor:'#A855F7'},
              {v:loadingDetail?'…':melhorPos?melhorPos.posicao+'º':'—', l:'Melhor Pos.', cor:'#F59E0B'},
            ].map(({v,l,cor})=>(
              <div key={l} style={{ textAlign:'center', background:'#101F40', borderRadius:10, padding:'8px 4px' }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:cor }}>{v}</div>
                <div style={{ fontSize:9, color:'#7A8699', marginTop:1 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* tabs do detalhe */}
          <div style={{ display:'flex', gap:4, background:'#101F40', borderRadius:8, padding:4, marginBottom:14, overflowX:'auto' }}>
            {[['info','📋 Info'],['provas','🏆 Provas'],['saude','🏥 Saúde'],['familia','🌳 Família'],['treinos','🎯 Treinos']].map(([k,l])=>(
              <button key={k} onClick={()=>setTabDetail(k)} style={{ flex:1, padding:'6px 8px', borderRadius:6, fontSize:11, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tabDetail===k?'#1E5FD9':'none', color:tabDetail===k?'#fff':'#94a3b8' }}>{l}</button>
            ))}
          </div>

          {loadingDetail ? <div style={{ display:'flex', justifyContent:'center', padding:30 }}><Spinner /></div> : (
            <>
              {/* ── INFO ── */}
              {tabDetail==='info'&&(
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {/* pedigree */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[['Pai',pedigreeInfo?.pai,selected.pai],['Mãe',pedigreeInfo?.mae,selected.mae]].map(([lbl,ped,raw])=>(
                      <div key={lbl} style={{ background:'#101F40', borderRadius:10, padding:'10px 12px' }}>
                        <div style={{ fontSize:10, color:'#7A8699', marginBottom:4 }}>{lbl}</div>
                        {ped ? (
                          <div>
                            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#D4AF37' }}>{ped.anilha}</div>
                            <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{ped.nome}</div>
                            {ped.cor&&<div style={{ fontSize:10, color:'#7A8699' }}>{ped.cor}</div>}
                            {ped.percentil>0&&<div style={{ fontSize:10, color:'#2DD4A7' }}>Percentil: {ped.percentil}%</div>}
                          </div>
                        ) : <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'#475569' }}>{raw||'—'}</div>}
                      </div>
                    ))}
                  </div>
                  {/* origem */}
                  {(selected.criador||selected.data_aquisicao||selected.valor_aquisicao)&&(
                    <div style={{ background:'#101F40', borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', marginBottom:6 }}>📦 ORIGEM</div>
                      {selected.criador&&<div style={{ fontSize:12, color:'#cbd5e1' }}>Criador: {selected.criador}</div>}
                      {selected.data_aquisicao&&<div style={{ fontSize:12, color:'#cbd5e1' }}>Data: {new Date(selected.data_aquisicao).toLocaleDateString('pt-PT')}</div>}
                      {selected.valor_aquisicao&&<div style={{ fontSize:12, color:'#D4AF37' }}>Valor: {selected.valor_aquisicao}€</div>}
                      {selected.obs_aquisicao&&<div style={{ fontSize:11, color:'#7A8699' }}>{selected.obs_aquisicao}</div>}
                    </div>
                  )}
                  {/* destino */}
                  {selected.estado_ext&&selected.estado_ext!=='proprio'&&selected.destino_nome&&(
                    <div style={{ background:'rgba(234,179,8,.08)', border:'1px solid rgba(234,179,8,.2)', borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'#D4AF37', marginBottom:6 }}>🎯 DESTINO — {selected.estado_ext.toUpperCase()}</div>
                      <div style={{ fontSize:12, color:'#cbd5e1' }}>{selected.destino_nome}</div>
                      {selected.destino_data&&<div style={{ fontSize:12, color:'#94a3b8' }}>{new Date(selected.destino_data).toLocaleDateString('pt-PT')}</div>}
                      {selected.destino_valor&&<div style={{ fontSize:12, color:'#D4AF37' }}>💶 {selected.destino_valor}€</div>}
                    </div>
                  )}
                  {selected.obs&&<div style={{ background:'#101F40', borderRadius:10, padding:'10px 12px' }}><div style={{ fontSize:10, color:'#7A8699', marginBottom:4 }}>OBSERVAÇÕES</div><div style={{ fontSize:13, color:'#cbd5e1' }}>{selected.obs}</div></div>}
                  {/* evolução peso */}
                  <div style={{ background:'#101F40', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>📈 Evolução de Peso</div>
                    <PesoChart registos={historicoSaude} />
                  </div>
                </div>
              )}

              {/* ── PROVAS ── */}
              {tabDetail==='provas'&&(
                <div>
                  {/* resumo */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
                    {[
                      {v:kmTotalDetail+'km', l:'km Percorridos', cor:'#A855F7'},
                      {v:velMedia?velMedia+' km/h':'—', l:'Vel. Média', cor:'#2DD4A7'},
                      {v:melhorPos?melhorPos.posicao+'º':'—', l:'Melhor Result.', cor:'#D4AF37'},
                    ].map(({v,l,cor})=>(
                      <div key={l} style={{ textAlign:'center', background:'#101F40', borderRadius:10, padding:'10px 6px' }}>
                        <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:cor }}>{v}</div>
                        <div style={{ fontSize:9, color:'#7A8699' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {historicoProvas.length===0
                    ?<div style={{ textAlign:'center', color:'#7A8699', padding:'24px 0', fontSize:13 }}>Sem provas registadas para este pombo</div>
                    :<div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {historicoProvas.map(r=>{
                          const pct = r.posicao&&r.races?.n_pombos ? Math.round((r.posicao/r.races.n_pombos)*100) : null
                          return (
                            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#101F40', borderRadius:10 }}>
                              <div style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:18, color:r.posicao===1?'#D4AF37':r.posicao<=3?'#b45309':'#94a3b8', width:28, textAlign:'center', flexShrink:0 }}>{r.posicao?r.posicao+'º':'—'}</div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:12, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.races?.nome||'Prova'}</div>
                                <div style={{ fontSize:10, color:'#7A8699' }}>{r.races?.dist||0}km · {r.races?.local_solta||'—'} · {r.races?.data_reg?new Date(r.races.data_reg).toLocaleDateString('pt-PT',''):''}</div>
                              </div>
                              <div style={{ textAlign:'right', flexShrink:0 }}>
                                {r.velocidade&&<div style={{ fontSize:11, color:'#2DD4A7', fontWeight:600 }}>{r.velocidade}km/h</div>}
                                {pct&&<div style={{ fontSize:10, color:'#7A8699' }}>top {pct}%</div>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                  }
                </div>
              )}

              {/* ── SAÚDE ── */}
              {tabDetail==='saude'&&(
                <div>
                  <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
                    <button className="btn btn-primary btn-sm" onClick={()=>{ close(); nav?.('saude',{prefillPomboId:selected.id}) }}>＋ Novo Registo</button>
                  </div>
                  <div style={{ background:'#101F40', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>📈 Evolução de Peso</div>
                    <PesoChart registos={historicoSaude} />
                  </div>
                  {historicoSaude.length===0
                    ?<div style={{ textAlign:'center', color:'#7A8699', padding:'16px 0', fontSize:13 }}>Sem registos de saúde</div>
                    :<div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {historicoSaude.map(s=>(
                          <div key={s.id} style={{ display:'flex', gap:10, padding:'8px 12px', background:'#101F40', borderRadius:10, alignItems:'flex-start' }}>
                            <div style={{ fontSize:16, flexShrink:0 }}>{s.apt===false||s.aptidao==='inapto'?'🔴':'🟢'}</div>
                            <div style={{ flex:1 }}>
                              {s.fase&&<div style={{ fontSize:11, fontWeight:600, color:'#fff' }}>{s.fase}</div>}
                              {s.peso&&<div style={{ fontSize:11, color:'#4C8DFF' }}>⚖️ {s.peso}g</div>}
                              {s.obs&&<div style={{ fontSize:11, color:'#7A8699' }}>{s.obs}</div>}
                            </div>
                            <div style={{ fontSize:10, color:'#475569', flexShrink:0 }}>{s.created_at?new Date(s.created_at).toLocaleDateString('pt-PT'):''}</div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

              {/* ── FAMÍLIA ── */}
              {tabDetail==='familia'&&(
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {/* pais */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#7A8699', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>👨‍👩 Pais</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[['Pai ♂',pedigreeInfo?.pai,selected.pai],['Mãe ♀',pedigreeInfo?.mae,selected.mae]].map(([lbl,ped,raw])=>(
                        <div key={lbl} style={{ background:'#101F40', borderRadius:10, padding:'10px 12px' }}>
                          <div style={{ fontSize:10, color:'#7A8699', marginBottom:4 }}>{lbl}</div>
                          {ped?<><div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#D4AF37' }}>{ped.anilha}</div><div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{ped.nome}</div>{ped.percentil>0&&<div style={{ fontSize:10, color:'#2DD4A7' }}>{ped.percentil}%</div>}</>:<div style={{ fontSize:11, color:'#475569' }}>{raw||'—'}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* irmãos */}
                  {irmãos.length>0&&(
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#7A8699', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>🐦 Irmãos ({irmãos.length})</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {irmãos.map(p=>(
                          <div key={p.id} onClick={()=>openDetail(p)} style={{ display:'flex', alignItems:'center', gap:6, background:'#101F40', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:12 }}>
                            <span>{p.emoji||'🐦'}</span>
                            <div>
                              <div style={{ color:'#fff', fontWeight:500 }}>{p.nome}</div>
                              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#D4AF37' }}>{p.anilha}</div>
                            </div>
                            {p.percentil>0&&<span style={{ color:'#2DD4A7', fontSize:11, fontWeight:700 }}>{p.percentil}%</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* descendentes */}
                  {descendentes.length>0&&(
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#7A8699', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>🐣 Descendentes ({descendentes.length})</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {descendentes.map(p=>(
                          <div key={p.id} onClick={()=>openDetail(p)} style={{ display:'flex', alignItems:'center', gap:6, background:'#101F40', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:12 }}>
                            <span>{p.emoji||'🐦'}</span>
                            <div>
                              <div style={{ color:'#fff', fontWeight:500 }}>{p.nome}</div>
                              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#D4AF37' }}>{p.anilha}</div>
                            </div>
                            {p.percentil>0&&<span style={{ color:'#2DD4A7', fontSize:11, fontWeight:700 }}>{p.percentil}%</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {irmãos.length===0&&descendentes.length===0&&<div style={{ textAlign:'center', color:'#475569', padding:'16px 0', fontSize:13 }}>Sem familiares registados no efectivo</div>}
                  <button className="btn btn-secondary btn-sm" style={{ alignSelf:'flex-start' }} onClick={()=>{ close(); nav?.('pedigree',{pomboId:selected.id}) }}>🌳 Ver Pedigree Completo →</button>
                </div>
              )}

              {/* ── TREINOS ── */}
              {tabDetail==='treinos'&&(
                <div>
                  {historicoTreinos.length===0
                    ?<div style={{ textAlign:'center', color:'#7A8699', padding:'24px 0', fontSize:13 }}>Sem treinos registados para este pombo</div>
                    :(()=>{
                        const comVel=historicoTreinos.filter(t=>t.velocidade)
                        const velM=comVel.length?Math.round(comVel.reduce((s,t)=>s+t.velocidade,0)/comVel.length):null
                        return (
                          <div>
                            <div style={{ display:'flex', gap:16, marginBottom:12 }}>
                              <div><span style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:'#4C8DFF' }}>{historicoTreinos.length}</span> <span style={{ fontSize:11, color:'#7A8699' }}>treino(s)</span></div>
                              {velM&&<div><span style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:'#2DD4A7' }}>{velM}</span> <span style={{ fontSize:11, color:'#7A8699' }}>km/h média</span></div>}
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                              {historicoTreinos.map(tr=>(
                                <div key={tr.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#101F40', borderRadius:10 }}>
                                  <div style={{ flex:1, fontSize:12, color:'#cbd5e1', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tr.local||'—'}</div>
                                  {tr.dist&&<span style={{ fontSize:11, color:'#7A8699' }}>{tr.dist}km</span>}
                                  {tr.velocidade&&<span style={{ fontSize:11, color:'#2DD4A7', fontFamily:"'Space Mono',monospace" }}>{tr.velocidade}km/h</span>}
                                  <span style={{ fontSize:10, color:'#475569' }}>{new Date(tr.data_reg).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'})}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()
                  }
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      {/* ══ CONFIRM ═══════════════════════════════════════════════════════════ */}
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar pombo"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar "{confirm?.nome}"?</p>
      </Modal>
    </div>
  )
}
