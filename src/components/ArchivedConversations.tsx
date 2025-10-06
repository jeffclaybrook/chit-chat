"use client"

import { toast } from "sonner"
import { ConversationListItemType } from "@/types"
import { fetcher } from "@/utils/fetcher"
import { formatDate } from "@/utils/format-date"
import { getInitials } from "@/utils/get-initials"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { ScrollArea } from "./ui/scroll-area"
import { ImageIcon, UnarchiveIcon } from "./Icons"
import useSWR, { useSWRConfig } from "swr"

export function ArchivedConversations({
 open,
 onOpenChange
}: {
 open: boolean
 onOpenChange: (v: boolean) => void
}) {
 const { mutate } = useSWRConfig()
 const { data, isLoading } = useSWR<ConversationListItemType[]>("/api/conversations/archived", fetcher, {
  revalidateOnFocus: false
 })

 const archived = data ?? []

 const unarchive = async (id: string) => {
  mutate<ConversationListItemType[]>("/api/conversations/archived",
   (curr) => (curr ?? []).filter(c => c.id !== id),
   false
  )

  const restored = archived.find(c => c.id === id)

  if (restored) {
   mutate<ConversationListItemType[]>("/api/conversations",
    (curr) => [restored, ...(curr ?? []).filter(c => c.id !== id)],
    false
   )
  }

  const res = await fetch(`/api/conversations/${id}/archive`, { method: "DELETE" })

  if (!res.ok) {
   mutate("/api/conversations/archived")
   mutate("/api/conversations")
  }

  toast.success("Conversation unarchvied!")
 }

 return (
  <Dialog open={open} onOpenChange={onOpenChange}>
   <DialogContent className="max-w-lg">
    <DialogHeader>
     <DialogTitle>Archived conversations</DialogTitle>
     <DialogDescription>Unarchive a conversation to move it back to your list.</DialogDescription>
    </DialogHeader>
    <ScrollArea className="h-72">
     {isLoading ? (
      <div className="text-sm text-muted-foreground p-4">Loading...</div>
     ) : archived.length === 0 ? (
      <div className="text-sm text-muted-foreground p-4">No archived conversations.</div>
     ) : (
      <ul className="divide-y">
       {archived.map((c) => {
        const isDirect = c.type === "DIRECT"
        const others = c.participants
        const firstOther = others[0]
        const title = isDirect
         ? `${firstOther?.firstName ?? ""} ${firstOther?.lastName ?? ""}`.trim() || "Direct message"
         : c.title ?? "Group"
        const avatarUrl = isDirect ? firstOther?.imageUrl : c.avatarUrl
        const preview =
         c.lastMessage?.hasImage || c.lastMessage?.type === "IMAGE"
          ? "[IMAGE]"
          : c.lastMessage?.type === "SYSTEM"
          ? c.lastMessage.body ?? "[SYSTEM]"
          : c.lastMessage?.body ?? ""
        const stamp = c.lastMessage?.createdAt ?? c.lastMessageAt

        return (
         <li key={c.id} className="flex items-center gap-3 p-3 hover:bg-accent/50">
          <Avatar className="h-8 w-8">
           {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={title} />
           ) : (
            <AvatarFallback>{getInitials(firstOther?.firstName, firstOther?.lastName)}</AvatarFallback>
           )}
          </Avatar>
          <div className="flex-1 min-w-0">
           <div className="flex items-center justify-between gap-2">
            <div className="font-medium truncate">{title}</div>
            <div className="text-xs text-muted-foreground shrink-0">{formatDate(stamp)}</div>
           </div>
           <div className="flex items-center gap-1 text-sm text-muted-foreground truncate">
            {c.lastMessage?.hasImage && <ImageIcon className="h-3.5 w-3.5" />}
            <span className="truncate">{preview}</span>
           </div>
          </div>
          <Button
           type="button"
           variant="ghost"
           size="sm"
           onClick={() => unarchive(c.id)}
          >
           <UnarchiveIcon className="h-4 w-4" />
           Unarchive
          </Button>
         </li>
        )
       })}
      </ul>
     )}
    </ScrollArea>
    <DialogFooter>
     <DialogClose asChild>
      <Button
       type="button"
       variant="secondary"
       aria-label="Done"
      >
       Done
      </Button>
     </DialogClose>
    </DialogFooter>
   </DialogContent>
  </Dialog>
 )
}