import { useRef, useState } from 'react'

const OTP_LENGTH = 6

function splitValue(value, length) {
  const chars = (value || '').replace(/\D/g, '').slice(0, length).split('')
  return Array.from({ length }, (_, i) => chars[i] || '')
}

/**
 * A 6-digit numeric OTP entry: one box per digit, with focus progression,
 * backspace navigation, and full-code paste support.
 */
function OtpInput({
  length = OTP_LENGTH,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  error = false,
  id,
  inputRef,
  describedBy,
}) {
  const inputRefs = useRef([])
  const [syncedValue, setSyncedValue] = useState(value)
  const [digits, setDigits] = useState(() => splitValue(value, length))

  // Derive state during render instead of an effect: keeps internal digits in sync
  // whenever the parent resets/changes the controlled `value` (e.g. on resend/change
  // email), without an extra render pass.
  if (value !== syncedValue) {
    setSyncedValue(value)
    setDigits(splitValue(value, length))
  }

  function emit(nextDigits) {
    const code = nextDigits.join('')
    // The parent's echo must not collapse empty boxes during a middle-digit edit.
    setSyncedValue(code)
    onChange?.(code)
    if (code.length === length && !nextDigits.includes('')) {
      onComplete?.(code)
    }
  }

  function handleChange(index, rawValue) {
    const numeric = rawValue.replace(/\D/g, '')
    if (numeric.length === length) {
      const next = Array.from({ length }, (_, i) => numeric[i] || '')
      setDigits(next)
      emit(next)
      inputRefs.current[Math.min(numeric.length, length - 1)]?.focus()
      return
    }
    const digit = numeric.slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    emit(next)
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = [...digits]
      if (digits[index]) {
        next[index] = ''
        setDigits(next)
        emit(next)
      } else if (index > 0) {
        next[index - 1] = ''
        setDigits(next)
        emit(next)
        inputRefs.current[index - 1]?.focus()
      }
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(event) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    const next = Array.from({ length }, (_, i) => pasted[i] || '')
    setDigits(next)
    emit(next)
    const focusIndex = Math.min(pasted.length, length - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  return (
    <div
      className={`flex justify-center gap-2 sm:gap-3 ${error ? 'animate-shake' : ''}`}
      role="group"
      aria-label="One-time passcode"
      aria-invalid={error || undefined}
      data-testid="otp-input"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          id={index === 0 ? id : undefined}
          ref={(el) => {
            inputRefs.current[index] = el
            if (index === 0 && inputRef) inputRef.current = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={length}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          value={digit}
          data-testid={`otp-digit-${index}`}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={error || undefined}
          aria-describedby={describedBy}
          onFocus={(event) => event.target.select()}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className={`h-12 w-full min-w-0 max-w-11 rounded-lg border text-center font-mono text-lg font-semibold shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:h-14 sm:max-w-12 ${
            error
              ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-400'
              : 'border-slate-300 text-slate-900 focus:border-violet-500 focus:ring-violet-200'
          }`}
        />
      ))}
    </div>
  )
}

export default OtpInput
