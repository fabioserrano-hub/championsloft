import { useState } from 'react'

const SECCOES = [
  { id:'1', titulo:'1. Responsável pelo Tratamento',
    corpo:`ChampionsLoft — Fábio André da Conceição Serrano
Email: suporte@championsloft.pt
Plataforma: championsloft.pt

Nos termos do Regulamento Geral sobre a Protecção de Dados (RGPD — Regulamento (UE) 2016/679), somos o responsável pelo tratamento dos seus dados pessoais.` },

  { id:'2', titulo:'2. Dados que Recolhemos',
    corpo:`Recolhemos apenas os dados necessários para a prestação do serviço:

DADOS DE CONTA
• Nome completo
• Endereço de email
• Palavra-passe (armazenada de forma encriptada)
• Fotografia de perfil (opcional)

DADOS DE UTILIZAÇÃO
• Dados de pombos introduzidos (anilha, raça, resultados, saúde, reprodução)
• Publicações e interacções na LoftSocial
• Preferências e configurações da plataforma

DADOS DE PAGAMENTO
• Processados exclusivamente pela Stripe. Não armazenamos dados de cartão de crédito.
• Histórico de subscrições e facturas

DADOS TÉCNICOS
• Endereço IP (para segurança e prevenção de fraude)
• Browser e sistema operativo
• Logs de acesso (mantidos por 90 dias)

DADOS DE LOCALIZAÇÃO (opcionais)
• Coordenadas GPS do pombal (apenas se o utilizador as fornecer voluntariamente no perfil)` },

  { id:'3', titulo:'3. Finalidades e Base Legal do Tratamento',
    corpo:`EXECUÇÃO DO CONTRATO (Art. 6.º, n.º 1, al. b) RGPD)
• Prestação do serviço ChampionsLoft
• Processamento de pagamentos e gestão de subscrições
• Suporte ao utilizador

INTERESSE LEGÍTIMO (Art. 6.º, n.º 1, al. f) RGPD)
• Segurança da plataforma e prevenção de fraude
• Melhoria do serviço com base em dados anonimizados
• Logs de acesso para detecção de anomalias

CONSENTIMENTO (Art. 6.º, n.º 1, al. a) RGPD)
• Envio de newsletter e comunicações de marketing (pode retirar o consentimento a qualquer momento)
• Aparecimento no mapa de pombais da comunidade
• Perfil público na LoftSocial

OBRIGAÇÃO LEGAL (Art. 6.º, n.º 1, al. c) RGPD)
• Conservação de facturas e registos fiscais (10 anos, conforme lei fiscal portuguesa)` },

  { id:'4', titulo:'4. Partilha de Dados',
    corpo:`NÃO vendemos nem partilhamos os seus dados pessoais com terceiros para fins comerciais.

SUBPROCESSADORES (parceiros técnicos essenciais):
• Supabase Inc. — Infraestrutura de base de dados (servidores na UE)
• Vercel Inc. — Alojamento da plataforma (CDN global)
• Stripe Inc. — Processamento de pagamentos
• Anthropic PBC — IA para o Seleccionador de Casais (dados anonimizados)

Todos os subprocessadores operam com contratos de protecção de dados conformes com o RGPD.

PARTILHA ENTRE UTILIZADORES:
• Publicações na LoftSocial são visíveis para outros utilizadores conforme as suas definições de privacidade
• Dados de leilões e marketplace são visíveis para utilizadores registados
• O perfil público (se activado) é acessível através de URL único` },

  { id:'5', titulo:'5. Transferências Internacionais',
    corpo:`Alguns dos nossos subprocessadores operam fora da União Europeia (EUA). Estas transferências são efectuadas com base em:

• Cláusulas Contratuais Padrão aprovadas pela Comissão Europeia
• Certificações Privacy Shield equivalentes onde aplicável

A Supabase armazena dados primários em servidores na União Europeia (Frankfurt, Alemanha).` },

  { id:'6', titulo:'6. Retenção de Dados',
    corpo:`• Dados de conta: mantidos enquanto a conta estiver activa
• Após cancelamento: dados mantidos por 90 dias (para possível reactivação), depois eliminados
• Logs técnicos: 90 dias
• Facturas e registos fiscais: 10 anos (obrigação legal)
• Dados de leilões concluídos: 2 anos (para resolução de litígios)

Pode solicitar a eliminação antecipada dos seus dados a qualquer momento (excepto obrigações legais).` },

  { id:'7', titulo:'7. Os Seus Direitos (RGPD)',
    corpo:`Enquanto titular dos dados, tem os seguintes direitos:

✦ DIREITO DE ACESSO — Pode solicitar uma cópia de todos os dados que temos sobre si

✦ DIREITO DE RECTIFICAÇÃO — Pode corrigir dados incorrectos ou incompletos directamente nas definições da conta

✦ DIREITO AO APAGAMENTO ("direito a ser esquecido") — Pode solicitar a eliminação dos seus dados, sujeito a obrigações legais de retenção

✦ DIREITO À PORTABILIDADE — Pode exportar os seus dados em formato JSON/CSV através da funcionalidade "Exportar" na plataforma

✦ DIREITO DE OPOSIÇÃO — Pode opor-se ao tratamento para fins de marketing a qualquer momento

✦ DIREITO À LIMITAÇÃO — Pode solicitar a suspensão do tratamento em certas circunstâncias

✦ DIREITO DE RETIRAR CONSENTIMENTO — Pode retirar qualquer consentimento dado, sem afectar a licitude do tratamento anterior

Para exercer os seus direitos: suporte@championsloft.pt
Prazo de resposta: 30 dias úteis

Tem também o direito de apresentar reclamação à autoridade de controlo:
CNPD — Comissão Nacional de Protecção de Dados
www.cnpd.pt / Tel: 213 928 400` },

  { id:'8', titulo:'8. Segurança',
    corpo:`Implementamos medidas técnicas e organizativas para proteger os seus dados:

• Encriptação de dados em trânsito (TLS/HTTPS)
• Encriptação de dados em repouso na base de dados
• Palavras-passe armazenadas com hash bcrypt
• Autenticação segura via Supabase Auth
• Controlo de acesso baseado em funções (RLS — Row Level Security)
• Monitorização de anomalias e tentativas de acesso não autorizado
• Backups automáticos diários
• Actualizações de segurança regulares

Em caso de violação de segurança que possa afectar os seus dados, será notificado no prazo de 72 horas, conforme exigido pelo RGPD.` },

  { id:'9', titulo:'9. Cookies',
    corpo:`Utilizamos apenas cookies estritamente necessários para o funcionamento da plataforma:

COOKIES ESSENCIAIS (não requerem consentimento):
• Sessão de autenticação (auth-token) — expiração: sessão
• Preferências de tema claro/escuro (cl_tema) — expiração: 1 ano
• Estado do sidebar (cl_sidebar_collapsed) — expiração: 1 ano

NÃO utilizamos cookies de rastreamento, publicidade ou analytics de terceiros.

A plataforma não utiliza Google Analytics, Facebook Pixel ou ferramentas similares de rastreamento.` },

  { id:'10', titulo:'10. Menores de Idade',
    corpo:`O ChampionsLoft não se destina a utilizadores com menos de 16 anos de idade.

Não recolhemos intencionalmente dados pessoais de menores. Se tomarmos conhecimento de que recolhemos dados de um menor, procederemos à sua eliminação imediata.

Se for pai/tutor e tiver conhecimento de que o seu filho forneceu dados pessoais, contacte-nos em suporte@championsloft.pt.` },

  { id:'11', titulo:'11. Alterações a Esta Política',
    corpo:`Podemos actualizar esta Política de Privacidade periodicamente. Alterações significativas serão comunicadas por email com 30 dias de antecedência.

A data da última actualização é indicada no topo deste documento. Recomendamos que reveja esta política periodicamente.

Última actualização: Junho de 2026` },
]

