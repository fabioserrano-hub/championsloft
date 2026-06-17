import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, Modal, EmptyState } from '../components/ui'

export default function GestaoEpoca({ nav }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [pombos, setPombos] = useState([])
  const [provas, setProvas] = useState([])
  const [financas, setFinancas] = useState([])
  const [acasalamentos, setAcasalamentos] = useState([])
  const [epocas, setEpocas] = useState([])
  const [confirmNova, setConfirmNova] = useState(false)
  const [saving, setSaving] = useState(false)

  const anoAtual = new Date().getFullYear()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, pv, f, a, ep] = await Promise.all([db.getPombos(), db.getProvas(), db.getFinancas(), db.getAcasalamentos(), db.getEpocas()])
      setPombos(p); setProvas(pv); setFinancas(f); setAcasalamentos(a); setEpocas(ep)
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const efectivo = pombos.filter(p => !p.estado_ext || p.estado_ext === 'proprio')
  const provasAno = provas.filter(p => new Date(p.data_reg).getFullYear() === anoAtual)
  const finAno = financas.filter(f => new Date(f.data_reg).getFullYear() === anoAtual)
  const rec = finAno.filter(f => f.tipo === 'receita').reduce((s, f) => s + f.val, 0)
  const dep = finAno.filter(f => f.tipo === 'despesa').reduce((s, f) => s + f.val, 0)
  const vitorias = provasAno.filter(p => p.lugar === 1).length
  const acasAno = acasalamentos.filter(a => new Date(a.data_acasalamento).getFullYear() === anoAtual)
  const borrachinhos = acasAno.reduce((s, a) => s + (a.ninhadas || 0), 0)

  const arquivarEpoca = async () => {
    setSaving(true)
    try {
      await db.createEpoca({
        ano: anoAtual, efectivo: efectivo.length, provas: provasAno.length, vitorias,
        receitas: rec, despesas: dep, saldo: rec - dep, acasalamentos: acasAno.length, borrachinhos,
      })
      toast(`Época ${anoAtual} arquivada! Pode agora preparar a próxima época.`, 'ok')
      setConfirmNova(false)
      load()
    } catch (e) { toast('Erro: ' + e.message + ' (verifique se a tabela epocas existe no Supabase)', 'err') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Gestão de Época</div><div className="section-sub">Época {anoAtual} em curso</div></div>
        <button className="btn btn-primary" onClick={() => setConfirmNova(true)}>📦 Arquivar Época</button>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div> : (
        <>
          <div className="grid-4 mb-6">
            <div className="kpi"><div className="kpi-val text-green">{efectivo.length}</div><div className="kpi-label">Efectivo</div></div>
            <div className="kpi"><div className="kpi-val text-yellow">{provasAno.length}</div><div className="kpi-label">Provas</div></div>
            <div className="kpi"><div className="kpi-val text-blue">{vitorias}</div><div className="kpi-label">Vitórias</div></div>
            <div className="kpi"><div className="kpi-val" style={{ color: rec - dep >= 0 ? '#1ed98a' : '#f87171' }}>{(rec - dep).toFixed(0)}€</div><div className="kpi-label">Saldo</div></div>
          </div>

          <div className="grid-2 mb-6">
            <div className="card card-p">
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>🥚 Reprodução em {anoAtual}</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div><div style={{ fontFamily: 'Barlow Condensed', fontSize: 28, fontWeight: 700, color: '#c084fc' }}>{acasAno.length}</div><div style={{ fontSize: 11, color: '#64748b' }}>Acasalamentos</div></div>
                <div><div style={{ fontFamily: 'Barlow Condensed', fontSize: 28, fontWeight: 700, color: '#facc15' }}>{borrachinhos}</div><div style={{ fontSize: 11, color: '#64748b' }}>Borrachinhos</div></div>
              </div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => nav?.('reproducao')}>Ver Reprodução →</button>
            </div>
            <div className="card card-p">
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>🏁 Encerramento</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                Para encerrar a época, dirija-se ao Fim de Época para gerar o ranking final, decidir dispensas e ver sugestões de casais para a próxima época.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => nav?.('fimepoca')}>Ir para Fim de Época →</button>
            </div>
          </div>

          <div className="card card-p">
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>📚 Histórico de Épocas</div>
            {epocas.length === 0
              ? <EmptyState icon="📦" title="Sem épocas arquivadas" desc="Ao arquivar a época atual, fica aqui guardado um resumo permanente" />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {epocas.map(e => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#1a2840', borderRadius: 10 }}>
                      <div style={{ fontFamily: 'Barlow Condensed', fontSize: 22, fontWeight: 700, color: '#fff', width: 56 }}>{e.ano}</div>
                      <div style={{ flex: 1, fontSize: 12, color: '#94a3b8' }}>{e.efectivo} pombos · {e.provas} provas · {e.vitorias} vitórias</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: e.saldo >= 0 ? '#1ed98a' : '#f87171' }}>{e.saldo >= 0 ? '+' : ''}{e.saldo.toFixed(0)}€</div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </>
      )}

      <Modal open={confirmNova} onClose={() => setConfirmNova(false)} title="📦 Arquivar Época"
        footer={<><button className="btn btn-secondary" onClick={() => setConfirmNova(false)}>Cancelar</button><button className="btn btn-primary" onClick={arquivarEpoca} disabled={saving}>{saving ? <Spinner /> : null}Confirmar</button></>}>
        <p style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 12 }}>
          Isto cria um registo permanente com o resumo da época {anoAtual}: efectivo, provas, vitórias, saldo financeiro e reprodução.
        </p>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>
          Os dados actuais (pombos, provas, finanças) não são apagados — continuam disponíveis normalmente. Isto apenas guarda uma "fotografia" da época para consulta futura.
        </p>
      </Modal>
    </div>
  )
}
