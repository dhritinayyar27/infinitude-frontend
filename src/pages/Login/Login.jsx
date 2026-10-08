import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Brand from '../../components/Brand/Brand'
import LoadingSpinner from '../../components/LoadingSpinner'
import { sendLoginOtp } from '../../services/authApi'
import { getErrorMessage } from '../../utils/errorMessage'
import { isValidEmail } from '../../utils/validators'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)

  async function handleSendOtp(event) {
    event.preventDefault()
    if (isSendingOtp) return
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.')
      return
    }
    setEmailError('')
    setIsSendingOtp(true)

    try {
      const { data } = await sendLoginOtp(email.trim())
      navigate('/login/verify', {
        state: {
          email: email.trim(),
          requestedAt: Date.now(),
          resendCooldownSeconds: data.resendCooldownSeconds ?? 30,
          expiresInSeconds: data.expiresInSeconds ?? 300,
        },
      })
    } catch (error) {
      setEmailError(getErrorMessage(error, 'Unable to send the OTP right now. Please try again.'))
    } finally {
      setIsSendingOtp(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[80svh] max-w-md flex-col justify-center px-4 py-10 sm:py-16">
      <div className="mb-8"><Brand /></div>
      <div className="animate-fade-slide-in rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-violet-600">YOUR KNOWLEDGE WORKSPACE</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Log in</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Log in with a one-time code sent to your email. No password to remember.
        </p>
        <form className="mt-7 space-y-5" onSubmit={handleSendOtp} noValidate aria-busy={isSendingOtp}>
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setEmailError('') }}
              disabled={isSendingOtp}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:bg-slate-100"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'login-email-error' : undefined}
            />
            {emailError && <p id="login-email-error" className="mt-2 text-sm text-red-600" role="alert">{emailError}</p>}
          </div>
          <button
            type="submit"
            disabled={isSendingOtp}
            data-testid="send-otp-button"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSendingOtp && <LoadingSpinner size="sm" tone="light" />}
            {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          New user? <Link to="/signup" className="font-medium text-violet-700 hover:underline">Sign up</Link>
        </p>
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">Secure, password-free access to Infinitude.</p>
    </main>
  )
}

export default Login
