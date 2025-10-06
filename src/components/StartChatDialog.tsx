/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { fetcher } from "@/utils/fetcher"
import { getInitials } from "@/utils/get-initials"
import { ConversationListItemType, UserLite } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Checkbox } from "./ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { ScrollArea } from "./ui/scroll-area"
import { LoadingIcon, StartChatIcon, UsersIcon } from "./Icons"
import useSWR, { useSWRConfig} from "swr"

type StartChatDialogProps = {
 onCreated?: (conversationId: string) => void
}

export function StartChatDialog({ onCreated }: StartChatDialogProps) {
 const [open, setOpen] = useState<boolean>(false)
 const [submitting, setSubmitting] = useState<boolean>(false)
 const [query, setQuery] = useState<string>("")
 const [groupTitle, setGroupTitle] = useState<string>("")
 const [error, setError] = useState<string | null>(null)
 const [selected, setSelected] = useState<Set<string>>(new Set())
 const { userId } = useAuth()
 const { mutate } = useSWRConfig()
 const router = useRouter()

 const { data: users, isLoading } = useSWR<UserLite[]>(
  `/api/users?q=${encodeURIComponent(query)}`, fetcher,
  { revalidateOnFocus: false }
 )

 const filtered = (users ?? []).filter((user) => user.id !== userId)
 const isGroup = selected.size > 1

 const toggleSelected = (id: string) => {
  setSelected((prev) => {
   const next = new Set(prev)

   if (next.has(id)) {
    next.delete(id)
   } else {
    next.add(id)
   }

   return next
  })
 }

 const resetState = () => {
  setSelected(new Set())
  setGroupTitle("")
  setQuery("")
  setError(null)
  setSubmitting(false)
 }

 const handleCreate = async () => {
  try {
   setSubmitting(true)
   setError(null)

   const ids = Array.from(selected)

   if (ids.length === 0) {
    setError("Select at least one user")
    setSubmitting(false)
    return
   }

   const tempId = `temp-${Date.now()}`
   const nowISO = new Date().toISOString()
   const pickedUsers = ids
    .map((id) => filtered.find((user) => user.id === id))
    .filter(Boolean) as UserLite[]

   const optimistic: ConversationListItemType = {
    id: tempId,
    type: ids.length === 1 ? "DIRECT" : "GROUP",
    title: ids.length > 1 ? (groupTitle.trim() || "Group chat") : null,
    avatarUrl: ids.length === 1 ? (pickedUsers[0].imageUrl ?? null) : null,
    lastMessageAt: nowISO,
    lastMessage: null,
    participants: pickedUsers,
    unread: 0
   }

   mutate<ConversationListItemType[]>(
    "/api/conversations",
    (current) => [optimistic, ...(current ?? [])],
    false
   )

   const payload =
    ids.length === 1
     ? { otherUserId: ids[0] }
     : { title: optimistic.title, participantIds: ids }
   
   const res = await fetch("/api/conversations", {
    method: "POST",
    headers: {
     "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
   })

   if (!res.ok) {
    mutate<ConversationListItemType[]>(
     "/api/conversations",
     (current) => (current ?? []).filter((c) => c.id !== tempId),
     false
    )

    const j = await res.json().catch(() => ({}))

    throw new Error(j?.error ?? `Failed to create conversation (${res.status})`)
   }

   const created = (await res.json()) as ConversationListItemType

   mutate<ConversationListItemType[]>(
    "/api/conversations",
    (current) => {
     const withoutTemp = (current ?? []).filter((c) => c.id !== tempId)
     const withoutDup = withoutTemp.filter((c) => c.id !== created.id)
     return [created, ...withoutDup]
    },
    false
   )

   onCreated?.(created.id)
   setOpen(false)
   resetState()

   router.push(`/conversations/${created.id}`)
  } catch (error: any) {
   setError(error.message || "Something went wrong")
   setSubmitting(false)
  }
 }

 return (
  <Dialog
   open={open}
   onOpenChange={(v) => {
    setOpen(v)
    if (!v) {
     resetState()
    }
   }}
  >
   <DialogTrigger asChild>
    <Button
     type="button"
     size="lg"
     aria-label="Start chat"
     className="mr-auto bg-sky-700 hover:bg-sky-600"
    >
     <StartChatIcon className="size-6" />
     Start chat
    </Button>
   </DialogTrigger>
   <DialogContent className="max-w-lg">
    <DialogHeader>
     <DialogTitle>New conversation</DialogTitle>
     <DialogDescription>Select one user for a direct chat or multiple users for a group chat.</DialogDescription>
    </DialogHeader>
    <div className="space-y-3">
     <Input
      type="text"
      placeholder="Search..."
      value={query}
      onChange={e => setQuery(e.target.value)}
     />
     {isGroup && (
      <div className="space-y-1">
       <Label htmlFor="group-title" className="flex items-center gap-2">
        <UsersIcon className="size-4" />
        Group name
       </Label>
       <Input
        type="text"
        placeholder="e.g., Besties"
        value={groupTitle}
        onChange={e => setGroupTitle(e.target.value)}
       />
      </div>
     )}
     <ScrollArea className="h-72">
      {isLoading ? (
       <div className="text-sm text-muted-foreground p-4">Loading users...</div>
      ) : filtered.length === 0 ? (
       <div className="text-sm text-muted-foreground p-4">No users found.</div>
      ) : (
       <ul className="divide-y">
        {filtered.map((u) => {
         const checked = selected.has(u.id)

         return (
          <li
           key={u.id}
           onClick={() => toggleSelected(u.id)}
           className="flex items-center gap-3 p-3 hover:bg-accent/50"
          >
           <Avatar className="h-8 w-8">
            {u.imageUrl ? (
             <AvatarImage src={u.imageUrl} alt="User" />
            ) : (
             <AvatarFallback>{getInitials(u.firstName, u.lastName)}</AvatarFallback>
            )}
           </Avatar>
           <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Unknown user"}</div>
           </div>
           <Checkbox
            checked={checked}
            onCheckedChange={() => toggleSelected(u.id)}
            onClick={e => e.stopPropagation()}
            aria-label={`Select ${u.firstName ?? ""} ${u.lastName ?? ""}`}
           />
          </li>
         )
        })}
       </ul>
      )}
     </ScrollArea>
     {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
    <DialogFooter className="gap-2">
     <DialogClose asChild>
      <Button
       type="button"
       variant="secondary"
       aria-label="Cancel"
       disabled={submitting}
      >
       Cancel
      </Button>
     </DialogClose>
     <Button
      type="button"
      aria-label="Create chat"
      onClick={handleCreate}
      disabled={submitting || selected.size === 0}
     >
      {submitting && <LoadingIcon className="size-4 mr-2 animate-spin" />}
      {isGroup ? "Start Group Chat" : "Start Chat"}
     </Button>
    </DialogFooter>
   </DialogContent>
  </Dialog>
 )
}