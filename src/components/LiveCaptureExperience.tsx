import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, Mic, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { type ActiveCapture, type MediaCaptureService } from '../services/mediaCaptureService'

const CONSENT_KEY = 'village-dhadheru:live-capture-choice'

const hasChoice = () => {
  try {
    return window.localStorage.getItem(CONSENT_KEY) !== null
  } catch {
    return false
  }
}

export function LiveCaptureExperience({ captureService }: { captureService: MediaCaptureService }) {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const [consentOpen, setConsentOpen] = useState(false)
  const [hasResponded, setHasResponded] = useState(hasChoice)
  const [active, setActive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [photoCount, setPhotoCount] = useState(0)
  const [audioCount, setAudioCount] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [stopped, setStopped] = useState(false)
  const captureRef = useRef<ActiveCapture | null>(null)
  const permissionRequestRef = useRef<AbortController | null>(null)
  const currentPathRef = useRef(location.pathname)
  currentPathRef.current = location.pathname
  const showConsent = !isAdminRoute && (consentOpen || !hasResponded)

  const rememberChoice = (choice: 'allowed' | 'declined') => {
    try {
      window.localStorage.setItem(CONSENT_KEY, choice)
    } catch {
      setError('Your choice will be remembered only for this visit because browser storage is unavailable.')
    }
    setHasResponded(true)
  }

  useEffect(() => {
    if (!active) return undefined
    const timer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [active])

  useEffect(() => {
    if (!active) return undefined
    const stopCapture = () => {
      const capture = captureRef.current
      if (!capture) return
      captureRef.current = null
      void capture.stop().then(() => {
        setActive(false)
        setStopped(true)
      })
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stopCapture()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', stopCapture)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', stopCapture)
    }
  }, [active])

  useEffect(() => () => {
    void captureRef.current?.stop()
  }, [])

  useEffect(() => {
    if (!isAdminRoute) return
    permissionRequestRef.current?.abort()
    if (!captureRef.current) return
    const capture = captureRef.current
    captureRef.current = null
    void capture.stop().then(() => {
      setActive(false)
      setStopped(true)
    })
  }, [isAdminRoute])

  const stopCapture = async (status: 'stopped' | 'revoked' = 'stopped') => {
    const capture = captureRef.current
    if (!capture) return
    captureRef.current = null
    await capture.stop(status)
    setActive(false)
    setStopped(status === 'stopped')
  }

  const startCapture = async () => {
    const request = new AbortController()
    permissionRequestRef.current = request
    setStarting(true)
    setError('')
    setStopped(false)
    setPhotoCount(0)
    setAudioCount(0)
    try {
      const capture = await captureService.start({
        onSaved: (item) => {
          if (item.type === 'photo') setPhotoCount((count) => count + 1)
          else setAudioCount((count) => count + 1)
        },
        onError: (message) => {
          setError(message)
          void stopCapture('revoked')
        },
        onStopped: () => {
          setActive(false)
          setStopped(true)
        },
      }, request.signal)
      if (request.signal.aborted || currentPathRef.current.startsWith('/admin')) {
        await capture.stop('revoked')
        return
      }
      captureRef.current = capture
      setActive(true)
      setConsentOpen(false)
      rememberChoice('allowed')
    } catch (captureError) {
      if (!request.signal.aborted) {
        setError(captureError instanceof Error ? captureError.message : 'Live capture could not start. You can continue without it.')
        rememberChoice('declined')
      }
      setActive(false)
      setConsentOpen(false)
    } finally {
      if (permissionRequestRef.current === request) permissionRequestRef.current = null
      setStarting(false)
    }
  }

  const decline = () => {
    permissionRequestRef.current?.abort()
    permissionRequestRef.current = null
    rememberChoice('declined')
    setConsentOpen(false)
  }

  const openConsent = () => {
    setError('')
    setConsentOpen(true)
  }

  return (
    <>
      {active ? (
        <aside className="capture-active-widget" aria-live="polite">
          <div className="capture-live-status"><span className="capture-live-dot" /> Live Capture Active</div>
          <div className="capture-counts">
            <span><Camera size={15} /> Photos: {photoCount}</span>
            <span><Mic size={15} /> Audio clips: {audioCount}</span>
          </div>
          <div className="capture-audio-timer"><span className="capture-live-dot" /> Audio Capture Active · {formatTime(elapsed)}</div>
          <button type="button" className="danger-button capture-stop-button" onClick={() => void stopCapture()}>
            <X size={15} /> Stop Live Capture
          </button>
        </aside>
      ) : null}

      {!isAdminRoute && !active && location.pathname !== '/share-experience' && (error || stopped) ? (
        <div className="capture-feedback-widget" role={error ? 'alert' : 'status'}>
          {error || 'Live capture has been stopped.'}
        </div>
      ) : null}

      {!isAdminRoute && !active && location.pathname === '/share-experience' ? <aside className="live-capture-card" aria-live="polite">
        <div className="live-capture-card-head">
          <span className="capture-icon"><Camera size={18} /></span>
          <div>
            <h3>Share Your Live Experience</h3>
            <p>Optional photos and short audio clips for community review.</p>
          </div>
        </div>

        {active ? (
          <p className="capture-message">Capture is running in the site status panel.</p>
        ) : (
          <>
            {error ? <p className="capture-message capture-error" role="alert">{error}</p> : null}
            {stopped ? <p className="capture-message capture-stopped"><Check size={16} /> Live capture has been stopped.</p> : null}
            <button type="button" className="primary-button" onClick={openConsent}>
              <Camera size={16} /> {error || stopped ? 'Review permission' : 'Choose whether to participate'}
            </button>
          </>
        )}
      </aside> : null}

      <AnimatePresence>
        {showConsent ? (
          <motion.div className="capture-consent-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section
              className="capture-consent-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="capture-consent-title"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.22 }}
            >
              <button type="button" className="capture-modal-close" onClick={decline} aria-label="Close permission dialog"><X size={18} /></button>
              <div className="capture-modal-icon"><Camera size={22} /><Mic size={20} /></div>
              <span className="eyebrow">Your choice, always</span>
              <h2 id="capture-consent-title">Share Your Live Experience</h2>
              <p className="capture-consent-copy">
                With your permission, this website can periodically capture photos and audio while you are using the experience. Your submitted media will be available to authorized administrators for review.
              </p>
              <div className="capture-permission-list">
                <div><Camera size={17} /><span>Camera access is required for photos.</span></div>
                <div><Mic size={17} /><span>Microphone access is required for audio.</span></div>
                <div><ShieldCheck size={17} /><span>Photos and 10-second audio clips are captured periodically only while active.</span></div>
                <div><X size={17} /><span>Stop at any time, or decline and keep using the website normally.</span></div>
              </div>
              <p className="capture-storage-note">Development storage: media stays in this browser profile on this device, under a logical uploads/photos and uploads/audio library. It is not sent to a server. Capture stops if you hide or close this page; browser or device suspension can interrupt recording.</p>
              <div className="capture-consent-actions">
                <button type="button" className="secondary-button" onClick={decline}>Not Now</button>
                <button type="button" className="primary-button" disabled={starting} onClick={() => void startCapture()}>
                  <Check size={16} /> {starting ? 'Requesting access…' : 'Allow Camera & Microphone'}
                </button>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`