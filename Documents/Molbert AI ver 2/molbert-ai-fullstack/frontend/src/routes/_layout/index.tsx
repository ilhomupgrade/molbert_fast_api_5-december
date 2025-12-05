import { useEffect, useMemo, useRef, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Upload, Image as ImageIcon, Edit, Palette, Video, RotateCcw, Sparkles, Download } from "lucide-react"

import { HistoryPanel } from "@/components/HistoryPanel"
import { editImage, textToImage, composeImage } from "@/services/image"

type StudioMode = "create-image" | "edit-image" | "compose-image" | "create-video"
export const Route = createFileRoute("/_layout/")({
  component: VeoLikeStudio,
})

function VeoLikeStudio() {
  const [mode, setMode] = useState<StudioMode>("create-image")
  const [imagePrompt, setImagePrompt] = useState("")
  const [editPrompt, setEditPrompt] = useState("")
  const [composePrompt, setComposePrompt] = useState("")
  const [_model] = useState("gemini-2.5-flash-image-preview")
  const [aspectRatio, _setAspectRatio] = useState("1:1")
  const [outputFormat, _setOutputFormat] = useState("png")
  const [resolution, _setResolution] = useState("1K")

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [generatedFile, setGeneratedFile] = useState<File | null>(null)
  const [multipleImageFiles, setMultipleImageFiles] = useState<File[]>([])
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
  const multipleFileInputRef = useRef<HTMLInputElement | null>(null)
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

  const canStart = useMemo(() => {
    if (mode === "create-image") {
      return imagePrompt.trim().length > 0
    } else if (mode === "edit-image") {
      return editPrompt.trim().length > 0 && Boolean(imageFile || generatedFile)
    } else if (mode === "compose-image") {
      // Allow composition with existing image + new images, or just new images
      const hasExistingImage = imageFile || generatedFile
      const hasNewImages = multipleImageFiles.length > 0
      return composePrompt.trim().length > 0 && (hasExistingImage || hasNewImages)
    } else if (mode === "create-video") {
      return imagePrompt.trim().length > 0 // video uses imagePrompt for now
    }
    return false
  }, [mode, imagePrompt, editPrompt, composePrompt, imageFile, generatedFile, multipleImageFiles])

  const resetAll = () => {
    setImagePrompt("")
    setEditPrompt("")
    setComposePrompt("")
    setImageFile(null)
    setGeneratedFile(null)
    setMultipleImageFiles([])
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

  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    const imageFiles = files.filter((file) => file.type.startsWith("image/"))
    const limitedFiles = imageFiles.slice(0, 10)
    setMultipleImageFiles((prevFiles) =>
      [...prevFiles, ...limitedFiles].slice(0, 10)
    )
  }

  const removeMultipleImage = (index: number) => {
    setMultipleImageFiles((prev) => prev.filter((_, i) => i !== index))
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
      } else if (mode === "edit-image") {
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
      } else if (mode === "compose-image") {
        // Collect all images: existing + newly uploaded
        const allFiles: File[] = []

        // Add newly uploaded images first
        allFiles.push(...multipleImageFiles)

        // Add existing image if any
        const baseFile = imageFile ?? generatedFile
        if (baseFile) {
          allFiles.push(baseFile)
        }

        if (allFiles.length === 0) {
          setError("Upload at least one image first")
          return
        }

        const file = await composeImage({
          files: allFiles,
          prompt: composePrompt,
          aspect_ratio: aspectRatio,
          output_format: outputFormat,
          resolution,
        })
        setGeneratedFile(file)
        setMultipleImageFiles([]) // Clear after composition
        setStatus("Image composed")
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось выполнить запрос"
      setError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const currentPrompt = mode === "create-image" || mode === "create-video"
    ? imagePrompt
    : mode === "edit-image"
      ? editPrompt
      : composePrompt

  const setCurrentPrompt = (value: string) => {
    if (mode === "create-image" || mode === "create-video") {
      setImagePrompt(value)
    } else if (mode === "edit-image") {
      setEditPrompt(value)
    } else {
      setComposePrompt(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      startGeneration()
    }
  }

  const getPlaceholder = () => {
    switch (mode) {
      case "create-image":
        return "Describe the image to create..."
      case "edit-image":
        return "Describe how to edit the image..."
      case "compose-image":
        return "Describe how to combine the images..."
      case "create-video":
        return "Describe the video to generate..."
      default:
        return "Describe..."
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Main content area */}
      <div className="flex flex-col items-center justify-center min-h-screen pb-40 px-4">
        {isGenerating ? (
          <div className="w-full max-w-3xl">
            <div className="flex flex-col items-center justify-center gap-3 text-center px-4">
              <ImageIcon className="w-16 h-16 text-gray-400 animate-pulse" />
              <div className="inline-flex items-center rounded-full bg-gray-200/70 px-3 py-1 text-xs font-medium text-gray-700">
                Gemini 2.5 Flash
              </div>
              <div className="text-xs text-gray-600">
                Creating your image...
              </div>
              <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full w-full animate-pulse bg-gray-400/70 rounded-full" />
              </div>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="w-full max-w-4xl">
            <div className="flex flex-col items-center gap-6">
              <div
                ref={containerRef}
                className="relative w-full aspect-video overflow-hidden rounded-lg border"
              >
                <img
                  src={previewUrl}
                  alt="Generated"
                  onLoad={(e) => {
                    const img = e.currentTarget
                    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
                  }}
                  className="w-full h-full object-contain"
                />
                {mode === "edit-image" && isBrushActive && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 z-20 h-full w-full cursor-crosshair touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl">
            {mode === "edit-image" && (
              <div
                className="rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors bg-white/10 border-gray-300/70 hover:bg-white/30"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-3 text-slate-800/80">
                  <Upload className="w-8 h-8" />
                  <div className="text-center">
                    <div className="font-medium text-lg">
                      Drop an image here, or click to upload
                    </div>
                    <div className="text-sm opacity-80 mt-1">
                      PNG, JPG, WEBP up to 10MB
                    </div>
                  </div>
                </div>
              </div>
            )}
            {mode === "compose-image" && (
              <div className="w-full">
                <div className="text-center text-slate-600 mb-6">
                  <div className="text-lg font-medium mb-2">
                    Compose Multiple Images
                  </div>
                  <div className="text-sm opacity-80">
                    Upload multiple images to combine them into a single composition
                  </div>
                </div>
                <div
                  className="rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors bg-white/10 border-gray-300/70 hover:bg-white/30"
                  onClick={() => multipleFileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-3 text-slate-800/80">
                    <Upload className="w-8 h-8" />
                    <div className="text-center">
                      <div className="font-medium text-lg">
                        Drop multiple images here, or click to upload
                      </div>
                      <div className="text-sm opacity-80 mt-1">
                        PNG, JPG, WEBP up to 10MB each (max 10 images)
                      </div>
                      {multipleImageFiles.length > 0 && (
                        <div className="text-sm mt-2 text-green-600">
                          ✓ {multipleImageFiles.length} image{multipleImageFiles.length > 1 ? "s" : ""} selected
                          {multipleImageFiles.length >= 10 ? " (max reached)" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Thumbnails of uploaded images */}
                {multipleImageFiles.length > 0 && (
                  <div className="mt-6">
                    <div className="flex flex-wrap gap-4 justify-center">
                      {multipleImageFiles.map((file, index) => (
                        <div
                          key={index}
                          className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-white/30 shadow-md group"
                          title={file.name}
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeMultipleImage(index)
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {mode !== "edit-image" && mode !== "compose-image" && (
              <div className="text-stone-400 select-none text-center w-full">
                Nothing to see here
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={multipleFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleMultipleFileChange}
        />

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}
      </div>

      {/* Composer - fixed at bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-[min(100%,48rem)] px-4">
        <div className="relative text-slate-900/80 backdrop-blur-sm bg-white/30 px-3 py-3 rounded-lg">
          {hasGeneratedImage && (
            <div className="absolute -top-12 right-0 z-10">
              <button
                onClick={downloadImage}
                className="inline-flex items-center gap-2 bg-white/30 hover:bg-white text-slate-700 py-2 px-4 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          )}

          {/* Model selector */}
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/50 px-3 py-1.5 text-sm font-medium text-slate-700">
              <Sparkles className="w-4 h-4" />
              Gemini 2.5 Flash
            </div>
          </div>

          {/* Prompt textarea */}
          <textarea
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            className="w-full bg-transparent focus:outline-none resize-none text-base font-normal placeholder-slate-800/60"
            rows={2}
          />

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={resetAll}
              className="h-10 w-10 flex items-center justify-center bg-white/50 rounded-full hover:bg-white/70 cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={startGeneration}
              disabled={!canStart || isGenerating}
              className={`h-10 w-10 flex items-center justify-center rounded-full text-white transition ${
                !canStart || isGenerating
                  ? "bg-white/50 cursor-not-allowed"
                  : "bg-white/50 hover:bg-white/70 cursor-pointer"
              }`}
              title="Generate"
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 text-black" />
              )}
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 mt-3 bg-white/10 rounded-md p-1 border border-white/20">
            {[
              { key: "create-image", label: "Create Image", icon: ImageIcon, color: "indigo" },
              { key: "edit-image", label: "Edit Image", icon: Edit, color: "blue" },
              { key: "compose-image", label: "Compose Image", icon: Palette, color: "green" },
              { key: "create-video", label: "Create Video", icon: Video, color: "purple" },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = mode === tab.key
              const isDisabled = tab.key === "create-video" // Video is stub
              return (
                <button
                  key={tab.key}
                  onClick={() => !isDisabled && setMode(tab.key as StudioMode)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition flex-1 ${
                    isActive
                      ? `bg-${tab.color}-400/30 text-slate-900 backdrop-blur-sm`
                      : isDisabled
                      ? "text-slate-400 cursor-not-allowed opacity-50"
                      : "text-slate-700 hover:bg-white/30 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <HistoryPanel open={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  )
}
