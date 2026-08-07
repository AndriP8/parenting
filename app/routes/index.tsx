import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle, BookOpen, Info, Lightbulb, Send } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import { type QueryResponse, submitParentingQuery } from '~/utils/parenting'
import { ScopeSection } from '../components/ScopeSection'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Textarea } from '../components/ui/textarea'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function preprocessCitations(text: string): string {
  return text.replace(/\[Source \d+(?:,\s*Source \d+)*\]/g, (match) => {
    const numbers = match.match(/\d+/g) ?? []
    return numbers.map((n) => `[${n}](#citation-${n})`).join(', ')
  })
}

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => {
    const m = href?.match(/^#citation-(\d+)$/)
    if (m) {
      const num = m[1]
      return (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            document
              .getElementById(`citation-${num}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
          className="inline-flex items-center justify-center rounded-full bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/40 transition-colors text-[11px] font-bold px-1.5 py-px ml-0.5 align-top leading-none cursor-pointer"
        >
          [{num}]
        </button>
      )
    }
    return (
      <a
        href={href}
        className="text-cyan-400 underline hover:text-cyan-300"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    )
  },
  p: ({ children, ...props }) => (
    <p className="mb-3 leading-relaxed last:mb-0" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc pl-5 mb-3 space-y-1 last:mb-0" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal pl-5 mb-3 space-y-1 last:mb-0" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-white" {...props}>
      {children}
    </strong>
  ),
  h1: ({ children, ...props }) => (
    <h1 className="text-xl font-bold mb-3 mt-4" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-lg font-bold mb-2 mt-4" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-base font-bold mb-2 mt-3" {...props}>
      {children}
    </h3>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-2 border-cyan-400/30 pl-3 italic text-gray-300 my-3"
      {...props}
    >
      {children}
    </blockquote>
  ),
}

function IndexPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [errorState, setErrorState] = useState<'timeout' | 'error' | null>(null)

  const handleScopeSelect = (exampleQuestion: string) => {
    setQuestion(exampleQuestion)
    setResult(null)
    setErrorState(null)
    document.getElementById('question-input')?.focus()
  }

  const handleSubmit = async (e?: React.SubmitEvent) => {
    if (e) e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setErrorState(null)
    setResult(null)
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 15000),
      )
      const res = await Promise.race([
        submitParentingQuery({ data: { question } }),
        timeoutPromise,
      ])
      setResult(res)
    } catch (err: unknown) {
      console.log(err)
      if (err instanceof Error && err.message === 'TIMEOUT') {
        setErrorState('timeout')
      } else {
        setErrorState('error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 text-center">
        <div className="mb-4 inline-flex">
          <Badge variant="default" className="gap-2 px-3 py-1 text-xs">
            <span>🇮🇩</span> Berlandaskan Buku KIA 2024 & Panduan IDAI
          </Badge>
        </div>
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight bg-linear-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent sm:text-5xl">
          Asisten Tumbuh Kembang Anak
        </h1>
        <p className="mx-auto max-w-2xl text-base text-gray-400 leading-relaxed sm:text-lg">
          Ajukan pertanyaan seputar tumbuh kembang anak. Semua jawaban bersumber
          langsung dari Buku KIA dan panduan resmi IDAI.
        </p>
      </header>

      <main>
        <ScopeSection onSelectTopic={handleScopeSelect} />
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label
                htmlFor="question-input"
                className="text-sm font-semibold text-gray-200"
              >
                Tanyakan seputar Kesehatan dan Tumbuh Kembang Anak
              </label>
              <Textarea
                id="question-input"
                rows={3}
                placeholder="Contoh: Kapan bayi bisa diberi MPASI dengan tekstur lebih kental? Atau apa efek samping imunisasi DPT?"
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
                  {loading ? 'Memproses...' : 'Tanya'}
                </Button>
              </div>
            </form>

            {errorState && (
              <div className="mt-6">
                <Alert variant="destructive">
                  <AlertCircle className="size-5 text-rose-400" />
                  <AlertTitle className="flex items-center gap-2 text-rose-400 font-bold">
                    {errorState === 'timeout'
                      ? 'Waktu Habis (Timeout)'
                      : 'Terjadi Kesalahan Sistem'}
                  </AlertTitle>
                  <AlertDescription className="mt-2 text-rose-100 leading-relaxed flex flex-col gap-4 items-start">
                    {errorState === 'timeout'
                      ? 'Permintaan memakan waktu terlalu lama. Silakan coba lagi.'
                      : 'Terjadi kesalahan sistem saat memproses pertanyaan Anda. Silakan coba lagi.'}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubmit()}
                      className="border-rose-400 text-rose-400 hover:bg-rose-400 hover:text-rose-950"
                    >
                      Coba Lagi
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {result && (
              <div className="mt-6">
                {result.status === 'emergency' && (
                  <Alert variant="destructive" id="emergency-banner">
                    <AlertCircle className="size-5 text-rose-400" />
                    <AlertTitle className="flex items-center gap-2 text-rose-400 font-bold">
                      PERHATIAN MEDIS DARURAT (Tanda Bahaya)
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
                      Informasi Batasan Topik
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-amber-100 leading-relaxed">
                      {result.answer}
                    </AlertDescription>
                  </Alert>
                )}

                {result.status === 'success' && (
                  <div className="space-y-4">
                    <Card className="border-emerald-400/10">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Lightbulb className="size-5 text-emerald-400" />
                          <h2 className="text-emerald-400 font-bold text-lg">
                            Jawaban Terverifikasi (Buku KIA & IDAI)
                          </h2>
                        </div>
                        <div className="text-gray-100 text-[15px]">
                          <ReactMarkdown components={markdownComponents}>
                            {preprocessCitations(result.answer)}
                          </ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>

                    {result.citations && result.citations.length > 0 && (
                      <Card className="border-white/5">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="size-4 text-cyan-400" />
                            <h3 className="text-sm font-semibold text-gray-300">
                              Sumber Referensi Resmi
                            </h3>
                          </div>
                          <div className="space-y-2.5">
                            {result.citations.map((c, i) => (
                              <div
                                key={`${c.documentTitle}-${c.sectionHeading ?? ''}-${c.pageNumber ?? ''}`}
                                id={`citation-${i + 1}`}
                                className="flex gap-3 rounded-lg border border-white/5 bg-white/2 p-3 scroll-mt-6 transition-colors hover:border-cyan-400/20"
                              >
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-400">
                                  {i + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs text-gray-400 mb-1.5">
                                    <strong className="text-gray-200">
                                      {c.documentTitle}
                                    </strong>
                                    {c.sectionHeading
                                      ? ` · ${c.sectionHeading}`
                                      : ''}
                                    {c.pageNumber
                                      ? ` (Hal. ${c.pageNumber})`
                                      : ''}
                                  </div>
                                  <p className="text-xs text-gray-300 italic leading-relaxed border-l-2 border-cyan-400/20 pl-2.5">
                                    "{c.snippet.trim()}"
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <div className="text-center text-xs text-gray-500 mt-6 px-4">
          Aplikasi ini memberikan informasi edukasi berlandaskan panduan resmi.
          Bukan pengganti diagnosis atau saran medis profesional. Segera
          kunjungi fasilitas kesehatan terdekat jika ada kondisi darurat.
        </div>
      </main>
    </div>
  )
}
