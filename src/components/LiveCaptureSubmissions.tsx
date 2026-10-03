import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Search, Trash2, X } from 'lucide-react'
import {
  type CaptureMediaRecord,
  type CaptureSessionRecord,
  type MediaStorageService,
} from '../services/localMediaStorageService'

type DisplayCapture = CaptureMediaRecord & { previewUrl: string }

export function LiveCaptureSubmissions({ storage }: { storage: MediaStorageService }) {
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
      setError('Saved media could not be loaded from this browser profile.')
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
      setError('This media item could not be deleted. Please try again.')
    }
  }

  return (
    <section className="admin-section capture-admin-section">
      <div className="capture-admin-heading">
        <div>
          <span className="eyebrow">Private media library</span>
          <h3>Live Capture Submissions</h3>
          <p>Only available inside this authorized admin panel. Development media is local to this browser profile.</p>
        </div>
        <div className="capture-total-count">{media.length} items</div>
      </div>
      {error ? <p className="capture-message capture-error" role="alert">{error}</p> : null}

      <div className="capture-sessions">
        {sessions.length ? sessions.map((session) => (
          <article className="capture-session-card" key={session.sessionId}>
            <div><strong>{session.sessionId}</strong><span>{new Date(session.startedAt).toLocaleString()}</span></div>
            <div><span>Ended</span><strong>{session.endedAt ? new Date(session.endedAt).toLocaleString() : 'In progress'}</strong></div>
            <span className={`capture-consent-badge ${session.consentStatus}`}>{session.consentStatus}</span>
            <span>{session.photoCount} photos</span>
            <span>{session.audioCount} audio</span>
          </article>
        )) : <p className="capture-admin-empty">No live capture sessions have been submitted.</p>}
      </div>

      <div className="capture-admin-toolbar">
        <label className="capture-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search session or file" /></label>
        <label className="capture-date-filter"><CalendarDays size={16} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Filter by date" /></label>
        <select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)} aria-label="Filter by session">
          <option value="all">All sessions</option>
          {sessions.map((session) => <option key={session.sessionId} value={session.sessionId}>{session.sessionId}</option>)}
        </select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} aria-label="Filter by media type">
          <option value="all">All media types</option><option value="photo">Photos</option><option value="audio">Audio</option>
        </select>
      </div>

      <div className="capture-media-grid">
        {filteredMedia.map((item) => (
          <article className="capture-media-card" key={item.captureId}>
            {item.type === 'photo' ? (
              <button type="button" className="capture-photo-preview" onClick={() => setSelectedPhoto(item)} aria-label="Open full-size photo preview">
                <img src={item.previewUrl} alt={`Photo captured ${new Date(item.timestamp).toLocaleString()}`} />
              </button>
            ) : <audio controls src={item.previewUrl} />}
            <div className="capture-media-meta">
              <strong>{item.type === 'photo' ? 'Photo' : `Audio · ${Math.round(item.durationMs / 1000)} sec`}</strong>
              <span>{new Date(item.timestamp).toLocaleString()}</span>
              <span>{item.sessionId}</span>
              <code>{item.path}</code>
            </div>
            <button type="button" className="danger-button capture-delete-button" onClick={() => void deleteMedia(item)} aria-label="Delete media item"><Trash2 size={15} /> Delete</button>
          </article>
        ))}
        {!filteredMedia.length ? <p className="capture-admin-empty">No media matches these filters.</p> : null}
      </div>

      {selectedPhoto ? (
        <div className="capture-lightbox" role="dialog" aria-modal="true" aria-label="Photo preview" onClick={() => setSelectedPhoto(null)}>
          <button type="button" onClick={() => setSelectedPhoto(null)} aria-label="Close photo preview"><X size={22} /></button>
          <img src={selectedPhoto.previewUrl} alt={`Photo captured ${new Date(selectedPhoto.timestamp).toLocaleString()}`} onClick={(event) => event.stopPropagation()} />
        </div>
      ) : null}
    </section>
  )
}