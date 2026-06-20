import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, Field, EmptyState } from '../components/ui'

const LINHAS_GENETICAS = ['Janssen','Koopman','Gaby Vandenabeele','Leo Heremans','Schellens','Aarden','Wittenbuik','Van Loon','Staf Aarden','Hofkens','Bricoux','Sion','De Rauw-Sablon','Outro']

const NODE_VAZIO = { anilha: '', nome: '', cor: '', linhagem: '', conquistas: '', desc: '', foto_url: '', sexo: '' }

// Encontra pombo por anilha ou nome
function findPombo(pombos, ref) {
  if (!ref) return null
  return pombos.find(p => p.anilha === ref) || pombos.find(p => p.nome === ref) || null
}

// Constrói nó a partir de um pombo da DB, sobrepondo dados manuais guardados
function buildNode(pombo, manual = {}) {
  if (!pombo) return { ...NODE_VAZIO, ...manual }
  return {
    anilha: pombo.anilha || '',
    nome: pombo.nome || '',
    cor: pombo.cor || '',
    sexo: pombo.sexo || '',
    foto_url: pombo.foto_url || '',
    conquistas: `${pombo.provas||0} provas · percentil ${pombo.percentil||0}%`,
    linhagem: manual.linhagem || '',
    desc: manual.desc || '',
    // Sobrepor conquistas manuais se existirem
    ...(manual.conquistas ? { conquistas: manual.conquistas } : {}),
    ...(manual.foto_url ? { foto_url: manual.foto_url } : {}),
  }
}

