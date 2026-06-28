import { useState, useEffect, useCallback } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'
import { useToast, Spinner, Modal, Field, EmptyState } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'

// ── constantes ────────────────────────────────────────────────────────────────
const ESP_ICON = { velocidade:'⚡','meio-fundo':'🎯',fundo:'🏔️','grande-fundo':'🌍',meio_fundo:'🎯',grande_fundo:'🌍' }
const ESP_COR  = { velocidade:'#F59E0B','meio-fundo':'#3B82F6',fundo:'#10B981','grande-fundo':'#8B5CF6',meio_fundo:'#3B82F6',grande_fundo:'#8B5CF6' }
const DURACOES = [['1','1 dia'],['3','3 dias'],['5','5 dias'],['7','7 dias'],['14','14 dias']]
const INCREMENTOS = [1,5,10,25,50,100]
const ESPS_FILTRO = [['todos','Todos'],['velocidade','⚡ Vel.'],['meio_fundo','🎯 MF'],['fundo','🏔️ Fundo'],['grande_fundo','🌍 GF']]

const EMPTY = { tipo_leilao:'pombo', pombo_id:'', nome:'', anilha:'', sexo:'M', cor:'', ano_nasc:'', esp:[], provas:0, percentil:0, leilao_min:'', leilao_reserva:'', descricao:'', foto_url:'', duracao:'3', leilao_silencioso:false, garantia_performance:false, garantia_percentil:'', garantia_provas:'', pai_id:'', mae_id:'', data_acasalamento_prev:'' }

// ── helpers ───────────────────────────────────────────────────────────────────
function anoDeAnilha(anilha) {
  const m = anilha?.match(/-(\d{2})-/)
  if (!m) return null
  const a = parseInt(m[1])
  return a > 50 ? 1900+a : 2000+a
}

function TempoRestante({ fim }) {
  const [resto, setResto] = useState('')
  useEffect(() => {
    const calc = () => {
      const diff = new Date(fim)-new Date()
      if (diff<=0) { setResto('terminado'); return }
      const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000),m=Math.floor((diff%3600000)/60000)
      setResto(d>0?`${d}d ${h}h`:h>0?`${h}h ${m}m`:`${m}m`)
    }
    calc(); const id=setInterval(calc,30000); return()=>clearInterval(id)
  },[fim])
  const diff=new Date(fim)-new Date()
  if(diff<=0) return <span style={{color:'#475569',fontSize:11}}>⏰ Encerrado</span>
  const urgente=diff<3600000,muitoUrgente=diff<600000
  return (
    <div style={{textAlign:'center'}}>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,color:muitoUrgente?'#f87171':urgente?'#D4AF37':'#2DD4A7',lineHeight:1}}>{resto}</div>
      <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:.5}}>restante</div>
      {muitoUrgente&&<div style={{fontSize:9,color:'#f87171',marginTop:2}}>🔥 A terminar!</div>}
      {urgente&&!muitoUrgente&&<div style={{fontSize:9,color:'#D4AF37',marginTop:2}}>⚡ Última hora!</div>}
    </div>
  )
}

function ScoreVendedor({ score, total }) {
  const s=Math.round(score||5)
  return (
    <div style={{display:'flex',alignItems:'center',gap:4}}>
      <div style={{display:'flex',gap:1}}>{[1,2,3,4,5].map(i=><span key={i} style={{fontSize:10,color:i<=s?'#D4AF37':'#334155'}}>★</span>)}</div>
      <span style={{fontSize:10,color:'#7A8699'}}>{(score||5).toFixed(1)} ({total||0})</span>
    </div>
  )
}

// ── selector de pombo ─────────────────────────────────────────────────────────
function SelectorPombo({ pombos, value, onChange, label='🐦 Escolher do efectivo', placeholder='— Seleccionar pombo —' }) {
  const p = pombos.find(x=>x.id===value)
  return (
    <div>
      <select className="input" value={value} onChange={e=>onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {pombos.map(p=>(
          <option key={p.id} value={p.id}>
            {p.emoji||'🐦'} {p.nome} ({p.anilha}){p.percentil>0?` · ${p.percentil}%`:''}
          </option>
        ))}
      </select>
      {p&&(
        <div style={{display:'flex',gap:10,alignItems:'center',marginTop:8,padding:'8px 10px',background:'rgba(45,212,167,.06)',border:'1px solid rgba(45,212,167,.15)',borderRadius:8}}>
          <div style={{width:36,height:36,borderRadius:8,background:'#101F40',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
            {p.foto_url?<img src={p.foto_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:p.emoji||'🐦'}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:'#fff'}}>{p.nome}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:'#2DD4A7'}}>{p.anilha}</div>
            <div style={{fontSize:10,color:'#7A8699'}}>
              {p.sexo==='M'?'♂':'♀'} · {p.cor||'—'} · {p.provas||0} provas{p.percentil>0?` · ${p.percentil}%`:''}{p.forma>0?` · forma ${p.forma}%`:''}
            </div>
            {(p.esp||[]).length>0&&(
              <div style={{display:'flex',gap:4,marginTop:3}}>
                {p.esp.map(e=><span key={e} style={{fontSize:9,color:ESP_COR[e]||'#7A8699',background:`${ESP_COR[e]||'#7A8699'}15`,padding:'1px 5px',borderRadius:5}}>{ESP_ICON[e]||'🐦'} {e}</span>)}
              </div>
            )}
          </div>
          {p.percentil>0&&<div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,color:p.percentil>=75?'#2DD4A7':p.percentil>=50?'#D4AF37':'#f87171'}}>{p.percentil}%</div>}
        </div>
      )}
    </div>
  )
}

