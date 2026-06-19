import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const ESPECIALIDADES = ['velocidade', 'meio_fundo', 'fundo', 'geral']
const espLabel = { velocidade: 'Velocidade', meio_fundo: 'Meio-Fundo', fundo: 'Fundo', geral: 'Geral' }
const MODO_LABEL = { agua: '💧 Na água', racao: '🌾 Na ração', direto: '💊 Direto ao pombo' }
const BASE_LABEL = { pombo: 'por pombo', litro: 'por litro', kg: 'por kg' }
const DIAS = [
  { key: 'domingo', label: 'Domingo', idx: 0 },
  { key: 'segunda', label: 'Segunda', idx: 1 },
  { key: 'terca', label: 'Terça', idx: 2 },
  { key: 'quarta', label: 'Quarta', idx: 3 },
  { key: 'quinta', label: 'Quinta', idx: 4 },
  { key: 'sexta', label: 'Sexta', idx: 5 },
  { key: 'sabado', label: 'Sábado', idx: 6 },
]
const diaIdx = (key) => DIAS.find(d => d.key === key)?.idx ?? 0

function calcularDN(diaItemKey, diaProvaKey) {
  const idxItem = diaIdx(diaItemKey)
  const idxProva = diaIdx(diaProvaKey)
  let diff = idxProva - idxItem
  if (diff < 0) diff += 7
  return diff === 0 ? 'Dia da prova' : `D-${diff}`
}

