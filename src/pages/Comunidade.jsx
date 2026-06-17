import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, EmptyState, Badge, Modal, Field } from '../components/ui'

const DESAFIOS = [
  { id: 'd1', titulo: '5 Provas na Época', desc: 'Participe em 5 provas este ano', meta: 5, tipo: 'provas' },
  { id: 'd2', titulo: 'Primeira Vitória', desc: 'Conquiste o 1º lugar numa prova', meta: 1, tipo: 'vitorias' },
  { id: 'd3', titulo: 'Criador Dedicado', desc: 'Registe 3 acasalamentos na época', meta: 3, tipo: 'acasalamentos' },
  { id: 'd4', titulo: 'Efectivo Saudável', desc: 'Registe 10 acompanhamentos de saúde', meta: 10, tipo: 'saude' },
  { id: 'd5', titulo: 'Treino Constante', desc: 'Registe 10 treinos este ano', meta: 10, tipo: 'treinos' },
  { id: 'd6', titulo: 'Colecionador', desc: 'Tenha 20 ou mais pombos no efectivo', meta: 20, tipo: 'efectivo' },
  { id: 'd7', titulo: 'Campeão Regional', desc: 'Conquiste 3 vitórias na época', meta: 3, tipo: 'vitorias' },
  { id: 'd8', titulo: 'Organizado', desc: 'Conclua 15 tarefas no checklist', meta: 15, tipo: 'tarefas' },
]

