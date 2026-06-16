import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const CORES = ['#1ed98a', '#D94F4F', '#2E7DD4', '#C9A44A', '#6C4FBB', '#E07B39']
const EMPTY = { nome: '', tipo: 'Misto', cap: '40', loc: '', lat: '', lon: '', cor: '#1ed98a' }

export default function Pombais({ nav }) {
  const toast = useToast()
  const [pombais, setPombais] = useState([])
  const [pombos, setPombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [pombalDetalhe, setPombalDetalhe] = useState(null)
  const [pomboDetalhe, setPomboDetalhe] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const [pb, p] = await Promise.all([db.getPombais(), db.getPombos()]); setPombais(pb); setPombos(p) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true) }
  const openEdit = (pb) => { setSelected(pb); setForm({ nome: pb.nome || '', tipo: pb.tipo || 'Misto', cap: String(pb.cap || 40), loc: pb.loc || '', lat: String(pb.lat || ''), lon: String(pb.lon || ''), cor: pb.cor || '#1ed98a' }); setModal(true) }
  const close = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório', 'warn'); return }
    setSaving(true)
    try {
      const p = { nome: form.nome.trim(), tipo: form.tipo, cap: parseInt(form.cap) || 40, loc: form.loc, lat: form.lat ? parseFloat(form.lat) : null, lon: form.lon ? parseFloat(form.lon) : null, cor: form.cor }
      selected ? await db.updatePombal(selected.id, p) : await db.createPombal(p)
      toast(selected ? 'Actualizado!' : 'Pombal criado!', 'ok'); close(); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deletePombal(confirm.id); toast('Eliminado', 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const irParaNovoPombo = (pombal) => {
    setPombalDetalhe(null)
    nav?.('pombos', { prefillPombal: pombal.nome })
  }

  const totalOcupacao = pombais.reduce((s, pb) => s + pombos.filter(p => p.pombal === pb.nome).length, 0)
  const sobreOcupados = pombais.filter(pb => {
    const n = pombos.filter(p => p.pombal === pb.nome).length
    return n > pb.cap
  })

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Pombais</div><div className="section-sub">{pombais.length} instalações · {totalOcupacao} pombos alojados</div></div>
        <button className="btn btn-primary" onClick={openNew}>＋ Novo Pombal</button>
      </div>

      {sobreOcupados.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: '#f87171', marginBottom: 6 }}>⚠️ {sobreOcupados.length} pombal(is) sobre-ocupado(s)</div>
          {sobreOcupados.map(pb => (
            <div key={pb.id} style={{ fontSize: 12, color: '#cbd5e1' }}>{pb.nome} — {pombos.filter(p => p.pombal === pb.nome).length}/{pb.cap}</div>
          ))}
        </div>
      )}

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : pombais.length === 0 ? <EmptyState icon="🏠" title="Sem pombais" desc="Registe o seu pombal" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Pombal</button>} />
          : (
            <div className="grid-2">
              {pombais.map(pb => {
                const n = pombos.filter(p => p.pombal === pb.nome).length
                const pct = Math.round(n / Math.max(pb.cap, 1) * 100)
                const bar = pct > 90 ? '#f87171' : pct > 70 ? '#facc15' : '#1ed98a'
                return (
                  <div key={pb.id} className="card card-p">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: pb.cor + '20', border: `1px solid ${pb.cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏠</div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{pb.nome}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{pb.tipo}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-icon btn-sm" onClick={() => setPombalDetalhe(pb)}>👁️</button>
                        <button className="btn btn-icon btn-sm" onClick={() => openEdit(pb)}>✏️</button>
                        <button className="btn btn-icon btn-sm" onClick={() => setConfirm(pb)}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: '#94a3b8' }}>Ocupação</span>
                      <span style={{ fontWeight: 600, color: pct > 100 ? '#f87171' : '#fff' }}>{n}/{pb.cap} ({pct}%)</span>
                    </div>
                    <div className="progress"><div className="progress-bar" style={{ width: `${Math.min(pct, 100)}%`, background: bar }} /></div>
                    {pb.loc && <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>📍 {pb.loc}</div>}
                    {n > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1e3050' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Pombos ({n}):</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {pombos.filter(p => p.pombal === pb.nome).slice(0, 8).map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#1a2840', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>
                              <span>{p.emoji}</span>
                              <span style={{ color: '#cbd5e1' }}>{p.nome}</span>
                            </div>
                          ))}
                          {n > 8 && <div style={{ fontSize: 11, color: '#64748b' }}>+{n - 8} mais</div>}
                        </div>
                      </div>
                    )}
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={() => irParaNovoPombo(pb)}>＋ Novo Pombo aqui</button>
                  </div>
                )
              })}
            </div>
          )
      }

      <Modal open={modal} onClose={close} title={selected ? '✏️ Editar Pombal' : '🏠 Novo Pombal'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}{selected ? 'Guardar' : 'Criar'}</button></>}>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome *"><input className="input" placeholder="Pombal Principal" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field></div>
          <Field label="Tipo"><select className="input" value={form.tipo} onChange={e => sf('tipo', e.target.value)}>{['Misto', 'Machos', 'Fêmeas', 'Jovens', 'Reprodutores'].map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Capacidade"><input className="input" type="number" value={form.cap} onChange={e => sf('cap', e.target.value)} /></Field>
          <div className="col-2"><Field label="Morada"><input className="input" placeholder="Endereço" value={form.loc} onChange={e => sf('loc', e.target.value)} /></Field></div>
          <Field label="Latitude GPS"><input className="input" placeholder="38.80234" value={form.lat} onChange={e => sf('lat', e.target.value)} /></Field>
          <Field label="Longitude GPS"><input className="input" placeholder="-9.38142" value={form.lon} onChange={e => sf('lon', e.target.value)} /></Field>
          <div className="col-2">
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>Cor</label>
            <div style={{ display: 'flex', gap: 8 }}>{CORES.map(c => <button key={c} type="button" onClick={() => sf('cor', c)} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: form.cor === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />)}</div>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar pombal"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1' }}>Eliminar "{confirm?.nome}"?</p>
      </Modal>

      <Modal open={!!pombalDetalhe} onClose={() => { setPombalDetalhe(null); setPomboDetalhe(null) }} title={`🏠 ${pombalDetalhe?.nome}`} wide>
        {pomboDetalhe ? (
          <div>
            <button className="btn btn-secondary btn-sm" style={{ marginBottom: 14 }} onClick={() => setPomboDetalhe(null)}>← Voltar</button>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: 14, background: '#1a2840', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, overflow: 'hidden', flexShrink: 0, border: '1px solid #243860' }}>
                {pomboDetalhe.foto_url ? <img src={pomboDetalhe.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : pomboDetalhe.emoji || '🐦'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{pomboDetalhe.nome}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#1ed98a', marginTop: 2 }}>{pomboDetalhe.anilha}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{pomboDetalhe.sexo === 'M' ? '♂ Macho' : '♀ Fêmea'} · {pomboDetalhe.cor || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
              {[['Provas', pomboDetalhe.provas || 0, '#facc15'], ['Percentil', (pomboDetalhe.percentil || 0) + '%', '#1ed98a'], ['Forma', (pomboDetalhe.forma || 50) + '%', '#60a5fa']].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: 'center', background: '#1a2840', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: 28, fontWeight: 700, color: c }}>{v}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div className="label">Pai</div><div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#1ed98a', marginTop: 4 }}>{pomboDetalhe.pai || '—'}</div></div>
              <div><div className="label">Mãe</div><div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#1ed98a', marginTop: 4 }}>{pomboDetalhe.mae || '—'}</div></div>
            </div>
            {pomboDetalhe.obs && <div style={{ marginTop: 12 }}><div className="label">Observações</div><div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>{pomboDetalhe.obs}</div></div>}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
              {pombos.filter(p => p.pombal === pombalDetalhe?.nome).length} pombos neste pombal
            </div>
            {pombos.filter(p => p.pombal === pombalDetalhe?.nome).length === 0
              ? <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 0' }}>Nenhum pombo neste pombal</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pombos.filter(p => p.pombal === pombalDetalhe?.nome).map(p => (
                    <div key={p.id} onClick={() => setPomboDetalhe(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#1a2840', borderRadius: 12, cursor: 'pointer', border: '1px solid #1e3050', transition: 'all .15s' }}
                      onMouseOver={e => e.currentTarget.style.borderColor = '#1ed98a'}
                      onMouseOut={e => e.currentTarget.style.borderColor = '#1e3050'}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#141f2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden', flexShrink: 0 }}>
                        {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.emoji || '🐦'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{p.nome}</div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#64748b' }}>{p.anilha}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.sexo === 'M' ? '♂' : '♀'} · {p.cor || '—'}</div>
                      <div style={{ fontFamily: 'Barlow Condensed', fontSize: 18, fontWeight: 700, color: '#1ed98a' }}>{p.percentil || 0}%</div>
                      <span style={{ color: '#475569', fontSize: 16 }}>›</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </Modal>
    </div>
  )
}
