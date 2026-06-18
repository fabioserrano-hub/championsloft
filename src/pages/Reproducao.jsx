import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'
import { classificarPombo } from './Pombos'

const ESTADOS = ['em_progresso', 'concluido', 'cancelado']
const estadoLabel = { em_progresso: 'Em Progresso', concluido: 'Concluído', cancelado: 'Cancelado' }
const estadoBadge = { em_progresso: 'yellow', concluido: 'green', cancelado: 'gray' }
const EMPTY = { pai_id: '', mae_id: '', cacifo: '', data_acasalamento: new Date().toISOString().slice(0,10), data_postura: '', data_eclosao_prev: '', estado: 'em_progresso', ninhadas: '0', obs: '' }
const EMPTY_NASC = { nome: '', sexo: 'M', cor: '', anilha: '', data_nascimento: new Date().toISOString().slice(0,10), data_eclosao_real: '', n_ovos: '2', obs_borrachinho: '' }

function addDias(dataStr, dias) {
  if (!dataStr) return ''
  const d = new Date(dataStr)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0,10)
}

export default function Reproducao({ nav, params }) {
  const toast = useToast()
  const { user } = useAuth()
  const [acasalamentos, setAcasalamentos] = useState([])
  const [pombos, setPombos] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('acasalamentos')
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [pedigreePombo, setPedigreePombo] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [modalNasc, setModalNasc] = useState(null)
  const [formNasc, setFormNasc] = useState(EMPTY_NASC)
  const sfn = (k, v) => setFormNasc(f => ({ ...f, [k]: v }))
  const [savingNasc, setSavingNasc] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, p, pf] = await Promise.all([db.getAcasalamentos(), db.getPombos(), db.getPerfil()])
      setAcasalamentos(a); setPombos(p); setPerfil(pf)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (params?.tab === 'pedigree' && params?.pomboId && pombos.length) {
      const p = pombos.find(x => x.id === params.pomboId)
      if (p) { setTab('pedigree'); setPedigreePombo(p) }
    }
  }, [params, pombos])

  const machos = pombos.filter(p => p.sexo === 'M' && (!p.estado_ext || p.estado_ext === 'proprio'))
  const femeas = pombos.filter(p => p.sexo === 'F' && (!p.estado_ext || p.estado_ext === 'proprio'))

  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true) }
  const openEdit = (a) => {
    setSelected(a)
    setForm({ pai_id: a.pai_id||'', mae_id: a.mae_id||'', cacifo: a.cacifo||'', data_acasalamento: (a.data_acasalamento||a.inicio)?.slice(0,10)||'', data_postura: a.data_postura?.slice(0,10)||'', data_eclosao_prev: a.data_eclosao_prev?.slice(0,10)||'', estado: a.estado||'em_progresso', ninhadas: String(a.ninhadas||a.n_ninhadas||0), obs: a.obs||'' })
    setModal(true)
  }
  const close = () => { setModal(false); setSelected(null) }

  const onChangeDataAcasalamento = (v) => {
    sf('data_acasalamento', v)
    if (!selected) { sf('data_postura', addDias(v, 10)); sf('data_eclosao_prev', addDias(v, 28)) }
  }

  const save = async () => {
    if (!form.pai_id || !form.mae_id) { toast('Seleccione pai e mãe', 'warn'); return }
    setSaving(true)
    try {
      const pai = pombos.find(p => p.id === form.pai_id)
      const mae = pombos.find(p => p.id === form.mae_id)
      const payload = { pai_id: form.pai_id, mae_id: form.mae_id, pai_nome: `${pai?.nome} (${pai?.anilha})`, mae_nome: `${mae?.nome} (${mae?.anilha})`, cacifo: form.cacifo, data_acasalamento: form.data_acasalamento, data_postura: form.data_postura||null, data_eclosao_prev: form.data_eclosao_prev||null, estado: form.estado, ninhadas: parseInt(form.ninhadas)||0, obs: form.obs }
      selected ? await db.updateAcasalamento(selected.id, payload) : await db.createAcasalamento(payload)
      toast(selected ? 'Actualizado!' : 'Acasalamento registado!', 'ok'); close(); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteAcasalamento(confirm.id); toast('Eliminado','ok'); setConfirm(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  const abrirModalNascimento = (a) => {
    const pai = pombos.find(p => p.id === a.pai_id)
    const mae = pombos.find(p => p.id === a.mae_id)
    setModalNasc(a)
    setFormNasc({ ...EMPTY_NASC, cor: pai?.cor||'', data_eclosao_real: a.data_eclosao_prev?.slice(0,10)||new Date().toISOString().slice(0,10) })
  }

  const registarNascimento = async () => {
    if (!formNasc.nome.trim()) { toast('Dê um nome ao borrachinho', 'warn'); return }
    setSavingNasc(true)
    try {
      const pai = pombos.find(p => p.id === modalNasc.pai_id)
      const mae = pombos.find(p => p.id === modalNasc.mae_id)
      const num = (modalNasc.ninhadas || 0) + 1
      await db.createPombo({
        anilha: formNasc.anilha || '', nome: formNasc.nome.trim(), sexo: formNasc.sexo,
        cor: formNasc.cor, esp: pai?.esp || ['velocidade'], estado: 'inativo', estado_ext: 'proprio',
        pombal: pai?.pombal || '', pai: pai?.anilha || '', mae: mae?.anilha || '', emoji: '🐣',
        obs: `Nascido em ${formNasc.data_nascimento}. ${formNasc.obs_borrachinho}`.trim(),
        provas: 0, percentil: 0, forma: 50,
      })
      await db.updateAcasalamento(modalNasc.id, {
        ninhadas: num,
        n_nascidos: (modalNasc.n_nascidos || 0) + 1,
        data_eclosao_real: formNasc.data_eclosao_real || null,
        n_ovos: parseInt(formNasc.n_ovos) || 0,
      })
      toast(`${formNasc.nome} criado em Pombos! 🐣`, 'ok')
      setModalNasc(null); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSavingNasc(false) }
  }

  const irParaPombosFiltrado = () => nav?.('pombos')

  // --- Pedigree ---
  const buscarAscendente = (anilha, geracoes = 3) => {
    if (!anilha || geracoes === 0) return null
    const p = pombos.find(x => x.anilha === anilha)
    if (!p) return { anilha, nome: null }
    return { ...p, paiNode: buscarAscendente(p.pai, geracoes-1), maeNode: buscarAscendente(p.mae, geracoes-1) }
  }

  const PedigreeNode = ({ node, label, destaque }) => {
    if (!node) return (
      <div style={{ background: '#101F40', border: '1px dashed #1B2D52', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#7A8699', textAlign: 'center', minWidth: 120 }}>
        {label || 'Desconhecido'}
      </div>
    )
    const c = node.nome ? classificarPombo(node) : null
    const temFoto = node.foto_url
    return (
      <div style={{ background: destaque ? 'rgba(76,141,255,.08)' : '#101F40', border: `1px solid ${destaque ? '#4C8DFF' : '#1B2D52'}`, borderRadius: 8, padding: '8px 12px', fontSize: 11, textAlign: 'center', minWidth: 120 }}>
        {temFoto && <img src={temFoto} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 4px', display: 'block' }} />}
        {!temFoto && <div style={{ fontSize: 20, marginBottom: 2 }}>{node.emoji || '🐦'}</div>}
        <div style={{ color: '#fff', fontWeight: 600 }}>{node.nome || '—'}</div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#2DD4A7' }}>{node.anilha}</div>
        {c && <div style={{ fontSize: 9, color: c.cor, marginTop: 2 }}>{c.tag}</div>}
        {node.provas > 0 && <div style={{ fontSize: 9, color: '#D4AF37', marginTop: 1 }}>{node.provas}🏆 {node.percentil ? node.percentil+'%' : ''}</div>}
      </div>
    )
  }

  const acasalamentosOrdenados = [...acasalamentos].sort((a,b) => new Date(b.data_acasalamento||b.inicio||0)-new Date(a.data_acasalamento||a.inicio||0))
  const ativos = acasalamentos.filter(a => a.estado==='em_progresso')
  const eclosoesProximas = ativos.filter(a => {
    if (!a.data_eclosao_prev) return false
    const dias = (new Date(a.data_eclosao_prev)-new Date())/86400000
    return dias >= -2 && dias <= 5
  }).sort((a,b) => new Date(a.data_eclosao_prev)-new Date(b.data_eclosao_prev))

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Reprodução</div><div className="section-sub">{acasalamentos.length} acasalamentos · {ativos.length} activos</div></div>
        {tab==='acasalamentos' && <button className="btn btn-primary" onClick={openNew}>＋ Novo Acasalamento</button>}
      </div>

      <div style={{ display:'flex', gap:4, background:'#101F40', borderRadius:8, padding:4, marginBottom:16 }}>
        {[['acasalamentos','🥚 Acasalamentos'],['pedigree','🌳 Pedigree']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'8px 14px', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'#1E5FD9':'none', color:tab===t?'#fff':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {tab==='acasalamentos' && (
        loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        : acasalamentos.length===0 ? <EmptyState icon="🥚" title="Sem acasalamentos" desc="Registe o primeiro acasalamento da época" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Acasalamento</button>} />
        : <>
            {eclosoesProximas.length > 0 && (
              <div style={{ background:'rgba(212,175,55,.08)', border:'1px solid rgba(212,175,55,.2)', borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
                <div style={{ fontWeight:600, color:'#D4AF37', marginBottom:6 }}>🐣 {eclosoesProximas.length} eclosão(ões) próxima(s)</div>
                {eclosoesProximas.map(a => {
                  const dias = Math.round((new Date(a.data_eclosao_prev)-new Date())/86400000)
                  return <div key={a.id} style={{ fontSize:12, color:'#cbd5e1' }}>{a.pai_nome} × {a.mae_nome} — {dias<0?`prevista há ${Math.abs(dias)} dia(s)`:dias===0?'hoje':`em ${dias} dia(s)`}</div>
                })}
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {acasalamentosOrdenados.map(a => {
                const pai = pombos.find(p => p.id===a.pai_id)
                const mae = pombos.find(p => p.id===a.mae_id)
                return (
                  <div key={a.id} className="card card-p">
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                      <div style={{ fontSize:22 }}>🥚</div>
                      <div style={{ flex:1, minWidth:180 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{a.pai_nome} × {a.mae_nome}</div>
                        <div style={{ fontSize:11, color:'#7A8699' }}>
                          {a.cacifo ? `Cacifo ${a.cacifo} · ` : ''}
                          Acasalado: {new Date(a.data_acasalamento||a.inicio).toLocaleDateString('pt-PT')}
                          {a.n_ovos ? ` · 🥚 ${a.n_ovos} ovos` : ''}
                        </div>
                        {/* Linha do tempo do ciclo */}
                        <div style={{ display:'flex', gap:12, marginTop:6, flexWrap:'wrap' }}>
                          {a.data_postura && <div style={{ fontSize:10, color:'#94a3b8' }}>🥚 Ovos prev. {new Date(a.data_postura).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'})}</div>}
                          {a.data_eclosao_prev && <div style={{ fontSize:10, color:(() => { const d=(new Date(a.data_eclosao_prev)-new Date())/86400000; return d>=0&&d<=5?'#D4AF37':'#94a3b8' })() }}>🐣 Eclosão prev. {new Date(a.data_eclosao_prev).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'})}</div>}
                          {a.data_eclosao_real && <div style={{ fontSize:10, color:'#2DD4A7' }}>✅ Eclosão real {new Date(a.data_eclosao_real).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'})}</div>}
                          {a.data_desmame && <div style={{ fontSize:10, color:'#4C8DFF' }}>🕊️ Desmame {new Date(a.data_desmame).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'})}</div>}
                        </div>
                        {a.n_nascidos > 0 && <div style={{ fontSize:11, color:'#2DD4A7', marginTop:4 }}>🐣 {a.n_nascidos} borrachinho(s) nascido(s)</div>}
                        {a.obs && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{a.obs}</div>}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
                        <Badge v={estadoBadge[a.estado]}>{estadoLabel[a.estado]}</Badge>
                        <div style={{ fontSize:12, color:'#D4AF37', fontWeight:600 }}>{a.ninhadas||0} ninhada(s)</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                      {a.estado==='em_progresso' && <button className="btn btn-secondary btn-sm" onClick={() => abrirModalNascimento(a)}>🐣 Registar Nascimento</button>}
                      <button className="btn btn-secondary btn-sm" onClick={() => { setPedigreePombo(pai); setTab('pedigree') }}>🌳 Pedigree {pai?.nome}</button>
                      <button className="btn btn-icon btn-sm" onClick={() => openEdit(a)}>✏️</button>
                      <button className="btn btn-icon btn-sm" onClick={() => setConfirm(a)}>🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
      )}

      {tab==='pedigree' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
            <div style={{ flex:1 }}>
              <Field label="Seleccionar pombo">
                <select className="input" value={pedigreePombo?.id||''} onChange={e => setPedigreePombo(pombos.find(p => p.id===e.target.value)||null)}>
                  <option value="">— Seleccionar —</option>
                  {pombos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}
                </select>
              </Field>
            </div>
            {pedigreePombo && <button className="btn btn-secondary btn-sm" style={{ marginTop:16 }} onClick={() => window.print()}>🖨️ Imprimir</button>}
          </div>

          {pedigreePombo ? (
            <div className="card card-p" style={{ overflowX:'auto' }} id="pedigree-print">
              {/* Cabeçalho premium */}
              <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:20, paddingBottom:16, borderBottom:'1px solid #1B2D52' }}>
                <div style={{ width:64, height:64, borderRadius:12, background:'#101F40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, flexShrink:0, overflow:'hidden' }}>
                  {pedigreePombo.foto_url ? <img src={pedigreePombo.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : pedigreePombo.emoji || '🐦'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:'#fff' }}>{pedigreePombo.nome}</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, color:'#2DD4A7' }}>{pedigreePombo.anilha}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                    {pedigreePombo.sexo==='M'?'Macho':'Fêmea'} · {pedigreePombo.cor||'—'} · {(pedigreePombo.esp||[]).join(', ')}
                    {pedigreePombo.provas > 0 && ` · ${pedigreePombo.provas} provas · percentil ${pedigreePombo.percentil}%`}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:10, color:'#7A8699' }}>Columbófilo</div>
                  <div style={{ fontSize:12, color:'#fff', fontWeight:600 }}>{perfil?.nome || '—'}</div>
                  <div style={{ fontSize:10, color:'#7A8699' }}>{perfil?.org || perfil?.fed || ''}</div>
                  <div style={{ fontSize:10, color:'#7A8699', marginTop:4 }}>ChampionsLoft · {new Date().getFullYear()}</div>
                </div>
              </div>

              {/* Árvore de pedigree */}
              <div style={{ fontSize:11, color:'#7A8699', marginBottom:10, textAlign:'center', fontWeight:600, letterSpacing:.5 }}>PEDIGREE — 3 GERAÇÕES</div>
              <div style={{ display:'flex', flexDirection:'column', gap:16, alignItems:'center', minWidth:480 }}>
                {/* Geração 1 — pais */}
                <div style={{ display:'flex', gap:24, justifyContent:'center' }}>
                  <div>
                    <div style={{ fontSize:10, color:'#7A8699', textAlign:'center', marginBottom:4 }}>PAI</div>
                    <PedigreeNode node={buscarAscendente(pedigreePombo.pai, 1)} label="Pai desconhecido" destaque />
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:'#7A8699', textAlign:'center', marginBottom:4 }}>MÃE</div>
                    <PedigreeNode node={buscarAscendente(pedigreePombo.mae, 1)} label="Mãe desconhecida" destaque />
                  </div>
                </div>
                {/* Geração 2 — avós */}
                <div>
                  <div style={{ fontSize:10, color:'#7A8699', textAlign:'center', marginBottom:4 }}>AVÓS</div>
                  <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
                    {[buscarAscendente(pedigreePombo.pai, 2)?.paiNode, buscarAscendente(pedigreePombo.pai, 2)?.maeNode, buscarAscendente(pedigreePombo.mae, 2)?.paiNode, buscarAscendente(pedigreePombo.mae, 2)?.maeNode].map((n,i) => (
                      <PedigreeNode key={i} node={n} label="Desconhecido" />
                    ))}
                  </div>
                </div>
                {/* Geração 3 — bisavós */}
                <div>
                  <div style={{ fontSize:10, color:'#7A8699', textAlign:'center', marginBottom:4 }}>BISAVÓS</div>
                  <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                    {[buscarAscendente(pedigreePombo.pai, 2)?.paiNode?.paiNode, buscarAscendente(pedigreePombo.pai, 2)?.paiNode?.maeNode, buscarAscendente(pedigreePombo.pai, 2)?.maeNode?.paiNode, buscarAscendente(pedigreePombo.pai, 2)?.maeNode?.maeNode, buscarAscendente(pedigreePombo.mae, 2)?.paiNode?.paiNode, buscarAscendente(pedigreePombo.mae, 2)?.paiNode?.maeNode, buscarAscendente(pedigreePombo.mae, 2)?.maeNode?.paiNode, buscarAscendente(pedigreePombo.mae, 2)?.maeNode?.maeNode].map((n,i) => (
                      <PedigreeNode key={i} node={n} label="Desc." />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginTop:16, textAlign:'center', fontSize:10, color:'#7A8699' }}>
                Documento gerado pela ChampionsLoft — Gestão Columbófila · championsloft.app
              </div>
            </div>
          ) : (
            <EmptyState icon="🌳" title="Seleccione um pombo" desc="Escolha um pombo para visualizar o pedigree premium com 3 gerações" />
          )}
        </div>
      )}

      {/* Modal de nascimento de borrachinho */}
      <Modal open={!!modalNasc} onClose={() => setModalNasc(null)} title="🐣 Registar Nascimento" wide
        footer={<><button className="btn btn-secondary" onClick={() => setModalNasc(null)}>Cancelar</button><button className="btn btn-primary" onClick={registarNascimento} disabled={savingNasc}>{savingNasc?<Spinner />:null}Criar Borrachinho em Pombos</button></>}>
        {modalNasc && (
          <div>
            <div style={{ background:'#101F40', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#94a3b8' }}>
              Casal: <strong style={{ color:'#fff' }}>{modalNasc.pai_nome} × {modalNasc.mae_nome}</strong>
              {modalNasc.cacifo && <> · Cacifo <strong style={{ color:'#fff' }}>{modalNasc.cacifo}</strong></>}
            </div>
            <div className="form-grid">
              <div className="col-2"><Field label="Nome do Borrachinho *"><input className="input" placeholder="Ex: Zeus Jr." value={formNasc.nome} onChange={e => sfn('nome', e.target.value)} /></Field></div>
              <Field label="Sexo"><select className="input" value={formNasc.sexo} onChange={e => sfn('sexo', e.target.value)}><option value="M">Macho</option><option value="F">Fêmea</option></select></Field>
              <Field label="Cor"><input className="input" placeholder="Ex: Azul barrado" value={formNasc.cor} onChange={e => sfn('cor', e.target.value)} /></Field>
              <Field label="Data de Nascimento"><input className="input" type="date" value={formNasc.data_nascimento} onChange={e => sfn('data_nascimento', e.target.value)} /></Field>
              <Field label="Data de Eclosão Real"><input className="input" type="date" value={formNasc.data_eclosao_real} onChange={e => sfn('data_eclosao_real', e.target.value)} /></Field>
              <Field label="Nº de Ovos"><input className="input" type="number" value={formNasc.n_ovos} onChange={e => sfn('n_ovos', e.target.value)} /></Field>
              <Field label="Anilha (se já atribuída)"><input className="input" placeholder="PT-2026-00001" value={formNasc.anilha} onChange={e => sfn('anilha', e.target.value)} /></Field>
              <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={formNasc.obs_borrachinho} onChange={e => sfn('obs_borrachinho', e.target.value)} /></Field></div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modal} onClose={close} title={selected?'✏️ Editar Acasalamento':'🥚 Novo Acasalamento'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner />:null}{selected?'Guardar':'Registar'}</button></>}>
        <div className="form-grid">
          <Field label="Pai (Macho) *"><select className="input" value={form.pai_id} onChange={e => sf('pai_id', e.target.value)}><option value="">— Seleccionar —</option>{machos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field>
          <Field label="Mãe (Fêmea) *"><select className="input" value={form.mae_id} onChange={e => sf('mae_id', e.target.value)}><option value="">— Seleccionar —</option>{femeas.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field>
          <Field label="Cacifo"><input className="input" placeholder="Ex: A-12" value={form.cacifo} onChange={e => sf('cacifo', e.target.value)} /></Field>
          <Field label="Estado"><select className="input" value={form.estado} onChange={e => sf('estado', e.target.value)}>{ESTADOS.map(e => <option key={e} value={e}>{estadoLabel[e]}</option>)}</select></Field>
          <Field label="Data de Acasalamento"><input className="input" type="date" value={form.data_acasalamento} onChange={e => onChangeDataAcasalamento(e.target.value)} /></Field>
          <Field label="Previsão de Postura (+10 dias)"><input className="input" type="date" value={form.data_postura} onChange={e => sf('data_postura', e.target.value)} /></Field>
          <Field label="Previsão de Eclosão (+28 dias)"><input className="input" type="date" value={form.data_eclosao_prev} onChange={e => sf('data_eclosao_prev', e.target.value)} /></Field>
          <Field label="Nº Ninhadas"><input className="input" type="number" value={form.ninhadas} onChange={e => sf('ninhadas', e.target.value)} /></Field>
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field></div>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar acasalamento"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar este acasalamento?</p>
      </Modal>
    </div>
  )
}
