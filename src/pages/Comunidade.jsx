import { useState, useEffect, useCallback } from 'react'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'
import { db, supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIdioma } from '../hooks/useIdioma'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'
import { useToast, Spinner, Modal, EmptyState, Badge, Field } from '../components/ui'

// ── constantes ────────────────────────────────────────────────────────────────
const TIPOS_POST = ['Geral','Resultado','Treino','Conquista','Reprodução','Pedigree']
const tipoIcon   = { Geral:'📢',Resultado:'🏆',Treino:'🎯',Conquista:'🥇',Reprodução:'🥚',Pedigree:'🌳' }
const tipoCor    = { Geral:'#4C8DFF',Resultado:'#D4AF37',Treino:'#2DD4A7',Conquista:'#D4AF37',Reprodução:'#c084fc',Pedigree:'#34d399' }
const REACOES    = ['❤️','🏆','🐦','👏','😮']
const FORUM_CATS = ['Todos','Geral','Alimentação','Saúde','Reprodução','Provas e Treinos','Genética','Equipamento','Legislação']
const ESPECIALIDADES_RANKING = ['Velocidade','Meio-Fundo','Fundo','Grande Fundo']

const BADGES_DEF = [
  { id:'campeao',     icon:'🥇', nome:'Campeão',       desc:'Ganhou 1ª prova',          cond:d=>d.vitorias>=1 },
  { id:'podio',       icon:'🏅', nome:'Pódio',          desc:'Top 3 em 3 provas',        cond:d=>d.top3>=3 },
  { id:'veterano',    icon:'🎖️', nome:'Veterano',       desc:'Mais de 20 provas',        cond:d=>d.provas>=20 },
  { id:'criador',     icon:'🥚', nome:'Grande Criador', desc:'10+ borrachinhos criados', cond:d=>d.borrachinhos>=10 },
  { id:'ativo',       icon:'⚡', nome:'Activo',         desc:'5+ provas na época',       cond:d=>d.provas>=5 },
  { id:'genealogista',icon:'🌳', nome:'Genealogista',   desc:'5+ pombos com pedigree',   cond:d=>d.pombosComPedigree>=5 },
  { id:'centenario',  icon:'💯', nome:'Centenário',     desc:'100+ provas acumuladas',   cond:d=>d.provas>=100 },
  { id:'especialista',icon:'🎯', nome:'Especialista',   desc:'3+ provas mesma categ.',   cond:d=>d.provas>=3 },
]

const DESAFIOS_SEMANAIS = [
  { id:'publica',   icon:'📢', nome:'Publicador',  desc:'Publica 3 posts esta semana',   meta:3, tipo:'posts' },
  { id:'socializa', icon:'❤️', nome:'Sociável',    desc:'Dá 5 likes esta semana',        meta:5, tipo:'likes' },
  { id:'comenta',   icon:'💬', nome:'Comentador',  desc:'Faz 3 comentários esta semana', meta:3, tipo:'comments' },
  { id:'resultado', icon:'🏆', nome:'Resulta',     desc:'Partilha 1 resultado de prova', meta:1, tipo:'resultado' },
  { id:'segue',     icon:'👥', nome:'Networker',   desc:'Segue 2 columbófilos',          meta:2, tipo:'follows' },
]

// ── Mensagens contextuais LoftSocial ─────────────────────────────────────────
function gerarMensagensContextuais({ pombos, provas, acasalamentos }) {
  const msgs = []
  const agora = new Date()
  const efectivo = pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio')

  // próxima prova
  const proximasProvas = provas.filter(p=>p.data_reg&&new Date(p.data_reg)>agora).sort((a,b)=>new Date(a.data_reg)-new Date(b.data_reg))
  if (proximasProvas.length>0) {
    const p=proximasProvas[0]
    const dias=Math.round((new Date(p.data_reg)-agora)/86400000)
    if (dias<=7) msgs.push({ icon:'🏆', texto:`${p.nome} em ${dias===0?'hoje':dias===1?'amanhã':`${dias} dias`} — como está a preparação do efectivo?`, cor:'#D4AF37', acao:'provas' })
    else msgs.push({ icon:'📅', texto:`Próxima prova: ${p.nome} em ${dias} dias. Tempo de preparar a forma!`, cor:'#4C8DFF', acao:'provas' })
  }

  // eclosões previstas
  const eclosoesBreves=(acasalamentos||[]).filter(a=>{ if(!a.data_eclosao_prev) return false; const d=(new Date(a.data_eclosao_prev)-agora)/86400000; return d>=0&&d<=5 })
  if (eclosoesBreves.length>0) {
    const a=eclosoesBreves[0]
    const dias=Math.round((new Date(a.data_eclosao_prev)-agora)/86400000)
    msgs.push({ icon:'🥚', texto:dias===0?'Eclosão hoje! Já nasceu o próximo campeão?':`Eclosão prevista em ${dias===1?'amanhã':`${dias} dias`}. Já nasceu o próximo campeão?`, cor:'#2DD4A7', acao:'reproducao' })
  }

  // pombos em pico de forma
  const emFormaPico=efectivo.filter(p=>(p.forma||0)>=80)
  if (emFormaPico.length>0) {
    const p=emFormaPico[0]
    msgs.push({ icon:'📈', texto:`${p.nome} está em forma ${p.forma}% — altura ideal para inscrever numa prova!`, cor:'#2DD4A7', acao:'forma' })
  }

  // vitórias recentes
  const vitorias=provas.filter(p=>p.posicao_geral===1&&new Date(p.data_reg)>new Date(agora-30*86400000))
  if (vitorias.length>0) msgs.push({ icon:'🥇', texto:`${vitorias.length} vitória(s) este mês! Partilha com a comunidade LoftSocial 🏆`, cor:'#D4AF37', acao:null })

  // pombos sem registo de saúde
  const semSaude=efectivo.filter(p=>!p.ultima_saude||new Date(agora-new Date(p.ultima_saude))>14*86400000)
  if (semSaude.length>=3) msgs.push({ icon:'🏥', texto:`${semSaude.length} pombos sem registo de saúde há mais de 2 semanas. Tudo bem com o efectivo?`, cor:'#f87171', acao:'saude' })

  // mensagens genéricas quando sem contexto específico
  const genericas = [
    { icon:'🌟', texto:'Partilha as tuas experiências com a comunidade. Os teus resultados inspiram outros columbófilos!', cor:'#4C8DFF' },
    { icon:'💬', texto:'Tens alguma dica sobre alimentação ou treino? O fórum está à espera da tua experiência!', cor:'#c084fc' },
    { icon:'🐦', texto:'Como está o teu efectivo esta semana? Partilha uma foto ou resultado!', cor:'#2DD4A7' },
    { icon:'🏆', texto:'A época está a andar. Como vão as provas? Conta-nos no feed!', cor:'#D4AF37' },
  ]
  if (msgs.length===0) msgs.push(genericas[new Date().getDate()%genericas.length])
  return msgs.slice(0,3)
}

// ── Banner contextual ─────────────────────────────────────────────────────────
function BannerContextual({ mensagens, nav }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  useEffect(()=>{
    if(mensagens.length<=1) return
    const id=setInterval(()=>setIdx(i=>(i+1)%mensagens.length),5000)
    return()=>clearInterval(id)
  },[mensagens.length])
  if(!visible||!mensagens.length) return null
  const m=mensagens[idx]
  return (
    <div style={{background:`linear-gradient(135deg,${m.cor}12,${m.cor}06)`,border:`1px solid ${m.cor}25`,borderRadius:14,padding:'14px 16px',marginBottom:14,position:'relative',overflow:'hidden',cursor:m.acao?'pointer':'default'}}
      onClick={()=>m.acao&&nav?.(m.acao)}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:m.cor,opacity:.5}}/>
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <span style={{fontSize:26,flexShrink:0}}>{m.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:10,fontWeight:700,color:m.cor,textTransform:'uppercase',letterSpacing:.5,marginBottom:3}}>LoftSocial</div>
          <div style={{fontSize:13,color:'#fff',lineHeight:1.5}}>{m.texto}</div>
          {m.acao&&<div style={{fontSize:10,color:m.cor,marginTop:4}}>Ver mais →</div>}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'center'}}>
          {mensagens.map((_,i)=>(
            <div key={i} onClick={e=>{e.stopPropagation();setIdx(i)}} style={{width:5,height:5,borderRadius:'50%',background:i===idx?m.cor:'#334155',cursor:'pointer',transition:'background .2s'}}/>
          ))}
        </div>
      </div>
      <button onClick={e=>{e.stopPropagation();setVisible(false)}} style={{position:'absolute',top:8,right:10,background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:14}}>✕</button>
    </div>
  )
}

