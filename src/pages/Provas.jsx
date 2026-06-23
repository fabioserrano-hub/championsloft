import { useState, useEffect, useCallback, useRef } from 'react'
import { db, supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'
import { classificarPombo } from './Pombos'

const TIPOS = ['Velocidade', 'Meio-Fundo', 'Fundo', 'Grande Fundo', 'Treino Federado']
const EMPTY_PROVA = { nome: '', tipo: 'Velocidade', dist: '', data_reg: new Date().toISOString().slice(0, 10), local_solta: '', lat_solta: '', lon_solta: '', hora_solta: '08:00', n_pombos: '', n_socios: '', custo: '', posicao_geral: '' }

function calcVelocidade(distKm, horaSolta, horaChegada) {
  if (!distKm || !horaSolta || !horaChegada) return null
  const [hS, mS] = horaSolta.split(':').map(Number)
  const [hC, mC] = horaChegada.split(':').map(Number)
  let mins = (hC * 60 + mC) - (hS * 60 + mS)
  if (mins <= 0) mins += 24 * 60
  const horas = mins / 60
  const vel = (distKm / horas)
  return { mins, vel: Math.round(vel * 100) / 100, mpm: Math.round((distKm * 1000 / mins) * 100) / 100 }
}

// Rumo geográfico (bearing) do ponto de solta para o pombal, em graus (0=Norte, 90=Este...)
function calcRumoVoo(latSolta, lonSolta, latPombal, lonPombal) {
  const toRad = (d) => d * Math.PI / 180
  const toDeg = (r) => r * 180 / Math.PI
  const dLon = toRad(lonPombal - lonSolta)
  const y = Math.sin(dLon) * Math.cos(toRad(latPombal))
  const x = Math.cos(toRad(latSolta)) * Math.sin(toRad(latPombal)) - Math.sin(toRad(latSolta)) * Math.cos(toRad(latPombal)) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

// Classifica o vento relativo ao rumo de voo: cauda (favorável), proa (contra), ou lateral
function classificarVento(rumoVoo, direcaoVento) {
  // direcaoVento é a direção DE ONDE o vento vem (convenção meteorológica padrão).
  // Se o vento vem da mesma direção do rumo de voo, está a "empurrar pelas costas" -> vento de cauda.
  // Se vem da direção oposta ao rumo de voo, está a soprar de frente -> vento de proa.
  let diff = Math.abs(rumoVoo - direcaoVento)
  if (diff > 180) diff = 360 - diff
  if (diff <= 45) return { tipo: 'Vento de Cauda', icon: '⬆️', cor: '#2DD4A7', desc: 'Vento a favor — condições propícias a boas médias' }
  if (diff >= 135) return { tipo: 'Vento de Proa', icon: '⬇️', cor: '#f87171', desc: 'Vento contra o voo — pode atrasar a chegada' }
  return { tipo: 'Vento Lateral', icon: '↔️', cor: '#D4AF37', desc: 'Vento de lado — pode dispersar o bando' }
}

export default function Provas({ nav, params }) {
  const toast = useToast()
  const { user } = useAuth()
  const [uploadingAnexo, setUploadingAnexo] = useState(false)
  const [modalImportFPC, setModalImportFPC] = useState(false)
  const [importandoFPC, setImportandoFPC] = useState(false)
  const [fpcUrl, setFpcUrl] = useState('')
  const [provas, setProvas] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState(EMPTY_PROVA)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [resultados, setResultados] = useState([])
  const [loadingRes, setLoadingRes] = useState(false)
  const [encestados, setEncestados] = useState([])
  const [meteo, setMeteo] = useState(null)
  const [loadingMeteo, setLoadingMeteo] = useState(false)
  const [historicoSemelhante, setHistoricoSemelhante] = useState(null)

  const [perfil, setPerfil] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const [p, pb, pf] = await Promise.all([db.getProvas(), db.getPombos(), db.getPerfil()]); setProvas(p); setPombos(pb); setPerfil(pf) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (params?.provaId && provas.length) {
      const p = provas.find(x => x.id === params.provaId)
      if (p) openDetail(p)
    }
  }, [params, provas])

  const importarFPC = async () => {
    if (!fpcUrl.trim()) { toast('Introduz o URL ou código da prova FPC','warn'); return }
    setImportandoFPC(true)
    try {
      // Tentar extrair dados da URL FPC ou código manual
      // Como o site FPC não tem API pública, usamos CSV colado ou dados manuais
      const linhas = fpcUrl.trim().split('\n').filter(l => l.trim())
      if (linhas.length < 2) {
        toast('Formato inválido. Cola os resultados em CSV (anilha;posição;velocidade)','warn')
        setImportandoFPC(false); return
      }
      // Detectar separador
      const sep = linhas[0].includes(';') ? ';' : ','
      const headers = linhas[0].split(sep).map(h => h.trim().toLowerCase())
      const anilhaIdx = headers.findIndex(h => h.includes('anil') || h.includes('ring'))
      const posIdx = headers.findIndex(h => h.includes('pos') || h.includes('lugar') || h.includes('clas'))
      const velIdx = headers.findIndex(h => h.includes('vel') || h.includes('speed'))
      const nomeIdx = headers.findIndex(h => h.includes('nome') || h.includes('pombo'))

      // Criar a prova primeiro se não existe seleccionada
      let provaId = selected?.id
      if (!provaId) {
        const { data: novaProva } = await supabase.from('races').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          nome: `Importação FPC ${new Date().toLocaleDateString('pt-PT')}`,
          data_reg: new Date().toISOString().slice(0,10),
          tipo: 'velocidade', dist: 0, origem: 'fpc_import'
        }).select().single()
        provaId = novaProva?.id
      }

      // Importar resultados linha a linha
      let ok = 0
      for (const linha of linhas.slice(1)) {
        const cols = linha.split(sep).map(c => c.trim())
        const anilha = anilhaIdx >= 0 ? cols[anilhaIdx] : cols[0]
        const posicao = posIdx >= 0 ? parseInt(cols[posIdx]) : 0
        const velocidade = velIdx >= 0 ? parseFloat(cols[velIdx]?.replace(',','.')) : 0
        if (!anilha) continue

        // Procurar pombo por anilha
        const { data: pombo } = await supabase.from('pigeons').select('id').eq('anilha', anilha).maybeSingle()
        if (pombo && provaId) {
          await supabase.from('race_results').insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            race_id: provaId, pigeon_id: pombo.id,
            posicao, velocidade, dist: selected?.dist || 0
          })
          ok++
        }
      }
      toast(`${ok} resultado(s) importado(s)!`, 'ok')
      setModalImportFPC(false); setFpcUrl(''); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setImportandoFPC(false) }
  }

  const openNew = () => { setForm(EMPTY_PROVA); setSelected(null); setModal('form') }
  const openEdit = (p) => {
    setSelected(p)
    setForm({ nome: p.nome || '', tipo: p.tipo || 'Velocidade', dist: String(p.dist || ''), data_reg: p.data_reg?.slice(0, 10) || '', local_solta: p.local_solta || '', lat_solta: String(p.lat_solta || ''), lon_solta: String(p.lon_solta || ''), hora_solta: p.hora_solta || '08:00', n_pombos: String(p.n_pombos || ''), n_socios: String(p.n_socios || ''), custo: String(p.custo || ''), posicao_geral: String(p.posicao_geral || '') })
    setModal('form')
  }
  const close = () => { setModal(null); setSelected(null); setResultados([]); setEncestados([]); setMeteo(null); setHistoricoSemelhante(null) }

  const uploadAnexo = async (file) => {
    if (!file) return
    setUploadingAnexo(true)
    try {
      const anexo = await db.uploadAnexoProva(user.id, selected.id, file)
      const novosAnexos = [...(selected.anexos || []), anexo]
      await db.updateProva(selected.id, { anexos: novosAnexos })
      setSelected(s => ({ ...s, anexos: novosAnexos }))
      toast('Anexo carregado!', 'ok')
    } catch (e) { toast('Erro: ' + e.message + ' (verifique se o bucket documentos-provas existe)', 'err') }
    finally { setUploadingAnexo(false) }
  }

  const removerAnexo = async (anexo) => {
    try {
      await db.deleteAnexoProva(anexo.path)
      const novosAnexos = (selected.anexos || []).filter(a => a.path !== anexo.path)
      await db.updateProva(selected.id, { anexos: novosAnexos })
      setSelected(s => ({ ...s, anexos: novosAnexos }))
      toast('Anexo removido', 'ok')
    } catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const save = async () => {
    if (!form.nome.trim() || !form.dist) { toast('Nome e distância obrigatórios', 'warn'); return }
    setSaving(true)
    try {
      const payload = { nome: form.nome.trim(), tipo: form.tipo, dist: parseFloat(form.dist), data_reg: form.data_reg, local_solta: form.local_solta, lat_solta: form.lat_solta ? parseFloat(form.lat_solta) : null, lon_solta: form.lon_solta ? parseFloat(form.lon_solta) : null, hora_solta: form.hora_solta, n_pombos: form.n_pombos ? parseInt(form.n_pombos) : null, n_socios: form.n_socios ? parseInt(form.n_socios) : null, custo: form.custo ? parseFloat(form.custo) : null, posicao_geral: form.posicao_geral ? parseInt(form.posicao_geral) : null }
      selected ? await db.updateProva(selected.id, payload) : await db.createProva(payload)
      toast(selected ? 'Actualizada!' : 'Prova criada!', 'ok'); close(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteProva(confirm.id); toast('Eliminada', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const openDetail = async (p) => {
    setSelected(p); setModal('detail'); setLoadingRes(true)
    try {
      setResultados(await db.getResultados(p.id))
      // Histórico de desempenho em provas semelhantes (mesma distância ±50km ou mesmo local de solta)
      const semelhantes = provas.filter(o => o.id !== p.id && (
        (p.local_solta && o.local_solta === p.local_solta) ||
        (p.dist && o.dist && Math.abs(o.dist - p.dist) <= 50)
      ))
      if (semelhantes.length > 0) {
        const { data } = await supabase.from('race_results').select('posicao, velocidade, race_id').in('race_id', semelhantes.map(s => s.id)).not('posicao', 'is', null)
        const comPos = data || []
        if (comPos.length > 0) {
          const top3 = comPos.filter(r => r.posicao <= 3).length
          const velMedia = comPos.filter(r => r.velocidade).reduce((s, r) => s + r.velocidade, 0) / (comPos.filter(r => r.velocidade).length || 1)
          setHistoricoSemelhante({ nProvas: semelhantes.length, nResultados: comPos.length, top3, velMedia: Math.round(velMedia * 10) / 10 })
        } else setHistoricoSemelhante({ nProvas: semelhantes.length, nResultados: 0 })
      } else setHistoricoSemelhante(null)
    }
    catch (e) { setResultados([]); setHistoricoSemelhante(null) }
    finally { setLoadingRes(false) }
  }

  const openEncestamento = (p) => { setSelected(p); setModal('encestamento'); setEncestados(resultados.map(r => r.pigeon_id)) }
  const toggleEncestado = (pomboId) => setEncestados(e => e.includes(pomboId) ? e.filter(x => x !== pomboId) : [...e, pomboId])

  const confirmarEncestamento = async () => {
    setSaving(true)
    try {
      const existentes = resultados.map(r => r.pigeon_id)
      const novos = encestados.filter(id => !existentes.includes(id))
      const removidos = existentes.filter(id => !encestados.includes(id))
      await Promise.all(novos.map(pid => db.createResultado({ race_id: selected.id, pigeon_id: pid })))
      const aRemover = resultados.filter(r => removidos.includes(r.pigeon_id))
      await Promise.all(aRemover.map(r => db.deleteResultado(r.id)))
      toast('Encestamento actualizado!', 'ok')
      setResultados(await db.getResultados(selected.id))
      setModal('detail')
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const guardarResultado = async (resultado, posicao, horaChegada) => {
    try {
      const calc = calcVelocidade(selected.dist, selected.hora_solta, horaChegada)
      await db.updateResultado(resultado.id, { posicao: posicao ? parseInt(posicao) : null, hora_chegada: horaChegada || null, velocidade: calc?.vel || null, mpm: calc?.mpm || null })
      setResultados(await db.getResultados(selected.id))
      toast('Resultado guardado', 'ok')
    } catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const buscarMeteo = async () => {
    if (!selected?.lat_solta || !selected?.lon_solta) { toast('Sem coordenadas GPS de solta nesta prova', 'warn'); return }
    setLoadingMeteo(true)
    try {
      const hoje = new Date().toISOString().slice(0, 10)
      const endpoint = (d) => d < hoje
        ? `https://archive-api.open-meteo.com/v1/archive?latitude=${selected.lat_solta}&longitude=${selected.lon_solta}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation,cloudcover&start_date=${d}&end_date=${d}`
        : `https://api.open-meteo.com/v1/forecast?latitude=${selected.lat_solta}&longitude=${selected.lon_solta}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation,cloudcover&start_date=${d}&end_date=${d}`
      const fmt = (d) => d.toISOString().slice(0, 10)
      const dataProva = new Date(selected.data_reg)
      const inicio = new Date(dataProva); inicio.setDate(inicio.getDate() - 1)
      const fim = new Date(dataProva); fim.setDate(fim.getDate() + 1)
      const diaProva = fmt(dataProva)
      const res = await fetch(endpoint(diaProva))
      const data = await res.json()
      setMeteo(data)
    } catch (e) { toast('Erro ao obter meteorologia', 'err') }
    finally { setLoadingMeteo(false) }
  }

  const abrirMeteoRota = () => {
    if (!selected || !perfil?.pombal_lat) { toast('Defina as coordenadas do pombal no Perfil', 'warn'); return }
    close()
    nav('meteorologia', { provaId: selected.id })
  }

  const provasOrdenadas = [...provas].sort((a, b) => new Date(b.data_reg) - new Date(a.data_reg))
  const PombosNaoEncestados = pombos.filter(p => (!p.estado_ext || p.estado_ext === 'proprio') && p.estado === 'ativo')
  const PombosNaoEncestadosClassificados = PombosNaoEncestados
    .map(p => ({ ...p, classificacao: classificarPombo(p) }))
    .sort((a, b) => b.classificacao.prioridade - a.classificacao.prioridade)

  const hoje = new Date().toISOString().slice(0, 10)
  const [filtroProvas, setFiltroProvas] = useState('todas')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  const provasFiltradas = provasOrdenadas.filter(p => {
    const passada = p.data_reg <= hoje
    if (filtroProvas === 'passadas' && !passada) return false
    if (filtroProvas === 'futuras' && passada) return false
    if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false
    return true
  })

  // Calcula distância em linha reta entre dois pontos GPS (fórmula Haversine)
  const calcDistanciaAoPombal = (lat, lon) => {
    if (!perfil?.pombal_lat || !perfil?.pombal_lon || !lat || !lon) return null
    const R = 6371
    const dLat = (perfil.pombal_lat - lat) * Math.PI / 180
    const dLon = (perfil.pombal_lon - lon) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(perfil.pombal_lat*Math.PI/180)*Math.sin(dLon/2)**2
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
  }

  // Ao alterar GPS manualmente, calcula distância ao pombal
  const onLatLonChange = (campo, valor) => {
    sf(campo, valor)
    const lat = campo === 'lat_solta' ? parseFloat(valor) : parseFloat(form.lat_solta)
    const lon = campo === 'lon_solta' ? parseFloat(valor) : parseFloat(form.lon_solta)
    if (lat && lon && perfil?.pombal_lat && perfil?.pombal_lon) {
      const dist = calcDistanciaAoPombal(lat, lon)
      if (dist) sf('dist', String(dist))
    }
  }

  const [pesquisaLocal, setPesquisaLocal] = useState('')
  const [resultadosPesquisa, setResultadosPesquisa] = useState([])
  const [pesquisandoLocal, setPesquisandoLocal] = useState(false)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const debounceRef = useRef(null)

  const pesquisarLocalSolta = (q) => {
    setPesquisaLocal(q)
    setDropdownAberto(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) { setResultadosPesquisa([]); return }
    debounceRef.current = setTimeout(async () => {
      setPesquisandoLocal(true)
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=pt`)
        const data = await res.json()
        // Filtrar PT e ES mas se nao houver resultados mostrar todos
        const todos = data.results || []
        const filtrados = todos.filter(l => ['PT','ES'].includes(l.country_code))
        setResultadosPesquisa(filtrados.length > 0 ? filtrados : todos.slice(0, 5))
      } catch(e) { setResultadosPesquisa([]) }
      finally { setPesquisandoLocal(false) }
    }, 350)
  }

  const selecionarLocal = (loc) => {
    const dist = calcDistanciaAoPombal(loc.latitude, loc.longitude)
    const nome = `${loc.name}${loc.admin2 ? ', '+loc.admin2 : ''}${loc.admin1 ? ', '+loc.admin1 : ''} (${loc.country_code})`
    sf('local_solta', nome)
    sf('lat_solta', String(loc.latitude))
    sf('lon_solta', String(loc.longitude))
    if (dist) sf('dist', String(dist))
    setPesquisaLocal('')
    setResultadosPesquisa([])
    setDropdownAberto(false)
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Provas</div><div className="section-sub">{provas.length} provas registadas</div></div>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setModalImportFPC(true)}>📥 FPC</button>
          <button className="btn btn-primary" onClick={openNew}>＋ Nova Prova</button>
        </div>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : provas.length === 0 ? <EmptyState icon="🏆" title="Sem provas" desc="Registe a primeira prova da época" action={<button className="btn btn-primary" onClick={openNew}>＋ Nova Prova</button>} />
        : <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {[['todas','Todas'],['passadas','Passadas'],['futuras','Futuras']].map(([v,l]) => (
                <button key={v} onClick={() => setFiltroProvas(v)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:filtroProvas===v?'#1E5FD9':'#101F40', color:filtroProvas===v?'#fff':'#94a3b8' }}>{l}</button>
              ))}
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="input" style={{ maxWidth:160, fontSize:12, padding:'4px 10px', borderRadius:20 }}>
                <option value="todos">Todos os tipos</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span style={{ fontSize:11, color:'#7A8699', alignSelf:'center' }}>{provasFiltradas.length} prova(s)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {provasFiltradas.map(p => {
                const passada = p.data_reg <= hoje
                return (
                  <div key={p.id} className="card card-p" style={{ cursor: 'pointer', opacity: passada ? 1 : 0.85 }} onClick={() => openDetail(p)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: passada ? '#101F40' : 'rgba(76,141,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{passada ? '🏆' : '📅'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{p.nome}</div>
                        <div style={{ fontSize: 12, color: '#7A8699' }}>{p.tipo} · {p.dist}km · {p.local_solta || '—'} · {new Date(p.data_reg).toLocaleDateString('pt-PT')}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                        <Badge v={passada ? 'blue' : 'green'}>{passada ? p.tipo : 'Próxima'}</Badge>
                        {!passada && p.data_reg && <div style={{ fontSize:10, color:'#D4AF37' }}>Em {Math.ceil((new Date(p.data_reg)-new Date())/(1000*60*60*24))} dias</div>}
                      </div>
                      <button className="btn btn-icon btn-sm" onClick={e => { e.stopPropagation(); setConfirm(p) }}>🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
      }

      <Modal open={modal === 'form'} onClose={close} title={selected ? '✏️ Editar Prova' : '🏆 Nova Prova'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? 'Guardar' : 'Criar'}</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Ex: Prova de Vendas Novas" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field></div>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e => sf('tipo', e.target.value)}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Distância (km) *"><input className="input" type="number" placeholder="320" value={form.dist} onChange={e => sf('dist', e.target.value)} /></Field>
          <Field label="Data"><input className="input" type="date" value={form.data_reg} onChange={e => sf('data_reg', e.target.value)} /></Field>
          <Field label="Hora de Solta"><input className="input" type="time" value={form.hora_solta} onChange={e => sf('hora_solta', e.target.value)} /></Field>
          <div className="col-2">
            <Field label="🔍 Local de Solta — pesquise em PT/ES">
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    className="input"
                    placeholder="Ex: Vendas Novas, Badajoz, Cáceres..."
                    value={pesquisaLocal}
                    onChange={e => pesquisarLocalSolta(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {pesquisandoLocal && <div style={{ position:'absolute', right: form.local_solta ? 80 : 10, top: 10, fontSize: 13, color: '#7A8699' }}>🔄</div>}
                  {form.local_solta && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { sf('local_solta',''); sf('lat_solta',''); sf('lon_solta',''); sf('dist',''); setPesquisaLocal(''); setResultadosPesquisa([]) }}>✕</button>
                  )}
                </div>
                {form.local_solta && !pesquisaLocal && (
                  <div style={{ fontSize: 11, color: '#2DD4A7', marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>✅ {form.local_solta}</span>
                    {form.dist && <span style={{ color: '#D4AF37' }}>· {form.dist}km ao pombal</span>}
                  </div>
                )}
                {resultadosPesquisa.length > 0 && dropdownAberto && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#0B1830', border:'1px solid #1B2D52', borderRadius:8, zIndex:200, marginTop:4, boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
                    <div style={{ padding: '6px 12px', fontSize: 10, color: '#7A8699', borderBottom: '1px solid #1B2D52', letterSpacing: .5 }}>SELECCIONE O LOCAL</div>
                    {resultadosPesquisa.map((loc, i) => (
                      <div
                        key={i}
                        onClick={() => selecionarLocal(loc)}
                        style={{ padding:'12px 14px', cursor:'pointer', borderBottom: i < resultadosPesquisa.length-1 ? '1px solid #101F40' : 'none', fontSize: 13, transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background='#101F40'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      >
                        <div style={{ color:'#fff', fontWeight: 500 }}>
                          {loc.name}
                          {loc.admin2 ? <span style={{ color:'#7A8699' }}>, {loc.admin2}</span> : null}
                        </div>
                        <div style={{ fontSize: 11, color: '#7A8699', marginTop: 2 }}>
                          {loc.admin1 && `${loc.admin1} · `}
                          <span style={{ color: loc.country_code === 'PT' ? '#4C8DFF' : '#D4AF37', fontWeight: 600 }}>{loc.country_code}</span>
                          {' · '}{loc.latitude.toFixed(3)}, {loc.longitude.toFixed(3)}
                        </div>
                      </div>
                    ))}
                    <div onClick={() => { setResultadosPesquisa([]); setDropdownAberto(false) }} style={{ padding: '8px 14px', fontSize: 11, color: '#7A8699', cursor: 'pointer', textAlign: 'center' }}>Fechar ✕</div>
                  </div>
                )}
              </div>
            </Field>
          </div>
          <Field label="Latitude"><input className="input" placeholder="38.68" value={form.lat_solta} onChange={e => onLatLonChange('lat_solta', e.target.value)} /></Field>
          <Field label="Longitude"><input className="input" placeholder="-8.46" value={form.lon_solta} onChange={e => onLatLonChange('lon_solta', e.target.value)} /></Field>
          <Field label="Nº Pombos (geral)"><input className="input" type="number" value={form.n_pombos} onChange={e => sf('n_pombos', e.target.value)} /></Field>
          <Field label="A Minha Posição (classificação oficial)"><input className="input" type="number" placeholder="Ex: 5" value={form.posicao_geral} onChange={e => sf('posicao_geral', e.target.value)} /></Field>
          <Field label="Nº Sócios"><input className="input" type="number" value={form.n_socios} onChange={e => sf('n_socios', e.target.value)} /></Field>
          <Field label="Custo (€)"><input className="input" type="number" step="0.01" value={form.custo} onChange={e => sf('custo', e.target.value)} /></Field>
        </div>
      </Modal>

      {selected && (
        <Modal open={modal === 'detail'} onClose={close} title={`🏆 ${selected.nome}`} wide
          footer={
            <div style={{ display: 'flex', gap: 8, width: '100%', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => openEncestamento(selected)}>📦 Encestamento ({resultados.length})</button>
              <button className="btn btn-secondary btn-sm" onClick={buscarMeteo} disabled={loadingMeteo}>{loadingMeteo ? <Spinner /> : '🌦️'} MeteoProva</button>
              {perfil?.pombal_lat && <button className="btn btn-primary btn-sm" onClick={abrirMeteoRota}>🗺️ Rota de Voo</button>}
              <div style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={close}>Fechar</button>
              <button className="btn btn-primary" onClick={() => openEdit(selected)}>✏️ Editar</button>
            </div>
          }>
          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="kpi"><div className="kpi-val" style={{ fontSize: 22 }}>{selected.dist}km</div><div className="kpi-label">Distância</div></div>
            <div className="kpi"><div className="kpi-val" style={{ fontSize: 22 }}>{resultados.length}</div><div className="kpi-label">Encestados</div></div>
            <div className="kpi"><div className="kpi-val" style={{ fontSize: 22 }}>{resultados.filter(r => r.posicao).length}</div><div className="kpi-label">Com Resultado</div></div>
          </div>

          {historicoSemelhante && (
            <div className="card card-p" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: 6 }}>📊 Histórico em Provas Semelhantes</div>
              {historicoSemelhante.nResultados === 0 ? (
                <div style={{ fontSize: 12, color: '#7A8699' }}>{historicoSemelhante.nProvas} prova(s) com distância ou local parecido, mas ainda sem resultados registados.</div>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Em <strong style={{ color: '#cbd5e1' }}>{historicoSemelhante.nProvas}</strong> prova(s) parecidas (mesma distância ±50km ou mesmo local de solta), os seus pombos ficaram entre os 3 primeiros <strong style={{ color: '#2DD4A7' }}>{historicoSemelhante.top3}</strong> vez(es), com velocidade média de <strong style={{ color: '#cbd5e1' }}>{historicoSemelhante.velMedia} km/h</strong>.
                </div>
              )}
            </div>
          )}

          {selected.local_solta && (
            <div style={{ marginBottom: 16 }}>
              <div className="label" style={{ marginBottom: 6 }}>📍 Local de Solta</div>
              {selected.lat_solta && selected.lon_solta ? (() => {
                const latS = parseFloat(selected.lat_solta), lonS = parseFloat(selected.lon_solta)
                const latP = perfil?.pombal_lat, lonP = perfil?.pombal_lon
                const html = `<!DOCTYPE html><html><head><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script><style>body{margin:0}#map{height:100vh}<\/style><\/head><body><div id="map"><\/div><script>
var map=L.map('map',{attributionControl:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
L.circleMarker([${latS},${lonS}],{radius:8,color:'#f87171',fillColor:'#f87171',fillOpacity:1}).addTo(map).bindPopup('Solta');
${latP && lonP ? `L.circleMarker([${latP},${lonP}],{radius:8,color:'#2DD4A7',fillColor:'#2DD4A7',fillOpacity:1}).addTo(map).bindPopup('Pombal');L.polyline([[${latS},${lonS}],[${latP},${lonP}]],{color:'#D4AF37',weight:2.5,dashArray:'6,4'}).addTo(map);map.fitBounds([[${Math.min(latS,latP)-.3},${Math.min(lonS,lonP)-.3}],[${Math.max(latS,latP)+.3},${Math.max(lonS,lonP)+.3}]]);` : `map.setView([${latS},${lonS}],9);`}
<\/script><\/body><\/html>`
                return (
                  <div>
                    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #1B2D52', height: 260 }}>
                      <iframe srcDoc={html} width="100%" height="100%" frameBorder="0" style={{ display: 'block' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6, fontSize: 11, color: '#94a3b8', flexWrap: 'wrap' }}>
                      <span>🔴 Solta</span><span style={{ color: '#D4AF37' }}>– – –</span><span style={{ color: '#2DD4A7' }}>🟢 Pombal</span>
                      {selected.dist && <span style={{ color: '#D4AF37' }}>{selected.dist}km em linha recta</span>}
                      {perfil?.pombal_lat && <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={abrirMeteoRota}>🌦️ Ver Rota de Voo</button>}
                    </div>
                  </div>
                )
              })() : <div style={{ fontSize: 13, color: '#94a3b8' }}>{selected.local_solta} (sem coordenadas GPS — edite a prova para adicionar)</div>}
            </div>
          )}

          {meteo && (
            <div className="card card-p" style={{ marginBottom: 16, background: '#101F40' }}>
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: 10 }}>🌦️ Previsão — Dia Anterior, da Prova e Seguinte</div>
              {meteo.hourly ? (() => {
                const diaProvaStr = selected.data_reg.slice(0, 10)
                const diasUnicos = [...new Set(meteo.hourly.time.map(t => t.slice(0, 10)))]
                const ventoInfo = (() => {
                  if (!perfil?.pombal_lat || !perfil?.pombal_lon || !selected.lat_solta || !selected.lon_solta) return null
                  const rumo = calcRumoVoo(selected.lat_solta, selected.lon_solta, perfil.pombal_lat, perfil.pombal_lon)
                  const horaSolta = selected.hora_solta || '08:00'
                  const idxSolta = meteo.hourly.time.findIndex(t => t === `${diaProvaStr}T${horaSolta.slice(0, 2)}:00`)
                  if (idxSolta < 0) return null
                  const direcaoVento = meteo.hourly.winddirection_10m?.[idxSolta]
                  if (direcaoVento === undefined) return null
                  return { ...classificarVento(rumo, direcaoVento), velocidadeVento: meteo.hourly.windspeed_10m?.[idxSolta] }
                })()
                return (
                  <div>
                    {ventoInfo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: `${ventoInfo.cor}14`, border: `1px solid ${ventoInfo.cor}40`, marginBottom: 10 }}>
                        <span style={{ fontSize: 20 }}>{ventoInfo.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: ventoInfo.cor }}>{ventoInfo.tipo} ({ventoInfo.velocidadeVento}km/h) na hora de solta</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{ventoInfo.desc}</div>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {diasUnicos.map(diaStr => {
                        const isDiaProva = diaStr === diaProvaStr
                        return (
                          <div key={diaStr} style={{ border: isDiaProva ? '1px solid rgba(212,175,55,.35)' : '1px solid #1B2D52', borderRadius: 8, padding: '8px 10px', background: isDiaProva ? 'rgba(212,175,55,.05)' : 'transparent' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: isDiaProva ? '#D4AF37' : '#94a3b8', marginBottom: 6 }}>{isDiaProva ? '🏁 ' : ''}{new Date(diaStr).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' })}{isDiaProva ? ' (dia da prova)' : ''}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center' }}>
                              {[8, 11, 14, 17].map(h => {
                                const idx = meteo.hourly.time.findIndex(t => t === `${diaStr}T${String(h).padStart(2, '0')}:00`)
                                if (idx < 0) return null
                                return (
                                  <div key={h}>
                                    <div style={{ fontSize: 10, color: '#7A8699' }}>{h}h</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{meteo.hourly.temperature_2m?.[idx]}°C</div>
                                    <div style={{ fontSize: 9, color: '#4C8DFF' }}>💨 {meteo.hourly.windspeed_10m?.[idx]}km/h</div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {!ventoInfo && (!perfil?.pombal_lat || !perfil?.pombal_lon) && (
                      <div style={{ fontSize: 11, color: '#7A8699', marginTop: 10 }}>💡 Defina as coordenadas GPS do pombal em Perfil para ver a análise de vento de cauda/proa.</div>
                    )}
                  </div>
                )
              })() : <div style={{ fontSize: 12, color: '#7A8699' }}>Sem dados meteorológicos disponíveis</div>}
            </div>
          )}

          <div className="card card-p" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: '#fff' }}>📎 Anexos ({(selected.anexos || []).length})</div>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                {uploadingAnexo ? <Spinner /> : '＋ Carregar'}
                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} disabled={uploadingAnexo}
                  onChange={e => { uploadAnexo(e.target.files[0]); e.target.value = '' }} />
              </label>
            </div>
            {(selected.anexos || []).length === 0
              ? <div style={{ fontSize: 12, color: '#7A8699' }}>Sem anexos. Carregue uma foto do encestamento ou o boletim de resultados em PDF.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selected.anexos.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#101F40', borderRadius: 8 }}>
                      <span style={{ fontSize: 16 }}>{a.tipo?.includes('pdf') ? '📄' : '🖼️'}</span>
                      <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 12, color: '#4C8DFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>{a.nome}</a>
                      <button className="btn btn-icon btn-sm" onClick={() => removerAnexo(a)}>🗑️</button>
                    </div>
                  ))}
                </div>
            }
          </div>

          <div className="label" style={{ marginBottom: 8 }}>Resultados</div>
          {loadingRes ? <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Spinner /></div>
            : resultados.length === 0 ? <div style={{ textAlign: 'center', color: '#7A8699', padding: '20px 0', fontSize: 13 }}>Nenhum pombo encestado. Use "📦 Encestamento" para adicionar.</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {resultados.map(r => (<ResultadoRow key={r.id} r={r} onSave={guardarResultado} />))}
              </div>
          }
        </Modal>
      )}

      {selected && (
        <Modal open={modal === 'encestamento'} onClose={() => setModal('detail')} title="📦 Encestamento"
          footer={<><button className="btn btn-secondary" onClick={() => setModal('detail')}>Cancelar</button><button className="btn btn-primary" onClick={confirmarEncestamento} disabled={saving}>{saving ? <Spinner /> : null}Confirmar ({encestados.length})</button></>}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>Seleccione os pombos a encestar para esta prova. Pombos "Prontos a competir" aparecem primeiro.</div>
          {PombosNaoEncestadosClassificados.some(p => p.classificacao.prioridade <= 1) && (
            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#f87171' }}>
              ⚠️ Há pombos lesionados ou em queda de rendimento na lista — evite encestar pombos que não estejam aptos.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {PombosNaoEncestadosClassificados.map(p => {
              const c = p.classificacao
              const atencao = c.prioridade <= 1
              return (
                <div key={p.id} onClick={() => toggleEncestado(p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: encestados.includes(p.id) ? 'rgba(76,141,255,.08)' : '#101F40', border: encestados.includes(p.id) ? '1px solid #4C8DFF' : atencao ? '1px solid rgba(239,68,68,.3)' : '1px solid #1B2D52' }}>
                  <input type="checkbox" checked={encestados.includes(p.id)} onChange={() => {}} style={{ accentColor: '#4C8DFF', width: 16, height: 16 }} />
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0B1830', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, overflow: 'hidden', flexShrink: 0 }}>
                    {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#fff' }}>{p.nome}</div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#7A8699' }}>{p.anilha}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.cor, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>{atencao ? '🏥' : ''} {c.tag}</span>
                </div>
              )
            })}
          </div>
        </Modal>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar prova"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar "{confirm?.nome}"? Os resultados associados também serão perdidos.</p>
      </Modal>

      {/* Modal Import FPC */}
      <Modal open={modalImportFPC} onClose={() => { setModalImportFPC(false); setFpcUrl('') }} title="📥 Importar Resultados FPC"
        footer={<><button className="btn btn-secondary" onClick={() => setModalImportFPC(false)}>Cancelar</button><button className="btn btn-primary" onClick={importarFPC} disabled={importandoFPC}>{importandoFPC ? <Spinner /> : null}Importar</button></>}>
        <div style={{ marginBottom:12, padding:'10px 12px', background:'rgba(76,141,255,.06)', border:'1px solid rgba(76,141,255,.15)', borderRadius:8, fontSize:12, color:'#94a3b8', lineHeight:1.7 }}>
          Cola os resultados exportados do site da FPC em formato CSV.<br/>
          Formato: <span style={{ fontFamily:"'Space Mono',monospace", color:'#4C8DFF' }}>anilha;posição;velocidade</span><br/>
          A 1ª linha deve ser o cabeçalho. As anilhas devem corresponder ao teu efectivo.
        </div>
        {selected && <div style={{ fontSize:12, color:'#2DD4A7', marginBottom:10 }}>✓ Prova seleccionada: <strong>{selected.nome}</strong></div>}
        {!selected && <div style={{ fontSize:12, color:'#D4AF37', marginBottom:10 }}>⚠️ Nenhuma prova seleccionada — será criada automaticamente</div>}
        <Field label="Resultados CSV">
          <textarea className="input" rows={8} style={{ resize:'vertical', fontFamily:"'Space Mono',monospace", fontSize:11 }}
            value={fpcUrl} onChange={e => setFpcUrl(e.target.value)}
            placeholder={'anilha;posicao;velocidade\nPT-2022-00001;1;1420\nPT-2022-00002;3;1398\n...'} />
        </Field>
      </Modal>
    </div>
  )
}

function ResultadoRow({ r, onSave }) {
  const [posicao, setPosicao] = useState(r.posicao || '')
  const [hora, setHora] = useState(r.hora_chegada || '')
  const p = r.pigeons

  const handleBlur = () => {
    if (posicao !== (r.posicao || '') || hora !== (r.hora_chegada || '')) onSave(r, posicao, hora)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#101F40', borderRadius: 10, flexWrap: 'wrap' }}>
      <div style={{ width: 26, height: 26, borderRadius: 6, background: '#0B1830', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, overflow: 'hidden', flexShrink: 0 }}>
        {p?.foto_url ? <img src={p.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p?.emoji || '🐦')}
      </div>
      <div style={{ flex: '1 1 140px', minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.nome || '—'}</div>
        <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#7A8699' }}>{p?.anilha}</div>
      </div>
      <input className="input" style={{ width: 60, padding: '4px 8px', fontSize: 12 }} type="number" placeholder="Lugar" value={posicao} onChange={e => setPosicao(e.target.value)} onBlur={handleBlur} />
      <input className="input" style={{ width: 90, padding: '4px 8px', fontSize: 12 }} type="time" value={hora} onChange={e => setHora(e.target.value)} onBlur={handleBlur} />
      {r.velocidade ? <span style={{ fontSize: 11, color: '#2DD4A7', fontFamily: 'Space Mono', whiteSpace: 'nowrap' }}>{r.velocidade} km/h</span> : <span style={{ fontSize: 10, color: '#475569' }}>—</span>}
    </div>
  )
}
