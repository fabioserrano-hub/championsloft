import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useIdioma } from '../hooks/useIdioma'
import { useToast, Spinner, Modal, EmptyState, Field, Badge } from '../components/ui'

// ── constantes ────────────────────────────────────────────────────────────────
const RACOES_COMERCIAIS = ['Versele-Laga Gerry Plus','Versele-Laga Coloured','Beyers Sport','Beyers Energy Plus','Roehnfried Champion','Roehnfried Original','DAC Mistura Competição','DAC Mistura Muda']
const SUGESTOES_PRODUTOS = [
  // Cereais
  'Milho','Cevada','Trigo','Aveia','Ervilha','Girassol','Cártamo','Colza','Painço','Arroz',
  // Rações
  ...RACOES_COMERCIAIS,
  // Medicamentos / Suplementos
  'Amprolium','Ronidazol','Enrofloxacina','Doxiciclina','Spartrix','Tylan','Baycox','Eskazole',
  'Vitaminas A+D3+E','Eletrólitos','Hepatox','Probiotic Total B','Vitapombo','Vita Amino Plus',
  'Ampola X','Hexa Plus','Formix','Haemo Plus','Columbovet','Tetrakilon Forte','Respiral Vet',
  'Oxigen Plus','Total Bath MG++','Hyperform','Sedosin','Catosal','Blitz','Usnea Barbata',
]
const CATEGORIAS = ['Cereal','Ração Comercial','Medicamento','Suplemento','Vitamina','Probiótico','Energético','Outro']
const CAT_ICON = { Cereal:'🌾', 'Ração Comercial':'🥫', Medicamento:'💊', Suplemento:'🧪', Vitamina:'💉', Probiótico:'🦠', Energético:'⚡', Outro:'📦' }
const UNIDADES = ['ml','L','g','kg','comprimidos','unidades','medidas']
const ESPECIALIDADES = ['velocidade','meio_fundo','fundo','geral']
const ESP_LABEL = { velocidade:'Velocidade', meio_fundo:'Meio-Fundo', fundo:'Fundo', geral:'Geral' }
const ESP_COLOR = { velocidade:'#F59E0B', meio_fundo:'#3B82F6', fundo:'#10B981', geral:'#8B5CF6' }
const MODO_ICON  = { agua:'💧', racao:'🌾', direto:'💊', outros:'🛁' }
const MODO_LABEL = { agua:'Na água', racao:'Na ração', direto:'Direto', outros:'Outros' }
const MODO_LABEL_FULL = { agua:'💧 Na água', racao:'🌾 Na ração', direto:'💊 Direto ao pombo', outros:'🛁 Outros (banho, narinas…)' }
const BASE_LABEL = { pombo:'por pombo', litro:'por litro', kg:'por kg ração' }
const DIAS_SEMANA = [
  { key:'domingo', label:'Dom', full:'Domingo', idx:0 },
  { key:'segunda', label:'Seg', full:'Segunda', idx:1 },
  { key:'terca',   label:'Ter', full:'Terça',   idx:2 },
  { key:'quarta',  label:'Qua', full:'Quarta',  idx:3 },
  { key:'quinta',  label:'Qui', full:'Quinta',  idx:4 },
  { key:'sexta',   label:'Sex', full:'Sexta',   idx:5 },
  { key:'sabado',  label:'Sáb', full:'Sábado',  idx:6 },
]

// ── helpers ───────────────────────────────────────────────────────────────────
const diaIdx = k => DIAS_SEMANA.find(d=>d.key===k)?.idx??0
function calcDN(diaItem, diaProva) {
  let d = diaIdx(diaProva)-diaIdx(diaItem); if(d<0) d+=7
  return d===0?'Prova':`D-${d}`
}
function segundaFeira(data=new Date()) {
  const d=new Date(data); d.setDate(d.getDate()-(d.getDay()+6)%7)
  return d.toISOString().slice(0,10)
}
const diaHojeKey = () => DIAS_SEMANA[new Date().getDay()].key

function calcDose(prod, n) {
  if(!prod?.dosagem_valor) return null
  if(prod.dosagem_base==='pombo') {
    const total=(prod.dosagem_valor*n).toFixed(1)
    return { linha1:`${prod.dosagem_valor}${prod.dosagem_unidade}/pombo`, linha2:`→ ${total}${prod.dosagem_unidade} total` }
  }
  return { linha1:`${prod.dosagem_valor}${prod.dosagem_unidade}`, linha2:BASE_LABEL[prod.dosagem_base] }
}

// ── impressão ─────────────────────────────────────────────────────────────────
// -- arredondar litros acima em 0.5L
function arredondarLitros(ml) {
  const l = ml / 1000
  if (l <= 0.5) return 0.5
  if (l <= 1)   return 1
  if (l <= 1.5) return 1.5
  if (l <= 2)   return 2
  if (l <= 2.5) return 2.5
  return Math.ceil(l * 2) / 2
}

// -- guia pratico por item
function gerarGuia(prod, item, nPombos, mlPorPombo) {
  if (!prod) return []
  const linhas = []
  const racaoGTotal = item.racao_g ? parseFloat(item.racao_g) * nPombos : null
  const racaoKg = racaoGTotal ? racaoGTotal / 1000 : null
  const litros = arredondarLitros(mlPorPombo * nPombos)

  if (prod.modo === 'agua') {
    linhas.push({ icon:'💧', texto:'Prepara ' + litros + 'L de agua limpa (estimativa para ' + nPombos + ' pombos)' })
    if (prod.dosagem_valor) {
      const doseAgua = prod.dosagem_base === 'litro'
        ? (prod.dosagem_valor * litros).toFixed(1)
        : prod.dosagem_base === 'pombo'
        ? (prod.dosagem_valor * nPombos).toFixed(1)
        : prod.dosagem_valor
      linhas.push({ icon:'🧪', texto:'Adiciona ' + doseAgua + prod.dosagem_unidade + ' de ' + prod.nome })
    }
    linhas.push({ icon:'🐦', texto:'Distribui pelos bebedouros' })
  }

  if (prod.modo === 'racao') {
    if (item.racao_g && nPombos) {
      linhas.push({ icon:'⚖️', texto:'Pesa ' + (racaoGTotal ? racaoGTotal.toFixed(0) : '?') + 'g de racao (' + item.racao_g + 'g x ' + nPombos + ' pombos)' })
      if (item.tipo_racao) linhas.push({ icon:'🌾', texto:'Composicao: ' + item.tipo_racao })
      if (prod.dosagem_valor && racaoKg) {
        const doseRac = prod.dosagem_base === 'kg'
          ? (prod.dosagem_valor * racaoKg).toFixed(2)
          : prod.dosagem_base === 'pombo'
          ? (prod.dosagem_valor * nPombos).toFixed(1)
          : prod.dosagem_valor
        linhas.push({ icon:'🧪', texto:'Adiciona ' + doseRac + prod.dosagem_unidade + ' de ' + prod.nome + ' a racao' })
      }
    } else if (prod.dosagem_valor) {
      const d = prod.dosagem_base === 'pombo'
        ? (prod.dosagem_valor * nPombos).toFixed(1) + prod.dosagem_unidade + ' (' + prod.dosagem_valor + prod.dosagem_unidade + '/pombo)'
        : prod.dosagem_valor + prod.dosagem_unidade + (prod.dosagem_base === 'kg' ? ' por kg de racao' : '')
      linhas.push({ icon:'🧪', texto:'Adiciona ' + d + ' de ' + prod.nome })
    }
    linhas.push({ icon:'🥣', texto:'Mistura bem antes de colocar nos comedouros' })
  }

  if (prod.modo === 'direto') {
    if (prod.dosagem_valor) {
      const d = prod.dosagem_base === 'pombo'
        ? prod.dosagem_valor + prod.dosagem_unidade + ' por pombo (total: ' + (prod.dosagem_valor * nPombos).toFixed(1) + prod.dosagem_unidade + ')'
        : prod.dosagem_valor + prod.dosagem_unidade
      linhas.push({ icon:'💊', texto:'Administra ' + d + ' de ' + prod.nome + ' directamente a cada pombo' })
    }
  }

  if (prod.modo === 'outros') {
    linhas.push({ icon:'🛁', texto: prod.obs || item.outros || ('Aplica ' + prod.nome + ' conforme indicacao') })
    if (prod.dosagem_valor && prod.dosagem_base === 'pombo') {
      linhas.push({ icon:'📏', texto:'Dose: ' + prod.dosagem_valor + prod.dosagem_unidade + ' por pombo' })
    }
  }

  if (item.outros && prod.modo !== 'outros') linhas.push({ icon:'🛁', texto: item.outros })
  if (item.voo_min) linhas.push({ icon:'✈️', texto:'Tempo de voo: ' + item.voo_min + ' min' })
  if (item.notas)   linhas.push({ icon:'📝', texto: item.notas })
  return linhas
}

// -- parse de tipo_racao: "50% Sport Excellent + 50% Gerry Plus" -> [{nome, pct}]
function parseTipoRacao(tipoRacao, produtos) {
  if (!tipoRacao) return []
  const partes = tipoRacao.split('+').map(p => p.trim())
  const resultado = []
  for (const parte of partes) {
    const matchPct = parte.match(/(\d+)%\s*(.+)/)
    if (matchPct) {
      const pct = parseInt(matchPct[1]) / 100
      const nome = matchPct[2].trim()
      const prod = produtos.find(p => p.nome.toLowerCase() === nome.toLowerCase())
      resultado.push({ nome, pct, prod })
    } else {
      // sem percentagem — assume 100%
      const nome = parte.trim()
      const prod = produtos.find(p => p.nome.toLowerCase() === nome.toLowerCase())
      if (nome) resultado.push({ nome, pct: 1, prod })
    }
  }
  return resultado
}

// -- abates de racao (array de {prod, qty, nome})
function calcAbateRacao(item, nPombos, produtos) {
  if (!item.racao_g || !item.tipo_racao) return []
  const totalG = parseFloat(item.racao_g) * nPombos
  const partes = parseTipoRacao(item.tipo_racao, produtos)
  return partes
    .filter(p => p.prod && p.prod._stock_id)
    .map(p => ({
      prod: p.prod,
      qty: parseFloat((totalG * p.pct).toFixed(1)),
      unidade: 'g',
      nome: p.nome,
      pct: p.pct,
    }))
}

// -- calculo para abate de stock
// racaoGHerdada: gramas de outro item do mesmo periodo, para produtos sem racao_g proprio
function calcAbate(prod, item, nPombos, mlPorPombo, racaoGHerdada) {
  if (!prod || !prod.dosagem_valor) return null
  const litros = arredondarLitros(mlPorPombo * nPombos)
  const gUsados = item.racao_g ? parseFloat(item.racao_g) : (racaoGHerdada || null)
  const racaoGTotal = gUsados ? gUsados * nPombos : null
  const racaoKg = racaoGTotal ? racaoGTotal / 1000 : null
  let qty = 0
  if (prod.dosagem_base === 'pombo') qty = prod.dosagem_valor * nPombos
  else if (prod.dosagem_base === 'litro') qty = prod.dosagem_valor * litros
  else if (prod.dosagem_base === 'kg' && racaoKg) qty = prod.dosagem_valor * racaoKg
  else return null
  return { qty: parseFloat(qty.toFixed(2)), unidade: prod.dosagem_unidade, gUsados }
}

// encontra as gramas de racao herdadas de outro item do mesmo periodo
function racaoGDoPeriodo(itens, diaKey, per) {
  const itensPer = itens.filter(i =>
    i.dia_semana === diaKey &&
    (per === 'manha' ? i.periodo !== 'tarde' : i.periodo === 'tarde') &&
    i.racao_g && parseFloat(i.racao_g) > 0
  )
  return itensPer.length > 0 ? parseFloat(itensPer[0].racao_g) : null
}

