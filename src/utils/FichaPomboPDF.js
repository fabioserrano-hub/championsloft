// src/utils/FichaPomboPDF.js
// Ficha Premium Fly2Win — jsPDF, sem emojis, layout 2 paginas
import jsPDF from 'jspdf'

const C = {
  void:   [2,   5,   9],
  ocean:  [10,  26,  46],
  steel:  [17,  32,  54],
  panel:  [11,  20,  38],
  gold:   [200, 168, 75],
  goldD:  [122, 96,  32],
  goldL:  [240, 210, 130],
  white:  [240, 237, 232],
  fog:    [136, 153, 170],
  ghost:  [68,  85,  102],
  teal:   [45,  212, 167],
  red:    [248, 113, 113],
  blue:   [76,  141, 255],
  purple: [168, 85,  247],
  amber:  [245, 158, 11],
}

const W = 210, H = 297
const PAD = 12

// helpers
const safe = v => (v === null || v === undefined) ? '' : String(v)
const fill = (doc, col) => doc.setFillColor(...col)
const stroke = (doc, col) => doc.setDrawColor(...col)
const txt = (doc, col) => doc.setTextColor(...col)
const font = (doc, size, style='normal') => { doc.setFontSize(size); doc.setFont('helvetica', style) }

function rect(doc, x, y, w, h, col, r=0) {
  fill(doc, col)
  if (r > 0) doc.roundedRect(x, y, w, h, r, r, 'F')
  else doc.rect(x, y, w, h, 'F')
}

function line(doc, x1, y1, x2, y2, col, lw=0.3) {
  doc.setLineWidth(lw)
  stroke(doc, col)
  doc.line(x1, y1, x2, y2)
}

function secTitle(doc, label, y) {
  font(doc, 7, 'bold')
  txt(doc, C.gold)
  doc.text(label.toUpperCase(), PAD, y)
  line(doc, PAD, y+1.5, W-PAD, y+1.5, C.goldD, 0.2)
  return y + 6
}

function kpiBox(doc, x, y, w, h, value, label, cor) {
  rect(doc, x, y, w, h, C.panel, 3)
  font(doc, 14, 'bold')
  txt(doc, cor)
  doc.text(safe(value), x + w/2, y + h/2 + 1, { align:'center' })
  font(doc, 6, 'normal')
  txt(doc, C.fog)
  doc.text(label.toUpperCase(), x + w/2, y + h - 3, { align:'center' })
}

