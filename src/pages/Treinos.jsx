import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { classificarPombo } from './Pombos'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'

const TIPOS = ['Treino em Linha','Treino à Volta do Pombal','Voo Livre','Solta Local','Adestramento']
const TIPO_ICONS = { 'Treino em Linha':'➡️','Treino à Volta do Pombal':'🔄','Voo Livre':'🕊️','Solta Local':'📍','Adestramento':'🎯' }
const TIPO_COR = { 'Treino em Linha':'#4C8DFF','Treino à Volta do Pombal':'#2DD4A7','Voo Livre':'#C084FC','Solta Local':'#D4AF37','Adestramento':'#f87171' }
const RETORNOS = ['Completo','Parcial','Com Perdas']
const retornoBadge = { 'Completo':'green','Parcial':'yellow','Com Perdas':'red' }
const EMPTY = { local:'',lat_solta:'',lon_solta:'',tipo:'Treino em Linha',dist:'',data_reg:new Date().toISOString().slice(0,10),hora_solta:'08:00',hora_retorno:'',pombos_n:'',retorno:'Completo',custo:'',obs:'',pombosIds:[] }

function calcVel(distKm, horaSolta, horaRetorno) {
  if (!distKm||!horaSolta||!horaRetorno) return null
  const [hS,mS]=horaSolta.split(':').map(Number)
  const [hR,mR]=horaRetorno.split(':').map(Number)
  let mins=(hR*60+mR)-(hS*60+mS)
  if (mins<=0) mins+=24*60
  return Math.round((distKm/(mins/60))*100)/100
}

