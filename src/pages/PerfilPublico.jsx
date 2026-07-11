import { useState, useEffect } from 'react'
import { GuiaAuto, BotaoGuia } from '../components/GuiaModulo'
import { db, supabase } from '../lib/supabase'
import { Spinner } from '../components/ui'
import { ConquistaCard } from '../components/Conquistas'
import { BotaoWhatsApp, textoCartaoVisita } from '../components/Partilha'
import { BotaoQR } from '../components/QRCode'

const RARIDADE_COR = { comum:'#94a3b8', rara:'#4C8DFF', epica:'#A855F7', lendaria:'#D4AF37' }

export default function PerfilPublico({ nav, params }) {
  const slug = params?.slug || window.location.pathname.split('/p/')[1]?.split('#')[0]
  const [perfil, setPerfil] = useState(null)
  const [pombos, setPombos] = useState([])
  const [provas, setProvas] = useState([])
  const [conquistas, setConquistas] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('resumo')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    db.getPerfilPublico(slug).then(async p => {
      if (!p) { setLoading(false); return }
      setPerfil(p)
      const [{ data: pg }, { data: pr }, { data: cq }] = await Promise.all([
        supabase.from('pigeons').select('id,nome,anilha,cor,sexo,percentil,provas,foto_url,especialidade').eq('user_id', p.user_id).eq('estado', 'ativo').order('percentil', { ascending:false }).limit(10),
        supabase.from('races').select('id,nome,tipo,dist,data_reg,posicao_geral,n_pombos,local_solta').eq('user_id', p.user_id).order('data_reg', { ascending:false }).limit(8),
        supabase.from('conquistas').select('*').eq('user_id', p.user_id).order('created_at', { ascending:false }),
      ])
      setPombos(pg||[])
      setProvas(pr||[])
      setConquistas(cq||[])
    }).finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#050D1A', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Spinner lg/>
    </div>
  )

  if (!perfil) return (
    <div style={{ minHeight:'100vh', background:'#050D1A', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:20 }}>
      <div>
        <div style={{ fontSize:48, marginBottom:16 }}>🕊️</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:24, color:'#fff', marginBottom:8 }}>Perfil não encontrado</div>
        <div style={{ color:'#7A8699', marginBottom:20 }}>Este link pode ter expirado ou o perfil não é público.</div>
        <button onClick={() => window.location.href='/'} style={{ background:'#1E5FD9', border:'none', color:'#fff', padding:'10px 24px', borderRadius:8, cursor:'pointer', fontFamily:'inherit' }}>
          Conhecer o Fly2Win
        </button>
      </div>
    </div>
  )

  const mediaPercentil = pombos.filter(p=>p.percentil>0).length
    ? Math.round(pombos.filter(p=>p.percentil>0).reduce((s,p)=>s+(p.percentil||0),0)/pombos.filter(p=>p.percentil>0).length)
    : 0
  const vitorias = provas.filter(p=>p.posicao_geral===1).length
  const champion = pombos[0]
  const conquistasLend = conquistas.filter(c=>c.raridade==='lendaria')
  const conquistasEpic = conquistas.filter(c=>c.raridade==='epica')

  return (
    <div style={{ minHeight:'100vh', background:'#050D1A', color:'#fff', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <GuiaAuto modulo="perfilpublico"/>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', borderBottom:'1px solid rgba(212,175,55,.15)', padding:'clamp(20px,4vw,40px) clamp(16px,4vw,40px) 0' }}>
        <div style={{ maxWidth:720, margin:'0 auto' }}>
          {/* Topo — logo + CTA */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:20 }}>🕊️</span>
              <span style={{ fontFamily:"'Fraunces',serif", fontSize:14, fontWeight:700, background:'linear-gradient(135deg,#fff,#D4AF37)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Fly2Win</span>
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <BotaoGuia modulo="perfilpublico"/>
              <button onClick={() => window.location.href='/'} style={{ background:'linear-gradient(135deg,#D4AF37,#B8960C)', border:'none', color:'#050D1A', padding:'8px 16px', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit' }}>
                Experimentar grátis
              </button>
            </div>
          </div>

          {/* Perfil */}
          <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:20 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:72, height:72, borderRadius:14, background:'linear-gradient(135deg,#101F40,#1B2D52)', border:'2px solid rgba(212,175,55,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, overflow:'hidden' }}>
                {perfil.foto_perfil_url ? <img src={perfil.foto_perfil_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : '👤'}
              </div>
              {/* Logo do criador — aparece no canto inferior direito */}
              {perfil.logo_url && (
                <div style={{ position:'absolute', bottom:-6, right:-6, width:28, height:28, borderRadius:8, background:'#050D1A', border:'2px solid rgba(212,175,55,.4)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <img src={perfil.logo_url} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
                </div>
              )}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(20px,4vw,28px)', fontWeight:900, margin:0, color:'#fff' }}>{perfil.nome}</h1>
                {perfil.verificado && <span style={{ fontSize:10, fontWeight:700, color:'#D4AF37', background:'rgba(212,175,55,.1)', border:'1px solid rgba(212,175,55,.3)', borderRadius:99, padding:'2px 8px' }}>✓ Verificado</span>}
                {conquistas.find(c=>c.tipo==='fundador') && <span style={{ fontSize:10, fontWeight:700, color:'#A855F7', background:'rgba(168,85,247,.1)', border:'1px solid rgba(168,85,247,.3)', borderRadius:99, padding:'2px 8px' }}>🏅 Fundador</span>}
              </div>
              <div style={{ fontSize:13, color:'#7A8699', marginBottom:6 }}>
                {perfil.pombal_nome && <span>🏠 {perfil.pombal_nome}</span>}
                {perfil.org && <span> · {perfil.org}</span>}
              </div>
              {perfil.bio && <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.6 }}>{perfil.bio}</div>}
            </div>
          </div>

          {/* Stats em linha */}
          <div style={{ display:'flex', gap:0, marginBottom:0, background:'rgba(255,255,255,.03)', borderRadius:'10px 10px 0 0', overflow:'hidden' }}>
            {[
              [pombos.length, 'Pombos', '#4C8DFF'],
              [provas.length, 'Provas', '#fff'],
              [vitorias, 'Vitórias', '#D4AF37'],
              [mediaPercentil+'%', 'Percentil médio', '#2DD4A7'],
              [conquistas.length, 'Conquistas', '#A855F7'],
            ].map(([v, l, c]) => (
              <div key={l} style={{ flex:1, padding:'12px 6px', textAlign:'center', borderRight:'1px solid rgba(255,255,255,.05)' }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(18px,3vw,24px)', fontWeight:900, color:c, lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:9, color:'#475569', marginTop:3, letterSpacing:'.05em' }}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:0, borderTop:'1px solid rgba(255,255,255,.05)' }}>
            {[['resumo','Resumo'],['pombos','Pombos'],['provas','Provas'],['conquistas','Conquistas']].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'12px 6px', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#D4AF37':'transparent'}`, color:tab===t?'#D4AF37':'#475569', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .2s' }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth:720, margin:'0 auto', padding:'20px clamp(16px,4vw,40px)' }}>

        {tab === 'resumo' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Campeão */}
            {champion && (
              <div style={{ background:'linear-gradient(135deg,rgba(212,175,55,.08),rgba(212,175,55,.03))', border:'1px solid rgba(212,175,55,.2)', borderRadius:12, padding:16, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,#D4AF37,#B8960C)' }}/>
                <div style={{ fontSize:10, fontWeight:700, color:'#D4AF37', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:8 }}>⚡ Destaque do efectivo</div>
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <div style={{ width:56, height:56, borderRadius:10, background:'#101F40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0, overflow:'hidden', border:'1px solid rgba(212,175,55,.2)' }}>
                    {champion.foto_url ? <img src={champion.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : '🕊️'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:'#fff' }}>{champion.nome}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#7A8699' }}>{champion.anilha} · {champion.cor}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{champion.provas||0} provas</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:36, fontWeight:900, color:'#D4AF37', lineHeight:1 }}>{champion.percentil||0}%</div>
                    <div style={{ fontSize:9, color:'#7A8699' }}>PERCENTIL</div>
                  </div>
                </div>
              </div>
            )}

            {/* Conquistas destaque */}
            {(conquistasLend.length > 0 || conquistasEpic.length > 0) && (
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:10 }}>🏅 Conquistas de destaque</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[...conquistasLend, ...conquistasEpic].slice(0,3).map(c=><ConquistaCard key={c.tipo} c={c} obtida/>)}
                </div>
              </div>
            )}

            {/* Partilhar */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <BotaoWhatsApp
                texto={textoCartaoVisita(perfil, { total:pombos.length, provas:provas.length, mediaPercentil })}
                label="Partilhar perfil"
              />
              <BotaoQR titulo={perfil.nome} conteudo={window.location.href} subtitulo="Perfil Fly2Win" />
            </div>
          </div>
        )}

        {tab === 'pombos' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {pombos.length === 0
              ? <div style={{ textAlign:'center', padding:40, color:'#475569' }}>Sem pombos públicos</div>
              : pombos.map((p,i) => (
                <div key={p.id} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px', background:'#0B1830', border:'1px solid #1B2D52', borderRadius:10 }}>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569', width:20, textAlign:'center' }}>{i+1}</div>
                  <div style={{ width:40, height:40, borderRadius:8, background:'#101F40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0, overflow:'hidden' }}>
                    {p.foto_url ? <img src={p.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : '🐦'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{p.nome}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#7A8699' }}>{p.anilha} · {p.cor} · {p.sexo==='M'?'♂':'♀'}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:900, color:(p.percentil||0)>=80?'#2DD4A7':(p.percentil||0)>=60?'#D4AF37':'#94a3b8' }}>{p.percentil||0}%</div>
                    <div style={{ fontSize:9, color:'#475569' }}>{p.provas||0} provas</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {tab === 'provas' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {provas.length === 0
              ? <div style={{ textAlign:'center', padding:40, color:'#475569' }}>Sem provas registadas</div>
              : provas.map(p => (
                <div key={p.id} style={{ display:'flex', gap:10, alignItems:'center', padding:'12px 14px', background:'#0B1830', border:'1px solid #1B2D52', borderRadius:10 }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{p.posicao_geral===1?'🥇':p.posicao_geral<=3?'🏆':'🕊️'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nome}</div>
                    <div style={{ fontSize:11, color:'#7A8699' }}>📍 {p.local_solta||'—'} · 📏 {p.dist||0}km · {new Date(p.data_reg).toLocaleDateString('pt-PT')}</div>
                  </div>
                  {p.posicao_geral && p.n_pombos && (
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:p.posicao_geral===1?'#D4AF37':p.posicao_geral<=3?'#4C8DFF':'#94a3b8' }}>{p.posicao_geral}º/{p.n_pombos}</div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {tab === 'conquistas' && (
          <div>
            {conquistas.length === 0
              ? <div style={{ textAlign:'center', padding:40, color:'#475569' }}>Sem conquistas ainda</div>
              : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8 }}>
                  {conquistas.map(c => <ConquistaCard key={c.tipo} c={c} obtida/>)}
                </div>
            }
          </div>
        )}

        {/* Rodapé CTA */}
        <div style={{ marginTop:32, padding:'20px', background:'linear-gradient(135deg,rgba(212,175,55,.06),rgba(76,141,255,.06))', border:'1px solid rgba(212,175,55,.15)', borderRadius:12, textAlign:'center' }}>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:700, color:'#fff', marginBottom:6 }}>Gestão columbófila premium</div>
          <div style={{ fontSize:12, color:'#7A8699', marginBottom:14 }}>Pedigree, provas, IA, comunidade — tudo integrado.<br/>30 dias grátis, sem cartão.</div>
          <button onClick={() => window.location.href='/'} style={{ background:'linear-gradient(135deg,#D4AF37,#B8960C)', border:'none', color:'#050D1A', padding:'12px 28px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:800, fontFamily:'inherit' }}>
            🕊️ Experimentar o Fly2Win
          </button>
        </div>
      </div>
    </div>
  )
}

