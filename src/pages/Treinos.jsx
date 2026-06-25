import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { classificarPombo } from './Pombos'

const TIPOS = ['Treino em Linha', 'Treino à Volta do Pombal', 'Voo Livre', 'Solta Local', 'Adestramento']
const TIPO_ICONS = { 'Treino em Linha':'➡️', 'Treino à Volta do Pombal':'🔄', 'Voo Livre':'🕊️', 'Solta Local':'📍', 'Adestramento':'🎯' }
const RETORNOS = ['Completo', 'Parcial', 'Com Perdas']
const retornoBadge = { 'Completo': 'green', 'Parcial': 'yellow', 'Com Perdas': 'red' }
const EMPTY = { local: '', lat_solta: '', lon_solta: '', tipo: 'Treino em Linha', dist: '', data_reg: new Date().toISOString().slice(0, 10), hora_solta: '08:00', hora_retorno: '', pombos_n: '', retorno: 'Completo', custo: '', obs: '', pombosIds: [] }

function calcVel(distKm, horaSolta, horaRetorno) {
  if (!distKm || !horaSolta || !horaRetorno) return null
  const [hS, mS] = horaSolta.split(':').map(Number)
  const [hR, mR] = horaRetorno.split(':').map(Number)
  let mins = (hR * 60 + mR) - (hS * 60 + mS)
  if (mins <= 0) mins += 24 * 60
  return Math.round((distKm / (mins / 60)) * 100) / 100
}

