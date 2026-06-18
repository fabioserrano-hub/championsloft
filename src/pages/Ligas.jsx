import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const ESPECIALIDADES = [['todas', 'Todas'], ['velocidade', 'Velocidade'], ['meio_fundo', 'Meio-Fundo'], ['fundo', 'Fundo'], ['grande_fundo', 'Grande Fundo']]
const espLabel = Object.fromEntries(ESPECIALIDADES)
const TIPO_PARA_ESP = { 'Velocidade': 'velocidade', 'Meio-Fundo': 'meio_fundo', 'Fundo': 'fundo', 'Grande Fundo': 'grande_fundo', 'Treino Federado': 'velocidade' }

const LIGA_VAZIA = { nome: '', descricao: '', especialidade: 'todas', n_melhores_provas: 5 }

export default function Ligas({ nav }) {
  const toast = useToast()
  const { user } = useAuth()
  const [ligas, setLigas] = useState([])
  const [provas, setProvas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(LIGA_VAZIA)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [saving, setSaving] = useState(false)
  const [codigoEntrar, setCodigoEntrar] = useState('')
  const [nomeEntrar, setNomeEntrar] = useState('')

  const [ligaAberta, setLigaAberta] = useState(null)
  const [membros, setMembros] = useState([])
  const [resultadosLiga, setResultadosLiga] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [confirmSair, setConfirmSair] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const [l, p] = await Promise.all([db.getMinhasLigas(), db.getProvas()]); setLigas(l); setProvas(p) }
    catch (e) { toast('Erro: ' + e.message + ' (verifique se as tabelas leagues/league_members existem)', 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => { setForm(LIGA_VAZIA); setModal('nova') }
  const openEntrar = () => { setCodigoEntrar(''); setNomeEntrar(user?.user_metadata?.nome || ''); setModal('entrar') }

  const criarLiga = async () => {
    if (!form.nome.trim()) { toast('Nome da liga obrigatório', 'warn'); return }
    setSaving(true)
    try {
      await db.createLeague({ nome: form.nome.trim(), descricao: form.descricao, especialidade: form.especialidade, n_melhores_provas: parseInt(form.n_melhores_provas) || 5, nome_membro: user?.user_metadata?.nome || 'Eu' })
      toast('Liga criada!', 'ok'); setModal(null); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const entrarNaLiga = async () => {
    if (!codigoEntrar.trim() || !nomeEntrar.trim()) { toast('Preencha o código e o seu nome', 'warn'); return }
    setSaving(true)
    try {
      await db.entrarLigaPorCodigo(codigoEntrar.trim(), nomeEntrar.trim())
      toast('Entrou na liga!', 'ok'); setModal(null); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const abrirLiga = async (liga) => {
    setLigaAberta(liga); setLoadingDetail(true)
    try {
      const [m, r] = await Promise.all([db.getMembrosLiga(liga.id), db.getResultadosLiga(liga.id)])
      setMembros(m); setResultadosLiga(r)
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoadingDetail(false) }
  }

  const fecharLiga = () => { setLigaAberta(null); setMembros([]); setResultadosLiga([]) }

  const provasElegiveis = (liga) => provas.filter(p =>
    p.posicao_geral && p.n_pombos &&
    (liga.especialidade === 'todas' || TIPO_PARA_ESP[p.tipo] === liga.especialidade)
  )

  const sincronizarResultados = async () => {
    setSyncing(true)
    try {
      const elegiveis = provasElegiveis(ligaAberta)
      for (const p of elegiveis) {
        const percentil = Math.round((1 - (p.posicao_geral - 1) / p.n_pombos) * 1000) / 10
        await db.registarResultadoLiga({ league_id: ligaAberta.id, race_id: p.id, posicao_geral: p.posicao_geral, n_concorrentes: p.n_pombos, percentil })
      }
      toast(`${elegiveis.length} resultado(s) sincronizado(s)!`, 'ok')
      const r = await db.getResultadosLiga(ligaAberta.id)
      setResultadosLiga(r)
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSyncing(false) }
  }

  const sairDaLiga = async () => {
    try { await db.sairDeLiga(ligaAberta.id, user.id); toast('Saiu da liga', 'ok'); setConfirmSair(false); fecharLiga(); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const classificacao = (() => {
    if (!ligaAberta) return []
    return membros.map(m => {
      const resultadosMembro = resultadosLiga.filter(r => r.user_id === m.user_id)
      const melhores = [...resultadosMembro].sort((a, b) => b.percentil - a.percentil).slice(0, ligaAberta.n_melhores_provas)
      const media = melhores.length ? melhores.reduce((s, r) => s + r.percentil, 0) / melhores.length : 0
      return { ...m, media: Math.round(media * 10) / 10, n_provas: resultadosMembro.length }
    }).sort((a, b) => b.media - a.media)
  })()

  if (ligaAberta) {
    return (
      <div>
        <div className="section-header">
          <div>
            <div className="section-title">{ligaAberta.nome}</div>
            <div className="section-sub">{espLabel[ligaAberta.especialidade]} · Top {ligaAberta.n_melhores_provas} provas · código {ligaAberta.invite_code}</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fecharLiga}>← Voltar</button>
        </div>

        {loadingDetail ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div> : (
          <>
            <div className="card card-p mb-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{membros.length} membro(s) · partilhe o código <strong style={{ color: '#D4AF37' }}>{ligaAberta.invite_code}</strong> para convidar</div>
                <button className="btn btn-primary btn-sm" onClick={sincronizarResultados} disabled={syncing}>{syncing ? <Spinner /> : '🔄'} Sincronizar as minhas provas</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {classificacao.length === 0 ? (
                <EmptyState icon="🏆" title="Sem resultados ainda" desc="Sincronize as suas provas (com posição e nº de pombos preenchidos) para entrar na classificação" />
              ) : classificacao.map((m, i) => (
                <div key={m.id} className="card card-p" style={m.user_id === user?.id ? { borderColor: 'rgba(76,141,255,.4)', background: 'rgba(76,141,255,.06)' } : undefined}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, width: 26, color: i === 0 ? '#D4AF37' : i === 1 ? '#cbd5e1' : i === 2 ? '#b45309' : '#475569' }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#fff' }}>{m.nome}{m.user_id === user?.id ? ' (você)' : ''}</div>
                      <div style={{ fontSize: 11, color: '#7A8699' }}>{m.n_provas} prova(s) consideradas</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#2DD4A7' }}>{m.media}%</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmSair(true)}>Sair da liga</button>
            </div>
          </>
        )}

        <Modal open={confirmSair} onClose={() => setConfirmSair(false)} title="Sair da liga"
          footer={<><button className="btn btn-secondary" onClick={() => setConfirmSair(false)}>Cancelar</button><button className="btn btn-danger" onClick={sairDaLiga}>Sair</button></>}>
          <p style={{ fontSize: 14, color: '#cbd5e1' }}>Sair de "{ligaAberta.nome}"? Os seus resultados nesta liga serão removidos.</p>
        </Modal>
      </div>
    )
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Ligas</div><div className="section-sub">{ligas.length} liga(s) · classificação por percentil na prova oficial</div></div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={openEntrar}>🔑 Entrar por Código</button>
          <button className="btn btn-primary btn-sm" onClick={openNew}>＋ Nova Liga</button>
        </div>
      </div>

      <div style={{ background: 'rgba(76,141,255,.06)', border: '1px solid rgba(76,141,255,.15)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: '#94a3b8' }}>
        ℹ️ A classificação usa o <strong style={{ color: '#cbd5e1' }}>percentil</strong> da sua posição na prova oficial (ex: 5º em 87 = 95.4%), não a velocidade absoluta — assim columbófilos de regiões e condições diferentes competem de forma justa.
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : ligas.length === 0 ? <EmptyState icon="🏆" title="Sem ligas" desc="Crie uma liga privada ou entre numa através de um código de convite" action={<button className="btn btn-primary" onClick={openNew}>＋ Nova Liga</button>} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ligas.map(l => (
              <div key={l.id} className="card card-p" style={{ cursor: 'pointer' }} onClick={() => abrirLiga(l)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 20 }}>🏆</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{l.nome}{l.meu_role === 'admin' ? ' 👑' : ''}</div>
                    <div style={{ fontSize: 11, color: '#7A8699' }}>{espLabel[l.especialidade]} · época {l.epoca} · código {l.invite_code}</div>
                  </div>
                  <span style={{ color: '#7A8699' }}>→</span>
                </div>
              </div>
            ))}
          </div>
      }

      <Modal open={modal === 'nova'} onClose={() => setModal(null)} title="🏆 Nova Liga"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={criarLiga} disabled={saving}>{saving ? <Spinner /> : null}Criar Liga</button></>}>
        <Field label="Nome da Liga *"><input className="input" placeholder="Ex: Liga Amigos 2026" value={form.nome} onChange={e => sf('nome', e.target.value)} /></Field>
        <Field label="Descrição"><textarea className="input" rows={2} style={{ resize: 'none' }} value={form.descricao} onChange={e => sf('descricao', e.target.value)} /></Field>
        <div className="form-grid">
          <Field label="Especialidade"><select className="input" value={form.especialidade} onChange={e => sf('especialidade', e.target.value)}>{ESPECIALIDADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Nº melhores provas a contar"><input className="input" type="number" value={form.n_melhores_provas} onChange={e => sf('n_melhores_provas', e.target.value)} /></Field>
        </div>
        <div style={{ fontSize: 11, color: '#7A8699', marginTop: 4 }}>Após criar, vai receber um código de convite para partilhar com os outros participantes.</div>
      </Modal>

      <Modal open={modal === 'entrar'} onClose={() => setModal(null)} title="🔑 Entrar numa Liga"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={entrarNaLiga} disabled={saving}>{saving ? <Spinner /> : null}Entrar</button></>}>
        <Field label="Código de Convite *"><input className="input" placeholder="Ex: A1B2C3" value={codigoEntrar} onChange={e => setCodigoEntrar(e.target.value.toUpperCase())} /></Field>
        <Field label="O seu nome na liga *"><input className="input" placeholder="Como quer aparecer na classificação" value={nomeEntrar} onChange={e => setNomeEntrar(e.target.value)} /></Field>
      </Modal>
    </div>
  )
}
