import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, Mic, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { type ActiveCapture, type MediaCaptureService } from '../services/mediaCaptureService'
import { useTranslation, type TranslationKey } from '../i18n'

const CONSENT_KEY = 'village-dhadheru:live-capture-choice'

const hasChoice = () => {
  try {
    return window.localStorage.getItem(CONSENT_KEY) !== null
  } catch {
    return false
  }
}

const captureErrorKeys: [string, TranslationKey][] = [
  ['cannot access a camera or microphone', 'capture.unsupported'],
  ['not supported in this browser', 'capture.recorderUnsupported'],
  ['permission was declined', 'capture.permissionDenied'],
  ['permission was denied', 'capture.permissionDenied'],
  ['could not be found', 'capture.unavailable'],
  ['not found', 'capture.unavailable'],
  ['currently unavailable', 'capture.unavailable'],
  ['local media storage is unavailable', 'capture.storageUnavailable'],
  ['camera preview could not start', 'capture.previewFailed'],
  ['capture could not be saved', 'capture.saveFailed'],
  ['photo could not be captured', 'capture.photoFailed'],
  ['audio recording stopped unexpectedly', 'capture.audioStopped'],
  ['audio could not be finalized', 'capture.audioFinalizeFailed'],
  ['session details could not be saved', 'capture.sessionSaveFailed'],
  ['access ended', 'capture.streamEnded'],
  ['audio recording could not start', 'capture.audioStartFailed'],
]

export function LiveCaptureExperience({ captureService }: { captureService: MediaCaptureService }) {
  const { t, formatNumber } = useTranslation()
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
  //currentPathRef.current = location.pathname
  const showConsent = !isAdminRoute && (consentOpen || !hasResponded)

  const rememberChoice = (choice: 'allowed' | 'declined') => {
    try {
      window.localStorage.setItem(CONSENT_KEY, choice)
    } catch {
      setError(t('capture.preferenceStorageError'))
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
          setError(translateCaptureError(message, t))
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
        setError(translateCaptureError(captureError instanceof Error ? captureError.message : '', t))
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
          <div className="capture-live-status"><span className="capture-live-dot" /> {t('capture.active')}</div>
          <div className="capture-counts">
            <span><Camera size={15} /> {t('capture.photos')}: {formatNumber(photoCount)}</span>
            <span><Mic size={15} /> {t('capture.audioClips')}: {formatNumber(audioCount)}</span>
          </div>
          <div className="capture-audio-timer"><span className="capture-live-dot" /> {t('capture.audioActive')} · {formatTime(elapsed)}</div>
          <button type="button" className="danger-button capture-stop-button" onClick={() => void stopCapture()}>
            <X size={15} /> {t('capture.stop')}
          </button>
        </aside>
      ) : null}

      {!isAdminRoute && !active && location.pathname !== '/share-experience' && (error || stopped) ? (
        <div className="capture-feedback-widget" role={error ? 'alert' : 'status'}>
          {error || t('capture.stopped')}
        </div>
      ) : null}

      {!isAdminRoute && !active && location.pathname === '/share-experience' ? <aside className="live-capture-card" aria-live="polite">
        <div className="live-capture-card-head">
          <span className="capture-icon"><Camera size={18} /></span>
          <div>
            <h3>{t('capture.title')}</h3>
            <p>{t('capture.cardDescription')}</p>
          </div>
        </div>

        {active ? (
          <p className="capture-message">{t('capture.active')}</p>
        ) : (
          <>
            {error ? <p className="capture-message capture-error" role="alert">{error}</p> : null}
            {stopped ? <p className="capture-message capture-stopped"><Check size={16} /> {t('capture.stopped')}</p> : null}
            <button type="button" className="primary-button" onClick={openConsent}>
              <Camera size={16} /> {error || stopped ? t('capture.reviewPermission') : t('capture.launch')}
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
              <button type="button" className="capture-modal-close" onClick={decline} aria-label={t('common.close')}><X size={18} /></button>
              <div>{t('capture.title')}</div>
              {/* <span className="eyebrow">{t('capture.yourChoice')}</span> */}
              {/* <h2 id="capture-consent-title">{t('capture.title')}</h2> */}
              {/* <p className="capture-consent-copy">{t('capture.permissionCopy')}</p>
              <div className="capture-permission-list">
                <div><Camera size={17} /><span>{t('capture.cameraRequired')}</span></div>
                <div><Mic size={17} /><span>{t('capture.micRequired')}</span></div>
                <div><ShieldCheck size={17} /><span>{t('capture.periodic')}</span></div>
                <div><X size={17} /><span>{t('capture.stopAnytime')}</span></div>
              </div> */}
              {/* <p className="capture-storage-note">{t('capture.localStorage')}</p> */}
              <div className="capture-consent-actions">
                {/* <button type="button" className="secondary-button" onClick={decline}>{t('capture.notNow')}</button> */}
                <button type="button" className="primary-button" disabled={starting} onClick={() => void startCapture()}>
                  <Check size={16} /> Ok
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

const translateCaptureError = (message: string, t: (key: TranslationKey) => string) => {
  const match = captureErrorKeys.find(([fragment]) => message.toLowerCase().includes(fragment))
  return match ? t(match[1]) : t('capture.startFailed')
}