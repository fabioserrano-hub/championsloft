import { useState, useEffect, useCallback } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { verificarConquistas } from '../components/Conquistas'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'
import { gerarFichaPombo } from '../utils/FichaPomboPDF'

// ── constantes ────────────────────────────────────────────────────────────────
const anoAtual = new Date().getFullYear()
const anos = Array.from({ length: 10 }, (_, i) => anoAtual - i)
const paises = ['PT', 'ES', 'FR', 'BE', 'NL', 'DE', 'IT', 'GB', 'PL', 'CZ']
const CORES_POMBO = ['Azul barrado','Azul xadrezado','Azul sem barras','Vermelho barrado','Vermelho xadrezado','Vermelho sem barras','Amarelo','Branco','Branco com marcas','Preto','Cinzento','Castanho','Alazão','Meado','Tigrado','Pied azul','Pied vermelho','Pied branco','Recessivo vermelho','Recessivo amarelo']
const FILTROS = [{ id:'todos', label:'Todos' },{ id:'M', label:'♂ Machos' },{ id:'F', label:'♀ Fêmeas' }]
const ESTADOS_EXT = ['proprio','emprestado','cedido','vendido','oferecido','falecido']
const ESPS = [['velocidade','Velocidade'],['meio_fundo','Meio-Fundo'],['fundo','Fundo'],['grande_fundo','G.Fundo']]
const ESP_ICON = { velocidade:'⚡', meio_fundo:'🎯', fundo:'🏔️', grande_fundo:'🌍' }
const ESP_COR  = { velocidade:'#F59E0B', meio_fundo:'#3B82F6', fundo:'#10B981', grande_fundo:'#8B5CF6' }
const statusBadge = { ativo:'green', reproducao:'yellow', lesionado:'red', inativo:'gray' }
const extBadge = { proprio:'green', emprestado:'yellow', cedido:'blue', vendido:'gray', oferecido:'blue', falecido:'red' }
const ORDENACOES = [['percentil','📊 Percentil'],['forma','💪 Forma'],['nome','🔤 Nome'],['anilha','🏷️ Anilha'],['km','📍 km Total'],['idade','📅 Idade']]

const EMPTY = { anilha:'', nome:'', sexo:'M', cor:'', peso:'', esp:['velocidade'], estado:'ativo', estado_ext:'proprio', pombal:'', pai:'', mae:'', obs:'', emoji:'🐦', criador:'', data_aquisicao:'', valor_aquisicao:'', obs_aquisicao:'', destino_nome:'', destino_data:'', destino_valor:'', destino_obs:'' }

// ── helpers ───────────────────────────────────────────────────────────────────
function idadeDoPombo(anilha) {
  const m = anilha?.match(/-(\d{2})-/)
  if (!m) return null
  const ano2d = parseInt(m[1])
  const anoNasc = ano2d > 50 ? 1900 + ano2d : 2000 + ano2d
  return anoAtual - anoNasc
}

function anoNascimento(anilha) {
  const m = anilha?.match(/-(\d{2})-/)
  if (!m) return null
  const ano2d = parseInt(m[1])
  return ano2d > 50 ? 1900 + ano2d : 2000 + ano2d
}

export function classificarPombo(p) {
  if (p.estado === 'lesionado') return { tag:'lesionado', cor:'#f87171', prioridade:0, i18n:'lesionado' }
  const idade = idadeDoPombo(p.anilha)
  const percentil = p.percentil || 0
  const provas = p.provas || 0
  if (provas >= 3 && percentil > 0 && percentil < 35) return { tag:'Em queda', cor:'#f87171', prioridade:1 }
  if (idade !== null && idade >= 1 && percentil >= 65 && provas >= 3) return { tag:'Pronto a reproduzir', cor:'#D4AF37', prioridade:3 }
  if (p.estado === 'ativo' && (p.forma || 50) >= 60) return { tag:'prontaCompetr', cor:'#2DD4A7', prioridade:3, i18n:'prontaCompetr' }
  if (p.estado === 'reproducao') return { tag:'emReproducao', cor:'#c084fc', prioridade:3, i18n:'emReproducao' }
  return { tag:'Em repouso', cor:'#7A8699', prioridade:4 }
}


// Extrai os últimos 3-4 dígitos numéricos da anilha para usar como placeholder
function anilhaPlaceholder(anilha) {
  if (!anilha) return '?'
  const nums = anilha.replace(/[^0-9]/g, '')
  return nums.slice(-4) || anilha.slice(-4) || '?'
}

// Componente placeholder de pombo sem foto
function FotoPlaceholder({ anilha, nome, sexo, size = '100%', fontSize }) {
  const digits = anilhaPlaceholder(anilha)
  const isFemea = sexo === 'F'
  const bg = isFemea
    ? 'linear-gradient(135deg,#2D1B4E,#1a0d33)'
    : 'linear-gradient(135deg,#0D1F4A,#050D1A)'
  const corTexto = isFemea ? '#E9B8FF' : '#7EC8FF'
  const corAspas = isFemea ? 'rgba(233,184,255,.4)' : 'rgba(126,200,255,.4)'

  return (
    <div style={{ width:size, height:size, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:bg, borderRadius:'inherit', padding:'8px 4px', gap:2 }}>
      {nome && (
        <span style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:11, color:corTexto, opacity:.7, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'90%', lineHeight:1.2 }}>
          {nome}
        </span>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:2 }}>
        <span style={{ fontFamily:'serif', fontSize:nome?16:14, color:corAspas, lineHeight:1 }}>"</span>
        <span style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:nome ? (digits.length<=3?22:18) : (digits.length<=3?32:digits.length<=4?28:22), color:corTexto, letterSpacing:1, textShadow:`0 0 20px ${corTexto}60`, lineHeight:1 }}>{digits}</span>
        <span style={{ fontFamily:'serif', fontSize:nome?16:14, color:corAspas, lineHeight:1 }}>"</span>
      </div>
    </div>
  )
}

