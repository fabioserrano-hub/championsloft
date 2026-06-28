import { useState, useEffect, useCallback } from 'react'
import { supabase, db } from '../lib/supabase'
import { useToast, Spinner, EmptyState, Field } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'
import { useLicenca, BloqueioPlano } from '../hooks/useLicenca'

const COR_FORMA = (v) => v >= 80 ? '#2DD4A7' : v >= 60 ? '#D4AF37' : v >= 40 ? '#4C8DFF' : '#f87171'
const LABEL_FORMA = (v) => v >= 80 ? 'Excelente' : v >= 60 ? 'Boa' : v >= 40 ? 'Média' : 'Fraca'
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ── GaugeForma recebe temPro e nav como props ─────────────────────────────────
function GaugeForma({ valor, temPro, nav }) {
  if (!temPro) return <BloqueioPlano plano="pro" nav={nav} />
  const cor = COR_FORMA(valor)
  const angulo = (valor / 100) * 180
  const rad = (angulo - 90) * (Math.PI / 180)
  const cx = 60, cy = 60, r = 45
  const x = cx + r * Math.cos(rad)
  const y = cy + r * Math.sin(rad)
  return (
    <div style={{ textAlign:'center' }}>
      <svg viewBox="0 0 120 70" style={{ width:140, height:82, display:'block', margin:'0 auto' }}>
        <path d={`M 15 60 A 45 45 0 0 1 105 60`} fill="none" stroke="#101F40" strokeWidth="10" strokeLinecap="round" />
        <path d={`M 15 60 A 45 45 0 ${angulo>90?1:0} 1 ${x.toFixed(1)} ${y.toFixed(1)}`} fill="none" stroke={cor} strokeWidth="10" strokeLinecap="round" />
        <text x="60" y="58" textAnchor="middle" fontSize="18" fontWeight="900" fill={cor}>{valor}</text>
        <text x="60" y="68" textAnchor="middle" fontSize="8" fill="#7A8699">{LABEL_FORMA(valor)}</text>
      </svg>
    </div>
  )
}

