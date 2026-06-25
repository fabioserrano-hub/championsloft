import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'
import { useIdioma } from '../hooks/useIdioma'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const EMPTY = { titulo: '', data_ev: new Date().toISOString().slice(0, 10), tipo: 'Outro', obs: '' }
const tipoCor = { 'Prova': '#D4AF37', 'Treino': '#4C8DFF', 'Tarefa': '#2DD4A7', 'Reprodução': '#c084fc', 'Coletivo': '#fb923c', 'Outro': '#94a3b8' }
const tipoIcon = { 'Prova': '🏆', 'Treino': '🎯', 'Tarefa': '✅', 'Reprodução': '🥚', 'Coletivo': '📅', 'Outro': '📌' }

const PROVAS_FPC_2026 = [
  { id:'fpc-1',  titulo:'FPC — Abertura Época',       data:'2026-03-14', tipo:'Coletivo', dist:150 },
  { id:'fpc-2',  titulo:'FPC — 1ª Velocidade',        data:'2026-03-28', tipo:'Coletivo', dist:250 },
  { id:'fpc-3',  titulo:'FPC — 2ª Velocidade',        data:'2026-04-11', tipo:'Coletivo', dist:300 },
  { id:'fpc-4',  titulo:'FPC — 1ª Meio-Fundo',        data:'2026-04-25', tipo:'Coletivo', dist:450 },
  { id:'fpc-5',  titulo:'FPC — 2ª Meio-Fundo',        data:'2026-05-09', tipo:'Coletivo', dist:500 },
  { id:'fpc-6',  titulo:'FPC — 1ª Fundo',             data:'2026-05-23', tipo:'Coletivo', dist:650 },
  { id:'fpc-7',  titulo:'FPC — Nacional Velocidade',   data:'2026-06-06', tipo:'Coletivo', dist:350 },
  { id:'fpc-8',  titulo:'FPC — 2ª Fundo',             data:'2026-06-20', tipo:'Coletivo', dist:700 },
  { id:'fpc-9',  titulo:'FPC — Grande Fundo',          data:'2026-07-04', tipo:'Coletivo', dist:900 },
  { id:'fpc-10', titulo:'FPC — Nacional Fundo',        data:'2026-07-18', tipo:'Coletivo', dist:800 },
  { id:'fpc-11', titulo:'FPC — Encerramento Época',    data:'2026-08-01', tipo:'Coletivo', dist:500 },
]

// Parser de CSV simples: aceita vírgula ou ponto-e-vírgula como separador, sem dependências externas.
// Suficiente para ficheiros bem formados como os exportados por federações/folhas de cálculo.
function parseCSV(text) {
  const linhas = text.split(/\r?\n/).filter(l => l.trim())
  if (linhas.length === 0) return { headers: [], rows: [] }
  const sep = linhas[0].includes(';') ? ';' : ','
  const splitLinha = (l) => l.split(sep).map(c => c.trim().replace(/^"(.*)"$/, '$1'))
  const headers = splitLinha(linhas[0])
  const rows = linhas.slice(1).map(splitLinha)
  return { headers, rows }
}

