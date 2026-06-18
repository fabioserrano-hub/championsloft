import { useState } from 'react'

const DICAS = [
  {
    cat: 'Alimentação',
    icon: '🌾',
    items: [
      { titulo: 'Não altere a ração na semana da prova', desc: 'Qualquer mudança de alimentação a menos de 5 dias de uma prova pode causar distúrbios digestivos e queda de forma. Mantenha sempre a mesma mistura durante a época competitiva.' },
      { titulo: 'Redução gradual antes da solta', desc: 'Reduza ligeiramente a quantidade de ração nos 2 dias antes da prova para aumentar a motivação de regresso. Um pombo ligeiramente com fome voa mais rápido para casa.' },
      { titulo: 'Eletrólitos após provas longas', desc: 'Após provas de Fundo ou Grande Fundo, adicione eletrólitos na água por 2-3 dias para repor sais minerais e acelerar a recuperação muscular.' },
      { titulo: 'Não misture cereais e ração comercial', desc: 'Use um ou outro — misturar pode desequilibrar os nutrientes e os pombos "escolhem" o que mais gostam, deixando o resto desperdiçado.' },
    ]
  },
  {
    cat: 'Saúde',
    icon: '🏥',
    items: [
      { titulo: 'Paramyxovirus — a vacina mais importante', desc: 'É obrigatória por lei em Portugal. Um pombo não vacinado pode transmitir a doença a todo o efectivo. Vacine antes do início dos treinos, não durante a época.' },
      { titulo: 'Tricomoníase (borrachinho) é silenciosa', desc: 'Os pombos adultos podem ser portadores sem sintomas visíveis. Trate preventivamente 2x por ano, especialmente antes da reprodução, para não contagiar os borrachinhos.' },
      { titulo: 'Separe imediatamente pombos doentes', desc: 'Um pombo doente deve ser isolado nas primeiras horas. Muitas doenças columbófilas propagam-se rapidamente pelo ar e pelas fezes.' },
      { titulo: 'Não trate sem diagnóstico', desc: 'O uso excessivo de antibióticos cria resistências. Antes de tratar, identifique o problema — os sintomas de tricomoníase, coccidiose e salmonela são diferentes e exigem tratamentos diferentes.' },
    ]
  },
  {
    cat: 'Treinos e Provas',
    icon: '🏆',
    items: [
      { titulo: 'Progressão gradual de distâncias', desc: 'Nunca salte de 30km para 100km de uma vez. O treino deve ser progressivo: 20, 40, 60, 80km antes de encestar para uma prova oficial. Os jovens precisam de ainda mais cuidado.' },
      { titulo: 'Observe a chegada de cada pombo', desc: 'A forma como o pombo chega diz tudo — deve descer directo ao pombal sem hesitar. Um pombo que roda ou hesita antes de entrar pode ter um problema de orientação ou estar cansado.' },
      { titulo: 'Não enceste pombos em muda activa', desc: 'Pombos em muda de penas de voo têm desempenho comprometido. Verifique o estado das penas primárias antes de cada encestamento.' },
      { titulo: 'Condições de vento determinam o resultado', desc: 'Num dia de vento de proa forte (>30km/h), espere velocidades médias muito abaixo do normal. Não julgue o desempenho do pombo sem considerar as condições meteorológicas.' },
    ]
  },
  {
    cat: 'Reprodução',
    icon: '🥚',
    items: [
      { titulo: 'Acasale apenas no final de Janeiro', desc: 'Acasalamentos demasiado cedo (Dezembro/Janeiro) podem resultar em borrachinhos fracos devido ao frio. A época ideal é Fevereiro-Março para borrachinhos de primavera.' },
      { titulo: 'Não separe o casal antes de 2 ninhadas', desc: 'O primeiro ovo de uma ninhada não é fértil em muitos casos. Dê sempre pelo menos 2 ciclos ao casal antes de avaliar a sua produtividade.' },
      { titulo: 'O cacifo deve estar seco e ventilado', desc: 'Humidade no cacifo é a principal causa de morte de borrachinhos nas primeiras semanas. Verifique regularmente o estado do ninho e do cacifo.' },
      { titulo: 'Anilhe os borrachinhos entre o 5.º e 8.º dia', desc: 'Se anilhar demasiado cedo a anilha cai; demasiado tarde não passa no pé. O ideal é entre o 5.º e o 8.º dia de vida, quando o pé ainda é suficientemente flexível.' },
    ]
  },
  {
    cat: 'Erros Comuns',
    icon: '⚠️',
    items: [
      { titulo: 'Encestamento em excesso nos jovens', desc: 'Um dos erros mais comuns: treinar jovens de forma excessiva antes das 5-6 semanas desde o desmame. Jovens esgotados perdem-se facilmente nas primeiras provas.' },
      { titulo: 'Ignorar a meteorologia', desc: 'Muitos columbófilos decidem o encestamento sem verificar as condições. Um dia de trovoada no ponto de solta pode resultar na perda de todo o bando.' },
      { titulo: 'Seleccionar só por velocidade', desc: 'A velocidade num único voo não diz nada. Um pombo campeão é o que é consistente ao longo de vários anos e condições diferentes. Analise sempre tendências, não resultados isolados.' },
      { titulo: 'Pombais demasiado cheios', desc: 'Superlotação é a principal causa de doenças e agressividade. A regra geral é 1m² por cada 2-3 pombos adultos. Pombais cheios = pombos doentes.' },
      { titulo: 'Não registar os dados', desc: 'A memória falha. Um bom registo de saúde, provas e reprodução ao longo dos anos é o que permite tomar decisões informadas de selecção — é isso que separa um criador médio de um campeão.' },
    ]
  },
]

