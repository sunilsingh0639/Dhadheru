export const localStorageService = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
      const value = window.localStorage.getItem(key)
      return value ? JSON.parse(value) as T : fallback
    } catch {
      return fallback
    }
  },

  set<T>(key: string, value: T) {
    if (typeof window === 'undefined') return false
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },
}