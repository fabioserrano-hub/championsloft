// src/modules/virtualLoft/screens/VLPerfil.jsx — Perfil + Guardar/Carregar
import { useState, useEffect } from 'react'

const T={bg:'#050A14',surface:'#0D1829',s2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171',purple:'#A855F7',orange:'#FB923C'}

const SUPA_URL='https://tgqnbheetpgnpjsjphoj.supabase.co'
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncW5iaGVldHBnbnBqc2pwaG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTk0NDIsImV4cCI6MjA5MjAzNTQ0Mn0.32ZjOUB-bOAIgtwwpKDVRSJy1w4xlOR7IMb4bRTK3Uo'
// Token JWT do utilizador autenticado — necessário para o RLS permitir ler/escrever
function getAuthToken(){
  try{
    const keys=Object.keys(localStorage).filter(k=>k.includes('supabase.auth.token')||k.includes('sb-'))
    for(const k of keys){
      const val=JSON.parse(localStorage.getItem(k)||'{}')
      const token=val?.access_token||val?.currentSession?.access_token
      if(token)return token
    }
  }catch{}
  return null
}
function HDRS(){const t=getAuthToken();return {'apikey':SUPA_KEY,'Authorization':`Bearer ${t||SUPA_KEY}`,'Content-Type':'application/json'}}

function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}
function GL(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.8}}/>}

const NIVEL_CFG={
  local:         {label:'Local',         cor:'#6B7A99'},
  distrital:     {label:'Distrital',     cor:'#4FC3F7'},
  regional:      {label:'Regional',      cor:'#2DD4A7'},
  nacional:      {label:'Nacional',      cor:'#C9A84C'},
  internacional: {label:'Internacional', cor:'#A855F7'},
  olimpico:      {label:'Olímpico',      cor:'#F87171'},
}

const LOGOTIPOS=['🕊️','🦅','🏆','⚡','🌟','🔥','💎','🎯','👑','🦁','🐦','🌙']
const PAISES=[{v:'PT',l:'🇵🇹 Portugal'},{v:'BR',l:'🇧🇷 Brasil'},{v:'ES',l:'🇪🇸 Espanha'},{v:'NL',l:'🇳🇱 Holanda'},{v:'BE',l:'🇧🇪 Bélgica'},{v:'FR',l:'🇫🇷 França'}]

