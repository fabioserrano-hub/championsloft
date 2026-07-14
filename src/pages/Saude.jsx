import { useState, useEffect, useCallback } from 'react'
import { db, supabase } from '../lib/supabase'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'
import { useAuth } from '../hooks/useAuth'
import { useIdioma } from '../hooks/useIdioma'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

// ── constantes ────────────────────────────────────────────────────────────────
const FASES    = ['Não Competitivo','Pré-Competitivo','Competição','Muda','Repouso']
const APTIDOES = ['Apto','Em Observação','Lesionado','Doente','Inapto']
const APT_COR  = { 'Apto':'#2DD4A7','Em Observação':'#D4AF37','Lesionado':'#f87171','Doente':'#f87171','Inapto':'#475569' }
const APT_ICON = { 'Apto':'✅','Em Observação':'👁️','Lesionado':'🏥','Doente':'🤒','Inapto':'🚫' }
const aptBadge = { 'Apto':'green','Em Observação':'yellow','Lesionado':'red','Doente':'red','Inapto':'gray' }

const EMPTY     = { pigeon_id:'', fase:'Não Competitivo', aptidao:'Apto', peso:'', obs:'', data_reg:new Date().toISOString().slice(0,10) }
const EMPTY_VAC = { pigeon_id:'', nome:'', data_aplicacao:new Date().toISOString().slice(0,10), proxima_dose:'', obs:'' }

const PLANOS_DEFAULT = [
  { nome:'Paramyxovirus (Newcastle)', descricao:'Vacina obrigatória por lei em Portugal. Aplicar antes do início da época de treinos.', periodicidade_dias:365, obrigatoria:true },
  { nome:'Poxvirus (Varíola)', descricao:'Recomendada anualmente. Protege contra a varíola aviária.', periodicidade_dias:365, obrigatoria:false },
  { nome:'Salmonela', descricao:'Recomendada 2x por ano. Especialmente importante antes da reprodução.', periodicidade_dias:180, obrigatoria:false },
  { nome:'Tricomoníase (Borrachinho)', descricao:'Tratamento preventivo 2x por ano. Essencial antes de provas e reprodução.', periodicidade_dias:180, obrigatoria:false },
  { nome:'Coccidiose', descricao:'Tratamento preventivo 2x por ano. Especialmente em jovens e borrachinhos.', periodicidade_dias:180, obrigatoria:false },
  { nome:'Desparasitação Externa', descricao:'Controlo de piolhos e ácaros. Recomendada 3x por ano.', periodicidade_dias:120, obrigatoria:false },
]

const DOENCAS = [
  { nome:'Paramyxovírus (Newcastle)', cat:'Viral', urgencia:'alta', icon:'🔴', sintomas:'Tremores, torção do pescoço (opisthotonus), paralisia das pernas, diarreia aquosa esverdeada, desorientação. Pode ser fatal.', tratamento:'Sem tratamento específico. Suporte: eletrólitos, vitaminas, isolamento rigoroso. Prevenção: vacinação obrigatória anual.', prevencao:'Vacinação obrigatória por lei em Portugal. Vacinar antes da época de treinos.' },
  { nome:'Tricomoníase (Borrachinho)', cat:'Protozoário', urgencia:'media', icon:'🟡', sintomas:'Placas amarelas na garganta, dificuldade em engolir, perda de peso. Em borrachinhos pode ser fatal rapidamente.', tratamento:'Ronidazol ou Metronidazol 5-7 dias. Limpar e desinfectar comedouros e bebedouros.', prevencao:'Tratamento preventivo 2x por ano. Higiene dos bebedouros.' },
  { nome:'Coccidiose', cat:'Protozoário', urgencia:'media', icon:'🟡', sintomas:'Diarreia verde ou castanha, perda de peso, fraqueza. Mais grave em jovens.', tratamento:'Sulfaclorpiridazina, Toltrazuril ou Amprolio. Tratamento 3-5 dias.', prevencao:'Limpeza regular. Tratamento preventivo em jovens. Evitar sobrelotação.' },
  { nome:'Salmonela (Paratifose)', cat:'Bacteriana', urgencia:'alta', icon:'🔴', sintomas:'Diarreia (por vezes sanguinolenta), letargia, articulações inchadas. Pode ser crónica.', tratamento:'Enrofloxacina ou Trimetoprim+Sulfa durante 10-14 dias. Isolamento obrigatório.', prevencao:'Vacinação disponível. Higiene rigorosa. Controlo de roedores.' },
  { nome:'Ornitose/Clamidiose', cat:'Bacteriana', urgencia:'media', icon:'⚠️', sintomas:'Corrimento ocular/nasal, dificuldade respiratória. Zoonose (transmissível ao Homem).', tratamento:'Doxiciclina durante 30-45 dias. Tratamento prolongado essencial.', prevencao:'Higiene e ventilação. Quarentena de novos animais. Usar máscara ao limpar.' },
  { nome:'Varíola Columbídea', cat:'Viral', urgencia:'media', icon:'🟡', sintomas:'Pústulas nas zonas sem penas (pálpebras, bico, patas). Forma húmida: lesões na garganta.', tratamento:'Sem tratamento específico. Suporte vitamínico. Isolamento.', prevencao:'Vacinação disponível. Controlo de insectos.' },
  { nome:'Candidíase', cat:'Fúngica', urgencia:'baixa', icon:'🟢', sintomas:'Placas brancas espessas na boca, dificuldade em engolir. Frequente após antibioterapia.', tratamento:'Nistatina ou Fluconazol. Probióticos após tratamento.', prevencao:'Evitar antibióticos prolongados. Probióticos preventivos.' },
  { nome:'Adenovírus (Doença do Jovem)', cat:'Viral', urgencia:'alta', icon:'🔴', sintomas:'Vómitos, regurgitação de água amarela, diarreia. Afecta principalmente jovens 3-10 meses.', tratamento:'Sem tratamento específico. Eletrólitos, vitaminas B. Suporte.', prevencao:'Higiene rigorosa. Evitar stress. Vitaminas preventivas em jovens.' },
  { nome:'Piolho/Ectoparasitas', cat:'Parasitária', urgencia:'baixa', icon:'🟢', sintomas:'Agitação, coçar constante, penas danificadas, perda de peso gradual.', tratamento:'Ivermectina spot-on ou spray. Permetrina no pombal. Tratar pombos e pombal.', prevencao:'Banhos regulares. Areia com pó antiparasitário. Inspecção regular.' },
  { nome:'Aspergilose', cat:'Fúngica', urgencia:'media', icon:'🟡', sintomas:'Dificuldade respiratória, perda de peso progressiva. Frequente em ambientes húmidos.', tratamento:'Itraconazol ou Voriconazol 6-8 semanas. Prognóstico reservado.', prevencao:'Ventilação adequada. Evitar palha húmida ou ração mofada.' },
]