export default function Treinos({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()
  const [treinos, setTreinos] = useState([])
  const [pombos, setPombos] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroRetorno, setFiltroRetorno] = useState('todos')
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tr,p,pf] = await Promise.all([db.getTreinos(),db.getPombos(),db.getPerfil()])
      setTreinos(tr); setPombos(p); setPerfil(pf)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  },[])
  useEffect(()=>{ load() },[load])

  const pombosAtivos = pombos.filter(p=>(!p.estado_ext||p.estado_ext==='proprio')&&p.estado==='ativo')

  const [pesquisaLocal,setPesquisaLocal] = useState('')
  const [resultadosPesquisa,setResultadosPesquisa] = useState([])
  const [pesquisandoLocal,setPesquisandoLocal] = useState(false)
  const [dropdownAberto,setDropdownAberto] = useState(false)
  const debounceRef = useRef(null)

  const calcDistanciaAoPombal = (lat,lon) => {
    if (!perfil?.pombal_lat||!perfil?.pombal_lon||!lat||!lon) return null
    const R=6371,dLat=(perfil.pombal_lat-lat)*Math.PI/180,dLon=(perfil.pombal_lon-lon)*Math.PI/180
    const a=Math.sin(dLat/2)**2+Math.cos(lat*Math.PI/180)*Math.cos(perfil.pombal_lat*Math.PI/180)*Math.sin(dLon/2)**2
    return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)))
  }

  const pesquisarLocal = (q) => {
    setPesquisaLocal(q); setDropdownAberto(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length<2) { setResultadosPesquisa([]); return }
    debounceRef.current = setTimeout(async()=>{
      setPesquisandoLocal(true)
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=pt`)
        const data = await res.json()
        const todos = data.results||[]
        const filtrados = todos.filter(l=>['PT','ES'].includes(l.country_code))
        setResultadosPesquisa(filtrados.length>0?filtrados:todos.slice(0,4))
      } catch { setResultadosPesquisa([]) }
      finally { setPesquisandoLocal(false) }
    },350)
  }

  const selecionarLocal = (loc) => {
    const dist = calcDistanciaAoPombal(loc.latitude,loc.longitude)
    sf('local',`${loc.name}${loc.admin1?', '+loc.admin1:''} (${loc.country_code})`)
    sf('lat_solta',String(loc.latitude)); sf('lon_solta',String(loc.longitude))
    if (dist&&form.tipo==='Treino em Linha') sf('dist',String(dist))
    setPesquisaLocal(''); setResultadosPesquisa([]); setDropdownAberto(false)
  }

  const togglePombo = (id) => setForm(f=>({...f,pombosIds:f.pombosIds.includes(id)?f.pombosIds.filter(x=>x!==id):[...f.pombosIds,id]}))

  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true); setPesquisaLocal(''); setResultadosPesquisa([]) }
  const openEdit = (tr) => {
    setSelected(tr)
    setForm({ local:tr.local||'',lat_solta:String(tr.lat_solta||''),lon_solta:String(tr.lon_solta||''),tipo:tr.tipo||'Treino em Linha',dist:String(tr.dist||''),data_reg:tr.data_reg?.slice(0,10)||'',hora_solta:tr.hora_solta||'08:00',hora_retorno:tr.hora_retorno||'',pombos_n:String(tr.pombos_n||''),retorno:tr.retorno||'Completo',custo:String(tr.custo||''),obs:tr.obs||'',pombosIds:tr.pombos_ids||[] })
    setModal(true); setPesquisaLocal(''); setResultadosPesquisa([])
  }
  const close = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if (!form.local.trim()) { toast('Local obrigatório','warn'); return }
    setSaving(true)
    try {
      const vel = calcVel(parseFloat(form.dist),form.hora_solta,form.hora_retorno)
      const payload = { local:form.local.trim(),tipo:form.tipo,dist:form.dist?parseFloat(form.dist):null,data_reg:form.data_reg,hora_solta:form.hora_solta,hora_retorno:form.hora_retorno||null,pombos_n:form.pombosIds.length||(form.pombos_n?parseInt(form.pombos_n):null),pombos_ids:form.pombosIds,retorno:form.retorno,custo:form.custo?parseFloat(form.custo):null,obs:form.obs,velocidade:vel }
      selected ? await db.updateTreino(selected.id,payload) : await db.createTreino(payload)
      toast(selected?'Actualizado!':'Treino registado!','ok'); close(); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteTreino(confirm.id); toast('Eliminado','ok'); setConfirm(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  const treinosOrdenados = [...treinos].sort((a,b)=>new Date(b.data_reg)-new Date(a.data_reg))
  const treionosFiltrados = treinosOrdenados.filter(tr=>{
    if (filtroTipo!=='todos'&&tr.tipo!==filtroTipo) return false
    if (filtroRetorno!=='todos'&&tr.retorno!==filtroRetorno) return false
    return true
  })

  const totalKm = treinos.reduce((s,t)=>s+(t.dist||0),0)
  const totalCusto = treinos.reduce((s,t)=>s+(t.custo||0),0)
  const velMedia = treinos.filter(t=>t.velocidade).length>0 ? (treinos.filter(t=>t.velocidade).reduce((s,t)=>s+t.velocidade,0)/treinos.filter(t=>t.velocidade).length).toFixed(0) : 0
  const velMax = treinos.reduce((max,t)=>Math.max(max,t.velocidade||0),0)
  const completos = treinos.filter(t=>t.retorno==='Completo').length
  const taxaRetorno = treinos.length>0 ? Math.round(completos/treinos.length*100) : 0

  return (
    <div>
      <GuiaAuto modulo="treinos"/>

      {/* Header premium */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(76,141,255,.2)', borderRadius:14, padding:'14px 18px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#1E5FD9,#4C8DFF,#1E5FD9)' }}/>
        <div style={{ position:'absolute', top:'-30%', right:'-5%', width:180, height:180, background:'radial-gradient(circle,rgba(76,141,255,.1) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative' }}>
          <div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
              <span>🎯</span> Treinos
            </div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>{treinos.length} treinos registados · {totalKm.toFixed(0)}km totais</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <BotaoGuia modulo="treinos"/>
            <button className="btn btn-primary" onClick={openNew}>+ Novo Treino</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
        {[
          [treinos.length,'🎯','Treinos','#4C8DFF'],
          [`${totalKm.toFixed(0)}km`,'📍','Distância','#2DD4A7'],
          [`${velMedia} km/h`,'⚡','Vel. Média','#D4AF37'],
          [`${taxaRetorno}%`,'🔄','Taxa Retorno',taxaRetorno>=90?'#2DD4A7':taxaRetorno>=70?'#D4AF37':'#f87171'],
        ].map(([v,icon,l,c])=>(
          <div key={l} style={{ background:'#0B1830', border:`1px solid ${c}25`, borderRadius:12, padding:'12px 10px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:c, opacity:.6 }}/>
            <div style={{ fontSize:10, marginBottom:4 }}>{icon}</div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:c, lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:10, color:'#7A8699', marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Stats secundários */}
      {treinos.length>0&&(
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
          {[
            [`${velMax} km/h`,'🏆','Vel. Máxima','#D4AF37'],
            [`${totalCusto.toFixed(0)}€`,'💰','Custo Total','#f87171'],
            [completos,'✅','Retornos Completos','#2DD4A7'],
          ].map(([v,icon,l,c])=>(
            <div key={l} style={{ background:'#0A1628', border:'1px solid #1B2D52', borderRadius:10, padding:'10px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>{icon}</span>
              <div>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:c }}>{v}</div>
                <div style={{ fontSize:10, color:'#7A8699' }}>{l}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      {treinos.length>0&&(
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          <select className="input" style={{ flex:1, minWidth:140, fontSize:12 }} value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}>
            <option value="todos">Todos os tipos</option>
            {TIPOS.map(tp=><option key={tp} value={tp}>{TIPO_ICONS[tp]} {tp}</option>)}
          </select>
          <select className="input" style={{ flex:1, minWidth:120, fontSize:12 }} value={filtroRetorno} onChange={e=>setFiltroRetorno(e.target.value)}>
            <option value="todos">Todos os retornos</option>
            {RETORNOS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}

      {/* Lista */}
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg/></div>
        : treinos.length===0 ? <EmptyState icon="🎯" title="Sem treinos" desc="Registe o primeiro treino do efectivo" action={<button className="btn btn-primary" onClick={openNew}>+ Novo Treino</button>}/>
        : treionosFiltrados.length===0 ? <div style={{ textAlign:'center', padding:32, color:'#475569', fontSize:13 }}>Sem treinos com este filtro</div>
        : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {treionosFiltrados.map(tr=>{
              const cor = TIPO_COR[tr.tipo]||'#4C8DFF'
              return (
                <div key={tr.id} style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:12, padding:'14px 16px', borderLeft:`3px solid ${cor}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:10, background:`${cor}15`, border:`1px solid ${cor}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{TIPO_ICONS[tr.tipo]||'🎯'}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{tr.local}</span>
                        <span style={{ fontSize:10, color:cor, background:`${cor}15`, padding:'1px 6px', borderRadius:6, fontWeight:600 }}>{tr.tipo}</span>
                      </div>
                      <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:11, color:'#7A8699' }}>
                        {tr.dist&&<span>📍 {tr.dist}km</span>}
                        <span>🐦 {tr.pombos_n||'?'} pombos</span>
                        <span>📅 {new Date(tr.data_reg).toLocaleDateString('pt-PT')}</span>
                        {tr.hora_solta&&<span>🕗 {tr.hora_solta}{tr.hora_retorno?` → ${tr.hora_retorno}`:''}</span>}
                      </div>
                      {tr.velocidade&&(
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:5 }}>
                          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:13, fontWeight:700, color:'#2DD4A7' }}>⚡ {tr.velocidade} km/h</span>
                          <div style={{ flex:1, height:3, background:'#101F40', borderRadius:2, maxWidth:80 }}>
                            <div style={{ height:'100%', width:`${Math.min(100,tr.velocidade/2)}%`, background:'#2DD4A7', borderRadius:2 }}/>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                      <Badge v={retornoBadge[tr.retorno]||'gray'}>{tr.retorno}</Badge>
                      {tr.custo&&<span style={{ fontSize:10, color:'#7A8699' }}>{tr.custo}€</span>}
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(tr)}>✏️</button>
                        <button className="btn btn-icon btn-sm" onClick={()=>setConfirm(tr)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                  {tr.obs&&<div style={{ fontSize:11, color:'#7A8699', marginTop:8, paddingTop:8, borderTop:'1px solid #1B2D52', fontStyle:'italic' }}>{tr.obs}</div>}
                </div>
              )
            })}
          </div>
      }

      {/* Modal form */}
      <Modal open={modal} onClose={close} title={selected?'✏️ Editar Treino':'🎯 Novo Treino'} wide
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}{selected?t('guardar'):'Registar'}</button></>}>
        <div className="form-grid">
          <Field label="Tipo">
            <select className="input" value={form.tipo} onChange={e=>{ sf('tipo',e.target.value); if (e.target.value==='Treino à Volta do Pombal'){ sf('local',perfil?.pombal_nome||'Pombal'); sf('dist','') } }}>
              {TIPOS.map(tp=><option key={tp}>{TIPO_ICONS[tp]} {tp}</option>)}
            </select>
          </Field>
          <div className="col-2">
            {form.tipo==='Treino à Volta do Pombal'?(
              <Field label="Local">
                <input className="input" value={form.local||perfil?.pombal_nome||'Pombal'} onChange={e=>sf('local',e.target.value)}/>
              </Field>
            ):(
              <Field label="🔍 Local de Solta">
                <div style={{ position:'relative' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <input className="input" placeholder="Ex: Évora, Badajoz..." value={pesquisaLocal} onChange={e=>pesquisarLocal(e.target.value)} style={{ flex:1 }}/>
                    {form.local&&<button type="button" className="btn btn-secondary btn-sm" onClick={()=>{ sf('local',''); sf('lat_solta',''); sf('lon_solta',''); sf('dist',''); setPesquisaLocal('') }}>✕</button>}
                  </div>
                  {form.local&&!pesquisaLocal&&<div style={{ fontSize:11, color:'#2DD4A7', marginTop:4 }}>✅ {form.local}{form.dist?` · ${form.dist}km`:''}</div>}
                  {resultadosPesquisa.length>0&&dropdownAberto&&(
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#0B1830', border:'1px solid #1B2D52', borderRadius:8, zIndex:200, marginTop:4, boxShadow:'0 8px 24px rgba(0,0,0,.5)' }}>
                      {resultadosPesquisa.map((loc,i)=>(
                        <div key={i} onClick={()=>selecionarLocal(loc)} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:i<resultadosPesquisa.length-1?'1px solid #101F40':'none', fontSize:13 }}
                          onMouseEnter={e=>e.currentTarget.style.background='#101F40'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{ color:'#fff', fontWeight:500 }}>{loc.name}{loc.admin2?`, ${loc.admin2}`:''}</div>
                          <div style={{ fontSize:11, color:'#7A8699' }}>{loc.admin1} · <span style={{ color:loc.country_code==='PT'?'#4C8DFF':'#D4AF37', fontWeight:600 }}>{loc.country_code}</span></div>
                        </div>
                      ))}
                      <div onClick={()=>{ setResultadosPesquisa([]); setDropdownAberto(false) }} style={{ padding:'8px 14px', fontSize:11, color:'#7A8699', cursor:'pointer', textAlign:'center' }}>Fechar ✕</div>
                    </div>
                  )}
                </div>
              </Field>
            )}
          </div>
          <Field label="Distância (km)"><input className="input" type="number" placeholder="80" value={form.dist} onChange={e=>sf('dist',e.target.value)}/></Field>
          <Field label="Data"><input className="input" type="date" value={form.data_reg} onChange={e=>sf('data_reg',e.target.value)}/></Field>
          <Field label="Hora Solta"><input className="input" type="time" value={form.hora_solta} onChange={e=>sf('hora_solta',e.target.value)}/></Field>
          <Field label="Hora Retorno"><input className="input" type="time" value={form.hora_retorno} onChange={e=>sf('hora_retorno',e.target.value)}/></Field>
          {form.hora_retorno&&form.dist&&(
            <div className="col-2" style={{ background:'rgba(45,212,167,.08)', border:'1px solid rgba(45,212,167,.2)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>⚡</span>
              <div>
                <div style={{ fontSize:11, color:'#7A8699' }}>Velocidade calculada</div>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:'#2DD4A7' }}>
                  {calcVel(parseFloat(form.dist),form.hora_solta,form.hora_retorno)||'—'} km/h
                </div>
              </div>
            </div>
          )}
          <Field label="Retorno"><select className="input" value={form.retorno} onChange={e=>sf('retorno',e.target.value)}>{RETORNOS.map(r=><option key={r}>{r}</option>)}</select></Field>
          <Field label="Custo (€)"><input className="input" type="number" step="0.01" placeholder="combustível, portagens..." value={form.custo} onChange={e=>sf('custo',e.target.value)}/></Field>
          <div className="col-2">
            <Field label={`Pombos participantes (${form.pombosIds.length} seleccionados)`}>
              {form.pombosIds.some(id=>{ const p=pombosAtivos.find(x=>x.id===id); return p&&classificarPombo(p).prioridade<=1 })&&(
                <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'8px 12px', marginBottom:8, fontSize:11, color:'#f87171' }}>
                  ⚠️ Pombo(s) lesionado(s) seleccionado(s) — confirme se estão aptos.
                </div>
              )}
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:160, overflowY:'auto', padding:'8px 0' }}>
                {pombosAtivos.map(p=>{
                  const c=classificarPombo(p)
                  const atencao=c.prioridade<=1
                  return (
                    <button key={p.id} type="button" onClick={()=>togglePombo(p.id)}
                      className={`chip${form.pombosIds.includes(p.id)?' active':''}`} style={{ fontSize:11, borderColor:atencao&&!form.pombosIds.includes(p.id)?'rgba(239,68,68,.3)':undefined }}>
                      {p.emoji} {p.nome}{atencao?' 🏥':''}
                    </button>
                  )
                })}
              </div>
              {form.pombosIds.length===0&&<input className="input" type="number" placeholder="Ou indique apenas o número de pombos" value={form.pombos_n} onChange={e=>sf('pombos_n',e.target.value)} style={{ marginTop:6 }}/>}
            </Field>
          </div>
          <div className="col-2"><Field label="Observações"><textarea className="input" rows={2} style={{ resize:'none' }} value={form.obs} onChange={e=>sf('obs',e.target.value)}/></Field></div>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Eliminar treino"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar treino em "{confirm?.local}"?</p>
      </Modal>
    </div>
  )
}