// Constrói árvore dinâmica recursivamente a partir da DB
// manual = dados editados manualmente (linhagem, desc, conquistas personalizadas)
function construirArvore(pomboId, pombos, manual = {}) {
  const pombo = pombos.find(p => p.id === pomboId) || pombos.find(p => p.anilha === pomboId)
  if (!pombo) return null

  const pai = findPombo(pombos, pombo.pai)
  const mae = findPombo(pombos, pombo.mae)
  const avo_pp = pai ? findPombo(pombos, pai.pai) : null
  const avo_pm = pai ? findPombo(pombos, pai.mae) : null
  const avo_mp = mae ? findPombo(pombos, mae.pai) : null
  const avo_mm = mae ? findPombo(pombos, mae.mae) : null

  return {
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
}

const CHAVE_STORAGE = 'cl_pedigree_'

export default function Pedigree({ nav, params }) {
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
      setLogoUrl(pf?.logo_url || pf?.foto_pombal_url || '')
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (params?.pomboId && pombos.length) selecionarPombo(params.pomboId)
  }, [params?.pomboId, pombos.length])

  const [filtroPombal, setFiltroPombal] = useState('')
  const [filtroSexo, setFiltroSexo] = useState('')

  const pombalsList = [...new Set(pombos.map(p => p.pombal).filter(Boolean))]
  const pombosFiltrados = pombos.filter(p =>
    (!filtroPombal || p.pombal === filtroPombal) &&
    (!filtroSexo || p.sexo === filtroSexo)
  )

  const selecionarPombo = async (id) => {
    setPomboSel(id)
    if (!id) { setArvore(null); return }
    // Carregar dados manuais guardados (linhagem, desc, conquistas personalizadas)
    let manual = {}
    try { manual = await db.getPedigree(id) || {} } catch(e) {}
    if (!manual || !Object.keys(manual).length) {
      const local = localStorage.getItem(CHAVE_STORAGE + id)
      if (local) manual = JSON.parse(local)
    }
    // Construir árvore dinâmica a partir da DB
    const arvore = construirArvore(id, pombos, manual)
    setArvore(arvore)
  }

  const updateArvore = (key, campo, valor) => {
    setArvore(a => {
      const nova = { ...a, [key]: { ...a[key], [campo]: valor } }
      if (pomboSel) {
        localStorage.setItem(CHAVE_STORAGE + pomboSel, JSON.stringify(nova))
        db.savePedigree(pomboSel, nova).catch(() => {})
      }
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
      if (pomboSel) {
        // Guardar apenas os campos manuais (não os que vêm da DB)
        const manual = {}
        Object.keys(nova).forEach(k => {
          const n = nova[k]
          manual[k] = { linhagem: n.linhagem||'', desc: n.desc||'', conquistas: n.conquistas||'', foto_url: n.foto_url||'' }
        })
        localStorage.setItem(CHAVE_STORAGE + pomboSel, JSON.stringify(manual))
        db.savePedigree(pomboSel, manual).catch(() => {})
      }
      return nova
    })
    setModalNode(null)
    toast('Guardado!', 'ok')
  }

  const imprimirPedigree = () => {
    if (!arvore) return
    const p = arvore.pombo
    const nodeHtml = (node, label, cor = '#1a1a6e', mini = false) => {
      if (!node?.nome && !node?.anilha) return `<div class="node mini" style="border:1px dashed #ccc;color:#999;font-size:${mini?8:10}px;padding:${mini?4:8}px;border-radius:6px;min-width:${mini?70:90}px"><div style="text-align:center">+<br/>${label||'Desconhecido'}</div></div>`
      return `<div class="node" style="border:1px solid ${cor};border-radius:6px;padding:${mini?'4px 6px':'8px 10px'};min-width:${mini?70:90}px;background:#f9f9f9;font-size:${mini?8:10}px">
        ${node.foto_url && !mini ? `<img src="${node.foto_url}" style="width:100%;height:40px;object-fit:cover;border-radius:3px;margin-bottom:4px"/>` : ''}
        <div style="font-family:monospace;font-size:${mini?7:8}px;color:#B8860B">${node.anilha||''}</div>
        <div style="font-weight:700;color:#111;font-size:${mini?9:11}px">${node.nome||''}</div>
        ${node.cor&&!mini?`<div style="color:#555;font-size:8px">${node.cor}</div>`:''}
        ${node.linhagem&&!mini?`<div style="color:#1a1a6e;font-size:8px">${node.linhagem}</div>`:''}
        ${node.conquistas&&!mini?`<div style="color:#006400;font-size:7px;margin-top:2px">${node.conquistas}</div>`:''}
        ${node.externo?`<div style="color:#cc4400;font-size:7px">🌍 Externo</div>`:''}
      </div>`
    }
    const w = window.open('', '_blank', 'width=1100,height=800')
    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Pedigree · ${p.nome}</title>
      <style>
        @page { size: A4 landscape; margin: 8mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: white; color: #111; font-size: 10px; }
        .header-bar { background: linear-gradient(90deg,#B8860B,#DAA520,#B8860B); padding: 5px 14px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0; }
        .header-body { border: 2px solid #DAA520; border-top: none; border-radius: 0 0 8px 8px; padding: 12px 16px; display: flex; gap: 14px; align-items: center; margin-bottom: 14px; }
        .section-label { font-size: 8px; font-weight: 700; letter-spacing: 1px; color: #555; text-transform: uppercase; margin-bottom: 4px; }
        .row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 10px; }
        .col { display: flex; flex-direction: column; }
        .node { break-inside: avoid; }
        .pombo-main { border: 2px solid #DAA520; border-radius: 8px; padding: 10px; width: 160px; flex-shrink: 0; background: #fff; }
        img.foto-main { width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 6px; }
        .footer { border-top: 1px solid #ccc; margin-top: 12px; padding-top: 6px; display: flex; justify-content: space-between; font-size: 8px; color: #888; }
      </style>
    </head><body>
      <div class="header-bar">
        <div style="display:flex;align-items:center;gap:8px">
          <img src="/logo.png" style="height:24px;object-fit:contain" onerror="this.style.display='none'"/>
          <span style="font-weight:900;color:#111;font-size:12px;letter-spacing:1px">CHAMPIONSLOFT</span>
        </div>
        <div style="font-size:9px;color:#111;font-weight:600">PEDIGREE PREMIUM · championsloft.app</div>
      </div>
      <div class="header-body">
        ${perfil?.foto_perfil_url ? `<div style="text-align:center"><img src="${perfil.foto_perfil_url}" style="width:50px;height:50px;border-radius:50%;border:2px solid #DAA520;object-fit:cover"/><div style="font-size:7px;color:#666;margin-top:2px">Columbófilo</div></div>` : ''}
        ${perfil?.logo_url ? `<div style="text-align:center"><img src="${perfil.logo_url}" style="width:50px;height:50px;border-radius:6px;object-fit:contain;border:1px solid #ccc"/><div style="font-size:7px;color:#666;margin-top:2px">Logo</div></div>` : ''}
        <div style="flex:1">
          <div style="font-size:22px;font-weight:900;color:#B8860B;line-height:1">PEDIGREE</div>
          <div style="font-size:14px;font-weight:700;color:#111;margin-top:3px">${perfil?.nome||''}</div>
          ${perfil?.pombal_nome?`<div style="font-size:10px;color:#444;margin-top:1px">🏠 ${perfil.pombal_nome}${perfil?.pombal_morada?` · ${perfil.pombal_morada}`:''}</div>`:''}
          ${perfil?.org?`<div style="font-size:9px;color:#666">${perfil.org}${perfil?.fed?` · ${perfil.fed}`:''}</div>`:''}
        </div>
        <div style="text-align:right">
          <div style="font-size:8px;color:#888;text-transform:uppercase;letter-spacing:1px">Data de emissão</div>
          <div style="font-size:13px;font-weight:700">${new Date().toLocaleDateString('pt-PT')}</div>
          <div style="font-size:8px;color:#888;margin-top:4px">Documento oficial</div>
          <div style="font-size:8px;color:#888">ChampionsLoft © ${new Date().getFullYear()}</div>
        </div>
      </div>

      <div class="row">
        <div class="pombo-main">
          ${p.foto_url?`<img class="foto-main" src="${p.foto_url}"/>`:`<div style="height:80px;display:flex;align-items:center;justify-content:center;font-size:40px">🐦</div>`}
          <div style="font-family:monospace;font-size:8px;color:#B8860B">${p.anilha||''}</div>
          <div style="font-size:14px;font-weight:900;color:#111">${p.nome||''}</div>
          ${p.cor?`<div style="font-size:9px;color:#555">${p.cor}</div>`:''}
          ${arvore.pombo.conquistas?`<div style="font-size:8px;color:#006400;margin-top:4px">🏆 ${arvore.pombo.conquistas}</div>`:''}
        </div>
        <div style="flex:1">
          <div class="section-label">Pais</div>
          <div class="row" style="margin-bottom:8px">
            <div><div style="font-size:8px;color:#1a1a6e;margin-bottom:2px">PAI</div>${nodeHtml(arvore.pai,'Pai','#1a1a6e')}</div>
            <div><div style="font-size:8px;color:#8b0000;margin-bottom:2px">MÃE</div>${nodeHtml(arvore.mae,'Mãe','#8b0000')}</div>
          </div>
          ${geracoes>=2?`<div class="section-label">Avós</div>
          <div class="row" style="margin-bottom:8px">
            <div><div style="font-size:7px;color:#1a1a6e;margin-bottom:2px">P-Pai</div>${nodeHtml(arvore.avo_pp,'P-Pai','#1a1a6e')}</div>
            <div><div style="font-size:7px;color:#1a1a6e;margin-bottom:2px">P-Mãe</div>${nodeHtml(arvore.avo_pm,'P-Mãe','#1a5c8e')}</div>
            <div><div style="font-size:7px;color:#8b0000;margin-bottom:2px">M-Pai</div>${nodeHtml(arvore.avo_mp,'M-Pai','#8b0000')}</div>
            <div><div style="font-size:7px;color:#8b0000;margin-bottom:2px">M-Mãe</div>${nodeHtml(arvore.avo_mm,'M-Mãe','#c00050')}</div>
          </div>`:''}
          ${geracoes>=3?`<div class="section-label">Bisavós</div>
          <div class="row" style="flex-wrap:wrap;gap:4px">
            ${[['bis_ppp','PP-Pai','#1a1a6e'],['bis_ppm','PP-Mãe','#1a1a6e'],['bis_pmp','PM-Pai','#3a7abf'],['bis_pmm','PM-Mãe','#3a7abf'],['bis_mpp','MP-Pai','#8b0000'],['bis_mpm','MP-Mãe','#8b0000'],['bis_mmp','MM-Pai','#c00050'],['bis_mmm','MM-Mãe','#c00050']].map(([k,l,c])=>`<div><div style="font-size:7px;color:${c};margin-bottom:2px">${l}</div>${nodeHtml(arvore[k],l,c,true)}</div>`).join('')}
          </div>`:''}
        </div>
      </div>
      <div class="footer">
        <span>Documento gerado pela ChampionsLoft · championsloft.app</span>
        <span>© ${new Date().getFullYear()} ${perfil?.nome||''}</span>
      </div>
      <script>window.onload=()=>{window.print()}</script>
    </body></html>`)
    w.document.close()
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
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize: mini ? 8 : 9, color:'#D4AF37', marginBottom: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{node.anilha||'—'}{node.externo ? ' 🌍' : ''}</div>
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
      <div className="section-header" id="pedigree-config-card">
        <div><div className="section-title">🌳 Pedigree</div></div>
        {arvore && <button className="btn btn-secondary btn-sm" onClick={imprimirPedigree}>🖨️ Imprimir / PDF</button>}
      </div>

      <div className="card card-p" id="pedigree-config-card" style={{ marginBottom: 16 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ display:'flex', gap:6, marginBottom:6, flexWrap:'wrap' }}>
              <select className="input" style={{ flex:1, fontSize:11 }} value={filtroPombal} onChange={e => setFiltroPombal(e.target.value)}>
                <option value="">Todos os pombais</option>
                {pombalsList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="input" style={{ width:100, fontSize:11 }} value={filtroSexo} onChange={e => setFiltroSexo(e.target.value)}>
                <option value="">♂♀ Todos</option>
                <option value="M">♂ Machos</option>
                <option value="F">♀ Fêmeas</option>
              </select>
            </div>
            <Field label="Seleccionar Pombo">
              <select className="input" value={pomboSel} onChange={e => selecionarPombo(e.target.value)}>
                <option value="">— Escolha um pombo —</option>
                {pombosFiltrados.map(p => (
                  <option key={p.id} value={p.id}>{p.sexo === 'M' ? '♂' : p.sexo === 'F' ? '♀' : '○'} {p.nome} ({p.anilha}){p.pombal ? ` · ${p.pombal}` : ''}</option>
                ))}
              </select>
            </Field>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
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
            {arvore && <button className="btn btn-primary btn-sm" onClick={async () => { try { await db.savePedigree(pomboSel, arvore); toast('Pedigree guardado!','ok') } catch(e) { toast('Erro: '+e.message,'err') } }}>💾 Guardar</button>}
          </div>
        </div>
      </div>

      {!arvore ? (
        <EmptyState icon="🌳" title="Seleccione um pombo" desc="Escolha o pombo principal para gerar o pedigree premium com até 4 gerações" />
      ) : (
        <div ref={printRef}>
          {/* Cabeçalho premium para impressão */}
          {/* Cabeçalho premium */}
          <div style={{ marginBottom:20, borderRadius:12, overflow:'hidden', border:'2px solid #D4AF37' }}>
            {/* Barra topo */}
            <div style={{ background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)', padding:'5px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <img src="/logo.png" alt="ChampionsLoft" style={{ height:28, objectFit:'contain' }}
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block' }} />
              <span style={{ display:'none', fontSize:13, fontWeight:900, color:'#050D1A', fontFamily:"'Fraunces',serif", letterSpacing:2 }}>CHAMPIONSLOFT</span>
              <div style={{ fontSize:10, color:'#050D1A', fontWeight:700, letterSpacing:.5 }}>PEDIGREE PREMIUM · championsloft.app</div>
            </div>
            {/* Corpo */}
            <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', padding:'14px 18px', display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{ display:'flex', gap:10, flexShrink:0, alignItems:'flex-start' }}>
                {perfil?.foto_perfil_url && (
                  <div style={{ textAlign:'center' }}>
                    <img src={perfil.foto_perfil_url} alt="" style={{ width:54, height:54, objectFit:'cover', borderRadius:'50%', border:'2px solid #D4AF37' }} />
                    <div style={{ fontSize:8, color:'#7A8699', marginTop:2 }}>Columbófilo</div>
                  </div>
                )}
                {perfil?.logo_url && (
                  <div style={{ textAlign:'center' }}>
                    <img src={perfil.logo_url} alt="" style={{ width:54, height:54, objectFit:'contain', borderRadius:8, border:'1px solid #1B2D52', background:'#fff' }} />
                    <div style={{ fontSize:8, color:'#7A8699', marginTop:2 }}>Logo</div>
                  </div>
                )}
                {!perfil?.logo_url && logoUrl && (
                  <div style={{ textAlign:'center' }}>
                    <img src={logoUrl} alt="" style={{ width:54, height:54, objectFit:'cover', borderRadius:8, border:'1px solid #1B2D52' }} />
                    <div style={{ fontSize:8, color:'#7A8699', marginTop:2 }}>Pombal</div>
                  </div>
                )}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:900, color:'#D4AF37', lineHeight:1 }}>PEDIGREE</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginTop:4 }}>{perfil?.nome || 'Columbófilo'}</div>
                {perfil?.pombal_nome && <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>🏠 {perfil.pombal_nome}{perfil?.pombal_morada ? ` · ${perfil.pombal_morada}` : ''}</div>}
                {perfil?.org && <div style={{ fontSize:11, color:'#7A8699', marginTop:1 }}>{perfil.org}{perfil.fed ? ` · ${perfil.fed}` : ''}</div>}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:9, color:'#7A8699', textTransform:'uppercase', letterSpacing:1 }}>Data de emissão</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{new Date().toLocaleDateString('pt-PT')}</div>
                <div style={{ fontSize:9, color:'#475569', marginTop:6 }}>Documento oficial</div>
                <div style={{ fontSize:9, color:'#475569' }}>ChampionsLoft © {new Date().getFullYear()}</div>
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
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
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
                        <div style={{ fontSize:8, color:cor, marginBottom:2, fontWeight:600 }}>{label}</div>
                        <PomboNode nodeKey={k} mini />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:9, color:'#475569', marginTop:6 }}>PP=Pai do Pai · PM=Pai da Mãe · MP=Mãe do Pai · MM=Mãe da Mãe · Pai/Mãe=sexo do bisavó</div>
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

          {/* Carregar da BD */}
          <div style={{ background:'rgba(76,141,255,.06)', border:'1px solid rgba(76,141,255,.15)', borderRadius:8, padding:'10px 12px' }}>
            <div style={{ fontSize:11, color:'#7A8699', marginBottom:6, fontWeight:600 }}>📋 CARREGAR DO EFECTIVO</div>
            <div style={{ display:'flex', gap:6, marginBottom:6 }}>
              <select className="input" style={{ flex:1, fontSize:11 }} value={filtroPombal}
                onChange={e => setFiltroPombal(e.target.value)}>
                <option value="">Todos os pombais</option>
                {pombalsList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="input" style={{ width:100, fontSize:11 }} value={filtroSexo}
                onChange={e => setFiltroSexo(e.target.value)}>
                <option value="">♂♀ Todos</option>
                <option value="M">♂ Machos</option>
                <option value="F">♀ Fêmeas</option>
              </select>
            </div>
            <select className="input" value=""
              onChange={e => {
                const p = pombos.find(x => x.id === e.target.value)
                if (p) setFormNode(f => ({ ...f, anilha: p.anilha||'', nome: p.nome||'', cor: p.cor||'', sexo: p.sexo||'', foto_url: f.foto_url || p.foto_url||'', conquistas: f.conquistas || `${p.provas||0} provas · percentil ${p.percentil||0}%`, externo: false }))
              }}>
              <option value="">— Seleccionar pombo —</option>
              {pombosFiltrados.map(p => <option key={p.id} value={p.id}>{p.sexo==='M'?'♂':p.sexo==='F'?'♀':'○'} {p.nome} ({p.anilha}){p.pombal?` · ${p.pombal}`:''}</option>)}
            </select>
          </div>

          {/* Opcao externo */}
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 12px', background:formNode.externo?'rgba(212,175,55,.08)':'#101F40', border:`1px solid ${formNode.externo?'rgba(212,175,55,.3)':'#1B2D52'}`, borderRadius:8 }}>
            <input type="checkbox" checked={!!formNode.externo} onChange={e => setFormNode(f=>({...f,externo:e.target.checked}))} style={{ accentColor:'#D4AF37', width:16, height:16 }} />
            <div>
              <div style={{ fontSize:12, fontWeight:600, color: formNode.externo?'#D4AF37':'#cbd5e1' }}>🌍 Ancestral externo ao pombal</div>
              <div style={{ fontSize:10, color:'#7A8699' }}>Pombo de outro criador, sem perfil na app — preencha os dados manualmente</div>
            </div>
          </label>

          <div style={{ fontSize:10, color:'#475569', textAlign:'center' }}>— ou preencha/edite manualmente —</div>

          <div className="form-grid">
            <Field label="Anilha"><input className="input" placeholder="PT-2020-00001" value={formNode.anilha} onChange={e => setFormNode(f=>({...f,anilha:e.target.value}))} /></Field>
            <Field label="Nome / Alcunha"><input className="input" placeholder="Ex: Zeus, Micaela..." value={formNode.nome} onChange={e => setFormNode(f=>({...f,nome:e.target.value}))} /></Field>
            <Field label="Cor"><input className="input" placeholder="Ex: Azul barrado" value={formNode.cor} onChange={e => setFormNode(f=>({...f,cor:e.target.value}))} /></Field>
            <Field label="Sexo">
              <select className="input" value={formNode.sexo||''} onChange={e => setFormNode(f=>({...f,sexo:e.target.value}))}>
                <option value="">—</option>
                <option value="M">♂ Macho</option>
                <option value="F">♀ Fêmea</option>
              </select>
            </Field>
            <Field label="Linhagem Genética">
              <select className="input" value={formNode.linhagem} onChange={e => setFormNode(f=>({...f,linhagem:e.target.value}))}>
                <option value="">— Seleccionar —</option>
                {LINHAS_GENETICAS.map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>
            {formNode.externo && <Field label="Criador / Origem"><input className="input" placeholder="Nome do criador ou país de origem" value={formNode.criador||''} onChange={e => setFormNode(f=>({...f,criador:e.target.value}))} /></Field>}
          </div>
          <Field label="🏆 Conquistas e Resultados">
            <textarea className="input" rows={3} style={{ resize:'none' }} placeholder="Ex: 1.º Velocidade Distrital 2023..." value={formNode.conquistas} onChange={e => setFormNode(f=>({...f,conquistas:e.target.value}))} />
          </Field>
          <Field label="📝 Descrição / Observações">
            <textarea className="input" rows={2} style={{ resize:'none' }} placeholder="Criador de origem, características especiais..." value={formNode.desc} onChange={e => setFormNode(f=>({...f,desc:e.target.value}))} />
          </Field>
          <Field label="🖼️ URL da Foto">
            <input className="input" placeholder="https://..." value={formNode.foto_url} onChange={e => setFormNode(f=>({...f,foto_url:e.target.value}))} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
