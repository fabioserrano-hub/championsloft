import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Badge } from '../components/ui'

const TIPOS_POST = ['Geral', 'Resultado', 'Treino', 'Conquista']
const tipoIcon = { Geral: '📢', Resultado: '🏆', Treino: '🎯', Conquista: '🥇' }

const BADGES_DEF = [
  { id: 'campeao', icon: '🥇', nome: 'Campeão', cond: (d) => d.vitorias >= 1 },
  { id: 'podio', icon: '🏅', nome: 'Pódio', cond: (d) => d.top3 >= 3 },
  { id: 'veterano', icon: '🎖️', nome: 'Veterano', cond: (d) => d.provas >= 20 },
  { id: 'criador', icon: '🥚', nome: 'Grande Criador', cond: (d) => d.borrachinhos >= 10 },
  { id: 'ativo', icon: '⚡', nome: 'Activo', cond: (d) => d.provas >= 5 },
  { id: 'genealogista', icon: '🌳', nome: 'Genealogista', cond: (d) => d.pombosComPedigree >= 5 },
]

function TempoAtras({ ts }) {
  const d = (Date.now() - new Date(ts)) / 1000
  if (d < 60) return <span>{Math.round(d)}s</span>
  if (d < 3600) return <span>{Math.round(d/60)}m</span>
  if (d < 86400) return <span>{Math.round(d/3600)}h</span>
  return <span>{Math.round(d/86400)}d</span>
}

const FORUM_CATS = ['Todos','Geral','Alimentação','Saúde','Reprodução','Provas e Treinos','Genética','Equipamento','Legislação']

