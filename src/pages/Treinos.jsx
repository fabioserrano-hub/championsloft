import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const TIPOS = ['Voo Livre', 'Treino em Linha', 'Solta Local', 'Adestramento']
const RETORNOS = ['Completo', 'Parcial', 'Com Perdas']
const retornoBadge = { 'Completo': 'green', 'Parcial': 'yellow', 'Com Perdas': 'red' }
const EMPTY = { local: '', tipo: 'Voo Livre', dist: '', data_reg: new Date().toISOString().slice(0, 10), hora_solta: '08:00', hora_retorno: '', pombos_n: '', retorno: 'Completo', custo: '', obs: '', pombosIds: [] }

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
  const [treinos, setTreinos] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const [t, p] = await Promise.all([db.getTreinos(), db.getPombos()]); setTreinos(t); setPombos(p) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const pombosAtivos = pombos.filter(p => (!p.estado_ext || p.estado_ext === 'proprio') && p.estado === 'ativo')

  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true) }
  const openEdit = (t) => {
    setSelected(t)
    setForm({ local: t.local || '', tipo: t.tipo || 'Voo Livre', dist: String(t.dist || ''), data_reg: t.data_reg?.slice(0, 10) || '', hora_solta: t.hora_solta || '08:00', hora_retorno: t.hora_retorno || '', pombos_n: String(t.pombos_n || ''), retorno: t.retorno || 'Completo', custo: String(t.custo || ''), obs: t.obs || '', pombosIds: t.pombos_ids || [] })
    setModal(true)
  }
  const close = () => { setModal(false); setSelected(null) }

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
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1a2840', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎯</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{t.local}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{t.tipo} · {t.dist ? t.dist + 'km · ' : ''}{t.pombos_n || '?'} pombos · {new Date(t.data_reg).toLocaleDateString('pt-PT')}</div>
                    {t.velocidade && <div style={{ fontSize: 11, color: '#1ed98a', fontFamily: 'JetBrains Mono', marginTop: 2 }}>⚡ {t.velocidade} km/h</div>}
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
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? 'Guardar' : 'Registar'}</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Local *"><input className="input" placeholder="Ex: Évora" value={form.local} onChange={e => sf('local', e.target.value)} /></Field></div>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e => sf('tipo', e.target.value)}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Distância (km)"><input className="input" type="number" placeholder="80" value={form.dist} onChange={e => sf('dist', e.target.value)} /></Field>
          <Field label="Data"><input className="input" type="date" value={form.data_reg} onChange={e => sf('data_reg', e.target.value)} /></Field>
          <Field label="Hora de Solta"><input className="input" type="time" value={form.hora_solta} onChange={e => sf('hora_solta', e.target.value)} /></Field>
          <Field label="Hora de Retorno"><input className="input" type="time" value={form.hora_retorno} onChange={e => sf('hora_retorno', e.target.value)} /></Field>
          <Field label="Estado de Retorno"><select className="input" value={form.retorno} onChange={e => sf('retorno', e.target.value)}>{RETORNOS.map(r => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Custo (€)"><input className="input" type="number" step="0.01" placeholder="combustível, portagens..." value={form.custo} onChange={e => sf('custo', e.target.value)} /></Field>
          <div className="col-2">
            <Field label={`Pombos participantes (${form.pombosIds.length} seleccionados)`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto', padding: '8px 0' }}>
                {pombosAtivos.map(p => (
                  <button key={p.id} type="button" onClick={() => togglePombo(p.id)}
                    className={`chip${form.pombosIds.includes(p.id) ? ' active' : ''}`} style={{ fontSize: 11 }}>
                    {p.emoji} {p.nome}
                  </button>
                ))}
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
