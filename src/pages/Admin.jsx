import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Badge, Field } from '../components/ui'

const planoBadge = { gratuito: 'gray', base: 'blue', profissional: 'yellow', elite: 'green' }

export default function Admin({ nav }) {
  const toast = useToast()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(null)
  const [licencas, setLicencas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formPlano, setFormPlano] = useState('')
  const [formAtivo, setFormAtivo] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setLicencas(await db.getLicencas()) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  const checarAcesso = useCallback(async () => {
    if (!user?.email) return
    const ok = await db.isAdmin(user.email)
    setIsAdmin(ok)
    if (ok) load()
    else setLoading(false)
  }, [user, load])

  useEffect(() => { checarAcesso() }, [checarAcesso])

  if (isAdmin === null || loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Acesso Restrito</div>
        <div style={{ fontSize: 13, color: '#7A8699' }}>Esta área é exclusiva para administradores do ChampionsLoft.</div>
      </div>
    )
  }

  const filtradas = licencas.filter(l => !busca || l.email?.toLowerCase().includes(busca.toLowerCase()))
  const totalAtivos = licencas.filter(l => l.ativo !== false).length
  const porPlano = {}
  licencas.forEach(l => { const p = l.plano || 'gratuito'; porPlano[p] = (porPlano[p] || 0) + 1 })

  const mrrEstimado = (() => {
    const precos = { base: 7.99, profissional: 11.99, elite: 16.99, pro_grupo_1_5: 11.99, pro_grupo_6_12: 9.99, pro_grupo_13: 7.99, elite_grupo_1_5: 16.99, elite_grupo_6_12: 13.99, elite_grupo_13: 5.99 }
    return licencas.filter(l => l.ativo !== false).reduce((s, l) => s + (precos[l.plano] || 0), 0)
  })()

  const openEdit = (l) => { setModal(l); setFormPlano(l.plano || 'gratuito'); setFormAtivo(l.ativo !== false) }
  const close = () => setModal(null)

  const save = async () => {
    setSaving(true)
    try { await db.updateLicenca(modal.id, { plano: formPlano, ativo: formAtivo }); toast('Licença actualizada!', 'ok'); close(); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Admin</div><div className="section-sub">{licencas.length} contas registadas</div></div>
      </div>

      <div className="grid-4 mb-6">
        <div className="kpi"><div className="kpi-val text-green">{totalAtivos}</div><div className="kpi-label">Licenças Activas</div></div>
        <div className="kpi"><div className="kpi-val text-yellow">{porPlano.elite || 0}</div><div className="kpi-label">Elite AI</div></div>
        <div className="kpi"><div className="kpi-val text-blue">{porPlano.profissional || 0}</div><div className="kpi-label">Profissional</div></div>
        <div className="kpi"><div className="kpi-val">{mrrEstimado.toFixed(0)}€</div><div className="kpi-label">MRR Estimado</div></div>
      </div>

      <div className="card card-p mb-6">
        <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>📊 Distribuição por Plano</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(porPlano).sort((a, b) => b[1] - a[1]).map(([plano, n]) => (
            <div key={plano}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: '#cbd5e1', textTransform: 'capitalize' }}>{plano}</span>
                <span style={{ color: '#94a3b8' }}>{n} ({Math.round((n / licencas.length) * 100)}%)</span>
              </div>
              <div className="progress"><div className="progress-bar" style={{ width: `${(n / licencas.length) * 100}%`, background: '#2DD4A7' }} /></div>
            </div>
          ))}
        </div>
      </div>

      <input className="input" placeholder="🔍 Pesquisar por email..." value={busca} onChange={e => setBusca(e.target.value)} style={{ marginBottom: 16 }} />

      {filtradas.length === 0 ? <EmptyState icon="👥" title="Sem resultados" desc="Nenhuma conta encontrada" />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtradas.map(l => (
              <div key={l.id} className="card card-p">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{l.email}</div>
                    <div style={{ fontSize: 11, color: '#7A8699' }}>{l.created_at ? new Date(l.created_at).toLocaleDateString('pt-PT') : '—'}{l.vitalicio ? ' · Vitalícia' : ''}</div>
                  </div>
                  <Badge v={planoBadge[l.plano] || 'gray'}>{l.plano || 'gratuito'}</Badge>
                  <Badge v={l.ativo !== false ? 'green' : 'red'}>{l.ativo !== false ? 'Activa' : 'Inactiva'}</Badge>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(l)}>✏️ Gerir</button>
                </div>
              </div>
            ))}
          </div>
      }

      <Modal open={!!modal} onClose={close} title={`✏️ ${modal?.email}`}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}Guardar</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Plano">
            <select className="input" value={formPlano} onChange={e => setFormPlano(e.target.value)}>
              {['gratuito', 'base', 'profissional', 'elite', 'pro_grupo_1_5', 'pro_grupo_6_12', 'pro_grupo_13', 'elite_grupo_1_5', 'elite_grupo_6_12', 'elite_grupo_13'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={formAtivo} onChange={e => setFormAtivo(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2DD4A7' }} />
            <span style={{ fontSize: 13, color: '#cbd5e1' }}>Licença activa</span>
          </div>
          {modal?.vitalicio && <div style={{ fontSize: 11, color: '#D4AF37' }}>⚠️ Esta é uma licença vitalícia (admin)</div>}
        </div>
      </Modal>
    </div>
  )
}
