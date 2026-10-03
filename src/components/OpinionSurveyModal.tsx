import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { surveyCandidates } from '../data/surveyData'
import { saveSurveyResponse } from '../services/surveyService'

export type OpinionSurveyModalProps = {
  isOpen: boolean
  onClose: () => void
}

type Step = 'details' | 'opinion' | 'success'

export function OpinionSurveyModal({ isOpen, onClose }: OpinionSurveyModalProps) {
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
            <button type="button" className="survey-close-button" onClick={handleClose} aria-label="Close survey popup">
              <X size={16} />
            </button>

            <div className="survey-progress" aria-label="Survey progress">
              <span className={step === 'details' || step === 'opinion' || step === 'success' ? 'active' : ''}>1. Your Details</span>
              <span className={step === 'opinion' || step === 'success' ? 'active' : ''}>2. Your Opinion</span>
            </div>

            {step === 'details' ? (
              <div className="survey-step">
                <h2 id="survey-title">We’d love to hear your opinion</h2>
                <p className="survey-intro">
                  Your opinion matters to the Dhadheru community. Please share your preference for the upcoming Sarpanch election. This is a voluntary survey.
                </p>

                <div className="survey-form-grid">
                  <label>
                    <span>Full Name</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Enter your full name"
                    />
                  </label>

                  <label>
                    <span>Mobile Number</span>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(event) => setMobileNumber(event.target.value)}
                      placeholder="Enter your mobile number"
                    />
                  </label>
                </div>

                <label className="consent-row">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  <span>
                    I voluntarily agree to participate in this opinion survey and understand that my response will be recorded for survey purposes.
                  </span>
                </label>

                <div className="survey-privacy-note">
                  <strong>Why are we asking for your name and mobile number?</strong>
                  <p>
                    We collect this information only to confirm that the response is voluntary and to keep a local record of survey participation for community review. Your details are not shared or transmitted without your explicit consent in this local-development version.
                  </p>
                </div>

                <div className="survey-actions">
                  <button type="button" className="survey-secondary" onClick={handleClose}>
                    Maybe Later
                  </button>
                  <button type="button" className="survey-primary" disabled={isContinueDisabled} onClick={handleContinue}>
                    Continue <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}

            {step === 'opinion' ? (
              <div className="survey-step">
                <h2>Who would you prefer as the Sarpanch candidate?</h2>
                <p className="survey-intro">
                  Please select the candidate you would personally prefer for the position of Sarpanch. There is no right or wrong answer, and your participation is completely voluntary.
                </p>

                <div className="candidate-list">
                  {!surveyCandidates.length ? (
                    <p className="candidate-pending-note">Candidate details will appear after they are confirmed with the Dhadheru community.</p>
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
                      <strong>Prefer not to answer</strong>
                      <span>I would rather not disclose a preference.</span>
                    </div>
                  </label>
                </div>

                <div className="survey-actions">
                  <button type="button" className="survey-secondary" onClick={() => setStep('details')}>
                    Back
                  </button>
                  <button type="button" className="survey-primary" disabled={isSubmitDisabled} onClick={handleSubmit}>
                    Submit Response
                  </button>
                </div>
              </div>
            ) : null}

            {step === 'success' ? (
              <div className="survey-step success-step">
                <div className="success-icon">
                  <Check size={22} />
                </div>
                <h2>Thank you for sharing your opinion.</h2>
                <p>
                  Your response has been recorded successfully. We appreciate your participation in the Dhadheru community survey.
                </p>

                <button type="button" className="survey-primary" onClick={handleClose}>
                  Close
                </button>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
