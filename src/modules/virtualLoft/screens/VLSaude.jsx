// src/modules/virtualLoft/screens/VLSaude.jsx — V1 Hospital Veterinário + Vacinação
import { useState, useEffect } from 'react'

const T={bg:'#050A14',surface:'#0D1829',s2:'#1A2A45',gold:'#C9A84C',blue:'#4FC3F7',text:'#E8EDF5',muted:'#6B7A99',success:'#2DD4A7',danger:'#F87171',purple:'#A855F7',orange:'#FB923C'}
function lerLS(){try{return JSON.parse(localStorage.getItem('vl_carreira'))}catch{return null}}
function gravarLS(d){try{localStorage.setItem('vl_carreira',JSON.stringify(d))}catch{}}
function GL(){return <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',opacity:.8}}/>}

// ── Catálogo de doenças ─────────────────────────────────────
const DOENCAS=[
  {id:'paramixo',   nome:'Paramixovirose', icon:'🦠', grav:'grave',    dur:21, custo:120, sintomas:'Torcicolo, tremores, diarreia aquosa', prev:'Vacinação anual obrigatória'},
  {id:'variola',    nome:'Varíola',        icon:'🔴', grav:'media',    dur:14, custo:70,  sintomas:'Nódulos na pele, crostas no bico e olhos', prev:'Vacinação + controlo de mosquitos'},
  {id:'salmonelose',nome:'Salmonelose',    icon:'🧫', grav:'grave',    dur:18, custo:100, sintomas:'Asa caída, artrite, perda de peso', prev:'Vacinação + higiene rigorosa'},
  {id:'tricomon',   nome:'Tricomoníase',   icon:'🟡', grav:'media',    dur:10, custo:50,  sintomas:'Placas amarelas na garganta, dificuldade em engolir', prev:'Tratamento preventivo na água'},
  {id:'coccidiose', nome:'Coccidiose',     icon:'💧', grav:'ligeira',  dur:7,  custo:35,  sintomas:'Diarreia, penas eriçadas, apatia', prev:'Fundo de gaiola seco e limpo'},
  {id:'ornitose',   nome:'Ornitose',       icon:'👁️', grav:'media',    dur:12, custo:60,  sintomas:'Olho húmido, espirros, respiração ruidosa', prev:'Boa ventilação do pombal'},
  {id:'coriza',     nome:'Coriza',         icon:'🤧', grav:'ligeira',  dur:6,  custo:30,  sintomas:'Corrimento nasal, espirros frequentes', prev:'Evitar correntes de ar e humidade'},
  {id:'vermes',     nome:'Vermes',         icon:'🪱', grav:'ligeira',  dur:5,  custo:25,  sintomas:'Emagrecimento apesar de comer bem', prev:'Desparasitação trimestral'},
]
const LESAO={id:'lesao',nome:'Lesão',icon:'🤕',grav:'media',dur:12,custo:80,sintomas:'Asa ou pata afectada, voo limitado',prev:'Treino progressivo, evitar sobrecarga'}

// ── Vacinas ──────────────────────────────────────────────────
const VACINAS=[
  {id:'v_paramixo',   nome:'Paramixovirose', icon:'💉', custo:8,  validade:280, protege:'paramixo',    obrig:true},
  {id:'v_variola',    nome:'Varíola',        icon:'💉', custo:6,  validade:280, protege:'variola',     obrig:false},
  {id:'v_salmonelose',nome:'Salmonelose',    icon:'💉', custo:7,  validade:180, protege:'salmonelose', obrig:false},
]

const GRAV_COR={ligeira:T.blue,media:T.orange,grave:T.danger}

// ── Helpers financeiros (compatível com VLFinancas) ─────────
function debitar(c,valor,desc){
  if(typeof c.orcamento==='number') c.orcamento-=valor
  else if(typeof c.orc==='number') c.orc-=valor
  else if(typeof c.saldo==='number') c.saldo-=valor
  c.movimentos=[...(c.movimentos||[]),{tipo:'saude',descricao:desc,valor:-valor,semana:c.semana||1}]
}
function saldoDe(c){
  if(typeof c.orcamento==='number') return c.orcamento
  if(typeof c.orc==='number') return c.orc
  if(typeof c.saldo==='number') return c.saldo
  return (c.movimentos||[]).reduce((a,m)=>a+(m.valor||0),0)
}
function temStaff(c,funcao){
  const s=c.staff
  if(!s) return false
  if(Array.isArray(s)) return s.some(x=>(x.funcao||x.role||'').toLowerCase().includes(funcao))
  return !!s[funcao]
}
function estadoPombo(p){return p.saude?.estado||p.estado||'apto'}

export default function VLSaude(){
  const [c,setC]=useState(()=>lerLS())
  const [tab,setTab]=useState('hospital')
  const [msg,setMsg]=useState('')
  const [selVacina,setSelVacina]=useState(VACINAS[0].id)

  const dia=c?.dia||1
  const temVet=c?temStaff(c,'veterin'):false
  const pombos=c?.pombos||[]

  function salvar(nc){gravarLS(nc);setC({...nc})}
  function flash(t){setMsg(t);setTimeout(()=>setMsg(''),2500)}

  // Auto-processamento ao abrir: atribuir doença a doentes sem diagnóstico + curar recuperados
  useEffect(()=>{
    if(!c) return
    let mudou=false
    const nc={...c,pombos:(c.pombos||[]).map(p=>{
      const est=estadoPombo(p)
      let np={...p}
      if((est==='doente'||est==='lesionado')&&!np.saude?.doenca){
        const d=est==='lesionado'?LESAO:DOENCAS[Math.floor(Math.random()*DOENCAS.length)]
        np.saude={...(np.saude||{}),estado:est,doenca:d.id,diaInicio:dia,diaFim:null}
        mudou=true
      }
      if(np.saude?.diaFim&&dia>=np.saude.diaFim){
        np.saude={...np.saude,estado:'apto',doenca:null,diaFim:null}
        np.estado='apto'
        np.historialSaude=[...(np.historialSaude||[]),{tipo:'cura',dia,desc:'Recuperação completa'}]
        mudou=true
      }
      return np
    })}
    if(mudou) salvar(nc)
  },[]) // eslint-disable-line

  if(!c) return <div style={{padding:40,color:T.muted,textAlign:'center'}}>Sem carreira activa.</div>

  const doentes=pombos.filter(p=>['doente','lesionado','recuperacao'].includes(estadoPombo(p)))
  const aptos=pombos.filter(p=>estadoPombo(p)==='apto')
  const saldo=saldoDe(c)

  // Cobertura vacinal + risco sanitário
  const cobertura=pombos.length?Math.round(pombos.filter(p=>{
    const v=p.saude?.vacinas||{}
    return VACINAS.filter(x=>x.obrig).every(x=>v[x.id]&&v[x.id]>dia)
  }).length/pombos.length*100):0
  const risco=Math.min(100,Math.max(0,Math.round((100-cobertura)*0.5+doentes.length/Math.max(1,pombos.length)*100*0.5)))
  const riscoCor=risco<=25?T.success:risco<=55?T.orange:T.danger
  const riscoTxt=risco<=25?'Baixo':risco<=55?'Moderado':'Elevado'

  function infoDoenca(id){return id==='lesao'?LESAO:DOENCAS.find(d=>d.id===id)||DOENCAS[0]}

  // ── Acções ────────────────────────────────────────────────
  function tratar(pomboId){
    const nc={...c}
    nc.pombos=nc.pombos.map(p=>{
      if(p.id!==pomboId) return p
      const d=infoDoenca(p.saude?.doenca)
      let custo=d.custo, dur=d.dur
      if(temVet){custo=Math.round(custo*0.8);dur=Math.ceil(dur/2)}
      if(saldoDe(nc)<custo){flash('⚠️ Saldo insuficiente ('+custo+'€)');return p}
      debitar(nc,custo,'Tratamento '+d.nome+' — '+(p.nome||'pombo'))
      nc.saudeHistorial=[...(nc.saudeHistorial||[]),{tipo:'tratamento',dia,pombo:p.nome,doenca:d.nome,custo}]
      return {...p,saude:{...(p.saude||{}),estado:'recuperacao',diaFim:dia+dur},estado:'recuperacao',
        historialSaude:[...(p.historialSaude||[]),{tipo:'tratamento',dia,desc:d.nome+' — tratado ('+custo+'€, '+dur+' dias)'}]}
    })
    salvar(nc)
  }
  function vacinar(pomboIds){
    const vac=VACINAS.find(v=>v.id===selVacina)
    const alvo=pomboIds.filter(id=>{
      const p=pombos.find(x=>x.id===id)
      return p&&(!(p.saude?.vacinas?.[vac.id])||p.saude.vacinas[vac.id]<=dia)
    })
    if(!alvo.length){flash('Todos já vacinados ✓');return}
    const total=vac.custo*alvo.length
    if(saldo<total){flash('⚠️ Saldo insuficiente ('+total+'€)');return}
    const nc={...c}
    debitar(nc,total,'Vacina '+vac.nome+' × '+alvo.length)
    nc.pombos=nc.pombos.map(p=>alvo.includes(p.id)?{...p,saude:{...(p.saude||{}),estado:estadoPombo(p),vacinas:{...(p.saude?.vacinas||{}),[vac.id]:dia+vac.validade}}}:p)
    nc.saudeHistorial=[...(nc.saudeHistorial||[]),{tipo:'vacina',dia,vacina:vac.nome,n:alvo.length,custo:total}]
    salvar(nc);flash('✓ '+alvo.length+' pombo(s) vacinado(s) — '+total+'€')
  }
  function checkup(){
    const custo=temVet?30:50
    if(saldo<custo){flash('⚠️ Saldo insuficiente ('+custo+'€)');return}
    const nc={...c}
    debitar(nc,custo,'Checkup geral do plantel')
    // 15% de chance de detectar doença incipiente num pombo apto (tratamento precoce = metade do custo/tempo)
    let achado=null
    if(aptos.length&&Math.random()<0.15){
      const p=aptos[Math.floor(Math.random()*aptos.length)]
      const d=DOENCAS[Math.floor(Math.random()*DOENCAS.length)]
      nc.pombos=nc.pombos.map(x=>x.id===p.id?{...x,estado:'doente',saude:{...(x.saude||{}),estado:'doente',doenca:d.id,diaInicio:dia,precoce:true}}:x)
      achado=p.nome+' — '+d.nome+' (fase inicial)'
    }
    nc.saudeHistorial=[...(nc.saudeHistorial||[]),{tipo:'checkup',dia,custo,achado}]
    salvar(nc);flash(achado?'🔍 Detectado: '+achado:'✓ Checkup completo — plantel saudável')
  }

  // ── UI ────────────────────────────────────────────────────
  const TABS=[['hospital','🏥 Hospital'],['vacinas','💉 Vacinação'],['enciclo','📖 Doenças'],['hist','📜 Historial']]
  const KPI=({label,valor,cor})=>(
    <div style={{position:'relative',background:T.surface,borderRadius:12,padding:'12px 14px',flex:1,minWidth:100,overflow:'hidden'}}>
      <GL/><div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:.5}}>{label}</div>
      <div style={{fontSize:20,fontWeight:900,color:cor||T.text,marginTop:2}}>{valor}</div>
    </div>)

  return (
    <div style={{padding:16,background:T.bg,minHeight:'100vh',color:T.text}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={{fontSize:26}}>🏥</div>
        <div>
          <div style={{fontSize:19,fontWeight:900}}>Saúde & Veterinário</div>
          <div style={{fontSize:11,color:T.muted}}>{temVet?'Veterinário activo — custos -20%, recuperação 2× mais rápida':'Sem veterinário — contrata um no Staff'}</div>
        </div>
      </div>
      {msg&&<div style={{background:T.s2,border:'1px solid '+T.gold,borderRadius:10,padding:'8px 12px',fontSize:12,marginBottom:12}}>{msg}</div>}

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <KPI label="Risco sanitário" valor={riscoTxt} cor={riscoCor}/>
        <KPI label="Em tratamento" valor={doentes.length} cor={doentes.length?T.orange:T.success}/>
        <KPI label="Cobertura vacinal" valor={cobertura+'%'} cor={cobertura>=80?T.success:cobertura>=50?T.orange:T.danger}/>
        <KPI label="Saldo" valor={Math.round(saldo).toLocaleString()+'€'} cor={saldo>=0?T.text:T.danger}/>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{background:tab===id?T.gold:T.surface,color:tab===id?'#050A14':T.muted,border:'none',borderRadius:8,padding:'8px 12px',fontSize:12,fontWeight:700,cursor:'pointer'}}>{label}</button>
        ))}
      </div>

      {tab==='hospital'&&(
        <div>
          <button onClick={checkup} style={{width:'100%',background:T.s2,color:T.blue,border:'1px dashed '+T.blue,borderRadius:10,padding:'10px',fontSize:12,fontWeight:700,cursor:'pointer',marginBottom:12}}>
            🔍 Checkup geral ({temVet?30:50}€) — pode detectar doenças em fase inicial
          </button>
          {doentes.length===0?(
            <div style={{textAlign:'center',padding:'40px 20px',color:T.muted}}>
              <div style={{fontSize:40,marginBottom:8}}>✨</div>
              <div style={{fontSize:14,fontWeight:700,color:T.success}}>Plantel 100% saudável</div>
              <div style={{fontSize:11,marginTop:4}}>Mantém a vacinação em dia para reduzir o risco.</div>
            </div>
          ):doentes.map(p=>{
            const d=infoDoenca(p.saude?.doenca)
            const emRec=estadoPombo(p)==='recuperacao'
            const diasRest=p.saude?.diaFim?Math.max(0,p.saude.diaFim-dia):null
            let custo=d.custo,dur=d.dur
            if(temVet){custo=Math.round(custo*0.8);dur=Math.ceil(dur/2)}
            if(p.saude?.precoce){custo=Math.round(custo/2);dur=Math.ceil(dur/2)}
            return (
              <div key={p.id} style={{position:'relative',background:T.surface,borderRadius:12,padding:14,marginBottom:10,overflow:'hidden'}}>
                <GL/>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{fontSize:24}}>{d.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:800}}>{p.nome||'Pombo'} <span style={{fontSize:10,fontWeight:700,color:GRAV_COR[d.grav],marginLeft:6,textTransform:'uppercase'}}>{d.grav}</span></div>
                    <div style={{fontSize:11,color:T.muted}}>{d.nome}{p.saude?.precoce?' · fase inicial':''} · {d.sintomas}</div>
                  </div>
                </div>
                {emRec?(
                  <div style={{marginTop:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:T.muted,marginBottom:4}}>
                      <span>💊 Em recuperação</span><span style={{color:T.blue,fontWeight:700}}>{diasRest} dia(s) restante(s)</span>
                    </div>
                    <div style={{height:6,background:T.s2,borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:Math.round((1-diasRest/Math.max(1,(p.saude.diaFim-p.saude.diaInicio)||dur))*100)+'%',background:'linear-gradient(90deg,#4FC3F7,#2DD4A7)'}}/>
                    </div>
                  </div>
                ):(
                  <button onClick={()=>tratar(p.id)} style={{marginTop:10,width:'100%',background:T.gold,color:'#050A14',border:'none',borderRadius:8,padding:'9px',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                    💊 Tratar — {custo}€ · {dur} dias{temVet?' (vet ✓)':''}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab==='vacinas'&&(
        <div>
          <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
            {VACINAS.map(v=>(
              <button key={v.id} onClick={()=>setSelVacina(v.id)} style={{flex:1,minWidth:110,background:selVacina===v.id?T.s2:T.surface,border:'1px solid '+(selVacina===v.id?T.gold:'transparent'),borderRadius:10,padding:'10px 8px',cursor:'pointer',color:T.text}}>
                <div style={{fontSize:12,fontWeight:800}}>{v.icon} {v.nome}</div>
                <div style={{fontSize:10,color:T.muted,marginTop:2}}>{v.custo}€/pombo · {Math.round(v.validade/7)} sem.{v.obrig?' · obrigatória':''}</div>
              </button>
            ))}
          </div>
          <button onClick={()=>vacinar(pombos.map(p=>p.id))} style={{width:'100%',background:T.gold,color:'#050A14',border:'none',borderRadius:10,padding:'11px',fontSize:13,fontWeight:800,cursor:'pointer',marginBottom:12}}>
            💉 Vacinar todo o plantel (só os em falta)
          </button>
          {pombos.map(p=>{
            const vac=VACINAS.find(v=>v.id===selVacina)
            const exp=p.saude?.vacinas?.[vac.id]
            const valida=exp&&exp>dia
            return (
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,background:T.surface,borderRadius:10,padding:'10px 12px',marginBottom:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700}}>{p.nome||'Pombo'}</div>
                  <div style={{fontSize:10,color:valida?T.success:T.muted}}>
                    {valida?'✓ Protegido — expira no dia '+exp:'✗ Sem protecção activa'}
                  </div>
                </div>
                {!valida&&<button onClick={()=>vacinar([p.id])} style={{background:T.s2,color:T.gold,border:'1px solid '+T.gold,borderRadius:8,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>{vac.custo}€</button>}
              </div>
            )
          })}
        </div>
      )}

      {tab==='enciclo'&&(
        <div>
          {[...DOENCAS,LESAO].map(d=>(
            <div key={d.id} style={{position:'relative',background:T.surface,borderRadius:12,padding:14,marginBottom:10,overflow:'hidden'}}>
              <GL/>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontSize:20}}>{d.icon}</span>
                <span style={{fontSize:14,fontWeight:800,flex:1}}>{d.nome}</span>
                <span style={{fontSize:10,fontWeight:700,color:GRAV_COR[d.grav],textTransform:'uppercase'}}>{d.grav}</span>
              </div>
              <div style={{fontSize:11,color:T.muted,lineHeight:1.5}}>
                <div><b style={{color:T.text}}>Sintomas:</b> {d.sintomas}</div>
                <div><b style={{color:T.text}}>Prevenção:</b> {d.prev}</div>
                <div><b style={{color:T.text}}>Tratamento:</b> {d.custo}€ · {d.dur} dias (metade com veterinário)</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='hist'&&(
        <div>
          {!(c.saudeHistorial||[]).length?(
            <div style={{textAlign:'center',padding:'40px 20px',color:T.muted,fontSize:12}}>Sem registos ainda.</div>
          ):[...c.saudeHistorial].reverse().map((h,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:T.surface,borderRadius:10,padding:'10px 12px',marginBottom:6}}>
              <div style={{fontSize:18}}>{h.tipo==='vacina'?'💉':h.tipo==='tratamento'?'💊':h.tipo==='checkup'?'🔍':'✨'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700}}>
                  {h.tipo==='vacina'?'Vacina '+h.vacina+' × '+h.n:
                   h.tipo==='tratamento'?'Tratamento '+h.doenca+' — '+h.pombo:
                   h.tipo==='checkup'?'Checkup geral'+(h.achado?' · '+h.achado:''):h.desc}
                </div>
                <div style={{fontSize:10,color:T.muted}}>Dia {h.dia}</div>
              </div>
              {h.custo&&<div style={{fontSize:12,fontWeight:700,color:T.danger}}>-{h.custo}€</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
