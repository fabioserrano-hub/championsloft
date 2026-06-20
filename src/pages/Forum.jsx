import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Field } from '../components/ui'

const CATEGORIAS = [
  { id: 'geral', label: 'Geral', icon: '💬', desc: 'Conversa livre sobre columbofilia' },
  { id: 'alimentacao', label: 'Alimentação', icon: '🌾', desc: 'Rações, cereais, suplementos' },
  { id: 'saude', label: 'Saúde', icon: '🏥', desc: 'Doenças, tratamentos, prevenção' },
  { id: 'reproducao', label: 'Reprodução', icon: '🥚', desc: 'Acasalamentos, pedigree, genética' },
  { id: 'provas', label: 'Provas & Treinos', icon: '🏆', desc: 'Resultados, estratégias, encestamento' },
  { id: 'genetica', label: 'Genética', icon: '🧬', desc: 'Linhagens, cruzamentos, seleção' },
  { id: 'equipamento', label: 'Equipamento', icon: '🔧', desc: 'Pombais, material, tecnologia' },
  { id: 'legislacao', label: 'Legislação', icon: '⚖️', desc: 'Normas, federação, registos' },
  { id: 'mercado', label: 'Compra & Venda', icon: '🤝', desc: 'Pombos, ovos, equipamento' },
]

const TOPICOS_SEED = [
  { categoria: 'alimentacao', titulo: 'Qual a melhor ração para época de provas?', autor_nome: 'Admin ChampionsLoft', conteudo: 'Partilhe a sua experiência com rações durante a época competitiva. Que marcas usa? Que resultados obteve?' },
  { categoria: 'saude', titulo: 'Como prevenir o Paramyxovirus na época de treinos?', autor_nome: 'Admin ChampionsLoft', conteudo: 'A vacinação é obrigatória por lei, mas quando é o melhor momento para vacinar? Partilhe as suas práticas.' },
  { categoria: 'provas', titulo: 'Dicas para o encestamento em provas de fundo', autor_nome: 'Admin ChampionsLoft', conteudo: 'Quantos dias antes? Que pombos seleccionar? Como preparar os pombos para provas de +500km?' },
  { categoria: 'genetica', titulo: 'Linhas Janssen em Portugal — experiências', autor_nome: 'Admin ChampionsLoft', conteudo: 'Os Janssen são das linhas mais usadas em Portugal. Partilhe a sua experiência com esta linha genética.' },
]

function TempoAtras({ ts }) {
  const d = (Date.now() - new Date(ts)) / 1000
  if (d < 60) return <span>{Math.round(d)}s atrás</span>
  if (d < 3600) return <span>{Math.round(d/60)}m atrás</span>
  if (d < 86400) return <span>{Math.round(d/3600)}h atrás</span>
  return <span>{Math.round(d/86400)}d atrás</span>
}

