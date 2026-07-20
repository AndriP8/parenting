import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle, BookOpen, Info, Lightbulb, Send } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { type QueryResponse, submitParentingQuery } from '../api/query'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Textarea } from '../components/ui/textarea'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResponse | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    try {
      const res = await submitParentingQuery({ question })
      setResult(res)
    } catch (_err) {
      setResult({
        status: 'fallback',
        answer:
          'A system error occurred while processing your question. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <div className="mb-4 inline-flex">
          <Badge variant="default" className="gap-2 px-3 py-1 text-xs">
            <span>🇮🇩</span> MCH Handbook 2024 & IDAI Grounded
          </Badge>
        </div>
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent sm:text-5xl">
          Child Growth & Development Assistant
        </h1>
        <p className="mx-auto max-w-2xl text-base text-gray-400 leading-relaxed sm:text-lg">
          Trusted guidance on complementary feeding (MPASI), developmental
          milestones, immunization, and physical infant care based on official
          MoH RI and IDAI standards.
        </p>
      </header>

      <main>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label
                htmlFor="question-input"
                className="text-sm font-semibold text-gray-200"
              >
                Ask a Question About Infant & Child Health
              </label>
              <Textarea
                id="question-input"
                rows={3}
                placeholder="Example: When can a baby be given thicker complementary food textures? Or what are the side effects of DPT immunization?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  id="submit-query-btn"
                  type="submit"
                  disabled={loading || !question.trim()}
                >
                  <Send className="size-4" />
                  {loading ? 'Processing...' : 'Ask'}
                </Button>
              </div>
            </form>

            {result && (
              <div className="mt-6">
                {result.status === 'emergency' && (
                  <Alert variant="destructive" id="emergency-banner">
                    <AlertCircle className="size-5 text-rose-400" />
                    <AlertTitle className="flex items-center gap-2 text-rose-400 font-bold">
                      EMERGENCY MEDICAL ATTENTION (Red Flags)
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-rose-100 whitespace-pre-line leading-relaxed">
                      {result.answer}
                    </AlertDescription>
                  </Alert>
                )}

                {result.status === 'fallback' && (
                  <Alert variant="warning" id="fallback-notice">
                    <Info className="size-5 text-amber-400" />
                    <AlertTitle className="flex items-center gap-2 text-amber-300 font-bold">
                      Scope Boundary Information
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-amber-100 leading-relaxed">
                      {result.answer}
                    </AlertDescription>
                  </Alert>
                )}

                {result.status === 'success' && (
                  <Alert variant="default" id="answer-card">
                    <Lightbulb className="size-5 text-emerald-400" />
                    <AlertTitle className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                      Verified Answer (MCH Handbook & IDAI)
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-gray-100 whitespace-pre-line leading-relaxed">
                      {result.answer}

                      {result.citations && result.citations.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-white/10">
                          <div className="text-xs font-semibold text-gray-400 mb-2">
                            Official Reference Sources:
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {result.citations.map((c) => (
                              <div
                                key={`${c.documentTitle}-${c.sectionHeading ?? ''}-${c.pageNumber ?? ''}`}
                                className="text-xs text-gray-400 flex items-center gap-1.5"
                              >
                                <BookOpen className="size-3.5 text-cyan-400 inline" />
                                <span>
                                  <strong className="text-gray-300">
                                    {c.documentTitle}
                                  </strong>{' '}
                                  {c.sectionHeading
                                    ? `• ${c.sectionHeading}`
                                    : ''}{' '}
                                  {c.pageNumber ? `(Pg. ${c.pageNumber})` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
