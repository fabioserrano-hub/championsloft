import { useState, useEffect, useCallback } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { verificarConquistas } from '../components/Conquistas'

const anoAtual = new Date().getFullYear()
const anos = Array.from({ length: 10 }, (_, i) => anoAtual - i)
const paises = ['PT', 'ES', 'FR', 'BE', 'NL', 'DE', 'IT', 'GB', 'PL', 'CZ']
const CORES_POMBO = ['Azul barrado', 'Azul xadrezado', 'Azul sem barras', 'Vermelho barrado', 'Vermelho xadrezado', 'Vermelho sem barras', 'Amarelo', 'Branco', 'Branco com marcas', 'Preto', 'Cinzento', 'Castanho', 'Alazão', 'Meado', 'Tigrado', 'Pied azul', 'Pied vermelho', 'Pied branco', 'Recessivo vermelho', 'Recessivo amarelo']
const FILTROS = [{ id: 'todos', label: 'Todos' }, { id: 'M', label: '♂ Machos' }, { id: 'F', label: '♀ Fêmeas' }]
const ESTADOS_EXT = ['proprio', 'emprestado', 'cedido', 'vendido', 'oferecido', 'falecido']
const CORES_COLUMBOFILIA = ['Azul barrado', 'Azul xadrezado', 'Azul sem barras', 'Vermelho barrado', 'Vermelho xadrezado', 'Amarelo', 'Branco', 'Preto', 'Cinzento', 'Castanho', 'Beige', 'Pied azul', 'Pied vermelho', 'Pied branco', 'Recessivo vermelho', 'Recessivo amarelo']
const ESPS = [['velocidade', 'Velocidade'], ['meio_fundo', 'Meio-Fundo'], ['fundo', 'Fundo'], ['grande_fundo', 'G.Fundo']]
const statusBadge = { ativo: 'green', reproducao: 'yellow', lesionado: 'red', inativo: 'gray' }
const extBadge = { proprio: 'green', emprestado: 'yellow', cedido: 'blue', vendido: 'gray', oferecido: 'blue', falecido: 'red' }
const EMPTY = { anilha: '', nome: '', sexo: 'M', cor: '', peso: '', esp: ['velocidade'], estado: 'ativo', estado_ext: 'proprio', pombal: '', pai: '', mae: '', obs: '', emoji: '🐦', criador: '', data_aquisicao: '', valor_aquisicao: '', obs_aquisicao: '', destino_nome: '', destino_data: '', destino_valor: '', destino_obs: '' }

// Idade aproximada extraída do ano embutido na anilha (formato PT-24-0184 → ano 2024)
function idadeDoPombo(anilha) {
  const m = anilha?.match(/-(\d{2})-/)
  if (!m) return null
  const ano2d = parseInt(m[1])
  const anoNasc = ano2d > 50 ? 1900 + ano2d : 2000 + ano2d
  return anoAtual - anoNasc
}

// Classificação automática: o que este pombo está "pronto" a fazer agora, com base nos dados já existentes
export function classificarPombo(p) {
  if (p.estado === 'lesionado') return { tag: 'Lesionado', cor: '#f87171', prioridade: 0 }
  const idade = idadeDoPombo(p.anilha)
  const percentil = p.percentil || 0
  const provas = p.provas || 0
  if (provas >= 3 && percentil > 0 && percentil < 35) return { tag: 'Em queda', cor: '#f87171', prioridade: 1 }
  if (idade !== null && idade >= 1 && percentil >= 65 && provas >= 3) return { tag: 'Pronto a reproduzir', cor: '#D4AF37', prioridade: 3 }
  if (p.estado === 'ativo' && (p.forma || 50) >= 60) return { tag: 'Pronto a competir', cor: '#2DD4A7', prioridade: 3 }
  if (p.estado === 'reproducao') return { tag: 'Em reprodução', cor: '#c084fc', prioridade: 3 }
  return { tag: 'Em repouso', cor: '#7A8699', prioridade: 4 }
}