async function loadImg(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = img.width; c.height = img.height
        c.getContext('2d').drawImage(img, 0, 0)
        resolve(c.toDataURL('image/jpeg', 0.85))
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function anoDeAnilha(anilha) {
  const m = anilha?.match(/-(\d{2})-/)
  if (!m) return null
  const a = parseInt(m[1])
  return a > 50 ? 1900+a : 2000+a
}

// ── PAGINA 1 ─────────────────────────────────────────────────────────────────
async function pagina1(doc, pombo, historicoProvas, pedigreeInfo) {
  // fundo
  rect(doc, 0, 0, W, H, C.void)

  // barra dourada topo
  rect(doc, 0, 0, W, 4, C.gold)

  // watermark diagonal
  doc.saveGraphicsState()
  doc.setGState(new doc.GState({ opacity: 0.04 }))
  font(doc, 48, 'bold')
  txt(doc, C.gold)
  doc.text('FLY2WIN', W/2, H/2, { align:'center', angle:45 })
  doc.restoreGraphicsState()

  let y = 10

  // ── HEADER CARD ──────────────────────────────────────────────────────────
  rect(doc, PAD, y, W-PAD*2, 52, C.ocean, 4)

  // foto
  const fW = 38, fH = 44
  const fX = PAD+4, fY = y+4
  rect(doc, fX, fY, fW, fH, C.steel, 3)
  if (pombo.foto_url) {
    const img = await loadImg(pombo.foto_url)
    if (img) doc.addImage(img, 'JPEG', fX, fY, fW, fH, undefined, 'FAST')
  } else {
    font(doc, 8, 'normal')
    txt(doc, C.fog)
    doc.text('Sem foto', fX+fW/2, fY+fH/2, { align:'center' })
  }

  // badge estado
  const estadoCor = pombo.estado === 'ativo' ? C.teal : pombo.estado === 'lesionado' ? C.red : C.fog
  rect(doc, fX, fY+fH-7, fW, 7, estadoCor)
  font(doc, 5, 'bold')
  txt(doc, C.void)
  doc.text((pombo.estado||'ativo').toUpperCase(), fX+fW/2, fY+fH-3, { align:'center' })

  // info direita
  const iX = fX+fW+8
  font(doc, 20, 'bold')
  txt(doc, C.white)
  doc.text(safe(pombo.nome), iX, y+14)

  font(doc, 10, 'normal')
  txt(doc, C.gold)
  doc.text(safe(pombo.anilha), iX, y+21)

  // linha info
  const anoNasc = anoDeAnilha(pombo.anilha)
  const idade = anoNasc ? new Date().getFullYear()-anoNasc : null
  const sexoTxt = pombo.sexo === 'M' ? 'Macho' : 'Femea'
  const infoLinha = [sexoTxt, pombo.cor, idade ? `${idade} anos` : null, pombo.pombal].filter(Boolean).join('  |  ')
  font(doc, 7.5, 'normal')
  txt(doc, C.fog)
  doc.text(infoLinha, iX, y+28)

  // especialidades
  if ((pombo.esp||[]).length > 0) {
    const ESP_LABEL = { velocidade:'VELOCIDADE', meio_fundo:'MEIO-FUNDO', fundo:'FUNDO', grande_fundo:'GRANDE FUNDO', 'meio-fundo':'MEIO-FUNDO', 'grande-fundo':'GRANDE FUNDO' }
    const ESP_C = { velocidade:C.amber, meio_fundo:C.blue, fundo:C.teal, grande_fundo:C.purple, 'meio-fundo':C.blue, 'grande-fundo':C.purple }
    let ex = iX
    ;(pombo.esp||[]).forEach(e => {
      const lbl = ESP_LABEL[e]||e.toUpperCase()
      const ec = ESP_C[e]||C.fog
      const bw = doc.getStringUnitWidth(lbl)*6.5/doc.internal.scaleFactor + 8
      rect(doc, ex, y+32, bw, 7, [...ec, 0.15].slice(0,3), 2)
      // border
      doc.setLineWidth(0.3)
      doc.setDrawColor(...ec)
      doc.roundedRect(ex, y+32, bw, 7, 2, 2, 'S')
      font(doc, 5.5, 'bold')
      txt(doc, ec)
      doc.text(lbl, ex+bw/2, y+37, { align:'center' })
      ex += bw + 4
    })
  }

  // criador
  if (pombo.criador) {
    font(doc, 7, 'normal')
    txt(doc, C.fog)
    doc.text(`Criador: ${safe(pombo.criador)}`, W-PAD-4, y+14, { align:'right' })
  }

  y += 58

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kmTotal = historicoProvas.reduce((s,r)=>s+(r.races?.dist||0),0)
  const melhorPos = historicoProvas.filter(r=>r.posicao).sort((a,b)=>a.posicao-b.posicao)[0]
  const kpis = [
    { v: safe(pombo.provas??0),             l:'Provas',      c:C.gold },
    { v: safe(pombo.percentil??0)+'%',      l:'Percentil',   c:C.teal },
    { v: safe(pombo.forma??50)+'%',         l:'Forma',       c:C.blue },
    { v: kmTotal>0 ? kmTotal+'km' : '---',  l:'km Totais',   c:C.purple },
    { v: melhorPos ? melhorPos.posicao+'.' : '---', l:'Melhor Pos.', c:C.amber },
  ]
  const kW = (W-PAD*2-8) / kpis.length
  kpis.forEach((k,i) => kpiBox(doc, PAD+i*(kW+2), y, kW, 20, k.v, k.l, k.c))
  y += 26

  // ── PEDIGREE ─────────────────────────────────────────────────────────────
  if (pedigreeInfo?.pai || pedigreeInfo?.mae || pombo.pai || pombo.mae) {
    y = secTitle(doc, 'Pedigree — Progenitores', y)
    const cols = [
      { label:'PAI', data:pedigreeInfo?.pai, raw:pombo.pai },
      { mae:'MAE', data:pedigreeInfo?.mae, raw:pombo.mae, label:'MAE' },
    ]
    const cW = (W-PAD*2-6)/2
    cols.forEach((c,i) => {
      const cx = PAD + i*(cW+6)
      rect(doc, cx, y, cW, 22, C.panel, 3)
      font(doc, 6, 'bold')
      txt(doc, C.fog)
      doc.text(c.label, cx+4, y+5)
      const nome = c.data?.nome || c.raw || '---'
      const anilha = c.data?.anilha || ''
      font(doc, 9, 'bold')
      txt(doc, C.white)
      doc.text(safe(nome), cx+4, y+12)
      if (anilha) {
        font(doc, 7, 'normal')
        txt(doc, C.gold)
        doc.text(safe(anilha), cx+4, y+18)
      }
      if ((c.data?.percentil||0) > 0) {
        font(doc, 10, 'bold')
        txt(doc, C.teal)
        doc.text(safe(c.data.percentil)+'%', cx+cW-4, y+14, { align:'right' })
        font(doc, 6, 'normal')
        txt(doc, C.fog)
        doc.text('percentil', cx+cW-4, y+19, { align:'right' })
      }
    })
    y += 28
  }

  // ── AVOS (se existem nos dados de pedigree) ──────────────────────────────
  // simplificado — anilha dos avos via campos pai.pai / mae.mae se existirem
  const avo_pp = pedigreeInfo?.pai?.pai_nome || null
  const avo_pm = pedigreeInfo?.pai?.mae_nome || null
  const avo_mp = pedigreeInfo?.mae?.pai_nome || null
  const avo_mm = pedigreeInfo?.mae?.mae_nome || null
  if (avo_pp || avo_pm || avo_mp || avo_mm) {
    y = secTitle(doc, 'Avo(s)', y)
    const avos = [
      {l:'Avo Pat. Paterno', v:avo_pp},
      {l:'Avo Pat. Materno', v:avo_pm},
      {l:'Avo Mat. Paterno', v:avo_mp},
      {l:'Avo Mat. Materno', v:avo_mm},
    ].filter(a=>a.v)
    const aW = (W-PAD*2-avos.length*2) / avos.length
    avos.forEach((a,i) => {
      const ax = PAD + i*(aW+2)
      rect(doc, ax, y, aW, 14, C.panel, 2)
      font(doc, 5.5, 'bold')
      txt(doc, C.fog)
      doc.text(a.l, ax+4, y+5)
      font(doc, 7.5, 'normal')
      txt(doc, C.white)
      doc.text(safe(a.v).slice(0,18), ax+4, y+11)
    })
    y += 20
  }

  // ── OBSERVACOES ──────────────────────────────────────────────────────────
  if (pombo.obs) {
    y = secTitle(doc, 'Observacoes', y)
    rect(doc, PAD, y, W-PAD*2, 18, C.panel, 3)
    font(doc, 8, 'normal')
    txt(doc, C.white)
    const lines = doc.splitTextToSize(safe(pombo.obs), W-PAD*2-8)
    doc.text(lines.slice(0,2), PAD+4, y+7)
    y += 24
  }

  // ── PROVAS (primeiras 6 na p1 se couberem) ────────────────────────────────
  if (historicoProvas.length > 0 && y < H-70) {
    y = secTitle(doc, `Historial de Provas (${historicoProvas.length})`, y)

    // cabeçalho tabela
    rect(doc, PAD, y, W-PAD*2, 7, C.steel)
    font(doc, 6, 'bold')
    txt(doc, C.fog)
    ;[['PROVA',PAD+3],['DATA',90],['DIST',115],['POS.',135],['VEL.',155],['TOP',175]].forEach(([l,x])=>doc.text(l,x,y+4.5))
    y += 8

    const maxP1 = Math.min(historicoProvas.length, Math.floor((H-y-20)/7))
    historicoProvas.slice(0,maxP1).forEach((r,i) => {
      if (i%2===0) rect(doc, PAD, y-1, W-PAD*2, 7, C.panel)
      const nome = safe(r.races?.nome||'Prova').slice(0,28)
      const data = r.races?.data_reg ? new Date(r.races.data_reg).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '---'
      const dist = r.races?.dist ? r.races.dist+'km' : '---'
      const pos = r.posicao ? r.posicao+'.' : '---'
      const vel = r.velocidade ? r.velocidade+'km/h' : '---'
      const pct = r.posicao && r.races?.n_pombos ? Math.round((r.posicao/r.races.n_pombos)*100)+'%' : '---'
      font(doc, 6.5, 'normal')
      txt(doc, C.white)
      doc.text(nome, PAD+3, y+4)
      txt(doc, C.fog)
      doc.text(data, 90, y+4)
      doc.text(dist, 115, y+4)
      const pc = r.posicao===1 ? C.gold : r.posicao<=3 ? C.amber : C.white
      txt(doc, pc)
      font(doc, 6.5, r.posicao===1?'bold':'normal')
      doc.text(pos, 135, y+4)
      font(doc, 6.5, 'normal')
      txt(doc, C.teal)
      doc.text(vel, 155, y+4)
      txt(doc, C.fog)
      doc.text(pct, 175, y+4)
      y += 7
    })
    y += 4
  }

  // ── RODAPE P1 ─────────────────────────────────────────────────────────────
  rect(doc, 0, H-10, W, 10, C.steel)
  rect(doc, 0, H-3, W, 3, C.gold)
  font(doc, 6, 'normal')
  txt(doc, C.fog)
  doc.text('Fly2Win  |  fly2win.pt  |  Fly to Win, Conquer the Skies', W/2, H-6, { align:'center' })
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-PT')}`, W-PAD, H-6, { align:'right' })
  doc.text('Pagina 1', PAD, H-6)
}

// ── PAGINA 2 ─────────────────────────────────────────────────────────────────
function pagina2(doc, pombo, historicoProvas, pedigreeInfo) {
  doc.addPage()
  rect(doc, 0, 0, W, H, C.void)
  rect(doc, 0, 0, W, 4, C.gold)

  // watermark
  doc.saveGraphicsState()
  doc.setGState(new doc.GState({ opacity: 0.04 }))
  font(doc, 48, 'bold')
  txt(doc, C.gold)
  doc.text('FLY2WIN', W/2, H/2, { align:'center', angle:45 })
  doc.restoreGraphicsState()

  let y = 12

  // mini header
  rect(doc, PAD, y, W-PAD*2, 14, C.ocean, 3)
  font(doc, 11, 'bold')
  txt(doc, C.white)
  doc.text(safe(pombo.nome), PAD+8, y+9)
  font(doc, 7, 'normal')
  txt(doc, C.gold)
  doc.text(safe(pombo.anilha), W-PAD-4, y+9, { align:'right' })
  y += 20

  // provas restantes (se houver mais de 6)
  if (historicoProvas.length > 6) {
    y = secTitle(doc, `Provas — Continuacao (${historicoProvas.length} total)`, y)
    rect(doc, PAD, y, W-PAD*2, 7, C.steel)
    font(doc, 6, 'bold')
    txt(doc, C.fog)
    ;[['PROVA',PAD+3],['DATA',90],['DIST',115],['POS.',135],['VEL.',155],['TOP',175]].forEach(([l,x])=>doc.text(l,x,y+4.5))
    y += 8

    historicoProvas.slice(6).forEach((r,i) => {
      if (y > H-30) return
      if (i%2===0) rect(doc, PAD, y-1, W-PAD*2, 7, C.panel)
      const nome = safe(r.races?.nome||'Prova').slice(0,28)
      const data = r.races?.data_reg ? new Date(r.races.data_reg).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '---'
      const dist = r.races?.dist ? r.races.dist+'km' : '---'
      const pos = r.posicao ? r.posicao+'.' : '---'
      const vel = r.velocidade ? r.velocidade+'km/h' : '---'
      const pct = r.posicao && r.races?.n_pombos ? Math.round((r.posicao/r.races.n_pombos)*100)+'%' : '---'
      font(doc, 6.5, 'normal')
      txt(doc, C.white); doc.text(nome, PAD+3, y+4)
      txt(doc, C.fog);   doc.text(data, 90, y+4); doc.text(dist, 115, y+4)
      txt(doc, r.posicao===1?C.gold:r.posicao<=3?C.amber:C.white)
      doc.text(pos, 135, y+4)
      txt(doc, C.teal); doc.text(vel, 155, y+4)
      txt(doc, C.fog);  doc.text(pct, 175, y+4)
      y += 7
    })
    y += 6
  }

  // estatisticas resumo
  if (historicoProvas.length > 0) {
    y = secTitle(doc, 'Resumo Estatistico', y)
    const vitorias = historicoProvas.filter(r=>r.posicao===1).length
    const podios = historicoProvas.filter(r=>r.posicao&&r.posicao<=3).length
    const vels = historicoProvas.filter(r=>r.velocidade)
    const velMedia = vels.length ? Math.round(vels.reduce((s,r)=>s+r.velocidade,0)/vels.length*10)/10 : null
    const kmTotal = historicoProvas.reduce((s,r)=>s+(r.races?.dist||0),0)
    const dists = historicoProvas.map(r=>r.races?.dist||0).filter(d=>d>0)
    const distMax = dists.length ? Math.max(...dists) : 0

    const stats = [
      {l:'Vitorias',     v:safe(vitorias),              c:C.gold},
      {l:'Podios (Top3)',v:safe(podios),                c:C.amber},
      {l:'Vel. Media',   v:velMedia ? velMedia+'km/h' : '---', c:C.teal},
      {l:'km Totais',    v:kmTotal > 0 ? kmTotal+'km' : '---', c:C.purple},
      {l:'Dist. Maxima', v:distMax > 0 ? distMax+'km' : '---', c:C.blue},
    ]
    const sW = (W-PAD*2-stats.length*2) / stats.length
    stats.forEach((s,i) => {
      kpiBox(doc, PAD+i*(sW+2), y, sW, 18, s.v, s.l, s.c)
    })
    y += 24
  }

  // info de origem
  if (pombo.criador || pombo.data_aquisicao || pombo.valor_aquisicao) {
    y = secTitle(doc, 'Origem / Aquisicao', y)
    rect(doc, PAD, y, W-PAD*2, 22, C.panel, 3)
    font(doc, 7.5, 'normal')
    txt(doc, C.fog)
    let ly = y+7
    if (pombo.criador) { txt(doc,C.white); doc.text('Criador: ', PAD+4, ly); txt(doc,C.fog); doc.text(safe(pombo.criador), PAD+28, ly); ly+=7 }
    if (pombo.data_aquisicao) { txt(doc,C.white); doc.text('Data aquisicao: ', PAD+4, ly); txt(doc,C.fog); doc.text(new Date(pombo.data_aquisicao).toLocaleDateString('pt-PT'), PAD+46, ly); ly+=7 }
    if (pombo.valor_aquisicao) { txt(doc,C.white); doc.text('Valor: ', PAD+4, ly); txt(doc,C.gold); doc.text(safe(pombo.valor_aquisicao)+'EUR', PAD+20, ly) }
    y += 28
  }

  // QR code placeholder
  y = secTitle(doc, 'Verificacao Digital', y)
  rect(doc, PAD, y, W-PAD*2, 28, C.panel, 3)
  // QR placeholder (quadrado)
  rect(doc, PAD+4, y+4, 20, 20, C.steel, 2)
  font(doc, 5, 'normal')
  txt(doc, C.fog)
  doc.text('QR CODE', PAD+14, y+15, { align:'center' })
  font(doc, 7, 'normal')
  txt(doc, C.white)
  doc.text('Pombo verificado na plataforma Fly2Win', PAD+30, y+10)
  font(doc, 6.5, 'normal')
  txt(doc, C.fog)
  doc.text(`Anilha: ${safe(pombo.anilha)}`, PAD+30, y+16)
  doc.text(`Percentil verificado: ${safe(pombo.percentil||0)}%  |  Provas: ${safe(pombo.provas||0)}`, PAD+30, y+22)
  txt(doc, C.teal)
  doc.text('fly2win.pt/pedigree', PAD+30, y+27)
  y += 34

  // rodape p2
  rect(doc, 0, H-10, W, 10, C.steel)
  rect(doc, 0, H-3, W, 3, C.gold)
  font(doc, 6, 'normal')
  txt(doc, C.fog)
  doc.text('Fly2Win  |  fly2win.pt  |  Fly to Win, Conquer the Skies', W/2, H-6, { align:'center' })
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-PT')}`, W-PAD, H-6, { align:'right' })
  doc.text('Pagina 2', PAD, H-6)
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
export async function gerarFichaPombo(pombo, historicoProvas=[], pedigreeInfo=null) {
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  await pagina1(doc, pombo, historicoProvas, pedigreeInfo)
  pagina2(doc, pombo, historicoProvas, pedigreeInfo)
  const nome = safe(pombo.nome).replace(/[^a-zA-Z0-9_-]/g,'_')||'pombo'
  const anilha = safe(pombo.anilha).replace(/[^a-zA-Z0-9]/g,'')||''
  doc.save(`Fly2Win_${nome}_${anilha}.pdf`)
}
