import axios from "axios"

import { OpenAPI } from "@/client"

type Hotspot = { x: number; y: number }

const authHeaders = () => {
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const client = axios.create({
  baseURL: OpenAPI.BASE,
})

const toAbsoluteUrl = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  const base = OpenAPI.BASE?.replace(/\/$/, "") || ""
  const path = url.startsWith("/") ? url : `/${url}`
  return `${base}${path}`
}

const downloadFile = async (fileUrl: string, fallbackName: string) => {
  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Не удалось скачать файл (${response.status})`)
  }
  const blob = await response.blob()
  const ext = blob.type.split("/")[1] || "png"
  const filename = fallbackName.endsWith(ext)
    ? fallbackName
    : `${fallbackName}.${ext}`
  return new File([blob], filename, { type: blob.type || "image/png" })
}

export const editImage = async ({
  file,
  prompt,
  hotspot,
  aspect_ratio = "auto",
  output_format = "png",
  resolution = "1K",
}: {
  file: File
  prompt: string
  hotspot: Hotspot
  aspect_ratio?: string
  output_format?: string
  resolution?: string
}) => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("prompt", prompt)
  formData.append("x", hotspot.x.toString())
  formData.append("y", hotspot.y.toString())
  formData.append("aspect_ratio", aspect_ratio)
  formData.append("output_format", output_format)
  formData.append("resolution", resolution)

  const response = await client.post("/api/v1/images/edit", formData, {
    headers: {
      ...authHeaders(),
      "Content-Type": "multipart/form-data",
    },
  })
  const fileUrl: string | undefined = response.data.file_url
  if (!fileUrl) throw new Error("Сервер не вернул ссылку на файл")
  return downloadFile(toAbsoluteUrl(fileUrl), `edit-${Date.now()}`)
}

export const filterImage = async ({
  file,
  prompt,
}: {
  file: File
  prompt: string
}) => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("prompt", prompt)

  const response = await client.post("/api/v1/images/filter", formData, {
    headers: {
      ...authHeaders(),
      "Content-Type": "multipart/form-data",
    },
  })
  const fileUrl: string | undefined = response.data.file_url
  if (!fileUrl) throw new Error("Сервер не вернул ссылку на файл")
  return downloadFile(toAbsoluteUrl(fileUrl), `filter-${Date.now()}`)
}

export const adjustImage = async ({
  file,
  prompt,
}: {
  file: File
  prompt: string
}) => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("prompt", prompt)

  const response = await client.post("/api/v1/images/adjust", formData, {
    headers: {
      ...authHeaders(),
      "Content-Type": "multipart/form-data",
    },
  })
  const fileUrl: string | undefined = response.data.file_url
  if (!fileUrl) throw new Error("Сервер не вернул ссылку на файл")
  return downloadFile(toAbsoluteUrl(fileUrl), `adjust-${Date.now()}`)
}

export const textToImage = async ({
  prompt,
  aspect_ratio = "1:1",
  resolution = "1K",
  output_format = "png",
}: {
  prompt: string
  aspect_ratio?: string
  resolution?: string
  output_format?: string
}) => {
  const formData = new FormData()
  formData.append("prompt", prompt)
  formData.append("aspect_ratio", aspect_ratio)
  formData.append("resolution", resolution)
  formData.append("output_format", output_format)

  const response = await client.post("/api/v1/images/text-to-image", formData, {
    headers: {
      ...authHeaders(),
    },
  })
  const fileUrl: string | undefined = response.data.file_url
  if (!fileUrl) throw new Error("Сервер не вернул ссылку на файл")
  return downloadFile(toAbsoluteUrl(fileUrl), `image-${Date.now()}`)
}

export const composeImage = async ({
  files,
  prompt,
  aspect_ratio = "auto",
  output_format = "png",
  resolution = "1K",
}: {
  files: File[]
  prompt: string
  aspect_ratio?: string
  output_format?: string
  resolution?: string
}) => {
  const formData = new FormData()
  // Append all files
  for (const file of files) {
    formData.append("files", file)
  }
  formData.append("prompt", prompt)
  formData.append("aspect_ratio", aspect_ratio)
  formData.append("output_format", output_format)
  formData.append("resolution", resolution)

  const response = await client.post("/api/v1/images/compose", formData, {
    headers: {
      ...authHeaders(),
      "Content-Type": "multipart/form-data",
    },
  })
  const fileUrl: string | undefined = response.data.file_url
  if (!fileUrl) throw new Error("Сервер не вернул ссылку на файл")
  return downloadFile(toAbsoluteUrl(fileUrl), `compose-${Date.now()}`)
}
