import { useState, useEffect, useCallback } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, EmptyState } from '../components/ui'
import { BotaoWhatsApp } from '../components/Partilha'

const ESPECIALIDADES = [
  { id:'todas',      icon:'🌐', label:'Todas' },
  { id:'velocidade', icon:'⚡', label:'Velocidade' },
  { id:'meio_fundo', icon:'🏃', label:'Meio-Fundo' },
  { id:'fundo',      icon:'🏔️', label:'Fundo' },
  { id:'grande_fundo',icon:'🌍', label:'Grande Fundo' },
]

const EMBLEMAS = ['🕊️','🦅','🔥','⚡','🏆','👑','🎯','💎','🌟','🦁','🐉','⚔️','🛡️','🌊','🏔️','🌍']

const FORM_INICIAL = { nome:'', descricao:'', emblema:'🕊️', especialidade:'todas', regiao:'', pais:'PT', acesso:'codigo', max_membros:50 }

// ─── DETALHE DO CLUBE ─────────────────────────────────
function DetalheClubePersonalizado({ clube, user, onVoltar, toast }) {
  const [membros, setMembros] = useState([])
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ranking')
  const [confirmSair, setConfirmSair] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('clube_membros').select('*').eq('clube_id', clube.id),
    ]).then(async ([{ data: m }]) => {
      const membrosData = m || []
      setMembros(membrosData)

      // Calcular ranking — buscar provas de cada membro
      const rankingData = await Promise.all(membrosData.map(async membro => {
        const { data: provas } = await supabase
          .from('races')
          .select('percentil,posicao_geral,tipo,dist')
          .eq('user_id', membro.user_id)
          .not('percentil', 'is', null)
          .order('percentil', { ascending: false })
          .limit(20)

        const p = provas || []
        const mediaPercentil = p.length ? Math.round(p.reduce((s,x)=>s+(x.percentil||0),0)/p.length) : 0
        const vitorias = p.filter(x=>x.posicao_geral===1).length
        const melhores5 = p.slice(0,5).map(x=>Math.round(x.percentil||0))

        return { ...membro, mediaPercentil, vitorias, nProvas: p.length, melhores5 }
      }))

      setRanking(rankingData.sort((a,b) => b.mediaPercentil - a.mediaPercentil))
    }).finally(() => setLoading(false))
  }, [clube.id])

  const euMembro = membros.find(m => m.user_id === user?.id)
  const euAdmin = clube.creator_id === user?.id || euMembro?.role === 'admin'
  const minhaPos = ranking.findIndex(m => m.user_id === user?.id) + 1
  const mediaClube = ranking.length ? Math.round(ranking.reduce((s,m)=>s+m.mediaPercentil,0)/ranking.length) : 0
  const totalVitorias = ranking.reduce((s,m)=>s+m.vitorias,0)

  const linkConvite = `Junta-te ao clube "${clube.nome}" no ChampionsLoft!\nCódigo: *${clube.invite_code}*\n🔗 ${window.location.origin}`

  return (
    <div>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,#050D1A,#0B1830)`, border:'1px solid rgba(76,141,255,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#4C8DFF,#2DD4A7,#D4AF37)' }}/>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ fontSize:40, lineHeight:1, flexShrink:0 }}>{clube.emblema}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>{clube.nome}</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>
              {clube.regiao && <span>{clube.regiao} · </span>}
              {ESPECIALIDADES.find(e=>e.id===clube.especialidade)?.label}
              {euAdmin && <span style={{ color:'#D4AF37' }}> · 👑 Admin</span>}
            </div>
            {clube.descricao && <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, lineHeight:1.5 }}>{clube.descricao}</div>}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onVoltar}>← Voltar</button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:14 }}>
          {[
            [membros.length, '👥', 'Membros', '#4C8DFF'],
            [mediaClube+'%', '📊', 'Média clube', '#D4AF37'],
            [totalVitorias, '🏆', 'Vitórias', '#2DD4A7'],
            [minhaPos > 0 ? minhaPos+'º' : '—', '🎯', 'A minha pos.', '#A855F7'],
          ].map(([v,i,l,c]) => (
            <div key={l} style={{ textAlign:'center', padding:'8px 4px', background:'rgba(255,255,255,.04)', borderRadius:8 }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:c, lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:9, color:'#7A8699', marginTop:2 }}>{i} {l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Acções */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <BotaoWhatsApp texto={linkConvite} label="Convidar"/>
        <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard?.writeText(clube.invite_code); toast('Código copiado!','ok') }}>
          📋 Código: <strong style={{ fontFamily:"'Space Mono',monospace", color:'#D4AF37' }}>{clube.invite_code}</strong>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14 }}>
        {[['ranking','🏆 Ranking'],['membros','👥 Membros']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'linear-gradient(135deg,#4C8DFF,#2563EB)':'none', color:tab===t?'#fff':'#475569' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner lg/></div>
      : tab === 'ranking' ? (
        ranking.length === 0
          ? <EmptyState icon="🏆" title="Sem dados ainda" desc="Os membros precisam de ter provas registadas com percentil"/>
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 60px 50px', gap:8, padding:'4px 12px', fontSize:10, color:'#475569', fontWeight:600, letterSpacing:'.05em', textTransform:'uppercase' }}>
                <span>#</span><span>Membro</span><span style={{textAlign:'right'}}>Percentil</span><span style={{textAlign:'center'}}>Provas</span>
              </div>
              {ranking.map((m, i) => {
                const euSou = m.user_id === user?.id
                const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':null
                return (
                  <div key={m.id} style={{
                    display:'grid', gridTemplateColumns:'28px 1fr 60px 50px', gap:8,
                    alignItems:'center', padding:'12px', borderRadius:10,
                    background: euSou?'rgba(76,141,255,.08)':'#0B1830',
                    border:`1px solid ${euSou?'rgba(76,141,255,.35)':i<3?'rgba(212,175,55,.1)':'#1B2D52'}`,
                  }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:900, color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569', textAlign:'center' }}>
                      {medal || i+1}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:euSou?'#7CB9FF':'#fff' }}>
                        {m.nome}{euSou?' (tu)':''}
                        {m.role==='admin'&&<span style={{ fontSize:9, color:'#D4AF37', marginLeft:4 }}>👑</span>}
                        {m.role==='capitao'&&<span style={{ fontSize:9, color:'#4C8DFF', marginLeft:4 }}>©</span>}
                      </div>
                      {m.vitorias > 0 && <div style={{ fontSize:10, color:'#D4AF37' }}>🏆 {m.vitorias} vitória(s)</div>}
                    </div>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:m.mediaPercentil>=80?'#2DD4A7':m.mediaPercentil>=60?'#D4AF37':'#94a3b8', textAlign:'right' }}>
                      {m.mediaPercentil}%
                    </div>
                    <div style={{ fontSize:11, color:'#475569', textAlign:'center' }}>{m.nProvas}</div>
                  </div>
                )
              })}
            </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {membros.map(m => (
            <div key={m.id} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px', background:'#0B1830', border:'1px solid #1B2D52', borderRadius:10 }}>
              <div style={{ width:36, height:36, borderRadius:99, background:'rgba(76,141,255,.1)', border:'1px solid rgba(76,141,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#4C8DFF', flexShrink:0 }}>
                {m.nome?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{m.nome}</div>
                <div style={{ fontSize:10, color:'#475569' }}>
                  {m.role==='admin'?'👑 Admin':m.role==='capitao'?'© Capitão':'Membro'}
                  {m.user_id===user?.id&&<span style={{ color:'#4C8DFF' }}> · Tu</span>}
                </div>
              </div>
              <div style={{ fontSize:10, color:'#475569' }}>{new Date(m.created_at).toLocaleDateString('pt-PT')}</div>
              {euAdmin && m.user_id !== user?.id && (
                <button className="btn btn-secondary btn-sm" style={{ fontSize:10 }} onClick={async () => {
                  await supabase.from('clube_membros').delete().eq('clube_id',clube.id).eq('user_id',m.user_id)
                  setMembros(prev=>prev.filter(x=>x.id!==m.id))
                  toast('Membro removido','ok')
                }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sair */}
      {!euAdmin && euMembro && (
        <div style={{ textAlign:'center', marginTop:20 }}>
          {!confirmSair
            ? <button className="btn btn-secondary btn-sm" onClick={()=>setConfirmSair(true)}>Sair do clube</button>
            : <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={()=>setConfirmSair(false)}>Cancelar</button>
                <button className="btn btn-danger btn-sm" onClick={async()=>{
                  await supabase.from('clube_membros').delete().eq('clube_id',clube.id).eq('user_id',user.id)
                  toast('Saiu do clube','ok'); onVoltar()
                }}>Confirmar saída</button>
              </div>
          }
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────
export default function ClubesPersonalizados({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const [clubes, setClubes] = useState([])
  const [loading, setLoading] = useState(true)
  const [clubeAberto, setClubeAberto] = useState(null)
  const [modal, setModal] = useState(null) // 'criar' | 'entrar'
  const [form, setForm] = useState(FORM_INICIAL)
  const [saving, setSaving] = useState(false)
  const [codigoEntrar, setCodigoEntrar] = useState('')
  const [nomeEntrar, setNomeEntrar] = useState('')
  const [tab, setTab] = useState('meus')
  const [clubesPublicos, setClubesPublicos] = useState([])
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: memberships }, { data: publicos }] = await Promise.all([
        supabase.from('clube_membros').select('*, clubes_personalizados(*)').eq('user_id', user?.id),
        supabase.from('clubes_personalizados').select('*, clube_membros(count)').eq('acesso','publico').eq('estado','ativo').limit(20),
      ])
      const meusClubes = (memberships||[]).map(m=>({...m.clubes_personalizados, meu_role:m.role})).filter(Boolean)
      setClubes(meusClubes)
      setClubesPublicos(publicos||[])
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const criar = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório','warn'); return }
    setSaving(true)
    try {
      const invite_code = Math.random().toString(36).slice(2,8).toUpperCase()
      const { data, error } = await supabase.from('clubes_personalizados').insert({
        ...form, creator_id: user?.id, invite_code,
        max_membros: parseInt(form.max_membros)||50,
      }).select().single()
      if (error) throw error
      await supabase.from('clube_membros').insert({ clube_id:data.id, user_id:user?.id, nome:user?.user_metadata?.nome||'Admin', role:'admin' })
      toast(`Clube "${data.nome}" criado! Código: ${data.invite_code}`,'ok')
      setModal(null); setForm(FORM_INICIAL); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const entrarPorCodigo = async () => {
    if (!codigoEntrar.trim()||!nomeEntrar.trim()) { toast('Preenche código e nome','warn'); return }
    setSaving(true)
    try {
      const { data:clube } = await supabase.from('clubes_personalizados').select('*').eq('invite_code',codigoEntrar.toUpperCase()).maybeSingle()
      if (!clube) { toast('Código inválido','err'); return }
      await supabase.from('clube_membros').insert({ clube_id:clube.id, user_id:user?.id, nome:nomeEntrar.trim(), role:'membro' })
      toast(`Bem-vindo ao clube "${clube.nome}"!`,'ok')
      setModal(null); setCodigoEntrar(''); setNomeEntrar(''); load()
    } catch(e) { toast(e.message?.includes('23505')?'Já és membro deste clube':'Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const entrarPublico = async (clube) => {
    try {
      await supabase.from('clube_membros').insert({ clube_id:clube.id, user_id:user?.id, nome:user?.user_metadata?.nome||'Membro', role:'membro' })
      toast(`Entraste no clube "${clube.nome}"!`,'ok'); load()
    } catch(e) { toast(e.message?.includes('23505')?'Já és membro':'Erro: '+e.message,'err') }
  }

  if (clubeAberto) return <DetalheClubePersonalizado clube={clubeAberto} user={user} onVoltar={()=>{setClubeAberto(null);load()}} toast={toast}/>

  const meusClubeIds = new Set(clubes.map(c=>c.id))

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#D4AF37,#A855F7,#4C8DFF)' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>🎽 Clubes</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>{clubes.length} clube(s) · compete com columbófilos de todo o lado</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setModal('entrar')}>🔑 Entrar</button>
            <button className="btn btn-primary btn-sm" onClick={()=>setModal('criar')}>+ Criar</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14 }}>
        {[['meus','🎽 Os meus'],['publicos','🌐 Clubes públicos']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'linear-gradient(135deg,#D4AF37,#B8960C)':'none', color:tab===t?'#050D1A':'#475569' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
      : tab === 'meus' ? (
        clubes.length === 0
          ? <EmptyState icon="🎽" title="Sem clubes" desc="Cria um clube ou entra por código de convite"
              action={<div style={{display:'flex',gap:8,justifyContent:'center'}}>
                <button className="btn btn-secondary" onClick={()=>setModal('entrar')}>🔑 Entrar por Código</button>
                <button className="btn btn-primary" onClick={()=>setModal('criar')}>+ Criar Clube</button>
              </div>}/>
          : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {clubes.map(c => (
                <div key={c.id} className="card card-p" style={{ cursor:'pointer', borderLeft:`3px solid ${c.meu_role==='admin'?'#D4AF37':'#4C8DFF'}` }} onClick={()=>setClubeAberto(c)}>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ fontSize:28, flexShrink:0 }}>{c.emblema}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{c.nome} {c.meu_role==='admin'&&'👑'}</div>
                      <div style={{ fontSize:11, color:'#7A8699' }}>
                        {c.regiao&&<span>{c.regiao} · </span>}
                        {ESPECIALIDADES.find(e=>e.id===c.especialidade)?.label}
                        <span style={{ fontFamily:"'Space Mono',monospace", color:'#475569', marginLeft:6 }}>{c.invite_code}</span>
                      </div>
                    </div>
                    <span style={{ color:'#475569' }}>→</span>
                  </div>
                </div>
              ))}
            </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {clubesPublicos.filter(c=>!meusClubeIds.has(c.id)).length === 0
            ? <EmptyState icon="🌐" title="Sem clubes públicos" desc="Cria um clube público para aparecer aqui"/>
            : clubesPublicos.filter(c=>!meusClubeIds.has(c.id)).map(c => (
                <div key={c.id} className="card card-p">
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ fontSize:28, flexShrink:0 }}>{c.emblema}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{c.nome}</div>
                      <div style={{ fontSize:11, color:'#7A8699' }}>
                        {c.regiao&&<span>{c.regiao} · </span>}
                        {ESPECIALIDADES.find(e=>e.id===c.especialidade)?.label}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={()=>entrarPublico(c)}>Entrar</button>
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* Modal Criar */}
      {modal === 'criar' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:560, maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #1B2D52', flexShrink:0 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff', fontFamily:"'Fraunces',serif" }}>🎽 Criar Clube</div>
              <button onClick={()=>setModal(null)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:14 }}>

              {/* Escolher emblema */}
              <div className="field">
                <label className="label">Emblema do clube</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {EMBLEMAS.map(e=>(
                    <button key={e} onClick={()=>sf('emblema',e)} style={{
                      width:40, height:40, borderRadius:8, fontSize:22, cursor:'pointer',
                      background:form.emblema===e?'rgba(212,175,55,.2)':'#101F40',
                      border:`2px solid ${form.emblema===e?'#D4AF37':'transparent'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>{e}</button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="col-2">
                  <div className="field"><label className="label">Nome do clube *</label><input className="input" placeholder="Ex: Velocistas do Norte" value={form.nome} onChange={e=>sf('nome',e.target.value)}/></div>
                </div>
                <div className="field"><label className="label">Região</label><input className="input" placeholder="Ex: Porto, Alentejo..." value={form.regiao} onChange={e=>sf('regiao',e.target.value)}/></div>
                <div className="field"><label className="label">Especialidade</label>
                  <select className="input" value={form.especialidade} onChange={e=>sf('especialidade',e.target.value)}>
                    {ESPECIALIDADES.map(e=><option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
                  </select>
                </div>
                <div className="field"><label className="label">Acesso</label>
                  <select className="input" value={form.acesso} onChange={e=>sf('acesso',e.target.value)}>
                    <option value="codigo">🔑 Por código</option>
                    <option value="publico">🌐 Público</option>
                  </select>
                </div>
                <div className="field"><label className="label">Máx. membros</label>
                  <input className="input" type="number" value={form.max_membros} onChange={e=>sf('max_membros',e.target.value)}/>
                </div>
                <div className="col-2">
                  <div className="field"><label className="label">Descrição</label><textarea className="input" rows={2} style={{resize:'none'}} value={form.descricao} onChange={e=>sf('descricao',e.target.value)} placeholder="Apresenta o teu clube..."/></div>
                </div>
              </div>
            </div>
            <div style={{ padding:'14px 20px', borderTop:'1px solid #1B2D52', display:'flex', justifyContent:'flex-end', gap:10, flexShrink:0, background:'#0B1830' }}>
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={criar} disabled={saving}>{saving?<Spinner/>:null}🎽 Criar Clube</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entrar */}
      {modal === 'entrar' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:480, padding:24 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:16, fontFamily:"'Fraunces',serif" }}>🔑 Entrar por Código</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="field"><label className="label">Código do clube</label>
                <input className="input" placeholder="Ex: A1B2C3" value={codigoEntrar} onChange={e=>setCodigoEntrar(e.target.value.toUpperCase())} style={{fontFamily:"'Space Mono',monospace",letterSpacing:'.1em'}}/>
              </div>
              <div className="field"><label className="label">O teu nome no clube</label>
                <input className="input" placeholder="Como queres aparecer no ranking" value={nomeEntrar} onChange={e=>setNomeEntrar(e.target.value)}/>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16 }}>
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={entrarPorCodigo} disabled={saving}>{saving?<Spinner/>:null}Entrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
