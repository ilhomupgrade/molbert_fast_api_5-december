import { useEffect, useMemo, useRef, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Upload } from "lucide-react"

import { HistoryPanel } from "@/components/HistoryPanel"
import { Composer } from "@/components/veo/Composer"
import { editImage, textToImage } from "@/services/image"

type StudioMode = "create-image" | "edit-image"
export const Route = createFileRoute("/_layout/")({
  component: VeoLikeStudio,
})

function VeoLikeStudio() {
  const [mode, setMode] = useState<StudioMode>("create-image")
  const [imagePrompt, setImagePrompt] = useState("")
  const [editPrompt, setEditPrompt] = useState("")
  const [_model] = useState("gemini-2.5-flash-image-preview")
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [outputFormat, setOutputFormat] = useState("png")
  const [resolution, setResolution] = useState("1K")

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [generatedFile, setGeneratedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isBrushActive, setIsBrushActive] = useState(false)
  const [maskBox, setMaskBox] = useState<{
    minX: number
    minY: number
    maxX: number
    maxY: number
  } | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const hasGeneratedImage = useMemo(
    () => Boolean(generatedFile || imageFile),
    [generatedFile, imageFile],
  )

  const clearMask = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setMaskBox(null)
  }

  useEffect(() => {
    const file = generatedFile ?? imageFile
    if (!file) {
      setPreviewUrl(null)
      setNaturalSize(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [generatedFile, imageFile])

  // сбрасываем маску при новой картинке/режиме
  useEffect(() => {
    setMaskBox(null)
    clearMask()
  }, [previewUrl, mode])

  // выключаем кисть, если уходим из edit
  useEffect(() => {
    if (mode !== "edit-image") {
      setIsBrushActive(false)
    }
  }, [mode])

  // актуализируем размер canvas под контейнер
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (canvas && container) {
        const { clientWidth, clientHeight } = container
        canvas.width = clientWidth
        canvas.height = clientHeight
      }
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (canvas && container) {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }
  }, [previewUrl])

  const canStart =
    mode === "create-image"
      ? imagePrompt.trim().length > 0
      : editPrompt.trim().length > 0 && Boolean(imageFile || generatedFile)

  const resetAll = () => {
    setImagePrompt("")
    setEditPrompt("")
    setImageFile(null)
    setGeneratedFile(null)
    setStatus(null)
    setError(null)
    setMaskBox(null)
    clearMask()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setImageFile(file)
    setGeneratedFile(null)
    setMaskBox(null)
    clearMask()
  }

  const downloadImage = () => {
    const file = generatedFile ?? imageFile
    if (!file) return
    const link = document.createElement("a")
    link.href = URL.createObjectURL(file)
    link.download = `molbert-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  const paintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const size = naturalSize ?? {
      width: container.clientWidth,
      height: container.clientHeight,
    }
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    // радиус визуально ~30px: 15px радиус + 15px половина линии
    ctx.fillStyle = "rgba(59,130,246,0.45)"
    ctx.strokeStyle = "rgba(37,99,235,0.6)"
    ctx.lineWidth = 30
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    ctx.arc(x, y, 15, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // апдейтим bounding box в координатах оригинального изображения
    const scaleX = size.width / rect.width
    const scaleY = size.height / rect.height
    const nx = x * scaleX
    const ny = y * scaleY
    setMaskBox((prev) => ({
      minX: Math.min(prev?.minX ?? nx, nx),
      minY: Math.min(prev?.minY ?? ny, ny),
      maxX: Math.max(prev?.maxX ?? nx, nx),
      maxY: Math.max(prev?.maxY ?? ny, ny),
    }))
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isBrushActive || mode !== "edit-image") return
    e.preventDefault()
    setIsDrawing(true)
    paintAt(e.clientX, e.clientY)
  }
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isBrushActive || mode !== "edit-image" || !isDrawing) return
    e.preventDefault()
    paintAt(e.clientX, e.clientY)
  }
  const handlePointerUp = () => {
    setIsDrawing(false)
  }

  const startGeneration = async () => {
    if (!canStart || isGenerating) return
    setIsGenerating(true)
    setError(null)
    setStatus("Sending request to Molbert API...")
    try {
      if (mode === "create-image") {
        const file = await textToImage({
          prompt: imagePrompt,
          aspect_ratio: aspectRatio,
          resolution,
          output_format: outputFormat,
        })
        setGeneratedFile(file)
        setStatus("Image ready")
      } else {
        const baseFile = imageFile ?? generatedFile
        if (!baseFile) {
          setError("Upload an image first")
          return
        }
        const size = naturalSize ?? {
          width: 512,
          height: 512,
        }
        const centerX = Math.round(
          maskBox ? (maskBox.minX + maskBox.maxX) / 2 : size.width / 2,
        )
        const centerY = Math.round(
          maskBox ? (maskBox.minY + maskBox.maxY) / 2 : size.height / 2,
        )
        const file = await editImage({
          file: baseFile,
          prompt: editPrompt,
          hotspot: { x: centerX, y: centerY },
          aspect_ratio: aspectRatio,
          output_format: outputFormat,
          resolution,
        })
        setGeneratedFile(file)
        setStatus("Image adjusted")
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось выполнить запрос"
      setError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-4 md:pt-6">
      <div className="glass-panel relative rounded-3xl p-4 md:p-5">
        <div
          ref={containerRef}
          className="relative h-[420px] overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-inner backdrop-blur"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              onLoad={(e) => {
                const img = e.currentTarget
                setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
              }}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-500">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/70 shadow">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">
                Upload an image or generate a new one
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
              >
                Upload
              </button>
            </div>
          )}
          {mode === "edit-image" && isBrushActive && previewUrl && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 z-20 h-full w-full cursor-crosshair touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          )}
          {mode === "edit-image" && maskBox && (
            <button
              onClick={clearMask}
              className="absolute left-4 bottom-4 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow hover:bg-white"
            >
              Сбросить выделение
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow hover:bg-white"
          >
            <Upload className="h-4 w-4" />
            <span>Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}
      </div>

      <Composer
        mode={mode}
        setMode={setMode}
        hasGeneratedImage={hasGeneratedImage}
        imagePrompt={imagePrompt}
        setImagePrompt={setImagePrompt}
        editPrompt={editPrompt}
        setEditPrompt={setEditPrompt}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        outputFormat={outputFormat}
        setOutputFormat={setOutputFormat}
        resolution={resolution}
        setResolution={setResolution}
        canStart={canStart}
        isGenerating={isGenerating}
        startGeneration={startGeneration}
        resetAll={resetAll}
        downloadImage={downloadImage}
        onShowHistory={() => setShowHistory(true)}
        onToggleBrush={
          mode === "edit-image"
            ? () => {
                setIsBrushActive((prev) => !prev)
                if (isBrushActive) {
                  clearMask()
                }
              }
            : undefined
        }
        isBrushActive={isBrushActive}
        floating={false}
        className="border border-white/60 bg-white/70"
      />
      <HistoryPanel open={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  )
}