const urgConf = { alta:{cor:'#f87171',label:'Alta Urgência'}, media:{cor:'#D4AF37',label:'Atenção'}, baixa:{cor:'#2DD4A7',label:'Baixa Urgência'} }

// ── DoencasTab ────────────────────────────────────────────────────────────────
function DoencasTab() {
  const [catFiltro, setCatFiltro] = useState('Todas')
  const [expandida, setExpandida] = useState(null)
  const cats = ['Todas',...new Set(DOENCAS.map(d=>d.cat))]
  const filtradas = catFiltro==='Todas'?DOENCAS:DOENCAS.filter(d=>d.cat===catFiltro)
  return (
    <div>
      <div style={{fontSize:12,color:'#94a3b8',marginBottom:14}}>Enciclopédia de doenças típicas dos pombos-correio. Consulte sempre um veterinário.</div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        {cats.map(c=><button key={c} onClick={()=>setCatFiltro(c)} style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:500,cursor:'pointer',border:'none',fontFamily:'inherit',background:catFiltro===c?'#1E5FD9':'#101F40',color:catFiltro===c?'#fff':'#94a3b8'}}>{c}</button>)}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtradas.map((d,i)=>{
          const urg=urgConf[d.urgencia], exp=expandida===i
          return (
            <div key={i} className="card card-p" style={{cursor:'pointer',borderLeft:`3px solid ${urg.cor}`}} onClick={()=>setExpandida(exp?null:i)}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:18}}>{d.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#fff'}}>{d.nome}</span>
                    <span style={{fontSize:10,color:urg.cor,background:`${urg.cor}18`,padding:'1px 8px',borderRadius:10}}>{urg.label}</span>
                    <span style={{fontSize:10,color:'#7A8699',background:'#101F40',padding:'1px 8px',borderRadius:10}}>{d.cat}</span>
                  </div>
                  {!exp&&<div style={{fontSize:11,color:'#7A8699',marginTop:2}}>{d.sintomas.slice(0,70)}...</div>}
                </div>
                <span style={{fontSize:12,color:'#475569'}}>{exp?'▾':'▸'}</span>
              </div>
              {exp&&(
                <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',flexDirection:'column',gap:10}}>
                  {[['🩺 Sintomas',d.sintomas],['💊 Tratamento',d.tratamento],['🛡️ Prevenção',d.prevencao]].map(([label,texto])=>(
                    <div key={label}>
                      <div style={{fontSize:11,fontWeight:700,color:'#D4AF37',marginBottom:3}}>{label}</div>
                      <div style={{fontSize:12,color:'#cbd5e1',lineHeight:1.6}}>{texto}</div>
                    </div>
                  ))}
                  <div style={{fontSize:10,color:'#475569',fontStyle:'italic'}}>⚕️ Consulte sempre um médico veterinário.</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── HistoricoPombo ────────────────────────────────────────────────────────────
function HistoricoPombo({ pombo, registos, onNovoRegisto }) {
  const regs = registos.filter(r=>r.pigeon_id===pombo.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
  const ultimo = regs[0]
  const pesos = regs.filter(r=>r.peso).slice(0,10).reverse()

  return (
    <div style={{background:'#0B1830',border:'1px solid #1B2D52',borderRadius:14,padding:'14px 16px',marginBottom:10}}>
      {/* header */}
      <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}>
        <div style={{width:44,height:44,borderRadius:10,background:'#101F40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,overflow:'hidden',flexShrink:0}}>
          {pombo.foto_url?<img src={pombo.foto_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:pombo.emoji||'🐦'}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{pombo.nome}</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:'#2DD4A7'}}>{pombo.anilha}</div>
          {ultimo&&<div style={{fontSize:10,color:'#7A8699',marginTop:2}}>Último registo: {new Date(ultimo.created_at).toLocaleDateString('pt-PT')}</div>}
        </div>
        {/* estado rápido */}
        {ultimo&&(
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:18}}>{APT_ICON[ultimo.apt||ultimo.aptidao]||'❓'}</div>
            <div style={{fontSize:9,color:APT_COR[ultimo.apt||ultimo.aptidao]||'#7A8699',fontWeight:700,marginTop:2}}>{ultimo.apt||ultimo.aptidao||'—'}</div>
          </div>
        )}
        <button className="btn btn-primary btn-sm" onClick={()=>onNovoRegisto(pombo)}>+ Registo</button>
      </div>

      {/* mini gráfico de peso */}
      {pesos.length>=2&&(()=>{
        const vals=pesos.map(p=>p.peso)
        const min=Math.min(...vals)-10, max=Math.max(...vals)+10
        const W=200,H=40,pad=4
        const pts=vals.map((v,i)=>[pad+(i/(vals.length-1))*(W-pad*2),H-pad-((v-min)/(max-min))*(H-pad*2)])
        const path=pts.map((p,i)=>`${i===0?'M':'L'}${p[0].toFixed(0)},${p[1].toFixed(0)}`).join(' ')
        return (
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:'#7A8699',marginBottom:4}}>⚖️ Evolução de peso</div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H,display:'block'}}>
              <path d={path} fill="none" stroke="#4C8DFF" strokeWidth="2"/>
              {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#4C8DFF"/>)}
            </svg>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#475569',marginTop:2}}>
              <span>{vals[0]}g</span><span>{vals[vals.length-1]}g</span>
            </div>
          </div>
        )
      })()}

      {/* histórico */}
      {regs.length>0&&(
        <div style={{display:'flex',flexDirection:'column',gap:5}}>
          {regs.slice(0,3).map(r=>(
            <div key={r.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'#101F40',borderRadius:8}}>
              <span style={{fontSize:14}}>{APT_ICON[r.apt||r.aptidao]||'❓'}</span>
              <div style={{flex:1}}>
                <span style={{fontSize:11,color:APT_COR[r.apt||r.aptidao]||'#7A8699',fontWeight:600}}>{r.apt||r.aptidao}</span>
                {r.fase&&<span style={{fontSize:10,color:'#475569'}}> · {r.fase}</span>}
                {r.peso&&<span style={{fontSize:10,color:'#4C8DFF'}}> · {r.peso}g</span>}
                {r.obs&&<div style={{fontSize:10,color:'#7A8699',marginTop:2}}>{r.obs}</div>}
              </div>
              <span style={{fontSize:10,color:'#475569',flexShrink:0}}>{new Date(r.created_at).toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'})}</span>
            </div>
          ))}
        </div>
      )}
      {regs.length===0&&<div style={{fontSize:11,color:'#475569',fontStyle:'italic',textAlign:'center',padding:'8px 0'}}>Sem registos de saúde</div>}
    </div>
  )
}

