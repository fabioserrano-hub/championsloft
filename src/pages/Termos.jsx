import { useState } from 'react'

const SECCOES = [
  { id:'1', titulo:'1. Identificação do Serviço',
    corpo:`O ChampionsLoft é uma plataforma de gestão columbófila disponível em championsloft.pt, desenvolvida e operada por Fábio André da Conceição Serrano, com sede em Portugal.

Contacto: suporte@championsloft.pt` },

  { id:'2', titulo:'2. Aceitação dos Termos',
    corpo:`Ao criar uma conta ou utilizar a plataforma ChampionsLoft, o utilizador aceita integralmente os presentes Termos e Condições de Utilização, bem como a Política de Privacidade.

Se não concordar com estes termos, deverá abster-se de utilizar o serviço.` },

  { id:'3', titulo:'3. Descrição do Serviço',
    corpo:`O ChampionsLoft oferece ferramentas digitais para gestão columbófila, incluindo:

• Registo e gestão de efectivo (pombos)
• Registo de provas e resultados
• Gestão de reprodução e pedigrees
• Ferramentas de saúde e alimentação
• Funcionalidades sociais (LoftSocial)
• Marketplace e leilões de pombos
• Seleccionador de Casais por IA (plano Elite)
• Analíticas e relatórios

O serviço é prestado mediante subscrição mensal ou anual, com planos Base, Pro e Elite AI.` },

  { id:'4', titulo:'4. Conta de Utilizador',
    corpo:`4.1. O utilizador compromete-se a fornecer informações verdadeiras e actualizadas no registo.

4.2. O utilizador é responsável pela confidencialidade das suas credenciais de acesso e por todas as actividades realizadas com a sua conta.

4.3. É proibida a partilha de credenciais entre múltiplos utilizadores. Cada subscrição corresponde a um utilizador individual.

4.4. O ChampionsLoft reserva-se o direito de suspender ou encerrar contas que violem estes termos.` },

  { id:'5', titulo:'5. Subscrições e Pagamentos',
    corpo:`5.1. Os planos disponíveis são Base (9,99€/mês), Pro (11,99€/mês) e Elite AI (15,99€/mês), com desconto em planos anuais.

5.2. O plano Fundadores, disponível para os primeiros 100 utilizadores, mantém o preço de 13,99€/mês permanentemente.

5.3. Os preços indicados incluem IVA à taxa legal aplicável.

5.4. Os pagamentos são processados de forma segura através da Stripe. O ChampionsLoft não armazena dados de cartão de crédito.

5.5. A subscrição renova automaticamente no final de cada período, salvo cancelamento antecipado pelo utilizador.

5.6. Planos de grupo para coletividades disponíveis com desconto de 10% (3-5 licenças), 20% (6-12 licenças) e 30% (13+ licenças).` },

  { id:'6', titulo:'6. Período de Experiência Gratuita',
    corpo:`6.1. Novos utilizadores beneficiam de 30 dias de acesso gratuito ao plano seleccionado, sem necessidade de cartão de crédito.

6.2. Após o período de experiência, a conta passa automaticamente para o plano gratuito (com funcionalidades limitadas) ou inicia a cobrança caso o utilizador tenha fornecido dados de pagamento.

6.3. Não é efectuado qualquer débito automático sem consentimento expresso do utilizador.` },

  { id:'7', titulo:'7. Cancelamento e Reembolsos',
    corpo:`7.1. O utilizador pode cancelar a subscrição a qualquer momento, sem penalizações, através das definições da conta.

7.2. O cancelamento produz efeitos no final do período de facturação em curso. O acesso mantém-se até essa data.

7.3. Nos termos do Decreto-Lei n.º 24/2014, o consumidor tem direito de livre resolução no prazo de 14 dias após a celebração do contrato, com reembolso integral.

7.4. Após o período de 14 dias, não são efectuados reembolsos proporcionais por períodos não utilizados, salvo situações de erro técnico comprovado imputável ao serviço.` },

  { id:'8', titulo:'8. Utilização Aceitável',
    corpo:`É expressamente proibido:

• Utilizar o serviço para fins ilegais ou fraudulentos
• Fazer reverse engineering, copiar ou redistribuir o software
• Criar contas falsas ou fornecer informações enganosas
• Publicar conteúdo ofensivo, difamatório ou que viole direitos de terceiros na LoftSocial
• Realizar leilões ou transacções de pombos inexistentes ou com informações falsas
• Tentar aceder a dados de outros utilizadores

O ChampionsLoft pode remover conteúdo e suspender contas que violem estas regras.` },

  { id:'9', titulo:'9. Conteúdo do Utilizador',
    corpo:`9.1. O utilizador mantém a propriedade de todos os dados e conteúdos que introduz na plataforma (dados de pombos, fotos, resultados, publicações).

9.2. Ao introduzir conteúdo, o utilizador concede ao ChampionsLoft uma licença não exclusiva para armazenar, processar e apresentar esse conteúdo no contexto da prestação do serviço.

9.3. O utilizador garante que tem os direitos necessários sobre o conteúdo que partilha, nomeadamente fotografias de pombos de terceiros.

9.4. O ChampionsLoft não reivindica propriedade sobre os dados do utilizador e não os partilha com terceiros para fins comerciais.` },

  { id:'10', titulo:'10. Funcionalidade IA',
    corpo:`10.1. O Seleccionador de Casais por IA (plano Elite) utiliza o modelo Claude da Anthropic para análise de cruzamentos genéticos.

10.2. As sugestões da IA são de carácter orientativo e não substituem o conhecimento e experiência do columbófilo.

10.3. O ChampionsLoft não assume responsabilidade pelos resultados de criação baseados nas sugestões da IA.

10.4. Os dados do utilizador utilizados para análise IA são processados de forma anonimizada e não são partilhados com a Anthropic para treino de modelos.` },

  { id:'11', titulo:'11. Marketplace e Leilões',
    corpo:`11.1. O ChampionsLoft disponibiliza um espaço de marketplace e leilões para transacção de pombos entre utilizadores.

11.2. O ChampionsLoft actua como intermediário tecnológico e não é parte nas transacções entre utilizadores.

11.3. Os utilizadores são responsáveis pela veracidade das informações dos animais anunciados, cumprimento das obrigações legais de transacção de animais e eventuais litígios entre compradores e vendedores.

11.4. O ChampionsLoft pode remover anúncios que violem os termos ou a legislação aplicável.

11.5. As garantias de performance oferecidas por vendedores são da exclusiva responsabilidade destes.` },

  { id:'12', titulo:'12. Disponibilidade do Serviço',
    corpo:`12.1. O ChampionsLoft empenha-se em garantir a disponibilidade contínua do serviço, mas não garante disponibilidade ininterrupta.

12.2. Podem ocorrer períodos de manutenção programada, anunciados com antecedência sempre que possível.

12.3. O ChampionsLoft não é responsável por indisponibilidades causadas por factores externos (falhas de Internet, fornecedores de infraestrutura, etc.).` },

  { id:'13', titulo:'13. Limitação de Responsabilidade',
    corpo:`O ChampionsLoft não é responsável por:

• Perdas de dados resultantes de erros do utilizador
• Decisões de criação baseadas nas sugestões da plataforma ou IA
• Resultados de transacções no marketplace entre utilizadores
• Danos indirectos ou lucros cessantes

A responsabilidade total do ChampionsLoft, em qualquer circunstância, não excede o valor pago pelo utilizador nos últimos 3 meses de subscrição.` },

  { id:'14', titulo:'14. Alterações aos Termos',
    corpo:`14.1. O ChampionsLoft pode actualizar estes Termos e Condições, notificando os utilizadores por email com 30 dias de antecedência.

14.2. A utilização continuada do serviço após a entrada em vigor das alterações constitui aceitação dos novos termos.

14.3. Se o utilizador não concordar com as alterações, pode cancelar a subscrição sem penalização no prazo de 30 dias após a notificação.` },

  { id:'15', titulo:'15. Lei Aplicável e Foro',
    corpo:`15.1. Estes termos são regidos pela lei portuguesa.

15.2. Em caso de litígio, as partes comprometem-se a tentar uma resolução amigável.

15.3. Para resolução alternativa de litígios de consumo, o utilizador pode recorrer ao Centro de Arbitragem de Conflitos de Consumo ou à plataforma europeia ODR (ec.europa.eu/consumers/odr).

15.4. Na impossibilidade de resolução amigável, é competente o tribunal da comarca da sede do prestador do serviço.

Última actualização: Junho de 2026` },
]