function segundaFeiraDesta(data = new Date()) {
  const d = new Date(data)
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

const ITEM_VAZIO = { dia_semana: 'quarta', product_id: '', notas: '' }
const PLANO_VAZIO = { nome: '', especialidade: 'velocidade', dia_prova: 'domingo', itens: [], obs: '' }
const PRODUTO_VAZIO = { nome: '', modo: 'agua', dosagem_valor: '', dosagem_unidade: 'ml', dosagem_base: 'litro', obs: '' }

export default function Tratamentos({ nav }) {
  const toast = useToast()
  const [planos, setPlanos] = useState([])
  const [aplicacoes, setAplicacoes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [pombos, setPombos] = useState([])
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('semana')

  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState(PLANO_VAZIO)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [formProduto, setFormProduto] = useState(PRODUTO_VAZIO)
  const sfp = (k, v) => setFormProduto(f => ({ ...f, [k]: v }))
  const [confirmProduto, setConfirmProduto] = useState(null)

  const [modalAplicar, setModalAplicar] = useState(false)
  const [planoParaAplicar, setPlanoParaAplicar] = useState(null)
  const [pombosSelecionados, setPombosSelecionados] = useState([])
  const [savingAplicar, setSavingAplicar] = useState(false)

  const [provas, setProvas] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, a, pr, pb, st, pv] = await Promise.all([db.getTreatmentPlans(), db.getTreatmentApplications(), db.getTreatmentProducts(), db.getPombos(), db.getStock().catch(() => []), db.getProvas().catch(() => [])])
      setPlanos(p); setAplicacoes(a); setProdutos(pr); setPombos(pb); setStock(st); setProvas(pv)
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const semanaAtual = segundaFeiraDesta()
  const aplicacaoAtiva = aplicacoes.find(a => a.semana_inicio === semanaAtual)
  const planoAtivo = aplicacaoAtiva ? planos.find(p => p.id === aplicacaoAtiva.plan_id) : null
  const produto = (id) => produtos.find(p => p.id === id)
  const efectivoAtivo = pombos.filter(p => (!p.estado_ext || p.estado_ext === 'proprio') && p.estado === 'ativo')

  const openNewPlano = () => { setForm(PLANO_VAZIO); setSelected(null); setModal('plano') }
  const openEditPlano = (p) => { setSelected(p); setForm({ nome: p.nome, especialidade: p.especialidade || 'geral', dia_prova: p.dia_prova || 'domingo', itens: p.itens || [], obs: p.obs || '' }); setModal('plano') }
  const closePlano = () => { setModal(null); setSelected(null) }

  const addItem = () => setForm(f => ({ ...f, itens: [...f.itens, { ...ITEM_VAZIO }] }))
  const updateItem = (i, k, v) => setForm(f => ({ ...f, itens: f.itens.map((it, idx) => idx === i ? { ...it, [k]: v } : it) }))
  const removeItem = (i) => setForm(f => ({ ...f, itens: f.itens.filter((_, idx) => idx !== i) }))

  const savePlano = async () => {
    if (!form.nome.trim()) { toast('Nome do plano obrigatório', 'warn'); return }
    if (form.itens.length === 0) { toast('Adicione pelo menos um dia ao plano', 'warn'); return }
    if (form.itens.some(it => !it.product_id)) { toast('Escolha um produto da biblioteca para cada dia', 'warn'); return }
    setSaving(true)
    try {
      const payload = { nome: form.nome.trim(), especialidade: form.especialidade, dia_prova: form.dia_prova, itens: form.itens, obs: form.obs }
      selected ? await db.updateTreatmentPlan(selected.id, payload) : await db.createTreatmentPlan(payload)
      toast(selected ? 'Plano actualizado!' : 'Plano criado!', 'ok'); closePlano(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const delPlano = async () => {
    try { await db.deleteTreatmentPlan(confirm.id); toast('Plano eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const openNewProduto = () => { setFormProduto(PRODUTO_VAZIO); setSelected(null); setModal('produto') }
  const openEditProduto = (p) => { setSelected(p); setFormProduto({ nome: p.nome, modo: p.modo, dosagem_valor: p.dosagem_valor || '', dosagem_unidade: p.dosagem_unidade || '', dosagem_base: p.dosagem_base || 'litro', obs: p.obs || '' }); setModal('produto') }
  const closeProduto = () => { setModal(null); setSelected(null) }

  const saveProduto = async () => {
    if (!formProduto.nome.trim()) { toast('Nome do produto obrigatório', 'warn'); return }
    setSaving(true)
    try {
      const payload = { nome: formProduto.nome.trim(), modo: formProduto.modo, dosagem_valor: parseFloat(formProduto.dosagem_valor) || null, dosagem_unidade: formProduto.dosagem_unidade, dosagem_base: formProduto.dosagem_base, obs: formProduto.obs }
      selected ? await db.updateTreatmentProduct(selected.id, payload) : await db.createTreatmentProduct(payload)
      toast(selected ? 'Produto actualizado!' : 'Produto criado!', 'ok'); closeProduto(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const delProduto = async () => {
    try { await db.deleteTreatmentProduct(confirmProduto.id); toast('Produto eliminado', 'ok'); setConfirmProduto(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const abrirAplicar = (plano) => {
    setPlanoParaAplicar(plano)
    const sugeridos = plano.especialidade && plano.especialidade !== 'geral'
      ? efectivoAtivo.filter(p => (p.esp || []).includes(plano.especialidade)).map(p => p.id)
      : efectivoAtivo.map(p => p.id)
    setPombosSelecionados(sugeridos)
    setModalAplicar(true)
  }

  const togglePomboSel = (id) => setPombosSelecionados(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const selecionarPorEsp = (esp) => setPombosSelecionados(efectivoAtivo.filter(p => (p.esp || []).includes(esp)).map(p => p.id))
  const selecionarPorSexo = (sexo) => setPombosSelecionados(efectivoAtivo.filter(p => p.sexo === sexo).map(p => p.id))
  const selecionarTodos = () => setPombosSelecionados(efectivoAtivo.map(p => p.id))
  const limparSelecao = () => setPombosSelecionados([])

  const avisosStock = (() => {
    if (!planoParaAplicar) return []
    const n = pombosSelecionados.length
    const avisos = []
    planoParaAplicar.itens.forEach(it => {
      const prod = produto(it.product_id)
      if (!prod || !prod.dosagem_valor) return
      const itemStock = stock.find(s => s.nome.toLowerCase() === prod.nome.toLowerCase())
      if (!itemStock) return
      const necessario = prod.dosagem_base === 'pombo' ? prod.dosagem_valor * n : prod.dosagem_valor
      if (itemStock.qtd < necessario) {
        avisos.push(`${prod.nome}: precisa de ~${necessario}${prod.dosagem_unidade || ''}, só tem ${itemStock.qtd}${itemStock.unidade || ''} em stock`)
      }
    })
    return avisos
  })()

  const confirmarAplicar = async () => {
    if (pombosSelecionados.length === 0) { toast('Seleccione pelo menos um pombo', 'warn'); return }
    setSavingAplicar(true)
    try {
      await db.createTreatmentApplication({ plan_id: planoParaAplicar.id, semana_inicio: semanaAtual, pombos_ids: pombosSelecionados, n_pombos: pombosSelecionados.length, estado_dias: {} })
      toast('Plano aplicado a esta semana!', 'ok'); setModalAplicar(false); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSavingAplicar(false) }
  }

  const toggleDiaFeito = async (diaKey) => {
    if (!aplicacaoAtiva) return
    try {
      const novoEstado = { ...aplicacaoAtiva.estado_dias, [diaKey]: !aplicacaoAtiva.estado_dias[diaKey] }
      await db.updateTreatmentApplication(aplicacaoAtiva.id, { estado_dias: novoEstado })
      load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const encerrarAplicacao = async () => {
    try { await db.deleteTreatmentApplication(aplicacaoAtiva.id); toast('Aplicação removida desta semana', 'ok'); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const itensOrdenadosPorDia = (plano) => {
    if (!plano) return []
    return [...plano.itens].sort((a, b) => {
      const da = calcularDN(a.dia_semana, plano.dia_prova)
      const dbb = calcularDN(b.dia_semana, plano.dia_prova)
      const na = da === 'Dia da prova' ? 0 : parseInt(da.replace('D-', ''))
      const nb = dbb === 'Dia da prova' ? 0 : parseInt(dbb.replace('D-', ''))
      return nb - na
    })
  }

  const nPombosAtivos = aplicacaoAtiva?.pombos_ids?.length || aplicacaoAtiva?.n_pombos || 0

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Tratamentos</div><div className="section-sub">{planos.length} plano(s) · {produtos.length} produto(s) na biblioteca</div></div>
        {tab === 'planos' && <button className="btn btn-primary" onClick={openNewPlano}>＋ Novo Plano</button>}
        {tab === 'produtos' && <button className="btn btn-primary" onClick={openNewProduto}>＋ Novo Produto</button>}
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#101F40', borderRadius: 8, padding: 4, marginBottom: 16, overflowX: 'auto' }}>
        {[['semana','📋 Esta Semana'],['planos','🗂️ Planos'],['produtos','💊 Biblioteca'],['calendario','📅 Provas']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'8px 10px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tab===t?'#1E5FD9':'none', color:tab===t?'#fff':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div> : (
        <>
          {tab === 'semana' && (
            <div>
              {!aplicacaoAtiva ? (
                planos.length === 0 ? (
                  <EmptyState icon="🧪" title="Sem planos de tratamento" desc="Crie primeiro a biblioteca de produtos e depois um plano em 'Os Meus Planos'" action={<button className="btn btn-primary" onClick={() => setTab('produtos')}>Começar →</button>} />
                ) : (
                  <div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>Nenhum plano activo nesta semana. Escolha um plano para aplicar:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {planos.map(p => (
                        <div key={p.id} className="card card-p">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: 20 }}>🧪</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.nome}</div>
                              <div style={{ fontSize: 11, color: '#7A8699' }}>{espLabel[p.especialidade] || p.especialidade} · {p.itens.length} dia(s) de tratamento</div>
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={() => abrirAplicar(p)}>Aplicar esta semana</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div>
                  <div className="card card-p mb-6">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div>
                        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 16, color: '#fff' }}>{planoAtivo?.nome || 'Plano'}</div>
                        <div style={{ fontSize: 11, color: '#7A8699' }}>{espLabel[planoAtivo?.especialidade] || ''} · {nPombosAtivos} pombo(s) seleccionado(s)</div>
                      </div>
                      <Badge v="blue">Activo</Badge>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {itensOrdenadosPorDia(planoAtivo).map((item, i) => {
                      const dn = calcularDN(item.dia_semana, planoAtivo.dia_prova)
                      const feito = !!aplicacaoAtiva.estado_dias[item.dia_semana]
                      const prod = produto(item.product_id)
                      const doseTotal = prod && prod.dosagem_valor && prod.dosagem_base === 'pombo' ? (prod.dosagem_valor * nPombosAtivos).toFixed(1) : null
                      return (
                        <div key={i} className="card card-p" style={{ borderColor: feito ? 'rgba(45,212,167,.3)' : undefined }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button onClick={() => toggleDiaFeito(item.dia_semana)} style={{ width: 22, height: 22, borderRadius: 6, border: feito ? 'none' : '2px solid #1B2D52', background: feito ? '#2DD4A7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 13, padding: 0 }}>
                              {feito && '✓'}
                            </button>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: feito ? '#7A8699' : '#fff', textDecoration: feito ? 'line-through' : 'none' }}>{DIAS.find(d => d.key === item.dia_semana)?.label} <span style={{ color: '#D4AF37', fontWeight: 600 }}>({dn})</span> — {prod?.nome || 'Produto removido'}</div>
                              {prod && <div style={{ fontSize: 11, color: '#7A8699' }}>{MODO_LABEL[prod.modo]} · {prod.dosagem_valor}{prod.dosagem_unidade} {BASE_LABEL[prod.dosagem_base]}{doseTotal ? ` → total: ${doseTotal}${prod.dosagem_unidade} para ${nPombosAtivos} pombos` : ''}</div>}
                              {item.notas && <div style={{ fontSize: 11, color: '#7A8699', fontStyle: 'italic' }}>{item.notas}</div>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={encerrarAplicacao}>Remover plano desta semana</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'planos' && (
            planos.length === 0 ? <EmptyState icon="🧪" title="Sem planos" desc="Construa o seu primeiro plano de tratamento por especialidade" action={<button className="btn btn-primary" onClick={openNewPlano}>＋ Novo Plano</button>} />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {planos.map(p => (
                  <div key={p.id} className="card card-p">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 20 }}>🧪</div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.nome}</div>
                        <div style={{ fontSize: 11, color: '#7A8699' }}>{espLabel[p.especialidade] || p.especialidade} · prova ao {DIAS.find(d => d.key === p.dia_prova)?.label?.toLowerCase()} · {p.itens.length} dia(s)</div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditPlano(p)}>✏️ Editar</button>
                      <button className="btn btn-icon btn-sm" onClick={() => setConfirm(p)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
          )}

          {tab === 'produtos' && (
            produtos.length === 0 ? <EmptyState icon="💊" title="Biblioteca vazia" desc="Adicione produtos com dosagem padrão para usar facilmente na construção dos planos" action={<button className="btn btn-primary" onClick={openNewProduto}>＋ Novo Produto</button>} />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {produtos.map(p => (
                  <div key={p.id} className="card card-p">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 20 }}>💊</div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.nome}</div>
                        <div style={{ fontSize: 11, color: '#7A8699' }}>{MODO_LABEL[p.modo]} · {p.dosagem_valor ? `${p.dosagem_valor}${p.dosagem_unidade} ${BASE_LABEL[p.dosagem_base]}` : 'sem dosagem definida'}</div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditProduto(p)}>✏️ Editar</button>
                      <button className="btn btn-icon btn-sm" onClick={() => setConfirmProduto(p)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
          )}

          {tab === 'calendario' && (() => {
            const hoje = new Date().toISOString().slice(0, 10)
            const provasFuturas = [...provas]
              .filter(p => p.data_reg >= hoje)
              .sort((a, b) => a.data_reg.localeCompare(b.data_reg))
              .slice(0, 8)

            const sugerirPlano = (prova) => {
              // Mapear tipo de prova para especialidade do plano
              const mapa = { 'Velocidade': 'velocidade', 'Meio-Fundo': 'meio_fundo', 'Fundo': 'fundo', 'Grande Fundo': 'grande_fundo', 'Treino Federado': 'geral' }
              const esp = mapa[prova.tipo] || 'geral'
              // Preferir plano da mesma especialidade; fallback para geral
              return planos.find(p => p.especialidade === esp) || planos.find(p => p.especialidade === 'geral') || null
            }

            return (
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
                  Próximas provas e o plano de tratamento sugerido para cada uma. Aplique o plano na semana anterior à prova.
                </div>
                {provasFuturas.length === 0 ? (
                  <EmptyState icon="📅" title="Sem provas futuras" desc="Adicione provas com data futura em Provas para ver as sugestões de tratamento" action={<button className="btn btn-secondary" onClick={() => nav?.('provas')}>Ir para Provas →</button>} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {provasFuturas.map(prova => {
                      const diasAte = Math.ceil((new Date(prova.data_reg) - new Date()) / 86400000)
                      const planoSugerido = sugerirPlano(prova)
                      const urgente = diasAte <= 7
                      return (
                        <div key={prova.id} className="card card-p" style={urgente ? { borderColor: 'rgba(212,175,55,.3)', background: 'rgba(212,175,55,.04)' } : undefined}>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 160 }}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{prova.nome}</div>
                                {urgente && <span style={{ fontSize: 10, fontWeight: 700, color: '#D4AF37', background: 'rgba(212,175,55,.15)', padding: '1px 8px', borderRadius: 10 }}>URGENTE</span>}
                              </div>
                              <div style={{ fontSize: 11, color: '#7A8699' }}>
                                {prova.tipo} · {prova.dist}km · {new Date(prova.data_reg).toLocaleDateString('pt-PT')}
                              </div>
                              <div style={{ fontSize: 11, color: urgente ? '#D4AF37' : '#94a3b8', marginTop: 4, fontWeight: urgente ? 600 : 400 }}>
                                {diasAte === 0 ? '🏁 Hoje!' : diasAte === 1 ? '⚡ Amanhã!' : `📅 Em ${diasAte} dias`}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                              {planoSugerido ? (
                                <>
                                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Plano sugerido:</div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: '#2DD4A7' }}>🧪 {planoSugerido.nome}</div>
                                  <button className="btn btn-primary btn-sm" onClick={() => { abrirAplicar(planoSugerido); setTab('semana') }}>
                                    Aplicar esta semana
                                  </button>
                                </>
                              ) : (
                                <div style={{ fontSize: 11, color: '#7A8699' }}>
                                  Sem plano para {prova.tipo}.<br />
                                  <button onClick={() => setTab('planos')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4C8DFF', fontSize: 11, padding: 0 }}>Criar plano →</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}
        </>
      )}

      <Modal open={modal === 'plano'} onClose={closePlano} title={selected ? '✏️ Editar Plano' : '🧪 Novo Plano de Tratamento'} wide
        footer={<><button className="btn btn-secondary" onClick={closePlano}>Cancelar</button><button className="btn btn-primary" onClick={savePlano} disabled={saving}>{saving ? <Spinner /> : null}{selected ? 'Guardar' : 'Criar Plano'}</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome do Plano *"><input className="input" placeholder="Ex: Plano Velocidade" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field></div>
          <Field label="Especialidade"><select className="input" value={form.especialidade} onChange={e => sf('especialidade', e.target.value)}>{ESPECIALIDADES.map(e => <option key={e} value={e}>{espLabel[e]}</option>)}</select></Field>
          <Field label="Dia da Prova (referência para D-N)"><select className="input" value={form.dia_prova} onChange={e => sf('dia_prova', e.target.value)}>{DIAS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}</select></Field>
        </div>

        {produtos.length === 0 && (
          <div style={{ background: 'rgba(212,175,55,.08)', border: '1px solid rgba(212,175,55,.2)', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12, color: '#D4AF37' }}>
            💊 A biblioteca de produtos está vazia. Vá a "Biblioteca de Produtos" e crie pelo menos um produto antes de continuar.
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Dias de Tratamento</div>
            <button className="btn btn-secondary btn-sm" onClick={addItem} disabled={produtos.length === 0}>＋ Adicionar Dia</button>
          </div>
          {form.itens.length === 0 ? (
            <div style={{ fontSize: 12, color: '#7A8699', textAlign: 'center', padding: '16px 0' }}>Ainda sem dias. Adicione o primeiro.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {form.itens.map((item, i) => (
                <div key={i} style={{ background: '#101F40', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#7A8699', marginBottom: 4 }}>Dia da Semana</div>
                      <select className="input" value={item.dia_semana} onChange={e => updateItem(i, 'dia_semana', e.target.value)}>
                        {DIAS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: '0 0 90px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#7A8699', marginBottom: 4 }}>Posição</div>
                      <div style={{ background: '#0B1830', borderRadius: 6, padding: '8px 0', fontSize: 12, fontWeight: 700, color: '#D4AF37' }}>{calcularDN(item.dia_semana, form.dia_prova)}</div>
                    </div>
                    <button className="btn btn-icon btn-sm" onClick={() => removeItem(i)}>🗑️</button>
                  </div>
                  <Field label="Produto (da biblioteca)">
                    <select className="input" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                      <option value="">— Escolher produto —</option>
                      {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({MODO_LABEL[p.modo]})</option>)}
                    </select>
                  </Field>
                  <input className="input" style={{ marginTop: 8 }} placeholder="Notas (opcional)" value={item.notas} onChange={e => updateItem(i, 'notas', e.target.value)} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <Field label="Observações Gerais do Plano"><textarea className="input" rows={2} style={{ resize: 'none' }} value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={modal === 'produto'} onClose={closeProduto} title={selected ? '✏️ Editar Produto' : '💊 Novo Produto'}
        footer={<><button className="btn btn-secondary" onClick={closeProduto}>Cancelar</button><button className="btn btn-primary" onClick={saveProduto} disabled={saving}>{saving ? <Spinner /> : null}{selected ? 'Guardar' : 'Criar Produto'}</button></>}>
        <Field label="Nome do Produto *"><input className="input" placeholder="Ex: Eletrólitos" value={formProduto.nome} onChange={e => sfp('nome', e.target.value)} /></Field>
        <div style={{ fontSize: 11, color: '#7A8699', margin: '4px 0 12px' }}>💡 Se tiver um item de Stock com o mesmo nome exacto, a app verifica automaticamente se o stock é suficiente ao aplicar o plano.</div>
        <Field label="Modo de Administração">
          <select className="input" value={formProduto.modo} onChange={e => sfp('modo', e.target.value)}>
            <option value="agua">💧 Na água</option>
            <option value="racao">🌾 Na ração</option>
            <option value="direto">💊 Direto ao pombo</option>
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Dosagem"><input className="input" type="number" step="0.1" placeholder="Ex: 1" value={formProduto.dosagem_valor} onChange={e => sfp('dosagem_valor', e.target.value)} /></Field>
          <Field label="Unidade"><input className="input" placeholder="ml, g, comprimido..." value={formProduto.dosagem_unidade} onChange={e => sfp('dosagem_unidade', e.target.value)} /></Field>
          <Field label="Por">
            <select className="input" value={formProduto.dosagem_base} onChange={e => sfp('dosagem_base', e.target.value)}>
              <option value="pombo">Pombo</option>
              <option value="litro">Litro de água</option>
              <option value="kg">Kg de ração</option>
            </select>
          </Field>
        </div>
        <Field label="Observações"><textarea className="input" rows={2} style={{ resize: 'none' }} value={formProduto.obs} onChange={e => sfp('obs', e.target.value)} /></Field>
      </Modal>

      <Modal open={modalAplicar} onClose={() => setModalAplicar(false)} title={`Aplicar "${planoParaAplicar?.nome}" a esta semana`} wide
        footer={<><button className="btn btn-secondary" onClick={() => setModalAplicar(false)}>Cancelar</button><button className="btn btn-primary" onClick={confirmarAplicar} disabled={savingAplicar}>{savingAplicar ? <Spinner /> : null}Aplicar a {pombosSelecionados.length} pombo(s)</button></>}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={selecionarTodos}>Todo o efectivo</button>
          {ESPECIALIDADES.filter(e => e !== 'geral').map(e => <button key={e} className="btn btn-secondary btn-sm" onClick={() => selecionarPorEsp(e)}>{espLabel[e]}</button>)}
          <button className="btn btn-secondary btn-sm" onClick={() => selecionarPorSexo('M')}>Machos</button>
          <button className="btn btn-secondary btn-sm" onClick={() => selecionarPorSexo('F')}>Fêmeas</button>
          <button className="btn btn-secondary btn-sm" onClick={limparSelecao}>Limpar</button>
        </div>

        {avisosStock.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#f87171' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ Stock insuficiente para esta semana:</div>
            {avisosStock.map((a, i) => <div key={i}>{a}</div>)}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{pombosSelecionados.length} pombo(s) seleccionado(s) de {efectivoAtivo.length} no efectivo activo</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 220, overflowY: 'auto', padding: '4px 0' }}>
          {efectivoAtivo.map(p => (
            <button key={p.id} type="button" onClick={() => togglePomboSel(p.id)} className={`chip${pombosSelecionados.includes(p.id) ? ' active' : ''}`} style={{ fontSize: 11 }}>
              {p.emoji} {p.nome}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar plano"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={delPlano}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar o plano "{confirm?.nome}"? As aplicações semanais já feitas não serão apagadas.</p>
      </Modal>

      <Modal open={!!confirmProduto} onClose={() => setConfirmProduto(null)} title="Eliminar produto"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirmProduto(null)}>Cancelar</button><button className="btn btn-danger" onClick={delProduto}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar "{confirmProduto?.nome}"? Planos que já usam este produto deixarão de o mostrar correctamente.</p>
      </Modal>
    </div>
  )
}