// ── componente principal ──────────────────────────────────────────────────────
export default function Saude({ nav, params }) {
  const toast = useToast()
  const { t }  = useIdioma()
  const { user } = useAuth()

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  const [registos, setRegistos]   = useState([])
  const [pombos, setPombos]       = useState([])
  const [vacinas, setVacinas]     = useState([])
  const [planos, setPlanos]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('overview')
  const [modal, setModal]         = useState(false)
  const [modalVac, setModalVac]   = useState(false)
  const [modalPlano, setModalPlano] = useState(null)
  const [selected, setSelected]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [confirm, setConfirm]     = useState(null)
  const [confirmVac, setConfirmVac] = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [formVac, setFormVac]     = useState(EMPTY_VAC)
  const [filtroPombal, setFiltroPombal] = useState('todos')
  const [filtroApt, setFiltroApt] = useState('todos')
  const [migrated, setMigrated]   = useState(false)
  const sf  = (k,v) => setForm(f=>({...f,[k]:v}))
  const sfv = (k,v) => setFormVac(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r,p,v,pl] = await Promise.all([db.getSaude(), db.getPombos(), db.getVacinas(), db.getPlanosVacinacao()])
      setRegistos(r); setPombos(p); setVacinas(v); setPlanos(pl)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])
  useEffect(()=>{ load() },[load])

  // migrar vacinas do localStorage
  useEffect(()=>{
    if(migrated||loading) return
    try {
      const local=JSON.parse(localStorage.getItem('cl_vacinas')||'[]')
      if(local.length>0&&vacinas.length===0) {
        Promise.all(local.map(v=>db.createVacina({pigeon_id:v.pigeon_id||null,nome_pombo:v.nome_pombo||'',nome:v.nome,data_aplicacao:v.data_aplicacao,proxima_dose:v.proxima_dose||null,obs:v.obs||''}).catch(()=>{})))
          .then(()=>{localStorage.removeItem('cl_vacinas');load();toast('Vacinas migradas!','ok')})
      }
    } catch(e){}
    setMigrated(true)
  },[loading,vacinas.length,migrated])

  useEffect(()=>{
    if(params?.prefillPomboId&&pombos.length) {
      const p=pombos.find(x=>x.id===params.prefillPomboId)
      if(p){setForm({...EMPTY,pigeon_id:p.id});setSelected(null);setModal(true)}
    }
  },[params,pombos])

  // ── CRUD registos ─────────────────────────────────────────────────────────
  const openNew  = (pombo=null) => { setForm({...EMPTY,pigeon_id:pombo?.id||''}); setSelected(null); setModal(true) }
  const openEdit = r => { setSelected(r); setForm({pigeon_id:r.pigeon_id||'',fase:r.fase||'Não Competitivo',aptidao:r.apt||r.aptidao||'Apto',peso:String(r.peso||''),obs:r.obs||'',data_reg:r.created_at?.slice(0,10)||new Date().toISOString().slice(0,10)}); setModal(true) }
  const close    = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if(!form.pigeon_id){toast('Seleccione um pombo','warn');return}
    setSaving(true)
    try {
      const pombo=pombos.find(p=>p.id===form.pigeon_id)
      const payload={pigeon_id:form.pigeon_id,anel:pombo?.anilha||'',nome_pombo:pombo?.nome||'',fase:form.fase,apt:form.aptidao,aptidao:form.aptidao,peso:form.peso?parseInt(form.peso):null,obs:form.obs}
      selected?await db.updateSaude(selected.id,payload):await db.createSaude(payload)
      // actualizar estado no pombo
      if(form.aptidao==='Lesionado'||form.aptidao==='Doente') await supabase.from('pigeons').update({estado:'lesionado'}).eq('id',form.pigeon_id)
      else if(form.aptidao==='Apto') await supabase.from('pigeons').update({estado:'ativo'}).eq('id',form.pigeon_id)
      toast(selected?'Actualizado!':'Registo criado!','ok'); close(); load()
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setSaving(false)}
  }

  // mudança rápida de aptidão
  const mudarAptidaoRapido = async (registoId, pomboId, novaApt) => {
    try {
      await db.createSaude({pigeon_id:pomboId,apt:novaApt,aptidao:novaApt,fase:'Competição',obs:`Estado alterado rapidamente para ${novaApt}`})
      if(novaApt==='Lesionado'||novaApt==='Doente') await supabase.from('pigeons').update({estado:'lesionado'}).eq('id',pomboId)
      else if(novaApt==='Apto') await supabase.from('pigeons').update({estado:'ativo'}).eq('id',pomboId)
      toast(`${APT_ICON[novaApt]} ${novaApt}`,'ok'); load()
    } catch(e){toast('Erro: '+e.message,'err')}
  }

  const del = async () => {
    try{await db.deleteSaude(confirm.id);toast('Eliminado','ok');setConfirm(null);load()}
    catch(e){toast('Erro: '+e.message,'err')}
  }

  // ── vacinas ───────────────────────────────────────────────────────────────
  const saveVac = async () => {
    if(!formVac.nome.trim()){toast('Nome obrigatório','warn');return}
    setSaving(true)
    try {
      const pombo=pombos.find(p=>p.id===formVac.pigeon_id)
      await db.createVacina({pigeon_id:formVac.pigeon_id||null,nome_pombo:pombo?.nome||'Todos',nome:formVac.nome,data_aplicacao:formVac.data_aplicacao,proxima_dose:formVac.proxima_dose||null,obs:formVac.obs})
      toast('Vacina registada!','ok'); setModalVac(false); load()
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setSaving(false)}
  }

  const delVac = async () => {
    try{await db.deleteVacina(confirmVac.id);toast('Removida','ok');setConfirmVac(null);load()}
    catch(e){toast('Erro: '+e.message,'err')}
  }

  // ── planos ────────────────────────────────────────────────────────────────
  const registarAplicacaoPlano = async (plano) => {
    setSaving(true)
    try {
      const proxima=new Date(); proxima.setDate(proxima.getDate()+plano.periodicidade_dias)
      await db.updatePlanoVacinacao(plano.id,{ultima_aplicacao:new Date().toISOString().slice(0,10),proxima_aplicacao:proxima.toISOString().slice(0,10)})
      await db.createVacina({pigeon_id:null,nome_pombo:'Todo o efectivo',nome:plano.nome,data_aplicacao:new Date().toISOString().slice(0,10),proxima_dose:proxima.toISOString().slice(0,10),obs:plano.descricao})
      toast('Aplicação registada!','ok'); setModalPlano(null); load()
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setSaving(false)}
  }

  const inicializarPlanos = async () => {
    setSaving(true)
    try {
      await Promise.all(PLANOS_DEFAULT.map(p=>db.createPlanoVacinacao(p).catch(()=>{})))
      toast('Planos inicializados!','ok'); load()
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setSaving(false)}
  }

  // ── computed ──────────────────────────────────────────────────────────────
  const efectivo     = pombos.filter(p=>!p.estado_ext||p.estado_ext==='proprio')
  const pombais      = [...new Set(pombos.map(p=>p.pombal).filter(Boolean))]
  const kpiApt       = registos.filter(r=>(r.apt||r.aptidao)==='Apto').length
  const kpiObs       = registos.filter(r=>(r.apt||r.aptidao)==='Em Observação').length
  const kpiLes       = registos.filter(r=>['Lesionado','Doente'].includes(r.apt||r.aptidao)).length
  const vacinasAtrasadas = vacinas.filter(v=>v.proxima_dose&&(new Date(v.proxima_dose)-new Date())/86400000<0)
  const vacinasProximas  = vacinas.filter(v=>{ if(!v.proxima_dose) return false; const d=(new Date(v.proxima_dose)-new Date())/86400000; return d>=0&&d<=30 })
  const planosAtrasados  = planos.filter(p=>p.proxima_aplicacao&&(new Date(p.proxima_aplicacao)-new Date())/86400000<0)
  const planosProximos   = planos.filter(p=>{ if(!p.proxima_aplicacao) return false; const d=(new Date(p.proxima_aplicacao)-new Date())/86400000; return d>=0&&d<=30 })
  const alertasTotal = vacinasAtrasadas.length+vacinasProximas.length+planosAtrasados.length+planosProximos.length

  // pombos filtrados para overview
  const pombosFiltrados = efectivo.filter(p=>{
    if(filtroPombal!=='todos'&&p.pombal!==filtroPombal) return false
    if(filtroApt!=='todos') {
      const ultimoReg = registos.filter(r=>r.pigeon_id===p.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]
      const aptAtual = ultimoReg?.apt||ultimoReg?.aptidao||'Apto'
      if(aptAtual!==filtroApt) return false
    }
    return true
  })

  // pombos com problemas (para highlight)
  const pombosComProblema = new Set(
    registos.filter(r=>['Lesionado','Doente','Inapto'].includes(r.apt||r.aptidao)).map(r=>r.pigeon_id)
  )
  const pombosEmObs = new Set(
    registos.filter(r=>(r.apt||r.aptidao)==='Em Observação').map(r=>r.pigeon_id)
  )

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      <GuiaAuto modulo="saude"/>
      <div className="section-header">
        <div>
          <div className="section-title">Saúde</div>
          <div className="section-sub">{registos.length} registos · {vacinas.length} vacinas{alertasTotal>0?` · ⚠️ ${alertasTotal} alertas`:''}</div>
        </div>
        <BotaoGuia modulo="saude"/> <button className="btn btn-primary" onClick={()=>openNew()}>＋ Novo Registo</button>
      </div>

      {/* alertas globais */}
      {alertasTotal>0&&(
        <div style={{background:'rgba(248,113,113,.07)',border:'1px solid rgba(248,113,113,.2)',borderRadius:12,padding:'10px 14px',marginBottom:14,cursor:'pointer'}} onClick={()=>setTab('vacinas')}>
          <div style={{fontWeight:600,color:'#f87171',marginBottom:4,fontSize:12}}>⚠️ {alertasTotal} alerta(s) de saúde</div>
          {vacinasAtrasadas.length>0&&<div style={{fontSize:11,color:'#cbd5e1'}}>{vacinasAtrasadas.length} vacina(s) em atraso</div>}
          {planosAtrasados.length>0&&<div style={{fontSize:11,color:'#cbd5e1'}}>{planosAtrasados.length} plano(s) em atraso</div>}
          {(vacinasProximas.length+planosProximos.length)>0&&<div style={{fontSize:11,color:'#D4AF37'}}>{vacinasProximas.length+planosProximos.length} dose(s) nos próximos 30 dias</div>}
        </div>
      )}

      {/* tabs */}
      <div style={{display:'flex',gap:4,background:'#101F40',borderRadius:8,padding:4,marginBottom:16,overflowX:'auto'}}>
        {[
          ['overview','🐦 Efectivo'],
          ['registos','🏥 Registos'],
          ['vacinas',`💉 Vacinas${alertasTotal?` (${alertasTotal})`:''}`],
          ['planos','📋 Planos'],
          ['doencas','📖 Doenças'],
        ].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ flex:'none', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:tab===k?700:500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', border:tab===k?'none':'1px solid rgba(255,255,255,.08)', background:tab===k?'linear-gradient(135deg,#1E5FD9,#1456C0)':'rgba(255,255,255,.05)', color:tab===k?'#fff':'#cbd5e1', boxShadow:tab===k?'0 2px 8px rgba(0,0,0,.3)':'none', transform:tab===k?'translateY(-1px)':'none', transition:'all .15s', minHeight:40 }}>{l}</button>
        ))}
      </div>

      {/* ══ OVERVIEW ════════════════════════════════════════════════════════ */}
      {tab==='overview'&&(
        <div>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:8,marginBottom:14}}>
            {[
              {v:efectivo.filter(p=>!pombosComProblema.has(p.id)&&!pombosEmObs.has(p.id)).length,l:'Aptos',cor:'#2DD4A7',icon:'✅'},
              {v:pombosEmObs.size,l:'Em Observação',cor:'#D4AF37',icon:'👁️'},
              {v:pombosComProblema.size,l:'Com Problema',cor:'#f87171',icon:'🏥'},
              {v:efectivo.length,l:'Efectivo total',cor:'#4C8DFF',icon:'🐦'},
            ].map(({v,l,cor,icon})=>(
              <div key={l} style={{textAlign:'center',padding:'10px 6px',background:'#0B1830',border:`1px solid ${cor}25`,borderRadius:12,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:cor,opacity:.5}}/>
                <div style={{fontSize:16,marginBottom:2}}>{icon}</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,color:cor}}>{v}</div>
                <div style={{fontSize:9,color:'#7A8699',textTransform:'uppercase',letterSpacing:.5,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>

          {/* filtros */}
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
            <select value={filtroPombal} onChange={e=>setFiltroPombal(e.target.value)} className="input" style={{fontSize:11,padding:'5px 8px',borderRadius:8,width:'auto'}}>
              <option value="todos">Todos os pombais</option>
              {pombais.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <div style={{display:'flex',gap:4}}>
              {['todos','Apto','Em Observação','Lesionado','Doente'].map(a=>(
                <button key={a} onClick={()=>setFiltroApt(a)} className={`chip${filtroApt===a?' active':''}`} style={{fontSize:10,color:filtroApt===a?'#fff':APT_COR[a]||'#94a3b8'}}>{a==='todos'?'Todos':a}</button>
              ))}
            </div>
          </div>

          {loading?<div style={{display:'flex',justifyContent:'center',padding:40}}><Spinner lg/></div>
            :pombosFiltrados.length===0?<EmptyState icon="🐦" title="Sem pombos" desc="Nenhum pombo nestes critérios"/>
            :pombosFiltrados.map(p=>(
              <HistoricoPombo key={p.id} pombo={p} registos={registos} onNovoRegisto={openNew}/>
            ))
          }
        </div>
      )}

      {/* ══ REGISTOS ════════════════════════════════════════════════════════ */}
      {tab==='registos'&&(
        <>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(3,1fr)',gap:8,marginBottom:14}}>
            {[{v:kpiApt,l:'Aptos',cor:'#2DD4A7'},{v:kpiObs,l:'Em Observação',cor:'#D4AF37'},{v:kpiLes,l:'Lesionados',cor:'#f87171'}].map(({v,l,cor})=>(
              <div key={l} className="kpi"><div className="kpi-val" style={{color:cor}}>{v}</div><div className="kpi-label">{l}</div></div>
            ))}
          </div>
          {loading?<div style={{display:'flex',justifyContent:'center',padding:60}}><Spinner lg/></div>
            :registos.length===0?<EmptyState icon="🏥" title="Sem registos" desc="Registe o primeiro acompanhamento clínico" action={<button className="btn btn-primary" onClick={()=>openNew()}>＋ Novo Registo</button>}/>
            :<div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[...registos].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(r=>{
                  const pombo=pombos.find(p=>p.id===r.pigeon_id)
                  const apt=r.apt||r.aptidao
                  const cor=APT_COR[apt]||'#7A8699'
                  return (
                    <div key={r.id} style={{background:'#0B1830',border:`1px solid ${cor}25`,borderRadius:12,padding:'10px 14px',borderLeft:`3px solid ${cor}`}}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:40,height:40,borderRadius:10,background:'#101F40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,overflow:'hidden',flexShrink:0}}>
                          {pombo?.foto_url?<img src={pombo.foto_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:pombo?.emoji||'🐦'}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{r.nome_pombo||pombo?.nome||'—'}</div>
                          <div style={{fontSize:11,color:'#7A8699'}}>{r.fase}{r.peso?` · ${r.peso}g`:''} · {new Date(r.created_at).toLocaleDateString('pt-PT')}</div>
                          {r.obs&&<div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{r.obs}</div>}
                        </div>
                        <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                          <Badge v={aptBadge[apt]||'gray'}>{apt}</Badge>
                          <button className="btn btn-icon btn-sm" onClick={()=>openEdit(r)}>✏️</button>
                          <button className="btn btn-icon btn-sm" onClick={()=>setConfirm(r)}>🗑️</button>
                        </div>
                      </div>
                      {/* mudança rápida de estado */}
                      <div style={{display:'flex',gap:4,marginTop:8,flexWrap:'wrap'}}>
                        <span style={{fontSize:10,color:'#475569',alignSelf:'center'}}>Mudar para:</span>
                        {APTIDOES.filter(a=>a!==apt).map(a=>(
                          <button key={a} onClick={()=>mudarAptidaoRapido(r.id,r.pigeon_id,a)} style={{fontSize:10,padding:'2px 8px',borderRadius:8,border:`1px solid ${APT_COR[a]}44`,background:`${APT_COR[a]}10`,color:APT_COR[a],cursor:'pointer',fontFamily:'inherit'}}>
                            {APT_ICON[a]} {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </>
      )}

      {/* ══ VACINAS ═════════════════════════════════════════════════════════ */}
      {tab==='vacinas'&&(
        <div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <button className="btn btn-primary btn-sm" onClick={()=>{setFormVac(EMPTY_VAC);setModalVac(true)}}>＋ Nova Vacina</button>
          </div>
          {(vacinasAtrasadas.length>0||vacinasProximas.length>0)&&(
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {vacinasAtrasadas.length>0&&(
                <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,padding:'10px 14px'}}>
                  <div style={{fontWeight:600,color:'#f87171',marginBottom:4}}>🚨 {vacinasAtrasadas.length} dose(s) em atraso</div>
                  {vacinasAtrasadas.map(v=><div key={v.id} style={{fontSize:12,color:'#cbd5e1'}}>{v.nome_pombo||'Efectivo'} — {v.nome} · devia ter sido em {new Date(v.proxima_dose).toLocaleDateString('pt-PT')}</div>)}
                </div>
              )}
              {vacinasProximas.length>0&&(
                <div style={{background:'rgba(212,175,55,.08)',border:'1px solid rgba(212,175,55,.2)',borderRadius:8,padding:'10px 14px'}}>
                  <div style={{fontWeight:600,color:'#D4AF37',marginBottom:4}}>💉 {vacinasProximas.length} próxima(s) dose(s)</div>
                  {vacinasProximas.map(v=><div key={v.id} style={{fontSize:12,color:'#cbd5e1'}}>{v.nome_pombo||'Efectivo'} — {v.nome} em {new Date(v.proxima_dose).toLocaleDateString('pt-PT')}</div>)}
                </div>
              )}
            </div>
          )}
          {vacinas.length===0
            ?<EmptyState icon="💉" title="Sem vacinas" desc="Registe vacinas e tratamentos preventivos" action={<button className="btn btn-primary" onClick={()=>setModalVac(true)}>＋ Nova Vacina</button>}/>
            :<div style={{display:'flex',flexDirection:'column',gap:8}}>
                {vacinas.map(v=>{
                  const atrasada=vacinasAtrasadas.some(a=>a.id===v.id)
                  const proxima=vacinasProximas.some(a=>a.id===v.id)
                  return (
                    <div key={v.id} className="card card-p" style={atrasada?{borderColor:'rgba(239,68,68,.3)'}:proxima?{borderColor:'rgba(212,175,55,.3)'}:undefined}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{fontSize:22}}>💉</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{v.nome}</div>
                          <div style={{fontSize:11,color:'#7A8699'}}>{v.nome_pombo||'Todo o efectivo'} · {new Date(v.data_aplicacao).toLocaleDateString('pt-PT')}</div>
                          {v.proxima_dose&&<div style={{fontSize:11,color:atrasada?'#f87171':proxima?'#D4AF37':'#7A8699'}}>Próxima: {new Date(v.proxima_dose).toLocaleDateString('pt-PT')}{atrasada?' ⚠️':''}</div>}
                          {v.obs&&<div style={{fontSize:10,color:'#475569',marginTop:2}}>{v.obs}</div>}
                        </div>
                        <button className="btn btn-icon btn-sm" onClick={()=>setConfirmVac(v)}>🗑️</button>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      )}

      {/* ══ PLANOS ══════════════════════════════════════════════════════════ */}
      {tab==='planos'&&(
        <div>
          <div style={{fontSize:13,color:'#94a3b8',marginBottom:14}}>Planos de vacinação e tratamentos preventivos recomendados.</div>
          {planos.length===0?(
            <div style={{textAlign:'center',padding:30}}>
              <div style={{fontSize:40,marginBottom:12}}>📋</div>
              <div style={{fontSize:15,fontWeight:600,color:'#fff',marginBottom:6}}>Sem planos configurados</div>
              <div style={{fontSize:13,color:'#7A8699',marginBottom:16}}>Inicialize com os protocolos recomendados</div>
              <button className="btn btn-primary" onClick={inicializarPlanos} disabled={saving}>{saving?<Spinner/>:null}Inicializar Planos</button>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {planos.map(p=>{
                const atrasado=p.proxima_aplicacao&&(new Date(p.proxima_aplicacao)-new Date())/86400000<0
                const proximo=p.proxima_aplicacao&&!atrasado&&(new Date(p.proxima_aplicacao)-new Date())/86400000<=30
                const diasAte=p.proxima_aplicacao?Math.round((new Date(p.proxima_aplicacao)-new Date())/86400000):null
                return (
                  <div key={p.id} className="card card-p" style={atrasado?{borderColor:'rgba(239,68,68,.3)'}:proximo?{borderColor:'rgba(212,175,55,.3)'}:undefined}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                      <div style={{fontSize:22}}>{p.obrigatoria?'🔴':'💊'}</div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                          <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{p.nome}</div>
                          {p.obrigatoria&&<span style={{fontSize:10,fontWeight:700,color:'#f87171',background:'rgba(239,68,68,.1)',padding:'1px 6px',borderRadius:10}}>OBRIGATÓRIA</span>}
                        </div>
                        <div style={{fontSize:11,color:'#7A8699',marginBottom:6}}>{p.descricao}</div>
                        <div style={{display:'flex',gap:12,fontSize:11,flexWrap:'wrap'}}>
                          <span style={{color:'#94a3b8'}}>A cada {p.periodicidade_dias} dias</span>
                          {p.ultima_aplicacao&&<span style={{color:'#2DD4A7'}}>Última: {new Date(p.ultima_aplicacao).toLocaleDateString('pt-PT')}</span>}
                          {diasAte!==null&&<span style={{color:atrasado?'#f87171':proximo?'#D4AF37':'#94a3b8',fontWeight:600}}>{atrasado?`⚠️ Atrasada ${Math.abs(diasAte)}d`:proximo?`Em ${diasAte}d`:p.proxima_aplicacao?new Date(p.proxima_aplicacao).toLocaleDateString('pt-PT'):'—'}</span>}
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={()=>setModalPlano(p)}>✅ Aplicar</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab==='doencas'&&<DoencasTab/>}

      {/* ══ MODAL REGISTO ═══════════════════════════════════════════════════ */}
      <Modal open={modal} onClose={close} title={selected?'✏️ Editar Registo':'🏥 Novo Registo de Saúde'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}{selected?t('guardar'):'Registar'}</button></>}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Field label="Pombo *">
            <select className="input" value={form.pigeon_id} onChange={e=>sf('pigeon_id',e.target.value)} disabled={!!selected}>
              <option value="">— Seleccionar —</option>
              {pombos.map(p=><option key={p.id} value={p.id}>{p.emoji||'🐦'} {p.nome} ({p.anilha})</option>)}
            </select>
          </Field>
          {/* aptidão com botões coloridos */}
          <Field label="Aptidão">
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {APTIDOES.map(a=>(
                <button key={a} type="button" onClick={()=>sf('aptidao',a)}
                  style={{padding:'7px 12px',borderRadius:8,border:`2px solid ${form.aptidao===a?APT_COR[a]:`${APT_COR[a]}33`}`,background:form.aptidao===a?`${APT_COR[a]}15`:'transparent',color:form.aptidao===a?APT_COR[a]:'#7A8699',cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:600}}>
                  {APT_ICON[a]} {a}
                </button>
              ))}
            </div>
          </Field>
          <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
            <Field label="Fase">
              <select className="input" value={form.fase} onChange={e=>sf('fase',e.target.value)}>
                {FASES.map(f=><option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Peso (g)"><input className="input" type="number" placeholder="420" value={form.peso} onChange={e=>sf('peso',e.target.value)}/></Field>
            <Field label="Data"><input className="input" type="date" value={form.data_reg} onChange={e=>sf('data_reg',e.target.value)}/></Field>
          </div>
          <Field label="Observações"><textarea className="input" rows={3} style={{resize:'none'}} placeholder="Sintomas, tratamento aplicado..." value={form.obs} onChange={e=>sf('obs',e.target.value)}/></Field>
          {/* aviso se lesionado/doente */}
          {['Lesionado','Doente'].includes(form.aptidao)&&(
            <div style={{background:'rgba(248,113,113,.07)',border:'1px solid rgba(248,113,113,.2)',borderRadius:8,padding:'10px 12px',fontSize:11,color:'#f87171',lineHeight:1.6}}>
              ⚠️ O estado do pombo será automaticamente atualizado para "lesionado" e não aparecerá disponível para encestamento.
            </div>
          )}
        </div>
      </Modal>

      {/* ══ MODAL VACINA ════════════════════════════════════════════════════ */}
      <Modal open={modalVac} onClose={()=>setModalVac(false)} title="💉 Nova Vacina / Tratamento"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalVac(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveVac} disabled={saving}>{saving?<Spinner/>:null}Registar</button></>}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Field label="Pombo (vazio = todo o efectivo)">
            <select className="input" value={formVac.pigeon_id} onChange={e=>sfv('pigeon_id',e.target.value)}>
              <option value="">Todo o efectivo</option>
              {pombos.map(p=><option key={p.id} value={p.id}>{p.emoji||'🐦'} {p.nome} ({p.anilha})</option>)}
            </select>
          </Field>
          <Field label="Vacina / Tratamento *"><input className="input" placeholder="Ex: Paramyxovirus" value={formVac.nome} onChange={e=>sfv('nome',e.target.value)}/></Field>
          <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
            <Field label="Data Aplicação"><input className="input" type="date" value={formVac.data_aplicacao} onChange={e=>sfv('data_aplicacao',e.target.value)}/></Field>
            <Field label="Próxima Dose"><input className="input" type="date" value={formVac.proxima_dose} onChange={e=>sfv('proxima_dose',e.target.value)}/></Field>
          </div>
          <Field label="Observações"><input className="input" placeholder="Notas..." value={formVac.obs} onChange={e=>sfv('obs',e.target.value)}/></Field>
        </div>
      </Modal>

      {/* ══ MODAL PLANO ═════════════════════════════════════════════════════ */}
      <Modal open={!!modalPlano} onClose={()=>setModalPlano(null)} title="✅ Registar Aplicação"
        footer={<><button className="btn btn-secondary" onClick={()=>setModalPlano(null)}>Cancelar</button><button className="btn btn-primary" onClick={()=>registarAplicacaoPlano(modalPlano)} disabled={saving}>{saving?<Spinner/>:null}Confirmar</button></>}>
        {modalPlano&&(
          <div>
            <div style={{fontSize:14,color:'#fff',fontWeight:600,marginBottom:6}}>{modalPlano.nome}</div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:14}}>{modalPlano.descricao}</div>
            <div style={{fontSize:13,color:'#cbd5e1'}}>Confirmar aplicação hoje a todo o efectivo. Próxima dose agendada para <strong style={{color:'#D4AF37'}}>{modalPlano.periodicidade_dias} dias</strong>.</div>
          </div>
        )}
      </Modal>

      {/* ══ CONFIRMS ════════════════════════════════════════════════════════ */}
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar registo"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{fontSize:14,color:'#cbd5e1'}}>Eliminar este registo de saúde?</p>
      </Modal>
      <Modal open={!!confirmVac} onClose={()=>setConfirmVac(null)} title="Eliminar vacina"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirmVac(null)}>Cancelar</button><button className="btn btn-danger" onClick={delVac}>Eliminar</button></>}>
        <p style={{fontSize:14,color:'#cbd5e1'}}>Eliminar o registo de "{confirmVac?.nome}"?</p>
      </Modal>
    </div>
  )
}
