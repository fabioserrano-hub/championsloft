import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const CATS_DESPESA = ['Alimentação', 'Veterinário/Medicamentos', 'Provas/Inscrições', 'Transporte', 'Equipamento', 'Manutenção Pombal', 'Aquisição de Pombos', 'Outros']
const CATS_RECEITA = ['Venda de Pombos', 'Prémios', 'Cedências', 'Outros']
const EMPTY = { tipo: 'despesa', cat: 'Alimentação', val: '', data_reg: new Date().toISOString().slice(0, 10), desc: '' }

export default function Financas({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()
  const [lista, setLista] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [periodo, setPeriodo] = useState('ano')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const [f, p] = await Promise.all([db.getFinancas(), db.getPombos()]); setLista(f); setPombos(p) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true) }
  const openEdit = (t) => { setSelected(t); setForm({ tipo: t.tipo, cat: t.cat || '', val: String(t.val || ''), data_reg: t.data_reg?.slice(0, 10) || '', desc: t.desc || '' }); setModal(true) }
  const close = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if (!form.val || parseFloat(form.val) <= 0) { toast('Valor obrigatório', 'warn'); return }
    setSaving(true)
    try {
      const payload = { tipo: form.tipo, cat: form.cat, val: parseFloat(form.val), data_reg: form.data_reg, desc: form.desc }
      selected ? await db.updateFinanca(selected.id, payload) : await db.createFinanca(payload)
      toast(selected ? 'Actualizado!' : 'Registado!', 'ok'); close(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteFinanca(confirm.id); toast('Eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const agora = new Date()
  const filtrarPeriodo = (t) => {
    const d = new Date(t.data_reg)
    if (periodo === 'mes') return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
    if (periodo === 'ano') return d.getFullYear() === agora.getFullYear()
    return true
  }
  const filtered = lista.filter(t => filtrarPeriodo(t) && (filtroTipo === 'todos' || t.tipo === filtroTipo)).sort((a, b) => new Date(b.data_reg) - new Date(a.data_reg))

  const rec = filtered.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.val, 0)
  const dep = filtered.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.val, 0)
  const saldo = rec - dep

  const porCategoria = {}
  filtered.filter(t => t.tipo === 'despesa').forEach(t => { porCategoria[t.cat] = (porCategoria[t.cat] || 0) + t.val })
  const topCategorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxCat = topCategorias[0]?.[1] || 1

  // Despesa associada a um pombo específico: só quando a descrição menciona claramente o nome dele
  // (não há noção de "rentabilidade" monetária — prémios em columbofilia são tipicamente honoríficos, não em dinheiro)
  const despesasPorPombo = {}
  filtered.filter(t => t.tipo === 'despesa' && t.desc).forEach(t => {
    pombos.forEach(p => {
      if (p.nome && t.desc.toLowerCase().includes(p.nome.toLowerCase())) {
        despesasPorPombo[p.nome] = (despesasPorPombo[p.nome] || 0) + t.val
      }
    })
  })
  const topDespesaPombo = Object.entries(despesasPorPombo).sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Finanças</div><div className="section-sub">{filtered.length} movimentos</div></div>
        <button className="btn btn-primary" onClick={openNew}>＋ Novo Movimento</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: '#101F40', borderRadius: 10, padding: 4 }}>
          {[['mes', 'Este Mês'], ['ano', 'Este Ano'], ['todos', 'Tudo']].map(([p, l]) => (
            <button key={p} onClick={() => setPeriodo(p)} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: periodo === p ? '#1E5FD9' : 'none', color: periodo === p ? '#fff' : '#94a3b8' }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['todos', 'Todos'], ['receita', '💰 Receitas'], ['despesa', '💸 Despesas']].map(([t, l]) => (
            <button key={t} onClick={() => setFiltroTipo(t)} className={`chip${filtroTipo === t ? ' active' : ''}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grid-3 mb-6">
        <div className="kpi"><div className="kpi-val text-green">+{rec.toFixed(0)}€</div><div className="kpi-label">Receitas</div></div>
        <div className="kpi"><div className="kpi-val text-red">-{dep.toFixed(0)}€</div><div className="kpi-label">Despesas</div></div>
        <div className="kpi"><div className="kpi-val" style={{ color: saldo >= 0 ? '#2DD4A7' : '#f87171' }}>{saldo >= 0 ? '+' : ''}{saldo.toFixed(0)}€</div><div className="kpi-label">Saldo</div></div>
      </div>

      {topDespesaPombo.length > 0 && (
        <div className="card card-p mb-6">
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>🐦 Despesa Associada a Pombos</div>
          <div style={{ fontSize: 11, color: '#7A8699', marginBottom: 12 }}>Calculado a partir da descrição dos movimentos. A rentabilidade real de um pombo é desportiva (provas, percentil) — isto mostra só custo.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topDespesaPombo.map(([nome, val]) => (
              <div key={nome} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#cbd5e1' }}>{nome}</span>
                <span style={{ color: '#f87171', fontWeight: 600 }}>{val.toFixed(0)}€</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topCategorias.length > 0 && (
        <div className="card card-p mb-6">
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>📊 Maiores Despesas por Categoria</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topCategorias.map(([cat, val]) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: '#cbd5e1' }}>{cat}</span>
                  <span style={{ color: '#f87171', fontWeight: 600 }}>{val.toFixed(0)}€</span>
                </div>
                <div className="progress"><div className="progress-bar" style={{ width: `${(val / maxCat) * 100}%`, background: '#f87171' }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : filtered.length === 0 ? <EmptyState icon="💰" title="Sem movimentos" desc="Registe receitas e despesas" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Movimento</button>} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(t => (
              <div key={t.id} className="card card-p">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 20 }}>{t.tipo === 'receita' ? '💰' : '💸'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{t.cat}</div>
                    <div style={{ fontSize: 11, color: '#7A8699' }}>{t.desc || '—'} · {new Date(t.data_reg).toLocaleDateString('pt-PT')}</div>
                  </div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 700, color: t.tipo === 'receita' ? '#2DD4A7' : '#f87171' }}>{t.tipo === 'receita' ? '+' : '-'}{t.val.toFixed(2)}€</div>
                  <button className="btn btn-icon btn-sm" onClick={() => openEdit(t)}>✏️</button>
                  <button className="btn btn-icon btn-sm" onClick={() => setConfirm(t)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
      }

      <Modal open={modal} onClose={close} title={selected ? '✏️ Editar Movimento' : '💰 Novo Movimento'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? t('guardar') : 'Registar'}</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['despesa', 'receita'].map(t => (
              <button key={t} type="button" onClick={() => sf('tipo', t)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: form.tipo === t ? `1px solid ${t === 'receita' ? '#2DD4A7' : '#f87171'}` : '1px solid #1B2D52', background: form.tipo === t ? (t === 'receita' ? 'rgba(45,212,167,.08)' : 'rgba(239,68,68,.08)') : '#101F40', color: form.tipo === t ? (t === 'receita' ? '#2DD4A7' : '#f87171') : '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                {t === 'receita' ? '💰 Receita' : '💸 Despesa'}
              </button>
            ))}
          </div>
          <Field label="Categoria">
            <select className="input" value={form.cat} onChange={e => sf('cat', e.target.value)}>
              {(form.tipo === 'despesa' ? CATS_DESPESA : CATS_RECEITA).map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Valor (€) *"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.val} onChange={e => sf('val', e.target.value)} /></Field>
            <Field label="Data"><input className="input" type="date" value={form.data_reg} onChange={e => sf('data_reg', e.target.value)} /></Field>
          </div>
          <Field label="Descrição"><input className="input" placeholder="Notas..." value={form.desc} onChange={e => sf('desc', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar movimento"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar este movimento?</p>
      </Modal>
    </div>
  )
}
