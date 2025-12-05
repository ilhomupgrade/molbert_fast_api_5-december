import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { editImage, textToImage } from "@/services/image"

type Mode = "create-image" | "edit-image" | "compose-image" | "create-video"

const modeLabels: Record<Mode, string> = {
  "create-image": "Create Image",
  "edit-image": "Edit Image",
  "compose-image": "Compose Image",
  "create-video": "Create Video (stub)",
}

export const Route = createFileRoute("/_layout/studio")({
  component: StudioPage,
})

function StudioPage() {
  const [mode, setMode] = useState<Mode>("create-image")
  const [prompt, setPrompt] = useState("")
  const [editPrompt, setEditPrompt] = useState("")
  const [composePrompt, setComposePrompt] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [generatedFile, setGeneratedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hotspot, setHotspot] = useState<{ x: number; y: number } | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (!generatedFile && selectedFiles.length === 0) {
      setPreviewUrl(null)
      return
    }
    const file = selectedFiles[0] ?? generatedFile
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [generatedFile, selectedFiles])

  const canRun = useMemo(() => {
    if (mode === "create-image") return prompt.trim().length > 0
    if (mode === "edit-image") return editPrompt.trim().length > 0 && (selectedFiles[0] || generatedFile)
    if (mode === "compose-image") return composePrompt.trim().length > 0 && (selectedFiles[0] || generatedFile)
    return false
  }, [mode, prompt, editPrompt, composePrompt, selectedFiles, generatedFile])

  const handleFileInput = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setSelectedFiles(Array.from(files))
    setHotspot(null)
  }

  const reset = () => {
    setPrompt("")
    setEditPrompt("")
    setComposePrompt("")
    setSelectedFiles([])
    setGeneratedFile(null)
    setPreviewUrl(null)
    setStatus(null)
    setError(null)
    setHotspot(null)
    setNaturalSize(null)
  }

  const runCreate = async () => {
    setIsLoading(true)
    setError(null)
    setStatus("Generating via Molbert...")
    try {
      const file = await textToImage({ prompt })
      setGeneratedFile(file)
      setStatus("Done")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сгенерировать"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const runEdit = async (activePrompt: string) => {
    const file = selectedFiles[0] ?? generatedFile
    if (!file) {
      setError("Добавьте изображение")
      return
    }
    if (!hotspot) {
      setError("Нажмите на изображение, чтобы выбрать точку")
      return
    }
    setIsLoading(true)
    setError(null)
    setStatus("Editing via Molbert (point mode)...")
    try {
      const result = await editImage({ file, prompt: activePrompt, hotspot })
      setGeneratedFile(result)
      setStatus("Done")
      setHotspot(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось обработать"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const onRun = async () => {
    if (!canRun) return
    if (mode === "create-image") {
      await runCreate()
    } else if (mode === "edit-image") {
      await runEdit(editPrompt)
    } else if (mode === "compose-image") {
      await runEdit(composePrompt)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-600/60 via-purple-600/60 to-pink-600/60 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-white/80">Molbert Studio</p>
            <h1 className="text-2xl font-bold">Veo/Nano Banana inspired UI</h1>
            <p className="text-white/80">Работает через Molbert API (credits/лимиты сохраняются). Видео — заглушка.</p>
          </div>
          <div className="flex gap-2">
            {(Object.keys(modeLabels) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                  mode === m ? "bg-white text-indigo-700" : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {modeLabels[m]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur">
          <h2 className="mb-3 text-lg font-semibold text-white">Canvas</h2>
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/30">
            {previewUrl ? (
              <div className="relative w-full">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-[520px] w-full rounded-lg object-contain"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const offsetX = e.clientX - rect.left
                    const offsetY = e.clientY - rect.top
                    const naturalW = naturalSize?.w ?? e.currentTarget.naturalWidth
                    const naturalH = naturalSize?.h ?? e.currentTarget.naturalHeight
                    const scaleX = naturalW / e.currentTarget.clientWidth
                    const scaleY = naturalH / e.currentTarget.clientHeight
                    setHotspot({
                      x: Math.round(offsetX * scaleX),
                      y: Math.round(offsetY * scaleY),
                    })
                  }}
                  onLoad={(e) => {
                    setNaturalSize({
                      w: e.currentTarget.naturalWidth,
                      h: e.currentTarget.naturalHeight,
                    })
                  }}
                />
                {hotspot && naturalSize && (
                  <div
                    className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-400/70 shadow-lg"
                    style={{
                      left: `${(hotspot.x / naturalSize.w) * 100}%`,
                      top: `${(hotspot.y / naturalSize.h) * 100}%`,
                    }}
                  />
                )}
              </div>
            ) : (
              <p className="text-white/50">Добавьте или сгенерируйте изображение</p>
            )}
          </div>
          {status && <p className="mt-3 text-sm text-emerald-300">{status}</p>}
          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        </section>

        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{modeLabels[mode]}</h3>
              <button
                onClick={reset}
                className="text-sm text-white/70 underline decoration-dashed underline-offset-4 hover:text-white"
              >
                Reset
              </button>
            </div>

            {mode === "create-image" && (
              <div className="mt-3 space-y-3">
                <label className="text-sm text-white/70">Prompt</label>
                <textarea
                  className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-white outline-none ring-offset-2 focus:border-white/30 focus:ring-2 focus:ring-indigo-400"
                  placeholder="Describe your image"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            {mode === "edit-image" && (
              <div className="mt-3 space-y-3">
                <label className="text-sm text-white/70">Edit prompt</label>
                <textarea
                  className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-white outline-none ring-offset-2 focus:border-white/30 focus:ring-2 focus:ring-indigo-400"
                  placeholder="What to change?"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-white/60">
                  Нажмите на превью, чтобы выбрать точку редактирования.
                  {hotspot ? ` Выбрано: x=${hotspot.x}, y=${hotspot.y}` : ""}
                </p>
              </div>
            )}

            {mode === "compose-image" && (
              <div className="mt-3 space-y-3">
                <label className="text-sm text-white/70">Compose prompt</label>
                <textarea
                  className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-white outline-none ring-offset-2 focus:border-white/30 focus:ring-2 focus:ring-indigo-400"
                  placeholder="Blend or adjust your images"
                  value={composePrompt}
                  onChange={(e) => setComposePrompt(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {mode === "create-video" && (
              <div className="mt-3 rounded-lg border border-yellow-300/40 bg-yellow-500/10 p-3 text-yellow-200">
                Видео генерация (Veo) недоступна в этой сборке.
              </div>
            )}

            {mode !== "create-video" && (
              <div className="mt-4 space-y-3">
                <label className="text-sm text-white/70">Изображение (опционально для edit/compose)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple={mode === "compose-image"}
                  className="w-full cursor-pointer rounded-lg border border-white/10 bg-black/30 p-2 text-white"
                  onChange={(e) => handleFileInput(e.target.files)}
                />
                {selectedFiles.length > 0 && (
                  <p className="text-xs text-white/60">
                    Выбрано файлов: {selectedFiles.length} (используется первый для отправки)
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={onRun}
                disabled={!canRun || isLoading || mode === "create-video"}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  !canRun || isLoading || mode === "create-video"
                    ? "cursor-not-allowed bg-white/10 text-white/40"
                    : "bg-indigo-500 text-white hover:bg-indigo-400"
                }`}
              >
                {isLoading ? "Processing..." : mode === "create-video" ? "Недоступно" : "Run"}
              </button>
              <button
                onClick={reset}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80 shadow-lg backdrop-blur">
            <h4 className="text-sm font-semibold text-white">Как это работает</h4>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              <li>UI — из квикстарта Veo/Imagen, но запросы идут в Molbert API.</li>
              <li>Лимиты и кредиты Molbert применяются ко всем операциям.</li>
              <li>Видео (Veo) пока в заглушке.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