// ── gráfico de peso ───────────────────────────────────────────────────────────
function PesoChart({ registos }) {
  const { t } = useIdioma()
  const pontos = registos.filter(r => r.peso).slice(0, 10).reverse()
  if (pontos.length < 2) return <div style={{ fontSize:12, color:'#7A8699', textAlign:'center', padding:'16px 0' }}>{t('semDadosPeso')}</div>
  const pesos = pontos.map(p => p.peso)
  const min = Math.min(...pesos) - 10, max = Math.max(...pesos) + 10
  const w = 280, h = 70, pad = 8
  const xStep = (w - pad * 2) / (pontos.length - 1)
  const coords = pesos.map((p, i) => [pad + i * xStep, h - pad - ((p - min) / (max - min)) * (h - pad * 2)])
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0]},${c[1]}`).join(' ')
  const areaPath = `${path} L${coords[coords.length - 1][0]},${h - pad} L${coords[0][0]},${h - pad} Z`
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display:'block' }}>
        <defs><linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25"/><stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/></linearGradient></defs>
        <path d={areaPath} fill="url(#pesoGrad)" />
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth="2" />
        {coords.map((c, i) => <circle key={i} cx={c[0]} cy={c[1]} r="2.5" fill="#60a5fa" />)}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#7A8699', marginTop:4 }}>
        <span>{pesos[0]}g</span><span style={{ color:'#94a3b8' }}>{pontos.length} registos</span><span>{pesos[pesos.length-1]}g</span>
      </div>
    </div>
  )
}

// ── componente principal ──────────────────────────────────────────────────────
export default function Pombos({ nav, params }) {
  const toast = useToast()
  const { t } = useIdioma()
  const { user } = useAuth()

  const [pombos, setPombos]   = useState([])
  const [pombais, setPombais] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtro, setFiltro]   = useState('todos')
  const [filtroPombal, setFiltroPombal] = useState('todos')
  const [filtroEsp, setFiltroEsp]       = useState('todos')
  const [ordenacao, setOrdenacao]       = useState('percentil')
  const [vistaLista, setVistaLista]     = useState(false)
  const [tabPrincipal, setTabPrincipal] = useState('efectivo')
  const [modal, setModal]     = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [historicoProvas, setHistoricoProvas]   = useState([])
  const [historicoSaude, setHistoricoSaude]     = useState([])
  const [historicoTreinos, setHistoricoTreinos] = useState([])
  const [irmãos, setIrmaos]     = useState([])
  const [descendentes, setDescendentes] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [pedigreeInfo, setPedigreeInfo]   = useState(null)
  const [tabDetail, setTabDetail] = useState('info')
  const [modalPartilha, setModalPartilha] = useState(false)
  const [pomboPartilha, setPomboPartilha] = useState(null)
  const [modalCartao, setModalCartao] = useState(false)
  const [gerandoImg, setGerandoImg] = useState(false)
  const [modalMover, setModalMover] = useState(false)
  const [pombalDestino, setPombalDestino] = useState('')

  const gerarImagemRedes = async () => {
    if (!selected) return
    setGerandoImg(true)
    try {
      const S = 1080
      const canvas = document.createElement('canvas')
      canvas.width = S; canvas.height = S
      const ctx = canvas.getContext('2d')

      // fundo gradiente
      const bg = ctx.createLinearGradient(0, 0, S, S)
      bg.addColorStop(0, '#050D1A'); bg.addColorStop(0.5, '#0B1830'); bg.addColorStop(1, '#0A1F3A')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S)

      // polyfill roundRect para Android
      if (!ctx.roundRect) ctx.roundRect = function(x,y,w,h,r){this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.arcTo(x+w,y,x+w,y+r,r);this.lineTo(x+w,y+h-r);this.arcTo(x+w,y+h,x+w-r,y+h,r);this.lineTo(x+r,y+h);this.arcTo(x,y+h,x,y+h-r,r);this.lineTo(x,y+r);this.arcTo(x,y,x+r,y,r);this.closePath()}

      // barra dourada topo
      const gTop = ctx.createLinearGradient(0,0,S,0)
      gTop.addColorStop(0,'#7A6020');gTop.addColorStop(0.3,'#D4AF37');gTop.addColorStop(0.5,'#F5DFA0');gTop.addColorStop(0.7,'#D4AF37');gTop.addColorStop(1,'#7A6020')
      ctx.fillStyle=gTop; ctx.fillRect(0,0,S,14)

      // watermark diagonal
      ctx.save(); ctx.globalAlpha=0.04; ctx.translate(S/2,S/2); ctx.rotate(-Math.PI/5)
      ctx.font='bold 160px Georgia,serif'; ctx.fillStyle='#D4AF37'; ctx.textAlign='center'
      ctx.fillText('FLY2WIN',0,0); ctx.restore()

      // ─── FOTO: coluna esquerda, altura total ───────────────────────────────
      const fotoW=400, fotoH=S-28
      if (selected.foto_url) {
        try {
          const img = await new Promise((res,rej)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=rej;i.src=selected.foto_url})
          ctx.save(); ctx.beginPath(); ctx.roundRect(20,14,fotoW,fotoH,16); ctx.clip()
          ctx.drawImage(img,20,14,fotoW,fotoH); ctx.restore()
          // gradiente direita sobre foto
          const fg=ctx.createLinearGradient(20,0,20+fotoW,0)
          fg.addColorStop(0,'rgba(5,13,26,0)'); fg.addColorStop(0.7,'rgba(5,13,26,0)'); fg.addColorStop(1,'rgba(5,13,26,0.95)')
          ctx.fillStyle=fg; ctx.fillRect(20,14,fotoW,fotoH)
          // gradiente fundo sobre foto
          const fg2=ctx.createLinearGradient(0,S-200,0,S)
          fg2.addColorStop(0,'rgba(5,13,26,0)'); fg2.addColorStop(1,'rgba(5,13,26,0.9)')
          ctx.fillStyle=fg2; ctx.fillRect(20,14,fotoW,fotoH)
        } catch {}
      } else {
        ctx.fillStyle='#101F40'; ctx.beginPath(); ctx.roundRect(20,14,fotoW,fotoH,16); ctx.fill()
        const digits = anilhaPlaceholder(selected.anilha)
        ctx.fillStyle = selected.sexo==='F' ? 'rgba(192,132,252,.3)' : 'rgba(76,141,255,.3)'
        ctx.fillRect(20, 20, fotoW, S-40)
        ctx.fillStyle = selected.sexo==='F' ? '#c084fc' : '#4C8DFF'
        ctx.font = 'bold 120px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(digits, 20+fotoW/2, S/2)
      }

      // ─── CONTEÚDO: coluna direita ──────────────────────────────────────────
      const rX=450, rW=S-rX-30
      let y=80

      // nome
      ctx.textAlign='left'; ctx.font='bold 80px Georgia,serif'; ctx.fillStyle='#fff'
      ctx.fillText((selected.nome||'').slice(0,14),rX,y); y+=55

      // anilha
      ctx.font='34px monospace'; ctx.fillStyle='#D4AF37'
      ctx.fillText(selected.anilha||'',rX,y); y+=42

      // info
      const anoNasc2=(()=>{const m=selected.anilha?.match(/-(\d{2})-/);if(!m)return null;const a=parseInt(m[1]);return a>50?1900+a:2000+a})()
      const idade2=anoNasc2?new Date().getFullYear()-anoNasc2:null
      const infoLinha=[selected.sexo==='M'?'Macho':'Femea',selected.cor,idade2?idade2+' anos':null].filter(Boolean).join(' · ')
      ctx.font='28px sans-serif'; ctx.fillStyle='#94a3b8'
      ctx.fillText(infoLinha,rX,y); y+=50

      // badge especialidade
      const esp=(selected.esp||[])[0]
      if(esp){
        const EC={velocidade:'#F59E0B',meio_fundo:'#3B82F6',fundo:'#10B981',grande_fundo:'#8B5CF6'}
        const EL={velocidade:'Velocidade',meio_fundo:'Meio-Fundo',fundo:'Fundo',grande_fundo:'Grande Fundo'}
        const lbl=EL[esp]||esp; const ec=EC[esp]||'#fff'
        ctx.font='bold 26px sans-serif'; const tw=ctx.measureText(lbl).width
        ctx.fillStyle=ec+'22'; ctx.beginPath(); ctx.roundRect(rX,y,tw+44,46,23); ctx.fill()
        ctx.strokeStyle=ec; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(rX,y,tw+44,46,23); ctx.stroke()
        ctx.fillStyle=ec; ctx.fillText(lbl,rX+22,y+32); y+=66
      }

      // separador
      ctx.strokeStyle='rgba(212,175,55,0.3)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(rX,y); ctx.lineTo(S-30,y); ctx.stroke(); y+=28

      // KPIs
      const kpis=[{v:(selected.percentil||0)+'%',l:'PERCENTIL',c:'#2DD4A7'},{v:(selected.forma||50)+'%',l:'FORMA',c:'#4C8DFF'},{v:String(selected.provas||0),l:'PROVAS',c:'#D4AF37'}]
      const kW=Math.floor((rW-20)/3), kH=130
      kpis.forEach((k,i)=>{
        const kx=rX+i*(kW+10)
        ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.roundRect(kx,y,kW,kH,12); ctx.fill()
        ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(kx,y,kW,kH,12); ctx.stroke()
        ctx.font='bold 52px Georgia,serif'; ctx.fillStyle=k.c; ctx.textAlign='center'
        ctx.fillText(k.v,kx+kW/2,y+74)
        ctx.font='22px sans-serif'; ctx.fillStyle='#475569'; ctx.fillText(k.l,kx+kW/2,y+108)
      })
      ctx.textAlign='left'; y+=kH+24

      // separador
      ctx.strokeStyle='rgba(212,175,55,0.3)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(rX,y); ctx.lineTo(S-30,y); ctx.stroke(); y+=24

      // pedigree
      const paiNome=pedigreeInfo?.pai?.nome||selected.pai||null
      const maeNome=pedigreeInfo?.mae?.nome||selected.mae||null
      if(paiNome||maeNome){
        ctx.font='bold 22px sans-serif'; ctx.fillStyle='#7A8699'; ctx.fillText('PEDIGREE',rX,y); y+=32
        const pedW=(rW-10)/2
        ;[['PAI',paiNome,pedigreeInfo?.pai?.anilha],['MÃE',maeNome,pedigreeInfo?.mae?.anilha]].forEach(([lbl,nome,anilha],i)=>{
          if(!nome) return
          const px=rX+i*(pedW+10)
          ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.roundRect(px,y,pedW,70,10); ctx.fill()
          ctx.font='20px sans-serif'; ctx.fillStyle='#475569'; ctx.fillText(lbl,px+12,y+22)
          ctx.font='bold 24px sans-serif'; ctx.fillStyle='#fff'; ctx.fillText(nome.slice(0,14),px+12,y+46)
          if(anilha){ctx.font='18px monospace'; ctx.fillStyle='#D4AF37'; ctx.fillText(anilha,px+12,y+64)}
        })
        y+=84
      }

      // últimas provas
      if(historicoProvas.length>0){
        ctx.font='bold 22px sans-serif'; ctx.fillStyle='#7A8699'; ctx.fillText('ÚLTIMAS PROVAS',rX,y); y+=30
        historicoProvas.slice(0,3).forEach(r=>{
          const pos=r.posicao?r.posicao+'.':'—'
          const nome=(r.races?.nome||'Prova').slice(0,20)
          const vel=r.velocidade?r.velocidade+'km/h':''
          const pc=r.posicao===1?'#D4AF37':r.posicao<=3?'#F59E0B':'#94a3b8'
          ctx.font='bold 26px sans-serif'; ctx.fillStyle=pc; ctx.fillText(pos,rX,y)
          ctx.font='24px sans-serif'; ctx.fillStyle='#cbd5e1'; ctx.fillText(nome,rX+52,y)
          ctx.font='22px sans-serif'; ctx.fillStyle='#2DD4A7'; ctx.textAlign='right'; ctx.fillText(vel,S-30,y)
          ctx.textAlign='left'; y+=36
        })
        y+=10
      }

      // observações
      if(selected.obs&&y<S-120){
        ctx.font='italic 24px sans-serif'; ctx.fillStyle='#7A8699'
        const obs='"'+selected.obs.slice(0,55)+(selected.obs.length>55?'…':'"')
        ctx.fillText(obs,rX,y); y+=36
      }

      // branding rodapé
      const bY=S-30
      ctx.font='bold 38px Georgia,serif'; ctx.fillStyle='#D4AF37'; ctx.textAlign='left'
      ctx.fillText('FLY2WIN',rX,bY)
      ctx.font='22px sans-serif'; ctx.fillStyle='#334155'; ctx.textAlign='right'
      ctx.fillText('fly2win.pt',S-30,bY)

      // barra dourada fundo
      ctx.fillStyle=gTop; ctx.fillRect(0,S-14,S,14)

      // download
      const link = document.createElement('a')
      link.download = `${selected.nome||'pombo'}_fly2win.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast(t('imagemGuardada'), 'ok')
    } catch(e) { toast('Erro: '+e.message, 'err') }
    finally { setGerandoImg(false) }
  }

  const moverPombo = async () => {
    if (!pombalDestino) { toast(t('seleccionaPombal'), 'warn'); return }
    try {
      await db.updatePombo(selected.id, { pombal: pombalDestino })
      toast(`Movido para ${pombalDestino}!`, 'ok')
      setModalMover(false); setPombalDestino(''); close(); load()
    } catch(e) { toast('Erro: '+e.message, 'err') }
  }

  const [anilhaPais, setAnilhaPais] = useState('PT')
  const [anilhaAno, setAnilhaAno]   = useState(String(anoAtual))
  const [anilhaNum, setAnilhaNum]   = useState('')
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleEsp = e => sf('esp', form.esp.includes(e) ? form.esp.filter(x => x !== e) : [...form.esp, e])

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try { const [p, pb] = await Promise.all([db.getPombos(), db.getPombais()]); setPombos(p); setPombais(pb) }
    catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  // abrir por params
  useEffect(() => {
    if (params?.prefillPombal && pombais.length) setFiltroPombal(params.prefillPombal)
  }, [params, pombais])

  // ── computed ──────────────────────────────────────────────────────────────
  const efectivo = pombos.filter(p => !p.estado_ext || p.estado_ext === 'proprio')
  const externos = pombos.filter(p => p.estado_ext && !['proprio','vendido','oferecido','falecido'].includes(p.estado_ext))
  const vendidos = pombos.filter(p => ['vendido','oferecido'].includes(p.estado_ext))
  const listaAtual = tabPrincipal === 'efectivo' ? efectivo : tabPrincipal === 'externos' ? externos : vendidos

  // km total por pombo (calculado a partir dos resultados — aqui estimado pelos dados já no pombo)
  const kmTotal = p => (p.provas || 0) * 320 // estimativa; idealmente vem da BD

  const filtered = listaAtual.filter(p => {
    if (search && !p.nome?.toLowerCase().includes(search.toLowerCase()) && !p.anilha?.toLowerCase().includes(search.toLowerCase())) return false
    if (tabPrincipal === 'efectivo') {
      if (filtro !== 'todos' && p.sexo !== filtro) return false
      if (filtroPombal !== 'todos' && p.pombal !== filtroPombal) return false
      if (filtroEsp !== 'todos' && !(p.esp || []).includes(filtroEsp)) return false
    }
    return true
  }).sort((a, b) => {
    if (ordenacao === 'percentil') return (b.percentil || 0) - (a.percentil || 0)
    if (ordenacao === 'forma')     return (b.forma || 50) - (a.forma || 50)
    if (ordenacao === 'nome')      return (a.nome || '').localeCompare(b.nome || '')
    if (ordenacao === 'anilha')    return (a.anilha || '').localeCompare(b.anilha || '')
    if (ordenacao === 'km')        return kmTotal(b) - kmTotal(a)
    if (ordenacao === 'idade')     return (anoNascimento(a.anilha) || 0) - (anoNascimento(b.anilha) || 0)
    return 0
  })

  // ── open detail ───────────────────────────────────────────────────────────
  const openDetail = async p => {
    setSelected(p); setModal('detail'); setLoadingDetail(true); setPedigreeInfo(null); setTabDetail('info')
    setHistoricoProvas([]); setHistoricoSaude([]); setHistoricoTreinos([]); setIrmaos([]); setDescendentes([])
    try {
      const [provasRes, saudeRes, treinosRes, pedRes] = await Promise.all([
        supabase.from('race_results').select('*, races(nome,data_reg,dist,local_solta,tipo)').eq('pigeon_id', p.id).order('created_at', { ascending:false }).limit(20),
        supabase.from('health').select('*').eq('pigeon_id', p.id).order('created_at', { ascending:false }).limit(10),
        supabase.from('treinos').select('*').contains('pombos_ids', [p.id]).order('data_reg', { ascending:false }),
        db.getPedigree(p.id).catch(() => null),
      ])
      setHistoricoProvas(provasRes.data || [])
      setHistoricoSaude(saudeRes.data || [])
      setHistoricoTreinos(treinosRes.data || [])

      // pedigree
      if (pedRes?.pai?.nome || pedRes?.mae?.nome) {
        setPedigreeInfo({ pai: pedRes.pai || null, mae: pedRes.mae || null })
      } else if (p.pai || p.mae) {
        const pai = pombos.find(x => x.anilha === p.pai || x.nome === p.pai)
        const mae = pombos.find(x => x.anilha === p.mae || x.nome === p.mae)
        if (pai || mae) setPedigreeInfo({ pai: pai ? { anilha:pai.anilha, nome:pai.nome, cor:pai.cor, percentil:pai.percentil } : null, mae: mae ? { anilha:mae.anilha, nome:mae.nome, cor:mae.cor, percentil:mae.percentil } : null })
      }

      // irmãos (mesmo pai e mãe)
      if (p.pai || p.mae) {
        const irm = pombos.filter(x => x.id !== p.id && ((p.pai && x.pai === p.pai) || (p.mae && x.mae === p.mae)))
        setIrmaos(irm.slice(0, 6))
      }

      // descendentes (este pombo é pai ou mãe)
      const desc = pombos.filter(x => x.pai === p.anilha || x.mae === p.anilha || x.pai === p.nome || x.mae === p.nome)
      setDescendentes(desc.slice(0, 8))

    } catch (e) { }
    finally { setLoadingDetail(false) }
  }

  // ── open form ─────────────────────────────────────────────────────────────
  const openNew = () => {
    setAnilhaPais('PT'); setAnilhaAno(String(anoAtual)); setAnilhaNum('')
    setForm({ ...EMPTY, pombal: pombais[0]?.nome || '' })
    setPhotoFile(null); setPhotoPreview(null); setSelected(null); setModal('form')
  }
  const openEdit = async p => {
    setSelected(p)
    let paiA = p.pai || '', maeA = p.mae || ''
    try { const ped = await db.getPedigree(p.id); if (ped?.pai?.anilha) paiA = ped.pai.anilha; if (ped?.mae?.anilha) maeA = ped.mae.anilha } catch(e) {}
    setForm({ anilha:p.anilha||'', nome:p.nome||'', sexo:p.sexo||'M', cor:p.cor||'', peso:p.peso||'', esp:p.esp||['velocidade'], estado:p.estado||'ativo', estado_ext:p.estado_ext||'proprio', pombal:p.pombal||'', pai:paiA, mae:maeA, obs:p.obs||'', emoji:p.emoji||'🐦', criador:p.criador||'', data_aquisicao:p.data_aquisicao||'', valor_aquisicao:p.valor_aquisicao||'', obs_aquisicao:p.obs_aquisicao||'', destino_nome:p.destino_nome||'', destino_data:p.destino_data||'', destino_valor:p.destino_valor||'', destino_obs:p.destino_obs||'' })
    setPhotoPreview(p.foto_url || null); setPhotoFile(null); setModal('form')
  }
  const close = () => { setModal(null); setSelected(null); setPhotoFile(null); setPhotoPreview(null); setHistoricoProvas([]); setHistoricoSaude([]); setHistoricoTreinos([]); setPedigreeInfo(null); setIrmaos([]); setDescendentes([]) }

  const save = async () => {
    if (!form.nome.trim()) { toast(t('nomeObrigatorio'), 'warn'); return }
    setSaving(true)
    try {
      const anilhaFinal = anilhaNum ? `${anilhaPais}-${anilhaAno}-${anilhaNum.padStart(5,'0')}` : form.anilha.trim()
      const payload = { anilha:anilhaFinal, nome:form.nome.trim(), sexo:form.sexo, cor:form.cor, peso:form.peso?parseInt(form.peso):null, esp:form.esp, estado:form.estado, estado_ext:form.estado_ext, pombal:form.pombal, pai:form.pai, mae:form.mae, obs:form.obs, emoji:form.emoji, criador:form.criador, data_aquisicao:form.data_aquisicao||null, valor_aquisicao:form.valor_aquisicao?parseFloat(form.valor_aquisicao):null, obs_aquisicao:form.obs_aquisicao, destino_nome:form.destino_nome, destino_data:form.destino_data||null, destino_valor:form.destino_valor?parseFloat(form.destino_valor):null, destino_obs:form.destino_obs, provas:selected?.provas||0, percentil:selected?.percentil||0, forma:selected?.forma||50 }
      let saved
      if (selected) saved = await db.updatePombo(selected.id, payload)
      else saved = await db.createPombo(payload)
      if (photoFile && saved?.id && user?.id) {
        try { const url = await db.uploadFoto(user.id, saved.id, photoFile); await db.updatePombo(saved.id, { foto_url:url }) }
        catch (e) { toast(t('fotoNaoGuardada'), 'warn') }
      }
      toast(selected ? 'Actualizado!' : form.nome + ' adicionado!', 'ok'); close(); load()
      if (!selected && user?.id) {
        const { data: tp } = await supabase.from('pigeons').select('id').eq('user_id', user.id)
        const novas = await verificarConquistas(user.id, { nPombos: tp?.length || 0 })
        if (novas.length > 0) toast('🏅 Nova conquista!', 'ok')
      }
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deletePombo(confirm.id); toast(t('eliminado'), 'ok'); setConfirm(null); load() }
    catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  // ── computed detail ───────────────────────────────────────────────────────
  const kmTotalDetail = historicoProvas.reduce((s, r) => s + (r.races?.dist || 0), 0)
  const melhorPos = historicoProvas.filter(r => r.posicao).sort((a, b) => a.posicao - b.posicao)[0]
  const velMedia = historicoProvas.filter(r => r.velocidade).length > 0
    ? Math.round(historicoProvas.filter(r => r.velocidade).reduce((s, r) => s + r.velocidade, 0) / historicoProvas.filter(r => r.velocidade).length * 10) / 10
    : null

  // ── cards ─────────────────────────────────────────────────────────────────
  const PomboCard = ({ p }) => {
    const fc = (p.forma || 50) >= 80 ? '#2DD4A7' : (p.forma || 50) >= 60 ? '#D4AF37' : '#f87171'
    const pc = (p.percentil || 0) >= 70 ? '#2DD4A7' : (p.percentil || 0) >= 40 ? '#D4AF37' : '#94a3b8'
    const c = classificarPombo(p)
    const idade = idadeDoPombo(p.anilha)
    const espPrincipal = (p.esp || [])[0]
    return (
      <div className="pombo-card" onClick={() => openDetail(p)} style={c.prioridade <= 1 ? { borderColor: c.cor + '44' } : undefined}>
        <div className="pombo-photo" style={{ height:160, position:'relative' }}>
          {p.foto_url ? <img src={p.foto_url} alt={p.nome} /> : <FotoPlaceholder anilha={p.anilha} nome={p.nome} sexo={p.sexo}/>}
          <div style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,.6)', borderRadius:6, padding:'2px 6px', fontSize:11, fontWeight:700, color:'#fff' }}>{p.sexo === 'M' ? '♂' : '♀'}</div>
          {espPrincipal && <div style={{ position:'absolute', top:6, left:6, background:`${ESP_COR[espPrincipal]}22`, border:`1px solid ${ESP_COR[espPrincipal]}66`, borderRadius:6, padding:'2px 6px', fontSize:10, fontWeight:700, color:ESP_COR[espPrincipal] }}>{ESP_ICON[espPrincipal]}</div>}
          {p.estado_ext && p.estado_ext !== 'proprio' && <div style={{ position:'absolute', bottom:6, left:6, background:'rgba(0,0,0,.7)', borderRadius:6, padding:'2px 6px', fontSize:10, fontWeight:700, color:'#D4AF37' }}>{p.estado_ext.toUpperCase()}</div>}
        </div>
        <div className="pombo-info">
          <div className="pombo-anel">{p.anilha}</div>
          <div className="pombo-nome">{p.nome}</div>
          {idade !== null && <div style={{ fontSize:10, color:'#475569', marginBottom:3 }}>{idade} {idade === 1 ? 'ano' : 'anos'} · {p.pombal || '—'}</div>}
          <div style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color:c.cor, marginBottom:6 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:c.cor, flexShrink:0 }} />{c.tag}
          </div>
          {/* percentil + forma */}
          <div style={{ display:'flex', gap:8, marginBottom:4 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:'#475569', marginBottom:2 }}>{t('percentil').toUpperCase()}</div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div className="progress" style={{ flex:1 }}><div className="progress-bar" style={{ width:`${p.percentil||0}%`, background:pc }} /></div>
                <span style={{ fontSize:10, fontWeight:700, color:pc, flexShrink:0 }}>{p.percentil||0}%</span>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:9, color:'#475569', flexShrink:0 }}>{t('forma').toUpperCase()}</div>
            <div className="progress" style={{ flex:1 }}><div className="progress-bar" style={{ width:`${p.forma||50}%`, background:fc }} /></div>
            <span style={{ fontSize:10, fontWeight:700, color:fc, flexShrink:0 }}>{p.forma||50}%</span>
          </div>
        </div>
      </div>
    )
  }

  const PomboLinha = ({ p }) => {
    const c = classificarPombo(p)
    const idade = idadeDoPombo(p.anilha)
    return (
      <div onClick={() => openDetail(p)} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#0B1830', borderRadius:10, cursor:'pointer', border:`1px solid ${c.prioridade<=1?c.cor+'33':'#1B2D52'}`, marginBottom:4, transition:'border-color .15s' }}
        onMouseEnter={e=>e.currentTarget.style.borderColor='#4C8DFF44'}
        onMouseLeave={e=>e.currentTarget.style.borderColor=c.prioridade<=1?c.cor+'33':'#1B2D52'}>
        <div style={{ width:36, height:36, borderRadius:8, background:'#101F40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, overflow:'hidden', flexShrink:0 }}>
          {p.foto_url ? <img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FotoPlaceholder anilha={p.anilha} sexo={p.sexo} size='100%'/>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</span>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#D4AF37' }}>{p.anilha}</span>
            {idade !== null && <span style={{ fontSize:10, color:'#475569' }}>{idade}a</span>}
          </div>
          <div style={{ display:'flex', gap:6, marginTop:2, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, color:c.cor, fontWeight:600 }}>{c.tag}</span>
            {p.pombal && <span style={{ fontSize:10, color:'#475569' }}>🏠 {p.pombal}</span>}
            {(p.esp||[]).slice(0,2).map(e=><span key={e} style={{ fontSize:10, color:ESP_COR[e] }}>{ESP_ICON[e]}</span>)}
          </div>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexShrink:0 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:(p.percentil||0)>=70?'#2DD4A7':'#94a3b8' }}>{p.percentil||0}%</div>
            <div style={{ fontSize:9, color:'#475569' }}>percentil</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:(p.forma||50)>=60?'#D4AF37':'#f87171' }}>{p.forma||50}%</div>
            <div style={{ fontSize:9, color:'#475569' }}>forma</div>
          </div>
          <span style={{ color:'#475569', fontSize:14 }}>›</span>
        </div>
      </div>
    )
  }

  const ExternoCard = ({ p }) => (
    <div className="card card-p" style={{ cursor:'pointer' }} onClick={() => openDetail(p)}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:10, background:'#101F40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, overflow:'hidden', flexShrink:0 }}>
          {p.foto_url ? <img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FotoPlaceholder anilha={p.anilha} sexo={p.sexo} size='100%'/>}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#2DD4A7' }}>{p.anilha}</div>
          {p.destino_nome && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>→ {p.destino_nome}{p.destino_data?` · ${new Date(p.destino_data).toLocaleDateString('pt-PT')}`:''}</div>}
          {p.destino_valor && <div style={{ fontSize:11, color:'#D4AF37' }}>💶 {p.destino_valor}€</div>}
        </div>
        <Badge v={extBadge[p.estado_ext]||'gray'}>{p.estado_ext}</Badge>
      </div>
    </div>
  )

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      <GuiaAuto modulo="pombos"/>
      <div className="section-header">
        <div><div className="section-title">{t('pombos')}</div><div className="section-sub">{efectivo.length+' '+t('noEfectivo')+' · '+externos.length+' '+t('externos')}</div></div>
        <button className="btn btn-primary" onClick={openNew}>{'+' + t('novoPombo')}</button>
      </div>

      {/* tabs principais */}
      <div style={{ display:'flex', gap:4, background:'#101F40', borderRadius:10, padding:4, marginBottom:16, overflowX:'auto' }}>
        {[['efectivo',`🐦 ${t('efectivo')} (${efectivo.length})`],['externos',`🔄 ${t('externos')} (${externos.length})`],['vendidos',`💰 ${t('vendidos')} (${vendidos.length})`]].map(([tab,label])=>(
          <button key={tab} onClick={()=>setTabPrincipal(tab)} style={{ padding:'8px 14px', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tabPrincipal===tab?'#1E5FD9':'none', color:tabPrincipal===tab?'#fff':'#94a3b8' }}>{label}</button>
        ))}
      </div>

      {/* filtros efectivo */}
      {tabPrincipal === 'efectivo' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
          <input className="input" placeholder={'🔍 '+t('pesquisarNomeAnilha')} value={search} onChange={e=>setSearch(e.target.value)} />
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {FILTROS.map(f=><button key={f.id} onClick={()=>setFiltro(f.id)} className={`chip${filtro===f.id?' active':''}`} style={{ fontSize:11 }}>{f.label}</button>)}
            {pombais.length > 0 && <>
              <button onClick={()=>setFiltroPombal('todos')} className={`chip${filtroPombal==='todos'?' active':''}`} style={{ fontSize:11 }}>🏠 Todos</button>
              {pombais.map(pb=><button key={pb.id} onClick={()=>setFiltroPombal(pb.nome)} className={`chip${filtroPombal===pb.nome?' active':''}`} style={{ fontSize:11 }}>🏠 {pb.nome}</button>)}
            </>}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            {ESPS.map(([v,l])=><button key={v} onClick={()=>setFiltroEsp(filtroEsp===v?'todos':v)} className={`chip${filtroEsp===v?' active':''}`} style={{ fontSize:11, color:filtroEsp===v?'#fff':ESP_COR[v] }}>{ESP_ICON[v]} {l}</button>)}
            <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
              <select value={ordenacao} onChange={e=>setOrdenacao(e.target.value)} className="input" style={{ fontSize:11, padding:'4px 8px', borderRadius:8, width:'auto' }}>
                {ORDENACOES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={()=>setVistaLista(v=>!v)} className="btn btn-secondary btn-sm">{vistaLista?'⊞ Cards':'☰ Lista'}</button>
            </div>
          </div>
          <div style={{ fontSize:12, color:'#7A8699' }}>{filtered.length} pombo(s)</div>
        </div>
      )}

      {tabPrincipal !== 'efectivo' && <input className="input" style={{ marginBottom:16 }} placeholder={'🔍 '+t('pesquisar')+'...'} value={search} onChange={e=>setSearch(e.target.value)} />}

      {/* lista */}
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
        : filtered.length === 0 ? <EmptyState icon="🐦" title={t('semPombos')} desc={t('nenhumPombosCategoria')} action={tabPrincipal==='efectivo'?<button className="btn btn-primary" onClick={openNew}>{'+' + t('novoPombo')}</button>:null} />
        : tabPrincipal === 'efectivo' ? (() => {
            const comP = filtered.map(p => ({ p, c:classificarPombo(p) }))
            const grupos = [
              { label:'🚨 Precisam de atenção', items:comP.filter(x=>x.c.prioridade<=1) },
              { label:`🕊️ ${t('efectivo')}`, items:comP.filter(x=>x.c.prioridade>1) },
            ].filter(g=>g.items.length>0)
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
                {grupos.map(g=>(
                  <div key={g.label}>
                    {grupos.length>1 && <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:'.1em', color:'#7A8699', textTransform:'uppercase', marginBottom:10 }}>{g.label} ({g.items.length})</div>}
                    {vistaLista
                      ? g.items.map(({p})=><PomboLinha key={p.id} p={p} />)
                      : <div className="grid-auto">{g.items.map(({p})=><PomboCard key={p.id} p={p} />)}</div>
                    }
                  </div>
                ))}
              </div>
            )
          })()
        : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{filtered.map(p=><ExternoCard key={p.id} p={p} />)}</div>
      }

      {/* ══ MODAL PARTILHA ══════════════════════════════════════════════════════ */}
      {pomboPartilha && (
        <Modal open={modalPartilha} onClose={()=>setModalPartilha(false)} title="🌐 Partilhar na Comunidade"
          footer={
            <div style={{ display:'flex', gap:8, width:'100%' }}>
              <button className="btn btn-secondary" onClick={()=>setModalPartilha(false)}>{t('cancelar')}</button>
              <div style={{ flex:1 }}/>
              <button className="btn btn-secondary btn-sm" onClick={()=>{
                const txt = pomboPartilha.nome + ' (' + pomboPartilha.anilha + ')\n🏆 ' + (pomboPartilha.provas||0) + ' provas · 📊 ' + (pomboPartilha.percentil||0) + '% percentil · 💪 ' + (pomboPartilha.forma||50) + '% forma\n#columbofilia #pomboscorreio'
                navigator.clipboard?.writeText(txt).then(()=>toast(t('copiado'), 'ok'))
              }}>📋 Copiar</button>
              <button className="btn btn-primary" onClick={()=>{
                setModalPartilha(false)
                const esp = (pomboPartilha.esp||[]).map(e=>ESP_ICON[e]+' '+e).join(' ')
                const obsStr = pomboPartilha.obs ? '\n"' + pomboPartilha.obs + '"' : ''
                const conteudo = (pomboPartilha.emoji||'🐦') + ' ' + pomboPartilha.nome + ' — ' + pomboPartilha.anilha + '\n\n📊 ' + t('percentil') + ': ' + (pomboPartilha.percentil||0) + '%\n💪 Forma: ' + (pomboPartilha.forma||50) + '%\n🏆 Provas: ' + (pomboPartilha.provas||0) + (esp?'\n'+esp:'') + obsStr
                nav?.('comunidade', { prefillPost: { tipo:'Geral', conteudo, foto_url: pomboPartilha.foto_url||null, pomboId: pomboPartilha.id } })
              }}>🌐 Publicar na LoftSocial →</button>
            </div>
          }>
          {/* Card visual - já melhorado (mantido) */}
          <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(212,175,55,.25)', borderRadius:16, overflow:'hidden', marginBottom:12 }}>
            <div style={{ height:3, background:'linear-gradient(90deg,#B8960C,#D4AF37,#B8960C)' }}/>
            <div style={{ display:'grid', gridTemplateColumns:'40% 60%', height:240 }}>
              {/* FOTO esquerda */}
              <div style={{ position:'relative', overflow:'hidden', background:'#0A1628' }}>
                {pomboPartilha.foto_url
                  ? <img src={pomboPartilha.foto_url} alt={pomboPartilha.nome}
                      style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}/>
                  : <FotoPlaceholder anilha={pomboPartilha.anilha} nome={pomboPartilha.nome} sexo={pomboPartilha.sexo}/>
                }
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'40%', background:'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', pointerEvents:'none' }} />
                {(pomboPartilha.esp||[])[0]&&(
                  <div style={{ position:'absolute', bottom:12, left:12, background:ESP_COR[(pomboPartilha.esp||[])[0]]+'22', border:'1px solid '+ESP_COR[(pomboPartilha.esp||[])[0]]+'60', borderRadius:6, padding:'4px 12px', fontSize:11, fontWeight:700, color:ESP_COR[(pomboPartilha.esp||[])[0]], backdropFilter:'blur(2px)' }}>
                    {ESP_ICON[(pomboPartilha.esp||[])[0]]} {(pomboPartilha.esp||[])[0]}
                  </div>
                )}
              </div>
              {/* STATS direita */}
              <div style={{ padding:'18px 16px', display:'flex', flexDirection:'column', justifyContent:'space-between', overflow:'hidden' }}>
                <div>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:'#fff', lineHeight:1.1, marginBottom:2 }}>{pomboPartilha.nome}</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#D4AF37', marginBottom:10 }}>{pomboPartilha.anilha}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:12, display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span>{pomboPartilha.sexo==='M'?'♂':'♀'}</span>
                    {pomboPartilha.cor&&<span>· {pomboPartilha.cor}</span>}
                    {idadeDoPombo(pomboPartilha.anilha)!==null&&<span>· {idadeDoPombo(pomboPartilha.anilha)}a</span>}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { label:'PERCENTIL', value:(pomboPartilha.percentil||0)+'%', color:(pomboPartilha.percentil||0)>=70?'#2DD4A7':'#D4AF37' },
                    { label:'FORMA', value:(pomboPartilha.forma||50)+'%', color:(pomboPartilha.forma||50)>=60?'#4C8DFF':'#94a3b8' },
                    { label:'PROVAS', value:String(pomboPartilha.provas||0), color:'#D4AF37' },
                  ].map(({label,value,color})=>(
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #1B2D52', paddingBottom:6 }}>
                      <span style={{ fontSize:10, color:'#475569', letterSpacing:'.08em' }}>{label}</span>
                      <span style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div>
                  {pomboPartilha.pombal&&<div style={{ fontSize:11, color:'#7A8699', marginTop:10 }}>🏠 {pomboPartilha.pombal}</div>}
                  <div style={{ fontSize:9, color:'#334155', marginTop:4, fontFamily:"'Space Mono',monospace" }}>championsloft.pt</div>
                </div>
              </div>
            </div>
            {pomboPartilha.obs&&(
              <div style={{ padding:'10px 16px', borderTop:'1px solid #1B2D52', fontSize:12, color:'#7A8699', fontStyle:'italic' }}>"{pomboPartilha.obs}"</div>
            )}
          </div>
          <div style={{ fontSize:11, color:'#475569', textAlign:'center' }}>Clica em "Publicar na LoftSocial" para partilhar com a comunidade</div>
        </Modal>
      )}

      {/* ══ MODAL MOVER POMBAL ═══════════════════════════════════════════ */}
      <Modal open={modalMover} onClose={()=>setModalMover(false)} title="🏠 Mover para Pombal"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalMover(false)}>{t('cancelar')}</button><button className="btn btn-primary" onClick={moverPombo}>{t('mover')}</button></>}>
        <div style={{fontSize:13,color:'#94a3b8',marginBottom:12}}>Mover <strong style={{color:'#fff'}}>{selected?.nome}</strong> para:</div>
        <select className="input" value={pombalDestino} onChange={e=>setPombalDestino(e.target.value)}>
          <option value="">— Seleccionar pombal —</option>
          {pombais.filter(pb=>pb.nome!==selected?.pombal).map(pb=><option key={pb.id} value={pb.nome}>{pb.nome}</option>)}
        </select>
        {selected?.pombal&&<div style={{fontSize:11,color:'#7A8699',marginTop:8}}>Pombal actual: {selected.pombal}</div>}
      </Modal>

      {/* ══ MODAL CARTAO REDES ══════════════════════════════════════════════ */}
      <Modal open={modalCartao} onClose={()=>setModalCartao(false)} title="🖼️ Cartão para Redes Sociais"
        footer={
          <div style={{display:'flex',gap:8,width:'100%'}}>
            <button className="btn btn-secondary" onClick={()=>setModalCartao(false)}>{t('fechar')}</button>
            <div style={{flex:1}}/>
            <button className="btn btn-primary" onClick={gerarImagemRedes} disabled={gerandoImg}>
              {gerandoImg?<Spinner/>:'⬇️ Guardar PNG'}
            </button>
          </div>
        }>
        {selected&&(
          <div>
            <div style={{fontSize:11,color:'#7A8699',marginBottom:12,textAlign:'center'}}>Prévia — formato quadrado para Instagram/Facebook</div>
            <div id="cartao-redes" style={{width:360,height:360,margin:'0 auto',background:'linear-gradient(145deg,#050D1A,#0B1830,#0A1F3A)',borderRadius:16,overflow:'hidden',position:'relative',fontFamily:"'Inter',system-ui,sans-serif"}}>
              <div style={{height:4,background:'linear-gradient(90deg,#7A6020,#D4AF37,#F5DFA0,#D4AF37,#7A6020)'}}/>
              <div style={{padding:'14px 16px',height:'calc(100% - 7px)',display:'flex',flexDirection:'column'}}>
                <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:12}}>
                  <div style={{width:88,height:88,borderRadius:12,overflow:'hidden',flexShrink:0,background:'#101F40',border:'2px solid rgba(212,175,55,.3)'}}>
                    {selected.foto_url
                      ?<img src={selected.foto_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} crossOrigin="anonymous"/>
                      :<FotoPlaceholder anilha={selected.anilha} nome={selected.nome} sexo={selected.sexo}/>
                    }
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:24,fontWeight:900,color:'#fff',lineHeight:1.1,marginBottom:3}}>{selected.nome}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:'#D4AF37',marginBottom:5}}>{selected.anilha}</div>
                    <div style={{fontSize:9,color:'#94a3b8',marginBottom:6}}>{selected.sexo==='M'?'Macho':'Femea'}{selected.cor?` · ${selected.cor}`:''}{selected.pombal?` · ${selected.pombal}`:''}</div>
                    {(selected.esp||[])[0]&&(
                      <div style={{display:'inline-block',background:`${ESP_COR[(selected.esp||[])[0]]}22`,border:`1px solid ${ESP_COR[(selected.esp||[])[0]]}60`,borderRadius:20,padding:'2px 9px',fontSize:9,fontWeight:700,color:ESP_COR[(selected.esp||[])[0]]}}>
                        {ESP_ICON[(selected.esp||[])[0]]} {(selected.esp||[])[0]}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:12}}>
                  {[{v:(selected.percentil||0)+'%',l:'Percentil',c:'#2DD4A7'},{v:(selected.forma||50)+'%',l:'Forma',c:'#4C8DFF'},{v:String(selected.provas||0),l:'Provas',c:'#D4AF37'}].map(({v,l,c})=>(
                    <div key={l} style={{background:'rgba(255,255,255,.05)',borderRadius:10,padding:'8px 4px',textAlign:'center',border:'1px solid rgba(255,255,255,.07)'}}>
                      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:20,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
                      <div style={{fontSize:8,color:'#475569',marginTop:2,letterSpacing:'.05em'}}>{l.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                {(pedigreeInfo?.pai||pedigreeInfo?.mae||selected.pai||selected.mae)&&(
                  <div style={{background:'rgba(255,255,255,.04)',borderRadius:10,padding:'8px 10px',marginBottom:12,border:'1px solid rgba(255,255,255,.06)'}}>
                    <div style={{fontSize:8,color:'#7A8699',letterSpacing:'.1em',marginBottom:5}}>PEDIGREE</div>
                    <div style={{display:'flex',gap:8}}>
                      {[['PAI',pedigreeInfo?.pai,selected.pai],['MAE',pedigreeInfo?.mae,selected.mae]].map(([lbl,ped,raw])=>(
                        <div key={lbl} style={{flex:1}}>
                          <div style={{fontSize:7,color:'#475569'}}>{lbl}</div>
                          <div style={{fontSize:10,fontWeight:600,color:'#fff'}}>{ped?.nome||raw||'—'}</div>
                          {ped?.anilha&&<div style={{fontSize:7,color:'#D4AF37'}}>{ped.anilha}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{flex:1}}/>
                {selected.obs&&<div style={{fontSize:9,color:'#7A8699',fontStyle:'italic',marginBottom:8,borderLeft:'2px solid #D4AF37',paddingLeft:8}}>"{selected.obs.slice(0,80)}{selected.obs.length>80?'...':''}"</div>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:12,fontWeight:900,color:'#D4AF37',letterSpacing:'.05em'}}>FLY2WIN</div>
                    <div style={{fontSize:6,color:'#475569',letterSpacing:'.1em'}}>FLY TO WIN · CONQUER THE SKIES</div>
                  </div>
                  <div style={{fontSize:7,color:'#334155'}}>fly2win.pt</div>
                </div>
              </div>
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#7A6020,#D4AF37,#F5DFA0,#D4AF37,#7A6020)'}}/>
            </div>
          </div>
        )}
      </Modal>

      {/* ══ MODAL FORM ════════════════════════════════════════════════════════ */}
      <Modal open={modal==='form'} onClose={close} title={selected?`✏️ ${selected.nome}`:t('novoPombo')} wide
        footer={<><button className="btn btn-secondary" onClick={close}>{t('cancelar')}</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}{selected?t('guardar'):'Adicionar'}</button></>}>
        <div className="form-grid">
          <div className="col-2" style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:72, height:72, borderRadius:14, border:'2px dashed #243860', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', cursor:'pointer', flexShrink:0 }} onClick={()=>document.getElementById('photo-up').click()}>
              {photoPreview?<img src={photoPreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />:<FotoPlaceholder anilha={form.anilha} nome={form.nome} sexo={form.sexo}/>}
            </div>
            <div>
              <input type="file" id="photo-up" accept="image/*" style={{ display:'none' }} onChange={e=>{ const f=e.target.files[0]; if(f){setPhotoFile(f);setPhotoPreview(URL.createObjectURL(f))} }} />
              <button className="btn btn-secondary btn-sm" onClick={()=>document.getElementById('photo-up').click()}>📸 Foto</button>
            </div>
          </div>
          <Field label={t('anilha')+' *'}>
            <div style={{ display:'flex', gap:4 }}>
              <select className="input" style={{ width:72 }} value={anilhaPais} onChange={e=>setAnilhaPais(e.target.value)}>{paises.map(p=><option key={p}>{p}</option>)}</select>
              <select className="input" style={{ width:88 }} value={anilhaAno} onChange={e=>setAnilhaAno(e.target.value)}>{anos.map(a=><option key={a}>{a}</option>)}</select>
              <input className="input" style={{ flex:1 }} placeholder="00000" maxLength={5} value={anilhaNum} onChange={e=>setAnilhaNum(e.target.value.replace(/[^0-9]/g,''))} />
            </div>
            <div style={{ fontSize:11, color:'#2DD4A7', marginTop:4 }}>🏷️ {anilhaPais}-{anilhaAno}-{(anilhaNum||'?????').padStart(5,'0')}</div>
          </Field>
          <Field label={t('nome')+' *'}><input className="input" placeholder={t('nomePombo')} value={form.nome} onChange={e=>sf('nome',e.target.value)} /></Field>
          <Field label={t('sexo')}><select className="input" value={form.sexo} onChange={e=>sf('sexo',e.target.value)}><option value="M">{t('macho')}</option><option value="F">{t('femea')}</option></select></Field>
          <Field label={t('estado')}><select className="input" value={form.estado} onChange={e=>sf('estado',e.target.value)}>{['ativo','reproducao','lesionado','inativo'].map(s=><option key={s}>{s}</option>)}</select></Field>
          <Field label={t('situacao')}><select className="input" value={form.estado_ext} onChange={e=>sf('estado_ext',e.target.value)}>{ESTADOS_EXT.map(s=><option key={s}>{s}</option>)}</select></Field>
          <Field label={t('cor')}>
            <input className="input" list="cores-pombo-list" placeholder={t('exCor')} value={form.cor} onChange={e=>sf('cor',e.target.value)} />
            <datalist id="cores-pombo-list">{CORES_POMBO.map(c=><option key={c} value={c} />)}</datalist>
          </Field>
          <Field label={t('peso')}><input className="input" type="number" placeholder="420" value={form.peso} onChange={e=>sf('peso',e.target.value)} /></Field>
          <Field label={t('pombal')}><select className="input" value={form.pombal} onChange={e=>sf('pombal',e.target.value)}><option value="">— Sem pombal —</option>{pombais.map(pb=><option key={pb.id}>{pb.nome}</option>)}</select></Field>
          <div className="col-2"><Field label={t('especialidades')}><div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>{ESPS.map(([v,l])=><button key={v} type="button" className={`chip${form.esp.includes(v)?' active':''}`} onClick={()=>toggleEsp(v)} style={{ color:form.esp.includes(v)?'#fff':ESP_COR[v] }}>{ESP_ICON[v]} {l}</button>)}</div></Field></div>
          <Field label={t('pai')}>
            <select className="input" style={{ marginBottom:4 }} value="" onChange={e=>{ if(e.target.value) sf('pai',e.target.value) }}>
              <option value="">— Seleccionar do efectivo —</option>
              {pombos.filter(p=>p.sexo==='M'&&p.id!==selected?.id).map(p=><option key={p.id} value={p.anilha}>{p.nome} ({p.anilha})</option>)}
            </select>
            <input className="input" style={{ fontSize:11 }} placeholder="PT-0000-00000" value={form.pai} onChange={e=>sf('pai',e.target.value.toUpperCase())} />
          </Field>
          <Field label={t('mae')}>
            <select className="input" style={{ marginBottom:4 }} value="" onChange={e=>{ if(e.target.value) sf('mae',e.target.value) }}>
              <option value="">— Seleccionar do efectivo —</option>
              {pombos.filter(p=>p.sexo==='F'&&p.id!==selected?.id).map(p=><option key={p.id} value={p.anilha}>{p.nome} ({p.anilha})</option>)}
            </select>
            <input className="input" style={{ fontSize:11 }} placeholder="PT-0000-00000" value={form.mae} onChange={e=>sf('mae',e.target.value.toUpperCase())} />
          </Field>
          <div className="col-2" style={{ borderTop:'1px solid #1e3050', paddingTop:12, marginTop:4 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#94a3b8', marginBottom:10 }}>📦 Origem / Aquisição</div>
          </div>
          <Field label={t('criadorOrigem')}><input className="input" placeholder={t('nomeCriador')} value={form.criador} onChange={e=>sf('criador',e.target.value)} /></Field>
          <Field label={t('dataAquisicao')}><input className="input" type="date" value={form.data_aquisicao} onChange={e=>sf('data_aquisicao',e.target.value)} /></Field>
          <Field label={t('valorAquisicao')}><input className="input" type="number" step="0.01" placeholder="0.00" value={form.valor_aquisicao} onChange={e=>sf('valor_aquisicao',e.target.value)} /></Field>
          <Field label="Obs. Aquisição"><input className="input" placeholder="Notas..." value={form.obs_aquisicao} onChange={e=>sf('obs_aquisicao',e.target.value)} /></Field>
          {form.estado_ext !== 'proprio' && (
            <>
              <div className="col-2" style={{ borderTop:'1px solid #1e3050', paddingTop:12, marginTop:4 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#D4AF37', marginBottom:10 }}>🎯 Destino ({form.estado_ext})</div>
              </div>
              <Field label="Destino"><input className="input" placeholder="Nome do destinatário" value={form.destino_nome} onChange={e=>sf('destino_nome',e.target.value)} /></Field>
              <Field label="Data"><input className="input" type="date" value={form.destino_data} onChange={e=>sf('destino_data',e.target.value)} /></Field>
              <Field label="Valor (€)"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.destino_valor} onChange={e=>sf('destino_valor',e.target.value)} /></Field>
              <Field label={t('observacoes')}><input className="input" placeholder="Notas..." value={form.destino_obs} onChange={e=>sf('destino_obs',e.target.value)} /></Field>
            </>
          )}
          <div className="col-2"><Field label={t('observacoes')}><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e=>sf('obs',e.target.value)} /></Field></div>
        </div>
      </Modal>

      {/* ══ MODAL DETAIL (NOVO LAYOUT COM FOTO ESQUERDA) ═══════════════════════ */}
      {selected && (
        <Modal open={modal==='detail'} onClose={close} title={`${selected.emoji||'🐦'} ${selected.nome}`} wide
          footer={
            <div style={{ display:'flex', gap:8, width:'100%', flexWrap:'wrap' }}>
              <button className="btn btn-danger btn-sm" onClick={()=>{ close(); setConfirm(selected) }}>🗑️</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>{ close(); nav?.('saude',{prefillPomboId:selected.id}) }}>🏥 Saúde</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>{ close(); nav?.('pedigree',{pomboId:selected.id}) }}>🌳 Pedigree</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>gerarFichaPombo(selected, historicoProvas, pedigreeInfo)}>📄 PDF</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>{ setModal(null); setTimeout(()=>setModalCartao(true),100) }}>🖼️ Redes</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>{ setModal(null); setTimeout(()=>setModalMover(true),100) }}>🏠 Mover</button>
              <div style={{ flex:1 }} />
              <button className="btn btn-secondary" onClick={close}>{t('fechar')}</button>
              <button className="btn btn-primary" onClick={()=>openEdit(selected)}>{t('editar')}</button>
            </div>
          }>

          {/* ── HEADER: FOTO ESQUERDA / INFO DIREITA ── */}
          {(() => {
            const c = classificarPombo(selected)
            const espPrincipal = (selected.esp || [])[0]
            const idade = idadeDoPombo(selected.anilha)
            const kmTotalDetailLocal = historicoProvas.reduce((s, r) => s + (r.races?.dist || 0), 0)
            const melhorPosLocal = historicoProvas.filter(r => r.posicao).sort((a, b) => a.posicao - b.posicao)[0]

            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '38% 62%',
                  borderRadius: 16,
                  overflow: 'hidden',
                  marginBottom: 16,
                  background: '#060F1A',
                  border: '1px solid #1B2D52',
                  minHeight: 280,
                }}
              >
                {/* ─── LADO ESQUERDO: FOTO ─── */}
                <div
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#0A1628',
                    height: '100%',
                    minHeight: 280,
                  }}
                >
                  {selected.foto_url ? (
                    <img
                      src={selected.foto_url}
                      alt={selected.nome}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 80,
                      }}
                    >
                      {selected.emoji || '🐦'}
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '40%',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                      pointerEvents: 'none',
                    }}
                  />
                  {espPrincipal && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        left: 12,
                        background: ESP_COR[espPrincipal] + '22',
                        border: '1px solid ' + ESP_COR[espPrincipal] + '60',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: ESP_COR[espPrincipal],
                        backdropFilter: 'blur(2px)',
                      }}
                    >
                      {ESP_ICON[espPrincipal]} {espPrincipal}
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      display: 'flex',
                      gap: 6,
                    }}
                  >
                    <Badge v={statusBadge[selected.estado]}>{selected.estado}</Badge>
                    {selected.estado_ext && selected.estado_ext !== 'proprio' && (
                      <Badge v={extBadge[selected.estado_ext] || 'gray'}>
                        {selected.estado_ext}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* ─── LADO DIREITO: INFORMAÇÕES ─── */}
                <div
                  style={{
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    overflow: 'hidden',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 2,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Fraunces',serif",
                          fontSize: 24,
                          fontWeight: 900,
                          color: '#fff',
                          lineHeight: 1.1,
                        }}
                      >
                        {selected.nome}
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 12,
                          fontWeight: 700,
                          color: c.cor,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.cor }} />
                        {c.tag}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 12,
                        color: '#D4AF37',
                        marginBottom: 8,
                      }}
                    >
                      {selected.anilha}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#94a3b8',
                        display: 'flex',
                        gap: 12,
                        flexWrap: 'wrap',
                        marginBottom: 10,
                      }}
                    >
                      <span>{selected.sexo === 'M' ? '♂ Macho' : '♀ Fêmea'}</span>
                      {idade !== null && <span>· {idade} {idade === 1 ? 'ano' : 'anos'}</span>}
                      {selected.cor && <span>· {selected.cor}</span>}
                      {selected.pombal && <span>· 🏠 {selected.pombal}</span>}
                    </div>
                    {(selected.esp || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                        {(selected.esp || []).map((e) => (
                          <span
                            key={e}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: ESP_COR[e],
                              background: `${ESP_COR[e]}18`,
                              border: `1px solid ${ESP_COR[e]}40`,
                              padding: '2px 10px',
                              borderRadius: 20,
                            }}
                          >
                            {ESP_ICON[e]} {e}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* KPIs em grelha */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: 6,
                      margin: '6px 0 10px 0',
                    }}
                  >
                    {[
                      { v: selected.provas ?? 0, l: 'Provas', cor: '#D4AF37' },
                      { v: (selected.percentil ?? 0) + '%', l: 'Percentil', cor: '#2DD4A7' },
                      { v: (selected.forma ?? 50) + '%', l: 'Forma', cor: '#4C8DFF' },
                      {
                        v: loadingDetail ? '…' : kmTotalDetailLocal > 0 ? kmTotalDetailLocal + 'km' : '—',
                        l: 'km Total',
                        cor: '#A855F7',
                      },
                      {
                        v: loadingDetail ? '…' : melhorPosLocal ? melhorPosLocal.posicao + 'º' : '—',
                        l: 'Melhor Pos.',
                        cor: '#F59E0B',
                      },
                    ].map(({ v, l, cor }) => (
                      <div
                        key={l}
                        style={{
                          textAlign: 'center',
                          background: '#101F40',
                          borderRadius: 8,
                          padding: '6px 2px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Fraunces',serif",
                            fontSize: 18,
                            fontWeight: 900,
                            color: cor,
                          }}
                        >
                          {v}
                        </div>
                        <div style={{ fontSize: 9, color: '#7A8699', marginTop: 1 }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Botões Partilhar e Pedigree */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const p = selected
                        setPomboPartilha(p)
                        setModal(null)
                        setTimeout(() => setModalPartilha(true), 50)
                      }}
                      style={{
                        background: 'rgba(45,212,167,.08)',
                        border: '1px solid rgba(45,212,167,.2)',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#2DD4A7',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      🌐 Partilhar na Comunidade
                    </button>
                    <button
                      onClick={() => {
                        nav?.('pedigree', { pomboId: selected.id })
                      }}
                      style={{
                        background: 'rgba(212,175,55,.08)',
                        border: '1px solid rgba(212,175,55,.2)',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#D4AF37',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      🌳 Pedigree
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* TABS de detalhe (Info, Provas, Saúde, Família, Treinos) */}
          <div style={{ display:'flex', gap:4, background:'#101F40', borderRadius:8, padding:4, marginBottom:14, overflowX:'auto' }}>
            {[['info','📋 Info'],['provas','🏆 Provas'],['saude','🏥 Saúde'],['familia','🌳 Família'],['treinos','🎯 Treinos']].map(([k,l])=>(
              <button key={k} onClick={()=>setTabDetail(k)} style={{ flex:1, padding:'6px 8px', borderRadius:6, fontSize:11, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', background:tabDetail===k?'#1E5FD9':'none', color:tabDetail===k?'#fff':'#94a3b8' }}>{l}</button>
            ))}
          </div>

          {loadingDetail ? <div style={{ display:'flex', justifyContent:'center', padding:30 }}><Spinner /></div> : (
            <>
              {/* ── INFO ── */}
              {tabDetail==='info'&&(
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {/* pedigree */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[['Pai',pedigreeInfo?.pai,selected.pai],['Mãe',pedigreeInfo?.mae,selected.mae]].map(([lbl,ped,raw])=>(
                      <div key={lbl} style={{ background:'#101F40', borderRadius:10, padding:'10px 12px' }}>
                        <div style={{ fontSize:10, color:'#7A8699', marginBottom:4 }}>{lbl}</div>
                        {ped ? (
                          <div>
                            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#D4AF37' }}>{ped.anilha}</div>
                            <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{ped.nome}</div>
                            {ped.cor&&<div style={{ fontSize:10, color:'#7A8699' }}>{ped.cor}</div>}
                            {ped.percentil>0&&<div style={{ fontSize:10, color:'#2DD4A7' }}>{t('percentil')}: {ped.percentil}%</div>}
                          </div>
                        ) : <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'#475569' }}>{raw||'—'}</div>}
                      </div>
                    ))}
                  </div>
                  {/* origem */}
                  {(selected.criador||selected.data_aquisicao||selected.valor_aquisicao)&&(
                    <div style={{ background:'#101F40', borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', marginBottom:6 }}>📦 ORIGEM</div>
                      {selected.criador&&<div style={{ fontSize:12, color:'#cbd5e1' }}>{t('criador')}: {selected.criador}</div>}
                      {selected.data_aquisicao&&<div style={{ fontSize:12, color:'#cbd5e1' }}>{t('data')}: {new Date(selected.data_aquisicao).toLocaleDateString('pt-PT')}</div>}
                      {selected.valor_aquisicao&&<div style={{ fontSize:12, color:'#D4AF37' }}>{t('valor')}: {selected.valor_aquisicao}€</div>}
                      {selected.obs_aquisicao&&<div style={{ fontSize:11, color:'#7A8699' }}>{selected.obs_aquisicao}</div>}
                    </div>
                  )}
                  {/* destino */}
                  {selected.estado_ext&&selected.estado_ext!=='proprio'&&selected.destino_nome&&(
                    <div style={{ background:'rgba(234,179,8,.08)', border:'1px solid rgba(234,179,8,.2)', borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'#D4AF37', marginBottom:6 }}>🎯 DESTINO — {selected.estado_ext.toUpperCase()}</div>
                      <div style={{ fontSize:12, color:'#cbd5e1' }}>{selected.destino_nome}</div>
                      {selected.destino_data&&<div style={{ fontSize:12, color:'#94a3b8' }}>{new Date(selected.destino_data).toLocaleDateString('pt-PT')}</div>}
                      {selected.destino_valor&&<div style={{ fontSize:12, color:'#D4AF37' }}>💶 {selected.destino_valor}€</div>}
                    </div>
                  )}
                  {selected.obs&&<div style={{ background:'#101F40', borderRadius:10, padding:'10px 12px' }}><div style={{ fontSize:10, color:'#7A8699', marginBottom:4 }}>OBSERVAÇÕES</div><div style={{ fontSize:13, color:'#cbd5e1' }}>{selected.obs}</div></div>}
                  {/* evolução peso */}
                  <div style={{ background:'#101F40', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>📈 Evolução de Peso</div>
                    <PesoChart registos={historicoSaude} />
                  </div>
                </div>
              )}

              {/* ── PROVAS ── */}
              {tabDetail==='provas'&&(
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
                    {[
                      {v:kmTotalDetail+'km', l:'km Percorridos', cor:'#A855F7'},
                      {v:velMedia?velMedia+' km/h':'—', l:'Vel. Média', cor:'#2DD4A7'},
                      {v:melhorPos?melhorPos.posicao+'º':'—', l:'Melhor Result.', cor:'#D4AF37'},
                    ].map(({v,l,cor})=>(
                      <div key={l} style={{ textAlign:'center', background:'#101F40', borderRadius:10, padding:'10px 6px' }}>
                        <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:cor }}>{v}</div>
                        <div style={{ fontSize:9, color:'#7A8699' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {historicoProvas.length===0
                    ?<div style={{ textAlign:'center', color:'#7A8699', padding:'24px 0', fontSize:13 }}>{t('semProvasPombo')}</div>
                    :<div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {historicoProvas.map(r=>{
                          const pct = r.posicao&&r.races?.n_pombos ? Math.round((r.posicao/r.races.n_pombos)*100) : null
                          return (
                            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#101F40', borderRadius:10 }}>
                              <div style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:18, color:r.posicao===1?'#D4AF37':r.posicao<=3?'#b45309':'#94a3b8', width:28, textAlign:'center', flexShrink:0 }}>{r.posicao?r.posicao+'º':'—'}</div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:12, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.races?.nome||'Prova'}</div>
                                <div style={{ fontSize:10, color:'#7A8699' }}>{r.races?.dist||0}km · {r.races?.local_solta||'—'} · {r.races?.data_reg?new Date(r.races.data_reg).toLocaleDateString('pt-PT',''):''}</div>
                              </div>
                              <div style={{ textAlign:'right', flexShrink:0 }}>
                                {r.velocidade&&<div style={{ fontSize:11, color:'#2DD4A7', fontWeight:600 }}>{r.velocidade}km/h</div>}
                                {pct&&<div style={{ fontSize:10, color:'#7A8699' }}>top {pct}%</div>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                  }
                </div>
              )}

              {/* ── SAÚDE ── */}
              {tabDetail==='saude'&&(
                <div>
                  <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
                    <button className="btn btn-primary btn-sm" onClick={()=>{ close(); nav?.('saude',{prefillPomboId:selected.id}) }}>＋ Novo Registo</button>
                  </div>
                  <div style={{ background:'#101F40', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>📈 Evolução de Peso</div>
                    <PesoChart registos={historicoSaude} />
                  </div>
                  {historicoSaude.length===0
                    ?<div style={{ textAlign:'center', color:'#7A8699', padding:'16px 0', fontSize:13 }}>{t('semRegistosSaude')}</div>
                    :<div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {historicoSaude.map(s=>(
                          <div key={s.id} style={{ display:'flex', gap:10, padding:'8px 12px', background:'#101F40', borderRadius:10, alignItems:'flex-start' }}>
                            <div style={{ fontSize:16, flexShrink:0 }}>{s.apt===false||s.aptidao==='inapto'?'🔴':'🟢'}</div>
                            <div style={{ flex:1 }}>
                              {s.fase&&<div style={{ fontSize:11, fontWeight:600, color:'#fff' }}>{s.fase}</div>}
                              {s.peso&&<div style={{ fontSize:11, color:'#4C8DFF' }}>⚖️ {s.peso}g</div>}
                              {s.obs&&<div style={{ fontSize:11, color:'#7A8699' }}>{s.obs}</div>}
                            </div>
                            <div style={{ fontSize:10, color:'#475569', flexShrink:0 }}>{s.created_at?new Date(s.created_at).toLocaleDateString('pt-PT'):''}</div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

              {/* ── FAMÍLIA ── */}
              {tabDetail==='familia'&&(
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {/* pais */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#7A8699', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>👨‍👩 Pais</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[['Pai ♂',pedigreeInfo?.pai,selected.pai],['Mãe ♀',pedigreeInfo?.mae,selected.mae]].map(([lbl,ped,raw])=>(
                        <div key={lbl} style={{ background:'#101F40', borderRadius:10, padding:'10px 12px' }}>
                          <div style={{ fontSize:10, color:'#7A8699', marginBottom:4 }}>{lbl}</div>
                          {ped?<><div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#D4AF37' }}>{ped.anilha}</div><div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{ped.nome}</div>{ped.percentil>0&&<div style={{ fontSize:10, color:'#2DD4A7' }}>{ped.percentil}%</div>}</>:<div style={{ fontSize:11, color:'#475569' }}>{raw||'—'}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* irmãos */}
                  {irmãos.length>0&&(
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#7A8699', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>🐦 Irmãos ({irmãos.length})</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {irmãos.map(p=>(
                          <div key={p.id} onClick={()=>openDetail(p)} style={{ display:'flex', alignItems:'center', gap:6, background:'#101F40', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:12 }}>
                            <span>{p.emoji||'🐦'}</span>
                            <div>
                              <div style={{ color:'#fff', fontWeight:500 }}>{p.nome}</div>
                              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#D4AF37' }}>{p.anilha}</div>
                            </div>
                            {p.percentil>0&&<span style={{ color:'#2DD4A7', fontSize:11, fontWeight:700 }}>{p.percentil}%</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* descendentes */}
                  {descendentes.length>0&&(
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#7A8699', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>🐣 Descendentes ({descendentes.length})</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {descendentes.map(p=>(
                          <div key={p.id} onClick={()=>openDetail(p)} style={{ display:'flex', alignItems:'center', gap:6, background:'#101F40', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:12 }}>
                            <span>{p.emoji||'🐦'}</span>
                            <div>
                              <div style={{ color:'#fff', fontWeight:500 }}>{p.nome}</div>
                              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#D4AF37' }}>{p.anilha}</div>
                            </div>
                            {p.percentil>0&&<span style={{ color:'#2DD4A7', fontSize:11, fontWeight:700 }}>{p.percentil}%</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {irmãos.length===0&&descendentes.length===0&&<div style={{ textAlign:'center', color:'#475569', padding:'16px 0', fontSize:13 }}>{t('semFamiliares')}</div>}
                  <button className="btn btn-secondary btn-sm" style={{ alignSelf:'flex-start' }} onClick={()=>{ close(); nav?.('pedigree',{pomboId:selected.id}) }}>🌳 Ver Pedigree Completo →</button>
                </div>
              )}

              {/* ── TREINOS ── */}
              {tabDetail==='treinos'&&(
                <div>
                  {historicoTreinos.length===0
                    ?<div style={{ textAlign:'center', color:'#7A8699', padding:'24px 0', fontSize:13 }}>{t('semTreinosPombo')}</div>
                    :(()=>{
                        const comVel=historicoTreinos.filter(t=>t.velocidade)
                        const velM=comVel.length?Math.round(comVel.reduce((s,t)=>s+t.velocidade,0)/comVel.length):null
                        return (
                          <div>
                            <div style={{ display:'flex', gap:16, marginBottom:12 }}>
                              <div><span style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:'#4C8DFF' }}>{historicoTreinos.length}</span> <span style={{ fontSize:11, color:'#7A8699' }}>treino(s)</span></div>
                              {velM&&<div><span style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:'#2DD4A7' }}>{velM}</span> <span style={{ fontSize:11, color:'#7A8699' }}>km/h média</span></div>}
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                              {historicoTreinos.map(tr=>(
                                <div key={tr.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#101F40', borderRadius:10 }}>
                                  <div style={{ flex:1, fontSize:12, color:'#cbd5e1', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tr.local||'—'}</div>
                                  {tr.dist&&<span style={{ fontSize:11, color:'#7A8699' }}>{tr.dist}km</span>}
                                  {tr.velocidade&&<span style={{ fontSize:11, color:'#2DD4A7', fontFamily:"'Space Mono',monospace" }}>{tr.velocidade}km/h</span>}
                                  <span style={{ fontSize:10, color:'#475569' }}>{new Date(tr.data_reg).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'})}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()
                  }
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      {/* ══ CONFIRM ═══════════════════════════════════════════════════════════ */}
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar pombo"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>{t('cancelar')}</button><button className="btn btn-danger" onClick={del}>{t('eliminar')}</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar "{confirm?.nome}"?</p>
      </Modal>
    </div>
  )
}
