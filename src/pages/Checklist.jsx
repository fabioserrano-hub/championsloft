import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useIdioma } from '../hooks/useIdioma'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'

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
const PRIORIDADES = ['alta','media','baixa']
const priCor = { alta:'#f87171', media:'#D4AF37', baixa:'#2DD4A7' }
const priIcon = { alta:'🔴', media:'🟡', baixa:'🟢' }
const catIcon = { 'Manutenção': '🧹', 'Alimentação': '🌾', 'Saúde': '🏥', 'Administrativo': '📋', 'Treino': '🎯', 'Outro': '📌' }
const catCor = { 'Manutenção': '#4C8DFF', 'Alimentação': '#2DD4A7', 'Saúde': '#f87171', 'Administrativo': '#D4AF37', 'Treino': '#C084FC', 'Outro': '#94a3b8' }
const EMPTY = { titulo: '', cat: 'Manutenção', prioridade:'media', data_prevista: new Date().toISOString().slice(0, 10), estado: 'por_iniciar', obs: '', recorrencia_dias: '' }

export default function Checklist({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [filtro, setFiltro] = useState('pendentes')
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [agrupar, setAgrupar] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setTarefas(await db.getTarefas()) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const hoje = new Date().toISOString().slice(0, 10)
  const isAtrasada = (t) => t.estado === 'por_iniciar' && t.data_prevista && t.data_prevista < hoje

  const openNew = (presetTitulo) => { setForm(presetTitulo ? { ...EMPTY, titulo: presetTitulo.titulo, cat: presetTitulo.cat, data_prevista: new Date(Date.now() + presetTitulo.dias * 86400000).toISOString().slice(0, 10), recorrencia_dias: presetTitulo.dias } : EMPTY); setSelected(null); setModal(true) }
  const openEdit = (t) => { setSelected(t); setForm({ titulo: t.titulo || '', cat: t.cat || 'Manutenção', prioridade: t.prioridade||'media', data_prevista: t.data_prevista || '', estado: t.estado || 'por_iniciar', obs: t.obs || '', recorrencia_dias: t.recorrencia_dias || '' }); setModal(true) }
  const close = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if (!form.titulo.trim()) { toast('Título obrigatório', 'warn'); return }
    setSaving(true)
    try {
      const payload = { titulo: form.titulo.trim(), cat: form.cat, prioridade: form.prioridade||'media', data_prevista: form.data_prevista || null, estado: form.estado, obs: form.obs, recorrencia_dias: form.recorrencia_dias ? parseInt(form.recorrencia_dias) : null }
      selected ? await db.updateTarefa(selected.id, payload) : await db.createTarefa(payload)
      toast(selected ? 'Actualizada!' : 'Tarefa adicionada!', 'ok'); close(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteTarefa(confirm.id); toast('Eliminada', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const [confirmRecorrencia, setConfirmRecorrencia] = useState(null)

  const toggleConcluida = async (t) => {
    try {
      const ficouConcluida = t.estado !== 'concluida'
      await db.updateTarefa(t.id, { estado: ficouConcluida ? 'concluida' : 'por_iniciar' })
      if (ficouConcluida && t.recorrencia_dias) { setConfirmRecorrencia(t); return }
      load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const criarProximaOcorrencia = async () => {
    try {
      const proxData = new Date(Date.now() + confirmRecorrencia.recorrencia_dias * 86400000).toISOString().slice(0, 10)
      await db.createTarefa({ titulo: confirmRecorrencia.titulo, cat: confirmRecorrencia.cat, data_prevista: proxData, estado: 'por_iniciar', obs: confirmRecorrencia.obs, recorrencia_dias: confirmRecorrencia.recorrencia_dias })
      toast('Próxima ocorrência agendada!', 'ok'); setConfirmRecorrencia(null); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
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
      <GuiaAuto modulo="checklist"/>

      {/* Header premium */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(45,212,167,.2)', borderRadius:14, padding:'14px 18px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#16A085,#2DD4A7,#16A085)' }}/>
        <div style={{ position:'absolute', top:'-30%', right:'-5%', width:160, height:160, background:'radial-gradient(circle,rgba(45,212,167,.08) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative' }}>
          <div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
              <span>✅</span> Checklist
            </div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>{pendentesCount} pendentes · {atrasadasCount > 0 ? <span style={{ color:'#f87171' }}>{atrasadasCount} atrasadas</span> : '0 atrasadas'}</div>
            {tarefas.length>0&&<div style={{ height:3, background:'#101F40', borderRadius:2, marginTop:5, maxWidth:200, overflow:'hidden' }}><div style={{ height:'100%', width:`${Math.round(concluidasCount/tarefas.length*100)}%`, background:'#2DD4A7', borderRadius:2 }}/></div>}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <BotaoGuia modulo="checklist"/>
            <button className="btn btn-secondary btn-sm" onClick={()=>setAgrupar(v=>!v)}>{agrupar?'📋 Lista':'📂 Agrupar'}</button>
            <button className="btn btn-primary" onClick={() => openNew()}>+ Nova</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
        {[[pendentesCount,'⏳','Pendentes','#D4AF37'],[atrasadasCount,'⚠️','Atrasadas','#f87171'],[concluidasCount,'✅','Concluídas','#2DD4A7']].map(([v,icon,l,c])=>(
          <div key={l} style={{ background:'#0B1830', border:`1px solid ${c}25`, borderRadius:12, padding:'12px 10px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:c, opacity:.6 }}/>
            <div style={{ fontSize:12, marginBottom:3 }}>{icon}</div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:c }}>{v}</div>
            <div style={{ fontSize:10, color:'#7A8699', marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Alerta atrasadas */}
      {atrasadasCount > 0 && (
        <div onClick={() => setFiltro('atrasadas')} style={{ background:'rgba(248,113,113,.07)', border:'1px solid rgba(248,113,113,.2)', borderRadius:10, padding:'10px 14px', marginBottom:12, cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#f87171' }}>{atrasadasCount} tarefa(s) em atraso</div>
            <div style={{ fontSize:11, color:'#94a3b8' }}>Clique para ver as tarefas atrasadas</div>
          </div>
          <span style={{ color:'#f87171', fontSize:16 }}>→</span>
        </div>
      )}

      {/* Sugestões */}
      <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>💡 Sugestões rápidas</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {SUGESTOES.map((s, i) => (
            <button key={i} onClick={() => openNew(s)}
              style={{ display:'flex', alignItems:'center', gap:5, background:`${catCor[s.cat]}12`, border:`1px solid ${catCor[s.cat]}30`, borderRadius:20, padding:'4px 10px', fontSize:11, color:catCor[s.cat], cursor:'pointer', fontFamily:'inherit' }}>
              {catIcon[s.cat]} {s.titulo}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:12, overflowX:'auto' }}>
        {[['pendentes','⏳ Pendentes'],['atrasadas','⚠️ Atrasadas'],['concluidas','✅ Concluídas'],['todas','Todas']].map(([f,l])=>(
          <button key={f} onClick={() => setFiltro(f)} style={{ flex:1, padding:'8px 10px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:filtro===f?'linear-gradient(135deg,#1E5FD9,#1456C0)':'none', color:filtro===f?'#fff':'#475569' }}>{l}</button>
        ))}
      </div>

      {/* Lista */}
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        : filtered.length === 0 ? <EmptyState icon="✅" title="Nada por aqui" desc="Sem tarefas nesta categoria" />
        : !agrupar ? <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {filtered.map(tarefa => {
              const atrasada = isAtrasada(tarefa)
              const cor = catCor[tarefa.cat] || '#94a3b8'
              return (
                <div key={tarefa.id} style={{ background:'#0B1830', border:`1px solid ${atrasada?'rgba(248,113,113,.25)':'#1B2D52'}`, borderRadius:10, padding:'12px 14px', borderLeft:`3px solid ${atrasada?'#f87171':cor}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <button onClick={() => toggleConcluida(tarefa)}
                      style={{ width:24, height:24, borderRadius:7, border:tarefa.estado==='concluida'?'none':'2px solid #1B2D52', background:tarefa.estado==='concluida'?'#2DD4A7':'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, fontSize:13, transition:'all .2s' }}>
                      {tarefa.estado === 'concluida' && <span style={{ color:'#050D1A', fontWeight:900 }}>✓</span>}
                    </button>
                    <div style={{ width:32, height:32, borderRadius:8, background:`${cor}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                      {catIcon[tarefa.cat] || '📌'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:tarefa.estado==='concluida'?'#475569':'#fff', textDecoration:tarefa.estado==='concluida'?'line-through':'none' }}>{tarefa.titulo}</div>
                      <div style={{ fontSize:11, color:atrasada?'#f87171':'#7A8699', marginTop:2 }}>
                        <span style={{ color:cor, fontWeight:600 }}>{tarefa.cat}</span>
                        {tarefa.data_prevista && <span> · {atrasada?'⚠️ ':''}{new Date(tarefa.data_prevista).toLocaleDateString('pt-PT')}</span>}
                        {tarefa.recorrencia_dias && <span> · 🔁 {tarefa.recorrencia_dias}d</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                      <span title={tarefa.prioridade} style={{ fontSize:12 }}>{priIcon[tarefa.prioridade||'media']}</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(tarefa)}>✏️</button>
                      <button className="btn btn-icon btn-sm" onClick={() => setConfirm(tarefa)}>🗑️</button>
                    </div>
                  </div>
                  {tarefa.obs && <div style={{ fontSize:11, color:'#7A8699', marginTop:8, paddingTop:8, borderTop:'1px solid #162040', fontStyle:'italic' }}>{tarefa.obs}</div>}
                </div>
              )
            })}
          </div>
      </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {CATS.filter(cat=>filtered.some(t=>t.cat===cat)).map(cat=>{
              const grupo = filtered.filter(t=>t.cat===cat)
              const cor = catCor[cat]||'#94a3b8'
              return (
                <div key={cat}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:16 }}>{catIcon[cat]}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:cor }}>{cat}</span>
                    <span style={{ fontSize:11, color:'#475569' }}>({grupo.length})</span>
                    <div style={{ flex:1, height:1, background:'#1B2D52' }}/>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {grupo.sort((a,b)=>{ const p={alta:0,media:1,baixa:2}; return (p[a.prioridade||'media']||1)-(p[b.prioridade||'media']||1) }).map(tarefa=>{
                      const atrasada=isAtrasada(tarefa)
                      const cor2=catCor[tarefa.cat]||'#94a3b8'
                      return (
                        <div key={tarefa.id} style={{ background:'#0B1830', border:`1px solid ${atrasada?'rgba(248,113,113,.25)':'#1B2D52'}`, borderRadius:9, padding:'10px 12px', borderLeft:`3px solid ${atrasada?'#f87171':cor2}` }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <button onClick={()=>toggleConcluida(tarefa)} style={{ width:22,height:22,borderRadius:6,border:tarefa.estado==='concluida'?'none':'2px solid #1B2D52',background:tarefa.estado==='concluida'?'#2DD4A7':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,fontSize:11 }}>
                              {tarefa.estado==='concluida'&&<span style={{ color:'#050D1A',fontWeight:900 }}>✓</span>}
                            </button>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12,fontWeight:600,color:tarefa.estado==='concluida'?'#475569':'#fff',textDecoration:tarefa.estado==='concluida'?'line-through':'none' }}>{tarefa.titulo}</div>
                              {tarefa.data_prevista&&<div style={{ fontSize:10,color:atrasada?'#f87171':'#7A8699' }}>{atrasada?'⚠️ ':''}{new Date(tarefa.data_prevista).toLocaleDateString('pt-PT')}{tarefa.recorrencia_dias?` · 🔁 ${tarefa.recorrencia_dias}d`:''}</div>}
                            </div>
                            <span style={{ fontSize:11 }}>{priIcon[tarefa.prioridade||'media']}</span>
                            <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(tarefa)}>✏️</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
      }

      <Modal open={modal} onClose={close} title={selected ? '✏️ Editar Tarefa' : '✅ Nova Tarefa'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? t('guardar') : 'Adicionar'}</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Título *"><input className="input" placeholder="Ex: Limpeza geral do pombal" value={form.titulo} onChange={e => sf('titulo', e.target.value)} /></Field>
          <div className="form-grid" style={{ gridTemplateColumns:'1fr 1fr 1fr' }}>
            <Field label="Categoria"><select className="input" value={form.cat} onChange={e => sf('cat', e.target.value)}>{CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Prioridade"><select className="input" value={form.prioridade||'media'} onChange={e=>sf('prioridade',e.target.value)}>{PRIORIDADES.map(p=><option key={p} value={p}>{priIcon[p]} {p}</option>)}</select></Field>
            <Field label="Data Prevista"><input className="input" type="date" value={form.data_prevista} onChange={e => sf('data_prevista', e.target.value)} /></Field>
          </div>
          {selected && <Field label="Estado"><select className="input" value={form.estado} onChange={e => sf('estado', e.target.value)}><option value="por_iniciar">Por Iniciar</option><option value="concluida">Concluída</option></select></Field>}
          <Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field>
          <Field label="Repetir a cada (dias)"><input className="input" type="number" placeholder="Ex: 90" value={form.recorrencia_dias} onChange={e => sf('recorrencia_dias', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar tarefa"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar "{confirm?.titulo}"?</p>
      </Modal>

      <Modal open={!!confirmRecorrencia} onClose={() => { setConfirmRecorrencia(null); load() }} title="🔁 Tarefa Recorrente"
        footer={<><button className="btn btn-secondary" onClick={() => { setConfirmRecorrencia(null); load() }}>Não, só esta vez</button><button className="btn btn-primary" onClick={criarProximaOcorrencia}>Sim, agendar próxima</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>"{confirmRecorrencia?.titulo}" repete-se a cada {confirmRecorrencia?.recorrencia_dias} dias. Quer agendar já a próxima ocorrência?</p>
      </Modal>
    </div>
  )
}
