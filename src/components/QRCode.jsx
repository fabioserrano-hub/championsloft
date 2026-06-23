import { useState } from 'react'
import { Modal } from './ui'

// Gera QR Code via API gratuita (sem dependências externas)
function gerarQRUrl(texto, tamanho=200) {
  const encoded = encodeURIComponent(texto)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${tamanho}x${tamanho}&data=${encoded}&bgcolor=050D1A&color=D4AF37&format=png&margin=10`
}

export function QRCodeModal({ open, onClose, titulo, conteudo, subtitulo }) {
  if (!open) return null
  const url = gerarQRUrl(conteudo)

  const partilhar = async () => {
    if (navigator.share) {
      await navigator.share({ title: titulo, text: conteudo, url: conteudo.startsWith('http') ? conteudo : undefined }).catch(()=>{})
    } else {
      navigator.clipboard?.writeText(conteudo)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`📱 ${titulo}`}>
      <div style={{ textAlign:'center' }}>
        <div style={{ background:'#050D1A', borderRadius:16, padding:20, display:'inline-block', border:'2px solid rgba(212,175,55,.3)', marginBottom:16 }}>
          <img src={url} alt="QR Code" style={{ width:200, height:200, display:'block' }} />
        </div>
        {subtitulo && <div style={{ fontSize:12, color:'#94a3b8', marginBottom:8 }}>{subtitulo}</div>}
        <div style={{ fontSize:11, color:'#475569', marginBottom:16, fontFamily:"'Space Mono',monospace", wordBreak:'break-all', padding:'8px 12px', background:'#101F40', borderRadius:8 }}>
          {conteudo}
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
          <button className="btn btn-primary" onClick={partilhar}>🔗 Partilhar</button>
          <a href={url} download={`qr-${titulo.toLowerCase().replace(/\s/g,'-')}.png`}
            className="btn btn-secondary" style={{ textDecoration:'none' }}>
            ⬇️ Guardar QR
          </a>
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </Modal>
  )
}

// Botão compacto que abre o modal QR
export function BotaoQR({ titulo, conteudo, subtitulo, style }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} title={`QR Code — ${titulo}`}
        style={{ background:'rgba(212,175,55,.1)', border:'1px solid rgba(212,175,55,.3)', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:16, ...style }}>
        📱
      </button>
      <QRCodeModal open={open} onClose={() => setOpen(false)} titulo={titulo} conteudo={conteudo} subtitulo={subtitulo} />
    </>
  )
}
