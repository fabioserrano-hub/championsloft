import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, Field, EmptyState, Badge } from '../components/ui'
import { BotaoQR } from '../components/QRCode'

const ESP_ICON = { velocidade:'⚡', 'meio-fundo':'🏃', fundo:'🏔️', 'grande-fundo':'🌍' }

function TempoRestante({ fim }) {
  const [resto, setResto] = useState('')
  useEffect(() => {
    const calc = () => {
      const diff = new Date(fim) - new Date()
      if (diff <= 0) { setResto('Terminado'); return }
      const d = Math.floor(diff/86400000)
      const h = Math.floor((diff%86400000)/3600000)
      const m = Math.floor((diff%3600000)/60000)
      setResto(d>0?`${d}d ${h}h`:h>0?`${h}h ${m}m`:`${m}m`)
    }
    calc()
    const t = setInterval(calc, 30000)
    return () => clearInterval(t)
  }, [fim])
  const diff = new Date(fim) - new Date()
  const urgente = diff > 0 && diff < 3600000
  return <span style={{ color: diff<=0?'#475569':urgente?'#f87171':'#2DD4A7', fontWeight:700 }}>{diff<=0?'⏰ Terminado':`⏱️ ${resto}`}</span>
}

const EMPTY = { nome:'', anilha:'', sexo:'M', cor:'', esp:[], provas:0, percentil:0, leilao_min:'', descricao:'', foto_url:'', duracao:'3' }

