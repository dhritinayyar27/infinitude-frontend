import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Brand from '../../components/Brand/Brand'
import OtpInput from '../../components/OtpInput'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuth } from '../../hooks/useAuth'
import useCountdown from '../../hooks/useCountdown'
import { sendLoginOtp } from '../../services/authApi'
import { getErrorMessage } from '../../utils/errorMessage'
import { isValidEmail } from '../../utils/validators'

function VerifyEmail() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { loginWithOtp, isAuthenticated, isLoading } = useAuth()
  const email = typeof state?.email === 'string' ? state.email : ''
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [validitySeconds, setValiditySeconds] = useState(state?.expiresInSeconds ?? 300)
  const busyRef = useRef(false)
  const otpRef = useRef(null)
  const { secondsLeft, isActive, start } = useCountdown()
  const busy = isResending || isVerifying || isSuccess

  useEffect(() => {
    const remaining = Math.ceil(((state?.requestedAt ?? Date.now()) +
      (state?.resendCooldownSeconds ?? 30) * 1000 - Date.now()) / 1000)
    start(Math.max(0, remaining))
  }, [state, start])

  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 800)
    return () => clearTimeout(timer)
  }, [isSuccess, navigate])

  async function handleVerify(event) {
    event.preventDefault()
    if (busyRef.current || isSuccess) return
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter all 6 digits of your verification code.')
      otpRef.current?.focus()
      return
    }
    busyRef.current = true
    setIsVerifying(true)
    setError('')
    setInfo('')
    try {
      await loginWithOtp(email, otp)
      setOtp('')
      setIsSuccess(true)
    } catch (failure) {
      setError(getErrorMessage(failure, 'Unable to verify your code. Please try again.'))
    } finally {
      busyRef.current = false
      setIsVerifying(false)
    }
  }

  async function handleResend() {
    if (busyRef.current || isActive || isSuccess) return
    busyRef.current = true
    setIsResending(true)
    setError('')
    setInfo('')
    try {
      const { data } = await sendLoginOtp(email)
      setOtp('')
      setInfo(data.message || 'If the email is valid, a new OTP has been sent.')
      setValiditySeconds(data.expiresInSeconds ?? 300)
      navigate('/login/verify', {
        replace: true,
        state: {
          email,
          requestedAt: Date.now(),
          resendCooldownSeconds: data.resendCooldownSeconds ?? 30,
          expiresInSeconds: data.expiresInSeconds ?? 300,
        },
      })
    } catch (failure) {
      setError(getErrorMessage(failure, 'Unable to resend the OTP. Please try again.'))
    } finally {
      busyRef.current = false
      setIsResending(false)
    }
  }

  useEffect(() => {
    if (!isLoading && !busy) otpRef.current?.focus()
  }, [isLoading, busy])

  if (isLoading) return <div className="flex min-h-[70vh] items-center justify-center"><LoadingSpinner label="Checking your session..." /></div>
  if (isAuthenticated && !isSuccess) return <Navigate to="/dashboard" replace />
  if (!isValidEmail(email)) return <Navigate to="/login" replace />

  return (
    <main className="mx-auto flex min-h-[80svh] max-w-lg flex-col justify-center px-4 py-10 sm:py-16">
      <div className="mb-8"><Brand /></div>
      <section className="animate-fade-slide-in rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9" aria-labelledby="verify-heading">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="m4 7 8 6 8-6" />
          </svg>
        </div>
        <h1 id="verify-heading" className="text-center text-2xl font-semibold tracking-tight text-slate-900">Verify Your Email</h1>
        <p data-testid="otp-delivery-message" className="mt-3 text-center text-sm leading-relaxed text-slate-600">We've sent a verification code to your email.</p>
        <p className="mt-1 break-all text-center text-sm font-semibold text-slate-900" data-testid="verification-email">{email}</p>
        <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
          Check your inbox and spam folder. Your code expires after {validitySeconds % 60 === 0 ? `${validitySeconds / 60} minute${validitySeconds === 60 ? '' : 's'}` : `${validitySeconds} second${validitySeconds === 1 ? '' : 's'}`} from the time it was requested.
        </p>

        {isSuccess ? (
          <div className="animate-success-pop mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800" role="status" data-testid="info-message">
            <p className="font-semibold">Email verified!</p>
            <p className="mt-1 text-sm">You're signed in. Taking you to your dashboard...</p>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleVerify} noValidate aria-busy={busy}>
            <div>
              <label htmlFor="login-otp" className="mb-3 block text-center text-sm font-medium text-slate-700">6-digit verification code</label>
              <OtpInput
                id="login-otp"
                inputRef={otpRef}
                value={otp}
                onChange={(value) => { setOtp(value); setError('') }}
                disabled={busy}
                error={Boolean(error)}
                describedBy={error ? 'otp-error' : 'otp-help'}
              />
              <p id="otp-help" className="mt-3 text-center text-xs text-slate-500">You can type or paste your code.</p>
              {error && <p id="otp-error" role="alert" data-testid="otp-error" className="animate-fade-slide-in mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">{error}</p>}
              {info && <p role="status" data-testid="info-message" className="animate-fade-slide-in mt-3 rounded-lg bg-violet-50 px-3 py-2 text-center text-sm text-violet-800">{info}</p>}
            </div>
            <button
              type="submit"
              disabled={busy}
              data-testid="verify-otp-button"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isVerifying && <LoadingSpinner size="sm" tone="light" />}
              {isVerifying ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <button type="button" onClick={() => navigate('/login', { replace: true })} disabled={busy} data-testid="change-email-button" className="rounded text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-50">Change email</button>
              <button type="button" onClick={handleResend} disabled={busy || isActive} data-testid="resend-otp-button" className="inline-flex items-center gap-2 rounded font-medium text-violet-700 hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:text-slate-400">
                {isResending && <LoadingSpinner size="sm" />}
                {isResending ? 'Resending...' : isActive ? <span>Resend OTP in <span className="tabular-nums" data-testid="resend-cooldown-seconds">{secondsLeft}</span>s</span> : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}
      </section>
      <p className="mt-6 text-center text-xs text-slate-500">Do not share this OTP with anyone.</p>
    </main>
  )
}

export default VerifyEmail
