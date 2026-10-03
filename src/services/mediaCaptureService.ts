import {
  type CaptureMediaRecord,
  type CaptureSessionRecord,
  type MediaStorageService,
} from './localMediaStorageService'

export const CAPTURE_INTERVAL_MS = 10_000

export type CaptureCallbacks = {
  onSaved: (capture: CaptureMediaRecord) => void
  onError: (message: string) => void
  onStopped: (status: 'stopped' | 'revoked') => void
}

export type ActiveCapture = {
  sessionId: string
  stream: MediaStream
  stop: (status?: 'stopped' | 'revoked') => Promise<void>
}

const friendlyError = (error: unknown) => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Camera or microphone permission was declined. You can continue using the website without live capture.'
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'A camera or microphone could not be found. You can continue using the website without live capture.'
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'The camera or microphone is currently unavailable. You can continue without live capture.'
    }
  }
  return 'Live capture could not start. You can continue using the website without live capture.'
}

const fileTimestamp = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}_${String(date.getMilliseconds()).padStart(3, '0')}`
}

const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`

const createCaptureRecord = (
  sessionId: string,
  type: 'photo' | 'audio',
  blob: Blob,
  durationMs: number,
): CaptureMediaRecord => {
  const date = new Date()
  const extension = type === 'photo' ? 'jpg' : 'webm'
  const fileName = `${sessionId}_${fileTimestamp(date)}_${createId().slice(0, 8)}.${extension}`
  return {
    captureId: createId(),
    sessionId,
    type,
    timestamp: date.toISOString(),
    path: `uploads/${type === 'photo' ? 'photos' : 'audio'}/${fileName}`,
    durationMs,
    consentStatus: 'granted',
    blob,
  }
}

const endSessionSafely = async (
  storage: MediaStorageService,
  sessionId: string,
  status: 'stopped' | 'revoked',
) => {
  try {
    await storage.endSession(sessionId, status)
    return true
  } catch {
    return false
  }
}

export const createMediaCaptureService = (storage: MediaStorageService) => ({
  start: async (callbacks: CaptureCallbacks, signal?: AbortSignal): Promise<ActiveCapture> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser cannot access a camera or microphone. You can continue using the website without live capture.')
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('Audio recording is not supported in this browser. You can continue using the website without live capture.')
    }
    if (signal?.aborted) throw new DOMException('Capture request cancelled.', 'AbortError')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    } catch (error) {
      throw new Error(friendlyError(error), { cause: error })
    }
    if (signal?.aborted) {
      stream.getTracks().forEach((track) => track.stop())
      throw new DOMException('Capture request cancelled.', 'AbortError')
    }

    const sessionId = `session_${Date.now()}_${createId().slice(0, 8)}`
    const session: CaptureSessionRecord = {
      sessionId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      consentStatus: 'granted',
      photoCount: 0,
      audioCount: 0,
    }

    try {
      await storage.createSession(session)
    } catch {
      stream.getTracks().forEach((track) => track.stop())
      throw new Error('Local media storage is unavailable. No media was saved, and live capture has been stopped.')
    }

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    try {
      await video.play()
    } catch {
      stream.getTracks().forEach((track) => track.stop())
      await endSessionSafely(storage, sessionId, 'revoked')
      throw new Error('The camera preview could not start. You can continue using the website without live capture.')
    }

    let active = true
    let photoInProgress = false
    let segmentStartedAt = Date.now()
    const pendingSaves = new Set<Promise<void>>()
    let photoTimer = 0

    const saveBlob = (type: 'photo' | 'audio', blob: Blob, durationMs: number, allowFinalAudio = false) => {
      if ((!active && !allowFinalAudio) || blob.size === 0) return
      const capture = createCaptureRecord(sessionId, type, blob, durationMs)
      const saving = storage.saveCapture(capture)
        .then(() => callbacks.onSaved(capture))
        .catch(() => callbacks.onError('A capture could not be saved on this device. Live capture has been stopped.'))
      pendingSaves.add(saving)
      void saving.finally(() => pendingSaves.delete(saving))
    }

    const capturePhoto = async () => {
      if (!active || photoInProgress || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
      photoInProgress = true
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
        if (blob) saveBlob('photo', blob, 0)
        else callbacks.onError('A photo could not be captured. Live capture has been stopped.')
      } catch {
        callbacks.onError('A photo could not be captured. Live capture has been stopped.')
      } finally {
        photoInProgress = false
      }
    }

    const audioStream = new MediaStream(stream.getAudioTracks())
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(audioStream)
    } catch {
      stream.getTracks().forEach((track) => track.stop())
      await endSessionSafely(storage, sessionId, 'revoked')
      throw new Error('Audio recording is not available in this browser. You can continue without live capture.')
    }

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        const duration = Date.now() - segmentStartedAt
        saveBlob('audio', event.data, duration, true)
        segmentStartedAt = Date.now()
      }
    }
    recorder.onerror = () => callbacks.onError('Audio recording stopped unexpectedly. Live capture has been stopped.')

    const controller: ActiveCapture = {
      sessionId,
      stream,
      stop: async (status = 'stopped') => {
        if (!active) return
        active = false
        window.clearInterval(photoTimer)
        video.pause()
        video.srcObject = null
        try {
          if (recorder.state !== 'inactive') {
            await new Promise<void>((resolve) => {
              recorder.addEventListener('stop', () => resolve(), { once: true })
              recorder.stop()
            })
          }
        } catch {
          callbacks.onError('Audio could not be finalized, but camera and microphone access have been stopped.')
        } finally {
          stream.getTracks().forEach((track) => track.stop())
        }
        await Promise.all([...pendingSaves])
        if (!await endSessionSafely(storage, sessionId, status)) {
          callbacks.onError('Capture stopped, but session details could not be saved locally.')
        }
        callbacks.onStopped(status)
      },
    }

    const handleTrackEnded = () => {
      if (active) {
        callbacks.onError('Camera or microphone access ended. Live capture has been stopped.')
        void controller.stop('revoked')
      }
    }
    stream.getTracks().forEach((track) => track.addEventListener('ended', handleTrackEnded, { once: true }))

    try {
      recorder.start(CAPTURE_INTERVAL_MS)
    } catch {
      stream.getTracks().forEach((track) => track.stop())
      await endSessionSafely(storage, sessionId, 'revoked')
      throw new Error('Audio recording could not start. You can continue using the website without live capture.')
    }
    photoTimer = window.setInterval(() => void capturePhoto(), CAPTURE_INTERVAL_MS)
    return controller
  },
})

export type MediaCaptureService = ReturnType<typeof createMediaCaptureService>