export default function Dicas({ nav }) {
  const [catActiva, setCatActiva] = useState('todos')
  const [expandidas, setExpandidas] = useState({})

  const toggle = (key) => setExpandidas(e => ({ ...e, [key]: !e[key] }))

  const filtradas = catActiva === 'todos' ? DICAS : DICAS.filter(d => d.cat === catActiva)
  const total = DICAS.reduce((s, d) => s + d.items.length, 0)

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Dicas & Boas Práticas</div><div className="section-sub">{total} dicas para columbófilos</div></div>
      </div>

      <div style={{ background:'rgba(76,141,255,.06)', border:'1px solid rgba(76,141,255,.15)', borderRadius:10, padding:'14px 18px', marginBottom:16, fontSize:12, color:'#94a3b8' }}>
        ℹ️ Dicas baseadas nas melhores práticas da columbofilia portuguesa e europeia. Cada columbófilo desenvolve o seu próprio método — use estas dicas como ponto de partida, não como regras absolutas.
      </div>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {[['todos','Todas'], ...DICAS.map(d => [d.cat, `${d.icon} ${d.cat}`])].map(([v, l]) => (
          <button key={v} onClick={() => setCatActiva(v)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background:catActiva===v?'#1E5FD9':'#101F40', color:catActiva===v?'#fff':'#94a3b8' }}>{l}</button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtradas.map(cat => (
          <div key={cat.cat}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ fontSize:18 }}>{cat.icon}</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{cat.cat}</span>
              <span style={{ fontSize:11, color:'#7A8699' }}>({cat.items.length} dicas)</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {cat.items.map((item, i) => {
                const key = `${cat.cat}-${i}`
                const exp = expandidas[key]
                return (
                  <div key={i} className="card card-p" style={{ cursor:'pointer' }} onClick={() => toggle(key)}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <span style={{ fontSize:16, marginTop:1, flexShrink:0 }}>{exp ? '▾' : '▸'}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom: exp ? 8 : 0 }}>{item.titulo}</div>
                        {exp && <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6 }}>{item.desc}</div>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