function ForumTab({ nome }) {
  const toast = useToast()
  const { user } = useAuth()
  const [topicos, setTopicos] = useState([])
  const [cat, setCat] = useState('Todos')
  const [topicoAberto, setTopicoAberto] = useState(null)
  const [respostas, setRespostas] = useState([])
  const [modalNovo, setModalNovo] = useState(false)
  const [form, setForm] = useState({ titulo:'', categoria:'Geral', conteudo:'' })
  const [novaResp, setNovaResp] = useState('')
  const [saving, setSaving] = useState(false)
  const [tabelaOk, setTabelaOk] = useState(true)

  const load = useCallback(async () => {
    try {
      const t = await db.getForumTopicos(cat)
      setTopicos(t); setTabelaOk(true)
    } catch(e) {
      if (e?.code === '42P01' || e?.message?.includes('42P01')) setTabelaOk(false)
      setTopicos([])
    }
  }, [cat])

  useEffect(() => { load() }, [load])

  const abrirTopico = async (t) => {
    setTopicoAberto(t)
    db.incrementForumViews(t.id)
    const r = await db.getForumRespostas(t.id).catch(() => [])
    setRespostas(r)
  }

  const criarTopico = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) { toast('Preencha título e conteúdo','warn'); return }
    setSaving(true)
    try {
      await db.createForumTopico({ ...form, autor_nome: nome })
      toast('Tópico criado!','ok'); setModalNovo(false); setForm({ titulo:'', categoria:'Geral', conteudo:'' }); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const enviarResposta = async () => {
    if (!novaResp.trim()) return
    setSaving(true)
    try {
      const r = await db.createForumResposta({ topico_id: topicoAberto.id, autor_nome: nome, conteudo: novaResp.trim() })
      setRespostas(rs => [...rs, r]); setNovaResp('')
      setTopicoAberto(t => ({ ...t, respostas_count: (t.respostas_count||0)+1 }))
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  if (topicoAberto) return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={() => { setTopicoAberto(null); load() }} style={{ marginBottom:12 }}>← Voltar</button>
      <div className="card card-p" style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:'#4C8DFF', marginBottom:4 }}>{topicoAberto.categoria}</div>
        <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:6 }}>{topicoAberto.titulo}</div>
        <div style={{ fontSize:12, color:'#94a3b8', marginBottom:8 }}>{topicoAberto.autor_nome} · {new Date(topicoAberto.created_at).toLocaleDateString('pt-PT')}</div>
        <div style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.6 }}>{topicoAberto.conteudo}</div>
      </div>
      <div style={{ fontSize:12, fontWeight:600, color:'#7A8699', marginBottom:8 }}>{respostas.length} resposta(s)</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
        {respostas.map(r => (
          <div key={r.id} className="card card-p">
            <div style={{ fontSize:11, color:'#4C8DFF', marginBottom:4 }}>{r.autor_nome} · {new Date(r.created_at).toLocaleDateString('pt-PT')}</div>
            <div style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.6 }}>{r.conteudo}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <textarea className="input" rows={3} style={{ resize:'none', flex:1 }} placeholder="Escreva uma resposta..." value={novaResp} onChange={e => setNovaResp(e.target.value)} />
        <button className="btn btn-primary" onClick={enviarResposta} disabled={saving} style={{ alignSelf:'flex-end' }}>{saving?<Spinner />:'Enviar'}</button>
      </div>
    </div>
  )

  return (
    <div>
      {!tabelaOk && (
        <div style={{ background:'rgba(212,175,55,.08)', border:'1px solid rgba(212,175,55,.2)', borderRadius:8, padding:'12px 16px', marginBottom:16, fontSize:12, color:'#D4AF37' }}>
          ⚠️ As tabelas do fórum ainda não foram criadas. Corra o ficheiro <strong>forum.sql</strong> no Supabase para activar esta funcionalidade.
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {FORUM_CATS.slice(0,5).map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:cat===c?'#1E5FD9':'#101F40', color:cat===c?'#fff':'#94a3b8' }}>{c}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModalNovo(true)}>＋ Novo Tópico</button>
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
        {FORUM_CATS.slice(5).map(c => (
          <button key={c} onClick={() => setCat(c)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:cat===c?'#1E5FD9':'#101F40', color:cat===c?'#fff':'#94a3b8' }}>{c}</button>
        ))}
      </div>
      {topicos.length===0
        ? <EmptyState icon="💬" title="Sem tópicos" desc="Seja o primeiro a criar um tópico nesta categoria" action={<button className="btn btn-primary" onClick={() => setModalNovo(true)}>＋ Novo Tópico</button>} />
        : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {topicos.map(t => (
              <div key={t.id} className="card card-p" style={{ cursor:'pointer' }} onClick={() => abrirTopico(t)}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  {t.fixado && <span style={{ fontSize:14 }}>📌</span>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:2 }}>{t.titulo}</div>
                    <div style={{ fontSize:11, color:'#7A8699' }}>{t.autor_nome} · {t.categoria} · {new Date(t.created_at).toLocaleDateString('pt-PT')}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:12, color:'#4C8DFF' }}>💬 {t.respostas_count||0}</div>
                    <div style={{ fontSize:10, color:'#475569' }}>👁 {t.views||0}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }
      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="💬 Novo Tópico"
        footer={<><button className="btn btn-secondary" onClick={() => setModalNovo(false)}>Cancelar</button><button className="btn btn-primary" onClick={criarTopico} disabled={saving}>{saving?<Spinner />:null}Publicar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Field label="Título *"><input className="input" placeholder="Descreva o assunto..." value={form.titulo} onChange={e => setForm(f=>({...f,titulo:e.target.value}))} /></Field>
          <Field label="Categoria">
            <select className="input" value={form.categoria} onChange={e => setForm(f=>({...f,categoria:e.target.value}))}>
              {FORUM_CATS.slice(1).map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Conteúdo *"><textarea className="input" rows={6} style={{ resize:'none' }} placeholder="Partilhe a sua questão, experiência ou dica..." value={form.conteudo} onChange={e => setForm(f=>({...f,conteudo:e.target.value}))} /></Field>
        </div>
      </Modal>
    </div>
  )
}

