import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const SUGESTOES = [
  { titulo: 'Limpeza geral do pombal', cat: 'Manutenção', dias: 7 },
  { titulo: 'Desinfeção de bebedouros', cat: 'Manutenção', dias: 3 },
  { titulo: 'Verificar stock de cereais', cat: 'Alimentação', dias: 7 },
  { titulo: 'Vermifugação geral', cat: 'Saúde', dias: 90 },
  { titulo: 'Vacinação Paramyxovirus', cat: 'Saúde', dias: 365 },
  { titulo: 'Tratamento contra coccidiose', cat: 'Saúde', dias: 30 },
  { titulo: 'Inscrição na federação para a época', cat: 'Administrativo', dias: 1 },
  { titulo: 'Revisão de anilhas e registos', cat: 'Administrativo', dias: 30 },
  { titulo: 'Corte de unhas e bico (se necessário)', cat: 'Saúde', dias: 60 },
  { titulo: 'Pesagem geral do efectivo', cat: 'Saúde', dias: 14 },
]
const CATS = ['Manutenção', 'Alimentação', 'Saúde', 'Administrativo', 'Treino', 'Outro']
const catIcon = { 'Manutenção': '🧹', 'Alimentação': '🌾', 'Saúde': '🏥', 'Administrativo': '📋', 'Treino': '🎯', 'Outro': '📌' }
const EMPTY = { titulo: '', cat: 'Manutenção', data_prevista: new Date().toISOString().slice(0, 10), estado: 'por_iniciar', obs: '' }

export default function Checklist({ nav }) {
  const toast = useToast()
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [filtro, setFiltro] = useState('pendentes')
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { setTarefas(await db.getTarefas()) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const hoje = new Date().toISOString().slice(0, 10)
  const isAtrasada = (t) => t.estado === 'por_iniciar' && t.data_prevista && t.data_prevista < hoje

  const openNew = (presetTitulo) => { setForm(presetTitulo ? { ...EMPTY, titulo: presetTitulo.titulo, cat: presetTitulo.cat, data_prevista: new Date(Date.now() + presetTitulo.dias * 86400000).toISOString().slice(0, 10) } : EMPTY); setSelected(null); setModal(true) }
  const openEdit = (t) => { setSelected(t); setForm({ titulo: t.titulo || '', cat: t.cat || 'Manutenção', data_prevista: t.data_prevista || '', estado: t.estado || 'por_iniciar', obs: t.obs || '' }); setModal(true) }
  const close = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if (!form.titulo.trim()) { toast('Título obrigatório', 'warn'); return }
    setSaving(true)
    try {
      const payload = { titulo: form.titulo.trim(), cat: form.cat, data_prevista: form.data_prevista || null, estado: form.estado, obs: form.obs }
      selected ? await db.updateTarefa(selected.id, payload) : await db.createTarefa(payload)
      toast(selected ? 'Actualizada!' : 'Tarefa adicionada!', 'ok'); close(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteTarefa(confirm.id); toast('Eliminada', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const toggleConcluida = async (t) => {
    try { await db.updateTarefa(t.id, { estado: t.estado === 'concluida' ? 'por_iniciar' : 'concluida' }); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const filtered = tarefas.filter(t => {
    if (filtro === 'pendentes') return t.estado === 'por_iniciar'
    if (filtro === 'atrasadas') return isAtrasada(t)
    if (filtro === 'concluidas') return t.estado === 'concluida'
    return true
  })

  const atrasadasCount = tarefas.filter(isAtrasada).length
  const pendentesCount = tarefas.filter(t => t.estado === 'por_iniciar').length
  const concluidasCount = tarefas.filter(t => t.estado === 'concluida').length

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Checklist</div><div className="section-sub">{pendentesCount} pendentes · {atrasadasCount} atrasadas</div></div>
        <button className="btn btn-primary" onClick={() => openNew()}>＋ Nova Tarefa</button>
      </div>

      <div className="grid-3 mb-6">
        <div className="kpi"><div className="kpi-val text-yellow">{pendentesCount}</div><div className="kpi-label">Pendentes</div></div>
        <div className="kpi"><div className="kpi-val text-red">{atrasadasCount}</div><div className="kpi-label">Atrasadas</div></div>
        <div className="kpi"><div className="kpi-val text-green">{concluidasCount}</div><div className="kpi-label">Concluídas</div></div>
      </div>

      <div className="card card-p mb-6">
        <div style={{ fontWeight: 600, color: '#fff', marginBottom: 10 }}>💡 Sugestões Rápidas</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SUGESTOES.map((s, i) => (
            <button key={i} className="chip" onClick={() => openNew(s)}>{catIcon[s.cat]} {s.titulo}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#1a2840', borderRadius: 10, padding: 4, marginBottom: 16, overflowX: 'auto' }}>
        {[['pendentes', 'Pendentes'], ['atrasadas', 'Atrasadas'], ['concluidas', 'Concluídas'], ['todas', 'Todas']].map(([f, l]) => (
          <button key={f} onClick={() => setFiltro(f)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap', background: filtro === f ? '#1ed98a' : 'none', color: filtro === f ? '#0a0f14' : '#94a3b8' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : filtered.length === 0 ? <EmptyState icon="✅" title="Nada por aqui" desc="Sem tarefas nesta categoria" />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(t => {
              const atrasada = isAtrasada(t)
              return (
                <div key={t.id} className="card card-p" style={{ borderColor: atrasada ? 'rgba(239,68,68,.3)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => toggleConcluida(t)} style={{ width: 22, height: 22, borderRadius: 6, border: t.estado === 'concluida' ? 'none' : '2px solid #243860', background: t.estado === 'concluida' ? '#1ed98a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 13 }}>
                      {t.estado === 'concluida' && '✓'}
                    </button>
                    <div style={{ fontSize: 18 }}>{catIcon[t.cat] || '📌'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: t.estado === 'concluida' ? '#64748b' : '#fff', textDecoration: t.estado === 'concluida' ? 'line-through' : 'none' }}>{t.titulo}</div>
                      <div style={{ fontSize: 11, color: atrasada ? '#f87171' : '#64748b' }}>{t.cat}{t.data_prevista ? ` · ${atrasada ? '⚠️ Atrasada desde ' : 'Prevista para '}${new Date(t.data_prevista).toLocaleDateString('pt-PT')}` : ''}</div>
                    </div>
                    <button className="btn btn-icon btn-sm" onClick={() => openEdit(t)}>✏️</button>
                    <button className="btn btn-icon btn-sm" onClick={() => setConfirm(t)}>🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
      }

      <Modal open={modal} onClose={close} title={selected ? '✏️ Editar Tarefa' : '✅ Nova Tarefa'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? 'Guardar' : 'Adicionar'}</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Título *"><input className="input" placeholder="Ex: Limpeza geral do pombal" value={form.titulo} onChange={e => sf('titulo', e.target.value)} /></Field>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Categoria"><select className="input" value={form.cat} onChange={e => sf('cat', e.target.value)}>{CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Data Prevista"><input className="input" type="date" value={form.data_prevista} onChange={e => sf('data_prevista', e.target.value)} /></Field>
          </div>
          {selected && (
            <Field label="Estado">
              <select className="input" value={form.estado} onChange={e => sf('estado', e.target.value)}>
                <option value="por_iniciar">Por Iniciar</option>
                <option value="concluida">Concluída</option>
              </select>
            </Field>
          )}
          <Field label="Observações"><textarea className="input" rows={2} style={{ resize: 'none' }} value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar tarefa"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar "{confirm?.titulo}"?</p>
      </Modal>
    </div>
  )
}
