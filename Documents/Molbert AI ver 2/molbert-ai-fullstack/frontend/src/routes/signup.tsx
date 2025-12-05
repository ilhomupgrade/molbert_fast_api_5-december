import { createFileRoute, Link as RouterLink, redirect } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { FiLock, FiMail, FiUser } from "react-icons/fi"

import type { UserRegister } from "@/client"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { emailPattern, passwordRules } from "@/utils"

export const Route = createFileRoute("/signup")({
  component: Signup,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/" })
    }
  },
})

function Signup() {
  const { signUpMutation } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserRegister>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { email: "", password: "", full_name: "" },
  })

  const onSubmit = async (data: UserRegister) => {
    if (isSubmitting) return
    try {
      await signUpMutation.mutateAsync(data)
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
          <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
          <p className="text-sm text-slate-500">Sign up to get started</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <div className="relative">
              <FiUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="full_name"
                type="text"
                placeholder="Your name"
                className="pl-9"
                error={errors.full_name?.message}
                {...register("full_name", { required: "Full name is required" })}
              />
            </div>
          </div>

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

          <div className="text-sm text-slate-500">
            Already have an account?{" "}
            <RouterLink to="/login" className="text-slate-700 underline">
              Log in
            </RouterLink>
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full justify-center"
          >
            Sign Up
          </Button>
        </form>
      </Card>
    </div>
  )
}