export default function Comunidade({ nav }) {
  const toast = useToast()
  const { user } = useAuth()
  const [tab, setTab] = useState('feed')
  const [posts, setPosts] = useState([])
  const [ranking, setRanking] = useState([])
  const [notifs, setNotifs] = useState([])
  const [explorar, setExplorar] = useState([])
  const [pombos, setPombos] = useState([])
  const [provas, setProvas] = useState([])
  const [acasalamentos, setAcasalamentos] = useState([])
  const [myLikes, setMyLikes] = useState(new Set())
  const [following, setFollowing] = useState(new Set())
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const [modalPost, setModalPost] = useState(false)
  const [formPost, setFormPost] = useState({ tipo: 'Geral', conteudo: '' })
  const [savingPost, setSavingPost] = useState(false)

  const [modalComments, setModalComments] = useState(null)
  const [comments, setComments] = useState([])
  const [novoComment, setNovoComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  const nome = perfil?.nome || user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Eu'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ps, pf, pv, ac, lk, fw, nt, rk, ex] = await Promise.all([
        db.getFeedPosts(20, 0).catch(() => db.getFeedPostsLegacy().catch(() => [])),
        db.getPerfil().catch(() => null),
        db.getProvas().catch(() => []),
        db.getAcasalamentos().catch(() => []),
        db.getMyLikes().catch(() => new Set()),
        db.getFollowing().catch(() => new Set()),
        db.getNotificacoes().catch(() => []),
        db.getRankingComunidade().catch(() => []),
        db.getExplorar().catch(() => []),
      ])
      const pb = await db.getPombos().catch(() => [])
      setPosts(ps); setPerfil(pf); setProvas(pv); setAcasalamentos(ac)
      setMyLikes(lk); setFollowing(fw); setNotifs(nt); setRanking(rk)
      setExplorar(ex); setPombos(pb)
      setOffset(20); setHasMore(ps.length === 20)
    } catch(e) { toast('Erro: '+e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Sincronizar ranking com badges/pontos actuais
  useEffect(() => {
    if (loading || !pombos.length) return
    const efectivo = pombos.filter(p => !p.estado_ext || p.estado_ext === 'proprio')
    const provasAno = provas.filter(p => new Date(p.data_reg).getFullYear() === new Date().getFullYear())
    const d = {
      vitorias: provasAno.filter(p => p.lugar === 1).length,
      top3: provasAno.filter(p => p.lugar <= 3).length,
      provas: provasAno.length,
      borrachinhos: acasalamentos.reduce((s, a) => s + (a.n_nascidos || a.ninhadas || 0), 0),
      pombosComPedigree: efectivo.filter(p => p.pai && p.mae).length,
    }
    const badges = BADGES_DEF.filter(b => b.cond(d))
    const pontos = badges.length * 50
    if (pontos > 0) {
      db.upsertRankingComunidade(nome, pontos).catch(() => {})
    }
  }, [loading, pombos.length])

  const carregarMais = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const mais = await db.getAllPosts(20, offset)
      setPosts(p => [...p, ...mais])
      setOffset(o => o + 20)
      setHasMore(mais.length === 20)
    } catch(e) {}
    finally { setLoadingMore(false) }
  }

  const publicar = async () => {
    if (!formPost.conteudo.trim()) { toast('Escreve algo primeiro', 'warn'); return }
    setSavingPost(true)
    try {
      await db.createPost({
        autor_nome: nome,
        autor_avatar: perfil?.foto_perfil_url || '',
        autor_username: user?.email?.split('@')[0] || 'user',
        tipo: formPost.tipo,
        conteudo: formPost.conteudo.slice(0, 500),
        likes_count: 0,
        comments_count: 0,
      })
      toast('Publicado!', 'ok')
      setModalPost(false); setFormPost({ tipo: 'Geral', conteudo: '' })
      load()
    } catch(e) { toast('Erro: '+e.message, 'err') }
    finally { setSavingPost(false) }
  }

  const like = async (post) => {
    try {
      const liked = await db.toggleLike(post.id)
      setMyLikes(s => {
        const n = new Set(s)
        liked ? n.add(post.id) : n.delete(post.id)
        return n
      })
      setPosts(ps => ps.map(p => p.id === post.id
        ? { ...p, likes_count: (p.likes_count||0) + (liked ? 1 : -1) }
        : p))
    } catch(e) {}
  }

  const abrirComments = async (post) => {
    setModalComments(post)
    const cs = await db.getComments(post.id).catch(() => [])
    setComments(cs)
  }

  const enviarComment = async () => {
    if (!novoComment.trim() || !modalComments) return
    setSavingComment(true)
    try {
      const c = await db.createComment(modalComments.id, novoComment.trim(), nome)
      setComments(cs => [...cs, c])
      setNovoComment('')
      setPosts(ps => ps.map(p => p.id === modalComments.id ? { ...p, comments_count: (p.comments_count||0)+1 } : p))
    } catch(e) { toast('Erro: '+e.message, 'err') }
    finally { setSavingComment(false) }
  }

  const seguir = async (uid) => {
    try {
      const ok = await db.toggleFollow(uid)
      setFollowing(s => { const n = new Set(s); ok ? n.add(uid) : n.delete(uid); return n })
    } catch(e) {}
  }

  const marcarLidas = async () => {
    await db.marcarTodasNotifLidas().catch(() => {})
    setNotifs(ns => ns.map(n => ({ ...n, lida: true })))
  }

  const nNaoLidas = notifs.filter(n => !n.lida).length

  const PostCard = ({ post }) => {
    const souEu = post.user_id === user?.id
    const liked = myLikes.has(post.id)
    return (
      <div className="card card-p">
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#fff', flexShrink:0, overflow:'hidden' }}>
            {post.autor_avatar ? <img src={post.autor_avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : post.autor_nome?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{post.autor_nome || 'Columbófilo'}</div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontSize:10, color:'#7A8699' }}><TempoAtras ts={post.created_at} /></span>
                <span style={{ fontSize:11, background:'rgba(76,141,255,.1)', color:'#4C8DFF', padding:'1px 8px', borderRadius:10 }}>{tipoIcon[post.tipo]} {post.tipo}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.6, marginBottom:12 }}>{post.conteudo}</div>
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          <button onClick={() => like(post)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', fontSize:13, color:liked?'#f87171':'#7A8699', padding:0 }}>
            {liked?'❤️':'🤍'} {post.likes_count||0}
          </button>
          <button onClick={() => abrirComments(post)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#7A8699', padding:0 }}>
            💬 {post.comments_count||0}
          </button>
          {souEu && <button onClick={async () => { await db.deletePost(post.id).catch(()=>{}); setPosts(ps=>ps.filter(p=>p.id!==post.id)) }} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#475569', padding:0 }}>🗑️</button>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Comunidade</div><div className="section-sub">{posts.length} publicações</div></div>
        <button className="btn btn-primary" onClick={() => setModalPost(true)}>✏️ Publicar</button>
      </div>

      <div style={{ display:'flex', gap:4, background:'#101F40', borderRadius:8, padding:4, marginBottom:16, overflowX:'auto' }}>
        {[['feed','📰 Feed'],['explorar','🔍 Explorar'],['notifs',`🔔 Notif.${nNaoLidas?` (${nNaoLidas})`:''}`],['ranking','🏆 Ranking']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'8px 10px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tab===t?'#1E5FD9':'none', color:tab===t?'#fff':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div> : (
        <>
          {tab==='feed' && (
            <div>
              {posts.length===0 ? <EmptyState icon="📰" title="Feed vazio" desc="Segue outros columbófilos ou publica o primeiro post" action={<button className="btn btn-primary" onClick={() => setModalPost(true)}>✏️ Publicar</button>} />
                : <>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {posts.map(p => <PostCard key={p.id} post={p} />)}
                    </div>
                    {hasMore && <button className="btn btn-secondary" style={{ width:'100%', marginTop:12 }} onClick={carregarMais} disabled={loadingMore}>{loadingMore ? <Spinner /> : 'Carregar mais'}</button>}
                  </>
              }
            </div>
          )}

          {tab==='explorar' && (
            <div>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:12 }}>Columbófilos da comunidade ChampionsLoft · Segue para ver os seus posts no teu feed.</div>
              {explorar.length===0
                ? <EmptyState icon="🔍" title="Sem perfis públicos" desc="Activa o teu perfil público em Perfil para aparecer aqui" />
                : <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {explorar.map(p => {
                      const isFollowing = following.has(p.user_id)
                      const souEu = p.user_id === user?.id
                      return (
                        <div key={p.id} className="card card-p" style={{ position:'relative', overflow:'hidden' }}>
                          {/* Faixa decorativa topo */}
                          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#1E5FD9,#D4AF37)' }} />
                          <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginTop:6 }}>
                            <div style={{ width:48, height:48, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'#fff', flexShrink:0, overflow:'hidden', border:'2px solid #1B2D52' }}>
                              {p.foto_perfil_url ? <img src={p.foto_perfil_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : p.nome?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nome}</div>
                              <div style={{ fontSize:10, color:'#7A8699' }}>{p.org || 'Columbófilo'}</div>
                              {p.pombal_morada && <div style={{ fontSize:10, color:'#4C8DFF' }}>📍 {p.pombal_morada}</div>}
                              {p.bio && <div style={{ fontSize:10, color:'#94a3b8', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.bio}</div>}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:6, marginTop:10 }}>
                            {!souEu && (
                              <button className={`btn btn-sm ${isFollowing?'btn-secondary':'btn-primary'}`} style={{ flex:1, fontSize:11 }} onClick={() => seguir(p.user_id)}>
                                {isFollowing ? '✓ A seguir' : '+ Seguir'}
                              </button>
                            )}
                            {p.slug && (
                              <button className="btn btn-secondary btn-sm" style={{ flex:1, fontSize:11 }} onClick={() => nav?.('perfil-publico', { slug: p.slug })}>
                                Ver perfil
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
              }
            </div>
          )}

          {tab==='notifs' && (
            <div>
              {notifs.length>0 && <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}><button className="btn btn-secondary btn-sm" onClick={marcarLidas}>Marcar todas como lidas</button></div>}
              {notifs.length===0 ? <EmptyState icon="🔔" title="Sem notificações" desc="As notificações de likes, comentários e seguidores aparecem aqui" />
                : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {notifs.map(n => (
                      <div key={n.id} onClick={() => db.marcarNotifLida(n.id).then(() => setNotifs(ns => ns.map(x => x.id===n.id?{...x,lida:true}:x)))}
                        className="card card-p" style={{ cursor:'pointer', opacity:n.lida?.8:1, borderColor:n.lida?undefined:'rgba(76,141,255,.3)', background:n.lida?undefined:'rgba(76,141,255,.04)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:20 }}>{n.tipo==='like'?'❤️':n.tipo==='comment'?'💬':n.tipo==='follow'?'👤':'🔔'}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, color:'#fff' }}>{n.conteudo}</div>
                            <div style={{ fontSize:11, color:'#7A8699' }}><TempoAtras ts={n.created_at} /></div>
                          </div>
                          {!n.lida && <div style={{ width:8, height:8, borderRadius:'50%', background:'#4C8DFF' }} />}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}

          {tab==='ranking' && (
            <div>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:12 }}>Pontuação: 50pts por badge · 30pts por desafio · 10pts por publicação · 2pts por like recebido</div>
              {ranking.length===0
                ? <EmptyState icon="🏆" title="Ranking vazio" desc="Publica resultados e conquista badges para entrar no ranking" />
                : <>
                    {/* Pódio top 3 */}
                    {ranking.length >= 3 && (
                      <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-end', gap:8, marginBottom:16, padding:'16px 8px 0' }}>
                        {[ranking[1], ranking[0], ranking[2]].map((r,i) => {
                          const pos = i===1?1:i===0?2:3
                          const altura = i===1?72:i===0?56:44
                          const cor = pos===1?'#D4AF37':pos===2?'#cbd5e1':'#b45309'
                          const medal = pos===1?'🥇':pos===2?'🥈':'🥉'
                          return r ? (
                            <div key={r.id||pos} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                              <div style={{ fontSize:11, color:'#fff', fontWeight:600, maxWidth:70, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.nome?.split(' ')[0]}</div>
                              <div style={{ fontSize:22 }}>{medal}</div>
                              <div style={{ width:60, height:altura, background:`${cor}22`, border:`2px solid ${cor}`, borderRadius:'8px 8px 0 0', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <div style={{ fontSize:13, fontWeight:700, color:cor }}>{r.pontos}</div>
                              </div>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                    {/* Lista completa */}
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {ranking.map((r,i) => {
                        const souEu = r.nome===nome
                        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':null
                        return (
                          <div key={r.id||i} className="card card-p" style={souEu?{borderColor:'rgba(76,141,255,.4)',background:'rgba(76,141,255,.06)'}:undefined}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:28, textAlign:'center' }}>
                                {medal ? <span style={{ fontSize:18 }}>{medal}</span>
                                  : <span style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:700, color:'#475569' }}>{i+1}</span>}
                              </div>
                              <div style={{ flex:1, fontSize:13, color:'#fff', fontWeight: souEu?700:400 }}>{r.nome}{souEu?' (você)':''}</div>
                              <div style={{ fontSize:15, fontWeight:700, color:'#D4AF37' }}>{r.pontos} <span style={{ fontSize:10, color:'#7A8699', fontWeight:400 }}>pts</span></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
              }
            </div>
          )}

        </>
      )}

      {/* Modal publicar */}
      <Modal open={modalPost} onClose={() => setModalPost(false)} title="✏️ Nova Publicação"
        footer={<><button className="btn btn-secondary" onClick={() => setModalPost(false)}>Cancelar</button><button className="btn btn-primary" onClick={publicar} disabled={savingPost}>{savingPost?<Spinner />:null}Publicar</button></>}>
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          {TIPOS_POST.map(t => (
            <button key={t} onClick={() => setFormPost(f=>({...f,tipo:t}))} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:formPost.tipo===t?'#1E5FD9':'#101F40', color:formPost.tipo===t?'#fff':'#94a3b8' }}>{tipoIcon[t]} {t}</button>
          ))}
        </div>
        <textarea className="input" rows={5} style={{ resize:'none', width:'100%' }} placeholder={`O que queres partilhar? (${500-formPost.conteudo.length} caracteres restantes)`} value={formPost.conteudo} onChange={e => setFormPost(f=>({...f,conteudo:e.target.value.slice(0,500)}))} />
      </Modal>

      {/* Modal comentários */}
      <Modal open={!!modalComments} onClose={() => { setModalComments(null); setComments([]) }} title="💬 Comentários"
        footer={<><input className="input" placeholder="Escreve um comentário..." value={novoComment} onChange={e => setNovoComment(e.target.value)} onKeyDown={e => e.key==='Enter' && enviarComment()} style={{ flex:1 }} /><button className="btn btn-primary btn-sm" onClick={enviarComment} disabled={savingComment}>{savingComment?<Spinner />:'Enviar'}</button></>}>
        {comments.length===0 ? <div style={{ textAlign:'center', color:'#7A8699', padding:'20px 0' }}>Sem comentários ainda. Sê o primeiro!</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {comments.map(c => (
                <div key={c.id} style={{ display:'flex', gap:8 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>{c.autor_nome?.[0]?.toUpperCase()||'?'}</div>
                  <div style={{ flex:1, background:'#101F40', borderRadius:8, padding:'8px 12px' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#4C8DFF', marginBottom:3 }}>{c.autor_nome}</div>
                    <div style={{ fontSize:13, color:'#cbd5e1' }}>{c.conteudo}</div>
                  </div>
                </div>
              ))}
            </div>
        }
      </Modal>
    </div>
  )
}