export default function Treinos({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()
  const [treinos, setTreinos] = useState([])
  const [pombos, setPombos] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const [t, p, pf] = await Promise.all([db.getTreinos(), db.getPombos(), db.getPerfil()]); setTreinos(t); setPombos(p); setPerfil(pf) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const pombosAtivos = pombos.filter(p => (!p.estado_ext || p.estado_ext === 'proprio') && p.estado === 'ativo')

  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true); setPesquisaLocal(''); setResultadosPesquisa([]) }
  const openEdit = (t) => {
    setSelected(t)
    setForm({ local: t.local || '', lat_solta: String(t.lat_solta||''), lon_solta: String(t.lon_solta||''), tipo: t.tipo || 'Treino em Linha', dist: String(t.dist || ''), data_reg: t.data_reg?.slice(0, 10) || '', hora_solta: t.hora_solta || '08:00', hora_retorno: t.hora_retorno || '', pombos_n: String(t.pombos_n || ''), retorno: t.retorno || 'Completo', custo: String(t.custo || ''), obs: t.obs || '', pombosIds: t.pombos_ids || [] })
    setModal(true); setPesquisaLocal(''); setResultadosPesquisa([])
  }
  const close = () => { setModal(false); setSelected(null) }

  const [pesquisaLocal, setPesquisaLocal] = useState('')
  const [resultadosPesquisa, setResultadosPesquisa] = useState([])
  const [pesquisandoLocal, setPesquisandoLocal] = useState(false)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const debounceRef = useRef(null)

  const calcDistanciaAoPombal = (lat, lon) => {
    if (!perfil?.pombal_lat || !perfil?.pombal_lon || !lat || !lon) return null
    const R=6371, dLat=(perfil.pombal_lat-lat)*Math.PI/180, dLon=(perfil.pombal_lon-lon)*Math.PI/180
    const a=Math.sin(dLat/2)**2+Math.cos(lat*Math.PI/180)*Math.cos(perfil.pombal_lat*Math.PI/180)*Math.sin(dLon/2)**2
    return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)))
  }

  const pesquisarLocal = (q) => {
    setPesquisaLocal(q); setDropdownAberto(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) { setResultadosPesquisa([]); return }
    debounceRef.current = setTimeout(async () => {
      setPesquisandoLocal(true)
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=pt`)
        const data = await res.json()
        const todos = data.results || []
        const filtrados = todos.filter(l => ['PT','ES'].includes(l.country_code))
        setResultadosPesquisa(filtrados.length > 0 ? filtrados : todos.slice(0,4))
      } catch(e) { setResultadosPesquisa([]) }
      finally { setPesquisandoLocal(false) }
    }, 350)
  }

  const selecionarLocal = (loc) => {
    const dist = calcDistanciaAoPombal(loc.latitude, loc.longitude)
    sf('local', `${loc.name}${loc.admin1?', '+loc.admin1:''} (${loc.country_code})`)
    sf('lat_solta', String(loc.latitude)); sf('lon_solta', String(loc.longitude))
    if (dist && form.tipo === 'Treino em Linha') sf('dist', String(dist))
    setPesquisaLocal(''); setResultadosPesquisa([]); setDropdownAberto(false)
  }

  const togglePombo = (id) => setForm(f => ({ ...f, pombosIds: f.pombosIds.includes(id) ? f.pombosIds.filter(x => x !== id) : [...f.pombosIds, id] }))

  const save = async () => {
    if (!form.local.trim()) { toast('Local obrigatório', 'warn'); return }
    setSaving(true)
    try {
      const vel = calcVel(parseFloat(form.dist), form.hora_solta, form.hora_retorno)
      const payload = { local: form.local.trim(), tipo: form.tipo, dist: form.dist ? parseFloat(form.dist) : null, data_reg: form.data_reg, hora_solta: form.hora_solta, hora_retorno: form.hora_retorno || null, pombos_n: form.pombosIds.length || (form.pombos_n ? parseInt(form.pombos_n) : null), pombos_ids: form.pombosIds, retorno: form.retorno, custo: form.custo ? parseFloat(form.custo) : null, obs: form.obs, velocidade: vel }
      selected ? await db.updateTreino(selected.id, payload) : await db.createTreino(payload)
      toast(selected ? 'Actualizado!' : 'Treino registado!', 'ok'); close(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteTreino(confirm.id); toast('Eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const treinosOrdenados = [...treinos].sort((a, b) => new Date(b.data_reg) - new Date(a.data_reg))
  const totalKm = treinos.reduce((s, t) => s + (t.dist || 0), 0)
  const totalCusto = treinos.reduce((s, t) => s + (t.custo || 0), 0)

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Treinos</div><div className="section-sub">{treinos.length} treinos · {totalKm.toFixed(0)}km totais</div></div>
        <button className="btn btn-primary" onClick={openNew}>＋ Novo Treino</button>
      </div>

      <div className="grid-3 mb-6">
        <div className="kpi"><div className="kpi-val text-blue">{treinos.length}</div><div className="kpi-label">Treinos</div></div>
        <div className="kpi"><div className="kpi-val">{totalKm.toFixed(0)}</div><div className="kpi-label">Km Percorridos</div></div>
        <div className="kpi"><div className="kpi-val text-yellow">{totalCusto.toFixed(0)}€</div><div className="kpi-label">Custo Total</div></div>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : treinos.length === 0 ? <EmptyState icon="🎯" title="Sem treinos" desc="Registe o primeiro treino" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Treino</button>} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {treinosOrdenados.map(t => (
              <div key={t.id} className="card card-p">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#101F40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{TIPO_ICONS[t.tipo] || '🎯'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{t.local}</div>
                    <div style={{ fontSize: 12, color: '#7A8699' }}>{t.tipo} · {t.dist ? t.dist + 'km · ' : ''}{t.pombos_n || '?'} pombos · {new Date(t.data_reg).toLocaleDateString('pt-PT')}</div>
                    {t.velocidade && <div style={{ fontSize: 11, color: '#2DD4A7', fontFamily: "'Space Mono',monospace", marginTop: 2 }}>⚡ {t.velocidade} km/h</div>}
                  </div>
                  <Badge v={retornoBadge[t.retorno] || 'gray'}>{t.retorno}</Badge>
                  <button className="btn btn-icon btn-sm" onClick={() => openEdit(t)}>✏️</button>
                  <button className="btn btn-icon btn-sm" onClick={() => setConfirm(t)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
      }

      <Modal open={modal} onClose={close} title={selected ? '✏️ Editar Treino' : '🎯 Novo Treino'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? t('guardar') : 'Registar'}</button></>}>
        <div className="form-grid">
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e => { sf('tipo', e.target.value); if (e.target.value === 'Treino à Volta do Pombal') { sf('local', perfil?.pombal_nome || 'Pombal'); sf('dist', ''); } }}>{TIPOS.map(t => <option key={t}>{TIPO_ICONS[t]} {t}</option>)}</select></Field>
          <div className="col-2">
            {form.tipo === 'Treino à Volta do Pombal' ? (
              <Field label="Local (volta ao pombal — sem deslocamento)">
                <input className="input" value={form.local || perfil?.pombal_nome || 'Pombal'} onChange={e => sf('local', e.target.value)} />
                <div style={{ fontSize:11, color:'#7A8699', marginTop:4 }}>Distância total em rondas ao pombal</div>
              </Field>
            ) : (
              <Field label="🔍 Local de Solta — pesquise em PT/ES">
                <div style={{ position:'relative' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <input className="input" placeholder="Ex: Évora, Badajoz..." value={pesquisaLocal} onChange={e => pesquisarLocal(e.target.value)} style={{ flex:1 }} />
                    {form.local && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { sf('local',''); sf('lat_solta',''); sf('lon_solta',''); sf('dist',''); setPesquisaLocal('') }}>✕</button>}
                  </div>
                  {form.local && !pesquisaLocal && <div style={{ fontSize:11, color:'#2DD4A7', marginTop:4 }}>✅ {form.local}{form.dist ? ` · ${form.dist}km ao pombal` : ''}</div>}
                  {resultadosPesquisa.length > 0 && dropdownAberto && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#0B1830', border:'1px solid #1B2D52', borderRadius:8, zIndex:200, marginTop:4, boxShadow:'0 8px 24px rgba(0,0,0,.5)' }}>
                      {resultadosPesquisa.map((loc,i) => (
                        <div key={i} onClick={() => selecionarLocal(loc)} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:i<resultadosPesquisa.length-1?'1px solid #101F40':'none', fontSize:13 }}
                          onMouseEnter={e=>e.currentTarget.style.background='#101F40'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{ color:'#fff', fontWeight:500 }}>{loc.name}{loc.admin2?`, ${loc.admin2}`:''}</div>
                          <div style={{ fontSize:11, color:'#7A8699' }}>{loc.admin1} · <span style={{ color:loc.country_code==='PT'?'#4C8DFF':'#D4AF37', fontWeight:600 }}>{loc.country_code}</span></div>
                        </div>
                      ))}
                      <div onClick={() => { setResultadosPesquisa([]); setDropdownAberto(false) }} style={{ padding:'8px 14px', fontSize:11, color:'#7A8699', cursor:'pointer', textAlign:'center' }}>Fechar ✕</div>
                    </div>
                  )}
                </div>
              </Field>
            )}
          </div>
          <Field label="Distância (km)"><input className="input" type="number" placeholder={form.tipo==='Treino à Volta do Pombal'?'Total em rondas':'80'} value={form.dist} onChange={e => sf('dist', e.target.value)} /></Field>
          <Field label="Data"><input className="input" type="date" value={form.data_reg} onChange={e => sf('data_reg', e.target.value)} /></Field>
          <Field label="Hora de Solta"><input className="input" type="time" value={form.hora_solta} onChange={e => sf('hora_solta', e.target.value)} /></Field>
          <Field label="Hora de Retorno"><input className="input" type="time" value={form.hora_retorno} onChange={e => sf('hora_retorno', e.target.value)} /></Field>
          <Field label="Estado de Retorno"><select className="input" value={form.retorno} onChange={e => sf('retorno', e.target.value)}>{RETORNOS.map(r => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Custo (€)"><input className="input" type="number" step="0.01" placeholder="combustível, portagens..." value={form.custo} onChange={e => sf('custo', e.target.value)} /></Field>
          <div className="col-2">
            <Field label={`Pombos participantes (${form.pombosIds.length} seleccionados)`}>
              {form.pombosIds.some(id => { const p = pombosAtivos.find(x => x.id === id); return p && classificarPombo(p).prioridade <= 1 }) && (
                <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 11, color: '#f87171' }}>
                  ⚠️ Seleccionou pombo(s) lesionado(s) ou em queda de rendimento — confirme se estão aptos para o treino.
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto', padding: '8px 0' }}>
                {pombosAtivos.map(p => {
                  const c = classificarPombo(p)
                  const atencao = c.prioridade <= 1
                  return (
                    <button key={p.id} type="button" onClick={() => togglePombo(p.id)}
                      className={`chip${form.pombosIds.includes(p.id) ? ' active' : ''}`} style={{ fontSize: 11, borderColor: atencao && !form.pombosIds.includes(p.id) ? 'rgba(239,68,68,.3)' : undefined }}>
                      {p.emoji} {p.nome}{atencao ? ' 🏥' : ''}
                    </button>
                  )
                })}
              </div>
              {form.pombosIds.length === 0 && <input className="input" type="number" placeholder="Ou indique apenas o número de pombos" value={form.pombos_n} onChange={e => sf('pombos_n', e.target.value)} style={{ marginTop: 6 }} />}
            </Field>
          </div>
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize: 'none' }} value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field></div>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar treino"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar treino em "{confirm?.local}"?</p>
      </Modal>
    </div>
  )
}
