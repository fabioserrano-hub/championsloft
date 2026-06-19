import { useState, useEffect, useCallback } from 'react'
import { db, supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

const FASES = ['Não Competitivo', 'Pré-Competitivo', 'Competição', 'Muda', 'Repouso']
const APTIDOES = ['Apto', 'Em Observação', 'Lesionado', 'Doente', 'Inapto']
const aptBadge = { 'Apto': 'green', 'Em Observação': 'yellow', 'Lesionado': 'red', 'Doente': 'red', 'Inapto': 'gray' }
const EMPTY = { pigeon_id: '', fase: 'Não Competitivo', aptidao: 'Apto', peso: '', obs: '', data_reg: new Date().toISOString().slice(0,10) }
const EMPTY_VAC = { pigeon_id: '', nome: '', data_aplicacao: new Date().toISOString().slice(0,10), proxima_dose: '', obs: '' }

const PLANOS_DEFAULT = [
  { nome: 'Paramyxovirus (Newcastle)', descricao: 'Vacina obrigatória por lei em Portugal. Aplicar antes do início da época de treinos.', periodicidade_dias: 365, obrigatoria: true },
  { nome: 'Poxvirus (Varíola)', descricao: 'Recomendada anualmente. Protege contra a varíola aviária.', periodicidade_dias: 365, obrigatoria: false },
  { nome: 'Salmonela', descricao: 'Recomendada 2x por ano. Especialmente importante antes da reprodução.', periodicidade_dias: 180, obrigatoria: false },
  { nome: 'Tricomoníase (Borrachinho)', descricao: 'Tratamento preventivo 2x por ano. Essencial antes de provas e reprodução.', periodicidade_dias: 180, obrigatoria: false },
  { nome: 'Coccidiose', descricao: 'Tratamento preventivo 2x por ano. Especialmente em jovens e borrachinhos.', periodicidade_dias: 180, obrigatoria: false },
  { nome: 'Desparasitação Externa', descricao: 'Controlo de piolhos e ácaros. Recomendada 3x por ano.', periodicidade_dias: 120, obrigatoria: false },
]

const DOENCAS = [
  { nome: 'Paramyxovírus (Newcastle)', cat: 'Viral', urgencia: 'alta', sintomas: 'Tremores, torção do pescoço (opisthotonus), paralisia das pernas, diarreia aquosa esverdeada, desorientação. Pode ser fatal.', tratamento: 'Sem tratamento específico. Suporte: eletrólitos, vitaminas, isolamento rigoroso. Prevenção: vacinação obrigatória anual (Colombovac PMV ou Nobilis Paramyxo).', prevencao: 'Vacinação obrigatória por lei em Portugal. Vacinar antes da época de treinos.', icon: '🔴' },
  { nome: 'Tricomoníase (Borrachinho)', cat: 'Protozoário', urgencia: 'media', sintomas: 'Placas amarelas/esbranquiçadas na garganta e boca, dificuldade em engolir, perda de peso, penas eriçadas. Em borrachinhos pode ser fatal rapidamente.', tratamento: 'Ronidazol (Ronivet) ou Metronidazol. Tratar todo o efectivo durante 5-7 dias. Limpar e desinfectar comedouros e bebedouros.', prevencao: 'Tratamento preventivo 2x por ano (antes da reprodução e antes das provas). Higiene dos bebedouros.', icon: '🟡' },
  { nome: 'Coccidiose', cat: 'Protozoário', urgencia: 'media', sintomas: 'Diarreia verde ou castanha, perda de peso, fraqueza, penas sujas na zona cloacal. Mais grave em jovens.', tratamento: 'Sulfaclorpiridazina (Coxiprol), Toltrazuril (Baycox), ou Amprolio. Tratamento 3-5 dias. Higienizar o pombal.', prevencao: 'Limpeza regular do pombal. Tratamento preventivo em jovens. Evitar sobrelotação.', icon: '🟡' },
  { nome: 'Salmonela (Paratifose)', cat: 'Bacteriana', urgencia: 'alta', sintomas: 'Diarreia (por vezes sanguinolenta), letargia, articulações inchadas, torção do pescoço, infertilidade na reprodução. Pode ser crónica.', tratamento: 'Enrofloxacina ou Trimetoprim+Sulfa durante 10-14 dias. Atenção: pode tornar-se portador crónico. Isolamento obrigatório.', prevencao: 'Vacinação disponível. Higiene rigorosa. Desinfeção do pombal. Controlo de roedores.', icon: '🔴' },
  { nome: 'Ornitose/Clamidiose', cat: 'Bacteriana', urgencia: 'media', sintomas: 'Corrimento ocular/nasal, dificuldade respiratória, fezes esverdeadas. Atenção: zoonose (transmissível ao Homem).', tratamento: 'Doxiciclina durante 30-45 dias. Tratamento prolongado é essencial. Notificação obrigatória.', prevencao: 'Higiene e ventilação do pombal. Quarentena de pombos novos. Usar máscara ao limpar o pombal.', icon: '⚠️' },
  { nome: 'Varíola Columbídea (Poxvírus)', cat: 'Viral', urgencia: 'media', sintomas: 'Pústulas/crostas nas zonas sem penas (pálpebras, bico, patas). Forma húmida: lesões na garganta com dificuldade respiratória.', tratamento: 'Sem tratamento específico. Suporte vitamínico (A e E). Retirar crostas com antisséptico suave. Isolamento.', prevencao: 'Vacinação disponível (Nobilis Pox). Controlo de insectos picadores (mosquitos, piolhos).', icon: '🟡' },
  { nome: 'Candidíase (Muguet)', cat: 'Fúngica', urgencia: 'baixa', sintomas: 'Placas brancas espessas na boca e inglúvio, dificuldade em engolir, regurgitação. Frequente após antibioterapia.', tratamento: 'Nistatina ou Fluconazol. Probióticos após tratamento para restaurar flora intestinal.', prevencao: 'Evitar uso prolongado de antibióticos. Probióticos preventivos. Higiene dos comedouros.', icon: '🟢' },
  { nome: 'Adenovírus (Doença do Jovem)', cat: 'Viral', urgencia: 'alta', sintomas: 'Vómitos, regurgitação de água (às vezes amarela), diarreia, anorexia. Afecta principalmente jovens de 3-10 meses.', tratamento: 'Sem tratamento específico. Suporte: eletrólitos, vitaminas B. Medicação de suporte (antibiótico para infecções secundárias).', prevencao: 'Higiene rigorosa. Evitar stress. Vitaminas preventivas em jovens.', icon: '🔴' },
  { nome: 'Herpesvírus (Doença de Pacheco)', cat: 'Viral', urgencia: 'alta', sintomas: 'Morte súbita ou rápida deterioração, hepatite, descoordenação, prostração. Pode matar em 24-48h.', tratamento: 'Aciclovir pode ajudar se diagnosticado precocemente. Suporte intensivo.', prevencao: 'Quarentena rigorosa de novos animais (mínimo 30 dias). Desinfeção com produtos eficazes contra vírus.', icon: '🔴' },
  { nome: 'Piojo/Piolho (Ectoparasitas)', cat: 'Parasitária', urgencia: 'baixa', sintomas: 'Agitação, coçar constante, penas danificadas, má condição da plumagem, perda de peso gradual.', tratamento: 'Ivermectina (Ivomec) spot-on ou spray. Permetrina em spray no pombal. Tratar pombos e pombal simultaneamente.', prevencao: 'Banhos regulares. Areia com pó antiparasitário. Inspecção regular das penas.', icon: '🟢' },
  { nome: 'Aspergilose', cat: 'Fúngica', urgencia: 'media', sintomas: 'Dificuldade respiratória, respiração ofegante, perda de peso progressiva, letargia. Frequente em ambientes húmidos.', tratamento: 'Itraconazol ou Voriconazol durante 6-8 semanas. Tratamento prolongado. Prognóstico reservado.', prevencao: 'Ventilação adequada do pombal. Evitar palha húmida ou ração mofada. Controlo da humidade.', icon: '🟡' },
  { nome: 'Enterite Bacteriana', cat: 'Bacteriana', urgencia: 'media', sintomas: 'Diarreia, fezes moles ou líquidas, desidratação, perda de peso. Pode ser causada por E. coli, Campylobacter, etc.', tratamento: 'Antibiótico após antibiograma (amoxicilina, enrofloxacina). Eletrólitos para hidratação. Probióticos no final.', prevencao: 'Higiene dos bebedouros e comedouros. Água fresca diária. Evitar sobrelotação.', icon: '🟡' },
]

const urgenciaConfig = { alta: { cor: '#f87171', label: 'Alta Urgência' }, media: { cor: '#D4AF37', label: 'Atenção' }, baixa: { cor: '#2DD4A7', label: 'Baixa Urgência' } }

function DoencasTab() {
  const [catFiltro, setCatFiltro] = useState('Todas')
  const [expandida, setExpandida] = useState(null)
  const cats = ['Todas', ...new Set(DOENCAS.map(d => d.cat))]
  const filtradas = catFiltro === 'Todas' ? DOENCAS : DOENCAS.filter(d => d.cat === catFiltro)

  return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
        Enciclopédia de doenças típicas dos pombos-correio — sintomas, tratamentos e prevenção. Consulte sempre um veterinário para diagnóstico definitivo.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCatFiltro(c)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: catFiltro === c ? '#1E5FD9' : '#101F40', color: catFiltro === c ? '#fff' : '#94a3b8' }}>{c}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtradas.map((d, i) => {
          const urg = urgenciaConfig[d.urgencia]
          const exp = expandida === i
          return (
            <div key={i} className="card card-p" style={{ cursor: 'pointer', borderLeft: `3px solid ${urg.cor}` }} onClick={() => setExpandida(exp ? null : i)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{d.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{d.nome}</span>
                    <span style={{ fontSize: 10, color: urg.cor, background: `${urg.cor}18`, padding: '1px 8px', borderRadius: 10 }}>{urg.label}</span>
                    <span style={{ fontSize: 10, color: '#7A8699', background: '#101F40', padding: '1px 8px', borderRadius: 10 }}>{d.cat}</span>
                  </div>
                  {!exp && <div style={{ fontSize: 11, color: '#7A8699', marginTop: 2 }}>{d.sintomas.slice(0, 70)}...</div>}
                </div>
                <span style={{ fontSize: 12, color: '#475569' }}>{exp ? '▾' : '▸'}</span>
              </div>
              {exp && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[['🩺 Sintomas', d.sintomas], ['💊 Tratamento', d.tratamento], ['🛡️ Prevenção', d.prevencao]].map(([label, texto]) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>{texto}</div>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>⚕️ Consulte sempre um médico veterinário para diagnóstico e tratamento adequados.</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Saude({ nav, params }) {
  const toast = useToast()
  const { user } = useAuth()
  const [registos, setRegistos] = useState([])
  const [pombos, setPombos] = useState([])
  const [vacinas, setVacinas] = useState([])
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('registos')
  const [modal, setModal] = useState(false)
  const [modalVac, setModalVac] = useState(false)
  const [modalPlano, setModalPlano] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [confirmVac, setConfirmVac] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [formVac, setFormVac] = useState(EMPTY_VAC)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const sfv = (k, v) => setFormVac(f => ({ ...f, [k]: v }))
  const [migrated, setMigrated] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, p, v, pl] = await Promise.all([db.getSaude(), db.getPombos(), db.getVacinas(), db.getPlanosVacinacao()])
      setRegistos(r); setPombos(p); setVacinas(v); setPlanos(pl)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Migrar vacinas do localStorage para Supabase (uma vez)
  useEffect(() => {
    if (migrated || loading) return
    try {
      const local = JSON.parse(localStorage.getItem('cl_vacinas') || '[]')
      if (local.length > 0 && vacinas.length === 0) {
        Promise.all(local.map(v => db.createVacina({ pigeon_id: v.pigeon_id || null, nome_pombo: v.nome_pombo || '', nome: v.nome, data_aplicacao: v.data_aplicacao, proxima_dose: v.proxima_dose || null, obs: v.obs || '' }).catch(() => {})))
          .then(() => { localStorage.removeItem('cl_vacinas'); load(); toast('Vacinas migradas para a base de dados!', 'ok') })
      }
    } catch(e) {}
    setMigrated(true)
  }, [loading, vacinas.length, migrated])

  useEffect(() => {
    if (params?.prefillPomboId && pombos.length) {
      const p = pombos.find(x => x.id === params.prefillPomboId)
      if (p) { setForm({ ...EMPTY, pigeon_id: p.id }); setSelected(null); setModal(true) }
    }
  }, [params, pombos])

  const openNew = () => { setForm(EMPTY); setSelected(null); setModal(true) }
  const openEdit = (r) => { setSelected(r); setForm({ pigeon_id: r.pigeon_id||'', fase: r.fase||'Não Competitivo', aptidao: r.apt||r.aptidao||'Apto', peso: String(r.peso||''), obs: r.obs||'', data_reg: r.created_at?.slice(0,10)||new Date().toISOString().slice(0,10) }); setModal(true) }
  const close = () => { setModal(false); setSelected(null) }

  const save = async () => {
    if (!form.pigeon_id) { toast('Seleccione um pombo','warn'); return }
    setSaving(true)
    try {
      const pombo = pombos.find(p => p.id===form.pigeon_id)
      const payload = { pigeon_id: form.pigeon_id, anel: pombo?.anilha||'', nome_pombo: pombo?.nome||'', fase: form.fase, apt: form.aptidao, aptidao: form.aptidao, peso: form.peso ? parseInt(form.peso) : null, obs: form.obs }
      selected ? await db.updateSaude(selected.id, payload) : await db.createSaude(payload)
      toast(selected ? 'Actualizado!' : 'Registo criado!','ok'); close(); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await db.deleteSaude(confirm.id); toast('Eliminado','ok'); setConfirm(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  const openNewVac = () => { setFormVac(EMPTY_VAC); setModalVac(true) }
  const saveVac = async () => {
    if (!formVac.nome.trim()) { toast('Nome da vacina obrigatório','warn'); return }
    setSaving(true)
    try {
      const pombo = pombos.find(p => p.id===formVac.pigeon_id)
      await db.createVacina({ pigeon_id: formVac.pigeon_id||null, nome_pombo: pombo?.nome||'Todos', nome: formVac.nome, data_aplicacao: formVac.data_aplicacao, proxima_dose: formVac.proxima_dose||null, obs: formVac.obs })
      toast('Vacina registada!','ok'); setModalVac(false); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const delVac = async () => {
    try { await db.deleteVacina(confirmVac.id); toast('Removida','ok'); setConfirmVac(null); load() }
    catch(e) { toast('Erro: '+e.message,'err') }
  }

  const registarAplicacaoPlano = async (plano) => {
    setSaving(true)
    try {
      const proxima = new Date(); proxima.setDate(proxima.getDate() + plano.periodicidade_dias)
      await db.updatePlanoVacinacao(plano.id, { ultima_aplicacao: new Date().toISOString().slice(0,10), proxima_aplicacao: proxima.toISOString().slice(0,10) })
      await db.createVacina({ pigeon_id: null, nome_pombo: 'Todo o efectivo', nome: plano.nome, data_aplicacao: new Date().toISOString().slice(0,10), proxima_dose: proxima.toISOString().slice(0,10), obs: plano.descricao })
      toast('Aplicação registada!','ok'); setModalPlano(null); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const inicializarPlanos = async () => {
    setSaving(true)
    try {
      await Promise.all(PLANOS_DEFAULT.map(p => db.createPlanoVacinacao(p).catch(() => {})))
      toast('Planos inicializados!','ok'); load()
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setSaving(false) }
  }

  const registosOrdenados = [...registos].sort((a,b) => new Date(b.created_at)-new Date(a.created_at))
  const kpiApt = registos.filter(r => (r.apt||r.aptidao)==='Apto').length
  const kpiObs = registos.filter(r => (r.apt||r.aptidao)==='Em Observação').length
  const kpiLes = registos.filter(r => ['Lesionado','Doente'].includes(r.apt||r.aptidao)).length

  const vacinasAtrasadas = vacinas.filter(v => { if(!v.proxima_dose) return false; return (new Date(v.proxima_dose)-new Date())/86400000 < 0 })
  const vacinasProximas = vacinas.filter(v => { if(!v.proxima_dose) return false; const d=(new Date(v.proxima_dose)-new Date())/86400000; return d>=0&&d<=30 })

  const planosAtrasados = planos.filter(p => { if(!p.proxima_aplicacao) return false; return (new Date(p.proxima_aplicacao)-new Date())/86400000 < 0 })
  const planosProximos = planos.filter(p => { if(!p.proxima_aplicacao) return false; const d=(new Date(p.proxima_aplicacao)-new Date())/86400000; return d>=0&&d<=30 })
  const alertasTotal = vacinasAtrasadas.length + vacinasProximas.length + planosAtrasados.length + planosProximos.length

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Saúde</div><div className="section-sub">{registos.length} registos · {vacinas.length} vacinas</div></div>
        <button className="btn btn-primary" onClick={tab==='registos' ? openNew : openNewVac}>＋ {tab==='registos'?'Novo Registo':'Nova Vacina'}</button>
      </div>

      <div style={{ display:'flex', gap:4, background:'#101F40', borderRadius:8, padding:4, marginBottom:16 }}>
        {[['registos','🏥 Registos'],['vacinas',`💉 Vacinas${alertasTotal?` (${alertasTotal})`:''}`],['planos','📋 Planos'],['doencas','📖 Doenças']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'8px 10px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:tab===t?'#1E5FD9':'none', color:tab===t?'#fff':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      {tab==='registos' && (
        <>
          <div className="grid-3 mb-6">
            <div className="kpi"><div className="kpi-val text-green">{kpiApt}</div><div className="kpi-label">Aptos</div></div>
            <div className="kpi"><div className="kpi-val" style={{ color:'#D4AF37' }}>{kpiObs}</div><div className="kpi-label">Em Observação</div></div>
            <div className="kpi"><div className="kpi-val text-red">{kpiLes}</div><div className="kpi-label">Lesionados</div></div>
          </div>
          {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner lg /></div>
            : registos.length===0 ? <EmptyState icon="🏥" title="Sem registos" desc="Registe o primeiro acompanhamento clínico" action={<button className="btn btn-primary" onClick={openNew}>＋ Novo Registo</button>} />
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {registosOrdenados.map(r => (
                  <div key={r.id} className="card card-p">
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:'#101F40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{r.pigeons?.emoji||'🐦'}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{r.nome_pombo||r.pigeons?.nome||'—'}</div>
                        <div style={{ fontSize:11, color:'#7A8699' }}>{r.fase}{r.peso?` · ${r.peso}g`:''} · {new Date(r.created_at).toLocaleDateString('pt-PT')}</div>
                        {r.obs && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{r.obs}</div>}
                      </div>
                      <Badge v={aptBadge[r.apt||r.aptidao]||'gray'}>{r.apt||r.aptidao}</Badge>
                      <button className="btn btn-icon btn-sm" onClick={() => openEdit(r)}>✏️</button>
                      <button className="btn btn-icon btn-sm" onClick={() => setConfirm(r)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </>
      )}

      {tab==='vacinas' && (
        <div>
          {(vacinasAtrasadas.length>0||vacinasProximas.length>0) && (
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
              {vacinasAtrasadas.length>0 && <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontWeight:600, color:'#f87171', marginBottom:4 }}>🚨 {vacinasAtrasadas.length} dose(s) em atraso</div>
                {vacinasAtrasadas.map(v => <div key={v.id} style={{ fontSize:12, color:'#cbd5e1' }}>{v.nome_pombo||'Todo o efectivo'} — {v.nome} · devia ter sido em {new Date(v.proxima_dose).toLocaleDateString('pt-PT')}</div>)}
              </div>}
              {vacinasProximas.length>0 && <div style={{ background:'rgba(212,175,55,.08)', border:'1px solid rgba(212,175,55,.2)', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontWeight:600, color:'#D4AF37', marginBottom:4 }}>💉 {vacinasProximas.length} próxima(s) dose(s) nos próximos 30 dias</div>
                {vacinasProximas.map(v => <div key={v.id} style={{ fontSize:12, color:'#cbd5e1' }}>{v.nome_pombo||'Todo o efectivo'} — {v.nome} em {new Date(v.proxima_dose).toLocaleDateString('pt-PT')}</div>)}
              </div>}
            </div>
          )}
          {vacinas.length===0
            ? <EmptyState icon="💉" title="Sem vacinas registadas" desc="Registe vacinas e tratamentos preventivos" action={<button className="btn btn-primary" onClick={openNewVac}>＋ Nova Vacina</button>} />
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {vacinas.map(v => {
                  const atrasada = vacinasAtrasadas.some(a => a.id===v.id)
                  const proxima = vacinasProximas.some(a => a.id===v.id)
                  return (
                    <div key={v.id} className="card card-p" style={atrasada?{borderColor:'rgba(239,68,68,.3)'}:proxima?{borderColor:'rgba(212,175,55,.3)'}:undefined}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ fontSize:22 }}>💉</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{v.nome}</div>
                          <div style={{ fontSize:11, color:'#7A8699' }}>{v.nome_pombo||'Todo o efectivo'} · Aplicada: {new Date(v.data_aplicacao).toLocaleDateString('pt-PT')}</div>
                          {v.proxima_dose && <div style={{ fontSize:11, color:atrasada?'#f87171':proxima?'#D4AF37':'#7A8699' }}>Próxima: {new Date(v.proxima_dose).toLocaleDateString('pt-PT')}{atrasada?' ⚠️ atrasada':''}</div>}
                        </div>
                        <button className="btn btn-icon btn-sm" onClick={() => setConfirmVac(v)}>🗑️</button>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      )}

      {tab==='planos' && (
        <div>
          <div style={{ fontSize:13, color:'#94a3b8', marginBottom:14 }}>Planos de vacinação e tratamentos preventivos recomendados. Registe cada aplicação para acompanhar os prazos.</div>
          {planos.length===0 ? (
            <div style={{ textAlign:'center', padding:30 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:15, fontWeight:600, color:'#fff', marginBottom:6 }}>Sem planos configurados</div>
              <div style={{ fontSize:13, color:'#7A8699', marginBottom:16 }}>Inicialize com os protocolos recomendados para columbofilia portuguesa</div>
              <button className="btn btn-primary" onClick={inicializarPlanos} disabled={saving}>{saving?<Spinner />:null}Inicializar Planos Recomendados</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {planos.map(p => {
                const atrasado = p.proxima_aplicacao && (new Date(p.proxima_aplicacao)-new Date())/86400000 < 0
                const proximo = p.proxima_aplicacao && !atrasado && (new Date(p.proxima_aplicacao)-new Date())/86400000 <= 30
                const diasAte = p.proxima_aplicacao ? Math.round((new Date(p.proxima_aplicacao)-new Date())/86400000) : null
                return (
                  <div key={p.id} className="card card-p" style={atrasado?{borderColor:'rgba(239,68,68,.3)'}:proximo?{borderColor:'rgba(212,175,55,.3)'}:undefined}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                      <div style={{ fontSize:22 }}>{p.obrigatoria?'🔴':'💊'}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:2 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{p.nome}</div>
                          {p.obrigatoria && <span style={{ fontSize:10, fontWeight:700, color:'#f87171', background:'rgba(239,68,68,.1)', padding:'1px 6px', borderRadius:10 }}>OBRIGATÓRIA</span>}
                        </div>
                        <div style={{ fontSize:11, color:'#7A8699', marginBottom:6 }}>{p.descricao}</div>
                        <div style={{ display:'flex', gap:12, fontSize:11 }}>
                          <span style={{ color:'#94a3b8' }}>A cada {p.periodicidade_dias} dias</span>
                          {p.ultima_aplicacao && <span style={{ color:'#2DD4A7' }}>Última: {new Date(p.ultima_aplicacao).toLocaleDateString('pt-PT')}</span>}
                          {diasAte!==null && <span style={{ color:atrasado?'#f87171':proximo?'#D4AF37':'#94a3b8', fontWeight:600 }}>{atrasado?`⚠️ Atrasada ${Math.abs(diasAte)} dia(s)`:proximo?`Em ${diasAte} dia(s)`:p.proxima_aplicacao?new Date(p.proxima_aplicacao).toLocaleDateString('pt-PT'):'—'}</span>}
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => setModalPlano(p)}>✅ Registar Aplicação</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab==='doencas' && <DoencasTab />}

      <Modal open={modal} onClose={close} title={selected?'✏️ Editar Registo':'🏥 Novo Registo de Saúde'}
        footer={<><button className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner />:null}{selected?'Guardar':'Registar'}</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Pombo *"><select className="input" value={form.pigeon_id} onChange={e => sf('pigeon_id', e.target.value)} disabled={!!selected}><option value="">— Seleccionar —</option>{pombos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field>
          <div className="form-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
            <Field label="Fase"><select className="input" value={form.fase} onChange={e => sf('fase', e.target.value)}>{FASES.map(f => <option key={f}>{f}</option>)}</select></Field>
            <Field label="Aptidão"><select className="input" value={form.aptidao} onChange={e => sf('aptidao', e.target.value)}>{APTIDOES.map(a => <option key={a}>{a}</option>)}</select></Field>
            <Field label="Peso (g)"><input className="input" type="number" placeholder="420" value={form.peso} onChange={e => sf('peso', e.target.value)} /></Field>
            <Field label="Data"><input className="input" type="date" value={form.data_reg} onChange={e => sf('data_reg', e.target.value)} /></Field>
          </div>
          <Field label="Observações"><textarea className="input" rows={3} style={{ resize:'none' }} placeholder="Sintomas, tratamento aplicado..." value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={modalVac} onClose={() => setModalVac(false)} title="💉 Nova Vacina / Tratamento"
        footer={<><button className="btn btn-secondary" onClick={() => setModalVac(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveVac} disabled={saving}>{saving?<Spinner />:null}Registar</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Pombo (deixe vazio para todo o efectivo)"><select className="input" value={formVac.pigeon_id} onChange={e => sfv('pigeon_id', e.target.value)}><option value="">Todo o efectivo</option>{pombos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.anilha})</option>)}</select></Field>
          <Field label="Vacina / Tratamento *"><input className="input" placeholder="Ex: Paramyxovirus" value={formVac.nome} onChange={e => sfv('nome', e.target.value)} /></Field>
          <div className="form-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
            <Field label="Data Aplicação"><input className="input" type="date" value={formVac.data_aplicacao} onChange={e => sfv('data_aplicacao', e.target.value)} /></Field>
            <Field label="Próxima Dose"><input className="input" type="date" value={formVac.proxima_dose} onChange={e => sfv('proxima_dose', e.target.value)} /></Field>
          </div>
          <Field label="Observações"><input className="input" placeholder="Notas..." value={formVac.obs} onChange={e => sfv('obs', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={!!modalPlano} onClose={() => setModalPlano(null)} title="✅ Registar Aplicação"
        footer={<><button className="btn btn-secondary" onClick={() => setModalPlano(null)}>Cancelar</button><button className="btn btn-primary" onClick={() => registarAplicacaoPlano(modalPlano)} disabled={saving}>{saving?<Spinner />:null}Confirmar Aplicação</button></>}>
        {modalPlano && <div>
          <div style={{ fontSize:14, color:'#fff', fontWeight:600, marginBottom:6 }}>{modalPlano.nome}</div>
          <div style={{ fontSize:12, color:'#94a3b8', marginBottom:14 }}>{modalPlano.descricao}</div>
          <div style={{ fontSize:13, color:'#cbd5e1' }}>Confirmar aplicação hoje ({new Date().toLocaleDateString('pt-PT')}) a todo o efectivo. A próxima dose será agendada automaticamente para daqui a <strong style={{ color:'#D4AF37' }}>{modalPlano.periodicidade_dias} dias</strong>.</div>
        </div>}
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar registo"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar este registo de saúde?</p>
      </Modal>

      <Modal open={!!confirmVac} onClose={() => setConfirmVac(null)} title="Eliminar vacina"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirmVac(null)}>Cancelar</button><button className="btn btn-danger" onClick={delVac}>Eliminar</button></>}>
        <p style={{ fontSize:14, color:'#cbd5e1' }}>Eliminar o registo de "{confirmVac?.nome}"?</p>
      </Modal>
    </div>
  )
}
