export type CaptureMediaType = 'photo' | 'audio'
export type CaptureConsentStatus = 'granted' | 'stopped' | 'revoked'

export type CaptureSessionRecord = {
  sessionId: string
  startedAt: string
  endedAt: string | null
  consentStatus: CaptureConsentStatus
  photoCount: number
  audioCount: number
}

export type CaptureMediaRecord = {
  captureId: string
  sessionId: string
  type: CaptureMediaType
  timestamp: string
  path: string
  durationMs: number
  consentStatus: 'granted'
  blob: Blob
}

export type MediaStorageService = {
  createSession: (session: CaptureSessionRecord) => Promise<void>
  saveCapture: (capture: CaptureMediaRecord) => Promise<void>
  endSession: (sessionId: string, status: Exclude<CaptureConsentStatus, 'granted'>) => Promise<void>
  getLibrary: () => Promise<{ sessions: CaptureSessionRecord[]; media: CaptureMediaRecord[] }>
  deleteCapture: (captureId: string) => Promise<void>
}

const DATABASE_NAME = 'village-dhadheru-media'
const DATABASE_VERSION = 1
const SESSIONS_STORE = 'sessions'
const MEDIA_STORE = 'media'

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!('indexedDB' in window)) {
    reject(new Error('Local media storage is not available in this browser.'))
    return
  }

  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
  request.onupgradeneeded = () => {
    const database = request.result
    if (!database.objectStoreNames.contains(SESSIONS_STORE)) {
      database.createObjectStore(SESSIONS_STORE, { keyPath: 'sessionId' })
    }
    if (!database.objectStoreNames.contains(MEDIA_STORE)) {
      const mediaStore = database.createObjectStore(MEDIA_STORE, { keyPath: 'captureId' })
      mediaStore.createIndex('sessionId', 'sessionId', { unique: false })
      mediaStore.createIndex('timestamp', 'timestamp', { unique: false })
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('Could not open local media storage.'))
})

const runTransaction = <T>(
  stores: string[],
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction) => T,
): Promise<T> => openDatabase().then((database) => new Promise<T>((resolve, reject) => {
  const transaction = database.transaction(stores, mode)
  let result: T

  try {
    result = run(transaction)
  } catch (error) {
    database.close()
    reject(error)
    return
  }

  transaction.oncomplete = () => {
    database.close()
    resolve(result)
  }
  transaction.onerror = () => {
    database.close()
    reject(transaction.error ?? new Error('Could not save local media.'))
  }
  transaction.onabort = () => {
    database.close()
    reject(transaction.error ?? new Error('Local media storage was interrupted.'))
  }
}))

export const localMediaStorageService: MediaStorageService = {
  createSession: async (session) => {
    await runTransaction([SESSIONS_STORE], 'readwrite', (transaction) => {
      transaction.objectStore(SESSIONS_STORE).add(session)
    })
  },

  saveCapture: async (capture) => {
    await runTransaction([SESSIONS_STORE, MEDIA_STORE], 'readwrite', (transaction) => {
      transaction.objectStore(MEDIA_STORE).add(capture)
      const sessions = transaction.objectStore(SESSIONS_STORE)
      const request = sessions.get(capture.sessionId)
      request.onsuccess = () => {
        const session = request.result as CaptureSessionRecord | undefined
        if (!session) {
          transaction.abort()
          return
        }
        if (capture.type === 'photo') session.photoCount += 1
        else session.audioCount += 1
        sessions.put(session)
      }
    })
  },

  endSession: async (sessionId, status) => {
    await runTransaction([SESSIONS_STORE], 'readwrite', (transaction) => {
      const sessions = transaction.objectStore(SESSIONS_STORE)
      const request = sessions.get(sessionId)
      request.onsuccess = () => {
        const session = request.result as CaptureSessionRecord | undefined
        if (session) {
          session.endedAt = new Date().toISOString()
          session.consentStatus = status
          sessions.put(session)
        }
      }
    })
  },

  getLibrary: async () => {
    const database = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([SESSIONS_STORE, MEDIA_STORE], 'readonly')
      const sessionsRequest = transaction.objectStore(SESSIONS_STORE).getAll()
      const mediaRequest = transaction.objectStore(MEDIA_STORE).getAll()
      transaction.oncomplete = () => {
        database.close()
        resolve({
          sessions: (sessionsRequest.result as CaptureSessionRecord[]).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
          media: (mediaRequest.result as CaptureMediaRecord[]).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
        })
      }
      transaction.onerror = () => {
        database.close()
        reject(transaction.error ?? new Error('Could not load local media.'))
      }
      transaction.onabort = () => {
        database.close()
        reject(transaction.error ?? new Error('Could not load local media.'))
      }
    })
  },

  deleteCapture: async (captureId) => {
    await runTransaction([SESSIONS_STORE, MEDIA_STORE], 'readwrite', (transaction) => {
      const media = transaction.objectStore(MEDIA_STORE)
      const request = media.get(captureId)
      request.onsuccess = () => {
        const capture = request.result as CaptureMediaRecord | undefined
        if (!capture) return
        media.delete(captureId)
        const sessions = transaction.objectStore(SESSIONS_STORE)
        const sessionRequest = sessions.get(capture.sessionId)
        sessionRequest.onsuccess = () => {
          const session = sessionRequest.result as CaptureSessionRecord | undefined
          if (!session) return
          if (capture.type === 'photo') session.photoCount = Math.max(0, session.photoCount - 1)
          else session.audioCount = Math.max(0, session.audioCount - 1)
          sessions.put(session)
        }
      }
    })
  },
}