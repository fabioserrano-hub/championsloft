import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const EMPTY = { titulo: '', data_evento: new Date().toISOString().slice(0, 10), tipo: 'Outro', obs: '' }
const tipoIcon = { 'Prova': '🏆', 'Treino': '🎯', 'Tarefa': '✅', 'Reprodução': '🥚', 'Outro': '📌' }
const tipoCor = { 'Prova': '#facc15', 'Treino': '#60a5fa', 'Tarefa': '#1ed98a', 'Reprodução': '#c084fc', 'Outro': '#94a3b8' }

export default function Calendario({ nav }) {
  const toast = useToast()
  const [mesAtual, setMesAtual] = useState(new Date())
  const [provas, setProvas] = useState([])
  const [treinos, setTreinos] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, t, tf, ev] = await Promise.all([db.getProvas(), db.getTreinos(), db.getTarefas(), db.getEventosCal()])
      setProvas(p); setTreinos(t); setTarefas(tf); setEventos(ev)
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const todosEventos = [
    ...provas.map(p => ({ id: 'prova-' + p.id, titulo: p.nome, data: p.data_reg?.slice(0, 10), tipo: 'Prova', origem: p })),
    ...treinos.map(t => ({ id: 'treino-' + t.id, titulo: t.local, data: t.data_reg?.slice(0, 10), tipo: 'Treino', origem: t })),
    ...tarefas.filter(t => t.data_prevista).map(t => ({ id: 'tarefa-' + t.id, titulo: t.titulo, data: t.data_prevista, tipo: 'Tarefa', origem: t, concluida: t.estado === 'concluida' })),
    ...eventos.map(e => ({ id: 'evento-' + e.id, titulo: e.titulo, data: e.data_evento?.slice(0, 10), tipo: e.tipo || 'Outro', origem: e, manual: true })),
  ].filter(e => e.data)

  const ano = mesAtual.getFullYear(), mes = mesAtual.getMonth()
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const hojeStr = new Date().toISOString().slice(0, 10)

  const eventosNoDia = (dia) => {
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return todosEventos.filter(e => e.data === dataStr)
  }

  const mudarMes = (delta) => setMesAtual(new Date(ano, mes + delta, 1))

  const abrirNovoEvento = (dia) => {
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    setForm({ ...EMPTY, data_evento: dataStr })
    setModal(true)
  }

  const save = async () => {
    if (!form.titulo.trim()) { toast('Título obrigatório', 'warn'); return }
    setSaving(true)
    try {
      await db.createEventoCal({ titulo: form.titulo.trim(), data_evento: form.data_evento, tipo: form.tipo, obs: form.obs })
      toast('Evento criado!', 'ok'); setModal(false); load()
    } catch (e) { toast('Erro: ' + e.message + ' (verifique se a tabela eventos_cal existe no Supabase)', 'err') }
    finally { setSaving(false) }
  }

  const irParaOrigem = (ev) => {
    if (ev.tipo === 'Prova') nav?.('provas')
    else if (ev.tipo === 'Treino') nav?.('treinos')
    else if (ev.tipo === 'Tarefa') nav?.('checklist')
  }

  const proximosEventos = todosEventos.filter(e => e.data >= hojeStr && !e.concluida).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 6)

  const diasArray = []
  for (let i = 0; i < primeiroDia; i++) diasArray.push(null)
  for (let d = 1; d <= totalDias; d++) diasArray.push(d)

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Calendário</div><div className="section-sub">{MESES[mes]} {ano}</div></div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-icon" onClick={() => mudarMes(-1)}>‹</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setMesAtual(new Date())}>Hoje</button>
          <button className="btn btn-icon" onClick={() => mudarMes(1)}>›</button>
        </div>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : <>
          <div className="card card-p mb-6">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
              {DIAS_SEMANA.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, color: '#64748b', fontWeight: 600 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {diasArray.map((dia, i) => {
                if (!dia) return <div key={i} />
                const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                const evs = eventosNoDia(dia)
                const isHoje = dataStr === hojeStr
                return (
                  <div key={i} onClick={() => setDiaSelecionado(dataStr)}
                    style={{ aspectRatio: '1', borderRadius: 8, padding: 4, cursor: 'pointer', background: isHoje ? 'rgba(30,217,138,.1)' : diaSelecionado === dataStr ? '#243860' : '#1a2840', border: isHoje ? '1px solid #1ed98a' : '1px solid transparent', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                    <div style={{ fontSize: 11, fontWeight: isHoje ? 700 : 500, color: isHoje ? '#1ed98a' : '#cbd5e1' }}>{dia}</div>
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {evs.slice(0, 3).map((e, j) => <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: tipoCor[e.tipo] }} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {diaSelecionado && (
            <div className="card card-p mb-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: '#fff' }}>{new Date(diaSelecionado).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                <button className="btn btn-secondary btn-sm" onClick={() => abrirNovoEvento(parseInt(diaSelecionado.split('-')[2]))}>＋ Evento</button>
              </div>
              {eventosNoDia(parseInt(diaSelecionado.split('-')[2])).length === 0
                ? <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '10px 0' }}>Sem eventos neste dia</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {eventosNoDia(parseInt(diaSelecionado.split('-')[2])).map(e => (
                      <div key={e.id} onClick={() => !e.manual && irParaOrigem(e)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#1a2840', borderRadius: 10, cursor: e.manual ? 'default' : 'pointer' }}>
                        <span style={{ fontSize: 16 }}>{tipoIcon[e.tipo]}</span>
                        <span style={{ flex: 1, fontSize: 13, color: e.concluida ? '#64748b' : '#fff', textDecoration: e.concluida ? 'line-through' : 'none' }}>{e.titulo}</span>
                        <Badge v="gray">{e.tipo}</Badge>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}

          <div className="card card-p">
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>📅 Próximos Eventos</div>
            {proximosEventos.length === 0
              ? <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '10px 0' }}>Sem eventos agendados</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {proximosEventos.map(e => (
                    <div key={e.id} onClick={() => !e.manual && irParaOrigem(e)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: e.manual ? 'default' : 'pointer' }}>
                      <span style={{ fontSize: 16 }}>{tipoIcon[e.tipo]}</span>
                      <span style={{ flex: 1, fontSize: 13, color: '#fff' }}>{e.titulo}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(e.data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        </>
      }

      <Modal open={modal} onClose={() => setModal(false)} title="📅 Novo Evento"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}Criar</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Título *"><input className="input" value={form.titulo} onChange={e => sf('titulo', e.target.value)} /></Field>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Data"><input className="input" type="date" value={form.data_evento} onChange={e => sf('data_evento', e.target.value)} /></Field>
            <Field label="Tipo"><select className="input" value={form.tipo} onChange={e => sf('tipo', e.target.value)}>{['Outro', 'Reprodução'].map(t => <option key={t}>{t}</option>)}</select></Field>
          </div>
          <Field label="Observações"><input className="input" value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field>
        </div>
      </Modal>
    </div>
  )
}
