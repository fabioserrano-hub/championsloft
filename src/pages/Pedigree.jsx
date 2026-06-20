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
      setLogoUrl(pf?.logo_url || '')  // logo pessoal do columbófilo (não a foto do pombal)
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

  const gerarPDF = async () => {
    if (!arvore) return
    toast('A gerar PDF...', 'ok')
    try {
      await new Promise((res, rej) => {
        if (window.jspdf) return res()
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        s.onload = res; s.onerror = rej; document.head.appendChild(s)
      })
      const { jsPDF } = window.jspdf
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = 297, H = 210

      const toB64 = (url) => new Promise(res => {
        if (!url) return res(null)
        const img = new Image(); img.crossOrigin = 'anonymous'
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.width; c.height = img.height
          c.getContext('2d').drawImage(img, 0, 0)
          try { res(c.toDataURL('image/jpeg', 0.85)) } catch { res(null) }
        }
        img.onerror = () => res(null); img.src = url
      })

      const GOLD=[180,134,11], NAVY=[15,30,65], WHITE=[255,255,255]
      const LGREY=[210,218,228], GREEN=[0,105,65], BLUE_L=[40,80,175], RED_D=[130,20,20]

      // Carregar imagens
      const allNodes = ['pombo','pai','mae','avo_pp','avo_pm','avo_mp','avo_mm',
        'bis_ppp','bis_ppm','bis_pmp','bis_pmm','bis_mpp','bis_mpm','bis_mmp','bis_mmm']
      const imgs = {}
      await Promise.all(allNodes.map(async k => {
        if (arvore[k]?.foto_url) imgs[k] = await toB64(arvore[k].foto_url)
      }))
      const fotoPerfilB64 = perfil?.foto_perfil_url ? await toB64(perfil.foto_perfil_url) : null
      const logoB64 = logoUrl ? await toB64(logoUrl) : null  // logo pessoal do columbófilo
      const fotoPombalB64 = perfil?.foto_pombal_url ? await toB64(perfil.foto_pombal_url) : null

      // FUNDO
      doc.setFillColor(...WHITE); doc.rect(0,0,W,H,'F')

      // BARRA TOPO
      doc.setFillColor(...NAVY); doc.rect(0,0,W,10,'F')
      doc.setFillColor(...GOLD); doc.rect(0,9.5,W,0.8,'F')
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(...GOLD)
      doc.text('CHAMPIONSLOFT', 7, 7)
      doc.setFontSize(5.5); doc.setFont('helvetica','normal'); doc.setTextColor(170,185,210)
      doc.text('PEDIGREE PREMIUM · championsloft.app', W-7, 7, {align:'right'})

      // === CABEÇALHO PREMIUM ===
      // Fundo do cabeçalho com gradiente simulado
      doc.setFillColor(248,249,252); doc.rect(0,10,W,32,'F')
      doc.setDrawColor(...LGREY); doc.setLineWidth(0.3); doc.line(0,42,W,42)

      // Linha dourada decorativa
      doc.setFillColor(...GOLD); doc.rect(7,13,2,26,'F')

      let hx = 12; const hy = 13
      // Foto do columbófilo (circular com borda dourada)
      if (fotoPerfilB64) {
        doc.setFillColor(...GOLD); doc.circle(hx+8,hy+8,8.5,'F')
        doc.addImage(fotoPerfilB64,'JPEG',hx+0.5,hy+0.5,16,16)
        doc.setFontSize(4); doc.setTextColor(150,155,170)
        doc.text('Columbófilo', hx+8, hy+19, {align:'center'})
        hx += 22
      }
      // Logo do columbófilo (se tiver)
      if (logoB64) {
        doc.setFillColor(...[240,242,246]); doc.roundedRect(hx,hy,16,16,1,1,'F')
        doc.addImage(logoB64,'JPEG',hx+0.5,hy+0.5,15,15)
        doc.setFontSize(4); doc.setTextColor(150,155,170)
        doc.text('Logo', hx+8, hy+19, {align:'center'})
        hx += 22
      }

      // Info do columbófilo
      const infoX = hx + 3
      doc.setFontSize(15); doc.setFont('helvetica','bold'); doc.setTextColor(...GOLD)
      doc.text('PEDIGREE', infoX, hy+8)
      doc.setFontSize(9.5); doc.setTextColor(...NAVY)
      doc.text(perfil?.nome||'', infoX, hy+14)
      doc.setFontSize(6.5); doc.setFont('helvetica','normal'); doc.setTextColor(70,85,130)
      let iy = hy+19
      if (perfil?.pombal_nome) { doc.text(perfil.pombal_nome+(perfil?.pombal_morada?' · '+perfil.pombal_morada:''), infoX, iy); iy+=4 }
      if (perfil?.org) { doc.setTextColor(120,128,155); doc.text(perfil.org+(perfil?.fed?' · '+perfil.fed:''), infoX, iy) }

      // Data (canto direito)
      doc.setFontSize(5.5); doc.setFont('helvetica','bold'); doc.setTextColor(140,148,168)
      doc.text('DATA DE EMISSÃO', W-7, hy+6, {align:'right'})
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
      doc.text(new Date().toLocaleDateString('pt-PT'), W-7, hy+13, {align:'right'})
      doc.setFontSize(5); doc.setFont('helvetica','normal'); doc.setTextColor(165,170,185)
      doc.text('Documento oficial', W-7, hy+19, {align:'right'})
      doc.text('ChampionsLoft © '+new Date().getFullYear(), W-7, hy+23, {align:'right'})

      // === LAYOUT RAMIFICADO ===
      // Disposição clássica de pedigree: pombo à esquerda, ramifica para a direita
      // Col 0 (pombo): x=7, Col 1 (pais): x=58, Col 2 (avós): x=148, Col 3 (bisavós): x=208
      const TOP = hy + 28
      const BOTTOM = H - 12

      // Alturas de cada linha por geração
      // Geração 2 (pais): 2 rows
      // Geração 3 (avós): 4 rows
      // Geração 4 (bisavós): 8 rows (só se geracoes>=3)
      const nBis = geracoes >= 3 ? 8 : 0
      const nAvo = geracoes >= 2 ? 4 : 2
      const AVAIL = BOTTOM - TOP
      const rowH_bis = nBis > 0 ? AVAIL / 8 : 0
      const rowH_avo = nBis > 0 ? rowH_bis * 2 : AVAIL / 4
      const rowH_pai = rowH_avo * 2

      // Larguras das colunas
      const C0W = 46  // pombo principal
      const C1W = geracoes>=3 ? 44 : 54  // pais
      const C2W = geracoes>=3 ? 40 : 50  // avós
      const C3W = geracoes>=3 ? 32 : 0   // bisavós
      const GAP = 4
      const C0X = 7
      const C1X = C0X + C0W + GAP + 8
      const C2X = C1X + C1W + GAP + 6
      const C3X = geracoes>=3 ? C2X + C2W + GAP + 4 : 0

      // Margem vertical de cada box
      const VPAD = 1

      // Centro Y de cada slot
      const cY = (row, total) => TOP + (row + 0.5) * (AVAIL / total)

      const drawBox = (nodeKey, x, y, w, h, tipo='normal') => {
        const node = typeof nodeKey==='string' ? arvore[nodeKey] : null
        if (!node) return
        const isEmpty = !node.nome && !node.anilha
        const bh = h - VPAD*2
        const by = y + VPAD
        // Sombra
        doc.setFillColor(195,205,220); doc.roundedRect(x+0.8,by+0.8,w,bh,2,2,'F')
        // Fundo branco
        doc.setFillColor(...WHITE)
        const bc = tipo==='main'?GOLD:tipo==='pai_p'?[35,70,165]:tipo==='pai_m'?[130,20,20]:
                   tipo==='avo_pp'||tipo==='avo_pm'?[60,105,195]:tipo==='avo_mp'||tipo==='avo_mm'?[155,35,35]:
                   [160,170,190]
        doc.setDrawColor(...bc); doc.setLineWidth(tipo==='main'?0.7:0.35)
        doc.roundedRect(x,by,w,bh,2,2,'FD')
        // Barra lateral colorida com gradiente simulado
        doc.setFillColor(...bc)
        doc.roundedRect(x,by,1.8,bh,1,1,'F')
        // Faixa de titulo no topo do box
        if (!isEmpty && bh > 20) {
          doc.setFillColor(...bc.map(v=>Math.min(255,v+140)))
          doc.rect(x+1.8,by,w-1.8,4,'F')
        }

        if (isEmpty) {
          doc.setFontSize(5); doc.setTextColor(185,192,208)
          doc.text('—', x+w/2, by+bh/2+1.5, {align:'center'}); return
        }

        let ty = by + (bh>20?5.5:3.5)
        // Foto
        const foto = imgs[typeof nodeKey==='string'?nodeKey:null]
        const fotoH = bh > 32 ? (bh > 45 ? 22 : 16) : bh > 22 ? 10 : 0
        if (foto && fotoH > 0) {
          doc.addImage(foto,'JPEG',x+2,ty,w-4,fotoH)
          // Linha fina abaixo da foto
          doc.setDrawColor(...LGREY); doc.setLineWidth(0.2)
          doc.line(x+2,ty+fotoH+0.5,x+w-2,ty+fotoH+0.5)
          ty += fotoH + 2
        }
        // Anilha
        if (node.anilha) {
          doc.setFontSize(tipo==='main'?6:4.5); doc.setFont('courier','bold'); doc.setTextColor(...GOLD)
          doc.text(node.anilha.substring(0,20), x+2.8, ty); ty+=3.2
        }
        // Nome
        if (node.nome) {
          const fs = tipo==='main'?8.5:bh>28?7:bh>18?6:5.5
          doc.setFontSize(fs); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
          doc.text(node.nome.substring(0,16), x+2.8, ty); ty+=fs*0.45+1.8
        }
        // Cor
        if (node.cor && bh>20) {
          doc.setFontSize(4.5); doc.setFont('helvetica','normal'); doc.setTextColor(95,105,135)
          doc.text(node.cor.substring(0,20), x+2.8, ty); ty+=3
        }
        // Linhagem
        if (node.linhagem && bh>26) {
          doc.setFontSize(4.5); doc.setTextColor(...[35,70,165])
          doc.text(node.linhagem.substring(0,20), x+2.8, ty); ty+=3
        }
        // Conquistas
        if (node.conquistas && ty < by+bh-3) {
          doc.setFontSize(4.2); doc.setTextColor(...GREEN)
          doc.text(node.conquistas.substring(0,38), x+2.8, ty, {maxWidth:w-5})
        }
        // Externo
        if (node.externo) {
          doc.setFontSize(4); doc.setTextColor(165,75,25)
          doc.text('Ext.', x+w-3.5, by+bh-2)
        }
      }

      // Linhas de conexão curvas premium
      const connectLine = (x1,y1,x2,y2,col) => {
        doc.setDrawColor(...col); doc.setLineWidth(0.3)
        const mx = x1 + (x2-x1)*0.5
        doc.lines([[mx-x1,0],[0,y2-y1],[x2-mx,0]], x1, y1)
      }

      // Pombo principal — centrado verticalmente
      const mainCY = (TOP+BOTTOM)/2
      const mainH = Math.min(70, AVAIL*0.85)
      drawBox('pombo', C0X, mainCY-mainH/2, C0W, mainH, 'main')
      const mainMidX = C0X + C0W
      const mainMidY = mainCY

      // PAI
      const paiCY = cY(0, 2)
      const paiH = rowH_pai - VPAD*2
      drawBox('pai', C1X, TOP + 0*(AVAIL/2), C1W, AVAIL/2, 'pai_p')
      connectLine(mainMidX, mainMidY, C1X, TOP + AVAIL/4, [...BLUE_L, 0.5])

      // MÃE
      drawBox('mae', C1X, TOP + AVAIL/2, C1W, AVAIL/2, 'pai_m')
      connectLine(mainMidX, mainMidY, C1X, TOP + 3*AVAIL/4, [...RED_D, 0.5])

      // AVÓS (só se geracoes >= 2)
      if (geracoes >= 2) {
        const avoSlots = [
          ['avo_pp','avo_pp',0,4], ['avo_pm','avo_pm',1,4],
          ['avo_mp','avo_mp',2,4], ['avo_mm','avo_mm',3,4]
        ]
        avoSlots.forEach(([k,tipo,row,total]) => {
          const acY = TOP + (row+0.5)*(AVAIL/total)
          drawBox(k, C2X, TOP+row*(AVAIL/4), C2W, AVAIL/4, tipo)
          // Linha da coluna de pais
          const parentMidX = C1X + C1W
          const parentMidY = row < 2 ? TOP + AVAIL/4 : TOP + 3*AVAIL/4
          const col = row<2?[...BLUE_L]:[ ...RED_D]
          connectLine(parentMidX, parentMidY, C2X, acY, col)
        })
      }

      // BISAVÓS
      if (geracoes >= 3) {
        const bisSlots = [
          ['bis_ppp',0],['bis_ppm',1],['bis_pmp',2],['bis_pmm',3],
          ['bis_mpp',4],['bis_mpm',5],['bis_mmp',6],['bis_mmm',7]
        ]
        const avoParent = [0,0,1,1,2,2,3,3] // qual avô é o pai
        bisSlots.forEach(([k,row]) => {
          const bcY = TOP + (row+0.5)*(AVAIL/8)
          drawBox(k, C3X, TOP+row*(AVAIL/8), C3W, AVAIL/8)
          // Linha do avô
          const avoRow = avoParent[row]
          const avoMidX = C2X + C2W
          const avoMidY = TOP + (avoRow+0.5)*(AVAIL/4)
          const col = avoRow<2?[100,130,200]:[180,60,60]
          connectLine(avoMidX, avoMidY, C3X, bcY, col)
        })
        // Labels bisavós
        const bisLabels = ['PP-Pai','PP-Mãe','PM-Pai','PM-Mãe','MP-Pai','MP-Mãe','MM-Pai','MM-Mãe']
        bisLabels.forEach((l,i) => {
          const bcY = TOP + (i+0.5)*(AVAIL/8)
          doc.setFontSize(3.8); doc.setFont('helvetica','bold')
          const col = i<4?[60,100,190]:[150,30,30]
          doc.setTextColor(...col)
          doc.text(l, C3X+C3W/2, TOP+i*(AVAIL/8)+1.5, {align:'center'})
        })
      }

      // Labels gerações
      doc.setFontSize(5); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
      doc.text('POMBO', C0X, TOP-1)
      doc.text('PAIS', C1X, TOP-1)
      if (geracoes>=2) doc.text('AVÓS', C2X, TOP-1)
      if (geracoes>=3) doc.text('BISAVÓS', C3X, TOP-1)

      // RODAPÉ
      doc.setFillColor(...NAVY); doc.rect(0,H-9,W,9,'F')
      doc.setFillColor(...GOLD); doc.rect(0,H-9,W,0.7,'F')
      doc.setFontSize(5); doc.setFont('helvetica','normal'); doc.setTextColor(150,165,200)
      doc.text('Documento gerado pela ChampionsLoft · championsloft.app', 7, H-3.5)
      doc.setTextColor(...GOLD)
      doc.text('© '+new Date().getFullYear()+' '+(perfil?.nome||''), W-7, H-3.5, {align:'right'})

      doc.save('pedigree-'+(arvore.pombo.nome||'pombo')+'.pdf')
      toast('PDF gerado!', 'ok')
    } catch(e) {
      toast('Erro: '+e.message, 'err')
    }
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
        {arvore && <button className="btn btn-primary btn-sm" onClick={gerarPDF}>📥 Descarregar PDF</button>}
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
