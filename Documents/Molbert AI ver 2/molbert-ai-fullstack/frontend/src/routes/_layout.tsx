import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  return (
    <div className="relative min-h-screen w-full bg-[#e8eaed] text-stone-900">
      <Outlet />
    </div>
  )
}

export default Layout
