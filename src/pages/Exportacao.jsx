import { useState } from 'react'
import { db, supabase } from '../lib/supabase'
import { useToast, Spinner } from '../components/ui'

const MODULOS = [
  { id:'pombos', label:'🐦 Pombos (efectivo)', fn: () => db.getPombos() },
  { id:'provas', label:'🏆 Provas / Resultados', fn: () => db.getProvas() },
  { id:'treinos', label:'🎯 Treinos', fn: () => db.getTreinos() },
  { id:'reproducao', label:'🥚 Reprodução / Casal', fn: () => db.getAcasalamentos() },
  { id:'saude', label:'🏥 Saúde', fn: async () => { const { data } = await supabase.from('health').select('*'); return data||[] } },
  { id:'financas', label:'💰 Finanças', fn: () => db.getFinancas() },
  { id:'tarefas', label:'✅ Tarefas / Checklist', fn: () => db.getTarefas() },
]

function toCSV(dados) {
  if (!dados?.length) return ''
  const headers = Object.keys(dados[0])
  const linhas = dados.map(row => headers.map(h => {
    const val = row[h]
    if (val === null || val === undefined) return ''
    if (Array.isArray(val)) return `"${val.join(',')}"`
    const str = String(val)
    return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g,'""')}"` : str
  }).join(','))
  return [headers.join(','), ...linhas].join('\n')
}

function downloadCSV(csv, nome) {
  const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nome; a.click()
  URL.revokeObjectURL(url)
}

export default function Exportacao({ nav }) {
  const toast = useToast()
  const [exportando, setExportando] = useState({})
  const [exportandoTudo, setExportandoTudo] = useState(false)

  const exportar = async (modulo) => {
    setExportando(e=>({...e,[modulo.id]:true}))
    try {
      const dados = await modulo.fn()
      if (!dados?.length) { toast('Sem dados para exportar','warn'); return }
      const csv = toCSV(dados)
      const data = new Date().toISOString().slice(0,10)
      downloadCSV(csv, `championsloft-${modulo.id}-${data}.csv`)
      toast(`${dados.length} registos exportados!`,'ok')
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setExportando(e=>({...e,[modulo.id]:false})) }
  }

  const exportarTudo = async () => {
    setExportandoTudo(true)
    try {
      const data = new Date().toISOString().slice(0,10)
      for (const modulo of MODULOS) {
        const dados = await modulo.fn()
        if (dados?.length) downloadCSV(toCSV(dados), `championsloft-${modulo.id}-${data}.csv`)
        await new Promise(r=>setTimeout(r,300)) // pequena pausa entre downloads
      }
      toast('Backup completo exportado!','ok')
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setExportandoTudo(false) }
  }

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,#050D1A,#0B1830)', border:'1px solid rgba(45,212,167,.2)', borderRadius:14, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#2DD4A7,#4C8DFF)' }} />
        <div style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:"'Fraunces',serif" }}>📤 Exportação de Dados</div>
        <div style={{ fontSize:11, color:'#7A8699', marginTop:2 }}>Exporta os teus dados em formato CSV (compatível com Excel)</div>
      </div>

      {/* Exportar tudo */}
      <div style={{ marginBottom:14, padding:'14px', background:'rgba(45,212,167,.06)', border:'1px solid rgba(45,212,167,.2)', borderRadius:12 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#2DD4A7', marginBottom:6 }}>💾 Backup completo</div>
        <div style={{ fontSize:12, color:'#94a3b8', marginBottom:10 }}>Exporta todos os módulos de uma vez — ideal para backup antes de mudar de plano ou migrar dados.</div>
        <button className="btn btn-primary" onClick={exportarTudo} disabled={exportandoTudo}>
          {exportandoTudo?<><Spinner /> A exportar...</>:'📥 Exportar tudo (ZIP)'}
        </button>
      </div>

      {/* Módulos individuais */}
      <div style={{ fontSize:12, fontWeight:600, color:'#94a3b8', marginBottom:10 }}>Ou exporta módulo a módulo:</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {MODULOS.map(m => (
          <div key={m.id} className="card card-p" style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:20 }}>{m.label.split(' ')[0]}</div>
            <div style={{ flex:1, fontSize:13, color:'#fff' }}>{m.label.slice(2)}</div>
            <button className="btn btn-secondary btn-sm" onClick={() => exportar(m)} disabled={exportando[m.id]}>
              {exportando[m.id]?<Spinner />:'⬇️ CSV'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop:16, padding:'10px 12px', background:'rgba(76,141,255,.06)', border:'1px solid rgba(76,141,255,.15)', borderRadius:8, fontSize:11, color:'#7A8699' }}>
        ℹ️ Os ficheiros CSV podem ser abertos directamente no Excel, Google Sheets ou importados para outro sistema. Os dados são teus — podes exportá-los sempre que quiseres.
      </div>
    </div>
  )
}
