"use client"

import React from "react"
import { Download, Edit, Image as ImageIcon, RotateCcw } from "lucide-react"

import { TooltipContent, TooltipRoot, TooltipTrigger } from "./tooltip"

type StudioMode = "create-image" | "edit-image"

interface ComposerProps {
  mode: StudioMode
  setMode: (mode: StudioMode) => void
  hasGeneratedImage?: boolean

  imagePrompt: string
  setImagePrompt: (value: string) => void
  editPrompt: string
  setEditPrompt: (value: string) => void

  aspectRatio: string
  setAspectRatio: (value: string) => void
  outputFormat: string
  setOutputFormat: (value: string) => void
  resolution: string
  setResolution: (value: string) => void

  canStart: boolean
  isGenerating: boolean
  startGeneration: () => void

  resetAll: () => void
  downloadImage: () => void
  onShowHistory: () => void
  onToggleBrush?: () => void
  isBrushActive?: boolean
  floating?: boolean
  className?: string
}

export const Composer: React.FC<ComposerProps> = ({
  mode,
  setMode,
  hasGeneratedImage = false,
  imagePrompt,
  setImagePrompt,
  editPrompt,
  setEditPrompt,
  aspectRatio,
  setAspectRatio,
  outputFormat,
  setOutputFormat,
  resolution,
  setResolution,
  canStart,
  isGenerating,
  startGeneration,
  resetAll,
  downloadImage,
  onShowHistory,
  onToggleBrush,
  isBrushActive,
  floating = true,
  className,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      startGeneration()
    }
  }

  return (
    <div
      className={
        floating
          ? "fixed bottom-6 left-1/2 z-20 w-[min(100%,48rem)] -translate-x-1/2 px-4"
          : "mt-4 w-full"
      }
    >
      <div
        className={`relative rounded-xl border border-white/30 bg-white/40 px-4 py-3 text-slate-800 shadow-xl backdrop-blur ${className ?? ""}`}
      >
        {hasGeneratedImage && (
          <div className="absolute -top-12 right-0">
            <button
              onClick={downloadImage}
              className="inline-flex items-center gap-2 rounded-lg bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow hover:bg-white"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-white/60 p-1 text-sm font-medium text-slate-700">
            {[
              { key: "create-image", label: "Create Image", icon: ImageIcon },
              { key: "edit-image", label: "Edit Image", icon: Edit },
            ].map((tab) => {
              const Icon = tab.icon
              const active = mode === tab.key
              return (
                <TooltipRoot key={tab.key} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setMode(tab.key as StudioMode)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition ${
                        active
                          ? "bg-slate-900 text-white shadow"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="hidden md:block">
                    {tab.label}
                  </TooltipContent>
                </TooltipRoot>
              )
            })}
          </div>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="rounded-full border border-white/70 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
          >
            {["auto", "21:9", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16"].map(
              (opt) => (
                <option key={opt} value={opt}>
                  AR: {opt}
                </option>
              ),
            )}
          </select>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            className="rounded-full border border-white/70 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
          >
            {["png", "jpeg", "webp"].map((opt) => (
              <option key={opt} value={opt}>
                Format: {opt}
              </option>
            ))}
          </select>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="rounded-full border border-white/70 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
          >
            {["1K", "2K"].map((opt) => (
              <option key={opt} value={opt}>
                Res: {opt}
              </option>
            ))}
          </select>
          {mode === "edit-image" && onToggleBrush && (
            <button
              onClick={onToggleBrush}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-sm ${
                isBrushActive
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Edit className="h-4 w-4" />
              <span>{isBrushActive ? "Кисть активна" : "Кисть"}</span>
            </button>
          )}
          <button
            onClick={onShowHistory}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            История
          </button>
        </div>

        {mode === "create-image" && (
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the image to create..."
            className="w-full resize-none bg-transparent text-base font-normal text-slate-800 placeholder-slate-500 focus:outline-none"
            rows={2}
          />
        )}

        {mode === "edit-image" && (
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe how to adjust the image..."
            className="w-full resize-none bg-transparent text-base font-normal text-slate-800 placeholder-slate-500 focus:outline-none"
            rows={2}
          />
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-800 shadow hover:bg-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
          <button
            onClick={startGeneration}
            disabled={!canStart || isGenerating}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              canStart && !isGenerating
                ? "bg-slate-900 text-white shadow hover:bg-slate-800"
                : "bg-slate-400 text-white opacity-80"
            }`}
          >
            {isGenerating ? "Working..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  )
}
