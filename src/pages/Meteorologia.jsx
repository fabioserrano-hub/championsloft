import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useToast, Spinner, EmptyState } from '../components/ui'

const ICONES_WMO = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️', 80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}
const descricaoWMO = (code) => {
  if (code === 0) return 'Céu limpo'
  if ([1, 2, 3].includes(code)) return 'Parcialmente nublado'
  if ([45, 48].includes(code)) return 'Nebulosidade/Nevoeiro'
  if ([51, 53, 55, 61, 63, 65, 80, 81].includes(code)) return 'Chuva'
  if ([71, 73, 75].includes(code)) return 'Neve'
  if ([82, 95, 96, 99].includes(code)) return 'Trovoada'
  return 'Indefinido'
}

function avaliarCondicoesVoo(vento, precip, codigo) {
  if (precip > 2 || [80, 81, 82, 95, 96, 99].includes(codigo)) return { txt: 'Desfavorável', cor: '#f87171' }
  if (vento > 30) return { txt: 'Vento forte — risco', cor: '#facc15' }
  if (vento > 20) return { txt: 'Aceitável com cautela', cor: '#facc15' }
  return { txt: 'Favorável', cor: '#1ed98a' }
}

export default function Meteorologia({ nav }) {
  const toast = useToast()
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMeteo, setLoadingMeteo] = useState(false)
  const [previsao, setPrevisao] = useState(null)
  const [localNome, setLocalNome] = useState('')
  const [coordsAtuais, setCoordsAtuais] = useState(null)
  const [pesquisa, setPesquisa] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = await db.getPerfil()
      setPerfil(p)
      if (p?.pombal_lat && p?.pombal_lon) {
        setCoordsAtuais({ lat: p.pombal_lat, lon: p.pombal_lon })
        setLocalNome(p.pombal_nome || 'Pombal')
      }
    } catch (e) { toast('Erro: ' + e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const buscarPrevisao = useCallback(async (lat, lon, nome) => {
    setLoadingMeteo(true)
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=auto`)
      const data = await res.json()
      setPrevisao(data)
      if (nome) setLocalNome(nome)
    } catch (e) { toast('Erro ao obter previsão', 'err') }
    finally { setLoadingMeteo(false) }
  }, [])

  useEffect(() => {
    if (coordsAtuais) buscarPrevisao(coordsAtuais.lat, coordsAtuais.lon)
  }, [coordsAtuais, buscarPrevisao])

  const pesquisarLocal = async () => {
    if (!pesquisa.trim()) return
    setLoadingMeteo(true)
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(pesquisa)}&count=1&language=pt`)
      const data = await res.json()
      const loc = data.results?.[0]
      if (!loc) { toast('Local não encontrado', 'warn'); return }
      setCoordsAtuais({ lat: loc.latitude, lon: loc.longitude })
      buscarPrevisao(loc.latitude, loc.longitude, `${loc.name}${loc.admin1 ? ', ' + loc.admin1 : ''}`)
    } catch (e) { toast('Erro na pesquisa', 'err') }
    finally { setLoadingMeteo(false) }
  }

  const usarPombal = () => {
    if (!perfil?.pombal_lat || !perfil?.pombal_lon) { toast('Sem coordenadas do pombal no Perfil', 'warn'); return }
    setCoordsAtuais({ lat: perfil.pombal_lat, lon: perfil.pombal_lon })
    buscarPrevisao(perfil.pombal_lat, perfil.pombal_lon, perfil.pombal_nome || 'Pombal')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner lg /></div>

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Meteorologia</div><div className="section-sub">{localNome || 'Pesquise um local'}</div></div>
      </div>

      <div className="card card-p mb-6">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input className="input" placeholder="Pesquisar localidade..." value={pesquisa} onChange={e => setPesquisa(e.target.value)} onKeyDown={e => e.key === 'Enter' && pesquisarLocal()} />
          <button className="btn btn-primary" onClick={pesquisarLocal} disabled={loadingMeteo}>{loadingMeteo ? <Spinner /> : '🔍'}</button>
        </div>
        {perfil?.pombal_lat && <button className="btn btn-secondary btn-sm" onClick={usarPombal}>🏠 Usar localização do meu pombal</button>}
        {!perfil?.pombal_lat && <div style={{ fontSize: 12, color: '#64748b' }}>Defina as coordenadas GPS do seu pombal em Perfil para acesso rápido.</div>}
      </div>

      {!previsao ? (
        <EmptyState icon="🌦️" title="Sem previsão" desc="Pesquise uma localidade para ver a previsão de 7 dias" />
      ) : (
        <div>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            {previsao.daily?.time?.slice(0, 2).map((dia, i) => (
              <div key={i} className="card card-p" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{i === 0 ? 'Hoje' : new Date(dia).toLocaleDateString('pt-PT', { weekday: 'long' })}</div>
                <div style={{ fontSize: 36 }}>{ICONES_WMO[previsao.daily.weathercode[i]] || '🌡️'}</div>
                <div style={{ fontFamily: 'Barlow Condensed', fontSize: 24, fontWeight: 700, color: '#fff' }}>{Math.round(previsao.daily.temperature_2m_max[i])}° / {Math.round(previsao.daily.temperature_2m_min[i])}°</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{descricaoWMO(previsao.daily.weathercode[i])}</div>
                <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 4 }}>💨 {Math.round(previsao.daily.windspeed_10m_max[i])}km/h</div>
                {(() => {
                  const av = avaliarCondicoesVoo(previsao.daily.windspeed_10m_max[i], previsao.daily.precipitation_sum[i], previsao.daily.weathercode[i])
                  return <div style={{ fontSize: 11, color: av.cor, fontWeight: 600, marginTop: 6 }}>🕊️ {av.txt}</div>
                })()}
              </div>
            ))}
          </div>

          <div className="card card-p">
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: 12 }}>📅 Previsão 7 Dias</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {previsao.daily?.time?.map((dia, i) => {
                const av = avaliarCondicoesVoo(previsao.daily.windspeed_10m_max[i], previsao.daily.precipitation_sum[i], previsao.daily.weathercode[i])
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: '#1a2840', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', width: 70 }}>{new Date(dia).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit' })}</div>
                    <div style={{ fontSize: 20 }}>{ICONES_WMO[previsao.daily.weathercode[i]] || '🌡️'}</div>
                    <div style={{ flex: 1, fontSize: 12, color: '#cbd5e1' }}>{descricaoWMO(previsao.daily.weathercode[i])}</div>
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{Math.round(previsao.daily.temperature_2m_max[i])}°/{Math.round(previsao.daily.temperature_2m_min[i])}°</div>
                    <div style={{ fontSize: 11, color: '#60a5fa', width: 50, textAlign: 'right' }}>{Math.round(previsao.daily.windspeed_10m_max[i])}km/h</div>
                    <div style={{ fontSize: 10, color: av.cor, fontWeight: 700, width: 90, textAlign: 'right' }}>{av.txt}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => nav?.('provas')}>🏆 Ver Provas — usar MeteoProva específico</button>
          </div>
        </div>
      )}
    </div>
  )
}