// ── componente principal ──────────────────────────────────────────────────────
export default function Leiloes({ nav }) {
  const { user }   = useAuth()
  const toast      = useToast()
  const { t }      = useIdioma()
  const { temPro } = useLicenca()

  const [leiloes, setLeiloes]           = useState([])
  const [meusLeiloes, setMeusLeiloes]   = useState([])
  const [encerrados, setEncerrados]     = useState([])
  const [favoritos, setFavoritos]       = useState([])
  const [alertas, setAlertas]           = useState([])
  const [pombos, setPombos]             = useState([])
  const [scoresVendedor, setScoresVendedor] = useState({})
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState('ativos')
  const [modal, setModal]               = useState(false)
  const [modalAlertas, setModalAlertas] = useState(false)
  const [form, setForm]                 = useState(EMPTY)
  const [formAlerta, setFormAlerta]     = useState({especialidade:'todos',percentil_min:0,preco_max:''})
  const [saving, setSaving]             = useState(false)
  const [expandido, setExpandido]       = useState(null)
  const [licitacoes, setLicitacoes]     = useState({})
  const [valorLic, setValorLic]         = useState('')
  const [licitando, setLicitando]       = useState(false)
  const [filtroEsp, setFiltroEsp]       = useState('todos')
  const [filtroTipo, setFiltroTipo]     = useState('todos')
  const [filtroPrecMin, setFiltroPrecMin] = useState('')
  const [filtroPrecMax, setFiltroPrecMax] = useState('')
  const [filtroPercMin, setFiltroPercMin] = useState('')
  const [ordenar, setOrdenar]           = useState('fim')
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const agora=new Date().toISOString()
      const [{ data:ativos },{ data:meus },{ data:enc },{ data:favs },{ data:alts },p] = await Promise.all([
        supabase.from('marketplace').select('*').eq('tipo','leilao').gt('leilao_fim',agora).order('leilao_fim'),
        supabase.from('marketplace').select('*').eq('tipo','leilao').eq('user_id',user?.id).order('created_at',{ascending:false}),
        supabase.from('marketplace').select('*').eq('tipo','leilao').lte('leilao_fim',agora).order('leilao_fim',{ascending:false}).limit(30),
        supabase.from('leilao_favoritos').select('anuncio_id').eq('user_id',user?.id),
        supabase.from('leilao_alertas').select('*').eq('user_id',user?.id).eq('ativo',true),
        db.getPombos(),
      ])
      setLeiloes(ativos||[]); setMeusLeiloes(meus||[]); setEncerrados(enc||[])
      setFavoritos((favs||[]).map(f=>f.anuncio_id))
      setAlertas(alts||[])
      setPombos(p.filter(x=>!x.estado_ext||x.estado_ext==='proprio'))
      const scores={}
      ;(enc||[]).forEach(l=>{ if(!scores[l.user_id]) scores[l.user_id]={total:0,score:5.0}; scores[l.user_id].total++ })
      setScoresVendedor(scores)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[user?.id])
  useEffect(()=>{ load() },[load])

  // ── quando selecciona pombo — preencher form automaticamente ──────────────
  const onSelectPombo = (pomboId) => {
    sf('pombo_id', pomboId)
    const p = pombos.find(x=>x.id===pomboId)
    if (!p) return
    setForm(f=>({
      ...f,
      pombo_id: pomboId,
      nome: p.nome||'',
      anilha: p.anilha||'',
      sexo: p.sexo||'M',
      cor: p.cor||'',
      ano_nasc: String(anoDeAnilha(p.anilha)||''),
      esp: p.esp||[],
      provas: p.provas||0,
      percentil: p.percentil||0,
      foto_url: p.foto_url||'',
    }))
  }

  // ── quando selecciona pai/mãe para descendentes ───────────────────────────
  const onSelectPai = (pomboId) => {
    sf('pai_id', pomboId)
    const p = pombos.find(x=>x.id===pomboId)
    if (p) sf('esp', p.esp||[])
  }

  // ── favoritos ─────────────────────────────────────────────────────────────
  const toggleFavorito = async (anuncioId, e) => {
    e?.stopPropagation()
    const isFav=favoritos.includes(anuncioId)
    if (isFav) {
      await supabase.from('leilao_favoritos').delete().eq('user_id',user?.id).eq('anuncio_id',anuncioId)
      setFavoritos(f=>f.filter(x=>x!==anuncioId)); toast('Removido dos favoritos','ok')
    } else {
      await supabase.from('leilao_favoritos').insert({user_id:user?.id,anuncio_id:anuncioId})
      setFavoritos(f=>[...f,anuncioId]); toast('⭐ Adicionado aos favoritos','ok')
    }
  }

  // ── alertas ───────────────────────────────────────────────────────────────
  const criarAlerta = async () => {
    try {
      await supabase.from('leilao_alertas').insert({user_id:user?.id,especialidade:formAlerta.especialidade==='todos'?null:formAlerta.especialidade,percentil_min:parseInt(formAlerta.percentil_min)||0,preco_max:formAlerta.preco_max?parseInt(formAlerta.preco_max):null,ativo:true})
      toast('🔔 Alerta criado!','ok'); setModalAlertas(false); load()
    } catch(e){toast('Erro: '+e.message,'err')}
  }
  const eliminarAlerta = async (id) => {
    await supabase.from('leilao_alertas').delete().eq('id',id)
    toast('Alerta eliminado','ok'); load()
  }

  // ── licitações ────────────────────────────────────────────────────────────
  const carregarLics = async (id) => {
    const{data}=await supabase.from('leilao_licitacoes').select('*').eq('anuncio_id',id).order('valor',{ascending:false}).limit(10)
    setLicitacoes(l=>({...l,[id]:data||[]}))
  }
  const toggleExpandido = (id) => {
    if(expandido===id){setExpandido(null);return}
    setExpandido(id); carregarLics(id); setValorLic('')
  }
  const licitar = async (leilao) => {
    const val=parseFloat(valorLic)
    const minLance=Math.max(leilao.leilao_atual||0,leilao.leilao_min||0)+1
    if(!val||val<minLance){toast(`Lance mínimo: ${minLance}€`,'warn');return}
    setLicitando(true)
    try {
      await supabase.from('leilao_licitacoes').insert({anuncio_id:leilao.id,user_id:user?.id,nome_licitante:leilao.leilao_silencioso?'Licitante anónimo':user?.user_metadata?.nome||user?.email,valor:val})
      await supabase.from('marketplace').update({leilao_atual:val,leilao_licitacoes:(leilao.leilao_licitacoes||0)+1}).eq('id',leilao.id)
      toast(`🔨 Lance de ${val}€!`,'ok'); setValorLic(''); load(); carregarLics(leilao.id)
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setLicitando(false)}
  }

  // ── criar leilão ──────────────────────────────────────────────────────────
  const criarLeilao = async () => {
    if(form.tipo_leilao==='pombo'&&!form.nome.trim()){toast('Seleccione um pombo ou preencha o nome','warn');return}
    if(form.tipo_leilao==='descendente'&&(!form.pai_id||!form.mae_id)){toast('Seleccione pai e mãe','warn');return}
    if(!form.leilao_min){toast('Lance mínimo obrigatório','warn');return}
    setSaving(true)
    try {
      const fim=new Date(Date.now()+parseInt(form.duracao)*24*3600000).toISOString()
      const pai=pombos.find(x=>x.id===form.pai_id)
      const mae=pombos.find(x=>x.id===form.mae_id)
      const nomeDesc=form.tipo_leilao==='descendente'?`Descendente de ${pai?.nome||'?'} × ${mae?.nome||'?'}`:form.nome
      await supabase.from('marketplace').insert({
        nome:nomeDesc.trim(), anilha:form.anilha, sexo:form.sexo, cor:form.cor,
        esp:form.esp, provas:parseInt(form.provas)||0, percentil:parseFloat(form.percentil)||0,
        descricao:form.descricao, foto_url:form.foto_url,
        user_id:user?.id, tipo:'leilao',
        subtipo:form.tipo_leilao,
        leilao_fim:fim, leilao_fin:fim,
        leilao_min:parseFloat(form.leilao_min)||0,
        leilao_atual:parseFloat(form.leilao_min)||0,
        leilao_reserva:form.leilao_reserva?parseFloat(form.leilao_reserva):null,
        leilao_silencioso:form.leilao_silencioso,
        garantia_performance:form.garantia_performance,
        garantia_percentil:form.garantia_performance&&form.garantia_percentil?parseInt(form.garantia_percentil):null,
        garantia_provas:form.garantia_performance&&form.garantia_provas?parseInt(form.garantia_provas):null,
        preco:parseFloat(form.leilao_min)||0,
        estado:'disponivel',
        autor_nome:user?.user_metadata?.nome||user?.email,
        pombo_id:form.pombo_id||null,
        pai_id:form.pai_id||null,
        mae_id:form.mae_id||null,
        pai_nome:pai?`${pai.nome} (${pai.anilha})`:null,
        mae_nome:mae?`${mae.nome} (${mae.anilha})`:null,
        data_acasalamento_prev:form.data_acasalamento_prev||null,
      })
      toast(form.tipo_leilao==='descendente'?'🥚 Leilão de descendente publicado!':'🔨 Leilão publicado!','ok')
      setModal(false); setForm(EMPTY); load()
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setSaving(false)}
  }

  // ── partilhar WhatsApp ────────────────────────────────────────────────────
  const partilharWA = (l, e) => {
    e?.stopPropagation()
    const isDesc=l.subtipo==='descendente'
    const texto=`🔨 Leilão ChampionsLoft\n\n${isDesc?'🥚':'🐦'} *${l.nome}*${l.anilha?`\n🏷️ ${l.anilha}`:''}\n${l.provas>0?`\n🏆 ${l.provas} provas · ${l.percentil}% percentil`:''}\n${isDesc&&l.data_acasalamento_prev?`\n📅 Acasalamento previsto: ${new Date(l.data_acasalamento_prev).toLocaleDateString('pt-PT')}`:''}\n\n💰 Lance actual: *${(l.leilao_atual||l.leilao_min||0).toFixed(0)}€*\n⏱️ Termina: ${new Date(l.leilao_fim).toLocaleDateString('pt-PT')}\n\n👉 Ver em ChampionsLoft`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`,'_blank')
  }

  // ── filtros ───────────────────────────────────────────────────────────────
  const leiloesFiltrados = leiloes.filter(l=>{
    if(filtroTipo!=='todos'&&(l.subtipo||'pombo')!==filtroTipo) return false
    if(filtroEsp!=='todos'&&!(l.esp||[]).includes(filtroEsp)) return false
    if(filtroPrecMin&&(l.leilao_atual||l.leilao_min||0)<parseFloat(filtroPrecMin)) return false
    if(filtroPrecMax&&(l.leilao_atual||l.leilao_min||0)>parseFloat(filtroPrecMax)) return false
    if(filtroPercMin&&(l.percentil||0)<parseFloat(filtroPercMin)) return false
    return true
  }).sort((a,b)=>{
    if(ordenar==='fim') return new Date(a.leilao_fim)-new Date(b.leilao_fim)
    if(ordenar==='valor') return (b.leilao_atual||b.leilao_min||0)-(a.leilao_atual||a.leilao_min||0)
    if(ordenar==='lances') return (b.leilao_licitacoes||0)-(a.leilao_licitacoes||0)
    if(ordenar==='percentil') return (b.percentil||0)-(a.percentil||0)
    return 0
  })
  const leiloesFavoritos=leiloes.filter(l=>favoritos.includes(l.id))

  if(!temPro) return <BloqueioPlano plano="pro" nav={nav} />

  // ── render card ───────────────────────────────────────────────────────────
  const renderCard = (l, encerrado=false) => {
    const aberto=expandido===l.id
    const lanceAtual=l.leilao_atual||l.leilao_min||0
    const minLance=lanceAtual+1
    const lics=licitacoes[l.id]||[]
    const isFav=favoritos.includes(l.id)
    const estouAGanhar=lics[0]?.user_id===user?.id
    const meuLance=lics.find(lc=>lc.user_id===user?.id)
    const isMinhaPubl=l.user_id===user?.id
    const diff=new Date(l.leilao_fim)-new Date()
    const urgente=diff>0&&diff<3600000
    const vendedorScore=scoresVendedor[l.user_id]
    const reservaAtingida=l.leilao_reserva&&lanceAtual>=l.leilao_reserva
    const isDesc=l.subtipo==='descendente'

    return (
      <div key={l.id} style={{background:'#0B1830',border:`1px solid ${urgente?'rgba(248,113,113,.35)':encerrado?'#162040':isDesc?'rgba(45,212,167,.25)':isFav?'rgba(212,175,55,.35)':'rgba(212,175,55,.15)'}`,borderRadius:14,overflow:'hidden',transition:'border-color .2s'}}>
        <div style={{height:2,background:encerrado?'#162040':isDesc?'linear-gradient(90deg,#10B981,#2DD4A7)':urgente?'#f87171':'linear-gradient(90deg,#6B4F00,#D4AF37,#B8960C)'}} />
        <div style={{padding:'12px 14px'}}>
          {/* tipo badge */}
          {isDesc&&<div style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:10,fontWeight:700,color:'#2DD4A7',background:'rgba(45,212,167,.1)',padding:'2px 8px',borderRadius:8,marginBottom:8}}>🥚 Leilão de Descendente</div>}

          <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
            {/* foto */}
            <div style={{position:'relative',flexShrink:0}}>
              <div style={{width:64,height:64,borderRadius:10,background:'#101F40',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:isDesc?32:28,border:`1px solid ${isDesc?'rgba(45,212,167,.2)':'#1B2D52'}`}}>
                {isDesc?'🥚':l.foto_url?<img src={l.foto_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:'🐦'}
              </div>
              {l.garantia_performance&&<div style={{position:'absolute',bottom:-4,left:'50%',transform:'translateX(-50%)',fontSize:9,background:'#10B981',color:'#fff',padding:'1px 5px',borderRadius:6,whiteSpace:'nowrap',fontWeight:700}}>✓ Garantia</div>}
            </div>
            {/* info */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                <span style={{fontSize:14,fontWeight:700,color:'#fff'}}>{l.nome}</span>
                {!isDesc&&l.sexo&&<span style={{fontSize:11,color:'#7A8699'}}>{l.sexo==='M'?'♂':'♀'}</span>}
                {l.leilao_silencioso&&<span style={{fontSize:9,color:'#8B5CF6',background:'rgba(139,92,246,.1)',padding:'1px 5px',borderRadius:6}}>🔇 Silencioso</span>}
              </div>
              {!isDesc&&l.anilha&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:'#2DD4A7',marginBottom:3}}>{l.anilha}</div>}
              {isDesc&&l.pai_nome&&<div style={{fontSize:11,color:'#7A8699',marginBottom:3}}>♂ {l.pai_nome} × ♀ {l.mae_nome}</div>}
              {isDesc&&l.data_acasalamento_prev&&<div style={{fontSize:10,color:'#2DD4A7',marginBottom:3}}>📅 Acasalamento prev.: {new Date(l.data_acasalamento_prev).toLocaleDateString('pt-PT')}</div>}
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:4}}>
                {(l.esp||[]).map(e=><span key={e} style={{fontSize:10,color:ESP_COR[e]||'#7A8699',background:`${ESP_COR[e]||'#7A8699'}15`,padding:'1px 6px',borderRadius:6,fontWeight:600}}>{ESP_ICON[e]||'🐦'} {e}</span>)}
              </div>
              {!isDesc&&(l.provas>0||l.percentil>0)&&(
                <div style={{fontSize:10,color:'#7A8699',marginBottom:3}}>
                  {l.provas>0&&`${l.provas} provas`}{l.provas>0&&l.percentil>0&&' · '}{l.percentil>0&&<span style={{color:(l.percentil||0)>=75?'#2DD4A7':'#D4AF37',fontWeight:600}}>{l.percentil}% percentil</span>}
                </div>
              )}
              <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                <span style={{fontSize:10,color:'#475569'}}>{l.autor_nome}</span>
                {vendedorScore&&<ScoreVendedor score={vendedorScore.score} total={vendedorScore.total}/>}
              </div>
            </div>
            {/* lance + tempo */}
            <div style={{textAlign:'center',flexShrink:0,minWidth:72}}>
              <div style={{fontSize:9,color:'#7A8699',marginBottom:1}}>Lance actual</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,color:'#D4AF37',lineHeight:1}}>{lanceAtual.toFixed(0)}€</div>
              <div style={{fontSize:9,color:'#7A8699',marginBottom:6}}>{l.leilao_licitacoes||0} lance(s)</div>
              {!encerrado?<TempoRestante fim={l.leilao_fim}/>:<div style={{fontSize:10,color:'#475569'}}>Encerrado</div>}
              {reservaAtingida&&<div style={{fontSize:9,color:'#2DD4A7',marginTop:3,fontWeight:700}}>✓ Reserva</div>}
            </div>
          </div>

          {/* descrição */}
          {l.descricao&&<div style={{fontSize:11,color:'#7A8699',marginTop:8,lineHeight:1.5,borderTop:'1px solid #162040',paddingTop:8}}>{l.descricao.slice(0,120)}{l.descricao.length>120?'…':''}</div>}

          {/* garantia */}
          {l.garantia_performance&&(
            <div style={{marginTop:8,fontSize:10,color:'#10B981',background:'rgba(16,185,129,.07)',border:'1px solid rgba(16,185,129,.2)',borderRadius:8,padding:'5px 10px'}}>
              ✅ Garantia de performance — devolução se não atingir {l.garantia_percentil}% nas primeiras {l.garantia_provas} provas
            </div>
          )}

          {/* badges */}
          <div style={{display:'flex',gap:5,marginTop:8,flexWrap:'wrap'}}>
            {estouAGanhar&&!encerrado&&<span style={{fontSize:10,fontWeight:700,color:'#2DD4A7',background:'rgba(45,212,167,.1)',padding:'2px 8px',borderRadius:8}}>🏆 A ganhar</span>}
            {meuLance&&!estouAGanhar&&!encerrado&&<span style={{fontSize:10,color:'#f87171',background:'rgba(248,113,113,.1)',padding:'2px 8px',borderRadius:8}}>Superado — {meuLance.valor}€</span>}
            {isMinhaPubl&&<span style={{fontSize:10,color:'#4C8DFF',background:'rgba(76,141,255,.1)',padding:'2px 8px',borderRadius:8}}>📋 Meu leilão</span>}
            {urgente&&!encerrado&&<span style={{fontSize:10,color:'#f87171',background:'rgba(248,113,113,.1)',padding:'2px 8px',borderRadius:8}}>🔥 Última hora</span>}
          </div>

          {/* acções */}
          <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap',alignItems:'center'}}>
            <button onClick={e=>toggleFavorito(l.id,e)} style={{background:'none',border:`1px solid ${isFav?'rgba(212,175,55,.4)':'#1B2D52'}`,borderRadius:8,padding:'5px 8px',cursor:'pointer',fontSize:14,color:isFav?'#D4AF37':'#475569'}} title={isFav?'Remover':'Favorito'}>
              {isFav?'⭐':'☆'}
            </button>
            <button onClick={e=>partilharWA(l,e)} style={{background:'rgba(37,211,102,.1)',border:'1px solid rgba(37,211,102,.2)',borderRadius:8,padding:'5px 8px',cursor:'pointer',fontSize:12,color:'#25D166',fontFamily:'inherit'}}>
              📲 WA
            </button>
            <button className="btn btn-secondary btn-sm" onClick={()=>toggleExpandido(l.id)}>
              {aberto?'▲ Fechar':'📋 Lances'}
            </button>
            {!encerrado&&!isMinhaPubl&&(
              <button onClick={()=>{toggleExpandido(l.id);setTimeout(()=>document.getElementById(`lic-${l.id}`)?.focus(),150)}}
                style={{background:'linear-gradient(135deg,#B8960C,#D4AF37)',color:'#050D1A',border:'none',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:12,marginLeft:'auto'}}>
                🔨 {isDesc?'Reservar':'Licitar'}
              </button>
            )}
          </div>
        </div>

        {/* painel expandido */}
        {aberto&&(
          <div style={{borderTop:'1px solid #162040',background:'#070F1D',padding:'12px 14px'}}>
            {lics.length>0?(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'#D4AF37',marginBottom:8}}>
                  {l.leilao_silencioso?'🔇 Leilão Silencioso':'Histórico de Lances'}
                </div>
                {!l.leilao_silencioso&&lics.map((lc,i)=>(
                  <div key={lc.id||i} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,padding:'4px 0',borderBottom:'1px solid #0d1b2e'}}>
                    <span style={{color:i===0?'#D4AF37':'#475569',width:20,textAlign:'center'}}>{i===0?'🥇':i+1}</span>
                    <span style={{flex:1,color:i===0?'#fff':'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lc.nome_licitante||'—'}</span>
                    <span style={{color:i===0?'#D4AF37':'#7A8699',fontWeight:i===0?700:400}}>{lc.valor}€</span>
                  </div>
                ))}
                {l.leilao_silencioso&&<div style={{fontSize:11,color:'#7A8699',fontStyle:'italic'}}>{lics.length} lance(s). Os valores são ocultos.</div>}
              </div>
            ):(
              <div style={{fontSize:11,color:'#475569',marginBottom:12,fontStyle:'italic'}}>Sem lances ainda — sê o primeiro!</div>
            )}
            {!encerrado&&!isMinhaPubl&&(
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'#fff',marginBottom:8}}>{isDesc?'Fazer Reserva':'Fazer Lance'}</div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
                  {INCREMENTOS.map(inc=>(
                    <button key={inc} onClick={()=>setValorLic(String(Math.max(minLance,parseFloat(valorLic||lanceAtual)+inc)))}
                      className="btn btn-secondary btn-sm" style={{flex:1,fontSize:10,minWidth:32}}>+{inc}</button>
                  ))}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <input id={`lic-${l.id}`} className="input" type="number" value={valorLic} onChange={e=>setValorLic(e.target.value)} placeholder={`Mín. ${minLance}€`} style={{flex:1}}/>
                  <button onClick={()=>licitar(l)} disabled={licitando}
                    style={{background:'linear-gradient(135deg,#B8960C,#D4AF37)',color:'#050D1A',border:'none',borderRadius:8,padding:'0 16px',cursor:'pointer',fontFamily:'inherit',fontWeight:700,flexShrink:0}}>
                    {licitando?<Spinner/>:isDesc?'🥚 Reservar':'🔨 Licitar'}
                  </button>
                </div>
                <div style={{fontSize:10,color:'#475569',marginTop:4,display:'flex',gap:10}}>
                  <span>Mínimo: <span style={{color:'#D4AF37',fontWeight:600}}>{minLance}€</span></span>
                  {l.leilao_reserva&&!reservaAtingida&&<span>Preço de reserva: oculto</span>}
                  {reservaAtingida&&<span style={{color:'#2DD4A7'}}>✓ Preço de reserva atingido</span>}
                </div>
              </div>
            )}
            {encerrado&&lics.length>0&&(
              <div style={{padding:'8px 12px',background:'rgba(45,212,167,.07)',border:'1px solid rgba(45,212,167,.2)',borderRadius:8}}>
                <div style={{fontSize:12,fontWeight:700,color:'#2DD4A7'}}>🏆 Vencedor: {l.leilao_silencioso?'(silencioso)':lics[0].nome_licitante}</div>
                <div style={{fontSize:11,color:'#7A8699',marginTop:2}}>Lance final: <strong style={{color:'#D4AF37'}}>{lics[0].valor}€</strong></div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0A0800,#1A1000,#0D0A00)',border:'1px solid rgba(212,175,55,.3)',borderRadius:14,padding:'16px',marginBottom:14,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#3D2C00,#D4AF37,#F5CC50,#D4AF37,#3D2C00)'}}/>
        <div style={{position:'absolute',top:-20,right:-20,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,rgba(212,175,55,.06),transparent)',pointerEvents:'none'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'relative'}}>
          <div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:900,color:'#D4AF37',marginBottom:2,textShadow:'0 0 30px rgba(212,175,55,.3)'}}>🔨 Leilões</div>
            <div style={{fontSize:11,color:'#7A8699'}}>{leiloes.length} activo(s) · {encerrados.length} encerrado(s)</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setModalAlertas(true)} style={{background:'rgba(212,175,55,.1)',border:'1px solid rgba(212,175,55,.25)',borderRadius:10,padding:'8px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:12,color:'#D4AF37'}}>
              🔔 {alertas.length>0?`${alertas.length}`:''} Alertas
            </button>
            <button onClick={()=>{setForm(EMPTY);setModal(true)}} style={{background:'linear-gradient(135deg,#B8960C,#D4AF37)',color:'#050D1A',border:'none',borderRadius:10,padding:'10px 16px',cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:13,boxShadow:'0 4px 15px rgba(212,175,55,.3)'}}>
              🔨 Leiloar
            </button>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:14,position:'relative'}}>
          {[
            {v:leiloes.length,l:'Activos',cor:'#2DD4A7'},
            {v:leiloes.filter(l=>l.subtipo==='descendente').length,l:'Descendentes',cor:'#10B981'},
            {v:favoritos.length,l:'Favoritos',cor:'#F59E0B'},
            {v:encerrados.length>0?(encerrados[0].leilao_atual||encerrados[0].leilao_min||0).toFixed(0)+'€':'—',l:'Último encerrado',cor:'#A855F7'},
          ].map(({v,l,cor})=>(
            <div key={l} style={{textAlign:'center',background:'rgba(255,255,255,.03)',borderRadius:8,padding:'8px 4px'}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:900,color:cor}}>{v}</div>
              <div style={{fontSize:9,color:'#475569'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:3,background:'#0A1628',borderRadius:10,padding:3,marginBottom:14}}>
        {[
          ['ativos',`🔨 Activos (${leiloes.length})`],
          ['favoritos',`⭐ Favoritos (${leiloesFavoritos.length})`],
          ['meus',`📋 Os meus (${meusLeiloes.length})`],
          ['encerrados','⏰ Encerrados'],
        ].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'7px 3px',borderRadius:8,fontSize:10,fontWeight:600,cursor:'pointer',border:'none',fontFamily:'inherit',whiteSpace:'nowrap',background:tab===k?'linear-gradient(135deg,#B8960C,#D4AF37)':'none',color:tab===k?'#050D1A':'#475569'}}>{l}</button>
        ))}
      </div>

      {/* filtros */}
      {tab==='ativos'&&(
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            <button onClick={()=>setFiltroTipo('todos')} className={`chip${filtroTipo==='todos'?' active':''}`} style={{fontSize:10}}>Todos</button>
            <button onClick={()=>setFiltroTipo('pombo')} className={`chip${filtroTipo==='pombo'?' active':''}`} style={{fontSize:10}}>🐦 Pombos</button>
            <button onClick={()=>setFiltroTipo('descendente')} className={`chip${filtroTipo==='descendente'?' active':''}`} style={{fontSize:10}}>🥚 Descendentes</button>
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {ESPS_FILTRO.map(([v,l])=>(
              <button key={v} onClick={()=>setFiltroEsp(v)} className={`chip${filtroEsp===v?' active':''}`} style={{fontSize:10}}>{l}</button>
            ))}
            <select value={ordenar} onChange={e=>setOrdenar(e.target.value)} className="input" style={{fontSize:11,padding:'4px 8px',borderRadius:8,marginLeft:'auto',width:'auto'}}>
              <option value="fim">A terminar</option>
              <option value="valor">Maior lance</option>
              <option value="lances">Mais lances</option>
              <option value="percentil">Melhor percentil</option>
            </select>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <input className="input" type="number" placeholder="Preço min €" value={filtroPrecMin} onChange={e=>setFiltroPrecMin(e.target.value)} style={{width:100,fontSize:11,padding:'4px 8px'}}/>
            <input className="input" type="number" placeholder="Preço max €" value={filtroPrecMax} onChange={e=>setFiltroPrecMax(e.target.value)} style={{width:100,fontSize:11,padding:'4px 8px'}}/>
            <input className="input" type="number" placeholder="Percentil min %" value={filtroPercMin} onChange={e=>setFiltroPercMin(e.target.value)} style={{width:120,fontSize:11,padding:'4px 8px'}}/>
            {(filtroPrecMin||filtroPrecMax||filtroPercMin)&&<button className="btn btn-secondary btn-sm" onClick={()=>{setFiltroPrecMin('');setFiltroPrecMax('');setFiltroPercMin('')}}>✕</button>}
            <span style={{fontSize:11,color:'#475569',alignSelf:'center'}}>{leiloesFiltrados.length} resultado(s)</span>
          </div>
        </div>
      )}

      {loading?<div style={{display:'flex',justifyContent:'center',padding:40}}><Spinner lg/></div>:(
        <>
          {tab==='ativos'&&(leiloesFiltrados.length===0?<EmptyState icon="🔨" title="Sem leilões activos" desc="Sê o primeiro a leiloar um pombo ChampionsLoft!" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>🔨 Criar leilão</button>}/>:<div style={{display:'flex',flexDirection:'column',gap:10}}>{leiloesFiltrados.map(l=>renderCard(l))}</div>)}
          {tab==='favoritos'&&(leiloesFavoritos.length===0?<EmptyState icon="⭐" title="Sem favoritos" desc="Toca em ☆ num leilão para o seguir"/>:<div style={{display:'flex',flexDirection:'column',gap:10}}>{leiloesFavoritos.map(l=>renderCard(l))}</div>)}
          {tab==='meus'&&(meusLeiloes.length===0?<EmptyState icon="🔨" title="Sem leilões" desc="Cria o teu primeiro leilão" action={<button className="btn btn-primary" onClick={()=>setModal(true)}>+ Leiloar</button>}/>:<div style={{display:'flex',flexDirection:'column',gap:10}}>{meusLeiloes.map(l=>renderCard(l,new Date(l.leilao_fim)<=new Date()))}</div>)}
          {tab==='encerrados'&&(encerrados.length===0?<EmptyState icon="⏰" title="Sem leilões encerrados" desc="Os leilões terminados aparecerão aqui"/>:<div style={{display:'flex',flexDirection:'column',gap:10}}>{encerrados.map(l=>renderCard(l,true))}</div>)}
        </>
      )}

      {/* ══ MODAL CRIAR LEILÃO ══════════════════════════════════════════════ */}
      <Modal open={modal} onClose={()=>{setModal(false);setForm(EMPTY)}} title="🔨 Criar Leilão" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button onClick={criarLeilao} disabled={saving} style={{background:'linear-gradient(135deg,#B8960C,#D4AF37)',color:'#050D1A',border:'none',borderRadius:8,padding:'10px 20px',cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>{saving?<Spinner/>:null}{form.tipo_leilao==='descendente'?'🥚 Publicar':'🔨 Publicar'}</button></>}>

        {/* tipo de leilão */}
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          {[['pombo','🐦 Pombo do efectivo','Leiloa um pombo que já tens'],['descendente','🥚 Descendente futuro','Reserva uma ninhada antes de nascer']].map(([v,titulo,desc])=>(
            <div key={v} onClick={()=>sf('tipo_leilao',v)} style={{flex:1,padding:'12px',borderRadius:10,border:`2px solid ${form.tipo_leilao===v?v==='descendente'?'#2DD4A7':'#D4AF37':'#1B2D52'}`,background:form.tipo_leilao===v?v==='descendente'?'rgba(45,212,167,.06)':'rgba(212,175,55,.06)':'#101F40',cursor:'pointer'}}>
              <div style={{fontSize:16,marginBottom:4}}>{titulo.split(' ')[0]}</div>
              <div style={{fontSize:12,fontWeight:600,color:'#fff',marginBottom:2}}>{titulo.slice(2)}</div>
              <div style={{fontSize:10,color:'#7A8699'}}>{desc}</div>
            </div>
          ))}
        </div>

        {/* ── LEILÃO DE POMBO ── */}
        {form.tipo_leilao==='pombo'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{padding:'10px 12px',background:'rgba(212,175,55,.06)',border:'1px solid rgba(212,175,55,.15)',borderRadius:8,fontSize:12,color:'#94a3b8'}}>
              Selecciona um pombo do teu efectivo — os dados são preenchidos automaticamente.
            </div>
            <Field label="🐦 Pombo do efectivo">
              <SelectorPombo pombos={pombos} value={form.pombo_id} onChange={onSelectPombo}/>
            </Field>
            {/* dados preenchidos (editáveis) */}
            {form.pombo_id&&(
              <>
                <div style={{fontSize:11,color:'#7A8699',marginBottom:-4}}>Podes editar os dados abaixo antes de publicar:</div>
                <div className="form-grid">
                  <Field label="Nome"><input className="input" value={form.nome} onChange={e=>sf('nome',e.target.value)}/></Field>
                  <Field label="Anilha"><input className="input" value={form.anilha} onChange={e=>sf('anilha',e.target.value)}/></Field>
                  <Field label="Provas"><input className="input" type="number" value={form.provas} onChange={e=>sf('provas',e.target.value)}/></Field>
                  <Field label="Percentil (%)"><input className="input" type="number" value={form.percentil} onChange={e=>sf('percentil',e.target.value)}/></Field>
                </div>
              </>
            )}
            {/* sem pombo seleccionado — entrada manual */}
            {!form.pombo_id&&(
              <div className="form-grid">
                <div className="col-2"><Field label="Nome do pombo *"><input className="input" value={form.nome} onChange={e=>sf('nome',e.target.value)} placeholder="Ex: Relâmpago"/></Field></div>
                <Field label="Anilha"><input className="input" value={form.anilha} onChange={e=>sf('anilha',e.target.value)} placeholder="PT-2024-00001"/></Field>
                <Field label="Sexo"><select className="input" value={form.sexo} onChange={e=>sf('sexo',e.target.value)}><option value="M">♂ Macho</option><option value="F">♀ Fêmea</option></select></Field>
                <Field label="Provas"><input className="input" type="number" value={form.provas} onChange={e=>sf('provas',e.target.value)}/></Field>
                <Field label="Percentil (%)"><input className="input" type="number" value={form.percentil} onChange={e=>sf('percentil',e.target.value)}/></Field>
              </div>
            )}
          </div>
        )}

        {/* ── LEILÃO DE DESCENDENTE ── */}
        {form.tipo_leilao==='descendente'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{padding:'10px 12px',background:'rgba(45,212,167,.06)',border:'1px solid rgba(45,212,167,.15)',borderRadius:8,fontSize:12,color:'#94a3b8',lineHeight:1.6}}>
              🥚 O comprador reserva uma ninhada <strong style={{color:'#fff'}}>antes de nascer</strong>. Selecciona o par reprodutor — os dados genéticos e percentis são mostrados automaticamente ao comprador.
            </div>
            <Field label="♂ Pai (Macho) *">
              <SelectorPombo pombos={pombos.filter(p=>p.sexo==='M')} value={form.pai_id} onChange={onSelectPai} placeholder="— Seleccionar macho —"/>
            </Field>
            <Field label="♀ Mãe (Fêmea) *">
              <SelectorPombo pombos={pombos.filter(p=>p.sexo==='F')} value={form.mae_id} onChange={v=>sf('mae_id',v)} placeholder="— Seleccionar fêmea —"/>
            </Field>
            {form.pai_id&&form.mae_id&&(()=>{
              const pai=pombos.find(x=>x.id===form.pai_id)
              const mae=pombos.find(x=>x.id===form.mae_id)
              const percMedio=Math.round(((pai?.percentil||0)+(mae?.percentil||0))/2)
              return (
                <div style={{padding:'10px 12px',background:'rgba(212,175,55,.06)',border:'1px solid rgba(212,175,55,.15)',borderRadius:8}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#D4AF37',marginBottom:6}}>🧬 Combinação Genética</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>Percentil médio dos pais: <strong style={{color:'#2DD4A7'}}>{percMedio}%</strong></div>
                  {pai?.esp&&<div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Especialidades: {(pai.esp||[]).map(e=>`${ESP_ICON[e]||'🐦'} ${e}`).join(', ')}</div>}
                </div>
              )
            })()}
            <Field label="📅 Data prevista de acasalamento">
              <input className="input" type="date" value={form.data_acasalamento_prev} onChange={e=>sf('data_acasalamento_prev',e.target.value)}/>
              <div style={{fontSize:10,color:'#475569',marginTop:2}}>Eclosão esperada ~28 dias após acasalamento. Entrega ~45 dias após eclosão.</div>
            </Field>
            <div className="form-grid">
              <div className="col-2">
                <Field label="Especialidades herdadas">
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                    {[['velocidade','⚡ Velocidade'],['meio_fundo','🎯 Meio-Fundo'],['fundo','🏔️ Fundo'],['grande_fundo','🌍 Grande Fundo']].map(([v,l])=>(
                      <button key={v} type="button" className={`chip${(form.esp||[]).includes(v)?' active':''}`} onClick={()=>sf('esp',(form.esp||[]).includes(v)?(form.esp||[]).filter(x=>x!==v):[...(form.esp||[]),v])}>{l}</button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* campos comuns */}
        <div style={{borderTop:'1px solid #1B2D52',paddingTop:14,marginTop:14}}>
          <div className="form-grid">
            <Field label="Lance mínimo (€) *"><input className="input" type="number" value={form.leilao_min} onChange={e=>sf('leilao_min',e.target.value)} placeholder="Ex: 50"/></Field>
            <Field label="Preço de reserva (€)">
              <input className="input" type="number" value={form.leilao_reserva} onChange={e=>sf('leilao_reserva',e.target.value)} placeholder="Oculto"/>
            </Field>
            <Field label="Duração">
              <select className="input" value={form.duracao} onChange={e=>sf('duracao',e.target.value)}>{DURACOES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
            </Field>
            {form.tipo_leilao==='pombo'&&<Field label="URL Foto"><input className="input" value={form.foto_url} onChange={e=>sf('foto_url',e.target.value)} placeholder="https://..."/></Field>}
            <div className="col-2"><Field label="Descrição"><textarea className="input" rows={3} style={{resize:'none'}} value={form.descricao} onChange={e=>sf('descricao',e.target.value)} placeholder={form.tipo_leilao==='descendente'?'Linhagem, historial dos pais, condições de entrega...':'Linhagem, historial de provas, pontos fortes...'}/></Field></div>
          </div>
          {/* opções avançadas */}
          <div style={{fontSize:12,fontWeight:600,color:'#7A8699',marginBottom:10,marginTop:4}}>⚙️ Opções</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div onClick={()=>sf('leilao_silencioso',!form.leilao_silencioso)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:form.leilao_silencioso?'rgba(139,92,246,.08)':'#101F40',border:`1px solid ${form.leilao_silencioso?'rgba(139,92,246,.3)':'#1B2D52'}`,borderRadius:10,cursor:'pointer'}}>
              <div style={{width:18,height:18,borderRadius:4,background:form.leilao_silencioso?'#8B5CF6':'transparent',border:`2px solid ${form.leilao_silencioso?'#8B5CF6':'#334155'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>{form.leilao_silencioso&&'✓'}</div>
              <div><div style={{fontSize:12,color:'#fff',fontWeight:500}}>🔇 Leilão Silencioso</div><div style={{fontSize:10,color:'#7A8699'}}>Os licitantes não vêem os lances uns dos outros.</div></div>
            </div>
            {form.tipo_leilao==='pombo'&&(
              <>
                <div onClick={()=>sf('garantia_performance',!form.garantia_performance)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:form.garantia_performance?'rgba(16,185,129,.08)':'#101F40',border:`1px solid ${form.garantia_performance?'rgba(16,185,129,.3)':'#1B2D52'}`,borderRadius:10,cursor:'pointer'}}>
                  <div style={{width:18,height:18,borderRadius:4,background:form.garantia_performance?'#10B981':'transparent',border:`2px solid ${form.garantia_performance?'#10B981':'#334155'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>{form.garantia_performance&&'✓'}</div>
                  <div><div style={{fontSize:12,color:'#fff',fontWeight:500}}>✅ Garantia de Performance</div><div style={{fontSize:10,color:'#7A8699'}}>Devolves o valor se o pombo não atingir o percentil mínimo.</div></div>
                </div>
                {form.garantia_performance&&(
                  <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr',paddingLeft:28}}>
                    <Field label="Percentil mínimo (%)"><input className="input" type="number" value={form.garantia_percentil} onChange={e=>sf('garantia_percentil',e.target.value)} placeholder="Ex: 60"/></Field>
                    <Field label="Nº de provas"><input className="input" type="number" value={form.garantia_provas} onChange={e=>sf('garantia_provas',e.target.value)} placeholder="Ex: 5"/></Field>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* ══ MODAL ALERTAS ═══════════════════════════════════════════════════ */}
      <Modal open={modalAlertas} onClose={()=>setModalAlertas(false)} title="🔔 Alertas de Interesse" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalAlertas(false)}>Fechar</button></>}>
        <div style={{fontSize:12,color:'#7A8699',marginBottom:14}}>Recebe notificação quando aparecer um leilão com estes critérios.</div>
        <div style={{background:'#101F40',borderRadius:12,padding:'12px 14px',marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:'#fff',marginBottom:10}}>Criar novo alerta</div>
          <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
            <Field label="Especialidade">
              <select className="input" value={formAlerta.especialidade} onChange={e=>setFormAlerta(f=>({...f,especialidade:e.target.value}))}>
                <option value="todos">Todas</option>
                <option value="velocidade">⚡ Velocidade</option>
                <option value="meio_fundo">🎯 Meio-Fundo</option>
                <option value="fundo">🏔️ Fundo</option>
                <option value="grande_fundo">🌍 Grande Fundo</option>
              </select>
            </Field>
            <Field label="Percentil mínimo (%)"><input className="input" type="number" value={formAlerta.percentil_min} onChange={e=>setFormAlerta(f=>({...f,percentil_min:e.target.value}))} placeholder="0"/></Field>
            <Field label="Preço máximo (€)"><input className="input" type="number" value={formAlerta.preco_max} onChange={e=>setFormAlerta(f=>({...f,preco_max:e.target.value}))} placeholder="Sem limite"/></Field>
          </div>
          <button className="btn btn-primary btn-sm" style={{marginTop:8}} onClick={criarAlerta}>🔔 Criar Alerta</button>
        </div>
        {alertas.length===0
          ?<div style={{textAlign:'center',color:'#475569',padding:'16px 0',fontSize:13}}>Sem alertas activos</div>
          :<div style={{display:'flex',flexDirection:'column',gap:6}}>
              {alertas.map(a=>(
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#101F40',borderRadius:10}}>
                  <span style={{fontSize:16}}>🔔</span>
                  <div style={{flex:1,fontSize:12,color:'#cbd5e1'}}>
                    {a.especialidade?`${ESP_ICON[a.especialidade]||'🐦'} ${a.especialidade}`:'Todas'}
                    {a.percentil_min>0&&` · Percentil ≥ ${a.percentil_min}%`}
                    {a.preco_max&&` · Preço ≤ ${a.preco_max}€`}
                  </div>
                  <button className="btn btn-icon btn-sm" onClick={()=>eliminarAlerta(a.id)}>🗑️</button>
                </div>
              ))}
            </div>
        }
      </Modal>
    </div>
  )
}