export default function Leiloes({ nav }) {
  const { user } = useAuth()
  const toast = useToast()
  const [leiloes, setLeiloes] = useState([])
  const [meusLeiloes, setMeusLeiloes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ativos')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [licitando, setLicitando] = useState(null)
  const [valorLicitacao, setValorLicitacao] = useState('')
  const [licitacoes, setLicitacoes] = useState({})
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const agora = new Date().toISOString()
      const [{ data: ativos }, { data: meus }] = await Promise.all([
        supabase.from('marketplace').select('*').eq('tipo','leilao').gt('leilao_fim', agora).order('leilao_fim'),
        supabase.from('marketplace').select('*').eq('tipo','leilao').eq('user_id', user?.id).order('created_at', { ascending:false }),
      ])
      setLeiloes(ativos||[]); setMeusLeiloes(meus||[])
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const carregarLicitacoes = async (anuncioId) => {
    const { data } = await supabase.from('leilao_licitacoes').select('*').eq('anuncio_id', anuncioId).order('valor', { ascending:false }).limit(5)
    setLicitacoes(l => ({ ...l, [anuncioId]: data||[] }))
  }

  const licitar = async (leilao) => {
    const val = parseFloat(valorLicitacao)
    if (!val || val <= (leilao.leilao_atual || leilao.leilao_min)) {
      toast(`Lance mínimo: ${Math.max(leilao.leilao_atual||0, leilao.leilao_min)+1}€`, 'warn'); return
    }
    try {
      await supabase.from('leilao_licitacoes').insert({ anuncio_id: leilao.id, user_id: user?.id, nome_licitante: user?.user_metadata?.nome || user?.email, valor: val })
      await supabase.from('marketplace').update({ leilao_atual: val, leilao_licitacoes: (leilao.leilao_licitacoes||0)+1 }).eq('id', leilao.id)
      toast(`Lance de ${val}€ registado!`, 'ok')
      setLicitando(null); setValorLicitacao(''); load()
      carregarLicitacoes(leilao.id)
    } catch(e) { toast('Erro: '+e.message,'err') }
  }

  const criarLeilao = async () => {
    if (!form.nome.trim()||!form.leilao_min) { toast('Nome e lance mínimo obrigatórios','warn'); return }
    setSaving(true)
    try {
      const fim = new Date(Date.now() + parseInt(form.duracao)*24*3600000).toISOString()
      await supabase.from('marketplace').insert({
        ...form, user_id: user?.id, tipo:'leilao',
        leilao_fin: fim, leilao_fim: fim,
        leilao_min: parseFloat(form.leilao_min)||0,
        leilao_atual: parseFloat(form.leilao_min)||0,
        preco: parseFloat(form.leilao_min)||0,
        estado: 'disponivel',
        autor_nome: user?.user_metadata?.nome || user?.email,
        provas: parseInt(form.provas)||0,
        percentil: parseFloat(form.percentil)||0,
        descricao: form.descricao,
      })
      toast('Leilão criado!','ok'); setModal(false); setForm(EMPTY); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.25)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#D4AF37', fontFamily:"'Fraunces',serif" }}>🔨 Leilões</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>{leiloes.length} leilão(ões) activo(s)</div>
          </div>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Leiloar</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#0A1628', borderRadius:10, padding:3, marginBottom:14 }}>
        {[['ativos','🔨 Activos'],['meus','📋 Os meus']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'linear-gradient(135deg,#B8960C,#D4AF37)':'none', color:tab===t?'#050D1A':'#475569' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner lg /></div>
        : tab==='ativos' ? (
          leiloes.length===0
            ? <EmptyState icon="🔨" title="Sem leilões activos" desc="Sê o primeiro a leiloar um pombo!" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>+ Criar leilão</button>} />
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {leiloes.map(l => {
                  const minLance = Math.max(l.leilao_atual||0, l.leilao_min||0) + 1
                  const aberto = licitando?.id === l.id
                  return (
                    <div key={l.id} className="card card-p" style={{ borderLeft:'3px solid #D4AF37' }}>
                      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                        <div style={{ width:56, height:56, borderRadius:10, background:'#101F40', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
                          {l.foto_url ? <img src={l.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '🐦'}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:2 }}>{l.nome}</div>
                          <div style={{ fontSize:11, color:'#7A8699', marginBottom:4 }}>
                            {l.anilha && <span style={{ fontFamily:"'Space Mono',monospace", color:'#2DD4A7' }}>{l.anilha} · </span>}
                            {l.sexo==='M'?'♂':'♀'} · {(l.esp||[]).map(e=>ESP_ICON[e]||'').join(' ')}
                            {l.provas>0 && ` · ${l.provas} provas · ${l.percentil}%`}
                          </div>
                          {l.descricao && <div style={{ fontSize:11, color:'#7A8699' }}>{l.descricao.slice(0,80)}{l.descricao.length>80?'...':''}</div>}
                          <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Por: {l.autor_nome}</div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:9, color:'#7A8699' }}>Lance actual</div>
                          <div style={{ fontSize:20, fontWeight:900, color:'#D4AF37', fontFamily:"'Fraunces',serif" }}>{(l.leilao_atual||l.leilao_min||0).toFixed(0)}€</div>
                          <div style={{ fontSize:10, color:'#7A8699' }}>{l.leilao_licitacoes||0} lance(s)</div>
                        </div>
                      </div>

                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, paddingTop:10, borderTop:'1px solid #0d1b2e' }}>
                        <TempoRestante fim={l.leilao_fim} />
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { carregarLicitacoes(l.id); setLicitando(aberto?null:l); setValorLicitacao(String(minLance)) }}>
                            {aberto?'Fechar':'Ver lances'}
                          </button>
                          {l.user_id !== user?.id && (
                            <button className="btn btn-primary btn-sm" onClick={() => { setLicitando(l); setValorLicitacao(String(minLance)); carregarLicitacoes(l.id) }}>
                              🔨 Licitar
                            </button>
                          )}
                          <BotaoQR titulo={`Leilão — ${l.nome}`} conteudo={`${window.location.origin}?leilao=${l.id}`} subtitulo={`Lance actual: ${l.leilao_atual||l.leilao_min}€`} />
                        </div>
                      </div>

                      {/* Painel licitação expandido */}
                      {aberto && (
                        <div style={{ marginTop:12, padding:'12px', background:'#070F1D', borderRadius:10 }}>
                          {/* Últimos lances */}
                          {(licitacoes[l.id]||[]).length > 0 && (
                            <div style={{ marginBottom:10 }}>
                              <div style={{ fontSize:11, fontWeight:600, color:'#D4AF37', marginBottom:6 }}>Últimos lances</div>
                              {(licitacoes[l.id]||[]).map((lc,i) => (
                                <div key={lc.id} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'3px 0', borderBottom:'1px solid #0d1b2e' }}>
                                  <span style={{ color:i===0?'#D4AF37':'#94a3b8' }}>{i===0?'🥇 ':''}{lc.nome_licitante}</span>
                                  <span style={{ color:i===0?'#D4AF37':'#94a3b8', fontWeight:i===0?700:400 }}>{lc.valor}€</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {l.user_id !== user?.id && (
                            <div style={{ display:'flex', gap:8 }}>
                              <input className="input" type="number" value={valorLicitacao} onChange={e=>setValorLicitacao(e.target.value)} placeholder={`Mín. ${minLance}€`} style={{ flex:1 }} />
                              <button className="btn btn-primary" onClick={() => licitar(l)}>🔨 Licitar</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
        ) : (
          meusLeiloes.length===0
            ? <EmptyState icon="🔨" title="Sem leilões" desc="Cria o teu primeiro leilão" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>+ Leiloar pombo</button>} />
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {meusLeiloes.map(l => {
                  const activo = new Date(l.leilao_fim) > new Date()
                  return (
                    <div key={l.id} className="card card-p">
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <div style={{ fontSize:24 }}>🐦</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{l.nome}</div>
                          <div style={{ fontSize:11, color:'#7A8699' }}>
                            Lance actual: <strong style={{ color:'#D4AF37' }}>{(l.leilao_atual||l.leilao_min||0)}€</strong> · {l.leilao_licitacoes||0} lance(s)
                          </div>
                        </div>
                        <div>
                          {activo ? <TempoRestante fim={l.leilao_fim} /> : <span style={{ fontSize:11, color:'#475569' }}>⏰ Terminado</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
        )
      }

      {/* Modal criar leilão */}
      <Modal open={modal} onClose={()=>{setModal(false);setForm(EMPTY)}} title="🔨 Criar Leilão" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={criarLeilao} disabled={saving}>{saving?<Spinner/>:null}Publicar Leilão</button></>}>
        <div style={{ marginBottom:12, padding:'10px 12px', background:'rgba(212,175,55,.06)', border:'1px solid rgba(212,175,55,.15)', borderRadius:8, fontSize:12, color:'#94a3b8' }}>
          O leilão termina automaticamente após a duração definida. O lance mais alto vence.
        </div>
        <div className="form-grid">
          <div className="col-2"><Field label="Nome do pombo *"><input className="input" value={form.nome} onChange={e=>sf('nome',e.target.value)} /></Field></div>
          <Field label="Anilha"><input className="input" value={form.anilha} onChange={e=>sf('anilha',e.target.value)} /></Field>
          <Field label="Sexo"><select className="input" value={form.sexo} onChange={e=>sf('sexo',e.target.value)}><option value="M">♂ Macho</option><option value="F">♀ Fêmea</option></select></Field>
          <Field label="Lance mínimo (€) *"><input className="input" type="number" value={form.leilao_min} onChange={e=>sf('leilao_min',e.target.value)} placeholder="Ex: 50" /></Field>
          <Field label="Duração"><select className="input" value={form.duracao} onChange={e=>sf('duracao',e.target.value)}>
            <option value="1">1 dia</option><option value="3">3 dias</option><option value="5">5 dias</option><option value="7">7 dias</option>
          </select></Field>
          <Field label="Provas"><input className="input" type="number" value={form.provas} onChange={e=>sf('provas',e.target.value)} /></Field>
          <Field label="Percentil (%)"><input className="input" type="number" value={form.percentil} onChange={e=>sf('percentil',e.target.value)} /></Field>
          <Field label="URL Foto"><input className="input" value={form.foto_url} onChange={e=>sf('foto_url',e.target.value)} placeholder="https://..." /></Field>
          <div className="col-2"><Field label="Descrição"><textarea className="input" rows={2} style={{resize:'none'}} value={form.descricao} onChange={e=>sf('descricao',e.target.value)} /></Field></div>
        </div>
      </Modal>
    </div>
  )
}
