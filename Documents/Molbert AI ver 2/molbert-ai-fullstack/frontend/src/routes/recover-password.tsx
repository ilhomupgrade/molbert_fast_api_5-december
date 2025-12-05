import { createFileRoute } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { FiMail } from "react-icons/fi"

import { LoginService } from "@/client"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { emailPattern } from "@/utils"

type RecoverForm = { email: string }

export const Route = createFileRoute("/recover-password")({
  component: RecoverPassword,
})

function RecoverPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverForm>({ mode: "onBlur" })

  const onSubmit = async (data: RecoverForm) => {
    if (isSubmitting) return
    try {
      await LoginService.recoverPasswordHtmlContent({ email: data.email })
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
          <h1 className="text-2xl font-bold text-slate-900">Recover password</h1>
          <p className="text-sm text-slate-500">
            We'll send reset instructions to your email
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <FiMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                className="pl-9"
                error={errors.email?.message}
                {...register("email", { required: "Email is required", pattern: emailPattern })}
              />
            </div>
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full justify-center"
          >
            Send instructions
          </Button>
        </form>
      </Card>
    </div>
  )
}
