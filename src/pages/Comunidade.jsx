import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Badge } from '../components/ui'

const TIPOS_POST = ['Geral', 'Resultado', 'Treino', 'Conquista', 'Reprodução', 'Pedigree']
const tipoIcon = { Geral:'📢', Resultado:'🏆', Treino:'🎯', Conquista:'🥇', Reprodução:'🥚', Pedigree:'🌳' }
const tipoCor = { Geral:'#4C8DFF', Resultado:'#D4AF37', Treino:'#2DD4A7', Conquista:'#D4AF37', Reprodução:'#c084fc', Pedigree:'#34d399' }
const REACOES = ['❤️','🏆','🐦','👏','😮']

const BADGES_DEF = [
  { id:'campeao',    icon:'🥇', nome:'Campeão',        desc:'Ganhou 1ª prova',           cond:d=>d.vitorias>=1 },
  { id:'podio',      icon:'🏅', nome:'Pódio',           desc:'Top 3 em 3 provas',         cond:d=>d.top3>=3 },
  { id:'veterano',   icon:'🎖️', nome:'Veterano',        desc:'Mais de 20 provas',         cond:d=>d.provas>=20 },
  { id:'criador',    icon:'🥚', nome:'Grande Criador',  desc:'10+ borrachinhos criados',  cond:d=>d.borrachinhos>=10 },
  { id:'ativo',      icon:'⚡', nome:'Activo',          desc:'5+ provas na época',        cond:d=>d.provas>=5 },
  { id:'genealogista',icon:'🌳',nome:'Genealogista',    desc:'5+ pombos com pedigree',    cond:d=>d.pombosComPedigree>=5 },
  { id:'centenario', icon:'💯', nome:'Centenário',      desc:'100+ provas acumuladas',    cond:d=>d.provas>=100 },
  { id:'especialista',icon:'🎯',nome:'Especialista',    desc:'3+ provas na mesma categ.', cond:d=>d.provas>=3 },
]

const DESAFIOS_SEMANAIS = [
  { id:'publica',     icon:'📢', nome:'Publicador',     desc:'Publica 3 posts esta semana',           meta:3,  tipo:'posts' },
  { id:'socializa',   icon:'❤️', nome:'Sociável',       desc:'Dá 5 likes esta semana',               meta:5,  tipo:'likes' },
  { id:'comenta',     icon:'💬', nome:'Comentador',     desc:'Faz 3 comentários esta semana',         meta:3,  tipo:'comments' },
  { id:'resultado',   icon:'🏆', nome:'Resulta',        desc:'Partilha 1 resultado de prova',         meta:1,  tipo:'resultado' },
  { id:'segue',       icon:'👥', nome:'Networker',      desc:'Segue 2 columbófilos',                  meta:2,  tipo:'follows' },
]

