const SURVEY_SESSION_KEY = 'village-dhadheru:survey-session'
const SURVEY_STORAGE_KEY = 'village-dhadheru:survey-responses'

export type SurveyResponse = {
  fullName: string
  mobileNumber: string
  consent: boolean
  preferredCandidate: string | null
  createdAt: string
}

export const hasSurveyBeenHandledThisSession = () => {
  if (typeof window === 'undefined') {
    return true
  }

  return window.sessionStorage.getItem(SURVEY_SESSION_KEY) === 'handled'
}

export const markSurveyHandled = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(SURVEY_SESSION_KEY, 'handled')
}

export const saveSurveyResponse = (response: SurveyResponse) => {
  if (typeof window === 'undefined') {
    return
  }

  const existing = JSON.parse(window.localStorage.getItem(SURVEY_STORAGE_KEY) ?? '[]') as SurveyResponse[]
  const next = [response, ...existing]
  window.localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(next))
  markSurveyHandled()
}
