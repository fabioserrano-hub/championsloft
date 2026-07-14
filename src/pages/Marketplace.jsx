import { useState, useEffect, useCallback } from 'react'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIdioma } from '../hooks/useIdioma'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'
import { useToast, Spinner, Modal, Field, EmptyState, Badge } from '../components/ui'
import { BotaoQR } from '../components/QRCode'

const ESP_ICON = { velocidade:'⚡', 'meio-fundo':'🏃', fundo:'🏔️', 'grande-fundo':'🌍' }
const ESTADOS = ['disponivel','reservado','vendido']
const ESTADO_COR = { disponivel:'green', reservado:'yellow', vendido:'gray' }

const EMPTY = { nome:'', anilha:'', sexo:'M', cor:'', linhagem:'', esp:[], provas:0, percentil:0, preco:'', desc:'', foto_url:'', estado:'disponivel', pombal_id:'' }

export default function Marketplace({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useIdioma()
  const { temBase, temPro, temElite } = useLicenca()
  const [anuncios, setAnuncios] = useState([])
  const [meusAnuncios, setMeusAnuncios] = useState([])
  const [pombos, setPombos] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('explorar')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filtroEsp, setFiltroEsp] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [modalContacto, setModalContacto] = useState(null)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const uid = user?.id
      const [{ data:all }, { data:meus }, p, pf] = await Promise.all([
        supabase.from('marketplace').select('*').eq('estado','disponivel').order('created_at',{ascending:false}),
        supabase.from('marketplace').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
        db.getPombos(),
        db.getPerfil(),
      ])
      setAnuncios(all||[]); setMeusAnuncios(meus||[])
      setPombos(p); setPerfil(pf)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const preencherDoPombo = (id) => {
    const p = pombos.find(x=>x.id===id)
    if (!p) return
    sf('nome',p.nome||''); sf('anilha',p.anilha||''); sf('sexo',p.sexo||'M')
    sf('cor',p.cor||''); sf('linhagem',p.linhagem||''); sf('esp',p.esp||[])
    sf('provas',p.provas||0); sf('percentil',p.percentil||0); sf('foto_url',p.foto_url||'')
  }

  const publicar = async () => {
    if (!form.nome.trim()||!form.preco) { toast('Nome e preço obrigatórios','warn'); return }
    setSaving(true)
    try {
      await supabase.from('marketplace').insert({
        ...form, user_id:user?.id,
        autor_nome: perfil?.nome||user?.email,
        autor_foto: perfil?.foto_perfil_url||'',
        autor_org: perfil?.org||'',
        preco: parseFloat(form.preco)||0,
        provas: parseInt(form.provas)||0,
        percentil: parseFloat(form.percentil)||0,
      })
      toast('Anúncio publicado!','ok'); setModal(false); setForm(EMPTY); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const actualizarEstado = async (id, estado) => {
    await supabase.from('marketplace').update({ estado }).eq('id',id)
    load()
    toast(`Marcado como ${estado}`,'ok')
  }

  const filtrados = anuncios.filter(a =>
    (!filtroEsp || a.esp?.includes(filtroEsp)) &&
    (!filtroBusca || a.nome?.toLowerCase().includes(filtroBusca.toLowerCase()) || a.linhagem?.toLowerCase().includes(filtroBusca.toLowerCase()))
  )

  // Verificar plano
  const temAcesso = temPro
  if (!temAcesso) return <BloqueioPlano plano="pro" nav={nav} />

  return (
    <div>
      <GuiaAuto modulo="marketplace"/>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(45,212,167,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#2DD4A7,#4C8DFF)' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>🛒 Marketplace</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>{anuncios.length} pombos disponíveis</div>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <BotaoGuia modulo="marketplace"/>
            <button className="btn btn-primary" onClick={()=>setModal(true)}>+ Anunciar</button>
          </div>
        </div>
        {/* Stats */}
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          {[['🐦',anuncios.length,'Disponíveis'],['🔒',anuncios.filter(a=>a.estado==='reservado').length,'Reservados'],['✅',0,'Vendidos este mês']].map(([i,v,l])=>(
            <div key={l} style={{ flex:1, textAlign:'center', padding:'6px', background:'rgba(255,255,255,.04)', borderRadius:8 }}>
              <div style={{ fontSize:11 }}>{i} <strong style={{ color:'#fff' }}>{v}</strong></div>
              <div style={{ fontSize:9, color:'#475569' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14 }}>
        {[['explorar','🔍 Explorar'],['meus','📋 Os meus anúncios']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:'none', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:tab===t?700:500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', border:tab===t?'none':'1px solid rgba(255,255,255,.08)', background:tab===t?'linear-gradient(135deg,#1E5FD9,#1456C0)':'rgba(255,255,255,.05)', color:tab===t?'#fff':'#cbd5e1', boxShadow:tab===t?'0 2px 8px rgba(0,0,0,.3)':'none', transform:tab===t?'translateY(-1px)':'none', transition:'all .15s', minHeight:40 }}>{l}</button>
        ))}
      </div>

      {/* Filtros */}
      {tab==='explorar' && (
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input className="input" placeholder="🔍 Nome ou linhagem..." value={filtroBusca} onChange={e=>setFiltroBusca(e.target.value)} style={{ flex:1, fontSize:13 }} />
          <select className="input" value={filtroEsp} onChange={e=>setFiltroEsp(e.target.value)} style={{ width:140 }}>
            <option value="">Todas esp.</option>
            {['velocidade','meio-fundo','fundo','grande-fundo'].map(e=><option key={e} value={e}>{ESP_ICON[e]} {e}</option>)}
          </select>
        </div>
      )}

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner lg /></div>
        : tab==='explorar' ? (
          filtrados.length===0
            ? <EmptyState icon="🛒" title="Sem anúncios" desc="Ainda não há pombos à venda. Sê o primeiro a anunciar!" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>+ Anunciar pombo</button>} />
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {filtrados.map(a => (
                  <div key={a.id} className="card card-p" style={{ borderLeft:'3px solid #2DD4A7' }}>
                    <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                      {/* Foto */}
                      <div style={{ width:64, height:64, borderRadius:10, background:'#101F40', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
                        {a.foto_url ? <img src={a.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '🐦'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                          <span style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{a.nome}</span>
                          {a.sexo==='M' ? <span style={{ fontSize:11, color:'#4C8DFF' }}>♂ Macho</span> : <span style={{ fontSize:11, color:'#f87171' }}>♀ Fêmea</span>}
                          {(a.esp||[]).map(e=><span key={e} style={{ fontSize:10, color:'#D4AF37' }}>{ESP_ICON[e]||''} {e}</span>)}
                        </div>
                        <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>
                          {a.anilha && <span style={{ fontFamily:"'Space Mono',monospace", color:'#2DD4A7' }}>{a.anilha} · </span>}
                          {a.cor && <span>{a.cor} · </span>}
                          {a.linhagem && <span>{a.linhagem}</span>}
                        </div>
                        {(a.provas>0||a.percentil>0) && (
                          <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>
                            {a.provas>0 && `🏆 ${a.provas} provas`}
                            {a.percentil>0 && ` · 📊 percentil ${a.percentil}%`}
                          </div>
                        )}
                        {a.desc && <div style={{ fontSize:11, color:'#7A8699', marginTop:4 }}>{a.desc}</div>}
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Por: <strong style={{ color:'#fff' }}>{a.autor_nome}</strong>{a.autor_org?` · ${a.autor_org}`:''}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:20, fontWeight:900, color:'#2DD4A7', fontFamily:"'Fraunces',serif" }}>{parseFloat(a.preco||0).toFixed(0)}€</div>
                        <Badge v={ESTADO_COR[a.estado]}>{a.estado}</Badge>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:10 }}>
                      <button className="btn btn-primary btn-sm" style={{ flex:1 }} onClick={()=>setModalContacto(a)}>💬 Contactar</button>
                      <button className="btn btn-secondary btn-sm" onClick={()=>nav?.('pedigree')}>🌳 Pedigree</button>
                      <BotaoQR titulo={`${a.nome} — Marketplace`} conteudo={`${window.location.origin}?anuncio=${a.id}`} subtitulo={`${a.preco}€ · ${a.autor_nome}`} />
                    </div>
                  </div>
                ))}
              </div>
        ) : (
          meusAnuncios.length===0
            ? <EmptyState icon="📋" title="Sem anúncios" desc="Ainda não anunciaste nenhum pombo" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>+ Anunciar</button>} />
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {meusAnuncios.map(a => (
                  <div key={a.id} className="card card-p">
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <div style={{ fontSize:24 }}>🐦</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{a.nome} <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#2DD4A7' }}>{a.anilha}</span></div>
                        <div style={{ fontSize:11, color:'#7A8699' }}>{a.preco}€ · {new Date(a.created_at).toLocaleDateString('pt-PT')}</div>
                      </div>
                      <Badge v={ESTADO_COR[a.estado]}>{a.estado}</Badge>
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:8 }}>
                      {a.estado==='disponivel' && <button className="btn btn-secondary btn-sm" onClick={()=>actualizarEstado(a.id,'reservado')}>🔒 Reservar</button>}
                      {a.estado==='reservado' && <button className="btn btn-secondary btn-sm" onClick={()=>actualizarEstado(a.id,'vendido')}>✅ Marcar vendido</button>}
                      <button className="btn btn-icon btn-sm" onClick={async()=>{ await supabase.from('marketplace').delete().eq('id',a.id); load() }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
        )
      }

      {/* Modal publicar */}
      <Modal open={modal} onClose={()=>{setModal(false);setForm(EMPTY)}} title="🐦 Anunciar Pombo" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={publicar} disabled={saving}>{saving?<Spinner/>:null}Publicar</button></>}>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, color:'#7A8699', display:'block', marginBottom:4 }}>Preencher a partir do efectivo</label>
          <select className="input" onChange={e=>preencherDoPombo(e.target.value)} defaultValue="">
            <option value="">— Seleccionar pombo —</option>
            {pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio').map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}
          </select>
        </div>
        <div className="form-grid">
          <Field label="Nome *"><input className="input" value={form.nome} onChange={e=>sf('nome',e.target.value)} /></Field>
          <Field label="Anilha"><input className="input" value={form.anilha} onChange={e=>sf('anilha',e.target.value)} placeholder="PT-2024-00001" /></Field>
          <Field label="Sexo"><select className="input" value={form.sexo} onChange={e=>sf('sexo',e.target.value)}><option value="M">♂ Macho</option><option value="F">♀ Fêmea</option></select></Field>
          <Field label="Cor"><input className="input" value={form.cor} onChange={e=>sf('cor',e.target.value)} /></Field>
          <Field label="Linhagem"><input className="input" value={form.linhagem} onChange={e=>sf('linhagem',e.target.value)} /></Field>
          <Field label="Preço (€) *"><input className="input" type="number" value={form.preco} onChange={e=>sf('preco',e.target.value)} /></Field>
          <Field label="Provas"><input className="input" type="number" value={form.provas} onChange={e=>sf('provas',e.target.value)} /></Field>
          <Field label="Percentil (%)"><input className="input" type="number" value={form.percentil} onChange={e=>sf('percentil',e.target.value)} /></Field>
          <Field label="URL Foto"><input className="input" value={form.foto_url} onChange={e=>sf('foto_url',e.target.value)} placeholder="https://..." /></Field>
          <div className="col-2"><Field label="Descrição"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.desc} onChange={e=>sf('desc',e.target.value)} /></Field></div>
        </div>
      </Modal>

      {/* Modal contacto */}
      <Modal open={!!modalContacto} onClose={()=>setModalContacto(null)} title="💬 Contactar Vendedor">
        {modalContacto && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🐦</div>
            <div style={{ fontSize:16, fontWeight:700, color:'#fff', marginBottom:4 }}>{modalContacto.nome}</div>
            <div style={{ fontSize:20, color:'#2DD4A7', fontWeight:700, marginBottom:16 }}>{modalContacto.preco}€</div>
            <div style={{ fontSize:13, color:'#94a3b8', marginBottom:16 }}>Vendedor: <strong style={{ color:'#fff' }}>{modalContacto.autor_nome}</strong></div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button className="btn btn-primary" onClick={()=>{
                const txt = `Olá ${modalContacto.autor_nome}, tenho interesse no ${modalContacto.nome} (${modalContacto.anilha}) anunciado no Fly2Win por ${modalContacto.preco}€.`
                navigator.share ? navigator.share({ text:txt }) : navigator.clipboard?.writeText(txt).then(()=>toast('Contacto copiado!','ok'))
                setModalContacto(null)
              }}>🔗 Copiar mensagem</button>
              <button className="btn btn-secondary" onClick={()=>setModalContacto(null)}>Fechar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