export default function Comunidade({ nav }) {
  const toast = useToast()
  const { user } = useAuth()
  const [tab, setTab] = useState('feed')
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [ranking, setRanking] = useState([])
  const [pombos, setPombos] = useState([])
  const [provas, setProvas] = useState([])
  const [acasalamentos, setAcasalamentos] = useState([])
  const [saude, setSaude] = useState([])
  const [treinos, setTreinos] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [modalPost, setModalPost] = useState(false)
  const [textoPost, setTextoPost] = useState('')
  const [saving, setSaving] = useState(false)

  const anoAtual = new Date().getFullYear()
  const nome = user?.user_metadata?.nome?.split(' ')[0] || 'Columbófilo'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, r, pb, pv, ac, sa, tr, tf] = await Promise.all([
        db.getFeedPosts(), db.getRankingComunidade(), db.getPombos(), db.getProvas(), db.getAcasalamentos(), db.getSaude(), db.getTreinos(), db.getTarefas(),
      ])
      setPosts(p); setRanking(r); setPombos(pb); setProvas(pv); setAcasalamentos(ac); setSaude(sa); setTreinos(tr); setTarefas(tf)
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const efectivo = pombos.filter(p => !p.estado_ext || p.estado_ext === 'proprio')
  const provasAno = provas.filter(p => new Date(p.data_reg).getFullYear() === anoAtual)
  const vitoriasAno = provasAno.filter(p => p.lugar === 1).length
  const acasAno = acasalamentos.filter(a => new Date(a.data_acasalamento).getFullYear() === anoAtual)
  const treinosAno = treinos.filter(t => new Date(t.data_reg).getFullYear() === anoAtual)
  const tarefasConcluidas = tarefas.filter(t => t.estado === 'concluida')

  const progressoDesafio = (d) => {
    const valores = { provas: provasAno.length, vitorias: vitoriasAno, acasalamentos: acasAno.length, saude: saude.length, treinos: treinosAno.length, efectivo: efectivo.length, tarefas: tarefasConcluidas.length }
    return Math.min(valores[d.tipo] || 0, d.meta)
  }
  const desafiosCompletos = DESAFIOS.filter(d => progressoDesafio(d) >= d.meta)

  const BADGES = [
    { id: 'b1', nome: 'Primeira Vitória', icon: '🥇', cond: vitoriasAno >= 1 },
    { id: 'b2', nome: 'Tripla Coroa', icon: '👑', cond: vitoriasAno >= 3 },
    { id: 'b3', nome: 'Criador', icon: '🥚', cond: acasAno.length >= 1 },
    { id: 'b4', nome: 'Mestre Criador', icon: '🧬', cond: acasAno.length >= 5 },
    { id: 'b5', nome: 'Veterinário Amador', icon: '🏥', cond: saude.length >= 10 },
    { id: 'b6', nome: 'Treinador Dedicado', icon: '🎯', cond: treinosAno.length >= 10 },
    { id: 'b7', nome: 'Grande Efectivo', icon: '🏠', cond: efectivo.length >= 30 },
    { id: 'b8', nome: 'Organizado', icon: '✅', cond: tarefasConcluidas.length >= 15 },
  ]
  const badgesConquistados = BADGES.filter(b => b.cond)

  const publicar = async () => {
    if (!textoPost.trim()) return
    setSaving(true)
    try {
      await db.createFeedPost({ texto: textoPost.trim(), autor_nome: nome })
      toast('Publicado!', 'ok'); setModalPost(false); setTextoPost(''); load()
    } catch (e) { toast('Erro: ' + e.message + ' (verifique se a tabela community_posts existe)', 'err') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Comunidade</div><div className="section-sub">{badgesConquistados.length} badges · {desafiosCompletos.length}/{DESAFIOS.length} desafios</div></div>
        {tab === 'feed' && <button className="btn btn-primary" onClick={() => setModalPost(true)}>＋ Publicar</button>}
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#101F40', borderRadius: 10, padding: 4, marginBottom: 16, overflowX: 'auto' }}>
        {[['feed', '📰 Feed'], ['ranking', '🏆 Ranking'], ['desafios', '🎯 Desafios'], ['badges', '🏅 Badges']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap', background: tab === t ? '#1E5FD9' : 'none', color: tab === t ? '#fff' : '#94a3b8' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div> : (
        <>
          {tab === 'feed' && (
            posts.length === 0
              ? <EmptyState icon="📰" title="Feed vazio" desc="Seja o primeiro a publicar na comunidade" action={<button className="btn btn-primary" onClick={() => setModalPost(true)}>＋ Publicar</button>} />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {posts.map(p => (
                    <div key={p.id} className="card card-p">
                      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(45,212,167,.1)', border: '1px solid rgba(45,212,167,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#2DD4A7' }}>{(p.autor_nome || '?')[0]}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.autor_nome}</div>
                          <div style={{ fontSize: 11, color: '#7A8699' }}>{new Date(p.created_at).toLocaleDateString('pt-PT')}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: '#cbd5e1' }}>{p.texto}</div>
                    </div>
                  ))}
                </div>
          )}

          {tab === 'ranking' && (
            ranking.length === 0
              ? <EmptyState icon="🏆" title="Ranking vazio" desc="O ranking da comunidade aparece aqui quando houver dados disponíveis" />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ranking.map((r, i) => (
                    <div key={r.id || i} className="card card-p">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, width: 26, color: i === 0 ? '#D4AF37' : i === 1 ? '#cbd5e1' : i === 2 ? '#b45309' : '#475569' }}>{i + 1}</span>
                        <div style={{ flex: 1, fontSize: 13, color: '#fff' }}>{r.nome}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#2DD4A7' }}>{r.pontos} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {tab === 'desafios' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DESAFIOS.map(d => {
                const prog = progressoDesafio(d)
                const completo = prog >= d.meta
                return (
                  <div key={d.id} className="card card-p" style={{ borderColor: completo ? 'rgba(45,212,167,.3)' : undefined }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 20 }}>{completo ? '✅' : '🎯'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{d.titulo}</div>
                        <div style={{ fontSize: 11, color: '#7A8699' }}>{d.desc}</div>
                      </div>
                      <Badge v={completo ? 'green' : 'gray'}>{prog}/{d.meta}</Badge>
                    </div>
                    <div className="progress"><div className="progress-bar" style={{ width: `${(prog / d.meta) * 100}%`, background: completo ? '#2DD4A7' : '#4C8DFF' }} /></div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'badges' && (
            <div className="grid-4">
              {BADGES.map(b => (
                <div key={b.id} className="card card-p" style={{ textAlign: 'center', opacity: b.cond ? 1 : 0.4 }}>
                  <div style={{ fontSize: 32, marginBottom: 8, filter: b.cond ? 'none' : 'grayscale(1)' }}>{b.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: b.cond ? '#fff' : '#64748b' }}>{b.nome}</div>
                  {!b.cond && <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>Bloqueado</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={modalPost} onClose={() => setModalPost(false)} title="📰 Nova Publicação"
        footer={<><button className="btn btn-secondary" onClick={() => setModalPost(false)}>Cancelar</button><button className="btn btn-primary" onClick={publicar} disabled={saving}>{saving ? <Spinner /> : null}Publicar</button></>}>
        <Field label="O que se passa no seu pombal?">
          <textarea className="input" rows={4} style={{ resize: 'none' }} placeholder="Partilhe uma conquista, dúvida ou novidade..." value={textoPost} onChange={e => setTextoPost(e.target.value)} />
        </Field>
      </Modal>
    </div>
  )
}