export default function Forum({ nav }) {
  const toast = useToast()
  const { user } = useAuth()
  const [vista, setVista] = useState('categorias') // categorias | lista | topico
  const [catActiva, setCatActiva] = useState(null)
  const [topicos, setTopicos] = useState([])
  const [topicoActivo, setTopicoActivo] = useState(null)
  const [respostas, setRespostas] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalNovo, setModalNovo] = useState(false)
  const [form, setForm] = useState({ titulo: '', categoria: 'geral', conteudo: '' })
  const [novaResp, setNovaResp] = useState('')
  const [saving, setSaving] = useState(false)
  const [tabelaOk, setTabelaOk] = useState(true)
  const [perfil, setPerfil] = useState(null)

  const nome = perfil?.nome || user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Columbófilo'

  useEffect(() => {
    db.getPerfil().then(p => setPerfil(p)).catch(() => {})
  }, [])

  const carregarTopicos = useCallback(async (catId) => {
    setLoading(true)
    try {
      const cat = catId && catId !== 'todos' ? catId : null
      // Usar categoria como texto mapeado
      const catLabel = cat ? CATEGORIAS.find(c => c.id === cat)?.label : null
      let q = window._supabase || null
      const { data, error } = await (async () => {
        const res = await db.getForumTopicos(catLabel)
        return { data: res, error: null }
      })().catch(e => ({ data: null, error: e }))
      if (error) { setTabelaOk(false); setTopicos([]); return }
      setTabelaOk(true); setTopicos(data || [])
    } catch(e) { setTabelaOk(false); setTopicos([]) }
    finally { setLoading(false) }
  }, [])

  const abrirCategoria = (cat) => {
    setCatActiva(cat)
    setVista('lista')
    carregarTopicos(cat.id)
  }

  const abrirTopico = async (t) => {
    setTopicoActivo(t); setVista('topico'); setLoading(true)
    try {
      const r = await db.getForumRespostas(t.id)
      setRespostas(r)
      db.incrementForumViews(t.id)
    } catch(e) { setRespostas([]) }
    finally { setLoading(false) }
  }

  const criarTopico = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) { toast('Preencha título e conteúdo', 'warn'); return }
    setSaving(true)
    try {
      const catLabel = CATEGORIAS.find(c => c.id === form.categoria)?.label || 'Geral'
      await db.createForumTopico({ titulo: form.titulo.trim(), conteudo: form.conteudo.trim(), categoria: catLabel, autor_nome: nome })
      toast('Tópico criado!', 'ok')
      setModalNovo(false); setForm({ titulo: '', categoria: 'geral', conteudo: '' })
      if (catActiva) carregarTopicos(catActiva.id)
      else { const cat = CATEGORIAS.find(c => c.label === catLabel); if (cat) abrirCategoria(cat) }
    } catch(e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const enviarResposta = async () => {
    if (!novaResp.trim()) return
    setSaving(true)
    try {
      const r = await db.createForumResposta({ topico_id: topicoActivo.id, autor_nome: nome, conteudo: novaResp.trim() })
      setRespostas(rs => [...rs, r]); setNovaResp('')
      setTopicoActivo(t => ({ ...t, respostas_count: (t.respostas_count || 0) + 1 }))
    } catch(e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const inicializarTopicos = async () => {
    setSaving(true)
    try {
      for (const t of TOPICOS_SEED) {
        await db.createForumTopico({ ...t, categoria: CATEGORIAS.find(c => c.id === t.categoria)?.label || t.categoria }).catch(() => {})
      }
      toast('Tópicos de exemplo criados!', 'ok')
      carregarTopicos(null)
    } catch(e) {} finally { setSaving(false) }
  }

  // Vista: Lista de categorias
  if (vista === 'categorias') return (
    <div>
      <div className="section-header">
        <div><div className="section-title">💬 Fórum</div><div className="section-sub">Comunidade ChampionsLoft</div></div>
        <button className="btn btn-primary" onClick={() => setModalNovo(true)}>＋ Novo Tópico</button>
      </div>

      {!tabelaOk && (
        <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'12px 16px', marginBottom:16, fontSize:12, color:'#f87171' }}>
          ⚠️ Tabelas do fórum não encontradas. Corra o <strong>forum_completo.sql</strong> no Supabase.
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
        {CATEGORIAS.map(cat => (
          <div key={cat.id} className="card card-p" style={{ cursor:'pointer' }} onClick={() => abrirCategoria(cat)}>
            <div style={{ fontSize:24, marginBottom:6 }}>{cat.icon}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:2 }}>{cat.label}</div>
            <div style={{ fontSize:11, color:'#7A8699' }}>{cat.desc}</div>
          </div>
        ))}
      </div>

      {tabelaOk && (
        <div style={{ textAlign:'center', marginTop:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={inicializarTopicos} disabled={saving}>
            {saving ? <Spinner /> : '🌱'} Criar tópicos de exemplo
          </button>
        </div>
      )}

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="＋ Novo Tópico"
        footer={<><button className="btn btn-secondary" onClick={() => setModalNovo(false)}>Cancelar</button><button className="btn btn-primary" onClick={criarTopico} disabled={saving}>{saving?<Spinner/>:null}Publicar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Field label="Categoria">
            <select className="input" value={form.categoria} onChange={e => setForm(f=>({...f,categoria:e.target.value}))}>
              {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </Field>
          <Field label="Título *"><input className="input" placeholder="Descreva o assunto..." value={form.titulo} onChange={e => setForm(f=>({...f,titulo:e.target.value}))} /></Field>
          <Field label="Conteúdo *"><textarea className="input" rows={6} style={{ resize:'none' }} placeholder="Partilhe a sua questão, experiência ou dica..." value={form.conteudo} onChange={e => setForm(f=>({...f,conteudo:e.target.value}))} /></Field>
        </div>
      </Modal>
    </div>
  )

  // Vista: Lista de tópicos de uma categoria
  if (vista === 'lista') return (
    <div>
      <div className="section-header">
        <div>
          <button onClick={() => setVista('categorias')} style={{ background:'none', border:'none', color:'#7A8699', cursor:'pointer', fontSize:12, padding:0, marginBottom:4 }}>← Fórum</button>
          <div className="section-title">{catActiva?.icon} {catActiva?.label}</div>
          <div className="section-sub">{catActiva?.desc}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(f=>({...f,categoria:catActiva?.id||'geral'})); setModalNovo(true) }}>＋ Novo Tópico</button>
      </div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner lg /></div>
        : topicos.length === 0
          ? <EmptyState icon={catActiva?.icon||'💬'} title="Sem tópicos ainda" desc="Seja o primeiro a iniciar uma discussão nesta área"
              action={<button className="btn btn-primary" onClick={() => { setForm(f=>({...f,categoria:catActiva?.id||'geral'})); setModalNovo(true) }}>＋ Novo Tópico</button>} />
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {topicos.map(t => (
                <div key={t.id} className="card card-p" style={{ cursor:'pointer' }} onClick={() => abrirTopico(t)}>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    {t.fixado && <span>📌</span>}
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:3 }}>{t.titulo}</div>
                      <div style={{ fontSize:11, color:'#7A8699' }}>{t.autor_nome} · <TempoAtras ts={t.created_at} /></div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.conteudo}</div>
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

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="＋ Novo Tópico"
        footer={<><button className="btn btn-secondary" onClick={() => setModalNovo(false)}>Cancelar</button><button className="btn btn-primary" onClick={criarTopico} disabled={saving}>{saving?<Spinner/>:null}Publicar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Field label="Categoria"><select className="input" value={form.categoria} onChange={e => setForm(f=>({...f,categoria:e.target.value}))}>{CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></Field>
          <Field label="Título *"><input className="input" placeholder="Descreva o assunto..." value={form.titulo} onChange={e => setForm(f=>({...f,titulo:e.target.value}))} /></Field>
          <Field label="Conteúdo *"><textarea className="input" rows={5} style={{ resize:'none' }} value={form.conteudo} onChange={e => setForm(f=>({...f,conteudo:e.target.value}))} /></Field>
        </div>
      </Modal>
    </div>
  )

  // Vista: Tópico aberto com respostas
  return (
    <div>
      <div style={{ marginBottom:12 }}>
        <button onClick={() => { setVista('lista'); carregarTopicos(catActiva?.id) }} style={{ background:'none', border:'none', color:'#7A8699', cursor:'pointer', fontSize:12, padding:0 }}>← {catActiva?.label}</button>
      </div>

      <div className="card card-p" style={{ marginBottom:12, borderLeft:'3px solid #4C8DFF' }}>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#1E5FD9,#4C8DFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
            {topicoActivo?.autor_nome?.[0]?.toUpperCase()||'?'}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'#4C8DFF' }}>{topicoActivo?.autor_nome}</div>
            <div style={{ fontSize:10, color:'#7A8699' }}><TempoAtras ts={topicoActivo?.created_at} /></div>
          </div>
        </div>
        <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:8 }}>{topicoActivo?.titulo}</div>
        <div style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.7 }}>{topicoActivo?.conteudo}</div>
      </div>

      <div style={{ fontSize:12, fontWeight:600, color:'#7A8699', marginBottom:8 }}>{respostas.length} resposta(s)</div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:30 }}><Spinner /></div>
        : <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {respostas.map(r => (
              <div key={r.id} style={{ display:'flex', gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#2DD4A7,#059669)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0, marginTop:2 }}>
                  {r.autor_nome?.[0]?.toUpperCase()||'?'}
                </div>
                <div style={{ flex:1, background:'#101F40', borderRadius:10, padding:'10px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'#2DD4A7' }}>{r.autor_nome}</span>
                    <span style={{ fontSize:10, color:'#7A8699' }}><TempoAtras ts={r.created_at} /></span>
                  </div>
                  <div style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.6 }}>{r.conteudo}</div>
                </div>
              </div>
            ))}
          </div>
      }

      <div style={{ background:'#101F40', borderRadius:12, padding:12 }}>
        <div style={{ fontSize:11, color:'#7A8699', marginBottom:8 }}>A responder como <strong style={{ color:'#fff' }}>{nome}</strong></div>
        <textarea className="input" rows={4} style={{ resize:'none', marginBottom:8 }} placeholder="Escreva a sua resposta..." value={novaResp} onChange={e => setNovaResp(e.target.value)} />
        <button className="btn btn-primary" onClick={enviarResposta} disabled={saving||!novaResp.trim()} style={{ width:'100%' }}>
          {saving ? <Spinner /> : '📨 Enviar Resposta'}
        </button>
      </div>
    </div>
  )
}