export default function Termos({ onVoltar }) {
  const [aberta, setAberta] = useState(null)

  return (
    <div style={{ minHeight:'100vh', background:'#050D1A', color:'#F0EDE8', fontFamily:"'Inter',system-ui,sans-serif", padding:'clamp(16px,4vw,40px)' }}>
      <div style={{ maxWidth:760, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
          {onVoltar&&<button onClick={onVoltar} style={{ background:'none', border:'1px solid #334155', color:'#7A8699', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>← Voltar</button>}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <span style={{ fontSize:20 }}>🕊️</span>
              <span style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:900, color:'#C8A84B' }}>ChampionsLoft</span>
            </div>
            <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(24px,4vw,36px)', fontWeight:900, margin:0, lineHeight:1.1 }}>Termos e Condições</h1>
            <div style={{ fontSize:12, color:'#445566', marginTop:4 }}>Última actualização: Junho de 2026</div>
          </div>
        </div>

        {/* Intro */}
        <div style={{ background:'rgba(200,168,75,.08)', border:'1px solid rgba(200,168,75,.2)', borderRadius:12, padding:'16px 20px', marginBottom:32, fontSize:13, color:'#8899AA', lineHeight:1.7 }}>
          Por favor leia atentamente estes Termos e Condições antes de utilizar o ChampionsLoft. Ao criar uma conta, está a aceitar estes termos na sua totalidade.
        </div>

        {/* Secções */}
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {SECCOES.map((s,i)=>(
            <div key={s.id} onClick={()=>setAberta(aberta===s.id?null:s.id)} style={{ borderTop:'1px solid rgba(68,85,102,.3)', padding:'18px 0', cursor:'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(15px,2vw,18px)', fontWeight:700, color:aberta===s.id?'#F0EDE8':'#8899AA', margin:0, transition:'color .2s' }}>{s.titulo}</h2>
                <span style={{ color:'#445566', fontSize:18, flexShrink:0, transform:aberta===s.id?'rotate(45deg)':'none', transition:'transform .25s' }}>+</span>
              </div>
              {aberta===s.id&&(
                <div style={{ marginTop:16, fontSize:13, color:'#8899AA', lineHeight:1.85, whiteSpace:'pre-line' }}>{s.corpo}</div>
              )}
            </div>
          ))}
          <div style={{ borderTop:'1px solid rgba(68,85,102,.3)' }}/>
        </div>

        {/* Contacto */}
        <div style={{ marginTop:40, padding:'16px 20px', background:'#0A1A2E', borderRadius:12, fontSize:12, color:'#445566', textAlign:'center' }}>
          Questões sobre estes termos? Contacta-nos em <strong style={{ color:'#C8A84B' }}>suporte@championsloft.pt</strong>
        </div>
      </div>
    </div>
  )
}
