// src/modules/virtualLoft/screens/CarreiraCreate.jsx
import { useState } from 'react'
import { useT, PAISES } from '../data/traducoes'

const EMOJIS_LOGOTIPO = ['🕊️','🦅','🦁','⚡','🔥','🌊','🏆','⭐','🎯','🌙','☀️','🌟']

const TIPOS_INICIO = [
  { id: 'jovem',        cor: '#2DD4A7', corFundo: 'rgba(45,212,167,.1)' },
  { id: 'amador',       cor: '#4C8DFF', corFundo: 'rgba(76,141,255,.1)' },
  { id: 'profissional', cor: '#D4AF37', corFundo: 'rgba(212,175,55,.1)' },
  { id: 'lenda',        cor: '#f87171', corFundo: 'rgba(248,113,113,.1)' },
]

const DIFICULDADES = [
  { id: 'facil',  cor: '#2DD4A7', emoji: '😊' },
  { id: 'normal', cor: '#4C8DFF', emoji: '😐' },
  { id: 'dificil',cor: '#D4AF37', emoji: '😤' },
  { id: 'lenda',  cor: '#f87171', emoji: '💀' },
]

export default function CarreiraCreate({ onCriar, onVoltar, idiomaApp = 'pt' }) {
  const [idioma, setIdioma] = useState(idiomaApp)
  const t = useT(idioma)

  const [passo, setPasso] = useState(1) // 1=identidade, 2=tipo, 3=dificuldade, 4=guardar
  const [form, setForm] = useState({
    nomePombal: '',
    nomeGestor: '',
    pais: 'pt',
    logotipo: '🕊️',
    tipoInicio: 'amador',
    dificuldade: 'normal',
    guardarEm: 'localStorage',
    idioma: idiomaApp,
  })
  const [erros, setErros] = useState({})
  const [showEmojis, setShowEmojis] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validarPasso1 = () => {
    const e = {}
    if (!form.nomePombal.trim()) e.nomePombal = t('nomeObrigatorio')
    if (!form.nomeGestor.trim()) e.nomeGestor = t('gestorObrigatorio')
    setErros(e)
    return Object.keys(e).length === 0
  }

  const avancar = () => {
    if (passo === 1 && !validarPasso1()) return
    setPasso(p => p + 1)
  }

  const recuar = () => setPasso(p => p - 1)

  const comecar = () => {
    if (!validarPasso1()) { setPasso(1); return }
    onCriar?.({ ...form, idioma })
  }

  const ORCAMENTOS = { jovem: 2500, amador: 8000, profissional: 25000, lenda: 100000 }
  const MULT = { facil: 1.5, normal: 1.0, dificil: 0.7, lenda: 0.5 }
  const orcFinal = Math.round((ORCAMENTOS[form.tipoInicio] || 8000) * (MULT[form.dificuldade] || 1))

  const POMBOS_N = { jovem: 5, amador: 12, profissional: 25, lenda: 50 }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#030812 0%,#050D1A 50%,#07111f 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🕊️</div>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>
          Fly2Win <span style={{ color: '#D4AF37' }}>Manager</span>
        </div>
        <div style={{ fontSize: 12, color: '#7A8699', marginTop: 4, letterSpacing: 2 }}>CONQUER THE SKIES</div>

        {/* Selector idioma */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
          {['pt','en','es'].map(l => (
            <button key={l} onClick={() => { setIdioma(l); set('idioma', l) }}
              style={{ padding: '4px 10px', borderRadius: 8, border: idioma === l ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,.1)', background: idioma === l ? 'rgba(212,175,55,.15)' : 'transparent', color: idioma === l ? '#D4AF37' : '#7A8699', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Card principal */}
      <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, overflow: 'hidden' }}>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,.06)' }}>
          <div style={{ height: '100%', width: `${(passo / 4) * 100}%`, background: 'linear-gradient(90deg,#1E5FD9,#D4AF37)', transition: 'width .4s', borderRadius: 2 }} />
        </div>

        <div style={{ padding: '24px 20px' }}>

          {/* Título do passo */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#4C8DFF', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>
              PASSO {passo}/4
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
              {passo === 1 ? t('tituloCriacao') : passo === 2 ? t('tipoInicio') : passo === 3 ? t('dificuldade') : t('guardarEm')}
            </div>
            <div style={{ fontSize: 12, color: '#7A8699', marginTop: 2 }}>{t('subtituloCriacao')}</div>
          </div>

          {/* ── PASSO 1: Identidade ── */}
          {passo === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Logótipo */}
              <div>
                <div style={{ fontSize: 11, color: '#7A8699', fontWeight: 600, marginBottom: 8 }}>Logótipo</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div onClick={() => setShowEmojis(!showEmojis)}
                    style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(212,175,55,.1)', border: '2px solid rgba(212,175,55,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, cursor: 'pointer' }}>
                    {form.logotipo}
                  </div>
                  {showEmojis && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {EMOJIS_LOGOTIPO.map(e => (
                        <div key={e} onClick={() => { set('logotipo', e); setShowEmojis(false) }}
                          style={{ width: 36, height: 36, borderRadius: 8, background: form.logotipo === e ? 'rgba(212,175,55,.2)' : 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: form.logotipo === e ? '1px solid #D4AF37' : '1px solid transparent' }}>
                          {e}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Nome do pombal */}
              <div>
                <label style={{ fontSize: 11, color: '#7A8699', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('nomePombal')} *</label>
                <input value={form.nomePombal} onChange={e => set('nomePombal', e.target.value)}
                  placeholder={t('nomePombalPlaceholder')}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,.06)', border: `1px solid ${erros.nomePombal ? '#f87171' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                {erros.nomePombal && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{erros.nomePombal}</div>}
              </div>

              {/* Nome do gestor */}
              <div>
                <label style={{ fontSize: 11, color: '#7A8699', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('nomeGestor')} *</label>
                <input value={form.nomeGestor} onChange={e => set('nomeGestor', e.target.value)}
                  placeholder={t('nomeGestorPlaceholder')}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,.06)', border: `1px solid ${erros.nomeGestor ? '#f87171' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                {erros.nomeGestor && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{erros.nomeGestor}</div>}
              </div>

              {/* País */}
              <div>
                <label style={{ fontSize: 11, color: '#7A8699', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('pais')}</label>
                <select value={form.pais} onChange={e => set('pais', e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', background: '#0B1830', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
                  {PAISES.map(p => (
                    <option key={p.id} value={p.id}>{p.emoji} {p.label[idioma] || p.label.pt}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── PASSO 2: Tipo de início ── */}
          {passo === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TIPOS_INICIO.map(tipo => {
                const isActive = form.tipoInicio === tipo.id
                return (
                  <div key={tipo.id} onClick={() => set('tipoInicio', tipo.id)}
                    style={{ padding: '14px 16px', borderRadius: 12, border: `2px solid ${isActive ? tipo.cor : 'rgba(255,255,255,.06)'}`, background: isActive ? tipo.corFundo : 'rgba(255,255,255,.02)', cursor: 'pointer', transition: 'all .15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? tipo.cor : '#fff' }}>{t(tipo.id === 'lenda' ? 'lenda_inicio' : tipo.id)}</div>
                      {isActive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: tipo.cor }} />}
                    </div>
                    <div style={{ fontSize: 11, color: '#7A8699', marginTop: 4 }}>{t(`${tipo.id}_desc${tipo.id === 'lenda' ? '_inicio' : ''}`)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── PASSO 3: Dificuldade ── */}
          {passo === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DIFICULDADES.map(d => {
                const isActive = form.dificuldade === d.id
                return (
                  <div key={d.id} onClick={() => set('dificuldade', d.id)}
                    style={{ padding: '14px 16px', borderRadius: 12, border: `2px solid ${isActive ? d.cor : 'rgba(255,255,255,.06)'}`, background: isActive ? `${d.cor}18` : 'rgba(255,255,255,.02)', cursor: 'pointer', transition: 'all .15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{d.emoji}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? d.cor : '#fff' }}>{t(d.id)}</span>
                      </div>
                      {isActive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.cor }} />}
                    </div>
                    <div style={{ fontSize: 11, color: '#7A8699', marginTop: 4, marginLeft: 28 }}>{t(`${d.id}_desc`)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── PASSO 4: Guardar + Resumo ── */}
          {passo === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Guardar em */}
              <div>
                <div style={{ fontSize: 11, color: '#7A8699', fontWeight: 600, marginBottom: 10 }}>{t('guardarEm')}</div>
                {[
                  { id: 'localStorage', icon: '📱', desc: t('localStorage') },
                  { id: 'supabase',     icon: '☁️', desc: t('supabase') },
                ].map(g => {
                  const isActive = form.guardarEm === g.id
                  return (
                    <div key={g.id} onClick={() => set('guardarEm', g.id)}
                      style={{ padding: '12px 14px', borderRadius: 10, border: `2px solid ${isActive ? '#4C8DFF' : 'rgba(255,255,255,.06)'}`, background: isActive ? 'rgba(76,141,255,.08)' : 'rgba(255,255,255,.02)', cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{g.icon}</span>
                      <span style={{ fontSize: 13, color: isActive ? '#4C8DFF' : '#cbd5e1', fontWeight: isActive ? 700 : 400 }}>{g.desc}</span>
                    </div>
                  )
                })}
              </div>

              {/* Resumo da carreira */}
              <div style={{ background: 'rgba(212,175,55,.06)', border: '1px solid rgba(212,175,55,.2)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#D4AF37', fontWeight: 700, marginBottom: 10, letterSpacing: .5 }}>RESUMO DA CARREIRA</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['🕊️', form.logotipo + ' ' + (form.nomePombal || '—')],
                    ['👤', form.nomeGestor || '—'],
                    ['🌍', PAISES.find(p => p.id === form.pais)?.emoji + ' ' + (PAISES.find(p => p.id === form.pais)?.label[idioma] || '')],
                    ['💰', orcFinal.toLocaleString() + '€'],
                    ['🐦', POMBOS_N[form.tipoInicio] + ' pombos'],
                    ['⚡', t(form.dificuldade)],
                  ].map(([icon, val], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{icon}</span>
                      <span style={{ fontSize: 11, color: '#cbd5e1' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Botões de navegação */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {passo > 1 && (
              <button onClick={recuar}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#cbd5e1', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Voltar
              </button>
            )}
            <button onClick={passo < 4 ? avancar : comecar}
              style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: passo === 4 ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'linear-gradient(135deg,#1E5FD9,#1456C0)', color: passo === 4 ? '#050D1A' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(0,0,0,.3)' }}>
              {passo === 4 ? `🚀 ${t('comecar')}` : 'Continuar →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
