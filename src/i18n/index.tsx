import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import en from './en'
import hi from './hi'

export type Language = 'hi' | 'en'
export type TranslationKey = keyof typeof en

const languageKey = 'preferredLanguage'
const messages = { hi, en } as const

type LocalizationContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
  formatDate: (date: string | number | Date) => string
  formatNumber: (value: number) => string
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null)

const getSavedLanguage = (): Language => {
  try {
    return window.localStorage.getItem(languageKey) === 'en' ? 'en' : 'hi'
  } catch {
    return 'hi'
  }
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getSavedLanguage)

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage)
    try {
      window.localStorage.setItem(languageKey, nextLanguage)
    } catch {
      return
    }
  }

  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
    document.title = messages[language]['document.title']
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) description.content = messages[language]['document.description']
  }, [language])

  const value = useMemo<LocalizationContextValue>(() => ({
    language,
    setLanguage,
    t: (key) => messages[language][key] ?? messages.en[key],
    formatDate: (date) => new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date)),
    formatNumber: (number) => new Intl.NumberFormat(language === 'hi' ? 'hi-IN' : 'en-IN').format(number),
  }), [language])

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>
}

export const useTranslation = () => {
  const context = useContext(LocalizationContext)
  if (!context) throw new Error('useTranslation must be used within LocalizationProvider.')
  return context
}