async function guardarNuvem(userId, carreira){
  try{
    const payload={user_id:userId,dados:carreira,nome_pombal:carreira.nomePombal,epoca:carreira.epoca||1,dia:carreira.dia||1,updated_at:new Date().toISOString()}
    await fetch(`${SUPA_URL}/rest/v1/vl_carreiras`,{method:'POST',headers:{...HDRS(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(payload)})
    return true
  }catch(e){return false}
}

async function carregarNuvem(userId){
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/vl_carreiras?user_id=eq.${userId}&select=dados,updated_at,nome_pombal,epoca,dia`,{headers:HDRS()})
    const d=await r.json()
    return d?.[0]||null
  }catch(e){return null}
}

export default function VLPerfil({carreira,onVoltar,onGuardar,onApagar,userId}){
  const [cl,setCL]=useState(()=>lerLS()||carreira)
  const c=cl
  const salvar=d=>{gravarLS(d);setCL({...d});onGuardar?.(d)}

  const [tab,setTab]=useState('perfil')
  const [msg,setMsg]=useState(null)
  const [guardando,setGuardando]=useState(false)
  const [carregando,setCarregando]=useState(false)
  const [ultimoGuardado,setUltimoGuardado]=useState(null)
  const [dadosNuvem,setDadosNuvem]=useState(null)
  const [editando,setEditando]=useState(false)
  const [form,setForm]=useState({nomePombal:c.nomePombal,nomeGestor:c.nomeGestor,logotipo:c.logotipo||'🕊️',pais:c.pais||'PT'})
  const [confirmApagar,setConfirmApagar]=useState(false)

  const showMsg=(texto,tipo='ok')=>{setMsg({texto,tipo});setTimeout(()=>setMsg(null),4000)}

  // Carregar info da nuvem ao abrir
  useEffect(()=>{
    if(!userId)return
    carregarNuvem(userId).then(d=>{
      if(d){
        setDadosNuvem(d)
        setUltimoGuardado(new Date(d.updated_at).toLocaleString('pt-PT'))
      }
    })
  },[userId])

  const guardarManual=async()=>{
    setGuardando(true)
    gravarLS(c)
    const ok=await guardarNuvem(userId,c)
    setGuardando(false)
    if(ok){
      setUltimoGuardado(new Date().toLocaleString('pt-PT'))
      showMsg('Carreira guardada na nuvem! ☁️')
    }else{
      showMsg('Guardado localmente. Sem ligação à nuvem.','aviso')
    }
  }

  const carregarDaNuvem=async()=>{
    setCarregando(true)
    const d=await carregarNuvem(userId)
    setCarregando(false)
    if(d?.dados){
      gravarLS(d.dados)
      setCL({...d.dados})
      onGuardar?.(d.dados)
      showMsg('Carreira carregada da nuvem! ☁️')
    }else{
      showMsg('Sem carreira guardada na nuvem.','erro')
    }
  }

  const guardarEdits=()=>{
    const nova={...c,...form}
    salvar(nova)
    setEditando(false)
    showMsg('Perfil actualizado!')
  }

  // Estatísticas da carreira
  const hist=c.historico_provas||[]
  const pombos=c.pombos||[]
  const activos=pombos.filter(p=>p.estado==='activo').length
  const totalProvas=hist.length
  const totalVitorias=hist.filter(r=>r.posicao===1).length
  const melhorPct=hist.length?Math.max(...hist.map(r=>r.percentil||0)):0
  const niv=NIVEL_CFG[c.nivel_reputacao||'local']
  const patSem=(c.patrocinios||[]).reduce((s,p)=>s+(p.valorSemanal||0),0)
  const diasJogados=c.dia||1
  const semanasJogadas=Math.ceil(diasJogados/7)
  const mediaRating=activos?(pombos.filter(p=>p.estado==='activo').reduce((s,p)=>s+(p.rating||0),0)/activos).toFixed(1):0

  return(
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:`linear-gradient(180deg,${T.surface},${T.bg})`,borderBottom:`1px solid ${T.s2}`,padding:'14px 16px',position:'relative'}}>
        <GL/>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <button onClick={onVoltar} style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:8,width:32,height:32,color:T.muted,cursor:'pointer',fontSize:16}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800}}>👤 Perfil & Carreira</div>
            <div style={{fontSize:9,color:T.muted}}>
              {ultimoGuardado?`☁️ Guardado: ${ultimoGuardado}`:'☁️ Ainda não guardado na nuvem'}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[['perfil','Perfil'],['guardar','Guardar'],['stats','Estatísticas'],['perigo','⚠️ Danger Zone']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:'none',padding:'7px 11px',borderRadius:8,border:tab===id?'none':`1px solid ${T.s2}`,background:tab===id?id==='perigo'?`${T.danger}20`:`${T.purple}20`:'transparent',color:tab===id?id==='perigo'?T.danger:T.purple:T.muted,fontSize:10,fontWeight:tab===id?700:400,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {msg&&<div style={{margin:'10px 16px 0',padding:'10px 14px',background:msg.tipo==='ok'?`${T.success}10`:msg.tipo==='erro'?`${T.danger}10`:`${T.gold}10`,border:`1px solid ${msg.tipo==='ok'?T.success:msg.tipo==='erro'?T.danger:T.gold}30`,borderRadius:10,fontSize:12,color:msg.tipo==='ok'?T.success:msg.tipo==='erro'?T.danger:T.gold,fontWeight:600}}>
        {msg.tipo==='ok'?'✅':msg.tipo==='erro'?'❌':'⚠️'} {msg.texto}
      </div>}

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:12}}>

        {/* PERFIL */}
        {tab==='perfil'&&(
          <>
            {/* Card hero */}
            <div style={{background:`linear-gradient(135deg,${T.purple}15,${T.surface})`,border:`1px solid ${T.purple}25`,borderRadius:16,padding:'20px',position:'relative',overflow:'hidden',textAlign:'center'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${T.purple},${T.gold},transparent)`}}/>
              <div style={{fontSize:52,marginBottom:8}}>{c.logotipo||'🕊️'}</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:900,color:T.text,marginBottom:4}}>{c.nomePombal}</div>
              <div style={{fontSize:12,color:T.muted,marginBottom:8}}>{c.nomeGestor} · {PAISES.find(p=>p.v===c.pais)?.l||'🌍'}</div>
              <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',background:`${niv.cor}15`,border:`1px solid ${niv.cor}30`,borderRadius:20}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:niv.cor,boxShadow:`0 0 6px ${niv.cor}`}}/>
                <span style={{fontSize:11,color:niv.cor,fontWeight:700}}>{niv.label}</span>
              </div>
            </div>

            {/* Grid de stats rápidos */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
              {[
                {l:'Época',v:c.epoca||1,c:T.purple,icon:'📅'},
                {l:'Dia de carreira',v:diasJogados,c:T.blue,icon:'☀️'},
                {l:'Pombos activos',v:activos,c:T.success,icon:'🐦'},
                {l:'Orçamento',v:`${(c.orcamento||0).toLocaleString()}€`,c:T.gold,icon:'💰'},
                {l:'Patrocínios/sem',v:`+${patSem}€`,c:T.success,icon:'🤝'},
                {l:'Staff',v:(c.staff||[]).length,c:T.blue,icon:'👥'},
                {l:'Provas',v:totalProvas,c:T.orange,icon:'🏆'},
                {l:'Vitórias',v:totalVitorias,c:T.gold,icon:'🥇'},
              ].map((s,i)=>(
                <div key={i} style={{background:T.surface,border:`1px solid ${s.c}18`,borderRadius:10,padding:'12px',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${s.c}40,transparent)`}}/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:900,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:9,color:T.muted,fontWeight:600,marginTop:2}}>{s.l.toUpperCase()}</div>
                    </div>
                    <span style={{fontSize:20,opacity:.6}}>{s.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Editar perfil */}
            {!editando?(
              <button onClick={()=>setEditando(true)}
                style={{width:'100%',padding:'12px',borderRadius:10,border:`1px solid ${T.s2}`,background:'transparent',color:T.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
                ✏️ Editar perfil
              </button>
            ):(
              <div style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:12,padding:'16px',position:'relative',overflow:'hidden'}}>
                <GL/>
                <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:14}}>✏️ Editar Perfil</div>

                {/* Logótipo */}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:9,color:T.muted,fontWeight:600,letterSpacing:1,marginBottom:8}}>LOGÓTIPO</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {LOGOTIPOS.map(l=>(
                      <div key={l} onClick={()=>setForm({...form,logotipo:l})}
                        style={{width:38,height:38,borderRadius:8,background:form.logotipo===l?`${T.gold}20`:T.s2,border:`2px solid ${form.logotipo===l?T.gold:T.s2}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,cursor:'pointer',transition:'all .15s'}}>
                        {l}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nome do pombal */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:9,color:T.muted,fontWeight:600,letterSpacing:1,marginBottom:5}}>NOME DO POMBAL</div>
                  <input value={form.nomePombal} onChange={e=>setForm({...form,nomePombal:e.target.value})}
                    style={{width:'100%',padding:'10px 12px',background:T.s2,border:`1px solid ${T.s2}`,borderRadius:8,color:T.text,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                </div>

                {/* Nome do gestor */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:9,color:T.muted,fontWeight:600,letterSpacing:1,marginBottom:5}}>O TEU NOME</div>
                  <input value={form.nomeGestor} onChange={e=>setForm({...form,nomeGestor:e.target.value})}
                    style={{width:'100%',padding:'10px 12px',background:T.s2,border:`1px solid ${T.s2}`,borderRadius:8,color:T.text,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                </div>

                {/* País */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:9,color:T.muted,fontWeight:600,letterSpacing:1,marginBottom:5}}>PAÍS</div>
                  <select value={form.pais} onChange={e=>setForm({...form,pais:e.target.value})}
                    style={{width:'100%',padding:'10px 12px',background:T.s2,border:`1px solid ${T.s2}`,borderRadius:8,color:T.text,fontSize:13,fontFamily:'inherit',outline:'none',cursor:'pointer'}}>
                    {PAISES.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                </div>

                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setEditando(false)}
                    style={{flex:1,padding:'11px',borderRadius:10,border:`1px solid ${T.s2}`,background:'transparent',color:T.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
                    Cancelar
                  </button>
                  <button onClick={guardarEdits}
                    style={{flex:2,padding:'11px',borderRadius:10,border:'none',background:`linear-gradient(135deg,${T.purple},#7C3AED)`,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 4px 12px ${T.purple}30`}}>
                    ✅ Guardar alterações
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* GUARDAR/CARREGAR */}
        {tab==='guardar'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>

            {/* Estado da nuvem */}
            <div style={{background:'linear-gradient(135deg,rgba(79,195,247,.1),rgba(79,195,247,.04))',border:`1px solid ${T.blue}25`,borderRadius:14,padding:'16px',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${T.blue},transparent)`}}/>
              <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:10}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${T.blue}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>☁️</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:T.text}}>Guardar na Nuvem</div>
                  <div style={{fontSize:10,color:T.muted}}>Supabase · Acesso em qualquer dispositivo</div>
                </div>
              </div>
              {ultimoGuardado&&(
                <div style={{padding:'8px 10px',background:'rgba(255,255,255,.04)',borderRadius:8,marginBottom:10}}>
                  <div style={{fontSize:9,color:T.muted}}>ÚLTIMO GUARDADO</div>
                  <div style={{fontSize:11,color:T.success,fontWeight:600}}>{ultimoGuardado}</div>
                  {dadosNuvem&&<div style={{fontSize:9,color:T.muted,marginTop:2}}>{dadosNuvem.nome_pombal} · Época {dadosNuvem.epoca} · Dia {dadosNuvem.dia}</div>}
                </div>
              )}
              <button onClick={guardarManual} disabled={guardando}
                style={{width:'100%',padding:'13px',borderRadius:10,border:'none',background:guardando?T.s2:`linear-gradient(135deg,${T.blue},#0284C7)`,color:guardando?T.muted:'#050A14',fontSize:13,fontWeight:800,cursor:guardando?'wait':'pointer',fontFamily:'inherit',boxShadow:guardando?'none':`0 4px 16px ${T.blue}30`}}>
                {guardando?'⏳ A guardar...':'☁️ Guardar Agora'}
              </button>
            </div>

            {/* Carregar da nuvem */}
            <div style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:14,padding:'16px',position:'relative',overflow:'hidden'}}>
              <GL/>
              <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:10}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${T.success}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📥</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:T.text}}>Carregar da Nuvem</div>
                  <div style={{fontSize:10,color:T.muted}}>Restaurar carreira guardada</div>
                </div>
              </div>
              {dadosNuvem?(
                <div style={{padding:'10px',background:`${T.success}08`,border:`1px solid ${T.success}20`,borderRadius:8,marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.success,marginBottom:3}}>☁️ Carreira encontrada na nuvem</div>
                  <div style={{fontSize:11,color:T.text}}>{dadosNuvem.nome_pombal}</div>
                  <div style={{fontSize:9,color:T.muted}}>Época {dadosNuvem.epoca} · Dia {dadosNuvem.dia} · {ultimoGuardado}</div>
                </div>
              ):(
                <div style={{padding:'10px',background:T.s2,borderRadius:8,marginBottom:10,fontSize:10,color:T.muted}}>
                  Sem carreira guardada na nuvem para esta conta.
                </div>
              )}
              <button onClick={carregarDaNuvem} disabled={carregando||!dadosNuvem}
                style={{width:'100%',padding:'13px',borderRadius:10,border:'none',background:dadosNuvem&&!carregando?`linear-gradient(135deg,${T.success},#059669)`:T.s2,color:dadosNuvem&&!carregando?'#050A14':T.muted,fontSize:13,fontWeight:800,cursor:dadosNuvem&&!carregando?'pointer':'default',fontFamily:'inherit'}}>
                {carregando?'⏳ A carregar...':dadosNuvem?'📥 Carregar Carreira':'Sem dados na nuvem'}
              </button>
            </div>

            {/* Guardar local */}
            <div style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:12,padding:'14px',position:'relative',overflow:'hidden'}}>
              <GL/>
              <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:4}}>💾 Guardado Local</div>
              <div style={{fontSize:10,color:T.muted,marginBottom:10}}>A carreira é guardada automaticamente no browser a cada acção. Este guarda é automático e não requer ligação à internet.</div>
              <div style={{padding:'8px 10px',background:`${T.success}08`,border:`1px solid ${T.success}20`,borderRadius:8,fontSize:10,color:T.success,fontWeight:600}}>
                ✅ Auto-save activo — carreira guardada localmente
              </div>
            </div>
          </div>
        )}

        {/* ESTATÍSTICAS */}
        {tab==='stats'&&(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {/* Resumo carreira */}
            <div style={{background:'linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.04))',border:`1px solid ${T.gold}25`,borderRadius:14,padding:'16px',position:'relative',overflow:'hidden'}}>
              <GL/>
              <div style={{fontSize:9,color:T.gold,fontWeight:700,letterSpacing:1.5,marginBottom:12}}>📊 RESUMO DA CARREIRA</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                {[
                  {l:'Dias jogados',v:diasJogados,c:T.blue},
                  {l:'Semanas',v:semanasJogadas,c:T.purple},
                  {l:'Épocas',v:c.epoca||1,c:T.gold},
                  {l:'Provas',v:totalProvas,c:T.orange},
                  {l:'Vitórias',v:totalVitorias,c:T.gold},
                  {l:'Melhor %',v:`P${melhorPct}%`,c:T.success},
                  {l:'Pombos criados',v:(c.ninhadas_virtuais||[]).length*2,c:'#C084FC'},
                  {l:'Rating médio',v:`${mediaRating}★`,c:T.gold},
                ].map((s,i)=>(
                  <div key={i} style={{background:T.surface,border:`1px solid ${s.c}18`,borderRadius:8,padding:'10px'}}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:900,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:T.muted,fontWeight:600,marginTop:2}}>{s.l.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Finanças resumo */}
            <div style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:12,padding:'14px',position:'relative',overflow:'hidden'}}>
              <GL/>
              <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:10}}>SITUAÇÃO FINANCEIRA</div>
              {[
                {l:'Orçamento actual',v:`${(c.orcamento||0).toLocaleString()}€`,c:T.gold},
                {l:'Receita semanal',v:`+${patSem}€`,c:T.success},
                {l:'Staff contratado',v:`${(c.staff||[]).length} pessoas`,c:T.blue},
                {l:'Contratos activos',v:`${(c.patrocinios||[]).length} patrocínios`,c:T.success},
              ].map((s,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<3?`1px solid ${T.s2}`:'none'}}>
                  <span style={{fontSize:11,color:T.muted}}>{s.l}</span>
                  <span style={{fontSize:11,fontWeight:700,color:s.c}}>{s.v}</span>
                </div>
              ))}
            </div>

            {/* Conquistas rápidas */}
            <div style={{background:T.surface,border:`1px solid ${T.s2}`,borderRadius:12,padding:'14px',position:'relative',overflow:'hidden'}}>
              <GL/>
              <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:1,marginBottom:10}}>CONQUISTAS</div>
              {[
                {icon:'🏆',l:'Primeira vitória',ok:totalVitorias>=1},
                {icon:'🥇',l:'5 vitórias',ok:totalVitorias>=5},
                {icon:'⭐',l:'Pombo 4 estrelas',ok:(c.pombos||[]).some(p=>(p.rating||0)>=4)},
                {icon:'💎',l:'Gene raro descoberto',ok:(c.pombos||[]).some(p=>p.atributos?.gene_raro_tipo)},
                {icon:'🏛️',l:'Hall of Fame',ok:(c.hall_of_fame||[]).length>0},
                {icon:'🤝',l:'Primeiro patrocínio',ok:(c.patrocinios||[]).length>0},
              ].map((s,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<5?`1px solid ${T.s2}`:'none',opacity:s.ok?1:.4}}>
                  <span style={{fontSize:18}}>{s.icon}</span>
                  <span style={{fontSize:11,color:s.ok?T.text:T.muted,flex:1}}>{s.l}</span>
                  <span style={{fontSize:12}}>{s.ok?'✅':'○'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DANGER ZONE */}
        {tab==='perigo'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{padding:'12px 14px',background:`${T.danger}08`,border:`1px solid ${T.danger}20`,borderRadius:10,fontSize:11,color:T.danger}}>
              ⚠️ Atenção: as acções nesta secção são irreversíveis.
            </div>

            {/* Reiniciar sem apagar */}
            <div style={{background:T.surface,border:`1px solid ${T.orange}20`,borderRadius:12,padding:'14px',position:'relative',overflow:'hidden'}}>
              <GL/>
              <div style={{fontSize:12,fontWeight:700,color:T.orange,marginBottom:4}}>🔄 Reiniciar semana</div>
              <div style={{fontSize:10,color:T.muted,marginBottom:10}}>Volta para o início da semana actual. Os resultados de provas desta semana são perdidos.</div>
              <button onClick={()=>{
                const nova={...c,dia:Math.max(1,c.dia-((c.dia-1)%7)),historico_provas:(c.historico_provas||[]).filter(r=>r.semana<(c.semana||1))}
                salvar(nova);showMsg('Semana reiniciada.','aviso')
              }} style={{width:'100%',padding:'10px',borderRadius:8,border:`1px solid ${T.orange}30`,background:`${T.orange}10`,color:T.orange,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                🔄 Reiniciar semana actual
              </button>
            </div>

            {/* Apagar carreira */}
            <div style={{background:T.surface,border:`1px solid ${T.danger}25`,borderRadius:12,padding:'14px',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:T.danger}}/>
              <div style={{fontSize:12,fontWeight:700,color:T.danger,marginBottom:4}}>🗑️ Apagar carreira</div>
              <div style={{fontSize:10,color:T.muted,marginBottom:10}}>Apaga permanentemente toda a carreira, incluindo pombos, provas e historial. Esta acção não pode ser desfeita.</div>
              {!confirmApagar?(
                <button onClick={()=>setConfirmApagar(true)}
                  style={{width:'100%',padding:'11px',borderRadius:8,border:`1px solid ${T.danger}30`,background:`${T.danger}10`,color:T.danger,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  🗑️ Apagar carreira
                </button>
              ):(
                <div>
                  <div style={{padding:'10px',background:`${T.danger}15`,border:`1px solid ${T.danger}30`,borderRadius:8,marginBottom:10,fontSize:11,color:T.danger,textAlign:'center',fontWeight:700}}>
                    Tens a certeza? Esta acção é permanente!
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>setConfirmApagar(false)}
                      style={{flex:1,padding:'11px',borderRadius:8,border:`1px solid ${T.s2}`,background:'transparent',color:T.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                      Cancelar
                    </button>
                    <button onClick={()=>{
                      localStorage.removeItem('vl_carreira')
                      onApagar?.()
                    }} style={{flex:2,padding:'11px',borderRadius:8,border:'none',background:T.danger,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                      ⚠️ Sim, apagar tudo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
