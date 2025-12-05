import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { FiLock } from "react-icons/fi"

import { LoginService } from "@/client"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { passwordRules } from "@/utils"

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
})

function ResetPassword() {
  const navigate = useNavigate({ from: Route.fullPath })
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ token: string; new_password: string }>({ mode: "onBlur" })

  const onSubmit = async (data: { token: string; new_password: string }) => {
    if (isSubmitting) return
    try {
      await LoginService.resetPassword({ requestBody: data })
      navigate({ to: "/login" })
    } catch {
      // ignore errors for now
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 space-y-1 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Molbert AI
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Reset password</h1>
          <p className="text-sm text-slate-500">Enter your new password</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="new_password">New password</Label>
            <div className="relative">
              <FiLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="new_password"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                error={errors.new_password?.message}
                {...register("new_password", passwordRules())}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Token</Label>
            <Input
              id="token"
              type="text"
              placeholder="Paste your reset token"
              error={errors.token?.message}
              {...register("token", { required: "Token is required" })}
            />
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full justify-center"
          >
            Update password
          </Button>
        </form>
      </Card>
    </div>
  )
}
