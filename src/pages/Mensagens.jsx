import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIdioma } from '../hooks/useIdioma'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'
import { useToast, Spinner, EmptyState } from '../components/ui'

export default function Mensagens({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useIdioma()
  const { temBase, temPro, temElite } = useLicenca()
  const [conversas, setConversas] = useState([])
  const [conversa, setConversa] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contactos, setContactos] = useState([])
  const [novaConversa, setNovaConversa] = useState(false)
  const [busca, setBusca] = useState('')
  const fimRef = useRef(null)

  const uid = user?.id
  const nome = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Eu'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Carregar conversas do utilizador
      const { data: cvs } = await supabase.from('mensagens_conversas')
        .select('*').or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .order('updated_at', { ascending: false })
      setConversas(cvs || [])

      // Carregar contactos (perfis públicos)
      const { data: cts } = await supabase.from('perfis')
        .select('user_id,nome,foto_perfil_url,org').eq('perfil_publico', true)
        .neq('user_id', uid).limit(50)
      setContactos(cts || [])
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [uid])

  useEffect(() => { load() }, [load])

  const abrirConversa = async (outroPerfil) => {
    // Verificar se já existe conversa
    const existente = conversas.find(c =>
      (c.user_a === uid && c.user_b === outroPerfil.user_id) ||
      (c.user_b === uid && c.user_a === outroPerfil.user_id)
    )
    if (existente) {
      setConversa({ ...existente, outroNome: outroPerfil.nome, outraFoto: outroPerfil.foto_perfil_url })
      carregarMensagens(existente.id)
      setNovaConversa(false)
      return
    }
    // Criar nova conversa
    const { data: nova } = await supabase.from('mensagens_conversas').insert({
      user_a: uid, user_b: outroPerfil.user_id,
      nome_a: nome, nome_b: outroPerfil.nome,
      foto_a: user?.user_metadata?.foto || '',
      foto_b: outroPerfil.foto_perfil_url || '',
    }).select().single()
    if (nova) {
      setConversa({ ...nova, outroNome: outroPerfil.nome, outraFoto: outroPerfil.foto_perfil_url })
      setMsgs([])
      setConversas(cs => [nova, ...cs])
      setNovaConversa(false)
    }
  }

  const carregarMensagens = async (cvId) => {
    const { data } = await supabase.from('mensagens')
      .select('*').eq('conversa_id', cvId).order('created_at', { ascending: true })
    setMsgs(data || [])
    setTimeout(() => fimRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
    // Marcar como lidas
    await supabase.from('mensagens').update({ lida: true })
      .eq('conversa_id', cvId).neq('user_id', uid)
  }

  const seleccionar = (cv) => {
    const outroId = cv.user_a === uid ? cv.user_b : cv.user_a
    const outroNome = cv.user_a === uid ? cv.nome_b : cv.nome_a
    const outraFoto = cv.user_a === uid ? cv.foto_b : cv.foto_a
    setConversa({ ...cv, outroNome, outraFoto })
    carregarMensagens(cv.id)
  }

  const enviar = async () => {
    if (!texto.trim() || !conversa) return
    setEnviando(true)
    try {
      const { data } = await supabase.from('mensagens').insert({
        conversa_id: conversa.id, user_id: uid,
        autor: nome, conteudo: texto.trim(), lida: false
      }).select().single()
      if (data) {
        setMsgs(m => [...m, data])
        setTexto('')
        await supabase.from('mensagens_conversas').update({ updated_at: new Date().toISOString(), ultima_msg: texto.trim() }).eq('id', conversa.id)
        setTimeout(() => fimRef.current?.scrollIntoView({ behavior:'smooth' }), 50)
      }
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setEnviando(false) }
  }

  const filtrados = contactos.filter(c => !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()))

  // Subscrever mensagens em tempo real
  useEffect(() => {
    if (!conversa?.id) return
    const sub = supabase.channel('msgs-'+conversa.id)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'mensagens', filter:`conversa_id=eq.${conversa.id}` },
        payload => { setMsgs(m => [...m, payload.new]); setTimeout(()=>fimRef.current?.scrollIntoView({behavior:'smooth'}),50) })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [conversa?.id])

  // Verificar plano
  const temAcesso = temPro
  if (!temAcesso) return <BloqueioPlano plano="pro" nav={nav} />

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(76,141,255,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#1E5FD9,#4C8DFF)' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>💬 Mensagens</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>{conversas.length} conversa(s)</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setNovaConversa(true); setConversa(null) }}>+ Nova</button>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, height:'65vh', minHeight:400 }}>
        {/* Lista de conversas */}
        <div style={{ width:novaConversa?'100%':conversa?'35%':'100%', display:'flex', flexDirection:'column', gap:6, overflowY:'auto' }}>
          {novaConversa ? (
            <div>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <input className="input" placeholder="🔍 Procurar columbófilo..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ flex:1 }} />
                <button className="btn btn-secondary btn-sm" onClick={()=>setNovaConversa(false)}>✕</button>
              </div>
              {filtrados.length === 0
                ? <EmptyState icon="👥" title="Sem contactos" desc="Segue columbófilos na Comunidade para os contactar" />
                : filtrados.map(c => (
                    <div key={c.user_id} className="card card-p" style={{ display:'flex', gap:10, alignItems:'center', cursor:'pointer' }} onClick={() => abrirConversa(c)}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff', overflow:'hidden', flexShrink:0 }}>
                        {c.foto_perfil_url ? <img src={c.foto_perfil_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : c.nome?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{c.nome}</div>
                        <div style={{ fontSize:11, color:'#7A8699' }}>{c.org||'Columbófilo'}</div>
                      </div>
                      <span style={{ fontSize:18, color:'#4C8DFF' }}>→</span>
                    </div>
                  ))
              }
            </div>
          ) : (
            conversas.length === 0
              ? <EmptyState icon="💬" title="Sem mensagens" desc="Inicia uma conversa com um columbófilo da comunidade" action={<button className="btn btn-primary" onClick={()=>setNovaConversa(true)}>+ Nova conversa</button>} />
              : conversas.map(cv => {
                  const outroNome = cv.user_a === uid ? cv.nome_b : cv.nome_a
                  const outraFoto = cv.user_a === uid ? cv.foto_b : cv.foto_a
                  const activa = conversa?.id === cv.id
                  return (
                    <div key={cv.id} onClick={() => seleccionar(cv)} className="card card-p"
                      style={{ display:'flex', gap:10, alignItems:'center', cursor:'pointer', borderLeft:`3px solid ${activa?'#4C8DFF':'transparent'}`, background:activa?'rgba(76,141,255,.08)':'undefined' }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff', overflow:'hidden', flexShrink:0 }}>
                        {outraFoto ? <img src={outraFoto} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : outroNome?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{outroNome}</div>
                        <div style={{ fontSize:11, color:'#7A8699', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cv.ultima_msg || t('semMensagens')}</div>
                      </div>
                    </div>
                  )
                })
          )}
        </div>

        {/* Chat */}
        {conversa && !novaConversa && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#070F1D', borderRadius:12, border:'1px solid #1B2D52', overflow:'hidden' }}>
            {/* Header da conversa */}
            <div style={{ padding:'10px 14px', background:'#0B1830', borderBottom:'1px solid #1B2D52', display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', overflow:'hidden', flexShrink:0 }}>
                {conversa.outraFoto ? <img src={conversa.outraFoto} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : conversa.outroNome?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1, fontSize:13, fontWeight:600, color:'#fff' }}>{conversa.outroNome}</div>
              <button onClick={() => setConversa(null)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:18 }}>✕</button>
            </div>
            {/* Mensagens */}
            <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:8 }}>
              {msgs.length === 0 && <div style={{ textAlign:'center', color:'#475569', fontSize:12, marginTop:20 }}>Início da conversa</div>}
              {msgs.map(m => {
                const minha = m.user_id === uid
                return (
                  <div key={m.id} style={{ display:'flex', justifyContent:minha?'flex-end':'flex-start' }}>
                    <div style={{ maxWidth:'75%', padding:'8px 12px', borderRadius:minha?'14px 14px 4px 14px':'14px 14px 14px 4px', background:minha?'linear-gradient(135deg,#1E5FD9,#1456C0)':'#101F40', fontSize:13, color:'#fff', lineHeight:1.5 }}>
                      {m.conteudo}
                      <div style={{ fontSize:9, color:minha?'rgba(255,255,255,.5)':'#475569', marginTop:3, textAlign:minha?'right':'left' }}>
                        {new Date(m.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}
                        {minha && <span style={{ marginLeft:4 }}>{m.lida?'✓✓':'✓'}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={fimRef} />
            </div>
            {/* Input */}
            <div style={{ padding:'10px 12px', borderTop:'1px solid #1B2D52', display:'flex', gap:8 }}>
              <input className="input" placeholder="Escreve uma mensagem..." value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => e.key==='Enter'&&!e.shiftKey&&enviar()}
                style={{ flex:1, fontSize:13 }} />
              <button className="btn btn-primary" onClick={enviar} disabled={!texto.trim()||enviando} style={{ padding:'8px 14px' }}>
                {enviando ? <Spinner /> : '→'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
