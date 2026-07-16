// src/modules/virtualLoft/screens/VLFinancas.jsx
import { useState } from 'react'

const CATEGORIAS = {
  pt: {
    receitas: ['Prémio de prova','Venda de pombo','Patrocínio','Subsídio','Outro'],
    despesas: ['Salários','Alimentação','Veterinário','Construção','Compra de pombo','Inscrição em prova','Outro'],
  },
  en: {
    receitas: ['Race prize','Pigeon sale','Sponsorship','Grant','Other'],
    despesas: ['Salaries','Feeding','Veterinary','Construction','Pigeon purchase','Race entry','Other'],
  },
  es: {
    receitas: ['Premio de carrera','Venta de paloma','Patrocinio','Subvención','Otro'],
    despesas: ['Salarios','Alimentación','Veterinario','Construcción','Compra de paloma','Inscripción carrera','Otro'],
  },
}

export default function VLFinancas({ carreira, onVoltar, onGuardar, idioma = 'pt' }) {
  const [tab, setTab] = useState('resumo')
  const [form, setForm] = useState({ tipo:'receita', valor:'', categoria:'', desc:'' })
  const [msg, setMsg] = useState(null)

  const movimentos = carreira.movimentos || []
  const cats = CATEGORIAS[idioma] || CATEGORIAS.pt

  const totalReceitas = movimentos.filter(m => m.tipo === 'receita').reduce((s,m) => s + m.valor, 0)
  const totalDespesas = movimentos.filter(m => m.tipo === 'despesa').reduce((s,m) => s + m.valor, 0)
  const saldo = carreira.orcamento

  const adicionarMovimento = () => {
    if (!form.valor || isNaN(form.valor) || Number(form.valor) <= 0) {
      setMsg({ tipo:'erro', texto: idioma==='en'?'Invalid value':idioma==='es'?'Valor inválido':'Valor inválido' })
      setTimeout(() => setMsg(null), 2000)
      return
    }
    const valor = Number(form.valor)
    const novo = { id: `mov_${Date.now()}`, tipo: form.tipo, valor, categoria: form.categoria || (idioma==='en'?'Other':idioma==='es'?'Otro':'Outro'), desc: form.desc, semana: carreira.semana, epoca: carreira.epoca, data: new Date().toISOString() }
    const novosMovimentos = [...movimentos, novo]
    const novoOrcamento = form.tipo === 'receita' ? saldo + valor : saldo - valor
    onGuardar?.({ ...carreira, movimentos: novosMovimentos, orcamento: Math.max(0, novoOrcamento) })
    setForm({ tipo:'receita', valor:'', categoria:'', desc:'' })
    setMsg({ tipo:'ok', texto: idioma==='en'?'Movement added!':idioma==='es'?'¡Movimiento añadido!':'Movimento adicionado!' })
    setTimeout(() => setMsg(null), 2000)
    setTab('historico')
  }

  // Salários do staff
  const salarioMensal = (carreira.staff || []).reduce((s,m) => s + (m.salario || 0), 0)

  return (
    <div style={{ minHeight:'100vh', background:'#030812', color:'#fff', fontFamily:'inherit' }}>
      <div style={{ background:'linear-gradient(180deg,#050D1A,#030812)', borderBottom:'1px solid rgba(255,255,255,.05)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={onVoltar} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:8, width:32, height:32, color:'#7A8699', cursor:'pointer', fontSize:16 }}>←</button>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>💰 {idioma==='en'?'Finances':idioma==='es'?'Finanzas':'Finanças'}</div>
            <div style={{ fontSize:10, color:'#7A8699' }}>{idioma==='en'?'Season':idioma==='es'?'Temporada':'Época'} {carreira.epoca}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['resumo',idioma==='en'?'Summary':idioma==='es'?'Resumen':'Resumo'],['adicionar',idioma==='en'?'Add':idioma==='es'?'Añadir':'Adicionar'],['historico',idioma==='en'?'History':idioma==='es'?'Historial':'Historial']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:'none', padding:'8px 14px', borderRadius:8, border:tab===id?'none':'1px solid rgba(255,255,255,.08)', background:tab===id?'linear-gradient(135deg,#22c55e,#15803d)':'rgba(255,255,255,.04)', color:tab===id?'#fff':'#cbd5e1', fontSize:12, fontWeight:tab===id?700:500, cursor:'pointer', fontFamily:'inherit', minHeight:36 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ margin:'12px 16px 0', padding:'10px 14px', background:msg.tipo==='ok'?'rgba(34,197,94,.1)':'rgba(248,113,113,.1)', border:`1px solid ${msg.tipo==='ok'?'rgba(34,197,94,.3)':'rgba(248,113,113,.3)'}`, borderRadius:10, fontSize:12, color:msg.tipo==='ok'?'#22c55e':'#f87171', fontWeight:600 }}>
          {msg.tipo==='ok'?'✅':'❌'} {msg.texto}
        </div>
      )}

      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {tab === 'resumo' && (
          <>
            {/* Cards principais */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { label:idioma==='en'?'Balance':idioma==='es'?'Saldo':'Saldo', valor:`${saldo.toLocaleString()}€`, cor: saldo >= 0 ? '#22c55e' : '#f87171', icon:'💰' },
                { label:idioma==='en'?'Staff cost':idioma==='es'?'Coste staff':'Custo staff', valor:`${salarioMensal.toLocaleString()}€/${idioma==='en'?'mo':idioma==='es'?'mes':'mês'}`, cor:'#f97316', icon:'👥' },
                { label:idioma==='en'?'Income':idioma==='es'?'Ingresos':'Receitas', valor:`+${totalReceitas.toLocaleString()}€`, cor:'#22c55e', icon:'📈' },
                { label:idioma==='en'?'Expenses':idioma==='es'?'Gastos':'Despesas', valor:`-${totalDespesas.toLocaleString()}€`, cor:'#f87171', icon:'📉' },
              ].map((s,i) => (
                <div key={i} style={{ padding:'14px', background:'rgba(255,255,255,.02)', border:`1px solid ${s.cor}20`, borderRadius:12, textAlign:'center' }}>
                  <div style={{ fontSize:20, marginBottom:6 }}>{s.icon}</div>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:s.cor }}>{s.valor}</div>
                  <div style={{ fontSize:9, color:'#475569', marginTop:2, fontWeight:600 }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* Dicas */}
            <div style={{ padding:'12px 14px', background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.15)', borderRadius:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#22c55e', marginBottom:6 }}>
                💡 {idioma==='en'?'Financial tips':idioma==='es'?'Consejos financieros':'Dicas financeiras'}
              </div>
              {[
                salarioMensal > saldo * 0.3 ? (idioma==='en'?'⚠️ Staff costs are high relative to budget':idioma==='es'?'⚠️ Los costos de staff son altos':'⚠️ Custos de staff elevados relativamente ao orçamento') : null,
                saldo < 2000 ? (idioma==='en'?'⚠️ Low budget — enter races to earn prizes':idioma==='es'?'⚠️ Presupuesto bajo — compite para ganar premios':'⚠️ Orçamento baixo — participa em provas para ganhar prémios') : null,
                saldo > 10000 ? (idioma==='en'?'✅ Good budget — consider upgrading facilities':idioma==='es'?'✅ Buen presupuesto — mejora las instalaciones':'✅ Bom orçamento — considera melhorar o pombal') : null,
              ].filter(Boolean).map((d,i) => <div key={i} style={{ fontSize:11, color:'#7A8699', marginTop:4 }}>{d}</div>)}
            </div>
          </>
        )}

        {tab === 'adicionar' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Tipo */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['receita','📈','#22c55e'],['despesa','📉','#f87171']].map(([tipo,icon,cor]) => (
                <div key={tipo} onClick={() => setForm(f=>({...f,tipo,categoria:''}))}
                  style={{ padding:'12px', borderRadius:10, border:`2px solid ${form.tipo===tipo?cor:'rgba(255,255,255,.06)'}`, background:form.tipo===tipo?`${cor}10`:'rgba(255,255,255,.02)', cursor:'pointer', textAlign:'center' }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:form.tipo===tipo?cor:'#7A8699' }}>
                    {tipo === 'receita' ? (idioma==='en'?'Income':idioma==='es'?'Ingreso':'Receita') : (idioma==='en'?'Expense':idioma==='es'?'Gasto':'Despesa')}
                  </div>
                </div>
              ))}
            </div>

            {/* Valor */}
            <div>
              <label style={{ fontSize:11, color:'#7A8699', display:'block', marginBottom:6 }}>
                {idioma==='en'?'Amount (€)':idioma==='es'?'Importe (€)':'Valor (€)'}
              </label>
              <input type="number" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))}
                placeholder="0"
                style={{ width:'100%', padding:'12px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, color:'#fff', fontSize:16, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
            </div>

            {/* Categoria */}
            <div>
              <label style={{ fontSize:11, color:'#7A8699', display:'block', marginBottom:6 }}>
                {idioma==='en'?'Category':idioma==='es'?'Categoría':'Categoria'}
              </label>
              <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}
                style={{ width:'100%', padding:'12px', background:'#0B1830', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, color:'#fff', fontSize:13, fontFamily:'inherit', outline:'none' }}>
                <option value="">-- {idioma==='en'?'Select':idioma==='es'?'Seleccionar':'Seleccionar'} --</option>
                {(form.tipo==='receita'?cats.receitas:cats.despesas).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label style={{ fontSize:11, color:'#7A8699', display:'block', marginBottom:6 }}>
                {idioma==='en'?'Description (optional)':idioma==='es'?'Descripción (opcional)':'Descrição (opcional)'}
              </label>
              <input value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))}
                placeholder={idioma==='en'?'Notes...':idioma==='es'?'Notas...':'Notas...'}
                style={{ width:'100%', padding:'12px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, color:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
            </div>

            <button onClick={adicionarMovimento}
              style={{ padding:'14px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#22c55e,#15803d)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              + {idioma==='en'?'Add movement':idioma==='es'?'Añadir movimiento':'Adicionar movimento'}
            </button>
          </div>
        )}

        {tab === 'historico' && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {movimentos.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#475569' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>💸</div>
                <div style={{ fontSize:14, fontWeight:600 }}>
                  {idioma==='en'?'No movements yet':idioma==='es'?'Sin movimientos aún':'Sem movimentos ainda'}
                </div>
              </div>
            ) : (
              [...movimentos].reverse().map((m,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', borderRadius:10 }}>
                  <span style={{ fontSize:18 }}>{m.tipo==='receita'?'📈':'📉'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#cbd5e1' }}>{m.categoria}</div>
                    {m.desc && <div style={{ fontSize:10, color:'#475569' }}>{m.desc}</div>}
                    <div style={{ fontSize:9, color:'#2a3a5a', marginTop:2 }}>{idioma==='en'?'Week':idioma==='es'?'Sem.':'Sem.'} {m.semana}</div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:m.tipo==='receita'?'#22c55e':'#f87171' }}>
                    {m.tipo==='receita'?'+':'-'}{m.valor.toLocaleString()}€
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
