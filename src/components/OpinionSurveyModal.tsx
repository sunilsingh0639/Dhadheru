import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { surveyCandidates } from '../data/surveyData'
import { saveSurveyResponse } from '../services/surveyService'
import { useTranslation } from '../i18n'

export type OpinionSurveyModalProps = {
  isOpen: boolean
  onClose: () => void
}

type Step = 'details' | 'opinion' | 'success'

export function OpinionSurveyModal({ isOpen, onClose }: OpinionSurveyModalProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('details')
  const [fullName, setFullName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [consent, setConsent] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)

  const isContinueDisabled = useMemo(() => {
    const normalizedName = fullName.trim()
    const normalizedMobile = mobileNumber.trim()
    return !normalizedName || !/^[0-9+\-\s]{7,15}$/.test(normalizedMobile) || !consent
  }, [consent, fullName, mobileNumber])

  const isSubmitDisabled = selectedCandidate === null

  const resetState = () => {
    setStep('details')
    setFullName('')
    setMobileNumber('')
    setConsent(false)
    setSelectedCandidate(null)
  }

  const handleClose = () => {
    onClose()
    resetState()
  }

  const handleContinue = () => {
    if (isContinueDisabled) {
      return
    }

    setStep('opinion')
  }

  const handleSubmit = () => {
    if (isSubmitDisabled) {
      return
    }

    saveSurveyResponse({
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      consent,
      preferredCandidate: selectedCandidate,
      createdAt: new Date().toISOString(),
    })

    setStep('success')
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="survey-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="survey-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="survey-title"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="survey-close-button" onClick={handleClose} aria-label={t('common.close')}>
              <X size={16} />
            </button>

            <div className="survey-progress" aria-label={t('survey.title')}>
              <span className={step === 'details' || step === 'opinion' || step === 'success' ? 'active' : ''}>1. {t('survey.fullName')}</span>
              <span className={step === 'opinion' || step === 'success' ? 'active' : ''}>2. {t('survey.question')}</span>
            </div>

            {step === 'details' ? (
              <div className="survey-step">
                <h2 id="survey-title">{t('survey.title')}</h2>
                <p className="survey-intro">{t('survey.intro')}</p>

                <div className="survey-form-grid">
                  <label>
                    <span>{t('survey.fullName')}</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder={t('survey.fullNamePlaceholder')}
                    />
                  </label>

                  <label>
                    <span>{t('survey.mobile')}</span>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(event) => setMobileNumber(event.target.value)}
                      placeholder={t('survey.mobilePlaceholder')}
                    />
                  </label>
                </div>

                <label className="consent-row">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  <span>{t('survey.consent')}</span>
                </label>

                <div className="survey-privacy-note">
                  <strong>{t('survey.privacyTitle')}</strong>
                  <p>{t('survey.privacy')}</p>
                </div>

                <div className="survey-actions">
                  <button type="button" className="survey-secondary" onClick={handleClose}>
                    {t('survey.maybeLater')}
                  </button>
                  <button type="button" className="survey-primary" disabled={isContinueDisabled} onClick={handleContinue}>
                    {t('survey.continue')} <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}

            {step === 'opinion' ? (
              <div className="survey-step">
                <h2>{t('survey.question')}</h2>
                <p className="survey-intro">{t('survey.questionCopy')}</p>

                <div className="candidate-list">
                  {!surveyCandidates.length ? (
                    <p className="candidate-pending-note">{t('survey.candidatePending')}</p>
                  ) : null}
                  {surveyCandidates.map((candidate) => (
                    <label key={candidate.id} className={selectedCandidate === candidate.id ? 'candidate-option selected' : 'candidate-option'}>
                      <input
                        type="radio"
                        name="candidate"
                        value={candidate.id}
                        checked={selectedCandidate === candidate.id}
                        onChange={() => setSelectedCandidate(candidate.id)}
                      />
                      {candidate.photo ? <img src={candidate.photo} alt={candidate.name} loading="lazy" /> : null}
                      <div className="candidate-info">
                        <strong>{candidate.name}</strong>
                        <span>{candidate.summary}</span>
                      </div>
                    </label>
                  ))}

                  <label className={selectedCandidate === 'prefer-not-to-answer' ? 'candidate-option selected' : 'candidate-option'}>
                    <input
                      type="radio"
                      name="candidate"
                      value="prefer-not-to-answer"
                      checked={selectedCandidate === 'prefer-not-to-answer'}
                      onChange={() => setSelectedCandidate('prefer-not-to-answer')}
                    />
                    <div className="candidate-info neutral">
                      <strong>{t('survey.preferNot')}</strong>
                      <span>{t('survey.preferNotText')}</span>
                    </div>
                  </label>
                </div>

                <div className="survey-actions">
                  <button type="button" className="survey-secondary" onClick={() => setStep('details')}>
                    {t('survey.back')}
                  </button>
                  <button type="button" className="survey-primary" disabled={isSubmitDisabled} onClick={handleSubmit}>
                    {t('survey.submit')}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 'success' ? (
              <div className="survey-step success-step">
                <div className="success-icon">
                  <Check size={22} />
                </div>
                <h2>{t('survey.thankYou')}</h2>
                <p>{t('survey.success')}</p>

                <button type="button" className="survey-primary" onClick={handleClose}>
                  {t('common.close')}
                </button>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
