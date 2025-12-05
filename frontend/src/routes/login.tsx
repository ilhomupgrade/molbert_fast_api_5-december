import { createFileRoute, Link as RouterLink, redirect } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { FiLock, FiMail } from "react-icons/fi"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { emailPattern, passwordRules } from "@/utils"

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/" })
    }
  },
})

function Login() {
  const { loginMutation } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { username: "", password: "" },
  })

  const onSubmit = async (data: AccessToken) => {
    if (isSubmitting) return
    try {
      await loginMutation.mutateAsync(data)
    } catch {
      // handled in hook
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 space-y-1 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Molbert AI
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500">Sign in to your account</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="username">Email</Label>
            <div className="relative">
              <FiMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="username"
                type="email"
                placeholder="email@example.com"
                className="pl-9"
                error={errors.username?.message}
                {...register("username", {
                  required: "Email is required",
                  pattern: emailPattern,
                })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <FiLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                error={errors.password?.message}
                {...register("password", passwordRules())}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <RouterLink to="/recover-password" className="text-slate-600 underline">
              Forgot password?
            </RouterLink>
            <RouterLink to="/signup" className="text-slate-600 underline">
              Create account
            </RouterLink>
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full justify-center"
          >
            Log In
          </Button>
        </form>
      </Card>
    </div>
  )
}
