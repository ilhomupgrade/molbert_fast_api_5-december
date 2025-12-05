import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { useState } from "react"

import { ItemsService, type ItemCreate, type ItemPublic } from "@/client"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"

const itemsSearchSchema = z.object({ page: z.number().catch(1) })
const PER_PAGE = 5

function getItemsQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      ItemsService.readItems({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    queryKey: ["items", { page }],
  }
}

export const Route = createFileRoute("/_layout/items")({
  component: Items,
  validateSearch: (search) => itemsSearchSchema.parse(search),
})

function ItemsTable() {
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getItemsQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({ to: "/items", search: (prev) => ({ ...prev, page }) })
  }

  const items = data?.data.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["items"] })

  const deleteMutation = useMutation({
    mutationFn: (item: ItemPublic) =>
      ItemsService.deleteItem({ id: item.id }),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { item: ItemPublic; title: string; description?: string | null }) =>
      ItemsService.updateItem({
        id: payload.item.id,
        requestBody: { title: payload.title, description: payload.description ?? "" },
      }),
    onSuccess: invalidate,
  })

  const handleDelete = (item: ItemPublic) => {
    if (!confirm(`Delete item "${item.title}"?`)) return
    deleteMutation.mutate(item)
  }

  const handleEdit = (item: ItemPublic) => {
    const title = prompt("New title", item.title) || item.title
    const description = prompt("New description", item.description ?? "") || item.description
    updateMutation.mutate({ item, title, description })
  }

  if (isLoading) {
    return (
      <Card className="mt-6">
        <p className="text-sm text-slate-500">Loading items...</p>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="mt-6 text-sm text-slate-600">
        No items yet. Use API to create items.
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
            <tr
              key={item.id}
              className={`rounded-xl bg-white/80 shadow-sm transition ${
                isPlaceholderData ? "opacity-60" : ""
              }`}
            >
              <td className="px-3 py-2 text-slate-800">{item.id}</td>
              <td className="px-3 py-2 font-semibold text-slate-800">
                {item.title}
              </td>
              <td className="px-3 py-2 text-slate-600">
                {item.description || "N/A"}
              </td>
              <td className="px-3 py-2 text-slate-600">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                    loading={updateMutation.status === "pending"}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item)}
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

function Items() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const createMutation = useMutation({
    mutationFn: (payload: ItemCreate) =>
      ItemsService.createItem({ requestBody: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      setTitle("")
      setDescription("")
    },
  })

  const handleCreate = () => {
    if (!title.trim()) return
    createMutation.mutate({ title, description })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Items
        </p>
        <h1 className="text-3xl font-bold text-slate-900">Items Management</h1>
        <p className="text-sm text-slate-600">
          View items fetched from the backend. (UI actions removed; adapt as
          needed.)
        </p>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add item</h2>
            <p className="text-sm text-slate-600">Create a new item entry.</p>
          </div>
          <Button onClick={handleCreate} loading={createMutation.status === "pending"}>
            Create
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Item title"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>
        </div>
      </Card>

      <ItemsTable />
    </div>
  )
}