// ── ForumTab ──────────────────────────────────────────────────────────────────
function ForumTab({ nome, nav }) {
  const toast=useToast()
  const { temPro }=useLicenca()
  const [topicos, setTopicos]=useState([])
  const [cat, setCat]=useState('Todos')
  const [topicoAberto, setTopicoAberto]=useState(null)
  const [respostas, setRespostas]=useState([])
  const [modalNovo, setModalNovo]=useState(false)
  const [form, setForm]=useState({ titulo:'', categoria:'Geral', conteudo:'' })
  const [novaResp, setNovaResp]=useState('')
  const [saving, setSaving]=useState(false)
  const [tabelaOk, setTabelaOk]=useState(true)

  const load=useCallback(async()=>{
    try { const t=await db.getForumTopicos(cat); setTopicos(t); setTabelaOk(true) }
    catch(e) { if(e?.code==='42P01'||e?.message?.includes('42P01')) setTabelaOk(false); setTopicos([]) }
  },[cat])
  useEffect(()=>{ load() },[load])

  const abrirTopico=async(t)=>{ setTopicoAberto(t); db.incrementForumViews(t.id); const r=await db.getForumRespostas(t.id).catch(()=>[]); setRespostas(r) }

  const criarTopico=async()=>{
    if(!form.titulo.trim()||!form.conteudo.trim()){toast('Preencha título e conteúdo','warn');return}
    setSaving(true)
    try { await db.createForumTopico({...form,autor_nome:nome}); toast('Tópico criado!','ok'); setModalNovo(false); setForm({titulo:'',categoria:'Geral',conteudo:''}); load() }
    catch(e){toast('Erro: '+e.message,'err')} finally{setSaving(false)}
  }

  const enviarResposta=async()=>{
    if(!novaResp.trim()) return
    setSaving(true)
    try {
      const r=await db.createForumResposta({topico_id:topicoAberto.id,autor_nome:nome,conteudo:novaResp.trim()})
      setRespostas(rs=>[...rs,r]); setNovaResp('')
      setTopicoAberto(t=>({...t,respostas_count:(t.respostas_count||0)+1}))
    } catch(e){toast('Erro: '+e.message,'err')} finally{setSaving(false)}
  }

  if (topicoAberto) return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={()=>{setTopicoAberto(null);load()}} style={{marginBottom:12}}>← Voltar</button>
      <div className="card card-p" style={{marginBottom:12}}>
        <div style={{fontSize:11,color:'#4C8DFF',marginBottom:4}}>{topicoAberto.categoria}</div>
        <div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:6}}>{topicoAberto.titulo}</div>
        <div style={{fontSize:12,color:'#94a3b8',marginBottom:8}}>{topicoAberto.autor_nome} · {new Date(topicoAberto.created_at).toLocaleDateString('pt-PT')}</div>
        <div style={{fontSize:13,color:'#cbd5e1',lineHeight:1.6}}>{topicoAberto.conteudo}</div>
      </div>
      <div style={{fontSize:12,fontWeight:600,color:'#7A8699',marginBottom:8}}>{respostas.length} resposta(s)</div>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
        {respostas.map(r=>(
          <div key={r.id} className="card card-p">
            <div style={{fontSize:11,color:'#4C8DFF',marginBottom:4}}>{r.autor_nome} · {new Date(r.created_at).toLocaleDateString('pt-PT')}</div>
            <div style={{fontSize:13,color:'#cbd5e1',lineHeight:1.6}}>{r.conteudo}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:8}}>
        <textarea className="input" rows={3} style={{resize:'none',flex:1}} placeholder="Escreva uma resposta..." value={novaResp} onChange={e=>setNovaResp(e.target.value)}/>
        <button className="btn btn-primary" onClick={enviarResposta} disabled={saving} style={{alignSelf:'flex-end'}}>{saving?<Spinner/>:'Enviar'}</button>
      </div>
    </div>
  )

  if (!temPro) return <BloqueioPlano plano="pro" nav={nav}/>

  return (
    <div>
      {!tabelaOk&&(
        <div style={{background:'rgba(212,175,55,.08)',border:'1px solid rgba(212,175,55,.2)',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:12,color:'#D4AF37'}}>
          ⚠️ As tabelas do fórum ainda não foram criadas. Corra o ficheiro <strong>forum.sql</strong> no Supabase.
        </div>
      )}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {FORUM_CATS.slice(0,5).map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:500,cursor:'pointer',border:'none',fontFamily:'inherit',background:cat===c?'#1E5FD9':'#101F40',color:cat===c?'#fff':'#94a3b8'}}>{c}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModalNovo(true)}>＋ Novo Tópico</button>
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
        {FORUM_CATS.slice(5).map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:500,cursor:'pointer',border:'none',fontFamily:'inherit',background:cat===c?'#1E5FD9':'#101F40',color:cat===c?'#fff':'#94a3b8'}}>{c}</button>
        ))}
      </div>
      {topicos.length===0
        ?<EmptyState icon="💬" title="Sem tópicos" desc="Seja o primeiro a criar um tópico" action={<button className="btn btn-primary" onClick={()=>setModalNovo(true)}>＋ Novo Tópico</button>}/>
        :<div style={{display:'flex',flexDirection:'column',gap:6}}>
            {topicos.map(tp=>(
              <div key={tp.id} className="card card-p" style={{cursor:'pointer'}} onClick={()=>abrirTopico(tp)}>
                <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  {tp.fixado&&<span style={{fontSize:14}}>📌</span>}
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:2}}>{tp.titulo}</div>
                    <div style={{fontSize:11,color:'#7A8699'}}>{tp.autor_nome} · {tp.categoria} · {new Date(tp.created_at).toLocaleDateString('pt-PT')}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:12,color:'#4C8DFF'}}>💬 {tp.respostas_count||0}</div>
                    <div style={{fontSize:10,color:'#475569'}}>👁 {tp.views||0}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }
      <Modal open={modalNovo} onClose={()=>setModalNovo(false)} title="💬 Novo Tópico"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalNovo(false)}>Cancelar</button><button className="btn btn-primary" onClick={criarTopico} disabled={saving}>{saving?<Spinner/>:null}Publicar</button></>}>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Field label="Título *"><input className="input" placeholder="Descreva o assunto..." value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))}/></Field>
          <Field label="Categoria"><select className="input" value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>{FORUM_CATS.slice(1).map(c=><option key={c}>{c}</option>)}</select></Field>
          <Field label="Conteúdo *"><textarea className="input" rows={6} style={{resize:'none'}} placeholder="Partilhe a sua questão, experiência ou dica..." value={form.conteudo} onChange={e=>setForm(f=>({...f,conteudo:e.target.value}))}/></Field>
        </div>
      </Modal>
    </div>
  )
}

