import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, Field, EmptyState } from '../components/ui'

const LINHAS_GENETICAS = ['Janssen','Koopman','Gaby Vandenabeele','Leo Heremans','Schellens','Aarden','Wittenbuik','Van Loon','Staf Aarden','Hofkens','Bricoux','Sion','De Rauw-Sablon','Outro']

const NODE_VAZIO = { anilha: '', nome: '', cor: '', linhagem: '', conquistas: '', desc: '', foto_url: '' }

function initArvore(pombo) {
  return {
    pombo: { anilha: pombo?.anilha||'', nome: pombo?.nome||'', cor: pombo?.cor||'', linhagem: '', conquistas: '', desc: '', foto_url: pombo?.foto_url||'' },
    pai: { ...NODE_VAZIO },
    mae: { ...NODE_VAZIO },
    avo_pp: { ...NODE_VAZIO }, avo_pm: { ...NODE_VAZIO },
    avo_mp: { ...NODE_VAZIO }, avo_mm: { ...NODE_VAZIO },
    bis_ppp: { ...NODE_VAZIO }, bis_ppm: { ...NODE_VAZIO },
    bis_pmp: { ...NODE_VAZIO }, bis_pmm: { ...NODE_VAZIO },
    bis_mpp: { ...NODE_VAZIO }, bis_mpm: { ...NODE_VAZIO },
    bis_mmp: { ...NODE_VAZIO }, bis_mmm: { ...NODE_VAZIO },
  }
}

function preencherDeDB(arvore, pombos) {
  const find = (anilha) => pombos.find(p => p.anilha === anilha)
  const fill = (node, pombo) => pombo ? { ...node, anilha: pombo.anilha, nome: pombo.nome, cor: pombo.cor||'', foto_url: pombo.foto_url||'', linhagem: node.linhagem||'', conquistas: node.conquistas||`${pombo.provas||0} provas · percentil ${pombo.percentil||0}%`, desc: node.desc||'' } : node

  const pai = find(arvore.pombo.anilha) ? find(find(arvore.pombo.anilha)?.pai) : null
  const mae = find(arvore.pombo.anilha) ? find(find(arvore.pombo.anilha)?.mae) : null

  return {
    ...arvore,
    pai: fill(arvore.pai, pai),
    mae: fill(arvore.mae, mae),
    avo_pp: fill(arvore.avo_pp, pai ? find(pai.pai) : null),
    avo_pm: fill(arvore.avo_pm, pai ? find(pai.mae) : null),
    avo_mp: fill(arvore.avo_mp, mae ? find(mae.pai) : null),
    avo_mm: fill(arvore.avo_mm, mae ? find(mae.mae) : null),
  }
}

const CHAVE_STORAGE = 'cl_pedigree_'

