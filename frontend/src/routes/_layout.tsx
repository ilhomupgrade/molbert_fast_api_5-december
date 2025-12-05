import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router"

import useAuth, { isLoggedIn } from "@/hooks/useAuth"

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
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-24 pt-8">
        <header className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-white/75 px-5 py-4 shadow-lg backdrop-blur glass-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
              <span className="text-lg font-semibold text-slate-800">M</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Molbert AI
              </p>
              <h1 className="text-xl font-bold text-slate-900">
                Creative Studio
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <div className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 shadow-sm">
              API: online
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-100" />
              <div className="text-left leading-tight">
                <Link to="/settings" className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                  Профиль
                </Link>
                <Link
                  to="/settings"
                  className="text-sm font-semibold text-slate-800 hover:text-slate-900"
                >
                  {user?.email || "user"}
                </Link>
              </div>
              <div className="ml-2 flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                  {user?.plan || "free"}
                </span>
                <span>{user?.credits_balance ?? 0} кр.</span>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Выйти
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
