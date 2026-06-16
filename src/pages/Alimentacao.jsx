import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const CEREAIS = ['Milho', 'Cevada', 'Trigo', 'Aveia', 'Ervilha', 'Girassol', 'Cártamo', 'Colza', 'Painço', 'Arroz']
const RACOES_COMERCIAIS = ['Versele-Laga Gerry Plus', 'Versele-Laga Coloured', 'Beyers Sport', 'Beyers Energy Plus', 'Roehnfried Champion', 'Roehnfried Original', 'DAC Mistura Competição', 'DAC Mistura Muda']
const MEDICAMENTOS = ['Amprolium', 'Ronidazol', 'Enrofloxacina', 'Doxiciclina', 'Spartrix', 'Tylan', 'Baycox', 'Eskazole', 'Vitaminas A+D3+E', 'Eletrólitos']
const TIPOS = ['Cereal', 'Ração Comercial', 'Medicamento', 'Suplemento', 'Outro']
const UNIDADES = ['kg', 'g', 'L', 'ml', 'comprimidos', 'unidades']
const EMPTY = { tipo: 'Cereal', nome: '', qtd: '', unidade: 'kg', qtd_minima: '', validade: '', preco: '', obs: '' }

export default function Alimentacao() {
  const toast = useToast()
  const [stock, setStock] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('stock')
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [calcPombos, setCalcPombos] = useState('20')
  const [calcGPorPombo, setCalcGPorPombo] = useState('35')
  const [calcDias, setCalcDias] = useState('7')

  const load = useCallback(async () => {
    setLoading(true)
    try { const [s, p] = await Promise.all([db.getStock(), db.getPombos()]); setStock(s); setPombos(p) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const sugestoesPorTipo = { 'Cereal': CEREAIS, 'Ração Comercial': RACOES_COMERCIAIS, 'Medicamento': MEDICAMENTOS, 'Suplemento': [], 'Outro': [] }

  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true) }
  const openEdit = (s) => { setSelected(s); setForm({ tipo: s.tipo || 'Cereal', nome: s.nome || '', qtd: String(s.qtd || ''), unidade: s.unidade || 'kg', qtd_minima: String(s.qtd_minima || ''), validade: s.validade || '', preco: String(s.preco || ''), obs: s.obs || '' }); setModal(true) }
  const close = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if (!form.nome.trim() || !form.qtd) { toast('Nome e quantidade obrigatórios', 'warn'); return }
    setSaving(true)
    try {
      const payload = { tipo: form.tipo, nome: form.nome.trim(), qtd: parseFloat(form.qtd), unidade: form.unidade, qtd_minima: form.qtd_minima ? parseFloat(form.qtd_minima) : null, validade: form.validade || null, preco: form.preco ? parseFloat(form.preco) : null, obs: form.obs }
      selected ? await db.updateStockItem(selected.id, payload) : await db.createStockItem(payload)
      toast(selected ? 'Actualizado!' : 'Adicionado ao stock!', 'ok'); close(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteStockItem(confirm.id); toast('Eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const ajustarQtd = async (item, delta) => {
    try { await db.updateStockItem(item.id, { qtd: Math.max(0, item.qtd + delta) }); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const stockFiltrado = stock.filter(s => filtroTipo === 'todos' || s.tipo === filtroTipo)
  const baixoStock = stock.filter(s => s.qtd_minima && s.qtd <= s.qtd_minima)
  const validadeProxima = stock.filter(s => {
    if (!s.validade) return false
    const dias = (new Date(s.validade) - new Date()) / 86400000
    return dias >= 0 && dias <= 30
  })

  const efectivoAtivo = pombos.filter(p => (!p.estado_ext || p.estado_ext === 'proprio') && p.estado === 'ativo').length
  const consumoCalc = (parseFloat(calcPombos) || 0) * (parseFloat(calcGPorPombo) || 0) * (parseFloat(calcDias) || 0) / 1000

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Alimentação &amp; Tratamento</div><div className="section-sub">{stock.length} itens em stock</div></div>
        {tab === 'stock' && <button className="btn btn-primary" onClick={openNew}>＋ Novo Item</button>}
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#1a2840', borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {[['stock', '📦 Stock'], ['calculadora', '🧮 Calculadora']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: tab === t ? '#1ed98a' : 'none', color: tab === t ? '#0a0f14' : '#94a3b8' }}>{l}</button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          {(baixoStock.length > 0 || validadeProxima.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {baixoStock.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, color: '#f87171', marginBottom: 4 }}>⚠️ {baixoStock.length} item(ns) com stock baixo</div>
                  {baixoStock.map(s => <div key={s.id} style={{ fontSize: 12, color: '#cbd5e1' }}>{s.nome} — {s.qtd}{s.unidade} (mín: {s.qtd_minima}{s.unidade})</div>)}
                </div>
              )}
              {validadeProxima.length > 0 && (
                <div style={{ background: 'rgba(234,179,8,.08)', border: '1px solid rgba(234,179,8,.2)', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, color: '#facc15', marginBottom: 4 }}>📅 {validadeProxima.length} item(ns) a expirar em 30 dias</div>
                  {validadeProxima.map(s => <div key={s.id} style={{ fontSize: 12, color: '#cbd5e1' }}>{s.nome} — válido até {new Date(s.validade).toLocaleDateString('pt-PT')}</div>)}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {['todos', ...TIPOS].map(t => <button key={t} onClick={() => setFiltroTipo(t)} className={`chip${filtroTipo === t ? ' active' : ''}`}>{t === 'todos' ? 'Todos' : t}</button>)}
          </div>

          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
            : stockFiltrado.length === 0 ? <EmptyState icon="🌾" title="Sem itens" desc="Adicione cereais, rações ou medicamentos ao stock" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Item</button>} />
            : <div className="grid-2">
                {stockFiltrado.map(s => {
                  const baixo = s.qtd_minima && s.qtd <= s.qtd_minima
                  const icon = s.tipo === 'Cereal' ? '🌾' : s.tipo === 'Ração Comercial' ? '🥫' : s.tipo === 'Medicamento' ? '💊' : s.tipo === 'Suplemento' ? '🧪' : '📦'
                  return (
                    <div key={s.id} className="card card-p">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ fontSize: 22 }}>{icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{s.nome}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{s.tipo}</div>
                        </div>
                        <button className="btn btn-icon btn-sm" onClick={() => openEdit(s)}>✏️</button>
                        <button className="btn btn-icon btn-sm" onClick={() => setConfirm(s)}>🗑️</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <button className="btn btn-icon btn-sm" onClick={() => ajustarQtd(s, -1)}>−</button>
                        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Barlow Condensed', fontSize: 22, fontWeight: 700, color: baixo ? '#f87171' : '#fff' }}>{s.qtd}{s.unidade}</div>
                        <button className="btn btn-icon btn-sm" onClick={() => ajustarQtd(s, 1)}>＋</button>
                      </div>
                      {s.qtd_minima && <div className="progress"><div className="progress-bar" style={{ width: `${Math.min(100, (s.qtd / (s.qtd_minima * 3)) * 100)}%`, background: baixo ? '#f87171' : '#1ed98a' }} /></div>}
                      {s.validade && <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>📅 Válido até {new Date(s.validade).toLocaleDateString('pt-PT')}</div>}
                      {s.preco && <div style={{ fontSize: 11, color: '#facc15', marginTop: 2 }}>💶 {s.preco}€</div>}
                    </div>
                  )
                })}
              </div>
          }
        </>
      )}

      {tab === 'calculadora' && (
        <div className="card card-p">
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: 16 }}>🧮 Calculadora de Consumo</div>
          <div className="form-grid">
            <Field label="Nº de Pombos"><input className="input" type="number" value={calcPombos} onChange={e => setCalcPombos(e.target.value)} /></Field>
            <Field label="Gramas por pombo/dia"><input className="input" type="number" value={calcGPorPombo} onChange={e => setCalcGPorPombo(e.target.value)} /></Field>
            <div className="col-2"><Field label="Período (dias)"><input className="input" type="number" value={calcDias} onChange={e => setCalcDias(e.target.value)} /></Field></div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 4, marginBottom: 16 }} onClick={() => setCalcPombos(String(efectivoAtivo))}>Usar efectivo activo ({efectivoAtivo} pombos)</button>
          <div style={{ background: '#1a2840', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: 40, fontWeight: 700, color: '#1ed98a' }}>{consumoCalc.toFixed(1)} kg</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Consumo total estimado no período</div>
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: '#cbd5e1' }}>📊 Referências comuns:</div>
            <div>Repouso/Muda: 25-30g/pombo/dia</div>
            <div>Pré-competição: 30-35g/pombo/dia</div>
            <div>Competição/Treino intenso: 35-45g/pombo/dia</div>
            <div>Reprodução: 40-50g/pombo/dia</div>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={close} title={selected ? '✏️ Editar Item' : '🌾 Novo Item de Stock'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? 'Guardar' : 'Adicionar'}</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e => sf('tipo', e.target.value)}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Nome *">
            {sugestoesPorTipo[form.tipo]?.length > 0 ? (
              <select className="input" value={form.nome} onChange={e => sf('nome', e.target.value)}>
                <option value="">— Seleccionar ou escrever abaixo —</option>
                {sugestoesPorTipo[form.tipo].map(n => <option key={n}>{n}</option>)}
              </select>
            ) : null}
            <input className="input" placeholder="Nome do item" value={form.nome} onChange={e => sf('nome', e.target.value)} style={{ marginTop: sugestoesPorTipo[form.tipo]?.length > 0 ? 6 : 0 }} />
          </Field>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Quantidade *"><input className="input" type="number" step="0.1" value={form.qtd} onChange={e => sf('qtd', e.target.value)} /></Field>
            <Field label="Unidade"><select className="input" value={form.unidade} onChange={e => sf('unidade', e.target.value)}>{UNIDADES.map(u => <option key={u}>{u}</option>)}</select></Field>
            <Field label="Stock Mínimo (alerta)"><input className="input" type="number" step="0.1" value={form.qtd_minima} onChange={e => sf('qtd_minima', e.target.value)} /></Field>
            <Field label="Validade"><input className="input" type="date" value={form.validade} onChange={e => sf('validade', e.target.value)} /></Field>
          </div>
          <Field label="Preço (€)"><input className="input" type="number" step="0.01" value={form.preco} onChange={e => sf('preco', e.target.value)} /></Field>
          <Field label="Observações"><input className="input" value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar item"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar "{confirm?.nome}" do stock?</p>
      </Modal>
    </div>
  )
}
