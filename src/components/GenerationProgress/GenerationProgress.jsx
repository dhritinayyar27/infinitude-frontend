import LoadingSpinner from '../LoadingSpinner'
import { generationProgress } from './progressState'

export default function GenerationProgress({ note, starting = false }) {
  const progress = generationProgress(note.sections)
  const running = note.status === 'GENERATING_NOTES'
  const activeTopic = progress.generating[0]
  const state = starting ? 'Starting notes generation...' :
    running ? activeTopic ? `Generating: ${activeTopic.title}` :
      progress.processed === progress.total && progress.total > 0 ? 'Finalizing notes...' :
        'Waiting for a generation worker...' :
      note.status === 'COMPLETED' ? 'Notes generation complete' :
        note.status === 'FAILED' ? 'Notes generation incomplete' : 'Ready to generate notes'

  return (
    <section aria-label="Notes generation progress" className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3" role="status" aria-live="polite">
        {(running || starting) && <LoadingSpinner size="sm" className="mt-1 shrink-0" />}
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-slate-900">{state}</p>
          <p className="mt-1 text-xs text-slate-500">
            Difficulty: {note.difficulty}. Every saved TOC topic is generated in order, including subtopics.
          </p>
        </div>
      </div>
      <div role="progressbar" aria-label="TOC topics processed" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={`${progress.processed} of ${progress.total} processed; ${progress.completed} completed, ${progress.failed} failed`}
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full transition-all ${progress.failed ? 'bg-amber-500' : 'bg-blue-600'}`}
          style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
        <span>{progress.completed} / {progress.total} topics completed</span>
        <span>{progress.failed} failed</span>
        <span>{progress.generating.length} generating</span>
        <span>{progress.pending} waiting</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {running ? 'Detailed notes include supporting subtopics and worked examples. Each topic may take up to two minutes per AI attempt. You can leave and return later; completed topics appear as they are saved.' :
          note.status === 'FAILED' ? 'Not all topics succeeded. Completed content is kept; retry generates the full saved outline again.' :
            'The progress bar measures processed topics, not successful completion.'}
      </p>
    </section>
  )
}
