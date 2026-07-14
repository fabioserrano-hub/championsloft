import { useState, useEffect, useCallback } from 'react'
import { supabase, db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'
import { useToast, Spinner, EmptyState } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { BotaoWhatsApp } from '../components/Partilha'

const ESPECIALIDADES = [
  { id:'todas',       icon:'🌐', label:'Todas' },
  { id:'velocidade',  icon:'⚡', label:'Velocidade' },
  { id:'meio_fundo',  icon:'🏃', label:'Meio-Fundo' },
  { id:'fundo',       icon:'🏔️', label:'Fundo' },
  { id:'grande_fundo',icon:'🌍', label:'Grande Fundo' },
]

const EMBLEMAS = ['🕊️','🦅','🔥','⚡','🏆','👑','🎯','💎','🌟','🦁','🐉','⚔️','🛡️','🌊','🏔️','🌍']
const FORM_INICIAL = { nome:'', descricao:'', emblema:'🕊️', especialidade:'todas', regiao:'', pais:'PT', acesso:'codigo', max_membros:50 }

// ─── DETALHE DO CLUBE ─────────────────────────────────────────────────────────
// ── temPro e nav passados como props ─────────────────────────────────────────
function DetalheClubePersonalizado({ clube, user, onVoltar, toast, temPro, nav }) {
  const { t } = useIdioma()
  const [membros, setMembros]         = useState([])
  const [ranking, setRanking]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('ranking')
  const [confirmSair, setConfirmSair] = useState(false)
  const [resultados, setResultados]   = useState([])
  const [modalResultado, setModalResultado] = useState(false)
  const [modalCSV, setModalCSV]             = useState(false)
  const [csvLoading, setCsvLoading]         = useState(false)
  const [csvPreview, setCsvPreview]         = useState(null)
  const [csvResultado, setCsvResultado]     = useState({ nome_prova:'', data_prova:'', distancia:'', tipo:'velocidade', local_largada:'' })
  const [resultadoSel, setResultadoSel]     = useState(null)
  const [formRes, setFormRes]         = useState({ nome_prova:'', data_prova:'', distancia:'', tipo:'velocidade', local_largada:'', total_pombos:'', notas:'' })
  const [linhasMembros, setLinhasMembros] = useState([{ membro_nome:'', posicao:'', percentil:'', velocidade:'' }])
  const [savingRes, setSavingRes]     = useState(false)

  useEffect(() => {
    supabase.from('clube_membros').select('*').eq('clube_id', clube.id)
      .then(async ({ data: m }) => {
        const membrosData = m || []
        setMembros(membrosData)

        const rankingData = await Promise.all(membrosData.map(async membro => {
          const { data: provas } = await supabase
            .from('races').select('percentil,posicao_geral,tipo,dist')
            .eq('user_id', membro.user_id).not('percentil','is',null)
            .order('percentil',{ascending:false}).limit(20)
          const p = provas || []
          const mediaPercentil = p.length ? Math.round(p.reduce((s,x)=>s+(x.percentil||0),0)/p.length) : 0
          const vitorias = p.filter(x=>x.posicao_geral===1).length
          return { ...membro, mediaPercentil, vitorias, nProvas:p.length }
        }))
        setRanking(rankingData.sort((a,b)=>b.mediaPercentil-a.mediaPercentil))
      }).finally(()=>setLoading(false))
  }, [clube.id])

  const carregarResultados = useCallback(async () => {
    const { data } = await supabase.from('clube_resultados')
      .select('*, clube_resultados_membros(*)')
      .eq('clube_id', clube.id).order('data_prova', { ascending: false })
    setResultados(data || [])
  }, [clube.id])

  useEffect(() => { carregarResultados() }, [carregarResultados])

  const parsearCSV = (texto) => {
    const linhas = texto.trim().split('\n').map(l => l.trim()).filter(l => l)
    if (!linhas.length) return []
    // Detectar separador (vírgula, ponto-e-vírgula ou tab)
    const sep = linhas[0].includes(';') ? ';' : linhas[0].includes('\t') ? '\t' : ','
    const headers = linhas[0].split(sep).map(h => h.trim().toLowerCase()
      .replace(/[áàâã]/g,'a').replace(/[éèê]/g,'e').replace(/[íì]/g,'i')
      .replace(/[óòôõ]/g,'o').replace(/[úù]/g,'u').replace(/[ç]/g,'c')
      .replace(/[^a-z0-9]/g,'_'))

    return linhas.slice(1).map(linha => {
      const vals = linha.split(sep).map(v => v.trim().replace(/^"|"$/g,''))
      const obj = {}
      headers.forEach((h, i) => { obj[h] = vals[i] || '' })
      return obj
    }).filter(r => Object.values(r).some(v => v))
  }

  const processarCSV = async (file) => {
    setCsvLoading(true)
    try {
      const texto = await file.text()
      const linhas = parsearCSV(texto)
      if (!linhas.length) { toast('CSV vazio ou formato inválido','warn'); return }

      // Tentar detectar colunas automaticamente
      const primeira = linhas[0]
      const chaves = Object.keys(primeira)

      // Mapear colunas comuns
      const colAnilha = chaves.find(k => k.includes('anil') || k.includes('pombo') || k.includes('ring'))
      const colNome = chaves.find(k => k.includes('nome') || k.includes('conc') || k.includes('socio') || k.includes('criador'))
      const colClass = chaves.find(k => k.includes('class') || k.includes('pos') || k.includes('lugar'))
      const colMedia = chaves.find(k => k.includes('media') || k.includes('veloc') || k.includes('mpm'))
      const colPontos = chaves.find(k => k.includes('pont'))
      const colChegada = chaves.find(k => k.includes('chegad') || k.includes('hora'))

      const preview = linhas.slice(0,5).map(r => ({
        anilha: r[colAnilha] || '?',
        nome: r[colNome] || '?',
        posicao: r[colClass] || '?',
        velocidade: r[colMedia] || '?',
        pontos: r[colPontos] || '?',
        _raw: r
      }))

      setCsvPreview({ linhas, preview, colAnilha, colNome, colClass, colMedia, colPontos, colChegada, total: linhas.length })
    } catch(e) { toast('Erro ao ler CSV: '+e.message,'err') }
    finally { setCsvLoading(false) }
  }

  const importarCSV = async () => {
    if (!csvPreview || !csvResultado.nome_prova.trim()) { toast('Nome da prova obrigatório','warn'); return }
    setCsvLoading(true)
    try {
      const { colAnilha, colNome, colClass, colMedia, colPontos, linhas } = csvPreview

      // Criar o resultado do clube
      const { data: res, error } = await supabase.from('clube_resultados').insert({
        clube_id: clube.id, user_id: user.id,
        nome_prova: csvResultado.nome_prova,
        data_prova: csvResultado.data_prova || null,
        distancia: csvResultado.distancia ? parseInt(csvResultado.distancia) : null,
        tipo: csvResultado.tipo,
        local_largada: csvResultado.local_largada,
        total_pombos: linhas.length
      }).select().single()
      if (error) throw error

      // Inserir resultados dos membros
      const membrosData = linhas.map(r => ({
        resultado_id: res.id,
        membro_nome: r[colNome] || 'Desconhecido',
        anilha: r[colAnilha] || null,
        posicao: r[colClass] ? parseInt(r[colClass]) : null,
        percentil: null, // calculado depois
        velocidade: r[colMedia] ? parseFloat(r[colMedia].replace(',','.')) : null,
      }))

      // Inserir em batches de 50
      for (let i = 0; i < membrosData.length; i += 50) {
        await supabase.from('clube_resultados_membros').insert(membrosData.slice(i, i+50))
      }

      // Cruzar anilhas com pombos da Fly2Win e criar provas automaticamente
      let cruzados = 0
      const { data: todosPombos } = await supabase.from('pigeons').select('id,anilha,user_id')
      if (todosPombos?.length) {
        for (const linha of linhas) {
          const anilhaCSV = (r[colAnilha] || '').trim().toUpperCase()
          if (!anilhaCSV) continue
          // Tentar match por anilha (formato flexível)
          const pombo = todosPombos.find(p => {
            const a = (p.anilha || '').trim().toUpperCase()
            return a === anilhaCSV || a.includes(anilhaCSV) || anilhaCSV.includes(a.replace(/[^0-9]/g,'').slice(-6))
          })
          if (pombo) {
            const totalProva = linhas.length
            const posicao = linha[colClass] ? parseInt(linha[colClass]) : null
            const percentil = posicao && totalProva ? Math.round((1 - (posicao-1)/totalProva)*100*10)/10 : null
            await supabase.from('races').insert({
              user_id: pombo.user_id, pombo_id: pombo.id,
              nome: csvResultado.nome_prova,
              data_reg: csvResultado.data_prova || new Date().toISOString().split('T')[0],
              dist: csvResultado.distancia ? parseFloat(csvResultado.distancia) : null,
              tipo: csvResultado.tipo,
              local_solta: csvResultado.local_largada,
              posicao_geral: posicao,
              n_pombos: totalProva,
              percentil, velocidade: linha[colMedia] ? parseFloat(linha[colMedia].replace(',','.')) : null,
              fonte: 'import_csv'
            }).catch(()=>{})
            cruzados++
          }
        }
      }

      toast(`✓ ${linhas.length} resultados importados · ${cruzados} pombos cruzados automaticamente`, 'ok')
      setModalCSV(false); setCsvPreview(null)
      setCsvResultado({ nome_prova:'', data_prova:'', distancia:'', tipo:'velocidade', local_largada:'' })
      carregarResultados()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setCsvLoading(false) }
  }

  const guardarResultado = async () => {
    if (!formRes.nome_prova.trim()) return toast('Nome da prova obrigatório','warn')
    setSavingRes(true)
    try {
      const { data: res, error } = await supabase.from('clube_resultados').insert({
        clube_id: clube.id, user_id: user.id,
        nome_prova: formRes.nome_prova, data_prova: formRes.data_prova || null,
        distancia: formRes.distancia ? parseInt(formRes.distancia) : null,
        tipo: formRes.tipo, local_largada: formRes.local_largada,
        total_pombos: formRes.total_pombos ? parseInt(formRes.total_pombos) : null,
        notas: formRes.notas
      }).select().single()
      if (error) throw error
      // Guardar resultados dos membros
      const linhasValidas = linhasMembros.filter(l => l.membro_nome.trim())
      if (linhasValidas.length > 0) {
        await supabase.from('clube_resultados_membros').insert(
          linhasValidas.map(l => ({
            resultado_id: res.id,
            membro_nome: l.membro_nome,
            posicao: l.posicao ? parseInt(l.posicao) : null,
            percentil: l.percentil ? parseFloat(l.percentil) : null,
            velocidade: l.velocidade ? parseFloat(l.velocidade) : null,
          }))
        )
      }
      toast('Resultado registado!', 'ok')
      setModalResultado(false)
      setFormRes({ nome_prova:'', data_prova:'', distancia:'', tipo:'velocidade', local_largada:'', total_pombos:'', notas:'' })
      setLinhasMembros([{ membro_nome:'', posicao:'', percentil:'', velocidade:'' }])
      carregarResultados()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSavingRes(false) }
  }

  const apagarResultado = async (id) => {
    await supabase.from('clube_resultados').delete().eq('id', id)
    setResultados(r => r.filter(x => x.id !== id))
    toast('Apagado','ok')
  }

  // verificar plano — com props correctas
  if (!temPro) return <BloqueioPlano plano="pro" nav={nav} />

  const euMembro  = membros.find(m=>m.user_id===user?.id)
  const euAdmin   = clube.creator_id===user?.id || euMembro?.role==='admin'
  const minhaPos  = ranking.findIndex(m=>m.user_id===user?.id)+1
  const mediaClube = ranking.length ? Math.round(ranking.reduce((s,m)=>s+m.mediaPercentil,0)/ranking.length) : 0
  const totalVitorias = ranking.reduce((s,m)=>s+m.vitorias,0)
  const linkConvite = `Junta-te ao clube "${clube.nome}" no Fly2Win!\nCódigo: *${clube.invite_code}*\n🔗 ${window.location.origin}`

  return (
    <div>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#050D1A,#0B1830)',border:'1px solid rgba(76,141,255,.2)',borderRadius:14,padding:'14px 16px',marginBottom:14,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#4C8DFF,#2DD4A7,#D4AF37)'}}/>
        <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
          <div style={{fontSize:40,lineHeight:1,flexShrink:0}}>{clube.emblema}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:900,color:'#fff',fontFamily:"'Fraunces',serif"}}>{clube.nome}</div>
            <div style={{fontSize:11,color:'#7A8699',marginTop:2}}>
              {clube.regiao&&<span>{clube.regiao} · </span>}
              {ESPECIALIDADES.find(e=>e.id===clube.especialidade)?.label}
              {euAdmin&&<span style={{color:'#D4AF37'}}> · 👑 Admin</span>}
            </div>
            {clube.descricao&&<div style={{fontSize:12,color:'#94a3b8',marginTop:4,lineHeight:1.5}}>{clube.descricao}</div>}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onVoltar}>← Voltar</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:14}}>
          {[
            [membros.length,'👥','Membros','#4C8DFF'],
            [mediaClube+'%','📊','Média clube','#D4AF37'],
            [totalVitorias,'🏆','Vitórias','#2DD4A7'],
            [minhaPos>0?minhaPos+'º':'—','🎯','A minha pos.','#A855F7'],
          ].map(([v,i,l,c])=>(
            <div key={l} style={{textAlign:'center',padding:'8px 4px',background:'rgba(255,255,255,.04)',borderRadius:8}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
              <div style={{fontSize:9,color:'#7A8699',marginTop:2}}>{i} {l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Acções */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <BotaoWhatsApp texto={linkConvite} label="Convidar"/>
        <button className="btn btn-secondary btn-sm" onClick={()=>{navigator.clipboard?.writeText(clube.invite_code);toast('Código copiado!','ok')}}>
          📋 Código: <strong style={{fontFamily:"'Space Mono',monospace",color:'#D4AF37'}}>{clube.invite_code}</strong>
        </button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:3,background:'#0A1628',borderRadius:10,padding:3,marginBottom:14}}>
        {[['ranking','🏆 Ranking'],['membros','👥 Membros'],['resultados','📋 Resultados']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ flex:'none', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:tab===k?700:500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', border:tab===k?'none':'1px solid rgba(255,255,255,.08)', background:tab===k?'linear-gradient(135deg,#1E5FD9,#1456C0)':'rgba(255,255,255,.05)', color:tab===k?'#fff':'#cbd5e1', boxShadow:tab===k?'0 2px 8px rgba(0,0,0,.3)':'none', transform:tab===k?'translateY(-1px)':'none', transition:'all .15s', minHeight:40 }}>{l}</button>
        ))}
      </div>

      {loading?<div style={{display:'flex',justifyContent:'center',padding:40}}><Spinner lg/></div>
      :tab==='ranking'?(
        ranking.length===0
          ?<EmptyState icon="🏆" title="Sem dados ainda" desc="Os membros precisam de ter provas registadas com percentil"/>
          :<div style={{display:'flex',flexDirection:'column',gap:6}}>
              <div style={{display:'grid',gridTemplateColumns:'28px 1fr 60px 50px',gap:8,padding:'4px 12px',fontSize:10,color:'#475569',fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase'}}>
                <span>#</span><span>Membro</span><span style={{textAlign:'right'}}>Percentil</span><span style={{textAlign:'center'}}>Provas</span>
              </div>
              {ranking.map((m,i)=>{
                const euSou=m.user_id===user?.id
                const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':null
                return (
                  <div key={m.id} style={{display:'grid',gridTemplateColumns:'28px 1fr 60px 50px',gap:8,alignItems:'center',padding:'12px',borderRadius:10,background:euSou?'rgba(76,141,255,.08)':'#0B1830',border:`1px solid ${euSou?'rgba(76,141,255,.35)':i<3?'rgba(212,175,55,.1)':'#1B2D52'}`}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:900,color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569',textAlign:'center'}}>{medal||i+1}</div>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:euSou?'#7CB9FF':'#fff'}}>
                        {m.nome}{euSou?' (tu)':''}
                        {m.role==='admin'&&<span style={{fontSize:9,color:'#D4AF37',marginLeft:4}}>👑</span>}
                        {m.role==='capitao'&&<span style={{fontSize:9,color:'#4C8DFF',marginLeft:4}}>©</span>}
                      </div>
                      {m.vitorias>0&&<div style={{fontSize:10,color:'#D4AF37'}}>🏆 {m.vitorias} vitória(s)</div>}
                    </div>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:900,color:m.mediaPercentil>=80?'#2DD4A7':m.mediaPercentil>=60?'#D4AF37':'#94a3b8',textAlign:'right'}}>{m.mediaPercentil}%</div>
                    <div style={{fontSize:11,color:'#475569',textAlign:'center'}}>{m.nProvas}</div>
                  </div>
                )
              })}
            </div>
      ):tab==='membros'?(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {membros.map(m=>(
            <div key={m.id} style={{display:'flex',gap:12,alignItems:'center',padding:'12px 14px',background:'#0B1830',border:'1px solid #1B2D52',borderRadius:10}}>
              <div style={{width:36,height:36,borderRadius:99,background:'rgba(76,141,255,.1)',border:'1px solid rgba(76,141,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#4C8DFF',flexShrink:0}}>
                {m.nome?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{m.nome}</div>
                <div style={{fontSize:10,color:'#475569'}}>
                  {m.role==='admin'?'👑 Admin':m.role==='capitao'?'© Capitão':'Membro'}
                  {m.user_id===user?.id&&<span style={{color:'#4C8DFF'}}> · Tu</span>}
                </div>
              </div>
              <div style={{fontSize:10,color:'#475569'}}>{new Date(m.created_at).toLocaleDateString('pt-PT')}</div>
              {euAdmin&&m.user_id!==user?.id&&(
                <button className="btn btn-secondary btn-sm" style={{fontSize:10}} onClick={async()=>{
                  await supabase.from('clube_membros').delete().eq('clube_id',clube.id).eq('user_id',m.user_id)
                  setMembros(prev=>prev.filter(x=>x.id!==m.id)); toast('Membro removido','ok')
                }}>✕</button>
              )}
            </div>
          ))}
        </div>
      ):tab==='resultados'?(
        <div>
          {euAdmin&&(
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginBottom:12}}>
              <button className="btn btn-secondary btn-sm" onClick={()=>setModalCSV(true)}>📥 Importar CSV</button>
              <button className="btn btn-primary btn-sm" onClick={()=>setModalResultado(true)}>+ Registar resultado</button>
            </div>
          )}
          {resultados.length===0
            ?<EmptyState icon="📋" title="Sem resultados" desc={euAdmin?"Regista o primeiro resultado colectivo":"O administrador ainda não registou resultados"}
                action={euAdmin&&<button className="btn btn-primary btn-sm" onClick={()=>setModalResultado(true)}>+ Registar</button>}/>
            :<div style={{display:'flex',flexDirection:'column',gap:8}}>
              {resultados.map(r=>(
                <div key={r.id} style={{background:'#0B1830',border:'1px solid #1B2D52',borderRadius:12,overflow:'hidden'}}>
                  <div style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{r.nome_prova}</div>
                      <div style={{fontSize:11,color:'#475569',marginTop:2,display:'flex',gap:8,flexWrap:'wrap'}}>
                        {r.data_prova&&<span>📅 {new Date(r.data_prova).toLocaleDateString('pt-PT')}</span>}
                        {r.distancia&&<span>📏 {r.distancia}km</span>}
                        {r.local_largada&&<span>📍 {r.local_largada}</span>}
                        {r.total_pombos&&<span>🐦 {r.total_pombos} pombos</span>}
                      </div>
                    </div>
                    {euAdmin&&<button onClick={()=>apagarResultado(r.id)} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:16,padding:'2px 6px'}}>🗑️</button>}
                  </div>
                  {r.clube_resultados_membros?.length>0&&(
                    <div style={{padding:'8px 14px'}}>
                      <div style={{display:'grid',gridTemplateColumns:'24px 1fr 55px 65px',gap:6,fontSize:10,color:'#475569',fontWeight:600,marginBottom:4,padding:'0 4px',textTransform:'uppercase'}}>
                        <span>#</span><span>Membro</span><span style={{textAlign:'right'}}>%</span><span style={{textAlign:'right'}}>Vel.</span>
                      </div>
                      {r.clube_resultados_membros.sort((a,b)=>(a.posicao||99)-(b.posicao||99)).map((m,i)=>(
                        <div key={m.id} style={{display:'grid',gridTemplateColumns:'24px 1fr 55px 65px',gap:6,alignItems:'center',padding:'6px 4px',borderTop:'1px solid rgba(255,255,255,.04)'}}>
                          <div style={{fontSize:12,fontWeight:700,color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569',textAlign:'center'}}>{m.posicao||i+1}</div>
                          <div style={{fontSize:12,color:'#fff'}}>{m.membro_nome}</div>
                          <div style={{fontSize:12,color:m.percentil>=80?'#2DD4A7':m.percentil>=60?'#D4AF37':'#94a3b8',fontWeight:700,textAlign:'right'}}>{m.percentil||'-'}%</div>
                          <div style={{fontSize:11,color:'#475569',textAlign:'right'}}>{m.velocidade?m.velocidade+'m/m':'-'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {r.notas&&<div style={{padding:'8px 14px',fontSize:11,color:'#7A8699',borderTop:'1px solid rgba(255,255,255,.04)'}}>{r.notas}</div>}
                </div>
              ))}
            </div>
          }
          {modalCSV&&(
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:100,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>{setModalCSV(false);setCsvPreview(null)}}>
              <div style={{background:'#0B1830',border:'1px solid #1B2D52',borderRadius:'16px 16px 0 0',padding:'20px 16px',width:'100%',maxWidth:600,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
                <div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:4}}>📥 Importar resultados via CSV</div>
                <div style={{fontSize:11,color:'#7A8699',marginBottom:14}}>Suporta CSV das Associações Distritais (columbofilia.net) e LoftGest. Colunas detectadas automaticamente.</div>

                {!csvPreview ? (
                  <div>
                    <div style={{border:'2px dashed #1B2D52',borderRadius:10,padding:'24px',textAlign:'center',marginBottom:14,cursor:'pointer',position:'relative'}}
                      onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor='#4C8DFF'}}
                      onDragLeave={e=>e.currentTarget.style.borderColor='#1B2D52'}
                      onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)processarCSV(f)}}>
                      <input type="file" accept=".csv,.txt" style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}} onChange={e=>{const f=e.target.files[0];if(f)processarCSV(f)}}/>
                      {csvLoading ? <Spinner/> : <>
                        <div style={{fontSize:32,marginBottom:8}}>📄</div>
                        <div style={{fontSize:13,color:'#fff',fontWeight:600}}>Arrasta o CSV aqui ou clica para seleccionar</div>
                        <div style={{fontSize:11,color:'#7A8699',marginTop:4}}>Formatos: .csv · .txt · separador vírgula, ponto-e-vírgula ou tab</div>
                      </>}
                    </div>
                    <div style={{padding:'10px 12px',background:'rgba(76,141,255,.06)',border:'1px solid rgba(76,141,255,.15)',borderRadius:8,fontSize:11,color:'#7A8699'}}>
                      <div style={{fontWeight:600,color:'#4C8DFF',marginBottom:4}}>💡 Como exportar o CSV:</div>
                      <div>• <strong style={{color:'#fff'}}>columbofilia.net</strong> — Classificações → botão "Exportar" ou copia a tabela para Excel e guarda como CSV</div>
                      <div style={{marginTop:4}}>• <strong style={{color:'#fff'}}>LoftGest</strong> — Lista de chegada → Exportar CSV</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{padding:'8px 12px',background:'rgba(45,212,167,.08)',border:'1px solid rgba(45,212,167,.2)',borderRadius:8,fontSize:12,color:'#2DD4A7',marginBottom:12}}>
                      ✓ {csvPreview.total} linhas detectadas · Colunas: {[csvPreview.colAnilha,csvPreview.colNome,csvPreview.colClass,csvPreview.colMedia].filter(Boolean).join(', ')}
                    </div>

                    <div style={{fontSize:11,color:'#7A8699',marginBottom:6,fontWeight:600}}>Pré-visualização (primeiras 5 linhas):</div>
                    <div style={{background:'#050D1A',borderRadius:8,overflow:'hidden',marginBottom:14}}>
                      <div style={{display:'grid',gridTemplateColumns:'80px 1fr 50px 60px',gap:6,padding:'6px 10px',fontSize:10,color:'#475569',fontWeight:600,textTransform:'uppercase',borderBottom:'1px solid #1B2D52'}}>
                        <span>Anilha</span><span>Nome</span><span>Pos.</span><span>m/min</span>
                      </div>
                      {csvPreview.preview.map((r,i)=>(
                        <div key={i} style={{display:'grid',gridTemplateColumns:'80px 1fr 50px 60px',gap:6,padding:'5px 10px',fontSize:11,color:'#cbd5e1',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                          <span style={{fontSize:10,color:'#7A8699'}}>{r.anilha}</span>
                          <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.nome}</span>
                          <span style={{textAlign:'center'}}>{r.posicao}</span>
                          <span style={{textAlign:'right'}}>{r.velocidade}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{fontSize:12,fontWeight:600,color:'#D4AF37',marginBottom:8}}>Dados da prova:</div>
                    <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
                      <input className="input" placeholder="Nome da prova *" value={csvResultado.nome_prova} onChange={e=>setCsvResultado(f=>({...f,nome_prova:e.target.value}))}/>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        <input className="input" type="date" value={csvResultado.data_prova} onChange={e=>setCsvResultado(f=>({...f,data_prova:e.target.value}))}/>
                        <input className="input" placeholder="Distância (km)" type="number" value={csvResultado.distancia} onChange={e=>setCsvResultado(f=>({...f,distancia:e.target.value}))}/>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        <input className="input" placeholder="Local de largada" value={csvResultado.local_largada} onChange={e=>setCsvResultado(f=>({...f,local_largada:e.target.value}))}/>
                        <select className="input" value={csvResultado.tipo} onChange={e=>setCsvResultado(f=>({...f,tipo:e.target.value}))}>
                          <option value="velocidade">Velocidade</option>
                          <option value="meio-fundo">Meio-Fundo</option>
                          <option value="fundo">Fundo</option>
                          <option value="grande-fundo">Grande Fundo</option>
                        </select>
                      </div>
                    </div>

                    <div style={{padding:'8px 12px',background:'rgba(212,175,55,.06)',border:'1px solid rgba(212,175,55,.15)',borderRadius:8,fontSize:11,color:'#D4AF37',marginBottom:14}}>
                      🔄 As anilhas serão cruzadas automaticamente com os pombos registados na Fly2Win e as provas criadas nos perfis dos membros.
                    </div>

                    <div style={{display:'flex',gap:8}}>
                      <button className="btn btn-primary" onClick={importarCSV} disabled={csvLoading||!csvResultado.nome_prova.trim()} style={{flex:1}}>
                        {csvLoading?<Spinner/>:`✓ Importar ${csvPreview.total} resultados`}
                      </button>
                      <button className="btn btn-secondary" onClick={()=>setCsvPreview(null)}>← Voltar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:100,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setModalResultado(false)}>
              <div style={{background:'#0B1830',border:'1px solid #1B2D52',borderRadius:'16px 16px 0 0',padding:'20px 16px',width:'100%',maxWidth:600,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
                <div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:14}}>📋 Registar resultado colectivo</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <input className="input" placeholder="Nome da prova *" value={formRes.nome_prova} onChange={e=>setFormRes(f=>({...f,nome_prova:e.target.value}))}/>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <input className="input" type="date" value={formRes.data_prova} onChange={e=>setFormRes(f=>({...f,data_prova:e.target.value}))}/>
                    <input className="input" placeholder="Distância (km)" type="number" value={formRes.distancia} onChange={e=>setFormRes(f=>({...f,distancia:e.target.value}))}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <input className="input" placeholder="Local de largada" value={formRes.local_largada} onChange={e=>setFormRes(f=>({...f,local_largada:e.target.value}))}/>
                    <input className="input" placeholder="Total pombos" type="number" value={formRes.total_pombos} onChange={e=>setFormRes(f=>({...f,total_pombos:e.target.value}))}/>
                  </div>
                  <textarea className="input" placeholder="Notas (opcional)" value={formRes.notas} onChange={e=>setFormRes(f=>({...f,notas:e.target.value}))} rows={2} style={{resize:'none'}}/>
                  <div style={{fontSize:12,fontWeight:600,color:'#D4AF37',marginTop:4}}>Resultados dos membros:</div>
                  {linhasMembros.map((l,i)=>(
                    <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 50px 55px 65px 28px',gap:6,alignItems:'center'}}>
                      <input className="input" placeholder="Nome" value={l.membro_nome} onChange={e=>{const a=[...linhasMembros];a[i]={...a[i],membro_nome:e.target.value};setLinhasMembros(a)}} style={{fontSize:11}}/>
                      <input className="input" placeholder="Pos." type="number" value={l.posicao} onChange={e=>{const a=[...linhasMembros];a[i]={...a[i],posicao:e.target.value};setLinhasMembros(a)}} style={{fontSize:11}}/>
                      <input className="input" placeholder="%" type="number" value={l.percentil} onChange={e=>{const a=[...linhasMembros];a[i]={...a[i],percentil:e.target.value};setLinhasMembros(a)}} style={{fontSize:11}}/>
                      <input className="input" placeholder="m/min" type="number" value={l.velocidade} onChange={e=>{const a=[...linhasMembros];a[i]={...a[i],velocidade:e.target.value};setLinhasMembros(a)}} style={{fontSize:11}}/>
                      {linhasMembros.length>1&&<button onClick={()=>setLinhasMembros(m=>m.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',fontSize:14}}>✕</button>}
                    </div>
                  ))}
                  <button onClick={()=>setLinhasMembros(m=>[...m,{membro_nome:'',posicao:'',percentil:'',velocidade:''}])} style={{fontSize:11,color:'#4C8DFF',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>+ Adicionar membro</button>
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    <button className="btn btn-primary" onClick={guardarResultado} disabled={savingRes} style={{flex:1}}>{savingRes?<Spinner/>:'✓ Guardar'}</button>
                    <button className="btn btn-secondary" onClick={()=>setModalResultado(false)}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ): <></>}

      {!euAdmin&&euMembro&&(
        <div style={{textAlign:'center',marginTop:20}}>
          {!confirmSair
            ?<button className="btn btn-secondary btn-sm" onClick={()=>setConfirmSair(true)}>Sair do clube</button>
            :<div style={{display:'flex',gap:8,justifyContent:'center'}}>
                <button className="btn btn-secondary btn-sm" onClick={()=>setConfirmSair(false)}>Cancelar</button>
                <button className="btn btn-danger btn-sm" onClick={async()=>{
                  await supabase.from('clube_membros').delete().eq('clube_id',clube.id).eq('user_id',user.id)
                  toast('Saiu do clube','ok'); onVoltar()
                }}>Confirmar saída</button>
              </div>
          }
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function ClubesPersonalizados({ nav }) {
  const { user }  = useAuth()
  const toast     = useToast()
  const { t }     = useIdioma()
  const { temBase, temPro, temElite } = useLicenca()

  const [clubes, setClubes]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [clubeAberto, setClubeAberto] = useState(null)
  const [modal, setModal]             = useState(null)
  const [form, setForm]               = useState(FORM_INICIAL)
  const [saving, setSaving]           = useState(false)
  const [codigoEntrar, setCodigoEntrar] = useState('')
  const [nomeEntrar, setNomeEntrar]   = useState('')
  const [tab, setTab]                 = useState('meus')
  const [clubesPublicos, setClubesPublicos] = useState([])
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{data:memberships},{data:publicos}] = await Promise.all([
        supabase.from('clube_membros').select('*, clubes_personalizados(*)').eq('user_id',user?.id),
        supabase.from('clubes_personalizados').select('*, clube_membros(count)').eq('acesso','publico').eq('estado','ativo').limit(20),
      ])
      const meusClubes=(memberships||[]).map(m=>({...m.clubes_personalizados,meu_role:m.role})).filter(Boolean)
      setClubes(meusClubes); setClubesPublicos(publicos||[])
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setLoading(false)}
  },[user?.id])
  useEffect(()=>{load()},[load])

  const criar = async () => {
    if(!form.nome.trim()){toast('Nome obrigatório','warn');return}
    setSaving(true)
    try {
      const invite_code=Math.random().toString(36).slice(2,8).toUpperCase()
      const{data,error}=await supabase.from('clubes_personalizados').insert({...form,creator_id:user?.id,invite_code,max_membros:parseInt(form.max_membros)||50}).select().single()
      if(error) throw error
      await supabase.from('clube_membros').insert({clube_id:data.id,user_id:user?.id,nome:user?.user_metadata?.nome||'Admin',role:'admin'})
      toast(`Clube "${data.nome}" criado! Código: ${data.invite_code}`,'ok')
      setModal(null); setForm(FORM_INICIAL); load()
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setSaving(false)}
  }

  const entrarPorCodigo = async () => {
    if(!codigoEntrar.trim()||!nomeEntrar.trim()){toast('Preenche código e nome','warn');return}
    setSaving(true)
    try {
      const{data:clube}=await supabase.from('clubes_personalizados').select('*').eq('invite_code',codigoEntrar.toUpperCase()).maybeSingle()
      if(!clube){toast('Código inválido','err');return}
      await supabase.from('clube_membros').insert({clube_id:clube.id,user_id:user?.id,nome:nomeEntrar.trim(),role:'membro'})
      toast(`Bem-vindo ao clube "${clube.nome}"!`,'ok')
      setModal(null); setCodigoEntrar(''); setNomeEntrar(''); load()
    } catch(e){toast(e.message?.includes('23505')?'Já és membro deste clube':'Erro: '+e.message,'err')}
    finally{setSaving(false)}
  }

  const entrarPublico = async (clube) => {
    try {
      await supabase.from('clube_membros').insert({clube_id:clube.id,user_id:user?.id,nome:user?.user_metadata?.nome||'Membro',role:'membro'})
      toast(`Entraste no clube "${clube.nome}"!`,'ok'); load()
    } catch(e){toast(e.message?.includes('23505')?'Já és membro':'Erro: '+e.message,'err')}
  }

  // ── passar temPro e nav para o detalhe ───────────────────────────────────
  if (clubeAberto) return (
    <DetalheClubePersonalizado
      clube={clubeAberto} user={user}
      onVoltar={()=>{setClubeAberto(null);load()}}
      toast={toast} temPro={temPro} nav={nav}
    />
  )

  const meusClubeIds = new Set(clubes.map(c=>c.id))

  return (
    <div>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#050D1A,#0B1830)',border:'1px solid rgba(212,175,55,.2)',borderRadius:14,padding:'14px 16px',marginBottom:14,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#D4AF37,#A855F7,#4C8DFF)'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff',fontFamily:"'Fraunces',serif"}}>🎽 Clubes & Equipes</div>
            <div style={{fontSize:11,color:'#7A8699',marginTop:2}}>{clubes.length} clube(s) · compete com columbófilos de todo o lado</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setModal('entrar')}>🔑 Entrar</button>
            <button className="btn btn-primary btn-sm" onClick={()=>temPro?setModal('criar'):nav('precos')}>{temPro?'+ Criar':'🔒 Pro'}</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:3,background:'#0A1628',borderRadius:10,padding:3,marginBottom:14}}>
        {[['meus','🎽 Os meus'],['publicos','🌐 Públicos']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'8px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:'none',fontFamily:'inherit',background:tab===k?'linear-gradient(135deg,#D4AF37,#B8960C)':'none',color:tab===k?'#050D1A':'#475569'}}>{l}</button>
        ))}
      </div>

      {loading?<div style={{display:'flex',justifyContent:'center',padding:60}}><Spinner lg/></div>
      :tab==='meus'?(
        clubes.length===0
          ?<EmptyState icon="🎽" title="Sem clubes" desc="Cria um clube ou entra por código de convite"
              action={<div style={{display:'flex',gap:8,justifyContent:'center'}}>
                <button className="btn btn-secondary" onClick={()=>setModal('entrar')}>🔑 Entrar por Código</button>
                <button className="btn btn-primary" onClick={()=>setModal('criar')}>+ Criar Clube</button>
              </div>}/>
          :<div style={{display:'flex',flexDirection:'column',gap:8}}>
              {clubes.map(c=>(
                <div key={c.id} className="card card-p" style={{cursor:'pointer',borderLeft:`3px solid ${c.meu_role==='admin'?'#D4AF37':'#4C8DFF'}`}} onClick={()=>setClubeAberto(c)}>
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <div style={{fontSize:28,flexShrink:0}}>{c.emblema}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{c.nome} {c.meu_role==='admin'&&'👑'}</div>
                      <div style={{fontSize:11,color:'#7A8699'}}>
                        {c.regiao&&<span>{c.regiao} · </span>}
                        {ESPECIALIDADES.find(e=>e.id===c.especialidade)?.label}
                        <span style={{fontFamily:"'Space Mono',monospace",color:'#475569',marginLeft:6}}>{c.invite_code}</span>
                      </div>
                    </div>
                    <span style={{color:'#475569'}}>→</span>
                  </div>
                </div>
              ))}
            </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {clubesPublicos.filter(c=>!meusClubeIds.has(c.id)).length===0
            ?<EmptyState icon="🌐" title="Sem clubes públicos" desc="Cria um clube público para aparecer aqui"/>
            :clubesPublicos.filter(c=>!meusClubeIds.has(c.id)).map(c=>(
                <div key={c.id} className="card card-p">
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <div style={{fontSize:28,flexShrink:0}}>{c.emblema}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{c.nome}</div>
                      <div style={{fontSize:11,color:'#7A8699'}}>
                        {c.regiao&&<span>{c.regiao} · </span>}
                        {ESPECIALIDADES.find(e=>e.id===c.especialidade)?.label}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={()=>entrarPublico(c)}>Entrar</button>
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* Modal Criar */}
      {modal==='criar'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{background:'#0B1830',border:'1px solid #1B2D52',borderRadius:'16px 16px 0 0',width:'100%',maxWidth:560,maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',borderBottom:'1px solid #1B2D52',flexShrink:0}}>
              <div style={{fontSize:15,fontWeight:700,color:'#fff',fontFamily:"'Fraunces',serif"}}>🎽 Criar Clube</div>
              <button onClick={()=>setModal(null)} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>
              <div className="field">
                <label className="label">Emblema do clube</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {EMBLEMAS.map(e=>(
                    <button key={e} onClick={()=>sf('emblema',e)} style={{width:40,height:40,borderRadius:8,fontSize:22,cursor:'pointer',background:form.emblema===e?'rgba(212,175,55,.2)':'#101F40',border:`2px solid ${form.emblema===e?'#D4AF37':'transparent'}`,display:'flex',alignItems:'center',justifyContent:'center'}}>{e}</button>
                  ))}
                </div>
              </div>
              <div className="form-grid">
                <div className="col-2">
                  <div className="field"><label className="label">Nome do clube *</label><input className="input" placeholder="Ex: Velocistas do Norte" value={form.nome} onChange={e=>sf('nome',e.target.value)}/></div>
                </div>
                <div className="field"><label className="label">Região</label><input className="input" placeholder="Ex: Porto, Alentejo..." value={form.regiao} onChange={e=>sf('regiao',e.target.value)}/></div>
                <div className="field"><label className="label">Especialidade</label>
                  <select className="input" value={form.especialidade} onChange={e=>sf('especialidade',e.target.value)}>
                    {ESPECIALIDADES.map(e=><option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
                  </select>
                </div>
                <div className="field"><label className="label">Acesso</label>
                  <select className="input" value={form.acesso} onChange={e=>sf('acesso',e.target.value)}>
                    <option value="codigo">🔑 Por código</option>
                    <option value="publico">🌐 Público</option>
                  </select>
                </div>
                <div className="field"><label className="label">Máx. membros</label>
                  <input className="input" type="number" value={form.max_membros} onChange={e=>sf('max_membros',e.target.value)}/>
                </div>
                <div className="col-2">
                  <div className="field"><label className="label">Descrição</label><textarea className="input" rows={2} style={{resize:'none'}} value={form.descricao} onChange={e=>sf('descricao',e.target.value)} placeholder="Apresenta o teu clube..."/></div>
                </div>
              </div>
            </div>
            <div style={{padding:'14px 20px',borderTop:'1px solid #1B2D52',display:'flex',justifyContent:'flex-end',gap:10,flexShrink:0,background:'#0B1830'}}>
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={criar} disabled={saving}>{saving?<Spinner/>:null}🎽 Criar Clube</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entrar */}
      {modal==='entrar'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{background:'#0B1830',border:'1px solid #1B2D52',borderRadius:'16px 16px 0 0',width:'100%',maxWidth:480,padding:24}}>
            <div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:16,fontFamily:"'Fraunces',serif"}}>🔑 Entrar por Código</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div className="field"><label className="label">Código do clube</label>
                <input className="input" placeholder="Ex: A1B2C3" value={codigoEntrar} onChange={e=>setCodigoEntrar(e.target.value.toUpperCase())} style={{fontFamily:"'Space Mono',monospace",letterSpacing:'.1em'}}/>
              </div>
              <div className="field"><label className="label">O teu nome no clube</label>
                <input className="input" placeholder="Como queres aparecer no ranking" value={nomeEntrar} onChange={e=>setNomeEntrar(e.target.value)}/>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:16}}>
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={entrarPorCodigo} disabled={saving}>{saving?<Spinner/>:null}Entrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