// ── TempoAtras ────────────────────────────────────────────────────────────────
function TempoAtras({ ts }) {
  const d=(Date.now()-new Date(ts))/1000
  if(d<60) return <span>{Math.round(d)}s</span>
  if(d<3600) return <span>{Math.round(d/60)}m</span>
  if(d<86400) return <span>{Math.round(d/3600)}h</span>
  return <span>{Math.round(d/86400)}d</span>
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Comunidade({ nav, params={} }) {
  const toast  = useToast()
  const { t }  = useIdioma()
  const { temPro } = useLicenca()
  const { user }   = useAuth()

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  const [tab, setTab]         = useState('feed')
  const [posts, setPosts]     = useState([])
  const [ranking, setRanking] = useState([])
  const [notifs, setNotifs]   = useState([])
  const [explorar, setExplorar] = useState([])
  const [pombos, setPombos]   = useState([])
  const [provas, setProvas]   = useState([])
  const [acasalamentos, setAcasalamentos] = useState([])
  const [treinos, setTreinos]             = useState([])
  const [myLikes, setMyLikes] = useState(new Set())
  const [following, setFollowing] = useState(new Set())
  const [perfil, setPerfil]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset]   = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [mensagensCtx, setMensagensCtx] = useState([])

  const [modalPost, setModalPost]   = useState(false)
  const [formPost, setFormPost]     = useState({ tipo:'Geral', conteudo:'', hashtags:'', video_url:'', foto_url:'', card_data:null, sondagem:false, sondagem_pergunta:'', sondagem_opcoes:['',''] })
  const [savingPost, setSavingPost] = useState(false)
  const [reacaoAberta, setReacaoAberta] = useState(null)
  const [modalComments, setModalComments] = useState(null)
  const [comments, setComments]     = useState([])
  const [novoComment, setNovoComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [hashtagFiltro, setHashtagFiltro] = useState(null)
  const [pesquisa, setPesquisa]     = useState('')
  const [tabRanking, setTabRanking] = useState('geral')
  const [showCartao, setShowCartao] = useState(false)
  const [modalRepost, setModalRepost] = useState(null)
  const [gruposJunto, setGruposJunto] = useState(new Set())

  const nome = perfil?.nome || user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Eu'

  const grupos = [
    { id:'vel',    nome:'Velocidade PT',    icon:'⚡', membros:234, desc:'Provas de velocidade em Portugal' },
    { id:'fundo',  nome:'Fundo & G.Fundo',  icon:'🏔️', membros:187, desc:'Especialistas em longas distâncias' },
    { id:'jan',    nome:'Linha Janssen',     icon:'🧬', membros:156, desc:'Criadores da linha Janssen' },
    { id:'norte',  nome:'Norte de Portugal', icon:'🗺️', membros:98,  desc:'Columbófilos do Norte' },
    { id:'centro', nome:'Centro Portugal',   icon:'🗺️', membros:76,  desc:'Região Centro' },
    { id:'sul',    nome:'Sul & Alentejo',    icon:'🗺️', membros:54,  desc:'Região Sul' },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ps,pf,pv,ac,lk,fw,nt,rk,ex] = await Promise.all([
        db.getFeedPosts(20,0).catch(()=>db.getFeedPostsLegacy().catch(()=>[])),
        db.getPerfil().catch(()=>null),
        db.getProvas().catch(()=>[]),
        db.getAcasalamentos().catch(()=>[]),
        db.getMyLikes().catch(()=>new Set()),
        db.getFollowing().catch(()=>new Set()),
        db.getNotificacoes().catch(()=>[]),
        db.getRankingComunidade().catch(()=>[]),
        db.getExplorar().catch(()=>[]),
      ])
      const pb=await db.getPombos().catch(()=>[])
      const tr=await db.getTreinos().catch(()=>[])
      setPosts(ps); setPerfil(pf); setProvas(pv); setAcasalamentos(ac)
      setMyLikes(lk); setFollowing(fw); setNotifs(nt); setRanking(rk)
      setExplorar(ex); setPombos(pb); setTreinos(tr)
      setOffset(20); setHasMore(ps.length===20)
      setMensagensCtx(gerarMensagensContextuais({pombos:pb,provas:pv,acasalamentos:ac}))
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])

  // Abrir modal pré-preenchido quando vem de outro módulo (ex: Pombos)
  useEffect(()=>{
    if(params?.prefillPost){
      setFormPost(f=>({...f,...params.prefillPost}))
      setModalPost(true)
    }
  },[params?.prefillPost])

  // badges e ranking
  useEffect(()=>{
    if(loading||!pombos.length) return
    const efect=pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio')
    const pAno=provas.filter(p=>new Date(p.data_reg).getFullYear()===new Date().getFullYear())
    const d={vitorias:pAno.filter(p=>p.lugar===1).length,top3:pAno.filter(p=>p.lugar<=3).length,provas:pAno.length,borrachinhos:0,pombosComPedigree:efect.filter(p=>p.pai&&p.mae).length}
    const badges=BADGES_DEF.filter(b=>b.cond(d))
    if(badges.length>0) db.upsertRankingComunidade(nome,badges.length*50).catch(()=>{})
  },[loading,pombos.length])

  const carregarMais=async()=>{
    if(loadingMore||!hasMore) return
    setLoadingMore(true)
    try{const mais=await db.getAllPosts(20,offset);setPosts(p=>[...p,...mais]);setOffset(o=>o+20);setHasMore(mais.length===20)}
    catch(e){}finally{setLoadingMore(false)}
  }

  const publicar=async()=>{
    if(!formPost.conteudo.trim()){toast('Escreve algo primeiro','warn');return}
    setSavingPost(true)
    try{
      const hashtags=(formPost.hashtags||'').split(/[\s,]+/).filter(h=>h).map(h=>h.startsWith('#')?h:'#'+h).join(' ')
      const conteudo=formPost.conteudo.slice(0,500)+(hashtags?'\n'+hashtags:'')
      const videoId=extrairYoutubeId(formPost.video_url||'')
      const video_url=videoId?`https://www.youtube.com/watch?v=${videoId}`:null
      const opcoesFiltradas=formPost.sondagem_opcoes.filter(o=>o.trim())
      const sondagem_pergunta=formPost.sondagem&&formPost.sondagem_pergunta.trim()?formPost.sondagem_pergunta.trim():null
      const sondagem_opcoes=sondagem_pergunta&&opcoesFiltradas.length>=2?opcoesFiltradas:null
      const sondagem_votos=sondagem_opcoes?Object.fromEntries(sondagem_opcoes.map(o=>[o,0])):null
      await db.createPost({autor_nome:nome,autor_avatar:perfil?.foto_perfil_url||'',autor_username:user?.email?.split('@')[0]||'user',tipo:formPost.tipo,conteudo,video_url,foto_url:formPost.foto_url||null,card_data:formPost.card_data||null,sondagem_pergunta,sondagem_opcoes,sondagem_votos,likes_count:0,comments_count:0})
      toast('Publicado!','ok');setModalPost(false);setFormPost({tipo:'Geral',conteudo:'',hashtags:'',video_url:'',card_data:null,sondagem:false,sondagem_pergunta:'',sondagem_opcoes:['','']});load()
    }catch(e){toast('Erro: '+e.message,'err')}finally{setSavingPost(false)}
  }

  const like=async(post)=>{
    try{
      const liked=await db.toggleLike(post.id)
      setMyLikes(s=>{const n=new Set(s);liked?n.add(post.id):n.delete(post.id);return n})
      setPosts(ps=>ps.map(p=>p.id===post.id?{...p,likes_count:(p.likes_count||0)+(liked?1:-1)}:p))
    }catch(e){}
  }

  const abrirComments=async(post)=>{setModalComments(post);const cs=await db.getComments(post.id).catch(()=>[]);setComments(cs)}

  const enviarComment=async()=>{
    if(!novoComment.trim()||!modalComments) return
    setSavingComment(true)
    try{
      const c=await db.createComment(modalComments.id,novoComment.trim(),nome)
      setComments(cs=>[...cs,c]);setNovoComment('')
      setPosts(ps=>ps.map(p=>p.id===modalComments.id?{...p,comments_count:(p.comments_count||0)+1}:p))
    }catch(e){toast('Erro: '+e.message,'err')}finally{setSavingComment(false)}
  }

  const seguir=async(uid)=>{
    try{const ok=await db.toggleFollow(uid);setFollowing(s=>{const n=new Set(s);ok?n.add(uid):n.delete(uid);return n})}catch(e){}
  }

  const marcarLidas=async()=>{
    await db.marcarTodasNotifLidas().catch(()=>{})
    setNotifs(ns=>ns.map(n=>({...n,lida:true})))
  }

  const repostar=async(post)=>{
    setSavingPost(true)
    try{
      await db.createPost({autor_nome:nome,autor_avatar:perfil?.foto_perfil_url||'',autor_username:user?.email?.split('@')[0]||'user',tipo:post.tipo,conteudo:`🔁 Repost de @${post.autor_username||post.autor_nome}\n\n${post.conteudo}`,likes_count:0,comments_count:0})
      toast('Repostado!','ok');setModalRepost(null);load()
    }catch(e){toast('Erro: '+e.message,'err')}finally{setSavingPost(false)}
  }

  const nNaoLidas=notifs.filter(n=>!n.lida).length

  const extrairYoutubeId=(url)=>{
    if(!url) return null
    const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/)
    return m?m[1]:null
  }

  const formatConteudo=(texto)=>{
    if(!texto) return null
    return texto.split('\n').map((linha,li)=>(
      <div key={li}>
        {linha.split(/(\#\w+|@\w+)/g).map((part,i)=>
          part.startsWith('#')?<span key={i} style={{color:'#4C8DFF',cursor:'pointer',fontWeight:500}} onClick={()=>setHashtagFiltro(part)}>{part}</span>
          :part.startsWith('@')?<span key={i} style={{color:'#2DD4A7',fontWeight:600,cursor:'pointer'}}>{part}</span>
          :part
        )}
      </div>
    ))
  }

  // ── PostCard ────────────────────────────────────────────────────────────────
  const PostCard=({post})=>{
    const souEu=post.user_id===user?.id
    const liked=myLikes.has(post.id)
    const cor=tipoCor[post.tipo]||'#4C8DFF'
    const [editando,setEditando]=useState(false)
    const [editTxt,setEditTxt]=useState(post.conteudo||'')
    const [savingEdit,setSavingEdit]=useState(false)

    const [votando,setVotando]=useState(false)
    const [votosLocais,setVotosLocais]=useState(post.sondagem_votos||{})
    const [minhaOpcao,setMinhaOpcao]=useState(null)

    const votar=async(opcao)=>{
      if(minhaOpcao||votando) return
      setVotando(true)
      try{
        const novosVotos={...votosLocais,[opcao]:(votosLocais[opcao]||0)+1}
        await supabase.from('posts').update({sondagem_votos:novosVotos}).eq('id',post.id)
        setVotosLocais(novosVotos);setMinhaOpcao(opcao)
      }catch(e){toast('Erro ao votar','err')}finally{setVotando(false)}
    }

    const guardarEdicao=async()=>{
      if(!editTxt.trim()) return
      setSavingEdit(true)
      try{
        await supabase.from('posts').update({conteudo:editTxt.trim()}).eq('id',post.id)
        setPosts(ps=>ps.map(p=>p.id===post.id?{...p,conteudo:editTxt.trim()}:p))
        setEditando(false);toast('Post actualizado','ok')
      }catch(e){toast('Erro ao guardar','err')}finally{setSavingEdit(false)}
    }

    return (
      <div className="card" style={{overflow:'hidden',marginBottom:0}}>
        <div style={{height:3,background:`linear-gradient(90deg,${cor},${cor}88)`}}/>
        <div style={{padding:'12px 14px'}}>
          <div style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
            <div style={{width:42,height:42,borderRadius:'50%',background:`linear-gradient(135deg,#1E5FD9,${cor})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'#fff',flexShrink:0,overflow:'hidden',border:`2px solid ${cor}44`}}>
              {post.autor_avatar?<img src={post.autor_avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:post.autor_nome?.[0]?.toUpperCase()||'?'}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:6}}>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{post.autor_nome||'Columbófilo'}</div>
                  {explorar.find(e=>e.user_id===post.user_id)?.verificado&&(
                    <span title="Columbófilo verificado" style={{fontSize:10,background:'linear-gradient(135deg,#1E5FD9,#2DD4A7)',borderRadius:'50%',width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,flexShrink:0}}>✓</span>
                  )}
                </div>
                <span style={{fontSize:9,color:'#475569',flexShrink:0}}><TempoAtras ts={post.created_at}/></span>
              </div>
              <span style={{fontSize:10,background:`${cor}18`,color:cor,padding:'1px 8px',borderRadius:10,fontWeight:600}}>{tipoIcon[post.tipo]} {post.tipo}</span>
            </div>
          </div>
          {post.card_data&&(()=>{
            const cd=post.card_data
            if(cd.tipo==='pombo') return (
              <div style={{marginBottom:12,borderRadius:12,overflow:'hidden',border:'1px solid rgba(212,175,55,.25)',background:'linear-gradient(135deg,#050D1A,#0B1830)'}}>
                {cd.foto_url&&<img src={cd.foto_url} alt="" style={{width:'100%',height:140,objectFit:'cover',display:'block'}}/>}
                <div style={{padding:'10px 12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{cd.nome}</div>
                      <div style={{fontSize:11,color:'#7A8699'}}>{cd.anilha} · {cd.sexo==='M'?'♂':'♀'} · {cd.cor}</div>
                    </div>
                    {cd.percentil&&<div style={{textAlign:'right'}}>
                      <div style={{fontSize:18,fontWeight:900,color:'#D4AF37'}}>{cd.percentil}%</div>
                      <div style={{fontSize:9,color:'#7A8699'}}>PERCENTIL</div>
                    </div>}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    {cd.forma&&<div style={{flex:1,background:'rgba(45,212,167,.1)',borderRadius:6,padding:'4px 8px',textAlign:'center'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#2DD4A7'}}>{cd.forma}%</div>
                      <div style={{fontSize:9,color:'#7A8699'}}>FORMA</div>
                    </div>}
                    {cd.provas&&<div style={{flex:1,background:'rgba(76,141,255,.1)',borderRadius:6,padding:'4px 8px',textAlign:'center'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#4C8DFF'}}>{cd.provas}</div>
                      <div style={{fontSize:9,color:'#7A8699'}}>PROVAS</div>
                    </div>}
                    {cd.esp?.length>0&&<div style={{flex:1,background:'rgba(212,175,55,.1)',borderRadius:6,padding:'4px 8px',textAlign:'center'}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#D4AF37'}}>{cd.esp[0]}</div>
                      <div style={{fontSize:9,color:'#7A8699'}}>ESP.</div>
                    </div>}
                  </div>
                </div>
              </div>
            )
            if(cd.tipo==='prova') return (
              <div style={{marginBottom:12,borderRadius:12,border:'1px solid rgba(212,175,55,.25)',background:'linear-gradient(135deg,#050D1A,#0B1830)',padding:'12px 14px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <div style={{fontSize:36}}>{cd.lugar===1?'🥇':cd.lugar===2?'🥈':cd.lugar===3?'🥉':'🏅'}</div>
                  <div>
                    <div style={{fontSize:16,fontWeight:900,color:'#D4AF37'}}>{cd.lugar}º lugar{cd.total?' de '+cd.total:''}</div>
                    <div style={{fontSize:11,color:'#7A8699'}}>{cd.local_largada}{cd.data?' · '+cd.data:''}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {cd.distancia&&<span style={{fontSize:11,padding:'3px 8px',background:'rgba(76,141,255,.12)',border:'1px solid rgba(76,141,255,.2)',borderRadius:6,color:'#4C8DFF'}}>📏 {cd.distancia}km</span>}
                  {cd.velocidade&&<span style={{fontSize:11,padding:'3px 8px',background:'rgba(45,212,167,.12)',border:'1px solid rgba(45,212,167,.2)',borderRadius:6,color:'#2DD4A7'}}>⚡ {cd.velocidade}m/min</span>}
                  {cd.percentil&&<span style={{fontSize:11,padding:'3px 8px',background:'rgba(212,175,55,.12)',border:'1px solid rgba(212,175,55,.2)',borderRadius:6,color:'#D4AF37'}}>📊 {cd.percentil}%</span>}
                  {cd.pombo_nome&&<span style={{fontSize:11,padding:'3px 8px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,color:'#cbd5e1'}}>🕊️ {cd.pombo_nome}</span>}
                </div>
              </div>
            )
            if(cd.tipo==='treino') return (
              <div style={{marginBottom:12,borderRadius:12,border:'1px solid rgba(45,212,167,.2)',background:'linear-gradient(135deg,#050D1A,#0B1830)',padding:'12px 14px'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#2DD4A7',marginBottom:6}}>🎯 Treino · {cd.data}</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {cd.distancia&&<span style={{fontSize:11,padding:'3px 8px',background:'rgba(45,212,167,.1)',borderRadius:6,color:'#2DD4A7'}}>📏 {cd.distancia}km</span>}
                  {cd.local&&<span style={{fontSize:11,padding:'3px 8px',background:'rgba(255,255,255,.05)',borderRadius:6,color:'#cbd5e1'}}>📍 {cd.local}</span>}
                  {cd.pombos&&<span style={{fontSize:11,padding:'3px 8px',background:'rgba(76,141,255,.1)',borderRadius:6,color:'#4C8DFF'}}>🐦 {cd.pombos} pombos</span>}
                </div>
              </div>
            )
            if(cd.tipo==='reproducao') return (
              <div style={{marginBottom:12,borderRadius:12,border:'1px solid rgba(192,132,252,.2)',background:'linear-gradient(135deg,#050D1A,#0B1830)',padding:'12px 14px'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#c084fc',marginBottom:8}}>🥚 Reprodução</div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{fontSize:11,color:'#7A8699'}}>♂ MACHO</div>
                    <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{cd.macho}</div>
                  </div>
                  <div style={{fontSize:18}}>💕</div>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{fontSize:11,color:'#7A8699'}}>♀ FÊMEA</div>
                    <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{cd.femea}</div>
                  </div>
                </div>
                {cd.ovos&&<div style={{marginTop:8,fontSize:11,color:'#c084fc',textAlign:'center'}}>🥚 {cd.ovos} ovos · {cd.eclosoes||0} eclosões · {cd.desmamados||0} desmamados</div>}
              </div>
            )
            if(cd.tipo==='conquista') return (
              <div style={{marginBottom:12,borderRadius:12,border:'1px solid rgba(212,175,55,.3)',background:'linear-gradient(135deg,#050D1A,#0B1830)',padding:'14px',textAlign:'center'}}>
                <div style={{fontSize:40,marginBottom:6}}>{cd.icone}</div>
                <div style={{fontSize:15,fontWeight:900,color:'#D4AF37',marginBottom:2}}>{cd.nome}</div>
                <div style={{fontSize:11,color:'#7A8699'}}>{cd.desc}</div>
              </div>
            )
            return null
          })()}
          {post.foto_url&&(
            <div style={{marginBottom:12,borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,.08)'}}>
              <img src={post.foto_url} alt=""
                onClick={()=>window.open(post.foto_url,'_blank')}
                style={{width:'100%',maxHeight:280,objectFit:'cover',display:'block',cursor:'pointer'}}/>
            </div>
          )}
          {post.sondagem_pergunta&&post.sondagem_opcoes&&(
            <div style={{marginBottom:12,padding:'10px 12px',background:'rgba(76,141,255,.06)',border:'1px solid rgba(76,141,255,.2)',borderRadius:10}}>
              <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:8}}>📊 {post.sondagem_pergunta}</div>
              {(()=>{
                const total=Object.values(votosLocais).reduce((s,v)=>s+v,0)
                return post.sondagem_opcoes.map(op=>{
                  const n=votosLocais[op]||0
                  const pct=total>0?Math.round(n/total*100):0
                  const voted=minhaOpcao===op
                  return (
                    <button key={op} onClick={()=>votar(op)} disabled={!!minhaOpcao||votando}
                      style={{display:'block',width:'100%',marginBottom:6,background:'none',border:`1px solid ${voted?'#4C8DFF':'#1B2D52'}`,borderRadius:8,padding:'6px 10px',cursor:minhaOpcao?'default':'pointer',textAlign:'left',fontFamily:'inherit',position:'relative',overflow:'hidden'}}>
                      {minhaOpcao&&<div style={{position:'absolute',left:0,top:0,bottom:0,width:`${pct}%`,background:'rgba(76,141,255,.18)',transition:'width .4s'}}/>}
                      <div style={{position:'relative',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:12,color:voted?'#4C8DFF':'#cbd5e1',fontWeight:voted?700:400}}>{voted?'✓ ':''}{op}</span>
                        {minhaOpcao&&<span style={{fontSize:11,color:'#4C8DFF',fontWeight:600}}>{pct}%</span>}
                      </div>
                    </button>
                  )
                })
              })()}
              {minhaOpcao&&<div style={{fontSize:10,color:'#475569',marginTop:4,textAlign:'right'}}>{Object.values(votosLocais).reduce((s,v)=>s+v,0)} voto(s)</div>}
            </div>
          )}
          {post.video_url&&extrairYoutubeId(post.video_url)&&(
            <div style={{marginBottom:12,borderRadius:10,overflow:'hidden',background:'#000'}}>
              <iframe
                src={`https://www.youtube.com/embed/${extrairYoutubeId(post.video_url)}`}
                style={{width:'100%',height:180,border:'none',display:'block'}}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {editando?(
            <div style={{marginBottom:12}}>
              <textarea value={editTxt} onChange={e=>setEditTxt(e.target.value)}
                style={{width:'100%',minHeight:80,background:'#101F40',border:'1px solid #1E5FD9',borderRadius:8,padding:'8px 10px',color:'#fff',fontSize:13,lineHeight:1.6,resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
              <div style={{display:'flex',gap:6,marginTop:6}}>
                <button className="btn btn-primary btn-sm" onClick={guardarEdicao} disabled={savingEdit}>{savingEdit?<Spinner/>:'✓ Guardar'}</button>
                <button className="btn btn-secondary btn-sm" onClick={()=>{setEditando(false);setEditTxt(post.conteudo||'')}}>Cancelar</button>
              </div>
            </div>
          ):(
            <div style={{fontSize:13,color:'#cbd5e1',lineHeight:1.7,marginBottom:12}}>{formatConteudo(post.conteudo)}</div>
          )}
          <div style={{display:'flex',gap:4,alignItems:'center',borderTop:'1px solid rgba(255,255,255,.05)',paddingTop:10,position:'relative'}}>
            <div style={{position:'relative'}}>
              <button onClick={()=>setReacaoAberta(reacaoAberta===post.id?null:post.id)}
                style={{display:'flex',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',fontSize:13,color:liked?'#f87171':'#7A8699',padding:'4px 8px',borderRadius:6}}>
                {liked?'❤️':'🤍'} {post.likes_count||0}
              </button>
              {reacaoAberta===post.id&&(
                <div style={{position:'absolute',bottom:'100%',left:0,background:'#0B1830',border:'1px solid #1B2D52',borderRadius:12,padding:'6px 8px',display:'flex',gap:4,zIndex:50,boxShadow:'0 8px 24px rgba(0,0,0,.5)',marginBottom:4}}>
                  {REACOES.map(r=><button key={r} onClick={()=>{like(post);setReacaoAberta(null)}} style={{fontSize:20,background:'none',border:'none',cursor:'pointer',padding:'2px 4px',borderRadius:6}}>{r}</button>)}
                </div>
              )}
            </div>
            <button onClick={()=>abrirComments(post)} style={{display:'flex',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#7A8699',padding:'4px 8px',borderRadius:6}}>💬 {post.comments_count||0}</button>
            <button onClick={()=>{
              const txt=`${post.autor_nome}: ${post.conteudo.slice(0,100)}... — LoftSocial`
              navigator.share?navigator.share({title:'LoftSocial',text:txt}).catch(e=>{if(e.name!=='AbortError')toast('Erro ao partilhar','err')}):navigator.clipboard?.writeText(txt).then(()=>toast('Copiado!','ok'))
            }} style={{display:'flex',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#7A8699',padding:'4px 8px',borderRadius:6}}>🔗</button>
            <button onClick={()=>setModalRepost(post)} style={{display:'flex',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#7A8699',padding:'4px 8px',borderRadius:6}}>🔁</button>
            {souEu&&(
              <div style={{marginLeft:'auto',display:'flex',gap:2}}>
                <button onClick={()=>setEditando(e=>!e)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#475569',padding:'4px 8px',borderRadius:6}}>✏️</button>
                <button onClick={async()=>{await db.deletePost(post.id).catch(()=>{});setPosts(ps=>ps.filter(p=>p.id!==post.id))}} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#475569',padding:'4px 8px',borderRadius:6}}>🗑️</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* HEADER LOFTSOCIAL */}
      <GuiaAuto modulo="comunidade"/>
      <div style={{background:'linear-gradient(135deg,#050D1A,#0B1830)',border:'1px solid rgba(212,175,55,.2)',borderRadius:14,padding:'14px 16px',marginBottom:14,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:20,fontWeight:900,color:'#fff',fontFamily:"'Fraunces',serif",letterSpacing:.5}}>🌐 LoftSocial</div>
            <div style={{fontSize:11,color:'#7A8699',marginTop:1}}>{posts.length} publicações · {explorar.length} columbófilos</div>
          </div>
          <BotaoGuia modulo="comunidade"/>
          <button onClick={()=>setShowCartao(true)} style={{background:'rgba(212,175,55,.12)',border:'1px solid rgba(212,175,55,.3)',borderRadius:10,padding:'7px 10px',cursor:'pointer',fontSize:11,color:'#D4AF37',fontWeight:600}}>💳 Visita</button>
          <button className="btn btn-primary" onClick={()=>setModalPost(true)} style={{fontSize:12,fontWeight:700}}>✏️ Publicar</button>
        </div>
        <div style={{display:'flex',gap:10,marginTop:12}}>
          {[['👥',explorar.filter(p=>following.has(p.user_id)).length,'A seguir'],['❤️',posts.reduce((s,p)=>s+(p.likes_count||0),0),'Likes'],['🔔',nNaoLidas,'Novas notif.']].map(([icon,val,label])=>(
            <div key={label} style={{flex:1,textAlign:'center',padding:'6px 4px',background:'rgba(255,255,255,.04)',borderRadius:8}}>
              <div style={{fontSize:11}}>{icon} <strong style={{color:'#fff'}}>{val}</strong></div>
              <div style={{fontSize:9,color:'#475569'}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pesquisa */}
      <div style={{marginBottom:10}}>
        <input className="input" placeholder="🔍 Pesquisar posts, @utilizadores, #hashtags..." value={pesquisa}
          onChange={e=>{setPesquisa(e.target.value);e.target.value.startsWith('#')?setHashtagFiltro(e.target.value):setHashtagFiltro(null)}}
          style={{fontSize:13,background:'#101F40',border:'1px solid #1B2D52'}}/>
      </div>

      {/* TABS */}
      <div style={{display:'flex',gap:3,background:'#0A1628',borderRadius:10,padding:3,marginBottom:14,overflowX:'auto'}}>
        {[['feed','📰','Feed'],['explorar','🔍','Explorar'],['mapa','🗺️','Mapa'],['grupos','👥','Grupos'],['forum','💬','Fórum'],['desafios','🎯','Desafios'],['notifs','🔔',nNaoLidas?`(${nNaoLidas})`:'Notif.'],['ranking','🏆','Ranking']].map(([k,icon,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:'1',minWidth:56,padding:'10px 6px',borderRadius:10,cursor:'pointer',border:'none',fontFamily:'inherit',background:tab===k?'linear-gradient(135deg,#1E5FD9,#1456C0)':'rgba(255,255,255,.04)',color:tab===k?'#fff':'#cbd5e1',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div>{icon}</div><div style={{fontSize:9}}>{l}</div>
          </button>
        ))}
      </div>

      {loading?<div style={{display:'flex',justifyContent:'center',padding:60}}><Spinner lg/></div>:(
        <>
          {/* ── FEED ─────────────────────────────────────────────────────── */}
          {tab==='feed'&&(
            <div>
              {/* Banner contextual LoftSocial */}
              {mensagensCtx.length>0&&<BannerContextual mensagens={mensagensCtx} nav={nav}/>}

              {/* Stories */}
              {(provas.length>0||pombos.length>0)&&(
                <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:8,marginBottom:14}}>
                  <div onClick={()=>setModalPost(true)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}}>
                    <div style={{width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#1E5FD9,#D4AF37)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,border:'2px solid #D4AF37'}}>
                      {perfil?.foto_perfil_url?<img src={perfil.foto_perfil_url} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>:'✏️'}
                    </div>
                    <span style={{fontSize:9,color:'#7A8699',whiteSpace:'nowrap'}}>Publicar</span>
                  </div>
                  {pombos.filter(p=>p.foto_url&&p.estado==='ativo').slice(0,6).map(p=>(
                    <div key={p.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}} onClick={()=>nav?.('pombos')}>
                      <div style={{width:52,height:52,borderRadius:'50%',overflow:'hidden',border:'2px solid #2DD4A7'}}>
                        <img src={p.foto_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      </div>
                      <span style={{fontSize:9,color:'#94a3b8',maxWidth:54,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</span>
                    </div>
                  ))}
                  {provas.slice(0,3).map(p=>(
                    <div key={p.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}} onClick={()=>nav?.('provas')}>
                      <div style={{width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#D4AF37,#B8960C)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,border:'2px solid #D4AF37'}}>🏆</div>
                      <span style={{fontSize:9,color:'#94a3b8',maxWidth:54,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Trending hashtags */}
              {(()=>{
                const freq={}
                posts.forEach(p=>{(p.conteudo||'').match(/#\w+/g)?.forEach(h=>{freq[h]=(freq[h]||0)+1})})
                const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,6)
                if(!top.length) return null
                return (
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,color:'#475569',fontWeight:600,marginBottom:6,letterSpacing:'.05em'}}>🔥 TRENDING</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {top.map(([h,c])=>(
                        <button key={h} onClick={()=>setHashtagFiltro(hashtagFiltro===h?null:h)}
                          style={{fontSize:11,padding:'4px 10px',borderRadius:20,border:'none',cursor:'pointer',fontWeight:600,
                            background:hashtagFiltro===h?'#1E5FD9':'rgba(76,141,255,.12)',
                            color:hashtagFiltro===h?'#fff':'#4C8DFF',transition:'all .15s'}}>
                          {h} <span style={{fontSize:9,opacity:.7}}>{c}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {hashtagFiltro&&(
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'6px 12px',background:'rgba(76,141,255,.1)',borderRadius:8,border:'1px solid rgba(76,141,255,.2)'}}>
                  <span style={{fontSize:13,color:'#4C8DFF',fontWeight:600}}>{hashtagFiltro}</span>
                  <button onClick={()=>setHashtagFiltro(null)} style={{background:'none',border:'none',color:'#7A8699',cursor:'pointer',fontSize:12,marginLeft:'auto'}}>✕ Limpar filtro</button>
                </div>
              )}

              {posts.length===0
                ?<EmptyState icon="📰" title="Feed vazio" desc="Publica o primeiro post ou segue outros columbófilos" action={<button className="btn btn-primary" onClick={()=>setModalPost(true)}>✏️ Publicar</button>}/>
                :<>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {posts.filter(p=>!hashtagFiltro||p.conteudo?.includes(hashtagFiltro)).map(p=><PostCard key={p.id} post={p}/>)}
                  </div>
                  {hasMore&&<button className="btn btn-secondary" style={{width:'100%',marginTop:12}} onClick={carregarMais} disabled={loadingMore}>{loadingMore?<Spinner/>:'Carregar mais'}</button>}
                </>
              }
            </div>
          )}

          {/* ── EXPLORAR ─────────────────────────────────────────────────── */}
          {tab==='explorar'&&(
            <div>
              <div style={{fontSize:12,color:'#94a3b8',marginBottom:12}}>Columbófilos da comunidade LoftSocial · Segue para ver os seus posts no teu feed.</div>
              {explorar.length===0
                ?<EmptyState icon="🔍" title="Sem perfis públicos" desc="Activa o teu perfil público em Perfil para aparecer aqui"/>
                :<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {explorar.map(p=>{
                      const isFollowing=following.has(p.user_id),souEu=p.user_id===user?.id
                      return (
                        <div key={p.id} className="card card-p" style={{position:'relative',overflow:'hidden'}}>
                          <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#1E5FD9,#D4AF37)'}}/>
                          <div style={{display:'flex',gap:10,alignItems:'flex-start',marginTop:6}}>
                            <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'#fff',flexShrink:0,overflow:'hidden',border:'2px solid #1B2D52'}}>
                              {p.foto_perfil_url?<img src={p.foto_perfil_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:p.nome?.[0]?.toUpperCase()||'?'}
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</div>
                              <div style={{fontSize:10,color:'#7A8699'}}>{p.org||'Columbófilo'}</div>
                              {p.pombal_morada&&<div style={{fontSize:10,color:'#4C8DFF'}}>📍 {p.pombal_morada}</div>}
                              {p.bio&&<div style={{fontSize:10,color:'#94a3b8',marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.bio}</div>}
                            </div>
                          </div>
                          <div style={{display:'flex',gap:6,marginTop:10}}>
                            {!souEu&&<button className={`btn btn-sm ${isFollowing?'btn-secondary':'btn-primary'}`} style={{flex:1,fontSize:11}} onClick={()=>seguir(p.user_id)}>{isFollowing?'✓ A seguir':'+ Seguir'}</button>}
                            {p.slug&&<button className="btn btn-secondary btn-sm" style={{flex:1,fontSize:11}} onClick={()=>nav?.('perfil-publico',{slug:p.slug})}>Ver perfil</button>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
              }
            </div>
          )}

          {/* ── MAPA ─────────────────────────────────────────────────────── */}
          {tab==='mapa'&&(()=>{
            const comGPS=explorar.filter(p=>p.pombal_lat&&p.pombal_lon)
            const todos=perfil?.pombal_lat?[{...perfil,_eu:true},...comGPS.filter(p=>p.user_id!==user?.id)]:comGPS
            const MapaLeaflet=({ pontos })=>{
              const divRef = { current: null }
              useEffect(()=>{
                if(!divRef.current||!pontos.length) return
                const loadLeaflet=async()=>{
                  if(!window.L){
                    await Promise.all([
                      new Promise(res=>{const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.onload=res;document.head.appendChild(l)}),
                      new Promise(res=>{const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=res;document.head.appendChild(s)})
                    ])
                  }
                  const L=window.L
                  if(divRef.current._leaflet_id) return
                  const centro=pontos[0]?[pontos[0].pombal_lat,pontos[0].pombal_lon]:[39.5,-8]
                  const map=L.map(divRef.current,{zoomControl:true}).setView(centro,7)
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:18}).addTo(map)
                  pontos.forEach(p=>{
                    const eu=!!p._eu
                    const icon=L.divIcon({className:'',html:`<div style="background:${eu?'#D4AF37':'#4C8DFF'};border:3px solid #fff;border-radius:50%;width:${eu?18:13}px;height:${eu?18:13}px;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>`,iconSize:[eu?18:13,eu?18:13],iconAnchor:[eu?9:6.5,eu?9:6.5]})
                    L.marker([p.pombal_lat,p.pombal_lon],{icon}).addTo(map).bindPopup(`<div style="font-family:sans-serif;min-width:150px;padding:4px"><strong>${p.nome||'Columbófilo'}</strong>${p.pombal_nome?`<br>🏠 ${p.pombal_nome}`:''}${p.org?`<br><small>${p.org}</small>`:''}${eu?'<br><span style="color:#B8960C;font-size:11px">✦ O teu pombal</span>':''}</div>`)
                  })
                  if(pontos.length>1){const bounds=L.latLngBounds(pontos.map(p=>[p.pombal_lat,p.pombal_lon]));map.fitBounds(bounds,{padding:[40,40]})}
                }
                loadLeaflet(); return()=>{}
              },[])
              return <div ref={r=>{divRef.current=r}} style={{width:'100%',height:360,borderRadius:12,overflow:'hidden'}}/>
            }
            return (
              <div>
                <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:10}}>
                  <div style={{fontSize:12,color:'#94a3b8'}}>
                    <span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#D4AF37',marginRight:4}}/>Teu pombal
                    <span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#4C8DFF',marginLeft:10,marginRight:4}}/>Comunidade
                    <span style={{color:'#fff',marginLeft:6}}>· {todos.length} pombais</span>
                  </div>
                </div>
                {todos.length===0
                  ?<EmptyState icon="🗺️" title="Sem pombais no mapa" desc="Activa o perfil público e define coordenadas GPS em Perfil"/>
                  :<MapaLeaflet pontos={todos}/>
                }
                {!perfil?.pombal_lat&&(
                  <div style={{marginTop:10,padding:'10px 14px',background:'rgba(212,175,55,.08)',border:'1px solid rgba(212,175,55,.2)',borderRadius:8,fontSize:12,color:'#D4AF37'}}>
                    ⚠️ O teu pombal não aparece — define as coordenadas GPS em Perfil
                    <button className="btn btn-secondary btn-sm" style={{marginLeft:10}} onClick={()=>nav?.('perfil')}>Ir ao Perfil</button>
                  </div>
                )}
                {comGPS.filter(p=>p.user_id!==user?.id).length>0&&(
                  <div style={{marginTop:14}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#fff',marginBottom:8}}>Pombais registados</div>
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {comGPS.filter(p=>p.user_id!==user?.id).map(p=>(
                        <div key={p.id} className="card card-p" style={{display:'flex',gap:10,alignItems:'center'}}>
                          <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff',overflow:'hidden',flexShrink:0}}>
                            {p.foto_perfil_url?<img src={p.foto_perfil_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:p.nome?.[0]?.toUpperCase()||'?'}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{p.nome}</div>
                            <div style={{fontSize:11,color:'#7A8699'}}>🏠 {p.pombal_nome||'Pombal'}{p.pombal_morada?` · ${p.pombal_morada}`:''}</div>
                          </div>
                          <button className={`btn btn-sm ${following.has(p.user_id)?'btn-secondary':'btn-primary'}`} onClick={()=>seguir(p.user_id)}>{following.has(p.user_id)?'✓':'+ Seguir'}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── GRUPOS ───────────────────────────────────────────────────── */}
          {tab==='grupos'&&(
            <div>
              <div style={{fontSize:12,color:'#94a3b8',marginBottom:12}}>Grupos por especialidade e região. Junta-te para interagir com columbófilos da mesma área.</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {grupos.map(g=>{
                  const junto=gruposJunto.has(g.id)
                  return (
                    <div key={g.id} className="card card-p" style={{borderLeft:`3px solid ${junto?'#2DD4A7':'#1B2D52'}`}}>
                      <div style={{display:'flex',gap:12,alignItems:'center'}}>
                        <div style={{width:44,height:44,borderRadius:10,background:junto?'rgba(45,212,167,.15)':'#101F40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{g.icon}</div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:14,fontWeight:700,color:'#fff'}}>{g.nome}</span>
                            {junto&&<span style={{fontSize:9,color:'#2DD4A7',background:'rgba(45,212,167,.1)',padding:'1px 6px',borderRadius:8}}>Membro</span>}
                          </div>
                          <div style={{fontSize:11,color:'#7A8699'}}>{g.desc}</div>
                          <div style={{fontSize:10,color:'#475569',marginTop:2}}>👥 {g.membros+(junto?1:0)} membros</div>
                        </div>
                        <button onClick={()=>setGruposJunto(s=>{const n=new Set(s);junto?n.delete(g.id):n.add(g.id);return n})} className={`btn btn-sm ${junto?'btn-secondary':'btn-primary'}`}>{junto?'✓ Junto':'+ Juntar'}</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{marginTop:14,padding:'10px 14px',background:'rgba(76,141,255,.06)',border:'1px solid rgba(76,141,255,.15)',borderRadius:8,fontSize:12,color:'#7A8699',textAlign:'center'}}>
                🚀 Grupos com publicações próprias e mapa de membros — em breve
              </div>
            </div>
          )}

          {/* ── FÓRUM ────────────────────────────────────────────────────── */}
          {tab==='forum'&&<ForumTab nome={nome} nav={nav}/>}

          {/* ── DESAFIOS ─────────────────────────────────────────────────── */}
          {tab==='desafios'&&(
            <div>
              <div className="card card-p" style={{marginBottom:12,background:'linear-gradient(135deg,rgba(212,175,55,.1),rgba(212,175,55,.03))',border:'1px solid rgba(212,175,55,.25)'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontSize:36}}>🔥</div>
                  <div>
                    <div style={{fontSize:18,fontWeight:900,color:'#D4AF37',fontFamily:"'Fraunces',serif"}}>
                      {posts.filter(p=>p.user_id===user?.id&&new Date(p.created_at)>new Date(Date.now()-7*86400000)).length} posts esta semana
                    </div>
                    <div style={{fontSize:12,color:'#94a3b8'}}>Publica diariamente para manter o streak!</div>
                  </div>
                </div>
              </div>
              <div style={{fontWeight:600,color:'#fff',marginBottom:10,fontSize:13}}>🎯 Desafios desta semana</div>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                {DESAFIOS_SEMANAIS.map(d=>{
                  const prog=d.tipo==='posts'?posts.filter(p=>p.user_id===user?.id&&new Date(p.created_at)>new Date(Date.now()-7*86400000)).length:d.tipo==='resultado'?posts.filter(p=>p.user_id===user?.id&&p.tipo==='Resultado'&&new Date(p.created_at)>new Date(Date.now()-7*86400000)).length:d.tipo==='follows'?following.size:0
                  const pct=Math.min(100,Math.round(prog/d.meta*100)),ok=prog>=d.meta
                  return (
                    <div key={d.id} className="card card-p" style={{borderLeft:`3px solid ${ok?'#2DD4A7':'#1B2D52'}`}}>
                      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:8}}>
                        <span style={{fontSize:20}}>{d.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:600,color:ok?'#2DD4A7':'#fff'}}>{d.nome} {ok&&'✅'}</div>
                          <div style={{fontSize:11,color:'#7A8699'}}>{d.desc}</div>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:ok?'#2DD4A7':'#D4AF37'}}>{prog}/{d.meta}</div>
                      </div>
                      <div style={{height:4,background:'#101F40',borderRadius:2}}>
                        <div style={{height:'100%',width:`${pct}%`,background:ok?'#2DD4A7':'#1E5FD9',borderRadius:2,transition:'width .5s'}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{fontWeight:600,color:'#fff',marginBottom:10,fontSize:13}}>🏅 Badges conquistados</div>
              {(()=>{
                const efect=pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio')
                const pAno=provas.filter(p=>new Date(p.data_reg).getFullYear()===new Date().getFullYear())
                const d={vitorias:pAno.filter(p=>p.lugar===1).length,top3:pAno.filter(p=>p.lugar<=3).length,provas:pAno.length,borrachinhos:0,pombosComPedigree:efect.filter(p=>p.pai&&p.mae).length}
                const ok=BADGES_DEF.filter(b=>b.cond(d))
                const nok=BADGES_DEF.filter(b=>!b.cond(d))
                return <>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
                    {ok.map(b=>(
                      <div key={b.id} style={{background:'rgba(212,175,55,.1)',border:'1px solid rgba(212,175,55,.3)',borderRadius:10,padding:'8px 12px',textAlign:'center'}}>
                        <div style={{fontSize:24}}>{b.icon}</div>
                        <div style={{fontSize:11,fontWeight:600,color:'#D4AF37'}}>{b.nome}</div>
                        <div style={{fontSize:9,color:'#7A8699'}}>{b.desc}</div>
                      </div>
                    ))}
                    {ok.length===0&&<div style={{fontSize:12,color:'#7A8699'}}>Ainda sem badges. Participa em provas para ganhar!</div>}
                  </div>
                  {nok.length>0&&<>
                    <div style={{fontSize:11,color:'#475569',marginBottom:6}}>Por conquistar:</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {nok.map(b=><div key={b.id} style={{background:'#101F40',border:'1px solid #1B2D52',borderRadius:8,padding:'6px 10px',textAlign:'center',opacity:.4}}><div style={{fontSize:16}}>{b.icon}</div><div style={{fontSize:9,color:'#7A8699'}}>{b.nome}</div></div>)}
                    </div>
                  </>}
                </>
              })()}
            </div>
          )}

          {/* ── NOTIFICAÇÕES ─────────────────────────────────────────────── */}
          {tab==='notifs'&&(
            <div>
              {notifs.length>0&&<div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}><button className="btn btn-secondary btn-sm" onClick={marcarLidas}>Marcar todas como lidas</button></div>}
              {notifs.length===0?<EmptyState icon="🔔" title="Sem notificações" desc="Likes, comentários e seguidores aparecem aqui"/>
                :<div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {notifs.map(n=>(
                      <div key={n.id} onClick={()=>db.marcarNotifLida(n.id).then(()=>setNotifs(ns=>ns.map(x=>x.id===n.id?{...x,lida:true}:x)))}
                        className="card card-p" style={{cursor:'pointer',opacity:n.lida?.8:1,borderColor:n.lida?undefined:'rgba(76,141,255,.3)',background:n.lida?undefined:'rgba(76,141,255,.04)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <span style={{fontSize:20}}>{n.tipo==='like'?'❤️':n.tipo==='comment'?'💬':n.tipo==='follow'?'👤':'🔔'}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,color:'#fff'}}>{n.conteudo}</div>
                            <div style={{fontSize:11,color:'#7A8699'}}><TempoAtras ts={n.created_at}/></div>
                          </div>
                          {!n.lida&&<div style={{width:8,height:8,borderRadius:'50%',background:'#4C8DFF'}}/>}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}

          {/* ── RANKING ──────────────────────────────────────────────────── */}
          {tab==='ranking'&&(
            <div>
              <div style={{display:'flex',gap:4,marginBottom:12,overflowX:'auto'}}>
                {[['geral','🏆 Geral'],...ESPECIALIDADES_RANKING.map(e=>[e,e])].map(([k,l])=>(
                  <button key={k} onClick={()=>setTabRanking(k)} style={{ flex:'none', padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:tabRanking===k?700:500, cursor:'pointer', fontFamily:'inherit', border:tabRanking===k?'none':'1px solid rgba(255,255,255,.08)', background:tabRanking===k?'linear-gradient(135deg,#1E5FD9,#1456C0)':'rgba(255,255,255,.05)', color:tabRanking===k?'#fff':'#cbd5e1', minHeight:40, transition:'all .15s' }}>{l}</button>
                ))}
              </div>
              <div style={{fontSize:11,color:'#7A8699',marginBottom:12}}>50pts/badge · 30pts/desafio · 10pts/publicação · 2pts/like</div>
              {ranking.length===0?<EmptyState icon="🏆" title="Ranking vazio" desc="Publica resultados e conquista badges para entrar no ranking"/>
                :<>
                  {ranking.length>=3&&tabRanking==='geral'&&(
                    <div style={{display:'flex',justifyContent:'center',alignItems:'flex-end',gap:8,marginBottom:16,padding:'16px 8px 0'}}>
                      {[ranking[1],ranking[0],ranking[2]].map((r,i)=>{
                        const pos=i===1?1:i===0?2:3,alt=i===1?72:i===0?56:44
                        const cor=pos===1?'#D4AF37':pos===2?'#cbd5e1':'#b45309'
                        const med=pos===1?'🥇':pos===2?'🥈':'🥉'
                        return r?(
                          <div key={r.id||pos} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                            <div style={{fontSize:10,color:'#fff',fontWeight:600,maxWidth:70,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.nome?.split(' ')[0]}</div>
                            <div style={{fontSize:20}}>{med}</div>
                            <div style={{width:60,height:alt,background:`${cor}22`,border:`2px solid ${cor}`,borderRadius:'8px 8px 0 0',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <div style={{fontSize:12,fontWeight:700,color:cor}}>{r.pontos}</div>
                            </div>
                          </div>
                        ):null
                      })}
                    </div>
                  )}
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {ranking.map((r,i)=>{
                      const souEu=r.nome===nome,med=i===0?'🥇':i===1?'🥈':i===2?'🥉':null
                      return (
                        <div key={r.id||i} className="card card-p" style={souEu?{borderColor:'rgba(76,141,255,.4)',background:'rgba(76,141,255,.06)'}:undefined}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:28,textAlign:'center'}}>
                              {med?<span style={{fontSize:18}}>{med}</span>:<span style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:'#475569'}}>{i+1}</span>}
                            </div>
                            <div style={{flex:1,fontSize:13,color:'#fff',fontWeight:souEu?700:400}}>{r.nome}{souEu?' (você)':''}</div>
                            <div style={{fontSize:15,fontWeight:700,color:'#D4AF37'}}>{r.pontos} <span style={{fontSize:10,color:'#7A8699',fontWeight:400}}>pts</span></div>
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

      {/* ── Modal cartão de visita ────────────────────────────────────────── */}
      <Modal open={showCartao} onClose={()=>setShowCartao(false)} title="💳 Cartão de Visita Digital">
        <div style={{background:'linear-gradient(135deg,#050D1A,#0B1830)',border:'1px solid #D4AF37',borderRadius:16,overflow:'hidden'}}>
          <div style={{background:'linear-gradient(90deg,#B8960C,#D4AF37)',height:4}}/>
          <div style={{padding:'20px'}}>
            <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:14}}>
              <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:700,color:'#fff',overflow:'hidden',border:'2px solid #D4AF37',flexShrink:0}}>
                {perfil?.foto_perfil_url?<img src={perfil.foto_perfil_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:nome?.[0]?.toUpperCase()||'?'}
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:900,color:'#D4AF37',fontFamily:"'Fraunces',serif"}}>{nome}</div>
                <div style={{fontSize:12,color:'#94a3b8'}}>{perfil?.org||'Columbófilo'} · LoftSocial</div>
                {perfil?.pombal_nome&&<div style={{fontSize:11,color:'#4C8DFF'}}>🏠 {perfil.pombal_nome}</div>}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(3,1fr)',gap:8,marginBottom:12}}>
              {[['🐦',pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio').length,'Pombos'],['🏆',provas.length,'Provas'],['📊',Math.round(pombos.filter(p=>p.percentil>0).reduce((s,p)=>s+(p.percentil||0),0)/Math.max(1,pombos.filter(p=>p.percentil>0).length))+'%','Percentil']].map(([icon,val,label])=>(
                <div key={label} style={{background:'rgba(255,255,255,.05)',borderRadius:8,padding:'8px 4px',textAlign:'center'}}>
                  <div style={{fontSize:14}}>{icon}</div>
                  <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>{val}</div>
                  <div style={{fontSize:9,color:'#7A8699'}}>{label}</div>
                </div>
              ))}
            </div>
            {perfil?.bio&&<div style={{fontSize:11,color:'#94a3b8',marginTop:8,fontStyle:'italic'}}>"{perfil.bio}"</div>}
            {perfil?.slug&&<div style={{fontSize:10,color:'#475569',textAlign:'right',marginTop:8}}>championsloft.app/p/{perfil.slug}</div>}
          </div>
        </div>
        <button className="btn btn-secondary" style={{width:'100%',marginTop:12}} onClick={()=>{
          const txt=`${nome} — LoftSocial / Fly2Win\n🐦 ${pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio').length} pombos · 🏆 ${provas.length} provas\nchampionsloft.app/p/${perfil?.slug||''}`
          navigator.share?navigator.share({title:'LoftSocial',text:txt}).catch(e=>{if(e.name!=='AbortError')toast('Erro ao partilhar','err')}):navigator.clipboard?.writeText(txt).then(()=>toast('Copiado!','ok'))
        }}>🔗 Partilhar cartão</button>
      </Modal>

      {/* ── Modal publicar ────────────────────────────────────────────────── */}
      <Modal open={modalPost} onClose={()=>{setModalPost(false);setFormPost({tipo:'Geral',conteudo:'',hashtags:'',video_url:'',card_data:null,sondagem:false,sondagem_pergunta:'',sondagem_opcoes:['','']})}} title="✏️ Nova Publicação — LoftSocial"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalPost(false)}>Cancelar</button><button className="btn btn-primary" onClick={publicar} disabled={savingPost}>{savingPost?<Spinner/>:null}Publicar</button></>}>
        <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
          {TIPOS_POST.map(tipo=>(
            <button key={tipo} onClick={()=>setFormPost(f=>({...f,tipo,card_data:null,conteudo:'',hashtags:''}))}
              style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',border:`1px solid ${formPost.tipo===tipo?tipoCor[tipo]:'#1B2D52'}`,fontFamily:'inherit',background:formPost.tipo===tipo?`${tipoCor[tipo]}22`:'none',color:formPost.tipo===tipo?tipoCor[tipo]:'#94a3b8'}}>
              {tipoIcon[tipo]} {tipo}
            </button>
          ))}
        </div>

        {formPost.tipo==='Resultado'&&provas.length>0&&(
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:'#7A8699',marginBottom:6}}>🏆 Escolhe a prova:</div>
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>
              {provas.slice(0,10).map(p=>{
                const pombo=pombos.find(b=>b.id===p.pombo_id)
                const medalha=p.lugar===1?'🥇':p.lugar===2?'🥈':p.lugar===3?'🥉':'🏅'
                const sel=formPost.card_data?.prova_id===p.id
                return (
                  <button key={p.id} onClick={()=>{
                    const cd={tipo:'prova',prova_id:p.id,lugar:p.lugar,total:p.total_pombos,distancia:p.distancia,velocidade:p.velocidade,percentil:p.percentil,local_largada:p.local_largada,data:p.data_reg?new Date(p.data_reg).toLocaleDateString('pt-PT'):'',pombo_nome:pombo?.nome,pombo_anilha:pombo?.anilha}
                    const txt=`${medalha} ${p.lugar}º lugar${p.total_pombos?' de '+p.total_pombos:''}\n📏 ${p.distancia||0}km${p.velocidade?' · ⚡ '+p.velocidade+'m/min':''}${p.percentil?' · 📊 '+p.percentil+'%':''}\n${p.local_largada?'📍 '+p.local_largada+'\n':''}${pombo?'🕊️ '+pombo.nome+' ('+pombo.anilha+')':''}`
                    setFormPost(f=>({...f,card_data:cd,conteudo:txt,hashtags:'#columbofilia #prova'+(p.distancia>500?' #fundo':p.distancia>300?' #meiofundo':' #velocidade')}))
                  }}
                    style={{flexShrink:0,padding:'6px 12px',background:sel?'rgba(212,175,55,.15)':'rgba(212,175,55,.06)',border:`1px solid ${sel?'rgba(212,175,55,.5)':'rgba(212,175,55,.2)'}`,borderRadius:8,fontSize:11,color:'#D4AF37',cursor:'pointer',textAlign:'left'}}>
                    <div style={{fontWeight:700}}>{medalha} {p.lugar}º · {p.distancia}km</div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{pombo?.nome||'?'} · {p.data_reg?new Date(p.data_reg).toLocaleDateString('pt-PT'):''}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {formPost.tipo==='Treino'&&treinos.length>0&&(
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:'#7A8699',marginBottom:6}}>🎯 Escolhe o treino:</div>
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>
              {treinos.slice(0,8).map(t=>{
                const sel=formPost.card_data?.treino_id===t.id
                return (
                  <button key={t.id} onClick={()=>{
                    const cd={tipo:'treino',treino_id:t.id,distancia:t.distancia,local:t.local_largada||t.local,pombos:t.num_pombos,data:t.data?new Date(t.data).toLocaleDateString('pt-PT'):''}
                    const txt=`🎯 Treino${t.distancia?' · '+t.distancia+'km':''}${t.local_largada?' · '+t.local_largada:''}\n${t.data?'📅 '+new Date(t.data).toLocaleDateString('pt-PT'):''}`
                    setFormPost(f=>({...f,card_data:cd,conteudo:txt,hashtags:'#treino #columbofilia'}))
                  }}
                    style={{flexShrink:0,padding:'6px 12px',background:sel?'rgba(45,212,167,.15)':'rgba(45,212,167,.06)',border:`1px solid ${sel?'rgba(45,212,167,.5)':'rgba(45,212,167,.2)'}`,borderRadius:8,fontSize:11,color:'#2DD4A7',cursor:'pointer',textAlign:'left'}}>
                    <div style={{fontWeight:700}}>📏 {t.distancia||'?'}km</div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{t.data?new Date(t.data).toLocaleDateString('pt-PT'):''}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {formPost.tipo==='Reprodução'&&acasalamentos.length>0&&(
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:'#7A8699',marginBottom:6}}>🥚 Escolhe o casal:</div>
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>
              {acasalamentos.slice(0,6).map(a=>{
                const macho=pombos.find(p=>p.id===a.macho_id)
                const femea=pombos.find(p=>p.id===a.femea_id)
                const sel=formPost.card_data?.acast_id===a.id
                return (
                  <button key={a.id} onClick={()=>{
                    const cd={tipo:'reproducao',acast_id:a.id,macho:macho?.nome||'?',femea:femea?.nome||'?',ovos:a.ovos,eclosoes:a.eclosoes,desmamados:a.desmamados}
                    const txt=`🥚 Reprodução\n♂ ${macho?.nome||'?'} × ♀ ${femea?.nome||'?'}${a.ovos?'\n🥚 '+a.ovos+' ovos':''}`
                    setFormPost(f=>({...f,card_data:cd,conteudo:txt,hashtags:'#reproducao #borrachinhos #columbofilia'}))
                  }}
                    style={{flexShrink:0,padding:'6px 12px',background:sel?'rgba(192,132,252,.15)':'rgba(192,132,252,.06)',border:`1px solid ${sel?'rgba(192,132,252,.5)':'rgba(192,132,252,.2)'}`,borderRadius:8,fontSize:11,color:'#c084fc',cursor:'pointer',textAlign:'left'}}>
                    <div style={{fontWeight:700}}>{macho?.nome||'?'} × {femea?.nome||'?'}</div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{a.ovos||0} ovos · {a.desmamados||0} desmamados</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {formPost.tipo==='Pedigree'&&pombos.filter(p=>p.pai||p.mae).length>0&&(
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:'#7A8699',marginBottom:6}}>🌳 Escolhe o pombo:</div>
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>
              {pombos.filter(p=>p.pai||p.mae).slice(0,8).map(p=>{
                const pai=pombos.find(b=>b.id===p.pai)
                const mae=pombos.find(b=>b.id===p.mae)
                const sel=formPost.card_data?.pombo_id===p.id
                return (
                  <button key={p.id} onClick={()=>{
                    const cd={tipo:'pombo',pombo_id:p.id,nome:p.nome,anilha:p.anilha,sexo:p.sexo,cor:p.cor,percentil:p.percentil,forma:p.forma,provas:p.provas,esp:p.esp,foto_url:p.foto_url}
                    const txt=`🌳 Pedigree — ${p.nome} (${p.anilha})${pai?'\n👨 Pai: '+pai.nome+' ('+pai.anilha+')':''}${mae?'\n👩 Mãe: '+mae.nome+' ('+mae.anilha+')':''}`
                    setFormPost(f=>({...f,card_data:cd,foto_url:p.foto_url||'',conteudo:txt,hashtags:'#pedigree #columbofilia'}))
                  }}
                    style={{flexShrink:0,padding:'6px 12px',background:sel?'rgba(52,211,153,.15)':'rgba(52,211,153,.06)',border:`1px solid ${sel?'rgba(52,211,153,.5)':'rgba(52,211,153,.2)'}`,borderRadius:8,fontSize:11,color:'#34d399',cursor:'pointer',textAlign:'left'}}>
                    <div style={{fontWeight:700}}>{p.nome}</div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{p.anilha}{pai?' · Pai: '+pai.nome:''}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {formPost.card_data&&(
          <div style={{marginBottom:10,padding:'8px 10px',background:'rgba(45,212,167,.06)',border:'1px solid rgba(45,212,167,.2)',borderRadius:8,fontSize:11,color:'#2DD4A7',display:'flex',alignItems:'center',gap:8}}>
            ✓ Card seleccionado — será publicado com o post
            <button onClick={()=>setFormPost(f=>({...f,card_data:null}))} style={{marginLeft:'auto',background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:12}}>✕ Remover</button>
          </div>
        )}

        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff',flexShrink:0,overflow:'hidden'}}>
            {perfil?.foto_perfil_url?<img src={perfil.foto_perfil_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:nome?.[0]?.toUpperCase()||'?'}
          </div>
          <textarea className="input" rows={4} style={{resize:'none',flex:1}}
            placeholder={`Acrescenta um comentário... (${500-formPost.conteudo.length} restantes)`}
            value={formPost.conteudo} onChange={e=>setFormPost(f=>({...f,conteudo:e.target.value.slice(0,500)}))}/>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
          <span style={{fontSize:12,color:'#7A8699',flexShrink:0}}>🏷️ Tags:</span>
          <input className="input" placeholder="#columbofilia #velocidade #fundo" value={formPost.hashtags} onChange={e=>setFormPost(f=>({...f,hashtags:e.target.value}))} style={{fontSize:12}}/>
        </div>
        <div style={{marginBottom:10}}>
          <button onClick={()=>setFormPost(f=>({...f,sondagem:!f.sondagem}))}
            style={{display:'flex',alignItems:'center',gap:8,background:formPost.sondagem?'rgba(76,141,255,.12)':'rgba(255,255,255,.04)',border:`1px solid ${formPost.sondagem?'rgba(76,141,255,.4)':'#1B2D52'}`,borderRadius:8,padding:'7px 12px',cursor:'pointer',width:'100%',fontFamily:'inherit'}}>
            <span style={{fontSize:14}}>📊</span>
            <span style={{fontSize:12,color:formPost.sondagem?'#4C8DFF':'#94a3b8',fontWeight:600}}>Adicionar sondagem</span>
            <span style={{marginLeft:'auto',fontSize:11,color:formPost.sondagem?'#4C8DFF':'#475569'}}>{formPost.sondagem?'✓ Activa':'Opcional'}</span>
          </button>
          {formPost.sondagem&&(
            <div style={{marginTop:8,padding:'10px 12px',background:'rgba(76,141,255,.06)',border:'1px solid rgba(76,141,255,.2)',borderRadius:8}}>
              <input className="input" placeholder="Pergunta da sondagem..." value={formPost.sondagem_pergunta}
                onChange={e=>setFormPost(f=>({...f,sondagem_pergunta:e.target.value}))}
                style={{fontSize:12,marginBottom:6}}/>
              {formPost.sondagem_opcoes.map((op,i)=>(
                <div key={i} style={{display:'flex',gap:6,marginBottom:4}}>
                  <input className="input" placeholder={`Opção ${i+1}...`} value={op}
                    onChange={e=>{const arr=[...formPost.sondagem_opcoes];arr[i]=e.target.value;setFormPost(f=>({...f,sondagem_opcoes:arr}))}}
                    style={{fontSize:12,flex:1}}/>
                  {formPost.sondagem_opcoes.length>2&&(
                    <button onClick={()=>setFormPost(f=>({...f,sondagem_opcoes:f.sondagem_opcoes.filter((_,j)=>j!==i)}))}
                      style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:14,padding:'0 6px'}}>✕</button>
                  )}
                </div>
              ))}
              {formPost.sondagem_opcoes.length<4&&(
                <button onClick={()=>setFormPost(f=>({...f,sondagem_opcoes:[...f.sondagem_opcoes,'']}))}
                  style={{fontSize:11,color:'#4C8DFF',background:'none',border:'none',cursor:'pointer',padding:'2px 0'}}>+ Adicionar opção</button>
              )}
            </div>
          )}
        </div>
                <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:'#7A8699',marginBottom:6}}>🎬 Vídeo YouTube (opcional):</div>
          <input className="input" placeholder="https://youtube.com/watch?v=..." value={formPost.video_url}
            onChange={e=>setFormPost(f=>({...f,video_url:e.target.value}))} style={{fontSize:12}}/>
          {extrairYoutubeId(formPost.video_url)&&(
            <div style={{marginTop:6,fontSize:11,color:'#2DD4A7'}}>✓ Vídeo detectado — será incorporado no post</div>
          )}
        </div>
        {explorar.length>0&&(
          <div>
            <div style={{fontSize:11,color:'#7A8699',marginBottom:6}}>@ Mencionar:</div>
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>
              {explorar.slice(0,6).map(p=>(
                <button key={p.id} onClick={()=>setFormPost(f=>({...f,conteudo:f.conteudo+` @${p.nome?.split(' ')[0].toLowerCase()}`}))}
                  style={{flexShrink:0,padding:'3px 10px',background:'rgba(45,212,167,.1)',border:'1px solid rgba(45,212,167,.2)',borderRadius:12,fontSize:11,color:'#2DD4A7',cursor:'pointer'}}>
                  @{p.nome?.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal repost ──────────────────────────────────────────────────── */}
      <Modal open={!!modalRepost} onClose={()=>setModalRepost(null)} title="🔁 Repost"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalRepost(null)}>Cancelar</button><button className="btn btn-primary" onClick={()=>repostar(modalRepost)} disabled={savingPost}>{savingPost?<Spinner/>:null}Repostar</button></>}>
        {modalRepost&&(
          <div>
            <div style={{background:'#101F40',borderRadius:8,padding:'10px 14px',marginBottom:12,borderLeft:'3px solid #4C8DFF'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#4C8DFF',marginBottom:4}}>{modalRepost.autor_nome}</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>{modalRepost.conteudo.slice(0,150)}{modalRepost.conteudo.length>150?'...':''}</div>
            </div>
            <div style={{fontSize:12,color:'#7A8699'}}>O post será partilhado com referência ao autor original.</div>
          </div>
        )}
      </Modal>

      {/* ── Modal comentários ─────────────────────────────────────────────── */}
      <Modal open={!!modalComments} onClose={()=>{setModalComments(null);setComments([])}} title="💬 Comentários"
        footer={<><input className="input" placeholder="Escreve um comentário..." value={novoComment} onChange={e=>setNovoComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&enviarComment()} style={{flex:1}}/><button className="btn btn-primary btn-sm" onClick={enviarComment} disabled={savingComment}>{savingComment?<Spinner/>:'Enviar'}</button></>}>
        {comments.length===0?<div style={{textAlign:'center',color:'#7A8699',padding:'20px 0'}}>Sem comentários ainda. Sê o primeiro!</div>
          :<div style={{display:'flex',flexDirection:'column',gap:10}}>
              {comments.map(c=>(
                <div key={c.id} style={{display:'flex',gap:8}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>{c.autor_nome?.[0]?.toUpperCase()||'?'}</div>
                  <div style={{flex:1,background:'#101F40',borderRadius:8,padding:'8px 12px'}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#4C8DFF',marginBottom:3}}>{c.autor_nome}</div>
                    <div style={{fontSize:13,color:'#cbd5e1'}}>{c.conteudo}</div>
                  </div>
                </div>
              ))}
            </div>
        }
      </Modal>
    </div>
  )
}