export default function Pedigree({ nav }) {
  const toast = useToast()
  const printRef = useRef(null)
  const [pombos, setPombos] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pomboSel, setPomboSel] = useState('')
  const [arvore, setArvore] = useState(null)
  const [modalNode, setModalNode] = useState(null) // { key, node }
  const [formNode, setFormNode] = useState({ ...NODE_VAZIO })
  const [geracoes, setGeracoes] = useState(3)
  const [mostrarConquistas, setMostrarConquistas] = useState(true)
  const [mostrarFotos, setMostrarFotos] = useState(true)
  const [logoUrl, setLogoUrl] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, pf] = await Promise.all([db.getPombos(), db.getPerfil()])
      setPombos(p); setPerfil(pf)
      setLogoUrl(pf?.foto_pombal_url || '')
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const selecionarPombo = (id) => {
    setPomboSel(id)
    if (!id) { setArvore(null); return }
    const pombo = pombos.find(p => p.id === id)
    const saved = localStorage.getItem(CHAVE_STORAGE + id)
    const base = saved ? JSON.parse(saved) : initArvore(pombo)
    const preenchido = preencherDeDB(base, pombos)
    setArvore(preenchido)
  }

  const updateArvore = (key, campo, valor) => {
    setArvore(a => {
      const nova = { ...a, [key]: { ...a[key], [campo]: valor } }
      if (pomboSel) localStorage.setItem(CHAVE_STORAGE + pomboSel, JSON.stringify(nova))
      return nova
    })
  }

  const abrirEditor = (key) => {
    setFormNode({ ...arvore[key] })
    setModalNode(key)
  }

  const guardarNode = () => {
    setArvore(a => {
      const nova = { ...a, [modalNode]: { ...formNode } }
      if (pomboSel) localStorage.setItem(CHAVE_STORAGE + pomboSel, JSON.stringify(nova))
      return nova
    })
    setModalNode(null)
  }

  const imprimirPedigree = () => {
    const style = document.createElement('style')
    style.id = 'pedigree-print-style'
    style.textContent = `
      @media print {
        body > *:not(#pedigree-root) { display: none !important; }
        #pedigree-root { display: block !important; }
        .pedigree-card { page-break-inside: avoid; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `
    document.head.appendChild(style)
    window.print()
    setTimeout(() => document.head.removeChild(style), 1000)
  }

  const PomboNode = ({ nodeKey, label, destaque, mini }) => {
    if (!arvore) return null
    const node = arvore[nodeKey]
    const vazio = !node.anilha && !node.nome
    const sz = mini ? 90 : destaque ? 140 : 110

    return (
      <div
        className="pedigree-card"
        onClick={() => abrirEditor(nodeKey)}
        style={{
          width: sz, minHeight: mini ? 60 : 80, background: destaque ? 'rgba(212,175,55,.08)' : '#0B1830',
          border: `1px solid ${destaque ? '#D4AF37' : vazio ? '#1B2D52' : '#2a4070'}`,
          borderRadius: 8, padding: mini ? '6px 8px' : '8px 10px', cursor: 'pointer',
          transition: 'all .2s', position: 'relative', flexShrink: 0
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor='#4C8DFF'}
        onMouseLeave={e => e.currentTarget.style.borderColor = destaque ? '#D4AF37' : vazio ? '#1B2D52' : '#2a4070'}
      >
        {vazio ? (
          <div style={{ textAlign:'center', color:'#475569', fontSize: mini ? 9 : 11 }}>
            <div style={{ fontSize: mini ? 14 : 18, marginBottom: 2 }}>➕</div>
            <div>{label||'Desconhecido'}</div>
          </div>
        ) : (
          <>
            {mostrarFotos && node.foto_url && !mini && (
              <img src={node.foto_url} alt="" style={{ width: '100%', height: destaque ? 60 : 45, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }} />
            )}
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize: mini ? 8 : 9, color:'#D4AF37', marginBottom: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{node.anilha||'—'}</div>
            <div style={{ fontSize: mini ? 10 : 11, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{node.nome||'—'}</div>
            {node.linhagem && !mini && <div style={{ fontSize: 9, color:'#4C8DFF', marginTop: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{node.linhagem}</div>}
            {node.cor && !mini && <div style={{ fontSize: 9, color:'#7A8699', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{node.cor}</div>}
            {mostrarConquistas && node.conquistas && !mini && <div style={{ fontSize: 8, color:'#2DD4A7', marginTop: 2, lineHeight: 1.3 }}>{node.conquistas}</div>}
          </>
        )}
        <div style={{ position:'absolute', top: 3, right: 3, fontSize: 8, color:'#475569' }}>✏️</div>
      </div>
    )
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>

  return (
    <div id="pedigree-root">
      <div className="section-header">
        <div><div className="section-title">🌳 Pedigree Premium</div><div className="section-sub">Árbol genealógico · {geracoes} gerações</div></div>
        {arvore && (
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-secondary btn-sm" onClick={imprimirPedigree}>🖨️ Imprimir / PDF</button>
          </div>
        )}
      </div>

      {/* Configuração */}
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:1, minWidth:200 }}>
            <Field label="Seleccionar Pombo">
              <select className="input" value={pomboSel} onChange={e => selecionarPombo(e.target.value)}>
                <option value="">— Escolha um pombo —</option>
                {pombos.filter(p => p.estado !== 'inativo' || p.provas > 0).map(p => (
                  <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>
                ))}
              </select>
            </Field>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <Field label="Gerações">
              <select className="input" style={{ width:100 }} value={geracoes} onChange={e => setGeracoes(parseInt(e.target.value))}>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4 (bisavós)</option>
              </select>
            </Field>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label style={{ fontSize:11, color:'#7A8699', fontWeight:600, letterSpacing:.5 }}>MOSTRAR</label>
              <div style={{ display:'flex', gap:8 }}>
                <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#cbd5e1', cursor:'pointer' }}>
                  <input type="checkbox" checked={mostrarFotos} onChange={e => setMostrarFotos(e.target.checked)} style={{ accentColor:'#4C8DFF' }} /> Fotos
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#cbd5e1', cursor:'pointer' }}>
                  <input type="checkbox" checked={mostrarConquistas} onChange={e => setMostrarConquistas(e.target.checked)} style={{ accentColor:'#4C8DFF' }} /> Conquistas
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!arvore ? (
        <EmptyState icon="🌳" title="Seleccione um pombo" desc="Escolha o pombo principal para gerar o pedigree premium com até 4 gerações" />
      ) : (
        <div ref={printRef}>
          {/* Cabeçalho premium para impressão */}
          <div className="card card-p" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#050D1A,#0B1830)' }}>
            <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
              {logoUrl && <img src={logoUrl} alt="Logo" style={{ width:64, height:64, objectFit:'cover', borderRadius:10, flexShrink:0 }} />}
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:'#D4AF37', marginBottom:2 }}>PEDIGREE</div>
                <div style={{ fontSize:16, fontWeight:600, color:'#fff' }}>{perfil?.nome || 'Columbófilo'}</div>
                {perfil?.pombal_nome && <div style={{ fontSize:12, color:'#94a3b8' }}>{perfil.pombal_nome}</div>}
                {perfil?.pombal_morada && <div style={{ fontSize:11, color:'#7A8699' }}>{perfil.pombal_morada}</div>}
                {perfil?.org && <div style={{ fontSize:11, color:'#7A8699' }}>{perfil.org} {perfil.fed ? `· ${perfil.fed}` : ''}</div>}
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:10, color:'#7A8699' }}>Data</div>
                <div style={{ fontSize:12, color:'#fff' }}>{new Date().toLocaleDateString('pt-PT')}</div>
                <div style={{ fontSize:10, color:'#7A8699', marginTop:8 }}>ChampionsLoft</div>
                <div style={{ fontSize:9, color:'#475569' }}>championsloft.app</div>
              </div>
            </div>
          </div>

          {/* Pombo principal */}
          <div style={{ display:'flex', gap:16, marginBottom:20, alignItems:'flex-start', flexWrap:'wrap' }}>
            <div style={{ width:180, flexShrink:0 }}>
              <div onClick={() => abrirEditor('pombo')} style={{ cursor:'pointer', background:'#0B1830', border:'1px solid #D4AF37', borderRadius:12, overflow:'hidden' }}>
                {arvore.pombo.foto_url && mostrarFotos
                  ? <img src={arvore.pombo.foto_url} alt="" style={{ width:'100%', height:140, objectFit:'cover' }} />
                  : <div style={{ height:100, display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>🐦</div>
                }
                <div style={{ padding:'10px 12px' }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#D4AF37' }}>{arvore.pombo.anilha||'—'}</div>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:700, color:'#fff' }}>{arvore.pombo.nome||'—'}</div>
                  {arvore.pombo.linhagem && <div style={{ fontSize:10, color:'#4C8DFF' }}>{arvore.pombo.linhagem}</div>}
                  {arvore.pombo.cor && <div style={{ fontSize:10, color:'#7A8699' }}>{arvore.pombo.cor}</div>}
                </div>
              </div>
              {arvore.pombo.desc && <div style={{ fontSize:11, color:'#94a3b8', marginTop:8, lineHeight:1.5 }}>{arvore.pombo.desc}</div>}
              {mostrarConquistas && arvore.pombo.conquistas && <div style={{ fontSize:11, color:'#2DD4A7', marginTop:4, lineHeight:1.5 }}>🏆 {arvore.pombo.conquistas}</div>}
            </div>

            {/* Árvore genealógica */}
            <div style={{ flex:1, overflowX:'auto' }}>
              {/* Geração 1 — Pais */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, color:'#7A8699', fontWeight:700, letterSpacing:1, marginBottom:6 }}>PAIS</div>
                <div style={{ display:'flex', gap:8 }}>
                  <div>
                    <div style={{ fontSize:9, color:'#4C8DFF', marginBottom:3 }}>PAI</div>
                    <PomboNode nodeKey="pai" destaque />
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:'#f87171', marginBottom:3 }}>MÃE</div>
                    <PomboNode nodeKey="mae" destaque />
                  </div>
                </div>
              </div>

              {/* Geração 2 — Avós */}
              {geracoes >= 2 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, color:'#7A8699', fontWeight:700, letterSpacing:1, marginBottom:6 }}>AVÓS</div>
                  <div style={{ display:'flex', gap:6 }}>
                    {['avo_pp','avo_pm','avo_mp','avo_mm'].map((k,i) => (
                      <div key={k}>
                        <div style={{ fontSize:8, color: i<2 ? '#4C8DFF' : '#f87171', marginBottom:2 }}>{['P-Pai','P-Mãe','M-Pai','M-Mãe'][i]}</div>
                        <PomboNode nodeKey={k} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Geração 3 — Bisavós */}
              {geracoes >= 3 && (
                <div>
                  <div style={{ fontSize:10, color:'#7A8699', fontWeight:700, letterSpacing:1, marginBottom:6 }}>BISAVÓS</div>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    {['bis_ppp','bis_ppm','bis_pmp','bis_pmm','bis_mpp','bis_mpm','bis_mmp','bis_mmm'].map((k,i) => (
                      <PomboNode key={k} nodeKey={k} mini />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div style={{ borderTop:'1px solid #1B2D52', paddingTop:10, display:'flex', justifyContent:'space-between', fontSize:10, color:'#475569' }}>
            <span>Documento gerado pela ChampionsLoft · championsloft.app</span>
            <span>© {new Date().getFullYear()} {perfil?.nome || ''}</span>
          </div>
        </div>
      )}

      {/* Modal editor de nó */}
      <Modal open={!!modalNode} onClose={() => setModalNode(null)} title="✏️ Editar Ancestral" wide
        footer={<><button className="btn btn-secondary" onClick={() => setModalNode(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardarNode}>Guardar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="form-grid">
            <Field label="Anilha"><input className="input" placeholder="PT-2020-00001" value={formNode.anilha} onChange={e => setFormNode(f=>({...f,anilha:e.target.value}))} /></Field>
            <Field label="Nome / Alcunha"><input className="input" placeholder="Ex: Zeus, Micaela..." value={formNode.nome} onChange={e => setFormNode(f=>({...f,nome:e.target.value}))} /></Field>
            <Field label="Cor"><input className="input" placeholder="Ex: Azul barrado" value={formNode.cor} onChange={e => setFormNode(f=>({...f,cor:e.target.value}))} /></Field>
            <Field label="Linhagem Genética">
              <select className="input" value={formNode.linhagem} onChange={e => setFormNode(f=>({...f,linhagem:e.target.value}))}>
                <option value="">— Seleccionar —</option>
                {LINHAS_GENETICAS.map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="🏆 Conquistas e Resultados">
            <textarea className="input" rows={3} style={{ resize:'none' }} placeholder="Ex: 1.º Velocidade Distrital 2023, Ás Pombo Regional 2022, 3 vitórias em Nacional..." value={formNode.conquistas} onChange={e => setFormNode(f=>({...f,conquistas:e.target.value}))} />
          </Field>
          <Field label="📝 Descrição / Observações">
            <textarea className="input" rows={3} style={{ resize:'none' }} placeholder="Informação adicional sobre este pombo, criador de origem, características especiais..." value={formNode.desc} onChange={e => setFormNode(f=>({...f,desc:e.target.value}))} />
          </Field>
          <Field label="🖼️ URL da Foto (opcional)">
            <input className="input" placeholder="https://..." value={formNode.foto_url} onChange={e => setFormNode(f=>({...f,foto_url:e.target.value}))} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
