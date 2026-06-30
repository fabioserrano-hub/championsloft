import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, Field, EmptyState, Badge } from '../components/ui'
import { BotaoQR } from '../components/QRCode'

// ── constantes ──────────────────────────────────────────────────────────────
const LINHAS_GENETICAS_DEFAULT = [
  'Janssen', 'Koopman', 'Gaby Vandenabeele', 'Leo Heremans', 'Schellens',
  'Aarden', 'Wittenbuik', 'Van Loon', 'Staf Aarden', 'Hofkens', 'Bricoux',
  'Sion', 'De Rauw-Sablon', 'Outro'
]

const NODE_VAZIO = {
  anilha: '', nome: '', cor: '', linhagem: '', conquistas: '',
  desc: '', foto_url: '', sexo: '', externo: false, criador: ''
}

// ── helpers ──────────────────────────────────────────────────────────────────
function findPombo(pombos, ref) {
  if (!ref) return null
  return pombos.find(p => p.anilha === ref) || pombos.find(p => p.nome === ref) || null
}

function buildNode(pombo, manual = {}) {
  if (!pombo) return { ...NODE_VAZIO, ...manual }
  return {
    anilha: pombo.anilha || '',
    nome: pombo.nome || '',
    cor: pombo.cor || '',
    sexo: pombo.sexo || '',
    foto_url: pombo.foto_url || '',
    conquistas: `${pombo.provas || 0} provas · percentil ${pombo.percentil || 0}%`,
    linhagem: manual.linhagem || '',
    desc: manual.desc || '',
    externo: manual.externo || false,
    criador: manual.criador || '',
    ...(manual.conquistas ? { conquistas: manual.conquistas } : {}),
    ...(manual.foto_url ? { foto_url: manual.foto_url } : {}),
  }
}

function construirArvore(pomboId, pombos, manual = {}) {
  const pombo = pombos.find(p => p.id === pomboId) || pombos.find(p => p.anilha === pomboId)
  if (!pombo) return null

  const pai = findPombo(pombos, pombo.pai)
  const mae = findPombo(pombos, pombo.mae)
  const avo_pp = pai ? findPombo(pombos, pai.pai) : null
  const avo_pm = pai ? findPombo(pombos, pai.mae) : null
  const avo_mp = mae ? findPombo(pombos, mae.pai) : null
  const avo_mm = mae ? findPombo(pombos, mae.mae) : null

  const raw = {
    pombo: buildNode(pombo, manual.pombo || {}),
    pai: buildNode(pai, manual.pai || {}),
    mae: buildNode(mae, manual.mae || {}),
    avo_pp: buildNode(avo_pp, manual.avo_pp || {}),
    avo_pm: buildNode(avo_pm, manual.avo_pm || {}),
    avo_mp: buildNode(avo_mp, manual.avo_mp || {}),
    avo_mm: buildNode(avo_mm, manual.avo_mm || {}),
    bis_ppp: buildNode(avo_pp ? findPombo(pombos, avo_pp.pai) : null, manual.bis_ppp || {}),
    bis_ppm: buildNode(avo_pp ? findPombo(pombos, avo_pp.mae) : null, manual.bis_ppm || {}),
    bis_pmp: buildNode(avo_pm ? findPombo(pombos, avo_pm.pai) : null, manual.bis_pmp || {}),
    bis_pmm: buildNode(avo_pm ? findPombo(pombos, avo_pm.mae) : null, manual.bis_pmm || {}),
    bis_mpp: buildNode(avo_mp ? findPombo(pombos, avo_mp.pai) : null, manual.bis_mpp || {}),
    bis_mpm: buildNode(avo_mp ? findPombo(pombos, avo_mp.mae) : null, manual.bis_mpm || {}),
    bis_mmp: buildNode(avo_mm ? findPombo(pombos, avo_mm.pai) : null, manual.bis_mmp || {}),
    bis_mmm: buildNode(avo_mm ? findPombo(pombos, avo_mm.mae) : null, manual.bis_mmm || {}),
  }

  // Deteção de consanguinidade
  const contagem = {}
  Object.values(raw).forEach(node => {
    if (node.anilha) contagem[node.anilha] = (contagem[node.anilha] || 0) + 1
  })
  const result = {}
  Object.entries(raw).forEach(([key, node]) => {
    result[key] = {
      ...node,
      repetido: contagem[node.anilha] > 1 ? contagem[node.anilha] : 0
    }
  })
  return result
}

