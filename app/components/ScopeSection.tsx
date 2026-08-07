import { Sparkles } from 'lucide-react'
import { LIVE_TOPICS, OUT_OF_SCOPE_NOTE, PLANNED_TOPICS } from '../lib/scope'
import { Badge } from './ui/badge'

interface ScopeSectionProps {
  onSelectTopic: (exampleQuestion: string) => void
}

export function ScopeSection({ onSelectTopic }: ScopeSectionProps) {
  return (
    <section aria-labelledby="scope-heading" className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-cyan-400" />
        <h2 id="scope-heading" className="text-sm font-semibold text-gray-200">
          Topik yang bisa Anda tanyakan
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {LIVE_TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelectTopic(topic.exampleQuestion)}
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400 transition-colors cursor-pointer hover:border-cyan-400/60 hover:bg-cyan-500/20"
          >
            {topic.label}
          </button>
        ))}
      </div>

      {PLANNED_TOPICS.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-dashed text-gray-500">
            Segera hadir
          </Badge>
          {PLANNED_TOPICS.map((topic) => (
            <span
              key={topic.id}
              className="inline-flex items-center rounded-full border border-dashed border-white/10 px-3 py-1 text-xs font-semibold text-gray-500"
            >
              {topic.label}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500 leading-relaxed">
        {OUT_OF_SCOPE_NOTE}
      </p>
    </section>
  )
}