const ESPECIALIDADES_RANKING = ['Velocidade','Meio-Fundo','Fundo','Grande Fundo']

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

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <label style={{ fontSize:12, fontWeight:600, color:'#94a3b8' }}>{label}</label>
      {children}
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
  const [formPost, setFormPost] = useState({ tipo: 'Geral', conteudo: '', hashtags: '' })
  const [savingPost, setSavingPost] = useState(false)
  const [reacaoAberta, setReacaoAberta] = useState(null)

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
      const hashtags = (formPost.hashtags || '').split(/[\s,]+/).filter(h=>h).map(h=>h.startsWith('#')?h:'#'+h).join(' ')
      const conteudo = formPost.conteudo.slice(0, 500) + (hashtags ? '\n' + hashtags : '')
      await db.createPost({
        autor_nome: nome,
        autor_avatar: perfil?.foto_perfil_url || '',
        autor_username: user?.email?.split('@')[0] || 'user',
        tipo: formPost.tipo,
        conteudo,
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
  const [hashtagFiltro, setHashtagFiltro] = useState(null)
  const [pesquisa, setPesquisa] = useState('')
  const [tabRanking, setTabRanking] = useState('geral')
  const [showCartao, setShowCartao] = useState(false)

  const [modalRepost, setModalRepost] = useState(null)
  const [modalGrupo, setModalGrupo] = useState(false)
  const [grupos, setGrupos] = useState([
    { id:'vel', nome:'Velocidade PT', icon:'⚡', membros:234, desc:'Provas de velocidade em Portugal' },
    { id:'fundo', nome:'Fundo & G.Fundo', icon:'🏔️', membros:187, desc:'Especialistas em longas distâncias' },
    { id:'jan', nome:'Linha Janssen', icon:'🧬', membros:156, desc:'Criadores da linha Janssen' },
    { id:'norte', nome:'Norte de Portugal', icon:'🗺️', membros:98, desc:'Columbófilos do Norte' },
    { id:'centro', nome:'Centro Portugal', icon:'🗺️', membros:76, desc:'Região Centro' },
    { id:'sul', nome:'Sul & Alentejo', icon:'🗺️', membros:54, desc:'Região Sul' },
  ])
  const [gruposJunto, setGruposJunto] = useState(new Set())

  const formatConteudo = (texto) => {
    if (!texto) return null
    return texto.split('\n').map((linha, li) => (
      <div key={li}>
        {linha.split(/(\#\w+|@\w+)/g).map((part, i) =>
          part.startsWith('#')
            ? <span key={i} style={{ color:'#4C8DFF', cursor:'pointer', fontWeight:500 }} onClick={() => setHashtagFiltro(part)}>{part}</span>
            : part.startsWith('@')
              ? <span key={i} style={{ color:'#2DD4A7', fontWeight:600, cursor:'pointer' }}>{part}</span>
              : part
        )}
      </div>
    ))
  }

  const repostar = async (post) => {
    if (!modalRepost) return
    setSavingPost(true)
    try {
      await db.createPost({
        autor_nome: nome,
        autor_avatar: perfil?.foto_perfil_url || '',
        autor_username: user?.email?.split('@')[0] || 'user',
        tipo: post.tipo,
        conteudo: `🔁 Repost de @${post.autor_username||post.autor_nome}\n\n${post.conteudo}`,
        likes_count: 0, comments_count: 0,
      })
      toast('Repostado!', 'ok'); setModalRepost(null); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSavingPost(false) }
  }

  const PostCard = ({ post }) => {
    const souEu = post.user_id === user?.id
    const liked = myLikes.has(post.id)
    const cor = tipoCor[post.tipo] || '#4C8DFF'
    return (
      <div className="card" style={{ overflow:'hidden', marginBottom:0 }}>
        <div style={{ height:3, background:`linear-gradient(90deg,${cor},${cor}88)` }} />
        <div style={{ padding:'12px 14px' }}>
          <div style={{ display:'flex', gap:10, marginBottom:10, alignItems:'flex-start' }}>
            <div style={{ width:42, height:42, borderRadius:'50%', background:`linear-gradient(135deg,#1E5FD9,${cor})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff', flexShrink:0, overflow:'hidden', border:`2px solid ${cor}44` }}>
              {post.autor_avatar ? <img src={post.autor_avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : post.autor_nome?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:6 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{post.autor_nome || 'Columbófilo'}</div>
                <span style={{ fontSize:9, color:'#475569', flexShrink:0 }}><TempoAtras ts={post.created_at} /></span>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:2 }}>
                <span style={{ fontSize:10, background:`${cor}18`, color:cor, padding:'1px 8px', borderRadius:10, fontWeight:600 }}>{tipoIcon[post.tipo]} {post.tipo}</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.7, marginBottom:12 }}>
            {formatConteudo(post.conteudo)}
          </div>
          <div style={{ display:'flex', gap:4, alignItems:'center', borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:10, position:'relative' }}>
            <div style={{ position:'relative' }}>
              <button onClick={() => setReacaoAberta(reacaoAberta===post.id?null:post.id)}
                style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', fontSize:13, color:liked?'#f87171':'#7A8699', padding:'4px 8px', borderRadius:6 }}>
                {liked?'❤️':'🤍'} {post.likes_count||0}
              </button>
              {reacaoAberta===post.id && (
                <div style={{ position:'absolute', bottom:'100%', left:0, background:'#0B1830', border:'1px solid #1B2D52', borderRadius:12, padding:'6px 8px', display:'flex', gap:4, zIndex:50, boxShadow:'0 8px 24px rgba(0,0,0,.5)', marginBottom:4 }}>
                  {REACOES.map(r => (
                    <button key={r} onClick={() => { like(post); setReacaoAberta(null) }}
                      style={{ fontSize:20, background:'none', border:'none', cursor:'pointer', padding:'2px 4px', borderRadius:6, transition:'transform .1s' }}
                      onMouseEnter={e=>e.target.style.transform='scale(1.3)'} onMouseLeave={e=>e.target.style.transform='scale(1)'}>{r}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => abrirComments(post)}
              style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#7A8699', padding:'4px 8px', borderRadius:6 }}>
              💬 {post.comments_count||0}
            </button>
            <button onClick={() => {
              const txt = `${post.autor_nome}: ${post.conteudo.slice(0,100)}... — ChampionsLoft`
              navigator.share ? navigator.share({ title:'ChampionsLoft', text:txt }) : navigator.clipboard?.writeText(txt).then(()=>toast('Copiado!','ok'))
            }} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#7A8699', padding:'4px 8px', borderRadius:6 }}>
              🔗
            </button>
            <button onClick={() => setModalRepost(post)}
              style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#7A8699', padding:'4px 8px', borderRadius:6 }}>
              🔁
            </button>
            {souEu && <button onClick={async () => { await db.deletePost(post.id).catch(()=>{}); setPosts(ps=>ps.filter(p=>p.id!==post.id)) }}
              style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#475569', padding:'4px 8px', borderRadius:6 }}>🗑️</button>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* HEADER PREMIUM */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }} />
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif", letterSpacing:.5 }}>Comunidade</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:1 }}>{posts.length} publicações · {explorar.length} columbófilos</div>
          </div>
          <button onClick={() => setShowCartao(true)} style={{ background:'rgba(212,175,55,.12)', border:'1px solid rgba(212,175,55,.3)', borderRadius:10, padding:'7px 10px', cursor:'pointer', fontSize:11, color:'#D4AF37', fontWeight:600 }}>💳 Visita</button>
          <button className="btn btn-primary" onClick={() => setModalPost(true)} style={{ fontSize:12, fontWeight:700 }}>✏️ Publicar</button>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:12 }}>
          {[['👥',explorar.filter(p=>following.has(p.user_id)).length,'A seguir'],['❤️',posts.reduce((s,p)=>s+(p.likes_count||0),0),'Likes totais'],['🔔',nNaoLidas,'Novas notif.']].map(([icon,val,label])=>(
            <div key={label} style={{ flex:1, textAlign:'center', padding:'6px 4px', background:'rgba(255,255,255,.04)', borderRadius:8 }}>
              <div style={{ fontSize:11 }}>{icon} <strong style={{ color:'#fff' }}>{val}</strong></div>
              <div style={{ fontSize:9, color:'#475569' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pesquisa */}
      <div style={{ marginBottom:10 }}>
        <input className="input" placeholder="🔍 Pesquisar posts, @utilizadores, #hashtags..." value={pesquisa}
          onChange={e => { setPesquisa(e.target.value); e.target.value.startsWith('#') ? setHashtagFiltro(e.target.value) : setHashtagFiltro(null) }}
          style={{ fontSize:13, background:'#101F40', border:'1px solid #1B2D52' }} />
      </div>

      {/* TABS premium */}
<div style={{ display:'flex', gap:4, background:'#0A1628', borderRadius:12, padding:4, marginBottom:14, overflowX:'auto' }}>
  {[['feed','📰','Feed'],['explorar','🔍','Explorar'],['mapa','🗺️','Mapa'],['grupos','👥','Grupos'],['desafios','🎯','Desafios'],['notifs','🔔',nNaoLidas?`(${nNaoLidas})`:'Notif.'],['ranking','🏆','Ranking']].map(([t,icon,l]) => (
    <button key={t} onClick={() => setTab(t)} style={{ flex:'none', padding:'9px 16px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tab===t?'linear-gradient(135deg,#1E5FD9,#1456C0)':'none', color:tab===t?'#fff':'#7A8699', boxShadow:tab===t?'0 2px 8px rgba(30,95,217,.4)':'none', transition:'all .15s', display:'flex', alignItems:'center', gap:5 }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span>{l}</span>
    </button>
  ))}
</div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div> : (
        <>
          {tab==='feed' && (
            <div>
              {/* Stories */}
              {(provas.length > 0 || pombos.length > 0) && (
                <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:8, marginBottom:14 }}>
                  <div onClick={() => setModalPost(true)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', flexShrink:0 }}>
                    <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#D4AF37)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:'2px solid #D4AF37' }}>
                      {perfil?.foto_perfil_url ? <img src={perfil.foto_perfil_url} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} /> : '✏️'}
                    </div>
                    <span style={{ fontSize:9, color:'#7A8699', whiteSpace:'nowrap' }}>Publicar</span>
                  </div>
                  {pombos.filter(p=>p.foto_url&&p.estado==='ativo').slice(0,6).map(p => (
                    <div key={p.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', flexShrink:0 }} onClick={() => nav?.('pombos')}>
                      <div style={{ width:52, height:52, borderRadius:'50%', overflow:'hidden', border:'2px solid #2DD4A7' }}>
                        <img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      </div>
                      <span style={{ fontSize:9, color:'#94a3b8', maxWidth:54, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nome}</span>
                    </div>
                  ))}
                  {provas.slice(0,3).map(p => (
                    <div key={p.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', flexShrink:0 }} onClick={() => nav?.('provas')}>
                      <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#D4AF37,#B8960C)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:'2px solid #D4AF37' }}>🏆</div>
                      <span style={{ fontSize:9, color:'#94a3b8', maxWidth:54, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nome}</span>
                    </div>
                  ))}
                </div>
              )}

              {hashtagFiltro && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'6px 12px', background:'rgba(76,141,255,.1)', borderRadius:8, border:'1px solid rgba(76,141,255,.2)' }}>
                  <span style={{ fontSize:13, color:'#4C8DFF', fontWeight:600 }}>{hashtagFiltro}</span>
                  <button onClick={() => setHashtagFiltro(null)} style={{ background:'none', border:'none', color:'#7A8699', cursor:'pointer', fontSize:12, marginLeft:'auto' }}>✕ Limpar filtro</button>
                </div>
              )}

              {posts.length===0
                ? <EmptyState icon="📰" title="Feed vazio" desc="Publica o primeiro post ou segue outros columbófilos" action={<button className="btn btn-primary" onClick={() => setModalPost(true)}>✏️ Publicar</button>} />
                : <>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {posts
                        .filter(p => !hashtagFiltro || p.conteudo?.includes(hashtagFiltro))
                        .map(p => <PostCard key={p.id} post={p} />)
                      }
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
              <div style={{ display:'flex', gap:4, marginBottom:12, overflowX:'auto' }}>
                {[['geral','🏆 Geral'],...ESPECIALIDADES_RANKING.map(e=>[e,e])].map(([k,l])=>(
                  <button key={k} onClick={()=>setTabRanking(k)} style={{ flexShrink:0, padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:tabRanking===k?'#1E5FD9':'#101F40', color:tabRanking===k?'#fff':'#94a3b8' }}>{l}</button>
                ))}
              </div>
              <div style={{ fontSize:11, color:'#7A8699', marginBottom:12 }}>50pts/badge · 30pts/desafio · 10pts/publicação · 2pts/like</div>
              {tabRanking !== 'geral' && (
                <div style={{ background:'rgba(76,141,255,.08)', border:'1px solid rgba(76,141,255,.15)', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#94a3b8' }}>
                  Ranking de <strong style={{ color:'#4C8DFF' }}>{tabRanking}</strong> — baseado nos percentis dos pombos desta especialidade
                  {(() => {
                    const top = pombos.filter(p=>p.esp?.includes(tabRanking)).sort((a,b)=>(b.percentil||0)-(a.percentil||0)).slice(0,3)
                    return top.length>0 && <div style={{ marginTop:6 }}>{top.map((p,i)=><span key={p.id} style={{ marginRight:8, color:i===0?'#D4AF37':i===1?'#94a3b8':'#b45309' }}>{['🥇','🥈','🥉'][i]} {p.nome} ({p.percentil||0}%)</span>)}</div>
                  })()}
                </div>
              )}
              {ranking.length===0
                ? <EmptyState icon="🏆" title="Ranking vazio" desc="Publica resultados e conquista badges para entrar no ranking" />
                : <>
                    {ranking.length >= 3 && tabRanking==='geral' && (
                      <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-end', gap:8, marginBottom:16, padding:'16px 8px 0' }}>
                        {[ranking[1],ranking[0],ranking[2]].map((r,i)=>{
                          const pos=i===1?1:i===0?2:3
                          const alt=i===1?72:i===0?56:44
                          const cor=pos===1?'#D4AF37':pos===2?'#cbd5e1':'#b45309'
                          const med=pos===1?'🥇':pos===2?'🥈':'🥉'
                          return r?(
                            <div key={r.id||pos} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                              <div style={{ fontSize:10, color:'#fff', fontWeight:600, maxWidth:70, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.nome?.split(' ')[0]}</div>
                              <div style={{ fontSize:20 }}>{med}</div>
                              <div style={{ width:60, height:alt, background:`${cor}22`, border:`2px solid ${cor}`, borderRadius:'8px 8px 0 0', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <div style={{ fontSize:12, fontWeight:700, color:cor }}>{r.pontos}</div>
                              </div>
                            </div>
                          ):null
                        })}
                      </div>
                    )}
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {ranking.map((r,i)=>{
                        const souEu=r.nome===nome
                        const med=i===0?'🥇':i===1?'🥈':i===2?'🥉':null
                        return (
                          <div key={r.id||i} className="card card-p" style={souEu?{borderColor:'rgba(76,141,255,.4)',background:'rgba(76,141,255,.06)'}:undefined}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:28, textAlign:'center' }}>
                                {med?<span style={{ fontSize:18 }}>{med}</span>:<span style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:700, color:'#475569' }}>{i+1}</span>}
                              </div>
                              <div style={{ flex:1, fontSize:13, color:'#fff', fontWeight:souEu?700:400 }}>{r.nome}{souEu?' (você)':''}</div>
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

          {tab==='mapa' && (() => {
            const comGPS = explorar.filter(p => p.pombal_lat && p.pombal_lon)
            const todos = perfil?.pombal_lat
              ? [{ ...perfil, _eu:true }, ...comGPS.filter(p=>p.user_id!==user?.id)]
              : comGPS
            
            const MapaLeaflet = () => {
              const ref = useRef(null)
              useEffect(() => {
                if (!ref.current || !todos.length) return
                const loadLeaflet = async () => {
                  if (!window.L) {
                    await Promise.all([
                      new Promise(res => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; l.onload = res; document.head.appendChild(l) }),
                      new Promise(res => { const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = res; document.head.appendChild(s) })
                    ])
                  }
                  const L = window.L
                  if (ref.current._leaflet_id) return
                  const centro = todos[0] ? [todos[0].pombal_lat, todos[0].pombal_lon] : [39.5,-8]
                  const map = L.map(ref.current, { zoomControl:true }).setView(centro, 7)
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM', maxZoom:18 }).addTo(map)
                  todos.forEach(p => {
                    const eu = !!p._eu
                    const icon = L.divIcon({ className:'', html:`<div style="background:${eu?'#D4AF37':'#4C8DFF'};border:3px solid #fff;border-radius:50%;width:${eu?18:13}px;height:${eu?18:13}px;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>`, iconSize:[eu?18:13,eu?18:13], iconAnchor:[eu?9:6.5,eu?9:6.5] })
                    L.marker([p.pombal_lat,p.pombal_lon],{icon}).addTo(map).bindPopup(`<div style="font-family:sans-serif;min-width:150px;padding:4px"><strong>${p.nome||'Columbófilo'}</strong>${p.pombal_nome?`<br>🏠 ${p.pombal_nome}`:''}${p.org?`<br><small>${p.org}</small>`:''}${eu?'<br><span style="color:#B8960C;font-size:11px">✦ O teu pombal</span>':''}</div>`)
                  })
                  if (todos.length > 1) {
                    const bounds = L.latLngBounds(todos.map(p=>[p.pombal_lat,p.pombal_lon]))
                    map.fitBounds(bounds, { padding:[40,40] })
                  }
                }
                loadLeaflet()
                return () => {}
              }, [])
              return <div ref={ref} style={{ width:'100%', height:360, borderRadius:12, overflow:'hidden' }} />
            }
            
            return (
              <div>
                <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:10 }}>
                  <div style={{ fontSize:12, color:'#94a3b8' }}>
                    <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:'#D4AF37', marginRight:4 }} />Teu pombal
                    <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:'#4C8DFF', marginLeft:10, marginRight:4 }} />Comunidade
                    <span style={{ color:'#fff', marginLeft:6 }}>· {todos.length} pombais</span>
                  </div>
                </div>
                {todos.length === 0
                  ? <EmptyState icon="🗺️" title="Sem pombais no mapa" desc="Activa o perfil público e define coordenadas GPS do pombal em Perfil" />
                  : <MapaLeaflet />
                }
                {!perfil?.pombal_lat && (
                  <div style={{ marginTop:10, padding:'10px 14px', background:'rgba(212,175,55,.08)', border:'1px solid rgba(212,175,55,.2)', borderRadius:8, fontSize:12, color:'#D4AF37' }}>
                    ⚠️ O teu pombal não aparece — define as coordenadas GPS em Perfil
                    <button className="btn btn-secondary btn-sm" style={{ marginLeft:10 }} onClick={() => nav?.('perfil')}>Ir ao Perfil</button>
                  </div>
                )}
                {comGPS.filter(p=>p.user_id!==user?.id).length > 0 && (
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>Pombais registados</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {comGPS.filter(p=>p.user_id!==user?.id).map(p => (
                        <div key={p.id} className="card card-p" style={{ display:'flex', gap:10, alignItems:'center' }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', overflow:'hidden', flexShrink:0 }}>
                            {p.foto_perfil_url ? <img src={p.foto_perfil_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : p.nome?.[0]?.toUpperCase()||'?'}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</div>
                            <div style={{ fontSize:11, color:'#7A8699' }}>🏠 {p.pombal_nome||'Pombal'}{p.pombal_morada?` · ${p.pombal_morada}`:''}</div>
                          </div>
                          <button className={`btn btn-sm ${following.has(p.user_id)?'btn-secondary':'btn-primary'}`} onClick={() => seguir(p.user_id)}>
                            {following.has(p.user_id)?'✓':'+ Seguir'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {tab==='grupos' && (
            <div>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:12 }}>Grupos por especialidade e região. Junta-te para ver posts e interagir com columbófilos da mesma área.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {grupos.map(g => {
                  const junto = gruposJunto.has(g.id)
                  return (
                    <div key={g.id} className="card card-p" style={{ borderLeft:`3px solid ${junto?'#2DD4A7':'#1B2D52'}` }}>
                      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                        <div style={{ width:44, height:44, borderRadius:10, background: junto?'rgba(45,212,167,.15)':'#101F40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{g.icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{g.nome}</span>
                            {junto && <span style={{ fontSize:9, color:'#2DD4A7', background:'rgba(45,212,167,.1)', padding:'1px 6px', borderRadius:8 }}>Membro</span>}
                          </div>
                          <div style={{ fontSize:11, color:'#7A8699' }}>{g.desc}</div>
                          <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>👥 {g.membros + (junto?1:0)} membros</div>
                        </div>
                        <button onClick={() => setGruposJunto(s => { const n=new Set(s); junto?n.delete(g.id):n.add(g.id); return n })}
                          className={`btn btn-sm ${junto?'btn-secondary':'btn-primary'}`}>
                          {junto ? '✓ Junto' : '+ Juntar'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(76,141,255,.06)', border:'1px solid rgba(76,141,255,.15)', borderRadius:8, fontSize:12, color:'#7A8699', textAlign:'center' }}>
                🚀 Grupos com publicações próprias e mapa de membros — em breve
              </div>
            </div>
          )}

          {tab==='desafios' && (
            <div>
              <div className="card card-p" style={{ marginBottom:12, background:'linear-gradient(135deg,rgba(212,175,55,.1),rgba(212,175,55,.03))', border:'1px solid rgba(212,175,55,.25)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ fontSize:36 }}>🔥</div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:900, color:'#D4AF37', fontFamily:"'Fraunces',serif" }}>
                      {posts.filter(p=>p.user_id===user?.id&&new Date(p.created_at)>new Date(Date.now()-7*86400000)).length} posts esta semana
                    </div>
                    <div style={{ fontSize:12, color:'#94a3b8' }}>Publica diariamente para manter o streak!</div>
                  </div>
                </div>
              </div>
              <div style={{ fontWeight:600, color:'#fff', marginBottom:10, fontSize:13 }}>🎯 Desafios desta semana</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                {DESAFIOS_SEMANAIS.map(d => {
                  const prog = d.tipo==='posts' ? posts.filter(p=>p.user_id===user?.id&&new Date(p.created_at)>new Date(Date.now()-7*86400000)).length
                    : d.tipo==='resultado' ? posts.filter(p=>p.user_id===user?.id&&p.tipo==='Resultado'&&new Date(p.created_at)>new Date(Date.now()-7*86400000)).length
                    : d.tipo==='follows' ? following.size : 0
                  const pct = Math.min(100, Math.round(prog/d.meta*100))
                  const ok = prog >= d.meta
                  return (
                    <div key={d.id} className="card card-p" style={{ borderLeft:`3px solid ${ok?'#2DD4A7':'#1B2D52'}` }}>
                      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                        <span style={{ fontSize:20 }}>{d.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:ok?'#2DD4A7':'#fff' }}>{d.nome} {ok&&'✅'}</div>
                          <div style={{ fontSize:11, color:'#7A8699' }}>{d.desc}</div>
                        </div>
                        <div style={{ fontSize:12, fontWeight:700, color:ok?'#2DD4A7':'#D4AF37' }}>{prog}/{d.meta}</div>
                      </div>
                      <div style={{ height:4, background:'#101F40', borderRadius:2 }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:ok?'#2DD4A7':'#1E5FD9', borderRadius:2, transition:'width .5s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ fontWeight:600, color:'#fff', marginBottom:10, fontSize:13 }}>🏅 Badges conquistados</div>
              {(() => {
                const efect = pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio')
                const pAno = provas.filter(p=>new Date(p.data_reg).getFullYear()===new Date().getFullYear())
                const d = { vitorias:pAno.filter(p=>p.lugar===1).length, top3:pAno.filter(p=>p.lugar<=3).length, provas:pAno.length, borrachinhos:0, pombosComPedigree:efect.filter(p=>p.pai&&p.mae).length }
                const ok = BADGES_DEF.filter(b=>b.cond(d))
                const nok = BADGES_DEF.filter(b=>!b.cond(d))
                return <>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                    {ok.map(b=>(
                      <div key={b.id} style={{ background:'rgba(212,175,55,.1)', border:'1px solid rgba(212,175,55,.3)', borderRadius:10, padding:'8px 12px', textAlign:'center' }}>
                        <div style={{ fontSize:24 }}>{b.icon}</div>
                        <div style={{ fontSize:11, fontWeight:600, color:'#D4AF37' }}>{b.nome}</div>
                        <div style={{ fontSize:9, color:'#7A8699' }}>{b.desc}</div>
                      </div>
                    ))}
                    {ok.length===0 && <div style={{ fontSize:12, color:'#7A8699' }}>Ainda sem badges. Participa em provas para ganhar!</div>}
                  </div>
                  {nok.length>0&&<><div style={{ fontSize:11, color:'#475569', marginBottom:6 }}>Por conquistar:</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {nok.map(b=><div key={b.id} style={{ background:'#101F40', border:'1px solid #1B2D52', borderRadius:8, padding:'6px 10px', textAlign:'center', opacity:.4 }}>
                      <div style={{ fontSize:16 }}>{b.icon}</div><div style={{ fontSize:9, color:'#7A8699' }}>{b.nome}</div>
                    </div>)}
                  </div></>}
                </>
              })()}
            </div>
          )}

        </>
      )}

      {/* Cartão de visita digital */}
      <Modal open={showCartao} onClose={()=>setShowCartao(false)} title="💳 Cartão de Visita Digital">
        <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid #D4AF37', borderRadius:16, overflow:'hidden' }}>
          <div style={{ background:'linear-gradient(90deg,#B8960C,#D4AF37)', height:4 }} />
          <div style={{ padding:'20px 20px 16px' }}>
            <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:14 }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:'#fff', overflow:'hidden', border:'2px solid #D4AF37', flexShrink:0 }}>
                {perfil?.foto_perfil_url ? <img src={perfil.foto_perfil_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : nome?.[0]?.toUpperCase()||'?'}
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:900, color:'#D4AF37', fontFamily:"'Fraunces',serif" }}>{nome}</div>
                <div style={{ fontSize:12, color:'#94a3b8' }}>{perfil?.org||'Columbófilo'}</div>
                {perfil?.pombal_nome&&<div style={{ fontSize:11, color:'#4C8DFF' }}>🏠 {perfil.pombal_nome}</div>}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
              {[['🐦',pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio').length,'Pombos'],['🏆',provas.length,'Provas'],[(pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio').reduce((s,p)=>s+(p.percentil||0),0)/Math.max(1,pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio').length))|0+'%','Percentil médio','📊']].map(([icon,val,label])=>(
                <div key={label} style={{ background:'rgba(255,255,255,.05)', borderRadius:8, padding:'8px 4px', textAlign:'center' }}>
                  <div style={{ fontSize:14 }}>{icon}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{val}</div>
                  <div style={{ fontSize:9, color:'#7A8699' }}>{label}</div>
                </div>
              ))}
            </div>
            {perfil?.bio&&<div style={{ fontSize:11, color:'#94a3b8', marginBottom:8, fontStyle:'italic' }}>"{perfil.bio}"</div>}
            {perfil?.slug&&<div style={{ fontSize:10, color:'#475569', textAlign:'right' }}>championsloft.app/p/{perfil.slug}</div>}
          </div>
        </div>
        <button className="btn btn-secondary" style={{ width:'100%', marginTop:12 }} onClick={()=>{
          const txt=`${nome} — ${perfil?.org||'Columbófilo'}\n🐦 ${pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio').length} pombos · 🏆 ${provas.length} provas\nchampionsloft.app/p/${perfil?.slug||''}`
          navigator.share?navigator.share({title:'ChampionsLoft',text:txt}):navigator.clipboard?.writeText(txt).then(()=>toast('Copiado!','ok'))
        }}>🔗 Partilhar cartão</button>
      </Modal>

      {/* Modal publicar */}
      <Modal open={modalPost} onClose={() => { setModalPost(false); setFormPost({tipo:'Geral',conteudo:'',hashtags:''}) }} title="✏️ Nova Publicação"
        footer={<><button className="btn btn-secondary" onClick={() => setModalPost(false)}>Cancelar</button><button className="btn btn-primary" onClick={publicar} disabled={savingPost}>{savingPost?<Spinner />:null}Publicar</button></>}>
        <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
          {TIPOS_POST.map(t => (
            <button key={t} onClick={() => {
              setFormPost(f=>({...f, tipo:t}))
              if (t==='Resultado' && provas.length) {
                const ul = provas[0]
                setFormPost(f=>({...f, tipo:t, conteudo:`🏆 ${ul.nome} — ${ul.dist}km\n📍 ${ul.local_solta||''}\n📅 ${new Date(ul.data_reg).toLocaleDateString('pt-PT')}\n\n`, hashtags:'#prova #columbofilia'}))
              }
              if (t==='Treino') setFormPost(f=>({...f, tipo:t, hashtags:'#treino #pomboscorreio'}))
              if (t==='Reprodução') setFormPost(f=>({...f, tipo:t, hashtags:'#reproducao #borrachinhos'}))
            }} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', border:`1px solid ${formPost.tipo===t?tipoCor[t]:'#1B2D52'}`, fontFamily:'inherit', background:formPost.tipo===t?`${tipoCor[t]}22`:'none', color:formPost.tipo===t?tipoCor[t]:'#94a3b8' }}>
              {tipoIcon[t]} {t}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', flexShrink:0, overflow:'hidden' }}>
            {perfil?.foto_perfil_url ? <img src={perfil.foto_perfil_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : nome?.[0]?.toUpperCase()||'?'}
          </div>
          <textarea className="input" rows={5} style={{ resize:'none', flex:1 }}
            placeholder={formPost.tipo==='Resultado'?'Partilha o resultado da prova...' : formPost.tipo==='Conquista'?'Que conquista queres partilhar?' : `O que tens para partilhar? (${500-formPost.conteudo.length} restantes)`}
            value={formPost.conteudo} onChange={e => setFormPost(f=>({...f,conteudo:e.target.value.slice(0,500)}))} />
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:12, color:'#7A8699', flexShrink:0 }}>🏷️ Tags:</span>
          <input className="input" placeholder="#columbofilia #velocidade #fundo" value={formPost.hashtags} onChange={e => setFormPost(f=>({...f,hashtags:e.target.value}))} style={{ fontSize:12 }} />
        </div>
        {provas.length > 0 && formPost.tipo === 'Resultado' && (
          <div style={{ marginTop:10 }}>
            <div style={{ fontSize:11, color:'#7A8699', marginBottom:6 }}>Seleccionar prova:</div>
            <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4 }}>
              {provas.slice(0,5).map(p => (
                <button key={p.id} onClick={() => setFormPost(f=>({...f, conteudo:`🏆 ${p.nome} — ${p.dist}km\n📍 ${p.local_solta||''}\n📅 ${new Date(p.data_reg).toLocaleDateString('pt-PT')}\n\n`}))}
                  style={{ flexShrink:0, padding:'4px 10px', background:'#101F40', border:'1px solid #1B2D52', borderRadius:8, fontSize:11, color:'#cbd5e1', cursor:'pointer' }}>
                  🏆 {p.nome}
                </button>
              ))}
            </div>
          </div>
        )}
        {explorar.length > 0 && (
          <div style={{ marginTop:10 }}>
            <div style={{ fontSize:11, color:'#7A8699', marginBottom:6 }}>@ Mencionar:</div>
            <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4 }}>
              {explorar.slice(0,6).map(p => (
                <button key={p.id} onClick={() => setFormPost(f=>({...f, conteudo: f.conteudo + ` @${p.nome?.split(' ')[0].toLowerCase()}` }))}
                  style={{ flexShrink:0, padding:'3px 10px', background:'rgba(45,212,167,.1)', border:'1px solid rgba(45,212,167,.2)', borderRadius:12, fontSize:11, color:'#2DD4A7', cursor:'pointer' }}>
                  @{p.nome?.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal repost */}
      <Modal open={!!modalRepost} onClose={() => setModalRepost(null)} title="🔁 Repost"
        footer={<><button className="btn btn-secondary" onClick={() => setModalRepost(null)}>Cancelar</button><button className="btn btn-primary" onClick={() => repostar(modalRepost)} disabled={savingPost}>{savingPost?<Spinner/>:null}Repostar</button></>}>
        {modalRepost && (
          <div>
            <div style={{ background:'#101F40', borderRadius:8, padding:'10px 14px', marginBottom:12, borderLeft:'3px solid #4C8DFF' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#4C8DFF', marginBottom:4 }}>{modalRepost.autor_nome}</div>
              <div style={{ fontSize:12, color:'#94a3b8' }}>{modalRepost.conteudo.slice(0,150)}{modalRepost.conteudo.length>150?'...':''}</div>
            </div>
            <div style={{ fontSize:12, color:'#7A8699' }}>O post será partilhado no teu feed com referência ao autor original.</div>
          </div>
        )}
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
