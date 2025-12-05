import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { type UserPublic, type UserUpdate, UsersService } from "@/client"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Label } from "@/components/ui/Label"
import { cn } from "@/lib/cn"

const usersSearchSchema = z.object({ page: z.number().catch(1) })
const PER_PAGE = 5

function getUsersQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      UsersService.readUsers({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    queryKey: ["users", { page }],
  }
}

export const Route = createFileRoute("/_layout/admin")({
  component: Admin,
  validateSearch: (search) => usersSearchSchema.parse(search),
})

function UsersTable() {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getUsersQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({ to: "/admin", search: (prev) => ({ ...prev, page }) })
  }

  const users = data?.data.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["users"] })

  const deleteMutation = useMutation({
    mutationFn: (user: UserPublic) =>
      UsersService.deleteUser({ userId: user.id }),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { user: UserPublic; body: UserUpdate }) =>
      UsersService.updateUser({
        userId: payload.user.id,
        requestBody: payload.body,
      }),
    onSuccess: invalidate,
  })

  const handleDelete = (user: UserPublic) => {
    if (currentUser?.id === user.id) return
    if (!confirm(`Delete user ${user.email}?`)) return
    deleteMutation.mutate(user)
  }

  const handleEdit = (user: UserPublic) => {
    const full_name = prompt("Full name", user.full_name ?? "") ?? user.full_name
    const email = prompt("Email", user.email) ?? user.email
    updateMutation.mutate({ user, body: { full_name, email } })
  }

  if (isLoading) {
    return (
      <Card className="mt-6">
        <p className="text-sm text-slate-500">Loading users...</p>
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Full name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className={cn(
                  "rounded-xl bg-white/80 shadow-sm transition",
                  isPlaceholderData && "opacity-60",
                )}
              >
                <td className="px-3 py-2 font-semibold text-slate-800">
                  {user.full_name || "N/A"}
                  {currentUser?.id === user.id && (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      You
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">{user.email}</td>
                <td className="px-3 py-2 text-slate-600">
                  {user.is_superuser ? "Superuser" : "User"}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {user.is_active ? "Active" : "Inactive"}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
                      loading={updateMutation.status === "pending"}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentUser?.id === user.id}
                      onClick={() => handleDelete(user)}
                      loading={deleteMutation.status === "pending"}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Prev
        </Button>
        <Label className="text-xs text-slate-600">Page {page}</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={page * PER_PAGE >= count}
        >
          Next
        </Button>
      </div>
    </Card>
  )
}

function Admin() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Admin
        </p>
        <h1 className="text-3xl font-bold text-slate-900">Users Management</h1>
        <p className="text-sm text-slate-600">
          View and manage users. (Edit/Delete available; cannot delete self).
        </p>
      </div>

      <UsersTable />
    </div>
  )
}
