import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import axios from "axios"
import { useState } from "react"

import {
  type UpdatePassword,
  type UserUpdateMe,
  OpenAPI,
  UsersService,
} from "@/client"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import useAuth from "@/hooks/useAuth"
type UsageInfo = {
  plan: string
  credits_balance: number
  free_daily_limit: number
  free_daily_used: number
  free_daily_remaining: number
  rate_limit_per_minute: number
  used_last_minute: number
}

export const Route = createFileRoute("/_layout/settings")({
  component: Settings,
})

function Settings() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [fullName, setFullName] = useState(currentUser?.full_name || "")
  const [email, setEmail] = useState(currentUser?.email || "")
  const [status, setStatus] = useState<string | null>(null)
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null)
  const [pwForm, setPwForm] = useState<UpdatePassword>({
    current_password: "",
    new_password: "",
  })

  const usage = useQuery<UsageInfo>({
    queryKey: ["usage"],
    queryFn: async () => {
      const token = localStorage.getItem("access_token")
      const base = OpenAPI.BASE?.replace(/\/$/, "") || ""
      const resp = await axios.get<UsageInfo>(`${base}/api/v1/users/me/usage`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return resp.data
    },
    enabled: Boolean(currentUser),
  })

  const updateProfile = useMutation({
    mutationFn: (payload: UserUpdateMe) =>
      UsersService.updateUserMe({ requestBody: payload }),
    onSuccess: (data) => {
      queryClient.setQueryData(["currentUser"], data)
      setStatus("Profile updated")
    },
    onError: () => setStatus("Failed to update profile"),
  })

  const updatePassword = useMutation({
    mutationFn: (payload: UpdatePassword) =>
      UsersService.updatePasswordMe({ requestBody: payload }),
    onSuccess: () => setPasswordStatus("Password updated"),
    onError: () => setPasswordStatus("Failed to update password"),
  })

  if (!currentUser) return null

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Settings
        </p>
        <h1 className="text-3xl font-bold text-slate-900">User Settings</h1>
        <p className="text-sm text-slate-600">
          Профиль, пароль и параметры тарифа.
        </p>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
        <p className="text-sm text-slate-600">
          Email и имя для вашего аккаунта.
        </p>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() =>
                updateProfile.mutate({
                  full_name: fullName,
                  email,
                })
              }
              loading={updateProfile.status === "pending"}
            >
              Save changes
            </Button>
            {status && (
              <span className="text-sm font-semibold text-slate-600">
                {status}
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-slate-900">
          Billing & Usage
        </h2>
        <p className="text-sm text-slate-600">
          Текущий план, баланс кредитов и лимиты.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              План
            </p>
            <p className="text-lg font-bold text-slate-900">
              {currentUser.plan}
            </p>
          </div>
          <div className="space-y-1 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Кредиты
            </p>
            <p className="text-lg font-bold text-slate-900">
              {currentUser.credits_balance} кр.
            </p>
          </div>
          <div className="space-y-1 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Free daily remaining
            </p>
            <p className="text-lg font-bold text-slate-900">
              {usage.data?.free_daily_remaining ?? "—"}
            </p>
          </div>
          <div className="space-y-1 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rate limit / min
            </p>
            <p className="text-lg font-bold text-slate-900">
              {usage.data?.rate_limit_per_minute ?? "—"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="solid">Пополнить баланс</Button>
          {usage.isLoading && (
            <span className="text-sm text-slate-500">Загрузка...</span>
          )}
          {usage.isError && (
            <span className="text-sm text-rose-600">
              Не удалось получить usage
            </span>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-slate-900">
          Change password
        </h2>
        <p className="text-sm text-slate-600">
          Введите текущий и новый пароль.
        </p>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current password</Label>
            <Input
              id="current_password"
              type="password"
              value={pwForm.current_password}
              onChange={(e) =>
                setPwForm((prev) => ({
                  ...prev,
                  current_password: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">New password</Label>
            <Input
              id="new_password"
              type="password"
              value={pwForm.new_password}
              onChange={(e) =>
                setPwForm((prev) => ({
                  ...prev,
                  new_password: e.target.value,
                }))
              }
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => updatePassword.mutate(pwForm)}
              loading={updatePassword.status === "pending"}
            >
              Update password
            </Button>
            {passwordStatus && (
              <span className="text-sm font-semibold text-slate-600">
                {passwordStatus}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
