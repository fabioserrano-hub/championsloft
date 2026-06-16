import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const ESTADOS = ['em_progresso', 'concluido', 'cancelado']
const estadoLabel = { em_progresso: 'Em Progresso', concluido: 'Concluído', cancelado: 'Cancelado' }
const estadoBadge = { em_progresso: 'yellow', concluido: 'green', cancelado: 'gray' }
const EMPTY = { pai_id: '', mae_id: '', cacifo: '', data_acasalamento: new Date().toISOString().slice(0, 10), data_ovos_prev: '', data_eclosao_prev: '', estado: 'em_progresso', ninhadas: '0', obs: '' }

function addDias(dataStr, dias) {
  if (!dataStr) return ''
  const d = new Date(dataStr)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

export default function Reproducao({ nav, params }) {
  const toast = useToast()
  const [acasalamentos, setAcasalamentos] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('acasalamentos')
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [pedigreePombo, setPedigreePombo] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const [a, p] = await Promise.all([db.getAcasalamentos(), db.getPombos()]); setAcasalamentos(a); setPombos(p) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Ligação cruzada vinda de Pombos.jsx → "Ver Pedigree"
  useEffect(() => {
    if (params?.tab === 'pedigree' && params?.pomboId && pombos.length) {
      const p = pombos.find(x => x.id === params.pomboId)
      if (p) { setTab('pedigree'); setPedigreePombo(p) }
    }
  }, [params, pombos])

  const machos = pombos.filter(p => p.sexo === 'M' && (!p.estado_ext || p.estado_ext === 'proprio'))
  const femeas = pombos.filter(p => p.sexo === 'F' && (!p.estado_ext || p.estado_ext === 'proprio'))

  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true) }
  const openEdit = (a) => { setSelected(a); setForm({ pai_id: a.pai_id || '', mae_id: a.mae_id || '', cacifo: a.cacifo || '', data_acasalamento: a.data_acasalamento?.slice(0, 10) || '', data_ovos_prev: a.data_ovos_prev?.slice(0, 10) || '', data_eclosao_prev: a.data_eclosao_prev?.slice(0, 10) || '', estado: a.estado || 'em_progresso', ninhadas: String(a.ninhadas || 0), obs: a.obs || '' }); setModal(true) }
  const close = () => { setModal(false); setSelected(null) }

  const onChangeDataAcasalamento = (v) => {
    sf('data_acasalamento', v)
    if (!selected) { sf('data_ovos_prev', addDias(v, 10)); sf('data_eclosao_prev', addDias(v, 18)) }
  }

  const save = async () => {
    if (!form.pai_id || !form.mae_id) { toast('Seleccione pai e mãe', 'warn'); return }
    setSaving(true)
    try {
      const pai = pombos.find(p => p.id === form.pai_id)
      const mae = pombos.find(p => p.id === form.mae_id)
      const payload = { pai_id: form.pai_id, mae_id: form.mae_id, pai_nome: `${pai?.nome} (${pai?.anilha})`, mae_nome: `${mae?.nome} (${mae?.anilha})`, cacifo: form.cacifo, data_acasalamento: form.data_acasalamento, data_ovos_prev: form.data_ovos_prev || null, data_eclosao_prev: form.data_eclosao_prev || null, estado: form.estado, ninhadas: parseInt(form.ninhadas) || 0, obs: form.obs }
      selected ? await db.updateAcasalamento(selected.id, payload) : await db.createAcasalamento(payload)
      toast(selected ? 'Actualizado!' : 'Acasalamento registado!', 'ok'); close(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteAcasalamento(confirm.id); toast('Eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const criarBorrachinho = async (acasalamento) => {
    try {
      const pai = pombos.find(p => p.id === acasalamento.pai_id)
      const mae = pombos.find(p => p.id === acasalamento.mae_id)
      const num = (acasalamento.ninhadas || 0) + 1
      await db.createPombo({
        anilha: '', nome: `Borrachinho ${pai?.nome?.slice(0, 4) || ''}×${mae?.nome?.slice(0, 4) || ''} #${num}`,
        sexo: 'M', cor: pai?.cor || '', esp: pai?.esp || ['velocidade'], estado: 'inativo', estado_ext: 'proprio',
        pombal: pai?.pombal || '', pai: pai?.anilha || '', mae: mae?.anilha || '', emoji: '🐣',
        obs: `Nascido do acasalamento ${acasalamento.pai_nome} × ${acasalamento.mae_nome}`, provas: 0, percentil: 0, forma: 50,
      })
      await db.updateAcasalamento(acasalamento.id, { ninhadas: num })
      toast('Borrachinho criado em Pombos! 🐣', 'ok')
      load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const irParaPombosFiltrado = () => nav?.('pombos')

  // --- Pedigree ---
  const buscarAscendente = (anilha, geracoes = 3) => {
    if (!anilha || geracoes === 0) return null
    const p = pombos.find(x => x.anilha === anilha)
    if (!p) return { anilha, nome: null }
    return { ...p, paiNode: buscarAscendente(p.pai, geracoes - 1), maeNode: buscarAscendente(p.mae, geracoes - 1) }
  }

  const PedigreeNode = ({ node, label }) => {
    if (!node) return (
      <div style={{ background: '#1a2840', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#475569', textAlign: 'center', minWidth: 110 }}>
        {label || 'Desconhecido'}
      </div>
    )
    return (
      <div style={{ background: '#1a2840', border: '1px solid #243860', borderRadius: 8, padding: '6px 10px', fontSize: 11, textAlign: 'center', minWidth: 110 }}>
        <div style={{ color: '#fff', fontWeight: 600 }}>{node.nome || '—'}</div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#1ed98a' }}>{node.anilha}</div>
      </div>
    )
  }

  const acasalamentosOrdenados = [...acasalamentos].sort((a, b) => new Date(b.data_acasalamento) - new Date(a.data_acasalamento))
  const ativos = acasalamentos.filter(a => a.estado === 'em_progresso')

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Reprodução</div><div className="section-sub">{acasalamentos.length} acasalamentos · {ativos.length} activos</div></div>
        {tab === 'acasalamentos' && <button className="btn btn-primary" onClick={openNew}>＋ Novo Acasalamento</button>}
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#1a2840', borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {[['acasalamentos', '🥚 Acasalamentos'], ['pedigree', '🌳 Pedigree']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: tab === t ? '#1ed98a' : 'none', color: tab === t ? '#0a0f14' : '#94a3b8' }}>{l}</button>
        ))}
      </div>

      {tab === 'acasalamentos' && (
        loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : acasalamentos.length === 0 ? <EmptyState icon="🥚" title="Sem acasalamentos" desc="Registe o primeiro acasalamento da época" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Acasalamento</button>} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {acasalamentosOrdenados.map(a => (
              <div key={a.id} className="card card-p">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 22 }}>🥚</div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.pai_nome} × {a.mae_nome}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{a.cacifo ? `Cacifo ${a.cacifo} · ` : ''}Acasalado: {new Date(a.data_acasalamento).toLocaleDateString('pt-PT')}{a.data_eclosao_prev ? ` · 🐣 prev. ${new Date(a.data_eclosao_prev).toLocaleDateString('pt-PT')}` : ''}</div>
                    {a.obs && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{a.obs}</div>}
                  </div>
                  <Badge v={estadoBadge[a.estado]}>{estadoLabel[a.estado]}</Badge>
                  <div style={{ fontSize: 12, color: '#facc15', fontWeight: 600 }}>{a.ninhadas || 0} ninhada(s)</div>
                  {a.estado === 'em_progresso' && <button className="btn btn-secondary btn-sm" onClick={() => criarBorrachinho(a)}>🐣 Registar Nascimento</button>}
                  <button className="btn btn-icon btn-sm" onClick={() => openEdit(a)}>✏️</button>
                  <button className="btn btn-icon btn-sm" onClick={() => setConfirm(a)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
      )}

      {tab === 'pedigree' && (
        <div>
          <Field label="Seleccionar pombo">
            <select className="input" value={pedigreePombo?.id || ''} onChange={e => setPedigreePombo(pombos.find(p => p.id === e.target.value) || null)}>
              <option value="">— Seleccionar —</option>
              {pombos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}
            </select>
          </Field>

          {pedigreePombo ? (
            <div className="card card-p" style={{ marginTop: 16, overflowX: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{pedigreePombo.nome}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#1ed98a' }}>{pedigreePombo.anilha}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', minWidth: 500 }}>
                <div style={{ display: 'flex', gap: 40 }}>
                  <PedigreeNode node={buscarAscendente(pedigreePombo.pai, 1)} label="Pai desconhecido" />
                  <PedigreeNode node={buscarAscendente(pedigreePombo.mae, 1)} label="Mãe desconhecida" />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[buscarAscendente(pedigreePombo.pai, 2)?.paiNode, buscarAscendente(pedigreePombo.pai, 2)?.maeNode, buscarAscendente(pedigreePombo.mae, 2)?.paiNode, buscarAscendente(pedigreePombo.mae, 2)?.maeNode].map((n, i) => (
                    <PedigreeNode key={i} node={n} label="Desconhecido" />
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={irParaPombosFiltrado}>🐦 Ver na lista de Pombos</button>
              </div>
            </div>
          ) : (
            <EmptyState icon="🌳" title="Seleccione um pombo" desc="Escolha um pombo para visualizar o pedigree" />
          )}
        </div>
      )}

      <Modal open={modal} onClose={close} title={selected ? '✏️ Editar Acasalamento' : '🥚 Novo Acasalamento'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? 'Guardar' : 'Registar'}</button></>}>
        <div className="form-grid">
          <Field label="Pai (Macho) *">
            <select className="input" value={form.pai_id} onChange={e => sf('pai_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {machos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}
            </select>
          </Field>
          <Field label="Mãe (Fêmea) *">
            <select className="input" value={form.mae_id} onChange={e => sf('mae_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {femeas.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}
            </select>
          </Field>
          <Field label="Cacifo"><input className="input" placeholder="Ex: A-12" value={form.cacifo} onChange={e => sf('cacifo', e.target.value)} /></Field>
          <Field label="Estado"><select className="input" value={form.estado} onChange={e => sf('estado', e.target.value)}>{ESTADOS.map(e => <option key={e} value={e}>{estadoLabel[e]}</option>)}</select></Field>
          <Field label="Data de Acasalamento"><input className="input" type="date" value={form.data_acasalamento} onChange={e => onChangeDataAcasalamento(e.target.value)} /></Field>
          <Field label="Previsão de Ovos"><input className="input" type="date" value={form.data_ovos_prev} onChange={e => sf('data_ovos_prev', e.target.value)} /></Field>
          <Field label="Previsão de Eclosão"><input className="input" type="date" value={form.data_eclosao_prev} onChange={e => sf('data_eclosao_prev', e.target.value)} /></Field>
          <Field label="Nº Ninhadas"><input className="input" type="number" value={form.ninhadas} onChange={e => sf('ninhadas', e.target.value)} /></Field>
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize: 'none' }} value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field></div>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar acasalamento"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar este acasalamento?</p>
      </Modal>
    </div>
  )
}

