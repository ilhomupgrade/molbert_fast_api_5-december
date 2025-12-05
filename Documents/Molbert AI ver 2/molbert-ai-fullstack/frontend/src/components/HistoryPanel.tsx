import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { X } from "lucide-react"

import { OpenAPI } from "@/client"

type GenerationEntry = {
  id: number
  mode: string
  prompt: string
  file_url: string
  created_at: string
}

type HistoryPanelProps = {
  open: boolean
  onClose: () => void
}

const fetchHistory = async (): Promise<GenerationEntry[]> => {
  const token = localStorage.getItem("access_token")
  const base = OpenAPI.BASE?.replace(/\/$/, "") || ""
  const resp = await axios.get(`${base}/api/v1/images/history`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    params: { limit: 20 },
  })
  return resp.data ?? []
}

export function HistoryPanel({ open, onClose }: HistoryPanelProps) {
  const { data, isLoading, error } = useQuery<GenerationEntry[]>({
    queryKey: ["history"],
    queryFn: fetchHistory,
    enabled: open,
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="glass-panel relative w-full max-w-3xl rounded-2xl bg-white/85 p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              История
            </p>
            <h3 className="text-lg font-semibold text-slate-900">
              Последние генерации
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Закрыть историю"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-white/70 bg-white/70">
          {isLoading && (
            <div className="p-4 text-sm text-slate-500">Загрузка...</div>
          )}
          {error && (
            <div className="p-4 text-sm text-rose-600">
              Не удалось загрузить историю
            </div>
          )}
          {!isLoading && !error && (
            <ul className="divide-y divide-slate-100">
              {data && data.length > 0 ? (
                data.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 px-4 py-3 text-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-semibold uppercase text-slate-600">
                      {item.mode}
                    </div>
                    <div className="flex-1">
                      <p className="line-clamp-2 font-semibold text-slate-800">
                        {item.prompt}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow hover:bg-slate-50"
                    >
                      Открыть
                    </a>
                  </li>
                ))
              ) : (
                <li className="px-4 py-3 text-sm text-slate-500">
                  Пока нет записей
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
