import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Search, Trash2, X } from 'lucide-react'
import {
  type CaptureMediaRecord,
  type CaptureConsentStatus,
  type CaptureSessionRecord,
  type MediaStorageService,
} from '../services/localMediaStorageService'
import { useTranslation } from '../i18n'

type DisplayCapture = CaptureMediaRecord & { previewUrl: string }

const consentStatusKeys: Record<CaptureConsentStatus, 'captureAdmin.approved' | 'captureAdmin.stopped' | 'captureAdmin.revoked'> = {
  granted: 'captureAdmin.approved',
  stopped: 'captureAdmin.stopped',
  revoked: 'captureAdmin.revoked',
}

export function LiveCaptureSubmissions({ storage }: { storage: MediaStorageService }) {
  const { t, formatDate, formatNumber } = useTranslation()
  const [sessions, setSessions] = useState<CaptureSessionRecord[]>([])
  const [media, setMedia] = useState<DisplayCapture[]>([])
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [sessionFilter, setSessionFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'photo' | 'audio'>('all')
  const [selectedPhoto, setSelectedPhoto] = useState<DisplayCapture | null>(null)
  const [error, setError] = useState('')

  const loadLibrary = useCallback(async () => {
    try {
      const library = await storage.getLibrary()
      setSessions(library.sessions)
      setMedia(library.media.map((item) => ({ ...item, previewUrl: URL.createObjectURL(item.blob) })))
      setError('')
    } catch {
      setError(t('captureAdmin.loadError'))
    }
  }, [storage])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLibrary(), 0)
    return () => window.clearTimeout(timer)
  }, [loadLibrary])

  useEffect(() => () => media.forEach((item) => URL.revokeObjectURL(item.previewUrl)), [media])

  const filteredMedia = useMemo(() => media.filter((item) => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    const matchesSession = sessionFilter === 'all' || item.sessionId === sessionFilter
    const matchesDate = !date || item.timestamp.slice(0, 10) === date
    const matchesSearch = `${item.sessionId} ${item.path} ${item.captureId}`.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesSession && matchesDate && matchesSearch
  }), [date, media, search, sessionFilter, typeFilter])

  const deleteMedia = async (capture: DisplayCapture) => {
    try {
      await storage.deleteCapture(capture.captureId)
      await loadLibrary()
      setSelectedPhoto(null)
    } catch {
      setError(t('captureAdmin.deleteError'))
    }
  }

  return (
    <section className="admin-section capture-admin-section">
      <div className="capture-admin-heading">
        <div>
          <span className="eyebrow">{t('captureAdmin.eyebrow')}</span>
          <h3>{t('captureAdmin.title')}</h3>
          <p>{t('captureAdmin.description')}</p>
        </div>
        <div className="capture-total-count">{formatNumber(media.length)} {t('captureAdmin.items')}</div>
      </div>
      {error ? <p className="capture-message capture-error" role="alert">{error}</p> : null}

      <div className="capture-sessions">
        {sessions.length ? sessions.map((session) => (
          <article className="capture-session-card" key={session.sessionId}>
            <div><strong>{session.sessionId}</strong><span>{formatDate(session.startedAt)}</span></div>
            <div><span>{t('captureAdmin.ended')}</span><strong>{session.endedAt ? formatDate(session.endedAt) : t('captureAdmin.inProgress')}</strong></div>
            <span className={`capture-consent-badge ${session.consentStatus}`}>{t(consentStatusKeys[session.consentStatus])}</span>
            <span>{formatNumber(session.photoCount)} {t('captureAdmin.photos')}</span>
            <span>{formatNumber(session.audioCount)} {t('captureAdmin.audio')}</span>
          </article>
        )) : <p className="capture-admin-empty">{t('captureAdmin.emptySessions')}</p>}
      </div>

      <div className="capture-admin-toolbar">
        <label className="capture-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('captureAdmin.search')} /></label>
        <label className="capture-date-filter"><CalendarDays size={16} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label={t('captureAdmin.filterDate')} /></label>
        <select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)} aria-label={t('captureAdmin.filterSession')}>
          <option value="all">{t('captureAdmin.allSessions')}</option>
          {sessions.map((session) => <option key={session.sessionId} value={session.sessionId}>{session.sessionId}</option>)}
        </select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} aria-label={t('captureAdmin.filterType')}>
          <option value="all">{t('captureAdmin.allTypes')}</option><option value="photo">{t('captureAdmin.photosOption')}</option><option value="audio">{t('captureAdmin.audioOption')}</option>
        </select>
      </div>

      <div className="capture-media-grid">
        {filteredMedia.map((item) => (
          <article className="capture-media-card" key={item.captureId}>
            {item.type === 'photo' ? (
              <button type="button" className="capture-photo-preview" onClick={() => setSelectedPhoto(item)} aria-label={t('captureAdmin.preview')}>
                <img src={item.previewUrl} alt={`${t('captureAdmin.photo')} ${formatDate(item.timestamp)}`} />
              </button>
            ) : <audio controls src={item.previewUrl} />}
            <div className="capture-media-meta">
              <strong>{item.type === 'photo' ? t('captureAdmin.photo') : `${t('captureAdmin.audioOption')} · ${formatNumber(Math.round(item.durationMs / 1000))} ${t('captureAdmin.seconds')}`}</strong>
              <span>{formatDate(item.timestamp)}</span>
              <span>{item.sessionId}</span>
              <code>{item.path}</code>
            </div>
            <button type="button" className="danger-button capture-delete-button" onClick={() => void deleteMedia(item)} aria-label={t('captureAdmin.delete')}><Trash2 size={15} /> {t('captureAdmin.delete')}</button>
          </article>
        ))}
        {!filteredMedia.length ? <p className="capture-admin-empty">{t('captureAdmin.emptyFilter')}</p> : null}
      </div>

      {selectedPhoto ? (
        <div className="capture-lightbox" role="dialog" aria-modal="true" aria-label={t('captureAdmin.preview')} onClick={() => setSelectedPhoto(null)}>
          <button type="button" onClick={() => setSelectedPhoto(null)} aria-label={t('captureAdmin.closePreview')}><X size={22} /></button>
          <img src={selectedPhoto.previewUrl} alt={`${t('captureAdmin.photo')} ${formatDate(selectedPhoto.timestamp)}`} onClick={(event) => event.stopPropagation()} />
        </div>
      ) : null}
    </section>
  )
}