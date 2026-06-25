import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, Field, EmptyState } from '../components/ui'
import { BotaoQR } from '../components/QRCode'

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
  const { t } = useIdioma()
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

  // Pombo actualmente seleccionado
  const pomboPedigree = pombos.find(p => p.id === pomboSel) || null

  const selecionarPombo = async (id) => {
    setPomboSel(id)
    if (!id) { setArvore(null); return }

    // Construir árvore base a partir dos dados da DB
    const arvoreBase = construirArvore(id, pombos, {})
    if (!arvoreBase) { setArvore(null); return }

    // Carregar dados manuais do pombo principal
    let manual = {}
    try { manual = await db.getPedigree(id) || {} } catch {}
    if (!manual || !Object.keys(manual).length) {
      try { const local = localStorage.getItem(CHAVE_STORAGE + id); if (local) manual = JSON.parse(local) } catch {}
    }

    // Para cada nó da árvore que corresponde a um pombo real no efectivo,
    // carregar os dados manuais guardados para ESSE pombo (ancestrais em cascata)
    const nodos = ['pai','mae','avo_pp','avo_pm','avo_mp','avo_mm','bis_ppp','bis_ppm','bis_pmp','bis_pmm','bis_mpp','bis_mpm','bis_mmp','bis_mmm']
    const manuaisAncestral = {}

    await Promise.all(nodos.map(async (key) => {
      const node = arvoreBase[key]
      if (!node?.anilha) return
      // Encontrar o pombo real por anilha
      const pomboReal = pombos.find(p => p.anilha === node.anilha)
      if (!pomboReal) return
      // Carregar o pedigree guardado desse pombo ancestral
      let dadosAncestral = {}
      try { dadosAncestral = await db.getPedigree(pomboReal.id) || {} } catch {}
      if (!dadosAncestral || !Object.keys(dadosAncestral).length) {
        try { const local = localStorage.getItem(CHAVE_STORAGE + pomboReal.id); if (local) dadosAncestral = JSON.parse(local) } catch {}
      }
      // O nó 'pombo' do pedigree do ancestral contém os seus dados enriquecidos
      if (dadosAncestral.pombo) {
        manuaisAncestral[key] = { ...dadosAncestral.pombo }
      }
    }))

    // Mesclar: dados manuais do pombo principal + dados dos ancestrais
    const manualFinal = { ...manuaisAncestral, ...manual }
    const arvore = construirArvore(id, pombos, manualFinal)
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
    verificarConquistas(user?.id, { temPedigree:true }).catch(()=>{})
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
      const doc = new jsPDF({ orientation:'l', unit:'mm', format:[297,210], putOnlyUsedFonts:true, compress:true })
      const W = doc.internal.pageSize.getWidth()
      const H = doc.internal.pageSize.getHeight()

      const toB64 = url => new Promise(res => {
        if (!url) return res(null)
        const img = new Image(); img.crossOrigin = 'anonymous'
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.width; c.height = img.height
          c.getContext('2d').drawImage(img,0,0)
          try { res(c.toDataURL('image/jpeg',0.85)) } catch { res(null) }
        }
        img.onerror = () => res(null); img.src = url
      })

      const GOLD=[180,134,11], GOLD_L=[218,170,50], NAVY=[15,30,65], WHITE=[255,255,255]
      const LGREY=[210,218,228], GREEN=[0,105,65], BLUE_L=[40,80,175], RED_D=[130,20,20]

      // Carregar fotos — apenas pombo e pais
      const imgs = {}
      for (const k of ['pombo','pai','mae']) {
        if (arvore[k]?.foto_url) imgs[k] = await toB64(arvore[k].foto_url)
      }
      const fotoPerfilB64 = perfil?.foto_perfil_url ? await toB64(perfil.foto_perfil_url) : null
      const fotoPombalB64 = perfil?.foto_pombal_url ? await toB64(perfil.foto_pombal_url) : null

      // FUNDO BRANCO
      doc.setFillColor(...WHITE); doc.rect(0,0,W,H,'F')

      // ==========================================
      // BARRA TOPO — dourada sólida com texto
      // ==========================================
      doc.setFillColor(...GOLD); doc.rect(0,0,W,10,'F')
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
      doc.text('CHAMPIONSLOFT', 8, 7)
      doc.setFontSize(6); doc.setFont('helvetica','normal')
      doc.text('PEDIGREE PREMIUM  |  championsloft.app', W-8, 7, {align:'right'})

      // ==========================================
      // CABEÇALHO — fundo navy, borda dourada
      const HDR_H = 29
      doc.setFillColor(...NAVY); doc.rect(0,10,W,HDR_H,'F')
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.8); doc.rect(0,10,W,HDR_H)
      doc.setFillColor(...GOLD); doc.rect(0,10+HDR_H,W,1,'F')

      // Fotos centradas verticalmente
      const FOTO_SZ = 18
      const HY = 10 + (HDR_H - FOTO_SZ) / 2
      let fx = 10
      if (fotoPerfilB64) {
        doc.setDrawColor(...GOLD); doc.setLineWidth(0.8)
        doc.roundedRect(fx,HY,FOTO_SZ,FOTO_SZ,1.5,1.5,'S')
        doc.addImage(fotoPerfilB64,'JPEG',fx+0.5,HY+0.5,FOTO_SZ-1,FOTO_SZ-1)
        doc.setFontSize(4); doc.setFont('helvetica','normal'); doc.setTextColor(148,163,184)
        doc.text('Columbofilo', fx+FOTO_SZ/2, HY+FOTO_SZ+2.5, {align:'center'}); fx+=FOTO_SZ+5
      }
      if (fotoPombalB64) {
        doc.setDrawColor(60,90,140); doc.setLineWidth(0.5)
        doc.roundedRect(fx,HY,FOTO_SZ,FOTO_SZ,1.5,1.5,'S')
        doc.addImage(fotoPombalB64,'JPEG',fx+0.4,HY+0.4,FOTO_SZ-0.8,FOTO_SZ-0.8)
        doc.setFontSize(4); doc.setFont('helvetica','normal'); doc.setTextColor(148,163,184)
        doc.text('Pombal', fx+FOTO_SZ/2, HY+FOTO_SZ+2.5, {align:'center'}); fx+=FOTO_SZ+5
      }
      doc.setFillColor(...GOLD); doc.rect(fx+2,HY,0.7,FOTO_SZ,'F')
      const infoX = fx+6
      const midY = HY + FOTO_SZ/2
      doc.setFontSize(8.5); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255)
      doc.text(perfil?.nome||'', infoX, midY-4)
      doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(148,163,184)
      if (perfil?.pombal_nome) doc.text(perfil.pombal_nome+(perfil?.pombal_morada?' - '+perfil.pombal_morada:''), infoX, midY+2)
      if (perfil?.org) doc.text(perfil.org+(perfil?.fed?' - '+perfil.fed:''), infoX, midY+8)
      const pedigreeX = infoX + 85
      doc.setFontSize(26); doc.setFont('helvetica','bold'); doc.setTextColor(...GOLD)
      doc.text('PEDIGREE', pedigreeX, midY+5)
      doc.setFontSize(5.5); doc.setFont('helvetica','bold'); doc.setTextColor(...GOLD)
      doc.text('DATA DE EMISSAO', W-8, HY+5, {align:'right'})
      doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255)
      doc.text(new Date().toLocaleDateString('pt-PT'), W-8, HY+13, {align:'right'})
      doc.setFontSize(5); doc.setFont('helvetica','normal'); doc.setTextColor(71,85,105)
      doc.text('Documento oficial', W-8, HY+19, {align:'right'})
      doc.text('ChampionsLoft (c) '+new Date().getFullYear(), W-8, HY+24, {align:'right'})

      // ==========================================
      // LAYOUT: organograma (esq) + palmares (dir)
      // ==========================================
      const ORG_W = 207
      const PALM_X = 213
      const PALM_W = W - PALM_X - 5
      const TOP = 46, BOTTOM = H-9, AVAIL = BOTTOM-TOP, VPAD = 0.5

      // Divisor
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.4)
      doc.line(PALM_X-3, TOP-4, PALM_X-3, BOTTOM)

      // ==========================================
      // PALMARES
      // ==========================================
      const PY = TOP
      doc.setFillColor(...NAVY); doc.roundedRect(PALM_X,PY,PALM_W,7,1,1,'F')
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.5); doc.roundedRect(PALM_X,PY,PALM_W,7,1,1,'S')
      doc.setFontSize(6); doc.setFont('helvetica','bold'); doc.setTextColor(...GOLD)
      doc.text('PALMARES', PALM_X+PALM_W/2, PY+5, {align:'center'})

      const topPombos = (pombos||[]).slice().sort((a,b)=>(b.percentil||0)-(a.percentil||0)).slice(0,4)
      doc.setFontSize(5); doc.setFont('helvetica','bold'); doc.setTextColor(100,108,135)
      doc.text('TOP POMBOS DO EFECTIVO', PALM_X+1, PY+12)
      doc.setDrawColor(...LGREY); doc.setLineWidth(0.15); doc.line(PALM_X+1,PY+13.5,PALM_X+PALM_W-1,PY+13.5)
      topPombos.forEach((p,i)=>{
        const cor=i===0?GOLD:i<3?NAVY:[110,118,145]
        const pos=['1.','2.','3.','4.']
        doc.setFontSize(5.5); doc.setFont('helvetica',i===0?'bold':'normal'); doc.setTextColor(...cor)
        doc.text(pos[i]+' '+p.nome, PALM_X+1, PY+17+i*7)
        doc.setFontSize(4.5); doc.setFont('helvetica','normal'); doc.setTextColor(140,148,170)
        doc.text(String(p.percentil||0)+'% percentil  |  '+String(p.provas||0)+' provas', PALM_X+4, PY+20.5+i*7)
      })

      const sepY = PY+46
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.line(PALM_X+1,sepY,PALM_X+PALM_W-1,sepY)
      doc.setFontSize(5); doc.setFont('helvetica','bold'); doc.setTextColor(100,108,135)
      doc.text('CONQUISTAS PESSOAIS', PALM_X+1, sepY+5)
      doc.setDrawColor(...LGREY); doc.setLineWidth(0.15); doc.line(PALM_X+1,sepY+6.5,PALM_X+PALM_W-1,sepY+6.5)

      const conquistas = perfil?.conquistas||[]
      if (conquistas.length>0) {
        conquistas.slice(0,9).forEach((c,i)=>{
          doc.setFontSize(5); doc.setFont('helvetica','normal'); doc.setTextColor(...NAVY)
          doc.text('- '+String(c).substring(0,30), PALM_X+1, sepY+11+i*7)
        })
      } else {
        for(let i=0;i<9;i++){
          doc.setDrawColor(190,200,215); doc.setLineWidth(0.2)
          doc.line(PALM_X+1,sepY+11+i*7,PALM_X+PALM_W-1,sepY+11+i*7)
        }
        doc.setFontSize(4); doc.setTextColor(175,182,200)
        doc.text('Adicione conquistas em Perfil > Palmares', PALM_X+PALM_W/2, BOTTOM-4, {align:'center'})
      }

      // ==========================================
      // ORGANOGRAMA
      // ==========================================
      // Colunas com espaço entre elas
      const C0W=36, GAP=2, COL_GAP=5
      const rest=ORG_W-C0W-GAP*3-COL_GAP*2-8
      const C3W = geracoes>=3 ? Math.round(rest*0.22) : 0
      const C1W = geracoes>=3 ? Math.round(rest*0.36) : Math.round(rest*0.47)
      const C2W = geracoes>=3 ? Math.round(rest*0.24) : rest - C1W
      const C0X=7, C1X=C0X+C0W+GAP+6, C2X=C1X+C1W+GAP+COL_GAP, C3X=geracoes>=3?C2X+C2W+GAP+COL_GAP:0

      // Labels gerações
      const gL=(t,x)=>{ doc.setFontSize(4.8); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY); doc.text(t,x,TOP-1) }
      gL('POMBO',C0X); gL('PAIS',C1X)
      if(geracoes>=2) gL('AVOS',C2X)
      if(geracoes>=3) gL('BISAVOS',C3X)

      // Linhas divisórias
      doc.setDrawColor(220,226,235); doc.setLineWidth(0.15)
      ;[C1X,C2X,C3X].filter(Boolean).forEach(x=>doc.line(x-1.5,TOP-2,x-1.5,BOTTOM))

      const drawBox = (nodeKey,x,y,w,h,tipo,showFoto=false) => {
        const node=typeof nodeKey==='string'?arvore[nodeKey]:null
        if(!node) return
        const isEmpty=!node.nome&&!node.anilha
        const bh=h-VPAD*2, by=y+VPAD
        const bc=tipo==='main'?GOLD:tipo==='pai_p'?[35,70,165]:tipo==='pai_m'?[130,20,20]:
                 tipo==='avo_pp'||tipo==='avo_pm'?[60,105,195]:tipo==='avo_mp'||tipo==='avo_mm'?[155,35,35]:[140,150,175]
        const bgCol = tipo==='main'?[255,252,235]:tipo==='pai_p'?[235,242,255]:tipo==='pai_m'?[255,238,238]:
                      tipo==='avo_pp'||tipo==='avo_pm'?[238,244,255]:tipo==='avo_mp'||tipo==='avo_mm'?[255,240,240]:[244,245,248]
        // 1. Fundo colorido claro
        doc.setFillColor(...bgCol); doc.setDrawColor(...bc)
        doc.setLineWidth(tipo==='main'?0.7:0.4)
        doc.roundedRect(x,by,w,bh,1.5,1.5,'FD')
        // 2. Faixa colorida no topo (sobre o fundo, dentro da borda)
        doc.setFillColor(...bc)
        doc.roundedRect(x+0.2,by+0.2,w-0.4,5,1.3,1.3,'F')
        doc.rect(x+0.2,by+3,w-0.4,2.4,'F')
        if(isEmpty){ doc.setFontSize(5); doc.setTextColor(185,192,210); doc.text('—',x+w/2,by+bh/2+2,{align:'center'}); return }
        let ty=by+7
        // Foto apenas para pombo e pais, e só se showFoto
        if(showFoto && imgs[nodeKey]) {
          const fh=Math.min(18,bh-18)
          if(fh>6){ doc.addImage(imgs[nodeKey],'JPEG',x+1.5,ty,w-3,fh); ty+=fh+1.5 }
        }
        if(node.anilha){ doc.setFontSize(tipo==='main'?6:4.8); doc.setFont('courier','bold'); doc.setTextColor(...GOLD); doc.text(node.anilha.substring(0,20),x+2.5,ty); ty+=3.2 }
        if(node.nome){ const fs=tipo==='main'?8.5:bh>20?7:6; doc.setFontSize(fs); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY); doc.text(node.nome.substring(0,17),x+2.5,ty); ty+=fs*0.42+1.8 }
        if(node.cor&&ty<by+bh-3){ doc.setFontSize(5); doc.setFont('helvetica','normal'); doc.setTextColor(95,108,138); doc.text(node.cor.substring(0,20),x+2.5,ty); ty+=3.2 }
        if(node.linhagem&&ty<by+bh-3){ doc.setFontSize(4.8); doc.setTextColor(...BLUE_L); doc.text(node.linhagem.substring(0,20),x+2.5,ty); ty+=3 }
        if(node.conquistas&&ty<by+bh-2){ doc.setFontSize(4.5); doc.setTextColor(...GREEN); doc.text(node.conquistas.substring(0,34),x+2.5,ty,{maxWidth:w-4}) }
        if(node.externo){ doc.setFontSize(4); doc.setTextColor(165,75,25); doc.text('Ext.',x+w-3,by+bh-2) }
      }

      const conn=(x1,y1,x2,y2,col=LGREY)=>{
        doc.setDrawColor(...col); doc.setLineWidth(0.3)
        const mx=x1+(x2-x1)*0.55
        doc.lines([[mx-x1,0],[0,y2-y1],[x2-mx,0]],x1,y1)
      }

      // Pombo principal
      const mainCY=(TOP+BOTTOM)/2
      const mainH=Math.min(55,AVAIL*0.75)
      drawBox('pombo',C0X,mainCY-mainH/2,C0W,mainH,'main',true)
      const midX0=C0X+C0W

      // Pais — com fotos
      drawBox('pai',C1X,TOP,C1W,AVAIL/2,'pai_p',true)
      conn(midX0,mainCY,C1X,TOP+AVAIL/4,[...BLUE_L])
      drawBox('mae',C1X,TOP+AVAIL/2,C1W,AVAIL/2,'pai_m',true)
      conn(midX0,mainCY,C1X,TOP+3*AVAIL/4,[...RED_D])

      // Avós — sem fotos
      if(geracoes>=2){
        const avos=[['avo_pp','avo_pp'],['avo_pm','avo_pm'],['avo_mp','avo_mp'],['avo_mm','avo_mm']]
        avos.forEach(([k,tipo],i)=>{
          drawBox(k,C2X,TOP+i*AVAIL/4,C2W,AVAIL/4,tipo,false)
          conn(C1X+C1W,i<2?TOP+AVAIL/4:TOP+3*AVAIL/4,C2X,TOP+(i+0.5)*AVAIL/4,i<2?[...BLUE_L]:[...RED_D])
        })
      }

      // Bisavós — sem fotos, boxes mais pequenos
      if(geracoes>=3){
        const bisData=[
          ['bis_ppp','PP-P',[50,90,190]],['bis_ppm','PP-M',[50,90,190]],
          ['bis_pmp','PM-P',[80,130,215]],['bis_pmm','PM-M',[80,130,215]],
          ['bis_mpp','MP-P',[150,30,30]],['bis_mpm','MP-M',[150,30,30]],
          ['bis_mmp','MM-P',[185,55,85]],['bis_mmm','MM-M',[185,55,85]]
        ]
        const avoP=[0,0,1,1,2,2,3,3]
        bisData.forEach(([k,lbl,bc],i)=>{
          const bisH=AVAIL/8
          const by2=TOP+i*bisH+VPAD, bh2=bisH-VPAD*2
          const node=arvore[k], isEmpty=!node?.nome&&!node?.anilha
          // Fundo ligeiramente colorido para bisavós
          const bisBg = i<4?[242,246,255]:[255,244,244]
          doc.setFillColor(...bisBg); doc.setDrawColor(...bc); doc.setLineWidth(0.35)
          doc.roundedRect(C3X,by2,C3W,bh2,1.2,1.2,'FD')
          // Faixa topo dentro da borda
          doc.setFillColor(...bc)
          doc.roundedRect(C3X+0.2,by2+0.2,C3W-0.4,4,1,1,'F')
          doc.rect(C3X+0.2,by2+2.5,C3W-0.4,1.9,'F')
          doc.setFontSize(4); doc.setFont('helvetica','bold'); doc.setTextColor(...WHITE)
          doc.text(lbl,C3X+C3W/2,by2+3.2,{align:'center'})
          if(!isEmpty){
            let ty=by2+5.5
            if(node.anilha){ doc.setFontSize(4.5); doc.setFont('courier','bold'); doc.setTextColor(...GOLD); doc.text(node.anilha.substring(0,16),C3X+1.5,ty); ty+=2.8 }
            if(node.nome){ doc.setFontSize(5.5); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY); doc.text(node.nome.substring(0,13),C3X+1.5,ty); ty+=3.2 }
            if(node.cor&&ty<by2+bh2-1){ doc.setFontSize(4.2); doc.setFont('helvetica','normal'); doc.setTextColor(95,108,138); doc.text(node.cor.substring(0,14),C3X+1.5,ty) }
          } else { doc.setFontSize(4.5); doc.setTextColor(185,192,210); doc.text('—',C3X+C3W/2,by2+bh2/2+1,{align:'center'}) }
          conn(C2X+C2W,TOP+(avoP[i]+0.5)*AVAIL/4,C3X,TOP+(i+0.5)*AVAIL/8,avoP[i]<2?[100,130,200]:[180,60,60])
        })
      }

      // RODAPÉ
      doc.setFillColor(...NAVY); doc.rect(0,H-9,W,9,'F')
      doc.setFillColor(...GOLD); doc.rect(0,H-9,W,0.6,'F')
      doc.setFontSize(5); doc.setFont('helvetica','normal'); doc.setTextColor(150,165,200)
      doc.text('Documento gerado pela ChampionsLoft - championsloft.app', 8, H-3.5)
      doc.setTextColor(...GOLD)
      doc.text('(c) '+new Date().getFullYear()+' '+(perfil?.nome||''), W-8, H-3.5, {align:'right'})

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
        {arvore && pomboPedigree?.id && (
          <BotaoQR
            titulo={`Pedigree — ${pomboPedigree.nome}`}
            conteudo={`${window.location.origin}/p/${perfil?.slug || ''}#pedigree/${pomboPedigree.anilha}`}
            subtitulo={`${pomboPedigree.nome} · ${pomboPedigree.anilha}`}
          />
        )}
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
          {/* Cabeçalho premium — semelhante ao PDF */}
          <div style={{ marginBottom:20, borderRadius:12, overflow:'hidden', border:'1px solid #D4AF37' }}>
            {/* Barra topo dourada */}
            <div style={{ background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)', padding:'5px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <img src="/logo.png" alt="" style={{ height:24, objectFit:'contain' }} onError={e=>e.target.style.display='none'} />
                <span style={{ fontSize:12, fontWeight:900, color:'#050D1A', letterSpacing:2, fontFamily:"'Fraunces',serif" }}>CHAMPIONSLOFT</span>
              </div>
              <span style={{ fontSize:9, color:'#050D1A', fontWeight:700 }}>PEDIGREE PREMIUM · championsloft.app</span>
            </div>
            {/* Corpo escuro */}
            <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', padding:'14px 18px', display:'flex', gap:14, alignItems:'center' }}>
              <div style={{ display:'flex', gap:10, flexShrink:0 }}>
                {perfil?.foto_perfil_url && (
                  <div style={{ textAlign:'center' }}>
                    <img src={perfil.foto_perfil_url} alt="" style={{ width:52, height:52, objectFit:'cover', borderRadius:'50%', border:'2px solid #D4AF37' }} />
                    <div style={{ fontSize:7, color:'#7A8699', marginTop:2 }}>Columbófilo</div>
                  </div>
                )}
                {perfil?.foto_pombal_url && (
                  <div style={{ textAlign:'center' }}>
                    <img src={perfil.foto_pombal_url} alt="" style={{ width:52, height:52, objectFit:'cover', borderRadius:8, border:'1px solid #1B2D52' }} />
                    <div style={{ fontSize:7, color:'#7A8699', marginTop:2 }}>Pombal</div>
                  </div>
                )}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:900, color:'#D4AF37', lineHeight:1 }}>PEDIGREE</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginTop:4 }}>{perfil?.nome || 'Columbófilo'}</div>
                {perfil?.pombal_nome && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>🏠 {perfil.pombal_nome}{perfil?.pombal_morada ? ` · ${perfil.pombal_morada}` : ''}</div>}
                {perfil?.org && <div style={{ fontSize:10, color:'#7A8699', marginTop:1 }}>{perfil.org}{perfil.fed ? ` · ${perfil.fed}` : ''}</div>}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:8, color:'#7A8699', textTransform:'uppercase', letterSpacing:1 }}>Data de emissão</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{new Date().toLocaleDateString('pt-PT')}</div>
                <div style={{ fontSize:8, color:'#475569', marginTop:4 }}>Documento oficial</div>
                <div style={{ fontSize:8, color:'#475569' }}>ChampionsLoft © {new Date().getFullYear()}</div>
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
      {modalNode && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:0 }} onClick={e => e.target===e.currentTarget&&setModalNode(null)}>
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:560, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #1B2D52', flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#fff', fontFamily:"'Fraunces',serif" }}>✏️ Editar Ancestral</div>
              <button onClick={() => setModalNode(null)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:22, lineHeight:1 }}>×</button>
            </div>
            {/* Body scrollável */}
            <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:12 }}>

              {/* Botão Ver Pedigree do ancestral */}
              {formNode.anilha && pombos.find(p => p.anilha === formNode.anilha) && (
                <button onClick={() => {
                  const p = pombos.find(x => x.anilha === formNode.anilha)
                  if (p) { setModalNode(null); selecionarPombo(p.id) }
                }} style={{ background:'linear-gradient(135deg,rgba(212,175,55,.12),rgba(212,175,55,.06))', border:'1px solid rgba(212,175,55,.3)', borderRadius:10, padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontFamily:'inherit' }}>
                  <span style={{ fontSize:18 }}>🌳</span>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#D4AF37' }}>Ver Pedigree de {formNode.nome||formNode.anilha}</div>
                    <div style={{ fontSize:10, color:'#7A8699' }}>Navegar para a árvore genealógica deste ancestral</div>
                  </div>
                  <span style={{ marginLeft:'auto', color:'#D4AF37', fontSize:16 }}>→</span>
                </button>
              )}

              {/* Carregar da BD */}
              <div style={{ background:'rgba(76,141,255,.08)', border:'1px solid rgba(76,141,255,.15)', borderRadius:8, padding:'10px 12px' }}>
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

              {/* Opção externo */}
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 12px', background:formNode.externo?'rgba(212,175,55,.08)':'rgba(16,31,64,.8)', border:`1px solid ${formNode.externo?'rgba(212,175,55,.3)':'#1B2D52'}`, borderRadius:8 }}>
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
            {/* Footer */}
            <div style={{ padding:'14px 20px', borderTop:'1px solid #1B2D52', display:'flex', justifyContent:'flex-end', gap:10, flexShrink:0, background:'#0B1830' }}>
              <button className="btn btn-secondary" onClick={() => setModalNode(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarNode}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