export default function Privacidade({ onVoltar }) {
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
            <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(24px,4vw,36px)', fontWeight:900, margin:0, lineHeight:1.1 }}>Política de Privacidade & RGPD</h1>
            <div style={{ fontSize:12, color:'#445566', marginTop:4 }}>Última actualização: Junho de 2026</div>
          </div>
        </div>

        {/* Badge RGPD */}
        <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
          {['🇪🇺 Conforme RGPD','🔒 Dados seguros','🚫 Sem publicidade','📤 Exportação disponível'].map(l=>(
            <div key={l} style={{ fontSize:11, color:'#2DD4A7', background:'rgba(45,212,167,.08)', border:'1px solid rgba(45,212,167,.2)', borderRadius:8, padding:'4px 10px' }}>{l}</div>
          ))}
        </div>

        {/* Intro */}
        <div style={{ background:'rgba(45,212,167,.05)', border:'1px solid rgba(45,212,167,.15)', borderRadius:12, padding:'16px 20px', marginBottom:32, fontSize:13, color:'#8899AA', lineHeight:1.7 }}>
          A sua privacidade é fundamental para nós. Esta política explica exactamente que dados recolhemos, como os utilizamos e quais os seus direitos. Não vendemos dados. Não rastreamos. Não exibimos publicidade.
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

        {/* Direitos rápidos */}
        <div style={{ marginTop:32, background:'#0A1A2E', borderRadius:12, padding:'20px' }}>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:700, color:'#F0EDE8', marginBottom:14 }}>Exercer os seus direitos</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10 }}>
            {[
              { icon:'📤', label:'Exportar dados', desc:'Definições → Exportar' },
              { icon:'🗑️', label:'Eliminar conta', desc:'Definições → Conta → Eliminar' },
              { icon:'✉️', label:'Contacto DPO', desc:'suporte@championsloft.pt' },
              { icon:'🏛️', label:'CNPD', desc:'www.cnpd.pt' },
            ].map(({icon,label,desc})=>(
              <div key={label} style={{ background:'rgba(255,255,255,.03)', borderRadius:8, padding:'12px', display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:20 }}>{icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#F0EDE8' }}>{label}</div>
                  <div style={{ fontSize:11, color:'#445566' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop:20, fontSize:12, color:'#445566', textAlign:'center' }}>
          Questões sobre privacidade? <strong style={{ color:'#C8A84B' }}>suporte@championsloft.pt</strong> — Respondemos em até 30 dias úteis
        </div>
      </div>
    </div>
  )
}