export default function RastreioForma({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()
  const { temBase, temPro, temElite } = useLicenca()
  const [pombos, setPombos] = useState([])
  const [registos, setRegistos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pomboSel, setPomboSel] = useState(null)
  const [modalReg, setModalReg] = useState(false)
  const [form, setForm] = useState({ data: new Date().toISOString().slice(0,10), forma: 70, peso: '', obs: '' })
  const [saving, setSaving] = useState(false)
  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = await db.getPombos()
      setPombos(p.filter(x=>!x.estado_ext||x.estado_ext==='proprio'))
      const { data } = await supabase.from('forma_registos').select('*').order('data', { ascending: true })
      setRegistos(data || [])
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const registosPombo = pomboSel ? registos.filter(r=>r.pombo_id===pomboSel.id) : []
  const ultimoRegisto = registosPombo[registosPombo.length-1]
  const penultimoRegisto = registosPombo[registosPombo.length-2]
  const tendencia = ultimoRegisto && penultimoRegisto
    ? ultimoRegisto.forma - penultimoRegisto.forma : 0

  const graficoForma = registosPombo.slice(-12).map(r => ({
    l: MESES[new Date(r.data).getMonth()],
    v: r.forma,
    d: r.data,
  }))

  const guardar = async () => {
    if (!pomboSel) { toast('Selecciona um pombo','warn'); return }
    setSaving(true)
    try {
      await supabase.from('forma_registos').insert({
        pombo_id: pomboSel.id, pombo_nome: pomboSel.nome,
        data: form.data, forma: parseInt(form.forma),
        peso: form.peso ? parseFloat(form.peso) : null,
        obs: form.obs
      })
      await supabase.from('pigeons').update({ forma: parseInt(form.forma) }).eq('id', pomboSel.id)
      toast('Forma registada!','ok')
      setModalReg(false)
      setForm({ data: new Date().toISOString().slice(0,10), forma: 70, peso: '', obs: '' })
      load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const formaActual = pombos.map(p => {
    const regs = registos.filter(r=>r.pombo_id===p.id)
    const ultimo = regs[regs.length-1]
    return { ...p, formaActual: ultimo?.forma || p.forma || 50, ultimaData: ultimo?.data }
  }).filter(p=>p.estado==='ativo').sort((a,b)=>(b.formaActual||0)-(a.formaActual||0))

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(45,212,167,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#2DD4A7,#D4AF37)' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>📈 Rastreio de Forma</div>
            <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>Acompanha a evolução da forma do teu efectivo</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={()=>setModalReg(true)}>+ Registar</button>
        </div>
      </div>

      {/* Selector de pombo */}
      <div className="card card-p" style={{ marginBottom:12 }}>
        <Field label="Seleccionar pombo para análise">
          <select className="input" value={pomboSel?.id||''} onChange={e=>setPomboSel(pombos.find(p=>p.id===e.target.value)||null)}>
            <option value="">— Seleccionar —</option>
            {pombos.filter(p=>p.estado==='ativo').map(p=><option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}
          </select>
        </Field>
      </div>

      {pomboSel ? (
        <div>
          {/* Forma actual */}
          <div className="card card-p" style={{ marginBottom:10 }}>
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              <GaugeForma valor={ultimoRegisto?.forma || pomboSel.forma || 50} temPro={temPro} nav={nav} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:4 }}>{pomboSel.nome}</div>
                <div style={{ fontSize:11, color:'#7A8699', marginBottom:6 }}>{pomboSel.anilha} · {pomboSel.provas||0} provas · percentil {pomboSel.percentil||0}%</div>
                {ultimoRegisto && <>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>Último registo: {new Date(ultimoRegisto.data).toLocaleDateString('pt-PT')}</div>
                  {ultimoRegisto.peso && <div style={{ fontSize:11, color:'#94a3b8' }}>Peso: {ultimoRegisto.peso}g</div>}
                  {tendencia !== 0 && (
                    <div style={{ fontSize:12, fontWeight:600, color:tendencia>0?'#2DD4A7':'#f87171', marginTop:4 }}>
                      {tendencia>0?'↑':'↓'} {Math.abs(tendencia)} pontos vs registo anterior
                    </div>
                  )}
                </>}
                <button className="btn btn-primary btn-sm" style={{ marginTop:10 }} onClick={()=>setModalReg(true)}>+ Registar hoje</button>
              </div>
            </div>
          </div>

          {/* Gráfico evolução */}
          {graficoForma.length > 1 && (
            <div className="card card-p" style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:8 }}>Evolução da Forma</div>
              <svg viewBox={`0 0 ${graficoForma.length*30} 80`} style={{ width:'100%', height:80, display:'block' }}>
                <rect x="0" y="0" width="100%" height="16" fill="rgba(45,212,167,.05)" />
                <rect x="0" y="16" width="100%" height="16" fill="rgba(212,175,55,.05)" />
                <rect x="0" y="32" width="100%" height="16" fill="rgba(76,141,255,.05)" />
                <rect x="0" y="48" width="100%" height="20" fill="rgba(248,113,113,.05)" />
                {graficoForma.map((d,i,arr) => {
                  const y = 68 - (d.v/100)*60
                  const cor = COR_FORMA(d.v)
                  return (
                    <g key={i}>
                      {i>0 && <line x1={(i-1)*30+15} y1={68-(arr[i-1].v/100)*60} x2={i*30+15} y2={y} stroke={cor} strokeWidth="2" />}
                      <circle cx={i*30+15} cy={y} r={4} fill={cor} />
                      <text x={i*30+15} y={y-7} textAnchor="middle" fontSize="8" fill={cor} fontWeight="700">{d.v}</text>
                      <text x={i*30+15} y={75} textAnchor="middle" fontSize="7" fill="#475569">{d.l}</text>
                    </g>
                  )
                })}
              </svg>
              <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap' }}>
                {[['#2DD4A7','80-100 Excelente'],['#D4AF37','60-79 Boa'],['#4C8DFF','40-59 Média'],['#f87171','0-39 Fraca']].map(([c,l])=>(
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:'#7A8699' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:c }} />{l}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico */}
          {registosPombo.length > 0 && (
            <div className="card card-p">
              <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:10 }}>Histórico de Registos</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[...registosPombo].reverse().slice(0,10).map(r => (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #0d1b2e' }}>
                    <div style={{ fontSize:11, color:'#7A8699', width:80, flexShrink:0 }}>{new Date(r.data).toLocaleDateString('pt-PT')}</div>
                    <div style={{ flex:1, height:4, background:'#101F40', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${r.forma}%`, background:COR_FORMA(r.forma), borderRadius:2 }} />
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:COR_FORMA(r.forma), width:36, textAlign:'right' }}>{r.forma}</div>
                    {r.peso && <div style={{ fontSize:10, color:'#475569', width:40 }}>{r.peso}g</div>}
                    {r.obs && <div style={{ fontSize:10, color:'#7A8699', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.obs}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ fontSize:12, color:'#94a3b8', marginBottom:10 }}>Forma actual do efectivo activo</div>
          {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner lg /></div>
            : formaActual.length===0 ? <EmptyState icon="📈" title="Sem dados" desc="Selecciona um pombo e regista a forma" />
            : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {formaActual.map((p,i)=>{
                  const cor = COR_FORMA(p.formaActual)
                  return (
                    <div key={p.id} className="card card-p" style={{ cursor:'pointer' }} onClick={()=>setPomboSel(p)}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:22, textAlign:'center', fontSize:i<3?14:11, color:i===0?'#D4AF37':i===1?'#cbd5e1':i===2?'#b45309':'#475569', fontWeight:700, flexShrink:0 }}>
                          {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                            <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:cor }}>{p.formaActual}</span>
                          </div>
                          <div style={{ height:4, background:'#101F40', borderRadius:2, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${p.formaActual}%`, background:cor, borderRadius:2 }} />
                          </div>
                          {p.ultimaData && <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>Actualizado: {new Date(p.ultimaData).toLocaleDateString('pt-PT')}</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      )}

      {/* Modal registar */}
      {modalReg && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,13,26,.8)', zIndex:9000, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#0B1830', border:'1px solid #1B2D52', borderRadius:16, padding:20, width:'100%', maxWidth:480 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:14 }}>📈 Registar Forma</div>
            <div className="form-grid">
              <Field label="Pombo">
                <select className="input" value={pomboSel?.id||''} onChange={e=>setPomboSel(pombos.find(p=>p.id===e.target.value)||null)}>
                  <option value="">— Seleccionar —</option>
                  {pombos.filter(p=>p.estado==='ativo').map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Field>
              <Field label="Data"><input className="input" type="date" value={form.data} onChange={e=>sf('data',e.target.value)} /></Field>
              <div className="col-2">
                <Field label={`Forma: ${form.forma} — ${LABEL_FORMA(parseInt(form.forma))}`}>
                  <input type="range" min="0" max="100" value={form.forma}
                    onChange={e=>sf('forma',e.target.value)}
                    style={{ width:'100%', accentColor:COR_FORMA(parseInt(form.forma)) }} />
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#475569' }}>
                    <span>0 Fraca</span><span>50 Média</span><span>80 Boa</span><span>100 Excelente</span>
                  </div>
                </Field>
              </div>
              <Field label="Peso (g)"><input className="input" type="number" placeholder="Ex: 485" value={form.peso} onChange={e=>sf('peso',e.target.value)} /></Field>
              <Field label="Observações"><input className="input" placeholder="Estado geral, plumagem..." value={form.obs} onChange={e=>sf('obs',e.target.value)} /></Field>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={()=>setModalReg(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={guardar} disabled={saving}>{saving?<Spinner/>:null}Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
