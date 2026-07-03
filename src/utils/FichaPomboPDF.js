// src/utils/FichaPomboPDF.js
import jsPDF from 'jspdf'

const W = 210, H = 297, PAD = 14

// Paleta light
const C = {
  bg:      [255, 255, 255],
  bg2:     [248, 249, 252],
  bg3:     [240, 243, 248],
  panel:   [255, 255, 255],
  border:  [220, 228, 240],
  gold:    [180, 140, 40],
  goldL:   [212, 175, 75],
  goldXL:  [245, 220, 140],
  dark:    [20,  30,  50],
  mid:     [60,  80,  110],
  fog:     [120, 140, 170],
  teal:    [16,  160, 120],
  blue:    [50,  110, 220],
  purple:  [130, 70,  210],
  amber:   [200, 130, 20],
  red:     [200, 60,  60],
  green:   [30,  160, 80],
}

const safe = v => (v===null||v===undefined) ? '' : String(v)
const f = (doc,size,style='normal') => { doc.setFontSize(size); doc.setFont('helvetica',style) }
const tc = (doc,col) => doc.setTextColor(...col)
const fc = (doc,col) => doc.setFillColor(...col)
const dc = (doc,col) => doc.setDrawColor(...col)

function box(doc, x, y, w, h, fill, r=2, stroke=null, sw=0.3) {
  fc(doc, fill)
  doc.roundedRect(x, y, w, h, r, r, stroke ? 'FD' : 'F')
  if (stroke) { dc(doc, stroke); doc.setLineWidth(sw); doc.roundedRect(x,y,w,h,r,r,'S') }
}

function hline(doc, y, col=C.border, lw=0.3) {
  doc.setLineWidth(lw); dc(doc,col)
  doc.line(PAD, y, W-PAD, y)
}

function secTitle(doc, label, y) {
  f(doc,7,'bold'); tc(doc,C.gold)
  doc.text(label.toUpperCase(), PAD, y)
  hline(doc, y+1.5, C.goldL, 0.4)
  return y+7
}

function kpiCard(doc, x, y, w, h, value, label, cor) {
  box(doc, x, y, w, h, C.bg2, 3, C.border, 0.2)
  // accent top
  fc(doc, cor); doc.rect(x, y, w, 2, 'F')
  f(doc,13,'bold'); tc(doc,cor)
  doc.text(safe(value), x+w/2, y+h/2+2, {align:'center'})
  f(doc,5.5,'normal'); tc(doc,C.fog)
  doc.text(label.toUpperCase(), x+w/2, y+h-3, {align:'center'})
}

async function loadImg(url) {
  return new Promise(resolve => {
    const img = new Image(); img.crossOrigin='anonymous'
    img.onload = () => {
      try {
        const c=document.createElement('canvas')
        c.width=img.width; c.height=img.height
        c.getContext('2d').drawImage(img,0,0)
        resolve(c.toDataURL('image/jpeg',0.85))
      } catch { resolve(null) }
    }
    img.onerror = ()=>resolve(null)
    img.src = url
  })
}

function anoDeAnilha(anilha) {
  const m = anilha?.match(/-(\d{2})-/)
  if (!m) return null
  const a = parseInt(m[1])
  return a>50 ? 1900+a : 2000+a
}

