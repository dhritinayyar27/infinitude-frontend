import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import OtpInput from '../../components/OtpInput'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuth } from '../../hooks/useAuth'
import useCountdown from '../../hooks/useCountdown'
import { sendSignupOtp } from '../../services/authApi'
import { getErrorMessage } from '../../utils/errorMessage'
import { isValidEmail, isValidName } from '../../utils/validators'

const RESEND_COOLDOWN_SECONDS = 30

// Signup state machine: 'details' (name + email) -> 'otp' -> straight to /dashboard on success.
function Signup() {
  const navigate = useNavigate()
  const { signupWithOtp } = useAuth()

  const [step, setStep] = useState('details')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')

  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')

  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const resendCooldown = useCountdown()

  async function handleSendOtp(event) {
    event.preventDefault()
    if (isSendingOtp) return

    let hasError = false
    if (!isValidName(name)) {
      setNameError('Enter your name (at least 2 characters).')
      hasError = true
    } else {
      setNameError('')
    }
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.')
      hasError = true
    } else {
      setEmailError('')
    }
    if (hasError) return

    setIsSendingOtp(true)
    setInfoMessage('')

    try {
      const { data } = await sendSignupOtp(name.trim(), email.trim())
      setStep('otp')
      setOtp('')
      setOtpError('')
      setInfoMessage(data?.message || 'If the email is valid, an OTP has been sent.')
      resendCooldown.start(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setEmailError(getErrorMessage(error, 'Unable to send the OTP right now. Please try again.'))
    } finally {
      setIsSendingOtp(false)
    }
  }

  async function handleResendOtp() {
    if (isResending || resendCooldown.isActive) return
    setIsResending(true)
    setOtpError('')
    setInfoMessage('')

    try {
      const { data } = await sendSignupOtp(name.trim(), email.trim())
      setInfoMessage(data?.message || 'A new OTP has been sent to your email.')
      resendCooldown.start(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setOtpError(getErrorMessage(error, 'Unable to resend the OTP right now. Please try again.'))
    } finally {
      setIsResending(false)
    }
  }

  async function handleVerifyOtp(event) {
    event?.preventDefault()
    if (isVerifying || otp.length !== 6) return

    setIsVerifying(true)
    setOtpError('')

    try {
      await signupWithOtp(name.trim(), email.trim(), otp)
      setIsSuccess(true)
      setInfoMessage('Account created! Redirecting to your dashboard...')
      setTimeout(() => navigate('/dashboard', { replace: true }), 700)
    } catch (error) {
      // Send-otp responses are intentionally generic (enumeration protection), but by
      // the verify step we already know the account was staged for signup, so a 409
      // here safely means the email was registered in the meantime - it's fine to be
      // explicit at this later step.
      if (error?.response?.status === 409) {
        setOtpError('This email is already registered - try logging in instead.')
      } else {
        setOtpError(getErrorMessage(error, 'Invalid or expired OTP. Please try again.'))
      }
    } finally {
      setIsVerifying(false)
    }
  }

  function handleChangeEmail() {
    setStep('details')
    setOtp('')
    setOtpError('')
    setInfoMessage('')
    setIsSuccess(false)
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="mb-8 flex flex-col items-center gap-2">
        <img src="/favicon.svg" alt="" aria-hidden="true" className="h-10 w-10" />
        <span className="text-lg font-semibold tracking-tight text-slate-900">Infinitude</span>
      </div>

      <div
        key={step}
        className="animate-fade-slide-in rounded-xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-900/5 sm:p-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create your account</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {step === 'details'
            ? "We'll send a one-time passcode to your email - no password required."
            : `Enter the 6-digit code we sent to ${email}.`}
        </p>

        {infoMessage && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors ${
              isSuccess
                ? 'animate-success-pop border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
            role="status"
            data-testid="info-message"
          >
            {isSuccess && (
              <svg
                className="h-4 w-4 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414L8.5 12.086l6.79-6.793a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span>{infoMessage}</span>
          </div>
        )}

        {step === 'details' && (
          <form className="mt-6 space-y-4" onSubmit={handleSendOtp} noValidate>
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (nameError) setNameError('')
                }}
                disabled={isSendingOtp}
                placeholder="Ada Lovelace"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm transition-colors focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? 'signup-name-error' : undefined}
              />
              {nameError && (
                <p id="signup-name-error" className="mt-1 text-sm text-red-600">
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (emailError) setEmailError('')
                }}
                disabled={isSendingOtp}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm transition-colors focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'signup-email-error' : undefined}
              />
              {emailError && (
                <p id="signup-email-error" className="mt-1 text-sm text-red-600">
                  {emailError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSendingOtp}
              data-testid="send-otp-button"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSendingOtp ? <LoadingSpinner size="sm" tone="light" /> : null}
              {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form className="mt-6 space-y-5" onSubmit={handleVerifyOtp} noValidate>
            <div>
              <label htmlFor="signup-otp" className="mb-2 block text-center text-sm font-medium text-slate-700">
                One-time passcode
              </label>
              <OtpInput
                id="signup-otp"
                value={otp}
                onChange={(value) => {
                  setOtp(value)
                  if (otpError) setOtpError('')
                }}
                onComplete={setOtp}
                disabled={isVerifying || isSuccess}
                error={Boolean(otpError)}
              />
              {otpError && (
                <p
                  className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-center text-sm font-medium text-red-700"
                  role="alert"
                  data-testid="otp-error"
                >
                  {otpError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying || isSuccess || otp.length !== 6}
              data-testid="verify-otp-button"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isVerifying ? <LoadingSpinner size="sm" tone="light" /> : null}
              {isVerifying ? 'Verifying...' : 'Verify & Create Account'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={isSuccess}
                data-testid="change-email-button"
                className="rounded font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                Change email
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending || resendCooldown.isActive || isSuccess}
                data-testid="resend-otp-button"
                className={`inline-flex items-center gap-1.5 rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                  resendCooldown.isActive
                    ? 'text-slate-400'
                    : 'text-slate-700 hover:text-slate-900 hover:underline disabled:text-slate-300 disabled:no-underline'
                }`}
              >
                {isResending ? <LoadingSpinner size="sm" /> : null}
                {resendCooldown.isActive ? (
                  <span>
                    Resend OTP in <span className="tabular-nums" data-testid="resend-cooldown-seconds">{resendCooldown.secondsLeft}</span>s
                  </span>
                ) : isResending ? (
                  'Resending...'
                ) : (
                  'Resend OTP'
                )}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-slate-900 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