function PesoChart({ registos }) {
  const pontos = registos.filter(r => r.peso).slice(0, 10).reverse()
  if (pontos.length < 2) {
    return <div style={{ fontSize: 12, color: '#7A8699', textAlign: 'center', padding: '16px 0' }}>Sem dados suficientes de peso (mínimo 2 registos)</div>
  }
  const pesos = pontos.map(p => p.peso)
  const min = Math.min(...pesos) - 10
  const max = Math.max(...pesos) + 10
  const w = 280, h = 70, pad = 8
  const xStep = (w - pad * 2) / (pontos.length - 1)
  const coords = pesos.map((p, i) => {
    const x = pad + i * xStep
    const y = h - pad - ((p - min) / (max - min)) * (h - pad * 2)
    return [x, y]
  })
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0]},${c[1]}`).join(' ')
  const areaPath = `${path} L${coords[coords.length - 1][0]},${h - pad} L${coords[0][0]},${h - pad} Z`

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#pesoGrad)" />
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth="2" />
        {coords.map((c, i) => <circle key={i} cx={c[0]} cy={c[1]} r="2.5" fill="#60a5fa" />)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#7A8699', marginTop: 4 }}>
        <span>{pesos[0]}g</span>
        <span style={{ color: '#94a3b8' }}>{pontos.length} registos</span>
        <span>{pesos[pesos.length - 1]}g</span>
      </div>
    </div>
  )
}

export default function Pombos({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()
  const { user } = useAuth()
  const [pombos, setPombos] = useState([])
  const [pombais, setPombais] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [tabPrincipal, setTabPrincipal] = useState('efectivo')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [historicoProvas, setHistoricoProvas] = useState([])
  const [historicoSaude, setHistoricoSaude] = useState([])
  const [historicoTreinos, setHistoricoTreinos] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [anilhaPais, setAnilhaPais] = useState('PT')
  const [anilhaAno, setAnilhaAno] = useState(String(anoAtual))
  const [anilhaNum, setAnilhaNum] = useState('')
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleEsp = (e) => sf('esp', form.esp.includes(e) ? form.esp.filter(x => x !== e) : [...form.esp, e])

  const load = useCallback(async () => {
    setLoading(true)
    try { const [p, pb] = await Promise.all([db.getPombos(), db.getPombais()]); setPombos(p); setPombais(pb) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const efectivo = pombos.filter(p => !p.estado_ext || p.estado_ext === 'proprio')
  const externos = pombos.filter(p => p.estado_ext && p.estado_ext !== 'proprio' && p.estado_ext !== 'vendido' && p.estado_ext !== 'oferecido' && p.estado_ext !== 'falecido')
  const vendidos = pombos.filter(p => p.estado_ext === 'vendido' || p.estado_ext === 'oferecido')
  const listaActual = tabPrincipal === 'efectivo' ? efectivo : tabPrincipal === 'externos' ? externos : vendidos

  const filtered = listaActual.filter(p => {
    const ms = !search || p.nome?.toLowerCase().includes(search.toLowerCase()) || p.anilha?.toLowerCase().includes(search.toLowerCase())
    const mf = tabPrincipal !== 'efectivo' || filtro === 'todos' || p.sexo === filtro || p.estado === filtro || (p.esp || []).includes(filtro)
    return ms && mf
  })

  const openNew = () => { setAnilhaPais('PT'); setAnilhaAno(String(anoAtual)); setAnilhaNum(''); setForm({ ...EMPTY, pombal: pombais[0]?.nome || '' }); setPhotoFile(null); setPhotoPreview(null); setSelected(null); setModal('form') }
  const openEdit = async (p) => {
    setSelected(p)
    // Tentar carregar pais do pedigree guardado
    let paiAnilha = p.pai || ''
    let maeAnilha = p.mae || ''
    try {
      const ped = await db.getPedigree(p.id)
      if (ped?.pai?.anilha) paiAnilha = ped.pai.anilha
      if (ped?.mae?.anilha) maeAnilha = ped.mae.anilha
    } catch(e) {}
    setForm({ anilha: p.anilha || '', nome: p.nome || '', sexo: p.sexo || 'M', cor: p.cor || '', peso: p.peso || '', esp: p.esp || ['velocidade'], estado: p.estado || 'ativo', estado_ext: p.estado_ext || 'proprio', pombal: p.pombal || '', pai: paiAnilha, mae: maeAnilha, obs: p.obs || '', emoji: p.emoji || '🐦', criador: p.criador || '', data_aquisicao: p.data_aquisicao || '', valor_aquisicao: p.valor_aquisicao || '', obs_aquisicao: p.obs_aquisicao || '', destino_nome: p.destino_nome || '', destino_data: p.destino_data || '', destino_valor: p.destino_valor || '', destino_obs: p.destino_obs || '' })
    setPhotoPreview(p.foto_url || null); setPhotoFile(null); setModal('form')
  }

  const [pedigreeInfo, setPedigreeInfo] = useState(null)

  const openDetail = async (p) => {
    setSelected(p); setModal('detail'); setLoadingDetail(true); setPedigreeInfo(null)
    try {
      const [provasRes, saudeRes, treinosRes, pedRes] = await Promise.all([
        supabase.from('race_results').select('*, races(nome,data_reg,dist,local_solta)').eq('pigeon_id', p.id).order('created_at', { ascending: false }).limit(8),
        supabase.from('health').select('*').eq('pigeon_id', p.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('treinos').select('*').contains('pombos_ids', [p.id]).order('data_reg', { ascending: false }),
        db.getPedigree(p.id).catch(() => null),
      ])
      setHistoricoProvas(provasRes.data || [])
      setHistoricoSaude(saudeRes.data || [])
      setHistoricoTreinos(treinosRes.data || [])
      // Pedigree: priorizar dados guardados em Supabase
      if (pedRes?.pai?.nome || pedRes?.mae?.nome) {
        setPedigreeInfo({ pai: pedRes.pai || null, mae: pedRes.mae || null })
      } else if (p.pai || p.mae) {
        // Fallback: campos pai/mae da tabela pigeons
        const pai = pombos.find(x => x.anilha === p.pai) || pombos.find(x => x.nome === p.pai)
        const mae = pombos.find(x => x.anilha === p.mae) || pombos.find(x => x.nome === p.mae)
        if (pai || mae) setPedigreeInfo({ pai: pai ? { anilha: pai.anilha, nome: pai.nome, cor: pai.cor } : null, mae: mae ? { anilha: mae.anilha, nome: mae.nome, cor: mae.cor } : null })
      }
    } catch (e) { setHistoricoProvas([]); setHistoricoSaude([]); setHistoricoTreinos([]) }
    finally { setLoadingDetail(false) }
  }

  const close = () => { setModal(null); setSelected(null); setPhotoFile(null); setPhotoPreview(null); setHistoricoProvas([]); setHistoricoSaude([]); setHistoricoTreinos([]); setPedigreeInfo(null) }

  const save = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório', 'warn'); return }
    setSaving(true)
    try {
      const anilhaFinal = anilhaNum ? `${anilhaPais}-${anilhaAno}-${anilhaNum.padStart(5, '0')}` : form.anilha.trim()
      const payload = { anilha: anilhaFinal, nome: form.nome.trim(), sexo: form.sexo, cor: form.cor, peso: form.peso ? parseInt(form.peso) : null, esp: form.esp, estado: form.estado, estado_ext: form.estado_ext, pombal: form.pombal, pai: form.pai, mae: form.mae, obs: form.obs, emoji: form.emoji, criador: form.criador, data_aquisicao: form.data_aquisicao || null, valor_aquisicao: form.valor_aquisicao ? parseFloat(form.valor_aquisicao) : null, obs_aquisicao: form.obs_aquisicao, destino_nome: form.destino_nome, destino_data: form.destino_data || null, destino_valor: form.destino_valor ? parseFloat(form.destino_valor) : null, destino_obs: form.destino_obs, provas: selected?.provas || 0, percentil: selected?.percentil || 0, forma: selected?.forma || 50 }
      let saved
      if (selected) saved = await db.updatePombo(selected.id, payload)
      else saved = await db.createPombo(payload)
      if (photoFile && saved?.id && user?.id) {
        try { const url = await db.uploadFoto(user.id, saved.id, photoFile); await db.updatePombo(saved.id, { foto_url: url }) }
        catch (e) { toast('Foto não guardada', 'warn') }
      }
      toast(selected ? 'Actualizado!' : form.nome + ' adicionado!', 'ok'); close(); load()
      // Verificar conquistas após criar pombo
      if (!selected && user?.id) {
        const { data: todosPombos } = await supabase.from('pigeons').select('id').eq('user_id', user.id)
        const nPombos = todosPombos?.length || 0
        const novas = await verificarConquistas(user.id, { nPombos })
        if (novas.length > 0) toast(`🏅 Nova conquista desbloqueada!`, 'ok')
      }
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deletePombo(confirm.id); toast('Eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const irParaSaude = (pombo) => { close(); nav?.('saude', { prefillPomboId: pombo.id }) }
  const irParaPedigree = (pombo) => { close(); nav?.('pedigree', { pomboId: pombo.id }) }

  const PomboCard = ({ p }) => {
    const fc = (p.forma || 50) >= 80 ? '#2DD4A7' : (p.forma || 50) >= 60 ? '#D4AF37' : '#f87171'
    const classificacao = classificarPombo(p)
    return (
      <div className="pombo-card" onClick={() => openDetail(p)} style={classificacao.prioridade <= 1 ? { borderColor: classificacao.cor + '44' } : undefined}>
        <div className="pombo-photo" style={{ height: 160 }}>
          {p.foto_url ? <img src={p.foto_url} alt={p.nome} /> : p.emoji}
          <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', borderRadius: 6, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>{p.sexo === 'M' ? '♂' : '♀'}</div>
          {p.estado_ext && p.estado_ext !== 'proprio' && <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,.7)', borderRadius: 6, padding: '2px 6px', fontSize: 10, fontWeight: 700, color: '#D4AF37' }}>{p.estado_ext.toUpperCase()}</div>}
        </div>
        <div className="pombo-info">
          <div className="pombo-anel">{p.anilha}</div>
          <div className="pombo-nome">{p.nome}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: classificacao.cor, marginBottom: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: classificacao.cor, flexShrink: 0 }} />
            {classificacao.tag}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="progress" style={{ flex: 1 }}><div className="progress-bar" style={{ width: `${p.forma || 50}%`, background: fc }} /></div>
            <span style={{ fontSize: 11, fontWeight: 700, color: fc }}>{p.forma || 50}%</span>
          </div>
        </div>
      </div>
    )
  }

  const ExternoCard = ({ p }) => (
    <div className="card card-p" style={{ cursor: 'pointer' }} onClick={() => openDetail(p)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: '#101F40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, overflow: 'hidden', flexShrink: 0 }}>
          {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.emoji || '🐦'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.nome}</div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#2DD4A7' }}>{p.anilha}</div>
          {p.destino_nome && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>→ {p.destino_nome}{p.destino_data ? ` · ${new Date(p.destino_data).toLocaleDateString('pt-PT')}` : ''}</div>}
          {p.destino_valor && <div style={{ fontSize: 11, color: '#D4AF37' }}>💶 {p.destino_valor}€</div>}
        </div>
        <Badge v={extBadge[p.estado_ext] || 'gray'}>{p.estado_ext}</Badge>
      </div>
    </div>
  )

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Pombos</div><div className="section-sub">{efectivo.length} no efectivo · {externos.length} externos</div></div>
        <button className="btn btn-primary" onClick={openNew}>＋ Novo Pombo</button>
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#101F40', borderRadius: 10, padding: 4, marginBottom: 16, overflowX: 'auto' }}>
        {[['efectivo', `🐦 Efectivo (${efectivo.length})`], ['externos', `🔄 Externos (${externos.length})`], ['vendidos', `💰 Vendidos (${vendidos.length})`]].map(([tab, label]) => (
          <button key={tab} onClick={() => setTabPrincipal(tab)} style={{ padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap', background: tabPrincipal === tab ? '#1E5FD9' : 'none', color: tabPrincipal === tab ? '#fff' : '#94a3b8' }}>{label}</button>
        ))}
      </div>

      {tabPrincipal === 'efectivo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <input className="input" placeholder="🔍 Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTROS.map(f => <button key={f.id} onClick={() => setFiltro(f.id)} className={`chip${filtro === f.id ? ' active' : ''}`} style={{ fontSize: 11 }}>{f.label}</button>)}
          </div>
          <div style={{ fontSize: 12, color: '#7A8699' }}>{filtered.length} pombo(s)</div>
        </div>
      )}

      {tabPrincipal !== 'efectivo' && (
        <input className="input" style={{ marginBottom: 16 }} placeholder="🔍 Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
      )}

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : filtered.length === 0 ? <EmptyState icon="🐦" title="Sem pombos" desc="Nenhum pombo nesta categoria" action={tabPrincipal === 'efectivo' ? <button className="btn btn-primary" onClick={openNew}>＋ Novo Pombo</button> : null} />
        : tabPrincipal === 'efectivo'
          ? (() => {
              const comPrioridade = filtered.map(p => ({ p, c: classificarPombo(p) }))
              const grupos = [
                { label: '🚨 Precisam de atenção', items: comPrioridade.filter(x => x.c.prioridade <= 1) },
                { label: '🕊️ Efectivo', items: comPrioridade.filter(x => x.c.prioridade > 1) },
              ].filter(g => g.items.length > 0)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {grupos.map(g => (
                    <div key={g.label}>
                      {grupos.length > 1 && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: '#7A8699', textTransform: 'uppercase', marginBottom: 10 }}>{g.label} ({g.items.length})</div>}
                      <div className="grid-auto">{g.items.map(({ p }) => <PomboCard key={p.id} p={p} />)}</div>
                    </div>
                  ))}
                </div>
              )
            })()
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{filtered.map(p => <ExternoCard key={p.id} p={p} />)}</div>
      }

      <Modal open={modal === 'form'} onClose={close} title={selected ? `✏️ ${selected.nome}` : '🐦 Novo Pombo'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? t('guardar') : 'Adicionar'}</button></>}>
        <div className="form-grid">
          <div className="col-2" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 14, border: '2px dashed #243860', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }} onClick={() => document.getElementById('photo-up').click()}>
              {photoPreview ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 32 }}>{form.emoji}</span>}
            </div>
            <div>
              <input type="file" id="photo-up" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) } }} />
              <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('photo-up').click()}>📸 Foto</button>
            </div>
          </div>
          <Field label="Anel *">
            <div style={{ display: 'flex', gap: 4 }}>
              <select className="input" style={{ width: 72 }} value={anilhaPais} onChange={e => setAnilhaPais(e.target.value)}>{paises.map(p => <option key={p}>{p}</option>)}</select>
              <select className="input" style={{ width: 88 }} value={anilhaAno} onChange={e => setAnilhaAno(e.target.value)}>{anos.map(a => <option key={a}>{a}</option>)}</select>
              <input className="input" style={{ flex: 1 }} placeholder="00000" maxLength={5} value={anilhaNum} onChange={e => setAnilhaNum(e.target.value.replace(/[^0-9]/g, ''))} />
            </div>
            <div style={{ fontSize: 11, color: '#2DD4A7', marginTop: 4 }}>🏷️ {anilhaPais}-{anilhaAno}-{(anilhaNum || '?????').padStart(5, '0')}</div>
          </Field>
          <Field label="Nome *"><input className="input" placeholder="Nome do pombo" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field>
          <Field label="Sexo"><select className="input" value={form.sexo} onChange={e => sf('sexo', e.target.value)}><option value="M">♂ Macho</option><option value="F">♀ Fêmea</option></select></Field>
          <Field label="Estado"><select className="input" value={form.estado} onChange={e => sf('estado', e.target.value)}>{['ativo', 'reproducao', 'lesionado', 'inativo'].map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Situação"><select className="input" value={form.estado_ext} onChange={e => sf('estado_ext', e.target.value)}>{ESTADOS_EXT.map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Cor">
            <input className="input" list="cores-pombo-list" placeholder="Ex: Azul barrado" value={form.cor} onChange={e => sf('cor', e.target.value)} />
            <datalist id="cores-pombo-list">{CORES_POMBO.map(c => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Peso (g)"><input className="input" type="number" placeholder="420" value={form.peso} onChange={e => sf('peso', e.target.value)} /></Field>
          <Field label="Pombal"><select className="input" value={form.pombal} onChange={e => sf('pombal', e.target.value)}><option value="">— Sem pombal —</option>{pombais.map(pb => <option key={pb.id}>{pb.nome}</option>)}</select></Field>
          <div className="col-2"><Field label="Especialidades"><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>{ESPS.map(([v, l]) => <button key={v} type="button" className={`chip${form.esp.includes(v) ? ' active' : ''}`} onClick={() => toggleEsp(v)}>{l}</button>)}</div></Field></div>
          <Field label="Pai (anilha ou seleccionar)">
            <select className="input" style={{ marginBottom:4 }} value="" onChange={e => { if(e.target.value) sf('pai', e.target.value) }}>
              <option value="">— Seleccionar do efectivo —</option>
              {pombos.filter(p => p.sexo === 'M' && p.id !== selected?.id).map(p => <option key={p.id} value={p.anilha}>{p.nome} ({p.anilha})</option>)}
            </select>
            <input className="input font-mono" style={{ fontSize:11 }} placeholder="PT-0000-00000" value={form.pai} onChange={e => sf('pai', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Mãe (anilha ou seleccionar)">
            <select className="input" style={{ marginBottom:4 }} value="" onChange={e => { if(e.target.value) sf('mae', e.target.value) }}>
              <option value="">— Seleccionar do efectivo —</option>
              {pombos.filter(p => p.sexo === 'F' && p.id !== selected?.id).map(p => <option key={p.id} value={p.anilha}>{p.nome} ({p.anilha})</option>)}
            </select>
            <input className="input font-mono" style={{ fontSize:11 }} placeholder="PT-0000-00000" value={form.mae} onChange={e => sf('mae', e.target.value.toUpperCase())} />
          </Field>
          <div className="col-2" style={{ borderTop: '1px solid #1e3050', paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>📦 Origem / Aquisição</div>
          </div>
          <Field label="Criador / Origem"><input className="input" placeholder="Nome do criador" value={form.criador} onChange={e => sf('criador', e.target.value)} /></Field>
          <Field label="Data de Aquisição"><input className="input" type="date" value={form.data_aquisicao} onChange={e => sf('data_aquisicao', e.target.value)} /></Field>
          <Field label="Valor de Aquisição (€)"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.valor_aquisicao} onChange={e => sf('valor_aquisicao', e.target.value)} /></Field>
          <Field label="Obs. Aquisição"><input className="input" placeholder="Notas..." value={form.obs_aquisicao} onChange={e => sf('obs_aquisicao', e.target.value)} /></Field>
          {form.estado_ext !== 'proprio' && (
            <>
              <div className="col-2" style={{ borderTop: '1px solid #1e3050', paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#D4AF37', marginBottom: 10 }}>🎯 Destino ({form.estado_ext})</div>
              </div>
              <Field label="Destino (nome/entidade)"><input className="input" placeholder="Nome do destinatário" value={form.destino_nome} onChange={e => sf('destino_nome', e.target.value)} /></Field>
              <Field label="Data"><input className="input" type="date" value={form.destino_data} onChange={e => sf('destino_data', e.target.value)} /></Field>
              <Field label="Valor (€)"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.destino_valor} onChange={e => sf('destino_valor', e.target.value)} /></Field>
              <Field label="Observações"><input className="input" placeholder="Notas..." value={form.destino_obs} onChange={e => sf('destino_obs', e.target.value)} /></Field>
            </>
          )}
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize: 'none' }} value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field></div>
        </div>
      </Modal>

      {selected && (
        <Modal open={modal === 'detail'} onClose={close} title={`${selected.emoji || '🐦'} ${selected.nome}`} wide
          footer={
            <div style={{ display: 'flex', gap: 8, width: '100%', flexWrap: 'wrap' }}>
              <button className="btn btn-danger btn-sm" onClick={() => { close(); setConfirm(selected) }}>🗑️</button>
              <button className="btn btn-secondary btn-sm" onClick={() => irParaSaude(selected)}>🏥 Registar Saúde</button>
              <button className="btn btn-secondary btn-sm" onClick={() => irParaPedigree(selected)}>🌳 Ver Pedigree</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={close}>Fechar</button>
              <button className="btn btn-primary" onClick={() => openEdit(selected)}>✏️ Editar</button>
            </div>
          }>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ width: 80, height: 80, borderRadius: 14, background: '#101F40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, overflow: 'hidden', flexShrink: 0, border: '1px solid #243860' }}>
              {selected.foto_url ? <img src={selected.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : selected.emoji || '🐦'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#D4AF37' }}>{selected.anilha}</span>
                <Badge v={statusBadge[selected.estado]}>{selected.estado}</Badge>
                {selected.estado_ext && selected.estado_ext !== 'proprio' && <Badge v={extBadge[selected.estado_ext] || 'gray'}>{selected.estado_ext}</Badge>}
              </div>
              {(() => { const c = classificarPombo(selected); return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: c.cor, marginBottom: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.cor }} />{c.tag}
                </div>
              )})()}
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 2 }}>{selected.sexo === 'M' ? '♂ Macho' : '♀ Fêmea'} · {selected.cor || '—'}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>🏠 {selected.pombal || '—'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
              {[['provas', t('provas'), '#D4AF37'], ['percentil', 'Percentil %', '#2DD4A7'], ['forma', 'Forma %', '#4C8DFF']].map(([k, l, cor]) => (
                <div key={k}><div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 700, color: cor }}>{selected[k] ?? 0}</div><div style={{ fontSize: 10, color: '#7A8699' }}>{l}</div></div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div className="label">Pai</div>
              {pedigreeInfo?.pai ? (
                <div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#D4AF37' }}>{pedigreeInfo.pai.anilha}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{pedigreeInfo.pai.nome}</div>
                  {pedigreeInfo.pai.cor && <div style={{ fontSize: 10, color: '#7A8699' }}>{pedigreeInfo.pai.cor}</div>}
                </div>
              ) : (
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#2DD4A7' }}>{selected.pai || '—'}</div>
              )}
            </div>
            <div>
              <div className="label">Mãe</div>
              {pedigreeInfo?.mae ? (
                <div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#D4AF37' }}>{pedigreeInfo.mae.anilha}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{pedigreeInfo.mae.nome}</div>
                  {pedigreeInfo.mae.cor && <div style={{ fontSize: 10, color: '#7A8699' }}>{pedigreeInfo.mae.cor}</div>}
                </div>
              ) : (
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#2DD4A7' }}>{selected.mae || '—'}</div>
              )}
            </div>
          </div>

          {(selected.criador || selected.data_aquisicao || selected.valor_aquisicao) && (
            <div style={{ background: '#101F40', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>📦 ORIGEM</div>
              {selected.criador && <div style={{ fontSize: 12, color: '#cbd5e1' }}>Criador: {selected.criador}</div>}
              {selected.data_aquisicao && <div style={{ fontSize: 12, color: '#cbd5e1' }}>Data: {new Date(selected.data_aquisicao).toLocaleDateString('pt-PT')}</div>}
              {selected.valor_aquisicao && <div style={{ fontSize: 12, color: '#D4AF37' }}>Valor: {selected.valor_aquisicao}€</div>}
              {selected.obs_aquisicao && <div style={{ fontSize: 12, color: '#7A8699' }}>{selected.obs_aquisicao}</div>}
            </div>
          )}

          {selected.estado_ext && selected.estado_ext !== 'proprio' && selected.destino_nome && (
            <div style={{ background: 'rgba(234,179,8,.08)', border: '1px solid rgba(234,179,8,.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#D4AF37', marginBottom: 6 }}>🎯 DESTINO — {selected.estado_ext.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>{selected.destino_nome}</div>
              {selected.destino_data && <div style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(selected.destino_data).toLocaleDateString('pt-PT')}</div>}
              {selected.destino_valor && <div style={{ fontSize: 12, color: '#D4AF37' }}>💶 {selected.destino_valor}€</div>}
              {selected.destino_obs && <div style={{ fontSize: 12, color: '#7A8699' }}>{selected.destino_obs}</div>}
            </div>
          )}

          {selected.obs && <div style={{ marginBottom: 14 }}><div className="label">Observações</div><div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>{selected.obs}</div></div>}

          <div style={{ borderTop: '1px solid #1B2D52', paddingTop: 14, marginTop: 4 }}>
            {loadingDetail ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
            ) : (
              <>
              <div className="grid-2" style={{ gap: 12 }}>
                <div style={{ background: '#101F40', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 8 }}>📈 Evolução de Peso</div>
                  <PesoChart registos={historicoSaude} />
                </div>
                <div style={{ background: '#101F40', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 8 }}>🏆 Histórico de Provas</div>
                  {historicoProvas.length === 0
                    ? <div style={{ fontSize: 11, color: '#7A8699', textAlign: 'center', padding: '12px 0' }}>Sem provas registadas para este pombo</div>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
                        {historicoProvas.map(r => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                            <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, width: 24, color: r.posicao === 1 ? '#D4AF37' : '#94a3b8' }}>{r.posicao ? r.posicao + 'º' : '—'}</span>
                            <span style={{ flex: 1, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.races?.nome || 'Prova'}</span>
                            <span style={{ color: '#7A8699' }}>{r.races?.data_reg ? new Date(r.races.data_reg).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) : ''}</span>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              </div>

              <div style={{ background: '#101F40', borderRadius: 8, padding: 12, marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 8 }}>🎯 Treinos</div>
                {historicoTreinos.length === 0
                  ? <div style={{ fontSize: 11, color: '#7A8699', textAlign: 'center', padding: '8px 0' }}>Este pombo ainda não participou em treinos registados</div>
                  : (() => {
                      const comVelocidade = historicoTreinos.filter(t => t.velocidade)
                      const velMedia = comVelocidade.length ? Math.round(comVelocidade.reduce((s, t) => s + t.velocidade, 0) / comVelocidade.length) : null
                      return (
                        <div>
                          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                            <div><span style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 900, color: '#4C8DFF' }}>{historicoTreinos.length}</span> <span style={{ fontSize: 11, color: '#7A8699' }}>treino{historicoTreinos.length !== 1 ? 's' : ''}</span></div>
                            {velMedia && <div><span style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 900, color: '#2DD4A7' }}>{velMedia}</span> <span style={{ fontSize: 11, color: '#7A8699' }}>km/h média</span></div>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 90, overflowY: 'auto' }}>
                            {historicoTreinos.slice(0, 5).map(t => (
                              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                                <span style={{ flex: 1, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.local}</span>
                                {t.velocidade && <span style={{ color: '#2DD4A7', fontFamily: "'Space Mono',monospace" }}>{t.velocidade}km/h</span>}
                                <span style={{ color: '#7A8699' }}>{new Date(t.data_reg).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()
                }
              </div>
              </>
            )}
          </div>
        </Modal>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar pombo"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar "{confirm?.nome}"?</p>
      </Modal>
    </div>
  )
}
