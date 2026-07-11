import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIdioma } from '../hooks/useIdioma'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'
import { useToast, Spinner, EmptyState, Modal } from '../components/ui'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'

const REACOES = ['❤️','👍','😂','🕊️','👏','🏆']

export default function Mensagens({ nav, params }) {
  const { user } = useAuth()
  const toast = useToast()
  const { temPro } = useLicenca()

  // ── Estado principal ─────────────────────────────────────────────
  const [conversas, setConversas]       = useState([])
  const [conversa, setConversa]         = useState(null)
  const [msgs, setMsgs]                 = useState([])
  const [texto, setTexto]               = useState('')
  const [enviando, setEnviando]         = useState(false)
  const [loading, setLoading]           = useState(true)
  const [contactos, setContactos]       = useState([])
  const [pombos, setPombos]             = useState([])
  const [novaConversa, setNovaConversa] = useState(false)
  const [busca, setBusca]               = useState([])
  const [buscaTexto, setBuscaTexto]     = useState('')
  const [filtro, setFiltro]             = useState('todas')
  const [msgReply, setMsgReply]         = useState(null)
  const [bloqueados, setBloqueados]     = useState([])
  const [reacaoAberta, setReacaoAberta] = useState(null)
  const [typing, setTyping]             = useState(false)
  const [outroTyping, setOutroTyping]   = useState(false)
  const [modalInfo, setModalInfo]       = useState(false)
  const [modalVoz, setModalVoz]         = useState(false)
  const [modalPombo, setModalPombo]     = useState(false)
  const [pesquisaConv, setPesquisaConv] = useState('')
  const [pesquisaAberta, setPesquisaAberta] = useState(false)
  const [msgApagar, setMsgApagar]       = useState(null)
  const fimRef   = useRef(null)
  const inputRef = useRef(null)
  const typingRef = useRef(null)

  const uid  = user?.id
  const nome = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Eu'

  // ── Carregar dados ───────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    try {
      const [{ data: cvs }, { data: cts }, { data: pb }] = await Promise.all([
        supabase.from('mensagens_conversas')
          .select('*').or(`user_a.eq.${uid},user_b.eq.${uid}`)
          .order('updated_at', { ascending: false }),
        supabase.from('perfis')
          .select('user_id,nome,foto_perfil_url,org,verificado,bio,localidade')
          .eq('perfil_publico', true).neq('user_id', uid).limit(60),
        supabase.from('pombos').select('id,nome,anilha,foto_url,percentil,forma')
          .eq('user_id', uid).order('nome').limit(30)
      ])
      setConversas(cvs || [])
      setContactos(cts || [])
      setPombos(pb || [])
      try { setBloqueados(JSON.parse(localStorage.getItem('cl_bloqueados') || '[]')) } catch {}
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [uid])

  useEffect(() => { load() }, [load])

  // ── Realtime mensagens ───────────────────────────────────────────
  useEffect(() => {
    if (!conversa?.id) return
    const sub = supabase.channel('msgs-' + conversa.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `conversa_id=eq.${conversa.id}` },
        p => {
          if (p.new.user_id !== uid) {
            setMsgs(m => m.find(x => x.id === p.new.id) ? m : [...m, p.new])
            setTimeout(() => fimRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensagens', filter: `conversa_id=eq.${conversa.id}` },
        p => { setMsgs(m => m.map(x => x.id === p.new.id ? { ...x, ...p.new } : x)) })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mensagens', filter: `conversa_id=eq.${conversa.id}` },
        p => { setMsgs(m => m.filter(x => x.id !== p.old.id)) })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [conversa?.id, uid])

  // ── Typing indicator ─────────────────────────────────────────────
  useEffect(() => {
    if (!conversa?.id || !uid) return
    const ch = supabase.channel('typing-' + conversa.id)
      .on('broadcast', { event: 'typing' }, p => {
        if (p.payload.uid !== uid) {
          setOutroTyping(true)
          clearTimeout(typingRef.current)
          typingRef.current = setTimeout(() => setOutroTyping(false), 2500)
        }
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [conversa?.id, uid])

  const enviarTyping = () => {
    if (!conversa?.id) return
    supabase.channel('typing-' + conversa.id).send({ type: 'broadcast', event: 'typing', payload: { uid } })
  }

  // ── Seleccionar / criar conversa ─────────────────────────────────
  const abrirConversa = async (outroPerfil) => {
    const existente = conversas.find(c =>
      (c.user_a === uid && c.user_b === outroPerfil.user_id) ||
      (c.user_b === uid && c.user_a === outroPerfil.user_id)
    )
    if (existente) { seleccionar(existente, outroPerfil); setNovaConversa(false); if (isMobile) setVistaM('chat'); return }
    try {
      const { data, error } = await supabase.from('mensagens_conversas').insert({
        user_a: uid, user_b: outroPerfil.user_id,
        nome_a: nome, nome_b: outroPerfil.nome,
        foto_a: user?.user_metadata?.foto || '', foto_b: outroPerfil.foto_perfil_url || '',
      }).select().single()
      if (error) throw error
      setConversa({ ...data, outroNome: outroPerfil.nome, outraFoto: outroPerfil.foto_perfil_url, outroPerfil })
      setMsgs([]); setConversas(cs => [data, ...cs]); setNovaConversa(false)
      if (isMobile) setVistaM('chat')
    } catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const seleccionar = (cv, perfil) => {
    const outroNome = perfil?.nome || (cv.user_a === uid ? cv.nome_b : cv.nome_a)
    const outraFoto = perfil?.foto_perfil_url || (cv.user_a === uid ? cv.foto_b : cv.foto_a)
    setConversa({ ...cv, outroNome, outraFoto, outroPerfil: perfil })
    setMsgReply(null); setPesquisaAberta(false); setPesquisaConv('')
    carregarMensagens(cv.id)
  }

  const carregarMensagens = async (cvId) => {
    const { data } = await supabase.from('mensagens')
      .select('*').eq('conversa_id', cvId).order('created_at', { ascending: true })
    setMsgs(data || [])
    setTimeout(() => fimRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    supabase.from('mensagens').update({ lida: true }).eq('conversa_id', cvId).neq('user_id', uid).then(() => {})
  }

  // ── Enviar mensagem ──────────────────────────────────────────────
  const enviar = async (conteudoOverride) => {
    const conteudo = (conteudoOverride || texto).trim()
    if (!conteudo || !conversa || enviando) return
    setEnviando(true); setTexto(''); setMsgReply(null)
    const optimista = {
      id: 'opt-' + Date.now(), conversa_id: conversa.id, user_id: uid, autor: nome,
      conteudo, lida: false, reply_to: msgReply?.id || null, reply_texto: msgReply?.conteudo || null,
      created_at: new Date().toISOString(), _optimista: true, reacoes: {}
    }
    setMsgs(m => [...m, optimista])
    setTimeout(() => fimRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    try {
      const { data, error } = await supabase.from('mensagens').insert({
        conversa_id: conversa.id, user_id: uid, autor: nome, conteudo, lida: false,
        reply_to: msgReply?.id || null, reply_texto: msgReply?.conteudo || null
      }).select().single()
      if (error) throw error
      setMsgs(m => m.map(x => x.id === optimista.id ? { ...data, reacoes: {} } : x))
      setConversas(cs => cs.map(c => c.id === conversa.id
        ? { ...c, ultima_msg: conteudo, updated_at: new Date().toISOString() } : c))
      await supabase.from('mensagens_conversas')
        .update({ updated_at: new Date().toISOString(), ultima_msg: conteudo }).eq('id', conversa.id)
    } catch (e) {
      setMsgs(m => m.filter(x => x.id !== optimista.id))
      setTexto(conteudo)
      toast('Erro: ' + e.message, 'err')
    } finally { setEnviando(false) }
  }

  // ── Reagir ───────────────────────────────────────────────────────
  const reagir = async (msgId, emoji) => {
    setReacaoAberta(null)
    setMsgs(m => m.map(x => {
      if (x.id !== msgId) return x
      const r = { ...(x.reacoes || {}) }
      if (r[emoji]?.includes(uid)) r[emoji] = r[emoji].filter(u => u !== uid)
      else r[emoji] = [...(r[emoji] || []), uid]
      if (!r[emoji].length) delete r[emoji]
      return { ...x, reacoes: r }
    }))
    try {
      const { data: msg } = await supabase.from('mensagens').select('reacoes').eq('id', msgId).maybeSingle()
      const r = { ...(msg?.reacoes || {}) }
      if (r[emoji]?.includes(uid)) r[emoji] = r[emoji].filter(u => u !== uid)
      else r[emoji] = [...(r[emoji] || []), uid]
      if (!r[emoji].length) delete r[emoji]
      await supabase.from('mensagens').update({ reacoes: r }).eq('id', msgId)
    } catch {}
  }

  // ── Apagar mensagem ──────────────────────────────────────────────
  const apagarMsg = async (msg, paraTodos) => {
    setMsgApagar(null)
    if (paraTodos && msg.user_id === uid) {
      await supabase.from('mensagens').update({ conteudo: '🗑️ Mensagem apagada', apagada: true }).eq('id', msg.id)
      setMsgs(m => m.map(x => x.id === msg.id ? { ...x, conteudo: '🗑️ Mensagem apagada', apagada: true } : x))
    } else {
      setMsgs(m => m.filter(x => x.id !== msg.id))
    }
  }

  // ── Partilhar pombo numa mensagem ────────────────────────────────
  const partilharPombo = (pombo) => {
    setModalPombo(false)
    const card = `🕊️ *${pombo.nome}* (${pombo.anilha})\n📊 Percentil: ${pombo.percentil || 0}% · 💪 Forma: ${pombo.forma || 0}%`
    enviar(card)
  }

  // ── Arquivar / bloquear ──────────────────────────────────────────
  const arquivar = async (cvId) => {
    try {
      await supabase.from('mensagens_conversas').update({ arquivada: true }).eq('id', cvId)
      setConversas(cs => cs.map(c => c.id === cvId ? { ...c, arquivada: true } : c))
      if (conversa?.id === cvId) setConversa(null)
      toast('Arquivada', 'ok')
    } catch { toast('Erro', 'err') }
  }

  const bloquear = (outroId) => {
    const novos = [...bloqueados, outroId]
    setBloqueados(novos)
    localStorage.setItem('cl_bloqueados', JSON.stringify(novos))
    setConversa(null); toast('Utilizador bloqueado', 'ok')
  }

  // ── Filtros ──────────────────────────────────────────────────────
  const conversasFiltradas = conversas.filter(cv => {
    const outroId = cv.user_a === uid ? cv.user_b : cv.user_a
    if (bloqueados.includes(outroId)) return false
    if (filtro === 'arquivadas') return cv.arquivada
    return !cv.arquivada
  })

  const msgsFiltradas = pesquisaConv
    ? msgs.filter(m => m.conteudo?.toLowerCase().includes(pesquisaConv.toLowerCase()))
    : msgs

  const naoLidas = conversas.filter(cv => !cv.arquivada && cv.ultima_msg &&
    !bloqueados.includes(cv.user_a === uid ? cv.user_b : cv.user_a)).length

  // ── Detecção mobile ─────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Em mobile: vista = 'lista' | 'chat'
  const [vistaM, setVistaM] = useState('lista')
  const abrirChat = (cv, perfil) => { seleccionar(cv, perfil); if (isMobile) setVistaM('chat') }
  const voltarLista = () => { setConversa(null); setVistaM('lista') }

  if (!temPro) return <BloqueioPlano plano="pro" nav={nav} />

  // ── Componentes auxiliares ───────────────────────────────────────
  const Avatar = ({ foto, nome: n, size = 36, online, verificado }) => (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', overflow: 'hidden', border: '2px solid rgba(76,141,255,.25)' }}>
        {foto ? <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : n?.[0]?.toUpperCase() || '?'}
      </div>
      {online && <div style={{ position: 'absolute', bottom: 1, right: 1, width: size * 0.26, height: size * 0.26, borderRadius: '50%', background: '#2DD4A7', border: '2px solid #050D1A' }} />}
      {verificado && <div style={{ position: 'absolute', top: -1, right: -1, width: 13, height: 13, borderRadius: '50%', background: 'linear-gradient(135deg,#1E5FD9,#2DD4A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff', fontWeight: 900, border: '1.5px solid #050D1A' }}>✓</div>}
    </div>
  )

  const Tempo = ({ ts }) => {
    const d = new Date(ts), hoje = new Date(), ontem = new Date()
    ontem.setDate(ontem.getDate() - 1)
    if (d.toDateString() === hoje.toDateString()) return <>{d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</>
    if (d.toDateString() === ontem.toDateString()) return <>Ontem {d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</>
    return <>{d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</>
  }

  const separadorData = (msg, anterior) => {
    if (!anterior) return true
    return new Date(msg.created_at).toDateString() !== new Date(anterior.created_at).toDateString()
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div onClick={() => setReacaoAberta(null)}>
      <GuiaAuto modulo="mensagens" />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#050D1A,#0B1830)', border: '1px solid rgba(76,141,255,.2)', borderRadius: 14, padding: '14px 16px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#1E5FD9,#4C8DFF,#1E5FD9)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>💬</span>
            <div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                Mensagens
                {naoLidas > 0 && <span style={{ background: 'linear-gradient(135deg,#f87171,#ef4444)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>{naoLidas}</span>}
              </div>
              <div style={{ fontSize: 11, color: '#7A8699' }}>{conversas.filter(c => !c.arquivada).length} conversas</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <BotaoGuia modulo="mensagens" />
            <button className="btn btn-primary btn-sm" onClick={() => { setNovaConversa(true); setConversa(null) }}>+ Nova</button>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display: 'flex', gap: isMobile ? 0 : 10, height: isMobile ? 'calc(100vh - 180px)' : '68vh', minHeight: 380 }}>

        {/* ── Lista conversas — esconde em mobile quando chat aberto ── */}
        <div style={{
          width: isMobile ? '100%' : conversa ? '34%' : '100%',
          minWidth: isMobile ? 'auto' : conversa ? 190 : 'auto',
          display: isMobile ? (vistaM === 'lista' ? 'flex' : 'none') : (novaConversa && conversa ? 'none' : 'flex'),
          flexDirection: 'column', background: '#070F1D', borderRadius: 12, border: '1px solid #1B2D52', overflow: 'hidden'
        }}>
          {novaConversa ? (
            <>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #1B2D52', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => setNovaConversa(false)} style={{ background: 'none', border: 'none', color: '#7A8699', cursor: 'pointer', fontSize: 18 }}>←</button>
                <input className="input" placeholder="🔍 Procurar..." value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: 1, fontSize: 12 }} autoFocus />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
                {contactos.filter(c => !busca || c.nome?.toLowerCase().includes(busca.toLowerCase())).filter(c => !bloqueados.includes(c.user_id)).length === 0
                  ? <EmptyState icon="👥" title="Sem contactos" desc="Segue columbófilos na Comunidade" />
                  : contactos.filter(c => !busca || c.nome?.toLowerCase().includes(busca.toLowerCase())).filter(c => !bloqueados.includes(c.user_id)).map(c => (
                    <div key={c.user_id} onClick={() => abrirConversa(c)}
                      style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px', cursor: 'pointer', borderRadius: 8, marginBottom: 2 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#101F40'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Avatar foto={c.foto_perfil_url} nome={c.nome} size={40} verificado={c.verificado} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{c.nome}</div>
                        <div style={{ fontSize: 11, color: '#475569' }}>{c.localidade || c.org || 'Columbófilo'}</div>
                      </div>
                      <span style={{ fontSize: 14 }}>✉️</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid #1B2D52' }}>
                {[['todas', 'Todas'], ['arquivadas', '📦']].map(([f, l]) => (
                  <button key={f} onClick={() => setFiltro(f)} style={{ flex: 1, padding: '9px 6px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: 'transparent', color: filtro === f ? '#4C8DFF' : '#475569', borderBottom: `2px solid ${filtro === f ? '#4C8DFF' : 'transparent'}` }}>{l}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? <div style={{ padding: 20, textAlign: 'center' }}><Spinner /></div>
                  : conversasFiltradas.length === 0
                    ? <div style={{ padding: 16 }}><EmptyState icon="💬" title="Sem conversas" desc="Inicia uma nova conversa" action={<button className="btn btn-primary btn-sm" onClick={() => setNovaConversa(true)}>+ Nova</button>} /></div>
                    : conversasFiltradas.map(cv => {
                      const outroNome = cv.user_a === uid ? cv.nome_b : cv.nome_a
                      const outraFoto = cv.user_a === uid ? cv.foto_b : cv.foto_a
                      const activa = conversa?.id === cv.id
                      return (
                        <div key={cv.id} onClick={() => abrirChat(cv)}
                          style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 12px', cursor: 'pointer', background: activa ? 'rgba(76,141,255,.08)' : 'transparent', borderLeft: `3px solid ${activa ? '#4C8DFF' : 'transparent'}` }}
                          onMouseEnter={e => { if (!activa) e.currentTarget.style.background = 'rgba(255,255,255,.03)' }}
                          onMouseLeave={e => { if (!activa) e.currentTarget.style.background = activa ? 'rgba(76,141,255,.08)' : 'transparent' }}>
                          <Avatar foto={outraFoto} nome={outroNome} size={40} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{outroNome}</div>
                            <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{cv.ultima_msg || 'Sem mensagens'}</div>
                          </div>
                          {cv.updated_at && <span style={{ fontSize: 9, color: '#475569', flexShrink: 0 }}><Tempo ts={cv.updated_at} /></span>}
                        </div>
                      )
                    })}
              </div>
            </>
          )}
        </div>

        {/* ── Chat ── */}
        {conversa && !novaConversa ? (
          <div style={{ flex: 1, display: isMobile && vistaM !== 'chat' ? 'none' : 'flex', flexDirection: 'column', background: '#070F1D', borderRadius: 12, border: '1px solid #1B2D52', overflow: 'hidden' }}>

            {/* Header chat */}
            <div style={{ padding: '10px 14px', background: 'linear-gradient(135deg,#0B1830,#050D1A)', borderBottom: '1px solid #1B2D52', display: 'flex', gap: 10, alignItems: 'center' }}>
              {/* Botão voltar — só mobile */}
              {isMobile && (
                <button onClick={voltarLista} style={{ background: 'none', border: 'none', color: '#4C8DFF', cursor: 'pointer', fontSize: 20, padding: '0 4px', flexShrink: 0 }}>←</button>
              )}
              <Avatar foto={conversa.outraFoto} nome={conversa.outroNome} size={36} online verificado={conversa.outroPerfil?.verificado} />
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setModalInfo(true)}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{conversa.outroNome}</div>
                <div style={{ fontSize: 10, color: outroTyping ? '#D4AF37' : '#2DD4A7' }}>
                  {outroTyping ? '✍️ a escrever...' : '● Online'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setPesquisaAberta(p => !p)} title="Pesquisar" style={{ background: pesquisaAberta ? 'rgba(76,141,255,.15)' : 'none', border: 'none', color: pesquisaAberta ? '#4C8DFF' : '#475569', cursor: 'pointer', fontSize: 15, padding: '5px 7px', borderRadius: 7 }}>🔍</button>
                <button onClick={() => setModalPombo(true)} title="Partilhar pombo" style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 15, padding: '5px 7px', borderRadius: 7 }}>🕊️</button>
                <button onClick={() => arquivar(conversa.id)} title="Arquivar" style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 15, padding: '5px 7px', borderRadius: 7 }}>📦</button>
                <button onClick={() => { const oId = conversa.user_a === uid ? conversa.user_b : conversa.user_a; bloquear(oId) }} title="Bloquear" style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 15, padding: '5px 7px', borderRadius: 7 }}>🚫</button>
                <button onClick={() => setConversa(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, padding: '5px 7px', borderRadius: 7 }}>✕</button>
              </div>
            </div>

            {/* Pesquisa na conversa */}
            {pesquisaAberta && (
              <div style={{ padding: '8px 12px', background: 'rgba(76,141,255,.06)', borderBottom: '1px solid rgba(76,141,255,.15)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="input" placeholder="Pesquisar na conversa..." value={pesquisaConv}
                  onChange={e => setPesquisaConv(e.target.value)}
                  style={{ flex: 1, fontSize: 12 }} autoFocus />
                {pesquisaConv && <span style={{ fontSize: 11, color: '#7A8699' }}>{msgsFiltradas.length} resultado(s)</span>}
              </div>
            )}

            {/* Mensagens */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {msgsFiltradas.length === 0 && !pesquisaConv && (
                <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 40 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>Início da conversa</div>
                  <div style={{ marginTop: 4 }}>com {conversa.outroNome}</div>
                </div>
              )}
              {pesquisaConv && msgsFiltradas.length === 0 && (
                <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 40 }}>Sem resultados para "{pesquisaConv}"</div>
              )}
              {msgsFiltradas.map((m, i) => {
                const minha = m.user_id === uid
                const anterior = msgsFiltradas[i - 1]
                const mesmoRem = anterior?.user_id === m.user_id
                const mostrarSep = separadorData(m, anterior)
                const reacoes = m.reacoes || {}
                const temReacoes = Object.keys(reacoes).length > 0
                const apagada = m.apagada

                return (
                  <div key={m.id}>
                    {/* Separador de data */}
                    {mostrarSep && (
                      <div style={{ textAlign: 'center', margin: '10px 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 1, background: '#1B2D52' }} />
                        <span style={{ fontSize: 10, color: '#475569', background: '#070F1D', padding: '0 8px' }}>
                          <Tempo ts={m.created_at} />
                        </span>
                        <div style={{ flex: 1, height: 1, background: '#1B2D52' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: minha ? 'flex-end' : 'flex-start', gap: 6, marginTop: mesmoRem && !mostrarSep ? 1 : 6, position: 'relative' }}>
                      {!minha && !mesmoRem && <Avatar foto={conversa.outraFoto} nome={conversa.outroNome} size={26} />}
                      {!minha && mesmoRem && <div style={{ width: 26, flexShrink: 0 }} />}
                      <div style={{ maxWidth: '72%', position: 'relative' }}>
                        {m.reply_texto && (
                          <div style={{ fontSize: 10, color: '#7A8699', background: 'rgba(255,255,255,.04)', border: '1px solid #1B2D52', borderRadius: '8px 8px 0 0', padding: '4px 8px', borderLeft: '2px solid #4C8DFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            ↩ {m.reply_texto.slice(0, 60)}{m.reply_texto.length > 60 ? '...' : ''}
                          </div>
                        )}
                        <div
                          onClick={e => { e.stopPropagation(); if (!apagada && !m._optimista) setReacaoAberta(reacaoAberta === m.id ? null : m.id) }}
                          onContextMenu={e => { e.preventDefault(); if (!apagada) setMsgApagar(m) }}
                          style={{ padding: '8px 12px', borderRadius: minha ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: apagada ? 'rgba(255,255,255,.04)' : minha ? 'linear-gradient(135deg,#1E5FD9,#1456C0)' : '#101F40', fontSize: 13, color: apagada ? '#475569' : m._optimista ? 'rgba(255,255,255,.6)' : '#fff', lineHeight: 1.55, cursor: 'pointer', fontStyle: apagada ? 'italic' : 'normal', border: m._optimista ? '1px solid rgba(76,141,255,.2)' : 'none' }}>
                          {m.conteudo}
                          <div style={{ fontSize: 9, color: minha ? 'rgba(255,255,255,.45)' : '#475569', marginTop: 3, display: 'flex', gap: 3, justifyContent: minha ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
                            {m._optimista ? '⏳' : <Tempo ts={m.created_at} />}
                            {minha && !m._optimista && <span style={{ fontSize: 10, color: m.lida ? '#2DD4A7' : 'rgba(255,255,255,.4)' }}>{m.lida ? '✓✓' : '✓'}</span>}
                          </div>
                        </div>

                        {/* Reacções */}
                        {temReacoes && (
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3, justifyContent: minha ? 'flex-end' : 'flex-start' }}>
                            {Object.entries(reacoes).filter(([, u]) => u.length > 0).map(([emoji, users]) => (
                              <button key={emoji} onClick={e => { e.stopPropagation(); reagir(m.id, emoji) }}
                                style={{ background: users.includes(uid) ? 'rgba(76,141,255,.2)' : 'rgba(255,255,255,.06)', border: `1px solid ${users.includes(uid) ? 'rgba(76,141,255,.4)' : '#1B2D52'}`, borderRadius: 10, padding: '1px 6px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                                {emoji} <span style={{ color: '#7A8699', fontSize: 10 }}>{users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Picker reacções */}
                        {reacaoAberta === m.id && (
                          <div onClick={e => e.stopPropagation()}
                            style={{ position: 'absolute', [minha ? 'right' : 'left']: 0, bottom: '100%', marginBottom: 4, background: '#0B1830', border: '1px solid #1B2D52', borderRadius: 12, padding: '6px 8px', display: 'flex', gap: 4, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
                            {REACOES.map(r => (
                              <button key={r} onClick={() => reagir(m.id, r)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '2px 4px', borderRadius: 6, transition: 'transform .1s' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                {r}
                              </button>
                            ))}
                            {!apagada && minha && (
                              <button onClick={() => { setReacaoAberta(null); setMsgReply(m) }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 6px', color: '#7A8699', borderLeft: '1px solid #1B2D52', marginLeft: 2 }}>↩</button>
                            )}
                            {!apagada && (
                              <button onClick={() => { setReacaoAberta(null); setMsgApagar(m) }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 6px', color: '#f87171' }}>🗑️</button>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Botão reply rápido */}
                      {!apagada && !m._optimista && (
                        <button onClick={() => setMsgReply(m)}
                          style={{ background: 'none', border: 'none', color: '#1B2D52', cursor: 'pointer', fontSize: 13, padding: '4px', alignSelf: 'center', opacity: 0, transition: 'opacity .15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#4C8DFF'}
                          onMouseLeave={e => e.currentTarget.style.color = '#1B2D52'}>↩</button>
                      )}
                    </div>
                  </div>
                )
              })}
              {outroTyping && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <Avatar foto={conversa.outraFoto} nome={conversa.outroNome} size={24} />
                  <div style={{ background: '#101F40', borderRadius: '12px 12px 12px 4px', padding: '8px 12px', display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#475569', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={fimRef} />
            </div>

            {/* Reply preview */}
            {msgReply && (
              <div style={{ padding: '6px 12px', background: 'rgba(76,141,255,.06)', borderTop: '1px solid rgba(76,141,255,.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, fontSize: 11, color: '#7A8699', borderLeft: '2px solid #4C8DFF', paddingLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  ↩ {msgReply.conteudo.slice(0, 80)}
                </div>
                <button onClick={() => setMsgReply(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #1B2D52', display: 'flex', gap: 8, alignItems: 'center', background: '#070F1D' }}>
              <input ref={inputRef} className="input" placeholder="Escreve uma mensagem..."
                value={texto} onChange={e => { setTexto(e.target.value); enviarTyping() }}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
                style={{ flex: 1, fontSize: 13, borderRadius: 20, padding: '8px 14px' }} />
              <button className="btn btn-primary" onClick={() => enviar()} disabled={!texto.trim() || enviando}
                style={{ borderRadius: '50%', width: 38, height: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {enviando ? <Spinner /> : '➤'}
              </button>
            </div>
          </div>
        ) : !novaConversa && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#070F1D', borderRadius: 12, border: '1px solid #1B2D52' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Mensagens directas</div>
            <div style={{ fontSize: 12, color: '#7A8699', marginBottom: 16, textAlign: 'center', maxWidth: 240 }}>Selecciona uma conversa ou inicia uma nova</div>
            <button className="btn btn-primary" onClick={() => setNovaConversa(true)}>+ Nova conversa</button>
          </div>
        )}
      </div>

      {/* Modal info conversa */}
      <Modal open={modalInfo} onClose={() => setModalInfo(false)} title="ℹ️ Info da conversa">
        {conversa && (
          <div style={{ textAlign: 'center' }}>
            <Avatar foto={conversa.outraFoto} nome={conversa.outroNome} size={72} verificado={conversa.outroPerfil?.verificado} />
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>{conversa.outroNome}</div>
            {conversa.outroPerfil?.localidade && <div style={{ fontSize: 12, color: '#7A8699', marginTop: 4 }}>📍 {conversa.outroPerfil.localidade}</div>}
            {conversa.outroPerfil?.bio && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>{conversa.outroPerfil.bio}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setModalInfo(false); arquivar(conversa.id) }}>📦 Arquivar</button>
              <button className="btn btn-secondary btn-sm" style={{ color: '#f87171' }} onClick={() => { setModalInfo(false); const oId = conversa.user_a === uid ? conversa.user_b : conversa.user_a; bloquear(oId) }}>🚫 Bloquear</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal partilhar pombo */}
      <Modal open={modalPombo} onClose={() => setModalPombo(false)} title="🕊️ Partilhar pombo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pombos.length === 0
            ? <EmptyState icon="🕊️" title="Sem pombos" desc="Adiciona pombos no módulo Pombos" />
            : pombos.map(p => (
              <div key={p.id} onClick={() => partilharPombo(p)}
                style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,.04)', borderRadius: 8, cursor: 'pointer', border: '1px solid #1B2D52' }}
                onMouseEnter={e => e.currentTarget.style.background = '#101F40'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}>
                {p.foto_url ? <img src={p.foto_url} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1E5FD9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🕊️</div>}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: '#7A8699' }}>{p.anilha} · {p.percentil || 0}% percentil</div>
                </div>
                <span style={{ color: '#4C8DFF', fontSize: 14 }}>→</span>
              </div>
            ))}
        </div>
      </Modal>

      {/* Modal apagar mensagem */}
      <Modal open={!!msgApagar} onClose={() => setMsgApagar(null)} title="🗑️ Apagar mensagem">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>"{msgApagar?.conteudo?.slice(0, 80)}"</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => apagarMsg(msgApagar, false)}>Apagar para mim</button>
            {msgApagar?.user_id === uid && (
              <button className="btn btn-secondary" style={{ color: '#f87171' }} onClick={() => apagarMsg(msgApagar, true)}>Apagar para todos</button>
            )}
          </div>
        </div>
      </Modal>

      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }`}</style>
    </div>
  )
}
