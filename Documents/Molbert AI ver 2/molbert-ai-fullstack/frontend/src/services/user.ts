import axios from "axios"

import { OpenAPI } from "@/client"

const authHeaders = () => {
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const client = axios.create({
  baseURL: OpenAPI.BASE,
})

export type UsageInfo = {
  plan: string
  credits_balance: number
  free_daily_limit: number
  free_daily_used: number
  free_daily_remaining: number
  rate_limit_per_minute: number
  used_last_minute: number
}

export const fetchUsage = async (): Promise<UsageInfo> => {
  const response = await client.get("/api/v1/users/me/usage", {
    headers: {
      ...authHeaders(),
    },
  })
  return response.data as UsageInfo
}