// ── PAGINA 1 ──────────────────────────────────────────────────────────────────
async function pagina1(doc, pombo, provas, pedigree) {
  fc(doc, C.bg); doc.rect(0,0,W,H,'F')

  // barra topo dourada
  fc(doc, C.gold); doc.rect(0,0,W,8,'F')
  fc(doc, C.goldXL); doc.rect(0,6,W,2,'F')

  // logo/marca no topo
  f(doc,9,'bold'); tc(doc,[255,255,255])
  doc.text('FLY2WIN', PAD, 5.5)
  f(doc,5,'normal'); tc(doc,C.goldXL)
  doc.text('Fly to Win  |  Conquer the Skies', PAD+22, 5.5)
  f(doc,5,'normal'); tc(doc,[255,255,255])
  doc.text('FICHA DE POMBO', W-PAD, 5.5, {align:'right'})

  let y = 14

  // ── HEADER CARD ─────────────────────────────────────────────────────────
  box(doc, PAD, y, W-PAD*2, 54, C.bg2, 4, C.border, 0.3)

  // foto
  const fW=42, fH=48, fX=PAD+5, fY=y+3
  box(doc, fX, fY, fW, fH, C.bg3, 3, C.border, 0.2)
  if (pombo.foto_url) {
    const img = await loadImg(pombo.foto_url)
    if (img) doc.addImage(img,'JPEG',fX,fY,fW,fH,undefined,'FAST')
  } else {
    f(doc,7,'normal'); tc(doc,C.fog)
    doc.text('Sem foto', fX+fW/2, fY+fH/2, {align:'center'})
  }
  // estado badge
  const estadoCor = pombo.estado==='ativo'?C.green:pombo.estado==='lesionado'?C.red:C.fog
  fc(doc,estadoCor); doc.roundedRect(fX,fY+fH-7,fW,7,0,0,'F')
  f(doc,5,'bold'); tc(doc,[255,255,255])
  doc.text((pombo.estado||'ativo').toUpperCase(), fX+fW/2, fY+fH-3, {align:'center'})

  // info direita
  const iX = fX+fW+10
  const anoNasc = anoDeAnilha(pombo.anilha)
  const idade = anoNasc ? new Date().getFullYear()-anoNasc : null
  const sexoTxt = pombo.sexo==='M' ? 'Macho' : 'Femea'

  f(doc,22,'bold'); tc(doc,C.dark)
  doc.text(safe(pombo.nome), iX, y+16)

  f(doc,10,'bold'); tc(doc,C.gold)
  doc.text(safe(pombo.anilha), iX, y+23)

  // linha info
  const info = [sexoTxt, pombo.cor, idade?`${idade} anos`:null, pombo.pombal].filter(Boolean)
  f(doc,7,'normal'); tc(doc,C.mid)
  doc.text(info.join('  |  '), iX, y+30)

  // especialidades pills
  if ((pombo.esp||[]).length>0) {
    const ESP_LABEL = {velocidade:'Velocidade',meio_fundo:'Meio-Fundo',fundo:'Fundo',grande_fundo:'Grande Fundo','meio-fundo':'Meio-Fundo','grande-fundo':'Grande Fundo'}
    const ESP_C = {velocidade:C.amber,meio_fundo:C.blue,fundo:C.teal,grande_fundo:C.purple,'meio-fundo':C.blue,'grande-fundo':C.purple}
    let ex = iX
    ;(pombo.esp||[]).forEach(e => {
      const lbl = ESP_LABEL[e]||e
      const ec = ESP_C[e]||C.fog
      const bw = lbl.length*2.2+8
      fc(doc,[...ec.slice(0,2),ec[2]]); // light bg — approximate
      box(doc, ex, y+34, bw, 7, [...ec.map(v=>Math.min(255,v+180))], 10, ec, 0.5)
      f(doc,5.5,'bold'); tc(doc,ec)
      doc.text(lbl, ex+bw/2, y+39, {align:'center'})
      ex += bw+4
    })
  }

  // criador + pombal direita
  if (pombo.criador) {
    f(doc,6,'normal'); tc(doc,C.fog)
    doc.text('Criador:', W-PAD-4, y+14, {align:'right'})
    f(doc,7,'bold'); tc(doc,C.mid)
    doc.text(safe(pombo.criador), W-PAD-4, y+19, {align:'right'})
  }

  // taxa vitoria
  const vitorias = provas.filter(r=>r.posicao===1).length
  const taxaVit = provas.length>0 ? Math.round(vitorias/provas.length*100) : 0
  if (provas.length>0) {
    f(doc,6,'normal'); tc(doc,C.fog)
    doc.text('Taxa vitoria:', W-PAD-4, y+30, {align:'right'})
    f(doc,8,'bold'); tc(doc,taxaVit>=10?C.gold:C.mid)
    doc.text(taxaVit+'%', W-PAD-4, y+36, {align:'right'})
  }

  y += 60

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kmTotal = provas.reduce((s,r)=>s+(r.races?.dist||0),0)
  const melhorPos = provas.filter(r=>r.posicao).sort((a,b)=>a.posicao-b.posicao)[0]
  const vels = provas.filter(r=>r.velocidade)
  const velMax = vels.length ? Math.max(...vels.map(r=>r.velocidade)) : null
  const velMin = vels.length ? Math.min(...vels.map(r=>r.velocidade)) : null

  const kpis = [
    {v:safe(pombo.provas??0),                    l:'Provas',      c:C.gold},
    {v:safe(pombo.percentil??0)+'%',             l:'Percentil',   c:C.teal},
    {v:safe(pombo.forma??50)+'%',                l:'Forma Atual', c:C.blue},
    {v:kmTotal>0?kmTotal+'km':'---',             l:'km Totais',   c:C.purple},
    {v:melhorPos?melhorPos.posicao+'.':'---',    l:'Melhor Pos.', c:C.amber},
    {v:taxaVit>0?taxaVit+'%':'---',              l:'Taxa Vitoria',c:C.green},
  ]
  const kW = (W-PAD*2-kpis.length*2)/(kpis.length)
  kpis.forEach((k,i)=>kpiCard(doc, PAD+i*(kW+2), y, kW, 20, k.v, k.l, k.c))
  y += 26

  // ── PEDIGREE ─────────────────────────────────────────────────────────────
  if (pedigree?.pai||pedigree?.mae||pombo.pai||pombo.mae) {
    y = secTitle(doc,'Pedigree — Progenitores',y)
    const cW=(W-PAD*2-6)/2
    ;[{l:'PAI',d:pedigree?.pai,r:pombo.pai},{l:'MAE',d:pedigree?.mae,r:pombo.mae}].forEach((c,i)=>{
      const cx=PAD+i*(cW+6)
      box(doc,cx,y,cW,24,C.bg2,3,C.border,0.2)
      // accent lateral
      fc(doc,i===0?C.blue:C.red); doc.rect(cx,y,2,24,'F')
      f(doc,6,'bold'); tc(doc,C.fog)
      doc.text(c.l, cx+6, y+6)
      const nome=c.d?.nome||c.r||'---'
      const anilha=c.d?.anilha||''
      f(doc,9,'bold'); tc(doc,C.dark)
      doc.text(safe(nome), cx+6, y+13)
      if (anilha) { f(doc,7,'normal'); tc(doc,C.gold); doc.text(safe(anilha),cx+6,y+19) }
      if ((c.d?.percentil||0)>0) {
        f(doc,11,'bold'); tc(doc,C.teal)
        doc.text(safe(c.d.percentil)+'%', cx+cW-4, y+15, {align:'right'})
        f(doc,5,'normal'); tc(doc,C.fog)
        doc.text('percentil', cx+cW-4, y+20, {align:'right'})
      }
    })
    y += 30
  }

  // ── STATS VELOCIDADE ─────────────────────────────────────────────────────
  if (vels.length>0) {
    y = secTitle(doc,'Velocidades',y)
    const velMedia = Math.round(vels.reduce((s,r)=>s+r.velocidade,0)/vels.length*10)/10
    const sW=(W-PAD*2-6)/3
    ;[
      {l:'Maxima',  v:safe(velMax)+'km/h', c:C.green},
      {l:'Media',   v:safe(velMedia)+'km/h',c:C.blue},
      {l:'Minima',  v:safe(velMin)+'km/h', c:C.amber},
    ].forEach((s,i)=>{
      const sx=PAD+i*(sW+3)
      box(doc,sx,y,sW,16,C.bg2,3,C.border,0.2)
      f(doc,9,'bold'); tc(doc,s.c)
      doc.text(s.v, sx+sW/2, y+9, {align:'center'})
      f(doc,5.5,'normal'); tc(doc,C.fog)
      doc.text(s.l.toUpperCase(), sx+sW/2, y+14, {align:'center'})
    })
    y += 22
  }

  // ── OBSERVACOES ──────────────────────────────────────────────────────────
  if (pombo.obs) {
    y = secTitle(doc,'Observacoes',y)
    box(doc,PAD,y,W-PAD*2,18,C.bg2,3,C.border,0.2)
    fc(doc,C.gold); doc.rect(PAD,y,2,18,'F')
    f(doc,7.5,'normal'); tc(doc,C.mid)
    const lines=doc.splitTextToSize(safe(pombo.obs),W-PAD*2-10)
    doc.text(lines.slice(0,2),PAD+6,y+7)
    y+=24
  }

  // ── PROVAS (primeiras 8) ──────────────────────────────────────────────────
  if (provas.length>0 && y<H-50) {
    y = secTitle(doc,`Historial de Provas (${provas.length})`,y)
    // header tabela
    box(doc,PAD,y,W-PAD*2,7,C.dark,2)
    f(doc,5.5,'bold'); tc(doc,[255,255,255])
    ;[['PROVA',PAD+3],['DATA',95],['DIST',115],['POS.',133],['VEL.',152],['TOP %',170]].forEach(([l,x])=>doc.text(l,x,y+4.5))
    y+=8
    const max8=Math.min(provas.length,Math.floor((H-y-22)/7))
    provas.slice(0,max8).forEach((r,i)=>{
      if(i%2===0) box(doc,PAD,y-1,W-PAD*2,7,C.bg3,0)
      else { fc(doc,C.bg); doc.rect(PAD,y-1,W-PAD*2,7,'F') }
      const nome=safe(r.races?.nome||'Prova').slice(0,30)
      const data=r.races?.data_reg?new Date(r.races.data_reg).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'2-digit'}):'---'
      const dist=r.races?.dist?r.races.dist+'km':'---'
      const pos=r.posicao?r.posicao+'.':'---'
      const vel=r.velocidade?r.velocidade+'km/h':'---'
      const pct=r.posicao&&r.races?.n_pombos?Math.round((r.posicao/r.races.n_pombos)*100)+'%':'---'
      f(doc,6,'normal'); tc(doc,C.dark); doc.text(nome,PAD+3,y+4)
      tc(doc,C.fog); doc.text(data,95,y+4); doc.text(dist,115,y+4)
      const pc=r.posicao===1?C.gold:r.posicao<=3?C.amber:C.mid
      f(doc,6,r.posicao===1?'bold':'normal'); tc(doc,pc); doc.text(pos,133,y+4)
      f(doc,6,'normal'); tc(doc,C.teal); doc.text(vel,152,y+4)
      tc(doc,C.fog); doc.text(pct,170,y+4)
      y+=7
    })
    y+=2
  }

  // ── RODAPE ───────────────────────────────────────────────────────────────
  hline(doc,H-12,C.border,0.3)
  f(doc,6,'normal'); tc(doc,C.fog)
  doc.text('Fly2Win  |  fly2win.pt  |  Fly to Win, Conquer the Skies',W/2,H-7,{align:'center'})
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-PT')}`,W-PAD,H-7,{align:'right'})
  f(doc,6,'bold'); tc(doc,C.gold); doc.text('1 / 2',PAD,H-7)
}