function imprimirPlano(plano, produtos, nPombos) {
  const diasComItens = DIAS_SEMANA.filter(d=>(plano.itens||[]).some(i=>i.dia_semana===d.key))
  const getProd = id => produtos.find(p=>p.id===id)
  const campos = [{key:'agua',label:'Na Água'},{key:'racao',label:'Na Ração'},{key:'gramas',label:'Ração (g)'},{key:'tipo',label:'Tipo Ração'},{key:'voo',label:'Voo (min)'},{key:'outros',label:'Outros'}]
  const linhas = ['manha','tarde'].flatMap(per=>{
    const bg=per==='manha'?'#e8f4fd':'#fdf4e8'; const lbl=per==='manha'?'MANHÃ':'TARDE'
    return campos.map((campo,ci)=>{
      const cells=diasComItens.map(d=>{
        const item=(plano.itens||[]).find(i=>i.dia_semana===d.key&&(per==='manha'?i.periodo!=='tarde':i.periodo==='tarde'))
        if(!item) return `<td style="border:1px solid #e2e8f0;padding:6px 8px;color:#ccc;text-align:center;font-size:10px">—</td>`
        const prod=getProd(item.product_id); const dose=calcDose(prod,nPombos)
        let val=''
        if(campo.key==='agua'&&prod?.modo==='agua') val=`<b>${prod.nome}</b>${dose?`<br><small style="color:#059669">${dose.linha1} ${dose.linha2}</small>`:''}`
        else if(campo.key==='racao'&&prod&&prod.modo!=='agua') val=`<b>${prod.nome}</b>${dose?`<br><small style="color:#059669">${dose.linha1} ${dose.linha2}</small>`:''}`
        else if(campo.key==='gramas'&&item.racao_g) val=`<b>${item.racao_g}g</b>`
        else if(campo.key==='tipo'&&item.tipo_racao) val=item.tipo_racao
        else if(campo.key==='voo'&&item.voo_min) val=`<b>${item.voo_min} min</b>`
        else if(campo.key==='outros'&&item.outros) val=item.outros
        return `<td style="border:1px solid #e2e8f0;padding:6px 8px;text-align:center;font-size:10px">${val||'<span style=color:#ddd>—</span>'}</td>`
      }).join('')
      return `<tr>${ci===0?`<td rowspan="6" style="border:1px solid #e2e8f0;padding:4px 8px;background:${bg};font-size:9px;font-weight:800;text-transform:uppercase;writing-mode:vertical-rl;text-align:center;width:28px">${lbl}</td>`:''}<td style="border:1px solid #e2e8f0;padding:6px 8px;font-size:10px;font-weight:600;background:#f8fafc">${campo.label}</td>${cells}</tr>`
    })
  })
  const hDias=diasComItens.map(d=>{const dn=calcDN(d.key,plano.dia_prova);return`<th style="border:1px solid #e2e8f0;padding:8px;font-size:10px;background:#1e3a5f;color:#fff;text-align:center;min-width:100px">${d.full}<br><span style="font-size:9px;opacity:.75">${dn}</span></th>`}).join('')
  const espC=ESP_COLOR[plano.especialidade]||'#1e3a5f'
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${plano.nome}</title><style>*{box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1e293b}table{border-collapse:collapse;width:100%}.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;color:#fff;background:${espC}}@media print{.noprint{display:none}}</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px"><div><h1 style="font-size:18px;margin:0 0 4px">🕊️ ${plano.nome}</h1><p style="margin:0;font-size:12px;color:#64748b"><span class="badge">${ESP_LABEL[plano.especialidade]||plano.especialidade}</span> &nbsp;Prova ao ${DIAS_SEMANA.find(d=>d.key===plano.dia_prova)?.full} &nbsp;·&nbsp; ${nPombos} pombo(s)</p></div><button class="noprint" onclick="window.print()" style="padding:8px 18px;background:#1e3a5f;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨️ Imprimir</button></div>
  <table><thead><tr><th style="border:1px solid #e2e8f0;padding:8px;background:#0f172a;color:#fff;font-size:10px;width:28px"></th><th style="border:1px solid #e2e8f0;padding:8px;background:#0f172a;color:#fff;font-size:10px">Campo</th>${hDias}</tr></thead><tbody>${linhas.join('')}</tbody></table>
  ${plano.obs?`<p style="margin-top:12px;font-size:11px;color:#64748b">📝 ${plano.obs}</p>`:''}
  <p style="margin-top:14px;font-size:9px;color:#94a3b8">Gerado por Fly2Win · ${new Date().toLocaleDateString('pt-PT')}</p>
  <script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`
  const w=window.open('','_blank'); w.document.write(html); w.document.close()
}

// ── valores iniciais ──────────────────────────────────────────────────────────
const ITEM_VAZIO = (per='manha') => ({ periodo:per, dia_semana:'quarta', product_id:'', racao_g:'', tipo_racao:'', voo_min:'', outros:'', notas:'' })
// Gera itens pré-preenchidos para os 7 dias × manhã e tarde
function gerarItensSemana() {
  const dias = ['segunda','terca','quarta','quinta','sexta','sabado','domingo']
  return dias.flatMap(dia => [
    { periodo:'manha', dia_semana:dia, product_id:'', racao_g:'', tipo_racao:'', voo_min:'', outros:'', notas:'' },
    { periodo:'tarde', dia_semana:dia, product_id:'', racao_g:'', tipo_racao:'', voo_min:'', outros:'', notas:'' },
  ])
}
const PLANO_VAZIO = { nome:'', especialidade:'velocidade', dia_prova:'domingo', itens:gerarItensSemana(), obs:'' }

// produto unificado (armazém)
const PROD_VAZIO = {
  nome:'', categoria:'Suplemento',
  // campos de uso (ex-biblioteca)
  modo:'agua', dosagem_valor:'', dosagem_unidade:'ml', dosagem_base:'litro', obs_uso:'',
  // campos de stock (ex-stock)
  qtd:'', unidade:'ml', qtd_minima:'', margem_dias:'7', validade:'', preco:'', obs_stock:'',
}

// ── estilos ───────────────────────────────────────────────────────────────────
const S = {
  card: { background:'#0B1830', border:'1px solid #1B2D52', borderRadius:12, padding:'14px 16px' },
  th:   { border:'1px solid #162040', padding:'10px', fontSize:11, fontWeight:700, textAlign:'center', whiteSpace:'nowrap' },
  td:   { border:'1px solid #162040', padding:'6px 8px', fontSize:11, textAlign:'center', verticalAlign:'top', position:'relative' },
  pill: (color) => ({ display:'inline-block', padding:'2px 8px', borderRadius:12, fontSize:10, fontWeight:700, background:`${color}22`, color, border:`1px solid ${color}44` }),
}

// ── célula editável inline ────────────────────────────────────────────────────
function CelulaEditavel({ valor, placeholder, tipo='text', opcoesSelect, onChange }) {
  const [ed, setEd] = useState(false)
  const [val, setVal] = useState(valor||'')
  useEffect(()=>setVal(valor||''),[valor])
  const ok = () => { setEd(false); if(val!==valor) onChange(val) }
  const s = { background:'transparent', border:'none', borderBottom:'1px solid #4C8DFF', color:'#fff', fontSize:11, width:'100%', padding:'2px 0', outline:'none', fontFamily:'inherit' }
  if(!ed) return (
    <div onClick={()=>setEd(true)} style={{ cursor:'pointer', minHeight:18, color:val?'#e2e8f0':'#334155', fontSize:11, padding:'1px 2px', borderRadius:4 }}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(76,141,255,.08)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      {val||<span style={{ fontSize:10, color:'#334155', fontStyle:'italic' }}>{placeholder||'—'}</span>}
    </div>
  )
  if(opcoesSelect) return (
    <select value={val} onChange={e=>setVal(e.target.value)} onBlur={ok} autoFocus style={s}>
      <option value="">—</option>
      {opcoesSelect.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  )
  return <input type={tipo} value={val} onChange={e=>setVal(e.target.value)} onBlur={ok} onKeyDown={e=>{if(e.key==='Enter')ok();if(e.key==='Escape'){setVal(valor||'');setEd(false)}}} style={s} placeholder={placeholder} autoFocus />
}

// ── tabela de plano ───────────────────────────────────────────────────────────
function TabelaPlano({ plano, produtos, nPombos, alertasStock, estado, overrides, onToggleDia, onOverride, hojeKey, modoEdicao, onUpdItem }) {
  const getProd = id => produtos.find(p=>p.id===id)
  const diasComItens = DIAS_SEMANA.filter(d=>(plano.itens||[]).some(i=>i.dia_semana===d.key))
  if(diasComItens.length===0) return <div style={{ textAlign:'center', padding:32, color:'#475569', fontSize:13 }}>Sem dias de tratamento. Adicione itens abaixo.</div>

  const campos = [
    { key:'produto', label:'Produto / Dose' },
    { key:'gramas',  label:'Ração (g)' },
    { key:'tipo',    label:'Tipo Ração' },
    { key:'voo',     label:'Voo (min)' },
    { key:'outros',  label:'Outros' },
  ]

  return (
    <div style={{ overflowX:'auto', borderRadius:12, border:'1px solid #162040' }}>
      <table style={{ borderCollapse:'collapse', width:'100%', minWidth:diasComItens.length*130+160 }}>
        <thead>
          <tr>
            <th style={{ ...S.th, background:'#050D1A', color:'#475569', width:36, borderRight:'2px solid #1E5FD9' }}></th>
            <th style={{ ...S.th, background:'#050D1A', color:'#7A8699', textAlign:'left', paddingLeft:12, minWidth:110, borderRight:'2px solid #1E5FD9' }}>Campo</th>
            {diasComItens.map(d=>{
              const dn=calcDN(d.key,plano.dia_prova); const isHoje=d.key===hojeKey; const isProva=dn==='Prova'
              return (
                <th key={d.key} style={{ ...S.th, background:isHoje?'rgba(212,175,55,.12)':isProva?'rgba(45,212,167,.08)':'#070F20', color:isHoje?'#D4AF37':isProva?'#2DD4A7':'#94a3b8', minWidth:130 }}>
                  {d.full}{isHoje&&<span style={{ fontSize:9, marginLeft:4 }}>● HOJE</span>}
                  <div style={{ fontSize:10, marginTop:2, fontWeight:800, color:isProva?'#2DD4A7':'#D4AF37', opacity:isProva||isHoje?1:.7 }}>{dn}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {['manha','tarde'].map(per=>{
            const isM=per==='manha'; const perColor=isM?'#F59E0B':'#60A5FA'
            return campos.map((campo,ci)=>(
              <tr key={`${per}_${campo.key}`} style={{ background:ci%2===0?'rgba(11,24,48,.6)':'rgba(7,15,32,.4)' }}>
                {ci===0&&(
                  <td rowSpan={campos.length} style={{ ...S.td, background:isM?'rgba(245,158,11,.06)':'rgba(96,165,250,.06)', borderRight:'2px solid #1E5FD9', padding:0, width:36 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', minHeight:130 }}>
                      <div style={{ writingMode:'vertical-rl', transform:'rotate(180deg)', fontSize:10, fontWeight:800, color:perColor, letterSpacing:2, textTransform:'uppercase' }}>
                        {isM?'🌅 Manhã':'🌆 Tarde'}
                      </div>
                    </div>
                  </td>
                )}
                <td style={{ ...S.td, background:'#070F20', textAlign:'left', paddingLeft:12, color:'#7A8699', fontWeight:600, borderRight:'2px solid #1E5FD9', whiteSpace:'nowrap' }}>{campo.label}</td>
                {diasComItens.map(d=>{
                  const item=(plano.itens||[]).find(i=>i.dia_semana===d.key&&(per==='manha'?i.periodo!=='tarde':i.periodo==='tarde'))
                  const realIdx=item?(plano.itens||[]).indexOf(item):-1
                  const chave=`${d.key}_${per}`
                  const feito=!!estado?.[chave]
                  const isHoje=d.key===hojeKey
                  const ovKey=`${chave}_${campo.key}`
                  const ovVal=overrides?.[ovKey]
                  const temOv=ovVal!==undefined
                  const prod=item?getProd(item.product_id):null
                  const dose=calcDose(prod,nPombos)
                  const stkBaixo=prod&&alertasStock?.some(a=>a.nome?.toLowerCase()===prod.nome?.toLowerCase())

                  const tdStyle={ ...S.td, background:feito?'rgba(45,212,167,.05)':isHoje?'rgba(212,175,55,.04)':'transparent', outline:temOv?'1px solid rgba(167,139,250,.4)':undefined }
                  if(!item) return <td key={d.key} style={{ ...tdStyle, color:'#1B2D52' }}>—</td>

                  const checkbox=!modoEdicao&&onToggleDia&&campo.key==='produto'&&(
                    <button onClick={()=>onToggleDia(d.key,per)} style={{ position:'absolute', top:4, right:4, width:18, height:18, borderRadius:4, border:feito?'none':'1px solid #1B2D52', background:feito?'#2DD4A7':'transparent', cursor:'pointer', fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                      {feito&&'✓'}
                    </button>
                  )

                  let conteudo=null
                  if(modoEdicao) {
                    if(campo.key==='produto') conteudo=(
                      <div>
                        <CelulaEditavel valor={item.product_id} opcoesSelect={produtos.map(p=>({value:p.id,label:`${MODO_ICON[p.modo]} ${p.nome}`}))} onChange={v=>onUpdItem(realIdx,'product_id',v)} placeholder='— produto —' />
                        {prod&&dose&&<div style={{ fontSize:10, color:'#2DD4A7', marginTop:3 }}>{dose.linha1}<br/>{dose.linha2}</div>}
                      </div>
                    )
                    else if(campo.key==='gramas') conteudo=<CelulaEditavel valor={item.racao_g} tipo='number' placeholder='g' onChange={v=>onUpdItem(realIdx,'racao_g',v)} />
                    else if(campo.key==='tipo') conteudo=<CelulaEditavel valor={item.tipo_racao} opcoesSelect={RACOES_COMERCIAIS} onChange={v=>onUpdItem(realIdx,'tipo_racao',v)} placeholder='ração' />
                    else if(campo.key==='voo') conteudo=<CelulaEditavel valor={item.voo_min} tipo='number' placeholder='min' onChange={v=>onUpdItem(realIdx,'voo_min',v)} />
                    else if(campo.key==='outros') conteudo=<CelulaEditavel valor={item.outros} placeholder='banho…' onChange={v=>onUpdItem(realIdx,'outros',v)} />
                  } else {
                    if(campo.key==='produto') conteudo=(
                      <div style={{ paddingRight:22 }}>
                        {prod?<>
                          <div style={{ fontWeight:600, color:feito?'#475569':'#e2e8f0', textDecoration:feito?'line-through':'none' }}>{MODO_ICON[prod.modo]} {prod.nome}</div>
                          {dose&&<><div style={{ fontSize:10, color:feito?'#334155':'#2DD4A7', marginTop:2 }}>{dose.linha1}</div><div style={{ fontSize:10, color:'#34d399' }}>{dose.linha2}</div></>}
                          {stkBaixo&&<div style={{ fontSize:10, color:'#f87171', marginTop:2 }}>⚠️ stock baixo</div>}
                          {prod.qtd>0&&<div style={{ fontSize:10, color:'#475569', marginTop:1 }}>📦 {prod.qtd}{prod.unidade}</div>}
                        </>:<span style={{ color:'#334155', fontSize:10 }}>Produto removido</span>}
                        {temOv&&<span style={{ position:'absolute', top:3, left:3, fontSize:9, color:'#A78BFA' }} title="Ajustado esta semana">✱</span>}
                      </div>
                    )
                    else {
                      const v=ovVal??(campo.key==='gramas'?item.racao_g:campo.key==='tipo'?item.tipo_racao:campo.key==='voo'?item.voo_min:item.outros)
                      const cor=campo.key==='voo'?'#60A5FA':campo.key==='gramas'?'#e2e8f0':'#94a3b8'
                      conteudo=(
                        <div style={{ position:'relative' }}>
                          {v?<span style={{ color:cor, fontWeight:campo.key==='gramas'||campo.key==='voo'?600:400 }}>{v}{campo.key==='gramas'?'g':campo.key==='voo'?' min':''}</span>:<span style={{ color:'#1B2D52', fontSize:10 }}>—</span>}
                          {temOv&&<span style={{ marginLeft:4, fontSize:9, color:'#A78BFA' }}>✱</span>}
                          {onOverride&&<button onClick={()=>onOverride(ovKey,v||'',campo)} style={{ position:'absolute', bottom:0, right:0, background:'none', border:'none', cursor:'pointer', fontSize:9, color:temOv?'#A78BFA':'#1B2D52', padding:0 }} title="Ajustar esta semana">✱</button>}
                        </div>
                      )
                    }
                  }

                  return <td key={d.key} style={tdStyle}>{checkbox}{conteudo}</td>
                })}
              </tr>
            ))
          })}
        </tbody>
      </table>
      {!modoEdicao&&overrides&&Object.keys(overrides).length>0&&(
        <div style={{ padding:'8px 14px', background:'rgba(167,139,250,.06)', borderTop:'1px solid #162040', fontSize:11, color:'#A78BFA' }}>
          ✱ Células marcadas têm ajuste semanal — não afectam o plano base
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function Alimentacao({ nav }) {
  const toast = useToast()
  const { t } = useIdioma()

  const [produtos, setProdutos]     = useState([])   // armazém unificado
  const [planos, setPlanos]         = useState([])
  const [aplicacoes, setAplicacoes] = useState([])
  const [pombos, setPombos]         = useState([])
  const [loading, setLoading]       = useState(true)

  const [tab, setTab]               = useState('hoje')
  const [vistaTabela, setVistaTabela]     = useState(true)
  const [vistaPlanoTabela, setVistaPlanoTabela] = useState(false)
  const [filtroCat, setFiltroCat]   = useState('todos')
  const [filtroModo, setFiltroModo] = useState('todos')

  const [modal, setModal]           = useState(null)
  const [selected, setSelected]     = useState(null)
  const [saving, setSaving]         = useState(false)
  const [confirm, setConfirm]       = useState(null)

  const [formProd, setFormProd]     = useState(PROD_VAZIO)
  const [formPlano, setFormPlano]   = useState(PLANO_VAZIO)
  const sfpr = (k,v) => setFormProd(f=>({...f,[k]:v}))
  const sfp  = (k,v) => setFormPlano(f=>({...f,[k]:v}))

  const [overrides, setOverrides]   = useState({})
  const [modalOverride, setModalOverride] = useState(null)
  const [expandidos, setExpandidos]   = useState({})
  const [mlPorPombo, setMlPorPombo]   = useState(60)
  const [modalAbate, setModalAbate]   = useState(null)

  const [modalPombos, setModalPombos]   = useState(false)
  const [pombosSel, setPombosSel]       = useState([])
  const [savingPombos, setSavingPombos] = useState(false)

  const [modalAplicar, setModalAplicar]         = useState(false)
  const [planoParaAplicar, setPlanoParaAplicar] = useState(null)
  const [pombosAplicar, setPombosAplicar]       = useState([])
  const [savingAplicar, setSavingAplicar]       = useState(false)

  const [calcPombos, setCalcPombos] = useState('20')
  const [calcG, setCalcG]           = useState('35')
  const [calcDias, setCalcDias]     = useState('7')

  const [provasFuturas, setProvasFuturas] = useState([])
  const [meteoProva, setMeteoProva]       = useState({})
  const [alertaIgnorado, setAlertaIgnorado] = useState({})
  const DIAS_ANTES = { velocidade:4, 'meio-fundo':6, meio_fundo:6, fundo:7, 'grande-fundo':9, grande_fundo:9 }
  const PLANO_REC  = { velocidade:'Pre-Competicao', 'meio-fundo':'Pre-Competicao', meio_fundo:'Pre-Competicao', fundo:'Preparacao Fundo', 'grande-fundo':'Preparacao Fundo', grande_fundo:'Preparacao Fundo' }

  // ── load ──────────────────────────────────────────────────────────────────
  // Armazém: unifica getTreatmentProducts + getStock pelo nome
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, st, pl, ap, pb] = await Promise.all([
        db.getTreatmentProducts(), db.getStock(),
        db.getTreatmentPlans(), db.getTreatmentApplications(), db.getPombos(),
      ])
      // Merge: produto base da biblioteca + dados de stock pelo nome
      const merged = pr.map(p => {
        const stk = st.find(s => s.nome.toLowerCase()===p.nome.toLowerCase())
        return { ...p, qtd:stk?.qtd??0, unidade:stk?.unidade??p.dosagem_unidade??'ml', qtd_minima:stk?.qtd_minima??null, margem_dias:stk?.margem_dias??7, validade:stk?.validade??null, preco:stk?.preco??null, obs_stock:stk?.obs??'', _stock_id:stk?.id??null, categoria:p.categoria??stk?.tipo??'Outro' }
      })
      // Itens só no stock (sem produto na biblioteca)
      const nomesLib = pr.map(p=>p.nome.toLowerCase())
      const soStock = st.filter(s=>!nomesLib.includes(s.nome.toLowerCase())).map(s=>({
        id:`stk_${s.id}`, _stock_id:s.id, nome:s.nome, categoria:s.tipo||'Outro',
        modo:null, dosagem_valor:null, dosagem_unidade:null, dosagem_base:null, obs_uso:'',
        qtd:s.qtd, unidade:s.unidade, qtd_minima:s.qtd_minima, margem_dias:s.margem_dias??7,
        validade:s.validade, preco:s.preco, obs_stock:s.obs||'', _soStock:true,
      }))
      setProdutos([...merged, ...soStock])
      setPlanos(pl); setAplicacoes(ap); setPombos(pb)
    } catch(e) { toast('Erro: '+e.message,'err') }
    finally { setLoading(false) }
  }, [])
  useEffect(()=>{ load() },[load])

  useEffect(()=>{
    const carregar = async () => {
      try {
        const { supabase } = await import('../lib/supabase')
        const hoje = new Date().toISOString().slice(0,10)
        const limite = new Date(Date.now()+21*86400000).toISOString().slice(0,10)
        const { data } = await supabase.from('races').select('id,nome,data_reg,tipo,local_solta,lat_solta,lon_solta,dist').gte('data_reg',hoje).lte('data_reg',limite).order('data_reg')
        setProvasFuturas(data||[])
        ;(data||[]).filter(r=>r.lat_solta&&r.lon_solta).forEach(async r=>{
          try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${r.lat_solta}&longitude=${r.lon_solta}&daily=precipitation_sum,windspeed_10m_max,temperature_2m_max&timezone=auto&start_date=${r.data_reg}&end_date=${r.data_reg}`)
            const j = await res.json()
            setMeteoProva(m=>({...m,[r.id]:{prec:j.daily?.precipitation_sum?.[0]??0,vento:j.daily?.windspeed_10m_max?.[0]??0,temp:j.daily?.temperature_2m_max?.[0]??0}}))
          } catch {}
        })
      } catch {}
    }
    carregar()
  },[])

  // ── computed ──────────────────────────────────────────────────────────────
  const semanaAtual    = segundaFeira()
  const aplicacaoAtiva = aplicacoes.find(a=>a.semana_inicio===semanaAtual)
  const planoAtivo     = aplicacaoAtiva?planos.find(p=>p.id===aplicacaoAtiva.plan_id):null
  const getProd        = id => produtos.find(p=>p.id===id)
  const efectivo       = pombos.filter(p=>(!p.estado_ext||p.estado_ext==='proprio')&&p.estado==='ativo')
  const nPombos        = aplicacaoAtiva?.pombos_ids?.length||aplicacaoAtiva?.n_pombos||0
  const hojeKey        = diaHojeKey()

  const G_DIA = 35
  const consumoDiarioKg = (efectivo.length*G_DIA)/1000

  // alertas com margem
  const alertasStock = produtos.filter(p => {
    if(!p.qtd_minima||p.qtd===undefined) return false
    const m=parseFloat(p.margem_dias||7)
    const extra=['Cereal','Ração Comercial'].includes(p.categoria)?consumoDiarioKg*m:0
    return p.qtd<=parseFloat(p.qtd_minima)+extra
  })
  const validadeProxima = produtos.filter(p=>p.validade&&(new Date(p.validade)-new Date())/86400000<=30)

  function diasParaEsgotar(prod) {
    if(!['Cereal','Ração Comercial'].includes(prod.categoria)||consumoDiarioKg<=0) return null
    const kg=prod.unidade==='g'?prod.qtd/1000:prod.unidade==='kg'?prod.qtd:null
    return kg===null?null:Math.floor(kg/consumoDiarioKg)
  }

  const itensDia = (dia,per) => (planoAtivo?.itens||[]).filter(i=>i.dia_semana===dia&&(per==='manha'?i.periodo!=='tarde':i.periodo==='tarde'))
  const temHoje = itensDia(hojeKey,'manha').length>0||itensDia(hojeKey,'tarde').length>0

  const toggleDia = async (diaKey, per, itensAbateItem) => {
    if(!aplicacaoAtiva) return
    const chave=`${diaKey}_${per}`
    const jaFeito = !!aplicacaoAtiva.estado_dias?.[chave]
    if (!jaFeito && itensAbateItem && itensAbateItem.length > 0) {
      setModalAbate({ chave, itens: itensAbateItem.map(x=>x.item).filter(Boolean), per, diaKey })
      return
    }
    try {
      const novo={...aplicacaoAtiva.estado_dias,[chave]:jaFeito?false:true}
      await db.updateTreatmentApplication(aplicacaoAtiva.id,{estado_dias:novo}); load()
    } catch(e){toast('Erro','err')}
  }

  const confirmarAbate = async (chave, itensAbate) => {
    try {
      const novo={...aplicacaoAtiva.estado_dias,[chave]:true}
      await db.updateTreatmentApplication(aplicacaoAtiva.id,{estado_dias:novo})
      for (const { prod, qty } of itensAbate) {
        if (!prod || !prod._stock_id || !qty) continue
        const novaQtd = Math.max(0, (prod.qtd || 0) - qty)
        await db.updateStockItem(prod._stock_id, { qtd: novaQtd })
      }
      toast('Feito! Stock actualizado.','ok')
      setModalAbate(null); load()
    } catch(e){ toast('Erro ao actualizar stock','err') }
  }

  // overrides
  useEffect(()=>{ if(aplicacaoAtiva?.overrides_semana) setOverrides(aplicacaoAtiva.overrides_semana); else setOverrides({}) },[aplicacaoAtiva?.id])

  const abrirOverride = (ovKey,valAtual,campo) => setModalOverride({ovKey,valor:valAtual,campo})
  const guardarOverride = async (ovKey,novoVal) => {
    const nov={...overrides}
    if(novoVal===''||novoVal===null) delete nov[ovKey]; else nov[ovKey]=novoVal
    setOverrides(nov)
    if(aplicacaoAtiva) { try{ await db.updateTreatmentApplication(aplicacaoAtiva.id,{overrides_semana:nov}) }catch(e){} }
    setModalOverride(null); toast('Ajuste guardado!','ok')
  }
  const guardarVariante = async () => {
    if(!planoAtivo||Object.keys(overrides).length===0) return
    const novosItens=(planoAtivo.itens||[]).map(item=>{
      const per=item.periodo==='tarde'?'tarde':'manha'; const chave=`${item.dia_semana}_${per}`
      const n={...item}
      const og=overrides[`${chave}_gramas`]; if(og!==undefined) n.racao_g=og
      const ot=overrides[`${chave}_tipo`];   if(ot!==undefined) n.tipo_racao=ot
      const ov=overrides[`${chave}_voo`];    if(ov!==undefined) n.voo_min=ov
      const oo=overrides[`${chave}_outros`]; if(oo!==undefined) n.outros=oo
      return n
    })
    try {
      const novoNome=`${planoAtivo.nome} (variante ${new Date().toLocaleDateString('pt-PT')})`
      await db.createTreatmentPlan({nome:novoNome,especialidade:planoAtivo.especialidade,dia_prova:planoAtivo.dia_prova,itens:novosItens,obs:planoAtivo.obs})
      toast(`Guardado como variante!`,'ok'); load()
    } catch(e){toast('Erro','err')}
  }

  // ── produto CRUD (armazém unificado) ─────────────────────────────────────
  const openNewProd = () => { setFormProd(PROD_VAZIO); setSelected(null); setModal('produto') }
  const openEditProd = p => {
    setSelected(p)
    setFormProd({ nome:p.nome, categoria:p.categoria||'Outro', modo:p.modo||'agua', dosagem_valor:p.dosagem_valor||'', dosagem_unidade:p.dosagem_unidade||'ml', dosagem_base:p.dosagem_base||'litro', obs_uso:p.obs_uso||p.obs||'', qtd:String(p.qtd||0), unidade:p.unidade||'ml', qtd_minima:String(p.qtd_minima||''), margem_dias:String(p.margem_dias||7), validade:p.validade||'', preco:String(p.preco||''), obs_stock:p.obs_stock||'' })
    setModal('produto')
  }
  const saveProd = async () => {
    if(!formProd.nome.trim()){toast('Nome obrigatório','warn');return}
    setSaving(true)
    try {
      const prodPayload = { nome:formProd.nome.trim(), modo:formProd.modo, dosagem_valor:parseFloat(formProd.dosagem_valor)||null, dosagem_unidade:formProd.dosagem_unidade, dosagem_base:formProd.dosagem_base, categoria:formProd.categoria, obs:formProd.obs_uso }
      const stockPayload = { nome:formProd.nome.trim(), tipo:formProd.categoria, qtd:parseFloat(formProd.qtd)||0, unidade:formProd.unidade, qtd_minima:formProd.qtd_minima?parseFloat(formProd.qtd_minima):null, margem_dias:formProd.margem_dias?parseInt(formProd.margem_dias):7, validade:formProd.validade||null, preco:formProd.preco?parseFloat(formProd.preco):null, obs:formProd.obs_stock }

      if(selected && !selected._soStock) {
        await db.updateTreatmentProduct(selected.id, prodPayload)
        if(selected._stock_id) await db.updateStockItem(selected._stock_id, stockPayload)
        else await db.createStockItem(stockPayload)
      } else if(selected?._soStock) {
        await db.createTreatmentProduct(prodPayload)
        await db.updateStockItem(selected._stock_id, stockPayload)
      } else {
        await db.createTreatmentProduct(prodPayload)
        await db.createStockItem(stockPayload)
      }
      toast(selected?'Actualizado!':'Produto criado!','ok'); setModal(null); setSelected(null); load()
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setSaving(false)}
  }
  const delProd = async () => {
    try {
      const p=confirm.item
      if(!p._soStock&&!p.id?.startsWith('stk_')) await db.deleteTreatmentProduct(p.id)
      if(p._stock_id) await db.deleteStockItem(p._stock_id)
      toast('Eliminado','ok'); setConfirm(null); load()
    } catch(e){toast('Erro','err')}
  }
  const ajustarQtd = async (prod, delta) => {
    if(!prod._stock_id){toast('Sem registo de stock','warn');return}
    try{ await db.updateStockItem(prod._stock_id,{qtd:Math.max(0,(prod.qtd||0)+delta)}); load() }
    catch(e){toast('Erro','err')}
  }

  // ── plano CRUD ────────────────────────────────────────────────────────────
  const openNewPlano  = () => { setFormPlano({...PLANO_VAZIO, itens:gerarItensSemana()}); setSelected(null); setModal('plano') }
  const openEditPlano = p  => { setSelected(p); setFormPlano({nome:p.nome,especialidade:p.especialidade||'geral',dia_prova:p.dia_prova||'domingo',itens:JSON.parse(JSON.stringify(p.itens||[])),obs:p.obs||''}); setModal('plano') }
  const addItem = per => setFormPlano(f=>({...f,itens:[...f.itens,ITEM_VAZIO(per)]}))
  const updItem = (i,k,v) => setFormPlano(f=>({...f,itens:f.itens.map((it,idx)=>idx===i?{...it,[k]:v}:it)}))
  const delItem = i => setFormPlano(f=>({...f,itens:f.itens.filter((_,idx)=>idx!==i)}))
  const savePlano = async () => {
    if(!formPlano.nome.trim()){toast('Nome obrigatório','warn');return}
    setSaving(true)
    try {
      const payload={nome:formPlano.nome.trim(),especialidade:formPlano.especialidade,dia_prova:formPlano.dia_prova,itens:formPlano.itens,obs:formPlano.obs}
      selected?await db.updateTreatmentPlan(selected.id,payload):await db.createTreatmentPlan(payload)
      toast(selected?'Plano actualizado!':'Plano criado!','ok'); setModal(null); setSelected(null); load()
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setSaving(false)}
  }
  const delPlano = async () => {
    try{await db.deleteTreatmentPlan(confirm.item.id);toast('Eliminado','ok');setConfirm(null);load()}
    catch(e){toast('Erro','err')}
  }

  // ── aplicar plano ─────────────────────────────────────────────────────────
  const abrirAplicar = (plano) => {
    setPlanoParaAplicar(plano)
    const sug=plano.especialidade&&plano.especialidade!=='geral'?efectivo.filter(p=>(p.esp||[]).includes(plano.especialidade)).map(p=>p.id):efectivo.map(p=>p.id)
    setPombosAplicar(sug); setModalAplicar(true)
  }
  const confirmarAplicar = async () => {
    if(pombosAplicar.length===0){toast('Seleccione pombos','warn');return}
    setSavingAplicar(true)
    try {
      await db.createTreatmentApplication({plan_id:planoParaAplicar.id,semana_inicio:semanaAtual,pombos_ids:pombosAplicar,n_pombos:pombosAplicar.length,estado_dias:{},overrides_semana:{}})
      toast('Plano aplicado!','ok'); setModalAplicar(false); load()
    } catch(e){toast('Erro: '+e.message,'err')}
    finally{setSavingAplicar(false)}
  }
  const encerrarAplicacao = async () => {
    try{await db.deleteTreatmentApplication(aplicacaoAtiva.id);toast('Plano removido','ok');setOverrides({});load()}
    catch(e){toast('Erro','err')}
  }
  const abrirEditarPombos = () => { setPombosSel(aplicacaoAtiva?.pombos_ids||[]); setModalPombos(true) }
  const salvarPombos = async () => {
    if(pombosSel.length===0){toast('Seleccione pombos','warn');return}
    setSavingPombos(true)
    try{ await db.updateTreatmentApplication(aplicacaoAtiva.id,{pombos_ids:pombosSel,n_pombos:pombosSel.length}); toast('Guardado!','ok'); setModalPombos(false); load() }
    catch(e){toast('Erro','err')}
    finally{setSavingPombos(false)}
  }
  const toggleSel=(id,setter)=>setter(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])

  const avisosStockAplicar=(() => {
    if(!planoParaAplicar) return []
    const n=pombosAplicar.length,av=[]
    planoParaAplicar.itens.forEach(it=>{
      const prod=getProd(it.product_id)
      if(!prod?.dosagem_valor||prod.qtd===undefined) return
      const nec=prod.dosagem_base==='pombo'?prod.dosagem_valor*n:prod.dosagem_valor
      if(prod.qtd<nec) av.push(`${prod.nome}: precisa ~${nec}${prod.dosagem_unidade||''}, tem ${prod.qtd}${prod.unidade||''}`)
    })
    return av
  })()

  // calculadora
  const consumoCalc=(parseFloat(calcPombos)||0)*(parseFloat(calcG)||0)*(parseFloat(calcDias)||0)/1000

  // armazém filtrado
  const prodsFiltrados = produtos.filter(p=>{
    if(filtroCat!=='todos'&&p.categoria!==filtroCat) return false
    if(filtroModo!=='todos'&&p.modo!==filtroModo) return false
    return true
  })

  // render lista de periodo -- expansivel com guia pratico
  const renderLista = (itens, per) => {
    if(itens.length===0) return null
    const isM = per==='manha'
    return (
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11,fontWeight:700,color:isM?'#F59E0B':'#60A5FA',textTransform:'uppercase',letterSpacing:1,marginBottom:6 }}>{isM?'🌅 Manhã':'🌆 Tarde'}</div>
        {itens.map((item,i)=>{
          const chave=`${item.dia_semana}_${per}`
          const exKey=`${chave}_${i}`
          const feito=!!aplicacaoAtiva?.estado_dias?.[chave]
          const prod=getProd(item.product_id)
          const dose=calcDose(prod,nPombos)
          const stkBaixo=prod&&alertasStock.some(a=>a.nome?.toLowerCase()===prod.nome?.toLowerCase())
          const racaoHerdada=racaoGDoPeriodo(planoAtivo?.itens||[],item.dia_semana,per)
          const abate=calcAbate(prod,item,nPombos,mlPorPombo,racaoHerdada)
          const abatesRacao=calcAbateRacao(item,nPombos,produtos)
          const guia=gerarGuia(prod,item,nPombos,mlPorPombo)
          const expandido=!!expandidos[exKey]
          // juntar abate do produto + abates de racao (sem duplicados por prod._stock_id)
          const todosAbates = [
            ...(abate ? [{ item, prod, qty:abate.qty }] : []),
            ...abatesRacao.map(ar=>({ item, prod:ar.prod, qty:ar.qty, unidade:'g', isRacao:true, nome:ar.nome, pct:ar.pct }))
          ]
          return (
            <div key={i} style={{ ...S.card, marginBottom:6, borderColor:feito?'rgba(45,212,167,.3)':expandido?'rgba(76,141,255,.3)':undefined, padding:0, overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px' }}>
                <button onClick={()=>toggleDia(item.dia_semana, per, todosAbates)}
                  style={{ width:22,height:22,borderRadius:6,border:feito?'none':'2px solid #1B2D52',background:feito?'#2DD4A7':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,fontSize:13,marginTop:2 }}>
                  {feito&&'✓'}
                </button>
                <div style={{ flex:1, cursor:'pointer' }} onClick={()=>setExpandidos(e=>({...e,[exKey]:!e[exKey]}))}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      {prod&&<div style={{ fontSize:13,fontWeight:600,color:feito?'#7A8699':'#fff',textDecoration:feito?'line-through':'none' }}>{MODO_ICON[prod.modo]} {prod.nome}</div>}
                      {dose&&<div style={{ fontSize:11,color:'#2DD4A7',marginTop:2 }}>{dose.linha1} {dose.linha2}</div>}
                    </div>
                    <span style={{ fontSize:11,color:'#475569',paddingLeft:8 }}>{expandido?'▲':'▼'}</span>
                  </div>
                  {!expandido&&(
                    <div style={{ display:'flex',flexWrap:'wrap',gap:'2px 12px',fontSize:11,color:'#7A8699',marginTop:3 }}>
                      {item.racao_g&&<span>🌾 {item.racao_g}g/pombo</span>}
                      {item.voo_min&&<span>✈️ {item.voo_min} min</span>}
                      {item.outros&&<span>🛁 {item.outros}</span>}
                      {stkBaixo&&<span style={{color:'#f87171'}}>⚠️ stock baixo</span>}
                    </div>
                  )}
                </div>
              </div>
              {expandido&&(
                <div style={{ background:'rgba(7,15,32,.9)', borderTop:'1px solid #162040', padding:'12px 14px' }}>
                  <div style={{ fontSize:10,fontWeight:700,color:'#4C8DFF',textTransform:'uppercase',letterSpacing:.5,marginBottom:8 }}>📋 Como preparar</div>
                  {guia.map((l,gi)=>(
                    <div key={gi} style={{ display:'flex',gap:8,marginBottom:6,fontSize:12 }}>
                      <span style={{ flexShrink:0 }}>{l.icon}</span>
                      <span style={{ color:'#cbd5e1',lineHeight:1.4 }}>{l.texto}</span>
                    </div>
                  ))}
                  <div style={{ background:'rgba(45,212,167,.06)',border:'1px solid rgba(45,212,167,.15)',borderRadius:8,padding:'7px 10px',marginTop:10 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:abatesRacao.length>0?6:0 }}>
                      <div style={{ fontSize:11,color:'#7A8699' }}>
                        Stock actual: <span style={{ color:stkBaixo?'#f87171':'#2DD4A7',fontWeight:600 }}>{prod?.qtd??'—'}{prod?.unidade}</span>
                      </div>
                      {abate&&<div style={{ fontSize:11,color:'#94a3b8' }}>Abate: <span style={{ color:'#f87171',fontWeight:600 }}>-{abate.qty}{abate.unidade}</span></div>}
                    </div>
                    {abatesRacao.length>0&&(
                      <div style={{ borderTop:'1px solid rgba(45,212,167,.1)',paddingTop:6 }}>
                        <div style={{ fontSize:10,color:'#7A8699',marginBottom:4 }}>🌾 Ração a abater:</div>
                        {abatesRacao.map((ar,ai)=>(
                          <div key={ai} style={{ display:'flex',justifyContent:'space-between',fontSize:11 }}>
                            <span style={{ color:'#cbd5e1' }}>{ar.nome}{ar.pct<1?` (${Math.round(ar.pct*100)}%)`:''}</span>
                            <span style={{ color:'#f87171',fontWeight:600 }}>-{ar.qty}g</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {prod&&prod.modo==='agua'&&(
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:8,fontSize:11,color:'#7A8699' }}>
                      <span>💧 ml/pombo/dia:</span>
                      <input type="number" value={mlPorPombo} onChange={e=>setMlPorPombo(parseInt(e.target.value)||60)}
                        style={{ width:55,background:'#101F40',border:'1px solid #1B2D52',borderRadius:6,padding:'3px 6px',color:'#fff',fontSize:11,textAlign:'center' }} />
                      <span style={{ color:'#475569' }}>→ {arredondarLitros(mlPorPombo*nPombos)}L total</span>
                    </div>
                  )}
                  {prod&&prod.obs&&<div style={{ marginTop:8,fontSize:11,color:'#475569',fontStyle:'italic' }}>ℹ️ {prod.obs}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // TABS
  const TABS=[['hoje','☀️ Hoje'],['semana','📋 Semana'],['auto','🗓️ Auto'],['planos','🗂️ Planos'],['armazem','🏪 Armazém'],['calculadora','🧮 Calc']]
  const btnAdd=()=>{
    if(tab==='planos') return <button className="btn btn-primary" onClick={openNewPlano}>＋ Plano</button>
    if(tab==='armazem') return <button className="btn btn-primary" onClick={openNewProd}>＋ Produto</button>
    return null
  }

  if(loading) return <div style={{ display:'flex',justifyContent:'center',padding:80 }}><Spinner lg /></div>

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Alimentação &amp; Tratamentos</div>
          <div className="section-sub">{planoAtivo?`✅ ${planoAtivo.nome} · ${nPombos} pombos`:'— Sem plano activo esta semana'}</div>
        </div>
        {btnAdd()}
      </div>

      {/* alertas */}
      {(alertasStock.length>0||validadeProxima.length>0)&&(
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:16 }}>
          {alertasStock.length>0&&(
            <div style={{ background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:12,padding:'10px 16px',cursor:'pointer' }} onClick={()=>setTab('armazem')}>
              <div style={{ fontWeight:600,color:'#f87171',marginBottom:4 }}>⚠️ {alertasStock.length} produto(s) a precisar de reposição</div>
              {alertasStock.map(p=><div key={p.id} style={{ fontSize:11,color:'#cbd5e1' }}>{p.nome} — {p.qtd}{p.unidade}</div>)}
            </div>
          )}
          {validadeProxima.length>0&&(
            <div style={{ background:'rgba(234,179,8,.08)',border:'1px solid rgba(234,179,8,.2)',borderRadius:12,padding:'10px 16px' }}>
              <div style={{ fontWeight:600,color:'#D4AF37',marginBottom:4 }}>📅 {validadeProxima.length} produto(s) a expirar em 30 dias</div>
              {validadeProxima.map(p=><div key={p.id} style={{ fontSize:11,color:'#cbd5e1' }}>{p.nome} — {new Date(p.validade).toLocaleDateString('pt-PT')}</div>)}
            </div>
          )}
        </div>
      )}

      {/* banner provas futuras */}
      {provasFuturas.filter(r=>{
        const dias=Math.round((new Date(r.data_reg)-new Date())/86400000)
        return dias>=0&&dias<=(DIAS_ANTES[r.tipo]||5)&&!alertaIgnorado[r.id]
      }).map(r=>{
        const dias=Math.round((new Date(r.data_reg)-new Date())/86400000)
        const mt=meteoProva[r.id]
        const planoSug=planos.find(p=>p.nome?.toLowerCase().includes((PLANO_REC[r.tipo]||'').toLowerCase().slice(0,6)))
        return (
          <div key={r.id} style={{background:'rgba(212,175,55,.08)',border:'1px solid rgba(212,175,55,.25)',borderRadius:12,padding:'12px 14px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:'#D4AF37',marginBottom:3}}>🏁 {r.nome} — daqui a {dias} dia(s)</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>{r.tipo?.replace('_','-')||'—'}{r.dist?` · ${r.dist}km`:''}{r.local_solta?` · Solta: ${r.local_solta}`:''}</div>
                {mt&&<div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>🌡️ {mt.temp}°C · 💨 {mt.vento}km/h · 🌧️ {mt.prec}mm{mt.prec>5?<span style={{color:'#f87171',fontWeight:600}}> ⚠️ Chuva — reforçar electrólitos</span>:null}{mt.vento>40?<span style={{color:'#f87171',fontWeight:600}}> ⚠️ Vento forte</span>:null}</div>}
                {planoSug&&<div style={{fontSize:11,color:'#2DD4A7',marginTop:3}}>💊 Sugerido: <strong>{planoSug.nome}</strong></div>}
              </div>
              <div style={{display:'flex',gap:6}}>
                {planoSug&&<button className='btn btn-primary btn-sm' onClick={()=>{setPlanoParaAplicar(planoSug);setModalAplicar(true)}}>✅ Aplicar</button>}
                <button className='btn btn-secondary btn-sm' onClick={()=>setTab('auto')}>🗓️ Ver</button>
                <button className='btn btn-icon btn-sm' onClick={()=>setAlertaIgnorado(a=>({...a,[r.id]:true}))}>✕</button>
              </div>
            </div>
          </div>
        )
      })}

      {/* tabs */}
      <div style={{ display:'flex',gap:4,background:'#101F40',borderRadius:8,padding:4,marginBottom:16,overflowX:'auto' }}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ flex:'none', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:tab===k?700:500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', border:tab===k?'none':'1px solid rgba(255,255,255,.08)', background:tab===k?'linear-gradient(135deg,#1E5FD9,#1456C0)':'rgba(255,255,255,.05)', color:tab===k?'#fff':'#cbd5e1', boxShadow:tab===k?'0 2px 8px rgba(0,0,0,.3)':'none', transform:tab===k?'translateY(-1px)':'none', transition:'all .15s', minHeight:40 }}>{l}</button>
        ))}
      </div>

      {/* ══ HOJE ══ */}
      {tab==='hoje'&&(
        <div>
          <div style={{ fontSize:12,color:'#94a3b8',marginBottom:12 }}>{new Date().toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long'})}</div>
          {!planoAtivo?(
            <EmptyState icon="☀️" title="Sem plano activo" desc="Aplique um plano em 'Planos'" action={<button className="btn btn-primary" onClick={()=>setTab('planos')}>Ver Planos →</button>} />
          ):!temHoje?(
            <div style={{ ...S.card,textAlign:'center',padding:32 }}>
              <div style={{ fontSize:28,marginBottom:8 }}>✅</div>
              <div style={{ color:'#fff',fontWeight:600,marginBottom:4 }}>Dia de descanso!</div>
              <div style={{ fontSize:12,color:'#7A8699' }}>Hoje não há tratamentos no plano {planoAtivo.nome}.</div>
            </div>
          ):(
            <div>
              <div style={{ background:`linear-gradient(135deg,rgba(30,95,217,.15),rgba(11,24,48,.4))`,border:'1px solid rgba(30,95,217,.3)',borderRadius:12,padding:'14px 18px',marginBottom:16 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8 }}>
                  <div>
                    <div style={{ fontWeight:700,color:'#fff',fontSize:15 }}>{planoAtivo.nome}</div>
                    <div style={{ display:'flex',gap:8,marginTop:4,flexWrap:'wrap' }}>
                      <span style={S.pill(ESP_COLOR[planoAtivo.especialidade]||'#1E5FD9')}>{ESP_LABEL[planoAtivo.especialidade]}</span>
                      <span style={{ fontSize:11,color:'#7A8699' }}>Prova ao {DIAS_SEMANA.find(d=>d.key===planoAtivo.dia_prova)?.full}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex',gap:6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={abrirEditarPombos}>👥 {nPombos} ✏️</button>
                    <button className="btn btn-secondary btn-sm" onClick={()=>imprimirPlano(planoAtivo,produtos,nPombos)}>🖨️</button>
                  </div>
                </div>
              </div>
              {/* doses */}
              {(()=>{
                const todosHoje=[...itensDia(hojeKey,'manha'),...itensDia(hojeKey,'tarde')]
                const prods=[...new Set(todosHoje.map(i=>i.product_id))].map(id=>getProd(id)).filter(Boolean)
                if(!prods.length) return null
                return (
                  <div style={{ background:'rgba(45,212,167,.06)',border:'1px solid rgba(45,212,167,.2)',borderRadius:12,padding:'12px 16px',marginBottom:16 }}>
                    <div style={{ fontWeight:700,color:'#2DD4A7',marginBottom:10,fontSize:12,textTransform:'uppercase',letterSpacing:.5 }}>💊 Doses de hoje · {nPombos} pombos</div>
                    {prods.map(prod=>{
                      const dose=calcDose(prod,nPombos)
                      const insuf=prod.qtd!==undefined&&prod.dosagem_valor&&prod.dosagem_base==='pombo'&&prod.qtd<prod.dosagem_valor*nPombos
                      return (
                        <div key={prod.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid rgba(45,212,167,.1)',fontSize:12 }}>
                          <div>
                            <span style={{ color:'#fff',fontWeight:600 }}>{MODO_ICON[prod.modo]} {prod.nome}</span>
                            <span style={{ color:'#7A8699',marginLeft:8,fontSize:11 }}>{MODO_LABEL[prod.modo]}</span>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            {dose&&<><div style={{ color:'#2DD4A7',fontWeight:700 }}>{dose.linha1}</div><div style={{ color:'#34d399',fontSize:10 }}>{dose.linha2}</div></>}
                            {prod.qtd!==undefined&&<div style={{ fontSize:10,color:insuf?'#f87171':'#475569' }}>📦 {prod.qtd}{prod.unidade}{insuf&&' ⚠️'}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              {renderLista(itensDia(hojeKey,'manha'),'manha')}
              {renderLista(itensDia(hojeKey,'tarde'),'tarde')}
            </div>
          )}
        </div>
      )}

      {/* ══ SEMANA ══ */}
      {tab==='semana'&&(
        <div>
          {!planoAtivo?(
            planos.length===0?(
              <EmptyState icon="🗂️" title="Sem planos" desc="Crie um plano primeiro" action={<button className="btn btn-primary" onClick={()=>setTab('planos')}>Criar →</button>} />
            ):(
              <div>
                <div style={{ fontSize:13,color:'#94a3b8',marginBottom:12 }}>Escolha um plano para aplicar esta semana:</div>
                {planos.map(p=>(
                  <div key={p.id} style={{ ...S.card,marginBottom:8 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,fontWeight:600,color:'#fff' }}>{p.nome}</div>
                        <div style={{ display:'flex',gap:6,marginTop:4 }}><span style={S.pill(ESP_COLOR[p.especialidade]||'#8B5CF6')}>{ESP_LABEL[p.especialidade]}</span><span style={{ fontSize:11,color:'#7A8699' }}>{(p.itens||[]).length} entradas</span></div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={()=>abrirAplicar(p)}>Aplicar esta semana</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ):(
            <div>
              <div style={{ background:'linear-gradient(135deg,rgba(30,95,217,.15),rgba(11,24,48,.4))',border:'1px solid rgba(30,95,217,.3)',borderRadius:12,padding:'14px 18px',marginBottom:16 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8 }}>
                  <div>
                    <div style={{ fontWeight:700,color:'#fff',fontSize:15 }}>{planoAtivo.nome}</div>
                    <div style={{ display:'flex',gap:8,marginTop:4,flexWrap:'wrap',alignItems:'center' }}>
                      <span style={S.pill(ESP_COLOR[planoAtivo.especialidade]||'#1E5FD9')}>{ESP_LABEL[planoAtivo.especialidade]}</span>
                      <span style={{ fontSize:11,color:'#7A8699' }}>semana {new Date(semanaAtual).toLocaleDateString('pt-PT')}</span>
                      {Object.keys(overrides).length>0&&<span style={S.pill('#A78BFA')}>✱ {Object.keys(overrides).length} ajuste(s)</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={abrirEditarPombos}>👥 {nPombos} ✏️</button>
                    {Object.keys(overrides).length>0&&<button className="btn btn-secondary btn-sm" style={{ color:'#A78BFA',borderColor:'rgba(167,139,250,.3)' }} onClick={guardarVariante}>💾 Guardar variante</button>}
                    <button className="btn btn-secondary btn-sm" onClick={()=>imprimirPlano(planoAtivo,produtos,nPombos)}>🖨️</button>
                    <button className="btn btn-secondary btn-sm" onClick={()=>setVistaTabela(v=>!v)}>{vistaTabela?'☰ Lista':'⊞ Tabela'}</button>
                  </div>
                </div>
              </div>
              {vistaTabela?(
                <TabelaPlano plano={planoAtivo} produtos={produtos} nPombos={nPombos} alertasStock={alertasStock} estado={aplicacaoAtiva?.estado_dias} overrides={overrides} onToggleDia={toggleDia} onOverride={abrirOverride} hojeKey={hojeKey} modoEdicao={false} />
              ):(
                DIAS_SEMANA.map(({key,full})=>{
                  const iM=itensDia(key,'manha'),iT=itensDia(key,'tarde')
                  if(!iM.length&&!iT.length) return null
                  const isHoje=key===hojeKey; const dn=calcDN(key,planoAtivo.dia_prova)
                  return (
                    <div key={key} style={{ ...S.card,marginBottom:8,borderColor:isHoje?'rgba(212,175,55,.4)':undefined }}>
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
                        <div style={{ fontWeight:700,color:isHoje?'#D4AF37':'#fff',fontSize:13 }}>{full}{isHoje&&' ← Hoje'}</div>
                        <div style={{ fontSize:11,color:'#D4AF37',fontWeight:700 }}>{dn}</div>
                      </div>
                      {renderLista(iM,'manha')}{renderLista(iT,'tarde')}
                    </div>
                  )
                })
              )}
              <div style={{ textAlign:'center',marginTop:12 }}>
                <button className="btn btn-secondary btn-sm" onClick={encerrarAplicacao}>Remover plano desta semana</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ PLANOS ══ */}
      {tab==='planos'&&(
        planos.length===0
          ?<EmptyState icon="🗂️" title="Sem planos" desc="Construa o primeiro plano de tratamento" action={<button className="btn btn-primary" onClick={openNewPlano}>＋ Novo Plano</button>} />
          :<div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {planos.map(p=>{
                const espC=ESP_COLOR[p.especialidade]||'#8B5CF6'; const isAtivo=planoAtivo?.id===p.id
                return (
                  <div key={p.id} style={{ ...S.card,borderColor:isAtivo?'rgba(45,212,167,.4)':undefined }}>
                    <div style={{ display:'flex',alignItems:'flex-start',gap:12,flexWrap:'wrap' }}>
                      <div style={{ flex:1,minWidth:160 }}>
                        <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:4 }}>
                          <div style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{p.nome}</div>
                          {isAtivo&&<Badge v="green">Activo</Badge>}
                        </div>
                        <div style={{ display:'flex',gap:6,flexWrap:'wrap',alignItems:'center' }}>
                          <span style={S.pill(espC)}>{ESP_LABEL[p.especialidade]}</span>
                          <span style={{ fontSize:11,color:'#7A8699' }}>Prova ao {DIAS_SEMANA.find(d=>d.key===p.dia_prova)?.full?.toLowerCase()}</span>
                          <span style={{ fontSize:11,color:'#475569' }}>· {(p.itens||[]).length} entradas</span>
                        </div>
                        {p.obs&&<div style={{ fontSize:11,color:'#475569',marginTop:6,fontStyle:'italic' }}>{p.obs}</div>}
                      </div>
                      <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={()=>imprimirPlano(p,produtos,nPombos)}>🖨️</button>
                        {!isAtivo&&<button className="btn btn-primary btn-sm" onClick={()=>abrirAplicar(p)}>▶ Aplicar</button>}
                        <button className="btn btn-secondary btn-sm" onClick={()=>openEditPlano(p)}>✏️ Editar</button>
                        <button className="btn btn-icon btn-sm" onClick={()=>setConfirm({tipo:'plano',item:p})}>🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
      )}

      {/* ══ ARMAZÉM ══ */}
      {tab==='armazem'&&(
        <div>
          {/* filtros */}
          <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:8 }}>
            {['todos',...CATEGORIAS].map(c=>(
              <button key={c} onClick={()=>setFiltroCat(c)} className={`chip${filtroCat===c?' active':''}`}>{c==='todos'?'Todos':c}</button>
            ))}
          </div>
          <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:14 }}>
            {['todos','agua','racao','direto','outros'].map(m=>(
              <button key={m} onClick={()=>setFiltroModo(m)} className={`chip${filtroModo===m?' active':''}`} style={{ fontSize:11 }}>
                {m==='todos'?'Todos os modos':`${MODO_ICON[m]||''} ${MODO_LABEL[m]||m}`}
              </button>
            ))}
          </div>
          {prodsFiltrados.length===0
            ?<EmptyState icon="🏪" title="Armazém vazio" desc="Adicione produtos — ficam disponíveis no armazém e nos planos de tratamento" action={<button className="btn btn-primary" onClick={openNewProd}>＋ Novo Produto</button>} />
            :<div className="grid-2">
                {prodsFiltrados.map(p=>{
                  const icon=CAT_ICON[p.categoria]||'📦'
                  const baixo=alertasStock.some(a=>a.id===p.id)
                  const dias=diasParaEsgotar(p)
                  const dose=calcDose(p,nPombos||1)
                  return (
                    <div key={p.id} style={{ ...S.card,borderColor:baixo?'rgba(248,113,113,.3)':undefined }}>
                      {/* header */}
                      <div style={{ display:'flex',alignItems:'flex-start',gap:10,marginBottom:10 }}>
                        <div style={{ fontSize:22 }}>{icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13,fontWeight:700,color:'#fff' }}>{p.nome}</div>
                          <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginTop:3 }}>
                            <span style={{ fontSize:10,color:'#7A8699' }}>{p.categoria}</span>
                            {p.modo&&<span style={{ fontSize:10,color:'#475569' }}>{MODO_LABEL_FULL[p.modo]}</span>}
                          </div>
                        </div>
                        <button className="btn btn-icon btn-sm" onClick={()=>openEditProd(p)}>✏️</button>
                        <button className="btn btn-icon btn-sm" onClick={()=>setConfirm({tipo:'produto',item:p})}>🗑️</button>
                      </div>
                      {/* dosagem */}
                      {dose&&(
                        <div style={{ background:'rgba(45,212,167,.06)',border:'1px solid rgba(45,212,167,.15)',borderRadius:8,padding:'6px 10px',marginBottom:8 }}>
                          <div style={{ fontSize:10,color:'#7A8699',marginBottom:2 }}>Dosagem padrão{nPombos>0?` · ${nPombos} pombos`:''}:</div>
                          <div style={{ fontSize:12,color:'#2DD4A7',fontWeight:600 }}>{dose.linha1}</div>
                          <div style={{ fontSize:11,color:'#34d399' }}>{dose.linha2}</div>
                        </div>
                      )}
                      {/* stock */}
                      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                        <button className="btn btn-icon btn-sm" onClick={()=>ajustarQtd(p,-1)}>−</button>
                        <div style={{ flex:1,textAlign:'center',fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:700,color:baixo?'#f87171':'#fff' }}>{p.qtd??'—'}<span style={{ fontSize:13,color:'#7A8699',fontFamily:'inherit' }}>{p.unidade}</span></div>
                        <button className="btn btn-icon btn-sm" onClick={()=>ajustarQtd(p,1)}>＋</button>
                      </div>
                      {p.qtd_minima&&<div className="progress"><div className="progress-bar" style={{ width:`${Math.min(100,((p.qtd||0)/(p.qtd_minima*3))*100)}%`,background:baixo?'#f87171':'#2DD4A7' }} /></div>}
                      <div style={{ display:'flex',flexDirection:'column',gap:2,marginTop:6 }}>
                        {dias!==null&&<div style={{ fontSize:11,color:dias<=5?'#f87171':dias<=14?'#D4AF37':'#7A8699',fontWeight:dias<=14?600:400 }}>⏳ Esgota em ~{dias} dia{dias!==1?'s':''}</div>}
                        {p.margem_dias&&p.qtd_minima&&<div style={{ fontSize:10,color:'#475569' }}>🔔 Alerta {p.margem_dias}d antes do mínimo</div>}
                        {p.validade&&<div style={{ fontSize:11,color:'#7A8699' }}>📅 Válido até {new Date(p.validade).toLocaleDateString('pt-PT')}</div>}
                        {p.preco&&<div style={{ fontSize:11,color:'#D4AF37' }}>💶 {p.preco}€</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      )}

      {/* ══ CALCULADORA ══ */}
      {/* ══ AUTO ══ */}
      {tab==='auto'&&(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{fontSize:12,color:'#94a3b8',marginBottom:4}}>Provas nas próximas 3 semanas e planos sugeridos por categoria.</div>
          {provasFuturas.length===0
            ?<div style={{textAlign:'center',color:'#475569',padding:32,fontSize:13}}>Sem provas nas próximas 3 semanas</div>
            :provasFuturas.map(r=>{
                const dias=Math.round((new Date(r.data_reg)-new Date())/86400000)
                const ante=DIAS_ANTES[r.tipo]||5
                const fase=dias<0?'recuperacao':dias<=ante?'pre-prova':'aguardar'
                const mt=meteoProva[r.id]
                const planoSug=planos.find(p=>p.nome?.toLowerCase().includes((PLANO_REC[r.tipo]||'').toLowerCase().slice(0,6)))
                const faseCor=fase==='pre-prova'?'#D4AF37':fase==='recuperacao'?'#2DD4A7':'#475569'
                const faseLabel=fase==='pre-prova'?`⚡ Pré-prova (${dias}d)`:fase==='recuperacao'?'🔄 Recuperação':`⏳ Em ${dias} dias`
                return (
                  <div key={r.id} className='card card-p' style={{borderLeft:`3px solid ${faseCor}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <div>
                        <div style={{fontWeight:700,color:'#fff',marginBottom:2}}>{r.nome}</div>
                        <div style={{fontSize:11,color:'#7A8699'}}>{new Date(r.data_reg).toLocaleDateString('pt-PT')} · {r.tipo?.replace('_','-')||'—'}{r.dist?` · ${r.dist}km`:''}</div>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:faseCor}}>{faseLabel}</span>
                    </div>
                    <div style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:'8px 10px',marginBottom:8}}>
                      <div style={{fontSize:11,color:'#cbd5e1'}}>📅 Iniciar tratamento: {new Date(new Date(r.data_reg)-ante*86400000).toLocaleDateString('pt-PT')} ({ante} dias antes)</div>
                      {r.local_solta&&<div style={{fontSize:11,color:'#7A8699',marginTop:2}}>📍 Solta: {r.local_solta}</div>}
                    </div>
                    {mt&&(
                      <div style={{background:'rgba(76,141,255,.06)',border:'1px solid rgba(76,141,255,.15)',borderRadius:8,padding:'8px 10px',marginBottom:8}}>
                        <div style={{fontSize:11,fontWeight:600,color:'#4C8DFF',marginBottom:4}}>🌤️ Previsão no dia da solta</div>
                        <div style={{display:'flex',gap:12,fontSize:11,color:'#94a3b8'}}>
                          <span>🌡️ {mt.temp}°C</span><span>💨 {mt.vento}km/h</span><span>🌧️ {mt.prec}mm</span>
                        </div>
                        {mt.prec>5&&<div style={{fontSize:11,color:'#f87171',marginTop:4,fontWeight:600}}>⚠️ Chuva — reforçar electrólitos e vitaminas B</div>}
                        {mt.vento>40&&<div style={{fontSize:11,color:'#f87171',marginTop:4,fontWeight:600}}>⚠️ Vento forte — ponderar adiamento</div>}
                        {mt.temp>30&&<div style={{fontSize:11,color:'#D4AF37',marginTop:4,fontWeight:600}}>☀️ Calor — aumentar hidratação</div>}
                      </div>
                    )}
                    {planoSug
                      ?<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                          <div style={{fontSize:11,color:'#2DD4A7'}}>💊 Sugerido: <strong>{planoSug.nome}</strong></div>
                          <div style={{display:'flex',gap:6}}>
                            <button className='btn btn-secondary btn-sm' onClick={()=>setTab('planos')}>✏️ Editar</button>
                            <button className='btn btn-primary btn-sm' onClick={()=>{setPlanoParaAplicar(planoSug);setModalAplicar(true)}}>✅ Aplicar</button>
                          </div>
                        </div>
                      :<div style={{fontSize:11,color:'#7A8699'}}>Sem plano compatível — <span style={{color:'#4C8DFF',cursor:'pointer'}} onClick={()=>setTab('planos')}>criar plano</span></div>
                    }
                  </div>
                )
              })
          }
        </div>
      )}

      {tab==='calculadora'&&(
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          <div style={S.card}>
            <div style={{ fontWeight:700,color:'#fff',marginBottom:16 }}>🧮 Consumo de Ração</div>
            <div className="form-grid">
              <Field label="Nº de Pombos"><input className="input" type="number" value={calcPombos} onChange={e=>setCalcPombos(e.target.value)} /></Field>
              <Field label="Gramas/pombo/dia"><input className="input" type="number" value={calcG} onChange={e=>setCalcG(e.target.value)} /></Field>
              <div className="col-2"><Field label="Período (dias)"><input className="input" type="number" value={calcDias} onChange={e=>setCalcDias(e.target.value)} /></Field></div>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginBottom:16 }} onClick={()=>setCalcPombos(String(efectivo.length))}>Usar efectivo activo ({efectivo.length})</button>
            <div style={{ background:'#050D1A',borderRadius:12,padding:20,textAlign:'center' }}>
              <div style={{ fontFamily:"'Fraunces',serif",fontSize:40,fontWeight:700,color:'#2DD4A7' }}>{consumoCalc.toFixed(1)} kg</div>
              <div style={{ fontSize:12,color:'#7A8699',marginTop:4 }}>Consumo total estimado</div>
            </div>
            <div style={{ marginTop:12,fontSize:12,color:'#94a3b8' }}>Repouso/Muda: 25-30g · Pré-competição: 30-35g · Competição: 35-45g · Reprodução: 40-50g</div>
          </div>
          {planoAtivo&&produtos.length>0&&(
            <div style={S.card}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
                <div style={{ fontWeight:700,color:'#fff' }}>💊 Doses — {planoAtivo.nome}</div>
                <button className="btn btn-secondary btn-sm" onClick={abrirEditarPombos}>👥 {nPombos} ✏️</button>
              </div>
              {[...new Set((planoAtivo.itens||[]).map(i=>i.product_id))].map(pid=>{
                const prod=getProd(pid); if(!prod) return null
                const dose=calcDose(prod,nPombos)
                const insuf=prod.qtd!==undefined&&prod.dosagem_valor&&prod.dosagem_base==='pombo'&&prod.qtd<prod.dosagem_valor*nPombos
                return (
                  <div key={pid} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #162040',fontSize:12 }}>
                    <div>
                      <div style={{ color:'#e2e8f0',fontWeight:600 }}>{MODO_ICON[prod.modo]} {prod.nome}</div>
                      <div style={{ color:'#7A8699',fontSize:11 }}>{MODO_LABEL[prod.modo]}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      {dose&&<><div style={{ color:'#2DD4A7',fontWeight:700 }}>{dose.linha1}</div><div style={{ color:'#34d399',fontSize:10 }}>{dose.linha2}</div></>}
                      {prod.qtd!==undefined&&<div style={{ fontSize:10,color:insuf?'#f87171':'#475569' }}>📦 {prod.qtd}{prod.unidade}{insuf&&' ⚠️'}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL PRODUTO (ARMAZÉM) ══ */}
      <Modal open={modal==='produto'} onClose={()=>{setModal(null);setSelected(null)}}
        title={selected?`✏️ ${selected.nome}`:'🏪 Novo Produto'} wide
        footer={<><button className="btn btn-secondary" onClick={()=>{setModal(null);setSelected(null)}}>Cancelar</button><button className="btn btn-primary" onClick={saveProd} disabled={saving}>{saving?<Spinner/>:null}{selected?'Guardar':'Criar'}</button></>}>
        {/* nome + categoria */}
        <div style={{ display:'flex',gap:8,marginBottom:12,flexWrap:'wrap' }}>
          <div style={{ flex:2,minWidth:160 }}>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Nome *</div>
            <select className="input" value={formProd.nome} onChange={e=>sfpr('nome',e.target.value)} style={{ marginBottom:6 }}>
              <option value="">— Sugestões —</option>
              {SUGESTOES_PRODUTOS.map(n=><option key={n}>{n}</option>)}
            </select>
            <input className="input" placeholder="Ou escreva o nome" value={formProd.nome} onChange={e=>sfpr('nome',e.target.value)} />
          </div>
          <div style={{ flex:1,minWidth:130 }}>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Categoria</div>
            <select className="input" value={formProd.categoria} onChange={e=>sfpr('categoria',e.target.value)}>
              {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* separador uso */}
        <div style={{ fontSize:11,fontWeight:700,color:'#D4AF37',textTransform:'uppercase',letterSpacing:1,marginBottom:8,marginTop:4 }}>💊 Modo de Uso</div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:12,flexWrap:'wrap' }}>
          <div style={{ gridColumn:'1/3' }}>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Administração</div>
            <select className="input" value={formProd.modo} onChange={e=>sfpr('modo',e.target.value)}>
              <option value="agua">💧 Na água</option>
              <option value="racao">🌾 Na ração</option>
              <option value="direto">💊 Direto ao pombo</option>
              <option value="outros">🛁 Outros (banho, narinas…)</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Dosagem</div>
            <input className="input" type="number" step="0.1" placeholder="Ex: 15" value={formProd.dosagem_valor} onChange={e=>sfpr('dosagem_valor',e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Unidade</div>
            <select className="input" value={formProd.dosagem_unidade} onChange={e=>sfpr('dosagem_unidade',e.target.value)}>
              {['ml','L','g','kg','comprimidos','medidas','gotas','unidades'].map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'1/3' }}>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Por</div>
            <select className="input" value={formProd.dosagem_base} onChange={e=>sfpr('dosagem_base',e.target.value)}>
              <option value="pombo">Pombo</option>
              <option value="litro">Litro de água</option>
              <option value="kg">Kg de ração</option>
            </select>
          </div>
          <div style={{ gridColumn:'3/5' }}>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Notas de uso</div>
            <input className="input" placeholder="Obs. de administração" value={formProd.obs_uso} onChange={e=>sfpr('obs_uso',e.target.value)} />
          </div>
        </div>

        {/* separador stock */}
        <div style={{ fontSize:11,fontWeight:700,color:'#2DD4A7',textTransform:'uppercase',letterSpacing:1,marginBottom:8 }}>📦 Stock</div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:8 }}>
          <div>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Quantidade</div>
            <input className="input" type="number" step="0.1" placeholder="0" value={formProd.qtd} onChange={e=>sfpr('qtd',e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Unidade</div>
            <select className="input" value={formProd.unidade} onChange={e=>sfpr('unidade',e.target.value)}>
              {UNIDADES.map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Mínimo (alerta)</div>
            <input className="input" type="number" step="0.1" placeholder="Ex: 200" value={formProd.qtd_minima} onChange={e=>sfpr('qtd_minima',e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Margem (dias)</div>
            <input className="input" type="number" placeholder="7" value={formProd.margem_dias} onChange={e=>sfpr('margem_dias',e.target.value)} />
          </div>
          <div style={{ gridColumn:'1/3' }}>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Validade</div>
            <input className="input" type="date" value={formProd.validade} onChange={e=>sfpr('validade',e.target.value)} />
          </div>
          <div style={{ gridColumn:'3/5' }}>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Preço (€)</div>
            <input className="input" type="number" step="0.01" value={formProd.preco} onChange={e=>sfpr('preco',e.target.value)} />
          </div>
        </div>
        <div>
          <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Notas de stock</div>
          <input className="input" placeholder="Fornecedor, lote…" value={formProd.obs_stock} onChange={e=>sfpr('obs_stock',e.target.value)} />
        </div>
        <div style={{ fontSize:11,color:'#475569',marginTop:8 }}>💡 Nome igual ao de outro produto já existente? Os dados são unificados automaticamente.</div>
      </Modal>

      {/* ══ MODAL PLANO ══ */}
      <Modal open={modal==='plano'} onClose={()=>{setModal(null);setSelected(null)}}
        title={selected?`✏️ ${selected.nome}`:'🗂️ Novo Plano de Tratamento'} wide
        footer={<><button className="btn btn-secondary" onClick={()=>{setModal(null);setSelected(null)}}>Cancelar</button><button className="btn btn-primary" onClick={savePlano} disabled={saving}>{saving?<Spinner/>:null}{selected?'Guardar':'Criar Plano'}</button></>}>
        <div style={{ display:'flex',gap:8,marginBottom:16,flexWrap:'wrap' }}>
          <div style={{ flex:2,minWidth:180 }}>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Nome *</div>
            <input className="input" placeholder="Nome do plano" value={formPlano.nome} onChange={e=>sfp('nome',e.target.value)} />
          </div>
          <div style={{ flex:1,minWidth:120 }}>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Especialidade</div>
            <select className="input" value={formPlano.especialidade} onChange={e=>sfp('especialidade',e.target.value)}>{ESPECIALIDADES.map(e=><option key={e} value={e}>{ESP_LABEL[e]}</option>)}</select>
          </div>
          <div style={{ flex:1,minWidth:120 }}>
            <div style={{ fontSize:11,color:'#7A8699',marginBottom:4 }}>Dia de Prova</div>
            <select className="input" value={formPlano.dia_prova} onChange={e=>sfp('dia_prova',e.target.value)}>{DIAS_SEMANA.map(d=><option key={d.key} value={d.key}>{d.full}</option>)}</select>
          </div>
        </div>

        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
          <div style={{ fontSize:12,color:'#94a3b8' }}>{formPlano.itens.length} entrada(s)</div>
          <div style={{ display:'flex',gap:6 }}>
            {produtos.filter(p=>p.modo).length===0&&<span style={{ fontSize:11,color:'#f87171' }}>⚠️ Sem produtos no armazém</span>}
            <button className="btn btn-secondary btn-sm" onClick={()=>setVistaPlanoTabela(v=>!v)}>{vistaPlanoTabela?'☰ Lista':'⊞ Tabela'}</button>
          </div>
        </div>

        {vistaPlanoTabela&&formPlano.itens.length>0&&(
          <div style={{ marginBottom:14 }}>
            <TabelaPlano plano={formPlano} produtos={produtos.filter(p=>p.modo)} nPombos={0} alertasStock={[]} modoEdicao={true} onUpdItem={updItem} />
          </div>
        )}

        {!vistaPlanoTabela&&['manha','tarde'].map(per=>(
          <div key={per} style={{ marginBottom:14 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
              <div style={{ fontSize:13,fontWeight:700,color:per==='manha'?'#F59E0B':'#60A5FA' }}>{per==='manha'?'🌅 Manhã':'🌆 Tarde'}</div>
              <button className="btn btn-secondary btn-sm" onClick={()=>addItem(per)} disabled={produtos.filter(p=>p.modo).length===0}>＋ Adicionar dia</button>
            </div>
            {formPlano.itens.filter(i=>per==='manha'?i.periodo!=='tarde':i.periodo==='tarde').map(item=>{
              const ri=formPlano.itens.indexOf(item)
              return <ItemPlanoRow key={ri} item={item} idx={ri} produtos={produtos.filter(p=>p.modo)} plano={formPlano} updItem={updItem} delItem={delItem} />
            })}
            {formPlano.itens.filter(i=>per==='manha'?i.periodo!=='tarde':i.periodo==='tarde').length===0&&(
              <button className="btn btn-secondary btn-sm" style={{ width:'100%',color:'#475569',borderStyle:'dashed' }} onClick={()=>addItem(per)}>＋ {per==='manha'?'Manhã':'Tarde'}</button>
            )}
          </div>
        ))}

        {vistaPlanoTabela&&(
          <div style={{ display:'flex',gap:8,marginBottom:12 }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>addItem('manha')} disabled={produtos.filter(p=>p.modo).length===0}>＋ Manhã</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>addItem('tarde')} disabled={produtos.filter(p=>p.modo).length===0}>＋ Tarde</button>
          </div>
        )}

        {produtos.filter(p=>p.modo).length===0&&(
          <div style={{ background:'rgba(212,175,55,.08)',border:'1px solid rgba(212,175,55,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#D4AF37',marginBottom:12 }}>
            💊 Adicione produtos no Armazém primeiro.
          </div>
        )}
        <Field label="Observações Gerais"><textarea className="input" rows={2} style={{ resize:'none' }} value={formPlano.obs} onChange={e=>sfp('obs',e.target.value)} /></Field>
      </Modal>

      {/* ══ MODAL APLICAR ══ */}
      <Modal open={modalAplicar} onClose={()=>setModalAplicar(false)} title={`▶ Aplicar "${planoParaAplicar?.nome}"`} wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalAplicar(false)}>Cancelar</button><button className="btn btn-primary" onClick={confirmarAplicar} disabled={savingAplicar}>{savingAplicar?<Spinner/>:null}Aplicar a {pombosAplicar.length} pombo(s)</button></>}>
        <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:12 }}>
          <button className="btn btn-secondary btn-sm" onClick={()=>setPombosAplicar(efectivo.map(p=>p.id))}>Todo o efectivo</button>
          {ESPECIALIDADES.filter(e=>e!=='geral').map(e=><button key={e} className="btn btn-secondary btn-sm" onClick={()=>setPombosAplicar(efectivo.filter(p=>(p.esp||[]).includes(e)).map(p=>p.id))}>{ESP_LABEL[e]}</button>)}
          <button className="btn btn-secondary btn-sm" onClick={()=>setPombosAplicar(efectivo.filter(p=>p.sexo==='M').map(p=>p.id))}>♂ Machos</button>
          <button className="btn btn-secondary btn-sm" onClick={()=>setPombosAplicar(efectivo.filter(p=>p.sexo==='F').map(p=>p.id))}>♀ Fêmeas</button>
          <button className="btn btn-secondary btn-sm" onClick={()=>setPombosAplicar([])}>Limpar</button>
        </div>
        {avisosStockAplicar.length>0&&(
          <div style={{ background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#f87171' }}>
            <div style={{ fontWeight:600,marginBottom:4 }}>⚠️ Stock insuficiente:</div>
            {avisosStockAplicar.map((a,i)=><div key={i}>{a}</div>)}
          </div>
        )}
        <div style={{ fontSize:12,color:'#94a3b8',marginBottom:8 }}>{pombosAplicar.length} de {efectivo.length} seleccionados</div>
        <div style={{ display:'flex',flexWrap:'wrap',gap:6,maxHeight:220,overflowY:'auto' }}>
          {efectivo.map(p=>(
            <button key={p.id} type="button" onClick={()=>toggleSel(p.id,setPombosAplicar)} className={`chip${pombosAplicar.includes(p.id)?' active':''}`} style={{ fontSize:11 }}>{p.emoji} {p.nome}</button>
          ))}
        </div>
      </Modal>

      {/* ══ MODAL POMBOS ══ */}
      <Modal open={modalPombos} onClose={()=>setModalPombos(false)} title="👥 Pombos em Tratamento" wide
        footer={<><button className="btn btn-secondary" onClick={()=>setModalPombos(false)}>Cancelar</button><button className="btn btn-primary" onClick={salvarPombos} disabled={savingPombos}>{savingPombos?<Spinner/>:null}Guardar ({pombosSel.length})</button></>}>
        <div style={{ fontSize:12,color:'#94a3b8',marginBottom:12 }}>As doses são recalculadas automaticamente.</div>
        <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:12 }}>
          <button className="btn btn-secondary btn-sm" onClick={()=>setPombosSel(efectivo.map(p=>p.id))}>Todo o efectivo</button>
          {ESPECIALIDADES.filter(e=>e!=='geral').map(e=><button key={e} className="btn btn-secondary btn-sm" onClick={()=>setPombosSel(efectivo.filter(p=>(p.esp||[]).includes(e)).map(p=>p.id))}>{ESP_LABEL[e]}</button>)}
          <button className="btn btn-secondary btn-sm" onClick={()=>setPombosSel(efectivo.filter(p=>p.sexo==='M').map(p=>p.id))}>♂</button>
          <button className="btn btn-secondary btn-sm" onClick={()=>setPombosSel(efectivo.filter(p=>p.sexo==='F').map(p=>p.id))}>♀</button>
          <button className="btn btn-secondary btn-sm" onClick={()=>setPombosSel([])}>Limpar</button>
        </div>
        <div style={{ fontSize:12,color:'#94a3b8',marginBottom:8 }}>{pombosSel.length} de {efectivo.length}</div>
        <div style={{ display:'flex',flexWrap:'wrap',gap:6,maxHeight:260,overflowY:'auto' }}>
          {efectivo.map(p=>(
            <button key={p.id} type="button" onClick={()=>toggleSel(p.id,setPombosSel)} className={`chip${pombosSel.includes(p.id)?' active':''}`} style={{ fontSize:11 }}>{p.emoji} {p.nome}</button>
          ))}
        </div>
      </Modal>

      {/* ══ MODAL OVERRIDE ══ */}
      {modalOverride&&(
        <ModalOverride ovKey={modalOverride.ovKey} valorAtual={modalOverride.valor} campo={modalOverride.campo} onGuardar={guardarOverride} onFechar={()=>setModalOverride(null)} />
      )}

      {/* == MODAL ABATE STOCK == */}
      {modalAbate&&(
        <Modal open={true} onClose={()=>setModalAbate(null)} title="Confirmar e actualizar stock"
          footer={<>
            <button className="btn btn-secondary" onClick={async()=>{
              const novo={...aplicacaoAtiva.estado_dias,[modalAbate.chave]:true}
              await db.updateTreatmentApplication(aplicacaoAtiva.id,{estado_dias:novo})
              setModalAbate(null); load(); toast('Marcado sem abate de stock','ok')
            }}>Marcar sem abater</button>
            <button className="btn btn-primary" onClick={()=>{
              const its=(modalAbate.itens||[]).flatMap(item=>{
                const p=getProd(item.product_id)
                const rH=racaoGDoPeriodo(planoAtivo?.itens||[],item.dia_semana,modalAbate.per)
                const ab=calcAbate(p,item,nPombos,mlPorPombo,rH)
                const arList=calcAbateRacao(item,nPombos,produtos)
                return [
                  ...(ab&&p?[{ prod:p, qty:ab.qty, item }]:[]),
                  ...arList.map(ar=>({ prod:ar.prod, qty:ar.qty, unidade:'g', isRacao:true, nome:ar.nome, item }))
                ]
              }).filter(x=>x.qty&&x.prod)
              // consolidar por _stock_id (somar se mesmo produto aparece em varios itens)
              const itsConsolidados=Object.values(its.reduce((acc,x)=>{
                const k=x.prod._stock_id
                if(!acc[k]) acc[k]={...x}
                else acc[k].qty=parseFloat((acc[k].qty+x.qty).toFixed(2))
                return acc
              },{}))
              confirmarAbate(modalAbate.chave, itsConsolidados)
            }}>Confirmar e abater stock</button>
          </>}>
          <div style={{ fontSize:13,color:'#94a3b8',marginBottom:12 }}>Os seguintes produtos serão deduzidos do Armazém:</div>
          {(()=>{
            // calcular todos os abates consolidados para mostrar
            const todosItens=(modalAbate.itens||[]).flatMap(item=>{
              const p=getProd(item.product_id)
              const rH=racaoGDoPeriodo(planoAtivo?.itens||[],item.dia_semana,modalAbate.per)
              const ab=calcAbate(p,item,nPombos,mlPorPombo,rH)
              const arList=calcAbateRacao(item,nPombos,produtos)
              return [
                ...(ab&&p?[{ prod:p, qty:ab.qty, unidade:ab.unidade, label:MODO_ICON[p.modo]+' '+p.nome, sub:MODO_LABEL[p.modo] }]:[]),
                ...arList.map(ar=>({ prod:ar.prod, qty:ar.qty, unidade:'g', label:'🌾 '+ar.nome+(ar.pct<1?' ('+Math.round(ar.pct*100)+'%)':''), sub:'Ração' }))
              ]
            }).filter(x=>x.qty&&x.prod)
            const consolidados=Object.values(todosItens.reduce((acc,x)=>{
              const k=x.prod._stock_id
              if(!acc[k]) acc[k]={...x}
              else acc[k].qty=parseFloat((acc[k].qty+x.qty).toFixed(2))
              return acc
            },{}))
            return consolidados.map((x,i)=>(
              <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #162040',fontSize:12 }}>
                <div>
                  <div style={{ color:'#fff',fontWeight:600 }}>{x.label}</div>
                  <div style={{ color:'#7A8699',fontSize:11 }}>{x.sub}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:'#f87171',fontWeight:700 }}>-{x.qty}{x.unidade}</div>
                  <div style={{ color:'#475569',fontSize:11 }}>📦 {x.prod.qtd}{x.prod.unidade} → {Math.max(0,(x.prod.qtd||0)-x.qty).toFixed(1)}{x.prod.unidade}</div>
                </div>
              </div>
            ))
          })()}
          <div style={{ fontSize:11,color:'#475569',marginTop:10 }}>
            Estimativa agua: {arredondarLitros(mlPorPombo*nPombos)}L ({mlPorPombo}ml/pombo x {nPombos} pombos)
          </div>
        </Modal>
      )}

      {/* ══ CONFIRM ══ */}
      <Modal open={!!confirm} onClose={()=>setConfirm(null)} title="Confirmar eliminação"
        footer={<><button className="btn btn-secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="btn btn-danger" onClick={()=>{if(confirm.tipo==='plano')delPlano();else delProd()}}>Eliminar</button></>}>
        <p style={{ fontSize:14,color:'#cbd5e1' }}>
          {confirm?.tipo==='plano'&&`Eliminar o plano "${confirm.item.nome}"?`}
          {confirm?.tipo==='produto'&&`Eliminar "${confirm.item.nome}" do armazém? Remove também o produto dos planos que o usam.`}
        </p>
      </Modal>
    </div>
  )
}

// ── linha de item do plano (lista) ────────────────────────────────────────────
function ItemPlanoRow({ item, idx, produtos, plano, updItem, delItem }) {
  const dn=calcDN(item.dia_semana,plano.dia_prova)
  const prod=produtos.find(p=>p.id===item.product_id)
  return (
    <div style={{ background:'#070F20',border:'1px solid #162040',borderRadius:10,padding:12,marginBottom:8 }}>
      <div style={{ display:'flex',gap:8,marginBottom:8,alignItems:'flex-end' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10,color:'#7A8699',marginBottom:4 }}>Dia</div>
          <select className="input" value={item.dia_semana} onChange={e=>updItem(idx,'dia_semana',e.target.value)}>
            {DIAS_SEMANA.map(d=><option key={d.key} value={d.key}>{d.full}</option>)}
          </select>
        </div>
        <div style={{ flex:'0 0 72px',textAlign:'center' }}>
          <div style={{ fontSize:10,color:'#7A8699',marginBottom:4 }}>Posição</div>
          <div style={{ background:'#050D1A',borderRadius:6,padding:'8px 0',fontSize:12,fontWeight:800,color:'#D4AF37' }}>{dn}</div>
        </div>
        <button className="btn btn-icon btn-sm" onClick={()=>delItem(idx)} style={{ color:'#f87171' }}>🗑️</button>
      </div>
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:10,color:'#7A8699',marginBottom:4 }}>Produto do Armazém *</div>
        <select className="input" value={item.product_id} onChange={e=>updItem(idx,'product_id',e.target.value)}>
          <option value="">— Escolher produto —</option>
          {produtos.map(p=><option key={p.id} value={p.id}>{MODO_ICON[p.modo]||'📦'} {p.nome}{p.dosagem_valor?` · ${p.dosagem_valor}${p.dosagem_unidade}/${p.dosagem_base==='pombo'?'pombo':p.dosagem_base==='litro'?'L':'kg'}`:''}</option>)}
        </select>
        {prod&&<div style={{ fontSize:11,color:'#2DD4A7',marginTop:4 }}>{MODO_LABEL_FULL[prod.modo]}{prod.dosagem_valor?` · ${prod.dosagem_valor}${prod.dosagem_unidade} ${BASE_LABEL[prod.dosagem_base]}`:''}</div>}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8 }}>
        <div><div style={{ fontSize:10,color:'#7A8699',marginBottom:4 }}>Ração (g)</div><input className="input" type="number" placeholder="Ex: 20" value={item.racao_g} onChange={e=>updItem(idx,'racao_g',e.target.value)} /></div>
        <div><div style={{ fontSize:10,color:'#7A8699',marginBottom:4 }}>Tipo Ração</div>
          <select className="input" value={item.tipo_racao} onChange={e=>updItem(idx,'tipo_racao',e.target.value)}>
            <option value="">—</option>
            {RACOES_COMERCIAIS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div><div style={{ fontSize:10,color:'#7A8699',marginBottom:4 }}>Voo (min)</div><input className="input" type="number" placeholder="Ex: 35" value={item.voo_min} onChange={e=>updItem(idx,'voo_min',e.target.value)} /></div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
        <div><div style={{ fontSize:10,color:'#7A8699',marginBottom:4 }}>Outros</div><input className="input" placeholder="banho, narinas…" value={item.outros} onChange={e=>updItem(idx,'outros',e.target.value)} /></div>
        <div><div style={{ fontSize:10,color:'#7A8699',marginBottom:4 }}>Notas</div><input className="input" placeholder="Opcional" value={item.notas} onChange={e=>updItem(idx,'notas',e.target.value)} /></div>
      </div>
    </div>
  )
}

// ── modal override semanal ────────────────────────────────────────────────────
function ModalOverride({ ovKey, valorAtual, campo, onGuardar, onFechar }) {
  const [val, setVal] = useState(valorAtual||'')
  return (
    <Modal open={true} onClose={onFechar} title={`✱ Ajuste semanal — ${campo.label}`}
      footer={<><button className="btn btn-secondary" onClick={()=>onGuardar(ovKey,'')}>Remover ajuste</button><button className="btn btn-secondary" onClick={onFechar}>Cancelar</button><button className="btn btn-primary" onClick={()=>onGuardar(ovKey,val)}>Guardar</button></>}>
      <div style={{ fontSize:12,color:'#94a3b8',marginBottom:12 }}>Afecta apenas esta semana. O plano base não é alterado.</div>
      {campo.key==='tipo'?(
        <Field label={campo.label}>
          <select className="input" value={val} onChange={e=>setVal(e.target.value)}>
            <option value="">—</option>
            {RACOES_COMERCIAIS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      ):(
        <Field label={`${campo.label} (actual: ${valorAtual||'—'})`}>
          <input className="input" type={campo.key==='gramas'||campo.key==='voo'?'number':'text'} value={val} onChange={e=>setVal(e.target.value)} autoFocus />
        </Field>
      )}
    </Modal>
  )
}