const CHAVE_STORAGE = 'cl_pedigree_'

export default function Pedigree({ nav, params }) {
  const toast = useToast()
  const { user } = useAuth()
  const printRef = useRef(null)
  const [pombos, setPombos] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pomboSel, setPomboSel] = useState('')
  const [arvore, setArvore] = useState(null)
  const [modalNode, setModalNode] = useState(null)
  const [formNode, setFormNode] = useState({ ...NODE_VAZIO })
  const [geracoes, setGeracoes] = useState(3)
  const [mostrarConquistas, setMostrarConquistas] = useState(true)
  const [mostrarFotos, setMostrarFotos] = useState(true)

  // Tema
  const [tema, setTema] = useState({
    primaria: '#D4AF37',
    secundaria: '#1E5FD9',
    fundo: '#0B1830',
    texto: '#FFFFFF',
  })

  // Filtros
  const [filtroPombal, setFiltroPombal] = useState('')
  const [filtroSexo, setFiltroSexo] = useState('')
  const [pesquisaRapida, setPesquisaRapida] = useState('')

  // Linhagens dinâmicas
  const [linhagens, setLinhagens] = useState(LINHAS_GENETICAS_DEFAULT)
  const [novaLinhagem, setNovaLinhagem] = useState('')

  // Estatísticas
  const [estatisticas, setEstatisticas] = useState(null)

  // ── Computed ──────────────────────────────────────────────────────────────
  const pombalsList = [...new Set(pombos.map(p => p.pombal).filter(Boolean))]
  const pombosFiltrados = pombos.filter(p =>
    (!filtroPombal || p.pombal === filtroPombal) &&
    (!filtroSexo || p.sexo === filtroSexo)
  )

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, pf] = await Promise.all([db.getPombos(), db.getPerfil()])
      setPombos(p)
      setPerfil(pf)
      const temaGuardado = pf?.tema || JSON.parse(localStorage.getItem('cl_tema') || 'null')
      if (temaGuardado) setTema(temaGuardado)
      const linhagensGuardadas = pf?.linhagens || JSON.parse(localStorage.getItem('cl_linhagens') || 'null')
      if (linhagensGuardadas) setLinhagens(linhagensGuardadas)
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const subscription = supabase
      .channel('pedigree_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedigrees' },
        (payload) => {
          if (payload.new.pigeon_id === pomboSel) {
            toast('📝 Pedigree atualizado por outro utilizador', 'info')
            if (pomboSel) selecionarPombo(pomboSel)
          }
        }
      )
      .subscribe()
    return () => subscription.unsubscribe()
  }, [pomboSel])

  useEffect(() => {
    if (params?.pomboId && pombos.length) selecionarPombo(params.pomboId)
  }, [params?.pomboId, pombos.length])

  // ── selecionarPombo ──────────────────────────────────────────────────────
  const selecionarPombo = useCallback(async (id) => {
    setPomboSel(id)
    if (!id) { setArvore(null); setEstatisticas(null); return }

    const arvoreBase = construirArvore(id, pombos, {})
    if (!arvoreBase) { setArvore(null); setEstatisticas(null); return }

    let manual = {}
    try { manual = await db.getPedigree(id) || {} } catch {}
    if (!manual || !Object.keys(manual).length) {
      try { const local = localStorage.getItem(CHAVE_STORAGE + id); if (local) manual = JSON.parse(local) } catch {}
    }

    const nodos = ['pai', 'mae', 'avo_pp', 'avo_pm', 'avo_mp', 'avo_mm',
      'bis_ppp', 'bis_ppm', 'bis_pmp', 'bis_pmm', 'bis_mpp', 'bis_mpm', 'bis_mmp', 'bis_mmm']
    const manuaisAncestral = {}
    await Promise.all(nodos.map(async (key) => {
      const node = arvoreBase[key]
      if (!node?.anilha) return
      const pomboReal = pombos.find(p => p.anilha === node.anilha)
      if (!pomboReal) return
      let dadosAncestral = {}
      try { dadosAncestral = await db.getPedigree(pomboReal.id) || {} } catch {}
      if (!dadosAncestral || !Object.keys(dadosAncestral).length) {
        try { const local = localStorage.getItem(CHAVE_STORAGE + pomboReal.id); if (local) dadosAncestral = JSON.parse(local) } catch {}
      }
      if (dadosAncestral.pombo) manuaisAncestral[key] = { ...dadosAncestral.pombo }
    }))

    const manualFinal = { ...manuaisAncestral, ...manual }
    const arvore = construirArvore(id, pombos, manualFinal)
    setArvore(arvore)

    const unicos = new Set()
    let total = 0
    Object.values(arvore).forEach(n => { if (n.anilha) { unicos.add(n.anilha); total++ } })
    const consanguinidade = total - unicos.size
    setEstatisticas({
      unicos: unicos.size,
      total: total,
      consanguinidade,
      geraçõesCompletas: geracoes,
      percentualConsang: total > 0 ? Math.round((consanguinidade / total) * 100) : 0
    })
  }, [pombos, geracoes])

  // ── guardar / editar ────────────────────────────────────────────────────
  const abrirEditor = (key) => {
    setFormNode({ ...arvore[key] })
    setModalNode(key)
  }

  const guardarNode = async () => {
    setArvore(a => {
      const nova = { ...a, [modalNode]: { ...formNode } }
      if (pomboSel) {
        const manual = {}
        Object.keys(nova).forEach(k => {
          const n = nova[k]
          manual[k] = {
            linhagem: n.linhagem || '',
            desc: n.desc || '',
            conquistas: n.conquistas || '',
            foto_url: n.foto_url || '',
            externo: n.externo || false,
            criador: n.criador || ''
          }
        })
        localStorage.setItem(CHAVE_STORAGE + pomboSel, JSON.stringify(manual))
        db.savePedigree(pomboSel, manual).catch(() => {})
      }
      return nova
    })
    setModalNode(null)
    toast('Guardado!', 'ok')
  }

  // ── upload de foto ──────────────────────────────────────────────────────
  const uploadFotoNode = async (file) => {
    if (!user?.id) return toast('Faça login primeiro', 'warn')
    try {
      const url = await db.uploadPedigreeFoto(user.id, pomboSel, file)
      setFormNode(f => ({ ...f, foto_url: url }))
      toast('Foto carregada!', 'ok')
    } catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  // ── temas ──────────────────────────────────────────────────────────────
  const guardarTema = (novoTema) => {
    setTema(novoTema)
    localStorage.setItem('cl_tema', JSON.stringify(novoTema))
    db.updatePerfil({ tema: novoTema }).catch(() => {})
  }

  // ── exportar CSV ────────────────────────────────────────────────────────
  const exportarCSV = () => {
    if (!arvore) return
    const linhas = []
    Object.entries(arvore).forEach(([key, node]) => {
      if (node.anilha || node.nome) {
        linhas.push([
          key,
          node.anilha || '',
          node.nome || '',
          node.sexo || '',
          node.cor || '',
          node.linhagem || '',
          node.conquistas || '',
          node.desc || '',
          node.foto_url || '',
          node.externo ? 'Sim' : 'Não',
          node.repetido || 0
        ].join(','))
      }
    })
    const csv = ['Posição,Anilha,Nome,Sexo,Cor,Linhagem,Conquistas,Descrição,Foto,Externo,Repetições', ...linhas].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pedigree_${arvore.pombo.nome || 'pombo'}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('CSV exportado!', 'ok')
  }

  // ── adicionar linhagem ──────────────────────────────────────────────────
  const adicionarLinhagem = () => {
    if (!novaLinhagem.trim()) return toast('Insira um nome', 'warn')
    const novas = [...linhagens, novaLinhagem.trim()]
    setLinhagens(novas)
    localStorage.setItem('cl_linhagens', JSON.stringify(novas))
    db.updatePerfil({ linhagens: novas }).catch(() => {})
    setNovaLinhagem('')
    toast('Linhagem adicionada!', 'ok')
  }

  // ── trocar pai/mãe ──────────────────────────────────────────────────────
  const trocarPai = (novoPaiId) => {
    const novoPai = pombos.find(p => p.id === novoPaiId)
    if (!novoPai) return
    setArvore(a => {
      const atualizada = { ...a, pai: { ...a.pai, anilha: novoPai.anilha, nome: novoPai.nome, sexo: novoPai.sexo, cor: novoPai.cor } }
      if (pomboSel) {
        const manual = {}
        Object.keys(atualizada).forEach(k => {
          const n = atualizada[k]
          manual[k] = {
            linhagem: n.linhagem || '',
            desc: n.desc || '',
            conquistas: n.conquistas || '',
            foto_url: n.foto_url || '',
            externo: n.externo || false,
            criador: n.criador || ''
          }
        })
        localStorage.setItem(CHAVE_STORAGE + pomboSel, JSON.stringify(manual))
        db.savePedigree(pomboSel, manual).catch(() => {})
      }
      return atualizada
    })
    toast('Pai atualizado!', 'ok')
  }

  const trocarMae = (novaMaeId) => {
    const novaMae = pombos.find(p => p.id === novaMaeId)
    if (!novaMae) return
    setArvore(a => {
      const atualizada = { ...a, mae: { ...a.mae, anilha: novaMae.anilha, nome: novaMae.nome, sexo: novaMae.sexo, cor: novaMae.cor } }
      if (pomboSel) {
        const manual = {}
        Object.keys(atualizada).forEach(k => {
          const n = atualizada[k]
          manual[k] = {
            linhagem: n.linhagem || '',
            desc: n.desc || '',
            conquistas: n.conquistas || '',
            foto_url: n.foto_url || '',
            externo: n.externo || false,
            criador: n.criador || ''
          }
        })
        localStorage.setItem(CHAVE_STORAGE + pomboSel, JSON.stringify(manual))
        db.savePedigree(pomboSel, manual).catch(() => {})
      }
      return atualizada
    })
    toast('Mãe atualizada!', 'ok')
  }

  // ── componente NodeCard ──────────────────────────────────────────────────
  const NodeCard = ({ nodeKey, label, destaque, mini }) => {
    if (!arvore) return null
    const node = arvore[nodeKey]
    const vazio = !node.anilha && !node.nome
    const isRepetido = node.repetido > 1
    const corSexo = node.sexo === 'M' ? '#4C8DFF' : node.sexo === 'F' ? '#f87171' : '#7A8699'
    const corLinhagem = linhagens.includes(node.linhagem) ? tema.primaria : '#94a3b8'

    return (
      <div
        className="pedigree-node"
        onClick={() => abrirEditor(nodeKey)}
        style={{
          width: mini ? 90 : destaque ? 140 : 110,
          minHeight: mini ? 60 : 80,
          background: vazio ? '#0B1830' : destaque ? `rgba(212,175,55,.08)` : '#0B1830',
          border: `2px solid ${isRepetido ? '#f97316' : vazio ? '#1B2D52' : destaque ? tema.primaria : '#2a4070'}`,
          borderRadius: 8,
          padding: mini ? '4px 6px' : '8px 10px',
          cursor: 'pointer',
          transition: 'all .2s',
          position: 'relative',
          flexShrink: 0,
          boxShadow: isRepetido ? '0 0 12px rgba(249,115,22,0.3)' : 'none',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = isRepetido ? '#f97316' : '#4C8DFF'}
        onMouseLeave={e => e.currentTarget.style.borderColor = isRepetido ? '#f97316' : vazio ? '#1B2D52' : destaque ? tema.primaria : '#2a4070'}
        title={`${node.nome || '—'} (${node.anilha || '—'})\n${node.cor || ''} ${node.sexo ? '· ' + node.sexo : ''}\n${node.conquistas || ''}`}
      >
        {isRepetido && (
          <div style={{ position: 'absolute', top: -6, right: -6, background: '#f97316', color: '#fff', borderRadius: 10, fontSize: 8, padding: '0 5px', fontWeight: 700, lineHeight: '16px' }}>
            ⚠️ {node.repetido}x
          </div>
        )}
        {vazio ? (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: mini ? 9 : 11 }}>
            <div style={{ fontSize: mini ? 14 : 18, marginBottom: 2 }}>➕</div>
            <div>{label || 'Desconhecido'}</div>
          </div>
        ) : (
          <>
            {mostrarFotos && node.foto_url && !mini && (
              <img src={node.foto_url} alt="" style={{ width: '100%', height: destaque ? 60 : 45, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: mini ? 7 : 9, color: '#D4AF37', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.anilha || '—'}
              </span>
              <span style={{ fontSize: mini ? 8 : 10, color: corSexo }}>{node.sexo === 'M' ? '♂' : node.sexo === 'F' ? '♀' : ''}</span>
            </div>
            <div style={{ fontSize: mini ? 10 : 11, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.nome || '—'}
            </div>
            {node.linhagem && !mini && (
              <div style={{ fontSize: 8, color: corLinhagem, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                {node.linhagem}
              </div>
            )}
            {node.cor && !mini && (
              <div style={{ fontSize: 8, color: '#7A8699', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.cor}
              </div>
            )}
            {mostrarConquistas && node.conquistas && !mini && (
              <div style={{ fontSize: 7, color: '#2DD4A7', marginTop: 2, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.conquistas}
              </div>
            )}
            {node.externo && !mini && (
              <Badge v="blue" style={{ fontSize: 7, marginTop: 2 }}>Ext.</Badge>
            )}
          </>
        )}
        <div style={{ position: 'absolute', top: 3, right: 3, fontSize: 7, color: '#475569' }}>✏️</div>
      </div>
    )
  }

  // ── render ──────────────────────────────────────────────────────────────
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>

  return (
    <div id="pedigree-root" style={{ background: tema.fundo, color: tema.texto, minHeight: '100vh' }}>
      <style>{`
        @media print {
          #pedigree-config-card, .no-print { display: none !important; }
          #pedigree-root { background: white !important; color: black !important; }
          .pedigree-node { background: #f8f9fa !important; border-color: #ccc !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="section-header no-print" id="pedigree-config-card">
        <div><div className="section-title">🌳 Pedigree</div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {arvore && (
            <>
              <button className="btn btn-primary btn-sm" onClick={gerarPDF}>📥 PDF</button>
              <button className="btn btn-secondary btn-sm" onClick={exportarCSV}>📊 CSV</button>
            </>
          )}
          {arvore && pomboSel && (
            <BotaoQR
              titulo={`Pedigree — ${arvore.pombo.nome}`}
              conteudo={`${window.location.origin}/p/${perfil?.slug || ''}#pedigree/${arvore.pombo.anilha}`}
              subtitulo={`${arvore.pombo.nome} · ${arvore.pombo.anilha}`}
            />
          )}
        </div>
      </div>

      {/* Configuração */}
      <div className="card card-p no-print" id="pedigree-config-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <select className="input" style={{ flex: 1, fontSize: 11 }} value={filtroPombal} onChange={e => setFiltroPombal(e.target.value)}>
                <option value="">Todos os pombais</option>
                {pombalsList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="input" style={{ width: 100, fontSize: 11 }} value={filtroSexo} onChange={e => setFiltroSexo(e.target.value)}>
                <option value="">♂♀ Todos</option>
                <option value="M">♂ Machos</option>
                <option value="F">♀ Fêmeas</option>
              </select>
            </div>
            <Field label="Seleccionar Pombo">
              <input
                className="input"
                placeholder="🔍 Pesquisar pombo..."
                value={pesquisaRapida}
                onChange={e => setPesquisaRapida(e.target.value)}
                list="pombo-list"
              />
              <datalist id="pombo-list">
                {pombosFiltrados.map(p => (
                  <option key={p.id} value={p.nome} data-id={p.id}>
                    {p.sexo === 'M' ? '♂' : p.sexo === 'F' ? '♀' : '○'} {p.nome} ({p.anilha})
                  </option>
                ))}
              </datalist>
              <select
                className="input"
                value={pomboSel}
                onChange={e => selecionarPombo(e.target.value)}
                style={{ marginTop: 4 }}
              >
                <option value="">— Escolha um pombo —</option>
                {pombosFiltrados.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.sexo === 'M' ? '♂' : p.sexo === 'F' ? '♀' : '○'} {p.nome} ({p.anilha}){p.pombal ? ` · ${p.pombal}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="Gerações">
              <select className="input" style={{ width: 100 }} value={geracoes} onChange={e => setGeracoes(parseInt(e.target.value))}>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </Field>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: '#7A8699', fontWeight: 600, letterSpacing: .5 }}>MOSTRAR</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
                  <input type="checkbox" checked={mostrarFotos} onChange={e => setMostrarFotos(e.target.checked)} style={{ accentColor: tema.primaria }} /> Fotos
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
                  <input type="checkbox" checked={mostrarConquistas} onChange={e => setMostrarConquistas(e.target.checked)} style={{ accentColor: tema.primaria }} /> Conquistas
                </label>
              </div>
            </div>
            {arvore && <button className="btn btn-primary btn-sm" onClick={() => { db.savePedigree(pomboSel, arvore); toast('Guardado!', 'ok') }}>💾 Guardar</button>}
          </div>
        </div>

        {/* Temas e linhagens */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', borderTop: '1px solid #1B2D52', paddingTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#7A8699' }}>Tema:</span>
            <input type="color" value={tema.primaria} onChange={e => guardarTema({ ...tema, primaria: e.target.value })} style={{ width: 32, height: 32, border: 'none', padding: 0, cursor: 'pointer' }} />
            <input type="color" value={tema.secundaria} onChange={e => guardarTema({ ...tema, secundaria: e.target.value })} style={{ width: 32, height: 32, border: 'none', padding: 0, cursor: 'pointer' }} />
            <input type="color" value={tema.fundo} onChange={e => guardarTema({ ...tema, fundo: e.target.value })} style={{ width: 32, height: 32, border: 'none', padding: 0, cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#7A8699' }}>Linhagens:</span>
            <select className="input" style={{ width: 150, fontSize: 11 }} value={formNode.linhagem || ''} onChange={e => setFormNode(f => ({ ...f, linhagem: e.target.value }))}>
              <option value="">—</option>
              {linhagens.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" style={{ width: 120, fontSize: 11 }} placeholder="Nova linhagem" value={novaLinhagem} onChange={e => setNovaLinhagem(e.target.value)} />
            <button className="btn btn-secondary btn-sm" onClick={adicionarLinhagem}>+</button>
          </div>
        </div>
      </div>

      {!arvore ? (
        <EmptyState icon="🌳" title="Seleccione um pombo" desc="Escolha o pombo principal para gerar o pedigree premium" />
      ) : (
        <div ref={printRef}>
          {/* Estatísticas */}
          {estatisticas && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, padding: '8px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
              <span>🧬 Ancestrais únicos: <strong>{estatisticas.unicos}</strong></span>
              <span>👥 Total de posições: <strong>{estatisticas.total}</strong></span>
              <span>⚠️ Consanguinidade: <strong>{estatisticas.consanguinidade}</strong> ({estatisticas.percentualConsang}%)</span>
              <span>📊 Gerações completas: <strong>{estatisticas.geraçõesCompletas}</strong></span>
            </div>
          )}

          {/* Pombo principal */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: 180, flexShrink: 0 }}>
              <div onClick={() => abrirEditor('pombo')} style={{ cursor: 'pointer', background: '#0B1830', border: `2px solid ${tema.primaria}`, borderRadius: 12, overflow: 'hidden' }}>
                {arvore.pombo.foto_url && mostrarFotos
                  ? <img src={arvore.pombo.foto_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                  : <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🐦</div>
                }
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#D4AF37' }}>{arvore.pombo.anilha || '—'}</div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: 16, fontWeight: 700, color: '#fff' }}>{arvore.pombo.nome || '—'}</div>
                  {arvore.pombo.linhagem && <div style={{ fontSize: 10, color: tema.primaria }}>{arvore.pombo.linhagem}</div>}
                  {arvore.pombo.cor && <div style={{ fontSize: 10, color: '#7A8699' }}>{arvore.pombo.cor}</div>}
                  {arvore.pombo.externo && <Badge v="blue" style={{ marginTop: 4 }}>Externo</Badge>}
                </div>
              </div>
              {arvore.pombo.desc && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>{arvore.pombo.desc}</div>}
              {mostrarConquistas && arvore.pombo.conquistas && <div style={{ fontSize: 11, color: '#2DD4A7', marginTop: 4, lineHeight: 1.5 }}>🏆 {arvore.pombo.conquistas}</div>}
            </div>

            {/* Árvore genealógica */}
            <div style={{ flex: 1, overflowX: 'auto' }}>
              {/* Pais */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#7A8699', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PAIS</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#4C8DFF', marginBottom: 3 }}>PAI</div>
                    <NodeCard nodeKey="pai" destaque />
                    <select className="input" style={{ fontSize: 9, marginTop: 4, width: '100%' }} value="" onChange={e => trocarPai(e.target.value)}>
                      <option value="">— Trocar pai —</option>
                      {pombos.filter(p => p.sexo === 'M' && p.id !== pomboSel).map(p => <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: '#f87171', marginBottom: 3 }}>MÃE</div>
                    <NodeCard nodeKey="mae" destaque />
                    <select className="input" style={{ fontSize: 9, marginTop: 4, width: '100%' }} value="" onChange={e => trocarMae(e.target.value)}>
                      <option value="">— Trocar mãe —</option>
                      {pombos.filter(p => p.sexo === 'F' && p.id !== pomboSel).map(p => <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Avós */}
              {geracoes >= 2 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#7A8699', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>AVÓS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['avo_pp', 'avo_pm', 'avo_mp', 'avo_mm'].map((k, i) => (
                      <div key={k}>
                        <div style={{ fontSize: 8, color: i < 2 ? '#4C8DFF' : '#f87171', marginBottom: 2 }}>{['P-Pai', 'P-Mãe', 'M-Pai', 'M-Mãe'][i]}</div>
                        <NodeCard nodeKey={k} mini />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bisavós */}
              {geracoes >= 3 && (
                <div>
                  <div style={{ fontSize: 10, color: '#7A8699', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>BISAVÓS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      ['bis_ppp', 'PP-Pai', '#4C8DFF'],
                      ['bis_ppm', 'PP-Mãe', '#4C8DFF'],
                      ['bis_pmp', 'PM-Pai', '#7B9FFF'],
                      ['bis_pmm', 'PM-Mãe', '#7B9FFF'],
                      ['bis_mpp', 'MP-Pai', '#f87171'],
                      ['bis_mpm', 'MP-Mãe', '#f87171'],
                      ['bis_mmp', 'MM-Pai', '#ff9999'],
                      ['bis_mmm', 'MM-Mãe', '#ff9999'],
                    ].map(([k, label, cor]) => (
                      <div key={k}>
                        <div style={{ fontSize: 8, color: cor, marginBottom: 2, fontWeight: 600 }}>{label}</div>
                        <NodeCard nodeKey={k} mini />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 8, color: '#475569', marginTop: 6 }}>PP=Pai do Pai · PM=Pai da Mãe · MP=Mãe do Pai · MM=Mãe da Mãe</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1B2D52', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569' }}>
            <span>Documento gerado pela ChampionsLoft · championsloft.app</span>
            <span>© {new Date().getFullYear()} {perfil?.nome || ''}</span>
          </div>
        </div>
      )}

      {/* Modal editor de nó com upload de foto */}
      {modalNode && (
        <Modal open onClose={() => setModalNode(null)} title={`✏️ Editar ${modalNode}`} wide
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalNode(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarNode}>Guardar</button>
            </>
          }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Upload de foto */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {formNode.foto_url && <img src={formNode.foto_url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />}
              <div>
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) uploadFotoNode(f) }} />
                <div style={{ fontSize: 10, color: '#7A8699', marginTop: 4 }}>ou insira URL abaixo</div>
              </div>
            </div>

            <div className="form-grid">
              <Field label="Anilha"><input className="input" value={formNode.anilha} onChange={e => setFormNode(f => ({ ...f, anilha: e.target.value }))} /></Field>
              <Field label="Nome"><input className="input" value={formNode.nome} onChange={e => setFormNode(f => ({ ...f, nome: e.target.value }))} /></Field>
              <Field label="Cor"><input className="input" value={formNode.cor} onChange={e => setFormNode(f => ({ ...f, cor: e.target.value }))} /></Field>
              <Field label="Sexo">
                <select className="input" value={formNode.sexo || ''} onChange={e => setFormNode(f => ({ ...f, sexo: e.target.value }))}>
                  <option value="">—</option>
                  <option value="M">♂ Macho</option>
                  <option value="F">♀ Fêmea</option>
                </select>
              </Field>
              <Field label="Linhagem">
                <select className="input" value={formNode.linhagem} onChange={e => setFormNode(f => ({ ...f, linhagem: e.target.value }))}>
                  <option value="">—</option>
                  {linhagens.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="URL da Foto"><input className="input" placeholder="https://..." value={formNode.foto_url} onChange={e => setFormNode(f => ({ ...f, foto_url: e.target.value }))} /></Field>
            </div>
            <Field label="🏆 Conquistas"><textarea className="input" rows={2} value={formNode.conquistas} onChange={e => setFormNode(f => ({ ...f, conquistas: e.target.value }))} /></Field>
            <Field label="📝 Descrição"><textarea className="input" rows={2} value={formNode.desc} onChange={e => setFormNode(f => ({ ...f, desc: e.target.value }))} /></Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={!!formNode.externo} onChange={e => setFormNode(f => ({ ...f, externo: e.target.checked }))} />
              🌍 Ancestral externo
            </label>
            {formNode.externo && (
              <Field label="Criador / Origem">
                <input className="input" value={formNode.criador || ''} onChange={e => setFormNode(f => ({ ...f, criador: e.target.value }))} />
              </Field>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── FUNÇÃO GERAR PDF (MANTIDA DO CÓDIGO ANTERIOR) ──────────────────────────
// (A função gerarPDF é longa e está aqui omitida para poupar espaço.
//  Se precisares dela, avisa e eu envio-a completa.)