// ── PAGINA 2 ──────────────────────────────────────────────────────────────────
function pagina2(doc, pombo, provas) {
  doc.addPage()
  fc(doc,C.bg); doc.rect(0,0,W,H,'F')
  fc(doc,C.gold); doc.rect(0,0,W,8,'F')
  fc(doc,C.goldXL); doc.rect(0,6,W,2,'F')
  f(doc,9,'bold'); tc(doc,[255,255,255]); doc.text('FLY2WIN',PAD,5.5)
  f(doc,5,'normal'); tc(doc,[255,255,255]); doc.text('FICHA DE POMBO',W-PAD,5.5,{align:'right'})

  let y=14
  // mini header
  box(doc,PAD,y,W-PAD*2,13,C.bg2,3,C.border,0.2)
  f(doc,11,'bold'); tc(doc,C.dark); doc.text(safe(pombo.nome),PAD+6,y+9)
  f(doc,7,'normal'); tc(doc,C.gold); doc.text(safe(pombo.anilha),W-PAD-4,y+9,{align:'right'})
  y+=19

  // provas restantes
  if (provas.length>8) {
    y=secTitle(doc,`Provas — Continuacao`,y)
    box(doc,PAD,y,W-PAD*2,7,C.dark,2)
    f(doc,5.5,'bold'); tc(doc,[255,255,255])
    ;[['PROVA',PAD+3],['DATA',95],['DIST',115],['POS.',133],['VEL.',152],['TOP %',170]].forEach(([l,x])=>doc.text(l,x,y+4.5))
    y+=8
    provas.slice(8).forEach((r,i)=>{
      if(y>H-30) return
      if(i%2===0) box(doc,PAD,y-1,W-PAD*2,7,C.bg3,0)
      else { fc(doc,C.bg); doc.rect(PAD,y-1,W-PAD*2,7,'F') }
      const nome=safe(r.races?.nome||'Prova').slice(0,30)
      const data=r.races?.data_reg?new Date(r.races.data_reg).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'2-digit'}):'---'
      const dist=r.races?.dist?r.races.dist+'km':'---'
      const pos=r.posicao?r.posicao+'.':'---'
      const vel=r.velocidade?r.velocidade+'km/h':'---'
      const pct=r.posicao&&r.races?.n_pombos?Math.round((r.posicao/r.races.n_pombos)*100)+'%':'---'
      f(doc,6,'normal'); tc(doc,C.dark); doc.text(nome,PAD+3,y+4)
      tc(doc,C.fog); doc.text(data,95,y+4); doc.text(dist,115,y+4)
      const pc=r.posicao===1?C.gold:r.posicao<=3?C.amber:C.mid
      f(doc,6,r.posicao===1?'bold':'normal'); tc(doc,pc); doc.text(pos,133,y+4)
      f(doc,6,'normal'); tc(doc,C.teal); doc.text(vel,152,y+4)
      tc(doc,C.fog); doc.text(pct,170,y+4)
      y+=7
    })
    y+=6
  }

  // ── RESUMO ESTATISTICO ───────────────────────────────────────────────────
  if (provas.length>0) {
    y=secTitle(doc,'Resumo Estatistico',y)
    const vitorias=provas.filter(r=>r.posicao===1).length
    const podios=provas.filter(r=>r.posicao&&r.posicao<=3).length
    const vels=provas.filter(r=>r.velocidade)
    const velMedia=vels.length?Math.round(vels.reduce((s,r)=>s+r.velocidade,0)/vels.length*10)/10:null
    const kmTotal=provas.reduce((s,r)=>s+(r.races?.dist||0),0)
    const dists=provas.map(r=>r.races?.dist||0).filter(d=>d>0)
    const distMax=dists.length?Math.max(...dists):0
    const taxaVit=Math.round(vitorias/provas.length*100)

    const stats=[
      {l:'Vitorias',      v:safe(vitorias),               c:C.gold},
      {l:'Podios Top 3',  v:safe(podios),                 c:C.amber},
      {l:'Taxa Vitoria',  v:taxaVit+'%',                  c:C.green},
      {l:'Vel. Media',    v:velMedia?velMedia+'km/h':'---',c:C.blue},
      {l:'km Totais',     v:kmTotal>0?kmTotal+'km':'---', c:C.purple},
      {l:'Dist. Maxima',  v:distMax>0?distMax+'km':'---', c:C.teal},
    ]
    const sW=(W-PAD*2-stats.length*2)/stats.length
    stats.forEach((s,i)=>kpiCard(doc,PAD+i*(sW+2),y,sW,20,s.v,s.l,s.c))
    y+=26
  }

  // ── LINHA TEMPORAL POR EPOCA ─────────────────────────────────────────────
  if (provas.length>0) {
    const porEpoca={}
    provas.forEach(r=>{
      if(!r.races?.data_reg) return
      const ep=new Date(r.races.data_reg).getFullYear()
      if(!porEpoca[ep]) porEpoca[ep]={provas:0,vitorias:0,podios:0,percentis:[]}
      porEpoca[ep].provas++
      if(r.posicao===1) porEpoca[ep].vitorias++
      if(r.posicao&&r.posicao<=3) porEpoca[ep].podios++
    })
    const epocas=Object.keys(porEpoca).sort()
    if(epocas.length>0) {
      y=secTitle(doc,'Resumo por Epoca',y)
      box(doc,PAD,y,W-PAD*2,7,C.dark,2)
      f(doc,5.5,'bold'); tc(doc,[255,255,255])
      ;[['EPOCA',PAD+3],['PROVAS',70],['VITORIAS',100],['PODIOS',130]].forEach(([l,x])=>doc.text(l,x,y+4.5))
      y+=8
      epocas.forEach((ep,i)=>{
        const d=porEpoca[ep]
        if(i%2===0) box(doc,PAD,y-1,W-PAD*2,7,C.bg3,0)
        else { fc(doc,C.bg); doc.rect(PAD,y-1,W-PAD*2,7,'F') }
        f(doc,6.5,'bold'); tc(doc,C.dark); doc.text(safe(ep),PAD+3,y+4)
        f(doc,6,'normal'); tc(doc,C.mid); doc.text(safe(d.provas),70,y+4)
        tc(doc,d.vitorias>0?C.gold:C.fog); doc.text(safe(d.vitorias),100,y+4)
        tc(doc,d.podios>0?C.amber:C.fog); doc.text(safe(d.podios),130,y+4)
        y+=7
      })
      y+=6
    }
  }

  // ── CERTIFICADO / VERIFICACAO ─────────────────────────────────────────────
  y=secTitle(doc,'Certificado de Autenticidade',y)
  box(doc,PAD,y,W-PAD*2,36,C.bg2,4,C.gold,0.5)
  fc(doc,C.gold); doc.rect(PAD,y,3,36,'F')

  // QR placeholder
  box(doc,PAD+8,y+6,24,24,C.bg3,2,C.border,0.3)
  f(doc,5,'normal'); tc(doc,C.fog); doc.text('QR CODE',PAD+20,y+19,{align:'center'})

  f(doc,8,'bold'); tc(doc,C.dark)
  doc.text('Pombo verificado na plataforma Fly2Win', PAD+38, y+10)
  f(doc,7,'normal'); tc(doc,C.mid)
  doc.text(`Anilha: ${safe(pombo.anilha)}`, PAD+38, y+17)
  doc.text(`Percentil: ${safe(pombo.percentil||0)}%   |   Provas: ${safe(pombo.provas||0)}`, PAD+38, y+23)
  f(doc,7,'bold'); tc(doc,C.gold)
  doc.text('fly2win.pt/pedigree', PAD+38, y+30)
  // data emissao
  f(doc,6,'normal'); tc(doc,C.fog)
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-PT')}`,W-PAD-4,y+30,{align:'right'})
  y+=42

  // ── RODAPE ───────────────────────────────────────────────────────────────
  hline(doc,H-12,C.border,0.3)
  f(doc,6,'normal'); tc(doc,C.fog)
  doc.text('Fly2Win  |  fly2win.pt  |  Fly to Win, Conquer the Skies',W/2,H-7,{align:'center'})
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-PT')}`,W-PAD,H-7,{align:'right'})
  f(doc,6,'bold'); tc(doc,C.gold); doc.text('2 / 2',PAD,H-7)
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
export async function gerarFichaPombo(pombo, provas=[], pedigree=null) {
  const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'})
  await pagina1(doc, pombo, provas, pedigree)
  pagina2(doc, pombo, provas)
  const nome=safe(pombo.nome).replace(/[^a-zA-Z0-9_-]/g,'_')||'pombo'
  const anilha=safe(pombo.anilha).replace(/[^a-zA-Z0-9]/g,'')||''
  doc.save(`Fly2Win_${nome}_${anilha}.pdf`)
}
