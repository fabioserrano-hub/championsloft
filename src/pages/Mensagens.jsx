import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIdioma } from '../hooks/useIdioma'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'
import { useToast, Spinner, EmptyState } from '../components/ui'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'

export default function Mensagens({ nav, params }) {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useIdioma()
  const { temPro } = useLicenca()
  const [conversas, setConversas] = useState([])
  const [conversa, setConversa] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contactos, setContactos] = useState([])
  const [novaConversa, setNovaConversa] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todas') // todas | naoLidas | arquivadas
  const [msgReply, setMsgReply] = useState(null)
  const [bloqueados, setBloqueados] = useState([])
  const fimRef = useRef(null)
  const inputRef = useRef(null)

  const uid = user?.id
  const nome = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Eu'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data:cvs } = await supabase.from('mensagens_conversas')
        .select('*').or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .order('updated_at',{ascending:false})
      setConversas(cvs||[])
      const { data:cts } = await supabase.from('perfis')
        .select('user_id,nome,foto_perfil_url,org').eq('perfil_publico',true)
        .neq('user_id',uid).limit(50)
      setContactos(cts||[])
      // Carregar bloqueados do localStorage
      try { setBloqueados(JSON.parse(localStorage.getItem('cl_bloqueados')||'[]')) } catch {}
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[uid])

  useEffect(()=>{ load() },[load])

  const abrirConversa = async (outroPerfil) => {
    const existente = conversas.find(c=>(c.user_a===uid&&c.user_b===outroPerfil.user_id)||(c.user_b===uid&&c.user_a===outroPerfil.user_id))
    if (existente) {
      setConversa({...existente, outroNome:outroPerfil.nome, outraFoto:outroPerfil.foto_perfil_url})
      carregarMensagens(existente.id); setNovaConversa(false); return
    }
    const { data:nova } = await supabase.from('mensagens_conversas').insert({
      user_a:uid, user_b:outroPerfil.user_id,
      nome_a:nome, nome_b:outroPerfil.nome,
      foto_a:user?.user_metadata?.foto||'', foto_b:outroPerfil.foto_perfil_url||'',
    }).select().single()
    if (nova) {
      setConversa({...nova, outroNome:outroPerfil.nome, outraFoto:outroPerfil.foto_perfil_url})
      setMsgs([]); setConversas(cs=>[nova,...cs]); setNovaConversa(false)
    }
  }

  const carregarMensagens = async (cvId) => {
    const { data } = await supabase.from('mensagens')
      .select('*').eq('conversa_id',cvId).order('created_at',{ascending:true})
    setMsgs(data||[])
    setTimeout(()=>fimRef.current?.scrollIntoView({behavior:'smooth'}),100)
    await supabase.from('mensagens').update({lida:true}).eq('conversa_id',cvId).neq('user_id',uid)
  }

  const seleccionar = (cv) => {
    const outroNome = cv.user_a===uid?cv.nome_b:cv.nome_a
    const outraFoto = cv.user_a===uid?cv.foto_b:cv.foto_a
    setConversa({...cv, outroNome, outraFoto})
    carregarMensagens(cv.id)
    setMsgReply(null)
  }

  const enviar = async () => {
    if (!texto.trim()||!conversa) return
    setEnviando(true)
    try {
      const payload = {
        conversa_id:conversa.id, user_id:uid, autor:nome,
        conteudo:texto.trim(), lida:false,
        reply_to:msgReply?.id||null, reply_texto:msgReply?.conteudo||null
      }
      const { data, error } = await supabase.from('mensagens').insert(payload).select().single()
      if (error) throw error
      setMsgs(m=>[...m, data||payload]); setTexto(''); setMsgReply(null)
      await supabase.from('mensagens_conversas').update({updated_at:new Date().toISOString(),ultima_msg:texto.trim()}).eq('id',conversa.id)
      setConversas(cs=>cs.map(c=>c.id===conversa.id?{...c,ultima_msg:texto.trim(),updated_at:new Date().toISOString()}:c))
      setTimeout(()=>fimRef.current?.scrollIntoView({behavior:'smooth'}),50)
    } catch(e) { toast('Erro ao enviar: '+e.message,'err') }
    finally { setEnviando(false) }
  }

  const bloquear = (cvId, outroId) => {
    const novos = [...bloqueados, outroId]
    setBloqueados(novos)
    localStorage.setItem('cl_bloqueados', JSON.stringify(novos))
    setConversa(null); toast('Utilizador bloqueado','ok')
  }

  const arquivar = async (cvId) => {
    try {
      await supabase.from('mensagens_conversas').update({arquivada:true}).eq('id',cvId)
      setConversas(cs=>cs.map(c=>c.id===cvId?{...c,arquivada:true}:c))
      if (conversa?.id===cvId) setConversa(null)
      toast('Conversa arquivada','ok')
    } catch(e) { toast('Erro','err') }
  }

  const naoLidasCount = conversas.filter(cv=>{
    const outroId = cv.user_a===uid?cv.user_b:cv.user_a
    return !bloqueados.includes(outroId) && !cv.arquivada && cv.ultima_msg && !cv.lida_por_a && cv.user_b===uid
  }).length

  const conversasFiltradas = conversas.filter(cv=>{
    const outroId = cv.user_a===uid?cv.user_b:cv.user_a
    if (bloqueados.includes(outroId)) return false
    if (filtro==='arquivadas') return cv.arquivada
    if (cv.arquivada) return false
    return true
  })

  const filtrados = contactos.filter(c=>!busca||c.nome?.toLowerCase().includes(busca.toLowerCase())).filter(c=>!bloqueados.includes(c.user_id))

  useEffect(()=>{
    if (!conversa?.id) return
    const sub = supabase.channel('msgs-'+conversa.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'mensagens',filter:`conversa_id=eq.${conversa.id}`},
        payload=>{ setMsgs(m=>[...m,payload.new]); setTimeout(()=>fimRef.current?.scrollIntoView({behavior:'smooth'}),50) })
      .subscribe()
    return ()=>supabase.removeChannel(sub)
  },[conversa?.id])

  if (!temPro) return <BloqueioPlano plano="pro" nav={nav}/>

  const Avatar = ({ foto, nome:n, size=36, online }) => (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.4, fontWeight:700, color:'#fff', overflow:'hidden', flexShrink:0, position:'relative' }}>
      {foto?<img src={foto} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:n?.[0]?.toUpperCase()||'?'}
      {online&&<div style={{ position:'absolute', bottom:0, right:0, width:size*0.28, height:size*0.28, borderRadius:'50%', background:'#2DD4A7', border:'2px solid #050D1A' }}/>}
    </div>
  )

  return (
    <div>
      <GuiaAuto modulo="mensagens"/>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(76,141,255,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#1E5FD9,#4C8DFF,#1E5FD9)' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
              💬 Mensagens
              {naoLidasCount>0&&<span style={{ background:'#f87171', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:99 }}>{naoLidasCount}</span>}
            </div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>{conversas.filter(c=>!c.arquivada).length} conversas</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <BotaoGuia modulo="mensagens"/>
            <button className="btn btn-primary btn-sm" onClick={()=>{ setNovaConversa(true); setConversa(null) }}>+ Nova</button>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, height:'65vh', minHeight:400 }}>

        {/* Painel esquerdo */}
        <div style={{ width:novaConversa?'100%':conversa?'36%':'100%', display:'flex', flexDirection:'column', gap:0, overflow:'hidden', background:'#070F1D', borderRadius:12, border:'1px solid #1B2D52' }}>
          {novaConversa?(
            <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
              <div style={{ padding:'12px', borderBottom:'1px solid #1B2D52', display:'flex', gap:8 }}>
                <input className="input" placeholder="🔍 Procurar columbófilo..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ flex:1, fontSize:12 }}/>
                <button className="btn btn-secondary btn-sm" onClick={()=>setNovaConversa(false)}>✕</button>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
                {filtrados.length===0
                  ?<EmptyState icon="👥" title="Sem contactos" desc="Segue columbófilos na Comunidade"/>
                  :filtrados.map(c=>(
                    <div key={c.user_id} onClick={()=>abrirConversa(c)}
                      style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 10px', cursor:'pointer', borderRadius:8, marginBottom:4 }}
                      onMouseEnter={e=>e.currentTarget.style.background='#101F40'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <Avatar foto={c.foto_perfil_url} nome={c.nome} size={38}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{c.nome}</div>
                        <div style={{ fontSize:11, color:'#7A8699' }}>{c.org||'Columbófilo'}</div>
                      </div>
                      <span style={{ color:'#4C8DFF', fontSize:16 }}>→</span>
                    </div>
                  ))
                }
              </div>
            </div>
          ):(
            <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
              {/* Filtros */}
              <div style={{ display:'flex', gap:2, padding:'8px', borderBottom:'1px solid #1B2D52' }}>
                {[['todas','Todas'],['arquivadas','📦 Arquivo']].map(([f,l])=>(
                  <button key={f} onClick={()=>setFiltro(f)} style={{ flex:1, padding:'6px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:filtro===f?'#1B2D52':'transparent', color:filtro===f?'#fff':'#475569' }}>{l}</button>
                ))}
              </div>
              <div style={{ flex:1, overflowY:'auto' }}>
                {conversasFiltradas.length===0
                  ?<div style={{ padding:20, textAlign:'center' }}><EmptyState icon="💬" title="Sem mensagens" desc="Inicia uma conversa" action={<button className="btn btn-primary btn-sm" onClick={()=>setNovaConversa(true)}>+ Nova conversa</button>}/></div>
                  :conversasFiltradas.map(cv=>{
                      const outroNome = cv.user_a===uid?cv.nome_b:cv.nome_a
                      const outraFoto = cv.user_a===uid?cv.foto_b:cv.foto_a
                      const activa = conversa?.id===cv.id
                      return (
                        <div key={cv.id} onClick={()=>seleccionar(cv)}
                          style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', cursor:'pointer', background:activa?'rgba(76,141,255,.1)':'transparent', borderLeft:`3px solid ${activa?'#4C8DFF':'transparent'}` }}
                          onMouseEnter={e=>{ if(!activa) e.currentTarget.style.background='rgba(255,255,255,.03)' }}
                          onMouseLeave={e=>{ if(!activa) e.currentTarget.style.background='transparent' }}>
                          <Avatar foto={outraFoto} nome={outroNome} size={38}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{outroNome}</div>
                            <div style={{ fontSize:11, color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cv.ultima_msg||'Sem mensagens'}</div>
                          </div>
                          {cv.arquivada&&<span style={{ fontSize:10, color:'#475569' }}>📦</span>}
                        </div>
                      )
                    })
                }
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        {conversa&&!novaConversa&&(
          <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#070F1D', borderRadius:12, border:'1px solid #1B2D52', overflow:'hidden' }}>
            {/* Header chat */}
            <div style={{ padding:'10px 14px', background:'#0B1830', borderBottom:'1px solid #1B2D52', display:'flex', gap:10, alignItems:'center' }}>
              <Avatar foto={conversa.outraFoto} nome={conversa.outroNome} size={34}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{conversa.outroNome}</div>
                <div style={{ fontSize:10, color:'#7A8699' }}>Columbófilo</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>arquivar(conversa.id)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:14 }} title="Arquivar">📦</button>
                <button onClick={()=>{ const outroId=conversa.user_a===uid?conversa.user_b:conversa.user_a; bloquear(conversa.id,outroId) }} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:14 }} title="Bloquear">🚫</button>
                <button onClick={()=>setConversa(null)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:18 }}>✕</button>
              </div>
            </div>

            {/* Mensagens */}
            <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:6 }}>
              {msgs.length===0&&<div style={{ textAlign:'center', color:'#475569', fontSize:12, marginTop:20 }}>Início da conversa 👋</div>}
              {msgs.map(m=>{
                const minha = m.user_id===uid
                return (
                  <div key={m.id} style={{ display:'flex', justifyContent:minha?'flex-end':'flex-start', gap:6 }}>
                    {!minha&&<Avatar foto={conversa.outraFoto} nome={conversa.outroNome} size={26}/>}
                    <div style={{ maxWidth:'72%' }}>
                      {m.reply_texto&&(
                        <div style={{ fontSize:10, color:'#7A8699', background:'rgba(255,255,255,.04)', border:'1px solid #1B2D52', borderRadius:'8px 8px 0 0', padding:'4px 8px', borderLeft:'2px solid #4C8DFF', marginBottom:1 }}>
                          ↩ {m.reply_texto.slice(0,60)}{m.reply_texto.length>60?'...':''}
                        </div>
                      )}
                      <div onClick={()=>setMsgReply(m)}
                        style={{ padding:'8px 12px', borderRadius:minha?'14px 14px 4px 14px':'14px 14px 14px 4px', background:minha?'linear-gradient(135deg,#1E5FD9,#1456C0)':'#101F40', fontSize:13, color:'#fff', lineHeight:1.5, cursor:'pointer' }}>
                        {m.conteudo}
                        <div style={{ fontSize:9, color:minha?'rgba(255,255,255,.5)':'#475569', marginTop:3, textAlign:minha?'right':'left', display:'flex', gap:4, justifyContent:minha?'flex-end':'flex-start', alignItems:'center' }}>
                          {new Date(m.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}
                          {minha&&<span style={{ fontSize:10 }}>{m.lida?'✓✓':'✓'}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={fimRef}/>
            </div>

            {/* Reply preview */}
            {msgReply&&(
              <div style={{ padding:'6px 12px', background:'rgba(76,141,255,.06)', borderTop:'1px solid rgba(76,141,255,.15)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1, fontSize:11, color:'#7A8699', borderLeft:'2px solid #4C8DFF', paddingLeft:8 }}>↩ {msgReply.conteudo.slice(0,80)}</div>
                <button onClick={()=>setMsgReply(null)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:16 }}>✕</button>
              </div>
            )}

            {/* Input */}
            <div style={{ padding:'10px 12px', borderTop:'1px solid #1B2D52', display:'flex', gap:8 }}>
              <input ref={inputRef} className="input" placeholder="Escreve uma mensagem..." value={texto}
                onChange={e=>setTexto(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&enviar()}
                style={{ flex:1, fontSize:13 }}/>
              <button className="btn btn-primary" onClick={enviar} disabled={!texto.trim()||enviando} style={{ padding:'8px 14px' }}>
                {enviando?<Spinner/>:'→'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
