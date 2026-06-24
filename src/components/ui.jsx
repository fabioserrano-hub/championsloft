import { useEffect } from 'react'

// ─── SPINNER ──────────────────────────────────────────
export function Spinner({ lg }) {
  return <div className={`spinner${lg ? ' spinner-lg' : ''}`} />
}

// ─── TOAST ────────────────────────────────────────────
import { createContext, useContext, useState, useCallback } from 'react'
const ToastCtx = createContext(null)
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((msg, type = 'ok') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  const icon = { ok: '✅', err: '❌', warn: '⚠️', info: 'ℹ️' }
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span>{icon[t.type] || '✅'}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export function useToast() { return useContext(ToastCtx) }

// ─── MODAL ────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) { window.addEventListener('keydown', h); document.body.style.overflow = 'hidden' }
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: 0,
    }} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={{
        background: '#0B1830',
        border: '1px solid #1B2D52',
        borderRadius: '16px 16px 0 0',
        width: '100%',
        maxWidth: wide ? 680 : 520,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -8px 40px rgba(0,0,0,.6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #1B2D52',
          flexShrink: 0,
          background: '#0B1830',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Fraunces', serif" }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#475569',
            cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4,
            borderRadius: 6, transition: 'color .15s',
          }} onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='#475569'}>✕</button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#0B1830' }}>
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid #1B2D52',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            flexShrink: 0,
            background: '#0B1830',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────
export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {desc && <div className="empty-desc">{desc}</div>}
      {action && action}
    </div>
  )
}

// ─── FIELD ────────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div className="field">
      {label && <label className="label">{label}</label>}
      {children}
    </div>
  )
}

// ─── BADGE ────────────────────────────────────────────
export function Badge({ v = 'gray', children }) {
  return <span className={`badge badge-${v}`}>{children}</span>
}
