import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A simple one-shot countdown timer, used for the "Resend OTP in Ns" cooldown UX.
 * This is a frontend-only UX affordance (PROJECT_ARCHITECTURE.md §17.4 /
 * OTP_RESEND_COOLDOWN_SECONDS default) - the backend remains the source of truth and
 * may still reject an early resend, which the caller should surface as an inline error.
 */
function useCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const timerRef = useRef(null)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const start = useCallback(
    (seconds) => {
      clear()
      const deadline = Date.now() + Math.max(0, seconds) * 1000
      setSecondsLeft(Math.max(0, Math.ceil(seconds)))
      if (seconds <= 0) return
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
        setSecondsLeft(remaining)
        if (remaining === 0) clear()
      }, 1000)
    },
    [clear],
  )

  useEffect(() => clear, [clear])

  return { secondsLeft, isActive: secondsLeft > 0, start }
}

export default useCountdown
