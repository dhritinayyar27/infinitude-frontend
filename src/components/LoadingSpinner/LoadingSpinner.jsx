const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
}

// 'dark' (default) reads on light/white backgrounds; 'light' keeps the spinning
// arc visible when used inline on a dark button (e.g. bg-slate-900 CTAs).
const TONE_CLASSES = {
  dark: 'border-slate-300 border-t-slate-900',
  light: 'border-white/30 border-t-white',
}

function LoadingSpinner({ label, size = 'md', tone = 'dark', className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block animate-spin rounded-full ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${
          TONE_CLASSES[tone] || TONE_CLASSES.dark
        }`}
      />
      {label ? <span className="text-sm text-slate-600">{label}</span> : null}
      <span className="sr-only">Loading</span>
    </div>
  )
}

export default LoadingSpinner