// Tenta normalizar datas em vários formatos comuns (DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD) para YYYY-MM-DD
function normalizarData(str) {
  if (!str) return null
  str = str.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

// Extrai o número de uma distância tipo "272 Km" / "272Km" / "272"
function extrairDistancia(str) {
  if (!str) return null
  const m = str.match(/[\d.,]+/)
  if (!m) return null
  return parseFloat(m[0].replace(',', '.'))
}

// Mapeia a "Especialidade" da LoftGest (Velocidade, Meio Fundo, Fundo, Grande Fundo) para os tipos usados em Provas
function mapearEspecialidade(str) {
  if (!str) return 'Velocidade'
  const s = str.toLowerCase().trim()
  if (s.includes('grande fundo')) return 'Grande Fundo'
  if (s.includes('meio fundo') || s.includes('meio-fundo')) return 'Meio-Fundo'
  if (s.includes('fundo')) return 'Fundo'
  if (s.includes('velocidade')) return 'Velocidade'
  return 'Velocidade'
}

export default function Calendario({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()
  const [mesAtual, setMesAtual] = useState(new Date())
  const [provas, setProvas] = useState([])
  const [treinos, setTreinos] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [modalImport, setModalImport] = useState(false)
  const [csvData, setCsvData] = useState(null)
  const [mapeamento, setMapeamento] = useState({ nome: '', data: '', dist: '', local: '', especialidade: '' })
  const [importando, setImportando] = useState(false)

  const [acasalamentos, setAcasalamentos] = useState([])
  const [mostrarColetivas, setMostrarColetivas] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, t, tf, ev, ac] = await Promise.all([db.getProvas(), db.getTreinos(), db.getTarefas(), db.getEventosCal(), db.getAcasalamentos()])
      setProvas(p); setTreinos(t); setTarefas(tf); setEventos(ev); setAcasalamentos(ac)
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const todosEventos = [
    ...provas.map(p => ({ id: 'prova-' + p.id, titulo: p.nome, data: p.data_reg?.slice(0, 10), tipo: 'Prova', origem: p })),
    ...treinos.map(t => ({ id: 'treino-' + t.id, titulo: t.local, data: t.data?.slice(0, 10) || t.data_reg?.slice(0, 10), tipo: 'Treino', origem: t })),
    ...tarefas.filter(t => t.data_prevista).map(t => ({ id: 'tarefa-' + t.id, titulo: t.titulo, data: t.data_prevista, tipo: 'Tarefa', origem: t, concluida: t.estado === 'concluida' })),
    ...eventos.map(e => ({ id: 'evento-' + e.id, titulo: e.titulo, data: e.data_ev?.slice(0, 10), tipo: e.tipo || 'Outro', origem: e, manual: true })),
    ...acasalamentos.filter(a => a.data_eclosao_prev && a.estado === 'em_progresso').map(a => ({ id: 'eclosao-' + a.id, titulo: `🐣 ${a.pai_nome?.split(' ')[0]} × ${a.mae_nome?.split(' ')[0]}${a.cacifo ? ` (#${a.cacifo})` : ''}`, data: a.data_eclosao_prev?.slice(0, 10), tipo: 'Reprodução', origem: a })),
    ...acasalamentos.filter(a => a.data_postura && a.estado === 'em_progresso').map(a => ({ id: 'postura-' + a.id, titulo: `🥚 Postura: ${a.pai_nome?.split(' ')[0]} × ${a.mae_nome?.split(' ')[0]}`, data: a.data_postura?.slice(0, 10), tipo: 'Reprodução', origem: a })),
    ...(mostrarColetivas ? PROVAS_FPC_2026.map(p => ({ ...p, tipo: 'Coletivo' })) : []),
  ].filter(e => e.data)

  const ano = mesAtual.getFullYear(), mes = mesAtual.getMonth()
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const hojeStr = new Date().toISOString().slice(0, 10)

  const eventosNoDia = (dia) => {
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return todosEventos.filter(e => e.data === dataStr)
  }

  const mudarMes = (delta) => setMesAtual(new Date(ano, mes + delta, 1))

  const abrirNovoEvento = (dia) => {
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    setForm({ ...EMPTY, data_ev: dataStr })
    setModal(true)
  }

  const save = async () => {
    if (!form.titulo.trim()) { toast('Título obrigatório', 'warn'); return }
    setSaving(true)
    try {
      await db.createEventoCal({ titulo: form.titulo.trim(), data_ev: form.data_ev, tipo: form.tipo, obs: form.obs })
      toast('Evento criado!', 'ok'); setModal(false); load()
    } catch (e) { toast('Erro: ' + e.message + ' (verifique se a tabela eventos_cal existe no Supabase)', 'err') }
    finally { setSaving(false) }
  }

  const irParaOrigem = (ev) => {
    if (ev.tipo === 'Prova') nav?.('provas')
    else if (ev.tipo === 'Treino') nav?.('treinos')
  }

  const toggleTarefaConcluida = async (ev) => {
    try {
      await db.updateTarefa(ev.origem.id, { estado: ev.concluida ? 'por_iniciar' : 'concluida' })
      toast(ev.concluida ? 'Tarefa reaberta' : 'Tarefa concluída! ✓', 'ok')
      load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
  }

  const lerFicheiroCSV = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result)
      if (parsed.headers.length === 0) { toast('Ficheiro vazio ou inválido', 'err'); return }
      setCsvData(parsed)
      // Tenta adivinhar o mapeamento por nome de coluna comum
      const find = (...termos) => parsed.headers.find(h => termos.some(t => h.toLowerCase().includes(t)))
      setMapeamento({
        nome: find('prova', 'concurso', 'nome') || parsed.headers[0] || '',
        data: find('data') || '',
        dist: find('dist', 'km') || '',
        local: find('local', 'solta', 'largada') || '',
        especialidade: find('especialidade', 'tipo', 'categoria') || '',
      })
    }
    reader.readAsText(file)
  }

  const linhasValidas = csvData && mapeamento.data
    ? csvData.rows.map(r => {
        const obj = {}
        csvData.headers.forEach((h, i) => obj[h] = r[i])
        return obj
      }).filter(r => normalizarData(r[mapeamento.data]))
    : []

  const confirmarImportacao = async () => {
    if (linhasValidas.length === 0) { toast('Nenhuma linha com data válida para importar', 'warn'); return }
    setImportando(true)
    try {
      let criadas = 0
      for (const linha of linhasValidas) {
        const data = normalizarData(linha[mapeamento.data])
        await db.createProva({
          nome: linha[mapeamento.nome] || 'Prova FCP',
          data_reg: data,
          dist: mapeamento.dist ? extrairDistancia(linha[mapeamento.dist]) : null,
          local_solta: mapeamento.local ? linha[mapeamento.local] : null,
          tipo: mapeamento.especialidade ? mapearEspecialidade(linha[mapeamento.especialidade]) : 'Velocidade',
          origem: 'fcp_csv',
        })
        criadas++
      }
      toast(`${criadas} prova(s) importada(s)!`, 'ok')
      setModalImport(false); setCsvData(null); load()
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setImportando(false) }
  }

  const proximosEventos = todosEventos.filter(e => e.data >= hojeStr && !e.concluida).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 6)

  const diasArray = []
  for (let i = 0; i < primeiroDia; i++) diasArray.push(null)
  for (let d = 1; d <= totalDias; d++) diasArray.push(d)

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Calendário</div><div className="section-sub">{MESES[mes]} {ano}</div></div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          <button onClick={() => setMostrarColetivas(v => !v)}
            style={{ padding:'5px 10px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:`1px solid ${mostrarColetivas?'#fb923c':'#1B2D52'}`, background:mostrarColetivas?'rgba(251,146,60,.1)':'none', color:mostrarColetivas?'#fb923c':'#475569', fontFamily:'inherit' }}>
            📅 FPC {mostrarColetivas ? '✓' : ''}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setModalImport(true)}>📥 CSV</button>
          <button className="btn btn-icon" onClick={() => mudarMes(-1)}>‹</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setMesAtual(new Date())}>Hoje</button>
          <button className="btn btn-icon" onClick={() => mudarMes(1)}>›</button>
        </div>
      </div>
      {/* Legenda */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
        {Object.entries(tipoCor).map(([tipo, cor]) => (
          <div key={tipo} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#7A8699' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:cor }} />{tipo}
          </div>
        ))}
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>
        : <>
          <div className="card card-p mb-6">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
              {DIAS_SEMANA.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, color: '#7A8699', fontWeight: 600 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {diasArray.map((dia, i) => {
                if (!dia) return <div key={i} />
                const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                const evs = eventosNoDia(dia)
                const isHoje = dataStr === hojeStr
                return (
                  <div key={i} onClick={() => setDiaSelecionado(dataStr)}
                    style={{ aspectRatio: '1', borderRadius: 8, padding: 4, cursor: 'pointer', background: isHoje ? 'rgba(45,212,167,.1)' : diaSelecionado === dataStr ? '#1B2D52' : '#101F40', border: isHoje ? '1px solid #2DD4A7' : '1px solid transparent', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                    <div style={{ fontSize: 11, fontWeight: isHoje ? 700 : 500, color: isHoje ? '#2DD4A7' : '#cbd5e1' }}>{dia}</div>
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {evs.slice(0, 3).map((e, j) => <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: tipoCor[e.tipo] }} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {diaSelecionado && (
            <div className="card card-p mb-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: '#fff' }}>{new Date(diaSelecionado).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                <button className="btn btn-secondary btn-sm" onClick={() => abrirNovoEvento(parseInt(diaSelecionado.split('-')[2]))}>＋ Evento</button>
              </div>
              {eventosNoDia(parseInt(diaSelecionado.split('-')[2])).length === 0
                ? <div style={{ fontSize: 13, color: '#7A8699', textAlign: 'center', padding: '10px 0' }}>Sem eventos neste dia</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {eventosNoDia(parseInt(diaSelecionado.split('-')[2])).map(e => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#101F40', borderRadius: 8 }}>
                        {e.tipo === 'Tarefa' ? (
                          <button onClick={() => toggleTarefaConcluida(e)} style={{ width: 20, height: 20, borderRadius: 6, border: e.concluida ? 'none' : '2px solid #1B2D52', background: e.concluida ? '#2DD4A7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 12, padding: 0 }}>
                            {e.concluida && '✓'}
                          </button>
                        ) : <span style={{ fontSize: 16 }}>{tipoIcon[e.tipo]}</span>}
                        <span onClick={() => e.tipo !== 'Tarefa' && !e.manual && irParaOrigem(e)} style={{ flex: 1, fontSize: 13, color: e.concluida ? '#7A8699' : '#fff', textDecoration: e.concluida ? 'line-through' : 'none', cursor: (e.tipo !== 'Tarefa' && !e.manual) ? 'pointer' : 'default' }}>{e.titulo}</span>
                        <Badge v="gray">{e.tipo}</Badge>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}

          <div className="card card-p">
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>📅 Próximos Eventos</div>
            {proximosEventos.length === 0
              ? <div style={{ fontSize: 13, color: '#7A8699', textAlign: 'center', padding: '10px 0' }}>Sem eventos agendados</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {proximosEventos.map(e => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                      {e.tipo === 'Tarefa' ? (
                        <button onClick={() => toggleTarefaConcluida(e)} style={{ width: 18, height: 18, borderRadius: 5, border: '2px solid #1B2D52', background: 'transparent', cursor: 'pointer', flexShrink: 0, padding: 0 }} />
                      ) : <span style={{ fontSize: 16 }}>{tipoIcon[e.tipo]}</span>}
                      <span onClick={() => e.tipo !== 'Tarefa' && !e.manual && irParaOrigem(e)} style={{ flex: 1, fontSize: 13, color: '#fff', cursor: (e.tipo !== 'Tarefa' && !e.manual) ? 'pointer' : 'default' }}>{e.titulo}</span>
                      <span style={{ fontSize: 11, color: '#7A8699' }}>{new Date(e.data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        </>
      }

      <Modal open={modal} onClose={() => setModal(false)} title="📅 Novo Evento"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : null}Criar</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Título *"><input className="input" value={form.titulo} onChange={e => sf('titulo', e.target.value)} /></Field>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Data"><input className="input" type="date" value={form.data_ev} onChange={e => sf('data_ev', e.target.value)} /></Field>
            <Field label="Tipo"><select className="input" value={form.tipo} onChange={e => sf('tipo', e.target.value)}>{['Outro', 'Reprodução'].map(op => <option key={op}>{op}</option>)}</select></Field>
          </div>
          <Field label="Observações"><input className="input" value={form.obs} onChange={e => sf('obs', e.target.value)} /></Field>
        </div>
      </Modal>

      <Modal open={modalImport} onClose={() => { setModalImport(false); setCsvData(null) }} title="📥 Importar Calendário (CSV)" wide
        footer={csvData ? <>
          <button className="btn btn-secondary" onClick={() => setCsvData(null)}>← Voltar</button>
          <button className="btn btn-primary" onClick={confirmarImportacao} disabled={importando || linhasValidas.length === 0}>{importando ? <Spinner /> : null}Importar {linhasValidas.length} prova(s)</button>
        </> : <button className="btn btn-secondary" onClick={() => setModalImport(false)}>Cancelar</button>}>
        {!csvData ? (
          <div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
              Carregue o ficheiro CSV do calendário de provas — funciona com o formato exportado pela LoftGest/Columbofilia.Net (colunas Prova, Data, Nome, Distância, Especialidade) ou qualquer outro CSV com cabeçalhos. No passo seguinte confirma o mapeamento de colunas.
            </div>
            <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
              📄 Escolher Ficheiro CSV
              <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => lerFicheiroCSV(e.target.files[0])} />
            </label>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>{csvData.rows.length} linha(s) encontrada(s). Associe cada coluna do ficheiro ao campo correto:</div>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
              <Field label="Coluna: Nome da Prova">
                <select className="input" value={mapeamento.nome} onChange={e => setMapeamento(m => ({ ...m, nome: e.target.value }))}>
                  <option value="">— Nenhuma —</option>
                  {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
              <Field label="Coluna: Data *">
                <select className="input" value={mapeamento.data} onChange={e => setMapeamento(m => ({ ...m, data: e.target.value }))}>
                  <option value="">— Escolher —</option>
                  {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
              <Field label="Coluna: Distância (km)">
                <select className="input" value={mapeamento.dist} onChange={e => setMapeamento(m => ({ ...m, dist: e.target.value }))}>
                  <option value="">— Nenhuma —</option>
                  {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
              <Field label="Coluna: Local de Solta">
                <select className="input" value={mapeamento.local} onChange={e => setMapeamento(m => ({ ...m, local: e.target.value }))}>
                  <option value="">— Nenhuma —</option>
                  {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
              <Field label="Coluna: Especialidade">
                <select className="input" value={mapeamento.especialidade} onChange={e => setMapeamento(m => ({ ...m, especialidade: e.target.value }))}>
                  <option value="">— Nenhuma (assume Velocidade) —</option>
                  {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
            </div>

            {!mapeamento.data && <div style={{ fontSize: 12, color: '#D4AF37', marginBottom: 12 }}>⚠️ Escolha a coluna de Data para continuar.</div>}

            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Pré-visualização ({linhasValidas.length} de {csvData.rows.length} linhas com data reconhecida):</div>
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {linhasValidas.slice(0, 10).map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#101F40', borderRadius: 8, fontSize: 12 }}>
                  <span style={{ color: '#D4AF37', fontWeight: 600 }}>{normalizarData(l[mapeamento.data])}</span>
                  <span style={{ flex: 1, color: '#fff' }}>{mapeamento.nome ? l[mapeamento.nome] : 'Prova FCP'}</span>
                  {mapeamento.especialidade && <Badge v="blue">{mapearEspecialidade(l[mapeamento.especialidade])}</Badge>}
                  {mapeamento.dist && <span style={{ color: '#7A8699' }}>{extrairDistancia(l[mapeamento.dist])}km</span>}
                </div>
              ))}
              {linhasValidas.length > 10 && <div style={{ fontSize: 11, color: '#7A8699', textAlign: 'center' }}>+{linhasValidas.length - 10} mais</div>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
